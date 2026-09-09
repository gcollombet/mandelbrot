import { reactive } from 'vue'

export type ExpmapEffects = { droste: number; kaleidoscope: number; orientation: number }
export const DEFAULT_EXPMAP_EFFECTS: Readonly<ExpmapEffects> = Object.freeze({ droste: 0, kaleidoscope: 0, orientation: 0 })
/** Degrees per doubling; zero sectors disables mirrored angular folding. */
export function effectsSettings(value?: Partial<ExpmapEffects>): ExpmapEffects {
  const e = { ...DEFAULT_EXPMAP_EFFECTS, ...value }
  if (!Number.isFinite(e.droste) || Math.abs(e.droste) > 180 || !Number.isInteger(e.kaleidoscope) ||
    (e.kaleidoscope !== 0 && (e.kaleidoscope < 2 || e.kaleidoscope > 24)) ||
    !Number.isFinite(e.orientation) || Math.abs(e.orientation) > 360) throw new Error('Effets ExpMap invalides.')
  return e
}
/** Reduce the absolute phase on CPU so deep zoom never enters a float32 uniform. */
export function expmapEffectsUniform(value: Partial<ExpmapEffects> | undefined, base: number) {
  const e = effectsSettings(value)
  const radians = e.droste * Math.PI / 180
  return [radians, ((base * e.droste) % 360) * Math.PI / 180, e.kaleidoscope, e.orientation * Math.PI / 180]
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
