import { t } from '../i18n'
import { normalizeOrbitTrapConfig, orbitTrapAccumulatorSignature, orbitTrapUsesOrbit } from '../OrbitTrap'
import type { RenderOptions } from '../Engine'
import type { ShaderExpmapManifest } from './displayFormat'

export function assertShaderAppearanceCompatible(m:ShaderExpmapManifest,appearance:RenderOptions) {
  const original=JSON.parse(m.appearanceJson) as RenderOptions
  if(original.stripeFrequency!==appearance.stripeFrequency)throw new Error(t('expmap.compat.stripeFrequency'))
  const before=normalizeOrbitTrapConfig(original.orbitTrap,original.orbitTrapStrength)
  const after=normalizeOrbitTrapConfig(appearance.orbitTrap,appearance.orbitTrapStrength)
  if(orbitTrapUsesOrbit(after)&&(!orbitTrapUsesOrbit(before)||orbitTrapAccumulatorSignature(before)!==orbitTrapAccumulatorSignature(after)))throw new Error(t('expmap.compat.orbitTrap'))
}
