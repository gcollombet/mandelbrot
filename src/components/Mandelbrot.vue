<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref, toRaw, watch} from 'vue';
import {Engine} from '../Engine.ts';
import {MandelbrotNavigator} from 'mandelbrot';
import type {ColorStop} from '../ColorStop.ts';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: HTMLCanvasElement | null = null;
let engine: Engine | null = null;
let navigator: MandelbrotNavigator | undefined;
let isUpdating = false;

const cx = defineModel<string>('cx', { default: '-1.9771995110313272619112808106831597' })
const cy = defineModel<string>('cy', { default: '0.0' })
const scale = defineModel<string>('scale', { default: '2.5' })
const angle = defineModel<number>('angle', { default: 0 })

// Applique les paramètres venant du parent au navigator.
// On ignore quand c'est le navigator qui met à jour les models (voir draw()).
watch(
  () => [cx.value, cy.value, scale.value, angle.value] as const,
  ([nextCx, nextCy, nextScale, nextAngle], [prevCx, prevCy, prevScale, prevAngle]) => {
    if (isUpdating) {
      return;
    }
    if (!navigator) return;
    if (!nextCx || !nextCy || !nextScale) return;
    // Évite les appels inutiles si rien n'a vraiment changé
    if (nextCx !== prevCx || nextCy !== prevCy) {
      navigator.origin(nextCx, nextCy);
    }
    if (nextScale !== prevScale) {
      navigator.scale(nextScale);
    }
    if (nextAngle !== prevAngle) {
      navigator.angle(Number(nextAngle));
    }
  },
  { flush: 'sync' }
);

const props = withDefaults(defineProps<{
  mu?: number,
  epsilon?: number,
  colorStops?: ColorStop[],
  palettePeriod?: number,
  paletteOffset?: number,
  antialiasLevel?: number,
  activateAnimate?: boolean,
  dprMultiplier?: number,
  maxIterationMultiplier?: number,
  targetFps?: number,
  gpuLoadMultiplier?: number,
  interpolationMode?: 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix',
  tessellationLevel?: number,
  displacementAmount?: number,
  animationSpeed?: number,
 }>(),

    {
       mu: 4.0,
       epsilon: 0.00001,
       colorStops: () => [
         {
           "color": "#002500",
           "position": 0
         },
         {
           "color": "#175b3d",
           "position": 0.16
         },
         {
           "color": "#ffceb6",
           "position": 0.26
         },
         {
           "color": "#edffff",
           "position": 0.42
         },
         {
           "color": "#ff8fbc",
           "position": 0.7016397849462366
         },
         {
           "color": "#a6003e",
           "position": 0.8575
         },
         {
           "color": "#100000",
           "position": 1
         }
       ],
       palettePeriod: 100.0,
       paletteOffset: 0,
       antialiasLevel: 1,
       activateAnimate: false,
       dprMultiplier: 0.5,
       maxIterationMultiplier: 0.1,
       targetFps: 60,
       gpuLoadMultiplier: 1.0,
       interpolationMode: 'lab',
       tessellationLevel: 2,
       displacementAmount: 0.01,
       animationSpeed: 1.0,
    }
);

// Quand le multiplicateur DPR change, mettre à jour l'engine et redimensionner.
watch(
  () => props.dprMultiplier,
  (val) => {
    if (!engine) return;
    engine.dprMultiplier = val;
    handleResize();
  }
);

// Quand le target FPS change, mettre à jour l'engine.
watch(
  () => props.targetFps,
  (val) => {
    if (!engine) return;
    engine.targetFps = val;
  }
);

// Quand le multiplicateur de charge GPU change, mettre à jour l'engine.
watch(
  () => props.gpuLoadMultiplier,
  (val) => {
    if (!engine) return;
    engine.gpuLoadMultiplier = val;
  }
);


async function draw() {
  if (!engine || !navigator) return;

    const step = navigator.step();
    if (!step) return;
    const [dx, dy] = step as [string, string];
    const [cx_string, cy_string, scale_string, angle_string] = navigator.get_params() as [string, string, string, string];
    isUpdating = true;
    cx.value = cx_string;
    cy.value = cy_string;
    scale.value = scale_string;
    angle.value = parseFloat(angle_string);
    await nextTick();
    isUpdating = false;
    const maxIterations = Math.min(Math.max(100, 1000 * props.maxIterationMultiplier * Math.log2(1.0 / parseFloat(scale_string))),100_000);
    await engine.update({
          cx: cx_string,
          cy: cy_string,
          dx: parseFloat(dx),
          dy: parseFloat(dy),
          mu: props.mu,
          scale: parseFloat(scale_string),
          angle: parseFloat(angle_string),
          maxIterations,
          epsilon: props.epsilon
        },
      {
        antialiasLevel: props.antialiasLevel,
        palettePeriod: props.palettePeriod,
        paletteOffset: props.paletteOffset,
        colorStops: toRaw(props.colorStops),
        interpolationMode: props.interpolationMode,
        activateAnimate: props.activateAnimate,
        tessellationLevel: props.tessellationLevel,
        displacementAmount: props.displacementAmount,
        animationSpeed: props.animationSpeed,
      }
    )
    await engine.render()

}

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;
  navigator = new MandelbrotNavigator(
      cx.value,
      cy.value,
      scale.value,
      Number(angle.value)
  );
  // Si des props ont déjà changé avant l'init, on s'assure que le navigator est aligné.
  // (Le watch ci-dessus ne pouvait rien faire tant que navigator était undefined.)
  navigator.origin(cx.value, cy.value);
  navigator.scale(scale.value);
  navigator.angle(Number(angle.value));
  engine = new Engine(canvas, {
    antialiasLevel: props.antialiasLevel,
    palettePeriod: props.palettePeriod,
    paletteOffset: props.paletteOffset,
    colorStops: props.colorStops,
    interpolationMode: props.interpolationMode,
    activateAnimate: props.activateAnimate,
    tessellationLevel: props.tessellationLevel,
    displacementAmount: props.displacementAmount,
    animationSpeed: props.animationSpeed,
  });
  return engine.initialize(navigator)
}

async function handleResize() {
  if (!canvasRef.value || !engine) return;
  const rect = canvasRef.value.getBoundingClientRect();
  canvasRef.value.width = rect.width;
  canvasRef.value.height = rect.height;
  // Engine reads clientWidth/clientHeight and applies DPR itself.
  engine.resize()
  // Render immediately with new dimensions so the canvas is never stale.
  //await draw()
}

onMounted(async () => {
  await initWebGPU();
  window.addEventListener('resize', handleResize);
  // First resize + draw — produces the initial image immediately.
  await handleResize()
  // Start the render loop for progressive refinement after the first
  // frame is already on screen.
  if (engine) {
    engine.startRenderLoop(draw);
  }
});

onUnmounted(() => {
  engine?.stopRenderLoop();
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
  drawOnce: async () => draw(),
  resize: async () => handleResize(),
  initialize: async () => initWebGPU(),
});
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<style>
canvas {
  border-radius: 0;
  width: 100%;
  height: 500px;
  display: block;
}
</style>
