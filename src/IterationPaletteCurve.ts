export const ITERATION_PALETTE_CURVES = [
  'linear',
  'soft-root',
  'logarithmic',
  'quadratic',
] as const;

export type IterationPaletteCurve = typeof ITERATION_PALETTE_CURVES[number];

const SQRT_2_MINUS_1 = Math.SQRT2 - 1;
const LOG_2 = Math.log(2);

export function normalizeIterationPaletteCurve(value: unknown): IterationPaletteCurve {
  return typeof value === 'string'
    && (ITERATION_PALETTE_CURVES as readonly string[]).includes(value)
    ? value as IterationPaletteCurve
    : 'linear';
}

export function iterationPaletteCurveCode(value: unknown): number {
  switch (normalizeIterationPaletteCurve(value)) {
    case 'soft-root': return 1;
    case 'logarithmic': return 2;
    case 'quadratic': return 3;
    case 'linear':
    default: return 0;
  }
}

/**
 * Warp the normalized smooth-iteration coordinate before palette shifts and
 * repeat/mirror wrapping. Every supported curve maps 0 → 0 and 1 → 1.
 */
export function applyIterationPaletteCurve(
  coordinate: number,
  curve: unknown = 'linear',
): number {
  const u = Math.max(coordinate, 0);
  switch (normalizeIterationPaletteCurve(curve)) {
    case 'soft-root':
      return (Math.sqrt(1 + u) - 1) / SQRT_2_MINUS_1;
    case 'logarithmic':
      return Math.log1p(u) / LOG_2;
    case 'quadratic':
      return u * (u + 2) / 3;
    case 'linear':
    default:
      return u;
  }
}

/** Derivative of applyIterationPaletteCurve with respect to its coordinate. */
export function iterationPaletteCurveDerivative(
  coordinate: number,
  curve: unknown = 'linear',
): number {
  const u = Math.max(coordinate, 0);
  switch (normalizeIterationPaletteCurve(curve)) {
    case 'soft-root':
      return 1 / (2 * SQRT_2_MINUS_1 * Math.sqrt(1 + u));
    case 'logarithmic':
      return 1 / ((1 + u) * LOG_2);
    case 'quadratic':
      return 2 * (1 + u) / 3;
    case 'linear':
    default:
      return 1;
  }
}
