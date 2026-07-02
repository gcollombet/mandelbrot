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
import {log2FromDecimalString} from '../floatexp.ts';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: HTMLCanvasElement | null = null;
let engine: Engine | null = null;
let navigator: MandelbrotNavigator | undefined;
let isUpdating = false;
let _lastScaleLog = '';

const refPixelX = ref<number | null>(null);
const refPixelY = ref<number | null>(null);
const refOnScreen = ref<boolean>(false);

function isValidDecimal(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  const trimmed = s.trim();
  if (!trimmed) return false;
  const decimalRegex = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  return decimalRegex.test(trimmed);
}

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
    if ((nextCx !== prevCx || nextCy !== prevCy)) {
      console.log('[REF] Mandelbrot.vue watcher cx change', String(nextCx).slice(0, 14), 'isUpdating', isUpdating);
    }
    if (isUpdating) {
      return;
    }
    if (!navigator) return;
    if (!nextCx || !nextCy || !nextScale) return;
    // Évite les appels inutiles si rien n'a vraiment changé
    if (nextCx !== prevCx || nextCy !== prevCy) {
      if (isValidDecimal(nextCx) && isValidDecimal(nextCy)) {
        // isUpdating is false here, so this centre change came from the parent
        // model (preset load, manual entry) — a discontinuous teleport, not the
        // draw loop. Cancel any in-flight travel transition (else step() would
        // keep interpolating over the new params), then force a fresh reference
        // at the new centre instead of drifting against the old far reference.
        navigator.cancel_transition();
        navigator.origin(nextCx, nextCy);
        engine?.resetReference(nextCx, nextCy);
      }
    }
    if (nextScale !== prevScale) {
      console.log('[REF] watcher scale change', String(nextScale).slice(0, 14), 'type', typeof nextScale, 'valid', isValidDecimal(nextScale));
      if (isValidDecimal(nextScale)) {
        navigator.scale(nextScale);
      }
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
  aaAuto?: boolean,
  activateAnimate?: boolean,
  debugShading?: boolean,
  debugView?: number,
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
        aaAuto: false,
        activateAnimate: false,
        debugShading: false,
        debugView: 0,
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

    const canvas = canvasRef.value;
    const step = navigator.step(canvas ? canvas.width : undefined, canvas ? canvas.height : undefined);
    if (!step) return;
    const [dx, dy] = step as [string, string];
    const [cx_string, cy_string, scale_string, angle_string] = navigator.get_params() as [string, string, string, string];
    // O(1) float-exponent decomposition of scale/dx/dy computed in Rust (no decimal-string
    // re-parse each frame): [scaleM, scaleE, dxM, dxE, dyM, dyE]. Read after step() updated cx.
    const viewFloatexp = navigator.view_floatexp() as Float64Array;
    if (scale_string !== _lastScaleLog) {
      _lastScaleLog = scale_string;
      console.log('[REF] draw scale', scale_string, 'dx', String(dx).slice(0, 12), 'cx', String(cx_string).slice(0, 14));
    }
    isUpdating = true;
    cx.value = cx_string;
    cy.value = cy_string;
    scale.value = scale_string;
    angle.value = parseFloat(angle_string);
    await nextTick();
    isUpdating = false;
    const mu = Math.max(props.mu, 4);
    const bailoutExtraIterations = Math.max(0, Math.ceil(Math.log2(Math.log(mu) / Math.log(4))));
    // log2(1/scale) straight from the decimal string: `Math.log2(1.0 / parseFloat(scale_string))`
    // underflows once scale drops below the smallest f64 subnormal (~5e-324, i.e. past ~1e-308) —
    // parseFloat hits exactly 0, 1/0 is Infinity, and maxIterations pins at the 10M ceiling.
    const maxIterations = Math.min(
      Math.max(100, 1000 * props.maxIterationMultiplier * -log2FromDecimalString(scale_string)) + bailoutExtraIterations,
      10_000_000
    );
    await engine.update({
          cx: cx_string,
          cy: cy_string,
          dx: parseFloat(dx),
          dy: parseFloat(dy),
          // Full-precision decimal strings of the reference-relative offset and
          // scale, so the deep (floatexp) path can decompose them without going
          // through f64 (which underflows ~1e-308). parseFloat above stays for
          // the shallow path and anything still expecting numbers.
          dxStr: dx,
          dyStr: dy,
          viewFloatexp,
          mu: props.mu,
          scale: parseFloat(scale_string),
          scaleStr: scale_string,
          angle: parseFloat(angle_string),
          maxIterations,
          epsilon: props.epsilon
        },
      {
        antialiasLevel: props.antialiasLevel,
        aaAuto: props.aaAuto,
        palettePeriod: props.palettePeriod,
        paletteOffset: props.paletteOffset,
        heightPaletteShift: props.heightPaletteShift,
        paletteMirror: props.paletteMirror,
        colorStops: toRaw(props.colorStops),
        interpolationMode: props.interpolationMode,
        activateAnimate: props.activateAnimate,
        debugShading: props.debugShading,
        debugView: props.debugView ?? 0,
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

    if (props.debugShading && navigator && canvasRef.value) {
      const refs = navigator.get_reference_params() as [string, string];
      if (refs && refs.length >= 2) {
        const [refCx, refCy] = refs;
        const cw = canvasRef.value.width;
        const ch = canvasRef.value.height;
        const coords = navigator.coordinate_to_pixel(refCx, refCy, cw, ch);
        if (coords && coords.length === 2) {
          const clientX = coords[0] * (canvasRef.value.clientWidth / cw);
          const clientY = coords[1] * (canvasRef.value.clientHeight / ch);
          refPixelX.value = clientX;
          refPixelY.value = clientY;
          refOnScreen.value = clientX >= 0 && clientX <= canvasRef.value.clientWidth &&
                             clientY >= 0 && clientY <= canvasRef.value.clientHeight;
        } else {
          refOnScreen.value = false;
        }
      } else {
        refOnScreen.value = false;
      }
    } else {
      refOnScreen.value = false;
    }
}

watch(
  () => props.debugShading,
  (val) => {
    if (val && engine && !engine.isRendering) {
      draw();
    }
  }
);


async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;

  let initialCx = cx.value;
  let initialCy = cy.value;
  let initialScale = scale.value;

  if (!isValidDecimal(initialCx)) {
    initialCx = '-0.7';
    cx.value = initialCx;
  }
  if (!isValidDecimal(initialCy)) {
    initialCy = '0.0';
    cy.value = initialCy;
  }
  if (!isValidDecimal(initialScale)) {
    initialScale = '2.5';
    scale.value = initialScale;
  }

  navigator = new MandelbrotNavigator(
      initialCx,
      initialCy,
      initialScale,
      Number(angle.value)
  );
  // Si des props ont déjà changé avant l'init, on s'assure que le navigator est aligné.
  // (Le watch ci-dessus ne pouvait rien faire tant que navigator était undefined.)
  navigator.origin(initialCx, initialCy);
  navigator.scale(initialScale);
  navigator.angle(Number(angle.value));
  engine = new Engine(canvas, {
    antialiasLevel: props.antialiasLevel,
    aaAuto: props.aaAuto,
    palettePeriod: props.palettePeriod,
    paletteOffset: props.paletteOffset,
    heightPaletteShift: props.heightPaletteShift,
    paletteMirror: props.paletteMirror,
    colorStops: props.colorStops,
    interpolationMode: props.interpolationMode,
    activateAnimate: props.activateAnimate,
    debugShading: props.debugShading,
    debugView: props.debugView ?? 0,
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
    if (import.meta.env.DEV) {
      // Dev-only hook for runtime inspection and A/B toggling of engine flags
      // (e.g. useInplaceCompute) from the console or Playwright tests.
      ;(window as any).__mandelbrotEngine = engine
    }
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
  translateDirect: (dx: number, dy: number) => {
    if (!navigator) return;
    const canvas = canvasRef.value;
    navigator.translate_direct(dx, dy, canvas ? canvas.width : undefined, canvas ? canvas.height : undefined);
  },
  rotate: (da: number) => navigator?.rotate(da),
  angle: (a: number) => navigator?.angle(a),
  zoom: (f: number) => { console.log('[REF] zoom() called factor', f); navigator?.zoom(f); },
  // Snap the navigator exactly onto a target and force a fresh reference orbit.
  // Used when a "travel to preset" animation completes: the travel finalises
  // cx/cy/scale through the draw loop (isUpdating, which the param watcher
  // ignores), so the reference is never hard-reset at the deep target and the
  // GPU keeps a stale/lagging reference → garbage until a manual reload. This
  // reproduces the cold-start state: transition cancelled, centre/scale snapped,
  // reference re-anchored and recomputed at the exact target.
  resetReferenceTo: (cx: string, cy: string, scaleStr: string, angleVal: number) => {
    console.log('[REF] resetReferenceTo (travel done)', cx.slice(0, 14), 'scale', scaleStr, 'engine?', !!engine, 'nav?', !!navigator);
    if (!navigator || !engine) return;
    navigator.cancel_transition();
    navigator.origin(cx, cy);
    navigator.scale(scaleStr);
    navigator.angle(angleVal);
    engine.resetReference(cx, cy);
  },
  step: () => {
    if (!navigator) return;
    const canvas = canvasRef.value;
    return navigator.step(canvas ? canvas.width : undefined, canvas ? canvas.height : undefined);
  },
  getParams: () => navigator?.get_params(),
  drawOnce: async () => draw(),
  resize: async () => handleResize(),
  initialize: async () => initWebGPU(),
  useBla: () => engine?.setApproximationMode('bla'),
  usePerturbation: () => engine?.setApproximationMode('perturbation'),
  setApproximationMode: (mode: 'bla' | 'perturbation' | 'pade' | 'jet') => engine?.setApproximationMode(mode),
  getApproximationMode: () => engine?.getApproximationMode(),
  setBlaEpsilon: (epsilon: number) => engine?.setBlaEpsilon(epsilon),
  setPrecisionBudget: (targetScale: string) => engine?.setPrecisionBudget(targetScale),
  getPrecisionBudget: () => engine?.getPrecisionBudget(),
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
    <!-- Target marker for the reference point in debug mode -->
    <div
      v-if="props.debugShading && refOnScreen && refPixelX !== null && refPixelY !== null"
      class="debug-ref-marker"
      :style="{ left: refPixelX + 'px', top: refPixelY + 'px' }"
    >
      <div class="debug-ref-crosshair"></div>
      <div class="debug-ref-label">Réf</div>
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

.debug-ref-marker {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 10;
}

.debug-ref-crosshair {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--magenta, #ff007f);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(255, 0, 127, 0.6);
}

.debug-ref-crosshair::before,
.debug-ref-crosshair::after {
  content: '';
  position: absolute;
  background: var(--magenta, #ff007f);
}

/* Horizontal line */
.debug-ref-crosshair::before {
  top: 9px;
  left: -6px;
  width: 32px;
  height: 1.5px;
}

/* Vertical line */
.debug-ref-crosshair::after {
  left: 9px;
  top: -6px;
  width: 1.5px;
  height: 32px;
}

.debug-ref-label {
  position: absolute;
  top: 18px;
  left: 0;
  transform: translateX(-50%);
  background: rgba(10, 10, 20, 0.75);
  color: var(--magenta, #ff007f);
  font-family: var(--mono, monospace);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 0, 127, 0.3);
  backdrop-filter: blur(4px);
  text-shadow: 0 1px 2px black;
  white-space: nowrap;
}
</style>
