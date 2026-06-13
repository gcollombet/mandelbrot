import {describe, expect, it} from 'vitest';
import {DEEP_EXP_THRESHOLD, frexpFloat32} from '../../src/floatexp';

const reconstruct = (m: number, e: number) => m * 2 ** e;

describe('frexpFloat32', () => {
  it('returns {0,0} for zero and non-finite inputs', () => {
    expect(frexpFloat32(0)).toEqual({mantissa: 0, exponent: 0});
    expect(frexpFloat32(NaN)).toEqual({mantissa: 0, exponent: 0});
    expect(frexpFloat32(Infinity)).toEqual({mantissa: 0, exponent: 0});
  });

  it('normalizes the mantissa to [0.5, 1) for shallow and deep values', () => {
    const samples = [1, 0.5, 2, 3.3, -1.75, 1e-3, 1e-10, 1e-35, 1e-100, 1e-300];
    for (const v of samples) {
      const {mantissa} = frexpFloat32(v);
      expect(Math.abs(mantissa)).toBeGreaterThanOrEqual(0.5);
      expect(Math.abs(mantissa)).toBeLessThan(1);
    }
  });

  it('round-trips mantissa·2^exponent within f32 mantissa precision', () => {
    const samples = [1, 0.5, 2, 3.3, -1.75, 1e-3, 1e-10, 1e-35, 1e-100, 1e-308];
    for (const v of samples) {
      const {mantissa, exponent} = frexpFloat32(v);
      const recon = reconstruct(mantissa, exponent);
      // f32 mantissa keeps ~24 bits → relative error below 2^-23 ≈ 1.2e-7.
      expect(Math.abs(recon / v - 1)).toBeLessThan(1.2e-7);
    }
  });

  it('gives exact exponents for powers of two', () => {
    // value = mantissa·2^exponent with mantissa = 0.5 → exponent = log2(value)+1.
    expect(frexpFloat32(1)).toEqual({mantissa: 0.5, exponent: 1});
    expect(frexpFloat32(2)).toEqual({mantissa: 0.5, exponent: 2});
    expect(frexpFloat32(0.5)).toEqual({mantissa: 0.5, exponent: 0});
    expect(frexpFloat32(0.25)).toEqual({mantissa: 0.5, exponent: -1});
  });

  it('handles f64 subnormals without NaN and keeps the mantissa normalized', () => {
    const v = 5e-320; // f64 subnormal (< 2.2e-308)
    const {mantissa, exponent} = frexpFloat32(v);
    expect(Number.isFinite(mantissa)).toBe(true);
    expect(Number.isFinite(exponent)).toBe(true);
    expect(Math.abs(mantissa)).toBeGreaterThanOrEqual(0.5);
    expect(Math.abs(mantissa)).toBeLessThan(1);
    // Reconstruction stays in the right ballpark despite reduced subnormal precision.
    expect(Math.abs(reconstruct(mantissa, exponent) / v - 1)).toBeLessThan(1e-2);
  });

  it('maps the ~1e-35 deep threshold to the expected exponent boundary', () => {
    // The shader switches to the fe path when expScale <= DEEP_EXP_THRESHOLD.
    expect(frexpFloat32(1e-35).exponent).toBeLessThanOrEqual(DEEP_EXP_THRESHOLD);
    expect(frexpFloat32(1e-34).exponent).toBeGreaterThan(DEEP_EXP_THRESHOLD);
    // A typical shallow view stays well above the threshold.
    expect(frexpFloat32(1e-6).exponent).toBeGreaterThan(DEEP_EXP_THRESHOLD);
  });
});
