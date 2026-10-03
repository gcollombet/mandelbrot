// ── Navigation geometry of the live and frozen display grids ──
//
// The engine keeps two iteration fields on the same neutral N×N texture
// layout: the live grid (computed at the live scale, following the camera by
// whole texels) and the frozen grid (the last completed field, kept as a
// fallback while the live one converges). This module owns every quantity
// that places those grids relative to the camera. It is pure arithmetic: no
// GPU object, no engine state, so each rule can be tested in isolation.
//
// Conventions
// - Texel offsets use the content-shift convention: a texture displaced by D
//   is read at (truth − D).
// - Texel +x is complex +x, texel +y is complex −y. `toUv` applies the flip
//   when an offset becomes a shader uniform (fraction of the texture side).
// - One neutral texture side spans 2·√(aspect² + 1) local units, i.e. the
//   diagonal of the viewport, so any rotation of the viewport fits.

export type Vec2 = { readonly x: number; readonly y: number }

export const ZERO: Vec2 = { x: 0, y: 0 }

export type Rect = { x: number; y: number; width: number; height: number }

/** Mapping of the frozen grid into a destination display space, consumed by
 *  the merge pass: frozen at scale ratio `zf`, live at `lzf`. */
export type GridMapping = {
    zf: number
    lzf: number
    frozenShiftU: number
    frozenShiftV: number
    aspect: number
    angle: number
}

export type MergeUniforms = GridMapping & { liveShiftU: number; liveShiftV: number }

const finite = (v: number) => Number.isFinite(v) ? v : 0

/** Side of the square working textures: the surface diagonal, so the
 *  viewport fits at every rotation. */
export function neutralSizeFor(width: number, height: number): number {
    return Math.ceil(Math.sqrt(width * width + height * height))
}

/** Half-diagonal of the viewport in units of its half-height. */
export function neutralExtent(aspect: number): number {
    return Math.sqrt(aspect * aspect + 1)
}

/** Size of one neutral texel in local (scale-normalised) units. */
export function texelLocalSize(aspect: number, neutralSize: number): number {
    return 2 * neutralExtent(aspect) / neutralSize
}

/**
 * Camera motion, in texels of a grid computed at `scale`, for a displacement
 * `delta` of the reference-relative centre (dx, dy) in complex units.
 * Non-finite results (scale 0, overflow) collapse to no motion.
 */
export function cameraShiftTexels(delta: Vec2, aspect: number, neutralSize: number, scale: number): Vec2 {
    const extent = neutralExtent(aspect)
    return {
        x: finite(-(delta.x * neutralSize) / (2 * extent) / scale),
        y: finite((delta.y * neutralSize) / (2 * extent) / scale),
    }
}

/** Texel offset → shader uniform (fraction of the side, v axis flipped). */
export function toUv(offset: Vec2, neutralSize: number): [number, number] {
    return [offset.x / neutralSize, -offset.y / neutralSize]
}

/**
 * Bounding box of the rotated viewport on the neutral grid, snapped outwards
 * to the 8×8 iteration workgroup lattice. `fullDisc` returns the whole grid
 * (rotating keyframes and the live rotation margin need every angle covered).
 */
export function iterationDispatchBox(aspect: number, angle: number, neutralSize: number, fullDisc = false): Rect {
    if (fullDisc) return { x: 0, y: 0, width: neutralSize, height: neutralSize }
    const extent = neutralExtent(aspect)
    const absCos = Math.abs(Math.cos(angle))
    const absSin = Math.abs(Math.sin(angle))
    const halfTexels = neutralSize / 2
    const halfX = ((aspect * absCos + absSin) / extent) * halfTexels
    const halfY = ((aspect * absSin + absCos) / extent) * halfTexels
    const x = Math.max(0, Math.floor((halfTexels - halfX) / 8) * 8)
    const y = Math.max(0, Math.floor((halfTexels - halfY) / 8) * 8)
    const right = Math.min(neutralSize, Math.ceil((halfTexels + halfX) / 8) * 8)
    const bottom = Math.min(neutralSize, Math.ceil((halfTexels + halfY) / 8) * 8)
    return { x, y, width: Math.max(8, right - x), height: Math.max(8, bottom - y) }
}

/**
 * Does the frozen grid still hold every texel of the viewport?
 *
 * The frozen texture only carries what was iterated when it was captured: the
 * viewport box on its own grid (the whole grid with the rotation margin). At
 * zoom ratio `zf` = frozen/display scale the viewport covers 1/zf of that box,
 * displaced by `offset` frozen texels. A zoom on a fixed point never leaves it;
 * a pan does, and mid-cycle the live grid (finer, centred) cannot fill the
 * rest: what neither holds would be emitted unrendered.
 */
export function frozenCoversViewport(input: {
    offset: Vec2
    zf: number
    aspect: number
    angle: number
    neutralSize: number
    /** The frozen texture was iterated over the whole grid (rotation margin). */
    fullGrid: boolean
}): boolean {
    if (!(input.zf > 0) || !Number.isFinite(input.offset.x) || !Number.isFinite(input.offset.y)) return false
    const box = iterationDispatchBox(input.aspect, input.angle, input.neutralSize)
    const validX = input.fullGrid ? input.neutralSize / 2 : box.width / 2
    const validY = input.fullGrid ? input.neutralSize / 2 : box.height / 2
    // One texel of slack: the box is already snapped outwards to 8 texels.
    return Math.abs(input.offset.x) + box.width / 2 / input.zf <= validX + 1
        && Math.abs(input.offset.y) + box.height / 2 / input.zf <= validY + 1
}

/** `rect` grown by `pad` texels on every side, clamped to an n×n grid. */
export function padRect(rect: Rect, pad: number, n: number): Rect {
    const x = Math.max(0, rect.x - pad)
    const y = Math.max(0, rect.y - pad)
    const right = Math.min(n, rect.x + rect.width + pad)
    const bottom = Math.min(n, rect.y + rect.height + pad)
    return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) }
}

/** Intersection of `rect` with a tile, expressed in the tile's local frame. */
export function tileLocalRect(rect: Rect, tile: { originX: number; originY: number; width: number; height: number }): Rect {
    const left = Math.max(rect.x, tile.originX)
    const top = Math.max(rect.y, tile.originY)
    const right = Math.min(rect.x + rect.width, tile.originX + tile.width)
    const bottom = Math.min(rect.y + rect.height, tile.originY + tile.height)
    return {
        x: Math.max(0, left - tile.originX),
        y: Math.max(0, top - tile.originY),
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
    }
}

/**
 * Placement of the live and frozen grids relative to the camera.
 *
 * Frame protocol (one rendered frame):
 *   1. `advanceCamera`   — update(): camera motion since the last rendered frame
 *   2. refresh / merge   — update(): zoom-cycle transitions (swap, stop)
 *   3. `carryLiveShift`  — render(): whole-texel shift applied to the live texture
 *   4. `commit`          — render(): the frame is on screen
 */
export class ViewGrids {
    /**
     * Displacement of the frozen grid relative to the camera, in frozen
     * texels. Exact: it follows the camera's float motion, never the rounded
     * texel shifts applied to the live texture, and it keeps advancing on
     * clear frames (reference re-anchor, table clear) where the live texture
     * does not shift. `frozen` is this frame's value, `frozenCommitted` the
     * last rendered frame's.
     */
    private frozen: Vec2 = ZERO
    private frozenCommitted: Vec2 = ZERO
    /**
     * Sub-texel displacement of the live grid relative to the camera, in live
     * texels (|r| ≤ 0.5). Mid-zoom the navigator does not snap the centre, so
     * a pan moves the camera by fractional texels while the live texture can
     * only move by whole ones. The remainder is carried instead of dropped:
     * the compute pass evaluates the grid (camera + r), the colour pass reads
     * it back at (truth − r). Dropping it made the live content drift from
     * the camera — and from the frozen texture — by the sum of every frame's
     * rounding.
     */
    private residual: Vec2 = ZERO
    /** Camera motion of this frame in texels of the previous live grid. */
    private frameShift: Vec2 = ZERO
    /** Reference re-anchor jump (new reference − old one), consumed by the
     *  next `advanceCamera` that sees the reset. */
    private referenceJump: Vec2 = ZERO

    get frozenOffset(): Vec2 { return this.frozen }
    get liveResidual(): Vec2 { return this.residual }

    /** dx/dy are reference-relative: a re-anchor moves them by exactly the
     *  jump while the view centre stays put. Accumulated until consumed. */
    recordReferenceJump(jump: Vec2): void {
        if (!Number.isFinite(jump.x) || !Number.isFinite(jump.y)) return
        this.referenceJump = { x: this.referenceJump.x + jump.x, y: this.referenceJump.y + jump.y }
    }

    /**
     * Step 1. `delta` is the change of the reference-relative centre since the
     * last rendered frame (null when there is none, or in expmap). When
     * `orbitWasReset`, the pending reference jump is added back, so the
     * camera motion stays continuous across a re-anchor.
     */
    advanceCamera(input: {
        delta: Vec2 | null
        orbitWasReset: boolean
        aspect: number
        neutralSize: number
        liveScale: number
        frozenScale: number
    }): void {
        const jump = input.orbitWasReset ? this.referenceJump : ZERO
        if (input.orbitWasReset) this.referenceJump = ZERO
        const delta = input.delta ? { x: input.delta.x + jump.x, y: input.delta.y + jump.y } : ZERO
        this.frameShift = cameraShiftTexels(delta, input.aspect, input.neutralSize, input.liveScale)
        const frozenShift = cameraShiftTexels(delta, input.aspect, input.neutralSize, input.frozenScale)
        this.frozen = { x: this.frozenCommitted.x + frozenShift.x, y: this.frozenCommitted.y + frozenShift.y }
    }

    /**
     * Idle refresh: the destination is the live grid (live read unshifted);
     * the old frozen grid sits at (committed frozen offset − live residual)
     * from it, both measured from the last rendered camera.
     */
    idleRefreshMapping(aspect: number, neutralSize: number): GridMapping {
        const [frozenShiftU, frozenShiftV] = toUv({
            x: this.frozenCommitted.x - this.residual.x,
            y: this.frozenCommitted.y - this.residual.y,
        }, neutralSize)
        return { zf: 1, lzf: 1, frozenShiftU, frozenShiftV, aspect, angle: 0 }
    }

    /**
     * Mid-zoom swap: the new frozen texture takes the live grid (lzf = 1) and
     * absorbs the old frozen where it is still finer (zf = frozen/live). The
     * old frozen sits at (its offset − the live residual, in frozen texels).
     */
    swapRefreshMapping(input: {
        frozenScale: number
        liveScale: number
        aspect: number
        angle: number
        neutralSize: number
    }): GridMapping {
        const liveToFrozen = input.liveScale / input.frozenScale
        const [frozenShiftU, frozenShiftV] = toUv({
            x: this.frozenCommitted.x - this.residual.x * liveToFrozen,
            y: this.frozenCommitted.y - this.residual.y * liveToFrozen,
        }, input.neutralSize)
        return {
            zf: input.frozenScale / input.liveScale,
            lzf: 1,
            frozenShiftU,
            frozenShiftV,
            aspect: input.aspect,
            angle: input.angle,
        }
    }

    /** After any frozen refresh, the new frozen texture is the live grid of
     *  the last rendered frame, seen from the current camera. */
    frozenBecomesLive(): void {
        this.frozen = { x: this.residual.x + this.frameShift.x, y: this.residual.y + this.frameShift.y }
    }

    /**
     * Zoom stop: merge both grids into the CURRENT camera's display space (the
     * navigator snaps the centre on this very frame), each read at its exact
     * displacement from it. The merged result is camera-aligned, so the
     * frozen offset restarts from zero.
     */
    stopMerge(input: {
        frozenScale: number
        liveScale: number
        scale: number
        aspect: number
        angle: number
        neutralSize: number
    }): MergeUniforms {
        const [frozenShiftU, frozenShiftV] = toUv(this.frozen, input.neutralSize)
        const [liveShiftU, liveShiftV] = toUv({
            x: this.residual.x + this.frameShift.x,
            y: this.residual.y + this.frameShift.y,
        }, input.neutralSize)
        this.frozen = ZERO
        return {
            zf: input.frozenScale / input.scale,
            lzf: input.liveScale / input.scale,
            frozenShiftU,
            frozenShiftV,
            aspect: input.aspect,
            angle: input.angle,
            liveShiftU,
            liveShiftV,
        }
    }

    /**
     * Step 3. Accumulates the live texture's float `shift` (texels) with the
     * carried residual and returns the whole-texel shift to apply; the
     * sub-texel remainder stays in the residual. `null` means the live
     * history is rebuilt from scratch (clear frame, expmap): no shift, no
     * residual.
     */
    carryLiveShift(shift: Vec2 | null): Vec2 {
        if (!shift) {
            this.residual = ZERO
            return ZERO
        }
        const totalX = this.residual.x + finite(shift.x)
        const totalY = this.residual.y + finite(shift.y)
        const rounded = { x: Math.round(totalX), y: Math.round(totalY) }
        this.residual = { x: totalX - rounded.x, y: totalY - rounded.y }
        return rounded
    }

    /** Compute-pass centre of the grid the live texture actually holds
     *  (camera + residual), from the camera centre in local units. */
    liveComputeCenter(center: { cx: number; cy: number; scale: number }, aspect: number, neutralSize: number): [number, number] {
        const texel = texelLocalSize(aspect, neutralSize)
        return [
            center.cx + this.residual.x * texel * center.scale,
            center.cy - this.residual.y * texel * center.scale,
        ]
    }

    /** Tiled keyframes: a completed live keyframe becomes the frozen one, on
     *  the live grid by construction. */
    alignFrozenToLive(): void {
        this.frozen = this.frozenCommitted = this.residual
    }

    /** Step 4. */
    commit(): void {
        this.frozenCommitted = this.frozen
    }
}
