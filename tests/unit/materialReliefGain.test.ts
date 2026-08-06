import {describe, expect, it} from 'vitest';
import {
  createInterpolatedColorStop,
  decodeReliefGainControl,
  getEffectValue,
  normalizeColorStop,
  normalizeColorStops,
  type ColorStop,
} from '../../src/ColorStop';
import {Palette} from '../../src/Palette';
import {normalizeStopPresetValues, type StopPresetValues} from '../../src/stopPresetStore';

describe('material relief gain', () => {
  it('decodes a positive exponential gain around the neutral control', () => {
    expect(decodeReliefGainControl(0)).toBeCloseTo(0.25);
    expect(decodeReliefGainControl(0.2)).toBeGreaterThan(0);
    expect(decodeReliefGainControl(0.2)).toBeLessThan(1);
    expect(decodeReliefGainControl(1)).toBe(1);
    expect(decodeReliefGainControl(2)).toBe(4);
    expect(decodeReliefGainControl(-10)).toBeCloseTo(0.25);
    expect(decodeReliefGainControl(10)).toBe(4);
  });

  it('migrates legacy values, prefers the new field, and strips the old key', () => {
    const legacy = normalizeColorStop({color: '#123456', position: 0, directionalVolume: 0.2});
    expect(legacy.reliefGain).toBe(0.2);
    expect(legacy).not.toHaveProperty('directionalVolume');

    const current = normalizeColorStop({
      color: '#abcdef',
      position: 1,
      reliefGain: 1.5,
      directionalVolume: 0.1,
    });
    expect(current.reliefGain).toBe(1.5);
    expect(current).not.toHaveProperty('directionalVolume');

    const missing = normalizeColorStop({color: '#ffffff', position: 0.5});
    expect(missing.reliefGain).toBe(1);
    expect(getEffectValue({color: '#000000', position: 0, directionalVolume: 0.4}, 'reliefGain')).toBe(0.4);
  });

  it('serializes normalized stops with reliefGain only', () => {
    const normalized = normalizeColorStops([
      {color: '#000000', position: 0, directionalVolume: 1},
      {color: '#ffffff', position: 1},
    ]);
    const serialized = JSON.stringify(normalized);
    expect(serialized).toContain('"reliefGain":1');
    expect(serialized).not.toContain('directionalVolume');
  });

  it('interpolates in control space before exponential decoding', () => {
    const stops: ColorStop[] = [
      {color: '#000000', position: 0, reliefGain: 0},
      {color: '#ffffff', position: 1, reliefGain: 2},
    ];
    const palette = new Palette(stops, 'rgb');
    const midpoint = palette.getEffectAt(0.5, 'reliefGain');
    expect(midpoint).toBeCloseTo(1);
    expect(decodeReliefGainControl(midpoint)).toBeCloseTo(1);

    const inserted = createInterpolatedColorStop(stops, 0.5, '#808080');
    expect(inserted.reliefGain).toBeCloseTo(1);
    expect(inserted).not.toHaveProperty('directionalVolume');
  });

  it('normalizes legacy stop-preset material values', () => {
    const legacyValues = {
      color: '#112233',
      directionalVolume: 0.25,
      roughness: 0.5,
    } as unknown as StopPresetValues;
    const normalized = normalizeStopPresetValues(legacyValues);
    expect(normalized.reliefGain).toBe(0.25);
    expect(normalized.roughness).toBe(0.5);
    expect(normalized).not.toHaveProperty('directionalVolume');
  });
});
