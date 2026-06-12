import {describe, expect, it} from 'vitest';
import {
  normalizePowerOfTwoStep,
  preserveSessionPerformanceFields,
  stripExplorationStateFields,
  stripSessionPerformanceFields,
} from '../../src/Mandelbrot';

describe('performance settings helpers', () => {
  it('normalizes step values to the supported power-of-two bounds', () => {
    expect(normalizePowerOfTwoStep(undefined, 64, 1, 4096)).toBe(64);
    expect(normalizePowerOfTwoStep(3, 1, 1, 64)).toBe(2);
    expect(normalizePowerOfTwoStep(128, 1, 1, 64)).toBe(64);
  });

  it('preserves session-scoped performance fields when applying a preset', () => {
    const current = {
      dprMultiplier: 1.5,
      maxIterationMultiplier: 0.2,
      antialiasLevel: 4,
      targetFps: 30,
      gpuLoadMultiplier: 2,
      zoomMinBrushStep: 8,
      sentinelSeedStep: 512,
    } as const;

    const merged = preserveSessionPerformanceFields(
      {
        scale: '1.0',
        cx: '-0.7',
        cy: '0.0',
      } as any,
      current,
    );

    expect(merged).toEqual(expect.objectContaining({
      scale: '1.0',
      dprMultiplier: 1.5,
      maxIterationMultiplier: 0.2,
      antialiasLevel: 4,
      targetFps: 30,
      gpuLoadMultiplier: 2,
      zoomMinBrushStep: 8,
      sentinelSeedStep: 512,
    }));
  });

  it('strips session-scoped performance fields from preset payloads', () => {
    const payload = {
      scale: '1.0',
      dprMultiplier: 1.5,
      maxIterationMultiplier: 0.2,
      antialiasLevel: 4,
      targetFps: 30,
      gpuLoadMultiplier: 2,
      zoomMinBrushStep: 8,
      sentinelSeedStep: 512,
    } as Record<string, unknown>;

    const stripped = stripSessionPerformanceFields(payload);

    expect(stripped).toEqual({scale: '1.0'});
  });

  it('strips exploration fields from preset payloads', () => {
    const payload = {
      scale: '1.0',
      showPresetPins: true,
    } as Record<string, unknown>;

    const stripped = stripExplorationStateFields(payload);

    expect(stripped).toEqual({scale: '1.0'});
  });

  it('preserves current exploration fields outside preset application helpers', () => {
    const current = {
      dprMultiplier: 1.5,
      maxIterationMultiplier: 0.2,
      antialiasLevel: 4,
      targetFps: 30,
      gpuLoadMultiplier: 2,
      zoomMinBrushStep: 8,
      sentinelSeedStep: 512,
      showPresetPins: true,
    } as const;

    const saved = stripExplorationStateFields({
      scale: '1.0',
      showPresetPins: false,
    } as any);
    const merged = preserveSessionPerformanceFields(saved, current);

    expect(merged).not.toHaveProperty('showPresetPins');
    expect(current.showPresetPins).toBe(true);
  });

  it('keeps sentinel seed step at least as large as the zoom brush step', () => {
    const zoomMinBrushStep = 16;
    const sentinelSeedStep = 8;

    const adjusted = Math.max(
      normalizePowerOfTwoStep(sentinelSeedStep, 64, 1, 4096),
      zoomMinBrushStep,
    );

    expect(adjusted).toBe(16);
  });
});
