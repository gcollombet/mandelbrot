## Why

Now that default textures have been uploaded to Firebase Storage and registered in Firestore, we can remove them from the repository bundle to reduce git history size and final package size. Statically importing these WebP images forces them to be bundled in the build, which is no longer needed since they can be dynamically synced from the remote catalog.

## What Changes

- **Remove Static Imports**: Remove all static WebP imports and thumbnail imports from `src/textureLibrary.ts`.
- **Empty Built-ins**: Redefine `BUILT_IN_TEXTURES` as an empty array (or empty collection).
- **Safe Fallback Resolution**: Update lookup functions like `getDefaultTileTextureUrl()` and `getDefaultSkyboxTextureUrl()` to return `null` instead of crashing when `BUILT_IN_TEXTURES` is empty.
- **Untrack Assets in Git**: Execute `git rm --cached` on WebP texture files and thumbnails under `src/assets/` to remove them from Git tracking while keeping them locally.

## Capabilities

### New Capabilities
- `dynamic-texture-resolution`: Resolves default and built-in textures dynamically from the local synced database (IndexedDB) or Firebase rather than relying on bundled static files.

### Modified Capabilities
<!-- None -->

## Impact

- `src/textureLibrary.ts`: Removes imports, resets `BUILT_IN_TEXTURES` to empty, and secures fallback functions.
- `src/assets/` & `src/assets/thumbs/`: Untracked from Git repository.
- `src/components/PalettePreview.vue` & `src/Engine.ts`: Safely handle null/fallback values when resolving initial textures before sync completes.
