// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import mandelbrotShader from './assets/mandelbrot.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import brushShader from './assets/reproject.wgsl?raw'
import resolveShader from './assets/resolve.wgsl?raw'
import countShader from './assets/count_unfinished.wgsl?raw'
import mergeFrozenShader from './assets/merge_frozen.wgsl?raw'
import {MandelbrotNavigator} from 'mandelbrot'
import {WebcamTexture} from './WebcamTexture'
import {Palette} from './Palette.ts'
import type {ColorStop} from './ColorStop.ts'
import type {InterpolationMode} from './Mandelbrot.ts'
import bronzeUrl from './assets/bronze.webp'
import skyboxUrl from './assets/skybox.webp'
// ── Constants ────────────────────────────────────────────────────────

// Number of r32float layers per texture array.
const LAYER_COUNT = 8

// Progressive refinement start step for the sentinel grid; must be a power-of-two.
// Used uniformly for normal rendering, zoom reprojection, and post-zoom recompute.
const SENTINEL_SEED_STEP = 4096

// Minimum brush refinement step during zoom.  The sentinel grid will not
// subdivide below this value while zooming, avoiding wasted GPU work on
// pixels that will be rescaled away.  Must be a power-of-two.
const ZOOM_MIN_BRUSH_STEP = 2

// Adaptive iteration batch sizing — the batch auto-adjusts each frame
// to target TARGET_FRAME_MS of GPU time.
const MIN_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 10_000
const MAX_BLA_BATCH_SIZE = 100_000
const BLA_LINEARIZATION_EPSILON = 1e-6

// Adaptive refinement gating: sentinel grid refinement (halving the step
// each frame) is paused when the batch controller is at its minimum AND
// the number of active pixels (those mandelbrot.wgsl actually processes:
// iter == -1 or continuations) exceeds this threshold.  This prevents
// pixel-count avalanches while still guaranteeing convergence — the gate
// only closes when the GPU truly cannot absorb more work.
const ACTIVE_PIXEL_GATE_THRESHOLD = 5_000_000
// Minimum number of unfinished pixels below which we consider the image
// fully converged.  A few stray pixels can linger indefinitely due to
// floating-point rounding at the sentinel boundaries — not worth spinning
// the GPU for.
const UNFINISHED_PIXEL_DONE_THRESHOLD = 10
// EMA smoothing factor for GPU frame time (lower = smoother, slower to react).
const GPU_TIME_EMA_ALPHA = 0.25

// Count unfinished pixels less often than every render frame.  The readback is
// asynchronous, so this controls the compute/count pass frequency, not display FPS.
const COUNTER_SAMPLE_INTERVAL_FRAMES = 3
const COUNTER_READBACK_BUFFER_COUNT = 3
const ORBIT_METRIC_EPSILON = 0.001

type CounterReadbackSlot = {
    buffer: GPUBuffer
    pending: boolean
    sequence: number
    generation: number
}

type ReferenceWorkerRequest =
    | {
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
    | {
        type: 'updateView'
        jobId: number
        cx: string
        cy: string
        scale: string
        angle: number
        maxIterations: number
    }
    | {
        type: 'setApproximationMode'
        jobId: number
        approximationMode: ApproximationMode
    }
    | {
        type: 'setBlaEpsilon'
        jobId: number
        blaEpsilon: number
    }
    | { type: 'dispose' }

type ReferenceWorkerResponse =
    | {
        type: 'orbitChunk'
        jobId: number
        offset: number
        count: number
        maxIterations: number
        referenceCx: string
        referenceCy: string
        orbit: Float32Array<ArrayBuffer>
    }
    | {
        type: 'blaReady'
        jobId: number
        maxIterations: number
        steps: Float32Array<ArrayBuffer>
        levels: Uint32Array<ArrayBuffer>
        levelCount: number
    }
    | {
        type: 'referenceReset'
        jobId: number
        maxIterations: number
        referenceCx: string
        referenceCy: string
    }
    | {
        type: 'error'
        jobId: number
        message: string
    }

function floorPowerOfTwo(value: number): number {
    const v = Math.max(1, Math.floor(value))
    return 2 ** Math.floor(Math.log2(v))
}

function shouldTrackOrbitMetrics(colorStops: ColorStop[]): boolean {
    return colorStops.some(stop =>
        (stop.stripeAverage ?? 0) > ORBIT_METRIC_EPSILON
        || (stop.rotationMean ?? 0) > ORBIT_METRIC_EPSILON
        || (stop.stripeRelief ?? 0) > ORBIT_METRIC_EPSILON
        || (stop.directionCoherenceRelief ?? 0) > ORBIT_METRIC_EPSILON
    )
}

// ── Float32 → Float16 conversion ──────────────────────────────────
// Converts a Float32Array to a Uint16Array of IEEE 754 half-precision floats.
// Used to upload palette data to an `rgba16float` GPU texture.
const _f32 = new Float32Array(1)
const _u32 = new Uint32Array(_f32.buffer)

function float32ToFloat16(v: number): number {
    _f32[0] = v
    const f = _u32[0]
    const sign = (f >>> 16) & 0x8000
    const exponent = ((f >>> 23) & 0xff) - 127
    const mantissa = f & 0x7fffff

    if (exponent >= 16) {
        // Overflow → ±Inf
        return sign | 0x7c00
    }
    if (exponent >= -14) {
        // Normal range
        const e16 = exponent + 15
        return sign | (e16 << 10) | (mantissa >>> 13)
    }
    if (exponent >= -24) {
        // Subnormal
        const shift = -14 - exponent
        return sign | ((mantissa | 0x800000) >>> (13 + shift))
    }
    // Too small → ±0
    return sign
}

function float32ArrayToFloat16(src: Float32Array): Uint16Array {
    const dst = new Uint16Array(src.length)
    for (let i = 0; i < src.length; ++i) {
        dst[i] = float32ToFloat16(src[i])
    }
    return dst
}

export type RenderOptions = {
    antialiasLevel: number,
    palettePeriod: number,
    paletteOffset: number,
    paletteMirror: boolean,
    colorStops: ColorStop[],
    interpolationMode: InterpolationMode,
    activateAnimate: boolean,
    tessellationLevel: number,
    displacementAmount: number,
    animationSpeed: number,
    ambientOcclusionStrength: number,
    microBumpStrength: number,
    clearcoatStrength: number,
    subsurfaceStrength: number,
    reliefDepth: number,
    localShadowStrength: number,
    lightAngle: number,
    varnishStrength: number,
    stripeFrequency: number,
}

export type ApproximationMode = 'perturbation' | 'bla'

export type Mandelbrot = {
    maxIterations: number,
    cx: string,
    cy: string,
    dx: number,
    dy: number,
    mu: number,
    scale: number,
    angle: number,
    epsilon: number,
}

export class Engine {
    private snapshotCallback?: (png: string) => void;
    private snapshotDestWidth?: number;

    canvas: HTMLCanvasElement
    device!: GPUDevice
    queue!: GPUQueue
    adapter!: GPUAdapter | null
    ctx!: GPUCanvasContext
    format!: GPUTextureFormat
    mandelbrotNavigator!: MandelbrotNavigator

    // resources
    rawTexture?: GPUTexture // texture "neutre" (A) — 8-layer r32float array
    rawArrayView?: GPUTextureView // full 2d-array view for sampling
    rawLayerViews: GPUTextureView[] = [] // per-layer 2d views for MRT
    rawBrushTexture?: GPUTexture // texture "neutre" intermédiaire (B) — 8-layer r32float array
    rawBrushArrayView?: GPUTextureView // full 2d-array view for sampling
    rawBrushLayerViews: GPUTextureView[] = [] // per-layer 2d views for MRT
    resolvedTexture?: GPUTexture // texture neutre sans sentinelles visibles — 8-layer r32float array
    resolvedArrayView?: GPUTextureView // full 2d-array view for sampling
    resolvedLayerViews: GPUTextureView[] = [] // per-layer 2d views for MRT
    frozenTexture?: GPUTexture // frozen snapshot of resolved texture for zoom reprojection
    frozenArrayView?: GPUTextureView // full 2d-array view for sampling the frozen snapshot
    frozenLayerViews: GPUTextureView[] = [] // per-layer 2d views for merge MRT

    // merge pass (fuse resolved + frozen at zoom stop)
    pipelineMerge?: GPURenderPipeline
    bindGroupMerge?: GPUBindGroup
    uniformBufferMerge?: GPUBuffer

    // buffers
    uniformBufferMandelbrot?: GPUBuffer // passe Mandelbrot (calc -1)
    uniformBufferColor?: GPUBuffer // passe color (écran)
    uniformBufferBrush?: GPUBuffer // passe pinceau (sentinelles)
    uniformBufferResolve?: GPUBuffer // passe resolve (sentinel snapping)
    mandelbrotReferenceBuffer?: GPUBuffer // storage buffer contenant l'orbite
    mandelbrotBlaBuffer?: GPUBuffer // storage buffer contenant les sauts BLA
    mandelbrotBlaLevelBuffer?: GPUBuffer // storage buffer contenant les metadonnees BLA
    private mandelbrotBlaBufferCapacity = 0
    private mandelbrotBlaLevelBufferCapacity = 0

    // pipelines / bindgroups
    pipelineBrush?: GPURenderPipeline
    bindGroupBrush?: GPUBindGroup
    pipelineMandelbrot?: GPURenderPipeline
    bindGroupMandelbrot?: GPUBindGroup
    pipelineResolve?: GPURenderPipeline
    bindGroupResolve?: GPUBindGroup
    pipelineColor?: GPURenderPipeline
    bindGroupColor?: GPUBindGroup

    // GPU pixel counter (replaces blanket extraFrames = 1000)
    private pipelineCount?: GPUComputePipeline
    private counterBuffer?: GPUBuffer
    private counterReadbackSlots: CounterReadbackSlot[] = []
    private counterReadbackWriteIndex = 0
    private counterReadbackSequence = 0
    private latestAppliedCounterReadbackSequence = 0
    private counterReadbackGeneration = 0
    private renderFrameSerial = 0
    private lastCounterDispatchFrame = -COUNTER_SAMPLE_INTERVAL_FRAMES
    private counterBindGroup?: GPUBindGroup
    private uniformBufferCount?: GPUBuffer
    /** Number of pixels still needing work. -1 = not yet known, 0 = fully converged. */
    unfinishedPixelCount = -1
    /** Number of pixels that mandelbrot.wgsl actually processes (iter == -1 + continuations).
     *  Used for adaptive refinement gating. -1 = not yet known. */
    activePixelCount = -1

    // Self-managing render loop
    private _rafId: number | null = null
    private _drawFn: (() => Promise<void>) | null = null

    // FPS / rendering-active tracking
    /** Current frames-per-second (updated once per second). */
    fps = 0
    /** True when the engine is actively doing GPU work (not idle). */
    isRendering = false
    /** Last measured GPU frame time in milliseconds. */
    gpuFrameTimeMs = 0
    /** Exponentially smoothed GPU frame time (for adaptive refinement gating). */
    smoothedGpuTimeMs = 0
    /** True while a delayed GPU timing sample is waiting for queue completion. */
    private pendingGpuTiming = false
    /** Whether refinement was gated (blocked) on the previous frame. */
    private refinementWasGated = false
    private _fpsFrameCount = 0
    private _fpsLastTime = 0

    // tailles
    neutralSize = 0 // coté en pixels de la texture neutre (D)

    // shader sources (optionnellement remplaçables)
    shaderPassCompute: string
    shaderPassColor: string

    // config
    width = 0
    height = 0
    antialiasLevel: number
    palettePeriod: number

    previousMandelbrot?: Mandelbrot
    previousRenderOptions?: RenderOptions
    private previousOrbitMetricsEnabled?: boolean
    needRender = true
    /** Whether the reference orbit is still being computed incrementally. */
    orbitIncomplete = false
    /** guardedMaxIter from the previous frame (for detecting orbit growth). */
    prevGuardedMaxIter = 0
    /** Current guardedMaxIter — shared between prepareFrame and render. */
    currentGuardedMaxIter = 0
    /** Target maxIterations for the current frame. */
    currentMaxIterations = 0
    currentReferenceAvailableIter = 0
    currentReferenceRemainingIter = 0
    isReferenceValidating = false
    referenceResetSerial = 0
    referenceResetFlashUntil = 0
    currentBlaLevelCount = 0
    mandelbrotReference = new Float32Array(1000000)
    private approximationMode: ApproximationMode = 'perturbation'
    private blaEpsilon = BLA_LINEARIZATION_EPSILON
    private referenceWorker?: Worker
    private referenceJobId = 0
    private referenceAvailableOrbitLen = 0
    private referenceBlaReadyMaxIterations = 0
    private referenceWorkerFailed = false
    private referenceViewKey = ''
    private referenceWorkerCx = ''
    private referenceWorkerCy = ''
    private referenceOrbitWasReset = false
    /** Complex-plane jump of the reference origin since last visual frame (consumed in update). */
    private pendingRefJumpX = 0
    private pendingRefJumpY = 0

    prevFrameMandelbrot?: Mandelbrot // paramètres de la dernière frame rendue (pour gestion d'historique)

    // flag pour indiquer si l'historique doit être effacé au prochain rendu
    clearHistoryNextFrame = false

    // Cumulative texel shift since last clearHistory – used to keep the
    // sentinel grid aligned after translation reprojection (Option B).
    cumulativeShiftX = 0
    cumulativeShiftY = 0

    // ── Zoom reprojection state ──────────────────────────────────────
    /** Configurable magnification threshold before swapping (default ×2). */
    zoomMagnificationThreshold = 16.0
    /** Current visual zoom factor: frozenScale / displayScale.
     *  For zoom-in: < 1 (frozen covers larger area), trending towards 1/threshold.
     *  For zoom-out: > 1 (frozen covers smaller area), trending towards threshold. */
    private zoomFactor = 1.0
    /** Scale at which the snapshot was frozen. */
    private frozenScale = 0
    /** Scale at which the live texture is being computed (fixed for the duration of a cycle). */
    private liveScale = 0
    /** Live zoom factor: liveScale / displayScale. Passed to color shader for UV rescaling. */
    private liveZoomFactor = 1.0
    /** True when we are in an active zoom reprojection cycle. */
    private zoomReprojectionActive = false
    /** Set to true when we need to GPU-copy resolved → frozen at the start of next render. */
    private needFreezeSnapshot = false
    /** Set to true when we need to run the merge pass (resolved+frozen→frozen) at zoom stop. */
    private needMergeSnapshot = false
    /** Saved merge uniform values captured at zoom stop (before state is reset). */
    private mergeUniforms = { zf: 1.0, lzf: 1.0, frozenShiftU: 0, frozenShiftV: 0, aspect: 1.0, angle: 0 }
    /** Initial live-texel offset between a frozen snapshot and the display when zoom starts. */
    private frozenBaseShiftX = 0
    private frozenBaseShiftY = 0
    /** A reference reset occurred during this zoom cycle; use frozen only as visual fallback. */
    private referenceResetDuringZoom = false
    /** True when the frozen texture is spatially aligned with the live texture.
     *  Set to true after a freeze snapshot or merge pass. Set to false on translation. */
    private frozenAligned = false
    /** True when zoom direction is "in" (scale decreasing). */
    private zoomingIn = true

    // Progressive iteration state – adaptive batch sizing
    private iterationBatchSize = MIN_BATCH_SIZE

    // textures additionnelles
    tileTexture?: GPUTexture
    tileTextureView?: GPUTextureView
    skyboxTexture?: GPUTexture
    skyboxTextureView?: GPUTextureView
    private tileTextureSourceKey?: string
    private skyboxTextureSourceKey?: string
    paletteTexture?: GPUTexture
    paletteTextureView?: GPUTextureView
    paletteSampler?: GPUSampler
    skyboxSampler?: GPUSampler

    // Webcam
    webcamTexture?: WebcamTexture
    webcamTileTexture?: GPUTexture
    webcamTextureView?: GPUTextureView
    webcamEnabled = true

    // temps en secondes
    time = 0
    private lastUpdateTime = 0 // timestamp ms de la dernière update

    // DPR multiplier (adjustable from UI, default 1.0)
    dprMultiplier = 1.0

    // Target FPS for the adaptive batch controller (adjustable from UI, default 60)
    targetFps = 60

    // GPU load multiplier: scales the active-pixel gate threshold (default 1.0)
    gpuLoadMultiplier = 1.0

    // Propriétés statiques pour le cache des textures
    static _tileTexture?: GPUTexture
    static _tileTextureView?: GPUTextureView
    static _skyboxTexture?: GPUTexture
    static _skyboxTextureView?: GPUTextureView
    static _paletteTexture?: GPUTexture
    static _paletteTextureView?: GPUTextureView

    constructor(canvas: HTMLCanvasElement, options: RenderOptions) {
        this.canvas = canvas
        this.shaderPassCompute = mandelbrotShader
        this.shaderPassColor = colorShader
        this.antialiasLevel = options.antialiasLevel
        this.palettePeriod = options.palettePeriod
        this.time = 0
    }

    private postReferenceWorker(message: ReferenceWorkerRequest): boolean {
        if (!this.referenceWorker || this.referenceWorkerFailed) {
            return false
        }
        this.referenceWorker.postMessage(message)
        return true
    }

    private markReferenceReset(maxIterations = this.currentMaxIterations) {
        this.referenceResetSerial++
        this.referenceResetFlashUntil = performance.now() + 900
        this.referenceAvailableOrbitLen = 0
        this.currentReferenceAvailableIter = 0
        this.currentReferenceRemainingIter = maxIterations
        this.currentGuardedMaxIter = 0
        this.orbitIncomplete = true
    }

    private initializeReferenceWorker() {
        this.referenceWorker?.terminate()
        this.referenceWorker = new Worker(new URL('./referenceWorker.ts', import.meta.url), { type: 'module' })
        this.referenceWorker.onmessage = (event: MessageEvent<ReferenceWorkerResponse>) => {
            this.handleReferenceWorkerMessage(event.data)
        }
        this.referenceWorker.onerror = (event) => {
            console.error('Reference worker error:', event.message)
            this.referenceWorkerFailed = true
            this.orbitIncomplete = false
            this.currentBlaLevelCount = 0
        }
        this.referenceWorkerFailed = false
        this.referenceAvailableOrbitLen = 0
        this.referenceBlaReadyMaxIterations = 0
        this.referenceJobId++
    }

    private resetReferenceJob(mandelbrot: Mandelbrot, scale: number, maxIterations: number) {
        this.markReferenceReset(maxIterations)
        this.referenceBlaReadyMaxIterations = 0
        this.referenceOrbitWasReset = true
        this.isReferenceValidating = true
        this.currentBlaLevelCount = 0
        this.referenceViewKey = ''
        this.referenceWorkerCx = ''
        this.referenceWorkerCy = ''
        this.referenceJobId++
        this.postReferenceWorker({
            type: 'reset',
            jobId: this.referenceJobId,
            cx: mandelbrot.cx,
            cy: mandelbrot.cy,
            scale: scale.toString(),
            angle: mandelbrot.angle,
            approximationMode: this.approximationMode,
            blaEpsilon: this.blaEpsilon,
            maxIterations,
        })
    }

    private syncReferenceWorkerView(mandelbrot: Mandelbrot, scale: number, maxIterations: number) {
        const scaleString = scale.toString()
        const nextKey = `${mandelbrot.cx}\n${mandelbrot.cy}\n${scaleString}\n${mandelbrot.angle}\n${maxIterations}`
        if (nextKey === this.referenceViewKey) {
            return
        }
        this.referenceViewKey = nextKey
        this.isReferenceValidating = true
        this.orbitIncomplete = true
        this.needRender = true
        this.postReferenceWorker({
            type: 'updateView',
            jobId: this.referenceJobId,
            cx: mandelbrot.cx,
            cy: mandelbrot.cy,
            scale: scaleString,
            angle: mandelbrot.angle,
            maxIterations,
        })
    }

    private handleReferenceWorkerMessage(message: ReferenceWorkerResponse) {
        if (message.jobId !== this.referenceJobId) {
            return
        }

        if (message.type === 'error') {
            console.error('Reference worker error:', message.message)
            this.referenceWorkerFailed = true
            this.orbitIncomplete = false
            this.currentBlaLevelCount = 0
            return
        }

        if (message.type === 'referenceReset') {
            this.pendingRefJumpX += Number(message.referenceCx) - Number(this.referenceWorkerCx)
            this.pendingRefJumpY += Number(message.referenceCy) - Number(this.referenceWorkerCy)
            this.markReferenceReset()
            this.referenceWorkerCx = message.referenceCx
            this.referenceWorkerCy = message.referenceCy
            this.mandelbrotNavigator.reference_origin(message.referenceCx, message.referenceCy)
            this.referenceOrbitWasReset = true
            this.currentBlaLevelCount = 0
            this.referenceBlaReadyMaxIterations = 0
            this.invalidateCounterReadback()
            this.needRender = true
            return
        }

        if (message.type === 'orbitChunk') {
            const previousAvailableOrbitLen = this.referenceAvailableOrbitLen

            if (message.referenceCx !== this.referenceWorkerCx || message.referenceCy !== this.referenceWorkerCy) {
                this.pendingRefJumpX += Number(message.referenceCx) - Number(this.referenceWorkerCx)
                this.pendingRefJumpY += Number(message.referenceCy) - Number(this.referenceWorkerCy)
                this.markReferenceReset()
                this.referenceWorkerCx = message.referenceCx
                this.referenceWorkerCy = message.referenceCy
                this.mandelbrotNavigator.reference_origin(message.referenceCx, message.referenceCy)
                this.referenceOrbitWasReset = true
                this.currentBlaLevelCount = 0
                this.referenceBlaReadyMaxIterations = 0
                this.invalidateCounterReadback()
            } else if (message.offset === 0 && previousAvailableOrbitLen > 0) {
                this.markReferenceReset()
                this.referenceOrbitWasReset = true
                this.currentBlaLevelCount = 0
                this.referenceBlaReadyMaxIterations = 0
                this.invalidateCounterReadback()
            }
            this.referenceAvailableOrbitLen = message.count

            if (message.orbit.length > 0 && this.mandelbrotReferenceBuffer) {
                this.device.queue.writeBuffer(
                    this.mandelbrotReferenceBuffer,
                    message.offset * 4 * Float32Array.BYTES_PER_ELEMENT,
                    message.orbit,
                    0,
                    message.orbit.length,
                )
            }

            const availableIter = Math.max(0, this.referenceAvailableOrbitLen - 1)
            this.currentReferenceAvailableIter = availableIter
            this.currentReferenceRemainingIter = Math.max(0, this.currentMaxIterations - availableIter)
            this.isReferenceValidating = false
            this.currentGuardedMaxIter = Math.min(this.currentMaxIterations, availableIter)
            this.orbitIncomplete = !this.referenceWorkerFailed && availableIter < this.currentMaxIterations
            this.needRender = true
            return
        }

        this.ensureBlaBufferCapacity(message.steps.length / 6)
        this.ensureBlaLevelBufferCapacity(message.levelCount)
        if (message.steps.length > 0 && this.mandelbrotBlaBuffer) {
            this.device.queue.writeBuffer(this.mandelbrotBlaBuffer, 0, message.steps, 0, message.steps.length)
        }
        if (message.levels.length > 0 && this.mandelbrotBlaLevelBuffer) {
            this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer, 0, message.levels, 0, message.levels.length)
        }
        this.currentBlaLevelCount = message.levelCount
        this.referenceBlaReadyMaxIterations = message.maxIterations
        this.isReferenceValidating = false
        this.clearHistoryNextFrame = true
        this.needRender = true
        this.invalidateCounterReadback()
    }

    async initialize(mandelbrotNavigator: MandelbrotNavigator): Promise<void> {
        this.mandelbrotNavigator = mandelbrotNavigator
        this.approximationMode = this.mandelbrotNavigator.get_approximation_mode() === 1 ? 'bla' : 'perturbation'
        this.blaEpsilon = this.mandelbrotNavigator.get_bla_epsilon()
        this.initializeReferenceWorker()
        if (!navigator.gpu) throw new Error('WebGPU non supporté')
        this.adapter = await navigator.gpu.requestAdapter()
        if (!this.adapter) throw new Error('Adapter WebGPU introuvable')
        this.device = await this.adapter.requestDevice()
        this.device.label = 'Engine Device'
        this.device.lost.then((info) => {
            console.warn(`GPU device lost: reason=${info.reason}, message=${info.message}`)
        })
        this.queue = this.device.queue
        this.queue.label = 'Engine Queue'
        this.ctx = this.canvas.getContext('webgpu') as GPUCanvasContext
        this.format = navigator.gpu.getPreferredCanvasFormat()
        this.ctx.configure({ device: this.device, format: this.format, alphaMode: 'opaque' })

        // Chargement parallèle des textures additionnelles (tile + skybox)
        const [tileTexture, skyboxTexture] = await Promise.all([
            Engine._tileTexture
                ? Promise.resolve(Engine._tileTexture)
                : this._loadTexture(bronzeUrl),
            Engine._skyboxTexture
                ? Promise.resolve(Engine._skyboxTexture)
                : this._loadTexture(skyboxUrl),
        ])
        Engine._tileTexture = tileTexture
        this.tileTexture = tileTexture
        this.tileTextureView = this.tileTexture.createView()
        Engine._skyboxTexture = skyboxTexture
        this.skyboxTexture = skyboxTexture
        this.skyboxTextureView = this.skyboxTexture.createView()

        const palette = new Palette([])
        const paletteTex = palette.generateTexture()
        const paletteF16 = float32ArrayToFloat16(paletteTex.data)
        this.paletteTexture = this.device.createTexture({
            size: [paletteTex.width, paletteTex.height, 1],
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine PaletteTexture',
        })
        this.device.queue.writeTexture(
            { texture: this.paletteTexture },
            paletteF16.buffer as ArrayBuffer,
            { bytesPerRow: paletteTex.width * 8 },  // 4 channels × 2 bytes (float16)
            [paletteTex.width, paletteTex.height]
        )
        this.paletteTextureView = this.paletteTexture.createView()
        // Sampler linéaire pour interpolation douce de la palette
        this.paletteSampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'clamp-to-edge',
        })
        this.skyboxSampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        })

        // Webcam : initialisation (optionnel, activer webcamEnabled pour l'utiliser)
        this.webcamTexture = new WebcamTexture(1920, 1080)

        this.webcamTileTexture = this.device.createTexture({
            size: [1920, 1080, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        })
        this.webcamTextureView = this.webcamTileTexture.createView()

        // uniform buffers
        this.uniformBufferMandelbrot = this.device.createBuffer({
            size: 4 * 20,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Mandelbrot',
        })
        this.uniformBufferColor = this.device.createBuffer({
            size: 4 * 32, // 32 floats padded to 16-byte alignment (128 bytes)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Color',
        })
        this.uniformBufferBrush = this.device.createBuffer({
            size: 4 * 12, // 10 floats + padding to 16-byte alignment (48 bytes)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Brush',
        })
        this.uniformBufferResolve = this.device.createBuffer({
            size: 4 * 4, // 3 floats (mu, gridOffsetX, gridOffsetY) padded to 16-byte alignment
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Resolve',
        })
        this.mandelbrotReferenceBuffer = this.device.createBuffer({
            size: 4 * 1000000,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Orbit ReferenceStorage Buffer',
        })
        this.mandelbrotBlaBuffer = this.device.createBuffer({
            size: 4 * 6,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot BLA Storage Buffer',
        })
        this.mandelbrotBlaLevelBuffer = this.device.createBuffer({
            size: 4 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot BLA Level Storage Buffer',
        })
        this.mandelbrotBlaBufferCapacity = 1
        this.mandelbrotBlaLevelBufferCapacity = 1

        // Counter buffers for GPU pixel-completion readback (2 × u32: total unfinished + active)
        this.counterBuffer = this.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'Engine Counter Storage',
        })
        this.counterReadbackSlots = Array.from({ length: COUNTER_READBACK_BUFFER_COUNT }, (_, index) => ({
            buffer: this.device.createBuffer({
                size: 8,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: `Engine Counter Readback ${index}`,
            }),
            pending: false,
            sequence: 0,
            generation: 0,
        }))
        this.uniformBufferCount = this.device.createBuffer({
            size: 4 * 4, // 3 floats (mu, aspect, angle) padded to 16-byte alignment
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Count',
        })
        this.uniformBufferMerge = this.device.createBuffer({
            size: 4 * 8, // 6 floats (zf, lzf, frozenShiftU, frozenShiftV, aspect, angle) padded to 32 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Merge',
        })

        await this._createPipelines()
        this.resize()
    }

    private async _createPipelines() {
        const moduleBrush = this.device.createShaderModule({ code: brushShader, label: 'Engine ShaderModule Brush' })
        const moduleCompute = this.device.createShaderModule({ code: this.shaderPassCompute, label: 'Engine ShaderModule Compute' })
        const moduleResolve = this.device.createShaderModule({ code: resolveShader, label: 'Engine ShaderModule Resolve' })
        const moduleColor = this.device.createShaderModule({ code: this.shaderPassColor, label: 'Engine ShaderModule Color' })
        const moduleCount = this.device.createShaderModule({ code: countShader, label: 'Engine ShaderModule Count' })

        const layoutBrush = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
            ],
            label: 'Engine BindGroupLayout Brush',
        })

        const layoutMandelbrot = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
            ],
            label: 'Engine BindGroupLayout Mandelbrot',
        })

        const layoutResolve = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
            ],
            label: 'Engine BindGroupLayout Resolve',
        })

        const layoutColor = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
            ],
            label: 'Engine BindGroupLayout Color',
        })

        // 7 MRT targets for the layered r32float texture array
        const mrtTargets: GPUColorTargetState[] = Array.from({ length: LAYER_COUNT }, () => ({ format: 'r32float' as GPUTextureFormat }))

        this.pipelineBrush = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutBrush] }),
            vertex: { module: moduleBrush, entryPoint: 'vs_main' },
            fragment: { module: moduleBrush, entryPoint: 'fs_main', targets: mrtTargets },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline Brush',
        })

        this.pipelineMandelbrot = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutMandelbrot] }),
            vertex: { module: moduleCompute, entryPoint: 'vs_main' },
            fragment: { module: moduleCompute, entryPoint: 'fs_main', targets: mrtTargets },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline Mandelbrot',
        })

        this.pipelineResolve = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutResolve] }),
            vertex: { module: moduleResolve, entryPoint: 'vs_main' },
            fragment: { module: moduleResolve, entryPoint: 'fs_main', targets: mrtTargets },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline Resolve',
        })

        this.pipelineColor = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutColor] }),
            vertex: { module: moduleColor, entryPoint: 'vs_main' },
            fragment: { module: moduleColor, entryPoint: 'fs_main', targets: [{ format: this.format }] },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline Color',
        })

        // Compute pipeline for counting unfinished pixels
        const layoutCount = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            ],
            label: 'Engine BindGroupLayout Count',
        })
        this.pipelineCount = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutCount] }),
            compute: { module: moduleCount, entryPoint: 'count_unfinished' },
            label: 'Engine ComputePipeline Count',
        })

        // ── Merge pipeline (resolved + frozen → frozen via MRT) ──────────
        const moduleMerge = this.device.createShaderModule({ code: mergeFrozenShader, label: 'Engine ShaderModule Merge' })
        const layoutMerge = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
            ],
            label: 'Engine BindGroupLayout Merge',
        })
        this.pipelineMerge = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutMerge] }),
            vertex: { module: moduleMerge, entryPoint: 'vs_main' },
            fragment: { module: moduleMerge, entryPoint: 'fs_main', targets: mrtTargets },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline Merge',
        })

        // bind groups seront (ré)créés dans resize car dépend des textures
        this.bindGroupBrush = undefined
        this.bindGroupMandelbrot = undefined
        this.bindGroupResolve = undefined
        this.bindGroupColor = undefined
        this.counterBindGroup = undefined
        this.bindGroupMerge = undefined
    }

    private rebuildMandelbrotBindGroup() {
        if (!this.pipelineMandelbrot || !this.rawBrushArrayView || !this.uniformBufferMandelbrot
            || !this.mandelbrotReferenceBuffer || !this.mandelbrotBlaBuffer || !this.mandelbrotBlaLevelBuffer) {
            return
        }

        const layout = this.pipelineMandelbrot.getBindGroupLayout(0)
        this.bindGroupMandelbrot = this.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBufferMandelbrot } },
                { binding: 1, resource: { buffer: this.mandelbrotReferenceBuffer } },
                { binding: 2, resource: { buffer: this.mandelbrotBlaBuffer } },
                { binding: 3, resource: { buffer: this.mandelbrotBlaLevelBuffer } },
                { binding: 4, resource: this.rawBrushArrayView },
            ],
            label: 'Engine BindGroup Mandelbrot',
        })
    }

    private ensureBlaBufferCapacity(requiredEntries: number) {
        const safeRequiredEntries = Math.max(1, Math.ceil(requiredEntries))
        if (safeRequiredEntries <= this.mandelbrotBlaBufferCapacity) {
            return
        }

        this.mandelbrotBlaBuffer?.destroy?.()
        this.mandelbrotBlaBuffer = this.device.createBuffer({
            size: safeRequiredEntries * 4 * 6,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot BLA Storage Buffer',
        })
        this.mandelbrotBlaBufferCapacity = safeRequiredEntries
        this.rebuildMandelbrotBindGroup()
    }

    private ensureBlaLevelBufferCapacity(requiredEntries: number) {
        const safeRequiredEntries = Math.max(1, Math.ceil(requiredEntries))
        if (safeRequiredEntries <= this.mandelbrotBlaLevelBufferCapacity) {
            return
        }

        this.mandelbrotBlaLevelBuffer?.destroy?.()
        this.mandelbrotBlaLevelBuffer = this.device.createBuffer({
            size: safeRequiredEntries * 4 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot BLA Level Storage Buffer',
        })
        this.mandelbrotBlaLevelBufferCapacity = safeRequiredEntries
        this.rebuildMandelbrotBindGroup()
    }

    private invalidateCounterReadback() {
        this.unfinishedPixelCount = -1
        this.activePixelCount = -1
        this.counterReadbackGeneration++
        this.lastCounterDispatchFrame = -COUNTER_SAMPLE_INTERVAL_FRAMES
    }

    private hasPendingCounterReadbackForCurrentGeneration(): boolean {
        return this.counterReadbackSlots.some(slot =>
            slot.pending && slot.generation === this.counterReadbackGeneration
        )
    }

    private acquireCounterReadbackSlot(): CounterReadbackSlot | undefined {
        const slotCount = this.counterReadbackSlots.length
        for (let i = 0; i < slotCount; i++) {
            const index = (this.counterReadbackWriteIndex + i) % slotCount
            const slot = this.counterReadbackSlots[index]
            if (!slot.pending) {
                this.counterReadbackWriteIndex = (index + 1) % slotCount
                return slot
            }
        }
        return undefined
    }

    private scheduleCounterReadback(slot: CounterReadbackSlot, sequence: number, generation: number) {
        slot.pending = true
        slot.sequence = sequence
        slot.generation = generation

        void (async () => {
            let mapped = false
            try {
                await slot.buffer.mapAsync(GPUMapMode.READ)
                mapped = true
                const data = new Uint32Array(slot.buffer.getMappedRange())
                const unfinished = data[0]
                const active = data[1]
                this.applyCounterReadback(sequence, generation, unfinished, active)
            } catch {
                // Buffer destruction or device loss can reject an outstanding readback.
            } finally {
                if (mapped) {
                    slot.buffer.unmap()
                }
                slot.pending = false
            }
        })()
    }

    private applyCounterReadback(sequence: number, generation: number, unfinished: number, active: number) {
        if (generation !== this.counterReadbackGeneration) {
            return
        }
        if (sequence <= this.latestAppliedCounterReadbackSequence) {
            return
        }
        this.latestAppliedCounterReadbackSequence = sequence

        const prevUnfinished = this.unfinishedPixelCount
        this.unfinishedPixelCount = unfinished
        this.activePixelCount = active

        // When progressive computation just finished, snapshot resolved→frozen
        // so the unified color path has a valid frozen fallback for future clears.
        if (prevUnfinished > UNFINISHED_PIXEL_DONE_THRESHOLD
            && unfinished <= UNFINISHED_PIXEL_DONE_THRESHOLD
            && !this.clearHistoryNextFrame
            && !this.zoomReprojectionActive) {
            this.needFreezeSnapshot = true
        }
    }

    private scheduleGpuTiming(submitStartMs: number) {
        if (this.pendingGpuTiming) {
            return
        }

        this.pendingGpuTiming = true
        void this.device.queue.onSubmittedWorkDone()
            .then(() => {
                this.pendingGpuTiming = false
                this.applyGpuFrameTiming(performance.now() - submitStartMs)
            })
            .catch(() => {
                this.pendingGpuTiming = false
            })
    }

    private applyGpuFrameTiming(elapsed: number) {
        this.gpuFrameTimeMs = elapsed

        if (this.smoothedGpuTimeMs === 0) {
            this.smoothedGpuTimeMs = elapsed
        } else {
            this.smoothedGpuTimeMs =
                this.smoothedGpuTimeMs * (1 - GPU_TIME_EMA_ALPHA)
                + elapsed * GPU_TIME_EMA_ALPHA
        }

        if (elapsed <= 0) {
            return
        }

        const ratio = (1000 / this.targetFps) / elapsed
        const ideal = this.iterationBatchSize * ratio
        const maxBatchSize = this.getEffectiveMaxBatchSize()
        this.iterationBatchSize = Math.round(
            Math.min(maxBatchSize,
                Math.max(MIN_BATCH_SIZE,
                    this.iterationBatchSize * 0.7 + ideal * 0.3
                )
            )
        )
    }

    private getEffectiveMaxBatchSize(): number {
        return this.approximationMode === 'bla' && this.currentBlaLevelCount > 0
            ? MAX_BLA_BATCH_SIZE
            : MAX_BATCH_SIZE
    }

    resize() {
        const dpr = (window.devicePixelRatio || 1) * this.dprMultiplier
        // Lire la taille CSS du canvas (pas du parent) pour respecter les contraintes CSS
        const parent = this.canvas.parentElement
        const widthCSS = parent?.clientWidth || 1
        const heightCSS = parent?.clientHeight || 1
        this.width = Math.max(1, Math.round(widthCSS * dpr))
        this.height = Math.max(1, Math.round(heightCSS * dpr))

        // Clamper aux limites GPU (maxTextureDimension2D, typiquement 8192 ou 16384)
        const maxDim = this.device?.limits?.maxTextureDimension2D ?? 8192
        this.width = Math.min(this.width, maxDim)
        this.height = Math.min(this.height, maxDim)

        this.canvas.width = this.width
        this.canvas.height = this.height
        this.canvas.style.width = widthCSS + 'px'
        this.canvas.style.height = heightCSS + 'px'

        this.ctx.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'opaque',
        })

        // taille suffisante pour contenir la diagonale de l'écran après rotation
        this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height))
        const textureSize = this.neutralSize
        this.rawTexture?.destroy?.()
        this.rawBrushTexture?.destroy?.()
        this.resolvedTexture?.destroy?.()
        this.frozenTexture?.destroy?.()

        const layerCount = LAYER_COUNT

        // Helper: create an r32float texture array + per-layer 2d views + full 2d-array view
        const createLayeredTexture = (label: string): {
            texture: GPUTexture,
            arrayView: GPUTextureView,
            layerViews: GPUTextureView[],
        } => {
            const texture = this.device.createTexture({
                size: { width: textureSize, height: textureSize, depthOrArrayLayers: layerCount },
                format: 'r32float',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
                label,
            })
            const arrayView = texture.createView({
                dimension: '2d-array',
                baseArrayLayer: 0,
                arrayLayerCount: layerCount,
                label: label + ' ArrayView',
            })
            const layerViews: GPUTextureView[] = []
            for (let i = 0; i < layerCount; i++) {
                layerViews.push(texture.createView({
                    dimension: '2d',
                    baseArrayLayer: i,
                    arrayLayerCount: 1,
                    label: label + ` Layer${i}`,
                }))
            }
            return { texture, arrayView, layerViews }
        }

        const rawResult = createLayeredTexture('Engine RawTexture (A)')
        this.rawTexture = rawResult.texture
        this.rawArrayView = rawResult.arrayView
        this.rawLayerViews = rawResult.layerViews

        const brushResult = createLayeredTexture('Engine RawBrushTexture (B)')
        this.rawBrushTexture = brushResult.texture
        this.rawBrushArrayView = brushResult.arrayView
        this.rawBrushLayerViews = brushResult.layerViews

        const resolvedResult = createLayeredTexture('Engine ResolvedTexture')
        this.resolvedTexture = resolvedResult.texture
        this.resolvedArrayView = resolvedResult.arrayView
        this.resolvedLayerViews = resolvedResult.layerViews

        const frozenResult = createLayeredTexture('Engine FrozenTexture')
        this.frozenTexture = frozenResult.texture
        this.frozenArrayView = frozenResult.arrayView
        this.frozenLayerViews = frozenResult.layerViews

        // Reset zoom reprojection state on resize
        this.zoomReprojectionActive = false
        this.zoomFactor = 1.0
        this.liveZoomFactor = 1.0
        this.frozenScale = 0
        this.liveScale = 0

        // Re-création des bind groups dépendant des textures
        if (this.pipelineBrush) {
            const layout = this.pipelineBrush.getBindGroupLayout(0)
            this.bindGroupBrush = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferBrush! } },
                    { binding: 1, resource: this.rawArrayView! },
                ],
                label: 'Engine BindGroup Brush',
            })
        }

        if (this.pipelineMandelbrot) {
            this.rebuildMandelbrotBindGroup()
        }

        if (this.pipelineResolve) {
            const layout = this.pipelineResolve.getBindGroupLayout(0)
            this.bindGroupResolve = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferResolve! } },
                    { binding: 1, resource: this.rawArrayView! },
                ],
                label: 'Engine BindGroup Resolve',
            })
        }

        if (this.pipelineColor) {
            const layout = this.pipelineColor.getBindGroupLayout(0)
            const entries: GPUBindGroupEntry[] = [
                { binding: 0, resource: { buffer: this.uniformBufferColor! } },
                { binding: 1, resource: this.resolvedArrayView! },
                { binding: 2, resource: this.tileTextureView! },
                { binding: 3, resource: this.skyboxTextureView! },
                { binding: 4, resource: this.webcamTextureView! },
                { binding: 5, resource: this.paletteTextureView! },
                { binding: 6, resource: this.frozenArrayView! },
                { binding: 7, resource: this.paletteSampler! },
                { binding: 8, resource: this.skyboxSampler! },
            ]
            this.bindGroupColor = this.device.createBindGroup({
                layout,
                entries,
                label: 'Engine BindGroup Color',
            })
        }

        // Counter compute pass bind group (reads rawTexture A after mandelbrot pass)
        if (this.pipelineCount && this.counterBuffer && this.uniformBufferCount) {
            const layout = this.pipelineCount.getBindGroupLayout(0)
            this.counterBindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: this.rawArrayView! },
                    { binding: 1, resource: { buffer: this.counterBuffer } },
                    { binding: 2, resource: { buffer: this.uniformBufferCount } },
                ],
                label: 'Engine BindGroup Count',
            })
        }

        // Merge pass bind group: reads resolved (binding 1) + rawBrushTexture as
        // frozen-copy (binding 2).  At zoom stop we copyTexture(frozen→rawBrush)
        // first so the merge can safely read frozen data while writing to frozen.
        if (this.pipelineMerge && this.uniformBufferMerge) {
            const layout = this.pipelineMerge.getBindGroupLayout(0)
            this.bindGroupMerge = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferMerge } },
                    { binding: 1, resource: this.resolvedArrayView! },
                    { binding: 2, resource: this.rawBrushArrayView! },
                ],
                label: 'Engine BindGroup Merge',
            })
        }

        this.prevFrameMandelbrot = undefined // plus de frame précédente après resize
        this.previousMandelbrot = undefined  // force update() to re-write all uniforms
        this.previousRenderOptions = undefined
        this.needRender = true
        this.invalidateCounterReadback() // reset: not yet known after resize
    }

    areObjectsEqual(obj1: any, obj2: any): boolean {
        if (obj1 === undefined || obj2 === undefined) {
            return false
        }
        return JSON.stringify(obj1) === JSON.stringify(obj2)
    }

    areColorStopsEqual(
        a: ColorStop[],
        b: ColorStop[]
    ): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (const [i, aStop] of a.entries()) {
            const bStop = b[i]
            if (!bStop) {
                return false
            }
            // Compare all fields via JSON (includes color, position, and all effect fields)
            if (JSON.stringify(aStop) !== JSON.stringify(bStop)) {
                return false
            }
        }
        return true
    }

    setApproximationMode(mode: ApproximationMode) {
        if (mode === this.approximationMode) {
            return
        }

        if (mode === 'bla') {
            this.mandelbrotNavigator.use_bla()
        } else {
            this.mandelbrotNavigator.use_perturbation()
        }

        this.approximationMode = mode
        this.currentBlaLevelCount = 0
        this.postReferenceWorker({
            type: 'setApproximationMode',
            jobId: this.referenceJobId,
            approximationMode: mode,
        })
        this.clearHistoryNextFrame = true
        this.needRender = true
        this.invalidateCounterReadback()
    }

    getApproximationMode(): ApproximationMode {
        return this.approximationMode
    }

    setBlaEpsilon(epsilon: number) {
        const next = Math.max(Number.MIN_VALUE, epsilon)
        if (next === this.blaEpsilon) {
            return
        }
        this.mandelbrotNavigator.set_bla_epsilon(next)
        this.blaEpsilon = next
        this.postReferenceWorker({
            type: 'setBlaEpsilon',
            jobId: this.referenceJobId,
            blaEpsilon: next,
        })
        if (this.approximationMode === 'bla') {
            this.currentBlaLevelCount = 0
            this.clearHistoryNextFrame = true
            this.needRender = true
            this.invalidateCounterReadback()
        }
    }

    async update(mandelbrot: Mandelbrot, renderOptions: RenderOptions) {
        // Calcul du temps écoulé depuis la dernière frame
        const now = performance.now()
        if (this.lastUpdateTime === 0) {
            this.lastUpdateTime = now
        }
        const delta = (now - this.lastUpdateTime) / 1000 // en secondes
        this.time += delta
        this.lastUpdateTime = now

        const navigatorApproximationMode = this.mandelbrotNavigator.get_approximation_mode() === 1 ? 'bla' : 'perturbation'
        const navigatorBlaEpsilon = this.mandelbrotNavigator.get_bla_epsilon()
        if (navigatorApproximationMode !== this.approximationMode || navigatorBlaEpsilon !== this.blaEpsilon) {
            this.approximationMode = navigatorApproximationMode
            this.blaEpsilon = navigatorBlaEpsilon
            this.currentBlaLevelCount = 0
            this.postReferenceWorker({
                type: 'setApproximationMode',
                jobId: this.referenceJobId,
                approximationMode: navigatorApproximationMode,
            })
            this.postReferenceWorker({
                type: 'setBlaEpsilon',
                jobId: this.referenceJobId,
                blaEpsilon: navigatorBlaEpsilon,
            })
            this.clearHistoryNextFrame = true
            this.needRender = true
            this.invalidateCounterReadback()
        }

        const mandelbrotChanged = !this.areObjectsEqual(mandelbrot, this.previousMandelbrot)
        const renderOptionsChanged = !this.areObjectsEqual(renderOptions, this.previousRenderOptions)
        const stripeFrequencyChanged = renderOptions.stripeFrequency !== this.previousRenderOptions?.stripeFrequency
        const orbitMetricsEnabled = shouldTrackOrbitMetrics(renderOptions.colorStops)
        const orbitMetricsChanged = this.previousOrbitMetricsEnabled !== undefined
            && orbitMetricsEnabled !== this.previousOrbitMetricsEnabled
        const activeStripeFrequencyChanged = stripeFrequencyChanged && orbitMetricsEnabled
        this.needRender = this.needRender || mandelbrotChanged || renderOptionsChanged
        if (mandelbrotChanged || activeStripeFrequencyChanged || orbitMetricsChanged) {
            this.invalidateCounterReadback() // unknown — new fractal params, GPU counter not read yet
        }
        if (activeStripeFrequencyChanged || orbitMetricsChanged) {
            this.clearHistoryNextFrame = true
        }
        this.previousOrbitMetricsEnabled = orbitMetricsEnabled

        // Check if any stop has webcam > 0 to decide whether to capture webcam frames
        const hasWebcam = renderOptions.colorStops.some(s => (s.webcam ?? 0) > 0)
        if (hasWebcam) { // limite à ~30fps la mise à jour webcam
            await this.updateWebcamTexture()
            this.needRender = true
        } else {
            this.webcamTexture?.closeWebcam()
        }

        if (renderOptions.activateAnimate) {
            this.needRender = true
        }

        const aspect = (this.width / Math.max(1, this.height))

        let scaleFactor = this.previousMandelbrot?.scale || 1.0 / mandelbrot.scale
        if (scaleFactor < 1.0) {
            scaleFactor = 1.0 / scaleFactor
        }
        scaleFactor = Math.sqrt(scaleFactor) - 1.0

        // When the navigator re-anchors its reference orbit, `dx/dy` jump back to ~0.
        // Reprojecting history across that discontinuity would be nonsense, so we clear.
        const orbitWasReset = this.referenceOrbitWasReset && !!this.prevFrameMandelbrot
        this.referenceOrbitWasReset = false

        const hardResetHistory = !this.prevFrameMandelbrot || orbitWasReset
        const muChanged = !!this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== mandelbrot.mu
        const preserveZoomFrozen = this.zoomReprojectionActive && hardResetHistory && !muChanged
        if (hardResetHistory || muChanged) {
            this.clearHistoryNextFrame = true
            if (!preserveZoomFrozen) {
                // Hard reset: also kill any active zoom reprojection cycle and
                // discard pending snapshots captured under the previous reference.
                this.zoomReprojectionActive = false
                this.zoomFactor = 1.0
                this.liveZoomFactor = 1.0
                this.liveScale = 0
                this.frozenBaseShiftX = 0
                this.frozenBaseShiftY = 0
                this.referenceResetDuringZoom = false
                this.pendingRefJumpX = 0
                this.pendingRefJumpY = 0
            } else {
                // The reference re-anchor makes dx/dy jump by -pendingRefJump.
                // Isolate the actual pan component and fold it into frozenBaseShift.
                const neutralExtent = Math.sqrt(aspect * aspect + 1.0)
                const rawDx = mandelbrot.dx - this.prevFrameMandelbrot!.dx
                const rawDy = mandelbrot.dy - this.prevFrameMandelbrot!.dy
                // dx changed by -refJump due to the reference switch; subtract that.
                const panDx = rawDx + this.pendingRefJumpX
                const panDy = rawDy + this.pendingRefJumpY
                if (this.frozenScale > 0) {
                    this.frozenBaseShiftX += Math.round(-(panDx * this.neutralSize) / (2 * this.frozenScale * neutralExtent))
                    this.frozenBaseShiftY += Math.round((panDy * this.neutralSize) / (2 * this.frozenScale * neutralExtent))
                }
                this.pendingRefJumpX = 0
                this.pendingRefJumpY = 0
                this.referenceResetDuringZoom = true
            }
            this.needFreezeSnapshot = false
            this.needMergeSnapshot = false
        }

        // ── Zoom reprojection state update (before uniform write) ─────
        // Detect scale changes and manage the zoom reprojection cycle.
        // During a cycle, the live texture is computed at a fixed `liveScale`
        // while the display zoom interpolates from frozenScale towards liveScale.
        // The color shader rescales both textures to match the current display.
        {
            const scaleChanged = this.prevFrameMandelbrot
                && this.prevFrameMandelbrot.scale !== mandelbrot.scale

            if (scaleChanged
                && !this.zoomReprojectionActive
                && !hardResetHistory
                && !muChanged) {
                // Start a new zoom reprojection cycle.
                this.zoomReprojectionActive = true
                this.frozenScale = this.prevFrameMandelbrot!.scale
                this.zoomingIn = mandelbrot.scale < this.frozenScale
                // Compute target live scale: one threshold step ahead
                this.liveScale = this.zoomingIn
                    ? this.frozenScale / this.zoomMagnificationThreshold
                    : this.frozenScale * this.zoomMagnificationThreshold
                const neutralExtent = Math.sqrt(aspect * aspect + 1.0)
                const deltaDx = mandelbrot.dx - this.prevFrameMandelbrot!.dx
                const deltaDy = mandelbrot.dy - this.prevFrameMandelbrot!.dy
                this.frozenBaseShiftX = Math.round(-(deltaDx * this.neutralSize) / (2 * this.frozenScale * neutralExtent))
                this.frozenBaseShiftY = Math.round((deltaDy * this.neutralSize) / (2 * this.frozenScale * neutralExtent))
                this.referenceResetDuringZoom = false
                this.needFreezeSnapshot = true
                this.clearHistoryNextFrame = true
            }

            // Update zoom factors during an active cycle
            if (this.zoomReprojectionActive && this.frozenScale > 0) {
                this.zoomFactor = this.frozenScale / mandelbrot.scale
                this.liveZoomFactor = this.liveScale / mandelbrot.scale

                // Check if we've reached the swap threshold.
                // zoomFactor = frozenScale / displayScale.
                // For zoom-in:  displayScale decreases → zoomFactor rises from ~1 to threshold.
                // For zoom-out: displayScale increases → zoomFactor drops from ~1 to 1/threshold.
                // Once the clear triggered by a reference reset has been consumed,
                // re-enable swap so the zoom cycle can continue normally.
                if (this.referenceResetDuringZoom && !this.clearHistoryNextFrame) {
                    this.referenceResetDuringZoom = false
                }
                const shouldSwap = this.zoomingIn
                    ? this.zoomFactor >= this.zoomMagnificationThreshold
                    : this.zoomFactor <= 1.0 / this.zoomMagnificationThreshold

                if (shouldSwap && !this.referenceResetDuringZoom) {
                    // Swap: the live texture becomes the new frozen snapshot,
                    // start a new cycle at the next threshold step.
                    // Use mandelbrot.scale (current display) — NOT frozenScale —
                    // to compute the next liveScale, so the new cycle starts
                    // from where the user actually is. This prevents swap
                    // cascades when zoom speed overshoots liveScale.
                    this.needFreezeSnapshot = true
                    this.clearHistoryNextFrame = true
                    this.frozenScale = this.liveScale
                    this.frozenBaseShiftX = 0
                    this.frozenBaseShiftY = 0
                    this.liveScale = this.zoomingIn
                        ? mandelbrot.scale / this.zoomMagnificationThreshold
                        : mandelbrot.scale * this.zoomMagnificationThreshold
                    this.zoomFactor = this.frozenScale / mandelbrot.scale
                    this.liveZoomFactor = this.liveScale / mandelbrot.scale
                }
            } else if (!this.zoomReprojectionActive) {
                this.zoomFactor = 1.0
                this.liveZoomFactor = 1.0
                this.liveScale = 0
            }

            // If zoom has stopped (no scale change), deactivate and recompute
            // at the actual display scale.
            if (this.zoomReprojectionActive && !scaleChanged
                && this.prevFrameMandelbrot
                && this.prevFrameMandelbrot.scale === mandelbrot.scale) {
                    // Capture merge uniforms BEFORE resetting zoom state.
                    const aspect = (this.width / Math.max(1, this.height))
                    this.mergeUniforms = {
                        zf: this.zoomFactor,
                        lzf: this.liveZoomFactor,
                        frozenShiftU: (this.frozenScale > 0)
                            ? (this.frozenBaseShiftX + this.cumulativeShiftX * (this.liveScale / this.frozenScale)) / this.neutralSize
                            : 0,
                        frozenShiftV: (this.frozenScale > 0)
                            ? -(this.frozenBaseShiftY + this.cumulativeShiftY * (this.liveScale / this.frozenScale)) / this.neutralSize
                            : 0,
                        aspect,
                        angle: mandelbrot.angle,
                    }
                    this.needMergeSnapshot = !this.referenceResetDuringZoom

                    this.zoomReprojectionActive = false
                    this.zoomFactor = 1.0
                    this.liveZoomFactor = 1.0
                    this.liveScale = 0
                    this.frozenBaseShiftX = 0
                    this.frozenBaseShiftY = 0
                    this.referenceResetDuringZoom = false
                    this.pendingRefJumpX = 0
                    this.pendingRefJumpY = 0
                    this.clearHistoryNextFrame = true
            }
        }

        // Si la palette a changé (stops ou mode d'interpolation), on la recalcule
        if (!this.areColorStopsEqual(renderOptions.colorStops, this.previousRenderOptions?.colorStops || [])
            || renderOptions.interpolationMode !== this.previousRenderOptions?.interpolationMode) {
            const palette = new Palette(renderOptions.colorStops, renderOptions.interpolationMode)
            const paletteTex = palette.generateTexture()
            const paletteF16 = float32ArrayToFloat16(paletteTex.data)
            this.device.queue.writeTexture(
                { texture: this.paletteTexture! },
                paletteF16.buffer as ArrayBuffer,
                { bytesPerRow: paletteTex.width * 8 },  // 4 channels × 2 bytes (float16)
                [paletteTex.width, paletteTex.height]
            )
            this.needRender = true
        }

        const sceneSin = Math.sin(mandelbrot.angle)
        const sceneCos = Math.cos(mandelbrot.angle)
        const lightDirLen = Math.hypot(Math.cos(renderOptions.lightAngle), Math.sin(renderOptions.lightAngle), 1.85)
        const colorLiveShiftX = this.clearHistoryNextFrame ? 0 : this.cumulativeShiftX
        const colorLiveShiftY = this.clearHistoryNextFrame ? 0 : this.cumulativeShiftY
        const colorShaderData = new Float32Array([
            renderOptions.palettePeriod,    // 0: palettePeriod
            renderOptions.paletteOffset,    // 1: paletteOffset
            scaleFactor,                    // 2: bloomStrength (scaleFactor)
            this.time,                      // 3: time
            aspect,                         // 4: aspect
            mandelbrot.angle,               // 5: angle
            renderOptions.activateAnimate ? 1 : 0, // 6: animate
            mandelbrot.mu,                  // 7: mu
            this.zoomFactor,                // 8: zoomFactor
            (this.zoomReprojectionActive || this.frozenAligned) ? 1.0 : 0.0, // 9: frozenAligned
            this.liveZoomFactor,            // 10: liveZoomFactor
            // Frozen shift derived from the live texture's actual cumulative
            // shift (in rounded texels at liveScale), rescaled to frozen UV.
            // This ensures the frozen texture follows the exact same pan drift
            // as the live texture, without independent accumulation errors.
            (this.zoomReprojectionActive && this.frozenScale > 0)
                ? (this.frozenBaseShiftX + colorLiveShiftX * (this.liveScale / this.frozenScale)) / this.neutralSize
                : 0,                        // 11: frozenShiftU
            (this.zoomReprojectionActive && this.frozenScale > 0)
                ? -(this.frozenBaseShiftY + colorLiveShiftY * (this.liveScale / this.frozenScale)) / this.neutralSize
                : 0,                        // 12: frozenShiftV
            renderOptions.tessellationLevel, // 13: tessellationLevel
            renderOptions.displacementAmount, // 14: displacementAmount
            renderOptions.animationSpeed,   // 15: animationSpeed
            mandelbrot.epsilon,             // 16: epsilon
            renderOptions.ambientOcclusionStrength, // 17: ambientOcclusionStrength
            renderOptions.microBumpStrength, // 18: microBumpStrength
            renderOptions.clearcoatStrength, // 19: clearcoatStrength
            renderOptions.subsurfaceStrength, // 20: subsurfaceStrength
            renderOptions.reliefDepth,       // 21: reliefDepth
            renderOptions.localShadowStrength, // 22: localShadowStrength
            renderOptions.lightAngle,          // 23: lightAngle
            renderOptions.varnishStrength,     // 24: varnishStrength
            Math.log(mandelbrot.mu),            // 25: logMu
            sceneSin,                           // 26: sceneSin
            sceneCos,                           // 27: sceneCos
            Math.cos(renderOptions.lightAngle) / lightDirLen, // 28: lightDirX
            Math.sin(renderOptions.lightAngle) / lightDirLen, // 29: lightDirY
            1.85 / lightDirLen,                 // 30: lightDirZ
            renderOptions.paletteMirror ? 1 : 0, // 31: paletteMirror
        ])
        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, colorShaderData.buffer)

        if (!this.needsMoreFrames()) {
            return
        }

        const maxIterations = Math.ceil(mandelbrot.maxIterations)
        this.currentMaxIterations = maxIterations
        const computeScale = (this.zoomReprojectionActive && this.liveScale > 0)
            ? this.liveScale
            : mandelbrot.scale

        if (!this.referenceViewKey) {
            this.resetReferenceJob(mandelbrot, computeScale, maxIterations)
        }
        this.syncReferenceWorkerView(mandelbrot, computeScale, maxIterations)

        // Guard the shader: globalMaxIter must never exceed the orbit steps
        // we have actually computed, or the shader would read uninitialised memory.
        const availableIter = Math.max(0, this.referenceAvailableOrbitLen - 1)
        const guardedMaxIter = Math.min(maxIterations, availableIter)
        this.currentGuardedMaxIter = guardedMaxIter
        this.currentReferenceAvailableIter = availableIter
        this.currentReferenceRemainingIter = Math.max(0, maxIterations - availableIter)

        // Track whether the orbit is still being built (used by needsMoreFrames).
        this.orbitIncomplete = !this.referenceWorkerFailed && availableIter < maxIterations
        const orbitComplete = availableIter >= maxIterations

        const approximationModeFlag = this.approximationMode === 'bla'
            && orbitComplete
            && this.currentBlaLevelCount > 0
            && this.referenceBlaReadyMaxIterations >= guardedMaxIter
            ? 1
            : 0
        const blaLevelCount = approximationModeFlag ? this.currentBlaLevelCount : 0

        // Re-write the mandelbrot uniform with the guarded globalMaxIter.
        // During zoom reprojection, override scale with liveScale so the GPU
        // computes at the fixed target scale for this cycle.
        const mandelbrotShaderUniformDataGuarded = new Float32Array([
            mandelbrot.dx,
            mandelbrot.dy,
            mandelbrot.mu,
            computeScale,
            aspect,
            mandelbrot.angle,
            this.iterationBatchSize,
            mandelbrot.epsilon,
            renderOptions.antialiasLevel,
            0,  // iterationOffset
            guardedMaxIter,
            orbitComplete ? 1 : 0,
            approximationModeFlag,
            blaLevelCount,
            this.blaEpsilon,
            renderOptions.stripeFrequency,
            orbitMetricsEnabled ? 1 : 0,
            0,
            0,
            0,
        ])
        this.device.queue.writeBuffer(this.uniformBufferMandelbrot!, 0, mandelbrotShaderUniformDataGuarded.buffer)

        // When the orbit just became complete, clear history once so that
        // pixels which were stored as budget-exhausted continuations (during
        // orbit building) get a fresh recompute with the full orbit available.
        // During an active zoom reprojection cycle, skip this: maxIterations
        // grows every frame with scale, so the condition fires perpetually.
        // The ZOOM_STOP clear will trigger a full recompute when zoom ends.
        if (!this.zoomReprojectionActive
            && !this.clearHistoryNextFrame
            && orbitComplete && this.prevGuardedMaxIter < maxIterations && this.prevGuardedMaxIter > 0) {
            this.needFreezeSnapshot = true
            this.clearHistoryNextFrame = true
        }
        this.prevGuardedMaxIter = guardedMaxIter

        this.previousMandelbrot = structuredClone(mandelbrot) // conserve current pour utilisation future
        this.previousRenderOptions = structuredClone(renderOptions)
    }

    async render() {
        if (!this.needsMoreFrames()) {
            return
        }

        if (!this.pipelineBrush
            || !this.pipelineMandelbrot
            || !this.pipelineResolve
            || !this.pipelineColor
        ) {
            return
        }
        if (!this.bindGroupBrush
            || !this.bindGroupMandelbrot
            || !this.bindGroupResolve
            || !this.bindGroupColor
        ) {
            return
        }
        if (!this.previousMandelbrot) {
            return
        }

        const aspect = (this.width / Math.max(1, this.height))
        // All paths now use the same seed step for progressive refinement.
        const seedStep = floorPowerOfTwo(SENTINEL_SEED_STEP)
        const baseSentinel = seedStep
        const clearFlag = this.clearHistoryNextFrame ? 1 : 0
        if (this.clearHistoryNextFrame) {
            this.invalidateCounterReadback()
        }
        const frameSerial = ++this.renderFrameSerial

        let shiftTexX = 0
        let shiftTexY = 0
        if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
            const deltaDx = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx
            const deltaDy = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy

            // Convert Mandelbrot translation (complex-plane units) -> texture texel shift.
            // See `src/assets/reproject.wgsl` translation reprojection logic.
            // During zoom reprojection, use liveScale (the scale at which the
            // live texture is computed) instead of the display scale.
            const texSize = this.neutralSize
            const neutralExtent = Math.sqrt(aspect * aspect + 1.0)
            const scaleForShift = (this.zoomReprojectionActive && this.liveScale > 0)
                ? this.liveScale
                : this.previousMandelbrot.scale
            shiftTexX = -(deltaDx * texSize) / (2 * scaleForShift * neutralExtent)
            shiftTexY = (deltaDy * texSize) / (2 * scaleForShift * neutralExtent)
        }
        const roundedShiftTexX = Math.round(shiftTexX)
        const roundedShiftTexY = Math.round(shiftTexY)
        const hasTranslationShift = roundedShiftTexX !== 0 || roundedShiftTexY !== 0

        // Accumulate cumulative texel shift for sentinel grid alignment.
        // We accumulate the *rounded* shift (what the shader actually applies)
        // to avoid drift between the JS cumulative total and the GPU reality.
        if (this.clearHistoryNextFrame) {
            this.cumulativeShiftX = 0
            this.cumulativeShiftY = 0
        } else {
            this.cumulativeShiftX += roundedShiftTexX
            this.cumulativeShiftY += roundedShiftTexY
            // Translation shifts the live texture but not the frozen texture,
            // so any non-zero shift desynchronizes them.
            if (hasTranslationShift) {
                this.frozenAligned = false
            }
        }

        if (hasTranslationShift && !this.zoomReprojectionActive) {
            // A pending non-zoom snapshot would copy the pre-translation
            // resolved texture, then incorrectly mark it aligned with the
            // translated live texture.
            this.needFreezeSnapshot = false
        }

        // Grid offset passed to the shader: cumulative shift mod baseSentinel,
        // using WGSL-friendly positive modular arithmetic.
        const gridOffsetX = ((this.cumulativeShiftX % baseSentinel) + baseSentinel) % baseSentinel
        const gridOffsetY = ((this.cumulativeShiftY % baseSentinel) + baseSentinel) % baseSentinel
        const counterReadbackPending = this.hasPendingCounterReadbackForCurrentGeneration()

        // Adaptive refinement gating: pause sentinel halving only when the
        // batch controller is already at its minimum AND there are too many
        // active pixels (those mandelbrot.wgsl actually processes).  This
        // prevents pixel-count avalanches while guaranteeing convergence:
        // if the batch has room to shrink, the gate stays open and the batch
        // controller absorbs the ×4 spike.  A structurally slow GPU (high DPR)
        // will stabilise its batch above MIN, so refinement proceeds. While a
        // counter readback is pending, refinement pauses so that the delayed
        // count cannot become optimistic relative to newer sentinels.
        const gateOpen =
            !counterReadbackPending
            && (
                this.clearHistoryNextFrame
                || this.activePixelCount < 0
                || this.iterationBatchSize > MIN_BATCH_SIZE
                || this.activePixelCount < ACTIVE_PIXEL_GATE_THRESHOLD * this.gpuLoadMultiplier
            )

        // When the gate reopens after being closed, the next refinement step
        // will ~4× the pixel count.  Pre-emptively drop the iteration batch
        // size to MIN so the combined cost stays manageable.  The batch
        // controller will ramp it back up over the following frames.
        if (gateOpen && this.refinementWasGated) {
            this.iterationBatchSize = MIN_BATCH_SIZE
        }
        this.refinementWasGated = !gateOpen

        const allowRefinement = gateOpen ? 1 : 0

        const brushUniforms = new Float32Array([
            aspect,
            this.previousMandelbrot.angle,
            clearFlag,
            seedStep,
            baseSentinel,
            shiftTexX,
            shiftTexY,
            this.previousMandelbrot.mu,
            gridOffsetX,
            gridOffsetY,
            this.zoomReprojectionActive ? ZOOM_MIN_BRUSH_STEP : 0,
            allowRefinement,
        ])
        this.device.queue.writeBuffer(this.uniformBufferBrush!, 0, brushUniforms.buffer)

        // Write resolve uniforms (mu for budget-exhaustion detection + grid offset)
        const resolveUniforms = new Float32Array([this.previousMandelbrot.mu, gridOffsetX, gridOffsetY])
        this.device.queue.writeBuffer(this.uniformBufferResolve!, 0, resolveUniforms.buffer)

        const shouldDispatchCounter =
            !counterReadbackPending
            && (
                this.unfinishedPixelCount < 0
                || this.activePixelCount < 0
                || frameSerial - this.lastCounterDispatchFrame >= COUNTER_SAMPLE_INTERVAL_FRAMES
            )
        const counterReadbackSlot = shouldDispatchCounter
            ? this.acquireCounterReadbackSlot()
            : undefined
        let scheduledCounterReadback: {
            slot: CounterReadbackSlot,
            sequence: number,
            generation: number,
        } | undefined

        const commandEncoder = this.device.createCommandEncoder()

        // ── Zoom stop: merge resolved + frozen → frozen via MRT ──────────
        // The two textures live in different coordinate spaces (live at liveScale,
        // frozen at frozenScale). The merge shader reprojects both into display
        // space and keeps the finest-resolution pixel (min-step-wins).
        // We copy frozen → rawBrushTexture first so the merge can read it while
        // writing to frozen. rawBrushTexture will be overwritten by the brush pass.
        if (this.needMergeSnapshot
            && this.pipelineMerge && this.bindGroupMerge
            && this.resolvedTexture && this.frozenTexture && this.rawBrushTexture) {
            const texSize = this.neutralSize
            // 1) Copy frozen → rawBrushTexture (temp read-only copy of frozen)
            commandEncoder.copyTextureToTexture(
                { texture: this.frozenTexture },
                { texture: this.rawBrushTexture },
                { width: texSize, height: texSize, depthOrArrayLayers: LAYER_COUNT },
            )
            // 2) Write merge uniforms (captured at zoom stop before state reset)
            const mergeData = new Float32Array([
                this.mergeUniforms.zf,
                this.mergeUniforms.lzf,
                this.mergeUniforms.frozenShiftU,
                this.mergeUniforms.frozenShiftV,
                this.mergeUniforms.aspect,
                this.mergeUniforms.angle,
            ])
            this.device.queue.writeBuffer(this.uniformBufferMerge!, 0, mergeData.buffer)
            // 3) MRT render pass: reads resolved + rawBrushTexture(frozen copy),
            //    writes directly into frozen's 7 layer views.
            const mergeAttachments: GPURenderPassColorAttachment[] =
                this.frozenLayerViews.map(view => ({
                    view,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: 'clear' as GPULoadOp,
                    storeOp: 'store' as GPUStoreOp,
                }))
            const rpassMerge = commandEncoder.beginRenderPass({
                colorAttachments: mergeAttachments,
            })
            rpassMerge.setPipeline(this.pipelineMerge)
            rpassMerge.setBindGroup(0, this.bindGroupMerge)
            rpassMerge.draw(6, 1, 0, 0)
            rpassMerge.end()
            this.needMergeSnapshot = false
            this.frozenAligned = true
        }

        // ── Zoom reprojection: copy resolved → frozen snapshot ────────
        if (this.needFreezeSnapshot && this.resolvedTexture && this.frozenTexture) {
            const layerCount = LAYER_COUNT
            const texSize = this.neutralSize
            commandEncoder.copyTextureToTexture(
                { texture: this.resolvedTexture },
                { texture: this.frozenTexture },
                { width: texSize, height: texSize, depthOrArrayLayers: layerCount },
            )
            this.needFreezeSnapshot = false
            this.frozenAligned = true
            if (!this.zoomReprojectionActive) {
                this.frozenBaseShiftX = 0
                this.frozenBaseShiftY = 0
            }
        }

        // Helper: build 7 MRT color attachments from per-layer views
        const makeMrtAttachments = (
            layerViews: GPUTextureView[],
            loadOp: GPULoadOp = 'clear',
        ): GPURenderPassColorAttachment[] =>
            layerViews.map(view => ({
                view,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp,
                storeOp: 'store' as GPUStoreOp,
            }))

        // Pass 0: brush des sentinelles (A -> B)
        const rpassBrush = commandEncoder.beginRenderPass({
            colorAttachments: makeMrtAttachments(this.rawBrushLayerViews),
        })
        rpassBrush.setPipeline(this.pipelineBrush)
        rpassBrush.setBindGroup(0, this.bindGroupBrush)
        rpassBrush.draw(6, 1, 0, 0)
        rpassBrush.end()

        // Pre-fill A with B so mandelbrot.wgsl can discard pass-through pixels
        // instead of rewriting all 7 MRT layers for inactive pixels.
        commandEncoder.copyTextureToTexture(
            { texture: this.rawBrushTexture },
            { texture: this.rawTexture },
            { width: this.neutralSize, height: this.neutralSize, depthOrArrayLayers: LAYER_COUNT },
        )

        // Pass 1: Mandelbrot (B -> A), writes only active pixels; inactive ones
        // were already copied B -> A above and are discarded by the fragment shader.
        // When globalMaxIter = 0 (no orbit data), the shader acts as a pure
        // pass-through (sentinels stay as-is) — see mandelbrot.wgsl.
        const rpassMandelbrot = commandEncoder.beginRenderPass({
            colorAttachments: makeMrtAttachments(this.rawLayerViews, 'load'),
        })
        rpassMandelbrot.setPipeline(this.pipelineMandelbrot)
        rpassMandelbrot.setBindGroup(0, this.bindGroupMandelbrot)
        rpassMandelbrot.draw(6, 1, 0, 0)
        rpassMandelbrot.end()

        // Pass 1.5: count unfinished pixels (compute pass, reads A)
        if (
            this.pipelineCount
            && this.counterBindGroup
            && this.counterBuffer
            && counterReadbackSlot
            && this.uniformBufferCount
        ) {
            const sequence = ++this.counterReadbackSequence
            const generation = this.counterReadbackGeneration
            // Write count-shader uniforms (mu, aspect, angle)
            const muValue = this.previousMandelbrot.mu
            this.device.queue.writeBuffer(this.uniformBufferCount, 0, new Float32Array([muValue, aspect, this.previousMandelbrot.angle]))
            // Reset atomic counters to 0
            commandEncoder.clearBuffer(this.counterBuffer, 0, 8)
            const computePass = commandEncoder.beginComputePass()
            computePass.setPipeline(this.pipelineCount)
            computePass.setBindGroup(0, this.counterBindGroup)
            computePass.dispatchWorkgroups(
                Math.ceil(this.neutralSize / 16),
                Math.ceil(this.neutralSize / 16),
            )
            computePass.end()
            // Copy results to staging buffer for async readback
            commandEncoder.copyBufferToBuffer(this.counterBuffer, 0, counterReadbackSlot.buffer, 0, 8)
            this.lastCounterDispatchFrame = frameSerial
            scheduledCounterReadback = { slot: counterReadbackSlot, sequence, generation }
        }

        // Pre-fill resolved with A so resolve.wgsl can discard pass-through
        // pixels and only write sentinels / unfinished anchors that need snapping.
        commandEncoder.copyTextureToTexture(
            { texture: this.rawTexture },
            { texture: this.resolvedTexture },
            { width: this.neutralSize, height: this.neutralSize, depthOrArrayLayers: LAYER_COUNT },
        )

        // Pass 2: resolve des sentinelles (A -> resolved)
        const rpassResolve = commandEncoder.beginRenderPass({
            colorAttachments: makeMrtAttachments(this.resolvedLayerViews, 'load'),
        })
        rpassResolve.setPipeline(this.pipelineResolve)
        rpassResolve.setBindGroup(0, this.bindGroupResolve)
        rpassResolve.draw(6, 1, 0, 0)
        rpassResolve.end()

        // Pass 3: colorisation vers écran (resolved -> swapchain)
        const swapView = this.ctx.getCurrentTexture().createView()
        const rpassColor = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: swapView,
                clearValue: { r: 1, g: 1, b: 1, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        })
        rpassColor.setPipeline(this.pipelineColor)
        rpassColor.setBindGroup(0, this.bindGroupColor)
        rpassColor.draw(6, 1, 0, 0)
        rpassColor.end()

        // soumission des commandes
        const submitStartMs = performance.now()
        this.device.queue.submit([commandEncoder.finish()])

        // Delayed GPU timing + counter readback: do not block this frame on GPU completion.
        this.scheduleGpuTiming(submitStartMs)
        if (scheduledCounterReadback) {
            this.scheduleCounterReadback(
                scheduledCounterReadback.slot,
                scheduledCounterReadback.sequence,
                scheduledCounterReadback.generation,
            )
        }

        // Reset the clear flag now that it has been consumed by the GPU passes.
        this.clearHistoryNextFrame = false

        // marque mise à jour des paramètres frame précédente pour prochaine frame
        this.prevFrameMandelbrot = { ...this.previousMandelbrot }

        // Parameters have been consumed — clear the flag so the engine can go idle
        // once all other conditions (orbit, unfinished pixels, etc.) are satisfied.
        this.needRender = false

        // Passe snapshot PNG écran (optionnelle, si demandée)
        if (this.snapshotCallback) {
            try {
                const targetWidth = this.snapshotDestWidth ?? 256;
                const targetHeight = Math.round(targetWidth * 9 / 16);
                // SNAPSHOT dans une texture dédiée
                const snapshotTex = this.device.createTexture({
                  size: [targetWidth, targetHeight, 1],
                  format: this.format,
                  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
                });
                {
                  const encoder = this.device.createCommandEncoder();
                  const renderPass = encoder.beginRenderPass({
                    colorAttachments: [{
                      view: snapshotTex.createView(),
                      clearValue: { r: 0, g: 0, b: 0, a: 1 },
                      loadOp: 'clear',
                      storeOp: 'store',
                    }]
                  });
                  renderPass.setPipeline(this.pipelineColor!);
                  renderPass.setBindGroup(0, this.bindGroupColor!);
                  renderPass.draw(6, 1, 0, 0);
                  renderPass.end();
                  this.device.queue.submit([encoder.finish()]);
                }
                // GPUBuffer aligné
                const align256 = n => ((n + 255) & ~255);
                const rowBytes = targetWidth * 4;
                const bytesPerRow = align256(rowBytes);
                const bufferSize = bytesPerRow * targetHeight;
                const gpuBuffer = this.device.createBuffer({
                  size: bufferSize,
                  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                });
                {
                  const encoder = this.device.createCommandEncoder();
                  encoder.copyTextureToBuffer(
                    { texture: snapshotTex },
                    { buffer: gpuBuffer, offset: 0, bytesPerRow },
                    { width: targetWidth, height: targetHeight, depthOrArrayLayers: 1 }
                  );
                  this.device.queue.submit([encoder.finish()]);
                }
                await this.device.queue.onSubmittedWorkDone();
                await gpuBuffer.mapAsync(GPUMapMode.READ);
                const arrayBuffer = gpuBuffer.getMappedRange();
                // Extraire ligne par ligne, ignorer le padding
                const pixelArray = new Uint8ClampedArray(targetWidth * targetHeight * 4);
                const src = new Uint8Array(arrayBuffer);
                for (let y = 0; y < targetHeight; ++y) {
                  for (let x = 0; x < targetWidth; ++x) {
                    const srcIdx = y * bytesPerRow + x * 4;
                    const dstIdx = (y * targetWidth + x) * 4;
                    // BGRA -> RGBA
                    pixelArray[dstIdx + 0] = src[srcIdx + 2]; // Rouge
                    pixelArray[dstIdx + 1] = src[srcIdx + 1]; // Vert
                    pixelArray[dstIdx + 2] = src[srcIdx + 0]; // Bleu
                    pixelArray[dstIdx + 3] = src[srcIdx + 3]; // Alpha
                  }
                }
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                canvas.getContext('2d')!.putImageData(new ImageData(pixelArray, targetWidth, targetHeight), 0, 0);
                gpuBuffer.unmap();
                this.snapshotCallback(canvas.toDataURL('image/png'));

            } catch {
                this.snapshotCallback('');
            }
            this.snapshotCallback = undefined;
            this.snapshotDestWidth = undefined;
        }
    }

    destroy() {
        this.stopRenderLoop()
        this.postReferenceWorker({ type: 'dispose' })
        this.referenceWorker?.terminate()
        this.referenceWorker = undefined
        this.rawTexture?.destroy?.()
        this.rawBrushTexture?.destroy?.()
        this.resolvedTexture?.destroy?.()
        this.frozenTexture?.destroy?.()
        this.mandelbrotReferenceBuffer?.destroy?.()
        this.mandelbrotBlaBuffer?.destroy?.()
        this.mandelbrotBlaLevelBuffer?.destroy?.()
        this.uniformBufferMandelbrot?.destroy?.()
        this.uniformBufferColor?.destroy?.()
        this.uniformBufferBrush?.destroy?.()
        this.uniformBufferResolve?.destroy?.()
        this.counterBuffer?.destroy?.()
        for (const slot of this.counterReadbackSlots) {
            slot.buffer.destroy?.()
        }
        this.counterReadbackSlots = []
        this.uniformBufferCount?.destroy?.()
        this.uniformBufferMerge?.destroy?.()
        this.webcamTexture?.closeWebcam()
        this.webcamTileTexture?.destroy?.()
        this.paletteTexture?.destroy?.()
    }

    // ── Self-managing render loop ─────────────────────────────────────

    /**
     * Returns true if the engine has work to do (parameter change,
     * unfinished pixels, incomplete orbit, or continuous-render mode).
     */
    needsMoreFrames(): boolean {
        let reason = ''
        if (this.needRender) reason = 'needRender'
        else if (this.snapshotCallback) reason = 'snapshot'
        else if (this.zoomReprojectionActive) reason = 'zoomActive'
        else if (this.clearHistoryNextFrame) reason = 'clearHistory'
        else if (this.needFreezeSnapshot) reason = 'freezeSnapshot'
        else if (this.needMergeSnapshot) reason = 'mergeSnapshot'
        else if (this.isReferenceValidating) reason = 'referenceValidating'
        else if (this.orbitIncomplete) reason = 'orbitIncomplete'
        else if (this.unfinishedPixelCount < 0
            || this.unfinishedPixelCount > UNFINISHED_PIXEL_DONE_THRESHOLD) {
            reason = `unfinished=${this.unfinishedPixelCount}`
        }
        return reason !== ''
    }

    /** Current GPU iteration batch size (auto-adjusted to target ~16ms/frame). */
    getIterationBatchSize(): number {
        return this.iterationBatchSize
    }

    /**
     * Start the self-managing render loop. The provided callback is
     * called every animation frame; the engine's early-exit guards
     * skip GPU work when idle.
     */
    startRenderLoop(drawFn: () => Promise<void>) {
        this._drawFn = drawFn
        if (this._rafId === null) {
            this._rafId = requestAnimationFrame(async () => this._loop())
        }
    }

    /** Stop the render loop and release the callback. */
    stopRenderLoop() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId)
            this._rafId = null
        }
        this._drawFn = null
    }

    private async _loop() {
        if (this._drawFn) {
            const active = this.needsMoreFrames()
            this.isRendering = active

            await this._drawFn()

            // FPS counter: count only frames that did real GPU work
            if (active) {
                this._fpsFrameCount++
            }
            const now = performance.now()
            if (this._fpsLastTime === 0) this._fpsLastTime = now
            const elapsed = now - this._fpsLastTime
            if (elapsed >= 1000) {
                this.fps = Math.round((this._fpsFrameCount * 1000) / elapsed)
                this._fpsFrameCount = 0
                this._fpsLastTime = now
            }

            this._rafId = requestAnimationFrame(async () => this._loop())
        } else {
            this._rafId = null
            return
        }
    }

    /**
     * Replace the tile (tessellation) texture at runtime from a data URL or blob URL.
     * The new texture replaces the current one and the color bind group is rebuilt.
     * Max supported size: 4096×4096.
     */
    async updateTileTexture(url: string, sourceKey = url): Promise<void> {
        if (this.tileTextureSourceKey === sourceKey) return
        const newTexture = await this._loadTexture(url)
        this.tileTexture?.destroy?.()
        this.tileTexture = newTexture
        this.tileTextureView = this.tileTexture.createView()
        this.tileTextureSourceKey = sourceKey
        this.rebuildColorBindGroup()
        this.needRender = true
    }

    isTileTextureSourceCurrent(sourceKey: string): boolean {
        return this.tileTextureSourceKey === sourceKey
    }

    /**
     * Replace the environment/skybox texture at runtime from a data URL or blob URL.
     */
    async updateSkyboxTexture(url: string, sourceKey = url): Promise<void> {
        if (this.skyboxTextureSourceKey === sourceKey) return
        const newTexture = await this._loadTexture(url)
        this.skyboxTexture?.destroy?.()
        this.skyboxTexture = newTexture
        this.skyboxTextureView = this.skyboxTexture.createView()
        this.skyboxTextureSourceKey = sourceKey
        this.rebuildColorBindGroup()
        this.needRender = true
    }

    isSkyboxTextureSourceCurrent(sourceKey: string): boolean {
        return this.skyboxTextureSourceKey === sourceKey
    }

    private rebuildColorBindGroup() {
        if (this.pipelineColor && this.resolvedArrayView && this.frozenArrayView) {
            const layout = this.pipelineColor.getBindGroupLayout(0)
            this.bindGroupColor = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferColor! } },
                    { binding: 1, resource: this.resolvedArrayView! },
                    { binding: 2, resource: this.tileTextureView! },
                    { binding: 3, resource: this.skyboxTextureView! },
                    { binding: 4, resource: this.webcamTextureView! },
                    { binding: 5, resource: this.paletteTextureView! },
                    { binding: 6, resource: this.frozenArrayView! },
                    { binding: 7, resource: this.paletteSampler! },
                    { binding: 8, resource: this.skyboxSampler! },
                ],
                label: 'Engine BindGroup Color',
            })
        }
    }

    // Méthode utilitaire pour charger une image et la convertir en GPUTexture
    private async _loadTexture(url: string): Promise<GPUTexture> {
        const img = new Image()
        img.src = url
        try {
            await img.decode()
        } catch (e) {
            console.warn('Échec du chargement de la texture : ' + url, e)
            throw e
        }
        const bitmap = await createImageBitmap(img)
        const texture = this.device.createTexture({
            size: [bitmap.width, bitmap.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine LoadedTexture ' + url,
        })
        this.device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: texture },
            [bitmap.width, bitmap.height]
        )
        return texture
    }

    // ── Readback d'un pixel d'itération depuis la texture resolved ────
    // Convertit les coordonnées écran (CSS) en coordonnées texture neutre,
    // lit les couches 0 (iter), 2 (zx), 3 (zy), 4/5 (hauteur/angle si échappé, dérivée si reprise)
    // et renvoie les données brutes nécessaires au calcul de la phase palette.

    /** Données d'itération lues depuis le GPU pour un pixel. */
    static readonly ITER_PIXEL_LAYERS = [0, 2, 3, 4, 5] as const

    /**
     * Lit les données d'itération en un point écran (coordonnées CSS, relatives au canvas).
     * Renvoie null si le pixel est hors cadre ou n'a pas de données valides.
     *
     * @param cssX – position X relative au canvas (getBoundingClientRect)
     * @param cssY – position Y relative au canvas (getBoundingClientRect)
     * @param canvasWidth  – largeur CSS du canvas
     * @param canvasHeight – hauteur CSS du canvas
     */
    async readIterationDataAt(
        cssX: number,
        cssY: number,
        canvasWidth: number,
        canvasHeight: number,
    ): Promise<{ iter: number; zx: number; zy: number; derX: number; derY: number } | null> {
        if (!this.resolvedTexture || !this.device) return null

        const aspect = this.width / Math.max(1, this.height)
        const angle = this.previousMandelbrot?.angle ?? 0

        // Écran CSS → UV écran [0,1]
        // Note : en CSS, y=0 est en haut ; dans le shader (clip-space → UV),
        // fragCoord.y=0 est en bas. On inverse donc Y pour correspondre.
        const uvX = cssX / Math.max(1, canvasWidth)
        const uvY = 1 - cssY / Math.max(1, canvasHeight)

        // UV écran → coordonnées locales (même calcul que color.wgsl)
        const xyScreenX = uvX * 2 - 1
        const xyScreenY = uvY * 2 - 1
        const localX = xyScreenX * aspect
        const localY = xyScreenY

        // Rotation par +angle
        const sinA = Math.sin(angle)
        const cosA = Math.cos(angle)
        const localRotX = cosA * localX - sinA * localY
        const localRotY = sinA * localX + cosA * localY

        // Normalisation par l'étendue neutre
        const neutralExtent = Math.sqrt(aspect * aspect + 1)
        const xyNeutralX = localRotX / neutralExtent
        const xyNeutralY = localRotY / neutralExtent

        // UV neutre [0,1]
        const uvNeutralX = xyNeutralX * 0.5 + 0.5
        const uvNeutralY = xyNeutralY * 0.5 + 0.5

        // Coordonnées texel (attention: Y inversé dans le shader — 1-uv.y)
        const texSize = this.neutralSize
        const texelX = Math.floor(Math.max(0, Math.min(texSize - 1, uvNeutralX * texSize)))
        const texelY = Math.floor(Math.max(0, Math.min(texSize - 1, (1 - uvNeutralY) * texSize)))

        // Lecture GPU: copier les 5 couches nécessaires (1 texel chacune) dans un buffer
        const layerIndices = Engine.ITER_PIXEL_LAYERS
        const floatsPerLayer = 1
        const bytesPerFloat = 4
        const align256 = (n: number) => ((n + 255) & ~255)
        const bytesPerRow = align256(floatsPerLayer * bytesPerFloat) // 256 minimum pour WebGPU
        const totalBytes = bytesPerRow * layerIndices.length

        const readBuffer = this.device.createBuffer({
            size: totalBytes,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: 'Engine IterPixel Readback',
        })

        const encoder = this.device.createCommandEncoder()
        for (let i = 0; i < layerIndices.length; i++) {
            encoder.copyTextureToBuffer(
                {
                    texture: this.resolvedTexture,
                    origin: { x: texelX, y: texelY, z: layerIndices[i] },
                },
                {
                    buffer: readBuffer,
                    offset: bytesPerRow * i,
                    bytesPerRow,
                },
                { width: 1, height: 1, depthOrArrayLayers: 1 },
            )
        }
        this.device.queue.submit([encoder.finish()])

        await readBuffer.mapAsync(GPUMapMode.READ)
        const mapped = new Float32Array(readBuffer.getMappedRange())
        // Extraire les valeurs depuis chaque couche (séparées par bytesPerRow/4 floats)
        const stride = bytesPerRow / bytesPerFloat
        const iter = mapped[0 * stride]
        const zx   = mapped[1 * stride]
        const zy   = mapped[2 * stride]
        const derX = mapped[3 * stride]
        const derY = mapped[4 * stride]
        readBuffer.unmap()
        readBuffer.destroy()

        // Pixel sentinelle ou non calculé
        if (iter < 0) return null

        return { iter, zx, zy, derX, derY }
    }

    // Met à jour la texture GPU à partir de la webcam (à appeler à chaque frame si webcamEnabled)
    async updateWebcamTexture() {
        try {
            await this.webcamTexture?.openWebcam()
            if (this.webcamTexture?.isOpen()) {
                await this.webcamTexture?.drawWebGPUTexture(this.webcamTileTexture!, this.device)
            }
        } catch (e) {
            console.warn('Webcam texture update failed:', e)
        }
    }

    // Capture l'image de l'écran final sous PNG 16:9 à la largeur demandée
    async getSnapshotPng(destWidth: number = 256): Promise<string> {
        return await new Promise<string>(resolve => {
            this.snapshotCallback = resolve;
            this.snapshotDestWidth = destWidth;
            this.needRender = true;
        });
    }

}
