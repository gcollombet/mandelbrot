<script setup lang="ts">
import {computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch} from 'vue';
import MandelbrotController from './MandelbrotController.vue';
import Settings from './Settings.vue';
import RenderStats from './RenderStats.vue';
import PerformancePanel from './PerformancePanel.vue';
import { DenseTopbar, DenseTip, useDenseView, denseAttrs } from './dense';
import type {ApproximationMode, MandelbrotParams} from "../Mandelbrot.ts";
import {
  normalizePowerOfTwoStep,
  preserveSessionPerformanceFields,
  stripExplorationStateFields,
  stripSessionPerformanceFields,
} from "../Mandelbrot.ts";
import {savePresetEntry, getAllPresetEntries, getPresetById, saveRemotePresetEntry, getAllPresetRecords} from '../presetStore';
import type {PresetRecord} from '../presetStore';
import {syncRemoteCatalog} from '../remoteCatalogSync';
import {log10FromDecimalString} from '../floatexp';
import {normalizeTextureMappingFromLegacy} from '../TextureMapping';
import {getLatestRemotePreset} from '../remoteCatalog';
import type {IterationData} from '../CursorCoordinate';
import {computePalettePhase} from '../CursorCoordinate';
import {Palette} from '../Palette';
import {normalizeAnimationConfig} from '../AnimationConfig';
import {createInterpolatedColorStop, getEffectValue, type ColorStop} from '../ColorStop';
import {EFFECT_FIELD_NAMES} from '../effectFieldConfig';
import {interpolateRgb} from 'd3-interpolate';
import {nameForCatalogReference} from '../catalogIdentity';
import type {Engine} from '../Engine';
import {
  chevronCountForZoomDelta,
  edgeDistanceInScreens,
  perceptualPresetDistance,
  projectToSafeFrameEdge,
  spatialDistanceInScreens,
  type SafeFrame,
  zoomDepthDeltaSteps,
} from '../presetDiscovery';
import type {TextureMetadata} from '../textureStore';
import {
  ensureTextureLibrary,
  SKYBOX_SELECTED_KEY,
  storedTextureObjectUrl,
  TEXTURE_SELECTED_KEY,
  textureSourceKey,
} from '../textureLibrary';
import {isAuthConfigured, libraryScopeForUser, observeAuthState, signInWithGoogle, signOutCurrentUser, type AuthState, type UserRole} from '../authService';
import {setActiveLibraryScope} from '../scopedCache';
import {observePersonalSyncStatus, startPersonalPresetSync, stopPersonalPresetSync, type PersonalSyncStatus} from '../personalPresetSync';
import {startPersonalTextureSync, stopPersonalTextureSync} from '../personalTextureSync';
import {guestPresetCounts, importGuestLibrary, prepareGuestImport, snapshotGuestLibrary, type GuestImportPlan} from '../guestLibraryImport';
import {personalLibraryFeatureFlags} from '../personalLibraryFeatureFlags';
import {getKeyboardLayout, getSettingsTabs} from '../keyboardShortcuts';
import AboutPanel from './AboutPanel.vue';

import type {MandelbrotExposed} from '../types/MandelbrotExposed';

const mandelbrotCtrlRef = ref<MandelbrotExposed | null>(null);
const mandelbrotEngine = shallowRef<Engine | null>(null);

// AA accumulation progress (polled from the engine for the on-screen indicator).
const aaProgress = ref<{ active: boolean; done: number; total: number }>({ active: false, done: 0, total: 1 });
let aaProgressTimer: ReturnType<typeof setInterval> | null = null;
const settingsRefs = ref<Record<string, InstanceType<typeof Settings> | null>>({});

// Multi-window support: set of open tabs, each with its own popup position
const openTabs = reactive(new Set<string>());
const shortcutsSuspended = ref(false);

// Per-tab popup positions and refs
const popupPositions = reactive<Record<string, { x: number; y: number }>>({});
const popupRefs = ref<Record<string, HTMLElement | null>>({});
const rootRef = ref<HTMLElement | null>(null);
const discoveryRadarActive = ref(false);
const radarPulseKey = ref(0);
const discoveryLayoutVersion = ref(0);
const activeDiscoveryClusterId = ref<string | null>(null);
const isPresetTraveling = ref(false);

const showUI = ref(true);

// Separate GPU performance panel (floating, dark, theme-independent). Opened via
// the `m` key, the `?perf=1` URL param, or a persisted localStorage flag.
const showPerfPanel = ref((() => {
  try {
    if (new URLSearchParams(window.location.search).get('perf') === '1') return true;
    return window.localStorage.getItem('perf') === '1';
  } catch { return false; }
})());
function togglePerfPanel() {
  showPerfPanel.value = !showPerfPanel.value;
  try { window.localStorage.setItem('perf', showPerfPanel.value ? '1' : '0'); } catch { /* ignore */ }
}
// Tactile = pas de survol + pointeur grossier → on guide vers le double-tap
// plutôt que la touche Échap (absente sur mobile).
const isTouchDevice = typeof window !== 'undefined'
  && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
const authConfigured = isAuthConfigured();
const authUserEmail = ref('');
const userRole = ref<UserRole>('guest');
const isAdmin = computed(() => userRole.value === 'admin');
let stopAuthObserver: (() => void) | null = null;
let stopSyncObserver: (() => void) | null = null;
const personalSyncStatus = ref<PersonalSyncStatus>({state: 'idle', pending: 0});
const guestImportPlan = ref<GuestImportPlan | null>(null);
const guestImportBusy = ref(false);
const guestImportError = ref('');
const guestImportCounts = computed(() => guestImportPlan.value ? guestPresetCounts({
  presets: guestImportPlan.value.missingPresets,
  textures: guestImportPlan.value.missingTextures,
}) : null);
let authStateGeneration = 0;

async function handleAuthState(state: AuthState): Promise<void> {
  const generation = ++authStateGeneration;
  stopPersonalPresetSync();
  stopPersonalTextureSync();
  guestImportPlan.value = null;
  guestImportError.value = '';

  const guestSnapshot = state.user && personalLibraryFeatureFlags.guestImport ? await snapshotGuestLibrary() : null;
  if (generation !== authStateGeneration) return;
  setActiveLibraryScope(personalLibraryFeatureFlags.scopedCache ? libraryScopeForUser(state.user) : {kind: 'guest'});
  authUserEmail.value = state.user?.email ?? '';
  userRole.value = state.role;
  if (state.user && personalLibraryFeatureFlags.scopedCache) {
    if (personalLibraryFeatureFlags.presetSync) startPersonalPresetSync(state.user.uid);
    if (personalLibraryFeatureFlags.textureSync) startPersonalTextureSync(state.user.uid);
    if (guestSnapshot && (guestSnapshot.presets.length || guestSnapshot.textures.length)) {
      try {
        const plan = await prepareGuestImport(state.user.uid, guestSnapshot);
        if (generation === authStateGeneration && (plan.missingPresets.length || plan.missingTextures.length)) {
          guestImportPlan.value = plan;
        }
      } catch (error) {
        console.warn('Failed to prepare guest-library import:', error);
      }
    }
  }
  for (const settings of Object.values(settingsRefs.value)) {
    void settings?.refreshPresets?.();
  }
}

function declineGuestImport(): void {
  guestImportPlan.value = null;
  guestImportError.value = '';
}

async function acceptGuestImport(): Promise<void> {
  const plan = guestImportPlan.value;
  if (!plan || !plan.canImport || guestImportBusy.value) return;
  guestImportBusy.value = true;
  guestImportError.value = '';
  try {
    await importGuestLibrary(plan);
    if (personalLibraryFeatureFlags.presetSync) startPersonalPresetSync(plan.uid);
    if (personalLibraryFeatureFlags.textureSync) startPersonalTextureSync(plan.uid);
    guestImportPlan.value = null;
    for (const settings of Object.values(settingsRefs.value)) await settings?.refreshPresets?.();
  } catch (error) {
    guestImportError.value = error instanceof Error ? error.message : String(error);
  } finally {
    guestImportBusy.value = false;
  }
}

async function loginWithGoogle() {
  await signInWithGoogle();
}

async function logoutUser() {
  await signOutCurrentUser();
}

// --- Mode pipette palette ---
const pickerMode = ref(false);

function togglePickerMode() {
  pickerMode.value = !pickerMode.value;
}

function finishPickerMode() {
  pickerMode.value = false;
}

/** Gère le clic en mode pipette : calcule la phase et ajoute directement le curseur. */
function onPalettePick(data: IterationData, _clientX: number, _clientY: number) {
  const p = mandelbrotParams.value;
  // Always use smooth=true for picking — per-stop smoothness is baked in the texture
  const result = computePalettePhase(
    data, p.mu, p.palettePeriod, p.paletteOffset, true,
    p.paletteMirror,
  );
  if (result.isInSet) return; // pas de curseur pour les points dans l'ensemble
  const stops = p.colorStops;
  if (stops.length >= 200) return; // max 200 stops
  // Obtenir la couleur de la palette à cette phase
  const palette = new Palette(p.colorStops, p.interpolationMode);
  const colorHex = palette.getColorAt(result.phase);
  const newStop = createInterpolatedColorStop(stops, result.phase, colorHex);
  stops.push(newStop);
}

// --- HUD hide during navigation ---
const isNavigating = ref(false);
let navigationTimeout: number | null = null;
let userHasNavigated = false;

function invalidateDiscoveryLayout() {
  discoveryLayoutVersion.value += 1;
}

function deactivateDiscoveryRadar() {
  discoveryRadarActive.value = false;
  activeDiscoveryClusterId.value = null;
  isPresetTraveling.value = false;
}

function onNavigationStart() {
  isNavigating.value = true;
  userHasNavigated = true;
  if (navigationTimeout !== null) clearTimeout(navigationTimeout);
}

function onNavigationEnd() {
  if (navigationTimeout !== null) clearTimeout(navigationTimeout);
  navigationTimeout = window.setTimeout(() => {
    isNavigating.value = false;
  }, 300);
}

// Navigation events from keyboard/mouse/touch
function handleNavKeydown(e: KeyboardEvent) {
  const navKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF'];
  if (navKeys.includes(e.code)) {
    if (discoveryRadarActive.value) {
      deactivateDiscoveryRadar();
    }
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
    if (discoveryRadarActive.value) {
      deactivateDiscoveryRadar();
    }
    onNavigationStart();
  }
}

function handleNavMouseup() {
  onNavigationEnd();
}

function handleNavWheel() {
  if (discoveryRadarActive.value) {
    deactivateDiscoveryRadar();
  }
  onNavigationStart();
  onNavigationEnd();
}

function handleNavTouchstart(e: TouchEvent) {
  // Only treat canvas touches as navigation (not HUD button taps). Without this
  // filter, tapping a HUD button would flip isNavigating → the button gets
  // `hud-hidden` (pointer-events: none) mid-tap and the tap is lost on mobile.
  const target = e.target as HTMLElement;
  if (target.tagName === 'CANVAS') {
    if (discoveryRadarActive.value) {
      deactivateDiscoveryRadar();
    }
    onNavigationStart();
  }
}

function handleNavTouchend() {
  onNavigationEnd();
}

// Mobile navigation expanded state (from MobileNavigationControls)
const mobileNavExpanded = ref(false);

// Paramètres Mandelbrot avec valeurs par défaut
const LOCAL_STORAGE_CURRENT_KEY = 'mandelbrot_last_settings';
const isFirstLoad = !localStorage.getItem(LOCAL_STORAGE_CURRENT_KEY);
const DEFAULT_MANDELBROT_PARAMS: MandelbrotParams = {
  cx: '-0.7',
  cy: "0.0",
  mu: 4.0,
  scale: "1.2",
  angle: 0.0,
  palettePeriod: 1886.72,
  paletteOffset: 0.0,
  heightPaletteShift: 0,
  paletteMirror: false,
  lightAngle: 0,
  antialiasLevel: 1,
  aaAuto: false,
  aaAdaptive: true,
  maxIterations: 100,
  displacementAmount: 0,
  tessellationLevel: 0,
  epsilon: 1e-9,
  colorStops: [
    {
      "color": "#ffffff",
      "position": 0,
      "zebra": 1.0
    },
    {
      "color": "#ffffff",
      "position": 1,
      "zebra": 1.0
    }
  ],
  activateAnimate: false,
  debugShading: false,
  debugView: 0,
  approximationMode: 'auto',
  blaEpsilon: 1e-3,
  maxBlaSkip: 65536,
  precisionBudget: '1e-30',
  dprMultiplier: 1.0,
  maxIterationMultiplier: 0.1,
  targetFps: 30,
  gpuLoadMultiplier: 1.0,
  zoomMinBrushStep: 1,
  sentinelSeedStep: 64,
  interpolationMode: 'lab',
  animation: normalizeAnimationConfig(null, 1.0),
  animationSpeed: 1.0,
  ambientOcclusionStrength: 0,
  microBumpStrength: 0,
  reliefDepth: 1,
  localShadowStrength: 0,
  varnishStrength: 0,
  gradeContrast: 1.18,
  gradeSaturation: 1.12,
  orbitTrapStrength: 0,
  phaseColoringStrength: 0,
  stripeFrequency: 8,
  textureName: 'Gold',
  skyboxName: 'Window',
  textureMapping: normalizeTextureMappingFromLegacy({ textureMappingMode: 0 }),
};

function loadInitialMandelbrotParams(): MandelbrotParams {
  const params = structuredClone(DEFAULT_MANDELBROT_PARAMS);
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CURRENT_KEY);
    if (raw) Object.assign(params, JSON.parse(raw));
  } catch {}
  params.textureName ??= localStorage.getItem(TEXTURE_SELECTED_KEY) ?? 'Gold';
  params.skyboxName ??= localStorage.getItem(SKYBOX_SELECTED_KEY) ?? 'Window';
  params.animation = normalizeAnimationConfig(params.animation, params.animationSpeed);
  params.textureMapping = normalizeTextureMappingFromLegacy(params);
  stripExplorationStateFields(params);
  params.zoomMinBrushStep = normalizePowerOfTwoStep(params.zoomMinBrushStep, 1, 1, 64);
  params.sentinelSeedStep = Math.max(
    normalizePowerOfTwoStep(params.sentinelSeedStep, 64, 1, 4096),
    params.zoomMinBrushStep,
  );
  return params;
}

const mandelbrotParams = ref<MandelbrotParams>(loadInitialMandelbrotParams());

let textureEntriesPromise: Promise<TextureMetadata[]> | null = null;
let activeTileTextureUrl: string | null = null;
let activeSkyboxTextureUrl: string | null = null;
let textureApplyGeneration = 0;

function revokeObjectUrl(url: string | null) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

function getTextureEntries(): Promise<TextureMetadata[]> {
  // Only coalesce concurrent reads. The personal texture sync can update
  // IndexedDB after the engine starts, so retaining the first resolved list
  // makes a preset's textures look missing until another UI path applies them.
  if (!textureEntriesPromise) {
    textureEntriesPromise = ensureTextureLibrary().finally(() => {
      textureEntriesPromise = null;
    });
  }
  return textureEntriesPromise;
}

async function applyTexture(
  engine: Engine,
  kind: 'tile' | 'skybox',
  name: string,
  textures: TextureMetadata[],
  generation: number,
) {
  const sourceKey = textureSourceKey(name, textures);
  const isCurrent = kind === 'tile'
    ? engine.isTileTextureSourceCurrent(sourceKey)
    : engine.isSkyboxTextureSourceCurrent(sourceKey);
  if (isCurrent) return;

  const objectUrl = await storedTextureObjectUrl(name);
  if (!objectUrl) return;
  if (generation !== textureApplyGeneration) {
    revokeObjectUrl(objectUrl);
    return;
  }

  if (kind === 'tile') {
    revokeObjectUrl(activeTileTextureUrl);
    activeTileTextureUrl = objectUrl;
    await engine.updateTileTexture(objectUrl, sourceKey);
  } else {
    revokeObjectUrl(activeSkyboxTextureUrl);
    activeSkyboxTextureUrl = objectUrl;
    await engine.updateSkyboxTexture(objectUrl, sourceKey);
  }
}

async function applySelectedTexturesToEngine() {
  const engine = mandelbrotEngine.value;
  if (!engine) return;
  const generation = ++textureApplyGeneration;
  try {
    const textures = await getTextureEntries();
    if (generation !== textureApplyGeneration) return;
    const tileName = nameForCatalogReference(textures, mandelbrotParams.value.textureGuid, mandelbrotParams.value.textureName) ?? 'Gold';
    const skyboxName = nameForCatalogReference(textures, mandelbrotParams.value.skyboxGuid, mandelbrotParams.value.skyboxName) ?? 'Window';
    const effectiveTileName = textures.some(texture => texture.name === tileName) ? tileName : 'Gold';
    const effectiveSkyboxName = textures.some(texture => texture.name === skyboxName) ? skyboxName : 'Window';
    await applyTexture(engine, 'tile', effectiveTileName, textures, generation);
    await applyTexture(engine, 'skybox', effectiveSkyboxName, textures, generation);
  } catch (error) {
    console.warn('Failed to apply stored textures:', error);
  }
}

function onEngineReady(engine: Engine) {
  mandelbrotEngine.value = engine;
  applyApproximationToEngine();
  applyBlaTuningToEngine();
  applyPrecisionBudgetToEngine();
  void applySelectedTexturesToEngine();
}

function applyApproximationToEngine() {
  const engine = mandelbrotEngine.value;
  if (!engine) return;
  const raw = mandelbrotParams.value.approximationMode;
  const mode: ApproximationMode = raw === 'bla' || raw === 'pade' || raw === 'jet' || raw === 'mobius' || raw === 'auto' ? raw : 'perturbation';
  engine.setApproximationMode(mode);
}

// BLA/Padé tuning: ε sets the validity radius (ε·|A| affine, √ε·|A| Padé), maxBlaSkip
// caps the largest block jump. Both rebuild the table and re-render in a block mode.
function applyBlaTuningToEngine() {
  const engine = mandelbrotEngine.value;
  if (!engine) return;
  const eps = mandelbrotParams.value.blaEpsilon;
  if (typeof eps === 'number' && isFinite(eps) && eps > 0) engine.setBlaEpsilon(eps);
  const skip = mandelbrotParams.value.maxBlaSkip;
  if (typeof skip === 'number' && isFinite(skip) && skip >= 2) engine.setMaxBlaSkip(skip);
}

// Navigation precision budget: a target scale fixing how deep the reference stays precise.
// Changing it forces a full reference recompute (assumed degradation past the budget).
function applyPrecisionBudgetToEngine() {
  const engine = mandelbrotEngine.value;
  if (!engine) return;
  const budget = mandelbrotParams.value.precisionBudget;
  if (typeof budget === 'string' && budget.length > 0) engine.setPrecisionBudget(budget);
}

// Restore parametres a partir du localStorage puis surveille et persiste a chaque changement
onMounted(() => {
  // DEV: with the UI forced on but no WebGPU, open the Palettes panel so it is
  // visible for inspection (no canvas is rendered).
  if (forceUINoGpu) {
    openTabs.add('palettes');
    popupPositions['palettes'] = { x: -1, y: -1 };
  }
  stopSyncObserver = observePersonalSyncStatus(status => {
    personalSyncStatus.value = status;
  });
  stopAuthObserver = observeAuthState(state => void handleAuthState(state));
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
  // Poll AA accumulation progress for the on-screen indicator.
  aaProgressTimer = setInterval(() => {
    const p = mandelbrotEngine.value?.aaProgress;
    if (p) aaProgress.value = p;
  }, 120);
  window.addEventListener('resize', invalidateDiscoveryLayout, { passive: true });

  // If no navigation history is present (first-time visitor), sync remote catalog & load the first preset
  if (isFirstLoad) {
    void (async () => {
      try {
        let list = await getAllPresetEntries();
        if (list.length === 0) {
          const latest = await getLatestRemotePreset();
          if (latest) {
            const value = structuredClone(latest.value);
            stripSessionPerformanceFields(value);
            stripExplorationStateFields(value);
            await saveRemotePresetEntry({
              guid: latest.guid,
              name: latest.name,
              value,
              thumbnail: latest.thumbnail,
              date: latest.lastUpdated,
              lastUpdated: latest.lastUpdated,
              scaleExponent: latest.scaleExponent ?? 0,
              favorite: false,
              remote: {publishedName: latest.name, lastUpdated: latest.lastUpdated},
            });
            list = await getAllPresetEntries();
          }
          // Trigger full catalog sync in the background
          void syncRemoteCatalog().catch(error => {
            console.warn('Background remote catalog sync failed:', error);
          });
        }
        if (list.length > 0) {
          const record = await getPresetById(list[0].id);
          if (record && record.value) {
            // Apply only if the user hasn't started navigating away
            if (!userHasNavigated) {
              const saved = structuredClone(record.value);
              stripExplorationStateFields(saved);
              mandelbrotParams.value = preserveSessionPerformanceFields(saved, mandelbrotParams.value);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to asynchronously load initial preset:', e);
      }
    })();
  }
});
onUnmounted(() => {
  stopAuthObserver?.();
  stopSyncObserver?.();
  stopPersonalPresetSync();
  stopPersonalTextureSync();
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('pointerdown', handleOutsidePointerDown);
  window.removeEventListener('keydown', handleNavKeydown);
  window.removeEventListener('keyup', handleNavKeyup);
  window.removeEventListener('mousedown', handleNavMousedown);
  window.removeEventListener('mouseup', handleNavMouseup);
  window.removeEventListener('wheel', handleNavWheel);
  window.removeEventListener('touchstart', handleNavTouchstart);
  window.removeEventListener('touchend', handleNavTouchend);
  window.removeEventListener('resize', invalidateDiscoveryLayout);
  revokeObjectUrl(activeTileTextureUrl);
  revokeObjectUrl(activeSkyboxTextureUrl);
  if (navigationTimeout !== null) clearTimeout(navigationTimeout);
  if (aaProgressTimer !== null) clearInterval(aaProgressTimer);
});
// Deep-clone to a plain, mutable object. JSON round-trip (not structuredClone)
// because the params object can transiently carry nested Vue reactive Proxies —
// e.g. after a whole-object model replacement from Settings (`{...model.value}`),
// whose nested values stay proxies that `toRaw` does NOT unwrap (it only unwraps
// the top level). structuredClone throws DataCloneError on a Proxy; JSON.stringify
// reads straight through it. These snapshots are all JSON-serializable anyway.
function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

watch(mandelbrotParams, (params) => {
  const saved = clonePlain(params);
  stripExplorationStateFields(saved);
  localStorage.setItem(LOCAL_STORAGE_CURRENT_KEY, JSON.stringify(saved));
}, { deep: true });

watch(
  [
    () => mandelbrotParams.value.textureGuid,
    () => mandelbrotParams.value.textureName,
    () => mandelbrotParams.value.skyboxGuid,
    () => mandelbrotParams.value.skyboxName,
  ] as const,
  () => { void applySelectedTexturesToEngine(); },
);

watch(
  () => mandelbrotParams.value.approximationMode,
  () => { applyApproximationToEngine(); },
);

// Debug overlay: driven straight into the engine (deliberately OUTSIDE the
// renderOptions/persistence flow — the params normalizers rewrite the model
// and would re-trigger in a loop).
watch(
  () => mandelbrotParams.value.debugView,
  (v) => { mandelbrotEngine.value?.setDebugView(Number(v ?? 0)); },
);

watch(
  () => [mandelbrotParams.value.blaEpsilon, mandelbrotParams.value.maxBlaSkip],
  () => { applyBlaTuningToEngine(); },
);

watch(
  () => mandelbrotParams.value.precisionBudget,
  () => { applyPrecisionBudgetToEngine(); },
);

// When mobile nav expands, close all settings popups
watch(mobileNavExpanded, (expanded) => {
  if (expanded) {
    closeAllSettings();
  }
});

// Tabs du menu — raccourcis adaptés au layout clavier
const keyboardLayout = getKeyboardLayout();
const settingsTabs = computed(() => getSettingsTabs(keyboardLayout));

// Tabs whose panel has been ported to the dense shell. These render inside the
// `.dense` popup (DenseTopbar + dense body); others keep the legacy popup chrome.
// DEV: when WebGPU is unavailable but `?forceui` forced the UI on (see App.vue),
// skip the WebGPU canvas (MandelbrotController) and just show the panels.
const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
const forceUINoGpu = !hasWebGPU
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('forceui');

const densePortedTabs = new Set<string>(['animation', 'navigation', 'presets', 'performance', 'palettes', 'about']);
const denseView = useDenseView();
function isDenseTab(tabKey: string): boolean {
  return densePortedTabs.has(tabKey);
}

// Primary ptabs grouping (topbar "Paramètres" / "Presets" switch), per the mockup's
// data-primary/[data-group] mechanism (dense.css). Only the Palettes panel currently
// has sections tagged with data-group; other tabs simply render no ptabs.
const PTABS_BY_TAB: Record<string, { value: string; label: string }[]> = {
  palettes: [
    { value: 'params', label: 'Paramètres' },
    { value: 'library', label: 'Presets' },
  ],
};
const primaryByTab = reactive<Record<string, string>>({});
function primaryFor(tabKey: string): string {
  return primaryByTab[tabKey] ?? 'params';
}

function toggleTab(tabKey: string) {
  if (openTabs.has(tabKey)) {
    openTabs.delete(tabKey);
    delete popupPositions[tabKey];
  } else {
    // Close any other open settings window first so only one is open at a time
    closeAllSettings();
    openTabs.add(tabKey);
    // Initialize centered position for new popup
    popupPositions[tabKey] = { x: -1, y: -1 };
  }
  invalidateDiscoveryLayout();
}

function closeTab(tabKey: string) {
  openTabs.delete(tabKey);
  delete popupPositions[tabKey];
  invalidateDiscoveryLayout();
}

function closeAllSettings() {
  openTabs.clear();
  for (const key of Object.keys(popupPositions)) {
    delete popupPositions[key];
  }
  invalidateDiscoveryLayout();
}

// Close popups when tapping outside on mobile
function handleOutsidePointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement;
  if (activeDiscoveryClusterId.value && !target.closest('.discovery-cluster')) {
    activeDiscoveryClusterId.value = null;
  }
  if (openTabs.size === 0) return;
  // En mode pipette, ne pas fermer les Settings au clic sur le canvas
  if (pickerMode.value) return;
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
    // Restaurer l'UI masquée en priorité.
    if (!showUI.value) {
      e.preventDefault();
      showUI.value = true;
      return;
    }
    // Quitter le mode pipette en priorité
    if (pickerMode.value) {
      e.preventDefault();
      pickerMode.value = false;
      return;
    }
    if (activeDiscoveryClusterId.value) {
      e.preventDefault();
      activeDiscoveryClusterId.value = null;
      return;
    }
    if (openTabs.size > 0) {
      e.preventDefault();
      closeAllSettings();
      return;
    }
    // Rien d'autre à fermer → masquer l'UI (Escape devient un bascule).
    e.preventDefault();
    showUI.value = false;
    return;
  }
  if (shortcutsSuspended.value) return;
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
  const key = e.key.toLowerCase();
  // Download canvas screenshot (B)
  if (key === 'b' && !e.repeat) {
    e.preventDefault();
    void downloadCanvasSnapshot();
    return;
  }
  // Quick snapshot shortcut (P)
  if (key === 'p' && !e.repeat) {
    e.preventDefault();
    triggerQuickSnapshot();
    return;
  }
  // Toggle the GPU performance panel (M — Mesures).
  if (key === 'm' && !e.repeat) {
    e.preventDefault();
    togglePerfPanel();
    return;
  }
  // Trigger idle-time antialiasing accumulation (G — "A" is a pan key).
  if (key === 'g' && !e.repeat) {
    e.preventDefault();
    mandelbrotCtrlRef.value?.getEngine?.()?.triggerAaAccumulation();
    return;
  }
  // Toggle AA selective reseed (H): on = Stage B (boundary-only), off = full reconverge.
  if (key === 'h' && !e.repeat) {
    e.preventDefault();
    const eng = mandelbrotCtrlRef.value?.getEngine?.();
    if (eng) {
      eng.useAaSelectiveReseed = !eng.useAaSelectiveReseed;
      console.log('[AA] useAaSelectiveReseed =', eng.useAaSelectiveReseed);
    }
    return;
  }
  const tab = settingsTabs.value.find(t => t.shortcut === key);
  if (tab && !e.repeat) {
    e.preventDefault();
    toggleTab(tab.key);
  }
}

function timestampForFilename(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function downloadCanvasSnapshot() {
  const canvas = mandelbrotCtrlRef.value?.getCanvas?.() ?? null;
  if (!canvas) return;

  const triggerDownload = (url: string, ext: 'webp' | 'png') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `mandelbrot-${timestampForFilename()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  if (webpSupported) {
    await new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          triggerDownload(url, 'webp');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        resolve();
      }, 'image/webp', 0.95);
    });
    return;
  }

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        triggerDownload(url, 'png');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        triggerDownload(canvas.toDataURL('image/png'), 'png');
      }
      resolve();
    }, 'image/png');
  });
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
  const savedValue = clonePlain(mandelbrotParams.value);
  stripSessionPerformanceFields(savedValue);
  stripExplorationStateFields(savedValue);
  delete (savedValue as any).activateAnimate;
  delete (savedValue as any).debugShading;
  delete (savedValue as any).debugView;
  savedValue.animation = normalizeAnimationConfig(savedValue.animation, savedValue.animationSpeed);
  savedValue.animationSpeed = savedValue.animation.globalSpeed;
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
  if (popupRefs.value[tabKey] === el) return;
  popupRefs.value[tabKey] = el;
}

function startDrag(tabKey: string, e: MouseEvent | PointerEvent) {
  const el = popupRefs.value[tabKey];
  if (!el) return;
  e.preventDefault?.();
  isDragging.value = true;
  draggingTab.value = tabKey;
  const rect = el.getBoundingClientRect();
  dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  // If first drag, initialize from center
  if ((popupPositions[tabKey]?.x ?? -1) < 0) {
    popupPositions[tabKey] = { x: rect.left, y: rect.top };
  }
  bringToFront(tabKey);
  // Pointer events cover both mouse and touch input (incl. the legacy header's
  // mousedown-triggered drags, since real mouse movement also dispatches pointermove),
  // so dragging works on tablets/touchscreens too.
  window.addEventListener('pointermove', onDrag);
  window.addEventListener('pointerup', stopDrag);
}

function onDrag(e: MouseEvent | PointerEvent) {
  if (!isDragging.value || !draggingTab.value) return;
  popupPositions[draggingTab.value] = {
    x: e.clientX - dragOffset.value.x,
    y: e.clientY - dragOffset.value.y,
  };
  invalidateDiscoveryLayout();
}

function stopDrag() {
  isDragging.value = false;
  draggingTab.value = null;
  window.removeEventListener('pointermove', onDrag);
  window.removeEventListener('pointerup', stopDrag);
}

function popupStyle(tabKey: string) {
  const pos = popupPositions[tabKey] ?? { x: -1, y: -1 };
  const z = tabZOrder[tabKey] ?? 50;
  // Palette popup is wider; presets/navigation wider to fit dropdown lists.
  // Cap to the viewport so popups never overflow on small screens.
  const w = tabKey === 'palettes' ? 'min(1080px, 96vw)'
          : tabKey === 'animation' ? 'min(1080px, 96vw)'
          : (tabKey === 'presets' || tabKey === 'navigation') ? 'min(720px, 96vw)'
          : 'min(640px, 96vw)';
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

// --- Preset Pins Overlay & Transition Travel ---
const presetRecords = ref<PresetRecord[]>([]);
const CANVAS_PIN_MARGIN = 32;
const ONSCREEN_CLUSTER_CELL_SIZE = 46;
const OFFSCREEN_CLUSTER_CELL_SIZE = 88;
const OFFSCREEN_EDGE_CLUSTER_LIMIT = 10;
const EDGE_CLUSTER_PREVIEW_LIMIT = 5;
const DISCOVERY_RECOMPUTE_DELAY_MS = 260;
type DiscoveryPin = {
  preset: PresetRecord;
  x: number;
  y: number;
  edgeX: number;
  edgeY: number;
  onScreen: boolean;
  favorite: boolean;
  pinScale: number;
  validName: string | null;
  magnitude: number;
  altitudeDirection: number;
  chevronCount: number;
  pulseDuration: string;
  revealDelay: string;
  zoomDeltaSteps: number;
  perceptualDistance: number;
  popupPlacement: string;
};
type DiscoveryCluster = {
  id: string;
  x: number;
  y: number;
  representative: DiscoveryPin;
  totalCount: number;
  pins: DiscoveryPin[];
  hiddenCount: number;
  popupPlacement: string;
};
const visiblePins = ref<DiscoveryPin[]>([]);
let discoveryRecomputeTimer: number | null = null;

async function loadPresetRecords() {
  try {
    presetRecords.value = await getAllPresetRecords();
  } catch (e) {
    console.warn('Failed to load preset records:', e);
  }
}

watch(
  discoveryRadarActive,
  (active) => {
    if (active) {
      scheduleDiscoveryRecompute(0);
    } else {
      visiblePins.value = [];
      activeDiscoveryClusterId.value = null;
      if (discoveryRecomputeTimer !== null) {
        clearTimeout(discoveryRecomputeTimer);
        discoveryRecomputeTimer = null;
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (discoveryRecomputeTimer !== null) {
    clearTimeout(discoveryRecomputeTimer);
  }
});

function scheduleDiscoveryRecompute(delay = DISCOVERY_RECOMPUTE_DELAY_MS) {
  if (!discoveryRadarActive.value) return;
  if (isPresetTraveling.value) return;
  if (discoveryRecomputeTimer !== null) {
    clearTimeout(discoveryRecomputeTimer);
  }
  discoveryRecomputeTimer = window.setTimeout(() => {
    discoveryRecomputeTimer = null;
    visiblePins.value = buildDiscoveryPins();
  }, delay);
}

watch(
  [
    () => mandelbrotParams.value.cx,
    () => mandelbrotParams.value.cy,
    () => mandelbrotParams.value.scale,
    () => mandelbrotParams.value.angle,
    discoveryLayoutVersion,
    presetRecords,
  ],
  () => { scheduleDiscoveryRecompute(); },
  { deep: false },
);

function buildDiscoveryPins(): DiscoveryPin[] {
  if (!discoveryRadarActive.value) return [];
  const ctrl = mandelbrotCtrlRef.value;
  if (!ctrl) return [];
  const canvas = ctrl.getCanvas();
  const navigator = ctrl.getNavigator();
  if (!canvas || !navigator) return [];

  const width = canvas.width;
  const height = canvas.height;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const safeFrame = computeDiscoverySafeFrame(canvas);

  return presetRecords.value.map(preset => {
    const coords = navigator.coordinate_to_pixel(
      preset.value.cx,
      preset.value.cy,
      width,
      height
    );
    const x = coords[0] * (cssWidth / width);
    const y = coords[1] * (cssHeight / height);
    const point = {x, y};
    const onScreen = point.x >= -CANVAS_PIN_MARGIN
      && point.x <= cssWidth + CANVAS_PIN_MARGIN
      && point.y >= -CANVAS_PIN_MARGIN
      && point.y <= cssHeight + CANVAS_PIN_MARGIN;

    const targetLog = getApproximateLog10(preset.value.scale);
    const zoomDeltaSteps = zoomDepthDeltaSteps(mandelbrotParams.value.scale, preset.value.scale);
    const absZoomDeltaSteps = Math.abs(zoomDeltaSteps);
    const spatialDistance = onScreen
      ? spatialDistanceInScreens(point, {width: cssWidth, height: cssHeight})
      : edgeDistanceInScreens(point, safeFrame, {width: cssWidth, height: cssHeight});
    const perceptualDistance = perceptualPresetDistance(spatialDistance, zoomDeltaSteps);
    const pinScale = Math.max(0.42, Math.exp(-absZoomDeltaSteps * 0.035));

    let altitudeDirection = 0;
    if (zoomDeltaSteps > 0.75) altitudeDirection = -1;
    else if (zoomDeltaSteps < -0.75) altitudeDirection = 1;
    const chevronCount = chevronCountForZoomDelta(zoomDeltaSteps);
    const pulseDuration = `${Math.max(0.75, 2.1 - Math.min(absZoomDeltaSteps, 12) * 0.08).toFixed(2)}s`;
    const edgePoint = onScreen ? point : projectToSafeFrameEdge(point, safeFrame);
    const revealDelay = radarRevealDelayForPoint(edgePoint, {width: cssWidth, height: cssHeight});
    
    // Filter out ISO strings, "Unnamed Preset", or blanks
    const rawName = preset.name;
    const isISODate = rawName && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(rawName);
    const isInvalid = !rawName || rawName === 'Unnamed Preset' || rawName.trim() === '' || isISODate;
    const validName = isInvalid ? null : rawName;
    const popupPlacement = popupPlacementForPoint(point, {width: cssWidth, height: cssHeight});
    
    return {
      preset,
      x,
      y,
      edgeX: edgePoint.x,
      edgeY: edgePoint.y,
      onScreen,
      favorite: preset.favorite || false,
      pinScale,
      validName,
      magnitude: Math.round(Math.abs(targetLog)),
      altitudeDirection,
      chevronCount,
      pulseDuration,
      revealDelay,
      zoomDeltaSteps,
      perceptualDistance,
      popupPlacement,
    };
  });
}

function popupPlacementForPoint(point: {x: number; y: number}, size: {width: number; height: number}): string {
  const vertical = point.y < 150 ? 'below' : 'above';
  const horizontal = point.x < 150 ? 'align-left'
    : point.x > size.width - 150 ? 'align-right'
      : 'align-center';
  return `${vertical} ${horizontal}`;
}

function radarRevealDelayForPoint(point: {x: number; y: number}, size: {width: number; height: number}): string {
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const maxDistance = Math.hypot(centerX, centerY) || 1;
  const progress = Math.min(1, Math.hypot(dx, dy) / maxDistance);
  return `${Math.round(progress * 1120)}ms`;
}

function buildDiscoveryClusters(
  pins: DiscoveryPin[],
  idPrefix: string,
  cellSize: number,
  positionForPin: (pin: DiscoveryPin) => {x: number; y: number},
  limit?: number,
): DiscoveryCluster[] {
  const clusters = new Map<string, DiscoveryPin[]>();
  for (const pin of [...pins].sort((a, b) => a.perceptualDistance - b.perceptualDistance)) {
    const point = positionForPin(pin);
    const key = `${idPrefix}-${Math.round(point.x / cellSize)}:${Math.round(point.y / cellSize)}`;
    const group = clusters.get(key);
    if (group) group.push(pin);
    else clusters.set(key, [pin]);
  }

  const canvasSize = getCurrentCanvasSize();
  const result = Array.from(clusters.entries())
    .map(([id, pins]) => {
      const sortedPins = [...pins].sort((a, b) => a.perceptualDistance - b.perceptualDistance);
      const representative = sortedPins[0]!;
      const x = sortedPins.reduce((sum, pin) => sum + positionForPin(pin).x, 0) / sortedPins.length;
      const y = sortedPins.reduce((sum, pin) => sum + positionForPin(pin).y, 0) / sortedPins.length;
      return {
        id,
        x,
        y,
        representative,
        totalCount: sortedPins.length,
        pins: sortedPins.slice(0, EDGE_CLUSTER_PREVIEW_LIMIT),
        hiddenCount: Math.max(0, sortedPins.length - EDGE_CLUSTER_PREVIEW_LIMIT),
        popupPlacement: popupPlacementForPoint({x, y}, canvasSize),
      };
    })
    .sort((a, b) => a.representative.perceptualDistance - b.representative.perceptualDistance);

  return typeof limit === 'number' ? result.slice(0, limit) : result;
}

const onScreenDiscoveryClusters = computed<DiscoveryCluster[]>(() => buildDiscoveryClusters(
  visiblePins.value.filter(pin => pin.onScreen),
  'screen',
  ONSCREEN_CLUSTER_CELL_SIZE,
  pin => ({x: pin.x, y: pin.y}),
));
const singleOnScreenDiscoveryPins = computed(() => onScreenDiscoveryClusters.value
  .filter(cluster => cluster.totalCount === 1)
  .map(cluster => cluster.representative));
const groupedOnScreenDiscoveryClusters = computed(() => onScreenDiscoveryClusters.value
  .filter(cluster => cluster.totalCount > 1));
const edgeDiscoveryClusters = computed<DiscoveryCluster[]>(() => buildDiscoveryClusters(
  visiblePins.value.filter(pin => !pin.onScreen),
  'edge',
  OFFSCREEN_CLUSTER_CELL_SIZE,
  pin => ({x: pin.edgeX, y: pin.edgeY}),
  OFFSCREEN_EDGE_CLUSTER_LIMIT,
));
const presetPinsVisible = computed(() => discoveryRadarActive.value && !isPresetTraveling.value);

function toggleDiscoveryCluster(id: string) {
  activeDiscoveryClusterId.value = activeDiscoveryClusterId.value === id ? null : id;
}

function isDiscoveryClusterOpen(id: string) {
  return activeDiscoveryClusterId.value === id;
}

function computeDiscoverySafeFrame(canvas: HTMLCanvasElement): SafeFrame {
  if (discoveryRadarActive.value) {
    return {
      left: 24,
      top: 24,
      right: Math.max(24, canvas.clientWidth - 24),
      bottom: Math.max(24, canvas.clientHeight - 24),
    };
  }
  const canvasRect = canvas.getBoundingClientRect();
  const rootRect = rootRef.value?.getBoundingClientRect();
  const leftOffset = rootRect?.left ?? canvasRect.left;
  const topOffset = rootRect?.top ?? canvasRect.top;
  let frame: SafeFrame = {
    left: 48,
    top: 78,
    right: Math.max(48, canvas.clientWidth - 48),
    bottom: Math.max(78, canvas.clientHeight - (mobileNavExpanded.value ? 126 : 64)),
  };

  const exclusionRects = [
    document.querySelector('.top-settings-bar')?.getBoundingClientRect(),
    document.querySelector('.render-stats-wrapper')?.getBoundingClientRect(),
    ...Object.values(popupRefs.value).map(el => el?.getBoundingClientRect()),
  ].filter((rect): rect is DOMRect => !!rect);

  for (const rect of exclusionRects) {
    const local = {
      left: rect.left - leftOffset,
      top: rect.top - topOffset,
      right: rect.right - leftOffset,
      bottom: rect.bottom - topOffset,
    };
    const overlapsY = local.bottom > frame.top && local.top < frame.bottom;
    const overlapsX = local.right > frame.left && local.left < frame.right;
    if (!overlapsX || !overlapsY) continue;
    if (local.top <= frame.top && local.bottom < canvas.clientHeight * 0.45) {
      frame.top = Math.max(frame.top, local.bottom + 12);
    } else if (local.bottom >= frame.bottom && local.top > canvas.clientHeight * 0.55) {
      frame.bottom = Math.min(frame.bottom, local.top - 12);
    } else if (local.left <= frame.left && local.right < canvas.clientWidth * 0.45) {
      frame.left = Math.max(frame.left, local.right + 12);
    } else if (local.right >= frame.right && local.left > canvas.clientWidth * 0.55) {
      frame.right = Math.min(frame.right, local.left - 12);
    }
  }

  if (frame.right - frame.left < 160 || frame.bottom - frame.top < 140) {
    frame = {
      left: 48,
      top: 78,
      right: Math.max(48, canvas.clientWidth - 48),
      bottom: Math.max(78, canvas.clientHeight - 64),
    };
  }
  return frame;
}

function getCurrentCanvasSize(): {width: number; height: number} {
  const canvas = mandelbrotCtrlRef.value?.getCanvas();
  return {
    width: canvas?.clientWidth ?? window.innerWidth,
    height: canvas?.clientHeight ?? window.innerHeight,
  };
}

// Kick off idle-time antialiasing accumulation (same as the "G" shortcut).
function triggerRenderAa() {
  mandelbrotCtrlRef.value?.getEngine?.()?.triggerAaAccumulation();
}

async function toggleDiscoveryRadar() {
  if (discoveryRadarActive.value) {
    deactivateDiscoveryRadar();
    return;
  }
  closeAllSettings();
  radarPulseKey.value += 1;
  discoveryRadarActive.value = true;
  await loadPresetRecords();
  invalidateDiscoveryLayout();
}

// Travel animation loop state
let travelAnimationId: number | null = null;
let travelStartTime = 0;
let travelDuration = 2.5; // seconds

// Save start parameters for interpolation

let travelStartColorStops: ColorStop[] = [];

// Target parameters
let travelTargetPreset: PresetRecord | null = null;

function evaluatePaletteAt(stops: ColorStop[], position: number): { color: string; iridescenceColor?: string; effects: Record<string, number> } {
  const defaultRes = {
    color: '#000000',
    effects: {} as Record<string, number>
  };
  
  if (stops.length === 0) {
    for (const field of EFFECT_FIELD_NAMES) {
      defaultRes.effects[field] = 0;
    }
    return defaultRes;
  }
  
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  let left = sorted[0];
  let right = sorted[sorted.length - 1];
  
  const getEffects = (stop: ColorStop) => {
    const eff: Record<string, number> = {};
    for (const field of EFFECT_FIELD_NAMES) {
      eff[field] = getEffectValue(stop, field);
    }
    return eff;
  };
  
  if (position <= left.position) {
    return { color: left.color, iridescenceColor: left.iridescenceColor, effects: getEffects(left) };
  }
  if (position >= right.position) {
    return { color: right.color, iridescenceColor: right.iridescenceColor, effects: getEffects(right) };
  }
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (position >= sorted[i].position && position <= sorted[i+1].position) {
      left = sorted[i];
      right = sorted[i+1];
      break;
    }
  }
  
  const span = right.position - left.position;
  const t = span > 0 ? (position - left.position) / span : 0;
  
  const color = interpolateRgb(left.color, right.color)(t);
  const effects: Record<string, number> = {};
  for (const field of EFFECT_FIELD_NAMES) {
    const lv = getEffectValue(left, field);
    const rv = getEffectValue(right, field);
    effects[field] = lv + (rv - lv) * t;
  }
  
  let iridescenceColor: string | undefined = undefined;
  if (left.iridescenceColor || right.iridescenceColor) {
    iridescenceColor = interpolateRgb(left.iridescenceColor ?? left.color, right.iridescenceColor ?? right.color)(t);
  }
  
  return { color, iridescenceColor, effects };
}

function interpolateColorStops(
  stopsA: ColorStop[],
  stopsB: ColorStop[],
  t: number
): ColorStop[] {
  const N = 32;
  const res: ColorStop[] = [];
  
  for (let i = 0; i < N; i++) {
    const pos = i / (N - 1);
    const valA = evaluatePaletteAt(stopsA, pos);
    const valB = evaluatePaletteAt(stopsB, pos);
    
    const color = interpolateRgb(valA.color, valB.color)(t);
    const stop: ColorStop = {
      color,
      position: pos,
    };
    
    if (valA.iridescenceColor || valB.iridescenceColor) {
      stop.iridescenceColor = interpolateRgb(valA.iridescenceColor ?? valA.color, valB.iridescenceColor ?? valB.color)(t);
    }
    
    for (const field of EFFECT_FIELD_NAMES) {
      const vA = valA.effects[field] ?? 0;
      const vB = valB.effects[field] ?? 0;
      stop[field] = vA + (vB - vA) * t;
    }
    
    res.push(stop);
  }
  
  return res;
}

function tickTravelAnimation() {
  if (!travelTargetPreset) return;
  const elapsed = (Date.now() - travelStartTime) / 1000;
  let progress = Math.min(1.0, elapsed / travelDuration);
  
  const tEased = progress * progress * (3.0 - 2.0 * progress);
  

  
  mandelbrotParams.value.colorStops = interpolateColorStops(
    travelStartColorStops,
    travelTargetPreset.value.colorStops,
    tEased
  );
  
  if (progress >= 0.5) {
    if (travelTargetPreset.value.textureName) {
      mandelbrotParams.value.textureName = travelTargetPreset.value.textureName;
      mandelbrotParams.value.textureGuid = travelTargetPreset.value.textureGuid;
    }
    if (travelTargetPreset.value.skyboxName) {
      mandelbrotParams.value.skyboxName = travelTargetPreset.value.skyboxName;
      mandelbrotParams.value.skyboxGuid = travelTargetPreset.value.skyboxGuid;
    }
  }
  
  if (progress < 1.0) {
    travelAnimationId = requestAnimationFrame(tickTravelAnimation);
  } else {
    // Finaliser : s'assurer que tout est exactement aligné
    const target = travelTargetPreset.value;
    mandelbrotParams.value.mu = target.mu ?? 4.0;
    mandelbrotParams.value.stripeFrequency = target.stripeFrequency ?? 8;
    mandelbrotParams.value.colorStops = target.colorStops;
    mandelbrotParams.value.interpolationMode = target.interpolationMode;
    mandelbrotParams.value.approximationMode = target.approximationMode;
    mandelbrotParams.value.tessellationLevel = target.tessellationLevel ?? 0;
    mandelbrotParams.value.displacementAmount = target.displacementAmount ?? 0;
    mandelbrotParams.value.ambientOcclusionStrength = target.ambientOcclusionStrength ?? 0;
    mandelbrotParams.value.microBumpStrength = target.microBumpStrength ?? 0;
    mandelbrotParams.value.reliefDepth = target.reliefDepth ?? 1;
    mandelbrotParams.value.localShadowStrength = target.localShadowStrength ?? 0;
    mandelbrotParams.value.varnishStrength = target.varnishStrength ?? 0;
    mandelbrotParams.value.gradeContrast = target.gradeContrast ?? 1.18;
    mandelbrotParams.value.gradeSaturation = target.gradeSaturation ?? 1.12;
    mandelbrotParams.value.orbitTrapStrength = target.orbitTrapStrength ?? 0;
    mandelbrotParams.value.phaseColoringStrength = target.phaseColoringStrength ?? 0;
    mandelbrotParams.value.heightPaletteShift = target.heightPaletteShift ?? 0;
    mandelbrotParams.value.palettePeriod = target.palettePeriod ?? 256;
    mandelbrotParams.value.paletteOffset = target.paletteOffset ?? 0;
    mandelbrotParams.value.paletteMirror = target.paletteMirror ?? false;
    mandelbrotParams.value.textureMapping = target.textureMapping;

    // The travel finalises cx/cy/scale through the navigator's transition in the
    // draw loop (isUpdating), which the param watcher ignores — so the reference
    // is never hard-reset at the deep target and the GPU keeps a stale reference
    // (garbage until reload). Snap onto the exact target and force a fresh
    // reference, reproducing the cold-start (reload) state.
    mandelbrotCtrlRef.value?.resetReferenceTo(
      target.cx,
      target.cy,
      target.scale,
      target.angle ?? mandelbrotParams.value.angle,
    );

    travelTargetPreset = null;
    travelAnimationId = null;
    isPresetTraveling.value = false;
    radarPulseKey.value += 1;
    scheduleDiscoveryRecompute(0);
  }
}

// Deep-safe log10 of a scale string: the navigator emits PLAIN decimal strings,
// which parseFloat underflows to 0 below ~1e-308 (pin magnitudes and travel
// durations then read a zoom depth of 0 past that point).
function getApproximateLog10(scaleStr: string): number {
  const log = log10FromDecimalString(scaleStr ?? '');
  return Number.isFinite(log) ? log : 0;
}

function startTravelToPreset(preset: PresetRecord) {
  console.log('[REF] startTravelToPreset', String(preset.value.cx).slice(0, 14), 'scale', preset.value.scale);
  const ctrl = mandelbrotCtrlRef.value;
  if (!ctrl) return;
  const navigator = ctrl.getNavigator();
  if (!navigator) return;
  activeDiscoveryClusterId.value = null;
  isPresetTraveling.value = true;
  visiblePins.value = [];
  if (discoveryRecomputeTimer !== null) {
    clearTimeout(discoveryRecomputeTimer);
    discoveryRecomputeTimer = null;
  }
  
  if (travelAnimationId) {
    cancelAnimationFrame(travelAnimationId);
    navigator.cancel_transition();
  }
  
  const startLog = getApproximateLog10(mandelbrotParams.value.scale);
  const targetLog = getApproximateLog10(preset.value.scale);
  const zoomDiff = Math.abs(startLog - targetLog);
  
  // Base duration: 1.875s. Add 0.1875s per order of magnitude of zoom. Cap at 12.5 seconds.
  travelDuration = Math.max(1.875, Math.min(1.875 + zoomDiff * 0.1875, 12.5));

  navigator.start_transition(
    preset.value.cx,
    preset.value.cy,
    preset.value.scale,
    preset.value.angle ?? mandelbrotParams.value.angle,
    travelDuration
  );
  
  travelStartTime = Date.now();
  travelTargetPreset = preset;
  

  travelStartColorStops = clonePlain(mandelbrotParams.value.colorStops);
  
  travelAnimationId = requestAnimationFrame(tickTravelAnimation);
}
</script>

<template>
  <div ref="rootRef" style="position: relative; height: 100vh; width: 100vw;" :class="{ 'picker-cursor': pickerMode }">
    <!-- Indication affichée quand l'interface est masquée -->
    <div v-show="!showUI" class="ui-hidden-hint">
      <template v-if="isTouchDevice">Double-tapez pour afficher l'interface</template>
      <template v-else>Appuyez sur <kbd>Échap</kbd> pour afficher l'interface</template>
    </div>

    <!-- Barre de navigation en haut, centree, 4 boutons on/off -->
    <div
      class="top-settings-bar"
      :class="{ 'hud-hidden': isNavigating || mobileNavExpanded }"
      v-show="showUI && !discoveryRadarActive"
    >
      <div class="top-settings-bar-inner">
        <button
          v-for="tab in settingsTabs"
          :key="tab.key"
          class="top-tab-btn camera-btn"
          :class="{ 'is-active': openTabs.has(tab.key) }"
          @click="toggleTab(tab.key)"
          :title="tab.label"
        >
          <svg v-if="tab.key === 'navigation'" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>
          <svg v-else-if="tab.key === 'presets'" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>
          <svg v-else-if="tab.key === 'performance'" viewBox="0 0 24 24"><path d="M12 3a9 9 0 00-9 9c0 2.3.9 4.4 2.3 6l1.4-1.4A7 7 0 1118.3 16l1.4 1.4C21.1 16.4 22 14.3 22 12a9 9 0 00-9-9z"/><path d="M12 11h5v2h-5z" transform="rotate(-45 12 12)"/></svg>
          <svg v-else-if="tab.key === 'animation'" viewBox="0 0 24 24"><path d="M16 16v-3.5l4 3.5v-8l-4 3.5V8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2z"/></svg>
          <svg v-else-if="tab.key === 'palettes'" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-1.5 1.5-2 3-2a4 4 0 004-4c0-5-4-8-9-8z M6.3 11a1.2 1.2 0 102.4 0a1.2 1.2 0 10-2.4 0 M10.3 8a1.2 1.2 0 102.4 0a1.2 1.2 0 10-2.4 0 M14.3 10a1.2 1.2 0 102.4 0a1.2 1.2 0 10-2.4 0"/></svg>
          <i v-else :class="[tab.icon, 'fa-fw']" aria-hidden="true"></i>

          <span class="tab-label-text is-hidden-touch">{{ tab.label }}</span>
          <span class="tab-shortcut-hint is-hidden-touch">({{ tab.shortcut.toUpperCase() }})</span>
        </button>
      </div>
    </div>

    <!-- Render status indicator (bottom-center) -->
    <div
      class="render-stats-wrapper"
      v-show="showUI && !discoveryRadarActive"
      @touchstart.stop
      @touchend.stop
    >
      <RenderStats
        :engine="mandelbrotEngine"
        @open-perf-panel="togglePerfPanel"
      />
    </div>

    <!-- GPU performance panel (separate floating overlay, top-left) -->
    <div
      v-show="showPerfPanel"
      class="perf-panel-wrapper"
      @touchstart.stop
      @touchend.stop
      @pointerdown.stop
      @wheel.stop
    >
      <PerformancePanel
        :engine="mandelbrotEngine"
        :is-admin="isAdmin"
        v-model:debugShading="mandelbrotParams.debugShading"
        @close="togglePerfPanel"
      />
    </div>

    <!-- Antialiasing control / progress (bottom-center) -->
    <div
      v-show="showUI && !discoveryRadarActive && mandelbrotParams.antialiasLevel > 1"
      class="aa-control"
      @touchstart.stop
      @touchend.stop
    >
      <div v-if="aaProgress.active" class="aa-progress">
        <span class="aa-progress-label">AA {{ aaProgress.done }}/{{ aaProgress.total }}</span>
        <div class="aa-progress-track">
          <div
            class="aa-progress-fill"
            :style="{ width: (100 * aaProgress.done / Math.max(1, aaProgress.total)) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Composant MandelbrotController avec tous les parametres -->
    <MandelbrotController
      v-if="hasWebGPU"
      ref="mandelbrotCtrlRef"
      style="width: 100%; height: 100%; display: block;"
      v-model:scale="mandelbrotParams.scale"
      v-model:angle="mandelbrotParams.angle"
      v-model:cx="mandelbrotParams.cx"
      v-model:cy="mandelbrotParams.cy"
      v-model:mobileNavExpanded="mobileNavExpanded"
      @palette-pick="onPalettePick"
      @picker-done="finishPickerMode"
      @engine-ready="onEngineReady"
      @request-show-ui="showUI = true"
      :pickerMode="pickerMode"
      :uiHidden="!showUI"
      :mu="mandelbrotParams.mu"
      :antialiasLevel="mandelbrotParams.antialiasLevel"
      :aaAuto="mandelbrotParams.aaAuto"
      :aaAdaptive="mandelbrotParams.aaAdaptive ?? true"
      :epsilon="mandelbrotParams.epsilon"
      :palettePeriod="mandelbrotParams.palettePeriod"
      :paletteOffset="mandelbrotParams.paletteOffset"
      :heightPaletteShift="mandelbrotParams.heightPaletteShift"
      :paletteMirror="mandelbrotParams.paletteMirror"
      :colorStops="mandelbrotParams.colorStops"
      :activateAnimate="mandelbrotParams.activateAnimate"
      :debugShading="mandelbrotParams.debugShading"
      :debugView="mandelbrotParams.debugView ?? 0"
      :dprMultiplier="mandelbrotParams.dprMultiplier"
      :maxIterationMultiplier="mandelbrotParams.maxIterationMultiplier"
      :targetFps="mandelbrotParams.targetFps"
      :gpuLoadMultiplier="mandelbrotParams.gpuLoadMultiplier"
      :zoomMinBrushStep="mandelbrotParams.zoomMinBrushStep"
      :sentinelSeedStep="mandelbrotParams.sentinelSeedStep"
      :interpolationMode="mandelbrotParams.interpolationMode"
      :tessellationLevel="mandelbrotParams.tessellationLevel"
      :displacementAmount="mandelbrotParams.displacementAmount"
      :animation="mandelbrotParams.animation"
      :animationSpeed="mandelbrotParams.animationSpeed"
      :ambientOcclusionStrength="mandelbrotParams.ambientOcclusionStrength"
      :microBumpStrength="mandelbrotParams.microBumpStrength"
      :reliefDepth="mandelbrotParams.reliefDepth"
      :localShadowStrength="mandelbrotParams.localShadowStrength"
      :lightAngle="mandelbrotParams.lightAngle"
      :varnishStrength="mandelbrotParams.varnishStrength"
      :gradeContrast="mandelbrotParams.gradeContrast"
      :gradeSaturation="mandelbrotParams.gradeSaturation"
      :orbitTrapStrength="mandelbrotParams.orbitTrapStrength"
      :phaseColoringStrength="mandelbrotParams.phaseColoringStrength"
      :stripeFrequency="mandelbrotParams.stripeFrequency"
      :textureMapping="mandelbrotParams.textureMapping"
      :textureMappingMode="mandelbrotParams.textureMappingMode"
    />

    <!-- Cluster d'actions flottant (bas-droite) : masquage UI + Render AA + Discover.
         Boutons ronds par défaut ; s'étirent avec libellé au survol du cluster. -->
    <div
      class="hud-fab-cluster"
      :class="{ 'hud-hidden': isNavigating || mobileNavExpanded }"
      v-show="showUI"
    >
      <button
        v-show="!discoveryRadarActive"
        class="fab-btn ui-hide-toggle"
        title="Masquer l'interface (Échap pour réafficher)"
        @click="showUI = false"
        @touchstart.stop
        @touchend.stop
      >
        <span class="fab-ico"><i class="fa-solid fa-eye-slash"></i></span>
        <span class="fab-label">Masquer</span>
      </button>

      <button
        v-show="!discoveryRadarActive"
        class="fab-btn render-aa-button"
        type="button"
        title="Render AA — lisser le rendu (raccourci G)"
        @click="triggerRenderAa"
        @touchstart.stop
        @touchend.stop
      >
        <span class="fab-ico"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
        <span class="fab-label">Render AA</span>
      </button>

      <button
        class="fab-btn discovery-radar-button"
        :class="{ 'is-active': discoveryRadarActive }"
        type="button"
        :aria-pressed="discoveryRadarActive"
        title="Discover nearby presets"
        @click="toggleDiscoveryRadar"
        @touchstart.stop
        @touchend.stop
      >
        <span class="fab-ico radar-ico" aria-hidden="true">
          <span class="radar-button-ring"></span>
          <span class="radar-button-core"></span>
        </span>
        <span class="fab-label">{{ discoveryRadarActive ? 'Radar On' : 'Discover' }}</span>
      </button>

      <button
        v-show="!discoveryRadarActive"
        class="fab-btn screenshot-button"
        type="button"
        title="Screenshot — capturer le rendu (raccourci B)"
        @click="downloadCanvasSnapshot"
        @touchstart.stop
        @touchend.stop
      >
        <span class="fab-ico"><i class="fa-solid fa-camera"></i></span>
        <span class="fab-label">Screenshot</span>
      </button>
    </div>

    <div
      v-if="presetPinsVisible"
      :key="radarPulseKey"
      class="discovery-radar-pulse"
      :class="{ 'hud-hidden': isNavigating }"
      aria-hidden="true"
    ></div>

    <!-- Overlay des pins de presets -->
    <div
      v-if="presetPinsVisible"
      class="preset-pins-overlay"
    >
      <div
        v-for="pin in singleOnScreenDiscoveryPins"
        :key="pin.preset.id"
        class="preset-pin-container discovery-pin"
        :class="[{ 'is-favorite': pin.favorite, 'is-deeper': pin.altitudeDirection === -1, 'is-shallower': pin.altitudeDirection === 1 }, pin.popupPlacement]"
        :style="{ left: pin.x + 'px', top: pin.y + 'px', '--pin-scale': pin.pinScale, '--pin-pulse-duration': pin.pulseDuration, '--pin-reveal-delay': pin.revealDelay }"
      >
        <div v-if="pin.altitudeDirection === 1" class="pin-chevrons pin-chevrons-up" aria-hidden="true">
          <i v-for="n in pin.chevronCount" :key="'up-' + n" class="fa-solid fa-chevron-up"></i>
        </div>
        <button
          class="preset-pin-btn"
          @click="startTravelToPreset(pin.preset)"
          :aria-label="'Travel to ' + (pin.preset.name || 'preset')"
        >
          <span class="preset-pin-dot"></span>
          <span class="preset-pin-pulse"></span>
        </button>
        <div v-if="pin.altitudeDirection === -1" class="pin-chevrons pin-chevrons-down" aria-hidden="true">
          <i v-for="n in pin.chevronCount" :key="'down-' + n" class="fa-solid fa-chevron-down"></i>
        </div>
        <!-- Hover circular preview card -->
        <div class="preset-pin-card">
          <div class="preset-pin-circle-thumb">
            <img v-if="pin.preset.thumbnail" :src="pin.preset.thumbnail" alt="preset thumbnail" />
          </div>
          <span class="preset-pin-label">
            <template v-if="pin.validName">{{ pin.validName }}</template>
            <span class="preset-pin-mag" v-if="pin.magnitude > 0">
              <i class="fa-solid fa-arrow-up" v-if="pin.altitudeDirection === 1"></i>
              <i class="fa-solid fa-arrow-down" v-else-if="pin.altitudeDirection === -1"></i>
              <i class="fa-solid fa-minus" v-else></i>
              10<sup>-{{ pin.magnitude }}</sup>
            </span>
          </span>
        </div>
      </div>
      <div
        v-for="cluster in groupedOnScreenDiscoveryClusters"
        :key="'screen-cluster-' + cluster.id"
        class="discovery-edge-marker discovery-cluster discovery-screen-cluster"
        :class="[{ 'is-open': isDiscoveryClusterOpen(cluster.id), 'is-favorite': cluster.representative.favorite, 'is-deeper': cluster.representative.altitudeDirection === -1, 'is-shallower': cluster.representative.altitudeDirection === 1 }, cluster.popupPlacement]"
        :style="{ left: cluster.x + 'px', top: cluster.y + 'px', '--pin-pulse-duration': cluster.representative.pulseDuration, '--pin-reveal-delay': cluster.representative.revealDelay }"
        role="button"
        tabindex="0"
        :title="cluster.totalCount + ' presets nearby'"
        :aria-label="cluster.totalCount + ' visible presets nearby'"
        @click.stop="toggleDiscoveryCluster(cluster.id)"
        @keydown.enter.prevent="toggleDiscoveryCluster(cluster.id)"
        @keydown.space.prevent="toggleDiscoveryCluster(cluster.id)"
      >
        <span class="edge-marker-dot" aria-hidden="true"></span>
        <span class="edge-marker-count">{{ cluster.totalCount }}</span>
        <span class="edge-marker-direction" aria-hidden="true">
          <i class="fa-solid fa-arrow-up" v-if="cluster.representative.altitudeDirection === 1"></i>
          <i class="fa-solid fa-arrow-down" v-else-if="cluster.representative.altitudeDirection === -1"></i>
          <i class="fa-solid fa-minus" v-else></i>
        </span>
        <span class="edge-cluster-preview" @click.stop>
          <button
            v-for="pin in cluster.pins"
            :key="'screen-preview-' + pin.preset.id"
            class="edge-cluster-item"
            type="button"
            :title="'Travel to ' + (pin.preset.name || 'preset')"
            @click="startTravelToPreset(pin.preset)"
          >
            <span class="edge-cluster-thumb">
              <img v-if="pin.preset.thumbnail" :src="pin.preset.thumbnail" alt="" />
            </span>
            <span class="edge-cluster-meta">
              <span class="edge-cluster-name">{{ pin.validName || 'Preset' }}</span>
              <span class="edge-cluster-mag">
                <i class="fa-solid fa-arrow-up" v-if="pin.altitudeDirection === 1"></i>
                <i class="fa-solid fa-arrow-down" v-else-if="pin.altitudeDirection === -1"></i>
                <i class="fa-solid fa-minus" v-else></i>
                10<sup>-{{ pin.magnitude }}</sup>
              </span>
            </span>
          </button>
          <span v-if="cluster.hiddenCount > 0" class="edge-cluster-more">+{{ cluster.hiddenCount }} more</span>
        </span>
      </div>
      <div
        v-for="cluster in edgeDiscoveryClusters"
        :key="'edge-cluster-' + cluster.id"
        class="discovery-edge-marker discovery-cluster"
        :class="[{ 'is-open': isDiscoveryClusterOpen(cluster.id), 'is-deeper': cluster.representative.altitudeDirection === -1, 'is-shallower': cluster.representative.altitudeDirection === 1, 'is-favorite': cluster.representative.favorite }, cluster.popupPlacement]"
        :style="{ left: cluster.x + 'px', top: cluster.y + 'px', '--pin-pulse-duration': cluster.representative.pulseDuration, '--pin-reveal-delay': cluster.representative.revealDelay }"
        role="button"
        tabindex="0"
        :title="cluster.totalCount === 1 ? '1 preset off-screen' : cluster.totalCount + ' presets in this direction'"
        :aria-label="cluster.totalCount === 1 ? '1 off-screen preset' : cluster.totalCount + ' off-screen presets in this direction'"
        @click.stop="toggleDiscoveryCluster(cluster.id)"
        @keydown.enter.prevent="toggleDiscoveryCluster(cluster.id)"
        @keydown.space.prevent="toggleDiscoveryCluster(cluster.id)"
      >
        <span class="edge-marker-dot" aria-hidden="true"></span>
        <span v-if="cluster.totalCount > 1" class="edge-marker-count">{{ cluster.totalCount }}</span>
        <span class="edge-marker-direction" aria-hidden="true">
          <i class="fa-solid fa-arrow-up" v-if="cluster.representative.altitudeDirection === 1"></i>
          <i class="fa-solid fa-arrow-down" v-else-if="cluster.representative.altitudeDirection === -1"></i>
          <i class="fa-solid fa-minus" v-else></i>
        </span>
        <span class="edge-cluster-preview" @click.stop>
          <button
            v-for="pin in cluster.pins"
            :key="'edge-preview-' + pin.preset.id"
            class="edge-cluster-item"
            type="button"
            :title="'Travel to ' + (pin.preset.name || 'preset')"
            @click="startTravelToPreset(pin.preset)"
          >
            <span class="edge-cluster-thumb">
              <img v-if="pin.preset.thumbnail" :src="pin.preset.thumbnail" alt="" />
            </span>
            <span class="edge-cluster-meta">
              <span class="edge-cluster-name">{{ pin.validName || 'Preset' }}</span>
              <span class="edge-cluster-mag">
                <i class="fa-solid fa-arrow-up" v-if="pin.altitudeDirection === 1"></i>
                <i class="fa-solid fa-arrow-down" v-else-if="pin.altitudeDirection === -1"></i>
                <i class="fa-solid fa-minus" v-else></i>
                10<sup>-{{ pin.magnitude }}</sup>
              </span>
            </span>
          </button>
          <span v-if="cluster.hiddenCount > 0" class="edge-cluster-more">+{{ cluster.hiddenCount }} more</span>
        </span>
      </div>
    </div>

    <!-- Shared dense tooltip (teleported to body) -->
    <DenseTip />

    <!-- Popup Settings — one per open tab (multi-window) -->
    <template v-for="tab in settingsTabs" :key="'popup-' + tab.key">
      <!-- Dense shell popup (ported panels) -->
      <div
        v-if="openTabs.has(tab.key) && !discoveryRadarActive && isDenseTab(tab.key)"
        :ref="(el: any) => setPopupRef(tab.key, el as HTMLElement)"
        class="dense dense-popup"
        v-bind="denseAttrs(denseView)"
        :data-primary="primaryFor(tab.key)"
        :style="popupStyle(tab.key)"
        @mousedown="bringToFront(tab.key)"
      >
        <DenseTopbar
          :title="tab.label"
          :ptabs="PTABS_BY_TAB[tab.key]"
          :primary="primaryFor(tab.key)"
          :is-admin="isAdmin"
          :auth-configured="authConfigured"
          :auth-user-email="authUserEmail"
          :sync-state="personalSyncStatus.state"
          :sync-error="personalSyncStatus.lastError"
          @update:primary="(v: string) => primaryByTab[tab.key] = v"
          @close="closeTab(tab.key)"
          @drag-start="startDrag(tab.key, $event)"
          @login="loginWithGoogle"
          @logout="logoutUser"
        >
          <template v-if="tab.key === 'animation'" #lead>
            <button
              class="tb-play"
              :class="{ paused: !mandelbrotParams.activateAnimate }"
              type="button"
              :aria-pressed="mandelbrotParams.activateAnimate"
              title="Lecture / pause de l'animation"
              @click="mandelbrotParams.activateAnimate = !mandelbrotParams.activateAnimate"
            >
              <svg v-if="mandelbrotParams.activateAnimate" viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>
              <svg v-else viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span class="lbl">Animate</span>
            </button>
          </template>
        </DenseTopbar>
        <div class="body">
          <AboutPanel v-if="tab.key === 'about'" />
          <Settings
            v-else
            :ref="(el: any) => { settingsRefs[tab.key] = el }"
            v-model="mandelbrotParams"
            :engine="mandelbrotEngine"
            :suspend-shortcuts="(val: boolean) => { shortcutsSuspended = val }"
            :active-tab="tab.key"
            :pickerMode="pickerMode"
            :user-role="userRole"
            @toggle-picker="togglePickerMode"
          />
        </div>
      </div>

      <!-- Legacy popup chrome (not-yet-ported panels) -->
	      <div
	        v-else-if="openTabs.has(tab.key) && !discoveryRadarActive"
        :ref="(el: any) => setPopupRef(tab.key, el as HTMLElement)"
        class="settings-popup"
        :style="popupStyle(tab.key)"
        @mousedown="bringToFront(tab.key)"
      >
        <!-- Barre de titre draggable -->
        <div class="settings-popup-header" @mousedown.prevent="startDrag(tab.key, $event)">
          <div class="title-container">
            <span class="dot"></span>
            <span class="settings-popup-title">{{ tab.label }}</span>
          </div>
          <button class="close" aria-label="Fermer" style="z-index: 10; position: relative; pointer-events: auto;" @mousedown.stop @click="closeTab(tab.key)">✕</button>
        </div>
        <div class="settings-popup-body">
          <Settings
            :ref="(el: any) => { settingsRefs[tab.key] = el }"
            v-model="mandelbrotParams"
            :engine="mandelbrotEngine"
            :suspend-shortcuts="(val: boolean) => { shortcutsSuspended = val }"
            :active-tab="tab.key"
            :pickerMode="pickerMode"
            :user-role="userRole"
            @toggle-picker="togglePickerMode"
          />
        </div>
      </div>
    </template>

    <div v-if="guestImportPlan" class="guest-import-backdrop" role="presentation">
      <section class="guest-import-dialog" role="dialog" aria-modal="true" aria-labelledby="guest-import-title">
        <h2 id="guest-import-title">Import your guest library?</h2>
        <p>
          This device has {{ guestImportPlan.missingPresets.length }} preset{{ guestImportPlan.missingPresets.length === 1 ? '' : 's' }}
          and {{ guestImportPlan.missingTextures.length }} texture{{ guestImportPlan.missingTextures.length === 1 ? '' : 's' }} not yet in this account.
        </p>
        <p v-if="guestImportCounts" class="guest-import-breakdown">
          {{ guestImportCounts.completePreset }} complete · {{ guestImportCounts.palettePreset }} palette ·
          {{ guestImportCounts.stopPreset }} stop · {{ guestImportCounts.textureMappingPreset }} mapping ·
          {{ guestImportCounts.animationPreset }} animation
        </p>
        <p v-if="guestImportPlan.blockingReason" class="guest-import-error">
          Import all is unavailable: {{ guestImportPlan.blockingReason }}. Your guest library remains unchanged.
        </p>
        <p v-else>The import copies everything. The guest library stays on this device and will return unchanged when you sign out.</p>
        <p v-if="guestImportError" class="guest-import-error">{{ guestImportError }}</p>
        <div class="guest-import-actions">
          <button type="button" class="guest-import-primary" :disabled="!guestImportPlan.canImport || guestImportBusy" @click="acceptGuestImport">
            {{ guestImportBusy ? 'Importing…' : 'Import all' }}
          </button>
          <button type="button" :disabled="guestImportBusy" @click="declineGuestImport">Not now</button>
        </div>
      </section>
    </div>

  </div>
</template>

<style scoped>
.guest-import-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(8px);
}

.guest-import-dialog {
  width: min(460px, 100%);
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  color: #f8fafc;
  background: #111827;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
}

.guest-import-dialog h2 { margin: 0 0 12px; font-size: 20px; }
.guest-import-dialog p { color: #cbd5e1; line-height: 1.45; }
.guest-import-breakdown { font-size: 12px; }
.guest-import-error { color: #fca5a5 !important; }
.guest-import-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
.guest-import-actions button { padding: 9px 14px; border: 0; border-radius: 8px; cursor: pointer; }
.guest-import-actions button:disabled { cursor: not-allowed; opacity: 0.5; }
.guest-import-primary { color: #fff; background: #2563eb; }

/* === HUD animation: fade out during navigation === */
.top-settings-bar,
.render-stats-wrapper {
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

/* Barre de boutons centree sur l'ecran */
.top-settings-bar {
  position: fixed;
  top: 10px;
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
  gap: 2px;
  padding: 4px;
  background: rgba(16, 18, 24, 0.72);
  backdrop-filter: blur(18px);
  border: 1px solid var(--line);
  border-radius: 11px;
  overflow: hidden;
  pointer-events: auto;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.top-tab-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border-radius: 8px;
  color: var(--ink-2);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  white-space: nowrap;
  transition: .16s;
  font-family: var(--sans);
}

.top-tab-btn svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
}

.top-tab-btn:hover {
  color: var(--ink);
  background: var(--panel-2);
}

.top-tab-btn.is-active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 8px 24px -8px var(--accent);
}

.top-tab-btn.is-active .tab-shortcut-hint {
  color: rgba(255, 255, 255, 0.7);
}

.camera-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tab-shortcut-hint {
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 600;
}

/* Popup Settings */
/* Dense-shell popup: positioning only — visual chrome comes from `.dense`. */
.dense-popup {
  pointer-events: auto;
  max-width: 96vw;
}

.settings-popup {
  max-width: 96vw;
  background:
    radial-gradient(900px 520px at 88% -18%, oklch(0.62 0.16 250 / 0.34), transparent 62%),
    radial-gradient(760px 560px at 4% 118%, oklch(0.62 0.17 320 / 0.26), transparent 58%),
    linear-gradient(180deg, rgba(22,25,34,0.90), rgba(16,18,24,0.92));
  backdrop-filter: blur(26px) saturate(1.1);
  -webkit-backdrop-filter: blur(26px) saturate(1.1);
  border: 1px solid var(--line);
  border-radius: var(--radius); /* 18px */
  box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

.settings-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.18);
  cursor: move;
  user-select: none;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mauve-bright);
  box-shadow: 0 0 10px var(--mauve);
  display: inline-block;
}

.settings-popup-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink);
  font-family: var(--sans);
}

.close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--row);
  color: var(--ink-2);
  cursor: pointer;
  font-size: 14px;
  display: grid;
  place-items: center;
  transition: .16s;
  padding: 0;
}

.close:hover {
  color: var(--ink);
  background: var(--row-on);
  border-color: var(--ink-3);
}

.settings-popup-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--space-5) var(--space-5) calc(var(--space-5) + var(--space-2));
  min-height: 0;
}

.settings-popup-body::-webkit-scrollbar {
  width: 10px;
}
.settings-popup-body::-webkit-scrollbar-track {
  background: transparent;
}
.settings-popup-body::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 999px;
}

.render-stats-wrapper {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: auto;
}

.perf-panel-wrapper {
  position: fixed;
  top: 14px;
  left: 14px;
  width: min(340px, calc(100vw - 28px));
  max-height: calc(100vh - 28px);
  overflow-y: auto;
  z-index: 40;
  pointer-events: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 1023px) {
  .render-stats-wrapper {
    bottom: 100px;
  }
}

/* Hide-UI toggle (top-right) + "press Esc" hint when hidden. */
/* Floating HUD actions: round by default, expand into a labelled pill on cluster hover
   (matches the mobile round look until the pointer is over the cluster). */
.fab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  height: 42px;
  width: 42px;
  padding: 0;
  color: #fff;
  background: rgba(20, 20, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  transition: width 0.22s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.2s ease;
}
.fab-btn .fab-ico {
  flex: 0 0 auto;
  width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}
.fab-btn .fab-label {
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  transition: max-width 0.22s ease, opacity 0.18s ease, padding 0.22s ease;
}
.hud-fab-cluster:hover .fab-btn,
.fab-btn:focus-visible,
.discovery-radar-button.is-active {
  width: auto;
}
.hud-fab-cluster:hover .fab-label,
.fab-btn:focus-visible .fab-label,
.discovery-radar-button.is-active .fab-label {
  max-width: 140px;
  opacity: 1;
  padding-right: 15px;
}

.ui-hide-toggle:hover {
  background: rgba(40, 40, 56, 0.85);
  border-color: rgba(255, 255, 255, 0.35);
}

.render-aa-button .fab-ico { color: #ffd27a; }
.render-aa-button:hover {
  background: rgba(48, 38, 20, 0.82);
  border-color: rgba(255, 210, 122, 0.55);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 200, 100, 0.25);
}

.screenshot-button .fab-ico { color: #7ac9ff; }
.screenshot-button:hover {
  background: rgba(20, 36, 48, 0.82);
  border-color: rgba(122, 201, 255, 0.55);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.4), 0 0 20px rgba(100, 180, 255, 0.25);
}
.ui-hidden-hint {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 30;
  padding: 11px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: rgba(15, 15, 22, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  pointer-events: none;
  white-space: nowrap;
  animation: ui-hint-fade 1.8s ease forwards;
}
.ui-hidden-hint kbd {
  font-family: inherit;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.22);
}
@keyframes ui-hint-fade {
  0%, 55% { opacity: 1; }
  100% { opacity: 0; }
}

/* Antialiasing control / progress — sits just above the render-stats bar. */
.aa-control {
  position: fixed;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: auto;
}
@media (max-width: 1023px) {
  .aa-control {
    bottom: 140px;
  }
}
.aa-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(20, 20, 28, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(8px);
}
.aa-progress-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.aa-progress-track {
  width: 120px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}
.aa-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7c5cff, #4cc9f0);
  transition: width 0.2s ease;
}

@media (max-width: 768px) {
  .top-tab-btn {
    padding: 8px 12px;
    font-size: 0.85rem;
  }
}

/* === Palette picker cursor on the fractal canvas === */
.picker-cursor :deep(canvas) {
  cursor: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14.7 3.3 20.7 9.3 18.9 11.1 17.8 10 9.4 18.4C9.1 18.7 8.7 18.9 8.3 18.9H5.1V15.7C5.1 15.3 5.3 14.9 5.6 14.6L14 6.2 12.9 5.1 14.7 3.3Z' fill='white' stroke='black' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cpath d='M6.8 15.9H8.1L16.4 7.6 15.4 6.6 7.1 14.9 6.8 15.9Z' fill='%2338d5ff'/%3E%3C/svg%3E") 4 20, crosshair !important;
}

/* === Preset Discovery Radar & Pins === */
/* Floating action cluster (bottom-right), stacked above the "made with love"
   footer badge. Hidden during canvas navigation like the top settings bar. */
.hud-fab-cluster {
  position: fixed;
  right: 16px;
  bottom: 64px;
  z-index: 32;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  transition: opacity 0.25s ease;
}

.hud-fab-cluster.hud-hidden {
  opacity: 0;
  pointer-events: none;
}

.discovery-radar-button {
  background:
    radial-gradient(circle at 21px 50%, rgba(63, 230, 184, 0.32), transparent 26px),
    rgba(10, 14, 22, 0.68);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 0 18px rgba(63, 230, 184, 0.18);
}
.radar-ico { position: relative; }

.discovery-radar-button:hover,
.discovery-radar-button.is-active {
  border-color: rgba(63, 230, 184, 0.85);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.4), 0 0 28px rgba(63, 230, 184, 0.38);
}

.discovery-radar-button.is-active {
  color: #03110d;
  background:
    radial-gradient(circle at 28px 50%, rgba(255, 255, 255, 0.72), transparent 25px),
    linear-gradient(135deg, #6ff7d2, #32d6ff);
  border-color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.42), 0 0 0 2px rgba(63, 230, 184, 0.42), 0 0 34px rgba(63, 230, 184, 0.65);
}

.radar-button-ring {
  width: 19px;
  height: 19px;
  border-radius: 50%;
  border: 2px solid rgba(63, 230, 184, 0.9);
  position: relative;
  flex: 0 0 auto;
}

.radar-button-ring::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 1px solid rgba(63, 230, 184, 0.75);
  animation: radar-button-sonar 1.8s ease-out infinite;
}

.discovery-radar-button.is-active .radar-button-ring::after {
  animation: none;
  opacity: 0;
}

.radar-button-core {
  position: absolute;
  width: 5px;
  height: 5px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.9);
}

.discovery-radar-button.is-active .radar-button-core {
  background: #03110d;
  box-shadow: 0 0 0 4px rgba(3, 17, 13, 0.14);
}

@keyframes radar-button-sonar {
  0% {
    opacity: 0.7;
    transform: scale(0.72);
  }
  80% {
    opacity: 0;
    transform: scale(1.9);
  }
  100% {
    opacity: 0;
    transform: scale(1.9);
  }
}

.discovery-radar-pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16vmin;
  height: 16vmin;
  border-radius: 50%;
  border: 2px solid rgba(63, 230, 184, 0.55);
  transform: translate(-50%, -50%) scale(0.1);
  pointer-events: none;
  z-index: 24;
  animation: discovery-radar-pulse 1.25s ease-out forwards;
}

.discovery-radar-pulse.hud-hidden {
  opacity: 0;
}

@keyframes discovery-radar-pulse {
  0% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(0.08);
    box-shadow: 0 0 20px rgba(63, 230, 184, 0.35);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(18);
    box-shadow: 0 0 80px rgba(63, 230, 184, 0);
  }
}

.preset-pins-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 25;
  overflow: hidden;
  transition: opacity 0.4s ease;
}
.preset-pins-overlay.hud-hidden {
  opacity: 0;
}
.preset-pin-container {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.discovery-pin {
  animation: discovery-pin-reveal 0.34s ease-out both;
  animation-delay: var(--pin-reveal-delay, 0ms);
}

@keyframes discovery-pin-reveal {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.42);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    filter: blur(0);
  }
}

.pin-chevrons {
  position: absolute;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  color: rgba(63, 230, 184, 0.95);
  font-size: 8px;
  line-height: 1;
  text-shadow: 0 0 10px rgba(63, 230, 184, 0.78);
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 4;
}

.pin-chevrons i {
  display: block;
  height: 6px;
  line-height: 1;
}

.pin-chevrons-up {
  bottom: calc(50% + 9px);
}

.pin-chevrons-down {
  top: calc(50% + 9px);
}

.preset-pin-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  outline: none;
  transform: scale(var(--pin-scale, 1));
}
.preset-pin-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-bright);
  box-shadow: 0 0 12px var(--accent-bright);
  transition: transform 0.2s ease;
  z-index: 2;
}
.preset-pin-pulse {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--accent-bright);
  opacity: 0.28;
  z-index: 1;
}
.preset-pin-btn:hover .preset-pin-dot {
  transform: scale(1.3);
  background: #fff;
  box-shadow: 0 0 16px #fff, 0 0 24px var(--accent-bright);
}
.preset-pin-card {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%) translateY(10px) scale(0.8);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.preset-pin-container.below .preset-pin-card {
  bottom: auto;
  top: 26px;
}

.preset-pin-container.align-left .preset-pin-card {
  left: 0;
  transform: translateY(10px) scale(0.8);
}

.preset-pin-container.align-right .preset-pin-card {
  left: auto;
  right: 0;
  transform: translateY(10px) scale(0.8);
}

.preset-pin-container:hover .preset-pin-card {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.preset-pin-container.align-left:hover .preset-pin-card,
.preset-pin-container.align-right:hover .preset-pin-card {
  transform: translateY(0) scale(1);
}
.preset-pin-circle-thumb {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: 3px solid var(--accent-bright);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px var(--accent-bright);
  overflow: hidden;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}
.preset-pin-circle-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preset-pin-label {
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(16, 18, 24, 0.72);
  backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 6px;
}

.preset-pin-mag {
  font-size: 10px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.preset-pin-container.is-favorite .preset-pin-dot {
  background: #a855f7;
  box-shadow: 0 0 12px #a855f7;
}

.preset-pin-container.is-favorite .preset-pin-pulse {
  border-color: #a855f7;
}

.preset-pin-container.is-favorite .preset-pin-btn:hover .preset-pin-dot {
  box-shadow: 0 0 16px #fff, 0 0 24px #a855f7;
}

.preset-pin-container.is-favorite .preset-pin-circle-thumb {
  border-color: transparent;
  background: linear-gradient(#111, #111) padding-box,
              linear-gradient(135deg, #a855f7, #ec4899) border-box;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px #a855f7;
}

.discovery-edge-marker {
  position: absolute;
  z-index: 28;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(10, 14, 22, 0.62);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  pointer-events: auto;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.34), 0 0 13px rgba(63, 230, 184, 0.2);
  animation: discovery-edge-marker-reveal 0.34s ease-out both;
  animation-delay: var(--pin-reveal-delay, 0ms);
}

@keyframes discovery-edge-marker-reveal {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.42);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    filter: blur(0);
  }
}

.discovery-edge-marker:hover {
  border-color: rgba(255, 255, 255, 0.75);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.42), 0 0 24px rgba(255, 255, 255, 0.32);
}

.discovery-edge-marker.is-favorite {
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.36), 0 0 18px rgba(168, 85, 247, 0.36);
}

.discovery-cluster.is-open {
  z-index: 45;
}

.edge-marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
}

.edge-marker-count {
  position: absolute;
  min-width: 16px;
  height: 16px;
  right: -7px;
  top: -7px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #101219;
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
}

.edge-marker-direction {
  position: absolute;
  right: -3px;
  bottom: -4px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: rgba(63, 230, 184, 0.92);
  color: #05110e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 900;
  line-height: 1;
}

.edge-marker-direction i {
  display: block;
  line-height: 1;
}

.edge-cluster-preview {
  position: absolute;
  left: 50%;
  bottom: 34px;
  width: 218px;
  transform: translateX(-50%) translateY(8px) scale(0.96);
  opacity: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px;
  border-radius: 12px;
  background: rgba(12, 15, 22, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.48);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.discovery-edge-marker.below .edge-cluster-preview {
  bottom: auto;
  top: 34px;
}

.discovery-edge-marker.align-left .edge-cluster-preview {
  left: 0;
  transform: translateY(8px) scale(0.96);
}

.discovery-edge-marker.align-right .edge-cluster-preview {
  left: auto;
  right: 0;
  transform: translateY(8px) scale(0.96);
}

.discovery-edge-marker:hover .edge-cluster-preview,
.discovery-edge-marker:focus-visible .edge-cluster-preview,
.discovery-cluster.is-open .edge-cluster-preview {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0) scale(1);
}

.discovery-edge-marker.align-left:hover .edge-cluster-preview,
.discovery-edge-marker.align-left:focus-visible .edge-cluster-preview,
.discovery-edge-marker.align-right:hover .edge-cluster-preview,
.discovery-edge-marker.align-right:focus-visible .edge-cluster-preview,
.discovery-cluster.align-left.is-open .edge-cluster-preview,
.discovery-cluster.align-right.is-open .edge-cluster-preview {
  transform: translateY(0) scale(1);
}

.edge-cluster-item {
  height: 42px;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  padding: 4px;
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  text-align: left;
}

.edge-cluster-item:hover {
  background: rgba(255, 255, 255, 0.13);
}

.edge-cluster-thumb {
  width: 58px;
  height: 34px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
}

.edge-cluster-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edge-cluster-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.edge-cluster-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 700;
}

.edge-cluster-mag,
.edge-cluster-more {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.68);
  font-weight: 700;
}

@media (max-width: 768px) {
  .hud-fab-cluster {
    right: 12px;
  }
}

</style>
