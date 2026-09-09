import { describe, expect, it } from 'vitest'
import { newPalettePath, snapshotPathAppearance, validatePalettePath, pathSegment, pathNodeValues } from '../../src/palettePath'
import { readPalettePaths, savePalettePath, deletePalettePath } from '../../src/palettePathStore'
const appearance = { colorStops: [{ position: 0, color: '#123456', stripeAverage: 0.7, rotationMean: 0.4 }], interpolationMode: 'lab' as const, microBumpStrength: 0.8 }
function storage() { let value: string | null = null; return { getItem: () => value, setItem: (_: string, v: string) => { value = v } } }

describe('palette path contracts', () => {
    it('saves self-contained palette and material snapshots without sharing source objects', () => {
        const p = newPalettePath(appearance, 1), db = storage()
        savePalettePath(p, db)
        p.stops[0].appearance.colorStops[0].color = '#fff'
        const restored = readPalettePaths(db)[0]
        expect(restored.stops[0].appearance.colorStops[0]).toMatchObject({ color: '#123456', stripeAverage: 0.7, rotationMean: 0.4 })
        expect(restored.stops[0].appearance.microBumpStrength).toBe(0.8)
        restored.name = 'Renommé'; savePalettePath(restored, db)
        expect(readPalettePaths(db)).toHaveLength(1)
        expect(readPalettePaths(db)[0].name).toBe('Renommé')
        savePalettePath({ ...restored, id: 'duplicate' }, db)
        deletePalettePath(restored.id, db)
        expect(readPalettePaths(db).map(p => p.id)).toEqual(['duplicate'])
    })
    it('selects neighbors across eleven stops, including exact endpoints', () => {
        const p = newPalettePath(appearance, 1)
        p.stops = Array.from({ length: 11 }, (_, i) => ({ ...p.stops[0], id: String(i), magnitude: i }))
        validatePalettePath(p)
        for (let i = 0; i < 10; i++) expect(pathSegment(p, i + 0.25)).toEqual({ a: i, b: i + 1, t: 0.25 })
        expect(pathSegment(p, -1)).toEqual({ a: 0, b: 0, t: 0 })
        expect(pathSegment(p, 11)).toEqual({ a: 10, b: 10, t: 0 })
        p.outside = 'manual'
        expect(pathSegment(p, -1)).toBeNull()
        expect(pathSegment(p, 11)).toBeNull()
        expect(pathSegment(p, 10)?.t).toBe(1)
    })
    it('rejects unordered stops, collapsed GPU depths, unknown formats and nonfinite material values', () => {
        const p = newPalettePath(appearance, 0)
        expect(() => validatePalettePath({ ...p, version: 2 })).toThrow()
        p.stops[1].magnitude = 0
        expect(() => validatePalettePath(p)).toThrow()
        p.stops[1].magnitude = 100000
        p.stops.push({ ...p.stops[1], id: 'third', magnitude: 100000.0001 })
        expect(() => validatePalettePath(p)).toThrow()
        expect(() => snapshotPathAppearance({ ...appearance, reliefDepth: NaN })).toThrow()
    })
    it('does not overwrite corrupt storage or swallow quota failures', () => {
        const p = newPalettePath(appearance, 0)
        let writes = 0
        expect(() => savePalettePath(p, { getItem: () => '{broken', setItem: () => { writes++ } })).toThrow()
        expect(writes).toBe(0)
        expect(() => savePalettePath(p, { getItem: () => null, setItem: () => { throw new Error('quota') } })).toThrow('quota')
    })
    it('packs independent resource indices and continuous material parameters', () => {
        const p = newPalettePath(appearance, 1)
        const values = pathNodeValues(p.stops[0], 4, 7, 11)
        expect(values).toHaveLength(40)
        expect(values.slice(0, 4)).toEqual([1, 0, 4, 7])
        expect(values[10]).toBe(0.8)
        expect(values[30]).toBe(11)
    })
})
