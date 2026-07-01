<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, toRaw} from 'vue';
import {interpolateRgb} from 'd3-interpolate';
import StopTransferCurveSelector from './StopTransferCurveSelector.vue';
import {rgb as d3rgb} from 'd3-color';
import type {ColorStop, StopTransferCurve} from "../ColorStop.ts";
import {applyStopTransferCurve, getEffectValue, getStopTransferCurve} from '../ColorStop.ts';
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
import { DenseField, DenseSection } from './dense';

// Per-effect value formatter for dense fields (mirrors the old toFixed logic).
function effectFmt(field: EffectFieldName) {
  const decimals = EFFECT_FIELD_CONFIG[field].step < 0.01 ? 3 : 2;
  return (v: number) => v.toFixed(decimals);
}

const props = withDefaults(defineProps<{
  colorStops: ColorStop[];
  selectedIdx: number | null;
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
  selectedIdx: 0,
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
}>();



// Hex color of the selected stop (for the native color picker)
const selectedHex = computed({
  get() {
    if (props.selectedIdx === null || props.colorStops.length === 0) return '#ffffff';
    const c = props.colorStops[props.selectedIdx]?.color || '#ffffff';
    // Ensure it's a valid 7-char hex for the input
    try {
      return d3rgb(c).formatHex();
    } catch {
      return '#ffffff';
    }
  },
  set(hex: string) {
    if (props.selectedIdx !== null && props.colorStops[props.selectedIdx]) {
      //@ts-ignore
      props.colorStops[props.selectedIdx] = {
        ...props.colorStops[props.selectedIdx],
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
      if (props.selectedIdx === null) return;
      const stop = props.colorStops[props.selectedIdx];
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
    if (props.selectedIdx === null) return;
    const stop = props.colorStops[props.selectedIdx];
    if (!stop) return;
    delete stop.iridescenceColor;
  }
  emit('update:colorStops', props.colorStops);
}

// ── Per-stop effect editing ──

/** The currently selected stop (reactive). */
const selectedStop = computed(() => {
  if (props.selectedIdx === null) return null;
  return props.colorStops[props.selectedIdx] ?? null;
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
      if (props.selectedIdx === null) return;
      const stop = props.colorStops[props.selectedIdx];
      if (!stop) return;
      
      const newCurve = curve === 'linear' ? undefined : curve;
      stop.transferCurve = newCurve;
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


// French labels matching the canvas mockup.
const EFFECT_LABEL_FR: Record<EffectFieldName, string> = {
  palette: 'Mélange couleur',
  iridescencePower: 'Force iridescence',
  zebra: 'Bandes',
  smoothness: 'Lissage',
  stripeAverage: 'Moyenne rayures',
  rotationMean: 'Cohérence dir.',
  stripeRelief: 'Relief rayures',
  directionCoherenceRelief: 'Relief direction',
  shading: 'Mélange lumière',
  skybox: 'Réflexion',
  shadingLevel: 'Intensité lumière',
  specularPower: 'Spéculaire',
  metallic: 'Métallicité',
  roughness: 'Rugosité',
  anisotropy: 'Anisotropie',
  tessellation: 'Mélange image',
  webcam: 'Mélange webcam',
};

// French tooltips for each effect field.
const EFFECT_DESC_FR: Record<EffectFieldName, string> = {
  palette: 'Force de la couleur de base de ce point dans le dégradé',
  iridescencePower: 'Intensité de la teinte spectrale optionnelle',
  zebra: 'Ajoute des bandes d’itérations discrètes autour de ce point',
  tessellation: 'Mélange la texture image sélectionnée dans ce point',
  shading: 'Mélange l’éclairage du relief avec la couleur du point',
  skybox: 'Ajoute la réflexion d’environnement à la réponse matériau',
  webcam: 'Mélange le flux caméra quand le mode webcam est disponible',
  smoothness: 'Utilise des itérations continues plutôt que par paliers',
  stripeAverage: 'Intègre les données d’orbite en rayures dans la couleur',
  rotationMean: 'Utilise la cohérence de direction d’orbite comme signal',
  stripeRelief: 'Transforme les rayures en relief local',
  directionCoherenceRelief: 'Transforme la cohérence de direction en relief',
  shadingLevel: 'Intensité de la lumière directe pour ce point',
  specularPower: 'Force et finesse des reflets spéculaires',
  metallic: 'À quel point ce point se comporte comme un métal',
  roughness: 'Adoucit ou durcit les reflets',
  anisotropy: 'Étire les reflets selon la direction de la surface',
};

// Point sections mirroring the mockup (fields keyed by their uiGroup).
const POINT_SECTIONS = [
  { title: 'Point · Éclairage & Matière', scope: 'Lumière et propriétés de matériau', hue: 55,
    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    fields: UI_GROUPS['lighting'] ?? [] },
  { title: 'Point · Itérations', scope: 'Réponse couleur selon le nombre d’itérations', hue: 155,
    icon: '<path d="M4 6h16M4 12h16M4 18h10"/>', fields: UI_GROUPS['iteration'] ?? [] },
  { title: 'Point · Sources image', scope: 'Mélange des couches image du point', hue: 325,
    icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-5-11 9"/>',
    fields: UI_GROUPS['imageSources'] ?? [] },
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
    if (props.selectedIdx === null) return;
    const stop = props.colorStops[props.selectedIdx];
    if (!stop) return;
    props.colorStops[props.selectedIdx] = applyStopPresetValues(stop, preset.values);
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



</script>

<template>
  <template v-if="selectedStop">
    <!-- ═══ Point · Couleur ═══ -->
    <DenseSection
      group="params"
      :hue="200"
      title="Point · Couleur"
      scope="S'applique au point sélectionné"
      icon='<circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;9&quot;/><path d=&quot;M12 3a9 9 0 000 18&quot;/>'
    >
      <div class="fields">
        <div class="fld fld-col">
          <span class="fld-lab">Couleur</span>
          <span class="swatch" :style="{ background: selectedHex }">
            <input type="color" :value="selectedHex" @input="selectedHex = ($event.target as HTMLInputElement).value" />
          </span>
          <span class="hex">{{ selectedHex }}</span>
        </div>
        <div class="fld fld-col">
          <span class="fld-lab">Iridescence</span>
          <template v-if="selectedStop.iridescenceColor">
            <span class="swatch" :style="{ background: selectedIridescenceHex }">
              <input type="color" :value="selectedIridescenceHex" @input="selectedIridescenceHex = ($event.target as HTMLInputElement).value" />
            </span>
            <span class="hex">{{ selectedIridescenceHex }}</span>
            <button class="col-clr" title="Retirer l'iridescence" @click="clearIridescenceColor">✕</button>
          </template>
          <template v-else>
            <button class="col-plus" title="Activer l'iridescence" @click="enableIridescenceColor">+</button>
            <span class="hex">off</span>
          </template>
        </div>
      </div>

      <div class="fld fld-curve">
        <span class="fld-lab seg-lab">Courbe de fondu</span>
        <StopTransferCurveSelector v-model="selectedTransferCurve" />
      </div>

      <div class="fields">
        <DenseField
          :label="EFFECT_LABEL_FR.palette" :desc="EFFECT_DESC_FR.palette"
          :min="EFFECT_FIELD_CONFIG.palette.min" :max="EFFECT_FIELD_CONFIG.palette.max" :step="EFFECT_FIELD_CONFIG.palette.step"
          :f="effectFmt('palette')"
          :model-value="getStopEffect('palette')"
          @update:model-value="(v: number) => setStopEffect('palette', v)"
        />
        <DenseField
          :label="EFFECT_LABEL_FR.iridescencePower" :desc="EFFECT_DESC_FR.iridescencePower"
          :min="EFFECT_FIELD_CONFIG.iridescencePower.min" :max="EFFECT_FIELD_CONFIG.iridescencePower.max" :step="EFFECT_FIELD_CONFIG.iridescencePower.step"
          :f="effectFmt('iridescencePower')"
          :model-value="getStopEffect('iridescencePower')"
          @update:model-value="(v: number) => setStopEffect('iridescencePower', v)"
        />
      </div>
    </DenseSection>

    <!-- ═══ Point · Itérations / Éclairage & Matière / Sources image ═══ -->
    <DenseSection
      v-for="sec in POINT_SECTIONS"
      :key="sec.title"
      group="params"
      :hue="sec.hue"
      :title="sec.title"
      :scope="sec.scope"
      :icon="sec.icon"
    >
      <div class="fields">
        <DenseField
          v-for="field in sec.fields" :key="field"
          :label="EFFECT_LABEL_FR[field]"
          :desc="EFFECT_DESC_FR[field]"
          :min="EFFECT_FIELD_CONFIG[field].min"
          :max="EFFECT_FIELD_CONFIG[field].max"
          :step="EFFECT_FIELD_CONFIG[field].step"
          :f="effectFmt(field)"
          :unit="EFFECT_FIELD_CONFIG[field].unit"
          :model-value="getStopEffect(field)"
          @update:model-value="(v: number) => setStopEffect(field, v)"
        />
      </div>
    </DenseSection>

    <!-- ═══ Stop Looks (per-stop reusable looks) — Point · Presets ═══ -->
    <DenseSection
      group="params"
      :hue="300"
      title="Point · Presets"
      scope="Réglages réutilisables pour un point"
      icon='<path d=&quot;M4 19V5a2 2 0 012-2h3v18H6a2 2 0 01-2-2zM9 3h5v18H9zM17 4l4 16-3 1-4-16z&quot;/>'
    >
      <div class="stop-preset-dropdown" ref="stopPresetDropdownRef">
        <button
          class="mini-btn is-fullwidth stop-preset-trigger"
          type="button"
          :class="{ 'has-selection': !!selectedStopPresetRecord }"
          @click="toggleStopPresetDropdown"
          :aria-expanded="stopPresetDropdownOpen"
          aria-haspopup="listbox"
          aria-label="Choose a stop preset"
        >
          <span class="stop-preset-trigger-preview" :style="selectedStopPresetPreview" aria-hidden="true"></span>
          <span class="stop-preset-trigger-label">{{ selectedStopPresetRecord?.name || 'Choisir un preset…' }}</span>
          <i class="fa-solid fa-chevron-down stop-preset-trigger-caret" aria-hidden="true"></i>
        </button>
        <div v-if="stopPresetDropdownOpen" class="stop-preset-dropdown-menu" role="listbox" aria-label="Stop presets">
          <div v-if="stopPresets.length === 0" class="stop-preset-empty">Aucun preset disponible.</div>
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
                :title="preset.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
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
      <div class="transfer">
        <button class="mini-btn primary" :disabled="!selectedStopPresetRecord" @click="applySelectedStopPreset">Appliquer</button>
        <button class="mini-btn danger" :disabled="!selectedStopPresetRecord" @click="deleteSelectedStopPreset">Supprimer</button>
        <button class="mini-btn" :disabled="!selectedStopPresetRecord" @click="exportSelectedStopPreset">Exporter</button>
      </div>
      <div class="save-row">
        <input class="txt-in" v-model="stopPresetName" type="text" placeholder="Nom du preset…" @keyup.enter="saveCurrentStopPreset" />
        <button class="mini-btn primary" :disabled="!stopPresetName.trim()" @click="saveCurrentStopPreset">Enregistrer</button>
      </div>
      <div class="transfer">
        <button class="mini-btn" :disabled="stopPresets.length === 0" @click="exportAllStopPresets">Exporter tout</button>
        <button class="mini-btn" @click="triggerImportStopPresets">Importer</button>
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
.effects-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.effects-section-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  margin: 10px 0 6px;
}
.effects-section-title::before {
  content: "";
  width: 6px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--accent-bright), var(--mauve));
  display: inline-block;
  flex-shrink: 0;
}
.effects-section-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line-soft);
  margin-right: 12px;
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
  border-radius: 10px;
  overflow: hidden;
  background: var(--row);
  padding: 2px;
}
.scope-btn {
  border: 0 !important;
  border-radius: 8px !important;
  min-width: 92px;
  height: 30px;
  line-height: 30px;
  font-size: 13px !important;
  font-weight: 600;
  color: var(--ink-2) !important;
  background: transparent !important;
  transition: .15s;
}
.scope-btn:hover {
  color: var(--ink) !important;
  background: var(--row-on) !important;
}
.scope-btn.is-active {
  color: #fff !important;
  background: var(--accent) !important;
  box-shadow: 0 2px 8px -2px var(--accent) !important;
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
  min-height: 42px;
  padding: 5px 10px !important;
  border: 1px solid var(--line) !important;
  border-radius: 12px !important;
  background: var(--bg-0) !important;
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
  .effects-header {
    align-items: stretch;
    flex-direction: column;
  }
  .stop-scope-toggle {
    align-self: flex-start;
  }
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
