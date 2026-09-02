import { describe, expect, it } from 'vitest'
import {
  neutralUvForTileTexel,
  planKeyframeTiles,
  type KeyframeTile,
} from '../../src/tiledKeyframeExport'

const SIDE = 128
const MEMORY = { squareBytesPerTexel: 56, tileBytesPerTexel: 144 }
const plan = planKeyframeTiles({
  neutralSide: SIDE,
  alignment: 16,
  budgetBytes: SIDE ** 2 * 56 + 64 ** 2 * 144,
  memory: MEMORY,
})

function linearPixel(u: number, v: number): [number, number, number, number] {
  const x = Math.fround(u * 2 - 1)
  const y = Math.fround(v * 2 - 1)
  return [Math.fround(x * x), Math.fround(y * y), Math.fround(x * y), 1]
}

function renderMonolithic(): Float32Array {
  const image = new Float32Array(SIDE * SIDE * 4)
  for (let y = 0; y < SIDE; y++) for (let x = 0; x < SIDE; x++) {
    image.set(linearPixel((x + 0.5) / SIDE, 1 - (y + 0.5) / SIDE), (y * SIDE + x) * 4)
  }
  return image
}

function renderTile(tile: KeyframeTile, destination: Float32Array): void {
  for (let localY = 0; localY < tile.height; localY++) {
    for (let localX = 0; localX < tile.width; localX++) {
      const [u, v] = neutralUvForTileTexel(localX, localY, tile, SIDE)
      const x = tile.originX + localX
      const y = tile.originY + localY
      destination.set(linearPixel(u, v), (y * SIDE + x) * 4)
    }
  }
}

describe('tiled keyframe image equivalence', () => {
  it('matches the reduced linear image exactly with four tiles', () => {
    expect(plan.tiles).toHaveLength(4)
    const tiled = new Float32Array(SIDE * SIDE * 4)
    for (const tile of plan.tiles) renderTile(tile, tiled)
    expect(tiled).toEqual(renderMonolithic())
  })

  it('matches separately in eight-pixel bands around every tile boundary', () => {
    const mono = renderMonolithic()
    const tiled = new Float32Array(mono.length)
    for (const tile of plan.tiles) renderTile(tile, tiled)
    const boundary = plan.tileSide
    for (let y = 0; y < SIDE; y++) for (let x = 0; x < SIDE; x++) {
      if (Math.abs(x - boundary) > 8 && Math.abs(y - boundary) > 8) continue
      const offset = (y * SIDE + x) * 4
      expect([...tiled.slice(offset, offset + 4)]).toEqual([...mono.slice(offset, offset + 4)])
    }
  })

  it('the rotation-union disc covers every sampled rotated viewport texel', () => {
    const aspect = 16 / 9
    const extent = Math.sqrt(aspect * aspect + 1)
    for (let sample = 0; sample <= 24; sample++) {
      const angle = (Math.PI / 2) * sample / 24
      const c = Math.cos(angle)
      const s = Math.sin(angle)
      for (const [sx, sy] of [[-aspect, -1], [aspect, -1], [-aspect, 1], [aspect, 1]]) {
        const nx = (c * sx - s * sy) / extent
        const ny = (s * sx + c * sy) / extent
        expect(nx * nx + ny * ny).toBeLessThanOrEqual(1 + 1e-12)
      }
    }
  })
})
