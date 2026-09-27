// ── Iteration budget: how much work the next dispatch may do ──
//
// The fused compute pass iterates each unfinished pixel up to `batchSize`
// weighted work units. This controller learns the GPU's throughput from the
// timed compute pass joined with the counter of work it actually consumed, and
// sizes the next batch so the iteration pass fits the frame budget. Pure CPU
// state: the engine feeds it asynchronous samples and reads `batchSize`.
//
// Timing and counter samples come from two independent GPU mappings that may
// resolve in either order, so they are joined by render-frame serial. A clear
// or the start of a pan changes the pixel population; `generation` then
// rejects every sample still in flight from before.

import {
    batchSizeForWorkRate,
    isRepresentativeIterationPopulation,
    measureIterationWorkRate,
    predictIterationBatchSize,
    predictZoomRefreshBatchSize,
    requestedIterationBudgetMs,
    updateIterationWorkRateEma,
    updateZoomRefreshCostModel,
    type ZoomRefreshCostModel,
} from './iterationBatchController'

export const MIN_BATCH_SIZE = 1
/**
 * The shader batch budgets WEIGHTED work units, not raw turns: each loop turn
 * adds the cost of the move it executed (exact step 1, affine block
 * application 1 in f32 or 3 in floatexp). The cap thus bounds near-constant
 * GPU time per dispatch whatever the block/exact mix, which keeps navigation
 * smooth between block-rich and exact-stepping regions; the timing estimator
 * settles the requested budget below it when work is abundant.
 */
export const MAX_BATCH_SIZE = 100_000
const GPU_TIME_EMA_ALPHA = 0.25
const FIXED_PASSES_EMA_ALPHA = 0.2
const SAMPLE_PAIR_RETENTION = 64

export type IterationBatchTimingContext = {
    frame: number
    batchSize: number
    generation: number
    activePixelCount: number
    visiblePixelCount: number
    zoomRefresh: boolean
    zoomRefreshRegimeKey: string
    actualWeightedWork?: number
    remainingPixelCount?: number
    effectiveRemainingPixelCount?: number
    periodicThrottledPixelCount?: number
}

export type IterationCounterSample = {
    generation: number
    actualWeightedWork: number
    remainingPixelCount: number
    effectiveRemainingPixelCount: number
    periodicThrottledPixelCount: number
}

export type IterationBudgetConfig = {
    targetFps: () => number
    /** Timestamp queries available: the controller learns from the compute pass
     *  alone; otherwise from the whole submitted frame (proportional fallback). */
    timestampsEnabled: () => boolean
}

export class IterationBudget {
    /** Weighted work budget per pixel for the next dispatch (shader uniform). */
    batchSize = MIN_BATCH_SIZE
    /** Invalidates delayed samples when a clear or a pan changes the population. */
    generation = 0
    /** EMA of weighted iteration applications per GPU millisecond. */
    workRate = 0
    /** First-dense-frame models, isolated from sparse continuation and pan. */
    readonly zoomRefreshCostModels = new Map<string, ZoomRefreshCostModel>()
    /** EMA of the active timed passes other than compute (frame budget reserve). */
    otherPassesMs = 0
    /** Last measured GPU frame time, and its EMA used by render-loop pacing. */
    gpuFrameTimeMs = 0
    smoothedGpuTimeMs = 0

    /** Prevents repeated first-wave seeding while one clear waits to be consumed. */
    private seededForPendingClear = false
    /** Invalidates pre-pan samples once while retaining live pan samples afterward. */
    private translationActive = false
    private readonly pendingTimings = new Map<number, { elapsedMs: number; fixedPassesMs: number; context: IterationBatchTimingContext }>()
    private readonly pendingCounters = new Map<number, IterationCounterSample>()

    private readonly config: IterationBudgetConfig

    constructor(config: IterationBudgetConfig) {
        this.config = config
    }

    /** Whether this frame starts a translation (the caller discards the pre-pan count). */
    entersTranslation(hasTranslationShift: boolean): boolean {
        return hasTranslationShift && !this.translationActive
    }

    /** Record the frame topology: a clear or the start of a pan opens a new generation. */
    observeTopology(clear: boolean, hasTranslationShift: boolean): void {
        if (clear && !this.seededForPendingClear) {
            this.generation++
            this.seededForPendingClear = true
        }
        if (this.entersTranslation(hasTranslationShift)) {
            this.generation++
        }
        this.translationActive = hasTranslationShift
    }

    /** The frame that executed the pending clear was submitted. */
    clearSubmitted(): void {
        this.seededForPendingClear = false
    }

    /**
     * Seed a clear or pan frame with the size learned for its population.
     * Returns true when `batchSize` changed (the uniform must be patched).
     */
    adoptLearnedSize(input: { zoomRefresh: boolean; activePixelCount: number; regimeKey: string }): boolean {
        const learned = input.zoomRefresh
            ? this.learnedZoomRefreshBatchSizeFor(input.activePixelCount, input.regimeKey)
            : this.learnedBatchSizeFor(input.activePixelCount)
        if (learned === null || learned === this.batchSize) return false
        this.batchSize = learned
        return true
    }

    /** Fixed-cost passes (everything but compute) measured by timestamps. */
    recordFixedPasses(milliseconds: number): void {
        this.otherPassesMs = this.otherPassesMs > 0
            ? this.otherPassesMs * (1 - FIXED_PASSES_EMA_ALPHA) + milliseconds * FIXED_PASSES_EMA_ALPHA
            : milliseconds
    }

    /**
     * Duration of a whole submitted frame. Timestamp queries are optional in
     * WebGPU: without them, keep a conservative full-frame fallback rather than
     * pinning the renderer at MIN_BATCH_SIZE. Timestamp-capable devices learn
     * from the compute pass only.
     */
    recordFrameTiming(elapsedMs: number, context: IterationBatchTimingContext): void {
        this.gpuFrameTimeMs = elapsedMs
        this.smoothedGpuTimeMs = this.smoothedGpuTimeMs === 0
            ? elapsedMs
            : this.smoothedGpuTimeMs * (1 - GPU_TIME_EMA_ALPHA) + elapsedMs * GPU_TIME_EMA_ALPHA
        if (!this.config.timestampsEnabled()) {
            this.applyIterationPassTiming(elapsedMs, context, this.otherPassesMs, false)
        }
    }

    /** Timed compute pass of one frame; joined with its counter sample. */
    recordPassTiming(elapsedMs: number, context: IterationBatchTimingContext, fixedPassesMs: number): void {
        this.pendingTimings.set(context.frame, { elapsedMs, fixedPassesMs, context })
        this.tryApplyPairedSample(context.frame)
        this.trimPendingSamples()
    }

    /** Work consumed and pixels left by one frame's dispatch; joined with its timing. */
    recordCounterSample(frame: number, sample: IterationCounterSample): void {
        this.pendingCounters.set(frame, sample)
        this.tryApplyPairedSample(frame)
        this.trimPendingSamples()
    }

    learnedBatchSizeFor(activePixelCount: number): number | null {
        if (!(this.workRate > 0) || !(activePixelCount > 0)) return null
        const targetIterationMs = requestedIterationBudgetMs(this.frameTargetMs(), this.otherPassesMs)
        return batchSizeForWorkRate(this.workRate, targetIterationMs, activePixelCount, MIN_BATCH_SIZE, MAX_BATCH_SIZE)
    }

    learnedZoomRefreshBatchSizeFor(activePixelCount: number, regimeKey: string): number | null {
        return predictZoomRefreshBatchSize({
            model: this.zoomRefreshCostModels.get(regimeKey),
            fallbackWorkRate: this.workRate,
            frameTargetMs: this.frameTargetMs(),
            fallbackFixedPassesMs: this.otherPassesMs,
            activePixelCount,
            minBatchSize: MIN_BATCH_SIZE,
            maxBatchSize: MAX_BATCH_SIZE,
        })
    }

    private frameTargetMs(): number {
        return 1000 / Math.max(1, this.config.targetFps())
    }

    private tryApplyPairedSample(frame: number): void {
        const timing = this.pendingTimings.get(frame)
        const counter = this.pendingCounters.get(frame)
        if (!timing || !counter) return
        this.pendingTimings.delete(frame)
        this.pendingCounters.delete(frame)
        if (timing.context.generation !== counter.generation) return
        this.applyIterationPassTiming(
            timing.elapsedMs,
            {
                ...timing.context,
                actualWeightedWork: counter.actualWeightedWork,
                remainingPixelCount: counter.remainingPixelCount,
                effectiveRemainingPixelCount: counter.effectiveRemainingPixelCount,
                periodicThrottledPixelCount: counter.periodicThrottledPixelCount,
            },
            timing.fixedPassesMs,
            true,
        )
    }

    private trimPendingSamples(): void {
        for (const pending of [this.pendingTimings, this.pendingCounters] as Map<number, unknown>[]) {
            while (pending.size > SAMPLE_PAIR_RETENTION) {
                pending.delete(pending.keys().next().value!)
            }
        }
    }

    /**
     * Adjust the shader work budget from the iteration pass alone. Full-frame
     * time contains fixed resolve/color/zoom costs and therefore cannot tell
     * how the batch should change.
     */
    private applyIterationPassTiming(
        elapsed: number,
        sample: IterationBatchTimingContext,
        sampledFixedPassesMs: number,
        computePassOnly: boolean,
    ): void {
        if (elapsed <= 0) return
        // A clear starts a new population immediately, while timestamp and
        // counter maps may resolve later. Reject the old texture before it can
        // contaminate either the global rate or the zoom-refresh model.
        if (sample.generation !== this.generation) return

        const targetIterationMs = requestedIterationBudgetMs(this.frameTargetMs(), sampledFixedPassesMs)

        // Learn only from the real weighted work consumed by this exact timed
        // dispatch. The post-pass unfinished count enforces the 10% rule on
        // pixels that still need work; zoom frames that cheaply finish most of
        // the image can no longer masquerade as enormous throughput.
        const remainingPixelCount = sample.remainingPixelCount ?? sample.activePixelCount
        const effectiveRemainingPixelCount = sample.effectiveRemainingPixelCount ?? remainingPixelCount
        const sampledRate = sample.actualWeightedWork !== undefined
            ? measureIterationWorkRate(sample.actualWeightedWork, elapsed)
            : 0
        if (computePassOnly && sample.zoomRefresh && sampledRate > 0) {
            const nextModel = updateZoomRefreshCostModel(
                this.zoomRefreshCostModels.get(sample.zoomRefreshRegimeKey),
                sampledRate,
                sampledFixedPassesMs,
            )
            if (nextModel) this.zoomRefreshCostModels.set(sample.zoomRefreshRegimeKey, nextModel)
        }
        if (computePassOnly
            && isRepresentativeIterationPopulation(remainingPixelCount, sample.visiblePixelCount)
            && sampledRate > 0) {
            this.workRate = updateIterationWorkRateEma(this.workRate, sampledRate)
        }

        // Without timestamps, keep the proportional full-frame fallback but
        // never feed its mixed fixed-pass time into the EMA. A hot reload or an
        // already-sparse view may provide no representative population to
        // initialise the rate: still let the isolated compute timestamp escape
        // batch 1, without storing that sparse measurement.
        if (!computePassOnly || !(this.workRate > 0)) {
            this.batchSize = predictIterationBatchSize({
                elapsedMs: elapsed,
                requestedBudgetMs: targetIterationMs,
                sampledBatchSize: sample.batchSize,
                currentBatchSize: this.batchSize,
                minBatchSize: MIN_BATCH_SIZE,
                maxBatchSize: MAX_BATCH_SIZE,
            })
            return
        }

        if (effectiveRemainingPixelCount > 0) {
            this.batchSize = batchSizeForWorkRate(
                this.workRate,
                targetIterationMs,
                effectiveRemainingPixelCount,
                MIN_BATCH_SIZE,
                MAX_BATCH_SIZE,
            )
        }
    }
}
