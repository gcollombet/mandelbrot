import { describe, expect, it, vi } from 'vitest'
import { planExpmap } from '../../src/expmap/plan'
import { planExpmapOctaves } from '../../src/expmap/octaves'
import { shaderBlocks, shaderBlockAt, shaderBlockCount, shaderSourceEstimate, validateShaderManifest, type ShaderExpmapManifest } from '../../src/expmap/displayFormat'
import { ShaderExpmapStore, copyShaderSource } from '../../src/expmap/displayStore'
import { planShaderMemory, shaderFilterUniform } from '../../src/expmap/displayRenderer'
import { shaderBlockScissor } from '../../src/expmap/displayScissor'
import { MemoryDirectory } from './expmapFixtures'

class Directory extends MemoryDirectory {
  children=new Map<string,Directory>()
  async isSameEntry(other:unknown) {return other===this}
  async getDirectoryHandle(name:string,options?:{create?:boolean}) {
    if(!this.children.has(name)) {
      if(!options?.create)throw new DOMException('Missing','NotFoundError')
      this.children.set(name,new Directory())
    }
    return this.children.get(name)!.handle()
  }
  override async *values() {yield* super.values();for(const name of this.children.keys())yield {name}}
}
function fixture():ShaderExpmapManifest {
  const projection=planExpmap({domain:{cx:'0',cy:'0',startScale:'1e-1000',endScale:'1e-1001'},width:32,height:18,density:1,blockSize:32})
  return {kind:'shader-expmap',version:1,convention:'radial-f16-delayed-clamp-v1',id:'test',name:'Test',createdAt:'2026-09-12',generation:0,state:'preparing',completed:0,total:shaderBlockCount(projection),projection,appearanceJson:'{}',calculationIdentity:'sha256:'+'0'.repeat(64)}
}
describe('shader ExpMap layout',()=>{
  it('addresses the streamed block order without materializing the whole index',()=>{
    const m=fixture(),blocks=[...shaderBlocks(m.projection)]
    expect(blocks.length).toBe(m.total)
    blocks.forEach((block,i)=>expect(shaderBlockAt(m.projection,i)).toEqual(block))
    expect(()=>shaderBlockAt(m.projection,m.total)).toThrow()
    expect(shaderSourceEstimate(m.projection).rawBytes).toBe(blocks.reduce((n,b)=>n+b.useful.width*b.useful.height*48,0))
  })
  it('increases radial sampling without changing angular resolution or legacy serialization',()=>{
    const p=fixture().projection,q=planExpmap({...p,radialDensity:4})
    expect(q.angularSamples).toBe(p.angularSamples)
    expect(q.rhoStep).toBeLessThan(p.rhoStep/3.8)
    expect(shaderFilterUniform(planExpmapOctaves(q))[1]).toBeGreaterThan(shaderFilterUniform(planExpmapOctaves(p))[1]*3.8)
    expect(planExpmap(p)).toEqual(p)
    expect(p).not.toHaveProperty('radialDensity')
    expect(planExpmapOctaves(planExpmap({...p,centerOctaves:17})).tileCount).toBe(planExpmapOctaves(p).tileCount+5)
    expect(Math.hypot(3840,2160)/2/2**17).toBeLessThan(1/32)
  })
  it('plans bounded subdivision and rejects budgets smaller than one working block',()=>{
    const m=fixture(),a=planShaderMemory(m,1920,1080,128*1048576)
    expect(a.cacheBytes+a.fixedBytes).toBe(a.budgetBytes)
    expect(a.residentOctaves).toBe(a.usefulOctaves+2)
    expect(()=>planShaderMemory(m,3840,2160,1024)).toThrow()
    expect(()=>planShaderMemory(m,3840,2160,NaN)).toThrow()
  })
  it('rejects forged completion and inconsistent layout',()=>{
    const m=fixture();expect(()=>validateShaderManifest(m)).not.toThrow()
    expect(()=>validateShaderManifest({...m,state:'complete'})).toThrow()
    expect(()=>validateShaderManifest({...m,projection:{...m.projection,angularSamples:1}})).toThrow()
  })
})
describe('shader source checkpoints',()=>{
  it('roundtrips binary samples and detects corruption before returning data',async()=>{
    const directory=new Directory(),store=new ShaderExpmapStore(directory.handle()),m=fixture()
    await store.assertEmpty();await store.publish(m)
    const payload=Uint8Array.from({length:48},(_,i)=>i)
    const next=await store.append(m,payload)
    expect(await store.open()).toEqual(next)
    expect(await store.read(next,0)).toEqual(payload)
    directory.children.get('blocks-0')!.files.get('0.bin')![20]^=1
    await expect(store.read(next,0)).rejects.toThrow('Intégrité')
  })
  it('keeps the preceding checkpoint after a failed publication',async()=>{
    const directory=new Directory(),store=new ShaderExpmapStore(directory.handle()),m=fixture()
    await store.publish(m);directory.failClose='shader-manifest-1.json'
    await expect(store.append(m,new Uint8Array(48))).rejects.toThrow()
    expect((await store.open()).completed).toBe(0)
    directory.failClose=null
    const next=await store.append(m,new Uint8Array(48));expect(next.completed).toBe(1)
  })
  it('resumes a cancelled source copy from its last verified block',async()=>{
    vi.stubGlobal('navigator',{locks:{request:async(_name:unknown,_options:unknown,action:(lock:object)=>Promise<unknown>)=>action({})}})
    try {
      const original=new ShaderExpmapStore(new Directory().handle()),target=new ShaderExpmapStore(new Directory().handle())
      let m=fixture()
      for(const b of shaderBlocks(m.projection))m=await original.append(m,new Uint8Array(b.useful.width*b.useful.height*48).fill(m.completed%256))
      m={...m,state:'complete',generation:m.generation+1};await original.publish(m)
      const abort=new AbortController()
      await expect(copyShaderSource(original,target,abort.signal,n=>{if(n===2)abort.abort()})).rejects.toThrow()
      expect((await target.open()).completed).toBe(2)
      expect((await target.open()).state).toBe('interrupted')
      const complete=await copyShaderSource(original,target)
      expect(complete.state).toBe('complete')
      expect(await target.read(complete,complete.total-1)).toEqual(await original.read(m,m.total-1))
    }finally{vi.unstubAllGlobals()}
  })
  it('refuses unpublished, oversized and cancelled reads',async()=>{
    const directory=new Directory(),store=new ShaderExpmapStore(directory.handle()),m=fixture()
    await expect(store.read(m,0)).rejects.toThrow('non publié')
    await expect(store.append(m,new Uint8Array(49))).rejects.toThrow('Taille')
    const next=await store.append(m,new Uint8Array(48)),abort=new AbortController();abort.abort()
    await expect(store.read(next,0,abort.signal)).rejects.toThrow()
  })
})
describe('polar block screen coverage',()=>{
  it('contains projected endpoints and interior samples for rotated and reversed blocks',()=>{
    const p=fixture().projection,o=planExpmapOctaves(p),view={width:32,height:18,scale:p.domain.startScale,angle:0}
    for(const angle of [-3,0,1.7])for(const reverse of [false,true])for(let index=1;index<Math.min(12,shaderBlockCount(p));index++) {
      const b=shaderBlockAt(p,index),bounds=shaderBlockScissor(p,view,b,0,.3,angle,reverse)
      for(let iy=0;iy<4;iy++)for(let ix=0;ix<4;ix++) {
        const row=(b.originY+iy*b.useful.height/4-o.halo)/o.rowsPerOctave
        const theta=(b.originX+ix*b.useful.width/4-o.halo)/o.angularSamples*2*Math.PI-angle
        const r=p.radius*2**(.3-(reverse?1-row:row))
        const x=16+r*Math.cos(theta),y=9-r*Math.sin(theta)
        if(x>=0&&x<32&&y>=0&&y<18) {
          expect(bounds).not.toBeNull();expect(x).toBeGreaterThanOrEqual(bounds![0]);expect(x).toBeLessThan(bounds![0]+bounds![2]);expect(y).toBeGreaterThanOrEqual(bounds![1]);expect(y).toBeLessThan(bounds![1]+bounds![3])
        }
      }
    }
  })
})
