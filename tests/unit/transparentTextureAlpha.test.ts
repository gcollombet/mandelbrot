import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

type Rgba = readonly [number, number, number, number];
type Rgb = readonly [number, number, number];

function blendTextureSample(base: Rgb, sample: Rgba, imageBlend: number): Rgb {
  const opacity = Math.max(0, Math.min(1, imageBlend * sample[3]));
  return [
    base[0] * (1 - opacity) + sample[0] * opacity,
    base[1] * (1 - opacity) + sample[1] * opacity,
    base[2] * (1 - opacity) + sample[2] * opacity,
  ];
}

function visibleTextureRgb(sample: Rgba): Rgb {
  return [sample[0] * sample[3], sample[1] * sample[3], sample[2] * sample[3]];
}

function expectRgbClose(actual: Rgb, expected: Rgb): void {
  expect(actual[0]).toBeCloseTo(expected[0]);
  expect(actual[1]).toBeCloseTo(expected[1]);
  expect(actual[2]).toBeCloseTo(expected[2]);
}

describe('transparent texture alpha contract', () => {
  it('uses texture alpha as a contribution mask', () => {
    const base: Rgb = [0.2, 0.4, 0.6];
    const hiddenRgbTransparent: Rgba = [1.0, 0.0, 0.0, 0.0];
    const halfAlpha: Rgba = [1.0, 0.0, 0.0, 0.5];
    const opaque: Rgba = [1.0, 0.0, 0.0, 1.0];

    expectRgbClose(blendTextureSample(base, hiddenRgbTransparent, 1.0), base);
    expectRgbClose(blendTextureSample(base, halfAlpha, 1.0), [0.6, 0.2, 0.3]);
    expectRgbClose(blendTextureSample(base, opaque, 1.0), [1.0, 0.0, 0.0]);
    expectRgbClose(blendTextureSample(base, opaque, 0.25), [0.4, 0.3, 0.45]);
  });

  it('removes hidden RGB from transparent relief samples', () => {
    expectRgbClose(visibleTextureRgb([0.9, 0.8, 0.7, 0.0]), [0.0, 0.0, 0.0]);
    expectRgbClose(visibleTextureRgb([0.8, 0.6, 0.4, 0.5]), [0.4, 0.3, 0.2]);
  });

  it('keeps the WGSL implementation wired to alpha-aware blending', () => {
    const shader = readFileSync(new URL('../../src/assets/color.wgsl', import.meta.url), 'utf8');

    expect(shader).toContain('fn tile_tessellation(tex_: texture_2d<f32>, v: f32, dist: f32, repeat: f32) -> vec4<f32>');
    expect(shader).toContain('color = mix(color, tessSample.rgb, clamp(effTess * tessSample.a, 0.0, 1.0));');
    expect(shader).toContain('return tile.rgb * tile.a;');
  });
});
