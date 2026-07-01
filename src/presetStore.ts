/**
 * IndexedDB-based storage for Mandelbrot presets.
 *
 * Presets are stored with an auto-incremented numeric `id` as the primary key
 * because the name is now optional (quick snapshots may have no name).
 *
 * Each record embeds a small PNG thumbnail (data-URL, ~15-30 KB) so the
 * dropdown list can be rendered cheaply without deserialising full params.
 *
 * The legacy `mandelbrot_presets` localStorage key is migrated automatically
 * on first access.
 */

import type { MandelbrotParams } from './Mandelbrot';
import {createGuid, defaultPresetName, makeUniqueName, type CatalogRemoteState} from './catalogIdentity';
import {log10FromDecimalString} from './floatexp';

const DB_NAME = 'mandelbrot-presets';
const DB_VERSION = 3;
const STORE_NAME = 'presets';



// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Lightweight entry returned for listings (no full params). */
export interface PresetMetadata {
  id: number;
  guid: string;
  name: string;
  thumbnail: string;     // data-URL PNG
  date: string;          // ISO 8601
  lastUpdated: string;   // ISO 8601 content freshness
  scaleExponent: number; // floor(log10(1/scale)) — zoom indicator
  favorite?: boolean;
  remote?: CatalogRemoteState;
}

/** Full record stored in IndexedDB. */
export interface PresetRecord extends PresetMetadata {
  value: MandelbrotParams;
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
      const transaction = req.transaction;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('guid', 'guid', {unique: true});
      } else if (transaction) {
        const store = transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('guid')) {
          store.createIndex('guid', 'guid', {unique: true});
        }
        store.openCursor().onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const record = cursor.value as Partial<PresetRecord>;
          const date = record.date ?? new Date().toISOString();
          cursor.update({
            ...record,
            guid: record.guid || createGuid(),
            name: record.name || defaultPresetName(date),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the zoom indicator: floor(log10(1 / scale)).
 *
 * For string input, reads the exponent straight off the decimal string via
 * `log10FromDecimalString` instead of `Number(scale)`: past ~1e-308, scale
 * underflows to exactly 0 in f64, which used to make this silently report 0
 * (no zoom) for any preset deeper than the f64 floor.
 */
export function computeScaleExponent(scale: string | number): number {
  if (typeof scale === 'string') {
    const log10Scale = log10FromDecimalString(scale);
    return Number.isFinite(log10Scale) ? Math.floor(-log10Scale) : 0;
  }
  if (!scale || scale <= 0 || !isFinite(scale)) return 0;
  return Math.floor(Math.log10(1 / scale));
}

export async function getAllPresetRecords(): Promise<PresetRecord[]> {
  const { store, done } = await tx('readonly');
  const all: PresetRecord[] = await reqToPromise(store.getAll());
  await done;
  return all;
}

async function uniquePresetName(name: string, guid?: string): Promise<string> {
  const all = await getAllPresetRecords();
  return makeUniqueName(name, all.filter(record => record.guid !== guid).map(record => record.name));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return metadata for every stored preset (cheap — no full params loaded).
 * Results are sorted newest-first by date.
 */
export async function getAllPresetEntries(): Promise<PresetMetadata[]> {
  const all = await getAllPresetRecords();
  return all
    .map(({ id, guid, name, thumbnail, date, lastUpdated, scaleExponent, favorite, remote }) => ({
      id,
      guid,
      name,
      thumbnail,
      date,
      lastUpdated,
      scaleExponent,
      favorite,
      remote,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Return the full record for a given preset, or `null` if not found.
 */
export async function getPresetById(id: number): Promise<PresetRecord | null> {
  const { store, done } = await tx('readonly');
  const record: PresetRecord | undefined = await reqToPromise(store.get(id));
  await done;
  return record ?? null;
}

export async function getPresetByGuid(guid: string): Promise<PresetRecord | null> {
  const all = await getAllPresetRecords();
  return all.find(record => record.guid === guid) ?? null;
}

export function buildRemotePresetMerge(existing: PresetRecord, record: Omit<PresetRecord, 'id'> & { id?: number }): PresetRecord {
  return {
    ...existing,
    value: record.value,
    thumbnail: record.thumbnail,
    date: existing.date || record.date,
    lastUpdated: record.lastUpdated,
    scaleExponent: computeScaleExponent(record.value.scale),
    favorite: existing.favorite ?? false,
    remote: record.remote,
  };
}

export async function saveRemotePresetEntry(record: Omit<PresetRecord, 'id'> & { id?: number }): Promise<number> {
  const existing = await getPresetByGuid(record.guid);
  if (existing) {
    const next = buildRemotePresetMerge(existing, record);
    await updatePresetEntry(next);
    return next.id;
  }
  return savePresetEntry(record.value, record.thumbnail, record.name, record.date, record.favorite ?? false, record.guid, record.remote);
}

/**
 * Store a new preset. Returns the auto-generated id.
 */
export async function savePresetEntry(
  value: MandelbrotParams,
  thumbnail: string,
  name?: string,
  date?: string,
  favorite = false,
  guid = createGuid(),
  remote?: CatalogRemoteState,
): Promise<number> {
  const now = date ?? new Date().toISOString();
  const resolvedName = await uniquePresetName((name || defaultPresetName(now)).trim(), guid);
  const record: Omit<PresetRecord, 'id'> & { id?: number } = {
    guid,
    name: resolvedName,
    value,
    thumbnail,
    date: now,
    lastUpdated: now,
    scaleExponent: computeScaleExponent(value.scale),
    favorite,
    remote,
  };
  const { store, done } = await tx('readwrite');
  const id = await reqToPromise(store.add(record) as IDBRequest<number>);
  await done;
  return id;
}

/**
 * Overwrite an existing preset (e.g. to rename it).
 */
export async function updatePresetEntry(record: PresetRecord): Promise<void> {
  record.name = await uniquePresetName(record.name || defaultPresetName(record.date), record.guid);
  record.lastUpdated = record.lastUpdated || record.date || new Date().toISOString();
  const { store, done } = await tx('readwrite');
  store.put(record);
  await done;
}

/**
 * Delete a preset by id.
 */
export async function deletePresetEntry(id: number): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.delete(id);
  await done;
}


