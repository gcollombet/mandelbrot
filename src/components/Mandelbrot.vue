<script setup lang="ts">
import { onMounted, ref, onUnmounted, nextTick, defineProps, defineExpose, watch } from 'vue';
import { Engine } from '../Engine.ts';
import { MandelbrotNavigator } from 'mandelbrot';
import type { MandelbrotParams } from '../Mandelbrot.ts';

const canvasRef = ref<HTMLCanvasElement | null>(null);

const props = defineProps<{
  scale?: string,
  angle?: string,
  cx?: string,
  cy?: string,
  mu?: string | number,
  colorStops?: Array<{ color: string, position: number }>,
  activatePalette?: boolean,
  activateSkybox?: boolean,
  activateTessellation?: boolean,
  activateWebcam?: boolean,
  activateShading?: boolean,
  activateZebra?: boolean,
  activateSmoothness?: boolean,
}>();

const antialiasLevel = 1;
const palettePeriod = 1;

let canvas: HTMLCanvasElement | null = null;
let engine: Engine | null = null;
let navigator: MandelbrotNavigator | null = null;

const initialParams: MandelbrotParams = {
  cx: props.cx ?? '-1.5',
  cy: props.cy ?? '0.0',
  mu: typeof props.mu === 'string' ? parseFloat(props.mu) : (props.mu ?? 10000.0 as number),
  scale: props.scale ?? '2.5',
  angle: props.angle ?? '0.0',
  maxIterations: 1000,
  antialiasLevel,
  palettePeriod,
  shadingLevel: 1,
  tessellationLevel: 2,
  epsilon: 0.00001,
  colorStops: props.colorStops ?? [],
  activateShading: props.activateShading ?? true,
  activateTessellation: props.activateTessellation ?? true,
  activateWebcam: props.activateWebcam ?? false,
  activatePalette: props.activatePalette ?? false,
  activateSkybox: props.activateSkybox ?? false,
  activateSmoothness: props.activateSmoothness ?? true,
  activateZebra: props.activateZebra ?? false,
};

const mandelbrotParams = ref<MandelbrotParams>(initialParams);

async function draw() {
  if (!engine || !navigator) return;
  const epsilon = mandelbrotParams.value.epsilon;
  const [dx, dy, scale, angle] = navigator.step();
  const [cx_string, cy_string, scale_string, angle_string] = navigator.get_params() as [string, string, string, string];
  const mu = mandelbrotParams.value.mu;
  mandelbrotParams.value.cx = cx_string;
  mandelbrotParams.value.cy = cy_string;
  mandelbrotParams.value.scale = scale_string;
  mandelbrotParams.value.angle = angle_string;
  const maxIterations = Math.min(Math.max(100, 80 + 60 * Math.log2(1.0 / scale)), 1000000);
  await engine.update({ cx: dx, cy: dy, mu, scale, angle, maxIterations, epsilon },
    {
      shadingLevel: mandelbrotParams.value.shadingLevel,
      tessellationLevel: mandelbrotParams.value.tessellationLevel,
      antialiasLevel: mandelbrotParams.value.antialiasLevel,
      palettePeriod: mandelbrotParams.value.palettePeriod,
      colorStops: mandelbrotParams.value.colorStops,
      activateShading: mandelbrotParams.value.activateShading,
      activateTessellation: mandelbrotParams.value.activateTessellation,
      activateWebcam: mandelbrotParams.value.activateWebcam,
      activatePalette: mandelbrotParams.value.activatePalette,
      activateSkybox: mandelbrotParams.value.activateSkybox,
      activateSmoothness: mandelbrotParams.value.activateSmoothness,
      activateZebra: mandelbrotParams.value.activateZebra,
    }
  );
  await engine.render();
}

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;

  navigator = new MandelbrotNavigator(
    parseFloat(props.cx ?? '-0.75'),
    parseFloat(props.cy ?? '0.0'),
    1000000.0,
    parseFloat(props.scale ?? '1.0'),
    parseFloat(props.angle ?? '0.0')
  );
  engine = new Engine(canvas, {
    activatePalette: props.activatePalette ?? true,
    activateSkybox: props.activateSkybox ?? true,
    shadingLevel: mandelbrotParams.value.shadingLevel,
    tessellationLevel: mandelbrotParams.value.tessellationLevel,
    antialiasLevel: mandelbrotParams.value.antialiasLevel,
    palettePeriod: mandelbrotParams.value.palettePeriod,
    colorStops: [],
    activateShading: props.activateShading ?? mandelbrotParams.value.activateShading,
    activateTessellation: props.activateTessellation ?? mandelbrotParams.value.activateTessellation,
    activateWebcam: props.activateWebcam ?? mandelbrotParams.value.activateWebcam,
    activateSmoothness: props.activateSmoothness ?? mandelbrotParams.value.activateSmoothness,
    activateZebra: props.activateZebra ?? mandelbrotParams.value.activateZebra,
  });
  await engine.initialize(navigator);
}

function handleResize() {
  if (!canvasRef.value || !engine) return;
  const rect = canvasRef.value.getBoundingClientRect();
  canvasRef.value.width = rect.width;
  canvasRef.value.height = rect.height;
  engine.resize();
  draw();
}

// Watch sur cx, cy, scale, angle pour déplacer l'origine, changer l'angle et l'échelle, puis redessiner
watch([
  () => props.cx,
  () => props.cy,
  () => props.scale,
  () => props.angle
], async ([newCx, newCy, newScale, newAngle]) => {
  if (navigator) {
    if (typeof newScale !== 'undefined') {
      navigator.scale(Number(newScale));
    }
    if (typeof newCx !== 'undefined'
        && typeof newCy !== 'undefined') {
      navigator.origin(Number(newCx), Number(newCy));
    }
    if (typeof newAngle !== 'undefined') {
      navigator.angle(Number(newAngle));
    }

    await draw();
    await draw();
  }
});

onMounted(async () => {
  await initWebGPU();
  await nextTick();
  handleResize();
  await draw();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// API exposée pour contrôle externe
defineExpose({
  getCanvas: () => canvasRef.value,
  getEngine: () => engine!,
  getNavigator: () => navigator!,
  translate: (dx: number, dy: number) => navigator?.translate(dx, dy),
  translateDirect: (dx: number, dy: number) => navigator?.translate_direct(dx, dy),
  rotate: (da: number) => navigator?.rotate(da),
  angle: (a: number) => navigator?.angle(a),
  zoom: (f: number) => navigator?.zoom(f),
  step: () => navigator?.step(),
  getParams: () => navigator?.get_params(),
  drawOnce: async () => { await draw(); },
  resize: () => handleResize(),
  initialize: async () => { await initWebGPU(); },
});
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<style>
canvas {
  border-radius: 10px;
  width: 100%;
  height: 500px;
  display: block;
}
</style>
