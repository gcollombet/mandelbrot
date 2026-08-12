export const ORBIT_TRAP_MODES = ['off', 'terminal', 'sampled', 'exact'] as const;

export type OrbitTrapMode = typeof ORBIT_TRAP_MODES[number];

export interface OrbitTrapConfig {
  version: 1;
  mode: OrbitTrapMode;
  centerX: number;
  centerY: number;
  scale: number;
  rotation: number;
  anisotropyX: number;
  anisotropyY: number;
  petals: number;
  petalDepth: number;
  twist: number;
  phase: number;
  width: number;
  hardness: number;
  strength: number;
  distanceFrequency: number;
  distanceWeight: number;
  iterationWeight: number;
  angleWeight: number;
  phaseOffset: number;
  startIteration: number;
  endIteration: number;
  includeInterior: boolean;
}

export const DEFAULT_ORBIT_TRAP: Readonly<OrbitTrapConfig> = Object.freeze({
  version: 1,
  mode: 'off',
  centerX: 0,
  centerY: 0,
  scale: 1,
  rotation: 0,
  anisotropyX: 1,
  anisotropyY: 1,
  petals: 5,
  petalDepth: 0.32,
  twist: 1.1,
  phase: 0,
  width: 0.08,
  hardness: 2,
  strength: 0,
  distanceFrequency: 7,
  distanceWeight: 1,
  iterationWeight: 0.16,
  angleWeight: 0.75,
  phaseOffset: 0.18,
  startIteration: 2,
  endIteration: 0,
  includeInterior: false,
});

const MODE_SET = new Set<string>(ORBIT_TRAP_MODES);

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return Math.min(max, Math.max(min, finiteOr(value, fallback)));
}

function normalizeMode(value: unknown, fallback: OrbitTrapMode): OrbitTrapMode {
  return typeof value === 'string' && MODE_SET.has(value)
    ? value as OrbitTrapMode
    : fallback;
}

export function cloneOrbitTrap(config: OrbitTrapConfig = DEFAULT_ORBIT_TRAP): OrbitTrapConfig {
  return { ...config };
}

export function normalizeOrbitTrapConfig(value: unknown, legacyStrength?: unknown): OrbitTrapConfig {
  const record = value && typeof value === 'object'
    ? value as Partial<OrbitTrapConfig>
    : {};
  const hasStructuredConfig = value !== undefined && value !== null && typeof value === 'object';
  const strengthFallback = hasStructuredConfig
    ? DEFAULT_ORBIT_TRAP.strength
    : clamp(legacyStrength, 0, 100, DEFAULT_ORBIT_TRAP.strength);
  const strength = clamp(record.strength, 0, 100, strengthFallback);
  const legacyMode: OrbitTrapMode = strength > 0 ? 'terminal' : 'off';

  return {
    version: 1,
    mode: normalizeMode(record.mode, hasStructuredConfig ? DEFAULT_ORBIT_TRAP.mode : legacyMode),
    centerX: clamp(record.centerX, -8, 8, DEFAULT_ORBIT_TRAP.centerX),
    centerY: clamp(record.centerY, -8, 8, DEFAULT_ORBIT_TRAP.centerY),
    scale: clamp(record.scale, 0.01, 100, DEFAULT_ORBIT_TRAP.scale),
    rotation: clamp(record.rotation, -Math.PI * 8, Math.PI * 8, DEFAULT_ORBIT_TRAP.rotation),
    anisotropyX: clamp(record.anisotropyX, 0.05, 20, DEFAULT_ORBIT_TRAP.anisotropyX),
    anisotropyY: clamp(record.anisotropyY, 0.05, 20, DEFAULT_ORBIT_TRAP.anisotropyY),
    petals: Math.round(clamp(record.petals, 1, 32, DEFAULT_ORBIT_TRAP.petals)),
    petalDepth: clamp(record.petalDepth, 0, 2, DEFAULT_ORBIT_TRAP.petalDepth),
    twist: clamp(record.twist, -20, 20, DEFAULT_ORBIT_TRAP.twist),
    phase: clamp(record.phase, -Math.PI * 8, Math.PI * 8, DEFAULT_ORBIT_TRAP.phase),
    width: clamp(record.width, 0.001, 2, DEFAULT_ORBIT_TRAP.width),
    hardness: clamp(record.hardness, 0.25, 16, DEFAULT_ORBIT_TRAP.hardness),
    strength,
    distanceFrequency: clamp(record.distanceFrequency, 0, 64, DEFAULT_ORBIT_TRAP.distanceFrequency),
    distanceWeight: clamp(record.distanceWeight, -8, 8, DEFAULT_ORBIT_TRAP.distanceWeight),
    iterationWeight: clamp(record.iterationWeight, -8, 8, DEFAULT_ORBIT_TRAP.iterationWeight),
    angleWeight: clamp(record.angleWeight, -8, 8, DEFAULT_ORBIT_TRAP.angleWeight),
    phaseOffset: clamp(record.phaseOffset, -64, 64, DEFAULT_ORBIT_TRAP.phaseOffset),
    startIteration: Math.round(clamp(record.startIteration, 0, 1_000_000_000, DEFAULT_ORBIT_TRAP.startIteration)),
    endIteration: Math.round(clamp(record.endIteration, 0, 1_000_000_000, DEFAULT_ORBIT_TRAP.endIteration)),
    includeInterior: !!record.includeInterior,
  };
}

export function normalizeOrbitTrapFromLegacy(value: {
  orbitTrap?: unknown;
  orbitTrapStrength?: unknown;
}): OrbitTrapConfig {
  return normalizeOrbitTrapConfig(value.orbitTrap, value.orbitTrapStrength);
}

export function orbitTrapUsesOrbit(config: OrbitTrapConfig): boolean {
  return config.mode === 'sampled' || config.mode === 'exact';
}

export function orbitTrapIsActive(config: OrbitTrapConfig): boolean {
  return config.strength > 0 && config.mode !== 'off';
}

/** Fields that change the accumulated closest-hit tuple itself. */
export function orbitTrapAccumulatorSignature(config: OrbitTrapConfig): string {
  return JSON.stringify([
    config.mode,
    config.centerX,
    config.centerY,
    config.scale,
    config.rotation,
    config.anisotropyX,
    config.anisotropyY,
    config.petals,
    config.petalDepth,
    config.twist,
    config.phase,
    config.startIteration,
    config.endIteration,
  ]);
}

export function orbitTrapModeId(mode: OrbitTrapMode): number {
  switch (mode) {
    case 'terminal': return 1;
    case 'sampled': return 2;
    case 'exact': return 3;
    default: return 0;
  }
}

/** Float order appended to the color uniform block after the legacy fields. */
export function orbitTrapColorUniformValues(config: OrbitTrapConfig): number[] {
  return [
    orbitTrapModeId(config.mode),
    config.centerX,
    config.centerY,
    config.scale,
    config.rotation,
    config.anisotropyX,
    config.anisotropyY,
    config.petals,
    config.petalDepth,
    config.twist,
    config.phase,
    config.width,
    config.hardness,
    config.distanceFrequency,
    config.distanceWeight,
    config.iterationWeight,
    config.angleWeight,
    config.phaseOffset,
    config.startIteration,
    config.endIteration,
    config.includeInterior ? 1 : 0,
  ];
}
