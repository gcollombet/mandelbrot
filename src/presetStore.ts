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
import {
  deletedCacheFields,
  isVisibleCacheRecord,
  localCacheFields,
  openScopedDatabase,
  publicCacheFields,
  resolveLegacyCacheFields,
  shouldQueuePersonalDelete,
  syncedPersonalCacheFields,
  type ScopedCacheFields,
} from './scopedCache';
import {notifyPersonalCacheChanged} from './personalSyncTrigger';

const DB_NAME = 'mandelbrot-presets';
const DB_VERSION = 3;
const STORE_NAME = 'presets';



// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Lightweight entry returned for listings (no full params). */
export interface PresetMetadata extends ScopedCacheFields {
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

function openDB(): Promise<IDBDatabase> {
  return openScopedDatabase(DB_NAME, DB_VERSION, (_event, req) => {
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
  });
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
  return all.map(resolveLegacyCacheFields).filter(isVisibleCacheRecord);
}

export async function getAllPresetCacheRecords(): Promise<PresetRecord[]> {
  const {store, done} = await tx('readonly');
  const all: PresetRecord[] = await reqToPromise(store.getAll());
  await done;
  return all.map(resolveLegacyCacheFields);
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
    ...publicCacheFields(existing),
  };
}

export async function saveRemotePresetEntry(record: Omit<PresetRecord, 'id'> & { id?: number }): Promise<number> {
  const existing = await getPresetByGuid(record.guid);
  if (existing) {
    const next = buildRemotePresetMerge(existing, record);
    await updatePresetEntry(next);
    return next.id;
  }
  return savePresetEntry(record.value, record.thumbnail, record.name, record.date, record.favorite ?? false, record.guid, record.remote, publicCacheFields(record));
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
  cacheFields?: ScopedCacheFields,
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
    ...localCacheFields(cacheFields),
  };
  const { store, done } = await tx('readwrite');
  const id = await reqToPromise(store.add(record) as IDBRequest<number>);
  await done;
  notifyPersonalCacheChanged(record);
  return id;
}

/**
 * Overwrite an existing preset (e.g. to rename it).
 */
export async function updatePresetEntry(record: PresetRecord): Promise<void> {
  record.name = await uniquePresetName(record.name || defaultPresetName(record.date), record.guid);
  record.lastUpdated = record.lastUpdated || record.date || new Date().toISOString();
  const { store, done } = await tx('readwrite');
  store.put({...record, ...localCacheFields(record)});
  await done;
  notifyPersonalCacheChanged(record);
}

/**
 * Delete a preset by id.
 */
export async function deletePresetEntry(id: number): Promise<void> {
  const { store, done } = await tx('readwrite');
  const record: PresetRecord | undefined = await reqToPromise(store.get(id));
  if (record && shouldQueuePersonalDelete(record)) {
    store.put({...record, ...deletedCacheFields(record)});
  } else {
    store.delete(id);
  }
  await done;
  notifyPersonalCacheChanged(record);
}

export async function applyCloudPresetEntry(record: Omit<PresetRecord, 'id'> & {id?: number}, revision: number): Promise<void> {
  const existing = await getPresetByGuid(record.guid);
  const next = {
    ...record,
    id: existing?.id ?? record.id,
    ...syncedPersonalCacheFields(record, revision),
  };
  const {store, done} = await tx('readwrite');
  if (existing) store.put({...next, id: existing.id});
  else store.add(next);
  await done;
}

export async function acknowledgePresetEntry(guid: string, revision: number): Promise<void> {
  const {store, done} = await tx('readwrite');
  const record: PresetRecord | undefined = await reqToPromise(store.index('guid').get(guid));
  if (record) store.put({...record, ...syncedPersonalCacheFields(record, revision)});
  await done;
}

export async function purgePresetEntryByGuid(guid: string): Promise<void> {
  const {store, done} = await tx('readwrite');
  const record: PresetRecord | undefined = await reqToPromise(store.index('guid').get(guid));
  if (record) store.delete(record.id);
  await done;
}
