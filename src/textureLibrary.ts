import coloredTilesUrl from './assets/colored_tiles.webp';
import goldUrl from './assets/gold.jpg';
import zelligeUrl from './assets/zellige.webp';
import bronzeUrl from './assets/bronze.webp';
import mercureUrl from './assets/mercure.webp';
import honeyUrl from './assets/honey.webp';
import waterUrl from './assets/water.png';
import woodUrl from './assets/wood.png';
import marbleUrl from './assets/marble.png';
import satinUrl from './assets/satin.png';
import dentelleUrl from './assets/dentelle.png';
import bismuteUrl from './assets/bismute.png';
import graniteUrl from './assets/granite.png';
import lavaUrl from './assets/lava.png';
import skyboxUrl from './assets/skybox.png';
import type {TextureMetadata} from './textureStore';
import {
  getAllTextureEntries,
  getTextureBlob,
  migrateFromLocalStorage,
  saveTextureEntry,
} from './textureStore';

export const TEXTURE_SELECTED_KEY = 'mandelbrot_selected_texture';
export const SKYBOX_SELECTED_KEY = 'mandelbrot_selected_skybox';

const BUILT_IN_TEXTURES: ReadonlyArray<{ name: string; url: string }> = [
  { name: 'Colored Tiles', url: coloredTilesUrl },
  { name: 'Gold', url: goldUrl },
  { name: 'Zellige', url: zelligeUrl },
  { name: 'Bronze', url: bronzeUrl },
  { name: 'Mercure', url: mercureUrl },
  { name: 'Honey', url: honeyUrl },
  { name: 'Water', url: waterUrl },
  { name: 'Wood', url: woodUrl },
  { name: 'Marble', url: marbleUrl },
  { name: 'Satin', url: satinUrl },
  { name: 'Dentelle', url: dentelleUrl },
  { name: 'Bismute', url: bismuteUrl },
  { name: 'Granite', url: graniteUrl },
  { name: 'Lava', url: lavaUrl },
  { name: 'Skybox', url: skyboxUrl },
] as const;

export const BUILT_IN_TEXTURE_NAMES: ReadonlySet<string> = new Set(BUILT_IN_TEXTURES.map(t => t.name));

export function generateThumbnailFromUrl(url: string, maxWidth = 256): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(''); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

async function ensureDefaultTexture(name: string, assetUrl: string): Promise<void> {
  const existing = await getTextureBlob(name);
  if (existing) return;
  const blob = await fetch(assetUrl).then(response => response.blob());
  const thumbUrl = URL.createObjectURL(blob);
  const thumbnail = await generateThumbnailFromUrl(thumbUrl);
  URL.revokeObjectURL(thumbUrl);
  await saveTextureEntry(name, blob, thumbnail);
}

export async function ensureTextureLibrary(): Promise<TextureMetadata[]> {
  await migrateFromLocalStorage();
  await Promise.all(BUILT_IN_TEXTURES.map(texture => ensureDefaultTexture(texture.name, texture.url)));
  return getAllTextureEntries();
}

export function textureSourceKey(name: string, textures: TextureMetadata[]): string {
  const texture = textures.find(entry => entry.name === name);
  return `${name}:${texture?.date ?? ''}`;
}

export async function storedTextureObjectUrl(name: string): Promise<string | null> {
  const blob = await getTextureBlob(name);
  return blob ? URL.createObjectURL(blob) : null;
}
