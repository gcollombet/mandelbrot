<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, toRaw, watch} from 'vue';
import type {InterpolationMode, MandelbrotParams} from "../Mandelbrot.ts";
import {
  preserveSessionPerformanceFields,
  stripExplorationStateFields,
  stripSessionPerformanceFields,
} from "../Mandelbrot.ts";
import type {ColorStop} from '../ColorStop.ts';
import {createInterpolatedColorStop} from '../ColorStop.ts';
import PaletteEditor from './PaletteEditor.vue';
import PalettePreview from './PalettePreview.vue';
import GlissiereHandle from './GlissiereHandle.vue';
import AnimationPanel from './AnimationPanel.vue';
import {Palette} from '../Palette.ts';
import {hsl as d3hsl, rgb as d3rgb} from 'd3-color';
import type {TextureMetadata} from '../textureStore';
import {
  deleteTextureEntry,
  getTextureBlob,
  saveTextureEntry,
  updateTextureMetadata,
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
  savePresetEntry,
  updatePresetEntry,
} from '../presetStore';
import type {PaletteRecord} from '../paletteStore';
import {
  deletePaletteEntry,
  getAllPaletteEntries,
  savePaletteEntry,
} from '../paletteStore';
import {syncRemoteCatalog} from '../remoteCatalogSync';
import {RemoteCatalogNameConflictError, uploadRemoteCatalogEntry, uploadRemoteTextureEntry} from '../remoteCatalog';
import type {TextureMappingPresetRecord} from '../textureMappingPresetStore';
import {
  deleteTextureMappingPresetEntry,
  getAllTextureMappingPresetEntries,
  saveTextureMappingPresetEntry,
} from '../textureMappingPresetStore';
import {
  DRAGON_SCALES_TEXTURE_MAPPING,
  normalizeTextureMappingFromLegacy,
  SCREEN_SPACE_TEXTURE_MAPPING,
  TEXTURE_MAPPING_SCALE_MAX,
  TEXTURE_MAPPING_SCALE_MIN,
  TEXTURE_MAPPING_VARIABLE_OPTIONS,
  textureMappingEquals,
} from '../TextureMapping';
import {
  cloneAnimationConfig,
  normalizeAnimationConfig,
} from '../AnimationConfig';
import type {AnimationPresetRecord} from '../animationPresetStore';
import {
  saveAnimationPresetEntry,
} from '../animationPresetStore';
import type {UserRole} from '../authService';
import {canDeleteCatalogEntry, canOverwriteCatalogPayload, canShowAdminUpload} from '../catalogPermissions';
import {nameForCatalogReference} from '../catalogIdentity';
import {MAX_IMPORTED_TEXTURE_SIDE, normalizeTextureBlob} from '../textureNormalization';

import type {Engine} from '../Engine.ts';
const props = defineProps<{
  engine: Engine | null;
  suspendShortcuts?: (suspend: boolean) => void;
  activeTab: string;
  pickerMode?: boolean;
  userRole?: UserRole;
}>();

const userRole = computed<UserRole>(() => props.userRole ?? 'guest');
const isAdmin = computed(() => canShowAdminUpload(userRole.value));
const uploadSuccessKeys = ref<Set<string>>(new Set());
const uploadSuccessTimers = new Map<string, ReturnType<typeof setTimeout>>();
const UPLOAD_SUCCESS_DURATION_MS = 2500;

function uploadSuccessKey(type: string, id: string | number): string {
  return `${type}:${id}`;
}

function isUploadSuccess(key: string): boolean {
  return uploadSuccessKeys.value.has(key);
}

function showUploadSuccess(key: string): void {
  const existingTimer = uploadSuccessTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  const nextKeys = new Set(uploadSuccessKeys.value);
  nextKeys.add(key);
  uploadSuccessKeys.value = nextKeys;

  uploadSuccessTimers.set(key, setTimeout(() => {
    const remainingKeys = new Set(uploadSuccessKeys.value);
    remainingKeys.delete(key);
    uploadSuccessKeys.value = remainingKeys;
    uploadSuccessTimers.delete(key);
  }, UPLOAD_SUCCESS_DURATION_MS));
}

function uploadButtonClasses(key: string, remote?: {publishedName?: string; lastUpdated?: string}) {
  return {
    'is-upload-success': isUploadSuccess(key),
    'is-remote': !!remote && !isUploadSuccess(key),
  };
}

function uploadButtonTitle(key: string, remote?: {publishedName?: string; lastUpdated?: string}): string {
  if (isUploadSuccess(key)) return 'Uploaded successfully';
  if (remote) return 'Already in shared catalog. Upload again to update.';
  return 'Upload to shared catalog';
}

function uploadButtonIcon(key: string): string {
  return isUploadSuccess(key) ? 'fa-solid fa-check' : 'fa-solid fa-upload';
}

function canUploadTexture(texture: TextureMetadata): boolean {
  return !!texture.guid;
}

const zoomMinBrushStepOptions = [1, 2, 4, 8, 16, 32, 64];
const sentinelSeedStepOptions = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
const zoomMinBrushStepIndex = computed({
  get: () => Math.max(0, zoomMinBrushStepOptions.indexOf(model.value.zoomMinBrushStep)),
  set: (index: number) => {
    const value = zoomMinBrushStepOptions[Math.min(Math.max(Math.round(index), 0), zoomMinBrushStepOptions.length - 1)] ?? 1;
    model.value.zoomMinBrushStep = value;
    if (model.value.sentinelSeedStep < value) {
      model.value.sentinelSeedStep = sentinelSeedStepOptions.find(step => step >= value) ?? sentinelSeedStepOptions[sentinelSeedStepOptions.length - 1];
    }
  },
});
const sentinelSeedStepIndex = computed({
  get: () => Math.max(0, sentinelSeedStepOptions.indexOf(model.value.sentinelSeedStep)),
  set: (index: number) => {
    const minAllowed = model.value.zoomMinBrushStep;
    const value = sentinelSeedStepOptions[Math.min(Math.max(Math.round(index), 0), sentinelSeedStepOptions.length - 1)] ?? 64;
    const nextValue = sentinelSeedStepOptions.find(step => step >= Math.max(value, minAllowed)) ?? sentinelSeedStepOptions[sentinelSeedStepOptions.length - 1];
    model.value.sentinelSeedStep = nextValue;
  },
});

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
    epsilon: 1e-9,
    colorStops: [],
     palettePeriod: 256,
     paletteOffset: 0,
     heightPaletteShift: 0,
    paletteMirror: false,
    antialiasLevel: 1,
    tessellationLevel: 0,
    lightAngle: 0,
      displacementAmount: 0,
      animation: normalizeAnimationConfig(null, 1.0),
      activateAnimate: false,
      debugShading: false,
      animationSpeed: 1.0,
     ambientOcclusionStrength: 0,
     microBumpStrength: 0,
       subsurfaceStrength: 0.0,
     reliefDepth: 1,
     localShadowStrength: 0,
     varnishStrength: 0,
     orbitTrapStrength: 0,
     phaseColoringStrength: 0,
     stripeFrequency: 8,
     zoomMinBrushStep: 1,
     sentinelSeedStep: 64,
     textureName: 'Gold',
      skyboxName: 'Window',
      textureMapping: normalizeTextureMappingFromLegacy({ textureMappingMode: 0 }),
    dprMultiplier: 1.0,
    maxIterationMultiplier: 1.0,
     interpolationMode: 'lab',
     approximationMode: 'perturbation',
     targetFps: 60,
     gpuLoadMultiplier: 1.0,
  }
});

function ensureActiveTextureMapping() {
  model.value.textureMapping = normalizeTextureMappingFromLegacy(model.value);
  delete (model.value as any).textureMappingMode;
}

ensureActiveTextureMapping();

const textureMappingXScaleSlider = computed({
  get: () => Math.log10(normalizeTextureMappingFromLegacy(model.value).xScale),
  set: (value: number) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.xScale = Number(Math.pow(10, value).toPrecision(4));
    triggerTextureMappingUpdate();
  },
});

const textureMappingYScaleSlider = computed({
  get: () => Math.log10(normalizeTextureMappingFromLegacy(model.value).yScale),
  set: (value: number) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.yScale = Number(Math.pow(10, value).toPrecision(4));
    triggerTextureMappingUpdate();
  },
});

const textureMappingXVariable = computed({
  get: () => normalizeTextureMappingFromLegacy(model.value).xVariable,
  set: (value) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.xVariable = value;
    triggerTextureMappingUpdate();
  },
});

const textureMappingYVariable = computed({
  get: () => normalizeTextureMappingFromLegacy(model.value).yVariable,
  set: (value) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.yVariable = value;
    triggerTextureMappingUpdate();
  },
});

const textureMappingMirror = computed({
  get: () => normalizeTextureMappingFromLegacy(model.value).mirrored,
  set: (value: boolean) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.mirrored = value;
    triggerTextureMappingUpdate();
  },
});

function applyTextureMapping(mapping: unknown) {
  model.value.textureMapping = normalizeTextureMappingFromLegacy({ textureMapping: mapping });
  delete (model.value as any).textureMappingMode;
}

function applyBuiltInTextureMapping(kind: 'screen' | 'dragon') {
  applyTextureMapping(kind === 'dragon' ? DRAGON_SCALES_TEXTURE_MAPPING : SCREEN_SPACE_TEXTURE_MAPPING);
  selectedTextureMappingPreset.value = kind === 'dragon' ? 'Dragon Scales' : 'Screen Space';
}

const activeTextureMappingLabel = computed(() => {
  const active = normalizeTextureMappingFromLegacy(model.value);
  const matching = textureMappingPresets.value.find(preset => textureMappingEquals(preset.mapping, active));
  return matching?.name ?? 'Custom';
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
// Slider phase coloring : logarithmique, 0–1 ↔ 0–100
const sliderPhaseColoring = computed({
  get: () => {
    const v = model.value.phaseColoringStrength ?? 0;
    return v <= 0 ? 0 : Math.log10(v + 1) / 2;
  },
  set: val => {
    model.value.phaseColoringStrength = val <= 0 ? 0 : Math.round((10 ** (val * 2) - 1) * 10) / 10;
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

const coordsCopied = ref(false);
function copyCoordinates() {
  const txt = `Cx ${model.value.cx}, Cy ${model.value.cy}`;
  navigator.clipboard?.writeText(txt);
  coordsCopied.value = true;
  window.setTimeout(() => { coordsCopied.value = false; }, 1200);
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

const MAX_COLORS = 200;
const previewRef = ref<InstanceType<typeof PalettePreview> | null>(null);
const selectedIdx = ref<number | null>(0);

watch(() => model.value.colorStops.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    selectedIdx.value = newLen - 1;
  }
});

function selectColor(idx: number) {
  selectedIdx.value = idx;
}

function deleteSelectedStop() {
  if (selectedIdx.value === null) return;
  if (model.value.colorStops.length <= 2) return; // garder au moins 2 stops
  model.value.colorStops.splice(selectedIdx.value, 1);
  // Ajuster la sélection
  if (selectedIdx.value >= model.value.colorStops.length) {
    selectedIdx.value = model.value.colorStops.length - 1;
  }
}

function onPreviewDblClick(event: MouseEvent) {
  if (model.value.colorStops.length >= MAX_COLORS) return;
  const canvas = previewRef.value?.canvasRef;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  let t = (event.clientX - rect.left) / rect.width;
  t = Math.max(0, Math.min(1, t));
  const pal = new Palette(model.value.colorStops, model.value.interpolationMode);
  const sampledColor = pal.getColorAt(t);
  const newStop = createInterpolatedColorStop(model.value.colorStops, t, sampledColor);
  model.value.colorStops.push(newStop);
  selectedIdx.value = model.value.colorStops.length - 1;
}


async function deletePresetById(id: number) {
  const meta = presets.value.find(p => p.id === id);
  if (!canDeleteCatalogEntry(userRole.value, meta?.remote)) {
    window.alert('Shared catalog presets cannot be deleted locally.');
    return;
  }
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

/**
 * Unnamed entries fall back to an ISO timestamp as their `name` (see save logic).
 * Treat those as auto-named so the card shows only the date, not a raw ISO string.
 */
function isAutoName(name: string | undefined | null): boolean {
  if (!name || !name.trim()) return true;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(name);
}

/** The real user-given name, or '' when the entry is unnamed (date-only). */
function displayName(name: string | undefined | null): string {
  return isAutoName(name) ? '' : (name ?? '');
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
  stripSessionPerformanceFields(savedValue);
  stripExplorationStateFields(savedValue);
  delete (savedValue as any).activateAnimate;
  delete (savedValue as any).debugShading;
  savedValue.animation = normalizeAnimationConfig(savedValue.animation, savedValue.animationSpeed);
  savedValue.animationSpeed = savedValue.animation.globalSpeed;
  savedValue.textureName = selectedTexture.value;
  savedValue.textureGuid = currentTextureObj.value?.guid;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  savedValue.skyboxGuid = currentSkyboxObj.value?.guid;
  savedValue.textureMapping = normalizeTextureMappingFromLegacy(savedValue);
  delete (savedValue as any).textureMappingMode;
  const name = presetName.value.trim();
  const id = await savePresetEntry(savedValue, thumbnail, name || undefined, now);
  presets.value = await getAllPresetEntries();
  const metadata = presets.value.find(preset => preset.id === id);
  // Cache the new record
  presetCache.set(id, {
    id,
    guid: metadata?.guid ?? crypto.randomUUID(),
    name: metadata?.name ?? (name || now),
    value: savedValue,
    thumbnail,
    date: now,
    lastUpdated: metadata?.lastUpdated ?? now,
    scaleExponent: computeScaleExponent(savedValue.scale),
    favorite: false,
    remote: metadata?.remote,
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
  stripSessionPerformanceFields(savedValue);
  stripExplorationStateFields(savedValue);
  delete (savedValue as any).activateAnimate;
  delete (savedValue as any).debugShading;
  savedValue.animation = normalizeAnimationConfig(savedValue.animation, savedValue.animationSpeed);
  savedValue.animationSpeed = savedValue.animation.globalSpeed;
  savedValue.textureName = selectedTexture.value;
  savedValue.textureGuid = currentTextureObj.value?.guid;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  savedValue.skyboxGuid = currentSkyboxObj.value?.guid;
  savedValue.textureMapping = normalizeTextureMappingFromLegacy(savedValue);
  delete (savedValue as any).textureMappingMode;
  const now = new Date().toISOString();
  const id = await savePresetEntry(savedValue, thumbnail, undefined, now);
  presets.value = await getAllPresetEntries();
  const metadata = presets.value.find(preset => preset.id === id);
  presetCache.set(id, {
    id,
    guid: metadata?.guid ?? crypto.randomUUID(),
    name: metadata?.name ?? now,
    value: savedValue,
    thumbnail,
    date: now,
    lastUpdated: metadata?.lastUpdated ?? now,
    scaleExponent: computeScaleExponent(savedValue.scale),
    favorite: false,
    remote: metadata?.remote,
  });
}

// Expose quickSnapshot and refreshPresets so parent can call them via ref
defineExpose({ quickSnapshot, refreshPresets: async () => { presets.value = await getAllPresetEntries(); } });


async function loadPresets() {
  // Load metadata list
  presets.value = await getAllPresetEntries();
}

async function loadPalettes() {
  palettes.value = await getAllPaletteEntries();
}



function triggerTextureMappingUpdate() {
  ensureActiveTextureMapping();
  model.value.textureMapping = { ...model.value.textureMapping! };
}


async function savePalette() {
  if (!paletteName.value.trim()) return;
  const existingPalette = palettes.value.find(item => item.name === paletteName.value.trim());
  if (!canOverwriteCatalogPayload(userRole.value, existingPalette?.remote)) {
    window.alert('Shared catalog palettes cannot be overwritten. Save a local variant with a new name.');
    return;
  }
  let thumbnail: string | undefined = undefined;
  let now = new Date().toISOString();
  // Try WebGPU snapshot first (shows effects), fall back to CPU gradient strip
  try {
    const snap = previewRef.value?.getSnapshot?.();
    if (snap) {
      thumbnail = snap;
    } else {
      thumbnail = generatePaletteThumbnail(model.value.colorStops, model.value.interpolationMode);
    }
  } catch { /* ignore errors, no thumbnail */ }
  const palette: PaletteRecord = {
    guid: existingPalette?.guid,
    name: paletteName.value.trim(),
    colorStops: structuredClone(toRaw(model.value.colorStops)),
    thumbnail,
    date: existingPalette?.date ?? now,
    lastUpdated: now,
    favorite: existingPalette?.favorite ?? false,
    remote: existingPalette?.remote,
    textureName: selectedTexture.value,
    textureGuid: currentTextureObj.value?.guid,
    skyboxName: selectedSkyboxTexture.value,
    skyboxGuid: currentSkyboxObj.value?.guid,
    interpolationMode: model.value.interpolationMode,
    palettePeriod: model.value.palettePeriod,
    paletteOffset: model.value.paletteOffset,
    heightPaletteShift: model.value.heightPaletteShift,
    paletteMirror: model.value.paletteMirror,
    tessellationLevel: model.value.tessellationLevel,
    displacementAmount: model.value.displacementAmount,
    ambientOcclusionStrength: model.value.ambientOcclusionStrength,
    microBumpStrength: model.value.microBumpStrength,
    subsurfaceStrength: model.value.subsurfaceStrength,
    reliefDepth: model.value.reliefDepth,
    localShadowStrength: model.value.localShadowStrength,
    varnishStrength: model.value.varnishStrength,
    orbitTrapStrength: model.value.orbitTrapStrength,
    phaseColoringStrength: model.value.phaseColoringStrength,
    stripeFrequency: model.value.stripeFrequency,
    textureMapping: normalizeTextureMappingFromLegacy(model.value),
  };
  await savePaletteEntry(palette);
  palettes.value = await getAllPaletteEntries();
  paletteName.value = '';
}

function applyPaletteLookFields(source: Partial<PaletteRecord>): void {
  model.value.tessellationLevel = source.tessellationLevel ?? 0;
  model.value.displacementAmount = source.displacementAmount ?? 0;
  model.value.ambientOcclusionStrength = source.ambientOcclusionStrength ?? 0;
  model.value.microBumpStrength = source.microBumpStrength ?? 0;
  model.value.subsurfaceStrength = source.subsurfaceStrength ?? 0;
  model.value.reliefDepth = source.reliefDepth ?? 1;
  model.value.localShadowStrength = source.localShadowStrength ?? 0;
  model.value.varnishStrength = source.varnishStrength ?? 0;
  model.value.orbitTrapStrength = source.orbitTrapStrength ?? 0;
  model.value.phaseColoringStrength = source.phaseColoringStrength ?? 0;
  model.value.stripeFrequency = source.stripeFrequency ?? 8;
  model.value.textureMapping = normalizeTextureMappingFromLegacy(source);
  delete (model.value as any).textureMappingMode;
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
    model.value.heightPaletteShift = palette.heightPaletteShift ?? 0;
    model.value.paletteMirror = palette.paletteMirror ?? false;
    applyPaletteLookFields(palette);
    // Restore texture if present
    const paletteTexture = textureNameForReference(palette.textureGuid, palette.textureName);
    if (paletteTexture) {
      selectTexture(paletteTexture);
    }
    const paletteSkybox = textureNameForReference(palette.skyboxGuid, palette.skyboxName);
    if (paletteSkybox) {
      selectSkyboxTexture(paletteSkybox);
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

async function selectPaletteFromPreset(id: number) {
  const record = await getCachedPreset(id);
  if (record) {
    selectedPalettePreset.value = id;
    model.value.colorStops = structuredClone(toRaw(record.value.colorStops));
    model.value.interpolationMode = record.value.interpolationMode;
    model.value.palettePeriod = record.value.palettePeriod;
    model.value.paletteOffset = record.value.paletteOffset;
    model.value.heightPaletteShift = record.value.heightPaletteShift ?? model.value.heightPaletteShift;
    model.value.paletteMirror = record.value.paletteMirror ?? false;
    applyPaletteLookFields(record.value);
    // Restore textures if present
    const presetTexture = textureNameForReference(record.value.textureGuid, record.value.textureName);
    if (presetTexture) {
      selectTexture(presetTexture);
    }
    const presetSkybox = textureNameForReference(record.value.skyboxGuid, record.value.skyboxName);
    if (presetSkybox) {
      selectSkyboxTexture(presetSkybox);
    }
  }
}

async function selectPalettePresetFromDropdown(preset: PresetMetadata) {
  await selectPaletteFromPreset(preset.id);
  showPalettePresetDropdown.value = false;
}

async function deletePaletteByName(name: string) {
  const palette = palettes.value.find(item => item.name === name);
  if (!palette) return;
  if (!canDeleteCatalogEntry(userRole.value, palette.remote)) {
    window.alert('Shared catalog palettes cannot be deleted locally.');
    return;
  }
  if (!window.confirm(`Delete palette "${name}"? This cannot be undone.`)) return;
  await deletePaletteEntry(name);
  palettes.value = await getAllPaletteEntries();
  if (selectedPalette.value === name) selectedPalette.value = '';
  if (paletteName.value === name) paletteName.value = '';
}

function exportPaletteByName(name: string) {
  const palette = palettes.value.find(item => item.name === name);
  if (!palette) return;
  downloadJsonFile(`mandelbrot-palette-${palette.name}.json`, palette);
}

async function togglePresetFavorite(id: number): Promise<void> {
  const metadata = presets.value.find(p => p.id === id);
  if (!metadata) return;
  metadata.favorite = !metadata.favorite;
  const record = await getCachedPreset(id);
  if (record) {
    record.favorite = metadata.favorite;
    try {
      await updatePresetEntry(record);
      presetCache.set(id, record);
    } catch (e) {
      metadata.favorite = !metadata.favorite;
      console.warn('Failed to save preset favorite:', e);
    }
  } else {
    metadata.favorite = !metadata.favorite;
  }
}

async function togglePaletteFavorite(name: string): Promise<void> {
  const palette = palettes.value.find(item => item.name === name);
  if (!palette) return;
  palette.favorite = !palette.favorite;
  try {
    await savePaletteEntry({ ...palette });
  } catch (e) {
    palette.favorite = !palette.favorite;
    console.warn('Failed to save palette favorite:', e);
  }
}

function handleUploadError(error: unknown) {
  if (error instanceof RemoteCatalogNameConflictError) {
    window.alert(`A remote ${error.type} named "${error.conflictName}" already exists. Rename this item before uploading.`);
    return;
  }
  console.warn('Remote catalog upload failed:', error);
  window.alert('Remote catalog upload failed. Check the console for details.');
}

async function uploadCompletePreset(id: number): Promise<void> {
  if (!isAdmin.value) return;
  const record = await getCachedPreset(id);
  if (!record) return;
  try {
    const uploaded = await uploadRemoteCatalogEntry('completePreset', {
      guid: record.guid,
      name: record.name,
      lastUpdated: record.lastUpdated,
      value: record.value,
      thumbnail: record.thumbnail,
      scaleExponent: record.scaleExponent,
    });
    record.lastUpdated = uploaded.lastUpdated;
    record.remote = {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated};
    await updatePresetEntry(record);
    presetCache.set(id, record);
    presets.value = await getAllPresetEntries();
    showUploadSuccess(uploadSuccessKey('preset', id));
  } catch (error) {
    handleUploadError(error);
  }
}

async function uploadPalettePreset(palette: PaletteRecord): Promise<void> {
  if (!isAdmin.value) return;
  try {
    const uploadPalette = structuredClone(toRaw(palette));
    uploadPalette.guid = uploadPalette.guid || crypto.randomUUID();
    const uploaded = await uploadRemoteCatalogEntry('palettePreset', {
      ...uploadPalette,
      guid: uploadPalette.guid,
      name: uploadPalette.name,
      lastUpdated: uploadPalette.lastUpdated || uploadPalette.date || new Date().toISOString(),
    });
    await savePaletteEntry({
      ...uploadPalette,
      lastUpdated: uploaded.lastUpdated,
      remote: {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated},
    });
    palettes.value = await getAllPaletteEntries();
    showUploadSuccess(uploadSuccessKey('palette', uploadPalette.name));
  } catch (error) {
    handleUploadError(error);
  }
}

async function uploadAnimationPreset(preset: AnimationPresetRecord): Promise<void> {
  if (!isAdmin.value) return;
  try {
    const uploaded = await uploadRemoteCatalogEntry('animationPreset', {
      guid: preset.guid,
      name: preset.name,
      lastUpdated: preset.lastUpdated || preset.date || new Date().toISOString(),
      animation: cloneAnimationConfig(preset.animation),
    });
    await saveAnimationPresetEntry({
      ...preset,
      lastUpdated: uploaded.lastUpdated,
      remote: {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated},
    });
    showUploadSuccess(uploadSuccessKey('animation', preset.guid));
  } catch (error) {
    handleUploadError(error);
  }
}

async function uploadTexture(texture: TextureMetadata): Promise<void> {
  if (!isAdmin.value || !texture.guid) return;
  let blob: Blob | null = null;
  if (BUILT_IN_TEXTURE_NAMES.has(texture.name)) {
    const objectUrl = await storedTextureObjectUrl(texture.name);
    if (objectUrl) {
      try {
        const response = await fetch(objectUrl);
        blob = await response.blob();
      } catch (e) {
        console.warn('Failed to fetch built-in texture blob:', e);
      }
    }
  } else {
    blob = await getTextureBlob(texture.name);
  }
  if (!blob) return;
  try {
    const uploaded = await uploadRemoteTextureEntry({
      guid: texture.guid,
      name: texture.name,
      thumbnail: texture.thumbnail,
      lastUpdated: texture.lastUpdated || texture.date,
      contentType: blob.type,
      size: blob.size,
    }, blob);
    await saveTextureEntry(texture.name, blob, texture.thumbnail, texture.date, texture.guid, texture.favorite ?? false, {
      publishedName: uploaded.name,
      lastUpdated: uploaded.lastUpdated,
    });
    textures.value = await ensureTextureLibrary();
    showUploadSuccess(uploadSuccessKey('texture', texture.guid));
  } catch (error) {
    handleUploadError(error);
  }
}

async function toggleTextureFavorite(texture: TextureMetadata): Promise<void> {
  if (!texture.guid) return;
  const previous = texture.favorite ?? false;
  texture.favorite = !previous;
  try {
    await updateTextureMetadata(texture);
    textures.value = await ensureTextureLibrary();
  } catch (error) {
    texture.favorite = previous;
    console.warn('Failed to save texture favorite:', error);
  }
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
    stripExplorationStateFields(saved);
    saved.textureMapping = normalizeTextureMappingFromLegacy(saved);
    saved.animation = normalizeAnimationConfig(saved.animation, saved.animationSpeed);
    delete (saved as any).textureMappingMode;
    const current = model.value;
    saved.activateAnimate = current.activateAnimate;
    model.value = preserveSessionPerformanceFields(saved, current);
    ensureActiveTextureMapping();
    // Restore texture if saved with the preset
    const texName = textureNameForReference(saved.textureGuid, saved.textureName);
    if (texName) {
      selectTexture(texName);
    }
    const skyName = textureNameForReference(saved.skyboxGuid, saved.skyboxName);
    if (skyName) {
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

onMounted(async () => {
  await loadPresets();
  await loadPalettes();
  await loadTextureMappingPresets();
  await loadTextures();
  await syncRemoteCatalog();
  await loadPresets();
  await loadPalettes();
  await loadTextureMappingPresets();
  await loadTextures();
});

onUnmounted(() => {
  uploadSuccessTimers.forEach(timer => clearTimeout(timer));
  uploadSuccessTimers.clear();
});

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

async function exportPresetById(id: number) {
  const record = await getCachedPreset(id);
  if (!record) return;
  downloadJsonFile(`mandelbrot-preset-${record.name || record.id}.json`, {
    name: record.name,
    value: record.value,
    thumbnail: record.thumbnail,
    date: record.date,
    favorite: record.favorite ?? false,
  });
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
        const value = structuredClone(record.value);
        stripSessionPerformanceFields(value);
        stripExplorationStateFields(value);
        value.textureMapping = normalizeTextureMappingFromLegacy(value);
        delete (value as any).textureMappingMode;
        await savePresetEntry(
          value,
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
        record.textureMapping = normalizeTextureMappingFromLegacy(record);
        delete (record as any).textureMappingMode;
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

const paletteSubTabs = [
  { key: 'library', label: 'Library', icon: 'fa-solid fa-swatchbook' },
  { key: 'stops', label: 'Stops', icon: 'fa-solid fa-sliders' },
  { key: 'surfaceMaterial', label: 'Global', icon: 'fa-solid fa-globe' },
  { key: 'motionCycle', label: 'Cycle', icon: 'fa-solid fa-arrows-rotate' },
  { key: 'imageEnvironment', label: 'Texture', icon: 'fa-solid fa-image' },
  { key: 'color', label: 'Color', icon: 'fa-solid fa-rainbow' },
] as const;
const activePaletteSubTab = ref<(typeof paletteSubTabs)[number]['key']>('library');

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
const textureName = ref('');
const skyboxName = ref('Window');
const textures = ref<TextureMetadata[]>([]);
const textureMappingPresetName = ref('');
const textureMappingPresets = ref<TextureMappingPresetRecord[]>([]);
const selectedTextureMappingPreset = ref('Screen Space');
const showTextureMappingDropdown = ref(false);
const selectedTexture = ref('Gold');
const selectedSkyboxTexture = ref('Window');
const showTextureDropdown = ref(false);
const showSkyboxDropdown = ref(false);
let suppressTextureApply = false;

const currentTextureObj = computed(() => textures.value.find(t => t.name === selectedTexture.value));
const currentSkyboxObj = computed(() => textures.value.find(t => t.name === selectedSkyboxTexture.value));

async function loadTextureMappingPresets() {
  textureMappingPresets.value = await getAllTextureMappingPresetEntries();
}

function selectTextureMappingPresetFromDropdown(preset: TextureMappingPresetRecord) {
  selectedTextureMappingPreset.value = preset.name;
  textureMappingPresetName.value = preset.builtIn ? '' : preset.name;
  applyTextureMapping(preset.mapping);
  showTextureMappingDropdown.value = false;
}

async function saveTextureMappingPreset() {
  const name = textureMappingPresetName.value.trim();
  if (!name) return;
  const existing = textureMappingPresets.value.find(item => item.name === name && !item.builtIn);
  if (!canOverwriteCatalogPayload(userRole.value, existing?.remote)) {
    window.alert('Shared catalog texture mappings cannot be overwritten. Save a local variant with a new name.');
    return;
  }
  const now = new Date().toISOString();
  await saveTextureMappingPresetEntry({
    guid: existing?.guid ?? crypto.randomUUID(),
    name,
    mapping: normalizeTextureMappingFromLegacy(model.value),
    date: existing?.date ?? now,
    lastUpdated: now,
    favorite: existing?.favorite ?? false,
    remote: existing?.remote,
  });
  textureMappingPresets.value = await getAllTextureMappingPresetEntries();
  selectedTextureMappingPreset.value = name;
  textureMappingPresetName.value = '';
}

async function toggleTextureMappingFavorite(preset: TextureMappingPresetRecord): Promise<void> {
  if (preset.builtIn) return;
  const previous = preset.favorite ?? false;
  preset.favorite = !previous;
  try {
    await saveTextureMappingPresetEntry({ ...preset });
    textureMappingPresets.value = await getAllTextureMappingPresetEntries();
  } catch (error) {
    preset.favorite = previous;
    console.warn('Failed to save texture mapping favorite:', error);
  }
}

async function uploadTextureMappingPreset(preset: TextureMappingPresetRecord): Promise<void> {
  if (!isAdmin.value || preset.builtIn) return;
  try {
    const uploaded = await uploadRemoteCatalogEntry('textureMappingPreset', {
      guid: preset.guid,
      name: preset.name,
      lastUpdated: preset.lastUpdated || preset.date || new Date().toISOString(),
      mapping: normalizeTextureMappingFromLegacy({ textureMapping: preset.mapping }),
    });
    await saveTextureMappingPresetEntry({
      ...preset,
      lastUpdated: uploaded.lastUpdated,
      remote: {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated},
    });
    textureMappingPresets.value = await getAllTextureMappingPresetEntries();
    showUploadSuccess(uploadSuccessKey('texture-mapping', preset.guid));
  } catch (error) {
    handleUploadError(error);
  }
}

async function deleteTextureMappingPreset(preset: TextureMappingPresetRecord): Promise<void> {
  if (preset.builtIn) return;
  if (!canDeleteCatalogEntry(userRole.value, preset.remote)) {
    window.alert('Shared catalog texture mappings cannot be deleted locally.');
    return;
  }
  if (!window.confirm(`Delete texture mapping "${preset.name}"? This cannot be undone.`)) return;
  await deleteTextureMappingPresetEntry(preset.name);
  textureMappingPresets.value = await getAllTextureMappingPresetEntries();
  if (selectedTextureMappingPreset.value === preset.name) {
    selectedTextureMappingPreset.value = activeTextureMappingLabel.value;
  }
}

function textureNameForReference(guid?: string, fallbackName?: string): string | null {
  return nameForCatalogReference(textures.value, guid, fallbackName);
}

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
  const modelGuidName = textureNameForReference(model.value.textureGuid, undefined);
  const savedName = localStorage.getItem(TEXTURE_SELECTED_KEY);
  const restoredName = modelGuidName
    ? modelGuidName
    : (modelName && textures.value.some(t => t.name === modelName))
    ? modelName
    : (savedName && textures.value.some(t => t.name === savedName))
      ? savedName
      : 'Gold';
  const modelSkyboxName = model.value.skyboxName;
  const modelSkyboxGuidName = textureNameForReference(model.value.skyboxGuid, undefined);
  const savedSkyboxName = localStorage.getItem(SKYBOX_SELECTED_KEY);
  const restoredSkyboxName = modelSkyboxGuidName
    ? modelSkyboxGuidName
    : (modelSkyboxName && textures.value.some(t => t.name === modelSkyboxName))
    ? modelSkyboxName
    : (savedSkyboxName && textures.value.some(t => t.name === savedSkyboxName))
      ? savedSkyboxName
      : 'Window';
  selectedTexture.value = restoredName;
  model.value.textureName = restoredName;
  model.value.textureGuid = textures.value.find(t => t.name === restoredName)?.guid;
  textureName.value = restoredName;
  selectedSkyboxTexture.value = restoredSkyboxName;
  model.value.skyboxName = restoredSkyboxName;
  model.value.skyboxGuid = textures.value.find(t => t.name === restoredSkyboxName)?.guid;
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
  model.value.textureGuid = tex.guid;
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

async function deleteTextureByName(name: string) {
  if (BUILT_IN_TEXTURE_NAMES.has(name)) {
    window.alert('Built-in textures cannot be deleted.');
    return;
  }
  const texture = textures.value.find(item => item.name === name);
  if (!canDeleteCatalogEntry(userRole.value, texture?.remote)) {
    window.alert('Shared catalog textures cannot be deleted locally.');
    return;
  }
  if (!window.confirm(`Delete texture "${name}"? This cannot be undone.`)) return;
  await deleteTextureEntry(name);
  textures.value = await ensureTextureLibrary();
  if (selectedTexture.value === name) await selectTexture('Gold');
  if (selectedSkyboxTexture.value === name) await selectSkyboxTexture('Window');
  if (textureName.value === name) textureName.value = '';
  if (skyboxName.value === name) skyboxName.value = '';
}

async function selectSkyboxTexture(name: string) {
  const tex = textures.value.find(t => t.name === name);
  if (!tex) return;
  selectedSkyboxTexture.value = name;
  model.value.skyboxName = name;
  model.value.skyboxGuid = tex.guid;
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
  const texture = textures.value.find(item => item.name === name);
  if (!canDeleteCatalogEntry(userRole.value, texture?.remote)) {
    window.alert('Shared catalog textures cannot be deleted locally.');
    return;
  }
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
  const texture = textures.value.find(item => item.name === name);
  if (!canDeleteCatalogEntry(userRole.value, texture?.remote)) {
    window.alert('Shared catalog textures cannot be deleted locally.');
    return;
  }
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
      await selectSkyboxTexture('Window');
      skyboxName.value = 'Window';
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
  try {
    const normalized = await normalizeTextureBlob(file);
    // Use filename (without extension) as default name
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'Texture';
    let name = baseName;
    let counter = 1;
    while (textures.value.some(t => t.name === name)) {
      name = `${baseName} (${counter++})`;
    }
    // Generate thumbnail from the normalized WebP blob.
    const thumbUrl = URL.createObjectURL(normalized.blob);
    const thumbnail = await generateThumbnailFromUrl(thumbUrl);
    URL.revokeObjectURL(thumbUrl);

    // Store blob in IndexedDB
    await saveTextureEntry(name, normalized.blob, thumbnail);

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
  } catch (error) {
    console.warn('Failed to normalize imported texture:', error);
    window.alert(`Failed to process image. Please choose a supported image that can be converted to WebP at ${MAX_IMPORTED_TEXTURE_SIDE}px maximum.`);
    input.value = '';
  }
}

async function importTexture(event: Event) {
  await importTextureFor(event, 'tile');
}

async function importSkyboxTexture(event: Event) {
  await importTextureFor(event, 'skybox');
}

</script>

<template>
  <div class="settings-container">
    <!-- Navigation tab -->
    <div v-if="activeTab === 'navigation'" class="cv-body">

      <!-- ============ 1. LOCATION ============ -->
      <div class="section-label"><span class="tick"></span>Location</div>
      <p class="section-help">Where you are in the complex plane.</p>

      <div class="coords">
        <div class="lab">
          <div class="l1">Center</div>
          <div class="l2">Complex coordinates — read-only</div>
        </div>
        <div class="vals">
          <div class="cline"><span class="ax">Cx</span><span class="num">{{ truncateDecimal(model.cx, 38) }}</span></div>
          <div class="cline"><span class="ax">Cy</span><span class="num">{{ truncateDecimal(model.cy, 38) }}</span></div>
        </div>
        <button class="copy" :class="{ ok: coordsCopied }" title="Copy coordinates" @click="copyCoordinates">
          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
        </button>
      </div>

      <div class="frow">
        <div class="lab">
          <div class="l1">Zoom</div>
          <div class="l2">Magnification — scale of the view</div>
        </div>
        <input type="range" min="1" max="126" step="1" v-model.number="scaleSlider" />
        <span class="val">{{ Number(model.scale).toExponential(2) }}</span>
      </div>

      <div class="frow">
        <div class="lab">
          <div class="l1">Rotation</div>
          <div class="l2">View angle around the center</div>
        </div>
        <input type="range" min="0" max="359" step="1" v-model.number="angleSlider" />
        <span class="val">{{ angleDeg }}<span class="unit">°</span></span>
      </div>

      <!-- ============ 2. RENDER MAPPING ============ -->
      <div class="section-label"><span class="tick"></span>Render Mapping</div>
      <p class="section-help">How iteration data is mapped before coloring — independent from the location.</p>

      <div class="frow">
        <div class="lab">
          <div class="l1">Mu</div>
          <div class="l2">Escape value scaling</div>
        </div>
        <div class="mu-ctl">
          <input type="range" min="0" max="5" step="0.01" v-model="muSlider" />
          <button class="mu-quick" @click="model.mu = 4" title="Mu = 4">4</button>
        </div>
        <span class="val">{{ (model.mu ?? 1.0).toFixed(1) }}</span>
      </div>

      <div class="frow">
        <div class="lab">
          <div class="l1">Stripe Frequency</div>
          <div class="l2">Density of stripe banding in the coloring</div>
        </div>
        <input type="range" min="1" max="32" step="1" v-model.number="model.stripeFrequency" />
        <span class="val">{{ model.stripeFrequency ?? 8 }}</span>
      </div>

      <!-- ============ 3. LOCATIONS LIBRARY ============ -->
      <div class="section-label"><span class="tick"></span>Locations Library</div>
      <p class="section-help">Saved places. Loading applies the location only (Cx, Cy, zoom, angle) — your render settings are kept.</p>

      <div class="lib-row">
        <button
          class="fav-filter"
          :class="{ on: showOnlyFavoriteNavigation }"
          type="button"
          :aria-pressed="showOnlyFavoriteNavigation"
          @click="showOnlyFavoriteNavigation = !showOnlyFavoriteNavigation"
        >
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          Favorites
        </button>
        <div class="dropdown cv-dropdown" :class="{ 'is-active': showNavPresetDropdown }">
          <div class="dropdown-trigger">
            <button class="cv-select-trigger" @click="showNavPresetDropdown = !showNavPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-nav-presets" type="button">
              <img v-if="currentNavPresetThumbnail" :src="currentNavPresetThumbnail" alt="thumbnail" class="cv-trigger-thumb" />
              <span class="cv-trigger-label">{{ currentNavPresetMeta?.name || (selectedNavPreset ? formatPresetDate(currentNavPresetMeta?.date ?? '') : 'Choose a preset…') }}</span>
              <span class="cv-caret"></span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-nav-presets" role="menu">
            <div class="dropdown-content cv-dropdown-content">
              <a v-for="preset in visibleNavPresets" :key="preset.id" class="dropdown-item favorite-row"
                @click.prevent="selectNavPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedNavPreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <button
                  v-if="isAdmin"
                  class="favorite-button upload-button"
                  :class="uploadButtonClasses(uploadSuccessKey('preset', preset.id), preset.remote)"
                  type="button"
                  :title="uploadButtonTitle(uploadSuccessKey('preset', preset.id), preset.remote)"
                  :aria-label="uploadButtonTitle(uploadSuccessKey('preset', preset.id), preset.remote)"
                  @click.stop.prevent="uploadCompletePreset(preset.id)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i :class="uploadButtonIcon(uploadSuccessKey('preset', preset.id))"></i></span>
                </button>
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': preset.favorite }"
                  type="button"
                  :title="preset.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!preset.favorite"
                  @click.stop.prevent="togglePresetFavorite(preset.id)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="preset.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
                </button>
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="thumbnail"
                  style="height:63px; width:112px; object-fit:cover; border-radius:4px; background:#aaa; flex-shrink:0; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:0.15em;">
                  <span v-if="preset.name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; font-weight:500;">{{ preset.name }}</span>
                  <span style="font-size:0.78em; color:var(--ink-3); display:flex; gap:0.6em;">
                    <span>{{ formatPresetDate(preset.date) }}</span>
                    <span v-if="preset.scaleExponent > 0" style="font-family:monospace;">{{ formatZoom(preset.scaleExponent) }}</span>
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <button class="load-btn" @click="selectedNavPreset && selectPresetLocation(selectedNavPreset)" :disabled="!selectedNavPreset">
        <svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
        Load location
      </button>
      <p class="load-note">Applies Cx, Cy, zoom &amp; angle from the selected preset.</p>

      <div class="transfer">
        <span class="tlab">Transfer</span>
        <button class="tbtn primary" @click="triggerImportPresets"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>Import</button>
        <button class="tbtn" @click="exportSelectedNavigationPreset" :disabled="!selectedNavPreset"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>Export selected</button>
        <button class="tbtn" @click="exportFavoriteNavigationPresets" :disabled="favoritePresets.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/></svg>Export favorites</button>
      </div>
    </div>

    <!-- Presets tab -->
    <div v-else-if="activeTab === 'presets'" class="cv-body">

      <!-- ============ 1. SAVE CURRENT VIEW ============ -->
      <div class="section-label"><span class="tick"></span>Save current view</div>
      <p class="section-help">Captures everything — location, palette and render settings.</p>
      <div class="save-row">
        <input class="txt-in" v-model="presetName" type="text" placeholder="Name (optional)…"
          @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
          @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
        />
        <button class="save-btn" @click="savePreset">
          <svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>
          Save
        </button>
      </div>

      <!-- ============ 2. LIBRARY ============ -->
      <div class="section-label"><span class="tick"></span>Library</div>
      <p class="section-help">Click a preset to apply it. Hover a card for actions — favorite, export, delete.</p>

      <div class="lib-bar">
        <button
          class="fav-filter"
          :class="{ on: showOnlyFavoritePresets }"
          type="button"
          :aria-pressed="showOnlyFavoritePresets"
          @click="showOnlyFavoritePresets = !showOnlyFavoritePresets"
        >
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          Favorites
        </button>
        <span class="count">{{ visiblePresets.length }} preset{{ visiblePresets.length === 1 ? '' : 's' }}</span>
      </div>

      <div class="grid">
        <div
          v-for="preset in visiblePresets"
          :key="preset.id"
          class="card"
          :class="{ sel: selectedPreset === preset.id }"
          @click="selectPresetFromDropdown(preset)"
        >
          <span class="sel-badge">Applied</span>
          <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="thumbnail" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="acts">
            <button
              v-if="isAdmin"
              class="abtn"
              :class="uploadButtonClasses(uploadSuccessKey('preset', preset.id), preset.remote)"
              type="button"
              :title="uploadButtonTitle(uploadSuccessKey('preset', preset.id), preset.remote)"
              @click.stop.prevent="uploadCompletePreset(preset.id)"
            >
              <i :class="uploadButtonIcon(uploadSuccessKey('preset', preset.id))"></i>
            </button>
            <button class="abtn heart" :class="{ faved: preset.favorite }" title="Favorite"
              @click.stop.prevent="togglePresetFavorite(preset.id)">
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
            </button>
            <button class="abtn" title="Export" @click.stop.prevent="exportPresetById(preset.id)">
              <svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 21h14"/></svg>
            </button>
            <button class="abtn del" title="Delete" @click.stop.prevent="deletePresetById(preset.id)">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
            </button>
          </div>
          <div class="info">
            <div v-if="displayName(preset.name)" class="nm">{{ displayName(preset.name) }}</div>
            <div class="sub">
              <span>{{ formatPresetDate(preset.date) }}</span>
              <span v-if="preset.scaleExponent > 0" class="depth">{{ formatZoom(preset.scaleExponent) }}</span>
            </div>
          </div>
        </div>
        <div v-if="visiblePresets.length === 0" class="empty">
          {{ showOnlyFavoritePresets ? 'No favorites yet — hover a card and tap the heart.' : 'No presets saved yet.' }}
        </div>
      </div>

      <!-- ============ 3. TRANSFER ============ -->
      <div class="section-label"><span class="tick"></span>Transfer</div>
      <div class="transfer">
        <button class="tbtn primary" @click="triggerImportPresets"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>Import</button>
        <button class="tbtn" @click="exportPresets" :disabled="presets.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>Export all</button>
        <button class="tbtn" @click="exportSelectedPreset" :disabled="!selectedPreset"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>Export selected</button>
        <button class="tbtn" @click="exportFavoritePresets" :disabled="favoritePresets.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/></svg>Export favorites</button>
        <button class="tbtn danger" @click="deleteAllPresets" :disabled="presets.length === 0"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>Delete all</button>
        <input ref="presetFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPresets" />
      </div>
    </div>

    <!-- Animation tab -->
    <div v-else-if="activeTab === 'animation'" class="animation-tab">
      <AnimationPanel
        v-model="model"
        :user-role="userRole"
        :is-admin="isAdmin"
        :upload-success-keys="uploadSuccessKeys"
        :suspend-shortcuts="props.suspendShortcuts"
        @upload-preset="uploadAnimationPreset"
      />
    </div>

    <!-- Palettes tab -->
    <div v-else-if="activeTab === 'palettes'" class="cv-body palette-canvas-panel">
      <!-- ═══ Pipette + outils compact ═══ -->
      <div class="palette-strip-zone">
      <div class="top-bar palette-strip-bar mb-2 mt-2">
        <div class="color-picker-row">
          <button
            class="pipette-btn"
            :class="{ 'is-active': props.pickerMode }"
            :title="props.pickerMode ? 'Exit pipette mode (Escape)' : 'Pipette: click on the fractal'"
            @click="emit('toggle-picker')"
          >
            <i class="fa-solid fa-eye-dropper fa-fw"></i>
          </button>
          <span v-if="props.pickerMode" class="picker-hint">Click on the fractal&hellip;</span>
        </div>
        <div class="outils-bar">
          <button class="button is-small is-light outils-btn" @click="invertPalette" title="Reverse order">
            <i class="fa-solid fa-arrow-right-arrow-left fa-fw"></i>
          </button>
          <button class="button is-small is-light outils-btn" @click="negatePalette" title="Negate RGB">
            <i class="fa-solid fa-circle-half-stroke fa-fw"></i>
          </button>
          <button class="button is-small is-light outils-btn" @click="duplicatePalette" title="Duplicate 2x">
            <i class="fa-regular fa-copy fa-fw"></i>
          </button>
          <button class="button is-small is-light outils-btn" @click="mirrorPalette" title="Mirror (palindrome)">
            <i class="fa-solid fa-arrows-left-right fa-fw"></i>
          </button>
          <button class="button is-small is-light outils-btn" @click="distributeEvenly" title="Distribute evenly">
            <i class="fa-solid fa-align-justify fa-fw"></i>
          </button>
          <button class="button is-small is-danger is-light outils-btn" @click="clearPalette" title="Clear entire palette">
            <i class="fa-solid fa-trash-can fa-fw"></i>
          </button>
        </div>
      </div>

      <!-- WebGPU preview with handles overlaid -->
      <div class="canvas-row palette-strip mb-3" style="position:relative;" @dblclick="onPreviewDblClick" title="Double-click to add a color stop">
        <PalettePreview
          ref="previewRef"
          :colorStops="model.colorStops"
          :interpolationMode="model.interpolationMode"
          :tileTextureUrl="activeBlobUrl"
          :skyboxTextureUrl="activeSkyboxBlobUrl"
          :tessellationLevel="model.tessellationLevel"
          :displacementAmount="model.displacementAmount"
          :ambientOcclusionStrength="model.ambientOcclusionStrength"
          :microBumpStrength="model.microBumpStrength"
          :subsurfaceStrength="model.subsurfaceStrength"
          :reliefDepth="model.reliefDepth"
          :localShadowStrength="model.localShadowStrength"
          :varnishStrength="model.varnishStrength"
          :orbitTrapStrength="model.orbitTrapStrength"
          :phaseColoringStrength="model.phaseColoringStrength"
          :textureMapping="model.textureMapping"
        />
        <div class="canvas-shadow-overlay"></div>
        <div class="handles-overlay">
          <GlissiereHandle
            v-for="(stop, idx) in model.colorStops"
            :key="'handle-' + idx"
            :stop="stop"
            :selected="!applyToAll && selectedIdx === idx"
            :highlighted="applyToAll"
            :disabled="applyToAll"
            @update:position="t => model.colorStops[idx].position = t"
            @select="selectColor(idx)"
          />
          <!-- Bouton supprimer flottant au-dessus du curseur sélectionné -->
          <button
            v-if="!applyToAll && selectedIdx !== null && model.colorStops.length > 2"
            class="floating-delete-btn"
            :style="{ left: model.colorStops[selectedIdx]?.position * 100 + '%' }"
            title="Delete this stop"
            @mousedown.stop
            @click.stop="deleteSelectedStop"
          >
            &times;
          </button>
        </div>
      </div>
      </div>

      <div class="palette-subtabs">
        <button
          v-for="tab in paletteSubTabs"
          :key="tab.key"
          class="button is-small palette-subtab-button"
          :class="activePaletteSubTab === tab.key ? 'is-link' : 'is-light'"
          type="button"
          @click="activePaletteSubTab = tab.key"
        >
          <i :class="[tab.icon, 'mr-1']" aria-hidden="true"></i>
          {{ tab.label }}
        </button>
      </div>

      <section v-show="activePaletteSubTab === 'stops'">
        <div class="mb-3">
          <PaletteEditor
            ref="paletteEditorRef"
            :color-stops="model.colorStops"
            :selected-idx="selectedIdx"
            :interpolation-mode="model.interpolationMode"
            :picker-mode="props.pickerMode"
            :tile-texture-url="activeBlobUrl"
            :skybox-texture-url="activeSkyboxBlobUrl"
            :tessellation-level="model.tessellationLevel"
            :displacement-amount="model.displacementAmount"
            :ambient-occlusion-strength="model.ambientOcclusionStrength"
            :micro-bump-strength="model.microBumpStrength"
            :subsurface-strength="model.subsurfaceStrength"
            :relief-depth="model.reliefDepth"
            :local-shadow-strength="model.localShadowStrength"
            :varnish-strength="model.varnishStrength"
            :orbit-trap-strength="model.orbitTrapStrength"
            :phase-coloring-strength="model.phaseColoringStrength"
            :texture-mapping="model.textureMapping"
            :is-admin="isAdmin"
            v-model:apply-to-all="applyToAll"
          />
        </div>
      </section>

      <section v-show="activePaletteSubTab === 'motionCycle'">
      <label class="gfx-section-title">Palette Cycle</label>
      <p class="section-help">How the palette repeats across iteration depth.</p>
      <div class="palette-top-controls">
        <div class="trow">
          <div class="lab"><div class="l1">Mirror</div><div class="l2">Ping-pong the palette instead of wrapping</div></div>
          <div class="toggle" :class="{ on: model.paletteMirror }" role="switch" :aria-checked="model.paletteMirror" tabindex="0"
            @click="model.paletteMirror = !model.paletteMirror"
            @keydown.enter.prevent="model.paletteMirror = !model.paletteMirror"
            @keydown.space.prevent="model.paletteMirror = !model.paletteMirror"></div>
        </div>

        <div class="palette-compact-control">
          <span class="palette-compact-label"><span class="l1">Length</span><span class="l2">Iteration span before the palette repeats</span></span>
          <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="sliderPalettePeriod" />
          <span class="palette-compact-value">{{ formatPalettePeriod(model.palettePeriod) }}</span>
        </div>

        <div class="palette-compact-control">
          <span class="palette-compact-label"><span class="l1">Height Shift</span><span class="l2">Moves palette phase along relief height</span></span>
          <input class="slider" type="range" min="0" max="100" step="0.01" v-model.number="model.heightPaletteShift" />
          <span class="palette-compact-value">{{ (model.heightPaletteShift ?? 0).toFixed(2) }}</span>
        </div>

        <div class="palette-compact-control">
          <span class="palette-compact-label"><span class="l1">Offset</span><span class="l2">Rotates the palette cycle start point</span></span>
          <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="model.paletteOffset" />
          <span class="palette-compact-value">{{ (model.paletteOffset * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Phase Coloring</span><span class="l2">Adds orbit phase variation to the palette</span></span>
        <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="sliderPhaseColoring" />
        <span class="gfx-slider-value">{{ (model.phaseColoringStrength ?? 0).toFixed(1) }}×</span>
      </div>
      </section>

      <section v-show="activePaletteSubTab === 'color'">
      <!-- ═══ COLOR ═══ -->
      <label class="gfx-section-title">Color Space</label>
      <p class="section-help">Global adjustments — applied on top of every palette.</p>

      <div class="palette-control-row">
        <label class="palette-control-label"><span class="l1">Interpolation</span><span class="l2">Color space used to blend between stops</span></label>
        <div class="field is-grouped palette-button-group">
          <p v-for="mode in interpolationModes" :key="mode.key" class="control">
            <button
              class="button is-small"
              :class="model.interpolationMode === mode.key ? 'is-link' : 'is-light'"
              @click="model.interpolationMode = mode.key"
            >
              <i class="fa-solid fa-palette fa-fw mr-1"></i> {{ mode.label }}
            </button>
          </p>
        </div>
      </div>

      <div class="palette-control-row">
        <label class="palette-control-label"><span class="l1">Hue Shift</span><span class="l2">Rotates every color around the hue wheel</span></label>
        <input class="slider is-fullwidth" type="range" min="-180" max="180" step="1"
          :value="hslHueShift"
          @input="onHslHueInput(Number(($event.target as HTMLInputElement).value))" />
        <span class="palette-control-value">{{ hslHueShift }}°</span>
      </div>
      <div class="palette-control-row">
        <label class="palette-control-label"><span class="l1">Saturation Shift</span><span class="l2">Adds or removes chroma globally</span></label>
        <input class="slider is-fullwidth" type="range" min="-100" max="100" step="1"
          :value="satShift"
          @input="onSatInput(Number(($event.target as HTMLInputElement).value))" />
        <span class="palette-control-value">{{ satShift }}</span>
      </div>
      <div class="palette-control-row">
        <label class="palette-control-label"><span class="l1">Lightness Shift</span><span class="l2">Brightens or darkens all palette colors</span></label>
        <input class="slider is-fullwidth" type="range" min="-100" max="100" step="1"
          :value="lumShift"
          @input="onLumInput(Number(($event.target as HTMLInputElement).value))" />
        <span class="palette-control-value">{{ lumShift }}</span>
      </div>

      </section>

      <section v-show="activePaletteSubTab === 'surfaceMaterial'">
      <!-- ═══ FRACTAL SURFACE ═══ -->
      <label class="gfx-section-title">Fractal Surface</label>
      <p class="section-help">Shared relief and shading — applies to the whole render, all stops.</p>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Orbit Trap</span><span class="l2">Emphasizes orbit-distance structure in the surface</span></span>
        <input class="slider" type="range" min="0" max="100" step="0.1" v-model.number="model.orbitTrapStrength" />
        <span class="gfx-slider-value">{{ (model.orbitTrapStrength ?? 0).toFixed(1) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Relief Depth</span><span class="l2">Strength of the generated height field</span></span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.reliefDepth" />
        <span class="gfx-slider-value">{{ (model.reliefDepth ?? 1).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Relief Occlusion</span><span class="l2">Local shadowing from nearby relief details</span></span>
        <input class="slider" type="range" min="0" max="10" step="0.01" v-model.number="model.localShadowStrength" />
        <span class="gfx-slider-value">{{ (model.localShadowStrength ?? 0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Ambient Occlusion</span><span class="l2">Broad contact shading across the fractal surface</span></span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.ambientOcclusionStrength" />
        <span class="gfx-slider-value">{{ (model.ambientOcclusionStrength ?? 0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Light Direction</span><span class="l2">Angle of the main directional light</span></span>
        <input class="slider" type="range" min="0" max="6.283" step="0.01" v-model.number="model.lightAngle" />
        <span class="gfx-slider-value">{{ (model.lightAngle ?? 3.927).toFixed(2) }} rad</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Fine Bump</span><span class="l2">Small-scale normal detail layered on relief</span></span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.microBumpStrength" />
        <span class="gfx-slider-value">{{ (model.microBumpStrength ?? 0).toFixed(2) }}</span>
      </div>
      <!-- ═══ MATERIAL RESPONSE ═══ -->
      <label class="gfx-section-title">Material Response</label>
        <div class="gfx-slider-row">
          <span class="gfx-slider-label"><span class="l1">Varnish Reflection</span><span class="l2">Glossy clear reflection over the material</span></span>
          <input class="slider" type="range" min="0" max="10" step="0.01" v-model.number="model.varnishStrength" />
        <span class="gfx-slider-value">{{ (model.varnishStrength ?? 1.0).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label"><span class="l1">Subsurface Glow</span><span class="l2">Soft internal light bleeding through colors</span></span>
        <input class="slider" type="range" min="0" max="10" step="0.05" v-model.number="model.subsurfaceStrength" />
        <span class="gfx-slider-value">{{ (model.subsurfaceStrength ?? 0).toFixed(2) }}</span>
      </div>
      </section>

      <section v-show="activePaletteSubTab === 'imageEnvironment'">
      <div class="section-label"><span class="tick"></span>Image Layer</div>
      <p class="section-help">Blend an image texture into the fractal surface.</p>

      <div class="frow">
        <div class="lab"><div class="l1">Image Scale</div><div class="l2">Repeats or enlarges the image layer over the fractal</div></div>
        <input class="slider" type="range" min="0.1" max="10" step="0.1" v-model.number="model.tessellationLevel" />
        <span class="val">{{ model.tessellationLevel }}</span>
      </div>
      <div class="frow">
        <div class="lab"><div class="l1">Image Displacement</div><div class="l2">How strongly image brightness offsets the surface relief</div></div>
        <input class="slider" type="range" min="0" max="0.1" step="0.001" v-model.number="model.displacementAmount" />
        <span class="val">&times;{{ (model.displacementAmount ?? 1.0).toFixed(3) }}</span>
      </div>
      <div class="crow">
        <div class="lab"><div class="l1">Mapping preset</div><div class="l2">How the image wraps onto the fractal</div></div>
        <div class="ctl">
          <span class="seg">
            <button :class="{ on: activeTextureMappingLabel === 'Screen Space' }" @click="applyBuiltInTextureMapping('screen')">Screen Space</button>
            <button :class="{ on: activeTextureMappingLabel === 'Dragon Scales' }" @click="applyBuiltInTextureMapping('dragon')">Dragon Scales</button>
            <button :class="{ on: activeTextureMappingLabel !== 'Screen Space' && activeTextureMappingLabel !== 'Dragon Scales' }" type="button">Custom</button>
          </span>
        </div>
      </div>
      <div class="crow">
        <div class="lab"><div class="l1">Mapping X</div><div class="l2">Horizontal coordinate source</div></div>
        <div class="ctl"><div class="select-box"><select v-model="textureMappingXVariable">
          <option v-for="option in TEXTURE_MAPPING_VARIABLE_OPTIONS" :key="'x-' + option.value" :value="option.value">{{ option.label }}</option>
        </select></div></div>
      </div>
      <div class="frow">
        <div class="lab"><div class="l1">X Scale</div><div class="l2">Horizontal tiling frequency for the selected source</div></div>
        <input class="slider" type="range" :min="Math.log10(TEXTURE_MAPPING_SCALE_MIN)" :max="Math.log10(TEXTURE_MAPPING_SCALE_MAX)" step="0.01" v-model.number="textureMappingXScaleSlider" />
        <span class="val">&times;{{ normalizeTextureMappingFromLegacy(model).xScale.toFixed(2) }}</span>
      </div>
      <div class="crow">
        <div class="lab"><div class="l1">Mapping Y</div><div class="l2">Vertical coordinate source</div></div>
        <div class="ctl"><div class="select-box"><select v-model="textureMappingYVariable">
          <option v-for="option in TEXTURE_MAPPING_VARIABLE_OPTIONS" :key="'y-' + option.value" :value="option.value">{{ option.label }}</option>
        </select></div></div>
      </div>
      <div class="frow">
        <div class="lab"><div class="l1">Y Scale</div><div class="l2">Vertical tiling frequency for the selected source</div></div>
        <input class="slider" type="range" :min="Math.log10(TEXTURE_MAPPING_SCALE_MIN)" :max="Math.log10(TEXTURE_MAPPING_SCALE_MAX)" step="0.01" v-model.number="textureMappingYScaleSlider" />
        <span class="val">&times;{{ normalizeTextureMappingFromLegacy(model).yScale.toFixed(2) }}</span>
      </div>
      <div class="trow">
        <div class="lab"><div class="l1">Mirror texture</div><div class="l2">Avoids visible seams when the image tiles</div></div>
        <div class="toggle" :class="{ on: textureMappingMirror }" role="switch" :aria-checked="textureMappingMirror" tabindex="0"
          @click="textureMappingMirror = !textureMappingMirror"
          @keydown.enter.prevent="textureMappingMirror = !textureMappingMirror"
          @keydown.space.prevent="textureMappingMirror = !textureMappingMirror"></div>
      </div>

      <div class="section-label"><span class="tick"></span>Texture Mapping Presets</div>
      <p class="section-help">Save or reuse coordinate mappings independently from the selected image.</p>
      <div class="grid texture-grid">
        <div
          v-for="preset in textureMappingPresets"
          :key="preset.guid"
          class="card texture-card"
          :class="{ sel: activeTextureMappingLabel === preset.name }"
          @click="selectTextureMappingPresetFromDropdown(preset)"
        >
          <span class="sel-badge">Applied</span>
          <div class="thumb thumb-empty mapping-thumb"><i class="fa-solid fa-vector-square" aria-hidden="true"></i></div>
          <div class="acts">
            <button
              v-if="isAdmin && !preset.builtIn"
              class="abtn"
              :class="uploadButtonClasses(uploadSuccessKey('texture-mapping', preset.guid), preset.remote)"
              type="button"
              :title="uploadButtonTitle(uploadSuccessKey('texture-mapping', preset.guid), preset.remote)"
              @click.stop.prevent="uploadTextureMappingPreset(preset)"
            >
              <i :class="uploadButtonIcon(uploadSuccessKey('texture-mapping', preset.guid))"></i>
            </button>
            <button class="abtn heart" :class="{ faved: preset.favorite }" type="button" :disabled="preset.builtIn" title="Favorite" @click.stop.prevent="toggleTextureMappingFavorite(preset)">
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
            </button>
            <button v-if="!preset.builtIn && canDeleteCatalogEntry(userRole, preset.remote)" class="abtn del" type="button" title="Delete" @click.stop.prevent="deleteTextureMappingPreset(preset)">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
            </button>
          </div>
          <div class="info">
            <div class="nm">{{ preset.name }}</div>
            <div class="sub"><span>{{ preset.builtIn ? 'Built-in mapping' : 'Saved mapping' }}</span></div>
          </div>
        </div>
        <div v-if="textureMappingPresets.length === 0" class="empty">No texture mapping presets saved yet.</div>
      </div>
      <div class="save-row texture-save-row">
        <input class="txt-in" v-model="textureMappingPresetName" type="text" placeholder="Mapping preset name..."
          @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
          @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
          @keyup.enter="saveTextureMappingPreset"
        />
        <button class="save-btn" @click="saveTextureMappingPreset"><svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>Save</button>
      </div>

      <div class="section-label"><span class="tick"></span>Image Texture</div>
      <p class="section-help">Click a texture to use it as the image layer.</p>
      <div class="grid texture-grid">
        <div v-for="tex in textures" :key="tex.name" class="card texture-card" :class="{ sel: selectedTexture === tex.name }" @click="selectTextureFromDropdown(tex)">
          <span class="sel-badge">Applied</span>
          <img v-if="tex.thumbnail" :src="tex.thumbnail" alt="thumbnail" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="acts">
            <button v-if="isAdmin" class="abtn" :class="uploadButtonClasses(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)" type="button" :disabled="!canUploadTexture(tex)" :title="uploadButtonTitle(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)" @click.stop.prevent="uploadTexture(tex)">
              <i :class="uploadButtonIcon(uploadSuccessKey('texture', tex.guid || tex.name))"></i>
            </button>
            <button class="abtn heart" :class="{ faved: tex.favorite }" type="button" title="Favorite" :disabled="BUILT_IN_TEXTURE_NAMES.has(tex.name)" @click.stop.prevent="toggleTextureFavorite(tex)">
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
            </button>
            <button v-if="!BUILT_IN_TEXTURE_NAMES.has(tex.name) && canDeleteCatalogEntry(userRole, tex.remote)" class="abtn del" type="button" title="Delete" @click.stop.prevent="deleteTextureByName(tex.name)">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
            </button>
          </div>
          <div class="info"><div class="nm">{{ tex.name }}</div><div class="sub"><span>{{ BUILT_IN_TEXTURE_NAMES.has(tex.name) ? 'Built-in texture' : 'Saved texture' }}</span></div></div>
        </div>
        <div v-if="textures.length === 0" class="empty">No image textures available.</div>
      </div>
      <div class="transfer texture-transfer">
        <button class="tbtn primary" @click="triggerImportTexture"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>Import image</button>
        <button class="tbtn danger" @click="deleteTexture" :disabled="!textureName || BUILT_IN_TEXTURE_NAMES.has(textureName)"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>Delete selected</button>
        <input ref="textureFileInput" type="file" accept="image/*" style="display:none;" @change="importTexture" />
      </div>

      <div class="section-label"><span class="tick"></span>Environment Map</div>
      <p class="section-help">Select the image used for glossy and ambient environment reflections.</p>
      <div class="grid texture-grid">
        <div v-for="tex in textures" :key="'skybox-card-' + tex.name" class="card texture-card" :class="{ sel: selectedSkyboxTexture === tex.name }" @click="selectSkyboxFromDropdown(tex)">
          <span class="sel-badge">Applied</span>
          <img v-if="tex.thumbnail" :src="tex.thumbnail" alt="thumbnail" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="acts">
            <button v-if="isAdmin" class="abtn" :class="uploadButtonClasses(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)" type="button" :disabled="!canUploadTexture(tex)" :title="uploadButtonTitle(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)" @click.stop.prevent="uploadTexture(tex)">
              <i :class="uploadButtonIcon(uploadSuccessKey('texture', tex.guid || tex.name))"></i>
            </button>
            <button class="abtn heart" :class="{ faved: tex.favorite }" type="button" title="Favorite" :disabled="BUILT_IN_TEXTURE_NAMES.has(tex.name)" @click.stop.prevent="toggleTextureFavorite(tex)">
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
            </button>
            <button v-if="!BUILT_IN_TEXTURE_NAMES.has(tex.name) && canDeleteCatalogEntry(userRole, tex.remote)" class="abtn del" type="button" title="Delete" @click.stop.prevent="deleteTextureByName(tex.name)">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
            </button>
          </div>
          <div class="info"><div class="nm">{{ tex.name }}</div><div class="sub"><span>{{ BUILT_IN_TEXTURE_NAMES.has(tex.name) ? 'Built-in map' : 'Saved map' }}</span></div></div>
        </div>
        <div v-if="textures.length === 0" class="empty">No environment maps available.</div>
      </div>
      <div class="transfer texture-transfer">
        <button class="tbtn primary" @click="triggerImportSkybox"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>Import image</button>
        <button class="tbtn danger" @click="deleteSkyboxTexture" :disabled="!skyboxName || BUILT_IN_TEXTURE_NAMES.has(skyboxName)"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>Delete selected</button>
        <input ref="skyboxFileInput" type="file" accept="image/*" style="display:none;" @change="importSkyboxTexture" />
      </div>
      </section>

      <section v-show="activePaletteSubTab === 'library'">
      <div class="section-label"><span class="tick"></span>Saved Palettes</div>
      <p class="section-help">Colors only — applying a palette keeps your current material and mapping.</p>
      <div class="lib-bar">
        <button class="fav-filter" :class="{ on: showOnlyFavoritePalettes }" type="button" :aria-pressed="showOnlyFavoritePalettes" @click="showOnlyFavoritePalettes = !showOnlyFavoritePalettes">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          Favorites
        </button>
        <span class="count">{{ visiblePalettes.length }} palette{{ visiblePalettes.length === 1 ? '' : 's' }}</span>
      </div>
      <div class="grid palette-library-grid saved-palette-grid" style="max-height:228px;">
        <div v-for="palette in visiblePalettes" :key="palette.name" class="card palette-card" :class="{ sel: selectedPalette === palette.name }" @click="selectPaletteFromDropdown(palette)">
          <span class="sel-badge">Applied</span>
          <img v-if="palette.thumbnail" :src="palette.thumbnail" alt="thumbnail" class="thumb palette-thumb" />
          <div v-else class="thumb thumb-empty palette-thumb"></div>
          <div class="acts">
            <button v-if="isAdmin" class="abtn" :class="uploadButtonClasses(uploadSuccessKey('palette', palette.name), palette.remote)" type="button" :title="uploadButtonTitle(uploadSuccessKey('palette', palette.name), palette.remote)" @click.stop.prevent="uploadPalettePreset(palette)">
              <i :class="uploadButtonIcon(uploadSuccessKey('palette', palette.name))"></i>
            </button>
            <button class="abtn heart" :class="{ faved: palette.favorite }" title="Favorite" @click.stop.prevent="togglePaletteFavorite(palette.name)">
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
            </button>
            <button class="abtn" title="Export" @click.stop.prevent="exportPaletteByName(palette.name)">
              <svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 21h14"/></svg>
            </button>
            <button v-if="canDeleteCatalogEntry(userRole, palette.remote)" class="abtn del" title="Delete" @click.stop.prevent="deletePaletteByName(palette.name)">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
            </button>
          </div>
          <div class="info"><div v-if="displayName(palette.name)" class="nm">{{ displayName(palette.name) }}</div><div class="sub"><span>{{ formatPresetDate(palette.date) }}</span></div></div>
        </div>
        <div v-if="visiblePalettes.length === 0" class="empty">{{ showOnlyFavoritePalettes ? 'No favorite palettes yet.' : 'No saved palettes yet.' }}</div>
      </div>
      <div class="save-row palette-save-row">
        <input class="txt-in" v-model="paletteName" type="text" placeholder="Save current palette as..."
          @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
          @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
          @keyup.enter="savePalette"
        />
        <button class="save-btn" @click="savePalette"><svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>Save</button>
      </div>


      <div class="section-label"><span class="tick"></span>Full Presets</div>
      <p class="section-help">A full look — colors, interpolation, cycle mapping and material. Click to apply everything.</p>
      <div class="lib-bar">
        <button class="fav-filter" :class="{ on: showOnlyFavoritePalettePresets }" type="button" :aria-pressed="showOnlyFavoritePalettePresets" @click="showOnlyFavoritePalettePresets = !showOnlyFavoritePalettePresets">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          Favorites
        </button>
        <span class="count">{{ visiblePalettePresets.length }} preset{{ visiblePalettePresets.length === 1 ? '' : 's' }}</span>
      </div>
      <div class="grid palette-library-grid full-preset-grid" style="max-height:264px;">
        <div v-for="preset in visiblePalettePresets" :key="preset.id" class="card" :class="{ sel: selectedPalettePreset === preset.id }" @click="selectPalettePresetFromDropdown(preset)">
          <span class="sel-badge">Applied</span>
          <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="thumbnail" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="acts">
            <button v-if="isAdmin" class="abtn" :class="uploadButtonClasses(uploadSuccessKey('preset', preset.id), preset.remote)" type="button" :title="uploadButtonTitle(uploadSuccessKey('preset', preset.id), preset.remote)" @click.stop.prevent="uploadCompletePreset(preset.id)">
              <i :class="uploadButtonIcon(uploadSuccessKey('preset', preset.id))"></i>
            </button>
            <button class="abtn heart" :class="{ faved: preset.favorite }" title="Favorite" @click.stop.prevent="togglePresetFavorite(preset.id)">
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
            </button>
            <button class="abtn" title="Export" @click.stop.prevent="exportPresetById(preset.id)">
              <svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 21h14"/></svg>
            </button>
            <button class="abtn del" title="Delete" @click.stop.prevent="deletePresetById(preset.id)">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
            </button>
          </div>
          <div class="info">
            <div v-if="displayName(preset.name)" class="nm">{{ displayName(preset.name) }}</div>
            <div class="sub"><span>{{ formatPresetDate(preset.date) }}</span><span v-if="preset.scaleExponent > 0" class="depth">{{ formatZoom(preset.scaleExponent) }}</span></div>
          </div>
        </div>
        <div v-if="visiblePalettePresets.length === 0" class="empty">{{ showOnlyFavoritePalettePresets ? 'No favorite full presets yet.' : 'No full presets available.' }}</div>
      </div>

      <div class="section-label"><span class="tick"></span>Transfer</div>
      <div class="transfer">
        <button class="tbtn primary" @click="triggerImportPalettes"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>Import</button>
        <button class="tbtn" @click="exportPalettes" :disabled="palettes.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>Export all</button>
        <button class="tbtn" @click="exportSelectedPalette" :disabled="!selectedPalette"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>Export selected</button>
        <button class="tbtn" @click="exportFavoritePalettes" :disabled="favoritePalettes.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/></svg>Export favorites</button>
        <button class="tbtn danger" @click="deleteAllPalettes" :disabled="palettes.length === 0"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>Delete all</button>
        <input ref="paletteFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPalettes" />
      </div>
      </section>
    </div>

    <!-- Performance/Graphics tab -->
    <div v-else-if="activeTab === 'performance'" class="graphics-tab">

      <!-- ═══ PERFORMANCE ═══ -->
      <label class="gfx-section-title">Performance</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Epsilon</span>
        <input class="slider" type="range" min="-30" max="0" step="0.01" v-model="epsilonSlider" />
        <span class="gfx-slider-value">{{ (model.epsilon ?? 1e-8).toExponential(1) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Zoom brush step</span>
        <input class="slider" type="range" min="0" max="6" step="1" v-model.number="zoomMinBrushStepIndex" aria-label="Zoom brush step" />
        <span class="gfx-slider-value">{{ model.zoomMinBrushStep }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Sentinel seed step</span>
        <input class="slider" type="range" min="0" max="12" step="1" v-model.number="sentinelSeedStepIndex" aria-label="Sentinel seed step" />
        <span class="gfx-slider-value">{{ model.sentinelSeedStep }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Approximation</span>
        <div class="buttons has-addons toggle-buttons" style="margin-bottom:0;">
          <button
            class="button is-small"
            :class="model.approximationMode !== 'bla' ? 'is-link' : 'is-light'"
            @click="model.approximationMode = 'perturbation'"
          >
            <i class="fa-solid fa-calculator fa-fw mr-1"></i> Perturbation
          </button>
          <button
            class="button is-small"
            :class="model.approximationMode === 'bla' ? 'is-link' : 'is-light'"
            @click="model.approximationMode = 'bla'"
          >
            <i class="fa-solid fa-chart-line fa-fw mr-1"></i> BLA
          </button>
        </div>
        <span class="gfx-slider-value">{{ model.approximationMode === 'bla' ? 'BLA' : 'Classic' }}</span>
      </div>
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

      <hr class="section-sep" />

      <!-- ═══ ADVANCED ═══ -->
      <label class="gfx-section-title">Advanced</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Debug Shading</span>
        <div style="flex: 1 1 auto; display: flex; align-items: center;">
          <input type="checkbox" v-model="model.debugShading" />
        </div>
        <span class="gfx-slider-value">{{ model.debugShading ? 'On' : 'Off' }}</span>
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

/* ── Force light text across all tabs for dark mode ── */
:deep(.label),
:deep(.checkbox),
:deep(.help),
:deep(.control-label),
:deep(.title),
:deep(.subtitle),
:deep(.dropdown-item) {
  color: var(--ink) !important;
}

:deep(.dropdown-content) {
  background-color: var(--panel-2) !important;
  border: 1px solid var(--line) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}

:deep(.dropdown-item:hover),
:deep(.dropdown-item.is-active) {
  background-color: var(--row-on) !important;
  color: var(--ink) !important;
}

.settings-container {
  font-family: var(--sans);
  color: var(--ink);
}

/* Custom slider styling matching the model */
:deep(input[type=range]) {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--track) !important;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}
:deep(input[type=range]::-webkit-slider-thumb) {
  -webkit-appearance: none;
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright) !important;
  border: 3px solid #0b0d12 !important;
  box-shadow: 0 0 0 1px var(--accent), 0 4px 12px -2px var(--accent) !important;
  cursor: pointer;
  transition: .12s;
}
:deep(input[type=range]::-webkit-slider-thumb:hover) {
  transform: scale(1.12);
}
:deep(input[type=range]::-moz-range-thumb) {
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright) !important;
  border: 3px solid #0b0d12 !important;
  box-shadow: 0 0 0 1px var(--accent) !important;
  cursor: pointer;
}

/* Custom dark styling for standard controls */
:deep(.input) {
  background-color: #0b0d12 !important;
  border: 1px solid var(--line) !important;
  color: var(--ink) !important;
  border-radius: 10px !important;
}
:deep(.input:focus) {
  border-color: var(--accent) !important;
  box-shadow: none !important;
}

:deep(.select select) {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: 100%;
  font-family: var(--mono) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--ink) !important;
  background: #0b0d12 !important;
  border: 1px solid var(--line) !important;
  border-radius: 10px !important;
  padding: 8px 34px 8px 14px !important;
  cursor: pointer;
  text-transform: lowercase !important;
}
:deep(.select::after) {
  border-right: 2px solid var(--ink-3) !important;
  border-bottom: 2px solid var(--ink-3) !important;
  border-left: 0 !important;
  border-top: 0 !important;
  content: "" !important;
  display: block !important;
  height: 7px !important;
  margin-top: -6px !important;
  position: absolute !important;
  right: 14px !important;
  top: 50% !important;
  transform: rotate(45deg) !important;
  transform-origin: center !important;
  width: 7px !important;
  pointer-events: none !important;
  z-index: 4 !important;
}
:deep(.select select:focus) {
  border-color: var(--accent) !important;
  outline: none !important;
}

:deep(.button) {
  background-color: var(--row) !important;
  border: 1px solid var(--line) !important;
  color: var(--ink-2) !important;
  font-family: var(--sans) !important;
  font-weight: 600 !important;
  border-radius: 11px !important;
  transition: .16s !important;
}
:deep(.button:hover) {
  color: var(--ink) !important;
  background-color: var(--panel-2) !important;
  border-color: var(--line) !important;
}
:deep(.button.is-link) {
  background-color: var(--accent) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 22px -10px var(--accent) !important;
}
:deep(.button.is-link:hover) {
  background-color: var(--accent-bright) !important;
}
:deep(.button.is-warning) {
  background-color: var(--magenta) !important;
  color: #fff !important;
  border: none !important;
}
:deep(.button.is-danger) {
  background-color: oklch(0.60 0.18 20) !important;
  color: #fff !important;
  border: none !important;
}

/* Invert HR */
:deep(.section-sep) {
  border-top: 1px solid var(--line) !important;
}

/* ── Graphics tab layout ── */
.graphics-tab {
  color: var(--ink);
}
.animation-tab {
  color: var(--ink);
  min-width: 0;
}

/* ---------- Playback ---------- */
.playback {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--row);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 16px;
  margin-bottom: 20px;
}
.play-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  border-radius: 11px;
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  font-family: var(--sans);
  font-weight: 700;
  font-size: var(--font-lg);
  letter-spacing: .02em;
  transition: .16s;
  box-shadow: 0 8px 22px -10px var(--accent);
}
.play-btn:hover {
  background: var(--accent-bright);
}
.play-btn.paused {
  background: var(--row-on);
  color: var(--ink);
  box-shadow: none;
  border: 1px solid var(--line);
}
.play-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
.pb-label {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 14px;
  color: var(--ink-2);
  white-space: nowrap;
}
.pb-slider {
  flex: 1;
  display: flex;
  align-items: center;
}
.pb-slider input[type="range"] {
  width: 100%;
}
.pb-val {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--accent);
  font-weight: 700;
  min-width: 50px;
  text-align: right;
}
.compact-library {
  margin-top: 0.55em;
  margin-bottom: 0.8em;
}
.palette-library-label {
  display: block;
  font-size: 0.86em;
  font-weight: 600;
  color: var(--ink-2);
  margin-bottom: 0.32em;
}
.palette-library-hint {
  font-size: 0.8em;
  color: var(--ink-3);
  margin-bottom: 0.45em;
  line-height: 1.25;
}

.mixer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: grid;
  grid-template-columns: 248px 124px 1fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 11px;
  position: relative;
  transition: .18s;
}
.row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  background: transparent;
  transition: .18s;
}
.row.on {
  background: var(--row-on);
  border-color: #2b3340;
}
.row.on::before {
  background: var(--accent-bright);
  box-shadow: 0 0 12px var(--accent);
}
.row.off .ctl {
  opacity: 0.4;
  pointer-events: none;
}
.row.off .name {
  color: var(--ink-3);
}

/* toggle + name */
.name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.toggle {
  --w: 38px;
  --h: 22px;
  width: var(--w);
  height: var(--h);
  flex: none;
  border-radius: 999px;
  background: var(--track);
  border: 1px solid var(--line);
  position: relative;
  cursor: pointer;
  transition: .18s;
}
.toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: .18s;
}
.toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}
.toggle.on::after {
  left: 18px;
  background: #fff;
}
.name {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* waveform select */
.wave {
  position: relative;
}
.wave select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  background: #0b0d12;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 30px 6px 12px;
  cursor: pointer;
  text-transform: lowercase;
}
.wave::after {
  content: "";
  position: absolute;
  right: 13px;
  top: 50%;
  transform: translateY(-60%) rotate(45deg);
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--ink-3);
  border-bottom: 2px solid var(--ink-3);
  pointer-events: none;
}
.wave select:focus {
  outline: none;
  border-color: var(--accent);
}

/* param group: label / slider / value */
.param {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.param .plabel {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ink-3);
  width: 46px;
}
.param .pval {
  font-family: var(--mono);
  font-weight: 700;
  font-size: var(--font-md);
  color: var(--ink);
  min-width: 88px;
  text-align: right;
  white-space: nowrap;
}
.param .pval .unit {
  font-size: 12px;
  color: var(--ink-3);
  margin-left: 3px;
  font-weight: 600;
}

/* ---------- Section title ---------- */
.gfx-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 20px 0 16px;
}
.gfx-section-title::before {
  content: "";
  width: 6px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--accent-bright), var(--mauve));
  display: inline-block;
}
.gfx-section-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line-soft);
}

.gfx-hint {
  font-size: 0.82em;
  color: var(--ink-2);
  margin-bottom: 0.45em;
  line-height: 1.3;
}
.palette-canvas-panel {
  --palette-label-width: var(--label-w);
}
.palette-strip-zone {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  margin: 8px 0 16px;
}
.palette-strip-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 0 0 10px !important;
}
.palette-strip-bar .color-picker-row {
  flex: 1 1 auto;
  min-width: 0;
}
.palette-strip-bar .picker-hint {
  color: var(--ink-3);
  font-size: 13px;
}
.palette-strip-bar .outils-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.palette-strip {
  margin-bottom: 0 !important;
  overflow: hidden;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: #07080d;
}
.palette-canvas-panel .pipette-btn,
.palette-canvas-panel .outils-btn.button {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  padding: 0 !important;
  border-radius: 9px !important;
  border: 1px solid var(--line) !important;
  background: var(--row-on) !important;
  color: var(--ink-2) !important;
}
.palette-canvas-panel .pipette-btn:hover,
.palette-canvas-panel .outils-btn.button:hover {
  color: var(--ink) !important;
  border-color: #333a47 !important;
}
.palette-canvas-panel .pipette-btn.is-active {
  background: var(--accent) !important;
  color: #fff !important;
  border-color: var(--accent) !important;
}
.gfx-slider-row,
.palette-control-row {
  display: grid;
  grid-template-columns: var(--palette-label-width) minmax(0, 1fr) var(--value-w);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-1);
}
.gfx-slider-row input[type="range"],
.palette-control-row input[type="range"] {
  min-width: 0;
}
.gfx-slider-label,
.palette-control-label {
  font-size: var(--font-md);
  color: var(--ink);
  font-weight: 600;
  line-height: 1.2;
}
.gfx-slider-label .l1,
.palette-control-label .l1,
.palette-compact-label .l1 {
  display: block;
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.gfx-slider-label .l2,
.palette-control-label .l2,
.palette-compact-label .l2 {
  display: block;
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
}
.gfx-slider-value,
.palette-control-value {
  text-align: right;
  font-family: var(--mono);
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.palette-subtabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}
/* Canvas-style subtab pills (canvas/Palettes Panel — .subtab) */
.palette-subtab-button.button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--sans);
  font-weight: 600;
  font-size: var(--font-md);
  color: var(--ink-2);
  background: var(--row);
  border: 1px solid var(--line-soft);
  transition: 0.15s;
}
.palette-subtab-button.button.is-light:hover {
  color: var(--ink);
  background: var(--row-on);
}
.palette-subtab-button.button.is-link {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 6px 18px -8px var(--accent);
}
.palette-top-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.palette-icon-toggle {
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  height: auto;
  padding: var(--space-3) var(--space-4) !important;
  font-size: var(--font-lg);
  border-radius: var(--radius-md) !important;
  border-color: var(--line-soft) !important;
  color: var(--ink) !important;
  background: var(--row) !important;
}
.palette-icon-toggle.is-active {
  border-color: var(--accent) !important;
  color: #fff !important;
  background: var(--accent) !important;
}
.palette-compact-control {
  display: grid;
  grid-template-columns: var(--palette-label-width) minmax(0, 1fr) var(--value-w);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-1);
  min-width: 0;
}
.palette-compact-control input[type="range"] {
  min-width: 0;
}
.palette-compact-label {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.palette-compact-value {
  font-family: var(--mono);
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
@media (max-width: 520px) {
  .palette-subtabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .gfx-slider-row,
  .palette-control-row,
  .palette-compact-control {
    grid-template-columns: 1fr 82px;
  }
  .gfx-slider-label,
  .palette-control-label,
  .palette-compact-label {
    grid-column: 1 / -1;
  }
}
.palette-button-group {
  flex: 1 1 auto;
  min-width: 0;
  margin-bottom: 0 !important;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  background: var(--row);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.palette-button-group .control {
  margin: 0 !important;
}
.palette-button-group .button {
  border: 0 !important;
  border-radius: 7px !important;
  background: transparent !important;
  color: var(--ink-3) !important;
  box-shadow: none !important;
  font-family: var(--sans) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  padding: 8px 12px !important;
  height: auto !important;
}
.palette-button-group .button:hover {
  color: var(--ink-2) !important;
}
.palette-button-group .button.is-link {
  background: var(--accent-soft) !important;
  color: var(--accent-bright) !important;
  box-shadow: 0 0 0 1px oklch(0.7 0.17 245 / 0.5) inset !important;
}

/* ---------- Favorites ---------- */
.favorite-row {
  position: relative;
  padding-right: 5.7em !important;
}
.favorite-row.has-delete {
  padding-right: 7.7em !important;
}
.favorite-row.has-delete .favorite-button {
  right: 3.05em;
}
.favorite-row.has-delete .favorite-button.upload-button {
  right: 5.4em;
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
.favorite-button.upload-button {
  right: 3.05em;
}
.delete-preset-button {
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
.delete-preset-button .favorite-heart {
  color: #fff;
}
.delete-preset-button:hover .favorite-heart {
  color: #ff3860;
}
.favorite-button.upload-button.is-remote .favorite-heart,
.favorite-button.upload-button.is-remote:hover .favorite-heart {
  color: #4fb7ff;
}
.favorite-button.upload-button.is-remote::after {
  content: "✓";
  position: absolute;
  right: 0.12em;
  bottom: 0.05em;
  width: 0.95em;
  height: 0.95em;
  border-radius: 999px;
  background: #27c46a;
  color: #fff;
  font-size: 0.62em;
  font-weight: 800;
  line-height: 0.95em;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.favorite-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.favorite-heart {
  font-size: 1.35em;
  line-height: 1;
  color: #fff;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.85));
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
}
.favorite-button.is-upload-success .favorite-heart,
.favorite-button.is-upload-success:hover .favorite-heart {
  color: #27c46a;
}
.favorite-filter {
  margin-bottom: 0.55em;
  gap: 0.35em;
  color: var(--ink-3);
  border-color: var(--line) !important;
  background-color: var(--row) !important;
}
.favorite-filter.is-active {
  border-color: #ec3d7a !important;
  color: #ec3d7a !important;
}
.favorite-filter-heart {
  line-height: 1;
  color: inherit;
}
/* ── Palette preview toolbar styles ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
  flex-wrap: wrap;
}
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.outils-bar {
  display: flex;
  gap: 0.2em;
}
.outils-btn {
  font-size: 0.72em !important;
  padding: 0.2em 0.5em !important;
  min-width: 0 !important;
}

.canvas-row {
  display: flex;
  justify-content: center;
  overflow: visible;
  position: relative;
  height: 56px;
  border-radius: var(--radius-md);
}
/* tighter margin under the palette preview strip (overrides generic .mb-3) */
.canvas-row.palette-strip.mb-3 {
  margin-bottom: var(--space-3);
}
.canvas-shadow-overlay {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  pointer-events: none;
  box-shadow: 0 8px 26px -12px #000 inset, 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  z-index: 2;
}
.handles-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}
.floating-delete-btn {
  position: absolute;
  top: -24px;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-2);
  color: oklch(0.70 0.18 20);
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 20;
  line-height: 1;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.floating-delete-btn:hover {
  border-color: oklch(0.60 0.18 20);
  background: oklch(0.60 0.18 20);
  color: #fff;
  box-shadow: 0 3px 8px rgba(195, 68, 68, 0.32);
  transform: translateX(-50%) translateY(-1px);
}
.pipette-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--row);
  color: var(--ink);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.pipette-btn:hover {
  background: var(--panel-2);
  border-color: var(--ink-3);
}
.pipette-btn.is-active {
  background: oklch(0.60 0.18 20);
  border-color: oklch(0.60 0.18 20);
  color: #fff;
}
.picker-hint {
  font-size: 0.82em;
  color: oklch(0.60 0.18 20);
  font-weight: 500;
  white-space: nowrap;
}

/* =========================================================================
   Canvas design system — shared by Navigation, Presets & Palettes panels
   (mockups: canvas/Navigation Panel.html, Presets Panel.html, Palettes Panel)
   ========================================================================= */
.cv-body {
  font-family: var(--sans);
  color: var(--ink);
}

/* section label with gradient tick */
.cv-body .section-label {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-md);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: var(--space-5) 0 var(--space-1);
}
.cv-body .section-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line-soft);
}
.cv-body .section-label .tick {
  width: 6px;
  height: 14px;
  border-radius: 3px;
  flex: none;
  background: linear-gradient(180deg, var(--accent-bright), var(--mauve));
}
.cv-body .section-label:first-child {
  margin-top: 0;
}
.cv-body .section-help {
  font-size: var(--font-md);
  color: var(--ink-3);
  margin: 2px 0 var(--space-3);
  line-height: 1.4;
}

/* generic row : [label+sub] [control] [value] */
.cv-body .frow {
  display: grid;
  grid-template-columns: var(--label-w) 1fr 92px;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-1);
}
.cv-body .frow .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.cv-body .frow .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
}
.cv-body .frow .val,
.cv-body .coords .val {
  font-family: var(--mono);
  font-weight: 700;
  font-size: var(--font-md);
  color: var(--ink);
  text-align: right;
  white-space: nowrap;
}
.cv-body .frow .val .unit {
  font-size: 11px;
  color: var(--ink-3);
  margin-left: 2px;
}

/* coordinates card */
.cv-body .coords {
  display: grid;
  grid-template-columns: var(--label-w) 1fr auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}
.cv-body .coords .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
}
.cv-body .coords .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}
.cv-body .coords .vals {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.cv-body .coords .vals .cline {
  display: flex;
  gap: 10px;
  white-space: nowrap;
  overflow: hidden;
}
.cv-body .coords .vals .ax {
  color: var(--ink-4);
  flex: none;
  width: 24px;
}
.cv-body .coords .vals .num {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
}
.cv-body .copy {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--row-on);
  color: var(--ink-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: 0.15s;
  flex: none;
}
.cv-body .copy:hover {
  color: var(--ink);
  border-color: #333a47;
}
.cv-body .copy svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
}
.cv-body .copy.ok {
  color: oklch(0.78 0.16 150);
  border-color: oklch(0.5 0.13 150 / 0.5);
}

/* sliders */
.cv-body input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--track);
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}
.cv-body input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright);
  border: 3px solid #0b0d12;
  box-shadow: 0 0 0 1px var(--accent), 0 4px 12px -2px var(--accent);
  cursor: pointer;
  transition: 0.12s;
}
.cv-body input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}
.cv-body input[type=range]::-moz-range-thumb {
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright);
  border: 3px solid #0b0d12;
  box-shadow: 0 0 0 1px var(--accent);
  cursor: pointer;
}

/* mu : slider + quick button */
.cv-body .mu-ctl {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cv-body .mu-ctl input {
  flex: 1;
}
.cv-body .mu-quick {
  flex: none;
  background: #0b0d12;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--accent-bright);
  font-family: var(--mono);
  font-size: 12.5px;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
  transition: 0.15s;
}
.cv-body .mu-quick:hover {
  background: var(--row-on);
  color: var(--ink);
}

/* toggle switch */
.cv-body .toggle {
  width: 46px;
  height: 26px;
  flex: none;
  border-radius: 999px;
  background: var(--track);
  border: 1px solid var(--line);
  position: relative;
  cursor: pointer;
  transition: 0.18s;
}
.cv-body .toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #8a91a1;
  transition: 0.18s;
}
.cv-body .toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}
.cv-body .toggle.on::after {
  left: 22px;
  background: #fff;
}
.cv-body .trow {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}
.cv-body .trow .lab {
  flex: 1;
}
.cv-body .trow .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
}
.cv-body .trow .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}
.cv-body .crow {
  display: grid;
  grid-template-columns: var(--label-w) 1fr;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}
.cv-body .crow .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.cv-body .crow .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
}
.cv-body .crow .ctl {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.cv-body .seg {
  display: inline-flex;
  gap: 4px;
  background: var(--row);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 4px;
  flex-wrap: wrap;
}
.cv-body .seg button {
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  transition: 0.15s;
}
.cv-body .seg button:hover {
  color: var(--ink-2);
}
.cv-body .seg button.on {
  background: var(--accent-soft);
  color: var(--accent-bright);
  box-shadow: 0 0 0 1px oklch(0.7 0.17 245 / 0.5) inset;
}
.cv-body .select-box {
  position: relative;
  flex: 1;
  min-width: 0;
}
.cv-body .select-box select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  font-family: var(--mono);
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--ink);
  background: #0b0d12;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-2) 36px var(--space-2) var(--space-4);
  cursor: pointer;
}
.cv-body .select-box::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-60%) rotate(45deg);
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--ink-3);
  border-bottom: 2px solid var(--ink-3);
  pointer-events: none;
}
.cv-body .select-box select:focus {
  outline: none;
  border-color: var(--accent);
}

/* library row : favorites filter + preset picker */
.cv-body .lib-row {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}
.cv-body .lib-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.cv-body .count {
  font-family: var(--mono);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
  margin-left: auto;
}
.cv-body .fav-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 0 16px;
  border-radius: 12px;
  cursor: pointer;
  background: var(--row);
  border: 1px solid var(--line-soft);
  color: var(--ink-2);
  font-family: var(--sans);
  font-weight: 600;
  font-size: 14px;
  transition: 0.15s;
}
.cv-body .lib-bar .fav-filter {
  padding: 10px 16px;
  border-radius: 11px;
}
.cv-body .fav-filter svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.9;
}
.cv-body .fav-filter:hover {
  color: var(--ink);
}
.cv-body .fav-filter.on {
  color: var(--mauve-bright);
  border-color: oklch(0.7 0.17 320 / 0.5);
  background: oklch(0.7 0.17 320 / 0.12);
}
.cv-body .fav-filter.on svg {
  fill: currentColor;
}

/* preset picker (rich dropdown styled as canvas select) */
.cv-body .cv-dropdown {
  position: relative;
  flex: 1;
  min-width: 0;
}
.cv-body .cv-dropdown .dropdown-trigger {
  width: 100%;
}
.cv-body .cv-select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  font-family: var(--sans);
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--ink);
  background: #0b0d12;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-3) 40px var(--space-3) var(--space-4);
  cursor: pointer;
  position: relative;
  text-align: left;
}
.cv-body .cv-select-trigger:focus {
  outline: none;
  border-color: var(--accent);
}
.cv-body .cv-trigger-thumb {
  height: 30px;
  width: 52px;
  object-fit: cover;
  border-radius: 5px;
  background: #222;
  flex: none;
}
.cv-body .cv-trigger-label {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cv-body .cv-caret {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-60%) rotate(45deg);
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--ink-3);
  border-bottom: 2px solid var(--ink-3);
  pointer-events: none;
}
.cv-body .cv-dropdown-content {
  max-height: 450px;
  overflow-y: auto;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
}

/* load button */
.cv-body .load-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid oklch(0.7 0.17 245 / 0.4);
  background: var(--accent-soft);
  color: var(--accent-bright);
  font-family: var(--sans);
  font-weight: 700;
  font-size: var(--font-lg);
  cursor: pointer;
  transition: 0.15s;
  margin-bottom: 4px;
}
.cv-body .load-btn:hover {
  background: oklch(0.7 0.17 245 / 0.28);
}
.cv-body .load-btn svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.cv-body .load-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.cv-body .load-note {
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
  margin: 0 0 12px;
}

/* transfer group */
.cv-body .transfer {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
}
.cv-body .transfer .tlab {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  flex: none;
  margin-right: 4px;
}
.cv-body .tbtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 15px;
  border-radius: 9px;
  cursor: pointer;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 13.5px;
  transition: 0.15s;
  background: var(--row-on);
  color: var(--ink-2);
  border: 1px solid var(--line);
}
.cv-body .tbtn:hover {
  color: var(--ink);
  border-color: #333a47;
}
.cv-body .tbtn svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.cv-body .tbtn.primary {
  background: linear-gradient(110deg, var(--accent), var(--mauve));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px -8px var(--mauve);
}
.cv-body .tbtn.primary:hover {
  filter: brightness(1.1);
}
.cv-body .tbtn:disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}
.cv-body .tbtn.danger {
  margin-left: auto;
  color: var(--red);
  border-color: oklch(0.5 0.15 25 / 0.5);
  background: oklch(0.45 0.18 25 / 0.12);
}
.cv-body .tbtn.danger:hover {
  background: oklch(0.5 0.2 25 / 0.22);
  color: oklch(0.72 0.22 25);
}

/* save current view */
.cv-body .save-row {
  display: flex;
  gap: 10px;
}
.cv-body .txt-in {
  flex: 1;
  font-family: var(--sans);
  font-size: var(--font-lg);
  color: var(--ink);
  background: #0b0d12;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}
.cv-body .txt-in::placeholder {
  color: var(--ink-4);
}
.cv-body .txt-in:focus {
  outline: none;
  border-color: var(--accent);
}
.cv-body .save-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: none;
  padding: 0 22px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 45%),
    linear-gradient(110deg, var(--accent), var(--mauve));
  color: #fff;
  font-family: var(--sans);
  font-weight: 700;
  font-size: var(--font-lg);
  cursor: pointer;
  box-shadow: 0 8px 22px -10px var(--mauve);
  transition: 0.15s;
}
.cv-body .save-btn:hover {
  filter: brightness(1.08);
}
.cv-body .save-btn svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}

/* preset card grid — responsive auto-fill (no fixed column count) */
.cv-body .grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--gallery-min), 1fr));
  gap: var(--space-2);
  max-height: 436px;
  overflow-y: auto;
  padding: 2px 6px 2px 2px;
  overscroll-behavior: contain;
}
.cv-body .grid::-webkit-scrollbar {
  width: 8px;
}
.cv-body .grid::-webkit-scrollbar-thumb {
  background: #2a2f3b;
  border-radius: 8px;
}
.cv-body .grid::-webkit-scrollbar-track {
  background: transparent;
}
.cv-body .card {
  position: relative;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 13px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.cv-body .card:hover {
  border-color: #333a47;
  transform: translateY(-2px);
}
.cv-body .card.sel {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 10px 30px -14px var(--accent);
}
.cv-body .card .thumb {
  width: 100%;
  aspect-ratio: 16 / 10;
  display: block;
  background: #000;
  object-fit: cover;
}
.cv-body .card .thumb-empty {
  background: linear-gradient(135deg, #14171f, #0c0e14);
}
.cv-body .card .info {
  padding: 10px 12px 11px;
}
.cv-body .card .nm {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cv-body .card .sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-3);
}
.cv-body .card .depth {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-bright);
  background: var(--accent-soft);
  border-radius: 5px;
  padding: 1px 6px;
}
.cv-body .acts {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateY(-3px);
  transition: 0.15s;
}
.cv-body .card:hover .acts {
  opacity: 1;
  transform: none;
}
.cv-body .abtn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 10, 15, 0.72);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: 0.13s;
}
.cv-body .abtn svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.cv-body .abtn:hover {
  background: rgba(20, 24, 33, 0.9);
}
.cv-body .abtn:disabled {
  opacity: 0.42;
  cursor: default;
  pointer-events: none;
}
.cv-body .abtn.heart.faved {
  color: var(--mauve-bright);
  opacity: 1;
}
.cv-body .card .abtn.heart.faved {
  opacity: 1;
}
.cv-body .abtn.heart.faved svg {
  fill: currentColor;
}
.cv-body .abtn.del:hover {
  color: var(--red);
  border-color: oklch(0.5 0.15 25 / 0.6);
}
.cv-body .sel-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: var(--accent);
  border-radius: 6px;
  padding: 3px 8px;
  display: none;
  z-index: 1;
}
.cv-body .card.sel .sel-badge {
  display: block;
}
.cv-body .empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--ink-3);
  font-size: 14px;
  padding: 40px 0;
}
.cv-body .palette-library-grid,
.cv-body .texture-grid {
  margin-bottom: var(--space-2);
}
.cv-body .palette-thumb {
  aspect-ratio: 16 / 3;
}
.cv-body .saved-palette-grid {
  grid-template-columns: 1fr;
  gap: 1px;
}
.cv-body .saved-palette-grid .palette-card {
  display: grid;
  grid-template-columns: minmax(280px, 54%) minmax(0, 1fr);
  align-items: stretch;
  min-height: 44px;
  border-radius: var(--radius-sm);
}
.cv-body .saved-palette-grid .palette-card:hover {
  transform: translateY(-1px);
}
.cv-body .saved-palette-grid .palette-thumb {
  width: 100%;
  height: 100%;
  min-height: 44px;
  aspect-ratio: auto;
  object-fit: cover;
}
.cv-body .saved-palette-grid .palette-card .info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: var(--space-1) 112px var(--space-1) var(--space-4);
}
.cv-body .saved-palette-grid .palette-card .acts {
  opacity: 1;
  transform: none;
  top: 50%;
  right: 10px;
  translate: 0 -50%;
}
.cv-body .full-preset-grid {
  /* denser cards → smaller min so more columns pack in */
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
}
.cv-body .full-preset-grid .card .thumb {
  aspect-ratio: 16 / 8;
}
.cv-body .full-preset-grid .card .info {
  padding: 8px 10px 9px;
}
.cv-body .full-preset-grid .card .nm {
  font-size: 13px;
}
.cv-body .full-preset-grid .card .sub {
  font-size: 11px;
}
.cv-body .texture-grid {
  max-height: 250px;
}
.cv-body .texture-card .thumb {
  aspect-ratio: 16 / 9;
}
.cv-body .mapping-thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 4;
  color: var(--accent-bright);
  font-size: 22px;
}
.cv-body .palette-save-row,
.cv-body .texture-save-row,
.cv-body .texture-transfer {
  margin-bottom: 14px;
}

@media (max-width: 720px) {
  /* .grid / .full-preset-grid reflow on their own via auto-fill minmax() */
  .cv-body .saved-palette-grid .palette-card {
    grid-template-columns: minmax(160px, 48%) minmax(0, 1fr);
  }
}
@media (max-width: 520px) {
  .cv-body .frow {
    grid-template-columns: 1fr 90px;
  }
  .cv-body .frow .lab {
    grid-column: 1 / -1;
  }
  .cv-body .coords {
    grid-template-columns: 1fr auto;
  }
  .cv-body .coords .lab {
    grid-column: 1 / -1;
  }
  .cv-body .crow {
    grid-template-columns: 1fr;
  }
  .cv-body .saved-palette-grid {
    grid-template-columns: 1fr;
  }
  .cv-body .saved-palette-grid .palette-card {
    grid-template-columns: 1fr;
  }
  .cv-body .save-row {
    flex-direction: column;
  }
  .cv-body .transfer {
    flex-wrap: wrap;
  }
}
</style>
