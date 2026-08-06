## Why

The color pass currently reconstructs distance geometry repeatedly from neighboring samples while the resolved display buffer sits at the portable eight-MRT/32-byte limit. Precomputing stable geometry and packing the display contract can reduce repeated shading work, restore attachment headroom, and make normals, AO, and reflections consume one coherent field.

## What Changes

- Compute the analytic gradient of distance height once when an orbit escapes, in f32, and expose the gradient rather than `z″` to the color pass.
- Compute the scalar analytic Laplacian of distance height from `z` and `z′` at the same terminal point; remove the spatial-neighbour geometry pass.
- Require every accepted iteration/approximation move to propagate `z″`; a move without a complete second-order chain rule is rejected in favour of exact iteration rather than a display-side fallback.
- Replace the separate distance-height and derivative-angle display attachments with one `rgba16float` geometry attachment: `(gradient.x, gradient.y, curvature, distanceHeight)`.
- **BREAKING** Replace derivative-angle-driven display orientation with the direction of the cached distance-height gradient; this intentionally aligns anisotropy and directional relief with the displayed geometry.
- Preserve `z.x` and `z.y` as separate `r32float` attachments so orbit traps, escape-coordinate texture mapping, smooth escape reconstruction, and related effects remain available.
- Replace the full floating-point step channel, integer reference index, stripe phase, and coherence representation with one packed `r32uint` metadata attachment containing compact dyadic provenance, stripe phase, and coherence. The integer part of the reference index is not forwarded to color.
- Reduce the resolved/frozen display contract from eight MRTs/32 bytes per texel to five MRTs/24 bytes per texel: iteration, `z.x`, `z.y`, geometry, and metadata.
- Update live, resolved, frozen, merge, magnification, picking, debug, AA-target, and color consumers to decode the new contract consistently.
- Keep fixed-escape-branch limitations explicit: non-finite production is sanitized upstream without a spatial fallback, while transition behavior is validated separately.

## Capabilities

### New Capabilities

- `cached-geometry-fields`: Defines the production, storage, packing, propagation, and color consumption of analytic distance gradient, analytic Laplacian, distance height, and display metadata.

### Modified Capabilities

- `progressive-render-pipeline`: Replace the eight-layer resolved display contract and full float step channel with the five-attachment packed contract while preserving live/frozen quality selection.
- `zoom-distance-height-continuity`: Propagate and normalize cached geometry consistently across live/frozen reprojection and merge instead of reconstructing the distance gradient from neighboring color-pass reads.

## Impact

- Affects `src/Engine.ts` texture/render-pipeline declarations and the Mandelbrot, resolve, merge, color, AA target, debug, and picking shader/data paths; removes the geometry-finalization shader/pass.
- Changes the internal display-buffer ABI and therefore requires coordinated migration of every producer and consumer; external user data and palette preset formats are unchanged.
- Retains escape `z.xy` behavior and the existing `escape-z-texture-mapping` contract.
- Is designed to follow `simplify-progressive-renderer`; the removed Super Pixel half-step/rejection markers are deliberately not represented in the new metadata word.
- Requires numerical checks against fixed-branch finite differences, transition diagnostics, format-precision comparisons, static shader/build checks, and user-approved browser/GPU visual and timing validation.
