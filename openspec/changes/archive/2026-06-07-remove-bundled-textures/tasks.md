## 1. Clean up textureLibrary.ts

- [x] 1.1 Remove all WebP static imports and their thumbnail imports from `src/textureLibrary.ts`.
- [x] 1.2 Redefine `BUILT_IN_TEXTURES` as an empty array `[]`.
- [x] 1.3 Update `getDefaultTileTextureUrl()` and `getDefaultSkyboxTextureUrl()` to return `null` as a fallback.

## 2. Remove Git Tracking

- [x] 2.1 Run `git rm --cached` on the WebP asset files in `src/assets/` and `src/assets/thumbs/` to untrack them.

## 3. Verification

- [x] 3.1 Run TypeScript typechecks via `npx vue-tsc -b`.
- [x] 3.2 Run Vite build via `npm run build` to ensure the project compiles and builds successfully without bundled WebP files.
