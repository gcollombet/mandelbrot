/** Velocity ramps, integrated analytically: monotone travel with exact endpoints. */
export const EXPMAP_EASES = [
  { value: 'none', label: 'Aucune' },
  { value: 'linear', label: 'Progressive' },
  { value: 'smooth', label: 'Douce' },
  { value: 'linger', label: 'Prolongée · quasi-pause' },
] as const
export type ExpmapEase = typeof EXPMAP_EASES[number]['value']
export type ExpmapMotion = { easeIn: ExpmapEase; easeOut: ExpmapEase; easeInSeconds: number; easeOutSeconds: number; holdSeconds: number }
export const DEFAULT_EXPMAP_MOTION: ExpmapMotion = { easeIn: 'none', easeOut: 'none', easeInSeconds: 1, easeOutSeconds: 5, holdSeconds: 0 }
export function motionSettings(value: Partial<ExpmapMotion>): ExpmapMotion { return { ...DEFAULT_EXPMAP_MOTION, ...value } }
export function validateMotion(value: Partial<ExpmapMotion>, duration: number) {
  const m = motionSettings(value)
  if (![m.easeIn, m.easeOut].every(v => EXPMAP_EASES.some(e => e.value === v)) ||
    ![m.easeInSeconds, m.easeOutSeconds, m.holdSeconds].every(v => Number.isFinite(v) && v >= 0 && v <= 86400)) throw new Error('Courbe ou durée de transition invalide.')
  if ((m.easeIn === 'none' ? 0 : m.easeInSeconds) + (m.easeOut === 'none' ? 0 : m.easeOutSeconds) > duration + 1e-9) throw new Error('Les transitions dépassent la durée du trajet.')
}
/** Fit only on an explicit duration edit; never change a saved trajectory at render time. */
export function fitMotion<T extends { durationSeconds: number } & Partial<ExpmapMotion>>(value: T): T {
  const m = motionSettings(value)
  const sum = (m.easeIn === 'none' ? 0 : m.easeInSeconds) + (m.easeOut === 'none' ? 0 : m.easeOutSeconds)
  if (sum <= value.durationSeconds) return value
  const ratio = value.durationSeconds / sum
  return { ...value, easeInSeconds: m.easeInSeconds * (m.easeIn === 'none' ? 1 : ratio), easeOutSeconds: m.easeOutSeconds * (m.easeOut === 'none' ? 1 : ratio) }
}
function integral(curve: ExpmapEase, u: number) {
  if (curve === 'linger') return u ** 4 / 4
  if (curve === 'smooth') return u ** 3 - u ** 4 / 2
  if (curve === 'linear') return u * u / 2
  return u
}
export function motionProgress(value: { durationSeconds: number } & Partial<ExpmapMotion>, elapsed: number): number {
  const duration = value.durationSeconds
  if (elapsed <= 0) return 0
  if (elapsed >= duration) return 1
  const m = motionSettings(value)
  const a = m.easeIn === 'none' ? 0 : m.easeInSeconds, b = m.easeOut === 'none' ? 0 : m.easeOutSeconds
  const inArea = a * integral(m.easeIn, 1), outArea = b * integral(m.easeOut, 1)
  const area = inArea + duration - a - b + outArea
  let traveled: number
  if (a > 0 && elapsed < a) traveled = a * integral(m.easeIn, elapsed / a)
  else if (b > 0 && elapsed > duration - b) traveled = area - b * integral(m.easeOut, (duration - elapsed) / b)
  else traveled = inArea + elapsed - a
  return Math.max(0, Math.min(1, traveled / area))
}
