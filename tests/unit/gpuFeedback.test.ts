import {describe, expect, it, vi} from 'vitest'
import {IterationBudget, MAX_BATCH_SIZE, MIN_BATCH_SIZE, type IterationBatchTimingContext} from '../../src/iterationBudget'
import {PixelCounter, decodeCounter, COUNTER_SAMPLE_INTERVAL_FRAMES} from '../../src/pixelCounter'

const budget = (timestamps = true, fps = 60) => new IterationBudget({ targetFps: () => fps, timestampsEnabled: () => timestamps })

const context = (frame: number, over: Partial<IterationBatchTimingContext> = {}): IterationBatchTimingContext => ({
    frame, batchSize: 100, generation: 0, activePixelCount: 1_000_000, visiblePixelCount: 1_000_000,
    zoomRefresh: false, zoomRefreshRegimeKey: '', ...over,
})
const counterSample = (over = {}) => ({
    generation: 0, actualWeightedWork: 50_000_000, remainingPixelCount: 800_000,
    effectiveRemainingPixelCount: 800_000, periodicThrottledPixelCount: 0, ...over,
})

describe('IterationBudget', () => {
    it('learns only once timing and counter of the same frame are both known, in either order', () => {
        const a = budget(), b = budget()
        a.recordPassTiming(5, context(7), 2)
        expect(a.workRate).toBe(0)
        a.recordCounterSample(7, counterSample())
        b.recordCounterSample(7, counterSample())
        b.recordPassTiming(5, context(7), 2)
        expect(a.workRate).toBeGreaterThan(0)
        expect(b.workRate).toBe(a.workRate)
        expect(b.batchSize).toBe(a.batchSize)
    })

    it('never joins samples of different frames', () => {
        const b = budget()
        b.recordPassTiming(5, context(1), 2)
        b.recordCounterSample(2, counterSample())
        expect(b.workRate).toBe(0)
        expect(b.batchSize).toBe(MIN_BATCH_SIZE)
    })

    it('rejects samples from before a clear or the start of a pan', () => {
        const b = budget()
        b.observeTopology(true, false)
        expect(b.generation).toBe(1)
        b.recordPassTiming(5, context(3, { generation: 0 }), 2)
        b.recordCounterSample(3, counterSample({ generation: 0 }))
        expect(b.workRate).toBe(0)
    })

    it('opens one generation per pending clear and one per pan start', () => {
        const b = budget()
        b.observeTopology(true, false)
        b.observeTopology(true, false)          // same clear still pending: no reseed
        expect(b.generation).toBe(1)
        b.clearSubmitted()
        b.observeTopology(true, false)
        expect(b.generation).toBe(2)
        expect(b.entersTranslation(true)).toBe(true)
        b.observeTopology(false, true)
        expect(b.generation).toBe(3)
        expect(b.entersTranslation(true)).toBe(false)
        b.observeTopology(false, true)          // continuing pan keeps its samples
        expect(b.generation).toBe(3)
    })

    it('without timestamps, sizes from the whole frame but never learns a rate from it', () => {
        const b = budget(false)
        b.recordFrameTiming(4, context(1, { batchSize: 100 }))
        expect(b.gpuFrameTimeMs).toBe(4)
        expect(b.smoothedGpuTimeMs).toBe(4)
        expect(b.batchSize).toBeGreaterThan(MIN_BATCH_SIZE)
        expect(b.workRate).toBe(0)
        const timed = budget(true)
        timed.recordFrameTiming(4, context(1))
        expect(timed.batchSize).toBe(MIN_BATCH_SIZE)
    })

    it('keeps the learned batch within its bounds and seeds clear frames from it', () => {
        const b = budget()
        b.recordPassTiming(1, context(1), 0)
        b.recordCounterSample(1, counterSample({ actualWeightedWork: 1e12 }))
        expect(b.batchSize).toBeLessThanOrEqual(MAX_BATCH_SIZE)
        expect(b.batchSize).toBeGreaterThanOrEqual(MIN_BATCH_SIZE)
        const learned = b.learnedBatchSizeFor(10)
        expect(learned).not.toBeNull()
        b.batchSize = MIN_BATCH_SIZE
        expect(b.adoptLearnedSize({ zoomRefresh: false, activePixelCount: 10, regimeKey: '' })).toBe(learned !== MIN_BATCH_SIZE)
        expect(b.batchSize).toBe(learned)
    })

    it('bounds the unmatched samples it keeps', () => {
        const b = budget()
        for (let frame = 0; frame < 500; frame++) b.recordPassTiming(5, context(frame), 1)
        const pending = (b as unknown as { pendingTimings: Map<number, unknown> }).pendingTimings
        expect(pending.size).toBe(64)
        expect(pending.has(499)).toBe(true)
        expect(pending.has(0)).toBe(false)
    })
})

describe('PixelCounter', () => {
    const sample = (frame: number, unfinished: number) => ({ frame, unfinished, actualWeightedWork: 0, effectiveUnfinished: unfinished, periodicThrottled: 0 })

    it('applies readbacks in sequence order and drops a late older one', () => {
        const counter = new PixelCounter()
        expect(counter.apply({ sequence: 2, generation: 0 }, sample(2, 50))).toBe(-1)
        expect(counter.apply({ sequence: 1, generation: 0 }, sample(1, 90))).toBeNull()
        expect(counter.unfinished).toBe(50)
        expect(counter.sampleFrame).toBe(2)
    })

    it('rejects every count sampled before an invalidation', () => {
        const counter = new PixelCounter()
        counter.apply({ sequence: 1, generation: 0 }, sample(1, 50))
        counter.invalidate()
        expect(counter.unfinished).toBe(-1)
        expect(counter.sampleFrame).toBe(-1)
        expect(counter.apply({ sequence: 2, generation: 0 }, sample(2, 10))).toBeNull()
        expect(counter.apply({ sequence: 3, generation: 1 }, sample(3, 10))).toBe(-1)
    })

    it('samples when the count is unknown or the interval elapsed', () => {
        const counter = new PixelCounter()
        expect(counter.isSampleDue(0)).toBe(true)
        counter.apply({ sequence: 1, generation: 0 }, sample(0, 5))
        expect(counter.isSampleDue(COUNTER_SAMPLE_INTERVAL_FRAMES)).toBe(true)
    })

    it('reserves slots round-robin and skips those still mapping', () => {
        const device = { createBuffer: vi.fn(() => ({ destroy: vi.fn() })) } as unknown as GPUDevice
        vi.stubGlobal('GPUBufferUsage', { STORAGE: 1, COPY_SRC: 2, COPY_DST: 4, MAP_READ: 8 })
        const counter = new PixelCounter()
        counter.allocate(device)
        const a = counter.reserve(1, 0)!, b = counter.reserve(2, 0)!
        expect(a.slot).not.toBe(b.slot)
        a.slot.pending = true; b.slot.pending = true
        const c = counter.reserve(3, 0)!
        c.slot.pending = true
        expect(counter.reserve(4, 0)).toBeUndefined()
        vi.unstubAllGlobals()
    })

    it('decodes the four counter words', () => {
        expect(decodeCounter(new Uint32Array([7, 3, 20, 2]), 9, 4)).toEqual({
            frame: 9, unfinished: 7, actualWeightedWork: 48, effectiveUnfinished: 2.5, periodicThrottled: 2,
        })
    })
})
