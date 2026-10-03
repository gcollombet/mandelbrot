import { AudioBufferSource, getFirstEncodableAudioCodec, QUALITY_MEDIUM, type Output } from 'mediabunny'

// ── Audio track for an exported film ──
// A studio parcours cut to music carries its track into the MP4: the decoded
// AudioBuffer is trimmed to the film's length and encoded by the muxer (AAC
// where the browser can, Opus otherwise). The track is attached before the
// output starts and fed right after, so encoding overlaps the frame renders.

export type AttachedAudioTrack = {
  codec: string
  /** Encode the whole buffer into the output. Call once after `output.start()`. */
  feed(): Promise<void>
}

export async function attachAudioTrack(output: Output, audio: AudioBuffer | undefined): Promise<AttachedAudioTrack | null> {
  if (!audio || audio.length === 0) return null
  const codec = await getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate })
  if (!codec) return null
  const source = new AudioBufferSource({ codec, quality: QUALITY_MEDIUM })
  output.addAudioTrack(source)
  return { codec, feed: () => source.add(audio) }
}

/** The first `seconds` of a buffer (or all of it when shorter), as a new buffer. */
export function trimAudioBuffer(buffer: AudioBuffer, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.min(buffer.length, Math.round(seconds * buffer.sampleRate)))
  if (length === buffer.length) return buffer
  const out = new AudioBuffer({ numberOfChannels: buffer.numberOfChannels, length, sampleRate: buffer.sampleRate })
  const scratch = new Float32Array(length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    buffer.copyFromChannel(scratch, c, 0)
    out.copyToChannel(scratch, c, 0)
  }
  return out
}
