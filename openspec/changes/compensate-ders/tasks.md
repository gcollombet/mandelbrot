# Tasks — compensate-ders

## 1. Quantification harness (gates the shader edit)

- [x] 1.1 Rust instrumentation test: simulate the f32 derS chain (renorm
      increments in [−18.4, 18.4] + block exponent folds, N up to 1e5, derS
      drifting to ~160) naive vs two-sum-compensated vs f64 ground truth; print
      the drift table and assert compensated error ≤ a few ULP. This is the
      GPU-free referee for the whole change.

## 2. Shader implementation (×2 production shaders)

- [x] 2.1 `mandelbrot.wgsl`: two-sum helper; derS state becomes (hi, lo) —
      thread through `der_renormalize`, `der_refresh_cache` (reads fold hi+lo;
      the derS<−40 rebase resets lo), deep affine + Padé folds, jet and mobius
      else-branch folds; `der_to_polar` stores hi+lo collapsed.
- [x] 2.2 `mandelbrot_brush.wgsl`: identical treatment (same sites).
- [x] 2.3 naga ×2 + `vite build` green; confirm `mandelbrot_debug.wgsl` needs
      no change (no derivative state).

## 3. Validation + close-out

- [x] 3.1 Playwright: existing mode/parity specs stay green (color output
      unchanged); note any timing shift in the spec logs.
      → jet-mode/jet-deep/jet-debug-view/mobius-mode/mobius-deep green with the
      compensated shaders (jet ×2 runs); converge 2029–2046 ms vs ~2033 ms
      baseline, realized skips unchanged — no timing shift. Pre-existing
      failures unrelated to this change (identical without the shader edits):
      inplace-compute, 7 navigation UI specs, visual palette preview.
- [ ] 3.2 Field check (user GPU): DE stability at 1e-50..1e-70 before/after;
      record the verdict in design.md — the residual noise expected to remain
      is the per-pass polar round-trip, which is the `all-compute-der-cartesian`
      change's territory.
