import {describe, expect, it} from 'vitest';
import {
  addPresetImportIdentity,
  buildPresetImportIdentitySet,
  hasPresetImportIdentity,
} from '../../src/presetImportIdentity';
import {personalPresetRemainingCapacity} from '../../src/personalQuotaGuard';

describe('preset JSON import identity', () => {
  it('does not collapse different preset values sharing the same name and date', () => {
    const identities = buildPresetImportIdentitySet([
      {name: 'Preset', date: '2026-07-25', value: {cx: '0'}},
    ]);
    expect(hasPresetImportIdentity(
      identities,
      {name: 'Preset', date: '2026-07-25', value: {cx: '1'}},
    )).toBe(false);
  });

  it('recognizes exact content and GUID retries', () => {
    const identities = buildPresetImportIdentitySet([
      {guid: 'preset-a', name: 'A', date: '2026-07-25', value: {cx: '0'}},
    ]);
    expect(hasPresetImportIdentity(
      identities,
      {name: 'A', date: '2026-07-25', value: {cx: '0'}},
    )).toBe(true);
    expect(hasPresetImportIdentity(
      identities,
      {guid: 'preset-a', name: 'Changed', date: 'later', value: {cx: '1'}},
    )).toBe(true);
  });

  it('tracks records added earlier in the same import batch', () => {
    const identities = new Set<string>();
    const record = {name: '', date: '', value: {scale: '1e-20'}};
    expect(hasPresetImportIdentity(identities, record)).toBe(false);
    addPresetImportIdentity(identities, record);
    expect(hasPresetImportIdentity(identities, record)).toBe(true);
  });
});

describe('personal preset import budget', () => {
  it('uses the greater trusted or cached count and never returns a negative budget', () => {
    expect(personalPresetRemainingCapacity(82, 100)).toBe(300);
    expect(personalPresetRemainingCapacity(400, 82)).toBe(0);
    expect(personalPresetRemainingCapacity(500, 82)).toBe(0);
  });
});
