// ── Wiring: parcours + engine + capture + encoder → an encoded blob ──
// The loop itself lives in videoExportSession.ts and knows nothing about GPUs
// or codecs; this module supplies its driver.

import { createVideoSink, type Mp4Codec, type VideoDestination } from './videoEncoderSink'
import { runVideoExport, elapsedForFrame, totalFramesFor } from './videoExportSession'
import {
  formatVideoPathProblems,
  validateVideoOutput,
  validateVideoPath,
  type VideoOutputSpec,
  type VideoPathLocation,
} from './videoPath'

/** Batch controller target during export: a floor, so batches grow as large as
 *  the GPU allows. An export has no latency budget to protect. */
const EXPORT_BATCH_TARGET_FPS = 1

/** Render pumps a single frame may spend before the export fails. */
const DEFAULT_MAX_PUMPS_PER_FRAME = 4000

/** Renders driven to fulfil one pending capture. One is normally enough — the
 *  request arms `needRender`, so the very next render() reaches the capture
 *  block. The bound only guards against a render that early-exits. */
const CAPTURE_DRIVE_ATTEMPTS = 8

export type VideoExportRunnerDeps = {
  engine: {
    beginVideoExportSession(settings: {
      magnificationThreshold: number
      outputWidth: number
      outputHeight: number
      supersample: number
      batchTargetFps: number
    }): Promise<void>
    endVideoExportSession(): void
    videoFrameReady(): boolean
    waitForSubmittedWork(): Promise<void>
    captureExportFrame(request: {
      outputWidth: number
      outputHeight: number
      supersample: number
      timestampMicros: number
      durationMicros: number
    }): Promise<VideoFrame>
  }
  controller: {
    setExportTime(elapsedSeconds: number | null): void
    drawOnce(): Promise<void>
    getNavigator(): {
      cancel_transition(): void
      origin(cx: string, cy: string): void
      scale(value: string): void
      angle(value: number): void
      start_transition(cx: string, cy: string, scale: string, angle: number, duration: number): void
    } | null
  }
}

export type VideoExportRequest = {
  /** Where the camera starts. */
  from: VideoPathLocation
  /** Where it ends. Both are plain locations: the film keeps the appearance
   *  already on screen, so neither endpoint carries render parameters. */
  to: VideoPathLocation
  durationSeconds: number
  output: VideoOutputSpec
  codec: Mp4Codec
  /** Where the bytes go. Streaming avoids holding the whole film in memory. */
  destination: VideoDestination
  maxTextureDimension: number
  onProgress?: (progress: { framesEmitted: number; totalFrames: number }) => void
  signal?: { aborted: boolean }
  maxPumpsPerFrame?: number
}

export type VideoExportOutcome = {
  /** The film, when buffered in memory. Null when it was streamed to disk. */
  blob: Blob | null
  /** True when the bytes went straight out and no Blob was produced. */
  streamed: boolean
  cancelled: boolean
  framesEmitted: number
  totalPumps: number
  /** Frames that needed no pump: the frozen/live cycle's payoff, measured. */
  freeFrames: number
  codec: Mp4Codec
  /** Extension of the produced file, for the download name. */
  fileExtension: string
}

export async function runVideoExportToWebm(
  deps: VideoExportRunnerDeps,
  request: VideoExportRequest,
): Promise<VideoExportOutcome> {
  // Only blocking problems refuse a run. Appearance differences between the
  // endpoints are surfaced in the UI as a warning: the film keeps A's look
  // throughout, so they cannot produce an artefact.
  const problems = [
    ...validateVideoOutput(request.output, request.maxTextureDimension),
    ...validateVideoPath({ from: request.from, to: request.to, durationSeconds: request.durationSeconds }),
  ]
  if (problems.length > 0) {
    throw new Error(`Cannot export this parcours:\n${formatVideoPathProblems(problems)}`)
  }

  const navigator = deps.controller.getNavigator()
  if (!navigator) throw new Error('Navigator unavailable.')

  const { output } = request
  const frameDurationMicros = Math.round(1e6 / output.fps)

  // Open the session FIRST: it is the step that can refuse (surface too large
  // for the device, codec unavailable comes later). Creating the encoder before
  // it would leak a started muxer on that path, since the try/finally below has
  // not been entered yet.
  await deps.engine.beginVideoExportSession({
    magnificationThreshold: output.magnificationThreshold,
    outputWidth: output.width,
    outputHeight: output.height,
    supersample: output.supersample,
    batchTargetFps: EXPORT_BATCH_TARGET_FPS,
  })

  let sink: Awaited<ReturnType<typeof createVideoSink>>
  try {
    sink = await createVideoSink({
      width: output.width,
      height: output.height,
      fps: output.fps,
      codec: request.codec,
      destination: request.destination,
    })
  } catch (error) {
    deps.engine.endVideoExportSession()
    throw error
  }

  try {
    // Place the camera explicitly rather than inheriting whatever the
    // interactive session left behind: the navigator's working precision rises
    // with the depth it has visited and stays there, so a warmed navigator
    // produces different trailing digits than a cold one. Far below pixel
    // scale, but it is the difference between "the same export twice" meaning
    // something and not.
    navigator.cancel_transition()
    navigator.origin(request.from.cx, request.from.cy)
    navigator.scale(request.from.scale)
    navigator.angle(request.from.angle)
    navigator.start_transition(
      request.to.cx,
      request.to.cy,
      request.to.scale,
      request.to.angle,
      request.durationSeconds,
    )

    const result = await runVideoExport(
      {
        setExportTime: (elapsedSeconds) => deps.controller.setExportTime(elapsedSeconds),
        drawOnce: async () => {
          await deps.controller.drawOnce()
          // Do NOT remove: the counter readback that decides convergence is
          // delivered on the task queue, and a pump loop made only of
          // microtasks starves it — the readback slots fill, the counter
          // freezes, and every frame reports "did not converge".
          await deps.engine.waitForSubmittedWork()
        },
        isFrameReady: () => deps.engine.videoFrameReady(),
        emitFrame: async (frame) => {
          // captureExportFrame only REQUESTS a capture; it is fulfilled at the
          // end of the next render(). The export loop must drive that render
          // itself. Relying on the interactive rAF loop to do it made every
          // frame wait for the next animation tick — already-converged frames
          // included — and hung outright in a background tab, where rAF never
          // fires at all.
          const pending = deps.engine.captureExportFrame({
            outputWidth: output.width,
            outputHeight: output.height,
            supersample: output.supersample,
            // Presentation time is uniform n/fps so the file plays at its
            // nominal rate. NOT frame.elapsedSeconds, which spreads the camera
            // over [0, duration] inclusive so the last frame lands on B.
            timestampMicros: Math.round((frame.index * 1e6) / output.fps),
            durationMicros: frameDurationMicros,
          })
          let settled = false
          const done = pending.then((f) => { settled = true; return f })
          for (let attempt = 0; attempt < CAPTURE_DRIVE_ATTEMPTS && !settled; attempt++) {
            await deps.controller.drawOnce()
            await deps.engine.waitForSubmittedWork()
          }
          await sink.addFrame(await done)
        },
      },
      {
        fps: output.fps,
        durationSeconds: request.durationSeconds,
        maxPumpsPerFrame: request.maxPumpsPerFrame ?? DEFAULT_MAX_PUMPS_PER_FRAME,
      },
      { onProgress: request.onProgress, signal: request.signal },
    )

    if (result.cancelled) {
      // Close the file rather than abandon it. Fragmented MP4 means everything
      // written so far is already a complete, playable film, so an interrupted
      // export keeps what it rendered instead of losing all of it.
      const partial = await sink.finalize().catch(() => null)
      return {
        blob: partial,
        streamed: sink.streaming,
        cancelled: true,
        framesEmitted: result.framesEmitted,
        totalPumps: result.totalPumps,
        freeFrames: result.freeFrames,
        codec: sink.codec,
        fileExtension: sink.fileExtension,
      }
    }

    return {
      blob: await sink.finalize(),
      streamed: sink.streaming,
      cancelled: false,
      framesEmitted: result.framesEmitted,
      totalPumps: result.totalPumps,
      freeFrames: result.freeFrames,
      codec: sink.codec,
      fileExtension: sink.fileExtension,
    }
  } catch (error) {
    await sink.cancel().catch(() => undefined)
    throw error
  } finally {
    // Restores the threshold, the pinned surface, targetFps and aaAuto on every
    // path — a session left half-applied would leave the interactive view
    // rendering at the film's geometry.
    deps.engine.endVideoExportSession()
    deps.controller.setExportTime(null)
  }
}

/** Frame count a request will produce, for progress display before it starts. */
export function plannedFrameCount(fps: number, durationSeconds: number): number {
  return totalFramesFor({ fps, durationSeconds })
}

export { elapsedForFrame }
