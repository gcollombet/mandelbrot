// ── Parcours model and validation for video export ──
// Pure logic, no GPU and no Vue, so every refusal path is testable.
//
// A parcours is two CAMERA LOCATIONS and a duration. Both are captured the same
// way — from the live view, pinned with a button — so the workflow is: set up
// the look you want, pin the start, fly to where you want to end, pin the
// destination, export.
//
// The film renders with the current appearance throughout. Nothing pops,
// because nothing but the camera moves, and there is no second parameter set to
// reconcile with.

/** Camera fields a parcours moves between its two endpoints. */
export const INTERPOLATED_CAMERA_FIELDS = ['cx', 'cy', 'scale', 'angle'] as const

/** A pinned camera position. Centre and scale are decimal strings: the view
 *  goes far below what f64 can hold, so they must never round-trip through a
 *  number. */
export type VideoPathLocation = {
  cx: string
  cy: string
  scale: string
  angle: number
}

export type VideoPathSpec = {
  from: VideoPathLocation
  to: VideoPathLocation
  durationSeconds: number
}

/** Bounds of the frozen/live swap threshold offered for an export. */
/** Supersampling factors offered. Higher is quadratically more expensive: the
 *  working texture is a square of the surface diagonal, so x8 costs 64x the
 *  texels of x1. */
export const SUPERSAMPLE_FACTORS = [1, 2, 3, 4, 6, 8] as const

/** Rough working-set cost per texel of the square working texture, in bytes:
 *  the raw ping-pong pair plus the resolved/frozen display sets and scratch.
 *  An estimate for guidance in the UI, not an allocation contract. */
export const WORKING_BYTES_PER_TEXEL = 324

export const MIN_MAGNIFICATION_THRESHOLD = 2
export const MAX_MAGNIFICATION_THRESHOLD = 32

export type VideoOutputSpec = {
  width: number
  height: number
  fps: number
  /** Integer supersampling factor for the capture. */
  supersample: number
  /**
   * Frozen/live swap threshold. Independent of `supersample`: it governs how
   * often a full reconvergence is paid (one per factor-T of zoom), while
   * `supersample` governs sampling density. A high threshold makes an export
   * dramatically faster at the cost of a softer periphery mid-cycle — a
   * trade-off that belongs to the user, not to a hard rule.
   */
  magnificationThreshold: number
}

export type VideoPathProblem = {
  kind: 'duration' | 'divergent-parameter' | 'palette' | 'output' | 'threshold'
  field?: string
  message: string
}


/**
 * Blocking problems only — what makes a parcours impossible to render. A
 * degenerate but renderable parcours (both ends at the same place) is a
 * warning, not a refusal.
 */
export function validateVideoPath(spec: VideoPathSpec): VideoPathProblem[] {
  const problems: VideoPathProblem[] = []

  if (!Number.isFinite(spec.durationSeconds) || spec.durationSeconds <= 0) {
    problems.push({
      kind: 'duration',
      message: `La durée doit être un nombre de secondes fini et positif (reçu ${spec.durationSeconds}).`,
    })
  }

  for (const [label, endpoint] of [['départ', spec.from], ['arrivée', spec.to]] as const) {
    for (const field of ['cx', 'cy', 'scale'] as const) {
      const value = endpoint?.[field]
      if (typeof value !== 'string' || value.trim() === '' || !Number.isFinite(Number(value))) {
        problems.push({
          kind: 'divergent-parameter',
          field,
          message: `Le point de ${label} ne porte pas de "${field}" exploitable.`,
        })
      }
    }
  }

  return problems
}

export type ParcoursWarning = {
  kind: 'degenerate' | 'softness'
  message: string
}

/** Things worth saying about a renderable parcours. */
export function describeParcoursWarnings(
  from: VideoPathLocation,
  to: VideoPathLocation,
): ParcoursWarning[] {
  if (!from || !to) return []
  const sameCamera = from.cx === to.cx
    && from.cy === to.cy
    && from.scale === to.scale
    && Number(from.angle) === Number(to.angle)
  if (!sameCamera) return []
  return [{
    kind: 'degenerate',
    message: 'Le départ et l\u2019arrivée sont au même endroit : le film sera une image fixe répétée. '
      + 'Navigue puis redéfinis l\u2019un des deux points.',
  }]
}

/**
 * Side of the square working texture the engine allocates for a given render
 * surface: the diagonal, so a rotated viewport always stays covered.
 */
export function neutralSizeFor(width: number, height: number): number {
  return Math.ceil(Math.sqrt(width * width + height * height))
}

/**
 * Validate an output spec against the device limit.
 *
 * `resize()` clamps the render surface to `maxTextureDimension2D` but derives
 * `neutralSize` from it afterwards without clamping, so an oversized request
 * fails allocation outright rather than degrading. Refusing here, before any
 * texture is created, is what keeps that from surfacing as a device error.
 */
export function validateVideoOutput(
  output: VideoOutputSpec,
  maxTextureDimension: number,
): VideoPathProblem[] {
  const problems: VideoPathProblem[] = []

  for (const [label, value] of [['width', output.width], ['height', output.height]] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      problems.push({kind: 'output', field: label, message: `La ${label === 'width' ? 'largeur' : 'hauteur'} de sortie doit être un entier positif.`})
    }
  }
  if (!Number.isFinite(output.fps) || output.fps <= 0) {
    problems.push({kind: 'output', field: 'fps', message: 'La cadence doit être un nombre fini et positif.'})
  }
  if (!Number.isInteger(output.supersample)
      || !SUPERSAMPLE_FACTORS.includes(output.supersample as (typeof SUPERSAMPLE_FACTORS)[number])) {
    problems.push({
      kind: 'output',
      field: 'supersample',
      message: `Le suréchantillonnage doit être l\u2019un de ${SUPERSAMPLE_FACTORS.join(', ')} — `
        + 'un facteur fractionnaire n\u2019a pas de filtre box exact.',
    })
  }

  const threshold = output.magnificationThreshold
  if (!Number.isFinite(threshold)
      || threshold < MIN_MAGNIFICATION_THRESHOLD
      || threshold > MAX_MAGNIFICATION_THRESHOLD) {
    problems.push({
      kind: 'threshold',
      field: 'magnificationThreshold',
      message: `Le seuil de bascule doit être compris entre ${MIN_MAGNIFICATION_THRESHOLD} et `
        + `${MAX_MAGNIFICATION_THRESHOLD} (reçu ${threshold}).`,
    })
  }

  if (problems.length === 0) {
    const neutral = neutralSizeFor(
      output.width * output.supersample,
      output.height * output.supersample,
    )
    if (neutral > maxTextureDimension) {
      problems.push({
        kind: 'output',
        message: `${output.width}×${output.height} en ×${output.supersample} exige une texture de travail `
          + `${neutral}², au-delà de la limite de cet appareil (${maxTextureDimension}). `
          + 'Baisse la résolution ou le suréchantillonnage.',
      })
    }
  }

  return problems
}

/**
 * Quality note on an output spec: between two swaps the frozen texture is
 * magnified by up to the threshold, so a threshold above the supersampling
 * factor leaves the outer ring softer than the output resolution. Worth saying,
 * not worth refusing — a high threshold is the main lever for export speed.
 */
export function describeOutputWarnings(output: VideoOutputSpec): ParcoursWarning[] {
  if (output.magnificationThreshold <= output.supersample) return []
  return [{
    kind: 'softness',
    message: `Seuil ${output.magnificationThreshold} au-delà du suréchantillonnage ×${output.supersample} : `
      + 'la périphérie sera plus douce entre deux bascules, en échange d\u2019un export nettement plus rapide '
      + '(une reconvergence complète par facteur de zoom égal au seuil).',
  }]
}

/** Estimated GPU working set for an output spec, in bytes. */
export function estimatedWorkingBytes(output: VideoOutputSpec): number {
  const side = neutralSizeFor(output.width * output.supersample, output.height * output.supersample)
  return side * side * WORKING_BYTES_PER_TEXEL
}

export function formatVideoPathProblems(problems: VideoPathProblem[]): string {
  return problems.map(p => (p.field ? `${p.field}: ${p.message}` : p.message)).join('\n')
}
