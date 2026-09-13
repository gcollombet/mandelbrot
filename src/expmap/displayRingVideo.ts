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
  gpuRenderer:ShaderExpmapRenderer; scratch:FileSystemDirectoryHandle|(()=>Promise<FileSystemDirectoryHandle>); keepIntermediates?:boolean
  intermediateBitrate?:number
  /**
   * `signal` asks to stop gracefully: the ring being encoded is closed at the frame
   * reached, the remaining rings are rendered up to that frame only, and the final
   * video covers that playable prefix. `hardSignal` abandons without a file.
   */
  hardSignal?:AbortSignal
  onPhase?:(phase:string,done:number,total:number)=>void
}

export async function exportShaderRingVideo(source:{manifest:ExpmapVideoSource},request:Request) {
  request={...request,window:{...request.window},effects:effectsSettings(request.effects)}
  const {gpuRenderer:renderer,signal,hardSignal}=request,m=renderer.manifest
  // Frames to keep once a graceful interruption happened; undefined while running normally.
  let limit:number|undefined
  const live=()=>limit===undefined?signal:hardSignal
  const frames=()=>limit??total
  validateExpmapVideoWindow(source.manifest,request.window,request.effects)
  const duration=request.window.durationSeconds+motionSettings(request.window).holdSeconds
  const total=totalFramesFor({fps:request.fps,durationSeconds:duration})
  if(!Number.isFinite(request.fps)||request.fps<=0||request.fps>240||!Number.isSafeInteger(total)||total<1||total>10_000_000)throw new Error('Durée ou cadence hors limites')
  const viewAt=(frame:number)=>expmapVideoFrameView(request,frame,total,duration)
  validateExpmapView(m.projection,viewAt(0))
  if(!(await probeMp4Codecs(request.width,request.height,request.fps))[request.codec])throw new Error('Codec indisponible pour cette résolution')
  // GPU capture + one compressed coverage plane, color encode and transfers.
  const reserve=request.width*request.height*32
  const memory=planShaderMemory(m,request.width,request.height,renderer.budgetBytes,reserve,renderer.gpuDevice?.limits)
  const rings=planShaderRings(m,memory.cacheBytes,memory.usefulOctaves)
  if(rings.length===1&&!request.keepIntermediates) {
    signal?.throwIfAborted()
    request.onPhase?.('Rendu et encodage direct · une couronne',0,total)
    return exportExpmapVideo(source,{...request,gpuRenderer:renderer,onProgress:(done,count)=>{
      request.onProgress?.(done,count)
      request.onPhase?.('Rendu et encodage direct · une couronne',done,count)
    }})
  }
  const rects=rings.map(ring=>ringVideoRect(m,viewAt(0),ring))
  const bitrates=rects.map(rect=>ringVideoBitrate(rect,request.width,request.height,request.intermediateBitrate??100e6))
  const checked=new Set<string>()
  for(let ring=0;ring<rings.length;ring++) {
    const rect=rects[ring],key=`${rect[2]}:${rect[3]}`
    if(checked.has(key))continue;checked.add(key);signal?.throwIfAborted()
    const encoding={width:rect[2],height:rect[3],framerate:request.fps,quality:new Quality({bitrate:bitrates[ring]}),hardwareAcceleration:'prefer-hardware' as const}
    if(!await canEncodeVideo(request.codec,encoding)||
      !await canDecodeVideo(request.codec,{codedWidth:rect[2],codedHeight:rect[3]}))throw new Error(`Codec indisponible pour une couronne ${rect[2]}×${rect[3]}`)
  }
  // Version isolates compressed videos from previous raw-frame checkpoints.
  const identity=await contentIdentity(new TextEncoder().encode(canonicalJson({version:7,reconstruction:'window-v3',interpolation:renderer.interpolation??'bilinear',sampleDistribution:renderer.sampleDistribution??'grid',source:m,
    appearance:renderer.appearance,window:request.window,width:request.width,height:request.height,
    fps:request.fps,maxSamples:request.maxSamples??16,effects:request.effects,codec:request.codec,bitrates,rings,rects})))
  const name=`couronnes-video-${identity.slice(7)}`
  return navigator.locks.request(name,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Cet export par couronnes est déjà en cours')
    const scratch=typeof request.scratch==='function'?await request.scratch():request.scratch
    const store=new RingMediaStore(await scratch.getDirectoryHandle(name,{create:true}))
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
        live()?.throwIfAborted()
        const rect=rects[ring],writer=await (await store.videoFile(ring,true)).createWritable()
        let sink:Awaited<ReturnType<typeof createVideoSink>>|undefined
        try {
          sink=await createVideoSink({width:rect[2],height:rect[3],fps:request.fps,codec:request.codec,
            quality:new Quality({bitrate:bitrates[ring]}),hardwareAcceleration:'prefer-hardware',
            destination:{kind:'stream',writable:writer as unknown as WritableStream<Uint8Array>}})
          for(let frame=0;frame<frames();frame++) {
            hardSignal?.throwIfAborted()
            if(limit===undefined&&signal?.aborted) {
              // Nothing playable yet: no frame has every ring.
              if(frame===0)signal.throwIfAborted()
              limit=frame
              request.onPhase?.(`Interruption · finalisation des ${limit} premières images`,ring*limit,rings.length*limit)
              continue
            }
            const texture=await renderer.renderRingTexture(viewAt(frame),rings[ring],rect,live())
            const captured=await gpu.capture(texture,rect,live())
            // Construct before awaiting disk I/O: canvas contents belong to this frame.
            const videoFrame=new VideoFrame(captured.canvas,{timestamp:Math.round(frame*1e6/request.fps),duration:Math.round(1e6/request.fps)})
            try {await store.writeMask(ring,frame,rect,captured.alpha);await sink.addFrame(videoFrame)}
            finally{videoFrame.close()}
            request.onPhase?.(limit===undefined?`Encodage des couronnes · ${ring+1}/${rings.length}`:`Interruption · couronnes restantes ${ring+1}/${rings.length}`,ring*frames()+frame+1,rings.length*frames())
          }
          await sink.finalize()
          // A truncated ring must be re-rendered on resume: keep the checkpoint where it was.
          if(limit===undefined){await store.checkpoint(identity,ring+1);next=ring+1}
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
      const result=await exportExpmapVideo(source,{...request,signal:live(),frameLimit:limit,gpuRenderer:{render:async view=>{
        const current=frame++
        async function* parts() {
          for(let ring=0;ring<rings.length;ring++) {
            live()?.throwIfAborted()
            let temporary:Awaited<ReturnType<typeof openReader>>|undefined
            try {
              const reader=readers[ring]??(temporary=await openReader(ring))
              const timestamp=Math.round(current*1e6/request.fps)/1e6
              const sample=sequential?(await reader.samples.next()).value:await reader.sink.getSample(timestamp+0.0000001)
              if(!sample||Math.abs(sample.timestamp-timestamp)>0.00001)throw new Error('Frame de couronne manquante ou désynchronisée')
              try {
                const alpha=await store.readMask(ring,current,rects[ring],live()),videoFrame=sample.toVideoFrame()
                try {
                  const part=await gpu.restore(videoFrame,alpha,rects[ring])
                  try{yield part}finally{part.texture.destroy()}
                }finally{videoFrame.close()}
              }finally{sample.close()}
            }catch(error){
              if(!live()?.aborted)await store.checkpoint(identity,Math.min(next,ring))
              throw error
            }finally{if(temporary){await temporary.samples.return().catch(()=>{});temporary.input.dispose()}}
          }
        }
        return renderer.composeRings(view,parts(),live())
      }},onProgress:(done,count)=>{request.onProgress?.(done,count);request.onPhase?.(limit===undefined?'Décodage, assemblage et encodage final':`Interruption · assemblage des ${limit} premières images`,done,count)}})
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
