export interface PresetImportIdentityRecord {
  guid?: string;
  name?: string;
  date?: string;
  value: unknown;
}

function valueIdentity(value: unknown): string {
  return JSON.stringify(value);
}

export function presetImportIdentityKeys(record: PresetImportIdentityRecord): string[] {
  const name = record.name ?? '';
  const date = record.date ?? '';
  const serializedValue = valueIdentity(record.value);
  const keys = [
    `content:${JSON.stringify([name, date, serializedValue])}`,
  ];
  if (record.guid) keys.push(`guid:${record.guid}`);
  if (!name && !date) keys.push(`value:${serializedValue}`);
  return keys;
}

export function buildPresetImportIdentitySet(
  records: Iterable<PresetImportIdentityRecord>,
): Set<string> {
  const identities = new Set<string>();
  for (const record of records) addPresetImportIdentity(identities, record);
  return identities;
}

export function hasPresetImportIdentity(
  identities: ReadonlySet<string>,
  record: PresetImportIdentityRecord,
): boolean {
  return presetImportIdentityKeys(record).some(key => identities.has(key));
}

export function addPresetImportIdentity(
  identities: Set<string>,
  record: PresetImportIdentityRecord,
): void {
  for (const key of presetImportIdentityKeys(record)) identities.add(key);
}
