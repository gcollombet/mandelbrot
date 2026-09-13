import uploadShader from '../assets/expmap_shader_window_upload.wgsl?raw'
import { shaderBlockAt, shaderSourceEstimate, type ShaderExpmapManifest } from './displayFormat'
import { planExpmapOctaves } from './octaves'
import { radialOctave, type RadialConfig } from './radial'

export type WindowLimits=Pick<GPUSupportedLimits,'maxTextureDimension2D'|'maxTextureArrayLayers'|'maxSampledTexturesPerShaderStage'|'maxBufferSize'|'maxStorageBufferBindingSize'>
export type WindowPlan={width:number;height:number;layersPerPlane:number;logicalWidth:number;logicalHeight:number;octaveBytes:number;slots:number;perTile:number;tableBytes:number;bytes:number}
export const WINDOW_TABLE_BYTES=512
/** Pack a regular octave linearly when either logical axis exceeds the device limit.
 * Three uint4 planes preserve all twelve words, including packed f16 and metadata. */
export function windowShape(m:ShaderExpmapManifest,limit:number){
  const p=m.projection,o=planExpmapOctaves(p),logicalWidth=o.angularSamples+2*o.halo,logicalHeight=o.rowsPerOctave+1+2*o.halo
  const samples=logicalWidth*logicalHeight,layersPerPlane=Math.ceil(samples/(limit*limit))
  const width=logicalWidth<=limit&&logicalHeight<=limit?logicalWidth:Math.min(limit,Math.ceil(samples/(limit*layersPerPlane)))
  const height=Math.ceil(samples/(width*layersPerPlane))
  return {width,height,layersPerPlane,logicalWidth,logicalHeight,octaveBytes:width*height*layersPerPlane*48}
}
export function planShaderWindow(m:ShaderExpmapManifest,budget:number,limits:WindowLimits):WindowPlan|null {
  if(limits.maxSampledTexturesPerShaderStage<17)return null
  const shape=windowShape(m,limits.maxTextureDimension2D),p=m.projection
  const maxBlock=shaderSourceEstimate(p).maxBlockBytes
  if(shape.logicalWidth*shape.logicalHeight>0xffffffff)return null
  if(maxBlock>Math.min(limits.maxBufferSize,limits.maxStorageBufferBindingSize))return null
  const slots=Math.min((p.centerOctaves??12)+3,Math.floor((budget-WINDOW_TABLE_BYTES)/shape.octaveBytes),Math.floor(limits.maxTextureArrayLayers/(3*shape.layersPerPlane)))
  if(slots<3)return null
  const stride=p.blockSize-2*p.halo,perTile=Math.ceil(shape.logicalWidth/stride)*Math.ceil(shape.logicalHeight/stride)
  return {...shape,slots,perTile,tableBytes:WINDOW_TABLE_BYTES,bytes:slots*shape.octaveBytes+WINDOW_TABLE_BYTES}
}
export type WindowOctave={virtual:number;source:number;reverse:boolean}
export function windowOctaves(first:number,count:number,base:number,radial:RadialConfig):WindowOctave[]{
  return Array.from({length:count},(_,i)=>({virtual:first+i,...radialOctave(base+first+i,radial)}))
}
/** Pin overlap first, then recycle departing slots. A failed load never publishes
 * a half octave, and a seek/reverse/alias needs no special physical copying. */
export class OctaveSlots {
  private resident=new Map<number,number>()
  private cursor=0
  readonly capacity:number
  constructor(capacity:number){this.capacity=capacity}
  has(source:number){return this.resident.has(source)}
  lookup(source:number){return this.resident.get(source)}
  async prepare(sources:readonly number[],upload:(source:number,slot:number)=>Promise<void>,signal?:AbortSignal){
    const pinned=new Set(sources)
    if(pinned.size>this.capacity)throw new Error('Fenêtre supérieure à la capacité GPU')
    for(const source of pinned){
      signal?.throwIfAborted();if(this.resident.has(source))continue
      let slot=-1
      for(let k=0;k<this.capacity;k++){
        const candidate=(this.cursor+k)%this.capacity
        const occupant=[...this.resident].find(([,s])=>s===candidate)
        if(!occupant||!pinned.has(occupant[0])){slot=candidate;if(occupant)this.resident.delete(occupant[0]);break}
      }
      if(slot<0)throw new Error('Fenêtre GPU entièrement épinglée')
      await upload(source,slot);signal?.throwIfAborted()
      this.resident.set(source,slot);this.cursor=(slot+1)%this.capacity
    }
  }
}
export function windowTable(plan:WindowPlan,octaves:WindowOctave[],slots:OctaveSlots,center:Uint32Array|undefined){
  const table=new Uint32Array(plan.tableBytes/4)
  table.set([plan.width,plan.height,plan.layersPerPlane,plan.logicalWidth])
  if(center){if(center.length!==12)throw new Error('Centre tronqué');table.set(center,4)}
  for(const o of octaves){
    const slot=slots.lookup(o.source)
    if(slot===undefined||o.virtual<0||o.virtual>=25)throw new Error('Octave requise absente')
    table.set([slot+1,o.reverse?1:0,0,0],16+4*o.virtual)
  }
  return table
}
export class ShaderWindow {
  readonly texture:GPUTexture
  readonly table:GPUBuffer
  readonly slots:OctaveSlots
  private staging:GPUBuffer
  private uploadUniform:GPUBuffer
  private pipeline?:GPUComputePipeline
  private bound?:GPUBindGroup
  private pending=false
  private uploads=0
  private device:GPUDevice
  readonly plan:WindowPlan
  private manifest:ShaderExpmapManifest
  private center?:Uint32Array
  constructor(device:GPUDevice,plan:WindowPlan,manifest:ShaderExpmapManifest){
    this.device=device;this.plan=plan;this.manifest=manifest
    this.slots=new OctaveSlots(plan.slots)
    const cleanup:{destroy:()=>void}[]=[]
    try{
      this.texture=device.createTexture({label:'ExpMap display fenêtre circulaire',size:[plan.width,plan.height,plan.slots*3*plan.layersPerPlane],format:'rgba32uint',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING});cleanup.push(this.texture)
      this.table=device.createBuffer({size:plan.tableBytes,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});cleanup.push(this.table)
      this.staging=device.createBuffer({size:shaderSourceEstimate(manifest.projection).maxBlockBytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});cleanup.push(this.staging)
      this.uploadUniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});cleanup.push(this.uploadUniform)
    }catch(error){cleanup.forEach(r=>r.destroy());throw error}
  }
  has(index:number){return index===0?!!this.center:this.slots.has(Math.floor((index-1)/this.plan.perTile))}
  async prepare(octaves:WindowOctave[],center:boolean,read:(index:number)=>Promise<Uint8Array>,signal?:AbortSignal,reserves:WindowOctave[]=[]){
    const d=this.device,p=this.plan
    if(!this.pipeline){
      const module=d.createShaderModule({code:uploadShader})
      this.pipeline=await d.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'upload'}})
      this.bound=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.staging}},{binding:1,resource:{buffer:this.uploadUniform}},{binding:2,resource:this.texture.createView()}]})
    }
    if(center&&!this.center){const bytes=await read(0);signal?.throwIfAborted();if(bytes.length!==48)throw new Error('Centre tronqué');this.center=new Uint32Array(bytes.slice().buffer)}
    await this.slots.prepare([...octaves,...reserves].map(o=>o.source),async(source,slot)=>{
      for(let local=0;local<p.perTile;local++){
        signal?.throwIfAborted()
        const index=1+source*p.perTile+local,b=shaderBlockAt(this.manifest.projection,index),bytes=await read(index)
        signal?.throwIfAborted()
        if(bytes.length!==b.useful.width*b.useful.height*48)throw new Error('Bloc source tronqué')
        d.queue.writeBuffer(this.staging,0,bytes as Uint8Array<ArrayBuffer>)
        d.queue.writeBuffer(this.uploadUniform,0,new Uint32Array([p.width,p.height,p.layersPerPlane,p.logicalWidth,b.originX,b.originY,b.useful.width,b.useful.height,slot,0,0,0]))
        const command=d.createCommandEncoder(),pass=command.beginComputePass()
        pass.setPipeline(this.pipeline!);pass.setBindGroup(0,this.bound!);pass.dispatchWorkgroups(Math.ceil(b.useful.width/8),Math.ceil(b.useful.height/8));pass.end()
        d.queue.submit([command.finish()]);this.submitted()
        // Bound driver-side writeBuffer copies during a large octave upload.
        if(++this.uploads===4)await this.drain()
      }
    },signal)
    d.queue.writeBuffer(this.table,0,windowTable(p,octaves,this.slots,center?this.center:undefined));this.submitted()
  }
  submitted(){this.pending=true}
  async drain(){if(this.pending){try{await this.device.queue.onSubmittedWorkDone()}finally{this.pending=false;this.uploads=0}}}
  destroy(){if(this.pending)throw new Error('Fenêtre GPU encore utilisée');this.texture.destroy();this.table.destroy();this.staging.destroy();this.uploadUniform.destroy()}
}
