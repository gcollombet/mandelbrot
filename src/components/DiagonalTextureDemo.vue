<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(400);

const angle = ref(0);

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);

  // On dessine dans un repère centré avec une marge
  const margin = 40;
  const drawW = W - 2 * margin;
  const drawH = H - 2 * margin;
  const drawSize = Math.min(drawW, drawH);

  ctx.save();
  ctx.translate(W / 2, H / 2);

  // Dimensions relatives de l'écran (rectangle) dans le repère de dessin
  // On simule un écran 16:9 inscrit dans le carré neutre
  const screenAspect = 16 / 9;
  const diag = Math.sqrt(screenAspect * screenAspect + 1);
  const squareSide = drawSize;
  const rectW = (screenAspect / diag) * squareSide;
  const rectH = (1 / diag) * squareSide;

  // 1. Fond grisé : la texture neutre carrée
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(-squareSide / 2, -squareSide / 2, squareSide, squareSide);

  // 2. Grille sur la texture neutre (les "pixels" stockés)
  const gridStep = squareSide / 16;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 0.5;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridStep, -squareSide / 2);
    ctx.lineTo(i * gridStep, squareSide / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-squareSide / 2, i * gridStep);
    ctx.lineTo(squareSide / 2, i * gridStep);
    ctx.stroke();
  }

  // 3. Contour du carré neutre (pointillé)
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#8888cc';
  ctx.lineWidth = 2;
  ctx.strokeRect(-squareSide / 2, -squareSide / 2, squareSide, squareSide);
  ctx.setLineDash([]);

  // 4. Zone visible après rotation : le rectangle de l'écran, roté
  const rad = (angle.value * Math.PI) / 180;
  ctx.save();
  ctx.rotate(rad);

  // Fond visible (l'écran)
  ctx.fillStyle = 'rgba(80, 180, 255, 0.2)';
  ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);

  // Contour de l'écran
  ctx.strokeStyle = '#50b4ff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

  ctx.restore();

  // 5. Légendes
  ctx.restore();

  // Texte en bas
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#8888cc';
  ctx.fillText(`Texture neutre : ${squareSide.toFixed(0)}×${squareSide.toFixed(0)}px (carré = diagonale)`, W / 2, H - 8);

  ctx.fillStyle = '#50b4ff';
  ctx.fillText(`Ecran : ${rectW.toFixed(0)}×${rectH.toFixed(0)}px — rotation ${angle.value}°`, W / 2, H - 26);

  // Formule en haut
  ctx.fillStyle = '#aaa';
  ctx.font = '12px monospace';
  ctx.fillText(`neutralSize = ceil(sqrt(W² + H²)) = ceil(sqrt(${rectW.toFixed(0)}² + ${rectH.toFixed(0)}²)) = ${squareSide.toFixed(0)}`, W / 2, 16);
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

function onAngleInput(e: Event) {
  angle.value = parseFloat((e.target as HTMLInputElement).value);
  draw();
}
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px;">
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">Angle :</label>
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
    <div ref="containerRef" style="position: relative; width: 100%; height: 400px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
