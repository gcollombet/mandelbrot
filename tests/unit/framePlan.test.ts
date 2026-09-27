import {describe, expect, it} from 'vitest'
import {
    FrameRequests,
    advanceRawOrigin,
    frameClearReasons,
    planFrame,
    type FramePlanInput,
} from '../../src/framePlan'
import {smallZoomStopNeedsClear} from '../../src/zoomState'

const input = (overrides: Partial<FramePlanInput> = {}): FramePlanInput => ({
    clearReasons: [],
    analyticPayloadStale: false,
    snapshot: null,
    zoomActive: false,
    tiled: false,
    tiledTileActive: false,
    shift: { x: 0, y: 0 },
    rawOrigin: { x: 10, y: 20 },
    rawSide: 256,
    visiblePixelCount: 1920 * 1080,
    width: 1920,
    height: 1080,
    unfinishedPixelCount: 0,
    ...overrides,
})

describe('FrameRequests', () => {
    it('keeps every clear reason once, in request order, until the clear is done', () => {
        const requests = new FrameRequests()
        expect(requests.clearPending).toBe(false)
        requests.requestClear('zoomCycle')
        requests.requestClear('orbitTrap')
        requests.requestClear('zoomCycle')
        expect(requests.clearReasons).toEqual(['zoomCycle', 'orbitTrap'])
        requests.clearDone()
        expect(requests.clearPending).toBe(false)
        expect(requests.clearReasons).toEqual([])
    })

    it('a copy subsumes a pending merge', () => {
        const requests = new FrameRequests()
        requests.requestSnapshot('merge')
        requests.requestSnapshot('copy')
        expect(requests.snapshot).toBe('copy')
        // A plain merge request does not undo it (merge then copy = copy).
        requests.requestSnapshot('merge')
        expect(requests.snapshot).toBe('copy')
    })

    it('a replacing merge supersedes a pending copy', () => {
        const requests = new FrameRequests()
        requests.requestSnapshot('copy')
        requests.requestSnapshot('merge', { replace: true })
        expect(requests.snapshot).toBe('merge')
    })

    it('cancel and done both clear the snapshot, not the clear', () => {
        const requests = new FrameRequests()
        requests.requestClear('tile')
        requests.requestSnapshot('copy')
        requests.cancelSnapshot()
        expect(requests.snapshot).toBeNull()
        requests.requestSnapshot('merge')
        requests.snapshotDone()
        expect(requests.snapshot).toBeNull()
        expect(requests.clearPending).toBe(true)
    })
})

describe('frameClearReasons', () => {
    it('adds the analytic payload rebuild to the requested reasons', () => {
        expect(frameClearReasons({ clearReasons: [], analyticPayloadStale: false })).toEqual([])
        expect(frameClearReasons({ clearReasons: ['tile'], analyticPayloadStale: true })).toEqual(['tile', 'analyticPayload'])
    })
})

describe('planFrame', () => {
    it('an idle frame does nothing to the field', () => {
        const plan = planFrame(input())
        expect(plan).toMatchObject({
            clear: false,
            clearReasons: [],
            utility: 'none',
            hasTranslationShift: false,
            frozenLosesAlignment: false,
            rawOrigin: { x: 10, y: 20 },
            activePixelCount: 0,
            runFieldPasses: true,
        })
    })

    it('a clear frame rebuilds everything at origin 0', () => {
        const plan = planFrame(input({ clearReasons: ['zoomCycle'], unfinishedPixelCount: 5 }))
        expect(plan.clear).toBe(true)
        expect(plan.utility).toBe('clear')
        expect(plan.rawOrigin).toEqual({ x: 0, y: 0 })
        expect(plan.activePixelCount).toBe(1920 * 1080)
    })

    it('a stale analytic payload clears even without a request', () => {
        const plan = planFrame(input({ analyticPayloadStale: true }))
        expect(plan.utility).toBe('clear')
        expect(plan.clearReasons).toEqual(['analyticPayload'])
    })

    it('a pan stamps the exposed border and desynchronises the frozen texture', () => {
        const plan = planFrame(input({ shift: { x: 3, y: -2 }, unfinishedPixelCount: 100 }))
        expect(plan.utility).toBe('pan')
        expect(plan.frozenLosesAlignment).toBe(true)
        expect(plan.exposedPixelCount).toBe(3 * 1080 + 2 * 1920 - 6)
        expect(plan.activePixelCount).toBe(100 + plan.exposedPixelCount)
        expect(plan.rawOrigin).toEqual({ x: 7, y: 22 })
    })

    it('an unknown pixel count stays unknown unless a pan exposes pixels', () => {
        expect(planFrame(input({ unfinishedPixelCount: -1 })).activePixelCount).toBe(-1)
        expect(planFrame(input({ unfinishedPixelCount: -1, shift: { x: 1, y: 0 } })).activePixelCount).toBe(1080)
    })

    it('an idle pan cancels the snapshot, a mid-zoom pan keeps it', () => {
        const shift = { x: 1, y: 0 }
        expect(planFrame(input({ snapshot: 'copy', shift })).snapshot).toBeNull()
        expect(planFrame(input({ snapshot: 'merge', shift })).snapshot).toBeNull()
        expect(planFrame(input({ snapshot: 'copy', shift, zoomActive: true })).snapshot).toBe('copy')
        expect(planFrame(input({ snapshot: 'merge' })).snapshot).toBe('merge')
    })

    it('tiled keyframes never run legacy snapshots, and stop the field once complete', () => {
        expect(planFrame(input({ tiled: true, tiledTileActive: true, snapshot: 'copy' })).snapshot).toBeNull()
        expect(planFrame(input({ tiled: true, tiledTileActive: true })).runFieldPasses).toBe(true)
        expect(planFrame(input({ tiled: true, tiledTileActive: false })).runFieldPasses).toBe(false)
    })

    it('is a pure function of its input', () => {
        const a = input({ clearReasons: ['tile'], shift: { x: 0, y: 0 }, snapshot: 'merge' })
        expect(planFrame(a)).toEqual(planFrame(structuredClone(a)))
    })
})

describe('advanceRawOrigin', () => {
    it('wraps on the torus in both directions', () => {
        expect(advanceRawOrigin({ x: 0, y: 0 }, { x: 1, y: -1 }, false, 8)).toEqual({ x: 7, y: 1 })
        expect(advanceRawOrigin({ x: 7, y: 7 }, { x: -3, y: 9 }, false, 8)).toEqual({ x: 2, y: 6 })
    })

    it('a sequence of pans composes into one pan', () => {
        let origin = { x: 5, y: 5 }
        let total = { x: 0, y: 0 }
        for (const shift of [{ x: 3, y: -1 }, { x: -7, y: 2 }, { x: 12, y: 0 }]) {
            origin = advanceRawOrigin(origin, shift, false, 16)
            total = { x: total.x + shift.x, y: total.y + shift.y }
        }
        expect(origin).toEqual(advanceRawOrigin({ x: 5, y: 5 }, total, false, 16))
    })
})

describe('smallZoomStopNeedsClear', () => {
    it('fires only when an idle zoom just stopped in real time', () => {
        const base = { wasZoomActive: false, previousFrameScaleChanged: true, scaleChanged: false, repeatPump: false }
        expect(smallZoomStopNeedsClear(base)).toBe(true)
        expect(smallZoomStopNeedsClear({ ...base, wasZoomActive: true })).toBe(false)
        expect(smallZoomStopNeedsClear({ ...base, scaleChanged: true })).toBe(false)
        expect(smallZoomStopNeedsClear({ ...base, previousFrameScaleChanged: false })).toBe(false)
        expect(smallZoomStopNeedsClear({ ...base, repeatPump: true })).toBe(false)
    })
})
