import { computed, ref, type Ref } from 'vue';
import type { CatalogRemoteState } from '../../catalogIdentity';

/**
 * Identity of the library record the current edit state was loaded from.
 * `signature` is the serialized payload at link time; the panel is "dirty"
 * as soon as the live payload serializes differently.
 */
export interface LinkedOrigin {
  /** Family of the record (scene, palette, scenePalette, mapping, stop, animation). */
  kind: string;
  /** Stable identity inside the family: guid, id or name. */
  key: string;
  name: string;
  remote?: CatalogRemoteState;
  /** Built-in records can never be written back. */
  builtIn?: boolean;
  signature: string;
}

/**
 * Shared "linked record" state for every preset family: which record was
 * loaded, whether the live edit diverged from it, and whether it may be
 * written back (catalog and built-in records are read-only).
 */
// One slot per family, shared by every panel instance: the settings tabs are
// mounted and destroyed independently, and the link must survive a tab switch.
const registry = new Map<string, Ref<LinkedOrigin | null>>();

/** Key-order independent serialization: a reloaded record may carry the same
 *  fields in a different order than the live model. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const entries = Object.keys(value as Record<string, unknown>).sort()
    .map(k => [k, (value as Record<string, unknown>)[k]] as const)
    .filter(([, v]) => v !== undefined);
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + stableStringify(v)).join(',') + '}';
}

export function useLinkedRecord(slot: string, payload: () => unknown) {
  let origin = registry.get(slot);
  if (!origin) { origin = ref<LinkedOrigin | null>(null); registry.set(slot, origin); }
  const current = () => { try { return stableStringify(payload()); } catch { return ''; } };
  const dirty = computed(() => !!origin.value && current() !== origin.value.signature);
  const locked = computed(() => !!origin.value && (!!origin.value.remote || !!origin.value.builtIn));

  function link(target: Omit<LinkedOrigin, 'signature'>): void {
    origin.value = { ...target, signature: current() };
  }
  /** Re-snapshot after a successful write back (optionally with a new name/key). */
  function refresh(patch: Partial<Pick<LinkedOrigin, 'name' | 'key'>> = {}): void {
    if (origin.value) origin.value = { ...origin.value, ...patch, signature: current() };
  }
  function unlink(): void { origin.value = null; }
  /** Dev helper: top-level keys whose serialized value differs from the linked snapshot. */
  function diff(): string[] {
    if (!origin.value) return [];
    try {
      const a = JSON.parse(origin.value.signature), b = JSON.parse(current());
      return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => stableStringify(a[k]) !== stableStringify(b[k]));
    } catch { return ['<unparsable>']; }
  }

  return { origin, dirty, locked, link, refresh, unlink, diff };
}
