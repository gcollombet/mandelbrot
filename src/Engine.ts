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
import coloredTilesUrl from './assets/colored_tiles.jpg'
import goldUrl from './assets/gold.jpg'

// Progressive refinement settings.
// Start step for the sentinel grid; must be a power-of-two.
// Examples: 16, 32, 64, 128...
const SENTINEL_SEED_STEP_POW2 = 2048

function floorPowerOfTwo(value: number): number {
    const v = Math.max(1, Math.floor(value))
    return 2 ** Math.floor(Math.log2(v))
}

export type RenderOptions = {
    antialiasLevel: number,
    palettePeriod: number,
    paletteOffset: number,
    colorStops: ColorStop[],
    interpolationMode: InterpolationMode,
    activateWebcam: boolean,
    activateTessellation: boolean,
    activateShading: boolean,
    activateSkybox: boolean,
    activatePalette: boolean,
    activateSmoothness: boolean,
    activateZebra: boolean,
    activateAnimate: boolean,
    tessellationLevel: number,
    shadingLevel: number,
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

    // Number of r32float layers per texture array
    static readonly LAYER_COUNT = 7

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
    zoomMagnificationThreshold = 2.0
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

    // Progressive iteration state – adaptive batch sizing
    // The batch size auto-adjusts each frame to target ~16ms GPU time.
    static readonly MIN_BATCH_SIZE = 100
    static readonly MAX_BATCH_SIZE = 10000
    static readonly TARGET_FRAME_MS = 16
    private iterationBatchSize = 100

    // Orbit chunking: compute reference orbit incrementally to avoid blocking.
    // Each frame computes at most ORBIT_CHUNK_SIZE iterations of arbitrary-
    // precision math, then yields so the browser stays responsive.
    static readonly ORBIT_CHUNK_SIZE = 100

    // textures additionnelles
    tileTexture?: GPUTexture
    tileTextureView?: GPUTextureView
    skyboxTexture?: GPUTexture
    skyboxTextureView?: GPUTextureView
    paletteTexture?: GPUTexture
    paletteTextureView?: GPUTextureView

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

        // Chargement statique des textures additionnelles
        if (!Engine._tileTexture) {
            Engine._tileTexture = await this._loadTexture(coloredTilesUrl)
        }
        this.tileTexture = await this._loadTexture(coloredTilesUrl)
        this.tileTextureView = this.tileTexture.createView()

        if (!Engine._skyboxTexture) {
            Engine._skyboxTexture = await this._loadTexture(goldUrl)
        }
        this.skyboxTexture = await this._loadTexture(goldUrl)
        this.skyboxTextureView = this.skyboxTexture.createView()

        const palette = new Palette([])
        const paletteImageData = palette.generateTexture()
        this.paletteTexture = this.device.createTexture({
            size: [paletteImageData.width, paletteImageData.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine PaletteTexture',
        })
        this.device.queue.writeTexture(
            { texture: this.paletteTexture },
            paletteImageData.data,
            { bytesPerRow: paletteImageData.width * 4 },
            [paletteImageData.width, paletteImageData.height]
        )
        this.paletteTextureView = this.paletteTexture.createView()

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
            size: 4 * 20,
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

        // Counter buffers for GPU pixel-completion readback
        this.counterBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'Engine Counter Storage',
        })
        this.counterReadBuffer = this.device.createBuffer({
            size: 4,
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
            ],
            label: 'Engine BindGroupLayout Color',
        })

        // 7 MRT targets for the layered r32float texture array
        const mrtTargets: GPUColorTargetState[] = Array.from({ length: Engine.LAYER_COUNT }, () => ({ format: 'r32float' as GPUTextureFormat }))

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

        const layerCount = Engine.LAYER_COUNT

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
    }

    areObjectsEqual(obj1: any, obj2: any): boolean {
        if (obj1 === undefined || obj2 === undefined) {
            return false
        }
        return JSON.stringify(obj1) === JSON.stringify(obj2)
    }

    areColorStopsEqual(
        a: Array<{ color: string, position: number }>,
        b: Array<{ color: string, position: number }>
    ): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (const [i, aStop] of a.entries()) {
            const bStop = b[i]
            if (!bStop) {
                return false
            }
            if (aStop.color !== bStop.color || aStop.position !== bStop.position) {
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

        this.needRender = !(this.areObjectsEqual(mandelbrot, this.previousMandelbrot)
            && this.areObjectsEqual(renderOptions, this.previousRenderOptions))
        // if (!this.needsMoreFrames()) {
        //     this.unfinishedPixelCount = -1 // unknown — new params, GPU counter not read yet
        // }

        if (renderOptions.activateWebcam) { // limite à ~30fps la mise à jour webcam
            await this.updateWebcamTexture()
            this.needRender = true
        } else {
            this.webcamTexture?.closeWebcam()
        }

        if (renderOptions.activateTessellation) {
            this.needRender = true
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
                    this.needFreezeSnapshot = true
                    this.clearHistoryNextFrame = true
                    this.frozenScale = this.liveScale
                    this.liveScale = this.zoomingIn
                        ? this.frozenScale / this.zoomMagnificationThreshold
                        : this.frozenScale * this.zoomMagnificationThreshold
                    this.zoomFactor = 1.0
                    this.liveZoomFactor = this.liveScale / mandelbrot.scale
                }
            } else if (!this.zoomReprojectionActive) {
                this.zoomFactor = 1.0
                this.zoomTarget = 1.0
                this.liveZoomFactor = 1.0
            }

            // If zoom has completely stopped, deactivate and recompute at
            // the actual display scale (the live texture was at liveScale).
            if (this.zoomReprojectionActive && !scaleChanged
                && this.prevFrameMandelbrot
                && this.prevFrameMandelbrot.scale === mandelbrot.scale) {
                this.zoomReprojectionActive = false
                this.zoomFactor = 1.0
                this.zoomTarget = 1.0
                this.liveZoomFactor = 1.0
                this.liveScale = 0
                this.clearHistoryNextFrame = true
            }
        }

        // Si la palette a changé (stops ou mode d'interpolation), on la recalcule
        if (!this.areColorStopsEqual(renderOptions.colorStops, this.previousRenderOptions?.colorStops || [])
            || renderOptions.interpolationMode !== this.previousRenderOptions?.interpolationMode) {
            const palette = new Palette(renderOptions.colorStops, renderOptions.interpolationMode)
            const paletteImageData = palette.generateTexture()
            this.device.queue.writeTexture(
                { texture: this.paletteTexture! },
                paletteImageData.data,
                { bytesPerRow: paletteImageData.width * 4 },
                [paletteImageData.width, paletteImageData.height]
            )
            this.needRender = true
        }

        const colorShaderData = new Float32Array([
            renderOptions.palettePeriod,
            renderOptions.paletteOffset,
            renderOptions.tessellationLevel,
            renderOptions.shadingLevel,
            scaleFactor,
            this.time,
            renderOptions.activateTessellation ? 1 : 0,
            renderOptions.activateShading ? 1 : 0,
            renderOptions.activateWebcam ? 1 : 0,
            renderOptions.activatePalette ? 1 : 0,
            renderOptions.activateSkybox ? 1 : 0,
            renderOptions.activateSmoothness ? 1 : 0,
            renderOptions.activateZebra ? 1 : 0,
            aspect,
            mandelbrot.angle,
            renderOptions.activateAnimate ? 1 : 0,
            mandelbrot.mu,
            this.zoomFactor,
            this.zoomTarget,
            this.liveZoomFactor,
        ])
        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, colorShaderData.buffer)

        if (!this.needsMoreFrames()) {
            return
        }

        const maxIterations = Math.ceil(mandelbrot.maxIterations)

        // Compute one chunk of the reference orbit (bounded CPU work per frame).
        // The WASM side resumes from where it left off; re-anchoring is handled
        // internally when the view centre drifts too far from the reference.
        const prtInfo = this.mandelbrotNavigator.compute_reference_orbit_chunk(
            Engine.ORBIT_CHUNK_SIZE,
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
            0,
        ])
        this.device.queue.writeBuffer(this.uniformBufferMandelbrot!, 0, mandelbrotShaderUniformDataGuarded.buffer)

        // Track whether the orbit is still being built (used by needsMoreFrames).
        this.orbitIncomplete = availableIter < maxIterations

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
        }
        if (this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== mandelbrot.mu) {
            this.clearHistoryNextFrame = true
            this.zoomReprojectionActive = false
            this.zoomFactor = 1.0
            this.zoomTarget = 1.0
            this.liveZoomFactor = 1.0
            this.liveScale = 0
        }

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
        // so seed every pixel (step=1) for fastest live-texture fill.
        const seedStep = this.zoomReprojectionActive
            ? 1
            : floorPowerOfTwo(SENTINEL_SEED_STEP_POW2)
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
        ])
        this.device.queue.writeBuffer(this.uniformBufferBrush!, 0, brushUniforms.buffer)

        // Write resolve uniforms (mu for budget-exhaustion detection + grid offset)
        const resolveUniforms = new Float32Array([this.previousMandelbrot.mu, gridOffsetX, gridOffsetY])
        this.device.queue.writeBuffer(this.uniformBufferResolve!, 0, resolveUniforms.buffer)

        const commandEncoder = this.device.createCommandEncoder()

        // ── Zoom reprojection: copy resolved → frozen snapshot ────────
        if (this.needFreezeSnapshot && this.resolvedTexture && this.frozenTexture) {
            const layerCount = Engine.LAYER_COUNT
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
            // Reset atomic counter to 0
            commandEncoder.clearBuffer(this.counterBuffer, 0, 4)
            const computePass = commandEncoder.beginComputePass()
            computePass.setPipeline(this.pipelineCount)
            computePass.setBindGroup(0, this.counterBindGroup)
            computePass.dispatchWorkgroups(
                Math.ceil(this.neutralSize / 16),
                Math.ceil(this.neutralSize / 16),
            )
            computePass.end()
            // Copy result to staging buffer for async readback
            commandEncoder.copyBufferToBuffer(this.counterBuffer, 0, this.counterReadBuffer, 0, 4)
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
            if (elapsed > 0) {
                // Scale batch size proportionally: if frame took 32ms with batch=100,
                // target 16ms -> new batch ≈ 100 * 16/32 = 50.
                // Use exponential smoothing (alpha=0.3) to avoid oscillation.
                const ratio = Engine.TARGET_FRAME_MS / elapsed
                const ideal = this.iterationBatchSize * ratio
                this.iterationBatchSize = Math.round(
                    Math.min(Engine.MAX_BATCH_SIZE,
                        Math.max(Engine.MIN_BATCH_SIZE,
                            this.iterationBatchSize * 0.7 + ideal * 0.3
                        )
                    )
                )
            }

        await this.counterReadBuffer!.mapAsync(GPUMapMode.READ)
        const data = new Uint32Array(this.counterReadBuffer!.getMappedRange())
        this.unfinishedPixelCount = data[0]
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
        if (this.needRender) return true
        // Active zoom reprojection needs continuous rendering
        if (this.zoomReprojectionActive) return true
        // unfinishedPixelCount: -1 = not yet known (treat as "yes"),
        // 0 = fully converged, >0 = pixels still need work
        if (this.unfinishedPixelCount !== 0) {
            return true
        }
        // The orbit may still be incomplete (availableIter < maxIterations),
        // but if all visible pixels have converged (unfinishedPixelCount == 0)
        // there is no point continuing: no pixel needs more iterations.
        return false
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

