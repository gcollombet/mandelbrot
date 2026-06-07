export interface CatalogRemoteState {
  publishedName?: string;
  lastUpdated?: string;
}

export interface CatalogIdentityFields {
  guid: string;
  name: string;
  lastUpdated: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
}

export function createGuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `guid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function defaultPresetName(date: string): string {
  return date;
}

export function textureNameFromFileName(fileName: string): string {
  const withoutPath = fileName.split(/[\\/]/).pop() ?? fileName;
  const withoutExtension = withoutPath.replace(/\.[^.]*$/, '').trim();
  return withoutExtension || withoutPath || new Date().toISOString();
}

export function makeUniqueName(name: string, usedNames: Iterable<string>): string {
  const base = name.trim();
  const used = new Set(Array.from(usedNames).map(value => value.toLocaleLowerCase()));
  if (!used.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  while (used.has(`${base} (${suffix})`.toLocaleLowerCase())) {
    suffix += 1;
  }
  return `${base} (${suffix})`;
}

export function nameForCatalogReference<T extends {guid?: string; name: string}>(entries: T[], guid?: string, fallbackName?: string): string | null {
  if (guid) {
    const byGuid = entries.find(entry => entry.guid === guid);
    if (byGuid) return byGuid.name;
  }
  if (fallbackName && entries.some(entry => entry.name === fallbackName)) return fallbackName;
  return null;
}
