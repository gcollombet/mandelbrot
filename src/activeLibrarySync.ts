import {startPersonalPresetSync} from './personalPresetSync';
import {startPersonalTextureSync} from './personalTextureSync';
import {syncRemoteCatalog} from './remoteCatalogSync';

export interface ActiveLibrarySyncOptions {
  presetSync: boolean;
  textureSync: boolean;
}

export interface ActiveLibrarySyncDependencies {
  syncCatalog: () => Promise<void>;
  syncPersonalPresets: (uid: string) => Promise<void>;
  syncPersonalTextures: (uid: string) => Promise<void>;
}

const defaultDependencies: ActiveLibrarySyncDependencies = {
  syncCatalog: syncRemoteCatalog,
  syncPersonalPresets: startPersonalPresetSync,
  syncPersonalTextures: startPersonalTextureSync,
};

/**
 * Hydrate the cache for the already-selected library scope.
 *
 * The shared catalog is synchronized for guests and authenticated users alike.
 * Personal records are layered on afterwards so the caller can refresh the UI
 * only once all records for the active profile are available locally.
 */
export async function syncActiveLibrary(
  uid: string | null,
  options: ActiveLibrarySyncOptions,
  dependencies: ActiveLibrarySyncDependencies = defaultDependencies,
): Promise<void> {
  await dependencies.syncCatalog();
  if (!uid) return;

  const personalSyncs: Promise<void>[] = [];
  if (options.presetSync) personalSyncs.push(dependencies.syncPersonalPresets(uid));
  if (options.textureSync) personalSyncs.push(dependencies.syncPersonalTextures(uid));
  await Promise.all(personalSyncs);
}
