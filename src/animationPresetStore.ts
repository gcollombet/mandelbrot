import {
  cloneAnimationConfig,
  normalizeAnimationConfig,
  type AnimationConfig,
} from './AnimationConfig';
import {createGuid, makeUniqueName, type CatalogRemoteState} from './catalogIdentity';

const DB_NAME = 'mandelbrot-animation-presets';
const DB_VERSION = 1;
const STORE_NAME = 'animationPresets';

export interface AnimationPresetRecord {
  guid: string;
  name: string;
  animation: AnimationConfig;
  date: string;
  lastUpdated: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
}

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {keyPath: 'name'});
        store.createIndex('guid', 'guid', {unique: true});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<{store: IDBObjectStore; done: Promise<void>}> {
  return openDB().then((db) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return {store, done};
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cloneRecord(record: AnimationPresetRecord): AnimationPresetRecord {
  return {
    ...record,
    animation: cloneAnimationConfig(record.animation),
  };
}

async function uniqueAnimationPresetName(name: string, guid?: string): Promise<string> {
  const all = await getAllAnimationPresetEntries();
  return makeUniqueName(name, all.filter(record => record.guid !== guid).map(record => record.name));
}

export async function getAllAnimationPresetEntries(): Promise<AnimationPresetRecord[]> {
  const {store, done} = await tx('readonly');
  const all: AnimationPresetRecord[] = await reqToPromise(store.getAll());
  await done;
  return all.map(cloneRecord).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAnimationPresetByName(name: string): Promise<AnimationPresetRecord | null> {
  const {store, done} = await tx('readonly');
  const record: AnimationPresetRecord | undefined = await reqToPromise(store.get(name));
  await done;
  return record ? cloneRecord(record) : null;
}

export async function getAnimationPresetByGuid(guid: string): Promise<AnimationPresetRecord | null> {
  const all = await getAllAnimationPresetEntries();
  return all.find(record => record.guid === guid) ?? null;
}

export async function saveAnimationPresetEntry(record: AnimationPresetRecord): Promise<void> {
  if (!record.name.trim()) throw new Error('Animation preset name is required.');
  const date = record.date || new Date().toISOString();
  const guid = record.guid || createGuid();
  const next: AnimationPresetRecord = {
    ...record,
    guid,
    name: await uniqueAnimationPresetName(record.name.trim(), guid),
    animation: normalizeAnimationConfig(record.animation),
    date,
    lastUpdated: record.lastUpdated || date,
    favorite: record.favorite ?? false,
  };
  const {store, done} = await tx('readwrite');
  store.put(next);
  await done;
}

export async function saveRemoteAnimationPresetEntry(record: AnimationPresetRecord): Promise<void> {
  const existing = await getAnimationPresetByGuid(record.guid);
  await saveAnimationPresetEntry({
    ...record,
    name: existing?.name ?? record.name,
    date: existing?.date ?? record.date,
    favorite: existing?.favorite ?? false,
    remote: record.remote,
  });
}

export async function deleteAnimationPresetEntry(name: string): Promise<void> {
  const {store, done} = await tx('readwrite');
  store.delete(name);
  await done;
}
