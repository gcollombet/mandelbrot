# Verification — add-floatexp-deep-zoom (Phase 1)

## Automated checks (all green)

- **WGSL validation** (`naga src/assets/mandelbrot.wgsl`, `naga src/assets/mandelbrot_brush.wgsl`): both shaders validate, including the new `fe` helpers, `mandelbrot_compute_deep`, and the deep branch in `fs_main` / the inplace compute entry.
- **TypeScript** (`vue-tsc --noEmit -p tsconfig.app.json`): clean (exit 0).
- **JS unit tests** (`vitest run tests/unit`): 48 passed, including `tests/unit/floatexp.test.ts` (decomposition round-trip, mantissa ∈ [0.5,1), powers of two, f64 subnormals, the deep-threshold boundary near the f32 wall). `presetDiscovery` unaffected.
- **Rust tests** (`cargo test --lib`): 11 passed, including the new `reference_orbit_preserves_precision_at_phase1_depth` — a high-digit center at scale `1e-300` retains >200 digits through the `DBig` reference-orbit recurrence (Task 5.1: reference precision is not the Phase-1 bottleneck; no precision bump needed).

## Bug caught in testing — perturbation never started

A first build rendered black at deep zoom. A CPU port of the `fe` arithmetic + deep loop (compared against an f64 perturbation) traced it to the **zero `fe` exponent**: zero was renormalized to exponent `0`, which made `fe_add` treat it as the largest operand and drop `dc`, so a fresh `dz = 0` stayed `0` forever and the perturbation never started (every pixel followed the reference orbit → uniform/black). Fixed by giving zero a sentinel exponent `FE_ZERO_E = -1000000` (far below any real scale exponent) so it is always the smaller operand and `dc` survives. The CPU port then shows `dz` growing from `dc` and tracking the f64 perturbation to `f32` precision. See design D2 "Zero invariant".

## By-construction arguments

- **Shallow path unchanged (6.2):** above the threshold the host writes the plain `f64→f32` `dx`/`dy`/`scale` into the usual slots, and both shaders take the original `x0 = local·scale + cx` / `mandelbrot_compute` path verbatim. The deep branch is gated by `scaleExp <= DEEP_EXP` (≈ `1e-35`) and the host disables BLA only when deep. No shallow code was modified.
- **Downstream passes untouched:** `color`/`resolve`/`brush` are unchanged. The deep path stores an O(1) value in layers 2/3 (escaped → `z`; in-progress → the normalized `fe` mantissa with `|m|² < 2 < mu`), so the existing `escape_nu` / `|·|²<mu` state detection stays valid. The in-progress `fe` exponent rides in layer 7 (orbit-direction metric, sacrificed on the deep path); `color` returns early for non-escaped pixels before reading layer 7, so it never reaches the palette.

## Pending (needs a WebGPU runtime)

- **6.1 — visual confirmation past `1e-38`.** The app requires WebGPU; the headless preview only renders the fallback, so "deltas resolve / image no longer freezes below the old wall" must be confirmed in a real browser session. Suggested manual check: zoom to ~`1e-50` and ~`1e-200`, confirm detail continues to resolve (vs. the pre-change frozen flat field), and that crossing the deep threshold (~`1e-35`) shows no DE/shading discontinuity.

## Known Phase-1 limitations (by design, deferred)

- Below ~`1e-308` the host `scale`/`dx`/`dy` are `f64` and underflow → deeper needs a string/`DBig`-sourced host scale (Phase 2).
- `z_n` stays `f32`, so very deep views soften/band before the range wall would matter — double-float `z_n` is Phase 2.
- Deep path is exact (no BLA) → slower at depth; BLA-in-`fe` is a later phase.
- Orbit-direction metric unavailable on the deep path (layer 7 repurposed for the `dz` exponent).
