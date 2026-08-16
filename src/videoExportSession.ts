// ── Deterministic frame loop for video export ──
// Separates the export's control flow from GPU and Vue wiring, in the same
// spirit as zoomState.ts and fieldConvergence.ts, so the loop's exactness and
// failure handling can be tested without a device.
//
// The loop's contract: never emit a frame that is not converged, never let the
// camera position depend on how long a frame took to compute, and fail loudly
// rather than quietly shipping a bad frame into an encode that may run for
// hours before anyone looks at it.

export type VideoExportSettings = {
  /** Frames per second of the produced file. */
  fps: number
  /** Parcours duration in seconds. */
  durationSeconds: number
  /**
   * Maximum render pumps spent on a single frame before giving up. A frame that
   * exceeds this fails the export: emitting a half-converged image would be
   * indistinguishable from a converged one in the output file.
   */
  maxPumpsPerFrame: number
}

export type VideoExportDriver = {
  /**
   * Place the camera and the animation clock at an ABSOLUTE parcours time, in
   * seconds. Must be idempotent: the loop calls it once per frame but pumps
   * rendering repeatedly, and the camera may not creep forward while pumping.
   * Null hands the clock back to wall time.
   */
  setExportTime(elapsedSeconds: number | null): void
  /** Run one render pass. */
  drawOnce(): Promise<void>
  /** Export convergence gate — see fieldConvergence.isFieldConverged. */
  isFrameReady(): boolean
  /** Hand a converged frame to the capture/encode chain. */
  emitFrame(frame: VideoExportFrame): Promise<void>
}

export type VideoExportFrame = {
  index: number
  /** Absolute parcours time this frame was rendered at, in seconds. */
  elapsedSeconds: number
  /** Render pumps this frame needed. 0 means it was already converged. */
  pumps: number
}

export type VideoExportProgress = {
  framesEmitted: number
  totalFrames: number
}

export type VideoExportResult = {
  totalFrames: number
  framesEmitted: number
  /** Pumps summed over the whole session — the session's real compute cost. */
  totalPumps: number
  /** Frames that needed no pump at all: the frozen/live cycle's payoff. */
  freeFrames: number
  cancelled: boolean
}

export class VideoExportFrameTimeout extends Error {
  frameIndex: number
  pumps: number

  constructor(frameIndex: number, pumps: number) {
    super(
      `Video export aborted: frame ${frameIndex} did not converge after ${pumps} render pumps. `
      + 'No partially converged frame was emitted.',
    )
    this.name = 'VideoExportFrameTimeout'
    this.frameIndex = frameIndex
    this.pumps = pumps
  }
}

/**
 * Number of frames a parcours produces.
 *
 * `ceil` rather than `round`: a parcours must never be cut short of its stated
 * duration.
 */
export function totalFramesFor(settings: Pick<VideoExportSettings, 'fps' | 'durationSeconds'>): number {
  return Math.max(1, Math.ceil(settings.durationSeconds * settings.fps))
}

/**
 * Absolute parcours time for frame `index`.
 *
 * Spread across `[0, duration]` inclusive rather than stepped by `1/fps`, so
 * that the first frame sits exactly on A and the last exactly on B. Stepping by
 * `1/fps` would leave the final frame at `(N-1)/fps`, one frame short of the
 * destination — a travel shot that stops just before arriving.
 *
 * The resulting interval is `duration/(N-1)` instead of `1/fps`, a relative
 * difference of `1/(N-1)`: 0.1% over a 900-frame parcours, and it buys exact
 * endpoints at both ends.
 *
 * Derived from the index every time, never accumulated — summing `1/fps` in f64
 * does not reliably reach the duration (at 30 fps over 0.5 s the sum of fifteen
 * steps is 0.49999999999999994).
 */
export function elapsedForFrame(
  index: number,
  totalFrames: number,
  durationSeconds: number,
): number {
  if (totalFrames <= 1) return durationSeconds
  const clamped = Math.min(Math.max(index, 0), totalFrames - 1)
  return durationSeconds * clamped / (totalFrames - 1)
}

export function validateVideoExportSettings(settings: VideoExportSettings): string[] {
  const problems: string[] = []
  if (!Number.isFinite(settings.fps) || settings.fps <= 0) {
    problems.push('fps must be a positive finite number')
  }
  if (!Number.isFinite(settings.durationSeconds) || settings.durationSeconds <= 0) {
    problems.push('duration must be a positive finite number of seconds')
  }
  if (!Number.isInteger(settings.maxPumpsPerFrame) || settings.maxPumpsPerFrame < 1) {
    problems.push('maxPumpsPerFrame must be a positive integer')
  }
  return problems
}

/**
 * Drive a full export.
 *
 * Deliberately not built on requestAnimationFrame: rAF is fully halted in a
 * hidden tab (measured at 0 Hz, against 12 kHz for a GPU-fence await), so an
 * rAF-driven export would stop the moment the user switched tabs.
 */
export async function runVideoExport(
  driver: VideoExportDriver,
  settings: VideoExportSettings,
  options: {
    onProgress?: (progress: VideoExportProgress) => void
    signal?: { aborted: boolean }
  } = {},
): Promise<VideoExportResult> {
  const problems = validateVideoExportSettings(settings)
  if (problems.length > 0) {
    throw new Error(`Invalid video export settings: ${problems.join('; ')}`)
  }

  const totalFrames = totalFramesFor(settings)
  let framesEmitted = 0
  let totalPumps = 0
  let freeFrames = 0
  let cancelled = false

  try {
    for (let index = 0; index < totalFrames; index++) {
      if (options.signal?.aborted) {
        cancelled = true
        break
      }

      const elapsedSeconds = elapsedForFrame(index, totalFrames, settings.durationSeconds)
      driver.setExportTime(elapsedSeconds)

      let pumps = 0
      while (!driver.isFrameReady()) {
        if (options.signal?.aborted) {
          cancelled = true
          break
        }
        if (pumps >= settings.maxPumpsPerFrame) {
          throw new VideoExportFrameTimeout(index, pumps)
        }
        await driver.drawOnce()
        pumps++
      }
      if (cancelled) break

      totalPumps += pumps
      if (pumps === 0) freeFrames++

      await driver.emitFrame({ index, elapsedSeconds, pumps })
      framesEmitted++
      options.onProgress?.({ framesEmitted, totalFrames })
    }
  } finally {
    // Hand the clock back on every exit path — success, cancellation, timeout
    // and any driver error alike. Leaving the engine pinned to an export time
    // would freeze the interactive view at the last rendered frame.
    driver.setExportTime(null)
  }

  return { totalFrames, framesEmitted, totalPumps, freeFrames, cancelled }
}
