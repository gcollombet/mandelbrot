import shader from './assets/palette_transition.wgsl?raw'

/** Immutable endpoint layers; only a 16-byte uniform changes during a transition. */
export class GpuPaletteTransition {
    readonly layers: GPUTexture
    private uniform: GPUBuffer
    private pipeline: GPURenderPipeline
    private group: GPUBindGroup
    private output: GPUTextureView
    private previous = -1

    private device: GPUDevice

    constructor(device: GPUDevice, output: GPUTexture, endpoints: Uint16Array[]) {
        this.device = device
        this.layers = device.createTexture({
            label: 'Palette transition endpoints', size: [output.width, output.height, endpoints.length],
            format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        })
        endpoints.forEach((data, layer) => device.queue.writeTexture(
            { texture: this.layers, origin: [0, 0, layer] }, data.buffer as ArrayBuffer,
            { bytesPerRow: output.width * 8 }, [output.width, output.height],
        ))
        this.uniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
        const module = device.createShaderModule({ code: shader })
        this.pipeline = device.createRenderPipeline({ layout: 'auto',
            vertex: { module, entryPoint: 'vs_main' },
            fragment: { module, entryPoint: 'fs_main', targets: [{ format: 'rgba16float' }] },
        })
        this.group = device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: this.layers.createView({ dimension: '2d-array' }) },
            { binding: 1, resource: { buffer: this.uniform } },
        ] })
        this.output = output.createView()
    }

    blend(progress: number) {
        const t = Math.max(0, Math.min(1, progress))
        if (t === this.previous) return
        this.previous = t
        this.device.queue.writeBuffer(this.uniform, 0, new Float32Array([t, 0, 0, 0]))
        const encoder = this.device.createCommandEncoder({ label: 'Blend palette endpoints' })
        const pass = encoder.beginRenderPass({ colorAttachments: [
            { view: this.output, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] },
        ] })
        pass.setPipeline(this.pipeline)
        pass.setBindGroup(0, this.group)
        pass.draw(3)
        pass.end()
        this.device.queue.submit([encoder.finish()])
    }

    destroy() { this.layers.destroy(); this.uniform.destroy() }
}
