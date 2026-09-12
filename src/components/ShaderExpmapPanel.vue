<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { Engine, RenderOptions } from '../Engine'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { planExpmap, type ExpmapPlan } from '../expmap/plan'
import { shaderSourceEstimate, type ShaderExpmapManifest } from '../expmap/displayFormat'
import { shaderLibraryEntries, rememberShaderSource, forgetShaderSource, authorizeShaderDirectory, type ShaderLibraryEntry } from '../expmap/displayLibrary'
import { ShaderExpmapStore, copyShaderSource } from '../expmap/displayStore'
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
import { DenseField } from './dense'
const props=defineProps<{plan:ExpmapPlan|null;name:string;appearance:RenderOptions;engine:Engine|null;controller:MandelbrotExposed|null}>()
const ringFirst=ref(true),keepRings=ref(false),ringBitrateMbps=ref(60)
const radialDensity=ref(1),budgetMiB=ref(512),samples=ref(16),fps=ref(30),codec=ref<Mp4Codec>('hevc')
const recent=ref<ShaderLibraryEntry[]>([])
onMounted(async()=>{try{recent.value=await shaderLibraryEntries()}catch{/* A directory can still be opened manually. */}})
const videoUrl=ref(''),videoName=ref('')
const error=ref(''),status=ref(''),done=ref(0),total=ref(0),ownBusy=ref(false)
const source=shallowRef<{store:ShaderExpmapStore;manifest:ShaderExpmapManifest}|null>(null)
const previewScale=ref('1e0'),angle=ref(0),window=ref<ExpmapVideoWindow|null>(null)
const outputWidth=ref(1920),outputHeight=ref(1080),preview=ref<HTMLCanvasElement|null>(null)
let abort:AbortController|undefined
const plan=computed(()=>{try{return props.plan?planExpmap({...props.plan,radialDensity:radialDensity.value,centerOctaves:17}):null}catch{return null}})
const estimate=computed(()=>{try{return plan.value?shaderSourceEstimate(plan.value):null}catch{return null}})
const memory=computed(()=>{try{return source.value?planShaderMemory(source.value.manifest,outputWidth.value,outputHeight.value,budgetMiB.value*1048576):null}catch{return null}})
const ringEstimate=computed(()=>{
  try {
    if(!source.value||!window.value)return null
    const m=source.value.manifest,w=outputWidth.value,h=outputHeight.value
    const budget=planShaderMemory(m,w,h,budgetMiB.value*1048576,w*h*32)
    const rings=planShaderRings(m,budget.cacheBytes,budget.usefulOctaves)
    const duration=window.value.durationSeconds+motionSettings(window.value).holdSeconds
    const view={width:w,height:h,scale:window.value.fromScale,angle:window.value.fromAngle,effects:documentEffects(m.id)}
    const bitrate=rings.reduce((sum,ring)=>sum+ringVideoBitrate(ringVideoRect(m,view,ring),w,h,ringBitrateMbps.value*1e6),0)
    return {passes:rings.length,octaves:budget.usefulOctaves,bytes:bitrate*duration/8}
  }catch{return null}
})
const videoSource=computed(()=>source.value?{documentId:source.value.manifest.id,state:source.value.manifest.state,projection:source.value.manifest.projection}:null)
onUnmounted(()=>{abort?.abort();if(videoUrl.value)URL.revokeObjectURL(videoUrl.value)})
async function pickDirectory() {
  const picker=(globalThis as typeof globalThis & {showDirectoryPicker?:(options:unknown)=>Promise<FileSystemDirectoryHandle>}).showDirectoryPicker
  if(!picker)throw new Error('Ce navigateur ne permet pas de choisir un dossier local')
  return picker({mode:'readwrite'})
}
async function selected(store:ShaderExpmapStore,manifest:ShaderExpmapManifest) {
  source.value={store,manifest};previewScale.value=manifest.projection.domain.startScale
  outputWidth.value=manifest.projection.width;outputHeight.value=manifest.projection.height
  window.value=expmapVideoDefaults({documentId:manifest.id,state:manifest.state,projection:manifest.projection})
  try {await rememberShaderSource(manifest,store.directory);recent.value=await shaderLibraryEntries()} catch {/* Source files remain usable without a catalogue. */}
}
async function run(action:()=>Promise<void>) {
  if(expmapBusy.value)return
  error.value='';done.value=0;total.value=0;expmapBusy.value=true;ownBusy.value=true;abort=new AbortController()
  try {await action()} catch(e) {if(abort.signal.aborted)status.value='Interrompu';else error.value=String(e)}
  finally {abort=undefined;expmapBusy.value=false;ownBusy.value=false}
}
async function attach() {await run(async()=>{const store=new ShaderExpmapStore(await pickDirectory());await selected(store,await store.open());status.value='Source ouverte'})}
async function openRecent(entry:ShaderLibraryEntry) {await run(async()=>{await authorizeShaderDirectory(entry.handle);const store=new ShaderExpmapStore(entry.handle);await selected(store,await store.open())})}
async function forget(id:string) {await forgetShaderSource(id);recent.value=await shaderLibraryEntries()}
async function create(resume=false,browserStorage=false) {
  await run(async()=>{
    if(!props.engine||!props.controller)throw new Error('Moteur indisponible')
    const directory=browserStorage?await (await navigator.storage.getDirectory()).getDirectoryHandle(`shader-${crypto.randomUUID()}`,{create:true}):undefined
    const store=resume&&source.value?source.value.store:new ShaderExpmapStore(directory??await pickDirectory())
    const previous=resume?await store.open():undefined,p=previous?.projection??plan.value
    if(!p)throw new Error('Plan invalide')
    const controller=props.controller,camera=controller.getParams();if(!camera)throw new Error('Caméra indisponible')
    expmapOpenDocument.value=null
    status.value='Calcul des données shader'
    try {
      const result=await createShaderExpmap({engine:props.engine,controller:{getNavigator:()=>controller.getNavigator(),drawOnce:()=>controller.drawOnce(),setExportTime:t=>controller.setExportTime!(t)}},
        {store,plan:p,name:props.name,appearance:previous?JSON.parse(previous.appearanceJson):props.appearance,resume,signal:abort!.signal,
          restoreCamera:{cx:camera[0],cy:camera[1],scale:camera[2],angle:Number(camera[3])},onProgress:(a,b)=>{done.value=a;total.value=b}})
      await selected(store,result);status.value='Source shader enregistrée'
    } finally {
      try {await selected(store,await store.open())} catch {/* A failed first write has no checkpoint. */}
    }
  })
}
async function copySource() {
  await run(async()=>{
    if(!source.value)throw new Error('Ouvrir une source')
    const target=new ShaderExpmapStore(await pickDirectory())
    status.value='Copie vérifiée de la source'
    const result=await copyShaderSource(source.value.store,target,abort!.signal,(a,b)=>{done.value=a;total.value=b})
    await selected(target,result);status.value='Source copiée'
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
        status.value='Export vidéo par couronnes'
        const writable=await file.createWritable()
        let result
        try {
          const request={window:{...window.value},width:outputWidth.value,height:outputHeight.value,fps:fps.value,codec:codec.value,maxSamples:samples.value,effects,
            destination:{kind:'stream' as const,writable:writable as unknown as WritableStream<Uint8Array>},signal:abort!.signal,gpuRenderer:renderer,onProgress:(a:number,b:number)=>{done.value=a;total.value=b}}
          result=ringFirst.value?await exportShaderRingVideo({manifest:videoSource.value},{...request,scratch:doc.store.directory,keepIntermediates:keepRings.value,intermediateBitrate:ringBitrateMbps.value*1e6,
            onPhase:(phase,a,b)=>{status.value=phase;done.value=a;total.value=b}}):await exportExpmapVideo({manifest:videoSource.value},request)
        }catch(error){await writable.abort().catch(()=>{});throw error}
        status.value=result.cancelled?'Vidéo interrompue':'Vidéo enregistrée'
        if(browserStorage&&result.framesEmitted>0){if(videoUrl.value)URL.revokeObjectURL(videoUrl.value);videoUrl.value=URL.createObjectURL(await file.getFile());videoName.value=`${doc.manifest.name}-shader.mp4`}
      } else {
        status.value='Reconstruction et shading'
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
  <details class="shader-panel">
    <summary>Shader complet · source réutilisable</summary>
    <p>Conserve les données avant couleur dans un dossier local. Les palettes et matériaux actuels sont appliqués à la lecture.</p>
    <fieldset :disabled="expmapBusy">
      <DenseField v-model="radialDensity" label="Densité radiale" :min="1" :max="64" :step="1"/>
      <p v-if="estimate">Source brute : {{ (estimate.rawBytes/1e9).toFixed(2) }} Go · {{ estimate.blocks }} blocs · centre couvert sur 17 octaves</p>
      <button :disabled="!plan" @click="create()">Créer dans un dossier vide</button>
      <button :disabled="!plan" @click="create(false,true)">Créer dans le stockage du navigateur</button>
      <small>Pour les grandes sources, préférer un dossier : le stockage navigateur dépend du quota disponible.</small>
      <button @click="attach">Ouvrir un dossier shader</button>
      <div v-for="entry in recent" :key="entry.id"><button @click="openRecent(entry)">{{ entry.name }} · {{ entry.state==='complete'?'Prêt':'À reprendre' }}</button> <button @click="forget(entry.id)">Retirer de la liste</button></div>
      <template v-if="source">
        <p>{{ source.manifest.name }} · {{ source.manifest.completed }}/{{ source.manifest.total }} blocs</p>
        <button v-if="source.manifest.state!=='complete'" @click="create(true)">Reprendre le calcul</button>
        <template v-else>
          <button @click="copySource">Copier vers un autre dossier…</button>
          <DenseField v-model="budgetMiB" label="Budget du lecteur (Mio)" :min="64" :max="16384" :step="64"/>
          <small>Budget supplémentaire au moteur ouvert. Le cache se subdivise si les octaves entières ne tiennent pas.</small>
          <p v-if="memory">{{ memory.usefulOctaves }} octave(s) utile(s) par couronne + 2 réserves · {{ memory.subdivided?'chargement par blocs':'cache par octaves' }}</p>
          <label>AA <select v-model.number="samples"><option v-for="n in [1,4,9,16,36,64,144,256]" :key="n" :value="n">{{ n }}</option></select></label>
          <label>Échelle d’aperçu <input v-model="previewScale"></label>
          <DenseField v-model="angle" label="Rotation aperçu (°)" :min="-36000" :max="36000" :step="1"/>
          <ExpmapEffectsControls :document-id="source.manifest.id" :tile-count="planExpmapOctaves(source.manifest.projection).tileCount"/>
          <button @click="render()">Actualiser l’aperçu</button>
          <template v-if="window">
            <label>Départ vidéo <input v-model="window.fromScale" @change="updateWindow"></label>
            <label>Arrivée vidéo <input v-model="window.toScale" @change="updateWindow"></label>
            <DenseField v-model="window.durationSeconds" label="Durée (s)" :min="0.1" :max="86400" :step="1" @update:model-value="updateWindow"/>
            <label>Départ progressif <select v-model="window.easeIn" @change="updateWindow"><option v-for="e in EXPMAP_EASES" :key="e.value" :value="e.value">{{ e.label }}</option></select></label>
            <DenseField v-if="window.easeIn!=='none'" v-model="window.easeInSeconds" label="Transition départ (s)" :min="0" :max="window.durationSeconds" :step="0.1" @update:model-value="updateWindow"/>
            <label>Arrivée progressive <select v-model="window.easeOut" @change="updateWindow"><option v-for="e in EXPMAP_EASES" :key="e.value" :value="e.value">{{ e.label }}</option></select></label>
            <DenseField v-if="window.easeOut!=='none'" v-model="window.easeOutSeconds" label="Transition arrivée (s)" :min="0" :max="window.durationSeconds" :step="0.1" @update:model-value="updateWindow"/>
            <DenseField v-model="window.holdSeconds" label="Pause finale (s)" :min="0" :max="86400" :step="0.1"/>
            <DenseField v-model="window.fromAngle" label="Angle départ (rad)" :min="-100000" :max="100000" :step="0.1"/>
            <DenseField v-model="window.toAngle" label="Angle arrivée (rad)" :min="-100000" :max="100000" :step="0.1"/>
            <DenseField v-model="outputWidth" label="Largeur vidéo" :min="16" :max="3840" :step="2"/>
            <DenseField v-model="outputHeight" label="Hauteur vidéo" :min="16" :max="2160" :step="2"/>
            <DenseField v-model="fps" label="Images/s" :min="1" :max="120" :step="1"/>
            <label>Codec <select v-model="codec"><option v-for="c in MP4_CODECS" :key="c.value" :value="c.value">{{ c.label }}</option></select></label>
            <label>Ordre du rendu <select v-model="ringFirst"><option :value="true">Couronne complète, puis la suivante</option><option :value="false">Image complète, puis la suivante</option></select></label>
            <template v-if="ringFirst">
              <DenseField v-model="ringBitrateMbps" label="Débit couronne plein écran (Mbit/s)" :min="1" :max="500" :step="1"/>
              <p v-if="ringEstimate">{{ ringEstimate.passes }} passes · jusqu’à {{ ringEstimate.octaves }} octave(s) utiles chacune, selon le budget (+2 réservées) · intermédiaires ≈ {{ (ringEstimate.bytes/1e9).toFixed(2) }} Go de vidéo au débit cible, hors masques compressés et conteneurs.</p>
              <p v-else role="alert">Budget insuffisant pour les intermédiaires et le cache.</p>
              <small>Un MP4 par couronne, avec le codec choisi et un débit réduit pour les petites couronnes. Masques AA compressés sans perte. La couleur subit la compression vidéo puis l’encodage final. Reprise des couronnes terminées ; la couronne interrompue et l’assemblage final recommencent.</small>
              <label><input type="checkbox" v-model="keepRings">Conserver les intermédiaires après succès</label>
            </template>
            <button :disabled="ringFirst&&!ringEstimate" @click="render(true)">Exporter la vidéo shader…</button>
            <button :disabled="ringFirst&&!ringEstimate" @click="render(true,true)">Exporter dans le stockage du navigateur</button>
          </template>
        </template>
      </template>
    </fieldset>
    <p v-if="status" role="status">{{ status }} <span v-if="total">· {{ done }}/{{ total }}</span></p>
    <button v-if="ownBusy" @click="abort?.abort()">Interrompre</button>
    <p v-if="error" role="alert">{{ error }}</p>
    <a v-if="videoUrl" :href="videoUrl" :download="videoName">Télécharger {{ videoName }}</a>
    <canvas ref="preview" class="preview" v-show="source?.manifest.state==='complete'"/>
  </details>
</template>
<style scoped>
.shader-panel{border:1px solid var(--line);border-radius:6px;padding:8px;margin:8px 0;font-size:12px}summary{cursor:pointer;font-weight:600}fieldset{border:0;padding:0;display:grid;gap:6px}label{display:flex;justify-content:space-between;gap:6px}input,select{max-width:60%;background:var(--row);border:1px solid var(--line);color:inherit;border-radius:4px;padding:3px}button{padding:5px;background:var(--row-on);color:var(--ink);border:1px solid var(--line);border-radius:4px;cursor:pointer}p{margin:6px 0}small{opacity:.7}.preview{width:100%;height:auto;max-height:65vh;object-fit:contain}p[role=alert]{color:var(--red)}
button:disabled{opacity:.45;cursor:default}button:not(:disabled):hover{border-color:var(--accent)}
</style>
