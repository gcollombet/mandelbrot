import { afterEach, describe, expect, it, vi } from 'vitest'
import { gatherGroups, gatherPageTable, planShaderGather, ShaderGatherAtlas } from '../../src/expmap/displayGather'
import { planExpmap } from '../../src/expmap/plan'
import { shaderBlockAt, shaderSourceEstimate, type ShaderExpmapManifest } from '../../src/expmap/displayFormat'
const m={projection:planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'.25'},width:32,height:18,density:2,blockSize:32})} as ShaderExpmapManifest
const slot=shaderSourceEstimate(m.projection).maxBlockBytes
const limits={maxBufferSize:slot*2,maxStorageBufferBindingSize:slot*2,maxStorageBuffersPerShaderStage:8}
afterEach(()=>vi.unstubAllGlobals())
describe('direct GPU page addressing',()=>{
  it('includes padding and page table in the budget and respects binding limits',()=>{
    const plan=planShaderGather(m,slot*7,limits)!
    expect(plan.bankBytes.length).toBeGreaterThan(1)
    expect(plan.bankBytes.length+2).toBeLessThanOrEqual(limits.maxStorageBuffersPerShaderStage)
    expect(plan.bankBytes.every(size=>size<=limits.maxStorageBufferBindingSize)).toBe(true)
    expect(plan.bankBytes.reduce((a,b)=>a+b,0)+plan.tableBytes).toBeLessThanOrEqual(slot*7)
    expect(planShaderGather(m,slot,limits)).toBeNull()
    expect(planShaderGather(m,slot*7,{...limits,maxStorageBuffersPerShaderStage:2})).toBeNull()
  })
  it('partitions aliases and block boundaries exactly once under small budgets',()=>{
    const jobs=[0,1,0,2,3,2,4].map((index,virtual)=>({index,virtual,reverse:virtual%2===0,center:false}))
    const groups=[...gatherGroups(jobs,2)]
    expect(groups.flat()).toEqual(jobs)
    expect(groups.every(group=>new Set(group.map(j=>j.index)).size<=2)).toBe(true)
    expect(groups[0].map(j=>j.index)).toEqual([0,1,0])
  })
  it('addresses both sides of each block boundary, halos, reversed aliases and center',()=>{
    const plan=planShaderGather(m,slot*7,limits)!
    const jobs=Array.from({length:plan.perTile},(_,local)=>({index:local+1,virtual:0,reverse:false,center:false}))
    jobs.push(...jobs.map(j=>({...j,virtual:2,reverse:true})),{index:0,virtual:0,reverse:false,center:true})
    const lookup=(index:number)=>({bank:index%3,sample:index*plan.slotBytes/48})
    const table=gatherPageTable(m,plan,jobs,lookup)
    for(const j of jobs.filter(j=>!j.center)){
      const block=shaderBlockAt(m.projection,j.index)
      for(const x of [0,block.useful.width-1])for(const y of [0,block.useful.height-1]){
        const globalX=block.originX+x,globalY=block.originY+y
        const page=1+j.virtual*plan.perTile+Math.floor(globalY/plan.stride)*plan.nx+Math.floor(globalX/plan.stride)
        expect(table[page*4]).toBe(lookup(j.index).bank+1)
        expect(table[page*4+1]+(globalY%plan.stride)*table[page*4+2]+globalX%plan.stride).toBe(lookup(j.index).sample+y*block.useful.width+x)
      }
    }
    expect(table[0]).toBe(1)
    expect(table[(1+plan.perTile)*4]).toBe(0) // absent virtual octave belongs to another pass
    expect(table[(1+plan.coverage*plan.perTile+2)*4]).toBe(1)
    expect(()=>gatherPageTable(m,plan,jobs,()=>undefined)).toThrow('absent')
  })
  it('pins the whole requested group, reuses resident slots and drains before destruction',async()=>{
    vi.stubGlobal('GPUBufferUsage',{STORAGE:1,COPY_DST:2})
    const buffers:{destroy:ReturnType<typeof vi.fn>}[]=[],writes:number[]=[]
    let finish!:()=>void
    const device={createBuffer:()=>{const buffer={destroy:vi.fn()};buffers.push(buffer);return buffer},queue:{
      writeBuffer:vi.fn((_b,_offset,bytes:Uint8Array)=>writes.push(bytes[0])),onSubmittedWorkDone:vi.fn(()=>new Promise<void>(resolve=>{finish=resolve})),
    }} as unknown as GPUDevice
    const base=planShaderGather(m,slot*7,limits)!,plan={...base,slots:2,bankBytes:[slot*2]}
    const atlas=new ShaderGatherAtlas(device,plan),read=vi.fn(async(index:number)=>new Uint8Array(48).fill(index))
    await atlas.prepare([1,2],read);const two=atlas.lookup(2)
    atlas.submitted()
    // Queue writes after submission are ordered; retaining page 2 prevents its reuse.
    await atlas.prepare([3,2],read)
    expect(atlas.lookup(2)).toBe(two);expect(atlas.has(1)).toBe(false)
    expect(writes).toEqual([1,2,3]);expect(read).toHaveBeenCalledTimes(3)
    expect(()=>atlas.destroy()).toThrow('encore utilisé')
    let drained=false;const drain=atlas.drain().then(()=>{drained=true})
    await Promise.resolve();expect(drained).toBe(false);finish();await drain
    atlas.destroy();expect(buffers.every(b=>b.destroy.mock.calls.length===1)).toBe(true)
  })
  it('does not publish a slot when reading fails or is cancelled',async()=>{
    vi.stubGlobal('GPUBufferUsage',{STORAGE:1,COPY_DST:2})
    const device={createBuffer:()=>({destroy:vi.fn()}),queue:{writeBuffer:vi.fn(),onSubmittedWorkDone:vi.fn(async()=>{})}} as unknown as GPUDevice
    const plan=planShaderGather(m,slot*7,limits)!,atlas=new ShaderGatherAtlas(device,plan)
    const abort=new AbortController()
    await expect(atlas.prepare([1],async()=>{abort.abort();return new Uint8Array(48)},abort.signal)).rejects.toThrow()
    expect(atlas.has(1)).toBe(false);expect(device.queue.writeBuffer).not.toHaveBeenCalled()
    await expect(atlas.prepare([2],async()=>{throw new Error('read failed')})).rejects.toThrow('read failed')
    expect(atlas.has(2)).toBe(false)
    await atlas.prepare([2],async()=>new Uint8Array(48))
    expect(atlas.has(2)).toBe(true);atlas.destroy()
  })

})
