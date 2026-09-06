import {describe, expect, it} from 'vitest';
import {
  ANIMATION_TRACK_DEFINITIONS,
  ANIMATION_TRACK_IDS,
  cloneAnimationConfig,
  createDefaultAnimationConfig,
  normalizeAnimationConfig,
} from '../../src/AnimationConfig';

const EXPANDED_TRACK_IDS = [
  'protrusionPhase',
  'reliefDepth',
  'orbitTrapPhaseOffset',
  'orbitTrapStrength',
  'gradeSaturation',
  'gradeContrast',
] as const;

describe('animation config helpers', () => {
  it('creates a complete default track set with legacy speed as global speed', () => {
    const config = createDefaultAnimationConfig(2.5);

    expect(config.globalSpeed).toBe(2.5);
    expect(Object.keys(config.tracks).sort()).toEqual([...ANIMATION_TRACK_IDS].sort());
    expect(config.tracks.paletteOffset.enabled).toBe(true);
    expect(config.tracks.textureDrift.enabled).toBe(false);
    for (const id of EXPANDED_TRACK_IDS) {
      expect(config.tracks[id].enabled).toBe(false);
      expect(ANIMATION_TRACK_DEFINITIONS.find(definition => definition.id === id)).toBeDefined();
    }
  });

  it('normalizes partial configs while preserving known track values', () => {
    const config = normalizeAnimationConfig({
      globalSpeed: 3,
      tracks: {
        lightAngle: {
          enabled: true,
          type: 'loop',
          speed: 0.4,
          amplitude: 0.75,
        },
      } as any,
    }, 1);

    expect(config.globalSpeed).toBe(3);
    expect(config.tracks.lightAngle).toEqual(expect.objectContaining({
      enabled: true,
      type: 'loop',
      speed: 0.4,
      amplitude: 0.75,
    }));
    expect(config.tracks.paletteOffset).toBeDefined();
    expect(config.tracks.tessellation).toBeDefined();
    for (const id of EXPANDED_TRACK_IDS) {
      expect(config.tracks[id]).toBeDefined();
      expect(config.tracks[id].enabled).toBe(false);
    }
  });

  it('fills expanded tracks when loading a recipe from the previous track set', () => {
    const previousRecipe = createDefaultAnimationConfig();
    previousRecipe.tracks.lightAngle.enabled = true;
    previousRecipe.tracks.lightAngle.speed = 0.42;
    for (const id of EXPANDED_TRACK_IDS) delete (previousRecipe.tracks as any)[id];

    const config = normalizeAnimationConfig(previousRecipe);

    expect(config.tracks.lightAngle.enabled).toBe(true);
    expect(config.tracks.lightAngle.speed).toBe(0.42);
    for (const id of EXPANDED_TRACK_IDS) {
      expect(config.tracks[id]).toEqual(expect.objectContaining({enabled: false}));
    }
  });

  it('falls back to defaults for invalid values', () => {
    const config = normalizeAnimationConfig({
      globalSpeed: Number.NaN,
      tracks: {
        paletteOffset: {
          enabled: 'yes',
          type: 'unknown',
          speed: Number.POSITIVE_INFINITY,
          amplitude: Number.NaN,
        },
      } as any,
    }, 4);

    expect(config.globalSpeed).toBe(4);
    expect(config.tracks.paletteOffset.enabled).toBe(true);
    expect(config.tracks.paletteOffset.type).toBe('loop');
    expect(config.tracks.paletteOffset.speed).toBe(0.8);
    expect(config.tracks.paletteOffset.amplitude).toBe(1);
  });

  it('clones independently', () => {
    const source = createDefaultAnimationConfig();
    const clone = cloneAnimationConfig(source);

    clone.tracks.paletteOffset.speed = 2;

    expect(source.tracks.paletteOffset.speed).toBe(0.8);
    expect(clone.tracks.paletteOffset.speed).toBe(2);
  });
});
