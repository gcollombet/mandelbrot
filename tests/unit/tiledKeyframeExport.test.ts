import { describe, expect, it } from 'vitest'
import {
  TiledExportBudgetError,
  estimateTiledExportMemory,
  evaluateTiledKeyframeEligibility,
  planKeyframeTiles,
  type TiledExportMemoryProfile,
} from '../../src/tiledKeyframeExport'
import type { VideoPathLocation } from '../../src/videoPath'

const MEMORY: TiledExportMemoryProfile = {
  squareBytesPerTexel: 56,
  tileBytesPerTexel: 120,
}

const LOCATION: VideoPathLocation = {
  cx: '-0.743643887037151',
  cy: '0.13182590420533',
  scale: '1',
  angle: 0,
}

describe('planKeyframeTiles', () => {
  it('uses at least four tiles under a quarter-square tile budget', () => {
    const neutralSide = 1024
    const budgetBytes = neutralSide ** 2 * MEMORY.squareBytesPerTexel
      + 512 ** 2 * MEMORY.tileBytesPerTexel
    const plan = planKeyframeTiles({ neutralSide, alignment: 16, budgetBytes, memory: MEMORY })

    expect(plan.tileSide).toBe(512)
    expect(plan.tiles).toHaveLength(4)
    expect(plan.estimate.totalBytes).toBeLessThanOrEqual(budgetBytes)
  })

  it('uses one logical tile when the full square allocation fits', () => {
    const neutralSide = 1000
    const tileSide = 1008
    const budgetBytes = neutralSide ** 2 * MEMORY.squareBytesPerTexel
      + tileSide ** 2 * MEMORY.tileBytesPerTexel
    const plan = planKeyframeTiles({ neutralSide, alignment: 16, budgetBytes, memory: MEMORY })

    expect(plan.tileSide).toBe(tileSide)
    expect(plan.tiles).toEqual([{ index: 0, originX: 0, originY: 0, width: 1000, height: 1000 }])
  })

  it('is deterministic', () => {
    const input = { neutralSide: 997, alignment: 16, budgetBytes: 90_000_000, memory: MEMORY }
    expect(planKeyframeTiles(input)).toEqual(planKeyframeTiles(input))
  })

  it('partitions non-divisible borders exactly once', () => {
    const neutralSide = 1000
    const budgetBytes = neutralSide ** 2 * MEMORY.squareBytesPerTexel
      + 384 ** 2 * MEMORY.tileBytesPerTexel
    const plan = planKeyframeTiles({ neutralSide, alignment: 16, budgetBytes, memory: MEMORY })

    expect(plan.tileSide).toBe(384)
    expect(plan.tiles.at(-1)).toEqual({ index: 8, originX: 768, originY: 768, width: 232, height: 232 })
    expect(plan.tiles.reduce((area, tile) => area + tile.width * tile.height, 0)).toBe(neutralSide ** 2)
  })

  it('reports the minimum when even one workgroup cannot fit beside the keyframes', () => {
    const squareBytes = 1024 ** 2 * MEMORY.squareBytesPerTexel
    expect(() => planKeyframeTiles({
      neutralSide: 1024,
      alignment: 16,
      budgetBytes: squareBytes,
      memory: MEMORY,
    })).toThrow(TiledExportBudgetError)

    try {
      planKeyframeTiles({ neutralSide: 1024, alignment: 16, budgetBytes: squareBytes, memory: MEMORY })
    } catch (error) {
      expect((error as TiledExportBudgetError).minimumBudgetBytes)
        .toBe(squareBytes + 16 ** 2 * MEMORY.tileBytesPerTexel)
    }
  })
})

describe('estimateTiledExportMemory', () => {
  it('separates square and tile allocations', () => {
    expect(estimateTiledExportMemory(100, 32, 16, MEMORY)).toMatchObject({
      squareBytes: 100 ** 2 * 56,
      tileBytes: 32 ** 2 * 120,
      totalBytes: 100 ** 2 * 56 + 32 ** 2 * 120,
    })
  })
})

describe('evaluateTiledKeyframeEligibility', () => {
  it('accepts a fixed-centre zoom with rotation', () => {
    expect(evaluateTiledKeyframeEligibility({
      from: LOCATION,
      to: { ...LOCATION, scale: '1e-9', angle: 1.2 },
      aaSamplesPerFrame: 1,
    })).toEqual({ eligible: true, problems: [] })
  })

  it('refuses jittered AA', () => {
    const result = evaluateTiledKeyframeEligibility({
      from: LOCATION,
      to: { ...LOCATION, scale: '1e-9' },
      aaSamplesPerFrame: 4,
    })
    expect(result.eligible).toBe(false)
    expect(result.problems.join(' ')).toContain('pures lectures')
  })

  it('refuses travelling', () => {
    const result = evaluateTiledKeyframeEligibility({
      from: LOCATION,
      to: { ...LOCATION, cx: '-0.5', scale: '1e-9' },
      aaSamplesPerFrame: 1,
    })
    expect(result.eligible).toBe(false)
    expect(result.problems.join(' ')).toContain('travelling')
  })
})
