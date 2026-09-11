import type { RadialMode } from './radial'
import { DEFAULT_EFFECT_ROTATION, effectRotationDegrees, validateEffectRotation, type ExpmapEffectRotation } from './effectRotation'
import { reactive } from 'vue'

export type ExpmapEffects = { droste: number; kaleidoscope: number; orientation: number; imageRotationMode?: 'fixed' | 'octave' | 'droste'; imageRotationRate?: number; loopOctaves?: boolean; radialMode?: RadialMode; radialPeriod?: number; radialTurn?: number; radialStart?: number; mirrorDepth?: number } & Partial<ExpmapEffectRotation>
export const DEFAULT_EXPMAP_EFFECTS: Readonly<ExpmapEffects> = Object.freeze({ droste: 0, kaleidoscope: 0, orientation: 0 })
/** Degrees per doubling; zero sectors disables mirrored angular folding. */
export function effectsSettings(value?: Partial<ExpmapEffects>): ExpmapEffects {
  const e = { ...DEFAULT_EXPMAP_EFFECTS, ...DEFAULT_EFFECT_ROTATION, ...value }
  validateEffectRotation(e)
  if (e.radialStart !== undefined && (!Number.isInteger(e.radialStart) || e.radialStart < 0 || e.radialStart > 999999)) throw new Error('Départ radial invalide.')
  if (e.mirrorDepth !== undefined && (!Number.isFinite(e.mirrorDepth) || e.mirrorDepth < 0.25 || e.mirrorDepth > 6)) throw new Error('Rayon du miroir invalide.')
  if (e.radialMode !== undefined && !['normal','repeat','pingpong','radial','folds','mirror'].includes(e.radialMode)) throw new Error('Relecture radiale invalide.')
  for (const period of [e.radialPeriod, e.radialTurn]) if (period !== undefined && (!Number.isInteger(period) || period < 1 || period > 1000000)) throw new Error('Période radiale invalide.')
  if (e.loopOctaves !== undefined && typeof e.loopOctaves !== 'boolean') throw new Error('Boucle ExpMap invalide.')
  if (!['fixed', 'octave', 'droste'].includes(e.imageRotationMode ?? 'fixed') ||
    !Number.isFinite(e.imageRotationRate ?? 0) || Math.abs(e.imageRotationRate ?? 0) > 2 * Math.PI) throw new Error('Rotation globale ExpMap invalide.')
  if (!Number.isFinite(e.droste) || Math.abs(e.droste) > 180 || !Number.isInteger(e.kaleidoscope) ||
    (e.kaleidoscope !== 0 && (e.kaleidoscope < 2 || e.kaleidoscope > 24)) ||
    !Number.isFinite(e.orientation) || Math.abs(e.orientation) > 360) throw new Error('Effets ExpMap invalides.')
  return e
}
/** Reduce the absolute phase on CPU so deep zoom never enters a float32 uniform. */
export function expmapEffectsUniform(value: Partial<ExpmapEffects> | undefined, base: number, depth = base, seconds = 0) {
  const e = effectsSettings(value)
  const radians = e.droste * Math.PI / 180
  // Droste already rotates the screen-space fold axes by -droste * depth.
  // Independent rotation replaces that drift; tracking keeps its natural phase.
  const rotation = e.droste * depth +
    effectRotationDegrees({ ...DEFAULT_EFFECT_ROTATION, ...e }, seconds, depth, e.droste)
  return [radians, ((base * e.droste) % 360) * Math.PI / 180, e.kaleidoscope, ((e.orientation + rotation) % 360) * Math.PI / 180]
}
const documents = reactive<Record<string, ExpmapEffects>>({})
export function documentEffects(id: string): ExpmapEffects {
  if (!documents[id]) {
    let value: ExpmapEffects = { ...DEFAULT_EXPMAP_EFFECTS }
    try {
      const saved = JSON.parse(localStorage.getItem(`expmap-effects:${id}`) ?? 'null')
      if (saved?.version === 1) value = effectsSettings(saved.effects)
    } catch { /* Invalid or unavailable preferences retain neutral effects. */ }
    documents[id] = value
  }
  return documents[id]
}
export function saveDocumentEffects(id: string, value: Partial<ExpmapEffects>) {
  const effects = effectsSettings(value)
  documents[id] = effects
  try { localStorage.setItem(`expmap-effects:${id}`, JSON.stringify({ version: 1, effects })) } catch { /* Retain edits in memory. */ }
}

/** Camera sampling angle; negative Droste phase follows its apparent screen rotation. */
export function expmapImageRotation(value: Partial<ExpmapEffects> | undefined, depth: number) {
  const e = effectsSettings(value)
  if (e.imageRotationMode === 'droste') return -((e.droste * depth) % 360) * Math.PI / 180
  if (e.imageRotationMode === 'octave') return ((e.imageRotationRate ?? 0) * depth) % (2 * Math.PI)
  return 0
}
