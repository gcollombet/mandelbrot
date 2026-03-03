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

const DB_NAME = 'mandelbrot-textures';
const DB_VERSION = 1;
const STORE_NAME = 'textures';

/** Legacy localStorage key used before the IndexedDB migration. */
const LEGACY_STORAGE_KEY = 'mandelbrot_textures';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Lightweight entry returned for listings (no blob). */
export interface TextureMetadata {
  name: string;
  thumbnail: string;   // small data-URL (~5-15 KB)
  date: string;
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
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(
  mode: IDBTransactionMode,
): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
  return openDB().then((db) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
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
  const { store, done } = await tx('readonly');
  const all: TextureRecord[] = await reqToPromise(store.getAll());
  await done;
  return all.map(({ name, thumbnail, date }) => ({ name, thumbnail, date }));
}

/**
 * Return the full Blob for a given texture, or `null` if not found.
 */
export async function getTextureBlob(name: string): Promise<Blob | null> {
  const { store, done } = await tx('readonly');
  const record: TextureRecord | undefined = await reqToPromise(store.get(name));
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
): Promise<void> {
  const record: TextureRecord = {
    name,
    blob,
    thumbnail,
    date: date ?? new Date().toISOString(),
  };
  const { store, done } = await tx('readwrite');
  store.put(record);
  await done;
}

/**
 * Delete a texture by name.
 */
export async function deleteTextureEntry(name: string): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.delete(name);
  await done;
}

/**
 * Rename a texture (delete old key, insert with new name).
 */
export async function renameTextureEntry(
  oldName: string,
  newName: string,
): Promise<void> {
  const { store, done } = await tx('readwrite');
  const record: TextureRecord | undefined = await reqToPromise(store.get(oldName));
  if (!record) {
    await done;
    return;
  }
  store.delete(oldName);
  record.name = newName;
  store.put(record);
  await done;
}

/**
 * Return how many entries are currently stored.
 */
export async function getTextureCount(): Promise<number> {
  const { store, done } = await tx('readonly');
  const count = await reqToPromise(store.count());
  await done;
  return count;
}

// ---------------------------------------------------------------------------
// Migration from localStorage
// ---------------------------------------------------------------------------

/** Convert a base-64 data-URL to a Blob. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

interface LegacyTextureEntry {
  name: string;
  dataUrl: string;
  thumbnail: string;
  date?: string;
}

/**
 * If textures exist in localStorage (legacy format), migrate them to
 * IndexedDB and remove the old key. Safe to call repeatedly — it is a
 * no-op once the legacy key has been cleaned up.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;

  let entries: LegacyTextureEntry[];
  try {
    entries = JSON.parse(raw);
  } catch {
    // Corrupted data — just remove it.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  for (const entry of entries) {
    if (!entry.dataUrl) continue;
    try {
      const blob = dataUrlToBlob(entry.dataUrl);
      await saveTextureEntry(
        entry.name,
        blob,
        entry.thumbnail ?? '',
        entry.date,
      );
    } catch (e) {
      console.warn(`[textureStore] Failed to migrate texture "${entry.name}":`, e);
    }
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
