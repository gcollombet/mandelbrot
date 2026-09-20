import 'fake-indexeddb/auto';
import {describe, expect, it} from 'vitest';
import type {MandelbrotParams} from '../../src/Mandelbrot';
import {setActiveLibraryScope} from '../../src/scopedCache';
import {getAllTextureEntries, getTextureBlobByGuid} from '../../src/textureStore';
import {getPresetById, savePresetEntry} from '../../src/presetStore';
import {materializeSharedTextures, registerSharedTexture, sharedTextureBlob} from '../../src/sharedSceneTextures';

const sourceGuid = 'shared:alice:gold';
const sourceName = 'Gold · partagé alice:gold';
const value = {cx: '0', cy: '0', scale: '1e-100', colorStops: [], textureGuid: sourceGuid, textureName: sourceName,
  skyboxGuid: sourceGuid, skyboxName: sourceName} as MandelbrotParams;

describe('shared scene texture lifetime', () => {
  it('keeps viewing ephemeral and saves durable independent copies on demand', async () => {
    setActiveLibraryScope({kind: 'user', uid: 'scene-copy-test'});
    const blob = new Blob(['gold'], {type: 'image/webp'});
    registerSharedTexture({guid: sourceGuid, name: sourceName, thumbnail: '', date: 'today', width: 2, height: 2}, blob);
    expect(await getAllTextureEntries()).toEqual([]);
    expect(sharedTextureBlob(sourceName)).toBe(blob);
    const id = await savePresetEntry(value, '', 'Copied scene');
    const saved = (await getPresetById(id))!;
    expect(saved.origin).toBe('personal');
    expect(saved.value.textureGuid).not.toBe(sourceGuid);
    expect(saved.value.textureGuid).toBe(saved.value.skyboxGuid);
    expect(saved.value.textureName).toBe('Gold');
    expect(await getTextureBlobByGuid(saved.value.textureGuid!)).toEqual(blob);
    expect(await getAllTextureEntries()).toHaveLength(1);
    const second = await materializeSharedTextures(value);
    expect(second.textureGuid).toBe(saved.value.textureGuid);
    expect(value.textureGuid).toBe(sourceGuid);
  });
  it('creates a different owned texture when changing accounts', async () => {
    setActiveLibraryScope({kind: 'user', uid: 'scene-copy-other'});
    const copied = await materializeSharedTextures(value);
    expect(copied.textureGuid).not.toBe(sourceGuid);
    const entries = await getAllTextureEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].ownerScopeKey).toBe('user:scene-copy-other');
  });
});
