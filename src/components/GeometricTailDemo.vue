<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(380);

const theta = ref(0.6);
const cutD = ref(4);

const N_BARS = 26;

function term(d: number): number {
  return (d + 1) * Math.pow(theta.value, d);
}

function tailClosedForm(): number {
  const t = theta.value;
  const D = cutD.value;
  return (Math.pow(t, D) * (D + 1 - D * t)) / ((1 - t) * (1 - t));
}

function tailNumeric(): number {
  let s = 0;
  for (let k = 0; k < 2000; k++) {
    s += term(cutD.value + k);
  }
  return s;
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

  const margin = { left: 40, right: 15, top: 45, bottom: 55 };
  const gw = W - margin.left - margin.right;
  const gh = H - margin.top - margin.bottom;

  // Valeur max pour l'échelle verticale
  let maxTerm = 0;
  for (let d = 0; d < N_BARS; d++) maxTerm = Math.max(maxTerm, term(d));
  maxTerm = Math.max(maxTerm, 1e-9);

  const barW = gw / N_BARS;

  for (let d = 0; d < N_BARS; d++) {
    const v = term(d);
    const bh = (v / maxTerm) * gh;
    const x = margin.left + d * barW;
    const y = margin.top + gh - bh;
    const inTail = d >= cutD.value;
    ctx.fillStyle = inTail ? '#ffa94d' : 'rgba(80, 180, 255, 0.7)';
    ctx.fillRect(x + 1, y, barW - 2, bh);
    // Index sous la barre (un sur deux si serré)
    if (d % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(d), x + barW / 2, margin.top + gh + 14);
    }
  }

  // Ligne de coupe D
  const cutX = margin.left + cutD.value * barW;
  ctx.strokeStyle = '#ffa94d';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cutX, margin.top - 8);
  ctx.lineTo(cutX, margin.top + gh);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffa94d';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`D = ${cutD.value}`, cutX + 5, margin.top - 12);

  // Légendes
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(80, 180, 255, 0.9)';
  ctx.fillText(`termes (d+1)·θᵈ conservés`, margin.left, 20);
  ctx.fillStyle = '#ffa94d';
  ctx.fillText(`queue (majorée par la forme fermée)`, margin.left + 240, 20);

  const closed = tailClosedForm();
  const numeric = tailNumeric();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Somme numérique de la queue : ${numeric.toPrecision(6)}   |   Forme fermée θᴰ((D+1)-Dθ)/(1-θ)² : ${closed.toPrecision(6)}`,
    margin.left,
    H - 12
  );
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('degré d', margin.left + gw / 2, margin.top + gh + 30);
}

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  width.value = Math.round(rect.width);
  height.value = 380;
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

function onThetaInput(e: Event) {
  theta.value = parseFloat((e.target as HTMLInputElement).value);
  draw();
}
function onCutInput(e: Event) {
  cutD.value = parseInt((e.target as HTMLInputElement).value);
  draw();
}
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px; flex-wrap: wrap;">
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">θ :</label>
      <input type="range" min="0.05" max="0.92" step="0.01" :value="theta" @input="onThetaInput" style="flex: 1; min-width: 100px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 40px; text-align: right; color: #aaa;">{{ theta.toFixed(2) }}</span>
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Coupe D :</label>
      <input type="range" min="0" max="20" step="1" :value="cutD" @input="onCutInput" style="flex: 1; min-width: 100px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 24px; text-align: right; color: #aaa;">{{ cutD }}</span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 380px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
