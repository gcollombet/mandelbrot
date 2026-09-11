import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => {
  class MockTimestamp {
    constructor(readonly date: Date) {}
    toDate() { return this.date; }
    static now() { return new MockTimestamp(new Date('2026-09-10T12:00:00.000Z')); }
    static fromDate(date: Date) { return new MockTimestamp(date); }
  }
  return {
    MockTimestamp,
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    transactionGet: vi.fn(),
    transactionSet: vi.fn(),
    runTransaction: vi.fn(),
  };
});

vi.mock('../../src/firebaseConfig', () => ({
  getFirebaseServices: () => ({db: {kind: 'db'}, storage: {kind: 'storage'}}),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...segments) => ({kind: 'collection', path: segments.join('/')})),
  doc: vi.fn((_db, ...segments) => ({kind: 'document', path: segments.join('/')})),
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  limit: vi.fn(value => ({kind: 'limit', value})),
  query: vi.fn((reference, ...constraints) => ({reference, constraints})),
  runTransaction: mocks.runTransaction,
  Timestamp: mocks.MockTimestamp,
  where: vi.fn((...values) => ({kind: 'where', values})),
}));

vi.mock('firebase/storage', () => ({
  getBlob: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}));

import {uploadRemoteCatalogEntry} from '../../src/remoteCatalog';

describe('remoteCatalog publication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDocs.mockResolvedValue({docs: []});
    mocks.transactionGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        schemaVersion: 1,
        entries: [],
        updatedAt: new mocks.MockTimestamp(new Date('2026-09-10T11:00:00.000Z')),
      }),
    });
    mocks.runTransaction.mockImplementation(async (_db, update) => update({
      get: mocks.transactionGet,
      set: mocks.transactionSet,
    }));
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'preset-a',
      data: () => ({
        guid: 'preset-a',
        name: 'Preset A',
        value: {scale: '1'},
        thumbnail: 'thumb',
        lastUpdated: new mocks.MockTimestamp(new Date('2026-09-10T12:00:00.000Z')),
      }),
    });
  });

  it('writes payload and manifest atomically with the same timestamp', async () => {
    await uploadRemoteCatalogEntry('completePreset', {
      guid: 'preset-a',
      name: 'Preset A',
      value: {scale: '1'} as any,
      thumbnail: 'thumb',
      lastUpdated: '2026-09-09T10:00:00.000Z',
    });

    expect(mocks.runTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.transactionSet).toHaveBeenCalledTimes(2);
    const payload = mocks.transactionSet.mock.calls.find(call => call[0].path === 'catalog/completePreset/entries/preset-a')?.[1];
    const manifest = mocks.transactionSet.mock.calls.find(call => call[0].path === 'catalogManifest/current')?.[1];
    expect(payload.lastUpdated).toBeInstanceOf(mocks.MockTimestamp);
    expect(manifest.entries).toEqual([
      {type: 'completePreset', guid: 'preset-a', lastUpdated: payload.lastUpdated},
    ]);
    expect(manifest.updatedAt.toDate().toISOString()).toBe(payload.lastUpdated.toDate().toISOString());
  });

  it('does not write a payload when the migrated manifest is absent', async () => {
    mocks.transactionGet.mockResolvedValue({exists: () => false});

    await expect(uploadRemoteCatalogEntry('completePreset', {
      guid: 'preset-a',
      name: 'Preset A',
      value: {scale: '1'} as any,
      thumbnail: 'thumb',
      lastUpdated: '2026-09-09T10:00:00.000Z',
    })).rejects.toThrow(/has not been migrated/);
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });
});
