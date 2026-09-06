import { describe, expect, it } from 'vitest'
import { canonicalDomain, planExpmap } from '../../src/expmap/plan'
import { octaveBlocks, octaveBlockCount, planExpmapOctaves } from '../../src/expmap/octaves'
const domain={cx:'0',cy:'0',startScale:'2e-1000',endScale:'1e-1000'}
describe('regular octave plan',()=>{
  it('keeps angular and logarithmic sample spacing within the density bound',()=>{
    const p=planExpmap({domain,width:12,height:8,density:2})
    expect(2*Math.PI*p.radius/p.angularSamples).toBeLessThanOrEqual(1/p.density)
    expect(p.rhoStep).toBeLessThanOrEqual(1/(p.density*p.radius))
    expect(planExpmapOctaves(p).tileCount).toBe(14)
  })
  it('covers each tile and its filtering halos exactly once in bounded blocks',()=>{
    const p=planExpmap({domain,width:12,height:8,density:2,blockSize:32}),o=planExpmapOctaves(p)
    const blocks=[...octaveBlocks(p)],covered=new Set<string>()
    expect(blocks.length).toBe(octaveBlockCount(p))
    for(const b of blocks){
      expect(b.codedWidth).toBeLessThanOrEqual(p.blockSize);expect(b.codedHeight).toBeLessThanOrEqual(p.blockSize)
      for(let y=0;y<b.useful.height;y++)for(let x=0;x<b.useful.width;x++){
        const key=`${b.id.split(':')[1]}:${b.originY+y}:${b.originX+x}`
        expect(covered.has(key)).toBe(false);covered.add(key)
      }
    }
    expect(covered.size).toBe(o.tileCount*(o.angularSamples+2*o.halo)*(o.rowsPerOctave+1+2*o.halo))
  })
  it('does not extend user navigation bounds, including stationary or deep documents',()=>{
    const p=planExpmap({domain:{...domain,startScale:domain.endScale},width:12,height:8,density:1})
    expect(planExpmapOctaves(p).tileCount).toBe(13);expect(p.domain.startScale).toBe(p.domain.endScale)
    const deep=planExpmap({domain:{...domain,endScale:'1e-100000'},width:12,height:8,density:1})
    expect(octaveBlocks(deep).next().done).toBe(false)
    expect(()=>canonicalDomain({...domain,startScale:'1e-1001'})).toThrow('coarse to fine')
  })
})
