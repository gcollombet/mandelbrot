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
  help: string
  timing: GpuPassTimingMode
}

// Order defines both timestamp query indices and PerformancePanel display order.
// Explicit spans use two robust end-of-pass markers rather than a pass begin,
// which is unreliable on tiled/mobile GPUs.
export const PASS_SLOTS: readonly GpuPassSlot[] = [
  {
    key: 'merge',
    label: 'Merge (zoom)',
    help: 'Copies de préparation puis fusion résolu+figé en fin de zoom. Ne tourne qu\'à l\'arrêt d\'un zoom.',
    timing: 'explicit-span',
  },
  {
    key: 'snapshot',
    label: 'Snapshot (zoom)',
    help: 'Copie du display résolu vers le snapshot figé utilisé pendant le zoom.',
    timing: 'explicit-span',
  },
  {
    key: 'reproject',
    label: 'Reprojection (pan)',
    help: 'Décalage entier du cache brut lors d\'un pan afin de réutiliser le calcul.',
    timing: 'end-gap',
  },
  {
    key: 'clear',
    label: 'Clear cache',
    help: 'Réinitialisation du cache brut par sentinelles, distincte du déplacement de pan.',
    timing: 'end-gap',
  },
  {
    key: 'reseed',
    label: 'AA reseed',
    help: 'Ré-amorçage sélectif de la frontière pour un échantillon d\'anti-aliasing. Actif seulement en accumulation AA.',
    timing: 'end-gap',
  },
  {
    key: 'compute',
    label: 'Itération',
    help: 'Kernel fusionné brush+mandelbrot+comptage (perturbation/BLA/jet…). C\'est le cœur du coût.',
    timing: 'end-gap',
  },
  {
    key: 'resolve',
    label: 'Resolve',
    help: 'Présentation bilinéaire temporaire des pixels exacts encore incomplets.',
    timing: 'end-gap',
  },
  {
    key: 'aaAccum',
    label: 'Couleur (AA)',
    help: 'Passe couleur accumulée dans le buffer AA (linéaire) pendant l\'accumulation.',
    timing: 'end-gap',
  },
  {
    key: 'color',
    label: 'Couleur',
    help: 'Passe couleur directe : palette, relief, skybox, iridescence → écran.',
    timing: 'end-gap',
  },
  {
    key: 'present',
    label: 'Present (AA)',
    help: 'Division de l\'accumulateur AA par le nombre d\'échantillons + sRGB → écran.',
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
