<script setup lang="ts">
import {onMounted, ref} from 'vue';
// import {mandelbrot, MandelbrotStep} from "mandelbrot"


import {Engine} from "../Engine.ts";
import Settings from './Settings.vue';
import type {MandelbrotParams} from "../Mandelbrot.ts";

const canvasRef = ref<HTMLCanvasElement | null>(null)

const antialiasLevel = 1; // Peut-être 1, 2 ou 4
const palettePeriod = 128; // Nombre d'itérations avant répétition de la palette
// const orbit: MandelbrotStep[] = mandelbrot(0, 0, 1000);

let canvas: HTMLCanvasElement;
let engine: Engine;

// Point d'intérêt (zoom deep)
let mandelbrot = {
  cx: -0.749208775,
  cy: -0.0798967515,
  scale: 2.5,
  angle: 0.0,
};
let targetMandelbrot = ref<MandelbrotParams>({ ...mandelbrot }).value;
let moveStep = 0.04; // déplacement relatif à scale

// Variables pour navigation fluide
let velocityCx = 0;
let velocityCy = 0;
let velocityScale = 0;
let velocityAngle = 0.0;
const accel = 0.05; // accélération
const damping = 0.7; // amortissement
const angleStep = 0.025; // vitesse de rotation

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;
  engine = new Engine(canvas, {
    antialiasLevel: 1,
    palettePeriod: 128
  });
  await engine.initialize();

  function moveInCanvasAxis(dx: number, dy: number) {
    const cosA = Math.cos(mandelbrot.angle);
    const sinA = Math.sin(mandelbrot.angle);
    const dxComplex = cosA * dx - sinA * dy;
    const dyComplex = sinA * dx + cosA * dy;
    targetMandelbrot.cx += dxComplex;
    targetMandelbrot.cy += dyComplex;
  }

  const pressedKeys: Record<string, boolean> = {};

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
      targetMandelbrot.scale *= zoomFactor;
    } else {
      targetMandelbrot.scale /= zoomFactor;
    }
  }

  function animate() {
    // Mouvement fluide selon les touches maintenues
    if (pressedKeys['z']) {
      moveInCanvasAxis(0, moveStep * targetMandelbrot.scale);
    }
    if (pressedKeys['s']) {
      moveInCanvasAxis(0, -moveStep * targetMandelbrot.scale);
    }
    if (pressedKeys['q']) {
      moveInCanvasAxis(-moveStep * targetMandelbrot.scale, 0);
    }
    if (pressedKeys['d']) {
      moveInCanvasAxis(moveStep * targetMandelbrot.scale, 0);
    }
    if (pressedKeys['a']) {
      targetMandelbrot.angle += angleStep;
    }
    if (pressedKeys['e']) {
      targetMandelbrot.angle -= angleStep;
    }

    // Animation fluide vers la cible
    velocityCx = (targetMandelbrot.cx - mandelbrot.cx) * accel + velocityCx * damping;
    velocityCy = (targetMandelbrot.cy - mandelbrot.cy) * accel + velocityCy * damping;
    velocityScale = (targetMandelbrot.scale - mandelbrot.scale) * accel + velocityScale * damping;
    velocityAngle = (targetMandelbrot.angle - mandelbrot.angle) * accel + velocityAngle * damping;
    const epsilon = 0.0001;
    if(Math.abs(velocityAngle) < 0.001) velocityAngle = 0.0;
    if(Math.abs(velocityCy) < mandelbrot.scale / canvas.height * 2.0) velocityCy = 0.0;
    if(Math.abs(velocityCx) < mandelbrot.scale / canvas.width * 2.0) velocityCx = 0.0;
    if(Math.abs(velocityScale) < mandelbrot.scale / 100.0) velocityScale = 0.0;
    mandelbrot.cx += velocityCx;
    mandelbrot.cy += velocityCy;
    mandelbrot.scale += velocityScale;
    mandelbrot.angle += velocityAngle;

    const maxIterations = Math.min(Math.max(100, 80 + 40 * Math.log2(1.0 / mandelbrot.scale)), 100000);

    engine.update(
      {
        cx: mandelbrot.cx,
        cy: mandelbrot.cy,
        scale: mandelbrot.scale,
        angle: mandelbrot.angle,
        maxIterations,
        epsilon
      },
      {
        antialiasLevel,
        palettePeriod,
      }
    );
    engine.render();
    requestAnimationFrame(animate);
  }

  let isDragging = false;
  let isRotating = false;
  let startX = 0;
  let startY = 0;
  let startCx = 0;
  let startCy = 0;

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
      startCx = targetMandelbrot.cx;
      startCy = targetMandelbrot.cy;
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
      targetMandelbrot.angle = Math.atan2(mouseY - centerY, mouseX - centerX);
      return;
    }
    if (!isDragging) return;
    const dx = coords.x - startX;
    const dy = coords.y - startY;
    const moveX = -dx * targetMandelbrot.scale * 2 / coords.width * (coords.width / coords.height);
    const moveY = dy * targetMandelbrot.scale * 2 / coords.height;
    const cosA = Math.cos(mandelbrot.angle);
    const sinA = Math.sin(mandelbrot.angle);
    const dxComplex = cosA * moveX - sinA * moveY;
    const dyComplex = sinA * moveX + cosA * moveY;
    targetMandelbrot.cx = startCx + dxComplex;
    targetMandelbrot.cy = startCy + dyComplex;
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button === 2) {
      isRotating = false;
    } else {
      isDragging = false;
    }
  }

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  canvas.addEventListener('wheel', handleWheel, {passive: false});
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

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
      <Settings v-model="targetMandelbrot" />
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
