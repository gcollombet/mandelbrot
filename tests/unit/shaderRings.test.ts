import { describe, expect, it } from 'vitest'
import { planShaderRings, renderRingSequence, shaderRingBounds } from '../../src/expmap/displayRings'
import { RingMediaStore, ringVideoRect, ringVideoBitrate } from '../../src/expmap/displayRingMedia'
import { ShaderRingStore } from '../../src/expmap/displayRingStore'
import { planShaderMemory } from '../../src/expmap/displayRenderer'
import { shaderSourceEstimate } from '../../src/expmap/displayFormat'
import { planExpmap } from '../../src/expmap/plan'
import { shaderBlockCount, type ShaderExpmapManifest } from '../../src/expmap/displayFormat'
import { MemoryDirectory } from './expmapFixtures'

class Directory extends MemoryDirectory {
  children=new Map<string,Directory>()
  async getDirectoryHandle(name:string,options?:{create?:boolean}) {
    if(!this.children.has(name)) {
      if(!options?.create)throw new DOMException('Missing','NotFoundError')
      this.children.set(name,new Directory())
    }
    return this.children.get(name)!.handle()
  }
  async removeEntry(name:string) {
    const child=this.children.get(name)
    if(child&&(child.files.size||child.children.size))throw new Error('Not empty')
    this.children.delete(name);this.files.delete(name)
  }
}
const projection=planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'.1'},width:32,height:18,density:1,blockSize:32})
const manifest={projection} as ShaderExpmapManifest

describe('successive polar videos',()=>{
  it('uses the budget beyond four octaves, reserving two, up to the full window',()=>{
    const octave=shaderSourceEstimate(projection).octaveBytes
    const reserve=1920*1080*32
    const fixed=planShaderMemory(manifest,1920,1080,1e9,reserve).fixedBytes
    const partial=planShaderMemory(manifest,1920,1080,fixed+8*octave,reserve)
    expect(partial.usefulOctaves).toBe(6)
    expect(partial.residentOctaves*octave).toBeLessThanOrEqual(partial.cacheBytes)
    expect(planShaderRings(manifest,partial.cacheBytes,partial.usefulOctaves)[0].count).toBe(6)
    const coverage=(projection.centerOctaves??12)+1
    const full=planShaderMemory(manifest,1920,1080,fixed+(coverage+2)*octave,reserve)
    expect(full.usefulOctaves).toBe(coverage)
    expect(full.passes).toBe(1)
    expect(planShaderRings(manifest,full.cacheBytes,full.usefulOctaves)).toHaveLength(1)
  })
  it('finishes all frames of a ring before the next and resumes exactly after publication',async()=>{
    const seen:string[]=[],abort=new AbortController();let next=0
    await expect(renderRingSequence(3,4,{signal:abort.signal,render:async(r,f)=>{seen.push(`${r}:${f}`)},checkpoint:async n=>{next=n;if(n===5)abort.abort()}})).rejects.toThrow()
    expect(seen).toEqual(['0:0','0:1','0:2','0:3','1:0'])
    await renderRingSequence(3,4,{start:next,render:async(r,f)=>{seen.push(`${r}:${f}`)},checkpoint:async n=>{next=n}})
    expect(seen.slice(5)).toEqual(['1:1','1:2','1:3','2:0','2:1','2:2','2:3'])
    expect(next).toBe(12)
  })
  it('partitions every virtual block once with both whole octaves and small caches',()=>{
    for(const cache of [1e9,50000]) {
      const rings=planShaderRings(manifest,cache,4),seen=new Set<string>();let count=0
      for(const r of rings)for(let v=r.first;v<r.first+r.count;v++)for(let b=r.blockStart;b<r.blockStart+r.blockCount;b++) {
        expect(seen.has(`${v}:${b}`)).toBe(false);seen.add(`${v}:${b}`);count++
      }
      // Total source blocks include extra user-domain octaves; derive one tile from a one-octave pass.
      const single=planShaderRings(manifest,1e9,1)
      expect(count).toBe(single.length*single[0].blockCount)
      expect(rings.filter(r=>r.center)).toHaveLength(1)
      expect(shaderBlockCount(projection)).toBeGreaterThan(count)
    }
  })
  it('crops inner rings to shrinking images',()=>{
    const rings=planShaderRings(manifest,1e9,4),view={width:3840,height:2160,scale:'1',angle:0}
    const sizes=rings.map(r=>{const box=shaderRingBounds(manifest,view,r);return box[2]*box[3]})
    expect(sizes[0]).toBe(3840*2160)
    expect(sizes[1]).toBeLessThan(sizes[0]/50)
    expect(sizes[2]).toBeLessThan(sizes[1]/50)
    const deformed=shaderRingBounds(manifest,{...view,effects:{droste:90,kaleidoscope:6,orientation:0}},rings[1])
    expect(deformed[2]*deformed[3]).toBeLessThan(sizes[0]/50)
  })
  it('keeps a fixed even video envelope across the zoom and shrinks inner streams',()=>{
    const rings=planShaderRings(manifest,1e9,4)
    const view={width:1920,height:1080,scale:'1',angle:0}
    const rect=ringVideoRect(manifest,view,rings[1])
    expect(rect.every(n=>n%2===0)).toBe(true)
    expect(ringVideoBitrate(rect,1920,1080,60e6)).toBeLessThan(60e6/10)
    for(const scale of ['1','.9','.71','.51','.5']) {
      const actual=shaderRingBounds(manifest,{...view,scale},rings[1])
      expect(actual[0]).toBeGreaterThanOrEqual(rect[0])
      expect(actual[1]).toBeGreaterThanOrEqual(rect[1])
      expect(actual[0]+actual[2]).toBeLessThanOrEqual(rect[0]+rect[2])
      expect(actual[1]+actual[3]).toBeLessThanOrEqual(rect[1]+rect[3])
    }
    expect(ringVideoRect(manifest,{...view,effects:{radialMode:'mirror'}},rings[1])).toEqual([0,0,1920,1080])
    expect(()=>ringVideoRect(manifest,{...view,width:1919},rings[1])).toThrow('paires')
  })
  it('compresses coverage losslessly, detects corruption and keeps unrelated files',async()=>{
    const directory=new Directory(),store=new RingMediaStore(directory.handle())
    const rect=[0,0,1920,32] as const,alpha=new Uint8Array(rect[2]*rect[3]*2)
    for(let i=1;i<alpha.length;i+=2)alpha[i]=0x3c // f16 1
    await store.writeMask(0,0,rect,alpha)
    await store.checkpoint('compressed',1)
    const ring=directory.children.get('ring-0')!,folder=ring.children.get('masks-0')!
    expect(folder.files.get('0.gz')!.length).toBeLessThan(alpha.length/50)
    expect(await store.readMask(0,0,rect)).toEqual(alpha)
    const original=folder.files.get('0.gz')!.slice()
    folder.files.get('0.gz')![32]^=1
    await expect(store.readMask(0,0,rect)).rejects.toThrow('corrompu')
    folder.files.set('0.gz',original)
    await expect(store.readMask(0,0,[0,0,960,64])).rejects.toThrow('incompatible')
    ring.files.set('color.mp4',new Uint8Array([1]));ring.files.set('personal.txt',new Uint8Array([2]))
    await store.cleanupVideos(1,1)
    expect(ring.files.has('color.mp4')).toBe(false)
    expect(ring.files.has('personal.txt')).toBe(true)
    expect(await store.checkpoint('compressed')).toBe(0)
  })
  it('roundtrips exact half-float bytes, rejects corruption and cleans only its own files',async()=>{
    const directory=new Directory(),store=new ShaderRingStore(directory.handle())
    expect(await store.checkpoint('recipe')).toBe(0)
    const pixels={rect:[1,2,2,1] as const,data:Uint8Array.from({length:16},(_,i)=>i)}
    await store.write(0,0,pixels);await store.checkpoint('recipe',1)
    expect(await store.read(0,0,pixels.rect)).toEqual(pixels)
    expect(await store.checkpoint('recipe')).toBe(1)
    await expect(store.checkpoint('another')).rejects.toThrow('incompatible')
    const frames=directory.children.get('ring-0')!.children.get('frames-0')!
    frames.files.get('0.bin')![35]^=1
    await expect(store.read(0,0,pixels.rect)).rejects.toThrow('corrompue')
    frames.files.set('personal.txt',new Uint8Array([1]))
    await store.cleanup(1,1)
    expect(frames.files.has('0.bin')).toBe(false)
    expect(frames.files.has('personal.txt')).toBe(true)
  })
})
