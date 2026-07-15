import {getAllAnimationPresetCacheRecords} from './animationPresetStore';
import {getPersonalUsage, listPersonalPresetRecords} from './personalLibraryRemote';
import {PERSONAL_PRESET_LIMIT} from './personalLibraryTypes';
import {getAllPaletteCacheRecords} from './paletteStore';
import {getAllPresetCacheRecords} from './presetStore';
import {getActiveLibraryScope} from './scopedCache';
import {getAllStopPresetCacheRecords} from './stopPresetStore';
import {getAllTextureMappingPresetCacheRecords} from './textureMappingPresetStore';

export class PersonalPresetQuotaError extends Error {
  constructor() {
    super(`This account has reached its ${PERSONAL_PRESET_LIMIT}-preset limit.`);
    this.name = 'PersonalPresetQuotaError';
  }
}

export async function assertActivePresetImportCapacity(candidateGuid?: string): Promise<void> {
  const scope = getActiveLibraryScope();
  if (scope.kind !== 'user') return;
  const [usage, remote, complete, palettes, stops, mappings, animations] = await Promise.all([
    getPersonalUsage(scope.uid),
    listPersonalPresetRecords(scope.uid),
    getAllPresetCacheRecords(),
    getAllPaletteCacheRecords(),
    getAllStopPresetCacheRecords(),
    getAllTextureMappingPresetCacheRecords(),
    getAllAnimationPresetCacheRecords(),
  ]);
  const existing = new Set(remote.map(record => record.guid));
  for (const record of [complete, palettes, stops, mappings, animations].flat()) {
    if (record.origin === 'personal' && !record.tombstone && record.guid) existing.add(record.guid);
  }
  const consumesNewSlot = !candidateGuid || !existing.has(candidateGuid);
  if (Math.max(usage.presetCount, existing.size) + Number(consumesNewSlot) > PERSONAL_PRESET_LIMIT) {
    throw new PersonalPresetQuotaError();
  }
}
