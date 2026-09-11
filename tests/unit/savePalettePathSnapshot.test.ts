import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newPalettePath } from '../../src/palettePath'

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), savePalette: vi.fn(), getPalette: vi.fn(), saveTexture: vi.fn(), purgeTexture: vi.fn() }))
vi.mock('../../src/palettePathResources', () => ({ resolvePalettePathImages: mocks.resolve }))
vi.mock('../../src/paletteStore', () => ({ savePaletteEntry: mocks.savePalette, getPaletteByGuid: mocks.getPalette }))
vi.mock('../../src/textureStore', () => ({ saveTextureEntry: mocks.saveTexture, purgeTextureEntryByGuid: mocks.purgeTexture }))
import { savePalettePathSnapshot } from '../../src/savePalettePathSnapshot'

const manual = { colorStops: [{ position: 0, color: '#123456' }], interpolationMode: 'lab' as const }
beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, toDataURL: () => 'data:image/png;base64,test',
        toBlob: (callback: (b: Blob) => void) => callback(new Blob(['png'])),
        getContext: () => ({ fillRect() {}, clearRect() {}, drawImage() {}, putImageData() {},
            getImageData: () => ({ data: new Uint8ClampedArray([128, 128, 128, 255]) }),
            createImageData: () => ({ data: new Uint8ClampedArray(4) }) }),
    }) })
    vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['image']) })))
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() })))
})
afterEach(() => vi.unstubAllGlobals())

describe('saving a palette path snapshot', () => {
    it('saves a new independent record and returns the unique stored name', async () => {
        const p = newPalettePath(manual, 0); p.enabled = true
        mocks.getPalette.mockResolvedValue({ name: 'Snapshot (2)' })
        const saved = await savePalettePathSnapshot(p, 0, manual)
        const record = mocks.savePalette.mock.calls[0][0]
        expect(record.guid).toBeTruthy()
        expect(record.thumbnail).toContain('data:image/png')
        expect(record.palettePath).toBeUndefined()
        expect(mocks.resolve).not.toHaveBeenCalled()
        expect(saved.name).toBe('Snapshot (2)')
        p.stops[0].appearance.colorStops[0].color = '#ffffff'
        expect(record.colorStops[0].color).toBe('#123456')
    })
    it('freezes inputs before asynchronous image loading and cleans up images if palette saving fails', async () => {
        const p = newPalettePath(manual, 0); p.enabled = true
        const dispose = vi.fn()
        mocks.resolve.mockImplementation(async () => {
            p.name = 'Changed during save'; p.stops[0].appearance.colorStops[0].color = '#ffffff'
            return {
                images: [{ key: 'tile:unused', url: '' }, { key: 'tile:a', url: 'blob:a' }, { key: 'tile:b', url: 'blob:b' }],
                indices: [{ tile: 0, sky: 0 }, { tile: 1, sky: 0 }, { tile: 2, sky: 0 }], dispose,
            }
        })
        mocks.savePalette.mockRejectedValue(new Error('Quota'))
        await expect(savePalettePathSnapshot(p, 0.5, manual)).rejects.toThrow('Quota')
        expect(mocks.saveTexture).toHaveBeenCalledTimes(1)
        const imageGuid = mocks.saveTexture.mock.calls[0][4]
        expect(mocks.purgeTexture).toHaveBeenCalledWith(imageGuid)
        expect(mocks.savePalette.mock.calls[0][0]).toMatchObject({ name: 'Nouveau parcours · 0.500', textureGuid: imageGuid })
        expect(mocks.savePalette.mock.calls[0][0].colorStops[0].color).toBe('#123456')
        expect(dispose).toHaveBeenCalledTimes(1)
    })
})
