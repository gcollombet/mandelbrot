import {
  deletePersonalTexture, fetchPersonalTextureBlob, finalizePersonalTexture,
  listPersonalTextureMetadata, reservePersonalTexture, uploadPersonalTextureBlob, updatePersonalTextureDetails,
} from './personalLibraryRemote';
import type {PersonalTextureMetadata} from './personalLibraryTypes';
import {setPersonalTextureSyncRequester} from './personalTextureSyncTrigger';
import {normalizeTextureBlob} from './textureNormalization';
import {hasPendingPersonalChange, matchesCacheSnapshot} from './scopedCache';
import {publishPersonalSyncStatus} from './personalSyncStatus';
import {createPersonalSyncRunner} from './personalSyncRunner';
import {
  acknowledgeTextureEntry, applyCloudTextureEntry, getAllTextureCacheRecords, getTextureBlobByGuid,
  getTextureCacheSnapshot, markTextureUnavailable, purgeTextureEntryByGuid, type TextureMetadata,
} from './textureStore';

// Retain successful uploads across transient finalization failures within this session.
const uploaded = new Map<string, string>();

export async function textureBlobHash(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function localMetadataForRemote(record: TextureMetadata, blob: Blob, storagePath: string, blobHash: string): PersonalTextureMetadata {
  if (!record.guid) throw new Error('Personal texture is missing a GUID.');
  return {
    guid: record.guid, name: record.name, kind: record.kind === 'skybox' ? 'skybox' : 'texture',
    contentType: 'image/webp', storagePath, width: record.width || 0, height: record.height || 0,
    byteSize: blob.size, thumbnail: record.thumbnail, favorite: record.favorite ?? false, blobHash,
    updatedAt: record.lastUpdated || record.date, revision: record.revision || 0,
  };
}

export async function ensurePersonalTextureCached(record: TextureMetadata): Promise<Blob | null> {
  if (!record.guid || !record.storagePath) return null;
  const cached = await getTextureBlobByGuid(record.guid);
  if (cached) return cached;
  try {
    const blob = await fetchPersonalTextureBlob(record.storagePath);
    await applyCloudTextureEntry(record, blob, record.revision || 0, record);
    return blob;
  } catch (error) {
    await markTextureUnavailable(record.guid);
    console.warn(`[personalTextureSync] Texture "${record.name}" is unavailable:`, error);
    return null;
  }
}

export async function syncPersonalTextures(uid: string, refresh = true): Promise<void> {
  publishPersonalSyncStatus('textures', {state: 'syncing', pending: 0});
  try {
    // Server-only metadata is authoritative for deletions; never infer deletion from an offline query.
    const [remote, local] = await Promise.all([refresh ? listPersonalTextureMetadata(uid) : Promise.resolve([]), getAllTextureCacheRecords()]);
    const remoteByGuid = new Map(remote.map(record => [record.guid, record]));
    let hydrationError: unknown;
    for (const cloud of remote) {
      const cached = local.find(entry => entry.guid === cloud.guid);
      if (cached && hasPendingPersonalChange(cached)) continue;
      const cachedBlob = cached ? await getTextureBlobByGuid(cloud.guid) : null;
      if (cached && (cached.revision || 0) >= cloud.revision && cachedBlob) continue;
      try {
        const sameContent = cachedBlob && cloud.blobHash && cached?.blobHash === cloud.blobHash;
        const blob = sameContent ? cachedBlob : await fetchPersonalTextureBlob(cloud.storagePath);
        if (!sameContent && cloud.blobHash && await textureBlobHash(blob) !== cloud.blobHash) {
          throw Object.assign(new Error('Texture changed during download; retry synchronization.'), {code: 'aborted'});
        }
        await applyCloudTextureEntry({...cloud, date: cloud.updatedAt, lastUpdated: cloud.updatedAt, origin: 'personal'}, blob, cloud.revision, cached ?? null);
      } catch (error) {
        hydrationError ??= error;
        if (cached) await markTextureUnavailable(cloud.guid);
      }
    }
    for (const cached of local) {
      if (refresh && cached.guid && cached.origin === 'personal' && cached.syncState === 'synced'
        && !cached.tombstone && !remoteByGuid.has(cached.guid)) {
        await purgeTextureEntryByGuid(cached.guid, cached);
      }
    }

    // Hydration failures do not prevent independent local changes from reaching GCP.
    for (const entry of await getAllTextureCacheRecords()) {
      if (!entry.guid || !hasPendingPersonalChange(entry)) continue;
      if (entry.syncState === 'deleting' || entry.tombstone) {
        await deletePersonalTexture(entry.guid);
        await purgeTextureEntryByGuid(entry.guid, entry);
        continue;
      }
      const snapshot = await getTextureCacheSnapshot(entry.guid);
      if (!snapshot) throw new Error(`Texture blob "${entry.name}" is missing.`);
      if (!matchesCacheSnapshot(snapshot.record, entry)) continue;
      let {blob} = snapshot;
      let record = entry;
      if (blob.type !== 'image/webp' || !entry.width || !entry.height || entry.width > 1024 || entry.height > 1024) {
        const normalized = await normalizeTextureBlob(blob);
        blob = normalized.blob;
        record = {...entry, width: normalized.width, height: normalized.height};
      }
      const hash = await textureBlobHash(blob);
      const cloud = remoteByGuid.get(entry.guid) ?? (!refresh && entry.blobHash && entry.storagePath
        ? {blobHash: entry.blobHash, storagePath: entry.storagePath} : undefined);
      let finalized: {guid: string; revision: number; storagePath: string};
      const uploadKey = `${uid}/${entry.guid}/${hash}`;
      if (cloud?.blobHash === hash) {
        finalized = await updatePersonalTextureDetails(localMetadataForRemote(record, blob, cloud.storagePath, hash));
      } else {
        let storagePath = uploaded.get(uploadKey);
        if (!storagePath) {
          const reservation = await reservePersonalTexture(entry.guid);
          storagePath = reservation.storagePath;
          await uploadPersonalTextureBlob(storagePath, blob, hash);
          uploaded.set(uploadKey, storagePath);
        }
        try {
          finalized = await finalizePersonalTexture(localMetadataForRemote(record, blob, storagePath, hash));
        } catch (error) {
          if ((error as {code?: string})?.code === 'aborted') uploaded.delete(uploadKey);
          throw error;
        }
        uploaded.delete(uploadKey);
      }
      await acknowledgeTextureEntry(entry.guid, finalized.revision, {
        storagePath: finalized.storagePath, contentType: 'image/webp',
        width: record.width, height: record.height, byteSize: blob.size, blobHash: hash,
      }, entry, blob);
    }
    if (hydrationError) throw hydrationError;
    const pending = (await getAllTextureCacheRecords()).filter(hasPendingPersonalChange).length;
    publishPersonalSyncStatus('textures', {state: pending ? 'syncing' : 'synced', pending, lastSyncedAt: new Date().toISOString()});
    if (pending) void requestPersonalTextureSync();
  } catch (error) {
    publishPersonalSyncStatus('textures', {state: 'error', pending: 0, lastError: error instanceof Error ? error.message : String(error)});
    throw error;
  }
}

const runner = createPersonalSyncRunner(syncPersonalTextures);

export function startPersonalTextureSync(uid: string): Promise<void> {
  setPersonalTextureSyncRequester(requestPersonalTextureSync);
  return runner.start(uid);
}

export function requestPersonalTextureSync(): Promise<void> {
  return runner.request();
}

export async function stopPersonalTextureSync(): Promise<void> {
  setPersonalTextureSyncRequester(null);
  await runner.stop();
  uploaded.clear();
  publishPersonalSyncStatus('textures', {state: 'idle', pending: 0});
}
