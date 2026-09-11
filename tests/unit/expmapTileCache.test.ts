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
    expect(reads).toEqual(Array.from({length:16},(_,i)=>i))
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

it('never publishes partial uploads and invalidates a reused layer before copying',async()=>{
  let finish!:()=>void, started!:()=>void
  const uploading=new Promise<void>(r=>{started=r})
  const released:number[]=[]
  const cache=new ExpmapTileCache(async i=>i,async(_slot,i,context)=>{
    if(i===14) {started();await new Promise<void>(r=>{finish=r});expect(context.isRequired()).toBe(true)}
  },i=>released.push(i))
  await cache.prepare([0]);expect(cache.resident(0)).toBe(true)
  const next=cache.prepare([14]);await uploading
  expect(cache.resident(0)).toBe(false);expect(cache.resident(14)).toBe(false)
  finish();await next;expect(cache.resident(14)).toBe(true);expect(released).toEqual([0,14])
})

it('aborts a partial prefetch on seek and lets the new window proceed',async()=>{
  let started!:()=>void
  const uploading=new Promise<void>(r=>{started=r}),release=vi.fn()
  const cache=new ExpmapTileCache(async i=>i,async(_slot,i,context)=>{
    if(i===13) {started();await new Promise<void>((_resolve,reject)=>context.signal.addEventListener('abort',()=>reject(context.signal.reason),{once:true}))}
  },release)
  await cache.prepare([0],13);cache.prefetch(13);await uploading
  await cache.prepare([27])
  expect(cache.resident(13)).toBe(false);expect(cache.resident(27)).toBe(true)
  expect(release.mock.calls.filter(([i])=>i===13)).toHaveLength(1)
})

it('decodes the next octave while the previous upload is held',async()=>{
  let finish!:()=>void,started!:()=>void
  const uploading=new Promise<void>(r=>started=r),reads:number[]=[],released:number[]=[]
  const cache=new ExpmapTileCache(async i=>{reads.push(i);return i},async(_slot,i)=>{
    if(i===0){started();await new Promise<void>(r=>finish=r)}
  },i=>released.push(i))
  const preparing=cache.prepare([0,1]);await uploading
  expect(reads).toEqual([0,1]);expect(cache.resident(0)).toBe(false)
  finish();await preparing;cache.dispose();expect(released).toEqual([0,1])
})

it('reuses physical sources in other GPU layers without reading them again',async()=>{
  const read=vi.fn(async i=>i),copy=vi.fn(async()=>{})
  const cache=new ExpmapTileCache(read,()=>{},()=>{},{key:i=>i%2,copy})
  await cache.prepare([0]);await cache.prepare([2]);await cache.prepare([14])
  expect(read).toHaveBeenCalledTimes(1);expect(copy).toHaveBeenCalledWith(0,2)
  expect(cache.resident(14)).toBe(true)
})

it('cancels a decoded lookahead when a seek supersedes it',async()=>{
  const signals:AbortSignal[]=[],released:number[]=[]
  const cache=new ExpmapTileCache(async(i,signal)=>{
    if(i===1) {signals.push(signal!);await new Promise<void>((_,reject)=>signal!.addEventListener('abort',()=>reject(signal!.reason),{once:true}))}
    return i
  },()=>{},i=>released.push(i))
  await cache.prepare([0],1)
  await cache.prepare([28])
  expect(signals[0].aborted).toBe(true);expect(cache.resident(28)).toBe(true)
  cache.dispose();expect(released).toEqual([0,28])
})

it('updates priorities immediately while the old render is still loading',async()=>{
  let started!:()=>void
  const loading=new Promise<void>(r=>started=r)
  const cache=new ExpmapTileCache(async(i,signal)=>{
    if(i===0) {started();await new Promise<void>((_,reject)=>signal!.addEventListener('abort',()=>reject(signal!.reason),{once:true}))}
    return i
  },()=>{})
  const old=cache.prepare([0]);await loading
  const failed=expect(old).rejects.toThrow('Vue remplacée')
  cache.setWindow([28]);await failed
  await cache.prepare([28]);expect(cache.resident(28)).toBe(true)
})
