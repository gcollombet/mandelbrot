const {execFileSync} = require('node:child_process');
const {mkdtemp, readFile, rm, stat, writeFile} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {
  CATALOG_TEXTURE_WEBP_QUALITY,
  MAX_CATALOG_TEXTURE_SIDE,
  catalogTextureFromDocument,
  normalizedDimensions,
  parseWebpInfo,
  updateManifestTextureTimestamps,
} = require('../catalogTextureOptimizationCore');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return value;
}

function requireCommand(command) {
  try {
    execFileSync(command, ['-version'], {stdio: 'ignore'});
  } catch {
    throw new Error(`${command} is required. Install the WebP command-line tools before running this migration.`);
  }
}

function gcloudAccessToken() {
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], {encoding: 'utf8'}).trim();
  if (!token) throw new Error('gcloud returned an empty access token.');
  return token;
}

async function authorizedRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {Authorization: `Bearer ${token}`, ...options.headers},
  });
  if (!response.ok) throw new Error(`${options.label || 'Google API'} ${response.status}: ${await response.text()}`);
  return response;
}

function firestoreDocumentUrl(projectId, documentPath) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${documentPath}`;
}

async function readTextureDocuments(projectId, token) {
  const documents = [];
  let pageToken = '';
  do {
    const base = firestoreDocumentUrl(projectId, 'catalog/texture/entries');
    const url = `${base}?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const body = await (await authorizedRequest(url, token, {label: 'Firestore texture listing'})).json();
    documents.push(...(body.documents || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return documents;
}

async function readFirestoreDocument(projectId, token, documentPath) {
  return (await authorizedRequest(firestoreDocumentUrl(projectId, documentPath), token, {
    label: `Firestore ${documentPath}`,
  })).json();
}

function storageObjectUrl(bucket, blobPath, media = false) {
  const suffix = media ? '?alt=media' : '';
  return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(blobPath)}${suffix}`;
}

async function readStorageMetadata(bucket, blobPath, token) {
  return (await authorizedRequest(storageObjectUrl(bucket, blobPath), token, {
    label: `Storage metadata ${blobPath}`,
  })).json();
}

async function downloadStorageObject(bucket, blobPath, token) {
  const response = await authorizedRequest(storageObjectUrl(bucket, blobPath, true), token, {
    label: `Storage download ${blobPath}`,
  });
  return Buffer.from(await response.arrayBuffer());
}

async function uploadStorageObject(bucket, blobPath, token, bytes, generation, contentType) {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(blobPath)}&ifGenerationMatch=${encodeURIComponent(generation)}`;
  return (await authorizedRequest(url, token, {
    method: 'POST',
    headers: {'Content-Type': contentType},
    body: bytes,
    label: `Storage upload ${blobPath}`,
  })).json();
}

function webpDimensions(filePath) {
  const output = execFileSync('webpinfo', ['-summary', filePath], {encoding: 'utf8'});
  return parseWebpInfo(output);
}

async function encodeTexture(inputPath, outputPath) {
  const baseArguments = ['-quiet', '-q', String(CATALOG_TEXTURE_WEBP_QUALITY), '-m', '6', '-mt', '-metadata', 'icc'];
  execFileSync('cwebp', [...baseArguments, inputPath, '-o', outputPath]);
  const original = webpDimensions(outputPath);
  const target = normalizedDimensions(original.width, original.height);
  if (target.width !== original.width || target.height !== original.height) {
    execFileSync('cwebp', [...baseArguments, '-resize', String(target.width), String(target.height), inputPath, '-o', outputPath]);
  }
  const actual = webpDimensions(outputPath);
  if (actual.width !== target.width || actual.height !== target.height) {
    throw new Error(`Encoded dimensions ${actual.width}x${actual.height} do not match ${target.width}x${target.height}.`);
  }
  return {original, target, byteSize: (await stat(outputPath)).size};
}

function updateWrite(document, fields, fieldPaths) {
  return {
    update: {name: document.name, fields},
    updateMask: {fieldPaths},
    currentDocument: {updateTime: document.updateTime},
  };
}

async function commitMetadata(projectId, token, prepared, manifest, migratedAt) {
  const timestamps = new Map(prepared.map(item => [item.texture.guid, migratedAt]));
  const manifestEntries = updateManifestTextureTimestamps(manifest, timestamps);
  const writes = prepared.map(item => updateWrite(item.document, {
    contentType: {stringValue: 'image/webp'},
    size: {integerValue: String(item.byteSize)},
    lastUpdated: {timestampValue: migratedAt},
  }, ['contentType', 'size', 'lastUpdated']));
  writes.push(updateWrite(manifest, {
    entries: manifestEntries,
    updatedAt: {timestampValue: migratedAt},
  }, ['entries', 'updatedAt']));
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:commit`;
  await authorizedRequest(url, token, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({writes}),
    label: 'Firestore metadata commit',
  });
}

async function verifyApplied(projectId, bucket, token, prepared, migratedAt) {
  for (const item of prepared) {
    const [document, metadata] = await Promise.all([
      readFirestoreDocument(projectId, token, `catalog/texture/entries/${encodeURIComponent(item.texture.guid)}`),
      readStorageMetadata(bucket, item.texture.blobPath, token),
    ]);
    if (document.fields?.contentType?.stringValue !== 'image/webp'
      || Number(document.fields?.size?.integerValue) !== item.byteSize
      || document.fields?.lastUpdated?.timestampValue !== migratedAt
      || metadata.contentType !== 'image/webp'
      || Number(metadata.size) !== item.byteSize) {
      throw new Error(`${item.texture.guid}: remote read-back verification failed.`);
    }
  }
  const manifest = await readFirestoreDocument(projectId, token, 'catalogManifest/current');
  const manifestEntries = manifest.fields?.entries?.arrayValue?.values || [];
  for (const item of prepared) {
    const entry = manifestEntries.find(value => value.mapValue?.fields?.type?.stringValue === 'texture'
      && value.mapValue?.fields?.guid?.stringValue === item.texture.guid);
    if (entry?.mapValue?.fields?.lastUpdated?.timestampValue !== migratedAt) {
      throw new Error(`${item.texture.guid}: manifest read-back verification failed.`);
    }
  }
}

async function rollbackUploads(bucket, token, uploaded) {
  const failures = [];
  for (const item of [...uploaded].reverse()) {
    try {
      await uploadStorageObject(
        bucket, item.texture.blobPath, token, item.originalBytes,
        item.uploadedGeneration, item.originalMetadata.contentType || 'application/octet-stream',
      );
    } catch (error) {
      failures.push(`${item.texture.blobPath}: ${error.message}`);
    }
  }
  if (failures.length) throw new Error(`Automatic Storage rollback failed:\n${failures.join('\n')}`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const projectId = argumentValue('--project') || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('Specify --project <project-id>.');
  const bucket = argumentValue('--bucket') || `${projectId}.firebasestorage.app`;
  requireCommand('cwebp');
  requireCommand('webpinfo');
  const token = gcloudAccessToken();
  const workDirectory = await mkdtemp(path.join(tmpdir(), 'mandelbrot-catalog-textures-'));
  const textureDocuments = await readTextureDocuments(projectId, token);
  if (!textureDocuments.length) {
    console.log(JSON.stringify({mode: apply ? 'apply' : 'dry-run', projectId, bucket, textures: 0}, null, 2));
    await rm(workDirectory, {recursive: true, force: true});
    return;
  }
  const manifest = await readFirestoreDocument(projectId, token, 'catalogManifest/current');
  const prepared = [];
  try {
    for (let index = 0; index < textureDocuments.length; index += 1) {
      const document = textureDocuments[index];
      const texture = catalogTextureFromDocument(document);
      const originalMetadata = await readStorageMetadata(bucket, texture.blobPath, token);
      const originalBytes = await downloadStorageObject(bucket, texture.blobPath, token);
      if (Number(originalMetadata.size) !== originalBytes.length) {
        throw new Error(`${texture.guid}: downloaded byte count does not match Storage metadata.`);
      }
      const inputPath = path.join(workDirectory, `${String(index).padStart(4, '0')}-${texture.guid}.source`);
      const outputPath = `${inputPath}.webp`;
      await writeFile(inputPath, originalBytes);
      const encoded = await encodeTexture(inputPath, outputPath);
      prepared.push({
        document, texture, originalMetadata, originalBytes, outputPath,
        ...encoded,
      });
    }
    const beforeBytes = prepared.reduce((sum, item) => sum + item.originalBytes.length, 0);
    const afterBytes = prepared.reduce((sum, item) => sum + item.byteSize, 0);
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      projectId,
      bucket,
      quality: CATALOG_TEXTURE_WEBP_QUALITY / 100,
      maxSide: MAX_CATALOG_TEXTURE_SIDE,
      textures: prepared.length,
      beforeBytes,
      afterBytes,
      savedBytes: beforeBytes - afterBytes,
      entries: prepared.map(item => ({
        guid: item.texture.guid,
        name: item.texture.name,
        path: item.texture.blobPath,
        beforeBytes: item.originalBytes.length,
        afterBytes: item.byteSize,
        originalDimensions: `${item.original.width}x${item.original.height}`,
        outputDimensions: `${item.target.width}x${item.target.height}`,
      })),
    }, null, 2));
    if (!apply) {
      console.log('Dry run only. Re-run with --apply after reviewing this summary.');
      return;
    }

    const migratedAt = new Date().toISOString();
    const uploaded = [];
    try {
      for (const item of prepared) {
        const outputBytes = await readFile(item.outputPath);
        const result = await uploadStorageObject(
          bucket, item.texture.blobPath, token, outputBytes,
          item.originalMetadata.generation, 'image/webp',
        );
        uploaded.push({...item, uploadedGeneration: result.generation});
      }
      await commitMetadata(projectId, token, prepared, manifest, migratedAt);
    } catch (error) {
      try {
        await rollbackUploads(bucket, token, uploaded);
      } catch (rollbackError) {
        error.message += `\n${rollbackError.message}\nOriginal files remain in ${workDirectory}.`;
        throw error;
      }
      throw new Error(`${error.message}\nStorage uploads were rolled back successfully.`);
    }
    await verifyApplied(projectId, bucket, token, prepared, migratedAt);
    console.log(`Optimized ${prepared.length} catalogue textures and verified Storage, Firestore, and manifest read-back.`);
  } finally {
    if (apply) console.log(`Local source backup: ${workDirectory}`);
    else await rm(workDirectory, {recursive: true, force: true});
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
