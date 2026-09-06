# Implementation record — 2026-09-06

The sole document format is v4 tiled TIFF. Historical PNG/WebM codecs, converters, atlas packing, CPU reconstruction, shrinking tail and GPU page-request/readback machinery have been removed. Existing disk files are untouched; the catalogue uses a fresh IndexedDB namespace.

## Execution path

- `ExpmapPanel.vue` → `create.ts` → `producer.ts` → Engine direct ExpMap projection. Converged GPU RGBA blocks are copied by scanline into a single octave tile. Native Deflate compresses it; `store.ts` closes and verifies the TIFF tile before publishing an A/B checkpoint.
- `plan.ts` and `octaves.ts`: constant angle/log-depth grid, two-sample halos, one doubling per tile, twelve inner doublings beyond each navigable view. A single computed center color covers the subpixel remainder. The user scale domain is unchanged.
- `tiff.ts`: UTIF writes standard tiled-image metadata; browser CompressionStream/DecompressionStream perform Deflate. File grouping follows classic TIFF capacity rather than a fixed doubling count; index space scales with tile count. An independent UTIF decoder validates complete generated fixtures in tests; production does not use this image decoder.
- `gpuRenderer.ts` → `tileCache.ts` → exact TIFF payload range → native decode → direct RGBA texture upload. Fourteen rgba8unorm-srgb layers, deterministic modulo addressing, at most one pending decode. Obsolete prefetch results cannot overwrite the new window.
- `expmap_reconstruct.wgsl`: one fullscreen triangle, logarithmic projection and hardware linear-light bilinear interpolation. No atomics, request bitsets, GPU readback, CPU pixel reconstruction or intermediary output texture.
- `gpuPlayer.ts`: latest-request/generation protection. `video.ts`: ordered complete canvas frames passed to VideoFrame and the streaming MP4 sink. `ExpmapVideoPanel.vue` releases the interactive cache before allocating the export cache.

## Memory and limitations

At 3840×2160, density one: 13856×1536 RGBA per tile; fourteen layers occupy about 1.11 GiB. This excludes the engine and encoder. Native decode uses one destination tile plus compressed input and transient browser buffers. Creation also holds one assembly tile. One raw tile is capped at 128 MiB; texture dimensions and GPU allocation errors are checked. No silent density reduction.

The cold first view must read/decode/upload its required tiles. Fully resident frames perform no new tile I/O. Sequential movement prefetches the next doubling. A seek may wait for the single in-flight decode and reload its new window. Native Deflate and filesystem I/O remain CPU/browser work, not GPU operations.

Incomplete TIFFs are resumable checkpoints; standalone image viewing applies once their tiles are complete. Hash verification is lazy per payload so opening a deep document does not scan all image bytes. Compression ratio and target-hardware throughput are not measured.

## Validation

- `npx vue-tsc -b`: passed.
- `npx vitest run tests/unit`: 103 files, 702 tests passed.
- Naga: direct production shader and reconstruction shader passed.
- OpenSpec strict validation: passed.
- No Rust changes in this revision, no WASM rebuild needed.
- No Playwright, browser/GPU benchmark or target-hardware visual/performance claim. Task 4.4 remains pending explicit confirmation.

## Removal of fixed TIFF grouping

The thirteen-doubling file cap is removed. Grouping now depends on a conservative compressed-size bound and classic TIFF 32-bit offsets/dimensions. Header storage grows with the tile index. The decoder, prefetch and fourteen GPU slots are unchanged. Targeted validation: 91 ExpMap tests passed, including standard decoding of a fifteen-tile TIFF, metadata beyond 20 KB, and checkpoint recovery across the capacity-driven file boundary. Type checking and strict OpenSpec validation passed.
