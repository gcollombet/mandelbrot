<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(600);

// --- State ---
const zoomFactor = ref(1.0);        // current visual zoom (1.0 = no zoom, 2.0 = full step)
const targetZoom = ref(2.0);        // where we're zooming to (2.0 = zoom in, 0.5 = zoom out)
const computing = ref(false);       // is the new texture being computed?
const computeProgress = ref(0);     // 0..1, how much of the new texture is resolved
const playing = ref(false);
const mode = ref<'in' | 'out'>('in');

let animFrame: number | null = null;
let lastTime = 0;

// Fractal grids
const GRID = 64;
const CENTER_X = -0.5;
const CENTER_Y = 0.0;
const BASE_SCALE = 1.5;

// Pre-compute two fractal grids: one for current scale, one for next
function mandelbrot(cx: number, cy: number, maxIter: number): number {
  let zx = 0, zy = 0;
  let iter = 0;
  while (zx * zx + zy * zy < 4 && iter < maxIter) {
    const tmp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = tmp;
    iter++;
  }
  return iter / maxIter;
}

function iterColor(t: number): [number, number, number] {
  if (t >= 1.0) return [17, 17, 17];
  const r = Math.floor(40 + 215 * (0.5 + 0.5 * Math.sin(t * 12)));
  const g = Math.floor(20 + 180 * (0.5 + 0.5 * Math.sin(t * 12 + 2.1)));
  const b = Math.floor(60 + 195 * (0.5 + 0.5 * Math.sin(t * 12 + 4.2)));
  return [r, g, b];
}

// Generate a fractal grid at a given scale
function generateGrid(scale: number): Float32Array {
  const grid = new Float32Array(GRID * GRID);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const cx = CENTER_X + (gx / GRID - 0.5) * 2 * scale;
      const cy = CENTER_Y + (gy / GRID - 0.5) * 2 * scale;
      grid[gy * GRID + gx] = mandelbrot(cx, cy, 80);
    }
  }
  return grid;
}

// Pre-computed grids
let frozenGrid: Float32Array = generateGrid(BASE_SCALE);
let targetGrid: Float32Array = generateGrid(BASE_SCALE / 2); // zoomed in x2
let currentScale = BASE_SCALE;

// Pixels revealed in target grid (progressive computation simulation)
let revealedMask: Uint8Array = new Uint8Array(GRID * GRID);

function resetState() {
  currentScale = BASE_SCALE;
  frozenGrid = generateGrid(currentScale);
  mode.value = 'in';
  targetZoom.value = 2.0;
  zoomFactor.value = 1.0;
  computing.value = false;
  computeProgress.value = 0;
  revealedMask = new Uint8Array(GRID * GRID);
  targetGrid = generateGrid(currentScale / 2);
  draw();
}

function startZoomCycle() {
  if (mode.value === 'in') {
    targetGrid = generateGrid(currentScale / 2);
    targetZoom.value = 2.0;
  } else {
    targetGrid = generateGrid(currentScale * 2);
    targetZoom.value = 0.5;
  }
  zoomFactor.value = 1.0;
  computing.value = true;
  computeProgress.value = 0;
  revealedMask = new Uint8Array(GRID * GRID);
  // Start progressive reveal using sentinel-like pattern
  revealSentinelStep(0);
}

// Simulate sentinel progressive reveal: step 0 = every 32px, step 1 = every 16px, etc.
let revealStep = 0;
const REVEAL_STEPS = 6; // 32, 16, 8, 4, 2, 1

function revealSentinelStep(step: number) {
  revealStep = step;
  const spacing = Math.max(1, 32 >> step);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (gx % spacing === 0 && gy % spacing === 0) {
        revealedMask[gy * GRID + gx] = 1;
      }
    }
  }
  computeProgress.value = revealedMask.reduce((a, b) => a + b, 0) / (GRID * GRID);
}

const phaseLabel = computed(() => {
  if (!computing.value && zoomFactor.value === 1.0) return 'En attente';
  if (computing.value && zoomFactor.value < targetZoom.value && mode.value === 'in')
    return 'Zoom en cours + calcul progressif';
  if (computing.value && zoomFactor.value > targetZoom.value && mode.value === 'out')
    return 'Dézoom en cours + calcul progressif';
  if (!computing.value && zoomFactor.value >= 1.99 && mode.value === 'in')
    return 'Cycle terminé — la nouvelle texture devient la référence';
  if (!computing.value && zoomFactor.value <= 0.51 && mode.value === 'out')
    return 'Cycle terminé — la nouvelle texture devient la référence';
  return 'Transition';
});

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);

  const margin = 16;
  const headerH = 50;
  const footerH = 100;
  const panelGap = 20;

  // Three panels: Frozen | Blended Output | New Computation
  const panelCount = 3;
  const availW = W - 2 * margin - (panelCount - 1) * panelGap;
  const panelW = Math.floor(availW / panelCount);
  const availH = H - 2 * margin - headerH - footerH;
  const cellSize = Math.max(1, Math.min(Math.floor(panelW / GRID), Math.floor(availH / GRID)));
  const gridPx = cellSize * GRID;

  // Recalc panel width to match grid
  const actualPanelW = gridPx;
  const totalW = actualPanelW * 3 + panelGap * 2;
  const startX = Math.floor((W - totalW) / 2);

  const panelX = [
    startX,
    startX + actualPanelW + panelGap,
    startX + 2 * (actualPanelW + panelGap),
  ];
  const panelY = margin + headerH;

  const zf = zoomFactor.value;
  const isZoomIn = mode.value === 'in';

  // --- Panel 1: Frozen texture (zoomed) ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX[0], panelY, gridPx, gridPx);
  ctx.clip();

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const t = frozenGrid[gy * GRID + gx];
      const [r, g, b] = iterColor(t);

      // Apply visual zoom: when zooming in, the frozen texture appears to grow
      // When zooming out, it appears to shrink
      const cx = GRID / 2;
      const cy = GRID / 2;
      const sx = (gx - cx) * zf + cx;
      const sy = (gy - cy) * zf + cy;

      const px = panelX[0] + sx * cellSize;
      const py = panelY + sy * cellSize;
      const size = cellSize * zf;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, size, size);
    }
  }
  ctx.restore();

  // --- Panel 3: New computation (at target scale, progressive) ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX[2], panelY, gridPx, gridPx);
  ctx.clip();

  // The new texture is being computed at the target zoom level
  // It's displayed scaled inversely: if we're zooming in x2,
  // at zoomFactor=1 it appears at 0.5x (small), growing to 1x as zoomFactor reaches 2
  const newScale = isZoomIn ? zf / targetZoom.value : zf / targetZoom.value;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const revealed = revealedMask[gy * GRID + gx] === 1;

      const cx = GRID / 2;
      const cy = GRID / 2;
      const sx = (gx - cx) * newScale + cx;
      const sy = (gy - cy) * newScale + cy;

      const px = panelX[2] + sx * cellSize;
      const py = panelY + sy * cellSize;
      const size = cellSize * newScale;

      if (revealed) {
        const t = targetGrid[gy * GRID + gx];
        const [r, g, b] = iterColor(t);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        ctx.fillStyle = 'rgba(30, 20, 40, 0.6)';
      }
      ctx.fillRect(px, py, Math.max(1, size), Math.max(1, size));
    }
  }
  ctx.restore();

  // --- Panel 2: Blended output (what the user sees) ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX[1], panelY, gridPx, gridPx);
  ctx.clip();

  // Create offscreen buffer for blending
  for (let screenY = 0; screenY < gridPx; screenY++) {
    for (let screenX = 0; screenX < gridPx; screenX++) {
      // Map screen pixel back to frozen texture coords
      const cx = gridPx / 2;
      const cy = gridPx / 2;

      // Frozen texture: inverse zoom to find source pixel
      const frozenSrcX = (screenX - cx) / zf + cx;
      const frozenSrcY = (screenY - cy) / zf + cy;
      const fgx = Math.floor(frozenSrcX / cellSize);
      const fgy = Math.floor(frozenSrcY / cellSize);

      // New texture: inverse scale to find source pixel
      const newSrcX = (screenX - cx) / newScale + cx;
      const newSrcY = (screenY - cy) / newScale + cy;
      const ngx = Math.floor(newSrcX / cellSize);
      const ngy = Math.floor(newSrcY / cellSize);

      let r = 0, g = 0, b = 0;
      let hasNew = false;

      // Check if new texture pixel is available
      if (ngx >= 0 && ngx < GRID && ngy >= 0 && ngy < GRID) {
        if (revealedMask[ngy * GRID + ngx] === 1) {
          const t = targetGrid[ngy * GRID + ngx];
          [r, g, b] = iterColor(t);
          hasNew = true;
        }
      }

      if (!hasNew) {
        // Fall back to frozen texture
        if (fgx >= 0 && fgx < GRID && fgy >= 0 && fgy < GRID) {
          const t = frozenGrid[fgy * GRID + fgx];
          [r, g, b] = iterColor(t);
        } else {
          r = 20; g = 15; b = 30;
        }
      }

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(panelX[1] + screenX, panelY + screenY, 1, 1);
    }
  }
  ctx.restore();

  // --- Borders ---
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.strokeRect(panelX[i], panelY, gridPx, gridPx);
  }

  // Highlight active panel
  ctx.strokeStyle = '#50b4ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX[1], panelY, gridPx, gridPx);

  // --- Labels ---
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#f0a040';
  ctx.fillText('Texture figée (zoom visuel)', panelX[0] + gridPx / 2, panelY - 8);

  ctx.fillStyle = '#50b4ff';
  ctx.fillText('Résultat affiché (blend)', panelX[1] + gridPx / 2, panelY - 8);

  ctx.fillStyle = '#60d060';
  ctx.fillText('Nouveau calcul (progressif)', panelX[2] + gridPx / 2, panelY - 8);

  // --- Header ---
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'center';
  ctx.fillText('Reprojection de zoom — double texture', W / 2, margin + 14);

  ctx.font = '12px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText(phaseLabel.value, W / 2, margin + 32);

  // --- Footer info ---
  const footY = panelY + gridPx + 20;

  ctx.font = '12px monospace';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#f0a040';
  ctx.fillText(`Zoom visuel : x${zf.toFixed(2)} (${mode.value === 'in' ? 'zoom in' : 'zoom out'})`, W / 2, footY);

  ctx.fillStyle = '#60d060';
  ctx.fillText(`Calcul progressif : ${(computeProgress.value * 100).toFixed(0)}% résolu`, W / 2, footY + 18);

  ctx.fillStyle = '#aaa';
  ctx.fillText(
    `Échelle : ${currentScale.toFixed(4)} → ${(isZoomIn ? currentScale / 2 : currentScale * 2).toFixed(4)}`,
    W / 2, footY + 36
  );

  // --- Zoom progress bar ---
  const barY = footY + 50;
  const barW = Math.min(400, W - 60);
  const barH = 12;
  const barX = (W - barW) / 2;

  // Background
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barW, barH);

  // Zoom progress
  const zProgress = isZoomIn
    ? Math.max(0, Math.min(1, (zf - 1) / 1))
    : Math.max(0, Math.min(1, (1 - zf) / 0.5));
  ctx.fillStyle = '#f0a040';
  ctx.fillRect(barX, barY, barW * zProgress, barH / 2);

  // Compute progress
  ctx.fillStyle = '#60d060';
  ctx.fillRect(barX, barY + barH / 2, barW * computeProgress.value, barH / 2);

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.font = '10px monospace';
  ctx.fillStyle = '#f0a040';
  ctx.textAlign = 'left';
  ctx.fillText('zoom', barX, barY - 3);
  ctx.fillStyle = '#60d060';
  ctx.textAlign = 'right';
  ctx.fillText('calcul', barX + barW, barY - 3);
}

function animate(timestamp: number) {
  if (!playing.value) return;

  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  lastTime = timestamp;

  const isZoomIn = mode.value === 'in';
  const speed = 0.4; // zoom speed (reaches x2 in ~2.5 seconds)

  if (isZoomIn) {
    // Zoom in: zoomFactor goes from 1.0 to 2.0
    if (zoomFactor.value < 2.0) {
      zoomFactor.value = Math.min(2.0, zoomFactor.value + speed * dt);

      // Progressive reveal synced with zoom progress
      const progress = (zoomFactor.value - 1.0) / 1.0;
      const step = Math.min(REVEAL_STEPS - 1, Math.floor(progress * REVEAL_STEPS));
      if (step > revealStep) {
        revealSentinelStep(step);
      }
    }

    // Cycle complete
    if (zoomFactor.value >= 2.0 && computeProgress.value >= 0.99) {
      computing.value = false;
      // Swap: new grid becomes frozen
      currentScale /= 2;
      frozenGrid = targetGrid;
      zoomFactor.value = 1.0;
      revealStep = 0;
      // Auto-continue or stop
      if (currentScale > BASE_SCALE / 32) {
        startZoomCycle();
      } else {
        playing.value = false;
      }
    }
  } else {
    // Zoom out: zoomFactor goes from 1.0 to 0.5
    if (zoomFactor.value > 0.5) {
      zoomFactor.value = Math.max(0.5, zoomFactor.value - speed * dt);

      const progress = (1.0 - zoomFactor.value) / 0.5;
      const step = Math.min(REVEAL_STEPS - 1, Math.floor(progress * REVEAL_STEPS));
      if (step > revealStep) {
        revealSentinelStep(step);
      }
    }

    if (zoomFactor.value <= 0.5 && computeProgress.value >= 0.99) {
      computing.value = false;
      currentScale *= 2;
      frozenGrid = targetGrid;
      zoomFactor.value = 1.0;
      revealStep = 0;
      if (currentScale < BASE_SCALE * 8) {
        startZoomCycle();
      } else {
        playing.value = false;
      }
    }
  }

  draw();
  animFrame = requestAnimationFrame(animate);
}

function togglePlay() {
  if (playing.value) {
    playing.value = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
  } else {
    playing.value = true;
    if (zoomFactor.value === 1.0 && !computing.value) {
      startZoomCycle();
    }
    lastTime = 0;
    animFrame = requestAnimationFrame(animate);
  }
}

function setMode(m: 'in' | 'out') {
  const wasPlaying = playing.value;
  if (wasPlaying) {
    playing.value = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  mode.value = m;
  resetState();
  if (m === 'out') {
    // Start zoomed in so we can zoom out
    currentScale = BASE_SCALE / 4;
    frozenGrid = generateGrid(currentScale);
  }
  if (wasPlaying) {
    togglePlay();
  }
}

function stepForward() {
  if (!computing.value) {
    startZoomCycle();
  }
  const isZoomIn = mode.value === 'in';
  const speed = isZoomIn ? 0.15 : -0.075;
  zoomFactor.value = Math.max(0.5, Math.min(2.0, zoomFactor.value + speed));

  const progress = isZoomIn
    ? (zoomFactor.value - 1.0) / 1.0
    : (1.0 - zoomFactor.value) / 0.5;
  const step = Math.min(REVEAL_STEPS - 1, Math.floor(Math.max(0, progress) * REVEAL_STEPS));
  if (step > revealStep) {
    revealSentinelStep(step);
  }
  draw();
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

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame);
});
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 8px; padding: 0 4px; flex-wrap: wrap;">
      <button @click="togglePlay" style="font-size: 14px; font-family: monospace; padding: 4px 12px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px; min-width: 32px;">
        {{ playing ? '⏸' : '▶' }}
      </button>
      <button @click="stepForward" :disabled="playing" style="font-size: 12px; font-family: monospace; padding: 4px 10px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px;">
        Step →
      </button>
      <button @click="() => resetState()" style="font-size: 12px; font-family: monospace; padding: 4px 10px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px;">
        Réinitialiser
      </button>
      <span style="border-left: 1px solid #555; height: 20px; margin: 0 4px;" />
      <button @click="() => setMode('in')" :style="{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 10px', cursor: 'pointer', background: mode === 'in' ? '#2a4a6a' : '#333', color: mode === 'in' ? '#8cf' : '#aaa', border: '1px solid ' + (mode === 'in' ? '#50b4ff' : '#555'), borderRadius: '4px' }">
        Zoom In
      </button>
      <button @click="() => setMode('out')" :style="{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 10px', cursor: 'pointer', background: mode === 'out' ? '#2a4a6a' : '#333', color: mode === 'out' ? '#8cf' : '#aaa', border: '1px solid ' + (mode === 'out' ? '#50b4ff' : '#555'), borderRadius: '4px' }">
        Zoom Out
      </button>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 600px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
