import {
  PERSONAL_PRESET_LIMIT,
  PERSONAL_TEXTURE_LIMIT,
  type PersonalPresetManifest,
  type PersonalPresetManifestEntry,
  type PersonalPresetType,
  type PersonalTextureMetadata,
  type PersonalUsage,
} from './personalLibraryTypes';

export const PERSONAL_PRESET_TYPES: readonly PersonalPresetType[] = [
  'completePreset',
  'palettePreset',
  'stopPreset',
  'textureMappingPreset',
  'animationPreset',
];

export const MAX_PERSONAL_PRESET_BYTES = 900_000;
export const MAX_PERSONAL_TEXTURE_SIDE = 1024;
export const MAX_PERSONAL_TEXTURE_BYTES = 5 * 1024 * 1024;

export class PersonalLibraryValidationError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = 'PersonalLibraryValidationError';
    this.code = code;
  }
}

export class PersonalLibraryQuotaError extends PersonalLibraryValidationError {
  constructor(resource: 'preset' | 'texture') {
    const limit = resource === 'preset' ? PERSONAL_PRESET_LIMIT : PERSONAL_TEXTURE_LIMIT;
    super('quota-exceeded', `This account has reached its ${limit}-${resource} limit.`);
    this.name = 'PersonalLibraryQuotaError';
  }
}

export function requirePersonalGuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new PersonalLibraryValidationError('invalid-guid');
  }
  return value;
}

export function requirePersonalPresetType(value: unknown): PersonalPresetType {
  if (typeof value !== 'string' || !(PERSONAL_PRESET_TYPES as readonly string[]).includes(value)) {
    throw new PersonalLibraryValidationError('invalid-preset-type');
  }
  return value as PersonalPresetType;
}

export function normalizedRevision(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function normalizePersonalPresetManifestEntries(value: unknown): PersonalPresetManifestEntry[] {
  if (!Array.isArray(value)) return [];
  const entries = new Map<string, PersonalPresetManifestEntry>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue;
    try {
      const record = candidate as Record<string, unknown>;
      const guid = requirePersonalGuid(record.guid);
      entries.set(guid, {
        guid,
        type: requirePersonalPresetType(record.type),
        revision: normalizedRevision(record.revision),
      });
    } catch {
      // Ignore malformed legacy entries; the migration command reports them.
    }
  }
  return [...entries.values()].sort((left, right) => left.guid.localeCompare(right.guid));
}

export function normalizePersonalPresetManifest(value: unknown): PersonalPresetManifest {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    revision: normalizedRevision(record.revision),
    entries: normalizePersonalPresetManifestEntries(record.entries),
  };
}

export function upsertPersonalPresetManifestEntry(
  entries: unknown,
  entry: PersonalPresetManifestEntry,
): PersonalPresetManifestEntry[] {
  const guid = requirePersonalGuid(entry.guid);
  const next = normalizePersonalPresetManifestEntries(entries).filter(candidate => candidate.guid !== guid);
  next.push({guid, type: requirePersonalPresetType(entry.type), revision: normalizedRevision(entry.revision)});
  return next.sort((left, right) => left.guid.localeCompare(right.guid));
}

export function removePersonalPresetManifestEntry(entries: unknown, guid: string): PersonalPresetManifestEntry[] {
  const safeGuid = requirePersonalGuid(guid);
  return normalizePersonalPresetManifestEntries(entries).filter(entry => entry.guid !== safeGuid);
}

export function normalizePersonalUsage(value: unknown): PersonalUsage {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    presetCount: Math.max(0, Math.floor(Number(record.presetCount) || 0)),
    textureCount: Math.max(0, Math.floor(Number(record.textureCount) || 0)),
    revision: normalizedRevision(record.revision),
  };
}

export function personalQuotaCountAfter(
  resource: 'preset' | 'texture',
  count: number,
  exists: boolean,
  action: 'upsert' | 'delete',
): number {
  const limit = resource === 'preset' ? PERSONAL_PRESET_LIMIT : PERSONAL_TEXTURE_LIMIT;
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  if (action === 'upsert') {
    if (exists) return safeCount;
    if (safeCount >= limit) throw new PersonalLibraryQuotaError(resource);
    return safeCount + 1;
  }
  return exists ? Math.max(0, safeCount - 1) : safeCount;
}

export function assertPersonalPresetPayloadSize(value: unknown): void {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (bytes > MAX_PERSONAL_PRESET_BYTES) {
    throw new PersonalLibraryValidationError('preset-payload-too-large');
  }
}

export function validatePersonalTextureMetadata(metadata: PersonalTextureMetadata): PersonalTextureMetadata {
  const guid = requirePersonalGuid(metadata?.guid);
  const width = Number(metadata?.width);
  const height = Number(metadata?.height);
  const byteSize = Number(metadata?.byteSize);
  if (metadata?.contentType !== 'image/webp') {
    throw new PersonalLibraryValidationError('invalid-content-type');
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > MAX_PERSONAL_TEXTURE_SIDE || height > MAX_PERSONAL_TEXTURE_SIDE) {
    throw new PersonalLibraryValidationError('invalid-dimensions');
  }
  if (!Number.isInteger(byteSize) || byteSize < 1 || byteSize > MAX_PERSONAL_TEXTURE_BYTES) {
    throw new PersonalLibraryValidationError('invalid-byte-size');
  }
  return {...metadata, guid, width, height, byteSize};
}
