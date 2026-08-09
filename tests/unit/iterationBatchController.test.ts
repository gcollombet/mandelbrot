import {describe, expect, it} from 'vitest'
import {
    ITERATION_WORK_RATE_EMA_ALPHA,
    MIN_ITERATION_BUDGET_MS,
    batchSizeForWorkRate,
    isRepresentativeIterationPopulation,
    iterationWorkCounterShift,
    measureIterationWorkRate,
    predictIterationBatchSize,
    requestedIterationBudgetMs,
    updateIterationWorkRateEma,
} from '../../src/iterationBatchController'

describe('predictive iteration batch controller', () => {
    it('requests ten milliseconds even when the selected frame has no free budget', () => {
        expect(requestedIterationBudgetMs(1000 / 120, 9)).toBe(MIN_ITERATION_BUDGET_MS)
        expect(requestedIterationBudgetMs(1000 / 60, 15)).toBe(MIN_ITERATION_BUDGET_MS)
    })

    it('uses additional frame headroom when it exceeds the ten millisecond floor', () => {
        expect(requestedIterationBudgetMs(1000 / 30, 5)).toBeCloseTo(26.333333, 5)
    })

    it('downshifts proportionally in one sample with safety headroom', () => {
        expect(predictIterationBatchSize({
            elapsedMs: 20,
            requestedBudgetMs: 10,
            sampledBatchSize: 100,
            currentBatchSize: 100,
            minBatchSize: 1,
            maxBatchSize: 10_000,
        })).toBe(45)
    })

    it('jumps directly to the inverse-timing estimate on the first cheap sample', () => {
        expect(predictIterationBatchSize({
            elapsedMs: 1,
            requestedBudgetMs: 10,
            sampledBatchSize: 1,
            currentBatchSize: 1,
            minBatchSize: 1,
            maxBatchSize: 10_000,
        })).toBe(10)
        expect(predictIterationBatchSize({
            elapsedMs: 5,
            requestedBudgetMs: 10,
            sampledBatchSize: 100,
            currentBatchSize: 100,
            minBatchSize: 1,
            maxBatchSize: 10_000,
        })).toBe(200)
    })

    it('caps only implausibly large upward jumps caused by tiny timings', () => {
        expect(predictIterationBatchSize({
            elapsedMs: 0.001,
            requestedBudgetMs: 10,
            sampledBatchSize: 1,
            currentBatchSize: 1,
            minBatchSize: 1,
            maxBatchSize: 10_000,
        })).toBe(64)
    })

    it('holds inside the dead band and clamps underfilled work at the shader maximum', () => {
        expect(predictIterationBatchSize({
            elapsedMs: 10.5,
            requestedBudgetMs: 10,
            sampledBatchSize: 750,
            currentBatchSize: 750,
            minBatchSize: 1,
            maxBatchSize: 10_000,
        })).toBe(750)
        expect(predictIterationBatchSize({
            elapsedMs: 1,
            requestedBudgetMs: 10,
            sampledBatchSize: 10_000,
            currentBatchSize: 10_000,
            minBatchSize: 1,
            maxBatchSize: 10_000,
        })).toBe(10_000)
    })

    it('updates throughput only while at least ten percent of pixels remain', () => {
        expect(isRepresentativeIterationPopulation(100, 1_000)).toBe(true)
        expect(isRepresentativeIterationPopulation(99, 1_000)).toBe(false)
        expect(isRepresentativeIterationPopulation(-1, 1_000)).toBe(false)
    })

    it('tracks weighted application throughput with a responsive EMA', () => {
        expect(ITERATION_WORK_RATE_EMA_ALPHA).toBe(0.5)
        const firstRate = measureIterationWorkRate(200_000_000, 10)
        const secondRate = measureIterationWorkRate(300_000_000, 10)
        expect(firstRate).toBe(20_000_000)
        expect(secondRate).toBe(30_000_000)
        expect(updateIterationWorkRateEma(firstRate, secondRate)).toBe(25_000_000)
        expect(updateIterationWorkRateEma(0, firstRate)).toBe(firstRate)
    })

    it('keeps the GPU weighted-work accumulator in range without scaling ordinary frames', () => {
        expect(iterationWorkCounterShift(400, 2_000_000)).toBe(0)
        expect(iterationWorkCounterShift(10_000, 2_000_000)).toBe(4)
        const shift = iterationWorkCounterShift(10_000, 8192 * 8192)
        expect((10_000 + 8) * 8192 * 8192 / 2 ** shift).toBeLessThanOrEqual(0x7fff_ffff)
    })

    it('derives the target batch from throughput, budget, and active population', () => {
        expect(batchSizeForWorkRate(20_000_000, 10, 1_000_000, 1, 10_000)).toBe(200)
        expect(batchSizeForWorkRate(20_000_000, 10, 100_000, 1, 10_000)).toBe(2_000)
        expect(batchSizeForWorkRate(0, 10, 100_000, 1, 10_000)).toBe(1)
    })

})
