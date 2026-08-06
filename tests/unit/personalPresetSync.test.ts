import {describe, expect, it} from 'vitest';
import {
  personalEnvelope,
  planPersonalRecordSync,
  shouldPurgePersonalRecord,
} from '../../src/personalPresetSync';

describe('personal preset synchronization planning', () => {
  it('hydrates an empty device from a cloud revision', () => {
    expect(planPersonalRecordSync(undefined, 1)).toBe('pull');
  });

  it('pushes offline writes and deletes instead of overwriting them', () => {
    expect(planPersonalRecordSync({name: 'A', syncState: 'pending', revision: 1}, 2)).toBe('push');
    expect(planPersonalRecordSync({name: 'A', syncState: 'deleting', tombstone: true, revision: 1}, 2)).toBe('delete');
  });

  it('pulls a newer cross-device revision only over a clean cache', () => {
    expect(planPersonalRecordSync({name: 'A', syncState: 'synced', revision: 1}, 2)).toBe('pull');
    expect(planPersonalRecordSync({name: 'A', syncState: 'synced', revision: 2}, 2)).toBe('none');
  });

  it('purges only clean personal cache records missing from the remote manifest', () => {
    const synced = {guid: 'preset-1', name: 'A', origin: 'personal' as const, syncState: 'synced' as const};
    expect(shouldPurgePersonalRecord(synced, 'completePreset')).toBe(true);
    expect(shouldPurgePersonalRecord(
      synced,
      'completePreset',
      {guid: 'preset-1', type: 'completePreset', revision: 1},
    )).toBe(false);
    expect(shouldPurgePersonalRecord(
      synced,
      'completePreset',
      {guid: 'preset-1', type: 'palettePreset', revision: 1},
    )).toBe(true);
    expect(shouldPurgePersonalRecord({...synced, syncState: 'pending'}, 'completePreset')).toBe(false);
    expect(shouldPurgePersonalRecord({...synced, origin: 'public'}, 'completePreset')).toBe(false);
  });

  it('serializes thumbnails and favorites without local cache fields', () => {
    const envelope = personalEnvelope('completePreset', {
      guid: 'preset-1',
      name: 'Preset',
      thumbnail: 'data:image/png;base64,abc',
      favorite: true,
      lastUpdated: '2026-07-15T00:00:00.000Z',
      origin: 'personal',
      ownerScopeKey: 'user:alice',
      syncState: 'pending',
      revision: 2,
      tombstone: false,
    });
    expect(envelope).toEqual(expect.objectContaining({guid: 'preset-1', favorite: true, thumbnail: 'data:image/png;base64,abc'}));
    expect(envelope.payload).not.toHaveProperty('origin');
    expect(envelope.payload).not.toHaveProperty('syncState');
  });
});
