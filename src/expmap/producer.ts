import type { VideoExportRunnerDeps } from '../videoExportRunner'
import type { VideoPathLocation } from '../videoPath'
import type { RenderOptions } from '../Engine'
import { expmapAppearanceProblems } from './appearance'
import type { ExpmapPlan, ExpmapBlock } from './plan'
import { octaveBlocks, octaveProjection } from './octaves'
import { type ExpmapKernelProjection } from './producerProjection'

export type ExpmapRgbaBlock = { block: ExpmapBlock; rgba: Uint8Array; stride: number; offset: number }
export type ExpmapProducerDeps = VideoExportRunnerDeps & {
  engine: VideoExportRunnerDeps['engine'] & { prepareExpmapBlock(projection: ExpmapKernelProjection, appearance: RenderOptions): Promise<void> }
}

/** Serial bounded producer. Awaiting consume is the backpressure boundary for
 * encoding/disk; no next block is computed or read back until it resolves.
 * The caller freezes the appearance and preflights the native codec and tile dimensions.
 */
export async function produceExpmapBlocks(deps: ExpmapProducerDeps, request: {
  plan: ExpmapPlan
  appearance: RenderOptions
  restoreCamera: VideoPathLocation
  blocks?: Iterable<ExpmapBlock>
  projectionForBlock?: (plan: ExpmapPlan, block: ExpmapBlock) => ExpmapKernelProjection
  completedBlockIds?: ReadonlySet<string>
  consume: (value: ExpmapRgbaBlock) => Promise<void>
  signal?: AbortSignal
  onProgress?: (blocksProduced: number) => void
  maxPumpsPerBlock?: number
}) {
  const problems = expmapAppearanceProblems(request.appearance)
  if (problems.length) throw new Error(problems.map(p => p.message).join('\n'))
  const navigator = deps.controller.getNavigator()
  if (!navigator) throw new Error('Navigator unavailable')
  const pumpsLimit = request.maxPumpsPerBlock ?? 4000
  if (!Number.isInteger(pumpsLimit) || pumpsLimit < 1) throw new Error('Invalid convergence budget')
  const check = () => request.signal?.throwIfAborted()
  let blocksProduced = 0
  check()
  await deps.engine.beginVideoExportSession({ outputWidth: request.plan.blockSize, outputHeight: request.plan.blockSize,
    supersample: 1, aaSamplesPerFrame: 1, magnificationThreshold: 2, batchTargetFps: 1 })
  try {
    deps.controller.setExportTime(0)
    navigator.cancel_transition()
    navigator.origin(request.plan.domain.cx, request.plan.domain.cy)
    navigator.angle(0)
    for (const block of request.blocks ?? octaveBlocks(request.plan)) {
      check()
      if (request.completedBlockIds?.has(block.id)) continue
      request.onProgress?.(blocksProduced)
      const projection = (request.projectionForBlock ?? octaveProjection)(request.plan, block)
      navigator.scale(projection.scale)
      await deps.engine.prepareExpmapBlock(projection, request.appearance)
      deps.engine.beginVideoExportFrame()
      let ready = false
      for (let pump = 0; pump < pumpsLimit; pump++) {
        check()
        await deps.controller.drawOnce()
        await deps.engine.waitForSubmittedWork()
        if (deps.engine.videoFrameReady()) { ready = true; break }
      }
      if (!ready) throw new Error(`ExpMap block ${block.id} did not converge within ${pumpsLimit} pumps`)
      check()
      let settled = false
      let abandoned = false
      let captured: VideoFrame | undefined
      const capture = deps.engine.captureExportFrame({ outputWidth: block.codedWidth, outputHeight: block.codedHeight,
        supersample: 1, timestampMicros: 0, durationMicros: 1_000_000 })
      const done = capture.then(frame => { settled = true; captured = frame; if (abandoned) { frame.close(); captured = undefined }; return frame }, error => { settled = true; throw error })
      // endVideoExportSession rejects an outstanding capture on every exit.
      void done.catch(() => {})
      try {
      for (let attempt = 0; attempt < 8 && !settled; attempt++) {
        check()
        await deps.controller.drawOnce()
        await deps.engine.waitForSubmittedWork()
      }
      if (!settled) throw new Error('ExpMap capture did not complete')
      const frame = await done
      try {
        check()
        const copyOptions: VideoFrameCopyToOptions = { format: 'RGBA', colorSpace: 'srgb' }
        const rgba = new Uint8Array(frame.allocationSize(copyOptions))
        const [layout] = await frame.copyTo(rgba, copyOptions)
        check()
        await request.consume({ block, rgba, stride: layout.stride, offset: layout.offset })
        blocksProduced++
        request.onProgress?.(blocksProduced)
      } finally { frame.close(); captured = undefined }
      } finally { abandoned = true; captured?.close() }
    }
    return { blocksProduced }
  } finally {
    try {
      navigator.cancel_transition()
      navigator.origin(request.restoreCamera.cx, request.restoreCamera.cy)
      navigator.scale(request.restoreCamera.scale)
      navigator.angle(request.restoreCamera.angle)
    } finally {
      try { deps.controller.setExportTime(null) }
      finally { deps.engine.endVideoExportSession() }
    }
  }
}
