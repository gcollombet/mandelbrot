import {BlobSource, Input, MP4, VideoSampleSink, type VideoSample} from 'mediabunny'
import type {CompositionPlan, ExpandedTile, TilePlan} from './tiledVideoExport'
import {createVideoSink, type Mp4Codec, type VideoEncoderSink} from './videoEncoderSink'

export interface ComposableTileFrame {
    draw(
        context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number,
    ): void
    close(): void
}

export type DecodedTileBlock = {
    frames: ComposableTileFrame[]
    close(): void
}

export interface TileFrameSource {
    decodeBlock(settings: {
        tile: ExpandedTile
        startFrame: number
        frameCount: number
        fps: number
    }): Promise<DecodedTileBlock>
}

export interface CompositionSurface {
    clear(): void
    copyCore(frame: ComposableTileFrame, tile: ExpandedTile): void
    makeVideoFrame(timestampMicros: number, durationMicros: number): VideoFrame
}

export type TiledCompositionProgress = {
    framesEncoded: number
    totalFrames: number
    blockIndex: number
    totalBlocks: number
}

export function encodedTimestampSeconds(frameIndex: number, fps: number): number {
    return Math.round(frameIndex * 1e6 / fps) / 1e6
}

export async function composeTiledVideo(settings: {
    tilePlan: TilePlan
    compositionPlan: CompositionPlan
    fps: number
    source: TileFrameSource
    createSurface(width: number, height: number): CompositionSurface
    sink: Pick<VideoEncoderSink, 'addFrame'>
    onProgress?: (progress: TiledCompositionProgress) => void
    signal?: {aborted: boolean}
}): Promise<{cancelled: boolean; framesEncoded: number}> {
    const {tilePlan, compositionPlan} = settings
    if (compositionPlan.fullFrame.width !== tilePlan.fullFrame.width
        || compositionPlan.fullFrame.height !== tilePlan.fullFrame.height) {
        throw new Error('Composition and tile plans describe different full-frame geometries.')
    }
    const surfaces = Array.from(
        {length: compositionPlan.framesPerBlock},
        () => settings.createSurface(tilePlan.fullFrame.width, tilePlan.fullFrame.height),
    )
    const frameDurationMicros = Math.round(1e6 / settings.fps)
    const totalBlocks = Math.ceil(compositionPlan.totalFrames / compositionPlan.framesPerBlock)
    let framesEncoded = 0

    for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
        if (settings.signal?.aborted) return {cancelled: true, framesEncoded}
        const startFrame = blockIndex * compositionPlan.framesPerBlock
        const frameCount = Math.min(
            compositionPlan.framesPerBlock,
            compositionPlan.totalFrames - startFrame,
        )
        for (let local = 0; local < frameCount; local++) surfaces[local].clear()

        // Decode only a bounded group at once. Each block is copied and closed
        // before opening the next group, so decoder count never follows tiles.
        for (let offset = 0; offset < tilePlan.tiles.length; offset += compositionPlan.decoderPoolSize) {
            if (settings.signal?.aborted) return {cancelled: true, framesEncoded}
            const group = tilePlan.tiles.slice(offset, offset + compositionPlan.decoderPoolSize)
            const decoded = await Promise.all(group.map(tile => settings.source.decodeBlock({
                tile,
                startFrame,
                frameCount,
                fps: settings.fps,
            })))
            try {
                for (let tileOffset = 0; tileOffset < group.length; tileOffset++) {
                    const block = decoded[tileOffset]
                    if (block.frames.length !== frameCount) {
                        throw new Error(
                            `Tile ${group[tileOffset].index} decoded ${block.frames.length}/${frameCount} frames.`,
                        )
                    }
                    for (let local = 0; local < frameCount; local++) {
                        surfaces[local].copyCore(block.frames[local], group[tileOffset])
                    }
                }
            } finally {
                for (const block of decoded) block.close()
            }
        }

        for (let local = 0; local < frameCount; local++) {
            if (settings.signal?.aborted) return {cancelled: true, framesEncoded}
            const frameIndex = startFrame + local
            await settings.sink.addFrame(surfaces[local].makeVideoFrame(
                Math.round((frameIndex * 1e6) / settings.fps),
                frameDurationMicros,
            ))
            framesEncoded++
            settings.onProgress?.({framesEncoded, totalFrames: compositionPlan.totalFrames, blockIndex, totalBlocks})
        }
    }

    return {cancelled: false, framesEncoded}
}

type Canvas2d = HTMLCanvasElement | OffscreenCanvas

export class CanvasCompositionSurface implements CompositionSurface {
    private readonly canvas: Canvas2d
    private readonly context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

    constructor(width: number, height: number) {
        this.canvas = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(width, height)
            : Object.assign(document.createElement('canvas'), {width, height})
        const context = this.canvas.getContext('2d', {alpha: false})
        if (!context) throw new Error('Unable to create a 2D video-composition surface.')
        this.context = context as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    }

    clear(): void {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    copyCore(frame: ComposableTileFrame, tile: ExpandedTile): void {
        frame.draw(
            this.context,
            tile.crop.x,
            tile.crop.y,
            tile.crop.width,
            tile.crop.height,
            tile.core.x,
            tile.core.y,
            tile.core.width,
            tile.core.height,
        )
    }

    makeVideoFrame(timestampMicros: number, durationMicros: number): VideoFrame {
        return new VideoFrame(this.canvas, {timestamp: timestampMicros, duration: durationMicros})
    }
}

class MediabunnyDecodedBlock implements DecodedTileBlock {
    readonly frames: VideoSample[]
    private readonly input: Input

    constructor(input: Input, frames: VideoSample[]) {
        this.input = input
        this.frames = frames
    }

    close(): void {
        for (const frame of this.frames) frame.close()
        this.input.dispose()
    }
}

/** Opens one MP4 for one keyframe-aligned block, then releases its decoder. */
export class MediabunnyTileFrameSource implements TileFrameSource {
    private readonly getBlob: (tile: ExpandedTile) => Promise<Blob>

    constructor(getBlob: (tile: ExpandedTile) => Promise<Blob>) {
        this.getBlob = getBlob
    }

    async decodeBlock(settings: {
        tile: ExpandedTile
        startFrame: number
        frameCount: number
        fps: number
    }): Promise<DecodedTileBlock> {
        const input = new Input({formats: [MP4], source: new BlobSource(await this.getBlob(settings.tile))})
        try {
            const track = await input.getPrimaryVideoTrack()
            if (!track) throw new Error(`Tile ${settings.tile.index} has no video track.`)
            const sink = new VideoSampleSink(track, {optimizeForLatency: false})
            const timestamps = Array.from(
                {length: settings.frameCount},
                (_, local) => encodedTimestampSeconds(settings.startFrame + local, settings.fps),
            )
            const frames: VideoSample[] = []
            for await (const sample of sink.samplesAtTimestamps(timestamps)) {
                if (!sample) throw new Error(`Tile ${settings.tile.index} has a missing decoded frame.`)
                frames.push(sample)
            }
            return new MediabunnyDecodedBlock(input, frames)
        } catch (error) {
            input.dispose()
            throw error
        }
    }
}

/** Pads odd codec dimensions without rescaling the rendered expanded region. */
export function padVideoFrame(
    frame: VideoFrame,
    width: number,
    height: number,
): VideoFrame {
    if (frame.displayWidth === width && frame.displayHeight === height) return frame
    if (width < frame.displayWidth || height < frame.displayHeight) {
        frame.close()
        throw new RangeError('Codec padding cannot crop an export frame.')
    }
    const canvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), {width, height})
    const context = canvas.getContext('2d', {alpha: false})
    if (!context) {
        frame.close()
        throw new Error('Unable to create a codec-padding surface.')
    }
    context.drawImage(frame, 0, 0)
    const padded = new VideoFrame(canvas, {
        timestamp: frame.timestamp,
        duration: frame.duration ?? undefined,
    })
    frame.close()
    return padded
}

/** Encode and decode a tiny file before committing hours to tile rendering. */
export async function probeMezzanineRoundTrip(settings: {
    codec: Mp4Codec
    width: number
    height: number
    fps: number
    bitrate: number
    keyFrameIntervalFrames: number
}): Promise<void> {
    const width = settings.width
    const height = settings.height
    const canvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), {width, height})
    const context = canvas.getContext('2d', {alpha: false})
    if (!context) throw new Error('Unable to create the mezzanine codec probe surface.')
    const sink = await createVideoSink({
        width,
        height,
        fps: settings.fps,
        codec: settings.codec,
        destination: {kind: 'buffer'},
        bitrate: settings.bitrate,
        profile: 'mezzanine',
        keyFrameIntervalFrames: settings.keyFrameIntervalFrames,
    })
    try {
        for (let index = 0; index < 2; index++) {
            context.fillStyle = index === 0 ? '#1428ff' : '#ff7a14'
            context.fillRect(0, 0, width, height)
            await sink.addFrame(new VideoFrame(canvas, {
                timestamp: Math.round(index * 1e6 / settings.fps),
                duration: Math.round(1e6 / settings.fps),
            }))
        }
        const blob = await sink.finalize()
        if (!blob) throw new Error('The mezzanine codec probe produced no buffered file.')
        const input = new Input({formats: [MP4], source: new BlobSource(blob)})
        try {
            const track = await input.getPrimaryVideoTrack()
            if (!track) throw new Error('The mezzanine codec probe produced no decodable video track.')
            const decoder = new VideoSampleSink(track)
            const sample = await decoder.getSample(0)
            if (!sample) throw new Error('The mezzanine codec probe could not decode its first frame.')
            sample.close()
        } finally {
            input.dispose()
        }
    } catch (error) {
        await sink.cancel().catch(() => undefined)
        throw error
    }
}
