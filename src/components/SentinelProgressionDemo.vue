<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(500);

// Grille logique 64x64 (chaque cellule = 1 pixel de la texture)
const GRID = 64;
const SEED_STEP = 64; // pas initial

const frame = ref(0); // 0 = pas encore démarré, 1..7 = étapes de raffinement
const playing = ref(false);
let animTimer: ReturnType<typeof setInterval> | null = null;

// Calcul du step pour chaque frame
function stepForFrame(f: number): number {
  if (f <= 0) return SEED_STEP;
  let s = SEED_STEP;
  for (let i = 1; i < f; i++) {
    s = Math.max(1, Math.floor(s / 2));
  }
  return s;
}

// Couleur pseudo-Mandelbrot basée sur la coordonnée
function fractalValue(gx: number, gy: number): number {
  // Simulate Mandelbrot-ish pattern
  const cx = (gx / GRID) * 3.5 - 2.5;
  const cy = (gy / GRID) * 2.6 - 1.3;
  let zx = 0, zy = 0;
  let iter = 0;
  const maxIter = 40;
  while (zx * zx + zy * zy < 4 && iter < maxIter) {
    const tmp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = tmp;
    iter++;
  }
  return iter / maxIter;
}

function iterColor(t: number): string {
  if (t >= 1.0) return '#111'; // dans l'ensemble
  const r = Math.floor(40 + 215 * (0.5 + 0.5 * Math.sin(t * 12)));
  const g = Math.floor(20 + 180 * (0.5 + 0.5 * Math.sin(t * 12 + 2.1)));
  const b = Math.floor(60 + 195 * (0.5 + 0.5 * Math.sin(t * 12 + 4.2)));
  return `rgb(${r},${g},${b})`;
}

// Returns the status of each pixel: 'computed', 'resolved', or 'empty'
function pixelStatus(gx: number, gy: number, currentFrame: number): 'computed' | 'resolved' | 'empty' {
  if (currentFrame <= 0) return 'empty';

  // Check all frames from 1 to currentFrame: was this pixel ever an anchor?
  let step = SEED_STEP;
  for (let f = 1; f <= currentFrame; f++) {
    if (f === 1) {
      // Frame 1: anchors at step SEED_STEP
      if (gx % SEED_STEP === 0 && gy % SEED_STEP === 0) return 'computed';
    } else {
      // Frame f: new anchors at step/2 that weren't anchors before
      const newStep = Math.max(1, Math.floor(step / 2));
      if (gx % newStep === 0 && gy % newStep === 0) {
        // Was it already computed at previous step?
        if (!(gx % step === 0 && gy % step === 0)) {
          return 'computed'; // newly computed at this frame
        }
        // else: was already computed
        return 'computed';
      }
      step = newStep;
    }
  }

  // Not computed → resolved via snapping if currentFrame > 0
  return 'resolved';
}

// Find the nearest computed anchor for a resolved pixel
function snapParent(gx: number, gy: number, currentFrame: number): { px: number, py: number } {
  let step = SEED_STEP;
  for (let f = 1; f < currentFrame; f++) {
    step = Math.max(1, Math.floor(step / 2));
  }
  // Snap to grid of current step (like the bitmask trick)
  const mask = ~(step - 1);
  const baseX = gx & mask;
  const baseY = gy & mask;
  // Just snap to base corner (simplification of 4-corner search)
  return { px: Math.min(baseX, GRID - 1), py: Math.min(baseY, GRID - 1) };
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);

  const margin = 20;
  const headerH = 24;
  const footerH = 60;
  const availH = H - 2 * margin - headerH - footerH;
  const availW = W - 2 * margin;
  const cellSize = Math.max(1, Math.min(Math.floor(availW / GRID), Math.floor(availH / GRID)));
  const gridPx = cellSize * GRID;

  const gridX = Math.floor((W - gridPx) / 2);
  const gridY = margin + headerH;

  const currentStep = stepForFrame(frame.value);
  const f = frame.value;

  // Precompute fractal values (cached feel)
  // Draw cells
  let computedCount = 0;
  let resolvedCount = 0;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = gridX + gx * cellSize;
      const py = gridY + gy * cellSize;

      if (f <= 0) {
        // Empty state
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(px, py, cellSize, cellSize);
        continue;
      }

      const status = pixelStatus(gx, gy, f);

      if (status === 'computed') {
        const t = fractalValue(gx, gy);
        ctx.fillStyle = iterColor(t);
        ctx.fillRect(px, py, cellSize, cellSize);
        computedCount++;
      } else {
        // Resolved: snap to nearest parent
        const parent = snapParent(gx, gy, f);
        const t = fractalValue(parent.px, parent.py);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = iterColor(t);
        ctx.fillRect(px, py, cellSize, cellSize);
        ctx.globalAlpha = 1.0;
        resolvedCount++;
      }
    }
  }

  // Grid lines for current step (show the subdivision)
  if (f > 0 && currentStep >= 2 && cellSize >= 3) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i += currentStep) {
      ctx.beginPath();
      ctx.moveTo(gridX + i * cellSize, gridY);
      ctx.lineTo(gridX + i * cellSize, gridY + gridPx);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gridX, gridY + i * cellSize);
      ctx.lineTo(gridX + gridPx, gridY + i * cellSize);
      ctx.stroke();
    }
  }

  // Border
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(gridX, gridY, gridPx, gridPx);

  // Header
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aaa';
  if (f <= 0) {
    ctx.fillText('Appuyez sur ▶ ou "Frame suivante" pour commencer l\'ensemencement', W / 2, margin + 14);
  } else {
    ctx.fillText(
      `Frame ${f}/7 — Pas de la grille : ${currentStep} — Pixels calculés : ${computedCount}/${GRID * GRID}`,
      W / 2, margin + 14
    );
  }

  // Footer
  const total = GRID * GRID;
  const bottomY = gridY + gridPx + 16;
  ctx.font = '12px monospace';

  if (f > 0) {
    const pctComputed = ((computedCount / total) * 100).toFixed(1);
    const pctResolved = ((resolvedCount / total) * 100).toFixed(1);

    ctx.fillStyle = '#50b4ff';
    ctx.fillText(`Pixels calculés : ${computedCount} (${pctComputed}%)`, W / 2, bottomY);

    ctx.fillStyle = 'rgba(140, 140, 200, 0.8)';
    ctx.fillText(`Pixels résolus (snappés, semi-transparents) : ${resolvedCount} (${pctResolved}%)`, W / 2, bottomY + 18);
  }

  // Légende couleurs
  ctx.fillStyle = '#666';
  ctx.fillText('■ opaque = calculé    ■ semi-transparent = résolu par snapping', W / 2, bottomY + 38);
}

function nextFrame() {
  if (frame.value < 7) {
    frame.value++;
    draw();
  } else {
    stopPlay();
  }
}

function prevFrame() {
  if (frame.value > 0) {
    frame.value--;
    draw();
  }
}

function resetFrames() {
  stopPlay();
  frame.value = 0;
  draw();
}

function togglePlay() {
  if (playing.value) {
    stopPlay();
  } else {
    playing.value = true;
    if (frame.value >= 7) frame.value = 0;
    animTimer = setInterval(() => {
      if (frame.value < 7) {
        frame.value++;
        draw();
      } else {
        stopPlay();
      }
    }, 800);
  }
}

function stopPlay() {
  playing.value = false;
  if (animTimer) {
    clearInterval(animTimer);
    animTimer = null;
  }
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
  });
});
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 8px; padding: 0 4px; flex-wrap: wrap;">
      <button @click="togglePlay" style="font-size: 14px; font-family: monospace; padding: 4px 12px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px; min-width: 32px;">
        {{ playing ? '⏸' : '▶' }}
      </button>
      <button @click="prevFrame" :disabled="frame <= 0" style="font-size: 12px; font-family: monospace; padding: 4px 10px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px;">
        ← Précédent
      </button>
      <button @click="nextFrame" :disabled="frame >= 7" style="font-size: 12px; font-family: monospace; padding: 4px 10px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px;">
        Frame suivante →
      </button>
      <button @click="resetFrames" style="font-size: 12px; font-family: monospace; padding: 4px 10px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px;">
        Réinitialiser
      </button>
      <span style="font-size: 12px; font-family: monospace; color: #888; margin-left: 8px;">
        Frame {{ frame }}/7
      </span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 500px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
