import { videoBitrate, rateControlledCodec, type VideoEncoding } from './videoEncoding'
import { supportsHdrEncoder, type VideoDynamicRange } from './hdrVideo'
import { t } from './i18n'
// ── Encoding sink for video export ──
// Wraps mediabunny's muxer behind the frame sink the export loop expects, so
// videoExportSession.ts stays free of encoder concerns and remains testable
// without browser media APIs.
//
// The container is always MP4: it is what every editor, phone and player opens
// without thought. Only the codec is a choice, because that is where the real
// trade-off lives — AV1 for compression, H.264 for compatibility.

import {
  AppendOnlyStreamTarget,
  BufferTarget,
  Mp4OutputFormat,
  Output,
  Quality,
  VideoSample,
  VideoSampleSource,
  canEncodeVideo,
  type VideoCodec,
} from 'mediabunny'

export const VIDEO_MIME_TYPE = 'video/mp4'
export const VIDEO_FILE_EXTENSION = 'mp4'

/** Codecs an MP4 container accepts, in the order the UI offers them. */
export const MP4_CODECS = [
  { value: 'av1', label: 'AV1 — meilleure compression', labelKey: 'video.encoder.codecs.av1' },
  { value: 'avc', label: 'H.264 / AVC — lecture universelle', labelKey: 'video.encoder.codecs.avc' },
  { value: 'hevc', label: 'HEVC / H.265', labelKey: 'video.encoder.codecs.hevc' },
  { value: 'vp9', label: 'VP9', labelKey: 'video.encoder.codecs.vp9' },
] as const satisfies readonly { value: VideoCodec; label: string; labelKey: string }[]

export type Mp4Codec = (typeof MP4_CODECS)[number]['value']

export const DEFAULT_VIDEO_CODEC: Mp4Codec = 'hevc'

export function isMp4Codec(value: unknown): value is Mp4Codec {
  return MP4_CODECS.some(c => c.value === value)
}

/**
 * Where the encoded bytes go.
 *
 * `stream` writes them out as they are produced — nothing accumulates, so a long
 * export cannot exhaust memory, and the partial file on disk stays playable if
 * the run is interrupted. `buffer` keeps the whole file in memory and hands back
 * a Blob; it is the fallback for browsers without the File System Access API,
 * and it is what fails with "array buffer allocation failed" on long renders.
 */
export type VideoDestination =
  | { kind: 'stream'; writable: WritableStream<Uint8Array> }
  | { kind: 'buffer' }

export type VideoEncodeSettings = {
  dynamicRange?: VideoDynamicRange
  width: number
  height: number
  fps: number
  codec: Mp4Codec
  destination: VideoDestination
  encoding?: VideoEncoding
  quality?: Quality
  /** HDR only: constant-quality quantizer index (VP9/AV1 0–63, HEVC 0–51).
   *  Used only for the advanced HDR quantizer profile (or legacy callers). */
  hdrQuantizer?: number
  hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software'
  /** Seconds between key frames. Frequent keyframes ease seeking, cost size. */
  keyFrameIntervalSeconds?: number
  /** Minimum fragment length when streaming. Shorter = less lost on an abort. */
  minimumFragmentSeconds?: number
}

export type VideoEncoderSink = {
  /**
   * Encode one frame. Takes ownership of the VideoFrame and closes it.
   *
   * Awaiting the returned promise is what applies encoder backpressure — an
   * export produces frames far slower than realtime, but a cheap stretch of
   * parcours can still outrun the encoder and grow an unbounded queue.
   */
  addFrame(frame: VideoFrame): Promise<void>
  /**
   * Flush and close the file. Returns a Blob when buffering in memory, and null
   * when streaming — the bytes are already on disk.
   *
   * Safe to call after an interruption: with fragmented MP4 everything written
   * so far is a complete, playable file.
   */
  finalize(): Promise<Blob | null>
  /** Abandon the encode and release resources. */
  cancel(): Promise<void>
  readonly streaming: boolean
  readonly codec: Mp4Codec
  readonly fileExtension: string
  readonly framesEncoded: number
  /** Effective constant-quality quantizer, undefined when variable bitrate was used. */
  readonly quantizer?: number
}

export type EncoderPreference = NonNullable<VideoEncodeSettings['hardwareAcceleration']>
type EncoderProbeSettings = Pick<VideoEncodeSettings, 'width' | 'height' | 'codec' | 'quality' | 'hardwareAcceleration' | 'dynamicRange' | 'encoding' | 'hdrQuantizer'> & { fps?: number }

/** Prefer hardware, then allow the browser to choose another implementation. */
export async function selectVideoEncoder(settings: EncoderProbeSettings): Promise<EncoderPreference> {
  if (!isMp4Codec(settings.codec)) throw new Error(t('video.encoder.unknownCodec', { codec: String(settings.codec) }))
  const first = settings.hardwareAcceleration ?? 'prefer-hardware'
  const preferences: EncoderPreference[] = first === 'prefer-hardware' ? [first, 'no-preference'] : [first]
  const failures: string[] = []
  for (const hardwareAcceleration of preferences) {
    try {
      // Mediabunny forwards framerate at runtime, but omits it from the probe's public type.
      const options = {
        width: settings.width, height: settings.height, framerate: settings.fps,
        fullCodecString: settings.quality ? undefined : rateControlledCodec(settings.codec, settings.width, settings.height, videoBitrate(settings.codec, settings.width, settings.height, settings.fps ?? 30, settings.encoding)),
        quality: settings.quality ?? new Quality({ bitrate: videoBitrate(settings.codec, settings.width, settings.height, settings.fps ?? 30, settings.encoding), bitrateMode: 'constant' }), hardwareAcceleration,
      }
      if (settings.dynamicRange === 'hdr'
        ? await supportsHdrEncoder({ ...settings, encoding: settings.encoding ?? { profile: 'high', bitrateMbps: 100 }, quantizer: settings.hdrQuantizer }, hardwareAcceleration)
        : await canEncodeVideo(settings.codec, options)) return hardwareAcceleration
      failures.push(t('video.encoder.configRefused', { preference: hardwareAcceleration }))
    } catch (error) {
      failures.push(t('video.encoder.attemptFailed', { preference: hardwareAcceleration, error: error instanceof Error ? error.message : String(error) }))
    }
  }
  const rateHint = settings.encoding?.profile === 'quantizer' || settings.quality ? '' : ' ' + t('video.encoding.refused', { bitrate: videoBitrate(settings.codec, settings.width, settings.height, settings.fps ?? 30, settings.encoding) / 1e6 })
  throw new Error(t('video.encoder.unavailable', {
    codec: settings.codec.toUpperCase(), width: settings.width, height: settings.height,
    fps: settings.fps === undefined ? '' : t('video.encoder.atFps', { fps: settings.fps }),
    evenHint: settings.codec === 'avc' && (settings.width % 2 || settings.height % 2) ? t('video.encoder.avcEvenDimensions') : '',
    failures: failures.join(' ; '),
  }) + rateHint)
}

/** The same selection policy is used by the UI, preflight, and actual encoder. */
export async function probeMp4Codecs(
  width: number,
  height: number,
  fps?: number,
  onSelected?: (codec: Mp4Codec, preference: EncoderPreference) => void,
  dynamicRange: VideoDynamicRange = 'sdr',
  encoding?: VideoEncoding,
  hdrQuantizer?: number,
): Promise<Record<Mp4Codec, boolean>> {
  const entries = await Promise.all(MP4_CODECS.map(async ({ value }) => {
    try {
      const preference = await selectVideoEncoder({ codec: value, width, height, fps, dynamicRange, encoding, hdrQuantizer })
      onSelected?.(value, preference)
      return [value, true] as const
    } catch { return [value, false] as const }
  }))
  return Object.fromEntries(entries) as Record<Mp4Codec, boolean>
}

export async function createVideoSink(settings: VideoEncodeSettings): Promise<VideoEncoderSink> {
  if (settings.dynamicRange === 'hdr') {
    const { createHdrVideoSink } = await import('./hdrVideoSink')
    return createHdrVideoSink(settings)
  }
  const codec = settings.codec
  const hardwareAcceleration = await selectVideoEncoder(settings)

  const streaming = settings.destination.kind === 'stream'

  // Streaming demands a monotonic writer, and fragmented MP4 is the format that
  // provides it: each fragment is self-contained, so a file cut short mid-render
  // still plays up to its last complete fragment. Buffered output keeps
  // `in-memory`, which puts the index at the head for instant seeking — a
  // luxury only affordable when the whole file is in memory anyway.
  const format = streaming
    ? new Mp4OutputFormat({
        fastStart: 'fragmented',
        minimumFragmentDuration: settings.minimumFragmentSeconds ?? 1,
      })
    : new Mp4OutputFormat({ fastStart: 'in-memory' })

  const output = new Output({
    format,
    target: settings.destination.kind === 'stream'
      ? new AppendOnlyStreamTarget(settings.destination.writable)
      : new BufferTarget(),
  })

  const source = new VideoSampleSource({
    codec,
    fullCodecString: settings.quality ? undefined : rateControlledCodec(codec, settings.width, settings.height, videoBitrate(codec, settings.width, settings.height, settings.fps, settings.encoding)),
    quality: settings.quality ?? new Quality({ bitrate: videoBitrate(settings.codec, settings.width, settings.height, settings.fps ?? 30, settings.encoding), bitrateMode: 'constant' }),
    hardwareAcceleration,
    latencyMode: 'quality',
    keyFrameInterval: settings.keyFrameIntervalSeconds ?? 2,
    // Every frame comes from the same fixed-size capture target; a size change
    // would mean the capture chain was reallocated mid-export, which should
    // fail loudly rather than be silently stretched.
    sizeChangeBehavior: 'deny',
  })

  output.addVideoTrack(source, { frameRate: settings.fps })
  await output.start()

  let framesEncoded = 0
  let finished = false

  return {
    get codec() { return codec },
    get streaming() { return streaming },
    get fileExtension() { return VIDEO_FILE_EXTENSION },
    get framesEncoded() { return framesEncoded },

    async addFrame(frame: VideoFrame) {
      if (finished) {
        frame.close()
        throw new Error(t('video.encoder.sinkClosed'))
      }
      // The frame already carries the presentation timestamp and duration set
      // by the capture — derived from the frame INDEX, not from the parcours
      // time. The two differ: a parcours spreads its camera positions over
      // [0, duration] inclusive, while playback timestamps must stay a uniform
      // n/fps so the file plays at its nominal rate.
      const sample = new VideoSample(frame)
      try {
        await source.add(sample)
        framesEncoded++
      } finally {
        sample.close()
        frame.close()
      }
    },

    async finalize() {
      if (finished) throw new Error(t('video.encoder.sinkFinalized'))
      finished = true
      await output.finalize()
      if (streaming) return null
      const buffer = (output.target as BufferTarget).buffer
      if (!buffer) throw new Error(t('video.encoder.noOutput'))
      return new Blob([buffer], { type: VIDEO_MIME_TYPE })
    },

    async cancel() {
      if (finished) return
      finished = true
      await output.cancel()
    },
  }
}
