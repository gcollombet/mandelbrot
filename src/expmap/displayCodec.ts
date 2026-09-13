import { DISPLAY_SAMPLE_BYTES } from './displayFormat'

/** Block frame: constant fields are stored once, the remaining bytes are
 * transposed by byte plane (all first bytes, then all second bytes, …) and
 * gzipped. Measured on real sources: ≈5× against 2× for interleaved data.
 *
 *   u32 constantMaskLow, u32 constantMaskHigh (bit k = byte column k of the 48-byte sample is constant)
 *   u32 sampleCount
 *   u8[popcount(mask)] constant values, in column order
 *   gzip(byte planes of the variable columns)  — absent when all columns are constant
 */
export const FRAME_HEADER_BYTES = 12
const COLUMNS = DISPLAY_SAMPLE_BYTES

/** Column c is constant when bit (c % 32) of word (c / 32) is set. */
function constantColumns(payload:Uint8Array):[number, number] {
  const mask:[number, number] = [0, 0]
  for (let c = 0; c < COLUMNS; c++) {
    const first = payload[c]
    let constant = true
    for (let i = c + COLUMNS; i < payload.length; i += COLUMNS) if (payload[i] !== first) { constant = false; break }
    if (constant) mask[c >> 5] = (mask[c >> 5] | (1 << (c & 31))) >>> 0
  }
  return mask
}
function split(mask:[number, number]) {
  const variable:number[] = [], constants:number[] = []
  for (let c = 0; c < COLUMNS; c++) ((mask[c >> 5] >>> (c & 31)) & 1 ? constants : variable).push(c)
  return { variable, constants }
}

async function pipe(data:Uint8Array, stream:CompressionStream|DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream)).arrayBuffer())
}

export async function encodeDisplayFrame(payload:Uint8Array):Promise<Uint8Array> {
  if (payload.length % COLUMNS) throw new Error('Charge utile non alignée sur 48 octets')
  const count = payload.length / COLUMNS, mask = constantColumns(payload), { variable, constants } = split(mask)
  const planes = new Uint8Array(variable.length * count)
  for (let k = 0; k < variable.length; k++) {
    const c = variable[k], base = k * count
    for (let i = 0; i < count; i++) planes[base + i] = payload[i * COLUMNS + c]
  }
  const zipped = variable.length ? await pipe(planes, new CompressionStream('gzip')) : new Uint8Array(0)
  const frame = new Uint8Array(FRAME_HEADER_BYTES + constants.length + zipped.length), view = new DataView(frame.buffer)
  view.setUint32(0, mask[0], true); view.setUint32(4, mask[1], true); view.setUint32(8, count, true)
  constants.forEach((c, k) => { frame[FRAME_HEADER_BYTES + k] = count ? payload[c] : 0 })
  frame.set(zipped, FRAME_HEADER_BYTES + constants.length)
  return frame
}

export async function decodeDisplayFrame(frame:Uint8Array, expectedBytes:number):Promise<Uint8Array<ArrayBuffer>> {
  if (frame.length < FRAME_HEADER_BYTES) throw new Error('Trame shader tronquée')
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
  const count = view.getUint32(8, true), { variable, constants } = split([view.getUint32(0, true), view.getUint32(4, true)])
  if (count * COLUMNS !== expectedBytes) throw new Error('Taille de trame shader invalide')
  if (frame.length < FRAME_HEADER_BYTES + constants.length) throw new Error('Trame shader tronquée')
  const payload = new Uint8Array(expectedBytes)
  constants.forEach((c, k) => { const v = frame[FRAME_HEADER_BYTES + k]; if (v) for (let i = c; i < payload.length; i += COLUMNS) payload[i] = v })
  if (variable.length) {
    const planes = await pipe(frame.subarray(FRAME_HEADER_BYTES + constants.length), new DecompressionStream('gzip'))
    if (planes.length !== variable.length * count) throw new Error('Plans d’octets shader invalides')
    for (let k = 0; k < variable.length; k++) {
      const c = variable[k], base = k * count
      for (let i = 0; i < count; i++) payload[i * COLUMNS + c] = planes[base + i]
    }
  }
  return payload
}
