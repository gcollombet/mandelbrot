# Design — compensate-ders

## Context

The derivative state in both production shaders is `der = derM · exp(derS)`:
`derM` a Cartesian f32 mantissa pair kept in `[1e-8, 1e8]` by `der_renormalize`
(every ~25 iterations), `derS` a plain f32 log scale. Every renorm does
`derS += 0.5·log(mm)` (increment ∈ [−18.4, 18.4]); every deep block application
does `derS += f32(e)·LN2` (increment can be hundreds for long blocks); the
`der_refresh_cache` rebase folds `derS < −40` back into the mantissa. At deep
zoom `derS` reaches ~161 (1e-70), where 1 ULP ≈ 1.5e-5; a progressive pass of
several thousand iterations accumulates ~100+ renorm roundings → ~1.5e-3
absolute drift, which the DE amplifies ~24× to the screen. Measured context
(session instrumentation): the reference orbit is NOT the binding limit for DE
noise (f32-stored reference is bit-identical across DBig budgets); the binding
error sources are derS accumulation (this change) and the per-pass polar
round-trip (the separate all-compute/Cartesian change).

## Goals / Non-Goals

**Goals:**
- Eliminate intra-pass `derS` accumulation drift with a register-only
  compensated sum — zero storage change, zero new bindings, zero mode logic.
- Cover EVERY `derS` update site in both shaders identically.
- Quantify the gain with a CPU harness before any GPU measurement.

**Non-Goals:**
- The per-pass polar round-trip error and its non-determinism (separate change:
  `all-compute-der-cartesian`).
- Storing `lo` across passes (needs the 9/10-layer refactor; residual from
  dropping it is ≤ ½ ULP per pass, below the polar error it coexists with).
- `derM` phase precision (relief angle) — direction is untouched here.
- The debug shader (carries no derivative state).

## Decisions

### D1 — Branchless two-sum, not Fast2Sum

`derS_hi + x` uses Knuth's TwoSum (6 flops, branchless — GPU-friendly):
`s = a+b; bv = s−a; err = (a−(s−bv)) + (b−bv)`. Fast2Sum (3 flops) requires
`|a| ≥ |b|`, which fails early in a pixel's life (derS starts at 0, increments
up to ±18.4) and for long-block applies (`e·LN2` arbitrarily larger than derS).
Cost is per-renorm/per-apply (~1/25 iterations), not per-iteration — noise.

### D2 — Site coverage: every `derS +=`, reads use hi+lo folded once

Update sites (×2 shaders): `der_renormalize` (`+= lm`), deep affine
(`+= ab_exp·LN2`), deep Padé (`+= aOverM2.e·LN2`), jet and mobius der-fold else
branches (`+= pdz.e·LN2`). Reads (`der_refresh_cache`'s `exp(−derS)` /
`epsThreshold`, `der_to_polar`'s `s + 0.5·log(mm)`) evaluate `derS_hi + derS_lo`
(one add) so caches and outputs see the compensated value. The (#3) fast path
(`ldexp` fold into the mantissa when `|pdz.e| ≤ JET_DER_EXP_FOLD`) does not
touch derS at all — unchanged, still compensation-free by construction.

### D3 — `lo` is register-only; dropped at pass boundaries

Layers 4/5 keep the polar format; `der_to_polar` stores `hi + lo` collapsed to
one f32. Residual: ≤ ½ ULP per pass boundary (~7.6e-6 at derS≈161), a
random-walk across K passes — an order below both today's polar transcendental
error and the intra-pass drift this change removes. If it ever shows after the
Cartesian refactor, that refactor's layer budget makes a `derS_lo` layer a
20-line follow-up (recorded there, not here).

### D4 — Rebase resets lo

`der_refresh_cache`'s `derS < −40` branch folds `exp(hi + lo)` into `derM` and
resets `(hi, lo) = (0, 0)`. Rare (interior-pixel contraction), ≤ 1 ULP per
occurrence, accepted.

### D5 — CPU quantification harness gates the shader edit

A Rust test simulates the exact f32 chain (renorm increments drawn from a real
deep-pixel trace shape: N up to 1e5, increments in [−18.4, 18.4], derS drifting
to ~161) naive vs compensated vs f64 ground truth, and asserts the compensated
absolute error stays ≤ a few ULP while quantifying the naive drift. This is the
measurable referee — GPU DE quality itself is user-verified (WebGPU headless
renders fallback only).

## Risks / Trade-offs

- [WGSL compilers may contract/reassociate the two-sum, destroying `err`] →
  WGSL forbids reassociation of explicit float expressions; naga/Tint honor
  IEEE-754 evaluation order for these ops. Verified by naga validation; if a
  backend misbehaved, the symptom is silent (err ≈ 0 → back to naive) — the CPU
  harness documents the expected magnitude so a field A/B can detect it.
- [Register pressure: +1 f32 (lo) threaded through hot loops ×2 shaders] →
  negligible next to the existing der state; no occupancy cliff expected. Field
  timing check included.
- [Signature churn: `derS` pointer params gain a `lo` sibling] → mechanical;
  contained to der helpers + block-apply signatures already touched by the
  mobius change.

## Migration Plan

Additive precision fix; no format or protocol change; single PR-sized change.
Rollback = revert (storage untouched, so mixing old/new frames is harmless).

## Open Questions

- None blocking. Field A/B (DE stability at 1e-50..1e-70) decides whether the
  remaining visible noise is the polar round-trip (expected) — that verdict
  feeds the `all-compute-der-cartesian` change, not this one.
