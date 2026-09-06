import { compareScales } from './decimal'
import type { ExpmapPlan } from './plan'
export type ExpmapCamera = { scale: string; angle: number }
export type ExpmapView = ExpmapCamera & { width: number; height: number }
export function validateExpmapView(plan: ExpmapPlan, view: ExpmapView) {
  if (![view.width, view.height].every(n => Number.isInteger(n) && n > 0) || view.width > plan.width || view.height > plan.height
    || view.width / view.height > plan.width / plan.height + 1e-12) throw new Error('La sortie dépasse la résolution ou la couverture du document.')
  if (!Number.isFinite(view.angle) || compareScales(view.scale, plan.domain.startScale) > 0 || compareScales(view.scale, plan.domain.endScale) < 0) throw new Error('Vue hors du domaine utilisateur ExpMap.')
}

