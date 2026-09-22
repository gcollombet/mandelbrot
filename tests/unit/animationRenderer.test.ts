import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('expanded animation renderer wiring', () => {
  it('lists stable panel labels for the six color-pass tracks', () => {
    const panel = read('../../src/components/AnimationPanel.vue');
    const labels = JSON.parse(read('../../src/locales/en/animationPanel.json')).tracks;

    for (const id of ['protrusionPhase', 'reliefDepth', 'orbitTrapPhaseOffset', 'orbitTrapStrength', 'gradeSaturation', 'gradeContrast']) {
      expect(panel).toContain(`'${id}'`);
    }
    expect(labels.protrusionPhase).toBe('Protrusion phase');
    expect(labels.reliefDepth).toBe('Relief depth');
    expect(labels.orbitTrapPhaseOffset).toBe('Orbit trap color');
    expect(labels.orbitTrapStrength).toBe('Orbit trap strength');
    expect(labels.gradeSaturation).toBe('Saturation');
    expect(labels.gradeContrast).toBe('Contrast');
  });

  it('evaluates every contribution independently and bounds effective values', () => {
    const engine = read('../../src/Engine.ts');

    for (const id of [
      'protrusionPhase',
      'reliefDepth',
      'orbitTrapPhaseOffset',
      'orbitTrapStrength',
      'gradeSaturation',
      'gradeContrast',
    ]) {
      expect(engine).toContain(`animationContribution(animation.tracks.${id}, animTime, animGlobalSpeed)`);
    }

    expect(engine).toContain('effectiveProtrusionPhase = wrapUnit(');
    expect(engine).toContain('effectiveReliefDepth = clamp(renderOptions.reliefDepth + reliefDepthAnim, 0, 2)');
    expect(engine).toContain('phaseOffset: wrapUnit(orbitTrap.phaseOffset + orbitTrapPhaseOffsetAnim)');
    expect(engine).toContain('strength: clamp(orbitTrap.strength + orbitTrapStrengthAnim, 0, 100)');
    expect(engine).toContain('effectiveGradeSaturation = clamp((renderOptions.gradeSaturation ?? 1.12) + gradeSaturationAnim, 0, 2)');
    expect(engine).toContain('effectiveGradeContrast = clamp((renderOptions.gradeContrast ?? 1.18) + gradeContrastAnim, 0.5, 2)');
  });

  it('writes effective values through the existing color uniform ABI', () => {
    const engine = read('../../src/Engine.ts');

    expect(engine).toContain('effectiveReliefDepth,            // 20: reliefDepth');
    expect(engine).toContain('effectiveOrbitTrap.strength,         // 33: legacy-compatible orbitTrapStrength');
    expect(engine).toContain('effectiveGradeContrast,              // 43: gradeContrast');
    expect(engine).toContain('effectiveGradeSaturation,            // 64: gradeSaturation');
    expect(engine).toContain('effectiveProtrusionPhase,             // 68: protrusionPhase');
    expect(engine).toContain('...orbitTrapColorUniformValues(effectiveOrbitTrap)');
  });
});
