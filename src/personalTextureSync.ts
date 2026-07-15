import {
  deletePersonalTexture,
  fetchPersonalTextureBlob,
  finalizePersonalTexture,
  listPersonalTextureMetadata,
  reservePersonalTexture,
  uploadPersonalTextureBlob,
} from './personalLibraryRemote';
import type {PersonalTextureMetadata} from './personalLibraryTypes';
import {setPersonalTextureSyncRequester} from './personalTextureSyncTrigger';
import {normalizeTextureBlob} from './textureNormalization';
import {
  acknowledgeTextureEntry,
  applyCloudTextureEntry,
  getAllTextureCacheRecords,
  getTextureBlobByGuid,
  markTextureUnavailable,
  purgeTextureEntryByGuid,
  saveTextureEntry,
  type TextureMetadata,
} from './textureStore';

let activeUid: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;
let syncAgain = false;

function localMetadataForRemote(record: TextureMetadata, blob: Blob, storagePath: string): PersonalTextureMetadata {
  if (!record.guid) throw new Error('Personal texture is missing a GUID.');
  return {
    guid: record.guid,
    name: record.name,
    kind: record.kind === 'skybox' ? 'skybox' : 'texture',
    contentType: 'image/webp',
    storagePath,
    width: record.width || 0,
    height: record.height || 0,
    byteSize: blob.size,
    thumbnail: record.thumbnail,
    updatedAt: record.lastUpdated || record.date,
    revision: record.revision || 0,
  };
}

async function normalizedLocalTexture(record: TextureMetadata): Promise<{record: TextureMetadata; blob: Blob}> {
  if (!record.guid) throw new Error('Personal texture is missing a GUID.');
  const source = await getTextureBlobByGuid(record.guid);
  if (!source) throw new Error(`Texture blob "${record.name}" is missing.`);
  if (source.type === 'image/webp' && record.width && record.height && record.width <= 1024 && record.height <= 1024) {
    return {record, blob: source};
  }
  const normalized = await normalizeTextureBlob(source);
  const details = {
    kind: record.kind,
    contentType: 'image/webp',
    width: normalized.width,
    height: normalized.height,
    byteSize: normalized.blob.size,
  } as const;
  await saveTextureEntry(record.name, normalized.blob, record.thumbnail, record.date, record.guid, record.favorite ?? false, record.remote, details, record);
  return {record: {...record, ...details}, blob: normalized.blob};
}

export async function ensurePersonalTextureCached(record: TextureMetadata): Promise<Blob | null> {
  if (!record.guid || !record.storagePath) return null;
  const cached = await getTextureBlobByGuid(record.guid);
  if (cached) return cached;
  try {
    const blob = await fetchPersonalTextureBlob(record.storagePath);
    await applyCloudTextureEntry(record, blob, record.revision || 0);
    return blob;
  } catch (error) {
    await markTextureUnavailable(record.guid);
    console.warn(`[personalTextureSync] Texture "${record.name}" is unavailable:`, error);
    return null;
  }
}

export async function syncPersonalTextures(uid: string): Promise<void> {
  activeUid = uid;
  const [remote, local] = await Promise.all([listPersonalTextureMetadata(uid), getAllTextureCacheRecords()]);
  for (const cloud of remote) {
    const cached = local.find(entry => entry.guid === cloud.guid);
    if (cached?.syncState === 'pending' || cached?.syncState === 'deleting') continue;
    if (cached && (cached.revision || 0) >= cloud.revision && await getTextureBlobByGuid(cloud.guid)) continue;
    try {
      const blob = await fetchPersonalTextureBlob(cloud.storagePath);
      await applyCloudTextureEntry({...cloud, date: cloud.updatedAt, lastUpdated: cloud.updatedAt, origin: 'personal'}, blob, cloud.revision);
    } catch (error) {
      if (cached) await markTextureUnavailable(cloud.guid);
      console.warn(`[personalTextureSync] Failed to hydrate "${cloud.name}":`, error);
    }
  }

  const pending = await getAllTextureCacheRecords();
  for (const entry of pending) {
    if (entry.origin !== 'personal' || !entry.guid) continue;
    if (entry.syncState === 'deleting' || entry.tombstone) {
      await deletePersonalTexture(entry.guid);
      await purgeTextureEntryByGuid(entry.guid);
      continue;
    }
    if (entry.syncState !== 'pending' && entry.syncState !== 'error') continue;
    const normalized = await normalizedLocalTexture(entry);
    const reservation = await reservePersonalTexture(entry.guid);
    await uploadPersonalTextureBlob(reservation.storagePath, normalized.blob);
    const metadata = localMetadataForRemote(normalized.record, normalized.blob, reservation.storagePath);
    const finalized = await finalizePersonalTexture(metadata);
    await acknowledgeTextureEntry(entry.guid, finalized.revision, {
      storagePath: finalized.storagePath,
      contentType: 'image/webp',
      width: metadata.width,
      height: metadata.height,
      byteSize: metadata.byteSize,
    });
  }
}

export function startPersonalTextureSync(uid: string): void {
  activeUid = uid;
  setPersonalTextureSyncRequester(requestPersonalTextureSync);
  if (retryTimer) clearTimeout(retryTimer);
  requestPersonalTextureSync();
}

export function requestPersonalTextureSync(): void {
  const uid = activeUid;
  if (!uid) return;
  if (syncInFlight) {
    syncAgain = true;
    return;
  }
  syncInFlight = syncPersonalTextures(uid)
    .catch(error => {
      console.warn('[personalTextureSync] Synchronization failed:', error);
      if (activeUid === uid) retryTimer = setTimeout(requestPersonalTextureSync, 15_000);
    })
    .finally(() => {
      syncInFlight = null;
      if (syncAgain && activeUid) {
        syncAgain = false;
        requestPersonalTextureSync();
      }
    });
}

export function stopPersonalTextureSync(): void {
  activeUid = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  syncAgain = false;
  setPersonalTextureSyncRequester(null);
}
