import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const resolveShader = read('../../src/assets/resolve.wgsl');
const brushShader = read('../../src/assets/mandelbrot_brush.wgsl');
const reprojectShader = read('../../src/assets/reproject_cs.wgsl');
const colorShader = read('../../src/assets/color.wgsl');
const mergeShader = read('../../src/assets/merge_frozen.wgsl');
const engineSource = read('../../src/Engine.ts');
const settingsSource = read('../../src/components/Settings.vue');

describe('simplified progressive renderer contract', () => {
  it('creates only exact step-1 requests on clears and exposed pan texels', () => {
    expect(reprojectShader).toContain('store_layer(coord, 0, -1.0);');
    expect(reprojectShader).not.toContain('seedStep');
    expect(reprojectShader).not.toContain('baseSentinel');
    expect(brushShader).not.toContain('refine_sentinel');
    expect(brushShader).not.toContain('minBrushStep');
    expect(brushShader).not.toContain('allowRefinement');
  });

  it('uses one remaining-work counter for exact requests and continuations', () => {
    expect(brushShader).toContain('count: atomic<u32>');
    expect(brushShader).not.toContain('active_count');
    expect(brushShader).not.toContain('wgActive');
    expect(brushShader).toContain('if (iter_val < 0.0) {\n        needs = true;');
    expect(engineSource).toContain('this.tsPendingRemainingPixelCount = this.unfinishedPixelCount');
  });

  it('keeps resolve presentation-only and begins incomplete support at step 2', () => {
    expect(resolveShader).toContain('var step = 2u;');
    expect(resolveShader).toContain('fn no_data() -> FragOut');
    expect(resolveShader).toContain('out.iter = -1.0;');
    expect(resolveShader).not.toContain('textureStore');
    expect(resolveShader).not.toContain('try_taylor_candidate');
    expect(resolveShader).not.toContain('TAYLOR_REJECT');
  });

  it('removes resolved feedback, half-step markers, and dedicated debug views', () => {
    expect(brushShader).not.toContain('previousResolved');
    expect(brushShader).not.toContain('has_taylor_coverage');
    expect(resolveShader).not.toContain('o.genuine = pack(f32(cellStep) + 0.5)');
    expect(engineSource).not.toContain('DEBUG_VIEW_TAYLOR_COVERAGE');
    expect(engineSource).not.toContain('DEBUG_VIEW_TAYLOR_REJECTIONS');
    expect(settingsSource).not.toContain('Couverture Taylor');
    expect(settingsSource).not.toContain('Rejets Taylor');
  });

  it('uses one f32 color shader while retaining justified f16 storage', () => {
    expect(engineSource).not.toContain("has('shader-f16')");
    expect(engineSource).not.toContain('readF16Override');
    expect(engineSource).not.toContain('enable f16;');
    expect(colorShader).toContain('alias hcol = f32;');
    expect(engineSource).toContain("format: 'rgba16float'");
  });

  it('retains the shared z-double-prime payload for analytic AA and geometry work', () => {
    expect(brushShader).toContain('struct ScaledComplex {');
    expect(brushShader).toContain('scaled_complex_log_length(sndM, sndS)');
    expect(brushShader).toContain('out.aa11');
    expect(brushShader).toContain('out.aa12');
    expect(colorShader).toContain('let quadraticLogMag = log(0.5) + sndLog');
  });

  it('keeps convergence, selective AA reseed, and live/frozen selection on exact requests', () => {
    expect(engineSource).toContain('const fullyConverged =');
    expect(engineSource).toContain('this.unfinishedPixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD');
    expect(engineSource).toContain('const canSelectiveReseed = this.useAaSelectiveReseed');
    expect(engineSource).not.toContain('zoomMinBrushStep <= 1');
    expect(engineSource).not.toContain('isTaylorSuperpixelActive');
    expect(mergeShader).toContain('effectiveStep');
    expect(mergeShader).toContain('live.effectiveStep <= frozen.effectiveStep');
  });
});
