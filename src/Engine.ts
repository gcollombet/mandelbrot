import type { HdrGpuOptions } from './hdrGpuOutput'
import { STEREO_RELIEF_DEFAULT, type StereoColorPass } from './stereoVideo'
import { CAST_SHADOW_HEIGHT_FORMAT, CAST_SHADOW_NO_SURFACE, CAST_SHADOW_REQUIRED_SAMPLED_TEXTURES, LIGHT_OCCLUSION_FORMAT, LIGHT_OCCLUSION_LAYERS, withoutCastShadowBinding } from './castShadow'
import {GpuPalettePath} from './gpuPalettePath'
import {resolvePalettePathImages} from './palettePathResources'
import {validatePalettePath, snapshotPathAppearance, PATH_GLOBAL_FIELDS, PALETTE_PATH_TEXTURE_BUDGET, type PalettePath} from './palettePath'
import {GpuPaletteTransition} from './gpuPaletteTransition'
import type { ExpmapKernelProjection } from './expmap/producerProjection'
import type { MinibrotSearchRequest, MinibrotSearchResponse } from './minibrotWorker'
// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import inplaceComputeShader from './assets/mandelbrot_brush.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import reprojectCsShader from './assets/reproject_cs.wgsl?raw'
import rawPanClearShader from './assets/raw_pan_clear.wgsl?raw'
import resolveShader from './assets/resolve.wgsl?raw'
import mergeFrozenShader from './assets/merge_frozen.wgsl?raw'
import presentShader from './assets/present.wgsl?raw'
import tiltViewShader from './assets/tilt_view.wgsl?raw'
import tiltDistanceShader from './assets/tilt_distance.wgsl?raw'
import tiltMipsShader from './assets/tilt_mips.wgsl?raw'
import heightClosingShader from './assets/height_closing.wgsl?raw'
import { normalizeTiltView, tiltViewUniforms } from './tiltView'
import rotationPresentShader from './assets/rotation_present.wgsl?raw'
import aaTargetShader from './assets/aa_target.wgsl?raw'
import aaReseedShader from './assets/aa_reseed.wgsl?raw'
import {MandelbrotNavigator} from 'mandelbrot'
import {WebcamTexture} from './WebcamTexture'
import {generateMipmaps, mipLevelCountFor, packTextureLayers, TEXTURE_MAX_ANISOTROPY} from './mipmaps'
import {Palette, PALETTE_TEXTURE_ROWS} from './Palette.ts'
import {needsSurfaceColorPipeline} from './colorPipelineFeatures'
import {DEEP_EXP_THRESHOLD, frexpFloat32, frexpFromDecimalString, log2FromDecimalString, log10FromDecimalString} from './floatexp'
import type {ZoomEffect, ZoomState} from './zoomState'
import {
    classifyFrame,
    displayZoomFactors,
    getFrozenScale,
    getLiveScale,
    getZoomingIn,
    isZoomActive,
    liveGridScale,
    reduceZoomState,
    resetZoomState,
    smallZoomStopNeedsClear,
} from './zoomState'
import {advanceTile, createExportSession, currentTile, resolveSurface, restartKeyframe, validateExportSettings, type ExpmapLayout, type ExportSession, type ExportSessionSettings, type TiledLayout} from './exportSession'
import {ORBIT_STEP_CAPACITY, ReferenceChannel, type BlaTablePayload, type TableBuildStage} from './referenceChannel'
import {COLOR_UNIFORM_BYTES, colorUniformByteOffset, orbitTrapUniforms, packColorUniformRun, packColorUniforms, type ColorUniforms} from './colorUniforms'
import {bind, computePipelineDescriptor, createPassLayout, fullscreenPipelineDescriptor} from './gpuPipelines'
import {ExportCapture} from './exportCapture'
import {FrameRequests, frameClears, planFrame, type FramePlan} from './framePlan'
import {ViewGrids, ZERO, frozenCoversViewport, neutralSizeFor, cameraShiftTexels, iterationDispatchBox, padRect, tileLocalRect, toUv, type GridMapping, type MergeUniforms} from './viewGrids'
import {
    isFieldConverged as evaluateFieldConvergence,
    UNFINISHED_PIXEL_DONE_THRESHOLD,
} from './fieldConvergence'
import type {ColorStop} from './ColorStop.ts'
import {resolveDirectionCoherenceReliefTilt, resolveStripeReliefTilt} from './ColorStop.ts'
import type {InterpolationMode} from './Mandelbrot.ts'
import {computeAaJitterOffset, normalizeAntialiasLevel, rotateAaJitterToScene} from './Mandelbrot.ts'
import {iterationPaletteCurveCode, type IterationPaletteCurve} from './IterationPaletteCurve.ts'
import {normalizeTextureMappingConfig, type TextureMappingConfig, textureMappingVariableId} from './TextureMapping.ts'
import {type AnimationConfig, type AnimationTrackConfig, normalizeAnimationConfig,} from './AnimationConfig.ts'
import {DISPLAY_VALUE_LAYERS, float16ToFloat32, isDisplaySetCurrent} from './displayGeometry'
import {PASS_SLOT_INDEX, PASS_SLOTS, selectRawUtilityPassKey} from './gpuPassTimings'
import {iterationWorkCounterShift} from './iterationBatchController'
import {IterationBudget, type IterationBatchTimingContext} from './iterationBudget'
import {PixelCounter, COUNTER_BYTES, type CounterReadback} from './pixelCounter'
import {GpuPassTimer, type PassTimingSample} from './gpuPassTimer'
import {advanceFramePacer} from './framePacing'
import {
    formatGpuBytes,
    isMobileLikeEnvironment,
    READ_WRITE_STORAGE_TEXTURES_FEATURE,
    recommendedGpuMemoryBudgetBytes,
} from './gpuCompatibility'
import {normalizeOrbitTrapConfig, orbitTrapAccumulatorSignature, orbitTrapModeId, orbitTrapUsesOrbit, type OrbitTrapConfig, type OrbitTrapMode} from './OrbitTrap.ts'
import {rotationHasFreshZeroCounter, rotationNeedsColorResolve} from './rotationColorResolve'
import {t} from './i18n'
import type {
    KeyframeTile,
    TiledExportMemoryProfile,
} from './tiledKeyframeExport'

/** Debug view 6 visualizes the analytic-AA reach encoded by the shared z″
 * payload. Unlike views 1-5 it recolors the ordinary progressive render. */
// ── Constants ────────────────────────────────────────────────────────

// Number of r32float layers per raw texture array.
// 13 = 9 iteration layers + the analytic-AA/future-geometry extras (9/10/11 carry the
// independently scaled in-progress z″ and 12 its validity bit; 8..12 carry
// the escaped polar-log derivative payload). Allocation stays fixed so AA can
// toggle without rebuilding every raw view. Reprojection copies nine layers
// for terminal pixels while the analytic payload is unused, but preserves all
// 13 for unfinished pixels because z″ also feeds terminal cached geometry.
const RAW_BASE_LAYERS = 9
const RAW_LAYERS = 13
/** Smallest bailout at which the analytic-AA band-crossing extrapolation is exact enough (see aaAnalyticParams). */
const AA_ANALYTIC_MIN_MU = 64
// Layers 13..16 carry the analytic gradients of the two orbit metrics, and 17
// the deep path's average orbit direction (the shallow path keeps that one in
// layer 7, which floatexp needs for dz's exponent). Allocated only while a stop
// asks for stripe/direction coloring or relief: five more r32float layers over
// the neutral square is not a cost to pay for the palettes that never ask.
const RAW_ORBIT_GRADIENT_LAYERS = 18
// Orbit-trap continuation tuple: distance, hit iteration and hit angle. It
// starts at layer 13 when orbit metrics are absent, or after their five layers.
const RAW_TRAP_LAYERS = 16
const RAW_ORBIT_GRADIENT_TRAP_LAYERS = 21

/** Byte offset of the batch-size scalar in the iteration uniform block (see IterationBudget). */
const MANDELBROT_BATCH_UNIFORM_OFFSET = 6 * Float32Array.BYTES_PER_ELEMENT
// Validity radii scale linearly with this epsilon (α = ε·|Z| per step, so the
// neglected δz² term is ε/2 of the linear one). The affine BLA has no other
// error control, so ε must stay near f32 precision: measured on the CPU mirror
// of the kernel (reference_calculus, gpu_bla_mirror_census), 1e-3 mismatches
// the f64 truth on 40 % of the pixels while 1e-6 matches exact f32 stepping
// pixel for pixel and still skips 2-7× fewer loop turns at 1e-12..1e-20.
const BLA_LINEARIZATION_EPSILON = 1e-6

// Floats per floatexp BlaStep uploaded to the GPU. Matches the Rust `BlaStep`
// (#[repr(C)] of 8 × 4-byte fields): ax,ay,bx,by,ab_exp,radius_alpha,alpha_exp,
// radius_beta — and the WGSL BlaStep of mandelbrot_brush.wgsl.
const BLA_STEP_FLOATS = 11
const BLA_LEVEL_U32S = 5 // mirrors the Rust #[repr(C)] BlaLevel
interface ColorPipelines {
    direct: GPURenderPipeline
    rotation: GPURenderPipeline
    clear: GPURenderPipeline
    accum: GPURenderPipeline
    /** Cast-shadow height raster (screen / rotation cache), full family only. */
    castHeight?: GPURenderPipeline
    castHeightRotation?: GPURenderPipeline
    /** Half-resolution cast shadows + horizon occlusion (screen / rotation cache). */
    lightOcclusion?: GPURenderPipeline
    lightOcclusionRotation?: GPURenderPipeline
}

interface ColorPipelineFamily { full: ColorPipelines, simple: ColorPipelines }

interface GpuSetupProfile {
    raiseLimits: boolean   // request the adapter's maxBufferSize & co. instead of WebGPU defaults
    timestamps: boolean    // request 'timestamp-query' when the adapter offers it
}

class GpuDeviceLostDuringSetupError extends Error {
    readonly info: GPUDeviceLostInfo
    constructor(info: GPUDeviceLostInfo) {
        super(`GPU device lost during setup: ${info.reason} ${info.message}`)
        this.info = info
    }
}
const TAU = Math.PI * 2

const ORBIT_METRIC_EPSILON = 0.001

export type MinibrotResult = {
    /**
     * 'ok' = nucleus found; 'none' = no atom under the view; 'nonewton' = period found but
     * Newton did not converge; 'nosize' = nucleus found but the size estimate degenerated
     * (framed request only); 'cancelled' = cancelMinibrot() or a newer search stopped it.
     */
    status: 'ok' | 'none' | 'nonewton' | 'nosize' | 'cancelled'
    cx: string | null
    cy: string | null
    period: number | null
    /** Framed request only: view half-height (decimal string) that frames the copy. */
    scale: string | null
}

function describeGpuError(error: unknown): string {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
        return (error as { message: string }).message
    }
    return String(error)
}

function shouldTrackOrbitMetrics(colorStops: ColorStop[]): boolean {
    return colorStops.some(stop =>
        (stop.stripeAverage ?? 0) > ORBIT_METRIC_EPSILON
        || (stop.rotationMean ?? 0) > ORBIT_METRIC_EPSILON
        || resolveStripeReliefTilt(stop) > ORBIT_METRIC_EPSILON
        || resolveDirectionCoherenceReliefTilt(stop) > ORBIT_METRIC_EPSILON
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

function wrapUnit(value: number): number {
    return value - Math.floor(value)
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

// Colour uniforms that do not change the relief height raster between frames:
// the per-sample AA jitter (reusing sample 0's raster is sub-pixel) and the raw
// clock (animated values reach h through their own, already-animated fields).
// Pure lighting / grading / shadow controls are left out too: h never reads
// them, so a light animation or a shadow tweak reuses the raster.
const HEIGHT_RASTER_VOLATILE_UNIFORMS = new Set<string>([
    'time', 'aaSampleIndex', 'aaJitterHatX', 'aaJitterHatY', 'aaJitterLogMag',
    'aaAnalytic', 'aaLookupOffsetX', 'aaLookupOffsetY',
    'lightAngle', 'lightDirX', 'lightDirY', 'lightDirZ', 'lightAngleAnimation',
    'varnishStrength', 'varnishAnimation', 'localShadowStrength', 'ambientOcclusionStrength',
    'castShadowStrength', 'castShadowLength', 'castShadowSoftness',
    'horizonOcclusionStrength', 'horizonOcclusionRadius',
    'indirectLightStrength',
    'gradeContrast', 'gradeSaturation', 'skyDriftX', 'skyDriftY', 'skyReflectionDriftAnimation',
])

function heightUniformSignature(uniforms: ColorUniforms): string {
    let signature = ''
    for (const [field, value] of Object.entries(uniforms)) {
        if (!HEIGHT_RASTER_VOLATILE_UNIFORMS.has(field)) signature += value + ','
    }
    return signature
}

function shiftedAnimationContribution(track: AnimationTrackConfig, time: number, globalSpeed: number, phaseShift: number): number {
    return animationContribution({...track, phase: (track.phase ?? 0) + phaseShift}, time, globalSpeed)
}

export type RenderOptions = {
    palettePath?: PalettePath,
    textureName?: string, textureGuid?: string, skyboxName?: string, skyboxGuid?: string,
    antialiasLevel: number,
    aaAuto?: boolean,
    /** false = FULL AA (every pixel gets the whole budget); true/undefined = adaptive target map. */
    aaAdaptive?: boolean,
    palettePeriod: number,
    paletteOffset: number,
    paletteScreenShiftX?: number,
    paletteScreenShiftY?: number,
    heightPaletteShift: number,
    paletteMirror: boolean,
    iterationPaletteCurve: IterationPaletteCurve,
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
    reliefDepth: number,
    protrusionPhase: number,
    protrusionSharpness: number,
    protrusionStrength: number,
    protrusionGeometryMix: number,
    protrusionPeriod: number,
    protrusionTerrace: number,
    lightAngle: number,
    localShadowStrength: number,
    castShadowStrength: number,
    castShadowLength: number,
    castShadowSoftness: number,
    tiltViewTilt?: number,
    tiltViewHeading?: number,
    tiltViewRelief?: number,
    tiltViewInteriorDepth?: number,
    horizonOcclusionStrength: number,
    horizonOcclusionRadius: number,
    indirectLightStrength?: number,
    reliefClosing?: number,
    varnishStrength: number,
    gradeContrast?: number,
    gradeSaturation?: number,
    orbitTrapStrength: number,
    orbitTrap?: OrbitTrapConfig,
    phaseColoringStrength: number,
    stripeFrequency: number,
    textureMapping: TextureMappingConfig,
    textureMappingMode?: number,
}

export type ApproximationMode = 'perturbation' | 'bla' | 'pade'

/** Folds a stored mode name onto the three the engine implements. A missing
 *  mode or a retired tier from an earlier build (auto, jet, mobius) runs the
 *  default, Padé; an explicit 'bla' stays affine BLA. */
export function kernelApproximationMode(mode: string | undefined): ApproximationMode {
    return mode === 'perturbation' || mode === 'bla' ? mode : 'pade'
}

/** Shader flag of each mode (Mandelbrot.approximationMode in the kernel). */
const APPROXIMATION_MODE_FLAG: Record<ApproximationMode, number> = { perturbation: 0, bla: 1, pade: 2 }

function readNavigatorApproximationMode(navigator: { get_approximation_mode(): number }): ApproximationMode {
    const flag = navigator.get_approximation_mode()
    return flag === 2 ? 'pade' : flag === 1 ? 'bla' : 'perturbation'
}

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

interface DisplaySet {
    valuesTexture: GPUTexture
    valuesArrayView: GPUTextureView
    valueLayerViews: GPUTextureView[]
    geometryTexture: GPUTexture
    geometryView: GPUTextureView
    metadataTexture: GPUTexture
    metadataView: GPUTextureView
    /** Present only while orbit metrics are tracked (see orbitGradientAllocated). */
    orbitGradientTexture?: GPUTexture
    orbitGradientView?: GPUTextureView
    /** Closest-hit tuple (distance, iteration, angle, validity), orbit modes only. */
    trapPayloadTexture?: GPUTexture
    trapPayloadView?: GPUTextureView
}

export class Engine {
    private snapshotCallback?: (png: string) => void;
    private snapshotDestWidth?: number;

    /** Export frame capture chain (see exportCapture.ts). */
    private readonly capture = new ExportCapture()
    private modulePresent?: GPUShaderModule;
    private layoutPresent?: GPUBindGroupLayout;
    /** Full-size live keyframe. `resolvedDisplay` remains the tile-local resolve target. */
    private tiledLiveDisplay?: DisplaySet
    /** Interactive when null; otherwise the one running export (see exportSession.ts). */
    private session: ExportSession | null = null
    private get exporting(): boolean { return this.session !== null }
    private get tiled(): TiledLayout | null {
        return this.session?.layout.kind === 'tiled' ? this.session.layout : null
    }
    private get expmap(): ExpmapLayout | null {
        return this.session?.layout.kind === 'expmap' ? this.session.layout : null
    }
    /** Jittered AA samples per exported frame (1 = off, and outside exports). */
    private get exportAaSamples(): number { return this.session?.aaSamples ?? 1 }
    /** Side of the working raw textures: the tile in a tiled keyframe, else the neutral square. */
    private get workingSide(): number { return this.tiled?.plan.tileSide ?? this.neutralSize }
    private tiledKeyframeDiagnostics = {
        keyframesBuilt: 0,
        tilesConverted: 0,
        pumpsPerTile: [] as number[],
        freeFrames: 0,
    }

    canvas: HTMLCanvasElement
    device!: GPUDevice
    queue!: GPUQueue
    adapter!: GPUAdapter | null
    ctx!: GPUCanvasContext
    /** SDR file/capture format, independent of the canvas presentation format. */
    format!: GPUTextureFormat
    private hdrDisplay = false
    private get hdrRendering() { return this.session ? this.session.hdr : this.hdrDisplay }
    private get canvasFormat(): GPUTextureFormat { return this.hdrRendering ? 'rgba16float' : this.format }
    private hdrColorPipelines?: ColorPipelineFamily
    private presentationPipelines?: {
        sdr: GPURenderPipeline; hdr: GPURenderPipeline
        rotationSdr: GPURenderPipeline; rotationHdr: GPURenderPipeline
    }

    get outputDiagnostics() {
        const config = this.ctx?.getConfiguration?.()
        return {
            hdrRequested: this.hdrDisplay,
            hdrCapable: typeof matchMedia === 'function' && matchMedia('(dynamic-range: high)').matches,
            format: config?.format ?? this.canvasFormat,
            colorSpace: config?.colorSpace ?? 'srgb',
            toneMapping: config?.toneMapping?.mode ?? 'standard',
            dithering: this.hdrRendering ? 'Aucun (surface flottante)' : '8 bits',
        }
    }

    private configureOutput(): void {
        this.ctx.configure({ device: this.device, format: this.canvasFormat, alphaMode: 'opaque',
            colorSpace: 'srgb', toneMapping: { mode: this.hdrRendering && this.hdrDisplay ? 'extended' : 'standard' } })
        const p = this.presentationPipelines
        if (p) {
            this.pipelinePresent = this.hdrRendering ? p.hdr : p.sdr
            this.pipelineRotationPresent = this.hdrRendering ? p.rotationHdr : p.rotationSdr
        }
        this.selectColorPipelines(true)
        this.resetAaState()
        this.rotationColorCacheReady = false
        this.rotationColorResolvePending = true
        this.capture.invalidateMirror()
        this.needRender = true
    }

    async setHdrDisplay(enabled: boolean): Promise<void> {
        if (this.exporting) throw new Error(t('engine.hdr.waitForExport'))
        if (!this.presentationPipelines) throw new Error(t('engine.hdr.notReady'))
        const previous = this.hdrDisplay
        this.device.pushErrorScope('validation')
        let failure: unknown
        try {
            this.hdrDisplay = enabled
            this.configureOutput()
            if (enabled && this.ctx.getConfiguration?.()?.toneMapping?.mode !== 'extended') {
                throw new Error(t('engine.hdr.extendedNotConfirmed'))
            }
            this.ctx.getCurrentTexture()
        } catch (error) { failure = error }
        const error = await this.device.popErrorScope()
        if (failure || error) {
            this.hdrDisplay = previous
            this.configureOutput()
            throw failure ?? new Error(error!.message)
        }
    }
    mandelbrotNavigator!: MandelbrotNavigator
    private gpuMemoryBudgetBytes = 0
    private lastSurfaceReductionKey = ''
    private destroyed = false
    private gpuSetupInProgress = false
    private inplaceDeepUnavailable = false   // driver refused the floatexp kernel; shallow-only
    private deepUnavailableReported = false
    private readonly gpuErrorHandler?: (message: string) => void

    // resources
    rawTexture?: GPUTexture // texture "neutre" (A) — r32float array, written via textureStore only
    rawArrayView?: GPUTextureView // full 2d-array view for sampling
    /** Raw layer 0 (iter) as a 2d storage view — the reseed's write target. */
    private rawIterStorageView?: GPUTextureView
    /** Raw layers 8..12 (analytic-AA/future-geometry payload) as a sampled view. */
    private rawPayloadView?: GPUTextureView
    rawBrushTexture?: GPUTexture // texture "neutre" intermédiaire (B) — r32float array, written via textureStore only
    rawBrushArrayView?: GPUTextureView // full 2d-array view for sampling
    rawBrushIterStorageView?: GPUTextureView // layer 0 storage view (mirrors A)
    rawBrushPayloadView?: GPUTextureView // layers 8..12 sampled view (mirrors A)
    private resolvedDisplay?: DisplaySet
    private frozenDisplay?: DisplaySet
    /** Merge destination, swapped with frozenDisplay after each zoom-stop merge. */
    private mergeDisplay?: DisplaySet
    /** 1x1 stand-in bound wherever an orbit-gradient texture is absent. */
    private orbitGradientDummyView?: GPUTextureView
    /** Sampled and storage dummies must be distinct to avoid read/write aliasing. */
    private trapPayloadDummyView?: GPUTextureView
    private trapPayloadDummyStorageView?: GPUTextureView
    /** Whether the CURRENT textures carry the orbit-gradient resources. */
    private orbitGradientAllocated = false
    /** Whether the CURRENT palette asks for them. */
    private orbitMetricsEnabled = false
    /** Whether the CURRENT raw/display sets carry the true-orbit trap tuple. */
    private trapPayloadAllocated = false
    /** Whether the requested mode is sampled or exact for this update. */
    private orbitTrapEnabled = false

    // merge pass (fuse resolved + frozen at zoom stop)
    pipelineMerge?: GPURenderPipeline
    /** Same module, sixth target enabled (orbit gradients allocated). */
    pipelineMergeOrbit?: GPURenderPipeline
    bindGroupMerge?: GPUBindGroup
    uniformBufferMerge?: GPUBuffer

    // buffers
    uniformBufferMandelbrot?: GPUBuffer // passe Mandelbrot (calc -1)
    uniformBufferColor?: GPUBuffer // passe color (écran)
    uniformBufferBrush?: GPUBuffer // reprojection + dispatch origin
    uniformBufferResolve?: GPUBuffer // temporary bilinear presentation
    mandelbrotReferenceBuffer?: GPUBuffer // storage buffer contenant l'orbite
    mandelbrotBlaBuffer?: GPUBuffer // storage buffer contenant les sauts BLA
    mandelbrotBlaLevelBuffer?: GPUBuffer // storage buffer contenant les metadonnees BLA
    private mandelbrotBlaBufferCapacity = 0
    private mandelbrotBlaLevelBufferCapacity = 0
    /** Workgroup-aligned bounding box of the rotated viewport inside the neutral
     *  square, in texels. The iteration kernel is dispatched over it instead of
     *  the whole square; every texel left out is one `is_inside_rotated_screen`
     *  already rejects, so no computed state is ever dropped or invalidated. */
    private dispatchBox = { x: 0, y: 0, width: 0, height: 0 }
    /**
     * Live rotation margin: the angle changed since the last zoom-cycle
     * boundary (cycle start or mid-zoom swap). While it holds, the iteration
     * kernel also computes the circumscribed disc outside the viewport, on the
     * even lattice only, and the resolve keeps it (step-2 reconstruction).
     *
     * Only the viewport is computed otherwise, so the live texture handed to
     * the frozen role at a swap covered the rectangle at the swap's angle and
     * nothing else. Zooming in, the frozen texture is the only source for the
     * screen's outer ring until the live one catches up (lzf starts at
     * 1/threshold); every degree turned since the swap pushed the screen's
     * corners outside that rectangle, into texels no one computed: black
     * triangles on each side. The disc contains the viewport at every angle,
     * so the next frozen texture covers any further rotation. The even
     * lattice (packed into full waves, see cs_main) iterates a quarter of the
     * ring: about a fifth of the viewport's texels at 16:9.
     */
    private liveRotationMargin = false

    // pipelines / bindgroups
    pipelineResolve?: GPURenderPipeline
    /** Same module, sixth target enabled (orbit gradients allocated). */
    pipelineResolveOrbit?: GPURenderPipeline
    bindGroupResolve?: GPUBindGroup
    pipelineColor?: GPURenderPipeline
    bindGroupColor?: GPUBindGroup
    private colorPipelines?: ColorPipelineFamily
    /** Palette-path variants (ENABLE_PALETTE_PATH), compiled on first path use. */
    private pathColorPipelines?: { sdr: ColorPipelineFamily, hdr: ColorPipelineFamily }
    private pathColorPipelinesPromise?: Promise<void>
    private colorPipelineSource?: { device: GPUDevice, module: GPUShaderModule, layout: GPUPipelineLayout }

    // ── Settled non-AA rotation resolve ───────────────────────────────
    /** Existing color shader rendered once into a scene-aligned linear cache. */
    private pipelineRotationColorCache?: GPURenderPipeline
    // Cast shadows: h / T raster written just before a colour pass (castShadow.ts).
    private castShadowSupported = false
    private pipelineCastHeight?: GPURenderPipeline
    private pipelineCastHeightRotation?: GPURenderPipeline
    private castShadowTexture?: GPUTexture
    private castShadowTextureView?: GPUTextureView
    // The height pass renders into the raster, so it binds a 1x1 stand-in at 21.
    private castShadowDummyView?: GPUTextureView
    /** One view per mip level of the height raster (level 0 = render target). */
    private castShadowLevelViews: GPUTextureView[] = []
    // Half-resolution light occlusion (cast shadows + horizon), read by colour.
    private pipelineLightOcclusion?: GPURenderPipeline
    private pipelineLightOcclusionRotation?: GPURenderPipeline
    private lightOcclusionTexture?: GPUTexture
    private lightOcclusionTextureView?: GPUTextureView
    /** One render-target view per layer of the occlusion texture. */
    private lightOcclusionLayerViews: GPUTextureView[] = []
    private lightOcclusionDummyView?: GPUTextureView
    private bindGroupColorLightOcclusion?: GPUBindGroup
    private lightOcclusionActive = false
    // Height raster reuse: it is re-encoded only when its inputs change (not per
    // AA sample, not on a still view). castHeightKey names what the raster holds.
    private heightInputsVersion = 0
    private heightUniformSignature = ''
    private castHeightKey = ''
    private tiltSeedsKey = ''
    private tiltSeedsResult?: GPUTexture
    private heightPathSignature = ''
    /** Dev: re-encode the height raster every time (A/B of the reuse). */
    disableHeightReuse = false
    private bindGroupColorCastHeight?: GPUBindGroup
    // Tilted 3D view (tilt_view.wgsl): final linear colour + height raster → tilted image.
    private pipelineTiltView?: GPURenderPipeline
    private tiltViewSampler?: GPUSampler
    private tiltViewUniformLive?: GPUBuffer
    private tiltViewUniformExport?: GPUBuffer
    private tiltSourceTexture?: GPUTexture
    private tiltOutTexture?: GPUTexture
    private tiltExportOutTexture?: GPUTexture
    // Nearest-rim seeds for the interior basin (tilt_distance.wgsl), ping-pong.
    private pipelineTiltSeed?: GPURenderPipeline
    private pipelineTiltJump?: GPURenderPipeline
    private tiltSeedTextures: GPUTexture[] = []
    // March height (surface z + maximum pyramid) and colour mips (tilt_mips.wgsl).
    private pipelineTiltMarchHeight?: GPURenderPipeline
    private pipelineTiltMaxDown?: GPURenderPipeline
    private pipelineCastHeightMaxDown?: GPURenderPipeline
    // Relief closing (height_closing.wgsl): the height pass renders into a raw
    // raster, then max x/y and min x/y filters write the closed h back into
    // level 0 of the height raster. Radius in view half-heights (reliefClosing).
    private pipelineHeightDilate?: GPURenderPipeline
    private pipelineHeightErode?: GPURenderPipeline
    private pipelineHeightErodeFinal?: GPURenderPipeline
    private heightClosingUniforms: GPUBuffer[] = []
    private heightRawTexture?: GPUTexture
    private heightClosingTemps: GPUTexture[] = []
    private reliefClosing = 0
    private pipelineTiltColorBase?: GPURenderPipeline
    private pipelineTiltColorDown?: GPURenderPipeline
    private tiltMarchTexture?: GPUTexture
    private tiltColorMipTexture?: GPUTexture
    private tiltMarchKey = ''
    /** Cheap screen pass that bilinearly reconstructs the final cached color. */
    private pipelineRotationPresent?: GPURenderPipeline
    private bindGroupRotationPresent?: GPUBindGroup
    private rotationColorTexture?: GPUTexture
    private rotationColorTextureView?: GPUTextureView
    private rotationPresentUniformBuffer?: GPUBuffer
    private rotationColorSampler?: GPUSampler
    private rotationColorCacheReady = false
    private rotationColorResolvePending = true
    /** Prevents rebuilding the full cache on every interactive rotation tick. */
    private rotationColorResolveChangedThisUpdate = false

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
    private inplacePipelinePending = new Map<string, Promise<GPUComputePipeline>>()
    private inplaceModule?: GPUShaderModule
    private inplacePipelineLayout?: GPUPipelineLayout
    private inplaceBindGroupLayout?: GPUBindGroupLayout
    private bindGroupInplace?: GPUBindGroup
    // Utility compute pass (pan shift / clear stamp), ping-pong A→B.
    private pipelineReprojectCs?: GPUComputePipeline
    private bindGroupReprojectCs?: GPUBindGroup
    /** Pan by origin shift: stamps the wrapped-in strip of A with sentinels. */
    private pipelinePanClear?: GPUComputePipeline
    private bindGroupPanClear?: GPUBindGroup
    /** Toroidal origin of the front raw texture, in texels (see raw_pan_clear.wgsl). */
    private rawOriginX = 0
    private rawOriginY = 0
    /** Runtime A/B switch: scissor the resolve pass to the padded dispatch box. */
    resolveScissorEnabled = true
    private rawFieldVersion = 0
    private resolvedDisplayVersion = -1
    private frozenDisplayVersion = -1
    /** frameSerial of the last frame that may have mutated rawTexture (A). */
    private lastRawMutationFrame = 0
    private renderFrameSerial = 0
    /** Unfinished-pixel counter read back from every dispatch (see pixelCounter.ts). */
    private readonly counter = new PixelCounter()
    /** Number of pixels still needing work. -1 = not yet known, 0 = fully converged. */
    get unfinishedPixelCount(): number { return this.counter.unfinished }
    get effectiveUnfinishedPixelCount(): number { return this.counter.effectiveUnfinished }
    get periodicThrottledPixelCount(): number { return this.counter.periodicThrottled }
    /** frameSerial at which the last applied counter readback was sampled. */
    private get counterSampleFrame(): number { return this.counter.sampleFrame }
    /** Reference-orbit worker protocol: jobs, slots, tables (see referenceChannel.ts). */
    private readonly reference = new ReferenceChannel({
        maxIterations: () => this.currentMaxIterations,
        writeOrbit: (byteOffset, data) => {
            if (this.mandelbrotReferenceBuffer) {
                this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, byteOffset, data, 0, data.length)
            }
        },
        writeBlaTable: table => this.writeBlaTable(table),
        reanchor: (cx, cy) => {
            // dx/dy are relative to the reference: record how far it moves so the
            // frozen texture can follow the camera across the re-anchor (the view
            // centre is untouched, so the offset change is exactly the jump).
            const before = this.mandelbrotNavigator.view_floatexp() as Float64Array
            this.mandelbrotNavigator.reference_origin(cx, cy)
            const after = this.mandelbrotNavigator.view_floatexp() as Float64Array
            this.grids.recordReferenceJump({
                x: before[2] * 2 ** before[3] - after[2] * 2 ** after[3],
                y: before[4] * 2 ** before[5] - after[4] * 2 ** after[5],
            })
        },
        requestRender: () => { this.needRender = true },
        requestClear: reason => this.requests.requestClear(reason),
        invalidateCounter: () => this.invalidateCounterReadback(),
    })
    // Reference state read by the HUD, the performance panel and dev tooling.
    get tableBuildCompletionSerial(): number { return this.reference.tableBuildCompletionSerial }
    get tableBuildActive(): boolean { return this.reference.tableBuild.active }
    get tableBuildProgress(): number { return this.reference.tableBuild.progress }
    get tableBuildStage(): TableBuildStage { return this.reference.tableBuild.stage }
    get orbitComputeTiming() { return this.reference.orbitComputeTiming }
    get blaBuildTiming() { return this.reference.blaBuildTiming }
    get orbitIncomplete(): boolean { return this.reference.progress.incomplete }
    get isReferenceValidating(): boolean { return this.reference.validating }
    get currentGuardedMaxIter(): number { return this.reference.progress.guardedMaxIter }
    get currentReferenceAvailableIter(): number { return this.reference.progress.availableIter }
    get currentReferenceRemainingIter(): number { return this.reference.progress.remainingIter }
    get currentBlaLevelCount(): number { return this.reference.blaLevelCount }
    get referenceBlaReadyMaxIterations(): number { return this.reference.blaReadyMaxIterations }
    get referenceResetSerial(): number { return this.reference.resetSerial }
    get referenceResetFlashUntil(): number { return this.reference.resetFlashUntil }
    get referenceWorkerCx(): string { return this.reference.workerCx }
    get referenceWorkerCy(): string { return this.reference.workerCy }
    /** Reference slots, read by the dev bench. */
    get activeRef() { return this.reference.active }
    get stagingRef() { return this.reference.staging }

    // Self-managing render loop
    private _rafId: number | null = null
    private _drawFn: (() => Promise<void>) | null = null

    // FPS / rendering-active tracking
    /** Current frames-per-second (updated once per second). */
    fps = 0
    /** True when the engine is actively doing GPU work (not idle). */
    isRendering = false
    /** Last measured GPU frame time in milliseconds. */
    get gpuFrameTimeMs(): number { return this.budget.gpuFrameTimeMs }
    /** Exponentially smoothed GPU frame time (for render-loop pacing). */
    get smoothedGpuTimeMs(): number { return this.budget.smoothedGpuTimeMs }
    /** True while the no-timestamp fallback waits for queue completion. */
    private pendingGpuTiming = false
    // FPS from the interval between actually-rendered frames (EMA). Counts every
    // rendered frame, not just iteration frames, and rejects the idle-resume gap.
    private _emaFrameMs = 0
    private _wasActive = false
    private _lastActiveRenderMs = 0
    /** rAF phase accumulator used to pace submissions without quantizing each
     * GPU interval independently to the next display tick. */
    private _pacingLastTickMs = -1
    private _pacingCreditMs = 0
    private _lastRafTickMs = -1
    private _drawInFlight = false
    /** Latest interval between continuously armed requestAnimationFrame callbacks. */
    framePacingRafRawIntervalMs = 0
    /** Smoothed cadence of requestAnimationFrame callbacks, including skipped draws. */
    framePacingRafIntervalMs = 0
    /** GPU-span-derived interval consumed by the phase accumulator. */
    framePacingTargetIntervalMs = 0

    // tailles
    neutralSize = 0 // coté en pixels de la texture neutre (D)

    // shader sources (optionnellement remplaçables)
    shaderPassColor: string

    // ── Per-pass GPU timing (PerformancePanel data source) ──────────────
    // Polled by PerformancePanel.vue, same pattern as RenderStats.
    timestampCapable = false                    // adapter exposes 'timestamp-query'
    readonly passMeta = PASS_SLOTS              // labels + help for the panel
    /** Timestamp-query timer of the frame's passes (see gpuPassTimer.ts). */
    private passTimer = new GpuPassTimer<IterationBatchTimingContext>()
    private get timestampsEnabled(): boolean { return this.passTimer.enabled }
    get passTimingsMs(): Record<string, number> { return this.passTimer.passTimingsMs }
    get passActive(): Record<string, boolean> { return this.passTimer.passActive }
    get passGpuSumMs(): number { return this.passTimer.passGpuSumMs }
    get passGpuSpanMs(): number { return this.passTimer.passGpuSpanMs }
    get lastIterationPassMs(): number { return this.passTimer.lastIterationPassMs }
    get iterationPassTimingSerial(): number { return this.passTimer.iterationPassTimingSerial }
    /** Work budget of the iteration dispatch, learned from the two feedbacks above. */
    private readonly budget = new IterationBudget({
        targetFps: () => this.targetFps,
        timestampsEnabled: () => this.timestampsEnabled,
    })
    frameSerial = 0                            // monotonic, ++ per actually-rendered frame (one submit)
    cpuFramePreparationMs = 0                  // navigator + Vue sync + update(), before render()
    cpuNavigationMs = 0                        // input/step + precise parameter extraction
    cpuModelSyncMs = 0                         // reactive propagation + derived frame inputs
    cpuUpdateMs = 0                            // Engine.update() before command encoding
    cpuRenderMs = 0                             // render() JS wall time (CPU side of the frame)
    frameIntervalMs = 0                         // wall time between successive render() calls
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
    /** guardedMaxIter from the previous frame (for detecting orbit growth). */
    prevGuardedMaxIter = 0
    /** Target maxIterations for the current frame. */
    currentMaxIterations = 0
    private approximationMode: ApproximationMode = 'perturbation'
    private blaEpsilon = BLA_LINEARIZATION_EPSILON
    private maxBlaSkip = 65536
    // Fixed precision budget as a target scale (max zoom depth navigation stays precise at).
    // Default 1e-30 keeps shallow use fast; the Settings slider can deepen it to 1e-1000.
    // Changing it forces a full reference recompute. See fix-reference-precision-budget.
    private precisionBudget = '1e-30'
    /** In-flight minibrot search: its disposable worker and the caller's promise. */
    private minibrotSearch: { worker: Worker; resolve: (r: MinibrotResult) => void; reject: (e: Error) => void } | null = null
    /** Last view sent to the reference worker, which a minibrot search starts from. */
    private minibrotView: { cx: string; cy: string; scale: string; angle: number } | null = null
    // Time-to-completion of the last render session (ms). Wall includes everything;
    // GPU is the accumulated mandelbrot-pass compute (the part blocks reduce).
    lastCompletionWallMs = 0
    lastCompletionGpuMs = 0
    // Diagnostic: the mode flag (0/1/2) and block-level count last sent to the shader.
    lastShaderApproxFlag = 0
    lastShaderBlaLevelCount = 0
    /** Diagnostic mirror of the policy actually sent to the iteration shader. */
    lastOrbitTrapMode: OrbitTrapMode = 'off'
    private completionStartMs = 0
    private completionAccumulatedGpuMs = 0
    private completionTimerActive = false
    floatExpActive = false
    debugShadingActive = false

    /** Skip the render immediately after promoting a reference; update() used old dx/dy for that call. */
    private skipRenderOnce = false

    // HUD compatibility (RenderStats.vue): staging accumulation progress.
    get pendingRefActive(): boolean { return this.stagingRef !== null }
    get pendingRefOrbitLen(): number { return this.stagingRef?.orbitLen ?? 0 }
    get pendingRefMaxIterations(): number {
        return this.stagingRef ? Math.min(this.currentMaxIterations, ORBIT_STEP_CAPACITY) : 0
    }

    prevFrameMandelbrot?: Mandelbrot // paramètres de la dernière frame rendue (pour gestion d'historique)

    /** Intents for the next frame: history clear (with its reasons) and
     *  frozen snapshot. Public so dev tooling can force a fresh field. */
    readonly requests = new FrameRequests()
    /** Decisions of the last rendered frame (diagnostics, E2E specs). */
    lastFramePlan: FramePlan | null = null
    // true when the previous rendered frame had a scale change (used to detect small-zoom stop)
    private prevFrameScaleChanged = false

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
    // ── Analytic AA (z″ expansion in the color pass) ──
    /** Master switch for analytic AA; every production iteration path carries z″. */
    aaAnalyticEnabled = true
    /** False after a 9-layer pan: layers 9..12 then belong to the old scratch
     * texture role. Re-enabling analytic AA must clear/recompute before use. */
    private rawAnalyticPayloadAligned = true
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

    // ── Zoom reprojection state machine ───────────────────────────────
    /** Configurable magnification threshold before swapping (default ×2). */
    zoomMagnificationThreshold = 16.0
    private zoomState: ZoomState = { kind: 'idle' }
    /** Saved merge uniform values captured at zoom stop (before state is reset). */
    private mergeUniforms: MergeUniforms = { zf: 1.0, lzf: 1.0, frozenShiftU: 0, frozenShiftV: 0, aspect: 1.0, angle: 0, liveShiftU: 0, liveShiftV: 0 }
    /** Placement of the live and frozen grids relative to the camera (see viewGrids.ts). */
    private readonly grids = new ViewGrids()

    /**
     * Refresh the frozen fallback from the resolved (live) texture before the
     * live history is cleared.
     *
     * A raw copy discards every frozen pixel, including the ones finer than
     * what the live texture has resolved so far. That is exactly what made a
     * zoom resumed before convergence restart from a coarse image: the stop
     * merge had just produced the best available picture, and the next cycle
     * start overwrote it with a half-computed live. So whenever a usable
     * frozen texture exists, the refresh is a min-step merge (finest pixel
     * wins, per pixel) into the display space described by the uniforms; the
     * raw copy remains only for the case where no frozen data exists.
     *
     * Idle callers pass no uniforms: both textures then share the current
     * display space (zf = lzf = 1, no shift), which holds whenever
     * `frozenAligned` is true.
     */
    private requestFrozenRefresh(uniforms?: GridMapping) {
        if (this.tiled) {
            this.beginNextTiledKeyframe()
            return
        }
        const frozenUsable = this.frozenDisplayVersion >= 0
            && (uniforms !== undefined || this.frozenAligned)
        if (frozenUsable) {
            const aspect = this.width / Math.max(1, this.height)
            // The destination is the live grid (live read unshifted).
            this.mergeUniforms = {
                ...(uniforms ?? this.grids.idleRefreshMapping(aspect, this.neutralSize)),
                liveShiftU: 0,
                liveShiftV: 0,
            }
            this.requests.requestSnapshot('merge', { replace: true })
        } else {
            this.requests.requestSnapshot('copy')
        }
        // Either way the new frozen texture is the live grid of the last
        // rendered frame, seen from the current camera.
        this.grids.frozenBecomesLive()
    }
    /** Compute-centre uniforms as written by update(), before the live-residual correction. */
    private computeCenterUniform = { cx: 0, cy: 0, scale: 0 }
    /** True when the frozen texture is spatially aligned with the live texture.
     *  Set to true after a freeze snapshot or merge pass. Set to false on translation. */
    private frozenAligned = false

    // Progressive iteration state – adaptive batch sizing

    // textures additionnelles
    tileTexture?: GPUTexture
    tileTextureView?: GPUTextureView
    skyboxTexture?: GPUTexture
    skyboxTextureView?: GPUTextureView
    private tileTextureSourceKey?: string
    private skyboxTextureSourceKey?: string
    private palettePathGpu?: GpuPalettePath
    private palettePathDummy?: GPUBuffer
    private palettePathSignature = ''
    private palettePathInput?: PalettePath
    private palettePathBaseStops?: ColorStop[]
    private palettePathBaseGlobals = ''
    private palettePathGeneration = 0
    private _palettePathStatus = ''
    /** Observers of the palette path preparation status (UI binds a ref; no polling). */
    readonly palettePathStatusListeners = new Set<(status: string) => void>()
    get palettePathStatus(): string { return this._palettePathStatus }
    set palettePathStatus(status: string) {
        if (status === this._palettePathStatus) return
        this._palettePathStatus = status
        this.palettePathStatusListeners.forEach(listener => listener(status))
    }
    private presetTransition?: {
        palette: GpuPaletteTransition; stops: ColorStop[]; progress: number;
        tile: GPUTexture; sky: GPUTexture; tileKey: string; skyKey: string;
        tileLayers?: GPUTexture; skyLayers?: GPUTexture;
    }
    private transitionGeneration = 0
    private tileLoadGeneration = 0
    private skyLoadGeneration = 0

    get isPresetTransitionActive() { return !!this.presetTransition }
    paletteTexture?: GPUTexture
    paletteTextureView?: GPUTextureView
    paletteSampler?: GPUSampler
    skyboxSampler?: GPUSampler
    tileSampler?: GPUSampler

    // Webcam
    webcamTexture?: WebcamTexture
    webcamTileTexture?: GPUTexture
    webcamTextureView?: GPUTextureView
    webcamEnabled = true

    // temps en secondes
    time = 0
    private lastUpdateTime = 0 // timestamp ms de la dernière update

    /** Injected animation clock, in seconds. Null = accumulate wall-clock time
     *  (real-time behaviour, unchanged). A video export sets it to
     *  `frameIndex / fps` before each frame so track phase depends only on the
     *  frame index, never on how long that frame took to converge.
     *
     *  Written into `this.time` rather than read alongside it: every consumer
     *  (the animation mixer, the color uniform block) then sees one clock, and
     *  no future read site can miss the override. */
    animationTimeOverride: number | null = null

    // DPR multiplier (adjustable from UI, default 1.0)
    dprMultiplier = 1.0

    // Target FPS for the adaptive batch controller (adjustable from UI, default 60)
    targetFps = 60

    constructor(canvas: HTMLCanvasElement, options: RenderOptions, gpuErrorHandler?: (message: string) => void) {
        this.canvas = canvas
        this.gpuErrorHandler = gpuErrorHandler
        this.shaderPassColor = colorShader
        this.antialiasLevel = options.antialiasLevel
        this.palettePeriod = options.palettePeriod
        this.orbitMetricsEnabled = shouldTrackOrbitMetrics(options.colorStops)
        this.orbitTrapEnabled = orbitTrapUsesOrbit(
            normalizeOrbitTrapConfig(options.orbitTrap, options.orbitTrapStrength),
        )
        this.time = 0
    }

    private reportGpuError(message: string): void {
        console.error(`[Engine] ${message}`)
        this.gpuErrorHandler?.(message)
    }

    /**
     * Force a fresh reference orbit at the next update(), re-anchored at the new
     * view centre. Use for discontinuous teleports (preset load, manual
     * coordinate entry). Re-anchoring the shared front navigator now keeps
     * dx/dy ≈ 0 immediately.
     */
    resetReference(cx: string, cy: string) {
        console.log('[REF] Engine.resetReference (teleport)', cx.slice(0, 14))
        if (this.mandelbrotNavigator) {
            this.mandelbrotNavigator.reference_origin(cx, cy)
        }
        this.reference.dropForTeleport()
        this.needRender = true
    }

    async initialize(mandelbrotNavigator: MandelbrotNavigator): Promise<void> {
        this.mandelbrotNavigator = mandelbrotNavigator
        // The front navigator stays at CURRENT-VIEW precision (not the budget): its coordinates
        // only feed per-frame shader uniforms and UI, and serializing them to decimal strings
        // every frame at the full budget made per-frame cost ∝ budget. The budget lives only on
        // the worker navigator (set via the reset message), which builds the reference orbit.
        this.approximationMode = readNavigatorApproximationMode(this.mandelbrotNavigator)
        this.blaEpsilon = this.mandelbrotNavigator.get_bla_epsilon()
        this.reference.start()
        if (!navigator.gpu) throw new Error(t('engine.webgpu.unsupported'))
        this.adapter = await navigator.gpu.requestAdapter()
        if (!this.adapter) throw new Error(t('engine.webgpu.adapterNotFound'))
        if (!navigator.gpu.wgslLanguageFeatures?.has(READ_WRITE_STORAGE_TEXTURES_FEATURE)) {
            throw new Error(t('engine.webgpu.readWriteTexturesMissing', { feature: READ_WRITE_STORAGE_TEXTURES_FEATURE }))
        }
        // `GPUAdapter.info` replaced requestAdapterInfo progressively; keep the
        // capability preflight usable on early read-write-capable Chromium too.
        const adapterInfo = this.adapter.info
        const navigatorWithUaData = navigator as Navigator & {
            userAgentData?: { mobile?: boolean }
        }
        const mobileLike = isMobileLikeEnvironment({
            userAgent: navigator.userAgent,
            userAgentDataMobile: navigatorWithUaData.userAgentData?.mobile,
            maxTouchPoints: navigator.maxTouchPoints,
            screenWidth: window.screen?.width,
            screenHeight: window.screen?.height,
        })
        this.gpuMemoryBudgetBytes = recommendedGpuMemoryBudgetBytes({
            mobileLike,
            adapterVendor: adapterInfo?.vendor,
            adapterArchitecture: adapterInfo?.architecture,
            adapterDevice: adapterInfo?.device,
        })
        console.info(
            `[Engine] conservative GPU working-set budget: ${formatGpuBytes(this.gpuMemoryBudgetBytes)}`
            + ` (${mobileLike ? 'mobile' : 'desktop'})`,
        )
        // First attempt: everything the adapter offers. Some Windows/D3D12
        // setups (seen on an NVIDIA RTX 30xx, Edge) drop the device during
        // setup with reason=unknown / "A valid external Instance reference no
        // longer exists"; retry once on a fresh adapter with the safe profile
        // (default limits, no timestamp queries) before giving up.
        const profiles: GpuSetupProfile[] = [
            { raiseLimits: true, timestamps: true },
            { raiseLimits: false, timestamps: false },
        ]
        this.gpuSetupInProgress = true
        try {
            for (let attempt = 0; attempt < profiles.length; attempt++) {
                try {
                    await this.setupGpuDevice(profiles[attempt])
                    break
                } catch (error) {
                    const isLastAttempt = attempt === profiles.length - 1
                    if (!(error instanceof GpuDeviceLostDuringSetupError) || isLastAttempt || this.destroyed) {
                        if (error instanceof GpuDeviceLostDuringSetupError) {
                            throw new Error(t('engine.webgpu.deviceLostDuringSetup', {
                                detail: `${error.info.reason || t('engine.webgpu.unknownReason')}${error.info.message ? ` : ${error.info.message}` : ''}`,
                            }))
                        }
                        throw error
                    }
                    console.warn(
                        `[Engine] GPU device lost during setup (reason=${error.info.reason}, message=${error.info.message});`
                        + ' retrying with the safe profile (default limits, timestamps OFF)',
                    )
                    this.inplacePipelineCache.clear()
                    this.inplaceDeepUnavailable = false
                    this.deepUnavailableReported = false
                    this.adapter = await navigator.gpu.requestAdapter()
                    if (!this.adapter) throw new Error(t('engine.webgpu.adapterNotFound'))
                }
            }
        } finally {
            this.gpuSetupInProgress = false
        }
    }

    /**
     * Request a device with the given profile and build every GPU resource on
     * it. Any device loss while this runs rejects with
     * GpuDeviceLostDuringSetupError so initialize() can retry more conservatively.
     */
    private async setupGpuDevice(profile: GpuSetupProfile): Promise<void> {
        this.inplacePipelineCache.clear()
        this.inplacePipelinePending.clear()
        // Dummy views belong to the previous device after a setup retry.
        this.orbitGradientDummyView = undefined
        this.trapPayloadDummyView = undefined
        this.trapPayloadDummyStorageView = undefined
        this.uniformBufferAaTarget = undefined
        this.aaFrontierBuffer = undefined
        this.aaFrontierReadback = undefined
        // Per-pass GPU timing needs the optional 'timestamp-query' feature. Often
        // absent on mobile (iOS/Safari) — the panel degrades to global metrics.
        this.timestampCapable = profile.timestamps && this.adapter.features.has('timestamp-query')
        const requiredFeatures: GPUFeatureName[] = []
        if (this.timestampCapable) requiredFeatures.push('timestamp-query')

        // Raise the limits that gate a large render surface to whatever the
        // adapter actually supports. Left at the WebGPU defaults, a 1080p
        // export at x2 supersampling asks Dawn for a ~310 MB staging buffer
        // against a 256 MB default cap, the submit is rejected, and — because
        // WebGPU reports this asynchronously instead of throwing — the whole
        // pipeline renders BLACK at full speed with no error surfaced anywhere.
        // The adapter here offers 4 GB; the default was simply never asked to
        // move.
        const LIMITS_TO_RAISE = [
            'maxBufferSize',
            'maxStorageBufferBindingSize',
            'maxTextureDimension2D',
            'maxTextureArrayLayers',
        ] as const
        const adapterLimits = this.adapter.limits as unknown as Record<string, number | undefined>
        const requiredLimits: Record<string, number> = {}
        for (const name of LIMITS_TO_RAISE) {
            const supported = adapterLimits[name]
            if (profile.raiseLimits && typeof supported === 'number' && Number.isFinite(supported)) {
                requiredLimits[name] = supported
            }
        }
        // Full shader ExpMap adds one regular display-set texture to the
        // sixteen material bindings, and cast shadows one more (the height
        // raster). Older adapters keep the block fallback / no cast shadows.
        const sampledTextures = this.adapter.limits.maxSampledTexturesPerShaderStage
        if (sampledTextures >= 17) {
            requiredLimits.maxSampledTexturesPerShaderStage = Math.min(sampledTextures, CAST_SHADOW_REQUIRED_SAMPLED_TEXTURES)
        }
        try {
            this.device = await this.adapter.requestDevice({ requiredFeatures, requiredLimits })
        } catch (error) {
            // Never let a limit request cost us the device: fall back to the
            // defaults and let the export-surface guard refuse what no longer
            // fits, with a message.
            console.warn('[Engine] requestDevice with raised limits failed, falling back to defaults', error)
            this.device = await this.adapter.requestDevice({ requiredFeatures })
        }
        this.castShadowSupported = this.device.limits.maxSampledTexturesPerShaderStage >= CAST_SHADOW_REQUIRED_SAMPLED_TEXTURES
        if (!this.castShadowSupported) this.shaderPassColor = withoutCastShadowBinding(colorShader)
        console.info('[Engine] limits: '
            + `maxBufferSize=${this.device.limits.maxBufferSize} `
            + `maxStorageBufferBindingSize=${this.device.limits.maxStorageBufferBindingSize} `
            + `maxTextureDimension2D=${this.device.limits.maxTextureDimension2D}`)
        console.info(`[Engine] timestamp-query: available=${this.timestampCapable} → per-pass timing ${this.timestampCapable ? 'ON' : 'OFF'}`)
        this.device.label = 'Engine Device'
        const device = this.device
        const lostDuringSetup = device.lost.then((info) => {
            throw new GpuDeviceLostDuringSetupError(info)
        })
        device.lost.then((info) => {
            console.warn(`GPU device lost: reason=${info.reason}, message=${info.message}`)
            // A device superseded by a retry, or lost while its own setup is
            // still racing below, is reported by the setup path instead.
            if (!this.destroyed && this.device === device && !this.gpuSetupInProgress) {
                this.reportGpuError(t('engine.webgpu.deviceLost', {
                    reason: info.reason || t('engine.webgpu.unknownReason'),
                    message: info.message ? ` : ${info.message}` : '.',
                }))
            }
        })
        this.device.addEventListener('uncapturederror', (event) => {
            event.preventDefault()
            this.reportGpuError(`Erreur WebGPU : ${event.error.message}`)
        })
        this.queue = this.device.queue
        this.queue.label = 'Engine Queue'
        this.device.pushErrorScope('out-of-memory')
        this.device.pushErrorScope('validation')
        this.device.pushErrorScope('internal')
        this.passTimer = new GpuPassTimer()
        if (this.timestampCapable) this.passTimer.allocate(this.device)
        this.presentationPipelines = undefined
        this.colorPipelines = undefined
        this.hdrColorPipelines = undefined
        this.pathColorPipelines = undefined
        this.pathColorPipelinesPromise = undefined
        this.colorPipelineSource = undefined
        this.ctx = this.canvas.getContext('webgpu') as GPUCanvasContext
        this.format = navigator.gpu.getPreferredCanvasFormat()
        this.configureOutput()
        // Initialisation synchrone des textures factices 1x1 (tile + skybox)
        this.tileTexture = this.device.createTexture({
            size: [1, 1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine TileTexture 1x1 Placeholder',
        })
        this.tileTextureView = this.tileTexture.createView({ dimension: '2d-array' })

        this.skyboxTexture = this.device.createTexture({
            size: [1, 1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine SkyboxTexture 1x1 Placeholder',
        })
        this.skyboxTextureView = this.skyboxTexture.createView({ dimension: '2d-array' })

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
        this.paletteTextureView = this.paletteTexture.createView({ dimension: '2d-array' })
        // Sampler linéaire pour interpolation douce de la palette
        this.paletteSampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        })
        // Image textures: trilinear + anisotropic, footprint from screen
        // derivatives (color.wgsl textureSampleGrad). Mirror-repeat serves the
        // skybox fold and mirrored tiles; repeat serves plain tiles and webcam.
        this.skyboxSampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'mirror-repeat',
            addressModeV: 'mirror-repeat',
            maxAnisotropy: TEXTURE_MAX_ANISOTROPY,
            label: 'Engine Mirror Sampler',
        })
        this.tileSampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            maxAnisotropy: TEXTURE_MAX_ANISOTROPY,
            label: 'Engine Tile Sampler',
        })

        // Webcam : initialisation (optionnel, activer webcamEnabled pour l'utiliser)
        this.webcamTexture = new WebcamTexture(1920, 1080)

        this.webcamTileTexture = this.device.createTexture({
            size: [1920, 1080, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        })
        this.webcamTextureView = this.webcamTileTexture.createView({ dimension: '2d-array' })

        this.palettePathDummy = this.device.createBuffer({ size: 208, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'Inactive palette path' })

        // uniform buffers
        this.uniformBufferMandelbrot = this.device.createBuffer({
            size: 4 * 36,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Mandelbrot',
        })
        this.uniformBufferColor = this.device.createBuffer({
            size: COLOR_UNIFORM_BYTES,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Color',
        })
        this.uniformBufferBrush = this.device.createBuffer({
            size: 4 * 28,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Brush',
        })
        this.uniformBufferResolve = this.device.createBuffer({
            size: 4 * 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Resolve',
        })
        this.rotationPresentUniformBuffer = this.device.createBuffer({
            size: 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine RotationPresent UniformBuffer',
        })
        this.rotationColorSampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            label: 'Engine RotationColor Sampler',
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
            size: 4 * BLA_LEVEL_U32S,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot BLA Level Storage Buffer',
        })
        this.mandelbrotBlaBufferCapacity = 1
        this.mandelbrotBlaLevelBufferCapacity = 1

        // Remaining pixels + actual weighted work consumed by each dispatch (16 B),
        // read back through a ring of mappable slots.
        this.counter.allocate(this.device)
        this.uniformBufferMerge = this.device.createBuffer({
            size: 4 * 8, // zf, lzf, frozenShiftU, frozenShiftV, aspect, angle, liveShiftU, liveShiftV
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Merge',
        })

        await Promise.race([this._createPipelines(), lostDuringSetup])
        this.resize()
        const [internalError, validationError, memoryError] = await Promise.race([
            Promise.all([this.device.popErrorScope(), this.device.popErrorScope(), this.device.popErrorScope()]),
            lostDuringSetup,
        ])
        const setupError = memoryError ?? validationError ?? internalError
        if (setupError) {
            const kind = memoryError
                ? t('engine.webgpu.kindMemory')
                : validationError
                    ? t('engine.webgpu.kindValidation')
                    : t('engine.webgpu.kindInternal')
            throw new Error(t('engine.webgpu.setupFailed', { kind, message: setupError.message }))
        }
    }

    private async _createPipelines() {
        const device = this.device
        const { VERTEX, FRAGMENT, COMPUTE } = GPUShaderStage

        // Display set written by resolve and merge: iteration, z.x, z.y,
        // packed geometry, metadata. The orbit gradient is a sixth target only
        // while it is allocated; the null variant lets the same shader run with
        // that output discarded, keeping 24 bytes per sample for every palette
        // that asks for no stripe/direction effect.
        const displayTargets: GPUColorTargetState[] = [
            { format: 'r32float' },
            { format: 'r32float' },
            { format: 'r32float' },
            { format: 'rgba16float' },
            { format: 'r32uint' },
        ]
        const displayTargetsWithOrbit: (GPUColorTargetState | null)[] = [...displayTargets, { format: 'rgba16float' }]
        const displayTargetsWithoutOrbit: (GPUColorTargetState | null)[] = [...displayTargets, null]

        // ── Resolve (raw → typed display set) ────────────────────────────
        const resolve = createPassLayout(device, 'Resolve', resolveShader, FRAGMENT, [
            bind.uniform(),
            bind.data('2d-array'),
            bind.storageTexture('write-only', 'rgba32float'),
        ])
        this.pipelineResolve = device.createRenderPipeline(fullscreenPipelineDescriptor({
            label: 'Engine RenderPipeline Resolve',
            module: resolve.module, layout: resolve.pipelineLayout, targets: displayTargetsWithoutOrbit,
        }))
        this.pipelineResolveOrbit = device.createRenderPipeline(fullscreenPipelineDescriptor({
            label: 'Engine RenderPipeline Resolve (orbit gradient)',
            module: resolve.module, layout: resolve.pipelineLayout, targets: displayTargetsWithOrbit,
        }))

        // ── Colour (display set → final colour) ──────────────────────────
        // All colour variants share a layout and the same authoritative shader.
        // Compile off the render path, including the simple palette family.
        // These are the palette-path-free variants; the path ones compile on
        // first use (ensurePathColorPipelines).
        const color = createPassLayout(device, 'Color', this.shaderPassColor, FRAGMENT, [
            bind.uniform(VERTEX | FRAGMENT), // baseParameters
            bind.data('2d-array'),           // tex: live values
            bind.image('2d-array'),          // tileTex
            bind.image('2d-array'),          // skyboxTex
            bind.image('2d-array'),          // webcamTex
            bind.image('2d-array'),          // paletteTex
            bind.data('2d-array'),           // texFrozen: frozen values
            bind.sampler(),                  // paletteSampler
            bind.sampler(),                  // mirrorSampler
            bind.data(),                     // aaTargetTex
            bind.data(),                     // geometryTex
            bind.data(),                     // frozenGeometryTex
            bind.uint(),                     // metadataTex
            bind.uint(),                     // frozenMetadataTex
            // Raw is retained only for analytic-AA Taylor expansion/reach;
            // ordinary colour values always come from the typed display set.
            bind.data('2d-array'),           // rawTex
            bind.data(),                     // orbitGradientTex
            bind.data(),                     // frozenOrbitGradientTex
            bind.data(),                     // trapPayloadTex
            bind.data(),                     // frozenTrapPayloadTex
            bind.readOnlyStorage(),          // palettePath
            bind.sampler(),                  // tileSampler
            ...(this.castShadowSupported ? [bind.data(), bind.data('2d-array')] : []), // castShadowHeightTex, lightOcclusionTex
        ])
        this.colorPipelineSource = { device, module: color.module, layout: color.pipelineLayout }
        const [full, simple, hdrFull, hdrSimple] = await Promise.all([
            this.createColorPipelines(device, color.module, color.pipelineLayout, true),
            this.createColorPipelines(device, color.module, color.pipelineLayout, false),
            this.createColorPipelines(device, color.module, color.pipelineLayout, true, true),
            this.createColorPipelines(device, color.module, color.pipelineLayout, false, true),
        ])
        if (this.device !== device || this.destroyed) return
        this.colorPipelines = { full, simple }
        this.hdrColorPipelines = { full: hdrFull, simple: hdrSimple }
        // A path prepared before the pipelines existed must not fall back to
        // the path-free variants (they ignore the bound path entirely).
        if (this.palettePathGpu) await this.ensurePathColorPipelines()
        if (this.device !== device || this.destroyed) return
        this.selectColorPipelines(true)

        // ── In-place compute (fused brush + iteration + count on A) ──────
        const inplace = createPassLayout(device, 'InplaceCompute', inplaceComputeShader, COMPUTE, [
            bind.uniform(),                  // mandelbrot
            bind.readOnlyStorage(),          // mandelbrotOrbitPointSuite: reference orbit
            bind.readOnlyStorage(),          // mandelbrotBlaSuite
            bind.readOnlyStorage(),          // mandelbrotBlaLevels
            bind.storageTexture('read-write', 'r32float', '2d-array'), // raw
            bind.uniform(),                  // brush
            bind.storage(),                  // counter
        ])
        this.inplaceModule = inplace.module
        this.inplaceBindGroupLayout = inplace.bindGroupLayout
        this.inplacePipelineLayout = inplace.pipelineLayout
        // Both hot specialisations compile up front, asynchronously: compiling
        // them synchronously held the GPU process long enough on Windows/D3D12
        // (DXC on NVIDIA) to trip Chromium's GPU watchdog. The shallow kernel is
        // mandatory; the deep (floatexp) one is heavier and some mobile Vulkan
        // drivers refuse it with VK_ERROR_INITIALIZATION_FAILED. Losing it
        // costs deep zoom, not the app, so degrade instead of failing init.
        // pipelineInplace stays the deep-capable default ("ready" guard).
        const { deep: pipelineDeep, shallow: pipelineShallow } = await this.compileInplacePipelines()
        if (this.device !== device || this.destroyed) return
        this.pipelineInplace = pipelineDeep ?? pipelineShallow

        // ── Utility compute (clear: reads A, rewrites B wholesale) ───────
        const reproject = createPassLayout(device, 'ReprojectCs', reprojectCsShader, COMPUTE, [
            bind.uniform(),
            bind.data('2d-array'),
            bind.storageTexture('write-only', 'r32float', '2d-array'),
        ])
        this.pipelineReprojectCs = device.createComputePipeline(computePipelineDescriptor({
            label: 'Engine ComputePipeline ReprojectCs', module: reproject.module, layout: reproject.pipelineLayout,
        }))

        // ── Pan clear (toroidal origin shift, in place on A) ─────────────
        const panClear = createPassLayout(device, 'PanClear', rawPanClearShader, COMPUTE, [
            bind.uniform(),
            bind.storageTexture('write-only', 'r32float', '2d-array'),
        ])
        this.pipelinePanClear = device.createComputePipeline(computePipelineDescriptor({
            label: 'Engine ComputePipeline PanClear', module: panClear.module, layout: panClear.pipelineLayout,
        }))

        // ── Merge (resolved + frozen → frozen, min-step wins, MRT) ───────
        const merge = createPassLayout(device, 'Merge', mergeFrozenShader, FRAGMENT, [
            bind.uniform(FRAGMENT | VERTEX), // uni
            bind.data('2d-array'),           // liveValues
            bind.data(),                     // liveGeometry
            bind.uint(),                     // liveMetadata
            bind.data('2d-array'),           // frozenValues
            bind.data(),                     // frozenGeometry
            bind.uint(),                     // frozenMetadata
            bind.data(),                     // liveOrbitGradient
            bind.data(),                     // frozenOrbitGradient
            bind.data(),                     // liveTrapPayload
            bind.data(),                     // frozenTrapPayload
            bind.storageTexture('write-only', 'rgba32float'), // trapOut
        ])
        this.pipelineMerge = device.createRenderPipeline(fullscreenPipelineDescriptor({
            label: 'Engine RenderPipeline Merge',
            module: merge.module, layout: merge.pipelineLayout, targets: displayTargetsWithoutOrbit,
        }))
        this.pipelineMergeOrbit = device.createRenderPipeline(fullscreenPipelineDescriptor({
            label: 'Engine RenderPipeline Merge (orbit gradient)',
            module: merge.module, layout: merge.pipelineLayout, targets: displayTargetsWithOrbit,
        }))

        // ── Present (AA accumulator → swapchain) ─────────────────────────
        // Same module, same transfer function, different reduction factor:
        // video export builds its pipelines from here so the film and the
        // screen can never disagree about linear → sRGB.
        const present = createPassLayout(device, 'Present', presentShader, FRAGMENT, [bind.data()])
        this.modulePresent = present.module
        this.layoutPresent = present.bindGroupLayout
        this.pipelinePresent = device.createRenderPipeline(fullscreenPipelineDescriptor({
            label: 'Engine RenderPipeline Present',
            module: present.module, layout: present.pipelineLayout, targets: [{ format: this.format }],
        }))

        // Tilted 3D view: rgba16float linear image, then the ordinary present.
        const tiltModule = device.createShaderModule({ code: tiltViewShader, label: 'Engine ShaderModule TiltView' })
        this.pipelineTiltView = device.createRenderPipeline({
            label: 'Engine RenderPipeline TiltView',
            layout: 'auto',
            vertex: { module: tiltModule, entryPoint: 'vs_main' },
            fragment: { module: tiltModule, entryPoint: 'fs_main', targets: [{ format: 'rgba16float' }] },
            primitive: { topology: 'triangle-list' },
        })
        this.tiltViewSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', label: 'Engine TiltView Sampler' })
        const distanceModule = device.createShaderModule({ code: tiltDistanceShader, label: 'Engine ShaderModule TiltDistance' })
        const distancePipeline = (entryPoint: string) => device.createRenderPipeline({
            label: `Engine RenderPipeline TiltDistance (${entryPoint})`,
            layout: 'auto',
            vertex: { module: distanceModule, entryPoint: 'vs_main' },
            fragment: { module: distanceModule, entryPoint, targets: [{ format: 'rg32float' }] },
            primitive: { topology: 'triangle-list' },
        })
        this.pipelineTiltSeed = distancePipeline('fs_seed')
        this.pipelineTiltJump = distancePipeline('fs_jump')
        const mipsModule = device.createShaderModule({ code: tiltMipsShader, label: 'Engine ShaderModule TiltMips' })
        const mipsPipeline = (entryPoint: string, format: GPUTextureFormat) => device.createRenderPipeline({
            label: `Engine RenderPipeline TiltMips (${entryPoint})`,
            layout: 'auto',
            vertex: { module: mipsModule, entryPoint: 'vs_main' },
            fragment: { module: mipsModule, entryPoint, targets: [{ format }] },
            primitive: { topology: 'triangle-list' },
        })
        this.pipelineTiltMarchHeight = mipsPipeline('fs_march_height', 'r16float')
        this.pipelineTiltMaxDown = mipsPipeline('fs_max_down', 'r16float')
        this.pipelineCastHeightMaxDown = mipsPipeline('fs_height_max_down', CAST_SHADOW_HEIGHT_FORMAT)
        const closingModule = device.createShaderModule({ code: heightClosingShader, label: 'Engine ShaderModule HeightClosing' })
        const closingPipeline = (entryPoint: string, format: GPUTextureFormat) => device.createRenderPipeline({
            label: `Engine RenderPipeline HeightClosing (${entryPoint})`,
            layout: 'auto',
            vertex: { module: closingModule, entryPoint: 'vs_main' },
            fragment: { module: closingModule, entryPoint, targets: [{ format }] },
            primitive: { topology: 'triangle-list' },
        })
        this.pipelineHeightDilate = closingPipeline('fs_dilate', 'r32float')
        this.pipelineHeightErode = closingPipeline('fs_erode', 'r32float')
        this.pipelineHeightErodeFinal = closingPipeline('fs_erode_final', CAST_SHADOW_HEIGHT_FORMAT)
        this.heightClosingUniforms = [0, 1].map(axis => device.createBuffer({
            size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `Engine HeightClosing Uniform (axis ${axis})`,
        }))
        this.pipelineTiltColorBase = mipsPipeline('fs_color_base', 'rgba16float')
        this.pipelineTiltColorDown = mipsPipeline('fs_color_down', 'rgba16float')
        const tiltUniform = (label: string) => device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label })
        this.tiltViewUniformLive = tiltUniform('Engine TiltView Uniform (live)')
        this.tiltViewUniformExport = tiltUniform('Engine TiltView Uniform (export)')

        // Rotation present is a separate terminal branch from AA: it samples
        // only the final-colour cache and can therefore never become sample
        // zero (or any other sample) of the AA estimator.
        const rotationPresent = createPassLayout(device, 'RotationPresent', rotationPresentShader, FRAGMENT, [
            bind.uniform(),
            bind.image(),
            bind.sampler(),
        ])
        this.pipelineRotationPresent = device.createRenderPipeline(fullscreenPipelineDescriptor({
            label: 'Engine RenderPipeline RotationPresent',
            module: rotationPresent.module, layout: rotationPresent.pipelineLayout, targets: [{ format: this.format }],
        }))

        this.presentationPipelines = {
            sdr: this.pipelinePresent,
            rotationSdr: this.pipelineRotationPresent,
            hdr: device.createRenderPipeline(fullscreenPipelineDescriptor({
                module: present.module, layout: present.pipelineLayout,
                targets: [{ format: 'rgba16float' }], constants: { HDR_OUTPUT: 1 },
            })),
            rotationHdr: device.createRenderPipeline(fullscreenPipelineDescriptor({
                module: rotationPresent.module, layout: rotationPresent.pipelineLayout,
                targets: [{ format: 'rgba16float' }], constants: { HDR_OUTPUT: 1 },
            })),
        }
        this.configureOutput()

        // ── AA target-map bake (DE ∪ contrast ∪ moiré → samples per texel) ──
        const aaTarget = createPassLayout(device, 'AaTarget', aaTargetShader, COMPUTE, [
            bind.data('2d-array'),
            bind.data(),
            bind.storageTexture('write-only', 'r32float'),
            bind.uniform(),
            bind.image(),                    // sample-0 composite (contrast ramp)
        ])
        this.pipelineAaTarget = device.createComputePipeline(computePipelineDescriptor({
            label: 'Engine ComputePipeline AaTarget', module: aaTarget.module, layout: aaTarget.pipelineLayout,
        }))
        if (!this.uniformBufferAaTarget) {
            this.uniformBufferAaTarget = device.createBuffer({
                // Shared bake/reseed parameters: [antialiasLevel, aaSampleIndex,
                // screenHeightPx, aaLogDelta, aaAnalytic, aspect, sceneSin,
                // sceneCos, screenWidthPx, palettePeriod, mu, logMu, aaContrast,
                // aaFull, iterationPaletteCurve, pad, rawOriginX, rawOriginY,
                // tileOriginX, tileOriginY, neutralSize, rotationUnion]
                size: 96,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                label: 'Engine UniformBuffer AaParams',
            })
        }

        // ── AA selective reseed (Stage B) ────────────────────────────────
        const aaReseed = createPassLayout(device, 'AaReseed', aaReseedShader, COMPUTE, [
            bind.storageTexture('read-write', 'r32float'),
            bind.storageTexture('write-only', 'r32float'),
            bind.uniform(),
            bind.data('2d-array'),
            bind.storage(),                  // frontier stats
            // Coherent sample-0 centre iter/z paired with raw Taylor layers 8..12.
            bind.data('2d-array'),
        ])
        this.pipelineAaReseed = device.createComputePipeline(computePipelineDescriptor({
            label: 'Engine ComputePipeline AaReseed', module: aaReseed.module, layout: aaReseed.pipelineLayout,
        }))
        // Frontier stats: [stamped, eligible] u32 pair, cleared before each reseed.
        if (!this.aaFrontierBuffer) {
            this.aaFrontierBuffer = device.createBuffer({
                size: 8,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
                label: 'Engine AaFrontier Storage',
            })
            this.aaFrontierReadback = device.createBuffer({
                size: 8,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                label: 'Engine AaFrontier Readback',
            })
        }

        // Bind groups depend on the textures: rebuilt by resize().
        this.bindGroupResolve = undefined
        this.bindGroupColor = undefined
        this.bindGroupMerge = undefined
        this.bindGroupInplace = undefined
        this.bindGroupReprojectCs = undefined
        this.bindGroupPresent = undefined
        this.bindGroupRotationPresent = undefined
    }

    /** Timestamp readback of one frame: feeds the panel EMAs and the batch controller. */
    private onPassTimingSample(sample: PassTimingSample<IterationBatchTimingContext>) {
        this.budget.recordFixedPasses(sample.otherPassesMs)
        // On timestamp-capable adapters the span is the authoritative duration
        // of the submitted GPU frame. In particular it excludes browser/queue
        // notification latency, which can make onSubmittedWorkDone() arrive
        // much later on zooms.
        if (sample.spanMs !== undefined) this.onGpuFrameTiming(sample.spanMs, sample.context)
        if (sample.iterationPassMs !== undefined) {
            this.budget.recordPassTiming(sample.iterationPassMs, sample.context, sample.otherPassesMs)
        }
    }

    // Lazily build + cache a specialized in-place kernel for the given override
    // combination. Adding an axis (e.g. AA) means extending the key and the
    // constants map here and precompiling the new hot combo at init.
    private inplacePipelineSpec(deep: boolean): { key: string, descriptor: GPUComputePipelineDescriptor } {
        // ENABLE_DEEP is the only specialisation axis of the minimal kernel.
        // The old portfolio / renorm / periodic / validity / stats overrides
        // do not exist in it (an unknown constant would fail validation).
        const key = `d${deep ? 1 : 0}`
        return {
            key,
            descriptor: computePipelineDescriptor({
                label: `Engine ComputePipeline InplaceBrush (deep=${deep})`,
                module: this.inplaceModule!,
                layout: this.inplacePipelineLayout!,
                constants: { ENABLE_DEEP: deep ? 1 : 0 },
            }),
        }
    }

    /**
     * Build the two hot in-place kernels. The shallow kernel is mandatory; the
     * deep (floatexp) one is dropped when the driver refuses it (deep zoom
     * then runs on the shallow f32 kernel).
     */
    private async compileInplacePipelines(): Promise<{ deep?: GPUComputePipeline, shallow: GPUComputePipeline }> {
        const device = this.device
        const [deep, shallow] = await Promise.all([
            this.precompileInplacePipeline(true).catch((error: unknown) => {
                if (this.device !== device || this.destroyed) return undefined
                console.warn('[Engine] deep (floatexp) compute pipeline unavailable on this device;'
                    + ' deep zoom will fall back to the shallow f32 kernel', error)
                this.inplaceDeepUnavailable = true
                return undefined
            }),
            this.precompileInplacePipeline(false).catch((error: unknown) => {
                throw new Error(t('engine.webgpu.mainKernelCompileFailed', { detail: describeGpuError(error) }))
            }),
        ])
        return { deep, shallow }
    }

    /** Deduplicate asynchronous compilation and never publish an old-device result. */
    private precompileInplacePipeline(deep: boolean): Promise<GPUComputePipeline> {
        const { key, descriptor } = this.inplacePipelineSpec(deep)
        const cached = this.inplacePipelineCache.get(key)
        if (cached) return Promise.resolve(cached)
        const pending = this.inplacePipelinePending.get(key)
        if (pending) return pending
        const device = this.device
        const compilation = device.createComputePipelineAsync(descriptor).then(pipeline => {
            if (this.device === device && !this.destroyed) {
                this.inplacePipelineCache.set(key, pipeline)
            }
            return pipeline
        }).finally(() => {
            if (this.inplacePipelinePending.get(key) === compilation) {
                this.inplacePipelinePending.delete(key)
            }
        })
        this.inplacePipelinePending.set(key, compilation)
        return compilation
    }

    private async createColorPipelines(device: GPUDevice, module: GPUShaderModule, layout: GPUPipelineLayout, surfaceEffects: boolean, hdr = false, palettePath = false): Promise<ColorPipelines> {
        const constants = {
            ENABLE_SURFACE_EFFECTS: surfaceEffects ? 1 : 0,
            HDR_OUTPUT: hdr ? 1 : 0,
            ENABLE_PALETTE_PATH: palettePath ? 1 : 0,
        }
        const create = (entryPoint: string, target: GPUColorTargetState, rotation = false, layers = 1) =>
            device.createRenderPipelineAsync(fullscreenPipelineDescriptor({
                label: `Engine Color (${surfaceEffects ? 'full' : 'simple'}${palettePath ? ', path' : ''}, ${entryPoint}${target.blend ? ', accum' : ''})`,
                module,
                layout,
                targets: Array.from({ length: layers }, () => target),
                constants,
                vertexEntry: rotation ? 'vs_rotation_cache' : 'vs_main',
                fragmentEntry: entryPoint,
            }))
        const castShadows = surfaceEffects && this.castShadowSupported
        const [direct, rotation, clear, accum, castHeight, castHeightRotation, lightOcclusion, lightOcclusionRotation] = await Promise.all([
            create('fs_main_direct', { format: hdr ? 'rgba16float' : this.format }),
            create('fs_rotation_cache', { format: 'rgba16float' }, true),
            create('fs_main', { format: 'rgba16float' }),
            create('fs_main', {
                format: 'rgba16float',
                blend: {
                    color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
                    alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
                },
            }),
            castShadows ? create('fs_cast_height', { format: CAST_SHADOW_HEIGHT_FORMAT }) : undefined,
            castShadows ? create('fs_cast_height_rotation', { format: CAST_SHADOW_HEIGHT_FORMAT }, true) : undefined,
            castShadows ? create('fs_light_occlusion', { format: LIGHT_OCCLUSION_FORMAT }, false, LIGHT_OCCLUSION_LAYERS) : undefined,
            castShadows ? create('fs_light_occlusion_rotation', { format: LIGHT_OCCLUSION_FORMAT }, true, LIGHT_OCCLUSION_LAYERS) : undefined,
        ])
        return { direct, rotation, clear, accum,
            ...(castHeight && castHeightRotation ? { castHeight, castHeightRotation } : {}),
            ...(lightOcclusion && lightOcclusionRotation ? { lightOcclusion, lightOcclusionRotation } : {}) }
    }

    /**
     * Compile the ENABLE_PALETTE_PATH variants once. Awaited before a palette
     * path is bound, so selection never has to fall back to the path-free
     * pipelines while a path is active.
     */
    private ensurePathColorPipelines(): Promise<void> {
        const source = this.colorPipelineSource
        if (!source) return Promise.resolve()
        this.pathColorPipelinesPromise ??= (async () => {
            const { device, module, layout } = source
            const [full, simple, hdrFull, hdrSimple] = await Promise.all([
                this.createColorPipelines(device, module, layout, true, false, true),
                this.createColorPipelines(device, module, layout, false, false, true),
                this.createColorPipelines(device, module, layout, true, true, true),
                this.createColorPipelines(device, module, layout, false, true, true),
            ])
            if (this.device !== device || this.destroyed) return
            this.pathColorPipelines = { sdr: { full, simple }, hdr: { full: hdrFull, simple: hdrSimple } }
        })()
        return this.pathColorPipelinesPromise
    }

    private colorPipelineFamily(hdr: boolean): ColorPipelineFamily | undefined {
        if (this.palettePathGpu) {
            const path = this.pathColorPipelines
            return path ? (hdr ? path.hdr : path.sdr) : undefined
        }
        return hdr ? this.hdrColorPipelines : this.colorPipelines
    }

    private selectColorPipelines(surfaceEffects: boolean): void {
        const family = this.colorPipelineFamily(this.hdrRendering)
        const pipelines = surfaceEffects ? family?.full : family?.simple
        if (!pipelines) return
        this.pipelineColor = pipelines.direct
        this.pipelineRotationColorCache = pipelines.rotation
        this.pipelineColorAccumClear = pipelines.clear
        this.pipelineColorAccum = pipelines.accum
        this.pipelineCastHeight = pipelines.castHeight
        this.pipelineCastHeightRotation = pipelines.castHeightRotation
        this.pipelineLightOcclusion = pipelines.lightOcclusion
        this.pipelineLightOcclusionRotation = pipelines.lightOcclusionRotation
    }

    private rebuildInplaceBindGroup() {
        if (!this.pipelineInplace || !this.rawArrayView || !this.uniformBufferMandelbrot
            || !this.mandelbrotReferenceBuffer || !this.mandelbrotBlaBuffer || !this.mandelbrotBlaLevelBuffer
            || !this.uniformBufferBrush || !this.counter.buffer) {
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
                { binding: 6, resource: { buffer: this.counter.buffer } },
            ],
            label: 'Engine BindGroup InplaceCompute',
        })
    }

    // Rebuild the bind group sharing the orbit/BLA buffers — called whenever
    // one of those buffers reallocates.
    private rebuildIterationBindGroups() {
        if (!this.uniformBufferMandelbrot
            || !this.mandelbrotReferenceBuffer || !this.mandelbrotBlaBuffer || !this.mandelbrotBlaLevelBuffer) {
            return
        }

        this.rebuildInplaceBindGroup()
    }

    private writeBlaTable(table: BlaTablePayload) {
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
            size: safeRequiredEntries * 4 * BLA_LEVEL_U32S,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot BLA Level Storage Buffer',
        })
        this.mandelbrotBlaLevelBufferCapacity = safeRequiredEntries
        this.rebuildIterationBindGroups()
    }

    /** Largest 2D texture side this device allows (8192 when unknown). */
    get maxTextureDimension(): number {
        return this.device?.limits?.maxTextureDimension2D ?? 8192
    }

    private invalidateCounterReadback() {
        this.counter.invalidate()
    }

    private hasPendingCounterReadbackForCurrentGeneration(): boolean {
        return this.counter.hasPendingForCurrentGeneration()
    }

    /**
     * The field is converged and the evidence for it is fresh.
     *
     * The pixel count alone is not evidence: it arrives by asynchronous
     * readback, so a small `unfinishedPixelCount` may predate the last mutation
     * of the raw field. `hasPendingCounterReadbackForCurrentGeneration()` is
     * therefore part of the predicate, not a detail — without it a caller can
     * conclude "converged" from a stale counter and act on a half-computed
     * image.
     *
     * The threshold is `UNFINISHED_PIXEL_DONE_THRESHOLD` rather than exactly 0:
     * a few pixels can linger indefinitely near numerical limits, and the render
     * loop stops driving frames at that same threshold — requiring 0 here would
     * deadlock every consumer on such a view.
     *
     * @param ignoreZoomCycle Video export only. The export deliberately keeps
     *   the frozen/live zoom cycle alive across the whole parcours (one raw
     *   convergence serves many emitted frames), so `isZoomActive` would be
     *   permanently true and the predicate permanently false. Every other term
     *   is unchanged: this relaxes *which* frames qualify, never *how strong*
     *   the convergence evidence must be.
     */
    private isFieldConverged(ignoreZoomCycle = false): boolean {
        return evaluateFieldConvergence({
            clearPending: this.requests.clearPending,
            snapshotPending: this.tiled ? false : this.requests.snapshot !== null,
            zoomActive: isZoomActive(this.zoomState),
            orbitIncomplete: this.orbitIncomplete,
            unfinishedPixelCount: this.unfinishedPixelCount,
            pendingCounterReadback: this.hasPendingCounterReadbackForCurrentGeneration(),
        }, { ignoreZoomCycle })
    }

    /**
     * The reference the field is converging on is not the one the worker will
     * settle on for this view: a newer reference is staged, the worker has not
     * answered the latest reset/view yet (a restart is about to be staged), or
     * the visible orbit prefix is still short.
     *
     * Orbit length alone is not enough: the Rust orbit rebases to 0 when the
     * reference escapes and keeps going to maxIter, so an early-escaping
     * reference (e.g. ~695 iterations out of 35 788 right after a teleport)
     * reports a full-length orbit. Exact perturbation on it converges to a
     * wrong but stable field (a minibrot interior painted flat at the
     * reference's escape iteration) until the recentred orbit is promoted.
     * A still must wait for that promotion; the live view and video export
     * do not (they render progressively across the hand-over).
     */
    exportReferencePending(): boolean {
        return this.reference.exportPending(this.currentMaxIterations)
    }

    /**
     * Convergence gate for video export: identical to the real-time predicate
     * except that a running frozen/live zoom cycle no longer disqualifies the
     * frame. A true result means this frame is safe to capture and encode.
     */
    videoFrameReady(): boolean {
        if (this.videoExportFrameEvaluationPending) return false
        if (!this.isFieldConverged(true)) return false
        if (this.expmap && this.unfinishedPixelCount !== 0) return false
        if (this.tiled) {
            if (!this.tiled.complete) return this.finishCurrentTiledKeyframeTile()
            this.tiledKeyframeDiagnostics.freeFrames++
            return true
        }
        if (this.exportAaSamples <= 1) return true
        // With AA on, "ready" means the accumulation finished too: capturing
        // mid-accumulation would emit a frame averaged over fewer samples than
        // its neighbours, which reads as flicker in the film.
        return !this.aaActive && this.aaAccumulatedSamples >= this.exportAaSamples
    }

    private beginNextTiledKeyframe(): void {
        const tiled = this.tiled
        if (!tiled || !tiled.complete
            || !this.tiledLiveDisplay || !this.frozenDisplay) return
        const completedLive = this.tiledLiveDisplay
        this.tiledLiveDisplay = this.frozenDisplay
        this.frozenDisplay = completedLive
        restartKeyframe(tiled)
        this.frozenAligned = true
        this.grids.alignFrozenToLive()
        this.frozenDisplayVersion = this.resolvedDisplayVersion
        this.requests.cancelSnapshot()
        this.requests.requestClear('tile')
        this.rawOriginX = 0
        this.rawOriginY = 0
        this.resolvedDisplayVersion = -1
        this.resetAaState()
        this.invalidateCounterReadback()
        this.rebuildColorBindGroup()
        this.needRender = true
    }

    private copyDisplayTile(
        encoder: GPUCommandEncoder,
        source: DisplaySet,
        destination: DisplaySet,
        tile: KeyframeTile,
    ): void {
        const destinationOrigin = { x: tile.originX, y: tile.originY }
        const extent = { width: tile.width, height: tile.height }
        encoder.copyTextureToTexture(
            { texture: source.valuesTexture },
            { texture: destination.valuesTexture, origin: destinationOrigin },
            { ...extent, depthOrArrayLayers: DISPLAY_VALUE_LAYERS },
        )
        encoder.copyTextureToTexture(
            { texture: source.geometryTexture },
            { texture: destination.geometryTexture, origin: destinationOrigin },
            extent,
        )
        encoder.copyTextureToTexture(
            { texture: source.metadataTexture },
            { texture: destination.metadataTexture, origin: destinationOrigin },
            extent,
        )
        if (source.orbitGradientTexture && destination.orbitGradientTexture) {
            encoder.copyTextureToTexture(
                { texture: source.orbitGradientTexture },
                { texture: destination.orbitGradientTexture, origin: destinationOrigin },
                extent,
            )
        }
        if (source.trapPayloadTexture && destination.trapPayloadTexture) {
            encoder.copyTextureToTexture(
                { texture: source.trapPayloadTexture },
                { texture: destination.trapPayloadTexture, origin: destinationOrigin },
                extent,
            )
        }
    }

    private finishCurrentTiledKeyframeTile(): boolean {
        const tiled = this.tiled
        const tile = this.currentTiledKeyframeTile()
        if (!tiled || !tile || !this.resolvedDisplay || !this.tiledLiveDisplay) return false

        const encoder = this.device.createCommandEncoder({ label: 'Engine Copy Tiled Keyframe Tile' })
        this.copyDisplayTile(encoder, this.resolvedDisplay, this.tiledLiveDisplay, tile)
        this.device.queue.submit([encoder.finish()])
        this.tiledKeyframeDiagnostics.tilesConverted++

        if (advanceTile(tiled) === 'keyframeComplete') {
            this.tiledKeyframeDiagnostics.keyframesBuilt++
            this.rebuildColorBindGroup()
            return true
        }

        this.requests.requestClear('tile')
        this.requests.cancelSnapshot()
        this.rawOriginX = 0
        this.rawOriginY = 0
        this.resolvedDisplayVersion = -1
        this.resetAaState()
        this.invalidateCounterReadback()
        this.needRender = true
        return false
    }

    /**
     * Real-time convergence gate, exposed for tests and diagnostics. Equivalent
     * to what the AA trigger and AA composite consume inside `render()`.
     */
    isViewFullyConverged(): boolean {
        return this.isFieldConverged()
    }

    // ── Video export session ──────────────────────────────────────────

    /** True until update()+render() has observed the newly selected path time. */
    private videoExportFrameEvaluationPending = false
    /** ExpMap block colour pipeline, compiled on the first block of a session. */
    private expmapCapturePipeline?: GPURenderPipeline

    /** Prepare an isolated direct-grid block. The caller places the navigator
     * at projection.scale and the immutable document center before pumping.
     * Reuse the session allocation and clear block-local history while retaining
     * the orbit/table resources.
     */
    async prepareExpmapBlock(projection: ExpmapKernelProjection, appearance: RenderOptions): Promise<void> {
        const session = this.session
        if (!session || session.layout.kind === 'tiled') throw new Error('ExpMap requires an exclusive monolithic export session')
        if (projection.uniforms.length !== 12 || !Array.from(projection.uniforms).every(Number.isFinite)
            || !Number.isInteger(projection.width) || !Number.isInteger(projection.height)
            || projection.width < 1 || projection.height < 1
            || projection.width > this.width || projection.height > this.height) {
            throw new Error('Invalid ExpMap block or block exceeds the preallocated session size')
        }
        if (!this.expmapCapturePipeline) {
            const device = this.device
            const module = device.createShaderModule({ code: this.shaderPassColor, label: 'ExpMap Direct Color' })
            const pipeline = await device.createRenderPipelineAsync(fullscreenPipelineDescriptor({
                module,
                layout: device.createPipelineLayout({ bindGroupLayouts: [this.pipelineColor!.getBindGroupLayout(0)] }),
                fragmentEntry: 'fs_expmap',
                constants: { ENABLE_SURFACE_EFFECTS: 1 },
                targets: [{ format: 'rgba16float' }],
            }))
            if (this.device !== device || this.destroyed) throw new Error('Device changed during ExpMap compilation')
            this.expmapCapturePipeline = pipeline
        }
        const firstBlock = session.layout.kind !== 'expmap'
        const savedNumerics = session.layout.kind === 'expmap'
            ? session.layout.savedNumerics
            : { mode: this.approximationMode, epsilon: this.blaEpsilon, skip: this.maxBlaSkip, precision: this.precisionBudget }
        if (firstBlock) {
            const recipe = appearance as RenderOptions & { approximationMode?: ApproximationMode; blaEpsilon?: number; maxBlaSkip?: number }
            if (recipe.approximationMode) this.setApproximationMode(recipe.approximationMode)
            if (recipe.blaEpsilon !== undefined) this.setBlaEpsilon(recipe.blaEpsilon)
            if (recipe.maxBlaSkip !== undefined) this.setMaxBlaSkip(recipe.maxBlaSkip)
            this.setPrecisionBudget(projection.precisionScale)
        }
        session.layout = {
            kind: 'expmap',
            projection: { ...projection, uniforms: new Float32Array(projection.uniforms) },
            appearance: structuredClone(appearance),
            savedNumerics,
        }
        // The session pins one surface large enough for every block. Reallocating
        // it for each thin tail strip adds canvas/texture setup to every row.
        // Preserve allocations; clear the same unsafe local state as a tile change.
        if (firstBlock) this.resize()
        this.requests.requestClear('expmapBlock')
        this.requests.cancelSnapshot()
        this.rawOriginX = 0
        this.rawOriginY = 0
        this.prevFrameMandelbrot = undefined
        this.resolvedDisplayVersion = -1
        this.resetAaState()
        this.invalidateCounterReadback()
        this.needRender = true
        this.videoExportFrameEvaluationPending = true
    }

    /** Read one converged useful rectangle, preserving the 48-byte display ABI.
     * Row-aligned staging is released per plane; no full octave allocation. */
    async captureExpmapDisplay(rect: { x: number; y: number; width: number; height: number }): Promise<Uint8Array> {
        if (!this.expmap?.projection.displaySet || !this.videoFrameReady() || !this.resolvedDisplay) {
            throw new Error('A converged shader ExpMap block is required')
        }
        if (![rect.x, rect.y, rect.width, rect.height].every(Number.isSafeInteger)
            || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1
            || rect.x + rect.width > this.expmap.projection.width || rect.y + rect.height > this.expmap.projection.height) {
            throw new Error('Invalid display capture rectangle')
        }
        const d = this.resolvedDisplay, output = new Uint8Array(rect.width * rect.height * 48)
        const planes = [
            { texture: d.valuesTexture, layer: 0, bytes: 4, offset: 0 },
            { texture: d.valuesTexture, layer: 1, bytes: 4, offset: 4 },
            { texture: d.valuesTexture, layer: 2, bytes: 4, offset: 8 },
            { texture: d.geometryTexture, layer: 0, bytes: 8, offset: 12 },
            { texture: d.metadataTexture, layer: 0, bytes: 4, offset: 20 },
            { texture: d.orbitGradientTexture, layer: 0, bytes: 8, offset: 24 },
            { texture: d.trapPayloadTexture, layer: 0, bytes: 16, offset: 32 },
        ]
        for (const plane of planes) {
            if (!plane.texture) continue // absent trap payload is invalid (all zero)
            const pitch = Math.ceil(rect.width * plane.bytes / 256) * 256
            const buffer = this.device.createBuffer({ size: pitch * rect.height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
            try {
                const encoder = this.device.createCommandEncoder()
                encoder.copyTextureToBuffer({ texture: plane.texture, origin: [rect.x, rect.y, plane.layer] },
                    { buffer, bytesPerRow: pitch }, [rect.width, rect.height, 1])
                this.device.queue.submit([encoder.finish()])
                await buffer.mapAsync(GPUMapMode.READ)
                const bytes = new Uint8Array(buffer.getMappedRange())
                for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
                    const src = y * pitch + x * plane.bytes
                    output.set(bytes.subarray(src, src + plane.bytes), (y * rect.width + x) * 48 + plane.offset)
                }
            } finally { buffer.unmap(); buffer.destroy() }
        }
        return output
    }

    get isExpmapProductionActive(): boolean { return this.expmap !== null }

    isVideoExportActive(): boolean {
        return this.exporting
    }

    /**
     * AA budget in force. An export overrides the interactive setting: its
     * sample count is a property of the film being rendered, not of whatever
     * the viewer happened to be set to.
     */
    private effectiveAntialiasLevel(requested: number | undefined): number {
        return normalizeAntialiasLevel(this.exporting ? this.exportAaSamples : requested)
    }

    /** Start a fresh accumulation for the next exported frame. */
    beginExportFrameAa(): void {
        if (this.exporting && this.exportAaSamples > 1) this.resetAaState()
    }

    beginVideoExportFrame(): void {
        if (!this.exporting) return
        this.videoExportFrameEvaluationPending = true
        this.needRender = true
    }

    /**
     * Wait until the GPU has finished everything submitted so far.
     *
     * REQUIRED between export render pumps, and not merely as pacing. The
     * unfinished-pixel counter arrives through `mapAsync`, whose callback is
     * delivered on the task queue. A pump loop built only from `drawOnce()`
     * awaits nothing but microtasks (Vue's nextTick, internal promises), so it
     * starves that queue: the three readback slots fill up, no further counter
     * is dispatched, `unfinishedPixelCount` freezes at whatever it held before
     * the loop started, and every frame times out having "never converged".
     *
     * Chosen over `setTimeout(0)` because a hidden tab throttles timers to
     * ~2.5 Hz while GPU-completion promises still resolve at ~12 kHz — yielding
     * through the GPU keeps background exports at full speed.
     */
    /** True while an export owns the engine — used to keep interactive-only
     *  telemetry (the fps meter) from reporting the export's pump rate. */
    get isExportDriven(): boolean {
        return this.exporting
    }

    async waitForSubmittedWork(): Promise<void> {
        await this.device?.queue.onSubmittedWorkDone()
    }

    /**
     * Dev/bench readback of the raw iteration field (layers 0, 2, 3 = iter,
     * z.x, z.y) of the front raw texture, in logical texel order (the toroidal
     * origin is undone here). Neutral-space square of side `side`; use
     * `neutralTexelFor` semantics (see readIterPixel) to map screen pixels.
     */
    async readRawField(): Promise<{ side: number; iter: Float32Array; zx: Float32Array; zy: Float32Array }> {
        const texture = this.rawTexture
        if (!this.device || !texture) throw new Error('[Engine] raw texture unavailable')
        const side = texture.width
        const bytesPerRow = (side * 4 + 255) & ~255
        const layers = [0, 2, 3]
        const buffer = this.device.createBuffer({
            size: bytesPerRow * side * layers.length,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: 'Engine RawField Readback',
        })
        const encoder = this.device.createCommandEncoder()
        layers.forEach((layer, i) => encoder.copyTextureToBuffer(
            { texture, origin: { x: 0, y: 0, z: layer } },
            { buffer, offset: bytesPerRow * side * i, bytesPerRow, rowsPerImage: side },
            { width: side, height: side, depthOrArrayLayers: 1 },
        ))
        this.device.queue.submit([encoder.finish()])
        await buffer.mapAsync(GPUMapMode.READ)
        const mapped = new Float32Array(buffer.getMappedRange())
        const stride = bytesPerRow / 4
        const ox = this.rawOriginX
        const oy = this.rawOriginY
        const out = layers.map((_, i) => {
            const plane = new Float32Array(side * side)
            const base = i * stride * side
            for (let y = 0; y < side; y++) {
                const py = (((y + oy) % side) + side) % side
                for (let x = 0; x < side; x++) {
                    const px = (((x + ox) % side) + side) % side
                    plane[y * side + x] = mapped[base + py * stride + px]
                }
            }
            return plane
        })
        buffer.unmap()
        buffer.destroy()
        return { side, iter: out[0], zx: out[1], zy: out[2] }
    }

    /**
     * Switch the engine into export mode.
     *
     * `magnificationThreshold` must not exceed the DPR multiplier: the frozen
     * texture is magnified by up to the threshold between swaps, so a threshold
     * above the supersampling factor shows visibly undersampled pixels in the
     * outer ring. The caller is expected to have validated this, and the guard
     * here is the last line of defence rather than the first.
     *
     * `targetFps` is driven to a floor rather than a ceiling: the adaptive batch
     * controller sizes GPU batches to hit it, and an export has no latency
     * budget to protect — bigger batches mean fewer dispatches per convergence.
     */
    /** Side of the square working texture a given render surface needs. */
    static workingTextureSideFor(width: number, height: number): number {
        return neutralSizeFor(width, height)
    }

    /** Allocation contract consumed by the pure planner and the export panel. */
    static tiledExportMemoryProfileFor(options: {
        orbitMetrics: boolean
        orbitTrap: boolean
    }): TiledExportMemoryProfile {
        const optionalDisplayBytes = (options.orbitMetrics ? 8 : 0)
            + (options.orbitTrap ? 16 : 0)
        const rawLayers = options.orbitTrap
            ? (options.orbitMetrics ? RAW_ORBIT_GRADIENT_TRAP_LAYERS : RAW_TRAP_LAYERS)
            : (options.orbitMetrics ? RAW_ORBIT_GRADIENT_LAYERS : RAW_LAYERS)
        return {
            // Two complete display sets plus the rgba16float rotation/color target.
            squareBytesPerTexel: 2 * (24 + optionalDisplayBytes) + 8,
            // Raw A/B, tile resolve and r32float AA target; tiled export has no merge.
            tileBytesPerTexel: 2 * rawLayers * 4
                + (24 + optionalDisplayBytes)
                + 4,
        }
    }

    getTiledExportMemoryProfile(): TiledExportMemoryProfile {
        return Engine.tiledExportMemoryProfileFor({
            orbitMetrics: this.orbitMetricsEnabled,
            orbitTrap: this.orbitTrapEnabled,
        })
    }

    getVideoExportDiagnostics() {
        return {
            ...this.tiledKeyframeDiagnostics,
            pumpsPerTile: [...this.tiledKeyframeDiagnostics.pumpsPerTile],
        }
    }

    async beginVideoExportSession(settings: ExportSessionSettings): Promise<void> {
        if (this.session) {
            throw new Error(t('engine.export.sessionActive'))
        }
        const {side, estimatedBytes, overBudget} = validateExportSettings(settings, {
            maxTextureDimension: this.device?.limits?.maxTextureDimension2D ?? 8192,
            gpuMemoryBudgetBytes: this.gpuMemoryBudgetBytes,
            orbitMetrics: this.orbitMetricsEnabled,
            orbitTrap: this.orbitTrapEnabled,
        })
        if (overBudget) {
            console.warn(
                `${settings.outputWidth}×${settings.outputHeight} en ×${settings.supersample} `
                + `nécessiterait environ ${formatGpuBytes(estimatedBytes)}, au-delà du budget prudent `
                + `${formatGpuBytes(this.gpuMemoryBudgetBytes)} de cet appareil. `
                + 'Export autorisé : la capacité réelle sera vérifiée lors de l’allocation GPU.',
            )
        }

        // Park the interactive render loop. It calls the SAME draw() the export
        // loop drives, so leaving it armed means two drivers rendering the same
        // engine at once: duplicated GPU work per exported frame, an fps meter
        // reporting the export's pump rate instead of anything meaningful, and
        // interleaved update() calls racing the export's camera placement.
        this.session = createExportSession(settings, {
            zoomMagnificationThreshold: this.zoomMagnificationThreshold,
            dprMultiplier: this.dprMultiplier,
            targetFps: this.targetFps,
            aaAuto: this.aaAuto,
        }, this._drawFn)
        this.stopRenderLoop()
        this.tiledKeyframeDiagnostics = {
            keyframesBuilt: 0,
            tilesConverted: 0,
            pumpsPerTile: settings.tiledKeyframePlan?.tiles.map(() => 0) ?? [],
            freeFrames: 0,
        }
        this.zoomMagnificationThreshold = settings.magnificationThreshold
        this.targetFps = settings.batchTargetFps
        this.aaAuto = false
        // The pinned size only takes effect through a reallocation, which also
        // resets the zoom state — giving the session a clean, deterministic
        // starting point rather than whatever the interactive view left behind.
        //
        // Scoped because WebGPU reports allocation failures asynchronously
        // rather than throwing: without this, an oversized or unaffordable
        // surface yields invalid textures and the export renders a black film
        // at full speed, with nothing to tell the user why.
        this.device.pushErrorScope('out-of-memory')
        this.device.pushErrorScope('validation')
        this.resize()
        const validationError = await this.device.popErrorScope()
        const memoryError = await this.device.popErrorScope()
        if (validationError || memoryError) {
            const reason = memoryError ? t('engine.export.reasonMemory') : t('engine.export.reasonRefused')
            this.endVideoExportSession()
            throw new Error(t('engine.export.allocationFailed', {
                width: settings.outputWidth * settings.supersample,
                height: settings.outputHeight * settings.supersample,
                side,
                reason,
            }))
        }
    }

    /**
     * Request a capture of the current view as a `VideoFrame`, at an arbitrary
     * output resolution independent of the canvas.
     *
     * Resolution independence is what makes an export reproducible: the colour
     * pass derives its coordinates from normalized vertex UVs, so rendering into
     * a target of any size only changes sampling density. Driving the output
     * size from the window instead would make the same parcours produce a
     * different film after a window resize.
     *
     * The frame is produced at the END of the next render(), reusing that
     * frame's colour bind group — the same reason the PNG snapshot path lives
     * there rather than rebuilding the pass from outside.
     */
    captureHdrFrame(width: number, height: number, supersample = 1, hdrOptions: HdrGpuOptions = {format:'video'}): Promise<Uint16Array> {
        if (!this.session?.hdr) return Promise.reject(new Error(t('engine.export.hdrSessionRequired')))
        const frame = this.capture.requestHdr(width, height, supersample, hdrOptions, this.device.limits.maxTextureDimension2D)
        if (this.capture.isPending) this.needRender = true
        return frame
    }

    captureExportFrame(request: {
        outputWidth: number
        outputHeight: number
        supersample: number
        timestampMicros: number
        durationMicros: number
    }): Promise<VideoFrame> {
        if (this.session?.hdr) return Promise.reject(new Error(t('engine.export.useHdrCapture')))
        const frame = this.capture.requestFrame(request, this.device?.limits?.maxTextureDimension2D ?? 8192)
        if (this.capture.isPending) this.needRender = true
        return frame
    }

    /**
     * Leave export mode and restore every real-time setting. Safe to call when
     * no session is active, so it can sit in a `finally` without a guard.
     */
    endVideoExportSession(): void {
        this.capture.cancel('Export session ended before capture completed')
        this.videoExportFrameEvaluationPending = false
        this.expmapCapturePipeline = undefined
        const session = this.session
        this.session = null
        if (!session) return

        if (session.layout.kind === 'expmap') {
            const numerics = session.layout.savedNumerics
            this.setApproximationMode(numerics.mode)
            this.setBlaEpsilon(numerics.epsilon)
            this.setMaxBlaSkip(numerics.skip)
            this.setPrecisionBudget(numerics.precision)
        }
        // Hand the interactive loop back exactly as it was found.
        if (session.parkedDrawFn) this.startRenderLoop(session.parkedDrawFn)

        this.zoomMagnificationThreshold = session.restore.zoomMagnificationThreshold
        this.dprMultiplier = session.restore.dprMultiplier
        this.targetFps = session.restore.targetFps
        this.aaAuto = session.restore.aaAuto
        this.animationTimeOverride = null
        // The surface was pinned to the film: follow the canvas again.
        this.resize()
        this.needRender = true
    }

    /**
     * A counter readback updated the unfinished count. When progressive
     * computation just finished, snapshot resolved → frozen so the unified
     * colour path has a valid frozen fallback for future clears.
     */
    private onCounterApplied(unfinished: number, previousUnfinished: number) {
        if (previousUnfinished > UNFINISHED_PIXEL_DONE_THRESHOLD
            && unfinished <= UNFINISHED_PIXEL_DONE_THRESHOLD
            && !this.requests.clearPending
            && !isZoomActive(this.zoomState)
            && !this.tiled) {
            this.requests.requestSnapshot('copy')
        }
    }

    private scheduleGpuTiming(
        submitStartMs: number,
        batchContext: IterationBatchTimingContext,
    ) {
        if (this.pendingGpuTiming) {
            return
        }

        this.pendingGpuTiming = true
        void this.device.queue.onSubmittedWorkDone()
            .then(() => {
                this.pendingGpuTiming = false
                this.onGpuFrameTiming(performance.now() - submitStartMs, batchContext)
            })
            .catch(() => {
                this.pendingGpuTiming = false
            })
    }

    /** Whole-frame GPU duration (timestamp span, or submit→done without timestamps). */
    private onGpuFrameTiming(elapsed: number, context: IterationBatchTimingContext) {
        if (this.completionTimerActive && elapsed > 0) {
            this.completionAccumulatedGpuMs += elapsed
        }
        this.budget.recordFrameTiming(elapsed, context)
    }

    /** Dispatch box padded by 8 texels each side and clamped to the neutral square. */
    private resolveScissorRect() {
        return padRect(this.dispatchBox, 8, this.workingSide)
    }

    /** Shared `rotationUnion` code for the brush and resolve uniforms:
     *  2 expmap, 1 tiled rotating keyframe (full disc), −1 live rotation
     *  margin (disc on the even lattice, see liveRotationMargin), 0 viewport. */
    private rotationUnionCode(): number {
        if (this.expmap) return 2
        if (this.tiled?.rotating) return 1
        return this.liveRotationMarginActive() ? -1 : 0
    }

    private liveRotationMarginActive(): boolean {
        return this.liveRotationMargin && !this.tiled && !this.exporting
    }

    private computeIterationDispatchBox(aspect: number, angle: number) {
        const fullDisc = !!this.tiled?.rotating || this.liveRotationMarginActive()
        return iterationDispatchBox(aspect, angle, this.neutralSize, fullDisc)
    }

    private currentTiledKeyframeTile(): KeyframeTile | null {
        return this.tiled ? currentTile(this.tiled) : null
    }

    private tileLocalDispatchBox(globalBox: { x: number; y: number; width: number; height: number }) {
        const tile = this.currentTiledKeyframeTile()
        return tile ? tileLocalRect(globalBox, tile) : globalBox
    }

    /** Layers reprojection must copy for a TERMINAL texel. Layers 13..16 are
     *  terminal values, not continuation state, so they have to be inside this
     *  count whenever they exist — an escaped texel never revisits them. */
    private rawCopyLayerCount(analyticRawPayloadNeeded: boolean): number {
        if (this.trapPayloadAllocated) {
            return this.orbitGradientAllocated
                ? RAW_ORBIT_GRADIENT_TRAP_LAYERS
                : RAW_TRAP_LAYERS
        }
        if (this.orbitGradientAllocated) return RAW_ORBIT_GRADIENT_LAYERS
        return analyticRawPayloadNeeded ? RAW_LAYERS : RAW_BASE_LAYERS
    }

    private iterationBatchRegimeKey(
        analyticRawPayloadNeeded: boolean,
        zoomRefreshHasSnapshot: boolean,
        dispatchPixelCount: number,
        visiblePixelCount: number,
    ): string {
        // Quarter-step buckets retain rotation/dispatch-area differences without
        // creating one model for every sub-pixel view change.
        const dispatchAreaBucket = Math.max(
            1,
            Math.round(4 * dispatchPixelCount / Math.max(1, visiblePixelCount)),
        )
        return [
            `d${this.floatExpActive ? 1 : 0}`,
            `a${this.lastShaderApproxFlag}`,
            `l${this.rawCopyLayerCount(analyticRawPayloadNeeded)}`,
            `s${zoomRefreshHasSnapshot ? 1 : 0}`,
            `x${dispatchAreaBucket}`,
        ].join(':')
    }

    resize() {
        const dpr = (window.devicePixelRatio || 1) * this.dprMultiplier
        // Lire la taille CSS du canvas (pas du parent) pour respecter les contraintes CSS
        const parent = this.canvas.parentElement
        const widthCSS = parent?.clientWidth || 1
        const heightCSS = parent?.clientHeight || 1
        const surface = resolveSurface({
            cssWidth: widthCSS,
            cssHeight: heightCSS,
            devicePixelRatio: dpr,
            maxTextureDimension: this.device?.limits?.maxTextureDimension2D ?? 8192,
            gpuMemoryBudgetBytes: this.gpuMemoryBudgetBytes,
            orbitMetrics: this.orbitMetricsEnabled,
            orbitTrap: this.orbitTrapEnabled,
            session: this.session && {
                surface: this.session.surface,
                tiledEstimateBytes: this.tiled?.plan.estimate.totalBytes,
            },
        })
        this.width = surface.width
        this.height = surface.height
        if (surface.reduced) {
            const reductionKey = `${widthCSS}x${heightCSS}:${this.width}x${this.height}:${this.gpuMemoryBudgetBytes}`
            if (reductionKey !== this.lastSurfaceReductionKey) {
                console.warn(
                    `[Engine] physical surface reduced to ${this.width}×${this.height} `
                    + `(scale ${surface.scale.toFixed(3)}, estimated ${formatGpuBytes(surface.estimatedBytes)} `
                    + `within ${formatGpuBytes(this.gpuMemoryBudgetBytes)} budget)`,
                )
                this.lastSurfaceReductionKey = reductionKey
            }
        } else {
            this.lastSurfaceReductionKey = ''
        }

        this.canvas.width = this.width
        this.canvas.height = this.height
        this.canvas.style.width = widthCSS + 'px'
        this.canvas.style.height = heightCSS + 'px'

        this.configureOutput()

        // taille suffisante pour contenir la diagonale de l'écran après rotation
        this.neutralSize = neutralSizeFor(this.width, this.height)
        // Fresh textures start at toroidal origin 0.
        this.rawOriginX = 0
        this.rawOriginY = 0
        const fullTextureSize = this.neutralSize
        const textureSize = this.tiled?.plan.tileSide ?? fullTextureSize
        this.rawTexture?.destroy?.()
        this.rawBrushTexture?.destroy?.()
        this.destroyDisplaySet(this.resolvedDisplay)
        this.destroyDisplaySet(this.frozenDisplay)
        this.destroyDisplaySet(this.mergeDisplay)
        this.destroyDisplaySet(this.tiledLiveDisplay)
        this.tiledLiveDisplay = undefined
        this.accumTexture?.destroy?.()
        this.aaTargetTexture?.destroy?.()
        this.rotationColorTexture?.destroy?.()

        // Helper: create an r32float texture array + per-layer 2d views + full 2d-array view
        const createLayeredTexture = (label: string, layerCount: number, extraUsage: GPUTextureUsageFlags = 0, side = textureSize): {
            texture: GPUTexture,
            arrayView: GPUTextureView,
            layerViews: GPUTextureView[],
        } => {
            const texture = this.device.createTexture({
                size: { width: side, height: side, depthOrArrayLayers: layerCount },
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

        if (!this.orbitGradientDummyView) {
            this.orbitGradientDummyView = this.device.createTexture({
                size: { width: 1, height: 1 },
                format: 'rgba16float',
                usage: GPUTextureUsage.TEXTURE_BINDING,
                label: 'Engine OrbitGradientDummy',
            }).createView({ label: 'Engine OrbitGradientDummy View' })
        }
        if (!this.trapPayloadDummyView) {
            this.trapPayloadDummyView = this.device.createTexture({
                size: { width: 1, height: 1 },
                format: 'rgba32float',
                usage: GPUTextureUsage.TEXTURE_BINDING,
                label: 'Engine TrapPayloadDummy',
            }).createView({ label: 'Engine TrapPayloadDummy View' })
        }
        if (!this.trapPayloadDummyStorageView) {
            this.trapPayloadDummyStorageView = this.device.createTexture({
                size: { width: 1, height: 1 },
                format: 'rgba32float',
                usage: GPUTextureUsage.STORAGE_BINDING,
                label: 'Engine TrapPayloadStorageDummy',
            }).createView({ label: 'Engine TrapPayloadStorageDummy View' })
        }

        // STORAGE_BINDING: the in-place compute path writes A as a read_write
        // storage texture (r32float is the only format allowing this).
        // Latched here rather than read per frame: every raw view, display
        // attachment and pipeline choice below depends on it, so it may only
        // change through a full re-creation (update() calls resize() on flip).
        this.orbitGradientAllocated = this.orbitMetricsEnabled
        this.trapPayloadAllocated = this.orbitTrapEnabled
        const rawLayers = this.trapPayloadAllocated
            ? (this.orbitGradientAllocated ? RAW_ORBIT_GRADIENT_TRAP_LAYERS : RAW_TRAP_LAYERS)
            : (this.orbitGradientAllocated ? RAW_ORBIT_GRADIENT_LAYERS : RAW_LAYERS)
        const rawResult = createLayeredTexture('Engine RawTexture (A)', rawLayers, GPUTextureUsage.STORAGE_BINDING)
        this.rawTexture = rawResult.texture
        this.rawArrayView = rawResult.arrayView
        // Phase D reseed views: layer 0 storage (stamp target) + layers 8..12
        // sampled (analytic z″ payload) — disjoint subresources, usable in one dispatch.
        this.rawIterStorageView = rawResult.layerViews[0]
        this.rawPayloadView = this.rawTexture.createView({
            dimension: '2d-array',
            baseArrayLayer: 8,
            arrayLayerCount: 5,
            label: 'Engine RawTexture (A) PayloadView',
        })

        // STORAGE_BINDING: the utility compute pass (reproject_cs) writes B
        // as a write-only storage texture array.
        const brushResult = createLayeredTexture('Engine RawBrushTexture (B)', rawLayers, GPUTextureUsage.STORAGE_BINDING)
        this.rawBrushTexture = brushResult.texture
        this.rawBrushArrayView = brushResult.arrayView
        // B carries the same derived views as A: the reprojection swaps the two
        // instead of copying B back over A, so either one has to be able to take
        // the front role on the next frame.
        this.rawBrushIterStorageView = brushResult.layerViews[0]
        this.rawBrushPayloadView = this.rawBrushTexture.createView({
            dimension: '2d-array',
            baseArrayLayer: 8,
            arrayLayerCount: 5,
            label: 'Engine RawBrushTexture (B) PayloadView',
        })

        const createDisplaySet = (label: string, side = textureSize): DisplaySet => {
            const values = createLayeredTexture(label + ' Values', DISPLAY_VALUE_LAYERS, 0, side)
            const geometryTexture = this.device.createTexture({
                size: { width: side, height: side },
                format: 'rgba16float',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
                    | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
                label: label + ' Geometry',
            })
            const metadataTexture = this.device.createTexture({
                size: { width: side, height: side },
                format: 'r32uint',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
                    | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
                label: label + ' Metadata',
            })
            const orbitGradientTexture = this.orbitGradientAllocated
                ? this.device.createTexture({
                    size: { width: side, height: side },
                    format: 'rgba16float',
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
                        | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
                    label: label + ' OrbitGradient',
                })
                : undefined
            const trapPayloadTexture = this.trapPayloadAllocated
                ? this.device.createTexture({
                    size: { width: side, height: side },
                    format: 'rgba32float',
                    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
                        | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
                    label: label + ' TrapPayload',
                })
                : undefined
            return {
                valuesTexture: values.texture,
                valuesArrayView: values.arrayView,
                valueLayerViews: values.layerViews,
                geometryTexture,
                geometryView: geometryTexture.createView({ label: label + ' GeometryView' }),
                metadataTexture,
                metadataView: metadataTexture.createView({ label: label + ' MetadataView' }),
                orbitGradientTexture,
                orbitGradientView: orbitGradientTexture?.createView({ label: label + ' OrbitGradientView' }),
                trapPayloadTexture,
                trapPayloadView: trapPayloadTexture?.createView({ label: label + ' TrapPayloadView' }),
            }
        }

        this.resolvedDisplay = createDisplaySet('Engine ResolvedDisplay')
        this.frozenDisplay = createDisplaySet(
            this.tiled ? 'Engine TiledFrozenKeyframe' : 'Engine FrozenDisplay',
            this.tiled ? fullTextureSize : textureSize,
        )
        this.tiledLiveDisplay = this.tiled
            ? createDisplaySet('Engine TiledLiveKeyframe', fullTextureSize)
            : undefined
        // Tiled keyframes exchange full display roles and never encode this merge.
        this.mergeDisplay = this.tiled ? undefined : createDisplaySet('Engine MergeDisplay')
        this.resolvedDisplayVersion = -1
        this.frozenDisplayVersion = -1

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
        // Final-color cache follows the neutral square, not the screen. It is
        // rebuilt once after a stable oblique view and sampled only by the
        // mutually-exclusive non-AA rotation presenter.
        this.rotationColorTexture = this.device.createTexture({
            size: { width: fullTextureSize, height: fullTextureSize, depthOrArrayLayers: 1 },
            format: 'rgba16float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'Engine RotationColorTexture',
        })
        this.rotationColorTextureView = this.rotationColorTexture.createView({
            label: 'Engine RotationColorTexture View',
        })
        if (this.pipelineRotationPresent && this.rotationPresentUniformBuffer && this.rotationColorSampler) {
            this.bindGroupRotationPresent = this.device.createBindGroup({
                layout: this.pipelineRotationPresent.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.rotationPresentUniformBuffer } },
                    { binding: 1, resource: this.rotationColorTextureView },
                    { binding: 2, resource: this.rotationColorSampler },
                ],
                label: 'Engine BindGroup RotationPresent',
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
        this.rebuildRawTextureBindGroups()

        // Resetting textures invalidates any in-flight AA accumulation.
        this.resetAaState()
        this.invalidateRotationColorResolve()

        // Reset zoom reprojection state on resize
        this.zoomState = resetZoomState()

        this.prevFrameMandelbrot = undefined // plus de frame précédente après resize
        this.previousMandelbrot = undefined  // force update() to re-write all uniforms
        this.previousRenderOptions = undefined
        this.needRender = true
        this.invalidateCounterReadback() // reset: not yet known after resize
    }

    private destroyDisplaySet(display?: DisplaySet) {
        display?.valuesTexture.destroy?.()
        display?.geometryTexture.destroy?.()
        display?.metadataTexture.destroy?.()
        display?.orbitGradientTexture?.destroy?.()
        display?.trapPayloadTexture?.destroy?.()
    }

    /** Every bind group that names A or B. The reprojection swaps the two, so
     *  these are rebuilt on each swap as well as on resize. */
    private rebuildRawTextureBindGroups() {
        if (this.pipelineAaTarget && this.resolvedDisplay && this.uniformBufferAaTarget && this.accumTextureView) {
            this.bindGroupAaTarget = this.device.createBindGroup({
                layout: this.pipelineAaTarget.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.resolvedDisplay.valuesArrayView },
                    { binding: 1, resource: this.resolvedDisplay.geometryView },
                    { binding: 2, resource: this.aaTargetTextureView },
                    { binding: 3, resource: { buffer: this.uniformBufferAaTarget } },
                    { binding: 4, resource: this.accumTextureView },
                ],
                label: 'Engine BindGroup AaTarget',
            })
        }
        if (this.pipelineAaReseed && this.rawIterStorageView && this.rawPayloadView
            && this.resolvedDisplay && this.uniformBufferAaTarget && this.aaFrontierBuffer) {
            this.bindGroupAaReseed = this.device.createBindGroup({
                layout: this.pipelineAaReseed.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.aaTargetTextureView },
                    { binding: 1, resource: this.rawIterStorageView },
                    { binding: 2, resource: { buffer: this.uniformBufferAaTarget } },
                    { binding: 3, resource: this.rawPayloadView },
                    { binding: 4, resource: { buffer: this.aaFrontierBuffer } },
                    { binding: 5, resource: this.resolvedDisplay.valuesArrayView },
                ],
                label: 'Engine BindGroup AaReseed',
            })
        }
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
        if (this.pipelinePanClear) {
            this.bindGroupPanClear = this.device.createBindGroup({
                layout: this.pipelinePanClear.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferBrush! } },
                    { binding: 1, resource: this.rawArrayView! },
                ],
                label: 'Engine BindGroup PanClear',
            })
        }

        if (this.pipelineResolve) {
            const layout = this.pipelineResolve.getBindGroupLayout(0)
            this.bindGroupResolve = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferResolve! } },
                    { binding: 1, resource: this.rawArrayView! },
                    { binding: 2, resource: this.resolvedDisplay?.trapPayloadView ?? this.trapPayloadDummyStorageView! },
                ],
                label: 'Engine BindGroup Resolve',
            })
        }

        this.rebuildColorBindGroup()

        this.rebuildMergeBindGroup()
    }

    private rebuildMergeBindGroup() {
        const live = this.resolvedDisplay
        const frozen = this.frozenDisplay
        const destination = this.mergeDisplay
        this.bindGroupMerge = undefined
        if (!this.pipelineMerge || !this.uniformBufferMerge || !live || !frozen || !destination) return
        this.bindGroupMerge = this.device.createBindGroup({
            layout: this.pipelineMerge.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.uniformBufferMerge } },
                { binding: 1, resource: live.valuesArrayView },
                { binding: 2, resource: live.geometryView },
                { binding: 3, resource: live.metadataView },
                { binding: 4, resource: frozen.valuesArrayView },
                { binding: 5, resource: frozen.geometryView },
                { binding: 6, resource: frozen.metadataView },
                { binding: 7, resource: live.orbitGradientView ?? this.orbitGradientDummyView! },
                { binding: 8, resource: frozen.orbitGradientView ?? this.orbitGradientDummyView! },
                { binding: 9, resource: live.trapPayloadView ?? this.trapPayloadDummyView! },
                { binding: 10, resource: frozen.trapPayloadView ?? this.trapPayloadDummyView! },
                { binding: 11, resource: destination.trapPayloadView ?? this.trapPayloadDummyStorageView! },
            ],
            label: 'Engine BindGroup Merge',
        })
    }

    /** Publish every field together; encoded commands retain the old bindings. */
    private swapMergedDisplay() {
        const previousFrozen = this.frozenDisplay
        this.frozenDisplay = this.mergeDisplay
        this.mergeDisplay = previousFrozen
        this.rebuildMergeBindGroup()
        this.rebuildColorBindGroup()
    }

    /** Ping-pong the neutral state textures. The reprojection pass reads A and
     *  writes B; swapping the two roles here is what replaces the former
     *  full-size copyTextureToTexture(B -> A) — half the traffic of a pan frame,
     *  on 13 r32float layers over the whole neutral square. */
    private swapRawTextures() {
        const texture = this.rawTexture
        this.rawTexture = this.rawBrushTexture
        this.rawBrushTexture = texture
        const arrayView = this.rawArrayView
        this.rawArrayView = this.rawBrushArrayView
        this.rawBrushArrayView = arrayView
        const iterView = this.rawIterStorageView
        this.rawIterStorageView = this.rawBrushIterStorageView
        this.rawBrushIterStorageView = iterView
        const payloadView = this.rawPayloadView
        this.rawPayloadView = this.rawBrushPayloadView
        this.rawBrushPayloadView = payloadView
        this.rebuildRawTextureBindGroups()
    }

    areObjectsEqual(obj1: any, obj2: any): boolean {
        if (obj1 === undefined || obj2 === undefined) {
            return false
        }
        return JSON.stringify(obj1) === JSON.stringify(obj2)
    }

    private isTranslationOnlyChange(next: Mandelbrot, previous?: Mandelbrot): boolean {
        if (!previous) return false
        const positionChanged = next.cx !== previous.cx
            || next.cy !== previous.cy
            || next.dx !== previous.dx
            || next.dy !== previous.dy
            || next.dxStr !== previous.dxStr
            || next.dyStr !== previous.dyStr
        return positionChanged
            && next.scale === previous.scale
            && next.scaleStr === previous.scaleStr
            && next.angle === previous.angle
            && next.maxIterations === previous.maxIterations
            && next.mu === previous.mu
            && next.epsilon === previous.epsilon
    }

    /** A continuous zoom changes the display scale (and its derived iteration
     * ceiling) while the raw live field stays at zoomState.liveScale until the
     * next clear/swap boundary. Counter samples from those frames therefore
     * remain valid and must be allowed to reach the batch-rate estimator. */
    private isZoomReprojectionOnlyChange(next: Mandelbrot, previous?: Mandelbrot): boolean {
        if (!previous) return false
        const scaleChanged = next.scale !== previous.scale
            || next.scaleStr !== previous.scaleStr
        const positionUnchanged = next.cx === previous.cx
            && next.cy === previous.cy
            && next.dx === previous.dx
            && next.dy === previous.dy
            && next.dxStr === previous.dxStr
            && next.dyStr === previous.dyStr
        return scaleChanged
            && positionUnchanged
            && next.angle === previous.angle
            && next.mu === previous.mu
            && next.epsilon === previous.epsilon
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

    setApproximationMode(requested: string) {
        const mode = kernelApproximationMode(requested)
        if (mode !== requested) {
            console.info(`[Engine] approximation mode '${requested}' is no longer available; using '${mode}'`)
        }
        if (mode === this.approximationMode) {
            return
        }

        if (mode === 'pade') {
            this.mandelbrotNavigator.use_pade()
        } else if (mode === 'bla') {
            this.mandelbrotNavigator.use_bla()
        } else {
            this.mandelbrotNavigator.use_perturbation()
        }

        this.approximationMode = mode
        this.rebuildIterationBindGroups()
        this.reference.setApproximationMode(mode)
        this.needRender = true
        this.invalidateCounterReadback()
    }

    getApproximationMode(): ApproximationMode {
        return this.approximationMode
    }

    setBlaEpsilon(epsilon: number) {
        const next = Math.fround(Math.max(1.1754943508222875e-38, epsilon))
        if (next === this.blaEpsilon) {
            return
        }
        this.mandelbrotNavigator.set_bla_epsilon(next)
        // Rust stores ε as f32. Mirror the rounded value immediately so the
        // per-frame front-navigator audit does not manufacture a second table
        // generation from 0.001 !== f32(0.001) while a build is in flight.
        this.blaEpsilon = this.mandelbrotNavigator.get_bla_epsilon()
        this.reference.setBlaEpsilon(this.blaEpsilon, this.approximationMode !== 'perturbation')
        if (this.approximationMode !== 'perturbation') {
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
     * reference recompute — an assumed design choice. restartAtNextView() makes the
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
        this.reference.restartAtNextView()
        this.needRender = true
    }

    // Find the minibrot under the current view (deep period detection + Newton
    // nucleus refinement, both arbitrary-precision). Resolves with the exact
    // nucleus coordinates so the caller can recentre the view on it.
    // `radiusFactor` scales the view radius used by the ball test (~2–4 covers a
    // centred minibrot; larger snaps to a bigger parent atom).
    //
    // With `fill` set, the search also runs the size estimate and returns a
    // *framing* instead of a bare nucleus: `cx`/`cy` is the copy's centre and
    // `scale` the view half-height that makes the copy span `fill` of the
    // limiting screen axis (0.5 = half the screen).
    //
    // The search is one synchronous wasm call that can run for minutes at
    // depth, so it gets its own disposable worker: cancelMinibrot() terminates
    // it, and the reference worker keeps extending the orbit meanwhile.
    findMinibrot(radiusFactor = 4, fill?: number): Promise<MinibrotResult> {
        // Supersede any in-flight search so its caller does not hang.
        this.cancelMinibrot()
        const view = this.minibrotView
        if (!view) return Promise.reject(new Error('[Engine] no view sent to the reference worker yet'))
        const request: MinibrotSearchRequest = {
            ...view,
            precisionBudget: this.precisionBudget,
            viewportAspect: this.width / Math.max(1, this.height),
            maxIter: this.currentMaxIterations,
            radiusFactor,
            fill,
        }
        return new Promise<MinibrotResult>((resolve, reject) => {
            const worker = new Worker(new URL('./minibrotWorker.ts', import.meta.url), { type: 'module' })
            const search = { worker, resolve, reject }
            this.minibrotSearch = search
            const finish = () => {
                worker.terminate()
                if (this.minibrotSearch === search) this.minibrotSearch = null
            }
            worker.onmessage = (event: MessageEvent<MinibrotSearchResponse>) => {
                if (this.minibrotSearch !== search) return
                const message = event.data
                if (message.type === 'ready') {
                    worker.postMessage(request)
                } else if (message.type === 'minibrotFound') {
                    finish()
                    resolve({ status: message.status, cx: message.cx, cy: message.cy, period: message.period, scale: message.scale })
                } else {
                    finish()
                    reject(new Error(message.message))
                }
            }
            worker.onerror = (event) => {
                if (this.minibrotSearch !== search) return
                finish()
                reject(new Error(event.message))
            }
        })
    }

    /** Stop the in-flight minibrot search, if any; its caller gets status 'cancelled'. */
    cancelMinibrot(): boolean {
        const search = this.minibrotSearch
        if (!search) return false
        this.minibrotSearch = null
        search.worker.terminate()
        search.resolve({ status: 'cancelled', cx: null, cy: null, period: null, scale: null })
        return true
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
        this.reference.setMaxBlaSkip(pow2, this.approximationMode !== 'perturbation')
        if (this.approximationMode !== 'perturbation') {
            this.needRender = true
            this.invalidateCounterReadback()
        }
    }

    private shaderReplayContext?: Mandelbrot

    async prepareShaderExpmapColor(options: RenderOptions, time: number, angle: number, sourceMu?: number, stereo?: StereoColorPass) {
        if (!this.shaderReplayContext || this.expmap) throw new Error('Engine not ready for shader playback')
        const saved = this.animationTimeOverride
        this.animationTimeOverride = time
        const context = this.shaderReplayContext
        try { await this.update({ ...context, angle, mu: sourceMu ?? context.mu }, options) }
        finally { this.animationTimeOverride = saved; this.shaderReplayContext = context }
        const stereoRun = packColorUniformRun({ stereoEyeSlope: stereo?.eyeSlope ?? 0, stereoHeightPass: stereo?.height ? 1 + Math.max(0, stereo.relief ?? STEREO_RELIEF_DEFAULT) : 0 })
        this.device.queue.writeBuffer(this.uniformBufferColor!, stereoRun.byteOffset, stereoRun.data)
        if (!this.bindGroupColor || !this.pipelineColor) throw new Error('Color resources unavailable')
        return { code: this.shaderPassColor, layout: this.pipelineColor.getBindGroupLayout(0), bindGroup: this.bindGroupColor }
    }

    async update(mandelbrot: Mandelbrot, renderOptions: RenderOptions) {
        if (!this.expmap) this.shaderReplayContext = { ...mandelbrot }
        if (this.expmap) {
            renderOptions = this.expmap.appearance
            const recipe = this.expmap.appearance as RenderOptions & { mu?: number; epsilon?: number; maxIterationMultiplier?: number }
            const mu = recipe.mu ?? mandelbrot.mu
            const multiplier = recipe.maxIterationMultiplier
            mandelbrot = { ...mandelbrot, mu, epsilon: recipe.epsilon ?? mandelbrot.epsilon,
                maxIterations: multiplier === undefined ? mandelbrot.maxIterations : Math.min(
                    Math.max(100, 1000 * multiplier * -log2FromDecimalString(this.expmap!.projection.iterationScale))
                    + Math.max(0, Math.ceil(Math.log2(Math.log(Math.max(mu, 4)) / Math.log(4)))), 10_000_000) }
        }
        await this.preparePalettePath(renderOptions)
        if (this.palettePathGpu) {
            // "Décalage parcours" track: contribution in path spans → orders of
            // magnitude. Null when the track is off so the static read is untouched.
            const pathAnimation = normalizeAnimationConfig(renderOptions.animation, renderOptions.animationSpeed)
            const pathOffsetTrack = pathAnimation.tracks.palettePathOffset
            const pathWrapOffset = pathOffsetTrack.enabled
                ? animationContribution(pathOffsetTrack, renderOptions.activateAnimate ? this.time : 0, clamp(pathAnimation.globalSpeed, 0, 10)) * this.palettePathGpu.span
                : null
            const pathDepth = -(mandelbrot.scaleStr ? log10FromDecimalString(mandelbrot.scaleStr) : Math.log10(mandelbrot.scale))
            this.palettePathGpu.update(this.device, pathDepth,
                this.expmap?.projection, this.expmap ? -log10FromDecimalString(this.expmap.projection.scale) : undefined, pathWrapOffset)
            this.heightPathSignature = `${pathDepth}:${pathWrapOffset}`
        }
        this.selectColorPipelines(needsSurfaceColorPipeline(this.palettePathGpu?.stops ?? this.presetTransition?.stops ?? renderOptions.colorStops))
        this.rotationColorResolveChangedThisUpdate = false
        const orbitTrap = normalizeOrbitTrapConfig(renderOptions.orbitTrap, renderOptions.orbitTrapStrength)
        const previousOrbitTrap = this.previousRenderOptions
            ? normalizeOrbitTrapConfig(
                this.previousRenderOptions.orbitTrap,
                this.previousRenderOptions.orbitTrapStrength,
            )
            : undefined
        this.orbitTrapEnabled = orbitTrapUsesOrbit(orbitTrap)
        if (previousOrbitTrap
            && (this.orbitTrapEnabled || orbitTrapUsesOrbit(previousOrbitTrap))
            && orbitTrapAccumulatorSignature(orbitTrap)
                !== orbitTrapAccumulatorSignature(previousOrbitTrap)) {
            this.requests.requestClear('orbitTrap')
            this.needRender = true
        }
        // Calcul du temps écoulé depuis la dernière frame
        const now = performance.now()
        if (this.lastUpdateTime === 0) {
            this.lastUpdateTime = now
        }
        const delta = (now - this.lastUpdateTime) / 1000 // en secondes
        if (this.animationTimeOverride !== null) {
            this.time = this.animationTimeOverride
        } else {
            this.time += delta
        }
        // Kept current in both modes: clearing the override must not charge the
        // whole export duration to the first real-time frame that follows.
        this.lastUpdateTime = now

        // Time-to-completion tracking: wall-clock + accumulated GPU compute per
        // render session, for comparing perturbation / BLA. Wall includes
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

        // Orbit metrics decide the raw layer count and the sixth display
        // attachment, so a flip has to re-create the textures. Done here, before
        // any previous-state comparison: resize() clears the render anyway, which
        // is what the flip already forced through a history clear request.
        this.orbitMetricsEnabled = !!this.expmap?.projection.displaySet || shouldTrackOrbitMetrics(this.palettePathGpu?.stops ?? this.presetTransition?.stops ?? renderOptions.colorStops)
        if ((this.orbitMetricsEnabled !== this.orbitGradientAllocated
            || this.orbitTrapEnabled !== this.trapPayloadAllocated) && this.rawTexture) {
            this.resize()
        }

        this.debugShadingActive = renderOptions.debugShading

        if (this.reference.promoteIfReady()) {
            // This update() computed dx/dy before the re-anchor: do not render
            // mixed old uniforms with the new reference buffers.
            this.skipRenderOnce = true
            return
        }

        this.reference.checkTableClearDeadline(performance.now())

        const navigatorApproximationMode = readNavigatorApproximationMode(this.mandelbrotNavigator)
        const navigatorBlaEpsilon = this.mandelbrotNavigator.get_bla_epsilon()
        if (navigatorApproximationMode !== this.approximationMode || navigatorBlaEpsilon !== this.blaEpsilon) {
            this.approximationMode = navigatorApproximationMode
            this.blaEpsilon = navigatorBlaEpsilon
            this.reference.resyncTableParameters(navigatorApproximationMode, navigatorBlaEpsilon)
            // Invalidate the frozen fallback: it still holds the OLD mode's
            // completed image. A history clear wipes only the live texture,
            // so without this the color pass composites old-mode frozen pixels
            // (step=1) against the new mode's coarse in-progress pixels via
            // min-step-wins — a visible old/new "mix" that resolves slowly. A
            // mode switch keeps the same reference orbit and view, so the new
            // mode recomputes cleanly; a fresh frozen snapshot is recaptured on
            // completion. (Not gated on zoom: mid-zoom mode changes are rare and
            // the zoom path owns frozenAligned itself.)
            this.frozenAligned = false
            this.requests.cancelSnapshot()
            this.needRender = true
            this.invalidateCounterReadback()
        }

        const mandelbrotChanged = !this.areObjectsEqual(mandelbrot, this.previousMandelbrot)
        const translationOnlyChange = mandelbrotChanged
            && this.isTranslationOnlyChange(mandelbrot, this.previousMandelbrot)
        const zoomReprojectionOnlyChange = mandelbrotChanged
            && this.isZoomReprojectionOnlyChange(mandelbrot, this.previousMandelbrot)
        const renderOptionsChanged = !!this.presetTransition || !this.areObjectsEqual(renderOptions, this.previousRenderOptions)
        const stripeFrequencyChanged = renderOptions.stripeFrequency !== this.previousRenderOptions?.stripeFrequency
        const orbitMetricsEnabled = this.orbitMetricsEnabled
        const orbitMetricsChanged = this.previousOrbitMetricsEnabled !== undefined
            && orbitMetricsEnabled !== this.previousOrbitMetricsEnabled
        const activeStripeFrequencyChanged = stripeFrequencyChanged && orbitMetricsEnabled
        this.rotationColorResolveChangedThisUpdate = mandelbrotChanged || renderOptionsChanged
        this.needRender = this.needRender || mandelbrotChanged || renderOptionsChanged
        // Any navigation/parameter change resets AA → instant single-sample fallback,
        // and re-arms auto AA. Not guarded by aaActive: after accumulation completes
        // (aaActive false, aaAccumulatedSamples > 0) a move must still clear the count
        // so auto AA can fire again on the next convergence.
        if (mandelbrotChanged || renderOptionsChanged) {
            this.resetAaState()
            this.invalidateRotationColorResolve()
        }
        // Suppressed for the whole export session, not once at its start: this
        // line runs on every update() and would otherwise restore the UI's value
        // on the next frame. Auto AA cannot fire during an export anyway (the
        // zoom cycle stays active), and DPR supersampling replaces it for a
        // fraction of the cost — but leaving it armed would let it trigger the
        // instant the session ends, on a view the user never asked it for.
        this.aaAuto = this.exporting ? false : (renderOptions.aaAuto ?? false)
        // Continuous zoom is display-only between raw-field clear/swap
        // boundaries. Invalidating here every tick discarded the preceding
        // counter before its asynchronous map completed, so timestamp+work
        // samples never paired and the zoom controller stayed near batch 1.
        // render() invalidates at the actual clear boundary instead.
        if ((mandelbrotChanged && !translationOnlyChange && !zoomReprojectionOnlyChange)
            || activeStripeFrequencyChanged
            || orbitMetricsChanged) {
            this.invalidateCounterReadback() // unknown — new fractal params, GPU counter not read yet
        }
        if (activeStripeFrequencyChanged || orbitMetricsChanged) {
            this.requests.requestClear('orbitMetrics')
        }
        this.previousOrbitMetricsEnabled = orbitMetricsEnabled

        // Check if any stop has webcam > 0 to decide whether to capture webcam frames
        const hasWebcam = (this.palettePathGpu?.stops ?? this.presetTransition?.stops ?? renderOptions.colorStops).some(s => (s.webcam ?? 0) > 0)
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

        // When the navigator re-anchors its reference orbit, `dx/dy` jump back to ~0.
        // Reprojecting history across that discontinuity would be nonsense, so we clear.
        const orbitWasReset = this.reference.consumeOrbitReset() && !!this.prevFrameMandelbrot

        const hardResetHistory = !this.prevFrameMandelbrot || orbitWasReset
        const muChanged = !!this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== mandelbrot.mu
        const preserveZoomFrozen = isZoomActive(this.zoomState) && hardResetHistory && !muChanged
        if (hardResetHistory || muChanged) {
            this.requests.requestClear('referenceReset')
            if (!preserveZoomFrozen) {
                this.zoomState = resetZoomState()
            }
            // A reference reset clears the live texture. At deep zoom, the first
            // recompute can be slow enough to expose a black frame unless we keep
            // the last resolved image as a temporary frozen fallback. The render
            // pass copies resolved -> frozen before executing the clear.
            // The reducer's `copyResolvedToFrozen` effect (idle reset, same mu)
            // requests the frozen refresh below; nothing to arm here.
            this.requests.cancelSnapshot()
        }
        this.videoExportFrameEvaluationPending = false

        // ── Zoom reprojection state update (before uniform write) ─────
        // The frame is classified into a zoom event (see classifyFrame), the
        // grids follow the camera, then the state machine's effects run.
        {
            const previousScale = this.prevFrameMandelbrot ? this.prevFrameMandelbrot.scale : null
            const scaleChanged = previousScale !== null && previousScale !== mandelbrot.scale
            const event = classifyFrame({
                previousScale,
                scale: mandelbrot.scale,
                orbitWasReset,
                muChanged,
                repeatPump: this.exporting,
            })

            // Capture zoom state values BEFORE state transition (needed for merge uniforms)
            const wasZoomActive = isZoomActive(this.zoomState)
            const prevFrozenScale = getFrozenScale(this.zoomState)
            const prevLiveScale = getLiveScale(this.zoomState)

            // Camera motion since the last rendered frame, in texels of the
            // previous live and frozen grids. Measured on every frame, clear
            // frames included, and across a reference re-anchor.
            const oldLiveScale = wasZoomActive && prevLiveScale > 0
                ? prevLiveScale
                : (this.prevFrameMandelbrot?.scale ?? mandelbrot.scale)
            this.grids.advanceCamera({
                delta: this.prevFrameMandelbrot && !this.expmap
                    ? { x: mandelbrot.dx - this.prevFrameMandelbrot.dx, y: mandelbrot.dy - this.prevFrameMandelbrot.dy }
                    : null,
                orbitWasReset,
                aspect,
                neutralSize: this.neutralSize,
                liveScale: oldLiveScale,
                frozenScale: wasZoomActive && prevFrozenScale > 0 ? prevFrozenScale : oldLiveScale,
            })

            const {state, effects} = event
                ? reduceZoomState(this.zoomState, event, { threshold: this.zoomMagnificationThreshold })
                : { state: this.zoomState, effects: [] as ZoomEffect[] }
            this.zoomState = state

            if (smallZoomStopNeedsClear({
                wasZoomActive,
                previousFrameScaleChanged: this.prevFrameScaleChanged,
                scaleChanged,
                repeatPump: this.exporting,
            })) {
                this.requests.requestClear('smallZoomStop')
            }
            this.prevFrameScaleChanged = scaleChanged

            for (const effect of effects) {
                switch (effect.type) {
                    case 'copyResolvedToFrozen':
                        // Mid-zoom swap, or cycle start / idle reset (frozen and
                        // live share the previous frame's display space).
                        this.requestFrozenRefresh(wasZoomActive && prevFrozenScale > 0 && prevLiveScale > 0
                            ? this.grids.swapRefreshMapping({
                                frozenScale: prevFrozenScale,
                                liveScale: prevLiveScale,
                                aspect,
                                angle: mandelbrot.angle,
                                neutralSize: this.neutralSize,
                            })
                            : undefined)
                        break
                    case 'mergeResolvedAndFrozen':
                        if (!this.tiled) this.requests.requestSnapshot('merge')
                        if (wasZoomActive && prevFrozenScale > 0) {
                            this.mergeUniforms = this.grids.stopMerge({
                                frozenScale: prevFrozenScale,
                                liveScale: prevLiveScale,
                                scale: mandelbrot.scale,
                                aspect,
                                angle: mandelbrot.angle,
                                neutralSize: this.neutralSize,
                            })
                        }
                        break
                    case 'clearHistory':
                        this.requests.requestClear('zoomCycle')
                        break
                }
            }

            // An export keeps the cycle alive across the whole parcours, and the
            // live grid only fills the centre mid-cycle: once a pan carries the
            // viewport out of the frozen texture, the uncovered band would be
            // emitted black. Drop the cycle; this frame is computed whole at
            // its own scale and the next scale step starts a fresh cycle.
            if (this.exporting && !this.tiled && isZoomActive(this.zoomState) && getZoomingIn(this.zoomState)
                && !frozenCoversViewport({
                    offset: this.grids.frozenOffset,
                    zf: getFrozenScale(this.zoomState) / mandelbrot.scale,
                    aspect,
                    angle: mandelbrot.angle,
                    neutralSize: this.neutralSize,
                    fullGrid: this.liveRotationMargin,
                })) {
                this.zoomState = resetZoomState()
                this.requests.cancelSnapshot()
                this.requests.requestClear('zoomCycle')
                this.frozenAligned = false
            }

            // Rotation margin (see liveRotationMargin). A cycle start or swap
            // hands the live texture to the frozen role and restarts the live
            // one: the margin re-arms only if the angle keeps changing. In idle
            // it persists, so a zoom started after a rotation freezes a margin.
            if (event?.type === 'scaleChanged'
                && effects.some(effect => effect.type === 'copyResolvedToFrozen')) {
                this.liveRotationMargin = false
            }
            if (this.prevFrameMandelbrot && this.prevFrameMandelbrot.angle !== mandelbrot.angle) {
                this.liveRotationMargin = true
            }
        }

        // Si la palette a changé (stops ou mode d'interpolation), on la recalcule
        if (!this.palettePathGpu && !this.presetTransition && (!this.areColorStopsEqual(renderOptions.colorStops, this.previousRenderOptions?.colorStops || [])
            || renderOptions.interpolationMode !== this.previousRenderOptions?.interpolationMode)) {
            const palette = new Palette(renderOptions.colorStops, renderOptions.interpolationMode)
            const paletteTex = palette.generateTexture()
            const paletteF16 = float32ArrayToFloat16(paletteTex.data)
            this.device.queue.writeTexture(
                { texture: this.paletteTexture! },
                paletteF16.buffer as ArrayBuffer,
                { bytesPerRow: paletteTex.width * 8 },  // 4 channels × 2 bytes (float16)
                [paletteTex.width, paletteTex.height]
            )
            this.heightInputsVersion++
            this.needRender = true
        }

        if (this.expmap) {
            this.zoomState = resetZoomState()
            this.requests.cancelSnapshot()
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
        const protrusionPhaseAnim = animationContribution(animation.tracks.protrusionPhase, animTime, animGlobalSpeed)
        const reliefDepthAnim = animationContribution(animation.tracks.reliefDepth, animTime, animGlobalSpeed)
        const orbitTrapPhaseOffsetAnim = animationContribution(animation.tracks.orbitTrapPhaseOffset, animTime, animGlobalSpeed)
        const orbitTrapStrengthAnim = animationContribution(animation.tracks.orbitTrapStrength, animTime, animGlobalSpeed)
        const gradeSaturationAnim = animationContribution(animation.tracks.gradeSaturation, animTime, animGlobalSpeed)
        const gradeContrastAnim = animationContribution(animation.tracks.gradeContrast, animTime, animGlobalSpeed)
        const effectiveLightAngle = renderOptions.lightAngle + lightAngleAnim
        const effectiveTessellationLevel = clamp(renderOptions.tessellationLevel + tessellationAnim, 0, 10)
        const effectiveDisplacementAmount = clamp(renderOptions.displacementAmount + displacementAnim, 0, 0.1)
        const effectiveMicroBumpStrength = clamp(renderOptions.microBumpStrength + microBumpAnim, 0, 10)
        const effectiveVarnishStrength = clamp(renderOptions.varnishStrength + varnishAnim, 0, 100)
        const effectiveHeightPaletteShift = clamp(renderOptions.heightPaletteShift + heightPaletteShiftAnim, 0, 100)
        const effectivePhaseColoringStrength = clamp(renderOptions.phaseColoringStrength + phaseColoringAnim, 0, 100)
        const effectiveProtrusionPhase = wrapUnit((renderOptions.protrusionPhase ?? 0) + protrusionPhaseAnim)
        const effectiveReliefDepth = clamp(renderOptions.reliefDepth + reliefDepthAnim, 0, 2)
        const effectiveOrbitTrap = {
            ...orbitTrap,
            phaseOffset: wrapUnit(orbitTrap.phaseOffset + orbitTrapPhaseOffsetAnim),
            strength: clamp(orbitTrap.strength + orbitTrapStrengthAnim, 0, 100),
        }
        const effectiveGradeSaturation = clamp((renderOptions.gradeSaturation ?? 1.12) + gradeSaturationAnim, 0, 2)
        const effectiveGradeContrast = clamp((renderOptions.gradeContrast ?? 1.18) + gradeContrastAnim, 0.5, 2)
        const lightDirLen = Math.hypot(Math.cos(effectiveLightAngle), Math.sin(effectiveLightAngle), 1.85)
        const textureMapping = normalizeTextureMappingConfig(renderOptions.textureMapping)
        const zoomActive = isZoomActive(this.zoomState)
        const {frozen: zoomFactor, live: liveZoomFactor} = displayZoomFactors(this.zoomState, mandelbrot.scale)
        const [frozenShiftU, frozenShiftV] = toUv(this.grids.frozenOffset, this.neutralSize)
        const [liveShiftU, liveShiftV] = toUv(this.grids.liveResidual, this.neutralSize)
        const antialiasLevelColor = this.effectiveAntialiasLevel(renderOptions.antialiasLevel)

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

        const colorUniforms: ColorUniforms = {
            palettePeriod: renderOptions.palettePeriod,
            paletteOffset: renderOptions.paletteOffset + paletteOffsetAnim,
            skyboxTransitionLevels: this.presetTransition?.skyLayers
                ? this.skyboxTexture!.mipLevelCount * 32 + this.presetTransition.sky.mipLevelCount
                : 0,
            time: this.time,
            aspect,
            angle: mandelbrot.angle,
            animate: renderOptions.activateAnimate ? 1 : 0,
            mu: mandelbrot.mu,
            zoomFactor,
            frozenAligned: (zoomActive || this.frozenAligned || this.requests.snapshot === 'copy') ? 1 : 0,
            liveZoomFactor,
            // Exact displacement of the frozen grid from this frame's camera
            // (see ViewGrids): follows the camera, not the rounded shifts of
            // the live texture.
            frozenShiftU,
            frozenShiftV,
            tessellationLevel: effectiveTessellationLevel,
            displacementAmount: effectiveDisplacementAmount,
            animationSpeed: animGlobalSpeed,
            epsilon: mandelbrot.epsilon,
            ambientOcclusionStrength: renderOptions.ambientOcclusionStrength,
            microBumpStrength: effectiveMicroBumpStrength,
            aaLookupOffsetX: renderOptions.aaAdaptive === false ? this.aaOffsetX : 0,
            reliefDepth: effectiveReliefDepth,
            lightAngle: effectiveLightAngle,
            localShadowStrength: renderOptions.localShadowStrength,
            varnishStrength: effectiveVarnishStrength,
            logMu: Math.log(mandelbrot.mu),
            sceneSin,
            sceneCos,
            lightDirX: Math.cos(effectiveLightAngle) / lightDirLen,
            lightDirY: Math.sin(effectiveLightAngle) / lightDirLen,
            lightDirZ: 1.85 / lightDirLen,
            paletteMirror: renderOptions.paletteMirror ? 1 : 0,
            // 1 = debug wheel; dev console only: 2 = relief integrability residual, 3 = stereo depth
            debugShading: Number(renderOptions.debugShading ?? 0),
            heightPaletteShift: effectiveHeightPaletteShift,
            orbitTrapStrength: effectiveOrbitTrap.strength,
            phaseColoringStrength: effectivePhaseColoringStrength,
            textureMappingXVariable: textureMappingVariableId(textureMapping.xVariable),
            textureMappingYVariable: textureMappingVariableId(textureMapping.yVariable),
            textureMappingXScale: textureMapping.xScale,
            textureMappingYScale: textureMapping.yScale,
            textureMappingMirror: textureMapping.mirrored ? 1 : 0,
            centerX: parseFloat(mandelbrot.cx),
            centerY: parseFloat(mandelbrot.cy),
            scale: mandelbrot.scale,
            gradeContrast: effectiveGradeContrast,
            textureDriftX: 0.03 * textureDriftAnimX,
            textureDriftY: 0.03 * textureDriftAnimY,
            skyDriftX: 0.02 * skyReflectionDriftAnimX,
            skyDriftY: 0.02 * skyReflectionDriftAnimY,
            paletteOffsetAnimation: paletteOffsetAnim,
            heightPaletteShiftAnimation: heightPaletteShiftAnim,
            lightAngleAnimation: lightAngleAnim,
            textureDriftAnimation: textureDriftAnimX,
            skyReflectionDriftAnimation: skyReflectionDriftAnimX,
            phaseColoringAnimation: phaseColoringAnim,
            varnishAnimation: varnishAnim,
            microBumpAnimation: microBumpAnim,
            displacementAnimation: displacementAnim,
            tessellationAnimation: tessellationAnim,
            aaSampleIndex: this.aaSampleIndex,
            antialiasLevel: antialiasLevelColor,
            aaJitterHatX: aaJitterMag > 0 ? this.aaOffsetX / aaJitterMag : 0,
            aaJitterHatY: aaJitterMag > 0 ? this.aaOffsetY / aaJitterMag : 0,
            aaJitterLogMag: Number.isFinite(aaJitterLogMag) ? aaJitterLogMag : 0,
            aaAnalytic: 0, // finalized in render() once skipResolve is known
            gradeSaturation: effectiveGradeSaturation,
            liveShiftU, // patched in render()
            lnScale: Number.isFinite(lnScale) ? lnScale : 0,
            liveShiftV,
            protrusionPhase: effectiveProtrusionPhase,
            protrusionSharpness: renderOptions.protrusionSharpness ?? 2,
            protrusionGeometryMix: renderOptions.protrusionGeometryMix ?? 0,
            protrusionPeriod: renderOptions.protrusionPeriod ?? 1,
            protrusionTerrace: renderOptions.protrusionTerrace ?? 0,
            ...orbitTrapUniforms(effectiveOrbitTrap),
            protrusionStrength: renderOptions.protrusionStrength ?? 1,
            iterationPaletteCurve: iterationPaletteCurveCode(renderOptions.iterationPaletteCurve),
            aaLookupOffsetY: renderOptions.aaAdaptive === false ? this.aaOffsetY : 0,
            rawOriginX: this.rawOriginX,
            rawOriginY: this.rawOriginY,
            orbitMetricsEnabled: this.orbitGradientAllocated ? 1 : 0,
            presetTransition: this.presetTransition?.progress ?? 0,
            paletteScreenShiftX: renderOptions.paletteScreenShiftX ?? 0,
            paletteScreenShiftY: renderOptions.paletteScreenShiftY ?? 0,
            // Stereo replay overrides; interactive and classic exports stay mono.
            stereoEyeSlope: 0,
            stereoHeightPass: 0,
            castShadowStrength: this.castShadowSupported ? Math.max(0, Math.min(1, renderOptions.castShadowStrength ?? 0)) : 0,
            castShadowLength: Math.max(1, Math.min(20, renderOptions.castShadowLength ?? 4)),
            castShadowSoftness: Math.max(0.02, Math.min(1, renderOptions.castShadowSoftness ?? 0.35)),
            horizonOcclusionStrength: this.castShadowSupported ? Math.max(0, Math.min(1, renderOptions.horizonOcclusionStrength ?? 0)) : 0,
            horizonOcclusionRadius: Math.max(0.01, Math.min(0.5, renderOptions.horizonOcclusionRadius ?? 0.1)),
            indirectLightStrength: this.castShadowSupported ? Math.max(0, Math.min(2, renderOptions.indirectLightStrength ?? 0)) : 0,
        }
        this.reliefClosing = Math.max(0, Math.min(0.05, renderOptions.reliefClosing ?? 0))
        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, packColorUniforms(colorUniforms))
        this.heightUniformSignature = heightUniformSignature(colorUniforms)

        if (!this.needsMoreFrames()) {
            return
        }

        const maxIterations = Math.ceil(mandelbrot.maxIterations)
        this.currentMaxIterations = maxIterations
        const computeScale = liveGridScale(this.zoomState, mandelbrot.scale)

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
        // A device whose driver refused the floatexp kernel must also stop
        // *packing* uniforms for it: the shallow kernel reads dc as plain
        // values, so feeding it mantissas would render noise instead of a
        // merely imprecise image.
        const wantsDeep = expScale <= DEEP_EXP_THRESHOLD
        const deep = wantsDeep && !this.inplaceDeepUnavailable
        // Tell the user once, when a view first reaches the depth the missing
        // kernel was there to serve — not at load, where the shallow path is
        // exact and the message would be noise.
        if (wantsDeep && !deep && !this.deepUnavailableReported) {
            this.deepUnavailableReported = true
            this.reportGpuError(t('engine.webgpu.deepKernelUnavailable'))
        }
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
        this.minibrotView = { cx: mandelbrot.cx, cy: mandelbrot.cy, scale: workerScaleString, angle: mandelbrot.angle }
        this.reference.syncView({
            cx: mandelbrot.cx,
            cy: mandelbrot.cy,
            scale: workerScaleString,
            angle: mandelbrot.angle,
            maxIterations,
            viewportAspect: this.width / Math.max(1, this.height),
        }, {
            approximationMode: this.approximationMode,
            blaEpsilon: this.blaEpsilon,
            maxBlaSkip: this.maxBlaSkip,
            precisionBudget: this.precisionBudget,
        })

        // Guard the shader: globalMaxIter must never exceed the orbit steps
        // we have actually computed, or the shader would read uninitialised memory.
        const {availableIter, guardedMaxIter} = this.reference.refreshProgress(maxIterations)
        const orbitComplete = availableIter >= maxIterations
        // BLA runs in the deep (floatexp) path too: a/b/radii are stored in fe
        // form and try_apply_bla_deep does its radius test in log space. The
        // uniform flag carries 1 = affine BLA, 0 = exact perturbation.
        const tableCoversView = this.reference.blaReadyMaxIterations >= guardedMaxIter
        const blocksReady = this.approximationMode !== 'perturbation'
            && orbitComplete
            && this.currentBlaLevelCount > 0
            && tableCoversView
        const tableApproximationModeFlag = blocksReady ? APPROXIMATION_MODE_FLAG[this.approximationMode] : 0
        // Exact orbit-trap evaluation deliberately unfolds every uncertified
        // block. Reflect that choice in the CPU-side diagnostic as well as in
        // the shader guard so performance traces never label it "Auto/BLA".
        const approximationModeFlag = orbitTrap.mode === 'exact'
            ? 0
            : tableApproximationModeFlag
        const blaLevelCount = orbitTrap.mode === 'exact'
            ? 0
            : (blocksReady ? this.currentBlaLevelCount : 0)
        // Diagnostic mirror of exactly what the shader receives this frame: the mode
        // flag (0=exact, 1=BLA) and the block-level count.
        this.lastShaderApproxFlag = approximationModeFlag
        this.lastShaderBlaLevelCount = blaLevelCount
        this.lastOrbitTrapMode = orbitTrap.mode

        // Re-write the mandelbrot uniform with the guarded globalMaxIter.
        // During zoom reprojection, override scale with liveScale so the GPU
        // computes at the fixed target scale for this cycle.
        this.computeCenterUniform = {
            cx: deep ? cxMant : mandelbrot.dx,
            cy: deep ? cyMant : mandelbrot.dy,
            scale: deep ? scaleParts.mantissa : computeScale,
        }
        const mandelbrotShaderUniformDataGuarded = new Float32Array([
            deep ? cxMant : mandelbrot.dx,        // 0: cx — fe mantissa when deep, else plain (render() adds the live residual)
            deep ? cyMant : mandelbrot.dy,        // 1: cy — fe mantissa when deep, else plain
            mandelbrot.mu,
            deep ? scaleParts.mantissa : computeScale, // 3: scale — fe mantissa when deep, else plain
            aspect,
            mandelbrot.angle,
            this.budget.batchSize,
            mandelbrot.epsilon,
            renderOptions.antialiasLevel,
            0,  // iterationOffset slot (unused)
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
            orbitTrapModeId(orbitTrap.mode), // 20: orbit-trap evaluation policy
            orbitTrap.centerX,
            orbitTrap.centerY,
            orbitTrap.scale,
            orbitTrap.rotation,
            orbitTrap.anisotropyX,
            orbitTrap.anisotropyY,
            orbitTrap.petals,
            orbitTrap.petalDepth,
            orbitTrap.twist,
            orbitTrap.phase,
            orbitTrap.startIteration,
            orbitTrap.endIteration,
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
        // Suppressed during AA: the present pass already shows a stable average,
        // and a freeze + clearHistory here would clobber selective-reseed state.
        if (!isZoomActive(this.zoomState)
            && !this.requests.clearPending
            && !this.aaActive
            && orbitComplete && this.prevGuardedMaxIter < maxIterations && this.prevGuardedMaxIter > 0) {
            this.requestFrozenRefresh()
            this.requests.requestClear('orbitComplete')
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

    /** Mark the final-color cache stale and arm one rebuild after the view settles. */
    private invalidateRotationColorResolve() {
        this.rotationColorCacheReady = false
        this.rotationColorResolvePending = true
    }

    /** AA owns terminal reconstruction; its samples must never read this cache. */
    private suppressRotationColorResolve() {
        this.rotationColorCacheReady = false
        this.rotationColorResolvePending = false
    }

    /** Conditions shared by cache bake, cache presentation, and idle keepalive. */
    private rotationColorResolveAllowed(renderOptions = this.previousRenderOptions): boolean {
        if (this.palettePathGpu) return false
        if (!renderOptions || !this.previousMandelbrot) return false
        const hasLiveWebcam = this.webcamEnabled
            && (this.palettePathGpu?.stops ?? this.presetTransition?.stops ?? renderOptions.colorStops).some(stop => (stop.webcam ?? 0) > 0)
        return rotationNeedsColorResolve(this.previousMandelbrot.angle)
            && !this.tiltViewActive(renderOptions)
            && !this.aaActive
            && this.aaAccumulatedSamples === 0
            && !renderOptions.activateAnimate
            && !this.exporting
            && !hasLiveWebcam
            && !isZoomActive(this.zoomState)
            && !this.requests.clearPending
            && this.requests.snapshot === null
            && !this.reference.tableClearPending
            && !this.isReferenceValidating
            && !this.orbitIncomplete
            && !!this.pipelineRotationColorCache
            && !!this.pipelineRotationPresent
            && !!this.rotationColorTextureView
            && !!this.bindGroupRotationPresent
            && !!this.rotationPresentUniformBuffer
    }

    /** Full bake gate: fresh convergence evidence plus one quiet update. */
    private rotationColorResolveEligible(
        renderOptions: RenderOptions,
        fullyConverged: boolean,
    ): boolean {
        // The generic convergence gate waits for the entire asynchronous
        // readback ring to drain. Rotation's keepalive renders a frame every
        // tick and used to refill that ring continuously, so a fresh displayed
        // zero could sit at 100% for seconds before all slots happened to be
        // idle together. Frame ordering is the stronger evidence: once the
        // applied zero was sampled after the last raw mutation, later pending
        // readbacks describe the same unchanged field and are redundant.
        const hasFreshZero = rotationHasFreshZeroCounter(
            this.unfinishedPixelCount,
            this.counterSampleFrame,
            this.lastRawMutationFrame,
        )
        return this.rotationColorResolvePending
            && !this.rotationColorResolveChangedThisUpdate
            && (fullyConverged || hasFreshZero)
            && this.rotationColorResolveAllowed(renderOptions)
    }

    /**
     * Analytic-AA parameters: ln of the sub-pixel jitter half-extent δ
     * in c units (the Taylor certificate's footprint radius) and master eligibility.
     * Exact perturbation and every selectable block kernel carry the z″ payload,
     * so eligibility is independent of the approximation mode.
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
        // × scale. Uses the full-precision ln(scale) so the reseed certificate
        // match the actual deep δc (the raw-scale bug tagged deep pixels wrong).
        const logDelta = Number.isFinite(ln)
            ? Math.log(Math.SQRT2 * neutralExtent / Math.max(1, this.neutralSize)) + ln
            : Number.NEGATIVE_INFINITY
        // Low-bailout gate (2026-09-19): the color-pass expansion keeps the
        // center's escape iteration n and reads the sub-sample's fraction from
        // |ẑ_n|². A sub-sample that actually escaped at n−1 is only consistent
        // with that when |z_n|² ≈ |z_{n−1}|⁴, i.e. when c is negligible against
        // z_{n−1}² — true at mu = 1e6, false at mu = 4 where the error reaches
        // 0.5 iteration (mean 0.18 over crossing samples, measured). The reseed
        // certificate only guards the other side of each band edge (|ẑ_n| ≥
        // √mu), so the bias was one-sided and every contour visibly shifted
        // under AA. The bound is ≈ 2|c| / (mu · ln mu · ln 2): 0.011 at mu = 64,
        // below the palette's resolution, so exact re-iteration takes over
        // only under that.
        const muOk = (this.previousMandelbrot?.mu ?? Number.POSITIVE_INFINITY) >= AA_ANALYTIC_MIN_MU
        const enabled = !this.expmap && this.aaAnalyticEnabled && Number.isFinite(logDelta) && muOk
        // Deep re-enabled (2026-07-07, third attempt — root cause found in the
        // KERNEL this time): the block z″ update computed at the
        // old derS scale overflowed on deep blocks (coefficient exponents ~±133
        // exceed the ldexp/exp clamps; ΔS ≈ +92 per big block saturated the
        // rescale) → NaN sndM → Metal's max(NaN, x) laundered the reseed margin
        // into an auto-pass. Fixed by per-term new-scale folding + finite
        // guards in the reseed and color passes.
        return { logDelta, enabled }
    }

    private analyticRawPayloadNeeded(renderOptions: RenderOptions, aspect: number): boolean {
        const antialiasLevel = this.effectiveAntialiasLevel(renderOptions.antialiasLevel)
        return antialiasLevel > 1 && this.aaAnalyticParams(aspect).enabled
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
        this.suppressRotationColorResolve()
        // A previous accumulation left the boundary band at its LAST sample's
        // jitter; recompute so sample 0 is the unjittered base again (unbiased
        // mean, deterministic A/B re-runs).
        if (this.rawJittered) {
            this.requests.requestClear('aaRestart')
            this.invalidateCounterReadback()
        }
        this.aaActive = true
        this.needRender = true
    }

    /** Readable AA progress for the UI ("AA: done/total"). */
    get aaProgress(): { active: boolean; done: number; total: number } {
        const total = this.effectiveAntialiasLevel(this.previousRenderOptions?.antialiasLevel)
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
        const device = this.device
        const frameRawTexture = this.rawTexture
        const { key: pipelineKey } = this.inplacePipelineSpec(this.floatExpActive)
        let inplacePipeline = this.inplacePipelineCache.get(pipelineKey)
        if (!inplacePipeline) {
            // Keep the last presented image while preparing a newly selected mode.
            // Await before touching frame state: a default kernel could interpret
            // the selected approximation table with the wrong binary layout.
            inplacePipeline = await this.precompileInplacePipeline(this.floatExpActive)
            if (this.destroyed || this.device !== device
                || this.rawTexture !== frameRawTexture
                || this.previousRenderOptions !== renderOptions) return
            const currentSpec = this.inplacePipelineSpec(this.floatExpActive)
            if (currentSpec.key !== pipelineKey) return
        }
        // ── Frame plan: decide the field topology, then execute it ───────
        const aspect = (this.width / Math.max(1, this.height))
        const analyticRawPayloadNeeded = this.analyticRawPayloadNeeded(renderOptions, aspect)
        // A previous 9-layer pan can leave the Taylor-only layers in the old
        // scratch role: rebuild once before any analytic consumer can read.
        const clearInput = {
            clearReasons: this.requests.clearReasons,
            analyticPayloadStale: analyticRawPayloadNeeded && !this.rawAnalyticPayloadAligned,
        }
        const clear = frameClears(clearInput)
        if (clear) {
            this.invalidateCounterReadback()
        }
        const frameSerial = ++this.renderFrameSerial
        const tiledTile = this.currentTiledKeyframeTile()
        if (tiledTile) {
            this.tiledKeyframeDiagnostics.pumpsPerTile[tiledTile.index]
                = (this.tiledKeyframeDiagnostics.pumpsPerTile[tiledTile.index] ?? 0) + 1
        }

        // Camera motion of the live texture since the last rendered frame, in
        // texels of the grid it is computed at (liveScale during a zoom
        // cycle). A clear or an expmap block rebuilds it from scratch (null).
        // The texture moves by whole texels, the camera by the float amount,
        // and the grids carry the difference (see ViewGrids.carryLiveShift).
        const rebuildLive = clear || !!this.expmap
        const liveShift = rebuildLive ? null : this.prevFrameMandelbrot
            ? cameraShiftTexels(
                {
                    x: this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx,
                    y: this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy,
                },
                aspect,
                this.neutralSize,
                liveGridScale(this.zoomState, this.previousMandelbrot.scale),
            )
            : ZERO
        const shift = this.grids.carryLiveShift(liveShift)
        const zoomActive = isZoomActive(this.zoomState)
        const visiblePixelCount = Math.max(
            1,
            tiledTile ? tiledTile.width * tiledTile.height : this.width * this.height,
        )
        const plan = planFrame({
            ...clearInput,
            snapshot: this.requests.snapshot,
            zoomActive,
            tiled: !!this.tiled,
            tiledTileActive: !!tiledTile,
            shift,
            rawOrigin: { x: this.rawOriginX, y: this.rawOriginY },
            rawSide: this.workingSide,
            visiblePixelCount,
            width: this.width,
            height: this.height,
            unfinishedPixelCount: this.unfinishedPixelCount,
        })
        this.lastFramePlan = plan
        const {hasTranslationShift, activePixelCount} = plan
        const {x: roundedShiftTexX, y: roundedShiftTexY} = shift
        const clearFlag = plan.clear ? 1 : 0
        const zoomRefreshFrame = plan.clear && zoomActive
        const zoomRefreshHasSnapshot = zoomRefreshFrame && plan.snapshot === 'copy'
        // Cancellations decided by the plan are durable (tiled mode, idle pan).
        if (plan.snapshot === null) this.requests.cancelSnapshot()
        if (plan.frozenLosesAlignment) {
            // Translation shifts the live texture but not the frozen texture.
            this.frozenAligned = false
        }
        this.rawOriginX = plan.rawOrigin.x
        this.rawOriginY = plan.rawOrigin.y

        if (this.computeCenterUniform.scale !== 0) {
            // The compute pass evaluates the grid the live texture actually
            // holds (camera + residual); the colour pass reads it back at
            // (truth − residual).
            const [liveShiftU, liveShiftV] = toUv(this.grids.liveResidual, this.neutralSize)
            this.device.queue.writeBuffer(
                this.uniformBufferMandelbrot!,
                0,
                new Float32Array(this.grids.liveComputeCenter(this.computeCenterUniform, aspect, this.neutralSize)),
            )
            this.device.queue.writeBuffer(
                this.uniformBufferColor!,
                colorUniformByteOffset('liveShiftU'),
                new Float32Array([liveShiftU]),
            )
            this.device.queue.writeBuffer(
                this.uniformBufferColor!,
                colorUniformByteOffset('liveShiftV'),
                new Float32Array([liveShiftV]),
            )
        }
        if (this.budget.entersTranslation(hasTranslationShift) || (hasTranslationShift && this.exporting)) {
            // Discard a pre-pan count once. Subsequent pan frames keep this new
            // generation so dense translations can contribute fresh samples.
            // An export emits one frame per pan step and decides convergence on
            // this count: the previous step's count (already converged) would
            // pass the band this shift just exposed as finished — black bands
            // in the film. Every pan frame of an export starts a fresh count.
            this.invalidateCounterReadback()
        }
        this.dispatchBox = this.tileLocalDispatchBox(
            this.computeIterationDispatchBox(aspect, this.previousMandelbrot.angle),
        )
        if (this.expmap) this.dispatchBox = { x: 0, y: 0,
            width: Math.ceil(this.expmap.projection.width / 16) * 16,
            height: Math.ceil(this.expmap.projection.height / 16) * 16 }
        const dispatchPixelCount = this.dispatchBox.width * this.dispatchBox.height
        const zoomRefreshRegimeKey = this.iterationBatchRegimeKey(
            analyticRawPayloadNeeded,
            zoomRefreshHasSnapshot,
            dispatchPixelCount,
            visiblePixelCount,
        )

        // Frame topology is known only here. Zoom clears use their matching
        // first-dense-frame model; other clears and pans use the global rate.
        this.budget.observeTopology(plan.clear, hasTranslationShift)
        if ((plan.clear || hasTranslationShift) && this.budget.adoptLearnedSize({
            zoomRefresh: zoomRefreshFrame,
            activePixelCount,
            regimeKey: zoomRefreshRegimeKey,
        })) {
            // update() already uploaded the complete uniform block; patch the
            // single batch scalar now that render() knows this frame topology.
            this.device.queue.writeBuffer(
                this.uniformBufferMandelbrot!,
                MANDELBROT_BATCH_UNIFORM_OFFSET,
                new Float32Array([this.budget.batchSize]),
            )
        }

        const workCounterShift = iterationWorkCounterShift(
            this.budget.batchSize,
            dispatchPixelCount,
        )
        const brushUniforms = new Float32Array([
            aspect,
            this.previousMandelbrot.angle,
            clearFlag,
            roundedShiftTexX,
            roundedShiftTexY,
            this.dispatchBox.x,
            this.dispatchBox.y,
            this.rawCopyLayerCount(analyticRawPayloadNeeded),
            this.previousMandelbrot.mu,
            workCounterShift,
            this.rawOriginX,
            this.rawOriginY,
            tiledTile?.originX ?? 0,
            tiledTile?.originY ?? 0,
            this.neutralSize,
            this.rotationUnionCode(),
            ...(this.expmap?.projection.uniforms ?? new Float32Array(12)),
        ])
        this.device.queue.writeBuffer(this.uniformBufferBrush!, 0, brushUniforms.buffer)
        if (clearFlag !== 0 || hasTranslationShift) {
            // Color reads the analytic-AA payload straight from raw: keep its
            // origin slots current between full uniform rewrites.
            this.device.queue.writeBuffer(
                this.uniformBufferColor!,
                colorUniformByteOffset('rawOriginX'),
                new Float32Array([this.rawOriginX, this.rawOriginY]).buffer,
            )
        }

        // Use the readback ring as intended: mapping one slot must not suppress
        // the next frame's sample while another slot remains available.
        const hasFreshZeroCounter = !plan.clear
            && !hasTranslationShift
            && !this.aaReseedPending
            && rotationHasFreshZeroCounter(
                this.unfinishedPixelCount,
                this.counterSampleFrame,
                this.lastRawMutationFrame,
            )
        const shouldDispatchCounter = !hasFreshZeroCounter && this.counter.isSampleDue(frameSerial)
        const counterReadback = shouldDispatchCounter
            ? this.counter.reserve(frameSerial, workCounterShift)
            : undefined
        const resolveUniforms = new Float32Array([
            this.previousMandelbrot.mu,
            aspect,
            this.previousMandelbrot.angle,
            this.trapPayloadAllocated ? (this.orbitGradientAllocated ? 18 : 13) : -1,
            this.rawOriginX,
            this.rawOriginY,
            tiledTile?.originX ?? 0,
            tiledTile?.originY ?? 0,
            this.neutralSize,
            this.rotationUnionCode(),
        ])
        this.device.queue.writeBuffer(this.uniformBufferResolve!, 0, resolveUniforms.buffer)

        let scheduledCounterReadback: { readback: CounterReadback, batchGeneration: number } | undefined
        let aaFrontierCopyScheduled = false

        // Frame timing: wall interval between render() calls (the true frame
        // budget) and CPU-side render() duration. tsSlotsUsedThisFrame resets so
        // tsWrites() can record which passes actually ran this frame.
        const renderStartMs = performance.now()
        this.frameIntervalMs = this.lastRenderStartMs ? renderStartMs - this.lastRenderStartMs : 0
        this.lastRenderStartMs = renderStartMs
        this.passTimer.beginFrame()
        // Rendering FPS from the active-frame interval (EMA). Counts every frame
        // that actually renders — not only iteration frames. lastRenderStartMs is
        // reset to 0 in _loop on idle→active resume, so the stale gap is skipped
        // here (frameIntervalMs === 0). The <5000 guard drops any pathological gap.
        // Suppressed during an export: its pumps are not displayed frames, and
        // reporting their rate made the fps readout track something with no
        // relation to the film being produced.
        if (!this.exporting && this.frameIntervalMs > 0 && this.frameIntervalMs < 5000) {
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
        // Read both input sets directly, render into the third set, then exchange
        // destination/frozen roles. No full-surface preparation copies are needed.
        if (plan.snapshot === 'merge'
            && this.pipelineMerge && this.bindGroupMerge
            && this.resolvedDisplay && this.frozenDisplay && this.mergeDisplay
            && this.frozenDisplayVersion >= 0) {
            this.passTimer.spanBoundary(commandEncoder, PASS_SLOT_INDEX.merge, 'start')
            // Write merge uniforms captured at zoom stop before state reset.
            const mergeData = new Float32Array([
                this.mergeUniforms.zf,
                this.mergeUniforms.lzf,
                this.mergeUniforms.frozenShiftU,
                this.mergeUniforms.frozenShiftV,
                this.mergeUniforms.aspect,
                this.mergeUniforms.angle,
                this.mergeUniforms.liveShiftU,
                this.mergeUniforms.liveShiftV,
            ])
            this.device.queue.writeBuffer(this.uniformBufferMerge!, 0, mergeData.buffer)
            const mergeAttachments: GPURenderPassColorAttachment[] = [
                ...this.mergeDisplay.valueLayerViews,
                this.mergeDisplay.geometryView,
                this.mergeDisplay.metadataView,
                ...(this.mergeDisplay.orbitGradientView ? [this.mergeDisplay.orbitGradientView] : []),
            ].map(view => ({
                view,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear' as GPULoadOp,
                storeOp: 'store' as GPUStoreOp,
            }))
            const rpassMerge = commandEncoder.beginRenderPass({
                colorAttachments: mergeAttachments,
                timestampWrites: this.passTimer.explicitSpanEnd(PASS_SLOT_INDEX.merge),
            })
            rpassMerge.setPipeline(
                this.orbitGradientAllocated ? this.pipelineMergeOrbit! : this.pipelineMerge!,
            )
            rpassMerge.setBindGroup(0, this.bindGroupMerge)
            rpassMerge.draw(6, 1, 0, 0)
            rpassMerge.end()
            this.swapMergedDisplay()
            this.frozenDisplayVersion = this.resolvedDisplayVersion
            this.requests.snapshotDone()
            this.frozenAligned = true
        }

        // ── Zoom reprojection: copy resolved → frozen snapshot ────────
        if (plan.snapshot === 'copy'
            && this.resolvedDisplay && this.frozenDisplay) {
            const texSize = this.neutralSize
            this.passTimer.spanBoundary(commandEncoder, PASS_SLOT_INDEX.snapshot, 'start')
            commandEncoder.copyTextureToTexture(
                { texture: this.resolvedDisplay.valuesTexture },
                { texture: this.frozenDisplay.valuesTexture },
                { width: texSize, height: texSize, depthOrArrayLayers: DISPLAY_VALUE_LAYERS },
            )
            commandEncoder.copyTextureToTexture(
                { texture: this.resolvedDisplay.geometryTexture },
                { texture: this.frozenDisplay.geometryTexture },
                { width: texSize, height: texSize },
            )
            commandEncoder.copyTextureToTexture(
                { texture: this.resolvedDisplay.metadataTexture },
                { texture: this.frozenDisplay.metadataTexture },
                { width: texSize, height: texSize },
            )
            if (this.resolvedDisplay.orbitGradientTexture && this.frozenDisplay.orbitGradientTexture) {
                commandEncoder.copyTextureToTexture(
                    { texture: this.resolvedDisplay.orbitGradientTexture },
                    { texture: this.frozenDisplay.orbitGradientTexture },
                    { width: texSize, height: texSize },
                )
            }
            if (this.resolvedDisplay.trapPayloadTexture && this.frozenDisplay.trapPayloadTexture) {
                commandEncoder.copyTextureToTexture(
                    { texture: this.resolvedDisplay.trapPayloadTexture },
                    { texture: this.frozenDisplay.trapPayloadTexture },
                    { width: texSize, height: texSize },
                )
            }
            this.passTimer.spanBoundary(commandEncoder, PASS_SLOT_INDEX.snapshot, 'end')
            this.frozenDisplayVersion = this.resolvedDisplayVersion
            this.requests.snapshotDone()
            this.frozenAligned = true
        }

        const makeDisplayAttachments = (
            display: DisplaySet,
            loadOp: GPULoadOp = 'clear',
        ): GPURenderPassColorAttachment[] =>
            [
                ...display.valueLayerViews,
                display.geometryView,
                display.metadataView,
                ...(display.orbitGradientView ? [display.orbitGradientView] : []),
            ].map((view, index) => ({
                view,
                // Layer 0 is the iteration count: clear it to the no-data
                // sentinel. The resolve scissor leaves everything outside the
                // viewport's box at this value, and 0 reads as an exact interior
                // texel (step 1): once frozen, a zoom + rotation brought those
                // texels on screen as solid interior triangles, and they
                // outranked coarse live data in the min-step pick.
                clearValue: { r: index === 0 ? -1 : 0, g: 0, b: 0, a: 0 },
                loadOp,
                storeOp: 'store' as GPUStoreOp,
            }))

        // ── Frame passes ─────────────────────────────────────────────────
        // Single production iteration path: the fused in-place compute.
        // Pan and clear frames prepare B through the same utility kernel, then
        // swap it to the front before the in-place iteration dispatch.
        const utilityNeeded = plan.utility !== 'none'
        const shouldRunFieldPasses = plan.runFieldPasses

        // Track frames that may mutate A: utility frames rewrite it wholesale;
        // in-place frames only write when work remains (unknown counts are
        // conservatively treated as a mutation).
        if (shouldRunFieldPasses
            && (utilityNeeded || this.aaReseedPending || this.unfinishedPixelCount !== 0)) {
            this.lastRawMutationFrame = frameSerial
            this.rawFieldVersion++
            this.invalidateRotationColorResolve()
        }

        if (shouldRunFieldPasses) {
            if (plan.utility === 'clear') {
                // Clear frames rewrite B wholesale, then the texture roles swap
                // so iteration proceeds on the freshly prepared front texture.
                const utilPass = commandEncoder.beginComputePass({
                    timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX[selectRawUtilityPassKey(true)]),
                })
                utilPass.setPipeline(this.pipelineReprojectCs!)
                utilPass.setBindGroup(0, this.bindGroupReprojectCs!)
                const uwg = Math.ceil(this.workingSide / 16)
                utilPass.dispatchWorkgroups(uwg, uwg)
                utilPass.end()
                // Ping-pong instead of copying B back over A: B now holds the
                // cleared state, so it becomes the front texture and A the next
                // frame's scratch. Its toroidal origin is 0 (set above).
                this.swapRawTextures()
                // A clear establishes a fresh payload as the in-place pass fills
                // requested texels.
                this.rawAnalyticPayloadAligned = true
            } else if (plan.utility === 'pan') {
                // Pan: the toroidal origin already moved every texel; stamp the
                // wrapped-in strip (|shiftX| columns + |shiftY| rows) in place
                // on A. Nothing else is touched, so the Taylor layers survive
                // and the alignment flag is left as it was.
                const panPass = commandEncoder.beginComputePass({
                    timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX[selectRawUtilityPassKey(false)]),
                })
                panPass.setPipeline(this.pipelinePanClear!)
                panPass.setBindGroup(0, this.bindGroupPanClear!)
                const n = this.workingSide
                const stripX = Math.min(n, Math.abs(roundedShiftTexX))
                const stripY = Math.min(n, Math.abs(roundedShiftTexY))
                panPass.dispatchWorkgroups(
                    Math.max(1, Math.ceil(n / 16)),
                    Math.max(1, Math.ceil(stripX / 16) + Math.ceil(stripY / 16)),
                )
                panPass.end()
            }
            // Stage B selective reseed: stamp the boundary sliver (target > sample
            // index) as compute requests so only it reconverges with the new jitter;
            // frozen texels are left as-is and skipped by the fused pass below.
            // Certificate-passing escaped texels are tagged analytic-OK instead
            // of stamped; the color pass expands their z″ payload per sample.
            if (this.aaReseedPending && this.pipelineAaReseed && this.bindGroupAaReseed && this.uniformBufferAaTarget) {
                const aaLevel = this.effectiveAntialiasLevel(renderOptions.antialiasLevel)
                const aaAnalytic = this.aaAnalyticParams(aspect)
                const aaSceneAngle = this.previousMandelbrot.angle
                const aaMandelbrot = this.previousMandelbrot
                this.device.queue.writeBuffer(
                    this.uniformBufferAaTarget,
                    0,
                    new Float32Array([
                        aaLevel, this.aaSampleIndex, this.height,
                        aaAnalytic.enabled ? aaAnalytic.logDelta : 0,
                        aaAnalytic.enabled ? 1 : 0,
                        aspect, Math.sin(aaSceneAngle), Math.cos(aaSceneAngle),
                        0, 0,
                        aaMandelbrot.mu,
                        0, 0, 0, 0, 0,
                        this.rawOriginX, this.rawOriginY,
                        tiledTile?.originX ?? 0, tiledTile?.originY ?? 0,
                        this.neutralSize, this.tiled?.rotating ? 1 : 0,
                    ]).buffer,
                )
                if (this.aaFrontierBuffer) {
                    commandEncoder.clearBuffer(this.aaFrontierBuffer, 0, 8)
                }
                const reseedPass = commandEncoder.beginComputePass({
                    timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.reseed),
                })
                reseedPass.setPipeline(this.pipelineAaReseed)
                reseedPass.setBindGroup(0, this.bindGroupAaReseed)
                const rwg = Math.ceil(this.workingSide / 16)
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
            commandEncoder.clearBuffer(this.counter.buffer!, 0, COUNTER_BYTES)
            const computePass = commandEncoder.beginComputePass({
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.compute),
            })
            // Shallow views (scaleExp > DEEP_EXP) never enter the floatexp deep
            // path, so run the DCE'd shallow kernel; floatExpActive is set from
            // expScale <= DEEP_EXP_THRESHOLD earlier this frame.
            computePass.setPipeline(inplacePipeline)
            computePass.setBindGroup(0, this.bindGroupInplace!)
            // cs_main is @workgroup_size(8,8) — smaller tiles reduce intra-workgroup
            // lockstep divergence waste (one deep straggler holds 64 lanes, not 256).
            // The grid covers the rotated viewport's bounding box rather than the
            // whole neutral square: cs_main offsets its global id by
            // brush.dispatchOrigin, and the texels outside the box are exactly
            // those it already culls.
            computePass.dispatchWorkgroups(
                Math.max(1, Math.ceil(this.dispatchBox.width / 8)),
                Math.max(1, Math.ceil(this.dispatchBox.height / 8)),
            )
            computePass.end()
        }

        // Reuse the typed display set on color-only frames. Raw is never a
        // display ABI bypass: resolve may be skipped only when the cached
        // geometry version matches the field version.
        const converged = this.requests.snapshot === null
            && this.unfinishedPixelCount === 0
            && this.counterSampleFrame >= this.lastRawMutationFrame
        const skipResolve = this.tiled?.complete
            ? true
            : converged && isDisplaySetCurrent(this.rawFieldVersion, this.resolvedDisplayVersion)

        // An export keeps the frozen/live zoom cycle alive on purpose, so the
        // real-time predicate would never fire and no AA sample could ever be
        // composited. Same relaxation as videoFrameReady(), and only that one.
        const fullyConverged = this.isFieldConverged(this.exporting)

        if (!skipResolve) {
            // Resolve only copies/interpolates terminal analytic geometry and
            // packs display provenance; no neighbour finalization pass remains.
            const rpassResolve = commandEncoder.beginRenderPass({
                colorAttachments: makeDisplayAttachments(this.resolvedDisplay!, 'clear'),
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.resolve),
            })
            rpassResolve.setPipeline(
                this.orbitGradientAllocated ? this.pipelineResolveOrbit! : this.pipelineResolve!,
            )
            rpassResolve.setBindGroup(0, this.bindGroupResolve)
            // Only the rotated viewport's bounding box is ever displayed or
            // sampled (one texel of bilinear margin, covered by the 8-texel
            // pad): at low angles more than half the neutral square is culled.
            // loadOp 'clear' still resets the whole attachment.
            if (this.resolveScissorEnabled) {
                const scissor = this.resolveScissorRect()
                rpassResolve.setScissorRect(scissor.x, scissor.y, scissor.width, scissor.height)
            }
            rpassResolve.draw(6, 1, 0, 0)
            rpassResolve.end()

            this.resolvedDisplayVersion = this.rawFieldVersion
        }

        if (counterReadback) {
            this.counter.encodeCopy(commandEncoder, counterReadback)
            scheduledCounterReadback = { readback: counterReadback, batchGeneration: this.budget.generation }
        }

        // ── Terminal color branches: direct, AA, or settled rotation ──────
        const castShadows = this.castShadowsActive(renderOptions)
        this.lightOcclusionActive = this.castShadowSupported
            && ((renderOptions.castShadowStrength ?? 0) > 0 || (renderOptions.horizonOcclusionStrength ?? 0) > 0
                || (renderOptions.indirectLightStrength ?? 0) > 0)
        const tiltView = this.tiltViewActive(renderOptions)
        let tiltPresent: GPUBindGroup | undefined
        if (castShadows) this.prepareCastShadowRaster(Math.max(this.width, this.neutralSize), Math.max(this.height, this.neutralSize))
        const colorBindGroup = this.bindGroupColor!
        const swapView = this.ctx.getCurrentTexture().createView()

        const antialiasLevel = this.effectiveAntialiasLevel(renderOptions.antialiasLevel)
        const neutralExtentColor = Math.sqrt(aspect * aspect + 1.0)

        // AA with level <= 1 is a no-op: deactivate so the loop can idle.
        if (this.aaActive && antialiasLevel <= 1) {
            this.resetAaState()
            this.invalidateRotationColorResolve()
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

        // Export AA: start accumulating as soon as the frame's field converges.
        // Each jittered sample re-stamps only the boundary sliver (aa_reseed
        // Stage B) and skips analytically-tagged texels entirely, so a sample
        // costs a thin band rather than a reconvergence — which is what makes
        // per-frame AA affordable at all.
        if (this.exporting
            && this.exportAaSamples > 1
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
        const rotationBakeThisFrame = !aaShowAccum
            && this.rotationColorResolveEligible(renderOptions, fullyConverged)
        const rotationShowCache = !aaShowAccum
            && this.rotationColorResolveAllowed(renderOptions)
            && (this.rotationColorCacheReady || rotationBakeThisFrame)

        if (rotationShowCache) {
            this.device.queue.writeBuffer(
                this.rotationPresentUniformBuffer!,
                0,
                new Float32Array([
                    aspect,
                    Math.sin(this.previousMandelbrot.angle),
                    Math.cos(this.previousMandelbrot.angle),
                    0,
                ]).buffer,
            )
        }

        // Phase D: finalize the analytic-AA color flag — the expansion reads
        // payload layers 8..12, which exist only on the raw texture binding.
        // The ACCUM pass always binds raw (below), so the flag only needs the
        // binding to exist. update() pre-wrote 0; this lands before submit.
        if (aaCompositeThisFrame && this.aaSampleIndex > 0
            && (this.aaOffsetX !== 0 || this.aaOffsetY !== 0)
            && this.aaAnalyticParams(aspect).enabled) {
            this.device.queue.writeBuffer(this.uniformBufferColor!, colorUniformByteOffset('aaAnalytic'), new Float32Array([1]).buffer)
        }

        if (aaCompositeThisFrame) {
            const firstSample = this.aaSampleIndex === 0
            if (castShadows) this.encodeReliefRasters(commandEncoder, this.width, this.height)
            const rpassAccum = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.accumTextureView!,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: firstSample ? 'clear' : 'load',
                    storeOp: 'store',
                }],
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.aaAccum),
            })
            rpassAccum.setPipeline(firstSample ? this.pipelineColorAccumClear! : this.pipelineColorAccum!)
            // Accumulation reads the coherent typed display set. The raw texture
            // remains separately bound only for the analytic-AA Taylor payload
            // (layers 8..12); it is never used as the display-value ABI.
            rpassAccum.setBindGroup(0, colorBindGroup)
            rpassAccum.draw(6, 1, 0, 0)
            rpassAccum.end()
        } else if (tiltView && !aaShowAccum && this.pipelineColorAccumClear) {
            // Tilted view: linear colour into an intermediate, tilted below.
            this.tiltSourceTexture = this.ensureTiltTexture(this.tiltSourceTexture, this.width, this.height, 'Engine TiltView Source')
            this.encodeReliefRasters(commandEncoder, this.width, this.height)
            const rpassTiltSource = commandEncoder.beginRenderPass({
                colorAttachments: [{ view: this.tiltSourceTexture.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }],
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.color),
            })
            rpassTiltSource.setPipeline(this.pipelineColorAccumClear)
            rpassTiltSource.setBindGroup(0, colorBindGroup)
            rpassTiltSource.draw(6, 1, 0, 0)
            rpassTiltSource.end()
        } else if (rotationBakeThisFrame) {
            // Colorize each neutral texel once. The cache contains final linear
            // color, so its later bilinear filtering cannot invent semantic
            // iteration/geometry/orbit-trap states.
            if (castShadows) this.encodeReliefRasters(commandEncoder, this.neutralSize, this.neutralSize, true)
            const rpassRotationCache = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.rotationColorTextureView!,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.color),
            })
            rpassRotationCache.setPipeline(this.pipelineRotationColorCache!)
            rpassRotationCache.setBindGroup(0, colorBindGroup)
            rpassRotationCache.draw(6, 1, 0, 0)
            rpassRotationCache.end()
            this.rotationColorCacheReady = true
            this.rotationColorResolvePending = false
        } else if (!aaShowAccum && !rotationShowCache) {
            // Direct path: color straight to the swapchain (AA off, or sample 0 not
            // yet converged). Byte-identical to the historical behaviour.
            if (castShadows) this.encodeReliefRasters(commandEncoder, this.width, this.height)
            const rpassColor = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: swapView,
                    clearValue: { r: 1, g: 1, b: 1, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.color),
            })
            rpassColor.setPipeline(this.pipelineColor)
            rpassColor.setBindGroup(0, colorBindGroup)
            rpassColor.draw(6, 1, 0, 0)
            rpassColor.end()
        }

        // Present exactly one derived terminal result: AA average or filtered
        // rotation cache. Direct color already wrote the swapchain above.
        if (tiltView && this.pipelinePresent && this.layoutPresent) {
            const source = aaShowAccum ? this.accumTextureView : this.tiltSourceTexture?.createView()
            if (source) {
                this.tiltOutTexture = this.ensureTiltTexture(this.tiltOutTexture, this.width, this.height, 'Engine TiltView Output')
                this.encodeTiltView(commandEncoder, source, this.tiltOutTexture, this.tiltViewUniformLive!, renderOptions, aspect)
                tiltPresent = this.presentBindGroupFor(this.tiltOutTexture)
            }
        }
        if ((aaShowAccum || tiltPresent) && this.pipelinePresent && (tiltPresent || this.bindGroupPresent)) {
            const rpassPresent = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: swapView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.present),
            })
            rpassPresent.setPipeline(this.pipelinePresent)
            rpassPresent.setBindGroup(0, tiltPresent ?? this.bindGroupPresent!)
            rpassPresent.draw(6, 1, 0, 0)
            rpassPresent.end()
        } else if (rotationShowCache && this.pipelineRotationPresent && this.bindGroupRotationPresent) {
            const rpassRotationPresent = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: swapView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
                timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.present),
            })
            rpassRotationPresent.setPipeline(this.pipelineRotationPresent)
            rpassRotationPresent.setBindGroup(0, this.bindGroupRotationPresent)
            rpassRotationPresent.draw(6, 1, 0, 0)
            rpassRotationPresent.end()
        }

        // ── Debug overlay: instrumented recompute straight onto the frame ──
        // Bake the AA target map once, right after sample 0 has converged and been
        // composited (reads the converged typed values and cached height). Reused
        // by the color gate and selective reseed for all subsequent samples.
        const aaBakeThisFrame = aaCompositeThisFrame
            && this.aaSampleIndex === 0
            && !!this.pipelineAaTarget
            && !!this.bindGroupAaTarget
            && !!this.uniformBufferAaTarget
        if (aaBakeThisFrame) {
            // Contrast/moiré predictor inputs (design D-contrast): the bake
            // Sobels the sample-0 composite (encoded just above in this same
            // frame) and reads palette frequency from the typed value layers.
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
                    iterationPaletteCurveCode(renderOptions.iterationPaletteCurve),
                    0,
                    this.rawOriginX,
                    this.rawOriginY,
                    tiledTile?.originX ?? 0,
                    tiledTile?.originY ?? 0,
                    this.neutralSize,
                    this.tiled?.rotating ? 1 : 0,
                ]).buffer,
            )
            const bakePass = commandEncoder.beginComputePass()
            bakePass.setPipeline(this.pipelineAaTarget!)
            bakePass.setBindGroup(0, this.bindGroupAaTarget!)
            bakePass.dispatchWorkgroups(
                Math.ceil(this.workingSide / 16),
                Math.ceil(this.workingSide / 16),
            )
            bakePass.end()
        }

        // Per-pass timing: resolve the timestamp pairs into a buffer and copy to
        // a mappable readback (both GPU-side, no stall). Only when the previous
        // readback has completed — otherwise skip this frame's sample.
        const batchTimingContext: IterationBatchTimingContext = {
            frame: frameSerial,
            batchSize: this.budget.batchSize,
            generation: this.budget.generation,
            activePixelCount,
            visiblePixelCount,
            zoomRefresh: zoomRefreshFrame,
            zoomRefreshRegimeKey,
        }
        const tsResolvedThisFrame = this.passTimer.resolveFrame(commandEncoder, batchTimingContext)

        // soumission des commandes
        const submitStartMs = performance.now()
        this.device.queue.submit([commandEncoder.finish()])
        this.cpuRenderMs = performance.now() - renderStartMs
        this.frameSerial++   // one actually-rendered frame → one measurement for the panel
        if (tsResolvedThisFrame) this.passTimer.readback(sample => this.onPassTimingSample(sample))
        // Timestamp-capable adapters pace from the query span read above. The
        // submit-to-done wall clock is only a fallback: on Safari/WebKit it can
        // include notification latency far beyond the actual GPU frame.
        if (!this.timestampsEnabled) {
            this.scheduleGpuTiming(submitStartMs, batchTimingContext)
        }
        if (scheduledCounterReadback) {
            const {readback, batchGeneration} = scheduledCounterReadback
            this.counter.schedule(
                readback,
                sample => this.budget.recordCounterSample(sample.frame, {
                    generation: batchGeneration,
                    actualWeightedWork: sample.actualWeightedWork,
                    remainingPixelCount: sample.unfinished,
                    effectiveRemainingPixelCount: sample.effectiveUnfinished,
                    periodicThrottledPixelCount: sample.periodicThrottled,
                }),
                (sample, previous) => this.onCounterApplied(sample.unfinished, previous),
            )
        }
        if (aaFrontierCopyScheduled) {
            this.readbackAaFrontier()
        }

        // The clear has been consumed by the GPU passes.
        if (plan.clear) {
            // A clear re-stamps every pixel for recompute at the current jitter
            // offset (0 outside AA accumulation → the base is unjittered again).
            // Pan gathers COPY pixels, so they deliberately don't touch this.
            this.rawJittered = this.aaOffsetX !== 0 || this.aaOffsetY !== 0
            this.budget.clearSubmitted()
        }
        this.requests.clearDone()

        // marque mise à jour des paramètres frame précédente pour prochaine frame
        this.prevFrameMandelbrot = { ...this.previousMandelbrot }
        this.grids.commit()

        // Parameters have been consumed — clear the flag so the engine can go idle
        // once all other conditions (orbit, unfinished pixels, etc.) are satisfied.
        this.needRender = false
        this.rotationColorResolveChangedThisUpdate = false

        // ── Advance the AA state machine ──────────────────────────────────
        // Runs after the clear/needRender resets above so the flags it sets stick
        // for the next frame. Only fires on the frame that captured a sample.
        if (aaCompositeThisFrame) {
            this.aaAccumulatedSamples++
            if (this.aaAccumulatedSamples < antialiasLevel) {
                // Queue the next box-filter sample. The sequence is expressed in
                // SCREEN texel units, then rotated into the scene's local_rot
                // frame: without that rotation the box footprint itself rotated
                // on screen and reached ±√½ px at a 45° scene angle. One neutral
                // texel spans 2·neutralExtent/neutralSize in local_rot units.
                this.aaSampleIndex++
                const screenJitter = computeAaJitterOffset(this.aaSampleIndex)
                const sceneJitter = rotateAaJitterToScene(screenJitter, this.previousMandelbrot.angle)
                const texelToNeutral = 2 * neutralExtentColor / Math.max(1, this.neutralSize)
                this.aaOffsetX = sceneJitter.x * texelToNeutral
                this.aaOffsetY = sceneJitter.y * texelToNeutral
                // Stage B: reconverge only the boundary sliver via a selective reseed.
                // Every raw request is already exact step 1.
                const canSelectiveReseed = this.useAaSelectiveReseed
                    && !!this.pipelineAaReseed
                    && !!this.bindGroupAaReseed
                if (canSelectiveReseed) {
                    this.aaReseedPending = true
                    // The reseed marks the boundary sliver as unfinished again; without
                    // invalidating the async pixel counter, the stale zero
                    // from the previous convergence would make fullyConverged fire
                    // immediately and composite a half-computed sample. Force a fresh
                    // count so the next composite waits for the sliver to reconverge.
                    this.invalidateCounterReadback()
                } else {
                    this.requests.requestClear('aaSample')
                }
                this.needRender = true
            } else {
                // Accumulation complete → go idle; the final average stays on screen.
                this.aaActive = false
            }
        }

        // ── Video export capture ─────────────────────────────────────
        // Supersampled LINEAR colour pass → present-with-reduction → readback.
        // Deliberately NOT the pipelineColor (fs_main_direct) path the PNG
        // snapshot below uses: that one already emits sRGB, and reducing encoded
        // values darkens every edge in the film.
        if (this.capture.isPending) {
            await this.capture.fulfil({
                device: this.device,
                format: this.format,
                canvasFormat: this.canvasFormat,
                hdrRendering: this.hdrRendering,
                presentModule: this.modulePresent!,
                presentLayout: this.layoutPresent!,
                swapchainView: () => this.ctx.getCurrentTexture().createView(),
                colorBindGroup,
                linearPipeline: this.expmap ? this.expmapCapturePipeline! : this.pipelineColorAccumClear!,
                // The ExpMap block capture reads raw-grid coordinates: no height raster.
                accumulatorSize: { width: this.width, height: this.height },
                tiltView: tiltView && !this.expmap ? (encoder: GPUCommandEncoder, source: GPUTextureView, width: number, height: number) => {
                    this.tiltExportOutTexture = this.ensureTiltTexture(this.tiltExportOutTexture, width, height, 'Engine TiltView Export Output')
                    this.encodeTiltView(encoder, source, this.tiltExportOutTexture, this.tiltViewUniformExport!, renderOptions, aspect)
                    return this.presentBindGroupFor(this.tiltExportOutTexture)
                } : undefined,
                castShadow: castShadows && !this.expmap ? {
                    prepare: (width: number, height: number) => this.prepareCastShadowRaster(width, height),
                    encode: (encoder: GPUCommandEncoder, width: number, height: number) => this.encodeReliefRasters(encoder, width, height),
                } : undefined,
                accumulator: this.exportAaSamples > 1 && this.aaAccumulatedSamples > 0 && this.accumTextureView
                    ? this.accumTextureView
                    : null,
            })
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
                  let snapshotBindGroup = colorBindGroup!;
                  if (castShadows) {
                    snapshotBindGroup = this.prepareCastShadowRaster(targetWidth, targetHeight);
                    this.encodeReliefRasters(encoder, targetWidth, targetHeight);
                  }
                  const renderPass = encoder.beginRenderPass({
                    colorAttachments: [{
                      view: snapshotTex.createView(),
                      clearValue: { r: 0, g: 0, b: 0, a: 1 },
                      loadOp: 'clear',
                      storeOp: 'store',
                    }]
                  });
                  renderPass.setPipeline((this.colorPipelineFamily(false) ?? this.colorPipelines!).full.direct);
                  renderPass.setBindGroup(0, snapshotBindGroup);
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
                    pixelArray[dstIdx + 0] = src[srcIdx + (this.format === 'bgra8unorm' ? 2 : 0)]; // Rouge
                    pixelArray[dstIdx + 1] = src[srcIdx + 1]; // Vert
                    pixelArray[dstIdx + 2] = src[srcIdx + (this.format === 'bgra8unorm' ? 0 : 2)]; // Bleu
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
        this.cancelPresetTransition()
        this.palettePathGeneration++
        this.palettePathGpu?.destroy()
        this.palettePathDummy?.destroy()
        this.destroyed = true
        this.stopRenderLoop()
        this.cancelMinibrot()
        this.reference.dispose()
        this.rawTexture?.destroy?.()
        this.rawBrushTexture?.destroy?.()
        this.destroyDisplaySet(this.resolvedDisplay)
        this.destroyDisplaySet(this.frozenDisplay)
        this.destroyDisplaySet(this.mergeDisplay)
        this.destroyDisplaySet(this.tiledLiveDisplay)
        this.rotationColorTexture?.destroy?.()
        this.mandelbrotReferenceBuffer?.destroy?.()
        this.mandelbrotBlaBuffer?.destroy?.()
        this.mandelbrotBlaLevelBuffer?.destroy?.()
        this.uniformBufferMandelbrot?.destroy?.()
        this.uniformBufferColor?.destroy?.()
        this.uniformBufferBrush?.destroy?.()
        this.uniformBufferResolve?.destroy?.()
        this.rotationPresentUniformBuffer?.destroy?.()
        this.counter.destroy()
        this.uniformBufferMerge?.destroy?.()
        this.capture.destroy('Engine destroyed while a capture was pending.')
        this.webcamTexture?.closeWebcam()
        this.webcamTileTexture?.destroy?.()
        this.paletteTexture?.destroy?.()
        this.device?.destroy?.()
    }

    // ── Self-managing render loop ─────────────────────────────────────

    /**
     * Returns true if the engine has work to do (parameter change,
     * unfinished pixels, incomplete orbit, or continuous-render mode).
     */
    needsMoreFrames(): boolean {
        let reason = ''
        if (this.needRender) reason = 'needRender'
        else if (this.capture.isPending) reason = 'exportCapture'
        else if (this.snapshotCallback) reason = 'snapshot'
        else if (isZoomActive(this.zoomState)) reason = 'zoomActive'
        else if (this.requests.clearPending) reason = 'clearHistory'
        // Deferred invalidation clear armed: the view is a stale (identical)
        // image awaiting its rebuilt table. Keep the loop alive so update()
        // checks the fallback deadline and the session reads as "rendering"
        // (specs and the completion timer span the whole param-change
        // re-render, table build included).
        else if (this.reference.tableClearPending) reason = 'tablePending'
        else if (this.requests.snapshot === 'copy') reason = 'freezeSnapshot'
        else if (this.requests.snapshot === 'merge') reason = 'mergeSnapshot'
        else if (this.isReferenceValidating) reason = 'referenceValidating'
        else if (this.orbitIncomplete) reason = 'orbitIncomplete'
        else if (
            this.unfinishedPixelCount < 0
            || this.unfinishedPixelCount > (this.expmap ? 0 : UNFINISHED_PIXEL_DONE_THRESHOLD)
        ) {
            reason = `unfinished=${this.unfinishedPixelCount}`
        }
        else if (this.aaActive) reason = 'aaAccumulating'
        // Export AA pending: the frame's field has converged but accumulation
        // has not started. render() bails out early when this returns false, so
        // without this branch the trigger inside it is never reached and the
        // frame waits forever for samples that can never be taken. Bites
        // whenever the zoom cycle happens to be idle — frame 0 above all.
        // Deliberately omits the counter freshness guard, exactly like
        // aaAutoPending below: including it would livelock the loop.
        else if (this.exporting
            && this.exportAaSamples > 1
            && !this.aaActive
            && this.aaAccumulatedSamples === 0
            && !this.requests.clearPending
            && this.requests.snapshot === null
            && !this.orbitIncomplete
            && this.unfinishedPixelCount >= 0
            && this.unfinishedPixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD) {
            reason = 'exportAaPending'
        }
        // Auto AA pending: the view looks converged but accumulation hasn't started
        // yet. Keep the loop alive so render()'s auto-trigger (which needs the full
        // fullyConverged check incl. the async counter) gets a chance to fire,
        // instead of idling on the exact frame convergence completes.
        //
        // DELIBERATELY a weaker term set than isFieldConverged(): the counter
        // freshness guard is omitted, and must stay omitted. A readback is
        // scheduled on essentially every rendered frame
        // (COUNTER_SAMPLE_INTERVAL_FRAMES = 1), so treating "readback in flight"
        // as a reason to keep going would livelock the loop — each frame would
        // schedule the readback that justifies drawing the next one, and the
        // engine would never idle. This function answers "is there work to do?",
        // which is not the same question as "is the field converged, on fresh
        // evidence?"; only the latter is isFieldConverged().
        else if (this.aaAuto
            && !this.aaActive
            && this.aaAccumulatedSamples === 0
            // Same idle threshold as the convergence gates: requiring exactly 0
            // left auto AA permanently pending on views that idle with a few
            // stuck unfinished pixels.
            && this.unfinishedPixelCount >= 0
            && this.unfinishedPixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD
            && !this.orbitIncomplete
            && !isZoomActive(this.zoomState)) {
            reason = 'aaAutoPending'
        }
        // Rotation-cache pending uses the same deliberately weak convergence
        // keepalive as auto AA: omit async counter freshness here, then let the
        // full gate inside render() decide whether this frame may bake.
        else if (this.rotationColorResolvePending
            && this.rotationColorResolveAllowed()
            && this.unfinishedPixelCount >= 0
            && this.unfinishedPixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD) {
            reason = 'rotationColorResolvePending'
        }
        return reason !== ''
    }

    /** Current GPU iteration batch size (auto-adjusted to the requested compute budget). */
    getIterationBatchSize(): number {
        return this.budget.batchSize
    }

    /**
     * Start the self-managing render loop. The provided callback is
     * called every animation frame; the engine's early-exit guards
     * skip GPU work when idle.
     */
    private expmapPauseCount = 0
    private expmapParkedDraw: (() => Promise<void>) | null = null

    suspendForExpmapPlayback(): () => void {
        if (this.expmapPauseCount++ === 0) {
            this.expmapParkedDraw = this._drawFn
            this.stopRenderLoop()
        }
        let released = false
        return () => {
            if (released) return
            released = true
            if (--this.expmapPauseCount === 0) {
                if (this.lastUpdateTime > 0) this.lastUpdateTime = performance.now()
                const draw = this.expmapParkedDraw
                this.expmapParkedDraw = null
                if (draw && !this.destroyed) this.startRenderLoop(draw)
            }
        }
    }

    startRenderLoop(drawFn: () => Promise<void>) {
        if (this.expmapPauseCount) { this.expmapParkedDraw = drawFn; return }
        this._drawFn = drawFn
        if (this._rafId === null) {
            this._pacingLastTickMs = -1
            this._pacingCreditMs = 0
            this._lastRafTickMs = -1
            this.framePacingRafRawIntervalMs = 0
            this.framePacingRafIntervalMs = 0
            this._rafId = requestAnimationFrame(now => { void this._loop(now) })
        }
    }

    /** Stop the render loop and release the callback. */
    stopRenderLoop() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId)
            this._rafId = null
        }
        this._drawFn = null
        this._pacingLastTickMs = -1
        this._pacingCreditMs = 0
        this._lastRafTickMs = -1
        this.framePacingRafRawIntervalMs = 0
        this.framePacingRafIntervalMs = 0
        this.framePacingTargetIntervalMs = 0
    }

    private async _loop(now: number) {
        if (!this._drawFn) {
            this._rafId = null
            return
        }

        // Keep the browser callback chain continuously armed. Re-registering
        // only after await draw() made the measured cadence include promise/Vue
        // scheduling and could miss a presentation cycle even when CPU work was
        // tiny. A second callback may arrive while draw() is suspended, but the
        // in-flight guard below prevents overlapping navigation or submissions.
        const previousRafTickMs = this._lastRafTickMs
        this._lastRafTickMs = now
        if (previousRafTickMs >= 0 && now >= previousRafTickMs) {
            const rafIntervalMs = now - previousRafTickMs
            if (rafIntervalMs > 0 && rafIntervalMs < 1000) {
                this.framePacingRafRawIntervalMs = rafIntervalMs
                this.framePacingRafIntervalMs = this.framePacingRafIntervalMs > 0
                    ? this.framePacingRafIntervalMs * 0.9 + rafIntervalMs * 0.1
                    : rafIntervalMs
            }
        }
        this._rafId = requestAnimationFrame(nextNow => { void this._loop(nextNow) })
        if (this._drawInFlight) return

        // Pace stepping + rendering to the *real* GPU frame time rather than the
        // raw rAF interval. Rendering is fire-and-forget (queue.submit returns
        // before the GPU is done), so rAF keeps firing at
        // ~display rate even when a deep-zoom frame takes hundreds of ms on the
        // GPU. Without this gate the navigator would advance ~60×/s while the
        // screen only updates a handful of times per second, so the animation
        // (zoom in particular) wouldn't track render time and the displayed image
        // would jump. By only invoking draw() once a real frame's worth of time
        // has elapsed, navigator.step()'s own Date.now() delta_time becomes the
        // true render cadence → uniform, render-time-dependent zoom, and no
        // backlog of un-displayable frames piling up in the queue.
        // smoothedGpuTimeMs is zero until the first timing sample. The same
        // 500 ms ceiling as the pacer prevents a stale/extreme sample from
        // freezing navigation for longer than a responsive interaction frame.
        const minInterval = Math.min(this.smoothedGpuTimeMs, 500)
        this.framePacingTargetIntervalMs = minInterval
        // Timestamp mapAsync completion is telemetry, not a GPU frame fence:
        // its CPU notification can arrive tens of milliseconds after the timed
        // GPU work completed. Timestamp-capable adapters therefore pace from the
        // last smoothed query span even while its readback is mapped. Without
        // timestamp queries, retain the conservative onSubmittedWorkDone fence.
        const fallbackFrameComplete = this.timestampsEnabled || !this.pendingGpuTiming
        const pacing = advanceFramePacer(
            now,
            minInterval,
            this._pacingLastTickMs,
            this._pacingCreditMs,
            fallbackFrameComplete,
        )
        this._pacingLastTickMs = pacing.lastTickMs
        this._pacingCreditMs = pacing.creditMs
        if (pacing.shouldDraw) {
            this._drawInFlight = true
            try {
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
            } finally {
                this._drawInFlight = false
            }
        }
    }

    private async preparePalettePath(options: RenderOptions) {
        const input = options.palettePath
        if (!input?.enabled || this.presetTransition) {
            if (this.palettePathInput) { this.palettePathGeneration++; this.palettePathInput = undefined }
            if (this.palettePathGpu) {
                this.palettePathGpu.destroy(); this.palettePathGpu = undefined
                this.palettePathSignature = ''; this.palettePathInput = undefined
                this.previousRenderOptions = undefined; this.rebuildColorBindGroup()
                this.resetAaState(); this.needRender = true
            }
            this.palettePathStatus = ''
            return
        }
        const globals = JSON.stringify([options.interpolationMode, ...PATH_GLOBAL_FIELDS.map(f => options[f]),
            options.textureName, options.textureGuid, options.skyboxName, options.skyboxGuid,
            options.textureMapping, options.paletteMirror, options.iterationPaletteCurve])
        if (input === this.palettePathInput && options.colorStops === this.palettePathBaseStops && globals === this.palettePathBaseGlobals) return
        this.palettePathInput = input; this.palettePathBaseStops = options.colorStops; this.palettePathBaseGlobals = globals
        const generation = ++this.palettePathGeneration
        try {
            const path = validatePalettePath(input), base = snapshotPathAppearance(options)
            const signature = JSON.stringify([path, base])
            if (signature === this.palettePathSignature) return
            this.palettePathStatus = t('engine.palettePath.preparing')
            const assets = await resolvePalettePathImages(path, base)
            const textures: GPUTexture[] = []
            let prepared: GpuPalettePath | undefined
            try {
                if (assets.images.length * path.textureSize ** 2 * 4 * 4 / 3 * 2 + (path.stops.length + 1) * 4096 * PALETTE_TEXTURE_ROWS * 8 > PALETTE_PATH_TEXTURE_BUDGET)
                    throw new Error(t('engine.palettePath.budgetExceeded'))
                for (const asset of assets.images) {
                    textures.push(await this._loadTexture(asset.url, true, path.textureSize))
                    if (generation !== this.palettePathGeneration || this.destroyed) return
                }
                const data = [base, ...path.stops.map(s => s.appearance)].map(p => float32ArrayToFloat16(new Palette(p.colorStops, p.interpolationMode).generateTexture().data))
                prepared = new GpuPalettePath(this.device, path, base, data, textures, assets.indices)
                await this.ensurePathColorPipelines()
                if (generation !== this.palettePathGeneration || this.destroyed) { prepared.destroy(); return }
            } finally { assets.dispose(); textures.forEach(t => t.destroy()) }
            this.palettePathGpu?.destroy(); this.palettePathGpu = prepared
            this.palettePathSignature = signature
            this.palettePathStatus = t('engine.palettePath.ready', { count: path.stops.length, size: path.textureSize })
            this.previousRenderOptions = undefined
            this.rebuildColorBindGroup(); this.resetAaState(); this.invalidateRotationColorResolve(); this.needRender = true
        } catch (error) {
            this.palettePathGpu?.destroy(); this.palettePathGpu = undefined
            this.palettePathSignature = ''; this.rebuildColorBindGroup(); this.previousRenderOptions = undefined
            this.palettePathStatus = t('engine.palettePath.notApplied', { error: String(error) })
            if (this.expmap) throw error
        }
    }

    /** Prepare endpoints atomically; async stale completions never replace a newer travel. */
    async preparePresetTransition(
        start: { colorStops: ColorStop[]; interpolationMode: InterpolationMode },
        end: { colorStops: ColorStop[]; interpolationMode: InterpolationMode },
        tile: { url: string; key: string }, sky: { url: string; key: string },
    ): Promise<boolean> {
        this.cancelPresetTransition()
        const generation = this.transitionGeneration
        const results = await Promise.allSettled([
            this.isTileTextureSourceCurrent(tile.key) ? Promise.resolve(this.tileTexture!) : this._loadTexture(tile.url, true),
            this.isSkyboxTextureSourceCurrent(sky.key) ? Promise.resolve(this.skyboxTexture!) : this._loadTexture(sky.url, true),
        ])
        const release = () => {
            const owned = new Set(results.flatMap(r => r.status === 'fulfilled'
                && r.value !== this.tileTexture && r.value !== this.skyboxTexture ? [r.value] : []))
            owned.forEach(texture => texture.destroy())
        }
        if (generation !== this.transitionGeneration || this.destroyed) { release(); return false }
        const failed = results.find(r => r.status === 'rejected')
        if (failed?.status === 'rejected') { release(); throw failed.reason }
        const targetTile = (results[0] as PromiseFulfilledResult<GPUTexture>).value
        const targetSky = (results[1] as PromiseFulfilledResult<GPUTexture>).value
        let palette: GpuPaletteTransition | undefined
        let tileLayers: GPUTexture | undefined
        let skyLayers: GPUTexture | undefined
        try {
            palette = new GpuPaletteTransition(this.device, this.paletteTexture!, [start, end].map(p =>
                float32ArrayToFloat16(new Palette(p.colorStops, p.interpolationMode).generateTexture().data)))
            tileLayers = targetTile === this.tileTexture ? undefined : packTextureLayers(this.device, [this.tileTexture!, targetTile])
            skyLayers = targetSky === this.skyboxTexture ? undefined : packTextureLayers(this.device, [this.skyboxTexture!, targetSky])
            this.presetTransition = {
                palette, progress: 0, stops: [...start.colorStops, ...end.colorStops],
                tile: targetTile, sky: targetSky, tileKey: tile.key, skyKey: sky.key,
                tileLayers, skyLayers,
            }
        } catch (error) {
            palette?.destroy(); tileLayers?.destroy(); skyLayers?.destroy(); release()
            throw error
        }
        this.setPresetTransitionProgress(0)
        this.rebuildColorBindGroup()
        return true
    }

    setPresetTransitionProgress(progress: number) {
        if (!this.presetTransition) return
        this.presetTransition.progress = Math.max(0, Math.min(1, progress))
        this.presetTransition.palette.blend(this.presetTransition.progress)
        this.invalidateRotationColorResolve()
        this.needRender = true
    }

    finishPresetTransition() {
        const transition = this.presetTransition
        if (!transition) return
        ++this.tileLoadGeneration
        ++this.skyLoadGeneration
        if (this.tileTexture !== transition.tile) this.tileTexture?.destroy()
        if (this.skyboxTexture !== transition.sky) this.skyboxTexture?.destroy()
        this.tileTexture = transition.tile
        this.skyboxTexture = transition.sky
        this.tileTextureSourceKey = transition.tileKey
        this.skyboxTextureSourceKey = transition.skyKey
        this.tileTextureView = this.tileTexture.createView({ dimension: '2d-array' })
        this.skyboxTextureView = this.skyboxTexture.createView({ dimension: '2d-array' })
        this.cancelPresetTransition()
    }

    cancelPresetTransition() {
        ++this.transitionGeneration
        const transition = this.presetTransition
        this.presetTransition = undefined
        if (!transition) return
        transition.palette.destroy()
        transition.tileLayers?.destroy()
        transition.skyLayers?.destroy()
        if (transition.tile !== this.tileTexture) transition.tile.destroy()
        if (transition.sky !== this.skyboxTexture) transition.sky.destroy()
        this.previousRenderOptions = undefined // restore the ordinary palette on the next update
        this.rebuildColorBindGroup()
        this.invalidateRotationColorResolve()
        this.needRender = true
    }

    /**
     * Replace the tile (tessellation) texture at runtime from a data URL or blob URL.
     * The new texture replaces the current one and the color bind group is rebuilt.
     * Max supported size: 4096×4096.
     */
    async updateTileTexture(url: string, sourceKey = url): Promise<void> {
        if (this.tileTextureSourceKey === sourceKey) return
        this.cancelPresetTransition()
        const generation = ++this.tileLoadGeneration
        const newTexture = await this._loadTexture(url, true)
        if (generation !== this.tileLoadGeneration || this.destroyed) { newTexture.destroy(); return }
        this.cancelPresetTransition()
        this.tileTexture?.destroy?.()
        this.tileTexture = newTexture
        this.tileTextureView = this.tileTexture.createView({ dimension: '2d-array' })
        this.tileTextureSourceKey = sourceKey
        this.rebuildColorBindGroup()
        this.invalidateRotationColorResolve()
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
        this.cancelPresetTransition()
        // Mips : les reflets rugueux lisent un niveau préfiltré (color.wgsl).
        const generation = ++this.skyLoadGeneration
        const newTexture = await this._loadTexture(url, true)
        if (generation !== this.skyLoadGeneration || this.destroyed) { newTexture.destroy(); return }
        this.cancelPresetTransition()
        this.skyboxTexture?.destroy?.()
        this.skyboxTexture = newTexture
        this.skyboxTextureView = this.skyboxTexture.createView({ dimension: '2d-array' })
        this.skyboxTextureSourceKey = sourceKey
        this.rebuildColorBindGroup()
        this.invalidateRotationColorResolve()
        this.needRender = true
    }

    isSkyboxTextureSourceCurrent(sourceKey: string): boolean {
        return this.skyboxTextureSourceKey === sourceKey
    }

    /**
     * Height raster for cast shadows, at least width x height. Grows only;
     * a regrowth rebinds the colour group. Returns true if it was reallocated.
     */
    private ensureCastShadowTexture(width: number, height: number): boolean {
        const current = this.castShadowTexture
        if (current && current.width >= width && current.height >= height) return false
        const w = Math.max(1, Math.ceil(width), current?.width ?? 1)
        const h = Math.max(1, Math.ceil(height), current?.height ?? 1)
        current?.destroy()
        const texture = this.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: 1 },
            format: CAST_SHADOW_HEIGHT_FORMAT,
            // Maximum pyramid of h (fs_height_max_down): the shadow and horizon
            // marches read a level matched to their step.
            mipLevelCount: Math.floor(Math.log2(Math.max(w, h))) + 1,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'Engine CastShadow Height',
        })
        this.castShadowTexture = texture
        this.castShadowTextureView = texture.createView({ label: 'Engine CastShadow Height View' })
        this.castShadowLevelViews = Array.from({ length: texture.mipLevelCount }, (_, level) => texture.createView({
            baseMipLevel: level, mipLevelCount: 1, label: `Engine CastShadow Height Level ${level}`,
        }))
        return true
    }

    /** Half-resolution occlusion texture, at least width x height. Grows only. */
    private ensureLightOcclusionTexture(width: number, height: number): boolean {
        const current = this.lightOcclusionTexture
        if (current && current.width >= width && current.height >= height) return false
        const w = Math.max(1, Math.ceil(width), current?.width ?? 1)
        const h = Math.max(1, Math.ceil(height), current?.height ?? 1)
        current?.destroy()
        const texture = this.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: LIGHT_OCCLUSION_LAYERS },
            format: LIGHT_OCCLUSION_FORMAT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'Engine LightOcclusion',
        })
        this.lightOcclusionTexture = texture
        this.lightOcclusionTextureView = texture.createView({ dimension: '2d-array', label: 'Engine LightOcclusion View' })
        this.lightOcclusionLayerViews = Array.from({ length: LIGHT_OCCLUSION_LAYERS }, (_, layer) => texture.createView({
            dimension: '2d', baseArrayLayer: layer, arrayLayerCount: 1, label: `Engine LightOcclusion Layer ${layer}`,
        }))
        return true
    }

    /**
     * Cast shadows + horizon occlusion at half resolution for a colour pass of
     * width x height (the height raster must be current). Always re-encoded:
     * it follows the light, and its noise turns with every AA sample.
     */
    private encodeLightOcclusion(encoder: GPUCommandEncoder, width: number, height: number, rotation = false): void {
        const pipeline = rotation ? this.pipelineLightOcclusionRotation : this.pipelineLightOcclusion
        if (!this.lightOcclusionActive || !pipeline || !this.lightOcclusionTextureView || !this.bindGroupColorLightOcclusion) return
        const halfWidth = Math.ceil(width / 2)
        const halfHeight = Math.ceil(height / 2)
        const pass = encoder.beginRenderPass({
            colorAttachments: this.lightOcclusionLayerViews.map((view, layer) => ({
                view,
                clearValue: layer === 0 ? { r: 1, g: 1, b: 0, a: 0 } : { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear' as const,
                storeOp: 'store' as const,
            })),
            label: 'Engine LightOcclusion',
            timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.lightOcclusion),
        })
        pass.setViewport(0, 0, halfWidth, halfHeight, 0, 1)
        pass.setScissorRect(0, 0, halfWidth, halfHeight)
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, this.bindGroupColorLightOcclusion)
        pass.draw(6, 1, 0, 0)
        pass.end()
    }

    /** Height raster (cached) then light occlusion, for one colour raster. */
    private encodeReliefRasters(encoder: GPUCommandEncoder, width: number, height: number, rotation = false): void {
        this.encodeCastShadowHeight(encoder, width, height, rotation)
        this.encodeLightOcclusion(encoder, width, height, rotation)
    }

    /** True when the next colour pass should get a fresh height raster. */
    private castShadowsActive(renderOptions: RenderOptions): boolean {
        return this.castShadowSupported && !!this.pipelineCastHeight
            && ((renderOptions.castShadowStrength ?? 0) > 0 || (renderOptions.horizonOcclusionStrength ?? 0) > 0
                || (renderOptions.indirectLightStrength ?? 0) > 0 || this.tiltViewActive(renderOptions))
    }

    /** Tilted 3D view: needs the height raster, so the same device support. */
    private tiltViewActive(renderOptions: RenderOptions): boolean {
        return this.castShadowSupported && !!this.pipelineCastHeight && !!this.pipelineTiltView
            && normalizeTiltView(this.tiltViewSettings(renderOptions)).tilt > 0
    }

    /** Static 3D view settings plus their animation tracks. */
    private tiltViewSettings(renderOptions: RenderOptions) {
        const animation = normalizeAnimationConfig(renderOptions.animation, renderOptions.animationSpeed)
        const globalSpeed = clamp(animation.globalSpeed, 0, 10)
        const time = renderOptions.activateAnimate ? this.time : 0
        const track = (id: 'tiltViewTilt' | 'tiltViewHeading' | 'tiltViewRelief') => animationContribution(animation.tracks[id], time, globalSpeed)
        return {
            tilt: (renderOptions.tiltViewTilt ?? 0) + track('tiltViewTilt'),
            heading: (renderOptions.tiltViewHeading ?? 0) + 360 * track('tiltViewHeading'),
            relief: (renderOptions.tiltViewRelief ?? 10) + track('tiltViewRelief'),
            interiorDepth: renderOptions.tiltViewInteriorDepth ?? 1,
        }
    }

    private ensureTiltTexture(current: GPUTexture | undefined, width: number, height: number, label: string): GPUTexture {
        if (current && current.width === width && current.height === height) return current
        current?.destroy()
        return this.device.createTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format: 'rgba16float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label,
        })
    }

    /**
     * Encode the tilted view of `source` (linear rgb, sample count in alpha) on
     * a width x height raster whose height raster is current, into `target`.
     */
    /**
     * Jump flooding over the height raster (width x height): each pixel gets
     * its nearest surface pixel, for the interior basin. Returns the seeds.
     */
    private encodeTiltSeeds(encoder: GPUCommandEncoder, width: number, height: number): GPUTexture | undefined {
        if (!this.pipelineTiltSeed || !this.pipelineTiltJump || !this.castShadowTextureView) return undefined
        // The seeds depend only on the height raster: reuse them with it.
        const key = `${this.castHeightKey}#${width}x${height}`
        if (key === this.tiltSeedsKey && this.tiltSeedsResult
            && this.tiltSeedsResult.width === width && this.tiltSeedsResult.height === height) return this.tiltSeedsResult
        for (let i = 0; i < 2; i++) {
            const t = this.tiltSeedTextures[i]
            if (!t || t.width !== width || t.height !== height) {
                t?.destroy()
                this.tiltSeedTextures[i] = this.device.createTexture({
                    size: { width, height, depthOrArrayLayers: 1 },
                    format: 'rg32float',
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: `Engine TiltView Seeds ${i}`,
                })
            }
        }
        const run = (pipeline: GPURenderPipeline, source: GPUTextureView, target: GPUTexture, step: number) => {
            const pass = encoder.beginRenderPass({
                colorAttachments: [{ view: target.createView(), clearValue: { r: -1, g: -1, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }],
                label: 'Engine TiltView Seeds',
            })
            pass.setPipeline(pipeline)
            pass.setBindGroup(0, this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: source }] }))
            pass.draw(3, 1, 0, step)
            pass.end()
        }
        run(this.pipelineTiltSeed, this.castShadowTextureView, this.tiltSeedTextures[0], 0)
        let current = 0
        // Halving steps, then one extra step of 1 (JFA+1) to mend the rare misses.
        const steps: number[] = []
        for (let step = 2 ** Math.ceil(Math.log2(Math.max(width, height))) / 2; step >= 1; step /= 2) steps.push(step)
        steps.push(1)
        for (const step of steps) {
            run(this.pipelineTiltJump, this.tiltSeedTextures[current].createView(), this.tiltSeedTextures[1 - current], step)
            current = 1 - current
        }
        this.tiltSeedsKey = key
        this.tiltSeedsResult = this.tiltSeedTextures[current]
        return this.tiltSeedsResult
    }

    /** A mipmapped width x height texture, reallocated only when the size changes. */
    private ensureTiltMipTexture(current: GPUTexture | undefined, width: number, height: number, format: GPUTextureFormat, label: string): GPUTexture {
        if (current && current.width === width && current.height === height) return current
        current?.destroy()
        return this.device.createTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            mipLevelCount: Math.floor(Math.log2(Math.max(width, height))) + 1,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label,
        })
    }

    /** One full-screen draw of `pipeline` into mip `level` of `target`. */
    private encodeTiltMipPass(encoder: GPUCommandEncoder, pipeline: GPURenderPipeline, target: GPUTexture, level: number, entries: GPUBindGroupEntry[]): void {
        const pass = encoder.beginRenderPass({
            colorAttachments: [{ view: target.createView({ baseMipLevel: level, mipLevelCount: 1 }), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }],
            label: `Engine TiltView Mips ${target.label} ${level}`,
        })
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries }))
        pass.draw(3, 1, 0, 0)
        pass.end()
    }

    private encodeTiltView(encoder: GPUCommandEncoder, source: GPUTextureView, target: GPUTexture, uniform: GPUBuffer, renderOptions: RenderOptions, aspect: number): void {
        if (!this.pipelineTiltView || !this.castShadowTextureView || !this.pipelineTiltMarchHeight
            || !this.pipelineTiltMaxDown || !this.pipelineTiltColorBase || !this.pipelineTiltColorDown) return
        const width = target.width
        const height = target.height
        const settings = normalizeTiltView(this.tiltViewSettings(renderOptions))
        this.device.queue.writeBuffer(uniform, 0, tiltViewUniforms(width, height, aspect, settings).buffer)
        const seeds = this.encodeTiltSeeds(encoder, width, height)
        if (!seeds) return

        // March height + maximum pyramid: follows the height raster (seeds key)
        // and the relief / basin settings, not the camera.
        const marchKey = `${this.tiltSeedsKey}#${settings.relief}#${settings.interiorDepth}`
        const march = this.ensureTiltMipTexture(this.tiltMarchTexture, width, height, 'r16float', 'Engine TiltView March')
        if (march !== this.tiltMarchTexture || marchKey !== this.tiltMarchKey) {
            this.tiltMarchTexture = march
            this.tiltMarchKey = marchKey
            this.encodeTiltMipPass(encoder, this.pipelineTiltMarchHeight, march, 0, [
                { binding: 0, resource: this.castShadowTextureView },
                { binding: 1, resource: seeds.createView() },
                { binding: 2, resource: { buffer: uniform } },
            ])
            for (let level = 1; level < march.mipLevelCount; level++) {
                this.encodeTiltMipPass(encoder, this.pipelineTiltMaxDown, march, level, [
                    { binding: 0, resource: march.createView({ baseMipLevel: level - 1, mipLevelCount: 1 }) },
                ])
            }
        }

        // Colour mips: every frame (the colour follows light and animation).
        const colorMips = this.ensureTiltMipTexture(this.tiltColorMipTexture, width, height, 'rgba16float', 'Engine TiltView Colour')
        this.tiltColorMipTexture = colorMips
        this.encodeTiltMipPass(encoder, this.pipelineTiltColorBase, colorMips, 0, [{ binding: 0, resource: source }])
        for (let level = 1; level < colorMips.mipLevelCount; level++) {
            this.encodeTiltMipPass(encoder, this.pipelineTiltColorDown, colorMips, level, [
                { binding: 0, resource: colorMips.createView({ baseMipLevel: level - 1, mipLevelCount: 1 }) },
                { binding: 3, resource: this.tiltViewSampler! },
            ])
        }

        const bindGroup = this.device.createBindGroup({
            layout: this.pipelineTiltView.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: colorMips.createView() },
                { binding: 1, resource: march.createView() },
                { binding: 2, resource: this.tiltViewSampler! },
                { binding: 3, resource: { buffer: uniform } },
            ],
            label: 'Engine BindGroup TiltView',
        })
        const pass = encoder.beginRenderPass({
            colorAttachments: [{ view: target.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
            label: 'Engine TiltView',
            // End-gap timing: covers the seed and mip passes encoded just before.
            timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.tiltView),
        })
        pass.setPipeline(this.pipelineTiltView)
        pass.setBindGroup(0, bindGroup)
        pass.draw(3, 1, 0, 0)
        pass.end()
    }

    private presentBindGroupFor(texture: GPUTexture): GPUBindGroup {
        return this.device.createBindGroup({
            layout: this.layoutPresent!,
            entries: [{ binding: 0, resource: texture.createView() }],
            label: 'Engine BindGroup Present (tilt)',
        })
    }

    /**
     * Encode the h / T raster for a colour pass of width x height pixels
     * (screen raster, or the neutral square when `rotation`). It must share the
     * colour pass's raster exactly: same vertex shader, same viewport origin.
     */
    private encodeCastShadowHeight(encoder: GPUCommandEncoder, width: number, height: number, rotation = false, reuse = true): void {
        const pipeline = rotation ? this.pipelineCastHeightRotation : this.pipelineCastHeight
        if (!pipeline || !this.castShadowTextureView || !this.bindGroupColorCastHeight) return
        // Everything the raster depends on: raster, field content, palette /
        // bindings, and the non-volatile colour uniforms.
        const closingRadius = this.heightClosingRadius(width, height, rotation)
        const key = [width, height, rotation ? 1 : 0, this.rawFieldVersion, this.resolvedDisplayVersion,
            this.frozenDisplayVersion, this.heightInputsVersion, this.heightPathSignature, this.heightUniformSignature, closingRadius].join('|')
        if (reuse && !this.disableHeightReuse && key === this.castHeightKey) return
        this.castHeightKey = key
        const raw = closingRadius > 0 ? this.ensureHeightClosingTextures() : undefined
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: raw ? raw.createView() : this.castShadowLevelViews[0],
                clearValue: { r: CAST_SHADOW_NO_SURFACE, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
            label: 'Engine CastShadow Height',
            timestampWrites: this.passTimer.writes(PASS_SLOT_INDEX.reliefHeight),
        })
        pass.setViewport(0, 0, width, height, 0, 1)
        pass.setScissorRect(0, 0, width, height)
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, this.bindGroupColorCastHeight)
        pass.draw(6, 1, 0, 0)
        pass.end()
        if (raw) this.encodeHeightClosing(encoder, raw, closingRadius, 1 / this.heightRasterPixelsPerUnit(width, height, rotation))
        this.encodeCastShadowMaxPyramid(encoder)
    }

    /**
     * Closing radius r in raster pixels: reliefClosing is in view half-heights
     * (the screen raster spans 2 of them vertically, the neutral rotation
     * square 2·sqrt(aspect² + 1)). Capped at 16 pixels (the taps span 2r).
     */
    private heightClosingRadius(width: number, height: number, rotation: boolean): number {
        if (this.reliefClosing <= 0 || !this.pipelineHeightErodeFinal) return 0
        return Math.min(16, Math.round(this.reliefClosing * this.heightRasterPixelsPerUnit(width, height, rotation)))
    }

    private heightRasterPixelsPerUnit(width: number, height: number, rotation: boolean): number {
        const aspect = this.width / Math.max(this.height, 1)
        return rotation ? width / (2 * Math.sqrt(aspect * aspect + 1)) : height / 2
    }

    /** Raw height raster and two r32float temporaries, the size of the height raster. */
    private ensureHeightClosingTextures(): GPUTexture {
        const { width, height } = this.castShadowTexture!
        const fits = (t?: GPUTexture) => t && t.width === width && t.height === height
        if (!fits(this.heightRawTexture)) {
            this.heightRawTexture?.destroy()
            this.heightRawTexture = this.device.createTexture({
                size: { width, height }, format: CAST_SHADOW_HEIGHT_FORMAT,
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, label: 'Engine Height Raw',
            })
        }
        if (!this.heightClosingTemps.every(fits) || this.heightClosingTemps.length !== 2) {
            this.heightClosingTemps.forEach(t => t.destroy())
            this.heightClosingTemps = [0, 1].map(i => this.device.createTexture({
                size: { width, height }, format: 'r32float',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, label: `Engine Height Closing ${i}`,
            }))
        }
        return this.heightRawTexture!
    }

    /**
     * raw → max x → max y → min x → min y (+ holes, albedo) into height level 0.
     * Parabola c·d² rising by one radius of view units over one radius
     * (h is in view half-heights, `unitsPerPixel` per raster pixel): the
     * bridges it builds slope by at most 2 at their rim; taps span 2r, where
     * the penalty is already 4 radii.
     */
    private encodeHeightClosing(encoder: GPUCommandEncoder, raw: GPUTexture, radius: number, unitsPerPixel: number): void {
        const [a, b] = this.heightClosingTemps
        const curvature = unitsPerPixel / radius
        for (const [axis, buffer] of this.heightClosingUniforms.entries()) {
            const data = new ArrayBuffer(16)
            new Int32Array(data, 0, 2).set([2 * radius, axis])
            new Float32Array(data, 8, 1)[0] = curvature
            this.device.queue.writeBuffer(buffer, 0, data)
        }
        const steps: [GPURenderPipeline, GPUTexture, GPUTextureView, number][] = [
            [this.pipelineHeightDilate!, raw, a.createView(), 0],
            [this.pipelineHeightDilate!, a, b.createView(), 1],
            [this.pipelineHeightErode!, b, a.createView(), 0],
            [this.pipelineHeightErodeFinal!, a, this.castShadowLevelViews[0], 1],
        ]
        for (const [pipeline, source, target, axis] of steps) {
            const pass = encoder.beginRenderPass({
                colorAttachments: [{ view: target, clearValue: { r: CAST_SHADOW_NO_SURFACE, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
                label: `Engine Height Closing (axis ${axis})`,
            })
            pass.setPipeline(pipeline)
            const entries: GPUBindGroupEntry[] = [
                { binding: 0, resource: source.createView() },
                { binding: 1, resource: { buffer: this.heightClosingUniforms[axis] } },
            ]
            if (pipeline === this.pipelineHeightErodeFinal) entries.push({ binding: 2, resource: raw.createView() })
            pass.setBindGroup(0, this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries }))
            pass.draw(3, 1, 0, 0)
            pass.end()
        }
    }

    /** Maximum pyramid of the height raster, rebuilt with it (whole texture: the clear covers it all). */
    private encodeCastShadowMaxPyramid(encoder: GPUCommandEncoder): void {
        const pipeline = this.pipelineCastHeightMaxDown
        if (!pipeline) return
        for (let level = 1; level < this.castShadowLevelViews.length; level++) {
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: this.castShadowLevelViews[level],
                    clearValue: { r: CAST_SHADOW_NO_SURFACE, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
                label: `Engine CastShadow Height Max ${level}`,
            })
            pass.setPipeline(pipeline)
            pass.setBindGroup(0, this.device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: this.castShadowLevelViews[level - 1] }],
            }))
            pass.draw(3, 1, 0, 0)
            pass.end()
        }
    }

    /**
     * Make sure the height raster covers a colour pass of this size before the
     * colour bind group is used; returns the (possibly rebuilt) group.
     */
    prepareCastShadowRaster(width: number, height: number): GPUBindGroup {
        if (this.castShadowSupported) {
            const grewHeight = this.ensureCastShadowTexture(width, height)
            const grewOcclusion = this.ensureLightOcclusionTexture(Math.ceil(width / 2), Math.ceil(height / 2))
            if (grewHeight || grewOcclusion) this.rebuildColorBindGroup()
        }
        return this.bindGroupColor!
    }

    private rebuildColorBindGroup() {
        this.heightInputsVersion++
        const liveDisplay = this.tiled ? this.tiledLiveDisplay : this.resolvedDisplay
        if (this.pipelineColor && liveDisplay && this.frozenDisplay && this.rawArrayView) {
            const layout = this.pipelineColor.getBindGroupLayout(0)
            const entries: GPUBindGroupEntry[] = [
                { binding: 0, resource: { buffer: this.uniformBufferColor! } },
                { binding: 1, resource: liveDisplay.valuesArrayView },
                { binding: 2, resource: this.palettePathGpu?.tile.createView({ dimension: '2d-array' }) ?? this.presetTransition?.tileLayers?.createView({ dimension: '2d-array' }) ?? this.tileTextureView! },
                { binding: 3, resource: this.palettePathGpu?.sky.createView({ dimension: '2d-array' }) ?? this.presetTransition?.skyLayers?.createView({ dimension: '2d-array' }) ?? this.skyboxTextureView! },
                { binding: 4, resource: this.webcamTextureView! },
                { binding: 5, resource: this.palettePathGpu?.palettes.createView({ dimension: '2d-array' }) ?? this.paletteTextureView! },
                { binding: 6, resource: this.frozenDisplay.valuesArrayView },
                { binding: 7, resource: this.paletteSampler! },
                { binding: 8, resource: this.skyboxSampler! },
                { binding: 9, resource: this.aaTargetTextureView! },
                { binding: 10, resource: liveDisplay.geometryView },
                { binding: 11, resource: this.frozenDisplay.geometryView },
                { binding: 12, resource: liveDisplay.metadataView },
                { binding: 13, resource: this.frozenDisplay.metadataView },
                { binding: 14, resource: this.rawArrayView },
                { binding: 15, resource: liveDisplay.orbitGradientView ?? this.orbitGradientDummyView! },
                { binding: 16, resource: this.frozenDisplay.orbitGradientView ?? this.orbitGradientDummyView! },
                { binding: 17, resource: liveDisplay.trapPayloadView ?? this.trapPayloadDummyView! },
                { binding: 18, resource: this.frozenDisplay.trapPayloadView ?? this.trapPayloadDummyView! },
                { binding: 19, resource: { buffer: this.palettePathGpu?.buffer ?? this.palettePathDummy! } },
                { binding: 20, resource: this.tileSampler! },
            ]
            if (this.castShadowSupported) {
                this.ensureCastShadowTexture(1, 1)
                this.castShadowDummyView ??= this.device.createTexture({
                    size: { width: 1, height: 1, depthOrArrayLayers: 1 },
                    format: CAST_SHADOW_HEIGHT_FORMAT,
                    usage: GPUTextureUsage.TEXTURE_BINDING,
                    label: 'Engine CastShadow Dummy',
                }).createView()
                this.ensureLightOcclusionTexture(1, 1)
                this.lightOcclusionDummyView ??= this.device.createTexture({
                    size: { width: 1, height: 1, depthOrArrayLayers: LIGHT_OCCLUSION_LAYERS },
                    format: LIGHT_OCCLUSION_FORMAT,
                    usage: GPUTextureUsage.TEXTURE_BINDING,
                    label: 'Engine LightOcclusion Dummy',
                }).createView({ dimension: '2d-array' })
                // A pass never binds the raster it renders into: the height
                // pass gets a stand-in at 21, the occlusion pass one at 22.
                this.bindGroupColorCastHeight = this.device.createBindGroup({
                    layout,
                    entries: [...entries,
                        { binding: 21, resource: this.castShadowDummyView },
                        { binding: 22, resource: this.lightOcclusionTextureView! }],
                    label: 'Engine BindGroup Color (cast height)',
                })
                this.bindGroupColorLightOcclusion = this.device.createBindGroup({
                    layout,
                    entries: [...entries,
                        { binding: 21, resource: this.castShadowTextureView! },
                        { binding: 22, resource: this.lightOcclusionDummyView }],
                    label: 'Engine BindGroup Color (light occlusion)',
                })
                entries.push({ binding: 21, resource: this.castShadowTextureView! })
                entries.push({ binding: 22, resource: this.lightOcclusionTextureView! })
            }
            this.bindGroupColor = this.device.createBindGroup({
                layout,
                entries,
                label: 'Engine BindGroup Color',
            })
        }
    }

    // Méthode utilitaire pour charger une image et la convertir en GPUTexture
    private async _loadTexture(url: string, withMips = false, maxDimension = Infinity): Promise<GPUTexture> {
        const img = new Image()
        img.src = url
        try {
            await img.decode()
        } catch (e) {
            console.warn('Échec du chargement de la texture : ' + url, e)
            throw e
        }
        const ratio = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
        const bitmap = await createImageBitmap(img, { premultiplyAlpha: 'none', resizeWidth: Math.max(1, Math.round(img.naturalWidth * ratio)), resizeHeight: Math.max(1, Math.round(img.naturalHeight * ratio)) })
        const texture = this.device.createTexture({
            size: [bitmap.width, bitmap.height, 1],
            format: 'rgba8unorm',
            mipLevelCount: withMips ? mipLevelCountFor(bitmap.width, bitmap.height) : 1,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine LoadedTexture ' + url,
        })
        this.device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: texture },
            [bitmap.width, bitmap.height]
        )
        bitmap.close()
        if (withMips) generateMipmaps(this.device, texture)
        return texture
    }

    // ── Readback d'un pixel depuis le display set typé ───────────────

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
    ): Promise<{
        iter: number
        zx: number
        zy: number
        derX: number
        derY: number
        gradientX: number
        gradientY: number
        curvature: number
        metadata: number
    } | null> {
        if (!this.resolvedDisplay || !this.device || this.resolvedDisplayVersion < 0) return null

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

        // Three scalar value layers, one rgba16 geometry texel and one uint
        // metadata word are copied into independently aligned rows.
        const align256 = (n: number) => ((n + 255) & ~255)
        const bytesPerRow = align256(8)
        const fieldCount = 5
        const totalBytes = bytesPerRow * fieldCount

        const readBuffer = this.device.createBuffer({
            size: totalBytes,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: 'Engine IterPixel Readback',
        })

        const encoder = this.device.createCommandEncoder()
        for (let layer = 0; layer < DISPLAY_VALUE_LAYERS; layer++) {
            encoder.copyTextureToBuffer(
                {
                    texture: this.resolvedDisplay.valuesTexture,
                    origin: { x: texelX, y: texelY, z: layer },
                },
                {
                    buffer: readBuffer,
                    offset: bytesPerRow * layer,
                    bytesPerRow,
                },
                { width: 1, height: 1, depthOrArrayLayers: 1 },
            )
        }
        encoder.copyTextureToBuffer(
            { texture: this.resolvedDisplay.geometryTexture, origin: { x: texelX, y: texelY } },
            { buffer: readBuffer, offset: bytesPerRow * 3, bytesPerRow },
            { width: 1, height: 1 },
        )
        encoder.copyTextureToBuffer(
            { texture: this.resolvedDisplay.metadataTexture, origin: { x: texelX, y: texelY } },
            { buffer: readBuffer, offset: bytesPerRow * 4, bytesPerRow },
            { width: 1, height: 1 },
        )
        this.device.queue.submit([encoder.finish()])

        await readBuffer.mapAsync(GPUMapMode.READ)
        const mappedRange = readBuffer.getMappedRange()
        const floats = new Float32Array(mappedRange)
        const halves = new Uint16Array(mappedRange)
        const words = new Uint32Array(mappedRange)
        const floatStride = bytesPerRow / 4
        const halfStride = bytesPerRow / 2
        const iter = floats[0]
        const zx = floats[floatStride]
        const zy = floats[2 * floatStride]
        const geometryOffset = 3 * halfStride
        const gradientX = float16ToFloat32(halves[geometryOffset])
        const gradientY = float16ToFloat32(halves[geometryOffset + 1])
        const curvature = float16ToFloat32(halves[geometryOffset + 2])
        const distanceHeight = float16ToFloat32(halves[geometryOffset + 3])
        const metadata = words[(4 * bytesPerRow) / 4] >>> 0
        readBuffer.unmap()
        readBuffer.destroy()

        // Pixel sentinelle ou non calculé
        if (iter < 0) return null

        const gradientAngle = Math.hypot(gradientX, gradientY) > 1e-8
            ? Math.atan2(gradientY, gradientX)
            : 0
        return {
            iter,
            zx,
            zy,
            derX: distanceHeight,
            derY: gradientAngle,
            gradientX,
            gradientY,
            curvature,
            metadata,
        }
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
