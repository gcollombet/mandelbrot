<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(420);
const angle = ref(0);

const GRID = 16; // grille 16x16 sur la texture neutre

// Couleur pseudo-Mandelbrot basée sur la position dans la texture neutre
function cellColor(gx: number, gy: number): string {
  // Distance au centre pour simuler un motif fractal
  const cx = gx - GRID / 2;
  const cy = gy - GRID / 2;
  const d = Math.sqrt(cx * cx + cy * cy) / (GRID / 2);
  const t = ((gx * 7 + gy * 11) % 19) / 19;
  const r = Math.floor(30 + 200 * (0.5 + 0.5 * Math.sin(d * 4 + t * 3)));
  const g = Math.floor(20 + 140 * (0.5 + 0.5 * Math.sin(d * 5 + t * 5 + 2)));
  const b = Math.floor(60 + 180 * (0.5 + 0.5 * Math.sin(d * 3 + t * 7 + 4)));
  return `rgb(${r},${g},${b})`;
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);

  const margin = 30;
  const drawSize = Math.min(W - 2 * margin, H - 2 * margin - 30);
  const cellSize = Math.floor(drawSize / GRID);
  const gridPx = cellSize * GRID;

  const centerX = W / 2;
  const centerY = margin + 15 + gridPx / 2;

  // Simulated screen aspect 16:9
  const screenAspect = 16 / 9;
  const diag = Math.sqrt(screenAspect * screenAspect + 1);
  const rectW = (screenAspect / diag) * gridPx;
  const rectH = (1 / diag) * gridPx;
  const rad = (angle.value * Math.PI) / 180;

  // For each cell in the neutral texture, determine if it's inside the rotated screen
  function isInsideScreen(gx: number, gy: number): boolean {
    // Map grid coords to neutral UV [-1, 1]
    const nx = ((gx + 0.5) / GRID) * 2 - 1;
    const ny = ((gy + 0.5) / GRID) * 2 - 1;
    // Apply inverse rotation (rotate by -angle)
    const cosA = Math.cos(-rad);
    const sinA = Math.sin(-rad);
    const neutralExtent = diag;
    const lx = nx * neutralExtent;
    const ly = ny * neutralExtent;
    const rx = cosA * lx - sinA * ly;
    const ry = sinA * lx + cosA * ly;
    return Math.abs(rx) <= screenAspect && Math.abs(ry) <= 1.0;
  }

  const gridOriginX = centerX - gridPx / 2;
  const gridOriginY = centerY - gridPx / 2;

  let visibleCount = 0;
  let hiddenCount = 0;

  // Draw cells
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = gridOriginX + gx * cellSize;
      const py = gridOriginY + gy * cellSize;
      const inside = isInsideScreen(gx, gy);

      ctx.globalAlpha = inside ? 1.0 : 0.15;
      ctx.fillStyle = cellColor(gx, gy);
      ctx.fillRect(px, py, cellSize - 1, cellSize - 1);

      if (inside) visibleCount++;
      else hiddenCount++;
    }
  }
  ctx.globalAlpha = 1.0;

  // Contour de la texture neutre (pointillé)
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#8888cc';
  ctx.lineWidth = 2;
  ctx.strokeRect(gridOriginX, gridOriginY, gridPx, gridPx);
  ctx.setLineDash([]);

  // Rectangle de l'écran (roté)
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rad);
  ctx.strokeStyle = '#50b4ff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);
  ctx.restore();

  // Légendes
  const total = GRID * GRID;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  const bottomY = gridOriginY + gridPx + 16;

  ctx.fillStyle = '#50b4ff';
  ctx.fillText(
    `Rotation : ${angle.value}° — Pixels visibles : ${visibleCount}/${total} — Zéro recalcul`,
    W / 2, bottomY
  );

  ctx.fillStyle = '#8888cc';
  ctx.fillText(
    `Pixels hors écran (atténués) : ${hiddenCount}/${total} — pas raffinés, mais prêts si on tourne`,
    W / 2, bottomY + 18
  );
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

function onAngleInput(e: Event) {
  angle.value = parseFloat((e.target as HTMLInputElement).value);
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
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px;">
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Rotation :</label>
      <input
        type="range"
        min="-180"
        max="180"
        step="1"
        :value="angle"
        @input="onAngleInput"
        style="flex: 1;"
      />
      <span style="font-size: 13px; font-family: monospace; min-width: 50px; text-align: right; color: #aaa;">{{ angle }}°</span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 420px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
