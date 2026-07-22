import { describe, expect, it } from 'vitest'
import {
  RADIAL_CERTIFICATE_LAYOUT_VERSION,
  RADIAL_CERTIFICATE_WORDS_PER_BLOCK,
  RADIAL_REJECTION_LABELS,
  hasViewportCertificateRegression,
  radialBuildCauseLabel,
  radialDomainStatus,
} from '../../src/radialCertificateStatus'

describe('reference-owned radial certificate status', () => {
  it('pins the compact layout and counter mapping', () => {
    expect(RADIAL_CERTIFICATE_LAYOUT_VERSION).toBe(3)
    expect(RADIAL_CERTIFICATE_WORDS_PER_BLOCK).toBe(21)
    expect(RADIAL_REJECTION_LABELS.slice(0, 5)).toEqual([
      'rayon affine',
      'cap intrinsèque (dc/dz)',
      'pôle rationnel',
      'réservé v2',
      'certificat mort / non fini',
    ])
  })

  it('distinguishes in-domain and out-of-domain views', () => {
    expect(radialDomainStatus(-20, -24)).toEqual({
      margin: 4,
      outOfRange: false,
      label: 'OK · marge 4.0 oct',
    })
    expect(radialDomainStatus(-20, -18)).toEqual({
      margin: -2,
      outOfRange: true,
      label: 'HORS DOMAINE · dépassement 2.0 oct',
    })
  })

  it('makes viewport-only rebuilds an explicit regression signal', () => {
    expect(hasViewportCertificateRegression(0)).toBe(false)
    expect(hasViewportCertificateRegression(1)).toBe(true)
    expect(radialBuildCauseLabel('reference-growth')).toBe('croissance référence')
  })
})
