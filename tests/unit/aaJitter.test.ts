import {describe, expect, it} from 'vitest';
import {computeAaJitterOffset, rotateAaJitterToScene} from '../../src/Mandelbrot';

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

  it('stratifies the actual accumulated prefixes across every quadrant', () => {
    const quadrant = (x: number, y: number) => (x >= 0 ? 1 : 0) + (y >= 0 ? 2 : 0);
    const seen8 = new Set<number>();
    // AA level 8 consumes sample indices 0..7 (not 1..8).
    for (let i = 0; i < 8; i++) {
      const {x, y} = computeAaJitterOffset(i);
      seen8.add(quadrant(x, y));
    }
    expect(seen8.size).toBe(4);
    // 16-prefix balance: no quadrant may hog more than half the samples.
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 16; i++) {
      const {x, y} = computeAaJitterOffset(i);
      counts[quadrant(x, y)]++;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(2);
      expect(c).toBeLessThanOrEqual(8);
    }
  });

  it('keeps every finite UI prefix centred instead of coherently shifting the image', () => {
    for (let n = 4; n <= 64; n++) {
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < n; i++) {
        const {x, y} = computeAaJitterOffset(i);
        sx += x;
        sy += y;
      }
      expect(Math.abs(sx / n)).toBeLessThan(0.05);
      expect(Math.abs(sy / n)).toBeLessThan(0.05);
    }
  });

  it('retains fine R2 stratification at 16 samples', () => {
    const occupied = new Set<string>();
    for (let i = 0; i < 16; i++) {
      const {x, y} = computeAaJitterOffset(i);
      occupied.add(`${Math.floor((x + 0.5) * 4)},${Math.floor((y + 0.5) * 4)}`);
    }
    expect(occupied.size).toBeGreaterThanOrEqual(14);
  });

  it('rotates screen-space jitter into the scene frame without changing its footprint', () => {
    const screen = {x: 0.5, y: -0.25};
    const angle = Math.PI / 3;
    const scene = rotateAaJitterToScene(screen, angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Inverse scene rotation recovers the original screen-aligned offset.
    expect(cos * scene.x + sin * scene.y).toBeCloseTo(screen.x, 12);
    expect(-sin * scene.x + cos * scene.y).toBeCloseTo(screen.y, 12);
    expect(Math.hypot(scene.x, scene.y)).toBeCloseTo(Math.hypot(screen.x, screen.y), 12);
  });
});
