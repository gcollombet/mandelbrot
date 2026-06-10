## Why

User-imported textures are currently stored and uploaded as the original image file, which can leave large PNG/JPEG assets in IndexedDB, WebGPU texture loading, and the shared Firebase catalog. Normalizing imported textures up front reduces storage, upload size, and GPU memory pressure while keeping the texture workflow consistent.

## What Changes

- Convert every user-imported tile texture and skybox texture to WebP before saving it locally.
- Resize imported textures proportionally so neither side exceeds 2048 pixels.
- Generate thumbnails from the normalized WebP asset instead of the original file.
- Continue uploading textures through the existing remote catalog flow, with uploaded blobs already normalized to WebP.
- Replace the current oversize rejection behavior with automatic downscaling for decodable images.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `texture-catalog-upload`: Texture assets saved locally and uploaded to the shared catalog must be normalized to WebP with a maximum side length of 2048 pixels.

## Impact

- Affected code: `src/components/Settings.vue` texture import flow, thumbnail generation, and stored blob metadata used by `uploadTexture`.
- Affected storage: imported texture blobs in IndexedDB and remote Firebase Storage objects under `catalog/texture/<guid>`.
- Affected rendering: WebGPU texture loading receives smaller WebP-backed object URLs but continues through the existing `Engine.updateTileTexture` and `Engine.updateSkyboxTexture` paths.
- No new runtime dependencies are expected; browser canvas/image APIs can perform decode, resize, and WebP encoding.
