import type { RenderOptions } from '../Engine'
import { getEffectValue } from '../ColorStop'
import { EFFECT_FIELD_NAMES } from '../effectFieldConfig'
import { normalizeAnimationConfig } from '../AnimationConfig'

export type AppearanceProblem = { field: string; message: string; stopIndex?: number; kind: 'invalid' | 'unsupported' }

/** Reject effects that affect the baked output and require a changing view/resource. */
export function expmapAppearanceProblems(options: RenderOptions): AppearanceProblem[] {
  const problems: AppearanceProblem[] = []
  const refuse = (field: string, message: string, stopIndex?: number) => problems.push({ field, message, stopIndex, kind: 'invalid' })
  const restrict = (field: string, message: string, stopIndex?: number) => problems.push({ field, message, stopIndex, kind: 'unsupported' })
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
    for (const field of ['shading', 'tessellation', 'webcam'] as const) {
      if (getEffectValue(stop, field) !== 0) {
        restrict(field, field === 'shading' ? 'Le shading actif dépend de la vue et de l’échelle.' : 'Cette image source n’est pas encore figée et vérifiée pour la reprise ExpMap.', stopIndex)
      }
    }
  }
  for (const field of ['heightPaletteShift', 'phaseColoringStrength'] as const) {
    if (!Number.isFinite(options[field])) refuse(field, 'Valeur non finie.')
  }
  if (options.heightPaletteShift !== 0) restrict('heightPaletteShift', 'La hauteur utilisée pour décaler la palette dépend de l’échelle de vue.')
  if (options.debugShading || options.debugView) restrict('debugView', 'Les vues de diagnostic ne sont pas des couleurs spatiales persistantes.')
  // A paused track contributes its fixed phase; this can be baked for spatial
  // colors. Height remains scale-dependent even when its contribution is fixed.
  const hasShading = (options.colorStops ?? []).some(stop => getEffectValue(stop, 'shading') !== 0)
  const hasTexture = (options.colorStops ?? []).some(stop => getEffectValue(stop, 'tessellation') !== 0 || getEffectValue(stop, 'webcam') !== 0)
  // Animation tracks alter parameters, never the activation weights in stops.
  const materialTracks = new Set(['lightAngle', 'skyReflectionDrift', 'varnish', 'microBump', 'protrusionPhase', 'reliefDepth'])
  const textureTracks = new Set(['textureDrift', 'displacement', 'tessellation'])
  const animation = normalizeAnimationConfig(options.animation, options.animationSpeed)
  for (const [id, track] of Object.entries(animation.tracks)) {
    const inactive = (!hasShading && materialTracks.has(id)) || (!hasTexture && textureTracks.has(id))
    const moving = options.activateAnimate !== false && track.speed !== 0 && animation.globalSpeed !== 0
    if (!inactive && track.enabled && track.amplitude !== 0 && (moving || id === 'heightPaletteShift')) {
      restrict(`animation.${id}`, id === 'heightPaletteShift' ? 'Cette piste modifie une hauteur dépendante de l’échelle de vue.' : 'Désactiver cette animation de couleur pour cuire une apparence fixe.')
    }
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

export function expmapBlockingProblems(options: RenderOptions, forceRender = false) {
  return expmapAppearanceProblems(options).filter(problem => !forceRender || problem.kind === 'invalid')
}

export async function freezeExpmapAppearance(options: RenderOptions, forceRender = false) {
  const problems = expmapBlockingProblems(options, forceRender)
  if (problems.length) throw new Error(problems.map(p => `${p.field}: ${p.message}`).join('\n'))
  const json = canonicalJson(options)
  return { json, identity: await contentIdentity(new TextEncoder().encode(json)) }
}
