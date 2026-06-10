## Context

Imported textures enter the app through `Settings.vue` and are currently validated by MIME type and dimensions before the original `File` is stored in IndexedDB via `saveTextureEntry`. The engine later loads the stored blob through an object URL, and the admin catalog upload path sends that same blob to Firebase Storage.

This means one import path controls local rendering, local storage, thumbnails, and remote catalog payloads. The change should use that leverage point instead of adding a second remote-only conversion path.

## Goals / Non-Goals

**Goals:**

- Normalize every user-imported tile and skybox texture to a WebP blob before it is saved.
- Ensure normalized texture dimensions preserve aspect ratio and never exceed 2048 pixels on either side.
- Keep existing texture selection, IndexedDB storage, WebGPU loading, and remote upload contracts intact.
- Generate thumbnails from the normalized texture so UI previews match the stored asset.
- Avoid new dependencies by using browser image decode, canvas resize, and WebP encode APIs.

**Non-Goals:**

- Do not migrate already-stored local textures in IndexedDB.
- Do not change built-in texture packaging or static texture library behavior.
- Do not introduce server-side image processing.
- Do not add a new texture metadata schema solely for dimensions or original format.

## Decisions

### Normalize at import time

The app will convert and resize the selected image before calling `saveTextureEntry`. This makes the local blob and remote upload blob the same artifact.

Alternative considered: convert only inside `uploadTexture`. That would reduce Firebase payload size, but local storage and WebGPU usage would still carry oversized originals. It would also create two different assets for the same texture depending on whether it was local or remote.

### Use WebP for all imported texture blobs

The normalized blob will be encoded as `image/webp` regardless of the source format. WebP preserves alpha and gives a smaller catalog payload than PNG for most imported textures.

Alternative considered: keep PNG for transparent sources. That preserves exact lossless pixels, but it weakens the size guarantee for the catalog and complicates a simple rule users can understand.

### Resize proportionally to a 2048-pixel maximum side

The conversion step will compute a scale factor of `min(1, 2048 / max(width, height))`, draw the decoded image into a canvas at the scaled dimensions, and encode that canvas as WebP. Images already at or below the limit are still re-encoded as WebP without upscaling.

Alternative considered: reject images above 2048. Automatic downscaling is friendlier and matches the desired behavior of accepting high-resolution uploads while protecting storage and GPU memory.

### Keep upload flow unchanged after normalization

`uploadTexture` should continue reading the stored blob through `getTextureBlob` and passing it to `uploadRemoteTextureEntry`. Because imported blobs are normalized up front, the existing `contentType` and `size` metadata naturally reflect the WebP payload.

Alternative considered: add conversion logic to `remoteCatalog.ts`. That module should remain transport-focused and not depend on DOM/canvas APIs.

## Risks / Trade-offs

- WebP encoding can fail or be unavailable in an unusual browser -> detect a missing blob or non-WebP output and show an import error instead of saving the original file.
- WebP is lossy at typical quality settings -> use a high quality value appropriate for visual textures, while accepting the storage and upload benefits.
- 2048-pixel skyboxes may be softer than larger originals -> apply the requested global cap consistently for tile and skybox uploads.
- Canvas resize can be memory-intensive for very large source images -> decode and normalize once during import, release object URLs promptly, and avoid retaining the original file.
- Existing oversized textures remain in IndexedDB -> leave them unchanged; future imports and remote syncs use the new contract.
