export const PRESET_QUERY_PARAMETER = 'preset';

/** Normalize the Vue Router query value for a catalogue preset GUID. */
export function presetGuidFromRouteQuery(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const guid = typeof candidate === 'string' ? candidate.trim() : '';
  return guid || null;
}

export function absolutePresetUrl(resolvedHref: string, currentHref: string): string {
  return new URL(resolvedHref, currentHref).toString();
}
