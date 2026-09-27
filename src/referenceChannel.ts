// ── Reference channel: the engine side of the reference-orbit worker ──
//
// The worker computes the arbitrary-precision reference orbit and its
// approximation (BLA) table. This channel owns the whole protocol:
//
// - Jobs. A reset starts a job (`jobId`); every response of an older job is
//   ignored. Messages posted before the worker is ready are queued.
// - Reference slots. The worker mints a `refId` at every orbit restart. The
//   ACTIVE slot is the orbit the shader reads; its chunks stream straight to
//   the GPU. A newer refId accumulates CPU-side in the STAGING slot and is
//   promoted at the update() boundary once its visible orbit is complete, so
//   the old reference keeps rendering until then. Slots grow strictly
//   contiguously: a chunk that would leave a hole is dropped.
// - Table generations. Changing ε, the maximum skip or the mode bumps
//   `tableGeneration`; the worker echoes it in every table, and a table built
//   under older parameters is dropped (the worker's FIFO guarantees a fresh
//   build follows).
// - Deferred table clear. A table-parameter change does not clear the image
//   immediately: tables are certified pure accelerations, so the current
//   image stays valid, and clearing at once would re-converge in exact
//   perturbation BEFORE the new table lands. The clear runs when the matching
//   table is on the GPU, or at a deadline if it never comes.
//
// The engine is reached only through `ReferenceHost`: GPU uploads, re-anchoring
// the front navigator, and the render requests the channel's events imply.

import type {ApproximationMode} from './Mandelbrot'
import type {ClearReason} from './framePlan'

/** Step capacity of the GPU reference buffer (2 floats per step). Mirrors referenceWorker.ts. */
export const ORBIT_STEP_CAPACITY = 10_000_000
/** Past this delay a deferred table clear runs anyway (worker failure, slow rebuild). */
export const TABLE_CLEAR_FALLBACK_MS = 10_000
/** How long the HUD flashes after a reference reset. */
const RESET_FLASH_MS = 900

export type TableBuildStage = 'idle' | 'coefficients' | 'transfer' | 'ready' | 'error'

export type ReferenceWorkerRequest =
    | {
        type: 'reset'
        jobId: number
        cx: string
        cy: string
        scale: string
        angle: number
        approximationMode: ApproximationMode
        blaEpsilon: number
        maxBlaSkip: number
        maxIterations: number
        precisionBudget: string
        // A fresh worker starts at generation 0, so the reset must hand it the
        // current counter or every table it posts would be dropped as stale.
        tableGeneration: number
        // Canvas aspect (width/height): frames minibrot searches.
        viewportAspect?: number
    }
    | {
        type: 'updateView'
        jobId: number
        cx: string
        cy: string
        scale: string
        angle: number
        maxIterations: number
        viewportAspect?: number
    }
    | { type: 'setApproximationMode'; jobId: number; approximationMode: ApproximationMode; tableGeneration: number }
    | { type: 'setBlaEpsilon'; jobId: number; blaEpsilon: number; tableGeneration: number }
    | { type: 'setMaxBlaSkip'; jobId: number; maxBlaSkip: number; tableGeneration: number }
    | { type: 'dispose' }

export type BlaTablePayload = {
    steps: Float32Array<ArrayBuffer>
    levels: Uint32Array<ArrayBuffer>
    levelCount: number
    maxIterations: number
    tableGeneration: number
}

export type ReferenceWorkerResponse =
    | {
        type: 'orbitChunk'
        jobId: number
        refId: number
        offset: number
        count: number
        maxIterations: number
        referenceCx: string
        referenceCy: string
        orbit: Float32Array<ArrayBuffer>
        computeMs: number
    }
    | {
        type: 'tableProgress'
        jobId: number
        refId: number
        tableGeneration: number
        progress: number
        stage: Exclude<TableBuildStage, 'idle' | 'ready' | 'error'>
    }
    | ({ type: 'blaReady'; jobId: number; refId: number; buildMs: number } & BlaTablePayload)
    | { type: 'error'; jobId: number; message: string }
    | { type: 'ready' }

/**
 * One reference orbit as seen by the engine. Born on the first chunk of a
 * refId (offset 0), grows strictly contiguously, dies promoted or superseded.
 */
export type ReferenceSlot = {
    refId: number
    cx: string
    cy: string
    /** Contiguous orbit steps received so far (2 floats per step: zx, zy). */
    orbitLen: number
    /** Accumulated chunks, contiguous and in order (staging only; emptied on promote). */
    chunks: Float32Array<ArrayBuffer>[]
    /** Approximation table for this reference (arrives after the orbit completes). */
    bla: BlaTablePayload | null
}

/** Orbit coverage of the current iteration budget. */
export type OrbitProgress = {
    availableIter: number
    remainingIter: number
    /** Iteration cap the shader may use: never past the computed orbit. */
    guardedMaxIter: number
    /** The visible orbit is still being built. */
    incomplete: boolean
}

export type ReferenceView = { cx: string; cy: string; scale: string; angle: number; maxIterations: number; viewportAspect: number }

export type TableParameters = {
    approximationMode: ApproximationMode
    blaEpsilon: number
    maxBlaSkip: number
    precisionBudget: string
}

export interface ReferenceHost {
    /** Current iteration budget of the view. */
    maxIterations(): number
    /** Upload orbit floats to the GPU reference buffer at a byte offset. */
    writeOrbit(byteOffset: number, data: Float32Array<ArrayBuffer>): void
    writeBlaTable(table: BlaTablePayload): void
    /** Move the front navigator's reference to the promoted orbit's origin. */
    reanchor(cx: string, cy: string): void
    requestRender(): void
    requestClear(reason: ClearReason): void
    invalidateCounter(): void
}

export type WorkerFactory = () => Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>

const defaultWorkerFactory: WorkerFactory = () =>
    new Worker(new URL('./referenceWorker.ts', import.meta.url), { type: 'module' })

export class ReferenceChannel {
    /** The reference the shader uses; null when nothing is renderable (cold start, teleport). */
    active: ReferenceSlot | null = null
    /** A newer reference accumulating CPU-side until promotion. */
    staging: ReferenceSlot | null = null

    progress: OrbitProgress = { availableIter: 0, remainingIter: 0, guardedMaxIter: 0, incomplete: false }
    /** The worker has not answered the latest reset/view yet. */
    validating = false
    failed = false

    /** Approximation table of the active reference on the GPU. */
    blaLevelCount = 0
    blaReadyMaxIterations = 0
    tableGeneration = 0
    tableBuild: { active: boolean; progress: number; stage: TableBuildStage } = { active: false, progress: 0, stage: 'idle' }
    /** Monotonic table-arrival counter used by navigation benchmarks. */
    tableBuildCompletionSerial = 0
    /** Worker timings of the latest chunk / accepted table (dev bench). */
    orbitComputeTiming = { refId: 0, ms: 0 }
    blaBuildTiming = { refId: 0, ms: 0 }

    /** HUD: a reference reset happened (serial) and until when to flash it. */
    resetSerial = 0
    resetFlashUntil = 0
    /** Origin of the reference last promoted to active. */
    workerCx = ''
    workerCy = ''

    private worker?: ReturnType<WorkerFactory>
    private ready = false
    private pendingMessages: ReferenceWorkerRequest[] = []
    private jobId = 0
    private viewKey = ''
    private availableOrbitLen = 0
    private orbitWasReset = false
    private tableClearArmed = false
    private tableClearDeadline = 0

    private readonly host: ReferenceHost
    private readonly createWorker: WorkerFactory

    constructor(host: ReferenceHost, createWorker: WorkerFactory = defaultWorkerFactory) {
        this.host = host
        this.createWorker = createWorker
    }

    /** A deferred clear waits for the rebuilt table. */
    get tableClearPending(): boolean { return this.tableClearArmed }

    /** Current job, for requests that must be tagged with it. */
    get currentJobId(): number { return this.jobId }

    // ── Lifecycle ────────────────────────────────────────────────────

    start(): void {
        this.worker?.terminate()
        const worker = this.createWorker()
        worker.onmessage = (event: MessageEvent<ReferenceWorkerResponse>) => this.handleMessage(event.data)
        worker.onerror = (event: ErrorEvent) => {
            console.error('Reference worker error:', event.message)
            this.failed = true
            this.progress = { ...this.progress, incomplete: false }
            this.blaLevelCount = 0
        }
        this.worker = worker
        this.failed = false
        this.ready = false
        this.pendingMessages = []
        this.availableOrbitLen = 0
        this.blaReadyMaxIterations = 0
        this.resetTableBuild()
        this.tableClearArmed = false
        this.active = null
        this.staging = null
        this.jobId++
    }

    dispose(): void {
        this.post({ type: 'dispose' })
        this.worker?.terminate()
        this.worker = undefined
    }

    /** Consume the "orbit was re-anchored" flag (the next update() clears history). */
    consumeOrbitReset(): boolean {
        const reset = this.orbitWasReset
        this.orbitWasReset = false
        return reset
    }

    // ── View and jobs ────────────────────────────────────────────────

    /**
     * Discontinuous teleport (preset load, manual entry): the current orbit is
     * geometrically useless there, so both slots are dropped and the next
     * `syncView` starts a fresh job. The caller re-anchors the navigator.
     */
    dropForTeleport(): void {
        this.active = null
        this.staging = null
        this.viewKey = ''
        this.resetTableBuild()
    }

    /** Force the next `syncView` to start a fresh job (precision budget change). */
    restartAtNextView(): void {
        this.viewKey = ''
    }

    /**
     * Keep the worker on the current view. Starts a job when none runs for it,
     * then posts the view when it changed. The aspect is part of the key: a
     * resize alone moves the exact c_max bound, and the worker must get a
     * chance to re-solve the radii. A view change never discards the staging
     * reference: the worker keeps extending the same orbit, or recentres and
     * the new refId supersedes staging in the chunk router.
     */
    syncView(view: ReferenceView, parameters: TableParameters): void {
        if (!this.viewKey) this.startJob(view, parameters)
        const nextKey = `${view.cx}\n${view.cy}\n${view.scale}\n${view.angle}\n${view.maxIterations}\n${view.viewportAspect.toFixed(6)}`
        if (nextKey === this.viewKey) return
        this.viewKey = nextKey
        this.validating = true
        this.progress = { ...this.progress, incomplete: true }
        this.host.requestRender()
        this.post({
            type: 'updateView',
            jobId: this.jobId,
            cx: view.cx,
            cy: view.cy,
            scale: view.scale,
            angle: view.angle,
            maxIterations: view.maxIterations,
            viewportAspect: view.viewportAspect,
        })
    }

    /**
     * Start a fresh worker job. Teleport or cold start (no active reference):
     * nothing is renderable, so the counters are blanked and the first chunk
     * promotes immediately. In-place rebuild (active kept, e.g. precision
     * budget): the current orbit keeps rendering and the rebuilt one promotes
     * seamlessly when complete.
     */
    private startJob(view: ReferenceView, parameters: TableParameters): void {
        console.log('[REF] resetReferenceJob -> worker reset', view.cx.slice(0, 14), 'scale', view.scale.slice(0, 10), 'maxIter', view.maxIterations, 'inPlace', !!this.active)
        this.staging = null
        this.resetTableBuild()
        if (!this.active) {
            this.markReset(view.maxIterations)
            this.blaReadyMaxIterations = 0
            this.blaLevelCount = 0
            this.orbitWasReset = true
            this.workerCx = ''
            this.workerCy = ''
        }
        this.validating = true
        this.viewKey = ''
        this.jobId++
        this.post({
            type: 'reset',
            jobId: this.jobId,
            cx: view.cx,
            cy: view.cy,
            scale: view.scale,
            angle: view.angle,
            ...parameters,
            maxIterations: view.maxIterations,
            tableGeneration: this.tableGeneration,
            viewportAspect: view.viewportAspect,
        })
    }

    // ── Orbit progress ───────────────────────────────────────────────

    /** Recompute the orbit coverage for the frame's iteration budget. */
    refreshProgress(maxIterations: number): OrbitProgress {
        this.progress = orbitProgress(this.availableOrbitLen, maxIterations, this.failed)
        return this.progress
    }

    /**
     * The reference the field converges on is not the one the worker will
     * settle on for this view: a newer reference is staged, the worker has not
     * answered yet, or the visible orbit prefix is still short. Orbit length
     * alone is not enough: the Rust orbit rebases to 0 when the reference
     * escapes, so an early-escaping reference reports a full-length orbit and
     * exact perturbation converges on a wrong but stable field until the
     * recentred orbit is promoted. A still waits for that promotion.
     */
    exportPending(maxIterations: number): boolean {
        if (this.failed) return false
        const visibleTarget = Math.min(maxIterations, ORBIT_STEP_CAPACITY - 1)
        return this.staging !== null || this.validating || this.progress.availableIter < visibleTarget
    }

    // ── Promotion ────────────────────────────────────────────────────

    /**
     * Promote the staging reference when it is ready. With no active reference
     * anything beats nothing, so the first chunk promotes at once; otherwise
     * the full visible orbit is required. Returns true on promotion: the frame
     * computed its uniforms against the old reference and must not render.
     */
    promoteIfReady(): boolean {
        const staging = this.staging
        if (!staging) return false
        if (this.active) {
            const targetIter = Math.min(this.host.maxIterations(), ORBIT_STEP_CAPACITY - 1)
            if (staging.orbitLen - 1 < targetIter) return false
        }

        // Upload the accumulated orbit — chunks are contiguous by construction.
        let floatOffset = 0
        for (const chunk of staging.chunks) {
            if (chunk.length > 0) this.host.writeOrbit(floatOffset * Float32Array.BYTES_PER_ELEMENT, chunk)
            floatOffset += chunk.length
        }
        staging.chunks = []

        // The table counters are ALWAYS overwritten: a table of the previous
        // reference must never survive the switch. Without one the shader runs
        // exact perturbation until this refId's table lands.
        if (staging.bla) {
            this.host.writeBlaTable(staging.bla)
            this.blaLevelCount = staging.bla.levelCount
            this.blaReadyMaxIterations = staging.bla.maxIterations
        } else {
            this.blaLevelCount = 0
            this.blaReadyMaxIterations = 0
        }
        this.active = staging
        this.staging = null
        this.workerCx = staging.cx
        this.workerCy = staging.cy
        this.host.reanchor(staging.cx, staging.cy)

        // The uploaded orbit is usable on the next frame (not blanked by markReset).
        this.availableOrbitLen = staging.orbitLen
        this.refreshProgress(this.host.maxIterations())
        this.validating = false

        this.resetSerial++
        this.resetFlashUntil = performance.now() + RESET_FLASH_MS
        this.orbitWasReset = true
        // Promotion clears history wholesale: a pending deferred table clear is
        // superseded (staging's table was generation-checked at receipt).
        this.tableClearArmed = false
        this.host.invalidateCounter()
        this.host.requestRender()
        return true
    }

    // ── Table parameters ─────────────────────────────────────────────

    setApproximationMode(mode: ApproximationMode): void {
        this.blaLevelCount = 0
        this.resetTableBuild()
        this.tableGeneration++
        this.post({ type: 'setApproximationMode', jobId: this.jobId, approximationMode: mode, tableGeneration: this.tableGeneration })
        this.requestTableClear(mode !== 'perturbation')
    }

    /** ε sets the validity radius (ε·|A|): a block mode must rebuild and re-render. */
    setBlaEpsilon(epsilon: number, blockMode: boolean): void {
        this.tableGeneration++
        this.post({ type: 'setBlaEpsilon', jobId: this.jobId, blaEpsilon: epsilon, tableGeneration: this.tableGeneration })
        if (blockMode) {
            this.blaLevelCount = 0
            this.requestTableClear(true)
        }
    }

    setMaxBlaSkip(maxSkip: number, blockMode: boolean): void {
        this.tableGeneration++
        this.post({ type: 'setMaxBlaSkip', jobId: this.jobId, maxBlaSkip: maxSkip, tableGeneration: this.tableGeneration })
        if (blockMode) {
            this.blaLevelCount = 0
            this.requestTableClear(true)
        }
    }

    /** The front navigator's mode or ε changed behind the engine's back: resend both. */
    resyncTableParameters(mode: ApproximationMode, epsilon: number): void {
        this.blaLevelCount = 0
        this.resetTableBuild()
        this.tableGeneration++
        this.post({ type: 'setApproximationMode', jobId: this.jobId, approximationMode: mode, tableGeneration: this.tableGeneration })
        this.post({ type: 'setBlaEpsilon', jobId: this.jobId, blaEpsilon: epsilon, tableGeneration: this.tableGeneration })
        this.requestTableClear(mode !== 'perturbation')
    }

    /**
     * Clear history for a table-parameter change: deferred until the rebuilt
     * table lands (any block mode), immediate in perturbation (no table).
     */
    private requestTableClear(deferred: boolean): void {
        if (deferred) {
            this.tableClearArmed = true
            this.tableClearDeadline = performance.now() + TABLE_CLEAR_FALLBACK_MS
        } else {
            this.tableClearArmed = false
            this.host.requestClear('tableClear')
        }
    }

    /**
     * The rebuilt table never landed (worker failure, orbit still extending past
     * the deadline): re-render exact rather than keep the stale image up. The
     * table still accelerates the tail when it eventually arrives.
     */
    checkTableClearDeadline(now: number): void {
        if (this.tableClearArmed && (this.failed || now > this.tableClearDeadline)) {
            this.tableClearArmed = false
            this.host.requestClear('tableDeadline')
            this.host.requestRender()
        }
    }

    // ── Worker messages ──────────────────────────────────────────────

    private post(message: ReferenceWorkerRequest): boolean {
        if (!this.worker || this.failed) return false
        if (message.type === 'dispose' || this.ready) {
            this.worker.postMessage(message)
            return true
        }
        this.pendingMessages.push(message)
        return true
    }

    handleMessage(message: ReferenceWorkerResponse): void {
        if (message.type === 'ready') {
            this.ready = true
            const queue = this.pendingMessages
            this.pendingMessages = []
            for (const queued of queue) this.worker?.postMessage(queued)
            return
        }
        if (message.jobId !== this.jobId) return

        switch (message.type) {
            case 'tableProgress':
                if (message.tableGeneration !== this.tableGeneration) return
                if (message.refId !== this.active?.refId && message.refId !== this.staging?.refId) return
                this.tableBuild = { active: true, progress: Math.min(1, Math.max(0, message.progress)), stage: message.stage }
                return
            case 'error':
                console.error('Reference worker error:', message.message)
                this.failed = true
                this.progress = { ...this.progress, incomplete: false }
                this.blaLevelCount = 0
                this.tableBuild = { ...this.tableBuild, active: false, stage: 'error' }
                return
            case 'orbitChunk':
                this.receiveOrbitChunk(message)
                return
            case 'blaReady':
                this.receiveTable(message)
                return
        }
    }

    private receiveOrbitChunk(message: Extract<ReferenceWorkerResponse, { type: 'orbitChunk' }>): void {
        this.orbitComputeTiming = { refId: message.refId, ms: message.computeMs }
        const active = this.active
        const staging = this.staging

        if (active && message.refId === active.refId) {
            // Progressive streaming of the shader's current reference.
            if (message.orbit.length > 0) {
                this.host.writeOrbit(message.offset * 2 * Float32Array.BYTES_PER_ELEMENT, message.orbit)
            }
            active.orbitLen = message.count
            this.availableOrbitLen = message.count
            const wasIncomplete = this.progress.incomplete
            this.refreshProgress(this.host.maxIterations())
            this.validating = false
            // Re-render only while the VISIBLE orbit (≤ maxIter) is being built,
            // plus the frame it completes. Headroom chunks (the 2× zoom-in
            // lookahead) do not change what the shader draws: forcing a render
            // for each re-ran the full pass for nothing.
            if (this.progress.incomplete || wasIncomplete) this.host.requestRender()
            return
        }

        if (staging && message.refId === staging.refId) {
            // Staging accumulation: chunks must stay contiguous. No render: the
            // display (old reference) is unchanged until promotion.
            if (message.offset !== staging.orbitLen) return
            staging.chunks.push(message.orbit)
            staging.orbitLen = message.count
            this.validating = false
            return
        }

        if (message.refId > Math.max(staging?.refId ?? 0, active?.refId ?? 0) && message.offset === 0) {
            // First chunk of a newer reference: (re)start staging. Supersedes
            // any previous staging — the worker recentred again or a job started.
            console.log('[REF] staging new reference refId=', message.refId, 'ref=', message.referenceCx.slice(0, 14))
            this.staging = {
                refId: message.refId,
                cx: message.referenceCx,
                cy: message.referenceCy,
                orbitLen: message.count,
                chunks: [message.orbit],
                bla: null,
            }
            this.validating = false
        }
        // Otherwise a stale refId, or a non-zero offset for an unknown reference
        // (a hole): ignored.
    }

    private receiveTable(message: Extract<ReferenceWorkerResponse, { type: 'blaReady' }>): void {
        if (message.tableGeneration !== this.tableGeneration) return
        this.blaBuildTiming = { refId: message.refId, ms: message.buildMs }
        if (this.active && message.refId === this.active.refId) {
            this.host.writeBlaTable(message)
            this.blaLevelCount = message.levelCount
            this.blaReadyMaxIterations = message.maxIterations
            this.tableBuildCompletionSerial++
            this.tableBuild = { active: false, progress: 1, stage: 'ready' }
            this.validating = false
            if (this.tableClearArmed) {
                // Deferred clear: the table for the new parameters is on the GPU,
                // so restart the render with blocks active from the first
                // dispatch. The completion snapshot serves as visual fallback.
                this.tableClearArmed = false
                this.host.requestClear('tableReady')
            }
            // Otherwise no clear: blocks are a pure acceleration of the same
            // result, computed pixels stay valid and continuations pick them up.
            // Clearing here cut the render to black at every table delivery.
            this.host.requestRender()
            this.host.invalidateCounter()
        } else if (this.staging && message.refId === this.staging.refId) {
            this.staging.bla = {
                steps: message.steps,
                levels: message.levels,
                levelCount: message.levelCount,
                maxIterations: message.maxIterations,
                tableGeneration: message.tableGeneration,
            }
            this.tableBuild = { active: false, progress: 1, stage: 'ready' }
        }
        // else: table of a superseded reference — dropped.
    }

    private markReset(maxIterations: number): void {
        this.resetSerial++
        this.resetFlashUntil = performance.now() + RESET_FLASH_MS
        this.availableOrbitLen = 0
        this.progress = { availableIter: 0, remainingIter: maxIterations, guardedMaxIter: 0, incomplete: true }
    }

    private resetTableBuild(): void {
        this.tableBuild = { active: false, progress: 0, stage: 'idle' }
    }
}

/** Orbit coverage of an iteration budget. A failed worker never completes. */
export function orbitProgress(availableOrbitLen: number, maxIterations: number, failed: boolean): OrbitProgress {
    const availableIter = Math.max(0, availableOrbitLen - 1)
    return {
        availableIter,
        remainingIter: Math.max(0, maxIterations - availableIter),
        guardedMaxIter: Math.min(maxIterations, availableIter),
        incomplete: !failed && availableIter < maxIterations,
    }
}
