import {describe, expect, it} from 'vitest'
import {
  PASS_SLOT_INDEX,
  PASS_SLOTS,
  TS_COUNT,
  partitionGpuPassTimestamps,
  selectRawUtilityPassKey,
  shouldEncodeTimestampBoundary,
  type GpuPassKey,
} from '../../src/gpuPassTimings'

const ns = (milliseconds: number) => BigInt(milliseconds) * 1_000_000n

const sampleData = (...entries: Array<[GpuPassKey, number, number]>) => {
  const data = new BigInt64Array(TS_COUNT)
  let mask = 0
  for (const [key, startMs, endMs] of entries) {
    const slot = PASS_SLOT_INDEX[key]
    data[slot * 2] = ns(startMs)
    data[slot * 2 + 1] = ns(endMs)
    mask |= 1 << slot
  }
  return {data, mask}
}

describe('GPU pass timing attribution', () => {
  it('measures a snapshot exactly when it is the first GPU operation', () => {
    const {data, mask} = sampleData(
      ['snapshot', 2, 5],
      ['compute', 5, 11],
    )

    const result = partitionGpuPassTimestamps(data, mask)

    expect(result.samples.map(sample => sample.key)).toEqual(['snapshot', 'compute'])
    expect(result.samples.map(sample => sample.durationMs)).toEqual([3, 6])
    expect(result.spanMs).toBe(9)
  })

  it('keeps merge and snapshot explicit while excluding both from the following shader', () => {
    const {data, mask} = sampleData(
      ['merge', 0, 4],
      ['snapshot', 5, 8],
      // A clustered begin marker must not make compute absorb earlier work.
      ['compute', 0, 12],
    )

    const result = partitionGpuPassTimestamps(data, mask)
    const durations = Object.fromEntries(result.samples.map(sample => [sample.key, sample.durationMs]))

    expect(durations.merge).toBe(4)
    expect(durations.snapshot).toBe(3)
    expect(durations.compute).toBe(4)
    expect(result.spanMs).toBe(12)
    expect(result.samples.reduce((sum, sample) => sum + sample.durationMs, 0)).toBe(11)
  })

  it('retains consecutive-end partitioning for ordinary passes', () => {
    const {data, mask} = sampleData(
      ['color', 0, 2],
      ['present', 0, 3],
    )

    const result = partitionGpuPassTimestamps(data, mask)

    expect(result.samples.map(sample => sample.durationMs)).toEqual([2, 1])
    expect(result.spanMs).toBe(3)
  })

  it('selects clear before pan and exposes independent panel metadata', () => {
    expect(selectRawUtilityPassKey(true)).toBe('clear')
    expect(selectRawUtilityPassKey(false)).toBe('reproject')
    expect(PASS_SLOTS[PASS_SLOT_INDEX.clear]).toMatchObject({label: 'Clear cache', timing: 'end-gap'})
    expect(PASS_SLOTS[PASS_SLOT_INDEX.reproject]).toMatchObject({label: 'Reprojection (pan)', timing: 'end-gap'})
    expect(PASS_SLOTS[PASS_SLOT_INDEX.snapshot]).toMatchObject({label: 'Snapshot (zoom)', timing: 'explicit-span'})
    expect(PASS_SLOTS[PASS_SLOT_INDEX.merge]).toMatchObject({label: 'Merge (zoom)', timing: 'explicit-span'})
    expect(PASS_SLOTS.every(slot => slot.help.length > 0)).toBe(true)
  })

  it('omits timestamp boundary passes unless measurement is fully available', () => {
    expect(shouldEncodeTimestampBoundary(true, true)).toBe(true)
    expect(shouldEncodeTimestampBoundary(false, true)).toBe(false)
    expect(shouldEncodeTimestampBoundary(true, false)).toBe(false)
    expect(shouldEncodeTimestampBoundary(false, false)).toBe(false)
  })

  it('keeps query sizing derived and active-slot bookkeeping below 32 bits', () => {
    expect(TS_COUNT).toBe(PASS_SLOTS.length * 2)
    expect(PASS_SLOTS.length).toBeLessThan(32)
  })
})
