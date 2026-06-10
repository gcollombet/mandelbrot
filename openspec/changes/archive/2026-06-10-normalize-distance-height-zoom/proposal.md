## Why

During zoom reprojection, the live and frozen textures store distance-height values computed at different source scales. The color shader currently reprojects their UVs and compares their resolution steps, but it uses the stored distance height without converting it to the current display scale, causing visible discontinuities in debug distance shading and related height-based rendering.

## What Changes

- Normalize distance-height values from live and frozen sources to the current display scale before colorization.
- Normalize distance-height layer data during the frozen/live merge so post-zoom frozen snapshots do not preserve mixed scale units.
- Keep the existing min-step-wins compositing behavior for choosing live versus frozen samples.
- Preserve the logarithmic representation of distance height; scale correction is applied as a log offset rather than a linear multiplication.

## Capabilities

### New Capabilities

- `zoom-distance-height-continuity`: Defines continuity requirements for distance-height data across live/frozen zoom reprojection and merge.

### Modified Capabilities

- None.

## Impact

- Affects `src/assets/color.wgsl` distance-height reads used by debug distance, debug gradient, palette height shift, relief, subsurface, and related shading.
- Affects `src/assets/merge_frozen.wgsl` layer 4 writes when merging live and frozen textures after zoom.
- Does not change public APIs, user controls, dependencies, or persisted data formats.
