import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { neutralUvForTileTexel, planKeyframeTiles } from '../../src/tiledKeyframeExport'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shaders = [
  '../../src/assets/mandelbrot_brush.wgsl',
  '../../src/assets/reproject_cs.wgsl',
  '../../src/assets/raw_pan_clear.wgsl',
  '../../src/assets/aa_target.wgsl',
  '../../src/assets/aa_reseed.wgsl',
  '../../src/assets/resolve.wgsl',
].map(read)

describe('tiled keyframe shader projection contract', () => {
  it('carries tile origin and full neutral side through every field pass', () => {
    for (const shader of shaders) {
      expect(shader).toContain('tileOriginX: f32')
      expect(shader).toContain('tileOriginY: f32')
      expect(shader).toContain('neutralSide: f32')
    }
  })

  it('projects brush, AA and resolve coordinates from the global integer texel', () => {
    for (const path of [
      '../../src/assets/mandelbrot_brush.wgsl',
      '../../src/assets/aa_target.wgsl',
      '../../src/assets/aa_reseed.wgsl',
      '../../src/assets/resolve.wgsl',
    ]) {
      const shader = read(path)
      expect(shader).toMatch(/globalCoord[^\n]*tileOriginX[^\n]*tileOriginY/)
      expect(shader).toMatch(/\/ (?:brush|params|uni)\.neutralSide/)
    }
  })

  it('uses the conservative rotated-cycle union without moving the camera', () => {
    const brush = read('../../src/assets/mandelbrot_brush.wgsl')
    const resolve = read('../../src/assets/resolve.wgsl')
    expect(brush).toContain('rotationUnion: f32')
    expect(brush).toContain('dot(xy_neutral, xy_neutral) <= 1.0')
    expect(resolve).toContain('dot(xyNeutral, xyNeutral) <= 1.0')
  })

  it('maps one full-size tile bit-for-bit like the monolithic integer formula', () => {
    const plan = planKeyframeTiles({
      neutralSide: 1000,
      alignment: 16,
      budgetBytes: 1000 ** 2 * 56 + 1008 ** 2 * 144,
      memory: { squareBytesPerTexel: 56, tileBytesPerTexel: 144 },
    })
    expect(plan.tiles).toHaveLength(1)
    for (const [x, y] of [[0, 0], [499, 501], [999, 999]]) {
      expect(neutralUvForTileTexel(x, y, plan.tiles[0], 1000)).toEqual([
        (x + 0.5) / 1000,
        1 - (y + 0.5) / 1000,
      ])
    }
  })
})
