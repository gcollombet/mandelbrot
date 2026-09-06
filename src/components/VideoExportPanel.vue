<script setup lang="ts">
import RenderProgress from './RenderProgress.vue';
import { computed, ref, watch } from 'vue';
import type { MandelbrotExposed } from '../types/MandelbrotExposed';
import type { Engine } from '../Engine';
import ExpmapVideoPanel from './ExpmapVideoPanel.vue';
import { expmapVideoSelected, expmapBusy } from '../expmap/runtime';
import {
  describeOutputWarnings,
  describeParcoursWarnings,
  estimatedWorkingBytes,
  MAX_MAGNIFICATION_THRESHOLD,
  MIN_MAGNIFICATION_THRESHOLD,
  SUPERSAMPLE_FACTORS,
  neutralSizeFor,
  validateVideoOutput,
  validateVideoPath,
  type ParcoursWarning,
  type VideoOutputSpec,
  type VideoPathLocation,
  type VideoPathProblem,
} from '../videoPath';
import { totalFramesFor } from '../videoExportSession';
import {
  MP4_CODECS,
  probeMp4Codecs,
  type Mp4Codec,
} from '../videoEncoderSink';
import {
  AA_SAMPLE_CHOICES,
  loadVideoExportPreferences,
  saveVideoExportPreferences,
} from '../videoExportPreferences';
import {
  evaluateTiledKeyframeEligibility,
  planKeyframeTiles,
  TILED_EXPORT_WORKGROUP_ALIGNMENT,
  type TiledExportMemoryProfile,
  type VideoExportRenderMode,
} from '../tiledKeyframeExport';
import { DenseField, DenseSection, DenseSelect } from './dense';

const props = defineProps<{
  engine?: Engine | null;
  controller?: MandelbrotExposed | null;
  /** Live view parameters, the source both endpoints are captured from. */
  current: Record<string, unknown>;
  maxTextureDimension: number;
  tiledMemoryProfile: TiledExportMemoryProfile;
  /** Live session state, owned by the parent. */
  running: boolean;
  framesEmitted: number;
  totalFrames: number;
  lastError: string | null;
}>();

const emit = defineEmits<{
  (e: 'start', payload: {
    durationSeconds: number;
    output: VideoOutputSpec;
    codec: Mp4Codec;
    aaSamplesPerFrame: number;
    renderMode: VideoExportRenderMode;
    tiledMemoryBudgetMiB: number;
    startLocation: VideoPathLocation;
    endLocation: VideoPathLocation;
  }): void;
  (e: 'cancel'): void;
}>();

const RESOLUTIONS = [
  { value: '1280x720', label: '720p — 1280×720' },
  { value: '1920x1080', label: '1080p — 1920×1080' },
  { value: '2560x1440', label: '1440p — 2560×1440' },
  { value: '3840x2160', label: '4K — 3840×2160' },
];
const FPS_OPTIONS = [
  { value: '24', label: '24 fps' },
  { value: '25', label: '25 fps' },
  { value: '30', label: '30 fps' },
  { value: '60', label: '60 fps' },
];
const SUPERSAMPLE_OPTIONS = SUPERSAMPLE_FACTORS.map(factor => ({
  value: String(factor),
  label: factor === 1 ? '×1 — aucun suréchantillonnage'
    : factor === 2 ? '×2 — recommandé'
    : `×${factor}`,
}));

// Restored from storage: the panel is unmounted when its tab closes, and a
// pinned endpoint often took real navigation to reach.
const saved = loadVideoExportPreferences();

// Either endpoint may be pinned; an unpinned one tracks the live view. Pinning
// both is the normal workflow — pin the start, navigate, pin the destination.
const pinnedStart = ref<VideoPathLocation | null>(saved.pinnedStart);
const pinnedEnd = ref<VideoPathLocation | null>(saved.pinnedEnd);
const durationSeconds = ref(saved.durationSeconds);
const resolution = ref(saved.resolution);
const fps = ref(saved.fps);
const supersample = ref(saved.supersample);
const magnificationThreshold = ref(saved.magnificationThreshold);
const codec = ref<Mp4Codec>(saved.codec);
const aaSamplesPerFrame = ref<number>(saved.aaSamplesPerFrame);
const renderMode = ref<VideoExportRenderMode>(saved.renderMode);
const tiledMemoryBudgetMiB = ref(saved.tiledMemoryBudgetMiB);

const AA_OPTIONS = AA_SAMPLE_CHOICES.map(n => ({
  value: String(n),
  label: n === 1 ? 'Aucun' : `×${n} échantillons`,
}));
const selectableAaOptions = computed(() => renderMode.value === 'tiled-keyframe'
  ? AA_OPTIONS.filter(option => option.value === '1')
  : AA_OPTIONS);
const RENDER_MODE_OPTIONS = [
  { value: 'monolithic', label: 'Monolithique' },
  { value: 'tiled-keyframe', label: 'Keyframes tuilées' },
];

watch(renderMode, (mode) => {
  if (mode === 'tiled-keyframe') aaSamplesPerFrame.value = 1;
}, { immediate: true });

watch(
  [pinnedStart, pinnedEnd, durationSeconds, resolution, fps, supersample, magnificationThreshold,
    codec, aaSamplesPerFrame, renderMode, tiledMemoryBudgetMiB],
  () => saveVideoExportPreferences({
    pinnedStart: pinnedStart.value,
    pinnedEnd: pinnedEnd.value,
    durationSeconds: durationSeconds.value,
    resolution: resolution.value,
    fps: fps.value,
    supersample: supersample.value,
    magnificationThreshold: magnificationThreshold.value,
    codec: codec.value,
    aaSamplesPerFrame: aaSamplesPerFrame.value,
    renderMode: renderMode.value,
    tiledMemoryBudgetMiB: tiledMemoryBudgetMiB.value,
  }),
  { deep: true },
);

const output = computed<VideoOutputSpec>(() => {
  const [width, height] = resolution.value.split('x').map(Number);
  return {
    width, height,
    fps: Number(fps.value),
    supersample: Number(supersample.value),
    magnificationThreshold: magnificationThreshold.value,
  };
});

// Encoder support varies by platform and is size-dependent (H.264 needs even
// dimensions), so the list is probed rather than assumed.
const codecSupport = ref<Partial<Record<Mp4Codec, boolean>>>({});
watch(output, async (spec) => {
  codecSupport.value = await probeMp4Codecs(spec.width, spec.height);
}, { immediate: true });

const codecOptions = computed(() => MP4_CODECS.map(({ value, label }) => ({
  value,
  label: codecSupport.value[value] === false ? `${label} — indisponible ici` : label,
})));

const codecUnsupported = computed(() => codecSupport.value[codec.value] === false);

const tiledEligibility = computed(() => evaluateTiledKeyframeEligibility({
  from: effectiveStart.value,
  to: effectiveEnd.value,
  aaSamplesPerFrame: aaSamplesPerFrame.value,
}));

const tiledPlan = computed(() => {
  if (renderMode.value !== 'tiled-keyframe') return null;
  try {
    return planKeyframeTiles({
      neutralSide: neutralSizeFor(
        output.value.width * output.value.supersample,
        output.value.height * output.value.supersample,
      ),
      alignment: TILED_EXPORT_WORKGROUP_ALIGNMENT,
      budgetBytes: tiledMemoryBudgetMiB.value * 1024 * 1024,
      memory: props.tiledMemoryProfile,
    });
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
});

const problems = computed<VideoPathProblem[]>(() => {
  const result: VideoPathProblem[] = [
    ...validateVideoOutput(output.value, props.maxTextureDimension),
    ...validateVideoPath({
    from: effectiveStart.value,
    to: effectiveEnd.value,
    durationSeconds: durationSeconds.value,
  }),
  ];
  if (renderMode.value === 'tiled-keyframe') {
    result.push(...tiledEligibility.value.problems.map(message => ({kind: 'output' as const, message})));
    if (tiledPlan.value instanceof Error) {
      result.push({kind: 'output', field: 'budget mémoire', message: tiledPlan.value.message});
    }
  }
  return result;
});

const warnings = computed<ParcoursWarning[]>(() => [
  ...describeParcoursWarnings(effectiveStart.value, effectiveEnd.value),
  ...describeOutputWarnings(output.value),
]);

const frameCount = computed(() =>
  totalFramesFor({ fps: Number(fps.value), durationSeconds: durationSeconds.value }));

const workingTextureSide = computed(() =>
  neutralSizeFor(output.value.width * output.value.supersample,
                 output.value.height * output.value.supersample));

const workingSetLabel = computed(() => {
  const gigabytes = estimatedWorkingBytes(output.value) / 1073741824;
  return gigabytes >= 1 ? `~${gigabytes.toFixed(1)} Go` : `~${Math.round(gigabytes * 1024)} Mo`;
});

function memoryLabel(bytes: number): string {
  const mib = bytes / (1024 * 1024);
  return mib >= 1024 ? `${(mib / 1024).toFixed(2)} Go` : `${Math.round(mib)} Mo`;
}

const tiledMemoryLabel = computed(() => {
  const plan = tiledPlan.value;
  if (!plan || plan instanceof Error) return '';
  return `${plan.tiles.length} tuile${plan.tiles.length > 1 ? 's' : ''} — `
    + `${memoryLabel(plan.estimate.squareBytes)} plein carré + `
    + `${memoryLabel(plan.estimate.tileBytes)} tuile = `
    + `${memoryLabel(plan.estimate.totalBytes)}`;
});

const canStart = computed(() =>
  !props.running && problems.value.length === 0 && !codecUnsupported.value);


function currentLocation(): VideoPathLocation {
  return {
    cx: String(props.current.cx ?? '0'),
    cy: String(props.current.cy ?? '0'),
    scale: String(props.current.scale ?? '1'),
    angle: Number(props.current.angle ?? 0),
  };
}

const effectiveStart = computed(() => pinnedStart.value ?? currentLocation());
const effectiveEnd = computed(() => pinnedEnd.value ?? currentLocation());

function pinStart() { pinnedStart.value = currentLocation(); }
function clearStart() { pinnedStart.value = null; }
function pinEnd() { pinnedEnd.value = currentLocation(); }
function clearEnd() { pinnedEnd.value = null; }

function shortScale(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n.toExponential(2) : value.slice(0, 10);
}

function start() {
  if (!canStart.value) return;
  emit('start', {
    durationSeconds: durationSeconds.value,
    output: output.value,
    codec: codec.value,
    aaSamplesPerFrame: aaSamplesPerFrame.value,
    renderMode: renderMode.value,
    tiledMemoryBudgetMiB: tiledMemoryBudgetMiB.value,
    startLocation: effectiveStart.value,
    endLocation: effectiveEnd.value,
  });
}
</script>

<template>
  <div class="video-export-panel sections">
    <fieldset :disabled="running || expmapBusy" class="ve-config"><DenseSelect label="Source" :model-value="expmapVideoSelected ? 'expmap' : 'mandelbrot'" :options="[{ value: 'mandelbrot', label: 'Mandelbrot' }, { value: 'expmap', label: 'Document ExpMap' }]" @update:model-value="expmapVideoSelected = $event === 'expmap'"/></fieldset>
    <ExpmapVideoPanel v-if="expmapVideoSelected" :engine="engine" :controller="controller"/>
    <fieldset v-else :disabled="running || expmapBusy" class="ve-config">
    <DenseSection title="Parcours" scope="Deux positions capturées depuis la vue">
      <div class="fields">
        <div class="ve-row">
          <span class="ve-label">Départ</span>
          <div class="ve-start-controls">
            <button type="button" class="ve-pin" :disabled="running" @click="pinStart">
              {{ pinnedStart ? 'Redéfinir ici' : 'Définir le départ ici' }}
            </button>
            <button v-if="pinnedStart" type="button" class="ve-pin ve-pin-clear" :disabled="running" @click="clearStart">
              Vue courante
            </button>
          </div>
        </div>
        <p class="ve-note ve-mono">
          {{ pinnedStart ? 'épinglé' : 'vue courante' }} —
          {{ effectiveStart.cx.slice(0, 14) }}, {{ effectiveStart.cy.slice(0, 14) }}
          @ {{ shortScale(effectiveStart.scale) }}
        </p>
        <div class="ve-row">
          <span class="ve-label">Arrivée</span>
          <div class="ve-start-controls">
            <button type="button" class="ve-pin" :disabled="running" @click="pinEnd">
              {{ pinnedEnd ? 'Redéfinir ici' : 'Définir l\u2019arrivée ici' }}
            </button>
            <button v-if="pinnedEnd" type="button" class="ve-pin ve-pin-clear" :disabled="running" @click="clearEnd">
              Vue courante
            </button>
          </div>
        </div>
        <p class="ve-note ve-mono">
          {{ pinnedEnd ? 'épinglée' : 'vue courante' }} —
          {{ effectiveEnd.cx.slice(0, 14) }}, {{ effectiveEnd.cy.slice(0, 14) }}
          @ {{ shortScale(effectiveEnd.scale) }}
        </p>
        <DenseField
          label="Durée"
          :min="1" :max="120" :step="1"
          unit="s"
          :model-value="durationSeconds"
          @update:model-value="(v: number) => durationSeconds = v"
        />
        <p class="ve-note">
          {{ frameCount }} images — la première sur le départ, la dernière exactement sur l'arrivée.
          Le rendu utilise l'apparence actuelle, du début à la fin.
        </p>
      </div>
    </DenseSection>

    <DenseSection title="Sortie">
      <div class="ve-form"><label class="ve-row">
          <span class="ve-label">Résolution</span>
          <DenseSelect
            :options="RESOLUTIONS" :model-value="resolution" :disabled="running"
            @update:model-value="(v: string) => resolution = v"
          />
        </label><label class="ve-row">
          <span class="ve-label">Cadence</span>
          <DenseSelect
            :options="FPS_OPTIONS" :model-value="fps" :disabled="running"
            @update:model-value="(v: string) => fps = v"
          />
        </label><label class="ve-row">
          <span class="ve-label">Codec</span>
          <DenseSelect
            :options="codecOptions" :model-value="codec" :disabled="running"
            @update:model-value="(v: string) => codec = v as Mp4Codec"
          />
        </label></div>
    </DenseSection>
    <DenseSection title="Qualité">
      <div class="ve-form"><label class="ve-row">
          <span class="ve-label">Anticrénelage</span>
          <DenseSelect
            :options="selectableAaOptions" :model-value="String(aaSamplesPerFrame)" :disabled="running"
            @update:model-value="(v: string) => aaSamplesPerFrame = Number(v)"
          />
        </label><label class="ve-row">
          <span class="ve-label">Suréchantillonnage</span>
          <DenseSelect
            :options="SUPERSAMPLE_OPTIONS" :model-value="supersample" :disabled="running"
            @update:model-value="(v: string) => supersample = v"
          />
        </label></div>
      <p class="ve-note">{{ renderMode === 'tiled-keyframe' ? tiledMemoryLabel : workingSetLabel }} · texture {{ workingTextureSide }}²</p>
      <details class="ve-advanced"><summary>Réglages avancés</summary><div class="ve-form"><label class="ve-row">
          <span class="ve-label">Mode mémoire</span>
          <DenseSelect
            :options="RENDER_MODE_OPTIONS" :model-value="renderMode" :disabled="running"
            @update:model-value="(v: string) => renderMode = v as VideoExportRenderMode"
          />
        </label><DenseField
          v-if="renderMode === 'tiled-keyframe'"
          label="Budget mémoire"
          :min="64" :max="32768" :step="128"
          unit="Mio"
          :model-value="tiledMemoryBudgetMiB"
          @update:model-value="(v: number) => tiledMemoryBudgetMiB = v"
        /><DenseField
          label="Seuil de bascule"
          :min="MIN_MAGNIFICATION_THRESHOLD" :max="MAX_MAGNIFICATION_THRESHOLD" :step="1"
          :model-value="magnificationThreshold"
          @update:model-value="(v: number) => magnificationThreshold = v"
        /></div>
        <p class="ve-note">Seuil de bascule : une valeur basse reconverge plus souvent ; une valeur haute privilégie la vitesse. Limite texture : {{ maxTextureDimension }}.</p>
      </details>
    </DenseSection>
    </fieldset>
    <DenseSection v-if="!expmapVideoSelected" class="ve-footer" title="Export" scope="Chaque image est calculée jusqu'à convergence">
      <div class="fields">
        <ul v-if="problems.length" class="ve-problems">
          <li v-for="(problem, index) in problems" :key="index">
            <strong v-if="problem.field">{{ problem.field }}</strong>
            {{ problem.message }}
          </li>
        </ul>
        <p v-if="codecUnsupported" class="ve-error">
          Ce navigateur ne sait pas encoder cette résolution en {{ codec.toUpperCase() }}. Choisis un autre codec.
        </p>
        <ul v-if="warnings.length" class="ve-warnings">
          <li v-for="(warning, index) in warnings" :key="index">{{ warning.message }}</li>
        </ul>

        <p v-if="lastError" class="ve-error">{{ lastError }}</p>

        <RenderProgress v-if="running || framesEmitted > 0" :label="running ? (totalFrames > 0 && framesEmitted >= totalFrames ? 'Finalisation du fichier MP4' : 'Calcul et encodage des images') : lastError ? 'Export arrêté' : framesEmitted >= totalFrames ? 'Export terminé' : 'Export interrompu'" :done="framesEmitted" :total="totalFrames" unit="images encodées" :active="running"/>

        <div class="ve-actions">
          <button type="button" class="ve-start" :disabled="!canStart || expmapBusy" @click="start">
            Exporter en MP4
          </button>
          <button v-if="running" type="button" class="ve-cancel" @click="emit('cancel')">
            Annuler
          </button>
        </div>
      </div>
    </DenseSection>
  </div>
</template>

<style scoped>
.ve-row { display: flex; align-items: center; gap: 0.5rem; justify-content: space-between; }
.ve-label { font-size: 0.75rem; opacity: 0.8; }
.ve-note { font-size: 0.7rem; opacity: 0.65; margin: 0.25rem 0 0; line-height: 1.4; }
.ve-problems {
  margin: 0.25rem 0 0; padding: 0.4rem 0.6rem 0.4rem 1.2rem;
  font-size: 0.7rem; line-height: 1.5;
  border-left: 2px solid rgb(226, 158, 64); background: rgba(226, 158, 64, 0.08);
}
.ve-problems strong { display: inline-block; margin-right: 0.3rem; }
.ve-warnings {
  margin: 0.25rem 0 0; padding: 0.4rem 0.6rem 0.4rem 1.2rem;
  font-size: 0.7rem; line-height: 1.5; opacity: 0.85;
  border-left: 2px solid rgba(150, 170, 200, 0.6); background: rgba(150, 170, 200, 0.07);
}
.ve-error {
  margin: 0.4rem 0 0; padding: 0.4rem 0.6rem; font-size: 0.7rem;
  border-left: 2px solid rgb(226, 96, 96); background: rgba(226, 96, 96, 0.1);
}
.ve-start-controls { display: flex; gap: 0.35rem; }
.ve-mono { font-family: ui-monospace, monospace; font-size: 0.65rem; }
.ve-pin {
  padding: 0.2rem 0.5rem; font-size: 0.68rem; border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.06);
  color: inherit; cursor: pointer; white-space: nowrap;
}
.ve-pin:disabled { opacity: 0.4; cursor: not-allowed; }
.ve-pin-clear { opacity: 0.7; }
.ve-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
.ve-start, .ve-cancel {
  padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.06);
  color: inherit; cursor: pointer;
}
.ve-start:disabled { opacity: 0.4; cursor: not-allowed; }
.ve-cancel { border-color: rgba(226, 96, 96, 0.4); }
</style>

<style scoped>
.ve-config { display: flex; flex-direction: column; gap: 7px; margin: 0; padding: 0; border: 0; min-width: 0; }
.ve-form { display: flex; flex-direction: column; gap: 6px; }
.video-export-panel :deep(.fields) { display: flex !important; flex-direction: column; gap: 6px; }
.ve-row { display: grid; grid-template-columns: minmax(90px, .8fr) minmax(0, 1.4fr); min-width: 0; }
.ve-row :deep(.fld) { width: 100%; }
.ve-row :deep(.selbox) { flex-basis: 0; }
.ve-start-controls { flex-wrap: wrap; justify-content: flex-end; }
.ve-mono { overflow-wrap: anywhere; padding-bottom: 6px; }
.ve-footer { position: sticky; bottom: -8px; z-index: 2; background: var(--panel-2, #202532); }
.ve-footer :deep(.sec-head) { display: none; }
.ve-actions { margin: 0; }
.ve-start { background: var(--accent); color: white; font-weight: 600; flex: 1; min-height: 34px; }
.ve-note { opacity: 1; color: var(--ink-2); }
.ve-advanced { margin-top: 7px; }
</style>
