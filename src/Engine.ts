// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import mandelbrotShader from './assets/mandelbrot.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import brushShader from './assets/reproject.wgsl?raw'
import resolveShader from './assets/resolve.wgsl?raw'
import countShader from './assets/count_unfinished.wgsl?raw'
import {MandelbrotNavigator} from 'mandelbrot'
import {memory as wasmMemory} from 'mandelbrot/mandelbrot_bg.wasm'
import {WebcamTexture} from './WebcamTexture'
import {Palette} from './Palette.ts'
import type {ColorStop} from './ColorStop.ts'
import type {InterpolationMode} from './Mandelbrot.ts'
import goldUrl from './assets/gold.jpg'
import bronzeUrl from './assets/bronze.webp'
// ── Constants ────────────────────────────────────────────────────────

// Number of r32float layers per texture array.
const LAYER_COUNT = 7

// Progressive refinement start step for the sentinel grid; must be a power-of-two.
const SENTINEL_SEED_STEP_POW2 = 2048

// During zoom reprojection the frozen snapshot covers visual gaps, so we
// use a much smaller grid for faster fill.  Must be a power-of-two.
const ZOOM_SENTINEL_SEED_STEP = 64

// Minimum brush refinement step during zoom.  The sentinel grid will not
// subdivide below this value while zooming, avoiding wasted GPU work on
// pixels that will be rescaled away.  Must be a power-of-two.
const ZOOM_MIN_BRUSH_STEP = 1

// After zoom ends, the first recompute frame uses this step instead of
// the full progressive grid — avoids overlaying coarser data on the
// already-refined image while still being fast.  Must be a power-of-two.
const POST_ZOOM_SEED_STEP = 2048

// Number of consecutive no-scale-change frames before we consider the zoom
// truly stopped.  Wheel events often have 1-2 frame gaps between ticks.
const ZOOM_IDLE_GRACE_FRAMES = 0

// Adaptive iteration batch sizing — the batch auto-adjusts each frame
// to target TARGET_FRAME_MS of GPU time.
const MIN_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 10_000

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

// Orbit chunking: compute reference orbit incrementally to avoid blocking.
// Each frame computes at most this many iterations of arbitrary-precision
// math, then yields so the browser stays responsive.
const ORBIT_CHUNK_SIZE = 100

function floorPowerOfTwo(value: number): number {
    const v = Math.max(1, Math.floor(value))
    return 2 ** Math.floor(Math.log2(v))
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
    colorStops: ColorStop[],
    interpolationMode: InterpolationMode,
    activateAnimate: boolean,
    tessellationLevel: number,
    displacementAmount: number,
    animationSpeed: number,
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
    rawTexture?: GPUTexture // texture "neutre" (A) — 7-layer r32float array
    rawArrayView?: GPUTextureView // full 2d-array view for sampling
    rawLayerViews: GPUTextureView[] = [] // per-layer 2d views for MRT
    rawBrushTexture?: GPUTexture // texture "neutre" intermédiaire (B) — 7-layer r32float array
    rawBrushArrayView?: GPUTextureView // full 2d-array view for sampling
    rawBrushLayerViews: GPUTextureView[] = [] // per-layer 2d views for MRT
    resolvedTexture?: GPUTexture // texture neutre sans sentinelles visibles — 7-layer r32float array
    resolvedArrayView?: GPUTextureView // full 2d-array view for sampling
    resolvedLayerViews: GPUTextureView[] = [] // per-layer 2d views for MRT
    frozenTexture?: GPUTexture // frozen snapshot of resolved texture for zoom reprojection
    frozenArrayView?: GPUTextureView // full 2d-array view for sampling the frozen snapshot

    // buffers
    uniformBufferMandelbrot?: GPUBuffer // passe Mandelbrot (calc -1)
    uniformBufferColor?: GPUBuffer // passe color (écran)
    uniformBufferBrush?: GPUBuffer // passe pinceau (sentinelles)
    uniformBufferResolve?: GPUBuffer // passe resolve (sentinel snapping)
    mandelbrotReferenceBuffer?: GPUBuffer // storage buffer contenant l'orbite

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
    private counterReadBuffer?: GPUBuffer
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
    needRender = true
    /** Whether the reference orbit is still being computed incrementally. */
    orbitIncomplete = false
    /** guardedMaxIter from the previous frame (for detecting orbit growth). */
    prevGuardedMaxIter = 0
    /** Current guardedMaxIter — shared between prepareFrame and render. */
    currentGuardedMaxIter = 0
    /** Target maxIterations for the current frame. */
    currentMaxIterations = 0
    mandelbrotReference = new Float32Array(1000000)

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
    /** Target zoom for the current cycle: zoomMagnificationThreshold for zoom-in,
     *  1/zoomMagnificationThreshold for zoom-out, or 1.0 when idle. */
    private zoomTarget = 1.0
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
    /** True when zoom direction is "in" (scale decreasing). */
    private zoomingIn = true
    /** Number of consecutive frames with no scale change while zoom is active.
     *  Used as a grace period before deactivating zoom reprojection, because
     *  wheel events can have gaps of 1-2 frames between ticks. */
    private zoomIdleFrames = 0
    /** Set to true for one frame after zoom reprojection ends, so the
     *  post-zoom recompute uses POST_ZOOM_SEED_STEP instead of the full progressive grid. */
    private postZoomFullRecompute = false

    // Progressive iteration state – adaptive batch sizing
    private iterationBatchSize = MIN_BATCH_SIZE

    // textures additionnelles
    tileTexture?: GPUTexture
    tileTextureView?: GPUTextureView
    skyboxTexture?: GPUTexture
    skyboxTextureView?: GPUTextureView
    paletteTexture?: GPUTexture
    paletteTextureView?: GPUTextureView
    paletteSampler?: GPUSampler

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

    async initialize(mandelbrotNavigator: MandelbrotNavigator): Promise<void> {
        this.mandelbrotNavigator = mandelbrotNavigator
        if (!navigator.gpu) throw new Error('WebGPU non supporté')
        this.adapter = await navigator.gpu.requestAdapter()
        if (!this.adapter) throw new Error('Adapter WebGPU introuvable')
        this.device = await this.adapter.requestDevice()
        this.device.label = 'Engine Device'
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
                : this._loadTexture(goldUrl),
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
            size: 4 * 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Mandelbrot',
        })
        this.uniformBufferColor = this.device.createBuffer({
            size: 4 * 16, // 13 floats padded to 16-byte alignment (64 bytes)
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

        // Counter buffers for GPU pixel-completion readback (2 × u32: total unfinished + active)
        this.counterBuffer = this.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'Engine Counter Storage',
        })
        this.counterReadBuffer = this.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: 'Engine Counter Readback',
        })
        this.uniformBufferCount = this.device.createBuffer({
            size: 4 * 4, // 3 floats (mu, aspect, angle) padded to 16-byte alignment
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Count',
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
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
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

        // bind groups seront (ré)créés dans resize car dépend des textures
        this.bindGroupBrush = undefined
        this.bindGroupMandelbrot = undefined
        this.bindGroupResolve = undefined
        this.bindGroupColor = undefined
        this.counterBindGroup = undefined
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

        // Helper: create a 7-layer r32float texture array + per-layer 2d views + full 2d-array view
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
        // frozenTexture doesn't need per-layer views (never used as MRT target)

        // Reset zoom reprojection state on resize
        this.zoomReprojectionActive = false
        this.zoomFactor = 1.0
        this.zoomTarget = 1.0
        this.liveZoomFactor = 1.0
        this.frozenScale = 0
        this.liveScale = 0
        this.zoomIdleFrames = 0

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
            const layout = this.pipelineMandelbrot.getBindGroupLayout(0)
            this.bindGroupMandelbrot = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBufferMandelbrot! } },
                    { binding: 1, resource: { buffer: this.mandelbrotReferenceBuffer! } },
                    { binding: 2, resource: this.rawBrushArrayView! },
                ],
                label: 'Engine BindGroup Mandelbrot',
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

        this.prevFrameMandelbrot = undefined // plus de frame précédente après resize
        this.previousMandelbrot = undefined  // force update() to re-write all uniforms
        this.previousRenderOptions = undefined
        this.needRender = true
        this.unfinishedPixelCount = -1 // reset: not yet known after resize
        this.activePixelCount = -1
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

    async update(mandelbrot: Mandelbrot, renderOptions: RenderOptions) {
        // Calcul du temps écoulé depuis la dernière frame
        const now = performance.now()
        if (this.lastUpdateTime === 0) {
            this.lastUpdateTime = now
        }
        const delta = (now - this.lastUpdateTime) / 1000 // en secondes
        this.time += delta
        this.lastUpdateTime = now

        this.needRender = this.needRender || !(this.areObjectsEqual(mandelbrot, this.previousMandelbrot)
            && this.areObjectsEqual(renderOptions, this.previousRenderOptions))
        // if (!this.needsMoreFrames()) {
        //     this.unfinishedPixelCount = -1 // unknown — new params, GPU counter not read yet
        // }

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

        // ── Zoom reprojection state update (before uniform write) ─────
        // Detect scale changes and manage the zoom reprojection cycle.
        // During a cycle, the live texture is computed at a fixed `liveScale`
        // while the display zoom interpolates from frozenScale towards liveScale.
        // The color shader rescales both textures to match the current display.
        {
            const scaleChanged = this.prevFrameMandelbrot
                && this.prevFrameMandelbrot.scale !== mandelbrot.scale

            if (scaleChanged && !this.zoomReprojectionActive) {
                // Start a new zoom reprojection cycle.
                this.zoomReprojectionActive = true
                this.frozenScale = this.prevFrameMandelbrot!.scale
                this.zoomingIn = mandelbrot.scale < this.frozenScale
                // Compute target live scale: one threshold step ahead
                this.liveScale = this.zoomingIn
                    ? this.frozenScale / this.zoomMagnificationThreshold
                    : this.frozenScale * this.zoomMagnificationThreshold
                this.needFreezeSnapshot = true
                this.clearHistoryNextFrame = true
                this.zoomIdleFrames = 0
            }

            // Reset idle counter whenever scale changes during an active cycle
            if (scaleChanged && this.zoomReprojectionActive) {
                this.zoomIdleFrames = 0
            }

            // Update zoom factors during an active cycle
            if (this.zoomReprojectionActive && this.frozenScale > 0) {
                this.zoomFactor = this.frozenScale / mandelbrot.scale
                this.liveZoomFactor = this.liveScale / mandelbrot.scale
                this.zoomTarget = this.zoomingIn
                    ? this.zoomMagnificationThreshold
                    : 1.0 / this.zoomMagnificationThreshold

                // Check if we've reached the swap threshold.
                // zoomFactor = frozenScale / displayScale.
                // For zoom-in:  displayScale decreases → zoomFactor rises from ~1 to threshold.
                // For zoom-out: displayScale increases → zoomFactor drops from ~1 to 1/threshold.
                const shouldSwap = this.zoomingIn
                    ? this.zoomFactor >= this.zoomMagnificationThreshold
                    : this.zoomFactor <= 1.0 / this.zoomMagnificationThreshold

                if (shouldSwap) {
                    // Swap: the live texture becomes the new frozen snapshot,
                    // start a new cycle at the next threshold step.
                    // Use mandelbrot.scale (current display) — NOT frozenScale —
                    // to compute the next liveScale, so the new cycle starts
                    // from where the user actually is. This prevents swap
                    // cascades when zoom speed overshoots liveScale.
                    this.needFreezeSnapshot = true
                    this.clearHistoryNextFrame = true
                    this.frozenScale = this.liveScale
                    this.liveScale = this.zoomingIn
                        ? mandelbrot.scale / this.zoomMagnificationThreshold
                        : mandelbrot.scale * this.zoomMagnificationThreshold
                    this.zoomFactor = this.frozenScale / mandelbrot.scale
                    this.liveZoomFactor = this.liveScale / mandelbrot.scale
                    this.zoomIdleFrames = 0
                }
            } else if (!this.zoomReprojectionActive) {
                this.zoomFactor = 1.0
                this.zoomTarget = 1.0
                this.liveZoomFactor = 1.0
            }

            // If zoom has stopped (no scale change for several consecutive frames),
            // deactivate and recompute at the actual display scale.
            // We use a grace period because wheel events often have 1-2 frame gaps.
            if (this.zoomReprojectionActive && !scaleChanged
                && this.prevFrameMandelbrot
                && this.prevFrameMandelbrot.scale === mandelbrot.scale) {
                this.zoomIdleFrames++
                if (this.zoomIdleFrames >= ZOOM_IDLE_GRACE_FRAMES) {
                    this.zoomReprojectionActive = false
                    this.zoomFactor = 1.0
                    this.zoomTarget = 1.0
                    this.liveZoomFactor = 1.0
                    this.liveScale = 0
                    this.zoomIdleFrames = 0
                    this.clearHistoryNextFrame = true
                    this.postZoomFullRecompute = true
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
            this.zoomTarget,                // 9: zoomTarget
            this.liveZoomFactor,            // 10: liveZoomFactor
            // Frozen shift derived from the live texture's actual cumulative
            // shift (in rounded texels at liveScale), rescaled to frozen UV.
            // This ensures the frozen texture follows the exact same pan drift
            // as the live texture, without independent accumulation errors.
            (this.zoomReprojectionActive && this.frozenScale > 0)
                ? this.cumulativeShiftX * (this.liveScale / this.frozenScale) / this.neutralSize
                : 0,                        // 11: frozenShiftU
            (this.zoomReprojectionActive && this.frozenScale > 0)
                ? -this.cumulativeShiftY * (this.liveScale / this.frozenScale) / this.neutralSize
                : 0,                        // 12: frozenShiftV
            renderOptions.tessellationLevel, // 13: tessellationLevel
            renderOptions.displacementAmount, // 14: displacementAmount
            renderOptions.animationSpeed,   // 15: animationSpeed
        ])
        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, colorShaderData.buffer)

        if (!this.needsMoreFrames()) {
            return
        }

        const maxIterations = Math.ceil(mandelbrot.maxIterations)
        this.currentMaxIterations = maxIterations

        // Compute one chunk of the reference orbit (bounded CPU work per frame).
        // The WASM side resumes from where it left off; re-anchoring is handled
        // internally when the view centre drifts too far from the reference.
        const prtInfo = this.mandelbrotNavigator.compute_reference_orbit_chunk(
            ORBIT_CHUNK_SIZE,
            maxIterations,
        )
        const availableIter = prtInfo.count
        const buffer = new Float32Array(wasmMemory.buffer, prtInfo.ptr, prtInfo.count * 4) // 4 floats par MandelbrotStep

        if (prtInfo.offset < maxIterations) {
            this.device.queue.writeBuffer(
                this.mandelbrotReferenceBuffer!,
                0,
                buffer,
                0
            )
        }

        // Guard the shader: globalMaxIter must never exceed the orbit steps
        // we have actually computed, or the shader would read uninitialised memory.
        const guardedMaxIter = Math.min(maxIterations, availableIter)
        this.currentGuardedMaxIter = guardedMaxIter

        // Track whether the orbit is still being built (used by needsMoreFrames).
        this.orbitIncomplete = availableIter < maxIterations
        const orbitComplete = availableIter >= maxIterations

        // Re-write the mandelbrot uniform with the guarded globalMaxIter.
        // During zoom reprojection, override scale with liveScale so the GPU
        // computes at the fixed target scale for this cycle.
        const computeScale = (this.zoomReprojectionActive && this.liveScale > 0)
            ? this.liveScale
            : mandelbrot.scale
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
        ])
        this.device.queue.writeBuffer(this.uniformBufferMandelbrot!, 0, mandelbrotShaderUniformDataGuarded.buffer)

        // When the navigator re-anchors its reference orbit, `dx/dy` jump back to ~0.
        // Reprojecting history across that discontinuity would be nonsense, so we clear.
        const orbitWasReset = prtInfo.offset === 0 && !!this.prevFrameMandelbrot

        // clearHistoryNextFrame may already be true from the zoom reprojection
        // block above. These additional checks handle non-zoom resets.
        if (!this.prevFrameMandelbrot || orbitWasReset) {
            this.clearHistoryNextFrame = true
            // Hard reset: also kill any active zoom reprojection cycle
            this.zoomReprojectionActive = false
            this.zoomFactor = 1.0
            this.zoomTarget = 1.0
            this.liveZoomFactor = 1.0
            this.liveScale = 0
            this.zoomIdleFrames = 0
        }
        if (this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== mandelbrot.mu) {
            this.clearHistoryNextFrame = true
            this.zoomReprojectionActive = false
            this.zoomFactor = 1.0
            this.zoomTarget = 1.0
            this.liveZoomFactor = 1.0
            this.liveScale = 0
            this.zoomIdleFrames = 0
        }

        // When the orbit just became complete, clear history once so that
        // pixels which were stored as budget-exhausted continuations (during
        // orbit building) get a fresh recompute with the full orbit available.
        // During an active zoom reprojection cycle, skip this: maxIterations
        // grows every frame with scale, so the condition fires perpetually.
        // The ZOOM_STOP clear will trigger a full recompute when zoom ends.
        if (!this.zoomReprojectionActive
            && orbitComplete && this.prevGuardedMaxIter < maxIterations && this.prevGuardedMaxIter > 0) {
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
        // During zoom reprojection the frozen snapshot covers visual gaps,
        // so use a small step (ZOOM_SENTINEL_SEED_STEP) for fast live-texture
        // fill without going all the way to step=1 (which would skip refinement).
        // When zoom just ended (postZoomFullRecompute), use POST_ZOOM_SEED_STEP
        // so we don't overlay a coarser progressive grid on the already-refined image.
        let seedStep: number
        if (this.postZoomFullRecompute) {
            seedStep = POST_ZOOM_SEED_STEP
            this.postZoomFullRecompute = false
        } else if (this.zoomReprojectionActive) {
            seedStep = ZOOM_SENTINEL_SEED_STEP
        } else {
            seedStep = floorPowerOfTwo(SENTINEL_SEED_STEP_POW2)
        }
        const baseSentinel = seedStep
        const clearFlag = this.clearHistoryNextFrame ? 1 : 0

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

        // Accumulate cumulative texel shift for sentinel grid alignment.
        // We accumulate the *rounded* shift (what the shader actually applies)
        // to avoid drift between the JS cumulative total and the GPU reality.
        if (this.clearHistoryNextFrame) {
            this.cumulativeShiftX = 0
            this.cumulativeShiftY = 0
        } else {
            this.cumulativeShiftX += Math.round(shiftTexX)
            this.cumulativeShiftY += Math.round(shiftTexY)
        }

        // Grid offset passed to the shader: cumulative shift mod baseSentinel,
        // using WGSL-friendly positive modular arithmetic.
        const gridOffsetX = ((this.cumulativeShiftX % baseSentinel) + baseSentinel) % baseSentinel
        const gridOffsetY = ((this.cumulativeShiftY % baseSentinel) + baseSentinel) % baseSentinel

        // Adaptive refinement gating: pause sentinel halving only when the
        // batch controller is already at its minimum AND there are too many
        // active pixels (those mandelbrot.wgsl actually processes).  This
        // prevents pixel-count avalanches while guaranteeing convergence:
        // if the batch has room to shrink, the gate stays open and the batch
        // controller absorbs the ×4 spike.  A structurally slow GPU (high DPR)
        // will stabilise its batch above MIN, so refinement always proceeds.
        const gateOpen =
            this.clearHistoryNextFrame
            || this.activePixelCount < 0
            || this.iterationBatchSize > MIN_BATCH_SIZE
            || this.activePixelCount < ACTIVE_PIXEL_GATE_THRESHOLD * this.gpuLoadMultiplier

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

        const commandEncoder = this.device.createCommandEncoder()

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
        }

        // Helper: build 7 MRT color attachments from per-layer views
        const makeMrtAttachments = (layerViews: GPUTextureView[]): GPURenderPassColorAttachment[] =>
            layerViews.map(view => ({
                view,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear' as GPULoadOp,
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

        // Pass 1: Mandelbrot (B -> A), calcule uniquement les pixels == -1
        // When globalMaxIter = 0 (no orbit data), the shader acts as a pure
        // pass-through (sentinels stay as-is) — see mandelbrot.wgsl.
        const rpassMandelbrot = commandEncoder.beginRenderPass({
            colorAttachments: makeMrtAttachments(this.rawLayerViews),
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
            && this.counterReadBuffer
            && this.uniformBufferCount
        ) {
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
            commandEncoder.copyBufferToBuffer(this.counterBuffer, 0, this.counterReadBuffer, 0, 8)
        }

        // Pass 2: resolve des sentinelles (A -> resolved)
        const rpassResolve = commandEncoder.beginRenderPass({
            colorAttachments: makeMrtAttachments(this.resolvedLayerViews),
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

        // Adaptive batch sizing: measure GPU completion time and adjust.
        // Also read back the unfinished pixel count asynchronously.
        await this.device.queue.onSubmittedWorkDone()
            const elapsed = performance.now() - submitStartMs
            this.gpuFrameTimeMs = elapsed

            // Update smoothed GPU time (EMA) for refinement gating.
            if (this.smoothedGpuTimeMs === 0) {
                this.smoothedGpuTimeMs = elapsed // seed on first frame
            } else {
                this.smoothedGpuTimeMs =
                    this.smoothedGpuTimeMs * (1 - GPU_TIME_EMA_ALPHA)
                    + elapsed * GPU_TIME_EMA_ALPHA
            }

            if (elapsed > 0) {
                // Scale batch size proportionally: if frame took 32ms with batch=100,
                // target 16ms -> new batch ≈ 100 * 16/32 = 50.
                // Use exponential smoothing (alpha=0.3) to avoid oscillation.
                const ratio = (1000 / this.targetFps) / elapsed
                const ideal = this.iterationBatchSize * ratio
                this.iterationBatchSize = Math.round(
                    Math.min(MAX_BATCH_SIZE,
                        Math.max(MIN_BATCH_SIZE,
                            this.iterationBatchSize * 0.7 + ideal * 0.3
                        )
                    )
                )
            }

        await this.counterReadBuffer!.mapAsync(GPUMapMode.READ)
        const data = new Uint32Array(this.counterReadBuffer!.getMappedRange())
        this.unfinishedPixelCount = data[0]
        this.activePixelCount = data[1]
        this.counterReadBuffer!.unmap()

        // Reset the clear flag now that it has been consumed by the GPU passes.
        this.clearHistoryNextFrame = false

        // marque mise à jour des paramètres frame précédente pour prochaine frame
        this.prevFrameMandelbrot = { ...this.previousMandelbrot }

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
        this.rawTexture?.destroy?.()
        this.rawBrushTexture?.destroy?.()
        this.resolvedTexture?.destroy?.()
        this.frozenTexture?.destroy?.()
        this.mandelbrotReferenceBuffer?.destroy?.()
        this.uniformBufferMandelbrot?.destroy?.()
        this.uniformBufferColor?.destroy?.()
        this.uniformBufferBrush?.destroy?.()
        this.uniformBufferResolve?.destroy?.()
        this.counterBuffer?.destroy?.()
        this.counterReadBuffer?.destroy?.()
        this.uniformBufferCount?.destroy?.()
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
    async updateTileTexture(url: string): Promise<void> {
        const newTexture = await this._loadTexture(url)
        this.tileTexture?.destroy?.()
        this.tileTexture = newTexture
        this.tileTextureView = this.tileTexture.createView()
        // Rebuild the color bind group so it references the new texture view
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
                ],
                label: 'Engine BindGroup Color',
            })
        }
        this.needRender = true
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
    // lit les couches 0 (iter), 2 (zx), 3 (zy), 4 (der_x), 5 (der_y)
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
        await this.webcamTexture?.openWebcam()
        await this.webcamTexture?.drawWebGPUTexture(this.webcamTileTexture!, this.device)
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

