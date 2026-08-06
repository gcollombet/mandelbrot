import { describe, expect, it } from 'vitest'
import {
  DISPLAY_BYTES_PER_TEXEL,
  QUANTIZED_FIELD_MAX,
  analyticDistanceHeightGradient,
  analyticDistanceHeightLaplacian,
  circularPhaseDelta,
  effectiveSupportStep,
  float16ToFloat32,
  float32ToFloat16,
  isDisplaySetCurrent,
  isEscapeBranchTransition,
  normalizeDisplayGeometry,
  packDisplayMetadata,
  selectFinestDisplaySource,
  supportStepForExponent,
  unpackDisplayMetadata,
} from '../../src/displayGeometry'

describe('packed display metadata', () => {
  it('round-trips the boundary provenance and unit fields', () => {
    expect(DISPLAY_BYTES_PER_TEXEL).toBe(24)
    for (const step of [1, 2, 32768]) {
      const decoded = unpackDisplayMetadata(packDisplayMetadata(step, 1, step === 1 ? 0 : 1))
      expect(decoded.supportStep).toBe(step)
      expect(decoded.stripePhase).toBe(0)
      expect(decoded.coherence).toBe(step === 1 ? 0 : 1)
    }
    expect(supportStepForExponent(15)).toBe(32768)
    // Metadata zero means exact support; no-data is carried orthogonally by iter=-1.
    expect(unpackDisplayMetadata(0).supportStep).toBe(1)
  })

  it('keeps stripe phase circular and bounds scalar quantization error', () => {
    const decoded = unpackDisplayMetadata(packDisplayMetadata(8, 0.99997, 0.4321))
    expect(Math.abs(circularPhaseDelta(decoded.stripePhase, 0.99997))).toBeLessThanOrEqual(1 / QUANTIZED_FIELD_MAX)
    expect(Math.abs(decoded.coherence - 0.4321)).toBeLessThanOrEqual(1 / QUANTIZED_FIELD_MAX)
    expect(Math.abs(circularPhaseDelta(0.01, 0.99))).toBeCloseTo(0.02)
  })
})

describe('cached geometry normalization', () => {
  it('normalizes height, gradient, and curvature with the source ratio', () => {
    const normalized = normalizeDisplayGeometry({ gradientX: 2, gradientY: -3, curvature: 4, height: 5 }, 0.5)
    expect(normalized.gradientX).toBeCloseTo(1)
    expect(normalized.gradientY).toBeCloseTo(-1.5)
    expect(normalized.curvature).toBeCloseTo(1)
    expect(normalized.height).toBeCloseTo(5 + Math.log(0.5))
  })

  it('rotates the gradient without rotating scalar channels', () => {
    const normalized = normalizeDisplayGeometry({ gradientX: 2, gradientY: 0, curvature: 3, height: 4 }, 1, Math.PI / 2)
    expect(normalized.gradientX).toBeCloseTo(0)
    expect(normalized.gradientY).toBeCloseTo(2)
    expect(normalized.curvature).toBe(3)
    expect(normalized.height).toBe(4)
  })

  it('keeps every normalized storage channel finite at extreme ratios', () => {
    expect(normalizeDisplayGeometry({ gradientX: 64, gradientY: -64, curvature: 64, height: 64 }, 1e30))
      .toEqual({ gradientX: 64, gradientY: -64, curvature: 64, height: 64 })
    expect(normalizeDisplayGeometry({ gradientX: 0, gradientY: 0, curvature: -1, height: 0 }, 1).curvature)
      .toBe(0)
  })

})

describe('display cache lifecycle', () => {
  it('reuses only a finalized cache at the current field version', () => {
    expect(isDisplaySetCurrent(7, 7)).toBe(true)
    expect(isDisplaySetCurrent(7, 6)).toBe(false)
    expect(isDisplaySetCurrent(0, -1)).toBe(false)
  })

  it('selects live/frozen quality after converting both supports to display units', () => {
    const live = packDisplayMetadata(2, 0, 0)
    const frozen = packDisplayMetadata(1, 0, 0)
    expect(effectiveSupportStep(live, 0.5)).toBe(1)
    expect(selectFinestDisplaySource({
      liveMetadata: live,
      liveScaleRatio: 0.5,
      frozenMetadata: frozen,
      frozenScaleRatio: 2,
    })).toBe('live')
    expect(selectFinestDisplaySource({
      liveMetadata: live,
      liveScaleRatio: 2,
      frozenMetadata: frozen,
      frozenScaleRatio: 1,
    })).toBe('frozen')
    expect(selectFinestDisplaySource({ liveScaleRatio: 1, frozenScaleRatio: 1 })).toBe('none')
  })
})

describe('analytic distance-height gradient', () => {
  it('matches a direct fixed-branch complex evaluation', () => {
    const z: [number, number] = [3, 2]
    const zp: [number, number] = [5, -1]
    const zpp: [number, number] = [7, 4]
    const delta = 1e-3
    const got = analyticDistanceHeightGradient({
      z,
      derivativeMantissa: zp,
      derivativeLogScale: 0,
      secondDerivativeLogMagnitude: Math.log(Math.hypot(...zpp)),
      secondDerivativeAngle: Math.atan2(zpp[1], zpp[0]),
      logTexelDelta: Math.log(delta),
    })
    expect(got).not.toBeNull()
    const div = (a: [number, number], b: [number, number]): [number, number] => {
      const d = b[0] ** 2 + b[1] ** 2
      return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]
    }
    const first = div(zpp, zp)
    const second = div(zp, z)
    const coefficient = 1 + 1 / Math.log(Math.hypot(...z))
    expect(got![0]).toBeCloseTo((first[0] - coefficient * second[0]) * delta, 10)
    expect(got![1]).toBeCloseTo((first[1] - coefficient * second[1]) * delta, 10)
  })

  it('rejects absent and non-finite second-derivative payloads', () => {
    const base = {
      z: [3, 0] as [number, number],
      derivativeMantissa: [1, 0] as [number, number],
      derivativeLogScale: 0,
      secondDerivativeAngle: 0,
      logTexelDelta: -5,
    }
    expect(analyticDistanceHeightGradient({ ...base, secondDerivativeLogMagnitude: 1e35 })).toBeNull()
    expect(analyticDistanceHeightGradient({ ...base, secondDerivativeLogMagnitude: Number.NaN })).toBeNull()
  })

  it('matches finite differences while the escape branch stays fixed', () => {
    type Complex = [number, number]
    const add = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]]
    const mul = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
    const scale = (a: Complex, s: number): Complex => [a[0] * s, a[1] * s]
    const z: Complex = [5, 3]
    const zp: Complex = [4, -2]
    const zpp: Complex = [1.5, 0.75]
    const h = (delta: Complex): number => {
      const shiftedZ = add(z, add(mul(zp, delta), scale(mul(zpp, mul(delta, delta)), 0.5)))
      const shiftedZp = add(zp, mul(zpp, delta))
      const radius = Math.hypot(...shiftedZ)
      return -Math.log(radius * Math.log(radius) / (2 * Math.hypot(...shiftedZp)))
    }
    const epsilon = 1e-5
    const finiteX = (h([epsilon, 0]) - h([-epsilon, 0])) / 2
    // Texture y grows downward, i.e. toward negative imaginary c.
    const finiteYDown = (h([0, -epsilon]) - h([0, epsilon])) / 2
    const analytic = analyticDistanceHeightGradient({
      z,
      derivativeMantissa: zp,
      derivativeLogScale: 0,
      secondDerivativeLogMagnitude: Math.log(Math.hypot(...zpp)),
      secondDerivativeAngle: Math.atan2(zpp[1], zpp[0]),
      logTexelDelta: Math.log(epsilon),
    })!
    expect(analytic[0]).toBeCloseTo(finiteX, 8)
    expect(analytic[1]).toBeCloseTo(finiteYDown, 8)
  })

  it('classifies escape-branch transitions outside the analytic error sample', () => {
    expect(isEscapeBranchTransition(42, [42, 42, 42, 42])).toBe(false)
    expect(isEscapeBranchTransition(42, [42, 43, 42, 42])).toBe(true)
  })
})

describe('analytic distance-height Laplacian', () => {
  it('matches the closed fixed-branch expression', () => {
    const z: [number, number] = [3, 2]
    const zp: [number, number] = [5, -1]
    const delta = 1e-3
    const got = analyticDistanceHeightLaplacian({
      z,
      derivativeMantissa: zp,
      derivativeLogScale: 0,
      logTexelDelta: Math.log(delta),
    })
    const expected = (Math.hypot(...zp) / Math.hypot(...z) / Math.log(Math.hypot(...z))) ** 2 * delta ** 2
    expect(got).toBeCloseTo(expected, 12)
  })

  it('matches a five-point trace while the escape branch stays fixed', () => {
    type Complex = [number, number]
    const add = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]]
    const mul = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
    const scale = (a: Complex, s: number): Complex => [a[0] * s, a[1] * s]
    const z0: Complex = [3, 2]
    const zp0: Complex = [1, -1]
    const zpp: Complex = [0.6, 0.4]
    const evaluate = (delta: Complex): number => {
      const z = add(z0, add(mul(zp0, delta), scale(mul(zpp, mul(delta, delta)), 0.5)))
      const zp = add(zp0, mul(zpp, delta))
      const radius = Math.hypot(...z)
      return Math.log(Math.hypot(...zp)) - Math.log(radius) - Math.log(Math.log(radius))
    }
    const epsilon = 1e-3
    const trace = evaluate([epsilon, 0]) + evaluate([-epsilon, 0])
      + evaluate([0, epsilon]) + evaluate([0, -epsilon]) - 4 * evaluate([0, 0])
    const analytic = analyticDistanceHeightLaplacian({
      z: z0,
      derivativeMantissa: zp0,
      derivativeLogScale: 0,
      logTexelDelta: Math.log(epsilon),
    })!
    expect(analytic).toBeCloseTo(trace, 9)
  })

  it('rejects invalid exterior payloads', () => {
    expect(analyticDistanceHeightLaplacian({
      z: [1, 0], derivativeMantissa: [1, 0], derivativeLogScale: 0, logTexelDelta: -5,
    })).toBeNull()
    expect(analyticDistanceHeightLaplacian({
      z: [3, 0], derivativeMantissa: [Number.NaN, 0], derivativeLogScale: 0, logTexelDelta: -5,
    })).toBeNull()
  })
})

describe('rgba16float geometry oracle', () => {
  it('keeps representative shallow/deep normalized fields finite and bounded', () => {
    const representative = [
      -64, -31.7, -8.125, -1, -0.12345, -1e-3, 0, 1e-3,
      0.12345, 1, 8.125, 31.7, 64,
    ]
    let maxError = 0
    let maxRelativeError = 0
    for (const value of representative) {
      const decoded = float16ToFloat32(float32ToFloat16(value))
      expect(Number.isFinite(decoded)).toBe(true)
      maxError = Math.max(maxError, Math.abs(decoded - value))
      if (Math.abs(value) > 1e-6) {
        maxRelativeError = Math.max(maxRelativeError, Math.abs(decoded - value) / Math.abs(value))
      }
    }
    expect(maxError).toBeLessThanOrEqual(0.02)
    expect(maxRelativeError).toBeLessThanOrEqual(1e-3)
  })

  it('quantifies every channel on representative shallow and deep normalized fields', () => {
    const fields = [
      normalizeDisplayGeometry({ gradientX: 0.0137, gradientY: -0.208, curvature: 0.031, height: 3.75 }, 1),
      normalizeDisplayGeometry({ gradientX: 3.125, gradientY: -7.875, curvature: 1.9375, height: 42.25 }, 0.125),
      normalizeDisplayGeometry({ gradientX: -12.3, gradientY: 0.0047, curvature: -9.2, height: -18.6 }, 8),
    ]
    let maxAbsoluteError = 0
    let maxRelativeError = 0
    let saturatedChannels = 0
    for (const field of fields) {
      for (const value of [field.gradientX, field.gradientY, field.curvature, field.height]) {
        const half = float16ToFloat32(float32ToFloat16(value))
        const error = Math.abs(half - value)
        maxAbsoluteError = Math.max(maxAbsoluteError, error)
        if (Math.abs(value) > 1e-5) maxRelativeError = Math.max(maxRelativeError, error / Math.abs(value))
        if (Math.abs(value) === 64) saturatedChannels++
      }
    }
    expect(maxAbsoluteError).toBeLessThan(0.02)
    expect(maxRelativeError).toBeLessThan(1e-3)
    // The deep zoom-ratio specimen deliberately reaches the documented clamp.
    expect(saturatedChannels).toBeGreaterThan(0)
  })
})
