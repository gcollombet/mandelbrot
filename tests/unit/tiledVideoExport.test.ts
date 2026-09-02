import {describe, expect, it} from 'vitest'
import {
    allocateAggregateBitrate,
    estimateIntermediateSize,
    planVideoComposition,
    planVideoTiles,
    projectTileView,
    scaleFloatExp,
    temporalExpandedRectFor,
    tileZoomPivot,
    totalTileHalo,
    type ExpandedTile,
} from '../../src/tiledVideoExport'

const BASE = {
    fullFrame: {width: 3840, height: 2160},
    supersample: 4,
    halo: {filter: 2, render: 1, codec: 8},
    maxTextureDimension2D: 8192,
    gpuBudgetBytes: 2 * 1024 ** 3,
    bytesPerWorkingTexel: 324,
}

describe('totalTileHalo', () => {
    it('shares the larger render/filter neighbourhood and adds the codec guard', () => {
        expect(totalTileHalo({filter: 2, render: 5, codec: 8})).toBe(13)
        expect(totalTileHalo({filter: 7, render: 3, codec: 0})).toBe(7)
    })
})

describe('planVideoTiles', () => {
    it('partitions every output pixel exactly once', () => {
        const plan = planVideoTiles({...BASE, preferredCoreWidth: 480, preferredCoreHeight: 270})
        const owners = new Uint8Array(plan.fullFrame.width * plan.fullFrame.height)
        for (const tile of plan.tiles) {
            for (let y = tile.core.y; y < tile.core.y + tile.core.height; y++) {
                for (let x = tile.core.x; x < tile.core.x + tile.core.width; x++) {
                    owners[y * plan.fullFrame.width + x]++
                }
            }
        }
        expect(owners.every(count => count === 1)).toBe(true)
        expect(plan.columns).toBe(8)
        expect(plan.rows).toBe(8)
    })

    it('creates smaller right and bottom edge cores for non-divisible dimensions', () => {
        const plan = planVideoTiles({
            ...BASE,
            fullFrame: {width: 1001, height: 563},
            preferredCoreWidth: 320,
            preferredCoreHeight: 180,
        })
        const last = plan.tiles.at(-1)!
        expect(plan.columns).toBe(4)
        expect(plan.rows).toBe(4)
        expect(last.core).toMatchObject({x: 960, y: 540, width: 41, height: 23})
        expect(last.expanded.x + last.expanded.width).toBe(1001)
        expect(last.expanded.y + last.expanded.height).toBe(563)
    })

    it('keeps the core crop inside the encoded halo', () => {
        const plan = planVideoTiles({...BASE, preferredCoreWidth: 480, preferredCoreHeight: 270})
        const interior = plan.tiles.find(tile => tile.core.column === 2 && tile.core.row === 2)!
        expect(interior.crop).toEqual({x: 10, y: 10, width: 480, height: 270})
        expect(interior.expanded).toEqual({x: 950, y: 530, width: 500, height: 290})
        expect(interior.encodedWidth % 2).toBe(0)
        expect(interior.encodedHeight % 2).toBe(0)
    })

    it('clips halo at global borders without moving the core', () => {
        const plan = planVideoTiles({...BASE, preferredCoreWidth: 480, preferredCoreHeight: 270})
        const first = plan.tiles[0]
        expect(first.expanded).toEqual({x: 0, y: 0, width: 490, height: 280})
        expect(first.crop).toEqual({x: 0, y: 0, width: 480, height: 270})
    })

    it('respects both texture and GPU-memory limits', () => {
        const plan = planVideoTiles(BASE)
        for (const tile of plan.tiles) {
            expect(tile.workingTextureSide).toBeLessThanOrEqual(BASE.maxTextureDimension2D)
            expect(tile.workingTextureSide ** 2 * BASE.bytesPerWorkingTexel)
                .toBeLessThanOrEqual(BASE.gpuBudgetBytes)
        }
        expect(plan.estimatedPeakWorkingBytes).toBeLessThanOrEqual(BASE.gpuBudgetBytes)
    })

    it('spends available surface budget on a global-centred temporal envelope', () => {
        const plan = planVideoTiles({
            fullFrame: {width: 1000, height: 600},
            supersample: 1,
            halo: {filter: 2, render: 2, codec: 0},
            maxTextureDimension2D: 600,
            gpuBudgetBytes: 600 ** 2 * 4,
            bytesPerWorkingTexel: 4,
            preferredCoreWidth: 300,
            preferredCoreHeight: 300,
            temporalMagnificationTarget: 1.2,
        })
        expect(plan.temporalMagnificationTarget).toBeCloseTo(1.2, 10)
        expect(plan.tiles.every(tile => tile.temporalMagnificationThreshold === plan.temporalMagnificationTarget))
            .toBe(true)
        const right = plan.tiles.find(tile => tile.core.x > plan.fullFrame.width / 2)!
        expect(right.expanded.x).toBeLessThan(right.core.x - plan.halo.total)
    })

    it('refuses when even one haloed supersampled pixel cannot fit', () => {
        expect(() => planVideoTiles({
            ...BASE,
            maxTextureDimension2D: 32,
            gpuBudgetBytes: 32 ** 2 * BASE.bytesPerWorkingTexel,
        })).toThrow(/No tiled export surface fits/)
    })
})

describe('allocateAggregateBitrate', () => {
    const tile = (index: number, width: number, height: number): ExpandedTile => ({
        index,
        core: {index, column: index, row: 0, x: 0, y: 0, width, height},
        expanded: {x: 0, y: 0, width, height},
        crop: {x: 0, y: 0, width, height},
        encodedWidth: width,
        encodedHeight: height,
        workingTextureSide: Math.ceil(Math.hypot(width, height)),
        temporalMagnificationThreshold: 1,
    })

    it('preserves the aggregate exactly after integer rounding', () => {
        const aggregate = 400_000_003
        const shares = allocateAggregateBitrate(aggregate, [
            tile(0, 100, 100), tile(1, 50, 100), tile(2, 25, 100),
        ])
        expect(shares.reduce((sum, share) => sum + share, 0)).toBe(aggregate)
        expect(shares[0]).toBeGreaterThan(shares[1])
        expect(shares[1]).toBeGreaterThan(shares[2])
    })

    it('uses tile index as a deterministic largest-remainder tie-breaker', () => {
        expect(allocateAggregateBitrate(10, [tile(5, 1, 1), tile(2, 1, 1), tile(9, 1, 1)]))
            .toEqual([3, 4, 3])
    })
})

describe('temporalExpandedRectFor', () => {
    it('contains the core footprint at both ends of a zoom cycle', () => {
        const full = {width: 1000, height: 600}
        const core = {index: 0, column: 0, row: 0, x: 700, y: 250, width: 100, height: 100}
        const expanded = temporalExpandedRectFor(core, full, 10, 1.2)
        expect(expanded).toEqual({x: 656, y: 230, width: 214, height: 140})

        for (const factor of [1 / 1.2, 1, 1.2]) {
            for (const x of [core.x, core.x + core.width]) {
                const sourceX = full.width / 2 + (x - full.width / 2) * factor
                expect(sourceX).toBeGreaterThanOrEqual(expanded.x + 10)
                expect(sourceX).toBeLessThanOrEqual(expanded.x + expanded.width - 10)
            }
        }
    })
})

describe('estimateIntermediateSize', () => {
    it('estimates exactly 3 GB of media for one minute at 400 Mbit/s', () => {
        const estimate = estimateIntermediateSize(400_000_000, 60)
        expect(estimate.mediaBytes).toBe(3_000_000_000)
        expect(estimate.containerMarginBytes).toBe(30_000_000)
        expect(estimate.totalBytes).toBe(3_030_000_000)
    })
})

describe('planVideoComposition', () => {
    it('bounds frame blocks by memory and aligns keyframes to the block', () => {
        const plan = planVideoComposition({
            fullFrame: {width: 3840, height: 2160},
            totalFrames: 1800,
            memoryBudgetBytes: 256 * 1024 ** 2,
            decoderPoolSize: 4,
        })
        expect(plan.bytesPerFrame).toBe(3840 * 2160 * 4)
        expect(plan.framesPerBlock).toBe(8)
        expect(plan.keyframeIntervalFrames).toBe(8)
        expect(plan.decoderPoolSize).toBe(4)
    })

    it('refuses a budget that cannot hold one final frame', () => {
        expect(() => planVideoComposition({
            fullFrame: {width: 3840, height: 2160},
            totalFrames: 30,
            memoryBudgetBytes: 1024,
        })).toThrow(/cannot hold one/)
    })
})

describe('projectTileView', () => {
    function rotate(x: number, y: number, angle: number) {
        return {
            x: Math.cos(angle) * x - Math.sin(angle) * y,
            y: Math.sin(angle) * x + Math.cos(angle) * y,
        }
    }

    it.each([0, Math.PI / 7, -Math.PI / 3])(
        'matches the monolithic projection at angle %s',
        (angle) => {
            const full = {width: 1000, height: 563}
            const expanded = {x: 317, y: 91, width: 241, height: 173}
            const projection = projectTileView(full, expanded, angle)
            const fullAspect = full.width / full.height

            for (const localUv of [{x: 0, y: 0}, {x: 0.5, y: 0.5}, {x: 1, y: 1}, {x: 0.17, y: 0.81}]) {
                const globalUv = {
                    x: projection.uvOriginX + localUv.x * projection.uvScaleX,
                    y: projection.uvOriginY + localUv.y * projection.uvScaleY,
                }
                const monolithic = rotate(
                    (2 * globalUv.x - 1) * fullAspect,
                    2 * globalUv.y - 1,
                    angle,
                )
                const local = rotate(
                    (2 * localUv.x - 1) * projection.localAspect * projection.scaleFactor,
                    (2 * localUv.y - 1) * projection.scaleFactor,
                    angle,
                )
                expect(projection.centerOffsetX + local.x).toBeCloseTo(monolithic.x, 12)
                expect(projection.centerOffsetY + local.y).toBeCloseTo(monolithic.y, 12)
            }
        },
    )

    it.each([0, Math.PI / 7, -Math.PI / 3])(
        'places the global zoom centre at the tile neutral pivot for angle %s',
        (angle) => {
            const projection = projectTileView(
                {width: 1000, height: 563},
                {x: 611, y: 302, width: 241, height: 173},
                angle,
            )
            const pivot = tileZoomPivot(projection)
            const neutralExtent = Math.hypot(projection.localAspect, 1)
            const localRot = {
                x: (pivot.u - 0.5) * 2 * neutralExtent,
                y: (pivot.v - 0.5) * 2 * neutralExtent,
            }
            expect(projection.centerOffsetX + projection.scaleFactor * localRot.x).toBeCloseTo(0, 12)
            expect(projection.centerOffsetY + projection.scaleFactor * localRot.y).toBeCloseTo(0, 12)
        },
    )
})

describe('scaleFloatExp', () => {
    it('renormalizes a tile scale while preserving an exponent below f64 range', () => {
        const scaled = scaleFloatExp(0.75, -1400, 0.125)
        expect(scaled).toEqual({mantissa: 0.75, exponent: -1403})
        expect(Math.abs(scaled.mantissa)).toBeGreaterThanOrEqual(0.5)
        expect(Math.abs(scaled.mantissa)).toBeLessThan(1)
    })
})
