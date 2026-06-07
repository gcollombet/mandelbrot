<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, toRaw, watch} from 'vue';
import type {InterpolationMode, MandelbrotParams} from "../Mandelbrot.ts";
import type {ColorStop} from '../ColorStop.ts';
import PaletteEditor from './PaletteEditor.vue';
import {Palette} from '../Palette.ts';
import {hsl as d3hsl, rgb as d3rgb} from 'd3-color';
import type {TextureMetadata} from '../textureStore';
import {
  deleteTextureEntry,
  getTextureBlob,
  renameTextureEntry,
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
import type {UserRole} from '../authService';
import {canDeleteCatalogEntry, canOverwriteCatalogPayload, canShowAdminUpload} from '../catalogPermissions';
import {nameForCatalogReference} from '../catalogIdentity';

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
     textureName: 'Gold',
      skyboxName: 'Window',
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
  delete (savedValue as any).activateAnimate;
  delete (savedValue as any).debugShading;
  savedValue.textureName = selectedTexture.value;
  savedValue.textureGuid = currentTextureObj.value?.guid;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  savedValue.skyboxGuid = currentSkyboxObj.value?.guid;
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
  delete (savedValue as any).dprMultiplier;
  delete (savedValue as any).maxIterationMultiplier;
  delete (savedValue as any).antialiasLevel;
  delete (savedValue as any).targetFps;
  delete (savedValue as any).gpuLoadMultiplier;
  delete (savedValue as any).activateAnimate;
  delete (savedValue as any).debugShading;
  savedValue.textureName = selectedTexture.value;
  savedValue.textureGuid = currentTextureObj.value?.guid;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  savedValue.skyboxGuid = currentSkyboxObj.value?.guid;
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
    const snap = paletteEditorRef.value?.getSnapshot?.();
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
    animationSpeed: model.value.animationSpeed,
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
  };
  await savePaletteEntry(palette);
  palettes.value = await getAllPaletteEntries();
  paletteName.value = '';
}

function applyPaletteLookFields(source: Partial<PaletteRecord>): void {
  if (source.animationSpeed != null) model.value.animationSpeed = source.animationSpeed;
  if (source.tessellationLevel != null) model.value.tessellationLevel = source.tessellationLevel;
  if (source.displacementAmount != null) model.value.displacementAmount = source.displacementAmount;
  if (source.ambientOcclusionStrength != null) model.value.ambientOcclusionStrength = source.ambientOcclusionStrength;
  if (source.microBumpStrength != null) model.value.microBumpStrength = source.microBumpStrength;
  if (source.subsurfaceStrength != null) model.value.subsurfaceStrength = source.subsurfaceStrength;
  if (source.reliefDepth != null) model.value.reliefDepth = source.reliefDepth;
  if (source.localShadowStrength != null) model.value.localShadowStrength = source.localShadowStrength;
  if (source.varnishStrength != null) model.value.varnishStrength = source.varnishStrength;
  if (source.orbitTrapStrength != null) model.value.orbitTrapStrength = source.orbitTrapStrength;
  if (source.phaseColoringStrength != null) model.value.phaseColoringStrength = source.phaseColoringStrength;
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
    if (palette.heightPaletteShift != null) model.value.heightPaletteShift = palette.heightPaletteShift;
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

/** Performance fields — never copied from presets */
const PERF_FIELDS: (keyof MandelbrotParams)[] = ['dprMultiplier', 'maxIterationMultiplier', 'antialiasLevel', 'targetFps', 'gpuLoadMultiplier'];

async function deletePalette() {
  const name = paletteName.value.trim();
  if (!name) return;
  const palette = palettes.value.find(item => item.name === name);
  if (!canDeleteCatalogEntry(userRole.value, palette?.remote)) {
    window.alert('Shared catalog palettes cannot be deleted locally.');
    return;
  }
  if (window.confirm(`Delete palette "${name}"? This cannot be undone.`)) {
    await deletePaletteEntry(name);
    palettes.value = await getAllPaletteEntries();
    selectedPalette.value = '';
    paletteName.value = '';
  }
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
    const current = model.value;
    for (const key of PERF_FIELDS) {
      (saved as any)[key] = (current as any)[key];
    }
    model.value = saved;
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
  await loadTextures();
  await syncRemoteCatalog();
  await loadPresets();
  await loadPalettes();
  await loadTextures();
});

onUnmounted(() => {
  uploadSuccessTimers.forEach(timer => clearTimeout(timer));
  uploadSuccessTimers.clear();
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

const paletteSubTabs = [
  { key: 'stops', label: 'Stops' },
  { key: 'color', label: 'Color' },
  { key: 'motionCycle', label: 'Motion / Cycle' },
  { key: 'surfaceMaterial', label: 'Surface / Material' },
  { key: 'imageEnvironment', label: 'Image / Env' },
  { key: 'library', label: 'Library' },
] as const;
const activePaletteSubTab = ref<(typeof paletteSubTabs)[number]['key']>('stops');

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
const skyboxName = ref('Window');
const textures = ref<TextureMetadata[]>([]);
const selectedTexture = ref('Gold');
const selectedSkyboxTexture = ref('Window');
const showTextureDropdown = ref(false);
const showSkyboxDropdown = ref(false);
let suppressTextureApply = false;

const currentTextureObj = computed(() => textures.value.find(t => t.name === selectedTexture.value));
const currentTextureThumbnail = computed(() => currentTextureObj.value?.thumbnail);
const currentSkyboxObj = computed(() => textures.value.find(t => t.name === selectedSkyboxTexture.value));
const currentSkyboxThumbnail = computed(() => currentSkyboxObj.value?.thumbnail);

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

      <label class="gfx-section-title">Render Mapping</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Mu</span>
        <input class="slider" type="range" min="0" max="5" step="0.01" v-model="muSlider" />
        <span class="gfx-slider-value">{{ (model.mu ?? 1.0).toFixed(1) }}</span>
        <button class="button is-small is-light" style="padding: 0 6px; height: 22px; font-size: 0.75em;" @click="model.mu = 4" title="Mu = 4">4</button>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Stripe Frequency</span>
        <input class="slider" type="range" min="1" max="32" step="1" v-model.number="model.stripeFrequency" />
        <span class="gfx-slider-value">{{ model.stripeFrequency ?? 8 }}</span>
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
          <span class="favorite-filter-heart"><i class="fa-heart" :class="showOnlyFavoriteNavigation ? 'fa-solid' : 'fa-regular'"></i></span>
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
              <i class="fa-solid fa-file-import mr-1"></i> Import
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small is-light" @click="exportSelectedNavigationPreset" :disabled="!selectedNavPreset">
              <i class="fa-solid fa-download mr-1"></i> Export Selected Navigation
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small" @click="exportFavoriteNavigationPresets" :disabled="favoritePresets.length === 0">
              <i class="fa-solid fa-star mr-1"></i> Export Favorites
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
          <span class="favorite-filter-heart"><i class="fa-heart" :class="showOnlyFavoritePresets ? 'fa-solid' : 'fa-regular'"></i></span>
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
            <button class="button is-link is-small" @click="savePreset"><i class="fa-solid fa-floppy-disk mr-1"></i> Save</button>
          </div>
        </div>

        <!-- Import / Export Presets -->
        <hr class="section-sep"/>
        <label class="label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPresets" :disabled="presets.length === 0">
              <i class="fa-solid fa-download mr-1"></i> Export
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small is-light" @click="exportSelectedPreset" :disabled="!selectedPreset">
              <i class="fa-solid fa-download mr-1"></i> Export Selected
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small" @click="exportFavoritePresets" :disabled="favoritePresets.length === 0">
              <i class="fa-solid fa-star mr-1"></i> Export Favorites
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPresets">
              <i class="fa-solid fa-file-import mr-1"></i> Import
            </button>
            <input ref="presetFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPresets" />
          </div>
          <div class="control">
            <button class="button is-danger is-small is-light" @click="deleteAllPresets" :disabled="presets.length === 0">
              <i class="fa-solid fa-trash-can mr-1"></i> Delete All
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Palettes tab -->
    <div v-else-if="activeTab === 'palettes'">
      <div class="palette-subtabs">
        <button
          v-for="tab in paletteSubTabs"
          :key="tab.key"
          class="button is-small palette-subtab-button"
          :class="activePaletteSubTab === tab.key ? 'is-link' : 'is-light'"
          type="button"
          @click="activePaletteSubTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <section v-show="activePaletteSubTab === 'stops'">
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
            :subsurface-strength="model.subsurfaceStrength"
            :relief-depth="model.reliefDepth"
            :local-shadow-strength="model.localShadowStrength"
            :varnish-strength="model.varnishStrength"
            :orbit-trap-strength="model.orbitTrapStrength"
            :phase-coloring-strength="model.phaseColoringStrength"
            :is-admin="isAdmin"
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
      </section>

      <section v-show="activePaletteSubTab === 'motionCycle'">
      <div class="palette-top-controls">
        <button
          class="button is-small palette-icon-toggle"
          :class="{ 'is-active': model.activateAnimate }"
          type="button"
          :aria-pressed="model.activateAnimate"
          title="Animate palette offset"
          @click="model.activateAnimate = !model.activateAnimate"
        >
          <i :class="model.activateAnimate ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i>
          <span>Drift</span>
        </button>

        <button
          class="button is-small palette-icon-toggle"
          :class="{ 'is-active': model.debugShading }"
          type="button"
          :aria-pressed="model.debugShading"
          title="Show shading debug sectors"
          @click="model.debugShading = !model.debugShading"
        >
          <i class="fas fa-bug" aria-hidden="true"></i>
          <span>Debug</span>
        </button>

        <button
          class="button is-small palette-icon-toggle"
          :class="{ 'is-active': model.paletteMirror }"
          type="button"
          :aria-pressed="model.paletteMirror"
          title="Mirror palette repetition"
          @click="model.paletteMirror = !model.paletteMirror"
        >
          <i class="fas fa-arrows-left-right" aria-hidden="true"></i>
          <span>Mirror</span>
        </button>

        <div class="palette-compact-control">
          <span class="palette-compact-label">Length</span>
          <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="sliderPalettePeriod" />
          <span class="palette-compact-value">{{ formatPalettePeriod(model.palettePeriod) }}</span>
        </div>

        <div class="palette-compact-control">
          <span class="palette-compact-label">Height Shift</span>
          <input class="slider" type="range" min="0" max="100" step="0.01" v-model.number="model.heightPaletteShift" />
          <span class="palette-compact-value">{{ (model.heightPaletteShift ?? 0).toFixed(2) }}</span>
        </div>

        <div class="palette-compact-control">
          <span class="palette-compact-label">Offset</span>
          <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="model.paletteOffset" />
          <span class="palette-compact-value">{{ (model.paletteOffset * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <label class="gfx-section-title">Motion</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Drift Speed</span>
        <input class="slider" type="range" min="0.1" max="5" step="0.1" v-model.number="model.animationSpeed" />
        <span class="gfx-slider-value">&times;{{ (model.animationSpeed ?? 1.0).toFixed(1) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Phase Coloring</span>
        <input class="slider" type="range" min="0" max="1" step="0.001" v-model.number="sliderPhaseColoring" />
        <span class="gfx-slider-value">{{ (model.phaseColoringStrength ?? 0).toFixed(1) }}×</span>
      </div>
      </section>

      <section v-show="activePaletteSubTab === 'color'">
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
              <i class="fa-solid fa-palette fa-fw mr-1"></i> {{ mode.label }}
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

      </section>

      <section v-show="activePaletteSubTab === 'surfaceMaterial'">
      <!-- ═══ FRACTAL SURFACE ═══ -->
      <label class="gfx-section-title">Fractal Surface</label>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Orbit Trap</span>
        <input class="slider" type="range" min="0" max="100" step="0.1" v-model.number="model.orbitTrapStrength" />
        <span class="gfx-slider-value">{{ (model.orbitTrapStrength ?? 0).toFixed(1) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Relief Depth</span>
        <input class="slider" type="range" min="0" max="2" step="0.01" v-model.number="model.reliefDepth" />
        <span class="gfx-slider-value">{{ (model.reliefDepth ?? 1).toFixed(2) }}</span>
      </div>
      <div class="gfx-slider-row">
        <span class="gfx-slider-label">Relief Occlusion</span>
        <input class="slider" type="range" min="0" max="10" step="0.01" v-model.number="model.localShadowStrength" />
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
      <!-- ═══ MATERIAL RESPONSE ═══ -->
      <label class="gfx-section-title">Material Response</label>
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
      </section>

      <section v-show="activePaletteSubTab === 'imageEnvironment'">
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
              <a v-for="tex in textures" :key="tex.name" class="dropdown-item favorite-row"
                @click.prevent="selectTextureFromDropdown(tex)"
                :class="{ 'is-active': selectedTexture === tex.name }"
                style="display:flex; align-items:center; gap:0.5em;">
                <button
                  v-if="isAdmin"
                  class="favorite-button upload-button"
                  :class="uploadButtonClasses(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)"
                  type="button"
                  :disabled="!canUploadTexture(tex)"
                  :title="uploadButtonTitle(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)"
                  :aria-label="uploadButtonTitle(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)"
                  @click.stop.prevent="uploadTexture(tex)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i :class="uploadButtonIcon(uploadSuccessKey('texture', tex.guid || tex.name))"></i></span>
                </button>
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': tex.favorite }"
                  type="button"
                  :disabled="BUILT_IN_TEXTURE_NAMES.has(tex.name)"
                  :title="tex.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!tex.favorite"
                  @click.stop.prevent="toggleTextureFavorite(tex)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="tex.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
                </button>
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
            <button class="button is-warning is-small" @click="triggerImportTexture"><i class="fa-solid fa-file-import mr-1"></i> Import</button>
            <input ref="textureFileInput" type="file" accept="image/*" style="display:none;" @change="importTexture" />
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deleteTexture" :disabled="!textureName || BUILT_IN_TEXTURE_NAMES.has(textureName)"><i class="fa-solid fa-trash-can mr-1"></i> Delete</button>
          </div>
        </div>
      </div>
      </section>

      <section v-show="activePaletteSubTab === 'imageEnvironment'">
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
              <a v-for="tex in textures" :key="'skybox-' + tex.name" class="dropdown-item favorite-row"
                @click.prevent="selectSkyboxFromDropdown(tex)"
                :class="{ 'is-active': selectedSkyboxTexture === tex.name }"
                style="display:flex; align-items:center; gap:0.5em;">
                <button
                  v-if="isAdmin"
                  class="favorite-button upload-button"
                  :class="uploadButtonClasses(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)"
                  type="button"
                  :disabled="!canUploadTexture(tex)"
                  :title="uploadButtonTitle(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)"
                  :aria-label="uploadButtonTitle(uploadSuccessKey('texture', tex.guid || tex.name), tex.remote)"
                  @click.stop.prevent="uploadTexture(tex)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i :class="uploadButtonIcon(uploadSuccessKey('texture', tex.guid || tex.name))"></i></span>
                </button>
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': tex.favorite }"
                  type="button"
                  :disabled="BUILT_IN_TEXTURE_NAMES.has(tex.name)"
                  :title="tex.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!tex.favorite"
                  @click.stop.prevent="toggleTextureFavorite(tex)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="tex.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
                </button>
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
            <button class="button is-warning is-small" @click="triggerImportSkybox"><i class="fa-solid fa-file-import mr-1"></i> Import</button>
            <input ref="skyboxFileInput" type="file" accept="image/*" style="display:none;" @change="importSkyboxTexture" />
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deleteSkyboxTexture" :disabled="!skyboxName || BUILT_IN_TEXTURE_NAMES.has(skyboxName)"><i class="fa-solid fa-trash-can mr-1"></i> Delete</button>
          </div>
        </div>
      </div>
      </section>

      <section v-show="activePaletteSubTab === 'library'">
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
          <span class="favorite-filter-heart"><i class="fa-heart" :class="showOnlyFavoritePalettePresets ? 'fa-solid' : 'fa-regular'"></i></span>
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
                  <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="preset.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
                </button>
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
          <span class="favorite-filter-heart"><i class="fa-heart" :class="showOnlyFavoritePalettes ? 'fa-solid' : 'fa-regular'"></i></span>
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
                  <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="palette.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
                </button>
                <button
                  v-if="isAdmin"
                  class="favorite-button upload-button"
                  :class="uploadButtonClasses(uploadSuccessKey('palette', palette.name), palette.remote)"
                  type="button"
                  :title="uploadButtonTitle(uploadSuccessKey('palette', palette.name), palette.remote)"
                  :aria-label="uploadButtonTitle(uploadSuccessKey('palette', palette.name), palette.remote)"
                  @click.stop.prevent="uploadPalettePreset(palette)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i :class="uploadButtonIcon(uploadSuccessKey('palette', palette.name))"></i></span>
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
            <button class="button is-link is-small" @click="savePalette"><i class="fa-solid fa-floppy-disk mr-1"></i> Save</button>
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deletePalette" :disabled="!paletteName"><i class="fa-solid fa-trash-can mr-1"></i> Delete</button>
          </div>
        </div>

        <!-- Import / Export Palettes -->
        <hr class="section-sep"/>
        <label class="palette-library-label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPalettes" :disabled="palettes.length === 0">
              <i class="fa-solid fa-download mr-1"></i> Export
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small is-light" @click="exportSelectedPalette" :disabled="!selectedPalette">
              <i class="fa-solid fa-download mr-1"></i> Export Selected
            </button>
          </div>
          <div class="control">
            <button class="button is-info is-small" @click="exportFavoritePalettes" :disabled="favoritePalettes.length === 0">
              <i class="fa-solid fa-star mr-1"></i> Export Favorites
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPalettes">
              <i class="fa-solid fa-file-import mr-1"></i> Import
            </button>
            <input ref="paletteFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPalettes" />
          </div>
          <div class="control">
            <button class="button is-danger is-small is-light" @click="deleteAllPalettes" :disabled="palettes.length === 0">
              <i class="fa-solid fa-trash-can mr-1"></i> Delete All
            </button>
          </div>
        </div>
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
.palette-subtabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
  margin-bottom: 0.75em;
}
.palette-subtab-button {
  height: 26px;
  padding: 0 0.65em;
  font-size: 0.78rem;
}
.palette-top-controls {
  display: grid;
  grid-template-columns: repeat(3, auto);
  align-items: center;
  gap: 0.45em 0.65em;
  margin-bottom: 0.75em;
}
.palette-icon-toggle {
  justify-content: center;
  gap: 0.3em;
  min-width: 0;
  height: 26px;
  padding: 0 0.62em;
  font-size: 0.76rem;
  border-color: #b8b8b8;
  color: #222;
  background: #f3f3f3;
}
.palette-icon-toggle.is-active {
  border-color: #3273dc;
  color: #fff;
  background: #3273dc;
}
.palette-compact-control {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 5.8em minmax(5.5em, 1fr) 4.8em;
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .palette-compact-control {
    grid-column: 1 / -1;
    grid-template-columns: 5.5em minmax(4em, 1fr) 4.5em;
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
  padding-right: 5.7em !important;
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
  color: #888;
}
.favorite-filter.is-active {
  border-color: #ec3d7a;
  color: #ec3d7a;
}
.favorite-filter-heart {
  line-height: 1;
  color: inherit;
}
</style>
