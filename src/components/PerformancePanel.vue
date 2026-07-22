<script setup lang="ts">
/**
 * PerformancePanel — GPU performance measurement panel.
 *
 * Representation choices (to maximize interpretability):
 *  - A horizontal STACKED BAR scaled to the frame budget: shows both the
 *    composition of GPU work (part-to-whole, at a glance) AND how much of the
 *    frame the GPU actually occupies (the faint remainder is headroom).
 *  - A SPARKLINE of the GPU-sum over time: reveals stability vs jank/spikes
 *    that a single smoothed number hides.
 *  - A LEGEND TABLE with exact ms + % per pass and an explanatory tooltip.
 *
 * Data source: polls plain fields on the Engine (same pattern as RenderStats).
 * Per-pass timing needs the optional WebGPU `timestamp-query` feature; when it
 * is unavailable (common on mobile), the panel degrades to global metrics and
 * explains the amplification fallback for measuring a single pass.
 */
import { onMounted, onUnmounted, reactive, ref, computed } from 'vue';
import { formatPeriodicHeaderStatus } from '../periodicHeaderStatus';

const props = withDefaults(defineProps<{ engine: any; isAdmin?: boolean }>(), {isAdmin: false});
const emit = defineEmits<{ (e: 'close'): void }>();

const debugShading = defineModel<boolean>('debugShading', { default: false });

// Fixed per-pass colors (indexed by engine PASS_SLOTS order).
const PASS_COLORS = ['#8b5cf6', '#38bdf8', '#f472b6', '#f59e0b', '#34d399', '#22d3ee', '#eab308', '#a78bfa'];

interface PassRow { key: string; label: string; help: string; ms: number; active: boolean; color: string }

const stats = reactive({
  timestampCapable: false,
  fps: 0,
  frameIntervalMs: 0,
  cpuRenderMs: 0,
  gpuSubmitMs: 0, // engine.gpuFrameTimeMs (CPU-measured submit→done wall)
  gpuSpanMs: 0,   // authoritative GPU frame time (max end − min begin)
  gpuSumMs: 0,    // Σ of measured passes (breakdown; may overlap/exceed span)
  unfinished: -1,
  active: -1,
  totalPixels: 0,
  passes: [] as PassRow[],

  // Render (relocated from RenderStats)
  completionWallMs: 0,
  completionGpuMs: 0,
  completionTotalApps: -1,
  batchSize: 0,

  // Dispatch
  tierApps: [-1, -1, -1, -1] as [number, number, number, number],
  dynamicTierAttempts: [-1, -1, -1, -1] as [number, number, number, number],
  dynamicTierAccepts: [-1, -1, -1, -1] as [number, number, number, number],
  dynamicSkipBuckets: [-1, -1, -1, -1] as [number, number, number, number],
  dynamicCandidateUses: -1,
  dynamicRejectionReasons: [-1, -1, -1, -1, -1, -1, -1, -1] as [number, number, number, number, number, number, number, number],
  dynamicExactFallbacks: -1,
  secoursStats: [-1, -1] as [number, number],
  f32Apps: -1,
  gateStats: [-1, -1] as [number, number],
  renormStats: [-1, -1] as [number, number],
  renormEnabled: false,
  realizedSkip: -1,
  workgroupWaste: -1,
  maxPixelSteps: -1,
  realLoopSteps: -1,
  portfolioEnabled: true,
  // Table (worker's last unified build)
  tableSaN0: -1,
  tablePeriodicP: -1,
  tablePeriodicStatus: 0,
  tablePeriodicDetectedP: -1,
  tableBandLog2: Number.NaN,
  tableBandSpread: Number.NaN,
  tableGateCount: -1,
  lastTableBuildMs: -1,
  lastTableBuildStages: -1,
  lastTableCoefficientsMs: -1,
  lastTableBoundsMs: -1,
  lastTableRadiiMs: -1,
  tableBuildActive: false,
  tableBuildProgress: 0,
  tableBuildStage: 'idle',
  tableBuildKind: '',
  dynamicBlockValidity: true,
  dynamicValidityShadow: false,
  dynamicValidityStatsEnabled: false,
  dynamicValidityReferenceLog2Dc: Number.NaN,
  dynamicValidityCurrentLog2CMax: Number.NaN,
  incrementalReferenceTable: true,
  incrementalTableOrbitCoverage: 0,
  incrementalTableBuiltOrbit: 0,
  incrementalTableLevelBlocks: [] as number[],
  incrementalTableTransferredBytes: 0,
  incrementalTableYields: 0,
  incrementalTableCancellations: 0,
  incrementalTableCapacityGrowths: 0,
  incrementalTablePeakRetainedBytes: 0,
  incrementalTableMergeCoefficientsMs: 0,
  incrementalTableEnvelopeMs: 0,
  shaderApproxFlag: 0,
  shaderBlaLevelCount: 0,
  aaFrontierStamped: -1,
  aaFrontierEligible: -1,
  floatExpActive: false,

  // Reference / orbit build
  orbitCount: 0,
  maxIterations: 0,
  orbitRemaining: 0,
  referenceValidating: false,
  referenceResetActive: false,
  referenceResetSerial: 0,
  pendingRefActive: false,
  pendingRefOrbitLen: 0,
  pendingRefMaxIterations: 0,
});

const shaderModeLabel = computed(() => {
  switch (stats.shaderApproxFlag) {
    case 7: return 'Auto shadow (tags legacy)';
    case 6: return 'Auto dynamique';
    case 5: return 'Auto';
    case 4: return 'Möbius+';
    case 3: return 'Jet';
    case 2: return 'Padé';
    case 1: return 'BLA';
    default: return 'exact';
  }
});

const currentRefPercent = computed(() => {
  const count = stats.orbitCount || 0;
  const max = stats.maxIterations || 0;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (count / max) * 100));
});

const pendingRefPercent = computed(() => {
  const len = stats.pendingRefOrbitLen || 0;
  const max = stats.pendingRefMaxIterations || 0;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (len / max) * 100));
});

const tableBuildPercent = computed(() =>
  Math.round(Math.min(1, Math.max(0, stats.tableBuildProgress || 0)) * 100)
);

const tableBuildLine = computed(() => {
  if (!stats.tableBuildActive) return stats.tableBuildStage === 'ready' ? 'prête' : '';
  const stages: Record<string, string> = {
    coefficients: 'coefficients',
    bounds: 'bornes',
    radii: 'rayons',
    transfer: 'transfert GPU',
  };
  return `${tableBuildPercent.value} % · ${stages[stats.tableBuildStage] ?? stats.tableBuildStage}`;
});

const tableKindLabel = computed(() => {
  const labels: Record<string, string> = {
    unified: 'Auto',
    mobius: 'Möbius+',
    jet: 'Jet',
    bla: 'BLA/Padé',
  };
  return labels[stats.tableBuildKind] ?? 'blocs';
});

const tablePhaseTimingsLine = computed(() => {
  if (stats.lastTableBuildStages < 0 || stats.lastTableBuildMs < 0) return '';
  const phases: string[] = [];
  if ((stats.lastTableBuildStages & 1) !== 0 && stats.lastTableCoefficientsMs >= 0) {
    phases.push(`coeff. ${fmt(stats.lastTableCoefficientsMs)} ms`);
  }
  if ((stats.lastTableBuildStages & 2) !== 0 && stats.lastTableBoundsMs >= 0) {
    phases.push(`bornes ${fmt(stats.lastTableBoundsMs)} ms`);
  }
  if ((stats.lastTableBuildStages & 4) !== 0 && stats.lastTableRadiiMs >= 0) {
    phases.push(`rayons ${fmt(stats.lastTableRadiiMs)} ms`);
  }
  return phases.length > 0
    ? `${phases.join(' · ')} · total ${fmt(stats.lastTableBuildMs)} ms`
    : `total ${fmt(stats.lastTableBuildMs)} ms`;
});

function completionPercent(): string {
  if (stats.totalPixels === 0 || stats.unfinished < 0) return '--';
  const pct = ((stats.totalPixels - stats.unfinished) / stats.totalPixels) * 100;
  return pct.toFixed(1);
}

function formatCondensedNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0';
  }
  if (val < 1000) {
    return val.toString();
  }
  let suffix = '';
  let divided = val;
  if (val >= 1e9) {
    suffix = 'G';
    divided = val / 1e9;
  } else if (val >= 1e6) {
    suffix = 'M';
    divided = val / 1e6;
  } else if (val >= 1000) {
    suffix = 'k';
    divided = val / 1000;
  }

  let formatted: string;
  if (divided >= 100) {
    formatted = Math.round(divided).toString();
  } else if (divided >= 10) {
    formatted = divided.toFixed(1);
  } else {
    formatted = divided.toFixed(2);
  }

  if (formatted.includes('.')) {
    while (formatted.endsWith('0')) {
      formatted = formatted.slice(0, -1);
    }
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }
  }

  return formatted.replace('.', ',') + suffix;
}

function formatMemory(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
  if (bytes < 1024) return `${Math.round(bytes)} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Kio`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mio`;
}

function formatPixelCount(n: number): string {
  if (n < 0) return '--';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function formatOps(n: number): string {
  if (n < 0) return '--';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'G';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function formatRefOrbit(count: number, max: number): string {
  const c = count || 0;
  const m = max || 0;
  if (c > m) {
    const formattedM = formatCondensedNumber(m);
    return `${formattedM} / ${formattedM} (+ ${formatCondensedNumber(c - m)})`;
  }
  return `${formatCondensedNumber(c)} / ${formatCondensedNumber(m)}`;
}

// Form mix: live per-form Σ applications. Slot meaning is MODE-dependent
// (mirrors the shader's per-mode counters): auto = the four unified tiers;
// jet = its three applied orders; Möbius/Padé/BLA = their single form.
type TierMeta = { label: string; color: string } | null;
const TIER_META_BY_MODE: Record<number, TierMeta[]> = {
  6: [
    { label: 'Affine (BLA)', color: '#7dd3a8' },
    { label: 'Padé [2/1]', color: '#e0b45c' },
    { label: 'Möbius-c⁺ [2/1]', color: '#6fb7e8' },
    { label: 'Jet ordre 3', color: '#b58ae0' },
  ],
  5: [
    { label: 'Affine (BLA)', color: '#7dd3a8' },
    { label: 'Padé [2/1]', color: '#e0b45c' },
    { label: 'Möbius-c⁺ [2/1]', color: '#6fb7e8' },
    { label: 'Jet ordre 3', color: '#b58ae0' },
  ],
  3: [
    { label: 'Jet ordre 1', color: '#7dd3a8' },
    { label: 'Jet ordre 2', color: '#e0b45c' },
    { label: 'Jet ordre 3', color: '#b58ae0' },
    null,
  ],
  4: [null, null, { label: 'Möbius-c⁺ [2/1]', color: '#6fb7e8' }, null],
  2: [null, { label: 'Padé [1/1]', color: '#e0b45c' }, null, null],
  1: [{ label: 'BLA affine', color: '#7dd3a8' }, null, null, null],
};
const tierTotal = computed(() => {
  const t = stats.tierApps;
  return t[0] < 0 ? -1 : t[0] + t[1] + t[2] + t[3];
});
const tierRows = computed(() => {
  const total = tierTotal.value;
  const meta = TIER_META_BY_MODE[stats.shaderApproxFlag];
  if (total <= 0 || !meta) return [];
  return meta
    .map((m, i) => (m ? { ...m, count: stats.tierApps[i], pct: (100 * stats.tierApps[i]) / total } : null))
    .filter((r): r is NonNullable<typeof r> => r !== null && r.count > 0);
});
const dynamicTierRows = computed(() => {
  if (stats.shaderApproxFlag !== 6 || stats.dynamicTierAttempts[0] < 0) return [];
  const meta = TIER_META_BY_MODE[6];
  return meta.map((m, i) => ({
    label: m!.label,
    color: m!.color,
    attempts: stats.dynamicTierAttempts[i],
    accepts: stats.dynamicTierAccepts[i],
    rate: stats.dynamicTierAttempts[i] > 0
      ? 100 * stats.dynamicTierAccepts[i] / stats.dynamicTierAttempts[i]
      : 0,
  }));
});
const dynamicAcceptedTotal = computed(() =>
  stats.dynamicTierAccepts[0] < 0 ? -1 : stats.dynamicTierAccepts.reduce((sum, value) => sum + value, 0)
);
const dynamicSkipTotal = computed(() =>
  stats.dynamicSkipBuckets[0] < 0 ? -1 : stats.dynamicSkipBuckets.reduce((sum, value) => sum + value, 0)
);
const DYNAMIC_REJECTION_LABELS = [
  'valeur (diagnostic)',
  'dérivée (diagnostic)',
  'pure-c (diagnostic)',
  'référence (diagnostic)',
  'Cauchy',
  'pôle (diagnostic)',
  'preuve compacte · cause non lue',
  'préfiltre agrégé',
];
const dynamicRejectionRows = computed(() => stats.dynamicRejectionReasons
  .map((count, index) => ({ label: DYNAMIC_REJECTION_LABELS[index], count }))
  .filter(row => row.count > 0));
const dynamicDomainMarginOctaves = computed(() => {
  const domain = stats.dynamicValidityReferenceLog2Dc;
  const cmax = stats.dynamicValidityCurrentLog2CMax;
  return Number.isFinite(domain) && Number.isFinite(cmax) ? domain - cmax : Number.NaN;
});
const dynamicDomainOutOfRange = computed(() =>
  Number.isFinite(dynamicDomainMarginOctaves.value) && dynamicDomainMarginOctaves.value < 0
);
function formatLog2Extent(value: number): string {
  return Number.isFinite(value) ? `2^${value.toFixed(1)}` : '—';
}
function dynamicDomainStatusLine(): string {
  const margin = dynamicDomainMarginOctaves.value;
  if (!Number.isFinite(margin)) return '';
  return margin < 0
    ? `HORS DOMAINE · dépassement ${(-margin).toFixed(1)} oct`
    : `OK · marge ${margin.toFixed(1)} oct`;
}
// Secours (portfolio): fallback applications + iterations they covered.
function secoursLine(): string {
  const [apps, iters] = stats.secoursStats;
  const total = tierTotal.value;
  if (apps < 0 || total <= 0) return '';
  return `${formatOps(apps)} (${((100 * apps) / total).toFixed(0)}%) · ${formatOps(iters)} iters`;
}
// Renormalized Feigenbaum tier: block applications + iterations they covered,
// with the mean jump per block (2^n averaged). The A/B measurement.
function renormLine(): string {
  const [apps, iters] = stats.renormStats;
  if (apps < 0) return '';
  if (apps === 0) return '0 (aucun saut qualifié)';
  return `${formatOps(apps)} sauts · ${formatOps(iters)} iters · ×${(iters / apps).toFixed(0)}/saut`;
}
function setRenorm(on: boolean) {
  const e = props.engine;
  if (e) e.renormEnabled = on;
  stats.renormEnabled = on;
}

function setDynamicValidity(on: boolean) {
  props.engine?.setDynamicBlockValidity(on);
}

function setDynamicShadow(on: boolean) {
  props.engine?.setDynamicValidityShadow(on);
}

function setDynamicStats(on: boolean) {
  props.engine?.setDynamicValidityStatsEnabled(on);
}

function setIncrementalTable(on: boolean) {
  props.engine?.setIncrementalReferenceTable(on);
}
// Plain-f32 fast-path share of the applications (the rest ran in floatexp).
function f32Line(): string {
  const total = tierTotal.value;
  if (stats.f32Apps < 0 || total <= 0) return '';
  return `${((100 * stats.f32Apps) / total).toFixed(0)}% f32 · ${(100 - (100 * stats.f32Apps) / total).toFixed(0)}% fe`;
}
// Whole-render skip metrics: iterations covered per real loop turn, loop
// turns per pixel, iterations covered per pixel.
function turnsPerPixel(): number {
  if (stats.realLoopSteps < 0 || stats.totalPixels <= 0) return -1;
  return stats.realLoopSteps / stats.totalPixels;
}
function itersPerPixel(): number {
  const t = turnsPerPixel();
  if (t < 0 || stats.realizedSkip < 0) return -1;
  return t * stats.realizedSkip;
}
// §18 gates: jumps landed / degraded attempts (+ emitted count when armed).
function gatesLine(): string {
  const [j, f] = stats.gateStats;
  if (j < 0) return '';
  if (stats.tableGateCount === 0 && j === 0 && f === 0) return 'dormantes';
  const emitted = stats.tableGateCount > 0 ? ` · ${stats.tableGateCount} émises` : '';
  return `${formatOps(j)} sauts Ψ · ${formatOps(f)} échecs${emitted}`;
}
// Replay-observed |dz| band the dispatch tags were chosen at.
function bandLine(): string {
  if (!Number.isFinite(stats.tableBandLog2)) return '';
  return `2^${stats.tableBandLog2.toFixed(1)} ± ${stats.tableBandSpread.toFixed(1)} oct`;
}

// Rust periodic diagnostic: keep "pending" distinct from a completed dormant
// decision so centering/rebuilding never leaves a misleading stale label.
function periodicHeaderLine(): string {
  return formatPeriodicHeaderStatus(
    stats.tablePeriodicStatus,
    stats.tablePeriodicP,
    stats.tablePeriodicDetectedP,
  );
}

// Analytic AA frontier: re-iterated texels / boundary-band texels at the last
// reseed — margin-passing texels expand their Taylor payload instead.
function aaFrontier(): string {
  const s = stats.aaFrontierStamped;
  const e = stats.aaFrontierEligible;
  if (s < 0 || e <= 0) return '';
  return `${(100 * s / e).toFixed(1)}% (${s}/${e})`;
}

// Total apps ÷ GPU ms of the same completed render (applications per GPU
// millisecond). -1 until both are known.
function appsPerGpuMs(): number {
  if (stats.completionTotalApps < 0 || stats.completionGpuMs <= 0) return -1;
  return stats.completionTotalApps / stats.completionGpuMs;
}

function opsPerFrame(): number {
  if (stats.active < 0 || stats.batchSize <= 0) return -1;
  return stats.active * stats.batchSize;
}

interface Sample {
  t: number; fps: number; frameMs: number;
  gpuSpanMs: number; gpuSumMs: number; gpuSubmitMs: number; cpuMs: number;
  passMs: Record<string, number>;
}

const HISTORY_MS = 30_000;   // rolling 30-second window (of RENDERED frames)
const history = ref<Sample[]>([]);
const startedAt = Date.now();

let rafId = 0;
let lastSerial = -1;
let lastLiveMs = 0;

// Refresh the live card values from the engine (cheap scalar reads).
function readLive(e: any) {
  stats.timestampCapable = !!e.timestampCapable;
  stats.fps = e.fps ?? 0;
  stats.frameIntervalMs = e.frameIntervalMs ?? 0;
  stats.cpuRenderMs = e.cpuRenderMs ?? 0;
  stats.gpuSubmitMs = e.isRendering ? (e.gpuFrameTimeMs ?? 0) : 0;
  stats.gpuSpanMs = e.passGpuSpanMs ?? 0;
  stats.gpuSumMs = e.passGpuSumMs ?? 0;
  stats.unfinished = e.unfinishedPixelCount ?? -1;
  stats.active = e.activePixelCount ?? -1;
  const ns = e.neutralSize ?? 0;
  stats.totalPixels = ns * ns;
  const meta: { key: string; label: string; help: string }[] = e.passMeta ?? [];
  const t: Record<string, number> = e.passTimingsMs ?? {};
  const a: Record<string, boolean> = e.passActive ?? {};
  stats.passes = meta.map((m, i) => ({
    key: m.key, label: m.label, help: m.help,
    ms: t[m.key] ?? 0, active: !!a[m.key],
    color: PASS_COLORS[i % PASS_COLORS.length],
  }));

  // Render
  stats.completionWallMs = e.lastCompletionWallMs ?? 0;
  stats.completionGpuMs = e.lastCompletionGpuMs ?? 0;
  stats.completionTotalApps = e.lastCompletionTotalApps ?? -1;
  stats.batchSize = typeof e.getIterationBatchSize === 'function' ? e.getIterationBatchSize() : 0;

  // Dispatch
  stats.tierApps = e.tierAppsApprox ?? [-1, -1, -1, -1];
  stats.dynamicTierAttempts = e.dynamicTierAttemptsApprox ?? [-1, -1, -1, -1];
  stats.dynamicTierAccepts = e.dynamicTierAcceptsApprox ?? [-1, -1, -1, -1];
  stats.dynamicSkipBuckets = e.dynamicSkipBucketsApprox ?? [-1, -1, -1, -1];
  stats.dynamicCandidateUses = e.dynamicCandidateUsesApprox ?? -1;
  stats.dynamicRejectionReasons = e.dynamicRejectionReasonsApprox ?? [-1, -1, -1, -1, -1, -1, -1, -1];
  stats.dynamicExactFallbacks = e.dynamicExactFallbacksApprox ?? -1;
  stats.secoursStats = e.secoursStatsApprox ?? [-1, -1];
  stats.f32Apps = e.f32AppsApprox ?? -1;
  stats.gateStats = e.gateStatsApprox ?? [-1, -1];
  stats.renormStats = e.renormStatsApprox ?? [-1, -1];
  stats.renormEnabled = e.renormEnabled ?? false;
  stats.realizedSkip = e.realizedSkip ?? -1;
  stats.workgroupWaste = e.workgroupWaste ?? -1;
  stats.maxPixelSteps = e.maxPixelSteps ?? -1;
  stats.realLoopSteps = e.realLoopStepsApprox ?? -1;
  stats.portfolioEnabled = e.portfolioEnabled ?? true;
  stats.tableSaN0 = e.tableSaN0 ?? -1;
  stats.tablePeriodicP = e.tablePeriodicP ?? -1;
  stats.tablePeriodicStatus = e.tablePeriodicStatus ?? 0;
  stats.tablePeriodicDetectedP = e.tablePeriodicDetectedP ?? -1;
  stats.tableBandLog2 = e.tableBandLog2 ?? Number.NaN;
  stats.tableBandSpread = e.tableBandSpread ?? Number.NaN;
  stats.tableGateCount = e.tableGateCount ?? -1;
  stats.lastTableBuildMs = e.lastTableBuildMs ?? -1;
  stats.lastTableBuildStages = e.lastTableBuildStages ?? -1;
  stats.lastTableCoefficientsMs = e.lastTableCoefficientsMs ?? -1;
  stats.lastTableBoundsMs = e.lastTableBoundsMs ?? -1;
  stats.lastTableRadiiMs = e.lastTableRadiiMs ?? -1;
  stats.tableBuildActive = e.tableBuildActive ?? false;
  stats.tableBuildProgress = e.tableBuildProgress ?? 0;
  stats.tableBuildStage = e.tableBuildStage ?? 'idle';
  stats.tableBuildKind = e.tableBuildKind ?? '';
  stats.dynamicBlockValidity = e.dynamicBlockValidity ?? false;
  stats.dynamicValidityShadow = e.getDynamicValidityShadow?.() ?? false;
  stats.dynamicValidityStatsEnabled = e.getDynamicValidityStatsEnabled?.() ?? false;
  stats.dynamicValidityReferenceLog2Dc = e.dynamicValidityReferenceLog2Dc ?? Number.NaN;
  stats.dynamicValidityCurrentLog2CMax = e.dynamicValidityCurrentLog2CMax ?? Number.NaN;
  stats.incrementalReferenceTable = e.getIncrementalReferenceTable?.() ?? false;
  stats.incrementalTableOrbitCoverage = e.incrementalTableOrbitCoverage ?? 0;
  stats.incrementalTableBuiltOrbit = e.incrementalTableBuiltOrbit ?? 0;
  stats.incrementalTableLevelBlocks = e.incrementalTableLevelBlocks ?? [];
  stats.incrementalTableTransferredBytes = e.incrementalTableTransferredBytes ?? 0;
  stats.incrementalTableYields = e.incrementalTableYields ?? 0;
  stats.incrementalTableCancellations = e.incrementalTableCancellations ?? 0;
  stats.incrementalTableCapacityGrowths = e.incrementalTableCapacityGrowths ?? 0;
  stats.incrementalTablePeakRetainedBytes = e.incrementalTablePeakRetainedBytes ?? 0;
  stats.incrementalTableMergeCoefficientsMs = e.incrementalTableMergeCoefficientsMs ?? 0;
  stats.incrementalTableEnvelopeMs = e.incrementalTableEnvelopeMs ?? 0;
  stats.shaderApproxFlag = e.lastShaderApproxFlag ?? 0;
  stats.shaderBlaLevelCount = e.lastShaderBlaLevelCount ?? 0;
  stats.aaFrontierStamped = e.aaFrontierStamped ?? -1;
  stats.aaFrontierEligible = e.aaFrontierEligible ?? -1;
  stats.floatExpActive = e.floatExpActive ?? false;

  // Reference / orbit build
  stats.orbitCount = e.currentReferenceAvailableIter ?? e.currentGuardedMaxIter ?? 0;
  stats.maxIterations = e.currentMaxIterations ?? 0;
  stats.orbitRemaining = e.currentReferenceRemainingIter ?? Math.max(0, stats.maxIterations - stats.orbitCount);
  stats.referenceValidating = e.isReferenceValidating ?? false;
  stats.referenceResetSerial = e.referenceResetSerial ?? 0;
  stats.referenceResetActive = (e.referenceResetFlashUntil ?? 0) > performance.now();
  stats.pendingRefActive = e.pendingRefActive ?? false;
  stats.pendingRefOrbitLen = e.pendingRefOrbitLen ?? 0;
  stats.pendingRefMaxIterations = e.pendingRefMaxIterations ?? 0;
}

// One measurement per rendered frame. Trimmed relative to the NEWEST sample, so
// the window freezes when rendering stops (no ageing-out to empty at 0 fps).
function pushSample() {
  const t = Date.now() - startedAt;
  const passMs: Record<string, number> = {};
  for (const p of stats.passes) passMs[p.key] = p.active ? p.ms : 0;
  const h = history.value;
  h.push({
    t, fps: stats.fps, frameMs: stats.frameIntervalMs,
    gpuSpanMs: stats.gpuSpanMs, gpuSumMs: stats.gpuSumMs, gpuSubmitMs: stats.gpuSubmitMs, cpuMs: stats.cpuRenderMs,
    passMs,
  });
  const cutoff = t - HISTORY_MS;
  while (h.length > 1 && h[0].t < cutoff) h.shift();
  history.value = h.slice();
}

// Frame-driven sampling: poll at display rate but only record when the engine's
// frameSerial advanced (a real frame was submitted). When idle, the serial stops
// → no new samples → the histogram freezes. Cards still refresh (fps decays to 0).
function tick() {
  const e = props.engine;
  if (e) {
    const serial = e.frameSerial ?? 0;
    const now = performance.now();
    if (serial !== lastSerial) {
      lastSerial = serial;
      readLive(e);
      pushSample();
      lastLiveMs = now;
    } else if (now - lastLiveMs > 250) {
      readLive(e);
      lastLiveMs = now;
    }
  }
  rafId = requestAnimationFrame(tick);
}

onMounted(() => { rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId); });

// Aggregate stats over the visible window.
const windowStats = computed(() => {
  const g = history.value.map(s => s.gpuSumMs).filter(v => v > 0);
  if (!g.length) return { avg: 0, max: 0, span: 0 };
  return {
    avg: g.reduce((a, b) => a + b, 0) / g.length,
    max: Math.max(...g),
    span: history.value.length ? (history.value[history.value.length - 1].t - history.value[0].t) / 1000 : 0,
  };
});

// ── 30 s averages (for the duplicated "moyenne" breakdown) ──
// Per-pass mean over the window, counting 0 for frames the pass didn't run →
// the AMORTIZED composition (occasional passes like merge show their true share).
const passAvg = computed<Record<string, number>>(() => {
  const h = history.value;
  const acc: Record<string, number> = {};
  if (!h.length) return acc;
  for (const s of h) for (const k in s.passMs) acc[k] = (acc[k] ?? 0) + s.passMs[k];
  for (const k in acc) acc[k] /= h.length;
  return acc;
});
const avgFrameMs = computed(() => {
  const g = history.value.map(s => s.frameMs).filter(v => v > 0);
  return g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0;
});
const passesAvgSorted = computed(() =>
  stats.passes
    .map(p => ({ ...p, ms: passAvg.value[p.key] ?? 0 }))
    .filter(p => p.ms > 0.0001)
    .sort((x, y) => y.ms - x.ms),
);
const passSumAvg = computed(() => passesAvgSorted.value.reduce((s, p) => s + p.ms, 0));
const barMaxAvg = computed(() => Math.max(avgFrameMs.value, passSumAvg.value, 0.001));
const idleMsAvg = computed(() => Math.max(0, barMaxAvg.value - passSumAvg.value));
function pctAvg(ms: number): number { return (ms / barMaxAvg.value) * 100; }

// Main history graph = per-pass times STACKED over the frame history (area
// chart). Each band's top edge is the running cumulative including that pass;
// the total (stack height) is the frame's GPU cost. y is normalized to the
// window's peak total.
const STACK_W = 100, STACK_H = 64;
const stackedAreas = computed(() => {
  const h = history.value;
  const passes = stats.passes;
  if (h.length < 2 || !passes.length) return { bands: [] as { key: string; color: string; path: string }[], maxTotal: 0 };
  const keys = passes.map(p => p.key);
  let maxTotal = 0.001;
  for (const s of h) {
    let tot = 0;
    for (const k of keys) tot += s.passMs[k] ?? 0;
    if (tot > maxTotal) maxTotal = tot;
  }
  const n = h.length;
  const x = (i: number) => (i / (n - 1)) * STACK_W;
  const y = (v: number) => STACK_H - (v / maxTotal) * STACK_H;
  const bands = passes.map((p, ki) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i < n; i++) {
      let below = 0;
      for (let j = 0; j < ki; j++) below += h[i].passMs[keys[j]] ?? 0;
      const cur = h[i].passMs[p.key] ?? 0;
      top.push(`${x(i).toFixed(1)},${y(below + cur).toFixed(1)}`);
      bottom.push(`${x(i).toFixed(1)},${y(below).toFixed(1)}`);
    }
    bottom.reverse();
    return { key: p.key, color: p.color, path: `M${top.join(' L')} L${bottom.join(' L')} Z` };
  });
  return { bands, maxTotal };
});

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function exportCsv() {
  const keys = stats.passes.map(p => p.key);
  const head = ['t_ms', 'fps', 'frame_ms', 'gpu_span_ms', 'gpu_sum_ms', 'gpu_submit_ms', 'cpu_ms', ...keys.map(k => `${k}_ms`)];
  const lines = [head.join(',')];
  for (const s of history.value) {
    const row = [
      s.t.toFixed(0), s.fps, s.frameMs.toFixed(3),
      s.gpuSpanMs.toFixed(3), s.gpuSumMs.toFixed(3), s.gpuSubmitMs.toFixed(3), s.cpuMs.toFixed(3),
      ...keys.map(k => (s.passMs[k] ?? 0).toFixed(3)),
    ];
    lines.push(row.join(','));
  }
  download(`mandelbrot-perf-${stamp()}.csv`, 'text/csv', lines.join('\n'));
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    windowSeconds: HISTORY_MS / 1000,
    timestampCapable: stats.timestampCapable,
    passes: stats.passes.map(p => ({ key: p.key, label: p.label })),
    samples: history.value,
  };
  download(`mandelbrot-perf-${stamp()}.json`, 'application/json', JSON.stringify(payload, null, 2));
}

// Passes that actually ran in the last measured frame, largest first.
const shownPasses = computed(() =>
  stats.passes.filter(p => p.active && p.ms > 0).sort((x, y) => y.ms - x.ms),
);
const passSum = computed(() => shownPasses.value.reduce((s, p) => s + p.ms, 0));

// Bar is scaled to the frame budget (interval), so the remainder = idle/other
// headroom. Falls back to the GPU sum when no interval is available yet.
const barMax = computed(() => Math.max(stats.frameIntervalMs, passSum.value, stats.gpuSumMs, 0.001));
const idleMs = computed(() => Math.max(0, barMax.value - passSum.value));

function pct(ms: number): number { return (ms / barMax.value) * 100; }
function share(ms: number): number { return passSum.value > 0 ? (ms / passSum.value) * 100 : 0; }
function fmt(ms: number): string { return ms >= 10 ? ms.toFixed(1) : ms.toFixed(2); }

</script>

<template>
  <div class="perf-panel">
    <div class="perf-header">
      <span class="perf-title">Mesures GPU</span>
      <button class="perf-close" type="button" aria-label="Fermer" @click="emit('close')">✕</button>
    </div>

    <!-- Global metric cards: FPS emphasized, the other three compact plain values -->
    <div class="perf-cards">
      <div class="perf-card hero" title="Images par seconde effectivement rendues (dérivé de l'intervalle réel entre frames rendues).">
        <div class="pc-val pc-val--hero">{{ stats.fps }}</div>
        <div class="pc-lbl">FPS</div>
      </div>
      <div class="perf-card compact" title="Temps réel entre deux frames = le vrai budget par image. C'est ce que ressent l'utilisateur.">
        <div class="pc-val">{{ fmt(stats.frameIntervalMs) }}<span class="pc-u">ms</span></div>
        <div class="pc-lbl">Frame</div>
      </div>
      <div class="perf-card compact" title="Temps GPU RÉEL de la frame = dernier end − premier begin des passes (timeline GPU). C'est le total autoritaire : les passes tournent séquentiellement, donc ce span les englobe (copies inter-passes comprises).">
        <div class="pc-val">{{ fmt(stats.gpuSpanMs) }}<span class="pc-u">ms</span></div>
        <div class="pc-lbl">GPU span</div>
      </div>
      <div class="perf-card compact" title="Σ des durées par passe, mesurées comme l'écart entre fins de passe consécutives (partition de la timeline GPU). Sum ≈ span par construction. Toute copie/clear inter-passe tombe dans la passe suivante.">
        <div class="pc-val">{{ fmt(stats.gpuSumMs) }}<span class="pc-u">ms</span></div>
        <div class="pc-lbl">Σ passes</div>
      </div>
    </div>

    <!-- Per-pass breakdown (needs timestamp-query) -->
    <template v-if="stats.timestampCapable">
      <div class="perf-sub">Répartition GPU — instantané <span class="perf-hint">(à l'échelle du budget frame — gris = marge/idle)</span></div>
      <div class="perf-bar" role="img" aria-label="Répartition instantanée du temps GPU par passe">
        <div
          v-for="p in shownPasses"
          :key="p.key"
          class="perf-seg"
          :style="{ width: pct(p.ms) + '%', background: p.color }"
          :title="`${p.label} — ${fmt(p.ms)} ms (${share(p.ms).toFixed(0)}% du GPU)`"
        ></div>
        <div v-if="idleMs > 0" class="perf-seg idle" :style="{ width: pct(idleMs) + '%' }"
             :title="`Marge / idle — ${fmt(idleMs)} ms`"></div>
      </div>
      <div class="perf-scale"><span>0</span><span>{{ fmt(barMax) }} ms</span></div>

      <div class="perf-sub">Répartition GPU — moyenne 30 s <span class="perf-hint">(coût amorti par passe)</span></div>
      <div class="perf-bar" role="img" aria-label="Répartition moyenne 30 s du temps GPU par passe">
        <div
          v-for="p in passesAvgSorted"
          :key="'avg-' + p.key"
          class="perf-seg"
          :style="{ width: pctAvg(p.ms) + '%', background: p.color }"
          :title="`${p.label} — ${fmt(p.ms)} ms (moy 30 s)`"
        ></div>
        <div v-if="idleMsAvg > 0" class="perf-seg idle" :style="{ width: pctAvg(idleMsAvg) + '%' }"
             :title="`Marge / idle — ${fmt(idleMsAvg)} ms`"></div>
      </div>
      <div class="perf-scale"><span>0</span><span>{{ fmt(barMaxAvg) }} ms</span></div>

      <!-- Legend: exact values, instantané vs moyenne 30 s -->
      <table class="perf-legend">
        <thead>
          <tr><th></th><th></th><th>actuel</th><th>moy 30 s</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in stats.passes" :key="p.key" :class="{ inactive: !p.active }" :title="p.help">
            <td class="pl-sw"><span :style="{ background: p.color }"></span></td>
            <td class="pl-name">{{ p.label }}</td>
            <td class="pl-ms">{{ p.active ? fmt(p.ms) + ' ms' : '—' }}</td>
            <td class="pl-ms">{{ fmt(passAvg[p.key] ?? 0) }} ms</td>
          </tr>
        </tbody>
      </table>

      <!-- Per-pass STACKED history over the 30 s frame window -->
      <div class="perf-sub">
        Historique empilé par passe
        <span class="perf-hint">— pic {{ fmt(stackedAreas.maxTotal) }} ms · {{ windowStats.span.toFixed(0) }} s</span>
      </div>
      <svg class="perf-stack" viewBox="0 0 100 64" preserveAspectRatio="none">
        <path
          v-for="b in stackedAreas.bands"
          :key="b.key"
          :d="b.path"
          :fill="b.color"
          fill-opacity="0.82"
        />
      </svg>
    </template>

    <!-- Degraded mode: timestamp-query unavailable -->
    <div v-else class="perf-notice">
      <strong>Timing par passe indisponible</strong> — cet appareil n'expose pas
      <code>timestamp-query</code> (fréquent sur mobile/Safari). Les métriques globales
      ci-dessus restent valides. Pour isoler le coût d'une passe sans barrière,
      utilise l'<em>amplification</em> : boucler la passe N fois et diviser le delta
      du temps GPU par N.
    </div>

    <!-- Render: completion, timing, applications, pixel counts -->
    <div class="perf-sub">Rendu</div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Completion</span>
      <span class="perf-stat-value">{{ completionPercent() }}%</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Last render</span>
      <span class="perf-stat-value">{{ stats.completionWallMs.toFixed(0) }}ms · gpu {{ stats.completionGpuMs.toFixed(0) }}ms</span>
    </div>
    <div v-if="stats.completionTotalApps >= 0" class="perf-stat-row">
      <span class="perf-stat-label">Total apps</span>
      <span class="perf-stat-value">{{ formatOps(stats.completionTotalApps) }}</span>
    </div>
    <div v-if="appsPerGpuMs() >= 0" class="perf-stat-row">
      <span class="perf-stat-label">Apps / gpu ms</span>
      <span class="perf-stat-value">{{ formatOps(appsPerGpuMs()) }}</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Ops/frame</span>
      <span class="perf-stat-value">{{ formatOps(opsPerFrame()) }}</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Pixels restants</span>
      <span class="perf-stat-value">{{ formatPixelCount(stats.unfinished) }}</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Pixels actifs</span>
      <span class="perf-stat-value">{{ formatPixelCount(stats.active) }}</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Total pixels</span>
      <span class="perf-stat-value">{{ formatPixelCount(stats.totalPixels) }}</span>
    </div>

    <!-- Dispatch: which approximation tier/mode is actually feeding the shader -->
    <div class="perf-sub">Dispatch</div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Shader mode</span>
      <span class="perf-stat-value">{{ shaderModeLabel }} · {{ stats.shaderBlaLevelCount }} lvl</span>
    </div>
    <!-- Renormalized Feigenbaum-return tier A/B toggle (only fires deep on the
         cascade near c_∞; enable then navigate a deep cascade view). -->
    <div class="perf-stat-row perf-debug-row">
      <span class="perf-stat-label">Tier renorm (Feigenbaum)</span>
      <div class="perf-debug-switch-wrap">
        <label class="perf-debug-switch">
          <input type="checkbox" :checked="stats.renormEnabled" @change="setRenorm(($event.target as HTMLInputElement).checked)" />
          <span class="perf-debug-switch-slider"></span>
        </label>
      </div>
    </div>
    <template v-if="stats.shaderApproxFlag >= 1">
      <div v-if="stats.realizedSkip > 0" class="perf-stat-row">
        <span class="perf-stat-label">Saut moyen / tour</span>
        <span class="perf-stat-value">×{{ stats.realizedSkip.toFixed(1) }}</span>
      </div>
      <div v-if="turnsPerPixel() >= 0" class="perf-stat-row">
        <span class="perf-stat-label">Par pixel (cumul rendu)</span>
        <span class="perf-stat-value">{{ turnsPerPixel() < 10 ? turnsPerPixel().toFixed(2) : formatOps(Math.round(turnsPerPixel())) }} tours · {{ itersPerPixel() < 1000 ? itersPerPixel().toFixed(1) : formatOps(Math.round(itersPerPixel())) }} iters</span>
      </div>
      <template v-if="stats.shaderApproxFlag >= 6 && Number.isFinite(dynamicDomainMarginOctaves)">
        <div class="perf-stat-row">
          <span class="perf-stat-label">Domaine table / cmax vue</span>
          <span class="perf-stat-value">{{ formatLog2Extent(stats.dynamicValidityReferenceLog2Dc) }} / {{ formatLog2Extent(stats.dynamicValidityCurrentLog2CMax) }}</span>
        </div>
        <div class="perf-stat-row" :class="{ 'perf-stat-row--danger': dynamicDomainOutOfRange }">
          <span class="perf-stat-label">Validité domaine</span>
          <span class="perf-stat-value" :class="{ 'perf-stat-value--danger': dynamicDomainOutOfRange }">{{ dynamicDomainStatusLine() }}</span>
        </div>
      </template>
      <div v-if="tierRows.length" class="perf-stat-row perf-stat-row--progress">
        <div class="perf-progress-header">
          <span class="perf-stat-label">Formes appliquées</span>
          <span class="perf-stat-value">{{ formatOps(tierTotal) }} apps</span>
        </div>
        <div class="perf-tier-bar">
          <div v-for="r in tierRows" :key="r.label" class="perf-tier-seg"
               :style="{ width: Math.max(0.5, r.pct) + '%', background: r.color }"
               :title="`${r.label}: ${r.count} (${r.pct.toFixed(1)}%)`"></div>
        </div>
      </div>
      <div v-for="r in tierRows" :key="'row-' + r.label" class="perf-stat-row">
        <span class="perf-stat-label"><span class="perf-tier-dot" :style="{ background: r.color }"></span>{{ r.label }}</span>
        <span class="perf-stat-value">{{ formatOps(r.count) }} · {{ r.pct.toFixed(1) }}%</span>
      </div>
      <template v-if="stats.shaderApproxFlag === 6 || stats.shaderApproxFlag === 7">
        <div class="perf-stat-row perf-stat-row--progress">
          <div class="perf-progress-header">
            <span class="perf-stat-label">Certificats dynamiques</span>
            <span class="perf-stat-value">acceptés / tentés</span>
          </div>
        </div>
        <div v-for="r in dynamicTierRows" :key="'dynamic-' + r.label" class="perf-stat-row">
          <span class="perf-stat-label"><span class="perf-tier-dot" :style="{ background: r.color }"></span>{{ r.label }}</span>
          <span class="perf-stat-value">{{ formatOps(r.accepts) }} / {{ formatOps(r.attempts) }} · {{ r.rate.toFixed(1) }}%</span>
        </div>
        <div v-if="dynamicSkipTotal >= 0" class="perf-stat-row">
          <span class="perf-stat-label">Distribution des sauts</span>
          <span class="perf-stat-value">&lt;16 {{ formatOps(stats.dynamicSkipBuckets[0]) }} · 16–255 {{ formatOps(stats.dynamicSkipBuckets[1]) }} · 256–4095 {{ formatOps(stats.dynamicSkipBuckets[2]) }} · ≥4096 {{ formatOps(stats.dynamicSkipBuckets[3]) }}</span>
        </div>
        <div v-if="stats.dynamicCandidateUses >= 0" class="perf-stat-row">
          <span class="perf-stat-label">Rung Cauchy limitante</span>
          <span class="perf-stat-value">{{ formatOps(stats.dynamicCandidateUses) }}<template v-if="dynamicAcceptedTotal > 0"> · {{ (100 * stats.dynamicCandidateUses / dynamicAcceptedTotal).toFixed(1) }}%</template></span>
        </div>
        <div v-for="r in dynamicRejectionRows" :key="'reject-' + r.label" class="perf-stat-row">
          <span class="perf-stat-label">Refus · {{ r.label }}</span>
          <span class="perf-stat-value">{{ formatOps(r.count) }}</span>
        </div>
        <div v-if="stats.dynamicExactFallbacks >= 0" class="perf-stat-row">
          <span class="perf-stat-label">Repli perturbation exacte</span>
          <span class="perf-stat-value">{{ formatOps(stats.dynamicExactFallbacks) }} pas</span>
        </div>
      </template>
      <div v-if="stats.shaderApproxFlag === 5 && secoursLine()" class="perf-stat-row">
        <span class="perf-stat-label">Secours {{ stats.portfolioEnabled ? '' : '(OFF)' }}</span>
        <span class="perf-stat-value">{{ secoursLine() }}</span>
      </div>
      <div v-if="f32Line()" class="perf-stat-row">
        <span class="perf-stat-label">Chemin arithmétique</span>
        <span class="perf-stat-value">{{ f32Line() }}</span>
      </div>
      <div v-if="renormLine()" class="perf-stat-row">
        <span class="perf-stat-label">Tier renorm {{ stats.renormEnabled ? '' : '(OFF)' }}</span>
        <span class="perf-stat-value">{{ renormLine() }}</span>
      </div>
      <div v-if="stats.shaderApproxFlag === 5 && stats.tableSaN0 >= 0" class="perf-stat-row">
        <span class="perf-stat-label">SA préfixe commun</span>
        <span class="perf-stat-value">{{ stats.tableSaN0 > 0 ? formatOps(stats.tableSaN0) + ' iters' : '—' }}</span>
      </div>
      <div v-if="stats.shaderApproxFlag === 5 && stats.tablePeriodicStatus >= 0" class="perf-stat-row">
        <span class="perf-stat-label">Header périodique</span>
        <span class="perf-stat-value">{{ periodicHeaderLine() }}</span>
      </div>
      <div v-if="stats.shaderApproxFlag === 5 && gatesLine()" class="perf-stat-row">
        <span class="perf-stat-label">Portes paraboliques</span>
        <span class="perf-stat-value">{{ gatesLine() }}</span>
      </div>
      <div v-if="stats.shaderApproxFlag === 5 && bandLine()" class="perf-stat-row">
        <span class="perf-stat-label">Bande |dz| (replay)</span>
        <span class="perf-stat-value">{{ bandLine() }}</span>
      </div>
      <div v-if="stats.workgroupWaste > 0" class="perf-stat-row">
        <span class="perf-stat-label">Lockstep / straggler</span>
        <span class="perf-stat-value">×{{ stats.workgroupWaste.toFixed(2) }} · {{ formatOps(stats.maxPixelSteps) }} tours max</span>
      </div>
    </template>
    <div v-if="aaFrontier()" class="perf-stat-row">
      <span class="perf-stat-label">AA frontier</span>
      <span class="perf-stat-value">{{ aaFrontier() }}</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Mode de calcul</span>
      <span class="perf-stat-value" :class="{ 'perf-stat-value--floatexp': stats.floatExpActive }">
        {{ stats.floatExpActive ? 'FloatExp' : 'F32' }}
      </span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Batch size</span>
      <span class="perf-stat-value">{{ stats.batchSize }}</span>
    </div>

    <!-- Reference: reference orbit build progress -->
    <div class="perf-sub">Référence</div>
    <div class="perf-stat-row perf-stat-row--progress">
      <div class="perf-progress-header">
        <span class="perf-stat-label">Réf. actuelle</span>
        <span class="perf-stat-value">
          {{ formatRefOrbit(stats.orbitCount, stats.maxIterations) }}
          <span v-if="stats.referenceResetActive"> · reset réf</span>
          <span v-else-if="stats.referenceValidating"> · validation</span>
        </span>
      </div>
      <div class="perf-progress-track">
        <div class="perf-progress-fill" :style="{ width: currentRefPercent + '%' }"></div>
      </div>
    </div>
    <div v-if="stats.pendingRefActive" class="perf-stat-row perf-stat-row--progress">
      <div class="perf-progress-header">
        <span class="perf-stat-label perf-stat-label--pending">Nouv. référence</span>
        <span class="perf-stat-value perf-stat-value--pending">
          {{ formatCondensedNumber(stats.pendingRefOrbitLen) }} / {{ formatCondensedNumber(stats.pendingRefMaxIterations) }}
        </span>
      </div>
      <div class="perf-progress-track">
        <div class="perf-progress-fill perf-progress-fill--pending" :style="{ width: pendingRefPercent + '%' }"></div>
      </div>
    </div>
    <div v-if="stats.tableBuildKind" class="perf-stat-row perf-stat-row--progress">
      <div class="perf-progress-header">
        <span class="perf-stat-label perf-stat-label--table">Table {{ tableKindLabel }}</span>
        <span class="perf-stat-value perf-stat-value--table">{{ tableBuildLine }}</span>
      </div>
      <div class="perf-progress-track">
        <div
          class="perf-progress-fill perf-progress-fill--table"
          :class="{ 'perf-progress-fill--building': stats.tableBuildActive }"
          :style="{ width: tableBuildPercent + '%' }"
        ></div>
      </div>
    </div>
    <div v-if="tablePhaseTimingsLine" class="perf-stat-row">
      <span class="perf-stat-label">Phases table WASM</span>
      <span class="perf-stat-value">{{ tablePhaseTimingsLine }}</span>
    </div>
    <template v-if="stats.incrementalReferenceTable">
      <div class="perf-stat-row">
        <span class="perf-stat-label">Couverture table / construite</span>
        <span class="perf-stat-value">{{ formatCondensedNumber(stats.incrementalTableOrbitCoverage) }} / {{ formatCondensedNumber(stats.incrementalTableBuiltOrbit) }}</span>
      </div>
      <div v-if="stats.incrementalTableLevelBlocks.length" class="perf-stat-row">
        <span class="perf-stat-label">Blocs engagés / niveau</span>
        <span class="perf-stat-value">{{ stats.incrementalTableLevelBlocks.join(' · ') }}</span>
      </div>
      <div class="perf-stat-row">
        <span class="perf-stat-label">Publication incrémentale</span>
        <span class="perf-stat-value">{{ formatMemory(stats.incrementalTableTransferredBytes) }} · {{ stats.incrementalTableYields }} yields · {{ stats.incrementalTableCancellations }} annulations</span>
      </div>
      <div class="perf-stat-row">
        <span class="perf-stat-label">CPU fusion / enveloppes</span>
        <span class="perf-stat-value">{{ stats.incrementalTableMergeCoefficientsMs.toFixed(1) }} ms · {{ stats.incrementalTableEnvelopeMs.toFixed(1) }} ms</span>
      </div>
      <div class="perf-stat-row">
        <span class="perf-stat-label">Mémoire builder / croissance</span>
        <span class="perf-stat-value">{{ formatMemory(stats.incrementalTablePeakRetainedBytes) }} · {{ stats.incrementalTableCapacityGrowths }}×</span>
      </div>
    </template>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Référence</span>
      <span class="perf-stat-value" :class="{ 'perf-stat-value--reference': stats.referenceResetActive }">
        #{{ stats.referenceResetSerial }}
        <span v-if="stats.referenceResetActive"> · changement</span>
      </span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Orbite restante</span>
      <span class="perf-stat-value">{{ stats.orbitRemaining }}</span>
    </div>

    <!-- Debug -->
    <div class="perf-sub">Debug</div>
    <div class="perf-stat-row perf-debug-row">
      <span class="perf-stat-label">Visualisation débug</span>
      <div class="perf-debug-switch-wrap">
        <label class="perf-debug-switch">
          <input type="checkbox" v-model="debugShading" />
          <span class="perf-debug-switch-slider"></span>
        </label>
      </div>
    </div>
    <div class="perf-stat-row perf-debug-row">
      <span class="perf-stat-label">Validité dynamique</span>
      <div class="perf-debug-switch-wrap">
        <label class="perf-debug-switch">
          <input type="checkbox" :checked="stats.dynamicBlockValidity" @change="setDynamicValidity(($event.target as HTMLInputElement).checked)" />
          <span class="perf-debug-switch-slider"></span>
        </label>
      </div>
    </div>
    <div class="perf-stat-row perf-debug-row">
      <span class="perf-stat-label">Shadow (tags legacy)</span>
      <div class="perf-debug-switch-wrap">
        <label class="perf-debug-switch">
          <input type="checkbox" :checked="stats.dynamicValidityShadow" @change="setDynamicShadow(($event.target as HTMLInputElement).checked)" />
          <span class="perf-debug-switch-slider"></span>
        </label>
      </div>
    </div>
    <div class="perf-stat-row perf-debug-row">
      <span class="perf-stat-label">Compteurs validité (coûteux)</span>
      <div class="perf-debug-switch-wrap">
        <label class="perf-debug-switch">
          <input type="checkbox" :checked="stats.dynamicValidityStatsEnabled" @change="setDynamicStats(($event.target as HTMLInputElement).checked)" />
          <span class="perf-debug-switch-slider"></span>
        </label>
      </div>
    </div>
    <div class="perf-stat-row perf-debug-row">
      <span class="perf-stat-label">Table incrémentale</span>
      <div class="perf-debug-switch-wrap">
        <label class="perf-debug-switch">
          <input type="checkbox" :checked="stats.incrementalReferenceTable" @change="setIncrementalTable(($event.target as HTMLInputElement).checked)" />
          <span class="perf-debug-switch-slider"></span>
        </label>
      </div>
    </div>

    <div class="perf-export">
      <span class="pe-count">{{ history.length }} échant. / 30 s</span>
      <button class="pe-btn" type="button" :disabled="history.length < 2" @click="exportCsv">Export CSV</button>
      <button v-if="props.isAdmin" class="pe-btn" type="button" :disabled="history.length < 2" @click="exportJson">JSON</button>
    </div>
  </div>
</template>

<style scoped>
.perf-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-variant-numeric: tabular-nums;
  /* Self-contained dark card so it stays readable on ANY app theme (incl. white). */
  color: #e5e7eb;
  background: rgba(17, 20, 28, 0.92);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
  padding: 12px 13px;
  font-family: ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, monospace;
}
.perf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}
.perf-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.9;
}
.perf-close {
  appearance: none;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.perf-close:hover { background: rgba(255, 255, 255, 0.16); }
.perf-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.perf-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  text-align: center;
}
.perf-card.hero { border-color: rgba(52, 211, 153, 0.5); background: rgba(52, 211, 153, 0.08); flex: 1.2; padding: 7px 6px; }
.perf-card.compact { flex: 1; padding: 7px 4px; min-width: 60px; }
.pc-val { font-size: 17px; font-weight: 650; line-height: 1.1; white-space: nowrap; }
.pc-val--hero { font-size: 26px; }
.perf-card.compact .pc-val { font-size: 13px; }
.pc-u { font-size: 9px; font-weight: 400; opacity: 0.6; margin-left: 1px; }
.pc-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.62; margin-top: 2px; white-space: nowrap; }

.perf-sub { font-size: 11px; font-weight: 600; opacity: 0.85; margin-top: 2px; }
.perf-hint { font-weight: 400; opacity: 0.55; font-size: 10px; }

.perf-bar {
  display: flex;
  width: 100%;
  height: 18px;
  border-radius: 5px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
}
.perf-seg { height: 100%; min-width: 1px; transition: width 0.2s ease; }
.perf-seg.idle { background: repeating-linear-gradient(45deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.02) 4px, rgba(255,255,255,0.02) 8px); }
.perf-scale { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.5; margin-top: -2px; }

.perf-legend { width: 100%; border-collapse: collapse; font-size: 11px; }
.perf-legend thead th { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.45; text-align: right; padding: 0 2px 3px; }
.perf-legend tr { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.perf-legend tr.inactive { opacity: 0.38; }
.perf-legend td { padding: 3px 2px; }
.pl-sw span { display: inline-block; width: 10px; height: 10px; border-radius: 3px; vertical-align: middle; }
.pl-name { width: 100%; }
.pl-ms { text-align: right; white-space: nowrap; opacity: 0.9; }
.pl-pct { text-align: right; white-space: nowrap; opacity: 0.55; width: 34px; }

.perf-stack {
  width: 100%;
  height: 66px;
  display: block;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}

.perf-notice {
  font-size: 11px;
  line-height: 1.5;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
}
.perf-notice code { background: rgba(255, 255, 255, 0.1); padding: 0 3px; border-radius: 3px; }

.perf-export {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 8px;
}
.pe-count { font-size: 10px; opacity: 0.55; margin-right: auto; }
.pe-btn {
  appearance: none;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.12);
  color: #bae6fd;
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.pe-btn:hover:not(:disabled) { background: rgba(56, 189, 248, 0.22); }
.pe-btn:disabled { opacity: 0.4; cursor: default; }

/* --- Tier mix bar (Dispatch) --- */
.perf-tier-bar {
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}
.perf-tier-seg {
  height: 100%;
}
.perf-tier-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: baseline;
}

/* --- Relocated stat rows (Rendu / Dispatch / Référence / Debug) --- */
.perf-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 2.5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
}

.perf-stat-label {
  font-size: 10.5px;
  opacity: 0.6;
}

.perf-stat-label--pending {
  color: #ec3d7a;
  opacity: 1;
}

.perf-stat-label--table,
.perf-stat-value--table {
  color: #f59e0b;
  opacity: 1;
}

.perf-stat-value {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  text-align: right;
}

.perf-stat-value--pending {
  color: #ec3d7a;
  font-weight: 700;
}

.perf-stat-value--reference {
  color: #ec3d7a;
  font-weight: 700;
}

.perf-stat-value--floatexp {
  color: #38bdf8;
  font-weight: 700;
}

.perf-stat-row--danger {
  background: rgba(244, 63, 94, 0.08);
}

.perf-stat-value--danger {
  color: #fb7185;
  font-weight: 700;
}

.perf-stat-row--progress {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2.5px 0;
}

.perf-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
}

.perf-progress-track {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.perf-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #38bdf8, #ec3d7a);
  transition: width 0.15s ease-out;
}

.perf-progress-fill--pending {
  box-shadow: 0 0 4px #ec3d7a;
}

.perf-progress-fill--table {
  background: linear-gradient(90deg, #f59e0b, #facc15);
}

.perf-progress-fill--building {
  box-shadow: 0 0 5px rgba(245, 158, 11, 0.85);
}

.perf-debug-row {
  align-items: center !important;
}

.perf-debug-switch-wrap {
  display: flex;
  align-items: center;
}

.perf-debug-switch {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  cursor: pointer;
}

.perf-debug-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.perf-debug-switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.1);
  transition: .2s;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.perf-debug-switch-slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 2px;
  bottom: 2px;
  background-color: #8a8d9a;
  transition: .2s;
  border-radius: 50%;
}

.perf-debug-switch input:checked + .perf-debug-switch-slider {
  background-color: rgba(236, 61, 122, 0.2);
  border-color: #ec3d7a;
}

.perf-debug-switch input:checked + .perf-debug-switch-slider:before {
  transform: translateX(14px);
  background-color: #ec3d7a;
  box-shadow: 0 0 6px #ec3d7a;
}
</style>
