export const MAX_IMPORTED_TEXTURE_SIDE = 2048;
export const IMPORTED_TEXTURE_WEBP_QUALITY = 0.92;

export interface TextureDimensions {
  width: number;
  height: number;
}

export interface NormalizedTextureBlob {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export function normalizeTextureDimensions(
  width: number,
  height: number,
  maxSide = MAX_IMPORTED_TEXTURE_SIDE,
): TextureDimensions {
  if (width <= 0 || height <= 0 || maxSide <= 0) {
    throw new Error('Texture dimensions must be positive.');
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

export async function normalizeTextureBlob(
  source: Blob,
  maxSide = MAX_IMPORTED_TEXTURE_SIDE,
  quality = IMPORTED_TEXTURE_WEBP_QUALITY,
): Promise<NormalizedTextureBlob> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(source, {imageOrientation: 'from-image'});
    const dimensions = normalizeTextureDimensions(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');
    ctx.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    const blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      throw new Error('WebP encoding is unavailable.');
    }
    return {
      blob,
      width: dimensions.width,
      height: dimensions.height,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
    };
  } finally {
    bitmap?.close();
  }
}
