import { halfToFloat, linearSrgbToRec2020, pqEncode } from './hdrPng'
import type { Mp4Codec, EncoderPreference } from './videoEncoderSink'

export type VideoDynamicRange = 'sdr' | 'hdr'
export const HDR_VIDEO_COLOR_SPACE = {
  primaries: 'bt2020', transfer: 'pq', matrix: 'bt2020-ncl', fullRange: false,
} as const

export function hasHdrColorSpace(c: { primaries?: string | null; transfer?: string | null; matrix?: string | null; fullRange?: boolean | null } | undefined): boolean {
  return c?.primaries === 'bt2020' && c.transfer === 'pq' && c.matrix === 'bt2020-ncl' && c.fullRange === false
}
export type HdrEncoderSpec = { codec: Mp4Codec; width: number; height: number; fps?: number }

export function hdrEncoderConfig(spec: HdrEncoderSpec, hardwareAcceleration: EncoderPreference): VideoEncoderConfig {
  const { width, height, codec } = spec, fps = spec.fps ?? 30
  if (codec === 'avc') throw new Error('Le H.264 proposé est SDR. Choisir HEVC, AV1 ou VP9 pour le HDR 10 bits.')
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n % 2 === 0) || !Number.isFinite(fps) || fps <= 0 || fps > 60) throw new Error('Le HDR exige des dimensions paires et une cadence entre 1 et 60 images/s.')
  const large = width * height > 3840 * 2160, small = width * height <= 1920 * 1080
  const codecString = codec === 'hevc' ? `hvc1.2.4.L${large ? 183 : small ? 123 : 153}.B0`
    : codec === 'av1' ? `av01.0.${large ? '17' : small ? '09' : '13'}M.10.0.110.09.16.09.0`
    : `vp09.02.${large ? '61' : small ? '41' : '51'}.10.01.09.16.09.00`
  return {
    codec: codecString, width, height, framerate: fps,
    bitrate: Math.round(Math.max(2_000_000, Math.min(120_000_000, width * height * fps * 0.16))),
    hardwareAcceleration, latencyMode: 'quality', bitrateMode: 'variable',
    ...(codec === 'hevc' ? { hevc: { format: 'hevc' } } : {}),
  }
}

/** Examine encoder-reported metadata, never relabel an SDR stream as HDR. */
export function assertHdrDecoderConfig(config: VideoDecoderConfig, codec: Mp4Codec): void {
  const c = config.colorSpace
  if (!hasHdrColorSpace(c)) {
    throw new Error('L’encodeur ne confirme pas la colorimétrie HDR Rec.2020/PQ attendue.')
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
  if (!tenBit) throw new Error('L’encodeur ne confirme pas une sortie 10 bits. Aucun repli SDR ne sera effectué.')
}

export function hdrInputFrame(data: Uint16Array, width: number, height: number, timestamp: number, duration: number): VideoFrame {
  // TypeScript's DOM enum predates the HDR WebCodecs enums; runtime is probed.
  return new VideoFrame(data, { format: 'I420P10', codedWidth: width, codedHeight: height,
    timestamp, duration, colorSpace: HDR_VIDEO_COLOR_SPACE } as unknown as VideoFrameBufferInit)
}

/** Linear float16 RGB → PQ Rec.2020 → limited-range planar 10-bit 4:2:0.
 * Chroma averages unquantized, PQ-encoded samples. Samples are little-endian,
 * right-aligned uint16 as required by I420P10 (not P010's left alignment).
 */
export async function hdrVideoPlanes(width: number, height: number, rgba: Uint16Array,
  exposure = 0, signal?: { readonly aborted: boolean }): Promise<Uint16Array> {
  if (![width,height].every(n => Number.isSafeInteger(n) && n > 0 && n % 2 === 0) || rgba.length !== width*height*4) throw new Error('Dimensions HDR vidéo invalides.')
  if (!Number.isFinite(exposure) || exposure < -16 || exposure > 16) throw new Error('Exposition HDR invalide.')
  const lumaSize = width*height, chromaSize = lumaSize/4, out = new Uint16Array(lumaSize + 2*chromaSize)
  const scale = 203 * 2 ** exposure
  const quantize = (v: number, x: number, y: number, chroma = false) => {
    const noise = (52.9829189 * ((x*0.06711056 + y*0.00583715) % 1)) % 1 - 0.5
    return Math.max(64, Math.min(chroma ? 960 : 940, Math.round((chroma ? 512 + 896*v : 64 + 876*v) + noise)))
  }
  for (let y = 0; y < height; y += 2) {
    if (y && y % 32 === 0) await new Promise(resolve => setTimeout(resolve, 0))
    if (signal?.aborted) throw new DOMException('Export annulé', 'AbortError')
    for (let x = 0; x < width; x += 2) {
      let cb = 0, cr = 0
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = ((y+dy)*width+x+dx)*4
        const red = halfToFloat(rgba[i]), green = halfToFloat(rgba[i+1]), blue = halfToFloat(rgba[i+2])
        if (![red,green,blue].every(Number.isFinite)) throw new Error('Valeur HDR vidéo non finie.')
        const rgb = linearSrgbToRec2020(red,green,blue)
        for (let c = 0; c < 3; c++) {
          const nits = Math.max(0,rgb[c])*scale
          if (!Number.isFinite(nits) || nits > 10000) throw new Error('Hautes lumières hors plage HDR PQ (10 000 nits). Réduire l’exposition ou les reflets.')
          rgb[c] = pqEncode(nits)
        }
        // Difference form keeps exactly neutral RGB neutral despite rounding.
        const luma = rgb[1] + .2627*(rgb[0]-rgb[1]) + .0593*(rgb[2]-rgb[1])
        out[(y+dy)*width+x+dx] = quantize(luma,x+dx,y+dy)
        cb += (rgb[2]-luma)/(2*(1-.0593)); cr += (rgb[0]-luma)/(2*(1-.2627))
      }
      const c = (y/2)*(width/2)+x/2
      out[lumaSize+c] = quantize(cb/4,x,y,true)
      out[lumaSize+chromaSize+c] = quantize(cr/4,x+1,y,true)
    }
  }
  return out
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
