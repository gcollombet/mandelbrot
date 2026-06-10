import {createGuid, makeUniqueName, type CatalogRemoteState} from './catalogIdentity';
import {
  BUILT_IN_TEXTURE_MAPPINGS,
  cloneTextureMapping,
  normalizeTextureMappingConfig,
  type TextureMappingConfig,
} from './TextureMapping';

const DB_NAME = 'mandelbrot-texture-mapping-presets';
const DB_VERSION = 1;
const STORE_NAME = 'textureMappingPresets';

export interface TextureMappingPresetRecord {
  guid: string;
  name: string;
  mapping: TextureMappingConfig;
  date: string;
  lastUpdated: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
  builtIn?: boolean;
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

function cloneRecord(record: TextureMappingPresetRecord): TextureMappingPresetRecord {
  return {
    ...record,
    mapping: cloneTextureMapping(normalizeTextureMappingConfig(record.mapping)),
  };
}

function builtInRecords(): TextureMappingPresetRecord[] {
  const now = '1970-01-01T00:00:00.000Z';
  return BUILT_IN_TEXTURE_MAPPINGS.map(entry => ({
    guid: entry.guid,
    name: entry.name,
    mapping: cloneTextureMapping(entry.mapping),
    date: now,
    lastUpdated: now,
    favorite: false,
    builtIn: true,
  }));
}

export async function getAllStoredTextureMappingPresetEntries(): Promise<TextureMappingPresetRecord[]> {
  const {store, done} = await tx('readonly');
  const all: TextureMappingPresetRecord[] = await reqToPromise(store.getAll());
  await done;
  return all.map(cloneRecord).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAllTextureMappingPresetEntries(): Promise<TextureMappingPresetRecord[]> {
  const stored = await getAllStoredTextureMappingPresetEntries();
  const storedGuids = new Set(stored.map(record => record.guid));
  const builtIns = builtInRecords().filter(record => !storedGuids.has(record.guid));
  return [...builtIns, ...stored];
}

async function uniqueTextureMappingPresetName(name: string, guid?: string): Promise<string> {
  const all = await getAllTextureMappingPresetEntries();
  return makeUniqueName(name, all.filter(record => record.guid !== guid).map(record => record.name));
}

export async function getTextureMappingPresetByName(name: string): Promise<TextureMappingPresetRecord | null> {
  const builtIn = builtInRecords().find(record => record.name === name);
  if (builtIn) return builtIn;
  const {store, done} = await tx('readonly');
  const record: TextureMappingPresetRecord | undefined = await reqToPromise(store.get(name));
  await done;
  return record ? cloneRecord(record) : null;
}

export async function getTextureMappingPresetByGuid(guid: string): Promise<TextureMappingPresetRecord | null> {
  const builtIn = builtInRecords().find(record => record.guid === guid);
  if (builtIn) return builtIn;
  const stored = await getAllStoredTextureMappingPresetEntries();
  return stored.find(record => record.guid === guid) ?? null;
}

export async function saveTextureMappingPresetEntry(record: TextureMappingPresetRecord): Promise<void> {
  if (!record.name.trim()) throw new Error('Texture mapping preset name is required.');
  if (record.builtIn) throw new Error('Built-in texture mapping presets cannot be overwritten.');
  const date = record.date || new Date().toISOString();
  const guid = record.guid || createGuid();
  const next: TextureMappingPresetRecord = {
    ...record,
    guid,
    name: await uniqueTextureMappingPresetName(record.name.trim(), guid),
    mapping: normalizeTextureMappingConfig(record.mapping),
    date,
    lastUpdated: record.lastUpdated || date,
    favorite: record.favorite ?? false,
    builtIn: false,
  };
  const {store, done} = await tx('readwrite');
  store.put(next);
  await done;
}

export async function saveRemoteTextureMappingPresetEntry(record: TextureMappingPresetRecord): Promise<void> {
  const existing = await getTextureMappingPresetByGuid(record.guid);
  if (existing && !existing.builtIn) {
    await saveTextureMappingPresetEntry({
      ...record,
      name: existing.name,
      date: existing.date || record.date,
      favorite: existing.favorite ?? false,
      remote: record.remote,
      builtIn: false,
    });
    return;
  }
  await saveTextureMappingPresetEntry({
    ...record,
    favorite: false,
    builtIn: false,
  });
}

export async function deleteTextureMappingPresetEntry(name: string): Promise<void> {
  const record = await getTextureMappingPresetByName(name);
  if (record?.builtIn) throw new Error('Built-in texture mapping presets cannot be deleted.');
  const {store, done} = await tx('readwrite');
  store.delete(name);
  await done;
}
