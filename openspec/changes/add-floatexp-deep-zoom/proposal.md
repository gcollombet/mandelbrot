## Why

The perturbation renderer runs entirely in `f32` on the GPU. The per-pixel delta from the reference orbit, `dc = local·scale + (cx,cy)`, underflows `f32` once `scale` drops below the single-precision normal minimum (~`1.2e-38`). Below that wall `dc` rounds to zero, every pixel collapses to the same value, and the image freezes — a hard, abrupt loss of detail. The reference orbit and navigation are already arbitrary precision (`DBig` in the Rust worker, decimal strings on the host), so the limit is purely the `f32` exponent range of the deltas in the shader.

This change introduces an extended-exponent floating-point representation ("floatexp") for the perturbation deltas, removing the `1e-38` range wall. It is **Phase 1** of a larger deep-zoom effort: it restores correct deltas at depth but intentionally leaves the reference-orbit precision (`z_n` stored as `f32`) untouched. That second wall is a gradual quality degradation, not a hard freeze, and is deferred to a later phase (double-float `z_n` + depth-adaptive `DBig` precision) needed for clean ~`1e-3000` zooms.

## What Changes

- Add an extended-exponent type `fe { m: vec2<f32>, e: i32 }` in the shader: a normalized `f32` mantissa pair (one shared `i32` base-2 exponent per complex number) plus helpers built on the native WGSL `frexp`/`ldexp` builtins. This mirrors the existing `der = derM·exp(derS)` mantissa+scale pattern already used for the derivative.
- Decompose the `scale`, `cx`, and `cy` uniforms host-side (plain `f64` numbers at the uniform-build site) into `(mantissa: f32, exponent: i32)` via a host `frexp`; `cx`/`cy` share one exponent (complex `fe`). The two exponents are passed via the currently-unused `_padding` slots in the Mandelbrot uniform struct, and the mantissa slots fall back to the plain `f64→f32` values above the threshold so the shallow path is unchanged. Sourcing from `f64` caps Phase 1 at ~`1e-308`.
- Select the iteration path by a `scale` threshold of **~`1e-35`** (base-2 exponent `<= -116`), switching off f32 before its `dc`/`dz` precision degrades approaching the underflow wall:
  - **Above the threshold:** the existing `f32` + BLA path runs unchanged — it remains the fast path for the vast majority of views.
  - **Below the threshold:** a new `fe` variant of the exact (non-BLA) perturbation loop computes `dz`/`dc` in extended-exponent arithmetic. The reference orbit `z_n` is still read as `f32`.
- Keep distance-estimation shading continuous across the threshold by recomposing `log(scale) = log(m) + e·LN2` when `scale` is an `fe` value.

## Capabilities

### New Capabilities
- `floatexp-deep-zoom`: Extended-exponent perturbation deltas, threshold-based path selection between the existing `f32`+BLA path and a new exact `fe` deep path, host-side decomposition of `scale`/`cx`/`cy`, and distance-estimation continuity across the threshold.

## Impact

- `src/assets/mandelbrot.wgsl` — `fe` helpers (`fe_from_parts`, `fe_renorm`, `fe_cmul`, `fe_add3`, `fe_mag2`), `dc` built in `fe`, a new `fe` exact-perturbation block gated by the deep flag, DE `log(scale)` recompose.
- `src/Engine.ts` — decompose `scale`/`cx`/`cy` strings into `(mantissa, exponent)`; write the exponent into the Mandelbrot uniform; derive and pass the `deep` flag from the threshold.
- `reference_calculus/src/lib.rs` — Phase 1 only ensures `DBig` carries enough significant digits for the targeted depth band. Depth-adaptive precision and the hardcoded `f32::MIN_POSITIVE` reference-rebasing floor (`lib.rs:460`) are **out of scope** here.

## Non-Goals (Phase 1)

- Double-float (`hi`+`lo`) storage of the reference orbit `z_n`. The `f32` reference-orbit precision wall stays; deferred to Phase 2.
- BLA in the deep regime. Below the threshold the deep path is exact perturbation only (correct but slower); a future phase ports BLA coefficients and radii to `fe`.
- Depth-adaptive `DBig` precision and removing the `f32::MIN_POSITIVE` floor in `lib.rs`. Phase 2.
- Reaching below ~`1e-308`. The host `scale`/`dx`/`dy` are `f64` at the uniform-build site, so Phase 1 is capped at the `f64` range. Going deeper needs a string/`DBig`-sourced host scale, coupled with Phase 2.
- Orbit-direction metric (`avgDirection`, layer 7) on the deep path — that layer is repurposed to carry the `fe` exponent of the in-progress `dz`, so direction-coherence coloring is unavailable on the deep path.
- Reaching visually clean `1e-3000`. That is the multi-phase objective; Phase 1 only removes the hard `1e-38` range wall.
