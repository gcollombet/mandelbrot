import {describe, expect, it} from 'vitest';
import {buildGuestImportPlan, type GuestLibrarySnapshot} from '../../src/guestLibraryImport';

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
});
