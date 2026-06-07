import coloredTilesUrl from './assets/colored_tiles.webp';
import goldUrl from './assets/gold.webp';
import brushedGoldUrl from './assets/brushed-gold.webp';
import zelligeUrl from './assets/zellige.webp';
import bronzeUrl from './assets/bronze.webp';
import mercureUrl from './assets/mercure.webp';
import honeyUrl from './assets/honey.webp';
import waterUrl from './assets/water.webp';
import woodUrl from './assets/wood.webp';
import marbleUrl from './assets/marble.webp';
import satinUrl from './assets/satin.webp';
import dentelleUrl from './assets/dentelle.webp';
import bismuteUrl from './assets/bismute.webp';
import graniteUrl from './assets/granite.webp';
import lavaUrl from './assets/lava.webp';
import mountainUrl from './assets/montain.webp';
import mountainLightUrl from './assets/mountain-light.webp';
import skyboxUrl from './assets/skybox.webp';
import skyboxSunsetUrl from './assets/skybox-sunset.webp';
import windowUrl from './assets/window.webp';
import coloredTilesThumbUrl from './assets/thumbs/colored_tiles.webp';
import goldThumbUrl from './assets/thumbs/gold.webp';
import brushedGoldThumbUrl from './assets/thumbs/brushed-gold.webp';
import zelligeThumbUrl from './assets/thumbs/zellige.webp';
import bronzeThumbUrl from './assets/thumbs/bronze.webp';
import mercureThumbUrl from './assets/thumbs/mercure.webp';
import honeyThumbUrl from './assets/thumbs/honey.webp';
import waterThumbUrl from './assets/thumbs/water.webp';
import woodThumbUrl from './assets/thumbs/wood.webp';
import marbleThumbUrl from './assets/thumbs/marble.webp';
import satinThumbUrl from './assets/thumbs/satin.webp';
import dentelleThumbUrl from './assets/thumbs/dentelle.webp';
import bismuteThumbUrl from './assets/thumbs/bismute.webp';
import graniteThumbUrl from './assets/thumbs/granite.webp';
import lavaThumbUrl from './assets/thumbs/lava.webp';
import mountainThumbUrl from './assets/thumbs/montain.webp';
import mountainLightThumbUrl from './assets/thumbs/mountain-light.webp';
import skyboxThumbUrl from './assets/thumbs/skybox.webp';
import skyboxSunsetThumbUrl from './assets/thumbs/skybox-sunset.webp';
import windowThumbUrl from './assets/thumbs/window.webp';
import type {TextureMetadata} from './textureStore';
import {
  getAllTextureEntries,
  getTextureBlob,
  migrateFromLocalStorage,
} from './textureStore';

export const TEXTURE_SELECTED_KEY = 'mandelbrot_selected_texture';
export const SKYBOX_SELECTED_KEY = 'mandelbrot_selected_skybox';

export const BUILT_IN_TEXTURES: ReadonlyArray<{ guid: string; name: string; url: string; thumbnailUrl: string }> = [
  { guid: 'builtin:colored-tiles', name: 'Colored Tiles', url: coloredTilesUrl, thumbnailUrl: coloredTilesThumbUrl },
  { guid: 'builtin:gold', name: 'Gold', url: goldUrl, thumbnailUrl: goldThumbUrl },
  { guid: 'builtin:brushed-gold', name: 'Brushed Gold', url: brushedGoldUrl, thumbnailUrl: brushedGoldThumbUrl },
  { guid: 'builtin:zellige', name: 'Zellige', url: zelligeUrl, thumbnailUrl: zelligeThumbUrl },
  { guid: 'builtin:bronze', name: 'Bronze', url: bronzeUrl, thumbnailUrl: bronzeThumbUrl },
  { guid: 'builtin:mercure', name: 'Mercure', url: mercureUrl, thumbnailUrl: mercureThumbUrl },
  { guid: 'builtin:honey', name: 'Honey', url: honeyUrl, thumbnailUrl: honeyThumbUrl },
  { guid: 'builtin:water', name: 'Water', url: waterUrl, thumbnailUrl: waterThumbUrl },
  { guid: 'builtin:wood', name: 'Wood', url: woodUrl, thumbnailUrl: woodThumbUrl },
  { guid: 'builtin:marble', name: 'Marble', url: marbleUrl, thumbnailUrl: marbleThumbUrl },
  { guid: 'builtin:satin', name: 'Satin', url: satinUrl, thumbnailUrl: satinThumbUrl },
  { guid: 'builtin:dentelle', name: 'Dentelle', url: dentelleUrl, thumbnailUrl: dentelleThumbUrl },
  { guid: 'builtin:bismute', name: 'Bismute', url: bismuteUrl, thumbnailUrl: bismuteThumbUrl },
  { guid: 'builtin:granite', name: 'Granite', url: graniteUrl, thumbnailUrl: graniteThumbUrl },
  { guid: 'builtin:lava', name: 'Lava', url: lavaUrl, thumbnailUrl: lavaThumbUrl },
  { guid: 'builtin:mountain', name: 'Mountain', url: mountainUrl, thumbnailUrl: mountainThumbUrl },
  { guid: 'builtin:mountain-light', name: 'Mountain Light', url: mountainLightUrl, thumbnailUrl: mountainLightThumbUrl },
  { guid: 'builtin:skybox', name: 'Skybox', url: skyboxUrl, thumbnailUrl: skyboxThumbUrl },
  { guid: 'builtin:skybox-sunset', name: 'Skybox Sunset', url: skyboxSunsetUrl, thumbnailUrl: skyboxSunsetThumbUrl },
  { guid: 'builtin:window', name: 'Window', url: windowUrl, thumbnailUrl: windowThumbUrl },
] as const;

export const BUILT_IN_TEXTURE_NAMES: ReadonlySet<string> = new Set(BUILT_IN_TEXTURES.map(t => t.name));

export async function ensureTextureLibrary(): Promise<TextureMetadata[]> {
  await migrateFromLocalStorage();
  const storedTextures = await getAllTextureEntries();
  const customTextures = storedTextures.filter(texture => !BUILT_IN_TEXTURE_NAMES.has(texture.name));
  const builtIns = BUILT_IN_TEXTURES.map(texture => ({
    guid: texture.guid,
    name: texture.name,
    thumbnail: texture.thumbnailUrl,
    date: 'built-in',
  }));
  return [...builtIns, ...customTextures];
}

export function textureSourceKey(name: string, textures: TextureMetadata[]): string {
  const texture = textures.find(entry => entry.name === name);
  return `${name}:${texture?.date ?? ''}`;
}

export async function storedTextureObjectUrl(name: string): Promise<string | null> {
  const builtInTexture = BUILT_IN_TEXTURES.find(texture => texture.name === name);
  if (builtInTexture) return builtInTexture.url;
  const blob = await getTextureBlob(name);
  return blob ? URL.createObjectURL(blob) : null;
}
