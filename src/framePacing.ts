export const MAX_FRAME_PACING_INTERVAL_MS = 500
export const MAX_FRAME_PACING_CREDIT_INTERVALS = 2
export const QUEUE_BLOCKED_MAX_CREDIT_INTERVALS = 1
export const MAX_FRAME_PACING_IN_FLIGHT = 3

export const INITIAL_FRAME_PACING_GPU_UTILIZATION = 0.9
export const MIN_FRAME_PACING_GPU_UTILIZATION = 0.75
export const MAX_FRAME_PACING_GPU_UTILIZATION = 0.95
export const FRAME_PACING_CONGESTION_FACTOR = 0.9
export const FRAME_PACING_RECOVERY_STEP = 0.01
export const FRAME_PACING_RECOVERY_FRAMES = 30

export type FramePacingDecision = {
    shouldDraw: boolean
    creditMs: number
    lastTickMs: number
}

export type FramePacingLoadState = {
    utilization: number
    healthyFrames: number
}

function clampUtilization(value: number): number {
    const finite = Number.isFinite(value)
        ? value
        : INITIAL_FRAME_PACING_GPU_UTILIZATION
    return Math.min(
        MAX_FRAME_PACING_GPU_UTILIZATION,
        Math.max(MIN_FRAME_PACING_GPU_UTILIZATION, finite),
    )
}

/**
 * Reserve headroom around the timestamp-query span. The GPU span does not
 * include every queue/presentation constraint, so targeting 100% utilization
 * can slowly build an invisible backlog even when every measured pass is flat.
 */
export function framePacingIntervalForGpuSpan(
    gpuSpanMs: number,
    utilization: number,
): number {
    if (!(Number.isFinite(gpuSpanMs) && gpuSpanMs > 0)) return 0
    return Math.min(
        MAX_FRAME_PACING_INTERVAL_MS,
        gpuSpanMs / clampUtilization(utilization),
    )
}

/** Coarse queue depth from monotonic submission/completion watermarks. */
export function countFramesInFlight(
    submittedSerial: number,
    completedSerial: number,
): number {
    const submitted = Number.isFinite(submittedSerial)
        ? Math.max(0, Math.floor(submittedSerial))
        : 0
    const completed = Number.isFinite(completedSerial)
        ? Math.max(0, Math.floor(completedSerial))
        : 0
    return Math.max(0, submitted - completed)
}

/**
 * AIMD-like safety-margin controller. Congestion reduces the target load at
 * once; a stable stream of submitted frames recovers capacity in small steps.
 */
export function advanceFramePacingLoad(
    utilization: number,
    healthyFrames: number,
    event: 'submitted' | 'congested' | 'idle',
): FramePacingLoadState {
    const current = clampUtilization(utilization)
    if (event === 'congested') {
        return {
            utilization: Math.max(
                MIN_FRAME_PACING_GPU_UTILIZATION,
                current * FRAME_PACING_CONGESTION_FACTOR,
            ),
            healthyFrames: 0,
        }
    }
    if (event !== 'submitted') {
        return {
            utilization: current,
            healthyFrames: Math.max(0, Math.floor(healthyFrames)),
        }
    }

    const nextHealthyFrames = Math.max(0, Math.floor(healthyFrames)) + 1
    if (nextHealthyFrames < FRAME_PACING_RECOVERY_FRAMES) {
        return {utilization: current, healthyFrames: nextHealthyFrames}
    }
    return {
        utilization: Math.min(
            MAX_FRAME_PACING_GPU_UTILIZATION,
            current + FRAME_PACING_RECOVERY_STEP,
        ),
        healthyFrames: 0,
    }
}

/**
 * Accumulate real rAF time and consume one GPU interval per submitted frame.
 *
 * Keeping the fractional credit avoids quantizing every 16.9 ms GPU frame to
 * two 16.7 ms display ticks. Credit is capped so a long tab/main-thread stall
 * can produce at most one extra frame of catch-up rather than a queue backlog.
 */
export function advanceFramePacer(
    nowMs: number,
    targetIntervalMs: number,
    lastTickMs: number,
    creditMs: number,
    frameComplete: boolean,
    maxCreditIntervals = MAX_FRAME_PACING_CREDIT_INTERVALS,
): FramePacingDecision {
    const validNowMs = Number.isFinite(nowMs) ? nowMs : 0
    const intervalMs = Number.isFinite(targetIntervalMs)
        ? Math.min(MAX_FRAME_PACING_INTERVAL_MS, Math.max(0, targetIntervalMs))
        : 0
    const firstTick = !(lastTickMs >= 0) || validNowMs < lastTickMs
    const elapsedMs = firstTick ? 0 : validNowMs - lastTickMs

    if (!(intervalMs > 0)) {
        return {
            shouldDraw: frameComplete,
            creditMs: 0,
            lastTickMs: validNowMs,
        }
    }

    const validCreditIntervals = Number.isFinite(maxCreditIntervals)
        ? Math.max(0, maxCreditIntervals)
        : MAX_FRAME_PACING_CREDIT_INTERVALS
    const maxCreditMs = intervalMs * validCreditIntervals
    let nextCreditMs = Math.min(
        maxCreditMs,
        Math.max(0, Number.isFinite(creditMs) ? creditMs : 0) + elapsedMs,
    )
    const shouldDraw = frameComplete && (firstTick || nextCreditMs >= intervalMs)
    if (shouldDraw) {
        nextCreditMs = Math.max(0, nextCreditMs - intervalMs)
    }

    return {
        shouldDraw,
        creditMs: nextCreditMs,
        lastTickMs: validNowMs,
    }
}
