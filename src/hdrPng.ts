/** Package GPU-converted PNG 3 RGB16 PQ using native zlib compression. */
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

/** Package GPU-converted, big-endian RGB16 PQ samples; no color math on the CPU. */
export async function encodeHdrPng(width: number, height: number, rgbPq: Uint16Array, options: { signal?: AbortSignal } = {}): Promise<Blob> {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || rgbPq.length !== width * height * 3) throw new Error('Dimensions HDR invalides.')
  const pixels = new Uint8Array(rgbPq.buffer, rgbPq.byteOffset, rgbPq.byteLength)
  let row = 0
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    async pull(controller) {
      // Let input/cancellation run during large exports, not only microtasks.
      if (row && row % 16 === 0) await new Promise(resolve => setTimeout(resolve, 0))
      if (options.signal?.aborted) { controller.error(new DOMException('Capture annulée', 'AbortError')); return }
      if (row === height) { controller.close(); return }
      const bytes = new Uint8Array(1 + width * 6)
      // Filter 0 followed by the already packed scanline from the GPU.
      bytes.set(pixels.subarray(row * width * 6, (row + 1) * width * 6), 1)
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
