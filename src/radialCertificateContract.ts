export const RADIAL_CERTIFICATE_LAYOUT_VERSION = 3
export const RADIAL_CERTIFICATE_WORDS_PER_BLOCK = 21
export const RADIAL_RANGE_WORDS = 6
export const RADIAL_COEFFICIENT_FLOATS_PER_BLOCK = 27
export const RADIAL_SIDECAR_FLOATS_PER_BLOCK = 4

export type IncrementalCertificateEpoch = {
  jobId: number
  refId: number
  tableGeneration: number
}

export type RadialCertificateBuildCause = 'epoch-reset' | 'reference-growth' | 'none'
export type RadialCertificateTrigger = 'reference-growth' | 'certificate-key-change' | 'viewport-update'

export function sameIncrementalCertificateEpoch(
  expected: IncrementalCertificateEpoch,
  received: IncrementalCertificateEpoch,
): boolean {
  return expected.jobId === received.jobId
    && expected.refId === received.refId
    && expected.tableGeneration === received.tableGeneration
}

export function radialTriggerQueuesBlockWork(trigger: RadialCertificateTrigger): boolean {
  return trigger !== 'viewport-update'
}

export function radialBuildCause(reset: boolean, certificateCount: number): RadialCertificateBuildCause {
  if (reset) return 'epoch-reset'
  return certificateCount > 0 ? 'reference-growth' : 'none'
}

export function validRadialRangePayloadShape(payload: {
  version: number
  wordsPerBlock: number
  rangesWords: number
  coefficientFloats: number
  sidecarFloats: number
  certificateWords: number
  /** Deprecated radial-v2 diagnostic; v3 has only per-block intrinsic caps. */
  referenceLog2Dc?: number
}): boolean {
  if (
    payload.version !== RADIAL_CERTIFICATE_LAYOUT_VERSION
    || payload.wordsPerBlock !== RADIAL_CERTIFICATE_WORDS_PER_BLOCK
    || payload.rangesWords % RADIAL_RANGE_WORDS !== 0
    || payload.coefficientFloats % RADIAL_COEFFICIENT_FLOATS_PER_BLOCK !== 0
  ) return false
  const blockCount = payload.coefficientFloats / RADIAL_COEFFICIENT_FLOATS_PER_BLOCK
  return payload.sidecarFloats === blockCount * RADIAL_SIDECAR_FLOATS_PER_BLOCK
    && payload.certificateWords === blockCount * RADIAL_CERTIFICATE_WORDS_PER_BLOCK
}
