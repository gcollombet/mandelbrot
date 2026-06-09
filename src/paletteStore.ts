/**
 * IndexedDB-based storage for saved palettes.
 *
 * Palettes are stored with `name` as the primary key (unique identifier).
 * Each record contains the full color stops array, interpolation mode,
 * period/offset, material/texture look settings, a thumbnail data-URL,
 * and a date.
 *
 * The legacy `mandelbrot_palettes` localStorage key is migrated
 * automatically on first access.
 */

import type {ColorStop} from './ColorStop';
import type {InterpolationMode} from './Mandelbrot';
import {createGuid, makeUniqueName, type CatalogRemoteState} from './catalogIdentity';
import type {TextureMappingConfig} from './TextureMapping';

const DB_NAME = 'mandelbrot-palettes';
const DB_VERSION = 2;
const STORE_NAME = 'palettes';



// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Full record stored in IndexedDB. */
export interface PaletteRecord {
  guid?: string;
  name: string;
  colorStops: ColorStop[];
  thumbnail?: string;
  date?: string;
  lastUpdated?: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
  textureName?: string;
  textureGuid?: string;
  skyboxName?: string;
  skyboxGuid?: string;
  interpolationMode?: InterpolationMode;
  palettePeriod?: number;
  paletteOffset?: number;
  heightPaletteShift?: number;
  paletteMirror?: boolean;
  activateAnimate?: boolean;
  animationSpeed?: number;
  tessellationLevel?: number;
  displacementAmount?: number;
  ambientOcclusionStrength?: number;
  microBumpStrength?: number;
  subsurfaceStrength?: number;
  reliefDepth?: number;
  localShadowStrength?: number;
  varnishStrength?: number;
  orbitTrapStrength?: number;
  phaseColoringStrength?: number;
  stripeFrequency?: number;
  textureMapping?: TextureMappingConfig;
  textureMappingMode?: number;
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
      const transaction = req.transaction;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        store.createIndex('guid', 'guid', {unique: true});
      } else if (transaction) {
        const store = transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('guid')) {
          store.createIndex('guid', 'guid', {unique: true});
        }
        store.openCursor().onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const record = cursor.value as Partial<PaletteRecord>;
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

function clonePaletteRecord(record: PaletteRecord): PaletteRecord {
  return JSON.parse(JSON.stringify(record)) as PaletteRecord;
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

async function uniquePaletteName(name: string, guid?: string): Promise<string> {
  const all = await getAllPaletteEntries();
  return makeUniqueName(name, all.filter(record => record.guid !== guid).map(record => record.name));
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

export async function getPaletteByGuid(guid: string): Promise<PaletteRecord | null> {
  const all = await getAllPaletteEntries();
  return all.find(record => record.guid === guid) ?? null;
}

export async function saveRemotePaletteEntry(record: PaletteRecord): Promise<void> {
  if (!record.guid) record.guid = createGuid();
  const existing = await getPaletteByGuid(record.guid);
  if (existing) {
    await savePaletteEntry({
      ...record,
      name: existing.name,
      date: existing.date ?? record.date,
      favorite: existing.favorite ?? false,
      remote: record.remote,
    });
    return;
  }
  await savePaletteEntry(record);
}

/**
 * Store (or overwrite) a palette entry.
 */
export async function savePaletteEntry(record: PaletteRecord): Promise<void> {
  const storable = clonePaletteRecord(record);
  if (!storable.name.trim()) throw new Error('Palette name is required.');
  storable.guid = storable.guid || createGuid();
  storable.name = await uniquePaletteName(storable.name.trim(), storable.guid);
  storable.date = storable.date ?? new Date().toISOString();
  storable.lastUpdated = storable.lastUpdated ?? storable.date;
  storable.favorite = storable.favorite ?? false;
  const { store, done } = await tx('readwrite');
  store.put(storable);
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

