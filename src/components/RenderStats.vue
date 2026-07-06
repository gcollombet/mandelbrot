<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue';
import {log10FromDecimalString} from '../floatexp';

const props = defineProps<{
  engine: any;
}>();

const debugShading = defineModel<boolean>('debugShading', { default: false });

const expanded = ref(false);

// --- Polled stats (reactive mirrors of Engine plain properties) ---
const fps = ref(0);
const isRendering = ref(false);
const gpuFrameTimeMs = ref(0);
const completionWallMs = ref(0);
const completionGpuMs = ref(0);
const completionTotalApps = ref(-1);
// Tier mix (auto mode): live per-tier Σ applications [affine, Padé, c+, jet].
const tierApps = ref<[number, number, number, number]>([-1, -1, -1, -1]);
function tierMix(): string {
  const t = tierApps.value;
  const total = t[0] + t[1] + t[2] + t[3];
  if (total <= 0) return '';
  const pct = (v: number) => (100 * v / total).toFixed(0) + '%';
  // Affine + Padé share the ≤48 B path (affine is census-dead anyway).
  return `≤48B ${pct(t[0] + t[1])} · c+ ${pct(t[2])} · jet ${pct(t[3])}`;
}
const shaderApproxFlag = ref(0);
const shaderBlaLevelCount = ref(0);
const unfinishedPixels = ref(-1);
const activePixels = ref(-1);
const realizedSkip = ref(-1);
const workgroupWaste = ref(-1);
const maxPixelSteps = ref(-1);
const totalPixels = ref(0);
const batchSize = ref(0);
const orbitCount = ref(0);
const maxIterations = ref(0);
const orbitRemaining = ref(0);
const referenceValidating = ref(false);
const referenceResetActive = ref(false);
const referenceResetSerial = ref(0);

const floatExpActive = ref(false);
const debugShadingActive = ref(false);


const isBuildingRef = ref(false);
const pendingRefActive = ref(false);
const pendingRefOrbitLen = ref(0);
const pendingRefMaxIterations = ref(0);

const currentScaleStr = ref('2.5');

// Deep-safe log10 of a scale string: the navigator emits PLAIN decimal strings,
// which parseFloat underflows to 0 below ~1e-308 (the Z indicator then froze at 0).
function getApproximateLog10(scaleStr: string): number {
  const log = log10FromDecimalString(scaleStr ?? '');
  return Number.isFinite(log) ? log : 0;
}

const zoomPercent = computed(() => {
  const L = getApproximateLog10(currentScaleStr.value || '2.5');
  // map from [3, -300] to [0, 100]
  const pct = ((3 - L) / 303) * 100;
  return Math.min(100, Math.max(0, pct));
});

const zoomMagnitude = computed(() => {
  return Math.round(getApproximateLog10(currentScaleStr.value));
});

const maxIterationsCondensed = computed(() => {
  return formatCondensedNumber(maxIterations.value);
});

const currentRefPercent = computed(() => {
  const count = orbitCount.value || 0;
  const max = maxIterations.value || 0;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (count / max) * 100));
});

const pendingRefPercent = computed(() => {
  const len = pendingRefOrbitLen.value || 0;
  const max = pendingRefMaxIterations.value || 0;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (len / max) * 100));
});

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

function formatRefOrbit(count: number, max: number): string {
  const c = count || 0;
  const m = max || 0;
  if (c > m) {
    const formattedM = formatCondensedNumber(m);
    return `${formattedM} / ${formattedM} (+ ${formatCondensedNumber(c - m)})`;
  }
  return `${formatCondensedNumber(c)} / ${formatCondensedNumber(m)}`;
}


// --- History for the graph ---
const HISTORY_LENGTH = 200;
const unfinishedHistory: number[] = [];
const fpsHistory: number[] = [];
const activePixelsHistory: number[] = [];
const opsHistory: number[] = [];

// --- Canvas ref ---
const graphCanvas = ref<HTMLCanvasElement | null>(null);

// --- Polling ---
let pollTimer: ReturnType<typeof setInterval> | null = null;

function poll() {
  const e = props.engine;
  if (!e) return;
  fps.value = e.fps ?? 0;
  isRendering.value = e.isRendering ?? false;
  gpuFrameTimeMs.value = e.isRendering ? (e.gpuFrameTimeMs ?? 0) : 0;
  completionWallMs.value = e.lastCompletionWallMs ?? 0;
  completionGpuMs.value = e.lastCompletionGpuMs ?? 0;
  completionTotalApps.value = e.lastCompletionTotalApps ?? -1;
  tierApps.value = e.tierAppsApprox ?? [-1, -1, -1, -1];
  shaderApproxFlag.value = e.lastShaderApproxFlag ?? 0;
  shaderBlaLevelCount.value = e.lastShaderBlaLevelCount ?? 0;
  unfinishedPixels.value = e.unfinishedPixelCount ?? -1;
  activePixels.value = e.activePixelCount ?? -1;
  realizedSkip.value = e.realizedSkip ?? -1;
  workgroupWaste.value = e.workgroupWaste ?? -1;
  maxPixelSteps.value = e.maxPixelSteps ?? -1;
  const ns = e.neutralSize ?? 0;
  totalPixels.value = ns * ns;
  batchSize.value = typeof e.getIterationBatchSize === 'function' ? e.getIterationBatchSize() : 0;
  orbitCount.value = e.currentReferenceAvailableIter ?? e.currentGuardedMaxIter ?? 0;
  maxIterations.value = e.currentMaxIterations ?? 0;
  orbitRemaining.value = e.currentReferenceRemainingIter ?? Math.max(0, maxIterations.value - orbitCount.value);
  referenceValidating.value = e.isReferenceValidating ?? false;
  referenceResetSerial.value = e.referenceResetSerial ?? 0;
  referenceResetActive.value = (e.referenceResetFlashUntil ?? 0) > performance.now();
  pendingRefActive.value = e.pendingRefActive ?? false;
  pendingRefOrbitLen.value = e.pendingRefOrbitLen ?? 0;
  pendingRefMaxIterations.value = e.pendingRefMaxIterations ?? 0;
  isBuildingRef.value = pendingRefActive.value || referenceResetActive.value;

  floatExpActive.value = e.floatExpActive ?? false;
  debugShadingActive.value = e.debugShadingActive ?? false;

  if (e.mandelbrotNavigator) {
    const params = e.mandelbrotNavigator.get_params() as [string, string, string, string] | undefined;
    if (params && params.length >= 3) {
      currentScaleStr.value = params[2];
    }
  }



  // Push history
  unfinishedHistory.push(unfinishedPixels.value >= 0 ? unfinishedPixels.value : 0);
  if (unfinishedHistory.length > HISTORY_LENGTH) unfinishedHistory.shift();
  fpsHistory.push(fps.value);
  if (fpsHistory.length > HISTORY_LENGTH) fpsHistory.shift();
  activePixelsHistory.push(activePixels.value >= 0 ? activePixels.value : 0);
  if (activePixelsHistory.length > HISTORY_LENGTH) activePixelsHistory.shift();
  const ops = opsPerFrame();
  opsHistory.push(ops >= 0 ? ops : 0);
  if (opsHistory.length > HISTORY_LENGTH) opsHistory.shift();

  if (expanded.value) {
    drawGraph();
  }
}

onMounted(() => {
  pollTimer = setInterval(poll, 150);
});
onUnmounted(() => {
  if (pollTimer !== null) clearInterval(pollTimer);
});

// Redraw graph when expanding
watch(expanded, async (val) => {
  if (val) {
    await nextTick();
    drawGraph();
  }
});

// --- Computed display helpers ---
function completionPercent(): string {
  if (totalPixels.value === 0 || unfinishedPixels.value < 0) return '--';
  const pct = ((totalPixels.value - unfinishedPixels.value) / totalPixels.value) * 100;
  return pct.toFixed(1);
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

// Total apps ÷ GPU ms of the same completed render (applications per GPU
// millisecond). -1 until both are known.
function appsPerGpuMs(): number {
  if (completionTotalApps.value < 0 || completionGpuMs.value <= 0) return -1;
  return completionTotalApps.value / completionGpuMs.value;
}

function opsPerFrame(): number {
  if (activePixels.value < 0 || batchSize.value <= 0) return -1;
  return activePixels.value * batchSize.value;
}

// --- Canvas graph drawing ---
function drawGraph() {
  const canvas = graphCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 8);
  ctx.fill();

  const graphH = h - 4;
  const graphY = 2;

  // Draw unfinished pixels area (filled)
  if (unfinishedHistory.length > 1) {
    const maxVal = Math.max(...unfinishedHistory, 1);
    ctx.beginPath();
    ctx.moveTo(0, graphY + graphH);
    for (let i = 0; i < unfinishedHistory.length; i++) {
      const x = (i / (HISTORY_LENGTH - 1)) * w;
      const y = graphY + graphH - (unfinishedHistory[i] / maxVal) * graphH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(((unfinishedHistory.length - 1) / (HISTORY_LENGTH - 1)) * w, graphY + graphH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(34,197,94,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(34,197,94,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < unfinishedHistory.length; i++) {
      const x = (i / (HISTORY_LENGTH - 1)) * w;
      const y = graphY + graphH - (unfinishedHistory[i] / maxVal) * graphH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Draw FPS line (orange)
  if (fpsHistory.length > 1) {
    const maxFps = Math.max(...fpsHistory, 1);
    ctx.strokeStyle = 'rgba(255,170,0,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < fpsHistory.length; i++) {
      const x = (i / (HISTORY_LENGTH - 1)) * w;
      const y = graphY + graphH - (fpsHistory[i] / maxFps) * graphH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Draw active pixels line (cyan, dashed)
  if (activePixelsHistory.length > 1) {
    const maxActive = Math.max(...activePixelsHistory, 1);
    ctx.strokeStyle = 'rgba(0,180,220,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i < activePixelsHistory.length; i++) {
      const x = (i / (HISTORY_LENGTH - 1)) * w;
      const y = graphY + graphH - (activePixelsHistory[i] / maxActive) * graphH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw ops/frame line (purple)
  if (opsHistory.length > 1) {
    const maxOps = Math.max(...opsHistory, 1);
    ctx.strokeStyle = 'rgba(180,80,220,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < opsHistory.length; i++) {
      const x = (i / (HISTORY_LENGTH - 1)) * w;
      const y = graphY + graphH - (opsHistory[i] / maxOps) * graphH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function toggle() {
  expanded.value = !expanded.value;
}

defineExpose({ expanded });
</script>

<template>
  <div class="render-stats" :class="{ 'render-stats--expanded': expanded }">
    <!-- Collapsed: dot + fps + click to expand -->
    <button class="stats-header" @click="toggle" :title="expanded ? 'Replier' : 'Statistiques de rendu'">
      <span
        class="status-dot"
        :class="isBuildingRef ? 'status-dot--reference' : (isRendering ? 'status-dot--active' : 'status-dot--idle')"
      ></span>
      <span class="stats-fps">{{ fps }} fps</span>

      <!-- Brief indicators for zoom magnitude and max iterations -->
      <span class="header-badge" title="Magnitude du zoom">
        <span class="header-badge-label">Z</span>
        <span class="header-badge-value">{{ zoomMagnitude }}</span>
      </span>
      <span class="header-badge" title="Itérations maximales">
        <span class="header-badge-label">I</span>
        <span class="header-badge-value">{{ maxIterationsCondensed }}</span>
      </span>

      <span v-if="isBuildingRef" class="stats-reference-badge">ref</span>

      <span class="stats-toggle">{{ expanded ? '\u25B2' : '\u25BC' }}</span>
    </button>

    <!-- Expanded panel -->
    <div v-if="expanded" class="stats-panel">
      <canvas ref="graphCanvas" class="stats-graph"></canvas>
      <div class="stats-legend">
        <span class="legend-item"><span class="legend-swatch legend-swatch--green"></span>Pixels restants</span>
        <span class="legend-item"><span class="legend-swatch legend-swatch--orange"></span>FPS</span>
        <span class="legend-item"><span class="legend-swatch legend-swatch--cyan"></span>Pixels actifs</span>
        <span class="legend-item"><span class="legend-swatch legend-swatch--purple"></span>Ops/frame</span>
      </div>
      <div class="stats-grid">
        <div class="stats-row">
          <span class="stats-label">Completion</span>
          <span class="stats-value">{{ completionPercent() }}%</span>
        </div>

        <!-- Time-to-completion of the last finished render. Switch mode (re-renders
             the view from scratch) and compare: GPU ms isolates the iteration loop
             (what blocks reduce); wall includes reference build + passes. -->
        <div class="stats-row">
          <span class="stats-label">Last render</span>
          <span class="stats-value">{{ completionWallMs.toFixed(0) }}ms · gpu {{ completionGpuMs.toFixed(0) }}ms</span>
        </div>

        <!-- Total applications for the last completed render: the full-generation
             Σ g_workSteps (block skips + exact steps), an ABSOLUTE deterministic
             count frozen at completion. This is the cost metric for A/B mode
             comparison on a view — lower is better; wall-clock is only a sanity
             check. (±~1% workgroup-downscale quantization.) -->
        <div v-if="completionTotalApps >= 0" class="stats-row">
          <span class="stats-label">Total apps</span>
          <span class="stats-value">{{ formatOps(completionTotalApps) }}</span>
        </div>

        <!-- Tier mix (auto dispatch): share of applications per evaluation tier
             — the memory-path census (≤48 B rational, 80 B c+, 108 B jet).
             Same GPU counters as Total apps, live during the render. -->
        <div v-if="shaderApproxFlag === 5 && tierMix()" class="stats-row">
          <span class="stats-label">Tier mix</span>
          <span class="stats-value">{{ tierMix() }}</span>
        </div>

        <!-- GPU throughput: Total apps ÷ GPU compute time of the same render.
             apps_total is deterministic; gpu ms carries the hardware's real
             lane-throughput, so this ratio exposes cost-per-app differences the
             counter alone hides (e.g. jet's ~2×/application floatexp work). -->
        <div v-if="appsPerGpuMs() >= 0" class="stats-row">
          <span class="stats-label">Apps / gpu ms</span>
          <span class="stats-value">{{ formatOps(appsPerGpuMs()) }}</span>
        </div>

        <!-- What the GPU shader actually receives. In Padé mode this MUST read
             "Padé · N lvl" (N>0); if it shows "exact" or "0 lvl", blocks are
             disabled before the GPU. -->
        <div class="stats-row">
          <span class="stats-label">Shader mode</span>
          <span class="stats-value">
            {{ shaderApproxFlag === 5 ? 'Auto' : shaderApproxFlag === 4 ? 'Möbius+' : shaderApproxFlag === 3 ? 'Jet' : shaderApproxFlag === 2 ? 'Padé' : shaderApproxFlag === 1 ? 'BLA' : 'exact' }} · {{ shaderBlaLevelCount }} lvl
          </span>
        </div>

        <!-- Real GPU work (in-place compute path). Realized skip = covered iters
             ÷ real loop steps (≈1 in perturbation; >1 with blocks) — the true
             on-GPU compression; compare its drop vs the wall-time drop to size
             the parallelization margin. WG waste = workgroup lane-time ÷ useful
             work (1 = balanced; high = a few pixels stall the 16×16 tile). -->
        <div v-if="realizedSkip >= 0" class="stats-row">
          <span class="stats-label">Real skip</span>
          <span class="stats-value">×{{ realizedSkip.toFixed(2) }}</span>
        </div>
        <div v-if="workgroupWaste >= 0" class="stats-row">
          <span class="stats-label">WG waste</span>
          <span class="stats-value">×{{ workgroupWaste.toFixed(1) }}</span>
        </div>
        <div v-if="maxPixelSteps >= 0" class="stats-row">
          <span class="stats-label">Max pixel work</span>
          <span class="stats-value">{{ maxPixelSteps.toLocaleString() }} steps</span>
        </div>

        <!-- Zoom progress row -->
        <div class="stats-row stats-row--progress">
          <div class="progress-row-header">
            <span class="stats-label">Zoom</span>
            <span class="stats-value">10<sup>{{ getApproximateLog10(currentScaleStr).toFixed(1) }}</sup></span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill progress-bar-fill--zoom" :style="{ width: zoomPercent + '%' }"></div>
          </div>
        </div>

        <div class="stats-row">
          <span class="stats-label">Pixels restants</span>
          <span class="stats-value">{{ formatPixelCount(unfinishedPixels) }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Pixels actifs</span>
          <span class="stats-value">{{ formatPixelCount(activePixels) }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Total pixels</span>
          <span class="stats-value">{{ formatPixelCount(totalPixels) }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">GPU frame</span>
          <span class="stats-value">{{ gpuFrameTimeMs.toFixed(1) }} ms</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Batch size</span>
          <span class="stats-value">{{ batchSize }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Mode de calcul</span>
          <span class="stats-value" :class="{ 'stats-value--floatexp': floatExpActive }">
            {{ floatExpActive ? 'FloatExp' : 'F32' }}
          </span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Itérations max</span>
          <span class="stats-value">{{ formatCondensedNumber(maxIterations) }}</span>
        </div>

        <!-- Réf. actuelle progress row -->
        <div class="stats-row stats-row--progress">
          <div class="progress-row-header">
            <span class="stats-label">Réf. actuelle</span>
            <span class="stats-value">
              {{ formatRefOrbit(orbitCount, maxIterations) }}
              <span v-if="referenceResetActive"> · reset réf</span>
              <span v-else-if="referenceValidating"> · validation</span>
            </span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill progress-bar-fill--current" :style="{ width: currentRefPercent + '%' }"></div>
          </div>
        </div>

        <!-- Nouv. référence progress row -->
        <div v-if="pendingRefActive" class="stats-row stats-row--progress">
          <div class="progress-row-header">
            <span class="stats-label" style="color: var(--magenta);">Nouv. référence</span>
            <span class="stats-value" style="color: var(--magenta); font-weight: 700;">
              {{ formatCondensedNumber(pendingRefOrbitLen) }} / {{ formatCondensedNumber(pendingRefMaxIterations) }}
            </span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill progress-bar-fill--pending" :style="{ width: pendingRefPercent + '%' }"></div>
          </div>
        </div>
        <div class="stats-row">
          <span class="stats-label">Référence</span>
          <span class="stats-value" :class="{ 'stats-value--reference': referenceResetActive }">
            #{{ referenceResetSerial }}
            <span v-if="referenceResetActive"> · changement</span>
          </span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Orbite restante</span>
          <span class="stats-value">{{ orbitRemaining }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Ops/frame</span>
          <span class="stats-value">{{ formatOps(opsPerFrame()) }}</span>
        </div>

        <!-- Switch for Debug mode inside grid -->
        <div class="stats-row debug-row">
          <span class="stats-label">Visualisation débug</span>
          <div class="debug-switch-wrap">
            <label class="debug-switch">
              <input type="checkbox" v-model="debugShading" />
              <span class="debug-switch-slider"></span>
            </label>
          </div>
        </div>

      </div>

      <button class="stats-footer-close" @click="toggle" title="Replier le panneau">
        <span>{{ '▲' }} Replier</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.render-stats {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: rgba(16, 18, 24, 0.85);
  border: 1px solid var(--line);
  backdrop-filter: blur(12px);
  color: var(--ink-2);
  font-size: 0.82rem;
  font-family: var(--sans);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  user-select: none;
  letter-spacing: 0.01em;
  overflow: hidden;
  transition: width 0.25s ease, box-shadow 0.25s ease;
  touch-action: manipulation;
}

.render-stats--expanded {
  width: 210px;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: none;
  background: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
  font-weight: 600;
  letter-spacing: inherit;
  width: 100%;
}

.stats-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.3s;
}

.status-dot--active {
  background: oklch(0.72 0.18 145);
  box-shadow: 0 0 10px oklch(0.72 0.18 145);
}

.status-dot--idle {
  background: var(--ink-4);
}

.status-dot--reference {
  background: var(--magenta);
  box-shadow: 0 0 12px var(--magenta);
  animation: reference-pulse 0.45s ease-in-out infinite alternate;
}

.stats-fps {
  font-family: var(--mono);
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  min-width: 3.2em;
}

.header-badge {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 16px;
  line-height: 1;
}

.header-badge-label {
  color: var(--ink-3);
  font-weight: 600;
  opacity: 0.8;
}

.header-badge-value {
  color: var(--ink);
}

.stats-reference-badge {
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(236, 61, 122, 0.18);
  color: var(--magenta);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.stats-toggle {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--ink-3);
  opacity: 0.7;
}

/* --- Expanded panel --- */
.stats-panel {
  padding: 0 8px 4px;
}

.stats-graph {
  width: 100%;
  height: 34px;
  border-radius: 5px;
  display: block;
  margin-bottom: 3px;
  background: rgba(0, 0, 0, 0.2);
}

.stats-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  font-size: 0.6rem;
  color: var(--ink-3);
  margin-bottom: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.legend-swatch--green {
  background: rgba(34, 197, 94, 0.7);
}

.legend-swatch--orange {
  background: rgba(255, 170, 0, 0.8);
}

.legend-swatch--cyan {
  background: rgba(0, 180, 220, 0.8);
}

.legend-swatch--purple {
  background: rgba(180, 80, 220, 0.8);
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0;
  border-bottom: 1px solid var(--line-soft);
}

.stats-label {
  font-size: 0.66rem;
  color: var(--ink-3);
}

.stats-value {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.stats-value--reference {
  color: var(--magenta);
  font-weight: 700;
}

@keyframes reference-pulse {
  from { transform: scale(1); opacity: 0.75; }
  to { transform: scale(1.25); opacity: 1; }
}

.debug-row {
  border-bottom: 1px dashed rgba(255, 0, 127, 0.2);
  align-items: center !important;
  padding: 3px 0 !important;
}

.stats-value--floatexp {
  color: var(--cyan, #00b4dc);
  font-weight: 700;
}

.debug-switch-wrap {
  display: flex;
  align-items: center;
  cursor: default;
}

.debug-switch {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  cursor: pointer;
}

.debug-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.debug-switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--line, rgba(255, 255, 255, 0.1));
  transition: .2s;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.debug-switch-slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 2px;
  bottom: 2px;
  background-color: var(--ink-3, #8a8d9a);
  transition: .2s;
  border-radius: 50%;
}

.debug-switch input:checked + .debug-switch-slider {
  background-color: rgba(236, 61, 122, 0.2);
  border-color: var(--magenta, #ff007f);
}

.debug-switch input:checked + .debug-switch-slider:before {
  transform: translateX(14px);
  background-color: var(--magenta, #ff007f);
  box-shadow: 0 0 6px var(--magenta, #ff007f);
}

.stats-row--progress {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
  border-bottom: 1px solid var(--line-soft);
}

.stats-footer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 4px;
  padding: 4px 0;
  border: none;
  border-top: 1px solid var(--line-soft);
  background: none;
  color: var(--ink-3);
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.stats-footer-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink);
}

.progress-row-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
}

.progress-bar-wrap {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.15s ease-out;
}

.progress-bar-fill--zoom,
.progress-bar-fill--current,
.progress-bar-fill--pending {
  background: linear-gradient(90deg, var(--cyan, #00b4dc), var(--magenta, #ff007f));
}

.progress-bar-fill--pending {
  box-shadow: 0 0 4px var(--magenta);
}
</style>
