import {afterEach, describe, expect, it, vi} from 'vitest';
import {createPersonalSyncRunner, personalSyncRetryDelay} from '../../src/personalSyncRunner';
import {combinePersonalSyncStatus} from '../../src/personalSyncStatus';

afterEach(() => vi.useRealTimers());

describe('personal sync retries and status', () => {
  it('backs off transport errors and stops retrying permission/quota/validation failures', () => {
    expect([1, 2, 3, 9].map(n => personalSyncRetryDelay({code: 'unavailable'}, n))).toEqual([15000, 30000, 60000, 300000]);
    for (const code of ['permission-denied', 'storage/unauthorized', 'quota-exceeded', 'invalid-byte-size']) {
      expect(personalSyncRetryDelay({code}, 1)).toBeNull();
    }
  });

  it('does not allow coalesced edits to bypass failure backoff, and cancels stale timers', async () => {
    vi.useFakeTimers();
    let reject!: (error: unknown) => void;
    const sync = vi.fn().mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; })).mockResolvedValue(undefined);
    const runner = createPersonalSyncRunner(sync);
    const first = runner.start('alice');
    void runner.request();
    reject({code: 'unavailable'});
    await first;
    expect(sync).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(14999);
    expect(sync).toHaveBeenCalledTimes(1);
    await runner.request(); // A new explicit edit retries immediately and cancels the old timer.
    await vi.advanceTimersByTimeAsync(300000);
    expect(sync).toHaveBeenCalledTimes(2);
    await runner.stop();
  });

  it('drains changes made during a successful upload before resolving', async () => {
    let finish!: () => void;
    const sync = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
    const runner = createPersonalSyncRunner(sync);
    const done = runner.start('alice');
    void runner.request();
    finish();
    await done;
    expect(sync).toHaveBeenCalledTimes(2);
    await runner.stop();
  });

  it('cannot announce synced while textures are pending or failed', () => {
    const presets = {state: 'synced' as const, pending: 0};
    expect(combinePersonalSyncStatus([presets, {state: 'syncing', pending: 1}]).state).toBe('syncing');
    expect(combinePersonalSyncStatus([presets, {state: 'error', pending: 1, lastError: 'Storage refused'}])).toMatchObject({state: 'error', pending: 1, lastError: 'Storage refused'});
    expect(combinePersonalSyncStatus([presets, {state: 'synced', pending: 0}]).state).toBe('synced');
  });
});
