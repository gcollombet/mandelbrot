// ── Minibrot actions shared by the Settings panel and the HUD shortcuts ──
// Both callers own a `MandelbrotParams` model whose replacement teleports the
// view (parent watcher: cancel transition → origin → reference reset). These
// helpers compute the replacement and a status line; they never mutate.

import type { MandelbrotParams } from './Mandelbrot'
import { log10FromDecimalString } from './floatexp'

export type MinibrotEngine = {
  findMinibrot(radiusFactor?: number, fill?: number): Promise<{
    status: 'ok' | 'none' | 'nonewton' | 'nosize'
    cx: string | null
    cy: string | null
    period: number | null
    scale?: string | null
  }>
}

export type MinibrotOutcome = {
  /** Replacement model, or null when nothing was found. */
  next: MandelbrotParams | null
  status: string
}

/** Fraction of the limiting screen axis the framed zoom gives the minibrot. */
export const MINIBROT_FILL = 0.5

const RADIUS_FACTOR = 4

function precisionBudgetExponent(budget: string | undefined): number {
  const m = /1e(-?\d+)/i.exec(budget ?? '1e-30')
  return m ? Math.abs(parseInt(m[1], 10)) : 30
}

/** Detect the atom under the view and recentre on its nucleus, zoom unchanged. */
export async function centerOnMinibrot(engine: MinibrotEngine, model: MandelbrotParams): Promise<MinibrotOutcome> {
  try {
    const res = await engine.findMinibrot(RADIUS_FACTOR)
    if (res.status === 'ok' && res.cx && res.cy) {
      return { next: { ...model, cx: res.cx, cy: res.cy }, status: `Centré sur le minibrot de période ${res.period}` }
    }
    if (res.status === 'nonewton') {
      return { next: null, status: `Période ${res.period} trouvée, mais le nucléus n'a pas convergé` }
    }
    return { next: null, status: 'Aucun minibrot sous la vue : zoomer sur un d’abord' }
  } catch {
    return { next: null, status: 'Recherche du minibrot échouée' }
  }
}

/**
 * Same detection, then frame the whole copy: the worker adds the Munafo/Jung
 * size estimate and returns the copy's centre plus the view half-height that
 * makes it span MINIBROT_FILL of the limiting axis. The framing can land far
 * deeper than the current view, so the precision budget is carried along.
 */
export async function frameMinibrot(engine: MinibrotEngine, model: MandelbrotParams): Promise<MinibrotOutcome> {
  try {
    const res = await engine.findMinibrot(RADIUS_FACTOR, MINIBROT_FILL)
    if (res.status === 'ok' && res.cx && res.cy && res.scale) {
      const next: MandelbrotParams = { ...model, cx: res.cx, cy: res.cy, scale: res.scale }
      const log = log10FromDecimalString(res.scale)
      const depth = Math.ceil(-(Number.isFinite(log) ? log : 0)) + 5
      if (depth > precisionBudgetExponent(model.precisionBudget)) {
        next.precisionBudget = `1e-${Math.min(1000, depth)}`
      }
      return { next, status: `Minibrot de période ${res.period} cadré` }
    }
    if (res.status === 'nosize') {
      return { next: null, status: `Période ${res.period} trouvée, mais l'estimation de taille a dégénéré` }
    }
    if (res.status === 'nonewton') {
      return { next: null, status: `Période ${res.period} trouvée, mais le nucléus n'a pas convergé` }
    }
    return { next: null, status: 'Aucun minibrot sous la vue : zoomer sur un d’abord' }
  } catch {
    return { next: null, status: 'Cadrage du minibrot échoué' }
  }
}
