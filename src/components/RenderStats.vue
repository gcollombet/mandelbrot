<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue';

const props = defineProps<{
  engine: any;
}>();

const expanded = ref(false);

// --- Polled stats (reactive mirrors of Engine plain properties) ---
const fps = ref(0);
const isRendering = ref(false);
const gpuFrameTimeMs = ref(0);
const unfinishedPixels = ref(-1);
const activePixels = ref(-1);
const totalPixels = ref(0);
const batchSize = ref(0);
const orbitCount = ref(0);
const maxIterations = ref(0);

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
  gpuFrameTimeMs.value = e.gpuFrameTimeMs ?? 0;
  unfinishedPixels.value = e.unfinishedPixelCount ?? -1;
  activePixels.value = e.activePixelCount ?? -1;
  const ns = e.neutralSize ?? 0;
  totalPixels.value = ns * ns;
  batchSize.value = typeof e.getIterationBatchSize === 'function' ? e.getIterationBatchSize() : 0;
  orbitCount.value = e.currentGuardedMaxIter ?? 0;
  maxIterations.value = e.currentMaxIterations ?? 0;

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
        :class="isRendering ? 'status-dot--active' : 'status-dot--idle'"
      ></span>
      <span class="stats-fps">{{ fps }} fps</span>
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
          <span class="stats-label">Orbite</span>
          <span class="stats-value">{{ orbitCount }} / {{ maxIterations }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Ops/frame</span>
          <span class="stats-value">{{ formatOps(opsPerFrame()) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.render-stats {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  color: #111;
  font-size: 0.9rem;
  font-family: inherit;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  user-select: none;
  letter-spacing: 0.01em;
  overflow: hidden;
  transition: width 0.25s ease, box-shadow 0.25s ease;
  /* Assure la réactivité des taps sur mobile */
  touch-action: manipulation;
}

.render-stats--expanded {
  width: 240px;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: none;
  background: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  width: 100%;
}

.stats-header:hover {
  background: rgba(255,255,255,0.2);
}

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.3s;
}

.status-dot--active {
  background: #22c55e;
  box-shadow: 0 0 6px 1px rgba(34,197,94,0.5);
}

.status-dot--idle {
  background: #aaa;
}

.stats-fps {
  font-variant-numeric: tabular-nums;
  min-width: 3.5em;
}

.stats-toggle {
  margin-left: auto;
  font-size: 0.7rem;
  opacity: 0.5;
}

/* --- Expanded panel --- */
.stats-panel {
  padding: 0 14px 10px;
}

.stats-graph {
  width: 100%;
  height: 64px;
  border-radius: 8px;
  display: block;
  margin-bottom: 6px;
}

.stats-legend {
  display: flex;
  gap: 10px;
  font-size: 0.7rem;
  opacity: 0.7;
  margin-bottom: 6px;
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
  background: rgba(34,197,94,0.7);
}

.legend-swatch--orange {
  background: rgba(255,170,0,0.8);
}

.legend-swatch--cyan {
  background: rgba(0,180,220,0.8);
}

.legend-swatch--purple {
  background: rgba(180,80,220,0.8);
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 1px 0;
}

.stats-label {
  font-size: 0.78rem;
  opacity: 0.65;
}

.stats-value {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
</style>
