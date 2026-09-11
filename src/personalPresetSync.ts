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
import {hasPendingPersonalChange, type ScopedCacheFields} from './scopedCache';
import {publishPersonalSyncStatus} from './personalSyncStatus';
import {createPersonalSyncRunner} from './personalSyncRunner';
export {observePersonalSyncStatus, type PersonalSyncStatus} from './personalSyncStatus';
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
  apply: (record: T, revision: number, expected?: ScopedCacheFields | null) => Promise<void>;
  acknowledge: (guid: string, revision: number, expected?: ScopedCacheFields) => Promise<void>;
  purge: (guid: string, expected?: ScopedCacheFields) => Promise<void>;
}

const adapters: SyncAdapter<any>[] = [
  {type: 'completePreset', list: getAllPresetCacheRecords, apply: applyCloudPresetEntry, acknowledge: acknowledgePresetEntry, purge: purgePresetEntryByGuid},
  {type: 'palettePreset', list: getAllPaletteCacheRecords, apply: applyCloudPaletteEntry, acknowledge: acknowledgePaletteEntry, purge: purgePaletteEntryByGuid},
  {type: 'stopPreset', list: getAllStopPresetCacheRecords, apply: applyCloudStopPresetEntry, acknowledge: acknowledgeStopPresetEntry, purge: purgeStopPresetEntryByGuid},
  {type: 'textureMappingPreset', list: getAllTextureMappingPresetCacheRecords, apply: applyCloudTextureMappingPresetEntry, acknowledge: acknowledgeTextureMappingPresetEntry, purge: purgeTextureMappingPresetEntryByGuid},
  {type: 'animationPreset', list: getAllAnimationPresetCacheRecords, apply: applyCloudAnimationPresetEntry, acknowledge: acknowledgeAnimationPresetEntry, purge: purgeAnimationPresetEntryByGuid},
];

function stripCacheFields(record: CacheRecord): Record<string, unknown> {
  const payload = {...record} as Record<string, unknown>;
  for (const key of ['id', 'ownerScopeKey', 'origin', 'syncState', 'revision', 'tombstone', 'lastSyncError', 'localChangeId']) delete payload[key];
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

async function pullPersonalPresets(uid: string): Promise<void> {
  const [manifest, localByType] = await Promise.all([
    getPersonalPresetManifest(), Promise.all(adapters.map(adapter => adapter.list())),
  ]);
  const adapterByType = new Map(adapters.map(adapter => [adapter.type, adapter]));
  const localByGuidByType = new Map<PersonalPresetType, Map<string, CacheRecord>>();
  for (let index = 0; index < adapters.length; index += 1) {
    localByGuidByType.set(adapters[index].type,
      new Map(localByType[index].filter(record => !!record.guid).map(record => [record.guid!, record])));
  }
  const manifestByGuid = new Map(manifest.entries.map(entry => [entry.guid, entry]));
  const changedEntries = manifest.entries.filter(entry =>
    planPersonalRecordSync(localByGuidByType.get(entry.type)?.get(entry.guid), entry.revision) === 'pull');
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
    await adapter.apply({...cloud.payload as any, guid: cloud.guid}, cloud.revision,
      localByGuidByType.get(entry.type)?.get(entry.guid) ?? null);
  }
  for (let index = 0; index < adapters.length; index += 1) {
    const adapter = adapters[index];
    for (const record of localByType[index]) {
      if (!record.guid) continue;
      const remoteEntry = vanishedPayloadGuids.has(record.guid) ? undefined : manifestByGuid.get(record.guid);
      if (shouldPurgePersonalRecord(record, adapter.type, remoteEntry)) await adapter.purge(record.guid, record);
    }
  }
}

export async function syncPersonalPresets(uid: string, refresh = true): Promise<void> {
  publishPersonalSyncStatus('presets', {state: 'syncing', pending: 0});
  try {
    if (refresh) await pullPersonalPresets(uid);
    for (let index = 0; index < adapters.length; index += 1) {
      const adapter = adapters[index];
      const records = await adapter.list();
      for (const record of records) {
        if (record.origin !== 'personal' || !record.guid) continue;
        if (record.syncState === 'deleting' || record.tombstone) {
          await deletePersonalPreset(record.guid);
          await adapter.purge(record.guid, record);
        } else if (record.syncState === 'pending' || record.syncState === 'error') {
          const result = await upsertPersonalPreset(personalEnvelope(adapter.type, record));
          await adapter.acknowledge(record.guid, result.revision, record);
        }
      }
    }
    const pending = (await Promise.all(adapters.map(adapter => adapter.list()))).flat().filter(hasPendingPersonalChange).length;
    publishPersonalSyncStatus('presets', {state: pending ? 'syncing' : 'synced', pending, lastSyncedAt: new Date().toISOString()});
    if (pending) void requestPersonalPresetSync();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    publishPersonalSyncStatus('presets', {state: 'error', pending: 0, lastError: message});
    throw error;
  }
}

const runner = createPersonalSyncRunner(syncPersonalPresets);

export function startPersonalPresetSync(uid: string): Promise<void> {
  setPersonalSyncRequester(requestPersonalPresetSync);
  return runner.start(uid);
}

export function requestPersonalPresetSync(): Promise<void> {
  return runner.request();
}

export async function stopPersonalPresetSync(): Promise<void> {
  setPersonalSyncRequester(null);
  await runner.stop();
  publishPersonalSyncStatus('presets', {state: 'idle', pending: 0});
}

export type PersonalPresetCacheRecord =
  | PresetRecord
  | PaletteRecord
  | StopPresetRecord
  | TextureMappingPresetRecord
  | AnimationPresetRecord;
