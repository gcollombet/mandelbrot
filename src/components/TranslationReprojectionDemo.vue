<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(420);

const GRID = 10; // grille 10x10
const shiftX = ref(0);
const shiftY = ref(0);
const dragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const dragShiftStart = ref({ x: 0, y: 0 });

// Couleur pseudo-Mandelbrot basée sur la position
function cellColor(gx: number, gy: number): string {
  const t = ((gx * 7 + gy * 13) % 17) / 17;
  const r = Math.floor(40 + 180 * (0.5 + 0.5 * Math.sin(t * 6.28)));
  const g = Math.floor(40 + 120 * (0.5 + 0.5 * Math.sin(t * 6.28 + 2.1)));
  const b = Math.floor(80 + 160 * (0.5 + 0.5 * Math.sin(t * 6.28 + 4.2)));
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

  const margin = 24;
  const availW = (W - 3 * margin) / 2;
  const availH = H - 2 * margin - 40; // space for labels
  const cellSize = Math.floor(Math.min(availW, availH) / GRID);
  const gridPx = cellSize * GRID;

  const leftX = margin;
  const rightX = margin + gridPx + margin;
  const topY = margin + 20;

  const sx = Math.round(shiftX.value);
  const sy = Math.round(shiftY.value);

  // Titres
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Frame précédente', leftX + gridPx / 2, topY - 6);
  ctx.fillText('Après reprojection', rightX + gridPx / 2, topY - 6);

  // --- Grille GAUCHE (frame précédente, toutes les cellules colorées) ---
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = leftX + gx * cellSize;
      const py = topY + gy * cellSize;
      ctx.fillStyle = cellColor(gx, gy);
      ctx.fillRect(px, py, cellSize - 1, cellSize - 1);
    }
  }

  // --- Grille DROITE (après décalage) ---
  let kept = 0;
  let sentinel = 0;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = rightX + gx * cellSize;
      const py = topY + gy * cellSize;

      // coord_in = coord_out - shift (exactement comme le shader)
      const srcX = gx - sx;
      const srcY = gy - sy;

      if (srcX < 0 || srcY < 0 || srcX >= GRID || srcY >= GRID) {
        // Pixel hors limites → sentinelle
        ctx.fillStyle = 'rgba(255, 60, 60, 0.35)';
        ctx.fillRect(px, py, cellSize - 1, cellSize - 1);
        // croix rouge
        ctx.strokeStyle = '#ff3c3c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + cellSize - 4, py + cellSize - 4);
        ctx.moveTo(px + cellSize - 4, py + 3);
        ctx.lineTo(px + 3, py + cellSize - 4);
        ctx.stroke();
        sentinel++;
      } else {
        // Pixel conservé (copie depuis la source décalée)
        ctx.fillStyle = cellColor(srcX, srcY);
        ctx.fillRect(px, py, cellSize - 1, cellSize - 1);
        kept++;
      }
    }
  }

  // Contours des deux grilles
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(leftX, topY, gridPx, gridPx);
  ctx.strokeRect(rightX, topY, gridPx, gridPx);

  // Flèche de décalage au milieu
  if (sx !== 0 || sy !== 0) {
    const arrowStartX = leftX + gridPx + 8;
    const arrowEndX = rightX - 8;
    const arrowY = topY + gridPx / 2;
    ctx.strokeStyle = '#50b4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowY);
    ctx.lineTo(arrowEndX, arrowY);
    ctx.stroke();
    // pointe
    ctx.fillStyle = '#50b4ff';
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowY);
    ctx.lineTo(arrowEndX - 8, arrowY - 5);
    ctx.lineTo(arrowEndX - 8, arrowY + 5);
    ctx.closePath();
    ctx.fill();
  }

  // Légendes en bas
  const total = GRID * GRID;
  const keptPct = ((kept / total) * 100).toFixed(1);
  const sentPct = ((sentinel / total) * 100).toFixed(1);

  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  const bottomY = topY + gridPx + 20;

  ctx.fillStyle = cellColor(3, 3);
  ctx.fillText(`Pixels conservés : ${kept}/${total} (${keptPct}%)`, W / 2, bottomY);

  ctx.fillStyle = '#ff3c3c';
  ctx.fillText(`Sentinelles (à recalculer) : ${sentinel}/${total} (${sentPct}%)`, W / 2, bottomY + 18);

  ctx.fillStyle = '#50b4ff';
  ctx.fillText(`Décalage : (${sx}, ${sy})  — Glissez sur la grille de droite pour déplacer`, W / 2, bottomY + 38);
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

function onMouseDown(e: MouseEvent) {
  dragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY };
  dragShiftStart.value = { x: shiftX.value, y: shiftY.value };
}
function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return;
  const cellSize = Math.floor(
    Math.min((width.value - 72) / 2, height.value - 88) / GRID
  );
  const dx = e.clientX - dragStart.value.x;
  const dy = e.clientY - dragStart.value.y;
  shiftX.value = Math.round(
    Math.max(-GRID + 1, Math.min(GRID - 1, dragShiftStart.value.x + dx / cellSize))
  );
  shiftY.value = Math.round(
    Math.max(-GRID + 1, Math.min(GRID - 1, dragShiftStart.value.y + dy / cellSize))
  );
  draw();
}
function onMouseUp() {
  dragging.value = false;
}

function onReset() {
  shiftX.value = 0;
  shiftY.value = 0;
  draw();
}

onMounted(() => {
  nextTick(() => {
    updateSize();
    if (containerRef.value) {
      const ro = new ResizeObserver(() => updateSize());
      ro.observe(containerRef.value);
    }
    if (canvasRef.value) {
      canvasRef.value.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  });
});
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px;">
      <button @click="onReset" style="font-size: 12px; font-family: monospace; padding: 4px 10px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #555; border-radius: 4px;">
        Réinitialiser
      </button>
      <span style="font-size: 12px; font-family: monospace; color: #888;">
        Glissez sur le canvas pour simuler un pan (translation)
      </span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 420px; cursor: grab;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
