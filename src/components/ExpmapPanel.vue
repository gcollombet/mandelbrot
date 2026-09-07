<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRefs } from 'vue'
import type { Engine, RenderOptions } from '../Engine'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { DenseField, DenseSection, DenseSelect } from './dense'
import { useExpmapDraft } from '../expmap/draft'
import { expmapAppearanceProblems } from '../expmap/appearance'
import { planExpmap } from '../expmap/plan'
import RenderProgress from './RenderProgress.vue'
import { createExpmapDocument, type ExpmapProgress } from '../expmap/create'
import { octaveMemory, planExpmapOctaves } from '../expmap/octaves'
import { ExpmapGpuRenderer } from '../expmap/gpuRenderer'
import { parkExpmapSession } from '../expmap/session'
import { exportExpmapImage, validateImageExport, type ExpmapImageFormat } from '../expmap/imageExport'
import { ExpmapStore, withExpmapFileLock } from '../expmap/store'
import { attachExpmapDocument, entryFromManifest, expmapLibraryEntries, openExpmapLibraryEntry, pickExpmapFile, refreshExpmapLibrary, removeExpmapLibraryEntry, renameExpmapLibraryEntry, saveExpmapLibraryEntry, selectedExpmapDocumentId, type ExpmapLibraryEntry } from '../expmap/library'
import { expmapBusy, expmapOpenDocument, expmapVideoSelected } from '../expmap/runtime'
const props = defineProps<{ current: Record<string, unknown>; engine: Engine | null; controller: MandelbrotExposed | null }>()
const emit = defineEmits<{ 'use-video': [] }>()
const { name, start, end, cx, cy, width, height, density, forceRender, quality } = toRefs(useExpmapDraft(props.current))
const error = ref(''), progress = ref<ExpmapProgress | null>(null), ownRunning = ref(false), stopping = ref(false)
const progressUnit = ref('blocs calculés')
const imageEntry=ref<ExpmapLibraryEntry|null>(null), imageWidth=ref(2048), imageHeight=ref(4096), imageFormat=ref<ExpmapImageFormat>('image/png'), imageQuality=ref(0.9)
let abort: AbortController | undefined
const appearance = computed(() => JSON.parse(JSON.stringify(props.current)) as RenderOptions)
const problems = computed(() => expmapAppearanceProblems(appearance.value))
const hasBlockingProblems = computed(() => problems.value.some(p => !forceRender.value || p.kind === 'invalid'))
const plan = computed(() => { try { return planExpmap({ domain: { cx: cx.value, cy: cy.value, startScale: start.value, endScale: end.value }, width: width.value, height: height.value, density: density.value }) } catch { return null } })
const estimate = computed(() => plan.value ? octaveMemory(planExpmapOctaves(plan.value)) : null)
async function guard(action: () => Promise<unknown>) { error.value = ''; try { await action() } catch (e) { error.value = String(e) } }
onMounted(() => guard(refreshExpmapLibrary))
onUnmounted(() => abort?.abort())
function captureStart() { cx.value = String(props.current.cx); cy.value = String(props.current.cy); start.value = String(props.current.scale) }
async function bake(entry?: ExpmapLibraryEntry) {
  if (expmapBusy.value || !props.engine || !props.controller?.setExportTime) return
  await guard(async () => {
    expmapBusy.value = true; ownRunning.value = true; stopping.value = false; abort = new AbortController()
    progressUnit.value = 'blocs calculés'
    progress.value = { phase: 'Choix du fichier .expmap', done: 0, total: 0, saved: 0 }
    try {
      const handle = entry?.handle ?? await pickExpmapFile('readwrite',name.value)
      expmapOpenDocument.value = null; await nextTick()
      const id=entry?.id ?? crypto.randomUUID()
      await withExpmapFileLock(id,async()=>{
        const store = await ExpmapStore.working(handle,id,!!entry,{signal:abort.signal,onProgress:(done,total)=>{progressUnit.value='doublements copiés';progress.value={phase:'Préparation de la reprise',done,total,saved:done}}})
        progressUnit.value='blocs calculés'
        const previous = entry ? await store.open(entry.id) : null
        const selectedPlan = previous?.projection ?? plan.value
        if (!selectedPlan) throw new Error('Domaine ou résolution invalide.')
        const controller = props.controller!, engine = props.engine!
        const camera = controller.getParams()
        if (!camera) throw new Error('Caméra indisponible.')
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
            progress.value!.phase='Miniature du rendu cuit'
            release=parkExpmapSession(engine,controller)
            gpu=await ExpmapGpuRenderer.create(store,result,engine.device)
            const h=Math.min(90,result.projection.height), w=Math.max(1,Math.min(160,Math.floor(h*result.projection.width/result.projection.height)))
            const preview=await gpu.render({width:w,height:Math.ceil(w*result.projection.height/result.projection.width),scale:result.projection.domain.startScale,angle:0})
            const blob=await preview.convertToBlob({type:'image/webp',quality:0.75})
            const bytes=new Uint8Array(await blob.arrayBuffer())
            result={...result,generation:result.generation+1,thumbnail:`data:${blob.type};base64,${btoa(String.fromCharCode(...bytes))}`}
            await store.publish(result)
          } catch(e) { error.value=`Miniature de la carte conservée : ${String(e)}` }
          finally {gpu?.dispose();release?.()}
        } finally {
          // Finalize even on a requested stop. A failed final copy keeps OPFS checkpoints.
          if(checkpointPublished) {
          const checkpoint=await store.open(id)
          progressUnit.value='doublements copiés'
          await store.saveContainer(checkpoint,(done,total)=>{progress.value={...progress.value,phase:'Finalisation du fichier .expmap',done,total,saved:done}})
          await saveExpmapLibraryEntry(entryFromManifest(checkpoint,handle,entry?.name??name.value))
          await store.discardWorking(id)
          }
        }
        progress.value!.phase='Fichier .expmap enregistré'
      })
      await refreshExpmapLibrary()
    } catch (e) {
      if (progress.value) progress.value.phase = abort?.signal.aborted ? 'Préparation interrompue — reprise possible' : 'Préparation arrêtée'
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e
    } finally { expmapBusy.value = false; ownRunning.value = false; abort = undefined }
  })
}
function stop() { stopping.value = true; abort?.abort() }
const stateLabels = { preparing: 'Calcul en cours', ready: 'Prêt', interrupted: 'Interrompu', missing: 'Fichier inaccessible', incompatible: 'Incompatible' }
async function open(entry: ExpmapLibraryEntry, video = false) {
  await guard(async () => {
    const doc = await openExpmapLibraryEntry(entry)
    if (doc.manifest.state !== 'complete') throw new Error('Reprendre la préparation pour compléter ce document.')
    selectedExpmapDocumentId.value = entry.id
    if (video) { expmapVideoSelected.value = true; emit('use-video') }
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
    expmapBusy.value=true;ownRunning.value=true;stopping.value=false;abort=new AbortController();progressUnit.value='doublements copiés'
    try {
      await withExpmapFileLock(entry.id,async()=>{
      const {store,manifest:original}=await openExpmapLibraryEntry(entry)
      const manifest={...original,name:entry.name,generation:original.generation+1}
      await store.saveContainer(manifest,(done,total)=>{progress.value={phase:'Enregistrement .expmap',done,total,saved:done}},abort.signal,handle)
      await saveExpmapLibraryEntry(entryFromManifest(manifest,handle,entry.name))
      if(store.directory)await store.discardWorking(entry.id)
      progress.value!.phase='Fichier enregistré'
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
    if(!picker)throw new Error('Enregistrement de fichiers indisponible')
    const handle=await picker({suggestedName:`${entry.name}.${extension}`,types:[{description:'Image ExpMap',accept:{[imageFormat.value]:[`.${extension}`]}}]})
    expmapBusy.value=true;ownRunning.value=true;stopping.value=false;abort=new AbortController();progressUnit.value='doublements assemblés'
    progress.value={phase:'Assemblage de l’image',done:0,total:0,saved:0}
    try {
      const {store,manifest}=await openExpmapLibraryEntry(entry)
      const blob=await exportExpmapImage(store,manifest,{width:imageWidth.value,height:imageHeight.value,format:imageFormat.value,quality:imageQuality.value,signal:abort.signal,
        onProgress:(done,total)=>{progress.value={phase:done===total?'Encodage de l’image':'Assemblage de l’image',done,total,saved:0}}})
      const writable=await handle.createWritable()
      try {await writable.write(blob);await writable.close()}catch(e){await writable.abort().catch(()=>{});throw e}
      progress.value!.phase='Image enregistrée'
    } finally {expmapBusy.value=false;ownRunning.value=false;abort=undefined}
  })
}
</script>
<template>
  <div class="expmap-panel">
    <p class="intro">Prépare un rendu une seule fois, puis explore son zoom ou utilise-le dans une vidéo.</p>
    <RenderProgress v-if="progress" :label="stopping && ownRunning ? 'Interruption en cours…' : progress.phase" :done="progress.done" :total="progress.total" :unit="progressUnit" :active="ownRunning"/>
    <p v-if="ownRunning && progress" class="hint">{{ progress.saved }} éléments sauvegardés. La reprise conserve les doublements sauvegardés. Le fichier est finalisé à l’arrêt. Garde ce panneau ouvert pendant le calcul.</p>
    <p v-if="progress?.timings" class="hint">Calcul {{ (progress.timings.compute/1000).toFixed(1) }} s · WebP {{ (progress.timings.encode/1000).toFixed(1) }} s · Écriture {{ (progress.timings.write/1000).toFixed(1) }} s · Attente sauvegarde {{ (progress.timings.wait/1000).toFixed(1) }} s. Ces durées se chevauchent.</p>
    <button v-if="ownRunning" class="stop" :disabled="stopping" @click="stop">{{ stopping ? 'Interruption…' : 'Interrompre et conserver' }}</button>
    <DenseSection title="1 · Préparer le rendu">
      <fieldset :disabled="expmapBusy">
        <label>Nom <input v-model="name" aria-label="Nom ExpMap"></label>
        <details><summary>Centre fixe · coordonnées précises</summary><label>Centre X <input v-model="cx" aria-label="Centre X ExpMap"></label><label>Centre Y <input v-model="cy" aria-label="Centre Y ExpMap"></label></details>
        <p class="hint">Capture le départ, zoome vers l’arrivée puis capture la fin. Le centre reste fixe ; une échelle plus petite correspond à un zoom plus profond.</p><label>Échelle début <input v-model="start" aria-label="Échelle début ExpMap"></label><button @click="captureStart">Définir le départ depuis la vue</button>
        <label>Échelle fin <input v-model="end" aria-label="Échelle fin ExpMap"></label><button @click="end = String(current.scale)">Définir l’arrivée depuis la vue</button>
        <DenseField v-model="width" label="Largeur" :min="16" :max="3840" :step="2"/><DenseField v-model="height" label="Hauteur" :min="16" :max="2160" :step="2"/><DenseField v-model="quality" label="Qualité WebP" :min="0" :max="1" :step="0.01"/><p class="hint">WebP avec pertes · 0,90 conseillé. Les détails fins et les raccords peuvent varier avec la compression.</p><DenseField v-model="density" label="Détail (densité k)" :min="1" :max="8" :step="0.5"/>
        <details v-if="estimate"><summary>Mémoire GPU : {{ (estimate.gpuBytes / 1073741824).toFixed(2) }} GiB</summary><p>14 tuiles en mémoire GPU · {{ (estimate.decodeBytes / 1048576).toFixed(1) }} MiB pour une tuile décodée. Deux tampons de calcul : {{ (2*estimate.decodeBytes / 1048576).toFixed(1) }} MiB, hors surfaces du codec. Cache complet : {{ (estimate.rawDiskBytes / 1073741824).toFixed(2) }} GiB avant compression.</p></details>
        <p :class="forceRender && problem.kind === 'unsupported' ? 'hint' : 'problem'" v-for="problem in problems" :key="`${problem.field}:${problem.stopIndex}`">{{ problem.field }} : {{ problem.message }}</p>
        <p v-if="!plan" class="problem">Vérifie les coordonnées et les échelles : le départ doit être plus large que l’arrivée.</p>
        <p class="hint">La palette et les couleurs actuelles seront enregistrées dans le document.</p>
        <label><input v-model="forceRender" type="checkbox"> Forcer le rendu — expérimental</label>
        <p v-if="forceRender" class="hint">Cuit les effets tels quels. Des raccords ou différences après reprise peuvent apparaître.</p>
        <button class="primary" :disabled="!engine || !controller || !plan || hasBlockingProblems || !name.trim()" @click="bake()">Créer et enregistrer…</button>
      </fieldset>
      <p class="hint">Un fichier .expmap contient une image WebP par doublement. Le calcul et la sauvegarde avancent en parallèle. Le lecteur conserve 14 tuiles et anticipe la suivante. Le calcul inclut 12 doublements supplémentaires pour couvrir le centre, sans masque.</p>
    </DenseSection>
    <DenseSection title="2 · Ouvrir ou exporter">
      <button :disabled="expmapBusy" @click="guard(async () => attachExpmapDocument(await pickExpmapFile('read')))">Ouvrir un fichier .expmap…</button>
      <p v-if="!expmapLibraryEntries.length" class="empty">Aucun rendu enregistré. Crée ton premier ExpMap ci-dessus ou ouvre son fichier .expmap.</p>
      <article v-for="entry in expmapLibraryEntries" :key="entry.id">
        <img v-if="entry.thumbnail" :src="entry.thumbnail" alt="Aperçu du document" width="80" height="45">
        <input class="entry-name" title="Cliquer pour renommer" :value="entry.name" :aria-label="`Renommer ${entry.name}`" @change="guard(() => renameExpmapLibraryEntry(entry.id, ($event.target as HTMLInputElement).value))">
        <small>{{ stateLabels[entry.state] }}{{ entry.forceRender ? ' · Expérimental' : '' }} · WebP · {{ entry.width }}×{{ entry.height }} · k={{ entry.density }} · {{ (entry.bytes / 1048576).toFixed(1) }} MiB</small>
        <small>{{ entry.startScale }} → {{ entry.endScale }}</small>
        <div><button class="primary" :disabled="expmapBusy || entry.state !== 'ready'" @click="open(entry)">Ouvrir le lecteur</button><button :disabled="expmapBusy || entry.state !== 'ready'" @click="open(entry, true)">Utiliser en vidéo</button><button :disabled="expmapBusy || entry.state !== 'ready'" @click="chooseImage(entry)">Exporter une image…</button><button :disabled="expmapBusy" @click="saveAgain(entry)">Enregistrer sous…</button><button v-if="entry.state === 'interrupted' || entry.state === 'preparing'" :disabled="expmapBusy" @click="bake(entry)">Reprendre</button><button :disabled="expmapBusy" @click="guard(async () => attachExpmapDocument(await pickExpmapFile('read'), entry.id))">Rattacher</button><button class="secondary" :disabled="expmapBusy" title="Les fichiers restent sur le disque" @click="guard(() => removeExpmapLibraryEntry(entry.id))">Retirer du catalogue</button></div>
      </article>
      <fieldset v-if="imageEntry" :disabled="expmapBusy" class="image-export">
        <strong>Image entière · {{ imageEntry.name }}</strong>
        <p class="hint">Angle horizontal, profondeur verticale, sans les marges techniques. Inclut les doublements de couverture du centre. Jusqu’à 32 mégapixels.</p>
        <DenseField v-model="imageWidth" label="Largeur (px)" :min="1" :max="32767" :step="1"/>
        <DenseField v-model="imageHeight" label="Hauteur (px)" :min="1" :max="32767" :step="1"/>
        <DenseSelect v-model="imageFormat" label="Format" :options="[{value:'image/png',label:'PNG — sans perte supplémentaire'},{value:'image/jpeg',label:'JPEG'},{value:'image/webp',label:'WebP'}]"/>
        <DenseField v-if="imageFormat !== 'image/png'" v-model="imageQuality" label="Qualité" :min="0" :max="1" :step="0.01"/>
        <button class="primary" @click="saveImage">Exporter l’image…</button><button @click="imageEntry=null">Fermer</button>
      </fieldset>
    </DenseSection>
    <p v-if="error" class="problem" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.expmap-panel{font-size:11px}fieldset{border:0;padding:0;min-width:0}label{display:flex;align-items:center;gap:6px;margin:4px 0}input{min-width:0;width:100%;background:#ffffff0b;color:inherit;border:1px solid #ffffff20;padding:3px}article{border-top:1px solid #ffffff20;padding:7px 0}small{display:block;overflow-wrap:anywhere}button{margin:3px;padding:4px;border:1px solid #ffffff30;border-radius:3px}p{overflow-wrap:anywhere;margin:5px 0}
button{cursor:pointer;transition:background .15s,border-color .15s}button:not(:disabled):hover{background:#ffffff18;border-color:#ffffff70}button:disabled{opacity:.4;cursor:not-allowed}button.primary{background:#2563eb;border-color:#60a5fa;color:white;font-weight:600}button.primary:not(:disabled):hover{background:#1d4ed8}button.stop{border-color:#e4aa60;color:#f3c78f}button.secondary{opacity:.7}button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}.hint{opacity:.7;line-height:1.5}.intro{line-height:1.5;margin:0 0 8px}.problem{padding:7px;border-left:2px solid #e4aa60;background:#e4aa6012}.empty{padding:12px 8px;text-align:center;opacity:.7;border:1px dashed #ffffff30;border-radius:5px}summary{cursor:pointer;padding:6px 0;opacity:.8}article img{float:left;object-fit:cover;margin:0 8px 6px 0;border-radius:4px}article{display:flow-root}.entry-name{font-weight:600}label>input{flex:1}label>input[type=checkbox]{flex:0;width:auto}.image-export{padding:8px;border:1px solid #ffffff30;border-radius:5px}label{white-space:nowrap}
</style>
