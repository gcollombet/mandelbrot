import {describe, expect, it} from 'vitest';
import {
  buildGuestImportPlan,
  findResumableGuestImportBatch,
  isGuestImportBatchComplete,
  resumableBatchForPlan,
  type GuestLibrarySnapshot,
} from '../../src/guestLibraryImport';
import type {GuestImportBatch} from '../../src/personalLibraryTypes';

function snapshot(presetCount: number, textureCount: number): GuestLibrarySnapshot {
  return {
    presets: Array.from({length: presetCount}, (_, index) => ({
      type: 'stopPreset' as const,
      record: {guid: `preset-${index}`, name: `Preset ${index}`, values: {}, date: '', lastUpdated: '', origin: 'guest'},
    })),
    textures: Array.from({length: textureCount}, (_, index) => ({
      record: {guid: `texture-${index}`, name: `Texture ${index}`, thumbnail: '', date: '', origin: 'guest'},
      blob: new Blob(['webp'], {type: 'image/webp'}),
    })),
  };
}

describe('guest library import planning', () => {
  it('counts only GUIDs missing from the account', () => {
    const plan = buildGuestImportPlan('user-a', snapshot(3, 2), new Set(['preset-1']), new Set(['texture-0']), {presetCount: 10, textureCount: 3});
    expect(plan.missingPresets.map(entry => entry.record.guid)).toEqual(['preset-0', 'preset-2']);
    expect(plan.missingTextures.map(entry => entry.record.guid)).toEqual(['texture-1']);
    expect(plan.presetCount).toBe(12);
    expect(plan.textureCount).toBe(4);
    expect(plan.canImport).toBe(true);
  });

  it('blocks the whole import when either quota would be exceeded', () => {
    const plan = buildGuestImportPlan('user-a', snapshot(2, 2), new Set(), new Set(), {presetCount: 399, textureCount: 9});
    expect(plan.canImport).toBe(false);
    expect(plan.blockingReason).toContain('400-preset limit');
    expect(plan.blockingReason).toContain('10-texture limit');
  });

  it('allows the same guest snapshot to be planned independently for another account', () => {
    const guest = snapshot(1, 1);
    const first = buildGuestImportPlan('user-a', guest, new Set(['preset-0']), new Set(['texture-0']), {presetCount: 1, textureCount: 1});
    const second = buildGuestImportPlan('user-b', guest, new Set(), new Set(), {presetCount: 0, textureCount: 0});
    expect(first.missingPresets).toHaveLength(0);
    expect(second.missingPresets).toHaveLength(1);
    expect(second.missingTextures[0].record.guid).toBe('texture-0');
  });

  it('resumes the latest matching interrupted batch for the same account', () => {
    const guest = snapshot(3, 2);
    const batches: GuestImportBatch[] = [
      {
        id: 'other-user',
        uid: 'user-b',
        status: 'error',
        presetGuids: ['preset-0'],
        textureGuids: [],
        completedPresetGuids: [],
        completedTextureGuids: [],
        updatedAt: '2026-07-15T02:00:00.000Z',
      },
      {
        id: 'import-a',
        uid: 'user-a',
        status: 'error',
        presetGuids: ['preset-0', 'preset-1'],
        textureGuids: ['texture-0'],
        completedPresetGuids: ['preset-0'],
        completedTextureGuids: [],
        updatedAt: '2026-07-15T01:00:00.000Z',
        lastError: 'offline',
      },
    ];
    expect(findResumableGuestImportBatch('user-a', guest, batches)?.id).toBe('import-a');

    const existingPresets = new Set(['preset-0', 'preset-1']);
    const existingTextures = new Set(['texture-0']);
    const plan = buildGuestImportPlan('user-a', guest, existingPresets, existingTextures, {presetCount: 2, textureCount: 1});
    const resumed = resumableBatchForPlan(plan, batches, existingPresets, existingTextures);

    expect(resumed).toEqual(expect.objectContaining({
      id: 'import-a',
      status: 'pending',
      presetGuids: ['preset-0', 'preset-1', 'preset-2'],
      textureGuids: ['texture-0', 'texture-1'],
      completedPresetGuids: ['preset-0', 'preset-1'],
      completedTextureGuids: ['texture-0'],
    }));
    expect(resumed).not.toHaveProperty('lastError');
    expect(isGuestImportBatchComplete(resumed!)).toBe(false);
  });

  it('retries a previously completed GUID when it is no longer present in the account', () => {
    const guest = snapshot(1, 0);
    const batch: GuestImportBatch = {
      id: 'import-a',
      uid: 'user-a',
      status: 'error',
      presetGuids: ['preset-0'],
      textureGuids: [],
      completedPresetGuids: ['preset-0'],
      completedTextureGuids: [],
      updatedAt: '2026-07-15T01:00:00.000Z',
    };
    const plan = buildGuestImportPlan('user-a', guest, new Set(), new Set(), {presetCount: 0, textureCount: 0});
    const resumed = resumableBatchForPlan(plan, [batch], new Set(), new Set());
    expect(resumed?.completedPresetGuids).toEqual([]);
    expect(isGuestImportBatchComplete(resumed!)).toBe(false);
  });

  it('does not resume a completed or source-incompatible batch', () => {
    const guest = snapshot(1, 0);
    const batches: GuestImportBatch[] = [
      {
        id: 'complete',
        uid: 'user-a',
        status: 'complete',
        presetGuids: ['preset-0'],
        textureGuids: [],
        completedPresetGuids: ['preset-0'],
        completedTextureGuids: [],
        updatedAt: '2026-07-15T01:00:00.000Z',
      },
      {
        id: 'missing-source',
        uid: 'user-a',
        status: 'error',
        presetGuids: ['preset-removed'],
        textureGuids: [],
        completedPresetGuids: [],
        completedTextureGuids: [],
        updatedAt: '2026-07-15T02:00:00.000Z',
      },
    ];
    expect(findResumableGuestImportBatch('user-a', guest, batches)).toBeUndefined();
  });
});
