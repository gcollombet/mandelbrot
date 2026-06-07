import {describe, expect, it} from 'vitest';
import {buildStopPresetPreviewSpec, getStopPresetPreviewEffectStrength} from '../../src/stopPresetPreview';

describe('stopPresetPreview', () => {
  it('uses the preset iridescence color and transfer curve when available', () => {
    const spec = buildStopPresetPreviewSpec({
      color: '#112233',
      iridescenceColor: '#abcdef',
      transferCurve: 'square',
    });

    expect(spec.startColor).toBe('#112233');
    expect(spec.endColor).toBe('#abcdef');
    expect(spec.curve).toBe('square');
  });

  it('derives a contrasting accent when no iridescence color is present', () => {
    const spec = buildStopPresetPreviewSpec({
      color: '#444444',
      transferCurve: 'linear',
      palette: 1,
      zebra: 1,
      tessellation: 1,
      shading: 1,
      skybox: 1,
      webcam: 1,
      smoothness: 1,
      stripeAverage: 1,
      rotationMean: 1,
      stripeRelief: 1,
      directionCoherenceRelief: 100,
      shadingLevel: 3,
      specularPower: 64,
      metallic: 1,
      roughness: 1,
      anisotropy: 1,
      iridescencePower: 1,
    });

    expect(spec.endColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(spec.endColor).not.toBe(spec.startColor);
    expect(getStopPresetPreviewEffectStrength({
      color: '#444444',
      palette: 1,
      zebra: 1,
      tessellation: 1,
      shading: 1,
      skybox: 1,
      webcam: 1,
      smoothness: 1,
      stripeAverage: 1,
      rotationMean: 1,
      stripeRelief: 1,
      directionCoherenceRelief: 100,
      shadingLevel: 3,
      specularPower: 64,
      metallic: 1,
      roughness: 1,
      anisotropy: 1,
      iridescencePower: 1,
    })).toBeGreaterThan(0.5);
  });
});
