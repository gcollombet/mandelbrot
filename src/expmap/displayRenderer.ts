import { shaderRingBounds, type ShaderRing, type RingPixels, type RingRect } from './displayRings'
import { ShaderDrawBatch, SHADER_BATCH_BYTES } from './displayBatch'
import { shaderBlockScissor } from './displayScissor'
import { assertShaderAppearanceCompatible } from './displayCompatibility'
import type { Engine, RenderOptions } from '../Engine'
import blockShader from '../assets/expmap_shader_block.wgsl?raw'
import { shaderBlockAt, shaderSourceEstimate, type ShaderExpmapManifest } from './displayFormat'
import { ShaderExpmapStore } from './displayStore'
import { planExpmapOctaves, type ExpmapOctaves } from './octaves'
import { scaleDoublements } from './decimal'
import { fixedMirrorWindow, radialConfig, radialOctave } from './radial'
import { expmapEffectsUniform, expmapImageRotation } from './effects'
import { expmapFilterUniform, validateExpmapView, type ExpmapView } from './renderer'

export function planShaderMemory(manifest:ShaderExpmapManifest,width:number,height:number,budgetBytes:number,reserveBytes=0) {
  const estimate=shaderSourceEstimate(manifest.projection)
  // Linear attachment + presentation, bounded file/hash/upload copies and margin.
  const fixedBytes=reserveBytes+width*height*12+estimate.maxBlockBytes*8+16*1024*1024
  if(!Number.isSafeInteger(budgetBytes)||budgetBytes<fixedBytes+estimate.maxBlockBytes)throw new Error('Budget insuffisant pour les cibles et un bloc shader')
  const cacheBytes=budgetBytes-fixedBytes
  const usefulOctaves=Math.min((manifest.projection.centerOctaves??12)+1,Math.max(1,Math.floor(cacheBytes/estimate.octaveBytes)-2))
  return {budgetBytes,fixedBytes,cacheBytes,usefulOctaves,residentOctaves:usefulOctaves+2,
    subdivided:cacheBytes<3*estimate.octaveBytes,passes:Math.ceil(((manifest.projection.centerOctaves??12)+1)/usefulOctaves)}
}
/** Independent radial oversampling must drive AA even with an unchanged angular axis. */
export function shaderFilterUniform(layout:ExpmapOctaves,maxSamples=16,loop=false) {
  const uniform=expmapFilterUniform(layout,maxSamples,loop)
  uniform[1]=Math.max(layout.angularSamples/(2*Math.PI),layout.rowsPerOctave/Math.LN2)
  return uniform
}
const presentShader=`
@group(0) @binding(0) var source:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4<f32>{
let xy=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));return vec4<f32>(xy[i],0,1);}
@fragment fn fs(@builtin(position) p:vec4<f32>)->@location(0) vec4<f32>{
let c=textureLoad(source,vec2<i32>(p.xy),0);let v=max(c.rgb/max(c.a,1e-6),vec3<f32>(0));
let rgb=select(1.055*pow(v,vec3<f32>(1.0/2.4))-0.055,12.92*v,v<=vec3<f32>(0.0031308));return vec4<f32>(rgb,1);}`

/** Stream polar blocks into an additive frame. Completed queue submissions are
 * the eviction fence; memory never scales with document depth or frame count. */
export class ShaderExpmapRenderer {
  readonly canvas=new OffscreenCanvas(1,1)
  private cache=new Map<number,{buffer:GPUBuffer;bytes:number}>()
  private cacheBytes=0
  private context:GPUCanvasContext
  private linear?:GPUTexture
  private pipeline?:GPURenderPipeline
  private present?:GPURenderPipeline
  private composePipeline?:GPURenderPipeline
  private composeUniform?:GPUBuffer
  workingReserveBytes=0
  private uniform:GPUBuffer
  private disposed=false
  private busy=false
  private release:()=>void
  private engine:Engine
  private store:ShaderExpmapStore
  readonly manifest:ShaderExpmapManifest
  budgetBytes:number
  appearance:RenderOptions
  onProgress?:(done:number,total:number)=>void
  constructor(engine:Engine,store:ShaderExpmapStore,manifest:ShaderExpmapManifest,appearance:RenderOptions,budgetBytes=512*1024*1024) {
    if(manifest.state!=='complete')throw new Error('Source shader incomplète')
    this.engine=engine;this.store=store;this.manifest=manifest;this.appearance=appearance;this.budgetBytes=budgetBytes
    this.context=this.canvas.getContext('webgpu')!;if(!this.context)throw new Error('WebGPU requis')
    this.context.configure({device:engine.device,format:'rgba8unorm',alphaMode:'opaque'})
    this.uniform=engine.device.createBuffer({size:SHADER_BATCH_BYTES,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})
    this.release=engine.suspendForExpmapPlayback()
  }
  private async load(index:number,limit:number,signal:AbortSignal|undefined,beforeEvict:()=>Promise<void>) {
    const existing=this.cache.get(index)
    if(existing) {this.cache.delete(index);this.cache.set(index,existing);return existing.buffer}
    const bytes=await this.store.read(this.manifest,index,signal)
    if(this.cacheBytes+bytes.length>limit)await beforeEvict()
    while(this.cacheBytes+bytes.length>limit&&this.cache.size) {
      const [key,value]=this.cache.entries().next().value!;value.buffer.destroy();this.cache.delete(key);this.cacheBytes-=value.bytes
    }
    if(bytes.length>limit||bytes.length>this.engine.device.limits.maxStorageBufferBindingSize)throw new Error('Bloc shader supérieur au budget GPU')
    const buffer=this.engine.device.createBuffer({size:bytes.length,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})
    this.engine.device.queue.writeBuffer(buffer,0,bytes)
    this.cache.set(index,{buffer,bytes:bytes.length});this.cacheBytes+=bytes.length;return buffer
  }
  async render(view:ExpmapView,signal?:AbortSignal,ring?:ShaderRing,rect?:RingRect):Promise<OffscreenCanvas> {
    if(this.disposed||this.busy)throw new Error('Lecteur indisponible')
    assertShaderAppearanceCompatible(this.manifest,this.appearance)
    validateExpmapView(this.manifest.projection,view);signal?.throwIfAborted();this.busy=true
    const device=this.engine.device
    device.pushErrorScope('out-of-memory');device.pushErrorScope('validation')
    let failure:unknown
    let batch:ShaderDrawBatch|undefined
    try {
      const engine=this.engine,d=engine.device,plan=this.manifest.projection,o=planExpmapOctaves(plan)
      if(Math.max(view.width,view.height)>d.limits.maxTextureDimension2D)throw new Error('Sortie supérieure aux limites GPU')
      const memory=planShaderMemory(this.manifest,view.width,view.height,this.budgetBytes,this.workingReserveBytes)
      while(this.cacheBytes>memory.cacheBytes&&this.cache.size) {
        const [key,value]=this.cache.entries().next().value!;value.buffer.destroy();this.cache.delete(key);this.cacheBytes-=value.bytes
      }
      const cameraDepth=scaleDoublements(plan.domain.startScale,view.scale)
      const cameraAngle=view.angle+expmapImageRotation(view.effects,cameraDepth)
      const sourceRecipe=JSON.parse(this.manifest.appearanceJson) as {mu?:number}
      const resources=await engine.prepareShaderExpmapColor(this.appearance,view.effectTime??0,cameraAngle,sourceRecipe.mu)
      if(!this.pipeline) {
        const module=d.createShaderModule({code:resources.code+'\n'+blockShader})
        const extra=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'read-only-storage'}}]})
        this.pipeline=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[resources.layout,extra]}),
          vertex:{module,entryPoint:'vs_main'},fragment:{module,entryPoint:'fs_shader_block',constants:{ENABLE_SURFACE_EFFECTS:1},targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one'},alpha:{srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}})
        const pm=d.createShaderModule({code:presentShader})
        this.present=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:pm,entryPoint:'vs'},fragment:{module:pm,entryPoint:'fs',targets:[{format:'rgba8unorm'}]},primitive:{topology:'triangle-list'}})
      }
      if(!this.linear||this.canvas.width!==view.width||this.canvas.height!==view.height) {
        this.linear?.destroy();this.canvas.width=view.width;this.canvas.height=view.height
        this.linear=d.createTexture({size:[view.width,view.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC})
      }
      let commands=d.createCommandEncoder(),pass=commands.beginRenderPass({colorAttachments:[{view:this.linear.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]});pass.end();d.queue.submit([commands.finish()])
      const depth=scaleDoublements(plan.domain.startScale,view.scale),base=Math.floor(depth)
      const radial=radialConfig(view.effects,o.tileCount),mirror=radial.mode==='mirror'?fixedMirrorWindow(depth,o.tileCount,view.effects?.mirrorDepth):undefined
      const readBase=Math.floor(mirror?.readDepth??depth),stride=plan.blockSize-2*plan.halo
      const nx=Math.ceil((o.angularSamples+2*o.halo)/stride),ny=Math.ceil((o.rowsPerOctave+1+2*o.halo)/stride),perTile=nx*ny
      const angle=view.angle+expmapImageRotation(view.effects,depth)
      const effect=expmapEffectsUniform(view.effects,base,depth,view.effectTime??0)
      const ringClip=ring?(rect??shaderRingBounds(this.manifest,view,ring)):undefined
      const coverage=plan.centerOctaves??12
      const total=(coverage+1)*perTile+1;let done=0
      batch=new ShaderDrawBatch(d,this.uniform,this.linear.createView())
      const filter=shaderFilterUniform(o,view.maxSamples??16,radial.mode!=='normal').slice(0,3)
      const draw=async(index:number,virtual:number,reverse:boolean,center=false)=>{
        signal?.throwIfAborted()
        const block=shaderBlockAt(plan,index)
        let bounds=shaderBlockScissor(plan,view,block,virtual,depth-base,angle,reverse)
        if(bounds&&ringClip){
          const x=Math.max(bounds[0],ringClip[0]),y=Math.max(bounds[1],ringClip[1])
          const right=Math.min(bounds[0]+bounds[2],ringClip[0]+ringClip[2]),bottom=Math.min(bounds[1]+bounds[3],ringClip[1]+ringClip[3])
          bounds=right>x&&bottom>y?[x,y,right-x,bottom-y]:null
        }
        if(!bounds) {this.onProgress?.(++done,total);return}
        const buffer=await this.load(index,memory.cacheBytes,signal,()=>batch!.flush())
        const values=new Float32Array([view.width,view.height,plan.height,plan.radius,
          depth-base,angle,o.angularSamples,o.rowsPerOctave,block.originX,block.originY,block.useful.width,block.useful.height,
          virtual,reverse?1:0,o.halo,center?1:0,...effect,...filter,coverage,
          mirror?1:0,view.effects?.mirrorDepth??1,mirror?.offset??0,0,
          // log scale uses the decimal helper's relative log, avoiding underflow.
          -scaleDoublements('1e0',view.scale)*Math.LN2,scaleDoublements('1e0',view.scale)*Math.LOG10E*Math.LN2,0,0])
        await batch!.draw(values,(pass,offset)=>{
          const bound=d.createBindGroup({layout:this.pipeline!.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this.uniform,offset,size:128}},{binding:1,resource:{buffer}}]})
          pass.setPipeline(this.pipeline!);pass.setBindGroup(0,resources.bindGroup);pass.setBindGroup(1,bound)
          pass.setScissorRect(...bounds);pass.draw(6)
        })
        this.onProgress?.(++done,total)
      }
      if(!ring||ring.center)await draw(0,0,false,true)
      for(let group=ring?.first??0;group<(ring?ring.first+ring.count:coverage+1);group+=memory.usefulOctaves) {
        for(let virtual=group;virtual<Math.min(ring?ring.first+ring.count:coverage+1,group+memory.usefulOctaves);virtual++) {
          const mapped=radialOctave(readBase+virtual,radial)
          for(let local=ring?.blockStart??0;local<(ring?ring.blockStart+ring.blockCount:perTile);local++)await draw(1+mapped.source*perTile+local,virtual,mapped.reverse)
        }
      }
      await batch.flush()
      signal?.throwIfAborted()
      if(ring)return this.canvas
      commands=d.createCommandEncoder();pass=commands.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]})
      pass.setPipeline(this.present!);pass.setBindGroup(0,d.createBindGroup({layout:this.present!.getBindGroupLayout(0),entries:[{binding:0,resource:this.linear.createView()}]}));pass.draw(3);pass.end();d.queue.submit([commands.finish()]);await d.queue.onSubmittedWorkDone()
      return this.canvas
    } catch(error) {
      failure=error
      // Cancellation/read failures must not leave source buffers in flight.
      try {await batch?.flush()} catch { /* Preserve the original failure. */ }
      throw error
    } finally {
      const validation=await device.popErrorScope(),memoryError=await device.popErrorScope()
      this.busy=false
      if(!failure&&(validation||memoryError))throw new Error((validation||memoryError)!.message)
    }
  }
  async renderRingTexture(view:ExpmapView,ring:ShaderRing,rect:RingRect,signal?:AbortSignal) {
    await this.render(view,signal,ring,rect)
    return this.linear!
  }
  get gpuDevice(){return this.engine.device}
  releaseSourceCache(){
    if(this.busy)throw new Error('Rendu en cours')
    for(const entry of this.cache.values())entry.buffer.destroy()
    this.cache.clear();this.cacheBytes=0
  }
  async renderRing(view:ExpmapView,ring:ShaderRing,signal?:AbortSignal):Promise<RingPixels> {
    const rect=shaderRingBounds(this.manifest,view,ring)
    if(!rect[2]||!rect[3])return {rect,data:new Uint8Array(0)}
    await this.render(view,signal,ring,rect)
    const d=this.engine.device,pitch=Math.ceil(rect[2]*8/256)*256
    const buffer=d.createBuffer({size:pitch*rect[3],usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})
    try {
      const command=d.createCommandEncoder()
      command.copyTextureToBuffer({texture:this.linear!,origin:[rect[0],rect[1]]},{buffer,bytesPerRow:pitch},[rect[2],rect[3]])
      d.queue.submit([command.finish()]);await buffer.mapAsync(GPUMapMode.READ);signal?.throwIfAborted()
      const mapped=new Uint8Array(buffer.getMappedRange()),data=new Uint8Array(rect[2]*rect[3]*8)
      for(let row=0;row<rect[3];row++)data.set(mapped.subarray(row*pitch,row*pitch+rect[2]*8),row*rect[2]*8)
      return {rect,data}
    }finally{buffer.unmap();buffer.destroy()}
  }

  /** Sum the stored linear RGBA contributions; color is never reevaluated here. */
  async composeRings(view:ExpmapView,parts:AsyncIterable<RingPixels|{rect:RingRect;texture:GPUTexture}>,signal?:AbortSignal):Promise<OffscreenCanvas> {
    if(this.busy||this.disposed)throw new Error('Lecteur indisponible')
    this.busy=true
    const d=this.engine.device
    d.pushErrorScope('validation');d.pushErrorScope('out-of-memory')
    let failure:unknown
    try {
      if(!this.composePipeline) {
        const shader=d.createShaderModule({code:presentShader+`
@group(0) @binding(1) var<uniform> region:vec4<f32>;
@fragment fn add(@builtin(position) p:vec4<f32>)->@location(0) vec4<f32>{return textureLoad(source,vec2<i32>(p.xy-region.xy),0);}`})
        this.composePipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'add',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one'},alpha:{srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}})
        this.present=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format:'rgba8unorm'}]},primitive:{topology:'triangle-list'}})
        this.composeUniform=d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})
      }
      if(!this.linear||this.canvas.width!==view.width||this.canvas.height!==view.height){
        this.linear?.destroy();this.canvas.width=view.width;this.canvas.height=view.height
        this.linear=d.createTexture({size:[view.width,view.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC})
      }
      let command=d.createCommandEncoder(),pass=command.beginRenderPass({colorAttachments:[{view:this.linear.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]})
      pass.end();d.queue.submit([command.finish()])
      for await(const part of parts) {
        const {rect}=part
        signal?.throwIfAborted();if(!rect[2]||!rect[3])continue
        if(('data' in part&&part.data.length!==rect[2]*rect[3]*8)||rect[0]<0||rect[1]<0||rect[0]+rect[2]>view.width||rect[1]+rect[3]>view.height)throw new Error('Contribution invalide')
        const texture='texture' in part?part.texture:d.createTexture({size:[rect[2],rect[3]],format:'rgba16float',usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING})
        try {
          if('data' in part)d.queue.writeTexture({texture},part.data,{bytesPerRow:rect[2]*8},[rect[2],rect[3]])
          d.queue.writeBuffer(this.composeUniform!,0,new Float32Array(rect))
          command=d.createCommandEncoder();pass=command.beginRenderPass({colorAttachments:[{view:this.linear.createView(),loadOp:'load',storeOp:'store'}]})
          pass.setPipeline(this.composePipeline);pass.setBindGroup(0,d.createBindGroup({layout:this.composePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:{buffer:this.composeUniform!}}]}))
          pass.setViewport(...rect,0,1);pass.setScissorRect(...rect);pass.draw(3);pass.end();d.queue.submit([command.finish()]);await d.queue.onSubmittedWorkDone()
        }finally{if('data' in part)texture.destroy()}
      }
      command=d.createCommandEncoder();pass=command.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]})
      pass.setPipeline(this.present!);pass.setBindGroup(0,d.createBindGroup({layout:this.present!.getBindGroupLayout(0),entries:[{binding:0,resource:this.linear.createView()}]}));pass.draw(3);pass.end();d.queue.submit([command.finish()]);await d.queue.onSubmittedWorkDone()
      return this.canvas
    }catch(error){failure=error;throw error}finally{
      const memory=await d.popErrorScope(),validation=await d.popErrorScope();this.busy=false
      if(!failure&&(memory||validation))throw new Error((memory||validation)!.message)
    }
  }
  dispose() {
    if(this.disposed)return;this.disposed=true
    for(const entry of this.cache.values())entry.buffer.destroy()
    this.cache.clear();this.cacheBytes=0;this.linear?.destroy();this.uniform.destroy();this.composeUniform?.destroy();this.context.unconfigure();this.engine.previousRenderOptions=undefined;this.engine.needRender=true;this.release()
  }
}
