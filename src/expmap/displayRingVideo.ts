import { ALL_FORMATS, BlobSource, Input, Quality, VideoSampleSink, canDecodeVideo, canEncodeVideo } from 'mediabunny'
import { canonicalJson, contentIdentity } from './appearance'
import { expmapVideoFrameView, exportExpmapVideo, validateExpmapVideoWindow, type ExpmapVideoSource } from './video'
import { effectsSettings } from './effects'
import { motionSettings } from './motion'
import { totalFramesFor } from '../videoExportSession'
import { createVideoSink, probeMp4Codecs } from '../videoEncoderSink'
import { validateExpmapView } from './renderer'
import { ShaderExpmapRenderer, planShaderMemory } from './displayRenderer'
import { planShaderRings } from './displayRings'
import { RingMediaStore, ringVideoBitrate, ringVideoRect } from './displayRingMedia'
import { RingVideoGpu } from './displayRingVideoGpu'

type Request=Omit<Parameters<typeof exportExpmapVideo>[1],'gpuRenderer'>&{
  gpuRenderer:ShaderExpmapRenderer; scratch:FileSystemDirectoryHandle; keepIntermediates?:boolean
  intermediateBitrate?:number
  onPhase?:(phase:string,done:number,total:number)=>void
}

export async function exportShaderRingVideo(source:{manifest:ExpmapVideoSource},request:Request) {
  request={...request,window:{...request.window},effects:effectsSettings(request.effects)}
  const {gpuRenderer:renderer,signal}=request,m=renderer.manifest
  validateExpmapVideoWindow(source.manifest,request.window,request.effects)
  const duration=request.window.durationSeconds+motionSettings(request.window).holdSeconds
  const total=totalFramesFor({fps:request.fps,durationSeconds:duration})
  if(!Number.isFinite(request.fps)||request.fps<=0||request.fps>240||!Number.isSafeInteger(total)||total<1||total>10_000_000)throw new Error('Durée ou cadence hors limites')
  const viewAt=(frame:number)=>expmapVideoFrameView(request,frame,total,duration)
  validateExpmapView(m.projection,viewAt(0))
  if(!(await probeMp4Codecs(request.width,request.height,request.fps))[request.codec])throw new Error('Codec indisponible pour cette résolution')
  // GPU capture + one compressed coverage plane, color encode and transfers.
  const reserve=request.width*request.height*32
  const memory=planShaderMemory(m,request.width,request.height,renderer.budgetBytes,reserve)
  const rings=planShaderRings(m,memory.cacheBytes,memory.usefulOctaves)
  const rects=rings.map(ring=>ringVideoRect(m,viewAt(0),ring))
  const bitrates=rects.map(rect=>ringVideoBitrate(rect,request.width,request.height,request.intermediateBitrate??60e6))
  const checked=new Set<string>()
  for(let ring=0;ring<rings.length;ring++) {
    const rect=rects[ring],key=`${rect[2]}:${rect[3]}`
    if(checked.has(key))continue;checked.add(key);signal?.throwIfAborted()
    const encoding={width:rect[2],height:rect[3],framerate:request.fps,quality:new Quality({bitrate:bitrates[ring]}),hardwareAcceleration:'prefer-hardware' as const}
    if(!await canEncodeVideo(request.codec,encoding)||
      !await canDecodeVideo(request.codec,{codedWidth:rect[2],codedHeight:rect[3]}))throw new Error(`Codec indisponible pour une couronne ${rect[2]}×${rect[3]}`)
  }
  // Version isolates compressed videos from previous raw-frame checkpoints.
  const identity=await contentIdentity(new TextEncoder().encode(canonicalJson({version:3,source:m,
    appearance:renderer.appearance,window:request.window,width:request.width,height:request.height,
    fps:request.fps,maxSamples:request.maxSamples??16,effects:request.effects,codec:request.codec,bitrates,rings,rects})))
  const name=`couronnes-video-${identity.slice(7)}`
  return navigator.locks.request(name,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Cet export par couronnes est déjà en cours')
    const store=new RingMediaStore(await request.scratch.getDirectoryHandle(name,{create:true}))
    let next=await store.checkpoint(identity)
    if(next>rings.length)throw new Error('Checkpoint hors limites')
    const gpu=new RingVideoGpu(renderer.gpuDevice),previousReserve=renderer.workingReserveBytes
    renderer.workingReserveBytes=reserve
    const readers:Awaited<ReturnType<typeof openReader>>[]=[]
    async function openReader(ring:number) {
      const input=new Input({source:new BlobSource(await (await store.videoFile(ring)).getFile()),formats:ALL_FORMATS})
      try {
        const track=await input.getPrimaryVideoTrack()
        if(!track||!await track.canDecode())throw new Error('Couronne vidéo illisible')
        const sink=new VideoSampleSink(track,{optimizeForLatency:true})
        return {input,sink,samples:sink.samples()}
      }catch(error){input.dispose();throw error}
    }
    try {
      if(next)request.onPhase?.('Reprise des vidéos de couronnes terminées',next*total,rings.length*total)
      for(let ring=next;ring<rings.length;ring++) {
        signal?.throwIfAborted()
        const rect=rects[ring],writer=await (await store.videoFile(ring,true)).createWritable()
        let sink:Awaited<ReturnType<typeof createVideoSink>>|undefined
        try {
          sink=await createVideoSink({width:rect[2],height:rect[3],fps:request.fps,codec:request.codec,
            quality:new Quality({bitrate:bitrates[ring]}),hardwareAcceleration:'prefer-hardware',
            destination:{kind:'stream',writable:writer as unknown as WritableStream<Uint8Array>}})
          for(let frame=0;frame<total;frame++) {
            signal?.throwIfAborted()
            const texture=await renderer.renderRingTexture(viewAt(frame),rings[ring],rect,signal)
            const captured=await gpu.capture(texture,rect,signal)
            // Construct before awaiting disk I/O: canvas contents belong to this frame.
            const videoFrame=new VideoFrame(captured.canvas,{timestamp:Math.round(frame*1e6/request.fps),duration:Math.round(1e6/request.fps)})
            try {await store.writeMask(ring,frame,rect,captured.alpha);await sink.addFrame(videoFrame)}
            finally{videoFrame.close()}
            request.onPhase?.(`Encodage des couronnes · ${ring+1}/${rings.length}`,ring*total+frame+1,rings.length*total)
          }
          await sink.finalize()
          await store.checkpoint(identity,ring+1);next=ring+1
        }catch(error){await sink?.cancel().catch(()=>{});await writer.abort().catch(()=>{});throw error}
      }
      // Source cache is no longer needed during video decoding and composition.
      renderer.releaseSourceCache()
      // A bounded number of decoded frames per stream; use one stream at a time
      // when many full-screen angular subdivisions would exceed the budget.
      const decodedBytes=rects.reduce((sum,r)=>sum+r[2]*r[3]*40,0)
      const sequential=decodedBytes+reserve+request.width*request.height*12+16*1048576<=renderer.budgetBytes
      if(sequential)for(let ring=0;ring<rings.length;ring++) {
        try{readers.push(await openReader(ring))}
        catch(error){await store.checkpoint(identity,ring);throw error}
      }
      let frame=0
      const result=await exportExpmapVideo(source,{...request,gpuRenderer:{render:async view=>{
        const current=frame++
        async function* parts() {
          for(let ring=0;ring<rings.length;ring++) {
            signal?.throwIfAborted()
            let temporary:Awaited<ReturnType<typeof openReader>>|undefined
            try {
              const reader=readers[ring]??(temporary=await openReader(ring))
              const timestamp=Math.round(current*1e6/request.fps)/1e6
              const sample=sequential?(await reader.samples.next()).value:await reader.sink.getSample(timestamp+0.0000001)
              if(!sample||Math.abs(sample.timestamp-timestamp)>0.00001)throw new Error('Frame de couronne manquante ou désynchronisée')
              try {
                const alpha=await store.readMask(ring,current,rects[ring],signal),videoFrame=sample.toVideoFrame()
                try {
                  const part=await gpu.restore(videoFrame,alpha,rects[ring])
                  try{yield part}finally{part.texture.destroy()}
                }finally{videoFrame.close()}
              }finally{sample.close()}
            }catch(error){
              if(!signal?.aborted)await store.checkpoint(identity,Math.min(next,ring))
              throw error
            }finally{if(temporary){await temporary.samples.return().catch(()=>{});temporary.input.dispose()}}
          }
        }
        return renderer.composeRings(view,parts(),signal)
      }},onProgress:(done,count)=>{request.onProgress?.(done,count);request.onPhase?.('Décodage, assemblage et encodage final',done,count)}})
      for(const reader of readers){await reader.samples.return().catch(()=>{});reader.input.dispose()}
      readers.length=0
      if(!result.cancelled&&!request.keepIntermediates) {
        request.onPhase?.('Suppression des vidéos intermédiaires consommées',total,total)
        await store.cleanupVideos(rings.length,total)
      }
      return result
    }finally{
      for(const reader of readers){await reader.samples.return().catch(()=>{});reader.input.dispose()}
      gpu.dispose();renderer.workingReserveBytes=previousReserve
    }
  })
}
