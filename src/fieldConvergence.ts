// ── Convergence gate for the progressive render pipeline ──
// Separates the "is this image finished, on fresh evidence?" decision from GPU
// effects in Engine.ts, in the same spirit as zoomState.ts.
//
// The distinction this module exists to protect: a small unfinished-pixel count
// is NOT by itself evidence of convergence. That count arrives by asynchronous
// readback, so it can predate the last mutation of the raw field. Acting on a
// stale counter means acting on a half-computed image — invisible in interactive
// use, where the next frame corrects it, and fatal for a video export, where the
// frame has already been encoded.

/**
 * Minimum number of unfinished pixels below which the image counts as fully
 * converged. A few stray pixels can linger indefinitely near numerically
 * ambiguous fractal boundaries — not worth spinning the GPU for. The render
 * loop stops driving frames at this same threshold, so requiring exactly 0
 * anywhere else would deadlock on those views.
 */
export const UNFINISHED_PIXEL_DONE_THRESHOLD = 10

export type FieldConvergenceState = {
  /** A history clear is armed for the next frame. */
  clearHistoryNextFrame: boolean
  /** A resolved → frozen snapshot is owed. */
  needFreezeSnapshot: boolean
  /** A resolved + frozen merge is owed. */
  needMergeSnapshot: boolean
  /** The frozen/live zoom cycle is running. */
  zoomActive: boolean
  /** The reference orbit is shorter than the current iteration budget. */
  orbitIncomplete: boolean
  /** Unfinished pixels from the last readback. Negative = not yet known. */
  unfinishedPixelCount: number
  /** A counter readback for the CURRENT generation has not landed yet. */
  pendingCounterReadback: boolean
}

export type FieldConvergenceOptions = {
  /**
   * Video export only. The export deliberately keeps the frozen/live zoom cycle
   * alive across the whole parcours — one raw convergence serves many emitted
   * frames — so `zoomActive` would be permanently true and the gate permanently
   * closed. This relaxes *which* frames qualify, never *how strong* the
   * convergence evidence must be: every other term is unchanged.
   */
  ignoreZoomCycle?: boolean
}

export function isFieldConverged(
  state: FieldConvergenceState,
  options: FieldConvergenceOptions = {},
): boolean {
  return !state.clearHistoryNextFrame
    && !state.needFreezeSnapshot
    && !state.needMergeSnapshot
    && (options.ignoreZoomCycle === true || !state.zoomActive)
    && !state.orbitIncomplete
    && state.unfinishedPixelCount >= 0
    && state.unfinishedPixelCount <= UNFINISHED_PIXEL_DONE_THRESHOLD
    && !state.pendingCounterReadback
}
