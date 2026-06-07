import {describe, expect, it} from 'vitest';
import {buildRemotePresetMerge} from '../../src/presetStore';

describe('store merge contracts', () => {
  it('preserves local favorite and display name when remote preset payload updates', () => {
    const merged = buildRemotePresetMerge({
      id: 1,
      guid: 'preset-1',
      name: 'My Gold',
      value: {scale: '1'} as any,
      thumbnail: 'old-thumb',
      date: '2026-06-07T09:00:00.000Z',
      lastUpdated: '2026-06-07T09:00:00.000Z',
      scaleExponent: 0,
      favorite: true,
      remote: {publishedName: 'Gold', lastUpdated: '2026-06-07T09:00:00.000Z'},
    }, {
      guid: 'preset-1',
      name: 'Gold',
      value: {scale: '0.1'} as any,
      thumbnail: 'new-thumb',
      date: '2026-06-07T10:00:00.000Z',
      lastUpdated: '2026-06-07T10:00:00.000Z',
      scaleExponent: 1,
      favorite: false,
      remote: {publishedName: 'Gold', lastUpdated: '2026-06-07T10:00:00.000Z'},
    });

    expect(merged).toEqual(expect.objectContaining({
      id: 1,
      guid: 'preset-1',
      name: 'My Gold',
      thumbnail: 'new-thumb',
      favorite: true,
      remote: {publishedName: 'Gold', lastUpdated: '2026-06-07T10:00:00.000Z'},
    }));
  });
});
