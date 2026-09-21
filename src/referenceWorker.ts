import {MandelbrotNavigator, bla_step_floats} from 'mandelbrot'
import {memory as wasmMemory} from 'mandelbrot/mandelbrot_bg.wasm'
import type {ApproximationMode} from './Engine'

type ResetMessage = {
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
    // Fixed precision budget as a target scale (e.g. "1e-30"). Sets the navigator's
    // descending-profile precision ahead of time; a budget change arrives as a fresh reset.
    precisionBudget: string
    // Engine's table-parameter generation at reset time — a fresh worker starts
    // at 0, so without this every blaReady it posts would be dropped as stale.
    tableGeneration: number
    // Canvas aspect (width/height): frames minibrot searches.
    viewportAspect?: number
}

type UpdateViewMessage = {
    type: 'updateView'
    jobId: number
    cx: string
    cy: string
    scale: string
    angle: number
    maxIterations: number
    viewportAspect?: number
}

type SetApproximationModeMessage = {
    type: 'setApproximationMode'
    jobId: number
    approximationMode: ApproximationMode
    tableGeneration: number
}

type SetBlaEpsilonMessage = {
    type: 'setBlaEpsilon'
    jobId: number
    blaEpsilon: number
    tableGeneration: number
}

type SetMaxBlaSkipMessage = {
    type: 'setMaxBlaSkip'
    jobId: number
    maxBlaSkip: number
    tableGeneration: number
}

type FindMinibrotMessage = {
    type: 'findMinibrot'
    jobId: number
    maxIter: number
    radiusFactor: number
    /** When set, also frame the copy (fraction of the limiting screen axis it should span). */
    fill?: number
}

type DisposeMessage = {
    type: 'dispose'
}

type ReferenceWorkerMessage =
    | ResetMessage
    | UpdateViewMessage
    | SetApproximationModeMessage
    | SetBlaEpsilonMessage
    | SetMaxBlaSkipMessage
    | FindMinibrotMessage
    | DisposeMessage

type OrbitChunkResponse = {
    type: 'orbitChunk'
    jobId: number
    // Monotonic id of the reference orbit this chunk belongs to. A new id is minted
    // every time the orbit restarts at offset 0 (fresh navigator, Rust-side recenter,
    // precision-budget rebuild), so the Engine routes chunks by id instead of
    // comparing reference coordinates.
    refId: number
    offset: number
    count: number
    maxIterations: number
    referenceCx: string
    referenceCy: string
    orbit: Float32Array<ArrayBuffer>
}

type TableBuildStage = 'coefficients' | 'transfer'

type TableProgressResponse = {
    type: 'tableProgress'
    jobId: number
    refId: number
    tableGeneration: number
    /** Stage progress in [0, 1], milestone-based. */
    progress: number
    stage: TableBuildStage
}

type BlaReadyResponse = {
    type: 'blaReady'
    jobId: number
    refId: number
    maxIterations: number
    // Affine BlaStep records (BLA_STEP_FLOATS floats each) and a 4 × u32 level
    // directory (the last word is an f32 bit-pattern).
    steps: Float32Array<ArrayBuffer>
    levels: Uint32Array<ArrayBuffer>
    levelCount: number
    // Echo of the table-parameter generation this table was built under (set by
    // the reset/setter messages). The Engine drops mismatches: builds that were
    // in flight when a parameter change was posted.
    tableGeneration: number
}

type ErrorResponse = {
    type: 'error'
    jobId: number
    message: string
}

type ReadyResponse = {
    type: 'ready'
}

type MinibrotFoundResponse = {
    type: 'minibrotFound'
    jobId: number
    status: 'ok' | 'none' | 'nonewton' | 'nosize'
    cx: string | null
    cy: string | null
    period: number | null
    /** Framed request only: view half-height that frames the copy. */
    scale: string | null
}

type ReferenceWorkerResponse =
    | OrbitChunkResponse
    | TableProgressResponse
    | BlaReadyResponse
    | ErrorResponse
    | ReadyResponse
    | MinibrotFoundResponse

type WorkerContext = typeof globalThis & {
    postMessage(message: unknown, transfer?: Transferable[]): void
    close(): void
    onmessage: ((event: MessageEvent<ReferenceWorkerMessage>) => void) | null
}

const ctx = self as unknown as WorkerContext

let navigator: MandelbrotNavigator | undefined
let activeJobId = 0
let disposed = false
let lastBlaMaxIterations = 0
// Table-parameter generation (ε/skip/mode), set by reset and the setter
// messages and echoed in every blaReady — lets the Engine drop tables whose
// build was in flight when a parameter change was posted.
let tableGeneration = 0
let targetMaxIterations = 0
let computeLoopRunning = false
let needsReferenceValidation = false
// Monotonic across navigator recreations: every orbit restart (chunk at offset 0)
// mints a fresh id, so consumers can order references globally.
let refCounter = 0
let currentRefId = 0

const ORBIT_CHUNK_SIZE = 50
// Compute the reference orbit to HEADROOM× the display maxIter, so interactive zoom-in (which
// raises maxIter) finds the orbit already long enough — no transient black frame while it
// catches up. Capped at the GPU reference buffer's step capacity (mirrors Engine's 10M-step buffer).
const REFERENCE_ITER_HEADROOM = 2
const ORBIT_STEP_CAPACITY = 10_000_000
// Floats per affine BlaStep; mirrors the Rust #[repr(C)] BlaStep and Engine's BLA_STEP_FLOATS.
const BLA_STEP_FLOATS = 8

function postResponse(message: ReferenceWorkerResponse, transfer?: Transferable[]) {
    ctx.postMessage(message, transfer ?? [])
}

function yieldToWorkerEvents(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

function postError(jobId: number, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    postResponse({ type: 'error', jobId, message })
}

function applyApproximationMode(mode: ApproximationMode) {
    if (!navigator) {
        return
    }
    if (mode === 'bla') {
        navigator.use_bla()
    } else {
        navigator.use_perturbation()
    }
}

function resetNavigator(message: ResetMessage) {
    console.log('[REF worker] RESET (fresh navigator)', message.cx.slice(0, 14), 'scale', message.scale.slice(0, 10))
    navigator?.free()
    navigator = new MandelbrotNavigator(
        message.cx,
        message.cy,
        message.scale,
        message.angle,
    )
    // Fix the precision budget ahead of time (descending-profile depth). A budget change
    // re-enters this reset path, so the orbit is always rebuilt at the current budget.
    navigator.set_precision_budget(message.precisionBudget)
    activeJobId = message.jobId
    lastBlaMaxIterations = 0
    tableGeneration = message.tableGeneration ?? 0
    targetMaxIterations = message.maxIterations
    needsReferenceValidation = false
    applyApproximationMode(message.approximationMode)
    navigator.set_bla_epsilon(message.blaEpsilon)
    navigator.set_max_bla_skip(message.maxBlaSkip)
    navigator.set_viewport_aspect(message.viewportAspect ?? Number.NaN)
    void runComputeLoop(message.jobId)
}

// The WASM orbit is laid out 4 floats/step (zx, zy, then two inert padding slots).
// The GPU shader reads only zx/zy, so deinterleave to 2 floats/step right here: this
// halves the orbit storage buffer and every chunk's CPU→GPU upload, and tightens
// getOrbit's stride (the hottest read in the iteration loop) from 16 to 8 bytes.
function copyOrbitSlice(ptr: number, offset: number, count: number): Float32Array<ArrayBuffer> {
    const SRC_STRIDE = 4
    const DST_STRIDE = 2
    const stepCount = Math.max(0, count - offset)
    const source = new Float32Array(
        wasmMemory.buffer,
        ptr + offset * SRC_STRIDE * Float32Array.BYTES_PER_ELEMENT,
        stepCount * SRC_STRIDE,
    )
    const copied: Float32Array<ArrayBuffer> = new Float32Array(stepCount * DST_STRIDE)
    for (let i = 0; i < stepCount; i++) {
        copied[i * DST_STRIDE] = source[i * SRC_STRIDE]         // zx
        copied[i * DST_STRIDE + 1] = source[i * SRC_STRIDE + 1] // zy
    }
    return copied
}

// The table is read from WASM memory with a fixed stride: a pkg/ build older
// than the Rust BlaStep definition would silently shift every entry but the
// first (seen 2026-09-21: 12-float steps read as 8 → garbage blocks, rings).
let blaLayoutChecked = false
function assertBlaStepLayout() {
    if (blaLayoutChecked) return
    blaLayoutChecked = true
    const floats = typeof bla_step_floats === 'function' ? bla_step_floats() : undefined
    if (floats !== BLA_STEP_FLOATS) {
        throw new Error(`[reference] BlaStep = ${floats ?? 'inconnu (export absent)'} floats côté WASM, `
            + `${BLA_STEP_FLOATS} attendus : le paquet reference_calculus/pkg est périmé — `
            + 'relancer `wasm-pack build reference_calculus`.')
    }
}

function postBlaIfReady(jobId: number, maxIterations: number, availableIter: number) {
    if (!navigator || jobId !== activeJobId || disposed) {
        return
    }
    const mode = navigator.get_approximation_mode()
    const coverageFresh = lastBlaMaxIterations >= maxIterations
    const tableMaxIterations = coverageFresh
        ? lastBlaMaxIterations
        : Math.max(lastBlaMaxIterations, maxIterations)
    // Perturbation (0) needs no table; BLA (1) builds one once the orbit covers it.
    if (coverageFresh || availableIter < tableMaxIterations || mode === 0) {
        return
    }

    const refId = currentRefId
    const postTableProgress = (progress: number, stage: TableBuildStage) => {
        postResponse({
            type: 'tableProgress',
            jobId,
            refId,
            tableGeneration,
            progress,
            stage,
        })
    }
    postTableProgress(0, 'coefficients')
    assertBlaStepLayout()
    const info = navigator.compute_bla_reference_ptr(tableMaxIterations)
    postTableProgress(0.9, 'transfer')
    const stepsSource = new Float32Array(wasmMemory.buffer, info.ptr, info.count * BLA_STEP_FLOATS)
    const steps: Float32Array<ArrayBuffer> = new Float32Array(stepsSource.length)
    steps.set(stepsSource)
    const levelsSource = new Uint32Array(wasmMemory.buffer, info.levels_ptr, info.level_count * 4)
    const levels: Uint32Array<ArrayBuffer> = new Uint32Array(levelsSource.length)
    levels.set(levelsSource)
    lastBlaMaxIterations = tableMaxIterations
    postResponse({
        type: 'blaReady',
        jobId,
        refId,
        maxIterations: tableMaxIterations,
        steps,
        levels,
        levelCount: info.level_count,
        tableGeneration,
    }, [steps.buffer, levels.buffer])
}

function computeAndPostOrbitChunk(jobId: number, maxIterations: number, orbitTarget: number): number {
    if (!navigator) return 0
    const info = navigator.compute_reference_orbit_chunk(ORBIT_CHUNK_SIZE, orbitTarget)
    needsReferenceValidation = false
    const orbit = copyOrbitSlice(info.ptr, info.offset, info.count)
    const [referenceCx, referenceCy] = navigator.get_reference_params()
    if (info.offset === 0) {
        currentRefId = ++refCounter
        lastBlaMaxIterations = 0
        console.log('[REF worker] orbit (re)start refId=', currentRefId, 'ref=', referenceCx.slice(0, 14))
    }
    const availableIter = Math.max(0, info.count - 1)
    postResponse({
        type: 'orbitChunk',
        jobId,
        refId: currentRefId,
        offset: info.offset,
        count: info.count,
        maxIterations,
        referenceCx,
        referenceCy,
        orbit,
    }, [orbit.buffer])
    return availableIter
}

async function runComputeLoop(jobId: number) {
    if (computeLoopRunning) {
        return
    }
    computeLoopRunning = true
    let loopFailed = false

    try {
        while (!disposed && navigator && jobId === activeJobId) {
            const maxIterations = targetMaxIterations
            const visibleOrbitTarget = Math.min(maxIterations, ORBIT_STEP_CAPACITY)
            const orbitTarget = Math.min(maxIterations * REFERENCE_ITER_HEADROOM, ORBIT_STEP_CAPACITY)
            const availableBefore = Math.max(0, navigator.get_reference_orbit_len())

            // Priority 1: make the visible reference prefix available. A view
            // validation may also restart the orbit, so it runs before table work.
            if (needsReferenceValidation || availableBefore < visibleOrbitTarget) {
                computeAndPostOrbitChunk(jobId, maxIterations, visibleOrbitTarget)
                await yieldToWorkerEvents()
                continue
            }

            // Headroom-first: extend the orbit for future zoom-in, then post the table.
            if (availableBefore >= orbitTarget) {
                postBlaIfReady(jobId, maxIterations, availableBefore)
                await yieldToWorkerEvents()
                if (targetMaxIterations <= maxIterations) break
                continue
            }
            const availableIter = computeAndPostOrbitChunk(jobId, maxIterations, orbitTarget)
            postBlaIfReady(jobId, maxIterations, availableIter)
            await yieldToWorkerEvents()
        }
    } catch (error) {
        loopFailed = true
        postError(jobId, error)
    } finally {
        computeLoopRunning = false
        if (!loopFailed && !disposed && navigator) {
            const availableIter = Math.max(0, navigator.get_reference_orbit_len())
            // tableStale: a setter zeroed lastBlaMaxIterations while this loop was
            // between its last postBlaIfReady and its exit — its own runComputeLoop
            // call was a no-op (loop still running), so without a restart the
            // rebuilt table would never be posted. Converges: the restarted loop
            // posts once and lastBlaMaxIterations becomes non-zero. Perturbation
            // (mode 0) posts no table — excluded to avoid restarting forever.
            const tableStale = lastBlaMaxIterations === 0 && navigator.get_approximation_mode() !== 0
            if (jobId !== activeJobId || availableIter < targetMaxIterations || needsReferenceValidation || tableStale) {
                void runComputeLoop(activeJobId)
            }
        }
    }
}

ctx.onmessage = (event: MessageEvent<ReferenceWorkerMessage>) => {
    const message = event.data
    try {
        switch (message.type) {
            case 'reset':
                if (!disposed) {
                    resetNavigator(message)
                }
                break
            case 'updateView':
                if (navigator && message.jobId === activeJobId) {
                    // No log here: updateView arrives on EVERY navigation frame.
                    navigator.origin(message.cx, message.cy)
                    navigator.scale(message.scale)
                    navigator.angle(message.angle)
                    if (message.viewportAspect !== undefined) {
                        navigator.set_viewport_aspect(message.viewportAspect)
                    }
                    targetMaxIterations = message.maxIterations
                    needsReferenceValidation = true
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setApproximationMode':
                if (message.jobId === activeJobId) {
                    applyApproximationMode(message.approximationMode)
                    lastBlaMaxIterations = 0
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setBlaEpsilon':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_bla_epsilon(message.blaEpsilon)
                    lastBlaMaxIterations = 0
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setMaxBlaSkip':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_max_bla_skip(message.maxBlaSkip)
                    lastBlaMaxIterations = 0
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'findMinibrot':
                if (navigator && message.jobId === activeJobId) {
                    // The worker navigator already tracks the current view (set on
                    // every updateView); detect the atom period at full precision
                    // and refine to its nucleus. With `fill`, the framed variant
                    // adds the size estimate and returns the copy's centre plus
                    // the view scale that frames it.
                    const framed = message.fill !== undefined
                    const res = framed
                        ? navigator.find_minibrot_framed(
                              message.maxIter,
                              message.radiusFactor,
                              message.fill as number,
                          )
                        : navigator.find_minibrot(message.maxIter, message.radiusFactor)
                    const status = res[0] as 'ok' | 'none' | 'nonewton' | 'nosize'
                    postResponse({
                        type: 'minibrotFound',
                        jobId: message.jobId,
                        status,
                        cx: status === 'ok' ? res[1] : null,
                        cy: status === 'ok' ? res[2] : null,
                        period:
                            status === 'ok'
                                ? Number(res[3])
                                : status === 'nonewton' || status === 'nosize'
                                  ? Number(res[1])
                                  : null,
                        scale: status === 'ok' && framed ? res[4] : null,
                    })
                }
                break
            case 'dispose':
                disposed = true
                navigator?.free()
                navigator = undefined
                ctx.close()
                break
        }
    } catch (error) {
        postError('jobId' in message ? message.jobId : activeJobId, error)
    }
}

postResponse({ type: 'ready' })
