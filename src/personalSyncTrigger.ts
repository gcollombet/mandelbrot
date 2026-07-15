import type {ScopedCacheFields} from './scopedCache';

let requester: (() => void) | null = null;

export function setPersonalSyncRequester(next: (() => void) | null): void {
  requester = next;
}

export function notifyPersonalCacheChanged(record?: ScopedCacheFields): void {
  if (record?.origin === 'personal') requester?.();
}
