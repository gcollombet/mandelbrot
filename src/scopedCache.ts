import {
  GUEST_SCOPE,
  originForScope,
  scopeKey,
  type LibraryOrigin,
  type LibraryScope,
  type PersonalSyncState,
} from './personalLibraryTypes';

export interface ScopedCacheFields {
  ownerScopeKey?: string;
  origin?: LibraryOrigin;
  syncState?: PersonalSyncState;
  revision?: number;
  tombstone?: boolean;
  lastSyncError?: string;
}

let activeScope: LibraryScope = GUEST_SCOPE;

export function getActiveLibraryScope(): LibraryScope {
  return activeScope;
}

export function setActiveLibraryScope(scope: LibraryScope): void {
  activeScope = scope;
}

export function scopedDatabaseName(baseName: string, scope = activeScope): string {
  if (scope.kind === 'guest') return baseName;
  return `${baseName}--${encodeURIComponent(scopeKey(scope))}`;
}

const databasePromises = new Map<string, Promise<IDBDatabase>>();

function cacheFieldSnapshot(existing: ScopedCacheFields): ScopedCacheFields {
  return {
    ownerScopeKey: existing.ownerScopeKey,
    origin: existing.origin,
    syncState: existing.syncState,
    revision: existing.revision,
    tombstone: existing.tombstone,
    lastSyncError: existing.lastSyncError,
  };
}

export function openScopedDatabase(
  baseName: string,
  version: number,
  upgrade: (event: IDBVersionChangeEvent, request: IDBOpenDBRequest) => void,
): Promise<IDBDatabase> {
  const name = scopedDatabaseName(baseName);
  const cached = databasePromises.get(name);
  if (cached) return cached;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = event => upgrade(event, request);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databasePromises.delete(name);
      };
      resolve(db);
    };
    request.onerror = () => {
      databasePromises.delete(name);
      reject(request.error);
    };
  });
  databasePromises.set(name, promise);
  return promise;
}

export function localCacheFields(existing: ScopedCacheFields = {}): ScopedCacheFields {
  const origin = existing.origin ?? originForScope(activeScope);
  const syncState: PersonalSyncState = origin === 'personal'
    ? 'pending'
    : origin === 'guest'
      ? 'local'
      : 'synced';
  return {
    ...cacheFieldSnapshot(existing),
    ownerScopeKey: scopeKey(activeScope),
    origin,
    syncState,
    revision: existing.revision ?? 0,
    tombstone: false,
    lastSyncError: undefined,
  };
}

export function publicCacheFields(existing: ScopedCacheFields = {}): ScopedCacheFields {
  return {
    ...cacheFieldSnapshot(existing),
    ownerScopeKey: scopeKey(activeScope),
    origin: 'public',
    syncState: 'synced',
    revision: existing.revision ?? 0,
    tombstone: false,
    lastSyncError: undefined,
  };
}

export function builtInCacheFields(existing: ScopedCacheFields = {}): ScopedCacheFields {
  return {...publicCacheFields(existing), origin: 'builtIn'};
}

export function deletedCacheFields(existing: ScopedCacheFields): ScopedCacheFields {
  return {
    ...cacheFieldSnapshot(existing),
    ownerScopeKey: scopeKey(activeScope),
    syncState: 'deleting',
    tombstone: true,
    lastSyncError: undefined,
  };
}

export function syncedPersonalCacheFields(existing: ScopedCacheFields = {}, revision = existing.revision ?? 0): ScopedCacheFields {
  return {
    ...cacheFieldSnapshot(existing),
    ownerScopeKey: scopeKey(activeScope),
    origin: 'personal',
    syncState: 'synced',
    revision,
    tombstone: false,
    lastSyncError: undefined,
  };
}

export function failedCacheFields(existing: ScopedCacheFields, error: unknown): ScopedCacheFields {
  return {
    ...cacheFieldSnapshot(existing),
    syncState: 'error',
    lastSyncError: error instanceof Error ? error.message : String(error),
  };
}

export function isVisibleCacheRecord(record: ScopedCacheFields): boolean {
  return record.tombstone !== true;
}

export function consumesActivePersonalQuota(record: ScopedCacheFields): boolean {
  return record.origin === 'personal' && record.tombstone !== true;
}

export function shouldQueuePersonalDelete(record: ScopedCacheFields): boolean {
  return activeScope.kind === 'user' && record.origin === 'personal';
}

export function resolveLegacyCacheFields<T extends ScopedCacheFields & {remote?: unknown; builtIn?: boolean}>(record: T): T {
  if (record.origin) return record;
  const fields = record.builtIn
    ? builtInCacheFields(record)
    : record.remote
      ? publicCacheFields(record)
      : localCacheFields(record);
  return {...record, ...fields};
}
