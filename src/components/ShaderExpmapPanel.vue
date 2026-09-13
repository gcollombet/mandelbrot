<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { Engine, RenderOptions } from '../Engine'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { planExpmap, type ExpmapPlan } from '../expmap/plan'
import { shaderSourceEstimate, type ShaderExpmapManifest } from '../expmap/displayFormat'
import { shaderLibraryEntries, rememberShaderSource, forgetShaderSource, authorizeShaderDirectory, type ShaderLibraryEntry } from '../expmap/displayLibrary'
import { ShaderExpmapStore, copyShaderSource } from '../expmap/displayStore'
import { OpfsShaderArchive, shaderArchivePath, exportShaderArchive, importShaderArchive, deleteShaderArchive, type ShaderExpmapSource } from '../expmap/displayArchiveClient'
import { createShaderExpmap } from '../expmap/displayCreate'
import { exportShaderRingVideo } from '../expmap/displayRingVideo'
import { planShaderRings } from '../expmap/displayRings'
import { motionSettings } from '../expmap/motion'
import { ringVideoRect, ringVideoBitrate } from '../expmap/displayRingMedia'
import { ShaderExpmapRenderer, planShaderMemory } from '../expmap/displayRenderer'
import { expmapBusy, expmapOpenDocument } from '../expmap/runtime'
import { expmapVideoDefaults, changeExpmapDuration, changeExpmapWindow, exportExpmapVideo, type ExpmapVideoWindow } from '../expmap/video'
import { EXPMAP_EASES } from '../expmap/motion'
import { documentEffects } from '../expmap/effects'
import { planExpmapOctaves } from '../expmap/octaves'
import { MP4_CODECS, type Mp4Codec } from '../videoEncoderSink'
import ExpmapEffectsControls from './ExpmapEffectsControls.vue'
import { DenseField, DenseSection, DenseSelect } from './dense'
import RenderProgress from './RenderProgress.vue'
import ResolutionSelect from './ResolutionSelect.vue'
const props=defineProps<{plan:ExpmapPlan|null;name:string;appearance:RenderOptions;engine:Engine|null;controller:MandelbrotExposed|null}>()
const ringFirst=ref(true),keepRings=ref(false),ringBitrateMbps=ref(60)
const radialDensity=ref(1),budgetMiB=ref(512),samples=ref(16),fps=ref(30),codec=ref<Mp4Codec>('hevc')
const recent=ref<ShaderLibraryEntry[]>([])
onMounted(async()=>{try{recent.value=await shaderLibraryEntries()}catch{/* A directory can still be opened manually. */}await refreshQuota()})
const videoUrl=ref(''),videoName=ref('')
const error=ref(''),status=ref(''),done=ref(0),total=ref(0),unit=ref('éléments'),ownBusy=ref(false)
type Source={store:ShaderExpmapSource;manifest:ShaderExpmapManifest;archive?:string[]}
const source=shallowRef<Source|null>(null)
const quota=ref<{usage:number;quota:number}|null>(null)
async function refreshQuota() {try{const e=await navigator.storage.estimate();quota.value={usage:e.usage??0,quota:e.quota??0}}catch{quota.value=null}}
/** Intermediate ring files live next to the archives, never in a user folder. */
async function scratchDirectory() {return (await navigator.storage.getDirectory()).getDirectoryHandle('shader-scratch',{create:true})}
async function releaseSource() {const s=source.value;source.value=null;if(s?.store instanceof OpfsShaderArchive)await s.store.close()}
const previewScale=ref('1e0'),angle=ref(0),window=ref<ExpmapVideoWindow|null>(null)
const outputWidth=ref(1920),outputHeight=ref(1080),preview=ref<HTMLCanvasElement|null>(null)
let abort:AbortController|undefined
const plan=computed(()=>{try{return props.plan?planExpmap({...props.plan,radialDensity:radialDensity.value,centerOctaves:17}):null}catch{return null}})
const estimate=computed(()=>{try{return plan.value?shaderSourceEstimate(plan.value):null}catch{return null}})
const memory=computed(()=>{try{return source.value?planShaderMemory(source.value.manifest,outputWidth.value,outputHeight.value,budgetMiB.value*1048576,0,props.engine?.device?.limits):null}catch{return null}})
const ringEstimate=computed(()=>{
  try {
    if(!source.value||!window.value)return null
    const m=source.value.manifest,w=outputWidth.value,h=outputHeight.value
    const budget=planShaderMemory(m,w,h,budgetMiB.value*1048576,w*h*32,props.engine?.device?.limits)
    const rings=planShaderRings(m,budget.cacheBytes,budget.usefulOctaves)
    const duration=window.value.durationSeconds+motionSettings(window.value).holdSeconds
    const view={width:w,height:h,scale:window.value.fromScale,angle:window.value.fromAngle,effects:documentEffects(m.id)}
    const direct=rings.length===1&&!keepRings.value
    const bitrate=direct?0:rings.reduce((sum,ring)=>sum+ringVideoBitrate(ringVideoRect(m,view,ring),w,h,ringBitrateMbps.value*1e6),0)
    return {passes:rings.length,octaves:budget.usefulOctaves,direct,bytes:direct?0:bitrate*duration/8}
  }catch{return null}
})
const videoSource=computed(()=>source.value?{documentId:source.value.manifest.id,state:source.value.manifest.state,projection:source.value.manifest.projection}:null)
onUnmounted(()=>{abort?.abort();if(videoUrl.value)URL.revokeObjectURL(videoUrl.value);void releaseSource()})
async function pickDirectory() {
  const picker=(globalThis as typeof globalThis & {showDirectoryPicker?:(options:unknown)=>Promise<FileSystemDirectoryHandle>}).showDirectoryPicker
  if(!picker)throw new Error('Ce navigateur ne permet pas de choisir un dossier local')
  return picker({mode:'readwrite'})
}
async function selected(store:ShaderExpmapSource,manifest:ShaderExpmapManifest) {
  if(source.value&&source.value.store!==store)await releaseSource()
  const archive=store instanceof OpfsShaderArchive?store.path:undefined
  source.value={store,manifest,archive};previewScale.value=manifest.projection.domain.startScale
  outputWidth.value=manifest.projection.width;outputHeight.value=manifest.projection.height
  window.value=expmapVideoDefaults({documentId:manifest.id,state:manifest.state,projection:manifest.projection})
  try {await rememberShaderSource(manifest,archive??(store as ShaderExpmapStore).directory);recent.value=await shaderLibraryEntries()} catch {/* Source files remain usable without a catalogue. */}
  await refreshQuota()
}
async function run(action:()=>Promise<void>) {
  if(expmapBusy.value)return
  error.value='';done.value=0;total.value=0;expmapBusy.value=true;ownBusy.value=true;abort=new AbortController()
  try {await action()} catch(e) {if(abort.signal.aborted)status.value='Interrompu';else error.value=String(e)}
  finally {abort=undefined;expmapBusy.value=false;ownBusy.value=false}
}
async function attach() {await run(async()=>{const store=new ShaderExpmapStore(await pickDirectory());await selected(store,await store.open());status.value='Source ouverte'})}
async function openRecent(entry:ShaderLibraryEntry) {await run(async()=>{
  if(entry.archive) {const store=new OpfsShaderArchive(entry.archive);try{await selected(store,await store.open())}catch(error){await store.close();throw error}}
  else if(entry.handle) {await authorizeShaderDirectory(entry.handle);const store=new ShaderExpmapStore(entry.handle);await selected(store,await store.open())}
})}
async function forget(id:string) {await forgetShaderSource(id);recent.value=await shaderLibraryEntries()}
async function removeArchive(entry:ShaderLibraryEntry) {
  await run(async()=>{
    if(!entry.archive)return
    if(source.value?.archive?.join('/')===entry.archive.join('/'))await releaseSource()
    await deleteShaderArchive(entry.archive);await forgetShaderSource(entry.id);recent.value=await shaderLibraryEntries();await refreshQuota();status.value='Archive supprimée'
  })
}
async function importArchive() {
  await run(async()=>{
    const picker=(globalThis as typeof globalThis & {showOpenFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle[]>}).showOpenFilePicker
    if(!picker)throw new Error('Ce navigateur ne permet pas de choisir un fichier')
    const [handle]=await picker({types:[{description:'Archive shader ExpMap',accept:{'application/octet-stream':['.smexp']}}]})
    const path=shaderArchivePath(crypto.randomUUID())
    status.value='Import de l’archive';unit.value='octets'
    await importShaderArchive(await handle.getFile(),path,abort!.signal)
    const store=new OpfsShaderArchive(path)
    try{await selected(store,await store.open())}catch(error){await store.close();await deleteShaderArchive(path).catch(()=>{});throw error}
    status.value='Archive importée'
  })
}
async function exportArchive() {
  await run(async()=>{
    const current=source.value
    if(!current?.archive||!(current.store instanceof OpfsShaderArchive))throw new Error('Ouvrir une archive')
    const picker=(globalThis as typeof globalThis & {showSaveFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle>}).showSaveFilePicker
    if(!picker)throw new Error('Enregistrement direct sur disque indisponible')
    const target=await picker({suggestedName:`${current.manifest.name}.smexp`,types:[{description:'Archive shader ExpMap',accept:{'application/octet-stream':['.smexp']}}]})
    status.value='Export de l’archive'
    await current.store.close()
    try {await exportShaderArchive(current.archive,target,abort!.signal)}
    finally {const store=new OpfsShaderArchive(current.archive);await selected(store,await store.open())}
    status.value='Archive exportée'
  })
}
/** Convert a legacy block directory into an archive, block by block. */
async function archiveDirectory() {
  await run(async()=>{
    const current=source.value
    if(!current||!(current.store instanceof ShaderExpmapStore))throw new Error('Ouvrir un dossier shader')
    const target=new OpfsShaderArchive(shaderArchivePath(crypto.randomUUID()),true)
    status.value='Conversion du dossier en archive';unit.value='blocs'
    try {
      const result=await copyShaderSource(current.store,target,abort!.signal,(a,b)=>{done.value=a;total.value=b})
      await selected(target,result);status.value='Archive créée depuis le dossier'
    } catch(error) {await target.close();throw error}
  })
}
async function create(resume=false) {
  await run(async()=>{
    if(!props.engine||!props.controller)throw new Error('Moteur indisponible')
    const store:ShaderExpmapSource=resume&&source.value?source.value.store:new OpfsShaderArchive(shaderArchivePath(crypto.randomUUID()),true)
    const previous=resume?await store.open():undefined,p=previous?.projection??plan.value
    if(!p)throw new Error('Plan invalide')
    const controller=props.controller,camera=controller.getParams();if(!camera)throw new Error('Caméra indisponible')
    expmapOpenDocument.value=null
    status.value='Calcul des données shader';unit.value='blocs'
    try {
      const result=await createShaderExpmap({engine:props.engine,controller:{getNavigator:()=>controller.getNavigator(),drawOnce:()=>controller.drawOnce(),setExportTime:t=>controller.setExportTime!(t)}},
        {store,plan:p,name:props.name,appearance:previous?JSON.parse(previous.appearanceJson):props.appearance,resume,signal:abort!.signal,
          restoreCamera:{cx:camera[0],cy:camera[1],scale:camera[2],angle:Number(camera[3])},onProgress:(a,b)=>{done.value=a;total.value=b}})
      await selected(store,result);status.value='Source shader enregistrée'
    } finally {
      try {await selected(store,await store.open())} catch {if(store instanceof OpfsShaderArchive&&store!==source.value?.store)await store.close()}
    }
  })
}
async function render(video=false,browserStorage=false) {
  await run(async()=>{
    if(!source.value||!props.engine||!window.value||!videoSource.value)throw new Error('Ouvrir une source complète')
    const doc=source.value,effects={...documentEffects(doc.manifest.id)}
    // Snapshot the appearance once: all frames and polar passes use the same recipe.
    const appearance=JSON.parse(JSON.stringify(props.appearance)) as RenderOptions
    const renderer=new ShaderExpmapRenderer(props.engine,doc.store,doc.manifest,appearance,budgetMiB.value*1048576)
    try {
      if(video) {
        const picker=(globalThis as typeof globalThis & {showSaveFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle>}).showSaveFilePicker
        if(!picker&&!browserStorage)throw new Error('Enregistrement direct sur disque indisponible : utiliser le stockage du navigateur')
        const file=browserStorage?await (await navigator.storage.getDirectory()).getFileHandle(`shader-video-${crypto.randomUUID()}.mp4`,{create:true}):await picker!({suggestedName:`${doc.manifest.name}-shader.mp4`,types:[{description:'Vidéo MP4',accept:{'video/mp4':['.mp4']}}]})
        status.value='Export vidéo par couronnes';unit.value='images'
        const writable=await file.createWritable()
        let result
        try {
          const request={window:{...window.value},width:outputWidth.value,height:outputHeight.value,fps:fps.value,codec:codec.value,maxSamples:samples.value,effects,
            destination:{kind:'stream' as const,writable:writable as unknown as WritableStream<Uint8Array>},signal:abort!.signal,gpuRenderer:renderer,onProgress:(a:number,b:number)=>{done.value=a;total.value=b}}
          result=ringFirst.value?await exportShaderRingVideo({manifest:videoSource.value},{...request,scratch:scratchDirectory,keepIntermediates:keepRings.value,intermediateBitrate:ringBitrateMbps.value*1e6,
            onPhase:(phase,a,b)=>{status.value=phase;done.value=a;total.value=b}}):await exportExpmapVideo({manifest:videoSource.value},request)
        }catch(error){await writable.abort().catch(()=>{});throw error}
        status.value=result.cancelled?'Vidéo interrompue':'Vidéo enregistrée'
        if(browserStorage&&result.framesEmitted>0){if(videoUrl.value)URL.revokeObjectURL(videoUrl.value);videoUrl.value=URL.createObjectURL(await file.getFile());videoName.value=`${doc.manifest.name}-shader.mp4`}
      } else {
        status.value='Reconstruction et shading';unit.value='blocs'
        renderer.onProgress=(a,b)=>{done.value=a;total.value=b}
        const w=Math.min(outputWidth.value,960),h=Math.max(1,Math.round(w*outputHeight.value/outputWidth.value))
        const result=await renderer.render({width:w,height:h,scale:previewScale.value,angle:angle.value*Math.PI/180,allowUpscale:true,maxSamples:samples.value,effects},abort!.signal)
        if(preview.value) {preview.value.width=w;preview.value.height=h;preview.value.getContext('2d')!.drawImage(result,0,0)}
        status.value='Aperçu reconstruit'
      }
    } finally {renderer.dispose()}
  })
}
function updateWindow() {
  if(!window.value)return
  try {window.value=changeExpmapDuration(changeExpmapWindow(window.value,window.value.fromScale,window.value.toScale),window.value.durationSeconds)}catch(e){error.value=String(e)}
}
</script>
<template>
  <DenseSection title="3 · Rendu recolorable (archive shader)" class="shader-panel">
    <p class="hint">Conserve les données avant couleur dans une archive compressée du navigateur. Les palettes et matériaux du moment sont appliqués à la lecture et à chaque export vidéo : un seul calcul, autant de colorations que voulu.</p>
    <fieldset :disabled="expmapBusy">
      <details open><summary>Créer depuis les paramètres de la section 1</summary>
        <DenseField v-model="radialDensity" label="Densité radiale" :min="1" :max="64" :step="1"/>
        <p v-if="estimate" class="hint">Source brute : {{ (estimate.rawBytes/1e9).toFixed(2) }} Go · {{ estimate.blocks }} blocs · centre couvert sur 17 octaves. Compression mesurée ≈ 4 à 5× ; les champs constants et les blocs uniformes ne sont pas stockés.</p>
        <button class="primary" :disabled="!plan" @click="create()">Créer une archive</button>
      </details>
      <details open><summary>Archives disponibles</summary>
        <p v-if="quota" class="hint">Stockage navigateur : {{ (quota.usage/1e9).toFixed(2) }} Go utilisés sur {{ (quota.quota/1e9).toFixed(0) }} Go disponibles.</p>
        <div class="toolbar"><button @click="importArchive">Importer une archive…</button><button @click="attach">Ouvrir un dossier shader (ancien format)</button></div>
        <p v-if="!recent.length" class="hint">Aucune archive. Crée-en une ci-dessus ou importe un fichier .smexp.</p>
        <div v-for="entry in recent" :key="entry.id" class="entry" :class="{selected:source?.manifest.id===entry.id}">
          <button class="entry-open" @click="openRecent(entry)">{{ entry.name }} · {{ entry.archive?'archive':'dossier' }} · {{ entry.state==='complete'?'Prêt':'À reprendre' }}</button>
          <button @click="forget(entry.id)">Retirer</button>
          <button v-if="entry.archive" @click="removeArchive(entry)">Supprimer</button>
        </div>
      </details>
      <template v-if="source">
        <p><strong>{{ source.manifest.name }}</strong> · {{ source.manifest.completed }}/{{ source.manifest.total }} blocs</p>
        <button v-if="source.manifest.state!=='complete'" class="primary" @click="create(true)">Reprendre le calcul</button>
        <template v-else>
          <div class="toolbar">
            <button v-if="source.archive" @click="exportArchive">Exporter l’archive…</button>
            <button v-else @click="archiveDirectory">Convertir en archive du navigateur</button>
          </div>
          <details open><summary>Lecture et aperçu</summary>
            <DenseField v-model="budgetMiB" label="Budget du lecteur (Mio)" :min="64" :max="16384" :step="64"/>
            <small>Budget supplémentaire au moteur ouvert. Le cache se subdivise si les octaves entières ne tiennent pas.</small>
            <p v-if="memory" class="hint">{{ memory.usefulOctaves }} octave(s) utile(s) par couronne + 2 réserves · {{ memory.subdivided?'chargement par blocs':'cache par octaves' }}</p>
            <DenseSelect :model-value="samples" label="Prélèvements par pixel (AA)" :options="[1,4,9,16,36,64,144,256].map(n=>({value:n,label:String(n)}))" @update:model-value="samples=Number($event)"/>
            <label>Échelle d’aperçu <input v-model="previewScale"></label>
            <DenseField v-model="angle" label="Rotation aperçu (°)" :min="-36000" :max="36000" :step="1"/>
            <ExpmapEffectsControls :document-id="source.manifest.id" :tile-count="planExpmapOctaves(source.manifest.projection).tileCount"/>
            <button @click="render()">Actualiser l’aperçu</button>
            <canvas ref="preview" class="preview"/>
          </details>
          <details v-if="window" open><summary>Vidéo</summary>
            <label>Départ <input v-model="window.fromScale" @change="updateWindow"></label>
            <label>Arrivée <input v-model="window.toScale" @change="updateWindow"></label>
            <DenseField v-model="window.durationSeconds" label="Durée (s)" :min="0.1" :max="86400" :step="1" @update:model-value="updateWindow"/>
            <DenseSelect v-model="window.easeIn" label="Départ progressif" :options="EXPMAP_EASES" @update:model-value="updateWindow"/>
            <DenseField v-if="window.easeIn!=='none'" v-model="window.easeInSeconds" label="Transition départ (s)" :min="0" :max="window.durationSeconds" :step="0.1" @update:model-value="updateWindow"/>
            <DenseSelect v-model="window.easeOut" label="Arrivée progressive" :options="EXPMAP_EASES" @update:model-value="updateWindow"/>
            <DenseField v-if="window.easeOut!=='none'" v-model="window.easeOutSeconds" label="Transition arrivée (s)" :min="0" :max="window.durationSeconds" :step="0.1" @update:model-value="updateWindow"/>
            <DenseField v-model="window.holdSeconds" label="Pause finale (s)" :min="0" :max="86400" :step="0.1"/>
            <DenseField v-model="window.fromAngle" label="Angle départ (rad)" :min="-100000" :max="100000" :step="0.1"/>
            <DenseField v-model="window.toAngle" label="Angle arrivée (rad)" :min="-100000" :max="100000" :step="0.1"/>
            <ResolutionSelect :width="outputWidth" :height="outputHeight" :min="16" :max="3840" :step="2" @update:width="outputWidth=$event" @update:height="outputHeight=$event"/>
            <DenseSelect :model-value="fps" label="Cadence" :options="[24,25,30,60].map(n=>({value:n,label:`${n} fps`}))" @update:model-value="fps=Number($event)"/>
            <DenseSelect v-model="codec" label="Codec" :options="MP4_CODECS"/>
            <DenseSelect :model-value="ringFirst?'ring':'frame'" label="Ordre du rendu" :options="[{value:'ring',label:'Couronne complète, puis la suivante'},{value:'frame',label:'Image complète, puis la suivante'}]" @update:model-value="ringFirst=$event==='ring'"/>
            <template v-if="ringFirst">
              <DenseField v-if="!ringEstimate?.direct" v-model="ringBitrateMbps" label="Débit couronne plein écran (Mbit/s)" :min="1" :max="500" :step="1"/>
              <p v-if="ringEstimate?.direct" class="hint">Une couronne tient dans le budget : encodage direct, sans fichier intermédiaire.</p>
              <p v-else-if="ringEstimate" class="hint">{{ ringEstimate.passes }} passes · jusqu’à {{ ringEstimate.octaves }} octave(s) utiles chacune, selon le budget (+2 réservées) · intermédiaires ≈ {{ (ringEstimate.bytes/1e9).toFixed(2) }} Go de vidéo au débit cible, hors masques compressés et conteneurs.</p>
              <p v-else role="alert">Budget insuffisant pour les intermédiaires et le cache.</p>
              <small v-if="!ringEstimate?.direct">Un MP4 par couronne, avec le codec choisi et un débit réduit pour les petites couronnes. Masques AA compressés sans perte. La couleur subit la compression vidéo puis l’encodage final. Reprise des couronnes terminées ; la couronne interrompue et l’assemblage final recommencent.</small>
              <label><input type="checkbox" v-model="keepRings">Conserver les intermédiaires après succès</label>
            </template>
            <div class="toolbar">
              <button class="primary" :disabled="ringFirst&&!ringEstimate" @click="render(true)">Exporter la vidéo…</button>
              <button :disabled="ringFirst&&!ringEstimate" @click="render(true,true)">Exporter dans le stockage du navigateur</button>
            </div>
          </details>
        </template>
      </template>
    </fieldset>
    <RenderProgress v-if="status" :label="status" :done="done" :total="total" :unit="unit" :active="ownBusy"/>
    <button v-if="ownBusy" @click="abort?.abort()">Interrompre</button>
    <p v-if="error" role="alert">{{ error }}</p>
    <a v-if="videoUrl" :href="videoUrl" :download="videoName">Télécharger {{ videoName }}</a>
  </DenseSection>
</template>
<style scoped>
.shader-panel{font-size:12px}fieldset{border:0;padding:0;display:grid;gap:6px;min-width:0}details{display:grid;gap:6px;padding:4px 0}summary{cursor:pointer;font-weight:600;opacity:.85}label{display:flex;justify-content:space-between;align-items:center;gap:6px}input{max-width:60%;background:var(--row);border:1px solid var(--line);color:inherit;border-radius:4px;padding:3px}label>input[type=checkbox]{max-width:none}button{padding:5px;background:var(--row-on);color:var(--ink);border:1px solid var(--line);border-radius:4px;cursor:pointer}button.primary{background:#2563eb;border-color:#60a5fa;color:#fff;font-weight:600}.toolbar{display:flex;flex-wrap:wrap;gap:4px}.entry{display:flex;gap:4px;align-items:stretch}.entry-open{flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.entry.selected .entry-open{border-color:var(--accent)}p{margin:6px 0}.hint,small{opacity:.7;line-height:1.5}.preview{width:100%;height:auto;max-height:65vh;object-fit:contain;display:block}.preview:not([width]){display:none}p[role=alert]{color:var(--red)}
button:disabled{opacity:.45;cursor:default}button:not(:disabled):hover{border-color:var(--accent)}
</style>
