import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import {getBlob, ref, uploadBytes} from 'firebase/storage';
import type {MandelbrotParams} from './Mandelbrot';
import type {PaletteRecord} from './paletteStore';
import {getFirebaseServices} from './firebaseConfig';
import type {StopPresetRecord} from './stopPresetStore';
import type {TextureMappingPresetRecord} from './textureMappingPresetStore';

export type CatalogType = 'completePreset' | 'palettePreset' | 'stopPreset' | 'texture' | 'textureMappingPreset';

export const CATALOG_TYPES: readonly CatalogType[] = ['completePreset', 'palettePreset', 'stopPreset', 'texture', 'textureMappingPreset'];

export interface RemoteCatalogMetadata {
  guid: string;
  name: string;
  lastUpdated: string;
}

export interface RemoteCompletePresetEntry extends RemoteCatalogMetadata {
  value: MandelbrotParams;
  thumbnail: string;
  scaleExponent?: number;
}

export interface RemotePalettePresetEntry extends RemoteCatalogMetadata, Omit<PaletteRecord, 'date' | 'favorite' | 'guid' | 'name' | 'lastUpdated' | 'remote'> {}

export interface RemoteStopPresetEntry extends RemoteCatalogMetadata, Omit<StopPresetRecord, 'date' | 'favorite' | 'guid' | 'name' | 'lastUpdated' | 'remote'> {}

export interface RemoteTextureMappingPresetEntry extends RemoteCatalogMetadata, Omit<TextureMappingPresetRecord, 'date' | 'favorite' | 'guid' | 'name' | 'lastUpdated' | 'remote' | 'builtIn'> {}

export interface RemoteTextureEntry extends RemoteCatalogMetadata {
  thumbnail: string;
  blobPath: string;
  contentType?: string;
  size?: number;
}

export type RemoteCatalogEntry =
  | RemoteCompletePresetEntry
  | RemotePalettePresetEntry
  | RemoteStopPresetEntry
  | RemoteTextureMappingPresetEntry
  | RemoteTextureEntry;

export type RemoteEntryByType<T extends CatalogType> =
  T extends 'completePreset' ? RemoteCompletePresetEntry
    : T extends 'palettePreset' ? RemotePalettePresetEntry
      : T extends 'stopPreset' ? RemoteStopPresetEntry
        : T extends 'textureMappingPreset' ? RemoteTextureMappingPresetEntry
          : RemoteTextureEntry;

export class RemoteCatalogUnavailableError extends Error {
  constructor() {
    super('Firebase remote catalog is not configured.');
    this.name = 'RemoteCatalogUnavailableError';
  }
}

export class RemoteCatalogNameConflictError extends Error {
  readonly type: CatalogType;
  readonly conflictName: string;

  constructor(type: CatalogType, name: string) {
    super(`A remote ${type} named "${name}" already exists.`);
    this.name = 'RemoteCatalogNameConflictError';
    this.type = type;
    this.conflictName = name;
  }
}

function entriesCollection(db: Firestore, type: CatalogType) {
  return collection(db, 'catalog', type, 'entries');
}

function entryDoc(db: Firestore, type: CatalogType, guid: string) {
  return doc(db, 'catalog', type, 'entries', guid);
}

function requireServices() {
  const services = getFirebaseServices();
  if (!services) throw new RemoteCatalogUnavailableError();
  return services;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string' && value) return value;
  return new Date(0).toISOString();
}

function metadataFromDoc(data: DocumentData, fallbackGuid: string): RemoteCatalogMetadata {
  return {
    guid: typeof data.guid === 'string' && data.guid ? data.guid : fallbackGuid,
    name: typeof data.name === 'string' ? data.name : '',
    lastUpdated: timestampToIso(data.lastUpdated),
  };
}

export async function listRemoteCatalogMetadata(type: CatalogType): Promise<RemoteCatalogMetadata[]> {
  const {db} = requireServices();
  const snapshot = await getDocs(entriesCollection(db, type));
  return snapshot.docs.map(entry => metadataFromDoc(entry.data(), entry.id));
}

export async function listAllRemoteCatalogMetadata(): Promise<Record<CatalogType, RemoteCatalogMetadata[]>> {
  const entries = await Promise.all(CATALOG_TYPES.map(async type => [type, await listRemoteCatalogMetadata(type)] as const));
  return Object.fromEntries(entries) as Record<CatalogType, RemoteCatalogMetadata[]>;
}

export async function getRemoteCatalogEntry<T extends CatalogType>(type: T, guid: string): Promise<RemoteEntryByType<T> | null> {
  const {db} = requireServices();
  const snapshot = await getDoc(entryDoc(db, type, guid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    ...data,
    ...metadataFromDoc(data, snapshot.id),
  } as RemoteEntryByType<T>;
}

export async function getRemoteTextureBlob(entry: RemoteTextureEntry): Promise<Blob> {
  const {storage} = requireServices();
  return getBlob(ref(storage, entry.blobPath));
}

async function assertNoRemoteNameConflict(type: CatalogType, guid: string, name: string): Promise<void> {
  const {db} = requireServices();
  const snapshot = await getDocs(query(entriesCollection(db, type), where('name', '==', name), limit(1)));
  const conflict = snapshot.docs.find(entry => entry.id !== guid && entry.data().guid !== guid);
  if (conflict) throw new RemoteCatalogNameConflictError(type, name);
}

export async function uploadRemoteCatalogEntry<T extends CatalogType>(type: T, entry: RemoteEntryByType<T>): Promise<RemoteEntryByType<T>> {
  const {db} = requireServices();
  await assertNoRemoteNameConflict(type, entry.guid, entry.name);
  await setDoc(entryDoc(db, type, entry.guid), {
    ...entry,
    guid: entry.guid,
    lastUpdated: serverTimestamp(),
  }, {merge: true});
  const uploaded = await getRemoteCatalogEntry(type, entry.guid);
  if (!uploaded) throw new Error(`Uploaded ${type} "${entry.guid}" could not be read back.`);
  return uploaded;
}

export async function uploadRemoteTextureEntry(entry: Omit<RemoteTextureEntry, 'blobPath'>, blob: Blob): Promise<RemoteTextureEntry> {
  const {storage} = requireServices();
  const blobPath = `catalog/texture/${entry.guid}`;
  await uploadBytes(ref(storage, blobPath), blob, {contentType: entry.contentType ?? blob.type});
  return uploadRemoteCatalogEntry('texture', {
    ...entry,
    blobPath,
    contentType: entry.contentType ?? blob.type,
    size: entry.size ?? blob.size,
  });
}

export async function getLatestRemotePreset(): Promise<RemoteCompletePresetEntry | null> {
  try {
    const {db} = requireServices();
    const snapshot = await getDocs(query(entriesCollection(db, 'completePreset'), orderBy('lastUpdated', 'desc'), limit(1)));
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      ...data,
      ...metadataFromDoc(data, doc.id),
    } as RemoteCompletePresetEntry;
  } catch (error) {
    console.warn('[remoteCatalog] Failed to fetch latest remote preset:', error);
    return null;
  }
}
