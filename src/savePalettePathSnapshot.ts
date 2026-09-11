import { Palette } from './Palette'
import { applyStopTransferCurve } from './ColorStop'
import type { MandelbrotParams } from './Mandelbrot'
import { pathSegment, snapshotPathAppearance, validatePalettePath, type PalettePath } from './palettePath'
import { resolvePalettePathImages } from './palettePathResources'
import { getPaletteByGuid, savePaletteEntry } from './paletteStore'
import { saveTextureEntry, purgeTextureEntryByGuid } from './textureStore'
import { mixSnapshotPixels, snapshotPalettePath } from './palettePathSnapshot'

export async function savePalettePathSnapshot(source: PalettePath, magnitude: number, current: Partial<MandelbrotParams>) {
    // Freeze all inputs before resolving images or writing to IndexedDB.
    const path = validatePalettePath(source), manual = JSON.parse(JSON.stringify(current))
    const record = snapshotPalettePath(path, magnitude, manual)
    record.guid = crypto.randomUUID()
    const segment = path.enabled ? pathSegment(path, magnitude) : null
    const t = segment ? applyStopTransferCurve(path.stops[segment.a].curve, segment.t) : 0
    const createdImages: string[] = []
    try {
        if (segment && t > 0 && t < 1) {
            const resources = await resolvePalettePathImages(path, snapshotPathAppearance(manual))
            try {
                for (const role of ['tile', 'sky'] as const) {
                    const ai = resources.indices[segment.a + 1][role], bi = resources.indices[segment.b + 1][role]
                    if (ai === bi) continue
                    const bitmaps: ImageBitmap[] = []
                    try {
                        // Match the layer dimensions used by packTextureLayers.
                        const ids = [...new Set(resources.indices.map(pair => pair[role]))]
                        for (const id of ids) {
                            if (resources.images[id].key.endsWith(':unused')) {
                                const empty = document.createElement('canvas'); empty.width = 1; empty.height = 1
                                bitmaps.push(await createImageBitmap(empty))
                            } else bitmaps.push(await createImageBitmap(await (await fetch(resources.images[id].url)).blob()))
                        }
                        const width = Math.min(path.textureSize, Math.max(...bitmaps.map(b => b.width)))
                        const height = Math.min(path.textureSize, Math.max(...bitmaps.map(b => b.height)))
                        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
                        const ctx = canvas.getContext('2d')
                        if (!ctx) throw new Error('Capture des images indisponible.')
                        const pixels = (id: number) => {
                            ctx.clearRect(0, 0, width, height)
                            ctx.drawImage(bitmaps[ids.indexOf(id)], 0, 0, width, height)
                            return ctx.getImageData(0, 0, width, height).data
                        }
                        const mixed = ctx.createImageData(width, height)
                        mixed.data.set(mixSnapshotPixels(pixels(ai), pixels(bi), t, role === 'sky'))
                        ctx.putImageData(mixed, 0, 0)
                        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Encodage de la capture impossible.')), 'image/png'))
                        const thumbnail = document.createElement('canvas'); thumbnail.width = 96; thumbnail.height = 64
                        thumbnail.getContext('2d')?.drawImage(canvas, 0, 0, 96, 64)
                        const guid = crypto.randomUUID(), name = `${record.name} · ${role === 'tile' ? 'texture' : 'reflets'} · ${guid.slice(0, 8)}`
                        await saveTextureEntry(name, blob, thumbnail.toDataURL('image/png'), undefined, guid, false, undefined, { kind: role === 'tile' ? 'texture' : 'skybox', width, height })
                        createdImages.push(guid)
                        if (role === 'tile') { record.textureGuid = guid; record.textureName = name }
                        else { record.skyboxGuid = guid; record.skyboxName = name }
                    } finally { bitmaps.forEach(b => b.close()) }
                }
            } finally { resources.dispose() }
        }
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 32
        const ctx = canvas.getContext('2d'), palette = new Palette(record.colorStops, record.interpolationMode)
        if (ctx) {
            for (let x = 0; x < canvas.width; x++) { ctx.fillStyle = palette.getColorAt(x / (canvas.width - 1)); ctx.fillRect(x, 0, 1, canvas.height) }
            record.thumbnail = canvas.toDataURL('image/png')
        }
        await savePaletteEntry(record)
    } catch (error) {
        await Promise.allSettled(createdImages.map(guid => purgeTextureEntryByGuid(guid)))
        throw error
    }
    return await getPaletteByGuid(record.guid) ?? record
}
