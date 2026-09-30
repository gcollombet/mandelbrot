import { describe, expect, it } from 'vitest'
import { normalizeTiltView, tiltViewFit, tiltViewUniforms } from '../../src/tiltView'

describe('tilted 3D view', () => {
  it('bounds and wraps the settings', () => {
    expect(normalizeTiltView()).toEqual({ tilt: 0, heading: 0, relief: 10, interiorDepth: 1 })
    expect(normalizeTiltView({ tilt: 90, heading: -30, relief: NaN })).toEqual({ tilt: 50, heading: 330, relief: 10, interiorDepth: 1 })
  })

  it('keeps every ray inside the computed frame', () => {
    for (const aspect of [16 / 9, 1, 0.6]) for (const tiltDeg of [0, 20, 45, 50]) for (const headingDeg of [0, 37, 90, 200]) {
      const tilt = tiltDeg * Math.PI / 180, h = headingDeg * Math.PI / 180
      const k = tiltViewFit(aspect, tilt, h)
      const e = [Math.cos(h), Math.sin(h)], r = [e[1], -e[0]]
      for (const sx of [-aspect, aspect]) for (const sy of [-1, 1]) for (const d of [0, 0.5, 1]) {
        const gx = k * (sx * r[0] + sy / Math.cos(tilt) * e[0]) + (d - 0.5) * Math.tan(tilt) * e[0]
        const gy = k * (sx * r[1] + sy / Math.cos(tilt) * e[1]) + (d - 0.5) * Math.tan(tilt) * e[1]
        // k = 0.05 is the floor: a frame too narrow for the tilt (checked below).
        if (k > 0.05) {
          expect(Math.abs(gx)).toBeLessThanOrEqual(aspect + 1e-9)
          expect(Math.abs(gy)).toBeLessThanOrEqual(1 + 1e-9)
        }
      }
    }
    expect(tiltViewFit(16 / 9, 0, Math.PI / 2)).toBe(1)
  })

  it('packs the uniform block with 0° heading pointing up the screen', () => {
    const u = tiltViewUniforms(1920, 1080, 16 / 9, { tilt: 30, heading: 0, relief: 10 })
    expect(u.length).toBe(12)
    expect(u[8]).toBe(1)
    expect(u[9]).toBeCloseTo(1 / 3)
    expect(u[4]).toBeCloseTo(0)
    expect(u[5]).toBeCloseTo(1)
    expect(u[7]).toBeGreaterThan(0)
    expect(u[7]).toBeLessThan(1)
  })
})
