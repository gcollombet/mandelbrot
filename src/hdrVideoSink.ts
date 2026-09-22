import { AppendOnlyStreamTarget, BufferTarget, EncodedPacket, EncodedVideoPacketSource, Mp4OutputFormat, Output } from 'mediabunny'
import { t } from './i18n'
import { assertHdrDecoderConfig, hdrEncodeOptions, hdrEncoderConfig, hdrInputFrame, hasHdrColorSpace } from './hdrVideo'
import type { EncoderPreference, VideoEncodeSettings, VideoEncoderSink } from './videoEncoderSink'

/** Encode a real 10-bit input before rendering frames or opening the muxer. */
async function verifyEncoder(settings: VideoEncodeSettings, preference: EncoderPreference, quantizer: number | undefined): Promise<VideoEncoderConfig> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') throw new Error(t('video.hdr.webCodecsRequired'))
  const config = hdrEncoderConfig({ ...settings, quantizer }, preference)
  if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error(t(quantizer === undefined ? 'video.hdr.tenBitProfileRefused' : 'video.hdr.constantQualityRefused'))
  let failure: unknown, received = false
  const encoder = new VideoEncoder({ error: error => { failure = error }, output: (_chunk, meta) => {
    try {
      if (!meta.decoderConfig) throw new Error(t('video.hdr.outputMetadataMissing'))
      assertHdrDecoderConfig(meta.decoderConfig, settings.codec); received = true
    } catch (error) { failure = error }
  } })
  try {
    encoder.configure(config)
    const n = settings.width*settings.height, planes = new Uint16Array(n*3/2)
    // A neutral signal above SDR white exercises the same input format as the film.
    planes.fill(750,0,n); planes.fill(512,n)
    const frame = hdrInputFrame(planes,settings.width,settings.height,0,Math.round(1e6/settings.fps))
    try { encoder.encode(frame,{keyFrame:true,...hdrEncodeOptions(settings.codec,quantizer)}) } finally { frame.close() }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([encoder.flush(), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(t('video.hdr.encoderNotResponding'))), 15_000)
      })])
    } finally { clearTimeout(timer) }
    if (failure) throw failure
    if (!received) throw new Error(t('video.hdr.encoderNoFrame'))
    return config
  } finally { if (encoder.state !== 'closed') encoder.close() }
}

export async function createHdrVideoSink(settings: VideoEncodeSettings): Promise<VideoEncoderSink> {
  const first = settings.hardwareAcceleration ?? 'prefer-hardware'
  const preferences: EncoderPreference[] = first === 'prefer-hardware' ? [first,'no-preference'] : [first]
  // Constant quality first; an encoder without quantizer mode falls back to the
  // variable-bitrate estimate rather than failing the export.
  const modes = settings.hdrQuantizer === undefined ? [undefined] : [settings.hdrQuantizer, undefined]
  let config: VideoEncoderConfig | undefined, quantizer: number | undefined
  const errors: string[] = []
  search: for (const mode of modes) for (const preference of preferences) {
    try { config = await verifyEncoder(settings,preference,mode); quantizer = mode; break search }
    catch (error) { errors.push(t('video.hdr.probeFailed', { preference, mode: mode === undefined ? '' : ` Q${mode}`, error: error instanceof Error ? error.message : String(error) })) }
  }
  if (!config) throw new Error(t('video.hdr.encodingUnavailable', { codec: settings.codec.toUpperCase(), errors: errors.join(' ; ') }))
  const encodeOptions = hdrEncodeOptions(settings.codec, quantizer)
  const streaming = settings.destination.kind === 'stream'
  const output = new Output({ format: new Mp4OutputFormat(streaming
    ? {fastStart:'fragmented',minimumFragmentDuration:settings.minimumFragmentSeconds ?? 1}
    : {fastStart:'in-memory'}), target: settings.destination.kind === 'stream'
      ? new AppendOnlyStreamTarget(settings.destination.writable) : new BufferTarget() })
  const source = new EncodedVideoPacketSource(settings.codec)
  output.addVideoTrack(source,{frameRate:settings.fps})
  let frames = 0, finished = false, failure: unknown, validated = false
  let writes = Promise.resolve()
  let wakeQueue: (() => void) | undefined
  const fail = (error: unknown) => { failure = error; wakeQueue?.() }
  const encoder = new VideoEncoder({ error: fail, output: (chunk,meta) => {
    if (failure) return
    try {
      if (meta.decoderConfig) { assertHdrDecoderConfig(meta.decoderConfig,settings.codec); validated = true }
      if (!validated) throw new Error(t('video.hdr.metadataMissingAtStart'))
      const packet = EncodedPacket.fromEncodedChunk(chunk)
      writes = writes.then(async () => { if (!failure) await source.add(packet,meta) }).catch(fail)
    } catch (error) { fail(error) }
  } })
  const close = () => { if (encoder.state !== 'closed') encoder.close(); wakeQueue?.() }
  try { encoder.configure(config); await output.start() }
  catch (error) { close(); await output.cancel().catch(() => {}); throw error }
  const check = () => {
    if (failure) throw failure
    if (finished || encoder.state === 'closed') throw new Error(t('video.hdr.encoderClosed'))
  }
  const waitForCapacity = async () => {
    // encodeQueueSize counts inputs awaiting processing, not delayed output.
    // Waiting for output instead would deadlock codecs with lookahead. Never
    // flush to apply backpressure: flush drains that lookahead and hurts quality.
    while (encoder.encodeQueueSize >= 4) {
      check()
      await new Promise<void>(resolve => {
        const wake = () => {
          encoder.removeEventListener('dequeue', wake)
          wakeQueue = undefined
          resolve()
        }
        wakeQueue = wake
        encoder.addEventListener('dequeue', wake, { once: true })
      })
    }
    check()
  }
  return {
    codec: settings.codec, streaming, fileExtension:'mp4', quantizer, get framesEncoded() { return frames },
    async addFrame(frame) {
      try {
        if (finished) throw new Error(t('video.hdr.encoderClosed'))
        check()
        if (String(frame.format) !== 'I420P10' || !hasHdrColorSpace(frame.colorSpace)
          || frame.codedWidth !== settings.width || frame.codedHeight !== settings.height) throw new Error(t('video.hdr.frameIncompatible'))
        await writes; check()
        await waitForCapacity()
        encoder.encode(frame,{...encodeOptions,keyFrame:frames % Math.max(1,Math.round(settings.fps*(settings.keyFrameIntervalSeconds ?? 2))) === 0})
      } finally { frame.close() }
      // Apply writer backpressure to available packets without forcing delayed
      // frames out of the codec. Finalization is the only flush during a film.
      await writes; check(); frames++
    },
    async finalize() {
      if (finished) throw new Error(t('video.hdr.encoderClosed'))
      try {
        await encoder.flush(); await writes; check(); await output.finalize(); finished = true
        if (streaming) return null
        const buffer = (output.target as BufferTarget).buffer
        if (!buffer) throw new Error(t('video.hdr.noVideoProduced'))
        return new Blob([buffer],{type:'video/mp4'})
      } catch (error) {
        finished = true
        await output.cancel().catch(() => {})
        throw error
      } finally { close() }
    },
    async cancel() { if (finished) return; finished = true; close(); await writes; await output.cancel() },
  }
}
