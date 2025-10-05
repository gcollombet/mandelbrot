<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import Mandelbrot from './Mandelbrot.vue';

const props = defineProps<{
  scale?: string;
  angle?: string;
  cx?: string;
  cy?: string;
  showMandelbrot?: boolean;
  showOrbitLabels?: boolean;
  orbitIterations?: number;
  showOrbitVectors?: boolean;
  showPalette?: boolean; // nouvelle prop
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const width = ref(600);
const height = ref(600);

const mouse = ref({ x: width.value / 2, y: height.value / 2 });
const c = ref<{ re: number; im: number }>({ re: 0, im: 0 });
const orbit = ref<{ re: number, im: number }[]>([]);

function pixelToComplex(x: number, y: number) {
  const s = parseFloat(props.scale ?? '1');
  const a = parseFloat(props.angle ?? '0.0');
  const centerRe = parseFloat(props.cx ?? '0.0');
  const centerIm = parseFloat(props.cy ?? '0.0');
  const aspect = width.value / Math.max(1, height.value);
  // Normalisation pixel -> [-1, 1]
  const nx = (x / Math.max(1, width.value)) * 2 - 1;
  const ny = (1 - y / Math.max(1, height.value)) * 2 - 1; // inversion verticale pour correspondre au shader
  // Mise à l'échelle comme dans le shader (x avec aspect, y sans), puis rotation par +angle
  const xr = nx * aspect * s;
  const yr = ny * s;
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  const rx = cosA * xr - sinA * yr;
  const ry = sinA * xr + cosA * yr;
  // Décalage par le centre
  const re = centerRe + rx;
  const im = centerIm + ry;
  return { re, im };
}

function complexToPixel(re: number, im: number) {
  const s = parseFloat(props.scale ?? '1');
  const a = parseFloat(props.angle ?? '0.0');
  const centerRe = parseFloat(props.cx ?? '0.0');
  const centerIm = parseFloat(props.cy ?? '0.0');
  const aspect = width.value / Math.max(1, height.value);
  // Décalage par le centre
  const vx = re - centerRe;
  const vy = im - centerIm;
  // Rotation inverse pour revenir dans l'espace non-roté du shader
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  const ux =  cosA * vx + sinA * vy; // rotation -a
  const uy = -sinA * vx + cosA * vy;
  // Mise à l'échelle inverse -> coord normalisées [-1,1]
  const nx = ux / (aspect * s);
  const ny = uy / s;
  // Conversion en pixels (y top=0, bottom=H)
  const px = ((nx + 1) * 0.5) * width.value;
  const py = ((1 - (ny + 1) * 0.5)) * height.value;
  return { x: px, y: py };
}

function computeOrbit(c: { re: number, im: number }) {
  const points = [];
  let z = { re: 0, im: 0 };
  const iterations = props.orbitIterations ?? 50;
  for (let i = 0; i < iterations; i++) {
    points.push({ re: z.re, im: z.im });
    const re2 = z.re * z.re - z.im * z.im + c.re;
    const im2 = 2 * z.re * z.im + c.im;
    z = { re: re2, im: im2 };
  }
  return points;
}

function drawOverlay() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, width.value, height.value);
  // Axes centrés sur le point complexe (0,0)
  const zeroPx = complexToPixel(0, 0);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(zeroPx.x, 0);
  ctx.lineTo(zeroPx.x, height.value);
  ctx.moveTo(0, zeroPx.y);
  ctx.lineTo(width.value, zeroPx.y);
  ctx.stroke();
  // Point curseur
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(mouse.value.x, mouse.value.y, 6, 0, 2 * Math.PI);
  ctx.fill();
  // Affichage de la valeur de c à côté du curseur
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'orange';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const cText = `c = ${c.value.re.toFixed(4)} + i·${c.value.im.toFixed(4)}`;
  let textX = mouse.value.x + 10;
  let textY = mouse.value.y + 10;
  // Si trop près du bord droit, décale à gauche
  if (textX + 120 > width.value) textX = mouse.value.x - 120;
  // Si trop près du bas, décale au-dessus
  if (textY + 24 > height.value) textY = mouse.value.y - 24;

  // Orbits: tracer les segments entre z_n et z_{n+1}, tout vert si c dans l'ensemble, sinon tout bleu
  if (orbit.value.length > 1) {
    ctx.lineWidth = 2;
    // Détermine si c est dans l'ensemble (|z_n| <= 2 pour tous n)
    let isInSet = true;
    for (let i = 0; i < orbit.value.length; i++) {
      const norm = Math.hypot(orbit.value[i].re, orbit.value[i].im);
      if (norm > 2) {
        isInSet = false;
        break;
      }
    }
    ctx.strokeStyle = isInSet ? 'green' : 'blue';
    for (let i = 0; i < orbit.value.length - 1; i++) {
      // si |z_n| > 2, arrête le tracé
      const norm = Math.hypot(orbit.value[i].re, orbit.value[i].im);
      if (norm > 2 && props.showOrbitVectors) break;
      // Trace le segment entre z_n et z_{n+1}
      const ptA = orbit.value[i];
      const ptB = orbit.value[i + 1];
      const A = complexToPixel(ptA.re, ptA.im);
      const B = complexToPixel(ptB.re, ptB.im);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    }
    // Tracé des vecteurs (0,0) → zₙ en cyan ou rouge, arrêt au premier rouge
    if (props.showOrbitVectors) {
      for (let i = 1; i < orbit.value.length; i++) {
        const norm = Math.hypot(orbit.value[i].re, orbit.value[i].im);
        ctx.strokeStyle = norm <= 2 ? 'cyan' : 'red';
        const A = complexToPixel(0, 0);
        const B = complexToPixel(orbit.value[i].re, orbit.value[i].im);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
        if (norm > 2) break;
      }
    }
    // Affichage du texte et du point jaune pour z0, z1, z2, ... si showOrbitLabels
    if (props.showOrbitLabels) {
      ctx.font = '12px monospace';
      ctx.fillStyle = 'orange';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const maxLabels = Math.min(10, orbit.value.length); // Limite à 10 points pour la lisibilité
      for (let i = 0; i < maxLabels; i++) {
        const pt = orbit.value[i];
        const pos = complexToPixel(pt.re, pt.im);
        // Dessine un petit point jaune à chaque z
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'orange';
        ctx.fill();
        let label = `z${i}: (${pt.re.toFixed(3)}, ${pt.im.toFixed(3)})`;
        let lx = pos.x + 8;
        let ly = pos.y + 2;
        // Si trop près du bord droit, décale à gauche
        if (lx + 120 > width.value) lx = pos.x - 120;
        // Si trop près du bas, décale au-dessus
        if (ly + 16 > height.value) ly = pos.y - 16;
        ctx.fillText(label, lx, ly);
      }
    }
  }
  if (!props.showOrbitLabels) {
    ctx.fillText(cText, textX, textY);
  }
}

function handleMouseMove(e: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  mouse.value = { x, y };
  c.value = pixelToComplex(x, y);
  orbit.value = computeOrbit(c.value);
  drawOverlay();
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
  // Recalcule l'orbite et redraw
  mouse.value = { x: width.value / 2, y: height.value / 2 };
  c.value = pixelToComplex(mouse.value.x, mouse.value.y);
  orbit.value = computeOrbit(c.value);
  drawOverlay();
}

onMounted(() => {
  nextTick(() => {
    updateSize();
    drawOverlay();
    if (canvasRef.value) {
      canvasRef.value.addEventListener('mousemove', handleMouseMove);
    }
    if (containerRef.value) {
      const resizeObserver = new window.ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(containerRef.value);
    }
    c.value = pixelToComplex(mouse.value.x, mouse.value.y);
    orbit.value = computeOrbit(c.value);
    drawOverlay();
  });
});

watch(() => [props.scale, props.angle, props.cx, props.cy], () => {
  c.value = pixelToComplex(mouse.value.x, mouse.value.y);
  orbit.value = computeOrbit(c.value);
  drawOverlay();
});
</script>

<template>
  <div ref="containerRef" style="position: relative; width: 100%; height: 500px;">
    <Mandelbrot
      v-if="props.showMandelbrot"
      :scale="props.scale ?? '1'"
      :angle="props.angle ?? '0.0'"
      :cx="props.cx ?? '0.0'"
      :cy="props.cy ?? '0.0'"
      :activatePalette="props.showPalette"
      :activateSkybox="false"
      :activateTessellation="false"
      :activateWebcam="false"
      :activateShading="false"
      :colorStops="[{ position: 0, color: '#000000' }, { position: 0.5, color: '#ffffff' }]"
      style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 1;"
    />
    <canvas ref="canvasRef" :width="width" :height="height" style="position: absolute; left: 0; top: 0; z-index: 2; pointer-events: auto; width: 100%; height: 100%;"></canvas>
  </div>
</template>
