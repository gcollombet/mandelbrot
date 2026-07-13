<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(420);

// m(z) = (Az + B) / (Cz + D), coefficients réels pour la démo
const A = ref(1);
const B = ref(0.3);
const C = ref(-1);
const D = ref(1);

const presets: Record<string, { a: number; b: number; c: number; d: number; label: string }> = {
  identity: { a: 1, b: 0, c: 0, d: 1, label: 'identité' },
  inversion: { a: 0, b: 1, c: 1, d: 0, label: '1/z' },
  pade: { a: 1, b: 0.3, c: -1, d: 1, label: 'pas Padé (a=1)' },
};

interface Cx {
  re: number;
  im: number;
}

function mobius(z: Cx): Cx | null {
  const numRe = A.value * z.re + B.value;
  const numIm = A.value * z.im;
  const denRe = C.value * z.re + D.value;
  const denIm = C.value * z.im;
  const d2 = denRe * denRe + denIm * denIm;
  if (d2 < 1e-9) return null;
  return {
    re: (numRe * denRe + numIm * denIm) / d2,
    im: (numIm * denRe - numRe * denIm) / d2,
  };
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

  const half = W / 2;
  const scale = Math.min(half, H) / 5.2;

  const toSrc = (z: Cx) => ({ x: half / 2 + z.re * scale, y: H / 2 - z.im * scale });
  const toDst = (z: Cx) => ({ x: half + half / 2 + z.re * scale, y: H / 2 - z.im * scale });

  // Séparateur central
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half, H);
  ctx.stroke();

  const drawAxes = (cx: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - half / 2, H / 2);
    ctx.lineTo(cx + half / 2, H / 2);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
  };
  drawAxes(half / 2);
  drawAxes(half + half / 2);

  // Cercles concentriques + rayons, source à gauche, image à droite
  const circles = [0.4, 0.8, 1.2, 1.6, 2.0];
  const rays = 12;

  const colorFor = (idx: number, alpha: number) => {
    const hue = 190 + idx * 24;
    return `hsla(${hue}, 80%, 62%, ${alpha})`;
  };

  // Cercles
  circles.forEach((r, idx) => {
    // Source
    ctx.strokeStyle = colorFor(idx, 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k <= 128; k++) {
      const t = (k / 128) * Math.PI * 2;
      const p = toSrc({ re: r * Math.cos(t), im: r * Math.sin(t) });
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Image
    ctx.strokeStyle = colorFor(idx, 0.95);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= 256; k++) {
      const t = (k / 256) * Math.PI * 2;
      const w = mobius({ re: r * Math.cos(t), im: r * Math.sin(t) });
      if (!w || Math.abs(w.re) > 6 || Math.abs(w.im) > 6) {
        started = false;
        continue;
      }
      const p = toDst(w);
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  });

  // Rayons
  for (let k = 0; k < rays; k++) {
    const t = (k / rays) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const p0 = toSrc({ re: 0.1 * Math.cos(t), im: 0.1 * Math.sin(t) });
    const p1 = toSrc({ re: 2.0 * Math.cos(t), im: 2.0 * Math.sin(t) });
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    let started = false;
    for (let s = 0; s <= 64; s++) {
      const r = 0.1 + (s / 64) * 1.9;
      const w = mobius({ re: r * Math.cos(t), im: r * Math.sin(t) });
      if (!w || Math.abs(w.re) > 6 || Math.abs(w.im) > 6) {
        started = false;
        continue;
      }
      const p = toDst(w);
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }

  // Pôle z = -D/C dans le plan source
  if (Math.abs(C.value) > 1e-6) {
    const pole = { re: -D.value / C.value, im: 0 };
    if (Math.abs(pole.re) < 2.5) {
      const p = toSrc(pole);
      ctx.fillStyle = '#ff6464';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('pôle', p.x, p.y - 10);
    }
  }

  // Légendes
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('plan source z', half / 2, 20);
  ctx.fillText('image m(z) = (Az+B)/(Cz+D)', half + half / 2, 20);

  const det = A.value * D.value - B.value * C.value;
  ctx.fillStyle = det === 0 ? '#ff6464' : 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  ctx.fillText(
    `det = AD - BC = ${det.toFixed(2)}${det === 0 ? '  (dégénéré : image constante !)' : ''}`,
    12,
    H - 12
  );
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

function onCoef(refVal: typeof A, e: Event) {
  refVal.value = parseFloat((e.target as HTMLInputElement).value);
  draw();
}
function applyPreset(key: string) {
  const p = presets[key];
  A.value = p.a;
  B.value = p.b;
  C.value = p.c;
  D.value = p.d;
  draw();
}
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 8px; padding: 0 4px; flex-wrap: wrap;">
      <div style="display: flex; gap: 6px;">
        <button
          v-for="(p, key) in presets"
          :key="key"
          @click="applyPreset(key as string)"
          style="padding: 4px 10px; font-size: 12px; font-family: monospace; border-radius: 4px; border: 1px solid #555; background: transparent; color: #aaa; cursor: pointer;"
        >
          {{ p.label }}
        </button>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; padding: 0 4px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 12px; font-family: monospace; color: #aaa; width: 20px;">A</label>
        <input type="range" min="-2" max="2" step="0.1" :value="A" @input="onCoef(A, $event)" style="flex: 1;" />
        <span style="font-size: 12px; font-family: monospace; min-width: 36px; text-align: right; color: #aaa;">{{ A.toFixed(1) }}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 12px; font-family: monospace; color: #aaa; width: 20px;">B</label>
        <input type="range" min="-2" max="2" step="0.1" :value="B" @input="onCoef(B, $event)" style="flex: 1;" />
        <span style="font-size: 12px; font-family: monospace; min-width: 36px; text-align: right; color: #aaa;">{{ B.toFixed(1) }}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 12px; font-family: monospace; color: #aaa; width: 20px;">C</label>
        <input type="range" min="-2" max="2" step="0.1" :value="C" @input="onCoef(C, $event)" style="flex: 1;" />
        <span style="font-size: 12px; font-family: monospace; min-width: 36px; text-align: right; color: #aaa;">{{ C.toFixed(1) }}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 12px; font-family: monospace; color: #aaa; width: 20px;">D</label>
        <input type="range" min="-2" max="2" step="0.1" :value="D" @input="onCoef(D, $event)" style="flex: 1;" />
        <span style="font-size: 12px; font-family: monospace; min-width: 36px; text-align: right; color: #aaa;">{{ D.toFixed(1) }}</span>
      </div>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 420px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
