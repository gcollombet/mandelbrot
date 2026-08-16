import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const present = read('../../src/assets/present.wgsl');

describe('present pass downscale contract', () => {
  it('exposes the reduction factor as a pipeline override defaulting to 1:1', () => {
    expect(present).toContain('override DOWNSCALE: i32 = 1;');
  });

  // The gamma mistake this whole task exists to prevent: reducing after the
  // sRGB encode darkens edges on every exported frame. Assert the ordering
  // structurally, since no unit test can observe the GPU output.
  it('reduces in linear light, before the sRGB encode', () => {
    const reductionAt = present.indexOf('let lin = sum / f32(DOWNSCALE * DOWNSCALE);');
    const encodeAt = present.indexOf('linear_to_sRGB(lin)');
    expect(reductionAt).toBeGreaterThan(-1);
    expect(encodeAt).toBeGreaterThan(-1);
    expect(reductionAt).toBeLessThan(encodeAt);
  });

  it('accumulates the block with an explicit box filter, not a bilinear sampler', () => {
    expect(present).toContain('for (var dy = 0; dy < DOWNSCALE; dy = dy + 1)');
    expect(present).toContain('for (var dx = 0; dx < DOWNSCALE; dx = dx + 1)');
    expect(present).toContain('textureLoad(accumTex, base + vec2<i32>(dx, dy), 0)');
    // A sampler at an exact 2:1 ratio only averages correctly at one precise
    // offset; an explicit load loop has no such trap.
    expect(present).not.toContain('textureSample');
    expect(present).not.toContain('sampler');
  });

  // Under adaptive AA, texels hold different accepted-sample counts. Dividing
  // each by its own count before averaging is a box filter over means; summing
  // rgb and alpha and dividing once weights texels by their sample count.
  it('normalises each source texel by its own sample count before averaging', () => {
    expect(present).toContain('sum = sum + acc.rgb / max(acc.a, 1.0);');
  });

  it('dithers at output resolution as the final step', () => {
    const encodeAt = present.indexOf('linear_to_sRGB(lin)');
    const ditherAt = present.indexOf('dither_8bit(fragPos.xy)');
    expect(ditherAt).toBeGreaterThan(encodeAt);
  });

  // With DOWNSCALE = 1 the loop runs once at base = coord, so the real-time
  // path keeps exactly the arithmetic it had before the override existed.
  it('keeps the source coordinate unscaled at factor 1', () => {
    expect(present).toContain('let base = vec2<i32>(i32(fragPos.x), i32(fragPos.y)) * DOWNSCALE;');
  });
});
