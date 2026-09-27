// ── What the next frame must do, and how it will do it ──
//
// Two halves, both free of GPU objects:
//
// - `FrameRequests` accumulates the intents posted between two frames by
//   every part of the engine (reference worker, BLA table, zoom cycle, AA,
//   tiled keyframes, expmap…): rebuild the live history, refresh the frozen
//   fallback. A clear keeps the reasons that asked for it, so a frame can
//   always say why it restarted.
// - `planFrame` turns those intents and the frame's measured inputs into an
//   immutable `FramePlan`: which utility pass runs, whether the snapshot
//   still applies, where the toroidal raw origin moves, how many pixels are
//   active, whether the unfinished-pixel counter is sampled. render() only
//   executes the plan.

import type {Vec2} from './viewGrids'

export type ClearReason =
    /** No usable previous frame, re-anchored orbit or new mu (see classifyFrame). */
    | 'referenceReset'
    /** Zoom cycle transition: start, swap, stop, or reset (ZoomEffect). */
    | 'zoomCycle'
    /** Scale stabilised without a reprojection cycle: re-snap the grid. */
    | 'smallZoomStop'
    /** The rebuilt approximation table landed (deferred clear), or its deadline passed. */
    | 'tableReady'
    | 'tableDeadline'
    /** Approximation parameters changed and no table rebuild is awaited. */
    | 'tableClear'
    | 'orbitTrap'
    | 'orbitMetrics'
    /** The reference orbit now covers the grown iteration budget. */
    | 'orbitComplete'
    /** The raw analytic payload is in a stale role after a 9-layer pan. */
    | 'analyticPayload'
    /** AA restart from a jittered base, or next sample without selective reseed. */
    | 'aaRestart'
    | 'aaSample'
    /** Tiled keyframe: next tile or next keyframe. */
    | 'tile'
    | 'expmapBlock'
    /** Dev tooling and E2E specs forcing a fresh field. */
    | 'external'

/**
 * How the frozen fallback is refreshed from the resolved (live) display set.
 * `copy` replaces it; `merge` keeps the finest pixel of both (min-step).
 */
export type SnapshotKind = 'copy' | 'merge'

export class FrameRequests {
    private readonly reasons = new Set<ClearReason>()
    private pendingSnapshot: SnapshotKind | null = null

    get clearPending(): boolean { return this.reasons.size > 0 }
    get clearReasons(): ClearReason[] { return [...this.reasons] }
    get snapshot(): SnapshotKind | null { return this.pendingSnapshot }

    requestClear(reason: ClearReason): void {
        this.reasons.add(reason)
    }

    /**
     * A copy replaces the whole frozen set with the resolved one, so it
     * subsumes any pending merge (a merge followed by a copy leaves exactly
     * the copy). A merge requested with `replace` supersedes a pending copy:
     * it is the refresh that keeps the finer frozen pixels.
     */
    requestSnapshot(kind: SnapshotKind, options: { replace?: boolean } = {}): void {
        if (kind === 'copy' || options.replace || this.pendingSnapshot === null) {
            this.pendingSnapshot = kind
        }
    }

    cancelSnapshot(): void {
        this.pendingSnapshot = null
    }

    /** The snapshot pass ran. */
    snapshotDone(): void {
        this.pendingSnapshot = null
    }

    /** The frame that executed the clear was submitted. */
    clearDone(): void {
        this.reasons.clear()
    }
}

export type UtilityPass = 'clear' | 'pan' | 'none'

export type FramePlanInput = {
    /** Reasons of the clear requested before this frame (FrameRequests.clearReasons). */
    clearReasons: readonly ClearReason[]
    /** The analytic payload is needed but the raw layers are not aligned. */
    analyticPayloadStale: boolean
    snapshot: SnapshotKind | null
    zoomActive: boolean
    /** A tiled keyframe is being built (snapshots are role swaps there). */
    tiled: boolean
    /** Tiled mode: a tile of the keyframe is being built (field work left). */
    tiledTileActive: boolean
    /** Whole-texel live shift returned by ViewGrids.carryLiveShift. */
    shift: Vec2
    /** Current toroidal raw origin, and the side it wraps on. */
    rawOrigin: Vec2
    rawSide: number
    /** Visible pixels (tile area in tiled mode) and the viewport size. */
    visiblePixelCount: number
    width: number
    height: number
    /** Last unfinished-pixel readback, negative when unknown. */
    unfinishedPixelCount: number
}

export type FramePlan = {
    clear: boolean
    /** Why this frame rebuilds the live history (empty when it does not). */
    clearReasons: ClearReason[]
    /** Translation of the live texture by whole texels (never on a clear frame). */
    hasTranslationShift: boolean
    utility: UtilityPass
    /** Snapshot that still applies to this frame (tiled mode and idle pans cancel it). */
    snapshot: SnapshotKind | null
    /** The translation moves the live texture away from the frozen one. */
    frozenLosesAlignment: boolean
    rawOrigin: Vec2
    /** Pixels newly exposed at the border by the translation. */
    exposedPixelCount: number
    /** Pixels expected to iterate this frame, −1 when unknown. */
    activePixelCount: number
    /** Field passes run (outside tiled mode, or while a tile is being built). */
    runFieldPasses: boolean
}

/**
 * Decide the field topology of one frame.
 *
 * `shift` must come from ViewGrids.carryLiveShift called with `null` when
 * `frameClears(input)` holds: a clear rebuilds the live grid, so it never
 * translates.
 */
export function planFrame(input: FramePlanInput): FramePlan {
    const clearReasons = frameClearReasons(input)
    const clear = clearReasons.length > 0
    const hasTranslationShift = input.shift.x !== 0 || input.shift.y !== 0

    let snapshot = input.snapshot
    // Tiled keyframes represent full-image snapshots by binding-role swaps: no
    // copy or merge request may leak into a tile build.
    if (input.tiled) snapshot = null
    // An idle translation makes a pending copy duplicate the pre-translation
    // resolved texture and mark it aligned with the translated live one; a
    // pending idle merge assumed a shared display space. Mid-zoom the grids
    // track both offsets, so the snapshot stays valid.
    if (hasTranslationShift && !input.zoomActive) snapshot = null

    const exposedX = Math.min(input.width, Math.abs(input.shift.x))
    const exposedY = Math.min(input.height, Math.abs(input.shift.y))
    const exposedPixelCount = Math.min(
        input.visiblePixelCount,
        exposedX * input.height + exposedY * input.width - exposedX * exposedY,
    )
    const activePixelCount = clear
        ? input.visiblePixelCount
        : input.unfinishedPixelCount >= 0
            ? Math.min(input.visiblePixelCount, input.unfinishedPixelCount + exposedPixelCount)
            : exposedPixelCount > 0 ? exposedPixelCount : -1

    return {
        clear,
        clearReasons,
        hasTranslationShift,
        utility: clear ? 'clear' : hasTranslationShift ? 'pan' : 'none',
        snapshot,
        frozenLosesAlignment: !clear && hasTranslationShift,
        rawOrigin: advanceRawOrigin(input.rawOrigin, input.shift, clear, input.rawSide),
        exposedPixelCount,
        activePixelCount,
        runFieldPasses: !input.tiled || input.tiledTileActive,
    }
}

type ClearInput = Pick<FramePlanInput, 'clearReasons' | 'analyticPayloadStale'>

/** A frame clears when asked to, or when the analytic payload must be rebuilt. */
export function frameClearReasons(input: ClearInput): ClearReason[] {
    const reasons = [...input.clearReasons]
    if (input.analyticPayloadStale && !reasons.includes('analyticPayload')) reasons.push('analyticPayload')
    return reasons
}

export function frameClears(input: ClearInput): boolean {
    return frameClearReasons(input).length > 0
}

/**
 * Toroidal raw origin. A clear rewrites the texture wholesale at origin 0; a
 * pan shifts the origin so logical texel L now reads what L − shift held, and
 * only the wrapped-in strip is stamped.
 */
export function advanceRawOrigin(origin: Vec2, shift: Vec2, clear: boolean, side: number): Vec2 {
    if (clear) return { x: 0, y: 0 }
    if (shift.x === 0 && shift.y === 0) return origin
    const n = Math.max(1, side)
    return {
        x: (((origin.x - shift.x) % n) + n) % n,
        y: (((origin.y - shift.y) % n) + n) % n,
    }
}
