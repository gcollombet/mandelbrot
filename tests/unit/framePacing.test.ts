import {describe, expect, it} from 'vitest'
import {
    FRAME_PACING_RECOVERY_FRAMES,
    INITIAL_FRAME_PACING_GPU_UTILIZATION,
    MAX_FRAME_PACING_GPU_UTILIZATION,
    MAX_FRAME_PACING_IN_FLIGHT,
    MAX_FRAME_PACING_CREDIT_INTERVALS,
    MIN_FRAME_PACING_GPU_UTILIZATION,
    QUEUE_BLOCKED_MAX_CREDIT_INTERVALS,
    advanceFramePacingLoad,
    advanceFramePacer,
    countFramesInFlight,
    framePacingIntervalForGpuSpan,
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

    it('reserves GPU headroom without quantizing the target interval', () => {
        expect(framePacingIntervalForGpuSpan(10, 0.9)).toBeCloseTo(100 / 9)
        expect(framePacingIntervalForGpuSpan(0, 0.9)).toBe(0)
    })

    it('keeps at most one interval of catch-up credit while the queue is full', () => {
        const waiting = advanceFramePacer(
            1000,
            20,
            10,
            0,
            false,
            QUEUE_BLOCKED_MAX_CREDIT_INTERVALS,
        )
        expect(waiting.creditMs).toBe(20)

        const completed = advanceFramePacer(
            1010,
            20,
            waiting.lastTickMs,
            waiting.creditMs,
            true,
        )
        expect(completed.shouldDraw).toBe(true)
        expect(completed.creditMs).toBe(10)
    })

    it('counts only submitted frames beyond the completion watermark', () => {
        expect(countFramesInFlight(12, 10)).toBe(2)
        expect(countFramesInFlight(10, 12)).toBe(0)
        expect(countFramesInFlight(MAX_FRAME_PACING_IN_FLIGHT, 0))
            .toBe(MAX_FRAME_PACING_IN_FLIGHT)
    })

    it('backs off immediately on congestion and recovers in bounded steps', () => {
        const backedOff = advanceFramePacingLoad(
            MAX_FRAME_PACING_GPU_UTILIZATION,
            18,
            'congested',
        )
        expect(backedOff.utilization).toBeLessThan(MAX_FRAME_PACING_GPU_UTILIZATION)
        expect(backedOff.utilization).toBeGreaterThanOrEqual(MIN_FRAME_PACING_GPU_UTILIZATION)
        expect(backedOff.healthyFrames).toBe(0)

        let state = {
            utilization: INITIAL_FRAME_PACING_GPU_UTILIZATION,
            healthyFrames: 0,
        }
        for (let i = 0; i < FRAME_PACING_RECOVERY_FRAMES; i++) {
            state = advanceFramePacingLoad(
                state.utilization,
                state.healthyFrames,
                'submitted',
            )
        }
        expect(state.utilization).toBeGreaterThan(INITIAL_FRAME_PACING_GPU_UTILIZATION)
        expect(state.utilization).toBeLessThanOrEqual(MAX_FRAME_PACING_GPU_UTILIZATION)
        expect(state.healthyFrames).toBe(0)
    })
})
