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
  expect(documentEffects('effects-loaded')).toEqual({ droste: -10, kaleidoscope: 0, orientation: 0 })
  expect(JSON.parse(setItem.mock.calls[0][1]).effects.droste).toBe(-10)
  getItem.mockReturnValue('{broken')
  expect(documentEffects('effects-broken').droste).toBe(0)
  setItem.mockImplementation(() => { throw new Error('quota') })
  saveDocumentEffects('effects-memory', { kaleidoscope: 8 })
  expect(documentEffects('effects-memory').kaleidoscope).toBe(8)
})
