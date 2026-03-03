/**
 * IndexedDB-based storage for Mandelbrot presets.
 *
 * Presets are stored with an auto-incremented numeric `id` as the primary key
 * because the name is now optional (quick snapshots may have no name).
 *
 * Each record embeds a small PNG thumbnail (data-URL, ~15-30 KB) so the
 * dropdown list can be rendered cheaply without deserialising full params.
 *
 * The legacy `mandelbrot_presets` localStorage key is migrated automatically
 * on first access.
 */

import type { MandelbrotParams } from './Mandelbrot';

const DB_NAME = 'mandelbrot-presets';
const DB_VERSION = 2;
const STORE_NAME = 'presets';

/** Legacy localStorage key used before the IndexedDB migration. */
const LEGACY_STORAGE_KEY = 'mandelbrot_presets';

/** localStorage flag to track the palettePeriod ×256 migration. */
const PALETTE_MIGRATION_KEY = 'mandelbrot_pp256_migrated';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Lightweight entry returned for listings (no full params). */
export interface PresetMetadata {
  id: number;
  name: string;          // empty string when unnamed
  thumbnail: string;     // data-URL PNG
  date: string;          // ISO 8601
  scaleExponent: number; // floor(log10(1/scale)) — zoom indicator
}

/** Full record stored in IndexedDB. */
export interface PresetRecord extends PresetMetadata {
  value: MandelbrotParams;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      // v1→v2: no schema changes, palettePeriod migration is handled post-open
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(
  mode: IDBTransactionMode,
): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
  return openDB().then((db) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return { store, done };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the zoom indicator: floor(log10(1 / scale)). */
export function computeScaleExponent(scale: string | number): number {
  const s = Number(scale);
  if (!s || s <= 0 || !isFinite(s)) return 0;
  return Math.floor(Math.log10(1 / s));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return metadata for every stored preset (cheap — no full params loaded).
 * Results are sorted newest-first by date.
 */
export async function getAllPresetEntries(): Promise<PresetMetadata[]> {
  const { store, done } = await tx('readonly');
  const all: PresetRecord[] = await reqToPromise(store.getAll());
  await done;
  return all
    .map(({ id, name, thumbnail, date, scaleExponent }) => ({
      id,
      name,
      thumbnail,
      date,
      scaleExponent,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Return the full record for a given preset, or `null` if not found.
 */
export async function getPresetById(id: number): Promise<PresetRecord | null> {
  const { store, done } = await tx('readonly');
  const record: PresetRecord | undefined = await reqToPromise(store.get(id));
  await done;
  return record ?? null;
}

/**
 * Store a new preset. Returns the auto-generated id.
 */
export async function savePresetEntry(
  value: MandelbrotParams,
  thumbnail: string,
  name?: string,
  date?: string,
): Promise<number> {
  const record: Omit<PresetRecord, 'id'> & { id?: number } = {
    name: name ?? '',
    value,
    thumbnail,
    date: date ?? new Date().toISOString(),
    scaleExponent: computeScaleExponent(value.scale),
  };
  const { store, done } = await tx('readwrite');
  const id = await reqToPromise(store.add(record) as IDBRequest<number>);
  await done;
  return id;
}

/**
 * Overwrite an existing preset (e.g. to rename it).
 */
export async function updatePresetEntry(record: PresetRecord): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.put(record);
  await done;
}

/**
 * Delete a preset by id.
 */
export async function deletePresetEntry(id: number): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.delete(id);
  await done;
}

/**
 * Return how many presets are currently stored.
 */
export async function getPresetCount(): Promise<number> {
  const { store, done } = await tx('readonly');
  const count = await reqToPromise(store.count());
  await done;
  return count;
}

// ---------------------------------------------------------------------------
// Migration from localStorage
// ---------------------------------------------------------------------------

interface LegacyPreset {
  name: string;
  value: MandelbrotParams;
  thumbnail?: string;
  date?: string;
}

/**
 * If presets exist in localStorage (legacy format), migrate them to
 * IndexedDB and remove the old key. Safe to call repeatedly — it is a
 * no-op once the legacy key has been cleaned up.
 */
export async function migratePresetsFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;

  let entries: LegacyPreset[];
  try {
    entries = JSON.parse(raw);
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  for (const entry of entries) {
    try {
      await savePresetEntry(
        entry.value,
        entry.thumbnail ?? '',
        entry.name,
        entry.date,
      );
    } catch (e) {
      console.warn(`[presetStore] Failed to migrate preset "${entry.name}":`, e);
    }
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// palettePeriod ×256 migration (removal of /256 divisor in color.wgsl)
// ---------------------------------------------------------------------------

/**
 * One-time migration: multiply palettePeriod by 256 for all existing presets.
 * This compensates for the removal of the `/256.0` divisor in color.wgsl.
 * Also migrates the current settings in localStorage.
 * Safe to call repeatedly — uses a localStorage flag to run only once.
 */
export async function migratePalettePeriod(): Promise<void> {
  if (localStorage.getItem(PALETTE_MIGRATION_KEY)) return;

  // Migrate IndexedDB presets
  try {
    const { store, done } = await tx('readwrite');
    const all: PresetRecord[] = await reqToPromise(store.getAll());
    for (const record of all) {
      if (record.value && typeof record.value.palettePeriod === 'number') {
        record.value.palettePeriod = Number((record.value.palettePeriod * 256).toPrecision(6));
        store.put(record);
      }
    }
    await done;
  } catch (e) {
    console.warn('[presetStore] palettePeriod migration failed for IndexedDB:', e);
  }

  // Migrate current settings in localStorage
  try {
    const raw = localStorage.getItem('mandelbrot_last_settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (typeof settings.palettePeriod === 'number') {
        settings.palettePeriod = Number((settings.palettePeriod * 256).toPrecision(6));
        localStorage.setItem('mandelbrot_last_settings', JSON.stringify(settings));
      }
    }
  } catch (e) {
    console.warn('[presetStore] palettePeriod migration failed for localStorage:', e);
  }

  localStorage.setItem(PALETTE_MIGRATION_KEY, '1');
}
