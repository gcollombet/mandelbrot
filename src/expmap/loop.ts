import { radialConfig, radialCycle, radialMode } from './radial'
import { scaleTimesExp } from './decimal'
import type { ExpmapManifest } from './manifest'
import type { ExpmapEffects } from './effects'
/** Loop all stored octaves, including the terminal octaves normally used near the center. */
export function expmapLoopDomain(manifest: ExpmapManifest, effects?: Partial<ExpmapEffects>) {
  const domain = manifest.projection.domain
  return radialMode(effects) !== 'normal' ? { ...domain, endScale: scaleTimesExp(domain.startScale, -radialCycle(radialConfig(effects, manifest.octaves.tileCount)) * Math.LN2) } : domain
}
export function expmapSourceOctave(virtualIndex: number, tileCount: number) {
  return ((virtualIndex % tileCount) + tileCount) % tileCount
}
