## Why

The scene-aligned neutral field preserves expensive Mandelbrot work across view
rotation, but the settled non-AA color path reconstructs that rotated lattice
with nearest-texel lookup. At non-axis-aligned angles this exposes the raw
square grid as jagged macroblocks before antialiasing is even involved.

## What Changes

- Add an idle-time rotation color resolve for settled, non-AA views: colorize
  the converged neutral field once into a linear `rgba16float` cache, then
  rotate/reconstruct that final color with hardware bilinear filtering.
- Keep semantic Mandelbrot fields discrete; no generic interpolation of
  iteration state, distance estimates, orbit traps, metadata, or Taylor
  payloads is introduced.
- Keep the current direct path during interaction, convergence, animations,
  axis-aligned views, and whenever the cache is absent or stale.
- Make rotation resolve and temporal AA mutually exclusive. AA samples never
  read the filtered cache, and a completed AA accumulator remains the displayed
  result until normal AA invalidation.
- Add explicit cache invalidation and readiness tracking so a partially baked
  cache is never presented.

## Capabilities

### New Capabilities

- `rotation-color-resolve`: Settled non-AA rotated views gain a linear-color
  cache and filtered presentation without interpolating semantic field data.

### Modified Capabilities

- `progressive-render-pipeline`: The final color stage gains a convergence-
  gated neutral-cache bake and filtered present branch that is strictly
  exclusive with AA accumulation/presentation.

## Impact

- `src/Engine.ts`: one filterable linear-color texture, cache lifecycle state,
  pipelines/bind groups, convergence gating, and conditional presentation.
- `src/assets/color.wgsl`: a neutral-space color-cache fragment entry point
  reusing the existing material/color logic without final display dithering.
- New lightweight WGSL present shader for screen-to-neutral rotation sampling,
  linear-to-sRGB conversion, and final 8-bit dithering.
- GPU cost: one extra color-cache render plus one cheap filtered present on a
  settled rotated view; no additional Mandelbrot iterations. AA and interactive
  rendering retain their current paths.
