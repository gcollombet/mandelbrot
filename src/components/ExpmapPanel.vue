<script setup lang="ts">
import ShaderExpmapPanel from './ShaderExpmapPanel.vue'
import { readPalettePaths } from '../palettePathStore'
import type { PalettePath } from '../palettePath'
import { computed, nextTick, onMounted, onUnmounted, ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Engine, RenderOptions } from '../Engine'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { DenseField, DenseSection, DenseSelect } from './dense'
import ResolutionSelect from './ResolutionSelect.vue'
import { IMAGE_RESOLUTIONS } from './resolutionPresets'
import { useExpmapDraft } from '../expmap/draft'
import { expmapAppearanceProblems } from '../expmap/appearance'
import { planExpmap } from '../expmap/plan'
import ExpmapZoomControl from './ExpmapZoomControl.vue'
import { magnitudeSummary } from '../expmap/controls'
import RenderProgress from './RenderProgress.vue'
import { createExpmapDocument, type ExpmapProgress } from '../expmap/create'
import { octaveMemory, planExpmapOctaves } from '../expmap/octaves'
import { ExpmapGpuRenderer } from '../expmap/gpuRenderer'
import { parkExpmapSession } from '../expmap/session'
import { exportExpmapImage, validateImageExport, type ExpmapImageFormat } from '../expmap/imageExport'
import { ExpmapStore, withExpmapFileLock } from '../expmap/store'
import { attachExpmapDocument, entryFromManifest, expmapLibraryEntries, expmapLibraryFilename, openExpmapLibraryEntry, pickExpmapFile, refreshExpmapLibrary, removeExpmapLibraryEntry, saveExpmapLibraryEntry, selectedExpmapDocumentId, type ExpmapLibraryEntry } from '../expmap/library'
import { expmapBusy, expmapOpenDocument, expmapVideoSelected, shaderExpmapVideoSelected } from '../expmap/runtime'
const props = defineProps<{ current: Record<string, unknown>; engine: Engine | null; controller: MandelbrotExposed | null }>()
const { t } = useI18n()
const emit = defineEmits<{ 'use-video': [] }>()
const { name, start, end, cx, cy, width, height, density, forceRender, quality } = toRefs(useExpmapDraft(props.current))
const error = ref(''), progress = ref<ExpmapProgress | null>(null), ownRunning = ref(false), stopping = ref(false)
const progressUnitKey = ref('expmapPanel.units.blocksComputed')
const progressUnit = computed(() => t(progressUnitKey.value))
const imageEntry=ref<ExpmapLibraryEntry|null>(null), imageWidth=ref(2048), imageHeight=ref(4096), imageFormat=ref<ExpmapImageFormat>('image/png'), imageQuality=ref(0.9)
const imageFormats=computed(()=>[{value:'image/png',label:t('expmapPanel.imageExport.png')},{value:'image/jpeg',label:t('expmapPanel.imageExport.jpeg')},{value:'image/webp',label:t('expmapPanel.imageExport.webp')}])
let abort: AbortController | undefined
const pathChoice = ref((props.current.palettePath as PalettePath | undefined)?.enabled ? 'current' : '')
const savedPaths = ref<PalettePath[]>([])
onMounted(() => guard(async () => { savedPaths.value = readPalettePaths() }))
const appearance = computed(() => {
  const result = JSON.parse(JSON.stringify(props.current)) as RenderOptions
  const path = pathChoice.value === 'current' ? result.palettePath : savedPaths.value.find(p => p.id === pathChoice.value)
  result.palettePath = path ? { ...JSON.parse(JSON.stringify(path)), enabled: true, mode: 'radial' } : undefined
  return JSON.parse(JSON.stringify(result)) as RenderOptions
})
const problems = computed(() => expmapAppearanceProblems(appearance.value))
const hasBlockingProblems = computed(() => problems.value.some(p => !forceRender.value || p.kind === 'invalid'))
const plan = computed(() => { try { return planExpmap({ domain: { cx: cx.value, cy: cy.value, startScale: start.value, endScale: end.value }, width: width.value, height: height.value, density: density.value }) } catch { return null } })
const estimate = computed(() => plan.value ? octaveMemory(planExpmapOctaves(plan.value)) : null)
async function guard(action: () => Promise<unknown>) { error.value = ''; try { await action() } catch (e) { error.value = String(e) } }
onMounted(() => guard(refreshExpmapLibrary))
onUnmounted(() => abort?.abort())
function captureCenter() { cx.value = String(props.current.cx); cy.value = String(props.current.cy) }
async function bake(entry?: ExpmapLibraryEntry) {
  if (expmapBusy.value || !props.engine || !props.controller?.setExportTime) return
  await guard(async () => {
    expmapBusy.value = true; ownRunning.value = true; stopping.value = false; abort = new AbortController()
    progressUnitKey.value = 'expmapPanel.units.blocksComputed'
    progress.value = { phase: t('expmapPanel.phases.pickFile'), done: 0, total: 0, saved: 0 }
    try {
      const handle = entry?.handle ?? await pickExpmapFile('readwrite',name.value)
      expmapOpenDocument.value = null; await nextTick()
      const id=entry?.id ?? crypto.randomUUID()
      await withExpmapFileLock(id,async()=>{
        const store = await ExpmapStore.working(handle,id,!!entry,{signal:abort.signal,onProgress:(done,total)=>{progressUnitKey.value='expmapPanel.units.doublingsCopied';progress.value={phase:t('expmapPanel.phases.prepareResume'),done,total,saved:done}}})
        progressUnitKey.value='expmapPanel.units.blocksComputed'
        const previous = entry ? await store.open(entry.id) : null
        const selectedPlan = previous?.projection ?? plan.value
        if (!selectedPlan) throw new Error(t('expmapPanel.errors.invalidDomain'))
        const controller = props.controller!, engine = props.engine!
        const camera = controller.getParams()
        if (!camera) throw new Error(t('expmapPanel.errors.cameraUnavailable'))
        let result,checkpointPublished=!!previous
        try {
          result=await createExpmapDocument({ engine, controller: { getNavigator: () => controller.getNavigator(), drawOnce: () => controller.drawOnce(), setExportTime: t => controller.setExportTime!(t) } }, {
            store, name:entry?.name??name.value,quality:quality.value,forceRender: forceRender.value, documentId:id, plan: selectedPlan,
            appearance: previous ? JSON.parse(previous.appearance.json) : appearance.value,
            restoreCamera: { cx: camera[0], cy: camera[1], scale: camera[2], angle: Number(camera[3]) }, resume: !!previous, signal: abort.signal,
            onProgress: value => { progress.value = value },
            onCheckpoint: async manifest => { checkpointPublished=true;await saveExpmapLibraryEntry(entryFromManifest(manifest, handle, entry?.name ?? name.value)) },
          })
          abort.signal.throwIfAborted()
          // Render the thumbnail from baked colors after the producer has released its buffers.
          let gpu:ExpmapGpuRenderer|undefined,release:(()=>void)|undefined
          try {
            progress.value!.phase=t('expmapPanel.phases.thumbnail')
            release=parkExpmapSession(engine,controller)
            gpu=await ExpmapGpuRenderer.create(store,result,engine.device)
            const h=Math.min(90,result.projection.height), w=Math.max(1,Math.min(160,Math.floor(h*result.projection.width/result.projection.height)))
            const preview=await gpu.render({width:w,height:Math.ceil(w*result.projection.height/result.projection.width),scale:result.projection.domain.startScale,angle:0})
            const blob=await preview.convertToBlob({type:'image/webp',quality:0.75})
            const bytes=new Uint8Array(await blob.arrayBuffer())
            result={...result,generation:result.generation+1,thumbnail:`data:${blob.type};base64,${btoa(String.fromCharCode(...bytes))}`}
            await store.publish(result)
          } catch(e) { error.value=t('expmapPanel.errors.thumbnailKept',{error:String(e)}) }
          finally {gpu?.dispose();release?.()}
        } finally {
          // Finalize even on a requested stop. A failed final copy keeps OPFS checkpoints.
          if(checkpointPublished) {
          const checkpoint=await store.open(id)
          progressUnitKey.value='expmapPanel.units.doublingsCopied'
          await store.saveContainer(checkpoint,(done,total)=>{progress.value={...progress.value,phase:t('expmapPanel.phases.finalize'),done,total,saved:done}})
          await saveExpmapLibraryEntry(entryFromManifest(checkpoint,handle,entry?.name??name.value))
          await store.discardWorking(id)
          }
        }
        progress.value!.phase=t('expmapPanel.phases.saved')
      })
      await refreshExpmapLibrary()
    } catch (e) {
      if (progress.value) progress.value.phase = abort?.signal.aborted ? t('expmapPanel.phases.interruptedResumable') : t('expmapPanel.phases.stopped')
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e
    } finally { expmapBusy.value = false; ownRunning.value = false; abort = undefined }
  })
}
function stop() { stopping.value = true; abort?.abort() }
const stateLabels = computed(() => ({ preparing: t('expmapPanel.states.preparing'), ready: t('expmapPanel.states.ready'), interrupted: t('expmapPanel.states.interrupted'), missing: t('expmapPanel.states.missing'), incompatible: t('expmapPanel.states.incompatible') }))
function selectEntry(entry: ExpmapLibraryEntry) {
  if (!expmapBusy.value && entry.state === 'ready') selectedExpmapDocumentId.value = entry.id
}
async function attach(entry?: ExpmapLibraryEntry) {
  await guard(async () => attachExpmapDocument(await pickExpmapFile('read'), entry?.id))
}
async function open(entry: ExpmapLibraryEntry, video = false) {
  await guard(async () => {
    const doc = await openExpmapLibraryEntry(entry)
    if (doc.manifest.state !== 'complete') throw new Error(t('expmapPanel.errors.resumeToComplete'))
    selectedExpmapDocumentId.value = entry.id
    if (video) { shaderExpmapVideoSelected.value = false; expmapVideoSelected.value = true; emit('use-video') }
    else expmapOpenDocument.value = doc
  })
}
function chooseImage(entry:ExpmapLibraryEntry) {
  imageEntry.value=entry;imageWidth.value=2048;imageHeight.value=4096
}
async function saveAgain(entry:ExpmapLibraryEntry) {
  await guard(async()=>{
    if(expmapBusy.value)return
    const handle=await pickExpmapFile('readwrite',entry.name)
    expmapBusy.value=true;ownRunning.value=true;stopping.value=false;abort=new AbortController();progressUnitKey.value='expmapPanel.units.doublingsCopied'
    try {
      await withExpmapFileLock(entry.id,async()=>{
      const {store,manifest:original}=await openExpmapLibraryEntry(entry)
      const manifest={...original,name:entry.name,generation:original.generation+1}
      await store.saveContainer(manifest,(done,total)=>{progress.value={phase:t('expmapPanel.phases.saving'),done,total,saved:done}},abort.signal,handle)
      await saveExpmapLibraryEntry(entryFromManifest(manifest,handle,entry.name))
      if(store.directory)await store.discardWorking(entry.id)
      progress.value!.phase=t('expmapPanel.phases.fileSaved')
      })
    } finally {expmapBusy.value=false;ownRunning.value=false;abort=undefined}
  })
}
async function saveImage() {
  const entry=imageEntry.value;if(!entry||expmapBusy.value)return
  await guard(async()=>{
    validateImageExport(imageWidth.value,imageHeight.value,imageFormat.value,imageQuality.value)
    const extension=imageFormat.value.split('/')[1]
    const picker=(window as Window & {showSaveFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle>}).showSaveFilePicker
    if(!picker)throw new Error(t('expmapPanel.errors.savingUnavailable'))
    const handle=await picker({suggestedName:`${entry.name}.${extension}`,types:[{description:t('expmapPanel.imageTypeDescription'),accept:{[imageFormat.value]:[`.${extension}`]}}]})
    expmapBusy.value=true;ownRunning.value=true;stopping.value=false;abort=new AbortController();progressUnitKey.value='expmapPanel.units.doublingsAssembled'
    progress.value={phase:t('expmapPanel.phases.assembling'),done:0,total:0,saved:0}
    try {
      const {store,manifest}=await openExpmapLibraryEntry(entry)
      const blob=await exportExpmapImage(store,manifest,{width:imageWidth.value,height:imageHeight.value,format:imageFormat.value,quality:imageQuality.value,signal:abort.signal,
        onProgress:(done,total)=>{progress.value={phase:done===total?t('expmapPanel.phases.encoding'):t('expmapPanel.phases.assembling'),done,total,saved:0}}})
      const writable=await handle.createWritable()
      try {await writable.write(blob);await writable.close()}catch(e){await writable.abort().catch(()=>{});throw e}
      progress.value!.phase=t('expmapPanel.phases.imageSaved')
    } finally {expmapBusy.value=false;ownRunning.value=false;abort=undefined}
  })
}
</script>
<template>
  <div class="expmap-panel">
    <p class="intro">{{ t('expmapPanel.intro') }}</p>
    <RenderProgress v-if="progress" :label="stopping && ownRunning ? t('expmapPanel.interrupting') : progress.phase" :done="progress.done" :total="progress.total" :unit="progressUnit" :active="ownRunning"/>
    <p v-if="ownRunning && progress" class="hint">{{ t('expmapPanel.savedHint', { count: progress.saved }) }}</p>
    <p v-if="progress?.timings" class="hint">{{ t('expmapPanel.timings', { compute: (progress.timings.compute/1000).toFixed(1), encode: (progress.timings.encode/1000).toFixed(1), write: (progress.timings.write/1000).toFixed(1), wait: (progress.timings.wait/1000).toFixed(1) }) }}</p>
    <button v-if="ownRunning" class="stop" :disabled="stopping" @click="stop">{{ stopping ? t('expmapPanel.interrupting') : t('expmapPanel.interruptKeep') }}</button>
    <DenseSection :title="t('expmapPanel.common.title')">
      <fieldset :disabled="expmapBusy">
        <label>{{ t('expmapPanel.common.name') }} <input v-model="name" :aria-label="t('expmapPanel.common.nameAria')"></label>
        <div class="library-toolbar"><span>{{ t('expmapPanel.common.fixedCenter') }}</span><button @click="captureCenter">{{ t('expmapPanel.common.useCurrentCenter') }}</button></div>
        <details><summary>{{ t('expmapPanel.common.preciseCoords') }}</summary><label>{{ t('expmapPanel.common.centerX') }} <input v-model="cx" :aria-label="t('expmapPanel.common.centerXAria')"></label><label>{{ t('expmapPanel.common.centerY') }} <input v-model="cy" :aria-label="t('expmapPanel.common.centerYAria')"></label></details>
        <ExpmapZoomControl v-model="start" :label="t('expmapPanel.common.start')" @capture="start = String(current.scale)"/>
        <ExpmapZoomControl v-model="end" :label="t('expmapPanel.common.end')" @capture="end = String(current.scale)"/>
        <p class="hint">{{ t('expmapPanel.common.rangeHint') }}</p>
        <p>{{ magnitudeSummary(start, end) }}</p>
        <ResolutionSelect :width="width" :height="height" :label="t('expmapPanel.common.resolution')" :min="16" :max="3840" :step="2" @update:width="width = $event" @update:height="height = $event"/>
        <DenseField v-model="density" :label="t('expmapPanel.common.density')" :min="1" :max="8" :step="0.5" :default="1"/>
        <p v-if="!plan" class="problem">{{ t('expmapPanel.common.planProblem') }}</p>
      </fieldset>
    </DenseSection>
    <DenseSection :title="t('expmapPanel.baked.title')">
      <fieldset :disabled="expmapBusy">
        <p class="hint">{{ t('expmapPanel.baked.hint') }}</p>
        <label>{{ t('expmapPanel.baked.palettePath') }}<select v-model="pathChoice"><option value="">{{ t('expmapPanel.baked.fixedPalette') }}</option><option v-if="current.palettePath" value="current">{{ t('expmapPanel.baked.currentPath') }}</option><option v-for="p in savedPaths" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
        <p v-if="pathChoice" class="hint">{{ t('expmapPanel.baked.pathHint') }}</p>
        <DenseField v-model="quality" :label="t('expmapPanel.baked.webpQuality')" :min="0" :max="1" :step="0.01" :default="0.9"/><p class="hint">{{ t('expmapPanel.baked.webpHint') }}</p>
        <details v-if="estimate"><summary>{{ t('expmapPanel.baked.gpuMemory', { gib: (estimate.gpuBytes / 1073741824).toFixed(2) }) }}</summary><p>{{ t('expmapPanel.baked.memoryDetail', { decode: (estimate.decodeBytes / 1048576).toFixed(1), buffers: (2*estimate.decodeBytes / 1048576).toFixed(1), raw: (estimate.rawDiskBytes / 1073741824).toFixed(2) }) }}</p></details>
        <p :class="forceRender && problem.kind === 'unsupported' ? 'hint' : 'problem'" v-for="problem in problems" :key="`${problem.field}:${problem.stopIndex}`">{{ problem.field }} : {{ problem.message }}</p>
        <label><input v-model="forceRender" type="checkbox"> {{ t('expmapPanel.baked.forceRender') }}</label>
        <p v-if="forceRender" class="hint">{{ t('expmapPanel.baked.forceHint') }}</p>
        <button class="primary" :disabled="!engine || !controller || !plan || hasBlockingProblems || !name.trim()" @click="bake()">{{ t('expmapPanel.baked.create') }}</button>
      </fieldset>
      <p class="hint">{{ t('expmapPanel.baked.parallelHint') }}</p>
    </DenseSection>
    <ShaderExpmapPanel :plan="plan" :name="name" :appearance="appearance" :engine="engine" :controller="controller" @use-video="emit('use-video')"/>
    <DenseSection :title="t('expmapPanel.library.title')">
      <div class="library-toolbar">
        <button class="library-import" :disabled="expmapBusy" @click="attach()">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3.5 7.5h6l2-2h9v13h-17zM12 9v6m-3-3h6"/></svg>
          {{ t('expmapPanel.library.openFile') }}
        </button>
      </div>
      <p v-if="!expmapLibraryEntries.length" class="empty">{{ t('expmapPanel.library.empty') }}</p>
      <div v-else class="expmap-library" role="list" :aria-label="t('expmapPanel.library.listAria')">
        <article
          v-for="entry in expmapLibraryEntries"
          :key="entry.id"
          class="expmap-tile"
          :class="{ selected: selectedExpmapDocumentId === entry.id }"
          :data-state="entry.state"
          role="listitem"
        >
          <button
            class="tile-overview"
            :disabled="expmapBusy || entry.state !== 'ready'"
            :aria-label="t('expmapPanel.library.select', { name: expmapLibraryFilename(entry) })"
            @click="selectEntry(entry)"
          >
            <span class="thumbnail-shell">
              <img v-if="entry.thumbnail" :src="entry.thumbnail" :alt="t('expmapPanel.library.preview', { name: expmapLibraryFilename(entry) })">
              <span v-else class="thumbnail-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 17c3-7 5-9 8-6s4 1 8-4M4 20h16V4H4z"/></svg></span>
            </span>
            <span class="tile-copy">
              <strong class="filename" :title="expmapLibraryFilename(entry)">{{ expmapLibraryFilename(entry) }}</strong>
              <span class="tile-state-row">
                <span class="state-label" :class="entry.state">{{ stateLabels[entry.state] }}</span>
                <span v-if="entry.forceRender" class="experimental">{{ t('expmapPanel.library.experimental') }}</span>
              </span>
              <small>{{ magnitudeSummary(entry.startScale, entry.endScale) }}</small>
              <small>{{ entry.width }} × {{ entry.height }} · {{ (entry.bytes / 1048576).toFixed(1) }} MiB</small>
            </span>
          </button>

          <div v-if="entry.state === 'ready'" class="tile-actions">
            <button class="primary tile-action" :disabled="expmapBusy" @click="open(entry)">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 6 8 6-8 6z"/></svg>{{ t('expmapPanel.library.explore') }}
            </button>
            <button class="tile-action" :disabled="expmapBusy" @click="open(entry, true)">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h12v12H4zM16 10l4-2v8l-4-2z"/></svg>{{ t('expmapPanel.library.video') }}
            </button>
            <button class="tile-action" :disabled="expmapBusy" @click="chooseImage(entry)">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v14H4zM6 16l4-4 3 3 2-2 3 3M15 9h.01"/></svg>{{ t('expmapPanel.library.image') }}
            </button>
            <details class="tile-more">
              <summary :aria-label="t('expmapPanel.library.moreActionsFor', { name: expmapLibraryFilename(entry) })" :title="t('expmapPanel.library.moreActions')">•••</summary>
              <div class="tile-menu">
                <button :disabled="expmapBusy" @click="saveAgain(entry)">{{ t('expmapPanel.library.saveAs') }}</button>
                <button :disabled="expmapBusy" @click="attach(entry)">{{ t('expmapPanel.library.reattach') }}</button>
                <button class="danger" :disabled="expmapBusy" :title="t('expmapPanel.library.removeTitle')" @click="guard(() => removeExpmapLibraryEntry(entry.id))">{{ t('expmapPanel.library.remove') }}</button>
              </div>
            </details>
          </div>

          <div v-else class="tile-actions state-actions">
            <button v-if="entry.state === 'interrupted' || entry.state === 'preparing'" class="tile-action resume" :disabled="expmapBusy" @click="bake(entry)">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2-5.3M20 4v5h-5"/></svg>{{ t('expmapPanel.library.resume') }}
            </button>
            <button v-else class="tile-action reconnect" :disabled="expmapBusy" @click="attach(entry)">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 12h6m-3-3v6M4 5h16v14H4z"/></svg>{{ t('expmapPanel.library.reattachShort') }}
            </button>
            <details class="tile-more">
              <summary :aria-label="t('expmapPanel.library.moreActionsFor', { name: expmapLibraryFilename(entry) })" :title="t('expmapPanel.library.moreActions')">•••</summary>
              <div class="tile-menu">
                <button :disabled="expmapBusy" @click="saveAgain(entry)">{{ t('expmapPanel.library.saveAs') }}</button>
                <button class="danger" :disabled="expmapBusy" :title="t('expmapPanel.library.removeTitle')" @click="guard(() => removeExpmapLibraryEntry(entry.id))">{{ t('expmapPanel.library.remove') }}</button>
              </div>
            </details>
          </div>
        </article>
      </div>
      <fieldset v-if="imageEntry" :disabled="expmapBusy" class="image-export">
        <strong>{{ t('expmapPanel.imageExport.title', { name: imageEntry.name }) }}</strong>
        <p class="hint">{{ t('expmapPanel.imageExport.hint') }}</p>
        <ResolutionSelect :width="imageWidth" :height="imageHeight" :presets="IMAGE_RESOLUTIONS" :min="1" :max="32767" :step="1" @update:width="imageWidth = $event" @update:height="imageHeight = $event"/>
        <DenseSelect v-model="imageFormat" :label="t('expmapPanel.imageExport.format')" :options="imageFormats"/>
        <DenseField v-if="imageFormat !== 'image/png'" v-model="imageQuality" :label="t('expmapPanel.imageExport.quality')" :min="0" :max="1" :step="0.01" :default="0.9"/>
        <button class="primary" @click="saveImage">{{ t('expmapPanel.imageExport.export') }}</button><button @click="imageEntry=null">{{ t('common.close') }}</button>
      </fieldset>
    </DenseSection>
    <p v-if="error" class="problem" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.expmap-panel{font-size:11px}fieldset{border:0;padding:0;min-width:0}label{display:flex;align-items:center;gap:6px;margin:4px 0}input{min-width:0;width:100%;background:#ffffff0b;color:inherit;border:1px solid #ffffff20;padding:3px}small{display:block;overflow-wrap:anywhere}button{margin:3px;padding:4px;border:1px solid #ffffff30;border-radius:3px}p{overflow-wrap:anywhere;margin:5px 0}
button{cursor:pointer;transition:background .15s,border-color .15s}button:not(:disabled):hover{background:#ffffff18;border-color:#ffffff70}button:disabled{opacity:.4;cursor:not-allowed}button.primary{background:#2563eb;border-color:#60a5fa;color:white;font-weight:600}button.primary:not(:disabled):hover{background:#1d4ed8}button.stop{border-color:#e4aa60;color:#f3c78f}button.secondary{opacity:.7}button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}.hint{opacity:.7;line-height:1.5}.intro{line-height:1.5;margin:0 0 8px}.problem{padding:7px;border-left:2px solid #e4aa60;background:#e4aa6012}.empty{padding:12px 8px;text-align:center;opacity:.7;border:1px dashed #ffffff30;border-radius:5px}summary{cursor:pointer;padding:6px 0;opacity:.8}article img{float:left;object-fit:cover;margin:0 8px 6px 0;border-radius:4px}article{display:flow-root}.entry-name{font-weight:600}label>input{flex:1}label>input[type=checkbox]{flex:0;width:auto}.image-export{padding:8px;border:1px solid #ffffff30;border-radius:5px}label{white-space:nowrap}
button svg,.thumbnail-placeholder svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}.primary svg{fill:currentColor;stroke:none}.library-toolbar{display:flex;justify-content:flex-end;margin-bottom:7px}.library-import{display:inline-flex;align-items:center;gap:6px;min-height:31px;margin:0;padding:5px 8px;color:var(--ink);background:var(--row);border-color:var(--line);font-weight:600}.expmap-library{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:8px}.expmap-tile{position:relative;display:grid;grid-template-rows:auto auto;min-width:0;overflow:visible;border:1px solid var(--line);border-radius:6px;background:var(--row);transition:border-color .15s,box-shadow .15s,transform .15s}.expmap-tile:hover{border-color:var(--accent);box-shadow:0 5px 18px #0004;transform:translateY(-1px)}.expmap-tile.selected{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--accent) 35%,transparent)}.tile-overview{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;width:100%;min-height:78px;margin:0;padding:0;overflow:hidden;color:var(--ink);text-align:left;background:transparent;border:0;border-radius:5px 5px 0 0}.tile-overview:disabled{opacity:1;cursor:default}.tile-overview:not(:disabled):hover{background:var(--row-on);border-color:transparent}.thumbnail-shell{display:grid;place-items:center;width:92px;height:78px;overflow:hidden;background:#090d16;border-right:1px solid var(--line)}.thumbnail-shell img{width:100%;height:100%;object-fit:cover}.thumbnail-placeholder{display:grid;place-items:center;width:100%;height:100%;color:#ffffff68;background:radial-gradient(circle at 50% 50%,#39465a,#111827 62%)}.thumbnail-placeholder svg{width:24px;height:24px}.tile-copy{display:block;min-width:0;padding:9px 8px 7px 0}.filename{display:block;overflow:hidden;color:var(--ink);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.tile-state-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:6px}.state-label{display:inline-flex;align-items:center;gap:4px;color:color-mix(in oklab,#16a34a 72%,var(--ink));font-size:9px;font-weight:700}.state-label::before{content:"";width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px #22c55e26}.state-label.preparing,.state-label.interrupted{color:color-mix(in oklab,#d97706 72%,var(--ink))}.state-label.preparing::before,.state-label.interrupted::before{background:#f59e0b;box-shadow:0 0 0 2px #f59e0b30}.state-label.missing,.state-label.incompatible{color:var(--red)}.state-label.missing::before,.state-label.incompatible::before{background:#ef4444;box-shadow:0 0 0 2px #ef444430}.experimental{padding:1px 4px;border:1px solid color-mix(in oklab,#d97706 55%,transparent);border-radius:3px;color:color-mix(in oklab,#d97706 72%,var(--ink));font-size:8px;font-weight:700}.tile-copy small{margin-top:7px;color:var(--ink-3);font-size:9px}.tile-actions{display:grid;grid-template-columns:minmax(0,1.25fr) repeat(2,minmax(0,1fr)) 31px;gap:4px;padding:5px;border-top:1px solid var(--line-soft);background:var(--panel-2);border-radius:0 0 5px 5px}.tile-actions.state-actions{grid-template-columns:minmax(0,1fr) 31px}.tile-action,.tile-more>summary{display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;min-height:29px;margin:0;padding:4px;border:1px solid var(--line);border-radius:4px;color:var(--ink-2);background:var(--row-on);font-size:9px;font-weight:650;white-space:nowrap}.tile-action.resume{border-color:#e4aa60;color:color-mix(in oklab,#d97706 72%,var(--ink));background:color-mix(in oklab,#f59e0b 12%,transparent)}.tile-action.reconnect{border-color:color-mix(in oklab,var(--red) 55%,transparent);color:var(--red);background:color-mix(in oklab,var(--red) 10%,transparent)}.tile-more{position:relative}.tile-more>summary{list-style:none;cursor:pointer;font-size:10px;letter-spacing:1px}.tile-more>summary::-webkit-details-marker{display:none}.tile-more[open]>summary{border-color:var(--accent);background:var(--accent);color:#fff}.tile-menu{position:absolute;right:0;bottom:35px;z-index:5;display:grid;width:max-content;min-width:145px;padding:4px;border:1px solid var(--line);border-radius:5px;color:var(--ink);background:var(--panel-2);box-shadow:0 8px 24px #0008}.tile-menu button{margin:0;padding:6px 7px;border:0;color:inherit;background:transparent;text-align:left;font-size:10px}.tile-menu button.danger{color:var(--red)}.tile-menu button:not(:disabled):hover{background:var(--row-on)}.image-export{margin-top:8px;padding:8px;border:1px solid var(--line);border-radius:5px}label>input{flex:1}label>input[type=checkbox]{flex:0;width:auto}label{white-space:nowrap}
@media (pointer:coarse){.tile-action,.tile-more>summary,.library-import{min-height:38px}}
</style>
