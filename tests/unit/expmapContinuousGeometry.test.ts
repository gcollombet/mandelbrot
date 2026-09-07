import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { planExpmap, type ExpmapPlan } from '../../src/expmap/plan'
import { octaveBlocks, octaveProjection, planExpmapOctaves } from '../../src/expmap/octaves'
import { scaleDoublements } from '../../src/expmap/decimal'

function representations(plan: ExpmapPlan, tile: number, row: number) {
  const o = planExpmapOctaves(plan)
  return [...octaveBlocks(plan)].filter(b => Number(b.id.split(':')[1]) === tile && b.originX === 0).flatMap(block => {
    const y = row - block.originY + block.useful.y + o.halo
    if (y < 0 || y >= block.codedHeight) return []
    const projection = octaveProjection(plan, block)
    const anchor = -scaleDoublements(plan.domain.startScale, projection.scale) * Math.LN2
    // Emulate the f32 per-invocation row correction; the decimal anchor stays
    // relative so arbitrarily deep camera exponents do not underflow on CPU.
    const offset = Math.fround(-Math.fround(y) * projection.uniforms[6])
    return [{ anchor, continuous: anchor + offset }]
  })
}
describe('continuous ExpMap geometry convention', () => {
  it.each(['1e-20', '1e-10000'])('removes the block boundary jump before gradient clipping at %s', startScale => {
    const p = planExpmap({domain:{cx:'0',cy:'0',startScale,endScale:startScale},width:128,height:96,density:1,blockSize:32})
    const samples = representations(p, 5, 26)
    expect(samples.length).toBe(2)
    expect(Math.abs(samples[0].anchor-samples[1].anchor)).toBeGreaterThan(.1)
    expect(samples[0].continuous).toBeCloseTo(samples[1].continuous, 6)
    const reference = samples[0].continuous
    const geometry = (scale: number) => {
      const ratio = Math.exp(scale-reference)
      return [Math.min(64,100*ratio),Math.min(64,50*ratio),Math.min(64,20*ratio*ratio),scale-reference]
    }
    geometry(samples[0].continuous).forEach((v,i)=>expect(v).toBeCloseTo(geometry(samples[1].continuous)[i],4))
  })
  it('is independent of block size, density and octave boundary ownership', () => {
    const results: number[] = []
    for (const blockSize of [32,128,512]) for (const density of [1,2]) {
      const p = planExpmap({domain:{cx:'0',cy:'0',startScale:'1e-1000',endScale:'1e-1000'},width:128,height:96,density,blockSize})
      const o = planExpmapOctaves(p)
      for (const s of [...representations(p,5,o.rowsPerOctave),...representations(p,6,0)]) results.push(s.continuous)
    }
    for (const value of results) expect(value).toBeCloseTo(Math.log(2*Math.hypot(128,96)/2/96)-6*Math.LN2,6)
  })
  it('wires the correction before clipping into shallow/deep height and all analytic gradients', () => {
    const shader=readFileSync(new URL('../../src/assets/mandelbrot_brush.wgsl',import.meta.url),'utf8')
    expect(shader).toContain('expmapAppearanceLogScaleOffset = -f32(gid.y) * brush.expmapRhoStep')
    expect(shader).toContain('if (brush.expmapMode < 0.5) { return 0.0; }')
    expect(shader.match(/\+ appearance_log_texel_adjustment\(\)/g)).toHaveLength(2)
    for (const name of ['distance_height','distance_height_deep']) {
      const body=shader.slice(shader.indexOf(`fn ${name}(`)).split('\n}')[0]
      expect(body.indexOf('expmapAppearanceLogScaleOffset')).toBeLessThan(body.indexOf('return clamp'))
    }
  })
})
