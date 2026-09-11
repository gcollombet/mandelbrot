export type ExpmapEffectRotation = {
  rotationMode: 'fixed' | 'progressive' | 'droste'
  rotationSpeed: number
}
export const DEFAULT_EFFECT_ROTATION: ExpmapEffectRotation = { rotationMode: 'fixed', rotationSpeed: 10 }
/** Degrees. Playback time drives free rotation; signed zoom depth drives Droste tracking. */
export function effectRotationDegrees(settings: ExpmapEffectRotation, seconds: number, doublings: number, droste: number) {
  if (settings.rotationMode === 'fixed') return 0
  if (settings.rotationMode === 'droste') return -droste * doublings
  return settings.rotationSpeed * seconds
}
export function validateEffectRotation(settings: ExpmapEffectRotation) {
  if (!['fixed', 'progressive', 'droste'].includes(settings.rotationMode) ||
    !Number.isFinite(settings.rotationSpeed) || Math.abs(settings.rotationSpeed) > 360) throw new Error('Rotation des effets ExpMap invalide.')
}
