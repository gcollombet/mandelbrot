import { fixedMirrorWindow, radialConfig, radialOctave, type RadialConfig } from './radial'
import { expmapEffectsUniform, expmapImageRotation } from './effects'
import shader from '../assets/expmap_reconstruct.wgsl?raw'
import { scaleDoublements } from './decimal'
import { expmapFilterUniform, validateExpmapView, type ExpmapView } from './renderer'
import type { ExpmapManifest } from './manifest'
import type { ExpmapStore } from './store'
import { EXPMAP_RESIDENT_TILES, octaveWindow } from './octaves'
import { MAX_TILE_BYTES } from './imageLimits'
import { ExpmapImageReader } from './imageReader'
import { uploadExpmapBands } from './tileUpload'
import { expmapReadAhead } from './loadingMetrics'
import { ExpmapTileCache } from './tileCache'

/** A single filtered draw; disk/decode/upload occurs only on a tile cache miss. */
export class ExpmapGpuRenderer {
  onVerificationError?:(error:Error)=>void
  readonly canvas: OffscreenCanvas
  private device: GPUDevice
  private ownDevice: boolean
  private manifest: ExpmapManifest
  private context: GPUCanvasContext
  private pipeline!: GPURenderPipeline
  private uniform!: GPUBuffer
  private texture!: GPUTexture
  private bound!: GPUBindGroup
  private reader?:ExpmapImageReader
  private cache!: ExpmapTileCache<ImageBitmap>
  private disposed=false
  private busy=false
  private previousDepth=0
  private previousTime=0
  private loadLatencyMs=100
  get loadingMetrics() { return this.reader?.metrics.snapshot() }
  private radial: RadialConfig
  private radialKey=''
  private constructor(device:GPUDevice, ownDevice:boolean, manifest:ExpmapManifest) {
    this.device=device; this.ownDevice=ownDevice; this.manifest=manifest; this.radial=radialConfig(undefined,manifest.octaves.tileCount)
    this.canvas=new OffscreenCanvas(1,1); this.context=this.canvas.getContext('webgpu')!
    if(!this.context) throw new Error('Canvas WebGPU indisponible')
  }
  static async create(store:ExpmapStore, manifest:ExpmapManifest, existingDevice?:GPUDevice) {
    if(manifest.state!=='complete') throw new Error('Un document complet est requis')
    const adapter=existingDevice ? undefined : await navigator.gpu?.requestAdapter()
    const device=existingDevice ?? await adapter?.requestDevice({requiredLimits:{maxTextureDimension2D:adapter.limits.maxTextureDimension2D}})
    if(!device) throw new Error('WebGPU requis pour ExpMap')
    let renderer:ExpmapGpuRenderer|undefined
    try { renderer=new ExpmapGpuRenderer(device,!existingDevice,manifest); await renderer.initialize(store); return renderer }
    catch(error) { if(renderer) renderer.dispose(); else if(!existingDevice) device.destroy(); throw error }
  }
  private async initialize(store:ExpmapStore) {
    const d=this.device, o=this.manifest.octaves, bytes=o.tileWidth*o.tileHeight*4
    if(bytes>MAX_TILE_BYTES || Math.max(o.tileWidth,o.tileHeight)>d.limits.maxTextureDimension2D || d.limits.maxTextureArrayLayers<EXPMAP_RESIDENT_TILES) throw new Error('Les 14 tuiles dépassent les capacités de ce GPU. Recréer le document avec une résolution ou densité inférieure.')
    const module=d.createShaderModule({code:shader})
    this.pipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba8unorm'}]},primitive:{topology:'triangle-list'}})
    d.pushErrorScope('out-of-memory'); d.pushErrorScope('validation')
    this.texture=d.createTexture({size:[o.tileWidth,o.tileHeight,EXPMAP_RESIDENT_TILES],format:'rgba8unorm-srgb',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT})
    const validation=await d.popErrorScope(), memory=await d.popErrorScope()
    if(validation || memory) throw new Error(`Allocation ExpMap (${(bytes*14/1073741824).toFixed(2)} GiB) impossible : ${(validation??memory)!.message}`)
    this.uniform=d.createBuffer({size:176,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})
    this.bound=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},
      {binding:1,resource:this.texture.createView({dimension:'2d-array'})},{binding:2,resource:d.createSampler({minFilter:'linear',magFilter:'linear'})}]})
    this.reader=await ExpmapImageReader.create(store,this.manifest.documentId)
    this.reader.onVerificationError=error=>this.onVerificationError?.(error)
    this.cache=new ExpmapTileCache((index,signal)=>this.reader!.read(radialOctave(index,this.radial).source,signal),
      async(slot,bitmap,context)=>{
        const started=performance.now()
        await uploadExpmapBands(o.tileWidth,o.tileHeight,context,async(y,rows)=>{
        d.queue.copyExternalImageToTexture({source:bitmap,origin:[0,y]},
          {texture:this.texture,origin:[0,y,slot],colorSpace:'srgb'},[o.tileWidth,rows,1])
      },undefined,()=>d.queue.onSubmittedWorkDone())
        this.reader!.metrics.record('upload',performance.now()-started)
      },bitmap=>bitmap.close(),{
        key:index=>radialOctave(index,this.radial).source,
        copy:async(from,to)=>{
          const commands=d.createCommandEncoder()
          commands.copyTextureToTexture({texture:this.texture,origin:[0,0,from]},
            {texture:this.texture,origin:[0,0,to]},[o.tileWidth,o.tileHeight,1])
          d.queue.submit([commands.finish()]);await d.queue.onSubmittedWorkDone()
        }
      })
    this.context.configure({device:d,format:'rgba8unorm',alphaMode:'opaque',colorSpace:'srgb'})
  }
  /** Update priorities immediately, even while an older render awaits a tile. */
  prioritize(view:ExpmapView) {
    if(this.disposed)return
    const depth=scaleDoublements(this.manifest.projection.domain.startScale,view.scale)
    if(!Number.isFinite(depth) || depth<0 || depth>Number.MAX_SAFE_INTEGER-18)return
    const radial=radialConfig(view.effects,this.manifest.octaves.tileCount)
    if(JSON.stringify(radial)!==this.radialKey)this.cache.invalidate()
    const readDepth=radial.mode==='mirror'?fixedMirrorWindow(depth,radial.count,view.effects?.mirrorDepth).readDepth:depth
    const window=octaveWindow(readDepth,radial.count,depth>=this.previousDepth?1:-1,radial.mode!=='normal')
    this.cache.setWindow(window.needed,window.prefetch)
  }
  async render(view:ExpmapView, signal?:AbortSignal):Promise<OffscreenCanvas> {
    if(this.disposed || this.busy) throw new Error('Lecteur fermé ou déjà occupé')
    validateExpmapView(this.manifest.projection,view); signal?.throwIfAborted(); this.busy=true
    try {
      const plan=this.manifest.projection, o=this.manifest.octaves
      const depth=scaleDoublements(plan.domain.startScale,view.scale)
      if (!Number.isFinite(depth) || depth < 0 || depth > Number.MAX_SAFE_INTEGER - 18) throw new Error('Profondeur de lecture hors limites.')
      const radial=radialConfig(view.effects,o.tileCount), key=JSON.stringify(radial)
      if(key!==this.radialKey) { this.cache.invalidate(); this.radial=radial; this.radialKey=key }
      const active=radial.mode!=='normal'
      if(this.reader?.verificationError)throw this.reader.verificationError
      const now=performance.now(),delta=depth-this.previousDepth,direction=delta>=0?1:-1
      const anticipation=expmapReadAhead(delta,now-this.previousTime,this.loadLatencyMs)
      const mirror=radial.mode==='mirror'?fixedMirrorWindow(depth,o.tileCount,view.effects?.mirrorDepth):undefined
      const readDepth=mirror?.readDepth??depth
      const window=octaveWindow(readDepth,o.tileCount,direction,active)
      this.previousDepth=depth;this.previousTime=now
      const next=window.prefetch
      const ahead=next===undefined ? [] : Array.from({length:anticipation},(_,i)=>next+i*direction)
        .filter(i=>i>=0 && (active || i<o.tileCount)).map(i=>radialOctave(i,radial).source)
      const started=performance.now()
      const preparation=this.cache.prepare(window.needed,window.prefetch,signal)
      await preparation
      this.reader!.prefetch(ahead)
      this.reader!.metrics.record('wait',performance.now()-started)
      const measured=this.reader!.metrics.snapshot()
      this.loadLatencyMs=['read','hash','decode','upload'].reduce((sum,k)=>sum+(measured[k]?.lastMs??0),0) || 100
      signal?.throwIfAborted(); if(this.disposed) throw new Error('Lecteur fermé')
      if(this.canvas.width!==view.width) this.canvas.width=view.width
      if(this.canvas.height!==view.height) this.canvas.height=view.height
      const base=Math.floor(depth), readBase=Math.floor(readDepth), center=this.manifest.center!
      this.device.queue.writeBuffer(this.uniform,0,new Float32Array([view.width,view.height,plan.height,plan.radius,
        depth-base,view.angle+expmapImageRotation(view.effects,depth),o.angularSamples,o.rowsPerOctave,o.tileWidth,o.tileHeight,o.halo,readBase%14,
        center[0]/255,center[1]/255,center[2]/255,1,
        ...expmapFilterUniform(o,view.maxSamples ?? 1,active), ...expmapEffectsUniform(view.effects,base,depth,view.effectTime ?? 0),
        ...Array.from({length:16},(_,i)=>radialOctave(readBase+i,radial).reverse ? 1 : 0),
        mirror ? 1 : 0,view.effects?.mirrorDepth??1,mirror?.offset??0,0]))
      const commands=this.device.createCommandEncoder()
      const pass=commands.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]})
      pass.setPipeline(this.pipeline); pass.setBindGroup(0,this.bound); pass.draw(3); pass.end()
      this.device.queue.submit([commands.finish()]); await this.device.queue.onSubmittedWorkDone()
      signal?.throwIfAborted(); this.cache.prefetch(window.prefetch)
      return this.canvas
    } finally { this.busy=false }
  }
  dispose() { if(this.disposed)return; this.disposed=true; this.cache?.dispose();this.reader?.dispose(); this.texture?.destroy(); this.uniform?.destroy(); this.context?.unconfigure(); if(this.ownDevice)this.device.destroy() }
}
