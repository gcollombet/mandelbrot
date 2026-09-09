import { packTextureLayers } from './mipmaps'
import { PALETTE_PATH_TEXTURE_BUDGET, PATH_NODE_FLOATS, pathNodeValues, type PalettePath, type PathAppearance } from './palettePath'

export class GpuPalettePath {
    readonly palettes: GPUTexture
    readonly tile: GPUTexture
    readonly sky: GPUTexture
    readonly buffer: GPUBuffer
    readonly path: PalettePath
    readonly stops
    constructor(privateDevice: GPUDevice, path: PalettePath, base: PathAppearance, data: Uint16Array[], images: GPUTexture[], indices: { tile: number; sky: number }[]) {
        this.path = path
        const device = privateDevice
        this.stops = [base, ...path.stops.map(s => s.appearance)].flatMap(a => a.colorStops)
        const tileIds = [...new Set(indices.map(i => i.tile))], skyIds = [...new Set(indices.map(i => i.sky))]
        // Conservative bound including all mip levels and all endpoint palettes.
        const bytes = path.textureSize ** 2 * 4 * 4 / 3 * (tileIds.length + skyIds.length) + data.length * 4096 * 7 * 8
        if (bytes > PALETTE_PATH_TEXTURE_BUDGET) throw new Error('Images du parcours : budget de 128 Mio dépassé. Réduire leur résolution.')
        try {
        this.tile = packTextureLayers(device, tileIds.map(i => images[i]), path.textureSize)
        this.sky = packTextureLayers(device, skyIds.map(i => images[i]), path.textureSize)
        this.palettes = device.createTexture({ label: 'Palette path layers', size: [4096, 7, data.length], format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST })
        data.forEach((values, layer) => device.queue.writeTexture({ texture: this.palettes, origin: [0, 0, layer] }, values.buffer as ArrayBuffer, { bytesPerRow: 4096 * 8 }, [4096, 7]))
        const metadata = new Float32Array(12 + PATH_NODE_FLOATS * data.length)
        const nodes = [{ id: 'manual', magnitude: 0, name: 'Manuelle', curve: 'linear' as const, appearance: base }, ...path.stops]
        nodes.forEach((stop, i) => metadata.set(pathNodeValues({ ...stop, magnitude: stop.magnitude - path.stops[0].magnitude }, tileIds.indexOf(indices[i].tile), skyIds.indexOf(indices[i].sky), this.sky.mipLevelCount), 12 + i * PATH_NODE_FLOATS))
        this.buffer = device.createBuffer({ label: 'Palette path stops', size: metadata.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
        device.queue.writeBuffer(this.buffer, 0, metadata)
        } catch (error) {
            this.palettes?.destroy(); this.tile?.destroy(); this.sky?.destroy(); this.buffer?.destroy()
            throw error
        }
    }
    update(device: GPUDevice, depth: number, projection?: { scale: string; uniforms: Float32Array }, projectionDepth = depth) {
        const u = projection?.uniforms
        const mode = u ? (u[0] < 2 ? 3 : 4) : this.path.mode === 'global' ? 1 : 2
        device.queue.writeBuffer(this.buffer, 0, new Float32Array([
            this.path.stops.length, mode, this.path.outside === 'manual' ? 1 : 0, 1,
            (u ? projectionDepth : depth) - this.path.stops[0].magnitude, u ? u[6] / Math.LN10 : 0, u ? u[3] : 0, u ? u[4] : 0,
            u ? u[9] : 1, u ? u[10] : 0, 0, 0,
        ]))
        // Center blocks currently use density=1 and zero centerHalf in the producer.
    }
    destroy() { this.palettes.destroy(); this.tile.destroy(); this.sky.destroy(); this.buffer.destroy() }
}
