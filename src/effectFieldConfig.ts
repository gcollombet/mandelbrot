export const EFFECT_FIELD_NAMES = [
  'palette',
  'zebra',
  'tessellation',
  'shading',
  'skybox',
  'webcam',
  'smoothness',
  'stripeAverage',
  'rotationMean',
  'stripeRelief',
  'directionCoherenceRelief',
  'shadingLevel',
  'specularPower',
  'dielectricSpecular',
  'metallic',
  'roughness',
  'anisotropy',
  'directionalVolume',
  'metalReflectance',
  'metalEnvironmentTint',
  'iridescencePower',
] as const;

export type EffectFieldName = (typeof EFFECT_FIELD_NAMES)[number];

export interface EffectFieldMeta {
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  textureRow: number;
  textureChannel: 0 | 1 | 2 | 3;
  uiGroup: 'color' | 'iridescence' | 'iteration' | 'lighting' | 'imageSources';
}

export const EFFECT_FIELD_CONFIG: Record<EffectFieldName, EffectFieldMeta> = {
  palette:            { label: 'Color Blend',       defaultValue: 1.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 0, textureChannel: 3, uiGroup: 'color' },
  zebra:              { label: 'Iteration Bands',   defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 1, textureChannel: 0, uiGroup: 'iteration' },
  tessellation:       { label: 'Image Blend',       defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 1, textureChannel: 1, uiGroup: 'imageSources' },
  shading:            { label: 'Lighting Blend',    defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 1, textureChannel: 2, uiGroup: 'lighting' },
  skybox:             { label: 'Reflection Blend',  defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 1, textureChannel: 3, uiGroup: 'lighting' },
  webcam:             { label: 'Webcam Blend',      defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 2, textureChannel: 0, uiGroup: 'imageSources' },
  smoothness:         { label: 'Smooth Iterations', defaultValue: 1.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 2, textureChannel: 1, uiGroup: 'iteration' },
  stripeAverage:      { label: 'Stripe Average',    defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 5, textureChannel: 0, uiGroup: 'iteration' },
  rotationMean:       { label: 'Direction Coherence', defaultValue: 0.0, min: 0, max: 1,   step: 0.01, unit: '', textureRow: 5, textureChannel: 1, uiGroup: 'iteration' },
  stripeRelief:       { label: 'Stripe Relief',     defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 5, textureChannel: 2, uiGroup: 'iteration' },
  directionCoherenceRelief: { label: 'Direction Relief', defaultValue: 0.0, min: 0, max: 100, step: 0.1, unit: '', textureRow: 5, textureChannel: 3, uiGroup: 'iteration' },
  shadingLevel:       { label: 'Light Intensity',   defaultValue: 0.0, min: 0, max: 3,     step: 0.05, unit: '', textureRow: 2, textureChannel: 2, uiGroup: 'lighting' },
  specularPower:      { label: 'Direct Specular',   defaultValue: 0,   min: 0, max: 64,    step: 0.5,  unit: '', textureRow: 2, textureChannel: 3, uiGroup: 'lighting' },
  dielectricSpecular: { label: 'Dielectric F0',     defaultValue: 0.04, min: 0, max: 1,    step: 0.01, unit: '', textureRow: 3, textureChannel: 0, uiGroup: 'lighting' },
  metallic:           { label: 'Metalness',         defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 3, textureChannel: 1, uiGroup: 'lighting' },
  roughness:          { label: 'Roughness',         defaultValue: 0,   min: 0.02, max: 1,  step: 0.01, unit: '', textureRow: 3, textureChannel: 2, uiGroup: 'lighting' },
  anisotropy:         { label: 'Anisotropy',        defaultValue: 0.0, min: 0, max: 1,     step: 0.01, unit: '', textureRow: 3, textureChannel: 3, uiGroup: 'lighting' },
  directionalVolume:  { label: 'Directional Volume', defaultValue: 1.0, min: 0, max: 1,   step: 0.01, unit: '', textureRow: 6, textureChannel: 0, uiGroup: 'lighting' },
  metalReflectance:   { label: 'Metal Reflectance', defaultValue: 1.0, min: 0, max: 2,     step: 0.01, unit: '', textureRow: 6, textureChannel: 1, uiGroup: 'lighting' },
  metalEnvironmentTint: { label: 'Metal Env Tint', defaultValue: 0.0, min: 0, max: 1,      step: 0.01, unit: '', textureRow: 6, textureChannel: 2, uiGroup: 'lighting' },
  iridescencePower:   { label: 'Iridescence Strength', defaultValue: 0.0, min: 0, max: 1, step: 0.01, unit: '', textureRow: 4, textureChannel: 3, uiGroup: 'iridescence' },
};

export const DEFAULT_VALUES: Record<EffectFieldName, number> = Object.fromEntries(
  EFFECT_FIELD_NAMES.map((name) => [name, EFFECT_FIELD_CONFIG[name].defaultValue]),
) as Record<EffectFieldName, number>;

export const UI_GROUPS: Record<string, EffectFieldName[]> = {};
for (const name of EFFECT_FIELD_NAMES) {
  const group = EFFECT_FIELD_CONFIG[name].uiGroup;
  if (!UI_GROUPS[group]) {
    UI_GROUPS[group] = [];
  }
  UI_GROUPS[group].push(name);
}
