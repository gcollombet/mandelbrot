import {
  getRemoteCatalogEntry,
  getRemoteTextureBlob,
  listAllRemoteCatalogMetadata,
  RemoteCatalogUnavailableError,
  type RemoteCompletePresetEntry,
  type RemotePalettePresetEntry,
  type RemoteStopPresetEntry,
  type RemoteTextureEntry,
} from './remoteCatalog';
import {getAllPaletteEntries, saveRemotePaletteEntry} from './paletteStore';
import {getAllPresetRecords, saveRemotePresetEntry} from './presetStore';
import {getAllStopPresetEntries, saveRemoteStopPresetEntry} from './stopPresetStore';
import {getAllTextureEntries, saveRemoteTextureEntry} from './textureStore';

function isRemoteNewer(remoteLastUpdated: string, localLastUpdated?: string): boolean {
  if (!localLastUpdated) return true;
  return remoteLastUpdated.localeCompare(localLastUpdated) > 0;
}

export function shouldFetchRemoteEntry(remoteLastUpdated: string, localLastUpdated?: string): boolean {
  return isRemoteNewer(remoteLastUpdated, localLastUpdated);
}

export async function syncRemoteCatalog(): Promise<void> {
  try {
    const metadata = await listAllRemoteCatalogMetadata();
    const [presets, palettes, stops, textures] = await Promise.all([
      getAllPresetRecords(),
      getAllPaletteEntries(),
      getAllStopPresetEntries(),
      getAllTextureEntries(),
    ]);

    const presetsByGuid = new Map(presets.map(entry => [entry.guid, entry]));
    for (const remote of metadata.completePreset) {
      const local = presetsByGuid.get(remote.guid);
      if (local && !isRemoteNewer(remote.lastUpdated, local.lastUpdated)) continue;
      const entry = await getRemoteCatalogEntry('completePreset', remote.guid) as RemoteCompletePresetEntry | null;
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
      const entry = await getRemoteCatalogEntry('palettePreset', remote.guid) as RemotePalettePresetEntry | null;
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
      const entry = await getRemoteCatalogEntry('stopPreset', remote.guid) as RemoteStopPresetEntry | null;
      if (!entry) continue;
      await saveRemoteStopPresetEntry({
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
      const entry = await getRemoteCatalogEntry('texture', remote.guid) as RemoteTextureEntry | null;
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
