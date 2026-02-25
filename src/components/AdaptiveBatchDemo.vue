<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(350);

const complexity = ref(50); // 0-100: simulated scene complexity
const running = ref(true);

// Simulation state
const TARGET_MS = 16;
const MIN_BATCH = 10;
const MAX_BATCH = 10000;
const ALPHA = 0.3;
const HISTORY_LEN = 200;

let batchSize = 5000;
let frameTimeHistory: number[] = [];
let batchHistory: number[] = [];
let animFrame = 0;

// Simulate how "frame time" relates to batch size and complexity
function simulateFrameTime(batch: number, cplx: number): number {
  // Higher complexity = more time per iteration
  // base cost ~ batch * complexity_factor + noise
  const complexityFactor = 0.002 + (cplx / 100) * 0.006; // 0.002..0.008 ms per iteration
  const baseTime = batch * complexityFactor;
  const noise = (Math.random() - 0.5) * 2; // ±1ms noise
  return Math.max(1, baseTime + noise);
}

function step() {
  // Simulate one frame
  const elapsed = simulateFrameTime(batchSize, complexity.value);

  // Adaptive adjustment (mirrors Engine.ts:758-775)
  if (elapsed > 0) {
    const ratio = TARGET_MS / elapsed;
    const ideal = batchSize * ratio;
    batchSize = Math.round(
      Math.min(MAX_BATCH, Math.max(MIN_BATCH, batchSize * 0.7 + ideal * ALPHA))
    );
  }

  // Store history
  frameTimeHistory.push(elapsed);
  batchHistory.push(batchSize);
  if (frameTimeHistory.length > HISTORY_LEN) {
    frameTimeHistory.shift();
    batchHistory.shift();
  }
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);

  const margin = { top: 30, bottom: 40, left: 60, right: 60 };
  const chartW = W - margin.left - margin.right;
  const chartH = H - margin.top - margin.bottom;

  if (chartW <= 0 || chartH <= 0) return;

  // Background
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(margin.left, margin.top, chartW, chartH);

  // Target line at 16ms
  const maxTime = 50;
  const targetY = margin.top + chartH * (1 - TARGET_MS / maxTime);
  ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(margin.left, targetY);
  ctx.lineTo(margin.left + chartW, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '10px monospace';
  ctx.fillStyle = '#ff3c3c';
  ctx.textAlign = 'left';
  ctx.fillText('cible 16ms', margin.left + 4, targetY - 4);

  // Y axis labels (frame time, left)
  ctx.fillStyle = '#50b4ff';
  ctx.textAlign = 'right';
  for (let ms = 0; ms <= maxTime; ms += 10) {
    const y = margin.top + chartH * (1 - ms / maxTime);
    ctx.fillText(`${ms}ms`, margin.left - 6, y + 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartW, y);
    ctx.stroke();
  }

  // Y axis labels (batch size, right)
  ctx.fillStyle = '#8888cc';
  ctx.textAlign = 'left';
  for (let b = 0; b <= MAX_BATCH; b += 2000) {
    const y = margin.top + chartH * (1 - b / MAX_BATCH);
    ctx.fillText(`${b}`, margin.left + chartW + 6, y + 4);
  }

  // Plot frame time curve
  if (frameTimeHistory.length > 1) {
    ctx.strokeStyle = '#50b4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < frameTimeHistory.length; i++) {
      const x = margin.left + (i / (HISTORY_LEN - 1)) * chartW;
      const y = margin.top + chartH * (1 - Math.min(frameTimeHistory[i], maxTime) / maxTime);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Plot batch size curve
  if (batchHistory.length > 1) {
    ctx.strokeStyle = '#8888cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < batchHistory.length; i++) {
      const x = margin.left + (i / (HISTORY_LEN - 1)) * chartW;
      const y = margin.top + chartH * (1 - Math.min(batchHistory[i], MAX_BATCH) / MAX_BATCH);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Legend
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#50b4ff';
  ctx.fillText('— Temps GPU (ms, axe gauche)', W / 2 - 120, H - 12);

  ctx.fillStyle = '#8888cc';
  ctx.fillText('— Batch size (axe droit)', W / 2 + 120, H - 12);

  // Current values in header
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aaa';
  const lastTime = frameTimeHistory.length > 0 ? frameTimeHistory[frameTimeHistory.length - 1] : 0;
  ctx.fillText(
    `Batch : ${batchSize} — Temps GPU : ${lastTime.toFixed(1)}ms — Complexité : ${complexity.value}%`,
    W / 2, margin.top - 10
  );
}

function loop() {
  if (!running.value) return;
  step();
  draw();
  animFrame = requestAnimationFrame(loop);
}

function onComplexityInput(e: Event) {
  complexity.value = parseFloat((e.target as HTMLInputElement).value);
}

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  width.value = Math.round(rect.width);
  height.value = Math.round(rect.height);
  if (canvasRef.value) {
    canvasRef.value.width = width.value;
    canvasRef.value.height = height.value;
  }
  draw();
}

onMounted(() => {
  nextTick(() => {
    updateSize();
    if (containerRef.value) {
      const ro = new ResizeObserver(() => updateSize());
      ro.observe(containerRef.value);
    }
    running.value = true;
    loop();
  });
});

onUnmounted(() => {
  running.value = false;
  if (animFrame) cancelAnimationFrame(animFrame);
});
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px;">
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Complexité :</label>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="complexity"
        @input="onComplexityInput"
        style="flex: 1;"
      />
      <span style="font-size: 13px; font-family: monospace; min-width: 40px; text-align: right; color: #aaa;">{{ complexity }}%</span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 350px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
