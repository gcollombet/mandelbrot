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
    const reductionAt = present.indexOf('lin = sum / f32(DOWNSCALE * DOWNSCALE);');
    const encodeAt = present.indexOf('linear_to_sRGB(lin)');
    expect(reductionAt).toBeGreaterThan(-1);
    expect(encodeAt).toBeGreaterThan(-1);
    expect(reductionAt).toBeLessThan(encodeAt);
  });

  it('keeps an explicit box reference branch alongside Mitchell, without a bilinear sampler', () => {
    expect(present).toContain('for (var dy = 0; dy < DOWNSCALE; dy = dy + 1)');
    expect(present).toContain('for (var dx = 0; dx < DOWNSCALE; dx = dx + 1)');
    expect(present).toContain('tap(base + vec2<i32>(dx, dy), dims)');
    expect(present).toContain('override REDUCE_MITCHELL: i32 = 1;');
    expect(present).toContain('let w = wx * wy;');
    // A sampler at an exact 2:1 ratio only averages correctly at one precise
    // offset; an explicit load loop has no such trap.
    expect(present).not.toContain('textureSample');
    expect(present).not.toContain('sampler');
  });

  // Under adaptive AA, texels hold different accepted-sample counts. Dividing
  // each by its own count before averaging is a box filter over means; summing
  // rgb and alpha and dividing once weights texels by their sample count.
  it('normalises each source texel by its own sample count before averaging', () => {
    expect(present).toContain('return acc.rgb / max(acc.a, 1.0);');
  });

  it('dithers at output resolution as the final step', () => {
    const encodeAt = present.indexOf('linear_to_sRGB(lin)');
    const ditherAt = present.indexOf('dither_8bit(fragPos.xy)');
    expect(ditherAt).toBeGreaterThan(encodeAt);
  });

  // With DOWNSCALE = 1 the loop runs once at base = coord, so the real-time
  // path keeps exactly the arithmetic it had before the override existed.
  it('keeps the source coordinate unscaled at factor 1', () => {
    expect(present).toContain('let outCoord = vec2<i32>(i32(fragPos.x), i32(fragPos.y));');
    expect(present).toContain('let base = outCoord * DOWNSCALE;');
  });
});
