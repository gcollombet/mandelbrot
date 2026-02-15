<script setup lang="ts">
import {defineProps, nextTick, onMounted, onUnmounted, ref} from 'vue';
import Mandelbrot from './Mandelbrot.vue';
import type {MandelbrotExposed} from "../types/MandelbrotExposed.ts";

const cx = defineModel<string>('cx')
const cy = defineModel<string>('cy')
const scale = defineModel<string>('scale')
const angle = defineModel<number>('angle')

// Props pass-through pour initialiser Mandelbrot
const props = defineProps<{
  mu?: number,
  epsilon?: number,
  colorStops?: Array<{ color: string, position: number }>,
  antialiasLevel?: number,
  tessellationLevel?: number,
  shadingLevel?: number,
  palettePeriod?: number,
  paletteOffset?: number,
  activatePalette?: boolean,
  activateSkybox?: boolean,
  activateTessellation?: boolean,
  activateWebcam?: boolean,
  activateShading?: boolean,
  activateZebra?: boolean,
  activateSmoothness?: boolean,
}>();

const mandelbrotRef = ref<MandelbrotExposed | null>(null);

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

const moveStep = 0.04;
const angleStep = 0.025;

let rafId: number | null = null;
let updateTimer: number | null = null;

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
  pressedKeys[e.code] = true;
}
function handleKeyup(e: KeyboardEvent) {
  pressedKeys[e.code] = false;
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const zoomFactor = 0.8;
  if (e.deltaY < 0) mandelbrotRef.value?.zoom(zoomFactor);
  else mandelbrotRef.value?.zoom(1 / zoomFactor);
}

function handleMouseDown(e: MouseEvent) {
  if (e.button === 2) {
    isRotating = true;
  } else {
    isDragging = true;
    const coords = getCanvasCoords(e);
    prevX = coords.x;
    prevY = coords.y;
  }
}

function handleMouseMove(e: MouseEvent) {
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
  if (e.button === 2) isRotating = false;
  else isDragging = false;
}

function handleTouchStart(e: TouchEvent) {
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
    pinchStartAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    const params = mandelbrotRef.value?.getParams();
    pinchStartAngleView = params ? parseFloat(params[3]) : 0;
  }
}

function handleTouchMove(e: TouchEvent) {
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
    const zoomRatio = pinchStartDist / dist;
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
  if (pressedKeys['KeyW']) mandelbrotRef.value?.translate(0, moveStep);
  if (pressedKeys['KeyS']) mandelbrotRef.value?.translate(0, -moveStep);
  if (pressedKeys['KeyA']) mandelbrotRef.value?.translate(-moveStep, 0);
  if (pressedKeys['KeyD']) mandelbrotRef.value?.translate(moveStep, 0);
  if (pressedKeys['KeyQ']) mandelbrotRef.value?.rotate(angleStep);
  if (pressedKeys['KeyE']) mandelbrotRef.value?.rotate(-angleStep);
  const zoomFactor = 0.9;
  if (pressedKeys['KeyR']) mandelbrotRef.value?.zoom(zoomFactor);
  if (pressedKeys['KeyF']) mandelbrotRef.value?.zoom(1 / zoomFactor);
  updateTimer = window.setTimeout(updateLoop, 16);
}

async function animate() {
  await mandelbrotRef.value?.drawOnce();
  rafId = requestAnimationFrame(animate);
}

onMounted(async () => {
  await nextTick();
  await mandelbrotRef.value?.initialize();

  const canvas = getCanvas();
  if (!canvas) return;

  // clavier
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);

  // souris / touchpad
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  // tactile
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  // boucles
  updateLoop();
  await animate();
});

onUnmounted(() => {
  // stop loops
  if (rafId !== null) cancelAnimationFrame(rafId);
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
    canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    canvas.removeEventListener('touchstart', handleTouchStart as EventListener);
    canvas.removeEventListener('touchmove', handleTouchMove as EventListener);
    canvas.removeEventListener('touchend', handleTouchEnd as EventListener);
  }
});
</script>

<template>
  <Mandelbrot
    ref="mandelbrotRef"
    v-model:scale="scale"
    v-model:angle="angle"
    v-model:cx="cx"
    v-model:cy="cy"
    :mu="props.mu"
    :epsilon="props.epsilon"
    :antialiasLevel="props.antialiasLevel"
    :shadingLevel="props.shadingLevel"
    :palettePeriod="props.palettePeriod"
    :tessellationLevel="props.tessellationLevel"
    :colorStops="props.colorStops"
    :activatePalette="props.activatePalette"
    :activateSkybox="props.activateSkybox"
    :activateTessellation="props.activateTessellation"
    :activateWebcam="props.activateWebcam"
    :activateShading="props.activateShading"
    :activateZebra="props.activateZebra"
    :activateSmoothness="props.activateSmoothness"
    :paletteOffset="props.paletteOffset"
  />
</template>

<style scoped>
/* Le style reste dans Mandelbrot.vue (canvas). Le wrapper peut rester neutre. */
</style>

