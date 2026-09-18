import { describe, expect, it } from 'vitest'
import { centredCropForRatio, planStillTiles, scaleDecimalStringByPow2, stillAspectRatio, stillPresetDimensions, STILL_MAX_GRID } from '../../src/stillExport'

describe('planStillTiles', () => {
  it('keeps a single tile when the working square fits the device', () => {
    const plan = planStillTiles(4096, 3072, 16384)
    expect(plan.grid).toBe(1)
    expect(plan.tiles).toHaveLength(1)
    expect(plan.tiles[0]).toMatchObject({ originX: 0, originY: 0, width: 4096, height: 3072 })
  })

  it('splits into the smallest power-of-two grid whose tiles fit', () => {
    // 8192×6144 → neutral side 10240 > 8192 → 2×2 tiles of 4096×3072 (5120 ≤ 8192).
    const plan = planStillTiles(8192, 6144, 8192)
    expect(plan.grid).toBe(2)
    expect(plan.tiles.map(t => [t.col, t.row, t.originX, t.originY])).toEqual([
      [0, 0, 0, 0], [1, 0, 4096, 0], [0, 1, 0, 3072], [1, 1, 4096, 3072],
    ])
    expect(plan.tiles.every(t => t.width === 4096 && t.height === 3072)).toBe(true)
  })

  it('refuses sizes a chosen grid cannot divide exactly', () => {
    expect(() => planStillTiles(8192, 6145, 8192)).toThrow(/divisible/)
  })

  it('a size rounded to STILL_MAX_GRID divides every grid the planner picks', () => {
    for (const limit of [512, 1024, 2048, 4096, 8192, 16384]) {
      const height = Math.round(8192 / (16 / 9) / STILL_MAX_GRID) * STILL_MAX_GRID
      const plan = planStillTiles(8192, height, limit)
      expect(plan.tiles.length).toBe(plan.grid * plan.grid)
      expect(plan.tiles[plan.tiles.length - 1].originX + plan.tiles[0].width).toBe(8192)
      expect(plan.tiles[plan.tiles.length - 1].originY + plan.tiles[0].height).toBe(height)
    }
  })
})

describe('scaleDecimalStringByPow2', () => {
  it('halves plain and scientific decimals exactly', () => {
    expect(Number(scaleDecimalStringByPow2('1', 0.5))).toBe(0.5)
    expect(Number(scaleDecimalStringByPow2('0.25', 0.5))).toBe(0.125)
    expect(Number(scaleDecimalStringByPow2('3e-5', 0.25))).toBeCloseTo(7.5e-6, 20)
    expect(Number(scaleDecimalStringByPow2('-1.5', 2))).toBe(-3)
  })

  it('stays exact far below f64 range', () => {
    // 1e-400 halved: mantissa 5, exponent −401. No float ever touches the digits.
    expect(scaleDecimalStringByPow2('1e-400', 0.5)).toBe('5e-401')
    expect(scaleDecimalStringByPow2('0.000000000000000000000000000000000465', 0.5))
      .toBe('2325e-37')
  })

  it('rejects non power-of-two factors', () => {
    expect(() => scaleDecimalStringByPow2('1', 3)).toThrow(/power of two/)
  })
})

describe('aspect helpers', () => {
  it('follows the window ratio or the fixed one', () => {
    expect(stillAspectRatio('window', 1.7)).toBe(1.7)
    expect(stillAspectRatio('1:1', 1.7)).toBe(1)
    expect(stillAspectRatio('16:9', 1.7)).toBeCloseTo(16 / 9)
    expect(stillAspectRatio('4:3', 1.7)).toBeCloseTo(4 / 3)
  })

  it('preset heights are multiples of the max grid', () => {
    expect(stillPresetDimensions(4096, 1)).toEqual({ width: 4096, height: 4096 })
    expect(stillPresetDimensions(4096, 16 / 9)).toEqual({ width: 4096, height: 2304 })
    expect(stillPresetDimensions(4096, 4 / 3)).toEqual({ width: 4096, height: 3072 })
    for (const w of [1024, 2048, 4096, 8192]) {
      for (const r of [1, 16 / 9, 4 / 3, 2.37]) {
        expect(stillPresetDimensions(w, r).height % STILL_MAX_GRID).toBe(0)
      }
    }
  })

  it('crops the centre of a surface to a ratio', () => {
    expect(centredCropForRatio(1920, 1080, 16 / 9)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
    expect(centredCropForRatio(1920, 1080, 1)).toEqual({ x: 420, y: 0, width: 1080, height: 1080 })
    expect(centredCropForRatio(1000, 1000, 16 / 9)).toEqual({ x: 0, y: 218, width: 1000, height: 563 })
    expect(centredCropForRatio(1920, 1080, 4 / 3)).toEqual({ x: 240, y: 0, width: 1440, height: 1080 })
  })
})
