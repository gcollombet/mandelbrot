import { afterEach, describe, expect, it, vi } from 'vitest'
import { createExpmapDocument } from '../../src/expmap/create'
import { ExpmapDirectoryStore } from '../../src/expmap/store'
import { MemoryDirectory } from './expmapFixtures'
import { planExpmap } from '../../src/expmap/plan'
import { decodeTiffTile } from '../../src/expmap/tiff'
import { createDefaultAnimationConfig } from '../../src/AnimationConfig'
import type { RenderOptions } from '../../src/Engine'
import type { ExpmapProducerDeps } from '../../src/expmap/producer'
const control=vi.hoisted(()=>({stopAt:-1, produced:[] as string[]}))
vi.mock('../../src/expmap/producer',()=>({produceExpmapBlocks:async(_deps:unknown,r:any)=>{
  let count=0
  for(const block of r.blocks){
    if(count===control.stopAt)throw new Error('Interrupted fixture')
    control.produced.push(block.id)
    const rgba=new Uint8Array(block.codedWidth*block.codedHeight*4)
    for(let y=0;y<block.codedHeight;y++)for(let x=0;x<block.codedWidth;x++)rgba.set([block.originX+x-block.useful.x,block.originY+y-block.useful.y,73,255],(y*block.codedWidth+x)*4)
    await r.consume({block,rgba,stride:block.codedWidth*4,offset:0});r.onProgress(++count)
  }
}}))
afterEach(()=>{vi.unstubAllGlobals();control.stopAt=-1;control.produced=[]})
function request(store:ExpmapDirectoryStore){
  vi.stubGlobal('navigator',{locks:{request:async(_id:unknown,_opts:unknown,fn:any)=>fn({})}})
  const animation=createDefaultAnimationConfig();Object.values(animation.tracks).forEach(t=>{t.enabled=false})
  return {store,documentId:'progress',plan:planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'1'},width:6,height:4,density:1,blockSize:32}),
    appearance:{colorStops:[{color:'#fff',position:0}],animation,heightPaletteShift:0,phaseColoringStrength:0} as RenderOptions,
    restoreCamera:{cx:'0',cy:'0',scale:'1',angle:0}}
}
describe('TIFF production progress and resume',()=>{
  it('saves whole doublings, packs useful rectangles and reaches total progress',async()=>{
    const store=new ExpmapDirectoryStore(new MemoryDirectory().handle()),r=request(store),progress:any[]=[]
    const m=await createExpmapDocument({engine:{}} as ExpmapProducerDeps,{...r,onProgress:p=>progress.push(p)})
    expect(m.state).toBe('complete');expect(m.tiles.length).toBe(13)
    expect(progress.at(-1)).toMatchObject({done:14,total:14,saved:14})
    expect(progress.every((p,i)=>i===0||p.done>=progress[i-1].done)).toBe(true)
    const rgba=await decodeTiffTile(await store.readTile(m.tiles[0]),m.octaves.tileWidth*m.octaves.tileHeight*4)
    expect(Array.from(rgba.slice((m.octaves.tileWidth+3)*4,(m.octaves.tileWidth+3)*4+4))).toEqual([3,1,73,255])
    expect(m.center).toEqual([0,0,73])
  })
  it('restarts only the unfinished tile, preserving center and committed tiles',async()=>{
    const store=new ExpmapDirectoryStore(new MemoryDirectory().handle()),r=request(store)
    control.stopAt=4
    await expect(createExpmapDocument({engine:{}} as ExpmapProducerDeps,r)).rejects.toThrow('Interrupted')
    const before=await store.open();expect(before.tiles.length).toBe(2);expect(before.center).toEqual([0,0,73])
    control.stopAt=-1;control.produced=[]
    const after=await createExpmapDocument({engine:{}} as ExpmapProducerDeps,{...r,resume:true})
    expect(control.produced[0]).toBe('octave:2:0:0');expect(control.produced).not.toContain('center')
    expect(after.tiles.slice(0,2)).toEqual(before.tiles)
  })
})
