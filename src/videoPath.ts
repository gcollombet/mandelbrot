import { canonicalDecimal, canonicalScale } from './expmap/decimal'
import { t } from './i18n'

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
  dynamicRange?: 'sdr' | 'hdr'
  hdrExposure?: number
  /** HDR constant-quality quantizer index; undefined = variable bitrate. */
  hdrQuantizer?: number
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
      message: t('video.path.durationInvalid', { value: spec.durationSeconds }),
    })
  }

  for (const [labelKey, endpoint] of [['video.path.endpointStart', spec.from], ['video.path.endpointEnd', spec.to]] as const) {
    const label = t(labelKey)
    for (const field of ['cx', 'cy', 'scale'] as const) {
      const value = endpoint?.[field]
      let valid = true
      try { if (field === 'scale') canonicalScale(value); else canonicalDecimal(value) } catch { valid = false }
      if (!valid) {
        problems.push({
          kind: 'divergent-parameter',
          field,
          message: t('video.path.endpointField', { endpoint: label, field }),
        })
      }
    }
    if (!Number.isFinite(endpoint?.angle)) problems.push({kind:'divergent-parameter',field:'angle',message:t('video.path.endpointAngle', { endpoint: label })})
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
    message: t('video.path.degenerate'),
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
  if (output.dynamicRange !== undefined && !['sdr','hdr'].includes(output.dynamicRange)) problems.push({kind:'output',message:t('video.path.dynamicRangeInvalid')})
  if (output.dynamicRange === 'hdr') {
    if (output.width % 2 || output.height % 2) problems.push({kind:'output',message:t('video.path.hdrEvenDimensions')})
    if (!Number.isFinite(output.hdrExposure ?? 0) || Math.abs(output.hdrExposure ?? 0) > 16) problems.push({kind:'output',message:t('video.path.hdrExposureInvalid')})
    if (output.fps > 60) problems.push({kind:'output',message:t('video.path.hdrFpsMax')})
    if (output.hdrQuantizer !== undefined && (!Number.isInteger(output.hdrQuantizer) || output.hdrQuantizer < 0 || output.hdrQuantizer > 63)) problems.push({kind:'output',message:t('video.path.hdrQuantizerInvalid')})
  }


  for (const [label, value] of [['width', output.width], ['height', output.height]] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      problems.push({kind: 'output', field: label, message: t(label === 'width' ? 'video.path.outputWidth' : 'video.path.outputHeight')})
    }
  }
  if (!Number.isFinite(output.fps) || output.fps <= 0) {
    problems.push({kind: 'output', field: 'fps', message: t('video.path.fpsInvalid')})
  }
  if (!Number.isInteger(output.supersample)
      || !SUPERSAMPLE_FACTORS.includes(output.supersample as (typeof SUPERSAMPLE_FACTORS)[number])) {
    problems.push({
      kind: 'output',
      field: 'supersample',
      message: t('video.path.supersampleInvalid', { factors: SUPERSAMPLE_FACTORS.join(', ') }),
    })
  }

  const threshold = output.magnificationThreshold
  if (!Number.isFinite(threshold)
      || threshold < MIN_MAGNIFICATION_THRESHOLD
      || threshold > MAX_MAGNIFICATION_THRESHOLD) {
    problems.push({
      kind: 'threshold',
      field: 'magnificationThreshold',
      message: t('video.path.thresholdRange', { min: MIN_MAGNIFICATION_THRESHOLD, max: MAX_MAGNIFICATION_THRESHOLD, value: threshold }),
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
        message: t('video.path.textureTooLarge', { width: output.width, height: output.height, supersample: output.supersample, neutral, limit: maxTextureDimension }),
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
    message: t('video.path.softness', { threshold: output.magnificationThreshold, supersample: output.supersample }),
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
