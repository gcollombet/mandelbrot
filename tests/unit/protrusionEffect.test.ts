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

  it('packs protrusion into palette row 6 alpha without adding a row', () => {
    const palette = new Palette([
      {color: '#000000', position: 0, protrusion: 0},
      {color: '#ffffff', position: 1, protrusion: 1},
    ], 'rgb');
    const texture = palette.generateTexture();
    const row6Alpha = (x: number) => texture.data[(6 * texture.width + x) * 4 + 3];

    expect(texture.height).toBe(7);
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
    expect(shader).toContain('let protrusionPhase = fract(parameters.protrusionPhase);');
    expect(shader).toContain('let protrusionSharpness = clamp(parameters.protrusionSharpness, 0.25, 16.0);');
    expect(shader).toContain('let protrusionWave = 0.5 + 0.5 * cos(TWO_PI * fract(v_smooth - protrusionPhase));');
    expect(shader).toContain('let protrusionLobe = pow(max(protrusionWave, 0.0), protrusionSharpness);');
    expect(shader).toContain('let protrusionGain = exp2(2.0 * fx.protrusion * protrusionLobe);');
    expect(shader).toContain('let styledAnalyticRelief = effectiveAnalyticRelief * protrusionGain;');
    expect(shader).toContain('let heightGradient = grad * (0.34 * styledAnalyticRelief);');
    expect(editor).toContain("protrusion: 'Protubérances'");
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
    expect(paletteStore).toContain('protrusionPhase?: number;');
    expect(paletteStore).toContain('protrusionSharpness?: number;');
    expect(settings).toContain('protrusionPhase: model.value.protrusionPhase');
    expect(settings).toContain('protrusionSharpness: model.value.protrusionSharpness');
    expect(settings).toContain('model.value.protrusionPhase = source.protrusionPhase ?? 0;');
    expect(settings).toContain('model.value.protrusionSharpness = source.protrusionSharpness ?? 2;');
    expect(settings).toContain('label="Phase protubérances"');
    expect(settings).toContain('label="Netteté protubérances"');

    expect(engine).toContain('const COLOR_UNIFORM_FLOAT_COUNT = 72');
    expect(engine).toContain('renderOptions.protrusionPhase ?? 0,   // 68: protrusionPhase');
    expect(engine).toContain('renderOptions.protrusionSharpness ?? 2, // 69: protrusionSharpness');
    expect(shader).toContain('protrusionPhase: f32');
    expect(shader).toContain('protrusionSharpness: f32');
    expect(preview).toContain('const COLOR_UNIFORM_FLOAT_COUNT = 72;');
    expect(preview).toContain('device.queue.writeBuffer(uniformBuffer, 68 * 4');
    expect(preview).toContain('props.protrusionPhase ?? 0');
    expect(preview).toContain('props.protrusionSharpness ?? 2');
  });
});
