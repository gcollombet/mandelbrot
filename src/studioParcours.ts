import { t } from './i18n'
import { isStopTransferCurve, applyStopTransferCurve, type StopTransferCurve } from './ColorStop'
import type { MandelbrotParams } from './Mandelbrot'
import { normalizeOrbitTrapFromLegacy } from './OrbitTrap'
import { snapshotPathAppearance, type PathAppearance } from './palettePath'
import { interpolatePresetAppearance, TRANSITION_DEFAULTS } from './presetTransition'
import { log10FromDecimalString } from './floatexp'
import type { VideoPathLocation } from './videoPath'
import { canonicalDecimal, canonicalScale } from './expmap/decimal'
import { validateAudioRef, validateModulators, type StudioAudioRef, type StudioModulator } from './studioAudio'

// ── Studio parcours: a keyframe timeline indexed by TIME ──
//
// The palette path is indexed by zoom magnitude and the video parcours holds
// two camera locations. The studio parcours is the union of both, keyed by
// seconds: every keyframe may carry a camera, a look, or both, and each scope
// interpolates on its own between the keyframes that declare it.
//
// Pure logic, no GPU and no Vue, so the evaluator can be exercised without a
// device. The player (studioPlayer.ts) turns `cameraSegmentAt` into navigator
// export transitions and `lookStateAt` into the engine's preset transition.

export const STUDIO_PARCOURS_VERSION = 1
export const STUDIO_MAX_KEYFRAMES = 64
export const STUDIO_MIN_DURATION = 1
export const STUDIO_MAX_DURATION = 4 * 3600
/** Default slot between two camera keyframes when no clock placed them. */
export const STUDIO_DEFAULT_GAP_SECONDS = 8
/** Two keyframes closer than this collapse onto one instant. */
export const STUDIO_KEYFRAME_MIN_GAP = 0.25

/** A pinned camera: centre and scale stay decimal strings, the view goes far
 *  below f64. Same shape as the video parcours endpoints. */
export type StudioCamera = VideoPathLocation

/** Appearance snapshot: everything the preset transition can interpolate, plus
 *  the discrete choices (textures, µ, trap shape) that switch at the keyframe. */
export type StudioLook = PathAppearance & Partial<MandelbrotParams>

export type StudioKeyframe = {
  id: string
  /** Seconds from the start of the parcours. */
  time: number
  camera?: StudioCamera
  look?: StudioLook
  /** Transfer curve of the look transition that ARRIVES at this keyframe. */
  curve: StopTransferCurve
  /** Fraction of the incoming segment during which the previous look holds
   *  before the transition starts, [0, 0.95]. */
  hold: number
}

export type StudioParcours = {
  version: typeof STUDIO_PARCOURS_VERSION
  id: string
  name: string
  durationSeconds: number
  keyframes: StudioKeyframe[]
  /** Velocity ramps at both ends of the whole parcours, in seconds. */
  easeInSeconds: number
  easeOutSeconds: number
  /** Redistribute camera keyframe times for a constant perceived speed. */
  retime: boolean
  /** Imported music (studioAudioStore.ts); the file stays local. */
  audio?: StudioAudioRef
  /** Music features driving parameters on top of the keyframes. */
  modulators: StudioModulator[]
}

export type CameraSegment = {
  from: StudioCamera
  to: StudioCamera
  /** Seconds already travelled inside this segment, in camera time. */
  localElapsed: number
  /** Segment length in camera time. 0 when the camera rests on a keyframe. */
  duration: number
  /** Index of `from` in the (possibly retimed) camera keyframe list. */
  index: number
}

export type LookState = {
  a: StudioLook
  b: StudioLook
  /** Share of b already blended in, [0, 1]. */
  w: number
  /** Keyframe ids of a and b (equal when resting on one look). */
  fromId: string
  toId: string
}

/** Discrete look fields: applied at the keyframe or at zero contribution, never mixed. */
export const STUDIO_DISCRETE_LOOK_FIELDS = [
  'colorStops', 'interpolationMode', 'paletteMirror', 'iterationPaletteCurve', 'textureMapping',
  'textureGuid', 'textureName', 'skyboxGuid', 'skyboxName', 'mu', 'stripeFrequency', 'orbitTrap', 'orbitTrapStrength',
] as const

const finite = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const copyPlain = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function snapshotStudioCamera(source: Pick<MandelbrotParams, 'cx' | 'cy' | 'scale' | 'angle'>): StudioCamera {
  return { cx: String(source.cx ?? '0'), cy: String(source.cy ?? '0'), scale: String(source.scale ?? '1'), angle: finite(source.angle, 0) }
}

export function snapshotStudioLook(source: Partial<MandelbrotParams>): StudioLook {
  const look: StudioLook = snapshotPathAppearance(source)
  for (const field of Object.keys(TRANSITION_DEFAULTS) as (keyof typeof TRANSITION_DEFAULTS)[]) {
    look[field] = finite(source[field], TRANSITION_DEFAULTS[field])
  }
  look.mu = finite(source.mu, 4)
  look.stripeFrequency = finite(source.stripeFrequency, 8)
  look.orbitTrap = normalizeOrbitTrapFromLegacy(source)
  look.orbitTrapStrength = look.orbitTrap.strength
  return copyPlain(look)
}

function validateCamera(value: unknown): StudioCamera {
  const c = value as StudioCamera
  if (!c || typeof c !== 'object') throw new Error(t('studioPanel.errors.invalidCamera'))
  try { canonicalDecimal(String(c.cx)); canonicalDecimal(String(c.cy)); canonicalScale(String(c.scale)) }
  catch { throw new Error(t('studioPanel.errors.invalidCamera')) }
  if (!Number.isFinite(c.angle)) throw new Error(t('studioPanel.errors.invalidCamera'))
  return { cx: String(c.cx), cy: String(c.cy), scale: String(c.scale), angle: Number(c.angle) }
}

export function validateStudioParcours(value: unknown): StudioParcours {
  const p = value as StudioParcours
  if (!p || p.version !== STUDIO_PARCOURS_VERSION || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string'
    || !Array.isArray(p.keyframes) || p.keyframes.length > STUDIO_MAX_KEYFRAMES) throw new Error(t('studioPanel.errors.invalidParcours'))
  const durationSeconds = finite(p.durationSeconds, NaN)
  if (!(durationSeconds >= STUDIO_MIN_DURATION && durationSeconds <= STUDIO_MAX_DURATION)) throw new Error(t('studioPanel.errors.invalidDuration'))
  const ids = new Set<string>()
  const keyframes = p.keyframes.map(k => {
    if (!k || typeof k.id !== 'string' || !k.id || ids.has(k.id) || !Number.isFinite(k.time) || k.time < 0 || k.time > durationSeconds
      || (!k.camera && !k.look)) throw new Error(t('studioPanel.errors.invalidKeyframe'))
    ids.add(k.id)
    const out: StudioKeyframe = {
      id: k.id, time: k.time,
      curve: isStopTransferCurve(k.curve) ? k.curve : 'gaussian',
      hold: clamp(finite(k.hold, 0), 0, 0.95),
    }
    if (k.camera) out.camera = validateCamera(k.camera)
    if (k.look) out.look = snapshotStudioLook(k.look)
    return out
  }).sort((a, b) => a.time - b.time)
  return {
    version: STUDIO_PARCOURS_VERSION, id: p.id, name: p.name.trim().slice(0, 100) || t('studioPanel.newName'),
    durationSeconds, keyframes,
    easeInSeconds: clamp(finite(p.easeInSeconds, 2), 0, durationSeconds / 2),
    easeOutSeconds: clamp(finite(p.easeOutSeconds, 2), 0, durationSeconds / 2),
    retime: p.retime === true,
    modulators: validateModulators(p.modulators),
    ...(validateAudioRef(p.audio) ? { audio: validateAudioRef(p.audio) } : {}),
  }
}

export function newStudioParcours(name = t('studioPanel.newName')): StudioParcours {
  return { version: STUDIO_PARCOURS_VERSION, id: crypto.randomUUID(), name, durationSeconds: 30, keyframes: [],
    easeInSeconds: 2, easeOutSeconds: 2, retime: false, modulators: [] }
}

/** Insert a keyframe at `time`, merging into one already standing there. The
 *  duration grows to hold it; a keyframe past the end extends the parcours. */
export function addStudioKeyframe(parcours: StudioParcours, time: number, scope: { camera?: StudioCamera; look?: StudioLook }): StudioKeyframe {
  const at = Math.max(0, Math.round(time * 1000) / 1000)
  const existing = parcours.keyframes.find(k => Math.abs(k.time - at) < STUDIO_KEYFRAME_MIN_GAP)
  if (existing) {
    if (scope.camera) existing.camera = copyPlain(scope.camera)
    if (scope.look) existing.look = copyPlain(scope.look)
    return existing
  }
  if (parcours.keyframes.length >= STUDIO_MAX_KEYFRAMES) throw new Error(t('studioPanel.errors.tooManyKeyframes', { max: STUDIO_MAX_KEYFRAMES }))
  const keyframe: StudioKeyframe = { id: crypto.randomUUID(), time: at, curve: 'gaussian', hold: 0 }
  if (scope.camera) keyframe.camera = copyPlain(scope.camera)
  if (scope.look) keyframe.look = copyPlain(scope.look)
  parcours.keyframes.push(keyframe)
  parcours.keyframes.sort((a, b) => a.time - b.time)
  if (at > parcours.durationSeconds) parcours.durationSeconds = Math.min(STUDIO_MAX_DURATION, at)
  return keyframe
}

export function removeStudioKeyframe(parcours: StudioParcours, id: string): void {
  parcours.keyframes = parcours.keyframes.filter(k => k.id !== id)
}

/** Move a keyframe in time, keeping it between its neighbours. */
export function moveStudioKeyframe(parcours: StudioParcours, id: string, time: number): number {
  const sorted = parcours.keyframes
  const i = sorted.findIndex(k => k.id === id)
  if (i < 0) return time
  const lo = i > 0 ? sorted[i - 1].time + STUDIO_KEYFRAME_MIN_GAP : 0
  const hi = i < sorted.length - 1 ? sorted[i + 1].time - STUDIO_KEYFRAME_MIN_GAP : parcours.durationSeconds
  sorted[i].time = clamp(Math.round(time * 1000) / 1000, Math.min(lo, hi), Math.max(lo, hi))
  return sorted[i].time
}

// ── Perceptual arc length ──
// What the eye reads: decades of zoom, screen widths of pan and turns of
// angle. The pan term needs the centre difference in f64; it vanishes past
// ~1e-308 where it has no screen meaning anyway (a pan that deep is a zoom).
export function cameraDistance(a: StudioCamera, b: StudioCamera): number {
  const la = log10FromDecimalString(a.scale), lb = log10FromDecimalString(b.scale)
  const decades = Number.isFinite(la) && Number.isFinite(lb) ? Math.abs(la - lb) : 0
  const scale = Math.max(Number(a.scale), Number(b.scale))
  const dx = Number(a.cx) - Number(b.cx), dy = Number(a.cy) - Number(b.cy)
  const pan = Number.isFinite(scale) && scale > 0 && Number.isFinite(dx) && Number.isFinite(dy) ? Math.hypot(dx, dy) / scale : 0
  const turns = Math.abs(a.angle - b.angle) / (2 * Math.PI)
  // One decade ≈ one screen width of pan ≈ a quarter turn, as felt at the eye.
  return decades + Math.min(pan, 50) + turns * 4
}

/** Camera keyframes in time order; with `retime`, their times are redistributed
 *  over the same span by perceptual arc length so the felt speed stays uniform. */
export function cameraKeyframes(parcours: StudioParcours): (StudioKeyframe & { camera: StudioCamera })[] {
  const ks = parcours.keyframes.filter((k): k is StudioKeyframe & { camera: StudioCamera } => !!k.camera).sort((a, b) => a.time - b.time)
  if (!parcours.retime || ks.length < 3) return ks
  const legs = ks.slice(1).map((k, i) => cameraDistance(ks[i].camera, k.camera))
  const total = legs.reduce((a, b) => a + b, 0)
  if (!(total > 0)) return ks
  const t0 = ks[0].time, span = ks[ks.length - 1].time - t0
  let acc = 0
  return ks.map((k, i) => { if (i) acc += legs[i - 1]; return { ...k, time: t0 + span * acc / total } })
}

/** Global velocity ramps: smooth start and stop, constant speed in between.
 *  Maps parcours time to camera time over the same [0, duration] span. */
export function rampedTime(parcours: StudioParcours, time: number): number {
  const d = parcours.durationSeconds
  const a = clamp(parcours.easeInSeconds, 0, d / 2), b = clamp(parcours.easeOutSeconds, 0, d / 2)
  const x = clamp(time, 0, d)
  if (a === 0 && b === 0) return x
  // Velocity profile: 0→1 over a (smoothstep), 1 in the middle, 1→0 over b.
  // Its integral over [0, d] is d - a/2 - b/2; rescale so the end lands on d.
  const area = d - a / 2 - b / 2
  const integral = (() => {
    if (x < a) return a * (x / a) ** 3 * (1 - (x / a) / 2)              // ∫ smoothstep
    if (x > d - b) { const u = (d - x) / b; return area - b * u ** 3 * (1 - u / 2) }
    return a / 2 + (x - a)
  })()
  return d * integral / area
}

export function cameraSegmentAt(parcours: StudioParcours, time: number): CameraSegment | null {
  const ks = cameraKeyframes(parcours)
  if (!ks.length) return null
  const u = rampedTime(parcours, time)
  if (u <= ks[0].time) return { from: ks[0].camera, to: ks[0].camera, localElapsed: 0, duration: 0, index: 0 }
  const last = ks[ks.length - 1]
  if (u >= last.time) return { from: last.camera, to: last.camera, localElapsed: 0, duration: 0, index: ks.length - 1 }
  for (let i = 0; i < ks.length - 1; i++) {
    if (u <= ks[i + 1].time) return { from: ks[i].camera, to: ks[i + 1].camera, localElapsed: u - ks[i].time, duration: ks[i + 1].time - ks[i].time, index: i }
  }
  return { from: last.camera, to: last.camera, localElapsed: 0, duration: 0, index: ks.length - 1 }
}

export function lookKeyframes(parcours: StudioParcours): (StudioKeyframe & { look: StudioLook })[] {
  return parcours.keyframes.filter((k): k is StudioKeyframe & { look: StudioLook } => !!k.look).sort((a, b) => a.time - b.time)
}

/** The look holds through `hold`, then crosses to the next one along its
 *  transfer curve over the rest of the segment. */
export function lookStateAt(parcours: StudioParcours, time: number): LookState | null {
  const ks = lookKeyframes(parcours)
  if (!ks.length) return null
  const rest = (k: StudioKeyframe & { look: StudioLook }): LookState => ({ a: k.look, b: k.look, w: 0, fromId: k.id, toId: k.id })
  if (time <= ks[0].time) return rest(ks[0])
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1]
    if (time > b.time) continue
    const span = b.time - a.time, hold = b.hold * span
    const f = span - hold > 1e-6 ? clamp((time - a.time - hold) / (span - hold), 0, 1) : (time >= b.time ? 1 : 0)
    return { a: a.look, b: b.look, w: applyStopTransferCurve(b.curve, f), fromId: a.id, toId: b.id }
  }
  return rest(ks[ks.length - 1])
}

/** Continuous appearance at a blend weight, through the same mixer the preset
 *  travel uses (wrapped and log fields, trap switched at zero contribution). */
export function blendedLook(state: LookState): Partial<MandelbrotParams> {
  return interpolatePresetAppearance(state.a as MandelbrotParams, state.b as MandelbrotParams, state.w)
}

/** Discrete look fields of one keyframe, ready to assign onto the params. */
export function discreteLookFields(look: StudioLook): Partial<MandelbrotParams> {
  const out: Partial<MandelbrotParams> = {}
  for (const field of STUDIO_DISCRETE_LOOK_FIELDS) {
    if (look[field] !== undefined) (out as Record<string, unknown>)[field] = copyPlain(look[field])
  }
  return out
}

/** Does the look change anything discrete between a and b (texture, µ, stops…)? */
export function discreteLookDiffers(a: StudioLook, b: StudioLook): boolean {
  return JSON.stringify(discreteLookFields(a)) !== JSON.stringify(discreteLookFields(b))
}

export function formatTimecode(seconds: number, fps = 30): string {
  const s = Math.max(0, seconds), whole = Math.floor(s), frames = Math.floor((s - whole) * fps)
  const mm = String(Math.floor(whole / 60)).padStart(2, '0'), ss = String(whole % 60).padStart(2, '0')
  return `${mm}:${ss}:${String(frames).padStart(2, '0')}`
}

export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Camera keyframe times, in order, for prev/next navigation. */
export function keyframeTimes(parcours: StudioParcours): number[] {
  return [...new Set(parcours.keyframes.map(k => k.time))].sort((a, b) => a - b)
}
