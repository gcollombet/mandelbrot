import { afterEach, expect, it, vi } from 'vitest'
import { documentEffects, effectsSettings, expmapEffectsUniform, saveDocumentEffects } from '../../src/expmap/effects'
afterEach(() => vi.unstubAllGlobals())
it('keeps legacy views neutral and rejects malformed effect settings', () => {
  expect(expmapEffectsUniform(undefined, 999999)).toEqual([0, 0, 0, 0])
  for (const value of [{ droste: NaN }, { droste: 181 }, { kaleidoscope: 1 }, { kaleidoscope: 2.5 }, { kaleidoscope: 25 }, { orientation: Infinity }]) {
    expect(() => effectsSettings(value)).toThrow('Effets')
  }
})
it('preserves Droste phase across octave boundaries and bounds deep uniforms', () => {
  const e = { droste: -37, kaleidoscope: 7, orientation: 12 }
  const before = expmapEffectsUniform(e, 999998), after = expmapEffectsUniform(e, 999999)
  // Same physical sample on either side of the renderer base change.
  expect(Math.sin(before[1] + before[0] * 1.25)).toBeCloseTo(Math.sin(after[1] + after[0] * 0.25), 12)
  expect(Math.abs(after[1])).toBeLessThan(2 * Math.PI)
  expect(after[2]).toBe(7)
})
it('loads per-document preferences, shares edits and tolerates unavailable storage', () => {
  const getItem = vi.fn(() => JSON.stringify({ version: 1, effects: { droste: 25, kaleidoscope: 6, orientation: 15 } }))
  const setItem = vi.fn()
  vi.stubGlobal('localStorage', { getItem, setItem })
  expect(documentEffects('effects-loaded').droste).toBe(25)
  saveDocumentEffects('effects-loaded', { droste: -10 })
  expect(documentEffects('effects-loaded')).toMatchObject({ droste: -10, kaleidoscope: 0, orientation: 0 })
  expect(JSON.parse(setItem.mock.calls[0][1]).effects.droste).toBe(-10)
  getItem.mockReturnValue('{broken')
  expect(documentEffects('effects-broken').droste).toBe(0)
  setItem.mockImplementation(() => { throw new Error('quota') })
  saveDocumentEffects('effects-memory', { kaleidoscope: 8 })
  expect(documentEffects('effects-memory').kaleidoscope).toBe(8)
})

it('uses fixed screen axes, independent rotation, or natural Droste tracking', () => {
  const depth = 3.5, phase = 30 * depth
  const settings = { droste: 30, kaleidoscope: 6, orientation: 12 }
  const screenAxis = (mode: 'fixed' | 'progressive' | 'droste') =>
    expmapEffectsUniform({ ...settings, rotationMode: mode, rotationSpeed: 20 }, 3, depth, 2)[3] * 180 / Math.PI - phase
  expect(screenAxis('fixed')).toBeCloseTo(12)
  expect(screenAxis('progressive')).toBeCloseTo(52)
  expect(screenAxis('droste')).toBeCloseTo(12 - phase)
})

it('rotates the whole image by radians per octave and exactly tracks Droste phase', async () => {
  const { expmapImageRotation } = await import('../../src/expmap/effects')
  expect(expmapImageRotation({ imageRotationMode: 'octave', imageRotationRate: 0.25 }, 4)).toBe(1)
  expect(expmapImageRotation({ imageRotationMode: 'octave', imageRotationRate: 0.25 }, -4)).toBe(-1)
  for (const depth of [0, 0.999999, 1, 1.000001, 100000.25]) {
    const effects = { droste: -37, imageRotationMode: 'droste' as const }
    const base = Math.floor(depth), localRadiusDepth = 2.75
    const uniform = expmapEffectsUniform(effects, base, depth)
    const phase = expmapImageRotation(effects, depth) + uniform[1] + uniform[0] * (depth - base + localRadiusDepth)
    expect(Math.sin(phase)).toBeCloseTo(Math.sin(uniform[0] * localRadiusDepth), 9)
    expect(Math.cos(phase)).toBeCloseTo(Math.cos(uniform[0] * localRadiusDepth), 9)
  }
  expect(() => effectsSettings({ imageRotationRate: NaN })).toThrow('Rotation globale')
})
