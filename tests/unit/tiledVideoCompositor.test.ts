import {describe, expect, it, vi} from 'vitest'
import {CanvasCompositionSurface, composeTiledVideo, encodedTimestampSeconds, type ComposableTileFrame, type CompositionSurface, type TileFrameSource} from '../../src/tiledVideoCompositor'
import {planVideoComposition, planVideoTiles} from '../../src/tiledVideoExport'

const tilePlan = planVideoTiles({
    fullFrame: {width: 7, height: 5}, supersample: 1,
    halo: {filter: 1, render: 0, codec: 1},
    maxTextureDimension2D: 128, gpuBudgetBytes: 128 ** 2 * 4,
    bytesPerWorkingTexel: 4, preferredCoreWidth: 3, preferredCoreHeight: 2,
})
const compositionPlan = planVideoComposition({
    fullFrame: tilePlan.fullFrame, totalFrames: 5,
    memoryBudgetBytes: 7 * 5 * 4 * 2, decoderPoolSize: 2,
})

class FakeFrame implements ComposableTileFrame {
    readonly tileIndex: number
    readonly frameIndex: number
    closed = false
    constructor(tileIndex: number, frameIndex: number) {
        this.tileIndex = tileIndex
        this.frameIndex = frameIndex
    }
    draw(): void {}
    close(): void { this.closed = true }
}

class FakeSurface implements CompositionSurface {
    copies: Array<{tile: number; frame: number}> = []
    readonly emitted: Array<Array<{tile: number; frame: number}>>
    constructor(emitted: Array<Array<{tile: number; frame: number}>>) { this.emitted = emitted }
    clear(): void { this.copies = [] }
    copyCore(frame: FakeFrame, tile: {index: number}): void {
        expect(frame.closed).toBe(false)
        this.copies.push({tile: tile.index, frame: frame.frameIndex})
    }
    makeVideoFrame(): VideoFrame {
        this.emitted.push([...this.copies])
        return {close() {}} as VideoFrame
    }
}

describe('composeTiledVideo', () => {
    it('seeks at the exact rounded timestamp written into each VideoFrame', () => {
        expect(encodedTimestampSeconds(1, 30)).toBe(0.033333)
        expect(encodedTimestampSeconds(2, 30)).toBe(0.066667)
    })

    it('copies only the decoded core, excluding the distinctive halo', () => {
        const tile = tilePlan.tiles.find(value => value.crop.x > 0 && value.crop.y > 0)!
        const draw = vi.fn()
        const context = {} as OffscreenCanvasRenderingContext2D
        const surface = Object.create(CanvasCompositionSurface.prototype) as CanvasCompositionSurface
        Object.assign(surface as unknown as Record<string, unknown>, {context, canvas: {width: 7, height: 5}})
        surface.copyCore({draw, close() {}} as ComposableTileFrame, tile)
        expect(draw).toHaveBeenCalledWith(
            context,
            tile.crop.x, tile.crop.y, tile.crop.width, tile.crop.height,
            tile.core.x, tile.core.y, tile.core.width, tile.core.height,
        )
        expect(tile.expanded.width).toBeGreaterThan(tile.crop.width)
        expect(tile.expanded.height).toBeGreaterThan(tile.crop.height)
    })

    it('bounds decoder concurrency, crops every tile and handles an incomplete last block', async () => {
        let active = 0
        let peak = 0
        const decodedFrames: FakeFrame[] = []
        const source: TileFrameSource = {
            async decodeBlock({tile, startFrame, frameCount}) {
                active++
                peak = Math.max(peak, active)
                await Promise.resolve()
                active--
                const frames = Array.from({length: frameCount}, (_, local) => {
                    const frame = new FakeFrame(tile.index, startFrame + local)
                    decodedFrames.push(frame)
                    return frame
                })
                return {frames, close: () => frames.forEach(frame => frame.close())}
            },
        }
        const emitted: Array<Array<{tile: number; frame: number}>> = []
        const encoded: VideoFrame[] = []
        const result = await composeTiledVideo({
            tilePlan, compositionPlan, fps: 30, source,
            createSurface: () => new FakeSurface(emitted),
            sink: {async addFrame(frame) { encoded.push(frame); frame.close() }},
        })
        expect(result).toEqual({cancelled: false, framesEncoded: 5})
        expect(peak).toBeLessThanOrEqual(2)
        expect(encoded).toHaveLength(5)
        expect(emitted).toHaveLength(5)
        for (let frameIndex = 0; frameIndex < 5; frameIndex++) {
            expect(emitted[frameIndex]).toHaveLength(tilePlan.tiles.length)
            expect(new Set(emitted[frameIndex].map(copy => copy.tile)).size).toBe(tilePlan.tiles.length)
            expect(emitted[frameIndex].every(copy => copy.frame === frameIndex)).toBe(true)
        }
        expect(decodedFrames.every(frame => frame.closed)).toBe(true)
    })

    it('stops between blocks on cancellation', async () => {
        const signal = {aborted: false}
        let frames = 0
        const result = await composeTiledVideo({
            tilePlan, compositionPlan, fps: 30,
            source: {async decodeBlock({tile, startFrame, frameCount}) {
                const decoded = Array.from({length: frameCount}, (_, i) => new FakeFrame(tile.index, startFrame + i))
                return {frames: decoded, close: () => decoded.forEach(frame => frame.close())}
            }},
            createSurface: () => new FakeSurface([]),
            sink: {async addFrame(frame) { frame.close(); frames++; if (frames === 2) signal.aborted = true }},
            signal,
        })
        expect(result).toEqual({cancelled: true, framesEncoded: 2})
    })
})
