import {describe, expect, it} from 'vitest'
import {
    MAX_FRAME_PACING_CREDIT_INTERVALS,
    advanceFramePacer,
} from '../../src/framePacing'

function simulateFrames(
    durationMs: number,
    rafIntervalMs: number,
    gpuIntervalMs: number,
): number {
    let lastTickMs = -1
    let creditMs = 0
    let frames = 0
    for (let nowMs = rafIntervalMs; nowMs <= durationMs; nowMs += rafIntervalMs) {
        const decision = advanceFramePacer(
            nowMs,
            gpuIntervalMs,
            lastTickMs,
            creditMs,
            true,
        )
        lastTickMs = decision.lastTickMs
        creditMs = decision.creditMs
        if (decision.shouldDraw) frames++
    }
    return frames
}

describe('GPU-aware frame pacer', () => {
    it('does not quantize a 16.9 ms GPU span to 30 fps on a 60 Hz rAF', () => {
        const frames = simulateFrames(10_000, 1000 / 60, 16.9)
        expect(frames).toBeGreaterThan(580)
        expect(frames).toBeLessThanOrEqual(600)
    })

    it('preserves the requested average for intervals between rAF ticks', () => {
        const frames = simulateFrames(10_000, 1000 / 60, 25)
        expect(frames).toBeGreaterThanOrEqual(398)
        expect(frames).toBeLessThanOrEqual(402)
    })

    it('does not consume pacing credit while the fallback GPU fence is pending', () => {
        const waiting = advanceFramePacer(1000, 20, 10, 0, false)
        expect(waiting.shouldDraw).toBe(false)
        expect(waiting.creditMs).toBe(20 * MAX_FRAME_PACING_CREDIT_INTERVALS)

        const completed = advanceFramePacer(
            1010,
            20,
            waiting.lastTickMs,
            waiting.creditMs,
            true,
        )
        expect(completed.shouldDraw).toBe(true)
        expect(completed.creditMs).toBe(20)
    })

})
