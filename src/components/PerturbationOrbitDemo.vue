<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(420);

// Référence : un point proche de la frontière, avec une orbite quasi-périodique
// qui reste bornée longtemps (joli anneau dans le plan complexe).
const C_REF = { re: -0.75, im: 0.05 };

const logDelta = ref(-3); // log10 de |δc|
const steps = ref(120);

interface Cx {
  re: number;
  im: number;
}

function step(z: Cx, c: Cx): Cx {
  return {
    re: z.re * z.re - z.im * z.im + c.re,
    im: 2 * z.re * z.im + c.im,
  };
}

function computeOrbits() {
  const n = steps.value;
  const dc = Math.pow(10, logDelta.value);
  const cPert = { re: C_REF.re + dc * Math.SQRT1_2, im: C_REF.im + dc * Math.SQRT1_2 };

  const ref_: Cx[] = [{ re: 0, im: 0 }];
  const pert: Cx[] = [{ re: 0, im: 0 }];
  for (let i = 0; i < n; i++) {
    const zr = ref_[ref_.length - 1];
    const zp = pert[pert.length - 1];
    if (zr.re * zr.re + zr.im * zr.im > 100) break;
    ref_.push(step(zr, C_REF));
    pert.push(step(zp, cPert));
  }
  return { ref_, pert, dc };
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

  const { ref_, pert } = computeOrbits();

  // --- Panneau gauche : orbites dans le plan complexe ---
  const planeW = W * 0.55;
  const cx = planeW / 2;
  const cy = H / 2 - 10;
  const scale = Math.min(planeW, H) / 3.2;

  const toPx = (z: Cx) => ({ x: cx + (z.re - C_REF.re) * scale, y: cy - (z.im - C_REF.im) * scale });

  // Axes centrés sur C_REF
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(planeW, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, H - 40);
  ctx.stroke();

  // Orbite de référence (bleue) : segments + points
  ctx.strokeStyle = 'rgba(80, 180, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ref_.forEach((z, i) => {
    const p = toPx(z);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.fillStyle = '#50b4ff';
  ref_.forEach((z) => {
    const p = toPx(z);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Orbite perturbée (orange) — visuellement quasi superposée
  ctx.fillStyle = 'rgba(255, 169, 77, 0.8)';
  pert.forEach((z) => {
    const p = toPx(z);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#50b4ff';
  ctx.fillText('orbite de référence Zₙ', 10, 18);
  ctx.fillStyle = '#ffa94d';
  ctx.fillText('orbite perturbée zₙ = Zₙ + δzₙ', 10, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(`C = ${C_REF.re} + ${C_REF.im}i,  |δc| = 10^${logDelta.value}`, 10, H - 10);

  // --- Panneau droit : |δzₙ| en échelle log ---
  const gx0 = planeW + 30;
  const gw = W - gx0 - 15;
  const gy0 = 30;
  const gh = H - gy0 - 60;

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(gx0, gy0, gw, gh);

  const LOG_MIN = -16;
  const LOG_MAX = 2;
  const yOf = (logv: number) =>
    gy0 + gh - ((Math.max(LOG_MIN, Math.min(LOG_MAX, logv)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * gh;

  // Lignes de niveau log
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  for (let l = LOG_MIN; l <= LOG_MAX; l += 4) {
    const y = yOf(l);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(gx0, y);
    ctx.lineTo(gx0 + gw, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`1e${l}`, gx0 - 4, y + 3);
  }

  // Repère : la précision d'un f32 (~1e-7 relatif)
  ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(gx0, yOf(-7));
  ctx.lineTo(gx0 + gw, yOf(-7));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
  ctx.textAlign = 'left';
  ctx.fillText('précision f32', gx0 + 4, yOf(-7) - 4);

  // Courbe |δzₙ|
  ctx.strokeStyle = '#ffa94d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = Math.min(ref_.length, pert.length);
  for (let i = 0; i < n; i++) {
    const dr = pert[i].re - ref_[i].re;
    const di = pert[i].im - ref_[i].im;
    const mag = Math.sqrt(dr * dr + di * di);
    const logv = mag > 0 ? Math.log10(mag) : LOG_MIN;
    const x = gx0 + (i / Math.max(1, n - 1)) * gw;
    const y = yOf(logv);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#ffa94d';
  ctx.textAlign = 'center';
  ctx.fillText('|δzₙ| au fil des itérations (échelle log)', gx0 + gw / 2, gy0 - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(`n = 0 … ${n - 1}`, gx0 + gw / 2, gy0 + gh + 16);
}

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  width.value = Math.round(rect.width);
  height.value = 420;
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

function onDeltaInput(e: Event) {
  logDelta.value = parseFloat((e.target as HTMLInputElement).value);
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
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">log₁₀|δc| :</label>
      <input type="range" min="-8" max="-1" step="0.5" :value="logDelta" @input="onDeltaInput" style="flex: 1; min-width: 100px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 40px; text-align: right; color: #aaa;">{{ logDelta }}</span>
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Itérations :</label>
      <input type="range" min="10" max="300" step="10" :value="steps" @input="onStepsInput" style="flex: 1; min-width: 100px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 36px; text-align: right; color: #aaa;">{{ steps }}</span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 420px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
