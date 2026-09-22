import { videoBitrate, rateControlledCodec, type VideoEncoding } from './videoEncoding'
import type { Mp4Codec, EncoderPreference } from './videoEncoderSink'
import { t } from './i18n'

export type VideoDynamicRange = 'sdr' | 'hdr'
export const HDR_VIDEO_COLOR_SPACE = {
  primaries: 'bt2020', transfer: 'pq', matrix: 'bt2020-ncl', fullRange: false,
} as const

export function hasHdrColorSpace(c: { primaries?: string | null; transfer?: string | null; matrix?: string | null; fullRange?: boolean | null } | undefined): boolean {
  return c?.primaries === 'bt2020' && c.transfer === 'pq' && c.matrix === 'bt2020-ncl' && c.fullRange === false
}
/** Constant-quality control. `quantizer` pins the per-frame quantizer index and
 *  ignores any bitrate target; undefined keeps the variable-bitrate estimate. */
export type HdrEncoderSpec = { codec: Mp4Codec; width: number; height: number; fps?: number; quantizer?: number; encoding?: VideoEncoding }

/** WebCodecs quantizer index range per codec. */
export function hdrQuantizerRange(codec: Mp4Codec): { min: number; max: number } {
  return { min: 0, max: codec === 'hevc' || codec === 'avc' ? 51 : 63 }
}

/** Per-frame encode options carrying the quantizer under the codec's key. */
export function hdrEncodeOptions(codec: Mp4Codec, quantizer: number | undefined): VideoEncoderEncodeOptions {
  if (quantizer === undefined) return {}
  return { [codec]: { quantizer } } as VideoEncoderEncodeOptions
}

export function hdrEncoderConfig(spec: HdrEncoderSpec, hardwareAcceleration: EncoderPreference): VideoEncoderConfig {
  const { width, height, codec } = spec, fps = spec.fps ?? 30
  const quantizer = spec.encoding && spec.encoding.profile !== 'quantizer' ? undefined : spec.quantizer ?? (spec.encoding?.profile === 'quantizer' ? 10 : undefined)
  const constantBitrate = spec.encoding && spec.encoding.profile !== 'quantizer' ? videoBitrate(codec, width, height, fps, spec.encoding) : undefined
  if (codec === 'avc') throw new Error(t('video.hdr.avcIsSdr'))
  if (quantizer !== undefined) {
    const { min, max } = hdrQuantizerRange(codec)
    if (!Number.isInteger(quantizer) || quantizer < min || quantizer > max) throw new Error(t('video.hdr.quantizerInvalid', { codec: codec.toUpperCase(), min, max }))
  }
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n % 2 === 0) || !Number.isFinite(fps) || fps <= 0 || fps > 60) throw new Error(t('video.hdr.evenDimensionsAndFps'))
  const large = width * height > 3840 * 2160, small = width * height <= 1920 * 1080
  let codecString = codec === 'hevc' ? `hvc1.2.4.L${large ? 183 : small ? 123 : 153}.B0`
    : codec === 'av1' ? `av01.0.${large ? '17' : small ? '09' : '13'}M.10.0.110.09.16.09.0`
    : `vp09.02.${large ? '61' : small ? '41' : '51'}.10.01.09.16.09.00`
  if (constantBitrate !== undefined) codecString = rateControlledCodec(codec, width, height, constantBitrate, true)!
  // Chrome's software VP9/AV1 run at realtime speed whatever `latencyMode` says,
  // and their variable-bitrate control under-delivers on fractal detail
  // (measured: 73 Mb/s out of 120 requested at 4K). Constant quality avoids that.
  const rate: Pick<VideoEncoderConfig, 'bitrate' | 'bitrateMode'> = quantizer !== undefined
    ? { bitrateMode: 'quantizer' }
    : constantBitrate !== undefined ? { bitrate: constantBitrate, bitrateMode: 'constant' }
    : { bitrate: Math.round(Math.max(2_000_000, Math.min(120_000_000, width * height * fps * 0.16))), bitrateMode: 'variable' }
  return {
    codec: codecString, width, height, framerate: fps, ...rate,
    hardwareAcceleration, latencyMode: 'quality',
    ...(codec === 'hevc' ? { hevc: { format: 'hevc' } } : {}),
  }
}

/** Examine encoder-reported metadata, never relabel an SDR stream as HDR. */
export function assertHdrDecoderConfig(config: VideoDecoderConfig, codec: Mp4Codec): void {
  const c = config.colorSpace
  if (!hasHdrColorSpace(c)) {
    throw new Error(t('video.hdr.colorSpaceUnconfirmed'))
  }
  const parts = config.codec.split('.')
  const description = config.description
  const bytes = description ? (ArrayBuffer.isView(description)
    ? new Uint8Array(description.buffer, description.byteOffset, description.byteLength)
    : new Uint8Array(description)) : undefined
  let tenBit = false
  if (codec === 'hevc') {
    // HEVCDecoderConfigurationRecord: bitDepthLuma/ChromaMinus8.
    tenBit = /^(hvc1|hev1)\.2\./.test(config.codec) && !!bytes && bytes.length >= 23
      && (bytes[17] & 7) === 2 && (bytes[18] & 7) === 2
  } else if (codec === 'av1') {
    tenBit = parts[0] === 'av01' && parts[3] === '10'
    if (bytes) tenBit &&= bytes.length >= 4 && (bytes[2] & 0x60) === 0x40
  } else if (codec === 'vp9') tenBit = parts[0] === 'vp09' && parts[1] === '02' && parts[3] === '10'
  if (!tenBit) throw new Error(t('video.hdr.tenBitUnconfirmed'))
}

export function hdrInputFrame(data: Uint16Array, width: number, height: number, timestamp: number, duration: number): VideoFrame {
  // TypeScript's DOM enum predates the HDR WebCodecs enums; runtime is probed.
  return new VideoFrame(data, { format: 'I420P10', codedWidth: width, codedHeight: height,
    timestamp, duration, colorSpace: HDR_VIDEO_COLOR_SPACE } as unknown as VideoFrameBufferInit)
}

/** Configuration probe used by the panel; actual frame encoding is checked at start. */
export async function supportsHdrEncoder(spec: HdrEncoderSpec, preference: EncoderPreference): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return false
  const config = hdrEncoderConfig(spec,preference)
  const frame = hdrInputFrame(new Uint16Array([64,64,64,64,512,512]),2,2,0,1)
  try {
    if (String(frame.format) !== 'I420P10') return false
    return !!(await VideoEncoder.isConfigSupported(config)).supported
  } finally { frame.close() }
}
