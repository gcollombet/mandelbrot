export const PERIODIC_HEADER_PENDING = 0
export const PERIODIC_HEADER_ACTIVE = 1
export const PERIODIC_HEADER_ORBIT_TOO_SHORT = 2
export const PERIODIC_HEADER_NO_CONVERGED_PERIOD = 3
export const PERIODIC_HEADER_PERIOD_TOO_LARGE = 4
export const PERIODIC_HEADER_CERTIFICATE_REJECTED = 5

/** Human-readable counterpart of Rust's PeriodicBuildStatus WASM contract. */
export function formatPeriodicHeaderStatus(
  status: number,
  activePeriod: number,
  detectedPeriod: number,
): string {
  const p = detectedPeriod > 0 ? detectedPeriod : activePeriod
  switch (status) {
    case PERIODIC_HEADER_PENDING:
      return 'table en construction'
    case PERIODIC_HEADER_ACTIVE:
      return activePeriod > 0 ? `p = ${activePeriod}` : 'active'
    case PERIODIC_HEADER_ORBIT_TOO_SHORT:
      return p > 0 ? `orbite trop courte (p = ${p})` : 'orbite trop courte'
    case PERIODIC_HEADER_NO_CONVERGED_PERIOD:
      return 'aucune période convergée'
    case PERIODIC_HEADER_PERIOD_TOO_LARGE:
      return p > 0 ? `p = ${p} > 512` : 'période > 512'
    case PERIODIC_HEADER_CERTIFICATE_REJECTED:
      return p > 0 ? `certificat refusé (p = ${p})` : 'certificat refusé'
    default:
      return 'état indisponible'
  }
}
