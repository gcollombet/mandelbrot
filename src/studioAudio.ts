import { t } from './i18n'
import type { MandelbrotParams } from './Mandelbrot'
import { AUDIO_FEATURES, envelopeOf, meanFeature, sampleSeries, type AudioAnalysis, type AudioFeature } from './audioAnalysis'
import { addStudioKeyframe, cameraKeyframes, snapshotStudioCamera, snapshotStudioLook, type StudioParcours } from './studioParcours'

// ── Music → parameters ──
//
// Rhythmic events are never keyframes (the GPU path holds 64 nodes, a track
// has hundreds of beats): they MODULATE. A modulator reads one analysis
// feature through an attack / release envelope and adds a scaled amount to
// one continuous parameter, on top of whatever the keyframes interpolated.
// Envelopes are precomputed over the analysis grid, so a frame at time t
// always reads the same value, in the preview and in the export alike.

export const MODULATOR_TARGETS = [
  'reliefDepth', 'gradeSaturation', 'gradeContrast', 'paletteOffset', 'heightPaletteShift', 'varnishStrength',
  'microBumpStrength', 'displacementAmount', 'protrusionPhase', 'phaseColoringStrength', 'orbitTrapStrength',
  'castShadowStrength', 'localShadowStrength', 'ambientOcclusionStrength', 'tessellationLevel', 'lightAngle',
] as const
export type ModulatorTarget = (typeof MODULATOR_TARGETS)[number]

/** Natural amplitude of one unit of modulation per target: the range a
 *  modulator at amount 1 spans, chosen so every target reacts visibly. */
export const MODULATOR_SPAN: Record<ModulatorTarget, number> = {
  reliefDepth: 1, gradeSaturation: 0.5, gradeContrast: 0.5, paletteOffset: 0.25, heightPaletteShift: 40, varnishStrength: 30,
  microBumpStrength: 1, displacementAmount: 0.05, protrusionPhase: 0.5, phaseColoringStrength: 50, orbitTrapStrength: 50,
  castShadowStrength: 0.6, localShadowStrength: 0.6, ambientOcclusionStrength: 0.6, tessellationLevel: 4, lightAngle: Math.PI / 2,
}

export type StudioModulator = {
  id: string
  enabled: boolean
  feature: AudioFeature
  target: ModulatorTarget
  /** Signed gain in target spans, [-2, 2]. */
  amount: number
  attackMs: number
  releaseMs: number
}

export type StudioAudioRef = {
  /** Record id in the audio store. */
  id: string
  name: string
  durationSeconds: number
}

export const MODULATOR_MAX = 16

export function newModulator(feature: AudioFeature = 'kick', target: ModulatorTarget = 'reliefDepth'): StudioModulator {
  return { id: crypto.randomUUID(), enabled: true, feature, target, amount: 0.6, attackMs: 10, releaseMs: 180 }
}

export function validateModulators(value: unknown): StudioModulator[] {
  if (!Array.isArray(value)) return []
  const out: StudioModulator[] = []
  for (const m of value.slice(0, MODULATOR_MAX) as StudioModulator[]) {
    if (!m || typeof m.id !== 'string' || !(AUDIO_FEATURES as readonly string[]).includes(m.feature) || !(MODULATOR_TARGETS as readonly string[]).includes(m.target)) continue
    const finite = (v: unknown, fb: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, typeof v === 'number' && Number.isFinite(v) ? v : fb))
    out.push({ id: m.id, enabled: m.enabled !== false, feature: m.feature, target: m.target,
      amount: finite(m.amount, 0.5, -2, 2), attackMs: finite(m.attackMs, 10, 0, 2000), releaseMs: finite(m.releaseMs, 180, 0, 5000) })
  }
  return out
}

export function validateAudioRef(value: unknown): StudioAudioRef | undefined {
  const a = value as StudioAudioRef
  if (!a || typeof a.id !== 'string' || !a.id || typeof a.name !== 'string') return undefined
  if (!(typeof a.durationSeconds === 'number' && Number.isFinite(a.durationSeconds) && a.durationSeconds > 0)) return undefined
  return { id: a.id, name: a.name.slice(0, 200), durationSeconds: a.durationSeconds }
}

/** Precomputed envelopes, keyed by the modulator settings that shape them. */
export class ModulatorBank {
  private envelopes = new Map<string, Float32Array>()
  readonly analysis: AudioAnalysis
  constructor(analysis: AudioAnalysis) { this.analysis = analysis }

  private envelope(m: StudioModulator): Float32Array {
    const key = `${m.feature}|${m.attackMs}|${m.releaseMs}`
    let env = this.envelopes.get(key)
    if (!env) { env = envelopeOf(this.analysis, m.feature, m.attackMs, m.releaseMs); this.envelopes.set(key, env) }
    return env
  }

  /** Envelope value of one modulator at a time, [0, 1]. */
  valueAt(m: StudioModulator, seconds: number): number {
    return sampleSeries(this.envelope(m), this.analysis.rate, seconds)
  }

  /** Add every enabled modulator's contribution on top of the params, which
   *  must already hold the keyframe-interpolated base values for this time. */
  apply(params: MandelbrotParams, modulators: StudioModulator[], seconds: number): void {
    for (const m of modulators) {
      if (!m.enabled || m.amount === 0) continue
      const base = (params[m.target] as number | undefined) ?? 0
      const delta = m.amount * MODULATOR_SPAN[m.target] * this.valueAt(m, seconds)
      ;(params as unknown as Record<string, number>)[m.target] = clampTarget(m.target, base + delta)
    }
  }
}

function clampTarget(target: ModulatorTarget, value: number): number {
  switch (target) {
    case 'paletteOffset': case 'protrusionPhase': return value - Math.floor(value)
    case 'lightAngle': return value
    case 'gradeSaturation': case 'gradeContrast': return Math.max(0, Math.min(3, value))
    case 'reliefDepth': return Math.max(0, Math.min(4, value))
    case 'tessellationLevel': return Math.max(0, Math.min(10, value))
    case 'displacementAmount': return Math.max(0, Math.min(0.1, value))
    default: return Math.max(0, Math.min(100, value))
  }
}

// ── Automatic parcours from the music ──

export type MusicParcoursOptions = {
  /** Camera speed follows section energy (quiet = slow zoom). */
  paceByEnergy?: boolean
}

/** Set the parcours to the track's length, drop one look keyframe per section
 *  boundary (the current look, to be edited), and pace the existing camera
 *  keyframes so that louder sections zoom faster. Returns what was added. */
export function buildMusicParcours(parcours: StudioParcours, analysis: AudioAnalysis, params: MandelbrotParams, options: MusicParcoursOptions = {}) {
  const duration = Math.max(1, Math.round(analysis.durationSeconds * 10) / 10)
  const cameras = cameraKeyframes(parcours)
  // Camera keyframes keep their order; spread them over the new duration.
  if (cameras.length >= 2) {
    const first = cameras[0].time, last = cameras[cameras.length - 1].time, span = Math.max(1e-6, last - first)
    for (const k of parcours.keyframes) if (k.camera) k.time = (k.time - first) / span * duration
  }
  parcours.durationSeconds = duration
  for (const k of parcours.keyframes) k.time = Math.min(k.time, duration)

  const boundaries = [0, ...analysis.sections.filter(s => s > 1 && s < duration - 1)]
  let added = 0
  for (const at of boundaries) {
    if (parcours.keyframes.some(k => k.look && Math.abs(k.time - at) < 0.5)) continue
    const keyframe = addStudioKeyframe(parcours, at, { look: snapshotStudioLook(params) }).find(k => k.look)!
    if (!parcours.keyframes.some(k => k.camera)) addStudioKeyframe(parcours, at, { camera: snapshotStudioCamera(params) })
    keyframe.hold = 0.5
    keyframe.curve = 'gaussian'
    added++
  }

  if (options.paceByEnergy !== false && cameraKeyframes(parcours).length >= 2) {
    // Re-time camera legs so the time spent in a leg is inversely proportional
    // to the energy of the music under it: the drop zooms fast, the intro lingers.
    const cams = parcours.keyframes.filter(k => k.camera).sort((a, b) => a.time - b.time)
    const weights = cams.slice(1).map((k, i) => {
      const energy = meanFeature(analysis, 'rms', cams[i].time, k.time)
      return 1 / (0.25 + energy)
    })
    const total = weights.reduce((a, b) => a + b, 0)
    const t0 = cams[0].time, span = cams[cams.length - 1].time - t0
    let acc = 0
    cams.forEach((k, i) => { if (i) acc += weights[i - 1]; k.time = Math.round((t0 + span * acc / total) * 1000) / 1000 })
    parcours.keyframes.sort((a, b) => a.time - b.time)
  }
  return { added, duration, sections: boundaries.length }
}

export function describeModulator(m: StudioModulator): string {
  return t('studioPanel.modulators.describe', { feature: t(`studioPanel.features.${m.feature}`), target: t(`studioPanel.targets.${m.target}`), amount: m.amount.toFixed(2) })
}
