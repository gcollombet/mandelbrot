// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import mandelbrotShader from './assets/mandelbrot.wgsl?raw'
import inplaceComputeShader from './assets/mandelbrot_brush.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import brushShader from './assets/reproject.wgsl?raw'
import resolveShader from './assets/resolve.wgsl?raw'
import countShader from './assets/count_unfinished.wgsl?raw'
import mergeFrozenShader from './assets/merge_frozen.wgsl?raw'
import presentShader from './assets/present.wgsl?raw'
import aaTargetShader from './assets/aa_target.wgsl?raw'
import aaReseedShader from './assets/aa_reseed.wgsl?raw'
import {MandelbrotNavigator} from 'mandelbrot'
import {WebcamTexture} from './WebcamTexture'
import {Palette} from './Palette.ts'
import {DEEP_EXP_THRESHOLD, frexpFloat32, frexpFromDecimalString} from './floatexp'
import type {ZoomState} from './zoomState'
import {
    getFrozenScale,
    getLiveScale,
    getReferenceResetDuringZoom,
    isZoomActive,
    reduceZoomState,
    resetZoomState
} from './zoomState'
import type {ColorStop} from './ColorStop.ts'
import type {InterpolationMode} from './Mandelbrot.ts'
import {normalizePowerOfTwoStep, computeAaJitterOffset} from './Mandelbrot.ts'
import {
    normalizeTextureMappingConfig,
    textureMappingVariableId,
    type TextureMappingConfig
} from './TextureMapping.ts'
import {
    normalizeAnimationConfig,
    type AnimationConfig,
    type AnimationTrackConfig,
} from './AnimationConfig.ts'
// ── Constants ────────────────────────────────────────────────────────

// Number of r32float layers per texture array.
const LAYER_COUNT = 8

// Adaptive iteration batch sizing — the batch auto-adjusts each frame
// to target TARGET_FRAME_MS of GPU time.
const MIN_BATCH_SIZE = 100
// Per-dispatch budget, in loop TURNS (work units): one BLA/Padé block-apply or one
// exact step each count as 1, so the cap bounds GPU work per frame uniformly across
// modes. (Was a covered-iteration cap with a 10× BLA fudge — that throttled long
// blocks in smooth regions; turn-budgeting lets them run, capped only by frame time.)
const MAX_BATCH_SIZE = 10_000
// Validity radii scale linearly with this epsilon; 1e-4 keeps the error well
// below a pixel while letting high-skip BLA levels accept far more often than
// the previous 1e-6 (which made BLA slower than plain perturbation).
const BLA_LINEARIZATION_EPSILON = 1e-3
// Floats per floatexp BlaStep uploaded to the GPU. Matches the Rust `BlaStep`
// (#[repr(C)] of 11 × 4-byte fields): ax,ay,bx,by,ab_exp,radius_alpha,alpha_exp,
// radius_beta + the Padé D coefficient dx,dy,d_exp.
const BLA_STEP_FLOATS = 12
// Reference orbit is accumulated to HEADROOM× the display maxIter (headroom for interactive
// zoom-in, avoids a transient black frame). Capped at the GPU reference buffer's step
// capacity (the 8·CAPACITY-byte mandelbrotReferenceBuffer below). Mirrors referenceWorker.ts.
const REFERENCE_ITER_HEADROOM = 2
const ORBIT_STEP_CAPACITY = 1_000_000
const COLOR_UNIFORM_FLOAT_COUNT = 60
const TAU = Math.PI * 2

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
        maxBlaSkip: number
        maxIterations: number
        precisionBudget: string
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
    | {
        type: 'setMaxBlaSkip'
        jobId: number
        maxBlaSkip: number
    }
    | {
        type: 'benchmarkPade'
        jobId: number
        grid: number
    }
    | {
        type: 'findMinibrot'
        jobId: number
        maxIter: number
        radiusFactor: number
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
    | {
        type: 'padeBenchmark'
        jobId: number
        result: PadeBenchmarkResult
    }
    | {
        type: 'minibrotFound'
        jobId: number
        status: 'ok' | 'none' | 'nonewton'
        cx: string | null
        cy: string | null
        period: number | null
    }
    | {
        type: 'ready'
    }

export type PadeBenchmarkResult = {
    pixels: number
    maxIter: number
    stepsExact: number
    stepsAffine: number
    stepsPade: number
    mismatches: number
    maxIterDelta: number
}

export type MinibrotResult = {
    /** 'ok' = nucleus found; 'none' = no atom under the view; 'nonewton' = period found but Newton did not converge. */
    status: 'ok' | 'none' | 'nonewton'
    cx: string | null
    cy: string | null
    period: number | null
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

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

function animationWave(track: AnimationTrackConfig, time: number, globalSpeed: number): number {
    const phase = track.phase ?? 0
    const cycles = time * track.speed * globalSpeed + phase
    switch (track.type) {
        case 'loop':
            return cycles - Math.floor(cycles)
        case 'pulse':
            return 0.5 + 0.5 * Math.sin(cycles * TAU)
        case 'stepped': {
            const stepCount = 8
            const stepped = Math.floor((cycles - Math.floor(cycles)) * stepCount) / Math.max(1, stepCount - 1)
            return stepped * 2 - 1
        }
        case 'sine':
        default:
            return Math.sin(cycles * TAU)
    }
}

function animationContribution(track: AnimationTrackConfig, time: number, globalSpeed: number): number {
    if (!track.enabled) return 0
    return animationWave(track, time, globalSpeed) * track.amplitude
}

function shiftedAnimationContribution(track: AnimationTrackConfig, time: number, globalSpeed: number, phaseShift: number): number {
    return animationContribution({...track, phase: (track.phase ?? 0) + phaseShift}, time, globalSpeed)
}

export type RenderOptions = {
    antialiasLevel: number,
    aaAuto?: boolean,
    palettePeriod: number,
    paletteOffset: number,
    heightPaletteShift: number,
    paletteMirror: boolean,
    colorStops: ColorStop[],
    interpolationMode: InterpolationMode,
    activateAnimate: boolean,
    debugShading: boolean,
    tessellationLevel: number,
    displacementAmount: number,
    animation: AnimationConfig,
    animationSpeed: number,
    ambientOcclusionStrength: number,
    microBumpStrength: number,
    subsurfaceStrength: number,
    reliefDepth: number,
    localShadowStrength: number,
    lightAngle: number,
    varnishStrength: number,
    orbitTrapStrength: number,
    phaseColoringStrength: number,
    stripeFrequency: number,
    zoomMinBrushStep: number,
    sentinelSeedStep: number,
    textureMapping: TextureMappingConfig,
    textureMappingMode?: number,
}

export type ApproximationMode = 'perturbation' | 'bla' | 'pade'

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
    // Full-precision decimal strings of dx/dy/scale, when available. The deep
    // (floatexp) path decomposes from these to avoid the f64 underflow floor
    // (~1e-308); falls back to the numeric fields when absent (e.g. mid-zoom).
    dxStr?: string,
    dyStr?: string,
    scaleStr?: string,
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

    // ── AA accumulation/present resources ─────────────────────────────
    /** Color pipeline writing linear RGB into accumTexture, replacing (sample 0). */
    private pipelineColorAccumClear?: GPURenderPipeline
    /** Color pipeline additively blending linear RGB + alpha into accumTexture (sample >= 1). */
    private pipelineColorAccum?: GPURenderPipeline
    /** Present pipeline: accumTexture (linear sum / count) → swapchain (sRGB). */
    private pipelinePresent?: GPURenderPipeline
    private bindGroupPresent?: GPUBindGroup
    /** rgba16float accumulation texture (linear RGB sum in .rgb, sample count in .a). */
    private accumTexture?: GPUTexture
    private accumTextureView?: GPUTextureView
    /** Per-neutral-texel AA target sample count (r32float), baked once from the DE after sample 0. */
    private aaTargetTexture?: GPUTexture
    private aaTargetTextureView?: GPUTextureView
    /** Compute pipeline that bakes aaTargetTexture from the converged neutral texture. */
    private pipelineAaTarget?: GPUComputePipeline
    private bindGroupAaTarget?: GPUBindGroup
    private uniformBufferAaTarget?: GPUBuffer
    /** Stage B selective reseed: stamps iter=-1 on the boundary sliver between samples. */
    private pipelineAaReseed?: GPUComputePipeline
    private bindGroupAaReseed?: GPUBindGroup
    /** When true, AA reconverges only the boundary sliver (Stage B); false falls back
     *  to a full reconverge per sample (Stage A). Auto-disabled if grid step != 1. */
    useAaSelectiveReseed = true

    // In-place compute path: fused brush+mandelbrot+count working directly on
    // rawTexture (A) for frames without translation/clearHistory.  Replaces the
    // brush render pass, the B→A copy, the mandelbrot render pass and the count
    // pass with a single compute dispatch whose writes are proportional to the
    // number of active pixels.
    /** Runtime toggle: when false, every frame uses the render ping-pong path. */
    useInplaceCompute = true
    private pipelineInplace?: GPUComputePipeline
    private bindGroupInplace?: GPUBindGroup
    /** Alternative color bind group reading rawTexture (A) instead of resolved,
     *  used when the resolve pass is skipped (image fully converged). */
    private bindGroupColorRaw?: GPUBindGroup
    /** True when the last rendered frame skipped copy A→resolved + resolve. */
    private resolveSkipped = false
    /** frameSerial of the last frame that may have mutated rawTexture (A). */
    private lastRawMutationFrame = 0
    /** frameSerial at which the last applied counter readback was sampled. */
    private counterSampleFrame = -1

    // GPU pixel counter (replaces blanket extraFrames = 1000)
    private pipelineCount?: GPUComputePipeline
    private counterBuffer?: GPUBuffer
    private workStatsBuffer?: GPUBuffer
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

    // ── Work instrumentation (in-place compute path), latest sampled dispatch ──
    /** covered iterations ÷ real loop steps — the true on-GPU BLA/Padé compression
     *  (≈1 in perturbation mode; >1 with blocks). -1 = not yet known. */
    realizedSkip = -1
    /** workgroup lane-time ÷ useful work — divergence/straggler waste within a
     *  16×16 tile (1 = balanced; high = a few pixels stall the workgroup). */
    workgroupWaste = -1
    /** worst single-texel real loop steps in the sampled dispatch. */
    maxPixelSteps = -1
    /** approximate total real loop steps for the render (realMean × 256). */
    realLoopStepsApprox = -1
    // workStatsBuffer accumulates on the GPU across EVERY dispatch of a render
    // generation (cleared once, here-tracked, not per dispatch), so the totals are
    // exact and deterministic — independent of which frames the CPU happens to
    // sample. -1 ⇒ not yet cleared for the current generation.
    private workStatsClearedGeneration = -1

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
    /** Wall-clock time of the last frame actually stepped + rendered. */
    private _lastDrawMs = 0

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
    private approximationMode: ApproximationMode = 'perturbation'
    private blaEpsilon = BLA_LINEARIZATION_EPSILON
    private maxBlaSkip = 65536
    // Fixed precision budget as a target scale (max zoom depth navigation stays precise at).
    // Default 1e-30 keeps shallow use fast; the Settings slider can deepen it to 1e-1000.
    // Changing it forces a full reference recompute. See fix-reference-precision-budget.
    private precisionBudget = '1e-30'
    private pendingBenchmarkResolve: ((r: PadeBenchmarkResult) => void) | null = null
    private pendingMinibrotResolve: ((r: MinibrotResult) => void) | null = null
    // Time-to-completion of the last render session (ms). Wall includes everything;
    // GPU is the accumulated mandelbrot-pass compute (the part blocks reduce).
    lastCompletionWallMs = 0
    lastCompletionGpuMs = 0
    // Diagnostic: the mode flag (0/1/2) and block-level count last sent to the shader.
    lastShaderApproxFlag = 0
    lastShaderBlaLevelCount = 0
    private completionStartMs = 0
    private completionAccumulatedGpuMs = 0
    private completionTimerActive = false
    private referenceWorker?: Worker
    private referenceJobId = 0
    private referenceAvailableOrbitLen = 0
    private referenceBlaReadyMaxIterations = 0
    private referenceWorkerFailed = false
    private referenceWorkerReady = false
    private pendingWorkerMessages: ReferenceWorkerRequest[] = []
    private referenceViewKey = ''
    referenceWorkerCx = ''
    referenceWorkerCy = ''
    floatExpActive = false
    debugShadingActive = false
    private referenceOrbitWasReset = false

    // ── Deferred reference switch state ─────────────────────────────
    /** True when a new reference is being accumulated (worker re-anchored, waiting for enough orbit). */
    pendingRefActive = false
    /** Reference origin of the pending (accumulated) reference. */
    private pendingRefCx = ''
    private pendingRefCy = ''
    /** Accumulated orbit data for the pending reference (Float32Array, 2 floats per step: zx, zy). */
    private pendingRefOrbitBuffer: Float32Array<ArrayBuffer> | null = null
    /** Total step count accumulated. */
    pendingRefOrbitLen = 0
    /** Max iterations at the time the accumulation started. */
    pendingRefMaxIterations = 0
    /** Accumulated BLA data for the pending reference (null if not yet received or in perturbation mode). */
    private pendingRefBlaSteps: Float32Array<ArrayBuffer> | null = null
    private pendingRefBlaLevels: Uint32Array<ArrayBuffer> | null = null
    private pendingRefBlaLevelCount = 0
    private pendingRefBlaReadyMaxIterations = 0
    /** Pending reference has enough orbit data and must be applied during update(), not in worker callback. */
    private pendingRefReady = false
    /** Skip the render immediately after applying a pending reference; update() used old dx/dy for that call. */
    private skipRenderOnce = false

    prevFrameMandelbrot?: Mandelbrot // paramètres de la dernière frame rendue (pour gestion d'historique)

    // flag pour indiquer si l'historique doit être effacé au prochain rendu
    clearHistoryNextFrame = false
    // true when the previous rendered frame had a scale change (used to detect small-zoom stop)
    _prevFrameScaleChanged = false

    // ── Idle-time antialiasing (AA) accumulation state ────────────────
    /** True while AA accumulation is running (explicitly triggered, idle only). */
    aaActive = false
    /** Index of the current AA sample (0 = unjittered base sample). */
    aaSampleIndex = 0
    /** How many samples have been composited into the accumulator so far. */
    aaAccumulatedSamples = 0
    /** Current sub-pixel jitter offset (neutral-space units), written to uniforms 18/19. */
    aaOffsetX = 0
    aaOffsetY = 0
    /** True for the first frame of a new AA sample (drives the selective reseed). */
    aaReseedPending = false
    /** When true, AA accumulation auto-starts as soon as the view is fully converged. */
    aaAuto = false

    // Cumulative texel shift since last clearHistory – used to keep the
    // sentinel grid aligned after translation reprojection (Option B).
    cumulativeShiftX = 0
    cumulativeShiftY = 0

    // ── Zoom reprojection state machine ───────────────────────────────
    /** Configurable magnification threshold before swapping (default ×2). */
    zoomMagnificationThreshold = 16.0
    private zoomState: ZoomState = { kind: 'idle' }
    /** Set to true when we need to GPU-copy resolved → frozen at the start of next render. */
    private needFreezeSnapshot = false
    /** Set to true when we need to run the merge pass (resolved+frozen→frozen) at zoom stop. */
    private needMergeSnapshot = false
    /** Saved merge uniform values captured at zoom stop (before state is reset). */
    private mergeUniforms = { zf: 1.0, lzf: 1.0, frozenShiftU: 0, frozenShiftV: 0, aspect: 1.0, angle: 0 }
    /** Initial live-texel offset between a frozen snapshot and the display when zoom starts. */
    private frozenBaseShiftX = 0
    private frozenBaseShiftY = 0
    /** Rounded live-texel pan accumulated since the current frozen snapshot. Unlike cumulativeShift, it survives clears. */
    private frozenPanShiftX = 0
    private frozenPanShiftY = 0
    /** True when the frozen texture is spatially aligned with the live texture.
     *  Set to true after a freeze snapshot or merge pass. Set to false on translation. */
    private frozenAligned = false

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
        if (message.type === 'dispose') {
            this.referenceWorker.postMessage(message)
            return true
        }
        if (!this.referenceWorkerReady) {
            this.pendingWorkerMessages.push(message)
            return true
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

    /** Discard any pending deferred reference accumulation. */
    private discardPendingReference() {
        if (!this.pendingRefActive) return
        this.pendingRefActive = false
        this.pendingRefCx = ''
        this.pendingRefCy = ''
        this.pendingRefOrbitBuffer = null
        this.pendingRefOrbitLen = 0
        this.pendingRefMaxIterations = 0
        this.pendingRefBlaSteps = null
        this.pendingRefBlaLevels = null
        this.pendingRefBlaLevelCount = 0
        this.pendingRefBlaReadyMaxIterations = 0
        this.pendingRefReady = false
    }

    /**
     * Mark a fully-accumulated pending reference as ready.
     * The actual switch must happen in update(), never in a worker callback,
     * otherwise render() can see new GPU reference data with old uniforms.
     */
    private markPendingReferenceReady() {
        if (!this.pendingRefActive) return
        this.pendingRefReady = true
        this.isReferenceValidating = false
        this.needRender = true
    }

    /**
     * Apply a fully-accumulated pending reference: write orbit/BLA data to GPU,
     * update reference state, and flag orbitWasReset so the following update() clears
     * history. Keep the frozen texture in its current visual space until live
     * pixels are recomputed; do not apply an imprecise ref-origin delta.
     */
    private applyPendingReferenceSwitch() {
        if (!this.pendingRefActive || !this.pendingRefReady) return

        // Write accumulated orbit data to GPU buffer
        const orbitBuffer = this.pendingRefOrbitBuffer
        if (orbitBuffer && this.mandelbrotReferenceBuffer) {
            const floatCount = this.pendingRefOrbitLen * 2
            const writeSize = Math.min(floatCount, orbitBuffer.length)
            this.device.queue.writeBuffer(
                this.mandelbrotReferenceBuffer,
                0,
                orbitBuffer,
                0,
                writeSize,
            )
        }

        // Write accumulated BLA data to GPU buffers (grow the buffer first so a
        // large pending table can't overflow it — BLA_STEP_FLOATS per BlaStep).
        if (this.pendingRefBlaSteps && this.pendingRefBlaSteps.length > 0) {
            this.ensureBlaBufferCapacity(this.pendingRefBlaSteps.length / BLA_STEP_FLOATS)
        }
        if (this.pendingRefBlaSteps && this.mandelbrotBlaBuffer) {
            this.device.queue.writeBuffer(
                this.mandelbrotBlaBuffer, 0,
                this.pendingRefBlaSteps, 0,
                this.pendingRefBlaSteps.length,
            )
        }
        if (this.pendingRefBlaLevels && this.mandelbrotBlaLevelBuffer) {
            this.device.queue.writeBuffer(
                this.mandelbrotBlaLevelBuffer, 0,
                this.pendingRefBlaLevels, 0,
                this.pendingRefBlaLevels.length,
            )
        }
        if (this.pendingRefBlaLevelCount > 0) {
            this.currentBlaLevelCount = this.pendingRefBlaLevelCount
            this.referenceBlaReadyMaxIterations = this.pendingRefBlaReadyMaxIterations
        }

        // Switch the main-thread reference state
        this.referenceWorkerCx = this.pendingRefCx
        this.referenceWorkerCy = this.pendingRefCy
        this.mandelbrotNavigator.reference_origin(this.pendingRefCx, this.pendingRefCy)

        // Set orbit length directly — NOT via markReferenceReset (which would zero it).
        // This lets the next frame use the accumulated orbit immediately.
        this.referenceAvailableOrbitLen = this.pendingRefOrbitLen
        const availableIter = Math.max(0, this.pendingRefOrbitLen - 1)
        this.currentReferenceAvailableIter = availableIter
        this.currentReferenceRemainingIter = Math.max(0, this.currentMaxIterations - availableIter)
        this.currentGuardedMaxIter = Math.min(this.currentMaxIterations, availableIter)
        this.isReferenceValidating = false
        this.orbitIncomplete = !this.referenceWorkerFailed && availableIter < this.currentMaxIterations

        // Flag the visual system for a reset (consumed by the next full update())
        this.referenceResetSerial++
        this.referenceResetFlashUntil = performance.now() + 900
        this.referenceOrbitWasReset = true
        this.invalidateCounterReadback()
        this.needRender = true

        // This update() call received dx/dy from before reference_origin().
        // Do not render with mixed old uniforms and new reference buffers.
        this.skipRenderOnce = true

        // Discard pending state (now live)
        this.discardPendingReference()
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
        this.referenceWorkerReady = false
        this.pendingWorkerMessages = []
        this.referenceAvailableOrbitLen = 0
        this.referenceBlaReadyMaxIterations = 0
        this.referenceJobId++
    }

    /**
     * Force a fresh reference orbit at the next update(), re-anchored at the new
     * view centre. Use for discontinuous teleports (preset load, manual coordinate
     * entry). The incremental updateView path keeps the old, now far-away reference
     * until the worker finishes recomputing and the pending-switch fires; meanwhile
     * dx/dy is huge and the snapped centre is corrupted through f64, so the deep
     * path renders garbage until a manual page reload. Re-anchoring the shared front
     * navigator now (dx/dy ≈ 0 immediately) and clearing the view key — so the next
     * update() runs resetReferenceJob (a clean worker reset at the new centre) instead
     * of updateView — reproduces the known-good reload behaviour without the reload.
     */
    resetReference(cx: string, cy: string) {
        console.log('[REF] Engine.resetReference', cx.slice(0, 14), '| prevKey?', this.referenceViewKey ? 'set' : 'empty')
        if (this.mandelbrotNavigator) {
            this.mandelbrotNavigator.reference_origin(cx, cy)
        }
        this.discardPendingReference()
        this.referenceViewKey = ''
        this.needRender = true
    }

    private resetReferenceJob(mandelbrot: Mandelbrot, scale: number, maxIterations: number) {
        console.log('[REF] resetReferenceJob -> worker reset', mandelbrot.cx.slice(0, 14), 'scale', scale, 'maxIter', maxIterations)
        this.discardPendingReference()
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
            maxBlaSkip: this.maxBlaSkip,
            maxIterations,
            precisionBudget: this.precisionBudget,
        })
    }

    private syncReferenceWorkerView(mandelbrot: Mandelbrot, scale: number, maxIterations: number) {
        const scaleString = scale.toString()
        const nextKey = `${mandelbrot.cx}\n${mandelbrot.cy}\n${scaleString}\n${mandelbrot.angle}\n${maxIterations}`
        if (nextKey === this.referenceViewKey) {
            return
        }
        console.log('[REF] syncReferenceWorkerView -> updateView', mandelbrot.cx.slice(0, 14), 'scale', scaleString, 'dx', mandelbrot.dx, 'dxStr', mandelbrot.dxStr)
        this.discardPendingReference()
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
        if (message.type === 'padeBenchmark') {
            const resolve = this.pendingBenchmarkResolve
            this.pendingBenchmarkResolve = null
            resolve?.(message.result)
            return
        }
        if (message.type === 'minibrotFound') {
            const resolve = this.pendingMinibrotResolve
            this.pendingMinibrotResolve = null
            resolve?.({
                status: message.status,
                cx: message.cx,
                cy: message.cy,
                period: message.period,
            })
            return
        }
        if (message.type === 'ready') {
            this.referenceWorkerReady = true
            const queue = this.pendingWorkerMessages
            this.pendingWorkerMessages = []
            for (const msg of queue) {
                this.referenceWorker?.postMessage(msg)
            }
            return
        }

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
            // ── Deferred switch: start accumulating a new reference ──
            // Instead of switching immediately (which triggers clearHistory,
            // frozen misalignment, etc.), we wait until enough orbit data
            // has been computed for this new reference.
            if (this.pendingRefActive) {
                if (message.referenceCx === this.pendingRefCx && message.referenceCy === this.pendingRefCy) {
                    return // duplicate, already accumulating this reference
                }
                // Different reference — old accumulation is stale, restart
                this.discardPendingReference()
            }
            this.pendingRefActive = true
            this.pendingRefCx = message.referenceCx
            this.pendingRefCy = message.referenceCy
            this.pendingRefMaxIterations = message.maxIterations
            // Allocate orbit buffer for accumulation (2 floats per step: zx, zy)
            const bufLen = Math.min(
                Math.max(message.maxIterations, this.currentMaxIterations) * REFERENCE_ITER_HEADROOM,
                ORBIT_STEP_CAPACITY,
            ) * 2
            this.pendingRefOrbitBuffer = new Float32Array(bufLen)
            this.pendingRefOrbitLen = 0
            this.pendingRefBlaSteps = null
            this.pendingRefBlaLevels = null
            this.pendingRefBlaLevelCount = 0
            this.pendingRefBlaReadyMaxIterations = 0
            return
        }

        if (message.type === 'orbitChunk') {
            const wasPendingAccumulation = this.pendingRefActive
                && message.referenceCx === this.pendingRefCx
                && message.referenceCy === this.pendingRefCy

            if (wasPendingAccumulation) {
                // ── Accumulate orbit for the pending reference ──
                const orbitBuf = this.pendingRefOrbitBuffer
                if (orbitBuf && message.orbit.length > 0) {
                    const floatOffset = message.offset * 2
                    const copyLen = Math.min(message.orbit.length, orbitBuf.length - floatOffset)
                    if (copyLen > 0) {
                        // Convert to plain ArrayBuffer via slice() (worker messages carry ArrayBufferLike)
                        orbitBuf.set(message.orbit.slice(0, copyLen), floatOffset)
                    }
                }
                this.pendingRefOrbitLen = message.count

                // Check if orbit is sufficient to switch
                const targetLen = Math.min(this.pendingRefMaxIterations, this.currentMaxIterations)
                if (this.pendingRefOrbitLen >= targetLen) {
                    this.markPendingReferenceReady()
                }
            } else if (message.referenceCx !== this.referenceWorkerCx || message.referenceCy !== this.referenceWorkerCy) {
                // ── Unknown reference (not pending, not current) → start new accumulation ──
                if (this.pendingRefActive) {
                    this.discardPendingReference()
                }
                this.pendingRefActive = true
                this.pendingRefCx = message.referenceCx
                this.pendingRefCy = message.referenceCy
                this.pendingRefMaxIterations = message.maxIterations
                const bufLen = Math.min(
                Math.max(message.maxIterations, this.currentMaxIterations) * REFERENCE_ITER_HEADROOM,
                ORBIT_STEP_CAPACITY,
            ) * 2
                this.pendingRefOrbitBuffer = new Float32Array(bufLen)
                this.pendingRefOrbitLen = 0
                this.pendingRefBlaSteps = null
                this.pendingRefBlaLevels = null
                this.pendingRefBlaLevelCount = 0
                this.pendingRefBlaReadyMaxIterations = 0
                // Accumulate this first chunk
                const orbitBuf = this.pendingRefOrbitBuffer
                if (orbitBuf && message.orbit.length > 0) {
                    const floatOffset = message.offset * 2
                    const copyLen = Math.min(message.orbit.length, orbitBuf.length - floatOffset)
                    if (copyLen > 0) {
                        orbitBuf.set(message.orbit.slice(0, copyLen), floatOffset)
                    }
                }
                this.pendingRefOrbitLen = message.count
                const targetLen = Math.min(this.pendingRefMaxIterations, this.currentMaxIterations)
                if (this.pendingRefOrbitLen >= targetLen) {
                    this.markPendingReferenceReady()
                }
                // This chunk was accumulated into pending — skip the GPU write below
                // by making the accumulator flag true (it was false at check time above).
                // We do this by jumping to the end of the handler.
                this.isReferenceValidating = false
                this.needRender = true
                return
            } else if (message.offset === 0 && this.referenceAvailableOrbitLen > 0) {
                // ── Orbit restart for the CURRENT reference (should be rare) ──
                this.markReferenceReset()
                this.referenceOrbitWasReset = true
                this.currentBlaLevelCount = 0
                this.referenceBlaReadyMaxIterations = 0
                this.invalidateCounterReadback()
                // Write GPU data normally below
            } else {
                // ── Normal orbit chunk for the current (active) reference ──
            }

            // ── GPU write + state update for the CURRENT reference ──
            // If this chunk was accumulated into a pending reference, skip the GPU write.
            // The ready reference will be applied at update() boundary.
            if (wasPendingAccumulation) {
                // Accumulated into pending, skip GPU write (flush already wrote it or will).
            } else if (message.orbit.length > 0 && this.mandelbrotReferenceBuffer) {
                this.referenceAvailableOrbitLen = message.count
                this.device.queue.writeBuffer(
                    this.mandelbrotReferenceBuffer,
                    message.offset * 2 * Float32Array.BYTES_PER_ELEMENT,
                    message.orbit,
                    0,
                    message.orbit.length,
                )
            } else {
                this.referenceAvailableOrbitLen = message.count
            }

            const availableIter = Math.max(0, this.referenceAvailableOrbitLen - 1)
            this.currentReferenceAvailableIter = availableIter
            this.currentReferenceRemainingIter = Math.max(0, this.currentMaxIterations - availableIter)
            this.isReferenceValidating = false
            this.currentGuardedMaxIter = Math.min(this.currentMaxIterations, availableIter)
            const wasOrbitIncomplete = this.orbitIncomplete
            this.orbitIncomplete = !this.referenceWorkerFailed && availableIter < this.currentMaxIterations
            // Only re-render while the VISIBLE portion (≤ maxIter) is still being built, plus the
            // frame it completes. Headroom chunks beyond maxIter (the 2× lookahead for zoom-in)
            // don't change what the shader draws — guardedMaxIter is capped — so forcing a render
            // for each of them re-runs the full pass for nothing (a massive framerate drop).
            if (this.orbitIncomplete || wasOrbitIncomplete) {
                this.needRender = true
            }
            return
        }

        // ── blaReady ──
        // If a pending reference is waiting for BLA, accumulate it.
        // Otherwise, write to GPU normally.
        if (this.pendingRefActive) {
            // Copy into plain ArrayBuffer-backed arrays (worker messages carry ArrayBufferLike)
            this.pendingRefBlaSteps = new Float32Array(message.steps)
            this.pendingRefBlaLevels = new Uint32Array(message.levels)
            this.pendingRefBlaLevelCount = message.levelCount
            this.pendingRefBlaReadyMaxIterations = message.maxIterations
            const targetLen = Math.min(this.pendingRefMaxIterations, this.currentMaxIterations)
            if (this.pendingRefOrbitLen >= targetLen) {
                this.markPendingReferenceReady()
            }
            return
        }
        this.ensureBlaBufferCapacity(message.steps.length / BLA_STEP_FLOATS)
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
        // BLA is a pure acceleration of the same perturbation result, so do not
        // clear history when it arrives: already-computed pixels stay valid and
        // continuations simply start using BLA. Clearing here caused a visible
        // render cut (black screen) each time the BLA table was delivered.
        this.needRender = true
        this.invalidateCounterReadback()
    }

    async initialize(mandelbrotNavigator: MandelbrotNavigator): Promise<void> {
        this.mandelbrotNavigator = mandelbrotNavigator
        // Keep the shared front navigator (coordinate math, minibrot search) at the budget
        // precision too, so its state matches the worker's reference.
        this.mandelbrotNavigator.set_precision_budget(this.precisionBudget)
        this.approximationMode = (this.mandelbrotNavigator.get_approximation_mode() === 2 ? 'pade' : this.mandelbrotNavigator.get_approximation_mode() === 1 ? 'bla' : 'perturbation')
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
        // Initialisation synchrone des textures factices 1x1 (tile + skybox)
        this.tileTexture = this.device.createTexture({
            size: [1, 1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine TileTexture 1x1 Placeholder',
        })
        this.tileTextureView = this.tileTexture.createView()

        this.skyboxTexture = this.device.createTexture({
            size: [1, 1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine SkyboxTexture 1x1 Placeholder',
        })
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
            size: 4 * COLOR_UNIFORM_FLOAT_COUNT,
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
            size: 8 * ORBIT_STEP_CAPACITY, // CAPACITY steps × 2 floats (zx, zy) × 4 bytes; shader reads only zx/zy
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Orbit ReferenceStorage Buffer',
        })
        this.mandelbrotBlaBuffer = this.device.createBuffer({
            size: 4 * BLA_STEP_FLOATS, // one floatexp BlaStep = BLA_STEP_FLOATS × 4 bytes
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
        // Work-instrumentation buffer (in-place compute path): 4 × u32
        // (realMean, covMean, maxAccum, maxSteps) — see WorkStats in the shader.
        this.workStatsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'Engine WorkStats Storage',
        })
        // Readback slots hold counter (8 B) + workStats (16 B) = 24 B, copied
        // together each sampled in-place dispatch and read as 6 × u32.
        this.counterReadbackSlots = Array.from({ length: COUNTER_READBACK_BUFFER_COUNT }, (_, index) => ({
            buffer: this.device.createBuffer({
                size: 24,
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
                { binding: 9, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d' } },
            ],
            label: 'Engine BindGroupLayout Color',
        })

        // 8 MRT targets for the layered r32float texture array (LAYER_COUNT)
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

        // Direct path: sRGB straight to the swapchain (fs_main_direct), byte-identical
        // to the historical behaviour. Used when AA is inactive and for PNG export.
        this.pipelineColor = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutColor] }),
            vertex: { module: moduleColor, entryPoint: 'vs_main' },
            fragment: { module: moduleColor, entryPoint: 'fs_main_direct', targets: [{ format: this.format }] },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline Color (direct)',
        })

        // AA accumulation paths: render linear RGB (fs_main) into the rgba16float
        // accumulation texture. Clear variant replaces (sample 0); accum variant
        // additively blends color AND alpha (sample >= 1), so alpha tracks the
        // per-pixel sample count.
        this.pipelineColorAccumClear = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutColor] }),
            vertex: { module: moduleColor, entryPoint: 'vs_main' },
            fragment: { module: moduleColor, entryPoint: 'fs_main', targets: [{ format: 'rgba16float' }] },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline ColorAccumClear',
        })
        this.pipelineColorAccum = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutColor] }),
            vertex: { module: moduleColor, entryPoint: 'vs_main' },
            fragment: {
                module: moduleColor,
                entryPoint: 'fs_main',
                targets: [{
                    format: 'rgba16float',
                    blend: {
                        color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
                        alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
                    },
                }],
            },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline ColorAccum',
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

        // ── In-place compute pipeline (fused brush+mandelbrot+count on A) ──
        const moduleInplace = this.device.createShaderModule({ code: inplaceComputeShader, label: 'Engine ShaderModule InplaceCompute' })
        const layoutInplace = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 4, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'read-write', format: 'r32float', viewDimension: '2d-array' } },
                { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            ],
            label: 'Engine BindGroupLayout InplaceCompute',
        })
        this.pipelineInplace = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutInplace] }),
            compute: { module: moduleInplace, entryPoint: 'cs_main' },
            label: 'Engine ComputePipeline InplaceBrushMandelbrot',
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

        // ── Present pipeline (accumTexture → swapchain, AA only) ─────────
        const modulePresent = this.device.createShaderModule({ code: presentShader, label: 'Engine ShaderModule Present' })
        const layoutPresent = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d' } },
            ],
            label: 'Engine BindGroupLayout Present',
        })
        this.pipelinePresent = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutPresent] }),
            vertex: { module: modulePresent, entryPoint: 'vs_main' },
            fragment: { module: modulePresent, entryPoint: 'fs_main', targets: [{ format: this.format }] },
            primitive: { topology: 'triangle-list' },
            label: 'Engine RenderPipeline Present',
        })

        // ── AA target-map bake pipeline (neutral DE → per-texel sample count) ──
        const moduleAaTarget = this.device.createShaderModule({ code: aaTargetShader, label: 'Engine ShaderModule AaTarget' })
        const layoutAaTarget = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'r32float', viewDimension: '2d' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            ],
            label: 'Engine BindGroupLayout AaTarget',
        })
        this.pipelineAaTarget = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutAaTarget] }),
            compute: { module: moduleAaTarget, entryPoint: 'cs_main' },
            label: 'Engine ComputePipeline AaTarget',
        })
        if (!this.uniformBufferAaTarget) {
            this.uniformBufferAaTarget = this.device.createBuffer({
                size: 16, // 4 × f32: [antialiasLevel, aaSampleIndex, pad, pad] (shared with reseed)
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                label: 'Engine UniformBuffer AaParams',
            })
        }

        // ── AA selective reseed pipeline (Stage B) ───────────────────────
        const moduleAaReseed = this.device.createShaderModule({ code: aaReseedShader, label: 'Engine ShaderModule AaReseed' })
        const layoutAaReseed = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'r32float', viewDimension: '2d-array' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            ],
            label: 'Engine BindGroupLayout AaReseed',
        })
        this.pipelineAaReseed = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutAaReseed] }),
            compute: { module: moduleAaReseed, entryPoint: 'cs_main' },
            label: 'Engine ComputePipeline AaReseed',
        })

        // bind groups seront (ré)créés dans resize car dépend des textures
        this.bindGroupBrush = undefined
        this.bindGroupMandelbrot = undefined
        this.bindGroupResolve = undefined
        this.bindGroupColor = undefined
        this.bindGroupColorRaw = undefined
        this.counterBindGroup = undefined
        this.bindGroupMerge = undefined
        this.bindGroupInplace = undefined
        this.bindGroupPresent = undefined
    }

    private rebuildInplaceBindGroup() {
        if (!this.pipelineInplace || !this.rawArrayView || !this.uniformBufferMandelbrot
            || !this.mandelbrotReferenceBuffer || !this.mandelbrotBlaBuffer || !this.mandelbrotBlaLevelBuffer
            || !this.uniformBufferBrush || !this.counterBuffer || !this.workStatsBuffer) {
            return
        }

        const layout = this.pipelineInplace.getBindGroupLayout(0)
        this.bindGroupInplace = this.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBufferMandelbrot } },
                { binding: 1, resource: { buffer: this.mandelbrotReferenceBuffer } },
                { binding: 2, resource: { buffer: this.mandelbrotBlaBuffer } },
                { binding: 3, resource: { buffer: this.mandelbrotBlaLevelBuffer } },
                { binding: 4, resource: this.rawArrayView },
                { binding: 5, resource: { buffer: this.uniformBufferBrush } },
                { binding: 6, resource: { buffer: this.counterBuffer } },
                { binding: 7, resource: { buffer: this.workStatsBuffer } },
            ],
            label: 'Engine BindGroup InplaceCompute',
        })
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

        // The in-place compute bind group shares the orbit/BLA buffers, so it
        // must be rebuilt whenever they are reallocated.
        this.rebuildInplaceBindGroup()
    }

    private ensureBlaBufferCapacity(requiredEntries: number) {
        const safeRequiredEntries = Math.max(1, Math.ceil(requiredEntries))
        if (safeRequiredEntries <= this.mandelbrotBlaBufferCapacity) {
            return
        }

        this.mandelbrotBlaBuffer?.destroy?.()
        this.mandelbrotBlaBuffer = this.device.createBuffer({
            size: safeRequiredEntries * 4 * BLA_STEP_FLOATS, // BLA_STEP_FLOATS per BlaStep
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
        this.realizedSkip = -1
        this.workgroupWaste = -1
        this.maxPixelSteps = -1
        this.realLoopStepsApprox = -1
        this.counterReadbackGeneration++
        // Next in-place dispatch re-clears workStats for the new generation.
        this.lastCounterDispatchFrame = -COUNTER_SAMPLE_INTERVAL_FRAMES
        this.counterSampleFrame = -1
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

    private scheduleCounterReadback(slot: CounterReadbackSlot, sequence: number, generation: number, frame: number) {
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
                // Work stats (data[2..5]); 0 on non-in-place frames (buffer cleared).
                const realMean = data[2]
                const covMean = data[3]
                const maxAccum = data[4]
                const maxSteps = data[5]
                this.applyCounterReadback(sequence, generation, frame, unfinished, active, realMean, covMean, maxAccum, maxSteps)
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

    private applyCounterReadback(sequence: number, generation: number, frame: number, unfinished: number, active: number, realMean = 0, covMean = 0, maxAccum = 0, maxSteps = 0) {
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
        this.counterSampleFrame = frame

        // Work instrumentation (in-place path). realMean/covMean/maxAccum are the
        // GPU buffer's RUNNING TOTALS over the whole render generation (accumulated
        // across every dispatch on the GPU, not just sampled ones), so the metrics
        // are exact and deterministic: the ratios converge then freeze at the same
        // whole-render figure regardless of frame-sampling timing. realMean/covMean
        // are per-lane means (Σ/256); the /256 cancels in the ratios.
        if (realMean > 0) {
            const skip = covMean / realMean      // covered ÷ real (render-wide)
            const waste = maxAccum / realMean    // lane-time ÷ useful (render-wide)
            // Both are mathematically ≥ 1 (every loop turn covers ≥1 iter; the
            // tile max ≥ its mean). A value below 1 means a u32 accumulator wrapped
            // on an extreme deep-interior render — show nothing rather than a wrong
            // number. (Normal views fit u32 and read a stable, deterministic value.)
            if (skip >= 1 && waste >= 1) {
                this.realizedSkip = skip
                this.workgroupWaste = waste
                this.maxPixelSteps = maxSteps
                this.realLoopStepsApprox = realMean * 256
            } else {
                this.realizedSkip = -1
                this.workgroupWaste = -1
                this.maxPixelSteps = -1
            }
        }

        // When progressive computation just finished, snapshot resolved→frozen
        // so the unified color path has a valid frozen fallback for future clears.
        if (prevUnfinished > UNFINISHED_PIXEL_DONE_THRESHOLD
            && unfinished <= UNFINISHED_PIXEL_DONE_THRESHOLD
            && !this.clearHistoryNextFrame
&& !isZoomActive(this.zoomState)) {
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
        if (this.completionTimerActive && elapsed > 0) {
            this.completionAccumulatedGpuMs += elapsed
        }

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
        // The shader batch now budgets loop TURNS (work), not covered iterations,
        // so block-skipping modes no longer need an inflated iteration cap — one
        // turn is ~one unit of work in every mode. The adaptive ramp (FPS-driven)
        // settles the actual turn count below this cap; Padé turns cost a bit more
        // (~3× ops) so it just settles a little lower on its own.
        return MAX_BATCH_SIZE
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
        this.accumTexture?.destroy?.()
        this.aaTargetTexture?.destroy?.()

        const layerCount = LAYER_COUNT

        // Helper: create an r32float texture array + per-layer 2d views + full 2d-array view
        const createLayeredTexture = (label: string, extraUsage: GPUTextureUsageFlags = 0): {
            texture: GPUTexture,
            arrayView: GPUTextureView,
            layerViews: GPUTextureView[],
        } => {
            const texture = this.device.createTexture({
                size: { width: textureSize, height: textureSize, depthOrArrayLayers: layerCount },
                format: 'r32float',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | extraUsage,
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

        // STORAGE_BINDING: the in-place compute path writes A as a read_write
        // storage texture (r32float is the only format allowing this).
        const rawResult = createLayeredTexture('Engine RawTexture (A)', GPUTextureUsage.STORAGE_BINDING)
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

        // AA accumulation texture: screen-resolution (matches the color pass output),
        // rgba16float to hold the linear-RGB sum + per-pixel sample count in alpha.
        this.accumTexture = this.device.createTexture({
            size: { width: this.width, height: this.height, depthOrArrayLayers: 1 },
            format: 'rgba16float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'Engine AccumTexture',
        })
        this.accumTextureView = this.accumTexture.createView({ label: 'Engine AccumTexture View' })
        if (this.pipelinePresent) {
            this.bindGroupPresent = this.device.createBindGroup({
                layout: this.pipelinePresent.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: this.accumTextureView }],
                label: 'Engine BindGroup Present',
            })
        }
        // AA target map: per-neutral-texel sample count, baked once from the DE.
        // STORAGE_BINDING (bake write) + TEXTURE_BINDING (color-pass read).
        this.aaTargetTexture = this.device.createTexture({
            size: { width: textureSize, height: textureSize, depthOrArrayLayers: 1 },
            format: 'r32float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label: 'Engine AaTargetTexture',
        })
        this.aaTargetTextureView = this.aaTargetTexture.createView({ label: 'Engine AaTargetTexture View' })
        if (this.pipelineAaTarget && this.rawArrayView && this.uniformBufferAaTarget) {
            this.bindGroupAaTarget = this.device.createBindGroup({
                layout: this.pipelineAaTarget.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.rawArrayView },
                    { binding: 1, resource: this.aaTargetTextureView },
                    { binding: 2, resource: { buffer: this.uniformBufferAaTarget } },
                ],
                label: 'Engine BindGroup AaTarget',
            })
        }
        if (this.pipelineAaReseed && this.rawArrayView && this.uniformBufferAaTarget) {
            this.bindGroupAaReseed = this.device.createBindGroup({
                layout: this.pipelineAaReseed.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.aaTargetTextureView },
                    { binding: 1, resource: this.rawArrayView },
                    { binding: 2, resource: { buffer: this.uniformBufferAaTarget } },
                ],
                label: 'Engine BindGroup AaReseed',
            })
        }
        // Resetting textures invalidates any in-flight AA accumulation.
        this.resetAaState()

        // Reset zoom reprojection state on resize
        this.zoomState = resetZoomState()

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

        this.rebuildColorBindGroup()

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
        } else if (mode === 'pade') {
            this.mandelbrotNavigator.use_pade()
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
        // ε sets the validity radius (ε·|A| affine, √ε·|A| Padé), so a change must
        // rebuild the table and re-render in either block-jump mode.
        if (this.approximationMode === 'bla' || this.approximationMode === 'pade') {
            this.currentBlaLevelCount = 0
            this.clearHistoryNextFrame = true
            this.needRender = true
            this.invalidateCounterReadback()
        }
    }

    getMaxBlaSkip(): number {
        return this.maxBlaSkip
    }

    getPrecisionBudget(): string {
        return this.precisionBudget
    }

    /**
     * Set the navigation precision budget (target scale, e.g. "1e-300"). Forces a full
     * reference recompute — an assumed design choice. Clearing referenceViewKey makes the
     * next update() take the reset branch (resetReferenceJob), which carries the new budget.
     */
    setPrecisionBudget(targetScale: string) {
        if (targetScale === this.precisionBudget) {
            return
        }
        this.precisionBudget = targetScale
        this.mandelbrotNavigator.set_precision_budget(targetScale)
        // Force the next update() to fully reset the worker reference at the new budget.
        this.referenceViewKey = ''
        this.referenceBlaReadyMaxIterations = 0
        this.currentBlaLevelCount = 0
        this.clearHistoryNextFrame = true
        this.needRender = true
        this.invalidateCounterReadback()
    }

    // Run the CPU skip benchmark (exact vs affine vs Padé) on the worker's current
    // reference orbit. Resolves with loop-step counts + a correctness cross-check.
    benchmarkPade(grid = 16): Promise<PadeBenchmarkResult> {
        const empty: PadeBenchmarkResult = {
            pixels: 0, maxIter: 0, stepsExact: 0, stepsAffine: 0, stepsPade: 0, mismatches: 0, maxIterDelta: 0,
        }
        // Supersede any in-flight request so its caller does not hang.
        this.pendingBenchmarkResolve?.(empty)
        this.pendingBenchmarkResolve = null
        return new Promise<PadeBenchmarkResult>((resolve) => {
            this.pendingBenchmarkResolve = resolve
            this.postReferenceWorker({ type: 'benchmarkPade', jobId: this.referenceJobId, grid })
        })
    }

    // Find the minibrot under the current view (deep period detection + Newton
    // nucleus refinement, both arbitrary-precision in the worker). Resolves with
    // the exact nucleus coordinates so the caller can recentre the view on it.
    // `radiusFactor` scales the view radius used by the ball test (~2–4 covers a
    // centred minibrot; larger snaps to a bigger parent atom).
    findMinibrot(radiusFactor = 4): Promise<MinibrotResult> {
        const empty: MinibrotResult = { status: 'none', cx: null, cy: null, period: null }
        // Supersede any in-flight request so its caller does not hang.
        this.pendingMinibrotResolve?.(empty)
        this.pendingMinibrotResolve = null
        return new Promise<MinibrotResult>((resolve) => {
            this.pendingMinibrotResolve = resolve
            this.postReferenceWorker({
                type: 'findMinibrot',
                jobId: this.referenceJobId,
                maxIter: this.currentMaxIterations,
                radiusFactor,
            })
        })
    }

    setMaxBlaSkip(maxSkip: number) {
        // Clamp to a power of two in [2, 1<<20] to match the Rust table levels.
        const clamped = Math.min(1 << 20, Math.max(2, Math.round(maxSkip)))
        const pow2 = 1 << Math.round(Math.log2(clamped))
        if (pow2 === this.maxBlaSkip) {
            return
        }
        this.mandelbrotNavigator.set_max_bla_skip(pow2)
        this.maxBlaSkip = pow2
        this.postReferenceWorker({
            type: 'setMaxBlaSkip',
            jobId: this.referenceJobId,
            maxBlaSkip: pow2,
        })
        if (this.approximationMode === 'bla' || this.approximationMode === 'pade') {
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

        // Time-to-completion tracking: wall-clock + accumulated GPU compute per
        // render session, for comparing perturbation / BLA / Padé. Wall includes
        // reference build (constant across modes); the GPU figure isolates the
        // per-pixel iteration compute, the part blocks actually reduce.
        const renderingNow = this.needsMoreFrames()
        if (renderingNow && !this.completionTimerActive) {
            this.completionStartMs = now
            this.completionAccumulatedGpuMs = 0
            this.completionTimerActive = true
        } else if (!renderingNow && this.completionTimerActive) {
            this.lastCompletionWallMs = now - this.completionStartMs
            this.lastCompletionGpuMs = this.completionAccumulatedGpuMs
            this.completionTimerActive = false
        }

        this.debugShadingActive = renderOptions.debugShading

        if (this.pendingRefReady) {
            this.applyPendingReferenceSwitch()
            return
        }

        const navigatorApproximationMode = (this.mandelbrotNavigator.get_approximation_mode() === 2 ? 'pade' : this.mandelbrotNavigator.get_approximation_mode() === 1 ? 'bla' : 'perturbation')
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
        // Any navigation/parameter change resets AA → instant single-sample fallback,
        // and re-arms auto AA. Not guarded by aaActive: after accumulation completes
        // (aaActive false, aaAccumulatedSamples > 0) a move must still clear the count
        // so auto AA can fire again on the next convergence.
        if (mandelbrotChanged || renderOptionsChanged) {
            this.resetAaState()
        }
        this.aaAuto = renderOptions.aaAuto ?? false
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
        const preserveZoomFrozen = isZoomActive(this.zoomState) && hardResetHistory && !muChanged
        if (hardResetHistory || muChanged) {
            this.clearHistoryNextFrame = true
            if (!preserveZoomFrozen) {
                this.zoomState = resetZoomState()
                this.frozenBaseShiftX = 0
                this.frozenBaseShiftY = 0
                this.frozenPanShiftX = 0
                this.frozenPanShiftY = 0
            }
            // A reference reset clears the live texture. At deep zoom, the first
            // recompute can be slow enough to expose a black frame unless we keep
            // the last resolved image as a temporary frozen fallback. The render
            // pass copies resolved -> frozen before executing the clear.
            this.needFreezeSnapshot = orbitWasReset && !preserveZoomFrozen && !muChanged
            this.needMergeSnapshot = false
        }

        // ── Zoom reprojection state update (before uniform write) ─────
        // Use the state machine to handle scale changes and reprojection cycles.
        {
            const scaleChanged = this.prevFrameMandelbrot
                && this.prevFrameMandelbrot.scale !== mandelbrot.scale

            let event: import('./zoomState').ZoomEvent | null = null

            if (hardResetHistory || muChanged) {
                event = { type: 'referenceReset', muChanged, orbitWasReset }
            } else if (scaleChanged) {
                event = { type: 'scaleChanged', scale: mandelbrot.scale, prevScale: this.prevFrameMandelbrot!.scale }
            } else if (this.prevFrameMandelbrot) {
                event = { type: 'scaleStable' }
            }

            // Capture zoom state values BEFORE state transition (needed for merge uniforms)
            const wasZoomActive = isZoomActive(this.zoomState)
            const prevFrozenScale = getFrozenScale(this.zoomState)
            const prevLiveScale = getLiveScale(this.zoomState)
            const prevRefResetDuringZoom = getReferenceResetDuringZoom(this.zoomState)

            const {state, effects} = event
                ? reduceZoomState(this.zoomState, event, { threshold: this.zoomMagnificationThreshold })
                : { state: this.zoomState, effects: [] as import('./zoomState').ZoomEffect[] }
            this.zoomState = state

            // Small-zoom stop: scale just stabilised while the zoom state machine
            // stayed in 'idle' (zoom factor was too small to trigger reprojecting).
            // The previous frame had an un-snapped cx (is_zooming=true in Rust),
            // so prevFrameMandelbrot.dx is fractional.  The current frame snaps cx
            // to an integer pixel, making the delta non-integer → 1-frame sub-pixel
            // misalignment.  Force a history clear so shiftTexX is 0 for this frame
            // and the texture rebuilds from the snapped position.
            if (!wasZoomActive && this._prevFrameScaleChanged && !scaleChanged) {
                this.clearHistoryNextFrame = true
            }
            this._prevFrameScaleChanged = !!scaleChanged

            for (const effect of effects) {
                switch (effect.type) {
                    case 'copyResolvedToFrozen':
                        this.needFreezeSnapshot = true
                        if (isZoomActive(this.zoomState)) {
                            if (!wasZoomActive) {
                                // New cycle start: capture the initial pan delta
                                const deltaDx = mandelbrot.dx - this.prevFrameMandelbrot!.dx
                                const deltaDy = mandelbrot.dy - this.prevFrameMandelbrot!.dy
                                const neutralExtent = Math.sqrt(aspect * aspect + 1.0)
                                const frozenScale = getFrozenScale(this.zoomState)
                                if (frozenScale > 0) {
                                    this.frozenBaseShiftX = Math.round(-(deltaDx * this.neutralSize) / (2 * frozenScale * neutralExtent))
                                    this.frozenBaseShiftY = Math.round((deltaDy * this.neutralSize) / (2 * frozenScale * neutralExtent))
                                }
                            } else {
                                // Swap: the live texture already contains pan, no base shift
                                this.frozenBaseShiftX = 0
                                this.frozenBaseShiftY = 0
                            }
                            this.frozenPanShiftX = 0
                            this.frozenPanShiftY = 0
                        }
                        break
                    case 'mergeResolvedAndFrozen':
                        this.needMergeSnapshot = !prevRefResetDuringZoom
                        if (wasZoomActive && prevFrozenScale > 0) {
                            this.mergeUniforms = {
                                zf: prevFrozenScale / mandelbrot.scale,
                                lzf: prevLiveScale / mandelbrot.scale,
                                frozenShiftU: (this.frozenBaseShiftX + this.frozenPanShiftX * (prevLiveScale / prevFrozenScale)) / this.neutralSize,
                                frozenShiftV: -(this.frozenBaseShiftY + this.frozenPanShiftY * (prevLiveScale / prevFrozenScale)) / this.neutralSize,
                                aspect,
                                angle: mandelbrot.angle,
                            }
                        }
                        break
                    case 'clearHistoryNextFrame':
                        this.clearHistoryNextFrame = true
                        break
                }
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
        const animation = normalizeAnimationConfig(renderOptions.animation, renderOptions.animationSpeed)
        const animGlobalSpeed = clamp(animation.globalSpeed, 0, 10)
        const animTime = renderOptions.activateAnimate ? this.time : 0
        const paletteOffsetAnim = animationContribution(animation.tracks.paletteOffset, animTime, animGlobalSpeed)
        const heightPaletteShiftAnim = animationContribution(animation.tracks.heightPaletteShift, animTime, animGlobalSpeed)
        const lightAngleAnim = animationContribution(animation.tracks.lightAngle, animTime, animGlobalSpeed) * TAU
        const textureDriftAnimX = animationContribution(animation.tracks.textureDrift, animTime, animGlobalSpeed)
        const textureDriftAnimY = shiftedAnimationContribution(animation.tracks.textureDrift, animTime, animGlobalSpeed, 0.25)
        const skyReflectionDriftAnimX = animationContribution(animation.tracks.skyReflectionDrift, animTime, animGlobalSpeed)
        const skyReflectionDriftAnimY = shiftedAnimationContribution(animation.tracks.skyReflectionDrift, animTime, animGlobalSpeed, 0.25)
        const phaseColoringAnim = animationContribution(animation.tracks.phaseColoring, animTime, animGlobalSpeed)
        const varnishAnim = animationContribution(animation.tracks.varnish, animTime, animGlobalSpeed)
        const microBumpAnim = animationContribution(animation.tracks.microBump, animTime, animGlobalSpeed)
        const displacementAnim = animationContribution(animation.tracks.displacement, animTime, animGlobalSpeed)
        const tessellationAnim = animationContribution(animation.tracks.tessellation, animTime, animGlobalSpeed)
        const effectiveLightAngle = renderOptions.lightAngle + lightAngleAnim
        const effectiveTessellationLevel = clamp(renderOptions.tessellationLevel + tessellationAnim, 0, 10)
        const effectiveDisplacementAmount = clamp(renderOptions.displacementAmount + displacementAnim, 0, 0.1)
        const effectiveMicroBumpStrength = clamp(renderOptions.microBumpStrength + microBumpAnim, 0, 10)
        const effectiveVarnishStrength = clamp(renderOptions.varnishStrength + varnishAnim, 0, 10)
        const effectiveHeightPaletteShift = clamp(renderOptions.heightPaletteShift + heightPaletteShiftAnim, 0, 100)
        const effectivePhaseColoringStrength = clamp(renderOptions.phaseColoringStrength + phaseColoringAnim, 0, 100)
        const lightDirLen = Math.hypot(Math.cos(effectiveLightAngle), Math.sin(effectiveLightAngle), 1.85)
        const textureMapping = normalizeTextureMappingConfig(renderOptions.textureMapping)

        const zoomActive = isZoomActive(this.zoomState)
        const zoomFactor = zoomActive
            ? getFrozenScale(this.zoomState) / mandelbrot.scale
            : 1.0
        const liveZoomFactor = zoomActive
            ? getLiveScale(this.zoomState) / mandelbrot.scale
            : 1.0
        const frozenScale = getFrozenScale(this.zoomState)
        const liveScale = getLiveScale(this.zoomState)
        const antialiasLevelColor = Math.max(1, Math.round(renderOptions.antialiasLevel ?? 1))

        const colorShaderData = new Float32Array([
            renderOptions.palettePeriod,    // 0: palettePeriod
            renderOptions.paletteOffset + paletteOffsetAnim, // 1: paletteOffset
            scaleFactor,                    // 2: bloomStrength (scaleFactor)
            this.time,                      // 3: time
            aspect,                         // 4: aspect
            mandelbrot.angle,               // 5: angle
            renderOptions.activateAnimate ? 1 : 0, // 6: animate
            mandelbrot.mu,                  // 7: mu
            zoomFactor,                     // 8: zoomFactor
            (zoomActive || this.frozenAligned || this.needFreezeSnapshot) ? 1.0 : 0.0, // 9: frozenAligned
            liveZoomFactor,                 // 10: liveZoomFactor
            // Frozen shift derived from the live texture's actual cumulative
            // shift (in rounded texels at liveScale), rescaled to frozen UV.
            // This ensures the frozen texture follows the exact same pan drift
            // as the live texture, without independent accumulation errors.
            (zoomActive && frozenScale > 0)
                ? (this.frozenBaseShiftX + this.frozenPanShiftX * (liveScale / frozenScale)) / this.neutralSize
                : 0,                        // 11: frozenShiftU
            (zoomActive && frozenScale > 0)
                ? -(this.frozenBaseShiftY + this.frozenPanShiftY * (liveScale / frozenScale)) / this.neutralSize
                : 0,                        // 12: frozenShiftV
            effectiveTessellationLevel,     // 13: tessellationLevel
            effectiveDisplacementAmount,    // 14: displacementAmount
            animGlobalSpeed,                // 15: animationSpeed (legacy/global speed)
            mandelbrot.epsilon,             // 16: epsilon
            renderOptions.ambientOcclusionStrength, // 17: ambientOcclusionStrength
            effectiveMicroBumpStrength,     // 18: microBumpStrength
            renderOptions.subsurfaceStrength, // 19: subsurfaceStrength
            renderOptions.reliefDepth,       // 20: reliefDepth
            renderOptions.localShadowStrength, // 21: localShadowStrength
            effectiveLightAngle,              // 22: lightAngle
            effectiveVarnishStrength,         // 23: varnishStrength
            Math.log(mandelbrot.mu),            // 24: logMu
            sceneSin,                           // 25: sceneSin
            sceneCos,                           // 26: sceneCos
            Math.cos(effectiveLightAngle) / lightDirLen, // 27: lightDirX
            Math.sin(effectiveLightAngle) / lightDirLen, // 28: lightDirY
            1.85 / lightDirLen,                 // 29: lightDirZ
            renderOptions.paletteMirror ? 1 : 0, // 30: paletteMirror
            renderOptions.debugShading ? 1 : 0,  // 31: debugShading
            effectiveHeightPaletteShift,         // 32: heightPaletteShift [0, 100]
            renderOptions.orbitTrapStrength,     // 33: orbitTrapStrength [0, 100]
            effectivePhaseColoringStrength,      // 34: phaseColoringStrength [0, 100]
            textureMappingVariableId(textureMapping.xVariable), // 35: textureMappingXVariable
            textureMappingVariableId(textureMapping.yVariable), // 36: textureMappingYVariable
            textureMapping.xScale,                // 37: textureMappingXScale
            textureMapping.yScale,                // 38: textureMappingYScale
            textureMapping.mirrored ? 1 : 0,      // 39: textureMappingMirror
            parseFloat(mandelbrot.cx),            // 40: centerX
            parseFloat(mandelbrot.cy),            // 41: centerY
            mandelbrot.scale,                     // 42: scale
            0.0,                                  // 43: _pad
            0.03 * textureDriftAnimX,             // 44: textureDriftX
            0.03 * textureDriftAnimY,             // 45: textureDriftY
            0.02 * skyReflectionDriftAnimX,       // 46: skyDriftX
            0.02 * skyReflectionDriftAnimY,       // 47: skyDriftY
            paletteOffsetAnim,                    // 48: paletteOffsetAnimation
            heightPaletteShiftAnim,               // 49: heightPaletteShiftAnimation
            lightAngleAnim,                       // 50: lightAngleAnimation
            textureDriftAnimX,                    // 51: textureDriftAnimation
            skyReflectionDriftAnimX,              // 52: skyReflectionDriftAnimation
            phaseColoringAnim,                    // 53: phaseColoringAnimation
            varnishAnim,                          // 54: varnishAnimation
            microBumpAnim,                        // 55: microBumpAnimation
            displacementAnim,                     // 56: displacementAnimation
            tessellationAnim,                     // 57: tessellationAnimation
            this.aaSampleIndex,                   // 58: aaSampleIndex (AA accumulation gate)
            antialiasLevelColor,                  // 59: antialiasLevel (debug sample-count viz)
        ])
        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, colorShaderData.buffer)

        if (!this.needsMoreFrames()) {
            return
        }

        const maxIterations = Math.ceil(mandelbrot.maxIterations)
        this.currentMaxIterations = maxIterations
        const computeScale = isZoomActive(this.zoomState) && getLiveScale(this.zoomState) > 0
            ? getLiveScale(this.zoomState)
            : mandelbrot.scale

        // floatexp decomposition for the deep-zoom path. scale and the
        // reference-relative center offset (dx, dy) share one base-2 exponent
        // (expScale): since |center − reference| < 20·scale, dx/dy are the same
        // order as scale. The shader rebuilds dc = local·scaleMant + (cxMant,
        // cyMant) as a single same-exponent add. Below the threshold we send
        // mantissas (which would underflow f32 as raw values); above it we send
        // the plain values so the shallow f32 path is unchanged. expScale is
        // always sent so the shader's deep test matches the host's.
        // Prefer the full-precision decimal strings (no f64 floor → works below
        // ~1e-308); fall back to the numeric fields mid-zoom, where only the f64
        // liveScale is available. The offset strings stay valid during zoom (a
        // pure zoom keeps the center fixed).
        const zooming = isZoomActive(this.zoomState) && getLiveScale(this.zoomState) > 0
        const scaleParts = (!zooming && mandelbrot.scaleStr)
            ? frexpFromDecimalString(mandelbrot.scaleStr)
            : frexpFloat32(computeScale)
        const expScale = scaleParts.exponent
        const deep = expScale <= DEEP_EXP_THRESHOLD
        this.floatExpActive = deep
        // cx/cy mantissas re-based onto the shared scale exponent. Decomposing
        // each component first (rather than dx * 2^-expScale) avoids ever forming
        // a huge/overflowing power and handles a zero component cleanly. Since
        // |center − reference| ≈ scale, the rebased exponent gap is small.
        const cxParts = mandelbrot.dxStr ? frexpFromDecimalString(mandelbrot.dxStr) : frexpFloat32(mandelbrot.dx)
        const cyParts = mandelbrot.dyStr ? frexpFromDecimalString(mandelbrot.dyStr) : frexpFloat32(mandelbrot.dy)
        // Guard the zero component: a 0 mantissa with a deep expScale would form
        // 0 · 2^(huge) = 0 · Infinity = NaN.
        const cxMant = cxParts.mantissa === 0 ? 0 : Math.fround(cxParts.mantissa * 2 ** (cxParts.exponent - expScale))
        const cyMant = cyParts.mantissa === 0 ? 0 : Math.fround(cyParts.mantissa * 2 ** (cyParts.exponent - expScale))

        if (!this.referenceViewKey) {
            console.log('[REF] update: reset branch (key empty) | deep', deep, 'expScale', expScale, 'mode', this.approximationMode, 'dx', mandelbrot.dx, 'dxStr', mandelbrot.dxStr)
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

        // BLA now runs in the deep (floatexp) path too: a/b/radii are stored in
        // fe form and try_apply_bla_deep does its radius test in log space.
        // Block-jump modes: 'bla' (affine) and 'pade' (rational) both use the table;
        // the uniform flag carries which one (1 = BLA, 2 = Padé) so the shader picks
        // the affine vs rational application. 0 = exact perturbation.
        const blocksReady = (this.approximationMode === 'bla' || this.approximationMode === 'pade')
            && orbitComplete
            && this.currentBlaLevelCount > 0
            && this.referenceBlaReadyMaxIterations >= guardedMaxIter
        const approximationModeFlag = blocksReady
            ? (this.approximationMode === 'pade' ? 2 : 1)
            : 0
        const blaLevelCount = blocksReady ? this.currentBlaLevelCount : 0
        // Diagnostic mirror of exactly what the shader receives this frame: the mode
        // flag (0=exact, 1=BLA, 2=Padé) and the block-level count. If, in Padé mode,
        // flag≠2 or levels=0, blocks are disabled before the GPU (Engine/worker side);
        // if flag=2 & levels>0 but no speedup, the issue is in the shader path.
        this.lastShaderApproxFlag = approximationModeFlag
        this.lastShaderBlaLevelCount = blaLevelCount

        // Re-write the mandelbrot uniform with the guarded globalMaxIter.
        // During zoom reprojection, override scale with liveScale so the GPU
        // computes at the fixed target scale for this cycle.
        const mandelbrotShaderUniformDataGuarded = new Float32Array([
            deep ? cxMant : mandelbrot.dx,        // 0: cx — fe mantissa when deep, else plain
            deep ? cyMant : mandelbrot.dy,        // 1: cy — fe mantissa when deep, else plain
            mandelbrot.mu,
            deep ? scaleParts.mantissa : computeScale, // 3: scale — fe mantissa when deep, else plain
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
            expScale,  // 17: shared base-2 exponent for scale & cx/cy (fe deep path)
            this.aaOffsetX,  // 18: AA sub-pixel jitter X (neutral-space units)
            this.aaOffsetY,  // 19: AA sub-pixel jitter Y
        ])
        this.device.queue.writeBuffer(this.uniformBufferMandelbrot!, 0, mandelbrotShaderUniformDataGuarded.buffer)

        // When the orbit just became complete, clear history once so that
        // pixels which were stored as budget-exhausted continuations (during
        // orbit building) get a fresh recompute with the full orbit available.
        // During an active zoom reprojection cycle, skip this: maxIterations
        // grows every frame with scale, so the condition fires perpetually.
        // The ZOOM_STOP clear will trigger a full recompute when zoom ends.
        // Suppressed during AA: the present pass already shows a stable average,
        // and a freeze + clearHistory here would clobber selective-reseed state.
        if (!isZoomActive(this.zoomState)
            && !this.clearHistoryNextFrame
            && !this.aaActive
            && orbitComplete && this.prevGuardedMaxIter < maxIterations && this.prevGuardedMaxIter > 0) {
            this.needFreezeSnapshot = true
            this.clearHistoryNextFrame = true
        }
        this.prevGuardedMaxIter = guardedMaxIter

        this.previousMandelbrot = structuredClone(mandelbrot) // conserve current pour utilisation future
        this.previousRenderOptions = structuredClone(renderOptions)
    }

    /** Clear all AA accumulation state (idle, single-sample). */
    resetAaState() {
        this.aaActive = false
        this.aaSampleIndex = 0
        this.aaAccumulatedSamples = 0
        this.aaOffsetX = 0
        this.aaOffsetY = 0
        this.aaReseedPending = false
    }

    /**
     * Explicitly start idle-time AA accumulation. Intended to be called when the
     * view is fully converged and idle (from a UI button / shortcut). Accumulation
     * never starts automatically; any navigation/param change aborts it.
     */
    triggerAaAccumulation() {
        this.resetAaState()
        this.aaActive = true
        this.needRender = true
    }

    /** Readable AA progress for the UI ("AA: done/total"). */
    get aaProgress(): { active: boolean; done: number; total: number } {
        const total = Math.max(1, Math.round(this.previousRenderOptions?.antialiasLevel ?? 1))
        return { active: this.aaActive, done: this.aaAccumulatedSamples, total }
    }

    async render() {
        if (this.skipRenderOnce) {
            this.skipRenderOnce = false
            return
        }

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
        const renderOptions = this.previousRenderOptions
        if (!renderOptions) {
            return
        }

        const aspect = (this.width / Math.max(1, this.height))
        // All paths now use the same configurable seed step for progressive refinement.
        const zoomMinBrushStep = normalizePowerOfTwoStep(renderOptions.zoomMinBrushStep, 1, 1, 64)
        const seedStep = Math.max(
            normalizePowerOfTwoStep(renderOptions.sentinelSeedStep, 64, 1, 4096),
            zoomMinBrushStep,
        )
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
            const scaleForShift = (isZoomActive(this.zoomState) && getLiveScale(this.zoomState) > 0)
                ? getLiveScale(this.zoomState)
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
            if (isZoomActive(this.zoomState)) {
                this.frozenPanShiftX += roundedShiftTexX
                this.frozenPanShiftY += roundedShiftTexY
            }
            // Translation shifts the live texture but not the frozen texture,
            // so any non-zero shift desynchronizes them.
            if (hasTranslationShift) {
                this.frozenAligned = false
            }
        }

        if (hasTranslationShift && !isZoomActive(this.zoomState)) {
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
            isZoomActive(this.zoomState) ? zoomMinBrushStep : 0,
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
            frame: number,
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
            //    writes directly into frozen's 8 layer views.
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
            this.frozenPanShiftX = 0
            this.frozenPanShiftY = 0
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
            this.frozenPanShiftX = 0
            this.frozenPanShiftY = 0
            if (!isZoomActive(this.zoomState)) {
                this.frozenBaseShiftX = 0
                this.frozenBaseShiftY = 0
            }
        }

        // Helper: build 8 MRT color attachments from per-layer views
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

        // ── Frame path selection ─────────────────────────────────────────
        // In-place compute path: only for frames without translation and
        // without clearHistory (the fused shader is strictly texel-local —
        // translation reads the neighbouring texel and must stay on the
        // render ping-pong path).
        const useInplacePath = this.useInplaceCompute
            && !this.clearHistoryNextFrame
            && !hasTranslationShift
            && !!this.pipelineInplace
            && !!this.bindGroupInplace
            && !!this.counterBuffer

        // Track frames that may mutate A: full-path frames always rewrite it;
        // in-place frames only write when work remains (unknown counts are
        // conservatively treated as a mutation).
        if (!useInplacePath || this.unfinishedPixelCount !== 0 || this.activePixelCount !== 0) {
            this.lastRawMutationFrame = frameSerial
        }

        if (useInplacePath) {
            // Stage B selective reseed: stamp the boundary sliver (target > sample
            // index) as compute requests so only it reconverges with the new jitter;
            // frozen texels are left as-is and skipped by the fused pass below.
            if (this.aaReseedPending && this.pipelineAaReseed && this.bindGroupAaReseed && this.uniformBufferAaTarget) {
                const aaLevel = Math.max(1, Math.round(renderOptions.antialiasLevel ?? 1))
                this.device.queue.writeBuffer(
                    this.uniformBufferAaTarget,
                    0,
                    new Float32Array([aaLevel, this.aaSampleIndex, this.height, 0]).buffer,
                )
                const reseedPass = commandEncoder.beginComputePass()
                reseedPass.setPipeline(this.pipelineAaReseed)
                reseedPass.setBindGroup(0, this.bindGroupAaReseed)
                const rwg = Math.ceil(this.neutralSize / 16)
                reseedPass.dispatchWorkgroups(rwg, rwg)
                reseedPass.end()
                this.aaReseedPending = false
            }
            // Fused brush+mandelbrot+count: a single compute dispatch working
            // in place on A.  Finished texels generate zero texture writes,
            // replacing passes 0/1, the B→A copy and the count pass.
            commandEncoder.clearBuffer(this.counterBuffer!, 0, 8)
            // workStats accumulates across the whole render generation — clear it
            // only on the generation's first in-place dispatch, then let every
            // dispatch atomicAdd into it (exact, sampling-independent totals).
            if (this.workStatsClearedGeneration !== this.counterReadbackGeneration) {
                commandEncoder.clearBuffer(this.workStatsBuffer!, 0, 16)
                this.workStatsClearedGeneration = this.counterReadbackGeneration
            }
            const computePass = commandEncoder.beginComputePass()
            computePass.setPipeline(this.pipelineInplace!)
            computePass.setBindGroup(0, this.bindGroupInplace!)
            // cs_main is @workgroup_size(8,8) — smaller tiles reduce intra-workgroup
            // lockstep divergence waste (one deep straggler holds 64 lanes, not 256).
            const workgroups = Math.ceil(this.neutralSize / 8)
            computePass.dispatchWorkgroups(workgroups, workgroups)
            computePass.end()

            // The fused pass accumulates the counters every frame; only the
            // readback copy is sampled at the usual interval.
            if (counterReadbackSlot) {
                const sequence = ++this.counterReadbackSequence
                const generation = this.counterReadbackGeneration
                commandEncoder.copyBufferToBuffer(this.counterBuffer!, 0, counterReadbackSlot.buffer, 0, 8)
                commandEncoder.copyBufferToBuffer(this.workStatsBuffer!, 0, counterReadbackSlot.buffer, 8, 16)
                this.lastCounterDispatchFrame = frameSerial
                scheduledCounterReadback = { slot: counterReadbackSlot, sequence, generation, frame: frameSerial }
            }
        } else {
            // Pass 0: brush des sentinelles (A -> B)
            const rpassBrush = commandEncoder.beginRenderPass({
                colorAttachments: makeMrtAttachments(this.rawBrushLayerViews),
            })
            rpassBrush.setPipeline(this.pipelineBrush)
            rpassBrush.setBindGroup(0, this.bindGroupBrush)
            rpassBrush.draw(6, 1, 0, 0)
            rpassBrush.end()

            // Pre-fill A with B so mandelbrot.wgsl can discard pass-through pixels
            // instead of rewriting all 8 MRT layers for inactive pixels.
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
                scheduledCounterReadback = { slot: counterReadbackSlot, sequence, generation, frame: frameSerial }
            }
        }

        // ── Resolve gating (C1) ──────────────────────────────────────────
        // When the image is fully converged (0 unfinished, 0 active, sampled
        // after the last frame that mutated A), resolved would be identical
        // to A: skip the copy + resolve pass and let color read A directly.
        // Frames requesting a frozen snapshot or merge keep the resolve so
        // resolvedTexture is guaranteed fresh for the next frame's copy.
        const skipResolve = useInplacePath
            && !!this.bindGroupColorRaw
            && !this.needFreezeSnapshot
            && !this.needMergeSnapshot
            && this.unfinishedPixelCount === 0
            && this.activePixelCount === 0
            && this.counterSampleFrame >= this.lastRawMutationFrame
        this.resolveSkipped = skipResolve

        // Fully converged: safe to capture an AA sample. No pending history clear,
        // no freeze/merge, not zooming, orbit complete, zero unfinished/active
        // pixels, and the latest pixel counts have been read back.
        const fullyConverged =
            !this.clearHistoryNextFrame
            && !this.needFreezeSnapshot
            && !this.needMergeSnapshot
            && !isZoomActive(this.zoomState)
            && !this.orbitIncomplete
            && this.unfinishedPixelCount === 0
            && this.activePixelCount === 0
            && !this.hasPendingCounterReadbackForCurrentGeneration()

        if (!skipResolve) {
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
        }

        // ── Pass 3 (color) + Pass 4 (AA present) ──────────────────────────
        const colorBindGroup = (skipResolve ? this.bindGroupColorRaw! : this.bindGroupColor)!
        const swapView = this.ctx.getCurrentTexture().createView()

        const antialiasLevel = Math.max(1, Math.round(renderOptions.antialiasLevel ?? 1))
        const neutralExtentColor = Math.sqrt(aspect * aspect + 1.0)

        // AA with level <= 1 is a no-op: deactivate so the loop can idle.
        if (this.aaActive && antialiasLevel <= 1) {
            this.resetAaState()
        }

        // Auto AA: start accumulation as soon as the view is fully converged.
        // accumulatedSamples === 0 ensures we only fire once per converged view
        // (it stays > 0 after completion until the next navigation resets it).
        if (this.aaAuto
            && antialiasLevel > 1
            && !this.aaActive
            && this.aaAccumulatedSamples === 0
            && fullyConverged) {
            this.triggerAaAccumulation()
        }

        // Capture a new AA sample only on a fully-converged frame, so partial
        // mid-reconverge frames never pollute the accumulator.
        const aaCompositeThisFrame =
            this.aaActive
            && fullyConverged
            && this.aaAccumulatedSamples < antialiasLevel
            && !!this.accumTextureView
            && !!this.pipelineColorAccum
            && !!this.pipelineColorAccumClear
        // Show the accumulator (running average) once we have >= 1 captured sample
        // (or are capturing one now); otherwise fall back to a direct render.
        const aaShowAccum = this.aaActive && (this.aaAccumulatedSamples >= 1 || aaCompositeThisFrame)

        if (aaCompositeThisFrame) {
            const firstSample = this.aaSampleIndex === 0
            const rpassAccum = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.accumTextureView!,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: firstSample ? 'clear' : 'load',
                    storeOp: 'store',
                }],
            })
            rpassAccum.setPipeline(firstSample ? this.pipelineColorAccumClear! : this.pipelineColorAccum!)
            rpassAccum.setBindGroup(0, colorBindGroup)
            rpassAccum.draw(6, 1, 0, 0)
            rpassAccum.end()
        } else if (!aaShowAccum) {
            // Direct path: color straight to the swapchain (AA off, or sample 0 not
            // yet converged). Byte-identical to the historical behaviour.
            const rpassColor = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: swapView,
                    clearValue: { r: 1, g: 1, b: 1, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            })
            rpassColor.setPipeline(this.pipelineColor)
            rpassColor.setBindGroup(0, colorBindGroup)
            rpassColor.draw(6, 1, 0, 0)
            rpassColor.end()
        }

        // Pass 4 (present): blit the accumulator's per-pixel average to the swapchain.
        if (aaShowAccum && this.pipelinePresent && this.bindGroupPresent) {
            const rpassPresent = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: swapView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            })
            rpassPresent.setPipeline(this.pipelinePresent)
            rpassPresent.setBindGroup(0, this.bindGroupPresent)
            rpassPresent.draw(6, 1, 0, 0)
            rpassPresent.end()
        }

        // Bake the AA target map once, right after sample 0 has converged and been
        // composited (reads the converged neutral DE in rawTexture). Reused by the
        // color gate and the selective reseed for all subsequent samples.
        const aaBakeThisFrame = aaCompositeThisFrame
            && this.aaSampleIndex === 0
            && !!this.pipelineAaTarget
            && !!this.bindGroupAaTarget
            && !!this.uniformBufferAaTarget
        if (aaBakeThisFrame) {
            this.device.queue.writeBuffer(
                this.uniformBufferAaTarget!,
                0,
                new Float32Array([antialiasLevel, 0, this.height, 0]).buffer,
            )
            const bakePass = commandEncoder.beginComputePass()
            bakePass.setPipeline(this.pipelineAaTarget!)
            bakePass.setBindGroup(0, this.bindGroupAaTarget!)
            bakePass.dispatchWorkgroups(
                Math.ceil(this.neutralSize / 16),
                Math.ceil(this.neutralSize / 16),
            )
            bakePass.end()
        }

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
                scheduledCounterReadback.frame,
            )
        }

        // Reset the clear flag now that it has been consumed by the GPU passes.
        this.clearHistoryNextFrame = false

        // marque mise à jour des paramètres frame précédente pour prochaine frame
        this.prevFrameMandelbrot = { ...this.previousMandelbrot }

        // Parameters have been consumed — clear the flag so the engine can go idle
        // once all other conditions (orbit, unfinished pixels, etc.) are satisfied.
        this.needRender = false

        // ── Advance the AA state machine ──────────────────────────────────
        // Runs after the clear/needRender resets above so the flags it sets stick
        // for the next frame. Only fires on the frame that captured a sample.
        if (aaCompositeThisFrame) {
            this.aaAccumulatedSamples++
            if (this.aaAccumulatedSamples < antialiasLevel) {
                // Queue the next jittered sample.
                this.aaSampleIndex++
                const j = computeAaJitterOffset(this.aaSampleIndex)
                this.aaOffsetX = j.x * neutralExtentColor / Math.max(1, this.neutralSize)
                this.aaOffsetY = j.y * neutralExtentColor / Math.max(1, this.neutralSize)
                // Stage B: reconverge only the boundary sliver via a selective reseed.
                // Requires the grid at its finest step (1) and the reseed pipeline.
                // Otherwise fall back to Stage A's full reconverge.
                const canSelectiveReseed = this.useAaSelectiveReseed
                    && this.useInplaceCompute
                    && zoomMinBrushStep <= 1
                    && !!this.pipelineAaReseed
                    && !!this.bindGroupAaReseed
                if (canSelectiveReseed) {
                    this.aaReseedPending = true
                    // The reseed marks the boundary sliver as active again; without
                    // invalidating the (async) pixel counter, the stale "0 active"
                    // from the previous convergence would make fullyConverged fire
                    // immediately and composite a half-computed sample. Force a fresh
                    // count so the next composite waits for the sliver to reconverge.
                    this.invalidateCounterReadback()
                } else {
                    this.clearHistoryNextFrame = true
                }
                this.needRender = true
            } else {
                // Accumulation complete → go idle; the final average stays on screen.
                this.aaActive = false
            }
        }

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
                  renderPass.setBindGroup(0, colorBindGroup!);
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
        else if (isZoomActive(this.zoomState)) reason = 'zoomActive'
        else if (this.clearHistoryNextFrame) reason = 'clearHistory'
        else if (this.needFreezeSnapshot) reason = 'freezeSnapshot'
        else if (this.needMergeSnapshot) reason = 'mergeSnapshot'
        else if (this.isReferenceValidating) reason = 'referenceValidating'
        else if (this.orbitIncomplete) reason = 'orbitIncomplete'
        else if (this.unfinishedPixelCount < 0
            || this.unfinishedPixelCount > UNFINISHED_PIXEL_DONE_THRESHOLD) {
            reason = `unfinished=${this.unfinishedPixelCount}`
        }
        else if (this.aaActive) reason = 'aaAccumulating'
        // Auto AA pending: the view looks converged but accumulation hasn't started
        // yet. Keep the loop alive so render()'s auto-trigger (which needs the full
        // fullyConverged check incl. the async counter) gets a chance to fire,
        // instead of idling on the exact frame convergence completes.
        else if (this.aaAuto
            && !this.aaActive
            && this.aaAccumulatedSamples === 0
            && this.unfinishedPixelCount === 0
            && this.activePixelCount === 0
            && !this.orbitIncomplete
            && !isZoomActive(this.zoomState)) {
            reason = 'aaAutoPending'
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
        if (!this._drawFn) {
            this._rafId = null
            return
        }

        // Pace stepping + rendering to the *real* GPU frame time rather than the
        // raw rAF interval. Rendering is fire-and-forget (queue.submit returns
        // before the GPU is done — see scheduleGpuTiming), so rAF keeps firing at
        // ~display rate even when a deep-zoom frame takes hundreds of ms on the
        // GPU. Without this gate the navigator would advance ~60×/s while the
        // screen only updates a handful of times per second, so the animation
        // (zoom in particular) wouldn't track render time and the displayed image
        // would jump. By only invoking draw() once a real frame's worth of time
        // has elapsed, navigator.step()'s own Date.now() delta_time becomes the
        // true render cadence → uniform, render-time-dependent zoom, and no
        // backlog of un-displayable frames piling up in the queue.
        // smoothedGpuTimeMs == 0 until the first frame is timed (no gating then);
        // cap at 500 ms so we stay responsive if a frame spikes.
        const now = performance.now()
        const minInterval = Math.min(this.smoothedGpuTimeMs, 500)
        if (now - this._lastDrawMs >= minInterval) {
            this._lastDrawMs = now

            const active = this.needsMoreFrames()
            this.isRendering = active

            await this._drawFn()

            // FPS counter: count only frames that did real GPU work
            if (active) {
                this._fpsFrameCount++
            }
            const fpsNow = performance.now()
            if (this._fpsLastTime === 0) this._fpsLastTime = fpsNow
            const elapsed = fpsNow - this._fpsLastTime
            if (elapsed >= 1000) {
                this.fps = Math.round((this._fpsFrameCount * 1000) / elapsed)
                this._fpsFrameCount = 0
                this._fpsLastTime = fpsNow
            }
        }

        this._rafId = requestAnimationFrame(async () => this._loop())
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
            const makeEntries = (neutralView: GPUTextureView): GPUBindGroupEntry[] => [
                { binding: 0, resource: { buffer: this.uniformBufferColor! } },
                { binding: 1, resource: neutralView },
                { binding: 2, resource: this.tileTextureView! },
                { binding: 3, resource: this.skyboxTextureView! },
                { binding: 4, resource: this.webcamTextureView! },
                { binding: 5, resource: this.paletteTextureView! },
                { binding: 6, resource: this.frozenArrayView! },
                { binding: 7, resource: this.paletteSampler! },
                { binding: 8, resource: this.skyboxSampler! },
                { binding: 9, resource: this.aaTargetTextureView! },
            ]
            this.bindGroupColor = this.device.createBindGroup({
                layout,
                entries: makeEntries(this.resolvedArrayView),
                label: 'Engine BindGroup Color',
            })
            // Alternative bind group reading rawTexture (A) directly, used when
            // the resolve pass is skipped (fully converged image).
            this.bindGroupColorRaw = this.rawArrayView
                ? this.device.createBindGroup({
                    layout,
                    entries: makeEntries(this.rawArrayView),
                    label: 'Engine BindGroup Color (raw)',
                })
                : undefined
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
        const bitmap = await createImageBitmap(img, { premultiplyAlpha: 'none' })
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

        // When the resolve pass is gated (fully converged image), resolvedTexture
        // is stale — read the same data from rawTexture (A) instead.
        const pickSourceTexture = this.resolveSkipped && this.rawTexture
            ? this.rawTexture
            : this.resolvedTexture

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
                    texture: pickSourceTexture,
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
