import { describe, expect, it, vi, afterEach } from 'vitest'
import { newPalettePath } from '../../src/palettePath'
import { resolvePalettePathImages } from '../../src/palettePathResources'
import { freezeExpmapAppearance } from '../../src/expmap/appearance'
vi.mock('../../src/textureLibrary', () => ({
    ensureTextureLibrary: async () => [{ name: 'Cloth', date: '1' }, { name: 'Sky', date: '1' }],
    textureSourceKey: (name: string) => name,
    storedTextureObjectUrl: async (name: string) => `blob:${name}`,
}))
afterEach(() => vi.unstubAllGlobals())
const plain = { colorStops: [{ color: '#000000', position: 0 }], interpolationMode: 'rgb' as const }
const textured = { ...plain, colorStops: [{ ...plain.colorStops[0], tessellation: 1, shading: 1, skybox: 1 }], textureName: 'Cloth', skyboxName: 'Sky' }
describe('palette path image contracts', () => {
    it('never requests missing images for palettes which do not use textures', async () => {
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
        const path = newPalettePath(plain, 0)
        const resources = await resolvePalettePathImages(path, path.stops[0].appearance)
        expect(fetcher).not.toHaveBeenCalled()
        expect(resources.images.every(i => i.key.endsWith(':unused'))).toBe(true)
        resources.dispose()
    })
    it('deduplicates image references and rejects changed resources on resume', async () => {
        const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
        vi.stubGlobal('fetch', fetcher)
        const path = newPalettePath(textured, 0)
        const resources = await resolvePalettePathImages(path, path.stops[0].appearance)
        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(resources.indices[1]).toEqual(resources.indices[2])
        path.resourceHashes = Object.fromEntries(resources.images.map(i => [i.key, i.hash]))
        resources.dispose()
        vi.stubGlobal('fetch', async () => new Response(new Uint8Array([9])))
        await expect(resolvePalettePathImages(path, path.stops[0].appearance)).rejects.toThrow('a changé')
    })
    it('freezes the radial recipe and preserves its identity on an unchanged resume', async () => {
        vi.stubGlobal('fetch', async () => new Response(new Uint8Array([1, 2, 3])))
        const path = newPalettePath(textured, 0); path.enabled = true; path.mode = 'global'
        const appearance = { ...path.stops[0].appearance, palettePath: path, activateAnimate: false }
        const frozen = await freezeExpmapAppearance(appearance as any)
        const recipe = JSON.parse(frozen.json)
        expect(recipe.palettePath.mode).toBe('radial')
        expect(recipe.palettePath.resourceHashes['tile:Cloth']).toMatch(/^sha256:/)
        expect((await freezeExpmapAppearance(recipe)).identity).toBe(frozen.identity)
        expect(path.mode).toBe('global')
    })
})
