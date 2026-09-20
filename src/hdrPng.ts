/** PNG 3: full-range Rec.2020 / ST 2084 (PQ), 16-bit RGB.
 * CompressionStream provides native zlib; color conversion and PNG framing
 * are explicit because canvas.toBlob clips extended-range canvas samples.
 */
export function halfToFloat(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1
  const exponent = (bits >> 10) & 31, fraction = bits & 1023
  if (exponent === 31) return fraction ? NaN : sign * Infinity
  return sign * (exponent ? (1 + fraction / 1024) * 2 ** (exponent - 15) : fraction * 2 ** -24)
}

export function pqEncode(nits: number): number {
  const p = (Math.max(0, Math.min(10000, nits)) / 10000) ** (2610 / 16384)
  return ((3424 / 4096 + (2413 / 128) * p) / (1 + (2392 / 128) * p)) ** (2523 / 32)
}

export function linearSrgbToRec2020(r: number, g: number, b: number): [number, number, number] {
  return [0.6274039*r + 0.3292830*g + 0.0433131*b,
    0.0690973*r + 0.9195404*g + 0.0113623*b,
    0.0163914*r + 0.0880133*g + 0.8955953*b]
}

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i
  for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function chunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.length + 12), view = new DataView(bytes.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) bytes[4+i] = type.charCodeAt(i)
  bytes.set(data, 8)
  let crc = 0xffffffff
  for (let i = 4; i < bytes.length - 4; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8)
  view.setUint32(bytes.length - 4, (crc ^ 0xffffffff) >>> 0)
  return bytes
}

/** Reject overflow instead of silently throwing away highlights. No 8-bit step. */
export async function encodeHdrPng(width: number, height: number, rgbaHalf: Uint16Array, options: { exposure?: number; signal?: AbortSignal } = {}): Promise<Blob> {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || rgbaHalf.length !== width * height * 4) throw new Error('Dimensions HDR invalides.')
  const exposure = options.exposure ?? 0
  if (!Number.isFinite(exposure) || exposure < -16 || exposure > 16) throw new Error('Exposition HDR invalide.')
  const luminanceScale = 203 * 2 ** exposure
  let row = 0
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    async pull(controller) {
      // Let input/cancellation run during large exports, not only microtasks.
      if (row && row % 16 === 0) await new Promise(resolve => setTimeout(resolve, 0))
      if (options.signal?.aborted) { controller.error(new DOMException('Capture annulée', 'AbortError')); return }
      if (row === height) { controller.close(); return }
      const bytes = new Uint8Array(1 + width * 6), view = new DataView(bytes.buffer)
      // Filter 0, RGB in network byte order. One scanline at a time.
      for (let x = 0; x < width; x++) {
        const i = (row * width + x) * 4
        const rgb = linearSrgbToRec2020(halfToFloat(rgbaHalf[i]), halfToFloat(rgbaHalf[i+1]), halfToFloat(rgbaHalf[i+2]))
        for (let c = 0; c < 3; c++) {
          const nits = Math.max(0, rgb[c]) * luminanceScale
          if (!Number.isFinite(nits) || nits > 10000) {
            controller.error(new Error('La luminance dépasse la plage PQ (10 000 nits) ou contient une valeur invalide. Réduire l’exposition HDR ou l’intensité des reflets.'))
            return
          }
          // Half an LSB at the FINAL 16-bit PQ quantization, not in linear light.
          const seed = (x * 0.06711056 + row * 0.00583715) % 1
          const dither = (52.9829189 * seed) % 1 - 0.5
          const code = Math.max(0, Math.min(65535, Math.round(pqEncode(nits) * 65535 + dither)))
          view.setUint16(1 + (x * 3 + c) * 2, code)
        }
      }
      row++
      controller.enqueue(bytes)
    },
  })
  const reader = stream.pipeThrough(new CompressionStream('deflate')).getReader()
  const header = new Uint8Array(13), hv = new DataView(header.buffer)
  hv.setUint32(0, width); hv.setUint32(4, height); header[8] = 16; header[9] = 2
  const parts: BlobPart[] = [new Uint8Array([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('cICP', new Uint8Array([9,16,0,1]))]
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      parts.push(chunk('IDAT', value))
    }
  } finally { reader.releaseLock() }
  parts.push(chunk('IEND', new Uint8Array()))
  return new Blob(parts, { type: 'image/png' })
}
