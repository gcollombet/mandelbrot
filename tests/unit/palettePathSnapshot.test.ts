import { describe, expect, it } from 'vitest'
import { newPalettePath, snapshotPathAppearance, validatePalettePath } from '../../src/palettePath'
import { snapshotPalettePath, mixSnapshotPixels } from '../../src/palettePathSnapshot'
import { EFFECT_FIELD_NAMES } from '../../src/effectFieldConfig'
import { Palette } from '../../src/Palette'

const manual = { colorStops: [{ position: 0, color: '#123456' }], interpolationMode: 'lab' as const, stripeFrequency: 12 }
function path() {
    const p = newPalettePath(manual, 10); p.enabled = true
    p.stops[0].appearance = snapshotPathAppearance({ colorStops: [{ position: 0, color: '#000000', shading: 1, metallic: 0.2, iridescencePower: 1 }], palettePeriod: 100, lightAngle: 0 })
    p.stops[1].appearance = snapshotPathAppearance({ colorStops: [{ position: 0, color: '#ffffff', shading: 0.5, metallic: 0.8, iridescenceColor: '#ffffff', iridescencePower: 0.8 }], palettePeriod: 300, lightAngle: 2, paletteMirror: true })
    return p
}
describe('palette path snapshots', () => {
    it('captures the current mixture, all material fields, shared orbit settings and global controls', () => {
        const p = path(), result = snapshotPalettePath(p, 10.25, manual)
        expect(result.colorStops).toHaveLength(200)
        expect(result.interpolationMode).toBe('rgb')
        expect(result.colorStops[0]).toMatchObject({ color: '#404040', shading: 0.875, iridescencePower: 0.2 })
        expect(result.colorStops[0].metallic).toBeCloseTo(0.35)
        for (const field of EFFECT_FIELD_NAMES) expect(Number.isFinite(result.colorStops[0][field])).toBe(true)
        expect(result.palettePeriod).toBe(150)
        expect(result.lightAngle).toBe(0.5)
        expect(result.stripeFrequency).toBe(12)
        expect(result.paletteMirror).toBe(false)
        expect(snapshotPalettePath(p, 10.5, manual).paletteMirror).toBe(true)
        p.stops[0].appearance.colorStops[0].color = '#ff0000'
        expect(result.colorStops[0].color).toBe('#404040')
        p.stops[0].appearance = snapshotPathAppearance(result)
        expect(() => validatePalettePath(p)).not.toThrow()
    })
    it('uses the segment transfer curve and preserves endpoints exactly', () => {
        const p = path(); p.stops[0].curve = 'square'
        expect(snapshotPalettePath(p, 10, manual).colorStops).toEqual(p.stops[0].appearance.colorStops)
        expect(snapshotPalettePath(p, 10.01, manual).colorStops).toEqual(p.stops[1].appearance.colorStops)
        p.stops[0].curve = 'gaussian'
        expect(snapshotPalettePath(p, 10.2, manual).palettePeriod).toBe(100)
        expect(snapshotPalettePath(p, 10.8, manual).palettePeriod).toBe(300)
    })
    it('respects manual fallback, disabled paths and held boundaries', () => {
        const p = path()
        expect(snapshotPalettePath(p, 20, manual).palettePeriod).toBe(300)
        p.outside = 'manual'
        expect(snapshotPalettePath(p, 20, manual).colorStops[0].color).toBe('#123456')
        p.enabled = false
        expect(snapshotPalettePath(p, 10.5, manual).colorStops[0].color).toBe('#123456')
        expect(() => snapshotPalettePath(p, NaN, manual)).toThrow()
    })
    it('samples different endpoint color spaces and source knots rather than pairing stops by index', () => {
        const p = path()
        p.stops[0].appearance.colorStops.push({ position: 0.3, color: '#ff0000', metallic: 0.9 })
        p.stops[1].appearance.interpolationMode = 'hcl'
        p.stops[1].appearance.colorStops.push({ position: 0.7, color: '#0000ff', metallic: 0.1 })
        const snap = snapshotPalettePath(p, 10.5, manual)
        const sample = snap.colorStops.find(s => s.position === 0.3)!
        const a = new Palette(p.stops[0].appearance.colorStops), b = new Palette(p.stops[1].appearance.colorStops, 'hcl')
        expect(sample.metallic).toBeCloseTo((a.getEffectAt(0.3, 'metallic') + b.getEffectAt(0.3, 'metallic')) / 2)
    })
    it('blends transparent tiles premultiplied and skyboxes in linear light', () => {
        const transparentRed = new Uint8ClampedArray([255, 0, 0, 0]), blue = new Uint8ClampedArray([0, 0, 255, 255])
        expect([...mixSnapshotPixels(transparentRed, blue, 0.5, false)]).toEqual([0, 0, 255, 128])
        const black = new Uint8ClampedArray([0, 0, 0, 255]), white = new Uint8ClampedArray([255, 255, 255, 255])
        expect([...mixSnapshotPixels(black, white, 0.5, true)]).toEqual([188, 188, 188, 255])
    })
})
