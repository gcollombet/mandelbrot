import {describe, expect, it} from 'vitest'
import {
    classifyFrame,
    displayZoomFactors,
    liveGridScale,
    reduceZoomState,
    resetZoomState,
    type FrameChange,
    type ZoomState,
} from '../../src/zoomState'

const frame = (change: Partial<FrameChange>): FrameChange => ({
    previousScale: 1,
    scale: 1,
    orbitWasReset: false,
    muChanged: false,
    repeatPump: false,
    ...change,
})

describe('classifyFrame', () => {
    it('invalidates the history without a previous frame, on re-anchor, or on a new mu', () => {
        expect(classifyFrame(frame({ previousScale: null }))).toEqual({ type: 'referenceReset', muChanged: false, orbitWasReset: false })
        expect(classifyFrame(frame({ orbitWasReset: true, scale: 0.5 }))).toEqual({ type: 'referenceReset', muChanged: false, orbitWasReset: true })
        expect(classifyFrame(frame({ muChanged: true }))).toEqual({ type: 'referenceReset', muChanged: true, orbitWasReset: false })
    })

    it('a different scale is a zoom step', () => {
        expect(classifyFrame(frame({ previousScale: 1, scale: 0.9 }))).toEqual({ type: 'scaleChanged', scale: 0.9, prevScale: 1 })
    })

    it('an unchanged scale is a stop in real time, nothing in an export pump', () => {
        expect(classifyFrame(frame({}))).toEqual({ type: 'scaleStable' })
        expect(classifyFrame(frame({ repeatPump: true }))).toBeNull()
        // An export still zooms between its frames.
        expect(classifyFrame(frame({ repeatPump: true, scale: 0.5 }))?.type).toBe('scaleChanged')
    })
})

describe('reduceZoomState', () => {
    const ctx = { threshold: 2 }

    it('runs a full zoom-in cycle: start, hold, swap, stop', () => {
        let state: ZoomState = resetZoomState()
        let step = reduceZoomState(state, { type: 'scaleChanged', scale: 0.9, prevScale: 1 }, ctx)
        expect(step.state).toEqual({ kind: 'reprojecting', frozenScale: 1, liveScale: 0.5, zoomingIn: true })
        expect(step.effects.map(e => e.type)).toEqual(['copyResolvedToFrozen', 'clearHistory'])
        state = step.state

        step = reduceZoomState(state, { type: 'scaleChanged', scale: 0.6, prevScale: 0.9 }, ctx)
        expect(step.state).toBe(state)
        expect(step.effects).toEqual([])

        step = reduceZoomState(state, { type: 'scaleChanged', scale: 0.5, prevScale: 0.6 }, ctx)
        expect(step.state).toEqual({ kind: 'reprojecting', frozenScale: 0.5, liveScale: 0.25, zoomingIn: true })
        expect(step.effects.map(e => e.type)).toEqual(['copyResolvedToFrozen', 'clearHistory'])
        state = step.state

        step = reduceZoomState(state, { type: 'scaleStable' }, ctx)
        expect(step.state).toEqual({ kind: 'idle' })
        expect(step.effects.map(e => e.type)).toEqual(['mergeResolvedAndFrozen', 'clearHistory'])
    })

    it('zooming out computes the live grid coarser than the frozen one', () => {
        const step = reduceZoomState(resetZoomState(), { type: 'scaleChanged', scale: 1.1, prevScale: 1 }, ctx)
        expect(step.state).toEqual({ kind: 'reprojecting', frozenScale: 1, liveScale: 2, zoomingIn: false })
    })

    it('a reference re-anchor keeps the cycle, a new mu ends it', () => {
        const cycle: ZoomState = { kind: 'reprojecting', frozenScale: 1, liveScale: 0.5, zoomingIn: true }
        const keep = reduceZoomState(cycle, { type: 'referenceReset', muChanged: false, orbitWasReset: true }, ctx)
        expect(keep.state).toBe(cycle)
        expect(keep.effects.map(e => e.type)).toEqual(['clearHistory'])
        const end = reduceZoomState(cycle, { type: 'referenceReset', muChanged: true, orbitWasReset: false }, ctx)
        expect(end.state).toEqual({ kind: 'idle' })
    })

    it('an idle re-anchor keeps the last image as frozen fallback', () => {
        const step = reduceZoomState(resetZoomState(), { type: 'referenceReset', muChanged: false, orbitWasReset: true }, ctx)
        expect(step.effects.map(e => e.type)).toEqual(['copyResolvedToFrozen', 'clearHistory'])
    })
})

describe('scale helpers', () => {
    const cycle: ZoomState = { kind: 'reprojecting', frozenScale: 1, liveScale: 0.25, zoomingIn: true }

    it('liveGridScale is the cycle live scale, else the display scale', () => {
        expect(liveGridScale(cycle, 0.5)).toBe(0.25)
        expect(liveGridScale(resetZoomState(), 0.5)).toBe(0.5)
        expect(liveGridScale({ ...cycle, liveScale: 0 }, 0.5)).toBe(0.5)
    })

    it('displayZoomFactors are the grid/display scale ratios, 1 when idle', () => {
        expect(displayZoomFactors(cycle, 0.5)).toEqual({ frozen: 2, live: 0.5 })
        expect(displayZoomFactors(resetZoomState(), 0.5)).toEqual({ frozen: 1, live: 1 })
    })
})
