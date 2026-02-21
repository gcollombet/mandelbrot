// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import mandelbrotShader from './assets/mandelbrot.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import brushShader from './assets/reproject.wgsl?raw'
import resolveShader from './assets/resolve.wgsl?raw'
import {MandelbrotNavigator} from 'mandelbrot'
import {memory as wasmMemory} from 'mandelbrot/mandelbrot_bg.wasm'
import {WebcamTexture} from './WebcamTexture'
import {Palette} from './Palette.ts'
import type {ColorStop} from './ColorStop.ts'

// Progressive refinement settings.
// Start step for the sentinel grid; must be a power-of-two.
// Examples: 16, 32, 64, 128...
const SENTINEL_SEED_STEP_POW2 = 256

function floorPowerOfTwo(value: number): number {
    const v = Math.max(1, Math.floor(value))
    return 2 ** Math.floor(Math.log2(v))
}

export type RenderOptions = {
    antialiasLevel: number,
    palettePeriod: number,
    paletteOffset: number,
    colorStops: ColorStop[],
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
    extraFrames = 0
    mandelbrotReference = new Float32Array(1000000)

    prevFrameMandelbrot?: Mandelbrot // paramètres de la dernière frame rendue (pour gestion d'historique)

    // flag pour indiquer si l'historique doit être effacé au prochain rendu
    clearHistoryNextFrame = false

    // Progressive iteration state
    static readonly ITERATION_BATCH_SIZE = 1000

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
            Engine._tileTexture = await this._loadTexture('./colored_tiles.jpg')
        }
        this.tileTexture = await this._loadTexture('./colored_tiles.jpg')
        this.tileTextureView = this.tileTexture.createView()

        if (!Engine._skyboxTexture) {
            Engine._skyboxTexture = await this._loadTexture('./gold.jpg')
        }
        this.skyboxTexture = await this._loadTexture('./gold.jpg')
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
            size: 4 * 8, // 7 floats + 4-byte padding for 16-byte alignment
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Brush',
        })
        this.uniformBufferResolve = this.device.createBuffer({
            size: 4 * 4, // 1 float (mu) padded to 16-byte alignment
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Resolve',
        })
        this.mandelbrotReferenceBuffer = this.device.createBuffer({
            size: 4 * 1000000,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Orbit ReferenceStorage Buffer',
        })

        await this._createPipelines()
        this.resize()
    }

    private async _createPipelines() {
        const moduleBrush = this.device.createShaderModule({ code: brushShader, label: 'Engine ShaderModule Brush' })
        const moduleCompute = this.device.createShaderModule({ code: this.shaderPassCompute, label: 'Engine ShaderModule Compute' })
        const moduleResolve = this.device.createShaderModule({ code: resolveShader, label: 'Engine ShaderModule Resolve' })
        const moduleColor = this.device.createShaderModule({ code: this.shaderPassColor, label: 'Engine ShaderModule Color' })

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

        // bind groups seront (ré)créés dans resize car dépend des textures
        this.bindGroupBrush = undefined
        this.bindGroupMandelbrot = undefined
        this.bindGroupResolve = undefined
        this.bindGroupColor = undefined
    }

    resize() {
        const dpr = (window.devicePixelRatio || 1) * 1.0
        const parent = this.canvas.parentElement
        const widthCSS = parent?.clientWidth || 1
        const heightCSS = parent?.clientHeight || 1
        this.width = Math.max(1, Math.round(widthCSS * dpr))
        this.height = Math.max(1, Math.round(heightCSS * dpr))

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
        this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height) * 1.0)
        const textureSize = this.neutralSize
        this.rawTexture?.destroy?.()
        this.rawBrushTexture?.destroy?.()
        this.resolvedTexture?.destroy?.()

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
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
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
            ]
            this.bindGroupColor = this.device.createBindGroup({
                layout,
                entries,
                label: 'Engine BindGroup Color',
            })
        }

        this.prevFrameMandelbrot = undefined // plus de frame précédente après resize
        this.needRender = true
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
        if (this.needRender) {
            this.extraFrames = 150
        }

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

        const mandelbrotShaderUniformData = new Float32Array([
            mandelbrot.dx,
            mandelbrot.dy,
            mandelbrot.mu,
            mandelbrot.scale,
            aspect,
            mandelbrot.angle,
            Engine.ITERATION_BATCH_SIZE,            // maxIteration: iterations to compute THIS pass
            mandelbrot.epsilon,
            renderOptions.antialiasLevel,
            0,  // iterationOffset: iterations already completed
            mandelbrot.maxIterations,              // globalMaxIter: total iteration target for the view
            0,
        ])
        this.device.queue.writeBuffer(this.uniformBufferMandelbrot!, 0, mandelbrotShaderUniformData.buffer)

        let scaleFactor = this.previousMandelbrot?.scale || 1.0 / mandelbrot.scale
        if (scaleFactor < 1.0) {
            scaleFactor = 1.0 / scaleFactor
        }
        scaleFactor = Math.sqrt(scaleFactor) - 1.0

        // Si la palette a changé, on la recalcule
        if (!this.areColorStopsEqual(renderOptions.colorStops, this.previousRenderOptions?.colorStops || [])) {
            const palette = new Palette(renderOptions.colorStops)
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
            0,
        ])
        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, colorShaderData.buffer)

        if (!this.needRender && this.extraFrames <= 0) {
            return
        }

        const maxIterations = Math.ceil(mandelbrot.maxIterations)
        const prtInfo = this.mandelbrotNavigator.compute_reference_orbit_ptr(maxIterations)
        const buffer = new Float32Array(wasmMemory.buffer, prtInfo.ptr, prtInfo.count * 4) // 4 floats par MandelbrotStep

        if (prtInfo.offset < maxIterations) {
            this.device.queue.writeBuffer(
                this.mandelbrotReferenceBuffer!,
                0,
                buffer,
                0
            )
        }

        // When the navigator re-anchors its reference orbit, `dx/dy` jump back to ~0.
        // Reprojecting history across that discontinuity would be nonsense, so we clear.
        const orbitWasReset = prtInfo.offset === 0 && !!this.prevFrameMandelbrot

        this.clearHistoryNextFrame = false
        if (!this.prevFrameMandelbrot || orbitWasReset) {
            this.clearHistoryNextFrame = true
        }
        if (this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== mandelbrot.mu) {
            this.clearHistoryNextFrame = true
        }
        if (this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== mandelbrot.scale) {
            this.clearHistoryNextFrame = true
        }

        this.previousMandelbrot = structuredClone(mandelbrot) // conserve current pour utilisation future
        this.previousRenderOptions = structuredClone(renderOptions)
    }

    async render() {
        if (!this.needRender && this.extraFrames <= 0) {
            return
        }
        if (!this.needRender && this.extraFrames > 0) {
            this.extraFrames--
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
        const seedStep = floorPowerOfTwo(SENTINEL_SEED_STEP_POW2)
        const baseSentinel = seedStep
        const clearFlag = this.clearHistoryNextFrame ? 1 : 0

        let shiftTexX = 0
        let shiftTexY = 0
        if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
            const deltaDx = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx
            const deltaDy = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy

            // Convert Mandelbrot translation (complex-plane units) -> texture texel shift.
            // See `src/assets/reproject.wgsl` translation reprojection logic.
            const texSize = this.neutralSize
            const neutralExtent = Math.sqrt(aspect * aspect + 1.0)
            shiftTexX = -(deltaDx * texSize) / (2 * this.previousMandelbrot.scale * neutralExtent)
            shiftTexY = (deltaDy * texSize) / (2 * this.previousMandelbrot.scale * neutralExtent)
        }

        const brushUniforms = new Float32Array([
            aspect,
            this.previousMandelbrot.angle,
            clearFlag,
            seedStep,
            baseSentinel,
            shiftTexX,
            shiftTexY,
            this.previousMandelbrot.mu,
        ])
        this.device.queue.writeBuffer(this.uniformBufferBrush!, 0, brushUniforms.buffer)

        // Write resolve uniforms (mu for budget-exhaustion detection)
        const resolveUniforms = new Float32Array([this.previousMandelbrot.mu])
        this.device.queue.writeBuffer(this.uniformBufferResolve!, 0, resolveUniforms.buffer)

        const commandEncoder = this.device.createCommandEncoder()

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
        this.device.queue.submit([commandEncoder.finish()])

        // attendre la fin du rendu précédent avant de soumettre pour éviter accumulation de frames
            //await this.device.queue.onSubmittedWorkDone()

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
        this.rawTexture?.destroy?.()
        this.rawBrushTexture?.destroy?.()
        this.resolvedTexture?.destroy?.()
        this.mandelbrotReferenceBuffer?.destroy?.()
        this.uniformBufferMandelbrot?.destroy?.()
        this.uniformBufferColor?.destroy?.()
        this.uniformBufferBrush?.destroy?.()
        this.uniformBufferResolve?.destroy?.()
        this.webcamTexture?.closeWebcam()
        this.webcamTileTexture?.destroy?.()
        this.paletteTexture?.destroy?.()
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

