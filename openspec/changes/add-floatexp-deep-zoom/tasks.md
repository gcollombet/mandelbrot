## 1. Host-Side Decomposition And Uniform Plumbing

- [x] 1.1 Add a host `frexp` helper that decomposes an `f64` (`scale`/`dx`/`dy`) into `{ mantissa, exponent }` with `|mantissa| ∈ [0.5, 1)` and `mantissa` rounded to `f32`; handle `0` and `f64` subnormals.
- [x] 1.2 When deep, write the `scale` mantissa and combined `cx`/`cy` mantissas (shared exponent) into the existing `scale`/`cx`/`cy` slots; when shallow, keep the plain `f64→f32` values there. Always write `expScale` and `E_c` into two `_padding` slots.
- [x] 1.3 Derive `deep = expScale <= -116` on the host (~`1e-35`, switching off f32 before its precision degrades near the wall); when deep, force `blaLevelCount = 0` / `approximationMode = 0`. The shader derives the same `deep` from the `expScale` padding slot (no extra flag).
- [x] 1.4 Unit-test the decomposition: round-trip `mantissa·2^exponent` reconstructs the value (to `f32` mantissa precision) for shallow and deep-within-`f64` inputs down to ~`1e-308`, plus `0`.

## 2. Shader `fe` Arithmetic Helpers

- [x] 2.1 Define `fe { m: vec2<f32>, e: i32 }` and `fe_from_parts` / `fe_renorm` using `frexp`/`ldexp`, normalized to `max(|m.x|,|m.y|) ∈ [0.5,1)`.
- [x] 2.2 Implement `fe_cmul`, `fe_scale_f32` (mantissa × `O(1)` f32), `fe_add` / `fe_add3` (align to max exponent, `ldexp`-shift, add, renorm; drop terms ≥ ~24 exponents below max).
- [x] 2.3 Implement `fe_mag2` and comparison helpers for escape/interior tests that avoid materializing an underflowing `f32`.
- [x] 2.4 Implement `fe_to_f32` for values known to be in range (e.g. after rebasing).

## 3. Deep Perturbation Path

- [x] 3.1 Build `dc` in `fe` from `local·scale_fe + (cx_fe, cy_fe)`.
- [x] 3.2 Add a new `fe` variant of the exact (non-BLA) perturbation loop: `dz' = 2·z_n·dz + dz² + dc` with `z_n` read as `f32`, `dz`/`dc` in `fe`.
- [x] 3.3 Gate the new loop behind the `deep` flag; leave the existing `f32` BLA and non-BLA loops unchanged above the threshold.
- [x] 3.4 Handle rebasing (`dz = z; ref_i = 0`) as an `fe` renormalization point; reconstruct `z = z_n + fe_to_f32(dz)` each step.
- [x] 3.5 Carry the derivative state correctly alongside the `fe` `dz` (reuse the existing `derM`/`derS` machinery and its polar layers 4/5 — escape height / interior detection still work).
- [x] 3.6 Resume storage: store in-progress `dz` as its `fe` mantissa in layers 2/3 (keeps `|·|²<mu` detection valid) and its `fe` exponent in layer 7; reconstruct on resume. Escaped/inside deep pixels store `z` in 2/3 as today.
- [x] 3.7 On the deep path, skip orbit-direction-metric tracking (layer 7 is repurposed for the `dz` exponent); confirm `color`/`resolve`/`brush` need no changes.

## 4. Distance-Estimation Continuity

- [x] 4.1 Recompose `log(scale) = log(mantissa) + exponent·LN2` in `distance_height` for the deep path.
- [x] 4.2 Verify shading does not visibly jump when `scale` crosses the deep threshold (by construction: `distance_height_deep` recomposes `log(mantissa) + scaleExp·LN2 = log(scale)`, identical to the shallow `log(scale)` at the seam; final visual confirmation rides along with 6.1).

## 5. Reference Worker Precision (Phase-1 minimum)

- [x] 5.1 Confirm `DBig` carries enough significant digits for the targeted Phase-1 depth band; bump precision if the reference orbit degrades before the intended depth. (Depth-adaptive precision and the `f32::MIN_POSITIVE` floor at `lib.rs:460` remain out of scope.)

## 6. Verification

- [ ] 6.1 Confirm imagery past `1e-38` is no longer frozen: deltas resolve and detail continues below the old wall. (Pending a WebGPU browser session — the headless preview only renders the fallback, so visual confirmation needs a manual run.)
- [x] 6.2 Confirm the shallow path output is unchanged above the threshold (by construction: above the threshold the host writes plain values and both shaders run the original f32 path verbatim).
- [x] 6.3 Document the expected `z_n`-precision softening at extreme depth as known/deferred to Phase 2.
