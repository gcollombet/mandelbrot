<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref, toRaw, watch} from 'vue';
import {Engine} from '../Engine.ts';
import {MandelbrotNavigator} from 'mandelbrot';
import type {ColorStop} from '../ColorStop.ts';
import {
  normalizeTextureMappingFromLegacy,
  type TextureMappingConfig
} from '../TextureMapping.ts';
import {normalizeAnimationConfig, type AnimationConfig} from '../AnimationConfig.ts';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: HTMLCanvasElement | null = null;
let engine: Engine | null = null;
let navigator: MandelbrotNavigator | undefined;
let isUpdating = false;

const emit = defineEmits<{
  ready: [engine: Engine];
}>();

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
  heightPaletteShift?: number,
  paletteMirror?: boolean,
  antialiasLevel?: number,
  activateAnimate?: boolean,
  debugShading?: boolean,
  dprMultiplier?: number,
  maxIterationMultiplier?: number,
  targetFps?: number,
  gpuLoadMultiplier?: number,
  zoomMinBrushStep?: number,
  sentinelSeedStep?: number,
  interpolationMode?: 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix',
  tessellationLevel?: number,
  displacementAmount?: number,
  animation?: AnimationConfig,
  animationSpeed?: number,
  ambientOcclusionStrength?: number,
  microBumpStrength?: number,
  subsurfaceStrength?: number,
  reliefDepth?: number,
  localShadowStrength?: number,
  lightAngle?: number,
  varnishStrength?: number,
  orbitTrapStrength?: number,
  phaseColoringStrength?: number,
  stripeFrequency?: number,
  textureMapping?: TextureMappingConfig,
  textureMappingMode?: number,
 }>(),

    {
       mu: 4.0,
       epsilon: 1e-9,
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
        heightPaletteShift: 0,
        paletteMirror: false,
        antialiasLevel: 1,
        activateAnimate: false,
        debugShading: false,
       dprMultiplier: 1.0,
       maxIterationMultiplier: 0.1,
       targetFps: 60,
       gpuLoadMultiplier: 1.0,
       zoomMinBrushStep: 1,
       sentinelSeedStep: 64,
       interpolationMode: 'lab',
       tessellationLevel: 0,
       displacementAmount: 0,
       animation: () => normalizeAnimationConfig(null, 1.0),
        animationSpeed: 1.0,
        ambientOcclusionStrength: 0,
        microBumpStrength: 0,
        subsurfaceStrength: 0.0,
        reliefDepth: 1,
        localShadowStrength: 0,
        lightAngle: 0,
        varnishStrength: 0,
        orbitTrapStrength: 0,
        phaseColoringStrength: 0,
        stripeFrequency: 8,
        textureMapping: () => normalizeTextureMappingFromLegacy({ textureMappingMode: 0 }),
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
    const mu = Math.max(props.mu, 4);
    const bailoutExtraIterations = Math.max(0, Math.ceil(Math.log2(Math.log(mu) / Math.log(4))));
    const maxIterations = Math.min(
      Math.max(100, 1000 * props.maxIterationMultiplier * Math.log2(1.0 / parseFloat(scale_string))) + bailoutExtraIterations,
      100_000
    );
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
        heightPaletteShift: props.heightPaletteShift,
        paletteMirror: props.paletteMirror,
        colorStops: toRaw(props.colorStops),
        interpolationMode: props.interpolationMode,
        activateAnimate: props.activateAnimate,
        debugShading: props.debugShading,
        tessellationLevel: props.tessellationLevel,
        displacementAmount: props.displacementAmount,
        animation: normalizeAnimationConfig(props.animation, props.animationSpeed),
        animationSpeed: props.animationSpeed,
        ambientOcclusionStrength: props.ambientOcclusionStrength,
        microBumpStrength: props.microBumpStrength,
        subsurfaceStrength: props.subsurfaceStrength,
        reliefDepth: props.reliefDepth,
        localShadowStrength: props.localShadowStrength,
        lightAngle: props.lightAngle,
        varnishStrength: props.varnishStrength,
        orbitTrapStrength: props.orbitTrapStrength,
        phaseColoringStrength: props.phaseColoringStrength,
        stripeFrequency: props.stripeFrequency,
        zoomMinBrushStep: props.zoomMinBrushStep,
        sentinelSeedStep: props.sentinelSeedStep,
        textureMapping: normalizeTextureMappingFromLegacy(props),
        textureMappingMode: props.textureMappingMode,
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
    heightPaletteShift: props.heightPaletteShift,
    paletteMirror: props.paletteMirror,
    colorStops: props.colorStops,
    interpolationMode: props.interpolationMode,
    activateAnimate: props.activateAnimate,
    debugShading: props.debugShading,
    tessellationLevel: props.tessellationLevel,
    displacementAmount: props.displacementAmount,
    animation: normalizeAnimationConfig(props.animation, props.animationSpeed),
    animationSpeed: props.animationSpeed,
    ambientOcclusionStrength: props.ambientOcclusionStrength,
    microBumpStrength: props.microBumpStrength,
    subsurfaceStrength: props.subsurfaceStrength,
    reliefDepth: props.reliefDepth,
    localShadowStrength: props.localShadowStrength,
    lightAngle: props.lightAngle,
    varnishStrength: props.varnishStrength,
    orbitTrapStrength: props.orbitTrapStrength,
    phaseColoringStrength: props.phaseColoringStrength,
    stripeFrequency: props.stripeFrequency,
    zoomMinBrushStep: props.zoomMinBrushStep,
    sentinelSeedStep: props.sentinelSeedStep,
    textureMapping: normalizeTextureMappingFromLegacy(props),
    textureMappingMode: props.textureMappingMode,
  });
  engine.dprMultiplier = props.dprMultiplier ?? 1.0;
  engine.targetFps = props.targetFps ?? 60;
  engine.gpuLoadMultiplier = props.gpuLoadMultiplier ?? 1.0;
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
    emit('ready', engine);
    engine.startRenderLoop(draw);
  }
});

onUnmounted(() => {
  // Fully destroy the engine (render loop, reference worker, GPU resources).
  // stopRenderLoop alone leaves the old instance alive across Vite HMR
  // re-mounts: a stale engine compiled with outdated shaders can then keep
  // rendering to the same canvas, alternating frames with the new instance
  // (visible as a smooth/blocky flicker and a large slowdown).
  engine?.destroy();
  engine = null;
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
  useBla: () => engine?.setApproximationMode('bla'),
  usePerturbation: () => engine?.setApproximationMode('perturbation'),
  setApproximationMode: (mode: 'bla' | 'perturbation') => engine?.setApproximationMode(mode),
  getApproximationMode: () => engine?.getApproximationMode(),
  setBlaEpsilon: (epsilon: number) => engine?.setBlaEpsilon(epsilon),
});
</script>

<template>
  <div class="mandelbrot-canvas-wrap">
    <canvas ref="canvasRef"></canvas>
    <div v-if="props.debugShading" class="debug-legend" aria-hidden="true">
      <div class="debug-legend-item debug-legend-top-left">Distance au bord</div>
      <div class="debug-legend-item debug-legend-top-right">Palette / phase continue</div>
      <div class="debug-legend-item debug-legend-bottom-left">Gradient du relief</div>
      <div class="debug-legend-item debug-legend-bottom-right">Angle de la dérivée</div>
    </div>
  </div>
</template>

<style>
.mandelbrot-canvas-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

canvas {
  border-radius: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.debug-legend {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
}

.debug-legend-item {
  position: absolute;
  max-width: 42%;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  background: rgba(10, 10, 20, 0.42);
  color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(6px);
}

.debug-legend-top-left { top: 0.75rem; left: 0.75rem; }
.debug-legend-top-right { top: 0.75rem; right: 0.75rem; }
.debug-legend-bottom-left { left: 0.75rem; bottom: 0.75rem; }
.debug-legend-bottom-right { right: 0.75rem; bottom: 0.75rem; }
</style>
