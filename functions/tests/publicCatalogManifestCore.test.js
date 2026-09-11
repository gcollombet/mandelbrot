const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPublicCatalogManifest,
  PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
} = require('../publicCatalogManifestCore');

test('builds a deterministic manifest containing only type, guid, and lastUpdated', () => {
  const {manifest, counts} = buildPublicCatalogManifest([
    {type: 'texture', id: 'texture-b', data: {guid: 'texture-b', name: 'ignored', blobPath: 'large', lastUpdated: '2026-09-10T10:00:00.000Z'}},
    {type: 'completePreset', id: 'preset-a', data: {guid: 'preset-a', thumbnail: 'ignored', lastUpdated: '2026-09-09T10:00:00.000Z'}},
  ], '2026-09-10T11:00:00.000Z');

  assert.equal(manifest.schemaVersion, PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION);
  assert.deepEqual(manifest.entries, [
    {type: 'completePreset', guid: 'preset-a', lastUpdated: '2026-09-09T10:00:00.000Z'},
    {type: 'texture', guid: 'texture-b', lastUpdated: '2026-09-10T10:00:00.000Z'},
  ]);
  assert.deepEqual(Object.keys(manifest.entries[0]).sort(), ['guid', 'lastUpdated', 'type']);
  assert.equal(counts.completePreset, 1);
  assert.equal(counts.texture, 1);
});

test('rejects a document whose GUID differs from its canonical document id', () => {
  assert.throws(() => buildPublicCatalogManifest([
    {type: 'palettePreset', id: 'palette-a', data: {guid: 'other', lastUpdated: '2026-09-10T10:00:00.000Z'}},
  ]), /invalid GUID/);
});

test('rejects invalid timestamps before any write can occur', () => {
  assert.throws(() => buildPublicCatalogManifest([
    {type: 'stopPreset', id: 'stop-a', data: {guid: 'stop-a', lastUpdated: 'invalid'}},
  ]), /lastUpdated is invalid/);
});
