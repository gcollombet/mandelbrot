import type {MandelbrotParams} from './Mandelbrot';
import type {TextureMetadata} from './textureStore';
import {getAllTextureEntries, getTextureMetadataByGuid, saveTextureEntry} from './textureStore';
import {getActiveLibraryScope} from './scopedCache';
import {PERSONAL_TEXTURE_LIMIT, scopeKey} from './personalLibraryTypes';
import {createGuid} from './catalogIdentity';
import {t} from './i18n';

// Shared textures live only in this session until the visitor explicitly saves a copy.
const textures = new Map<string, {metadata: TextureMetadata; blob: Blob}>();
const copies = new Map<string, string>();
export function registerSharedTexture(metadata: TextureMetadata, blob: Blob): void {
  textures.set(metadata.name, {metadata, blob});
}
export function sharedTextureEntries(): TextureMetadata[] {
  return [...textures.values()].map(entry => entry.metadata);
}
export function sharedTextureBlob(name: string): Blob | undefined { return textures.get(name)?.blob; }

/** Give saved copies their own durable texture identities and account ownership. */
export async function materializeSharedTextures(value: MandelbrotParams): Promise<MandelbrotParams> {
  const result = {...value};
  const scope = getActiveLibraryScope();
  for (const [guidKey, nameKey] of [['textureGuid', 'textureName'], ['skyboxGuid', 'skyboxName']] as const) {
    const entry = textures.get(result[nameKey] ?? '');
    if (!entry || entry.metadata.guid !== result[guidKey]) continue;
    const key = `${scopeKey(scope)}:${entry.metadata.guid}`;
    const previous = copies.get(key);
    let saved = previous ? await getTextureMetadataByGuid(previous) : null;
    if (!saved) {
      if (scope.kind === 'user' && (await getAllTextureEntries()).filter(t => t.origin === 'personal').length >= PERSONAL_TEXTURE_LIMIT) {
        throw new Error(t('sharedSceneTextures.libraryFull'));
      }
      const guid = createGuid();
      const {kind, width, height, thumbnail} = entry.metadata;
      await saveTextureEntry(entry.metadata.name.replace(/ · partagé .+$/, ''), entry.blob, thumbnail,
        undefined, guid, false, undefined, {kind, width, height, contentType: 'image/webp'});
      copies.set(key, guid);
      saved = await getTextureMetadataByGuid(guid);
    }
    result[guidKey] = saved!.guid;
    result[nameKey] = saved!.name;
  }
  return result;
}
