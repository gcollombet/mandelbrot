const test = require('node:test');
const assert = require('node:assert/strict');
const {
  catalogTextureFromDocument,
  normalizedDimensions,
  parseWebpInfo,
  updateManifestTextureTimestamps,
} = require('../catalogTextureOptimizationCore');

test('limits only the longest texture side without upscaling', () => {
  assert.deepEqual(normalizedDimensions(4096, 1024), {width: 1024, height: 256});
  assert.deepEqual(normalizedDimensions(1000, 3000), {width: 341, height: 1024});
  assert.deepEqual(normalizedDimensions(512, 256), {width: 512, height: 256});
});

test('parses webpinfo dimensions', () => {
  assert.deepEqual(parseWebpInfo('Canvas size: 1024 x 341\n'), {width: 1024, height: 341});
  assert.deepEqual(parseWebpInfo('  Width: 80\n  Height: 60\n'), {width: 80, height: 60});
});

test('accepts only the canonical catalogue Storage path', () => {
  const document = {
    name: 'projects/demo/databases/(default)/documents/catalog/texture/entries/texture-a',
    updateTime: '2026-09-11T10:00:00.000Z',
    fields: {
      guid: {stringValue: 'texture-a'},
      name: {stringValue: 'Texture A'},
      blobPath: {stringValue: 'catalog/texture/texture-a'},
    },
  };
  assert.deepEqual(catalogTextureFromDocument(document), {
    id: 'texture-a', guid: 'texture-a', blobPath: 'catalog/texture/texture-a',
    name: 'Texture A', updateTime: document.updateTime,
  });
  document.fields.blobPath.stringValue = 'users/alice/textures/texture-a.webp';
  assert.throws(() => catalogTextureFromDocument(document), /unexpected Storage path/);
});

test('updates every catalogue texture timestamp without changing other entries', () => {
  const preset = {mapValue: {fields: {type: {stringValue: 'completePreset'}, guid: {stringValue: 'p'}}}};
  const texture = {mapValue: {fields: {
    type: {stringValue: 'texture'}, guid: {stringValue: 't'},
    lastUpdated: {timestampValue: '2026-09-10T00:00:00.000Z'},
  }}};
  const entries = updateManifestTextureTimestamps({
    fields: {entries: {arrayValue: {values: [preset, texture]}}},
  }, new Map([['t', '2026-09-11T00:00:00.000Z']]));
  assert.equal(entries.arrayValue.values[0], preset);
  assert.equal(entries.arrayValue.values[1].mapValue.fields.lastUpdated.timestampValue, '2026-09-11T00:00:00.000Z');
  assert.throws(() => updateManifestTextureTimestamps({
    fields: {entries: {arrayValue: {values: [preset]}}},
  }, new Map([['t', '2026-09-11T00:00:00.000Z']])), /missing texture t/);
});
