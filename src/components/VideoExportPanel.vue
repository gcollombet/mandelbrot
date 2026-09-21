<script setup lang="ts">
import ExpmapZoomControl from './ExpmapZoomControl.vue';
import VideoMotionControls from './VideoMotionControls.vue';
import VideoRotationControls from './VideoRotationControls.vue';
import { captureVideoCenter, captureVideoZoom, fractalVideoFilename } from '../videoCameraControls';
import { compactNumber, magnitudeSummary } from '../expmap/controls';
import { scaleDoublements } from '../expmap/decimal';
import { preferredExpmapCodec } from '../expmap/outputPreferences';
import { fitMotion, validateMotion, type ExpmapMotion } from '../expmap/motion';
import RenderProgress from './RenderProgress.vue';
import { computed, ref, watch } from 'vue';
import type { MandelbrotExposed } from '../types/MandelbrotExposed';
import type { Engine } from '../Engine';
import ExpmapVideoPanel from './ExpmapVideoPanel.vue';
import ShaderExpmapPanel from './ShaderExpmapPanel.vue';
import { expmapVideoSelected, shaderExpmapVideoSelected, expmapBusy } from '../expmap/runtime';
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
  type EncoderPreference,
  type Mp4Codec,
} from '../videoEncoderSink';
import {
  AA_SAMPLE_CHOICES,
  loadVideoExportPreferences,
  saveVideoExportPreferences,
  DEFAULT_VIDEO_EXPORT_PREFERENCES,
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
  warning?: string | null;
}>();

const emit = defineEmits<{
  (e: 'start', payload: {
    durationSeconds: number;
    motion: ExpmapMotion;
    filename: string;
    output: VideoOutputSpec;
    codec: Mp4Codec;
    aaSamplesPerFrame: number;
    renderMode: VideoExportRenderMode;
    tiledMemoryBudgetMiB: number;
    startLocation: VideoPathLocation;
    endLocation: VideoPathLocation;
  }): void;
  (e: 'cancel'): void;
  (e: 'preview', location: VideoPathLocation): void;
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

// Snapshot initial endpoints once; subsequent camera movement never rewrites
// an endpoint without an explicit center/zoom capture.
const pinnedStart = ref<VideoPathLocation | null>(saved.pinnedStart ?? currentLocation());
const pinnedEnd = ref<VideoPathLocation | null>(saved.pinnedEnd ?? currentLocation());
const durationSeconds = ref(saved.durationSeconds);
const resolution = ref(saved.resolution);
const fps = ref(saved.fps);
const supersample = ref(saved.supersample);
const magnificationThreshold = ref(saved.magnificationThreshold);
const dynamicRange = ref<'sdr' | 'hdr'>(saved.dynamicRange ?? 'sdr');
const hdrExposure = ref(saved.hdrExposure ?? 0);
const hdrQuantizer = ref(saved.hdrQuantizer ?? DEFAULT_VIDEO_EXPORT_PREFERENCES.hdrQuantizer!);
const codec = ref<Mp4Codec | 'auto'>(saved.codec);
watch(dynamicRange, mode => { if (mode === 'hdr' && codec.value === 'avc') codec.value = 'auto'; }, { immediate: true });
const motion = ref({ ...saved.motion });
const filename = ref(saved.filename);
const timingAuthority = ref(saved.timingAuthority);
const totalDuration = computed(() => durationSeconds.value + motion.value.holdSeconds);
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
    codec, dynamicRange, hdrExposure, hdrQuantizer, motion, filename, timingAuthority, aaSamplesPerFrame, renderMode, tiledMemoryBudgetMiB],
  () => saveVideoExportPreferences({
    pinnedStart: pinnedStart.value,
    pinnedEnd: pinnedEnd.value,
    durationSeconds: durationSeconds.value,
    resolution: resolution.value,
    fps: fps.value,
    supersample: supersample.value,
    magnificationThreshold: magnificationThreshold.value,
    codec: codec.value,
    dynamicRange: dynamicRange.value,
    hdrExposure: hdrExposure.value,
    hdrQuantizer: hdrQuantizer.value,
    motion: motion.value,
    filename: filename.value,
    timingAuthority: timingAuthority.value,
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
    dynamicRange: dynamicRange.value,
    hdrExposure: hdrExposure.value,
    hdrQuantizer: hdrQuantizer.value,
    fps: Number(fps.value),
    supersample: Number(supersample.value),
    magnificationThreshold: magnificationThreshold.value,
  };
});

// Encoder support varies by platform and is size-dependent (H.264 needs even
// dimensions), so the list is probed rather than assumed.
const codecSupport = ref<Partial<Record<Mp4Codec, boolean>>>({});
const probing = ref(true);
const encoderPreferences = ref<Partial<Record<Mp4Codec, EncoderPreference>>>({})
const effectiveCodec = computed(() => codec.value === 'auto' ? (dynamicRange.value === 'hdr' ? (['hevc','av1','vp9'] as const).find(c => codecSupport.value[c]) ?? null : preferredExpmapCodec(codecSupport.value)) : codecSupport.value[codec.value] ? codec.value : null);
const encoderLabel = computed(() => probing.value || !effectiveCodec.value || !encoderPreferences.value[effectiveCodec.value] ? '' : encoderPreferences.value[effectiveCodec.value] === 'prefer-hardware' ? ' · Matériel préféré' : ' · Repli navigateur — logiciel possible')
const codecLabel = computed(() => probing.value ? 'Vérification de l’encodeur…' : effectiveCodec.value === 'hevc' ? 'HEVC' : effectiveCodec.value === 'avc' ? 'H.264 · compatibilité' : effectiveCodec.value?.toUpperCase() ?? 'Encodage indisponible');
watch([resolution, fps, dynamicRange], async (_values, _old, onCleanup) => {
  const spec = output.value;
  let current = true;
  probing.value = true; codecSupport.value = {}; encoderPreferences.value = {};
  onCleanup(() => { current = false; });
  const support = await probeMp4Codecs(spec.width, spec.height, spec.fps, (codec, preference) => { if (current) encoderPreferences.value[codec] = preference }, spec.dynamicRange);
  if (!current) return;
  codecSupport.value = support;
  probing.value = false;
}, { immediate: true });

const hdrQuantizerMax = computed(() => effectiveCodec.value === 'hevc' ? 51 : 63);
watch(hdrQuantizerMax, max => { if (hdrQuantizer.value > max) hdrQuantizer.value = max; });
const codecOptions = computed(() => [{value:'auto',label:dynamicRange.value === 'hdr' ? 'Auto · HEVC, AV1, VP9 10 bits' : 'Auto · HEVC, sinon H.264'}, ...MP4_CODECS.filter(c => dynamicRange.value !== 'hdr' || c.value !== 'avc').map(({value,label}) => ({value,label:codecSupport.value[value] === false ? `${label} — indisponible ici` : label}))]);
const codecUnsupported = computed(() => !probing.value && !effectiveCodec.value);

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
  try { validateMotion(motion.value, durationSeconds.value); } catch (e) { result.push({kind:'duration',message:(e as Error).message}); }
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
  totalFramesFor({ fps: Number(fps.value), durationSeconds: totalDuration.value }));

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
  !props.running && !expmapBusy.value && problems.value.length === 0 && !probing.value && !!effectiveCodec.value);


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

function centerCurrent(side?: 'start' | 'end') {
  const current = currentLocation();
  if (side !== 'end') pinnedStart.value = captureVideoCenter(effectiveStart.value, current);
  if (side !== 'start') pinnedEnd.value = captureVideoCenter(effectiveEnd.value, current);
}
function setZoom(side: 'start' | 'end', scale: string) {
  if (side === 'start') pinnedStart.value = captureVideoZoom(effectiveStart.value, scale);
  else pinnedEnd.value = captureVideoZoom(effectiveEnd.value, scale);
}
function setRotation(value: {fromAngle:number;toAngle:number}) {
  pinnedStart.value = { ...effectiveStart.value, angle: value.fromAngle };
  pinnedEnd.value = { ...effectiveEnd.value, angle: value.toAngle };
}
function reverse() { const a = {...effectiveStart.value}; pinnedStart.value = {...effectiveEnd.value}; pinnedEnd.value = a; }
const zoomDistance = computed(() => { try { return Math.abs(scaleDoublements(effectiveStart.value.scale,effectiveEnd.value.scale)); } catch { return 0; } });
const meanSpeed = ref(zoomDistance.value / durationSeconds.value);
function duration(value: number) {
  durationSeconds.value = value; timingAuthority.value = 'duration'; meanSpeed.value = zoomDistance.value / value;
  motion.value = fitMotion({...motion.value,durationSeconds:value});
}
function speed(value: number) {
  if (!(value > 0) || !zoomDistance.value) return;
  meanSpeed.value = value; timingAuthority.value = 'speed'; durationSeconds.value = zoomDistance.value / value;
  motion.value = fitMotion({...motion.value,durationSeconds:durationSeconds.value});
}
watch(zoomDistance, distance => {
  if (timingAuthority.value === 'speed' && meanSpeed.value > 0 && distance > 0) {
    durationSeconds.value = distance / meanSpeed.value;
    motion.value = fitMotion({...motion.value,durationSeconds:durationSeconds.value});
  } else meanSpeed.value = distance / durationSeconds.value;
});

function start() {
  if (!canStart.value) return;
  emit('start', {
    durationSeconds: durationSeconds.value,
    output: output.value,
    codec: effectiveCodec.value!,
    motion: { ...motion.value },
    filename: fractalVideoFilename(filename.value),
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
    <fieldset :disabled="running || expmapBusy" class="ve-config"><DenseSelect label="Source" :model-value="shaderExpmapVideoSelected ? 'shader' : expmapVideoSelected ? 'expmap' : 'mandelbrot'" :options="[{ value: 'mandelbrot', label: 'Vidéo depuis la fractale' }, { value: 'expmap', label: 'Vidéo depuis une ExpMap cuite' }, { value: 'shader', label: 'Vidéo depuis une ExpMap recolorable' }]" @update:model-value="expmapVideoSelected = $event === 'expmap'; shaderExpmapVideoSelected = $event === 'shader'"/></fieldset>
    <p v-if="expmapVideoSelected" class="ve-note">Cette source RGB exporte en SDR. Pour une vidéo HDR, choisir « Vidéo depuis la fractale » ou une source recolorable, puis Dynamique → HDR.</p>
    <ShaderExpmapPanel v-if="shaderExpmapVideoSelected" video-only :plan="null" name="" :appearance="current as unknown as import('../Engine').RenderOptions" :engine="engine ?? null" :controller="controller ?? null"/>
    <ExpmapVideoPanel v-else-if="expmapVideoSelected" :engine="engine" :controller="controller"/>
    <fieldset v-else :disabled="running || expmapBusy" class="ve-config">
    <DenseSection title="Trajet" scope="Rendu de la fractale, image par image">
      <div class="ve-capture"><span>Centre fixe</span><button class="ve-pin" @click="centerCurrent()">Utiliser le centre actuel</button></div>
      <details><summary>Centres distincts · travelling</summary>
        <div class="ve-capture"><span>Centre de départ</span><button class="ve-pin" @click="centerCurrent('start')">Centre actuel</button></div>
        <div class="ve-capture"><span>Centre d’arrivée</span><button class="ve-pin" @click="centerCurrent('end')">Centre actuel</button></div>
        <p class="ve-note">{{ effectiveStart.cx === effectiveEnd.cx && effectiveStart.cy === effectiveEnd.cy ? 'Centre identique sur tout le trajet.' : 'Le centre se déplace entre les deux positions.' }}</p>
      </details>
      <ExpmapZoomControl :model-value="effectiveStart.scale" label="Départ" @update:model-value="setZoom('start',$event)" @capture="setZoom('start',currentLocation().scale)"><button class="ve-pin" @click="emit('preview',{...effectiveStart})">Voir</button></ExpmapZoomControl>
      <ExpmapZoomControl :model-value="effectiveEnd.scale" label="Arrivée" @update:model-value="setZoom('end',$event)" @capture="setZoom('end',currentLocation().scale)"><button class="ve-pin" @click="emit('preview',{...effectiveEnd})">Voir</button></ExpmapZoomControl>
      <div class="ve-capture"><small>Vue large 10^+10 → zoom profond 10^-1000</small><button class="ve-pin" @click="reverse">⇄ Inverser le trajet</button></div>
      <p class="ve-note">{{ magnitudeSummary(effectiveStart.scale,effectiveEnd.scale) }}</p>
      <DenseField label="Durée du trajet" :min=".1" :max="86400" :step=".1" :default="DEFAULT_VIDEO_EXPORT_PREFERENCES.durationSeconds" unit="s" :f="compactNumber" :model-value="durationSeconds" @update:model-value="duration"/>
      <details><summary>Vitesse moyenne</summary><DenseField v-if="zoomDistance > 0" label="Doublements/s" :model-value="meanSpeed" :min=".1" :max="100" :step=".1" :f="compactNumber" @update:model-value="speed"/><p class="ve-note">La dernière valeur modifiée (durée ou vitesse) reste prioritaire lorsque la plage change.</p></details>
      <p class="ve-note">{{ frameCount }} images · {{ compactNumber(totalDuration) }} s au total. L’apparence courante est utilisée sur tout le trajet.</p>
    </DenseSection>
    <VideoRotationControls :from-angle="effectiveStart.angle" :to-angle="effectiveEnd.angle" :current-angle="currentLocation().angle" @change="setRotation"/>
    <VideoMotionControls v-model="motion" :duration-seconds="durationSeconds"/>

    <DenseSection title="Sortie">
      <DenseSelect label="Dynamique" v-model="dynamicRange" :options="[{value:'sdr',label:'SDR · 8 bits'},{value:'hdr',label:'HDR · 10 bits PQ'}]"/>
      <label v-if="dynamicRange === 'hdr'" class="ve-row"><span class="ve-label">Exposition HDR (EV)</span><input type="number" v-model.number="hdrExposure" min="-16" max="16" step="0.5" aria-label="Exposition vidéo HDR"/></label>
      <DenseField v-if="dynamicRange === 'hdr'" label="Quantificateur" v-model="hdrQuantizer" :min="0" :max="hdrQuantizerMax" :step="1" :default="DEFAULT_VIDEO_EXPORT_PREFERENCES.hdrQuantizer"/>
      <p v-if="dynamicRange === 'hdr'" class="ve-note">Rec.2020 / PQ · blanc de référence 203 nits. Indépendant de l’affichage HDR. Le profil 10 bits est vérifié au démarrage ; aucun repli SDR. Qualité constante : 0 = maximale et fichiers très lourds, 10 à 20 = visuellement propre ; le débit cible est ignoré, repli en débit variable si l’encodeur refuse ce mode.</p>
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
            @update:model-value="(v: string) => codec = v as Mp4Codec | 'auto'"
          />
        </label></div>
      <p class="ve-note" role="status">{{ codecLabel }}{{ encoderLabel }}</p>
      <label class="ve-capture">Nom du fichier <input v-model="filename" aria-label="Nom du fichier vidéo"/></label>
      <p class="ve-note">{{ fractalVideoFilename(filename) }}</p>
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
      <p class="ve-note">Le budget mémoire prudent de l’appareil est indicatif : l’export peut le dépasser si le GPU accepte l’allocation.</p>
      <details class="ve-advanced"><summary>Réglages avancés</summary><div class="ve-form"><label class="ve-row">
          <span class="ve-label">Mode mémoire</span>
          <DenseSelect
            :options="RENDER_MODE_OPTIONS" :model-value="renderMode" :disabled="running"
            @update:model-value="(v: string) => renderMode = v as VideoExportRenderMode"
          />
        </label><DenseField
          v-if="renderMode === 'tiled-keyframe'"
          label="Budget mémoire"
          :min="64" :max="32768" :step="128" :default="DEFAULT_VIDEO_EXPORT_PREFERENCES.tiledMemoryBudgetMiB"
          unit="Mio"
          :model-value="tiledMemoryBudgetMiB"
          @update:model-value="(v: number) => tiledMemoryBudgetMiB = v"
        /><DenseField
          label="Seuil de bascule"
          :min="MIN_MAGNIFICATION_THRESHOLD" :max="MAX_MAGNIFICATION_THRESHOLD" :step="1" :default="DEFAULT_VIDEO_EXPORT_PREFERENCES.magnificationThreshold"
          :model-value="magnificationThreshold"
          @update:model-value="(v: number) => magnificationThreshold = v"
        /></div>
        <p class="ve-note">Seuil de bascule : une valeur basse reconverge plus souvent ; une valeur haute privilégie la vitesse. Limite texture : {{ maxTextureDimension }}.</p>
      </details>
    </DenseSection>
    </fieldset>
    <DenseSection v-if="!expmapVideoSelected && !shaderExpmapVideoSelected" class="ve-footer" title="Export" scope="Chaque image est calculée jusqu'à convergence">
      <div class="fields">
        <ul v-if="problems.length" class="ve-problems">
          <li v-for="(problem, index) in problems" :key="index">
            <strong v-if="problem.field">{{ problem.field }}</strong>
            {{ problem.message }}
          </li>
        </ul>
        <p v-if="codecUnsupported" class="ve-error">
          {{ dynamicRange === 'hdr' ? 'Aucun encodeur HDR 10 bits disponible pour ce choix dans ce navigateur.' : 'Aucun encodeur disponible pour ce choix.' }} Choisis un autre codec ou une autre résolution.
        </p>
        <ul v-if="warnings.length" class="ve-warnings">
          <li v-for="(warning, index) in warnings" :key="index">{{ warning.message }}</li>
        </ul>

        <p v-if="warning" class="ve-warnings" role="status">{{ warning }}</p>
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
.ve-capture{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;font-size:12px;margin:5px 0}.ve-capture input{background:#ffffff0b;color:inherit;border:1px solid #ffffff25;border-radius:5px;padding:5px;min-width:0}summary{font-size:11px;color:var(--ink-2);cursor:pointer;padding:5px 0}
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
