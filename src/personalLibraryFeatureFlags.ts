function enabled(value: unknown, fallback = true): boolean {
  if (typeof value !== 'string' || value === '') return fallback;
  return !['0', 'false', 'off', 'no'].includes(value.toLowerCase());
}

const endpoints = enabled(import.meta.env.VITE_PERSONAL_LIBRARY_ENDPOINTS_ENABLED);
const scopedCache = endpoints && enabled(import.meta.env.VITE_PERSONAL_SCOPED_CACHE_ENABLED);
const presetSync = scopedCache && enabled(import.meta.env.VITE_PERSONAL_PRESET_SYNC_ENABLED);
const textureSync = presetSync && enabled(import.meta.env.VITE_PERSONAL_TEXTURE_SYNC_ENABLED);

export const personalLibraryFeatureFlags = Object.freeze({
  endpoints,
  scopedCache,
  presetSync,
  textureSync,
  guestImport: textureSync && enabled(import.meta.env.VITE_GUEST_LIBRARY_IMPORT_ENABLED),
});
