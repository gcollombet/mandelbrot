import { AppendOnlyStreamTarget, BufferTarget, EncodedPacket, EncodedVideoPacketSource, Mp4OutputFormat, Output } from 'mediabunny'
import { assertHdrDecoderConfig, hdrEncoderConfig, hdrInputFrame, hasHdrColorSpace } from './hdrVideo'
import type { EncoderPreference, VideoEncodeSettings, VideoEncoderSink } from './videoEncoderSink'

/** Encode a real 10-bit input before rendering frames or opening the muxer. */
async function verifyEncoder(settings: VideoEncodeSettings, preference: EncoderPreference): Promise<VideoEncoderConfig> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') throw new Error('WebCodecs requis pour la vidéo HDR.')
  const config = hdrEncoderConfig(settings, preference)
  if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error('Profil 10 bits refusé.')
  let failure: unknown, received = false
  const encoder = new VideoEncoder({ error: error => { failure = error }, output: (_chunk, meta) => {
    try {
      if (!meta.decoderConfig) throw new Error('Métadonnées de sortie HDR absentes.')
      assertHdrDecoderConfig(meta.decoderConfig, settings.codec); received = true
    } catch (error) { failure = error }
  } })
  try {
    encoder.configure(config)
    const n = settings.width*settings.height, planes = new Uint16Array(n*3/2)
    // A neutral signal above SDR white exercises the same input format as the film.
    planes.fill(750,0,n); planes.fill(512,n)
    const frame = hdrInputFrame(planes,settings.width,settings.height,0,Math.round(1e6/settings.fps))
    try { encoder.encode(frame,{keyFrame:true}) } finally { frame.close() }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([encoder.flush(), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('L’encodeur HDR ne répond pas.')), 15_000)
      })])
    } finally { clearTimeout(timer) }
    if (failure) throw failure
    if (!received) throw new Error('L’encodeur HDR n’a produit aucune image.')
    return config
  } finally { if (encoder.state !== 'closed') encoder.close() }
}

export async function createHdrVideoSink(settings: VideoEncodeSettings): Promise<VideoEncoderSink> {
  const first = settings.hardwareAcceleration ?? 'prefer-hardware'
  const preferences: EncoderPreference[] = first === 'prefer-hardware' ? [first,'no-preference'] : [first]
  let config: VideoEncoderConfig | undefined
  const errors: string[] = []
  for (const preference of preferences) {
    try { config = await verifyEncoder(settings,preference); break }
    catch (error) { errors.push(`${preference} : ${error instanceof Error ? error.message : String(error)}`) }
  }
  if (!config) throw new Error(`Encodage HDR 10 bits ${settings.codec.toUpperCase()} indisponible : ${errors.join(' ; ')}`)
  const streaming = settings.destination.kind === 'stream'
  const output = new Output({ format: new Mp4OutputFormat(streaming
    ? {fastStart:'fragmented',minimumFragmentDuration:settings.minimumFragmentSeconds ?? 1}
    : {fastStart:'in-memory'}), target: settings.destination.kind === 'stream'
      ? new AppendOnlyStreamTarget(settings.destination.writable) : new BufferTarget() })
  const source = new EncodedVideoPacketSource(settings.codec)
  output.addVideoTrack(source,{frameRate:settings.fps})
  let frames = 0, finished = false, failure: unknown, validated = false
  let writes = Promise.resolve()
  const encoder = new VideoEncoder({ error: error => { failure = error }, output: (chunk,meta) => {
    if (failure) return
    try {
      if (meta.decoderConfig) { assertHdrDecoderConfig(meta.decoderConfig,settings.codec); validated = true }
      if (!validated) throw new Error('Métadonnées HDR manquantes au début de la vidéo.')
      const packet = EncodedPacket.fromEncodedChunk(chunk)
      writes = writes.then(async () => { if (!failure) await source.add(packet,meta) }).catch(error => { failure = error })
    } catch (error) { failure = error }
  } })
  const close = () => { if (encoder.state !== 'closed') encoder.close() }
  try { encoder.configure(config); await output.start() }
  catch (error) { close(); await output.cancel().catch(() => {}); throw error }
  const check = () => { if (failure) throw failure }
  return {
    codec: settings.codec, streaming, fileExtension:'mp4', get framesEncoded() { return frames },
    async addFrame(frame) {
      try {
        if (finished) throw new Error('L’encodeur HDR est fermé.')
        check()
        if (String(frame.format) !== 'I420P10' || !hasHdrColorSpace(frame.colorSpace)
          || frame.codedWidth !== settings.width || frame.codedHeight !== settings.height) throw new Error('Image incompatible avec la sortie HDR 10 bits.')
        encoder.encode(frame,{keyFrame:frames % Math.max(1,Math.round(settings.fps*(settings.keyFrameIntervalSeconds ?? 2))) === 0})
      } finally { frame.close() }
      // One frame in flight: bounded RAM, immediate errors, writer backpressure.
      await encoder.flush(); await writes; check(); frames++
    },
    async finalize() {
      if (finished) throw new Error('L’encodeur HDR est fermé.')
      try {
        await encoder.flush(); await writes; check(); await output.finalize(); finished = true
        if (streaming) return null
        const buffer = (output.target as BufferTarget).buffer
        if (!buffer) throw new Error('Aucune vidéo HDR produite.')
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
