## Context

Currently, the Mandelbrot engine and palette preview components rely on hardcoded local asset files (`bronze.webp`, `skybox.webp`, `gold.webp`) as startup defaults and fallbacks. This design couples the rendering engine to specific assets, leads to redundant asset loads/decodes on initialization (double-loading), and fails to utilize the dynamic texture catalog. In addition, the catalog interface prevents uploading built-in textures to Firebase, which stops administrators from migrating these assets to the shared database.

## Goals / Non-Goals

**Goals:**
- Eliminate hardcoded local default asset dependencies in `Engine.ts` and `PalettePreview.vue`.
- Make `Engine.initialize()` instant and synchronous by using 1x1 placeholder textures.
- Allow built-in textures to be uploaded to Firebase Storage and Firestore.
- Persist the remote catalog status and favorite state for built-in textures.

**Non-Goals:**
- Deleting the actual WebP files from the local assets directory (they remain for built-in offline support).
- Redesigning the IndexedDB schema or Firebase Storage layout.

## Decisions

### 1. Synchronous 1x1 Placeholders in `Engine.ts`
- **Decision:** Initialize `tileTexture` and `skyboxTexture` with 1x1 solid white textures during `initialize()`, rather than calling `this._loadTexture(...)` on startup.
- **Rationale:** 
  - Makes `Engine.initialize()` synchronous and instant (no network or file I/O latency).
  - Eliminates the double-loading of default textures at startup (first loading the hardcoded default, then immediately replacing it with the user's selected texture).
  - Removes the hardcoded dependency on `bronze.webp` and `skybox.webp` in `Engine.ts`.
- **Alternatives Considered:** Passing the initial texture URLs to `Engine.initialize()`. This would require routing these properties down through several layers of Vue wrappers (`MandelbrotViewer` -> `MandelbrotController` -> `Mandelbrot.vue`), adding unnecessary boilerplate props.

### 2. Collection-based Fallbacks in `PalettePreview.vue`
- **Decision:** When `tileTextureUrl` or `skyboxTextureUrl` props are null/undefined, retrieve the default URLs using `getDefaultTileTextureUrl()` and `getDefaultSkyboxTextureUrl()` from `textureLibrary.ts` instead of directly importing `bronzeUrl` and `goldUrl` as local defaults.
- **Rationale:** Centralizes default definitions in the collection (`textureLibrary.ts`) instead of duplicating them across components.
- **Alternatives Considered:** Rendering 1x1 dummy placeholders in the preview when props are null. This would cause a brief flicker of a flat color before the selected texture loads, which is visually unappealing for a preview.

### 3. Fetching Bundled Assets for Firebase Uploads
- **Decision:** In `Settings.vue`'s `uploadTexture(texture)`, if the texture is a built-in asset, fetch its URL using `storedTextureObjectUrl(texture.name)` to obtain its Blob. For custom textures, continue querying IndexedDB via `getTextureBlob(texture.name)`.
- **Rationale:** Built-in textures are not stored as blobs in IndexedDB. Fetching their resolved asset URL at runtime converts the bundled file to a Blob, allowing it to be uploaded to Firebase Storage.
- **Alternatives Considered:** Storing all built-in texture blobs in IndexedDB during database migration. This would significantly increase local storage quota consumption (~30MB for 20 built-in textures) on the client side for no functional benefit.

### 4. Merging Metadata for Built-in Textures
- **Decision:** Modify `ensureTextureLibrary()` in `textureLibrary.ts` to search for matching records in the local IndexedDB metadata store by `guid` or `name` and merge their `favorite` and `remote` status onto the built-in entries.
- **Rationale:** Ensures that favorite state toggles and remote upload validation checkmarks persist and display correctly for built-in textures, as they do for custom textures.

## Risks / Trade-offs

- **[Risk]** The engine rendering loop could draw a frame using the 1x1 placeholder texture before the real texture is asynchronously loaded from the collection.
  - *Mitigation:* The viewer updates the textures immediately on `onEngineReady` before starting the render loop. In addition, the real texture loading from memory or disk cache takes only a few milliseconds (1 frame is 16ms), making any placeholder frame virtually invisible or imperceptible.
