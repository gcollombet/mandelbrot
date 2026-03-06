<script setup lang="ts">
import {computed, onMounted, onUnmounted, reactive, ref, toRaw, watch} from 'vue';
import MandelbrotController from './MandelbrotController.vue';
import Settings from './Settings.vue';
import RenderStats from './RenderStats.vue';
import type {MandelbrotParams} from "../Mandelbrot.ts";
import {savePresetEntry} from '../presetStore';
import type {ComplexCoordStr, IterationData} from '../CursorCoordinate';
import {computePalettePhase, truncateCoord} from '../CursorCoordinate';
import {Palette} from '../Palette';

import type {MandelbrotExposed} from '../types/MandelbrotExposed';

const mandelbrotCtrlRef = ref<MandelbrotExposed | null>(null);
const mandelbrotEngine = computed(() => mandelbrotCtrlRef.value?.getEngine() ?? null);
const renderStatsRef = ref<InstanceType<typeof RenderStats> | null>(null);
const settingsRefs = ref<Record<string, InstanceType<typeof Settings> | null>>({});

// Multi-window support: set of open tabs, each with its own popup position
const openTabs = reactive(new Set<string>());
const shortcutsSuspended = ref(false);

// Per-tab popup positions and refs
const popupPositions = reactive<Record<string, { x: number; y: number }>>({});
const popupRefs = ref<Record<string, HTMLElement | null>>({});

const showUI = ref(true);

// --- Mode pipette palette ---
const pickerMode = ref(false);

function togglePickerMode() {
  pickerMode.value = !pickerMode.value;
}

/** Gère le clic en mode pipette : calcule la phase et ajoute directement le curseur. */
function onPalettePick(data: IterationData, _clientX: number, _clientY: number) {
  const p = mandelbrotParams.value;
  // Always use smooth=true for picking — per-stop smoothness is baked in the texture
  const result = computePalettePhase(
    data, p.mu, p.palettePeriod, p.paletteOffset, true,
  );
  if (result.isInSet) return; // pas de curseur pour les points dans l'ensemble
  const stops = p.colorStops;
  if (stops.length >= 200) return; // max 200 stops
  // Obtenir la couleur de la palette à cette phase
  const palette = new Palette(p.colorStops, p.interpolationMode);
  const colorHex = palette.getColorAt(result.phase);
  stops.push({ color: colorHex, position: result.phase });
}

// --- Cursor tooltip ---
const cursorTooltip = reactive({
  visible: false,
  cx: '',
  cy: '',
  clientX: 0,
  clientY: 0,
});

function onCursorCoord(coord: ComplexCoordStr | null, clientX: number, clientY: number) {
  if (!coord) {
    cursorTooltip.visible = false;
    return;
  }
  cursorTooltip.cx = truncateCoord(coord.re);
  cursorTooltip.cy = truncateCoord(coord.im);
  cursorTooltip.clientX = clientX;
  cursorTooltip.clientY = clientY;
  cursorTooltip.visible = true;
}

// --- HUD hide during navigation ---
const isNavigating = ref(false);
let navigationTimeout: number | null = null;

function onNavigationStart() {
  isNavigating.value = true;
  if (navigationTimeout !== null) clearTimeout(navigationTimeout);
}

function onNavigationEnd() {
  if (navigationTimeout !== null) clearTimeout(navigationTimeout);
  navigationTimeout = window.setTimeout(() => {
    isNavigating.value = false;
  }, 300);
}

// --- Auto-hide bottom bar (shortcuts + made with) after 10s ---
const bottomBarVisible = ref(true);
let bottomHideTimer: number | null = null;

function startBottomHideTimer() {
  if (bottomHideTimer !== null) clearTimeout(bottomHideTimer);
  bottomHideTimer = window.setTimeout(() => {
    bottomBarVisible.value = false;
  }, 10000);
}

function showBottomBar() {
  bottomBarVisible.value = true;
  startBottomHideTimer();
}

function handleMouseMove(e: MouseEvent) {
  // Show bottom bar when mouse is in the bottom 100px of the screen
  if (e.clientY >= window.innerHeight - 100) {
    if (!bottomBarVisible.value) {
      showBottomBar();
    }
  }
}

// Navigation events from keyboard/mouse/touch
function handleNavKeydown(e: KeyboardEvent) {
  const navKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF'];
  if (navKeys.includes(e.code)) {
    onNavigationStart();
  }
}

function handleNavKeyup(e: KeyboardEvent) {
  const navKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF'];
  if (navKeys.includes(e.code)) {
    onNavigationEnd();
  }
}

function handleNavMousedown(e: MouseEvent) {
  // Only treat canvas interactions as navigation (not menu clicks)
  const target = e.target as HTMLElement;
  if (target.tagName === 'CANVAS') {
    onNavigationStart();
  }
}

function handleNavMouseup() {
  onNavigationEnd();
}

function handleNavWheel() {
  onNavigationStart();
  onNavigationEnd();
}

function handleNavTouchstart() {
  onNavigationStart();
}

function handleNavTouchend() {
  onNavigationEnd();
}

// Mobile navigation expanded state (from MobileNavigationControls)
const mobileNavExpanded = ref(false);

// Paramètres Mandelbrot avec valeurs par défaut
const LOCAL_STORAGE_CURRENT_KEY = 'mandelbrot_last_settings';
const mandelbrotParams = ref<MandelbrotParams>({
  cx: '-1.9771995110313272619112808106831596467',
  cy: "0.0",
  mu: 4.0,
  scale: "2.5",
  angle: 0.0,
  palettePeriod: 7.37,
  paletteOffset: 0.0,
  shadingLevel: 0.3,
  lightAngle: 3.927,
  antialiasLevel: 1,
  maxIterations: 100,
  displacementAmount: 0.033,
  specularPower: 1,
  tessellationLevel: 1,
  epsilon: 0.00001,
  colorStops: [
    {
      "color": "#ffffff",
      "position": 0
    },
    {
      "color": "#ffffff",
      "position": 0.16
    },
    {
      "color": "#2cd2ff",
      "position": 0.26
    },
    {
      "color": "#000000",
      "position": 0.49242990654205604
    },
    {
      "color": "#ffffff",
      "position": 0.7016397849462366
    },
    {
      "color": "#ffaf27",
      "position": 0.8575
    },
    {
      "color": "#ffa03b",
      "position": 1
    }
  ],
  activateShading: true,
  activateTessellation: true,
  activateWebcam: false,
  activatePalette: true,
  activateSkybox: true,
  activateSmoothness: false,
  activateZebra: false,
  activateAnimate: false,
  dprMultiplier: 1.0,
  maxIterationMultiplier: 0.01,
  targetFps: 30,
  gpuLoadMultiplier: 1.0,
  interpolationMode: 'lab',
  animationSpeed: 1.0,
  textureName: 'Gold',
});

// Restore parametres a partir du localStorage puis surveille et persiste a chaque changement
onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('pointerdown', handleOutsidePointerDown);
  // Navigation detection listeners for HUD hide
  window.addEventListener('keydown', handleNavKeydown);
  window.addEventListener('keyup', handleNavKeyup);
  window.addEventListener('mousedown', handleNavMousedown);
  window.addEventListener('mouseup', handleNavMouseup);
  window.addEventListener('wheel', handleNavWheel, { passive: true });
  window.addEventListener('touchstart', handleNavTouchstart, { passive: true });
  window.addEventListener('touchend', handleNavTouchend, { passive: true });
  // Bottom bar auto-hide
  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  startBottomHideTimer();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CURRENT_KEY);
    if (raw) {
      Object.assign(mandelbrotParams.value, JSON.parse(raw));
    }
  } catch {}
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('pointerdown', handleOutsidePointerDown);
  window.removeEventListener('keydown', handleNavKeydown);
  window.removeEventListener('keyup', handleNavKeyup);
  window.removeEventListener('mousedown', handleNavMousedown);
  window.removeEventListener('mouseup', handleNavMouseup);
  window.removeEventListener('wheel', handleNavWheel);
  window.removeEventListener('touchstart', handleNavTouchstart);
  window.removeEventListener('touchend', handleNavTouchend);
  window.removeEventListener('mousemove', handleMouseMove);
  if (navigationTimeout !== null) clearTimeout(navigationTimeout);
  if (bottomHideTimer !== null) clearTimeout(bottomHideTimer);
});
watch(mandelbrotParams, (params) => {
  localStorage.setItem(LOCAL_STORAGE_CURRENT_KEY, JSON.stringify(params));
}, { deep: true });

// When mobile nav expands, close all settings popups
watch(mobileNavExpanded, (expanded) => {
  if (expanded) {
    closeAllSettings();
  }
});

// Tabs du menu — raccourcis adaptés au layout clavier
const settingsTabs = computed(() => [
  { key: 'navigation', label: 'Navigation', shortcut: keyboardLayout === 'azerty' ? 'w' : 'z' },
  { key: 'presets', label: 'Presets', shortcut: 'x' },
  { key: 'palettes', label: 'Palettes', shortcut: 'c' },
  { key: 'performance', label: 'Graphics', shortcut: 'v' },
]);

function toggleTab(tabKey: string) {
  if (openTabs.has(tabKey)) {
    openTabs.delete(tabKey);
    delete popupPositions[tabKey];
  } else {
    openTabs.add(tabKey);
    // Initialize centered position for new popup
    popupPositions[tabKey] = { x: -1, y: -1 };
  }
}

function closeTab(tabKey: string) {
  openTabs.delete(tabKey);
  delete popupPositions[tabKey];
}

function closeAllSettings() {
  openTabs.clear();
  for (const key of Object.keys(popupPositions)) {
    delete popupPositions[key];
  }
}

// Close popups when tapping outside on mobile
function handleOutsidePointerDown(e: PointerEvent) {
  if (openTabs.size === 0) return;
  // En mode pipette, ne pas fermer les Settings au clic sur le canvas
  if (pickerMode.value) return;
  const target = e.target as HTMLElement;
  // Check if click was inside any open popup or the top settings bar
  const insidePopup = Object.values(popupRefs.value).some(
    el => el && el.contains(target)
  );
  const insideBar = target.closest('.top-settings-bar');
  if (!insidePopup && !insideBar) {
    closeAllSettings();
  }
}

// Gestion clavier globale (W pour settings, Escape pour fermer)
function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    // Quitter le mode pipette en priorité
    if (pickerMode.value) {
      e.preventDefault();
      pickerMode.value = false;
      return;
    }
    if (openTabs.size > 0) {
      e.preventDefault();
      closeAllSettings();
      return;
    }
  }
  if (shortcutsSuspended.value) return;
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
  const key = e.key.toLowerCase();
  // Quick snapshot shortcut (P)
  if (key === 'p' && !e.repeat) {
    e.preventDefault();
    triggerQuickSnapshot();
    return;
  }
  const tab = settingsTabs.value.find(t => t.shortcut === key);
  if (tab && !e.repeat) {
    e.preventDefault();
    toggleTab(tab.key);
  }
}

/** Trigger a quick snapshot — saves current state to IndexedDB without a name. */
async function triggerQuickSnapshot() {
  let thumbnail = '';
  try {
    const engine = mandelbrotEngine.value;
    if (engine) {
      thumbnail = await engine.getSnapshotPng(256);
    }
  } catch { /* ignore */ }
  const savedValue = structuredClone(toRaw(mandelbrotParams.value));
  // Strip performance fields
  delete (savedValue as any).dprMultiplier;
  delete (savedValue as any).maxIterationMultiplier;
  delete (savedValue as any).antialiasLevel;
  delete (savedValue as any).targetFps;
  delete (savedValue as any).gpuLoadMultiplier;
  await savePresetEntry(savedValue, thumbnail);
  // Refresh any open Settings component's preset list
  for (const ref of Object.values(settingsRefs.value)) {
    if (ref?.refreshPresets) ref.refreshPresets();
  }
}

// Draggable popup — per-tab
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const draggingTab = ref<string | null>(null);
// Z-index tracking: bring focused popup to front
const tabZOrder = reactive<Record<string, number>>({});
let nextZ = 51;

function bringToFront(tabKey: string) {
  tabZOrder[tabKey] = nextZ++;
}

function setPopupRef(tabKey: string, el: HTMLElement | null) {
  popupRefs.value[tabKey] = el;
}

function startDrag(tabKey: string, e: MouseEvent) {
  const el = popupRefs.value[tabKey];
  if (!el) return;
  isDragging.value = true;
  draggingTab.value = tabKey;
  const rect = el.getBoundingClientRect();
  dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  // If first drag, initialize from center
  if ((popupPositions[tabKey]?.x ?? -1) < 0) {
    popupPositions[tabKey] = { x: rect.left, y: rect.top };
  }
  bringToFront(tabKey);
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value || !draggingTab.value) return;
  popupPositions[draggingTab.value] = {
    x: e.clientX - dragOffset.value.x,
    y: e.clientY - dragOffset.value.y,
  };
}

function stopDrag() {
  isDragging.value = false;
  draggingTab.value = null;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

function popupStyle(tabKey: string) {
  const pos = popupPositions[tabKey] ?? { x: -1, y: -1 };
  const z = tabZOrder[tabKey] ?? 50;
  // Palette popup is wider; presets/navigation wider to fit dropdown lists
  const w = tabKey === 'palettes' ? '860px'
          : (tabKey === 'presets' || tabKey === 'navigation') ? '560px'
          : '460px';
  const mh = (tabKey === 'presets' || tabKey === 'navigation') ? '94vh' : '80vh';
  if (pos.x < 0) {
    // Stagger multiple popups so they don't overlap perfectly
    const tabKeys = Array.from(openTabs);
    const idx = tabKeys.indexOf(tabKey);
    const offsetPx = idx * 30;
    return {
      position: 'fixed' as const,
      top: `calc(50% + ${offsetPx}px)`,
      left: `calc(50% + ${offsetPx}px)`,
      transform: 'translate(-50%, -50%)',
      zIndex: z,
      width: w,
      maxHeight: mh,
    };
  }
  return {
    position: 'fixed' as const,
    top: `${pos.y}px`,
    left: `${pos.x}px`,
    transform: 'none',
    zIndex: z,
    width: w,
    maxHeight: mh,
  };
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
  <div style="position: relative; height: 100vh; width: 100vw;" :class="{ 'picker-cursor': pickerMode }">
    <!-- Barre de navigation en haut, centree, 4 boutons on/off -->
    <div
      class="top-settings-bar"
      :class="{ 'hud-hidden': isNavigating }"
      v-show="showUI"
    >
      <div class="top-settings-bar-inner">
        <button
          v-for="tab in settingsTabs"
          :key="tab.key"
          class="top-tab-btn"
          :class="{ 'is-active': openTabs.has(tab.key) }"
          @click="toggleTab(tab.key)"
        >
          {{ tab.label }} <span class="tab-shortcut-hint is-hidden-touch">({{ tab.shortcut.toUpperCase() }})</span>
        </button>
      </div>
    </div>

    <!-- Render status indicator (bottom-center) -->
    <div
      class="render-stats-wrapper"
      :class="{ 'hud-hidden': isNavigating && !renderStatsRef?.expanded }"
      v-show="showUI"
      @touchstart.stop
      @touchend.stop
    >
      <RenderStats ref="renderStatsRef" :engine="mandelbrotEngine" />
    </div>

    <!-- Composant MandelbrotController avec tous les parametres -->
    <MandelbrotController
      ref="mandelbrotCtrlRef"
      style="width: 100%; height: 100%; display: block;"
      v-model:scale="mandelbrotParams.scale"
      v-model:angle="mandelbrotParams.angle"
      v-model:cx="mandelbrotParams.cx"
      v-model:cy="mandelbrotParams.cy"
      v-model:mobileNavExpanded="mobileNavExpanded"
      @cursor-coord="onCursorCoord"
      @palette-pick="onPalettePick"
      :pickerMode="pickerMode"
      :mu="mandelbrotParams.mu"
      :antialiasLevel="mandelbrotParams.antialiasLevel"
      :epsilon="mandelbrotParams.epsilon"
      :palettePeriod="mandelbrotParams.palettePeriod"
      :paletteOffset="mandelbrotParams.paletteOffset"
      :colorStops="mandelbrotParams.colorStops"
      :activateAnimate="mandelbrotParams.activateAnimate"
      :dprMultiplier="mandelbrotParams.dprMultiplier"
      :maxIterationMultiplier="mandelbrotParams.maxIterationMultiplier"
      :targetFps="mandelbrotParams.targetFps"
      :gpuLoadMultiplier="mandelbrotParams.gpuLoadMultiplier"
      :interpolationMode="mandelbrotParams.interpolationMode"
      :tessellationLevel="mandelbrotParams.tessellationLevel"
      :displacementAmount="mandelbrotParams.displacementAmount"
      :animationSpeed="mandelbrotParams.animationSpeed"
    />

    <!-- Popup Settings — one per open tab (multi-window) -->
    <template v-for="tab in settingsTabs" :key="'popup-' + tab.key">
      <div
        v-if="openTabs.has(tab.key)"
        :ref="(el: any) => setPopupRef(tab.key, el as HTMLElement)"
        class="settings-popup"
        :style="popupStyle(tab.key)"
        @mousedown="bringToFront(tab.key)"
      >
        <!-- Barre de titre draggable -->
        <div class="settings-popup-header" @mousedown.prevent="startDrag(tab.key, $event)">
          <span class="settings-popup-title">{{ tab.label }}</span>
          <button class="delete is-medium" aria-label="Fermer" @click="closeTab(tab.key)"></button>
        </div>
        <div class="settings-popup-body">
          <Settings
            :ref="(el: any) => { settingsRefs[tab.key] = el }"
            v-model="mandelbrotParams"
            :engine="mandelbrotEngine"
            :suspend-shortcuts="(val: boolean) => { shortcutsSuspended = val }"
            :active-tab="tab.key"
            :pickerMode="pickerMode"
            @toggle-picker="togglePickerMode"
          />
        </div>
      </div>
    </template>

    <!-- Cursor coordinate tooltip (masqué sur mobile) -->
    <div
      v-if="cursorTooltip.visible"
      class="cursor-tooltip is-hidden-touch"
      :style="{
        left: cursorTooltip.clientX + 16 + 'px',
        top: cursorTooltip.clientY - 8 + 'px',
      }"
    >
      <span class="cursor-tooltip-label">cx</span> {{ cursorTooltip.cx }}<br/>
      <span class="cursor-tooltip-label">cy</span> {{ cursorTooltip.cy }}
    </div>

    <!-- Raccourcis clavier (masque sur mobile) — vertical stacked layout, left side -->
    <div
      class="shortcut-hint is-hidden-touch"
      :class="{ 'hud-hidden': isNavigating, 'bottom-bar-hidden': !bottomBarVisible }"
      v-show="showUI"
    >
      <div class="shortcut-group">
        <span class="shortcut-label">Move</span>
        <div class="shortcut-keys">
          <span class="tag is-black is-rounded">Left clic</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.up }}</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.left }}</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.down }}</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.right }}</span>
        </div>
      </div>
      <div class="shortcut-group">
        <span class="shortcut-label">Rotate</span>
        <div class="shortcut-keys">
          <span class="tag is-black is-rounded">Right clic</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.rotateLeft }}</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.rotateRight }}</span>
        </div>
      </div>
      <div class="shortcut-group">
        <span class="shortcut-label">Zoom</span>
        <div class="shortcut-keys">
          <span class="tag is-black is-rounded">Wheel</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.zoomIn }}</span>
          <span class="tag is-black is-rounded">{{ shortcutLabels.zoomOut }}</span>
        </div>
      </div>
      <div class="shortcut-group">
        <span class="shortcut-label">Settings</span>
        <div class="shortcut-keys">
          <span v-for="tab in settingsTabs" :key="tab.key" class="tag is-black is-rounded">{{ tab.shortcut.toUpperCase() }}</span>
        </div>
      </div>
      <div class="shortcut-group">
        <span class="shortcut-label">Snapshot</span>
        <div class="shortcut-keys">
          <span class="tag is-black is-rounded">P</span>
        </div>
      </div>
    </div>

    <!-- Footer avec liens -->
    <div
      class="footer-love is-hidden-touch"
      :class="{ 'hud-hidden': isNavigating, 'bottom-bar-hidden': !bottomBarVisible }"
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
      <span class="footer-separator">|</span>
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
      <span class="footer-separator">|</span>
      <a href="./presentation/"
         class="footer-presentation"
         aria-label="Présentation">
        <svg height="16" width="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        Présentation
      </a>
    </div>
  </div>
</template>

<style scoped>
/* === HUD animation: fade out during navigation === */
.top-settings-bar,
.render-stats-wrapper,
.shortcut-hint,
.footer-love {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.top-settings-bar.hud-hidden {
  opacity: 0;
  transform: translateY(-20px);
  pointer-events: none;
}

.render-stats-wrapper.hud-hidden {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
  pointer-events: none;
}

.shortcut-hint.hud-hidden,
.footer-love.hud-hidden {
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
}

/* === Bottom bar auto-hide === */
.shortcut-hint.bottom-bar-hidden,
.footer-love.bottom-bar-hidden {
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
}

/* Barre de boutons centree sur l'ecran */
.top-settings-bar {
  position: fixed;
  top: 16px;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  pointer-events: none;
  user-select: none;
}

.top-settings-bar-inner {
  display: flex;
  gap: 0;
  background: rgba(255,255,255,0.65);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
  overflow: hidden;
  pointer-events: auto;
}

.top-tab-btn {
  background: transparent;
  border: none;
  padding: 8px 18px;
  font-size: 0.92rem;
  font-weight: 500;
  color: #222;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.top-tab-btn:hover {
  background: rgba(255,255,255,0.45);
}

.top-tab-btn.is-active {
  background: rgba(50, 115, 220, 0.85);
  color: #fff;
}

.tab-shortcut-hint {
  opacity: 0.5;
  font-size: 0.82em;
  font-weight: 400;
}

/* Popup Settings */
.settings-popup {
  max-width: 96vw;
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(12px) contrast(110%);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

.settings-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255,255,255,0.5);
  cursor: move;
  user-select: none;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.settings-popup-title {
  font-weight: 600;
  font-size: 1rem;
  color: #222;
}

.settings-popup-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

/* === Shortcut hint bar — vertical stacked, left side === */
.shortcut-hint {
  position: absolute;
  left: 24px;
  bottom: 16px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(8px);
  color: #111;
  font-size: 0.85rem;
  font-family: inherit;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
  pointer-events: none;
  user-select: none;
  opacity: 0.85;
  letter-spacing: 0.01em;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 260px;
}

.shortcut-group {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.shortcut-label {
  font-weight: 600;
  min-width: 4.5em;
  font-size: 0.82rem;
  color: #333;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}

.shortcut-hint .tag.is-rounded {
  font-size: 0.72rem;
  padding: 2px 8px;
  height: auto;
  line-height: 1.5;
}

.shortcut-separator {
  display: none;
}

.footer-love {
  position: absolute;
  right: 24px;
  bottom: 16px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(8px);
  color: #111;
  font-size: 0.85rem;
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

.footer-separator {
  margin: 0 4px;
  opacity: 0.5;
}

.footer-link {
  color: #111;
  text-decoration: underline;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #e25555;
}

.footer-presentation {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(226, 85, 85, 0.85);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: background 0.2s, transform 0.15s;
}

.footer-presentation:hover {
  background: rgba(226, 85, 85, 1);
  transform: scale(1.05);
}

.github-logo {
  display: inline-block;
  vertical-align: middle;
  margin-bottom: 2px;
}

.render-stats-wrapper {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: auto;
}

@media (max-width: 1023px) {
  .render-stats-wrapper {
    bottom: 100px;
  }
}

/* === Cursor coordinate tooltip === */
.cursor-tooltip {
  position: fixed;
  z-index: 100;
  pointer-events: none;
  user-select: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.70);
  backdrop-filter: blur(6px);
  color: #eee;
  font-size: 0.78rem;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  line-height: 1.45;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.cursor-tooltip-label {
  color: rgba(255, 255, 255, 0.5);
  margin-right: 4px;
  font-weight: 500;
}

/* === Mode pipette : curseur crosshair === */
.picker-cursor,
.picker-cursor * {
  cursor: crosshair !important;
}

</style>
