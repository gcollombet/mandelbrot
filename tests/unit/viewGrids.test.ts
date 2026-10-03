import {describe, expect, it} from 'vitest'
import {
    ViewGrids,
    frozenCoversViewport,
    ZERO,
    cameraShiftTexels,
    iterationDispatchBox,
    neutralExtent,
    padRect,
    texelLocalSize,
    tileLocalRect,
    toUv,
} from '../../src/viewGrids'

const N = 1024
const ASPECT = 16 / 9

/** Deterministic pseudo-random sequence (LCG), so failures reproduce. */
function lcg(seed: number) {
    let state = seed >>> 0
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0
        return state / 2 ** 32
    }
}

/** Complex-plane displacement that moves the camera by `texels` on a grid at `scale`. */
function deltaForTexels(texels: { x: number; y: number }, scale: number) {
    const k = (2 * neutralExtent(ASPECT) * scale) / N
    return { x: -texels.x * k, y: texels.y * k }
}

describe('cameraShiftTexels', () => {
    it('follows the content-shift convention: +dx moves content left, +dy moves it down', () => {
        const shift = cameraShiftTexels({ x: 1e-3, y: 1e-3 }, ASPECT, N, 1e-3)
        expect(shift.x).toBeLessThan(0)
        expect(shift.y).toBeGreaterThan(0)
    })

    it('is the inverse of the texel size: one texel of motion is one texel of shift', () => {
        const scale = 3.7e-9
        const shift = cameraShiftTexels(deltaForTexels({ x: 1, y: -2 }, scale), ASPECT, N, scale)
        expect(shift.x).toBeCloseTo(1, 12)
        expect(shift.y).toBeCloseTo(-2, 12)
    })

    it('scales inversely with the grid scale', () => {
        const delta = { x: 1e-6, y: 0 }
        const coarse = cameraShiftTexels(delta, ASPECT, N, 2e-6)
        const fine = cameraShiftTexels(delta, ASPECT, N, 1e-6)
        expect(fine.x / coarse.x).toBeCloseTo(2, 12)
    })

    it('collapses non-finite results to no motion', () => {
        expect(cameraShiftTexels({ x: 1, y: 1 }, ASPECT, N, 0)).toEqual({ x: 0, y: 0 })
        expect(cameraShiftTexels(ZERO, ASPECT, N, 0)).toEqual({ x: 0, y: 0 })
    })
})

describe('toUv / texelLocalSize', () => {
    it('flips the v axis and normalises by the side', () => {
        expect(toUv({ x: 256, y: 128 }, N)).toEqual([0.25, -0.125])
    })

    it('a side spans the viewport diagonal', () => {
        expect(texelLocalSize(ASPECT, N) * N).toBeCloseTo(2 * Math.hypot(ASPECT, 1), 12)
    })
})

describe('ViewGrids.carryLiveShift', () => {
    it('never drifts: whole shifts plus the residual always sum to the float motion', () => {
        const grids = new ViewGrids()
        const random = lcg(7)
        let appliedX = 0, appliedY = 0, truthX = 0, truthY = 0
        for (let frame = 0; frame < 10_000; frame++) {
            const shift = { x: (random() - 0.5) * 7.3, y: (random() - 0.5) * 3.1 }
            truthX += shift.x
            truthY += shift.y
            const rounded = grids.carryLiveShift(shift)
            expect(Number.isInteger(rounded.x) && Number.isInteger(rounded.y)).toBe(true)
            appliedX += rounded.x
            appliedY += rounded.y
            expect(Math.abs(grids.liveResidual.x)).toBeLessThanOrEqual(0.5)
            expect(Math.abs(grids.liveResidual.y)).toBeLessThanOrEqual(0.5)
        }
        expect(appliedX + grids.liveResidual.x).toBeCloseTo(truthX, 9)
        expect(appliedY + grids.liveResidual.y).toBeCloseTo(truthY, 9)
    })

    it('null rebuilds the live grid: no shift and no residual', () => {
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.3, y: -0.2 })
        expect(grids.carryLiveShift(null)).toEqual({ x: 0, y: 0 })
        expect(grids.liveResidual).toEqual({ x: 0, y: 0 })
    })

    it('treats a non-finite shift as no motion', () => {
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.25, y: 0 })
        expect(grids.carryLiveShift({ x: Number.NaN, y: Infinity })).toEqual({ x: 0, y: 0 })
        expect(grids.liveResidual).toEqual({ x: 0.25, y: 0 })
    })
})

describe('ViewGrids.advanceCamera', () => {
    const advance = (grids: ViewGrids, texels: { x: number; y: number }, scale: number, extra: Partial<Parameters<ViewGrids['advanceCamera']>[0]> = {}) =>
        grids.advanceCamera({
            delta: deltaForTexels(texels, scale),
            orbitWasReset: false,
            aspect: ASPECT,
            neutralSize: N,
            liveScale: scale,
            frozenScale: scale,
            ...extra,
        })

    it('measures the frozen offset from the committed one, in frozen texels', () => {
        const grids = new ViewGrids()
        advance(grids, { x: 3, y: 0 }, 1e-5, { frozenScale: 2e-5 })
        expect(grids.frozenOffset.x).toBeCloseTo(1.5, 9)
        // Not committed: a second advance restarts from the same base.
        advance(grids, { x: 3, y: 0 }, 1e-5, { frozenScale: 2e-5 })
        expect(grids.frozenOffset.x).toBeCloseTo(1.5, 9)
        grids.commit()
        advance(grids, { x: 3, y: 0 }, 1e-5, { frozenScale: 2e-5 })
        expect(grids.frozenOffset.x).toBeCloseTo(3, 9)
    })

    it('no previous frame means no motion', () => {
        const grids = new ViewGrids()
        grids.advanceCamera({ delta: null, orbitWasReset: false, aspect: ASPECT, neutralSize: N, liveScale: 1, frozenScale: 1 })
        expect(grids.frozenOffset).toEqual({ x: 0, y: 0 })
    })

    it('stays continuous across a reference re-anchor', () => {
        // The reference moves by J: dx/dy (reference-relative) jump by −J while
        // the view centre does not move. The camera must not move either.
        const scale = 1e-12
        const grids = new ViewGrids()
        const jump = { x: 5e-12, y: -2e-12 }
        grids.recordReferenceJump(jump)
        grids.advanceCamera({
            delta: { x: -jump.x, y: -jump.y },
            orbitWasReset: true,
            aspect: ASPECT,
            neutralSize: N,
            liveScale: scale,
            frozenScale: scale,
        })
        expect(Math.abs(grids.frozenOffset.x)).toBeLessThan(1e-9)
        expect(Math.abs(grids.frozenOffset.y)).toBeLessThan(1e-9)
    })

    it('keeps the jump pending until a frame reports the reset, then consumes it once', () => {
        const grids = new ViewGrids()
        grids.recordReferenceJump({ x: 1e-3, y: 0 })
        grids.recordReferenceJump({ x: Number.NaN, y: 0 }) // ignored
        const input = { delta: ZERO, aspect: ASPECT, neutralSize: N, liveScale: 1e-3, frozenScale: 1e-3 }
        grids.advanceCamera({ ...input, orbitWasReset: false })
        expect(grids.frozenOffset.x).toBe(0)
        grids.advanceCamera({ ...input, orbitWasReset: true })
        const consumed = grids.frozenOffset.x
        expect(consumed).not.toBe(0)
        grids.advanceCamera({ ...input, orbitWasReset: true })
        expect(grids.frozenOffset.x).toBe(0)
    })
})

describe('ViewGrids frame protocol', () => {
    it('frozen and live stay registered through a pan: frozen − residual − Σ whole live shifts is constant', () => {
        const scale = 1e-7
        const grids = new ViewGrids()
        const random = lcg(42)
        // Snapshot: the frozen texture becomes the live grid.
        grids.advanceCamera({ delta: ZERO, orbitWasReset: false, aspect: ASPECT, neutralSize: N, liveScale: scale, frozenScale: scale })
        grids.frozenBecomesLive()
        grids.carryLiveShift(ZERO)
        grids.commit()
        const invariant = () => grids.frozenOffset.x - grids.liveResidual.x - appliedX
        let appliedX = 0
        const start = invariant()
        for (let frame = 0; frame < 500; frame++) {
            const texels = { x: (random() - 0.5) * 4, y: 0 }
            const delta = deltaForTexels(texels, scale)
            grids.advanceCamera({ delta, orbitWasReset: false, aspect: ASPECT, neutralSize: N, liveScale: scale, frozenScale: scale })
            appliedX += grids.carryLiveShift(cameraShiftTexels(delta, ASPECT, N, scale)).x
            grids.commit()
            expect(invariant()).toBeCloseTo(start, 8)
        }
    })

    it('a refresh puts the frozen grid on the live one, seen from the current camera', () => {
        const scale = 1e-4
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.3, y: -0.4 })
        grids.advanceCamera({ delta: deltaForTexels({ x: 2, y: 1 }, scale), orbitWasReset: false, aspect: ASPECT, neutralSize: N, liveScale: scale, frozenScale: scale })
        grids.frozenBecomesLive()
        expect(grids.frozenOffset.x).toBeCloseTo(2.3, 9)
        expect(grids.frozenOffset.y).toBeCloseTo(0.6, 9)
    })

    it('idle refresh maps the committed frozen grid relative to the live residual', () => {
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.25, y: 0 })
        grids.advanceCamera({ delta: deltaForTexels({ x: 10, y: 0 }, 1), orbitWasReset: false, aspect: ASPECT, neutralSize: N, liveScale: 1, frozenScale: 1 })
        grids.commit()
        const mapping = grids.idleRefreshMapping(ASPECT, N)
        expect(mapping).toMatchObject({ zf: 1, lzf: 1, aspect: ASPECT, angle: 0 })
        expect(mapping.frozenShiftU).toBeCloseTo((10 - 0.25) / N, 12)
    })

    it('a mid-zoom swap expresses the live residual in frozen texels', () => {
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.3, y: 0 })
        const mapping = grids.swapRefreshMapping({ frozenScale: 4, liveScale: 1, aspect: ASPECT, angle: 0.3, neutralSize: N })
        expect(mapping.zf).toBe(4)
        expect(mapping.lzf).toBe(1)
        expect(mapping.frozenShiftU).toBeCloseTo(-0.3 * 0.25 / N, 15)
        expect(mapping.angle).toBe(0.3)
    })

    it('a zoom stop merges into the camera space and restarts the frozen offset at zero', () => {
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.2, y: 0.1 })
        grids.advanceCamera({ delta: deltaForTexels({ x: 1, y: 2 }, 1), orbitWasReset: false, aspect: ASPECT, neutralSize: N, liveScale: 1, frozenScale: 2 })
        const merge = grids.stopMerge({ frozenScale: 2, liveScale: 1, scale: 1.5, aspect: ASPECT, angle: 0, neutralSize: N })
        expect(merge.zf).toBeCloseTo(2 / 1.5, 12)
        expect(merge.lzf).toBeCloseTo(1 / 1.5, 12)
        expect(merge.frozenShiftU).toBeCloseTo(0.5 / N, 12)
        expect(merge.frozenShiftV).toBeCloseTo(-1 / N, 12)
        expect(merge.liveShiftU).toBeCloseTo(1.2 / N, 12)
        expect(merge.liveShiftV).toBeCloseTo(-2.1 / N, 12)
        expect(grids.frozenOffset).toEqual({ x: 0, y: 0 })
    })

    it('the compute centre is the camera displaced by the residual', () => {
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.3, y: -0.25 })
        const center = { cx: 0.1, cy: -0.2, scale: 3 }
        const [cx, cy] = grids.liveComputeCenter(center, ASPECT, N)
        const texel = texelLocalSize(ASPECT, N) * center.scale
        expect((cx - center.cx) / texel).toBeCloseTo(0.3, 9)
        expect((cy - center.cy) / texel).toBeCloseTo(0.25, 9)
    })

    it('tiled keyframes align frozen with the live grid, committed included', () => {
        const grids = new ViewGrids()
        grids.carryLiveShift({ x: 0.4, y: 0.1 })
        grids.alignFrozenToLive()
        expect(grids.frozenOffset).toEqual(grids.liveResidual)
        grids.advanceCamera({ delta: ZERO, orbitWasReset: false, aspect: ASPECT, neutralSize: N, liveScale: 1, frozenScale: 1 })
        expect(grids.frozenOffset).toEqual(grids.liveResidual)
    })
})

describe('iterationDispatchBox', () => {
    it('covers the rotated viewport for every angle, on the 8-texel lattice', () => {
        const extent = neutralExtent(ASPECT)
        for (let i = 0; i < 64; i++) {
            const angle = (i / 64) * 2 * Math.PI
            const box = iterationDispatchBox(ASPECT, angle, N)
            expect(box.x % 8).toBe(0)
            expect(box.y % 8).toBe(0)
            expect(box.x + box.width).toBeLessThanOrEqual(N)
            expect(box.y + box.height).toBeLessThanOrEqual(N)
            for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                const lx = sx * ASPECT, ly = sy
                const rx = lx * Math.cos(angle) - ly * Math.sin(angle)
                const ry = lx * Math.sin(angle) + ly * Math.cos(angle)
                const tx = N / 2 + (rx / extent) * (N / 2)
                const ty = N / 2 + (ry / extent) * (N / 2)
                expect(tx).toBeGreaterThanOrEqual(box.x - 1e-9)
                expect(tx).toBeLessThanOrEqual(box.x + box.width + 1e-9)
                expect(ty).toBeGreaterThanOrEqual(box.y - 1e-9)
                expect(ty).toBeLessThanOrEqual(box.y + box.height + 1e-9)
            }
        }
    })

    it('returns the whole grid for the full disc', () => {
        expect(iterationDispatchBox(ASPECT, 0.4, N, true)).toEqual({ x: 0, y: 0, width: N, height: N })
    })
})

describe('rect helpers', () => {
    it('padRect grows and clamps', () => {
        expect(padRect({ x: 4, y: 100, width: 10, height: 10 }, 8, 112)).toEqual({ x: 0, y: 92, width: 22, height: 20 })
    })

    it('tileLocalRect intersects in tile coordinates', () => {
        const tile = { originX: 256, originY: 0, width: 256, height: 256 }
        expect(tileLocalRect({ x: 200, y: 100, width: 100, height: 300 }, tile)).toEqual({ x: 0, y: 100, width: 44, height: 156 })
        expect(tileLocalRect({ x: 0, y: 0, width: 10, height: 10 }, tile).width).toBe(0)
    })
})

describe('frozenCoversViewport', () => {
    const base = { aspect: ASPECT, angle: 0, neutralSize: N, fullGrid: false }
    const box = iterationDispatchBox(ASPECT, 0, N)

    it('a zoom on a fixed point stays covered', () => {
        for (const zf of [1, 1.5, 4]) expect(frozenCoversViewport({ ...base, offset: ZERO, zf })).toBe(true)
    })

    it('right after a swap (zf = 1) a pan of a few texels leaves the frozen texture', () => {
        expect(frozenCoversViewport({ ...base, offset: { x: 0.5, y: 0 }, zf: 1 })).toBe(true)
        expect(frozenCoversViewport({ ...base, offset: { x: 4, y: 0 }, zf: 1 })).toBe(false)
        expect(frozenCoversViewport({ ...base, offset: { x: 0, y: -4 }, zf: 1 })).toBe(false)
    })

    it('the margin grows with the zoom ratio', () => {
        // At zf = 2 the viewport spans half the box: a quarter box of slack each side.
        const slack = box.width / 4
        expect(frozenCoversViewport({ ...base, offset: { x: slack - 1, y: 0 }, zf: 2 })).toBe(true)
        expect(frozenCoversViewport({ ...base, offset: { x: slack + 2, y: 0 }, zf: 2 })).toBe(false)
    })

    it('the rotation margin widens the valid region to the whole grid', () => {
        const offset = { x: 0, y: (N - box.height) / 2 - 2 }
        expect(frozenCoversViewport({ ...base, offset, zf: 1 })).toBe(false)
        expect(frozenCoversViewport({ ...base, offset, zf: 1, fullGrid: true })).toBe(true)
    })

    it('degenerate inputs are never covered', () => {
        expect(frozenCoversViewport({ ...base, offset: ZERO, zf: 0 })).toBe(false)
        expect(frozenCoversViewport({ ...base, offset: { x: NaN, y: 0 }, zf: 2 })).toBe(false)
    })
})
