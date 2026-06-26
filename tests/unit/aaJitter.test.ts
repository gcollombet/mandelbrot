import {describe, expect, it} from 'vitest';
import {computeAaJitterOffset} from '../../src/Mandelbrot';

describe('computeAaJitterOffset', () => {
  it('returns {0,0} for sample 0 (unjittered base sample)', () => {
    expect(computeAaJitterOffset(0)).toEqual({x: 0, y: 0});
  });

  it('returns {0,0} for negative indices (defensive)', () => {
    expect(computeAaJitterOffset(-5)).toEqual({x: 0, y: 0});
  });

  it('produces offsets bounded to roughly [-1, 1] for many samples', () => {
    for (let i = 1; i <= 4096; i++) {
      const {x, y} = computeAaJitterOffset(i);
      expect(x).toBeGreaterThanOrEqual(-1.0000001);
      expect(x).toBeLessThanOrEqual(1.0000001);
      expect(y).toBeGreaterThanOrEqual(-1.0000001);
      expect(y).toBeLessThanOrEqual(1.0000001);
    }
  });

  it('is deterministic per index', () => {
    expect(computeAaJitterOffset(7)).toEqual(computeAaJitterOffset(7));
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
    // Tent warp is symmetric; a low-discrepancy set should average near 0.
    expect(Math.abs(sx / n)).toBeLessThan(0.05);
    expect(Math.abs(sy / n)).toBeLessThan(0.05);
  });
});
