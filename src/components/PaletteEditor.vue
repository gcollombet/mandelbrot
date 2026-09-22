<script setup lang="ts">
import {computed, ref} from 'vue';
import { useI18n } from 'vue-i18n';
import type {ColorStop} from "../ColorStop.ts";
import {getEffectValue} from '../ColorStop.ts';
import type { EffectFieldName } from '../effectFieldConfig';
import { DEFAULT_VALUES, EFFECT_FIELD_CONFIG, UI_GROUPS } from '../effectFieldConfig';
import type {InterpolationMode} from "../Mandelbrot.ts";
import type {TextureMappingConfig} from "../TextureMapping.ts";
import type {OrbitTrapConfig} from '../OrbitTrap.ts';
import {
  applyStopPresetValues,
  deleteStopPresetEntry,
  saveStopPresetEntry,
  valuesFromStop,
} from '../stopPresetStore.ts';
import type {StopPresetRecord} from '../stopPresetStore.ts';
import {canDeleteCatalogEntry} from '../catalogPermissions.ts';
import { DenseField, DenseSection, DenseLinkedChip, useLinkedRecord } from './dense';
import {assertActivePresetImportCapacity, PersonalPresetQuotaError} from '../personalQuotaGuard';

const { t } = useI18n();

// Per-effect value formatter for dense fields (mirrors the old toFixed logic).
function effectFmt(field: EffectFieldName) {
  const decimals = EFFECT_FIELD_CONFIG[field].step < 0.01 ? 3 : 2;
  return (v: number) => v.toFixed(decimals);
}

const props = withDefaults(defineProps<{
  colorStops: ColorStop[];
  category?: string;
  selectedIdx: number | null;
  interpolationMode?: InterpolationMode;
  pickerMode?: boolean;
  suspendShortcuts?: (suspended: boolean) => void;
  tileTextureUrl?: string | null;
  skyboxTextureUrl?: string | null;
  tessellationLevel?: number;
  displacementAmount?: number;
  microBumpStrength?: number;
  reliefDepth?: number;
  ambientOcclusionStrength?: number;
  localShadowStrength?: number;
  varnishStrength?: number;
  gradeContrast?: number;
  gradeSaturation?: number;
  orbitTrapStrength?: number;
  orbitTrap?: OrbitTrapConfig;
  phaseColoringStrength?: number;
  textureMapping?: TextureMappingConfig;
  applyToAll?: boolean;
  isAdmin?: boolean;
  stopPresets?: StopPresetRecord[];
  selectedStopPresetName?: string;
}>(), {
  selectedIdx: 0,
  interpolationMode: 'lab',
  pickerMode: false,
  tileTextureUrl: null,
  skyboxTextureUrl: null,
  tessellationLevel: 0,
  displacementAmount: 0,
  microBumpStrength: 0,
  reliefDepth: 1,
  ambientOcclusionStrength: 0,
  localShadowStrength: 0,
  varnishStrength: 0,
  gradeContrast: 1.18,
  gradeSaturation: 1.12,
  orbitTrapStrength: 0,
  orbitTrap: undefined,
  phaseColoringStrength: 0,
  textureMapping: undefined,
  applyToAll: false,
  isAdmin: false,
  stopPresets: () => [],
  selectedStopPresetName: '',
});
const emit = defineEmits<{
  (e: 'update:colorStops', value: ColorStop[]): void;
  (e: 'update:applyToAll', value: boolean): void;
  (e: 'update:selectedStopPresetName', value: string): void;
  (e: 'refresh-stop-presets'): void;
}>();



// ── Per-stop effect editing ──

/** The currently selected stop (reactive). */
const selectedStop = computed(() => {
  if (props.selectedIdx === null) return null;
  return props.colorStops[props.selectedIdx] ?? null;
});

const stopPresetName = ref('');

const selectedStopPresetRecord = computed(() => props.stopPresets.find(item => item.name === props.selectedStopPresetName) ?? null);

function refreshStopPresets() {
  emit('refresh-stop-presets');
}

// Labels and tooltips per effect field (locale keys mirror EffectFieldName).
const effectLabel = (field: EffectFieldName) => t(`paletteEditor.labels.${field}`);
const effectDesc = (field: EffectFieldName) => t(`paletteEditor.descs.${field}`);

// Point sections mirroring the mockup (fields keyed by their uiGroup), merged
// into a single "Point · Effets" DenseSection with a subhead per group.
const POINT_SECTIONS = [
  { id: 'color', fields: ['palette', 'iridescencePower'] as EffectFieldName[] },
  { id: 'lightingMaterial', fields: UI_GROUPS['lighting'] ?? [] },
  { id: 'iterations', fields: UI_GROUPS['iteration'] ?? [] },
  { id: 'imageSources', fields: UI_GROUPS['imageSources'] ?? [] },
];

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
    if (props.selectedIdx === null) return;
    const stop = props.colorStops[props.selectedIdx];
    if (!stop) return;
    
    // Assign effect property
    stop[field] = value;
  }
  emit('update:colorStops', props.colorStops);
}

async function saveCurrentStopPreset() {
  const stop = selectedStop.value;
  const name = stopPresetName.value.trim();
  if (!stop || !name) return;
  const existing = props.stopPresets.find(item => item.name === name);
  await saveStopPresetEntry({
    ...(existing ?? {}),
    name,
    values: valuesFromStop(stop),
    date: existing?.date ?? new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  });
  emit('update:selectedStopPresetName', name);
  stopPresetName.value = '';
  refreshStopPresets();
  stopLink.link({ kind: 'stop', key: existing?.guid ?? name, name, remote: existing?.remote });
}

// ── Linked stop preset: the selected point was loaded from a preset ──
const stopLink = useLinkedRecord('stop', () => selectedStop.value ? valuesFromStop(selectedStop.value) : null);
const stopLinkBusy = ref(false);

function linkedStopRecord(): StopPresetRecord | undefined {
  const key = stopLink.origin.value?.key;
  return props.stopPresets.find(item => (item.guid ?? item.name) === key);
}

async function updateLinkedStopPreset(): Promise<void> {
  const existing = linkedStopRecord();
  const stop = selectedStop.value;
  if (!existing || !stop || stopLinkBusy.value) return;
  stopLinkBusy.value = true;
  try {
    await saveStopPresetEntry({ ...existing, values: valuesFromStop(stop), lastUpdated: new Date().toISOString() });
    refreshStopPresets();
    stopLink.refresh();
  } catch (error) {
    console.warn('Failed to update linked stop preset:', error);
  } finally {
    stopLinkBusy.value = false;
  }
}

async function renameLinkedStopPreset(name: string): Promise<void> {
  const existing = linkedStopRecord();
  if (!existing || stopLinkBusy.value) return;
  stopLinkBusy.value = true;
  try {
    // Stop presets are keyed by name: write the renamed copy, then drop the old key.
    await saveStopPresetEntry({ ...existing, name, lastUpdated: new Date().toISOString() });
    if (existing.name !== name) await deleteStopPresetEntry(existing.name);
    emit('update:selectedStopPresetName', name);
    refreshStopPresets();
    stopLink.refresh({ name, key: existing.guid ?? name });
  } finally {
    stopLinkBusy.value = false;
  }
}

function detachStopPreset(): void {
  stopLink.unlink();
  emit('update:selectedStopPresetName', '');
}

async function saveStopPresetVariant(): Promise<void> {
  const origin = stopLink.origin.value;
  if (!origin) return;
  stopPresetName.value = `${origin.name} · ${t('paletteEditor.presets.variantSuffix')}`;
  await saveCurrentStopPreset();
}

function applySelectedStopPreset() {
  const preset = props.stopPresets.find(item => item.name === props.selectedStopPresetName);
  if (!preset) return;

  if (props.applyToAll) {
    for (let i = 0; i < props.colorStops.length; i += 1) {
      const stop = props.colorStops[i];
      if (stop) {
        props.colorStops[i] = applyStopPresetValues(stop, preset.values);
      }
    }
  } else {
    if (props.selectedIdx === null) return;
    const stop = props.colorStops[props.selectedIdx];
    if (!stop) return;
    props.colorStops[props.selectedIdx] = applyStopPresetValues(stop, preset.values);
  }

  emit('update:colorStops', props.colorStops);
  stopLink.link({ kind: 'stop', key: preset.guid ?? preset.name, name: preset.name, remote: preset.remote });
}

async function deleteSelectedStopPreset() {
  const preset = selectedStopPresetRecord.value;
  if (!preset) return;
  if (!canDeleteCatalogEntry(props.isAdmin ? 'admin' : 'guest', preset.remote)) {
    window.alert(t('paletteEditor.presets.sharedCannotDelete'));
    return;
  }
  if (!window.confirm(t('paletteEditor.presets.confirmDelete', { name: preset.name }))) return;
  await deleteStopPresetEntry(preset.name);
  emit('update:selectedStopPresetName', '');
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
  const preset = props.stopPresets.find(item => item.name === props.selectedStopPresetName);
  if (!preset) return;
  downloadJsonFile(`mandelbrot-stop-preset-${preset.name}.json`, preset);
}

function exportAllStopPresets() {
  downloadJsonFile('mandelbrot-stop-presets.json', props.stopPresets);
}

const stopPresetFileInput = ref<HTMLInputElement | null>(null);
function triggerImportStopPresets() {
  if (!props.isAdmin) return;
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
        await assertActivePresetImportCapacity(typeof record.guid === 'string' ? record.guid : undefined);
        await saveStopPresetEntry({
          guid: typeof record.guid === 'string' ? record.guid : undefined,
          name: record.name,
          values: record.values,
          date: typeof record.date === 'string' ? record.date : new Date().toISOString(),
        });
      }
      refreshStopPresets();
    } catch (error) {
      window.alert(error instanceof PersonalPresetQuotaError ? error.message : t('paletteEditor.presets.invalidFile'));
    }
  };
  reader.readAsText(file);
  input.value = '';
}



</script>

<template>
  <template v-if="selectedStop">
    <!-- ═══ Point · Effets (Éclairage & Matière / Itérations / Sources image) ═══ -->
    <DenseSection
      key="point-effets"
      group="params"
      :hue="55"
      :title="t('paletteEditor.effects.title')"
      :scope="t('paletteEditor.effects.scope')"
      icon='<circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;4&quot;/><path d=&quot;M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2&quot;/>'
    >
      <template v-for="sec in POINT_SECTIONS.filter(s => props.category === 'texture' ? s.id === 'imageSources' : props.category === 'material' ? s.id === 'lightingMaterial' : s.id === 'color' || s.id === 'iterations')" :key="sec.id">
        <div class="subhead">{{ t(`paletteEditor.groups.${sec.id}`) }}</div>
        <div class="fields">
          <DenseField
            v-for="field in sec.fields" :key="field"
            :label="effectLabel(field)"
            :desc="effectDesc(field)"
            :min="EFFECT_FIELD_CONFIG[field].min"
            :max="EFFECT_FIELD_CONFIG[field].max"
            :step="EFFECT_FIELD_CONFIG[field].step"
            :default="EFFECT_FIELD_CONFIG[field].defaultValue"
            :f="effectFmt(field)"
            :unit="EFFECT_FIELD_CONFIG[field].unit"
            :model-value="getStopEffect(field)"
            @update:model-value="(v: number) => setStopEffect(field, v)"
          />
        </div>
      </template>
    </DenseSection>

    <!-- ═══ Stop Looks (per-stop reusable looks) — Point · Presets ═══ -->
    <DenseSection
      key="point-presets"
      group="params"
      :hue="300"
      :title="t('paletteEditor.presets.title')" initially-collapsed
      :scope="t('paletteEditor.presets.scope')"
      icon='<path d=&quot;M4 19V5a2 2 0 012-2h3v18H6a2 2 0 01-2-2zM9 3h5v18H9zM17 4l4 16-3 1-4-16z&quot;/>'
    >
      <slot name="preset-selector" />
      <div class="transfer">
        <button class="mini-btn primary" :disabled="!selectedStopPresetRecord" @click="applySelectedStopPreset">{{ t('paletteEditor.presets.apply') }}</button>
        <button class="mini-btn danger" :disabled="!selectedStopPresetRecord" @click="deleteSelectedStopPreset">{{ t('paletteEditor.presets.delete') }}</button>
        <button v-if="isAdmin" class="mini-btn" :disabled="!selectedStopPresetRecord" @click="exportSelectedStopPreset">{{ t('paletteEditor.presets.export') }}</button>
      </div>
      <DenseLinkedChip v-if="stopLink.origin.value" :kind="t('paletteEditor.presets.linkedKind')" :name="stopLink.origin.value.name" :dirty="stopLink.dirty.value" :locked="stopLink.locked.value" :busy="stopLinkBusy" :suspend-shortcuts="props.suspendShortcuts"
        @update="updateLinkedStopPreset" @rename="renameLinkedStopPreset" @detach="detachStopPreset" @variant="saveStopPresetVariant" />
      <div class="save-row">
        <input class="txt-in" v-model="stopPresetName" type="text" :placeholder="stopLink.origin.value ? t('paletteEditor.presets.saveCopyPlaceholder') : t('paletteEditor.presets.namePlaceholder')" @keyup.enter="saveCurrentStopPreset" />
        <button class="mini-btn primary" :disabled="!stopPresetName.trim()" @click="saveCurrentStopPreset">{{ t('paletteEditor.presets.save') }}</button>
      </div>
      <div v-if="isAdmin" class="transfer">
        <button class="mini-btn" :disabled="stopPresets.length === 0" @click="exportAllStopPresets">{{ t('paletteEditor.presets.exportAll') }}</button>
        <button class="mini-btn" @click="triggerImportStopPresets">{{ t('paletteEditor.presets.import') }}</button>
        <input ref="stopPresetFileInput" type="file" accept=".json" style="display:none;" @change="importStopPresets" />
      </div>
    </DenseSection>
  </template>
</template>

<style scoped>
.palette-editor {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  font-family: var(--sans);
  color: var(--ink);
}

/* ── Per-point effect editing ── */
.effects-panel {
  margin-top: 0;
}

.stop-presets-panel {
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: var(--panel-2);
}
.preset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
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
.effects-group-title::before {
  content: "";
  width: 6px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--accent-bright), var(--mauve));
  display: inline-block;
  flex-shrink: 0;
}
.effects-group-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line-soft);
}
.effects-section-help {
  font-size: 13.5px;
  color: var(--ink-3);
  margin: -8px 0 12px;
  line-height: 1.4;
}

.native-color-input {
  width: 42px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 2px;
  cursor: pointer;
  background: none;
}
.color-hex-label {
  font-family: var(--mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  min-width: 76px;
}
.color-picker-inline {
  display: grid;
  grid-template-columns: 208px auto auto auto;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
}
.color-stack {
  display: grid;
  gap: 8px;
  flex: 1 1 auto;
}
.color-kind-label {
  min-width: 0;
  color: var(--ink);
}
.color-kind-label .l1 {
  display: block;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}
.color-kind-label .l2 {
  display: block;
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
}
.color-transfer-row {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
}
.iridescence-toggle {
  width: 42px;
  height: 36px;
  padding: 0 !important;
}
.curve-row {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  align-items: center;
  gap: 18px;
  padding: 9px 16px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
}
.effect-row {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr) 92px;
  align-items: center;
  gap: 18px;
  padding: 9px 16px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  margin-bottom: 8px;
}
.effect-label {
  color: var(--ink);
  min-width: 0;
}
.effect-label .l1 {
  display: block;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}
.effect-label .l2 {
  display: block;
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
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
  border: 3px solid var(--bg-0) !important;
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
  border: 3px solid var(--bg-0) !important;
  box-shadow: 0 0 0 1px var(--accent) !important;
  cursor: pointer;
}

.effect-value {
  font-family: var(--mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  text-align: right;
  white-space: nowrap;
}

.palette-editor :deep(.stop-transfer-curve-selector),
.curve-row :deep(.stop-transfer-curve-selector) {
  justify-content: flex-start;
}

.palette-editor :deep(.input) {
  background-color: var(--bg-0) !important;
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

@media (max-width: 760px) {
  .color-picker-inline,
  .curve-row,
  .effect-row {
    grid-template-columns: 1fr 86px;
  }
  .color-kind-label,
  .effect-label {
    grid-column: 1 / -1;
  }
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
