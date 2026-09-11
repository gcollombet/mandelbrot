import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import {deleteObject, getBlob, getMetadata, ref, uploadBytes} from 'firebase/storage';
import {getFirebaseServices} from './firebaseConfig';
import type {
  GuestImportBatch,
  PersonalPresetManifest,
  PersonalRecordEnvelope,
  PersonalTextureMetadata,
  PersonalUsage,
} from './personalLibraryTypes';
import {
  assertPersonalPresetPayloadSize,
  normalizePersonalPresetManifest,
  normalizePersonalPresetManifestEntries,
  normalizePersonalUsage,
  normalizedRevision,
  personalQuotaCountAfter,
  PersonalLibraryValidationError,
  removePersonalPresetManifestEntry,
  requirePersonalGuid,
  requirePersonalPresetType,
  upsertPersonalPresetManifestEntry,
  validatePersonalTextureMetadata,
} from './personalLibraryValidation';

export class PersonalLibraryUnavailableError extends Error {
  constructor() {
    super('Firebase personal library is not configured.');
    this.name = 'PersonalLibraryUnavailableError';
  }
}

export class PersonalLibraryAuthenticationError extends Error {
  constructor() {
    super('Authentication is required for the personal library.');
    this.name = 'PersonalLibraryAuthenticationError';
  }
}

function requireServices() {
  const services = getFirebaseServices();
  if (!services) throw new PersonalLibraryUnavailableError();
  return services;
}

function requireOwnerServices(expectedUid?: string) {
  const services = requireServices();
  const uid = services.auth.currentUser?.uid;
  if (!uid || (expectedUid !== undefined && uid !== expectedUid)) {
    throw new PersonalLibraryAuthenticationError();
  }
  return {...services, uid};
}

function timestampToIso(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

function personalRecordFromDoc(data: DocumentData, guid: string): PersonalRecordEnvelope {
  return {
    guid,
    type: requirePersonalPresetType(data.type),
    payload: data.payload,
    name: typeof data.name === 'string' ? data.name : '',
    thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : undefined,
    favorite: data.favorite === true,
    updatedAt: timestampToIso(data.updatedAt),
    revision: normalizedRevision(data.revision),
  };
}

function presetManifestRef(db: Firestore, uid: string) {
  return doc(db, 'users', uid, 'manifests', 'presets');
}

function usageRef(db: Firestore, uid: string) {
  return doc(db, 'users', uid, 'usage', 'current');
}

function presetRef(db: Firestore, uid: string, guid: string) {
  return doc(db, 'users', uid, 'presets', guid);
}

function textureRef(db: Firestore, uid: string, guid: string) {
  return doc(db, 'users', uid, 'textures', guid);
}

function textureFileName(guid: string): string {
  return `${requirePersonalGuid(guid)}.webp`;
}

function textureStoragePath(uid: string, guid: string): string {
  return `users/${uid}/textures/${textureFileName(guid)}`;
}

function reservationRef(db: Firestore, uid: string, guid: string) {
  return doc(db, 'users', uid, 'textureReservations', textureFileName(guid));
}

function manifestForWrite(entries: unknown, revision: number) {
  return {
    entries: normalizePersonalPresetManifestEntries(entries),
    revision,
    updatedAt: serverTimestamp(),
  };
}

function usageForWrite(usage: PersonalUsage, changes: Partial<Pick<PersonalUsage, 'presetCount' | 'textureCount'>>) {
  return {
    presetCount: changes.presetCount ?? usage.presetCount,
    textureCount: changes.textureCount ?? usage.textureCount,
    revision: usage.revision + 1,
    updatedAt: serverTimestamp(),
  };
}

function assertMigratedManifest(manifestExists: boolean, usage: PersonalUsage): void {
  if (!manifestExists && usage.presetCount > 0) {
    throw new Error('Personal preset manifest has not been migrated.');
  }
}

export async function getPersonalPresetManifest(): Promise<PersonalPresetManifest> {
  const {db, uid} = requireOwnerServices();
  return runTransaction(db, async transaction => {
    const manifestTarget = presetManifestRef(db, uid);
    const usageTarget = usageRef(db, uid);
    const [manifestSnapshot, usageSnapshot] = await Promise.all([
      transaction.get(manifestTarget),
      transaction.get(usageTarget),
    ]);
    const usage = normalizePersonalUsage(usageSnapshot.data());
    if (manifestSnapshot.exists()) return normalizePersonalPresetManifest(manifestSnapshot.data());
    assertMigratedManifest(false, usage);
    const manifest: PersonalPresetManifest = {entries: [], revision: 1};
    transaction.set(manifestTarget, manifestForWrite(manifest.entries, manifest.revision));
    if (!usageSnapshot.exists()) transaction.set(usageTarget, usageForWrite(usage, {}));
    return manifest;
  });
}

export async function getPersonalPresetRecord(uid: string, guid: string): Promise<PersonalRecordEnvelope | null> {
  const {db} = requireOwnerServices(uid);
  const safeGuid = requirePersonalGuid(guid);
  const snapshot = await getDoc(presetRef(db, uid, safeGuid));
  return snapshot.exists() ? personalRecordFromDoc(snapshot.data(), snapshot.id) : null;
}

export async function getPersonalUsage(uid: string): Promise<PersonalUsage> {
  const {db} = requireOwnerServices(uid);
  const snapshot = await getDoc(usageRef(db, uid));
  return normalizePersonalUsage(snapshot.data());
}

export async function listPersonalTextureMetadata(uid: string): Promise<PersonalTextureMetadata[]> {
  const {db} = requireOwnerServices(uid);
  const snapshot = await getDocs(collection(db, 'users', uid, 'textures'));
  return snapshot.docs.map(entry => {
    const data = entry.data();
    return {
      guid: requirePersonalGuid(entry.id),
      name: typeof data.name === 'string' ? data.name : entry.id,
      kind: data.kind === 'skybox' ? 'skybox' : 'texture',
      contentType: 'image/webp',
      storagePath: typeof data.storagePath === 'string' ? data.storagePath : textureStoragePath(uid, entry.id),
      width: Number(data.width || 0),
      height: Number(data.height || 0),
      byteSize: Number(data.byteSize || 0),
      thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : '',
      updatedAt: timestampToIso(data.updatedAt),
      revision: normalizedRevision(data.revision),
    };
  });
}

export async function upsertPersonalPreset(record: PersonalRecordEnvelope): Promise<{guid: string; revision: number; presetCount: number}> {
  const {db, uid} = requireOwnerServices();
  const guid = requirePersonalGuid(record.guid);
  const type = requirePersonalPresetType(record.type);
  assertPersonalPresetPayloadSize(record);
  const cleanRecord = JSON.parse(JSON.stringify(record)) as PersonalRecordEnvelope;
  return runTransaction(db, async transaction => {
    const target = presetRef(db, uid, guid);
    const usageTarget = usageRef(db, uid);
    const manifestTarget = presetManifestRef(db, uid);
    const [targetSnapshot, usageSnapshot, manifestSnapshot] = await Promise.all([
      transaction.get(target),
      transaction.get(usageTarget),
      transaction.get(manifestTarget),
    ]);
    const usage = normalizePersonalUsage(usageSnapshot.data());
    assertMigratedManifest(manifestSnapshot.exists(), usage);
    const manifest = normalizePersonalPresetManifest(manifestSnapshot.data());
    const presetCount = personalQuotaCountAfter('preset', usage.presetCount, targetSnapshot.exists(), 'upsert');
    const revision = normalizedRevision(targetSnapshot.data()?.revision) + 1;
    transaction.set(target, {
      ...cleanRecord,
      guid,
      type,
      ownerUid: uid,
      revision,
      updatedAt: serverTimestamp(),
    });
    transaction.set(manifestTarget, manifestForWrite(
      upsertPersonalPresetManifestEntry(manifest.entries, {guid, type, revision}),
      manifest.revision + 1,
    ));
    transaction.set(usageTarget, usageForWrite(usage, {presetCount}), {merge: true});
    return {guid, revision, presetCount};
  });
}

export async function deletePersonalPreset(guid: string): Promise<{guid: string; deleted: boolean; presetCount: number}> {
  const {db, uid} = requireOwnerServices();
  const safeGuid = requirePersonalGuid(guid);
  return runTransaction(db, async transaction => {
    const target = presetRef(db, uid, safeGuid);
    const usageTarget = usageRef(db, uid);
    const manifestTarget = presetManifestRef(db, uid);
    const [targetSnapshot, usageSnapshot, manifestSnapshot] = await Promise.all([
      transaction.get(target),
      transaction.get(usageTarget),
      transaction.get(manifestTarget),
    ]);
    const usage = normalizePersonalUsage(usageSnapshot.data());
    assertMigratedManifest(manifestSnapshot.exists(), usage);
    const manifest = normalizePersonalPresetManifest(manifestSnapshot.data());
    const presetCount = personalQuotaCountAfter('preset', usage.presetCount, targetSnapshot.exists(), 'delete');
    if (targetSnapshot.exists()) transaction.delete(target);
    transaction.set(manifestTarget, manifestForWrite(
      removePersonalPresetManifestEntry(manifest.entries, safeGuid),
      manifest.revision + 1,
    ));
    transaction.set(usageTarget, usageForWrite(usage, {presetCount}), {merge: true});
    return {guid: safeGuid, deleted: targetSnapshot.exists(), presetCount};
  });
}

export async function reservePersonalTexture(guid: string): Promise<{guid: string; fileName: string; storagePath: string; textureCount: number}> {
  const {db, uid} = requireOwnerServices();
  const safeGuid = requirePersonalGuid(guid);
  const fileName = textureFileName(safeGuid);
  const storagePath = textureStoragePath(uid, safeGuid);
  return runTransaction(db, async transaction => {
    const target = textureRef(db, uid, safeGuid);
    const reservation = reservationRef(db, uid, safeGuid);
    const usageTarget = usageRef(db, uid);
    const [targetSnapshot, reservationSnapshot, usageSnapshot] = await Promise.all([
      transaction.get(target),
      transaction.get(reservation),
      transaction.get(usageTarget),
    ]);
    const usage = normalizePersonalUsage(usageSnapshot.data());
    const alreadyCounted = targetSnapshot.exists() || reservationSnapshot.exists();
    const counted = reservationSnapshot.exists()
      ? reservationSnapshot.data().counted === true
      : !targetSnapshot.exists();
    const textureCount = personalQuotaCountAfter('texture', usage.textureCount, alreadyCounted, 'upsert');
    transaction.set(reservation, {
      guid: safeGuid,
      ownerUid: uid,
      fileName,
      counted,
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
      updatedAt: serverTimestamp(),
    });
    transaction.set(usageTarget, usageForWrite(usage, {textureCount}), {merge: true});
    return {guid: safeGuid, fileName, storagePath, textureCount};
  });
}

export async function uploadPersonalTextureBlob(storagePath: string, blob: Blob): Promise<void> {
  const {storage, uid} = requireOwnerServices();
  if (!storagePath.startsWith(`users/${uid}/textures/`)) throw new PersonalLibraryAuthenticationError();
  await uploadBytes(ref(storage, storagePath), blob, {contentType: 'image/webp'});
}

export async function finalizePersonalTexture(metadata: PersonalTextureMetadata): Promise<{guid: string; revision: number; storagePath: string}> {
  const {db, storage, uid} = requireOwnerServices();
  const validated = validatePersonalTextureMetadata(metadata);
  const storagePath = textureStoragePath(uid, validated.guid);
  if (validated.storagePath !== storagePath) throw new PersonalLibraryValidationError('invalid-storage-path');
  const object = await getMetadata(ref(storage, storagePath));
  const actualSize = Number(object.size || 0);
  if (object.contentType !== 'image/webp' || actualSize !== validated.byteSize) {
    throw new PersonalLibraryValidationError('uploaded-texture-metadata-mismatch');
  }
  return runTransaction(db, async transaction => {
    const target = textureRef(db, uid, validated.guid);
    const reservation = reservationRef(db, uid, validated.guid);
    const [targetSnapshot, reservationSnapshot] = await Promise.all([
      transaction.get(target),
      transaction.get(reservation),
    ]);
    if (!targetSnapshot.exists() && !reservationSnapshot.exists()) {
      throw new PersonalLibraryValidationError('texture-reservation-missing');
    }
    const revision = normalizedRevision(targetSnapshot.data()?.revision) + 1;
    transaction.set(target, {
      ...validated,
      ownerUid: uid,
      storagePath,
      contentType: 'image/webp',
      revision,
      updatedAt: serverTimestamp(),
    });
    if (reservationSnapshot.exists()) transaction.delete(reservation);
    return {guid: validated.guid, revision, storagePath};
  });
}

function isStorageObjectNotFound(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as {code?: unknown}).code === 'storage/object-not-found';
}

async function deletePersonalTextureObject(storagePath: string): Promise<void> {
  const {storage} = requireServices();
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    if (!isStorageObjectNotFound(error)) throw error;
  }
}

export async function deletePersonalTexture(guid: string): Promise<{guid: string; deleted: boolean; textureCount: number}> {
  const {db, uid} = requireOwnerServices();
  const safeGuid = requirePersonalGuid(guid);
  const result = await runTransaction(db, async transaction => {
    const target = textureRef(db, uid, safeGuid);
    const reservation = reservationRef(db, uid, safeGuid);
    const usageTarget = usageRef(db, uid);
    const [targetSnapshot, reservationSnapshot, usageSnapshot] = await Promise.all([
      transaction.get(target),
      transaction.get(reservation),
      transaction.get(usageTarget),
    ]);
    const usage = normalizePersonalUsage(usageSnapshot.data());
    const counted = targetSnapshot.exists() || reservationSnapshot.data()?.counted === true;
    const textureCount = personalQuotaCountAfter('texture', usage.textureCount, counted, 'delete');
    if (targetSnapshot.exists()) transaction.delete(target);
    if (reservationSnapshot.exists()) transaction.delete(reservation);
    transaction.set(usageTarget, usageForWrite(usage, {textureCount}), {merge: true});
    return {guid: safeGuid, deleted: counted, textureCount};
  });
  await deletePersonalTextureObject(textureStoragePath(uid, safeGuid));
  return result;
}

export async function fetchPersonalTextureBlob(storagePath: string): Promise<Blob> {
  const {storage, uid} = requireOwnerServices();
  if (!storagePath.startsWith(`users/${uid}/textures/`)) throw new PersonalLibraryAuthenticationError();
  return getBlob(ref(storage, storagePath));
}

export async function savePersonalImportBatch(batch: GuestImportBatch): Promise<void> {
  const {db, uid} = requireOwnerServices();
  const id = requirePersonalGuid(batch.id);
  if (batch.uid !== uid) throw new PersonalLibraryAuthenticationError();
  if (!['pending', 'running', 'complete', 'error'].includes(batch.status)) {
    throw new PersonalLibraryValidationError('invalid-import-status');
  }
  await setDoc(doc(db, 'users', uid, 'importBatches', id), {
    ...batch,
    id,
    uid,
    ownerUid: uid,
    lastError: typeof batch.lastError === 'string' ? batch.lastError : null,
    updatedAt: serverTimestamp(),
  }, {merge: true});
}

export async function listPersonalImportBatches(uid: string): Promise<GuestImportBatch[]> {
  const {db} = requireOwnerServices(uid);
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'importBatches'),
    where('status', 'in', ['pending', 'running', 'error']),
  ));
  return snapshot.docs.flatMap(entry => {
    const data = entry.data();
    const status = data.status;
    if (status !== 'pending' && status !== 'running' && status !== 'complete' && status !== 'error') return [];
    return [{
      id: entry.id,
      uid,
      status,
      presetGuids: Array.isArray(data.presetGuids) ? data.presetGuids.filter((guid): guid is string => typeof guid === 'string') : [],
      textureGuids: Array.isArray(data.textureGuids) ? data.textureGuids.filter((guid): guid is string => typeof guid === 'string') : [],
      completedPresetGuids: Array.isArray(data.completedPresetGuids)
        ? data.completedPresetGuids.filter((guid): guid is string => typeof guid === 'string')
        : [],
      completedTextureGuids: Array.isArray(data.completedTextureGuids)
        ? data.completedTextureGuids.filter((guid): guid is string => typeof guid === 'string')
        : [],
      updatedAt: timestampToIso(data.updatedAt),
      lastError: typeof data.lastError === 'string' ? data.lastError : undefined,
    }];
  });
}

export async function repairExpiredPersonalTextureReservations(): Promise<number> {
  const {db, uid} = requireOwnerServices();
  const expired = await getDocs(query(
    collection(db, 'users', uid, 'textureReservations'),
    where('expiresAt', '<=', Timestamp.now()),
  ));
  let repaired = 0;
  for (const snapshot of expired.docs) {
    const data = snapshot.data();
    let guid: string;
    try {
      guid = requirePersonalGuid(data.guid);
    } catch {
      continue;
    }
    const repair = await runTransaction(db, async transaction => {
      const reservation = reservationRef(db, uid, guid);
      const target = textureRef(db, uid, guid);
      const usageTarget = usageRef(db, uid);
      const [reservationSnapshot, targetSnapshot, usageSnapshot] = await Promise.all([
        transaction.get(reservation),
        transaction.get(target),
        transaction.get(usageTarget),
      ]);
      if (!reservationSnapshot.exists() || targetSnapshot.exists()) {
        if (reservationSnapshot.exists()) transaction.delete(reservation);
        return {released: false, deleteBlob: false};
      }
      const usage = normalizePersonalUsage(usageSnapshot.data());
      const counted = reservationSnapshot.data().counted === true;
      transaction.delete(reservation);
      if (counted) {
        transaction.set(usageTarget, usageForWrite(usage, {
          textureCount: personalQuotaCountAfter('texture', usage.textureCount, true, 'delete'),
        }), {merge: true});
      }
      return {released: counted, deleteBlob: true};
    });
    if (repair.deleteBlob) await deletePersonalTextureObject(textureStoragePath(uid, guid));
    if (repair.released) repaired += 1;
  }
  return repaired;
}

export async function repairPersonalUsage(): Promise<PersonalUsage> {
  const {db, uid} = requireOwnerServices();
  const [presets, textures] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'presets')),
    getDocs(collection(db, 'users', uid, 'textures')),
  ]);
  if (presets.size > 400 || textures.size > 10) {
    throw new PersonalLibraryValidationError('quota-exceeded', 'Existing personal data exceeds configured quota.');
  }
  const entries = presets.docs.map(entry => ({
    guid: requirePersonalGuid(entry.id),
    type: requirePersonalPresetType(entry.data().type),
    revision: normalizedRevision(entry.data().revision),
  })).sort((left, right) => left.guid.localeCompare(right.guid));
  return runTransaction(db, async transaction => {
    const usageTarget = usageRef(db, uid);
    const manifestTarget = presetManifestRef(db, uid);
    const [usageSnapshot, manifestSnapshot] = await Promise.all([
      transaction.get(usageTarget),
      transaction.get(manifestTarget),
    ]);
    const usage = normalizePersonalUsage(usageSnapshot.data());
    const manifest = normalizePersonalPresetManifest(manifestSnapshot.data());
    transaction.set(usageTarget, {
      ...usageForWrite(usage, {presetCount: presets.size, textureCount: textures.size}),
      repairedAt: serverTimestamp(),
    }, {merge: true});
    transaction.set(manifestTarget, {
      ...manifestForWrite(entries, manifest.revision + 1),
      repairedAt: serverTimestamp(),
    }, {merge: true});
    return {presetCount: presets.size, textureCount: textures.size, revision: usage.revision + 1};
  });
}
