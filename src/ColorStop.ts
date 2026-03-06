/**
 * A single stop in the extended palette.
 *
 * `color` and `position` define the RGB gradient as before.
 * The 10 optional effect fields are encoded into palette-texture rows 0-3
 * and interpolated between stops just like colors.
 *
 * Texture layout (4096 x 4, rgba16float):
 *   Row 0 (y = 0.125): R, G, B, palette   (palette = opacity of RGB color)
 *   Row 1 (y = 0.375): zebra, tessellation, shading, skybox
 *   Row 2 (y = 0.625): webcam, smoothness, shadingLevel, specularPower
 *   Row 3 (y = 0.875): lightAngle, (reserved), (reserved), (reserved)
 *
 * tessellationLevel and displacementAmount are global uniforms (not per-stop).
 *
 * Activation weights are in [0, 1].
 * Continuous parameters are stored in their natural range (float16).
 */
export type ColorStop = {
  /** CSS color string (hex, rgb, hsl, etc.) */
  color: string;
  /** Position along the palette in [0, 1] */
  position: number;

  // ── Activation weights (0 = off, 1 = full, fractional = blend) ──

  /** Weight of the RGB palette color source (default 1) */
  palette?: number;
  /** Zebra-stripe intensity (default 0) */
  zebra?: number;
  /** Tessellation source weight (default 0) */
  tessellation?: number;
  /** Phong-style shading intensity (default 0) */
  shading?: number;
  /** Skybox reflection weight inside shading (default 0) */
  skybox?: number;
  /** Webcam source weight (default 0) */
  webcam?: number;
  /** Smooth iteration blending weight (default 1) */
  smoothness?: number;

  // ── Continuous effect parameters (natural ranges) ──

  /** Shading diffuse/ambient level, range [0, 3] (default 1.5) */
  shadingLevel?: number;
  /** Specular exponent, range [1, 64] (default 20) */
  specularPower?: number;
  /** Light azimuth angle in radians, range [0, 2pi] (default 0.75) */
  lightAngle?: number;

  // Legacy fields (kept for backward compat with saved presets, ignored by renderer)
  /** @deprecated Now a global uniform. Kept for preset compat. */
  tessellationLevel?: number;
  /** @deprecated Now a global uniform. Kept for preset compat. */
  displacementAmount?: number;
};

/**
 * Default values for every optional effect field.
 * Used when a stop does not specify a field (legacy stops, new stops, etc.).
 */
export const COLOR_STOP_DEFAULTS = {
  palette: 1.0,
  zebra: 0.0,
  tessellation: 0.0,
  shading: 0.0,
  skybox: 0.0,
  webcam: 0.0,
  smoothness: 1.0,
  shadingLevel: 1.5,
  specularPower: 20.0,
  lightAngle: 0.75,
} as const satisfies Record<EffectFieldName, number>;

/** All optional effect field names (activation weights + continuous params). */
export const EFFECT_FIELD_NAMES = [
  'palette',
  'zebra',
  'tessellation',
  'shading',
  'skybox',
  'webcam',
  'smoothness',
  'shadingLevel',
  'specularPower',
  'lightAngle',
] as const;

export type EffectFieldName = (typeof EFFECT_FIELD_NAMES)[number];

/**
 * Return the effective value of an effect field on a stop,
 * falling back to the default if the field is undefined.
 */
export function getEffectValue(stop: ColorStop, field: EffectFieldName): number {
  return stop[field] ?? COLOR_STOP_DEFAULTS[field];
}
