<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';

// ---- Vue complexe pour la carte de Mandelbrot ----
const RE_MIN = -2.2, RE_MAX = 0.7, IM_MIN = -1.25, IM_MAX = 1.25;

const mapRef = ref<HTMLCanvasElement | null>(null);
const orbitRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const mapW = ref(360), mapH = ref(320);
const orbW = ref(360), orbH = ref(320);

// Paramètre courant c = cRe + i·cIm
const cRe = ref(-0.12);
const cIm = ref(0.75);

type Kind = 'super' | 'attractif' | 'parabolique' | 'repulsif' | 'exterieur' | 'feigenbaum' | 'autre';

interface Classification {
  kind: Kind;
  period: number | null;
  lambda: number | null;      // |λ|
  escaped: boolean;
  cycle: Array<[number, number]>;
  orbit: Array<[number, number]>;
}

// Classe le paramètre c en itérant l'orbite critique z0 = 0.
function classify(re: number, im: number): Classification {
  // Cas particulier : le point de Feigenbaum (accumulation de doublements).
  if (Math.abs(re + 1.401155189) < 3e-4 && Math.abs(im) < 3e-4) {
    let zr0 = 0, zi0 = 0;
    const orb: Array<[number, number]> = [[0, 0]];
    for (let i = 0; i < 1200; i++) {
      const nr = zr0 * zr0 - zi0 * zi0 + re;
      const ni = 2 * zr0 * zi0 + im;
      zr0 = nr; zi0 = ni; orb.push([zr0, zi0]);
    }
    return { kind: 'feigenbaum', period: null, lambda: null, escaped: false, cycle: [], orbit: orb };
  }

  // 1) Orbite critique + détection d'échappement + trajectoire pour le tracé.
  let zr = 0, zi = 0;
  const orbit: Array<[number, number]> = [[0, 0]];
  const WARM = 20000;
  const MAXDRAW = 1200;
  let escaped = false;
  for (let i = 0; i < WARM; i++) {
    const nr = zr * zr - zi * zi + re;
    const ni = 2 * zr * zi + im;
    zr = nr; zi = ni;
    if (i < MAXDRAW) orbit.push([zr, zi]);
    if (zr * zr + zi * zi > 16) { escaped = true; break; }
  }
  if (escaped) {
    return { kind: 'exterieur', period: null, lambda: null, escaped: true, cycle: [], orbit };
  }

  // 2) L'orbite est bornée et « chauffée » : on cherche une période approchée.
  //    Un point parabolique converge en ~1/n (jamais exactement au point fixe),
  //    mais deux itérés consécutifs finissent extrêmement proches — d'où une
  //    tolérance modérée qui capture aussi bien l'attractif que le parabolique.
  const zref_r = zr, zref_i = zi;
  let period: number | null = null;
  let cr = zr, ci = zi;
  const TOL = 1e-4;
  for (let p = 1; p <= 128; p++) {
    const nr = cr * cr - ci * ci + re;
    const ni = 2 * cr * ci + im;
    cr = nr; ci = ni;
    const dr = cr - zref_r, di = ci - zref_i;
    if (dr * dr + di * di < TOL * TOL) { period = p; break; }
  }

  if (period === null) {
    // borné sans période détectée : intérieur non hyperbolique.
    return { kind: 'autre', period: null, lambda: null, escaped: false, cycle: [], orbit };
  }

  // 3) Multiplicateur λ = ∏ 2·z_k sur la période, et cycle pour le tracé.
  let lr = 1, li = 0;                 // produit complexe
  let wr = zref_r, wi = zref_i;
  const cyc: Array<[number, number]> = [];
  for (let k = 0; k < period; k++) {
    cyc.push([wr, wi]);
    const mr = 2 * wr, mi = 2 * wi;   // ×2z_k
    const nr = lr * mr - li * mi;
    const ni = lr * mi + li * mr;
    lr = nr; li = ni;
    const ar = wr * wr - wi * wi + re;
    const ai = 2 * wr * wi + im;
    wr = ar; wi = ai;
  }
  const lambda = Math.hypot(lr, li);

  let kind: Kind;
  if (lambda < 1e-3) kind = 'super';           // 0 ∈ cycle
  else if (lambda < 0.985) kind = 'attractif'; // |λ| < 1
  else if (lambda < 1.02) kind = 'parabolique'; // |λ| ≈ 1
  else kind = 'repulsif';                        // |λ| > 1 (ex. pointe c=−2)

  return { kind, period, lambda, escaped: false, cycle: cyc, orbit };
}

const result = computed(() => classify(cRe.value, cIm.value));

const META: Record<Kind, { label: string; color: string; note: string }> = {
  super:       { label: 'Super-attractif',        color: '#51cf66', note: 'le point critique 0 est dans le cycle · |λ| = 0 · un centre de composante' },
  attractif:   { label: 'Attractif (hyperbolique)', color: '#50b4ff', note: 'le cycle aspire ses voisins · |λ| < 1 · intérieur d’une composante' },
  parabolique: { label: 'Parabolique / neutre',   color: '#ffa94d', note: 'cas-frontière · |λ| = 1 (racine de l’unité) · bord, cusp ou racine de bulbe' },
  repulsif:    { label: 'Répulsif',               color: '#ff6464', note: 'le cycle repousse · |λ| > 1' },
  exterieur:   { label: 'Extérieur (c hors de M)', color: '#ff6464', note: 'l’orbite critique s’échappe vers l’infini' },
  feigenbaum:  { label: 'Point de Feigenbaum',    color: '#b197fc', note: 'accumulation de doublements · ni périodique, ni parabolique · infiniment renormalisable' },
  autre:       { label: 'Intérieur non hyperbolique', color: '#b197fc', note: 'borné sans cycle attractif rapide : parabolique lent, Siegel, ou Feigenbaum' },
};

interface Preset { name: string; re: number; im: number; }
const presets: Preset[] = [
  { name: 'c = 0  (centre cardioïde)', re: 0, im: 0 },
  { name: 'c = −1  (centre période 2)', re: -1, im: 0 },
  { name: 'c = −0.5  (intérieur)', re: -0.5, im: 0 },
  { name: 'c = 0.25  (cusp, λ=+1)', re: 0.25, im: 0 },
  { name: 'c = −0.75  (racine, λ=−1)', re: -0.75, im: 0 },
  { name: 'c = −1.401155  (Feigenbaum)', re: -1.401155189, im: 0 },
  { name: 'c = −2  (pointe, répulsif)', re: -2, im: 0 },
  { name: 'c = 0.5 + 0.5i  (extérieur)', re: 0.5, im: 0.5 },
];

function applyPreset(p: Preset) {
  cRe.value = p.re;
  cIm.value = p.im;
  drawOrbit();
  drawMarker();
}

// ---------- Rendu de la carte de Mandelbrot (une seule fois) ----------
let mapImage: ImageData | null = null;

function renderMap() {
  const canvas = mapRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = mapW.value, H = mapH.value;
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const MAXI = 160;
  for (let py = 0; py < H; py++) {
    const im = IM_MAX - (py / H) * (IM_MAX - IM_MIN);
    for (let px = 0; px < W; px++) {
      const re = RE_MIN + (px / W) * (RE_MAX - RE_MIN);
      let zr = 0, zi = 0, i = 0;
      for (; i < MAXI; i++) {
        const nr = zr * zr - zi * zi + re;
        const ni = 2 * zr * zi + im;
        zr = nr; zi = ni;
        if (zr * zr + zi * zi > 4) break;
      }
      const idx = (py * W + px) * 4;
      if (i >= MAXI) {
        // dans l'ensemble : gris foncé
        data[idx] = 26; data[idx + 1] = 26; data[idx + 2] = 40; data[idx + 3] = 255;
      } else {
        const t = i / MAXI;
        data[idx] = Math.round(20 + 60 * t);
        data[idx + 1] = Math.round(30 + 90 * t);
        data[idx + 2] = Math.round(60 + 150 * t);
        data[idx + 3] = 255;
      }
    }
  }
  mapImage = img;
  drawMarker();
}

function drawMarker() {
  const canvas = mapRef.value;
  if (!canvas || !mapImage) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(mapImage, 0, 0);
  const W = mapW.value, H = mapH.value;
  const px = ((cRe.value - RE_MIN) / (RE_MAX - RE_MIN)) * W;
  const py = ((IM_MAX - cIm.value) / (IM_MAX - IM_MIN)) * H;
  const col = META[result.value.kind].color;
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px - 11, py); ctx.lineTo(px - 3, py);
  ctx.moveTo(px + 3, py); ctx.lineTo(px + 11, py);
  ctx.moveTo(px, py - 11); ctx.lineTo(px, py - 3);
  ctx.moveTo(px, py + 3); ctx.lineTo(px, py + 11); ctx.stroke();
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left';
  ctx.fillText('glisser pour déplacer c', 8, H - 10);
}

// ---------- Rendu de l'orbite critique ----------
function drawOrbit() {
  const canvas = orbitRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = orbW.value, H = orbH.value;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);

  const r = result.value;
  const col = META[r.kind].color;

  // boîte englobante de l'orbite tracée
  let minx = -0.5, maxx = 0.5, miny = -0.5, maxy = 0.5;
  const pts = r.orbit;
  if (pts.length) {
    minx = miny = Infinity; maxx = maxy = -Infinity;
    for (const [x, y] of pts) {
      if (Math.abs(x) > 6 || Math.abs(y) > 6) continue;
      minx = Math.min(minx, x); maxx = Math.max(maxx, x);
      miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    }
    if (!isFinite(minx)) { minx = -0.5; maxx = 0.5; miny = -0.5; maxy = 0.5; }
  }
  // padding + carré
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  let span = Math.max(maxx - minx, maxy - miny, 0.4) * 1.3;
  const pad = 34;
  const gw = W - 2 * pad, gh = H - 2 * pad;
  const scale = Math.min(gw, gh) / span;
  const toPx = (x: number) => pad + gw / 2 + (x - cx) * scale;
  const toPy = (y: number) => pad + gh / 2 - (y - cy) * scale;

  // axes
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, toPy(0)); ctx.lineTo(W - pad, toPy(0));
  ctx.moveTo(toPx(0), pad); ctx.lineTo(toPx(0), H - pad);
  ctx.stroke();

  // trace de l'orbite (fondu gris)
  ctx.strokeStyle = 'rgba(180,190,220,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  let started = false;
  for (const [x, y] of pts) {
    if (Math.abs(x) > 6 || Math.abs(y) > 6) { started = false; continue; }
    const X = toPx(x), Y = toPy(y);
    if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
  }
  ctx.stroke();

  // point critique z0 = 0 (croix blanche)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  const zx = toPx(0), zy = toPy(0);
  ctx.beginPath();
  ctx.moveTo(zx - 5, zy - 5); ctx.lineTo(zx + 5, zy + 5);
  ctx.moveTo(zx - 5, zy + 5); ctx.lineTo(zx + 5, zy - 5);
  ctx.stroke();

  // cycle détecté (gros points colorés)
  if (r.cycle.length && r.cycle.length < 200) {
    ctx.fillStyle = col;
    for (const [x, y] of r.cycle) {
      if (Math.abs(x) > 6 || Math.abs(y) > 6) continue;
      ctx.beginPath();
      ctx.arc(toPx(x), toPy(y), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText('orbite critique : 0 → c → c²+c → …', 8, 18);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('× = point critique 0', W - 8, H - 10);
}

// ---------- Interaction ----------
let dragging = false;
function pointerToC(e: PointerEvent) {
  const canvas = mapRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  cRe.value = RE_MIN + Math.max(0, Math.min(1, x)) * (RE_MAX - RE_MIN);
  cIm.value = IM_MAX - Math.max(0, Math.min(1, y)) * (IM_MAX - IM_MIN);
  drawOrbit();
  drawMarker();
}
function onDown(e: PointerEvent) { dragging = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pointerToC(e); }
function onMove(e: PointerEvent) { if (dragging) pointerToC(e); }
function onUp() { dragging = false; }

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const full = rect.width;
  const twoCol = full > 620;
  const panelW = twoCol ? Math.floor((full - 16) / 2) : full;
  const h = twoCol ? 320 : 300;
  mapW.value = panelW; mapH.value = h;
  orbW.value = panelW; orbH.value = h;
  nextTick(() => {
    if (mapRef.value) { mapRef.value.width = mapW.value; mapRef.value.height = mapH.value; }
    if (orbitRef.value) { orbitRef.value.width = orbW.value; orbitRef.value.height = orbH.value; }
    renderMap();
    drawOrbit();
  });
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
</script>

<template>
  <div ref="containerRef" style="display: flex; flex-direction: column; gap: 10px;">
    <!-- Bandeau de classification -->
    <div :style="{
      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      padding: '10px 14px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.04)',
      borderLeft: '4px solid ' + META[result.kind].color }">
      <span :style="{ fontSize: '17px', fontWeight: 700, color: META[result.kind].color }">
        {{ META[result.kind].label }}
      </span>
      <span style="font-size: 13px; font-family: monospace; color: #aaa;">
        c = {{ cRe.toFixed(4) }}{{ cIm >= 0 ? ' + ' : ' − ' }}{{ Math.abs(cIm).toFixed(4) }} i
      </span>
      <span v-if="result.period" style="font-size: 13px; font-family: monospace; color: #ddd;">
        période {{ result.period }}
      </span>
      <span v-if="result.lambda !== null" style="font-size: 13px; font-family: monospace; color: #ddd;">
        |λ| = {{ result.lambda < 1e-4 ? '0' : result.lambda.toFixed(4) }}
      </span>
    </div>
    <div style="font-size: 12.5px; color: #999; padding: 0 4px; margin-top: -4px;">
      {{ META[result.kind].note }}
    </div>

    <!-- Deux canvas côte à côte -->
    <div style="display: flex; flex-wrap: wrap; gap: 16px;">
      <canvas ref="mapRef" :width="mapW" :height="mapH"
        @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp"
        style="flex: 1 1 300px; border-radius: 6px; cursor: crosshair; touch-action: none; display: block; max-width: 100%;"></canvas>
      <canvas ref="orbitRef" :width="orbW" :height="orbH"
        style="flex: 1 1 300px; border-radius: 6px; display: block; max-width: 100%;"></canvas>
    </div>

    <!-- Préréglages -->
    <div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 0 4px;">
      <button v-for="p in presets" :key="p.name" @click="applyPreset(p)"
        style="font-size: 12px; font-family: monospace; padding: 4px 9px; border-radius: 5px;
               border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05);
               color: #cdd; cursor: pointer;">
        {{ p.name }}
      </button>
    </div>
  </div>
</template>
