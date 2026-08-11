export const MAX_FRAME_PACING_INTERVAL_MS = 500
export const MAX_FRAME_PACING_CREDIT_INTERVALS = 2

export type FramePacingDecision = {
    shouldDraw: boolean
    creditMs: number
    lastTickMs: number
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

    const maxCreditMs = intervalMs * MAX_FRAME_PACING_CREDIT_INTERVALS
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
