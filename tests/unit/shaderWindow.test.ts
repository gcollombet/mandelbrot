import { afterEach, describe, expect, it, vi } from 'vitest'
import { OctaveSlots, planShaderWindow, ShaderWindow, windowOctaves, windowShape, windowTable } from '../../src/expmap/displayWindow'
import { shaderBlockAt, shaderSourceEstimate, type ShaderExpmapManifest } from '../../src/expmap/displayFormat'
import { planExpmap } from '../../src/expmap/plan'
import { planShaderMemory } from '../../src/expmap/displayRenderer'
import { radialConfig } from '../../src/expmap/radial'
const m={projection:planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'.0001'},width:32,height:18,density:2,radialDensity:3,blockSize:32})} as ShaderExpmapManifest
const limits={maxTextureDimension2D:8192,maxTextureArrayLayers:256,maxSampledTexturesPerShaderStage:17,maxBufferSize:1e9,maxStorageBufferBindingSize:1e9}
afterEach(()=>vi.unstubAllGlobals())
describe('regular resident display window',()=>{
  it('budgets real texture storage, layers, table and two spare octaves without a four-octave cap',()=>{
    const shape=windowShape(m,8192),plan=planShaderWindow(m,shape.octaveBytes*10+512,limits)!
    expect(plan.slots).toBe(10);expect(plan.bytes).toBe(shape.octaveBytes*10+512)
    const fixed=planShaderMemory(m,128,72,1e9).fixedBytes
    expect(planShaderMemory(m,128,72,fixed+plan.bytes,0,limits).usefulOctaves).toBe(8)
    expect(planShaderWindow(m,shape.octaveBytes*3+511,limits)).toBeNull()
    expect(planShaderWindow(m,1e9,{...limits,maxTextureArrayLayers:8})).toBeNull()
    expect(planShaderWindow(m,1e9,{...limits,maxSampledTexturesPerShaderStage:16})).toBeNull()
    expect(planShaderWindow(m,1e9,{...limits,maxStorageBufferBindingSize:1})).toBeNull()
  })
  it('packs dimensions beyond texture limits with no collisions, including source block seams and last row',()=>{
    const plan=planShaderWindow(m,1e9,{...limits,maxTextureDimension2D:32})!
    expect(plan.layersPerPlane).toBeGreaterThan(1)
    expect(plan.width).toBeLessThanOrEqual(32);expect(plan.height).toBeLessThanOrEqual(32)
    expect(plan.slots*3*plan.layersPerPlane).toBeLessThanOrEqual(256)
    const addresses=new Set<number>()
    for(let local=0;local<plan.perTile;local++){
      const b=shaderBlockAt(m.projection,local+1)
      for(let y=0;y<b.useful.height;y++)for(let x=0;x<b.useful.width;x++){
        const index=(b.originY+y)*plan.logicalWidth+b.originX+x
        const tx=index%plan.width,ty=Math.floor(index/plan.width)%plan.height,layer=Math.floor(index/(plan.width*plan.height))
        expect(layer).toBeLessThan(plan.layersPerPlane)
        const address=layer*plan.width*plan.height+ty*plan.width+tx
        expect(addresses.has(address)).toBe(false);addresses.add(address)
        expect(address).toBe(index)
      }
    }
    expect(addresses.size).toBe(plan.logicalWidth*plan.logicalHeight)
    expect(plan.octaveBytes).toBeGreaterThanOrEqual(shaderSourceEstimate(m.projection).octaveBytes)
  })
  it('keeps overlap in place, loads only the entering octave and supports backward zoom and seeks',async()=>{
    const slots=new OctaveSlots(5),upload=vi.fn(async()=>{})
    await slots.prepare([10,11,12,13,14],upload)
    const overlap=[11,12,13,14].map(i=>slots.lookup(i)),departing=slots.lookup(10)
    upload.mockClear();await slots.prepare([11,12,13,14,15],upload)
    expect(upload.mock.calls).toEqual([[15,departing]])
    expect([11,12,13,14].map(i=>slots.lookup(i))).toEqual(overlap)
    upload.mockClear();await slots.prepare([11,12,13,14,15],upload);expect(upload).not.toHaveBeenCalled()
    await slots.prepare([10,11,12,13,14],upload);expect(upload).toHaveBeenCalledTimes(1)
    upload.mockClear();await slots.prepare([80,81,82,83,84],upload);expect(upload).toHaveBeenCalledTimes(5)
  })
  it('shares repeated/reversed octaves and leaves reserves out of the rendered coverage',async()=>{
    const plan=planShaderWindow(m,1e9,limits)!,slots=new OctaveSlots(plan.slots)
    const radial=radialConfig({radialMode:'pingpong',radialTurn:2},100)
    const octaves=windowOctaves(0,4,0,radial),reserves=windowOctaves(4,2,0,radial)
    const upload=vi.fn(async()=>{})
    await slots.prepare([...octaves,...reserves].map(o=>o.source),upload)
    expect(upload).toHaveBeenCalledTimes(2)
    const center=Uint32Array.from({length:12},(_,i)=>i),table=windowTable(plan,octaves,slots,center)
    expect(table.slice(4,16)).toEqual(center)
    expect(table[16]).toBe(table[28]);expect(table[20]).toBe(table[24]);expect(table[25]).toBe(1)
    expect(table[32]).toBe(0)
    expect(()=>windowTable(plan,[{virtual:5,source:99,reverse:false}],slots,undefined)).toThrow('absente')
  })
  it('does not publish partially overwritten octaves after cancellation or read failure',async()=>{
    const slots=new OctaveSlots(3)
    await slots.prepare([0,1,2],async()=>{})
    const abort=new AbortController()
    await expect(slots.prepare([1,2,3],async()=>{abort.abort()},abort.signal)).rejects.toThrow()
    expect(slots.has(0)).toBe(false);expect(slots.has(3)).toBe(false);expect(slots.has(1)).toBe(true)
    await expect(slots.prepare([3],async()=>{throw new Error('broken')})).rejects.toThrow('broken')
    expect(slots.has(3)).toBe(false)
    await slots.prepare([1,2,3],async()=>{});expect(slots.has(3)).toBe(true)
  })
  it('uploads complete octaves, orders staging reuse after submits and bounds outstanding copies',async()=>{
    vi.stubGlobal('GPUTextureUsage',{TEXTURE_BINDING:1,STORAGE_BINDING:2});vi.stubGlobal('GPUBufferUsage',{STORAGE:1,COPY_DST:2,UNIFORM:4})
    const events:string[]=[],destroy=vi.fn(),texture={createView:()=>({}),destroy}
    const device={createTexture:()=>texture,createBuffer:()=>({destroy}),createShaderModule:()=>({}),
      createComputePipelineAsync:async()=>({getBindGroupLayout:()=>({})}),createBindGroup:()=>({}),
      createCommandEncoder:()=>({beginComputePass:()=>({setPipeline:()=>{},setBindGroup:()=>{},dispatchWorkgroups:()=>{},end:()=>{}}),finish:()=>({})}),
      queue:{writeBuffer:()=>events.push('write'),submit:()=>events.push('submit'),onSubmittedWorkDone:async()=>{events.push('drain')}}} as unknown as GPUDevice
    const plan=planShaderWindow(m,1e9,limits)!,window=new ShaderWindow(device,plan,m)
    const read=vi.fn(async(index:number)=>{const b=shaderBlockAt(m.projection,index);return new Uint8Array(b.useful.width*b.useful.height*48)})
    const octaves=windowOctaves(0,1,0,radialConfig(undefined,100))
    await window.prepare(octaves,true,read)
    expect(read).toHaveBeenCalledTimes(plan.perTile+1)
    expect(window.has(1)).toBe(true);expect(window.has(plan.perTile)).toBe(true)
    let queued=0
    for(const event of events){if(event==='submit')queued++;if(event==='drain')queued=0;expect(queued).toBeLessThanOrEqual(4)}
    const calls=read.mock.calls.length;await window.prepare(octaves,true,read);expect(read).toHaveBeenCalledTimes(calls)
    window.submitted();expect(()=>window.destroy()).toThrow('encore utilisée')
    await window.drain();window.destroy();expect(destroy).toHaveBeenCalledTimes(4)
  })
})
