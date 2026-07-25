import {collection, doc, getDoc, getDocs, query, where, type DocumentData, type Timestamp} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {getBlob, ref, uploadBytes} from 'firebase/storage';
import {getFirebaseServices} from './firebaseConfig';
import type {
  GuestImportBatch,
  PersonalPresetManifest,
  PersonalPresetManifestEntry,
  PersonalRecordEnvelope,
  PersonalTextureMetadata,
  PersonalUsage,
} from './personalLibraryTypes';

export class PersonalLibraryUnavailableError extends Error {
  constructor() {
    super('Firebase personal library is not configured.');
    this.name = 'PersonalLibraryUnavailableError';
  }
}

function requireServices() {
  const services = getFirebaseServices();
  if (!services) throw new PersonalLibraryUnavailableError();
  return services;
}

function timestampToIso(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

function personalRecordFromDoc(data: DocumentData, guid: string): PersonalRecordEnvelope {
  return {
    guid,
    type: data.type,
    payload: data.payload,
    name: typeof data.name === 'string' ? data.name : '',
    thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : undefined,
    favorite: data.favorite === true,
    updatedAt: timestampToIso(data.updatedAt),
    revision: Number(data.revision || 0),
  };
}

export async function getPersonalPresetManifest(): Promise<PersonalPresetManifest> {
  const {functions} = requireServices();
  const call = httpsCallable<Record<string, never>, PersonalPresetManifest>(functions, 'getPersonalPresetManifest');
  const data = (await call({})).data;
  const entries = Array.isArray(data.entries)
    ? data.entries.filter((entry): entry is PersonalPresetManifestEntry => (
      typeof entry?.guid === 'string'
      && typeof entry?.type === 'string'
      && Number.isFinite(Number(entry?.revision))
    ))
    : [];
  return {
    revision: Math.max(0, Number(data.revision || 0)),
    entries: entries.map(entry => ({
      guid: entry.guid,
      type: entry.type,
      revision: Math.max(0, Number(entry.revision || 0)),
    })),
  };
}

export async function getPersonalPresetRecord(uid: string, guid: string): Promise<PersonalRecordEnvelope | null> {
  const {db} = requireServices();
  const snapshot = await getDoc(doc(db, 'users', uid, 'presets', guid));
  return snapshot.exists() ? personalRecordFromDoc(snapshot.data(), snapshot.id) : null;
}

export async function getPersonalUsage(uid: string): Promise<PersonalUsage> {
  const {db} = requireServices();
  const snapshot = await getDoc(doc(db, 'users', uid, 'usage', 'current'));
  const data = snapshot.data() || {};
  return {
    presetCount: Number(data.presetCount || 0),
    textureCount: Number(data.textureCount || 0),
    revision: Number(data.revision || 0),
  };
}

export async function listPersonalTextureMetadata(uid: string): Promise<PersonalTextureMetadata[]> {
  const {db} = requireServices();
  const snapshot = await getDocs(collection(db, 'users', uid, 'textures'));
  return snapshot.docs.map(entry => {
    const data = entry.data();
    return {
      guid: entry.id,
      name: typeof data.name === 'string' ? data.name : entry.id,
      kind: data.kind === 'skybox' ? 'skybox' : 'texture',
      contentType: 'image/webp',
      storagePath: data.storagePath,
      width: Number(data.width || 0),
      height: Number(data.height || 0),
      byteSize: Number(data.byteSize || 0),
      thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : '',
      updatedAt: timestampToIso(data.updatedAt),
      revision: Number(data.revision || 0),
    };
  });
}

export async function upsertPersonalPreset(record: PersonalRecordEnvelope): Promise<{guid: string; revision: number; presetCount: number}> {
  const {functions} = requireServices();
  const call = httpsCallable<{record: PersonalRecordEnvelope}, {guid: string; revision: number; presetCount: number}>(functions, 'upsertPersonalPreset');
  return (await call({record})).data;
}

export async function deletePersonalPreset(guid: string): Promise<{guid: string; deleted: boolean; presetCount: number}> {
  const {functions} = requireServices();
  const call = httpsCallable<{guid: string}, {guid: string; deleted: boolean; presetCount: number}>(functions, 'deletePersonalPreset');
  return (await call({guid})).data;
}

export async function reservePersonalTexture(guid: string): Promise<{guid: string; fileName: string; storagePath: string; textureCount: number}> {
  const {functions} = requireServices();
  const call = httpsCallable<{guid: string}, {guid: string; fileName: string; storagePath: string; textureCount: number}>(functions, 'reservePersonalTexture');
  return (await call({guid})).data;
}

export async function uploadPersonalTextureBlob(storagePath: string, blob: Blob): Promise<void> {
  const {storage} = requireServices();
  await uploadBytes(ref(storage, storagePath), blob, {contentType: 'image/webp'});
}

export async function finalizePersonalTexture(metadata: PersonalTextureMetadata): Promise<{guid: string; revision: number; storagePath: string}> {
  const {functions} = requireServices();
  const call = httpsCallable<{metadata: PersonalTextureMetadata}, {guid: string; revision: number; storagePath: string}>(functions, 'finalizePersonalTexture');
  return (await call({metadata})).data;
}

export async function deletePersonalTexture(guid: string): Promise<{guid: string; deleted: boolean; textureCount: number}> {
  const {functions} = requireServices();
  const call = httpsCallable<{guid: string}, {guid: string; deleted: boolean; textureCount: number}>(functions, 'deletePersonalTexture');
  return (await call({guid})).data;
}

export async function fetchPersonalTextureBlob(storagePath: string): Promise<Blob> {
  const {storage} = requireServices();
  return getBlob(ref(storage, storagePath));
}

export async function savePersonalImportBatch(batch: GuestImportBatch): Promise<void> {
  const {functions} = requireServices();
  const call = httpsCallable<{batch: GuestImportBatch}, {id: string}>(functions, 'savePersonalImportBatch');
  await call({batch});
}

export async function listPersonalImportBatches(uid: string): Promise<GuestImportBatch[]> {
  const {db} = requireServices();
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
  const {functions} = requireServices();
  const call = httpsCallable<Record<string, never>, {repaired: number}>(functions, 'repairExpiredTextureReservations');
  return (await call({})).data.repaired;
}

export async function repairPersonalUsage(uid?: string): Promise<PersonalUsage> {
  const {functions} = requireServices();
  const call = httpsCallable<{uid?: string}, PersonalUsage>(functions, 'repairPersonalUsage');
  return (await call(uid ? {uid} : {})).data;
}
