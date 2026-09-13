import { shaderBlockAt, shaderBlockCount, shaderSourceEstimate, type ShaderExpmapManifest } from './displayFormat'
import { planExpmapOctaves } from './octaves'

export type GatherLimits=Pick<GPUSupportedLimits,'maxBufferSize'|'maxStorageBufferBindingSize'|'maxStorageBuffersPerShaderStage'>
export type GatherPlan={slotBytes:number;slots:number;bankBytes:number[];tableBytes:number;perTile:number;nx:number;stride:number;coverage:number}
/** One palette storage binding + one page table; all remaining bindings hold samples. */
export function planShaderGather(m:ShaderExpmapManifest,budget:number,limits:GatherLimits):GatherPlan|null {
  const p=m.projection,o=planExpmapOctaves(p),stride=p.blockSize-2*p.halo,coverage=(p.centerOctaves??12)+1
  const nx=Math.ceil((o.angularSamples+2*o.halo)/stride),perTile=nx*Math.ceil((o.rowsPerOctave+1+2*o.halo)/stride)
  const slotBytes=shaderSourceEstimate(p).maxBlockBytes
  const tableBytes=(1+coverage*perTile+coverage)*16
  const maxBank=Math.min(limits.maxBufferSize,limits.maxStorageBufferBindingSize)
  const maxBanks=Math.min(6,limits.maxStorageBuffersPerShaderStage-2)
  if(perTile>0xffffff||!Number.isSafeInteger(tableBytes)||tableBytes>maxBank||maxBanks<1||slotBytes>maxBank)return null
  const slotsPerBank=Math.floor(maxBank/slotBytes)
  const slots=Math.min(Math.floor((budget-tableBytes)/slotBytes),slotsPerBank*maxBanks,shaderBlockCount(p),(coverage+2)*perTile+1)
  if(slots<2)return null
  const bankBytes:number[]=[]
  for(let left=slots;left>0;left-=slotsPerBank)bankBytes.push(Math.min(left,slotsPerBank)*slotBytes)
  return {slotBytes,slots,bankBytes,tableBytes,perTile,nx,stride,coverage}
}

export type GatherJob={index:number;virtual:number;reverse:boolean;center:boolean}
/** Partition by distinct physical blocks, not virtual aliases (mirror/repeat). */
export function* gatherGroups<T extends GatherJob>(jobs:readonly T[],capacity:number):Generator<T[]> {
  if(!Number.isInteger(capacity)||capacity<1)throw new Error('Capacité de rassemblement invalide')
  let group:T[]=[],indices=new Set<number>()
  for(const job of jobs){
    if(!indices.has(job.index)&&indices.size===capacity){yield group;group=[];indices=new Set()}
    group.push(job);indices.add(job.index)
  }
  if(group.length)yield group
}
export type GatherSlot={bank:number;sample:number}
/** Absent pages deliberately belong to another pass; every requested page must exist. */
export function gatherPageTable(m:ShaderExpmapManifest,plan:GatherPlan,jobs:readonly GatherJob[],lookup:(index:number)=>GatherSlot|undefined) {
  const table=new Uint32Array(plan.tableBytes/4)
  for(const job of jobs){
    const slot=lookup(job.index)
    if(!slot)throw new Error('Bloc GPU requis absent')
    const block=shaderBlockAt(m.projection,job.index)
    const local=job.center?0:(job.index-1)%plan.perTile
    const page=job.center?0:1+job.virtual*plan.perTile+local
    table.set([slot.bank+1,slot.sample,block.useful.width,block.useful.height],page*4)
    if(!job.center)table[(1+plan.coverage*plan.perTile+job.virtual)*4]=job.reverse?1:0
  }
  return table
}

/** Persistent bounded slots. Reuse writes follow the previous draw's submit on
 * the same queue; destruction requires drain(). No second copy of source data. */
export class ShaderGatherAtlas {
  readonly plan:GatherPlan
  readonly banks:GPUBuffer[]=[]
  readonly pages:GPUBuffer
  private device:GPUDevice
  private cache=new Map<number,GatherSlot>()
  private free:GatherSlot[]=[]
  private pending=false
  constructor(device:GPUDevice,plan:GatherPlan){
    this.device=device;this.plan=plan
    try {
      for(const [bank,size] of plan.bankBytes.entries()){
        this.banks.push(device.createBuffer({size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}))
        for(let offset=0;offset<size;offset+=plan.slotBytes)this.free.push({bank,sample:offset/48})
      }
      this.pages=device.createBuffer({size:plan.tableBytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})
    }catch(error){for(const bank of this.banks)bank.destroy();throw error}
  }
  has(index:number){return this.cache.has(index)}
  lookup(index:number){return this.cache.get(index)}
  async prepare(indices:readonly number[],read:(index:number)=>Promise<Uint8Array>,signal?:AbortSignal){
    const pinned=new Set(indices)
    if(pinned.size>this.plan.slots)throw new Error('Groupe supérieur à la capacité GPU')
    for(const index of pinned){
      signal?.throwIfAborted()
      const hit=this.cache.get(index)
      if(hit){this.cache.delete(index);this.cache.set(index,hit);continue}
      const bytes=await read(index);signal?.throwIfAborted()
      if(bytes.length>this.plan.slotBytes||bytes.length%48)throw new Error('Taille de bloc GPU invalide')
      let slot=this.free.pop()
      if(!slot){
        const victim=[...this.cache.keys()].find(key=>!pinned.has(key))
        if(victim===undefined)throw new Error('Tous les blocs GPU sont épinglés')
        slot=this.cache.get(victim)!;this.cache.delete(victim)
      }
      try{this.device.queue.writeBuffer(this.banks[slot.bank],slot.sample*48,bytes as Uint8Array<ArrayBuffer>)}
      catch(error){this.free.push(slot);throw error}
      this.cache.set(index,slot)
    }
  }
  submitted(){this.pending=true}
  async drain(){if(this.pending){try{await this.device.queue.onSubmittedWorkDone()}finally{this.pending=false}}}
  destroy(){if(this.pending)throw new Error('Atlas GPU encore utilisé');for(const b of this.banks)b.destroy();this.pages.destroy();this.cache.clear()}
}

/** WebGPU has no portable array of storage-buffer bindings: use a bounded switch. */
export function gatherBankShader(count:number){
  if(!Number.isInteger(count)||count<1||count>6)throw new Error('Nombre de banques invalide')
  return Array.from({length:count},(_,i)=>`@group(1) @binding(${i+2}) var<storage,read> gatherBank${i}:array<u32>;`).join('\n')+
    '\nvar<private> displayBank:u32;\nfn read_display_word(index:u32)->u32 {switch displayBank {\n'+
    Array.from({length:count},(_,i)=>`case ${i}u: {return gatherBank${i}[index];}`).join('\n')+'\ndefault: {return 0u;}\n}}\n'+`
fn read_display_sample(index:u32)->array<vec4<u32>,3> {
  let b=index*12u;
  return array<vec4<u32>,3>(
    vec4<u32>(read_display_word(b),read_display_word(b+1u),read_display_word(b+2u),read_display_word(b+3u)),
    vec4<u32>(read_display_word(b+4u),read_display_word(b+5u),read_display_word(b+6u),read_display_word(b+7u)),
    vec4<u32>(read_display_word(b+8u),read_display_word(b+9u),read_display_word(b+10u),read_display_word(b+11u)));
}
`
}
