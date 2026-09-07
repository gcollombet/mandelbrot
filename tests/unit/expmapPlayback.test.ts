import { describe, expect, it } from 'vitest'
import { advanceExpmapPlayback, expmapTimeLabel } from '../../src/expmap/playback'
describe('ExpMap transport', () => {
  it('advances by elapsed time, respecting speed and direction', () => {
    expect(advanceExpmapPlayback(.25, 1, 10, 2, 1, false).position).toBeCloseTo(.45)
    expect(advanceExpmapPlayback(.25, 1, 10, 2, -1, false).position).toBeCloseTo(.05)
    const slowFrame = advanceExpmapPlayback(0, .5, 10, 1, 1, false)
    let position = 0
    for (let i = 0; i < 5; i++) position = advanceExpmapPlayback(position, .1, 10, 1, 1, false).position
    expect(position).toBeCloseTo(slowFrame.position)
  })
  it('stops exactly at either endpoint and handles looping in both directions', () => {
    expect(advanceExpmapPlayback(.9, 2, 10, 1, 1, false)).toEqual({position: 1, ended: true})
    expect(advanceExpmapPlayback(.1, 2, 10, 1, -1, false)).toEqual({position: 0, ended: true})
    expect(advanceExpmapPlayback(.9, 2, 10, 1, 1, true).position).toBeCloseTo(.1)
    expect(advanceExpmapPlayback(.1, 2, 10, 1, -1, true).position).toBeCloseTo(.9)
    expect(advanceExpmapPlayback(.1, 100, 10, 1, -1, true).ended).toBe(false)
  })
  it('formats timeline time without rounding up the next second', () => {
    expect(expmapTimeLabel(65.9)).toBe('1:05'); expect(expmapTimeLabel(0)).toBe('0:00')
  })
})
