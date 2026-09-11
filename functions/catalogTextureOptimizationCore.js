const MAX_CATALOG_TEXTURE_SIDE = 1024;
const CATALOG_TEXTURE_WEBP_QUALITY = 90;

function normalizedDimensions(width, height, maxSide = MAX_CATALOG_TEXTURE_SIDE) {
  if (![width, height, maxSide].every(value => Number.isInteger(value) && value > 0)) {
    throw new Error('Texture dimensions and maximum side must be positive integers.');
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function parseWebpInfo(output) {
  const canvas = output.match(/Canvas size:\s*(\d+)\s*x\s*(\d+)/i);
  if (canvas) return {width: Number(canvas[1]), height: Number(canvas[2])};
  const width = output.match(/^\s*Width:\s*(\d+)\s*$/im);
  const height = output.match(/^\s*Height:\s*(\d+)\s*$/im);
  if (!width || !height) throw new Error('webpinfo did not report valid image dimensions.');
  return {width: Number(width[1]), height: Number(height[1])};
}

function catalogTextureFromDocument(document) {
  const id = document.name?.split('/').pop() || '';
  const guid = document.fields?.guid?.stringValue || '';
  const blobPath = document.fields?.blobPath?.stringValue || '';
  if (!id || guid !== id) throw new Error(`Catalogue texture ${id || '(unknown)'} has an invalid GUID.`);
  if (blobPath !== `catalog/texture/${guid}`) {
    throw new Error(`Catalogue texture ${guid} has unexpected Storage path ${blobPath || '(missing)'}.`);
  }
  return {
    id,
    guid,
    blobPath,
    name: document.fields?.name?.stringValue || guid,
    updateTime: document.updateTime,
  };
}

function updateManifestTextureTimestamps(manifestDocument, timestampsByGuid) {
  const values = manifestDocument.fields?.entries?.arrayValue?.values;
  if (!Array.isArray(values)) throw new Error('Public catalogue manifest has no entries array.');
  const seen = new Set();
  const entries = values.map(value => {
    const fields = value.mapValue?.fields;
    const type = fields?.type?.stringValue;
    const guid = fields?.guid?.stringValue;
    if (type !== 'texture' || !timestampsByGuid.has(guid)) return value;
    if (seen.has(guid)) throw new Error(`Public catalogue manifest contains duplicate texture ${guid}.`);
    seen.add(guid);
    return {
      mapValue: {
        fields: {
          ...fields,
          lastUpdated: {timestampValue: timestampsByGuid.get(guid)},
        },
      },
    };
  });
  for (const guid of timestampsByGuid.keys()) {
    if (!seen.has(guid)) throw new Error(`Public catalogue manifest is missing texture ${guid}.`);
  }
  return {arrayValue: {values: entries}};
}

module.exports = {
  CATALOG_TEXTURE_WEBP_QUALITY,
  MAX_CATALOG_TEXTURE_SIDE,
  catalogTextureFromDocument,
  normalizedDimensions,
  parseWebpInfo,
  updateManifestTextureTimestamps,
};
