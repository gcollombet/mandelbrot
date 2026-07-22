import { describe, expect, it } from 'vitest'
import {
  radialBuildCause,
  radialTriggerQueuesBlockWork,
  sameIncrementalCertificateEpoch,
  validRadialRangePayloadShape,
} from '../../src/radialCertificateContract'

const epoch = { jobId: 7, refId: 11, tableGeneration: 3 }

describe('incremental radial transport contract', () => {
  it('rejects stale job, reference, and generation identifiers', () => {
    expect(sameIncrementalCertificateEpoch(epoch, epoch)).toBe(true)
    expect(sameIncrementalCertificateEpoch(epoch, { ...epoch, jobId: 8 })).toBe(false)
    expect(sameIncrementalCertificateEpoch(epoch, { ...epoch, refId: 12 })).toBe(false)
    expect(sameIncrementalCertificateEpoch(epoch, { ...epoch, tableGeneration: 4 })).toBe(false)
  })

  it('validates matched coefficient, sidecar, and certificate ranges', () => {
    const valid = {
      version: 3,
      wordsPerBlock: 21,
      rangesWords: 12,
      coefficientFloats: 54,
      sidecarFloats: 8,
      certificateWords: 42,
      referenceLog2Dc: Number.NaN,
    }
    expect(validRadialRangePayloadShape(valid)).toBe(true)
    expect(validRadialRangePayloadShape({ ...valid, certificateWords: 21 })).toBe(false)
    expect(validRadialRangePayloadShape({ ...valid, version: 2 })).toBe(false)
    expect(validRadialRangePayloadShape({ ...valid, referenceLog2Dc: -120 })).toBe(true)
    expect(validRadialRangePayloadShape({
      version: 3,
      wordsPerBlock: 21,
      rangesWords: 12,
      coefficientFloats: 54,
      sidecarFloats: 8,
      certificateWords: 42,
    })).toBe(true)
  })

  it('keeps viewport and optional-header refreshes out of block work', () => {
    expect(radialTriggerQueuesBlockWork('reference-growth')).toBe(true)
    expect(radialTriggerQueuesBlockWork('certificate-key-change')).toBe(true)
    expect(radialTriggerQueuesBlockWork('viewport-update')).toBe(false)
    expect(radialBuildCause(false, 0)).toBe('none')
    expect(radialBuildCause(false, 5)).toBe('reference-growth')
    expect(radialBuildCause(true, 0)).toBe('epoch-reset')
  })
})
