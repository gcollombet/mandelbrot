import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GpuPaletteTransition } from '../../src/gpuPaletteTransition'
import { Engine } from '../../src/Engine'
vi.mock('mandelbrot', () => ({ MandelbrotNavigator: class {} }))

function texture() { return { width: 4096, height: 7, createView: vi.fn(() => ({})), destroy: vi.fn() } }
function device() {
    const pass = { setPipeline: vi.fn(), setBindGroup: vi.fn(), draw: vi.fn(), end: vi.fn() }
    return { queue: { writeTexture: vi.fn(), writeBuffer: vi.fn(), submit: vi.fn() },
        createTexture: vi.fn(texture), createBuffer: vi.fn(() => ({ destroy: vi.fn() })),
        createShaderModule: vi.fn(() => ({})),
        createRenderPipeline: vi.fn(() => ({ getBindGroupLayout: () => ({}) })),
        createBindGroup: vi.fn(() => ({})),
        createCommandEncoder: vi.fn(() => ({ beginRenderPass: () => pass, finish: () => ({}) })),
    }
}
beforeEach(() => {
    vi.stubGlobal('GPUTextureUsage', { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 })
    vi.stubGlobal('GPUBufferUsage', { UNIFORM: 1, COPY_DST: 2 })
})
describe('GPU palette transition lifecycle', () => {
    it('uploads two endpoints once and only uniforms thereafter', () => {
        const gpu = device()
        const blend = new GpuPaletteTransition(gpu as any, texture() as any, [new Uint16Array(8), new Uint16Array(8)])
        expect(gpu.queue.writeTexture).toHaveBeenCalledTimes(2)
        blend.blend(0); blend.blend(0.5); blend.blend(0.5); blend.blend(1)
        expect(gpu.queue.writeTexture).toHaveBeenCalledTimes(2)
        expect(gpu.queue.writeBuffer).toHaveBeenCalledTimes(3)
        expect(gpu.queue.submit).toHaveBeenCalledTimes(3)
        blend.destroy()
        expect((blend.layers as any).destroy).toHaveBeenCalledOnce()
    })
    it('discards loaded resources after cancellation', async () => {
        const engine: any = new Engine({} as any, { colorStops: [], antialiasLevel: 1 } as any)
        engine.tileTexture = texture(); engine.skyboxTexture = texture()
        let resolve!: (value: any) => void
        const pending = new Promise(r => { resolve = r })
        engine._loadTexture = vi.fn(() => pending)
        const endpoint = { colorStops: [], interpolationMode: 'rgb' as const }
        const preparation = engine.preparePresetTransition(endpoint, endpoint, { url: 'tile', key: 't' }, { url: 'sky', key: 's' })
        engine.cancelPresetTransition()
        const loaded = texture()
        resolve(loaded)
        expect(await preparation).toBe(false)
        expect(loaded.destroy).toHaveBeenCalled()
        expect(engine.presetTransition).toBeUndefined()
        expect(engine.tileTexture.destroy).not.toHaveBeenCalled()
    })
    it('commits target resources while freeing only obsolete images and temporary layers', () => {
        const engine: any = new Engine({} as any, { colorStops: [], antialiasLevel: 1 } as any)
        const oldTile = texture(), oldSky = texture(), target = texture()
        engine.tileTexture = oldTile; engine.skyboxTexture = oldSky
        const palette = { destroy: vi.fn() }, layers = texture()
        engine.presetTransition = { palette, tile: target, sky: oldSky, tileLayers: layers, tileKey: 'new', skyKey: 'same' }
        engine.finishPresetTransition()
        expect(oldTile.destroy).toHaveBeenCalledOnce()
        expect(target.destroy).not.toHaveBeenCalled()
        expect(oldSky.destroy).not.toHaveBeenCalled()
        expect(layers.destroy).toHaveBeenCalledOnce()
        expect(palette.destroy).toHaveBeenCalledOnce()
        expect(engine.isTileTextureSourceCurrent('new')).toBe(true)
        expect(engine.presetTransition).toBeUndefined()
    })
})
