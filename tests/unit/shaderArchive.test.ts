import { describe, expect, it, vi } from 'vitest'
import { planExpmap } from '../../src/expmap/plan'
import { shaderBlocks, shaderBlockAt, shaderBlockCount, type ShaderExpmapManifest } from '../../src/expmap/displayFormat'
import { decodeDisplayFrame, encodeDisplayFrame, FRAME_HEADER_BYTES } from '../../src/expmap/displayCodec'
import { MemoryArchiveFile, ShaderExpmapArchive, ARCHIVE_HEADER_BYTES, ARCHIVE_ENTRY_BYTES } from '../../src/expmap/displayArchive'
import { copyShaderSource, resumeFrom } from '../../src/expmap/displayStore'

function fixture():ShaderExpmapManifest {
  const projection=planExpmap({domain:{cx:'0',cy:'0',startScale:'1e-1000',endScale:'1e-1001'},width:32,height:18,density:1,blockSize:32})
  return {kind:'shader-expmap',version:1,convention:'radial-f16-delayed-clamp-v1',id:'test',name:'Test',createdAt:'2026-09-12',generation:0,state:'preparing',completed:0,total:shaderBlockCount(projection),projection,appearanceJson:'{}',calculationIdentity:'sha256:'+'0'.repeat(64)}
}
function samples(count:number,seed:number) {
  const out=new Uint8Array(count*48)
  for(let i=0;i<count;i++)for(let c=0;c<48;c++)out[i*48+c]=c>=32?7:c<12?(i*31+c*17+seed)&255:(i>>3)&255 // trap constant, values noisy, geometry smooth
  return out
}
describe('display frame codec',()=>{
  it('roundtrips, stores constant columns once and beats interleaved gzip',async()=>{
    const payload=samples(4096,3),frame=await encodeDisplayFrame(payload)
    expect(await decodeDisplayFrame(frame,payload.length)).toEqual(payload)
    const view=new DataView(frame.buffer),low=view.getUint32(0,true),high=view.getUint32(4,true)
    for(let c=32;c<48;c++)expect(high>>>(c-32)&1).toBe(1)
    for(let c=0;c<12;c++)expect(low>>>c&1).toBe(0)
    const interleaved=new Uint8Array(await new Response(new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())
    expect(frame.length).toBeLessThan(interleaved.length*0.8)
  })
  it('reduces a uniform block to its header and constants',async()=>{
    const payload=new Uint8Array(48*100).fill(5),frame=await encodeDisplayFrame(payload)
    expect(frame.length).toBe(FRAME_HEADER_BYTES+48)
    expect(await decodeDisplayFrame(frame,payload.length)).toEqual(payload)
    const one=new Uint8Array(48).map((_,i)=>i)
    expect(await decodeDisplayFrame(await encodeDisplayFrame(one),48)).toEqual(one)
  })
  it('rejects a frame for another block size',async()=>{
    const frame=await encodeDisplayFrame(samples(10,0))
    await expect(decodeDisplayFrame(frame,48*11)).rejects.toThrow('Taille')
    await expect(decodeDisplayFrame(frame.subarray(0,8),480)).rejects.toThrow('tronquée')
  })
})
describe('shader archive',()=>{
  it('lays out header, manifest, table and frames, and reads back every block',async()=>{
    const file=new MemoryArchiveFile(),archive=new ShaderExpmapArchive(file)
    let m=await archive.create(fixture())
    expect(file.size()).toBe(ARCHIVE_HEADER_BYTES+new TextEncoder().encode(JSON.stringify(m)).length+m.total*ARCHIVE_ENTRY_BYTES-0)
    const payloads:Uint8Array[]=[]
    for(const b of shaderBlocks(m.projection)) {const p=samples(b.useful.width*b.useful.height,m.completed);payloads.push(p);m=await archive.append(m,p)}
    m={...m,state:'complete',generation:m.generation+1};await archive.publish(m)
    const reopened=new ShaderExpmapArchive(file),again=await reopened.open()
    expect(again.state).toBe('complete');expect(again.completed).toBe(m.total)
    for(let i=0;i<m.total;i++)expect(await reopened.read(again,i)).toEqual(payloads[i])
    expect(archive.storedBytes()).toBeLessThan(payloads.reduce((n,p)=>n+p.length,0)/2+ARCHIVE_HEADER_BYTES+m.total*ARCHIVE_ENTRY_BYTES+new TextEncoder().encode(JSON.stringify(m)).length)
  })
  it('commits through the header: an unflushed frame is invisible and a rollback truncates',async()=>{
    const file=new MemoryArchiveFile(),archive=new ShaderExpmapArchive(file)
    let m=await archive.create(fixture())
    for(let i=0;i<3;i++)m=await archive.append(m,samples(shaderBlockAt(m.projection,i).useful.width*shaderBlockAt(m.projection,i).useful.height,i))
    const committed=file.size()
    // Simulate a crash after the frame bytes landed but before the header moved.
    file.write(file.size(),new Uint8Array(1000).fill(9))
    const reopened=await new ShaderExpmapArchive(file).open()
    expect(reopened.completed).toBe(3)
    const back=resumeFrom(reopened);expect(back.completed).toBe(1)
    const again=new ShaderExpmapArchive(file);await again.open();await again.publish({...back,generation:back.generation+1})
    expect(file.size()).toBeLessThan(committed)
    expect((await again.open()).completed).toBe(1)
    await expect(again.publish({...back,completed:2})).rejects.toThrow('ajout')
    await expect(again.append({...back,completed:0},new Uint8Array(48))).rejects.toThrow('désynchronisé')
  })
  it('refuses foreign, empty and truncated files',async()=>{
    const file=new MemoryArchiveFile()
    await expect(new ShaderExpmapArchive(file).open()).rejects.toThrow('vide')
    file.write(0,new Uint8Array(ARCHIVE_HEADER_BYTES).fill(1))
    await expect(new ShaderExpmapArchive(file).open()).rejects.toThrow('incompatible')
    const good=new MemoryArchiveFile(),archive=new ShaderExpmapArchive(good)
    let m=await archive.create(fixture());m=await archive.append(m,samples(shaderBlockAt(m.projection,0).useful.width*shaderBlockAt(m.projection,0).useful.height,0))
    good.truncate(good.size()-4)
    await expect(new ShaderExpmapArchive(good).open()).rejects.toThrow('tronquée')
  })
  it('copies a complete directory-style source into an archive and resumes after abort',async()=>{
    vi.stubGlobal('navigator',{locks:{request:async(_name:unknown,_options:unknown,action:(lock:object)=>Promise<unknown>)=>action({})}})
    try {
      const original=new ShaderExpmapArchive(new MemoryArchiveFile())
      let m=await original.create(fixture())
      for(const b of shaderBlocks(m.projection))m=await original.append(m,samples(b.useful.width*b.useful.height,m.completed))
      m={...m,state:'complete',generation:m.generation+1};await original.publish(m)
      const source={...original,key:'a',open:()=>original.open(),assertEmpty:()=>original.assertEmpty(),publish:(x:ShaderExpmapManifest)=>original.publish(x),append:(x:ShaderExpmapManifest,p:Uint8Array)=>original.append(x,p),read:(x:ShaderExpmapManifest,i:number,s?:AbortSignal)=>original.read(x,i,s)}
      const targetArchive=new ShaderExpmapArchive(new MemoryArchiveFile())
      const target={key:'b',open:()=>targetArchive.open(),assertEmpty:()=>targetArchive.assertEmpty(),publish:(x:ShaderExpmapManifest)=>targetArchive.publish(x),append:(x:ShaderExpmapManifest,p:Uint8Array)=>targetArchive.append(x,p),read:(x:ShaderExpmapManifest,i:number,s?:AbortSignal)=>targetArchive.read(x,i,s),createArchive:(x:ShaderExpmapManifest)=>targetArchive.create(x)}
      const abort=new AbortController()
      await expect(copyShaderSource(source,target,abort.signal,n=>{if(n===3)abort.abort()})).rejects.toThrow()
      expect((await target.open()).completed).toBe(3)
      const complete=await copyShaderSource(source,target)
      expect(complete.state).toBe('complete')
      for(let i=0;i<m.total;i++)expect(await target.read(complete,i)).toEqual(await original.read(m,i))
    }finally{vi.unstubAllGlobals()}
  })
})
