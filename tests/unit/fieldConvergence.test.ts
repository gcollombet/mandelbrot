import {describe, expect, it} from 'vitest'
import {
    UNFINISHED_PIXEL_DONE_THRESHOLD,
    isFieldConverged,
    type FieldConvergenceState,
} from '../../src/fieldConvergence'

/** A fully converged, idle field: every gate open. */
function converged(overrides: Partial<FieldConvergenceState> = {}): FieldConvergenceState {
    return {
        clearHistoryNextFrame: false,
        needFreezeSnapshot: false,
        needMergeSnapshot: false,
        zoomActive: false,
        orbitIncomplete: false,
        unfinishedPixelCount: 0,
        pendingCounterReadback: false,
        ...overrides,
    }
}

describe('isFieldConverged', () => {
    it('accepts a fully converged idle field', () => {
        expect(isFieldConverged(converged())).toBe(true)
    })

    // The counter arrives by asynchronous readback, so a small unfinished count
    // can predate the last mutation of the raw field. Without this term a caller
    // concludes "converged" from stale evidence and acts on a half-computed
    // image — the failure that would silently encode a bad video frame.
    it('rejects a converged-looking count while a readback is still in flight', () => {
        expect(isFieldConverged(converged({pendingCounterReadback: true}))).toBe(false)
    })

    it('rejects a not-yet-known pixel count', () => {
        expect(isFieldConverged(converged({unfinishedPixelCount: -1}))).toBe(false)
    })

    it('rejects unconsumed swap effects', () => {
        expect(isFieldConverged(converged({clearHistoryNextFrame: true}))).toBe(false)
        expect(isFieldConverged(converged({needFreezeSnapshot: true}))).toBe(false)
        expect(isFieldConverged(converged({needMergeSnapshot: true}))).toBe(false)
    })

    it('rejects an incomplete reference orbit', () => {
        expect(isFieldConverged(converged({orbitIncomplete: true}))).toBe(false)
    })

    // The render loop stops driving frames at this threshold, so a view that
    // idles with a few stuck pixels must still read as converged — requiring
    // exactly 0 deadlocked AA on such views.
    it('tolerates stragglers up to the idle threshold but not beyond', () => {
        expect(isFieldConverged(converged({
            unfinishedPixelCount: UNFINISHED_PIXEL_DONE_THRESHOLD,
        }))).toBe(true)
        expect(isFieldConverged(converged({
            unfinishedPixelCount: UNFINISHED_PIXEL_DONE_THRESHOLD + 1,
        }))).toBe(false)
    })

    describe('export variant', () => {
        it('accepts a converged field while the zoom cycle is running', () => {
            const zooming = converged({zoomActive: true})
            expect(isFieldConverged(zooming)).toBe(false)
            expect(isFieldConverged(zooming, {ignoreZoomCycle: true})).toBe(true)
        })

        // Relaxing the zoom term must not relax the evidence. Every other gate
        // has to keep closing the export path, or a video frame could be
        // captured mid-computation.
        it.each([
            ['a readback in flight', {pendingCounterReadback: true}],
            ['an unknown pixel count', {unfinishedPixelCount: -1}],
            ['too many unfinished pixels', {unfinishedPixelCount: 500}],
            ['an armed history clear', {clearHistoryNextFrame: true}],
            ['an owed freeze snapshot', {needFreezeSnapshot: true}],
            ['an owed merge', {needMergeSnapshot: true}],
            ['an incomplete orbit', {orbitIncomplete: true}],
        ])('still rejects %s', (_label, overrides) => {
            const state = converged({zoomActive: true, ...overrides})
            expect(isFieldConverged(state, {ignoreZoomCycle: true})).toBe(false)
        })

        // ignoreZoomCycle is the ONLY difference between the two gates. If a
        // term is ever added to one and not the other, this fails.
        it('differs from the real-time gate on the zoom term alone', () => {
            const states: FieldConvergenceState[] = []
            for (let mask = 0; mask < 128; mask++) {
                states.push({
                    clearHistoryNextFrame: !!(mask & 1),
                    needFreezeSnapshot: !!(mask & 2),
                    needMergeSnapshot: !!(mask & 4),
                    zoomActive: !!(mask & 8),
                    orbitIncomplete: !!(mask & 16),
                    unfinishedPixelCount: mask & 32 ? -1 : 0,
                    pendingCounterReadback: !!(mask & 64),
                })
            }
            for (const state of states) {
                const realtime = isFieldConverged(state)
                const exported = isFieldConverged(state, {ignoreZoomCycle: true})
                if (state.zoomActive) {
                    // Only the zoom term may separate them.
                    expect(realtime).toBe(false)
                } else {
                    expect(exported).toBe(realtime)
                }
            }
        })
    })
})
