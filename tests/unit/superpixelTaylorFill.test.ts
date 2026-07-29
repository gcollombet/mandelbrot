import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const resolveShader = readFileSync(
  new URL('../../src/assets/resolve.wgsl', import.meta.url),
  'utf8',
);
const brushShader = readFileSync(
  new URL('../../src/assets/mandelbrot_brush.wgsl', import.meta.url),
  'utf8',
);
const colorShader = readFileSync(
  new URL('../../src/assets/color.wgsl', import.meta.url),
  'utf8',
);
const engineSource = readFileSync(
  new URL('../../src/Engine.ts', import.meta.url),
  'utf8',
);
const settingsSource = readFileSync(
  new URL('../../src/components/Settings.vue', import.meta.url),
  'utf8',
);

describe('opportunistic superpixel Taylor contract', () => {
  it('continues only the value from an explicitly valid quadratic payload', () => {
    expect(resolveShader).toContain('fn try_taylor_candidate(');
    expect(resolveShader).toContain('let s = loadLayer(anchorCoord, 8);');
    expect(resolveShader).toContain('let m1 = vec2<f32>(loadLayer(anchorCoord, 9), loadLayer(anchorCoord, 10));');
    expect(resolveShader).toContain('let m2 = vec2<f32>(loadLayer(anchorCoord, 11), loadLayer(anchorCoord, 12));');
    expect(resolveShader).toContain('let quadratic = cmul(cmul(m2, hat), hat) * (0.5 * e2);');
    expect(brushShader).toContain('const INVALID_TAYLOR_PAYLOAD: f32 = 1e35;');
    expect(resolveShader).not.toContain('o.dzx =');
    expect(resolveShader).not.toContain('o.dzy =');
  });

  it('rejects unusable payloads and escape-branch changes', () => {
    expect(resolveShader).toContain('dot(anchorZ, anchorZ) >= uni.mu');
    expect(resolveShader).toContain('if (!finitePayload) {');
    expect(resolveShader).toContain('if (!(score <= 1.0)) {');
    expect(resolveShader).toContain('if (!(zhatSq >= uni.mu && zhatSq < 1e30)) {');
    expect(resolveShader).toContain('return invalid_taylor_candidate();');
    expect(resolveShader).not.toContain('smooth_frac_extrapolated');
  });

  it('selects the best valid corner without blending Taylor predictions', () => {
    expect(resolveShader).toContain('var bestTaylor = invalid_taylor_candidate();');
    expect(resolveShader).toContain('if (taylor.valid != 0u && taylor.score < bestTaylor.score) {');
    expect(resolveShader).toContain('bestTaylor = taylor;');
    expect(resolveShader).toContain('return taylor_overlay(o, bestTaylor, requested_step);');
    expect(resolveShader).not.toContain('taylorSum');
  });

  it('encodes terminal coverage as a positive half-step', () => {
    expect(resolveShader).toContain('o.genuine = pack(f32(cellStep) + 0.5);');
    expect(brushShader).toContain('abs(fract(resolvedStep) - 0.5) < 0.125');
    expect(brushShader).toContain('@group(0) @binding(11) var previousResolved');
    expect(engineSource).toContain('{ binding: 11, resource: this.resolvedArrayView }');
  });

  it('keeps exact requests ahead of Taylor coverage and excludes covered sentinels from counters', () => {
    const exactCheck = brushShader.indexOf('if (si == -1) {');
    const coverageCheck = brushShader.indexOf('if (has_taylor_coverage(coord_out)) {');
    expect(exactCheck).toBeGreaterThan(-1);
    expect(coverageCheck).toBeGreaterThan(exactCheck);
    expect(brushShader).toContain('needs = !has_taylor_coverage(coord);');
    expect(brushShader).toContain('isActive = iter_val == -1.0;');
  });

  it('ignores stale coverage on clear and translation frames', () => {
    expect(engineSource).toContain(
      'taylorSuperpixelEnabled && clearFlag === 0 && !hasTranslationShift ? 1 : 0',
    );
  });

  it('has no Taylor-specific freeze, feedback, mask, or local refinement pass', () => {
    for (const source of [engineSource, resolveShader, brushShader]) {
      expect(source).not.toContain('taylorFeedbackPending');
      expect(source).not.toContain('taylorCellMask');
      expect(source).not.toContain('adaptiveTaylorRefineThisFrame');
      expect(source).not.toContain('Taylor Local Refinement');
    }
    expect(engineSource).not.toContain('taylor_refine.wgsl');
    expect(engineSource).not.toContain("key: 'taylorRefine'");
  });

  it('keeps resolve active and AA disabled for terminal Taylor sentinels', () => {
    expect(engineSource).toContain('&& !taylorSuperpixelEnabled');
    expect(engineSource).toContain('private isTaylorSuperpixelActive(): boolean');
    expect(engineSource).toContain('if (this.isTaylorSuperpixelActive()) {');
  });

  it('does not inspect palette content or derive a palette threshold', () => {
    for (const shader of [resolveShader, brushShader]) {
      expect(shader).not.toContain('palettePeriod');
      expect(shader).not.toContain('8192');
      expect(shader).not.toContain('shouldTrackOrbitMetrics');
    }
  });

  it('exposes a live resolved-coverage view without a recompute pipeline', () => {
    expect(engineSource).toContain('export const DEBUG_VIEW_TAYLOR_COVERAGE = 7');
    expect(engineSource).toContain('this.debugViewMode !== DEBUG_VIEW_TAYLOR_COVERAGE');
    expect(engineSource).toContain('this.debugViewMode === DEBUG_VIEW_TAYLOR_COVERAGE ? 1 : 0');
    expect(engineSource).toContain('if (this.debugPipelineActive) {');
    expect(colorShader).toContain('fn coverage_debug_color(step: f32)');
    expect(colorShader).toContain('abs(fract(step) - 0.5) < 0.125');
    expect(colorShader).toContain('parameters.coverageDebug > 0.5');
    expect(settingsSource).toContain("{ label: 'Couverture Taylor', value: 7 }");
    expect(settingsSource).toContain("label: 'Taylor terminal'");
    expect(settingsSource).toContain("label: 'Bilinéaire temporaire'");
  });
});
