<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import MandelbrotController from './MandelbrotController.vue';
import Settings from './Settings.vue';
import type {MandelbrotParams} from "../Mandelbrot.ts";

import type {MandelbrotExposed} from '../types/MandelbrotExposed';

const mandelbrotCtrlRef = ref<MandelbrotExposed | null>(null);
const mandelbrotEngine = computed(() => mandelbrotCtrlRef.value?.getEngine() ?? null);
const mandelbrotCanvas = computed(() => mandelbrotCtrlRef.value?.getCanvas() ?? null);

const showSettings = ref(false);
const shortcutsSuspended = ref(false);

const showUI = ref(true);

// Paramètres Mandelbrot avec valeurs par défaut
const LOCAL_STORAGE_CURRENT_KEY = 'mandelbrot_last_settings';
const mandelbrotParams = ref<MandelbrotParams>({
  cx: "-0.743643887037158704752191506114774",
  cy: "0.131825904205311970493132056385139",
  mu: 10000.0,
  scale: "2.5",
  angle: 0.0,
  maxIterations: 1000,
  antialiasLevel: 1,
  palettePeriod: 1,
  paletteOffset: 0,
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

// Restore paramètres à partir du localStorage puis surveille et persiste à chaque changement
onMounted(() => {
  window.addEventListener('keydown', handleSettingsHotkey);
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CURRENT_KEY);
    if (raw) {
      Object.assign(mandelbrotParams.value, JSON.parse(raw));
    }
  } catch {}
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleSettingsHotkey);
});
watch(mandelbrotParams, (params) => {
  localStorage.setItem(LOCAL_STORAGE_CURRENT_KEY, JSON.stringify(params));
}, { deep: true });

function toggleSettings() {
  showSettings.value = !showSettings.value;
}

// Gestion du raccourci clavier "W" pour ouvrir/fermer les settings
function handleSettingsHotkey(e: KeyboardEvent) {
  if (shortcutsSuspended.value) return;
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
  if ((e.key === 'w' || e.key === 'W') && !e.repeat) {
    e.preventDefault();
    toggleSettings();
  }
}

// Détection de la disposition du clavier
function getKeyboardLayout() {
  const lang = window.navigator.language || window.navigator.languages?.[0] || 'en';
  if (lang.startsWith('fr') || lang.startsWith('be')) return 'azerty';
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
</script>

<template>
  <div style="position: relative; height: 100vh; width: 100vw;">
    <!-- Bouton hamburger pour ouvrir les settings -->
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

    <!-- Composant MandelbrotController avec tous les paramètres -->
    <MandelbrotController
      ref="mandelbrotCtrlRef"
      style="width: 100%; height: 100%; display: block;"
      v-model:scale="mandelbrotParams.scale"
      v-model:angle="mandelbrotParams.angle"
      v-model:cx="mandelbrotParams.cx"
      v-model:cy="mandelbrotParams.cy"
      :mu="mandelbrotParams.mu"
      :shadingLevel="mandelbrotParams.shadingLevel"
      :antialiasLevel="mandelbrotParams.antialiasLevel"
      :tessellationLevel="mandelbrotParams.tessellationLevel"
      :epsilon="mandelbrotParams.epsilon"
      :palettePeriod="mandelbrotParams.palettePeriod"
      :paletteOffset="mandelbrotParams.paletteOffset"
      :colorStops="mandelbrotParams.colorStops"
      :activatePalette="mandelbrotParams.activatePalette"
      :activateSkybox="mandelbrotParams.activateSkybox"
      :activateTessellation="mandelbrotParams.activateTessellation"
      :activateWebcam="mandelbrotParams.activateWebcam"
      :activateShading="mandelbrotParams.activateShading"
      :activateZebra="mandelbrotParams.activateZebra"
      :activateSmoothness="mandelbrotParams.activateSmoothness"
    />

    <!-- Panel Settings -->
    <div
      v-if="showSettings"
      style="position: absolute; top: 0; left: 0; z-index: 10; pointer-events: auto; height: 100vh;"
    >
      <Settings v-model="mandelbrotParams" :engine="mandelbrotEngine" :suspend-shortcuts="val => { shortcutsSuspended.value = val }" />
    </div>

    <!-- Raccourcis clavier (masqué sur mobile) -->
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

    <!-- Footer avec liens -->
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
          <svg class="github-logo" height="20" viewBox="0 0 16 16" width="20" fill="currentColor" style="vertical-align:middle; margin-right:4px;">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          GitHub
        </a>
      </small>
    </div>
  </div>
</template>

<style scoped>
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
</style>

