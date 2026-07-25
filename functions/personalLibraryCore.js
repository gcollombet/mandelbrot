'use strict';

const PERSONAL_PRESET_LIMIT = 400;
const PERSONAL_TEXTURE_LIMIT = 10;
const MAX_TEXTURE_SIDE = 1024;
const MAX_TEXTURE_BYTES = 5 * 1024 * 1024;
const PERSONAL_PRESET_TYPES = new Set([
  'completePreset',
  'palettePreset',
  'stopPreset',
  'textureMappingPreset',
  'animationPreset',
]);

function quotaCountAfter({count, limit, exists, action}) {
  const safeCount = Math.max(0, Number.isFinite(count) ? count : 0);
  if (action === 'upsert') {
    if (exists) return safeCount;
    if (safeCount >= limit) {
      const error = new Error('quota-exceeded');
      error.code = 'quota-exceeded';
      throw error;
    }
    return safeCount + 1;
  }
  if (action === 'delete') return exists ? Math.max(0, safeCount - 1) : safeCount;
  throw new Error(`Unsupported quota action: ${action}`);
}

function requireGuid(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error('invalid-guid');
  }
  return value;
}

function requirePresetType(value) {
  if (!PERSONAL_PRESET_TYPES.has(value)) throw new Error('invalid-preset-type');
  return value;
}

function normalizePresetManifestEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const normalized = new Map();
  for (const candidate of entries) {
    try {
      const guid = requireGuid(candidate?.guid);
      const type = requirePresetType(candidate?.type);
      const revision = Math.max(0, Math.floor(Number(candidate?.revision) || 0));
      normalized.set(guid, {guid, type, revision});
    } catch {
      // Ignore malformed legacy manifest entries.
    }
  }
  return [...normalized.values()].sort((left, right) => left.guid.localeCompare(right.guid));
}

function upsertPresetManifestEntry(entries, entry) {
  const normalized = normalizePresetManifestEntries(entries);
  const next = normalized.filter(candidate => candidate.guid !== entry.guid);
  next.push({
    guid: requireGuid(entry.guid),
    type: requirePresetType(entry.type),
    revision: Math.max(0, Math.floor(Number(entry.revision) || 0)),
  });
  return next.sort((left, right) => left.guid.localeCompare(right.guid));
}

function removePresetManifestEntry(entries, guid) {
  const safeGuid = requireGuid(guid);
  return normalizePresetManifestEntries(entries).filter(entry => entry.guid !== safeGuid);
}

function validateTextureMetadata(metadata) {
  if (!metadata || metadata.contentType !== 'image/webp') throw new Error('invalid-content-type');
  const width = Number(metadata.width);
  const height = Number(metadata.height);
  const byteSize = Number(metadata.byteSize);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > MAX_TEXTURE_SIDE || height > MAX_TEXTURE_SIDE) {
    throw new Error('invalid-dimensions');
  }
  if (!Number.isFinite(byteSize) || byteSize < 1 || byteSize > MAX_TEXTURE_BYTES) {
    throw new Error('invalid-byte-size');
  }
  return {width, height, byteSize};
}

function isAdminClaims(token = {}) {
  return token.admin === true || token.role === 'admin';
}

function canAccessOwner(authUid, ownerUid) {
  return typeof authUid === 'string' && authUid.length > 0 && authUid === ownerUid;
}

function isReservationExpired(expiresAtMillis, nowMillis = Date.now()) {
  return Number.isFinite(expiresAtMillis) && expiresAtMillis <= nowMillis;
}

module.exports = {
  MAX_TEXTURE_BYTES,
  MAX_TEXTURE_SIDE,
  PERSONAL_PRESET_LIMIT,
  PERSONAL_TEXTURE_LIMIT,
  canAccessOwner,
  isAdminClaims,
  isReservationExpired,
  normalizePresetManifestEntries,
  quotaCountAfter,
  removePresetManifestEntry,
  requireGuid,
  requirePresetType,
  upsertPresetManifestEntry,
  validateTextureMetadata,
};
