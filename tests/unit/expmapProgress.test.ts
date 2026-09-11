import { afterEach, describe, expect, it, vi } from 'vitest'
import { createExpmapDocument } from '../../src/expmap/create'
import { ExpmapStore } from '../../src/expmap/store'
import { MemoryDirectory } from './expmapFixtures'
import { planExpmap } from '../../src/expmap/plan'
import { createDefaultAnimationConfig } from '../../src/AnimationConfig'
import type { RenderOptions } from '../../src/Engine'
import type { ExpmapProducerDeps } from '../../src/expmap/producer'
const control=vi.hoisted(()=>({encodeBarrier:undefined as Promise<void>|undefined, encodeFailure:false,qualities:[] as number[], stopAt:-1, modes:[] as boolean[], produced:[] as string[]}))
vi.mock('../../src/expmap/imageCodec',()=>({
  validateTileDimensions:()=>{},
  ExpmapImageEncoder:class {
    async probe() {}
    async encode(rgba:Uint8Array,_width:number,_height:number,quality:number) {control.qualities.push(quality);await control.encodeBarrier;if(control.encodeFailure)throw new Error('Codec failed');return {bytes:rgba,thumbnail:'',milliseconds:1}}
    dispose() {}
  }
}))
vi.mock('../../src/expmap/producer',()=>({produceExpmapBlocks:async(_deps:unknown,r:any)=>{
  control.modes.push(r.forceRender)
  let count=0
  for(const block of r.blocks){
    if(count===control.stopAt)throw new Error('Interrupted fixture')
    control.produced.push(block.id)
    const rgba=new Uint8Array(block.codedWidth*block.codedHeight*4)
    for(let y=0;y<block.codedHeight;y++)for(let x=0;x<block.codedWidth;x++)rgba.set([block.originX+x-block.useful.x,block.originY+y-block.useful.y,73,255],(y*block.codedWidth+x)*4)
    await r.consume({block,rgba,stride:block.codedWidth*4,offset:0});r.onProgress(++count)
  }
}}))
afterEach(()=>{vi.unstubAllGlobals();control.stopAt=-1;control.produced=[];control.modes=[];control.encodeBarrier=undefined;control.encodeFailure=false;control.qualities=[]})
function request(store:ExpmapStore){
  vi.stubGlobal('navigator',{locks:{request:async(_id:unknown,_opts:unknown,fn:any)=>fn({})}})
  const animation=createDefaultAnimationConfig();Object.values(animation.tracks).forEach(t=>{t.enabled=false})
  return {store,documentId:'progress',plan:planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'1'},width:6,height:4,density:1,blockSize:32}),
    appearance:{colorStops:[{color:'#fff',position:0}],animation,heightPaletteShift:0,phaseColoringStrength:0} as RenderOptions,
    restoreCamera:{cx:'0',cy:'0',scale:'1',angle:0}}
}
describe('WebP production progress and resume',()=>{
  it('overlaps the next doubling but stops at the bounded encoder queue',async()=>{
    let release!:()=>void
    control.encodeBarrier=new Promise<void>(r=>{release=r})
    const store=new ExpmapStore(new MemoryDirectory().handle()),r=request(store)
    const running=createExpmapDocument({engine:{}} as ExpmapProducerDeps,r)
    await vi.waitFor(()=>expect(control.produced).toContain('octave:2:0:0'))
    expect(control.produced).not.toContain('octave:3:0:0')
    expect((await store.open()).tiles).toHaveLength(0)
    release()
    expect((await running).tiles).toHaveLength(13)
  })
  it('propagates asynchronous codec failure without publishing an incomplete image',async()=>{
    const store=new ExpmapStore(new MemoryDirectory().handle()),r=request(store)
    control.encodeFailure=true
    await expect(createExpmapDocument({engine:{}} as ExpmapProducerDeps,r)).rejects.toThrow('Codec failed')
    const m=await store.open()
    expect(m.state).toBe('interrupted');expect(m.tiles).toHaveLength(0);expect(m.center).toEqual([0,0,73])
  })
  it('saves whole doublings, packs useful rectangles and reaches total progress',async()=>{
    const store=new ExpmapStore(new MemoryDirectory().handle()),r=request(store),progress:any[]=[]
    const m=await createExpmapDocument({engine:{}} as ExpmapProducerDeps,{...r,onProgress:p=>progress.push(p)})
    expect(m.state).toBe('complete');expect(m.tiles.length).toBe(13)
    expect(progress.at(-1)).toMatchObject({done:14,total:14,saved:14})
    expect(progress.every((p,i)=>i===0||p.done>=progress[i-1].done)).toBe(true)
    const rgba=await store.readTile(m.tiles[0])
    expect(Array.from(rgba.slice((m.octaves.tileWidth+3)*4,(m.octaves.tileWidth+3)*4+4))).toEqual([3,1,73,255])
    expect(m.center).toEqual([0,0,73])
  })
  it.each([undefined, 'continuous-radial-v1'] as const)('refuses old geometry convention %s during resume',async(convention)=>{
    const store=new ExpmapStore(new MemoryDirectory().handle()),r=request(store)
    control.stopAt=4
    await expect(createExpmapDocument({engine:{}} as ExpmapProducerDeps,r)).rejects.toThrow('Interrupted')
    const previous=await store.open()
    if(convention === undefined) delete previous.geometryConvention
    else previous.geometryConvention=convention
    await store.publish({...previous,generation:previous.generation+1})
    control.stopAt=-1;control.produced=[]
    await expect(createExpmapDocument({engine:{}} as ExpmapProducerDeps,{...r,resume:true})).rejects.toThrow('ancienne convention')
    expect(control.produced).toEqual([])
  })
  it('preserves experimental mode across resume despite the current checkbox',async()=>{
    const store=new ExpmapStore(new MemoryDirectory().handle()),r=request(store)
    r.appearance.colorStops[0].shading=1
    control.stopAt=4
    await expect(createExpmapDocument({engine:{}} as ExpmapProducerDeps,{...r,forceRender:true})).rejects.toThrow('Interrupted')
    const previous=await store.open();expect(previous.forceRender).toBe(true)
    control.stopAt=-1
    const m=await createExpmapDocument({engine:{}} as ExpmapProducerDeps,{...r,resume:true,forceRender:false,quality:0.1})
    expect(m.quality).toBe(0.9);expect(control.qualities.every(q=>q===0.9)).toBe(true)
    expect(m.forceRender).toBe(true);expect(control.modes).toEqual([true,true])
    expect(m.appearance).toEqual(previous.appearance)
  })
  it('restarts only the unfinished tile, preserving center and committed tiles',async()=>{
    const store=new ExpmapStore(new MemoryDirectory().handle()),r=request(store)
    control.stopAt=4
    await expect(createExpmapDocument({engine:{}} as ExpmapProducerDeps,r)).rejects.toThrow('Interrupted')
    const before=await store.open();expect(before.tiles.length).toBe(2);expect(before.center).toEqual([0,0,73])
    control.stopAt=-1;control.produced=[]
    const after=await createExpmapDocument({engine:{}} as ExpmapProducerDeps,{...r,resume:true})
    expect(control.produced[0]).toBe('octave:2:0:0');expect(control.produced).not.toContain('center')
    expect(after.tiles.slice(0,2)).toEqual(before.tiles)
  })
})
