## 1. Texture Normalization

- [x] 1.1 Add an import-time helper in `Settings.vue` that decodes an image file, preserves aspect ratio, caps the largest side at 2048 pixels, and encodes the result as an `image/webp` Blob.
- [x] 1.2 Ensure the helper does not upscale images already within the 2048-pixel limit.
- [x] 1.3 Ensure normalization failures report an import error and do not save the original file as a fallback.

## 2. Import Flow Integration

- [x] 2.1 Update `importTextureFor` to normalize the selected file before naming, thumbnail generation, and `saveTextureEntry`.
- [x] 2.2 Generate thumbnails from the normalized WebP blob instead of the original uploaded file.
- [x] 2.3 Apply the same normalization path for both tile texture imports and skybox texture imports.
- [x] 2.4 Keep automatic selection of the newly imported texture working for the requested target.

## 3. Remote Upload Behavior

- [x] 3.1 Verify `uploadTexture` sends the normalized stored blob with `contentType: image/webp` and normalized `size` metadata for user-imported textures.
- [x] 3.2 Confirm built-in texture upload behavior remains unchanged.

## 4. Verification

- [x] 4.1 Add or update focused tests for imported texture normalization where the existing test stack can cover the behavior.
- [x] 4.2 Run `npx vue-tsc -b`.
- [x] 4.3 Run relevant unit tests for texture/catalog behavior.
- [ ] 4.4 Manually verify importing an oversized texture produces a selectable rendered texture and a thumbnail.
