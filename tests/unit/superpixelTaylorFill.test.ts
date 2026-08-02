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
const reprojectShader = readFileSync(
  new URL('../../src/assets/reproject_cs.wgsl', import.meta.url),
  'utf8',
);
const colorShader = readFileSync(
  new URL('../../src/assets/color.wgsl', import.meta.url),
  'utf8',
);
const aaReseedShader = readFileSync(
  new URL('../../src/assets/aa_reseed.wgsl', import.meta.url),
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
    expect(resolveShader).toContain('let sndLog = loadLayer(anchorCoord, 11);');
    expect(resolveShader).toContain('let sndAngle = loadLayer(anchorCoord, 12);');
    expect(resolveShader).toContain('let quadraticLogMag = log(0.5) + sndLog + 2.0 * logDelta;');
    expect(resolveShader).toContain('* vec2<f32>(cos(quadraticAngle), sin(quadraticAngle));');
    expect(brushShader).toContain('const INVALID_TAYLOR_PAYLOAD: f32 = 1e35;');
    expect(resolveShader).not.toContain('o.dzx =');
    expect(resolveShader).not.toContain('o.dzy = pack(candidate');
  });

  it('rejects unusable payloads and escape-branch changes', () => {
    expect(resolveShader).toContain('dot(anchorZ, anchorZ) >= uni.mu');
    expect(resolveShader).toContain('if (!finitePayload) {');
    expect(resolveShader).toContain('if (!(score <= 1.0)) {');
    expect(resolveShader).toContain('if (!(zhatSq >= uni.mu && zhatSq < 1e30)) {');
    expect(resolveShader).toContain('invalid_taylor_candidate(TAYLOR_REJECT_PAYLOAD, 1e30)');
    expect(resolveShader).toContain('invalid_taylor_candidate(TAYLOR_REJECT_RADIUS, score)');
    expect(resolveShader).toContain('invalid_taylor_candidate(TAYLOR_REJECT_BRANCH, score)');
    expect(resolveShader).not.toContain('smooth_frac_extrapolated');
  });

  it('selects the best valid corner without blending Taylor predictions', () => {
    expect(resolveShader).toContain(
      'var bestTaylor = invalid_taylor_candidate(TAYLOR_REJECT_NONE, 1e30);',
    );
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

  it('reindexes previous coverage during integer translations and ignores it on clears', () => {
    expect(engineSource).toContain(
      'taylorSuperpixelEnabled && clearFlag === 0 ? 1 : 0',
    );
    expect(engineSource).not.toContain(
      'taylorSuperpixelEnabled && clearFlag === 0 && !hasTranslationShift',
    );
    expect(reprojectShader).toContain(
      'let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));',
    );
    expect(reprojectShader).toContain('let coord_in = coord_out - shift;');
    expect(brushShader).toContain('i32(round(brush.shiftTexX))');
    expect(brushShader).toContain('i32(round(brush.shiftTexY))');
    expect(brushShader).toContain('let coverageCoord = coord_out - shift;');
    expect(brushShader).toContain('let dims = vec2<i32>(textureDimensions(previousResolved));');
    expect(brushShader).toContain('coverageCoord.x < 0 || coverageCoord.y < 0');
    expect(brushShader).toContain(
      'textureLoad(previousResolved, coverageCoord, 1, 0).r',
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

  it('uses the production neutral-texel scale in the reach view', () => {
    expect(colorShader).toContain(
      'let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);',
    );
    expect(colorShader).toContain(
      'log(2.0 * neutralExtent / max(f32(sourceTexSize.y), 1.0))',
    );
  });

  it('exposes structural Taylor rejection reasons without another texture', () => {
    expect(engineSource).toContain('export const DEBUG_VIEW_TAYLOR_REJECTIONS = 8');
    expect(engineSource).toContain('this.debugViewMode !== DEBUG_VIEW_TAYLOR_REJECTIONS');
    expect(engineSource).toContain('this.debugViewMode === DEBUG_VIEW_TAYLOR_REJECTIONS ? 1 : 0');
    expect(resolveShader).toContain('const TAYLOR_REJECTION_STRIDE: f32 = 50.26548245743669;');
    expect(resolveShader).toContain('fn tag_taylor_rejection(');
    expect(resolveShader).toContain('TAYLOR_REJECT_PAYLOAD');
    expect(resolveShader).toContain('TAYLOR_REJECT_RADIUS');
    expect(resolveShader).toContain('TAYLOR_REJECT_BRANCH');
    expect(resolveShader).toContain('TAYLOR_REJECT_SPARSE_CELL');
    expect(resolveShader).toContain('TAYLOR_REJECT_INSIDE_DOMINANT');
    expect(resolveShader).toContain('TAYLOR_REJECT_NO_ESCAPED');
    expect(colorShader).toContain('fn taylor_rejection_debug_color(');
    expect(colorShader).toContain('parameters.rejectionDebug > 0.5');
    expect(settingsSource).toContain("{ label: 'Rejets Taylor', value: 8 }");
    expect(settingsSource).toContain("label: 'Rayon hors du gate'");
    expect(settingsSource).toContain("label: 'Changement de branche d’échappement'");
  });

  it('keeps z-double-prime independently scaled and emits a polar-log escaped payload', () => {
    expect(brushShader).toContain('struct ScaledComplex {');
    expect(brushShader).toContain('fn scaled_complex_add(');
    expect(brushShader).toContain('var sndS = prev_snds;');
    expect(brushShader).toContain('snd_exact_step(derM, derS + derSLo, zPrev, &sndM, &sndS);');
    expect(brushShader).toContain('f32(pdz.e) * LN2 + *sndScale');
    expect(brushShader).toContain('scaled_complex_log_length(sndM, sndS)');
    expect(brushShader).toContain('out.aa11      = pack(sndS);');
    expect(brushShader).toContain('var sndValid = prev_snd_valid >= 0.5;');
    expect(brushShader).toContain('out.aa12      = pack(select(0.0, 1.0, isUnified && sndValid));');
    expect(brushShader).toContain('let taylorPayloadValid = isUnified && sndValid;');
    expect((brushShader.match(/sndValid = false;/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(brushShader).not.toContain('sndM = sndM * exp(clamp(-2.0 *');

    expect(resolveShader).toContain('&& abs(sndLog) < 1e30 && abs(sndAngle) < 1e30');
    expect(colorShader).toContain('let log2Snd = sndLog * LOG2E_;');
    expect(colorShader).toContain('let quadraticLogMag = log(0.5) + sndLog + 2.0 * parameters.aaJitterLogMag;');
    expect(aaReseedShader).toContain('fn log_complex_length_floor(v: vec2<f32>, floorValue: f32)');
    expect(aaReseedShader).toContain('+ s - sndLog - params.aaLogDelta;');
    expect(aaReseedShader).not.toContain('let m2 =');
  });
});
