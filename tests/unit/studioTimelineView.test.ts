import { describe, expect, it } from 'vitest'
import { centerOn, clampView, revealTime, rulerStep, snapTime, viewSpan, zoomAround } from '../../src/studioTimelineView'

describe('studio timeline view', () => {
    it('fits the whole parcours at zoom 1 and clamps the window', () => {
        expect(clampView({ zoom: 0.2, start: 12 }, 60, 50)).toEqual({ zoom: 1, start: 0 })
        expect(clampView({ zoom: 4, start: 100 }, 60, 50)).toEqual({ zoom: 4, start: 45 })
        expect(clampView({ zoom: 400, start: -3 }, 60, 50)).toEqual({ zoom: 50, start: 0 })
    })
    it('zooms around the anchor without moving it on screen', () => {
        const before = { zoom: 2, start: 10 }
        const after = zoomAround(before, 60, 2, 25, 100)
        expect(after.zoom).toBe(4)
        expect((25 - after.start) / viewSpan(after, 60)).toBeCloseTo((25 - before.start) / viewSpan(before, 60))
    })
    it('centres on the playhead, and only scrolls when it is out of view', () => {
        expect(centerOn({ zoom: 4, start: 0 }, 60, 30).start).toBe(22.5)
        expect(centerOn({ zoom: 4, start: 0 }, 60, 59).start).toBe(45)
        const view = { zoom: 4, start: 10 }
        expect(revealTime(view, 60, 20)).toBe(view)
        expect(revealTime(view, 60, 40).start).toBe(32.5)
    })
    it('picks ruler ticks at least 10 px apart with readable labels', () => {
        expect(rulerStep(2).step).toBe(5)
        expect(rulerStep(400, 30).step).toBe(1 / 30)
        expect(rulerStep(100, 30).step).toBe(5 / 30)
        const { step, labelEvery } = rulerStep(40)
        expect(step * 40 * labelEvery).toBeGreaterThanOrEqual(64)
    })
    it('snaps to the nearest target, earlier groups first', () => {
        expect(snapTime(4.9, [[2, 5], [4.95]], 0.2)).toEqual({ time: 5, snapped: true })
        expect(snapTime(4.9, [[2], [4.95, 4.8]], 0.2)).toEqual({ time: 4.95, snapped: true })
        expect(snapTime(4.5, [[2, 5], [4]], 0.2)).toEqual({ time: 4.5, snapped: false })
    })
})
