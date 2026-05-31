<script setup lang="ts">
import {computed, nextTick, onMounted, ref, toRaw, watch} from 'vue';
import type {InterpolationMode, MandelbrotParams} from "../Mandelbrot.ts";
import type {ColorStop, EffectFieldName} from '../ColorStop.ts';
import {COLOR_STOP_DEFAULTS} from '../ColorStop.ts';
import PaletteEditor from './PaletteEditor.vue';
import {Palette} from '../Palette.ts';
import {hsl as d3hsl, rgb as d3rgb} from 'd3-color';
import defaultPresetsJson from '../assets/default-presets.json';
import defaultPalettesJson from '../assets/default-palettes.json';
import type {TextureMetadata} from '../textureStore';
import {
  deleteTextureEntry,
  renameTextureEntry,
  saveTextureEntry,
} from '../textureStore';
import {
  BUILT_IN_TEXTURE_NAMES,
  ensureTextureLibrary,
  SKYBOX_SELECTED_KEY,
  storedTextureObjectUrl,
  TEXTURE_SELECTED_KEY,
  textureSourceKey,
} from '../textureLibrary';
import type {PresetMetadata, PresetRecord} from '../presetStore';
import {
  computeScaleExponent,
  deletePresetEntry,
  getAllPresetEntries,
  getPresetById,
  getPresetCount,
  migratePalettePeriod,
  migratePresetsFromLocalStorage,
  savePresetEntry,
  updatePresetEntry,
} from '../presetStore';
import type {PaletteRecord} from '../paletteStore';
import {
  deletePaletteEntry,
  getAllPaletteEntries,
  getPaletteCount,
  migratePalettesFromLocalStorage,
  savePaletteEntry,
} from '../paletteStore';

import type {Engine} from '../Engine.ts';
const props = defineProps<{
  engine: Engine | null;
  suspendShortcuts?: (suspend: boolean) => void;
  activeTab: string;
  pickerMode?: boolean;
}>();

const emit = defineEmits<{
  'toggle-picker': [];
}>();
const model =  defineModel<MandelbrotParams>({
  default: {
    angle: 0,
    cx: "0.0",
    cy: "0.0",
    scale: "2.5",
    mu: 1000000.0,
    epsilon: 0.00001,
    colorStops: [],
     palettePeriod: 256,
    paletteOffset: 0,
    paletteMirror: false,
    antialiasLevel: 1,
    tessellationLevel: 0,
    shadingLevel: 0,
    lightAngle: 0,
    displacementAmount: 0,
    specularPower: 1,
    activatePalette: true,
    activateSkybox: false,
    activateTessellation: false,
    activateWebcam: false,
    activateShading: false,
    activateZebra: false,
     activateSmoothness: false,
     activateAnimate: false,
     animationSpeed: 1.0,
     ambientOcclusionStrength: 0,
     microBumpStrength: 0,
     clearcoatStrength: 0,
     subsurfaceStrength: 0.0,
     reliefDepth: 1,
     localShadowStrength: 0,
     varnishStrength: 0,
     stripeFrequency: 8,
     textureName: 'Gold',
     skyboxName: 'Skybox',
    dprMultiplier: 1.0,
    maxIterationMultiplier: 1.0,
     interpolationMode: 'lab',
     approximationMode: 'perturbation',
     targetFps: 60,
     gpuLoadMultiplier: 1.0,
  }
});


const angleDeg = computed(() => (((model.value.angle * 180 / Math.PI) % 360 + 360) % 360).toFixed(2));
// Slider rotation : angle en ° mod 360 (wrapping)
const angleSlider = computed({
  get: () => (((model.value.angle * 180 / Math.PI) % 360 + 360) % 360),
  set: (deg: number) => {
    // [0, 360) vers radian
    model.value.angle = (deg % 360) * Math.PI / 180;
  },
});
// Slider palette period : logarithmique, 0–1 ↔ 1–1000000
const sliderPalettePeriod = computed({
  get: () => Math.log10(model.value.palettePeriod || 1) / 6,
  set: val => {
    model.value.palettePeriod = Number((10 ** (val * 6)).toPrecision(6));
  }
});

/** Format palettePeriod for display: use K/M suffixes for large values. */
function formatPalettePeriod(val: number): string {
  if (val >= 1_000_000) return (val / 1_000_000).toPrecision(3) + 'M';
  if (val >= 1_000) return (val / 1_000).toPrecision(3) + 'K';
  if (val >= 10) return val.toFixed(0);
  return val.toPrecision(3);
}
// Slider log2(scale) : valeurs de slider 1 à 126 —> scale de 2^-1 à 2^-126
const scaleSlider = computed({
  get: () => {
    // Clamp la scale, éviter NaN si vide
    const s = Number(model.value.scale);
    const slider = s > 0 ? -Math.log2(s) : 126;
    if (!isFinite(slider)) return 1;
    return Math.min(Math.max(Math.round(slider), 1), 126); // Entre 1 et 126
  },
  set: (val: number) => {
    // Clamp entre 1 et 126
    const v = Math.min(Math.max(Math.round(val), 1), 126);
    model.value.scale = (2 ** -v).toPrecision(10);
  }
});

function truncateDecimal(str: string, digits: number): string {
  const [intPart, decPart] = str.split(".");
  if (!decPart) return intPart;
  return intPart + "." + decPart.slice(0, digits);
}

function generatePaletteThumbnail(colorStops: any[], mode: InterpolationMode = 'lab'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (colorStops.length === 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  const palette = new Palette(colorStops, mode);
  const rowData = palette.generateThumbnailRow(); // ImageData (4096×1, always opaque)

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = rowData.width;
  tempCanvas.height = 1;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return '';
  tempCtx.putImageData(rowData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const navigationPreview = ref<string | null>(null);
const presetName = ref('');
const presets = ref<PresetMetadata[]>([]);
/** Full record cache: loaded on demand when a preset is selected. */
const presetCache = new Map<number, PresetRecord>();

// Palette management
const paletteName = ref('');
const paletteEditorRef = ref<InstanceType<typeof PaletteEditor> | null>(null);
const palettes = ref<PaletteRecord[]>([]);
const selectedPalette = ref('');
const showPaletteDropdown = ref(false);
const applyToAll = ref(false);

async function deletePresetById(id: number) {
  const meta = presets.value.find(p => p.id === id);
  const label = meta?.name || formatPresetDate(meta?.date ?? '');
  if (!window.confirm(`Delete preset "${label}"? This cannot be undone.`)) return;
  await deletePresetEntry(id);
  presetCache.delete(id);
  presets.value = await getAllPresetEntries();
  if (selectedPreset.value === id) {
    selectedPreset.value = null;
    presetName.value = '';
  }
}

async function refreshNavigationPreview() {
  if (props.engine) {
    navigationPreview.value = await props.engine.getSnapshotPng(256);
  }
}

const selectedPreset = ref<number | null>(null);
const showPresetDropdown = ref(false);

const currentPresetMeta = computed(() => presets.value.find(p => p.id === selectedPreset.value));
const currentPresetThumbnail = computed(() => currentPresetMeta.value?.thumbnail);

async function selectPresetFromDropdown(preset: PresetMetadata) {
  await selectPreset(preset.id);
  showPresetDropdown.value = false;
}

/** Format an ISO date string for display. */
function formatPresetDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

/** Format scale exponent for display, e.g. "10^42". */
function formatZoom(exp: number): string {
  if (exp <= 0) return '1\u00d7';
  return '10^' + exp;
}

// Navigation tab: load only location (cx, cy, scale, angle) from a preset
const selectedNavPreset = ref<number | null>(null);
const showNavPresetDropdown = ref(false);

const currentNavPresetMeta = computed(() => presets.value.find(p => p.id === selectedNavPreset.value));
const currentNavPresetThumbnail = computed(() => currentNavPresetMeta.value?.thumbnail);
const favoritePresets = computed(() => presets.value.filter(p => p.favorite));
const favoritePalettes = computed(() => palettes.value.filter(p => p.favorite));
const FAVORITE_FILTER_STORAGE_KEY = 'mandelbrot_favorite_filters';

function loadFavoriteFilterState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(FAVORITE_FILTER_STORAGE_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

const favoriteFilterState = loadFavoriteFilterState();
const showOnlyFavoriteNavigation = ref(favoriteFilterState.navigation ?? false);
const showOnlyFavoritePresets = ref(favoriteFilterState.presets ?? false);
const showOnlyFavoritePalettePresets = ref(favoriteFilterState.palettePresets ?? false);
const showOnlyFavoritePalettes = ref(favoriteFilterState.palettes ?? false);
const visibleNavPresets = computed(() => showOnlyFavoriteNavigation.value ? favoritePresets.value : presets.value);
const visiblePresets = computed(() => showOnlyFavoritePresets.value ? favoritePresets.value : presets.value);
const visiblePalettePresets = computed(() => showOnlyFavoritePalettePresets.value ? favoritePresets.value : presets.value);
const visiblePalettes = computed(() => showOnlyFavoritePalettes.value ? favoritePalettes.value : palettes.value);

watch(
  [showOnlyFavoriteNavigation, showOnlyFavoritePresets, showOnlyFavoritePalettePresets, showOnlyFavoritePalettes],
  ([navigation, presetsOnly, palettePresets, palettesOnly]) => {
    localStorage.setItem(FAVORITE_FILTER_STORAGE_KEY, JSON.stringify({
      navigation,
      presets: presetsOnly,
      palettePresets,
      palettes: palettesOnly,
    }));
  },
);

async function selectPresetLocation(id: number) {
  const record = await getCachedPreset(id);
  if (record) {
    selectedNavPreset.value = id;
    model.value.cx = record.value.cx;
    model.value.cy = record.value.cy;
    model.value.scale = record.value.scale;
    model.value.angle = record.value.angle;
  }
}

async function selectNavPresetFromDropdown(preset: PresetMetadata) {
  await selectPresetLocation(preset.id);
  showNavPresetDropdown.value = false;
}


/** Fetch a preset record, using cache to avoid repeated IDB reads. */
async function getCachedPreset(id: number): Promise<PresetRecord | null> {
  if (presetCache.has(id)) return presetCache.get(id)!;
  const record = await getPresetById(id);
  if (record) presetCache.set(id, record);
  return record;
}

async function savePreset() {
  let thumbnail = '';
  const now = new Date().toISOString();
  try {
    if (props.engine) {
      thumbnail = await props.engine.getSnapshotPng(256);
    }
  } catch { /* ignore errors, no thumbnail */ }
  // Clone and strip performance fields before saving
  const savedValue = structuredClone(toRaw(model.value));
  delete (savedValue as any).dprMultiplier;
  delete (savedValue as any).maxIterationMultiplier;
  delete (savedValue as any).antialiasLevel;
  delete (savedValue as any).targetFps;
  delete (savedValue as any).gpuLoadMultiplier;
  savedValue.textureName = selectedTexture.value;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  const name = presetName.value.trim();
  const id = await savePresetEntry(savedValue, thumbnail, name || undefined, now);
  presets.value = await getAllPresetEntries();
  // Cache the new record
  presetCache.set(id, {
    id,
    name: name || '',
    value: savedValue,
    thumbnail,
    date: now,
    scaleExponent: computeScaleExponent(savedValue.scale),
    favorite: false,
  });
  presetName.value = '';
}

/**
 * Quick snapshot: save the current state without requiring a name.
 * Can be called from a keyboard shortcut via the parent component.
 */
async function quickSnapshot() {
  let thumbnail = '';
  try {
    if (props.engine) {
      thumbnail = await props.engine.getSnapshotPng(256);
    }
  } catch { /* ignore */ }
  const savedValue = structuredClone(toRaw(model.value));
  delete (savedValue as any).dprMultiplier;
  delete (savedValue as any).maxIterationMultiplier;
  delete (savedValue as any).antialiasLevel;
  delete (savedValue as any).targetFps;
  delete (savedValue as any).gpuLoadMultiplier;
  savedValue.textureName = selectedTexture.value;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  const now = new Date().toISOString();
  const id = await savePresetEntry(savedValue, thumbnail, undefined, now);
  presets.value = await getAllPresetEntries();
  presetCache.set(id, {
    id,
    name: '',
    value: savedValue,
    thumbnail,
    date: now,
    scaleExponent: computeScaleExponent(savedValue.scale),
    favorite: false,
  });
}

// Expose quickSnapshot and refreshPresets so parent can call them via ref
defineExpose({ quickSnapshot, refreshPresets: async () => { presets.value = await getAllPresetEntries(); } });


async function loadPresets() {
  // 1. Migrate legacy localStorage data (if any)
  await migratePresetsFromLocalStorage();

  // 1b. Migrate palettePeriod ×256 (removal of /256 divisor in shader)
  await migratePalettePeriod();

  // 2. Bootstrap with defaults when DB is empty
  const count = await getPresetCount();
  if (count === 0 && defaultPresetsJson.length > 0) {
    for (const legacy of defaultPresetsJson as any[]) {
      if (!legacy.value) continue;
      await savePresetEntry(
        legacy.value,
        legacy.thumbnail ?? '',
        legacy.name ?? '',
        legacy.date,
      );
    }
  }

  // 3. Load metadata list
  presets.value = await getAllPresetEntries();
}

async function loadPalettes() {
  await migratePalettesFromLocalStorage();
  const count = await getPaletteCount();
  if (count === 0 && defaultPalettesJson.length > 0) {
    // Bootstrap from bundled defaults when store is empty
    for (const p of defaultPalettesJson as PaletteRecord[]) {
      await savePaletteEntry(structuredClone(p));
    }
  }
  palettes.value = await getAllPaletteEntries();
}

async function savePalette() {
  if (!paletteName.value.trim()) return;
  let thumbnail: string | undefined = undefined;
  let now = new Date().toISOString();
  // Try WebGPU snapshot first (shows effects), fall back to CPU gradient strip
  try {
    const snap = paletteEditorRef.value?.getSnapshot?.();
    if (snap) {
      thumbnail = snap;
    } else {
      thumbnail = generatePaletteThumbnail(model.value.colorStops, model.value.interpolationMode);
    }
  } catch { /* ignore errors, no thumbnail */ }
  const palette: PaletteRecord = {
    name: paletteName.value.trim(),
    colorStops: structuredClone(toRaw(model.value.colorStops)),
    thumbnail,
    date: now,
    favorite: palettes.value.find(item => item.name === paletteName.value.trim())?.favorite ?? false,
    textureName: selectedTexture.value,
    skyboxName: selectedSkyboxTexture.value,
    interpolationMode: model.value.interpolationMode,
    palettePeriod: model.value.palettePeriod,
    paletteOffset: model.value.paletteOffset,
    paletteMirror: model.value.paletteMirror,
    activateAnimate: model.value.activateAnimate,
    animationSpeed: model.value.animationSpeed,
    tessellationLevel: model.value.tessellationLevel,
    displacementAmount: model.value.displacementAmount,
    ambientOcclusionStrength: model.value.ambientOcclusionStrength,
    microBumpStrength: model.value.microBumpStrength,
    clearcoatStrength: model.value.clearcoatStrength,
    subsurfaceStrength: model.value.subsurfaceStrength,
    reliefDepth: model.value.reliefDepth,
    localShadowStrength: model.value.localShadowStrength,
    varnishStrength: model.value.varnishStrength,
    stripeFrequency: model.value.stripeFrequency,
  };
  await savePaletteEntry(palette);
  palettes.value = await getAllPaletteEntries();
  paletteName.value = '';
}

function applyPaletteLookFields(source: Partial<PaletteRecord>): void {
  if (source.activateAnimate != null) model.value.activateAnimate = source.activateAnimate;
  if (source.animationSpeed != null) model.value.animationSpeed = source.animationSpeed;
  if (source.tessellationLevel != null) model.value.tessellationLevel = source.tessellationLevel;
  if (source.displacementAmount != null) model.value.displacementAmount = source.displacementAmount;
  if (source.ambientOcclusionStrength != null) model.value.ambientOcclusionStrength = source.ambientOcclusionStrength;
  if (source.microBumpStrength != null) model.value.microBumpStrength = source.microBumpStrength;
  if (source.clearcoatStrength != null) model.value.clearcoatStrength = source.clearcoatStrength;
  if (source.subsurfaceStrength != null) model.value.subsurfaceStrength = source.subsurfaceStrength;
  if (source.reliefDepth != null) model.value.reliefDepth = source.reliefDepth;
  if (source.localShadowStrength != null) model.value.localShadowStrength = source.localShadowStrength;
  if (source.varnishStrength != null) model.value.varnishStrength = source.varnishStrength;
  if (source.stripeFrequency != null) model.value.stripeFrequency = source.stripeFrequency;
}

function selectPalette(name: string) {
  const palette = palettes.value.find(p => p.name === name);
  if (palette) {
    selectedPalette.value = name;
    paletteName.value = palette.name;
    model.value.colorStops = structuredClone(toRaw(palette.colorStops));
    // Restore interpolation mode and palette params if present
    if (palette.interpolationMode) model.value.interpolationMode = palette.interpolationMode;
    if (palette.palettePeriod != null) model.value.palettePeriod = palette.palettePeriod;
    if (palette.paletteOffset != null) model.value.paletteOffset = palette.paletteOffset;
    model.value.paletteMirror = palette.paletteMirror ?? false;
    applyPaletteLookFields(palette);
    // Restore texture if present
    if (palette.textureName) {
      selectTexture(palette.textureName);
    }
    if (palette.skyboxName) {
      selectSkyboxTexture(palette.skyboxName);
    }
  }
}

function selectPaletteFromDropdown(palette: PaletteRecord) {
  selectPalette(palette.name);
  showPaletteDropdown.value = false;
}

// Palette tab: extract palette from a preset
const selectedPalettePreset = ref<number | null>(null);
const showPalettePresetDropdown = ref(false);

const currentPalettePresetMeta = computed(() => presets.value.find(p => p.id === selectedPalettePreset.value));
const currentPalettePresetThumbnail = computed(() => currentPalettePresetMeta.value?.thumbnail);

async function selectPaletteFromPreset(id: number) {
  const record = await getCachedPreset(id);
  if (record) {
    selectedPalettePreset.value = id;
    model.value.colorStops = structuredClone(toRaw(record.value.colorStops));
    model.value.interpolationMode = record.value.interpolationMode;
    model.value.palettePeriod = record.value.palettePeriod;
    model.value.paletteOffset = record.value.paletteOffset;
    model.value.paletteMirror = record.value.paletteMirror ?? false;
    applyPaletteLookFields(record.value);
    // Restore textures if present
    if (record.value.textureName) {
      selectTexture(record.value.textureName);
    }
    if (record.value.skyboxName) {
      selectSkyboxTexture(record.value.skyboxName);
    }
  }
}

async function selectPalettePresetFromDropdown(preset: PresetMetadata) {
  await selectPaletteFromPreset(preset.id);
  showPalettePresetDropdown.value = false;
}

/** Performance fields — never copied from presets */
const PERF_FIELDS: (keyof MandelbrotParams)[] = ['dprMultiplier', 'maxIterationMultiplier', 'antialiasLevel', 'targetFps', 'gpuLoadMultiplier'];

async function deletePalette() {
  const name = paletteName.value.trim();
  if (!name) return;
  if (window.confirm(`Delete palette "${name}"? This cannot be undone.`)) {
    await deletePaletteEntry(name);
    palettes.value = await getAllPaletteEntries();
    selectedPalette.value = '';
    paletteName.value = '';
  }
}

async function togglePresetFavorite(id: number): Promise<void> {
  const record = await getCachedPreset(id);
  if (!record) return;
  record.favorite = !record.favorite;
  await updatePresetEntry(record);
  presetCache.set(id, record);
  presets.value = await getAllPresetEntries();
}

async function togglePaletteFavorite(name: string): Promise<void> {
  const palette = palettes.value.find(item => item.name === name);
  if (!palette) return;
  const updated = { ...palette, favorite: !palette.favorite };
  await savePaletteEntry(updated);
  palettes.value = await getAllPaletteEntries();
}

async function deleteAllPresets(): Promise<void> {
  if (presets.value.length === 0) return;
  if (!window.confirm(`Delete all ${presets.value.length} presets? This cannot be undone.`)) return;
  for (const preset of presets.value) {
    await deletePresetEntry(preset.id);
  }
  presetCache.clear();
  presets.value = await getAllPresetEntries();
  selectedPreset.value = null;
  selectedNavPreset.value = null;
  selectedPalettePreset.value = null;
  presetName.value = '';
}

async function deleteAllPalettes(): Promise<void> {
  if (palettes.value.length === 0) return;
  if (!window.confirm(`Delete all ${palettes.value.length} palettes? This cannot be undone.`)) return;
  for (const palette of palettes.value) {
    await deletePaletteEntry(palette.name);
  }
  palettes.value = await getAllPaletteEntries();
  selectedPalette.value = '';
  paletteName.value = '';
}

async function selectPreset(id: number) {
  const record = await getCachedPreset(id);
  if (record) {
    selectedPreset.value = id;
    presetName.value = record.name;
    // Restore all fields except performance params
    const saved = structuredClone(toRaw(record.value));
    const current = model.value;
    for (const key of PERF_FIELDS) {
      (saved as any)[key] = (current as any)[key];
    }
    withSuppressedSync(() => { model.value = saved; });
    // Restore texture if saved with the preset
    const texName = saved.textureName;
    if (texName && textures.value.some(t => t.name === texName)) {
      selectTexture(texName);
    }
    const skyName = saved.skyboxName;
    if (skyName && textures.value.some(t => t.name === skyName)) {
      selectSkyboxTexture(skyName);
    }
  }
}

const muSlider = computed({
  get: () => Math.log10(model.value.mu ?? 1.0),
  set: (val: number) => {
    model.value.mu = Math.pow(10, val);
  }
});
const epsilonSlider = computed({
  get: () => Math.log10(model.value.epsilon ?? 1e-8),
  set: (val: number) => {
    model.value.epsilon = Math.pow(10, val);
  }
});
// Slider max iteration multiplier : logarithmique, 0.1–10
const maxIterMultSlider = computed({
  get: () => Math.log10(model.value.maxIterationMultiplier ?? 1.0),
  set: (val: number) => {
    model.value.maxIterationMultiplier = Number(Math.pow(10, val).toPrecision(3));
  }
});

// =====================================================
// Sync UI toggle/slider values → per-stop effect fields
// =====================================================
// When a global toggle or slider changes, propagate the value to ALL stops.
// This is the bridge between legacy UI controls and the per-stop palette texture.

/**
 * Guard flag: when true, legacy toggle/slider watchers skip their
 * `setEffectOnAllStops` calls so they don't overwrite per-stop values
 * that were just loaded from a preset or palette.
 * Cleared automatically on the next tick via `withSuppressedSync`.
 */
let suppressLegacySync = false;

/** Run `fn` with legacy sync suppressed; flag is cleared after Vue flushes watchers. */
function withSuppressedSync(fn: () => void) {
  suppressLegacySync = true;
  fn();
  void nextTick().then(() => { suppressLegacySync = false; });
}

/**
 * Set an effect field on every color stop in the model.
 * Mutates the stops in place (Vue reactivity tracks this).
 */
function setEffectOnAllStops(field: EffectFieldName, value: number) {
  for (const stop of model.value.colorStops) {
    stop[field] = value;
  }
}

/**
 * Set an effect field only on stops that don't already have it defined.
 * Used for migration/initialization — does NOT overwrite per-stop values.
 */
function fillMissingEffectOnStops(field: EffectFieldName, value: number) {
  for (const stop of model.value.colorStops) {
    if (stop[field] === undefined) {
      stop[field] = value;
    }
  }
}

/**
 * Fill in missing effect fields on all stops using current legacy toggle/slider
 * values. Only writes to stops where the field is `undefined` — existing per-stop
 * values are preserved. Called when colorStops are replaced (palette selection,
 * preset load, etc.) and on initial mount.
 */
function syncAllLegacyToStops() {
  const m = model.value;
  const stops = m.colorStops;
  if (!stops || stops.length === 0) return;

  // Activation toggles — only fill missing
  if (m.activateShading !== undefined)      fillMissingEffectOnStops('shading',      m.activateShading      ? 1.0 : 0.0);
  if (m.activatePalette !== undefined)      fillMissingEffectOnStops('palette',      m.activatePalette      ? 1.0 : 0.0);
  if (m.activateSmoothness !== undefined)   fillMissingEffectOnStops('smoothness',   m.activateSmoothness   ? 1.0 : 0.0);
  if (m.activateTessellation !== undefined) fillMissingEffectOnStops('tessellation', m.activateTessellation ? 1.0 : 0.0);
  if (m.activateSkybox !== undefined)       fillMissingEffectOnStops('skybox',       m.activateSkybox       ? 1.0 : 0.0);
  if (m.activateWebcam !== undefined)       fillMissingEffectOnStops('webcam',       m.activateWebcam       ? 1.0 : 0.0);
  if (m.activateZebra !== undefined)        fillMissingEffectOnStops('zebra',        m.activateZebra        ? 1.0 : 0.0);

  // Continuous sliders — only fill missing
  // Note: tessellationLevel, displacementAmount, and lightAngle are now global uniforms, not per-stop.
  if (m.shadingLevel !== undefined)       fillMissingEffectOnStops('shadingLevel',       m.shadingLevel);
  if (m.specularPower !== undefined)      fillMissingEffectOnStops('specularPower',      m.specularPower);
}

// ── Activation toggles → stop weights ──
// Map: legacy boolean field → stop effect field name
const TOGGLE_TO_EFFECT: Array<[keyof MandelbrotParams, EffectFieldName, number]> = [
  ['activateShading',      'shading',      COLOR_STOP_DEFAULTS.shading],
  ['activatePalette',      'palette',      COLOR_STOP_DEFAULTS.palette],
  ['activateSmoothness',   'smoothness',   COLOR_STOP_DEFAULTS.smoothness],
  ['activateTessellation',  'tessellation', COLOR_STOP_DEFAULTS.tessellation],
  ['activateSkybox',        'skybox',       COLOR_STOP_DEFAULTS.skybox],
  ['activateWebcam',        'webcam',       COLOR_STOP_DEFAULTS.webcam],
  ['activateZebra',         'zebra',        COLOR_STOP_DEFAULTS.zebra],
];

for (const [toggleField, effectField] of TOGGLE_TO_EFFECT) {
  watch(
    () => model.value[toggleField] as boolean | undefined,
    (val) => {
      if (suppressLegacySync) return;
      if (val === undefined) return;
      setEffectOnAllStops(effectField, val ? 1.0 : 0.0);
    },
  );
}

// ── Continuous sliders → stop parameters ──
// Map: legacy slider field → stop effect field name
// Note: tessellationLevel, displacementAmount, and lightAngle are now global uniforms, not per-stop.
const SLIDER_TO_EFFECT: Array<[keyof MandelbrotParams, EffectFieldName]> = [
  ['shadingLevel',       'shadingLevel'],
  ['specularPower',      'specularPower'],
];

for (const [sliderField, effectField] of SLIDER_TO_EFFECT) {
  watch(
    () => model.value[sliderField] as number | undefined,
    (val) => {
      if (suppressLegacySync) return;
      if (val === undefined) return;
      setEffectOnAllStops(effectField, val);
    },
  );
}

// When colorStops is replaced wholesale (palette selection, LCH generation, etc.),
// stamp the current legacy toggle/slider values onto all new stops.
// Do not run on Settings mount: opening a panel must not mutate palette data,
// otherwise the renderer sees a palette change and recomputes the full image.
watch(
  () => model.value.colorStops,
  () => { syncAllLegacyToStops(); },
);

onMounted(async () => {
  await loadPresets();
  await loadPalettes();
  await loadTextures();
});

const currentPaletteObj = computed(() => palettes.value.find(p => p.name === selectedPalette.value));
const currentPaletteThumbnail = computed(() => currentPaletteObj.value?.thumbnail);

watch([() => props.activeTab, () => props.engine], async ([tab]) => {
  if (tab === 'navigation') {
    window.setTimeout(() => { void refreshNavigationPreview(); }, 0);
  }
});

// =====================================================
// Import / Export Presets
// =====================================================
async function exportPresets() {
  // Build full records for export (legacy-compatible format)
  const allRecords: PresetRecord[] = [];
  for (const meta of presets.value) {
    const record = await getCachedPreset(meta.id);
    if (record) allRecords.push(record);
  }
  const exportData = allRecords.map(r => ({
    name: r.name,
    value: r.value,
    thumbnail: r.thumbnail,
    date: r.date,
    favorite: r.favorite ?? false,
  }));
  const data = JSON.stringify(exportData, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mandelbrot-presets.json';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJsonFile(filename: string, payload: unknown) {
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportSelectedPreset() {
  if (!selectedPreset.value) return;
  const record = await getCachedPreset(selectedPreset.value);
  if (!record) return;
  downloadJsonFile(`mandelbrot-preset-${record.name || record.id}.json`, {
    name: record.name,
    value: record.value,
    thumbnail: record.thumbnail,
    date: record.date,
    favorite: record.favorite ?? false,
  });
}

async function exportFavoritePresets() {
  const allRecords: PresetRecord[] = [];
  for (const meta of favoritePresets.value) {
    const record = await getCachedPreset(meta.id);
    if (record) allRecords.push(record);
  }
  const exportData = allRecords.map(r => ({
    name: r.name,
    value: r.value,
    thumbnail: r.thumbnail,
    date: r.date,
    favorite: r.favorite ?? false,
  }));
  downloadJsonFile('mandelbrot-favorite-presets.json', exportData);
}

async function exportSelectedNavigationPreset() {
  if (!selectedNavPreset.value) return;
  const record = await getCachedPreset(selectedNavPreset.value);
  if (!record) return;
  downloadJsonFile(`mandelbrot-navigation-${record.name || record.id}.json`, {
    name: record.name,
    date: record.date,
    favorite: record.favorite ?? false,
    value: {
      cx: record.value.cx,
      cy: record.value.cy,
      scale: record.value.scale,
      angle: record.value.angle,
    },
  });
}

async function exportFavoriteNavigationPresets() {
  const exportData = [];
  for (const meta of favoritePresets.value) {
    const record = await getCachedPreset(meta.id);
    if (!record) continue;
    exportData.push({
      name: record.name,
      date: record.date,
      favorite: record.favorite ?? false,
      value: {
        cx: record.value.cx,
        cy: record.value.cy,
        scale: record.value.scale,
        angle: record.value.angle,
      },
    });
  }
  downloadJsonFile('mandelbrot-favorite-navigation.json', exportData);
}

const presetFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPresets() {
  presetFileInput.value?.click();
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await readFileAsText(file));
}

async function importPresets(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return;

  const existing = await getAllPresetEntries();
  let importedCount = 0;
  let hadValid = false;
  for (const file of files) {
    try {
      const imported = await readJsonFile(file);
      const records = Array.isArray(imported) ? imported : [imported];
      for (const preset of records) {
        if (!preset || typeof preset !== 'object' || !('value' in preset)) continue;
        hadValid = true;
        const record = preset as {
          value: MandelbrotParams;
          thumbnail?: string;
          name?: string;
          date?: string;
          favorite?: boolean;
        };
        const name = record.name ?? '';
        const date = record.date ?? '';
        if (existing.some(e => e.name === name && e.date === date)) continue;
        await savePresetEntry(
          record.value,
          record.thumbnail ?? '',
          name,
          record.date,
          record.favorite ?? false,
        );
        importedCount += 1;
      }
    } catch (error) {
      console.warn(`[Settings] Skipping preset import file "${file.name}"`, error);
    }
  }

  if (importedCount > 0) {
    presets.value = await getAllPresetEntries();
  } else if (hadValid) {
    window.alert('All presets were already imported (same name + date).');
  } else {
    window.alert('Invalid file format.');
  }

  // Reset pour pouvoir réimporter les mêmes fichiers
  input.value = '';
}

// =====================================================
// Import / Export Palettes
// =====================================================
function exportPalettes() {
  const data = JSON.stringify(palettes.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mandelbrot-palettes.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportSelectedPalette() {
  const palette = palettes.value.find(item => item.name === selectedPalette.value);
  if (!palette) return;
  downloadJsonFile(`mandelbrot-palette-${palette.name}.json`, palette);
}

function exportFavoritePalettes() {
  downloadJsonFile('mandelbrot-favorite-palettes.json', favoritePalettes.value);
}

const paletteFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPalettes() {
  paletteFileInput.value?.click();
}
async function importPalettes(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return;

  const existing = await getAllPaletteEntries();
  let importedCount = 0;
  let hadValid = false;
  for (const file of files) {
    try {
      const imported = await readJsonFile(file);
      const records = Array.isArray(imported) ? imported : [imported];
      for (const palette of records) {
        if (!palette || typeof palette !== 'object' || !('name' in palette) || !('colorStops' in palette)) continue;
        hadValid = true;
        const record = palette as PaletteRecord;
        const name = record.name ?? '';
        const date = record.date ?? '';
        if (existing.some(e => e.name === name && e.date === date)) continue;
        await savePaletteEntry(record);
        importedCount += 1;
      }
    } catch (error) {
      console.warn(`[Settings] Skipping palette import file "${file.name}"`, error);
    }
  }

  if (importedCount > 0) {
    palettes.value = await getAllPaletteEntries();
  } else if (hadValid) {
    window.alert('All palettes were already imported (same name + date).');
  } else {
    window.alert('Invalid file format.');
  }

  input.value = '';
}

// =====================================================
// LCH Global Adjustment Sliders (perceptually uniform)
// =====================================================
// Stores the baseline colorStops for color adjustments
const lchBaseStops = ref<ColorStop[] | null>(null);
const satShift = ref(0);     // HSL saturation shift (-100..100)
const lumShift = ref(0);     // HSL luminosity shift (-100..100)
const hslHueShift = ref(0); // HSL hue shift in degrees (-180..180)

// When user starts adjusting, save the current stops as baseline
function ensureLchBase() {
  if (lchBaseStops.value === null) {
    lchBaseStops.value = structuredClone(toRaw(model.value.colorStops));
  }
}

function resetLchBase() {
  lchBaseStops.value = null;
  satShift.value = 0;
  lumShift.value = 0;
  hslHueShift.value = 0;
}

function applyAllShifts() {
  if (!lchBaseStops.value) return;
  model.value.colorStops = lchBaseStops.value.map(stop => {
    const rgbC = d3rgb(stop.color);
    if (rgbC === null || rgbC === undefined) return { ...stop };

    // Apply HSL shifts
    const hslC = d3hsl(rgbC);
    const baseHslH = isNaN(hslC.h) ? 0 : hslC.h;
    const baseHslS = isNaN(hslC.s) ? 0 : hslC.s;
    const baseHslL = isNaN(hslC.l) ? 0 : hslC.l;
    let hslH = baseHslH + hslHueShift.value;
    hslH = ((hslH % 360) + 360) % 360;
    let sat = baseHslS + satShift.value / 100;
    sat = Math.max(0, Math.min(1, sat));
    let lum = baseHslL + lumShift.value / 100;
    lum = Math.max(0, Math.min(1, lum));
    // If resulting saturation is zero, keep hue undefined to avoid color artifacts
    const finalH = (sat === 0) ? NaN : hslH;
    const final = d3hsl(finalH, sat, lum);
    // Preserve all effect fields, only update color
    return { ...stop, color: d3rgb(final).formatHex() };
  });
}

function onSatInput(val: number) {
  ensureLchBase();
  satShift.value = val;
  applyAllShifts();
}

function onLumInput(val: number) {
  ensureLchBase();
  lumShift.value = val;
  applyAllShifts();
}

function onHslHueInput(val: number) {
  ensureLchBase();
  hslHueShift.value = val;
  applyAllShifts();
}

// =====================================================
// Interpolation Modes
// =====================================================
const interpolationModes: { key: InterpolationMode; label: string }[] = [
  { key: 'lab', label: 'Lab' },
  { key: 'rgb', label: 'RGB' },
  { key: 'hcl', label: 'HCL' },
  { key: 'hsl', label: 'HSL' },
  { key: 'cubehelix', label: 'Cubehelix' },
];

// =====================================================
// Palette Manipulation Tools
// =====================================================

/** Inverser : reverse stop order (position 0→1 becomes 1→0) */
function invertPalette() {
  if (model.value.colorStops.length === 0) return;
  model.value.colorStops = model.value.colorStops.map(s => ({
    ...s,
    position: 1 - s.position,
  })).sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Dupliquer : compress palette to first half and repeat it in the second half */
function duplicatePalette() {
  if (model.value.colorStops.length === 0) return;
  const first = model.value.colorStops.map(s => ({
    ...s,
    position: s.position * 0.5,
  }));
  const second = model.value.colorStops.map(s => ({
    ...s,
    position: 0.5 + s.position * 0.5,
  }));
  model.value.colorStops = [...first, ...second].sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Miroir : palette goes 0→0.5 then mirrors back 0.5→1 (palindrome) */
function mirrorPalette() {
  if (model.value.colorStops.length === 0) return;
  const first = model.value.colorStops.map(s => ({
    ...s,
    position: s.position * 0.5,
  }));
  const second = model.value.colorStops.map(s => ({
    ...s,
    position: 1 - s.position * 0.5,
  }));
  model.value.colorStops = [...first, ...second].sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Distribuer : space all stops evenly across [0, 1] while keeping color order */
function distributeEvenly() {
  const stops = model.value.colorStops.slice().sort((a, b) => a.position - b.position);
  if (stops.length < 2) return;
  const step = 1 / (stops.length - 1);
  model.value.colorStops = stops.map((s, i) => ({
    ...s,
    position: Number((i * step).toFixed(6)),
  }));
  resetLchBase();
}

/** Négatif : invert each color to its RGB complement (preserves effect fields) */
function negatePalette() {
  if (model.value.colorStops.length === 0) return;
  model.value.colorStops = model.value.colorStops.map(s => {
    const c = d3rgb(s.color);
    const inv = d3rgb(255 - (c.r || 0), 255 - (c.g || 0), 255 - (c.b || 0));
    return { ...s, color: inv.formatHex() };
  });
  resetLchBase();
}

/** Supprimer toute la palette : reset to 2 default stops (black → white) */
function clearPalette() {
  model.value.colorStops = [
    { color: '#000000', position: 0 },
    { color: '#ffffff', position: 1 },
  ];
  resetLchBase();
}



// =====================================================
// Image texture library
// =====================================================
const MAX_TEXTURE_SIZE = 4096;

const textureName = ref('');
const skyboxName = ref('');
const textures = ref<TextureMetadata[]>([]);
const selectedTexture = ref('Gold');
const selectedSkyboxTexture = ref('Skybox');
const showTextureDropdown = ref(false);
const showSkyboxDropdown = ref(false);
let suppressTextureApply = false;

const currentTextureObj = computed(() => textures.value.find(t => t.name === selectedTexture.value));
const currentTextureThumbnail = computed(() => currentTextureObj.value?.thumbnail);
const currentSkyboxObj = computed(() => textures.value.find(t => t.name === selectedSkyboxTexture.value));
const currentSkyboxThumbnail = computed(() => currentSkyboxObj.value?.thumbnail);

/** Active blob URL — must be revoked when changed to avoid memory leaks. */
const activeBlobUrl = ref<string | null>(null);
const activeSkyboxBlobUrl = ref<string | null>(null);

function revokeActiveBlobUrl() {
  if (activeBlobUrl.value) {
    if (activeBlobUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(activeBlobUrl.value);
    }
    activeBlobUrl.value = null;
  }
}

function revokeActiveSkyboxBlobUrl() {
  if (activeSkyboxBlobUrl.value) {
    if (activeSkyboxBlobUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(activeSkyboxBlobUrl.value);
    }
    activeSkyboxBlobUrl.value = null;
  }
}

/** Generate a small thumbnail (256px wide) from a blob URL or data URL */
function generateThumbnailFromUrl(url: string, maxWidth = 256): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(''); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

async function loadTextures() {
  suppressTextureApply = true;
  textures.value = await ensureTextureLibrary();

  // 4. Restore persisted selections:
  //    Priority: model value (from parent/preset) > localStorage > built-in default
  const modelName = model.value.textureName;
  const savedName = localStorage.getItem(TEXTURE_SELECTED_KEY);
  const restoredName = (modelName && textures.value.some(t => t.name === modelName))
    ? modelName
    : (savedName && textures.value.some(t => t.name === savedName))
      ? savedName
      : 'Gold';
  const modelSkyboxName = model.value.skyboxName;
  const savedSkyboxName = localStorage.getItem(SKYBOX_SELECTED_KEY);
  const restoredSkyboxName = (modelSkyboxName && textures.value.some(t => t.name === modelSkyboxName))
    ? modelSkyboxName
    : (savedSkyboxName && textures.value.some(t => t.name === savedSkyboxName))
      ? savedSkyboxName
      : 'Skybox';
  selectedTexture.value = restoredName;
  model.value.textureName = restoredName;
  textureName.value = restoredName;
  selectedSkyboxTexture.value = restoredSkyboxName;
  model.value.skyboxName = restoredSkyboxName;
  skyboxName.value = restoredSkyboxName;
  void nextTick().then(() => { suppressTextureApply = false; });
}

async function applyTextureToEngine(name: string, engine: import('../Engine').Engine) {
  const sourceKey = textureSourceKey(name, textures.value);
  const engineCurrent = engine.isTileTextureSourceCurrent(sourceKey);
  if (engineCurrent && activeBlobUrl.value) return;
  const objectUrl = await storedTextureObjectUrl(name);
  if (!objectUrl) return;
  revokeActiveBlobUrl();
  activeBlobUrl.value = objectUrl;
  if (!engineCurrent) {
    await engine.updateTileTexture(activeBlobUrl.value, sourceKey);
  }
}

async function applySkyboxToEngine(name: string, engine: import('../Engine').Engine) {
  const sourceKey = textureSourceKey(name, textures.value);
  const engineCurrent = engine.isSkyboxTextureSourceCurrent(sourceKey);
  if (engineCurrent && activeSkyboxBlobUrl.value) return;
  const objectUrl = await storedTextureObjectUrl(name);
  if (!objectUrl) return;
  revokeActiveSkyboxBlobUrl();
  activeSkyboxBlobUrl.value = objectUrl;
  if (!engineCurrent) {
    await engine.updateSkyboxTexture(activeSkyboxBlobUrl.value, sourceKey);
  }
}

// Apply texture to engine whenever selectedTexture or engine changes.
// This covers: initial load, tab re-mount, preset change, random, manual selection.
watch([selectedTexture, () => props.engine] as const, async ([name, engine]) => {
  if (suppressTextureApply) return;
  if (engine && name) {
    try {
      await applyTextureToEngine(name, engine);
    } catch (e) {
      console.warn('Failed to apply tile texture:', e);
    }
  }
});

watch([selectedSkyboxTexture, () => props.engine] as const, async ([name, engine]) => {
  if (suppressTextureApply) return;
  if (engine && name) {
    try {
      await applySkyboxToEngine(name, engine);
    } catch (e) {
      console.warn('Failed to apply skybox texture:', e);
    }
  }
});

async function selectTexture(name: string) {
  const tex = textures.value.find(t => t.name === name);
  if (!tex) return;
  selectedTexture.value = name;
  model.value.textureName = name;
  textureName.value = tex.name;
  showTextureDropdown.value = false;
  // Persist selection
  localStorage.setItem(TEXTURE_SELECTED_KEY, name);
  // Apply to engine
  if (props.engine) {
    try {
      await applyTextureToEngine(name, props.engine);
    } catch (e) {
      console.warn('Failed to update tile texture:', e);
    }
  }
}

function selectTextureFromDropdown(tex: TextureMetadata) {
  selectTexture(tex.name);
}

async function selectSkyboxTexture(name: string) {
  const tex = textures.value.find(t => t.name === name);
  if (!tex) return;
  selectedSkyboxTexture.value = name;
  model.value.skyboxName = name;
  skyboxName.value = tex.name;
  showSkyboxDropdown.value = false;
  localStorage.setItem(SKYBOX_SELECTED_KEY, name);
  if (props.engine) {
    try {
      await applySkyboxToEngine(name, props.engine);
    } catch (e) {
      console.warn('Failed to update skybox texture:', e);
    }
  }
}

function selectSkyboxFromDropdown(tex: TextureMetadata) {
  selectSkyboxTexture(tex.name);
}

async function deleteTexture() {
  const name = textureName.value.trim();
  if (!name) return;
  if (BUILT_IN_TEXTURE_NAMES.has(name)) {
    window.alert('Built-in textures cannot be deleted.');
    return;
  }
   if (window.confirm(`Delete texture "${name}"? This cannot be undone.`)) {
    const idx = textures.value.findIndex(t => t.name === name);
    if (idx >= 0) {
      textures.value.splice(idx, 1);
      await deleteTextureEntry(name);
      selectedTexture.value = 'Gold';
      textureName.value = '';
      // Revert to default texture
      await selectTexture('Gold');
    }
  }
}

async function deleteSkyboxTexture() {
  const name = skyboxName.value.trim();
  if (!name) return;
  if (BUILT_IN_TEXTURE_NAMES.has(name)) {
    window.alert('Built-in textures cannot be deleted.');
    return;
  }
  if (window.confirm(`Delete skybox texture "${name}"? This cannot be undone.`)) {
    const idx = textures.value.findIndex(t => t.name === name);
    if (idx >= 0) {
      textures.value.splice(idx, 1);
      await deleteTextureEntry(name);
      if (selectedTexture.value === name) {
        await selectTexture('Gold');
      }
      await selectSkyboxTexture('Skybox');
      skyboxName.value = 'Skybox';
    }
  }
}

const textureFileInput = ref<HTMLInputElement | null>(null);
const skyboxFileInput = ref<HTMLInputElement | null>(null);
function triggerImportTexture() {
  textureFileInput.value?.click();
}

function triggerImportSkybox() {
  skyboxFileInput.value?.click();
}

async function importTextureFor(event: Event, target: 'tile' | 'skybox') {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  // Validate file type
  if (!file.type.startsWith('image/')) {
    window.alert('Please select an image file (JPG, PNG, WebP, etc.).');
    input.value = '';
    return;
  }
  // Validate dimensions via a temporary blob URL (no base64 needed)
  const tmpUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = async () => {
    URL.revokeObjectURL(tmpUrl);
    if (img.width > MAX_TEXTURE_SIZE || img.height > MAX_TEXTURE_SIZE) {
      window.alert(`Image too large (${img.width}×${img.height}). Maximum size: ${MAX_TEXTURE_SIZE}×${MAX_TEXTURE_SIZE}.`);
      input.value = '';
      return;
    }
    // Use filename (without extension) as default name
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'Texture';
    let name = baseName;
    let counter = 1;
    while (textures.value.some(t => t.name === name)) {
      name = `${baseName} (${counter++})`;
    }
    // Generate thumbnail from the blob
    const thumbUrl = URL.createObjectURL(file);
    const thumbnail = await generateThumbnailFromUrl(thumbUrl);
    URL.revokeObjectURL(thumbUrl);

    // Store blob in IndexedDB
    await saveTextureEntry(name, file, thumbnail);

    // Refresh metadata list
    textures.value = await ensureTextureLibrary();

    // Auto-select the newly imported texture for the requested target
    if (target === 'skybox') {
      await selectSkyboxTexture(name);
      skyboxName.value = name;
    } else {
      await selectTexture(name);
      textureName.value = name;
    }
    input.value = '';
  };
  img.onerror = () => {
    URL.revokeObjectURL(tmpUrl);
    window.alert('Failed to load image.');
    input.value = '';
  };
  img.src = tmpUrl;
}

async function importTexture(event: Event) {
  await importTextureFor(event, 'tile');
}

async function importSkyboxTexture(event: Event) {
  await importTextureFor(event, 'skybox');
}

async function renameAndSaveTexture() {
  const name = textureName.value.trim();
  if (!name) return;
  // If a texture is selected and we're renaming it
  const current = textures.value.find(t => t.name === selectedTexture.value);
  if (current && current.name !== name) {
    // Check name collision
    if (textures.value.some(t => t.name === name)) {
      window.alert(`A texture named "${name}" already exists.`);
      return;
    }
    await renameTextureEntry(current.name, name);
    // Refresh metadata list
    textures.value = await ensureTextureLibrary();
    selectedTexture.value = name;
    localStorage.setItem(TEXTURE_SELECTED_KEY, name);
  }
}

async function renameAndSaveSkyboxTexture() {
  const name = skyboxName.value.trim();
  if (!name) return;
  const current = textures.value.find(t => t.name === selectedSkyboxTexture.value);
  if (current && current.name !== name) {
    if (BUILT_IN_TEXTURE_NAMES.has(current.name)) {
      window.alert('Built-in textures cannot be renamed.');
      skyboxName.value = current.name;
      return;
    }
    if (textures.value.some(t => t.name === name)) {
      window.alert(`A texture named "${name}" already exists.`);
      return;
    }
    await renameTextureEntry(current.name, name);
    textures.value = await ensureTextureLibrary();
    selectedSkyboxTexture.value = name;
    model.value.skyboxName = name;
    localStorage.setItem(SKYBOX_SELECTED_KEY, name);
  }
}

</script>

<template>
  <div style="color: black !important;">
    <!-- Navigation tab -->
    <div v-if="activeTab === 'navigation'">
      <div class="mb-3" style="font-family: monospace; word-break: break-all; white-space: pre-line;">
        <span>Cx: <span>{{ truncateDecimal(model.cx, 38) }}</span></span><br />
        <span>Cy: <span>{{ truncateDecimal(model.cy, 38) }}</span></span>
      </div>

      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <span>Scale&nbsp;:
          <span style="font-family: monospace; min-width:7.5em; display:inline-block;">{{ Number(model.scale).toExponential(2) }}</span>
        </span>
        <input class="slider is-fullwidth" style="flex: 1 1 110px; min-width: 85px; margin: 0 0.6em 0 0.6em;" type="range" min="1" max="126" step="1" v-model.number="scaleSlider" />
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <span>Angle&nbsp;:
          <span style="font-family: monospace; min-width:5em; display:inline-block;">{{ angleDeg }}°</span>
        </span>
        <input class="slider is-fullwidth" style="flex: 1 1 110px; min-width: 85px; margin: 0 0.6em 0 0.6em;" type="range" min="0" max="359" step="1" v-model.number="angleSlider" />
      </div>

      <hr class="section-sep"/>

      <div class="mb-3">
        <label class="label">Load a location</label>
        <p style="font-size: 0.82em; color: #555; margin-bottom: 0.5em;">Applies only the location (Cx, Cy, scale, angle) from a preset.</p>
        <button
          class="button is-small favorite-filter"
          :class="{ 'is-active': showOnlyFavoriteNavigation }"
          type="button"
          :aria-pressed="showOnlyFavoriteNavigation"
          @click="showOnlyFavoriteNavigation = !showOnlyFavoriteNavigation"
        >
          <span class="favorite-filter-heart">♥</span>
          <span>Favorites</span>
        </button>
        <div class="dropdown" :class="{ 'is-active': showNavPresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showNavPresetDropdown = !showNavPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-nav-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentNavPresetThumbnail" :src="currentNavPresetThumbnail" alt="thumbnail" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ currentNavPresetMeta?.name || (selectedNavPreset ? formatPresetDate(currentNavPresetMeta?.date ?? '') : 'Choose a preset...') }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-nav-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in visibleNavPresets" :key="preset.id" class="dropdown-item favorite-row"
                @click.prevent="selectNavPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedNavPreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': preset.favorite }"
                  type="button"
                  :title="preset.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!preset.favorite"
                  @click.stop.prevent="togglePresetFavorite(preset.id)"
                >
                  <span class="favorite-heart" aria-hidden="true">♥</span>
                </button>
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="thumbnail"
                  style="height:63px; width:112px; object-fit:cover; border-radius:4px; background:#aaa; flex-shrink:0; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:0.15em;">
                  <span v-if="preset.name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; font-weight:500;">{{ preset.name }}</span>
                  <span style="font-size:0.78em; color:#666; display:flex; gap:0.6em;">
                    <span>{{ formatPresetDate(preset.date) }}</span>
                    <span v-if="preset.scaleExponent > 0" style="font-family:monospace;">{{ formatZoom(preset.scaleExponent) }}</span>
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.65em;">
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPresets">
              Import
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small is-light" @click="exportSelectedNavigationPreset" :disabled="!selectedNavPreset">
              Export Selected Navigation
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small" @click="exportFavoriteNavigationPresets" :disabled="favoritePresets.length === 0">
              Export Favorites
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Presets tab -->
    <div v-else-if="activeTab === 'presets'">
      <div class="mb-3">
        <label class="label">Saved presets</label>
        <button
          class="button is-small favorite-filter"
          :class="{ 'is-active': showOnlyFavoritePresets }"
          type="button"
          :aria-pressed="showOnlyFavoritePresets"
          @click="showOnlyFavoritePresets = !showOnlyFavoritePresets"
        >
          <span class="favorite-filter-heart">♥</span>
          <span>Favorites</span>
        </button>
        <!-- Dropdown enrichie Bulma -->
        <div class="dropdown" :class="{ 'is-active': showPresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPresetDropdown = !showPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentPresetThumbnail" :src="currentPresetThumbnail" alt="thumbnail" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ currentPresetMeta?.name || (selectedPreset ? formatPresetDate(currentPresetMeta?.date ?? '') : 'Choose a preset...') }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in visiblePresets" :key="preset.id" class="dropdown-item favorite-row"
                @click.prevent="selectPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedPreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': preset.favorite }"
                  type="button"
                  :title="preset.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!preset.favorite"
                  @click.stop.prevent="togglePresetFavorite(preset.id)"
                >
                  <span class="favorite-heart" aria-hidden="true">♥</span>
                </button>
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="thumbnail"
                  style="height:63px; width:112px; object-fit:cover; border-radius:4px; background:#aaa; flex-shrink:0; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:0.15em;">
                  <span v-if="preset.name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; font-weight:500;">{{ preset.name }}</span>
                  <span style="font-size:0.78em; color:#666; display:flex; gap:0.6em;">
                    <span>{{ formatPresetDate(preset.date) }}</span>
                    <span v-if="preset.scaleExponent > 0" style="font-family:monospace;">{{ formatZoom(preset.scaleExponent) }}</span>
                  </span>
                </div>
                <button class="delete is-small" style="flex-shrink:0;"
                  @click.stop.prevent="deletePresetById(preset.id)"
                  title="Delete this preset"></button>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.8em;">
          <div class="control is-expanded">
            <input class="input" v-model="presetName" type="text" placeholder="Name (optional)..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePreset">Save</button>
          </div>
        </div>

        <!-- Import / Export Presets -->
        <hr class="section-sep"/>
        <label class="label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPresets" :disabled="presets.length === 0">
              Export
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small is-light" @click="exportSelectedPreset" :disabled="!selectedPreset">
              Export Selected
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small" @click="exportFavoritePresets" :disabled="favoritePresets.length === 0">
              Export Favorites
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPresets">
              Import
            </button>
            <input ref="presetFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPresets" />
          </div>
          <div class="control">
            <button class="button is-danger is-small is-light" @click="deleteAllPresets" :disabled="presets.length === 0">
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Palettes tab -->
    <div v-else-if="activeTab === 'palettes'">
      <div class="palette-top-controls">
        <button
          class="button is-small palette-animate-toggle"
          :class="{ 'is-active': model.activateAnimate }"
          type="button"
          :aria-pressed="model.activateAnimate"
          title="Animate palette offset"
          @click="model.activateAnimate = !model.activateAnimate"
        >
          <span class="icon is-small">
            <i :class="model.activateAnimate ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i>
          </span>
          <span>Drift</span>
          <span class="palette-toggle-state">{{ model.activateAnimate ? 'On' : 'Off' }}</span>
        </button>

        <button
          class="button is-small palette-animate-toggle"
          :class="{ 'is-active': model.paletteMirror }"
          type="button"
          :aria-pressed="model.paletteMirror"
          title="Mirror palette repetition"
          @click="model.paletteMirror = !model.paletteMirror"
        >
          <span class="icon is-small">
            <i class="fas fa-arrows-left-right" aria-hidden="true"></i>
          </span>
          <span>Mirror</span>
          <span class="palette-toggle-state">{{ model.paletteMirror ? 'On' : 'Off' }}</span>
        </button>

        <div class="palette-compact-control">
          <span class="palette-compact-label">Length</span>
          <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="sliderPalettePeriod" />
          <span class="palette-compact-value">{{ formatPalettePeriod(model.palettePeriod) }}</span>
        </div>

        <div class="palette-compact-control">
          <span class="palette-compact-label">Offset</span>
          <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="model.paletteOffset" />
          <span class="palette-compact-value">{{ (model.paletteOffset * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <div class="mb-3">
        <PaletteEditor
          ref="paletteEditorRef"
          :color-stops="model.colorStops"
          :interpolation-mode="model.interpolationMode"
          :picker-mode="props.pickerMode"
          :tile-texture-url="activeBlobUrl"
          :skybox-texture-url="activeSkyboxBlobUrl"
          :tessellation-level="model.tessellationLevel"
          :displacement-amount="model.displacementAmount"
          :ambient-occlusion-strength="model.ambientOcclusionStrength"
          :micro-bump-strength="model.microBumpStrength"
          :clearcoat-strength="model.clearcoatStrength"
          :subsurface-strength="model.subsurfaceStrength"
          :relief-depth="model.reliefDepth"
          :local-shadow-strength="model.localShadowStrength"
          :varnish-strength="model.varnishStrength"
          :engine-device="engine?.device"
          :engine-tile-texture="engine?.tileTexture"
          :engine-skybox-texture="engine?.skyboxTexture"
          :engine-webcam-texture="engine?.webcamTileTexture"
          v-model:apply-to-all="applyToAll"
          @toggle-picker="emit('toggle-picker')"
          @invert="invertPalette"
          @negate="negatePalette"
          @duplicate="duplicatePalette"
          @mirror="mirrorPalette"
          @distribute="distributeEvenly"
          @clear="clearPalette"
        />
      </div>

      <hr class="section-sep"/>

      <!-- ═══ COLOR ═══ -->
      <label class="gfx-section-title">Color</label>

      <div class="palette-control-row">
        <label class="palette-control-label">Interpolation</label>
        <div class="field has-addons palette-button-group">
          <p v-for="mode in interpolationModes" :key="mode.key" class="control">
            <button
              class="button is-small"
              :class="model.interpolationMode === mode.key ? 'is-link' : 'is-light'"
              @click="model.interpolationMode = mode.key"
            >
              {{ mode.label }}
            </button>
          </p>
        </div>
      </div>

      <div class="palette-control-row">
        <label class="palette-control-label">Hue Shift</label>
        <input class="slider is-fullwidth" type="range" min="-180" max="180" step="1"
          :value="hslHueShift"
          @input="onHslHueInput(Number(($event.target as HTMLInputElement).value))" />
        <span class="palette-control-value">{{ hslHueShift }}°</span>
      </div>
      <div class="palette-control-row">
        <label class="palette-control-label">Saturation Shift</label>
        <input class="slider is-fullwidth" type="range" min="-100" max="100" step="1"
          :value="satShift"
          @input="onSatInput(Number(($event.target as HTMLInputElement).value))" />
        <span class="palette-control-value">{{ satShift }}</span>
      </div>
      <div class="palette-control-row">
        <label class="palette-control-label">Lightness Shift</label>
        <input class="slider is-fullwidth" type="range" min="-100" max="100" step="1"
          :value="lumShift"
          @input="onLumInput(Number(($event.target as HTMLInputElement).value))" />
        <span class="palette-control-value">{{ lumShift }}</span>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ MOTION ═══ -->
      <label class="gfx-section-title">Motion</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Drift Speed</span>
        <input class="slider" type="range" min="0.1" max="5" step="0.1" v-model.number="model.animationSpeed" />
        <span class="gfx-slider-value">&times;{{ (model.animationSpeed ?? 1.0).toFixed(1) }}</span>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ FRACTAL SURFACE ═══ -->
      <label class="gfx-section-title">Fractal Surface</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Relief Depth</span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.reliefDepth" />
        <span class="gfx-slider-value">{{ (model.reliefDepth ?? 1).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Relief Occlusion</span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.localShadowStrength" />
        <span class="gfx-slider-value">{{ (model.localShadowStrength ?? 0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Ambient Occlusion</span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.ambientOcclusionStrength" />
        <span class="gfx-slider-value">{{ (model.ambientOcclusionStrength ?? 0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Light Direction</span>
        <input class="slider" type="range" min="0" max="6.283" step="0.01" v-model.number="model.lightAngle" />
        <span class="gfx-slider-value">{{ (model.lightAngle ?? 3.927).toFixed(2) }} rad</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Fine Bump</span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.microBumpStrength" />
        <span class="gfx-slider-value">{{ (model.microBumpStrength ?? 0).toFixed(2) }}</span>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ MATERIAL RESPONSE ═══ -->
      <label class="gfx-section-title">Material Response</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Clearcoat</span>
        <input class="slider" type="range" min="0" max="10" step="0.05" v-model.number="model.clearcoatStrength" />
        <span class="gfx-slider-value">{{ (model.clearcoatStrength ?? 0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Varnish Reflection</span>
        <input class="slider" type="range" min="0" max="10" step="0.01" v-model.number="model.varnishStrength" />
        <span class="gfx-slider-value">{{ (model.varnishStrength ?? 1.0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Subsurface Glow</span>
        <input class="slider" type="range" min="0" max="10" step="0.05" v-model.number="model.subsurfaceStrength" />
        <span class="gfx-slider-value">{{ (model.subsurfaceStrength ?? 0).toFixed(2) }}</span>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ IMAGE LAYER ═══ -->
      <label class="gfx-section-title">Image Layer</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Image Scale</span>
        <input class="slider" type="range" min="0.1" max="10" step="0.1" v-model.number="model.tessellationLevel" />
        <span class="gfx-slider-value">{{ model.tessellationLevel }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Image Displacement</span>
        <input class="slider" type="range" min="0" max="0.1" step="0.001" v-model.number="model.displacementAmount" />
        <span class="gfx-slider-value">&times;{{ (model.displacementAmount ?? 1.0).toFixed(3) }}</span>
      </div>
      <!-- Image texture library (compact) -->
      <div class="mb-3 compact-library">
        <label class="palette-library-label">Image Texture</label>
        <div class="dropdown" :class="{ 'is-active': showTextureDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth is-small" @click="showTextureDropdown = !showTextureDropdown" aria-haspopup="true" aria-controls="dropdown-menu-textures" type="button">
              <span style="display:flex; align-items:center; min-height:28px;">
                <img v-if="currentTextureThumbnail" :src="currentTextureThumbnail" alt="thumbnail" style="height:24px; width:42px; object-fit:cover; margin-right:6px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.88em;">{{ selectedTexture || 'Image texture...' }}</span>
                <span class="icon is-small" style="margin-left:4px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-textures" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:350px; overflow-y:auto;">
              <a v-for="tex in textures" :key="tex.name" class="dropdown-item"
                @click.prevent="selectTextureFromDropdown(tex)"
                :class="{ 'is-active': selectedTexture === tex.name }"
                style="display:flex; align-items:center; gap:0.5em;">
                <img v-if="tex.thumbnail" :src="tex.thumbnail" alt="thumbnail"
                  style="height:48px; width:85px; object-fit:cover; border-radius:4px; background:#aaa; box-shadow:0 1px 4px rgba(0,0,0,0.12);"/>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.95em;">{{ tex.name }}</span>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.5em;">
          <div class="control is-expanded">
            <input class="input is-small" v-model="textureName" type="text" placeholder="Image texture name..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
              @keyup.enter="renameAndSaveTexture"
            />
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportTexture">Import</button>
            <input ref="textureFileInput" type="file" accept="image/*" style="display:none;" @change="importTexture" />
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deleteTexture" :disabled="!textureName || BUILT_IN_TEXTURE_NAMES.has(textureName)">Delete</button>
          </div>
        </div>
      </div>

      <hr class="section-sep"/>

      <!-- Environment texture library (same storage as material textures) -->
      <label class="gfx-section-title">Environment</label>
      <div class="mb-3 compact-library">
        <label class="palette-library-label">Environment Map</label>
        <div class="dropdown" :class="{ 'is-active': showSkyboxDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth is-small" @click="showSkyboxDropdown = !showSkyboxDropdown" aria-haspopup="true" aria-controls="dropdown-menu-skybox" type="button">
              <span style="display:flex; align-items:center; min-height:28px;">
                <img v-if="currentSkyboxThumbnail" :src="currentSkyboxThumbnail" alt="thumbnail" style="height:24px; width:42px; object-fit:cover; margin-right:6px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.88em;">{{ selectedSkyboxTexture || 'Environment map...' }}</span>
                <span class="icon is-small" style="margin-left:4px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-skybox" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:350px; overflow-y:auto;">
              <a v-for="tex in textures" :key="'skybox-' + tex.name" class="dropdown-item"
                @click.prevent="selectSkyboxFromDropdown(tex)"
                :class="{ 'is-active': selectedSkyboxTexture === tex.name }"
                style="display:flex; align-items:center; gap:0.5em;">
                <img v-if="tex.thumbnail" :src="tex.thumbnail" alt="thumbnail"
                  style="height:48px; width:85px; object-fit:cover; border-radius:4px; background:#aaa; box-shadow:0 1px 4px rgba(0,0,0,0.12);"/>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.95em;">{{ tex.name }}</span>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.5em;">
          <div class="control is-expanded">
            <input class="input is-small" v-model="skyboxName" type="text" placeholder="Environment map name..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
              @keyup.enter="renameAndSaveSkyboxTexture"
            />
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportSkybox">Import</button>
            <input ref="skyboxFileInput" type="file" accept="image/*" style="display:none;" @change="importSkyboxTexture" />
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deleteSkyboxTexture" :disabled="!skyboxName || BUILT_IN_TEXTURE_NAMES.has(skyboxName)">Delete</button>
          </div>
        </div>
      </div>

      <hr class="section-sep"/>

      <!-- Palette library -->
      <label class="gfx-section-title">Palette Library</label>
      <div class="mb-3">
        <label class="palette-library-label">Load From Preset</label>
        <p class="palette-library-hint">Applies colors, interpolation, cycle mapping, and material look from a preset.</p>
        <button
          class="button is-small favorite-filter"
          :class="{ 'is-active': showOnlyFavoritePalettePresets }"
          type="button"
          :aria-pressed="showOnlyFavoritePalettePresets"
          @click="showOnlyFavoritePalettePresets = !showOnlyFavoritePalettePresets"
        >
          <span class="favorite-filter-heart">♥</span>
          <span>Favorites</span>
        </button>
        <div class="dropdown" :class="{ 'is-active': showPalettePresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPalettePresetDropdown = !showPalettePresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-palette-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentPalettePresetThumbnail" :src="currentPalettePresetThumbnail" alt="thumbnail" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ currentPalettePresetMeta?.name || (selectedPalettePreset ? formatPresetDate(currentPalettePresetMeta?.date ?? '') : 'Choose a preset...') }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-palette-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in visiblePalettePresets" :key="preset.id" class="dropdown-item favorite-row"
                @click.prevent="selectPalettePresetFromDropdown(preset)"
                :class="{ 'is-active': selectedPalettePreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': preset.favorite }"
                  type="button"
                  :title="preset.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!preset.favorite"
                  @click.stop.prevent="togglePresetFavorite(preset.id)"
                >
                  <span class="favorite-heart" aria-hidden="true">♥</span>
                </button>
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="thumbnail"
                  style="height:63px; width:112px; object-fit:cover; border-radius:4px; background:#aaa; flex-shrink:0; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:0.15em;">
                  <span v-if="preset.name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; font-weight:500;">{{ preset.name }}</span>
                  <span style="font-size:0.78em; color:#666; display:flex; gap:0.6em;">
                    <span>{{ formatPresetDate(preset.date) }}</span>
                    <span v-if="preset.scaleExponent > 0" style="font-family:monospace;">{{ formatZoom(preset.scaleExponent) }}</span>
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <hr class="section-sep"/>

      <div class="mb-3">
        <label class="palette-library-label">Saved Palettes</label>
        <button
          class="button is-small favorite-filter"
          :class="{ 'is-active': showOnlyFavoritePalettes }"
          type="button"
          :aria-pressed="showOnlyFavoritePalettes"
          @click="showOnlyFavoritePalettes = !showOnlyFavoritePalettes"
        >
          <span class="favorite-filter-heart">♥</span>
          <span>Favorites</span>
        </button>
        <!-- Dropdown enrichie Bulma -->
        <div class="dropdown" :class="{ 'is-active': showPaletteDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPaletteDropdown = !showPaletteDropdown" aria-haspopup="true" aria-controls="dropdown-menu-palettes" type="button">
              <span style="display:flex; align-items:center; flex-direction:column; gap:0.5em; padding:0.4em 0;">
                <img v-if="currentPaletteThumbnail" :src="currentPaletteThumbnail" alt="thumbnail" style="height:24px; width:100%; max-width:280px; object-fit:cover; border-radius:3px; background:#888; box-shadow:0 1px 3px rgba(0,0,0,0.2);" />
                <span style="width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; justify-content:center; gap:0.3em;">
                   <span style="flex:1 1 auto; text-align:center;">{{ paletteName || 'Choose a palette...' }}</span>
                  <span class="icon is-small">
                    <i class="fas fa-angle-down" aria-hidden="true"></i>
                  </span>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-palettes" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="palette in visiblePalettes" :key="palette.name" class="dropdown-item favorite-row"
                @click.prevent="selectPaletteFromDropdown(palette)"
                :class="{ 'is-active': selectedPalette === palette.name }"
                style="display:flex; flex-direction:column; gap:0.5em; padding:0.75em;">
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': palette.favorite }"
                  type="button"
                  :title="palette.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!palette.favorite"
                  @click.stop.prevent="togglePaletteFavorite(palette.name)"
                >
                  <span class="favorite-heart" aria-hidden="true">♥</span>
                </button>
                <img v-if="palette.thumbnail" :src="palette.thumbnail" alt="thumbnail"
                  style="height:32px; width:100%; object-fit:cover; border-radius:4px; background:#aaa; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; text-align:center;">{{ palette.name }}</span>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.8em;">
          <div class="control is-expanded">
            <input class="input" v-model="paletteName" type="text" placeholder="Name..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePalette">Save</button>
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deletePalette" :disabled="!paletteName">Delete</button>
          </div>
        </div>

        <!-- Import / Export Palettes -->
        <hr class="section-sep"/>
        <label class="palette-library-label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPalettes" :disabled="palettes.length === 0">
              Export
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small is-light" @click="exportSelectedPalette" :disabled="!selectedPalette">
              Export Selected
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small" @click="exportFavoritePalettes" :disabled="favoritePalettes.length === 0">
              Export Favorites
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPalettes">
              Import
            </button>
            <input ref="paletteFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPalettes" />
          </div>
          <div class="control">
            <button class="button is-danger is-small is-light" @click="deleteAllPalettes" :disabled="palettes.length === 0">
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance/Graphics tab -->
    <div v-else-if="activeTab === 'performance'" class="graphics-tab">

      <!-- ═══ CALCUL ═══ -->
      <label class="gfx-section-title">Computation</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Mu</span>
        <input class="slider" type="range" min="0" max="5" step="0.01" v-model="muSlider" />
        <span class="gfx-slider-value">{{ (model.mu ?? 1.0).toFixed(1) }}</span>
        <button class="button is-small is-light" style="padding: 0 6px; height: 22px; font-size: 0.75em;" @click="model.mu = 4" title="Mu = 4">4</button>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Epsilon</span>
        <input class="slider" type="range" min="-30" max="0" step="0.01" v-model="epsilonSlider" />
        <span class="gfx-slider-value">{{ (model.epsilon ?? 1e-8).toExponential(1) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Approximation</span>
        <div class="buttons has-addons toggle-buttons" style="margin-bottom:0;">
          <button
            class="button is-small"
            :class="model.approximationMode !== 'bla' ? 'is-link' : 'is-light'"
            @click="model.approximationMode = 'perturbation'"
          >
            Perturbation
          </button>
          <button
            class="button is-small"
            :class="model.approximationMode === 'bla' ? 'is-link' : 'is-light'"
            @click="model.approximationMode = 'bla'"
          >
            BLA
          </button>
        </div>
        <span class="gfx-slider-value">{{ model.approximationMode === 'bla' ? 'BLA' : 'Classic' }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Stripe Frequency</span>
        <input class="slider" type="range" min="1" max="32" step="1" v-model.number="model.stripeFrequency" />
        <span class="gfx-slider-value">{{ model.stripeFrequency ?? 8 }}</span>
      </div>
      <!-- ═══ PERFORMANCE ═══ -->
      <label class="gfx-section-title">Performance</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Resolution</span>
        <input class="slider" type="range" min="0.125" max="2" step="0.125" v-model.number="model.dprMultiplier" />
        <span class="gfx-slider-value">DPR &times;{{ model.dprMultiplier?.toFixed(2) ?? '1.00' }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Iterations</span>
        <input class="slider" type="range" min="-2" max="1" step="0.01" v-model="maxIterMultSlider" />
        <span class="gfx-slider-value">&times;{{ (model.maxIterationMultiplier ?? 1.0).toPrecision(3) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Target FPS</span>
        <input class="slider" type="range" min="10" max="60" step="1" v-model.number="model.targetFps" />
        <span class="gfx-slider-value">{{ model.targetFps ?? 60 }} fps</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Max GPU load</span>
        <input class="slider" type="range" min="0.25" max="4" step="0.25" v-model.number="model.gpuLoadMultiplier" />
        <span class="gfx-slider-value">&times;{{ (model.gpuLoadMultiplier ?? 1.0).toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mb-3 {
  margin-bottom: 1.2em;
}
.math-display {
  color: #000;
  font-family: 'STIX Two Math', 'Cambria Math', 'Latin Modern Math', 'Times New Roman', serif;
  font-size: 1.15em;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 0.3em;
}
.math-i {
  color: #000;
  font-style: italic;
  margin: 0 0.1em;
}
.compact-label {
  font-weight: bold;
  margin-bottom: 0.2em;
}
.compact-input, .compact-select {
  font-size: 0.9em;
}
.preview-mandelbrot-thumb img {
  margin-top: 0.1em;
  margin-bottom: 0.1em;
  border: 1px solid #bbb;
}
.section-sep {
  border: none;
  border-top: 1px solid #B8B8B8;
  margin: 0.9em 0 0.75em 0;
}
.toggle-buttons {
  flex-wrap: wrap;
  gap: 0.4em;
}
.compact-buttons {
  margin-bottom: 0.45em;
}
.toggle-buttons .button {
  margin-bottom: 0 !important;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

/* ── Force dark text across all tabs ── */
:deep(.label),
:deep(.checkbox),
:deep(.help),
:deep(.control-label),
:deep(.title),
:deep(.subtitle) {
  color: #111 !important;
}

/* ── Graphics tab layout ── */
.graphics-tab {
  color: #111;
}
.gfx-section-title {
  display: block;
  font-weight: 700;
  font-size: 0.92em;
  color: #111;
  margin-bottom: 0.45em;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.gfx-hint {
  font-size: 0.82em;
  color: #555;
  margin-bottom: 0.4em;
  line-height: 1.3;
}
.gfx-slider-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.32em;
}
.gfx-slider-row input[type="range"] {
  flex: 1 1 auto;
  min-width: 0;
}
.gfx-slider-label {
  flex: 0 0 auto;
  min-width: 7.4em;
  font-size: 0.88em;
  color: #222;
  font-weight: 500;
}
.gfx-slider-value {
  flex: 0 0 auto;
  min-width: 4em;
  text-align: right;
  font-size: 0.84em;
  color: #333;
  font-variant-numeric: tabular-nums;
}
.palette-control-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.32em;
}
.palette-control-row input[type="range"] {
  flex: 1 1 auto;
  min-width: 0;
}
.palette-control-label {
  flex: 0 0 auto;
  min-width: 7.4em;
  font-size: 0.88em;
  color: #222;
  font-weight: 500;
}
.palette-control-value {
  flex: 0 0 auto;
  min-width: 4.4em;
  text-align: right;
  font-family: monospace;
  font-size: 0.84em;
  color: #333;
  font-variant-numeric: tabular-nums;
}
.palette-top-controls {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.45em 0.65em;
  margin-bottom: 0.75em;
}
.palette-animate-toggle {
  justify-content: flex-start;
  gap: 0.35em;
  min-width: 7.6em;
  height: 28px;
  border-color: #b8b8b8;
  color: #222;
  background: #f3f3f3;
}
.palette-animate-toggle.is-active {
  border-color: #3273dc;
  color: #fff;
  background: #3273dc;
}
.palette-toggle-state {
  margin-left: auto;
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.78;
}
.palette-compact-control {
  display: grid;
  grid-template-columns: auto minmax(5.5em, 1fr) 4.6em;
  align-items: center;
  gap: 0.38em;
  min-width: 0;
}
.palette-compact-control input[type="range"] {
  min-width: 0;
}
.palette-compact-label {
  font-size: 0.78em;
  font-weight: 600;
  color: #222;
  line-height: 1;
}
.palette-compact-value {
  font-family: monospace;
  font-size: 0.78em;
  color: #333;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
@media (max-width: 520px) {
  .palette-top-controls {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .palette-compact-control {
    grid-column: 1 / -1;
  }
}
.palette-button-group {
  flex: 1 1 auto;
  min-width: 0;
  margin-bottom: 0 !important;
  flex-wrap: wrap;
}
.compact-library {
  margin-top: 0.55em;
  margin-bottom: 0.8em;
}
.palette-library-label {
  display: block;
  font-size: 0.86em;
  font-weight: 600;
  color: #222;
  margin-bottom: 0.32em;
}
.palette-library-hint {
  font-size: 0.8em;
  color: #555;
  margin-bottom: 0.45em;
  line-height: 1.25;
}
.favorite-row {
  position: relative;
}
.favorite-button {
  position: absolute;
  top: 50%;
  right: 0.7em;
  width: 1.9em;
  height: 1.9em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  cursor: pointer;
  z-index: 2;
}
.favorite-heart {
  color: transparent;
  font-size: 1.35em;
  line-height: 1;
  -webkit-text-stroke: 1.6px #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
}
.favorite-button.is-favorite {
  color: #ec3d7a;
}
.favorite-button:hover {
  color: #ec3d7a;
}
.favorite-button.is-favorite .favorite-heart,
.favorite-button:hover .favorite-heart {
  color: #ec3d7a;
  -webkit-text-stroke-color: #ec3d7a;
}
.favorite-filter {
  margin-bottom: 0.55em;
  gap: 0.35em;
  color: #333;
}
.favorite-filter.is-active {
  border-color: #ec3d7a;
  color: #ec3d7a;
}
.favorite-filter-heart {
  color: transparent;
  -webkit-text-stroke: 1.2px currentColor;
  line-height: 1;
}
.favorite-filter.is-active .favorite-filter-heart {
  color: #ec3d7a;
  -webkit-text-stroke-color: #ec3d7a;
}
</style>
