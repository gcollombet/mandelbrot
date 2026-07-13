<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(420);

const mode = ref<'step' | 'flow'>('step');
const aParam = ref(2); // |a| pour le mode "pas de perturbation"
const jetOrder = ref(3); // ordre du jet pour le mode "flot"

// Mode "step" : un pas exact f(z) = az + z² (c = 0, canal Julia)
//   jet affine  : az            → erreur exacte  z²
//   Padé [1/1]  : a²z/(a-z)     → erreur exacte  z³/(a-z)
// Mode "flow" : flot parabolique φ₁(z) = z/(1-z)
//   jet ordre N : z(1+z+...+z^(N-1))  → erreur  z^(N+1)/(1-z)
//   Padé [1/1]  : z/(1-z)             → erreur  0 (superconvergence)

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

  const margin = { left: 55, right: 15, top: 60, bottom: 45 };
  const gw = W - margin.left - margin.right;
  const gh = H - margin.top - margin.bottom;

  const a = aParam.value;
  const xMax = mode.value === 'step' ? a * 0.95 : 0.95;

  const LOG_MIN = -12;
  const LOG_MAX = 1;

  const toPx = (x: number) => margin.left + (x / xMax) * gw;
  const toPy = (logv: number) =>
    margin.top + gh - ((Math.max(LOG_MIN, Math.min(LOG_MAX, logv)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * gh;

  // Grille horizontale (échelle log)
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  for (let l = LOG_MIN; l <= LOG_MAX; l += 2) {
    const y = toPy(l);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + gw, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`1e${l}`, margin.left - 6, y + 3);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(margin.left, margin.top, gw, gh);

  const jetErr = (x: number) => {
    if (mode.value === 'step') return x * x;
    // |z^(N+1)/(1-z)|
    return Math.pow(x, jetOrder.value + 1) / Math.abs(1 - x);
  };
  const padeErr = (x: number) => {
    if (mode.value === 'step') return (x * x * x) / Math.abs(a - x);
    return 0; // exact sur le flot parabolique
  };

  const plot = (f: (x: number) => number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= gw; px++) {
      const x = (px / gw) * xMax;
      const v = f(x);
      const logv = v > 0 ? Math.log10(v) : LOG_MIN - 1;
      if (logv < LOG_MIN - 0.5) {
        started = false;
        continue;
      }
      const X = margin.left + px;
      const Y = toPy(logv);
      if (!started) {
        ctx.moveTo(X, Y);
        started = true;
      } else {
        ctx.lineTo(X, Y);
      }
    }
    ctx.stroke();
  };

  plot(jetErr, '#8888cc');
  plot(padeErr, '#ffa94d');

  // Frontière de dominance |z| = |a - z| (soit z = a/2 sur l'axe réel)
  if (mode.value === 'step') {
    const xb = a / 2;
    if (xb < xMax) {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(toPx(xb), margin.top);
      ctx.lineTo(toPx(xb), margin.top + gh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('|z| = |a-z|', toPx(xb), margin.top - 6);
      ctx.fillText('(z = a/2)', toPx(xb), margin.top + 12);
    }
  } else {
    ctx.fillStyle = '#ffa94d';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('erreur du Padé [1/1] : exactement 0 (hors du graphe log)', margin.left + gw / 2, margin.top + gh - 12);
  }

  // Axe x
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  for (let k = 0; k <= 4; k++) {
    const x = (k / 4) * xMax;
    ctx.fillText(x.toFixed(2), toPx(x), margin.top + gh + 16);
  }
  ctx.fillText('|z| (perturbation)', margin.left + gw / 2, margin.top + gh + 34);

  // Légende
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8888cc';
  const jetLabel =
    mode.value === 'step'
      ? 'erreur du jet affine az : |z|²'
      : `erreur du jet d'ordre ${jetOrder.value} : |z|^${jetOrder.value + 1}/|1-z|`;
  ctx.fillText(jetLabel, margin.left, 20);
  ctx.fillStyle = '#ffa94d';
  const padeLabel =
    mode.value === 'step'
      ? 'erreur du Padé [1/1] a²z/(a-z) : |z|³/|a-z|'
      : 'erreur du Padé [1/1] z/(1-z) : 0';
  ctx.fillText(padeLabel, margin.left, 38);
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

function onAInput(e: Event) {
  aParam.value = parseFloat((e.target as HTMLInputElement).value);
  draw();
}
function onOrderInput(e: Event) {
  jetOrder.value = parseInt((e.target as HTMLInputElement).value);
  draw();
}
function setMode(m: 'step' | 'flow') {
  mode.value = m;
  draw();
}
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px; flex-wrap: wrap;">
      <div style="display: flex; gap: 6px;">
        <button
          @click="setMode('step')"
          :style="{
            padding: '4px 10px', fontSize: '12px', fontFamily: 'monospace', borderRadius: '4px',
            border: '1px solid ' + (mode === 'step' ? '#50b4ff' : '#555'),
            background: mode === 'step' ? 'rgba(80,180,255,0.15)' : 'transparent',
            color: mode === 'step' ? '#50b4ff' : '#aaa', cursor: 'pointer',
          }"
        >
          un pas az+z²
        </button>
        <button
          @click="setMode('flow')"
          :style="{
            padding: '4px 10px', fontSize: '12px', fontFamily: 'monospace', borderRadius: '4px',
            border: '1px solid ' + (mode === 'flow' ? '#50b4ff' : '#555'),
            background: mode === 'flow' ? 'rgba(80,180,255,0.15)' : 'transparent',
            color: mode === 'flow' ? '#50b4ff' : '#aaa', cursor: 'pointer',
          }"
        >
          flot parabolique z/(1-z)
        </button>
      </div>
      <template v-if="mode === 'step'">
        <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">|a| = |2Z| :</label>
        <input type="range" min="0.5" max="4" step="0.1" :value="aParam" @input="onAInput" style="flex: 1; min-width: 100px;" />
        <span style="font-size: 13px; font-family: monospace; min-width: 32px; text-align: right; color: #aaa;">{{ aParam.toFixed(1) }}</span>
      </template>
      <template v-else>
        <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Ordre du jet :</label>
        <input type="range" min="1" max="12" step="1" :value="jetOrder" @input="onOrderInput" style="flex: 1; min-width: 100px;" />
        <span style="font-size: 13px; font-family: monospace; min-width: 24px; text-align: right; color: #aaa;">{{ jetOrder }}</span>
      </template>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 420px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
