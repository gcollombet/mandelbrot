<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, toRaw, watch} from 'vue';
import {interpolateRgb} from 'd3-interpolate';
import GlissiereHandle from './GlissiereHandle.vue';
import PalettePreview from './PalettePreview.vue';
import StopTransferCurveSelector from './StopTransferCurveSelector.vue';
import {Palette} from '../Palette';
import {rgb as d3rgb} from 'd3-color';
import type {ColorStop, StopTransferCurve} from "../ColorStop.ts";
import {applyStopTransferCurve, createInterpolatedColorStop, getEffectValue, getStopTransferCurve} from '../ColorStop.ts';
import type { EffectFieldName } from '../effectFieldConfig';
import { DEFAULT_VALUES, EFFECT_FIELD_CONFIG, UI_GROUPS } from '../effectFieldConfig';
import type {InterpolationMode} from "../Mandelbrot.ts";
import type {TextureMappingConfig} from "../TextureMapping.ts";
import {
  applyStopPresetValues,
  deleteStopPresetEntry,
  ensureDefaultStopPresetEntries,
  getAllStopPresetEntries,
  saveStopPresetEntry,
  valuesFromStop,
} from '../stopPresetStore.ts';
import type {StopPresetRecord} from '../stopPresetStore.ts';
import {RemoteCatalogNameConflictError, uploadRemoteCatalogEntry} from '../remoteCatalog.ts';
import {canDeleteCatalogEntry} from '../catalogPermissions.ts';
import {buildStopPresetPreviewSpec} from '../stopPresetPreview.ts';

const props = withDefaults(defineProps<{
  colorStops: ColorStop[];
  interpolationMode?: InterpolationMode;
  pickerMode?: boolean;
  tileTextureUrl?: string | null;
  skyboxTextureUrl?: string | null;
  tessellationLevel?: number;
  displacementAmount?: number;
  ambientOcclusionStrength?: number;
  microBumpStrength?: number;
  subsurfaceStrength?: number;
  reliefDepth?: number;
  localShadowStrength?: number;
  varnishStrength?: number;
  orbitTrapStrength?: number;
  phaseColoringStrength?: number;
  textureMapping?: TextureMappingConfig;
  applyToAll?: boolean;
  isAdmin?: boolean;
}>(), {
  interpolationMode: 'lab',
  pickerMode: false,
  tileTextureUrl: null,
  skyboxTextureUrl: null,
  tessellationLevel: 0,
  displacementAmount: 0,
  ambientOcclusionStrength: 0,
  microBumpStrength: 0,
  subsurfaceStrength: 0.0,
  reliefDepth: 1,
  localShadowStrength: 0,
  varnishStrength: 0,
  orbitTrapStrength: 0,
  phaseColoringStrength: 0,
  textureMapping: undefined,
  applyToAll: false,
  isAdmin: false,
});
const emit = defineEmits<{
  (e: 'update:colorStops', value: ColorStop[]): void;
  (e: 'update:applyToAll', value: boolean): void;
  (e: 'toggle-picker'): void;
  (e: 'invert'): void;
  (e: 'negate'): void;
  (e: 'duplicate'): void;
  (e: 'mirror'): void;
  (e: 'distribute'): void;
  (e: 'clear'): void;
}>();

const MAX_COLORS = 200;

const previewRef = ref<InstanceType<typeof PalettePreview> | null>(null);

function onPreviewDblClick(event: MouseEvent) {
  if (props.colorStops.length >= MAX_COLORS) return;
  const canvas = previewRef.value?.canvasRef;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  let t = (event.clientX - rect.left) / rect.width;
  t = Math.max(0, Math.min(1, t));
  const pal = new Palette(props.colorStops, props.interpolationMode);
  const sampledColor = pal.getColorAt(t);
  const newStop = createInterpolatedColorStop(props.colorStops, t, sampledColor);
  props.colorStops.push(newStop);
  emit('update:colorStops', props.colorStops);
  selectedIdx.value = props.colorStops.length - 1;
}

// Index de la couleur sélectionnée
const selectedIdx = ref<number|null>(0);

// Auto-sélectionner le dernier curseur ajouté (ex: via pipette)
watch(() => props.colorStops.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    selectedIdx.value = newLen - 1;
  }
});

function selectColor(idx: number) {
  selectedIdx.value = idx;
}

/** Supprime le stop sélectionné (minimum 2 stops requis). */
function deleteSelectedStop() {
  if (selectedIdx.value === null) return;
  if (props.colorStops.length <= 2) return; // garder au moins 2 stops
  props.colorStops.splice(selectedIdx.value, 1);
  emit('update:colorStops', props.colorStops);
  // Ajuster la sélection
  if (selectedIdx.value >= props.colorStops.length) {
    selectedIdx.value = props.colorStops.length - 1;
  }
}

// Hex color of the selected stop (for the native color picker)
const selectedHex = computed({
  get() {
    if (selectedIdx.value === null || props.colorStops.length === 0) return '#ffffff';
    const c = props.colorStops[selectedIdx.value]?.color || '#ffffff';
    // Ensure it's a valid 7-char hex for the input
    try {
      return d3rgb(c).formatHex();
    } catch {
      return '#ffffff';
    }
  },
  set(hex: string) {
    if (selectedIdx.value !== null && props.colorStops[selectedIdx.value]) {
      //@ts-ignore
      props.colorStops[selectedIdx.value] = {
        ...props.colorStops[selectedIdx.value],
        color: hex
      };
      emit('update:colorStops', props.colorStops);
    }
  }
});

const selectedIridescenceHex = computed({
  get() {
    if (!selectedStop.value?.iridescenceColor) return '#ffffff';
    try {
      return d3rgb(selectedStop.value.iridescenceColor).formatHex();
    } catch {
      return '#ffffff';
    }
  },
  set(hex: string) {
    if (props.applyToAll) {
      for (const stop of props.colorStops) {
        stop.iridescenceColor = hex;
      }
    } else {
      if (selectedIdx.value === null) return;
      const stop = props.colorStops[selectedIdx.value];
      if (!stop) return;
      stop.iridescenceColor = hex;
    }
    emit('update:colorStops', props.colorStops);
  },
});

function enableIridescenceColor() {
  selectedIridescenceHex.value = selectedHex.value;
}

function clearIridescenceColor() {
  if (props.applyToAll) {
    for (const stop of props.colorStops) {
      delete stop.iridescenceColor;
    }
  } else {
    if (selectedIdx.value === null) return;
    const stop = props.colorStops[selectedIdx.value];
    if (!stop) return;
    delete stop.iridescenceColor;
  }
  emit('update:colorStops', props.colorStops);
}

// ── Per-stop effect editing ──

/** The currently selected stop (reactive). */
const selectedStop = computed(() => {
  if (selectedIdx.value === null) return null;
  return props.colorStops[selectedIdx.value] ?? null;
});

const selectedTransferCurve = computed<StopTransferCurve>({
  get() {
    return selectedStop.value ? getStopTransferCurve(selectedStop.value) : 'linear';
  },
  set(curve: StopTransferCurve) {
    if (props.applyToAll) {
      for (const stop of props.colorStops) {
        stop.transferCurve = curve;
      }
    } else {
      if (selectedIdx.value === null) return;
      const stop = props.colorStops[selectedIdx.value];
      if (!stop) return;
      stop.transferCurve = curve;
    }
    emit('update:colorStops', props.colorStops);
  },
});

const stopPresetName = ref('');
const selectedStopPresetName = ref('');
const stopPresets = ref<StopPresetRecord[]>([]);
const stopPresetDropdownOpen = ref(false);
const stopPresetDropdownRef = ref<HTMLElement | null>(null);
const stopPresetUploadSuccessKeys = ref<Set<string>>(new Set());
const stopPresetUploadTimers = new Map<string, ReturnType<typeof setTimeout>>();
const STOP_PRESET_UPLOAD_SUCCESS_DURATION_MS = 2200;
const stopPresetPreviewCache = new Map<string, string>();

function stopPresetUploadKey(record: StopPresetRecord): string {
  return record.guid || record.name;
}

function isStopPresetUploadSuccess(key: string): boolean {
  return stopPresetUploadSuccessKeys.value.has(key);
}

function showStopPresetUploadSuccess(key: string): void {
  const existingTimer = stopPresetUploadTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  const nextKeys = new Set(stopPresetUploadSuccessKeys.value);
  nextKeys.add(key);
  stopPresetUploadSuccessKeys.value = nextKeys;

  stopPresetUploadTimers.set(key, setTimeout(() => {
    const remaining = new Set(stopPresetUploadSuccessKeys.value);
    remaining.delete(key);
    stopPresetUploadSuccessKeys.value = remaining;
    stopPresetUploadTimers.delete(key);
  }, STOP_PRESET_UPLOAD_SUCCESS_DURATION_MS));
}

function stopPresetUploadButtonClasses(key: string, remote?: {publishedName?: string; lastUpdated?: string}) {
  return {
    'is-upload-success': isStopPresetUploadSuccess(key),
    'is-remote': !!remote && !isStopPresetUploadSuccess(key),
  };
}

function stopPresetUploadButtonTitle(key: string, remote?: {publishedName?: string; lastUpdated?: string}): string {
  if (isStopPresetUploadSuccess(key)) return 'Uploaded successfully';
  if (remote) return 'Already in shared catalog. Upload again to update.';
  return 'Upload to shared catalog';
}

function stopPresetUploadButtonIcon(key: string): string {
  return isStopPresetUploadSuccess(key) ? 'fa-solid fa-check' : 'fa-solid fa-upload';
}

function stopPresetPreviewKey(record: StopPresetRecord): string {
  return `${record.guid || record.name}|${record.lastUpdated || record.date}|${JSON.stringify(record.values)}`;
}

function buildStopPresetPreviewUrl(record: StopPresetRecord): string {
  const key = stopPresetPreviewKey(record);
  const cached = stopPresetPreviewCache.get(key);
  if (cached) return cached;

  const spec = buildStopPresetPreviewSpec(record.values);
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const interpolate = interpolateRgb(spec.startColor, spec.endColor);
  for (let x = 0; x < canvas.width; x += 1) {
    const t = x / Math.max(canvas.width - 1, 1);
    const curvedT = applyStopTransferCurve(spec.curve, t);
    ctx.fillStyle = interpolate(curvedT);
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  const overlayAlpha = 0.07 + spec.effectStrength * 0.15;
  ctx.fillStyle = `rgba(255, 255, 255, ${overlayAlpha.toFixed(3)})`;
  ctx.fillRect(0, 0, canvas.width, 4);
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.15, 0.03 + spec.effectStrength * 0.12).toFixed(3)})`;
  ctx.fillRect(0, canvas.height - 4, canvas.width, 4);

  const dataUrl = canvas.toDataURL('image/png');
  stopPresetPreviewCache.set(key, dataUrl);
  return dataUrl;
}

function stopPresetPreviewStyle(record: StopPresetRecord | null) {
  if (!record) {
    return {
      backgroundImage: 'linear-gradient(135deg, rgba(230, 230, 230, 1), rgba(200, 200, 200, 1))',
    };
  }

  const preview = buildStopPresetPreviewUrl(record);
  return preview
    ? {
        backgroundImage: `url("${preview}")`,
      }
    : {
        backgroundImage: 'linear-gradient(135deg, rgba(230, 230, 230, 1), rgba(200, 200, 200, 1))',
      };
}

const selectedStopPresetRecord = computed(() => stopPresets.value.find(item => item.name === selectedStopPresetName.value) ?? null);
const selectedStopPresetPreview = computed(() => stopPresetPreviewStyle(selectedStopPresetRecord.value));

async function refreshStopPresets() {
  await ensureDefaultStopPresetEntries();
  stopPresets.value = await getAllStopPresetEntries();
}

onMounted(() => {
  void refreshStopPresets();
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', handleDocumentKeydown);
  for (const timer of stopPresetUploadTimers.values()) {
    clearTimeout(timer);
  }
  stopPresetUploadTimers.clear();
});

const UI_GROUP_ORDER = ['color', 'iridescence', 'iteration', 'lighting', 'imageSources'] as const;

const UI_GROUP_TITLES: Partial<Record<string, string>> = {
  iteration: 'Iteration Mapping',
  lighting: 'Lighting & Material',
  imageSources: 'Image Sources',
};

/** Get the effective value of a field on the selected stop. */
function getStopEffect(field: EffectFieldName): number {
  if (!selectedStop.value) return DEFAULT_VALUES[field];
  return getEffectValue(selectedStop.value, field);
}

/** Set a field on the selected stop, or all stops if applyToAll is true. */
function setStopEffect(field: EffectFieldName, value: number) {
  if (props.applyToAll) {
    for (const stop of props.colorStops) {
      stop[field] = value;
    }
  } else {
    if (selectedIdx.value === null) return;
    const stop = props.colorStops[selectedIdx.value];
    if (!stop) return;
    stop[field] = value;
  }
  emit('update:colorStops', props.colorStops);
}

async function saveCurrentStopPreset() {
  const stop = selectedStop.value;
  const name = stopPresetName.value.trim();
  if (!stop || !name) return;
  await saveStopPresetEntry({
    name,
    values: valuesFromStop(stop),
    date: new Date().toISOString(),
  });
  selectedStopPresetName.value = name;
  stopPresetName.value = '';
  await refreshStopPresets();
}

function applySelectedStopPreset() {
  const preset = stopPresets.value.find(item => item.name === selectedStopPresetName.value);
  if (!preset) return;

  if (props.applyToAll) {
    for (let i = 0; i < props.colorStops.length; i += 1) {
      const stop = props.colorStops[i];
      if (stop) {
        props.colorStops[i] = applyStopPresetValues(stop, preset.values);
      }
    }
  } else {
    if (selectedIdx.value === null) return;
    const stop = props.colorStops[selectedIdx.value];
    if (!stop) return;
    props.colorStops[selectedIdx.value] = applyStopPresetValues(stop, preset.values);
  }

  emit('update:colorStops', props.colorStops);
}

async function deleteSelectedStopPreset() {
  const preset = selectedStopPresetRecord.value;
  if (!preset) return;
  if (!canDeleteCatalogEntry(props.isAdmin ? 'admin' : 'guest', preset.remote)) {
    window.alert('Shared catalog stop presets cannot be deleted locally.');
    return;
  }
  if (!window.confirm(`Delete stop preset "${preset.name}"? This cannot be undone.`)) return;
  await deleteStopPresetEntry(preset.name);
  selectedStopPresetName.value = '';
  await refreshStopPresets();
}

async function toggleStopPresetFavorite(preset: StopPresetRecord) {
  const plainPreset = structuredClone(toRaw(preset));
  await saveStopPresetEntry({...plainPreset, favorite: !plainPreset.favorite});
  await refreshStopPresets();
}

function handleStopPresetUploadError(error: unknown) {
  if (error instanceof RemoteCatalogNameConflictError) {
    window.alert(`A remote ${error.type} named "${error.conflictName}" already exists. Rename this stop preset before uploading.`);
    return;
  }
  console.warn('Remote stop preset upload failed:', error);
  window.alert('Remote stop preset upload failed. Check the console for details.');
}

async function uploadStopPresetToCloud(preset: StopPresetRecord) {
  if (!props.isAdmin) return;
  try {
    const plainPreset = structuredClone(toRaw(preset));
    const guid = plainPreset.guid || crypto.randomUUID();
    const uploaded = await uploadRemoteCatalogEntry('stopPreset', {
      guid,
      name: plainPreset.name,
      values: plainPreset.values,
      lastUpdated: plainPreset.lastUpdated || plainPreset.date,
    });
    await saveStopPresetEntry({
      ...plainPreset,
      guid,
      lastUpdated: uploaded.lastUpdated,
      remote: {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated},
    });
    showStopPresetUploadSuccess(stopPresetUploadKey(plainPreset));
    await refreshStopPresets();
  } catch (error) {
    handleStopPresetUploadError(error);
  }
}

function selectStopPresetFromDropdown(preset: StopPresetRecord) {
  selectedStopPresetName.value = preset.name;
  stopPresetDropdownOpen.value = false;
}

function toggleStopPresetDropdown() {
  stopPresetDropdownOpen.value = !stopPresetDropdownOpen.value;
}

function closeStopPresetDropdown() {
  stopPresetDropdownOpen.value = false;
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!stopPresetDropdownOpen.value) return;
  const root = stopPresetDropdownRef.value;
  if (!root) return;
  if (event.target instanceof Node && !root.contains(event.target)) {
    closeStopPresetDropdown();
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeStopPresetDropdown();
  }
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

function exportSelectedStopPreset() {
  const preset = stopPresets.value.find(item => item.name === selectedStopPresetName.value);
  if (!preset) return;
  downloadJsonFile(`mandelbrot-stop-preset-${preset.name}.json`, preset);
}

function exportAllStopPresets() {
  downloadJsonFile('mandelbrot-stop-presets.json', stopPresets.value);
}

const stopPresetFileInput = ref<HTMLInputElement | null>(null);
function triggerImportStopPresets() {
  stopPresetFileInput.value?.click();
}

function importStopPresets(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
    reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result as string);
      const records = Array.isArray(imported) ? imported : [imported];
      for (const record of records) {
        if (!record || typeof record.name !== 'string' || !record.values || typeof record.values.color !== 'string') continue;
        await saveStopPresetEntry({
          name: record.name,
          values: record.values,
          date: typeof record.date === 'string' ? record.date : new Date().toISOString(),
        });
      }
      await refreshStopPresets();
    } catch {
      window.alert('Invalid stop preset file.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

/** Forward snapshot capture from the underlying PalettePreview. */
function getSnapshot(): string | null {
  return previewRef.value?.getSnapshot?.() ?? null;
}

defineExpose({ getSnapshot });

</script>

<template>
  <div class="palette-editor">
    <!-- ═══ Pipette + outils compact ═══ -->
    <div class="top-bar">
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
        <button class="button is-small is-light outils-btn" @click="emit('invert')" title="Reverse order">
          <i class="fa-solid fa-arrow-right-arrow-left fa-fw"></i>
        </button>
        <button class="button is-small is-light outils-btn" @click="emit('negate')" title="Negate RGB">
          <i class="fa-solid fa-circle-half-stroke fa-fw"></i>
        </button>
        <button class="button is-small is-light outils-btn" @click="emit('duplicate')" title="Duplicate 2x">
          <i class="fa-regular fa-copy fa-fw"></i>
        </button>
        <button class="button is-small is-light outils-btn" @click="emit('mirror')" title="Mirror (palindrome)">
          <i class="fa-solid fa-arrows-left-right fa-fw"></i>
        </button>
        <button class="button is-small is-light outils-btn" @click="emit('distribute')" title="Distribute evenly">
          <i class="fa-solid fa-align-justify fa-fw"></i>
        </button>
        <button class="button is-small is-danger is-light outils-btn" @click="emit('clear')" title="Clear entire palette">
          <i class="fa-solid fa-trash-can fa-fw"></i>
        </button>
      </div>
    </div>

    <!-- WebGPU preview with handles overlaid -->
    <div class="canvas-row" style="position:relative;" @dblclick="onPreviewDblClick" title="Double-click to add a color stop">
      <PalettePreview
        ref="previewRef"
        :colorStops="colorStops"
        :interpolationMode="interpolationMode"
        :tileTextureUrl="tileTextureUrl"
        :skyboxTextureUrl="skyboxTextureUrl"
        :tessellationLevel="tessellationLevel"
        :displacementAmount="displacementAmount"
        :ambientOcclusionStrength="ambientOcclusionStrength"
        :microBumpStrength="microBumpStrength"
        :subsurfaceStrength="subsurfaceStrength"
        :reliefDepth="reliefDepth"
        :localShadowStrength="localShadowStrength"
        :varnishStrength="varnishStrength"
        :orbitTrapStrength="orbitTrapStrength"
        :phaseColoringStrength="phaseColoringStrength"
        :textureMapping="textureMapping"
      />
      <div class="handles-overlay">
        <GlissiereHandle
          v-for="(stop, idx) in colorStops"
          :key="'handle-' + idx"
          :stop="stop"
          :selected="!applyToAll && selectedIdx === idx"
          :highlighted="applyToAll"
          :disabled="applyToAll"
          @update:position="t => colorStops[idx].position = t"
          @select="selectColor(idx)"
        />
        <!-- Bouton supprimer flottant au-dessus du curseur sélectionné -->
        <button
          v-if="!applyToAll && selectedIdx !== null && colorStops.length > 2"
          class="floating-delete-btn"
          :style="{ left: colorStops[selectedIdx]?.position * 100 + '%' }"
          title="Delete this stop"
          @mousedown.stop
          @click.stop="deleteSelectedStop"
        >
          &times;
        </button>
      </div>
    </div>

    <!-- ═══ Effets par point ═══ -->
    <div v-if="selectedStop" class="effects-panel">

      <!-- Toggle global + titre -->
      <div class="effects-header">
        <label class="effects-section-title">
          Stop #{{ (selectedIdx ?? 0) + 1 }}
          <span v-if="applyToAll" class="all-stops-indicator">All Stops Selected</span>
        </label>
        <div class="stop-scope-toggle" role="group" aria-label="Stop edit scope">
          <button
            type="button"
            class="button is-small scope-btn"
            :class="{ 'is-active': !applyToAll }"
            :aria-pressed="!applyToAll"
            title="Apply edits only to this stop"
            @click="emit('update:applyToAll', false)"
          >
            This Stop
          </button>
          <button
            type="button"
            class="button is-small scope-btn"
            :class="{ 'is-active': applyToAll }"
            :aria-pressed="applyToAll"
            title="Apply edits to all stops"
            @click="emit('update:applyToAll', true)"
          >
            All Stops
          </button>
        </div>
      </div>

      <!-- ── Stop presets ── -->
      <div class="stop-presets-panel">
        <label class="effects-group-title">Stop Looks</label>
        <div class="stop-preset-dropdown" ref="stopPresetDropdownRef">
          <button
            class="button is-small is-fullwidth stop-preset-trigger"
            type="button"
            :class="{ 'has-selection': !!selectedStopPresetRecord }"
            @click="toggleStopPresetDropdown"
            :aria-expanded="stopPresetDropdownOpen"
            aria-haspopup="listbox"
            aria-label="Choose a stop preset"
          >
            <span class="stop-preset-trigger-preview" :style="selectedStopPresetPreview" aria-hidden="true"></span>
            <span class="stop-preset-trigger-label">{{ selectedStopPresetRecord?.name || 'Choose preset...' }}</span>
            <i class="fa-solid fa-chevron-down stop-preset-trigger-caret" aria-hidden="true"></i>
          </button>
          <div v-if="stopPresetDropdownOpen" class="stop-preset-dropdown-menu" role="listbox" aria-label="Stop presets">
            <div v-if="stopPresets.length === 0" class="stop-preset-empty">
              No stop presets available.
            </div>
            <div
              v-for="preset in stopPresets"
              :key="preset.guid || preset.name"
              class="stop-preset-option"
              :class="{ 'is-active': selectedStopPresetName === preset.name }"
              role="option"
              :aria-selected="selectedStopPresetName === preset.name"
              tabindex="0"
              @click="selectStopPresetFromDropdown(preset)"
              @keydown.enter.prevent="selectStopPresetFromDropdown(preset)"
              @keydown.space.prevent="selectStopPresetFromDropdown(preset)"
            >
              <span class="stop-preset-preview" :style="stopPresetPreviewStyle(preset)" aria-hidden="true"></span>
              <span class="stop-preset-label">{{ preset.name }}</span>
              <span class="stop-preset-actions">
                <button
                  type="button"
                  class="stop-preset-action"
                  :class="{ 'is-favorite': preset.favorite }"
                  :title="preset.favorite ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="!!preset.favorite"
                  @click.stop.prevent="toggleStopPresetFavorite(preset)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="preset.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
                </button>
                <button
                  v-if="props.isAdmin"
                  type="button"
                  class="stop-preset-action upload-button"
                  :class="stopPresetUploadButtonClasses(stopPresetUploadKey(preset), preset.remote)"
                  :title="stopPresetUploadButtonTitle(stopPresetUploadKey(preset), preset.remote)"
                  :aria-label="stopPresetUploadButtonTitle(stopPresetUploadKey(preset), preset.remote)"
                  @click.stop.prevent="uploadStopPresetToCloud(preset)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i :class="stopPresetUploadButtonIcon(stopPresetUploadKey(preset))"></i></span>
                </button>
              </span>
            </div>
          </div>
        </div>
        <div class="preset-row stop-preset-actions-row">
          <button class="button is-small is-link" :disabled="!selectedStopPresetRecord" @click="applySelectedStopPreset">
            Apply
          </button>
          <button class="button is-small is-danger is-light" :disabled="!selectedStopPresetRecord" @click="deleteSelectedStopPreset">
            Delete
          </button>
          <button class="button is-small is-info is-light" :disabled="!selectedStopPresetRecord" @click="exportSelectedStopPreset">
            Export
          </button>
        </div>
        <div class="preset-row">
          <input
            class="input is-small"
            v-model="stopPresetName"
            type="text"
            placeholder="New preset name..."
            @keyup.enter="saveCurrentStopPreset"
          />
          <button class="button is-small is-light" :disabled="!stopPresetName.trim()" @click="saveCurrentStopPreset">
            Save
          </button>
          <button class="button is-small is-info is-light" :disabled="stopPresets.length === 0" @click="exportAllStopPresets">
            Export All
          </button>
          <button class="button is-small is-success is-light" @click="triggerImportStopPresets">
            Import
          </button>
          <input ref="stopPresetFileInput" type="file" accept=".json" style="display:none;" @change="importStopPresets" />
        </div>
      </div>

      <!-- ── Color ── -->
      <label class="effects-group-title">Color</label>
      <div class="color-transfer-row">
        <div class="color-stack">
          <div class="color-picker-inline">
            <span class="color-kind-label">Base</span>
            <input
              type="color"
              :value="selectedHex"
              @input="selectedHex = ($event.target as HTMLInputElement).value"
              class="native-color-input"
            />
            <span class="color-hex-label">{{ selectedHex }}</span>
          </div>
          <div class="color-picker-inline">
            <span class="color-kind-label">Iridescence</span>
            <input
              v-if="selectedStop.iridescenceColor"
              type="color"
              :value="selectedIridescenceHex"
              @input="selectedIridescenceHex = ($event.target as HTMLInputElement).value"
              class="native-color-input"
            />
            <button
              v-else
              type="button"
              class="button is-small is-light iridescence-toggle"
              title="Use base color as iridescence color"
              @click="enableIridescenceColor"
            >
              +
            </button>
            <span class="color-hex-label">{{ selectedStop.iridescenceColor ? selectedIridescenceHex : 'off' }}</span>
            <button
              v-if="selectedStop.iridescenceColor"
              type="button"
              class="delete is-small"
              title="Remove iridescence color"
              @click="clearIridescenceColor"
            />
          </div>
        </div>
        <StopTransferCurveSelector v-model="selectedTransferCurve" />
      </div>
      <template v-for="groupName in UI_GROUP_ORDER" :key="groupName">
        <label v-if="UI_GROUP_TITLES[groupName]" class="effects-group-title">{{ UI_GROUP_TITLES[groupName] }}</label>
        <template v-for="field in UI_GROUPS[groupName]" :key="field">
          <div class="effect-row">
            <span class="effect-label">{{ EFFECT_FIELD_CONFIG[field].label }}</span>
            <input
              class="slider effect-slider"
              type="range"
              :min="EFFECT_FIELD_CONFIG[field].min"
              :max="EFFECT_FIELD_CONFIG[field].max"
              :step="EFFECT_FIELD_CONFIG[field].step"
              :value="getStopEffect(field)"
              @input="setStopEffect(field, parseFloat(($event.target as HTMLInputElement).value))"
            />
            <span class="effect-value">
              {{ getStopEffect(field).toFixed(EFFECT_FIELD_CONFIG[field].step < 0.01 ? 3 : 2) }}
              {{ EFFECT_FIELD_CONFIG[field].unit }}
            </span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.palette-editor {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5em;
}

/* ── Top bar: color picker + outils ── */
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
}
.handles-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
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

/* ── Per-point effect editing ── */
.effects-panel {
  margin-top: 0.2em;
}
.effects-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5em;
}
.effects-section-title {
  font-size: 0.92em;
  font-weight: 700;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.6em;
}
.apply-all-btn {
  font-size: 0.78em !important;
  min-width: 7em;
}
.all-stops-indicator {
  display: inline-flex;
  align-items: center;
  padding: 0.16em 0.52em;
  border-radius: 999px;
  border: 1px solid oklch(0.75 0.15 80);
  background: oklch(0.75 0.15 80 / 0.15);
  color: oklch(0.85 0.12 80);
  font-size: 0.68em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.stop-scope-toggle {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 7px;
  overflow: hidden;
  background: var(--row);
}
.scope-btn {
  border: 0 !important;
  border-radius: 0 !important;
  min-width: 6.4em;
  height: 27px;
  font-size: 0.77em !important;
  font-weight: 600;
  color: var(--ink-2);
  background: transparent;
}
.scope-btn:hover {
  color: var(--ink) !important;
  background: var(--panel-2) !important;
}
.scope-btn.is-active {
  color: #fff !important;
  background: var(--accent) !important;
}
.scope-btn.is-active:hover {
  background: var(--accent-bright) !important;
}

.stop-preset-dropdown {
  position: relative;
  width: 100%;
}

.stop-preset-trigger {
  display: flex !important;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55em;
  width: 100%;
  min-height: 34px;
  padding: 0.2em 0.55em !important;
  border: 1px solid var(--line) !important;
  border-radius: 10px !important;
  background: var(--row) !important;
  color: var(--ink) !important;
}

.stop-preset-trigger.has-selection {
  background: var(--row) !important;
}

.stop-preset-trigger-preview,
.stop-preset-preview {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 5px;
  border: 1px solid var(--line);
  background-color: #d8d8d8;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.stop-preset-trigger-label,
.stop-preset-label {
  min-width: 0;
  flex: 1 1 auto;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stop-preset-trigger-label {
  font-size: 0.82em;
  color: var(--ink);
}

.stop-preset-trigger-caret {
  flex: 0 0 auto;
  font-size: 0.78em;
  color: var(--ink-2);
}

.stop-preset-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.35em);
  left: 0;
  right: 0;
  z-index: 25;
  max-height: 320px;
  overflow-y: auto;
  padding: 0.35em;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}

.stop-preset-option {
  display: flex;
  align-items: center;
  gap: 0.55em;
  width: 100%;
  min-height: 40px;
  padding: 0.28em 0.4em;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  color: var(--ink);
  transition: background 0.14s, box-shadow 0.14s;
}

.stop-preset-option + .stop-preset-option {
  margin-top: 0.16em;
}

.stop-preset-option:hover,
.stop-preset-option:focus-visible,
.stop-preset-option.is-active {
  background: var(--row);
  box-shadow: inset 0 0 0 1px var(--accent-soft);
}

.stop-preset-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  flex: 0 0 auto;
  margin-left: auto;
}

.stop-preset-action {
  position: relative;
  width: 1.9em;
  height: 1.9em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  color: var(--ink-3);
}

.stop-preset-action.upload-button.is-remote .favorite-heart,
.stop-preset-action.upload-button.is-remote:hover .favorite-heart {
  color: var(--accent);
}

.stop-preset-action.upload-button.is-remote::after {
  content: "✓";
  position: absolute;
  right: 0.08em;
  bottom: 0.08em;
  width: 0.85em;
  height: 0.85em;
  border-radius: 999px;
  background: oklch(0.65 0.17 140);
  color: #fff;
  font-size: 0.58em;
  font-weight: 800;
  line-height: 0.85em;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.42);
}

.stop-preset-action.is-favorite,
.stop-preset-action:hover {
  color: var(--magenta);
}

.stop-preset-action.is-upload-success .favorite-heart,
.stop-preset-action.is-upload-success:hover .favorite-heart {
  color: oklch(0.65 0.17 140);
}

.stop-preset-action .favorite-heart {
  font-size: 1.18em;
  line-height: 1;
  color: inherit;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25));
}

.stop-preset-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.stop-preset-empty {
  padding: 0.55em 0.45em;
  color: var(--ink-3);
  font-size: 0.82em;
}

.stop-preset-actions-row {
  margin-top: 0.35em;
}

.stop-presets-panel {
  margin-bottom: 0.55em;
  padding: 0.6em;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--panel-2);
}
.preset-row {
  display: flex;
  align-items: center;
  gap: 0.35em;
  margin-top: 0.35em;
}
.select-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--row);
  color: var(--ink);
  font-size: 0.82em;
  padding: 0 0.4em;
}
.effects-group-title {
  font-size: 0.78em;
  font-weight: 700;
  color: var(--ink-2);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-top: 0.6em;
  margin-bottom: 0.25em;
  display: block;
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
.native-color-input {
  width: 36px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 2px;
  cursor: pointer;
  background: none;
}
.color-hex-label {
  font-family: var(--mono);
  font-size: 0.95em;
  color: var(--ink);
  min-width: 56px;
}
.color-picker-inline {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.color-stack {
  display: grid;
  gap: 0.28em;
}
.color-kind-label {
  width: 72px;
  font-size: 0.78em;
  color: var(--ink-2);
  flex-shrink: 0;
}
.color-transfer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6em;
  margin-bottom: 0.3em;
  flex-wrap: wrap;
}
.iridescence-toggle {
  width: 36px;
  height: 30px;
  padding: 0 !important;
}
.effect-row {
  display: flex;
  align-items: center;
  gap: 0.8em;
  margin-bottom: 0.2em;
}
.effect-label {
  font-size: 0.82em;
  color: var(--ink-2);
  width: 128px;
  flex-shrink: 0;
  white-space: nowrap;
}
.effect-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  min-width: 40px;
  height: 6px;
  background: var(--track) !important;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}
.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-bright) !important;
  border: 3px solid #0b0d12 !important;
  box-shadow: 0 0 0 1px var(--accent), 0 4px 12px -2px var(--accent) !important;
  cursor: pointer;
  transition: .12s;
}
.effect-slider::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}
.effect-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-bright) !important;
  border: 3px solid #0b0d12 !important;
  box-shadow: 0 0 0 1px var(--accent) !important;
  cursor: pointer;
}

.effect-value {
  font-family: var(--mono);
  font-size: 0.78em;
  color: var(--ink);
  width: 56px;
  text-align: right;
  flex-shrink: 0;
}

.palette-editor :deep(.input) {
  background-color: var(--row) !important;
  border: 1px solid var(--line) !important;
  color: var(--ink) !important;
  border-radius: 8px !important;
}
.palette-editor :deep(.input:focus) {
  border-color: var(--accent) !important;
  box-shadow: none !important;
}

.palette-editor :deep(.button) {
  background-color: var(--row) !important;
  border: 1px solid var(--line) !important;
  color: var(--ink-2) !important;
  font-family: var(--sans) !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  transition: .16s !important;
}
.palette-editor :deep(.button:hover) {
  color: var(--ink) !important;
  background-color: var(--panel-2) !important;
}
.palette-editor :deep(.button.is-link) {
  background-color: var(--accent) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 4px 12px -5px var(--accent) !important;
}
.palette-editor :deep(.button.is-link:hover) {
  background-color: var(--accent-bright) !important;
}
.palette-editor :deep(.button.is-danger) {
  background-color: oklch(0.60 0.18 20) !important;
  color: #fff !important;
  border: none !important;
}
.palette-editor :deep(.button.is-danger.is-light) {
  background-color: oklch(0.60 0.18 20 / 0.15) !important;
  color: oklch(0.75 0.15 20) !important;
  border: 1px solid oklch(0.60 0.18 20 / 0.3) !important;
}
.palette-editor :deep(.button.is-danger.is-light:hover) {
  background-color: oklch(0.60 0.18 20 / 0.3) !important;
  color: #fff !important;
}
.palette-editor :deep(.button.is-info.is-light) {
  background-color: var(--accent-soft) !important;
  color: var(--accent-bright) !important;
  border: 1px solid var(--accent-soft) !important;
}
.palette-editor :deep(.button.is-info.is-light:hover) {
  background-color: oklch(0.70 0.17 245 / 0.3) !important;
  color: #fff !important;
}
.palette-editor :deep(.button.is-success.is-light) {
  background-color: oklch(0.65 0.17 140 / 0.15) !important;
  color: oklch(0.78 0.15 140) !important;
  border: 1px solid oklch(0.65 0.17 140 / 0.3) !important;
}
.palette-editor :deep(.button.is-success.is-light:hover) {
  background-color: oklch(0.65 0.17 140 / 0.3) !important;
  color: #fff !important;
}
</style>
