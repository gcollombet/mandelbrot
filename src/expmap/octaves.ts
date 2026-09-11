import { scaleDoublements, scaleTimesExp } from './decimal'
import type { ExpmapBlock, ExpmapPlan } from './plan'
import { expmapKernelProjection } from './producerProjection'

export const EXPMAP_VISIBLE_OCTAVES = 12
export const EXPMAP_RESIDENT_TILES = 14
export type ExpmapOctaves = {
  angularSamples: number; rowsPerOctave: number; tileWidth: number; tileHeight: number
  tileCount: number; halo: number
}
export type ExpmapTile = { index: number; file: string; length: number; sha256: string }
const align16 = (n: number) => Math.ceil(n / 16) * 16
export function planExpmapOctaves(plan: ExpmapPlan): ExpmapOctaves {
  const angularSamples = plan.angularSamples, rowsPerOctave = Math.ceil(Math.LN2 * plan.density * plan.radius)
  const tileCount = Math.floor(scaleDoublements(plan.domain.startScale, plan.domain.endScale)) + EXPMAP_VISIBLE_OCTAVES + 1
  const halo = 2
  if (!Number.isSafeInteger(tileCount) || tileCount > 1000000) throw new Error('Trop de doublements pour ce document')
  return { angularSamples, rowsPerOctave, tileWidth: align16(angularSamples + 2 * halo),
    tileHeight: align16(rowsPerOctave + 1 + 2 * halo), tileCount, halo }
}
export function octaveMemory(layout: ExpmapOctaves) {
  const tileBytes = layout.tileWidth * layout.tileHeight * 4
  return { tileBytes, gpuBytes: tileBytes * EXPMAP_RESIDENT_TILES, decodeBytes: tileBytes, rawDiskBytes: tileBytes * layout.tileCount }
}
/** One flat tile per doubling, with repeated edge samples for hardware filtering. */
export function* octaveBlocks(plan: ExpmapPlan, firstTile = 0): Generator<ExpmapBlock> {
  const layout = planExpmapOctaves(plan), stride = plan.blockSize - 2 * plan.halo
  for (let tile = firstTile; tile < layout.tileCount; tile++) {
    for (let y = 0; y < layout.rowsPerOctave + 1 + 2 * layout.halo; y += stride) {
      for (let x = 0; x < layout.angularSamples + 2 * layout.halo; x += stride) {
        const width = Math.min(stride, layout.angularSamples + 2 * layout.halo - x)
        const height = Math.min(stride, layout.rowsPerOctave + 1 + 2 * layout.halo - y)
        yield { id: `octave:${tile}:${y}:${x}`, region: 'band', originX: x, originY: y, gridWidth: layout.angularSamples,
          useful: { x: plan.halo, y: plan.halo, width, height },
          codedWidth: Math.ceil((width + 2 * plan.halo)/2)*2, codedHeight: Math.ceil((height + 2 * plan.halo)/2)*2 }
      }
    }
  }
}
export function octaveBlockCount(plan: ExpmapPlan) {
  const o = planExpmapOctaves(plan), stride = plan.blockSize - 2 * plan.halo
  return Math.ceil((o.angularSamples + 2 * o.halo)/stride) * Math.ceil((o.rowsPerOctave + 1 + 2 * o.halo)/stride) * o.tileCount
}
export function octaveProjection(plan: ExpmapPlan, block: ExpmapBlock) {
  const o = planExpmapOctaves(plan), tile = Number(block.id.split(':')[1])
  const localPlan = { ...plan, rhoStep: Math.LN2 / o.rowsPerOctave,
    domain: { ...plan.domain, startScale: scaleTimesExp(plan.domain.startScale, -tile * Math.LN2) } }
  return expmapKernelProjection(localPlan, { ...block, originX: block.originX-o.halo, originY:block.originY-o.halo })
}
/** Fractional windows span 13 tiles; the 14th slot anticipates movement. */
export function octaveWindow(depth: number, count: number, direction = 1, loop = false) {
  const first = Math.max(0, loop ? Math.floor(depth) : Math.min(count-1, Math.floor(depth)))
  const last = loop ? first + EXPMAP_VISIBLE_OCTAVES : Math.min(count-1, first + EXPMAP_VISIBLE_OCTAVES)
  const needed = Array.from({length:last-first+1},(_,i)=>first+i)
  const next = direction >= 0 ? last+1 : first-1
  return { needed, prefetch: next>=0 && (loop || next<count) ? next : undefined }
}
