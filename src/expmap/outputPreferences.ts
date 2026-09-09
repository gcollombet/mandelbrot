import { isMp4Codec, type Mp4Codec } from '../videoEncoderSink'
import { EXPMAP_SAMPLE_LIMITS } from './renderer'
export type ExpmapOutput = { width: number; height: number; fps: number; codec: Mp4Codec | 'auto'; maxSamples: number }
export const DEFAULT_EXPMAP_OUTPUT: ExpmapOutput = { width: 3840, height: 2160, fps: 60, codec: 'auto', maxSamples: 16 }
export function loadExpmapOutput(): ExpmapOutput {
  try {
    const v = JSON.parse(localStorage.getItem('expmap-video-output') ?? '{}'), d = DEFAULT_EXPMAP_OUTPUT
    return {
      width: Number.isInteger(v.width) && v.width >= 2 && v.width <= 3840 && v.width % 2 === 0 ? v.width : d.width,
      height: Number.isInteger(v.height) && v.height >= 2 && v.height <= 2160 && v.height % 2 === 0 ? v.height : d.height,
      fps: [24,25,30,60].includes(v.fps) ? v.fps : d.fps,
      codec: v.codec === 'auto' || isMp4Codec(v.codec) ? v.codec : d.codec,
      maxSamples: EXPMAP_SAMPLE_LIMITS.includes(v.maxSamples) ? v.maxSamples : d.maxSamples,
    }
  } catch { return { ...DEFAULT_EXPMAP_OUTPUT } }
}
export function saveExpmapOutput(value: ExpmapOutput) {
  try { localStorage.setItem('expmap-video-output', JSON.stringify(value)) } catch { /* In-memory controls remain usable. */ }
}
export function preferredExpmapCodec(support: Partial<Record<Mp4Codec, boolean>>): Mp4Codec | null {
  return support.hevc ? 'hevc' : support.avc ? 'avc' : null
}
