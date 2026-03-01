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
const totalPixels = ref(0);
const batchSize = ref(0);

// --- History for the graph ---
const HISTORY_LENGTH = 200;
const unfinishedHistory: number[] = [];
const fpsHistory: number[] = [];

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
  const ns = e.neutralSize ?? 0;
  totalPixels.value = ns * ns;
  batchSize.value = typeof e.getIterationBatchSize === 'function' ? e.getIterationBatchSize() : 0;

  // Push history
  unfinishedHistory.push(unfinishedPixels.value >= 0 ? unfinishedPixels.value : 0);
  if (unfinishedHistory.length > HISTORY_LENGTH) unfinishedHistory.shift();
  fpsHistory.push(fps.value);
  if (fpsHistory.length > HISTORY_LENGTH) fpsHistory.shift();

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
