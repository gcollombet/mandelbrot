<script setup lang="ts">
import {onMounted, ref} from 'vue'
// import {mandelbrot, MandelbrotStep} from "mandelbrot"


import {Engine} from "../Engine.ts";

const canvasRef = ref<HTMLCanvasElement | null>(null)

const antialiasLevel = 1; // Peut être 1, 2 ou 4
const palettePeriod = 128; // Nombre d'itérations avant répétition de la palette
// const orbit: MandelbrotStep[] = mandelbrot(0, 0, 1000);

let canvas: HTMLCanvasElement;

let engine: Engine;

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;
  engine = new Engine(canvas, {
    antialiasLevel: 1,
    palettePeriod: 128
  });
  await engine.initialize()

  // Point d'intérêt (zoom deep)
  let cx = -0.743643887037158704752191506114774;
  let cy = 0.131825904205311970493132056385139;
  let scale = 2.5;
  let moveStep = 0.04; // déplacement relatif à scale

  // Variables pour navigation fluide
  let targetCx = cx;
  let targetCy = cy;
  let targetScale = scale;
  let velocityCx = 0;
  let velocityCy = 0;
  let velocityScale = 0;
  const accel = 0.05; // accélération
  const damping = 0.7; // amortissement

  // Variables pour la rotation
  let angle = 0.0;
  let targetAngle = 0.0;
  let velocityAngle = 0.0;
  const angleStep = 0.025; // vitesse de rotation

  function moveInCanvasAxis(dx: number, dy: number) {
    // Applique la rotation directe (angle) pour déplacer dans l'axe du canvas
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dxComplex = cosA * dx - sinA * dy;
    const dyComplex = sinA * dx + cosA * dy;
    targetCx += dxComplex;
    targetCy += dyComplex;
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
      targetScale *= zoomFactor;
    } else {
      targetScale /= zoomFactor;
    }
  }

  const interestPointCollection = [
    {cx: -0.743643887037158704752191506114774, cy: 0.131825904205311970493132056385139}, // Deep zoom
    {cx: -1.749705768080503, cy: -6.13369029080495e-05}, // Zoom sur une autre région intéressante
    {cx: -0.5503295086752807, cy: -0.6259346555912755}, // Zoom sur une autre région intéressante
    {cx: -0.19569582393630502, cy: 1.1000276413181806}, // Zoom sur une autre région intéressante
  ];
  let currentInterestIndex = 0;

  function animate() {

    // Mouvement fluide selon les touches maintenues
    if (pressedKeys['z']) {
      moveInCanvasAxis(0, moveStep * targetScale);
    }
    if (pressedKeys['s']) {
      moveInCanvasAxis(0, -moveStep * targetScale);
    }
    if (pressedKeys['q']) {
      moveInCanvasAxis(-moveStep * targetScale, 0);
    }
    if (pressedKeys['d']) {
      moveInCanvasAxis(moveStep * targetScale, 0);
    }
    if (pressedKeys['a']) {
      targetAngle += angleStep;
    }
    if (pressedKeys['e']) {
      targetAngle -= angleStep;
    }

    // Animation fluide vers la cible
    velocityCx = (targetCx - cx) * accel + velocityCx * damping;
    velocityCy = (targetCy - cy) * accel + velocityCy * damping;
    velocityScale = (targetScale - scale) * accel + velocityScale * damping;
    velocityAngle = (targetAngle - angle) * accel + velocityAngle * damping;
    const epsilon = 0.0001;
    if(Math.abs(velocityAngle) < 0.001) {
      velocityAngle = 0.0;
    }
    if(Math.abs(velocityCy) < scale / canvas.height * 2.0) {
      velocityCy = 0.0;
    }
    if(Math.abs(velocityCx) < scale / canvas.width * 2.0) {
      velocityCx = 0.0;
    }
    if(Math.abs(velocityScale) < scale / 100.0) {
      velocityScale = 0.0;
    }
    cx += velocityCx;
    cy += velocityCy;
    scale += velocityScale;
    angle += velocityAngle;

    const maxIterations = Math.min(Math.max(100, 80 + 40 * Math.log2(1.0 / scale)), 100000);


    engine.update(
        {
          cx,
          cy,
          scale,
          angle,
          maxIterations,
          epsilon
        },
        {
          antialiasLevel,
          palettePeriod,
        }
    )
    // render only if there is a change

    engine.render();
    // drawMandelbrot(canvas.width, canvas.height, cx, cy, scale, antialiasLevel, angle);
    if (scale < 0.0000001) {
      currentInterestIndex = (currentInterestIndex + 1) % interestPointCollection.length;
      const point = interestPointCollection[currentInterestIndex];
      targetCx = cx = point.cx;
      targetCy = cy = point.cy;
      targetScale = scale = 2.5;
      velocityCx = velocityCy = velocityScale = 0;
      targetAngle = angle = 0.0;
      velocityAngle = 0.0;
    }
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
      startCx = targetCx;
      startCy = targetCy;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const coords = getCanvasCoords(e);
    if (isRotating) {
      // Rotation continue tant que le bouton droit est enfoncé
      const rect = canvasRef.value?.getBoundingClientRect();
      if (!rect) return;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mouseX = coords.x;
      const mouseY = coords.y;
      targetAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      return;
    }
    if (!isDragging) return;
    const dx = coords.x - startX;
    const dy = coords.y - startY;
    // Déplacement dans l'axe du canvas, mais appliqué dans le plan complexe selon la rotation
    const moveX = -dx * targetScale * 2 / coords.width * (coords.width / coords.height);
    const moveY = dy * targetScale * 2 / coords.height;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dxComplex = cosA * moveX - sinA * moveY;
    const dyComplex = sinA * moveX + cosA * moveY;
    targetCx = startCx + dxComplex;
    targetCy = startCy + dyComplex;
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button === 2) {
      isRotating = false;
    } else {
      isDragging = false;
    }
  }

  // Ajout des listeners
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
  initWebGPU()
})
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
