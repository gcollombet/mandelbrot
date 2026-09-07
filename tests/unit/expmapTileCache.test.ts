import { describe, expect, it, vi } from 'vitest'
import { ExpmapTileCache } from '../../src/expmap/tileCache'
import { octaveMemory, octaveWindow, planExpmapOctaves } from '../../src/expmap/octaves'
import { planExpmap } from '../../src/expmap/plan'

describe('14 tile circular cache',()=>{
  it('reuses every resident tile and slides forward and backward without extra reads',async()=>{
    const reads:number[]=[], uploads=new Map<number,number>()
    const cache=new ExpmapTileCache(async i=>{reads.push(i);return new Uint8Array([i])},(slot,b)=>uploads.set(slot,b[0]))
    for(const depth of [0.5,0.6,1.2,2.2,1.5]) {
      const w=octaveWindow(depth,50); await cache.prepare(w.needed,w.prefetch)
      for(const i of w.needed)expect(uploads.get(i%14)).toBe(i)
      expect(uploads.size).toBeLessThanOrEqual(14)
    }
    expect(reads).toEqual(Array.from({length:15},(_,i)=>i))
  })
  it('never uploads a stale prefetch into a newly needed slot after a seek',async()=>{
    let release:()=>void=()=>{}; const gate=new Promise<void>(r=>{release=r})
    const uploads:number[]=[], reads:number[]=[]
    const cache=new ExpmapTileCache(async i=>{reads.push(i);if(i===13)await gate;return new Uint8Array([i])},(_slot,b)=>uploads.push(b[0]))
    await cache.prepare(octaveWindow(0,100).needed,13); cache.prefetch(13)
    const seek=cache.prepare(octaveWindow(28,100).needed,41)
    release(); await seek
    expect(uploads).not.toContain(13); expect(cache.resident(28)).toBe(true)
    expect(reads.filter(i=>i===13)).toHaveLength(1)
  })
  it('does not make an already resident frame wait for a prefetch',async()=>{
    let release:()=>void=()=>{}; const gate=new Promise<void>(r=>{release=r})
    const cache=new ExpmapTileCache(async i=>{if(i===13)await gate;return new Uint8Array([i])},()=>{})
    const w=octaveWindow(0.5,100);await cache.prepare(w.needed,w.prefetch);cache.prefetch(w.prefetch)
    await cache.prepare(w.needed,w.prefetch);release();cache.dispose()
  })
  it('budgets 4K x1 explicitly and keeps the center cutoff below a pixel',()=>{
    const plan=planExpmap({domain:{cx:'0',cy:'0',startScale:'4',endScale:'1'},width:3840,height:2160,density:1})
    const o=planExpmapOctaves(plan), memory=octaveMemory(o)
    expect(o.tileCount).toBe(15);expect(o.tileWidth%16).toBe(0);expect(o.tileHeight%16).toBe(0)
    expect(memory.gpuBytes/1073741824).toBeCloseTo(1.11,2)
    expect(plan.radius/4096).toBeLessThan(1)
    for(let depth=0;depth<=2;depth+=.1)expect(octaveWindow(depth,o.tileCount).needed.length).toBeLessThanOrEqual(13)
  })
})

it('releases a native image when stale prefetch finishes without upload',async()=>{
  let finish!:(value:{close:()=>void})=>void
  const upload=vi.fn(),close=vi.fn()
  const cache=new ExpmapTileCache(()=>new Promise<{close:()=>void}>(resolve=>{finish=resolve}),upload,image=>image.close())
  const pending=cache.prepare([0])
  await Promise.resolve()
  cache.dispose();finish({close})
  await expect(pending).rejects.toThrow()
  expect(upload).not.toHaveBeenCalled();expect(close).toHaveBeenCalledOnce()
})
