import {describe, expect, it} from 'vitest'
import {
  DIRECTION_COHERENCE_RELIEF_MAX_SLOPE,
  STRIPE_RELIEF_MAX_SLOPE,
  decodeDirectionCoherenceReliefTilt,
  decodeStripeReliefTilt,
  getEffectValue,
  normalizeColorStop,
  resolveDirectionCoherenceReliefTilt,
  resolveStripeReliefTilt,
} from '../../src/ColorStop'
import type {ColorStop} from '../../src/ColorStop'
import {Palette} from '../../src/Palette'

const stop = (extra: Partial<ColorStop>): ColorStop => ({ color: '#808080', position: 0, ...extra })

describe('relief tilt controls', () => {
  it('keeps zero off and one at the historical maximum slope', () => {
    expect(decodeStripeReliefTilt(0)).toBe(0)
    expect(decodeDirectionCoherenceReliefTilt(0)).toBe(0)
    expect(decodeStripeReliefTilt(1)).toBeCloseTo(STRIPE_RELIEF_MAX_SLOPE, 6)
    expect(decodeDirectionCoherenceReliefTilt(1)).toBeCloseTo(DIRECTION_COHERENCE_RELIEF_MAX_SLOPE, 4)
  })

  it('spends its range on tilt rather than on slope', () => {
    // Half the control is half the tilt angle, which is where the visible
    // change actually is: on the [0, 100] field that is a slope of ~1, not 50.
    expect(decodeDirectionCoherenceReliefTilt(0.5)).toBeLessThan(1.1)
    expect(decodeDirectionCoherenceReliefTilt(0.5)).toBeGreaterThan(0.9)
    expect(Math.atan(decodeDirectionCoherenceReliefTilt(0.5)))
      .toBeCloseTo(0.5 * Math.atan(DIRECTION_COHERENCE_RELIEF_MAX_SLOPE), 6)
  })

  it('is strictly increasing, so a lerp between stops never folds back', () => {
    let previous = -1
    for (let i = 0; i <= 20; i++) {
      const value = decodeDirectionCoherenceReliefTilt(i / 20)
      expect(value).toBeGreaterThan(previous)
      previous = value
    }
  })

  it('migrates legacy slope fields into the tilt domain', () => {
    expect(resolveStripeReliefTilt(stop({ stripeRelief: 0 }))).toBe(0)
    expect(decodeStripeReliefTilt(resolveStripeReliefTilt(stop({ stripeRelief: 1 })))).toBeCloseTo(1, 6)
    expect(
      decodeDirectionCoherenceReliefTilt(
        resolveDirectionCoherenceReliefTilt(stop({ directionCoherenceRelief: 1 })),
      ),
    ).toBeCloseTo(1, 5)
    // A preset written against the old [0, 100] range keeps its appearance.
    expect(
      decodeDirectionCoherenceReliefTilt(
        resolveDirectionCoherenceReliefTilt(stop({ directionCoherenceRelief: 100 })),
      ),
    ).toBeCloseTo(100, 3)
  })

  it('prefers the current field and drops the legacy alias on normalization', () => {
    const normalized = normalizeColorStop(stop({ stripeReliefTilt: 0.25, stripeRelief: 1 }))
    expect(normalized.stripeReliefTilt).toBe(0.25)
    expect(normalized.stripeRelief).toBeUndefined()
    expect(normalized.directionCoherenceRelief).toBeUndefined()
    expect(normalized.directionCoherenceReliefTilt).toBe(0)
  })

  it('interpolates the control, not the slope, between two stops', () => {
    const palette = new Palette([
      stop({ position: 0, directionCoherenceReliefTilt: 0 }),
      stop({ position: 1, directionCoherenceReliefTilt: 1 }),
    ])
    const middle = palette.getEffectAt(0.5, 'directionCoherenceReliefTilt')
    expect(middle).toBeCloseTo(0.5, 6)
    expect(getEffectValue(stop({ directionCoherenceReliefTilt: middle }), 'directionCoherenceReliefTilt'))
      .toBeCloseTo(0.5, 6)
  })
})
