import { compareScales } from './decimal'
import type { ExpmapOctaves } from './octaves'
import type { ExpmapPlan } from './plan'
export type ExpmapCamera = { scale: string; angle: number }
export type ExpmapView = ExpmapCamera & { width: number; height: number; maxSamples?: number }
export const EXPMAP_SAMPLE_LIMITS = [1,4,9,16,36,64,144,256] as const
export function validateExpmapSamples(maxSamples: number) {
  if (!(EXPMAP_SAMPLE_LIMITS as readonly number[]).includes(maxSamples)) throw new Error(`Prélèvements ExpMap : choisir ${EXPMAP_SAMPLE_LIMITS.join(', ')}.`)
}
export function validateExpmapView(plan: ExpmapPlan, view: ExpmapView) {
  validateExpmapSamples(view.maxSamples ?? 1)
  if (![view.width, view.height].every(n => Number.isInteger(n) && n > 0) || view.width > plan.width || view.height > plan.height
    || view.width / view.height > plan.width / plan.height + 1e-12) throw new Error('La sortie dépasse la résolution ou la couverture du document.')
  if (!Number.isFinite(view.angle) || compareScales(view.scale, plan.domain.startScale) > 0 || compareScales(view.scale, plan.domain.endScale) < 0) throw new Error('Vue hors du domaine utilisateur ExpMap.')
}


/** Shared uniform contract: least dense polar axis, and an explicit tap ceiling. */
export function expmapFilterUniform(layout:ExpmapOctaves,maxSamples=1) {
  validateExpmapSamples(maxSamples)
  return [Math.sqrt(maxSamples),Math.min(layout.angularSamples/(2*Math.PI),layout.rowsPerOctave/Math.LN2),0,0]
}
