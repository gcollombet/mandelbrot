import { interpolateRgb } from 'd3-interpolate';

/**
 * A single stop in the extended palette.
 *
 * `color` and `position` define the RGB gradient as before.
 * The optional effect fields are encoded into palette-texture rows 0-3
 * and interpolated between stops just like colors.
 *
 * Texture layout (4096 x 6, rgba16float):
 *   Row 0: R, G, B, palette   (palette = opacity of RGB color)
 *   Row 1: zebra, tessellation, shading, skybox
 *   Row 2: webcam, smoothness, shadingLevel, specularPower
 *   Row 3: lightAngle, metallic, roughness, anisotropy
 *   Row 4: iridescence R, G, B, enabled
 *   Row 5: stripeAverage, directionCoherence, stripeRelief, directionCoherenceRelief
 *
 * tessellationLevel and displacementAmount are global uniforms (not per-stop).
 *
 * Activation weights are in [0, 1].
 * Continuous parameters are stored in their natural range (float16).
 */
export const STOP_TRANSFER_CURVES = ['linear', 'gaussian', 'square', 'exponential'] as const;

export type StopTransferCurve = (typeof STOP_TRANSFER_CURVES)[number];

export function isStopTransferCurve(value: unknown): value is StopTransferCurve {
  return typeof value === 'string' && (STOP_TRANSFER_CURVES as readonly string[]).includes(value);
}

export function getStopTransferCurve(stop: ColorStop): StopTransferCurve {
  return isStopTransferCurve(stop.transferCurve) ? stop.transferCurve : 'linear';
}

export function applyStopTransferCurve(curve: StopTransferCurve, t: number): number {
  const x = clamp01(t);
  switch (curve) {
    case 'gaussian': {
      // Plateau at start, smooth transition, plateau at end.
      const edgeStart = 0.28;
      const edgeEnd = 0.72;
      if (x <= edgeStart) return 0;
      if (x >= edgeEnd) return 1;
      const u = (x - edgeStart) / (edgeEnd - edgeStart);
      return u * u * (3 - 2 * u);
    }
    case 'square':
      // Square-wave transfer: immediate jump to next stop right after the boundary.
      return x <= 0 ? 0 : 1;
    case 'exponential':
      return (Math.exp(3 * x) - 1) / (Math.exp(3) - 1);
    case 'linear':
    default:
      return x;
  }
}

export type ColorStop = {
  /** CSS color string (hex, rgb, hsl, etc.) */
  color: string;
  /** Optional color used at grazing angles through a Fresnel blend. */
  iridescenceColor?: string;
  /** Position along the palette in [0, 1] */
  position: number;
  /** Transfer curve used from this stop to the next stop. */
  transferCurve?: StopTransferCurve;

  // ── Activation weights (0 = off, 1 = full, fractional = blend) ──

  /** Weight of the RGB palette color source (default 1) */
  palette?: number;
  /** Zebra-stripe intensity (default 0) */
  zebra?: number;
  /** Tessellation source weight (default 0) */
  tessellation?: number;
  /** Lighting/material intensity (default 0) */
  shading?: number;
  /** Skybox reflection weight inside shading (default 0) */
  skybox?: number;
  /** Webcam source weight (default 0) */
  webcam?: number;
  /** Smooth iteration blending weight (default 1) */
  smoothness?: number;
  /** Stripe average coloring blend weight (default 0) */
  stripeAverage?: number;
  /** Average orbit-direction coherence coloring blend weight (default 0) */
  rotationMean?: number;
  /** Stripe average normal relief strength (default 0) */
  stripeRelief?: number;
  /** Average orbit-direction coherence normal relief strength (default 0) */
  directionCoherenceRelief?: number;

  // ── Continuous effect parameters (natural ranges) ──

  /** Shading diffuse/ambient level, range [0, 3] (default 1.5) */
  shadingLevel?: number;
  /** Specular intensity, range [1, 64] (default 20) */
  specularPower?: number;
  /** Light azimuth angle in radians, range [0, 2pi] (default 0.75) */
  lightAngle?: number;
  /** Metallic response, range [0, 1] (default 0) */
  metallic?: number;
  /** Per-stop roughness, range [0.02, 1] (default 0.35) */
  roughness?: number;
  /** Anisotropic highlight strength, range [0, 1] (default 0.4) */
  anisotropy?: number;

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
  stripeAverage: 0.0,
  rotationMean: 0.0,
  stripeRelief: 0.0,
  directionCoherenceRelief: 0.0,
  shadingLevel: 1.5,
  specularPower: 20.0,
  lightAngle: 0.75,
  metallic: 0.0,
  roughness: 0.35,
  anisotropy: 0.4,
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
  'stripeAverage',
  'rotationMean',
  'stripeRelief',
  'directionCoherenceRelief',
  'shadingLevel',
  'specularPower',
  'lightAngle',
  'metallic',
  'roughness',
  'anisotropy',
] as const;

export type EffectFieldName = (typeof EFFECT_FIELD_NAMES)[number];

/**
 * Return the effective value of an effect field on a stop,
 * falling back to the default if the field is undefined.
 */
export function getEffectValue(stop: ColorStop, field: EffectFieldName): number {
  return stop[field] ?? COLOR_STOP_DEFAULTS[field];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  const tau = Math.PI * 2;
  const delta = ((b - a + Math.PI) % tau + tau) % tau - Math.PI;
  return ((a + delta * t) % tau + tau) % tau;
}

function findAdjacentStops(stops: ColorStop[], position: number): [ColorStop, ColorStop, number] | null {
  if (stops.length === 0) return null;

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const rightIndex = sortedStops.findIndex(stop => stop.position >= position);
  if (rightIndex <= 0) {
    const stop = sortedStops[rightIndex < 0 ? sortedStops.length - 1 : 0];
    return [stop, stop, 0];
  }

  if (rightIndex < 0) {
    const stop = sortedStops[sortedStops.length - 1];
    return [stop, stop, 0];
  }

  const left = sortedStops[rightIndex - 1];
  const right = sortedStops[rightIndex];
  const span = right.position - left.position;
  const localT = span > 0 ? clamp01((position - left.position) / span) : 0;
  return [left, right, localT];
}

export function createInterpolatedColorStop(
  stops: ColorStop[],
  position: number,
  color: string,
): ColorStop {
  const clampedPosition = clamp01(position);
  const newStop: ColorStop = { color, position: clampedPosition };
  const adjacent = findAdjacentStops(stops, clampedPosition);
  if (adjacent) {
    const [left, right, t] = adjacent;
    newStop.transferCurve = getStopTransferCurve(left);
    if (left.iridescenceColor || right.iridescenceColor) {
      const leftColor = left.iridescenceColor ?? left.color;
      const rightColor = right.iridescenceColor ?? right.color;
      newStop.iridescenceColor = interpolateRgb(leftColor, rightColor)(t);
    }
  }

  for (const field of EFFECT_FIELD_NAMES) {
    if (!adjacent) {
      newStop[field] = COLOR_STOP_DEFAULTS[field];
      continue;
    }

    const [left, right, t] = adjacent;
    const leftValue = getEffectValue(left, field);
    const rightValue = getEffectValue(right, field);
    newStop[field] = field === 'lightAngle'
      ? lerpAngle(leftValue, rightValue, t)
      : lerp(leftValue, rightValue, t);
  }

  return newStop;
}
