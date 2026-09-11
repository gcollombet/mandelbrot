import {
  getRemoteCatalogEntry,
  getRemoteTextureBlob,
  getPublicCatalogManifest,
  RemoteCatalogUnavailableError,
  type CatalogType,
  type RemoteCompletePresetEntry,
  type RemoteEntryByType,
  type RemotePalettePresetEntry,
  type RemoteStopPresetEntry,
  type RemoteTextureMappingPresetEntry,
  type RemoteAnimationPresetEntry,
  type RemoteTextureEntry,
} from './remoteCatalog';
import {deletePaletteEntry, getAllPaletteEntries, saveRemotePaletteEntry} from './paletteStore';
import {deletePresetEntry, getAllPresetRecords, saveRemotePresetEntry} from './presetStore';
import {deleteStopPresetEntry, getAllStopPresetEntries, saveRemoteStopPresetEntry} from './stopPresetStore';
import {deleteTextureEntry, getAllTextureEntries, saveRemoteTextureEntry} from './textureStore';
import {deleteTextureMappingPresetEntry, getAllStoredTextureMappingPresetEntries, saveRemoteTextureMappingPresetEntry} from './textureMappingPresetStore';
import {deleteAnimationPresetEntry, getAllAnimationPresetEntries, saveRemoteAnimationPresetEntry} from './animationPresetStore';
import {groupPublicCatalogManifestEntries, type PublicCatalogManifestEntry} from './publicCatalogManifest';
import {resolveLegacyCacheFields, type ScopedCacheFields} from './scopedCache';

interface PublicCacheRecord extends ScopedCacheFields {
  guid?: string;
  remote?: unknown;
  builtIn?: boolean;
}

function isRemoteNewer(remoteLastUpdated: string, localLastUpdated?: string): boolean {
  if (!localLastUpdated) return true;
  return remoteLastUpdated.localeCompare(localLastUpdated) > 0;
}

export function shouldFetchRemoteEntry(remoteLastUpdated: string, localLastUpdated?: string): boolean {
  return isRemoteNewer(remoteLastUpdated, localLastUpdated);
}

export function publicRecordsMissingFromManifest<T extends PublicCacheRecord>(
  records: T[],
  manifestEntries: PublicCatalogManifestEntry[],
): T[] {
  const remoteGuids = new Set(manifestEntries.map(entry => entry.guid));
  return records.filter(record => {
    if (!record.guid || record.tombstone === true || remoteGuids.has(record.guid)) return false;
    return resolveLegacyCacheFields(record).origin === 'public';
  });
}

async function fetchRemoteEntryBestEffort<T extends CatalogType>(type: T, guid: string): Promise<RemoteEntryByType<T> | null> {
  try {
    return await getRemoteCatalogEntry(type, guid);
  } catch (error) {
    console.warn(`[remoteCatalogSync] Failed to fetch ${type} (${guid}):`, error);
    return null;
  }
}

export async function syncRemoteCatalog(): Promise<void> {
  try {
    const manifest = await getPublicCatalogManifest();
    const metadata = groupPublicCatalogManifestEntries(manifest);
    const [presets, palettes, stops, textures, textureMappings, animations] = await Promise.all([
      getAllPresetRecords(),
      getAllPaletteEntries(),
      getAllStopPresetEntries(),
      getAllTextureEntries(),
      getAllStoredTextureMappingPresetEntries(),
      getAllAnimationPresetEntries(),
    ]);

    await Promise.all([
      ...publicRecordsMissingFromManifest(presets, metadata.completePreset).map(entry => deletePresetEntry(entry.id)),
      ...publicRecordsMissingFromManifest(palettes, metadata.palettePreset).map(entry => deletePaletteEntry(entry.name)),
      ...publicRecordsMissingFromManifest(stops, metadata.stopPreset).map(entry => deleteStopPresetEntry(entry.name)),
      ...publicRecordsMissingFromManifest(textures, metadata.texture).map(entry => deleteTextureEntry(entry.name)),
      ...publicRecordsMissingFromManifest(textureMappings, metadata.textureMappingPreset).map(entry => deleteTextureMappingPresetEntry(entry.name)),
      ...publicRecordsMissingFromManifest(animations, metadata.animationPreset).map(entry => deleteAnimationPresetEntry(entry.name)),
    ]);

    const presetsByGuid = new Map(presets.map(entry => [entry.guid, entry]));
    for (const remote of metadata.completePreset) {
      const local = presetsByGuid.get(remote.guid);
      if (local && !isRemoteNewer(remote.lastUpdated, local.lastUpdated)) continue;
      const entry = await fetchRemoteEntryBestEffort('completePreset', remote.guid) as RemoteCompletePresetEntry | null;
      if (!entry) continue;
      await saveRemotePresetEntry({
        guid: entry.guid,
        name: entry.name,
        value: entry.value,
        thumbnail: entry.thumbnail,
        date: entry.lastUpdated,
        lastUpdated: entry.lastUpdated,
        scaleExponent: entry.scaleExponent ?? 0,
        favorite: false,
        remote: {publishedName: entry.name, lastUpdated: entry.lastUpdated},
      });
    }

    const palettesByGuid = new Map(palettes.filter(entry => entry.guid).map(entry => [entry.guid!, entry]));
    for (const remote of metadata.palettePreset) {
      const local = palettesByGuid.get(remote.guid);
      if (local && !isRemoteNewer(remote.lastUpdated, local.lastUpdated)) continue;
      const entry = await fetchRemoteEntryBestEffort('palettePreset', remote.guid) as RemotePalettePresetEntry | null;
      if (!entry) continue;
      await saveRemotePaletteEntry({
        ...entry,
        date: entry.lastUpdated,
        favorite: false,
        remote: {publishedName: entry.name, lastUpdated: entry.lastUpdated},
      });
    }

    const stopsByGuid = new Map(stops.filter(entry => entry.guid).map(entry => [entry.guid!, entry]));
    for (const remote of metadata.stopPreset) {
      const local = stopsByGuid.get(remote.guid);
      if (local && !isRemoteNewer(remote.lastUpdated, local.lastUpdated)) continue;
      const entry = await fetchRemoteEntryBestEffort('stopPreset', remote.guid) as RemoteStopPresetEntry | null;
      if (!entry) continue;
      await saveRemoteStopPresetEntry({
        ...entry,
        date: entry.lastUpdated,
        favorite: false,
        remote: {publishedName: entry.name, lastUpdated: entry.lastUpdated},
      });
    }

    const textureMappingsByGuid = new Map(textureMappings.map(entry => [entry.guid, entry]));
    for (const remote of metadata.textureMappingPreset) {
      const local = textureMappingsByGuid.get(remote.guid);
      if (local && !isRemoteNewer(remote.lastUpdated, local.lastUpdated)) continue;
      const entry = await fetchRemoteEntryBestEffort('textureMappingPreset', remote.guid) as RemoteTextureMappingPresetEntry | null;
      if (!entry) continue;
      await saveRemoteTextureMappingPresetEntry({
        ...entry,
        date: entry.lastUpdated,
        favorite: false,
        remote: {publishedName: entry.name, lastUpdated: entry.lastUpdated},
      });
    }

    const animationsByGuid = new Map(animations.map(entry => [entry.guid, entry]));
    for (const remote of metadata.animationPreset) {
      const local = animationsByGuid.get(remote.guid);
      if (local && !isRemoteNewer(remote.lastUpdated, local.lastUpdated)) continue;
      const entry = await fetchRemoteEntryBestEffort('animationPreset', remote.guid) as RemoteAnimationPresetEntry | null;
      if (!entry) continue;
      await saveRemoteAnimationPresetEntry({
        ...entry,
        date: entry.lastUpdated,
        favorite: false,
        remote: {publishedName: entry.name, lastUpdated: entry.lastUpdated},
      });
    }

    const texturesByGuid = new Map(textures.filter(entry => entry.guid).map(entry => [entry.guid!, entry]));
    for (const remote of metadata.texture) {
      const local = texturesByGuid.get(remote.guid);
      if (local && !isRemoteNewer(remote.lastUpdated, local.lastUpdated)) continue;
      const entry = await fetchRemoteEntryBestEffort('texture', remote.guid) as RemoteTextureEntry | null;
      if (!entry) continue;
      try {
        const blob = await getRemoteTextureBlob(entry);
        await saveRemoteTextureEntry({
          guid: entry.guid,
          name: entry.name,
          thumbnail: entry.thumbnail,
          date: entry.lastUpdated,
          lastUpdated: entry.lastUpdated,
          favorite: false,
          remote: {publishedName: entry.name, lastUpdated: entry.lastUpdated},
        }, blob);
      } catch (error) {
        console.warn(`[remoteCatalogSync] Failed to fetch remote texture "${entry.name}" (${entry.guid}):`, error);
      }
    }
  } catch (error) {
    if (error instanceof RemoteCatalogUnavailableError) return;
    console.warn('[remoteCatalogSync] Remote catalog synchronization failed:', error);
  }
}
