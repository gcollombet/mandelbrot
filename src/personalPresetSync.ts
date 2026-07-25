import {
  acknowledgeAnimationPresetEntry,
  applyCloudAnimationPresetEntry,
  getAllAnimationPresetCacheRecords,
  purgeAnimationPresetEntryByGuid,
  type AnimationPresetRecord,
} from './animationPresetStore';
import {
  acknowledgePaletteEntry,
  applyCloudPaletteEntry,
  getAllPaletteCacheRecords,
  purgePaletteEntryByGuid,
  type PaletteRecord,
} from './paletteStore';
import {
  acknowledgePresetEntry,
  applyCloudPresetEntry,
  getAllPresetCacheRecords,
  purgePresetEntryByGuid,
  type PresetRecord,
} from './presetStore';
import {
  deletePersonalPreset,
  getPersonalPresetManifest,
  getPersonalPresetRecord,
  upsertPersonalPreset,
} from './personalLibraryRemote';
import type {
  PersonalPresetManifestEntry,
  PersonalPresetType,
  PersonalRecordEnvelope,
} from './personalLibraryTypes';
import type {ScopedCacheFields} from './scopedCache';
import {setPersonalSyncRequester} from './personalSyncTrigger';
import {
  acknowledgeStopPresetEntry,
  applyCloudStopPresetEntry,
  getAllStopPresetCacheRecords,
  purgeStopPresetEntryByGuid,
  type StopPresetRecord,
} from './stopPresetStore';
import {
  acknowledgeTextureMappingPresetEntry,
  applyCloudTextureMappingPresetEntry,
  getAllTextureMappingPresetCacheRecords,
  purgeTextureMappingPresetEntryByGuid,
  type TextureMappingPresetRecord,
} from './textureMappingPresetStore';

type CacheRecord = ScopedCacheFields & {
  guid?: string;
  name: string;
  thumbnail?: string;
  favorite?: boolean;
  date?: string;
  lastUpdated?: string;
};

interface SyncAdapter<T extends CacheRecord> {
  type: PersonalPresetType;
  list: () => Promise<T[]>;
  apply: (record: T, revision: number) => Promise<void>;
  acknowledge: (guid: string, revision: number) => Promise<void>;
  purge: (guid: string) => Promise<void>;
}

const adapters: SyncAdapter<any>[] = [
  {type: 'completePreset', list: getAllPresetCacheRecords, apply: applyCloudPresetEntry, acknowledge: acknowledgePresetEntry, purge: purgePresetEntryByGuid},
  {type: 'palettePreset', list: getAllPaletteCacheRecords, apply: applyCloudPaletteEntry, acknowledge: acknowledgePaletteEntry, purge: purgePaletteEntryByGuid},
  {type: 'stopPreset', list: getAllStopPresetCacheRecords, apply: applyCloudStopPresetEntry, acknowledge: acknowledgeStopPresetEntry, purge: purgeStopPresetEntryByGuid},
  {type: 'textureMappingPreset', list: getAllTextureMappingPresetCacheRecords, apply: applyCloudTextureMappingPresetEntry, acknowledge: acknowledgeTextureMappingPresetEntry, purge: purgeTextureMappingPresetEntryByGuid},
  {type: 'animationPreset', list: getAllAnimationPresetCacheRecords, apply: applyCloudAnimationPresetEntry, acknowledge: acknowledgeAnimationPresetEntry, purge: purgeAnimationPresetEntryByGuid},
];

export interface PersonalSyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  pending: number;
  lastError?: string;
  lastSyncedAt?: string;
}

let status: PersonalSyncStatus = {state: 'idle', pending: 0};
const listeners = new Set<(status: PersonalSyncStatus) => void>();
let activeUid: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;
let syncAgain = false;

function publish(next: PersonalSyncStatus) {
  status = next;
  for (const listener of listeners) listener({...status});
}

export function observePersonalSyncStatus(listener: (status: PersonalSyncStatus) => void): () => void {
  listeners.add(listener);
  listener({...status});
  return () => listeners.delete(listener);
}

function stripCacheFields(record: CacheRecord): Record<string, unknown> {
  const payload = {...record} as Record<string, unknown>;
  for (const key of ['id', 'ownerScopeKey', 'origin', 'syncState', 'revision', 'tombstone', 'lastSyncError']) delete payload[key];
  return payload;
}

export function personalEnvelope(type: PersonalPresetType, record: CacheRecord): PersonalRecordEnvelope {
  if (!record.guid) throw new Error(`Personal ${type} is missing a GUID.`);
  return {
    guid: record.guid,
    type,
    payload: stripCacheFields(record),
    name: record.name,
    thumbnail: record.thumbnail,
    favorite: record.favorite ?? false,
    updatedAt: record.lastUpdated || record.date || new Date().toISOString(),
    revision: record.revision ?? 0,
  };
}

export function planPersonalRecordSync(local: CacheRecord | undefined, cloudRevision?: number): 'pull' | 'push' | 'delete' | 'none' {
  if (!local) return cloudRevision === undefined ? 'none' : 'pull';
  if (local.syncState === 'deleting' || local.tombstone) return 'delete';
  if (local.syncState === 'pending' || local.syncState === 'error') return 'push';
  if (cloudRevision !== undefined && (local.revision ?? 0) < cloudRevision) return 'pull';
  return 'none';
}

export function shouldPurgePersonalRecord(
  local: CacheRecord,
  localType: PersonalPresetType,
  remoteEntry?: PersonalPresetManifestEntry,
): boolean {
  return local.origin === 'personal'
    && typeof local.guid === 'string'
    && local.guid.length > 0
    && local.syncState === 'synced'
    && local.tombstone !== true
    && remoteEntry?.type !== localType;
}

async function fetchPresetPayloads(
  uid: string,
  entries: PersonalPresetManifestEntry[],
): Promise<Map<string, PersonalRecordEnvelope | null>> {
  const records = new Map<string, PersonalRecordEnvelope | null>();
  const concurrency = 20;
  for (let index = 0; index < entries.length; index += concurrency) {
    const chunk = entries.slice(index, index + concurrency);
    const fetched = await Promise.all(chunk.map(async entry => ({
      guid: entry.guid,
      record: await getPersonalPresetRecord(uid, entry.guid),
    })));
    for (const result of fetched) records.set(result.guid, result.record);
  }
  return records;
}

export async function syncPersonalPresets(uid: string): Promise<void> {
  activeUid = uid;
  publish({...status, state: 'syncing', lastError: undefined});
  try {
    const [manifest, localByType] = await Promise.all([
      getPersonalPresetManifest(),
      Promise.all(adapters.map(adapter => adapter.list())),
    ]);
    const adapterByType = new Map(adapters.map(adapter => [adapter.type, adapter]));
    const localByGuidByType = new Map<PersonalPresetType, Map<string, CacheRecord>>();
    for (let index = 0; index < adapters.length; index += 1) {
      localByGuidByType.set(
        adapters[index].type,
        new Map(localByType[index].filter(record => !!record.guid).map(record => [record.guid!, record])),
      );
    }
    const manifestByGuid = new Map(manifest.entries.map(entry => [entry.guid, entry]));
    const changedEntries = manifest.entries.filter(entry => {
      const local = localByGuidByType.get(entry.type)?.get(entry.guid);
      return planPersonalRecordSync(local, entry.revision) === 'pull';
    });
    const payloads = await fetchPresetPayloads(uid, changedEntries);
    const vanishedPayloadGuids = new Set<string>();
    for (const entry of changedEntries) {
      const cloud = payloads.get(entry.guid);
      if (!cloud) {
        vanishedPayloadGuids.add(entry.guid);
        continue;
      }
      const adapter = adapterByType.get(entry.type);
      if (!adapter) continue;
      await adapter.apply(cloud.payload as any, cloud.revision);
    }

    for (let index = 0; index < adapters.length; index += 1) {
      const adapter = adapters[index];
      for (const record of localByType[index]) {
        if (!record.guid) continue;
        const remoteEntry = vanishedPayloadGuids.has(record.guid)
          ? undefined
          : manifestByGuid.get(record.guid);
        if (shouldPurgePersonalRecord(record, adapter.type, remoteEntry)) {
          await adapter.purge(record.guid);
        }
      }
    }

    let pending = 0;
    for (let index = 0; index < adapters.length; index += 1) {
      const adapter = adapters[index];
      const records = await adapter.list();
      for (const record of records) {
        if (record.origin !== 'personal' || !record.guid) continue;
        if (record.syncState === 'deleting' || record.tombstone) {
          pending += 1;
          await deletePersonalPreset(record.guid);
          await adapter.purge(record.guid);
        } else if (record.syncState === 'pending' || record.syncState === 'error') {
          pending += 1;
          const result = await upsertPersonalPreset(personalEnvelope(adapter.type, record));
          await adapter.acknowledge(record.guid, result.revision);
        }
      }
    }
    publish({state: 'synced', pending: 0, lastSyncedAt: new Date().toISOString()});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    publish({...status, state: 'error', lastError: message});
    throw error;
  }
}

export function startPersonalPresetSync(uid: string): Promise<void> {
  activeUid = uid;
  setPersonalSyncRequester(requestPersonalPresetSync);
  if (retryTimer) clearTimeout(retryTimer);
  return requestPersonalPresetSync();
}

export function requestPersonalPresetSync(): Promise<void> {
  const uid = activeUid;
  if (!uid) return Promise.resolve();
  if (syncInFlight) {
    syncAgain = true;
    return syncInFlight;
  }
  syncInFlight = syncPersonalPresets(uid)
    .catch(() => {
      if (activeUid === uid) retryTimer = setTimeout(requestPersonalPresetSync, 15_000);
    })
    .finally(() => {
      syncInFlight = null;
      if (syncAgain && activeUid) {
        syncAgain = false;
        requestPersonalPresetSync();
      }
    });
  return syncInFlight;
}

export function stopPersonalPresetSync(): Promise<void> {
  const pending = syncInFlight;
  activeUid = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  syncAgain = false;
  setPersonalSyncRequester(null);
  publish({state: 'idle', pending: 0});
  return (pending ?? Promise.resolve()).finally(() => {
    if (!activeUid) publish({state: 'idle', pending: 0});
  });
}

export type PersonalPresetCacheRecord =
  | PresetRecord
  | PaletteRecord
  | StopPresetRecord
  | TextureMappingPresetRecord
  | AnimationPresetRecord;
