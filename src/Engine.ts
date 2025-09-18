// Engine.ts: implémente une classe Engine pour gérer le pipeline WebGPU

import mandelbrotShader from './assets/mandelbrot.wgsl?raw'
import colorShader from './assets/color.wgsl?raw'
import reprojectShader from './assets/reproject.wgsl?raw'
import {MandelbrotNavigator} from "mandelbrot";
import { memory as wasmMemory } from 'mandelbrot/mandelbrot_bg.wasm';

export type RenderOptions = {
    antialiasLevel: number,
    palettePeriod: number,
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
    historyTexture?: GPUTexture;
    historyView?: GPUTextureView;
    reprojectTexture?: GPUTexture;
    reprojectView?: GPUTextureView;

    // buffers supplémentaires
    uniformBufferReproject?: GPUBuffer; // uniforms reprojection

    // pipelines / bindgroups
    pipeline1?: GPURenderPipeline;
    pipeline2?: GPURenderPipeline;
    bindGroup1?: GPUBindGroup;
    bindGroup2?: GPUBindGroup;
    pipelineReproject?: GPURenderPipeline;
    bindGroupReproject?: GPUBindGroup;

    // shader sources (optionnellement remplaçables)
    shaderPass1: string;
    shaderPass2: string;

    // config
    width = 0;
    height = 0;
    antialiasLevel: number;
    palettePeriod: number;

    previousMandelbrot: Mandelbrot;
    needRender = true;
    extraFrames: number = 0;
    mandelbrotReference = new Float32Array(1000000);

    prevFrameMandelbrot?: Mandelbrot; // paramètres frame précédente pour reprojection

    // flag pour indiquer si l'historique doit être effacé au prochain rendu
    clearHistoryNextFrame: boolean = false;

    constructor(canvas: HTMLCanvasElement, options: RenderOptions) {
        this.canvas = canvas;
        this.shaderPass1 = mandelbrotShader;
        this.shaderPass2 = colorShader;
        this.antialiasLevel = options.antialiasLevel;
        this.palettePeriod = options.palettePeriod;
        this.previousMandelbrot = {
            maxIterations: 1,
            epsilon: 0,
            mu: 1000,
            angle: 0,
            scale: 1,
            cy: 0,
            cx: 0
        }
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

        this.sampler = this.device.createSampler(
            {
                magFilter: 'nearest',
                minFilter: 'nearest',
                mipmapFilter: 'nearest'
            });
        this.sampler.label = 'Engine Sampler';

        // uniform buffers (placeholders)
        this.uniformBufferMandelbrot = this.device.createBuffer({
            size: 4 * 9,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'Engine UniformBuffer Mandelbrot',
        });
        this.uniformBufferColor = this.device.createBuffer({
            size: 4 * 4,
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
        const module1 = this.device.createShaderModule({code: this.shaderPass1, label: 'Engine ShaderModule Pass1'});
        const module2 = this.device.createShaderModule({code: this.shaderPass2, label: 'Engine ShaderModule Pass2'});

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
        const layout1 = this.device.createBindGroupLayout({
            entries: [
                {binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' }},
                {binding: 1, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' }},
                {binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
                {binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {type: 'filtering'}},
            ],
            label: 'Engine RenderPipeline Mandelbrot'
        });

        this.pipelineReproject = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({bindGroupLayouts: [layoutReproject]}),
            vertex: {module: moduleReproject, entryPoint: 'vs_main'},
            fragment: {module: moduleReproject, entryPoint: 'fs_main', targets: [{format: 'rgba16float'}]},
            primitive: {topology: 'triangle-list'},
            label: 'Engine RenderPipeline Reproject'
        });

        this.pipeline1 = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout1] }),
            vertex: {module: module1, entryPoint: 'vs_main'},
            fragment: {module: module1, entryPoint: 'fs_main', targets: [{format: 'rgba16float'}]},
            primitive: {topology: 'triangle-list'},
            label: 'Engine RenderPipeline Pass Mandelbrot'
        });

        this.pipeline2 = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {module: module2, entryPoint: 'vs_main'},
            fragment: {module: module2, entryPoint: 'fs_main', targets: [{format: this.format}]},
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
        this.bindGroup1 = undefined;
        this.bindGroup2 = undefined;
        this.bindGroupReproject = undefined;
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const parent = this.canvas.parentElement;
        const widthCSS = parent?.clientWidth ?? this.canvas.clientWidth;
        const heightCSS = parent?.clientHeight ?? this.canvas.clientHeight;
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

        if (this.historyTexture) this.historyTexture.destroy?.();
        this.historyTexture = this.device.createTexture({
            size: { width: this.width, height: this.height, depthOrArrayLayers: 1},
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
            label: 'Engine HistoryTexture'
        });
        this.historyView = this.historyTexture.createView();

        if (this.reprojectTexture) this.reprojectTexture.destroy?.();
        this.reprojectTexture = this.device.createTexture({
            size: { width: this.width, height: this.height, depthOrArrayLayers: 1},
            format: 'rgba16float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'Engine ReprojectTexture'
        });
        this.reprojectView = this.reprojectTexture.createView();

        // Re-création des bind groups dépendant des textures
        if (this.pipelineReproject) {
            const layoutR = this.pipelineReproject.getBindGroupLayout(0);
            this.bindGroupReproject = this.device.createBindGroup({
                layout: layoutR,
                entries: [
                    {binding: 0, resource: {buffer: this.uniformBufferReproject!}},
                    {binding: 1, resource: this.historyView!},
                    {binding: 2, resource: this.sampler!},
                ],
                label: 'Engine BindGroup Reproject'
            });
        }
        if (this.pipeline1) {
            const layout1 = this.pipeline1.getBindGroupLayout(0);
            this.bindGroup1 = this.device.createBindGroup({
                layout: layout1,
                entries: [
                    {binding: 0, resource: {buffer: this.uniformBufferMandelbrot!}},
                    {binding: 1, resource: {buffer: this.mandelbrotReferenceBuffer!}},
                    {binding: 2, resource: this.reprojectView!},
                    {binding: 3, resource: this.sampler!}
                ],
                label: 'Engine BindGroup Pass Mandelbrot'
            });
        }
        if (this.pipeline2) {
            const layout2 = this.pipeline2.getBindGroupLayout(0);
            const entries: GPUBindGroupEntry[] = [
                {binding: 0, resource: {buffer: this.uniformBufferColor!}},
                {binding: 1, resource: this.intermediateView!}
            ];
            this.bindGroup2 = this.device.createBindGroup({layout: layout2, entries, label: 'Engine BindGroup Color Pass'});
        }
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

    update(mandelbrot : Mandelbrot, renderOptions : RenderOptions) {
        if(this.previousMandelbrot) {
            const wasNeedRender = this.needRender;
            this.needRender = !(this.areObjectsEqual(mandelbrot, this.previousMandelbrot));
            if (this.needRender) {
                this.extraFrames = 2;
            } else if (wasNeedRender && !this.needRender) {
                // Si on vient de passer à false, on ne touche pas à extraFrames
            }
        }
        if(!this.needRender && this.extraFrames <= 0) {
            return;
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
        const colorShaderData = new Float32Array([
            renderOptions.palettePeriod,
            scaleFactor,
            0,
            0
        ]);

        this.device.queue.writeBuffer(this.uniformBufferColor!, 0, colorShaderData.buffer);

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

        // capture frame précédente pour reprojection avant écrasement
        if(!this.prevFrameMandelbrot) {
            this.prevFrameMandelbrot = {...mandelbrot}; // init la première fois
        }
        // Détection de changement de zoom
        if (this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== mandelbrot.scale) {
            this.clearHistoryNextFrame = true;
        }
        this.previousMandelbrot = mandelbrot; // conserve current pour utilisation future
    }

    private _writeReprojectUniforms() {
        if(!this.prevFrameMandelbrot || !this.previousMandelbrot) return;
        const aspect = (this.width / Math.max(1, this.height));
        const prev = this.prevFrameMandelbrot;
        const curr = this.previousMandelbrot;
        const data = new Float32Array([
            prev.cx, prev.cy, prev.scale, prev.angle,
            curr.cx, curr.cy, curr.scale, curr.angle,
            aspect, 0, 0, 0
        ]);
        this.device.queue.writeBuffer(this.uniformBufferReproject!, 0, data.buffer);
    }

    render(forceRender = false) {
        if(!forceRender && !this.needRender && this.extraFrames <= 0) {
            return;
        }
        if (!this.needRender && this.extraFrames > 0) {
            this.extraFrames--;
        }
        if (!this.pipeline1 || !this.pipeline2 || !this.pipelineReproject) return;

        // écrire uniforms reprojection
        this._writeReprojectUniforms();

        const commandEncoder = this.device.createCommandEncoder();


        // Pass 0: reprojection -> reprojectTexture
        if (this.bindGroupReproject) {
            const rpassR = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.reprojectView!,
                    clearValue: {r: -1, g: -1, b: -1, a: 1},
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });
            if (this.prevFrameMandelbrot) { // uniquement après première frame
                rpassR.setPipeline(this.pipelineReproject);
                rpassR.setBindGroup(0, this.bindGroupReproject);
                rpassR.draw(6,1,0,0);
            }
            rpassR.end();
        }

        // Pass 1: calcul mandelbrot (ne calcule que les pixels sentinelle)
        const rpass1 = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.intermediateView!,
                clearValue: {r: 0, g: 0, b: 0, a: 1},
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        rpass1.setPipeline(this.pipeline1);
        if (this.bindGroup1) rpass1.setBindGroup(0, this.bindGroup1);
        rpass1.draw(6, 1, 0, 0);
        rpass1.end();

        // Pass 2: colorisation vers écran
        const swapView = this.ctx.getCurrentTexture().createView();
        const rpass2 = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: swapView,
                clearValue: {r: 1, g: 1, b: 1, a: 1},
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        rpass2.setPipeline(this.pipeline2);
        if (this.bindGroup2) rpass2.setBindGroup(0, this.bindGroup2);
        rpass2.draw(6, 1, 0, 0);
        rpass2.end();

        // Copie résultat courant -> history pour prochaine frame
        if (this.historyTexture && this.intermediateTexture) {
            commandEncoder.copyTextureToTexture(
                {texture: this.intermediateTexture},
                {texture: this.historyTexture},
                {width: this.width, height: this.height, depthOrArrayLayers: 1}
            );
        }

        this.device.queue.submit([commandEncoder.finish()]);

        // marque mise à jour des paramètres frame précédente pour prochaine reprojection
        if (this.previousMandelbrot) {
            this.prevFrameMandelbrot = {...this.previousMandelbrot};
        }
    }

    destroy() {
        this.intermediateTexture?.destroy?.();
        this.mandelbrotReferenceBuffer?.destroy?.();
        this.historyTexture?.destroy?.();
        this.reprojectTexture?.destroy?.();
        this.uniformBufferReproject?.destroy?.();
    }
}
