# Proposal — compensate-ders

## Why

Distance-estimation shading exposes the ABSOLUTE error of the derivative's log
magnitude `derS` at full magnification: the DE is `log|der| + log(scale) + O(1)`
— two huge, nearly-cancelling terms — so an error δ on `derS` that is invisible
relative to `derS` itself (~168 at 1e-70) becomes δ·(depth/7) ≈ 24–33× amplified
on screen. Today `derS` is a plain f32 accumulator: every `der_renormalize`
(~every 25 iterations) and every block application adds ~1 ULP, and at deep zoom
a single progressive pass runs thousands of iterations → ~100+ ULP of drift
(~1.5e-3 absolute at derS≈161) → visible DE degradation on high-N pixels. This
is the cheapest of the identified levers (register-only, zero storage change)
and is deliverable independently of the all-compute/Cartesian refactor.

## What Changes

- `derS` becomes a compensated (hi, lo) pair in shader registers in both
  production iteration shaders (`mandelbrot.wgsl`, `mandelbrot_brush.wgsl`):
  every `derS += x` site goes through a branchless two-sum, killing the
  intra-pass accumulation drift.
- Storage format is UNCHANGED (polar (angle, log|der|) in layers 4/5; `lo` is
  dropped at pass boundaries — residual ≤ ½ ULP per pass, an order below the
  polar round-trip error this change does not address).
- A CPU instrumentation test (Rust) quantifies naive-vs-compensated drift over
  deep-zoom-scale renorm chains, as the GPU-free validation referee.
- No mode logic, no table formats, no TS plumbing, no visual behavior change
  besides more accurate DE at depth.

## Capabilities

### New Capabilities
- `derivative-accumulation`: compensated accumulation of the derivative log
  scale `derS` in the iteration shaders — update-site coverage, unchanged
  storage, bounded residual, and the quantification harness.

### Modified Capabilities
<!-- none — colors/iteration counts are unaffected; existing mode specs unchanged -->

## Impact

- `src/assets/mandelbrot.wgsl`, `src/assets/mandelbrot_brush.wgsl`: two-sum
  helper + (hi, lo) derS state threaded through `der_renormalize`,
  `der_refresh_cache`, and the block-apply derivative updates (BLA affine/Padé
  deep, jet, mobius). `mandelbrot_debug.wgsl` untouched (carries no derivative).
- `reference_calculus`: one new instrumentation test (no runtime code).
- Validation: naga ×2, vite build, existing Playwright specs unchanged, field
  check of DE stability at depth by the user.
