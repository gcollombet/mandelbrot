import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => {
  class MockTimestamp {
    constructor(readonly millis: number) {}
    toDate() { return new Date(this.millis); }
    static now() { return new MockTimestamp(Date.parse('2026-09-11T10:00:00.000Z')); }
    static fromMillis(millis: number) { return new MockTimestamp(millis); }
  }
  return {
    MockTimestamp,
    documents: new Map<string, unknown>(),
    transactionSet: vi.fn(),
    transactionDelete: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    uploadBytes: vi.fn(),
    deleteObject: vi.fn(),
    getBlob: vi.fn(),
    getMetadata: vi.fn(),
  };
});

function snapshot(path: string) {
  const present = mocks.documents.has(path);
  const data = mocks.documents.get(path);
  return {
    id: path.split('/').pop(),
    exists: () => present,
    data: () => data,
  };
}

vi.mock('../../src/firebaseConfig', () => ({
  getFirebaseServices: () => ({
    app: {kind: 'app'},
    auth: {currentUser: {uid: 'alice'}},
    db: {kind: 'db'},
    storage: {kind: 'storage'},
  }),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...segments) => ({kind: 'collection', path: segments.join('/')})),
  doc: vi.fn((_db, ...segments) => ({kind: 'document', path: segments.join('/')})),
  getDoc: vi.fn(reference => Promise.resolve(snapshot(reference.path))),
  getDocs: mocks.getDocs,
  query: vi.fn((reference, ...constraints) => ({reference, constraints})),
  runTransaction: vi.fn(async (_db, update) => update({
    get: (reference: {path: string}) => Promise.resolve(snapshot(reference.path)),
    set: mocks.transactionSet,
    delete: mocks.transactionDelete,
  })),
  serverTimestamp: vi.fn(() => ({kind: 'serverTimestamp'})),
  setDoc: mocks.setDoc,
  Timestamp: mocks.MockTimestamp,
  where: vi.fn((...values) => ({kind: 'where', values})),
}));

vi.mock('firebase/storage', () => ({
  deleteObject: mocks.deleteObject,
  getBlob: mocks.getBlob,
  getMetadata: mocks.getMetadata,
  ref: vi.fn((_storage, path) => ({path})),
  uploadBytes: mocks.uploadBytes,
}));

import {
  deletePersonalTexture,
  finalizePersonalTexture,
  getPersonalPresetManifest,
  repairExpiredPersonalTextureReservations,
  reservePersonalTexture,
  upsertPersonalPreset,
} from '../../src/personalLibraryRemote';

describe('direct personal library persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.documents.clear();
    mocks.getDocs.mockResolvedValue({docs: [], size: 0});
    mocks.deleteObject.mockResolvedValue(undefined);
    mocks.getMetadata.mockResolvedValue({contentType: 'image/webp', size: 4});
  });

  it('initializes an empty manifest and usage transaction for a new account', async () => {
    await expect(getPersonalPresetManifest()).resolves.toEqual({entries: [], revision: 1});
    expect(mocks.transactionSet).toHaveBeenCalledTimes(2);
    expect(mocks.transactionSet.mock.calls.map(call => call[0].path)).toEqual([
      'users/alice/manifests/presets',
      'users/alice/usage/current',
    ]);
  });

  it('atomically creates a preset, manifest entry, and usage count', async () => {
    mocks.documents.set('users/alice/manifests/presets', {entries: [], revision: 2});
    mocks.documents.set('users/alice/usage/current', {presetCount: 0, textureCount: 0, revision: 3});

    await expect(upsertPersonalPreset({
      guid: 'preset-a',
      type: 'completePreset',
      payload: {scale: 1},
      name: 'Preset A',
      favorite: false,
      updatedAt: '2026-09-10T00:00:00.000Z',
      revision: 0,
    })).resolves.toEqual({guid: 'preset-a', revision: 1, presetCount: 1});

    expect(mocks.transactionSet).toHaveBeenCalledTimes(3);
    const written = Object.fromEntries(mocks.transactionSet.mock.calls.map(call => [call[0].path, call[1]]));
    expect(written['users/alice/presets/preset-a']).toEqual(expect.objectContaining({ownerUid: 'alice', revision: 1}));
    expect(written['users/alice/manifests/presets'].entries).toEqual([
      {guid: 'preset-a', type: 'completePreset', revision: 1},
    ]);
    expect(written['users/alice/usage/current'].presetCount).toBe(1);
  });

  it('rejects a new preset at quota before issuing writes', async () => {
    mocks.documents.set('users/alice/manifests/presets', {entries: [], revision: 2});
    mocks.documents.set('users/alice/usage/current', {presetCount: 400, textureCount: 0, revision: 3});
    await expect(upsertPersonalPreset({
      guid: 'preset-a', type: 'completePreset', payload: {}, name: 'A', favorite: false, updatedAt: '', revision: 0,
    })).rejects.toThrow(/400-preset/);
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  it('keeps a previously counted texture reservation counted on retry', async () => {
    mocks.documents.set('users/alice/textureReservations/texture-a.webp', {counted: true});
    mocks.documents.set('users/alice/usage/current', {presetCount: 0, textureCount: 1, revision: 2});
    await expect(reservePersonalTexture('texture-a')).resolves.toEqual(expect.objectContaining({textureCount: 1}));
    const reservation = mocks.transactionSet.mock.calls.find(call => call[0].path.includes('textureReservations'))?.[1];
    expect(reservation.counted).toBe(true);
  });

  it('validates uploaded metadata and finalizes the texture directly', async () => {
    mocks.documents.set('users/alice/textureReservations/texture-a.webp', {counted: true});
    await expect(finalizePersonalTexture({
      guid: 'texture-a', name: 'Texture A', kind: 'texture', contentType: 'image/webp',
      storagePath: 'users/alice/textures/texture-a.webp', width: 2, height: 2, byteSize: 4,
      thumbnail: '', updatedAt: '2026-09-11T00:00:00.000Z', revision: 0,
    })).resolves.toEqual({guid: 'texture-a', revision: 1, storagePath: 'users/alice/textures/texture-a.webp'});
    expect(mocks.getMetadata).toHaveBeenCalledTimes(1);
    expect(mocks.transactionSet.mock.calls[0][0].path).toBe('users/alice/textures/texture-a');
    expect(mocks.transactionDelete.mock.calls[0][0].path).toContain('textureReservations');
  });

  it('treats an already missing Storage object as an idempotent texture delete', async () => {
    mocks.documents.set('users/alice/textures/texture-a', {guid: 'texture-a'});
    mocks.documents.set('users/alice/usage/current', {presetCount: 0, textureCount: 1, revision: 2});
    mocks.deleteObject.mockRejectedValue({code: 'storage/object-not-found'});
    await expect(deletePersonalTexture('texture-a')).resolves.toEqual({guid: 'texture-a', deleted: true, textureCount: 0});
  });

  it('removes a stale reservation without deleting a finalized texture blob', async () => {
    mocks.getDocs.mockResolvedValue({
      size: 1,
      docs: [{id: 'texture-a.webp', data: () => ({guid: 'texture-a'})}],
    });
    mocks.documents.set('users/alice/textureReservations/texture-a.webp', {guid: 'texture-a', counted: true});
    mocks.documents.set('users/alice/textures/texture-a', {guid: 'texture-a'});
    mocks.documents.set('users/alice/usage/current', {presetCount: 0, textureCount: 1, revision: 2});

    await expect(repairExpiredPersonalTextureReservations()).resolves.toBe(0);
    expect(mocks.transactionDelete).toHaveBeenCalledTimes(1);
    expect(mocks.deleteObject).not.toHaveBeenCalled();
  });
});
