import { t } from './i18n'
import { isStopTransferCurve, applyStopTransferCurve, type StopTransferCurve } from './ColorStop'
import type { MandelbrotParams } from './Mandelbrot'
import { normalizeOrbitTrapFromLegacy } from './OrbitTrap'
import { snapshotPathAppearance, type PathAppearance } from './palettePath'
import { interpolatePresetAppearance, TRANSITION_DEFAULTS } from './presetTransition'
import { normalizeAnimationConfig } from './AnimationConfig'
import { log10FromDecimalString } from './floatexp'
import type { VideoPathLocation } from './videoPath'
import { canonicalDecimal, canonicalScale, decimalDifferenceLog10 } from './expmap/decimal'
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
export const STUDIO_MAX_KEYFRAMES = 512
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

/** Timing of the camera along the segment that ARRIVES at a keyframe. The path
 *  itself (camera_path.rs) is unchanged: the ease only warps camera time
 *  inside the segment. `hold` rests on the previous keyframe, then cuts. */
export const STUDIO_CAMERA_EASES = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'hold'] as const
export type StudioCameraEase = typeof STUDIO_CAMERA_EASES[number]
export const isStudioCameraEase = (v: unknown): v is StudioCameraEase => (STUDIO_CAMERA_EASES as readonly unknown[]).includes(v)

export function applyCameraEase(ease: StudioCameraEase | undefined, f: number): number {
  const x = clamp(f, 0, 1)
  switch (ease) {
    case 'easeIn': return x * x
    case 'easeOut': return 1 - (1 - x) * (1 - x)
    case 'easeInOut': return x * x * (3 - 2 * x)
    case 'hold': return x >= 1 ? 1 : 0
    default: return x
  }
}

/** A keyframe belongs to ONE track: it carries a camera or a look, never both,
 *  so each diamond moves on its own. Older parcours that pinned both on one
 *  keyframe are split on load (`validateStudioParcours`). */
export type StudioTrack = 'camera' | 'look'

export type StudioKeyframe = {
  id: string
  /** Seconds from the start of the parcours. A camera keyframe's time is in
   *  CAMERA time (after the global ramps, see `rampedTime`); a look keyframe's
   *  is in parcours time. `keyframeDisplayTime` maps both onto the playhead. */
  time: number
  camera?: StudioCamera
  look?: StudioLook
  /** Double keyframe: the state the previous plan ARRIVES at. At the keyframe's
   *  instant the view cuts from it to `camera` / `look`, the state the next
   *  plan leaves from. Absent on an ordinary keyframe. */
  cameraIn?: StudioCamera
  lookIn?: StudioLook
  /** Camera timing of the segment that ARRIVES at this keyframe (default linear). */
  ease?: StudioCameraEase
  /** Transfer curve of the look transition that ARRIVES at this keyframe. */
  curve: StopTransferCurve
  /** Fraction of the incoming segment during which the previous look holds
   *  before the transition starts, [0, 0.95]. */
  hold: number
}

/** A named point on the ruler, e.g. a moment of the music. Moves nothing. */
export type StudioMarker = { id: string; time: number; name: string }
export const STUDIO_MAX_MARKERS = 512

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
  /** Half-window, in seconds, over which each interior camera corner is
   *  rounded by the navigator (camera_path.rs). 0 keeps corners sharp. */
  cornerSeconds: number
  markers: StudioMarker[]
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
  'animation',
] as const

/** Tilted 3D view (Navigation tab): part of a look keyframe, mixed linearly.
 *  A look saved before it existed is top-down. */
export const STUDIO_VIEW3D_DEFAULTS = { tiltViewTilt: 0, tiltViewHeading: 0, tiltViewRelief: 10, tiltViewInteriorDepth: 1 } as const
const VIEW3D_FIELDS = Object.keys(STUDIO_VIEW3D_DEFAULTS) as (keyof typeof STUDIO_VIEW3D_DEFAULTS)[]

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
  for (const field of VIEW3D_FIELDS) look[field] = finite(source[field], STUDIO_VIEW3D_DEFAULTS[field])
  look.mu = finite(source.mu, 4)
  look.stripeFrequency = finite(source.stripeFrequency, 8)
  look.orbitTrap = normalizeOrbitTrapFromLegacy(source)
  look.orbitTrapStrength = look.orbitTrap.strength
  // Oscillations of the Animation tab ride with the look. A look saved before
  // that carries none and leaves the current ones alone.
  if (source.animation) look.animation = normalizeAnimationConfig(source.animation, source.animationSpeed)
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

/** Markers are a convenience: a malformed one is dropped, never an error. */
function validateMarkers(value: unknown, durationSeconds: number): StudioMarker[] {
  if (!Array.isArray(value)) return []
  const ids = new Set<string>()
  return (value as StudioMarker[]).filter(m => m && typeof m.id === 'string' && m.id && !ids.has(m.id) && ids.add(m.id) && Number.isFinite(m.time))
    .slice(0, STUDIO_MAX_MARKERS)
    .map(m => ({ id: m.id, time: clamp(m.time, 0, durationSeconds), name: typeof m.name === 'string' ? m.name.trim().slice(0, 40) : '' }))
    .sort((a, b) => a.time - b.time)
}

export function validateStudioParcours(value: unknown): StudioParcours {
  const p = value as StudioParcours
  if (!p || p.version !== STUDIO_PARCOURS_VERSION || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string'
    || !Array.isArray(p.keyframes) || p.keyframes.length > STUDIO_MAX_KEYFRAMES) throw new Error(t('studioPanel.errors.invalidParcours'))
  const durationSeconds = finite(p.durationSeconds, NaN)
  if (!(durationSeconds >= STUDIO_MIN_DURATION && durationSeconds <= STUDIO_MAX_DURATION)) throw new Error(t('studioPanel.errors.invalidDuration'))
  const ids = new Set<string>()
  const keyframes = p.keyframes.flatMap(k => {
    if (!k || typeof k.id !== 'string' || !k.id || ids.has(k.id) || !Number.isFinite(k.time) || k.time < 0 || k.time > durationSeconds
      || (!k.camera && !k.look)) throw new Error(t('studioPanel.errors.invalidKeyframe'))
    ids.add(k.id)
    const out: StudioKeyframe[] = []
    if (k.camera) {
      const camera: StudioKeyframe = { id: k.id, time: k.time, curve: 'gaussian', hold: 0, camera: validateCamera(k.camera) }
      if (isStudioCameraEase(k.ease) && k.ease !== 'linear') camera.ease = k.ease
      if (k.cameraIn) camera.cameraIn = validateCamera(k.cameraIn)
      out.push(camera)
    }
    if (k.look) {
      // A legacy keyframe pinning both is split: the look gets its own id.
      let id = k.camera ? `${k.id}:look` : k.id
      while (k.camera && ids.has(id)) id += "'"
      ids.add(id)
      out.push({
        id, time: k.time, look: snapshotStudioLook(k.look),
        curve: isStopTransferCurve(k.curve) ? k.curve : 'gaussian',
        hold: clamp(finite(k.hold, 0), 0, 0.95),
        ...(k.lookIn ? { lookIn: snapshotStudioLook(k.lookIn) } : {}),
      })
    }
    return out
  }).sort((a, b) => a.time - b.time)
  return {
    version: STUDIO_PARCOURS_VERSION, id: p.id, name: p.name.trim().slice(0, 100) || t('studioPanel.newName'),
    durationSeconds, keyframes,
    easeInSeconds: clamp(finite(p.easeInSeconds, 2), 0, durationSeconds / 2),
    easeOutSeconds: clamp(finite(p.easeOutSeconds, 2), 0, durationSeconds / 2),
    retime: p.retime === true,
    cornerSeconds: clamp(finite(p.cornerSeconds, 1), 0, 10),
    modulators: validateModulators(p.modulators),
    markers: validateMarkers(p.markers, durationSeconds),
    ...(validateAudioRef(p.audio) ? { audio: validateAudioRef(p.audio) } : {}),
  }
}

export function newStudioParcours(name = t('studioPanel.newName')): StudioParcours {
  return { version: STUDIO_PARCOURS_VERSION, id: crypto.randomUUID(), name, durationSeconds: 30, keyframes: [],
    easeInSeconds: 2, easeOutSeconds: 2, retime: false, cornerSeconds: 1, modulators: [], markers: [] }
}

export const keyframeTrack = (k: StudioKeyframe): StudioTrack => k.camera ? 'camera' : 'look'

/** Pin a camera and/or a look: one keyframe per track. A keyframe of the same
 *  track already standing there is updated instead. `time` is parcours time
 *  (look keyframes); `cameraTime` the camera clock at that instant (camera
 *  keyframes, see `rampedTime`). The duration grows to hold them. */
export function addStudioKeyframe(
  parcours: StudioParcours, time: number, scope: { camera?: StudioCamera; look?: StudioLook }, cameraTime = time,
): StudioKeyframe[] {
  const out: StudioKeyframe[] = []
  const place = (track: StudioTrack, raw: number, fill: (k: StudioKeyframe) => void) => {
    const at = Math.max(0, Math.round(raw * 1000) / 1000)
    const existing = parcours.keyframes.find(k => keyframeTrack(k) === track && Math.abs(k.time - at) < STUDIO_KEYFRAME_MIN_GAP)
    if (existing) { fill(existing); out.push(existing); return }
    if (parcours.keyframes.length >= STUDIO_MAX_KEYFRAMES) throw new Error(t('studioPanel.errors.tooManyKeyframes', { max: STUDIO_MAX_KEYFRAMES }))
    const keyframe: StudioKeyframe = { id: crypto.randomUUID(), time: at, curve: 'gaussian', hold: 0 }
    fill(keyframe)
    parcours.keyframes.push(keyframe)
    if (at > parcours.durationSeconds) parcours.durationSeconds = Math.min(STUDIO_MAX_DURATION, at)
    out.push(keyframe)
  }
  if (scope.camera) place('camera', cameraTime, k => { k.camera = copyPlain(scope.camera!) })
  if (scope.look) place('look', time, k => { k.look = copyPlain(scope.look!) })
  parcours.keyframes.sort((a, b) => a.time - b.time)
  return out
}

export function removeStudioKeyframe(parcours: StudioParcours, id: string): void {
  parcours.keyframes = parcours.keyframes.filter(k => k.id !== id)
}

/** Move a keyframe in time (in its own clock), keeping it between the
 *  neighbours of its track. */
export function moveStudioKeyframe(parcours: StudioParcours, id: string, time: number): number {
  const self = parcours.keyframes.find(k => k.id === id)
  if (!self) return time
  const track = parcours.keyframes.filter(k => keyframeTrack(k) === keyframeTrack(self)).sort((a, b) => a.time - b.time)
  const i = track.indexOf(self)
  const lo = i > 0 ? track[i - 1].time + STUDIO_KEYFRAME_MIN_GAP : 0
  const hi = i < track.length - 1 ? track[i + 1].time - STUDIO_KEYFRAME_MIN_GAP : parcours.durationSeconds
  self.time = clamp(Math.round(time * 1000) / 1000, Math.min(lo, hi), Math.max(lo, hi))
  parcours.keyframes.sort((a, b) => a.time - b.time)
  return self.time
}

// ── Perceptual arc length ──
// What the eye reads: decades of zoom, screen widths of pan and turns of
// angle. The pan term reads the centre difference exactly (decimal strings),
// so it holds at any depth.
export function cameraDistance(a: StudioCamera, b: StudioCamera): number {
  const la = log10FromDecimalString(a.scale), lb = log10FromDecimalString(b.scale)
  const decades = Number.isFinite(la) && Number.isFinite(lb) ? Math.abs(la - lb) : 0
  // Pan in screens, from the exact centre difference: f64 would lose it below 1e-15.
  let pan = 0
  try {
    const dx = decimalDifferenceLog10(a.cx, b.cx), dy = decimalDifferenceLog10(a.cy, b.cy)
    const far = Math.max(dx, dy), near = Math.min(dx, dy)
    const scale = Math.max(la, lb)
    if (Number.isFinite(far) && Number.isFinite(scale)) {
      const hypot = far + (Number.isFinite(near) ? 0.5 * Math.log10(1 + 10 ** (2 * (near - far))) : 0)
      pan = 10 ** Math.min(3, hypot - scale)
    }
  } catch { /* unreadable centre: no pan term */ }
  const turns = Math.abs(a.angle - b.angle) / (2 * Math.PI)
  // One decade ≈ one screen width of pan ≈ a quarter turn, as felt at the eye.
  return decades + Math.min(pan, 50) + turns * 4
}

/** Camera keyframes in time order; with `retime`, their times are redistributed
 *  over the same span by perceptual arc length so the felt speed stays uniform. */
export function cameraKeyframes(parcours: StudioParcours): (StudioKeyframe & { camera: StudioCamera })[] {
  const ks = parcours.keyframes.filter((k): k is StudioKeyframe & { camera: StudioCamera } => !!k.camera).sort((a, b) => a.time - b.time)
  if (!parcours.retime || ks.length < 3) return ks
  // A double keyframe is reached at its arrival side; the cut costs no time.
  const legs = ks.slice(1).map((k, i) => cameraDistance(ks[i].camera, k.cameraIn ?? k.camera))
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

/** Parcours time at which the ramped camera clock reaches `cameraTime`
 *  (inverse of `rampedTime`, which is monotone). */
export function parcoursTimeOfCameraTime(parcours: StudioParcours, cameraTime: number): number {
  const d = parcours.durationSeconds
  if (parcours.easeInSeconds <= 0 && parcours.easeOutSeconds <= 0) return clamp(cameraTime, 0, d)
  let lo = 0, hi = d
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2
    if (rampedTime(parcours, mid) < cameraTime) lo = mid; else hi = mid
  }
  return (lo + hi) / 2
}

/** Where a keyframe sits under the playhead, in parcours time: a look at its
 *  time, a camera where the camera clock (ramps, retiming) reaches it. */
export function keyframeDisplayTime(parcours: StudioParcours, keyframe: StudioKeyframe, cams = cameraKeyframes(parcours)): number {
  if (!keyframe.camera) return keyframe.time
  return parcoursTimeOfCameraTime(parcours, cams.find(c => c.id === keyframe.id)?.time ?? keyframe.time)
}

/** Gap between the two sides of a double keyframe on the camera clock. The
 *  navigator's corner window never exceeds half a leg, so both stay sharp. */
export const STUDIO_CUT_SECONDS = 0.001

export type CameraKnot = { id: string; time: number; camera: StudioCamera; ease?: StudioCameraEase }

/** The camera keyframes as path knots: a double keyframe gives two, its
 *  arrival side a cut's width before its departure side, joined by a `hold`
 *  segment so the clock jumps from one to the other. */
export function cameraKnots(parcours: StudioParcours): CameraKnot[] {
  const out: CameraKnot[] = []
  for (const k of cameraKeyframes(parcours)) {
    if (k.cameraIn && out.length) {
      out.push({ id: `${k.id}:in`, time: Math.max(k.time - STUDIO_CUT_SECONDS, out[out.length - 1].time + STUDIO_CUT_SECONDS), camera: k.cameraIn, ease: k.ease })
      out.push({ id: k.id, time: Math.max(k.time, out[out.length - 1].time + STUDIO_CUT_SECONDS), camera: k.camera, ease: 'hold' })
    } else out.push({ id: k.id, time: out.length ? Math.max(k.time, out[out.length - 1].time + STUDIO_CUT_SECONDS) : k.time, camera: k.camera, ease: k.ease })
  }
  return out
}

export type CameraClock = {
  /** Camera time: ramps, then the ease of the segment under it. */
  time: number
  /** Index of the segment's first keyframe in the camera keyframe list. */
  index: number
  /** Linear and eased progress inside the segment, [0, 1]. */
  linear: number
  eased: number
  /** The segment rests on its first keyframe until the cut. */
  hold: boolean
}

/** Parcours time → camera time on the navigator path: the global ramps, then
 *  the per-segment ease. Preview, export and the timeline all read this. */
export function cameraClockAt(parcours: StudioParcours, time: number, keys: readonly CameraKnot[] = cameraKnots(parcours)): CameraClock {
  const u = rampedTime(parcours, time)
  if (keys.length < 2 || u <= keys[0].time) return { time: u, index: 0, linear: 0, eased: 0, hold: false }
  const lastIndex = keys.length - 1
  if (u >= keys[lastIndex].time) return { time: u, index: lastIndex, linear: 0, eased: 0, hold: false }
  let i = 0
  while (i < lastIndex - 1 && u > keys[i + 1].time) i++
  const span = keys[i + 1].time - keys[i].time
  const linear = span > 0 ? (u - keys[i].time) / span : 1
  const ease = keys[i + 1].ease
  const eased = applyCameraEase(ease, linear)
  return { time: keys[i].time + span * eased, index: i, linear, eased, hold: ease === 'hold' }
}

/** `ks` lets a caller that samples many times (the timeline) build the knots once. */
export function cameraSegmentAt(parcours: StudioParcours, time: number, ks: readonly CameraKnot[] = cameraKnots(parcours)): CameraSegment | null {
  if (!ks.length) return null
  const clock = cameraClockAt(parcours, time, ks)
  const from = ks[clock.index]
  const to = ks[clock.index + 1]
  if (!to || clock.time <= ks[0].time) return { from: from.camera, to: from.camera, localElapsed: 0, duration: 0, index: clock.index }
  const duration = to.time - from.time
  return { from: from.camera, to: to.camera, localElapsed: duration * clock.eased, duration, index: clock.index }
}

/** The camera keyframes as the navigator's path spec, `cx|cy|scale|angle|time;…`
 *  in camera time (retimed when asked). Times are made strictly increasing:
 *  two keys the retiming put on the same instant get a millisecond apart. */
export function cameraPathSpec(parcours: StudioParcours): { spec: string; count: number; duration: number } | null {
  const keys = cameraKnots(parcours)
  if (!keys.length) return null
  let last = -Infinity
  const entries = keys.map(k => {
    const time = Math.max(k.time, last + 0.001)
    last = time
    return `${k.camera.cx}|${k.camera.cy}|${k.camera.scale}|${k.camera.angle}|${time}`
  })
  return { spec: entries.join(';'), count: keys.length, duration: last - keys[0].time }
}

/** How long before a double look keyframe the arrival side is fully reached:
 *  the editor rests the playhead there to show and edit that side. */
export const STUDIO_LOOK_REST_SECONDS = 0.01

export function lookKeyframes(parcours: StudioParcours): (StudioKeyframe & { look: StudioLook })[] {
  return parcours.keyframes.filter((k): k is StudioKeyframe & { look: StudioLook } => !!k.look).sort((a, b) => a.time - b.time)
}

/** The look holds through `hold`, then crosses to the next one along its
 *  transfer curve over the rest of the segment. */
export function lookStateAt(parcours: StudioParcours, time: number, ks = lookKeyframes(parcours)): LookState | null {
  if (!ks.length) return null
  const rest = (k: StudioKeyframe & { look: StudioLook }): LookState => ({ a: k.look, b: k.look, w: 0, fromId: k.id, toId: k.id })
  if (time <= ks[0].time) return rest(ks[0])
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1]
    if (time > b.time) continue
    // A double keyframe: the plan glides to its arrival side, rests on it for
    // the last instants, and the departure side takes over at the keyframe.
    if (b.lookIn && time >= b.time) continue
    const span = Math.max(1e-6, b.time - a.time - (b.lookIn ? STUDIO_LOOK_REST_SECONDS : 0)), hold = b.hold * span
    const f = span - hold > 1e-6 ? clamp((time - a.time - hold) / (span - hold), 0, 1) : (time >= b.time ? 1 : 0)
    return { a: a.look, b: b.lookIn ?? b.look, w: applyStopTransferCurve(b.curve, f), fromId: a.id, toId: b.lookIn ? `${b.id}:in` : b.id }
  }
  return rest(ks[ks.length - 1])
}

/** Continuous appearance at a blend weight, through the same mixer the preset
 *  travel uses (wrapped and log fields, trap switched at zero contribution). */
export function blendedLook(state: LookState): Partial<MandelbrotParams> {
  const out = interpolatePresetAppearance(state.a as MandelbrotParams, state.b as MandelbrotParams, state.w)
  for (const field of VIEW3D_FIELDS) {
    const from = state.a[field] ?? STUDIO_VIEW3D_DEFAULTS[field], to = state.b[field] ?? STUDIO_VIEW3D_DEFAULTS[field]
    // The heading is an angle in degrees: turn through the shortest arc.
    const delta = field === 'tiltViewHeading' ? ((to - from) % 360 + 540) % 360 - 180 : to - from
    out[field] = field === 'tiltViewHeading' ? ((from + delta * state.w) % 360 + 360) % 360 : from + delta * state.w
  }
  return out
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

/** Keyframe positions under the playhead, in order, for prev/next navigation. */
export function keyframeTimes(parcours: StudioParcours): number[] {
  const cams = cameraKeyframes(parcours)
  return [...new Set(parcours.keyframes.map(k => Math.round(keyframeDisplayTime(parcours, k, cams) * 1000) / 1000))].sort((a, b) => a - b)
}
