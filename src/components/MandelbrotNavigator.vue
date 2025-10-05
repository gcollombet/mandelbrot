<script setup lang="ts">
import {onMounted, ref, onUnmounted, nextTick, computed, type Ref} from 'vue';
import {Engine} from "../Engine.ts";
import Settings from './Settings.vue';
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
const mandelbrotParams: Ref<MandelbrotParams> = ref({
  cx: "-1.5",
  cy: "0.0",
  mu: 10000.0,
  scale: "2.5",
  angle: "0.0",
  maxIterations: 1,
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
  activateShading: true,
  activateTessellation: false,
  activateWebcam: false,
  activatePalette: true,
  activateSkybox: false,
  activateSmoothness: true,
  activateZebra: false,
});
// Ajoutez ceci dans la section <script setup lang="ts">
const showSettings = ref(false);

function toggleSettings() {
  showSettings.value = !showSettings.value;
}

function onLoadParams() {
  if (!navigator) return;
}

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
        activateSmoothness : mandelbrotParams.value.activateSmoothness,
        activateZebra : mandelbrotParams.value.activateZebra,
      });
  await engine.render();
}

async function initWebGPU() {
  if (!canvasRef.value) return;
  canvas = canvasRef.value;

  navigator = new MandelbrotNavigator(
      -1.87003,
      0.0,
      100000000.0,
       1000,
      0.0
  )
  ;
  engine = new Engine(canvas, {
    activatePalette: true,
    activateSkybox: true,
    shadingLevel: mandelbrotParams.value.shadingLevel,
    tessellationLevel: mandelbrotParams.value.tessellationLevel,
    antialiasLevel: mandelbrotParams.value.antialiasLevel,
    palettePeriod: mandelbrotParams.value.palettePeriod,
    colorStops: mandelbrotParams.value.colorStops,
    activateShading: mandelbrotParams.value.activateShading,
    activateTessellation: mandelbrotParams.value.activateTessellation,
    activateWebcam: mandelbrotParams.value.activateWebcam
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

const showUI = ref(false);

async function playIntroAnimation() {
  // Animation d'intro : zoom et rotation
  if (!navigator) return;
  await nextTick();
  // attendre 0.5s
  await new Promise(resolve => setTimeout(resolve, 500));
  // Animation sur 1.5s
  const duration = 3500;
  const start = performance.now();
  function animateIntro(now: number) {
    const t = Math.min((now - start) / duration, 1) ;
    // Interpolation lissée
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const angle =(Math.PI / 2) * ease;
    navigator.zoom(ease);
    navigator.angle(angle);
    if (t < 1) {
      requestAnimationFrame(animateIntro);
    } else {
      showUI.value = true;
    }
  }
  requestAnimationFrame(animateIntro);
}

// Détection dynamique de la disposition du clavier
function getKeyboardLayout() {
  const lang = window.navigator.language || window.navigator.languages?.[0] || 'en';
  if (lang.startsWith('fr')) return 'azerty';
  if (lang.startsWith('be')) return 'azerty';
  if (lang.startsWith('en')) return 'qwerty';
  if (lang.startsWith('us')) return 'qwerty';
  // Ajoute d'autres cas si besoin
  return 'qwerty';
}
const keyboardLayout = getKeyboardLayout();

const shortcutLabels = computed(() => {
  if (keyboardLayout === 'azerty') {
    return {
      up: 'Z',
      down: 'S',
      left: 'Q',
      right: 'D',
      rotateLeft: 'A',
      rotateRight: 'E',
      zoomIn: 'R',
      zoomOut: 'F',
    };
  } else {
    // QWERTY par défaut
    return {
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      rotateLeft: 'Q',
      rotateRight: 'E',
      zoomIn: 'R',
      zoomOut: 'F',
    };
  }
});

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
  await playIntroAnimation();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

</script>

<template>
  <div style="position: relative; height: 100vh; width: 100vw;">
    <button
      class="menu-hamburger tag is-light is-medium animate__animated"
      :class="showUI ? 'animate__fadeInDown' : ''"
      aria-label="Menu"
      v-show="showUI"
      @click="toggleSettings"
    >
      <span class="hamburger-bar"></span>
      <span class="hamburger-bar"></span>
      <span class="hamburger-bar"></span>
    </button>
    <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
    <div
      v-if="showSettings"
        style="position: absolute; top: 0; left: 0;  z-index: 10; pointer-events: auto; height: 100vh;"
    >
      <Settings v-model="mandelbrotParams" @load="onLoadParams" />
    </div>
    <div
      class="shortcut-hint tag is-light is-medium is-hidden-touch animate__animated"
      :class="showUI ? 'animate__fadeInUp' : ''"
      v-show="showUI"
    >
      Move&nbsp;
      <span class="tag is-black">Left clic</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.up }}</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.left }}</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.down }}</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.right }}</span>&nbsp;
      |&nbsp;Rotate&nbsp;
      <span class="tag is-black">Right clic</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.rotateLeft }}</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.rotateRight }}</span>&nbsp;
       |&nbsp;Zoom&nbsp;
      <span class="tag is-black">Wheel</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.zoomIn }}</span>&nbsp;
      <span class="tag is-black">{{ shortcutLabels.zoomOut }}</span>
    </div>
    <div
      class="footer-love tag is-light is-medium is-hidden-touch animate__animated"
      :class="showUI ? 'animate__fadeInUp' : ''"
      v-show="showUI"
    >
      <small>
        <a href="https://wgpu.rs/"
            target="_blank"
            rel="noopener"
            class="footer-link"
            aria-label="wGPU">
          Made with
            <img src="https://raw.githubusercontent.com/gfx-rs/wgpu/refs/heads/trunk/logo.png"
                 alt="wGPU logo"
                 style="height: 24px; width: 24px; vertical-align: middle;"/>
        </a>
      </small>
      &nbsp;|&nbsp;
      <small>
        <a href="https://github.com/gcollombet/mandelbrot"
           target="_blank"
           rel="noopener"
           class="footer-link"
           aria-label="GitHub">
          <svg class="github-logo" height="20" viewBox="0 0 16 16" width="20" fill="currentColor" style="vertical-align:middle; margin-right:4px;"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path></svg>
          GitHub
        </a>
      </small>
    </div>
    <div v-if="!showUI" class="intro-title-container">
      <div class=" animate__animated animate__fadeIn">
        <h1 class="intro-title animate__animated animate__fadeInDown">Realtime Mandelbrot Viewer</h1>
        <h2 class="intro-sub animate__animated animate__fadeInUp animate__delay-1s">deep zoom</h2>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --bulma-link-text: #111;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.shortcut-hint {
  position: absolute;
  right: 24px;
  bottom: 16px;
  padding: 6px 18px;
  border-radius: 16px;
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(8px);
  color: #111;
  font-size: 1rem;
  font-family: inherit;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  pointer-events: none;
  user-select: none;
  opacity: 0.85;
  letter-spacing: 0.01em;
  z-index: 20;
}
.menu-hamburger {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(8px);
  border: none;
  border-radius: 16px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}
.menu-hamburger:active,
.menu-hamburger:focus {
  background: rgba(255,255,255,0.6);
}
.hamburger-bar {
  display: block;
  width: 28px;
  height: 4px;
  margin: 3px 0;
  background: #111;
  border-radius: 2px;
  transition: all 0.2s;
}
.footer-love {
  position: absolute;
  left: 24px;
  bottom: 16px;
  padding: 6px 18px;
  border-radius: 16px;
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(8px);
  color: #111;
  font-size: 1rem;
  font-family: inherit;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  pointer-events: auto;
  user-select: none;
  opacity: 0.85;
  letter-spacing: 0.01em;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
}
.footer-link {
  color: #111;
  text-decoration: underline;
  transition: color 0.2s;
}
.footer-link:hover {
  color: #e25555;
}
.github-logo {
  display: inline-block;
  vertical-align: middle;
  margin-bottom: 2px;
}
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.ui-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 50;
  opacity: 0.9;
}
.intro-title-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 200;
  pointer-events: none;
  background: none;
}
.intro-title-bg {
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(12px);
  border-radius: 32px;
  padding: 2.5rem 3.5rem 2.2rem 3.5rem;
  box-shadow: 0 8px 48px 0 rgba(0,0,0,0.10);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.intro-title {
  font-size: 6rem;
  font-weight: bold;
  font-family: "hilde-sharp", sans-serif;
  font-weight: 400;
  font-style: normal;
  color: #111;
  margin: 0 0 0.5em 0;
  letter-spacing: 0.04em;
  text-align: center;
  text-shadow: 0 2px 16px rgba(0,0,0,0.08),
  0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff;
  line-height: 1.1;
}
.intro-sub {
  font-size: 2rem;
  color: #000000;
  font-weight: 500;
  margin: 0;
  letter-spacing: 0.12em;
  text-align: center;
  text-shadow: 0 2px 16px rgba(0,0,0,0.08),
               0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
