import type { AudioAnalysis } from './audioAnalysis'

// ── Automatic keyframe instants from the music ──
// A detector turns the analysis into a list of instants. `beats` and
// `sections` read what the analysis already found; the others pick the peaks
// of one feature envelope (bass, snare, hats, transients, loudness).

export const AUTO_KEY_DETECTORS = ['kick', 'onset', 'snare', 'hats', 'rms', 'beats', 'sections'] as const
export type AutoKeyDetector = (typeof AUTO_KEY_DETECTORS)[number]
export const isPeakDetector = (d: AutoKeyDetector): d is 'kick' | 'onset' | 'snare' | 'hats' | 'rms' => d !== 'beats' && d !== 'sections'

export type AutoKeyOptions = {
  detector: AutoKeyDetector
  /** Peak detectors: 0 keeps only the strongest hits, 1 takes nearly everything. */
  sensitivity: number
  /** Minimum time between two instants, seconds. */
  minGapSeconds: number
  /** `beats` only: one instant every N beats. */
  beatDivision: number
  /** Only instants inside [from, to], seconds. */
  from?: number
  to?: number
}

/** Peaks of a [0, 1] envelope: local maxima that stand out from their
 *  surroundings, strongest first when two fall within the minimum gap. */
export function pickPeaks(values: Float32Array, rate: number, sensitivity: number, minGapSeconds: number): number[] {
  const s = Math.max(0, Math.min(1, sensitivity))
  // How high a peak must be, and how far above the local average.
  const floor = 0.65 - 0.6 * s, prominence = 0.3 - 0.27 * s
  const around = Math.max(1, Math.round(rate * 0.35))
  const candidates: { index: number; value: number }[] = []
  for (let i = 1; i < values.length - 1; i++) {
    const v = values[i]
    if (v < floor || v < values[i - 1] || v <= values[i + 1]) continue
    let sum = 0, n = 0
    for (let j = Math.max(0, i - around); j < Math.min(values.length, i + around); j++) { sum += values[j]; n++ }
    if (v - sum / n >= prominence) candidates.push({ index: i, value: v })
  }
  const gap = Math.max(1, Math.round(minGapSeconds * rate))
  const kept: number[] = []
  for (const c of candidates.sort((a, b) => b.value - a.value)) {
    if (kept.every(k => Math.abs(k - c.index) >= gap)) kept.push(c.index)
  }
  return kept.sort((a, b) => a - b).map(i => i / rate)
}

export function detectAutoKeyTimes(analysis: AudioAnalysis, options: AutoKeyOptions): number[] {
  const gap = Math.max(0, options.minGapSeconds)
  let times: number[]
  if (options.detector === 'sections') times = [0, ...analysis.sections]
  else if (options.detector === 'beats') {
    const every = Math.max(1, Math.round(options.beatDivision))
    times = analysis.beats.filter((_, i) => i % every === 0)
  } else times = pickPeaks(analysis.features[options.detector], analysis.rate, options.sensitivity, gap)
  const from = options.from ?? 0, to = options.to ?? analysis.durationSeconds
  const out: number[] = []
  for (const t of times) {
    if (t < from - 1e-6 || t > to + 1e-6) continue
    if (out.length && t - out[out.length - 1] < gap) continue
    out.push(t)
  }
  return out
}
