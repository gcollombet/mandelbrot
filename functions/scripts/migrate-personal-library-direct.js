const admin = require('firebase-admin');
const {execFileSync} = require('node:child_process');
const {buildPersonalLibraryMigration} = require('../personalLibraryMigrationCore');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function emptyUser(uid) {
  return {uid, presets: [], textures: [], manifestRevision: 0, usageRevision: 0};
}

function userState(users, uid) {
  if (!users.has(uid)) users.set(uid, emptyUser(uid));
  return users.get(uid);
}

function acceptDocument(users, path, data) {
  const segments = path.split('/');
  if (segments.length !== 4 || segments[0] !== 'users') return;
  const [, uid, collectionId, id] = segments;
  const user = userState(users, uid);
  if (collectionId === 'presets') user.presets.push({id, data});
  else if (collectionId === 'textures') user.textures.push({id, data});
  else if (collectionId === 'manifests' && id === 'presets') user.manifestRevision = data.revision;
  else if (collectionId === 'usage' && id === 'current') user.usageRevision = data.revision;
}

function migrationSummary(migration, apply, projectId) {
  return {
    mode: apply ? 'apply' : 'dry-run',
    projectId,
    ...migration.totals,
    accounts: migration.users.map(user => ({
      uid: user.uid,
      presets: user.usage.presetCount,
      textures: user.usage.textureCount,
      manifestRevision: user.manifest.revision,
      usageRevision: user.usage.revision,
    })),
    targets: ['users/{uid}/manifests/presets', 'users/{uid}/usage/current'],
  };
}

async function readWithAdmin(db) {
  const users = new Map();
  const collectionIds = ['presets', 'textures', 'manifests', 'usage'];
  const snapshots = await Promise.all(collectionIds.map(id => db.collectionGroup(id).get()));
  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) acceptDocument(users, document.ref.path, document.data());
  }
  return [...users.values()];
}

async function writeWithAdmin(db, migration) {
  const repairedAt = admin.firestore.Timestamp.now();
  for (const user of migration.users) {
    await Promise.all([
      db.doc(`users/${user.uid}/manifests/presets`).set({
        ...user.manifest,
        updatedAt: repairedAt,
        repairedAt,
      }),
      db.doc(`users/${user.uid}/usage/current`).set({
        ...user.usage,
        updatedAt: repairedAt,
        repairedAt,
      }),
    ]);
  }
}

function gcloudAccessToken() {
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], {encoding: 'utf8'}).trim();
  if (!token) throw new Error('gcloud returned an empty access token.');
  return token;
}

async function firestoreRestRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Firestore REST ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function decodeValue(value) {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}

async function runCollectionGroup(projectId, token, collectionId) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`;
  const rows = await firestoreRestRequest(url, token, {
    method: 'POST',
    body: JSON.stringify({structuredQuery: {from: [{collectionId, allDescendants: true}]}}),
  });
  return rows.flatMap(row => row.document ? [row.document] : []);
}

async function readWithGcloud(projectId, token) {
  const users = new Map();
  const collectionIds = ['presets', 'textures', 'manifests', 'usage'];
  const snapshots = await Promise.all(collectionIds.map(id => runCollectionGroup(projectId, token, id)));
  for (const documents of snapshots) {
    for (const document of documents) {
      const path = document.name.split('/documents/')[1];
      if (path) acceptDocument(users, path, decodeFields(document.fields));
    }
  }
  return [...users.values()];
}

function integerValue(value) {
  return {integerValue: String(value)};
}

function manifestFields(user, repairedAt) {
  return {
    entries: {
      arrayValue: {
        values: user.manifest.entries.map(entry => ({
          mapValue: {
            fields: {
              guid: {stringValue: entry.guid},
              type: {stringValue: entry.type},
              revision: integerValue(entry.revision),
            },
          },
        })),
      },
    },
    revision: integerValue(user.manifest.revision),
    updatedAt: {timestampValue: repairedAt},
    repairedAt: {timestampValue: repairedAt},
  };
}

function usageFields(user, repairedAt) {
  return {
    presetCount: integerValue(user.usage.presetCount),
    textureCount: integerValue(user.usage.textureCount),
    revision: integerValue(user.usage.revision),
    updatedAt: {timestampValue: repairedAt},
    repairedAt: {timestampValue: repairedAt},
  };
}

async function patchDocument(projectId, token, path, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`;
  return firestoreRestRequest(url, token, {method: 'PATCH', body: JSON.stringify({fields})});
}

async function writeWithGcloud(projectId, token, migration) {
  const repairedAt = new Date().toISOString();
  for (const user of migration.users) {
    const [manifest, usage] = await Promise.all([
      patchDocument(projectId, token, `users/${user.uid}/manifests/presets`, manifestFields(user, repairedAt)),
      patchDocument(projectId, token, `users/${user.uid}/usage/current`, usageFields(user, repairedAt)),
    ]);
    const writtenManifest = decodeFields(manifest.fields);
    const writtenUsage = decodeFields(usage.fields);
    if (writtenManifest.entries?.length !== user.manifest.entries.length
      || writtenUsage.presetCount !== user.usage.presetCount
      || writtenUsage.textureCount !== user.usage.textureCount) {
      throw new Error(`${user.uid}: persisted migration state failed read-back verification.`);
    }
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const useGcloudAuth = process.argv.includes('--gcloud-auth');
  const projectId = argumentValue('--project') || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (useGcloudAuth) {
    if (!projectId) throw new Error('--gcloud-auth requires --project <project-id>.');
    const token = gcloudAccessToken();
    const migration = buildPersonalLibraryMigration(await readWithGcloud(projectId, token));
    console.log(JSON.stringify(migrationSummary(migration, apply, projectId), null, 2));
    if (!apply) {
      console.log('Dry run only. Re-run with --apply after reviewing this summary.');
      return;
    }
    await writeWithGcloud(projectId, token, migration);
    console.log('Personal manifests and usage counters migrated and read-back verified. Payloads and blobs were not modified.');
    return;
  }

  admin.initializeApp(projectId ? {projectId} : undefined);
  const db = admin.firestore();
  const migration = buildPersonalLibraryMigration(await readWithAdmin(db));
  console.log(JSON.stringify(migrationSummary(migration, apply, projectId || admin.app().options.projectId || null), null, 2));
  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing this summary.');
    return;
  }
  await writeWithAdmin(db, migration);
  console.log('Personal manifests and usage counters migrated. Payloads and blobs were not modified.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
