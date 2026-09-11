import {describe, expect, it} from 'vitest';
import {
  assertPersonalPresetPayloadSize,
  normalizePersonalPresetManifestEntries,
  personalQuotaCountAfter,
  PersonalLibraryQuotaError,
  removePersonalPresetManifestEntry,
  requirePersonalGuid,
  upsertPersonalPresetManifestEntry,
  validatePersonalTextureMetadata,
} from '../../src/personalLibraryValidation';

describe('personal library direct validation', () => {
  it('normalizes, deduplicates, and sorts manifest entries', () => {
    expect(normalizePersonalPresetManifestEntries([
      {guid: 'b', type: 'palettePreset', revision: 2},
      {guid: 'a', type: 'completePreset', revision: 1},
      {guid: 'b', type: 'palettePreset', revision: 3},
      {guid: '../bad', type: 'completePreset', revision: 1},
    ])).toEqual([
      {guid: 'a', type: 'completePreset', revision: 1},
      {guid: 'b', type: 'palettePreset', revision: 3},
    ]);
  });

  it('upserts and removes manifest entries deterministically', () => {
    const updated = upsertPersonalPresetManifestEntry(
      [{guid: 'b', type: 'palettePreset', revision: 1}],
      {guid: 'a', type: 'stopPreset', revision: 2},
    );
    expect(updated.map(entry => entry.guid)).toEqual(['a', 'b']);
    expect(removePersonalPresetManifestEntry(updated, 'a')).toEqual([
      {guid: 'b', type: 'palettePreset', revision: 1},
    ]);
  });

  it('enforces normal-client preset and texture quota boundaries', () => {
    expect(personalQuotaCountAfter('preset', 399, false, 'upsert')).toBe(400);
    expect(personalQuotaCountAfter('texture', 9, false, 'upsert')).toBe(10);
    expect(() => personalQuotaCountAfter('preset', 400, false, 'upsert')).toThrow(PersonalLibraryQuotaError);
    expect(() => personalQuotaCountAfter('texture', 10, false, 'upsert')).toThrow(PersonalLibraryQuotaError);
    expect(personalQuotaCountAfter('texture', 10, true, 'delete')).toBe(9);
  });

  it('validates GUIDs, preset byte limits, and normalized WebP metadata', () => {
    expect(requirePersonalGuid('safe_guid-1')).toBe('safe_guid-1');
    expect(() => requirePersonalGuid('../bad')).toThrow(/invalid-guid/);
    expect(() => assertPersonalPresetPayloadSize({payload: 'x'.repeat(910_000)})).toThrow(/payload-too-large/);
    expect(validatePersonalTextureMetadata({
      guid: 'texture-a',
      name: 'Texture',
      kind: 'texture',
      contentType: 'image/webp',
      storagePath: 'users/alice/textures/texture-a.webp',
      width: 1024,
      height: 512,
      byteSize: 1_024,
      thumbnail: '',
      updatedAt: '2026-09-11T00:00:00.000Z',
      revision: 0,
    })).toEqual(expect.objectContaining({guid: 'texture-a', width: 1024, height: 512}));
  });
});
