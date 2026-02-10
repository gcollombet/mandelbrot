<script setup lang="ts">
import {defineExpose, defineProps, nextTick, onMounted, onUnmounted, ref} from 'vue';
import {Engine} from '../Engine.ts';
import {MandelbrotNavigator} from 'mandelbrot';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: HTMLCanvasElement | null = null;
let engine: Engine | null = null;
let navigator: MandelbrotNavigator | null = null;

const cx = defineModel<string>('cx', {
  default: '-1.5',
/*  set: (val) => {
    if (navigator) {
      navigator.origin(val, cy.value ?? '0.0');
    }
  }*/
})
const cy = defineModel<string>('cy', {
  default: '0.0',
/*  set: (val) => {
    if (navigator) {
      navigator.origin(cx.value ?? '0.0', val);
    }
  }*/
})
const scale = defineModel<string>('scale', {
  default: '2.5',
/*  set: (val) => {
    if (navigator) {
      navigator.scale(val);
    }
  }*/
})
const angle = defineModel<number>('angle', {
  default: 0,
/*  set: (val) => {
    if (navigator) {
      navigator.angle(val);
    }
  }*/
})

const props = withDefaults(defineProps<{
  mu?: number,
  epsilon?: number,
  colorStops?: Array<{ color: string, position: number }>,
  palettePeriod?: number,
  antialiasLevel?: number,
  tessellationLevel?: number,
  shadingLevel?: number,
  activatePalette?: boolean,
  activateSkybox?: boolean,
  activateTessellation?: boolean,
  activateWebcam?: boolean,
  activateShading?: boolean,
  activateZebra?: boolean,
  activateSmoothness?: boolean,
}>(),
    {
       mu: 1000000.0,
       epsilon: 0.00001,
       colorStops: () => [
         { color: '#0f0130', position: 0.0 },
         { color: '#206bcb', position: 0.16 },
         { color: '#ffceb6', position: 0.26 },
         { color: '#edffff', position: 0.42 },
         { color: '#ffaa00', position: 0.6425 },
         { color: '#300200', position: 0.8575 },
         { color: '#100000', position: 1.0 },
       ],
       palettePeriod: 1,
       antialiasLevel: 1,
       tessellationLevel: 2,
       shadingLevel: 1,
       activatePalette: true,
       activateSkybox: false,
       activateTessellation: false,
       activateWebcam: false,
       activateShading: true,
       activateZebra: false,
       activateSmoothness: true,
    }
);


async function draw() {
  if (!engine || !navigator) return;
  const [dx, dy] = navigator.step();
  const [cx_string, cy_string, scale_string, angle_string] = navigator.get_params() as [string, string, string, string];
  cx.value = cx_string;
  cy.value = cy_string;
  scale.value = scale_string;
  angle.value = parseFloat(angle_string);
  const maxIterations = Math.min(Math.max(100, 80 + 60 * Math.log2(1.0 / parseFloat(scale_string)), 1000000));
  await engine.update({
        cx: parseFloat(dx),
        cy: parseFloat(dy),
        mu: props.mu,
        scale: parseFloat(scale_string),
        angle: parseFloat(angle_string),
        maxIterations, epsilon: props.epsilon },
    {
      shadingLevel: props.shadingLevel,
      tessellationLevel: props.tessellationLevel,
      antialiasLevel: props.antialiasLevel,
      palettePeriod: props.palettePeriod,
      colorStops: props.colorStops,
      activateShading: props.activateShading,
      activateTessellation: props.activateTessellation,
      activateWebcam: props.activateWebcam,
      activatePalette: props.activatePalette,
      activateSkybox: props.activateSkybox,
      activateSmoothness: props.activateSmoothness,
      activateZebra: props.activateZebra,
    }
  );
  await engine.render();
}

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;
  navigator = new MandelbrotNavigator(
      cx.value,
      cy.value,
      scale.value,
      angle.value
  );
  engine = new Engine(canvas, {
    activatePalette: props.activatePalette,
    activateSkybox: props.activateSkybox,
    shadingLevel: props.shadingLevel,
    tessellationLevel: props.tessellationLevel,
    antialiasLevel: props.antialiasLevel,
    palettePeriod: props.palettePeriod,
    colorStops: props.colorStops,
    activateShading: props.activateShading,
    activateTessellation: props.activateTessellation,
    activateWebcam: props.activateWebcam,
    activateSmoothness: props.activateSmoothness,
    activateZebra: props.activateZebra,
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
