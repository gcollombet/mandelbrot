import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const remote = vi.hoisted(() => ({
  presets: new Map<string, any>(), textures: new Map<string, any>(),
  getPersonalPresetManifest: vi.fn(), getPersonalPresetRecord: vi.fn(), upsertPersonalPreset: vi.fn(), deletePersonalPreset: vi.fn(),
  listPersonalTextureMetadata: vi.fn(), fetchPersonalTextureBlob: vi.fn(), reservePersonalTexture: vi.fn(),
  uploadPersonalTextureBlob: vi.fn(), finalizePersonalTexture: vi.fn(), updatePersonalTextureDetails: vi.fn(), deletePersonalTexture: vi.fn(),
}));
vi.mock('../../src/personalLibraryRemote', () => remote);

import {setActiveLibraryScope} from '../../src/scopedCache';
import {savePresetEntry, updatePresetEntry, getPresetByGuid, getAllPresetCacheRecords, deletePresetEntry, acknowledgePresetEntry, purgePresetEntryByGuid, applyCloudPresetEntry} from '../../src/presetStore';
import {startPersonalPresetSync, stopPersonalPresetSync, syncPersonalPresets} from '../../src/personalPresetSync';
import {startPersonalTextureSync, stopPersonalTextureSync, syncPersonalTextures, textureBlobHash} from '../../src/personalTextureSync';
import {saveTextureEntry, getTextureMetadataByGuid, getTextureBlobByGuid, updateTextureMetadata, getAllTextureCacheRecords, renameTextureEntry} from '../../src/textureStore';
import {observePersonalSyncStatus} from '../../src/personalSyncStatus';

import {savePaletteEntry, getPaletteByGuid, acknowledgePaletteEntry} from '../../src/paletteStore';
import {saveStopPresetEntry, getStopPresetByGuid, acknowledgeStopPresetEntry} from '../../src/stopPresetStore';
import {saveAnimationPresetEntry, getAnimationPresetByGuid, acknowledgeAnimationPresetEntry} from '../../src/animationPresetStore';
import {saveTextureMappingPresetEntry, getTextureMappingPresetByGuid, acknowledgeTextureMappingPresetEntry} from '../../src/textureMappingPresetStore';

const blob = new Blob(['webp-fixture'], {type: 'image/webp'});
const details = {width: 2, height: 2};
let uid: string;

beforeEach(() => {
  uid = crypto.randomUUID();
  setActiveLibraryScope({kind: 'user', uid});
  vi.resetAllMocks();
  remote.presets.clear(); remote.textures.clear();
  remote.getPersonalPresetManifest.mockImplementation(async () => ({revision: 1, entries: [...remote.presets.values()].map(({guid, type, revision}) => ({guid, type, revision}))}));
  remote.getPersonalPresetRecord.mockImplementation(async (_uid, guid) => remote.presets.get(guid) ?? null);
  remote.upsertPersonalPreset.mockImplementation(async record => {
    const revision = (remote.presets.get(record.guid)?.revision ?? 0) + 1;
    remote.presets.set(record.guid, structuredClone({...record, revision}));
    return {guid: record.guid, revision};
  });
  remote.deletePersonalPreset.mockImplementation(async guid => { remote.presets.delete(guid); });
  remote.listPersonalTextureMetadata.mockImplementation(async () => structuredClone([...remote.textures.values()]));
  remote.fetchPersonalTextureBlob.mockResolvedValue(blob);
  remote.reservePersonalTexture.mockImplementation(async guid => ({storagePath: `users/${uid}/textures/${guid}.webp`}));
  remote.uploadPersonalTextureBlob.mockResolvedValue(undefined);
  const finalize = async metadata => {
    const revision = (remote.textures.get(metadata.guid)?.revision ?? 0) + 1;
    remote.textures.set(metadata.guid, {...metadata, revision});
    return {guid: metadata.guid, revision, storagePath: metadata.storagePath};
  };
  remote.finalizePersonalTexture.mockImplementation(finalize);
  remote.updatePersonalTextureDetails.mockImplementation(finalize);
  remote.deletePersonalTexture.mockImplementation(async guid => { remote.textures.delete(guid); });
});
afterEach(async () => { await stopPersonalPresetSync(); await stopPersonalTextureSync(); });

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return {promise, resolve};
}

async function savePreset() {
  await savePresetEntry({scale: '1'} as any, '', 'A', undefined, false, 'preset-a');
  return (await getPresetByGuid('preset-a'))!;
}
async function saveTexture(content = blob) {
  await saveTextureEntry('A', content, '', undefined, 'texture-a', false, undefined, details);
  return (await getTextureMetadataByGuid('texture-a'))!;
}

describe('durable cache and GCP synchronization', () => {
  it('sends a second edit made during the first upload, instead of falsely acknowledging it', async () => {
    const entry = await savePreset();
    const entered = deferred(), release = deferred();
    const original = remote.upsertPersonalPreset.getMockImplementation()!;
    remote.upsertPersonalPreset.mockImplementationOnce(async value => {
      entered.resolve(); await release.promise; return original(value);
    });
    const done = startPersonalPresetSync(uid);
    await entered.promise;
    await updatePresetEntry({...entry, name: 'B'});
    release.resolve();
    await done;
    expect(remote.upsertPersonalPreset).toHaveBeenCalledTimes(2);
    expect(remote.presets.get('preset-a').payload.name).toBe('B');
    expect(await getPresetByGuid('preset-a')).toMatchObject({name: 'B', syncState: 'synced', revision: 2});
    expect(remote.getPersonalPresetManifest).toHaveBeenCalledTimes(1);
    expect(remote.presets.get('preset-a').payload).not.toHaveProperty('localChangeId');
  });

  it('preserves a deletion during upload and sends it to GCP next', async () => {
    const entry = await savePreset();
    const entered = deferred(), release = deferred();
    const original = remote.upsertPersonalPreset.getMockImplementation()!;
    remote.upsertPersonalPreset.mockImplementationOnce(async value => { entered.resolve(); await release.promise; return original(value); });
    const done = startPersonalPresetSync(uid);
    await entered.promise;
    await deletePresetEntry(entry.id);
    release.resolve(); await done;
    expect(remote.deletePersonalPreset).toHaveBeenCalledWith('preset-a');
    expect(remote.presets.has('preset-a')).toBe(false);
    expect(await getAllPresetCacheRecords()).toEqual([]);
  });

  it('guards acknowledgement, pull and purge against a newer local version inside IndexedDB', async () => {
    const sent = await savePreset();
    await updatePresetEntry({...sent, name: 'New edit'});
    await acknowledgePresetEntry(sent.guid, 1, sent);
    await applyCloudPresetEntry({...sent, name: 'Old cloud value'}, 2, sent);
    await purgePresetEntryByGuid(sent.guid, sent);
    expect(await getPresetByGuid(sent.guid)).toMatchObject({name: 'New edit', syncState: 'pending'});
  });

  it.each([
    ['palette', savePaletteEntry, getPaletteByGuid, acknowledgePaletteEntry, {colorStops: []}],
    ['stop', saveStopPresetEntry, getStopPresetByGuid, acknowledgeStopPresetEntry, {values: {color: '#fff'}}],
    ['animation', saveAnimationPresetEntry, getAnimationPresetByGuid, acknowledgeAnimationPresetEntry, {animation: {}}],
    ['mapping', saveTextureMappingPresetEntry, getTextureMappingPresetByGuid, acknowledgeTextureMappingPresetEntry, {mapping: {}}],
  ] as const)('protects pending edits in the %s store as well', async (_name, save, get, acknowledge, payload) => {
    await save({guid: 'a', name: 'A', date: '2026-09-11', lastUpdated: '2026-09-11', ...payload} as any);
    const sent = (await get('a'))!;
    await save({...sent, favorite: true} as any);
    await acknowledge('a', 1, sent);
    expect(await get('a')).toMatchObject({favorite: true, syncState: 'pending'});
  });

  it('downloads new server revisions when synchronization starts again (page reload)', async () => {
    await savePreset(); await startPersonalPresetSync(uid); await stopPersonalPresetSync();
    const cloud = remote.presets.get('preset-a');
    remote.presets.set('preset-a', {...cloud, revision: 2, payload: {...cloud.payload, name: 'Other device'}});
    await startPersonalPresetSync(uid);
    expect(await getPresetByGuid('preset-a')).toMatchObject({name: 'Other device', revision: 2});
    expect(remote.getPersonalPresetManifest).toHaveBeenCalledTimes(2);
    expect(remote.getPersonalPresetRecord).toHaveBeenCalledTimes(1);
  });

  it('keeps failed saves pending in IndexedDB and retries them on restart', async () => {
    await savePreset();
    remote.upsertPersonalPreset.mockRejectedValueOnce({code: 'permission-denied'});
    await startPersonalPresetSync(uid); await stopPersonalPresetSync();
    expect(await getPresetByGuid('preset-a')).toMatchObject({syncState: 'pending'});
    await startPersonalPresetSync(uid);
    expect(remote.presets.has('preset-a')).toBe(true);
    expect(await getPresetByGuid('preset-a')).toMatchObject({syncState: 'synced'});
  });

  it('does not upload or download an unchanged texture on reload', async () => {
    await saveTexture(); await syncPersonalTextures(uid);
    await syncPersonalTextures(uid);
    expect(remote.uploadPersonalTextureBlob).toHaveBeenCalledTimes(1);
    expect(remote.fetchPersonalTextureBlob).not.toHaveBeenCalled();
  });

  it('syncs favorites and names without re-uploading the blob, and reuses it for remote metadata changes', async () => {
    await saveTexture(); await syncPersonalTextures(uid);
    const entry = (await getTextureMetadataByGuid('texture-a'))!;
    await updateTextureMetadata({...entry, favorite: true});
    await syncPersonalTextures(uid, false);
    expect(remote.updatePersonalTextureDetails).toHaveBeenCalledTimes(1);
    expect(remote.textures.get('texture-a').favorite).toBe(true);
    await renameTextureEntry('A', 'Renamed');
    await syncPersonalTextures(uid);
    expect(remote.textures.get('texture-a').name).toBe('Renamed');
    expect(remote.uploadPersonalTextureBlob).toHaveBeenCalledTimes(1);
    const cloud = remote.textures.get('texture-a');
    remote.textures.set('texture-a', {...cloud, favorite: false, revision: cloud.revision + 1});
    await syncPersonalTextures(uid);
    expect(remote.fetchPersonalTextureBlob).not.toHaveBeenCalled();
    expect(await getTextureMetadataByGuid('texture-a')).toMatchObject({favorite: false, syncState: 'synced'});
  });

  it('propagates remote texture deletion but preserves and uploads a pending local modification', async () => {
    await saveTexture(); await syncPersonalTextures(uid);
    remote.textures.clear();
    await syncPersonalTextures(uid);
    expect(await getAllTextureCacheRecords()).toEqual([]);
    await saveTexture(); await syncPersonalTextures(uid);
    remote.textures.clear();
    const entry = (await getTextureMetadataByGuid('texture-a'))!;
    await updateTextureMetadata({...entry, favorite: true});
    await syncPersonalTextures(uid);
    expect(remote.textures.get('texture-a').favorite).toBe(true);
    expect(await getTextureBlobByGuid('texture-a')).not.toBeNull();
  });

  it('uploads the latest bytes when a texture is replaced during an upload', async () => {
    await saveTexture();
    const entered = deferred(), release = deferred();
    remote.uploadPersonalTextureBlob.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const done = startPersonalTextureSync(uid);
    await entered.promise;
    const replacement = new Blob(['new bytes'], {type: 'image/webp'});
    await saveTexture(replacement);
    release.resolve(); await done;
    expect(remote.uploadPersonalTextureBlob).toHaveBeenCalledTimes(2);
    expect(remote.textures.get('texture-a').blobHash).toBe(await textureBlobHash(replacement));
    expect(await (await getTextureBlobByGuid('texture-a'))!.text()).toBe('new bytes');
    expect(await getTextureMetadataByGuid('texture-a')).toMatchObject({syncState: 'synced'});
  });

  it('retries finalization without uploading the same image again', async () => {
    await saveTexture();
    remote.finalizePersonalTexture.mockRejectedValueOnce({code: 'unavailable'});
    await expect(syncPersonalTextures(uid)).rejects.toMatchObject({code: 'unavailable'});
    await syncPersonalTextures(uid);
    expect(remote.uploadPersonalTextureBlob).toHaveBeenCalledTimes(1);
    expect(remote.finalizePersonalTexture).toHaveBeenCalledTimes(2);
    expect(await getTextureMetadataByGuid('texture-a')).toMatchObject({syncState: 'synced'});
  });

  it('exposes Storage failures even if presets are fully synced', async () => {
    await syncPersonalPresets(uid);
    await saveTexture();
    remote.uploadPersonalTextureBlob.mockRejectedValueOnce(new Error('Storage refused'));
    let latest: any;
    const stop = observePersonalSyncStatus(value => { latest = value; });
    await startPersonalTextureSync(uid);
    expect(latest).toMatchObject({state: 'error', lastError: 'Storage refused'});
    expect(await getTextureMetadataByGuid('texture-a')).toMatchObject({syncState: 'pending'});
    stop();
  });
});
