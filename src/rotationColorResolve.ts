/**
 * The neutral and screen lattices coincide at multiples of 90 degrees. The
 * sin(2θ) form makes that periodicity explicit without angle normalization.
 */
export const ROTATION_ALIGNMENT_EPSILON = 1e-3

export function rotationNeedsColorResolve(angle: number): boolean {
  return Number.isFinite(angle)
    && Math.abs(Math.sin(2 * angle)) > ROTATION_ALIGNMENT_EPSILON
}
