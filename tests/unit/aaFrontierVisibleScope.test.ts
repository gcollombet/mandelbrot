import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const reseed = read('../../src/assets/aa_reseed.wgsl')

describe('AA frontier visible scope', () => {
  it('passes the current viewport transform to the reseed shader', () => {
    expect(engine).toContain('const aaSceneAngle = this.previousMandelbrot.angle')
    expect(engine).toMatch(
      /aaAnalytic\.enabled \? 1 : 0,\s+aspect, Math\.sin\(aaSceneAngle\), Math\.cos\(aaSceneAngle\)/,
    )
  })

  it('rejects neutral corners before counting or stamping them', () => {
    expect(reseed).toContain('fn is_inside_visible_viewport(')
    expect(reseed).toContain('params.sceneCos * localRot.x + params.sceneSin * localRot.y')
    expect(reseed).toContain('return abs(local.x) <= params.aspect && abs(local.y) <= 1.0;')

    const viewportGate = reseed.indexOf('if (!is_inside_visible_viewport(coord, dim))')
    const targetLoad = reseed.indexOf('let tgtRaw = textureLoad(aaTargetTex, coord).r;')
    const eligibleCount = reseed.indexOf('atomicAdd(&stats.eligible, 1u);')
    const stamp = reseed.indexOf('textureStore(rawIterTex, coord')
    expect(viewportGate).toBeGreaterThan(-1)
    expect(viewportGate).toBeLessThan(targetLoad)
    expect(viewportGate).toBeLessThan(eligibleCount)
    expect(viewportGate).toBeLessThan(stamp)
  })
})
