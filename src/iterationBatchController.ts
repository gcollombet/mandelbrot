export const MIN_ITERATION_BUDGET_MS = 10
export const ITERATION_SAFETY_MARGIN_MS = 2
export const ITERATION_BATCH_MAX_GROWTH = 64
export const ITERATION_BATCH_DOWNSHIFT_HEADROOM = 0.9
export const ITERATION_BATCH_DEADBAND_LOW = 0.9
export const ITERATION_BATCH_DEADBAND_HIGH = 1.1
export const ITERATION_WORK_RATE_EMA_ALPHA = 0.5
export const ITERATION_WORK_RATE_MIN_ACTIVE_RATIO = 0.1
export const ZOOM_REFRESH_MODEL_HEADROOM = 0.8
export const ZOOM_REFRESH_FALLBACK_HEADROOM = 0.7
export const ZOOM_REFRESH_RATE_MAX_GROWTH = 1.5
export const ZOOM_REFRESH_FIXED_COST_EMA_ALPHA = 0.5
const ITERATION_WORK_COUNTER_SAFE_MAX = 0x7fff_ffff
const ITERATION_WORK_MAX_OVERSHOOT = 8

const clampBatch = (batch: number, minBatchSize: number, maxBatchSize: number) =>
    Math.min(maxBatchSize, Math.max(minBatchSize, Math.round(batch)))

/**
 * Requested compute-pass budget. This is deliberately allowed to exceed the
 * selected frame duration: it preserves useful progress when fixed passes make
 * the selected FPS unattainable. Sparse/easy work may still consume less.
 */
export function requestedIterationBudgetMs(
    frameTargetMs: number,
    fixedPassesMs: number,
): number {
    const validFrameTargetMs = Number.isFinite(frameTargetMs) && frameTargetMs > 0
        ? frameTargetMs
        : 1000 / 60
    const validFixedPassesMs = Number.isFinite(fixedPassesMs)
        ? Math.max(0, fixedPassesMs)
        : 0
    return Math.max(
        MIN_ITERATION_BUDGET_MS,
        validFrameTargetMs - validFixedPassesMs - ITERATION_SAFETY_MARGIN_MS,
    )
}

export type PredictIterationBatchInput = {
    elapsedMs: number
    requestedBudgetMs: number
    sampledBatchSize: number
    currentBatchSize: number
    minBatchSize: number
    maxBatchSize: number
}

function boundedPrediction(
    predicted: number,
    sampledBatchSize: number,
    currentBatchSize: number,
    minBatchSize: number,
    maxBatchSize: number,
): number {
    if (predicted < currentBatchSize) {
        return clampBatch(
            Math.min(currentBatchSize, predicted),
            minBatchSize,
            maxBatchSize,
        )
    }
    const growthCeiling = Math.max(currentBatchSize, sampledBatchSize)
        * ITERATION_BATCH_MAX_GROWTH
    return clampBatch(
        Math.max(currentBatchSize, Math.min(predicted, growthCeiling)),
        minBatchSize,
        maxBatchSize,
    )
}

/**
 * Proportional fallback for adapters without compute-pass timestamps.
 */
export function predictIterationBatchSize(input: PredictIterationBatchInput): number {
    const currentBatchSize = clampBatch(
        input.currentBatchSize,
        input.minBatchSize,
        input.maxBatchSize,
    )
    if (!(input.elapsedMs > 0) || !(input.requestedBudgetMs > 0)) {
        return currentBatchSize
    }

    const sampledBatchSize = clampBatch(
        input.sampledBatchSize,
        input.minBatchSize,
        input.maxBatchSize,
    )
    const timingRatio = input.requestedBudgetMs / input.elapsedMs
    if (timingRatio >= ITERATION_BATCH_DEADBAND_LOW
        && timingRatio <= ITERATION_BATCH_DEADBAND_HIGH) {
        return currentBatchSize
    }

    if (timingRatio < 1) {
        const predicted = Math.floor(
            sampledBatchSize
            * timingRatio
            * ITERATION_BATCH_DOWNSHIFT_HEADROOM,
        )
        return boundedPrediction(
            predicted,
            sampledBatchSize,
            currentBatchSize,
            input.minBatchSize,
            input.maxBatchSize,
        )
    }

    const predicted = Math.ceil(sampledBatchSize * timingRatio)
    return boundedPrediction(
        predicted,
        sampledBatchSize,
        currentBatchSize,
        input.minBatchSize,
        input.maxBatchSize,
    )
}

export function isRepresentativeIterationPopulation(
    activePixelCount: number,
    visiblePixelCount: number,
): boolean {
    return activePixelCount > 0
        && visiblePixelCount > 0
        && activePixelCount >= visiblePixelCount * ITERATION_WORK_RATE_MIN_ACTIVE_RATIO
}

/**
 * Power-of-two scale used by the GPU work counter. g_workBudget can overshoot
 * the requested batch by one weighted operation (at most 8 units), so include
 * that last operation when keeping the global u32 accumulator below half range.
 */
export function iterationWorkCounterShift(
    sampledBatchSize: number,
    dispatchedPixelCount: number,
): number {
    if (!(sampledBatchSize > 0) || !(dispatchedPixelCount > 0)) return 0
    const maximumWork = (sampledBatchSize + ITERATION_WORK_MAX_OVERSHOOT)
        * dispatchedPixelCount
    if (maximumWork <= ITERATION_WORK_COUNTER_SAFE_MAX) return 0
    return Math.max(0, Math.min(
        31,
        Math.ceil(Math.log2(maximumWork / ITERATION_WORK_COUNTER_SAFE_MAX)),
    ))
}

/** Actually consumed weighted work units per GPU millisecond. */
export function measureIterationWorkRate(
    consumedWeightedWork: number,
    elapsedMs: number,
): number {
    if (!(consumedWeightedWork > 0) || !(elapsedMs > 0)) return 0
    return consumedWeightedWork / elapsedMs
}

export function updateIterationWorkRateEma(
    previousRate: number,
    sampledRate: number,
): number {
    if (!(sampledRate > 0) || !Number.isFinite(sampledRate)) return previousRate
    if (!(previousRate > 0) || !Number.isFinite(previousRate)) return sampledRate
    return previousRate * (1 - ITERATION_WORK_RATE_EMA_ALPHA)
        + sampledRate * ITERATION_WORK_RATE_EMA_ALPHA
}

export type ZoomRefreshCostModel = {
    workRate: number
    fixedPassesMs: number
}

/**
 * Track the first dense frame of matching zoom-refresh cycles. A slower sample
 * replaces the rate immediately so the next texture cannot repeat the hitch;
 * recovery is equally direct but capped to reject implausible timestamp spikes.
 */
export function updateZoomRefreshCostModel(
    previous: ZoomRefreshCostModel | undefined,
    sampledWorkRate: number,
    sampledFixedPassesMs: number,
): ZoomRefreshCostModel | undefined {
    if (!(sampledWorkRate > 0) || !Number.isFinite(sampledWorkRate)) {
        return previous
    }

    const validFixedPassesMs = Number.isFinite(sampledFixedPassesMs)
        ? Math.max(0, sampledFixedPassesMs)
        : previous?.fixedPassesMs ?? 0
    if (!previous || !(previous.workRate > 0)) {
        return {
            workRate: sampledWorkRate,
            fixedPassesMs: validFixedPassesMs,
        }
    }

    const workRate = sampledWorkRate < previous.workRate
        ? sampledWorkRate
        : Math.min(
            sampledWorkRate,
            previous.workRate * ZOOM_REFRESH_RATE_MAX_GROWTH,
        )
    return {
        workRate,
        // A larger transition overhead must reserve room immediately. Recovery
        // remains smoothed so one cheap frame cannot recreate the next hitch.
        fixedPassesMs: validFixedPassesMs > previous.fixedPassesMs
            ? validFixedPassesMs
            : previous.fixedPassesMs
                * (1 - ZOOM_REFRESH_FIXED_COST_EMA_ALPHA)
                + validFixedPassesMs * ZOOM_REFRESH_FIXED_COST_EMA_ALPHA,
    }
}

export type PredictZoomRefreshBatchInput = {
    model?: ZoomRefreshCostModel
    fallbackWorkRate: number
    frameTargetMs: number
    fallbackFixedPassesMs: number
    activePixelCount: number
    minBatchSize: number
    maxBatchSize: number
}

/** Seed a new live zoom texture from the previous matching dense refresh. */
export function predictZoomRefreshBatchSize(
    input: PredictZoomRefreshBatchInput,
): number | null {
    const modelReady = !!input.model
        && input.model.workRate > 0
        && Number.isFinite(input.model.workRate)
    const workRate = modelReady
        ? input.model!.workRate
        : input.fallbackWorkRate
    if (!(workRate > 0) || !(input.activePixelCount > 0)) return null

    const fixedPassesMs = modelReady
        ? input.model!.fixedPassesMs
        : input.fallbackFixedPassesMs
    const requestedBudgetMs = requestedIterationBudgetMs(
        input.frameTargetMs,
        fixedPassesMs,
    )
    const firstFrameHeadroom = modelReady
        ? ZOOM_REFRESH_MODEL_HEADROOM
        : ZOOM_REFRESH_FALLBACK_HEADROOM
    return batchSizeForWorkRate(
        workRate * firstFrameHeadroom,
        requestedBudgetMs,
        input.activePixelCount,
        input.minBatchSize,
        input.maxBatchSize,
    )
}

export function batchSizeForWorkRate(
    workRate: number,
    requestedBudgetMs: number,
    expectedActivePixelCount: number,
    minBatchSize: number,
    maxBatchSize: number,
): number {
    if (!(workRate > 0) || !(requestedBudgetMs > 0) || !(expectedActivePixelCount > 0)) {
        return minBatchSize
    }
    return clampBatch(
        workRate * requestedBudgetMs / expectedActivePixelCount,
        minBatchSize,
        maxBatchSize,
    )
}
