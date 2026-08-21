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

  it('derives anisotropic flow from macro relief while preserving independent material bumps', () => {
    expect(shader).not.toContain('directionalVolumeGradient');
    expect(shader).not.toContain('fx.directionalVolume');
    expect(shader).toContain('let heightGradient = grad * (0.34 * styledAnalyticRelief);');
    expect(shader).toContain('let macroSurfaceGradient = heightGradient + stripeHeightGradient + coherenceHeightGradient;');
    expect(shader).toContain('let surfaceGradient = macroSurfaceGradient + textureGradient;');
    expect(shader).toContain('macroSurfaceGradient / max(macroSurfaceSlope, 1e-5)');
    expect(shader).toContain('anisotropy_tangent_from_dir(anisotropyReliefDir, surfaceNormalLocal)');
  });

  it('uses one effective analytic scale for every analytic lighting cue', () => {
    expect(shader).toContain('curvature_ambient_occlusion(heightCurvature, styledAnalyticRelief, parameters.ambientOcclusionStrength)');
    expect(shader).toContain('local_height_shadow(grad, lightDir, geometricTangentWorld, geometricBitangentWorld, styledAnalyticRelief, localShadowControl)');
    expect(shader).toContain('slope * styledAnalyticRelief) * litSide');
    expect(shader).toContain('let slopeShift = smoothstep(0.025, 1.15, slope * styledAnalyticRelief);');
    expect(shader).not.toContain('slope * max(relief, 0.18)');
  });

  it('reinforces relief in the one-sample base environment reflection without changing geometry or clearcoat', () => {
    const reflectionGradient = shader.match(/let environmentReflectionGradient = ([^;]+);/)?.[1];
    expect(reflectionGradient).toBe('surfaceGradient + anisotropyReliefDir * (2.0 * anisotropy)');
    expect(reflectionGradient).not.toContain('roughness');
    expect(shader).toContain('let environmentReflectionNormalLocal = surface_normal_from_gradient(environmentReflectionGradient);');
    expect(shader).toContain('let environmentReflectDir = reflect(-viewDir, environmentReflectionNormal);');

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
    expect(editor).toContain("reliefGain: 'Gain de relief'");
    expect(editor).toContain('Profondeur relief globale');
    expect(editor).not.toContain("directionalVolume: 'Volume directionnel'");
  });
});
