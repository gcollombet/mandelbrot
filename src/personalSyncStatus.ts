export interface PersonalSyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  pending: number;
  lastError?: string;
  lastSyncedAt?: string;
}

type Channel = 'presets' | 'textures';
const states: Record<Channel, PersonalSyncStatus> = {
  presets: {state: 'idle', pending: 0}, textures: {state: 'idle', pending: 0},
};
const listeners = new Set<(status: PersonalSyncStatus) => void>();

export function combinePersonalSyncStatus(values: PersonalSyncStatus[]): PersonalSyncStatus {
  const active = values.filter(value => value.state !== 'idle');
  const errors = active.filter(value => value.state === 'error');
  const pending = active.reduce((sum, value) => sum + value.pending, 0);
  const state = errors.length ? 'error' : active.some(value => value.state === 'syncing' || value.pending > 0)
    ? 'syncing' : active.length ? 'synced' : 'idle';
  const dates = active.map(value => value.lastSyncedAt).filter((value): value is string => !!value).sort();
  return {state, pending, lastError: errors.map(value => value.lastError).filter(Boolean).join('; ') || undefined,
    lastSyncedAt: state === 'synced' ? dates[0] : undefined};
}

export function publishPersonalSyncStatus(channel: Channel, status: PersonalSyncStatus): void {
  states[channel] = status;
  const combined = combinePersonalSyncStatus(Object.values(states));
  for (const listener of listeners) listener({...combined});
}

export function observePersonalSyncStatus(listener: (status: PersonalSyncStatus) => void): () => void {
  listeners.add(listener);
  listener(combinePersonalSyncStatus(Object.values(states)));
  return () => { listeners.delete(listener); };
}
