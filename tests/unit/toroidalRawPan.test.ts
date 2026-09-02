import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const brush = read('../../src/assets/mandelbrot_brush.wgsl')
const resolve = read('../../src/assets/resolve.wgsl')
const color = read('../../src/assets/color.wgsl')
const reseed = read('../../src/assets/aa_reseed.wgsl')
const panClear = read('../../src/assets/raw_pan_clear.wgsl')

describe('toroidal raw pan (origin shift instead of reprojection copy)', () => {
  it('routes every raw access of the iteration kernel through the toroidal origin', () => {
    expect(brush).toContain('rawOriginX: f32')
    expect(brush).toContain('fn raw_coord(coord: vec2<i32>) -> vec2<i32>')
    expect(brush).toContain('return textureLoad(raw, raw_coord(coord), layer).r;')
    expect(brush).toContain('let coord = raw_coord(logicalCoord);')
    // No direct raw access may bypass the wrap.
    expect(brush.match(/textureLoad\(raw, /g)?.length).toBe(1)
    expect(brush).not.toMatch(/textureStore\(raw, logicalCoord/)
  })

  it('wraps the other raw readers with the same origin', () => {
    expect(resolve).toContain('return textureLoad(rawTex, raw_coord(coord), layer, 0).r;')
    expect(color).toContain('fn raw_coord(coord: vec2<i32>) -> vec2<i32>')
    expect(color).not.toMatch(/textureLoad\(rawTex, sourceCoord,/)
    expect(reseed).toContain('textureStore(rawIterTex, raw_coord(coord)')
    expect(reseed).toContain('textureLoad(payloadTex, rawCoord, 0, 0)')
  })

  it('stamps only the wrapped-in strip on a pan and keeps the clear path on B', () => {
    expect(panClear).toContain('@group(0) @binding(1) var raw: texture_storage_2d_array<r32float, write>;')
    expect(panClear).toContain('let startX = select(dims.x - widthX, 0, shift.x > 0);')
    expect(panClear).toContain('let startY = select(dims.y - widthY, 0, shift.y > 0);')
    expect(engine).toContain('this.rawOriginX = (((this.rawOriginX - roundedShiftTexX) % n) + n) % n')
    expect(engine).toContain('Math.ceil(stripX / 16) + Math.ceil(stripY / 16)')
    // A clear still rewrites B wholesale and swaps it in at origin 0.
    const clearBranch = engine.indexOf('if (this.clearHistoryNextFrame) {\n                // Clear frames rewrite B wholesale')
    const panBranch = engine.indexOf('} else if (utilityNeeded) {')
    expect(clearBranch).toBeGreaterThan(-1)
    expect(panBranch).toBeGreaterThan(clearBranch)
    expect(engine.slice(clearBranch, panBranch)).toContain('this.swapRawTextures()')
    expect(engine.slice(panBranch, panBranch + 1500)).not.toContain('swapRawTextures')
  })

  it('keeps every raw-origin consumer uniform in sync', () => {
    expect(engine).toContain('const COLOR_UNIFORM_RAW_ORIGIN_SLOT = 96')
    expect(engine).toContain('this.rawOriginX,                      // 96: raw toroidal origin X')
    expect(engine).toContain('this.rawOriginX, this.rawOriginY,')
    expect(engine).toContain('tiledTile?.originX ?? 0, tiledTile?.originY ?? 0,')
    expect(engine).toMatch(/uniformBufferResolve = this\.device\.createBuffer\(\{\s+size: 4 \* 12,/)
  })

  it('scissors the resolve pass to the padded dispatch box', () => {
    expect(engine).toContain('rpassResolve.setScissorRect(scissor.x, scissor.y, scissor.width, scissor.height)')
    expect(engine).toContain('private resolveScissorRect() {')
  })
})
