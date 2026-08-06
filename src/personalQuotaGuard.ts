import {getAllAnimationPresetCacheRecords} from './animationPresetStore';
import {getPersonalPresetManifest, getPersonalUsage} from './personalLibraryRemote';
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

export interface PersonalPresetImportBudget {
  existingGuids: Set<string>;
  remaining: number;
}

export function personalPresetRemainingCapacity(usageCount: number, existingCount: number): number {
  return Math.max(0, PERSONAL_PRESET_LIMIT - Math.max(usageCount, existingCount));
}

export async function createActivePresetImportBudget(): Promise<PersonalPresetImportBudget | null> {
  const scope = getActiveLibraryScope();
  if (scope.kind !== 'user') return null;
  const [usage, manifest, complete, palettes, stops, mappings, animations] = await Promise.all([
    getPersonalUsage(scope.uid),
    getPersonalPresetManifest(),
    getAllPresetCacheRecords(),
    getAllPaletteCacheRecords(),
    getAllStopPresetCacheRecords(),
    getAllTextureMappingPresetCacheRecords(),
    getAllAnimationPresetCacheRecords(),
  ]);
  const existing = new Set(manifest.entries.map(record => record.guid));
  for (const record of [complete, palettes, stops, mappings, animations].flat()) {
    if (record.origin === 'personal' && !record.tombstone && record.guid) existing.add(record.guid);
  }
  return {
    existingGuids: existing,
    remaining: personalPresetRemainingCapacity(usage.presetCount, existing.size),
  };
}

export async function assertActivePresetImportCapacity(candidateGuid?: string): Promise<void> {
  const budget = await createActivePresetImportBudget();
  if (!budget) return;
  const consumesNewSlot = !candidateGuid || !budget.existingGuids.has(candidateGuid);
  if (consumesNewSlot && budget.remaining < 1) {
    throw new PersonalPresetQuotaError();
  }
}
