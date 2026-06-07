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
    maxIterations: number
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

type DisposeMessage = {
    type: 'dispose'
}

type ReferenceWorkerMessage =
    | ResetMessage
    | UpdateViewMessage
    | SetApproximationModeMessage
    | SetBlaEpsilonMessage
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

type ReferenceWorkerResponse =
    | OrbitChunkResponse
    | BlaReadyResponse
    | ReferenceResetResponse
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
let targetMaxIterations = 0
let computeLoopRunning = false
let needsReferenceValidation = false
let currentReferenceCx = ''
let currentReferenceCy = ''

const ORBIT_CHUNK_SIZE = 1000

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
    navigator?.free()
    navigator = new MandelbrotNavigator(
        message.cx,
        message.cy,
        message.scale,
        message.angle,
    )
    activeJobId = message.jobId
    lastBlaMaxIterations = 0
    targetMaxIterations = message.maxIterations
    needsReferenceValidation = false
    currentReferenceCx = ''
    currentReferenceCy = ''
    applyApproximationMode(message.approximationMode)
    navigator.set_bla_epsilon(message.blaEpsilon)
    void runComputeLoop(message.jobId)
}

function copyOrbitSlice(ptr: number, offset: number, count: number): Float32Array<ArrayBuffer> {
    const floatsPerStep = 4
    const stepCount = Math.max(0, count - offset)
    const source = new Float32Array(
        wasmMemory.buffer,
        ptr + offset * floatsPerStep * Float32Array.BYTES_PER_ELEMENT,
        stepCount * floatsPerStep,
    )
    const copied: Float32Array<ArrayBuffer> = new Float32Array(source.length)
    copied.set(source)
    return copied
}

function postBlaIfReady(jobId: number, maxIterations: number, availableIter: number) {
    if (!navigator || jobId !== activeJobId || disposed) {
        return
    }
    if (
        lastBlaMaxIterations >= maxIterations
        || availableIter < maxIterations
        || navigator.get_approximation_mode() !== 1
    ) {
        return
    }

    const blaInfo = navigator.compute_bla_reference_ptr(maxIterations)
    const stepsSource = new Float32Array(
        wasmMemory.buffer,
        blaInfo.ptr,
        blaInfo.count * 6,
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
            const availableBefore = Math.max(0, navigator.get_reference_orbit_len())

            if (availableBefore >= maxIterations && !needsReferenceValidation) {
                postBlaIfReady(jobId, maxIterations, availableBefore)
                await yieldToWorkerEvents()
                if (targetMaxIterations <= maxIterations) {
                    break
                }
                continue
            }

            const info = navigator.compute_reference_orbit_chunk(
                ORBIT_CHUNK_SIZE,
                maxIterations,
            )
            needsReferenceValidation = false
            const orbit = copyOrbitSlice(info.ptr, info.offset, info.count)
            const [referenceCx, referenceCy] = navigator.get_reference_params()
            if (
                currentReferenceCx
                && (referenceCx !== currentReferenceCx || referenceCy !== currentReferenceCy)
            ) {
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
