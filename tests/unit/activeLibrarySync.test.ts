import {describe, expect, it, vi} from 'vitest';
import {syncActiveLibrary, type ActiveLibrarySyncDependencies} from '../../src/activeLibrarySync';

function dependencies(events: string[]): ActiveLibrarySyncDependencies {
  return {
    syncCatalog: vi.fn(async () => {
      events.push('catalog');
    }),
    syncPersonalPresets: vi.fn(async uid => {
      events.push(`presets:${uid}`);
    }),
    syncPersonalTextures: vi.fn(async uid => {
      events.push(`textures:${uid}`);
    }),
  };
}

describe('active library synchronization', () => {
  it('hydrates the shared catalog for the guest profile', async () => {
    const events: string[] = [];
    const deps = dependencies(events);

    await syncActiveLibrary(null, {presetSync: true, textureSync: true}, deps);

    expect(events).toEqual(['catalog']);
    expect(deps.syncPersonalPresets).not.toHaveBeenCalled();
    expect(deps.syncPersonalTextures).not.toHaveBeenCalled();
  });

  it('hydrates the catalog before the authenticated personal cache', async () => {
    const events: string[] = [];
    const deps = dependencies(events);

    await syncActiveLibrary('alice', {presetSync: true, textureSync: true}, deps);

    expect(events[0]).toBe('catalog');
    expect(events.slice(1).sort()).toEqual(['presets:alice', 'textures:alice']);
  });

  it('honors disabled personal synchronization features', async () => {
    const events: string[] = [];
    const deps = dependencies(events);

    await syncActiveLibrary('alice', {presetSync: false, textureSync: false}, deps);

    expect(events).toEqual(['catalog']);
  });
});
