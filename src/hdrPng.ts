import { t } from './i18n'
import { pngChunk as chunk } from './imageProvenance'
/** Package GPU-converted, big-endian RGB16 PQ samples; no color math on the CPU. */
export async function encodeHdrPng(width: number, height: number, rgbPq: Uint16Array, options: { signal?: AbortSignal } = {}): Promise<Blob> {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || rgbPq.length !== width * height * 3) throw new Error(t('video.hdr.dimensionsInvalid'))
  const pixels = new Uint8Array(rgbPq.buffer, rgbPq.byteOffset, rgbPq.byteLength)
  let row = 0
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    async pull(controller) {
      // Let input/cancellation run during large exports, not only microtasks.
      if (row && row % 16 === 0) await new Promise(resolve => setTimeout(resolve, 0))
      if (options.signal?.aborted) { controller.error(new DOMException(t('video.still.cancelled'), 'AbortError')); return }
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
