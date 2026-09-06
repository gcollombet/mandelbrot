import shader from '../assets/expmap_reconstruct.wgsl?raw'
import { scaleDoublements } from './decimal'
import { validateExpmapView, type ExpmapView } from './renderer'
import type { ExpmapManifest } from './manifest'
import type { ExpmapDirectoryStore } from './store'
import { EXPMAP_RESIDENT_TILES, octaveWindow } from './octaves'
import { decodeTiffTile, MAX_TIFF_TILE_BYTES } from './tiff'
import { ExpmapTileCache } from './tileCache'

/** A single filtered draw; disk/decode/upload occurs only on a tile cache miss. */
export class ExpmapGpuRenderer {
  readonly canvas: OffscreenCanvas
  private device: GPUDevice
  private ownDevice: boolean
  private manifest: ExpmapManifest
  private context: GPUCanvasContext
  private pipeline!: GPURenderPipeline
  private uniform!: GPUBuffer
  private texture!: GPUTexture
  private bound!: GPUBindGroup
  private cache!: ExpmapTileCache
  private disposed=false
  private busy=false
  private previousDepth=0
  private constructor(device:GPUDevice, ownDevice:boolean, manifest:ExpmapManifest) {
    this.device=device; this.ownDevice=ownDevice; this.manifest=manifest
    this.canvas=new OffscreenCanvas(1,1); this.context=this.canvas.getContext('webgpu')!
    if(!this.context) throw new Error('Canvas WebGPU indisponible')
  }
  static async create(store:ExpmapDirectoryStore, manifest:ExpmapManifest, existingDevice?:GPUDevice) {
    if(manifest.state!=='complete') throw new Error('Un document complet est requis')
    const adapter=existingDevice ? undefined : await navigator.gpu?.requestAdapter()
    const device=existingDevice ?? await adapter?.requestDevice({requiredLimits:{maxTextureDimension2D:adapter.limits.maxTextureDimension2D}})
    if(!device) throw new Error('WebGPU requis pour ExpMap')
    let renderer:ExpmapGpuRenderer|undefined
    try { renderer=new ExpmapGpuRenderer(device,!existingDevice,manifest); await renderer.initialize(store); return renderer }
    catch(error) { if(renderer) renderer.dispose(); else if(!existingDevice) device.destroy(); throw error }
  }
  private async initialize(store:ExpmapDirectoryStore) {
    const d=this.device, o=this.manifest.octaves, bytes=o.tileWidth*o.tileHeight*4
    if(bytes>MAX_TIFF_TILE_BYTES || Math.max(o.tileWidth,o.tileHeight)>d.limits.maxTextureDimension2D || d.limits.maxTextureArrayLayers<EXPMAP_RESIDENT_TILES) throw new Error('Les 14 tuiles dépassent les capacités de ce GPU. Recréer le document avec une résolution ou densité inférieure.')
    const module=d.createShaderModule({code:shader})
    this.pipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba8unorm'}]},primitive:{topology:'triangle-list'}})
    d.pushErrorScope('out-of-memory'); d.pushErrorScope('validation')
    this.texture=d.createTexture({size:[o.tileWidth,o.tileHeight,EXPMAP_RESIDENT_TILES],format:'rgba8unorm-srgb',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST})
    const validation=await d.popErrorScope(), memory=await d.popErrorScope()
    if(validation || memory) throw new Error(`Allocation ExpMap (${(bytes*14/1073741824).toFixed(2)} GiB) impossible : ${(validation??memory)!.message}`)
    this.uniform=d.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})
    this.bound=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},
      {binding:1,resource:this.texture.createView({dimension:'2d-array'})},{binding:2,resource:d.createSampler({minFilter:'linear',magFilter:'linear'})}]})
    this.cache=new ExpmapTileCache(async index=>decodeTiffTile(await store.readTile(this.manifest.tiles[index]),bytes),
      (slot,rgba)=>d.queue.writeTexture({texture:this.texture,origin:[0,0,slot]},rgba as Uint8Array<ArrayBuffer>,{bytesPerRow:o.tileWidth*4,rowsPerImage:o.tileHeight},[o.tileWidth,o.tileHeight,1]))
    this.context.configure({device:d,format:'rgba8unorm',alphaMode:'opaque',colorSpace:'srgb'})
  }
  async render(view:ExpmapView, signal?:AbortSignal):Promise<OffscreenCanvas> {
    if(this.disposed || this.busy) throw new Error('Lecteur fermé ou déjà occupé')
    validateExpmapView(this.manifest.projection,view); signal?.throwIfAborted(); this.busy=true
    try {
      const plan=this.manifest.projection, o=this.manifest.octaves
      const depth=scaleDoublements(plan.domain.startScale,view.scale)
      const window=octaveWindow(depth,o.tileCount,depth>=this.previousDepth?1:-1); this.previousDepth=depth
      await this.cache.prepare(window.needed,window.prefetch,signal)
      signal?.throwIfAborted(); if(this.disposed) throw new Error('Lecteur fermé')
      if(this.canvas.width!==view.width) this.canvas.width=view.width
      if(this.canvas.height!==view.height) this.canvas.height=view.height
      const base=Math.floor(depth), center=this.manifest.center!
      this.device.queue.writeBuffer(this.uniform,0,new Float32Array([view.width,view.height,plan.height,plan.radius,
        depth-base,view.angle,o.angularSamples,o.rowsPerOctave,o.tileWidth,o.tileHeight,o.halo,base%14,
        center[0]/255,center[1]/255,center[2]/255,1]))
      const commands=this.device.createCommandEncoder()
      const pass=commands.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]})
      pass.setPipeline(this.pipeline); pass.setBindGroup(0,this.bound); pass.draw(3); pass.end()
      this.device.queue.submit([commands.finish()]); await this.device.queue.onSubmittedWorkDone()
      signal?.throwIfAborted(); this.cache.prefetch(window.prefetch)
      return this.canvas
    } finally { this.busy=false }
  }
  dispose() { if(this.disposed)return; this.disposed=true; this.cache?.dispose(); this.texture?.destroy(); this.uniform?.destroy(); this.context?.unconfigure(); if(this.ownDevice)this.device.destroy() }
}
