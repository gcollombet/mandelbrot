import { expect, it } from 'vitest'
import { effectRotationDegrees, validateEffectRotation } from '../../src/expmap/effectRotation'
it('rotates progressively in both directions and remains deterministic when seeking', () => {
  const settings = { rotationMode: 'progressive' as const, rotationSpeed: -12 }
  expect(effectRotationDegrees(settings, 5, 100, 30)).toBe(-60)
  expect(effectRotationDegrees(settings, 2, 100, 30)).toBe(-24)
  expect(effectRotationDegrees(settings, 5, 100, 30)).toBe(-60)
})
it('tracks signed Droste depth independently of playback speed', () => {
  const settings = { rotationMode: 'droste' as const, rotationSpeed: 10 }
  expect(effectRotationDegrees(settings, 1, 4, 30)).toBe(-120)
  expect(effectRotationDegrees(settings, 50, 4, 30)).toBe(-120)
  expect(effectRotationDegrees(settings, 50, -4, 30)).toBe(120)
  expect(effectRotationDegrees(settings, 50, 4, 0)).toBeCloseTo(0)
})
it('keeps fixed rotation neutral and rejects invalid saved settings', () => {
  expect(effectRotationDegrees({ rotationMode: 'fixed', rotationSpeed: 10 }, 50, 4, 30)).toBe(0)
  expect(() => validateEffectRotation({ rotationMode: 'progressive', rotationSpeed: NaN })).toThrow()
})
