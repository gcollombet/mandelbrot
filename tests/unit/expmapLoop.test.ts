import { expect, it } from 'vitest'
import { expmapLoopDomain, expmapSourceOctave } from '../../src/expmap/loop'
import { octaveWindow } from '../../src/expmap/octaves'
import { ExpmapTileCache } from '../../src/expmap/tileCache'
import { fixtureManifest } from './expmapFixtures'
import { scaleDoublements } from '../../src/expmap/decimal'
import { validateExpmapView } from '../../src/expmap/renderer'
import { expmapVideoDefaults, changeExpmapWindow, validateExpmapVideoWindow } from '../../src/expmap/video'
it('wraps source octaves without colliding in the 14 GPU slots at a non-multiple period', async () => {
  const count = 15, uploads = new Map<number, number>(), reads: number[] = []
  const cache = new ExpmapTileCache(async index => {
    const source = expmapSourceOctave(index, count); reads.push(source); return source
  }, (slot, source) => { uploads.set(slot, source) })
  for (const depth of [13.9, 14.9, 15, 15.1, 30.2, 14.5]) {
    const window = octaveWindow(depth, count, depth < 15 ? -1 : 1, true)
    await cache.prepare(window.needed, window.prefetch)
    expect(window.needed).toHaveLength(13)
    for (const index of window.needed) expect(uploads.get(index % 14)).toBe(index % count)
    expect(uploads.size).toBeLessThanOrEqual(14)
  }
  expect(reads).toContain(0)
  expect(reads.every(i => i >= 0 && i < count)).toBe(true)
  cache.dispose()
})
it('uses every stored octave for one period and keeps ordinary domain validation', async () => {
  const m = await fixtureManifest(); m.state = 'complete'
  const domain = expmapLoopDomain(m, { loopOctaves: true })
  expect(scaleDoublements(domain.startScale, domain.endScale)).toBeCloseTo(m.octaves.tileCount, 8)
  const view = { width: m.projection.width, height: m.projection.height, angle: 0, scale: domain.endScale }
  expect(() => validateExpmapView(m.projection, view)).toThrow('domaine')
  const effects = { droste: 0, kaleidoscope: 0, orientation: 0, loopOctaves: true }
  expect(() => validateExpmapView(m.projection, { ...view, effects })).not.toThrow()
  const window = changeExpmapWindow(expmapVideoDefaults(m), domain.startScale, domain.endScale)
  expect(() => validateExpmapVideoWindow(m, window)).toThrow('domaine')
  expect(() => validateExpmapVideoWindow(m, window, effects)).not.toThrow()
  expect(expmapLoopDomain(m)).toBe(m.projection.domain)
})
it('wraps repeatedly even when the document has fewer octaves than the visible window', async () => {
  const slots = new Map<number, number>()
  const cache = new ExpmapTileCache(async i => expmapSourceOctave(i, 3), (slot, source) => { slots.set(slot, source) })
  const window = octaveWindow(2.5, 3, 1, true)
  await cache.prepare(window.needed, window.prefetch)
  for (const i of window.needed) expect(slots.get(i % 14)).toBe(i % 3)
  cache.dispose()
})
