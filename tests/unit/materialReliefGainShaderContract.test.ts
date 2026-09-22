import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shader = read('../../src/assets/color.wgsl');
const config = read('../../src/effectFieldConfig.ts');
const palette = read('../../src/Palette.ts');
const editor = read('../../src/components/PaletteEditor.vue');
const paletteStore = read('../../src/paletteStore.ts');
const presetStore = read('../../src/presetStore.ts');
const stopPresetStore = read('../../src/stopPresetStore.ts');

describe('material relief gain shader contract', () => {
  it('reuses palette row 6 channel R with a positive exponential mapping', () => {
    expect(config).toContain("'reliefGain'");
    expect(config).toContain("reliefGain:          { label: 'Relief Gain',        defaultValue: 1.0, min: 0, max: 2");
    expect(palette).toContain('Row 6: reliefGain, metalReflectance, metalEnvironmentTint, protrusion');
    expect(shader).toContain('(*e).reliefGain = clamp(row6.r, 0.0, 2.0);');
    expect(shader).toContain('let reliefGain = exp2(2.0 * (fx.reliefGain - 1.0));');
    expect(shader).toContain('let effectiveAnalyticRelief = relief * reliefGain;');
  });

  it('derives the brushing flow from the full rendered height gradient', () => {
    expect(shader).not.toContain('directionalVolumeGradient');
    expect(shader).not.toContain('fx.directionalVolume');
    expect(shader).toContain('let heightGradient = grad * (0.34 * styledAnalyticRelief);');
    expect(shader).toContain('let surfaceGradientLocal = heightGradient + stripeHeightGradient + coherenceHeightGradient + textureGradient;');
    expect(shader).toContain('s.flow = select(fieldDir, surfaceGradient / max(slope, 1e-5), slope > 1e-5);');
    expect(shader).toContain('anisotropy_tangent_from_dir(s.flow, normal)');
  });

  it('uses one effective analytic scale for every analytic lighting cue', () => {
    expect(shader).toContain('s.curvature = cachedCurvature * 6.0 * styledAnalyticRelief;');
    expect(shader).toContain('curvature_ambient_occlusion(s.curvature, parameters.ambientOcclusionStrength)');
    expect(shader).toContain('local_height_shadow(heightGradient, lightDir, localShadowControl)');
    expect(shader).toContain('let heightGradient = -normal.xy / max(normal.z, 1e-4);');
    expect(shader).toContain('let slopeShift = smoothstep(0.025, 1.15, slopeMetric);');
    expect(shader).not.toContain('slope * max(relief, 0.18)');
    expect(shader).not.toContain('geometricTangentWorld');
  });

  it('reinforces relief in the one-sample base environment reflection without changing geometry or clearcoat', () => {
    const reflectionGradient = shader.match(/let environmentGradient = ([^;]+);/)?.[1];
    expect(reflectionGradient).toBe('heightGradient + s.flow * (2.0 * anisotropy)');
    expect(reflectionGradient).not.toContain('roughness');
    expect(shader).toContain('let bentNormal = surface_normal_from_gradient(environmentGradient);');
    expect(shader).toContain('let environmentReflectDir = reflect(-viewDir, bentNormal);');

    const baseEnvironment = shader.slice(shader.indexOf('var envColor'), shader.indexOf('// Rim is a stylised Fresnel'));
    expect(baseEnvironment.match(/rough_skybox_reflection\(/g)).toHaveLength(1);
    expect(baseEnvironment).toContain('environmentReflectDir,');
    expect(baseEnvironment).toContain('roughness,');

    const clearcoat = shader.slice(shader.indexOf('if (varnish > 0.001)'));
    expect(clearcoat).toContain('let coatReflectDir = reflect(-viewDir, normal);');
    expect(clearcoat).toContain('coatReflectDir,');
    expect(clearcoat).not.toContain('environmentReflectDir');
  });

  it('normalizes local, cloud, complete, and stop preset payloads', () => {
    expect(paletteStore).toContain('cloned.colorStops = normalizeColorStops');
    expect(presetStore).toContain('normalized.colorStops = normalizeColorStops');
    expect(stopPresetStore).toContain('normalizeStopPresetValues');
    expect(stopPresetStore).toContain('normalizeColorStop');
  });

  it('exposes the renamed material control in the editor', () => {
    const fr = read('../../src/locales/fr/paletteEditor.json');
    expect(editor).toContain('paletteEditor.labels.');
    expect(read('../../src/effectFieldConfig.ts')).toContain('reliefGain:');
    expect(fr).toContain('"reliefGain": "Gain de relief"');
    expect(fr).toContain('Profondeur relief globale');
    expect(fr).not.toContain('Volume directionnel');
    expect(editor).not.toContain('directionalVolume');
  });
});
