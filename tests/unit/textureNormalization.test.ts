import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  MAX_IMPORTED_TEXTURE_SIDE,
  normalizeTextureBlob,
  normalizeTextureDimensions,
} from '../../src/textureNormalization';

describe('textureNormalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caps landscape textures without changing aspect ratio', () => {
    expect(normalizeTextureDimensions(4096, 1024)).toEqual({width: 2048, height: 512});
  });

  it('caps portrait textures without changing aspect ratio', () => {
    expect(normalizeTextureDimensions(1000, 3000)).toEqual({width: 683, height: 2048});
  });

  it('does not upscale textures already within the limit', () => {
    expect(normalizeTextureDimensions(512, 256)).toEqual({width: 512, height: 256});
  });

  it('encodes the resized image as WebP', async () => {
    const close = vi.fn();
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback, type?: string) => {
      callback(new Blob(['webp'], {type}));
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({drawImage})),
      toBlob,
    };

    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 4096,
      height: 1024,
      close,
    })));
    vi.stubGlobal('document', {
      createElement: vi.fn(() => canvas),
    });

    const result = await normalizeTextureBlob(new Blob(['source'], {type: 'image/png'}));

    expect(result.blob.type).toBe('image/webp');
    expect(result.width).toBe(MAX_IMPORTED_TEXTURE_SIDE);
    expect(result.height).toBe(512);
    expect(result.originalWidth).toBe(4096);
    expect(result.originalHeight).toBe(1024);
    expect(canvas.width).toBe(2048);
    expect(canvas.height).toBe(512);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 512);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', expect.any(Number));
    expect(close).toHaveBeenCalled();
  });

  it('rejects when WebP encoding is unavailable', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 128,
      height: 128,
      close: vi.fn(),
    })));
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({drawImage: vi.fn()})),
        toBlob: vi.fn((callback: BlobCallback) => callback(null)),
      })),
    });

    await expect(normalizeTextureBlob(new Blob(['source'], {type: 'image/png'}))).rejects.toThrow('WebP encoding');
  });
});
