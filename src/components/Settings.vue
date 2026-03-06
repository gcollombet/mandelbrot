<script setup lang="ts">
import {computed, onMounted, ref, toRaw, watch} from 'vue';
import type {MandelbrotParams} from "../Mandelbrot.ts";
import type { EffectFieldName } from '../ColorStop.ts';
import { COLOR_STOP_DEFAULTS } from '../ColorStop.ts';
import PaletteEditor from './PaletteEditor.vue';
import { Palette } from '../Palette.ts';
import { lch as d3lch, rgb as d3rgb, hsl as d3hsl } from 'd3-color';
import type { InterpolationMode } from '../Mandelbrot.ts';
import defaultPresetsJson from '../assets/default-presets.json';
import defaultPalettesJson from '../assets/default-palettes.json';
import coloredTilesUrl from '../assets/colored_tiles.webp';
import goldUrl from '../assets/gold.jpg';
import zelligeUrl from '../assets/zellige.webp';
import bronzeUrl from '../assets/bronze.webp';
import mercureUrl from '../assets/mercure.webp';
import honeyUrl from '../assets/honey.webp';
import waterUrl from '../assets/water.png';

/** Built-in textures: single source of truth for bootstrap, deletion protection, and UI. */
const BUILT_IN_TEXTURES: ReadonlyArray<{ name: string; url: string }> = [
  { name: 'Colored Tiles', url: coloredTilesUrl },
  { name: 'Gold', url: goldUrl },
  { name: 'Zellige', url: zelligeUrl },
  { name: 'Bronze', url: bronzeUrl },
  { name: 'Mercure', url: mercureUrl },
  { name: 'Honey', url: honeyUrl },
  { name: 'Water', url: waterUrl },
] as const;
const BUILT_IN_TEXTURE_NAMES: ReadonlySet<string> = new Set(BUILT_IN_TEXTURES.map(t => t.name));
import {
  getAllTextureEntries,
  getTextureBlob,
  saveTextureEntry,
  deleteTextureEntry,
  renameTextureEntry,
  migrateFromLocalStorage,
} from '../textureStore';
import type { TextureMetadata } from '../textureStore';
import {
  getAllPresetEntries,
  getPresetById,
  savePresetEntry,
  deletePresetEntry,
  getPresetCount,
   migratePresetsFromLocalStorage,
  migratePalettePeriod,
  computeScaleExponent,
} from '../presetStore';
import type { PresetMetadata, PresetRecord } from '../presetStore';

import type { Engine } from '../Engine.ts';
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
    antialiasLevel: 1,
    tessellationLevel: 2,
    shadingLevel: 1,
    lightAngle: 3.927,
    displacementAmount: 0.01,
    specularPower: 4,
    activatePalette: true,
    activateSkybox: false,
    activateTessellation: false,
    activateWebcam: false,
    activateShading: true,
    activateZebra: false,
     activateSmoothness: true,
    activateAnimate: false,
    dprMultiplier: 1.0,
    maxIterationMultiplier: 1.0,
    interpolationMode: 'lab',
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
const palettes = ref<{ name: string, colorStops: any[], thumbnail?: string, date?: string }[]>([]);
const selectedPalette = ref('');
const showPaletteDropdown = ref(false);

async function deletePresetById(id: number) {
  const meta = presets.value.find(p => p.id === id);
  const label = meta?.name || formatPresetDate(meta?.date ?? '');
  if (!window.confirm(`Supprimer le preset "${label}" ? Cette action est irréversible.`)) return;
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

const PALETTE_STORAGE_KEY = 'mandelbrot_palettes';

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

function loadPalettes() {
  const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
  if (raw) {
    try {
      palettes.value = JSON.parse(raw);
      return;
    } catch {}
  }
  // Bootstrap from bundled defaults when localStorage is empty
  if (defaultPalettesJson.length > 0) {
    palettes.value = structuredClone(defaultPalettesJson) as typeof palettes.value;
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
  }
}

async function savePalette() {
  if (!paletteName.value.trim()) return;
  let thumbnail: string | undefined = undefined;
  let now = new Date().toISOString();
  try {
    thumbnail = generatePaletteThumbnail(model.value.colorStops, model.value.interpolationMode);
  } catch { /* ignore errors, no thumbnail */ }
  const palette = {
    name: paletteName.value.trim(),
    colorStops: structuredClone(toRaw(model.value.colorStops)),
    thumbnail,
    date: now
  };
  const idx = palettes.value.findIndex(p => p.name === palette.name);
  if (idx >= 0) {
    palettes.value[idx] = palette;
  } else {
    palettes.value.push(palette);
  }
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
  paletteName.value = '';
}

function selectPalette(name: string) {
  const palette = palettes.value.find(p => p.name === name);
  if (palette) {
    selectedPalette.value = name;
    paletteName.value = palette.name;
    model.value.colorStops = structuredClone(toRaw(palette.colorStops));
  }
}

function selectPaletteFromDropdown(palette: { name: string, colorStops: any[], thumbnail?: string, date?: string }) {
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
  }
}

async function selectPalettePresetFromDropdown(preset: PresetMetadata) {
  await selectPaletteFromPreset(preset.id);
  showPalettePresetDropdown.value = false;
}

// Graphics tab: extract all rendering params (except location & perf) from a preset
const selectedGraphicsPreset = ref<number | null>(null);
const showGraphicsPresetDropdown = ref(false);

const currentGraphicsPresetMeta = computed(() => presets.value.find(p => p.id === selectedGraphicsPreset.value));
const currentGraphicsPresetThumbnail = computed(() => currentGraphicsPresetMeta.value?.thumbnail);

/** Location fields — not copied in graphics extraction */
const LOCATION_FIELDS: (keyof MandelbrotParams)[] = ['cx', 'cy', 'scale', 'angle'];
/** Performance fields — never copied from presets */
const PERF_FIELDS: (keyof MandelbrotParams)[] = ['dprMultiplier', 'maxIterationMultiplier', 'antialiasLevel', 'targetFps', 'gpuLoadMultiplier'];

async function selectGraphicsFromPreset(id: number) {
  const record = await getCachedPreset(id);
  if (!record) return;
  selectedGraphicsPreset.value = id;
  const excluded = new Set<string>([...LOCATION_FIELDS, ...PERF_FIELDS]);
  const src = record.value;
  for (const key of Object.keys(src) as (keyof MandelbrotParams)[]) {
    if (excluded.has(key)) continue;
    if (key === 'colorStops') {
      model.value.colorStops = structuredClone(toRaw(src.colorStops));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (model.value as any)[key] = (src as any)[key];
    }
  }
}

async function selectGraphicsPresetFromDropdown(preset: PresetMetadata) {
  await selectGraphicsFromPreset(preset.id);
  showGraphicsPresetDropdown.value = false;
}

function deletePalette() {
  const name = paletteName.value.trim();
  if (!name) return;
  if (window.confirm(`Supprimer la palette "${name}" ? Cette action est irréversible.`)) {
    const idx = palettes.value.findIndex(p => p.name === name);
    if (idx >= 0) {
      palettes.value.splice(idx, 1);
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
      selectedPalette.value = '';
      paletteName.value = '';
    }
  }
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
    model.value = saved;
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

// Slider light angle : degrees (0-360) <-> radians
const lightAngleSlider = computed({
  get: () => (((model.value.lightAngle ?? 3.927) * 180 / Math.PI) % 360 + 360) % 360,
  set: (deg: number) => {
    model.value.lightAngle = (deg % 360) * Math.PI / 180;
  }
});

// =====================================================
// Sync UI toggle/slider values → per-stop effect fields
// =====================================================
// When a global toggle or slider changes, propagate the value to ALL stops.
// This is the bridge between legacy UI controls and the per-stop palette texture.

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
  // Note: tessellationLevel and displacementAmount are now global uniforms, not per-stop.
  if (m.shadingLevel !== undefined)       fillMissingEffectOnStops('shadingLevel',       m.shadingLevel);
  if (m.specularPower !== undefined)      fillMissingEffectOnStops('specularPower',      m.specularPower);
  if (m.lightAngle !== undefined)         fillMissingEffectOnStops('lightAngle',         m.lightAngle);
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
      if (val === undefined) return;
      setEffectOnAllStops(effectField, val ? 1.0 : 0.0);
    },
  );
}

// ── Continuous sliders → stop parameters ──
// Map: legacy slider field → stop effect field name
// Note: tessellationLevel and displacementAmount are now global uniforms, not per-stop.
const SLIDER_TO_EFFECT: Array<[keyof MandelbrotParams, EffectFieldName]> = [
  ['shadingLevel',       'shadingLevel'],
  ['specularPower',      'specularPower'],
  ['lightAngle',         'lightAngle'],
];

for (const [sliderField, effectField] of SLIDER_TO_EFFECT) {
  watch(
    () => model.value[sliderField] as number | undefined,
    (val) => {
      if (val === undefined) return;
      setEffectOnAllStops(effectField, val);
    },
  );
}

// When colorStops is replaced wholesale (palette selection, LCH generation, etc.),
// stamp the current legacy toggle/slider values onto all new stops.
// `immediate: true` also handles the initial mount.
watch(
  () => model.value.colorStops,
  () => { syncAllLegacyToStops(); },
  { immediate: true },
);

onMounted(async () => {
  await loadPresets();
  loadPalettes();
  await loadTextures();
  // Apply persisted texture to engine if it's not the default
  if (selectedTexture.value !== 'Gold' && props.engine) {
    try {
      await applyTextureToEngine(selectedTexture.value, props.engine);
    } catch (e) {
      console.warn('Failed to restore tile texture:', e);
    }
  }
});

// Apply persisted texture when engine becomes available (may arrive after mount)
watch(() => props.engine, async (engine) => {
  if (engine && selectedTexture.value !== 'Gold') {
    try {
      await applyTextureToEngine(selectedTexture.value, engine);
    } catch (e) {
      console.warn('Failed to restore tile texture:', e);
    }
  }
});

const currentPaletteObj = computed(() => palettes.value.find(p => p.name === selectedPalette.value));
const currentPaletteThumbnail = computed(() => currentPaletteObj.value?.thumbnail);

watch([() => props.activeTab, () => props.engine], async ([tab]) => {
  if (tab === 'navigation') {
    await refreshNavigationPreview();
  }
}, { immediate: true });

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

const presetFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPresets() {
  presetFileInput.value?.click();
}
function importPresets(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result as string);
      if (Array.isArray(imported)) {
        for (const preset of imported) {
          if (!preset.value) continue;
          await savePresetEntry(
            preset.value,
            preset.thumbnail ?? '',
            preset.name ?? '',
            preset.date,
          );
        }
        presets.value = await getAllPresetEntries();
      }
    } catch {
      window.alert('Format de fichier invalide.');
    }
  };
  reader.readAsText(file);
  // Reset pour pouvoir réimporter le même fichier
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

const paletteFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPalettes() {
  paletteFileInput.value?.click();
}
function importPalettes(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result as string);
      if (Array.isArray(imported)) {
        for (const palette of imported) {
          if (!palette.name || !palette.colorStops) continue;
          const idx = palettes.value.findIndex(p => p.name === palette.name);
          if (idx >= 0) {
            palettes.value[idx] = palette;
          } else {
            palettes.value.push(palette);
          }
        }
        localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
      }
    } catch {
      window.alert('Format de fichier invalide.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// =====================================================
// LCH Global Adjustment Sliders (perceptually uniform)
// =====================================================
// Stores the baseline colorStops for LCH adjustments
const lchBaseStops = ref<{ color: string, position: number }[] | null>(null);
const hueShift = ref(0);    // Hue rotation in degrees (-180..180)
const chromaShift = ref(0);  // Chroma shift (-100..100)
const lightShift = ref(0);   // Lightness shift (-100..100)
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
  hueShift.value = 0;
  chromaShift.value = 0;
  lightShift.value = 0;
  satShift.value = 0;
  lumShift.value = 0;
  hslHueShift.value = 0;
}

function onHueInput(val: number) {
  ensureLchBase();
  hueShift.value = val;
  applyAllShifts();
}

function onChromaInput(val: number) {
  ensureLchBase();
  chromaShift.value = val;
  applyAllShifts();
}

function onLightInput(val: number) {
  ensureLchBase();
  lightShift.value = val;
  applyAllShifts();
}

function applyAllShifts() {
  if (!lchBaseStops.value) return;
  model.value.colorStops = lchBaseStops.value.map(stop => {
    const rgbC = d3rgb(stop.color);
    if (rgbC === null || rgbC === undefined) return { ...stop };

    // Apply LCH shifts first
    const lch = d3lch(rgbC);
    const baseL = isNaN(lch.l) ? 0 : lch.l;
    const baseC = isNaN(lch.c) ? 0 : lch.c;
    const baseH = isNaN(lch.h) ? 0 : lch.h;
    let l = baseL + lightShift.value;
    l = Math.max(0, Math.min(150, l));
    let c = baseC + chromaShift.value;
    c = Math.max(0, c);
    let h = baseH + hueShift.value;
    h = ((h % 360) + 360) % 360;
    // If original was achromatic and no chroma is being added, keep hue undefined
    // to avoid pulling grays toward a specific hue
    const afterLch = d3rgb(d3lch(l, c, (c === 0) ? NaN : h));

    // Apply HSL shifts on the result
    const hslC = d3hsl(afterLch);
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
    return { color: d3rgb(final).formatHex(), position: stop.position };
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

// =====================================================
// Palette Construction Helper Tools
// =====================================================

/** Generate a monochromatic palette from a base color */
function generateMonochromatic() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h = base.h || 0;
  const c = base.c || 50;
  const stops: { color: string; position: number }[] = [];
  const count = 5;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const l = 15 + t * 85; // lightness from 15 to 100
    const col = d3lch(l, c * (0.5 + 0.5 * Math.sin(t * Math.PI)), h);
    stops.push({ color: d3rgb(col).formatHex(), position: t });
  }
  model.value.colorStops = stops;
  resetLchBase();
}

/** Generate a complementary palette (base + opposite hue) */
function generateComplementary() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h1 = base.h || 0;
  const h2 = (h1 + 180) % 360;
  const c = base.c || 60;
  model.value.colorStops = [
    { color: d3rgb(d3lch(25, c, h1)).formatHex(), position: 0 },
    { color: d3rgb(d3lch(60, c, h1)).formatHex(), position: 0.25 },
    { color: d3rgb(d3lch(90, c * 0.3, h1)).formatHex(), position: 0.5 },
    { color: d3rgb(d3lch(60, c, h2)).formatHex(), position: 0.75 },
    { color: d3rgb(d3lch(25, c, h2)).formatHex(), position: 1.0 },
  ];
  resetLchBase();
}

/** Generate an analogous palette (adjacent hues) */
function generateAnalogous() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h = base.h || 0;
  const c = base.c || 60;
  const spread = 60; // total hue range
  const count = 6;
  const stops: { color: string; position: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const hue = ((h - spread / 2 + t * spread) % 360 + 360) % 360;
    const l = 30 + t * 55;
    stops.push({ color: d3rgb(d3lch(l, c, hue)).formatHex(), position: t });
  }
  model.value.colorStops = stops;
  resetLchBase();
}

/** Generate a triadic palette (3 hues 120° apart) */
function generateTriadic() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h = base.h || 0;
  const c = base.c || 60;
  model.value.colorStops = [
    { color: d3rgb(d3lch(30, c, h)).formatHex(), position: 0 },
    { color: d3rgb(d3lch(70, c, h)).formatHex(), position: 0.17 },
    { color: d3rgb(d3lch(70, c, (h + 120) % 360)).formatHex(), position: 0.33 },
    { color: d3rgb(d3lch(90, c * 0.3, (h + 180) % 360)).formatHex(), position: 0.5 },
    { color: d3rgb(d3lch(70, c, (h + 240) % 360)).formatHex(), position: 0.67 },
    { color: d3rgb(d3lch(30, c, (h + 240) % 360)).formatHex(), position: 1.0 },
  ];
  resetLchBase();
}

/** Generate a random palette */
function generateRandom() {
  const count = 4 + Math.floor(Math.random() * 4); // 4 to 7 stops
  const stops: { color: string; position: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const h = Math.random() * 360;
    const c = 30 + Math.random() * 80;
    const l = 15 + Math.random() * 80;
    stops.push({ color: d3rgb(d3lch(l, c, h)).formatHex(), position: t });
  }
  model.value.colorStops = stops;
  resetLchBase();
}

// =====================================================
// Tessellation Texture Library
// =====================================================
const TEXTURE_SELECTED_KEY = 'mandelbrot_selected_texture';
const MAX_TEXTURE_SIZE = 4096;

const textureName = ref('');
const textures = ref<TextureMetadata[]>([]);
const selectedTexture = ref('Gold');
const showTextureDropdown = ref(false);

const currentTextureObj = computed(() => textures.value.find(t => t.name === selectedTexture.value));
const currentTextureThumbnail = computed(() => currentTextureObj.value?.thumbnail);

/** Active blob URL — must be revoked when changed to avoid memory leaks. */
const activeBlobUrl = ref<string | null>(null);

function revokeActiveBlobUrl() {
  if (activeBlobUrl.value) {
    URL.revokeObjectURL(activeBlobUrl.value);
    activeBlobUrl.value = null;
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

/** Fetch an asset URL as a Blob */
async function fetchAssetBlob(url: string): Promise<Blob> {
  const resp = await fetch(url);
  return resp.blob();
}

/** Ensure a built-in default texture exists in the DB; add it if missing. */
async function ensureDefaultTexture(name: string, assetUrl: string): Promise<void> {
  const existing = await getTextureBlob(name);
  if (existing) return;
  const blob = await fetchAssetBlob(assetUrl);
  const thumbUrl = URL.createObjectURL(blob);
  const thumbnail = await generateThumbnailFromUrl(thumbUrl);
  URL.revokeObjectURL(thumbUrl);
  await saveTextureEntry(name, blob, thumbnail);
}

async function loadTextures() {
  // 1. Migrate legacy localStorage data (if any)
  await migrateFromLocalStorage();

  // 2. Bootstrap built-in default textures in parallel (added if missing)
  await Promise.all(BUILT_IN_TEXTURES.map(t => ensureDefaultTexture(t.name, t.url)));

  // 3. Load metadata list
  textures.value = await getAllTextureEntries();

  // 4. Restore persisted selection
  const savedName = localStorage.getItem(TEXTURE_SELECTED_KEY);
  if (savedName && textures.value.some(t => t.name === savedName)) {
    selectedTexture.value = savedName;
    textureName.value = savedName;
  }
}

async function applyTextureToEngine(name: string, engine: import('../Engine').Engine) {
  const blob = await getTextureBlob(name);
  if (!blob) return;
  revokeActiveBlobUrl();
  activeBlobUrl.value = URL.createObjectURL(blob);
  await engine.updateTileTexture(activeBlobUrl.value);
}

async function selectTexture(name: string) {
  const tex = textures.value.find(t => t.name === name);
  if (!tex) return;
  selectedTexture.value = name;
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

async function deleteTexture() {
  const name = textureName.value.trim();
  if (!name) return;
  if (BUILT_IN_TEXTURE_NAMES.has(name)) {
    window.alert('La texture par défaut ne peut pas être supprimée.');
    return;
  }
  if (window.confirm(`Supprimer la texture "${name}" ? Cette action est irréversible.`)) {
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

const textureFileInput = ref<HTMLInputElement | null>(null);
function triggerImportTexture() {
  textureFileInput.value?.click();
}

async function importTexture(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  // Validate file type
  if (!file.type.startsWith('image/')) {
    window.alert('Veuillez sélectionner un fichier image (JPG, PNG, WebP, etc.).');
    input.value = '';
    return;
  }
  // Validate dimensions via a temporary blob URL (no base64 needed)
  const tmpUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = async () => {
    URL.revokeObjectURL(tmpUrl);
    if (img.width > MAX_TEXTURE_SIZE || img.height > MAX_TEXTURE_SIZE) {
      window.alert(`Image trop grande (${img.width}×${img.height}). Taille maximale : ${MAX_TEXTURE_SIZE}×${MAX_TEXTURE_SIZE}.`);
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
    textures.value = await getAllTextureEntries();

    // Auto-select the newly imported texture
    await selectTexture(name);
    textureName.value = name;
    input.value = '';
  };
  img.onerror = () => {
    URL.revokeObjectURL(tmpUrl);
    window.alert('Impossible de charger l\u2019image.');
    input.value = '';
  };
  img.src = tmpUrl;
}

async function renameAndSaveTexture() {
  const name = textureName.value.trim();
  if (!name) return;
  // If a texture is selected and we're renaming it
  const current = textures.value.find(t => t.name === selectedTexture.value);
  if (current && current.name !== name) {
    // Check name collision
    if (textures.value.some(t => t.name === name)) {
      window.alert(`Une texture nommée "${name}" existe déjà.`);
      return;
    }
    await renameTextureEntry(current.name, name);
    // Refresh metadata list
    textures.value = await getAllTextureEntries();
    selectedTexture.value = name;
    localStorage.setItem(TEXTURE_SELECTED_KEY, name);
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
        <span>Échelle&nbsp;:
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
        <label class="label">Charger une localisation</label>
        <p style="font-size: 0.82em; color: #555; margin-bottom: 0.5em;">Applique uniquement la position (Cx, Cy, échelle, angle) d'un preset.</p>
        <div class="dropdown" :class="{ 'is-active': showNavPresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showNavPresetDropdown = !showNavPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-nav-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentNavPresetThumbnail" :src="currentNavPresetThumbnail" alt="miniature" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ currentNavPresetMeta?.name || (selectedNavPreset ? formatPresetDate(currentNavPresetMeta?.date ?? '') : 'Choisir un preset...') }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-nav-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in presets" :key="preset.id" class="dropdown-item"
                @click.prevent="selectNavPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedNavPreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="miniature"
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
    </div>

    <!-- Presets tab -->
    <div v-else-if="activeTab === 'presets'">
      <div class="mb-3">
        <label class="label">Presets enregistrés</label>
        <!-- Dropdown enrichie Bulma -->
        <div class="dropdown" :class="{ 'is-active': showPresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPresetDropdown = !showPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentPresetThumbnail" :src="currentPresetThumbnail" alt="miniature" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ currentPresetMeta?.name || (selectedPreset ? formatPresetDate(currentPresetMeta?.date ?? '') : 'Choisir un preset...') }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in presets" :key="preset.id" class="dropdown-item"
                @click.prevent="selectPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedPreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="miniature"
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
                  title="Supprimer ce preset"></button>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.8em;">
          <div class="control is-expanded">
            <input class="input" v-model="presetName" type="text" placeholder="Nom (facultatif)..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePreset">Enregistrer</button>
          </div>
        </div>

        <!-- Import / Export Presets -->
        <hr class="section-sep"/>
        <label class="label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPresets" :disabled="presets.length === 0">
              Exporter
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPresets">
              Importer
            </button>
            <input ref="presetFileInput" type="file" accept=".json" style="display:none;" @change="importPresets" />
          </div>
        </div>
      </div>
    </div>

    <!-- Palettes tab -->
    <div v-else-if="activeTab === 'palettes'">
      <div class="mb-3">
        <PaletteEditor
          :color-stops="model.colorStops"
          :interpolation-mode="model.interpolationMode"
          :picker-mode="props.pickerMode"
          :tile-texture-url="activeBlobUrl"
          :tessellation-level="model.tessellationLevel"
          :displacement-amount="model.displacementAmount"
          @toggle-picker="emit('toggle-picker')"
        />
      </div>

      <!-- Interpolation mode -->
      <div class="mb-3">
        <label class="label">Interpolation</label>
        <div class="buttons toggle-buttons">
          <button
            v-for="mode in interpolationModes"
            :key="mode.key"
            class="button is-small"
            :class="model.interpolationMode === mode.key ? 'is-link' : 'is-light'"
            @click="model.interpolationMode = mode.key"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <hr class="section-sep"/>

      <!-- Palette manipulation tools -->
      <div class="mb-3">
        <label class="label">Outils palette</label>
        <div class="buttons" style="flex-wrap: wrap; gap: 0.4em;">
          <button class="button is-small is-light" @click="invertPalette" title="Inverser l'ordre des couleurs">Inverser</button>
          <button class="button is-small is-light" @click="negatePalette" title="Négatif (inverser les couleurs RGB)">Négatif</button>
          <button class="button is-small is-light" @click="duplicatePalette" title="Comprimer et répéter 2x">Dupliquer</button>
          <button class="button is-small is-light" @click="mirrorPalette" title="Effet miroir (palindrome)">Miroir</button>
          <button class="button is-small is-light" @click="distributeEvenly" title="Répartir les stops uniformément">Distribuer</button>
        </div>
      </div>

      <hr class="section-sep"/>

      <!-- Palette construction helpers -->
      <div class="mb-3">
        <label class="label">Générer une palette</label>
        <p style="font-size: 0.85em; color: #555; margin-bottom: 0.5em;">Basé sur la 1ère couleur actuelle</p>
        <div class="buttons" style="flex-wrap: wrap; gap: 0.4em;">
          <button class="button is-small is-info is-light" @click="generateMonochromatic">Monochromatique</button>
          <button class="button is-small is-info is-light" @click="generateComplementary">Complémentaire</button>
          <button class="button is-small is-info is-light" @click="generateAnalogous">Analogique</button>
          <button class="button is-small is-info is-light" @click="generateTriadic">Triadique</button>
          <button class="button is-small is-warning is-light" @click="generateRandom">Aléatoire</button>
        </div>
      </div>

      <hr class="section-sep"/>
      <div class="mb-3" style="display: flex; align-items: center; gap: 1em;">
        <label style="white-space: nowrap;">Période :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="0" max="1" step="0.001" v-model.number="sliderPalettePeriod" />
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 1em;">
        <label style="white-space: nowrap;">Décalage :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="0" max="1" step="0.001" v-model.number="model.paletteOffset" />
      </div>

      <hr class="section-sep"/>

      <!-- Global color adjustment sliders -->
      <label class="label">Ajustement global</label>

      <!-- LCH sliders -->
      <p style="font-size: 0.82em; color: #666; margin-bottom: 0.4em; font-weight: 600;">LCH (perceptuel)</p>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Teinte :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-180" max="180" step="1"
          :value="hueShift"
          @input="onHueInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ hueShift }}°</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Chroma :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="chromaShift"
          @input="onChromaInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ chromaShift }}</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Clarté :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="lightShift"
          @input="onLightInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ lightShift }}</span>
      </div>

      <!-- HSL sliders -->
      <p style="font-size: 0.82em; color: #666; margin-bottom: 0.4em; margin-top: 0.6em; font-weight: 600;">HSL (classique)</p>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Teinte :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-180" max="180" step="1"
          :value="hslHueShift"
          @input="onHslHueInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ hslHueShift }}°</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Saturation :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="satShift"
          @input="onSatInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ satShift }}</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Luminosité :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="lumShift"
          @input="onLumInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ lumShift }}</span>
      </div>

      <div class="mb-3">
        <button class="button is-small is-light" @click="resetLchBase">Réinitialiser</button>
      </div>

      <hr class="section-sep"/>

      <!-- Extract palette from a preset -->
      <div class="mb-3">
        <label class="label">Extraire depuis un preset</label>
        <p style="font-size: 0.82em; color: #555; margin-bottom: 0.5em;">Applique les couleurs, l'interpolation, la période et le décalage d'un preset.</p>
        <div class="dropdown" :class="{ 'is-active': showPalettePresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPalettePresetDropdown = !showPalettePresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-palette-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentPalettePresetThumbnail" :src="currentPalettePresetThumbnail" alt="miniature" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ currentPalettePresetMeta?.name || (selectedPalettePreset ? formatPresetDate(currentPalettePresetMeta?.date ?? '') : 'Choisir un preset...') }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-palette-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in presets" :key="preset.id" class="dropdown-item"
                @click.prevent="selectPalettePresetFromDropdown(preset)"
                :class="{ 'is-active': selectedPalettePreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="miniature"
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
        <label class="label">Palettes enregistrées</label>
        <!-- Dropdown enrichie Bulma -->
        <div class="dropdown" :class="{ 'is-active': showPaletteDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPaletteDropdown = !showPaletteDropdown" aria-haspopup="true" aria-controls="dropdown-menu-palettes" type="button">
              <span style="display:flex; align-items:center; flex-direction:column; gap:0.5em; padding:0.4em 0;">
                <img v-if="currentPaletteThumbnail" :src="currentPaletteThumbnail" alt="miniature" style="height:24px; width:100%; max-width:280px; object-fit:cover; border-radius:3px; background:#888; box-shadow:0 1px 3px rgba(0,0,0,0.2);" />
                <span style="width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; justify-content:center; gap:0.3em;">
                  <span style="flex:1 1 auto; text-align:center;">{{ paletteName || 'Choisir une palette...' }}</span>
                  <span class="icon is-small">
                    <i class="fas fa-angle-down" aria-hidden="true"></i>
                  </span>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-palettes" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="palette in palettes" :key="palette.name" class="dropdown-item"
                @click.prevent="selectPaletteFromDropdown(palette)"
                :class="{ 'is-active': selectedPalette === palette.name }"
                style="display:flex; flex-direction:column; gap:0.5em; padding:0.75em;">
                <img v-if="palette.thumbnail" :src="palette.thumbnail" alt="miniature"
                  style="height:32px; width:100%; object-fit:cover; border-radius:4px; background:#aaa; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; text-align:center;">{{ palette.name }}</span>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.8em;">
          <div class="control is-expanded">
            <input class="input" v-model="paletteName" type="text" placeholder="Nom..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePalette">Enregistrer</button>
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deletePalette" :disabled="!paletteName">Supprimer</button>
          </div>
        </div>

        <!-- Import / Export Palettes -->
        <hr class="section-sep"/>
        <label class="label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPalettes" :disabled="palettes.length === 0">
              Exporter
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPalettes">
              Importer
            </button>
            <input ref="paletteFileInput" type="file" accept=".json" style="display:none;" @change="importPalettes" />
          </div>
        </div>
      </div>
    </div>

    <!-- Performance/Graphics tab -->
    <div v-else-if="activeTab === 'performance'" class="graphics-tab">

      <!-- Extract rendering settings from a preset -->
      <div class="mb-3">
        <label class="gfx-section-title">Charger les r&eacute;glages d'un preset</label>
        <p class="gfx-hint">Applique tous les param&egrave;tres sauf la localisation et la performance.</p>
        <div class="dropdown" :class="{ 'is-active': showGraphicsPresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showGraphicsPresetDropdown = !showGraphicsPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-graphics-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentGraphicsPresetThumbnail" :src="currentGraphicsPresetThumbnail" alt="miniature" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ currentGraphicsPresetMeta?.name || (selectedGraphicsPreset ? formatPresetDate(currentGraphicsPresetMeta?.date ?? '') : 'Choisir un preset...') }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-graphics-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in presets" :key="preset.id" class="dropdown-item"
                @click.prevent="selectGraphicsPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedGraphicsPreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="miniature"
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

      <!-- ═══ OPTIONS DE RENDU ═══ -->
      <label class="gfx-section-title">Options de rendu</label>
      <div class="buttons toggle-buttons" style="margin-bottom: 0.8em;">
        <button class="button is-small"
          :class="model.activateShading ? 'is-link' : 'is-light'"
          @click="model.activateShading = !model.activateShading; if (!model.activateShading) { model.activateSkybox = false; }">
          Relief
        </button>
        <button class="button is-small"
          :class="model.activatePalette ? 'is-link' : 'is-light'"
          @click="model.activatePalette = !model.activatePalette">
          Palette
        </button>
        <button class="button is-small"
          :class="model.activateSmoothness ? 'is-link' : 'is-light'"
          @click="model.activateSmoothness = !model.activateSmoothness">
          Smoothness
        </button>
        <button class="button is-small"
          :class="model.activateTessellation ? 'is-link' : 'is-light'"
          @click="model.activateTessellation = !model.activateTessellation">
          Textur&eacute;
        </button>
        <button class="button is-small"
          :class="model.activateSkybox ? 'is-link' : 'is-light'"
          @click="model.activateSkybox = !model.activateSkybox; if (model.activateSkybox) { model.activateShading = true; }">
          M&eacute;talis&eacute;
        </button>
        <button class="button is-small"
          :class="model.activateWebcam ? 'is-link' : 'is-light'"
          @click="model.activateWebcam = !model.activateWebcam">
          Webcam
        </button>
        <button class="button is-small"
          :class="model.activateZebra ? 'is-link' : 'is-light'"
          @click="model.activateZebra = !model.activateZebra">
          Zebra
        </button>
        <button class="button is-small"
          :class="model.activateAnimate ? 'is-link' : 'is-light'"
          @click="model.activateAnimate = !model.activateAnimate">
          Animate
        </button>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ ÉCLAIRAGE ═══ -->
      <label class="gfx-section-title">&Eacute;clairage</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Direction</span>
        <input class="slider" type="range" min="0" max="359" step="1" v-model.number="lightAngleSlider" />
        <span class="gfx-slider-value">{{ Math.round(lightAngleSlider) }}&deg;</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Brillance</span>
        <input class="slider" type="range" min="0" max="3" step="0.05" v-model.number="model.shadingLevel" />
        <span class="gfx-slider-value">&times;{{ (model.shadingLevel ?? 1.0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Sp&eacute;culaire</span>
        <input class="slider" type="range" min="1" max="64" step="0.5" v-model.number="model.specularPower" />
        <span class="gfx-slider-value">{{ (model.specularPower ?? 4).toFixed(1) }}</span>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ TEXTURE ═══ -->
      <label class="gfx-section-title">Texture</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">R&eacute;p&eacute;tition</span>
        <input class="slider" type="range" min="0.1" max="10" step="0.1" v-model.number="model.tessellationLevel" />
        <span class="gfx-slider-value">{{ model.tessellationLevel }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">D&eacute;placement</span>
        <input class="slider" type="range" min="0" max="0.1" step="0.001" v-model.number="model.displacementAmount" />
        <span class="gfx-slider-value">&times;{{ (model.displacementAmount ?? 1.0).toFixed(3) }}</span>
      </div>

      <!-- Tessellation Texture Library (compact) -->
      <div class="mb-3" style="margin-top: 0.6em;">
        <div class="dropdown" :class="{ 'is-active': showTextureDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth is-small" @click="showTextureDropdown = !showTextureDropdown" aria-haspopup="true" aria-controls="dropdown-menu-textures" type="button">
              <span style="display:flex; align-items:center; min-height:28px;">
                <img v-if="currentTextureThumbnail" :src="currentTextureThumbnail" alt="miniature" style="height:24px; width:42px; object-fit:cover; margin-right:6px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.88em;">{{ selectedTexture || 'Texture...' }}</span>
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
                <img v-if="tex.thumbnail" :src="tex.thumbnail" alt="miniature"
                  style="height:48px; width:85px; object-fit:cover; border-radius:4px; background:#aaa; box-shadow:0 1px 4px rgba(0,0,0,0.12);"/>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.95em;">{{ tex.name }}</span>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.5em;">
          <div class="control is-expanded">
            <input class="input is-small" v-model="textureName" type="text" placeholder="Nom..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
              @keyup.enter="renameAndSaveTexture"
            />
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportTexture">Importer</button>
            <input ref="textureFileInput" type="file" accept="image/*" style="display:none;" @change="importTexture" />
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deleteTexture" :disabled="!textureName || BUILT_IN_TEXTURE_NAMES.has(textureName)">Supprimer</button>
          </div>
        </div>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ CALCUL ═══ -->
      <label class="gfx-section-title">Calcul</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Mu</span>
        <input class="slider" type="range" min="0" max="5" step="0.01" v-model="muSlider" />
        <span class="gfx-slider-value">{{ (model.mu ?? 1.0).toFixed(1) }}</span>
        <button class="button is-small is-light" style="padding: 0 6px; height: 22px; font-size: 0.75em;" @click="model.mu = 4" title="Mu = 4">4</button>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Epsilon</span>
        <input class="slider" type="range" min="-12" max="0" step="0.01" v-model="epsilonSlider" />
        <span class="gfx-slider-value">{{ (model.epsilon ?? 1e-8).toExponential(1) }}</span>
      </div>

      <hr class="section-sep"/>

      <!-- ═══ PERFORMANCE ═══ -->
      <label class="gfx-section-title">Performance</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">R&eacute;solution</span>
        <input class="slider" type="range" min="0.125" max="2" step="0.125" v-model.number="model.dprMultiplier" />
        <span class="gfx-slider-value">DPR &times;{{ model.dprMultiplier?.toFixed(2) ?? '1.00' }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">It&eacute;rations</span>
        <input class="slider" type="range" min="-2" max="1" step="0.01" v-model="maxIterMultSlider" />
        <span class="gfx-slider-value">&times;{{ (model.maxIterationMultiplier ?? 1.0).toPrecision(3) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Target FPS</span>
        <input class="slider" type="range" min="10" max="60" step="1" v-model.number="model.targetFps" />
        <span class="gfx-slider-value">{{ model.targetFps ?? 60 }} fps</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Charge GPU max.</span>
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
  border-top: 1.5px solid #AAA;
  margin: 1.2em 0 1.2em 0;
}
.toggle-buttons {
  flex-wrap: wrap;
  gap: 0.4em;
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
  margin-bottom: 0.35em;
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
  margin-bottom: 0.35em;
}
.gfx-slider-row input[type="range"] {
  flex: 1 1 auto;
  min-width: 0;
}
.gfx-slider-label {
  flex: 0 0 auto;
  min-width: 5.5em;
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
</style>
