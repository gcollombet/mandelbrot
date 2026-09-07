<script setup lang="ts">
import RenderProgress from './RenderProgress.vue'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { parkExpmapSession } from '../expmap/session'
import type { Engine } from '../Engine'
import { DenseField, DenseSection, DenseSelect } from './dense'
import { expmapLibraryEntries, openExpmapLibraryEntry, refreshExpmapLibrary, selectedExpmapDocumentId } from '../expmap/library'
import { expmapBusy, expmapLastView, expmapOpenDocument } from '../expmap/runtime'
import { changeExpmapDuration, changeExpmapSpeed, changeExpmapWindow, exportExpmapVideo, loadExpmapVideoWindow, saveExpmapVideoWindow, type ExpmapVideoWindow } from '../expmap/video'
import { EXPMAP_SAMPLE_LIMITS } from '../expmap/renderer'
import { ExpmapGpuRenderer } from '../expmap/gpuRenderer'
import type { ExpmapManifest } from '../expmap/manifest'
import { interpolateScale, scaleDoublements } from '../expmap/decimal'
import { MP4_CODECS, type Mp4Codec } from '../videoEncoderSink'
const props = defineProps<{ engine?: Engine | null; controller?: MandelbrotExposed | null }>()
const manifest = ref<ExpmapManifest | null>(null), windowSpec = ref<ExpmapVideoWindow | null>(null)
const framesDone = ref(0), framesTotal = ref(0)
const maxSamples = ref(16)
const error = ref(''), progress = ref(''), ownRunning = ref(false), width = ref(1280), height = ref(720), fps = ref(30), codec = ref<Mp4Codec>('avc')
let abort: AbortController | undefined, generation = 0
onMounted(() => refreshExpmapLibrary().catch(e => { error.value = String(e) }))
onUnmounted(() => { generation++; abort?.abort() })
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
    width.value = entry.width; height.value = entry.height
  } catch (e) { if (current === generation) error.value = String(e) }
}, { immediate: true })
function update(kind: 'speed' | 'duration', value: number) {
  if (!windowSpec.value) return
  try { windowSpec.value = kind === 'speed' ? changeExpmapSpeed(windowSpec.value, value) : changeExpmapDuration(windowSpec.value, value); persist() } catch (e) { error.value = String(e) }
}
function trim(side: 'fromScale' | 'toScale', value: string) {
  if (!windowSpec.value) return
  try { windowSpec.value = changeExpmapWindow(windowSpec.value, side === 'fromScale' ? value : windowSpec.value.fromScale, side === 'toScale' ? value : windowSpec.value.toScale); persist() } catch (e) { error.value = String(e) }
}
function relative(scale: string) {
  if (!manifest.value) return 0
  const d = manifest.value.projection.domain
  const depth = scaleDoublements(d.startScale, d.endScale)
  return depth ? scaleDoublements(d.startScale, scale) / depth : 0
}
function slide(side: 'fromScale' | 'toScale', event: Event) {
  if (!manifest.value) return
  const d = manifest.value.projection.domain
  trim(side, interpolateScale(d.startScale, d.endScale, Number((event.target as HTMLInputElement).value)))
}
function takeView(side: 'fromScale' | 'toScale') {
  if (expmapLastView.value?.documentId === manifest.value?.documentId) trim(side, expmapLastView.value!.scale)
}
function persist() { if (manifest.value && windowSpec.value) saveExpmapVideoWindow(manifest.value.documentId, windowSpec.value) }
async function start() {
  if (!windowSpec.value || !manifest.value || expmapBusy.value) return
  const entry = expmapLibraryEntries.value.find(e => e.id === manifest.value!.documentId)
  if (!entry) return
  error.value = ''; framesDone.value = 0; framesTotal.value = 0; progress.value = 'Choix du fichier de destination'; ownRunning.value = true; expmapBusy.value = true; abort = new AbortController()
  let gpu: ExpmapGpuRenderer | undefined
  let writable: FileSystemWritableFileStream | undefined, release: (() => void) | undefined
  try {
    const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
    if (!picker) throw new Error('L’export ExpMap requiert une destination de fichier en streaming.')
    const handle = await picker({ suggestedName: `${entry.name}.mp4`, types: [{ description: 'Vidéo MP4', accept: { 'video/mp4': ['.mp4'] } }] })
    writable = await handle.createWritable()
    progress.value = 'Ouverture du document'
    const opened = await openExpmapLibraryEntry(entry)
    abort.signal.throwIfAborted()
    expmapOpenDocument.value = null
    await nextTick()
    release = parkExpmapSession(props.engine, props.controller)
    gpu = await ExpmapGpuRenderer.create(opened.store, opened.manifest, props.engine?.device)
    persist()
    const result = await exportExpmapVideo(opened, { window: { ...windowSpec.value }, width: width.value, height: height.value, fps: fps.value, codec: codec.value, maxSamples: maxSamples.value,
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
  <DenseSection title="Vidéo depuis un document ExpMap">
    <fieldset :disabled="expmapBusy">
      <DenseSelect label="Document" :model-value="selectedExpmapDocumentId ?? ''" :options="expmapLibraryEntries.map(e => ({ value: e.id, label: `${e.name} · ${e.state}` }))" @update:model-value="selectedExpmapDocumentId = String($event)"/>
      <template v-if="windowSpec && manifest">
        <p>Apparence cuite · domaine {{ manifest.projection.domain.startScale }} → {{ manifest.projection.domain.endScale }}</p>
        <label>Début <input :value="windowSpec.fromScale" @change="trim('fromScale', ($event.target as HTMLInputElement).value)"></label>
        <label>Fin <input :value="windowSpec.toScale" @change="trim('toScale', ($event.target as HTMLInputElement).value)"></label>
        <label>Plage début <input aria-label="Plage début ExpMap" type="range" min="0" max="1" step="0.001" :value="relative(windowSpec.fromScale)" @input="slide('fromScale', $event)"></label>
        <label>Plage fin <input aria-label="Plage fin ExpMap" type="range" min="0" max="1" step="0.001" :value="relative(windowSpec.toScale)" @input="slide('toScale', $event)"></label>
        <button :disabled="expmapLastView?.documentId !== manifest.documentId" @click="takeView('fromScale')">Début depuis le lecteur</button><button :disabled="expmapLastView?.documentId !== manifest.documentId" @click="takeView('toScale')">Fin depuis le lecteur</button>
        <div :inert="windowSpec.speed === 0"><DenseField :model-value="windowSpec.speed" label="Doublements/s" :min="0" :max="100" :step="0.1" @update:model-value="update('speed', $event)"/></div>
        <DenseField :model-value="windowSpec.durationSeconds" label="Durée (s)" :min="0.01" :max="86400" :step="0.1" @update:model-value="update('duration', $event)"/>
        <DenseField v-model="windowSpec.fromAngle" label="Rotation début (rad)" :min="-100" :max="100" :step="0.01" @update:model-value="persist"/><DenseField v-model="windowSpec.toAngle" label="Rotation fin (rad)" :min="-100" :max="100" :step="0.01" @update:model-value="persist"/>
        <DenseField v-model="width" label="Largeur" :min="2" :max="manifest.projection.width" :step="2"/><DenseField v-model="height" label="Hauteur" :min="2" :max="manifest.projection.height" :step="2"/><DenseField v-model="fps" label="Images/s" :min="1" :max="60"/>
        <label>Prélèvements par pixel (maximum)
          <select v-model.number="maxSamples"><option v-for="limit in EXPMAP_SAMPLE_LIMITS" :key="limit" :value="limit">{{ limit }}{{ limit === 1 ? ' — bilinéaire' : '' }}</option></select>
        </label>
        <p>Adaptatif selon le détail disponible dans l’ExpMap. Grille fixe entre les images, moyenne en lumière linéaire. Aucun recalcul de la fractale.</p>
        <DenseSelect v-model="codec" label="Codec MP4" :options="[...MP4_CODECS]"/>
        <button @click="start">Exporter vers un fichier MP4</button>
      </template>
    </fieldset>
    <RenderProgress v-if="progress" :label="progress" :done="framesDone" :total="framesTotal" unit="images encodées" :active="ownRunning"/>
    <button v-if="ownRunning" @click="abort?.abort(); progress = 'Annulation en cours…'">Annuler l’export</button><p v-if="error" role="alert">{{ error }}</p>
  </DenseSection>
</template>
<style scoped>
fieldset{border:0;padding:0;min-width:0}label{display:flex;gap:5px;margin:5px 0}select{background:#172033;color:inherit;border:1px solid #ffffff30;padding:4px}input{width:100%;min-width:0;background:#ffffff0b;color:inherit;border:1px solid #ffffff20}p{font-size:11px;overflow-wrap:anywhere}button{padding:5px;border:1px solid #ffffff30;margin:4px}
</style>
