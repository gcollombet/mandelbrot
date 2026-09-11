'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {buildPersonalLibraryMigration} = require('../personalLibraryMigrationCore');

test('reconstructs deterministic manifests and exact usage counts', () => {
  const result = buildPersonalLibraryMigration([{
    uid: 'alice',
    manifestRevision: 3,
    usageRevision: 4,
    presets: [
      {id: 'b', data: {guid: 'b', type: 'palettePreset', revision: 2}},
      {id: 'a', data: {guid: 'a', type: 'completePreset', revision: 1}},
    ],
    textures: [{id: 'texture-a', data: {guid: 'texture-a', storagePath: 'users/alice/textures/texture-a.webp'}}],
  }]);
  assert.deepEqual(result.totals, {users: 1, presets: 2, textures: 1});
  assert.deepEqual(result.users[0].manifest, {
    revision: 4,
    entries: [
      {guid: 'a', type: 'completePreset', revision: 1},
      {guid: 'b', type: 'palettePreset', revision: 2},
    ],
  });
  assert.deepEqual(result.users[0].usage, {presetCount: 2, textureCount: 1, revision: 5});
});

test('rejects mismatched ids, invalid paths, and quota overflow', () => {
  assert.throws(() => buildPersonalLibraryMigration([{
    uid: 'alice', presets: [{id: 'a', data: {guid: 'b', type: 'completePreset'}}], textures: [],
  }]), /does not match/);
  assert.throws(() => buildPersonalLibraryMigration([{
    uid: 'alice', presets: [], textures: [{id: 'a', data: {guid: 'a', storagePath: 'other'}}],
  }]), /storage path/);
  assert.throws(() => buildPersonalLibraryMigration([{
    uid: 'alice',
    presets: Array.from({length: 401}, (_, index) => ({
      id: `p-${index}`,
      data: {guid: `p-${index}`, type: 'completePreset', revision: 1},
    })),
    textures: [],
  }]), /quota exceeded/);
});
