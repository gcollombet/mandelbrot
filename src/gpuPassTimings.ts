export type GpuPassTimingMode = 'end-gap' | 'explicit-span'

export type GpuPassKey =
  | 'merge'
  | 'snapshot'
  | 'reproject'
  | 'clear'
  | 'reseed'
  | 'compute'
  | 'resolve'
  | 'aaAccum'
  | 'color'
  | 'present'

export interface GpuPassSlot {
  key: GpuPassKey
  label: string
  /** i18n key of the display label (`label` stays the stable English/CSV identifier). */
  labelKey: string
  helpKey: string
  timing: GpuPassTimingMode
}

// Order defines both timestamp query indices and PerformancePanel display order.
// Explicit spans use two robust end-of-pass markers rather than a pass begin,
// which is unreliable on tiled/mobile GPUs.
export const PASS_SLOTS: readonly GpuPassSlot[] = [
  {
    key: 'merge',
    label: 'Merge (zoom)',
    labelKey: 'performancePanel.passLabel.merge',
    helpKey: 'performancePanel.passHelp.merge',
    timing: 'explicit-span',
  },
  {
    key: 'snapshot',
    label: 'Snapshot (zoom)',
    labelKey: 'performancePanel.passLabel.snapshot',
    helpKey: 'performancePanel.passHelp.snapshot',
    timing: 'explicit-span',
  },
  {
    key: 'reproject',
    label: 'Reprojection (pan)',
    labelKey: 'performancePanel.passLabel.reproject',
    helpKey: 'performancePanel.passHelp.reproject',
    timing: 'end-gap',
  },
  {
    key: 'clear',
    label: 'Clear cache',
    labelKey: 'performancePanel.passLabel.clear',
    helpKey: 'performancePanel.passHelp.clear',
    timing: 'end-gap',
  },
  {
    key: 'reseed',
    label: 'AA reseed',
    labelKey: 'performancePanel.passLabel.reseed',
    helpKey: 'performancePanel.passHelp.reseed',
    timing: 'end-gap',
  },
  {
    key: 'compute',
    label: 'Itération',
    labelKey: 'performancePanel.passLabel.compute',
    helpKey: 'performancePanel.passHelp.compute',
    timing: 'end-gap',
  },
  {
    key: 'resolve',
    label: 'Resolve',
    labelKey: 'performancePanel.passLabel.resolve',
    helpKey: 'performancePanel.passHelp.resolve',
    timing: 'end-gap',
  },
  {
    key: 'aaAccum',
    label: 'Couleur (AA)',
    labelKey: 'performancePanel.passLabel.aaAccum',
    helpKey: 'performancePanel.passHelp.aaAccum',
    timing: 'end-gap',
  },
  {
    key: 'color',
    label: 'Couleur / cache rotation',
    labelKey: 'performancePanel.passLabel.color',
    helpKey: 'performancePanel.passHelp.color',
    timing: 'end-gap',
  },
  {
    key: 'present',
    label: 'Present (AA / rotation)',
    labelKey: 'performancePanel.passLabel.present',
    helpKey: 'performancePanel.passHelp.present',
    timing: 'end-gap',
  },
]

export const PASS_SLOT_INDEX = Object.fromEntries(
  PASS_SLOTS.map((slot, index) => [slot.key, index]),
) as Record<GpuPassKey, number>

export const TS_COUNT = PASS_SLOTS.length * 2

export const selectRawUtilityPassKey = (clearHistory: boolean): 'clear' | 'reproject' =>
  clearHistory ? 'clear' : 'reproject'

export const shouldEncodeTimestampBoundary = (
  timestampsEnabled: boolean,
  hasTimestampQuerySet: boolean,
): boolean => timestampsEnabled && hasTimestampQuerySet

export interface PartitionedGpuPassSample {
  key: GpuPassKey
  durationMs: number
  endTimestamp: bigint
}

export interface PartitionedGpuPassTimings {
  active: Record<string, boolean>
  samples: PartitionedGpuPassSample[]
  spanMs: number
}

const durationMs = (end: bigint, start: bigint): number => {
  const ms = Number(end - start) / 1e6
  return Number.isFinite(ms) && ms >= 0 ? ms : 0
}

/**
 * Partition one timestamp-query readback into semantic pass durations.
 *
 * Ordinary passes use the gap from the previous chronological END marker,
 * avoiding unreliable beginning-of-pass timestamps. Copy-only/compound spans
 * use their explicit pair of END markers. The explicit end then becomes the
 * predecessor of the following ordinary pass, so the copy cost is counted once.
 */
export const partitionGpuPassTimestamps = (
  data: BigInt64Array,
  pendingMask: number,
  slots: readonly GpuPassSlot[] = PASS_SLOTS,
): PartitionedGpuPassTimings => {
  const active: Record<string, boolean> = {}
  const ran: Array<{
    slot: GpuPassSlot
    start: bigint
    end: bigint
  }> = []

  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index]
    const isActive = (pendingMask & (1 << index)) !== 0
    active[slot.key] = isActive
    if (!isActive) continue
    ran.push({
      slot,
      start: data[index * 2],
      end: data[index * 2 + 1],
    })
  }

  ran.sort((a, b) => (a.end < b.end ? -1 : a.end > b.end ? 1 : 0))
  if (ran.length === 0) return {active, samples: [], spanMs: 0}

  const first = ran[0]
  let frameStart = first.start
  if (first.slot.timing === 'end-gap') {
    // Preserve the established tiled-GPU fallback for ordinary first passes:
    // later begin markers may cluster at the true frame start.
    for (const entry of ran) {
      if (entry.slot.timing === 'end-gap' && entry.start < frameStart) frameStart = entry.start
    }
  }

  let previousEnd = frameStart
  const samples: PartitionedGpuPassSample[] = []
  for (const entry of ran) {
    const explicitStart = entry.start > previousEnd ? entry.start : previousEnd
    const start = entry.slot.timing === 'explicit-span' ? explicitStart : previousEnd
    samples.push({
      key: entry.slot.key,
      durationMs: durationMs(entry.end, start),
      endTimestamp: entry.end,
    })
    previousEnd = entry.end
  }

  return {
    active,
    samples,
    spanMs: durationMs(ran[ran.length - 1].end, frameStart),
  }
}
