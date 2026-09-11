export const CATALOG_TYPES = [
  'completePreset',
  'palettePreset',
  'stopPreset',
  'texture',
  'textureMappingPreset',
  'animationPreset',
] as const;

export type CatalogType = typeof CATALOG_TYPES[number];

export const PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION = 1 as const;
export const PUBLIC_CATALOG_MANIFEST_MAX_BYTES = 750 * 1024;

export interface PublicCatalogManifestEntry {
  type: CatalogType;
  guid: string;
  lastUpdated: string;
}

export interface PublicCatalogManifest {
  schemaVersion: typeof PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION;
  entries: PublicCatalogManifestEntry[];
  updatedAt: string;
}

export class PublicCatalogManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicCatalogManifestError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCatalogType(value: unknown): value is CatalogType {
  return typeof value === 'string' && (CATALOG_TYPES as readonly string[]).includes(value);
}

export function publicCatalogTimestampToIso(value: unknown, fieldName = 'lastUpdated'): string {
  let date: Date | null = null;
  if (typeof value === 'string' && value.trim()) {
    date = new Date(value);
  } else if (isRecord(value) && typeof value.toDate === 'function') {
    const converted = (value.toDate as () => unknown)();
    if (converted instanceof Date) date = converted;
  } else if (isRecord(value) && typeof value.seconds === 'number') {
    const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    date = new Date(value.seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
  }
  if (!date || !Number.isFinite(date.getTime())) {
    throw new PublicCatalogManifestError(`Public catalogue manifest ${fieldName} is invalid.`);
  }
  return date.toISOString();
}

export function comparePublicCatalogManifestEntries(a: PublicCatalogManifestEntry, b: PublicCatalogManifestEntry): number {
  return a.type.localeCompare(b.type) || a.guid.localeCompare(b.guid);
}

export function publicCatalogManifestSizeBytes(manifest: PublicCatalogManifest): number {
  return new TextEncoder().encode(JSON.stringify(manifest)).byteLength;
}

export function assertPublicCatalogManifestSize(manifest: PublicCatalogManifest): void {
  const bytes = publicCatalogManifestSizeBytes(manifest);
  if (bytes > PUBLIC_CATALOG_MANIFEST_MAX_BYTES) {
    throw new PublicCatalogManifestError(
      `Public catalogue manifest is ${bytes} bytes; maximum is ${PUBLIC_CATALOG_MANIFEST_MAX_BYTES}.`,
    );
  }
}

export function normalizePublicCatalogManifest(value: unknown): PublicCatalogManifest {
  if (!isRecord(value) || value.schemaVersion !== PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION || !Array.isArray(value.entries)) {
    throw new PublicCatalogManifestError('Public catalogue manifest schema is invalid or unsupported.');
  }

  const keys = new Set<string>();
  const entries = value.entries.map((candidate, index): PublicCatalogManifestEntry => {
    if (!isRecord(candidate) || !isCatalogType(candidate.type)) {
      throw new PublicCatalogManifestError(`Public catalogue manifest entry ${index} has an invalid type.`);
    }
    const guid = typeof candidate.guid === 'string' ? candidate.guid.trim() : '';
    if (!guid) {
      throw new PublicCatalogManifestError(`Public catalogue manifest entry ${index} has an invalid GUID.`);
    }
    const key = `${candidate.type}:${guid}`;
    if (keys.has(key)) {
      throw new PublicCatalogManifestError(`Public catalogue manifest contains duplicate ${key}.`);
    }
    keys.add(key);
    return {
      type: candidate.type,
      guid,
      lastUpdated: publicCatalogTimestampToIso(candidate.lastUpdated, `entry ${index} lastUpdated`),
    };
  }).sort(comparePublicCatalogManifestEntries);

  const manifest: PublicCatalogManifest = {
    schemaVersion: PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
    entries,
    updatedAt: publicCatalogTimestampToIso(value.updatedAt, 'updatedAt'),
  };
  assertPublicCatalogManifestSize(manifest);
  return manifest;
}

export function upsertPublicCatalogManifestEntry(
  manifest: PublicCatalogManifest,
  entry: PublicCatalogManifestEntry,
): PublicCatalogManifest {
  const entries = manifest.entries.filter(candidate => candidate.type !== entry.type || candidate.guid !== entry.guid);
  entries.push({...entry});
  const next: PublicCatalogManifest = {
    schemaVersion: PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
    entries: entries.sort(comparePublicCatalogManifestEntries),
    updatedAt: entry.lastUpdated,
  };
  assertPublicCatalogManifestSize(next);
  return next;
}

export function groupPublicCatalogManifestEntries(
  manifest: PublicCatalogManifest,
): Record<CatalogType, PublicCatalogManifestEntry[]> {
  const grouped = Object.fromEntries(CATALOG_TYPES.map(type => [type, []])) as Record<CatalogType, PublicCatalogManifestEntry[]>;
  for (const entry of manifest.entries) grouped[entry.type].push(entry);
  return grouped;
}
