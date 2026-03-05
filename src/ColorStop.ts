/**
 * A single stop in the extended palette.
 *
 * `color` and `position` define the RGB gradient as before.
 * The 12 optional effect fields are encoded into palette-texture rows 0-3
 * and interpolated between stops just like colors.
 *
 * Texture layout (4096 x 4, rgba8unorm):
 *   Row 0 (y = 0.125): R, G, B, palette   (palette = opacity of RGB color)
 *   Row 1 (y = 0.375): zebra, tessellation, shading, skybox
 *   Row 2 (y = 0.625): webcam, smoothness, shadingLevel/3, specularPower/64
 *   Row 3 (y = 0.875): lightAngle/2pi, tessellationLevel/10, displacementAmount/0.1, (reserved)
 *
 * Activation weights are in [0, 1].
 * Continuous parameters are stored in their natural range and normalized
 * to [0, 1] at texture-generation time.
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
  /** Tessellation grid level, range [0, 10] (default 4) */
  tessellationLevel?: number;
  /** Displacement amount, range [0, 0.1] (default 0.02) */
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
  tessellationLevel: 4.0,
  displacementAmount: 0.02,
} as const satisfies Required<Omit<ColorStop, 'color' | 'position'>>;

/**
 * Normalization divisors for encoding continuous parameters into [0, 1]
 * before writing them to the 8-bit palette texture.
 */
export const PARAM_DIVISORS = {
  shadingLevel: 3.0,
  specularPower: 64.0,
  lightAngle: 2.0 * Math.PI,
  tessellationLevel: 10.0,
  displacementAmount: 0.1,
} as const;

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
  'tessellationLevel',
  'displacementAmount',
] as const;

export type EffectFieldName = (typeof EFFECT_FIELD_NAMES)[number];

/**
 * Return the effective value of an effect field on a stop,
 * falling back to the default if the field is undefined.
 */
export function getEffectValue(stop: ColorStop, field: EffectFieldName): number {
  return stop[field] ?? COLOR_STOP_DEFAULTS[field];
}
