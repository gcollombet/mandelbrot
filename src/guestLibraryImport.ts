import {getAllAnimationPresetCacheRecords, saveAnimationPresetEntry, type AnimationPresetRecord} from './animationPresetStore';
import {createGuid} from './catalogIdentity';
import {getPersonalUsage, listPersonalPresetRecords, listPersonalTextureMetadata, savePersonalImportBatch} from './personalLibraryRemote';
import {PERSONAL_PRESET_LIMIT, PERSONAL_TEXTURE_LIMIT, type GuestImportBatch, type PersonalPresetType} from './personalLibraryTypes';
import {getAllPaletteCacheRecords, savePaletteEntry, type PaletteRecord} from './paletteStore';
import {getAllPresetCacheRecords, savePresetEntry, type PresetRecord} from './presetStore';
import {getActiveLibraryScope, setActiveLibraryScope, type ScopedCacheFields} from './scopedCache';
import {getAllStopPresetCacheRecords, saveStopPresetEntry, type StopPresetRecord} from './stopPresetStore';
import {getAllTextureCacheRecords, getTextureBlob, saveTextureEntry, type TextureMetadata} from './textureStore';
import {normalizeTextureBlob} from './textureNormalization';
import {getAllTextureMappingPresetCacheRecords, saveTextureMappingPresetEntry, type TextureMappingPresetRecord} from './textureMappingPresetStore';

type GuestPresetRecord =
  | {type: 'completePreset'; record: PresetRecord}
  | {type: 'palettePreset'; record: PaletteRecord}
  | {type: 'stopPreset'; record: StopPresetRecord}
  | {type: 'textureMappingPreset'; record: TextureMappingPresetRecord}
  | {type: 'animationPreset'; record: AnimationPresetRecord};

export interface GuestTextureSnapshot {
  record: TextureMetadata;
  blob: Blob;
}

export interface GuestLibrarySnapshot {
  presets: GuestPresetRecord[];
  textures: GuestTextureSnapshot[];
}

export interface GuestImportPlan {
  uid: string;
  snapshot: GuestLibrarySnapshot;
  missingPresets: GuestPresetRecord[];
  missingTextures: GuestTextureSnapshot[];
  presetCount: number;
  textureCount: number;
  canImport: boolean;
  blockingReason?: string;
}

function isGuestRecord(record: ScopedCacheFields): boolean {
  return record.origin === 'guest' && record.tombstone !== true;
}

function guidOf(record: {guid?: string}): string | null {
  return typeof record.guid === 'string' && record.guid ? record.guid : null;
}

export async function snapshotGuestLibrary(): Promise<GuestLibrarySnapshot> {
  const previousScope = getActiveLibraryScope();
  setActiveLibraryScope({kind: 'guest'});
  try {
    const [complete, palettes, stops, mappings, animations, textureRecords] = await Promise.all([
      getAllPresetCacheRecords(),
      getAllPaletteCacheRecords(),
      getAllStopPresetCacheRecords(),
      getAllTextureMappingPresetCacheRecords(),
      getAllAnimationPresetCacheRecords(),
      getAllTextureCacheRecords(),
    ]);
    const presets: GuestPresetRecord[] = [
      ...complete.filter(isGuestRecord).map(record => ({type: 'completePreset' as const, record})),
      ...palettes.filter(isGuestRecord).map(record => ({type: 'palettePreset' as const, record})),
      ...stops.filter(isGuestRecord).map(record => ({type: 'stopPreset' as const, record})),
      ...mappings.filter(record => !record.builtIn && isGuestRecord(record)).map(record => ({type: 'textureMappingPreset' as const, record})),
      ...animations.filter(isGuestRecord).map(record => ({type: 'animationPreset' as const, record})),
    ].filter(entry => guidOf(entry.record) !== null);
    const textures: GuestTextureSnapshot[] = [];
    for (const record of textureRecords.filter(isGuestRecord)) {
      if (!guidOf(record)) continue;
      const blob = await getTextureBlob(record.name);
      if (blob) textures.push({record, blob});
    }
    return {presets, textures};
  } finally {
    setActiveLibraryScope(previousScope);
  }
}

export function buildGuestImportPlan(
  uid: string,
  snapshot: GuestLibrarySnapshot,
  existingPresetGuids: ReadonlySet<string>,
  existingTextureGuids: ReadonlySet<string>,
  usage: {presetCount: number; textureCount: number},
): GuestImportPlan {
  const missingPresets = snapshot.presets.filter(entry => !existingPresetGuids.has(entry.record.guid));
  const missingTextures = snapshot.textures.filter(entry => !existingTextureGuids.has(entry.record.guid!));
  const presetCount = usage.presetCount + missingPresets.length;
  const textureCount = usage.textureCount + missingTextures.length;
  const reasons: string[] = [];
  if (presetCount > PERSONAL_PRESET_LIMIT) reasons.push(`${missingPresets.length} presets would exceed the ${PERSONAL_PRESET_LIMIT}-preset limit`);
  if (textureCount > PERSONAL_TEXTURE_LIMIT) reasons.push(`${missingTextures.length} textures would exceed the ${PERSONAL_TEXTURE_LIMIT}-texture limit`);
  return {
    uid,
    snapshot,
    missingPresets,
    missingTextures,
    presetCount,
    textureCount,
    canImport: reasons.length === 0,
    blockingReason: reasons.length ? reasons.join(' and ') : undefined,
  };
}

export async function prepareGuestImport(uid: string, snapshot: GuestLibrarySnapshot): Promise<GuestImportPlan> {
  const [remotePresets, remoteTextures, usage, localComplete, localPalettes, localStops, localMappings, localAnimations, localTextures] = await Promise.all([
    listPersonalPresetRecords(uid),
    listPersonalTextureMetadata(uid),
    getPersonalUsage(uid),
    getAllPresetCacheRecords(),
    getAllPaletteCacheRecords(),
    getAllStopPresetCacheRecords(),
    getAllTextureMappingPresetCacheRecords(),
    getAllAnimationPresetCacheRecords(),
    getAllTextureCacheRecords(),
  ]);
  const localPresetGuids = [localComplete, localPalettes, localStops, localMappings, localAnimations]
    .flat()
    .filter(record => record.origin === 'personal' && !record.tombstone)
    .map(record => record.guid)
    .filter((guid): guid is string => typeof guid === 'string' && guid.length > 0);
  const localTextureGuids = localTextures
    .filter(record => record.origin === 'personal' && !record.tombstone && !!record.guid)
    .map(record => record.guid!);
  const existingPresetGuids = new Set([...remotePresets.map(record => record.guid), ...localPresetGuids]);
  const existingTextureGuids = new Set([...remoteTextures.map(record => record.guid), ...localTextureGuids]);
  return buildGuestImportPlan(
    uid,
    snapshot,
    existingPresetGuids,
    existingTextureGuids,
    {
      presetCount: Math.max(usage.presetCount, existingPresetGuids.size),
      textureCount: Math.max(usage.textureCount, existingTextureGuids.size),
    },
  );
}

function personalCopy<T extends Record<string, unknown>>(record: T): T {
  const copy = {...record};
  for (const key of ['id', 'ownerScopeKey', 'origin', 'syncState', 'revision', 'tombstone', 'lastSyncError', 'remote']) delete copy[key];
  return copy;
}

async function copyPreset(entry: GuestPresetRecord): Promise<void> {
  const record = personalCopy(entry.record as unknown as Record<string, unknown>) as any;
  switch (entry.type) {
    case 'completePreset':
      await savePresetEntry(record.value, record.thumbnail, record.name, record.date, record.favorite, record.guid);
      break;
    case 'palettePreset':
      await savePaletteEntry(record);
      break;
    case 'stopPreset':
      await saveStopPresetEntry(record);
      break;
    case 'textureMappingPreset':
      await saveTextureMappingPresetEntry({...record, builtIn: false});
      break;
    case 'animationPreset':
      await saveAnimationPresetEntry(record);
      break;
  }
}

function batchFor(plan: GuestImportPlan): GuestImportBatch {
  return {
    id: createGuid(),
    uid: plan.uid,
    status: 'pending',
    presetGuids: plan.missingPresets.map(entry => entry.record.guid),
    textureGuids: plan.missingTextures.map(entry => entry.record.guid!),
    completedPresetGuids: [],
    completedTextureGuids: [],
    updatedAt: new Date().toISOString(),
  };
}

async function persistBatch(batch: GuestImportBatch): Promise<void> {
  batch.updatedAt = new Date().toISOString();
  await savePersonalImportBatch(batch);
}

export async function importGuestLibrary(plan: GuestImportPlan): Promise<void> {
  if (!plan.canImport) throw new Error(plan.blockingReason || 'The guest library does not fit in the account quota.');
  const batch = batchFor(plan);
  setActiveLibraryScope({kind: 'user', uid: plan.uid});
  await persistBatch(batch);
  batch.status = 'running';
  try {
    for (const entry of plan.missingPresets) {
      if (batch.completedPresetGuids.includes(entry.record.guid)) continue;
      await copyPreset(entry);
      batch.completedPresetGuids.push(entry.record.guid);
      await persistBatch(batch);
    }
    for (const entry of plan.missingTextures) {
      const guid = entry.record.guid!;
      if (batch.completedTextureGuids.includes(guid)) continue;
      const normalized = await normalizeTextureBlob(entry.blob);
      await saveTextureEntry(
        entry.record.name,
        normalized.blob,
        entry.record.thumbnail,
        entry.record.date,
        guid,
        entry.record.favorite ?? false,
        undefined,
        {
          kind: entry.record.kind,
          contentType: 'image/webp',
          width: normalized.width,
          height: normalized.height,
          byteSize: normalized.blob.size,
        },
      );
      batch.completedTextureGuids.push(guid);
      await persistBatch(batch);
    }
    batch.status = 'complete';
    await persistBatch(batch);
  } catch (error) {
    batch.status = 'error';
    batch.lastError = error instanceof Error ? error.message : String(error);
    await persistBatch(batch).catch(() => undefined);
    throw error;
  }
}

export function guestPresetCounts(snapshot: GuestLibrarySnapshot): Record<PersonalPresetType, number> {
  return snapshot.presets.reduce((counts, entry) => {
    counts[entry.type] += 1;
    return counts;
  }, {completePreset: 0, palettePreset: 0, stopPreset: 0, textureMappingPreset: 0, animationPreset: 0});
}
