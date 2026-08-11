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
const viewerSource = read('../../src/components/MandelbrotViewer.vue');
const performancePanelSource = read('../../src/components/PerformancePanel.vue');

describe('simplified progressive renderer contract', () => {
  it('creates only exact step-1 requests on clears and exposed pan texels', () => {
    expect(reprojectShader).toContain('store_layer(coord, 0, -1.0);');
    expect(reprojectShader).not.toContain('seedStep');
    expect(reprojectShader).not.toContain('baseSentinel');
    expect(brushShader).not.toContain('refine_sentinel');
    expect(brushShader).not.toContain('minBrushStep');
    expect(brushShader).not.toContain('allowRefinement');
  });

  it('fast-clears copied sentinels and gates Taylor-only reprojection layers', () => {
    expect(reprojectShader).toContain('let iter = textureLoad(prevRaw, coord_in, 0, 0).r;');
    expect(reprojectShader).toContain('if (iter < 0.0) {\n    store_cleared(coord_out);');
    expect(reprojectShader).toContain('for (var l = 1; l < layers; l++)');
    expect(reprojectShader).toContain('uni.copyLayerCount');
    expect(reprojectShader).toContain('let needsContinuation = zx * zx + zy * zy < uni.mu;');
    expect(reprojectShader).toContain('let actualLayers = select(layers, totalLayers, needsContinuation);');
    expect(engineSource).toContain('const RAW_BASE_LAYERS = 9');
    expect(engineSource).toContain('analyticRawPayloadNeeded ? RAW_LAYERS : RAW_BASE_LAYERS');
    expect(engineSource).toContain('analyticRawPayloadNeeded && !this.rawAnalyticPayloadAligned');
  });

  it('uses the utility clear, readback ring, and non-blocking timestamp pacing', () => {
    expect(reprojectShader).toContain('if (uni.clearHistory >= 0.5) {\n    store_cleared(coord_out);');
    expect(engineSource).not.toContain('rawBrushStepView');
    expect(engineSource).not.toContain('counterReadbackPending');
    expect(engineSource).toContain('const COUNTER_READBACK_BUFFER_COUNT = 3');
    expect(engineSource).toContain('? this.acquireCounterReadbackSlot()');
    expect(engineSource).toContain('this.applyGpuFrameTiming(spanMs, sampledBatchContext)');
    expect(engineSource).not.toContain('gpuPacingUsesTimestamps');
    expect(engineSource).not.toContain('? this.tsReadbackFree');
    expect(engineSource).toContain('const fallbackFrameComplete = this.timestampsEnabled || !this.pendingGpuTiming');
    expect(engineSource).toContain('const pacing = advanceFramePacer(');
    expect(engineSource).toContain('fallbackFrameComplete,');
    expect(engineSource).toContain('if (pacing.shouldDraw) {');
    const loopSource = engineSource.slice(
      engineSource.indexOf('private async _loop(now: number)'),
      engineSource.indexOf('async updateTileTexture(', engineSource.indexOf('private async _loop(now: number)')),
    );
    expect(loopSource.indexOf('requestAnimationFrame(nextNow'))
      .toBeLessThan(loopSource.indexOf('await this._drawFn()'));
    expect(loopSource).toContain('if (this._drawInFlight) return');
    expect(loopSource).toContain('finally {\n                this._drawInFlight = false');
    expect(engineSource).not.toContain('this._lastDrawMs = now');
    expect(engineSource).toContain('if (!this.timestampsEnabled) {\n            this.scheduleGpuTiming');
    expect(engineSource).not.toContain('&& counterReadbackSlot !== undefined');
  });

  it('unmounts and bounds performance-panel measurement work', () => {
    expect(viewerSource).toContain('v-if="showPerfPanel"');
    expect(viewerSource).not.toContain('v-show="showPerfPanel"');
    expect(performancePanelSource).toContain('const POLL_INTERVAL_MS = 100');
    expect(performancePanelSource).toContain('const MAX_HISTORY_SAMPLES');
    expect(performancePanelSource).toContain('window.setInterval(tick, POLL_INTERVAL_MS)');
    expect(performancePanelSource).not.toContain('requestAnimationFrame(tick)');
    expect(performancePanelSource).not.toContain('setWorkStatsEnabled(true)');
  });

  it('selects the nearest min-step source before bilinear color gathers', () => {
    const shadeStart = colorShader.indexOf('fn shade_srgb(');
    const shadeEnd = colorShader.indexOf('// Interleaved-gradient-noise dither', shadeStart);
    const shadeBody = colorShader.slice(shadeStart, shadeEnd);
    expect(shadeStart).toBeGreaterThanOrEqual(0);
    expect(shadeBody).toContain('let selectLiveNearest = liveHasNearestData');
    expect(shadeBody.indexOf('let selectLiveNearest = liveHasNearestData'))
      .toBeLessThan(shadeBody.indexOf('sample_escaped_bilinear('));
    expect(shadeBody).toContain('if (selectLiveNearest) {');
    expect(shadeBody).toContain('if (frozenHasNearestData) {');
    expect(shadeBody).toContain('Neither nearest texel is usable');
  });

  it('uses one remaining-work counter for exact requests and continuations', () => {
    expect(brushShader).toContain('count: atomic<u32>');
    expect(brushShader).toContain('weightedWork: atomic<u32>');
    expect(brushShader).toContain('effectiveCountEighths: atomic<u32>');
    expect(brushShader).toContain('throttledCount: atomic<u32>');
    expect(brushShader).toContain('wgWeightedWork[lidx] = weightedWork;');
    expect(brushShader).not.toContain('active_count');
    expect(brushShader).toContain('wgEffectiveCountEighths[lidx]');
    expect(brushShader).toContain('if (iter_val < 0.0) {\n        needs = true;');
    expect(engineSource).toContain('this.tsPendingBatchContext = batchTimingContext');
  });

  it('uses predictive batching without batch-1 clear or population resets', () => {
    expect(engineSource).toContain('requestedIterationBudgetMs(');
    expect(engineSource).toContain('this.iterationWorkRate');
    expect(engineSource).toContain('updateIterationWorkRateEma(');
    expect(engineSource).toContain('isRepresentativeIterationPopulation(');
    expect(engineSource).toContain('sample.actualWeightedWork');
    expect(engineSource).toContain('sample.remainingPixelCount');
    expect(engineSource).toContain('sample.effectiveRemainingPixelCount');
    expect(engineSource).toContain('recordIterationCounterSample(');
    expect(engineSource).toContain('tryApplyPairedIterationSample(');
    expect(engineSource).toContain('const COUNTER_SAMPLE_INTERVAL_FRAMES = 1');
    expect(engineSource).not.toContain('sample.translation');
    expect(engineSource.indexOf('this.iterationWorkRate = updateIterationWorkRateEma('))
      .toBeLessThan(engineSource.indexOf('if (sample.generation !== this.batchControllerGeneration) return'));
    expect(engineSource).toContain('if (!(this.iterationWorkRate > 0)) {');
    expect(engineSource).not.toContain('if (this.debugPipelineActive || elapsed <= 0)');
    expect(engineSource).toContain('MANDELBROT_BATCH_UNIFORM_OFFSET');
    expect(engineSource).not.toContain('ACTIVE_PIXEL_RESET_RATIO');
    expect(engineSource).not.toContain('this.iterationBatchSize = MIN_BATCH_SIZE');
    expect(engineSource).not.toContain('tsPendingRemainingPixelCount');
  });

  it('aggressively throttles only the dispatch budget for attracting periodic pixels', () => {
    expect(brushShader).toContain('struct PeriodicInteriorVerdict');
    expect(brushShader).toContain('let residual = fe_add(mapped, fe_neg(dz));');
    expect(brushShader).toContain('derivativeLog2 < -1.0');
    expect(brushShader).toContain('PeriodicInteriorVerdict(false, PERIODIC_WEIGHT_EIGHTH)');
    expect(brushShader).toContain('PeriodicInteriorVerdict(false, PERIODIC_WEIGHT_QUARTER)');
    expect(brushShader).toContain('localWorkLimit = min(localWorkLimit, weightedLimit);');
    expect(brushShader).toContain('g_activeWeightEighths = PERIODIC_WEIGHT_FULL;');
    expect(engineSource).toContain('effectiveRemainingPixelCount');
    expect(engineSource).toContain('periodicThrottledPixelCount');
    expect(engineSource).toContain('ENABLE_PERIODIC_SCHEDULING: periodicScheduling ? 1 : 0');
  });

  it('keeps asynchronous work samples alive during continuous zoom reprojection', () => {
    expect(engineSource).toContain('private isZoomReprojectionOnlyChange(');
    expect(engineSource).toContain('&& !zoomReprojectionOnlyChange)');
    expect(engineSource).toContain('render() invalidates at the actual clear boundary instead');
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
