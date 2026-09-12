import { normalizeOrbitTrapConfig, orbitTrapAccumulatorSignature, orbitTrapUsesOrbit } from '../OrbitTrap'
import type { RenderOptions } from '../Engine'
import type { ShaderExpmapManifest } from './displayFormat'

export function assertShaderAppearanceCompatible(m:ShaderExpmapManifest,appearance:RenderOptions) {
  const original=JSON.parse(m.appearanceJson) as RenderOptions
  if(original.stripeFrequency!==appearance.stripeFrequency)throw new Error('La fréquence orbitale change le calcul : utiliser la fréquence de la source ou recalculer celle-ci.')
  const before=normalizeOrbitTrapConfig(original.orbitTrap,original.orbitTrapStrength)
  const after=normalizeOrbitTrapConfig(appearance.orbitTrap,appearance.orbitTrapStrength)
  if(orbitTrapUsesOrbit(after)&&(!orbitTrapUsesOrbit(before)||orbitTrapAccumulatorSignature(before)!==orbitTrapAccumulatorSignature(after)))throw new Error('Cette géométrie d’orbit trap nécessite une nouvelle source.')
}
