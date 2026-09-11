import { expect, it } from 'vitest'
import { radialConfig, radialCycle, radialMode, radialOctave } from '../../src/expmap/radial'
import { effectsSettings } from '../../src/expmap/effects'
import { ExpmapTileCache } from '../../src/expmap/tileCache'
import { octaveWindow } from '../../src/expmap/octaves'
const at=(depth:number,c:ReturnType<typeof radialConfig>)=>{
  const tile=radialOctave(Math.floor(depth),c), fraction=depth-Math.floor(depth)
  return tile.source+(tile.reverse?1-fraction:fraction)
}
it('folds depth per sample with continuous ping-pong turnarounds',()=>{
  const c=radialConfig({radialMode:'pingpong',radialTurn:5},20)
  expect(radialCycle(c)).toBe(10)
  expect([0,2,5,7,10,12].map(d=>at(d,c))).toEqual([0,2,5,3,0,2])
  for(const t of [5,10,15]) expect(Math.abs(at(t-1e-7,c)-at(t+1e-7,c))).toBeLessThan(1e-6)
  expect(at(2.25,c)).not.toBe(at(7.25,c))
})
it('distinguishes repeating radial mirrors from progressive octave folds',()=>{
  const radial=radialConfig({radialMode:'radial'},5), folds=radialConfig({radialMode:'folds'},5)
  expect(Array.from({length:6},(_,i)=>at(i+.25,radial))).toEqual([.25,.75,.25,.75,.25,.75])
  expect(Array.from({length:6},(_,i)=>at(i+.25,folds))).toEqual([.25,.75,.25,1.25,1.75,1.25])
})
it('handles a final partial group and wraps after all progressive folds',()=>{
  const c=radialConfig({radialMode:'folds',radialPeriod:2},5)
  expect(radialCycle(c)).toBe(15)
  expect([12.25,13.25,14.25,15.25].map(d=>at(d,c))).toEqual([4.25,4.75,4.25,.25])
  for(let d=0;d<30;d+=.125) expect(at(d,c)).toBeLessThanOrEqual(5)
})
it('migrates legacy looping and validates radial controls',()=>{
  expect(radialMode({loopOctaves:true})).toBe('repeat')
  expect(radialMode({loopOctaves:true,radialMode:'normal'})).toBe('normal')
  for(const value of [0,-1,1.5,NaN])expect(()=>effectsSettings({radialPeriod:value})).toThrow()
})
it('loads mirrored source octaves in a bounded cache and invalidates on mode change',async()=>{
  let config=radialConfig({radialMode:'pingpong',radialTurn:4},15)
  const slots=new Map<number,number>(), reads:number[]=[]
  const cache=new ExpmapTileCache(async i=>{const source=radialOctave(i,config).source;reads.push(source);return source},(slot,source)=>{slots.set(slot,source)})
  const window=octaveWindow(3.25,15,1,true)
  await cache.prepare(window.needed,window.prefetch)
  for(const i of window.needed)expect(slots.get(i%14)).toBe(radialOctave(i,config).source)
  config=radialConfig({radialMode:'folds'},15);cache.invalidate()
  await cache.prepare(window.needed,window.prefetch)
  for(const i of window.needed)expect(slots.get(i%14)).toBe(radialOctave(i,config).source)
  expect(reads).toHaveLength(28);expect(slots.size).toBeLessThanOrEqual(14);cache.dispose()
})

it('keeps the mirror at a constant screen radius with continuous source depth',async()=>{
  const { fixedMirrorWindow }=await import('../../src/expmap/radial')
  for(const depth of [0,.2,1.99,20.25,1000.1])for(const delta of [.25,1,2,6]){
    const count=15, w=fixedMirrorWindow(depth,count,delta), base=Math.floor(w.readDepth)
    const source=(q:number)=>base+w.offset+Math.min(q,2*delta-q)
    expect(Math.abs(source(delta-1e-7)-source(delta+1e-7))).toBeLessThan(1e-6)
    for(let q=0;q<=12;q+=.125){
      const mapped=source(q),relative=mapped-base
      expect(relative).toBeGreaterThanOrEqual(-1e-10)
      expect(relative).toBeLessThan(13)
      const expected=depth+Math.min(q,2*delta-q)
      expect((mapped-expected)/count).toBeCloseTo(Math.round((mapped-expected)/count),8)
    }
    expect(w.readDepth).toBeGreaterThanOrEqual(0)
  }
})
it('reads opposite radial directions on each side of the fixed ring',()=>{
  const delta=2, fold=(q:number)=>Math.min(q,2*delta-q)
  expect(fold(1.1)-fold(1)).toBeCloseTo(.1)
  expect(fold(3.1)-fold(3)).toBeCloseTo(-.1)
  expect(()=>effectsSettings({radialMode:'mirror',mirrorDepth:1})).not.toThrow()
  for(const mirrorDepth of [0,7,NaN])expect(()=>effectsSettings({mirrorDepth})).toThrow('miroir')
})

it('starts ping-pong and radial mirrors at the selected source octave',()=>{
  for(const radialMode of ['pingpong','radial'] as const){
    const c=radialConfig({radialMode,radialStart:7,radialTurn:3,radialPeriod:3},20)
    expect([0,1,3,4,6].map(d=>at(d,c))).toEqual([7,8,10,9,7])
    for(const t of [3,6])expect(Math.abs(at(t-1e-7,c)-at(t+1e-7,c))).toBeLessThan(1e-6)
  }
})
it('bounds the selected range to the document and leaves other modes unchanged',()=>{
  const c=radialConfig({radialMode:'pingpong',radialStart:19,radialTurn:8},20)
  expect(c.period).toBe(1);expect(at(1,c)).toBe(20);expect(at(2,c)).toBe(19)
  expect(radialConfig({radialMode:'folds',radialStart:10},20).start).toBe(0)
  expect(radialConfig({radialMode:'radial'},20).start).toBe(0)
  for(const radialStart of [-1,.5,NaN])expect(()=>effectsSettings({radialStart})).toThrow('Départ')
})
