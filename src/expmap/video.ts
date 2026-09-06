import { canonicalScale, compareScales, interpolateScale, scaleDoublements } from './decimal'
import type { ExpmapManifest } from './manifest'
import { validateExpmapView, type ExpmapView } from './renderer'
import { createVideoSink, type Mp4Codec, type VideoDestination } from '../videoEncoderSink'
import { elapsedForFrame, totalFramesFor } from '../videoExportSession'

export type ExpmapVideoWindow = { fromScale: string; toScale: string; fromAngle: number; toAngle: number; speed: number; durationSeconds: number; authority: 'speed' | 'duration' }
export function expmapVideoDefaults(manifest: ExpmapManifest): ExpmapVideoWindow {
  const { startScale, endScale } = manifest.projection.domain
  const distance = Math.abs(scaleDoublements(startScale, endScale))
  return { fromScale: startScale, toScale: endScale, fromAngle: 0, toAngle: 0, speed: distance ? 2 : 0, durationSeconds: distance ? distance / 2 : 5, authority: 'speed' }
}
export function validateExpmapVideoWindow(manifest: ExpmapManifest, window: ExpmapVideoWindow) {
  if (manifest.state !== 'complete') throw new Error('Le document est incomplet.')
  for (const scale of [window.fromScale, window.toScale]) {
    canonicalScale(scale)
    if (compareScales(scale, manifest.projection.domain.startScale) > 0 || compareScales(scale, manifest.projection.domain.endScale) < 0) throw new Error('La fenêtre sort du domaine du document.')
  }
  if (![window.fromAngle, window.toAngle, window.durationSeconds, window.speed].every(Number.isFinite) || window.durationSeconds <= 0) throw new Error('Durée ou rotation invalide.')
  const distance = Math.abs(scaleDoublements(window.fromScale, window.toScale))
  if (distance ? window.speed <= 0 : window.speed !== 0) throw new Error('Vitesse invalide pour cette fenêtre.')
  if (distance && Math.abs(window.durationSeconds * window.speed - distance) > Math.max(1e-12, distance * 1e-10)) throw new Error('Vitesse et durée ne correspondent pas.')
}
export function changeExpmapSpeed(window: ExpmapVideoWindow, speed: number): ExpmapVideoWindow {
  const distance = Math.abs(scaleDoublements(window.fromScale, window.toScale))
  if (!distance) return { ...window, speed: 0 }
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('La vitesse doit être positive.')
  const durationSeconds = distance / speed
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('Durée hors limites.')
  return { ...window, speed, durationSeconds, authority: 'speed' }
}
export function changeExpmapDuration(window: ExpmapVideoWindow, durationSeconds: number): ExpmapVideoWindow {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('La durée doit être positive.')
  const distance = Math.abs(scaleDoublements(window.fromScale, window.toScale))
  const speed = distance / durationSeconds
  if (!Number.isFinite(speed) || (distance && speed <= 0)) throw new Error('Vitesse hors limites.')
  return { ...window, durationSeconds, speed, authority: 'duration' }
}
export function changeExpmapWindow(window: ExpmapVideoWindow, fromScale: string, toScale: string): ExpmapVideoWindow {
  const updated = { ...window, fromScale: canonicalScale(fromScale), toScale: canonicalScale(toScale) }
  return changeExpmapSpeed(updated, window.speed > 0 ? window.speed : 2)
}
export function saveExpmapVideoWindow(id: string, window: ExpmapVideoWindow) {
  localStorage.setItem(`expmap-video-window:${id}`, JSON.stringify({ version: 1, window }))
}
export function loadExpmapVideoWindow(manifest: ExpmapManifest): { window: ExpmapVideoWindow; reset: boolean } {
  try {
    const text = localStorage.getItem(`expmap-video-window:${manifest.documentId}`)
    if (!text) return { window: expmapVideoDefaults(manifest), reset: false }
    const value = JSON.parse(text)
    if (value.version !== 1) throw new Error('Preferences version changed')
    validateExpmapVideoWindow(manifest, value.window)
    return { window: value.window, reset: false }
  } catch { return { window: expmapVideoDefaults(manifest), reset: true } }
}

/** Deterministic ordered loop. Interactive request dropping never enters here. */
export async function exportExpmapVideo(source: { manifest: ExpmapManifest }, request: {
  window: ExpmapVideoWindow; width: number; height: number; fps: number; codec: Mp4Codec
  destination: VideoDestination; signal?: AbortSignal
  onProgress?: (frames: number, total: number) => void
  gpuRenderer: { render(view: ExpmapView, signal?: AbortSignal): Promise<OffscreenCanvas> }
}) {
  validateExpmapVideoWindow(source.manifest, request.window)
  validateExpmapView(source.manifest.projection, { width: request.width, height: request.height, scale: request.window.fromScale, angle: request.window.fromAngle })
  if (!Number.isFinite(request.fps) || request.fps <= 0 || request.fps > 240) throw new Error('Cadence invalide.')
  const settings = { fps: request.fps, durationSeconds: request.window.durationSeconds }
  const total = totalFramesFor(settings)
  if (!Number.isSafeInteger(total) || total > 10_000_000) throw new Error('Trop d’images demandées.')
  request.signal?.throwIfAborted()
  request.onProgress?.(0, total)
  const sink = await createVideoSink({ width: request.width, height: request.height, fps: request.fps, codec: request.codec, destination: request.destination, hardwareAcceleration: 'prefer-hardware' })
  let emitted = 0
  try {
    for (let i = 0; i < total; i++) {
      request.signal?.throwIfAborted()
      const t = elapsedForFrame(i, total, request.window.durationSeconds) / request.window.durationSeconds
      const view = { width: request.width, height: request.height,
        scale: interpolateScale(request.window.fromScale, request.window.toScale, t),
        angle: request.window.fromAngle + (request.window.toAngle - request.window.fromAngle) * t }
      const canvas = await request.gpuRenderer.render(view, request.signal)
      request.signal?.throwIfAborted()
      const timing = { timestamp: Math.round(i * 1e6 / request.fps), duration: Math.round(1e6 / request.fps) }
      const frame = new VideoFrame(canvas, timing)
      await sink.addFrame(frame)
      emitted++; request.onProgress?.(emitted, total)
    }
    return { blob: await sink.finalize(), framesEmitted: emitted, cancelled: false }
  } catch (error) {
    if (request.signal?.aborted) return { blob: await sink.finalize().catch(() => null), framesEmitted: emitted, cancelled: true }
    await sink.cancel(); throw error
  }
}
