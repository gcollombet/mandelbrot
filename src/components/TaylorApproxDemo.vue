<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(400);

const order = ref(3);
const funcKey = ref<'geom' | 'runge' | 'exp'>('geom');

const functions = {
  geom: {
    label: '1/(1-x)',
    f: (x: number) => 1 / (1 - x),
    // Somme partielle de Taylor en 0 : 1 + x + x² + ...
    taylor: (x: number, n: number) => {
      let s = 0;
      let t = 1;
      for (let k = 0; k <= n; k++) {
        s += t;
        t *= x;
      }
      return s;
    },
    radius: 1,
    note: 'Pôle réel en x = 1 → rayon de convergence 1',
  },
  runge: {
    label: '1/(1+x²)',
    f: (x: number) => 1 / (1 + x * x),
    // 1 - x² + x⁴ - ...
    taylor: (x: number, n: number) => {
      let s = 0;
      for (let k = 0; 2 * k <= n; k++) {
        s += (k % 2 === 0 ? 1 : -1) * Math.pow(x, 2 * k);
      }
      return s;
    },
    radius: 1,
    note: 'Pôles complexes en ±i → rayon 1, invisible sur ℝ !',
  },
  exp: {
    label: 'exp(x)',
    f: (x: number) => Math.exp(x),
    taylor: (x: number, n: number) => {
      let s = 0;
      let t = 1;
      for (let k = 0; k <= n; k++) {
        s += t;
        t *= x / (k + 1);
      }
      return s;
    },
    radius: Infinity,
    note: 'Aucun pôle → rayon de convergence infini',
  },
};

const X_MIN = -2.5;
const X_MAX = 2.5;
const Y_MIN = -3;
const Y_MAX = 5;

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);

  const fn = functions[funcKey.value];

  const toPx = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
  const toPy = (y: number) => H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * H;

  // Fond
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);

  // Zone de convergence (bande |x| < rayon)
  if (isFinite(fn.radius)) {
    ctx.fillStyle = 'rgba(80, 180, 255, 0.08)';
    ctx.fillRect(toPx(-fn.radius), 0, toPx(fn.radius) - toPx(-fn.radius), H);
    ctx.strokeStyle = 'rgba(80, 180, 255, 0.4)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    [-fn.radius, fn.radius].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(toPx(x), 0);
      ctx.lineTo(toPx(x), H);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, toPy(0));
  ctx.lineTo(W, toPy(0));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toPx(0), 0);
  ctx.lineTo(toPx(0), H);
  ctx.stroke();

  // Graduations
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  for (let x = Math.ceil(X_MIN); x <= Math.floor(X_MAX); x++) {
    if (x === 0) continue;
    ctx.fillText(String(x), toPx(x), toPy(0) + 14);
    ctx.fillRect(toPx(x) - 0.5, toPy(0) - 3, 1, 6);
  }

  // Fonction exacte (bleue)
  ctx.strokeStyle = '#50b4ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px <= W; px++) {
    const x = X_MIN + (px / W) * (X_MAX - X_MIN);
    const y = fn.f(x);
    if (!isFinite(y) || Math.abs(y) > 50) {
      started = false;
      continue;
    }
    const py = toPy(y);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();

  // Polynôme de Taylor (orange)
  ctx.strokeStyle = '#ffa94d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  started = false;
  for (let px = 0; px <= W; px++) {
    const x = X_MIN + (px / W) * (X_MAX - X_MIN);
    const y = fn.taylor(x, order.value);
    if (!isFinite(y) || Math.abs(y) > 50) {
      started = false;
      continue;
    }
    const py = Math.max(-20, Math.min(H + 20, toPy(y)));
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();

  // Point de développement
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(toPx(0), toPy(fn.f(0)), 4, 0, Math.PI * 2);
  ctx.fill();

  // Légende
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#50b4ff';
  ctx.fillText(`f(x) = ${fn.label}`, 12, 20);
  ctx.fillStyle = '#ffa94d';
  ctx.fillText(`Taylor ordre ${order.value} (jet en 0)`, 12, 38);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(fn.note, 12, H - 12);
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

function onOrderInput(e: Event) {
  order.value = parseInt((e.target as HTMLInputElement).value);
  draw();
}

function setFunc(key: 'geom' | 'runge' | 'exp') {
  funcKey.value = key;
  draw();
}
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px; flex-wrap: wrap;">
      <div style="display: flex; gap: 6px;">
        <button
          v-for="(fn, key) in functions"
          :key="key"
          @click="setFunc(key as any)"
          :style="{
            padding: '4px 10px',
            fontSize: '12px',
            fontFamily: 'monospace',
            borderRadius: '4px',
            border: '1px solid ' + (funcKey === key ? '#50b4ff' : '#555'),
            background: funcKey === key ? 'rgba(80,180,255,0.15)' : 'transparent',
            color: funcKey === key ? '#50b4ff' : '#aaa',
            cursor: 'pointer',
          }"
        >
          {{ fn.label }}
        </button>
      </div>
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Ordre :</label>
      <input type="range" min="0" max="20" step="1" :value="order" @input="onOrderInput" style="flex: 1; min-width: 120px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 30px; text-align: right; color: #aaa;">{{ order }}</span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 400px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
