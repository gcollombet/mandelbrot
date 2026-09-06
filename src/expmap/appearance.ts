import type { RenderOptions } from '../Engine'
import { getEffectValue } from '../ColorStop'
import { EFFECT_FIELD_NAMES } from '../effectFieldConfig'
import { normalizeAnimationConfig } from '../AnimationConfig'

export type AppearanceProblem = { field: string; message: string; stopIndex?: number }

/** Conservative V1 eligibility; no effect is silently switched off. */
export function expmapAppearanceProblems(options: RenderOptions): AppearanceProblem[] {
  const problems: AppearanceProblem[] = []
  const refuse = (field: string, message: string, stopIndex?: number) => problems.push({ field, message, stopIndex })
  if (!options.colorStops?.length) refuse('colorStops', 'Une palette non vide est requise.')
  for (const [stopIndex, stop] of (options.colorStops ?? []).entries()) {
    for (const [field, value] of Object.entries(stop)) {
      if (typeof value === 'number' && !Number.isFinite(value)) refuse(field, 'Valeur non finie.', stopIndex)
    }
    if (!Number.isFinite(stop.position) || stop.position < 0 || stop.position > 1 || !stop.color) {
      refuse('colorStops', 'Stop de palette invalide.', stopIndex)
    }
    for (const field of EFFECT_FIELD_NAMES) {
      const value = getEffectValue(stop, field)
      if (!Number.isFinite(value)) refuse(field, 'Valeur non finie.', stopIndex)
    }
    for (const field of ['shading', 'skybox', 'tessellation', 'webcam', 'stripeReliefTilt', 'directionCoherenceReliefTilt', 'protrusion'] as const) {
      if (getEffectValue(stop, field) !== 0) {
        refuse(field, 'Cet effet nécessite une vue ou une ressource non compatible avec la cuisson RGB.', stopIndex)
      }
    }
  }
  for (const field of ['heightPaletteShift', 'phaseColoringStrength'] as const) {
    if (options[field] !== 0) refuse(field, 'Cette coloration dépend de la géométrie de la vue ; invariance non démontrée.')
  }
  if (options.debugShading || options.debugView) refuse('debugView', 'Les vues de diagnostic ne sont pas des couleurs spatiales persistantes.')
  // A disabled clock can still contribute a nonzero phase at t=0 in Engine.
  // Reject nonzero tracks conservatively, even on a paused animation: baking
  // must not make enabled appearance animation silently disappear on replay.
  const animation = normalizeAnimationConfig(options.animation, options.animationSpeed)
  for (const [id, track] of Object.entries(animation.tracks)) {
    if (track.enabled && track.amplitude !== 0) refuse(`animation.${id}`, 'Désactiver explicitement cette piste avant de cuire une apparence fixe.')
  }
  for (const [id, track] of Object.entries(options.animation?.tracks ?? {})) {
    if (![track.speed, track.amplitude, track.phase ?? 0].every(Number.isFinite)) refuse(`animation.${id}`, 'Piste non finie.')
  }
  if (options.animation && !Number.isFinite(options.animation.globalSpeed)) refuse('animation.globalSpeed', 'Vitesse non finie.')
  return problems
}

/** Sorted JSON for immutable content identities; rejects lossy JSON values. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson((value as Record<string, unknown>)[key])).join(',') + '}'
  }
  throw new Error('Appearance must contain finite JSON values only')
}

export async function contentIdentity(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  return 'sha256:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function freezeExpmapAppearance(options: RenderOptions) {
  const problems = expmapAppearanceProblems(options)
  if (problems.length) throw new Error(problems.map(p => `${p.field}: ${p.message}`).join('\n'))
  const json = canonicalJson(options)
  return { json, identity: await contentIdentity(new TextEncoder().encode(json)) }
}
