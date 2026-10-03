// ── Offline audio analysis for the studio ──
//
// Pure DSP on a mono signal, no Web Audio and no Vue, so it runs the same in
// a worker, a test, or the main thread. Everything is computed ONCE at a fixed
// frame rate (hop / sample rate, about 86 Hz at 44.1 kHz) and sampled later at
// any time, which is what keeps a music-driven export deterministic: a frame
// at t reads the same numbers whatever the wall clock did.
//
// Features (all normalised to [0, 1] over the track):
//   rms        loudness envelope
//   kick       energy 40–120 Hz
//   snare      energy 150–300 Hz + 2–5 kHz
//   hats       energy 6–12 kHz
//   centroid   spectral centroid (brightness)
//   onset      half-wave rectified spectral flux (transients)
// Plus a tempo estimate, a beat grid, and section boundaries from a novelty
// curve on the band features (checkerboard kernel on the self-similarity).

export const AUDIO_FEATURES = ['rms', 'kick', 'snare', 'hats', 'centroid', 'onset'] as const
export type AudioFeature = (typeof AUDIO_FEATURES)[number]

export type AudioAnalysis = {
  version: 1
  sampleRate: number
  /** Analysis frames per second. */
  rate: number
  durationSeconds: number
  frames: number
  features: Record<AudioFeature, Float32Array>
  bpm: number
  /** Beat instants in seconds. */
  beats: number[]
  /** Section boundaries in seconds, 0 excluded. */
  sections: number[]
}

export type AudioAnalysisOptions = {
  fftSize?: number
  hop?: number
  /** Minimum section length in seconds. */
  minSectionSeconds?: number
  /** Target number of sections; the novelty threshold adapts to reach it. */
  targetSections?: number
}

// ── FFT (iterative radix-2, real input packed as complex) ──
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr; cr = ncr
      }
    }
  }
}

function normalise(values: Float32Array): Float32Array {
  let max = 0
  for (const v of values) if (v > max) max = v
  if (max <= 0) return values
  for (let i = 0; i < values.length; i++) values[i] /= max
  return values
}

/** Running maximum with a slow decay, so a quiet intro still reads full scale. */
function adaptiveNormalise(values: Float32Array, rate: number, windowSeconds = 8): Float32Array {
  const out = new Float32Array(values.length)
  const decay = Math.exp(-1 / (rate * windowSeconds))
  let peak = 1e-6
  for (let i = 0; i < values.length; i++) {
    peak = Math.max(values[i], peak * decay)
    out[i] = values[i] / peak
  }
  // Global scale keeps relative loudness between sections (a quiet verse
  // stays quieter than the drop) while the adaptive part lifts the floor.
  const global = normalise(values.slice())
  for (let i = 0; i < out.length; i++) out[i] = 0.5 * out[i] + 0.5 * global[i]
  return out
}

function smooth(values: Float32Array, radius: number): Float32Array {
  if (radius <= 0) return values.slice()
  const out = new Float32Array(values.length)
  let acc = 0, count = 0
  for (let i = -radius; i < values.length; i++) {
    const add = i + radius, drop = i - radius - 1
    if (add < values.length) { acc += values[add]; count++ }
    if (drop >= 0) { acc -= values[drop]; count-- }
    if (i >= 0) out[i] = acc / Math.max(1, count)
  }
  return out
}

export function analyzeAudio(samples: Float32Array, sampleRate: number, options: AudioAnalysisOptions = {}): AudioAnalysis {
  const fftSize = options.fftSize ?? 2048
  const hop = options.hop ?? 512
  const rate = sampleRate / hop
  const frames = Math.max(1, Math.floor((samples.length - fftSize) / hop) + 1)
  const bins = fftSize / 2
  const window = new Float32Array(fftSize)
  for (let i = 0; i < fftSize; i++) window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftSize - 1))
  const binHz = sampleRate / fftSize
  const band = (lo: number, hi: number) => [Math.max(1, Math.floor(lo / binHz)), Math.min(bins - 1, Math.ceil(hi / binHz))] as const
  const kickBand = band(40, 120), snareLow = band(150, 300), snareHigh = band(2000, 5000), hatsBand = band(6000, 12000)

  const rms = new Float32Array(frames), kick = new Float32Array(frames), snare = new Float32Array(frames)
  const hats = new Float32Array(frames), centroid = new Float32Array(frames), onset = new Float32Array(frames)
  // Coarse log-spaced band profile per frame for the section novelty.
  const PROFILE_BANDS = 24
  const profile = new Float32Array(frames * PROFILE_BANDS)
  const edges: number[] = []
  for (let b = 0; b <= PROFILE_BANDS; b++) edges.push(Math.min(bins, Math.max(1, Math.round(Math.pow(bins, b / PROFILE_BANDS)))))

  const re = new Float32Array(fftSize), im = new Float32Array(fftSize)
  let previous = new Float32Array(bins), magnitude = new Float32Array(bins)
  for (let f = 0; f < frames; f++) {
    const offset = f * hop
    let energy = 0
    for (let i = 0; i < fftSize; i++) { const s = samples[offset + i] ?? 0; re[i] = s * window[i]; im[i] = 0; energy += s * s }
    rms[f] = Math.sqrt(energy / fftSize)
    fft(re, im)
    let flux = 0, weighted = 0, total = 0
    for (let k = 0; k < bins; k++) {
      const m = Math.hypot(re[k], im[k])
      magnitude[k] = m
      const d = m - previous[k]
      if (d > 0) flux += d
      weighted += k * m; total += m
    }
    onset[f] = flux
    centroid[f] = total > 0 ? weighted / total / bins : 0
    const sum = (range: readonly [number, number]) => { let s = 0; for (let k = range[0]; k <= range[1]; k++) s += magnitude[k] * magnitude[k]; return Math.sqrt(s / (range[1] - range[0] + 1)) }
    kick[f] = sum(kickBand)
    snare[f] = 0.5 * sum(snareLow) + 0.5 * sum(snareHigh)
    hats[f] = sum(hatsBand)
    for (let b = 0; b < PROFILE_BANDS; b++) {
      let s = 0
      for (let k = edges[b]; k < Math.max(edges[b] + 1, edges[b + 1]); k++) s += magnitude[k]
      profile[f * PROFILE_BANDS + b] = Math.log1p(s)
    }
    const swap = previous; previous = magnitude; magnitude = swap
  }

  // Tempo: autocorrelation of the onset envelope over 60–200 bpm.
  const onsetSmooth = smooth(onset, 1)
  const mean = onsetSmooth.reduce((a, b) => a + b, 0) / frames
  const centred = onsetSmooth.map(v => v - mean)
  const minLag = Math.round(rate * 60 / 200), maxLag = Math.round(rate * 60 / 60)
  let bestLag = minLag, bestScore = -Infinity
  for (let lag = minLag; lag <= maxLag && lag < frames; lag++) {
    let score = 0
    for (let i = lag; i < frames; i++) score += centred[i] * centred[i - lag]
    // Mild preference for the 90–150 bpm range against octave errors.
    const bpm = 60 * rate / lag
    const prior = Math.exp(-0.5 * ((Math.log(bpm / 115)) / 0.45) ** 2)
    score = score / (frames - lag) * (0.6 + 0.4 * prior)
    if (score > bestScore) { bestScore = score; bestLag = lag }
  }
  const bpm = Math.round(60 * rate / bestLag * 10) / 10
  // Beat phase: the offset within one period where onsets sum highest.
  let bestPhase = 0, bestPhaseScore = -Infinity
  for (let phase = 0; phase < bestLag; phase++) {
    let score = 0
    for (let i = phase; i < frames; i += bestLag) score += onsetSmooth[i]
    if (score > bestPhaseScore) { bestPhaseScore = score; bestPhase = phase }
  }
  const beats: number[] = []
  const period = bestLag / rate
  for (let t = bestPhase / rate; t < frames / rate; t += period) beats.push(Math.round(t * 1000) / 1000)

  // Sections: novelty on the band profile with a checkerboard kernel. The
  // profile is first averaged over ~1 s per band so that beats, which repeat
  // inside every section, do not read as change.
  const minSection = options.minSectionSeconds ?? 6
  const profileRadius = Math.round(rate * 0.5)
  for (let b = 0; b < PROFILE_BANDS; b++) {
    const column = new Float32Array(frames)
    for (let f = 0; f < frames; f++) column[f] = profile[f * PROFILE_BANDS + b]
    const smoothed = smooth(column, profileRadius)
    for (let f = 0; f < frames; f++) profile[f * PROFILE_BANDS + b] = smoothed[f]
  }
  const kernel = Math.max(4, Math.min(Math.round(rate * 6), Math.floor(frames / 4)))
  const novelty = new Float32Array(frames)
  const dot = (a: number, b: number) => {
    let s = 0, na = 0, nb = 0
    for (let k = 0; k < PROFILE_BANDS; k++) { const x = profile[a * PROFILE_BANDS + k], y = profile[b * PROFILE_BANDS + k]; s += x * y; na += x * x; nb += y * y }
    return na > 0 && nb > 0 ? s / Math.sqrt(na * nb) : 0
  }
  // Mean profile over a window on each side, compared across the boundary:
  // cheaper than the full kernel and just as good at this granularity.
  const stride = Math.max(1, Math.floor(kernel / 8))
  for (let f = kernel; f < frames - kernel; f += stride) {
    let within = 0, across = 0, n = 0
    for (let i = 0; i < kernel; i += stride) {
      for (let j = 0; j < kernel; j += stride) {
        within += dot(f - kernel + i, f - kernel + j) + dot(f + i, f + j)
        across += 2 * dot(f - kernel + i, f + j)
        n++
      }
    }
    const value = (within - across) / (2 * n)
    for (let s = 0; s < stride && f + s < frames; s++) novelty[f + s] = value
  }
  const noveltySmooth = smooth(novelty, Math.round(rate * 0.5))
  normalise(noveltySmooth)
  const minGap = Math.round(minSection * rate)
  const peaks: { f: number; v: number }[] = []
  for (let f = 1; f < frames - 1; f++) {
    if (noveltySmooth[f] > noveltySmooth[f - 1] && noveltySmooth[f] >= noveltySmooth[f + 1] && noveltySmooth[f] > 0.15) peaks.push({ f, v: noveltySmooth[f] })
  }
  peaks.sort((a, b) => b.v - a.v)
  const target = options.targetSections ?? Math.max(2, Math.min(12, Math.round(frames / rate / 30)))
  const chosen: number[] = []
  for (const p of peaks) {
    if (chosen.length >= target) break
    if (p.f < minGap || frames - p.f < minGap) continue
    if (chosen.some(c => Math.abs(c - p.f) < minGap)) continue
    chosen.push(p.f)
  }
  const sections = chosen.sort((a, b) => a - b).map(f => Math.round(f / rate * 1000) / 1000)

  return {
    version: 1, sampleRate, rate, durationSeconds: samples.length / sampleRate, frames,
    features: {
      // Loudness and brightness keep their global scale: a quiet verse must
      // stay quieter than the drop. Transient bands adapt so a soft intro
      // still drives its modulators.
      rms: normalise(smooth(rms, 2)), kick: adaptiveNormalise(kick, rate), snare: adaptiveNormalise(snare, rate),
      hats: adaptiveNormalise(hats, rate), centroid: normalise(smooth(centroid, 2)), onset: adaptiveNormalise(onsetSmooth, rate, 4),
    },
    bpm, beats, sections,
  }
}

/** Linear interpolation of a feature at a time in seconds. */
export function featureAt(analysis: AudioAnalysis, feature: AudioFeature, seconds: number): number {
  const values = analysis.features[feature]
  if (!values.length) return 0
  const x = seconds * analysis.rate
  const i = Math.floor(x)
  if (i < 0) return values[0]
  if (i >= values.length - 1) return values[values.length - 1]
  const f = x - i
  return values[i] * (1 - f) + values[i + 1] * f
}

/** Attack / release envelope follower over the analysis grid, precomputed so
 *  that a lookup at any time is deterministic (no integration from the wall
 *  clock). Attack and release in milliseconds. */
export function envelopeOf(analysis: AudioAnalysis, feature: AudioFeature, attackMs: number, releaseMs: number): Float32Array {
  const values = analysis.features[feature]
  const out = new Float32Array(values.length)
  const dt = 1 / analysis.rate
  const up = attackMs > 0 ? 1 - Math.exp(-dt / (attackMs / 1000)) : 1
  const down = releaseMs > 0 ? 1 - Math.exp(-dt / (releaseMs / 1000)) : 1
  let env = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    env += (v - env) * (v > env ? up : down)
    out[i] = env
  }
  return out
}

export function sampleSeries(values: Float32Array, rate: number, seconds: number): number {
  if (!values.length) return 0
  const x = seconds * rate, i = Math.floor(x)
  if (i < 0) return values[0]
  if (i >= values.length - 1) return values[values.length - 1]
  const f = x - i
  return values[i] * (1 - f) + values[i + 1] * f
}

/** Mono mixdown of an AudioBuffer-like set of channels. */
export function mixdown(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]
  const out = new Float32Array(channels[0].length)
  for (const channel of channels) for (let i = 0; i < out.length; i++) out[i] += channel[i] / channels.length
  return out
}

/** Energy of a section, for pacing the camera: mean rms between two instants. */
export function meanFeature(analysis: AudioAnalysis, feature: AudioFeature, from: number, to: number): number {
  const values = analysis.features[feature]
  const a = Math.max(0, Math.floor(from * analysis.rate)), b = Math.min(values.length, Math.ceil(to * analysis.rate))
  if (b <= a) return 0
  let s = 0
  for (let i = a; i < b; i++) s += values[i]
  return s / (b - a)
}
