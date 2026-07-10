// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import inplaceComputeShader from './assets/mandelbrot_brush.wgsl?raw'
import debugViewShader from './assets/mandelbrot_debug.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import reprojectCsShader from './assets/reproject_cs.wgsl?raw'
import resolveShader from './assets/resolve.wgsl?raw'
import mergeFrozenShader from './assets/merge_frozen.wgsl?raw'
import presentShader from './assets/present.wgsl?raw'
import aaTargetShader from './assets/aa_target.wgsl?raw'
import aaReseedShader from './assets/aa_reseed.wgsl?raw'
import {MandelbrotNavigator} from 'mandelbrot'
import {WebcamTexture} from './WebcamTexture'
import {Palette} from './Palette.ts'
import {DEEP_EXP_THRESHOLD, frexpFloat32, frexpFromDecimalString, log2FromDecimalString} from './floatexp'
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
// Raw state textures (A/B) carry a 9th layer: the Cartesian derivative log
// scale derS for in-progress pixels (all-compute-der-cartesian). Display-side
// textures (resolved/frozen) and their 8-target MRT pipelines stay at 8 —
// they only ever consume the escaped format.
// 13 = 9 iteration layers + the Phase D analytic-AA extras (9/10 in-progress
// z″ mantissa; 8..12 escaped Taylor payload). Allocated unconditionally for
// now — writes are cheap and reproject copies by destination layer count;
// FOLLOW-UP: gate to 9 when antialiasLevel == 1 (saves 4 × texSize² × 4 B × 2
// textures; needs a realloc path on the AA toggle).
const RAW_LAYERS = 13
const DISPLAY_LAYERS = 8

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
// Floats per jet COEFFICIENT record — must match the Rust #[repr(C)] JetCoeffs
// (9 coefficients × (x, y, e)) and the WGSL JetStep (108 B).
const JET_COEFF_FLOATS = 27
// Floats per jet RADIUS record — the split "buffer de rayons": Rust JetRadii /
// WGSL JetRadii (vec4: r1, r2, r3, pad), 16 B so a probe is one coalesced load.
// Its own buffer so a radius re-solve re-uploads only these, not the whole
// coefficient table.
const JET_RADII_FLOATS = 4
// Floats per Möbius-c+ COEFFICIENT record — must match the Rust #[repr(C)]
// MobiusCoeffs: 5 coefficients × (x, y, e), 60 B. Mobius tables ship in the
// SAME GPU buffers as jet ones (the element type is identical and the modes
// are exclusive; layoutInplace already sits at the 8-storage-buffer WebGPU
// default limit, so new bindings were not an option) — only the indexing
// stride differs shader-side. The radius sidecar and level directory reuse
// the jet strides outright (16 B vec4 / 4 × u32).
const MOBIUS_COEFF_FLOATS = 18
// Step capacity of the GPU reference buffer (the 8·CAPACITY-byte
// mandelbrotReferenceBuffer below). Mirrors referenceWorker.ts, where the orbit
// is computed to 2× the display maxIter (interactive zoom-in headroom) but never
// beyond this cap.
const ORBIT_STEP_CAPACITY = 1_000_000
const COLOR_UNIFORM_FLOAT_COUNT = 64
const TAU = Math.PI * 2

// Adaptive refinement gating: sentinel grid refinement (halving the step
// each frame) is paused when the batch controller is at its minimum AND
// the number of active pixels (those the fused compute pass actually processes:
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

// Per-pass GPU timing (PerformancePanel). Each timed pass gets a begin/end
// timestamp pair via GPUComputePass/RenderPassTimestampWrites — recorded inline
// by the GPU, so NO pipeline barrier is added to the measured pass. The values
// are resolved and read back asynchronously off the critical path (like the
// counter readback). Order here defines slot indices and the panel's display
// order. `label` is shown to the user; `help` explains the metric.
const PASS_SLOTS: { key: string; label: string; help: string }[] = [
    { key: 'merge',     label: 'Merge (zoom)',   help: 'Fusion résolu+figé en fin de zoom (MRT min-step). Ne tourne qu\'à l\'arrêt d\'un zoom.' },
    { key: 'reproject', label: 'Reprojection',   help: 'Décalage entier des pixels lors d\'un pan + effacement des bords (réutilise le calcul).' },
    { key: 'reseed',    label: 'AA reseed',      help: 'Ré-amorçage sélectif de la frontière pour un échantillon d\'anti-aliasing. Actif seulement en accumulation AA.' },
    { key: 'compute',   label: 'Itération',      help: 'Kernel fusionné brush+mandelbrot+comptage (perturbation/BLA/jet…). C\'est le cœur du coût.' },
    { key: 'resolve',   label: 'Resolve',        help: 'Conversion de l\'état sentinelle en état échappé (distance, angle de relief).' },
    { key: 'aaAccum',   label: 'Couleur (AA)',   help: 'Passe couleur accumulée dans le buffer AA (linéaire) pendant l\'accumulation.' },
    { key: 'color',     label: 'Couleur',        help: 'Passe couleur directe : palette, relief, skybox, iridescence → écran.' },
    { key: 'present',   label: 'Present (AA)',   help: 'Division de l\'accumulateur AA par le nombre d\'échantillons + sRGB → écran.' },
]
const TS_COUNT = PASS_SLOTS.length * 2

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
        // Monotonic reference-orbit id minted by the worker at every orbit restart
        // (offset 0): fresh navigator, Rust-side recenter, or budget rebuild. Chunks
        // are routed by this id — never by comparing reference coordinates.
        refId: number
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
        refId: number
        maxIterations: number
        // Which block table the payload carries: BLA/Padé records
        // (BLA_STEP_FLOATS stride, no `radii`), jet coefficient records
        // (JET_COEFF_FLOATS stride) or Möbius-c+ records (MOBIUS_COEFF_FLOATS
        // stride) — the latter two with a separate radius buffer in `radii`
        // (JET_RADII_FLOATS stride — the split "buffer de rayons").
        kind: 'bla' | 'jet' | 'mobius' | 'unified'
        steps: Float32Array<ArrayBuffer>
        radii?: Float32Array<ArrayBuffer>
        levels: Uint32Array<ArrayBuffer>
        levelCount: number
        // Worker-side table build wall-clock + unified stage mask (1 = coeffs,
        // 2 = bounds, 4 = radii) — RenderStats' "Table build" debug row.
        buildMs?: number
        buildStages?: number
    }
    | {
        type: 'error'
        jobId: number
        message: string
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

/**
 * One reference orbit as seen by the Engine. A slot is born on the first chunk
 * of a refId (always offset 0), grows strictly contiguously, and dies either
 * promoted (staging → active) or superseded by a newer refId. These invariants
 * hold by construction — chunks that would create a hole are dropped.
 */
type ReferenceSlot = {
    refId: number
    cx: string
    cy: string
    /** Total contiguous orbit steps received so far (2 floats per step: zx, zy). */
    orbitLen: number
    /** Accumulated orbit chunks, contiguous and in order (staging only; emptied on promote). */
    chunks: Float32Array<ArrayBuffer>[]
    /** Block table for this reference (arrives after the orbit completes). */
    bla: {
        kind: 'bla' | 'jet' | 'mobius' | 'unified'
        steps: Float32Array<ArrayBuffer>
        radii?: Float32Array<ArrayBuffer>
        levels: Uint32Array<ArrayBuffer>
        levelCount: number
        maxIterations: number
    } | null
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
    /** false = FULL AA (every pixel gets the whole budget); true/undefined = adaptive target map. */
    aaAdaptive?: boolean,
    palettePeriod: number,
    paletteOffset: number,
    heightPaletteShift: number,
    paletteMirror: boolean,
    colorStops: ColorStop[],
    interpolationMode: InterpolationMode,
    activateAnimate: boolean,
    debugShading: boolean,
    // Diagnostic overlay (mandelbrot_debug.wgsl): 0 = off, 1 = cost heat,
    // 2 = average applied block length, 3 = exact/low/high composition,
    // 4 = table probes per loop turn.
    debugView?: number,
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

export type ApproximationMode = 'perturbation' | 'bla' | 'pade' | 'jet' | 'mobius' | 'auto'

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
    // O(1) float-exponent decomposition computed in Rust (no decimal-string round-trip):
    // [scaleMantissa, scaleExp, dxMantissa, dxExp, dyMantissa, dyExp], value = mantissa·2^exp.
    // Preferred over re-parsing dxStr/scaleStr each frame; absent mid-zoom (uses liveScale).
    viewFloatexp?: Float64Array,
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
    rawTexture?: GPUTexture // texture "neutre" (A) — r32float array, written via textureStore only
    rawArrayView?: GPUTextureView // full 2d-array view for sampling
    /** Raw layer 0 (iter) as a 2d storage view — the reseed's write target. */
    private rawIterStorageView?: GPUTextureView
    /** Raw layers 8..12 (Taylor payload) as a 5-layer sampled array view (disjoint from layer 0). */
    private rawPayloadView?: GPUTextureView
    rawBrushTexture?: GPUTexture // texture "neutre" intermédiaire (B) — r32float array, written via textureStore only
    rawBrushArrayView?: GPUTextureView // full 2d-array view for sampling
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
    mandelbrotJetBuffer?: GPUBuffer // storage buffer: jet coefficient records (add-jet-approximation)
    mandelbrotJetRadiiBuffer?: GPUBuffer // storage buffer: jet radii (the split "buffer de rayons")
    mandelbrotJetLevelBuffer?: GPUBuffer // storage buffer: jet level directory
    private mandelbrotBlaBufferCapacity = 0
    private mandelbrotBlaLevelBufferCapacity = 0
    private mandelbrotJetBufferCapacity = 0
    private mandelbrotJetRadiiBufferCapacity = 0
    private mandelbrotJetLevelBufferCapacity = 0

    // pipelines / bindgroups
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
    // rawTexture (A) — the single production iteration path. Pan/clear frames
    // first run the reproject_cs utility pass (A→B + copy back) in the same
    // encoder, then this dispatch continues iteration; writes stay
    // proportional to the number of active pixels.
    private pipelineInplace?: GPUComputePipeline
    // Specialized in-place brush kernels, keyed by override combination so the
    // driver can dead-code-eliminate unused paths (lower register pressure,
    // higher occupancy on mobile). Currently keyed on ENABLE_DEEP (floatexp
    // subtree); ENABLE_AA is the next axis to add once the analytic-AA z″ path
    // can be gated and validated visually. Lazily built, hot combos precompiled.
    private inplacePipelineCache = new Map<string, GPUComputePipeline>()
    private inplaceModule?: GPUShaderModule
    private inplacePipelineLayout?: GPUPipelineLayout
    private inplaceBindGroupLayout?: GPUBindGroupLayout
    private bindGroupInplace?: GPUBindGroup
    // Utility compute pass (pan shift / clear stamp), ping-pong A→B.
    private pipelineReprojectCs?: GPUComputePipeline
    private bindGroupReprojectCs?: GPUBindGroup
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
    private counterBuffer?: GPUBuffer
    private workStatsBuffer?: GPUBuffer
    private counterReadbackSlots: CounterReadbackSlot[] = []
    private counterReadbackWriteIndex = 0
    private counterReadbackSequence = 0
    private latestAppliedCounterReadbackSequence = 0
    private counterReadbackGeneration = 0
    private renderFrameSerial = 0
    private lastCounterDispatchFrame = -COUNTER_SAMPLE_INTERVAL_FRAMES
    /** Number of pixels still needing work. -1 = not yet known, 0 = fully converged. */
    unfinishedPixelCount = -1
    /** Number of pixels the fused compute pass actually processes (iter == -1 + continuations).
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
    /** Absolute total applications for the current render generation — the
     *  full-generation Σ g_workSteps (block skips + exact steps) recovered from
     *  the >>6 workgroup downscale as realMean << 6. -1 = not yet known. */
    realLoopStepsApprox = -1
    // [affine, Padé, c+, jet] Σ applications (auto mode); -1 = unknown.
    tierAppsApprox: [number, number, number, number] = [-1, -1, -1, -1]
    /** Last block-table build wall-clock (worker-side, ms) and its unified
     *  stage mask (1 = coeffs, 2 = bounds, 4 = radii; −1 = non-unified table).
     *  A radii-only mask (4) is the Phase F keyframe path. */
    lastTableBuildMs = -1
    lastTableBuildStages = -1
    // workStatsBuffer accumulates on the GPU across EVERY dispatch of a render
    // generation (cleared once, here-tracked, not per dispatch), so the totals are
    // exact and deterministic — independent of which frames the CPU happens to
    // sample. -1 ⇒ not yet cleared for the current generation.
    // Work-stats SESSION: bumps only when pixel work actually restarts (mode/ε/
    // reference/resize) — NOT on mid-render table posts. Drives the GPU-side
    // stats clear so Total apps spans the whole converge-from-restart session.
    private workStatsSessionSerial = 0
    private workStatsClearedSession = -1
    private finalStatsBuffer?: GPUBuffer
    private finalStatsPending = false

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
    // FPS from the interval between actually-rendered frames (EMA). Counts every
    // rendered frame, not just iteration frames, and rejects the idle-resume gap.
    private _emaFrameMs = 0
    private _wasActive = false
    private _lastActiveRenderMs = 0
    /** Wall-clock time of the last frame actually stepped + rendered. */
    private _lastDrawMs = 0

    // tailles
    neutralSize = 0 // coté en pixels de la texture neutre (D)

    // shader sources (optionnellement remplaçables)
    shaderPassColor: string
    private f16Supported = false

    // ── Per-pass GPU timing (PerformancePanel data source) ──────────────
    // Polled by PerformancePanel.vue, same pattern as RenderStats.
    timestampCapable = false                    // adapter exposes 'timestamp-query'
    readonly passMeta = PASS_SLOTS              // labels + help for the panel
    passTimingsMs: Record<string, number> = {}  // EMA per pass (ms), over frames it ran
    passActive: Record<string, boolean> = {}    // did each pass run in the last measured frame
    passGpuSumMs = 0                            // Σ timed passes that ran (breakdown; may overlap)
    passGpuSpanMs = 0                          // authoritative GPU frame time = max(end) − min(begin)
    frameSerial = 0                            // monotonic, ++ per actually-rendered frame (one submit)
    cpuRenderMs = 0                             // render() JS wall time (CPU side of the frame)
    frameIntervalMs = 0                         // wall time between successive render() calls
    private timestampsEnabled = false
    private timestampQuerySet?: GPUQuerySet
    private tsResolveBuffer?: GPUBuffer
    private tsReadBuffer?: GPUBuffer
    private tsReadbackFree = true
    private tsSlotsUsedThisFrame = 0
    private tsPendingSlots = 0
    private lastRenderStartMs = 0

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
    // Kind of the block table currently sitting in the GPU buffers (set by
    // writeBlockTable). The frame gate requires it to MATCH the current mode:
    // after a mode switch the counters still describe the previous mode's
    // table — jet and mobius even share buffers — so blocks stay disabled
    // until the worker's repost lands.
    private currentBlockTableKind: 'bla' | 'jet' | 'mobius' | 'unified' | null = null
    private approximationMode: ApproximationMode = 'perturbation'
    private blaEpsilon = BLA_LINEARIZATION_EPSILON
    private maxBlaSkip = 65536
    // Fixed precision budget as a target scale (max zoom depth navigation stays precise at).
    // Default 1e-30 keeps shallow use fast; the Settings slider can deepen it to 1e-1000.
    // Changing it forces a full reference recompute. See fix-reference-precision-budget.
    private precisionBudget = '1e-30'
    private pendingMinibrotResolve: ((r: MinibrotResult) => void) | null = null
    // Time-to-completion of the last render session (ms). Wall includes everything;
    // GPU is the accumulated mandelbrot-pass compute (the part blocks reduce).
    lastCompletionWallMs = 0
    lastCompletionGpuMs = 0
    // Absolute total applications (Σ g_workSteps over all texels of the last
    // completed render generation), frozen at completion alongside the timings —
    // the deterministic, machine-independent cost metric for mode A/B comparison.
    lastCompletionTotalApps = -1
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
    debugViewMode = 0
    // Console/devtools override: __mandelbrotEngine.debugViewOverride = 1..4
    // wins over the Settings value (0 = follow Settings).
    debugViewOverride = 0
    private pipelineDebug?: GPURenderPipeline
    private bindGroupDebug?: GPUBindGroup
    private referenceOrbitWasReset = false

    // ── Reference slots (deferred switch) ───────────────────────────
    /**
     * The reference the shader currently uses: its orbit lives in the GPU buffer
     * and streams progressively (chunks with a matching refId are uploaded as
     * they arrive). Null when nothing renderable exists (cold start, teleport).
     */
    private activeRef: ReferenceSlot | null = null
    /**
     * A newer reference being accumulated CPU-side (worker recentered or rebuilt
     * at a new precision budget). Promoted to active at the update() boundary
     * once its orbit is long enough — superseded if an even newer refId arrives.
     */
    private stagingRef: ReferenceSlot | null = null
    /** Skip the render immediately after promoting a reference; update() used old dx/dy for that call. */
    private skipRenderOnce = false

    // HUD compatibility (RenderStats.vue): staging accumulation progress.
    get pendingRefActive(): boolean { return this.stagingRef !== null }
    get pendingRefOrbitLen(): number { return this.stagingRef?.orbitLen ?? 0 }
    get pendingRefMaxIterations(): number {
        return this.stagingRef ? Math.min(this.currentMaxIterations, ORBIT_STEP_CAPACITY) : 0
    }

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
    /** True while the raw texture's boundary band holds a jittered sample (set by
     *  reseeds / jittered full clears). A new accumulation must then recompute so
     *  its sample 0 is the unbiased unjittered base. */
    private rawJittered = false
    /** When true, AA accumulation auto-starts as soon as the view is fully converged. */
    aaAuto = false
    // ── Phase D: analytic AA (Taylor-payload expansion in the color pass) ──
    /** Master switch (auto mode only — the payload's z″ is tracked by the unified kernel). */
    aaAnalyticEnabled = true
    /** Contrast + moiré AA-target predictors (design D-contrast): Sobel on the
     *  colorized sample-0 + palette-phase Nyquist saturation, fused with the DE
     *  ramp via max in target space. Toggle for A/B tests. */
    aaContrastEnabled = true
    /** Frontier stats from the last reseed: re-iterated texels / boundary-band texels (−1 = none yet). */
    aaFrontierStamped = -1
    aaFrontierEligible = -1
    private aaFrontierBuffer?: GPUBuffer
    private aaFrontierReadback?: GPUBuffer
    private aaFrontierMapPending = false

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

    /**
     * True once the staging reference can replace the active one. With no active
     * reference (cold start, teleport) anything is better than nothing, so the
     * first chunk promotes immediately and the rest streams progressively.
     * Otherwise wait for the full visible orbit, so the old reference keeps
     * rendering until the new one is ready — the non-abrupt switch.
     */
    private stagingReady(): boolean {
        const staging = this.stagingRef
        if (!staging) return false
        if (!this.activeRef) return true
        const targetIter = Math.min(this.currentMaxIterations, ORBIT_STEP_CAPACITY - 1)
        return staging.orbitLen - 1 >= targetIter
    }

    /**
     * Promote the staging reference: upload its orbit/BLA to GPU, re-anchor the
     * front navigator, and flag orbitWasReset so the following update() clears
     * history (with the freeze-snapshot fallback keeping the last image visible).
     * Must run at the update() boundary, never in a worker callback, otherwise
     * render() can see new GPU reference data with old uniforms.
     */
    private promoteStagingReference() {
        const staging = this.stagingRef
        if (!staging) return

        // Upload the accumulated orbit — chunks are contiguous by construction.
        if (this.mandelbrotReferenceBuffer) {
            let floatOffset = 0
            for (const chunk of staging.chunks) {
                if (chunk.length > 0) {
                    this.device.queue.writeBuffer(
                        this.mandelbrotReferenceBuffer,
                        floatOffset * Float32Array.BYTES_PER_ELEMENT,
                        chunk, 0, chunk.length,
                    )
                }
                floatOffset += chunk.length
            }
        }
        staging.chunks = []

        // BLA/Padé table: the counters are ALWAYS overwritten — a table from the
        // previous reference must never survive the switch. Without a table the
        // shader falls back to exact perturbation (correct, just slower) until
        // the worker's blaReady for this refId lands.
        if (staging.bla) {
            this.writeBlockTable(staging.bla)
            this.currentBlaLevelCount = staging.bla.levelCount
            this.referenceBlaReadyMaxIterations = staging.bla.maxIterations
        } else {
            this.currentBlaLevelCount = 0
            this.referenceBlaReadyMaxIterations = 0
        }

        // Switch the main-thread reference state
        this.activeRef = staging
        this.stagingRef = null
        this.referenceWorkerCx = staging.cx
        this.referenceWorkerCy = staging.cy
        this.mandelbrotNavigator.reference_origin(staging.cx, staging.cy)

        // Set orbit length directly — NOT via markReferenceReset (which would zero it).
        // This lets the next frame use the uploaded orbit immediately.
        this.referenceAvailableOrbitLen = staging.orbitLen
        const availableIter = Math.max(0, staging.orbitLen - 1)
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
        this.activeRef = null
        this.stagingRef = null
        this.referenceJobId++
    }

    /**
     * Force a fresh reference orbit at the next update(), re-anchored at the new
     * view centre. Use for discontinuous teleports (preset load, manual coordinate
     * entry): the current orbit is geometrically useless there (dx/dy against the
     * new centre is huge), so both slots are dropped and the next update() runs
     * resetReferenceJob. Re-anchoring the shared front navigator now keeps
     * dx/dy ≈ 0 immediately.
     */
    resetReference(cx: string, cy: string) {
        console.log('[REF] Engine.resetReference (teleport)', cx.slice(0, 14))
        if (this.mandelbrotNavigator) {
            this.mandelbrotNavigator.reference_origin(cx, cy)
        }
        this.activeRef = null
        this.stagingRef = null
        this.referenceViewKey = ''
        this.needRender = true
    }

    /**
     * Start a fresh worker job (new navigator, new orbit). Two flavours:
     * - teleport / cold start (activeRef === null): nothing renderable — blank the
     *   counters so the shader idles on the frozen fallback until the first chunk
     *   of the new job promotes and streams progressively.
     * - in-place rebuild (activeRef kept — e.g. precision budget change): the
     *   current orbit stays valid and keeps rendering; the rebuilt reference
     *   arrives as staging and promotes seamlessly when complete.
     */
    private resetReferenceJob(mandelbrot: Mandelbrot, scaleString: string, maxIterations: number) {
        console.log('[REF] resetReferenceJob -> worker reset', mandelbrot.cx.slice(0, 14), 'scale', scaleString.slice(0, 10), 'maxIter', maxIterations, 'inPlace', !!this.activeRef)
        this.stagingRef = null
        if (!this.activeRef) {
            this.markReferenceReset(maxIterations)
            this.referenceBlaReadyMaxIterations = 0
            this.currentBlaLevelCount = 0
            this.referenceOrbitWasReset = true
            this.referenceWorkerCx = ''
            this.referenceWorkerCy = ''
        }
        this.isReferenceValidating = true
        this.referenceViewKey = ''
        this.referenceJobId++
        this.postReferenceWorker({
            type: 'reset',
            jobId: this.referenceJobId,
            cx: mandelbrot.cx,
            cy: mandelbrot.cy,
            scale: scaleString,
            angle: mandelbrot.angle,
            approximationMode: this.approximationMode,
            blaEpsilon: this.blaEpsilon,
            maxBlaSkip: this.maxBlaSkip,
            maxIterations,
            precisionBudget: this.precisionBudget,
        })
    }

    private syncReferenceWorkerView(mandelbrot: Mandelbrot, scaleString: string, maxIterations: number) {
        const nextKey = `${mandelbrot.cx}\n${mandelbrot.cy}\n${scaleString}\n${mandelbrot.angle}\n${maxIterations}`
        if (nextKey === this.referenceViewKey) {
            return
        }
        // Note: a view change never discards the staging reference — the worker
        // keeps extending the same orbit (same refId), or recenters and the new
        // refId supersedes staging naturally in the chunk router.
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

        if (message.type === 'orbitChunk') {
            const active = this.activeRef
            const staging = this.stagingRef

            if (active && message.refId === active.refId) {
                // ── Progressive streaming of the shader's current reference ──
                if (message.orbit.length > 0 && this.mandelbrotReferenceBuffer) {
                    this.device.queue.writeBuffer(
                        this.mandelbrotReferenceBuffer,
                        message.offset * 2 * Float32Array.BYTES_PER_ELEMENT,
                        message.orbit,
                        0,
                        message.orbit.length,
                    )
                }
                active.orbitLen = message.count
                this.referenceAvailableOrbitLen = message.count
                const availableIter = Math.max(0, message.count - 1)
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

            if (staging && message.refId === staging.refId) {
                // ── Accumulate the staging reference — chunks must stay contiguous ──
                if (message.offset !== staging.orbitLen) {
                    return // protocol guarantees contiguity; drop defensively
                }
                staging.chunks.push(message.orbit)
                staging.orbitLen = message.count
                this.isReferenceValidating = false
                // No needRender: the display (old reference) is unchanged while
                // staging accumulates; promotion runs in update() every rAF anyway.
                return
            }

            if (
                message.refId > Math.max(staging?.refId ?? 0, active?.refId ?? 0)
                && message.offset === 0
            ) {
                // ── First chunk of a newer reference → (re)start staging ──
                // Supersedes any previous staging: the worker recentered again
                // (or a fresh job started), so older accumulations are moot.
                console.log('[REF] staging new reference refId=', message.refId, 'ref=', message.referenceCx.slice(0, 14))
                this.stagingRef = {
                    refId: message.refId,
                    cx: message.referenceCx,
                    cy: message.referenceCy,
                    orbitLen: message.count,
                    chunks: [message.orbit],
                    bla: null,
                }
                this.isReferenceValidating = false
                return
            }

            // Stale refId (or a non-zero offset for an unknown reference — a hole
            // we must not accept): ignore.
            return
        }

        // ── blaReady — routed by refId, exactly like orbit chunks ──
        if (this.activeRef && message.refId === this.activeRef.refId) {
            this.writeBlockTable(message)
            this.currentBlaLevelCount = message.levelCount
            this.referenceBlaReadyMaxIterations = message.maxIterations
            if (message.buildMs !== undefined) {
                this.lastTableBuildMs = message.buildMs
                this.lastTableBuildStages = message.buildStages ?? -1
            }
            this.isReferenceValidating = false
            // BLA is a pure acceleration of the same perturbation result, so do not
            // clear history when it arrives: already-computed pixels stay valid and
            // continuations simply start using BLA. Clearing here caused a visible
            // render cut (black screen) each time the BLA table was delivered.
            this.needRender = true
            this.invalidateCounterReadback(true)
        } else if (this.stagingRef && message.refId === this.stagingRef.refId) {
            this.stagingRef.bla = {
                kind: message.kind,
                steps: message.steps,
                radii: message.radii,
                levels: message.levels,
                levelCount: message.levelCount,
                maxIterations: message.maxIterations,
            }
        }
        // else: table for a superseded reference — drop.
    }

    async initialize(mandelbrotNavigator: MandelbrotNavigator): Promise<void> {
        this.mandelbrotNavigator = mandelbrotNavigator
        // The front navigator stays at CURRENT-VIEW precision (not the budget): its coordinates
        // only feed per-frame shader uniforms and UI, and serializing them to decimal strings
        // every frame at the full budget made per-frame cost ∝ budget. The budget lives only on
        // the worker navigator (set via the reset message), which builds the reference orbit.
        this.approximationMode = (this.mandelbrotNavigator.get_approximation_mode() === 5 ? 'auto' : this.mandelbrotNavigator.get_approximation_mode() === 4 ? 'mobius' : this.mandelbrotNavigator.get_approximation_mode() === 3 ? 'jet' : this.mandelbrotNavigator.get_approximation_mode() === 2 ? 'pade' : this.mandelbrotNavigator.get_approximation_mode() === 1 ? 'bla' : 'perturbation')
        this.blaEpsilon = this.mandelbrotNavigator.get_bla_epsilon()
        this.initializeReferenceWorker()
        if (!navigator.gpu) throw new Error('WebGPU non supporté')
        this.adapter = await navigator.gpu.requestAdapter()
        if (!this.adapter) throw new Error('Adapter WebGPU introuvable')
        // shader-f16 doubles ALU throughput and halves register use for the
        // bounded shading math in the color pass (mobile win). Opt in only if
        // the adapter exposes it; the color source falls back to f32 otherwise.
        // A/B DEBUG OVERRIDE: append `?f16=off` to the URL (or run
        //   localStorage.setItem('f16','off')  / 'on' / 'auto', then reload)
        // to force the f32 path on an f16-capable device — lets you measure the
        // color-pass f16 win vs regression on a real device in ~30 s. `off`
        // forces f32; `on`/`auto`/absent = default (f16 when the adapter has it).
        const f16Override = this.readF16Override()
        const f16Available = this.adapter.features.has('shader-f16')
        this.f16Supported = f16Override === 'off' ? false : f16Available
        console.info(`[Engine] shader-f16: available=${f16Available} override=${f16Override ?? 'auto'} → active=${this.f16Supported}`)
        // Per-pass GPU timing needs the optional 'timestamp-query' feature. Often
        // absent on mobile (iOS/Safari) — the panel degrades to global metrics.
        this.timestampCapable = this.adapter.features.has('timestamp-query')
        const requiredFeatures: GPUFeatureName[] = []
        if (this.f16Supported) requiredFeatures.push('shader-f16')
        if (this.timestampCapable) requiredFeatures.push('timestamp-query')
        this.device = await this.adapter.requestDevice({ requiredFeatures })
        this.timestampsEnabled = this.timestampCapable
        console.info(`[Engine] timestamp-query: available=${this.timestampCapable} → per-pass timing ${this.timestampsEnabled ? 'ON' : 'OFF'}`)
        this.device.label = 'Engine Device'
        this.device.lost.then((info) => {
            console.warn(`GPU device lost: reason=${info.reason}, message=${info.message}`)
        })
        this.queue = this.device.queue
        this.queue.label = 'Engine Queue'
        if (this.timestampsEnabled) {
            this.timestampQuerySet = this.device.createQuerySet({ type: 'timestamp', count: TS_COUNT, label: 'Engine PerfTimestamps' })
            this.tsResolveBuffer = this.device.createBuffer({ size: TS_COUNT * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC, label: 'Engine TS Resolve' })
            this.tsReadBuffer = this.device.createBuffer({ size: TS_COUNT * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'Engine TS Readback' })
        }
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
        this.mandelbrotJetBuffer = this.device.createBuffer({
            size: 4 * JET_COEFF_FLOATS,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Jet Coeff Storage Buffer',
        })
        this.mandelbrotJetRadiiBuffer = this.device.createBuffer({
            size: 4 * JET_RADII_FLOATS,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Jet Radii Storage Buffer',
        })
        this.mandelbrotJetLevelBuffer = this.device.createBuffer({
            size: 4 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Jet Level Storage Buffer',
        })
        this.mandelbrotJetBufferCapacity = 1
        this.mandelbrotJetRadiiBufferCapacity = 1
        this.mandelbrotJetLevelBufferCapacity = 1

        // Counter buffers for GPU pixel-completion readback (2 × u32: total unfinished + active)
        this.counterBuffer = this.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'Engine Counter Storage',
        })
        // Work-instrumentation buffer (in-place compute path): 8 × u32
        // (realMean, covMean, maxAccum, maxSteps, tierAff/Pade/Cplus/Jet) —
        // see WorkStats in the shader.
        this.workStatsBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'Engine WorkStats Storage',
        })
        // Readback slots hold counter (8 B) + workStats (32 B) = 40 B, copied
        // together each sampled in-place dispatch and read as 10 × u32.
        this.counterReadbackSlots = Array.from({ length: COUNTER_READBACK_BUFFER_COUNT }, (_, index) => ({
            buffer: this.device.createBuffer({
                size: 40,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: `Engine Counter Readback ${index}`,
            }),
            pending: false,
            sequence: 0,
            generation: 0,
        }))
        this.uniformBufferMerge = this.device.createBuffer({
            size: 4 * 8, // 6 floats (zf, lzf, frozenShiftU, frozenShiftV, aspect, angle) padded to 32 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Merge',
        })

        await this._createPipelines()
        this.resize()
    }

    private async _createPipelines() {
        const moduleResolve = this.device.createShaderModule({ code: resolveShader, label: 'Engine ShaderModule Resolve' })
        // Precision specialization for the color pass. The shader declares
        // `alias hcol = f32;` (valid f32 default, used for bounded shading math);
        // when the device supports shader-f16 we enable it and swap the alias to
        // f16 so those helpers run at 2× ALU rate. Structure is identical either
        // way — only the working precision of the shading lobes changes.
        const colorCode = this.f16Supported
            ? 'enable f16;\n' + this.shaderPassColor.replace('alias hcol = f32;', 'alias hcol = f16;')
            : this.shaderPassColor
        const moduleColor = this.device.createShaderModule({ code: colorCode, label: 'Engine ShaderModule Color' })
        const moduleDebug = this.device.createShaderModule({ code: debugViewShader, label: 'Engine ShaderModule DebugView' })

        // Diagnostic overlay pipeline (block-skipping debug views). Renders a
        // fullscreen instrumented recompute straight to the swapchain.
        const layoutDebug = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 5, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 6, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 7, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
            ],
            label: 'Engine BindGroupLayout DebugView',
        })
        this.pipelineDebug = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutDebug], label: 'Engine PipelineLayout DebugView' }),
            vertex: { module: moduleDebug, entryPoint: 'vs_main' },
            fragment: { module: moduleDebug, entryPoint: 'fs_main', targets: [{ format: this.format }] },
            primitive: { topology: 'triangle-list' },
            label: 'Engine Pipeline DebugView',
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

        // 8 MRT targets for the display-side passes (resolve/merge). The raw
        // iteration path writes via textureStore and never touches MRT.
        const mrtTargets: GPUColorTargetState[] = Array.from({ length: DISPLAY_LAYERS }, () => ({ format: 'r32float' as GPUTextureFormat }))

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
                { binding: 8, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 9, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 10, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            ],
            label: 'Engine BindGroupLayout InplaceCompute',
        })
        this.inplaceModule = moduleInplace
        this.inplaceBindGroupLayout = layoutInplace
        this.inplacePipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [layoutInplace] })
        // Precompile both hot combos up front so no first-frame stall on the
        // deep⇄shallow transition. All variants share inplacePipelineLayout, so
        // bindGroupInplace (built from inplaceBindGroupLayout) is compatible with
        // every one. pipelineInplace stays the deep-capable default (used as the
        // "ready" guard and for backward compatibility).
        this.pipelineInplace = this.getInplacePipeline(true)
        this.getInplacePipeline(false)

        // ── Utility compute pass (pan/clear ping-pong A→B) ───────────────
        // Compute port of the fragment brush: reads A, rewrites B wholesale
        // (textureStore — no MRT, so the raw layer count is free to grow).
        const moduleReprojectCs = this.device.createShaderModule({ code: reprojectCsShader, label: 'Engine ShaderModule ReprojectCs' })
        const layoutReprojectCs = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'r32float', viewDimension: '2d-array' } },
            ],
            label: 'Engine BindGroupLayout ReprojectCs',
        })
        this.pipelineReprojectCs = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutReprojectCs] }),
            compute: { module: moduleReprojectCs, entryPoint: 'cs_main' },
            label: 'Engine ComputePipeline ReprojectCs',
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

        // ── AA target-map bake pipeline (DE ∪ contrast ∪ moiré → per-texel sample count) ──
        const moduleAaTarget = this.device.createShaderModule({ code: aaTargetShader, label: 'Engine ShaderModule AaTarget' })
        const layoutAaTarget = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'r32float', viewDimension: '2d' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                // Sample-0 composite (rgba16float, screen res) for the contrast ramp.
                { binding: 3, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float', viewDimension: '2d' } },
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
                // 16 × f32 (shared bake/reseed): [antialiasLevel, aaSampleIndex,
                // screenHeightPx, aaLogDelta, aaAnalytic, aspect, sceneSin,
                // sceneCos, screenWidthPx, palettePeriod, mu, logMu, aaContrast, pads]
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                label: 'Engine UniformBuffer AaParams',
            })
        }

        // ── AA selective reseed pipeline (Stage B) ───────────────────────
        const moduleAaReseed = this.device.createShaderModule({ code: aaReseedShader, label: 'Engine ShaderModule AaReseed' })
        const layoutAaReseed = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'read-write', format: 'r32float', viewDimension: '2d' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'r32float', viewDimension: '2d' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
                { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            ],
            label: 'Engine BindGroupLayout AaReseed',
        })
        this.pipelineAaReseed = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutAaReseed] }),
            compute: { module: moduleAaReseed, entryPoint: 'cs_main' },
            label: 'Engine ComputePipeline AaReseed',
        })
        // Frontier stats: [stamped, eligible] u32 pair, cleared before each reseed.
        if (!this.aaFrontierBuffer) {
            this.aaFrontierBuffer = this.device.createBuffer({
                size: 8,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
                label: 'Engine AaFrontier Storage',
            })
            this.aaFrontierReadback = this.device.createBuffer({
                size: 8,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                label: 'Engine AaFrontier Readback',
            })
        }

        // bind groups seront (ré)créés dans resize car dépend des textures
        this.bindGroupResolve = undefined
        this.bindGroupColor = undefined
        this.bindGroupColorRaw = undefined
        this.bindGroupMerge = undefined
        this.bindGroupInplace = undefined
        this.bindGroupReprojectCs = undefined
        this.bindGroupPresent = undefined
    }

    // Debug A/B override for the color-pass f16 path. Reads `?f16=` from the URL
    // first (easiest on mobile — just edit the address bar), then localStorage.
    // Returns 'off' | 'on' | 'auto' | null (null = no override → default).
    private readF16Override(): 'off' | 'on' | 'auto' | null {
        const normalize = (v: string | null): 'off' | 'on' | 'auto' | null => {
            const s = (v ?? '').trim().toLowerCase()
            return s === 'off' || s === 'on' || s === 'auto' ? s : null
        }
        try {
            const fromUrl = normalize(new URLSearchParams(window.location.search).get('f16'))
            if (fromUrl) return fromUrl
            return normalize(window.localStorage.getItem('f16'))
        } catch {
            return null
        }
    }

    // Timestamp-write descriptor for a timed pass (slot = index into PASS_SLOTS).
    // Returns undefined when timestamps are off, so callers can spread it into a
    // pass descriptor unconditionally. The shape is shared by compute and render
    // pass timestampWrites. Records the slot as used this frame.
    private tsWrites(slot: number): GPUComputePassTimestampWrites | undefined {
        if (!this.timestampsEnabled || !this.timestampQuerySet) return undefined
        this.tsSlotsUsedThisFrame |= (1 << slot)
        return { querySet: this.timestampQuerySet, beginningOfPassWriteIndex: slot * 2, endOfPassWriteIndex: slot * 2 + 1 }
    }

    // Deferred, off-critical-path readback of the resolved timestamps → per-pass
    // EMA (ms). Skips frames while a previous map is in flight (tsReadbackFree).
    private readbackTimestamps() {
        const buf = this.tsReadBuffer
        if (!buf) return
        this.tsReadbackFree = false
        const pending = this.tsPendingSlots
        void buf.mapAsync(GPUMapMode.READ).then(() => {
            try {
                const data = new BigInt64Array(buf.getMappedRange().slice(0))
                const timings: Record<string, number> = { ...this.passTimingsMs }
                const active: Record<string, boolean> = {}

                // Per-pass end−begin is UNRELIABLE on tiled/mobile GPUs: the begin
                // timestamps cluster at frame start (fast command parse; deferred
                // fragment execution), so end−begin reads as cumulative-from-start
                // rather than a real pass duration. Passes run SEQUENTIALLY on the
                // GPU timeline, so the robust partition is the gap between
                // consecutive END markers: pass duration = end − previous end (first
                // = end − min begin = frame start). This sums exactly to the frame
                // span and gives true per-shader time regardless of begin clustering.
                // (Any inter-pass copy/clear falls into the following pass's gap.)
                const ranPasses: { key: string; end: bigint }[] = []
                let minBegin = 0n, have = false
                for (let i = 0; i < PASS_SLOTS.length; i++) {
                    const key = PASS_SLOTS[i].key
                    const ran = (pending & (1 << i)) !== 0
                    active[key] = ran
                    if (!ran) continue
                    const begin = data[i * 2]
                    if (!have) { minBegin = begin; have = true }
                    else if (begin < minBegin) minBegin = begin
                    ranPasses.push({ key, end: data[i * 2 + 1] })
                }
                // Sort by end → the GPU execution order (robust to any overlap).
                ranPasses.sort((a, b) => (a.end < b.end ? -1 : a.end > b.end ? 1 : 0))
                let prevEnd = minBegin
                let sum = 0
                for (const rp of ranPasses) {
                    let ms = Number(rp.end - prevEnd) / 1e6
                    prevEnd = rp.end
                    if (!Number.isFinite(ms) || ms < 0) ms = 0
                    const prev = timings[rp.key]
                    timings[rp.key] = prev === undefined ? ms : prev * 0.8 + ms * 0.2
                    sum += timings[rp.key]
                }
                this.passTimingsMs = timings
                this.passActive = active
                this.passGpuSumMs = sum
                if (have && ranPasses.length) {
                    const spanMs = Number(ranPasses[ranPasses.length - 1].end - minBegin) / 1e6
                    this.passGpuSpanMs = this.passGpuSpanMs > 0
                        ? this.passGpuSpanMs * 0.8 + spanMs * 0.2
                        : spanMs
                }
            } catch { /* mapping raced with device loss */ }
            finally {
                try { buf.unmap() } catch { /* already unmapped */ }
                this.tsReadbackFree = true
            }
        }).catch(() => { this.tsReadbackFree = true })
    }

    // Lazily build + cache a specialized in-place kernel for the given override
    // combination. Adding an axis (e.g. AA) means extending the key and the
    // constants map here and precompiling the new hot combo at init.
    private getInplacePipeline(deep: boolean): GPUComputePipeline {
        const key = `d${deep ? 1 : 0}`
        let pipeline = this.inplacePipelineCache.get(key)
        if (!pipeline) {
            pipeline = this.device.createComputePipeline({
                layout: this.inplacePipelineLayout!,
                compute: {
                    module: this.inplaceModule!,
                    entryPoint: 'cs_main',
                    constants: { ENABLE_DEEP: deep ? 1 : 0 },
                },
                label: `Engine ComputePipeline InplaceBrush (deep=${deep})`,
            })
            this.inplacePipelineCache.set(key, pipeline)
        }
        return pipeline
    }

    private rebuildInplaceBindGroup() {
        if (!this.pipelineInplace || !this.rawArrayView || !this.uniformBufferMandelbrot
            || !this.mandelbrotReferenceBuffer || !this.mandelbrotBlaBuffer || !this.mandelbrotBlaLevelBuffer
            || !this.mandelbrotJetBuffer || !this.mandelbrotJetRadiiBuffer || !this.mandelbrotJetLevelBuffer
            || !this.uniformBufferBrush || !this.counterBuffer || !this.workStatsBuffer) {
            return
        }

        const layout = this.inplaceBindGroupLayout!
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
                { binding: 8, resource: { buffer: this.mandelbrotJetBuffer } },
                { binding: 9, resource: { buffer: this.mandelbrotJetLevelBuffer } },
                { binding: 10, resource: { buffer: this.mandelbrotJetRadiiBuffer } },
            ],
            label: 'Engine BindGroup InplaceCompute',
        })
    }

    // Rebuild the bind groups sharing the orbit/BLA/jet buffers (debug overlay
    // + in-place compute) — called whenever one of those buffers reallocates.
    private rebuildIterationBindGroups() {
        if (!this.uniformBufferMandelbrot
            || !this.mandelbrotReferenceBuffer || !this.mandelbrotBlaBuffer || !this.mandelbrotBlaLevelBuffer
            || !this.mandelbrotJetBuffer || !this.mandelbrotJetRadiiBuffer || !this.mandelbrotJetLevelBuffer) {
            return
        }

        if (this.pipelineDebug) {
            this.bindGroupDebug = this.device.createBindGroup({
                layout: this.pipelineDebug.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferMandelbrot } },
                    { binding: 1, resource: { buffer: this.mandelbrotReferenceBuffer } },
                    { binding: 2, resource: { buffer: this.mandelbrotBlaBuffer } },
                    { binding: 3, resource: { buffer: this.mandelbrotBlaLevelBuffer } },
                    { binding: 5, resource: { buffer: this.mandelbrotJetBuffer } },
                    { binding: 6, resource: { buffer: this.mandelbrotJetLevelBuffer } },
                    { binding: 7, resource: { buffer: this.mandelbrotJetRadiiBuffer } },
                ],
                label: 'Engine BindGroup DebugView',
            })
        }

        this.rebuildInplaceBindGroup()
    }

    // Upload a worker-built block table into the buffers of its kind. The level
    // directories share the 4-u32 stride; only the step stride differs. Jet
    // tables carry a second array (`radii`, the split "buffer de rayons").
    private writeBlockTable(table: { kind: 'bla' | 'jet' | 'mobius' | 'unified', steps: Float32Array<ArrayBuffer>, radii?: Float32Array<ArrayBuffer>, levels: Uint32Array<ArrayBuffer>, levelCount: number }) {
        this.currentBlockTableKind = table.kind
        if (table.kind === 'jet' || table.kind === 'mobius' || table.kind === 'unified') {
            // Mobius tables live in the jet buffers (same 12 B element type,
            // exclusive modes): only the block stride differs, and the shader
            // indexes by the mode flag. The coeff capacity is tracked in
            // jet-entry units (27 floats) — a float-count ceiling covers the
            // denser mobius records; the radii sidecar is sized on its own
            // block count (mobius has 27/18 more blocks per coeff float).
            const blockCount = Math.ceil(
                table.steps.length / (table.kind === 'mobius' ? MOBIUS_COEFF_FLOATS : JET_COEFF_FLOATS), // unified = 27 floats = jet stride
            )
            this.ensureJetBufferCapacity(Math.ceil(table.steps.length / JET_COEFF_FLOATS))
            // Unified sidecars carry 10 extra entries (the SA prefix +
            // periodic-block header) beyond the per-block records — size on
            // the actual array.
            this.ensureJetRadiiBufferCapacity(Math.max(blockCount, Math.ceil((table.radii?.length ?? 0) / 4)))
            this.ensureJetLevelBufferCapacity(table.levelCount)
            const radii = table.radii
            if (table.steps.length > 0 && this.mandelbrotJetBuffer) {
                this.device.queue.writeBuffer(this.mandelbrotJetBuffer, 0, table.steps, 0, table.steps.length)
            }
            if (radii && radii.length > 0 && this.mandelbrotJetRadiiBuffer) {
                this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer, 0, radii, 0, radii.length)
            }
            if (table.levels.length > 0 && this.mandelbrotJetLevelBuffer) {
                this.device.queue.writeBuffer(this.mandelbrotJetLevelBuffer, 0, table.levels, 0, table.levels.length)
            }
            return
        }
        this.ensureBlaBufferCapacity(table.steps.length / BLA_STEP_FLOATS)
        this.ensureBlaLevelBufferCapacity(table.levelCount)
        if (table.steps.length > 0 && this.mandelbrotBlaBuffer) {
            this.device.queue.writeBuffer(this.mandelbrotBlaBuffer, 0, table.steps, 0, table.steps.length)
        }
        if (table.levels.length > 0 && this.mandelbrotBlaLevelBuffer) {
            this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer, 0, table.levels, 0, table.levels.length)
        }
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
        this.rebuildIterationBindGroups()
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
        this.rebuildIterationBindGroups()
    }

    private ensureJetBufferCapacity(requiredEntries: number) {
        const safeRequiredEntries = Math.max(1, Math.ceil(requiredEntries))
        if (safeRequiredEntries <= this.mandelbrotJetBufferCapacity) {
            return
        }
        this.mandelbrotJetBuffer?.destroy?.()
        this.mandelbrotJetBuffer = this.device.createBuffer({
            size: safeRequiredEntries * 4 * JET_COEFF_FLOATS,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Jet Coeff Storage Buffer',
        })
        this.mandelbrotJetBufferCapacity = safeRequiredEntries
        // The radius buffer is index-aligned with the coefficient buffer, so it
        // must hold the same number of blocks.
        this.ensureJetRadiiBufferCapacity(safeRequiredEntries)
        this.rebuildIterationBindGroups()
    }

    private ensureJetRadiiBufferCapacity(requiredEntries: number) {
        const safeRequiredEntries = Math.max(1, Math.ceil(requiredEntries))
        if (safeRequiredEntries <= this.mandelbrotJetRadiiBufferCapacity) {
            return
        }
        this.mandelbrotJetRadiiBuffer?.destroy?.()
        this.mandelbrotJetRadiiBuffer = this.device.createBuffer({
            size: safeRequiredEntries * 4 * JET_RADII_FLOATS,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Jet Radii Storage Buffer',
        })
        this.mandelbrotJetRadiiBufferCapacity = safeRequiredEntries
        this.rebuildIterationBindGroups()
    }

    private ensureJetLevelBufferCapacity(requiredEntries: number) {
        const safeRequiredEntries = Math.max(1, Math.ceil(requiredEntries))
        if (safeRequiredEntries <= this.mandelbrotJetLevelBufferCapacity) {
            return
        }
        this.mandelbrotJetLevelBuffer?.destroy?.()
        this.mandelbrotJetLevelBuffer = this.device.createBuffer({
            size: safeRequiredEntries * 4 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Jet Level Storage Buffer',
        })
        this.mandelbrotJetLevelBufferCapacity = safeRequiredEntries
        this.rebuildIterationBindGroups()
    }

    // One-off exact stats copy at render completion: counter+workStats hold
    // the session totals on the GPU; a standalone 40 B copy + map gives the
    // deterministic Σ regardless of readback sampling alignment. Discarded if
    // a new session starts before it lands.
    private requestFinalStatsReadback() {
        if (!this.device || !this.workStatsBuffer || !this.counterBuffer || this.finalStatsPending) {
            return
        }
        if (!this.finalStatsBuffer) {
            this.finalStatsBuffer = this.device.createBuffer({
                size: 40,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: 'Engine Final Stats Readback',
            })
        }
        const session = this.workStatsSessionSerial
        const encoder = this.device.createCommandEncoder({ label: 'Engine Final Stats Copy' })
        encoder.copyBufferToBuffer(this.counterBuffer, 0, this.finalStatsBuffer, 0, 8)
        encoder.copyBufferToBuffer(this.workStatsBuffer, 0, this.finalStatsBuffer, 8, 32)
        this.device.queue.submit([encoder.finish()])
        this.finalStatsPending = true
        void (async () => {
            let mapped = false
            try {
                await this.finalStatsBuffer!.mapAsync(GPUMapMode.READ)
                mapped = true
                if (session !== this.workStatsSessionSerial) {
                    return // a new session started: totals belong to it now
                }
                const data = new Uint32Array(this.finalStatsBuffer!.getMappedRange())
                const realMean = data[2]
                const covMean = data[3]
                if (realMean > 0 && covMean / realMean >= 1) {
                    this.realLoopStepsApprox = realMean * 64
                    this.tierAppsApprox = [data[6], data[7], data[8], data[9]]
                    this.lastCompletionTotalApps = this.realLoopStepsApprox
                }
            } catch {
                // Device loss / buffer destruction can reject the map.
            } finally {
                if (mapped) {
                    this.finalStatsBuffer!.unmap()
                }
                this.finalStatsPending = false
            }
        })()
    }

    // `preserveWorkStats = true` is the TABLE-POST variant: a blaReady mid-
    // render continues the SAME work session, so the GPU-side Σ apps keeps
    // accumulating and the CPU mirrors stay provisional instead of resetting —
    // zeroing here was why auto/mobius froze Total apps at −1 (the short
    // post-table reconvergence ended before any sampled readback landed).
    private invalidateCounterReadback(preserveWorkStats = false) {
        this.unfinishedPixelCount = -1
        this.activePixelCount = -1
        this.realizedSkip = -1
        this.workgroupWaste = -1
        this.maxPixelSteps = -1
        if (!preserveWorkStats) {
            this.realLoopStepsApprox = -1
            this.tierAppsApprox = [-1, -1, -1, -1]
            // Next in-place dispatch re-clears workStats for the new session.
            this.workStatsSessionSerial++
        }
        this.counterReadbackGeneration++
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
                const tierApps: [number, number, number, number] = [data[6], data[7], data[8], data[9]]
                this.applyCounterReadback(sequence, generation, frame, unfinished, active, realMean, covMean, maxAccum, maxSteps, tierApps)
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

    private applyCounterReadback(sequence: number, generation: number, frame: number, unfinished: number, active: number, realMean = 0, covMean = 0, maxAccum = 0, maxSteps = 0, tierApps: [number, number, number, number] = [0, 0, 0, 0]) {
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
                this.realLoopStepsApprox = realMean * 64
                // Tier mix (auto mode): per-tier Σ block applications — RAW
                // counters (no downscale shader-side: block applications per
                // workgroup per dispatch are small and would round to zero).
                this.tierAppsApprox = [tierApps[0], tierApps[1], tierApps[2], tierApps[3]]
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

        // Helper: create an r32float texture array + per-layer 2d views + full 2d-array view
        const createLayeredTexture = (label: string, layerCount: number, extraUsage: GPUTextureUsageFlags = 0): {
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
        const rawResult = createLayeredTexture('Engine RawTexture (A)', RAW_LAYERS, GPUTextureUsage.STORAGE_BINDING)
        this.rawTexture = rawResult.texture
        this.rawArrayView = rawResult.arrayView
        // Phase D reseed views: layer 0 storage (stamp target) + layers 8..12
        // sampled (Taylor payload) — disjoint subresources, usable in one dispatch.
        this.rawIterStorageView = rawResult.layerViews[0]
        this.rawPayloadView = this.rawTexture.createView({
            dimension: '2d-array',
            baseArrayLayer: 8,
            arrayLayerCount: 5,
            label: 'Engine RawTexture (A) PayloadView',
        })

        // STORAGE_BINDING: the utility compute pass (reproject_cs) writes B
        // as a write-only storage texture array.
        const brushResult = createLayeredTexture('Engine RawBrushTexture (B)', RAW_LAYERS, GPUTextureUsage.STORAGE_BINDING)
        this.rawBrushTexture = brushResult.texture
        this.rawBrushArrayView = brushResult.arrayView

        const resolvedResult = createLayeredTexture('Engine ResolvedTexture', DISPLAY_LAYERS)
        this.resolvedTexture = resolvedResult.texture
        this.resolvedArrayView = resolvedResult.arrayView
        this.resolvedLayerViews = resolvedResult.layerViews

        const frozenResult = createLayeredTexture('Engine FrozenTexture', DISPLAY_LAYERS)
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
        if (this.pipelineAaTarget && this.rawArrayView && this.uniformBufferAaTarget && this.accumTextureView) {
            this.bindGroupAaTarget = this.device.createBindGroup({
                layout: this.pipelineAaTarget.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.rawArrayView },
                    { binding: 1, resource: this.aaTargetTextureView },
                    { binding: 2, resource: { buffer: this.uniformBufferAaTarget } },
                    { binding: 3, resource: this.accumTextureView },
                ],
                label: 'Engine BindGroup AaTarget',
            })
        }
        if (this.pipelineAaReseed && this.rawIterStorageView && this.rawPayloadView
            && this.uniformBufferAaTarget && this.aaFrontierBuffer) {
            this.bindGroupAaReseed = this.device.createBindGroup({
                layout: this.pipelineAaReseed.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.aaTargetTextureView },
                    { binding: 1, resource: this.rawIterStorageView },
                    { binding: 2, resource: { buffer: this.uniformBufferAaTarget } },
                    { binding: 3, resource: this.rawPayloadView },
                    { binding: 4, resource: { buffer: this.aaFrontierBuffer } },
                ],
                label: 'Engine BindGroup AaReseed',
            })
        }
        // Resetting textures invalidates any in-flight AA accumulation.
        this.resetAaState()

        // Reset zoom reprojection state on resize
        this.zoomState = resetZoomState()

        // Re-création des bind groups dépendant des textures
        this.rebuildIterationBindGroups()

        if (this.pipelineReprojectCs) {
            this.bindGroupReprojectCs = this.device.createBindGroup({
                layout: this.pipelineReprojectCs.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferBrush! } },
                    { binding: 1, resource: this.rawArrayView! },
                    { binding: 2, resource: this.rawBrushArrayView! },
                ],
                label: 'Engine BindGroup ReprojectCs',
            })
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
        } else if (mode === 'jet') {
            this.mandelbrotNavigator.use_jet()
        } else if (mode === 'mobius') {
            this.mandelbrotNavigator.use_mobius_cplus()
        } else if (mode === 'auto') {
            this.mandelbrotNavigator.use_unified()
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

    /** Block-skipping diagnostic overlay: 0 off, 1 cost, 2 skip, 3 mix, 4 probes. */
    setDebugView(mode: number) {
        const next = Math.max(0, Math.round(mode))
        if (next === this.debugViewMode) {
            return
        }
        this.debugViewMode = next
        this.needRender = true
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
        // ε sets the validity radius (ε·|A| affine, √ε·|A| Padé, the certified
        // (V) radii for jet/mobius), so a change must rebuild the table and
        // re-render in any block-jump mode.
        if (this.approximationMode === 'bla' || this.approximationMode === 'pade' || this.approximationMode === 'jet' || this.approximationMode === 'mobius' || this.approximationMode === 'auto') {
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
        // The budget applies to the WORKER navigator only (carried by the reset message below);
        // the front navigator stays at current-view precision so per-frame cost is not ∝ budget.
        // Force the next update() to take the reset branch (resetReferenceJob). The current
        // reference (activeRef) is kept: it stays geometrically valid and keeps rendering
        // while the rebuilt-at-new-budget orbit accumulates as staging, then promotes
        // seamlessly — no blank frame on a budget change.
        this.referenceViewKey = ''
        this.needRender = true
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
        if (this.approximationMode === 'bla' || this.approximationMode === 'pade' || this.approximationMode === 'jet' || this.approximationMode === 'mobius' || this.approximationMode === 'auto') {
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
            // Provisional: the last sampled readback (may miss tail dispatches
            // or read −1 right after a table post). The exact figure lands via
            // the final readback and overwrites it.
            this.lastCompletionTotalApps = this.realLoopStepsApprox
            this.completionTimerActive = false
            this.requestFinalStatsReadback()
        }

        this.debugShadingActive = renderOptions.debugShading
        if (this.debugViewOverride > 0) {
            this.debugViewMode = this.debugViewOverride
        }

        if (this.stagingReady()) {
            this.promoteStagingReference()
            return
        }

        const navigatorApproximationMode: ApproximationMode = (this.mandelbrotNavigator.get_approximation_mode() === 5 ? 'auto' : this.mandelbrotNavigator.get_approximation_mode() === 4 ? 'mobius' : this.mandelbrotNavigator.get_approximation_mode() === 3 ? 'jet' : this.mandelbrotNavigator.get_approximation_mode() === 2 ? 'pade' : this.mandelbrotNavigator.get_approximation_mode() === 1 ? 'bla' : 'perturbation')
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
            // Invalidate the frozen fallback: it still holds the OLD mode's
            // completed image. clearHistoryNextFrame wipes only the live texture,
            // so without this the color pass composites old-mode frozen pixels
            // (step=1) against the new mode's coarse in-progress pixels via
            // min-step-wins — a visible old/new "mix" that resolves slowly. A
            // mode switch keeps the same reference orbit and view, so the new
            // mode recomputes cleanly; a fresh frozen snapshot is recaptured on
            // completion. (Not gated on zoom: mid-zoom mode changes are rare and
            // the zoom path owns frozenAligned itself.)
            this.frozenAligned = false
            this.needFreezeSnapshot = false
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

        // Phase D analytic AA: current sample's jitter δc as unit direction +
        // ln|δc| (exponent-summed with the payload's S in the shader, so deep
        // scales never underflow the f32 uniform). ln(scale) MUST come from the
        // same full-precision source the compute path uses to build δc
        // (scaleStr/viewFloatexp) — the raw numeric `mandelbrot.scale` field
        // diverges from the true scale in deep zoom, and feeding its wrong log
        // here made the reconstructed ẑ off by orders of magnitude (fast but
        // integer-ν/palette-shifted deep render, field report 2026-07-07).
        const aaJitterMag = Math.hypot(this.aaOffsetX, this.aaOffsetY)
        const lnScale = this.currentLnScale()
        const aaJitterLogMag = aaJitterMag > 0 && Number.isFinite(lnScale)
            ? Math.log(aaJitterMag) + lnScale
            : 0

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
            aaJitterMag > 0 ? this.aaOffsetX / aaJitterMag : 0, // 60: aaJitterHatX (δc unit direction)
            aaJitterMag > 0 ? this.aaOffsetY / aaJitterMag : 0, // 61: aaJitterHatY
            Number.isFinite(aaJitterLogMag) ? aaJitterLogMag : 0, // 62: aaJitterLogMag (ln|δc|, c units)
            0,                                    // 63: aaAnalytic (finalized in render() once skipResolve is known)
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
        // floatexp source: prefer the O(1) Rust decomposition (viewFloatexp =
        // [scaleM, scaleE, dxM, dxE, dyM, dyE]) over re-parsing decimal strings every frame —
        // that round-trip's cost grew with the navigator precision. Fall back to the strings,
        // then to the f64 fields. During a zoom the live scale drives expScale (the navigator
        // scale lags), so use the numeric path for scale while it animates.
        const zooming = isZoomActive(this.zoomState) && getLiveScale(this.zoomState) > 0
        const fe = mandelbrot.viewFloatexp
        const scaleParts = zooming
            ? frexpFloat32(computeScale)
            : (fe ? { mantissa: fe[0], exponent: fe[1] }
                  : (mandelbrot.scaleStr ? frexpFromDecimalString(mandelbrot.scaleStr) : frexpFloat32(computeScale)))
        const expScale = scaleParts.exponent
        const deep = expScale <= DEEP_EXP_THRESHOLD
        this.floatExpActive = deep
        // cx/cy mantissas re-based onto the shared scale exponent. Decomposing
        // each component first (rather than dx * 2^-expScale) avoids ever forming
        // a huge/overflowing power and handles a zero component cleanly. Since
        // |center − reference| ≈ scale, the rebased exponent gap is small.
        const cxParts = fe ? { mantissa: fe[2], exponent: fe[3] }
            : (mandelbrot.dxStr ? frexpFromDecimalString(mandelbrot.dxStr) : frexpFloat32(mandelbrot.dx))
        const cyParts = fe ? { mantissa: fe[4], exponent: fe[5] }
            : (mandelbrot.dyStr ? frexpFromDecimalString(mandelbrot.dyStr) : frexpFloat32(mandelbrot.dy))
        // Guard the zero component: a 0 mantissa with a deep expScale would form
        // 0 · 2^(huge) = 0 · Infinity = NaN.
        const cxMant = cxParts.mantissa === 0 ? 0 : Math.fround(cxParts.mantissa * 2 ** (cxParts.exponent - expScale))
        const cyMant = cyParts.mantissa === 0 ? 0 : Math.fround(cyParts.mantissa * 2 ** (cyParts.exponent - expScale))

        // Full-precision scale string for the worker: parseFloat underflows to 0
        // past ~1e-308, which would zero the Rust recenter threshold (20·scale)
        // and make every micro-pan rebuild the whole orbit. During an active zoom
        // the f64 live scale drives the cycle (the navigator scale lags the
        // animation) and is safely above the underflow floor.
        const workerScaleString = zooming
            ? computeScale.toString()
            : (mandelbrot.scaleStr ?? computeScale.toString())
        if (!this.referenceViewKey) {
            console.log('[REF] update: reset branch (key empty) | deep', deep, 'expScale', expScale, 'mode', this.approximationMode)
            this.resetReferenceJob(mandelbrot, workerScaleString, maxIterations)
        }
        this.syncReferenceWorkerView(mandelbrot, workerScaleString, maxIterations)

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
        // A jet/mobius table built for FEWER iterations than the current target
        // is still sound: its blocks cover a prefix of the same orbit (slot
        // bounds reject anything past it, the tail runs exact) and radii only
        // get MORE conservative as c_max shrinks on zoom-in. Requiring full
        // coverage — as BLA/Padé do — would disable these modes during the
        // whole zoom (their rebuilds are throttled worker-side because they
        // cost ~10-20× a BLA build).
        const prefixTableMode = this.approximationMode === 'jet' || this.approximationMode === 'mobius' || this.approximationMode === 'auto'
        const tableCoversView = prefixTableMode
            ? this.referenceBlaReadyMaxIterations > 0
            : this.referenceBlaReadyMaxIterations >= guardedMaxIter
        // Active-table audit: the counters describe the LAST posted table, which
        // after a mode switch is still the previous mode's (jet and mobius even
        // share GPU buffers with different strides). Blocks stay disabled until
        // the worker posts a table of the current mode's kind.
        const expectedTableKind = this.approximationMode === 'jet' ? 'jet'
            : this.approximationMode === 'mobius' ? 'mobius'
            : this.approximationMode === 'auto' ? 'unified'
            : 'bla'
        const blocksReady = (this.approximationMode === 'bla' || this.approximationMode === 'pade' || this.approximationMode === 'jet' || this.approximationMode === 'mobius' || this.approximationMode === 'auto')
            && orbitComplete
            && this.currentBlaLevelCount > 0
            && this.currentBlockTableKind === expectedTableKind
            && tableCoversView
        const approximationModeFlag = blocksReady
            ? (this.approximationMode === 'auto' ? 5 : this.approximationMode === 'mobius' ? 4 : this.approximationMode === 'jet' ? 3 : this.approximationMode === 'pade' ? 2 : 1)
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
            this.debugViewMode,  // iterationOffset slot — recycled as debugView
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
        this.aaFrontierStamped = -1
        this.aaFrontierEligible = -1
    }

    /**
     * Phase D analytic-AA parameters: ln of the sub-pixel jitter half-extent δ
     * in c units (the margin test's denominator) and the master eligibility.
     * Analytic AA needs the unified kernel's z″ payload, so it is auto-mode only;
     * it also disables below f64 scale (the log turns −∞).
     */
    /**
     * Full-precision ln(view scale) — from the same decimal/floatexp source the
     * compute path builds δc from (NOT the raw numeric `mandelbrot.scale` field,
     * which diverges from the true scale in deep zoom). −∞ when unavailable.
     */
    private currentLnScale(): number {
        const m = this.previousMandelbrot
        if (m?.viewFloatexp) {
            return m.viewFloatexp[1] * Math.LN2 + Math.log(Math.abs(m.viewFloatexp[0]) || 1)
        }
        if (m?.scaleStr) {
            return log2FromDecimalString(m.scaleStr) * Math.LN2
        }
        const s = m?.scale ?? 0
        return s > 0 ? Math.log(s) : Number.NEGATIVE_INFINITY
    }

    private aaAnalyticParams(aspect: number, lnScale?: number): { logDelta: number; enabled: boolean } {
        const ln = lnScale ?? this.currentLnScale()
        const neutralExtent = Math.sqrt(aspect * aspect + 1)
        // δ = max jitter magnitude: box components |j| ≤ 0.5 → magnitude ≤ √2·0.5,
        // ×(2·extent/size) per texel (the same scale the state machine applies),
        // × scale. Uses the full-precision ln(scale) so the reseed margin denom
        // matches the actual deep δc (the raw-scale bug tagged deep pixels wrong).
        const logDelta = Number.isFinite(ln)
            ? Math.log(Math.SQRT2 * neutralExtent / Math.max(1, this.neutralSize)) + ln
            : Number.NEGATIVE_INFINITY
        const enabled = this.aaAnalyticEnabled
            && this.approximationMode === 'auto'
            && Number.isFinite(logDelta)
        // Deep re-enabled (2026-07-07, third attempt — root cause found in the
        // KERNEL this time): try_apply_unified's z″ tier update computed at the
        // old derS scale overflowed on deep blocks (coefficient exponents ~±133
        // exceed the ldexp/exp clamps; ΔS ≈ +92 per big block saturated the
        // rescale) → NaN sndM → Metal's max(NaN, x) laundered the reseed margin
        // into an auto-pass. Fixed by per-term new-scale folding + finite
        // guards in the reseed and color passes.
        return { logDelta, enabled }
    }

    /** Map the frontier stats readback (once per reseed; skipped while a map is in flight). */
    private readbackAaFrontier() {
        const buf = this.aaFrontierReadback
        if (!buf || this.aaFrontierMapPending) {
            return
        }
        this.aaFrontierMapPending = true
        buf.mapAsync(GPUMapMode.READ).then(() => {
            const d = new Uint32Array(buf.getMappedRange().slice(0))
            buf.unmap()
            this.aaFrontierStamped = d[0]
            this.aaFrontierEligible = d[1]
            this.aaFrontierMapPending = false
        }).catch(() => {
            this.aaFrontierMapPending = false
        })
    }

    /**
     * Explicitly start idle-time AA accumulation. Intended to be called when the
     * view is fully converged and idle (from a UI button / shortcut). Accumulation
     * never starts automatically; any navigation/param change aborts it.
     */
    triggerAaAccumulation() {
        this.resetAaState()
        // A previous accumulation left the boundary band at its LAST sample's
        // jitter; recompute so sample 0 is the unjittered base again (unbiased
        // mean, deterministic A/B re-runs).
        if (this.rawJittered) {
            this.clearHistoryNextFrame = true
            this.invalidateCounterReadback()
        }
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

        if (!this.pipelineInplace
            || !this.pipelineReprojectCs
            || !this.pipelineResolve
            || !this.pipelineColor
        ) {
            return
        }
        if (!this.bindGroupInplace
            || !this.bindGroupReprojectCs
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
            // See `src/assets/reproject_cs.wgsl` translation reprojection logic.
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
        // active pixels (those the fused compute pass actually processes).  This
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
        let aaFrontierCopyScheduled = false

        // Frame timing: wall interval between render() calls (the true frame
        // budget) and CPU-side render() duration. tsSlotsUsedThisFrame resets so
        // tsWrites() can record which passes actually ran this frame.
        const renderStartMs = performance.now()
        this.frameIntervalMs = this.lastRenderStartMs ? renderStartMs - this.lastRenderStartMs : 0
        this.lastRenderStartMs = renderStartMs
        this.tsSlotsUsedThisFrame = 0
        // Rendering FPS from the active-frame interval (EMA). Counts every frame
        // that actually renders — not only iteration frames. lastRenderStartMs is
        // reset to 0 in _loop on idle→active resume, so the stale gap is skipped
        // here (frameIntervalMs === 0). The <5000 guard drops any pathological gap.
        if (this.frameIntervalMs > 0 && this.frameIntervalMs < 5000) {
            this._emaFrameMs = this._emaFrameMs > 0
                ? this._emaFrameMs * 0.85 + this.frameIntervalMs * 0.15
                : this.frameIntervalMs
            this.fps = Math.round(1000 / this._emaFrameMs)
        }
        this._lastActiveRenderMs = renderStartMs

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
            // 1) Copy frozen → rawBrushTexture (temp read-only copy of frozen;
            //    B has 9 layers, frozen 8 — copy the 8 display layers)
            commandEncoder.copyTextureToTexture(
                { texture: this.frozenTexture },
                { texture: this.rawBrushTexture },
                { width: texSize, height: texSize, depthOrArrayLayers: DISPLAY_LAYERS },
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
                timestampWrites: this.tsWrites(0),
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
            const layerCount = DISPLAY_LAYERS
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

        // ── Frame passes ─────────────────────────────────────────────────
        // Single production iteration path: the fused in-place compute.
        // Pan and clear frames first run the ping-pong utility pass
        // (reproject_cs A→B + copy B→A) — the neighbour gather is race-free
        // because A is read-only during that pass — then the same frame's
        // in-place dispatch continues iteration on A.
        const utilityNeeded = this.clearHistoryNextFrame || hasTranslationShift

        // Track frames that may mutate A: utility frames rewrite it wholesale;
        // in-place frames only write when work remains (unknown counts are
        // conservatively treated as a mutation).
        if (utilityNeeded || this.unfinishedPixelCount !== 0 || this.activePixelCount !== 0) {
            this.lastRawMutationFrame = frameSerial
        }

        {
            if (utilityNeeded) {
                // Utility pass: pan gather / clear stamp / sentinel refinement,
                // A→B, then B is copied back so iteration proceeds on A.
                const utilPass = commandEncoder.beginComputePass({ timestampWrites: this.tsWrites(1) })
                utilPass.setPipeline(this.pipelineReprojectCs!)
                utilPass.setBindGroup(0, this.bindGroupReprojectCs!)
                const uwg = Math.ceil(this.neutralSize / 16)
                utilPass.dispatchWorkgroups(uwg, uwg)
                utilPass.end()
                commandEncoder.copyTextureToTexture(
                    { texture: this.rawBrushTexture },
                    { texture: this.rawTexture },
                    { width: this.neutralSize, height: this.neutralSize, depthOrArrayLayers: RAW_LAYERS },
                )
            }
            // Stage B selective reseed: stamp the boundary sliver (target > sample
            // index) as compute requests so only it reconverges with the new jitter;
            // frozen texels are left as-is and skipped by the fused pass below.
            // Phase D: margin-passing escaped texels are tagged analytic-OK instead
            // of stamped — the color pass expands their Taylor payload per sample.
            if (this.aaReseedPending && this.pipelineAaReseed && this.bindGroupAaReseed && this.uniformBufferAaTarget) {
                const aaLevel = Math.max(1, Math.round(renderOptions.antialiasLevel ?? 1))
                const aaAnalytic = this.aaAnalyticParams(aspect)
                this.device.queue.writeBuffer(
                    this.uniformBufferAaTarget,
                    0,
                    new Float32Array([
                        aaLevel, this.aaSampleIndex, this.height,
                        aaAnalytic.enabled ? aaAnalytic.logDelta : 0,
                        aaAnalytic.enabled ? 1 : 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // bake-only fields, unused by the reseed
                    ]).buffer,
                )
                if (this.aaFrontierBuffer) {
                    commandEncoder.clearBuffer(this.aaFrontierBuffer, 0, 8)
                }
                const reseedPass = commandEncoder.beginComputePass({ timestampWrites: this.tsWrites(2) })
                reseedPass.setPipeline(this.pipelineAaReseed)
                reseedPass.setBindGroup(0, this.bindGroupAaReseed)
                const rwg = Math.ceil(this.neutralSize / 16)
                reseedPass.dispatchWorkgroups(rwg, rwg)
                reseedPass.end()
                // The stamped band reconverges at this sample's (non-zero) jitter.
                this.rawJittered = true
                if (this.aaFrontierBuffer && this.aaFrontierReadback && !this.aaFrontierMapPending) {
                    commandEncoder.copyBufferToBuffer(this.aaFrontierBuffer, 0, this.aaFrontierReadback, 0, 8)
                    aaFrontierCopyScheduled = true
                }
                this.aaReseedPending = false
            }
            // Fused brush+mandelbrot+count: a single compute dispatch working
            // in place on A.  Finished texels generate zero texture writes,
            // replacing passes 0/1, the B→A copy and the count pass.
            commandEncoder.clearBuffer(this.counterBuffer!, 0, 8)
            // workStats accumulates across the whole render generation — clear it
            // only on the generation's first in-place dispatch, then let every
            // dispatch atomicAdd into it (exact, sampling-independent totals).
            if (this.workStatsClearedSession !== this.workStatsSessionSerial) {
                commandEncoder.clearBuffer(this.workStatsBuffer!, 0, 32)
                this.workStatsClearedSession = this.workStatsSessionSerial
            }
            const computePass = commandEncoder.beginComputePass({ timestampWrites: this.tsWrites(3) })
            // Shallow views (scaleExp > DEEP_EXP) never enter the floatexp deep
            // path, so run the DCE'd shallow kernel; floatExpActive is set from
            // expScale <= DEEP_EXP_THRESHOLD earlier this frame.
            computePass.setPipeline(this.getInplacePipeline(this.floatExpActive))
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
                commandEncoder.copyBufferToBuffer(this.workStatsBuffer!, 0, counterReadbackSlot.buffer, 8, 32)
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
        const skipResolve = !!this.bindGroupColorRaw
            && !this.needFreezeSnapshot
            && !this.needMergeSnapshot
            && this.unfinishedPixelCount === 0
            && this.activePixelCount === 0
            && this.counterSampleFrame >= this.lastRawMutationFrame
        this.resolveSkipped = skipResolve

        // Fully converged: safe to capture an AA sample. No pending history clear,
        // no freeze/merge, not zooming, orbit complete, pixel counts known and at
        // (or below) the SAME idle threshold the render loop uses — requiring
        // exactly 0 deadlocked AA on any view that idles with a few stuck pixels
        // (needsMoreFrames stops driving frames at ≤ threshold, so the counters
        // never reach 0 and the composite never fired: "AA ne se déclenche pas").
        const fullyConverged =
            !this.clearHistoryNextFrame
            && !this.needFreezeSnapshot
            && !this.needMergeSnapshot
            && !isZoomActive(this.zoomState)
            && !this.orbitIncomplete
            && this.unfinishedPixelCount >= 0
            && this.unfinishedPixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD
            && this.activePixelCount >= 0
            && this.activePixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD
            && !this.hasPendingCounterReadbackForCurrentGeneration()

        if (!skipResolve) {
            // Pre-fill resolved with A so resolve.wgsl can discard pass-through
            // pixels and only write sentinels / unfinished anchors that need snapping.
            // A has 9 layers, resolved 8 — the continuation-only layer 8 is
            // never displayed, copy the 8 display layers.
            commandEncoder.copyTextureToTexture(
                { texture: this.rawTexture },
                { texture: this.resolvedTexture },
                { width: this.neutralSize, height: this.neutralSize, depthOrArrayLayers: DISPLAY_LAYERS },
            )

            // Pass 2: resolve des sentinelles (A -> resolved)
            const rpassResolve = commandEncoder.beginRenderPass({
                colorAttachments: makeMrtAttachments(this.resolvedLayerViews, 'load'),
                timestampWrites: this.tsWrites(4),
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
        // Suppressed while animations run: time-driven coloring changes between
        // samples would smear the average, and the persisted result would freeze
        // the animation — manual triggering stays the user's explicit choice.
        if (this.aaAuto
            && antialiasLevel > 1
            && !renderOptions.activateAnimate
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
        // NOT gated on aaActive: after completion (aaActive false) the average
        // must SURVIVE later frames — with animations or other needRender sources
        // active, the first post-completion frame used to fall back to the direct
        // path and silently drop the accumulated AA ("rebascule sans AA"). Any
        // navigation/param change still reverts via resetAaState (samples → 0).
        const aaShowAccum = this.aaAccumulatedSamples >= 1 || aaCompositeThisFrame

        // Phase D: finalize the analytic-AA color flag — the expansion reads
        // payload layers 8..12, which exist only on the raw texture binding.
        // The ACCUM pass always binds raw (below), so the flag only needs the
        // binding to exist. update() pre-wrote 0; this lands before submit.
        if (aaCompositeThisFrame && !!this.bindGroupColorRaw && this.aaSampleIndex > 0
            && (this.aaOffsetX !== 0 || this.aaOffsetY !== 0)
            && this.aaAnalyticParams(aspect).enabled) {
            this.device.queue.writeBuffer(this.uniformBufferColor!, 63 * 4, new Float32Array([1]).buffer)
        }

        if (aaCompositeThisFrame) {
            const firstSample = this.aaSampleIndex === 0
            const rpassAccum = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.accumTextureView!,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: firstSample ? 'clear' : 'load',
                    storeOp: 'store',
                }],
                timestampWrites: this.tsWrites(5),
            })
            rpassAccum.setPipeline(firstSample ? this.pipelineColorAccumClear! : this.pipelineColorAccum!)
            // Accumulation reads the RAW binding directly: composites may now run
            // with a few idle-threshold unfinished pixels (skipResolve false), and
            // the analytic Taylor payload (layers 8..12) only exists on raw —
            // falling back to the resolved 8-layer binding would silently disable
            // the expansion for the whole sample. Raw genuine values are what the
            // accumulator wants anyway (resolve is a display nicety).
            rpassAccum.setBindGroup(0, this.bindGroupColorRaw ?? colorBindGroup)
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
                timestampWrites: this.tsWrites(6),
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
                timestampWrites: this.tsWrites(7),
            })
            rpassPresent.setPipeline(this.pipelinePresent)
            rpassPresent.setBindGroup(0, this.bindGroupPresent)
            rpassPresent.draw(6, 1, 0, 0)
            rpassPresent.end()
        }

        // ── Debug overlay: instrumented recompute straight onto the frame ──
        if (this.debugViewMode > 0 && this.pipelineDebug && this.bindGroupDebug) {
            const rpassDebug = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: swapView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            })
            rpassDebug.setPipeline(this.pipelineDebug)
            rpassDebug.setBindGroup(0, this.bindGroupDebug)
            rpassDebug.draw(6, 1, 0, 0)
            rpassDebug.end()
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
            // Contrast/moiré predictor inputs (design D-contrast): the bake
            // Sobels the sample-0 composite (encoded just above in this same
            // frame) and reads the palette-phase frequency from the raw layers.
            const bakeMandelbrot = this.previousMandelbrot!
            this.device.queue.writeBuffer(
                this.uniformBufferAaTarget!,
                0,
                new Float32Array([
                    antialiasLevel, 0, this.height, 0, 0,
                    aspect,
                    Math.sin(bakeMandelbrot.angle),
                    Math.cos(bakeMandelbrot.angle),
                    this.width,
                    Math.max(renderOptions.palettePeriod ?? 1, 1e-4),
                    bakeMandelbrot.mu,
                    Math.log(Math.max(bakeMandelbrot.mu, 1e-6)),
                    this.aaContrastEnabled ? 1 : 0,
                    renderOptions.aaAdaptive === false ? 1 : 0, // aaFull: uniform budget (A/B vs adaptive)
                    0, 0,
                ]).buffer,
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

        // Per-pass timing: resolve the timestamp pairs into a buffer and copy to
        // a mappable readback (both GPU-side, no stall). Only when the previous
        // readback has completed — otherwise skip this frame's sample.
        let tsResolvedThisFrame = false
        if (this.timestampsEnabled && this.timestampQuerySet && this.tsResolveBuffer && this.tsReadBuffer
            && this.tsReadbackFree && this.tsSlotsUsedThisFrame !== 0) {
            commandEncoder.resolveQuerySet(this.timestampQuerySet, 0, TS_COUNT, this.tsResolveBuffer, 0)
            commandEncoder.copyBufferToBuffer(this.tsResolveBuffer, 0, this.tsReadBuffer, 0, TS_COUNT * 8)
            this.tsPendingSlots = this.tsSlotsUsedThisFrame
            tsResolvedThisFrame = true
        }

        // soumission des commandes
        const submitStartMs = performance.now()
        this.device.queue.submit([commandEncoder.finish()])
        this.cpuRenderMs = performance.now() - renderStartMs
        this.frameSerial++   // one actually-rendered frame → one measurement for the panel
        if (tsResolvedThisFrame) this.readbackTimestamps()
        // Debug overlay active: surface the GPU frame time. The debug pass strips
        // the derivative/f32-path/lockstep asymmetries for every mode, so this
        // number compares the pure skipping algorithms wall-clock — switch modes
        // and read the console.
        if (this.debugViewMode > 0) {
            const dbgT0 = performance.now()
            void this.device.queue.onSubmittedWorkDone().then(() => {
                console.log(`[debug view] GPU frame ${(performance.now() - dbgT0).toFixed(1)}ms (mode ${this.approximationMode}, view ${this.debugViewMode})`)
            })
        }

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
        if (aaFrontierCopyScheduled) {
            this.readbackAaFrontier()
        }

        // Reset the clear flag now that it has been consumed by the GPU passes.
        if (this.clearHistoryNextFrame) {
            // A clear re-stamps every pixel for recompute at the current jitter
            // offset (0 outside AA accumulation → the base is unjittered again).
            // Pan gathers COPY pixels, so they deliberately don't touch this.
            this.rawJittered = this.aaOffsetX !== 0 || this.aaOffsetY !== 0
        }
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
                // Queue the next jittered sample. j is in TEXEL units (tent
                // support ±1 texel); one neutral texel spans 2·neutralExtent /
                // neutralSize in local_rot units (xy_neutral ∈ [−1,1] covers
                // neutralSize texels). The missing ×2 halved the reconstruction
                // kernel — a half-width tent under-filters edges (field report:
                // band edges stayed crunchier than a DPR×2 render).
                this.aaSampleIndex++
                const j = computeAaJitterOffset(this.aaSampleIndex)
                this.aaOffsetX = j.x * 2 * neutralExtentColor / Math.max(1, this.neutralSize)
                this.aaOffsetY = j.y * 2 * neutralExtentColor / Math.max(1, this.neutralSize)
                // Stage B: reconverge only the boundary sliver via a selective reseed.
                // Requires the grid at its finest step (1) and the reseed pipeline.
                // Otherwise fall back to Stage A's full reconverge.
                const canSelectiveReseed = this.useAaSelectiveReseed
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
            // Same idle threshold as the convergence gates: requiring exactly 0
            // left auto AA permanently pending on views that idle with a few
            // stuck unfinished pixels.
            && this.unfinishedPixelCount >= 0
            && this.unfinishedPixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD
            && this.activePixelCount >= 0
            && this.activePixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD
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
            // On idle→active resume, drop the stale interval so the first rendered
            // frame after a pause isn't counted as one giant slow frame.
            if (active && !this._wasActive) this.lastRenderStartMs = 0
            this._wasActive = active
            this.isRendering = active

            await this._drawFn()

            // FPS is updated inside render() from the frame interval (accurate).
            // When idle, decay it to 0 after a short grace so the panel honestly
            // shows "not rendering" instead of a stale rate.
            if (!active && this._lastActiveRenderMs
                && performance.now() - this._lastActiveRenderMs > 600) {
                this.fps = 0
                this._emaFrameMs = 0
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
