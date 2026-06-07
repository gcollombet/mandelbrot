## 1. Clean up Engine.ts

- [x] 1.1 Remove unused static properties (`_tileTexture`, `_tileTextureView`, `_skyboxTexture`, `_skyboxTextureView`) and local default WebP imports (`bronzeUrl`, `skyboxUrl`) from `src/Engine.ts`.
- [x] 1.2 Replace the asynchronous `_loadTexture` operations inside the `initialize` method with instant, synchronous 1x1 solid white dummy texture creation for `tileTexture` and `skyboxTexture`.

## 2. Enhance textureLibrary.ts

- [x] 2.1 Export default names (`DEFAULT_TILE_TEXTURE_NAME = 'Gold'`, `DEFAULT_SKYBOX_TEXTURE_NAME = 'Window'`) and lookup functions (`getDefaultTileTextureUrl()`, `getDefaultSkyboxTextureUrl()`) from `src/textureLibrary.ts`.
- [x] 2.2 Update `ensureTextureLibrary()` to search for corresponding local metadata records in IndexedDB and merge their `favorite` and `remote` state onto the returned built-in texture list.

## 3. Clean up PalettePreview.vue

- [x] 3.1 Remove imports of local WebP defaults (`bronzeUrl`, `goldUrl`) from `src/components/PalettePreview.vue`.
- [x] 3.2 Update default fallbacks for `tileUrl` and `skyboxUrl` inside `init()` using `getDefaultTileTextureUrl()` and `getDefaultSkyboxTextureUrl()` from `textureLibrary.ts` when props are not provided.

## 4. Update Settings.vue

- [x] 4.1 Modify `canUploadTexture` to allow uploading built-in textures by checking `!!texture.guid` instead of filtering out built-in names.
- [x] 4.2 Update `uploadTexture()` to fetch the bundled WebP file's URL and convert it to a Blob using `fetch()` when uploading built-in textures, while continuing to query IndexedDB for custom ones.

## 5. Verification

- [x] 5.1 Run type-checking via `npx vue-tsc -b` to verify code correctness.
- [x] 5.2 Start the Vite dev server and log in as admin to manually verify that built-in textures can be favorited/uploaded to the shared catalog.
- [x] 5.3 Run Playwright E2E visual and functional tests (`npx playwright test`) to ensure no regressions.
