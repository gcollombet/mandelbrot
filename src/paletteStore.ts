/**
 * IndexedDB-based storage for saved palettes.
 *
 * Palettes are stored with `name` as the primary key (unique identifier).
 * Each record contains the full color stops array, interpolation mode,
 * period/offset, texture name, a thumbnail data-URL, and a date.
 *
 * The legacy `mandelbrot_palettes` localStorage key is migrated
 * automatically on first access.
 */

import type {ColorStop} from './ColorStop';
import type {InterpolationMode} from './Mandelbrot';

const DB_NAME = 'mandelbrot-palettes';
const DB_VERSION = 1;
const STORE_NAME = 'palettes';

/** Legacy localStorage key used before the IndexedDB migration. */
const LEGACY_STORAGE_KEY = 'mandelbrot_palettes';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Full record stored in IndexedDB. */
export interface PaletteRecord {
  name: string;
  colorStops: ColorStop[];
  thumbnail?: string;
  date?: string;
  textureName?: string;
  interpolationMode?: InterpolationMode;
  palettePeriod?: number;
  paletteOffset?: number;
}

/** Lightweight entry for listings (same shape since palettes are small). */
export type PaletteMetadata = PaletteRecord;

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
 * Return all stored palettes, sorted newest-first by date.
 */
export async function getAllPaletteEntries(): Promise<PaletteRecord[]> {
  const { store, done } = await tx('readonly');
  const all: PaletteRecord[] = await reqToPromise(store.getAll());
  await done;
  return all.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

/**
 * Return a single palette by name, or `null` if not found.
 */
export async function getPaletteByName(name: string): Promise<PaletteRecord | null> {
  const { store, done } = await tx('readonly');
  const record: PaletteRecord | undefined = await reqToPromise(store.get(name));
  await done;
  return record ?? null;
}

/**
 * Store (or overwrite) a palette entry.
 */
export async function savePaletteEntry(record: PaletteRecord): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.put(record);
  await done;
}

/**
 * Delete a palette by name.
 */
export async function deletePaletteEntry(name: string): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.delete(name);
  await done;
}

/**
 * Return how many palettes are currently stored.
 */
export async function getPaletteCount(): Promise<number> {
  const { store, done } = await tx('readonly');
  const count = await reqToPromise(store.count());
  await done;
  return count;
}

// ---------------------------------------------------------------------------
// Migration from localStorage
// ---------------------------------------------------------------------------

/**
 * If palettes exist in localStorage (legacy format), migrate them to
 * IndexedDB and remove the old key. Safe to call repeatedly — it is a
 * no-op once the legacy key has been cleaned up.
 */
export async function migratePalettesFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;

  let entries: PaletteRecord[];
  try {
    entries = JSON.parse(raw);
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  for (const entry of entries) {
    if (!entry.name || !entry.colorStops) continue;
    try {
      await savePaletteEntry(entry);
    } catch (e) {
      console.warn(`[paletteStore] Failed to migrate palette "${entry.name}":`, e);
    }
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
