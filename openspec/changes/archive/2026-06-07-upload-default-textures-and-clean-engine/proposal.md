## Why

Currently, `Engine.ts` and `PalettePreview.vue` load legacy local textures (`bronze.webp` and `skybox.webp`/`gold.webp` respectively) on startup as hardcoded default fallbacks. This causes redundant asset downloading, decoding, and GPU uploads before the actual selected textures (`Gold` and `Window` from the catalog) are applied. Additionally, the admin interface blocks the upload of built-in textures to the shared Firebase catalog, preventing their migration to Firestore.

## What Changes

- **Synchronous 1x1 Placeholders in Engine**: Replace the asynchronous loading of default local WebP textures in `Engine.ts` with instant, synchronous 1x1 dummy placeholder textures.
- **Dynamic Fallbacks in Preview**: Retrieve the default texture URLs from the built-in library (`textureLibrary.ts`) instead of importing them directly in `PalettePreview.vue` when properties are missing.
- **Enable Built-in Texture Uploads**: Modify the admin upload validations to allow built-in textures to be uploaded to Firebase Storage and registered in Firestore.
- **Built-in Catalog Metadata Synchronization**: Ensure the favorite and remote synchronization states are merged and persisted for built-in textures in IndexedDB, resolving UI status feedback for built-in textures.

## Capabilities

### New Capabilities
- `texture-catalog-upload`: Allows admins to upload built-in textures directly to the shared Firebase Storage and Firestore catalog.

### Modified Capabilities
<!-- None -->

## Impact

- `src/Engine.ts`: Removes imports of local default WebPs, simplifies initialization to be synchronous, and removes unused static caching.
- `src/components/PalettePreview.vue`: Removes local imports of default WebPs and resolves fallbacks dynamically from `textureLibrary.ts`.
- `src/components/Settings.vue`: Modifies `canUploadTexture` and `uploadTexture` to support built-in assets via fetching their URLs.
- `src/textureLibrary.ts`: Defines default asset constants and merges IndexedDB stored states (favorite, remote) for built-in textures.
