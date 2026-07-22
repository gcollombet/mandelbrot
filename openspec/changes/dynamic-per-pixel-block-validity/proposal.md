## Why

Unified block-table radii and dispatch tags are currently derived from one viewport-wide `c_max`, so ordinary motion can trigger hundreds of milliseconds of bounds/radii work while pixels close to the reference still inherit the worst-case edge-of-view radius. This change moves the cheap, monotone part of validity evaluation to the GPU and makes reference-table construction incremental so navigation can keep using newly available blocks without repeated cold builds.

## What Changes

- Replace the single pre-solved radius and principal/secours tags with a compact, certified validity envelope that the shader evaluates from the pixel's actual `|dc|` and current `|dz|`.
- Select the cheapest valid affine, Padé, Möbius c+, or Jet evaluator at the largest applicable skip, instead of selecting tiers from a viewport-wide replay band.
- Keep coefficient composition and the expensive proof data static for the lifetime of a reference; retain an explicit certified `dc` envelope and fall back to exact perturbation outside it.
- Build the dyadic coefficient tree incrementally as orbit chunks arrive, adding only newly complete aligned blocks and preserving previously built levels.
- Derive compact value, derivative, pure-`c`, rational-pole, and Cauchy-tail constraints with conservative serialization suitable for WGSL evaluation in shallow and floatexp paths.
- Update the worker/GPU protocol to publish append-only coefficient ranges and atomically switch matching validity metadata without clearing a correct in-progress render.
- Add CPU soundness/referee tests, GPU parity tests, build-stage benchmarks, table-memory measurements, tier/skip counters, and navigation performance acceptance gates.
- Preserve exact perturbation as the mandatory fallback whenever a dynamic certificate, table range, or reference range is unavailable.

## Capabilities

### New Capabilities

- `dynamic-block-validity`: Certified per-pixel block validity and tier selection using compact static envelopes evaluated from the actual perturbation state.
- `incremental-reference-table-build`: Append-only construction, publication, and activation of dyadic block-table data as reference-orbit chunks become available.

### Modified Capabilities

None.

## Impact

- Rust/WASM numerical code in `reference_calculus/src/jet.rs`, `mobius.rs`, `unified.rs`, and `lib.rs` will gain envelope derivation, incremental merge state, conservative packing, and referee/benchmark coverage.
- `src/referenceWorker.ts` will schedule orbit work ahead of active-envelope publication and background table extension, with generation-safe cancellation.
- `src/Engine.ts` will accept incremental table ranges, manage GPU capacities/activation, and expose new build/runtime diagnostics.
- `src/assets/mandelbrot_brush.wgsl` will evaluate compact validity envelopes and select tiers dynamically in both shallow and deep paths.
- Unified coefficient/sidecar buffer layouts and internal worker messages will change; legacy exact and single-mode debug paths remain available as correctness baselines.
- No external dependency or user-data migration is expected.
