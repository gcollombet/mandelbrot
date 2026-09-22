import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {readHdrGpuOutput} from '../../src/hdrGpuOutput'

// Simulated GPU output tests the transfers/plane assembly, not shader execution.
function fixture(format: 'video'|'png', limit=1024) {
  type Buffer = {data:ArrayBuffer;destroy:ReturnType<typeof vi.fn>;unmap:ReturnType<typeof vi.fn>;mapAsync:ReturnType<typeof vi.fn>;getMappedRange:()=>ArrayBuffer}
  const buffers:Buffer[]=[], params:Uint32Array[]=[]
  let entries:any[], invalid=0, afterMap=()=>{}, mapFailure=false
  const device:any={limits:{maxStorageBufferBindingSize:limit,maxBufferSize:2048},
    pushErrorScope:vi.fn(),popErrorScope:vi.fn(async()=>null),
    createBuffer:vi.fn(({size})=>{const data=new ArrayBuffer(size);const b={data,destroy:vi.fn(),unmap:vi.fn(),mapAsync:vi.fn(async()=>{if(mapFailure)throw new Error('map failed');afterMap()}),getMappedRange:()=>data};buffers.push(b);return b}),
    createShaderModule:vi.fn(()=>({})),createComputePipelineAsync:vi.fn(async()=>({getBindGroupLayout:()=>({})})),
    createBindGroup:vi.fn((v)=>{entries=v.entries;return {}}),
    queue:{writeBuffer:(b:Buffer,offset:number,data:ArrayBuffer)=>new Uint8Array(b.data).set(new Uint8Array(data),offset),submit:vi.fn()},
    createCommandEncoder:()=>({
      clearBuffer:(b:Buffer)=>new Uint8Array(b.data).fill(0),
      beginComputePass:()=>({setPipeline:()=>{},setBindGroup:()=>{},end:()=>{},dispatchWorkgroups:()=>{
        const p=new Uint32Array(entries[1].resource.buffer.data).slice();params.push(p)
        const width=p[0],y=p[2],rows=p[3],out=new Uint16Array(entries[2].resource.buffer.data)
        if(format==='video'){
          const n=width*rows
          for(let i=0;i<n;i++)out[i]=100+y*width+i
          for(let i=0;i<n/4;i++){out[n+i]=500+y*width/4+i;out[n+n/4+i]=700+y*width/4+i}
        }else for(let i=0;i<width*rows*3;i++)out[i]=y*width*3+i
        new Uint32Array(entries[3].resource.buffer.data)[0]=invalid
      }}),
      copyBufferToBuffer:(a:Buffer,off:number,b:Buffer,dst:number,n:number)=>new Uint8Array(b.data).set(new Uint8Array(a.data,off,n),dst),finish:()=>({}),
    })}
  return {device:device as GPUDevice,source:{createView:()=>({})} as GPUTexture,buffers,params,
    setInvalid:(flags=1)=>{invalid=flags},setAfterMap:(fn:()=>void)=>{afterMap=fn},setMapFailure:()=>{mapFailure=true}}
}
beforeEach(()=>{
  vi.stubGlobal('GPUBufferUsage',{STORAGE:1,COPY_SRC:2,COPY_DST:4,MAP_READ:8,UNIFORM:16})
  vi.stubGlobal('GPUMapMode',{READ:1})
})
afterEach(()=>vi.unstubAllGlobals())
describe('GPU HDR output transfers',()=>{
  it('assembles Y/U/V stripes into the correct full-frame planes',async()=>{
    const f=fixture('video',24)
    const out=await readHdrGpuOutput(f.device,f.source,4,6,{format:'video',exposure:2})
    expect([...out]).toEqual([...Array.from({length:24},(_,i)=>100+i),...Array.from({length:6},(_,i)=>500+i),...Array.from({length:6},(_,i)=>700+i)])
    expect(f.params.map(p=>p[2])).toEqual([0,2,4])
    expect(new Float32Array(f.params[0].buffer)[4]).toBe(812)
    expect(f.buffers.every(b=>b.destroy.mock.calls.length===1)).toBe(true)
    expect(f.buffers[2].unmap).toHaveBeenCalledTimes(3)
  })
  it('supports odd PNG rows, retains packed byte order and sends global dither origins',async()=>{
    const f=fixture('png',20)
    const out=await readHdrGpuOutput(f.device,f.source,3,3,{format:'png',originX:21,originY:31})
    expect([...out]).toEqual(Array.from({length:27},(_,i)=>i))
    expect(f.params.map(p=>p[2])).toEqual([0,1,2])
    expect(f.params.every(p=>p[5]===21&&p[6]===31)).toBe(true)
    expect(out.byteLength).toBe(54)
  })
  it('caches pipelines across frames without retaining readback resources',async()=>{
    const f=fixture('video')
    await readHdrGpuOutput(f.device,f.source,2,2,{format:'video'})
    await readHdrGpuOutput(f.device,f.source,2,2,{format:'video'})
    expect(f.device.createComputePipelineAsync).toHaveBeenCalledOnce()
    expect(f.buffers).toHaveLength(8)
    expect(f.buffers.every(b=>b.destroy.mock.calls.length===1)).toBe(true)
  })
  it('rejects GPU-reported nonfinite values and releases all resources',async()=>{
    const f=fixture('png');f.setInvalid()
    await expect(readHdrGpuOutput(f.device,f.source,2,2,{format:'png'})).rejects.toThrow('Non-finite')
    expect(f.buffers[2].unmap).toHaveBeenCalledOnce()
    expect(f.buffers.every(b=>b.destroy.mock.calls.length===1)).toBe(true)
  })
  it.each(['png','video'] as const)('continues %s on clipping and warns only once across stripes',async format=>{
    const f=fixture(format,24),onWarning=vi.fn();f.setInvalid(2)
    const result=await readHdrGpuOutput(f.device,f.source,2,6,{format,onWarning})
    expect(result.length).toBe(12*(format==='video'?1.5:3))
    expect(f.params.length).toBeGreaterThan(1)
    expect(onWarning).toHaveBeenCalledOnce()
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('clipped at 10,000 nits'))
  })
  it('still rejects invalid values when clipping is also reported',async()=>{
    const f=fixture('png'),onWarning=vi.fn();f.setInvalid(3)
    await expect(readHdrGpuOutput(f.device,f.source,2,2,{format:'png',onWarning})).rejects.toThrow('Non-finite')
    expect(onWarning).not.toHaveBeenCalled()
  })
  it('handles cancellation during GPU readback and mapping failures',async()=>{
    const f=fixture('png'),signal={aborted:false};f.setAfterMap(()=>{signal.aborted=true})
    await expect(readHdrGpuOutput(f.device,f.source,2,2,{format:'png',signal})).rejects.toMatchObject({name:'AbortError'})
    expect(f.buffers[2].unmap).toHaveBeenCalledOnce()
    const g=fixture('video');g.setMapFailure()
    await expect(readHdrGpuOutput(g.device,g.source,2,2,{format:'video'})).rejects.toThrow('map failed')
    expect(g.buffers.every(b=>b.destroy.mock.calls.length===1)).toBe(true)
  })
  it('rejects invalid requests before allocation and propagates GPU validation errors',async()=>{
    const f=fixture('video')
    await expect(readHdrGpuOutput(f.device,f.source,3,2,{format:'video'})).rejects.toThrow('dimensions')
    await expect(readHdrGpuOutput(f.device,f.source,2,2,{format:'video',exposure:Infinity})).rejects.toThrow('exposure')
    expect(f.buffers).toHaveLength(0)
    vi.mocked(f.device.popErrorScope).mockResolvedValueOnce({message:'GPU invalid'} as GPUError)
    await expect(readHdrGpuOutput(f.device,f.source,2,2,{format:'video'})).rejects.toThrow('GPU invalid')
  })
})
