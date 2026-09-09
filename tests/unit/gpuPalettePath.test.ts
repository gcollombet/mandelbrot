import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GpuPalettePath } from '../../src/gpuPalettePath'
import { newPalettePath } from '../../src/palettePath'
import { expmapKernelProjection } from '../../src/expmap/producerProjection'
import { planExpmap, type ExpmapBlock } from '../../src/expmap/plan'
import { log10FromDecimalString } from '../../src/floatexp'
function gpu() {
    const buffers: Float32Array[] = []
    const pass = { setPipeline() {}, setBindGroup() {}, draw() {}, end() {} }
    const texture = (desc: any) => ({ width: desc.size[0], height: desc.size[1], mipLevelCount: desc.mipLevelCount ?? 1, format: desc.format,
        createView: vi.fn(() => ({})), destroy: vi.fn() })
    const device = { queue: { writeTexture: vi.fn(), writeBuffer: vi.fn((_b, _o, d) => { buffers.push(new Float32Array(d)) }), submit: vi.fn() },
        createTexture: vi.fn(texture), createBuffer: vi.fn(() => ({ destroy: vi.fn() })), createSampler: () => ({}), createShaderModule: () => ({}),
        createRenderPipeline: () => ({ getBindGroupLayout: () => ({}) }), createBindGroup: () => ({}), createCommandEncoder: () => ({ beginRenderPass: () => pass, finish: () => ({}) }),
    }
    return { device, buffers, texture }
}
beforeEach(() => {
    vi.stubGlobal('GPUTextureUsage', { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 })
    vi.stubGlobal('GPUBufferUsage', { STORAGE: 1, COPY_DST: 2 })
})
describe('GPU palette path preparation', () => {
    it('keeps eleven palettes resident and uploads only the small header while zooming', () => {
        const { device, buffers, texture } = gpu()
        const path = newPalettePath({ colorStops: [{ color: '#abc', position: 0 }], interpolationMode: 'rgb' }, 1000)
        path.stops = Array.from({ length: 11 }, (_, i) => ({ ...path.stops[0], id: String(i), magnitude: 1000 + i }))
        const image = texture({ size: [64, 64], format: 'rgba8unorm', mipLevelCount: 7 })
        const table = new GpuPalettePath(device as any, path, path.stops[0].appearance, Array.from({ length: 12 }, () => new Uint16Array(4096 * 7 * 4)), [image] as any, Array.from({ length: 12 }, () => ({ tile: 0, sky: 0 })))
        expect(device.queue.writeTexture).toHaveBeenCalledTimes(12)
        expect(buffers[0][12 + 40]).toBe(0) // first stop relative to the path origin
        expect(buffers[0][12 + 11 * 40]).toBe(10)
        table.update(device as any, 1002.5); table.update(device as any, 1007)
        expect(device.queue.writeTexture).toHaveBeenCalledTimes(12)
        expect(buffers[1].length).toBe(12)
        expect(buffers[1][0]).toBe(11)
        expect(buffers[1][4]).toBe(2.5)
        table.destroy()
        expect((table.palettes as any).destroy).toHaveBeenCalledOnce()
    })
    it('keeps equal polar sample depths independent of block boundaries and halos', () => {
        const plan = planExpmap({ domain: { cx: '0', cy: '0', startScale: '1e-3', endScale: '1e-5' }, width: 100, height: 100, density: 1 })
        const block = (y: number): ExpmapBlock => ({ id: String(y), region: 'band', originX: 0, originY: y, useful: { x: 2, y: 2, width: 10, height: 10 }, codedWidth: 14, codedHeight: 14, gridWidth: plan.angularSamples })
        const a = expmapKernelProjection(plan, block(10)), b = expmapKernelProjection(plan, block(12))
        const depthA = -log10FromDecimalString(a.scale) + 5 * a.uniforms[6] / Math.LN10
        const depthB = -log10FromDecimalString(b.scale) + 3 * b.uniforms[6] / Math.LN10
        expect(depthA).toBeCloseTo(depthB, 7)
    })
})
