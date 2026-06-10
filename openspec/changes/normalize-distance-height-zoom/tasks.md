## 1. Color Shader Normalization

- [x] 1.1 Add a source-specific distance-height offset path in `src/assets/color.wgsl` using `-log(zoomFactor)` for frozen samples and `-log(liveZoomFactor)` for live samples.
- [x] 1.2 Apply the selected source offset before all distance-height consumers in `colorize_pixel`, including debug distance, palette height shift, relief, subsurface, and related shading.
- [x] 1.3 Apply the same selected source offset to neighbor distance-height reads used by `distance_height_gradient_at_coord`.
- [x] 1.4 Preserve identity behavior when zoom factors are `1.0` so non-zoom rendering is unchanged.

## 2. Merge Shader Normalization

- [x] 2.1 Update `src/assets/merge_frozen.wgsl` so live candidates write layer 4 as `liveHeight - log(liveZoomFactor)`.
- [x] 2.2 Update `src/assets/merge_frozen.wgsl` so frozen candidates write layer 4 as `frozenHeight - log(zoomFactor)`.
- [x] 2.3 Keep all non-distance layers and the existing min-step-wins source selection unchanged.

## 3. Verification

- [x] 3.1 Run `npx vue-tsc -b` to verify TypeScript and shader imports still typecheck through the Vite project.
- [x] 3.2 Run a local WebGPU visual check in debug shading mode and compare distance continuity while zooming across live/frozen regions.
- [x] 3.3 Verify post-zoom rendering after the merge does not retain a visible distance-height patchwork when zoom factors return to identity.
