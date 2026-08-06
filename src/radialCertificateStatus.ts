import type { RadialCertificateBuildCause } from './radialCertificateContract'

export {
  RADIAL_CERTIFICATE_LAYOUT_VERSION,
  RADIAL_CERTIFICATE_WORDS_PER_BLOCK,
} from './radialCertificateContract'

export const RADIAL_REJECTION_LABELS = [
  'rayon affine',
  'cap intrinsèque (dc/dz)',
  'pôle rationnel',
  'réservé v2',
  'certificat mort / non fini',
  'réservé',
  'réservé',
  'préfiltre radial',
] as const

export function radialBuildCauseLabel(cause: RadialCertificateBuildCause): string {
  if (cause === 'epoch-reset') return 'nouvelle époque'
  if (cause === 'reference-growth') return 'croissance référence'
  return 'aucune'
}

export function radialDomainStatus(referenceLog2Dc: number, currentLog2CMax: number): {
  margin: number
  outOfRange: boolean
  label: string
} {
  const margin = Number.isFinite(referenceLog2Dc) && Number.isFinite(currentLog2CMax)
    ? referenceLog2Dc - currentLog2CMax
    : Number.NaN
  if (!Number.isFinite(margin)) return { margin, outOfRange: false, label: '' }
  return margin < 0
    ? { margin, outOfRange: true, label: `HORS DOMAINE · dépassement ${(-margin).toFixed(1)} oct` }
    : { margin, outOfRange: false, label: `OK · marge ${margin.toFixed(1)} oct` }
}

export function hasViewportCertificateRegression(count: number): boolean {
  return Number.isFinite(count) && count > 0
}
