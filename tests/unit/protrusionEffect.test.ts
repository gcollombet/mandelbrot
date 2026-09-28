import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {createInterpolatedColorStop, getEffectValue, type ColorStop} from '../../src/ColorStop';
import {Palette} from '../../src/Palette';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('palette protrusion effect', () => {
  it('is neutral when omitted and interpolates in palette control space', () => {
    expect(getEffectValue({color: '#000000', position: 0}, 'protrusion')).toBe(0);

    const stops: ColorStop[] = [
      {color: '#000000', position: 0, protrusion: 0},
      {color: '#ffffff', position: 1, protrusion: 1},
    ];
    const palette = new Palette(stops, 'rgb');

    expect(palette.getEffectAt(0.5, 'protrusion')).toBeCloseTo(0.5);
    expect(createInterpolatedColorStop(stops, 0.5, '#808080').protrusion).toBeCloseTo(0.5);
  });

  it('packs protrusion into palette row 6 alpha alongside the material rows', () => {
    const palette = new Palette([
      {color: '#000000', position: 0, protrusion: 0},
      {color: '#ffffff', position: 1, protrusion: 1},
    ], 'rgb');
    const texture = palette.generateTexture();
    const row6Alpha = (x: number) => texture.data[(6 * texture.width + x) * 4 + 3];

    expect(texture.height).toBe(8);
    expect(row6Alpha(0)).toBe(0);
    expect(row6Alpha(texture.width - 1)).toBe(1);
    expect(row6Alpha(Math.floor((texture.width - 1) / 2))).toBeCloseTo(0.5, 3);
  });

  it('keeps one row-6 sample and one styled scale for analytic lighting cues', () => {
    const config = read('../../src/effectFieldConfig.ts');
    const shader = read('../../src/assets/color.wgsl');
    const editor = read('../../src/components/PaletteEditor.vue');

    expect(config).toContain("protrusion:          { label: 'Protrusion',         defaultValue: 0.0, min: 0, max: 1");
    expect(config).toContain('textureRow: 6, textureChannel: 3');
    expect(shader).toContain('(*e).protrusion = clamp(row6.a, 0.0, 1.0);');
    expect(shader).toContain('let phase = fract(nuSmooth - fract(parameters.protrusionPhase));');
    expect(shader).toContain('let sharpness = clamp(parameters.protrusionSharpness, 0.25, 16.0);');
    expect(shader).toContain('let wave = max(0.5 + 0.5 * cos(TWO_PI * phase), 0.0);');
    expect(shader).toContain('let lobe = pow(wave, sharpness);');
    expect(shader).toContain('let base = exp2(2.0 * protrusion * lobe);');
    expect(shader).toContain('let strength = clamp(parameters.protrusionStrength, 1.0, 4.0);');
    expect(shader).toContain('1.0 + strength * (base - 1.0),');
    expect(shader).toContain('let geometryMix = clamp(parameters.protrusionGeometryMix, 0.0, 1.0);');
    expect(shader).toContain('let period = clamp(parameters.protrusionPeriod, 0.1, 16.0);');
    // Geometric lobe: h = S·(F - Hc + P·R(H)·F\'), R a periodic ripple along H.
    expect(shader).toContain('let geometricGain = max(1.0 + material.protrusion * geometric.y, 0.0);');
    expect(shader).toContain('let geometricHeight = scale * (offset + ripple);');
    expect(shader).toContain('out.styledRelief = scale * mix(iterationGain.x, geometricGain, geometryMix);');
    // Integrable lobe: terraces h = S·g·(F - Hc) mixed with bounded bumps.
    expect(shader).toContain('let terrace = clamp(parameters.protrusionTerrace, 0.0, 1.0);');
    expect(shader).toContain('let iterationGradient = mix(bumpGradient, terraceGradient, terrace);');
    expect(shader).toContain('out.gradient = RELIEF_HEIGHT_SCALE * mix(iterationGradient, geometricGradient, geometryMix);');
    expect(shader).toContain('let styledAnalyticRelief = relief.styledRelief;');
    expect(shader).toContain('let heightGradient = relief.gradient;');
    expect(editor).toContain('paletteEditor.labels.');
    expect(read('../../src/effectFieldConfig.ts')).toContain('protrusion:');
    expect(read('../../src/locales/fr/paletteEditor.json')).toContain('"protrusion": "Protubérances"');

    const amplify = (baseGain: number, strength: number) => 1 + strength * (baseGain - 1);
    expect(amplify(4, 1)).toBe(4);
    expect(amplify(4, 4)).toBe(13);
    expect(amplify(4, 4) - 1).toBe(4 * (amplify(4, 1) - 1));
  });

  it('persists global shape controls and reuses uniform padding in both renderers', () => {
    const engine = read('../../src/Engine.ts');
    const shader = read('../../src/assets/color.wgsl');
    const preview = read('../../src/components/PalettePreview.vue');
    const settings = read('../../src/components/Settings.vue');
    const params = read('../../src/Mandelbrot.ts');
    const paletteStore = read('../../src/paletteStore.ts');

    expect(params).toContain('protrusionPhase?: number;');
    expect(params).toContain('protrusionSharpness?: number;');
    expect(params).toContain('protrusionStrength?: number;');
    expect(params).toContain('protrusionGeometryMix?: number;');
    expect(params).toContain('protrusionPeriod?: number;');
    expect(paletteStore).toContain('protrusionPhase?: number;');
    expect(paletteStore).toContain('protrusionSharpness?: number;');
    expect(paletteStore).toContain('protrusionStrength?: number;');
    expect(paletteStore).toContain('protrusionGeometryMix?: number;');
    expect(paletteStore).toContain('protrusionPeriod?: number;');
    expect(settings).toContain('protrusionPhase: model.value.protrusionPhase');
    expect(settings).toContain('protrusionSharpness: model.value.protrusionSharpness');
    expect(settings).toContain('protrusionStrength: model.value.protrusionStrength');
    expect(settings).toContain('protrusionGeometryMix: model.value.protrusionGeometryMix');
    expect(settings).toContain('protrusionPeriod: model.value.protrusionPeriod');
    expect(settings).toContain('model.value.protrusionPhase = source.protrusionPhase ?? 0;');
    expect(settings).toContain('model.value.protrusionSharpness = source.protrusionSharpness ?? 2;');
    expect(settings).toContain('model.value.protrusionStrength = source.protrusionStrength ?? 1;');
    expect(settings).toContain('model.value.protrusionGeometryMix = source.protrusionGeometryMix ?? 0;');
    expect(settings).toContain('model.value.protrusionPeriod = source.protrusionPeriod ?? 1;');
    expect(settings).toContain(`:label="t('settings.palettes.surface.protrusionPhase')"`);
    expect(settings).toContain(`:label="t('settings.palettes.surface.protrusionSharpness')"`);
    expect(settings).toContain(`<DenseField :label="t('settings.palettes.surface.protrusionStrength')" :min="1" :max="4"`);
    expect(settings).toContain(`<DenseField :label="t('settings.palettes.surface.protrusionGeometry')" :min="0" :max="1"`);
    expect(settings).toContain(`:label="t('settings.palettes.surface.geometricPeriod')"`);

    expect(engine).toContain('protrusionPhase: effectiveProtrusionPhase,');
    expect(engine).toContain('protrusionSharpness: renderOptions.protrusionSharpness ?? 2,');
    expect(engine).toContain('protrusionGeometryMix: renderOptions.protrusionGeometryMix ?? 0,');
    expect(engine).toContain('protrusionPeriod: renderOptions.protrusionPeriod ?? 1,');
    expect(engine).toContain('protrusionStrength: renderOptions.protrusionStrength ?? 1,');
    expect(shader).toContain('protrusionPhase: f32');
    expect(shader).toContain('protrusionSharpness: f32');
    expect(shader).toContain('protrusionStrength: f32');
    expect(shader).toContain('protrusionGeometryMix: f32');
    expect(shader).toContain('protrusionPeriod: f32');
    expect(preview).toContain('packColorUniforms(previewUniforms())');
    expect(preview).toContain('props.protrusionPhase ?? 0');
    expect(preview).toContain('props.protrusionSharpness ?? 2');
    expect(preview).toContain('props.protrusionStrength ?? 1');
    expect(preview).toContain('props.protrusionGeometryMix ?? 0');
    expect(preview).toContain('props.protrusionPeriod ?? 1');
  });
});
