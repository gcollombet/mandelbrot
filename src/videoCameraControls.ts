import type { VideoPathLocation } from './videoPath'
/** Captures preserve the fields that the user did not select, including deep decimal strings. */
export function captureVideoCenter(location: VideoPathLocation, current: VideoPathLocation): VideoPathLocation {
  return { ...location, cx: current.cx, cy: current.cy }
}
export function captureVideoZoom(location: VideoPathLocation, scale: string): VideoPathLocation { return { ...location, scale } }
export function fractalVideoFilename(value: string): string {
  const base = value.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\.mp4$/i, '') || 'Fractale'
  return `${base}.mp4`
}
