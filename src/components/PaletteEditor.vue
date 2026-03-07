<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import GlissiereHandle from './GlissiereHandle.vue';
import PalettePreview from './PalettePreview.vue';
import {Palette} from '../Palette';
import {rgb as d3rgb} from 'd3-color';
import type {ColorStop} from "../ColorStop.ts";
import { COLOR_STOP_DEFAULTS, getEffectValue } from '../ColorStop.ts';
import type { EffectFieldName } from '../ColorStop.ts';
import type {InterpolationMode} from "../Mandelbrot.ts";

const props = withDefaults(defineProps<{
  colorStops: ColorStop[];
  interpolationMode?: InterpolationMode;
  pickerMode?: boolean;
  tileTextureUrl?: string | null;
  tessellationLevel?: number;
  displacementAmount?: number;
  applyToAll?: boolean;
}>(), {
  interpolationMode: 'lab',
  pickerMode: false,
  tileTextureUrl: null,
  tessellationLevel: 2,
  displacementAmount: 0.01,
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
  props.colorStops.push({ color: sampledColor, position: t });
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

// ── Per-stop effect editing ──

/** The currently selected stop (reactive). */
const selectedStop = computed(() => {
  if (selectedIdx.value === null) return null;
  return props.colorStops[selectedIdx.value] ?? null;
});

/** UI metadata for effect fields: label, min, max, step, unit. */
const EFFECT_UI: Record<EffectFieldName, { label: string; min: number; max: number; step: number; unit: string }> = {
  palette:            { label: 'Palette',       min: 0, max: 1,     step: 0.01, unit: '' },
  zebra:              { label: 'Zebra',         min: 0, max: 1,     step: 0.01, unit: '' },
  tessellation:       { label: 'Tessellation',  min: 0, max: 1,     step: 0.01, unit: '' },
  shading:            { label: 'Relief',        min: 0, max: 1,     step: 0.01, unit: '' },
  skybox:             { label: 'Métal',          min: 0, max: 1,     step: 0.01, unit: '' },
  webcam:             { label: 'Webcam',        min: 0, max: 1,     step: 0.01, unit: '' },
  smoothness:         { label: 'Smoothness',    min: 0, max: 1,     step: 0.01, unit: '' },
  shadingLevel:       { label: 'Brillance',     min: 0, max: 3,     step: 0.05, unit: '' },
  specularPower:      { label: 'Spéculaire',    min: 1, max: 64,    step: 0.5,  unit: '' },
  lightAngle:         { label: 'Direction',     min: 0, max: 6.283, step: 0.01, unit: 'rad' },
};

/** Get the effective value of a field on the selected stop. */
function getStopEffect(field: EffectFieldName): number {
  if (!selectedStop.value) return COLOR_STOP_DEFAULTS[field];
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
          :title="props.pickerMode ? 'Quitter le mode pipette (\u00c9chap)' : 'Pipette : cliquer sur le fractal'"
          @click="emit('toggle-picker')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 22l1-1h3l9-9"/>
            <path d="M3 21l9-9"/>
            <path d="M15 6l3-3 3 3-3 3"/>
            <path d="M12 9l3 3"/>
          </svg>
        </button>
        <span v-if="props.pickerMode" class="picker-hint">Cliquez sur le fractal&hellip;</span>
      </div>
      <div class="outils-bar">
        <button class="button is-small is-light outils-btn" @click="emit('invert')" title="Inverser l'ordre">Inv</button>
        <button class="button is-small is-light outils-btn" @click="emit('negate')" title="N&eacute;gatif RGB">N&eacute;g</button>
        <button class="button is-small is-light outils-btn" @click="emit('duplicate')" title="Dupliquer 2x">Dup</button>
        <button class="button is-small is-light outils-btn" @click="emit('mirror')" title="Miroir (palindrome)">Mir</button>
        <button class="button is-small is-light outils-btn" @click="emit('distribute')" title="R&eacute;partir uniform&eacute;ment">Dist</button>
        <button class="button is-small is-danger is-light outils-btn" @click="emit('clear')" title="Supprimer toute la palette">Sup</button>
      </div>
    </div>

    <!-- WebGPU preview with handles overlaid -->
    <div class="canvas-row" style="position:relative;" @dblclick="onPreviewDblClick">
      <PalettePreview
        ref="previewRef"
        :colorStops="colorStops"
        :interpolationMode="interpolationMode"
        :tileTextureUrl="tileTextureUrl"
        :tessellationLevel="tessellationLevel"
        :displacementAmount="displacementAmount"
      />
      <div class="handles-overlay">
        <GlissiereHandle
          v-for="(stop, idx) in colorStops"
          :key="'handle-' + idx"
          :stop="stop"
          :selected="selectedIdx === idx"
          @update:position="t => colorStops[idx].position = t"
          @select="selectColor(idx)"
        />
        <!-- Bouton supprimer flottant au-dessus du curseur sélectionné -->
        <button
          v-if="selectedIdx !== null && colorStops.length > 2"
          class="floating-delete-btn"
          :style="{ left: colorStops[selectedIdx]?.position * 100 + '%' }"
          title="Supprimer ce point"
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
          Point #{{ (selectedIdx ?? 0) + 1 }}
        </label>
        <button class="button is-small apply-all-btn"
          :class="applyToAll ? 'is-link' : 'is-light'"
          @click="emit('update:applyToAll', !applyToAll)"
        >
          {{ applyToAll ? 'Tous les points' : 'Ce point' }}
        </button>
      </div>

      <!-- ── Couleur ── -->
      <label class="effects-group-title">Couleur</label>
      <div class="color-picker-inline">
        <input
          type="color"
          :value="selectedHex"
          @input="selectedHex = ($event.target as HTMLInputElement).value"
          class="native-color-input"
        />
        <span class="color-hex-label">{{ selectedHex }}</span>
      </div>
      <template v-for="field in (['palette'] as EffectFieldName[])" :key="field">
        <div class="effect-row">
          <span class="effect-label">{{ EFFECT_UI[field].label }}</span>
          <input
            class="slider effect-slider"
            type="range"
            :min="EFFECT_UI[field].min"
            :max="EFFECT_UI[field].max"
            :step="EFFECT_UI[field].step"
            :value="getStopEffect(field)"
            @input="setStopEffect(field, parseFloat(($event.target as HTMLInputElement).value))"
          />
          <span class="effect-value">{{ getStopEffect(field).toFixed(2) }}</span>
        </div>
      </template>

      <!-- ── Itération ── -->
      <label class="effects-group-title">Itération</label>
      <template v-for="field in (['smoothness','zebra'] as EffectFieldName[])" :key="field">
        <div class="effect-row">
          <span class="effect-label">{{ EFFECT_UI[field].label }}</span>
          <input
            class="slider effect-slider"
            type="range"
            :min="EFFECT_UI[field].min"
            :max="EFFECT_UI[field].max"
            :step="EFFECT_UI[field].step"
            :value="getStopEffect(field)"
            @input="setStopEffect(field, parseFloat(($event.target as HTMLInputElement).value))"
          />
          <span class="effect-value">{{ getStopEffect(field).toFixed(2) }}</span>
        </div>
      </template>

      <!-- ── Éclairage ── -->
      <label class="effects-group-title">&Eacute;clairage</label>
      <template v-for="field in (['shading','skybox','shadingLevel','specularPower','lightAngle'] as EffectFieldName[])" :key="field">
        <div class="effect-row">
          <span class="effect-label">{{ EFFECT_UI[field].label }}</span>
          <input
            class="slider effect-slider"
            type="range"
            :min="EFFECT_UI[field].min"
            :max="EFFECT_UI[field].max"
            :step="EFFECT_UI[field].step"
            :value="getStopEffect(field)"
            @input="setStopEffect(field, parseFloat(($event.target as HTMLInputElement).value))"
          />
          <span class="effect-value">
            {{ getStopEffect(field).toFixed(EFFECT_UI[field].step < 0.01 ? 3 : 2) }}
            {{ EFFECT_UI[field].unit }}
          </span>
        </div>
      </template>

      <!-- ── Texture ── -->
      <label class="effects-group-title">Texture</label>
      <template v-for="field in (['tessellation','webcam'] as EffectFieldName[])" :key="field">
        <div class="effect-row">
          <span class="effect-label">{{ EFFECT_UI[field].label }}</span>
          <input
            class="slider effect-slider"
            type="range"
            :min="EFFECT_UI[field].min"
            :max="EFFECT_UI[field].max"
            :step="EFFECT_UI[field].step"
            :value="getStopEffect(field)"
            @input="setStopEffect(field, parseFloat(($event.target as HTMLInputElement).value))"
          />
          <span class="effect-value">{{ getStopEffect(field).toFixed(2) }}</span>
        </div>
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
  top: -22px;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  border-radius: 50%;
  background: #f5f5f5;
  color: #c44;
  font-size: 1em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 20;
  line-height: 1;
  padding: 0;
  transition: background 0.15s, color 0.15s;
}
.floating-delete-btn:hover {
  background: #c44;
  color: #fff;
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
}
.color-picker-inline {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.3em;
}
.effect-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.effect-label {
  font-size: 0.82em;
  color: #222;
  width: 80px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.effect-slider {
  flex: 1;
  min-width: 60px;
}
.effect-value {
  font-family: monospace;
  font-size: 0.78em;
  color: #222;
  width: 52px;
  text-align: right;
  flex-shrink: 0;
}

</style>
