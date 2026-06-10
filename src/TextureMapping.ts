export const TEXTURE_MAPPING_SCALE_MIN = 0.01;
export const TEXTURE_MAPPING_SCALE_MAX = 100;

export const TEXTURE_MAPPING_VARIABLES = [
  'screenXWithDepth',
  'screenYWithDepth',
  'dragonScaleU',
  'derivativeAngleSin',
  'screenX',
  'screenY',
  'iterSmooth',
  'distance',
] as const;

export type TextureMappingVariable = typeof TEXTURE_MAPPING_VARIABLES[number];

export interface TextureMappingConfig {
  xVariable: TextureMappingVariable;
  yVariable: TextureMappingVariable;
  xScale: number;
  yScale: number;
  mirrored: boolean;
}

export interface TextureMappingVariableOption {
  value: TextureMappingVariable;
  label: string;
}

export const TEXTURE_MAPPING_VARIABLE_IDS: Record<TextureMappingVariable, number> = {
  screenXWithDepth: 0,
  screenYWithDepth: 1,
  dragonScaleU: 2,
  derivativeAngleSin: 3,
  screenX: 4,
  screenY: 5,
  iterSmooth: 7,
  distance: 8,
};

export const TEXTURE_MAPPING_VARIABLE_OPTIONS: TextureMappingVariableOption[] = [
  { value: 'screenXWithDepth', label: 'Screen X + depth' },
  { value: 'screenYWithDepth', label: 'Screen Y + depth' },
  { value: 'dragonScaleU', label: 'Dragon U' },
  { value: 'derivativeAngleSin', label: 'Continuous phase (sin)' },
  { value: 'screenX', label: 'Screen X' },
  { value: 'screenY', label: 'Screen Y' },
  { value: 'iterSmooth', label: 'Smooth iteration' },
  { value: 'distance', label: 'Distance' },
];

export const SCREEN_SPACE_TEXTURE_MAPPING: TextureMappingConfig = {
  xVariable: 'screenXWithDepth',
  yVariable: 'screenYWithDepth',
  xScale: 1,
  yScale: 1,
  mirrored: false,
};

export const DRAGON_SCALES_TEXTURE_MAPPING: TextureMappingConfig = {
  xVariable: 'dragonScaleU',
  yVariable: 'derivativeAngleSin',
  xScale: 1,
  yScale: 1,
  mirrored: true,
};

export const BUILT_IN_TEXTURE_MAPPINGS = [
  {
    guid: 'builtin-texture-mapping-screen-space',
    name: 'Screen Space',
    mapping: SCREEN_SPACE_TEXTURE_MAPPING,
  },
  {
    guid: 'builtin-texture-mapping-dragon-scales',
    name: 'Dragon Scales',
    mapping: DRAGON_SCALES_TEXTURE_MAPPING,
  },
] as const;

const VARIABLE_SET = new Set<string>(TEXTURE_MAPPING_VARIABLES);

export function cloneTextureMapping(mapping: TextureMappingConfig): TextureMappingConfig {
  return { ...mapping };
}

export function isTextureMappingVariable(value: unknown): value is TextureMappingVariable {
  return typeof value === 'string' && VARIABLE_SET.has(value);
}

function normalizeTextureMappingVariable(value: unknown, fallback: TextureMappingVariable): TextureMappingVariable {
  if (value === 'argZ') return 'derivativeAngleSin';
  if (value === 'iterRaw') return 'iterSmooth';
  return isTextureMappingVariable(value) ? value : fallback;
}

export function clampTextureMappingScale(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 1;
  return Math.min(TEXTURE_MAPPING_SCALE_MAX, Math.max(TEXTURE_MAPPING_SCALE_MIN, numeric));
}

export function normalizeTextureMappingConfig(value: unknown): TextureMappingConfig {
  if (!value || typeof value !== 'object') {
    return cloneTextureMapping(SCREEN_SPACE_TEXTURE_MAPPING);
  }
  const record = value as Partial<TextureMappingConfig>;
  return {
    xVariable: normalizeTextureMappingVariable(record.xVariable, SCREEN_SPACE_TEXTURE_MAPPING.xVariable),
    yVariable: normalizeTextureMappingVariable(record.yVariable, SCREEN_SPACE_TEXTURE_MAPPING.yVariable),
    xScale: clampTextureMappingScale(record.xScale),
    yScale: clampTextureMappingScale(record.yScale),
    mirrored: !!record.mirrored,
  };
}

export function textureMappingFromLegacyMode(mode: unknown): TextureMappingConfig {
  return mode === 1
    ? cloneTextureMapping(DRAGON_SCALES_TEXTURE_MAPPING)
    : cloneTextureMapping(SCREEN_SPACE_TEXTURE_MAPPING);
}

export function normalizeTextureMappingFromLegacy(value: {
  textureMapping?: unknown;
  textureMappingMode?: unknown;
}): TextureMappingConfig {
  if (value.textureMapping) return normalizeTextureMappingConfig(value.textureMapping);
  return textureMappingFromLegacyMode(value.textureMappingMode);
}

export function textureMappingEquals(a: TextureMappingConfig, b: TextureMappingConfig): boolean {
  return a.xVariable === b.xVariable
    && a.yVariable === b.yVariable
    && a.xScale === b.xScale
    && a.yScale === b.yScale
    && a.mirrored === b.mirrored;
}

export function textureMappingVariableId(variable: TextureMappingVariable): number {
  return TEXTURE_MAPPING_VARIABLE_IDS[variable] ?? 0;
}
