'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PERSONAL_PRESET_LIMIT,
  PERSONAL_TEXTURE_LIMIT,
  canAccessOwner,
  isAdminClaims,
  isReservationExpired,
  quotaCountAfter,
  requireGuid,
  requirePresetType,
  validateTextureMetadata,
} = require('../personalLibraryCore');

test('new records consume quota while retries and updates do not', () => {
  assert.equal(quotaCountAfter({count: 2, limit: PERSONAL_PRESET_LIMIT, exists: false, action: 'upsert'}), 3);
  assert.equal(quotaCountAfter({count: 2, limit: PERSONAL_PRESET_LIMIT, exists: true, action: 'upsert'}), 2);
  assert.equal(quotaCountAfter({count: 2, limit: PERSONAL_PRESET_LIMIT, exists: true, action: 'delete'}), 1);
  assert.equal(quotaCountAfter({count: 2, limit: PERSONAL_PRESET_LIMIT, exists: false, action: 'delete'}), 2);
});

test('preset and texture quota boundaries reject a new GUID', () => {
  assert.throws(() => quotaCountAfter({count: 400, limit: PERSONAL_PRESET_LIMIT, exists: false, action: 'upsert'}), /quota-exceeded/);
  assert.throws(() => quotaCountAfter({count: 10, limit: PERSONAL_TEXTURE_LIMIT, exists: false, action: 'upsert'}), /quota-exceeded/);
});

test('personal IDs and record types reject unsafe paths', () => {
  assert.equal(requireGuid('safe_guid-123'), 'safe_guid-123');
  assert.equal(requirePresetType('completePreset'), 'completePreset');
  assert.throws(() => requireGuid('../other-user'), /invalid-guid/);
  assert.throws(() => requirePresetType('texture'), /invalid-preset-type/);
});

test('texture finalization accepts only bounded WebP metadata', () => {
  assert.deepEqual(validateTextureMetadata({contentType: 'image/webp', width: 1024, height: 512, byteSize: 1024}), {
    width: 1024,
    height: 512,
    byteSize: 1024,
  });
  assert.throws(() => validateTextureMetadata({contentType: 'image/png', width: 10, height: 10, byteSize: 10}), /invalid-content-type/);
  assert.throws(() => validateTextureMetadata({contentType: 'image/webp', width: 1025, height: 10, byteSize: 10}), /invalid-dimensions/);
});

test('catalog publication authorization recognizes only trusted admin claims', () => {
  assert.equal(isAdminClaims({admin: true}), true);
  assert.equal(isAdminClaims({role: 'admin'}), true);
  assert.equal(isAdminClaims({role: 'user'}), false);
  assert.equal(isAdminClaims({}), false);
});

test('owner authorization rejects cross-account access', () => {
  assert.equal(canAccessOwner('alice', 'alice'), true);
  assert.equal(canAccessOwner('alice', 'bob'), false);
  assert.equal(canAccessOwner('', 'alice'), false);
});

test('reservation recovery only selects expired reservations', () => {
  assert.equal(isReservationExpired(1_000, 1_000), true);
  assert.equal(isReservationExpired(999, 1_000), true);
  assert.equal(isReservationExpired(1_001, 1_000), false);
});
