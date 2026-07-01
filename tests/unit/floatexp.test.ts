import {describe, expect, it} from 'vitest';
import {DEEP_EXP_THRESHOLD, frexpFloat32, frexpFromDecimalString, log2FromDecimalString} from '../../src/floatexp';

const reconstruct = (m: number, e: number) => m * 2 ** e;
const LOG2_10 = 3.321928094887362;

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

  it('frexpFromDecimalString round-trips in-f64-range decimal strings', () => {
    const samples = ['1', '2', '0.5', '-1.75', '1234.5', '1e-35', '1e-100', '1e-300'];
    for (const s of samples) {
      const {mantissa, exponent} = frexpFromDecimalString(s);
      expect(Math.abs(reconstruct(mantissa, exponent) / parseFloat(s) - 1)).toBeLessThan(1e-6);
      if (parseFloat(s) !== 0) {
        expect(Math.abs(mantissa)).toBeGreaterThanOrEqual(0.5);
        expect(Math.abs(mantissa)).toBeLessThan(1);
      }
    }
  });

  it('frexpFromDecimalString works far below the f64 floor (no f64 underflow)', () => {
    // parseFloat("1e-500") === 0, so the f64 path is dead here — but the string
    // path must still produce a correct (mantissa, base-2 exponent).
    for (const deep of [400, 500, 1000, 5000]) {
      const {mantissa, exponent} = frexpFromDecimalString(`1e-${deep}`);
      expect(Math.abs(mantissa)).toBeGreaterThanOrEqual(0.5);
      expect(Math.abs(mantissa)).toBeLessThan(1);
      // exponent ≈ floor(-deep · log2(10)), within a couple ULPs of normalization.
      expect(Math.abs(exponent - -deep * LOG2_10)).toBeLessThan(2);
    }
    // negative sign is preserved
    expect(frexpFromDecimalString('-1e-500').mantissa).toBeLessThan(0);
    // zero / malformed are safe
    expect(frexpFromDecimalString('0')).toEqual({mantissa: 0, exponent: 0});
    expect(frexpFromDecimalString('')).toEqual({mantissa: 0, exponent: 0});
  });

  it('frexpFromDecimalString agrees with frexpFloat32 on the deep threshold', () => {
    expect(frexpFromDecimalString('1e-31').exponent).toBeLessThanOrEqual(DEEP_EXP_THRESHOLD);
    expect(frexpFromDecimalString('1e-29').exponent).toBeGreaterThan(DEEP_EXP_THRESHOLD);
  });

  it('maps the ~1e-30 deep threshold to the expected exponent boundary', () => {
    // The shader switches to the fe path when expScale <= DEEP_EXP_THRESHOLD.
    expect(frexpFloat32(1e-31).exponent).toBeLessThanOrEqual(DEEP_EXP_THRESHOLD);
    expect(frexpFloat32(1e-29).exponent).toBeGreaterThan(DEEP_EXP_THRESHOLD);
    // A typical shallow view stays well above the threshold.
    expect(frexpFloat32(1e-6).exponent).toBeGreaterThan(DEEP_EXP_THRESHOLD);
  });

  it('log2FromDecimalString matches Math.log2 within the f64 range', () => {
    for (const s of ['1', '2', '0.5', '1234.5', '1e-35', '1e-100', '1e-300']) {
      expect(log2FromDecimalString(s)).toBeCloseTo(Math.log2(parseFloat(s)), 6);
    }
  });

  it('log2FromDecimalString stays finite far below the f64 floor, unlike Math.log2(parseFloat(s))', () => {
    // Regression: maxIterations used to be derived via Math.log2(1/parseFloat(scale)).
    // Below ~5e-324 parseFloat(s) underflows to exactly 0, so 1/0 = Infinity and the
    // iteration count pinned at its 10M ceiling instead of scaling with depth.
    expect(parseFloat('1e-320')).not.toBe(0); // still a (degraded) f64 subnormal
    expect(parseFloat('1e-330')).toBe(0); // genuinely underflowed
    expect(Number.isFinite(Math.log2(parseFloat('1e-330')))).toBe(false);

    for (const deep of [320, 330, 500, 1000, 5000]) {
      const v = log2FromDecimalString(`1e-${deep}`);
      expect(Number.isFinite(v)).toBe(true);
      // log2(1e-deep) ≈ -deep · log2(10), within rounding of the leading digits.
      expect(Math.abs(v - -deep * LOG2_10)).toBeLessThan(1e-6);
    }
  });
});
