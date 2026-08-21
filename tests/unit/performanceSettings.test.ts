import {describe, expect, it} from 'vitest';
import {
  MAX_ANTIALIAS_LEVEL,
  normalizeAntialiasLevel,
  preserveSessionPerformanceFields,
  stripExplorationStateFields,
  stripSessionPerformanceFields,
} from '../../src/Mandelbrot';

describe('performance settings helpers', () => {
  it('supports AA accumulation up to 256 samples with one shared bound', () => {
    expect(MAX_ANTIALIAS_LEVEL).toBe(256);
    expect(normalizeAntialiasLevel(255.6)).toBe(256);
    expect(normalizeAntialiasLevel(256)).toBe(256);
    expect(normalizeAntialiasLevel(257)).toBe(256);
    expect(normalizeAntialiasLevel(0)).toBe(1);
    expect(normalizeAntialiasLevel(Number.NaN)).toBe(1);
  });

  it('preserves session-scoped performance fields when applying a preset', () => {
    const current = {
      dprMultiplier: 1.5,
      maxIterationMultiplier: 0.2,
      antialiasLevel: 4,
      targetFps: 30,
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
    }));
  });

  it('strips session-scoped performance fields from preset payloads', () => {
    const payload = {
      scale: '1.0',
      dprMultiplier: 1.5,
      maxIterationMultiplier: 0.2,
      antialiasLevel: 4,
      targetFps: 30,
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

  it('strips obsolete progressive-render settings from stored payloads', () => {
    const payload = {
      scale: '1.0',
      gpuLoadMultiplier: 2,
      zoomMinBrushStep: 8,
      sentinelSeedStep: 512,
      taylorSuperpixelEnabled: true,
    } as Record<string, unknown>;

    expect(stripSessionPerformanceFields(payload)).toEqual({scale: '1.0'});
  });
});
