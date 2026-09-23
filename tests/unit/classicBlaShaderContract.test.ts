import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

const shader = readFileSync(
  new URL('../../src/assets/mandelbrot_brush.wgsl', import.meta.url),
  'utf8',
);

describe('affine BLA shader safety contract', () => {
  it('covers the live-radius/f32-overflow window at the c=-2 reference', () => {
    const coefficient = 4 ** 64;
    const radius = 2e-6 / 4 ** 63;

    expect(Math.fround(coefficient)).toBe(Number.POSITIVE_INFINITY);
    expect(Math.fround(radius)).toBeGreaterThan(0);
    expect(Math.fround(coefficient) * 0).toBeNaN();

    expect(shader).toContain('const BLA_F32_EXP_LIMIT: i32 = 120;');
    expect(shader).toContain('let useF32 = bla_coefficients_fit_f32(bla);');
    expect(shader).toContain('bla_vec2_is_finite(candidate) && bla_vec2_is_finite(candidateZ)');
  });

  it('keeps the minimal kernel free of the block-table tiers', () => {
    for (const removed of ['try_apply_unified', 'try_apply_jet', 'try_apply_mobius', 'try_periodic_interior',
      'try_gate_jump', 'try_apply_renorm', 'evaluate_dynamic_validity', 'mandelbrotJetSuite', 'workStats']) {
      expect(shader).not.toContain(removed);
    }
    expect(shader).toContain('override ENABLE_DEEP: bool = true;');
    expect(shader.match(/^override /gm)).toHaveLength(1);
  });

  it('uses outward-rounded classic BLA radius evaluation in both kernels', () => {
    expect(shader).toContain('fn bla_affine_radius_log2(block: BlaStep, log2Dc: f32, log2Dz: f32) -> f32');
    // Both paths select their block through the one monotone level walk.
    expect(shader.match(/let radiusLog2 = bla_affine_radius_log2\(bla, log2Dc, log2Dz\);/g)).toHaveLength(1);
    expect(shader.match(/bla_accepted_level\(\*ref_i, /g)).toHaveLength(2);
  });

  it('never constructs a non-finite f32 constant in WGSL', () => {
    expect(shader).not.toMatch(/bitcast<f32>\((?:0xff800000u|0x7f800000u)\)/);
    expect(shader).toContain('return validity_neg_inf();');
    expect(shader).toContain('fn validity_pos_inf() -> f32 { return 3.4028234e38; }');
  });
});
