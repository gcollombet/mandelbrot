import {createVideoSink, type Mp4Codec, type VideoDestination} from './videoEncoderSink'
import {
    CanvasCompositionSurface,
    MediabunnyTileFrameSource,
    composeTiledVideo,
    padVideoFrame,
    probeMezzanineRoundTrip,
} from './tiledVideoCompositor'
import {
    allocateAggregateBitrate,
    estimateIntermediateSize,
    planVideoComposition,
    planVideoTiles,
    type TileHalo,
    type TilePlan,
} from './tiledVideoExport'
import {
    OpfsTemporaryVideoStore,
    assertTemporaryCapacity,
    computeTiledVideoFingerprint,
    createTiledVideoManifest,
    markTileCompleted,
    parseTiledVideoManifest,
    persistTiledVideoManifest,
    resumeCompatibility,
    type TemporaryVideoStore,
    type TiledVideoManifest,
} from './tiledVideoStore'
import {totalFramesFor} from './videoExportSession'
import {formatVideoPathProblems, validateVideoOutput, validateVideoPath, type VideoOutputSpec, type VideoPathLocation} from './videoPath'
import {renderVideoPathToSink, type VideoExportRunnerDeps} from './videoExportRunner'
import {runTileMajorCoordinator} from './tileMajorCoordinator'

const DEFAULT_AGGREGATE_BITRATE = 400_000_000
const DEFAULT_FINAL_BITRATE = 80_000_000
const DEFAULT_GPU_BUDGET_BYTES = 1024 ** 3
const DEFAULT_COMPOSITION_BUDGET_BYTES = 256 * 1024 ** 2
const DEFAULT_BYTES_PER_WORKING_TEXEL = 324
const DEFAULT_HALO: TileHalo = {filter: 2, render: 2, codec: 12}

export type TiledVideoProgress =
    | {
        phase: 'rendering-tiles'
        tileIndex: number
        tileNumber: number
        tileCount: number
        framesEmittedForTile: number
        framesPerTile: number
        completedTiles: number
        equivalentFramesCompleted: number
        equivalentFramesTotal: number
        referenceStats: {
            tileSwitches: number
            warmReuses: number
            orbitExtensions: number
            reconstructions: number
        }
    }
    | {
        phase: 'composing'
        framesEncoded: number
        totalFrames: number
        blockIndex: number
        totalBlocks: number
    }

export type TiledVideoExportRequest = {
    from: VideoPathLocation
    to: VideoPathLocation
    durationSeconds: number
    output: VideoOutputSpec
    codec: Mp4Codec
    aaSamplesPerFrame?: number
    destination: VideoDestination
    maxTextureDimension: number
    renderFingerprint: unknown
    animationFingerprint: unknown
    store?: TemporaryVideoStore
    resumeSessionId?: string
    aggregateBitrate?: number
    finalBitrate?: number
    gpuBudgetBytes?: number
    compositionBudgetBytes?: number
    bytesPerWorkingTexel?: number
    decoderPoolSize?: number
    halo?: TileHalo
    preferredCoreWidth?: number
    preferredCoreHeight?: number
    keepTemporariesOnSuccess?: boolean
    onProgress?: (progress: TiledVideoProgress) => void
    signal?: {aborted: boolean}
    maxPumpsPerFrame?: number
}

export type TiledVideoExportOutcome = {
    blob: Blob | null
    streamed: boolean
    cancelled: boolean
    phase: 'rendering-tiles' | 'composing' | 'complete'
    sessionId: string
    tilePlan: TilePlan
    manifest: TiledVideoManifest
    framesEncoded: number
    fileExtension: string
}

export type TiledVideoExportRunnerDeps = {
    engine: VideoExportRunnerDeps['engine'] & {
        beginVideoExportTile(projection: {
            fullWidth: number
            fullHeight: number
            x: number
            y: number
            width: number
            height: number
            reuseMagnificationThreshold: number
        }): Promise<void>
        getVideoExportReferenceDiagnostics?(): {
            tileSwitches: number
            warmReuses: number
            orbitExtensions: number
            reconstructions: number
        }
    }
    controller: VideoExportRunnerDeps['controller']
}

function tileFileName(index: number): string {
    return `tile-${String(index).padStart(4, '0')}.mp4`
}

async function loadOrCreateManifest(settings: {
    store: TemporaryVideoStore
    sessionId: string
    fingerprint: string
    tilePlan: TilePlan
    codec: string
    aggregateBitrate: number
    fps: number
    totalFrames: number
    explicitResume: boolean
}): Promise<TiledVideoManifest> {
    const text = await settings.store.readText(settings.sessionId, 'manifest.json')
    if (text) {
        const existing = parseTiledVideoManifest(text)
        const compatibility = resumeCompatibility(existing, settings.fingerprint)
        if (!compatibility.compatible) {
            throw new Error(
                settings.explicitResume
                    ? 'La session temporaire choisie ne correspond pas exactement à cet export.'
                    : 'Une session temporaire incompatible porte le même identifiant.',
            )
        }
        return existing
    }
    const manifest = createTiledVideoManifest(settings)
    await persistTiledVideoManifest(settings.store, manifest)
    return manifest
}

export async function runTiledVideoExport(
    deps: TiledVideoExportRunnerDeps,
    request: TiledVideoExportRequest,
): Promise<TiledVideoExportOutcome> {
    const problems = [
        // Preserve every ordinary validation except the monolithic texture cap.
        ...validateVideoOutput(request.output, Number.MAX_SAFE_INTEGER),
        ...validateVideoPath({from: request.from, to: request.to, durationSeconds: request.durationSeconds}),
    ]
    if (problems.length) {
        throw new Error(`Cannot export this tiled parcours:\n${formatVideoPathProblems(problems)}`)
    }

    const aggregateBitrate = request.aggregateBitrate ?? DEFAULT_AGGREGATE_BITRATE
    const totalFrames = totalFramesFor({fps: request.output.fps, durationSeconds: request.durationSeconds})
    const fixedCentreZoom = request.from.cx === request.to.cx
        && request.from.cy === request.to.cy
        && request.from.angle === request.to.angle
        && request.from.scale !== request.to.scale
    const tilePlan = planVideoTiles({
        fullFrame: {width: request.output.width, height: request.output.height},
        supersample: request.output.supersample,
        halo: request.halo ?? DEFAULT_HALO,
        maxTextureDimension2D: request.maxTextureDimension,
        gpuBudgetBytes: request.gpuBudgetBytes ?? DEFAULT_GPU_BUDGET_BYTES,
        bytesPerWorkingTexel: request.bytesPerWorkingTexel ?? DEFAULT_BYTES_PER_WORKING_TEXEL,
        preferredCoreWidth: request.preferredCoreWidth,
        preferredCoreHeight: request.preferredCoreHeight,
        codecAlignment: 2,
        temporalMagnificationTarget: fixedCentreZoom
            ? request.output.magnificationThreshold
            : 1,
    })
    const compositionPlan = planVideoComposition({
        fullFrame: tilePlan.fullFrame,
        totalFrames,
        memoryBudgetBytes: request.compositionBudgetBytes ?? DEFAULT_COMPOSITION_BUDGET_BYTES,
        decoderPoolSize: request.decoderPoolSize ?? 3,
    })
    const frameTimestampsMicros = Array.from(
        {length: totalFrames},
        (_, index) => Math.round(index * 1e6 / request.output.fps),
    )
    const fingerprint = await computeTiledVideoFingerprint({
        path: {from: request.from, to: request.to, durationSeconds: request.durationSeconds},
        render: request.renderFingerprint,
        animation: request.animationFingerprint,
        tilePlan,
        aaSamplesPerFrame: request.aaSamplesPerFrame ?? 1,
        codec: request.codec,
        aggregateBitrate,
        fps: request.output.fps,
        totalFrames,
        frameTimestampsMicros,
    })
    const sessionId = request.resumeSessionId ?? `tiled-${fingerprint.slice(0, 32)}`
    const store = request.store ?? new OpfsTemporaryVideoStore()
    let manifest = await loadOrCreateManifest({
        store,
        sessionId,
        fingerprint,
        tilePlan,
        codec: request.codec,
        aggregateBitrate,
        fps: request.output.fps,
        totalFrames,
        explicitResume: request.resumeSessionId !== undefined,
    })
    const compatibility = resumeCompatibility(manifest, fingerprint)
    const missing = new Set(compatibility.missingTileIndices)
    const intermediateEstimate = estimateIntermediateSize(aggregateBitrate, request.durationSeconds)
    assertTemporaryCapacity(intermediateEstimate.totalBytes, await store.estimate())

    const bitrates = allocateAggregateBitrate(aggregateBitrate, tilePlan.tiles)
    // Probe both directions before starting the first missing long traversal.
    if (missing.size > 0) {
        const probeTile = tilePlan.tiles.reduce((largest, tile) =>
            tile.encodedWidth * tile.encodedHeight > largest.encodedWidth * largest.encodedHeight
                ? tile
                : largest)
        await probeMezzanineRoundTrip({
            codec: request.codec,
            width: probeTile.encodedWidth,
            height: probeTile.encodedHeight,
            fps: request.output.fps,
            bitrate: Math.max(100_000, Math.min(...bitrates)),
            keyFrameIntervalFrames: compositionPlan.keyframeIntervalFrames,
        })
    }

    const firstTile = tilePlan.tiles[0]
    let engineSessionOpen = false
    let completedTiles = manifest.completedTiles.length
    try {
        if (missing.size > 0) {
            await deps.engine.beginVideoExportSession({
                magnificationThreshold: request.output.magnificationThreshold,
                outputWidth: firstTile.expanded.width,
                outputHeight: firstTile.expanded.height,
                supersample: request.output.supersample,
                batchTargetFps: 1,
                aaSamplesPerFrame: request.aaSamplesPerFrame,
                tileProjection: {
                    fullWidth: tilePlan.fullFrame.width,
                    fullHeight: tilePlan.fullFrame.height,
                    ...firstTile.expanded,
                },
            })
            engineSessionOpen = true
        }

        const tileRun = await runTileMajorCoordinator({
            tiles: tilePlan.tiles,
            isCompleted: tile => !missing.has(tile.index),
            signal: request.signal,
            renderTile: async tile => {
                await deps.engine.beginVideoExportTile({
                    fullWidth: tilePlan.fullFrame.width,
                    fullHeight: tilePlan.fullFrame.height,
                    ...tile.expanded,
                    reuseMagnificationThreshold: tile.temporalMagnificationThreshold,
                })
                const fileName = tileFileName(tile.index)
                const writable = await store.createWritable(sessionId, fileName)
                const sink = await createVideoSink({
                    width: tile.encodedWidth,
                    height: tile.encodedHeight,
                    fps: request.output.fps,
                    codec: request.codec,
                    destination: {kind: 'stream', writable},
                    bitrate: bitrates[tile.index],
                    profile: 'mezzanine',
                    keyFrameIntervalFrames: compositionPlan.keyframeIntervalFrames,
                    minimumFragmentSeconds: compositionPlan.keyframeIntervalFrames / request.output.fps,
                })
                try {
                    const result = await renderVideoPathToSink(deps, {
                        from: request.from,
                        to: request.to,
                        durationSeconds: request.durationSeconds,
                        outputWidth: tile.expanded.width,
                        outputHeight: tile.expanded.height,
                        supersample: request.output.supersample,
                        fps: request.output.fps,
                        sink,
                        signal: request.signal,
                        maxPumpsPerFrame: request.maxPumpsPerFrame,
                        transformFrame: frame => padVideoFrame(frame, tile.encodedWidth, tile.encodedHeight),
                        onProgress: progress => request.onProgress?.({
                            phase: 'rendering-tiles',
                            tileIndex: tile.index,
                            tileNumber: tile.index + 1,
                            tileCount: tilePlan.tiles.length,
                            framesEmittedForTile: progress.framesEmitted,
                            framesPerTile: progress.totalFrames,
                            completedTiles,
                            equivalentFramesCompleted: completedTiles * totalFrames + progress.framesEmitted,
                            equivalentFramesTotal: tilePlan.tiles.length * totalFrames,
                            referenceStats: deps.engine.getVideoExportReferenceDiagnostics?.() ?? {
                                tileSwitches: 0,
                                warmReuses: 0,
                                orbitExtensions: 0,
                                reconstructions: 0,
                            },
                        }),
                    })
                    await sink.finalize()
                    if (result.cancelled || result.framesEmitted !== totalFrames) {
                        return {cancelled: true}
                    }
                    const bytes = (await store.readBlob(sessionId, fileName)).size
                    manifest = markTileCompleted(manifest, {
                        tileIndex: tile.index,
                        fileName,
                        bytes,
                        completedAt: new Date().toISOString(),
                    })
                    await persistTiledVideoManifest(store, manifest)
                    completedTiles++
                    return {cancelled: false}
                } catch (error) {
                    await sink.cancel().catch(() => undefined)
                    throw error
                }
            },
        })
        if (tileRun.cancelled) {
            return {
                blob: null, streamed: request.destination.kind === 'stream', cancelled: true,
                phase: 'rendering-tiles', sessionId, tilePlan, manifest,
                framesEncoded: 0, fileExtension: 'mp4',
            }
        }
    } finally {
        if (engineSessionOpen) deps.engine.endVideoExportSession()
        deps.controller.setExportTime(null)
    }

    if (request.signal?.aborted) {
        return {
            blob: null, streamed: request.destination.kind === 'stream', cancelled: true,
            phase: 'rendering-tiles', sessionId, tilePlan, manifest,
            framesEncoded: 0, fileExtension: 'mp4',
        }
    }

    const finalSink = await createVideoSink({
        width: request.output.width,
        height: request.output.height,
        fps: request.output.fps,
        codec: request.codec,
        destination: request.destination,
        profile: 'delivery',
        bitrate: request.finalBitrate ?? DEFAULT_FINAL_BITRATE,
    })
    try {
        const files = new Map(manifest.completedTiles.map(tile => [tile.tileIndex, tile.fileName]))
        const source = new MediabunnyTileFrameSource(async tile => {
            const fileName = files.get(tile.index)
            if (!fileName) throw new Error(`Missing completed intermediate for tile ${tile.index}.`)
            return store.readBlob(sessionId, fileName)
        })
        const composition = await composeTiledVideo({
            tilePlan,
            compositionPlan,
            fps: request.output.fps,
            source,
            createSurface: (width, height) => new CanvasCompositionSurface(width, height),
            sink: finalSink,
            signal: request.signal,
            onProgress: progress => request.onProgress?.({phase: 'composing', ...progress}),
        })
        const blob = await finalSink.finalize()
        if (!composition.cancelled && !request.keepTemporariesOnSuccess) {
            await store.removeSession(sessionId)
        }
        return {
            blob,
            streamed: finalSink.streaming,
            cancelled: composition.cancelled,
            phase: composition.cancelled ? 'composing' : 'complete',
            sessionId,
            tilePlan,
            manifest,
            framesEncoded: composition.framesEncoded,
            fileExtension: finalSink.fileExtension,
        }
    } catch (error) {
        await finalSink.cancel().catch(() => undefined)
        throw error
    }
}
