export const PERSONAL_PRESET_LIMIT = 400;
export const PERSONAL_TEXTURE_LIMIT = 10;

export type PersonalPresetType =
  | 'completePreset'
  | 'palettePreset'
  | 'stopPreset'
  | 'textureMappingPreset'
  | 'animationPreset';

export type LibraryScope =
  | {kind: 'guest'}
  | {kind: 'user'; uid: string};

export type LibraryOrigin = 'guest' | 'personal' | 'public' | 'builtIn';
export type PersonalSyncState = 'local' | 'pending' | 'synced' | 'deleting' | 'error';

export interface PersonalRecordEnvelope<T = unknown> {
  guid: string;
  type: PersonalPresetType;
  payload: T;
  name: string;
  thumbnail?: string;
  favorite?: boolean;
  updatedAt: string;
  revision: number;
}

export interface PersonalTextureMetadata {
  guid: string;
  name: string;
  kind: 'texture' | 'skybox';
  contentType: 'image/webp';
  storagePath: string;
  width: number;
  height: number;
  byteSize: number;
  thumbnail: string;
  updatedAt: string;
  revision: number;
}

export interface PersonalUsage {
  presetCount: number;
  textureCount: number;
  revision: number;
}

export interface PendingPersonalOperation<T = unknown> {
  id: string;
  scopeKey: string;
  resource: 'preset' | 'texture';
  action: 'upsert' | 'delete';
  guid: string;
  localRevision: number;
  payload?: T;
  attempts: number;
  createdAt: string;
  lastError?: string;
}

export interface GuestImportBatch {
  id: string;
  uid: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  presetGuids: string[];
  textureGuids: string[];
  completedPresetGuids: string[];
  completedTextureGuids: string[];
  updatedAt: string;
  lastError?: string;
}

export const GUEST_SCOPE: LibraryScope = Object.freeze({kind: 'guest'});

export function userScope(uid: string): LibraryScope {
  const trimmed = uid.trim();
  if (!trimmed) throw new Error('A user library scope requires a UID.');
  return {kind: 'user', uid: trimmed};
}

export function scopeKey(scope: LibraryScope): string {
  return scope.kind === 'guest' ? 'guest' : `user:${scope.uid}`;
}

export function originForScope(scope: LibraryScope): LibraryOrigin {
  return scope.kind === 'guest' ? 'guest' : 'personal';
}

export function originConsumesPersonalQuota(origin: LibraryOrigin): boolean {
  return origin === 'personal';
}

export function isOwnerScope(scope: LibraryScope, uid: string): boolean {
  return scope.kind === 'user' && scope.uid === uid;
}
