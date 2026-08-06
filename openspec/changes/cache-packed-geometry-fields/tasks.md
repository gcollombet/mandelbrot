## 1. Dependency and legacy oracle

- [x] 1.1 Confirm `simplify-progressive-renderer` is applied or explicitly disable the packed path while Super Pixel half-step/rejection markers still exist.
- [x] 1.2 Inventory every producer and consumer of the eight resolved/frozen layers, including resolve, merge, color, magnification, AA target, debug, picking, snapshots, and copies.
- [x] 1.3 Add an internal legacy-versus-packed comparison switch so the eight-layer f32 display set remains a temporary validation oracle during migration. (The atomic migration used test-side semantic contracts; no production comparison flag remains.)

## 2. Typed display set and metadata

- [x] 2.1 Introduce a typed display-set resource abstraction for the three-layer `r32float` value texture, `rgba16float` geometry, and `r32uint` metadata textures.
- [x] 2.2 Keep live/frozen five-attachment display sets, remove resolve/finalization use of the `rgba16float` geometry scratch texture, and retain temporary copies only where merge hazards require them.
- [x] 2.3 Implement shared WGSL pack/unpack helpers for 4-bit dyadic provenance, 14-bit stripe phase, and 14-bit coherence.
- [x] 2.4 Add focused round-trip and boundary checks for exact step 1, maximum supported dyadic step, circular stripe wrap, coherence endpoints, and no-data semantics.
- [x] 2.5 Update render-pipeline target declarations and bind-group layouts for the mixed float/half-float/uint formats.

## 3. Analytic geometry production

- [x] 3.1 Move the f32 analytic distance-height gradient into terminal iteration output, including source neutral-texel scaling.
- [x] 3.2 Propagate `z″` through exact, deep, BLA, Padé, Jet, Möbius, Unified and renormalized moves; reject any remaining incomplete move instead of invalidating the payload.
- [x] 3.3 Store terminal gradient.xy, analytic Laplacian, height, and packed stripe/coherence in the reassigned raw slots while preserving continuation meanings and AA payloads.
- [x] 3.4 Make resolve copy exact terminal geometry and bilinearly interpolate provisional analytic geometry; remove the spatial fallback and geometry-finalization pass.
- [x] 3.5 Define finite gradient/curvature storage clamps from observed f32 distributions and apply them before `rgba16float` conversion.
- [x] 3.6 Add a temporary `rgba32float` geometry oracle and error instrumentation for half-float validation. (Validation uses a deterministic f32 CPU oracle against the exact half-float encoding, avoiding a shipping validation texture.)

## 4. Resolve, reprojection, and cache lifecycle

- [x] 4.1 Make resolve output final iter, `z.x`, `z.y`, analytic geometry, and packed metadata directly.
- [x] 4.2 Migrate live/frozen quality comparison to reconstruct effective support step from the provenance exponent and source-scale ratio.
- [x] 4.3 Migrate frozen snapshot, copy/reprojection, and merge paths so value, geometry, and metadata always come from one selected source version.
- [x] 4.4 Centralize source-to-display transforms for logarithmic height offset, gradient scale/rotation, and curvature squared-scale normalization.
- [x] 4.5 Add display-set/geometry version tracking and invalidate on field, transform, bailout, approximation readiness, iteration progress, snapshot, and merge changes.
- [x] 4.6 Reuse the last coherent typed display set and skip the now-single resolve stage only when its version is current.

## 5. Color and auxiliary consumers

- [x] 5.1 Replace color's eight-layer sample structs/bindings with typed value, geometry, and metadata loads for live and frozen sources.
- [x] 5.2 Use cached gradient for base normals, lighting, reflections, local shadows, and derivative-orientation effects; use cached curvature for AO.
- [x] 5.3 Replace derivative-angle orientation with `atan2(gradient.y, gradient.x)` and define stable behavior for near-zero gradients.
- [x] 5.4 Read distance/depth palette shifts, mappings, debug values, and adaptive-AA targets from `geometry.w`.
- [x] 5.5 Preserve `z.xy` consumers for smooth escape, orbit traps, Cartesian Escape Z mapping, and any related material behavior.
- [x] 5.6 Decode stripe phase/coherence from metadata and preserve circular phase interpolation, coherence interpolation, and their optional neighbor-gradient relief.
- [x] 5.7 Migrate magnified interpolation to the typed fields while preserving the current provenance reduction and coherent field selection.
- [x] 5.8 Migrate picking, debug views, statistics readback, and any capture/export path that reads resolved/frozen layers.

## 6. Legacy removal and documentation

- [x] 6.1 Remove the integer reference index and derivative angle from the display ABI while retaining any raw-only reference-resume state.
- [x] 6.2 Remove legacy eight-layer display textures, bindings, layer constants, shader helpers, and comparison flag after all consumers use the typed display set.
- [x] 6.3 Document the five-attachment ABI, terminal raw layout, metadata bit layout, geometry units, invalidation rules, and no-spatial-fallback boundary.
- [ ] 6.4 Reconcile the `progressive-render-pipeline` delta with the archived result of `simplify-progressive-renderer` before archiving this change.

## 7. Numerical, static, and GPU verification

- [x] 7.1 Add fixed-escape-branch numerical comparisons of both analytic gradient and Laplacian against finite differences and report branch-transition pixels separately.
- [x] 7.2 Add deterministic checks for height/gradient/curvature normalization across identity, known zoom ratios, optional rotation, and live/frozen merge selection.
- [x] 7.3 Quantify `rgba16float` gradient/curvature error and saturation against the f32 oracle on representative shallow and deep fields.
- [x] 7.4 Run focused WGSL/static validation and TypeScript/Vue type checking after removing the geometry-finalization pipeline.
- [x] 7.5 Exercise non-Playwright checks for terminal metadata round trips, cache invalidation, color-only reuse, picking consistency, and AA-target height reads.
- [ ] 7.6 With explicit user approval, compare orbit traps, escape mappings, stripe/coherence relief, AO, anisotropy, reflections, frozen zoom, and branch-transition visuals in a WebGPU browser.
- [ ] 7.7 With explicit user approval, time iteration, resolve, color-only animation, active convergence, and merge separately to distinguish the added derivative ALU from removed resolve/finalization work.
