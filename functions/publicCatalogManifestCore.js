const CATALOG_TYPES = Object.freeze([
  'completePreset',
  'palettePreset',
  'stopPreset',
  'texture',
  'textureMappingPreset',
  'animationPreset',
]);
const PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION = 1;
const PUBLIC_CATALOG_MANIFEST_MAX_BYTES = 750 * 1024;

function timestampToIso(value, label) {
  let date = null;
  if (typeof value === 'string' && value.trim()) date = new Date(value);
  else if (value && typeof value.toDate === 'function') date = value.toDate();
  else if (value && Number.isFinite(value.seconds)) {
    date = new Date(value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1_000_000));
  }
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error(`${label} is invalid.`);
  return date.toISOString();
}

function compareEntries(a, b) {
  return a.type.localeCompare(b.type) || a.guid.localeCompare(b.guid);
}

function manifestSizeBytes(manifest) {
  return Buffer.byteLength(JSON.stringify(manifest), 'utf8');
}

function buildPublicCatalogManifest(documents, updatedAt = new Date().toISOString()) {
  const keys = new Set();
  const counts = Object.fromEntries(CATALOG_TYPES.map(type => [type, 0]));
  const entries = documents.map(({type, id, data}) => {
    if (!CATALOG_TYPES.includes(type)) throw new Error(`Unsupported public catalogue type ${type}.`);
    const guid = typeof data?.guid === 'string' ? data.guid.trim() : '';
    if (!guid || guid !== id) throw new Error(`Public catalogue ${type}/${id} has an invalid GUID.`);
    const key = `${type}:${guid}`;
    if (keys.has(key)) throw new Error(`Duplicate public catalogue entry ${key}.`);
    keys.add(key);
    counts[type] += 1;
    return {type, guid, lastUpdated: timestampToIso(data.lastUpdated, `${key} lastUpdated`)};
  }).sort(compareEntries);
  const manifest = {
    schemaVersion: PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
    entries,
    updatedAt: timestampToIso(updatedAt, 'manifest updatedAt'),
  };
  const sizeBytes = manifestSizeBytes(manifest);
  if (sizeBytes > PUBLIC_CATALOG_MANIFEST_MAX_BYTES) {
    throw new Error(`Public catalogue manifest is ${sizeBytes} bytes; maximum is ${PUBLIC_CATALOG_MANIFEST_MAX_BYTES}.`);
  }
  return {manifest, counts, sizeBytes};
}

module.exports = {
  CATALOG_TYPES,
  PUBLIC_CATALOG_MANIFEST_MAX_BYTES,
  PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
  buildPublicCatalogManifest,
  manifestSizeBytes,
  timestampToIso,
};
