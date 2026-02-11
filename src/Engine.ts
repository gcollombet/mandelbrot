// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import mandelbrotShader from './assets/mandelbrot.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import reprojectShader from './assets/reproject.wgsl?raw'
import {MandelbrotNavigator} from "mandelbrot";
import {memory as wasmMemory} from 'mandelbrot/mandelbrot_bg.wasm';
import {WebcamTexture} from './WebcamTexture';
import {Palette} from "./Palette.ts";
import type {ColorStop} from "./ColorStop.ts";

export type RenderOptions = {
    antialiasLevel: number,
    palettePeriod: number,
    colorStops: ColorStop[],
    activateWebcam: boolean,
    activateTessellation: boolean,
    activateShading: boolean,
    activateSkybox: boolean,
    activatePalette: boolean,
    activateSmoothness: boolean,
    activateZebra: boolean,
    tessellationLevel: number,
    shadingLevel: number,
}

export type Mandelbrot = {
    maxIterations: number,
    cx: number,
    cy: number,
    mu: number,
    scale: number,
    angle: number,
    epsilon: number,
}

export class Engine {
    canvas: HTMLCanvasElement;
    device!: GPUDevice;
    queue!: GPUQueue;
    adapter!: GPUAdapter | null;
    ctx!: GPUCanvasContext;
    format!: GPUTextureFormat;
    mandelbrotNavigator!: MandelbrotNavigator;

    // resources
    intermediateTexture?: GPUTexture;
    intermediateView?: GPUTextureView;
    sampler?: GPUSampler;

    // buffers
    uniformBufferMandelbrot?: GPUBuffer; // passe 1 uniforms
    uniformBufferColor?: GPUBuffer; // passe 2 uniforms
    mandelbrotReferenceBuffer?: GPUBuffer; // storage buffer contenant l'orbite

    // nouvelles textures pour reprojection
    reprojectTexture?: GPUTexture;
    reprojectView?: GPUTextureView;

    // buffers supplémentaires
    uniformBufferReproject?: GPUBuffer; // uniforms reprojection

    // pipelines / bindgroups
    pipelineComputeIteration?: GPURenderPipeline;
    pipelineColor?: GPURenderPipeline;
    bindGroupComputeIteration?: GPUBindGroup;
    bindGroupColor?: GPUBindGroup;
    pipelineReproject?: GPURenderPipeline;
    bindGroupReproject?: GPUBindGroup;

    // shader sources (optionnellement remplaçables)
    shaderPassCompute: string;
    shaderPassColor: string;

    // config
    width = 0;
    height = 0;
    antialiasLevel: number;
    palettePeriod: number;

    previousMandelbrot: Mandelbrot;
    previousRenderOptions?: RenderOptions;
    needRender = true;
    extraFrames: number = 0;
    mandelbrotReference = new Float32Array(1000000);

    prevFrameMandelbrot?: Mandelbrot; // paramètres frame précédente pour reprojection

    // flag pour indiquer si l'historique doit être effacé au prochain rendu
    clearHistoryNextFrame: boolean = false;

    // textures additionnelles
    tileTexture?: GPUTexture;
    tileTextureView?: GPUTextureView;
    skyboxTexture?: GPUTexture;
    skyboxTextureView?: GPUTextureView;
    paletteTexture?: GPUTexture;
    paletteTextureView?: GPUTextureView;

    // Webcam
    webcamTexture?: WebcamTexture;
    webcamTileTexture?: GPUTexture;
    webcamTextureView?: GPUTextureView;
    webcamEnabled: boolean = true;

    // temps en secondes
    time: number = 0;
    private lastUpdateTime: number = 0; // timestamp ms de la dernière update

    // Propriétés statiques pour le cache des textures
    static _tileTexture?: GPUTexture;
    static _tileTextureView?: GPUTextureView;
    static _skyboxTexture?: GPUTexture;
    static _skyboxTextureView?: GPUTextureView;
    static _paletteTexture?: GPUTexture;
    static _paletteTextureView?: GPUTextureView;

    constructor(canvas: HTMLCanvasElement, options: RenderOptions) {
        this.canvas = canvas;
        this.shaderPassCompute = mandelbrotShader;
        this.shaderPassColor = colorShader;
        this.antialiasLevel = options.antialiasLevel;
        this.palettePeriod = options.palettePeriod;
        this.time = 0;
        this.previousMandelbrot = {
            maxIterations: 1,
            epsilon: 0,
            mu: 1000,
            angle: 0,
            scale: 1,
            cy: 0,
            cx: 0
        }
        this.previousRenderOptions = {...options};
    }

    async initialize(mandelbrotNavigator: MandelbrotNavigator): Promise<void> {
        this.mandelbrotNavigator = mandelbrotNavigator;
        if (!navigator.gpu) throw new Error('WebGPU non supporté');
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) throw new Error('Adapter WebGPU introuvable');
        this.device = await this.adapter.requestDevice();
        this.device.label = 'Engine Device';
        this.queue = this.device.queue;
        this.queue.label = 'Engine Queue';
        this.ctx = this.canvas.getContext('webgpu') as GPUCanvasContext;
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.ctx.configure({device: this.device, format: this.format, alphaMode: 'opaque'});
        this.sampler = this.device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
            mipmapFilter: 'nearest'
        });
        this.sampler.label = 'Engine Sampler';

        // Chargement statique des textures additionnelles
        if (!Engine._tileTexture) {
            Engine._tileTexture = await this._loadTexture('./colored_tiles.jpg');
        }
        this.tileTexture =  await this._loadTexture('./colored_tiles.jpg');
        this.tileTextureView = this.tileTexture.createView();

        if (!Engine._skyboxTexture) {
            Engine._skyboxTexture = await this._loadTexture('./gold.jpg');
        }
        this.skyboxTexture = await this._loadTexture('./gold.jpg');
        this.skyboxTextureView = this.skyboxTexture.createView();
        let palette = new Palette([
            {position: 0.0, color: '#000764'},
            {position: 0.16, color: '#206bcb'},
            {position: 0.42, color: '#edffff'},
            {position: 0.6425, color: '#ffaa00'},
            {position: 0.8575, color: '#000200'},
            {position: 1.0, color: '#000764'},
        ]);
        const paletteImageData = palette.generateTexture();
        this.paletteTexture = this.device.createTexture({
            size: [paletteImageData.width, paletteImageData.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine PaletteTexture'
        });
        this.device.queue.writeTexture(
            { texture: this.paletteTexture },
            paletteImageData.data,
            { bytesPerRow: paletteImageData.width * 4 },
            [paletteImageData.width, paletteImageData.height]
        );
        this.paletteTextureView = this.paletteTexture.createView();

        // Webcam : initialisation (optionnel, activer webcamEnabled pour l'utiliser)
        this.webcamTexture = new WebcamTexture(1920, 1080);

        this.webcamTileTexture = this.device.createTexture({
            size: [1920, 1080, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.webcamTextureView = this.webcamTileTexture.createView();

        // uniform buffers (placeholders)
        this.uniformBufferMandelbrot = this.device.createBuffer({
            size: 4 * 9,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Mandelbrot',
        });
        this.uniformBufferColor = this.device.createBuffer({
            size: 4 * 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Color'
        });
        this.mandelbrotReferenceBuffer = this.device.createBuffer({
            size: 4 * 1000000,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            label: 'Engine Mandelbrot Orbit ReferenceStorage Buffer',
        });
        await this._createPipelines();
        this.resize();
    }

    private async _createPipelines() {
        const moduleReproject = this.device.createShaderModule({code: reprojectShader, label: 'Engine ShaderModule Reproject'});
        const moduleCompute = this.device.createShaderModule({code: this.shaderPassCompute, label: 'Engine ShaderModule Compute'});
        const moduleColor = this.device.createShaderModule({code: this.shaderPassColor, label: 'Engine ShaderModule Color'});

        // Layout reprojection
        const layoutReproject = this.device.createBindGroupLayout({
            entries: [
                {binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: {type: 'uniform'}},
                {binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
                {binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {type: 'filtering'}},
            ],
            label: 'Engine BindGroupLayout Reproject'
        });

        // Layout Mandelbrot (ajout texture reprojetée + sampler)
        const layoutComputeIteration = this.device.createBindGroupLayout({
            entries: [
                {binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' }},
                {binding: 1, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' }},
                {binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
                {binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {type: 'filtering'}},
            ],
            label: 'Engine RenderPipeline Mandelbrot'
        });

        // Layout Color (6 bindings)
        const layoutColor = this.device.createBindGroupLayout({
            entries: [
                {binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {type: 'uniform'}},
                {binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
                {binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
                {binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
                {binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
                {binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
            ],
            label: 'Engine BindGroupLayout Color'
        });

        this.pipelineReproject = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({bindGroupLayouts: [layoutReproject]}),
            vertex: {module: moduleReproject, entryPoint: 'vs_main'},
            fragment: {module: moduleReproject, entryPoint: 'fs_main', targets: [{format: 'rgba16float'}]},
            primitive: {topology: 'triangle-list'},
            label: 'Engine RenderPipeline Reproject'
        });

        this.pipelineComputeIteration = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layoutComputeIteration] }),
            vertex: {module: moduleCompute, entryPoint: 'vs_main'},
            fragment: {module: moduleCompute, entryPoint: 'fs_main', targets: [{format: 'rgba16float'}]},
            primitive: {topology: 'triangle-list'},
            label: 'Engine RenderPipeline Pass Mandelbrot'
        });


        this.pipelineColor = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({bindGroupLayouts: [layoutColor]}),
            vertex: {module: moduleColor, entryPoint: 'vs_main'},
            fragment: {module: moduleColor, entryPoint: 'fs_main', targets: [{format: this.format}]},
            primitive: {topology: 'triangle-list'},
            label: 'Engine RenderPipeline Pass Color'
        });

        // création buffer reprojection
        if(!this.uniformBufferReproject) {
            this.uniformBufferReproject = this.device.createBuffer({
                size: 4 * 12, // 12 floats
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                label: 'Engine UniformBuffer Reproject'
            });
        }
        // bind groups seront (ré)créés dans resize car dépend des textures
        this.bindGroupComputeIteration = undefined;
        this.bindGroupColor = undefined;
        this.bindGroupReproject = undefined;
    }

    resize() {
        const dpr = (window.devicePixelRatio || 1)  ;
        //const parent = this.canvas.parentElement;
        const widthCSS = this.canvas.clientWidth;
        const heightCSS = this.canvas.clientHeight;
        this.width = Math.max(1, Math.round(widthCSS * dpr));
        this.height = Math.max(1, Math.round(heightCSS * dpr));

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = widthCSS + 'px';
        this.canvas.style.height = heightCSS + 'px';

        this.ctx.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'opaque'
        })

        if (this.intermediateTexture) this.intermediateTexture.destroy?.();
        this.intermediateTexture = this.device.createTexture({
            size: { width: this.width, height: this.height, depthOrArrayLayers: 1 },
            format: 'rgba16float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
            label: 'Engine IntermediateTexture'
        });
        this.intermediateView = this.intermediateTexture.createView();
        this.intermediateView.label = 'Engine IntermediateTextureView';

        if (this.reprojectTexture) this.reprojectTexture.destroy?.();
        this.reprojectTexture = this.device.createTexture({
            size: { width: this.width, height: this.height, depthOrArrayLayers: 1},
            format: 'rgba16float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'Engine ReprojectTexture',
        });
        this.reprojectView = this.reprojectTexture.createView();

        // Re-création des bind groups dépendant des textures
        if (this.pipelineReproject) {
            const layoutReproject = this.pipelineReproject.getBindGroupLayout(0);
            this.bindGroupReproject = this.device.createBindGroup({
                layout: layoutReproject,
                entries: [
                    {binding: 0, resource: {buffer: this.uniformBufferReproject!}},
                    {binding: 1, resource: this.intermediateView!},
                    {binding: 2, resource: this.sampler!},
                ],
                label: 'Engine BindGroup Reproject'
            });
        }
        if (this.pipelineComputeIteration) {
            const layoutComputeIteration = this.pipelineComputeIteration.getBindGroupLayout(0);
            this.bindGroupComputeIteration = this.device.createBindGroup({
                layout: layoutComputeIteration,
                entries: [
                    {binding: 0, resource: {buffer: this.uniformBufferMandelbrot!}},
                    {binding: 1, resource: {buffer: this.mandelbrotReferenceBuffer!}},
                    {binding: 2, resource: this.reprojectView!},
                    {binding: 3, resource: this.sampler!}
                ],
                label: 'Engine BindGroup Pass Mandelbrot'
            });
        }
        if (this.pipelineColor) {
            const layoutColor = this.pipelineColor.getBindGroupLayout(0);
            const entries: GPUBindGroupEntry[] = [
                {binding: 0, resource: {buffer: this.uniformBufferColor!}},
                {binding: 1, resource: this.intermediateView!},
                {binding: 2, resource: this.tileTextureView!},
                {binding: 3, resource: this.skyboxTextureView!},
                {binding: 4, resource: this.webcamTextureView!},
                {binding: 5, resource: this.paletteTexture!},
            ];
            this.bindGroupColor = this.device.createBindGroup({
                layout: layoutColor,
                entries,
                label: 'Engine BindGroup Color Pass'
            });
        }
        this.prevFrameMandelbrot = undefined; // plus de frame précédente après resize
        this.needRender = true;
    }

    areObjectsEqual(obj1: any, obj2: any): boolean {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) return false;
        for (const key of keys1) {
            if (obj1[key] !== obj2[key]) return false;
        }
        return true;
    }

    areColorStopsEqual(a: Array<{ color: string, position: number }>, b: Array<{ color: string, position: number }>): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i].color !== b[i].color || a[i].position !== b[i].position) {
                return false;
            }
        }
        return true;
    }


    async update(mandelbrot : Mandelbrot, renderOptions : RenderOptions) {
        // Calcul du temps écoulé depuis la dernière frame
        const now = performance.now();
        if (this.lastUpdateTime === 0) {
            this.lastUpdateTime = now;
        }
        const delta = (now - this.lastUpdateTime) / 1000; // en secondes
        this.time += delta;
        this.lastUpdateTime = now;

        if(this.previousMandelbrot) {
            this.needRender = !(this.areObjectsEqual(mandelbrot, this.previousMandelbrot));
            if (this.needRender) {
                this.extraFrames = 2;
            }
        }

        if(renderOptions.activateWebcam) { // limite à ~30fps la mise à jour webcam
            await this.updateWebcamTexture();
            this.needRender = true;
        } else {
            this.webcamTexture?.closeWebcam();
        }

        if(renderOptions.activateTessellation) {
            this.needRender = true;
        }

        const aspect = (this.width / Math.max(1, this.height));

        const mandelbrotShaderUniformData = new Float32Array([
            mandelbrot.cx,
            mandelbrot.cy,
            mandelbrot.mu,
            mandelbrot.scale,
            aspect,
            mandelbrot.angle,
            mandelbrot.maxIterations,
            mandelbrot.epsilon,
            renderOptions.antialiasLevel
        ]);
        this.device.queue.writeBuffer(this.uniformBufferMandelbrot!, 0, mandelbrotShaderUniformData.buffer);

        let scaleFactor = this.previousMandelbrot.scale / mandelbrot.scale;
        if(scaleFactor < 1.0) {
            scaleFactor = 1.0 / scaleFactor;
        }
        scaleFactor = Math.sqrt(scaleFactor) - 1.0;

        // Si la palette a changé, on la recalcule
        //if (!this.areColorStopsEqual(renderOptions.colorStops, this.previousRenderOptions?.colorStops || [])) {
            const palette = new Palette(renderOptions.colorStops);
            const paletteImageData = palette.generateTexture();
            this.device.queue.writeTexture(
                { texture: this.paletteTexture! },
                paletteImageData.data,
                { bytesPerRow: paletteImageData.width * 4 },
                [paletteImageData.width, paletteImageData.height]
            );
            this.needRender = true;
        //}

        const colorShaderData = new Float32Array([
            renderOptions.palettePeriod,
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
        ]);
        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, colorShaderData.buffer);

        if(!this.needRender && this.extraFrames <= 0) {
            return;
        }

        const maxIterations = Math.ceil(mandelbrot.maxIterations);
        let prtInfo = this.mandelbrotNavigator.compute_reference_orbit_ptr(
            maxIterations
        );
        const buffer = new Float32Array(wasmMemory.buffer, prtInfo.ptr, prtInfo.count * 4); // 4 floats par MandelbrotStep

        if(prtInfo.offset < maxIterations) {
            this.device.queue.writeBuffer(
                this.mandelbrotReferenceBuffer!,
                0,
                buffer,
                0
            );
        }
        this.clearHistoryNextFrame = false;
        // capture frame précédente pour reprojection avant écrasement
        if(!this.prevFrameMandelbrot) {
            this.clearHistoryNextFrame = true;
        }
        // Détection de changement de zoom
        if (this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== mandelbrot.scale) {
            this.clearHistoryNextFrame = true;
        }
        this.previousMandelbrot = {...mandelbrot}; // conserve current pour utilisation future
        this.previousRenderOptions = {...renderOptions};
    }

    private _writeReprojectUniforms() {
        if(!this.prevFrameMandelbrot || !this.previousMandelbrot) return;
        const aspect = (this.width / Math.max(1, this.height));
        const prev = this.prevFrameMandelbrot;
        const curr = this.previousMandelbrot;
        const data = new Float32Array([
            prev.cx, prev.cy, prev.scale, prev.angle,
            curr.cx, curr.cy, curr.scale, curr.angle,
            aspect,
            0,
            0,
            0
        ]);
        this.device.queue.writeBuffer(this.uniformBufferReproject!, 0, data.buffer);
    }

    async render() {
        if( !this.needRender
            && this.extraFrames <= 0
        ) {
            return;
        }
        if (!this.needRender && this.extraFrames > 0) {
            this.extraFrames--;
        }
        if (!this.pipelineComputeIteration || !this.pipelineColor || !this.pipelineReproject) return;

        // écrire uniforms reprojection
        this._writeReprojectUniforms();

        const commandEncoder = this.device.createCommandEncoder();

        // Pass 0: reprojection -> reprojectTexture
        if (this.bindGroupReproject) {
            const rpassReproject = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.reprojectView!,
                    clearValue: {r: -1, g: -1, b: -1, a: 1},
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });
            if (!this.clearHistoryNextFrame) { // uniquement après première frame
                rpassReproject.setPipeline(this.pipelineReproject);
                rpassReproject.setBindGroup(0, this.bindGroupReproject);
                rpassReproject.draw(6,1,0,0);
            }
            rpassReproject.end();
        }

        // Pass 1: calcul mandelbrot (ne calcule que les pixels sentinelle)
        const rpassComputeIteration = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.intermediateView!,
                clearValue: {r: 0, g: 0, b: 0, a: 1},
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        rpassComputeIteration.setPipeline(this.pipelineComputeIteration);
        if (this.bindGroupComputeIteration) rpassComputeIteration.setBindGroup(0, this.bindGroupComputeIteration);
        rpassComputeIteration.draw(6, 1, 0, 0);
        rpassComputeIteration.end();

        // Pass 2: colorisation vers écran
        const swapView = this.ctx.getCurrentTexture().createView();
        const rpassColor = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: swapView,
                clearValue: {r: 1, g: 1, b: 1, a: 1},
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        rpassColor.setPipeline(this.pipelineColor);
        if (this.bindGroupColor) rpassColor.setBindGroup(0, this.bindGroupColor);
        rpassColor.draw(6, 1, 0, 0);
        rpassColor.end();

        this.device.queue.submit([commandEncoder.finish()]);

        // marque mise à jour des paramètres frame précédente pour prochaine reprojection
        if (this.previousMandelbrot) {
            this.prevFrameMandelbrot = {...this.previousMandelbrot};
        }
    }

    destroy() {
        this.intermediateTexture?.destroy?.();
        this.mandelbrotReferenceBuffer?.destroy?.();
        this.reprojectTexture?.destroy?.();
        this.uniformBufferReproject?.destroy?.();
        this.uniformBufferMandelbrot?.destroy?.();
        this.uniformBufferColor?.destroy?.();
        this.webcamTexture?.closeWebcam();
        this.webcamTileTexture?.destroy?.();
        this.paletteTexture?.destroy?.();
    }

    // Méthode utilitaire pour charger une image et la convertir en GPUTexture
    private async _loadTexture(url: string): Promise<GPUTexture> {
        const img = new Image();
        img.src = url;
        try {
            await img.decode();
        } catch (e) {
            console.warn('Échec du chargement de la texture : ' + url, e);
            throw e;
        }
        const bitmap = await createImageBitmap(img);
        const texture = this.device.createTexture({
            size: [bitmap.width, bitmap.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Engine LoadedTexture ' + url
        });
        this.device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: texture },
            [bitmap.width, bitmap.height]
        );
        return texture;
    }

    // Met à jour la texture GPU à partir de la webcam (à appeler à chaque frame si webcamEnabled)
    async updateWebcamTexture() {
        await this.webcamTexture?.openWebcam();
        await this.webcamTexture?.drawWebGPUTexture(this.webcamTileTexture!, this.device);
    }
}
