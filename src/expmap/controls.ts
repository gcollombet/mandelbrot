import { canonicalScale, scaleDoublements } from './decimal'
export const ZOOM_DEPTH_MIN = -10
export const ZOOM_DEPTH_MAX = 1000
export function zoomDepth(scale: string): number { return scaleDoublements('1', scale) / Math.log2(10) }
export function scaleFromDepth(depth: number): string { return `1e${-Math.round(Math.max(ZOOM_DEPTH_MIN, Math.min(ZOOM_DEPTH_MAX, depth)))}` }
export function compactNumber(value: number): string { return Number(value.toFixed(1)).toLocaleString('fr-FR') }
export function magnitudeSummary(from: string, to: string): string {
  try {
    // Display decimal orders, never round-trip the actual coordinates through Number.
    const exponent = (s: string) => BigInt(canonicalScale(s).split('e')[1])
    const a = exponent(from), b = exponent(to), magnitude = a > b ? a - b : b - a
    const signed = (n: bigint) => n >= 0n ? `+${n}` : String(n)
    return `${signed(a)} → ${signed(b)} · Magnitude ${magnitude}`
  } catch { return 'Plage à définir' }
}
export function videoFilename(filename: string): string { return `${filename.replace(/\.expmap$/i, '')}.mp4` }
