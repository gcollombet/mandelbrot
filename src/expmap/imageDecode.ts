import { validateTileDimensions, MAX_IMAGE_BYTES } from './imageLimits'
export async function decodeImageTile(bytes: Uint8Array, width: number, height: number): Promise<ImageBitmap> {
  validateTileDimensions(width,height)
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Invalid encoded image size')
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/webp'}), {premultiplyAlpha:'none',colorSpaceConversion:'default'})
  if(bitmap.width!==width || bitmap.height!==height) { bitmap.close(); throw new Error('Dimensions WebP incompatibles avec le document') }
  return bitmap
}
