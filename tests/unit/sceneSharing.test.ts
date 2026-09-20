import {beforeEach, describe, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({
  uid: 'alice', scope: {kind: 'user', uid: 'alice'} as {kind: string; uid?: string},
  getPresetById: vi.fn(), updatePresetEntry: vi.fn(), getSharedPresetRecord: vi.fn(), getSharedTexture: vi.fn(),
  requestPersonalPresetSync: vi.fn(), requestPersonalTextureSync: vi.fn(),
  getAllTextureEntries: vi.fn(), registerSharedTexture: vi.fn(),
}));
vi.mock('../../src/firebaseConfig', () => ({getFirebaseServices: () => ({auth: {currentUser: mocks.uid ? {uid: mocks.uid} : null}})}));
vi.mock('../../src/scopedCache', () => ({getActiveLibraryScope: () => mocks.scope}));
vi.mock('../../src/presetStore', () => ({getPresetById: mocks.getPresetById, updatePresetEntry: mocks.updatePresetEntry}));
vi.mock('../../src/personalLibraryRemote', () => ({getSharedPresetRecord: mocks.getSharedPresetRecord, getSharedTexture: mocks.getSharedTexture}));
vi.mock('../../src/personalPresetSync', () => ({requestPersonalPresetSync: mocks.requestPersonalPresetSync}));
vi.mock('../../src/personalTextureSync', () => ({requestPersonalTextureSync: mocks.requestPersonalTextureSync}));
vi.mock('../../src/textureStore', () => ({getAllTextureEntries: mocks.getAllTextureEntries}));
vi.mock('../../src/sharedSceneTextures', () => ({registerSharedTexture: mocks.registerSharedTexture}));
import {loadSharedScene, prepareSceneShare, sceneShareQuery} from '../../src/sceneSharing';
const value = {cx: '-0.7', cy: '0', scale: '1e-50', colorStops: [], textureGuid: 'texture-a', textureName: 'Gold'};
const record = {id: 1, guid: 'scene-a', origin: 'personal', syncState: 'synced', value};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.uid = 'alice'; mocks.scope = {kind: 'user', uid: 'alice'};
  mocks.getPresetById.mockResolvedValue({...record});
  mocks.getAllTextureEntries.mockResolvedValue([{guid: 'texture-a', name: 'Gold', origin: 'personal', syncState: 'synced'}]);
  mocks.getSharedPresetRecord.mockResolvedValue({type: 'completePreset', name: 'Spirale', updatedAt: '2026-09-20', payload: {value}});
});

describe('scene sharing', () => {
  it('uses the existing owner and GUID and waits for both syncs', async () => {
    expect(await prepareSceneShare(1)).toEqual(sceneShareQuery('alice', 'scene-a'));
    expect(mocks.requestPersonalTextureSync).toHaveBeenCalledOnce();
    expect(mocks.requestPersonalPresetSync).toHaveBeenCalledOnce();
  });
  it('adds portable GUID references to older name-only presets', async () => {
    mocks.getPresetById.mockResolvedValue({...record, value: {...value, textureGuid: undefined}});
    await prepareSceneShare(1);
    expect(mocks.updatePresetEntry).toHaveBeenCalledWith(expect.objectContaining({value: expect.objectContaining({textureGuid: 'texture-a'})}));
  });
  it('keeps catalogue links available to guests without syncing', async () => {
    mocks.uid = ''; mocks.scope = {kind: 'guest'};
    mocks.getPresetById.mockResolvedValue({...record, remote: {}});
    expect(await prepareSceneShare(1)).toEqual({preset: 'scene-a'});
    expect(mocks.requestPersonalPresetSync).not.toHaveBeenCalled();
  });
  it('does not report success when the sync runner swallowed a failure', async () => {
    mocks.getPresetById.mockResolvedValue({...record, syncState: 'pending'});
    await expect(prepareSceneShare(1)).rejects.toThrow('pas encore synchronisée');
  });
  it('rejects unsynchronized textures and account changes', async () => {
    mocks.getAllTextureEntries.mockResolvedValue([{guid: 'texture-a', origin: 'personal', syncState: 'pending'}]);
    await expect(prepareSceneShare(1)).rejects.toThrow('texture');
    mocks.getAllTextureEntries.mockResolvedValue([{guid: 'texture-a', origin: 'public'}]);
    mocks.requestPersonalPresetSync.mockImplementation(async () => { mocks.uid = 'bob'; });
    await expect(prepareSceneShare(1)).rejects.toThrow('pas encore synchronisée');
  });
  it('opens a shared preset as a guest and isolates its textures from same-GUID local records', async () => {
    mocks.uid = ''; mocks.scope = {kind: 'guest'};
    const blob = new Blob(['texture']);
    mocks.getSharedTexture.mockResolvedValue({metadata: {name: 'Gold', updatedAt: 'today'}, blob});
    const result = await loadSharedScene('alice', 'scene-a');
    expect(mocks.getSharedPresetRecord).toHaveBeenCalledWith('alice', 'scene-a');
    expect(result.value.textureGuid).toBe('shared:alice:texture-a');
    expect(mocks.registerSharedTexture).toHaveBeenCalledWith(expect.objectContaining({guid: 'shared:alice:texture-a'}), blob);
    expect(result.id).toBe(-1);
    expect(result.remote).toBeUndefined();
  });
  it('does not download catalogue textures again', async () => {
    mocks.getAllTextureEntries.mockResolvedValue([{guid: 'texture-a', name: 'Catalog gold', origin: 'public'}]);
    expect((await loadSharedScene('alice', 'scene-a')).value.textureName).toBe('Catalog gold');
    expect(mocks.getSharedTexture).not.toHaveBeenCalled();
  });
  it('reports deleted scenes, wrong preset types, and missing dependencies', async () => {
    mocks.getSharedPresetRecord.mockResolvedValueOnce(null);
    await expect(loadSharedScene('alice', 'missing')).rejects.toThrow('supprimée');
    mocks.getSharedPresetRecord.mockResolvedValueOnce({type: 'palettePreset'});
    await expect(loadSharedScene('alice', 'palette')).rejects.toThrow('introuvable');
    mocks.scope = {kind: 'guest'};
    mocks.getSharedTexture.mockResolvedValue(null);
    await expect(loadSharedScene('alice', 'scene-a')).rejects.toThrow('texture');
  });
});
