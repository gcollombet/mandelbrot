<script setup lang="ts">
import {onMounted, ref, onUnmounted} from 'vue';
import {Engine} from "../Engine.ts";
import Settings from './Settings.vue';
import {MandelbrotNavigator} from "mandelbrot";
import type {MandelbrotParams} from "../Mandelbrot.ts";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const antialiasLevel = 1;
const palettePeriod = 128;
let canvas: HTMLCanvasElement;
let engine: Engine;
let navigator: any;
const moveStep = 0.04;
const angleStep = 0.025;
const mandelbrotParams = ref({
  cx: "-1.5",
  cy: "0.0",
  mu: 10000.0,
  scale: "2.5",
  angle: "0.0",
  maxIterations: 1000,
  antialiasLevel: antialiasLevel,
  palettePeriod: palettePeriod,
} as MandelbrotParams);

function onLoadParams(params: { cx: string, cy: string, scale: string, angle: string }) {
  if (!navigator) return;
  navigator.origin(String(params.cx), String(params.cy));
  navigator.scale(String(params.scale));
  navigator.angle(Number(params.angle));
}

function handleKeydown(e: KeyboardEvent) {
  pressedKeys[e.key.toLowerCase()] = true;
}
function handleKeyup(e: KeyboardEvent) {
  pressedKeys[e.key.toLowerCase()] = false;
}
function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const zoomFactor = 0.8;
  if (e.deltaY < 0) {
    navigator.zoom(zoomFactor);
  } else {
    navigator.zoom(1 / zoomFactor);
  }
}

const pressedKeys: Record<string, boolean> = {};
let isDragging = false;
let isRotating = false;
let prevX = 0;
let prevY = 0;
const isMobile = ref(false);
let pinchStartDist = 0;
let pinchStartAngle = 0;
let pinchStartAngleView = 0;
let isPinching = false;

function detectMobile() {
  if (typeof window !== 'undefined' && window.navigator) {
    isMobile.value = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent);
  } else {
    isMobile.value = false;
  }
}

function getCanvasCoords(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return {x: 0, y: 0, width: 0, height: 0};
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    width: rect.width,
    height: rect.height
  };
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
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = coords.x;
    const mouseY = coords.y;
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    navigator.angle(angle);
    return;
  }
  if (!isDragging) return;
  const width = coords.width;
  const height = coords.height;
  const aspect = width / height;
  const dx = (coords.x - prevX) / width * 2;
  const dy = (coords.y - prevY) / height * 2 ;
  // Correction aspect ratio et échelle
  const dx_complex = -dx * aspect;
  const dy_complex = dy ;
  navigator.translate_direct(dx_complex, dy_complex);
  prevX = coords.x;
  prevY = coords.y;
}

function handleMouseUp(e: MouseEvent) {
  if (e.button === 2) {
    isRotating = false;
  } else {
    isDragging = false;
  }
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isDragging = true;
    const touch = e.touches[0];
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    prevX = touch.clientX - rect.left;
    prevY = touch.clientY - rect.top;
  } else if (e.touches.length === 2) {
    isDragging = false;
    isPinching = true;
    const [t1, t2] = e.touches;
    pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    pinchStartAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    //pinchStartScale = parseFloat(mandelbrotParams.value.scale);
    pinchStartAngleView = parseFloat(mandelbrotParams.value.angle);
  }
}

function handleTouchMove(e: TouchEvent) {
  if (isDragging && e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const aspect = width / height;
    const dx = (x - prevX) / width * 2;
    const dy = (y - prevY) / height * 2;
    navigator.translate_direct(-dx * aspect, dy);
    prevX = x;
    prevY = y;
  } else if (isPinching && e.touches.length === 2) {
    const [t1, t2] = e.touches;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    // Zoom
    const zoomRatio = pinchStartDist / dist;
    navigator.zoom(zoomRatio);
    // Rotation
    const angleDelta = angle - pinchStartAngle;
    navigator.angle(pinchStartAngleView + angleDelta);
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    isDragging = false;
    isPinching = false;
  }
}

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;

  navigator = new MandelbrotNavigator(
      -0.5572506229492064091994520833394481793049,
      0.6355989165839159099969652617613951003226,
      10000.0,
      2.5,
      0.0
  )
  ;
  engine = new Engine(canvas, {
    antialiasLevel: 1,
    palettePeriod: 128
  });
  await engine.initialize(navigator);

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  canvas.addEventListener('wheel', handleWheel, {passive: false});
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  function animate() {
    if (pressedKeys['z']) navigator.translate(0, moveStep);
    if (pressedKeys['s']) navigator.translate(0, -moveStep);
    if (pressedKeys['q']) navigator.translate(-moveStep, 0);
    if (pressedKeys['d']) navigator.translate(moveStep, 0);
    if (pressedKeys['a']) navigator.rotate(angleStep);
    if (pressedKeys['e']) navigator.rotate(-angleStep);
    // Ajout des touches R et F pour zoomer
    const zoomFactor = 0.8;
    if (pressedKeys['r']) navigator.zoom(zoomFactor);
    if (pressedKeys['f']) navigator.zoom(1 / zoomFactor);
    const epsilon = mandelbrotParams.value.epsilon;
    const [dx, dy, scale, angle] = navigator.step();
    const [cx_string, cy_string, scale_string, angle_string] = navigator.get_params() as [string, string, string, string];
    const mu = mandelbrotParams.value.mu;
    mandelbrotParams.value.cx = cx_string;
    mandelbrotParams.value.cy = cy_string;
    mandelbrotParams.value.scale = scale_string;
    mandelbrotParams.value.angle = angle_string;
    const maxIterations = Math.min(Math.max(100, 80 + 20 * Math.log2(1.0 / scale)), 1000000);
    engine.update({ cx: dx, cy: dy, mu, scale, angle, maxIterations, epsilon }, { antialiasLevel, palettePeriod });
    engine.render();
    requestAnimationFrame(animate);
  }
  animate();
}

function handleResize() {
  if (!canvasRef.value || !engine) return;
  const rect = canvasRef.value.getBoundingClientRect();
  canvasRef.value.width = rect.width;
  canvasRef.value.height = rect.height;
  if (engine.resize) {
    engine.resize();
  }
  engine.render();
}

onMounted(() => {
  detectMobile();
  initWebGPU();
  window.addEventListener('resize', handleResize);
  if (canvasRef.value) {
    canvasRef.value.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasRef.value.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasRef.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  }
  // Appel initial pour s'assurer que la taille est correcte
  // handleResize();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

</script>

<template>
  <div style="position: relative; height: 100vh; width: 100vw;">
    <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
    <div v-if="false" style="position: absolute; top: 0; left: 0; z-index: 10; width: 320px; pointer-events: auto;">
      <Settings v-model="mandelbrotParams" @load="onLoadParams" />
    </div>
  </div>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
