## Context

Previously, default textures were bundled in the codebase, forcing heavy `.webp` assets to be tracked in Git and distributed in the client bundle. Since these textures are now uploaded to Firebase Storage and synced locally to IndexedDB, we can completely remove them from the build bundle and Git history.

## Goals / Non-Goals

**Goals:**
- Eliminate all compile-time static imports of `.webp` texture assets.
- Make the Mandelbrot frontend bundle size significantly smaller by removing bundled images.
- Remove tracking of WebP textures and thumbnails from Git using `git rm --cached`.

**Non-Goals:**
- Deleting the local assets from the developer's disk (they are preserved locally on the disk but untracked).

## Decisions

### 1. Clear `BUILT_IN_TEXTURES` in `textureLibrary.ts`
- **Decision:** Remove all static imports from `src/textureLibrary.ts` and set `BUILT_IN_TEXTURES` to `[]`.
- **Rationale:** 
  - Prevents the build system (Vite) from resolving and packaging the WebP files, reducing the bundle size.
  - Ensures the codebase is completely independent of the `.webp` files, allowing them to be untracked from Git.

### 2. Return `null` as Fallback in lookup functions
- **Decision:** Modify `getDefaultTileTextureUrl()` and `getDefaultSkyboxTextureUrl()` to return `null` instead of trying to look up the names in `BUILT_IN_TEXTURES` (which is now empty).
- **Rationale:** 
  - Prevents the app from throwing runtime errors when loading default textures before sync is complete.
  - Since we already added support for handling null URLs (using 1x1 dummy textures in both `Engine.ts` and `PalettePreview.vue`), the app will display a clean plain color/placeholder until `syncRemoteCatalog()` downloads the actual textures (`Gold` and `Window`) from Firebase and saves them to IndexedDB.

### 3. Untrack Assets via `git rm --cached`
- **Decision:** Run `git rm --cached` on all `.webp` texture files and thumbnails under `src/assets/` and `src/assets/thumbs/`.
- **Rationale:** Removes the assets from Git tracking while preserving them on the user's local disk.

## Risks / Trade-offs

- **[Risk]** First-time offline users will see no textures (only flat shading) until the app connects to the internet to sync catalog entries.
  - *Mitigation:* This is the expected trade-off of removing all bundled assets. The app will sync automatically in the background as soon as it goes online.
