## Why

An abandoned interpolation bug produced visually compelling protrusions in the exterior relief, but its orbit-state formula was mathematically invalid and unstable. The renderer should recover that visual language as an explicit, controllable material effect while keeping the cached analytic Mandelbrot geometry authoritative.

## What Changes

- Add an optional per-palette-stop `protrusion` control with a strictly neutral default.
- Add global `protrusionPhase` and `protrusionSharpness` controls to position and concentrate the smooth-escape lobe.
- Modulate the cached analytic relief in the color shader with the parameterized lobe tied to the fractional smooth-escape phase.
- Apply the styled relief consistently to analytic normals, curvature AO, local shadows, ridge accents, and slope-driven iridescence without changing cached height, gradient, antialiasing, texture depth mapping, or fractal iteration.
- Reuse the reserved alpha channel of palette texture row 6, avoiding a new texture, attachment, or palette fetch.

## Capabilities

### New Capabilities

- `palette-protrusion-effect`: Defines an optional palette-interpolated material protrusion effect derived from canonical cached geometry.

### Modified Capabilities

None.

## Impact

- Palette schema and effect metadata in `src/ColorStop.ts` and `src/effectFieldConfig.ts`.
- Persisted Mandelbrot/palette look models and global surface controls.
- Palette texture row-6 packing in `src/Palette.ts`.
- Color and preview uniform packing, material parameter decoding, and analytic relief consumers.
- Palette/effect tests and static shader validation; no Rust/WASM or compute-orbit changes.
