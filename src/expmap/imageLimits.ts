import { t } from '../i18n'
export const MAX_TILE_BYTES = 128 * 1024 * 1024
export const MAX_IMAGE_BYTES = MAX_TILE_BYTES + 1024 * 1024
export const WEBP_MAX_DIMENSION = 16383
export function validateTileDimensions(width: number, height: number) {
  if (![width,height].every(v => Number.isInteger(v) && v > 0 && v <= WEBP_MAX_DIMENSION) || width*height*4 > MAX_TILE_BYTES)
    throw new Error(t('expmap.imageLimits.tile'))
}
