# Implementation record — 2026-09-08

## Portable document and production

The sole format is manifest v5 in a ZIP64 STORE .expmap file: manifest.json (recipe, codec quality, thumbnail, domain, checksums) and doubling-N.webp. zip.js replaces UTIF; old TIFF/Deflate production and tests were removed. Existing files are untouched and no migration reader is included. The catalogue uses a fresh namespace.

ExpmapPanel → ExpmapStore.working (internal OPFS checkpoints) → create → producer → Engine direct ExpMap projection. The producer assembles a complete doubling. Its byte buffer transfers to imageEncoder.worker, which uses a clamped ImageData view, an opaque OffscreenCanvas and native WebP encoding. Meanwhile, the GPU produces the next doubling. One encoder/write job and one assembly tile bound the queue; native canvas/codec buffers are additional. The writer closes and verifies each independent image before publishing A/B metadata. Compute (including preparation/readback), encode, write/verification and blocked-wait times are reported separately.

At completion or controlled interruption, zip.js streams the internal image files into the chosen .expmap destination, without global Blob assembly or repeated copying of an ever-growing file. The closed archive index/manifest is checked before removing temporary files. A failed finalization retains OPFS checkpoints. Reopening an incomplete portable file stages its existing images with progress and cancellation, then resumes from the first unpublished doubling. File-operation locks cover calculation, finalization and cleanup across tabs. Abrupt tab termination may leave the chosen external file unfinished; checkpoints depend on browser storage remaining available.

## Reading, video, thumbnails and image export

ExpmapGpuRenderer → ExpmapTileCache → indexed ZIP entry → checksum → createImageBitmap → copyExternalImageToTexture. Fourteen rgba8unorm-srgb layers retain the existing modulo addressing and reconstruction shader. Native bitmaps close after upload or abandonment. Resident frames require no further reads or decoding. The video renderer uses this same path and ordered frames; the MP4 sink is unchanged.

The worker creates an initial preview from baked pixels. At completion the UI replaces it with a reconstructed baked-camera thumbnail when GPU reconstruction succeeds. Both are portable through manifest metadata. The interactive fractal canvas is no longer used as a thumbnail source.

Whole-image export exposes width, height, PNG/JPEG/WebP and quality. It assembles the angle/log-depth map from independent native images, excluding halos and padding, including the stored inner coverage. One source image is decoded at a time. Output is explicitly capped at 32 megapixels, 16383 per WebP side or 32767 for other formats. It uses native canvas filtering, distinct from the video shader’s linear-light filter. Exported PNG adds no further loss to already lossy stored colors.

## Numerical behavior and limits

The direct sample grid, twelve inner doublings, precise user domain, subpixel center color and continuous-radial-v1 material correction are preserved. The compute shader applies continuous scale before material clipping/accumulation; no color shader correction was introduced here.

4K density one remains 13856×1536 pixels per tile and about 1.11 GiB for fourteen GPU layers, excluding engine/output/codec resources. Production has two raw tile ownership slots (about 162.4 MiB at that resolution), plus codec surfaces and compressed data. Native WebP dimensions and a 128 MiB raw-tile cap are checked. Quality defaults to 0.90 and is restored from the manifest during resume. Lossy compression can alter fine detail and shared halos. No speed, compression ratio or visual-fidelity improvement is claimed measured on hardware.

## Validation

Unit tests cover ZIP STORE read/write, portable metadata, lazy image hashes, failed checkpoint publication, failed final destination and retry, interrupted archive staging, asynchronous encoding overlap/backpressure/failure, quality/force preservation, native bitmap release, native encoder fallback/type contracts, export row coverage and limits, plus existing geometry/player/video tests. Native codec tests use API doubles; they do not measure actual browser WebP quality or speed.

Validation passed: 108 unit files / 726 tests, TypeScript, Vite worker bundling, both Naga shaders and strict OpenSpec. No Rust changes, Playwright or target-GPU benchmark. Hardware visual/performance validation remains task 4.4, pending explicit authorization.

## Adaptive video pixel integration

Video defaults to a 16-tap ceiling, selectable as 1/4/9/16. The view passes this ceiling through an 80-byte uniform block to the shared reconstruction shader. A conservative polar density determines a square midpoint grid within each output pixel; counts/positions are fixed across frames at fixed output dimensions. Texture samples and the decoded center color are integrated in linear light, then encoded once. Interactive views retain their one-tap default. No extra cache layers or field computation is introduced.

Validation: 15 ExpMap test files / 117 tests passed, TypeScript, Naga and strict OpenSpec passed. Tests cover the least-dense-axis uniform contract, ceilings/defaults and video forwarding/rejection. Actual GPU anti-aliasing quality and throughput remain unmeasured.
