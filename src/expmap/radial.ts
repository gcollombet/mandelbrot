import type { ExpmapEffects } from './effects'
export type RadialMode = 'normal' | 'repeat' | 'pingpong' | 'radial' | 'folds' | 'mirror'
export function radialMode(e?: Partial<ExpmapEffects>): RadialMode { return e?.radialMode ?? (e?.loopOctaves ? 'repeat' : 'normal') }
export function radialConfig(e: Partial<ExpmapEffects> | undefined, count: number) {
  const mode = radialMode(e)
  const start = mode === 'pingpong' || mode === 'radial' ? Math.min(count-1,e?.radialStart??0) : 0
  const period = Math.min(count-start, mode === 'pingpong' ? e?.radialTurn ?? count : e?.radialPeriod ?? 1)
  return { mode, period, count, start }
}
export type RadialConfig = ReturnType<typeof radialConfig>
/** Each virtual octave is read forward or backward; source images remain unchanged. */
export function radialOctave(index: number, c: RadialConfig) {
  const { mode, period, count } = c
  if (mode === 'normal' || mode === 'repeat' || mode === 'mirror') return { source: index % count, reverse: false }
  const cycleIndex = index % (3 * count)
  const block = mode === 'folds' ? Math.floor(cycleIndex / (3 * period)) * period : 0
  const p = Math.min(period, count - block)
  const local = mode === 'folds' ? cycleIndex - 3 * block : index % (2 * p)
  const reverse = local >= p && local < 2 * p
  const offset = reverse ? 2 * p - 1 - local : local >= 2 * p ? local - 2 * p : local
  return { source: (c.start + block + offset) % count, reverse }
}
export function radialCycle(c: RadialConfig) {
  if (c.mode === 'pingpong' || c.mode === 'radial') return 2 * c.period
  if (c.mode === 'folds') return 3 * c.count
  return c.count
}

/** Mirror source interval for the existing twelve-octave pixel footprint.
 * Shift negative source depths by whole document periods, preserving the lookup.
 */
export function fixedMirrorWindow(depth: number, count: number, mirrorDepth = 1) {
  const low = Math.min(0, 2 * mirrorDepth - 12)
  const shift = Math.max(0, Math.ceil(-(depth + low) / count)) * count
  const readDepth = depth + low + shift
  return { readDepth, offset: depth + shift - Math.floor(readDepth) }
}
