## Context

Deep-zoom rendering uses perturbation theory: instead of iterating each pixel's `c` directly, the renderer iterates a single high-precision reference orbit `z_n` (computed in the Rust worker with `DBig`) and, per pixel, a small delta `dz` driven by `dc` (the pixel's offset from the reference center). The recurrence is `dz' = 2·z_n·dz + dz² + dc`.

The reference orbit and the navigation state (`scale`, `cx`, `cy`) are already arbitrary precision — passed as decimal strings to the host and as `DBig` to the worker. Everything inside the GPU shader (`src/assets/mandelbrot.wgsl`), however, runs in `f32`. The per-pixel `dc = local·scale + (cx,cy)` therefore underflows once `scale < ~1.2e-38`, freezing the image. GPUs typically flush `f32` denormals to zero, so the practical wall is the `f32` normal minimum, not the denormal floor.

Two important facts shape this design:
1. The reference orbit value `z_n` is `O(1)` — `f32` holds its *magnitude* fine. The wall is the *range* of the tiny deltas, not the magnitude of `z_n`.
2. The shader already carries the derivative as `der = derM·exp(derS)` — a Cartesian `f32` mantissa with a separate scale, renormalized lazily. The floatexp delta representation is the same idea applied to `dz`/`dc`, using an integer base-2 exponent instead of a continuous log scale.

## Goals / Non-Goals

**Goals:**
- Remove the hard `f32` range wall at `~1e-38` for the perturbation deltas.
- Keep the existing fast `f32` + BLA path byte-for-byte unchanged above the depth threshold.
- Validate the `fe{m,e}` mechanics end-to-end (host decomposition → uniform → shader arithmetic → DE continuity) as the foundation for later phases.

**Non-Goals:**
- Reference-orbit precision (`z_n` stays `f32`); BLA in the deep regime; depth-adaptive `DBig`; clean `1e-3000`. All deferred (see proposal Non-Goals).

## Decisions

### D1 — Representation: `fe { m: vec2<f32>, e: i32 }`, one exponent per complex

A complex delta is a `vec2<f32>` mantissa with a single shared `i32` base-2 exponent, normalized so `max(|m.x|, |m.y|) ∈ [0.5, 1)` (the natural `frexp` output range). Sharing one exponent across the real/imaginary pair halves the bookkeeping and mirrors the existing derivative state (`derM: vec2<f32>` with a single `derS`).

The `i32` exponent gives a range of `2^±2.1e9 ≈ 1e±6.5e8` — far beyond any reachable zoom, so range is effectively unbounded for Phase 1's purposes.

Renormalization uses the native WGSL builtins `frexp` / `ldexp`, which are **exact** (pure exponent/mantissa manipulation, no rounding from a transcendental). This is strictly better than the derivative path's `exp`/`log` rescale.

Alternative considered: reuse the derivative's continuous `exp(scale)` form. Rejected — `frexp`/`ldexp` are exact and cheaper than `exp`/`log`, and an integer exponent makes the `log(scale)` recompose for DE trivial (`e·LN2`).

Alternative considered: a single shared per-pixel scale factor for both `dz` and `dc` ("scaled double" rescaling). Rejected for Phase 1 — `dz` and `dc` can sit at very different exponents (especially early in the orbit and after rebasing), so independent exponents are simpler to reason about and avoid a shared-scale tracking heuristic. May revisit for performance later.

### D2 — Arithmetic

The iteration `dz' = 2·z_n·dz + dz² + dc` becomes, with `z_n` an `O(1)` `f32` value read from the orbit table:

```
t1 = 2·cmul(z_n, dz.m)     exp = dz.e        // z_n is O(1) f32, no fe needed for it
t2 = cmul(dz.m, dz.m)      exp = 2·dz.e      // |t2| ≪ |t1| in deep zoom
t3 = dc.m                  exp = dc.e
dz' = fe_add3(t1, t2, t3)                    // align to max exp, ldexp-shift, add, frexp-renorm
```

`fe_add3` aligns the three terms to the largest exponent, shifts the smaller mantissas with `ldexp`, sums, then renormalizes with `frexp`. When a term's exponent is more than ~24 below the max it is below the mantissa's least significant bit and is dropped (so `dz²` is skipped most of the time at depth).

Magnitude comparisons (escape `|z|² > muLimit`, interior `|der|² < epsilon`) are done by comparing `fe_mag2` against the threshold, or by comparing exponents directly to avoid materializing an underflowing `f32`.

Helper surface (minimal): `fe_from_parts(m, e)`, `fe_renorm`, `fe_cmul`, `fe_scale_f32` (multiply mantissa by an `O(1)` `f32`), `fe_add` / `fe_add3`, `fe_mag2`, `fe_to_f32` (for values known to be in range, e.g. after rebasing).

**Zero invariant (critical).** A zero `fe` must carry a sentinel exponent far below any real scale exponent (`FE_ZERO_E = -1000000`), not `0`. `fe_add` aligns to the larger exponent and drops a term more than ~24 below it; if zero had exponent `0` it would look like the *largest* operand and swallow everything. A fresh pixel starts at `dz = 0`, and the first step is `dz' = 2·z_n·dz + dz² + dc = 0 + 0 + dc`; with a `0`-exponent zero, `fe_add` drops `dc`, so `dz` stays `0` forever — the perturbation never starts, every pixel just follows the reference orbit, and the image goes uniform/black. The very-negative sentinel makes zero the smallest operand so `dc` survives and `dz` grows from `dc` as intended.

### D3 — Threshold-gated path selection at `scale ≈ 1e-35`

The deep decision is taken from the **scale exponent** so host and shader agree exactly with no extra uniform: `deep = expScale <= -116` (since `scale = mantissa·2^expScale` with `mantissa ∈ [0.5,1)`, this is `scale ≲ 1.2e-35`). The shader branches on the `expScale` it receives in a padding slot; the host computes the same test to disable BLA.

- `deep == false`: the existing `useBla` / non-BLA `f32` loops run **unchanged** (they read the plain `scale`/`cx`/`cy` written into the normal slots).
- `deep == true`: a new `fe` variant of the **exact** (non-BLA) loop runs, and the host forces `blaLevelCount = 0` / `approximationMode = 0`. BLA is not used here because its `b·dc` term and radius comparisons are `f32` and break approaching the underflow wall.

The deep path is a third iteration loop alongside the existing BLA and non-BLA `f32` loops. This duplicates loop structure (a known maintainability cost — three near-identical loops), accepted for Phase 1 to keep the fast path untouched and the `fe` path isolated and reviewable. A gate-by-uniform single loop would add per-iteration branching to the hot `f32` path; rejected.

The threshold switches to `fe` before `f32`'s `dc`/`dz` precision degrades approaching the wall, rather than waiting for the hard `~1e-38` underflow. The `fe` regime is exact but BLA-less, so it is slower per pixel; making the deep regime itself fast is the BLA-in-`fe` follow-up (see Risks).

### D4 — Host-side decomposition and the f64 reach cap

At the uniform-build site the perturbation parameters are already plain `f64` numbers: `Engine.Mandelbrot` carries `dx`/`dy` (the reference-relative center offset) and `scale` as `number`. They are decomposed with a host `frexp` into `(mantissa, exponent)` such that `value = mantissa · 2^exponent` with `|mantissa| ∈ [0.5, 1)`, and the mantissa is rounded to `f32` (`Math.fround`) since the GPU only keeps `f32`. The exponent is exact.

This means **Phase 1 reaches the f64 range (~`1e-308`)** — a ~270-order-of-magnitude jump from the `1e-38` `f32` wall, and exactly the "floatexp seul → ~`1e-300`" band. Pushing below `1e-308` requires a higher-precision *host* scale (sourced from the `DBig`/string path, which exists in the Rust worker but is converted to `f64` before this point). That is coupled with the other deep-precision work and **deferred to Phase 2** — beyond `1e-308` you simultaneously need string-sourced scale, `z_n` double-float, and depth-adaptive `DBig`; they all bite around the same depth.

`cx`/`cy` are combined host-side into one complex `fe` with a **single shared exponent** (`mantissa = (cx, cy) / 2^E_c`, `E_c = max(exp_cx, exp_cy)`); since the reference reset keeps `|center − reference| < 20·scale`, both components are the same order as `scale`, so the shared exponent loses no meaningful precision. `scale` is a scalar `(mantissaScale, expScale)`. Slots `cx`/`cy`/`scale` carry the mantissas when deep and the plain `f64→f32` values when shallow (so the shallow path reads them unchanged); the two exponents `E_c` and `expScale` occupy two of the `_padding` slots, written on every frame so the shader's deep test is always valid. No struct size change.

### D5 — Distance-estimation continuity

`distance_height` already uses `log(max(scale, 1e-30))`. With `scale` as `fe`, this becomes `log(mantissa) + exponent·LN2`, valid at any depth. The shallow path keeps using the plain `f32` `scale`. Both must agree at the threshold so shading does not visibly jump when crossing it.

### D6 — Deep-path resume storage (fe mantissa in layers 2/3 + exponent in layer 7)

Progressive rendering computes each pixel in batches across GPU passes (and across frames while the reference orbit is built), parking in-progress state in the 8-layer texture and reloading it to resume. In-progress pixels currently store `dz` in layers 2/3 as plain `f32`, which underflows in deep zoom.

The chosen approach stores `dz` **range-safely by separating its exponent** (the same idea that already keeps `der` alive across passes). Crucially, the consumers (`color`/`resolve`/`brush`) detect "escaped vs in-progress" by reading layers 2/3 and testing `|·|² < mu` (`escape_nu`). So rather than literal polar `(angle, log|dz|)` — whose `log|dz|²` is huge and would break that test and force `color` changes — the deep path stores:

- **Layers 2/3:** the fe **mantissa** `dz.m` (already normalized to `|dz.m|² < 2 < mu`, so the existing `escape_nu`/continuation test keeps working unchanged, and the value is a faithful O(1) stand-in for `z` mid-iterate).
- **Layer 7:** the shared fe **exponent** `dz.e` (one `i32`). On resume, `dz = renorm(fe{ m: load(2,3), e: i32(load(7)) })`.
- **Layers 4/5 (`der`):** unchanged — already stored as `(angle, log|der|)`, which is range-safe, so the derivative survives deep zoom with no work.

Consequence: layer 7 currently carries the **orbit-direction metric** (`avgDirection`), so that metric is **sacrificed on the deep path** (no direction-coherence coloring in the `fe` regime). Escaped/inside deep pixels write a neutral `avgDirection`; in-progress deep pixels write `dz.e` there, and `color` returns early for non-escaped pixels before reading layer 7, so this never reaches the palette. This keeps `color`/`resolve`/`brush` **completely untouched**.

Because `z = z_n + dz` and `dz` is sub-`f32` for most of the deep orbit, `z` is reconstructed as `z_n + fe_to_f32(dz)` (which yields `z ≈ z_n` while `dz` is tiny, and the exact sum once `dz` grows to O(1), e.g. after a rebase) — correct in both regimes. The `der` recurrence uses `zPrev ≈ z_n` (an O(1) `f32`), so it needs no `fe` arithmetic.

## Risks / Open Questions

- **Performance at depth:** without BLA the deep path iterates exactly, so frame times grow with iteration count. Acceptable for Phase 1 (correctness first); BLA-in-`fe` is the follow-up that restores speed.
- **Threshold seam:** DE and coloring must match within rounding at the threshold. Mitigation: compute DE from `fe`-recomposed `log(scale)` on both sides near the seam, or verify visual continuity by stepping scale across the threshold.
- **`z_n` precision is unchanged:** the deep path is *correct in range* but still carries the `f32` `z_n` quality limit, so very deep views will look soft/banded before Phase 2. This is expected and documented, not a regression of Phase 1.
- **Decomposition source of truth:** confirming the exact path to extract a base-2 exponent from the `DBig`/string scale without an intermediate `f64` underflow is the main host-side unknown.
