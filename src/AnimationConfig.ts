export type AnimationType = 'loop' | 'sine' | 'pulse' | 'stepped';

export const ANIMATION_TYPES: readonly AnimationType[] = ['loop', 'sine', 'pulse', 'stepped'];

export type AnimationTrackId =
  | 'paletteOffset'
  | 'heightPaletteShift'
  | 'lightAngle'
  | 'textureDrift'
  | 'skyReflectionDrift'
  | 'phaseColoring'
  | 'varnish'
  | 'microBump'
  | 'displacement'
  | 'tessellation';

export const ANIMATION_TRACK_IDS: readonly AnimationTrackId[] = [
  'paletteOffset',
  'heightPaletteShift',
  'lightAngle',
  'textureDrift',
  'skyReflectionDrift',
  'phaseColoring',
  'varnish',
  'microBump',
  'displacement',
  'tessellation',
];

export interface AnimationTrackConfig {
  enabled: boolean;
  type: AnimationType;
  speed: number;
  amplitude: number;
  phase?: number;
}

export type AnimationTracks = Record<AnimationTrackId, AnimationTrackConfig>;

export interface AnimationConfig {
  globalSpeed: number;
  tracks: AnimationTracks;
}

export interface AnimationTrackDefinition {
  id: AnimationTrackId;
  label: string;
  defaultType: AnimationType;
  defaultSpeed: number;
  defaultAmplitude: number;
  minAmplitude: number;
  maxAmplitude: number;
  amplitudeStep: number;
  unit: string;
}

export const ANIMATION_TRACK_DEFINITIONS: readonly AnimationTrackDefinition[] = [
  { id: 'paletteOffset', label: 'Palette Offset', defaultType: 'loop', defaultSpeed: 0.8, defaultAmplitude: 1, minAmplitude: 0, maxAmplitude: 1, amplitudeStep: 0.01, unit: 'cycle' },
  { id: 'heightPaletteShift', label: 'Height Palette Shift', defaultType: 'sine', defaultSpeed: 0.25, defaultAmplitude: 20, minAmplitude: 0, maxAmplitude: 100, amplitudeStep: 0.5, unit: '' },
  { id: 'lightAngle', label: 'Light Angle', defaultType: 'loop', defaultSpeed: 0.15, defaultAmplitude: 1, minAmplitude: 0, maxAmplitude: 1, amplitudeStep: 0.01, unit: 'turn' },
  { id: 'textureDrift', label: 'Texture Drift', defaultType: 'sine', defaultSpeed: 1, defaultAmplitude: 1, minAmplitude: 0, maxAmplitude: 2, amplitudeStep: 0.01, unit: '' },
  { id: 'skyReflectionDrift', label: 'Sky Reflection Drift', defaultType: 'sine', defaultSpeed: 0.6, defaultAmplitude: 1, minAmplitude: 0, maxAmplitude: 2, amplitudeStep: 0.01, unit: '' },
  { id: 'phaseColoring', label: 'Phase Coloring', defaultType: 'pulse', defaultSpeed: 0.3, defaultAmplitude: 25, minAmplitude: 0, maxAmplitude: 100, amplitudeStep: 0.5, unit: '' },
  { id: 'varnish', label: 'Varnish', defaultType: 'pulse', defaultSpeed: 0.22, defaultAmplitude: 2, minAmplitude: 0, maxAmplitude: 10, amplitudeStep: 0.05, unit: '' },
  { id: 'microBump', label: 'Micro Bump', defaultType: 'pulse', defaultSpeed: 0.35, defaultAmplitude: 0.5, minAmplitude: 0, maxAmplitude: 2, amplitudeStep: 0.01, unit: '' },
  { id: 'displacement', label: 'Displacement', defaultType: 'sine', defaultSpeed: 0.2, defaultAmplitude: 0.02, minAmplitude: 0, maxAmplitude: 0.1, amplitudeStep: 0.001, unit: '' },
  { id: 'tessellation', label: 'Tessellation', defaultType: 'sine', defaultSpeed: 0.18, defaultAmplitude: 2, minAmplitude: 0, maxAmplitude: 10, amplitudeStep: 0.1, unit: '' },
];

const TRACK_DEFINITION_BY_ID = new Map(ANIMATION_TRACK_DEFINITIONS.map(definition => [definition.id, definition]));

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeAnimationType(value: unknown, fallback: AnimationType): AnimationType {
  return ANIMATION_TYPES.includes(value as AnimationType) ? value as AnimationType : fallback;
}

function createDefaultTrack(definition: AnimationTrackDefinition): AnimationTrackConfig {
  return {
    enabled: definition.id === 'paletteOffset',
    type: definition.defaultType,
    speed: definition.defaultSpeed,
    amplitude: definition.defaultAmplitude,
    phase: 0,
  };
}

export function createDefaultAnimationConfig(legacySpeed = 1): AnimationConfig {
  const tracks = Object.fromEntries(
    ANIMATION_TRACK_DEFINITIONS.map(definition => [definition.id, createDefaultTrack(definition)]),
  ) as AnimationTracks;

  return {
    globalSpeed: finiteNumber(legacySpeed, 1),
    tracks,
  };
}

export function normalizeAnimationConfig(
  value?: Partial<AnimationConfig> | null,
  legacySpeed?: number,
): AnimationConfig {
  const defaults = createDefaultAnimationConfig(legacySpeed);
  const inputTracks = value?.tracks as Partial<Record<AnimationTrackId, Partial<AnimationTrackConfig>>> | undefined;
  const tracks = Object.fromEntries(ANIMATION_TRACK_IDS.map((id) => {
    const defaultTrack = defaults.tracks[id];
    const input = inputTracks?.[id];
    return [id, {
      enabled: typeof input?.enabled === 'boolean' ? input.enabled : defaultTrack.enabled,
      type: normalizeAnimationType(input?.type, defaultTrack.type),
      speed: finiteNumber(input?.speed, defaultTrack.speed),
      amplitude: finiteNumber(input?.amplitude, defaultTrack.amplitude),
      phase: finiteNumber(input?.phase, defaultTrack.phase ?? 0),
    } satisfies AnimationTrackConfig];
  })) as AnimationTracks;

  return {
    globalSpeed: finiteNumber(value?.globalSpeed, defaults.globalSpeed),
    tracks,
  };
}

export function cloneAnimationConfig(value: AnimationConfig): AnimationConfig {
  return normalizeAnimationConfig(JSON.parse(JSON.stringify(value)) as AnimationConfig);
}

export function animationTrackDefinition(id: AnimationTrackId): AnimationTrackDefinition {
  return TRACK_DEFINITION_BY_ID.get(id)!;
}
