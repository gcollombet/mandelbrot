import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
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
import type {AnimationPresetRecord} from './animationPresetStore';
import {
  CATALOG_TYPES,
  normalizePublicCatalogManifest,
  PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
  type CatalogType,
  type PublicCatalogManifest,
  type PublicCatalogManifestEntry,
  upsertPublicCatalogManifestEntry,
} from './publicCatalogManifest';

export {CATALOG_TYPES, type CatalogType};

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

export interface RemoteAnimationPresetEntry extends RemoteCatalogMetadata, Omit<AnimationPresetRecord, 'date' | 'favorite' | 'guid' | 'name' | 'lastUpdated' | 'remote'> {}

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
  | RemoteAnimationPresetEntry
  | RemoteTextureEntry;

export type RemoteEntryByType<T extends CatalogType> =
  T extends 'completePreset' ? RemoteCompletePresetEntry
    : T extends 'palettePreset' ? RemotePalettePresetEntry
      : T extends 'stopPreset' ? RemoteStopPresetEntry
        : T extends 'textureMappingPreset' ? RemoteTextureMappingPresetEntry
          : T extends 'animationPreset' ? RemoteAnimationPresetEntry
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

function manifestDoc(db: Firestore) {
  return doc(db, 'catalogManifest', 'current');
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

function manifestForFirestore(manifest: PublicCatalogManifest): DocumentData {
  return {
    schemaVersion: PUBLIC_CATALOG_MANIFEST_SCHEMA_VERSION,
    entries: manifest.entries.map(entry => ({
      type: entry.type,
      guid: entry.guid,
      lastUpdated: Timestamp.fromDate(new Date(entry.lastUpdated)),
    })),
    updatedAt: Timestamp.fromDate(new Date(manifest.updatedAt)),
  };
}

export async function getPublicCatalogManifest(): Promise<PublicCatalogManifest> {
  const {db} = requireServices();
  const snapshot = await getDoc(manifestDoc(db));
  if (!snapshot.exists()) throw new Error('Public catalogue manifest has not been migrated.');
  return normalizePublicCatalogManifest(snapshot.data());
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
  await runTransaction(db, async transaction => {
    const manifestReference = manifestDoc(db);
    const manifestSnapshot = await transaction.get(manifestReference);
    if (!manifestSnapshot.exists()) throw new Error('Public catalogue manifest has not been migrated.');
    const manifest = normalizePublicCatalogManifest(manifestSnapshot.data());
    const publishedAt = Timestamp.now();
    const publishedAtIso = publishedAt.toDate().toISOString();
    const manifestEntry: PublicCatalogManifestEntry = {type, guid: entry.guid, lastUpdated: publishedAtIso};
    const nextManifest = upsertPublicCatalogManifestEntry(manifest, manifestEntry);
    transaction.set(entryDoc(db, type, entry.guid), {
      ...entry,
      guid: entry.guid,
      lastUpdated: publishedAt,
    }, {merge: true});
    transaction.set(manifestReference, manifestForFirestore(nextManifest));
  });
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
    const manifest = await getPublicCatalogManifest();
    const latest = manifest.entries
      .filter(entry => entry.type === 'completePreset')
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))[0];
    return latest ? getRemoteCatalogEntry('completePreset', latest.guid) : null;
  } catch (error) {
    console.warn('[remoteCatalog] Failed to fetch latest remote preset:', error);
    return null;
  }
}
