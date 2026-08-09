## Why

Super Pixel and dyadic spatial refinement add a second convergence strategy, feedback state, diagnostics, and several milliseconds of frame cost while competing with the adaptive temporal iteration batches. A step-1 seed plus the existing bilinear resolve for temporarily incomplete orbits can provide a simpler progressive renderer without removing the separate, on-demand adaptive AA path.

## What Changes

- **BREAKING** Remove the Super Pixel/Taylor terminal-fill feature, its controls, resolved markers, feedback loop, counters, and dedicated debug classifications.
- **BREAKING** Remove dyadic sentinel seeding/refinement and always seed the raw grid at step 1 so every texel is an exact compute request.
- Retain temporal convergence through adaptive iteration batches and retain bilinear resolve as a temporary display fallback for budget-exhausted/incomplete orbits.
- Replace the slow additive batch ramp and batch-1 full-frame resets with a persistent EMA of actual weighted iteration work, a fixed 10 ms minimum requested iteration budget, and immediate density-aware batch prediction.
- Keep manual zoom kinematics at f64 precision and reserve arbitrary precision for the view scale, avoiding a depth-dependent transcendental on the main thread.
- Retain live/frozen reprojection and the distinct idle/on-demand adaptive AA path, including analytic AA where applicable.
- Simplify unfinished-work accounting and remove spatial-refinement-only state from the engine and shaders.
- **BREAKING** Remove the user-facing zoom brush step and sentinel seed step settings and their persisted values.
- Remove the optional `shader-f16` arithmetic variant and its query override; use one f32 shader-arithmetic path. This does not prohibit 16-bit texture storage formats.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `progressive-render-pipeline`: Replace dyadic spatial refinement and Super Pixel terminal coverage with step-1 exact seeding, adaptive temporal batches, and temporary bilinear resolution of incomplete pixels.
- `performance-settings`: Remove the two spatial-refinement step controls and their persistence contract.

## Impact

- Affects progressive scheduling and resource setup in `src/Engine.ts`, raw/resolve/merge/color WGSL contracts, Super Pixel controls and debug views, performance-setting persistence, and related documentation/tests.
- Preserves the Rust/WASM reference calculus, palette/material behavior, navigation reprojection, and the independent adaptive AA feature while optimizing the dimensionless manual-zoom controller.
- Requires focused GPU timing and visual comparison before declaring a performance win; static/build validation alone will only establish structural correctness.
