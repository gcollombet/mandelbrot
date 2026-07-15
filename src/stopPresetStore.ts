import type {ColorStop} from './ColorStop';
import {isStopTransferCurve} from './ColorStop';
import {createGuid, makeUniqueName, type CatalogRemoteState} from './catalogIdentity';
import type {EffectFieldName} from './effectFieldConfig';
import {EFFECT_FIELD_NAMES} from './effectFieldConfig';
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

const DB_NAME = 'mandelbrot-stop-presets';
const DB_VERSION = 1;
const STORE_NAME = 'stopPresets';


export type StopPresetValues =
  Pick<ColorStop, 'color'>
  & Pick<Partial<ColorStop>, 'transferCurve' | 'iridescenceColor'>
  & Partial<Record<EffectFieldName, number>>;

export interface StopPresetRecord extends ScopedCacheFields {
  guid?: string;
  name: string;
  values: StopPresetValues;
  date: string;
  lastUpdated?: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
}

function openDB(): Promise<IDBDatabase> {
  return openScopedDatabase(DB_NAME, DB_VERSION, (_event, req) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {keyPath: 'name'});
        store.createIndex('guid', 'guid', {unique: true});
      }
  });
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
  return all.map(resolveLegacyCacheFields).filter(isVisibleCacheRecord).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAllStopPresetCacheRecords(): Promise<StopPresetRecord[]> {
  const {store, done} = await tx('readonly');
  const all: StopPresetRecord[] = await reqToPromise(store.getAll());
  await done;
  return all.map(resolveLegacyCacheFields);
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
    ...localCacheFields(record),
  };
  const {store, done} = await tx('readwrite');
  store.put(next);
  await done;
  notifyPersonalCacheChanged(next);
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
  Object.assign(record, publicCacheFields(record));
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
  const record: StopPresetRecord | undefined = await reqToPromise(store.get(name));
  if (record && shouldQueuePersonalDelete(resolveLegacyCacheFields(record))) {
    store.put({...record, ...deletedCacheFields(record)});
  } else {
    store.delete(name);
  }
  await done;
  notifyPersonalCacheChanged(record);
}

export async function ensureDefaultStopPresetEntries(): Promise<void> {
}

export async function applyCloudStopPresetEntry(record: StopPresetRecord, revision: number): Promise<void> {
  const existing = await getStopPresetByGuid(record.guid || '');
  const next = {...record, ...syncedPersonalCacheFields(record, revision)};
  const {store, done} = await tx('readwrite');
  if (existing && existing.name !== next.name) store.delete(existing.name);
  store.put(next);
  await done;
}

export async function acknowledgeStopPresetEntry(guid: string, revision: number): Promise<void> {
  const {store, done} = await tx('readwrite');
  const record: StopPresetRecord | undefined = await reqToPromise(store.index('guid').get(guid));
  if (record) store.put({...record, ...syncedPersonalCacheFields(record, revision)});
  await done;
}

export async function purgeStopPresetEntryByGuid(guid: string): Promise<void> {
  const {store, done} = await tx('readwrite');
  const record: StopPresetRecord | undefined = await reqToPromise(store.index('guid').get(guid));
  if (record) store.delete(record.name);
  await done;
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
