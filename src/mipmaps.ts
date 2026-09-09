// Génération de la chaîne de mips d'une texture 2D par blits bilinéaires
// successifs. Les cartes de réflexion décoratives lisent ces niveaux pour
// obtenir un flou stable piloté par la rugosité.

export function mipLevelCountFor(width: number, height: number): number {
    return 1 + Math.floor(Math.log2(Math.max(width, height)))
}

const BLIT_SHADER = /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = vec2<f32>(p[vi].x * 0.5 + 0.5, 0.5 - p[vi].y * 0.5);
  return o;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  return textureSampleLevel(src, smp, in.uv, 0.0);
}
`

interface MipBlit {
    pipelines: Map<GPUTextureFormat, GPURenderPipeline>
    module: GPUShaderModule
    sampler: GPUSampler
}

const blitCache = new WeakMap<GPUDevice, MipBlit>()

function getBlit(device: GPUDevice, format: GPUTextureFormat): { pipeline: GPURenderPipeline; sampler: GPUSampler } {
    let blit = blitCache.get(device)
    if (!blit) {
        blit = {
            pipelines: new Map(),
            module: device.createShaderModule({ code: BLIT_SHADER, label: 'MipmapBlit Module' }),
            sampler: device.createSampler({ magFilter: 'linear', minFilter: 'linear', label: 'MipmapBlit Sampler' }),
        }
        blitCache.set(device, blit)
    }
    let pipeline = blit.pipelines.get(format)
    if (!pipeline) {
        pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: { module: blit.module, entryPoint: 'vs_main' },
            fragment: { module: blit.module, entryPoint: 'fs_main', targets: [{ format }] },
            primitive: { topology: 'triangle-list' },
            label: `MipmapBlit ${format}`,
        })
        blit.pipelines.set(format, pipeline)
    }
    return { pipeline, sampler: blit.sampler }
}

/**
 * Remplit les niveaux 1..mipLevelCount-1 d'une texture dont le niveau 0 est
 * déjà uploadé. La texture doit avoir TEXTURE_BINDING | RENDER_ATTACHMENT.
 */
export function generateMipmaps(device: GPUDevice, texture: GPUTexture): void {
    if (texture.mipLevelCount <= 1) return
    const { pipeline, sampler } = getBlit(device, texture.format)
    const encoder = device.createCommandEncoder({ label: 'MipmapGen' })
    for (let level = 1; level < texture.mipLevelCount; level++) {
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: texture.createView({ baseMipLevel: level - 1, mipLevelCount: 1 }) },
                { binding: 1, resource: sampler },
            ],
            label: `MipmapGen L${level}`,
        })
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: texture.createView({ baseMipLevel: level, mipLevelCount: 1 }),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: 'store',
            }],
        })
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(3)
        pass.end()
    }
    device.queue.submit([encoder.finish()])
}

/** Prepare independent image layers once, including their mip chains.
 * Original textures stay alive so committing the endpoint does not resample it.
 */
export function packTextureLayers(device: GPUDevice, sources: GPUTexture[], maxDimension = Infinity): GPUTexture {
    const width = Math.min(maxDimension, Math.max(...sources.map(t => t.width)))
    const height = Math.min(maxDimension, Math.max(...sources.map(t => t.height)))
    const levels = Math.min(mipLevelCountFor(width, height), Math.max(...sources.map(t => t.mipLevelCount)))
    const output = device.createTexture({
        label: 'Transition image layers', size: [width, height, sources.length],
        format: 'rgba8unorm', mipLevelCount: levels,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    })
    const { pipeline, sampler } = getBlit(device, output.format)
    const encoder = device.createCommandEncoder({ label: 'Prepare transition image layers' })
    sources.forEach((source, layer) => {
        for (let level = 0; level < levels; level++) {
            const sourceLevel = Math.min(level, source.mipLevelCount - 1)
            const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
                { binding: 0, resource: source.createView({ dimension: '2d', baseArrayLayer: 0, arrayLayerCount: 1, baseMipLevel: sourceLevel, mipLevelCount: 1 }) },
                { binding: 1, resource: sampler },
            ] })
            const pass = encoder.beginRenderPass({ colorAttachments: [{
                view: output.createView({ dimension: '2d', baseArrayLayer: layer, arrayLayerCount: 1, baseMipLevel: level, mipLevelCount: 1 }),
                loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0],
            }] })
            pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.draw(3); pass.end()
        }
    })
    device.queue.submit([encoder.finish()])
    return output
}
