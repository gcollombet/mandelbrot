import {beforeEach, describe, expect, it} from 'vitest';
import {GUEST_SCOPE, userScope} from '../../src/personalLibraryTypes';
import {
  consumesActivePersonalQuota,
  deletedCacheFields,
  isVisibleCacheRecord,
  localCacheFields,
  publicCacheFields,
  resolveLegacyCacheFields,
  scopedDatabaseName,
  setActiveLibraryScope,
  shouldQueuePersonalDelete,
} from '../../src/scopedCache';

describe('owner-scoped IndexedDB cache contracts', () => {
  beforeEach(() => setActiveLibraryScope(GUEST_SCOPE));

  it('uses legacy database names as the persistent guest scope', () => {
    expect(scopedDatabaseName('mandelbrot-presets')).toBe('mandelbrot-presets');
  });

  it('isolates each authenticated account in a separate database namespace', () => {
    setActiveLibraryScope(userScope('alice'));
    expect(scopedDatabaseName('mandelbrot-presets')).toContain('user%3Aalice');
    setActiveLibraryScope(userScope('bob'));
    expect(scopedDatabaseName('mandelbrot-presets')).toContain('user%3Abob');
  });

  it('migrates unscoped legacy records logically without changing identity', () => {
    const legacy = {guid: 'same-guid', remote: undefined};
    expect(resolveLegacyCacheFields(legacy)).toEqual(expect.objectContaining({
      guid: 'same-guid',
      ownerScopeKey: 'guest',
      origin: 'guest',
      syncState: 'local',
    }));
  });

  it('keeps public records out of personal quota and upload state', () => {
    setActiveLibraryScope(userScope('alice'));
    const record = publicCacheFields();
    expect(record.origin).toBe('public');
    expect(record.syncState).toBe('synced');
    expect(consumesActivePersonalQuota(record)).toBe(false);
  });

  it('marks authenticated personal writes pending and deletes as tombstones', () => {
    setActiveLibraryScope(userScope('alice'));
    const pending = localCacheFields();
    expect(pending).toEqual(expect.objectContaining({origin: 'personal', syncState: 'pending'}));
    expect(shouldQueuePersonalDelete(pending)).toBe(true);
    const deleted = deletedCacheFields(pending);
    expect(deleted).toEqual(expect.objectContaining({syncState: 'deleting', tombstone: true}));
    expect(isVisibleCacheRecord(deleted)).toBe(false);
  });
});
