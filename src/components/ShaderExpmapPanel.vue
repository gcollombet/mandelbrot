<script setup lang="ts">
import VideoEncodingControls from './VideoEncodingControls.vue'
import { normalizeVideoEncoding } from '../videoEncoding'
import { normalizeStereoVideo } from '../stereoVideo'
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Engine, RenderOptions } from '../Engine'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { planExpmap, type ExpmapPlan } from '../expmap/plan'
import { shaderSourceEstimate, type ShaderExpmapManifest } from '../expmap/displayFormat'
import { shaderLibraryEntries, rememberShaderSource, forgetShaderSource, authorizeShaderDirectory, type ShaderLibraryEntry } from '../expmap/displayLibrary'
import { ShaderExpmapStore, copyShaderSource } from '../expmap/displayStore'
import { OpfsShaderArchive, shaderArchivePath, exportShaderArchive, importShaderArchive, deleteShaderArchive, shaderArchiveSize, type ShaderExpmapSource } from '../expmap/displayArchiveClient'
import { createShaderExpmap } from '../expmap/displayCreate'
import { exportShaderRingVideo } from '../expmap/displayRingVideo'
import { planShaderRings } from '../expmap/displayRings'
import { motionSettings } from '../expmap/motion'
import { ringVideoRect, ringVideoBitrate } from '../expmap/displayRingMedia'
import { SHADER_INTERPOLATIONS, SHADER_SAMPLE_DISTRIBUTIONS, type ShaderInterpolation, type ShaderSampleDistribution } from '../expmap/displaySampling'
import { ShaderExpmapRenderer, planShaderMemory } from '../expmap/displayRenderer'
import { expmapBusy, expmapOpenDocument, expmapVideoSelected, shaderExpmapVideoSelected, shaderExpmapVideoEntry, registerShaderPreviewReader, releaseShaderPreviewReaders } from '../expmap/runtime'
import { expmapVideoDefaults, changeExpmapDuration, changeExpmapWindow, exportExpmapVideo, type ExpmapVideoWindow } from '../expmap/video'
import { EXPMAP_EASES, DEFAULT_EXPMAP_MOTION } from '../expmap/motion'
import { documentEffects } from '../expmap/effects'
import { planExpmapOctaves } from '../expmap/octaves'
import { MP4_CODECS, type Mp4Codec } from '../videoEncoderSink'
import ExpmapEffectsControls from './ExpmapEffectsControls.vue'
import { DenseField, DenseSection, DenseSelect } from './dense'
import { loadShaderPreferences, saveShaderPreferences, SHADER_SAMPLE_CHOICES, DEFAULT_SHADER_PREFERENCES } from '../expmap/displayPreferences'
import RenderProgress from './RenderProgress.vue'
import ResolutionSelect from './ResolutionSelect.vue'
const props=defineProps<{plan:ExpmapPlan|null;name:string;appearance:RenderOptions;engine:Engine|null;controller:MandelbrotExposed|null;videoOnly?:boolean}>()
const emit=defineEmits<{ 'use-video': [] }>()
const { t }=useI18n()
const saved=loadShaderPreferences()
const interpolation=ref<ShaderInterpolation>(saved.interpolation)
const sampleDistribution=ref<ShaderSampleDistribution>(saved.sampleDistribution)
const ringFirst=ref(saved.ringFirst),keepRings=ref(saved.keepRings),ringBitrateMbps=ref(saved.ringBitrateMbps)
const radialDensity=ref(saved.radialDensity),budgetMiB=ref(saved.budgetMiB),samples=ref(saved.samples),fps=ref(saved.fps),codec=ref<Mp4Codec>(saved.codec)
const recent=ref<ShaderLibraryEntry[]>([]),sizes=ref<Record<string,number|null>>({})
/** Refresh the catalogue, then measure each browser-stored archive. */
async function refreshRecent() {
  recent.value=await shaderLibraryEntries()
  const measured=await Promise.all(recent.value.map(async e=>[e.id,e.archive?await shaderArchiveSize(e.archive):null] as const))
  sizes.value=Object.fromEntries(measured)
}
const archivesBytes=computed(()=>Object.values(sizes.value).reduce<number>((sum,b)=>sum+(b??0),0))
const gigabytes=(bytes:number)=>bytes>=1e9?t('shaderExpmapPanel.sizeGb',{value:(bytes/1e9).toFixed(2)}):t('shaderExpmapPanel.sizeMb',{value:(bytes/1e6).toFixed(0)})
const easeOptions=computed(()=>EXPMAP_EASES.map(e=>({value:e.value,label:t(`expmap.eases.${e.value}`)})))
const interpolationOptions=computed(()=>SHADER_INTERPOLATIONS.map(o=>({value:o.value,label:t(`expmap.sampling.${o.value}`)})))
const distributionOptions=computed(()=>SHADER_SAMPLE_DISTRIBUTIONS.map(o=>({value:o.value,label:t(`expmap.sampling.${o.value}`)})))
const dynamicRangeOptions=computed(()=>[{value:'sdr',label:t('shaderExpmapPanel.video.sdr')},{value:'hdr',label:t('shaderExpmapPanel.video.hdr')}])
const layoutOptions=computed(()=>[{value:'side-by-side',label:t('shaderExpmapPanel.video.sideBySide')},{value:'top-bottom',label:t('shaderExpmapPanel.video.topBottom')}])
const orderOptions=computed(()=>[{value:'ring',label:t('shaderExpmapPanel.video.orderRing')},{value:'frame',label:t('shaderExpmapPanel.video.orderFrame')}])
onMounted(async()=>{try{await refreshRecent()}catch{/* A directory can still be opened manually. */}await refreshQuota()})
const videoUrl=ref(''),videoName=ref('')
const hdrWarning=ref('')
const error=ref(''),status=ref(''),done=ref(0),total=ref(0),unitKey=ref('shaderExpmapPanel.units.items'),ownBusy=ref(false)
const unit=computed(()=>t(unitKey.value))
type Source={store:ShaderExpmapSource;manifest:ShaderExpmapManifest;archive?:string[]}
const source=shallowRef<Source|null>(null)
const quota=ref<{usage:number;quota:number}|null>(null)
async function refreshQuota() {try{const e=await navigator.storage.estimate();quota.value={usage:e.usage??0,quota:e.quota??0}}catch{quota.value=null}}
/** Intermediate ring files live next to the archives, never in a user folder. */
async function scratchDirectory() {return (await navigator.storage.getDirectory()).getDirectoryHandle('shader-scratch',{create:true})}
async function releaseSource() {const s=source.value;source.value=null;if(s?.store instanceof OpfsShaderArchive)await s.store.close()}
const unregisterPreview=props.videoOnly?()=>{}:registerShaderPreviewReader(releaseSource)
onUnmounted(unregisterPreview)
const previewScale=ref(saved.previewScale),angle=ref(saved.angle),window=ref<ExpmapVideoWindow|null>(null)
const stereo=ref(normalizeStereoVideo(saved.stereo))
const encoding=ref(normalizeVideoEncoding(saved.encoding))
const dynamicRange=ref<'sdr'|'hdr'>(saved.dynamicRange??'sdr'),hdrExposure=ref(saved.hdrExposure??0),hdrQuantizer=ref(saved.hdrQuantizer??10)
watch(dynamicRange,value=>{if(value==='hdr'&&codec.value==='avc')codec.value='hevc'},{immediate:true})
const useRingFirst=computed(()=>ringFirst.value&&!stereo.value.enabled&&dynamicRange.value!=='hdr')
const outputWidth=ref(saved.width),outputHeight=ref(saved.height),preview=ref<HTMLCanvasElement|null>(null)
watch(dynamicRange, mode => { if (mode === 'sdr' && encoding.value.profile === 'quantizer') encoding.value = { ...encoding.value, profile: 'high' } }, { immediate: true })
watch([encoding,dynamicRange,hdrExposure,hdrQuantizer,()=>stereo.value.enabled,()=>stereo.value.strength,()=>stereo.value.layout,interpolation,sampleDistribution,radialDensity,budgetMiB,samples,previewScale,angle,outputWidth,outputHeight,fps,codec,ringFirst,keepRings,ringBitrateMbps],()=>saveShaderPreferences({
  interpolation:interpolation.value,sampleDistribution:sampleDistribution.value,radialDensity:radialDensity.value,budgetMiB:budgetMiB.value,samples:samples.value,previewScale:previewScale.value,angle:angle.value,
  encoding:{...encoding.value},dynamicRange:dynamicRange.value,hdrExposure:hdrExposure.value,hdrQuantizer:hdrQuantizer.value,stereo:{...stereo.value},width:outputWidth.value,height:outputHeight.value,fps:fps.value,codec:codec.value,ringFirst:ringFirst.value,keepRings:keepRings.value,ringBitrateMbps:ringBitrateMbps.value}))
let abort:AbortController|undefined,hardAbort:AbortController|undefined
const interrupting=ref(false)
const plan=computed(()=>{try{return props.plan?planExpmap({...props.plan,radialDensity:radialDensity.value,centerOctaves:17}):null}catch{return null}})
const estimate=computed(()=>{try{return plan.value?shaderSourceEstimate(plan.value):null}catch{return null}})
const memory=computed(()=>{try{return source.value?planShaderMemory(source.value.manifest,outputWidth.value,outputHeight.value,budgetMiB.value*1048576,props.videoOnly?outputWidth.value*outputHeight.value*((stereo.value.enabled?(dynamicRange.value==='hdr'?36:28):0)+(dynamicRange.value==='hdr'?16:0)):0,props.engine?.device?.limits):null}catch{return null}})
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
  if(!picker)throw new Error(t('shaderExpmapPanel.errors.noDirectoryPicker'))
  return picker({mode:'readwrite'})
}
async function selected(store:ShaderExpmapSource,manifest:ShaderExpmapManifest) {
  if(source.value&&source.value.store!==store)await releaseSource()
  const archive=store instanceof OpfsShaderArchive?store.path:undefined
  source.value={store,manifest,archive};if(!previewScale.value)previewScale.value=manifest.projection.domain.startScale
  if(props.videoOnly)shaderExpmapVideoEntry.value={id:manifest.id,name:manifest.name,state:manifest.state,...(archive?{archive}:{handle:(store as ShaderExpmapStore).directory})}
  window.value=expmapVideoDefaults({documentId:manifest.id,state:manifest.state,projection:manifest.projection})
  try {await rememberShaderSource(manifest,archive??(store as ShaderExpmapStore).directory);await refreshRecent()} catch {/* Source files remain usable without a catalogue. */}
  await refreshQuota()
}
async function run(action:()=>Promise<void>) {
  if(expmapBusy.value)return
  hdrWarning.value='';error.value='';done.value=0;total.value=0;expmapBusy.value=true;ownBusy.value=true;interrupting.value=false;abort=new AbortController();hardAbort=new AbortController()
  try {await action()} catch(e) {if(abort.signal.aborted)status.value=t('shaderExpmapPanel.status.interrupted');else error.value=String(e)}
  finally {abort=undefined;hardAbort=undefined;interrupting.value=false;expmapBusy.value=false;ownBusy.value=false}
}
async function attach() {await run(async()=>{const store=new ShaderExpmapStore(await pickDirectory());await selected(store,await store.open());status.value=t('shaderExpmapPanel.status.sourceOpened')})}
async function openRecent(entry:ShaderLibraryEntry) {await run(async()=>{
  if(source.value?.manifest.id===entry.id)return
  if(!props.videoOnly && shaderExpmapVideoSelected.value && shaderExpmapVideoEntry.value?.id===entry.id) { emit('use-video'); return }
  await releaseSource()
  if(props.videoOnly)await releaseShaderPreviewReaders()
  if(entry.archive) {const store=new OpfsShaderArchive(entry.archive);try{await selected(store,await store.open())}catch(error){await store.close();throw error}}
  else if(entry.handle) {await authorizeShaderDirectory(entry.handle);const store=new ShaderExpmapStore(entry.handle);await selected(store,await store.open())}
})}
async function useVideo() {
  const doc=source.value
  if(!doc || doc.manifest.state!=='complete')return
  const entry:ShaderLibraryEntry={id:doc.manifest.id,name:doc.manifest.name,state:doc.manifest.state,
    ...(doc.archive?{archive:doc.archive}:{handle:(doc.store as ShaderExpmapStore).directory})}
  await releaseSource()
  shaderExpmapVideoEntry.value=entry
  shaderExpmapVideoSelected.value=true
  expmapVideoSelected.value=false
  emit('use-video')
}
watch(()=>shaderExpmapVideoEntry.value,entry=>{
  if(props.videoOnly && entry)void openRecent(entry)
},{immediate:true})
async function forget(id:string) {await forgetShaderSource(id);await refreshRecent()}
async function removeArchive(entry:ShaderLibraryEntry) {
  await run(async()=>{
    if(!entry.archive)return
    if(source.value?.archive?.join('/')===entry.archive.join('/'))await releaseSource()
    await deleteShaderArchive(entry.archive);await forgetShaderSource(entry.id);await refreshRecent();await refreshQuota();status.value=t('shaderExpmapPanel.status.archiveDeleted')
  })
}
async function importArchive() {
  await run(async()=>{
    const picker=(globalThis as typeof globalThis & {showOpenFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle[]>}).showOpenFilePicker
    if(!picker)throw new Error(t('shaderExpmapPanel.errors.noFilePicker'))
    const [handle]=await picker({types:[{description:t('shaderExpmapPanel.archiveTypeDescription'),accept:{'application/octet-stream':['.smexp']}}]})
    const path=shaderArchivePath(crypto.randomUUID())
    status.value=t('shaderExpmapPanel.status.importing');unitKey.value='shaderExpmapPanel.units.bytes'
    await importShaderArchive(await handle.getFile(),path,abort!.signal)
    const store=new OpfsShaderArchive(path)
    try{await selected(store,await store.open())}catch(error){await store.close();await deleteShaderArchive(path).catch(()=>{});throw error}
    status.value=t('shaderExpmapPanel.status.imported')
  })
}
async function exportArchive() {
  await run(async()=>{
    const current=source.value
    if(!current?.archive||!(current.store instanceof OpfsShaderArchive))throw new Error(t('shaderExpmapPanel.errors.openAnArchive'))
    const picker=(globalThis as typeof globalThis & {showSaveFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle>}).showSaveFilePicker
    if(!picker)throw new Error(t('shaderExpmapPanel.errors.savingUnavailable'))
    const target=await picker({suggestedName:`${current.manifest.name}.smexp`,types:[{description:t('shaderExpmapPanel.archiveTypeDescription'),accept:{'application/octet-stream':['.smexp']}}]})
    status.value=t('shaderExpmapPanel.status.exporting')
    await current.store.close()
    try {await exportShaderArchive(current.archive,target,abort!.signal)}
    finally {const store=new OpfsShaderArchive(current.archive);await selected(store,await store.open())}
    status.value=t('shaderExpmapPanel.status.exported')
  })
}
/** Convert a legacy block directory into an archive, block by block. */
async function archiveDirectory() {
  await run(async()=>{
    const current=source.value
    if(!current||!(current.store instanceof ShaderExpmapStore))throw new Error(t('shaderExpmapPanel.errors.openAFolder'))
    const target=new OpfsShaderArchive(shaderArchivePath(crypto.randomUUID()),true)
    status.value=t('shaderExpmapPanel.status.converting');unitKey.value='shaderExpmapPanel.units.blocks'
    try {
      const result=await copyShaderSource(current.store,target,abort!.signal,(a,b)=>{done.value=a;total.value=b})
      await selected(target,result);status.value=t('shaderExpmapPanel.status.archiveCreated')
    } catch(error) {await target.close();throw error}
  })
}
async function create(resume=false) {
  await run(async()=>{
    if(!props.engine||!props.controller)throw new Error(t('shaderExpmapPanel.errors.engineUnavailable'))
    const store:ShaderExpmapSource=resume&&source.value?source.value.store:new OpfsShaderArchive(shaderArchivePath(crypto.randomUUID()),true)
    const previous=resume?await store.open():undefined,p=previous?.projection??plan.value
    if(!p)throw new Error(t('shaderExpmapPanel.errors.invalidPlan'))
    const controller=props.controller,camera=controller.getParams();if(!camera)throw new Error(t('shaderExpmapPanel.errors.cameraUnavailable'))
    expmapOpenDocument.value=null
    status.value=t('shaderExpmapPanel.status.computing');unitKey.value='shaderExpmapPanel.units.blocks'
    try {
      const result=await createShaderExpmap({engine:props.engine,controller:{getNavigator:()=>controller.getNavigator(),drawOnce:()=>controller.drawOnce(),setExportTime:t=>controller.setExportTime!(t)}},
        {store,plan:p,name:props.name,appearance:previous?JSON.parse(previous.appearanceJson):props.appearance,resume,signal:abort!.signal,
          restoreCamera:{cx:camera[0],cy:camera[1],scale:camera[2],angle:Number(camera[3])},onProgress:(a,b)=>{done.value=a;total.value=b}})
      await selected(store,result);status.value=t('shaderExpmapPanel.status.sourceSaved')
    } finally {
      try {await selected(store,await store.open())} catch {if(store instanceof OpfsShaderArchive&&store!==source.value?.store)await store.close()}
    }
  })
}
async function render(video=false,browserStorage=false) {
  await run(async()=>{
    if(!source.value||!props.engine||!window.value||!videoSource.value)throw new Error(t('shaderExpmapPanel.errors.openCompleteSource'))
    const doc=source.value,effects={...documentEffects(doc.manifest.id)}
    // Snapshot the appearance once: all frames and polar passes use the same recipe.
    const appearance=JSON.parse(JSON.stringify(props.appearance)) as RenderOptions
    const renderer=new ShaderExpmapRenderer(props.engine,doc.store,doc.manifest,appearance,budgetMiB.value*1048576)
    renderer.interpolation=interpolation.value
    renderer.sampleDistribution=sampleDistribution.value
    try {
      if(video) {
        const picker=(globalThis as typeof globalThis & {showSaveFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle>}).showSaveFilePicker
        if(!picker&&!browserStorage)throw new Error(t('shaderExpmapPanel.errors.savingUnavailableUseBrowser'))
        const file=browserStorage?await (await navigator.storage.getDirectory()).getFileHandle(`shader-video-${crypto.randomUUID()}.mp4`,{create:true}):await picker!({suggestedName:`${doc.manifest.name}-shader${stereo.value.enabled?(stereo.value.layout==='top-bottom'?'-half-ou':'-half-sbs'):''}.mp4`,types:[{description:t('shaderExpmapPanel.videoTypeDescription'),accept:{'video/mp4':['.mp4']}}]})
        status.value=stereo.value.enabled?t('shaderExpmapPanel.status.exportStereo'):useRingFirst.value?t('shaderExpmapPanel.status.exportRings'):t('shaderExpmapPanel.status.exportFrames');unitKey.value='shaderExpmapPanel.units.frames'
        const writable=await file.createWritable()
        let result
        try {
          const request={encoding:{...encoding.value},dynamicRange:dynamicRange.value,hdrExposure:hdrExposure.value,hdrQuantizer:hdrQuantizer.value,stereo:{...stereo.value},window:{...window.value},width:outputWidth.value,height:outputHeight.value,fps:fps.value,codec:codec.value,maxSamples:samples.value,effects,
            destination:{kind:'stream' as const,writable:writable as unknown as WritableStream<Uint8Array>},signal:abort!.signal,gpuRenderer:renderer,onWarning:(message:string)=>{hdrWarning.value=message},onProgress:(a:number,b:number)=>{done.value=a;total.value=b}}
          result=useRingFirst.value?await exportShaderRingVideo({manifest:videoSource.value},{...request,hardSignal:hardAbort!.signal,scratch:scratchDirectory,keepIntermediates:keepRings.value,intermediateBitrate:ringBitrateMbps.value*1e6,
            onPhase:(phase,a,b)=>{status.value=phase;done.value=a;total.value=b}}):await exportExpmapVideo({manifest:videoSource.value},request)
        }catch(error){await writable.abort().catch(()=>{});throw error}
        status.value=result.cancelled?(result.framesEmitted>0?t('shaderExpmapPanel.status.videoInterruptedFrames',{count:result.framesEmitted}):t('shaderExpmapPanel.status.videoInterrupted')):t('shaderExpmapPanel.status.videoSaved')
        if(browserStorage&&result.framesEmitted>0){if(videoUrl.value)URL.revokeObjectURL(videoUrl.value);videoUrl.value=URL.createObjectURL(await file.getFile());videoName.value=`${doc.manifest.name}-shader${stereo.value.enabled?(stereo.value.layout==='top-bottom'?'-half-ou':'-half-sbs'):''}.mp4`}
      } else {
        status.value=t('shaderExpmapPanel.status.reconstructing');unitKey.value='shaderExpmapPanel.units.blocks'
        renderer.onProgress=(a,b)=>{done.value=a;total.value=b}
        const w=Math.min(outputWidth.value,960),h=Math.max(1,Math.round(w*outputHeight.value/outputWidth.value))
        const view={width:w,height:h,scale:props.videoOnly?window.value.fromScale:previewScale.value,angle:props.videoOnly?window.value.fromAngle:angle.value*Math.PI/180,allowUpscale:true,maxSamples:samples.value,effectTime:0,effects}
        const result=props.videoOnly&&stereo.value.enabled?await renderer.renderStereo(view,stereo.value,abort!.signal):await renderer.render(view,abort!.signal)
        if(preview.value) {preview.value.width=w;preview.value.height=h;preview.value.getContext('2d')!.drawImage(result,0,0)}
        status.value=t('shaderExpmapPanel.status.previewDone')
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
  <DenseSection :title="videoOnly ? t('shaderExpmapPanel.titleVideo') : t('shaderExpmapPanel.title')" class="shader-panel">
    <p class="hint">{{ t('shaderExpmapPanel.intro') }}</p>
    <fieldset :disabled="expmapBusy">
      <details v-if="!videoOnly" open><summary>{{ t('shaderExpmapPanel.create.summary') }}</summary>
        <DenseField v-model="radialDensity" :label="t('shaderExpmapPanel.create.radialDensity')" :min="1" :max="64" :step="1" :default="DEFAULT_SHADER_PREFERENCES.radialDensity"/>
        <p v-if="estimate" class="hint">{{ t('shaderExpmapPanel.create.estimate', { gb: (estimate.rawBytes/1e9).toFixed(2), blocks: estimate.blocks }) }}</p>
        <button class="primary" :disabled="!plan" @click="create()">{{ t('shaderExpmapPanel.create.button') }}</button>
      </details>
      <details :open="!videoOnly || !source"><summary>{{ t('shaderExpmapPanel.archives.summary') }}</summary>
        <p v-if="quota" class="hint">{{ t('shaderExpmapPanel.archives.quota', { used: (quota.usage/1e9).toFixed(2), total: (quota.quota/1e9).toFixed(0) }) }}<template v-if="archivesBytes">{{ t('shaderExpmapPanel.archives.quotaArchives', { size: gigabytes(archivesBytes) }) }}</template>.</p>
        <div class="toolbar"><button @click="importArchive">{{ t('shaderExpmapPanel.archives.import') }}</button><button @click="attach">{{ t('shaderExpmapPanel.archives.openFolder') }}</button></div>
        <p v-if="!recent.length" class="hint">{{ t('shaderExpmapPanel.archives.empty') }}</p>
        <div v-for="entry in recent" :key="entry.id" class="entry" :class="{selected:source?.manifest.id===entry.id}">
          <button class="entry-open" @click="openRecent(entry)">{{ entry.name }} · {{ entry.archive?t('shaderExpmapPanel.archives.kindArchive'):t('shaderExpmapPanel.archives.kindFolder') }} · {{ entry.state==='complete'?t('shaderExpmapPanel.archives.ready'):t('shaderExpmapPanel.archives.toResume') }}<template v-if="sizes[entry.id]!=null"> · {{ gigabytes(sizes[entry.id]!) }}</template></button>
          <button v-if="!videoOnly" @click="forget(entry.id)">{{ t('shaderExpmapPanel.archives.forget') }}</button>
          <button v-if="!videoOnly && entry.archive" @click="removeArchive(entry)">{{ t('shaderExpmapPanel.archives.delete') }}</button>
        </div>
      </details>
      <template v-if="source">
        <p><strong>{{ source.manifest.name }}</strong> · {{ t('shaderExpmapPanel.source.blocks', { done: source.manifest.completed, total: source.manifest.total }) }}</p>
        <p v-if="videoOnly && source.manifest.state!=='complete'" class="hint">{{ t('shaderExpmapPanel.source.completeFirst') }}</p>
        <button v-else-if="source.manifest.state!=='complete'" class="primary" @click="create(true)">{{ t('shaderExpmapPanel.source.resume') }}</button>
        <template v-if="source.manifest.state==='complete'">
          <div v-if="!videoOnly" class="toolbar">
            <button class="primary" @click="useVideo">{{ t('shaderExpmapPanel.source.video') }}</button>
            <button v-if="source.archive" @click="exportArchive">{{ t('shaderExpmapPanel.source.exportArchive') }}</button>
            <button v-else @click="archiveDirectory">{{ t('shaderExpmapPanel.source.convert') }}</button>
          </div>
          <details open><summary>{{ videoOnly ? t('shaderExpmapPanel.playback.summaryVideo') : t('shaderExpmapPanel.playback.summary') }}</summary>
            <DenseField v-model="budgetMiB" :label="t('shaderExpmapPanel.playback.budget')" :min="64" :max="16384" :step="64" :default="DEFAULT_SHADER_PREFERENCES.budgetMiB"/>
            <small>{{ t('shaderExpmapPanel.playback.budgetHint') }}</small>
            <p v-if="memory" class="hint">{{ t('shaderExpmapPanel.playback.memory', { octaves: memory.usefulOctaves, mode: memory.subdivided?t('shaderExpmapPanel.playback.memoryBlocks'):t('shaderExpmapPanel.playback.memoryOctaves') }) }}</p>
            <DenseSelect :model-value="interpolation" :label="t('shaderExpmapPanel.playback.interpolation')" :options="interpolationOptions" @update:model-value="interpolation=$event==='nearest'?'nearest':'bilinear'"/>
            <DenseSelect :model-value="sampleDistribution" :label="t('shaderExpmapPanel.playback.distribution')" :options="distributionOptions" @update:model-value="sampleDistribution=$event==='r2'?'r2':'grid'"/>
            <DenseSelect :model-value="samples" :label="t('shaderExpmapPanel.playback.samples')" :options="SHADER_SAMPLE_CHOICES.map(n=>({value:n,label:String(n)}))" @update:model-value="samples=Number($event)"/>
            <template v-if="!videoOnly">
            <label>{{ t('shaderExpmapPanel.playback.previewScale') }} <input v-model="previewScale"></label>
            <DenseField v-model="angle" :label="t('shaderExpmapPanel.playback.previewAngle')" :min="-36000" :max="36000" :step="1" :default="0"/>
            </template>
            <ExpmapEffectsControls :document-id="source.manifest.id" :tile-count="planExpmapOctaves(source.manifest.projection).tileCount"/>
            <button v-if="!videoOnly" @click="render()">{{ t('shaderExpmapPanel.playback.refresh') }}</button>
            <canvas v-if="!videoOnly" ref="preview" class="preview"/>
          </details>
          <details v-if="videoOnly && window" open><summary>{{ t('shaderExpmapPanel.video.summary') }}</summary>
            <label>{{ t('shaderExpmapPanel.video.start') }} <input v-model="window.fromScale" @change="updateWindow"></label>
            <label>{{ t('shaderExpmapPanel.video.end') }} <input v-model="window.toScale" @change="updateWindow"></label>
            <DenseField v-model="window.durationSeconds" :label="t('shaderExpmapPanel.video.duration')" :min="0.1" :max="86400" :step="1" :default="20" @update:model-value="updateWindow"/>
            <DenseSelect v-model="window.easeIn" :label="t('shaderExpmapPanel.video.easeIn')" :options="easeOptions" @update:model-value="updateWindow"/>
            <DenseField v-if="window.easeIn!=='none'" v-model="window.easeInSeconds" :label="t('shaderExpmapPanel.video.easeInSeconds')" :min="0" :max="window.durationSeconds" :step="0.1" :default="DEFAULT_EXPMAP_MOTION.easeInSeconds" @update:model-value="updateWindow"/>
            <DenseSelect v-model="window.easeOut" :label="t('shaderExpmapPanel.video.easeOut')" :options="easeOptions" @update:model-value="updateWindow"/>
            <DenseField v-if="window.easeOut!=='none'" v-model="window.easeOutSeconds" :label="t('shaderExpmapPanel.video.easeOutSeconds')" :min="0" :max="window.durationSeconds" :step="0.1" :default="DEFAULT_EXPMAP_MOTION.easeOutSeconds" @update:model-value="updateWindow"/>
            <DenseField v-model="window.holdSeconds" :label="t('shaderExpmapPanel.video.hold')" :min="0" :max="86400" :step="0.1" :default="DEFAULT_EXPMAP_MOTION.holdSeconds"/>
            <DenseField v-model="window.fromAngle" :label="t('shaderExpmapPanel.video.fromAngle')" :min="-100000" :max="100000" :step="0.1" :default="0"/>
            <DenseField v-model="window.toAngle" :label="t('shaderExpmapPanel.video.toAngle')" :min="-100000" :max="100000" :step="0.1" :default="0"/>
            <ResolutionSelect :width="outputWidth" :height="outputHeight" :min="16" :max="3840" :step="2" @update:width="outputWidth=$event" @update:height="outputHeight=$event"/>
            <DenseSelect :model-value="fps" :label="t('shaderExpmapPanel.video.fps')" :options="[24,25,30,60].map(n=>({value:n,label:`${n} fps`}))" @update:model-value="fps=Number($event)"/>
            <DenseSelect v-model="dynamicRange" :label="t('shaderExpmapPanel.video.dynamicRange')" :options="dynamicRangeOptions"/>
            <template v-if="dynamicRange==='hdr'">
              <DenseField v-model="hdrExposure" :label="t('shaderExpmapPanel.video.hdrExposure')" :min="-16" :max="16" :step="0.5" :default="0"/>
              <DenseField v-if="encoding.profile==='quantizer'" v-model="hdrQuantizer" :label="t('shaderExpmapPanel.video.quantizer')" :min="0" :max="codec==='hevc'?51:63" :step="1" :default="10"/>
              <p class="hint">{{ t('shaderExpmapPanel.video.hdrHint') }}</p>
              <p v-if="!memory" role="alert">{{ t('shaderExpmapPanel.video.budgetInsufficient') }}</p>
            </template>
            <DenseSelect v-model="codec" :label="t('shaderExpmapPanel.video.codec')" :options="(dynamicRange==='hdr'?MP4_CODECS.filter(c=>c.value!=='avc'):MP4_CODECS).map(c => ({ value: c.value, label: t(c.labelKey) }))"/>
            <VideoEncodingControls v-model="encoding" :codec="codec" :width="outputWidth" :height="outputHeight" :fps="fps" :duration="window.durationSeconds + window.holdSeconds" :hdr="dynamicRange==='hdr'"/>
            <label><input type="checkbox" v-model="stereo.enabled">{{ t('shaderExpmapPanel.video.stereo') }}</label>
            <template v-if="stereo.enabled">
              <DenseSelect v-model="stereo.layout" :label="t('shaderExpmapPanel.video.layout')" :options="layoutOptions"/>
              <DenseField v-model="stereo.strength" :label="t('shaderExpmapPanel.video.stereoStrength')" :min="0" :max="3" :step="0.1" :default="1"/>
              <p class="hint">{{ t('shaderExpmapPanel.video.stereoHint', { eyes: stereo.layout==='top-bottom'?t('shaderExpmapPanel.video.eyesTopBottom'):t('shaderExpmapPanel.video.eyesSideBySide'), layout: stereo.layout==='top-bottom'?'Half Over-Under':'Half SBS' }) }}</p>
              <p class="hint">{{ t('shaderExpmapPanel.video.stereoCost') }}</p>
              <p v-if="!memory" role="alert">{{ t('shaderExpmapPanel.video.stereoBudgetInsufficient') }}</p>
              <button @click="render()">{{ t('shaderExpmapPanel.video.stereoPreview') }}</button>
              <canvas ref="preview" class="preview"/>
            </template>
            <DenseSelect v-if="!stereo.enabled&&dynamicRange!=='hdr'" :model-value="ringFirst?'ring':'frame'" :label="t('shaderExpmapPanel.video.order')" :options="orderOptions" @update:model-value="ringFirst=$event==='ring'"/>
            <template v-if="useRingFirst">
              <DenseField v-if="!ringEstimate?.direct" v-model="ringBitrateMbps" :label="t('shaderExpmapPanel.video.ringBitrate')" :min="1" :max="500" :step="1" :default="DEFAULT_SHADER_PREFERENCES.ringBitrateMbps"/>
              <p v-if="ringEstimate?.direct" class="hint">{{ t('shaderExpmapPanel.video.ringDirect') }}</p>
              <p v-else-if="ringEstimate" class="hint">{{ t('shaderExpmapPanel.video.ringEstimate', { passes: ringEstimate.passes, octaves: ringEstimate.octaves, gb: (ringEstimate.bytes/1e9).toFixed(2) }) }}</p>
              <p v-else role="alert">{{ t('shaderExpmapPanel.video.ringBudgetInsufficient') }}</p>
              <small v-if="!ringEstimate?.direct">{{ t('shaderExpmapPanel.video.ringDetail') }}</small>
              <label><input type="checkbox" v-model="keepRings">{{ t('shaderExpmapPanel.video.keepRings') }}</label>
            </template>
            <div class="toolbar">
              <button class="primary" :disabled="(useRingFirst&&!ringEstimate)||((stereo.enabled||dynamicRange==='hdr')&&!memory)" @click="render(true)">{{ t('shaderExpmapPanel.video.export') }}</button>
              <button :disabled="(useRingFirst&&!ringEstimate)||((stereo.enabled||dynamicRange==='hdr')&&!memory)" @click="render(true,true)">{{ t('shaderExpmapPanel.video.exportBrowser') }}</button>
            </div>
          </details>
        </template>
      </template>
    </fieldset>
    <RenderProgress v-if="status" :label="status" :done="done" :total="total" :unit="unit" :active="ownBusy"/>
    <div v-if="ownBusy" class="toolbar">
      <button v-if="!interrupting" @click="interrupting=true;abort?.abort()">{{ t('shaderExpmapPanel.interruptKeep') }}</button>
      <template v-else><small>{{ t('shaderExpmapPanel.finalizing') }}</small><button v-if="useRingFirst" @click="hardAbort?.abort()">{{ t('shaderExpmapPanel.abandon') }}</button></template>
    </div>
    <p v-if="hdrWarning" role="status">{{ hdrWarning }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <a v-if="videoUrl" :href="videoUrl" :download="videoName">{{ t('shaderExpmapPanel.download', { name: videoName }) }}</a>
  </DenseSection>
</template>
<style scoped>
.shader-panel{font-size:12px}fieldset{border:0;padding:0;display:grid;gap:6px;min-width:0}details{display:grid;gap:6px;padding:4px 0}summary{cursor:pointer;font-weight:600;opacity:.85}label{display:flex;justify-content:space-between;align-items:center;gap:6px}input{max-width:60%;background:var(--row);border:1px solid var(--line);color:inherit;border-radius:4px;padding:3px}label>input[type=checkbox]{max-width:none}button{padding:5px;background:var(--row-on);color:var(--ink);border:1px solid var(--line);border-radius:4px;cursor:pointer}button.primary{background:#2563eb;border-color:#60a5fa;color:#fff;font-weight:600}.toolbar{display:flex;flex-wrap:wrap;gap:4px}.entry{display:flex;gap:4px;align-items:stretch}.entry-open{flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.entry.selected .entry-open{border-color:var(--accent)}p{margin:6px 0}.hint,small{opacity:.7;line-height:1.5}.preview{width:100%;height:auto;max-height:65vh;object-fit:contain;display:block}.preview:not([width]){display:none}p[role=alert]{color:var(--red)}
button:disabled{opacity:.45;cursor:default}button:not(:disabled):hover{border-color:var(--accent)}
</style>
