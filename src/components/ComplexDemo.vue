<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const width = ref(500);
const height = ref(500);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// Plan complexe centré sur (0,0), [-range, range] sur chaque axe
const range = ref(2);
const mouse = ref({ x: width.value / 2, y: height.value / 2 });
const z = ref({ re: 0, im: 0 });

function pixelToComplex(x: number, y: number) {
  // Centre du canvas = (0,0) complexe
  const re = ((x / width.value) - 0.5) * 2 * range.value;
  const im = (0.5 - (y / height.value)) * 2 * range.value;
  return { re, im };
}
function complexToPixel(re: number, im: number) {
  const x = ((re / range.value) / 2 + 0.5) * width.value;
  const y = ((0.5 - (im / range.value) / 2)) * height.value;
  return { x, y };
}
function drawArrow(ctx: CanvasRenderingContext2D, from: {x:number, y:number}, to: {x:number, y:number}, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  // Flèche
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    const ux = dx / len;
    const uy = dy / len;
    const arrowSize = 12;
    const px = to.x - arrowSize * ux;
    const py = to.y - arrowSize * uy;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(px + 5 * uy, py - 5 * ux);
    ctx.lineTo(px - 5 * uy, py + 5 * ux);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, width.value, height.value);
  // Axes
  const zeroPx = complexToPixel(0, 0);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(zeroPx.x, 0);
  ctx.lineTo(zeroPx.x, height.value);
  ctx.moveTo(0, zeroPx.y);
  ctx.lineTo(width.value, zeroPx.y);
  ctx.stroke();
  // Curseur
  const zPx = complexToPixel(z.value.re, z.value.im);
  ctx.beginPath();
  ctx.arc(zPx.x, zPx.y, 6, 0, 2 * Math.PI);
  ctx.fillStyle = 'red';
  ctx.fill();
  ctx.font = '14px monospace';
  ctx.fillStyle = 'red';
  ctx.fillText(`z = (${z.value.re.toFixed(3)}, ${z.value.im.toFixed(3)})`, zPx.x + 10, zPx.y + 10);

  // Arc de cercle pour l'argument de z
  const r = Math.hypot(z.value.re, z.value.im);
  const theta = Math.atan2(z.value.im, z.value.re);
  if (r > 0.01) {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Arc centré sur (0,0), rayon r, de 0 à theta (sens horaire)
    const center = zeroPx;
    let endAngle = theta;
    if (endAngle < 0) endAngle += 2 * Math.PI;
    ctx.arc(center.x, center.y, 30,  -endAngle, 0, false);

    ctx.stroke();
    ctx.restore();
  }
  // Vecteur z^2
  const z2 = {
    re: z.value.re * z.value.re - z.value.im * z.value.im,
    im: 2 * z.value.re * z.value.im
  };
  const z2Px = complexToPixel(z2.re, z2.im);
  drawArrow(ctx, zeroPx, z2Px, 'blue');
  ctx.fillStyle = 'blue';
  ctx.fillText(`z² = (${z2.re.toFixed(3)}, ${z2.im.toFixed(3)})`, z2Px.x + 10, z2Px.y + 10);
  // Vecteur z+z
  const zadd = {
    re: z.value.re + z.value.re,
    im: z.value.im + z.value.im
  };
  const zaddPx = complexToPixel(zadd.re, zadd.im);
  drawArrow(ctx, zeroPx, zaddPx, 'green');
  // Vecteur z
  ctx.save();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(zeroPx.x, zeroPx.y);
  ctx.lineTo(zPx.x, zPx.y);
  ctx.stroke();
  ctx.restore();
  drawArrow(ctx, zeroPx, zPx, 'red');
  ctx.fillStyle = 'green';
  ctx.fillText(`z+z = (${zadd.re.toFixed(3)}, ${zadd.im.toFixed(3)})`, zaddPx.x + 10, zaddPx.y + 10);
}
function handleMouseMove(e: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  mouse.value = { x, y };
  z.value = pixelToComplex(x, y);
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
  mouse.value = { x: width.value / 2, y: height.value / 2 };
  z.value = pixelToComplex(mouse.value.x, mouse.value.y);
  draw();
}
onMounted(() => {
  nextTick(() => {
    updateSize();
    draw();
    if (canvasRef.value) {
      canvasRef.value.addEventListener('mousemove', handleMouseMove);
    }
    if (containerRef.value) {
      const resizeObserver = new window.ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(containerRef.value);
    }
    z.value = pixelToComplex(mouse.value.x, mouse.value.y);
    draw();
  });
});
</script>
<template>
  <div ref="containerRef" style="position: relative; width: 100%; height: 500px;">
    <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
  </div>
</template>
