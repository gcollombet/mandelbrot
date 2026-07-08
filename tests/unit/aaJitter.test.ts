import {describe, expect, it} from 'vitest';
import {computeAaJitterOffset} from '../../src/Mandelbrot';

describe('computeAaJitterOffset', () => {
  it('returns {0,0} for sample 0 (unjittered base sample)', () => {
    expect(computeAaJitterOffset(0)).toEqual({x: 0, y: 0});
  });

  it('returns {0,0} for negative indices (defensive)', () => {
    expect(computeAaJitterOffset(-5)).toEqual({x: 0, y: 0});
  });

  it('produces offsets bounded to the box footprint [-0.5, 0.5] for many samples', () => {
    for (let i = 1; i <= 4096; i++) {
      const {x, y} = computeAaJitterOffset(i);
      expect(x).toBeGreaterThanOrEqual(-0.5000001);
      expect(x).toBeLessThanOrEqual(0.5000001);
      expect(y).toBeGreaterThanOrEqual(-0.5000001);
      expect(y).toBeLessThanOrEqual(0.5000001);
    }
  });

  it('is deterministic per index', () => {
    expect(computeAaJitterOffset(7)).toEqual(computeAaJitterOffset(7));
  });

  it('stratifies small prefixes: every quadrant hit within the first 8 samples, all 16 spread', () => {
    // The R2 pair (1/φ, 1/φ²) with the PLASTIC constant (x³ = x + 1) keeps
    // low-discrepancy prefixes; the long-standing wrong constant (root of
    // x⁴ = x + 1, the R3 value) clustered the first samples in one corner of
    // the pixel — band edges quantized unevenly at 4–16× AA.
    const quadrant = (x: number, y: number) => (x >= 0 ? 1 : 0) + (y >= 0 ? 2 : 0);
    const seen8 = new Set<number>();
    for (let i = 1; i <= 8; i++) {
      const {x, y} = computeAaJitterOffset(i);
      seen8.add(quadrant(x, y));
    }
    expect(seen8.size).toBe(4);
    // 16-prefix balance: no quadrant may hog more than half the samples.
    const counts = [0, 0, 0, 0];
    for (let i = 1; i <= 16; i++) {
      const {x, y} = computeAaJitterOffset(i);
      counts[quadrant(x, y)]++;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(2);
      expect(c).toBeLessThanOrEqual(8);
    }
  });

  it('spreads samples (low discrepancy): mean offset near zero over a full cycle', () => {
    let sx = 0;
    let sy = 0;
    const n = 1024;
    for (let i = 1; i <= n; i++) {
      const {x, y} = computeAaJitterOffset(i);
      sx += x;
      sy += y;
    }
    // Uniform box; a low-discrepancy set should average near 0.
    expect(Math.abs(sx / n)).toBeLessThan(0.05);
    expect(Math.abs(sy / n)).toBeLessThan(0.05);
  });
});
