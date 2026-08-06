import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

const shader = readFileSync(
  new URL('../../src/assets/mandelbrot_brush.wgsl', import.meta.url),
  'utf8',
);

describe('classic BLA/Padé shader safety contract', () => {
  it('covers the live-radius/f32-overflow window at the c=-2 reference', () => {
    const coefficient = 4 ** 64;
    const radius = 2e-6 / 4 ** 63;

    expect(Math.fround(coefficient)).toBe(Number.POSITIVE_INFINITY);
    expect(Math.fround(radius)).toBeGreaterThan(0);
    expect(Math.fround(coefficient) * 0).toBeNaN();

    expect(shader).toContain('const BLA_F32_EXP_LIMIT: i32 = 120;');
    expect(shader).toContain('let useF32 = bla_coefficients_fit_f32(bla, false);');
    expect(shader).toContain('bla_vec2_is_finite(candidate) && bla_vec2_is_finite(candidateZ)');
  });

  it('keeps both Padé derivative paths on the full quotient derivative', () => {
    expect(shader).toContain('qMantissaF32 = aMantissa - cmul(cmul(bMantissa, dc), d);');
    expect(shader).toContain('let bdcD = fe_cmul(fe_cmul(b, dcFe), d);');
    expect(shader).toContain('let bdcD = fe_cmul(fe_cmul(b, dc), d);');
    expect(shader).not.toContain("D4 derivative der' = (A/M²)·der + B/M");
  });

  it('uses outward-rounded classic BLA radius evaluation in both kernels', () => {
    expect(shader).toContain('fn bla_affine_radius_log2(block: BlaStep, log2Dc: f32) -> f32');
    expect(shader.match(/let radiusLog2 = bla_affine_radius_log2\(bla, (?:log2Dc|log2_dc)\);/g)).toHaveLength(2);
  });

  it('never constructs a non-finite f32 constant in WGSL', () => {
    expect(shader).not.toMatch(/bitcast<f32>\((?:0xff800000u|0x7f800000u)\)/);
    expect(shader).toContain('return validity_neg_inf();');
    expect(shader).toContain('fn validity_pos_inf() -> f32 { return 3.4028234e38; }');
  });
});
