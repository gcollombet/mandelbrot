import type { Mp4Codec } from './videoEncoderSink'

export type VideoEncodingProfile = 'standard' | 'high' | 'maximum' | 'custom' | 'quantizer'
export type VideoEncoding = { profile: VideoEncodingProfile; bitrateMbps: number }
export const DEFAULT_VIDEO_ENCODING: VideoEncoding = { profile: 'high', bitrateMbps: 100 }
/** Proposed preservation-oriented budgets at UHD/30 fps, in Mbit/s. */
export const VIDEO_BITRATES = {
  avc: [60, 150, 300], hevc: [40, 100, 200], vp9: [40, 100, 200], av1: [30, 75, 150],
} as const
export function normalizeVideoEncoding(value: unknown): VideoEncoding {
  const v = value as Partial<VideoEncoding> | null
  return {
    profile: v && ['standard','high','maximum','custom','quantizer'].includes(v.profile!) ? v.profile! : 'high',
    bitrateMbps: typeof v?.bitrateMbps === 'number' && Number.isFinite(v.bitrateMbps) && v.bitrateMbps >= 0.1 && v.bitrateMbps <= 2000 ? v.bitrateMbps : 100,
  }
}
export function videoBitrate(codec: Mp4Codec, width: number, height: number, fps: number, encoding: VideoEncoding = DEFAULT_VIDEO_ENCODING): number {
  if (![width,height,fps].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid video dimensions or frame rate')
  const index = ['standard','high','maximum'].indexOf(encoding.profile)
  const mbps = encoding.profile === 'custom' ? encoding.bitrateMbps
    : VIDEO_BITRATES[codec][index < 0 ? 1 : index] * width * height / (3840 * 2160) * fps / 30
  if (!Number.isFinite(mbps) || mbps <= 0 || mbps > 2000) throw new Error('Video bitrate must be between 0 and 2000 Mbit/s')
  return Math.max(1, Math.round(mbps * 1e6))
}

/** Conservative levels cover 60 fps; native support is still probed. */
export function rateControlledCodec(codec: Mp4Codec, width: number, height: number, bitrate: number, hdr = false): string | undefined {
  if (codec === 'avc') return undefined // Mediabunny selects the AVC level from the explicit bitrate.
  const large = width * height > 3840 * 2160, small = width * height <= 1920 * 1080
  const hdrCodec = (() => {
    // Conservative minimum levels cover up to 60 fps. Raise tier/level for the
    // requested bitrate instead of declaring a low-tier stream at master rates.
    const mbps = bitrate / 1e6
    if (codec === 'hevc') {
      const levels = [[123,20,50],[153,40,160],[156,60,240],[183,120,480],[186,240,800]]
      const level = levels.find(([id,main,high]) => id >= (large ? 183 : small ? 123 : 153) && mbps <= Math.max(main,high))
      if (!level) throw new Error('HEVC bitrate exceeds supported codec levels')
      return `hvc1.2.4.${mbps <= level[1] ? 'L' : 'H'}${level[0]}.B0`
    } else if (codec === 'av1') {
      const levels = [[9,20,50],[13,40,160],[14,60,240],[17,100,480],[18,160,800]]
      const level = levels.find(([id,main,high]) => id >= (large ? 17 : small ? 9 : 13) && mbps <= Math.max(main,high))
      if (!level) throw new Error('AV1 bitrate exceeds supported codec levels')
      return `av01.0.${String(level[0]).padStart(2,'0')}${mbps <= level[1] ? 'M' : 'H'}.10.0.110.09.16.09.0`
    } else {
      const level = [[41,30],[51,120],[52,180],[61,240],[62,480]].find(([id,max]) => id >= (large ? 61 : small ? 41 : 51) && mbps <= max)
      if (!level) throw new Error('VP9 bitrate exceeds supported codec levels')
      return `vp09.02.${level[0]}.10.01.09.16.09.00`
    }
  })()
  if (hdr) return hdrCodec
  if (codec === 'hevc') return hdrCodec.replace('hvc1.2.4.', 'hev1.1.6.')
  if (codec === 'av1') return hdrCodec.replace('.10.0.110.09.16.09.0', '.08')
  return hdrCodec.replace('vp09.02.', 'vp09.00.').replace('.10.01.09.16.09.00', '.08')
}
