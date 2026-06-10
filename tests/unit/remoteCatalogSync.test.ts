import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../src/remoteCatalog', () => ({
  RemoteCatalogUnavailableError: class RemoteCatalogUnavailableError extends Error {},
  listAllRemoteCatalogMetadata: vi.fn(),
  getRemoteCatalogEntry: vi.fn(),
  getRemoteTextureBlob: vi.fn(),
}));

vi.mock('../../src/presetStore', () => ({
  getAllPresetRecords: vi.fn(),
  saveRemotePresetEntry: vi.fn(),
}));

vi.mock('../../src/paletteStore', () => ({
  getAllPaletteEntries: vi.fn(),
  saveRemotePaletteEntry: vi.fn(),
}));

vi.mock('../../src/stopPresetStore', () => ({
  getAllStopPresetEntries: vi.fn(),
  saveRemoteStopPresetEntry: vi.fn(),
}));

vi.mock('../../src/textureStore', () => ({
  getAllTextureEntries: vi.fn(),
  saveRemoteTextureEntry: vi.fn(),
}));

vi.mock('../../src/textureMappingPresetStore', () => ({
  getAllStoredTextureMappingPresetEntries: vi.fn(),
  saveRemoteTextureMappingPresetEntry: vi.fn(),
}));

vi.mock('../../src/animationPresetStore', () => ({
  getAllAnimationPresetEntries: vi.fn(),
  saveRemoteAnimationPresetEntry: vi.fn(),
}));

import {
  getRemoteCatalogEntry,
  getRemoteTextureBlob,
  listAllRemoteCatalogMetadata,
  RemoteCatalogUnavailableError,
} from '../../src/remoteCatalog';
import {getAllPresetRecords, saveRemotePresetEntry} from '../../src/presetStore';
import {getAllPaletteEntries, saveRemotePaletteEntry} from '../../src/paletteStore';
import {getAllStopPresetEntries, saveRemoteStopPresetEntry} from '../../src/stopPresetStore';
import {getAllTextureEntries, saveRemoteTextureEntry} from '../../src/textureStore';
import {getAllStoredTextureMappingPresetEntries, saveRemoteTextureMappingPresetEntry} from '../../src/textureMappingPresetStore';
import {getAllAnimationPresetEntries, saveRemoteAnimationPresetEntry} from '../../src/animationPresetStore';
import {shouldFetchRemoteEntry, syncRemoteCatalog} from '../../src/remoteCatalogSync';

const emptyMetadata = {
  completePreset: [],
  palettePreset: [],
  stopPreset: [],
  texture: [],
  textureMappingPreset: [],
  animationPreset: [],
};

describe('remoteCatalogSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllPresetRecords).mockResolvedValue([]);
    vi.mocked(getAllPaletteEntries).mockResolvedValue([]);
    vi.mocked(getAllStopPresetEntries).mockResolvedValue([]);
    vi.mocked(getAllTextureEntries).mockResolvedValue([]);
    vi.mocked(getAllStoredTextureMappingPresetEntries).mockResolvedValue([]);
    vi.mocked(getAllAnimationPresetEntries).mockResolvedValue([]);
    vi.mocked(listAllRemoteCatalogMetadata).mockResolvedValue(emptyMetadata);
  });

  it('decides freshness by per-entry lastUpdated', () => {
    expect(shouldFetchRemoteEntry('2026-06-07T10:00:00.000Z')).toBe(true);
    expect(shouldFetchRemoteEntry('2026-06-07T10:00:00.000Z', '2026-06-07T09:00:00.000Z')).toBe(true);
    expect(shouldFetchRemoteEntry('2026-06-07T10:00:00.000Z', '2026-06-07T10:00:00.000Z')).toBe(false);
    expect(shouldFetchRemoteEntry('2026-06-07T10:00:00.000Z', '2026-06-07T11:00:00.000Z')).toBe(false);
  });

  it('skips full payload fetches for current local entries', async () => {
    vi.mocked(listAllRemoteCatalogMetadata).mockResolvedValue({
      ...emptyMetadata,
      completePreset: [{guid: 'preset-1', name: 'Gold', lastUpdated: '2026-06-07T10:00:00.000Z'}],
    });
    vi.mocked(getAllPresetRecords).mockResolvedValue([{guid: 'preset-1', name: 'Local Gold', lastUpdated: '2026-06-07T10:00:00.000Z'} as any]);

    await syncRemoteCatalog();

    expect(getRemoteCatalogEntry).not.toHaveBeenCalled();
    expect(saveRemotePresetEntry).not.toHaveBeenCalled();
  });

  it('imports missing preset and preserves remote metadata for local merge helpers', async () => {
    vi.mocked(listAllRemoteCatalogMetadata).mockResolvedValue({
      ...emptyMetadata,
      completePreset: [{guid: 'preset-1', name: 'Gold', lastUpdated: '2026-06-07T10:00:00.000Z'}],
    });
    vi.mocked(getRemoteCatalogEntry).mockResolvedValue({
      guid: 'preset-1',
      name: 'Gold',
      lastUpdated: '2026-06-07T10:00:00.000Z',
      value: {scale: '1'} as any,
      thumbnail: 'thumb',
      scaleExponent: 0,
    });

    await syncRemoteCatalog();

    expect(saveRemotePresetEntry).toHaveBeenCalledWith(expect.objectContaining({
      guid: 'preset-1',
      name: 'Gold',
      favorite: false,
      remote: {publishedName: 'Gold', lastUpdated: '2026-06-07T10:00:00.000Z'},
    }));
  });

  it('imports changed palette, stop preset, and texture entries by GUID', async () => {
    vi.mocked(listAllRemoteCatalogMetadata).mockResolvedValue({
      completePreset: [],
      palettePreset: [{guid: 'palette-1', name: 'Palette', lastUpdated: '2026-06-07T10:00:00.000Z'}],
      stopPreset: [{guid: 'stop-1', name: 'Stop', lastUpdated: '2026-06-07T10:00:00.000Z'}],
      texture: [{guid: 'texture-1', name: 'Texture', lastUpdated: '2026-06-07T10:00:00.000Z'}],
      textureMappingPreset: [{guid: 'mapping-1', name: 'Mapping', lastUpdated: '2026-06-07T10:00:00.000Z'}],
      animationPreset: [{guid: 'animation-1', name: 'Animation', lastUpdated: '2026-06-07T10:00:00.000Z'}],
    });
    vi.mocked(getAllPaletteEntries).mockResolvedValue([{guid: 'palette-1', lastUpdated: '2026-06-07T09:00:00.000Z'} as any]);
    vi.mocked(getAllStopPresetEntries).mockResolvedValue([{guid: 'stop-1', lastUpdated: '2026-06-07T09:00:00.000Z'} as any]);
    vi.mocked(getAllTextureEntries).mockResolvedValue([{guid: 'texture-1', lastUpdated: '2026-06-07T09:00:00.000Z'} as any]);
    vi.mocked(getAllStoredTextureMappingPresetEntries).mockResolvedValue([{guid: 'mapping-1', lastUpdated: '2026-06-07T09:00:00.000Z'} as any]);
    vi.mocked(getAllAnimationPresetEntries).mockResolvedValue([{guid: 'animation-1', lastUpdated: '2026-06-07T09:00:00.000Z'} as any]);
    vi.mocked(getRemoteCatalogEntry).mockImplementation(async (type: string, guid: string) => {
      if (type === 'palettePreset') return {guid, name: 'Palette', lastUpdated: '2026-06-07T10:00:00.000Z', colorStops: []};
      if (type === 'stopPreset') return {guid, name: 'Stop', lastUpdated: '2026-06-07T10:00:00.000Z', values: {color: '#fff'}};
      if (type === 'textureMappingPreset') return {guid, name: 'Mapping', lastUpdated: '2026-06-07T10:00:00.000Z', mapping: {}};
      if (type === 'animationPreset') return {guid, name: 'Animation', lastUpdated: '2026-06-07T10:00:00.000Z', animation: {globalSpeed: 1, tracks: {}}};
      return {guid, name: 'Texture', lastUpdated: '2026-06-07T10:00:00.000Z', thumbnail: 'thumb', blobPath: 'catalog/texture/texture-1'};
    });
    const blob = new Blob(['x'], {type: 'image/webp'});
    vi.mocked(getRemoteTextureBlob).mockResolvedValue(blob);

    await syncRemoteCatalog();

    expect(saveRemotePaletteEntry).toHaveBeenCalledWith(expect.objectContaining({guid: 'palette-1', remote: expect.any(Object)}));
    expect(saveRemoteStopPresetEntry).toHaveBeenCalledWith(expect.objectContaining({guid: 'stop-1', remote: expect.any(Object)}));
    expect(saveRemoteTextureMappingPresetEntry).toHaveBeenCalledWith(expect.objectContaining({guid: 'mapping-1', remote: expect.any(Object)}));
    expect(saveRemoteAnimationPresetEntry).toHaveBeenCalledWith(expect.objectContaining({guid: 'animation-1', remote: expect.any(Object)}));
    expect(saveRemoteTextureEntry).toHaveBeenCalledWith(expect.objectContaining({guid: 'texture-1', remote: expect.any(Object)}), blob);
  });

  it('keeps startup non-blocking when Firebase is not configured', async () => {
    vi.mocked(listAllRemoteCatalogMetadata).mockRejectedValue(new RemoteCatalogUnavailableError());

    await expect(syncRemoteCatalog()).resolves.toBeUndefined();
  });

  it('keeps startup non-blocking when remote metadata fetch fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(listAllRemoteCatalogMetadata).mockRejectedValue(new Error('network'));

    await expect(syncRemoteCatalog()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
