const admin = require('firebase-admin');
const {execFileSync} = require('node:child_process');
const {
  CATALOG_TYPES,
  PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
  buildPublicCatalogManifest,
} = require('../publicCatalogManifestCore');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function gcloudAccessToken() {
  const accessToken = execFileSync('gcloud', ['auth', 'print-access-token'], {encoding: 'utf8'}).trim();
  if (!accessToken) throw new Error('gcloud returned an empty access token.');
  return accessToken;
}

async function firestoreRestRequest(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore REST ${response.status}: ${body}`);
  }
  return response.status === 204 ? null : response.json();
}

async function readWithGcloud(projectId, accessToken) {
  const documents = [];
  for (const type of CATALOG_TYPES) {
    let pageToken = '';
    do {
      const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/catalog/${type}/entries`;
      const url = `${base}?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const response = await firestoreRestRequest(url, accessToken);
      for (const document of response.documents || []) {
        const id = document.name.split('/').pop();
        documents.push({
          type,
          id,
          data: {
            guid: document.fields?.guid?.stringValue,
            lastUpdated: document.fields?.lastUpdated?.timestampValue,
          },
        });
      }
      pageToken = response.nextPageToken || '';
    } while (pageToken);
  }
  return documents;
}

async function writeWithGcloud(projectId, accessToken, manifest) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/catalogManifest/current`;
  return firestoreRestRequest(url, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        schemaVersion: {integerValue: String(PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION)},
        entries: {
          arrayValue: {
            values: manifest.entries.map(entry => ({
              mapValue: {
                fields: {
                  type: {stringValue: entry.type},
                  guid: {stringValue: entry.guid},
                  lastUpdated: {timestampValue: entry.lastUpdated},
                },
              },
            })),
          },
        },
        updatedAt: {timestampValue: manifest.updatedAt},
      },
    }),
  });
}

function manifestFromRestDocument(document) {
  const fields = document?.fields || {};
  return {
    schemaVersion: Number(fields.schemaVersion?.integerValue),
    entries: (fields.entries?.arrayValue?.values || []).map(value => ({
      type: value.mapValue?.fields?.type?.stringValue,
      guid: value.mapValue?.fields?.guid?.stringValue,
      lastUpdated: value.mapValue?.fields?.lastUpdated?.timestampValue,
    })),
    updatedAt: fields.updatedAt?.timestampValue,
  };
}

function assertWrittenManifest(expected, document) {
  const actual = manifestFromRestDocument(document);
  if (actual.schemaVersion !== expected.schemaVersion || JSON.stringify(actual.entries) !== JSON.stringify(expected.entries)) {
    throw new Error('Persisted public catalogue manifest does not match the validated migration output.');
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const useGcloudAuth = process.argv.includes('--gcloud-auth');
  const projectId = argumentValue('--project') || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (useGcloudAuth) {
    if (!projectId) throw new Error('--gcloud-auth requires --project <project-id>.');
    const accessToken = gcloudAccessToken();
    const migratedAt = new Date().toISOString();
    const documents = await readWithGcloud(projectId, accessToken);
    const {manifest, counts, sizeBytes} = buildPublicCatalogManifest(documents, migratedAt);
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      projectId,
      schemaVersion: manifest.schemaVersion,
      counts,
      totalEntries: manifest.entries.length,
      estimatedBytes: sizeBytes,
      target: 'catalogManifest/current',
    }, null, 2));
    if (!apply) {
      console.log('Dry run only. Re-run with --apply after reviewing this summary.');
      return;
    }
    const writtenDocument = await writeWithGcloud(projectId, accessToken, manifest);
    assertWrittenManifest(manifest, writtenDocument);
    console.log('Public catalogue manifest migration applied and read-back verified. Payload documents were not modified.');
    return;
  }
  admin.initializeApp(projectId ? {projectId} : undefined);
  const db = admin.firestore();
  const documents = [];
  for (const type of CATALOG_TYPES) {
    const snapshot = await db.collection('catalog').doc(type).collection('entries').get();
    for (const document of snapshot.docs) documents.push({type, id: document.id, data: document.data()});
  }

  const migratedAt = admin.firestore.Timestamp.now();
  const {manifest, counts, sizeBytes} = buildPublicCatalogManifest(documents, migratedAt);
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    projectId: projectId || admin.app().options.projectId || null,
    schemaVersion: manifest.schemaVersion,
    counts,
    totalEntries: manifest.entries.length,
    estimatedBytes: sizeBytes,
    target: 'catalogManifest/current',
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing this summary.');
    return;
  }

  await db.doc('catalogManifest/current').set({
    schemaVersion: PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
    entries: manifest.entries.map(entry => ({
      type: entry.type,
      guid: entry.guid,
      lastUpdated: admin.firestore.Timestamp.fromDate(new Date(entry.lastUpdated)),
    })),
    updatedAt: migratedAt,
  });
  console.log('Public catalogue manifest migration applied. Payload documents were not modified.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
