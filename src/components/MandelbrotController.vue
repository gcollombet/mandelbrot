<script setup lang="ts">
import {defineProps, onMounted, onUnmounted, ref} from 'vue';
import Mandelbrot from './Mandelbrot.vue';
import MobileNavigationControls from './MobileNavigationControls.vue';
import type {MandelbrotExposed} from "../types/MandelbrotExposed.ts";
import type {ComplexCoordStr} from "../CursorCoordinate.ts";
import type {IterationData} from "../CursorCoordinate.ts";
import type {ColorStop} from "../ColorStop.ts";

const cx = defineModel<string>('cx')
const cy = defineModel<string>('cy')
const scale = defineModel<string>('scale')
const angle = defineModel<number>('angle')
const mobileNavExpanded = defineModel<boolean>('mobileNavExpanded', { default: false })

// Props pass-through pour initialiser Mandelbrot
const props = defineProps<{
  mu?: number,
  epsilon?: number,
  colorStops?: ColorStop[],
  antialiasLevel?: number,
  palettePeriod?: number,
  paletteOffset?: number,
  activateAnimate?: boolean,
  dprMultiplier?: number,
  maxIterationMultiplier?: number,
  targetFps?: number,
  gpuLoadMultiplier?: number,
  interpolationMode?: 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix',
  pickerMode?: boolean,
  tessellationLevel?: number,
  displacementAmount?: number,
  animationSpeed?: number,
}>();

const emit = defineEmits<{
  cursorCoord: [coord: ComplexCoordStr | null, clientX: number, clientY: number];
  palettePick: [data: IterationData, clientX: number, clientY: number];
}>();

const mandelbrotRef = ref<MandelbrotExposed | null>(null);

// --- Cursor coordinate tracking ---
let cursorOnCanvas = false;
let lastClientX = 0;
let lastClientY = 0;

/** Recompute and emit cursor complex coords from the last known pixel position. */
function refreshCursorCoord() {
  if (!cursorOnCanvas) return;
  const canvas = getCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const px = lastClientX - rect.left;
  const py = lastClientY - rect.top;
  const nav = mandelbrotRef.value?.getNavigator();
  if (!nav) return;
  const result: string[] = nav.pixel_to_complex(px, py, rect.width, rect.height);
  if (!result || result.length < 2) return;
  emit('cursorCoord', { re: result[0], im: result[1] }, lastClientX, lastClientY);
}

function handleCanvasEnter(e: MouseEvent) {
  cursorOnCanvas = true;
  lastClientX = e.clientX;
  lastClientY = e.clientY;
}

function handleCanvasLeave() {
  cursorOnCanvas = false;
  emit('cursorCoord', null, 0, 0);
}

// Etats d'interaction et navigation
const pressedKeys: Record<string, boolean> = {};

defineExpose({
  getCanvas,
  getEngine: () => mandelbrotRef.value?.getEngine() ?? null
});
let isDragging = false;
let isRotating = false;
let prevX = 0;
let prevY = 0;
let pinchStartDist = 0;
let pinchStartAngle = 0;
let pinchStartAngleView = 0;
let isPinching = false;
let pinchPrevDist = 0;

const moveStep = 0.01;
const angleStep = 0.025;

let updateTimer: number | null = null;

// Double-tap detection for mobile
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;
const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 30;

function getCanvas(): HTMLCanvasElement | null {
  return mandelbrotRef.value?.getCanvas() ?? null;
}

function getCanvasCoords(e: MouseEvent) {
  const canvas = getCanvas();
  if (!canvas) return {x: 0, y: 0, width: 0, height: 0};
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function handleKeydown(e: KeyboardEvent) {
  // Ne pas capturer les touches quand un champ de saisie est actif
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) return;
  pressedKeys[e.code] = true;
}
function handleKeyup(e: KeyboardEvent) {
  // Toujours relâcher la touche pour éviter les touches "collées"
  pressedKeys[e.code] = false;
}

function handleWheel(e: WheelEvent) {
  // En mode pipette, bloquer le zoom
  if (props.pickerMode) { e.preventDefault(); return; }
  e.preventDefault();
  const zoomFactor = 0.95;
  if (e.deltaY < 0) mandelbrotRef.value?.zoom(zoomFactor);
  else mandelbrotRef.value?.zoom(1 / zoomFactor);
  refreshCursorCoord();
}

// Center the view on a specific canvas point
function centerOnCanvasPoint(clientX: number, clientY: number) {
  const canvas = getCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const width = rect.width;
  const height = rect.height;
  const aspect = width / height;
  // Delta from canvas center to the clicked point, normalized
  const dx = (x - width / 2) / width * 2;
  const dy = (y - height / 2) / height * 2;
  mandelbrotRef.value?.translateDirect(dx * aspect, -dy);
}

function handleDblClick(e: MouseEvent) {
  // En mode pipette, bloquer le double-clic
  if (props.pickerMode) { e.preventDefault(); return; }
  e.preventDefault();
  centerOnCanvasPoint(e.clientX, e.clientY);
}

function handleTouchEndForDoubleTap(e: TouchEvent) {
  if (props.pickerMode) return;
  if (e.touches.length !== 0) return;
  const now = Date.now();
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tapX = touch.clientX;
  const tapY = touch.clientY;

  if (
    now - lastTapTime < DOUBLE_TAP_DELAY &&
    Math.hypot(tapX - lastTapX, tapY - lastTapY) < DOUBLE_TAP_DISTANCE
  ) {
    // Double tap detected — center on that point
    e.preventDefault();
    centerOnCanvasPoint(tapX, tapY);
    lastTapTime = 0; // reset to avoid triple-tap
  } else {
    lastTapTime = now;
    lastTapX = tapX;
    lastTapY = tapY;
  }
}

function handleMouseDown(e: MouseEvent) {
  // En mode pipette, bloquer drag/rotation et déclencher la lecture GPU
  if (props.pickerMode) {
    e.preventDefault();
    handlePickerClick(e);
    return;
  }
  if (e.button === 2) {
    isRotating = true;
  } else {
    isDragging = true;
    const coords = getCanvasCoords(e);
    prevX = coords.x;
    prevY = coords.y;
  }
}

/** Lecture GPU au clic en mode pipette. */
async function handlePickerClick(e: MouseEvent) {
  const engine = mandelbrotRef.value?.getEngine();
  if (!engine) return;
  const canvas = getCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;
  const data = await engine.readIterationDataAt(cssX, cssY, rect.width, rect.height);
  if (!data) return;
  emit('palettePick', data, e.clientX, e.clientY);
}

function handleMouseMove(e: MouseEvent) {
  // Track cursor position for continuous coordinate refresh
  lastClientX = e.clientX;
  lastClientY = e.clientY;
  refreshCursorCoord();

  // En mode pipette, pas de drag/rotation
  if (props.pickerMode) return;

  const coords = getCanvasCoords(e);
  if (isRotating) {
    const canvas = getCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = coords.x;
    const mouseY = coords.y;
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    mandelbrotRef.value?.angle(angle);
    return;
  }
  if (!isDragging) return;
  const width = coords.width;
  const height = coords.height;
  const aspect = width / height;
  const dx = (coords.x - prevX) / width * 2;
  const dy = (coords.y - prevY) / height * 2;
  mandelbrotRef.value?.translateDirect(-dx * aspect, dy);
  prevX = coords.x;
  prevY = coords.y;
}

function handleMouseUp(e: MouseEvent) {
  if (props.pickerMode) return;
  if (e.button === 2) isRotating = false;
  else isDragging = false;
}

function handleTouchStart(e: TouchEvent) {
  if (props.pickerMode) return;
  const canvas = getCanvas();
  if (!canvas) return;
  if (e.touches.length === 1) {
    isDragging = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    prevX = touch.clientX - rect.left;
    prevY = touch.clientY - rect.top;
  } else if (e.touches.length === 2) {
    isDragging = false;
    isPinching = true;
    const [t1, t2] = e.touches;
    pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    pinchPrevDist = pinchStartDist;
    pinchStartAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    const params = mandelbrotRef.value?.getParams();
    pinchStartAngleView = params ? parseFloat(params[3]) : 0;
  }
}

function handleTouchMove(e: TouchEvent) {
  if (props.pickerMode) return;
  const canvas = getCanvas();
  if (!canvas) return;
  if (isDragging && e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const aspect = width / height;
    const dx = (x - prevX) / width * 2;
    const dy = (y - prevY) / height * 2;
    mandelbrotRef.value?.translateDirect(-dx * aspect, dy);
    prevX = x;
    prevY = y;
  } else if (isPinching && e.touches.length === 2) {
    const [t1, t2] = e.touches;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    // Incremental zoom: ratio between previous and current finger distance
    const zoomRatio = pinchPrevDist / dist;
    pinchPrevDist = dist;
    mandelbrotRef.value?.zoom(zoomRatio);
    const angleDelta = angle - pinchStartAngle;
    mandelbrotRef.value?.angle(pinchStartAngleView + angleDelta);
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    isDragging = false;
    isPinching = false;
  }
}

function updateLoop() {
  // En mode pipette, pas de navigation clavier
  if (!props.pickerMode) {
    if (pressedKeys['KeyW']) mandelbrotRef.value?.translate(0, moveStep);
    if (pressedKeys['KeyS']) mandelbrotRef.value?.translate(0, -moveStep);
    if (pressedKeys['KeyA']) mandelbrotRef.value?.translate(-moveStep, 0);
    if (pressedKeys['KeyD']) mandelbrotRef.value?.translate(moveStep, 0);
    if (pressedKeys['KeyQ']) mandelbrotRef.value?.rotate(angleStep);
    if (pressedKeys['KeyE']) mandelbrotRef.value?.rotate(-angleStep);
    const zoomFactor = 0.95;
    if (pressedKeys['KeyR']) mandelbrotRef.value?.zoom(zoomFactor);
    if (pressedKeys['KeyF']) mandelbrotRef.value?.zoom(1 / zoomFactor);
  }
  // Refresh cursor tooltip coords each frame (view may have moved under the cursor)
  refreshCursorCoord();
  updateTimer = window.setTimeout(updateLoop, 16);
}

onMounted(async () => {
  const canvas = getCanvas();
  if (!canvas) return;

  // clavier
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);

  // souris / touchpad
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('dblclick', handleDblClick);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mouseenter', handleCanvasEnter);
  canvas.addEventListener('mouseleave', handleCanvasLeave);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  // tactile
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchend', handleTouchEndForDoubleTap, { passive: false });

  // boucle clavier (la boucle de rendu est gérée par l'engine via Mandelbrot.vue)
  updateLoop();
});

onUnmounted(() => {
  // stop keyboard loop
  if (updateTimer !== null) clearTimeout(updateTimer);

  const canvas = getCanvas();
  // remove listeners
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  if (canvas) {
    canvas.removeEventListener('wheel', handleWheel as EventListener);
    canvas.removeEventListener('mousedown', handleMouseDown as EventListener);
    canvas.removeEventListener('dblclick', handleDblClick as EventListener);
    canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    canvas.removeEventListener('mouseenter', handleCanvasEnter);
    canvas.removeEventListener('mouseleave', handleCanvasLeave);
    canvas.removeEventListener('touchstart', handleTouchStart as EventListener);
    canvas.removeEventListener('touchmove', handleTouchMove as EventListener);
    canvas.removeEventListener('touchend', handleTouchEnd as EventListener);
    canvas.removeEventListener('touchend', handleTouchEndForDoubleTap as EventListener);
  }
});
</script>

<template>
  <div style="position: relative; width: 100%; height: 100%;">
    <Mandelbrot
      ref="mandelbrotRef"
      v-model:scale="scale"
      v-model:angle="angle"
      v-model:cx="cx"
      v-model:cy="cy"
      :mu="props.mu"
      :epsilon="props.epsilon"
      :antialiasLevel="props.antialiasLevel"
      :palettePeriod="props.palettePeriod"
      :colorStops="props.colorStops"
      :activateAnimate="props.activateAnimate"
      :paletteOffset="props.paletteOffset"
      :dprMultiplier="props.dprMultiplier"
      :maxIterationMultiplier="props.maxIterationMultiplier"
      :targetFps="props.targetFps"
      :gpuLoadMultiplier="props.gpuLoadMultiplier"
      :interpolationMode="props.interpolationMode"
      :tessellationLevel="props.tessellationLevel"
      :displacementAmount="props.displacementAmount"
      :animationSpeed="props.animationSpeed"
    />
    
    <!-- Contrôles de navigation mobile -->
    <MobileNavigationControls :mandelbrot-ref="mandelbrotRef" v-model:expanded="mobileNavExpanded" />
  </div>
</template>

<style scoped>
/* Le style reste dans Mandelbrot.vue (canvas). Le wrapper peut rester neutre. */
</style>

