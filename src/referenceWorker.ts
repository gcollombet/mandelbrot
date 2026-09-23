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
    // Canvas aspect (width/height): bounds the per-view c_max.
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

type DisposeMessage = {
    type: 'dispose'
}

type ReferenceWorkerMessage =
    | ResetMessage
    | UpdateViewMessage
    | SetApproximationModeMessage
    | SetBlaEpsilonMessage
    | SetMaxBlaSkipMessage
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
    /** Worker time spent computing this reference's orbit so far (ms). */
    computeMs: number
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
    /** Worker time spent building this table (coefficients + copy), ms. */
    buildMs: number
}

type ErrorResponse = {
    type: 'error'
    jobId: number
    message: string
}

type ReadyResponse = {
    type: 'ready'
}

type ReferenceWorkerResponse =
    | OrbitChunkResponse
    | TableProgressResponse
    | BlaReadyResponse
    | ErrorResponse
    | ReadyResponse

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

// Orbit chunks are sized by time, not iteration count: the per-iteration cost
// varies with the precision budget and along the orbit (descending profile), and a
// fixed 50-iteration chunk left the loop spending most of its wall time yielding.
// ~8 ms of compute per chunk keeps reset/updateView preemption under a frame while
// the yield overhead stays a few percent. The first chunk of every job is small so
// the first orbit prefix reaches the GPU quickly.
const ORBIT_CHUNK_BUDGET_MS = 8
const ORBIT_CHUNK_MIN = 50
const ORBIT_CHUNK_MAX = 1 << 16
let orbitChunkSize = ORBIT_CHUNK_MIN
// Compute the reference orbit to HEADROOM× the display maxIter, so interactive zoom-in (which
// raises maxIter) finds the orbit already long enough — no transient black frame while it
// catches up. Capped at the GPU reference buffer's step capacity (mirrors Engine's 10M-step buffer).
const REFERENCE_ITER_HEADROOM = 2
const ORBIT_STEP_CAPACITY = 10_000_000
// Floats per affine BlaStep; mirrors the Rust #[repr(C)] BlaStep and Engine's BLA_STEP_FLOATS.
const BLA_STEP_FLOATS = 11
// u32 words per BlaLevel; mirrors the Rust #[repr(C)] BlaLevel and Engine's BLA_LEVEL_U32S.
const BLA_LEVEL_U32S = 5

function postResponse(message: ReferenceWorkerResponse, transfer?: Transferable[]) {
    ctx.postMessage(message, transfer ?? [])
}

// Yield through a MessageChannel rather than setTimeout(0): nested timers are
// clamped to ≥ 4 ms, which on a 36k-iteration orbit cost several seconds of idle
// wall time. A port message is a plain task queued behind any message the Engine
// already posted, so reset/updateView still preempt a running job at every yield.
const yieldChannel = new MessageChannel()
const pendingYields: Array<() => void> = []
yieldChannel.port1.onmessage = () => pendingYields.shift()?.()
function yieldToWorkerEvents(): Promise<void> {
    return new Promise(resolve => {
        pendingYields.push(resolve)
        yieldChannel.port2.postMessage(null)
    })
}

function postError(jobId: number, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    postResponse({ type: 'error', jobId, message })
}

function applyApproximationMode(mode: ApproximationMode) {
    if (!navigator) {
        return
    }
    if (mode === 'pade') {
        navigator.use_pade()
    } else if (mode === 'bla') {
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
    orbitChunkSize = ORBIT_CHUNK_MIN
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
    const buildStart = performance.now()
    const info = navigator.compute_bla_reference_ptr(tableMaxIterations)
    postTableProgress(0.9, 'transfer')
    const stepsSource = new Float32Array(wasmMemory.buffer, info.ptr, info.count * BLA_STEP_FLOATS)
    const steps: Float32Array<ArrayBuffer> = new Float32Array(stepsSource.length)
    steps.set(stepsSource)
    const levelsSource = new Uint32Array(wasmMemory.buffer, info.levels_ptr, info.level_count * BLA_LEVEL_U32S)
    const levels: Uint32Array<ArrayBuffer> = new Uint32Array(levelsSource.length)
    levels.set(levelsSource)
    lastBlaMaxIterations = tableMaxIterations
    const buildMs = performance.now() - buildStart
    postResponse({
        type: 'blaReady',
        jobId,
        refId,
        maxIterations: tableMaxIterations,
        steps,
        levels,
        levelCount: info.level_count,
        tableGeneration,
        buildMs,
    }, [steps.buffer, levels.buffer])
}

/** Worker compute time of the current reference orbit (reset at each restart). */
let refComputeMs = 0

function computeAndPostOrbitChunk(jobId: number, maxIterations: number, orbitTarget: number): number {
    if (!navigator) return 0
    const chunkStart = performance.now()
    const info = navigator.compute_reference_orbit_chunk(orbitChunkSize, orbitTarget)
    const orbitMs = performance.now() - chunkStart
    needsReferenceValidation = false
    const orbit = copyOrbitSlice(info.ptr, info.offset, info.count)
    const [referenceCx, referenceCy] = navigator.get_reference_params()
    // Retarget the next chunk on the measured per-iteration cost, only from full
    // chunks (a chunk truncated by orbitTarget or an escape says nothing about the rate).
    // Growth is capped at ×4 per chunk so one noisy fast sample cannot overshoot.
    const computed = info.count - info.offset
    if (computed >= orbitChunkSize && orbitMs > 0.05) {
        const ideal = orbitChunkSize * ORBIT_CHUNK_BUDGET_MS / orbitMs
        orbitChunkSize = Math.round(Math.min(ORBIT_CHUNK_MAX, orbitChunkSize * 4, Math.max(ORBIT_CHUNK_MIN, ideal)))
    } else if (computed >= orbitChunkSize) {
        orbitChunkSize = Math.min(ORBIT_CHUNK_MAX, orbitChunkSize * 4)
    }
    if (info.offset === 0) {
        currentRefId = ++refCounter
        lastBlaMaxIterations = 0
        refComputeMs = 0
        console.log('[REF worker] orbit (re)start refId=', currentRefId, 'ref=', referenceCx.slice(0, 14))
    }
    const availableIter = Math.max(0, info.count - 1)
    refComputeMs += performance.now() - chunkStart
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
        computeMs: refComputeMs,
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
