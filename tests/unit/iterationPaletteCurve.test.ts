import {describe, expect, it} from 'vitest';
import {computeOffsetForPhase, computePalettePhase, type IterationData} from '../../src/CursorCoordinate';
import {
  applyIterationPaletteCurve,
  ITERATION_PALETTE_CURVES,
  iterationPaletteCurveCode,
  iterationPaletteCurveDerivative,
  normalizeIterationPaletteCurve,
} from '../../src/IterationPaletteCurve';

describe('iteration palette curves', () => {
  it('normalizes missing and unknown values to the legacy Linear mode', () => {
    expect(normalizeIterationPaletteCurve(undefined)).toBe('linear');
    expect(normalizeIterationPaletteCurve('unknown')).toBe('linear');
    expect(iterationPaletteCurveCode(undefined)).toBe(0);
    expect(iterationPaletteCurveCode('unknown')).toBe(0);
  });

  it('uses stable numeric renderer codes', () => {
    expect(iterationPaletteCurveCode('linear')).toBe(0);
    expect(iterationPaletteCurveCode('soft-root')).toBe(1);
    expect(iterationPaletteCurveCode('logarithmic')).toBe(2);
    expect(iterationPaletteCurveCode('quadratic')).toBe(3);
  });

  it('anchors every curve at zero and the first complete cycle', () => {
    for (const curve of ITERATION_PALETTE_CURVES) {
      expect(applyIterationPaletteCurve(0, curve)).toBeCloseTo(0, 12);
      expect(applyIterationPaletteCurve(1, curve)).toBeCloseTo(1, 12);
    }
  });

  it('keeps every curve monotone on the renderer domain', () => {
    const coordinates = [0, 0.01, 0.1, 0.5, 1, 2, 4, 16];
    for (const curve of ITERATION_PALETTE_CURVES) {
      const values = coordinates.map(value => applyIterationPaletteCurve(value, curve));
      for (let index = 1; index < values.length; index++) {
        expect(values[index]).toBeGreaterThan(values[index - 1]);
      }
    }
  });

  it('compresses high iterations for Root and Log and expands them for Quadratic', () => {
    const u = 4;
    expect(applyIterationPaletteCurve(u, 'soft-root')).toBeLessThan(u);
    expect(applyIterationPaletteCurve(u, 'logarithmic')).toBeLessThan(u);
    expect(applyIterationPaletteCurve(u, 'quadratic')).toBeGreaterThan(u);
  });

  it('matches each analytical derivative with a centered finite difference', () => {
    const epsilon = 1e-6;
    for (const curve of ITERATION_PALETTE_CURVES) {
      for (const coordinate of [0.25, 1, 4]) {
        const numerical = (
          applyIterationPaletteCurve(coordinate + epsilon, curve)
          - applyIterationPaletteCurve(coordinate - epsilon, curve)
        ) / (2 * epsilon);
        expect(iterationPaletteCurveDerivative(coordinate, curve)).toBeCloseTo(numerical, 6);
      }
    }
  });
});

describe('cursor palette phase with iteration curves', () => {
  const data: IterationData = {
    iter: 7,
    zx: 4,
    zy: 1,
  };

  it('matches the curved normalized smooth iteration before wrapping', () => {
    const period = 20;
    const offset = 0.17;
    for (const curve of ITERATION_PALETTE_CURVES) {
      const result = computePalettePhase(data, 4, period, offset, true, false, curve);
      const expectedRaw = applyIterationPaletteCurve(result.nu * 2 / period, curve) + offset;
      expect(result.phase).toBeCloseTo(((expectedRaw % 1) + 1) % 1, 12);
    }
  });

  it('computes an offset that places the requested curved phase under the cursor', () => {
    const nu = 12.75;
    const period = 18;
    const target = 0.42;
    for (const curve of ITERATION_PALETTE_CURVES) {
      const offset = computeOffsetForPhase(nu, period, target, curve);
      const phase = (applyIterationPaletteCurve(nu * 2 / period, curve) + offset) % 1;
      expect(phase).toBeCloseTo(target, 12);
    }
  });
});
