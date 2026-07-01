import {describe, expect, it} from 'vitest';
import {computeScaleExponent} from '../../src/presetStore';

describe('computeScaleExponent', () => {
  it('matches floor(log10(1/scale)) for in-f64-range strings and numbers', () => {
    expect(computeScaleExponent('1e-30')).toBe(30);
    expect(computeScaleExponent('2.5')).toBe(-1);
    expect(computeScaleExponent(1e-30)).toBe(30);
    expect(computeScaleExponent(2.5)).toBe(-1);
  });

  it('returns 0 for non-positive/unparsable input', () => {
    expect(computeScaleExponent('0')).toBe(0);
    expect(computeScaleExponent('')).toBe(0);
    expect(computeScaleExponent(0)).toBe(0);
    expect(computeScaleExponent(-1)).toBe(0);
  });

  it('stays accurate far below the f64 floor for string scales (regression)', () => {
    // Number('1e-500') === 0, so the old `Number(scale)` path used to report 0
    // (no zoom) for every preset deeper than ~1e-308 instead of the real depth —
    // now reachable via the zoom slider's 1e-1000 range.
    expect(computeScaleExponent('1e-500')).toBe(500);
    expect(computeScaleExponent('1e-1000')).toBe(1000);
  });
});
