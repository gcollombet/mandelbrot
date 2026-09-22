import { t } from '../i18n'
import type { HdrGpuOptions } from '../hdrGpuOutput'
import { hdrEncoderConfig, hdrInputFrame, type VideoDynamicRange } from '../hdrVideo'
import { normalizeStereoVideo, validateStereoDimensions, type StereoVideoSettings } from '../stereoVideo'
import { radialMode } from './radial'
import { effectsSettings, type ExpmapEffects } from './effects'
import { canonicalScale, compareScales, interpolateScale, scaleDoublements } from './decimal'
import type { ExpmapManifest } from './manifest'
import { validateExpmapView, type ExpmapView, type ExpmapSampleDistribution } from './renderer'
import { createVideoSink, type Mp4Codec, type VideoDestination } from '../videoEncoderSink'
import { DEFAULT_EXPMAP_MOTION, fitMotion, motionProgress, motionSettings, validateMotion, type ExpmapMotion } from './motion'
import { elapsedForFrame, totalFramesFor } from '../videoExportSession'

export type ExpmapVideoSource = Pick<ExpmapManifest, 'projection' | 'state' | 'documentId'>
export type ExpmapVideoWindow = { fromScale: string; toScale: string; fromAngle: number; toAngle: number; speed: number; durationSeconds: number; authority: 'speed' | 'duration' } & Partial<ExpmapMotion>
export function expmapVideoDefaults(manifest: ExpmapVideoSource): ExpmapVideoWindow {
  const { startScale, endScale } = manifest.projection.domain
  const distance = Math.abs(scaleDoublements(startScale, endScale))
  return { fromScale: startScale, toScale: endScale, fromAngle: 0, toAngle: 0, speed: distance ? 2 : 0, durationSeconds: distance ? distance / 2 : 5, authority: 'duration', ...DEFAULT_EXPMAP_MOTION }
}
export function validateExpmapVideoWindow(manifest: ExpmapVideoSource, window: ExpmapVideoWindow, effects?: Partial<ExpmapEffects>) {
  if (manifest.state !== 'complete') throw new Error(t('expmap.video.incomplete'))
  for (const scale of [window.fromScale, window.toScale]) {
    canonicalScale(scale)
    if (compareScales(scale, manifest.projection.domain.startScale) > 0 || (radialMode(effects) === 'normal' && compareScales(scale, manifest.projection.domain.endScale) < 0)) throw new Error(t('expmap.video.outOfDomain'))
  }
  if (![window.fromAngle, window.toAngle, window.durationSeconds, window.speed].every(Number.isFinite) || window.durationSeconds <= 0) throw new Error(t('expmap.video.invalidDurationRotation'))
  validateMotion(window, window.durationSeconds)
  const distance = Math.abs(scaleDoublements(window.fromScale, window.toScale))
  if (distance ? window.speed <= 0 : window.speed !== 0) throw new Error(t('expmap.video.invalidSpeedWindow'))
  if (distance && Math.abs(window.durationSeconds * window.speed - distance) > Math.max(1e-12, distance * 1e-10)) throw new Error(t('expmap.video.speedDurationMismatch'))
}
export function changeExpmapSpeed(window: ExpmapVideoWindow, speed: number): ExpmapVideoWindow {
  const distance = Math.abs(scaleDoublements(window.fromScale, window.toScale))
  if (!distance) return { ...window, speed: 0 }
  if (!Number.isFinite(speed) || speed <= 0) throw new Error(t('expmap.video.speedPositive'))
  const durationSeconds = distance / speed
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error(t('expmap.video.durationOutOfRange'))
  return fitMotion({ ...window, speed, durationSeconds, authority: 'speed' })
}
export function changeExpmapDuration(window: ExpmapVideoWindow, durationSeconds: number): ExpmapVideoWindow {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error(t('expmap.video.durationPositive'))
  const distance = Math.abs(scaleDoublements(window.fromScale, window.toScale))
  const speed = distance / durationSeconds
  if (!Number.isFinite(speed) || (distance && speed <= 0)) throw new Error(t('expmap.video.speedOutOfRange'))
  return fitMotion({ ...window, durationSeconds, speed, authority: 'duration' })
}
export function changeExpmapWindow(window: ExpmapVideoWindow, fromScale: string, toScale: string): ExpmapVideoWindow {
  const updated = { ...window, fromScale: canonicalScale(fromScale), toScale: canonicalScale(toScale) }
  return window.authority === 'duration' ? changeExpmapDuration(updated, window.durationSeconds) : changeExpmapSpeed(updated, window.speed > 0 ? window.speed : 2)
}
export function saveExpmapVideoWindow(id: string, window: ExpmapVideoWindow) {
  try { localStorage.setItem(`expmap-video-window:${id}`, JSON.stringify({ version: 1, window })) } catch { /* Keep the current in-memory edit. */ }
}
export function loadExpmapVideoWindow(manifest: ExpmapVideoSource, effects?: Partial<ExpmapEffects>): { window: ExpmapVideoWindow; reset: boolean } {
  try {
    const text = localStorage.getItem(`expmap-video-window:${manifest.documentId}`)
    if (!text) return { window: expmapVideoDefaults(manifest), reset: false }
    const value = JSON.parse(text)
    if (value.version !== 1) throw new Error('Preferences version changed')
    validateExpmapVideoWindow(manifest, value.window, effects)
    return { window: { ...DEFAULT_EXPMAP_MOTION, ...value.window }, reset: false }
  } catch { return { window: expmapVideoDefaults(manifest), reset: true } }
}

/** Shared schedule for frame-first and ring-first exports. */
export function expmapVideoFrameView(request:{window:ExpmapVideoWindow;width:number;height:number;maxSamples?:number;sampleDistribution?:ExpmapSampleDistribution;effects?:ExpmapEffects},i:number,total:number,durationSeconds:number):ExpmapView {
  const effects=effectsSettings(request.effects)
  const t=motionProgress(request.window,elapsedForFrame(i,total,durationSeconds))
  return {effectTime:elapsedForFrame(i,total,durationSeconds),effects,allowUpscale:true,width:request.width,height:request.height,maxSamples:request.maxSamples??16,sampleDistribution:request.sampleDistribution,
    scale:interpolateScale(request.window.fromScale,request.window.toScale,t),
    angle:effects.imageRotationMode==='octave'||effects.imageRotationMode==='droste'?request.window.fromAngle:t===0?request.window.fromAngle:t===1?request.window.toAngle:request.window.fromAngle+(request.window.toAngle-request.window.fromAngle)*t}
}

/** Deterministic ordered loop. Interactive request dropping never enters here. */
export async function exportExpmapVideo(source: { manifest: ExpmapVideoSource }, request: {
  window: ExpmapVideoWindow; width: number; height: number; fps: number; codec: Mp4Codec; maxSamples?: number; sampleDistribution?: ExpmapSampleDistribution; effects?: ExpmapEffects
  stereo?: StereoVideoSettings
  dynamicRange?: VideoDynamicRange; hdrExposure?: number; hdrQuantizer?: number
  destination: VideoDestination; signal?: AbortSignal
  /** Encode only the first frames; the camera path keeps its full-length timing. Reported as cancelled. */
  frameLimit?: number
  onWarning?: (message: string) => void
  onProgress?: (frames: number, total: number) => void
  gpuRenderer: { renderHdr?(view: ExpmapView, stereo?: StereoVideoSettings, signal?: AbortSignal, options?: HdrGpuOptions): Promise<Uint16Array>; render(view: ExpmapView, signal?: AbortSignal): Promise<OffscreenCanvas>; renderStereo?(view: ExpmapView, settings: StereoVideoSettings, signal?: AbortSignal): Promise<OffscreenCanvas> }
}) {
  let hdrWarned = false
  const onHdrWarning = (message: string) => {
    if (!hdrWarned) { hdrWarned = true; request.onWarning?.(message) }
  }
  const hdr=request.dynamicRange==='hdr'
  if(hdr){
    if(!request.gpuRenderer.renderHdr)throw new Error(t('expmap.video.hdrNeedsShader'))
    hdrEncoderConfig({...request,quantizer:request.hdrQuantizer},'prefer-hardware')
    if(!Number.isFinite(request.hdrExposure??0)||Math.abs(request.hdrExposure??0)>16)throw new Error(t('expmap.video.hdrExposure'))
  }
  const stereo = normalizeStereoVideo(request.stereo)
  if(stereo.enabled && !hdr && !request.gpuRenderer.renderStereo)throw new Error(t('expmap.video.stereoNeedsShader'))
  if(stereo.enabled)validateStereoDimensions(request.width,request.height,stereo.layout)
  const effects = effectsSettings(request.effects)
  validateExpmapVideoWindow(source.manifest, request.window, effects)
  validateExpmapView(source.manifest.projection, { width: request.width, height: request.height, scale: request.window.fromScale, angle: request.window.fromAngle, maxSamples: request.maxSamples ?? 16, sampleDistribution:request.sampleDistribution, allowUpscale: true, effects })
  if (!Number.isFinite(request.fps) || request.fps <= 0 || request.fps > 240) throw new Error(t('expmap.video.invalidFps'))
  const durationSeconds = request.window.durationSeconds + motionSettings(request.window).holdSeconds
  const settings = { fps: request.fps, durationSeconds }
  const total = totalFramesFor(settings)
  if (!Number.isSafeInteger(total) || total > 10_000_000) throw new Error(t('expmap.video.tooManyFrames'))
  request.signal?.throwIfAborted()
  const limit = request.frameLimit === undefined ? total : Math.max(0, Math.min(total, Math.floor(request.frameLimit)))
  request.onProgress?.(0, limit)
  const sink = await createVideoSink({ width: request.width, height: request.height, fps: request.fps, codec: request.codec, dynamicRange:request.dynamicRange, hdrQuantizer:hdr?request.hdrQuantizer:undefined, destination: request.destination, hardwareAcceleration: 'prefer-hardware' })
  let emitted = 0
  try {
    for (let i = 0; i < limit; i++) {
      request.signal?.throwIfAborted()
      const view = expmapVideoFrameView({...request,effects},i,total,durationSeconds)
      const timing = { timestamp: Math.round(i * 1e6 / request.fps), duration: Math.round(1e6 / request.fps) }
      let frame:VideoFrame
      if(hdr){
        const planes=await request.gpuRenderer.renderHdr!(view,stereo,request.signal,{format:'video',exposure:request.hdrExposure??0,onWarning:onHdrWarning})
        request.signal?.throwIfAborted()
        frame=hdrInputFrame(planes,request.width,request.height,timing.timestamp,timing.duration)
      }else{
        const canvas = stereo.enabled
          ? await request.gpuRenderer.renderStereo!(view, stereo, request.signal)
          : await request.gpuRenderer.render(view, request.signal)
        request.signal?.throwIfAborted()
        frame = new VideoFrame(canvas, timing)
      }
      await sink.addFrame(frame)
      emitted++; request.onProgress?.(emitted, limit)
    }
    return { blob: await sink.finalize(), framesEmitted: emitted, cancelled: limit < total }
  } catch (error) {
    if (request.signal?.aborted) return { blob: await sink.finalize().catch(() => null), framesEmitted: emitted, cancelled: true }
    await sink.cancel(); throw error
  }
}
