<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {mandelbrot, MandelbrotStep} from "mandelbrot"

// import shader mandelbrot.wgsl content into a var
// Assurez-vous que le fichier mandelbrot.wgsl existe dans le dossier src/shaders
import shaderCodePass1 from '../assets/mandelbrot.wgsl?raw'
import shaderCodePass2 from '../assets/color.wgsl?raw'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const antialiasLevel = 1; // Peut être 1, 2 ou 4
const palettePeriod = 128; // Nombre d'itérations avant répétition de la palette
const orbit: MandelbrotStep[] = mandelbrot(0, 0, 1000000);

function drawMandelbrot(
    width: number,
    height: number,
    cx: number,
    cy: number,
    scale: number,
    antialiasLevel: number,
    angle: number
) {

  // --- Création du buffer d'orbite sous forme de structure ---
  const mandelbrotBufferData = new Float32Array(orbit.length * 4);
  for (let i = 0; i < orbit.length; i++) {
    mandelbrotBufferData[i * 4] = orbit[i].zx;
    mandelbrotBufferData[i * 4 + 1] = orbit[i].zy;
    mandelbrotBufferData[i * 4 + 2] = orbit[i].dx;
    mandelbrotBufferData[i * 4 + 3] = orbit[i].dy;
  }
  // Correction : utiliser STORAGE au lieu de UNIFORM
  const mandelbrotBuffer = device.createBuffer({
    size: mandelbrotBufferData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(mandelbrotBuffer, 0, mandelbrotBufferData.buffer);

  // --- Création des buffers et textures ---
  const uniformData1 = new Float32Array([
    cx,
    cy,
    scale,
    width / height,
    antialiasLevel,
    angle,
    palettePeriod,
  ]);
  const uniformBuffer1 = device.createBuffer({
    size: uniformData1.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(uniformBuffer1, 0, uniformData1.buffer);

  const uniformData2 = new Float32Array([
    palettePeriod,
    100,
    100,
  ]);
  const uniformBuffer2 = device.createBuffer({
    size: uniformData2.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(uniformBuffer2, 0, uniformData2.buffer);

  // Texture intermédiaire pour la première passe
  const intermediateTexture = device.createTexture({
    size: { width, height, depthOrArrayLayers: 1 },
    format: 'rgba32float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
  });
  const intermediateView = intermediateTexture.createView();

  // --- Pipeline première passe ---
  const shaderModule1 = device.createShaderModule({ code: shaderCodePass1 });
  const pipeline1 = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule1, entryPoint: 'vs_main' },
    fragment: { module: shaderModule1, entryPoint: 'fs_main', targets: [{ format: 'rgba32float' }] },
    primitive: { topology: 'triangle-list' }
  });
  const bindGroup1 = device.createBindGroup({
    layout: pipeline1.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer1 } },
      { binding: 1, resource: { buffer: mandelbrotBuffer } }
    ]
  });

  // --- Pipeline deuxième passe ---
  const shaderModule2 = device.createShaderModule({ code: shaderCodePass2 });
  const pipeline2 = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule2, entryPoint: 'vs_main' },
    fragment: { module: shaderModule2, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });
  const bindGroup2 = device.createBindGroup({
    layout: pipeline2.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer2 } },
      { binding: 1, resource: intermediateView }
    ]
  });

  // --- Commandes GPU ---
  const commandEncoder = device.createCommandEncoder();

  // Première passe : calcul des itérations et dérivée
  const renderPass1 = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: intermediateView,
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]
  });
  renderPass1.setPipeline(pipeline1);
  renderPass1.setBindGroup(0, bindGroup1);
  renderPass1.draw(6, 1, 0, 0);
  renderPass1.end();

  // Deuxième passe : coloration
  const textureView = ctx.getCurrentTexture().createView();
  const renderPass2 = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 1, g: 1, b: 1, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]
  });
  renderPass2.setPipeline(pipeline2);
  renderPass2.setBindGroup(0, bindGroup2);
  renderPass2.draw(6, 1, 0, 0);
  renderPass2.end();

  device.queue.submit([commandEncoder.finish()]);
}

let device: GPUDevice;
let ctx : GPUCanvasContext;
let format : GPUTextureFormat
async function initWebGPU() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  if (!navigator.gpu) {
    alert('WebGPU non supporté sur ce navigateur.');
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return;
  device = await adapter.requestDevice();
  ctx = canvas.getContext('webgpu') as GPUCanvasContext;
  format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });

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
    { cx: -0.743643887037158704752191506114774, cy: 0.131825904205311970493132056385139 }, // Deep zoom
    { cx: -1.749705768080503, cy: -6.13369029080495e-05 }, // Zoom sur une autre région intéressante
    { cx: -0.5503295086752807, cy:-0.6259346555912755 }, // Zoom sur une autre région intéressante
    { cx: -0.19569582393630502, cy: 1.1000276413181806}, // Zoom sur une autre région intéressante
  ];
  let currentInterestIndex = 0;
  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 0;
    const height = canvas.parentElement?.clientHeight || 0;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  function animate() {
    resize();
    if (!canvas) return;

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
    cx += velocityCx;
    cy += velocityCy;
    scale += velocityScale;
    angle += velocityAngle;
    drawMandelbrot(canvas.width, canvas.height, cx, cy, scale, antialiasLevel, angle);
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
    if (!canvas) return { x: 0, y: 0, width: 0, height: 0 };
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
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
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
