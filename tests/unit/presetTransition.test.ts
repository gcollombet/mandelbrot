import { describe, expect, it } from 'vitest'
import { interpolatePresetAppearance, TRANSITION_DEFAULTS } from '../../src/presetTransition'
import type { MandelbrotParams } from '../../src/Mandelbrot'

const a = { colorStops: [{ color: '#000', position: 0 }], palettePeriod: 100,
    microBumpStrength: 0, stripeFrequency: 8,
    textureMapping: { xVariable: 'screenX', yVariable: 'screenY', xScale: 1, yScale: 2, mirrored: false },
} as MandelbrotParams
const b = { ...a, palettePeriod: 300, microBumpStrength: 1, stripeFrequency: 24,
    textureMapping: { ...a.textureMapping!, xVariable: 'distance', xScale: 3 },
} as MandelbrotParams

describe('preset appearance interpolation', () => {
    it('interpolates continuous controls without manufacturing intermediate palette stops', () => {
        const middle = interpolatePresetAppearance(a, b, 0.5)
        expect(middle.palettePeriod).toBe(200)
        expect(middle.microBumpStrength).toBe(0.5)
        expect(middle.stripeFrequency).toBe(16)
        expect(middle.colorStops).toBeUndefined()
        expect(middle.mu).toBeUndefined()
        expect(middle.textureMapping?.xScale).toBe(2)
        expect(middle.textureMapping?.xVariable).toBe('screenX')
        expect(a.microBumpStrength).toBe(0)
    })
    it('reaches both endpoints and keeps absent legacy controls finite', () => {
        const start = interpolatePresetAppearance(a, b, -1)
        const end = interpolatePresetAppearance(a, b, 2)
        expect(start.palettePeriod).toBe(a.palettePeriod)
        expect(end.palettePeriod).toBe(b.palettePeriod)
        expect(end.textureMapping?.xVariable).toBe('distance')
        for (const key of Object.keys(TRANSITION_DEFAULTS)) expect(Number.isFinite((end as any)[key])).toBe(true)
    })
})

it('fades a newly enabled trap instead of keeping it off until the endpoint', () => {
    const off = { ...a, orbitTrap: { mode: 'off', strength: 0 } } as MandelbrotParams
    const on = { ...b, orbitTrap: { mode: 'terminal', strength: 10 } } as MandelbrotParams
    expect(interpolatePresetAppearance(off, on, 0.5).orbitTrap).toMatchObject({ mode: 'terminal', strength: 5 })
    expect(interpolatePresetAppearance(on, off, 0.5).orbitTrap).toMatchObject({ mode: 'terminal', strength: 5 })
    const other = { ...on, orbitTrap: { ...on.orbitTrap!, mode: 'sampled' } } as MandelbrotParams
    expect(interpolatePresetAppearance(on, other, 0.5).orbitTrap?.strength).toBe(0)
})
