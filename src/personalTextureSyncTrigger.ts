import type {ScopedCacheFields} from './scopedCache';

let requester: (() => void) | null = null;

export function setPersonalTextureSyncRequester(next: (() => void) | null): void {
  requester = next;
}

export function notifyPersonalTextureChanged(record?: ScopedCacheFields): void {
  if (record?.origin === 'personal') requester?.();
}
