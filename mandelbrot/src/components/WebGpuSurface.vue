<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Engine} from "../Engine.ts";
import Settings from './Settings.vue';
import { MandelbrotNavigator } from "mandelbrot";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const antialiasLevel = 1;
const palettePeriod = 128;
let canvas: HTMLCanvasElement;
let engine: Engine;
let navigator: any;
const moveStep = 0.04;
const angleStep = 0.025;

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
let startX = 0;
let startY = 0;
let startParams: number[] = [];

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
    startX = coords.x;
    startY = coords.y;
    startParams = navigator.get_params();
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
    navigator.set_target(startParams[0], startParams[1], startParams[2], angle);
    return;
  }
  if (!isDragging) return;
  const dx = coords.x - startX;
  const dy = coords.y - startY;
  const moveX = -dx * 2 / coords.width * (coords.width / coords.height);
  const moveY = dy * 2 / coords.height;
  navigator.set_target(startParams[0] + moveX, startParams[1] + moveY, startParams[2], startParams[3]);
}

function handleMouseUp(e: MouseEvent) {
  if (e.button === 2) {
    isRotating = false;
  } else {
    isDragging = false;
  }
}

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;
  engine = new Engine(canvas, {
    antialiasLevel: 1,
    palettePeriod: 128
  });
  await engine.initialize();
  navigator = new MandelbrotNavigator(-0.749208775, -0.0798967515, 2.5, 0.0);

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  canvas.addEventListener('wheel', handleWheel, {passive: false});
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  function animate() {
    if (pressedKeys['z']) navigator.navigate(0, moveStep);
    if (pressedKeys['s']) navigator.navigate(0, -moveStep);
    if (pressedKeys['q']) navigator.navigate(-moveStep, 0);
    if (pressedKeys['d']) navigator.navigate(moveStep, 0);
    if (pressedKeys['a']) navigator.rotate(angleStep);
    if (pressedKeys['e']) navigator.rotate(-angleStep);
    const epsilon = 0.0001;
    const [dcx, dcy, scale, angle] = navigator.step();
    const maxIterations = Math.min(Math.max(100, 80 + 120 * Math.log2(1.0 / scale)), 1000000);
    engine.update({ dcx, dcy, scale, angle, maxIterations, epsilon }, { antialiasLevel, palettePeriod });
    engine.render();
    requestAnimationFrame(animate);
  }
  animate();
}

onMounted(() => {
  initWebGPU();
})


</script>

<template>
  <div style="position: relative; height: 100vh; width: 100vw;">
    <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
    <div style="position: absolute; top: 0; left: 0; z-index: 10; width: 320px; pointer-events: auto;">
<!--      <Settings v-model="targetMandelbrot" />-->
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
