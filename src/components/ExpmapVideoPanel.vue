<script setup lang="ts">
import ExpmapEffectsControls from './ExpmapEffectsControls.vue'
import { documentEffects } from '../expmap/effects'
import VideoMotionControls from './VideoMotionControls.vue'
import VideoRotationControls from './VideoRotationControls.vue'
import RenderProgress from './RenderProgress.vue'
import ExpmapZoomControl from './ExpmapZoomControl.vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { parkExpmapSession } from '../expmap/session'
import type { Engine } from '../Engine'
import { DenseField, DenseSection, DenseSelect } from './dense'
import { expmapLibraryEntries, expmapLibraryFilename, openExpmapLibraryEntry, refreshExpmapLibrary, selectedExpmapDocumentId } from '../expmap/library'
import { expmapBusy, expmapLastView, expmapOpenDocument, expmapPreviewView } from '../expmap/runtime'
import { changeExpmapDuration, changeExpmapSpeed, changeExpmapWindow, exportExpmapVideo, loadExpmapVideoWindow, saveExpmapVideoWindow, validateExpmapVideoWindow, type ExpmapVideoWindow } from '../expmap/video'
import { EXPMAP_SAMPLE_LIMITS, validateExpmapView } from '../expmap/renderer'
import { ExpmapGpuRenderer } from '../expmap/gpuRenderer'
import type { ExpmapManifest } from '../expmap/manifest'
import { interpolateScale, scaleDoublements } from '../expmap/decimal'
import { MP4_CODECS, probeMp4Codecs, type Mp4Codec } from '../videoEncoderSink'
import { compactNumber, magnitudeSummary, videoFilename } from '../expmap/controls'
import { motionSettings, type ExpmapMotion } from '../expmap/motion'
import { loadExpmapOutput, preferredExpmapCodec, saveExpmapOutput } from '../expmap/outputPreferences'
const props = defineProps<{ engine?: Engine | null; controller?: MandelbrotExposed | null }>()
const manifest = ref<ExpmapManifest | null>(null), windowSpec = ref<ExpmapVideoWindow | null>(null)
const framesDone = ref(0), framesTotal = ref(0)
const savedOutput = loadExpmapOutput()
const maxSamples = ref(savedOutput.maxSamples), width = ref(savedOutput.width), height = ref(savedOutput.height), fps = ref(savedOutput.fps), codec = ref(savedOutput.codec)
const error = ref(''), progress = ref(''), ownRunning = ref(false), probing = ref(true)
const support = ref<Partial<Record<Mp4Codec, boolean>>>({})
const effectiveCodec = computed(() => codec.value === 'auto' ? preferredExpmapCodec(support.value) : support.value[codec.value] ? codec.value : null)
const codecLabel = computed(() => probing.value ? 'Vérification de l’encodeur…' : effectiveCodec.value ? `${effectiveCodec.value === 'hevc' ? 'HEVC' : effectiveCodec.value === 'avc' ? 'H.264' : effectiveCodec.value.toUpperCase()}${codec.value === 'auto' && effectiveCodec.value === 'avc' ? ' · compatibilité' : ''}` : 'Encodage indisponible : choisir un autre format ou codec.')
const outputResolution = computed({ get: () => `${width.value}x${height.value}`, set: (value: string) => { [width.value, height.value] = value.split('x').map(Number) } })
const resolutions = computed(() => {
  const choices = [{ value: '1280x720', label: '720p' }, { value: '1920x1080', label: '1080p' }, { value: '2560x1440', label: '1440p' }, { value: '3840x2160', label: '4K UHD' }]
  if (!choices.some(c => c.value === outputResolution.value)) choices.push({ value: outputResolution.value, label: `${width.value} × ${height.value}` })
  return choices
})
const selectedEntry = computed(() => expmapLibraryEntries.value.find(e => e.id === selectedExpmapDocumentId.value))
const motion = computed(() => motionSettings(windowSpec.value ?? {}))
const validationError = computed(() => {
  if (!manifest.value || !windowSpec.value) return ''
  try {
    validateExpmapVideoWindow(manifest.value, windowSpec.value)
    validateExpmapView(manifest.value.projection, { scale: windowSpec.value.fromScale, angle: windowSpec.value.fromAngle, width: width.value, height: height.value, allowUpscale: true })
    return ''
  } catch (e) { return (e as Error).message }
})
let abort: AbortController | undefined, generation = 0
onMounted(() => refreshExpmapLibrary().catch(e => { error.value = String(e) }))
onUnmounted(() => { generation++; abort?.abort() })
watch([width, height, fps], async (_value, _previous, onCleanup) => {
  let current = true; onCleanup(() => { current = false })
  probing.value = true; support.value = {}
  try { const result = await probeMp4Codecs(width.value, height.value, fps.value); if (current) support.value = result }
  finally { if (current) probing.value = false }
}, { immediate: true })
watch([width, height, fps, codec, maxSamples], () => saveExpmapOutput({ width: width.value, height: height.value, fps: fps.value, codec: codec.value, maxSamples: maxSamples.value }))
watch(selectedExpmapDocumentId, async id => {
  const current = ++generation; manifest.value = null; windowSpec.value = null
  const entry = expmapLibraryEntries.value.find(e => e.id === id)
  if (!entry) return
  try {
    const opened = await openExpmapLibraryEntry(entry)
    if (current !== generation) return
    if (opened.manifest.state !== 'complete') throw new Error('Document incomplet.')
    manifest.value = opened.manifest
    const saved = loadExpmapVideoWindow(opened.manifest); windowSpec.value = saved.window
    error.value = saved.reset ? 'Préférences hors domaine réinitialisées.' : ''
  } catch (e) { if (current === generation) error.value = String(e) }
}, { immediate: true })
function persist() { if (manifest.value && windowSpec.value) saveExpmapVideoWindow(manifest.value.documentId, windowSpec.value) }
function update(kind: 'speed' | 'duration', value: number) {
  if (!windowSpec.value) return
  try { windowSpec.value = kind === 'speed' ? changeExpmapSpeed(windowSpec.value, value) : changeExpmapDuration(windowSpec.value, value); error.value = ''; persist() } catch (e) { error.value = String(e) }
}
function trim(side: 'fromScale' | 'toScale', value: string) {
  if (!windowSpec.value || !manifest.value) return
  try {
    const next = changeExpmapWindow(windowSpec.value, side === 'fromScale' ? value : windowSpec.value.fromScale, side === 'toScale' ? value : windowSpec.value.toScale)
    validateExpmapVideoWindow(manifest.value, next); windowSpec.value = next; error.value = ''; persist()
  } catch (e) { error.value = String(e) }
}
function relative(scale: string) {
  if (!manifest.value) return 0
  const d = manifest.value.projection.domain, depth = scaleDoublements(d.startScale, d.endScale)
  return depth ? Math.max(0, Math.min(1, scaleDoublements(d.startScale, scale) / depth)) : 0
}
function slide(side: 'fromScale' | 'toScale', event: Event) {
  if (!manifest.value) return
  const d = manifest.value.projection.domain
  trim(side, interpolateScale(d.startScale, d.endScale, Number((event.target as HTMLInputElement).value)))
}
const selectionStyle = computed(() => {
  const a = relative(windowSpec.value?.fromScale ?? '1'), b = relative(windowSpec.value?.toScale ?? '1')
  return { left: `${Math.min(a,b)*100}%`, width: `${Math.abs(a-b)*100}%` }
})
function takeView(side: 'fromScale' | 'toScale') {
  if (expmapLastView.value?.documentId === manifest.value?.documentId) trim(side, expmapLastView.value!.scale)
}
async function preview(side: 'fromScale' | 'toScale') {
  if (!selectedEntry.value || !windowSpec.value || expmapBusy.value) return
  try {
    const opened = await openExpmapLibraryEntry(selectedEntry.value)
    expmapPreviewView.value = { documentId: opened.manifest.documentId, scale: windowSpec.value[side], angle: side === 'fromScale' ? windowSpec.value.fromAngle : windowSpec.value.toAngle }
    expmapOpenDocument.value = opened
  } catch (e) { error.value = String(e) }
}
function reverse() {
  if (!windowSpec.value) return
  const w = windowSpec.value
  windowSpec.value = { ...w, fromScale: w.toScale, toScale: w.fromScale, fromAngle: w.toAngle, toAngle: w.fromAngle }
  persist()
}
function setRotation(value: { fromAngle: number; toAngle: number }) {
  if (windowSpec.value) { windowSpec.value = { ...windowSpec.value, ...value }; persist() }
}
function setMotion(value: ExpmapMotion) {
  if (windowSpec.value) { windowSpec.value = { ...windowSpec.value, ...value }; persist() }
}
async function start() {
  if (!windowSpec.value || !manifest.value || expmapBusy.value || !effectiveCodec.value || validationError.value || probing.value) return
  const entry = expmapLibraryEntries.value.find(e => e.id === manifest.value!.documentId)
  if (!entry) return
  const selectedCodec = effectiveCodec.value
  error.value = ''; framesDone.value = 0; framesTotal.value = 0; progress.value = 'Choix du fichier de destination'; ownRunning.value = true; expmapBusy.value = true; abort = new AbortController()
  let gpu: ExpmapGpuRenderer | undefined
  let writable: FileSystemWritableFileStream | undefined, release: (() => void) | undefined
  try {
    const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
    if (!picker) throw new Error('L’export ExpMap requiert une destination de fichier en streaming.')
    const handle = await picker({ suggestedName: videoFilename(expmapLibraryFilename(entry)), types: [{ description: 'Vidéo MP4', accept: { 'video/mp4': ['.mp4'] } }] })
    writable = await handle.createWritable()
    progress.value = 'Ouverture du document'
    const opened = await openExpmapLibraryEntry(entry)
    abort.signal.throwIfAborted()
    expmapOpenDocument.value = null
    await nextTick()
    release = parkExpmapSession(props.engine, props.controller)
    gpu = await ExpmapGpuRenderer.create(opened.store, opened.manifest, props.engine?.device)
    persist()
    const result = await exportExpmapVideo(opened, { effects: { ...documentEffects(manifest.value.documentId) }, window: { ...windowSpec.value }, width: width.value, height: height.value, fps: fps.value, codec: selectedCodec, maxSamples: maxSamples.value,
      destination: { kind: 'stream', writable }, signal: abort.signal, gpuRenderer: gpu,
      onProgress: (frames, total) => { framesDone.value = frames; framesTotal.value = total; progress.value = frames === total ? 'Finalisation du fichier MP4' : 'Reconstruction et encodage des images' } })
    progress.value = result.cancelled ? 'Export interrompu' : 'Vidéo enregistrée'
  } catch (e) { error.value = String(e); progress.value = 'Export arrêté' }
  finally {
    gpu?.dispose()
    try { release?.() } catch (e) { error.value = String(e) }
    await writable?.close().catch(e => { error.value = String(e) })
    ownRunning.value = false; expmapBusy.value = false; abort = undefined
  }
}
</script>
<template>
  <div class="expmap-video-panel">
    <fieldset :disabled="expmapBusy">
      <DenseSection title="Source ExpMap">
        <DenseSelect label="Fichier" :model-value="selectedExpmapDocumentId ?? ''" :options="expmapLibraryEntries.map(e => ({ value: e.id, label: `${expmapLibraryFilename(e)} · ${magnitudeSummary(e.startScale, e.endScale)}${e.state !== 'ready' ? ' · indisponible' : ''}` }))" @update:model-value="selectedExpmapDocumentId = String($event)"/>
        <p v-if="manifest">{{ magnitudeSummary(manifest.projection.domain.startScale, manifest.projection.domain.endScale) }}</p>
      </DenseSection>
      <template v-if="windowSpec && manifest">
        <DenseSection title="Trajet">
          <ExpmapZoomControl :model-value="windowSpec.fromScale" label="Départ" :slider="false" capture-label="Depuis le lecteur" :capture-disabled="expmapLastView?.documentId !== manifest.documentId" @update:model-value="trim('fromScale', $event)" @capture="takeView('fromScale')"><button @click="preview('fromScale')">Voir</button></ExpmapZoomControl>
          <ExpmapZoomControl :model-value="windowSpec.toScale" label="Arrivée" :slider="false" capture-label="Depuis le lecteur" :capture-disabled="expmapLastView?.documentId !== manifest.documentId" @update:model-value="trim('toScale', $event)" @capture="takeView('toScale')"><button @click="preview('toScale')">Voir</button></ExpmapZoomControl>
          <div class="range-pair">
            <div class="range-track"><span :style="selectionStyle"/></div>
            <input aria-label="Départ dans le document" type="range" min="0" max="1" step="0.0001" :value="relative(windowSpec.fromScale)" @input="slide('fromScale', $event)">
            <input aria-label="Arrivée dans le document" type="range" min="0" max="1" step="0.0001" :value="relative(windowSpec.toScale)" @input="slide('toScale', $event)">
          </div>
          <div class="row spread"><small>Départ : poignée haute · arrivée : poignée basse</small><button @click="reverse">⇄ Inverser le trajet</button></div>
          <p>{{ magnitudeSummary(windowSpec.fromScale, windowSpec.toScale) }}</p>
          <DenseField :model-value="windowSpec.durationSeconds" label="Durée du trajet" unit="s" :f="compactNumber" :min="0.1" :max="86400" :step="0.1" @update:model-value="update('duration', $event)"/>
          <details><summary>Vitesse moyenne</summary><DenseField v-if="windowSpec.speed > 0" :model-value="windowSpec.speed" label="Doublements/s" :f="compactNumber" :min="0.1" :max="100" :step="0.1" @update:model-value="update('speed', $event)"/><p>La dernière valeur modifiée (durée ou vitesse) est conservée lorsque la plage change. Les courbes modulent la vitesse autour de cette moyenne.</p></details>
        </DenseSection>
        <VideoRotationControls :from-angle="windowSpec.fromAngle" :to-angle="windowSpec.toAngle" :current-angle="expmapLastView?.documentId === manifest.documentId ? expmapLastView.angle : undefined" capture-label="Angle du lecteur" @change="setRotation"/>
        <ExpmapEffectsControls :document-id="manifest.documentId"/>
        <VideoMotionControls :model-value="motion" :duration-seconds="windowSpec.durationSeconds" @update:model-value="setMotion"/>
        <DenseSection title="Fichier vidéo">
          <div class="row"><DenseSelect v-model="outputResolution" label="Résolution" :options="resolutions"/><DenseSelect :model-value="fps" label="Cadence" :options="[24,25,30,60].map(n => ({value: n, label: `${n} fps`}))" @update:model-value="fps = Number($event)"/></div>
          <p>{{ width }} × {{ height }}<template v-if="width > manifest.projection.width || height > manifest.projection.height"> · Agrandissement depuis {{ manifest.projection.width }} × {{ manifest.projection.height }}</template></p>
          <DenseSelect v-model="codec" label="Encodage" :options="[{value:'auto',label:'Auto · HEVC, sinon H.264'}, ...MP4_CODECS]"/>
          <p role="status">{{ codecLabel }}</p>
          <details><summary>Qualité et dimensions précises</summary>
            <DenseField v-model="width" label="Largeur" :min="2" :max="3840" :step="2"/><DenseField v-model="height" label="Hauteur" :min="2" :max="2160" :step="2"/>
            <label>Prélèvements par pixel <select v-model.number="maxSamples"><option v-for="limit in EXPMAP_SAMPLE_LIMITS" :key="limit" :value="limit">{{ limit }}{{ limit === 1 ? ' — bilinéaire' : '' }}</option></select></label>
            <p>Adaptatif selon le détail disponible, sans recalcul de la fractale.</p>
          </details>
          <p v-if="selectedEntry" class="filename">{{ videoFilename(expmapLibraryFilename(selectedEntry)) }}</p>
          <p v-if="validationError" role="alert" class="error">{{ validationError }}</p>
          <button v-if="width / height > manifest.projection.width / manifest.projection.height" @click="width = Math.max(2, Math.floor(height * manifest.projection.width / manifest.projection.height / 2) * 2)">Adapter la largeur au document</button>
          <button class="primary" :disabled="!effectiveCodec || probing || !!validationError" @click="start">Exporter la vidéo…</button>
        </DenseSection>
      </template>
    </fieldset>
    <RenderProgress v-if="progress" :label="progress" :done="framesDone" :total="framesTotal" unit="images encodées" :active="ownRunning"/>
    <button v-if="ownRunning" @click="abort?.abort(); progress = 'Annulation en cours…'">Annuler l’export</button><p v-if="error" role="alert" class="error">{{ error }}</p>
  </div>
</template>
<style scoped>
fieldset{border:0;padding:0;min-width:0}p,small{font-size:11px;color:#b4c0d4;overflow-wrap:anywhere}p{margin:6px 0}button,select{background:#ffffff0b;color:inherit;border:1px solid #ffffff25;border-radius:5px;padding:5px 7px;font-size:12px;cursor:pointer}button:disabled{opacity:.45;cursor:default}button[aria-pressed=true],button.primary{background:#34517b;border-color:#6c93c6}button:focus-visible,input:focus-visible{outline:2px solid #8ab5fa;outline-offset:2px}.row{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:5px 0}.spread{justify-content:space-between}.filename{font-weight:600;color:inherit}.error{color:#ffc1ae}summary{font-size:11px;color:#b4c0d4;cursor:pointer;padding:6px 0}.range-pair{position:relative;height:34px;margin:0 9px}.range-track{position:absolute;top:15px;left:0;right:0;height:4px;background:#ffffff20;border-radius:3px}.range-track span{position:absolute;height:4px;background:#8ab5fa}.range-pair input{position:absolute;inset:0;width:100%;margin:0;background:transparent;appearance:none;pointer-events:none}.range-pair input:focus{z-index:2}.range-pair input::-webkit-slider-thumb{appearance:none;width:15px;height:24px;border:2px solid #c5daff;border-radius:5px;background:#426da8;pointer-events:auto;cursor:ew-resize;transform:translateY(-5px)}.range-pair input+input::-webkit-slider-thumb{transform:translateY(5px);background:#233953}.range-pair input::-moz-range-thumb{width:14px;height:22px;background:#426da8;border:2px solid #c5daff;pointer-events:auto}.range-pair input::-moz-range-track{background:transparent}label{font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:8px}
</style>
