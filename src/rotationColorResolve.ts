/**
 * The neutral and screen lattices coincide at multiples of 90 degrees. The
 * sin(2θ) form makes that periodicity explicit without angle normalization.
 */
export const ROTATION_ALIGNMENT_EPSILON = 1e-3

export function rotationNeedsColorResolve(angle: number): boolean {
  return Number.isFinite(angle)
    && Math.abs(Math.sin(2 * angle)) > ROTATION_ALIGNMENT_EPSILON
}

/**
 * A zero counter is safe for the terminal rotation bake once it was sampled
 * after the last frame that could mutate the raw field. Later readbacks of the
 * unchanged field are redundant and must not hold the bake hostage.
 */
export function rotationHasFreshZeroCounter(
  unfinishedPixelCount: number,
  counterSampleFrame: number,
  lastRawMutationFrame: number,
): boolean {
  return unfinishedPixelCount === 0
    && counterSampleFrame >= lastRawMutationFrame
}
