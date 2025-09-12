<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Engine} from "../Engine.ts";
import Settings from './Settings.vue';
import {MandelbrotNavigator} from "mandelbrot";


const canvasRef = ref<HTMLCanvasElement | null>(null);
const antialiasLevel = 1;
const palettePeriod = 128;
let canvas: HTMLCanvasElement;
let engine: Engine;
let navigator: any;
const moveStep = 0.04;
const angleStep = 0.025;
const mandelbrotParams = ref({
  cx: -0.749208775,
  cy: -0.0798967515,
  scale: 2.5,
  angle: 0.0,
  maxIterations: 1000,
  antialiasLevel: antialiasLevel,
  palettePeriod: palettePeriod
});

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
    navigator.rotate(angle - navigator.get_params()[3]);
    return;
  }
  if (!isDragging) return;
  const dx = (coords.x - prevX) / coords.width;
  const dy = (coords.y - prevY) / coords.height;
  navigator.translate_direct(-dx, dy);
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

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;

  navigator = new MandelbrotNavigator(-0.749208775, -0.0798967515, 2.5, 0.0);
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
    const epsilon = 0.0001;
    const [cx, cy, scale, angle] = navigator.step();
    mandelbrotParams.value.cx = cx;
    mandelbrotParams.value.cy = cy;
    mandelbrotParams.value.scale = scale;
    mandelbrotParams.value.angle = angle;
    const maxIterations = Math.min(Math.max(100, 80 + 30 * Math.log2(1.0 / scale)), 1000000);
    engine.update({ cx, cy, scale, angle, maxIterations, epsilon }, { antialiasLevel, palettePeriod });
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
      <Settings v-model="mandelbrotParams" />
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
