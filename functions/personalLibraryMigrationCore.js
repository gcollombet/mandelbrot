'use strict';

const PERSONAL_PRESET_LIMIT = 400;
const PERSONAL_TEXTURE_LIMIT = 10;
const PERSONAL_PRESET_TYPES = new Set([
  'completePreset',
  'palettePreset',
  'stopPreset',
  'textureMappingPreset',
  'animationPreset',
]);

function requireGuid(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error('invalid-guid');
  }
  return value;
}

function requireUid(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || value.includes('/')) {
    throw new Error('invalid-uid');
  }
  return value;
}

function requirePresetType(value) {
  if (!PERSONAL_PRESET_TYPES.has(value)) throw new Error('invalid-preset-type');
  return value;
}

function revision(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function buildPersonalLibraryMigration(users) {
  const migrated = users.map(user => {
    const uid = requireUid(user.uid);
    const entries = user.presets.map(preset => {
      const guid = requireGuid(preset.id);
      if (preset.data?.guid !== guid) throw new Error(`${uid}/${guid}: preset GUID does not match its document id.`);
      return {
        guid,
        type: requirePresetType(preset.data?.type),
        revision: revision(preset.data?.revision),
      };
    }).sort((left, right) => left.guid.localeCompare(right.guid));
    if (new Set(entries.map(entry => entry.guid)).size !== entries.length) {
      throw new Error(`${uid}: duplicate preset GUID.`);
    }
    for (const texture of user.textures) {
      const guid = requireGuid(texture.id);
      if (texture.data?.guid !== guid) throw new Error(`${uid}/${guid}: texture GUID does not match its document id.`);
      const expectedPath = `users/${uid}/textures/${guid}.webp`;
      if (texture.data?.storagePath !== expectedPath) throw new Error(`${uid}/${guid}: invalid texture storage path.`);
    }
    if (entries.length > PERSONAL_PRESET_LIMIT) throw new Error(`${uid}: preset quota exceeded (${entries.length}).`);
    if (user.textures.length > PERSONAL_TEXTURE_LIMIT) throw new Error(`${uid}: texture quota exceeded (${user.textures.length}).`);
    return {
      uid,
      manifest: {
        entries,
        revision: revision(user.manifestRevision) + 1,
      },
      usage: {
        presetCount: entries.length,
        textureCount: user.textures.length,
        revision: revision(user.usageRevision) + 1,
      },
    };
  }).sort((left, right) => left.uid.localeCompare(right.uid));
  return {
    users: migrated,
    totals: migrated.reduce((totals, user) => ({
      users: totals.users + 1,
      presets: totals.presets + user.usage.presetCount,
      textures: totals.textures + user.usage.textureCount,
    }), {users: 0, presets: 0, textures: 0}),
  };
}

module.exports = {
  PERSONAL_PRESET_LIMIT,
  PERSONAL_TEXTURE_LIMIT,
  buildPersonalLibraryMigration,
  requireGuid,
  requireUid,
  requirePresetType,
};
