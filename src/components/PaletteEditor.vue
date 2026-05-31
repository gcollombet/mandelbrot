<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import GlissiereHandle from './GlissiereHandle.vue';
import PalettePreview from './PalettePreview.vue';
import StopTransferCurveSelector from './StopTransferCurveSelector.vue';
import {Palette} from '../Palette';
import {rgb as d3rgb} from 'd3-color';
import type {ColorStop, StopTransferCurve} from "../ColorStop.ts";
import { createInterpolatedColorStop, getEffectValue, getStopTransferCurve } from '../ColorStop.ts';
import type { EffectFieldName } from '../effectFieldConfig';
import { DEFAULT_VALUES, EFFECT_FIELD_CONFIG, UI_GROUPS } from '../effectFieldConfig';
import type {InterpolationMode} from "../Mandelbrot.ts";
import {
  applyStopPresetValues,
  deleteStopPresetEntry,
  ensureDefaultStopPresetEntries,
  getAllStopPresetEntries,
  saveStopPresetEntry,
  valuesFromStop,
} from '../stopPresetStore.ts';
import type {StopPresetRecord} from '../stopPresetStore.ts';

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
  clearcoatStrength?: number;
  subsurfaceStrength?: number;
  reliefDepth?: number;
  localShadowStrength?: number;
  varnishStrength?: number;
  applyToAll?: boolean;
}>(), {
  interpolationMode: 'lab',
  pickerMode: false,
  tileTextureUrl: null,
  skyboxTextureUrl: null,
  tessellationLevel: 0,
  displacementAmount: 0,
  ambientOcclusionStrength: 0,
  microBumpStrength: 0,
  clearcoatStrength: 0,
  subsurfaceStrength: 0.0,
  reliefDepth: 1,
  localShadowStrength: 0,
  varnishStrength: 0,
  applyToAll: false,
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

function refreshStopPresets() {
  ensureDefaultStopPresetEntries();
  stopPresets.value = getAllStopPresetEntries();
}

onMounted(() => {
  refreshStopPresets();
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

function saveCurrentStopPreset() {
  const stop = selectedStop.value;
  const name = stopPresetName.value.trim();
  if (!stop || !name) return;
  saveStopPresetEntry({
    name,
    values: valuesFromStop(stop),
    date: new Date().toISOString(),
  });
  selectedStopPresetName.value = name;
  stopPresetName.value = '';
  refreshStopPresets();
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

function deleteSelectedStopPreset() {
  const name = selectedStopPresetName.value;
  if (!name) return;
  if (!window.confirm(`Delete stop preset "${name}"? This cannot be undone.`)) return;
  deleteStopPresetEntry(name);
  selectedStopPresetName.value = '';
  refreshStopPresets();
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
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result as string);
      const records = Array.isArray(imported) ? imported : [imported];
      for (const record of records) {
        if (!record || typeof record.name !== 'string' || !record.values || typeof record.values.color !== 'string') continue;
        saveStopPresetEntry({
          name: record.name,
          values: record.values,
          date: typeof record.date === 'string' ? record.date : new Date().toISOString(),
        });
      }
      refreshStopPresets();
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
        :clearcoatStrength="clearcoatStrength"
        :subsurfaceStrength="subsurfaceStrength"
        :reliefDepth="reliefDepth"
        :localShadowStrength="localShadowStrength"
        :varnishStrength="varnishStrength"
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
        <div class="preset-row">
          <select class="select-input" v-model="selectedStopPresetName">
            <option value="">Choose preset...</option>
            <option v-for="preset in stopPresets" :key="preset.name" :value="preset.name">
              {{ preset.name }}
            </option>
          </select>
          <button class="button is-small is-link" :disabled="!selectedStopPresetName" @click="applySelectedStopPreset">
            Apply
          </button>
          <button class="button is-small is-danger is-light" :disabled="!selectedStopPresetName" @click="deleteSelectedStopPreset">
            Delete
          </button>
          <button class="button is-small is-info is-light" :disabled="!selectedStopPresetName" @click="exportSelectedStopPreset">
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
  border: 1px solid #d7d7d7;
  border-radius: 8px;
  background: #ffffff;
  color: #8a2f2f;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.floating-delete-btn:hover {
  border-color: #d35d5d;
  background: #c44;
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
  color: #111;
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
  border: 1px solid #f0b429;
  background: #fff7e0;
  color: #7a5b00;
  font-size: 0.68em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.stop-scope-toggle {
  display: inline-flex;
  border: 1px solid #cfcfcf;
  border-radius: 7px;
  overflow: hidden;
  background: #f5f5f5;
}
.scope-btn {
  border: 0 !important;
  border-radius: 0 !important;
  min-width: 6.4em;
  height: 27px;
  font-size: 0.77em !important;
  font-weight: 600;
  color: #333;
  background: transparent;
}
.scope-btn.is-active {
  color: #fff;
  background: #3273dc;
}
.stop-presets-panel {
  margin-bottom: 0.55em;
  padding: 0.45em;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.025);
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
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #111;
  font-size: 0.82em;
  padding: 0 0.4em;
}
.effects-group-title {
  font-size: 0.78em;
  font-weight: 700;
  color: #111;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-top: 0.6em;
  margin-bottom: 0.25em;
  display: block;
}
.pipette-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: #f5f5f5;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.pipette-btn:hover {
  background: #e8e8e8;
  border-color: #aaa;
}
.pipette-btn.is-active {
  background: #c44;
  border-color: #c44;
  color: #fff;
}
.picker-hint {
  font-size: 0.82em;
  color: #c44;
  font-weight: 500;
  white-space: nowrap;
}
.native-color-input {
  width: 36px;
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 2px;
  cursor: pointer;
  background: none;
}
.color-hex-label {
  font-family: monospace;
  font-size: 0.95em;
  color: #111;
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
  color: #333;
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
  gap: 0.4em;
  margin-bottom: 0.12em;
}
.effect-label {
  font-size: 0.82em;
  color: #222;
  width: 128px;
  flex-shrink: 0;
  white-space: nowrap;
}
.effect-slider {
  flex: 1;
  min-width: 40px;
}
.effect-value {
  font-family: monospace;
  font-size: 0.78em;
  color: #222;
  width: 46px;
  text-align: right;
  flex-shrink: 0;
}

</style>
