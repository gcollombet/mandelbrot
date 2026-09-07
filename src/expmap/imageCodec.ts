/** Browser image codecs; no JavaScript pixel codec. */
import { validateTileDimensions, MAX_IMAGE_BYTES } from './imageLimits'
export { MAX_TILE_BYTES, MAX_IMAGE_BYTES, WEBP_MAX_DIMENSION, validateTileDimensions } from './imageLimits'
export async function decodeImageTile(bytes: Uint8Array, width: number, height: number): Promise<ImageBitmap> {
  validateTileDimensions(width,height)
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Invalid encoded image size')
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/webp'}), {premultiplyAlpha:'none',colorSpaceConversion:'default'})
  if(bitmap.width!==width || bitmap.height!==height) { bitmap.close(); throw new Error('Dimensions WebP incompatibles avec le document') }
  return bitmap
}
export type EncodedTile = { bytes: Uint8Array; thumbnail: string; milliseconds: number }
/** Exactly one transferred tile is owned by this worker at a time. */
export class ExpmapImageEncoder {
  private worker = new Worker(new URL('./imageEncoder.worker.ts', import.meta.url), {type:'module'})
  private reject?: (error: unknown) => void
  encode(rgba: Uint8Array, width: number, height: number, quality: number, thumbnail=false): Promise<EncodedTile> {
    validateTileDimensions(width,height)
    if(this.reject) throw new Error('Encodeur déjà occupé')
    return new Promise((resolve,reject) => {
      this.reject=reject
      this.worker.onmessage=({data}) => {
        this.reject=undefined
        if(data.error) reject(new Error(data.error)); else resolve(data)
      }
      this.worker.onerror=event => { this.reject=undefined; reject(new Error(event.message)) }
      this.worker.postMessage({rgba,width,height,quality,thumbnail},[rgba.buffer as ArrayBuffer])
    })
  }
  async probe() { const result=await this.encode(new Uint8Array([0,12,127,255]),1,1,0.9);(await decodeImageTile(result.bytes,1,1)).close() }
  dispose() { this.worker.terminate(); this.reject?.(new DOMException('Encodeur fermé','AbortError')); this.reject=undefined }
}
