import type { HdrGpuOptions } from './hdrGpuOutput'
// ── High-resolution still capture ──
// Drives the engine's export session for a single camera position instead of
// a parcours. SDR tiles assemble on a 2D canvas; HDR tiles contain GPU-converted RGB16 PQ bytes
// ready for PNG compression. One tile when the
// working texture fits the device, a grid of tiles otherwise (8K).
//
// The driver knows nothing about Vue: the viewer injects the engine, the
// controller (drawOnce / setExportTime) and the navigator.

import { neutralSizeFor } from './videoPath'

export type StillSize = 'window' | '1k' | '2k' | '4k' | '8k'

/** Output aspect: follow the window, or force a fixed ratio (width / height). */
export type StillAspect = 'window' | '1:1' | '16:9' | '4:3'

export const STILL_ASPECT_RATIOS: Record<Exclude<StillAspect, 'window'>, number> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
}

/** Numeric width/height ratio for an aspect choice, given the window's own ratio. */
export function stillAspectRatio(aspect: StillAspect, windowRatio: number): number {
  return aspect === 'window' ? windowRatio : STILL_ASPECT_RATIOS[aspect]
}

/**
 * Output size of a preset width at a given ratio. The height is rounded to a
 * multiple of `STILL_MAX_GRID` so every tile grid the planner may choose
 * divides it exactly.
 */
export function stillPresetDimensions(width: number, ratio: number): { width: number; height: number } {
  const height = Math.max(STILL_MAX_GRID, Math.round(width / ratio / STILL_MAX_GRID) * STILL_MAX_GRID)
  return { width, height }
}

/**
 * Largest centred crop of a `width`×`height` surface with the requested
 * ratio (integer pixels). Identity when the surface already matches.
 */
export function centredCropForRatio(width: number, height: number, ratio: number): { x: number; y: number; width: number; height: number } {
  let w = width
  let h = Math.round(width / ratio)
  if (h > height) {
    h = height
    w = Math.round(height * ratio)
  }
  return { x: Math.floor((width - w) / 2), y: Math.floor((height - h) / 2), width: w, height: h }
}

/** Output width per preset. "K" = 1024 px multiples, height follows the window aspect. */
export const STILL_PRESET_WIDTHS: Record<Exclude<StillSize, 'window'>, number> = {
  '1k': 1024,
  '2k': 2048,
  '4k': 4096,
  '8k': 8192,
}

export type StillTile = {
  index: number
  col: number
  row: number
  /** Pixel origin of this tile inside the assembled image. */
  originX: number
  originY: number
  width: number
  height: number
}

export type StillPlan = {
  width: number
  height: number
  /** Tiles per axis (1 = monolithic). */
  grid: number
  tiles: StillTile[]
}

/** Largest grid the planner may pick; callers round sizes to a multiple of it. */
export const STILL_MAX_GRID = 8

/**
 * Split the output into the smallest square grid whose per-tile working
 * texture (the neutral square, ⌈√(w²+h²)⌉) fits `maxTextureDimension`.
 * Tiles are all equal: `width` and `height` must be multiples of the grid,
 * otherwise a tile's pixel pitch would differ from the full image's and the
 * assembly would not be exact. Rounding both to a multiple of
 * `STILL_MAX_GRID` beforehand satisfies every grid the planner can choose.
 */
export function planStillTiles(
  width: number,
  height: number,
  maxTextureDimension: number,
): StillPlan {
  let grid = 1
  while (grid < STILL_MAX_GRID) {
    if (neutralSizeFor(width / grid, height / grid) <= maxTextureDimension) break
    grid *= 2
  }
  if (width % grid !== 0 || height % grid !== 0) {
    throw new Error(`${width}×${height} n'est pas divisible par la grille ${grid}×${grid}.`)
  }
  const tileW = width / grid
  const tileH = height / grid
  const tiles: StillTile[] = []
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      tiles.push({ index: tiles.length, col, row, originX: col * tileW, originY: row * tileH, width: tileW, height: tileH })
    }
  }
  return { width, height, grid, tiles }
}

/**
 * Exact multiplication of a decimal string by a power of two (`factor` must
 * be 2^k, k ∈ ℤ). Deep-zoom scales are far below f64 range, so this stays in
 * integer arithmetic: mantissa × 5^k, exponent − k for a halving.
 */
export function scaleDecimalStringByPow2(value: string, factor: number): string {
  const k = Math.log2(factor)
  if (!Number.isInteger(k)) throw new Error(`factor ${factor} is not a power of two`)
  const match = /^\s*([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*$/.exec(value)
  if (!match || (match[2] === '' && (match[3] ?? '') === '')) {
    throw new Error(`Unparseable decimal: ${value}`)
  }
  const sign = match[1] === '-' ? '-' : ''
  const intPart = match[2] || '0'
  const fracPart = match[3] ?? ''
  let exponent = (match[4] ? parseInt(match[4], 10) : 0) - fracPart.length
  let mantissa = BigInt(intPart + fracPart)
  if (k >= 0) {
    mantissa *= 2n ** BigInt(k)
  } else {
    mantissa *= 5n ** BigInt(-k)
    exponent += k
  }
  if (mantissa === 0n) return '0'
  return `${sign}${mantissa.toString()}e${exponent}`
}

export type StillExportDeps = {
  engine: {
    beginVideoExportSession(settings: {
      magnificationThreshold: number
      outputWidth: number
      outputHeight: number
      supersample: number
      batchTargetFps: number
      hdr?: boolean
      aaSamplesPerFrame?: number
    }): Promise<void>
    endVideoExportSession(): void
    videoFrameReady(): boolean
    beginExportFrameAa(): void
    waitForSubmittedWork(): Promise<void>
    captureExportFrame(request: {
      outputWidth: number
      outputHeight: number
      supersample: number
      timestampMicros: number
      durationMicros: number
    }): Promise<VideoFrame>
    captureHdrFrame?(width: number, height: number, supersample?: number, options?: HdrGpuOptions): Promise<Uint16Array>
    readonly maxTextureDimension: number
  }
  controller: {
    drawOnce(): Promise<void> | void
    setExportTime(elapsedSeconds: number | null): void
  }
  navigator: {
    cancel_transition(): void
    origin(cx: string, cy: string): void
    scale(value: string): void
    angle(value: number): void
    translate_direct(dx: number, dy: number, w?: number, h?: number): void
  }
}

export type StillExportRequest = {
  hdr?: boolean
  hdrExposure?: number
  location: { cx: string; cy: string; scale: string; angle: number }
  width: number
  height: number
  aaSamples: number
  magnificationThreshold: number
  maxPumpsPerTile?: number
  signal?: AbortSignal
  onWarning?: (message: string) => void
  onProgress?: (progress: { tile: number; tiles: number; pumps: number }) => void
}

export type StillExportResult = {
  /** Packed big-endian RGB16 PQ bytes from the GPU (three words per pixel). */
  hdrPixels?: Uint16Array
  canvas: HTMLCanvasElement
  plan: StillPlan
  totalPumps: number
}

const DEFAULT_MAX_PUMPS_PER_TILE = 20000
const CAPTURE_DRIVE_ATTEMPTS = 8

/**
 * Render the current view at an arbitrary size. Each tile is placed with the
 * navigator's exact (big-decimal) arithmetic: the full view keeps its centre
 * and half-height `scale`; a tile's centre is offset by its position in the
 * grid and its scale divided by the grid, so tiles abut without overlap.
 */
export async function renderStill(deps: StillExportDeps, request: StillExportRequest): Promise<StillExportResult> {
  let hdrWarned = false
  const onHdrWarning = (message: string) => {
    if (!hdrWarned) { hdrWarned = true; request.onWarning?.(message) }
  }
  const plan = planStillTiles(request.width, request.height, deps.engine.maxTextureDimension)
  const canvas = document.createElement('canvas')
  canvas.width = request.hdr ? 1 : plan.width
  canvas.height = request.hdr ? 1 : plan.height
  if (request.hdr && !deps.engine.captureHdrFrame) throw new Error('Capture HDR indisponible.')
  const hdrPixels = request.hdr ? new Uint16Array(plan.width * plan.height * 3) : undefined
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponible pour assembler la capture.')

  const aspect = plan.width / plan.height
  const tileScale = plan.grid === 1
    ? request.location.scale
    : scaleDecimalStringByPow2(request.location.scale, 1 / plan.grid)
  const maxPumps = request.maxPumpsPerTile ?? DEFAULT_MAX_PUMPS_PER_TILE
  let totalPumps = 0
  const { cx, cy, scale, angle } = request.location

  const throwIfAborted = () => {
    if (request.signal?.aborted) throw new DOMException('Capture annulée', 'AbortError')
  }

  const placeCamera = (tile: StillTile) => {
    deps.navigator.cancel_transition()
    deps.navigator.origin(cx, cy)
    deps.navigator.scale(scale)
    deps.navigator.angle(angle)
    if (plan.grid > 1) {
      // Offsets in full-view half-height units: screen-right is +x, screen-up
      // is +y (same convention as the controller's click-to-centre).
      const centreX = (tile.originX + tile.width / 2) / plan.width * 2 - 1
      const centreY = (tile.originY + tile.height / 2) / plan.height * 2 - 1
      deps.navigator.translate_direct(centreX * aspect, -centreY)
      deps.navigator.scale(tileScale)
    }
  }

  // Tiles are all equal, so one session serves every tile.
  const surfaceW = plan.tiles[0].width
  const surfaceH = plan.tiles[0].height
  await deps.engine.beginVideoExportSession({
    magnificationThreshold: request.magnificationThreshold,
    outputWidth: surfaceW,
    outputHeight: surfaceH,
    supersample: 1,
    batchTargetFps: 1,
    aaSamplesPerFrame: Math.max(1, request.aaSamples),
    hdr: request.hdr,
  })
  try {
    for (const tile of plan.tiles) {
      throwIfAborted()
      placeCamera(tile)
      deps.controller.setExportTime(0)
      deps.engine.beginExportFrameAa()
      let pumps = 0
      let ready = false
      while (!ready && pumps < maxPumps) {
        throwIfAborted()
        await deps.controller.drawOnce()
        await deps.engine.waitForSubmittedWork()
        pumps++
        ready = deps.engine.videoFrameReady()
        if (!ready && (pumps & 15) === 0) {
          request.onProgress?.({ tile: tile.index, tiles: plan.tiles.length, pumps: totalPumps + pumps })
        }
      }
      totalPumps += pumps
      if (!ready) {
        throw new Error(`La tuile ${tile.index + 1}/${plan.tiles.length} n'a pas convergé en ${maxPumps} passes.`)
      }
      const pending = request.hdr ? deps.engine.captureHdrFrame!(surfaceW, surfaceH, 1, {format:'png',exposure:request.hdrExposure ?? 0,originX:tile.originX,originY:tile.originY,signal:request.signal,onWarning:onHdrWarning}) : deps.engine.captureExportFrame({
        outputWidth: surfaceW,
        outputHeight: surfaceH,
        supersample: 1,
        timestampMicros: tile.index * 1000,
        durationMicros: 1000,
      })
      let settled = false
      const done = pending.then((f) => { settled = true; return f })
      // Session teardown may reject the capture if a draw fails first.
      void done.catch(() => {})
      for (let attempt = 0; attempt < CAPTURE_DRIVE_ATTEMPTS && !settled; attempt++) {
        throwIfAborted()
        await deps.controller.drawOnce()
        await deps.engine.waitForSubmittedWork()
      }
      const frame = await done
      if (frame instanceof Uint16Array) {
        for (let y = 0; y < tile.height; y++) {
          hdrPixels!.set(frame.subarray(y * tile.width * 3, (y + 1) * tile.width * 3), ((tile.originY + y) * plan.width + tile.originX) * 3)
        }
      } else {
        try { ctx.drawImage(frame, tile.originX, tile.originY) }
        finally { frame.close() }
      }
      request.onProgress?.({ tile: tile.index + 1, tiles: plan.tiles.length, pumps: totalPumps })
    }
  } finally {
    deps.controller.setExportTime(null)
    deps.engine.endVideoExportSession()
    // Put the interactive camera back exactly where the user left it.
    deps.navigator.cancel_transition()
    deps.navigator.origin(cx, cy)
    deps.navigator.scale(scale)
    deps.navigator.angle(angle)
  }
  return { canvas, hdrPixels, plan, totalPumps }
}
