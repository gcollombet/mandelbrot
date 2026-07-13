<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(400);

const z0 = ref(-0.12);
const steps = ref(60);

// Discret : z ← z + z²   |   Flot exact : φₙ(z₀) = z₀ / (1 - n·z₀)
function compute() {
  const n = steps.value;
  const discrete: number[] = [z0.value];
  for (let i = 0; i < n; i++) {
    const z = discrete[discrete.length - 1];
    discrete.push(z + z * z);
  }
  const flow: number[] = [];
  for (let i = 0; i <= n; i++) {
    flow.push(z0.value / (1 - i * z0.value));
  }
  return { discrete, flow };
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);

  const { discrete, flow } = compute();
  const n = steps.value;

  // --- Panneau haut : les deux trajectoires ---
  const m1 = { left: 55, right: 15, top: 30, bottom: 10 };
  const g1h = H * 0.5 - m1.top - m1.bottom;
  const gw = W - m1.left - m1.right;

  const yMin = Math.min(z0.value, -0.01) * 1.15;
  const yMax = 0.02;
  const toPy1 = (y: number) => m1.top + ((yMax - y) / (yMax - yMin)) * g1h;
  const toPx = (i: number) => m1.left + (i / n) * gw;

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(m1.left, m1.top, gw, g1h);
  // Ligne z = 0 (le point fixe parabolique)
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(m1.left, toPy1(0));
  ctx.lineTo(m1.left + gw, toPy1(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // Flot exact (bleu, ligne)
  ctx.strokeStyle = '#50b4ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  flow.forEach((z, i) => {
    if (i === 0) ctx.moveTo(toPx(i), toPy1(z));
    else ctx.lineTo(toPx(i), toPy1(z));
  });
  ctx.stroke();

  // Itération discrète (orange, points)
  ctx.fillStyle = '#ffa94d';
  discrete.forEach((z, i) => {
    ctx.beginPath();
    ctx.arc(toPx(i), toPy1(z), 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#50b4ff';
  ctx.fillText('flot exact φₙ(z₀) = z₀/(1-n·z₀)', m1.left + 6, 20);
  ctx.fillStyle = '#ffa94d';
  ctx.fillText('itération discrète zₙ₊₁ = zₙ + zₙ²', m1.left + 280, 20);

  // --- Panneau bas : erreur |zₙ - φₙ| en échelle log ---
  const m2top = H * 0.5 + 30;
  const g2h = H - m2top - 45;

  const LOG_MIN = -10;
  const LOG_MAX = 0;
  const toPy2 = (logv: number) =>
    m2top + g2h - ((Math.max(LOG_MIN, Math.min(LOG_MAX, logv)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * g2h;

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(m1.left, m2top, gw, g2h);
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  for (let l = LOG_MIN; l <= LOG_MAX; l += 2) {
    const y = toPy2(l);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(m1.left, y);
    ctx.lineTo(m1.left + gw, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`1e${l}`, m1.left - 5, y + 3);
  }

  ctx.strokeStyle = '#ff6464';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= n; i++) {
    const err = Math.abs(discrete[i] - flow[i]);
    const logv = err > 0 ? Math.log10(err) : LOG_MIN - 1;
    if (logv < LOG_MIN - 0.5) {
      started = false;
      continue;
    }
    const x = toPx(i);
    const y = toPy2(logv);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.fillStyle = '#ff6464';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('|zₙ - φₙ(z₀)| : le défaut de shadowing (échelle log)', m1.left + 6, m2top - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('n', m1.left + gw / 2, H - 12);
}

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  width.value = Math.round(rect.width);
  height.value = 400;
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
  });
});

function onZ0Input(e: Event) {
  z0.value = parseFloat((e.target as HTMLInputElement).value);
  draw();
}
function onStepsInput(e: Event) {
  steps.value = parseInt((e.target as HTMLInputElement).value);
  draw();
}
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px; flex-wrap: wrap;">
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">z₀ :</label>
      <input type="range" min="-0.3" max="-0.02" step="0.01" :value="z0" @input="onZ0Input" style="flex: 1; min-width: 100px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 48px; text-align: right; color: #aaa;">{{ z0.toFixed(2) }}</span>
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Pas n :</label>
      <input type="range" min="10" max="200" step="5" :value="steps" @input="onStepsInput" style="flex: 1; min-width: 100px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 36px; text-align: right; color: #aaa;">{{ steps }}</span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 400px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
