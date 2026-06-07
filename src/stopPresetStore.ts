import type {ColorStop} from './ColorStop';
import {isStopTransferCurve} from './ColorStop';
import {createGuid, makeUniqueName, type CatalogRemoteState} from './catalogIdentity';
import type {EffectFieldName} from './effectFieldConfig';
import {EFFECT_FIELD_NAMES} from './effectFieldConfig';

const DB_NAME = 'mandelbrot-stop-presets';
const DB_VERSION = 1;
const STORE_NAME = 'stopPresets';
const LEGACY_STORAGE_KEY = 'mandelbrot_stop_presets';

export type StopPresetValues =
  Pick<ColorStop, 'color'>
  & Pick<Partial<ColorStop>, 'transferCurve' | 'iridescenceColor'>
  & Partial<Record<EffectFieldName, number>>;

export interface StopPresetRecord {
  guid?: string;
  name: string;
  values: StopPresetValues;
  date: string;
  lastUpdated?: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
}

const DEFAULT_STOP_PRESETS: StopPresetRecord[] = [
  { name: 'Steel', date: '2026-01-01T00:00:00.000Z', values: { color: '#aeb4bf', palette: 0.7, shading: 1, skybox: 0.45, smoothness: 1, shadingLevel: 1.35, specularPower: 30, metallic: 0.85, roughness: 0.2, anisotropy: 0.35 } },
  { name: 'Brushed Steel', date: '2026-01-01T00:00:01.000Z', values: { color: '#98a3b3', palette: 0.65, tessellation: 0.08, shading: 1, skybox: 0.35, smoothness: 1, shadingLevel: 1.3, specularPower: 24, metallic: 0.88, roughness: 0.3, anisotropy: 0.75 } },
  { name: 'Copper', date: '2026-01-01T00:00:02.000Z', values: { color: '#c7774e', palette: 0.7, shading: 1, skybox: 0.3, smoothness: 1, shadingLevel: 1.25, specularPower: 20, metallic: 0.9, roughness: 0.32, anisotropy: 0.25 } },
  { name: 'Brushed Copper', date: '2026-01-01T00:00:02.500Z', values: { color: '#b96b45', palette: 0.68, tessellation: 0.07, shading: 1, skybox: 0.3, smoothness: 1, shadingLevel: 1.2, specularPower: 18, metallic: 0.9, roughness: 0.36, anisotropy: 0.72 } },
  { name: 'Brass', date: '2026-01-01T00:00:03.000Z', values: { color: '#c9a44a', palette: 0.75, shading: 1, skybox: 0.3, smoothness: 1, shadingLevel: 1.35, specularPower: 22, metallic: 0.86, roughness: 0.28, anisotropy: 0.25 } },
  { name: 'Gold', date: '2026-01-01T00:00:04.000Z', values: { color: '#d5b24a', palette: 0.72, shading: 1, skybox: 0.35, smoothness: 1, shadingLevel: 1.3, specularPower: 20, metallic: 0.95, roughness: 0.22, anisotropy: 0.2 } },
  { name: 'Plastic Black', date: '2026-01-01T00:00:05.000Z', values: { color: '#1f2228', palette: 0.95, shading: 1, skybox: 0.08, smoothness: 1, shadingLevel: 1.05, specularPower: 12, metallic: 0.02, roughness: 0.55, anisotropy: 0.1 } },
  { name: 'Plastic White', date: '2026-01-01T00:00:06.000Z', values: { color: '#f0f1f2', palette: 0.95, shading: 1, skybox: 0.08, smoothness: 1, shadingLevel: 1.05, specularPower: 12, metallic: 0.02, roughness: 0.48, anisotropy: 0.1 } },
  { name: 'Black Pearl', date: '2026-01-01T00:00:07.000Z', values: { color: '#242436', palette: 0.78, shading: 1, skybox: 0.4, smoothness: 1, shadingLevel: 1.25, specularPower: 36, metallic: 0.15, roughness: 0.18, anisotropy: 0.55 } },
  { name: 'White Pearl', date: '2026-01-01T00:00:08.000Z', values: { color: '#f6f4ed', palette: 0.78, shading: 1, skybox: 0.45, smoothness: 1, shadingLevel: 1.3, specularPower: 34, metallic: 0.12, roughness: 0.2, anisotropy: 0.5 } },
  { name: 'Glossy Cyan', date: '2026-01-01T00:00:09.000Z', values: { color: '#2ad6d2', palette: 0.95, shading: 1, skybox: 0.2, smoothness: 1, shadingLevel: 1.15, specularPower: 40, metallic: 0.08, roughness: 0.1, anisotropy: 0.12 } },
  { name: 'Metal Magenta', date: '2026-01-01T00:00:10.000Z', values: { color: '#d33d9f', palette: 0.8, shading: 1, skybox: 0.28, smoothness: 1, shadingLevel: 1.25, specularPower: 26, metallic: 0.82, roughness: 0.26, anisotropy: 0.2 } },
  { name: 'Flat Color', date: '2026-01-01T00:00:11.000Z', values: { color: '#4e87ff', palette: 1, zebra: 0, tessellation: 0, shading: 0, skybox: 0, webcam: 0, smoothness: 1 } },
  { name: 'Texture Only', date: '2026-01-01T00:00:12.000Z', values: { color: '#808080', palette: 0, zebra: 0, tessellation: 1, shading: 0, skybox: 0, webcam: 0, smoothness: 1 } },
  { name: 'Webcam Only', date: '2026-01-01T00:00:13.000Z', values: { color: '#808080', palette: 0, zebra: 0, tessellation: 0, shading: 0, skybox: 0, webcam: 1, smoothness: 1 } },
];

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

function tx(mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
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

async function uniqueStopPresetName(name: string, guid?: string): Promise<string> {
  const all = await getAllStopPresetEntries();
  return makeUniqueName(name, all.filter(record => record.guid !== guid).map(record => record.name));
}

export async function getAllStopPresetEntries(): Promise<StopPresetRecord[]> {
  const {store, done} = await tx('readonly');
  const all: StopPresetRecord[] = await reqToPromise(store.getAll());
  await done;
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveStopPresetEntry(record: StopPresetRecord): Promise<void> {
  if (!record.name.trim()) throw new Error('Stop preset name is required.');
  const date = record.date || new Date().toISOString();
  const guid = record.guid || createGuid();
  const next: StopPresetRecord = {
    ...record,
    guid,
    name: await uniqueStopPresetName(record.name.trim(), guid),
    date,
    lastUpdated: record.lastUpdated || date,
    favorite: record.favorite ?? false,
  };
  const {store, done} = await tx('readwrite');
  store.put(next);
  await done;
}

export async function getStopPresetByName(name: string): Promise<StopPresetRecord | null> {
  const {store, done} = await tx('readonly');
  const record: StopPresetRecord | undefined = await reqToPromise(store.get(name));
  await done;
  return record ?? null;
}

export async function getStopPresetByGuid(guid: string): Promise<StopPresetRecord | null> {
  const all = await getAllStopPresetEntries();
  return all.find(record => record.guid === guid) ?? null;
}

export async function saveRemoteStopPresetEntry(record: StopPresetRecord): Promise<void> {
  if (!record.guid) record.guid = createGuid();
  const existing = await getStopPresetByGuid(record.guid);
  if (existing) {
    await saveStopPresetEntry({
      ...record,
      name: existing.name,
      date: existing.date || record.date,
      favorite: existing.favorite ?? false,
      remote: record.remote,
    });
    return;
  }
  await saveStopPresetEntry(record);
}

export async function deleteStopPresetEntry(name: string): Promise<void> {
  const {store, done} = await tx('readwrite');
  store.delete(name);
  await done;
}

export async function migrateStopPresetsFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as StopPresetRecord[];
    if (Array.isArray(parsed)) {
      for (const record of parsed) {
        if (!record?.name || !record.values?.color) continue;
        await saveStopPresetEntry(record);
      }
    }
  } catch {
    // Corrupted legacy data is discarded.
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function ensureDefaultStopPresetEntries(): Promise<void> {
  await migrateStopPresetsFromLocalStorage();
  const existing = await getAllStopPresetEntries();
  const byName = new Set(existing.map(preset => preset.name));
  for (const preset of DEFAULT_STOP_PRESETS) {
    if (!byName.has(preset.name)) {
      await saveStopPresetEntry({...preset, guid: createGuid(), lastUpdated: preset.date, favorite: false});
    }
  }
}

export function valuesFromStop(stop: ColorStop): StopPresetValues {
  const values: StopPresetValues = {color: stop.color};
  if (stop.iridescenceColor) {
    values.iridescenceColor = stop.iridescenceColor;
  }
  if (isStopTransferCurve(stop.transferCurve)) {
    values.transferCurve = stop.transferCurve;
  }
  for (const field of EFFECT_FIELD_NAMES) {
    const value = stop[field];
    if (value !== undefined) {
      values[field] = value;
    }
  }
  return values;
}

export function applyStopPresetValues(stop: ColorStop, values: StopPresetValues): ColorStop {
  const next: ColorStop = {...stop, color: values.color};
  if (values.iridescenceColor) {
    next.iridescenceColor = values.iridescenceColor;
  } else {
    delete next.iridescenceColor;
  }
  if (isStopTransferCurve(values.transferCurve)) {
    next.transferCurve = values.transferCurve;
  }
  for (const field of EFFECT_FIELD_NAMES) {
    const value = values[field];
    if (value !== undefined) {
      next[field] = value;
    }
  }
  return next;
}
