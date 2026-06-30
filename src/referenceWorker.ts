import {MandelbrotNavigator} from 'mandelbrot'
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
}

type UpdateViewMessage = {
    type: 'updateView'
    jobId: number
    cx: string
    cy: string
    scale: string
    angle: number
    maxIterations: number
}

type SetApproximationModeMessage = {
    type: 'setApproximationMode'
    jobId: number
    approximationMode: ApproximationMode
}

type SetBlaEpsilonMessage = {
    type: 'setBlaEpsilon'
    jobId: number
    blaEpsilon: number
}

type SetMaxBlaSkipMessage = {
    type: 'setMaxBlaSkip'
    jobId: number
    maxBlaSkip: number
}

type BenchmarkPadeMessage = {
    type: 'benchmarkPade'
    jobId: number
    grid: number
}

type FindMinibrotMessage = {
    type: 'findMinibrot'
    jobId: number
    maxIter: number
    radiusFactor: number
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
    | BenchmarkPadeMessage
    | FindMinibrotMessage
    | DisposeMessage

type OrbitChunkResponse = {
    type: 'orbitChunk'
    jobId: number
    offset: number
    count: number
    maxIterations: number
    referenceCx: string
    referenceCy: string
    orbit: Float32Array<ArrayBuffer>
}

type BlaReadyResponse = {
    type: 'blaReady'
    jobId: number
    maxIterations: number
    steps: Float32Array<ArrayBuffer>
    levels: Uint32Array<ArrayBuffer>
    levelCount: number
}

type ReferenceResetResponse = {
    type: 'referenceReset'
    jobId: number
    maxIterations: number
    referenceCx: string
    referenceCy: string
}

type ErrorResponse = {
    type: 'error'
    jobId: number
    message: string
}

type ReadyResponse = {
    type: 'ready'
}

type PadeBenchmarkResponse = {
    type: 'padeBenchmark'
    jobId: number
    result: {
        pixels: number
        maxIter: number
        stepsExact: number
        stepsAffine: number
        stepsPade: number
        mismatches: number
        maxIterDelta: number
    }
}

type MinibrotFoundResponse = {
    type: 'minibrotFound'
    jobId: number
    status: 'ok' | 'none' | 'nonewton'
    cx: string | null
    cy: string | null
    period: number | null
}

type ReferenceWorkerResponse =
    | OrbitChunkResponse
    | BlaReadyResponse
    | ReferenceResetResponse
    | ErrorResponse
    | ReadyResponse
    | PadeBenchmarkResponse
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
let targetMaxIterations = 0
let computeLoopRunning = false
let needsReferenceValidation = false
let currentReferenceCx = ''
let currentReferenceCy = ''

const ORBIT_CHUNK_SIZE = 1000
// Compute the reference orbit to HEADROOM× the display maxIter, so interactive zoom-in (which
// raises maxIter) finds the orbit already long enough — no transient black frame while it
// catches up. The BLA table is still built only to the display maxIter (what the shader uses).
// Capped at the GPU reference buffer's step capacity (mirrors Engine's 1M-step buffer).
const REFERENCE_ITER_HEADROOM = 2
const ORBIT_STEP_CAPACITY = 1_000_000

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
    } else if (mode === 'pade') {
        navigator.use_pade()
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
    targetMaxIterations = message.maxIterations
    needsReferenceValidation = false
    currentReferenceCx = ''
    currentReferenceCy = ''
    applyApproximationMode(message.approximationMode)
    navigator.set_bla_epsilon(message.blaEpsilon)
    navigator.set_max_bla_skip(message.maxBlaSkip)
    void runComputeLoop(message.jobId)
}

// The WASM orbit is laid out 4 floats/step (zx, zy, then two inert padding slots
// that once held the orbit derivative / a double-float low word of z_n). The GPU
// shader reads only zx/zy, so deinterleave to 2 floats/step right here: this halves
// the orbit storage buffer and every chunk's CPU→GPU upload, and tightens getOrbit's
// stride (the hottest read in the iteration loop) from 16 to 8 bytes.
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

function postBlaIfReady(jobId: number, maxIterations: number, availableIter: number) {
    if (!navigator || jobId !== activeJobId || disposed) {
        return
    }
    if (
        lastBlaMaxIterations >= maxIterations
        || availableIter < maxIterations
        // Build/post the block table for both BLA (1) and Padé (2); perturbation
        // (0) needs no table.
        || navigator.get_approximation_mode() === 0
    ) {
        return
    }

    const blaInfo = navigator.compute_bla_reference_ptr(maxIterations)
    // Floats per floatexp BlaStep — must match the Rust #[repr(C)] BlaStep (12 ×
    // 4-byte fields: a/b/D coefficients + exponents, alpha/beta radii, and the
    // near-critical-guard log2_min_a) and Engine's BLA_STEP_FLOATS.
    const BLA_STEP_FLOATS = 12
    const stepsSource = new Float32Array(
        wasmMemory.buffer,
        blaInfo.ptr,
        blaInfo.count * BLA_STEP_FLOATS,
    )
    const steps: Float32Array<ArrayBuffer> = new Float32Array(stepsSource.length)
    steps.set(stepsSource)

    const levelsSource = new Uint32Array(
        wasmMemory.buffer,
        blaInfo.levels_ptr,
        blaInfo.level_count * 4,
    )
    const levels: Uint32Array<ArrayBuffer> = new Uint32Array(levelsSource.length)
    levels.set(levelsSource)
    lastBlaMaxIterations = maxIterations

    postResponse({
        type: 'blaReady',
        jobId,
        maxIterations,
        steps,
        levels,
        levelCount: blaInfo.level_count,
    }, [steps.buffer, levels.buffer])
}

async function runComputeLoop(jobId: number) {
    if (computeLoopRunning) {
        return
    }
    computeLoopRunning = true

    try {
        while (!disposed && navigator && jobId === activeJobId) {
            const maxIterations = targetMaxIterations
            // Orbit ceiling carries the headroom; BLA/posts use the display maxIterations.
            const orbitTarget = Math.min(maxIterations * REFERENCE_ITER_HEADROOM, ORBIT_STEP_CAPACITY)
            const availableBefore = Math.max(0, navigator.get_reference_orbit_len())

            if (availableBefore >= orbitTarget && !needsReferenceValidation) {
                postBlaIfReady(jobId, maxIterations, availableBefore)
                await yieldToWorkerEvents()
                if (targetMaxIterations <= maxIterations) {
                    break
                }
                continue
            }

            const info = navigator.compute_reference_orbit_chunk(
                ORBIT_CHUNK_SIZE,
                orbitTarget,
            )
            needsReferenceValidation = false
            const orbit = copyOrbitSlice(info.ptr, info.offset, info.count)
            const [referenceCx, referenceCy] = navigator.get_reference_params()
            if (info.offset === 0) {
                console.log('[REF worker] orbit (re)start ref=', referenceCx.slice(0, 14), 'prevRef=', currentReferenceCx.slice(0, 14) || '(none)')
            }
            if (
                currentReferenceCx
                && (referenceCx !== currentReferenceCx || referenceCy !== currentReferenceCy)
            ) {
                console.log('[REF worker] -> referenceReset (recenter) newRef=', referenceCx.slice(0, 14))
                lastBlaMaxIterations = 0
                postResponse({
                    type: 'referenceReset',
                    jobId,
                    maxIterations,
                    referenceCx,
                    referenceCy,
                })
            }
            currentReferenceCx = referenceCx
            currentReferenceCy = referenceCy
            const availableIter = Math.max(0, info.count - 1)

            postResponse({
                type: 'orbitChunk',
                jobId,
                offset: info.offset,
                count: info.count,
                maxIterations,
                referenceCx,
                referenceCy,
                orbit,
            }, [orbit.buffer])

            postBlaIfReady(jobId, maxIterations, availableIter)
            await yieldToWorkerEvents()
        }
    } catch (error) {
        postError(jobId, error)
    } finally {
        computeLoopRunning = false
        if (!disposed && navigator) {
            const availableIter = Math.max(0, navigator.get_reference_orbit_len())
            if (jobId !== activeJobId || availableIter < targetMaxIterations || needsReferenceValidation) {
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
                    console.log('[REF worker] updateView (reuse navigator)', message.cx.slice(0, 14), 'scale', message.scale.slice(0, 10))
                    navigator.origin(message.cx, message.cy)
                    navigator.scale(message.scale)
                    navigator.angle(message.angle)
                    targetMaxIterations = message.maxIterations
                    needsReferenceValidation = true
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setApproximationMode':
                if (message.jobId === activeJobId) {
                    applyApproximationMode(message.approximationMode)
                    lastBlaMaxIterations = 0
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setBlaEpsilon':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_bla_epsilon(message.blaEpsilon)
                    lastBlaMaxIterations = 0
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setMaxBlaSkip':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_max_bla_skip(message.maxBlaSkip)
                    lastBlaMaxIterations = 0
                    void runComputeLoop(message.jobId)
                }
                break
            case 'benchmarkPade':
                if (navigator && message.jobId === activeJobId) {
                    const b = navigator.benchmark_pade(message.grid)
                    postResponse({
                        type: 'padeBenchmark',
                        jobId: message.jobId,
                        result: {
                            pixels: b.pixels,
                            maxIter: b.max_iter,
                            stepsExact: b.steps_exact,
                            stepsAffine: b.steps_affine,
                            stepsPade: b.steps_pade,
                            mismatches: b.pade_mismatches,
                            maxIterDelta: b.max_iter_delta,
                        },
                    })
                    b.free()
                }
                break
            case 'findMinibrot':
                if (navigator && message.jobId === activeJobId) {
                    // The worker navigator already tracks the current view (set on
                    // every updateView); detect the atom period at full precision
                    // and refine to its nucleus.
                    const res = navigator.find_minibrot(message.maxIter, message.radiusFactor)
                    const status = res[0] as 'ok' | 'none' | 'nonewton'
                    postResponse({
                        type: 'minibrotFound',
                        jobId: message.jobId,
                        status,
                        cx: status === 'ok' ? res[1] : null,
                        cy: status === 'ok' ? res[2] : null,
                        period:
                            status === 'ok'
                                ? Number(res[3])
                                : status === 'nonewton'
                                  ? Number(res[1])
                                  : null,
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
