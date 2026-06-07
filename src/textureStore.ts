/**
 * IndexedDB-based storage for tessellation textures.
 *
 * Textures are stored as native Blobs (no base64 overhead) which allows
 * storing hundreds of MB — far beyond the ~5 MB localStorage quota.
 *
 * The lightweight metadata (name, thumbnail data-URL, date) is kept
 * alongside each blob so the dropdown list can be populated without
 * reading the full images into memory.
 */

import {createGuid, makeUniqueName, type CatalogRemoteState} from './catalogIdentity';

const DB_NAME = 'mandelbrot-textures';
const DB_VERSION = 3;
const LEGACY_STORE_NAME = 'textures';
const METADATA_STORE_NAME = 'textureMetadata';
const BLOB_STORE_NAME = 'textureBlobs';



// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Lightweight entry returned for listings (no blob). */
export interface TextureMetadata {
  guid?: string;
  name: string;
  thumbnail: string;   // small data-URL (~5-15 KB)
  date: string;
  lastUpdated?: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
}

/** Full record stored in IndexedDB. */
export interface TextureRecord extends TextureMetadata {
  blob: Blob;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const transaction = req.transaction;
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        const metadataStore = db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'name' });
        metadataStore.createIndex('guid', 'guid', { unique: true });
      } else if (transaction) {
        const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
        if (!metadataStore.indexNames.contains('guid')) {
          metadataStore.createIndex('guid', 'guid', { unique: true });
        }
        metadataStore.openCursor().onsuccess = (cursorEvent) => {
          const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const record = cursor.value as TextureMetadata;
          const date = record.date ?? new Date().toISOString();
          cursor.update({
            ...record,
            guid: record.guid || createGuid(),
            date,
            lastUpdated: record.lastUpdated || date,
            favorite: record.favorite ?? false,
          });
          cursor.continue();
        };
      }
      if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
        db.createObjectStore(BLOB_STORE_NAME, { keyPath: 'name' });
      }
      if (event.oldVersion < 2 && transaction && db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        const legacyStore = transaction.objectStore(LEGACY_STORE_NAME);
        const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
        const blobStore = transaction.objectStore(BLOB_STORE_NAME);
        legacyStore.openCursor().onsuccess = (cursorEvent) => {
          const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const record = cursor.value as TextureRecord;
          metadataStore.put({
            name: record.name,
            thumbnail: record.thumbnail,
            date: record.date,
          });
          blobStore.put({
            name: record.name,
            blob: record.blob,
          });
          cursor.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return { store, done };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return metadata for every stored texture (cheap — no blobs loaded).
 */
export async function getAllTextureEntries(): Promise<TextureMetadata[]> {
  const { store, done } = await tx(METADATA_STORE_NAME, 'readonly');
  const all: TextureMetadata[] = await reqToPromise(store.getAll());
  await done;
  return all;
}

export async function getTextureMetadataByName(name: string): Promise<TextureMetadata | null> {
  const { store, done } = await tx(METADATA_STORE_NAME, 'readonly');
  const metadata: TextureMetadata | undefined = await reqToPromise(store.get(name));
  await done;
  return metadata ?? null;
}

export async function getTextureMetadataByGuid(guid: string): Promise<TextureMetadata | null> {
  const all = await getAllTextureEntries();
  return all.find(record => record.guid === guid) ?? null;
}

export async function updateTextureMetadata(metadata: TextureMetadata): Promise<void> {
  const { store, done } = await tx(METADATA_STORE_NAME, 'readwrite');
  store.put({
    ...metadata,
    guid: metadata.guid || createGuid(),
    lastUpdated: metadata.lastUpdated || metadata.date,
    favorite: metadata.favorite ?? false,
  });
  await done;
}

async function uniqueTextureName(name: string, guid?: string): Promise<string> {
  const all = await getAllTextureEntries();
  return makeUniqueName(name, all.filter(record => record.guid !== guid).map(record => record.name));
}

/**
 * Return the full Blob for a given texture, or `null` if not found.
 */
export async function getTextureBlob(name: string): Promise<Blob | null> {
  const { store, done } = await tx(BLOB_STORE_NAME, 'readonly');
  const record: { name: string; blob: Blob } | undefined = await reqToPromise(store.get(name));
  await done;
  return record?.blob ?? null;
}

/**
 * Store (or overwrite) a texture entry.
 */
export async function saveTextureEntry(
  name: string,
  blob: Blob,
  thumbnail: string,
  date?: string,
  guid = createGuid(),
  favorite = false,
  remote?: CatalogRemoteState,
): Promise<void> {
  if (!name.trim()) throw new Error('Texture name is required.');
  const resolvedDate = date ?? new Date().toISOString();
  const resolvedName = await uniqueTextureName(name.trim(), guid);
  const metadata: TextureMetadata = {
    guid,
    name: resolvedName,
    thumbnail,
    date: resolvedDate,
    lastUpdated: resolvedDate,
    favorite,
    remote,
  };
  const db = await openDB();
  const transaction = db.transaction([METADATA_STORE_NAME, BLOB_STORE_NAME], 'readwrite');
  transaction.objectStore(METADATA_STORE_NAME).put(metadata);
  transaction.objectStore(BLOB_STORE_NAME).put({ name: resolvedName, blob });
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  await done;
}

export async function saveRemoteTextureEntry(metadata: TextureMetadata, blob: Blob): Promise<void> {
  if (!metadata.guid) metadata.guid = createGuid();
  const existing = await getTextureMetadataByGuid(metadata.guid);
  await saveTextureEntry(
    existing?.name ?? metadata.name,
    blob,
    metadata.thumbnail,
    existing?.date ?? metadata.date,
    metadata.guid,
    existing?.favorite ?? false,
    metadata.remote,
  );
}

/**
 * Delete a texture by name.
 */
export async function deleteTextureEntry(name: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([METADATA_STORE_NAME, BLOB_STORE_NAME], 'readwrite');
  transaction.objectStore(METADATA_STORE_NAME).delete(name);
  transaction.objectStore(BLOB_STORE_NAME).delete(name);
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  await done;
}

/**
 * Rename a texture (delete old key, insert with new name).
 */
export async function renameTextureEntry(
  oldName: string,
  newName: string,
): Promise<void> {
  const { store, done } = await tx(METADATA_STORE_NAME, 'readonly');
  const metadata: TextureMetadata | undefined = await reqToPromise(store.get(oldName));
  await done;
  const blob = await getTextureBlob(oldName);
  if (!metadata || !blob) return;
  await saveTextureEntry(newName, blob, metadata.thumbnail, metadata.date, metadata.guid, metadata.favorite ?? false, metadata.remote);
  await deleteTextureEntry(oldName);
}

/**
 * Return how many entries are currently stored.
 */
export async function getTextureCount(): Promise<number> {
  const { store, done } = await tx(METADATA_STORE_NAME, 'readonly');
  const count = await reqToPromise(store.count());
  await done;
  return count;
}


