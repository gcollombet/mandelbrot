import type {TextureMetadata} from './textureStore';
import {
  getAllTextureEntries,
  getTextureBlob,
  getTextureMetadataByName,
} from './textureStore';
import {ensurePersonalTextureCached} from './personalTextureSync';

export const TEXTURE_SELECTED_KEY = 'mandelbrot_selected_texture';
export const SKYBOX_SELECTED_KEY = 'mandelbrot_selected_skybox';

export const BUILT_IN_TEXTURES: ReadonlyArray<{ guid: string; name: string; url: string; thumbnailUrl: string }> = [];

export const BUILT_IN_TEXTURE_NAMES: ReadonlySet<string> = new Set<string>();

export const DEFAULT_TILE_TEXTURE_NAME = 'Gold';
export const DEFAULT_SKYBOX_TEXTURE_NAME = 'Window';

export function getDefaultTileTextureUrl(): string | null {
  return null;
}

export function getDefaultSkyboxTextureUrl(): string | null {
  return null;
}

export async function ensureTextureLibrary(): Promise<TextureMetadata[]> {
  const storedTextures = await getAllTextureEntries();
  const customTextures = storedTextures.filter(texture => !BUILT_IN_TEXTURE_NAMES.has(texture.name));
  const builtIns = BUILT_IN_TEXTURES.map(texture => {
    const stored = storedTextures.find(t => t.guid === texture.guid || t.name === texture.name);
    return {
      guid: texture.guid,
      name: texture.name,
      thumbnail: texture.thumbnailUrl,
      date: 'built-in',
      favorite: stored?.favorite ?? false,
      remote: stored?.remote,
    };
  });
  return [...builtIns, ...customTextures];
}

export function textureSourceKey(name: string, textures: TextureMetadata[]): string {
  const texture = textures.find(entry => entry.name === name);
  return `${name}:${texture?.date ?? ''}`;
}

export async function storedTextureObjectUrl(name: string): Promise<string | null> {
  const builtInTexture = BUILT_IN_TEXTURES.find(texture => texture.name === name);
  if (builtInTexture) return builtInTexture.url;
  let blob = await getTextureBlob(name);
  if (!blob) {
    const metadata = await getTextureMetadataByName(name);
    if (metadata?.origin === 'personal' && metadata.storagePath) {
      blob = await ensurePersonalTextureCached(metadata);
    }
  }
  return blob ? URL.createObjectURL(blob) : null;
}
