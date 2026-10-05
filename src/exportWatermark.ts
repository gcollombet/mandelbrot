// ── Export watermark (prototype, off by default) ──
//
// A signature spread over the whole frame instead of sitting in one place: two
// faint sine gratings. No pixel shows it, but every pixel carries a little of
// it, so it is found again by correlating the whole image with the two waves,
// and it survives a resize.
//
// Kept out of sight three ways. It goes on the BLUE channel only, which
// weighs 7 % of the luminance: the eye resolves a blue-yellow grating this
// fine about ten times worse than a light-dark one. It follows the picture:
// full strength where the image is busy, a fraction of it on flat areas,
// where a regular pattern is easiest to spot. And both waves are fine (a
// period of 14 and 34 pixels at 1080p), above the scale of the fractal's own
// large shapes.
//
// What makes it ours is the pair: the second wave is FREQUENCY_RATIO times
// finer than the first (the Feigenbaum constant α) and turned by the golden
// angle. Frequencies are in cycles per image height and the phase origin is
// the image centre, so the pattern scales with the frame.

export const WATERMARK = {
  /** Cycles per image height of the coarse wave. */
  baseFrequency: 32,
  /** Feigenbaum α. */
  frequencyRatio: 2.502907875,
  /** Direction of the coarse wave, degrees from the x axis. */
  baseAngle: 20,
  /** Golden angle between the two waves, degrees. */
  angleBetween: 137.50776,
} as const

export type WatermarkSettings = {
  /** Mark every SDR capture, stills and dev captures included (off by default). */
  enabled: boolean
  /** Mark exported videos, SDR and HDR (on by default). */
  video: boolean
  /** Peak amplitude of each wave on the blue channel, in 8-bit levels, where the image is busy. */
  amplitude: number
  /** Share of that amplitude kept on perfectly flat areas, [0, 1]. */
  flatShare: number
}
const STORAGE_KEY = 'mandelbrot_export_watermark'
// Amplitude 8: half of what was judged invisible on a test frame (16), and
// found after JPEG 30, WebP 50, 720p and H.264 down to 0.8 Mbit/s.
const DEFAULTS: WatermarkSettings = { enabled: false, video: true, amplitude: 8, flatShare: 0.15 }
const clampSettings = (s: WatermarkSettings): WatermarkSettings => ({
  enabled: !!s.enabled,
  video: s.video !== false,
  amplitude: Math.max(0, Math.min(16, Number(s.amplitude) || 0)),
  flatShare: Math.max(0, Math.min(1, Number(s.flatShare) || 0)),
})

function load(): WatermarkSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (raw && typeof raw === 'object') return clampSettings({ ...DEFAULTS, ...raw })
  } catch { /* defaults */ }
  return { ...DEFAULTS }
}
export const watermarkSettings: WatermarkSettings = load()
export function setWatermark(patch: Partial<WatermarkSettings>): WatermarkSettings {
  Object.assign(watermarkSettings, clampSettings({ ...watermarkSettings, ...patch }))
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watermarkSettings)) } catch { /* ignore */ }
  return { ...watermarkSettings }
}

/** The two waves at a pixel, each in [-1, 1]. Shared with the detector's maths. */
export function watermarkWaves(x: number, y: number, width: number, height: number): [number, number] {
  const u = (x + 0.5 - width / 2) / height, v = (y + 0.5 - height / 2) / height
  const a1 = WATERMARK.baseAngle * Math.PI / 180, a2 = a1 + WATERMARK.angleBetween * Math.PI / 180
  const f1 = WATERMARK.baseFrequency, f2 = f1 * WATERMARK.frequencyRatio
  return [
    Math.cos(2 * Math.PI * f1 * (u * Math.cos(a1) + v * Math.sin(a1))),
    Math.cos(2 * Math.PI * f2 * (u * Math.cos(a2) + v * Math.sin(a2))),
  ]
}

let patternCache: { width: number; height: number; pattern: Float32Array } | null = null

/** Sum of the two waves for a frame size, in [-2, 2]. */
export function watermarkPattern(width: number, height: number): Float32Array {
  if (patternCache && patternCache.width === width && patternCache.height === height) return patternCache.pattern
  const pattern = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [w1, w2] = watermarkWaves(x, y, width, height)
      pattern[y * width + x] = w1 + w2
    }
  }
  patternCache = { width, height, pattern }
  return pattern
}

/** How busy the image is around a pixel, 0 flat .. 1 textured: the green
 *  channel's change towards the pixels two to the left and two above.
 *  The detector uses the same measure to weigh its correlation. */
export const WATERMARK_ACTIVITY_FULL = 24
export function watermarkActivity(pixels: Uint8Array, p: number, stride: number, x: number, y: number): number {
  const g = pixels[p + 1]
  const dx = x >= 2 ? Math.abs(g - pixels[p - 8 + 1]) : 0, dy = y >= 2 ? Math.abs(g - pixels[p - 2 * stride + 1]) : 0
  return Math.min(1, (dx + dy) / WATERMARK_ACTIVITY_FULL)
}

/** Add the watermark to an 8-bit RGBA/BGRA frame in place. Only blue moves. */
export function applyWatermark(pixels: Uint8Array, width: number, height: number, stride: number, settings: Pick<WatermarkSettings, 'enabled' | 'amplitude' | 'flatShare'> = watermarkSettings, blueOffset = 2): void {
  if (!settings.enabled || !(settings.amplitude > 0)) return
  const pattern = watermarkPattern(width, height)
  const { amplitude, flatShare } = settings
  // The activity reads green, which is never written: the order of the walk does not matter.
  for (let y = 0; y < height; y++) {
    let p = y * stride, d = y * width
    for (let x = 0; x < width; x++, p += 4, d++) {
      const strength = amplitude * (flatShare + (1 - flatShare) * watermarkActivity(pixels, p, stride, x, y))
      // Interleaved gradient noise keeps fractional amplitudes on average.
      const noise = (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1
      const add = Math.floor(strength * pattern[d] + noise)
      if (!add) continue
      const value = pixels[p + blueOffset] + add
      pixels[p + blueOffset] = value < 0 ? 0 : value > 255 ? 255 : value
    }
  }
}

// ── HDR video frames (PQ, BT.2020) ──
// The same mark goes on PQ-coded blue inside hdr_output.wgsl, before the
// Y'CbCr conversion. An 8-bit sRGB level is worth about 0.58 / 255 of the PQ
// range around SDR white: that is the offset one level of `amplitude` gives.
export const WATERMARK_HDR_LEVEL = 0.58 / 255
