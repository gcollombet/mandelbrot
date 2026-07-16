import {describe, expect, it} from 'vitest'
import {
  formatPeriodicHeaderStatus,
  PERIODIC_HEADER_ACTIVE,
  PERIODIC_HEADER_CERTIFICATE_REJECTED,
  PERIODIC_HEADER_NO_CONVERGED_PERIOD,
  PERIODIC_HEADER_ORBIT_TOO_SHORT,
  PERIODIC_HEADER_PENDING,
  PERIODIC_HEADER_PERIOD_TOO_LARGE,
} from '../../src/periodicHeaderStatus'

describe('periodic header diagnostic label', () => {
  it('distinguishes pending, active and every dormant reason', () => {
    expect(formatPeriodicHeaderStatus(PERIODIC_HEADER_PENDING, -1, -1))
      .toBe('table en construction')
    expect(formatPeriodicHeaderStatus(PERIODIC_HEADER_ACTIVE, 2, 2)).toBe('p = 2')
    expect(formatPeriodicHeaderStatus(PERIODIC_HEADER_ORBIT_TOO_SHORT, 0, 37))
      .toBe('orbite trop courte (p = 37)')
    expect(formatPeriodicHeaderStatus(PERIODIC_HEADER_NO_CONVERGED_PERIOD, 0, 0))
      .toBe('aucune période convergée')
    expect(formatPeriodicHeaderStatus(PERIODIC_HEADER_PERIOD_TOO_LARGE, 0, 600))
      .toBe('p = 600 > 512')
    expect(formatPeriodicHeaderStatus(PERIODIC_HEADER_CERTIFICATE_REJECTED, 0, 37))
      .toBe('certificat refusé (p = 37)')
  })
})
