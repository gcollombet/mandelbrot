import {describe, expect, it} from 'vitest';
import {
  groupPublicCatalogManifestEntries,
  normalizePublicCatalogManifest,
  PUBLIC_CATALOG_MANIFEST_MAX_BYTES,
  publicCatalogManifestSizeBytes,
  PublicCatalogManifestError,
  upsertPublicCatalogManifestEntry,
} from '../../src/publicCatalogManifest';

describe('publicCatalogManifest', () => {
  it('normalizes Firestore-like timestamps and sorts entries deterministically', () => {
    const manifest = normalizePublicCatalogManifest({
      schemaVersion: 1,
      updatedAt: {seconds: 1_757_498_400, nanoseconds: 0},
      entries: [
        {type: 'texture', guid: 'texture-b', lastUpdated: {toDate: () => new Date('2026-09-10T10:00:00.000Z')}},
        {type: 'completePreset', guid: 'preset-a', lastUpdated: '2026-09-09T10:00:00.000Z'},
      ],
    });

    expect(manifest.entries).toEqual([
      {type: 'completePreset', guid: 'preset-a', lastUpdated: '2026-09-09T10:00:00.000Z'},
      {type: 'texture', guid: 'texture-b', lastUpdated: '2026-09-10T10:00:00.000Z'},
    ]);
    expect(groupPublicCatalogManifestEntries(manifest).texture).toEqual([manifest.entries[1]]);
  });

  it('rejects unsupported schemas, invalid timestamps, and duplicate type/GUID pairs', () => {
    expect(() => normalizePublicCatalogManifest({schemaVersion: 2, updatedAt: new Date().toISOString(), entries: []}))
      .toThrow(PublicCatalogManifestError);
    expect(() => normalizePublicCatalogManifest({schemaVersion: 1, updatedAt: 'invalid', entries: []}))
      .toThrow(/updatedAt/);
    expect(() => normalizePublicCatalogManifest({
      schemaVersion: 1,
      updatedAt: '2026-09-10T10:00:00.000Z',
      entries: [
        {type: 'palettePreset', guid: 'same', lastUpdated: '2026-09-10T10:00:00.000Z'},
        {type: 'palettePreset', guid: 'same', lastUpdated: '2026-09-10T11:00:00.000Z'},
      ],
    })).toThrow(/duplicate/);
  });

  it('upserts one key without retaining payload fields', () => {
    const manifest = normalizePublicCatalogManifest({
      schemaVersion: 1,
      updatedAt: '2026-09-10T10:00:00.000Z',
      entries: [{type: 'texture', guid: 'texture-a', lastUpdated: '2026-09-10T10:00:00.000Z'}],
    });
    const next = upsertPublicCatalogManifestEntry(manifest, {
      type: 'texture',
      guid: 'texture-a',
      lastUpdated: '2026-09-10T11:00:00.000Z',
    });

    expect(next.entries).toEqual([{type: 'texture', guid: 'texture-a', lastUpdated: '2026-09-10T11:00:00.000Z'}]);
    expect(publicCatalogManifestSizeBytes(next)).toBeLessThan(PUBLIC_CATALOG_MANIFEST_MAX_BYTES);
  });
});
