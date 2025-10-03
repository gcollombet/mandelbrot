<script setup lang="ts">
import {onMounted, ref, onUnmounted, nextTick, type Ref, defineProps} from 'vue';
import {Engine} from "../Engine.ts";
import {MandelbrotNavigator} from "mandelbrot";
import type {MandelbrotParams} from "../Mandelbrot.ts";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const antialiasLevel = 1;
const palettePeriod = 1;
let canvas: HTMLCanvasElement;
let engine: Engine;
let navigator: any;
const moveStep = 0.04;
const angleStep = 0.025;
// Ajout des props pour les paramètres principaux et les options d'activation
const props = defineProps<{
  scale?: string,
  angle?: string,
  cx?: string,
  cy?: string,
  activatePalette?: boolean,
  activateSkybox?: boolean,
  activateTessellation?: boolean,
  activateWebcam?: boolean,
  activateShading?: boolean
}>();
const mandelbrotParams: Ref<MandelbrotParams> = ref({
  cx: props.cx ?? "-1.5",
  cy: props.cy ?? "0.0",
  mu: 10000.0,
  scale: props.scale ?? "2.5",
  angle: props.angle ?? "0.0",
  maxIterations: 1000,
  antialiasLevel: antialiasLevel,
  palettePeriod: palettePeriod,
  shadingLevel: 1,
  tessellationLevel: 2,
  epsilon: 0.00001,
  colorStops: [
    { color: '#0f0130', position: 0.0 },
    { color: '#206bcb', position: 0.16 },
    { color: '#ffceb6', position: 0.26 },
    { color: '#edffff', position: 0.42 },
    { color: '#ffaa00', position: 0.6425 },
    { color: '#300200', position: 0.8575 },
    { color: '#100000', position: 1.0 },
  ],
  activateShading: props.activateShading ?? true,
  activateTessellation: props.activateTessellation ?? true,
  activateWebcam: props.activateWebcam ?? false,
  activatePalette: props.activatePalette ?? false,
  activateSkybox: props.activateSkybox ?? false,
});

const pressedKeys: Record<string, boolean> = {};

function handleKeydown(e: KeyboardEvent) {
  pressedKeys[e.code] = true;
}
function handleKeyup(e: KeyboardEvent) {
  pressedKeys[e.code] = false;
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

function update() {
  // Z (AZERTY) ou W (QWERTY) : KeyW
  if (pressedKeys['KeyW']) navigator.translate(0, moveStep);
  // S : KeyS
  if (pressedKeys['KeyS']) navigator.translate(0, -moveStep);
  // Q (AZERTY) ou A (QWERTY) :  KeyA
  if (pressedKeys['KeyA']) navigator.translate(-moveStep, 0);
  // D : KeyD
  if (pressedKeys['KeyD']) navigator.translate(moveStep, 0);
  // A (AZERTY) ou Q (QWERTY) pour rotation :  KeyQ
  if (pressedKeys['KeyQ']) navigator.rotate(angleStep);
  // E : KeyE
  if (pressedKeys['KeyE']) navigator.rotate(-angleStep);
  // R : KeyR
  const zoomFactor = 0.7;
  if (pressedKeys['KeyR']) navigator.zoom(zoomFactor);
  // F : KeyF
  if (pressedKeys['KeyF']) navigator.zoom(1 / zoomFactor);
  setTimeout(update, 16);
}

async function animate() {
  await draw();
  requestAnimationFrame(animate);
}

async function draw() {
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
        activatePalette : mandelbrotParams.value.activatePalette,
        activateSkybox : mandelbrotParams.value.activateSkybox,
      });
  await engine.render();
}

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;

  navigator = new MandelbrotNavigator(
      parseFloat(props.cx ?? "-0.75"),
      parseFloat(props.cy ?? "0.0"),
      1000000.0,
      parseFloat(props.scale ?? "1.0"),
      parseFloat(props.angle ?? "0.0")
  );
  engine = new Engine(canvas, {
    activatePalette: props.activatePalette ?? true,
    activateSkybox: props.activateSkybox ?? true,
    shadingLevel: mandelbrotParams.value.shadingLevel,
    tessellationLevel: mandelbrotParams.value.tessellationLevel,
    antialiasLevel: mandelbrotParams.value.antialiasLevel,
    palettePeriod: mandelbrotParams.value.palettePeriod,
    colorStops: mandelbrotParams.value.colorStops,
    activateShading: props.activateShading ?? mandelbrotParams.value.activateShading,
    activateTessellation: props.activateTessellation ?? mandelbrotParams.value.activateTessellation,
    activateWebcam: props.activateWebcam ?? mandelbrotParams.value.activateWebcam
  });
  await engine.initialize(navigator);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  canvas.addEventListener('wheel', handleWheel, {passive: false});
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  update();
  animate();
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
  detectMobile();
  await initWebGPU();
  window.addEventListener('resize', handleResize);
  if (canvasRef.value) {
    canvasRef.value.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasRef.value.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasRef.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  }
  await nextTick();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<style>
canvas {
  width: 100%;
  height: 500px;
  display: block;
}
</style>
