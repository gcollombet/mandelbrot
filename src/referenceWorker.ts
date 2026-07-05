import {MandelbrotNavigator} from 'mandelbrot'
import {memory as wasmMemory} from 'mandelbrot/mandelbrot_bg.wasm'
import type {ApproximationMode} from './Engine'
import {log2FromDecimalString} from './floatexp'

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

type BlaReadyResponse = {
    type: 'blaReady'
    jobId: number
    refId: number
    maxIterations: number
    // 'bla': BLA/Padé records (12 floats each) in `steps`, no `radii`.
    // 'jet': coefficient records (27 floats each) in `steps` + a separate radius
    // buffer (4 floats each, vec4-packed) in `radii` — the split "buffer de
    // rayons" so a radius re-solve re-uploads only the small array.
    // 'mobius': Möbius-c+ coefficient records (15 floats each: 5 × (x, y,
    // e-as-i32-bits)) in `steps` + the same 4-float vec4 radius sidecar.
    kind: 'bla' | 'jet' | 'mobius'
    steps: Float32Array<ArrayBuffer>
    // Jet/mobius only: per-block radii (vec4-packed), index-aligned with `steps`.
    radii?: Float32Array<ArrayBuffer>
    levels: Uint32Array<ArrayBuffer>
    levelCount: number
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
    status: 'ok' | 'none' | 'nonewton'
    cx: string | null
    cy: string | null
    period: number | null
}

type ReferenceWorkerResponse =
    | OrbitChunkResponse
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
let targetMaxIterations = 0
let computeLoopRunning = false
let needsReferenceValidation = false
// Monotonic across navigator recreations: every orbit restart (chunk at offset 0)
// mints a fresh id, so consumers can order references globally.
let refCounter = 0
let currentRefId = 0
// Jet-mode c_max lifecycle (add-jet-approximation D6): log2(scale) at the last
// jet-table build. Zoom keeps existing radii VALID (they are monotone-sound
// under a shrinking c_max); once the view has moved ≥ 2 octaves the table is
// re-posted — the Rust side then re-solves radii in closed form (no orbit walk
// inside the R_c headroom) and only re-walks bounds beyond it.
let lastJetLog2Scale = Number.NaN

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
    } else if (mode === 'jet') {
        navigator.use_jet()
    } else if (mode === 'mobius') {
        navigator.use_mobius_cplus()
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
    applyApproximationMode(message.approximationMode)
    navigator.set_bla_epsilon(message.blaEpsilon)
    navigator.set_max_bla_skip(message.maxBlaSkip)
    lastJetLog2Scale = log2FromDecimalString(message.scale)
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
    const mode = navigator.get_approximation_mode()
    // Jet/mobius rebuilds are ~10-20× costlier than BLA ones (exact degree-6
    // merges + majorant walks). During zoom-in maxIterations grows every
    // updateView; a rebuild per tick would keep the table permanently stale
    // (the engine then renders exact perturbation). Throttle: keep serving the
    // posted table until the target outgrows it by 1.5× — blocks then still
    // cover ≥⅔ of the iterations (the engine accepts partial tables for these
    // modes), the tail runs exact, and the ≥2-octave scale-drift repost
    // refreshes radii regardless.
    const jetStillFresh = (mode === 3 || mode === 4)
        && lastBlaMaxIterations > 0
        && maxIterations <= Math.ceil(lastBlaMaxIterations * 1.5)
    if (
        lastBlaMaxIterations >= maxIterations
        || jetStillFresh
        || availableIter < maxIterations
        // Build/post the block table for BLA (1), Padé (2) and jet (3);
        // perturbation (0) needs no table.
        || mode === 0
    ) {
        return
    }

    const refId = currentRefId
    // Jet mode (3) ships its own table: a coefficient buffer (27-float records)
    // plus a SEPARATE radius buffer (3-float records) — the split "buffer de
    // rayons" (add-jet-approximation D6). BLA (1) / Padé (2) share the 12-float
    // BlaStep table with no separate radii. Both level directories are 4 × u32
    // per level (the last word is an f32 bit-pattern).
    const isJet = mode === 3
    const isMobius = mode === 4
    if (!isJet && !isMobius) {
        // BLA / Padé path: one 12-float BlaStep table.
        const info = navigator.compute_bla_reference_ptr(maxIterations)
        const stepsSource = new Float32Array(wasmMemory.buffer, info.ptr, info.count * 12)
        const steps: Float32Array<ArrayBuffer> = new Float32Array(stepsSource.length)
        steps.set(stepsSource)
        const levelsSource = new Uint32Array(wasmMemory.buffer, info.levels_ptr, info.level_count * 4)
        const levels: Uint32Array<ArrayBuffer> = new Uint32Array(levelsSource.length)
        levels.set(levelsSource)
        lastBlaMaxIterations = maxIterations
        postResponse({
            type: 'blaReady',
            jobId,
            refId,
            maxIterations,
            kind: 'bla',
            steps,
            levels,
            levelCount: info.level_count,
        }, [steps.buffer, levels.buffer])
        return
    }

    // Jet/mobius path: coefficient buffer + radius sidecar + level directory.
    const tableT0 = performance.now()
    const info = isMobius
        ? navigator.compute_mobius_reference(maxIterations)
        : navigator.compute_jet_reference(maxIterations)
    // These builds are the worker's single big synchronous chunk (exact
    // degree-6 merges + majorant walks): surface it so slow-mode reports can
    // tell build latency from per-application cost.
    console.log(`[REF worker] ${isMobius ? 'mobius' : 'jet'} table built in ${(performance.now() - tableT0).toFixed(0)}ms (maxIter ${maxIterations})`)

    // Strides must match the Rust #[repr(C)] JetCoeffs / MobiusCoeffs /
    // JetRadii / MobiusRadius and Engine's *_FLOATS constants.
    const coeffFloats = isMobius ? 15 : 27
    const stepsSource = new Float32Array(wasmMemory.buffer, info.coeffs_ptr, info.coeffs_count * coeffFloats)
    const steps: Float32Array<ArrayBuffer> = new Float32Array(stepsSource.length)
    steps.set(stepsSource)

    const radiiSource = new Float32Array(wasmMemory.buffer, info.radii_ptr, info.radii_count * 4)
    const radii: Float32Array<ArrayBuffer> = new Float32Array(radiiSource.length)
    radii.set(radiiSource)

    const levelsSource = new Uint32Array(wasmMemory.buffer, info.levels_ptr, info.level_count * 4)
    const levels: Uint32Array<ArrayBuffer> = new Uint32Array(levelsSource.length)
    levels.set(levelsSource)
    lastBlaMaxIterations = maxIterations

    postResponse({
        type: 'blaReady',
        jobId,
        refId,
        maxIterations,
        kind: isMobius ? 'mobius' : 'jet',
        steps,
        radii,
        levels,
        levelCount: info.level_count,
    }, [steps.buffer, radii.buffer, levels.buffer])
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
            // Offset 0 means the orbit (re)started — fresh navigator or Rust-side
            // recenter/rebuild. Mint a new reference id and invalidate the BLA table,
            // which belonged to the previous orbit.
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
                    // Jet/mobius radii depend on the per-view c_max: after ≥ 2
                    // octaves of scale drift, re-post the table (cheap
                    // closed-form re-solve Rust-side; existing radii stay
                    // sound meanwhile).
                    const driftMode = navigator.get_approximation_mode()
                    if (driftMode === 3 || driftMode === 4) {
                        const log2Scale = log2FromDecimalString(message.scale)
                        if (!Number.isFinite(lastJetLog2Scale) || Math.abs(log2Scale - lastJetLog2Scale) >= 2) {
                            lastJetLog2Scale = log2Scale
                            lastBlaMaxIterations = 0
                        }
                    }
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
