# Design — Fixed reference precision budget with descending profile

> Design-capture for the precision/reference-management fix. The math here (D1–D3) is the
> load-bearing part; the plumbing (D4–D6) is conventional. No code lands with this artifact.

## Context

Two precision notions were conflated in the original bug report and must stay separate:

```
(1) Precision of the reference CENTRE   reference_cx/cy (DBig)  ≈ −log2(scale) bits
(2) Precision of the reference ORBIT     running z_n (DBig)      ← this is what breaks
```

`precision_bits_for_scale` + `ensure_precision` already handle (1). The bug is in (2): the
orbit is grown incrementally and its early steps keep the precision in force when they were
first computed (a shallow zoom), because:

- `result`/`last_iter`/`last_zx`/`last_zy` are not reset when required precision rises (only
  on centre drift `> 20·scale`, `lib.rs:773` — not triggered by a pure zoom), and
- `last_zx`/`last_zy` are absent from the `ensure_precision` raise-list (`lib.rs:246-255`).

"Breaks during zoom, correct after reload" is the signature: reload builds a fresh navigator
at the deep scale, so the whole orbit is at full precision.

## D1 — Why early iterations dominate (error analysis)

Reference orbit error `E_{n+1} = 2·Z_n·E_n + η_{n+1}`, with per-step rounding `η_k ~ 2^{−p}`
at working precision `p`. Solving:

```
E_N = Σ_k η_k · D(k→N)          D(k→N) = ∏_{j>k} 2·Z_j = dZ_N/dZ_k
```

What matters is `E_N` relative to a pixel's useful perturbation `δ_N ≈ |dZ_N/dC|·scale`.
The ratio collapses to:

```
 E_N        2^{−p}        1                       1
 ───  ≈   ───────── · Σ ───────       D₀ₖ = ───── = |dZ_k/dC|
 δ_N        scale     k   D₀ₖ                dZ_k
```

`Σ 1/|dZ_k/dC|` is **dominated by small k** (early, where the derivative ≈ 1; later the
derivative explodes and `1/derivative → 0`). Two consequences:

1. **Early iterations dominate the error.** Low precision early (the current bug) is the worst
   possible failure mode — confirms the symptom.
2. **Per-step requirement:** `p_k > −log₂(scale) − log₂|dZ_k/dC| + guard`. Since `|dZ_k/dC|`
   grows, the **needed precision decreases with k** — the opposite of "increase precision with
   iterations".

## D2 — The descending precision profile (safe function)

Budget `P = −log₂(target_scale) + guard` (guard ≈ 16–32 bits to absorb the linear `η_k`
accumulation). Per-step precision:

```
   p(n) = clamp( P − ⌊G_n − margin⌋ ,  floor ,  P )
   G_n  = log₂|dZ_n/dC|        (≥ 0, = 0 at the start, grows with amplification)
```

Carry the derivative via its **true recurrence** (not the product `Σ log₂|2Z_j|`, which
overestimates `|der|` at minibrot returns where cancellation occurs and would shed too many
bits):

```
   der₀ = 0
   der_{n+1} = 2·Z_n·der_n + 1        in floatexp (f64 + extended exponent)
   G_n = log₂|der_n|
```

Safe by construction: bits are shed only after the orbit has demonstrably amplified them, and
`G_n` drops back down near returns → precision rises automatically where it must.

**Invariant — `C` always stays at full budget precision `P`.** The descending profile governs
only the *working precision of the orbit iteration* `z_n`. The reference centre
`C = reference_cx/cy` (and `cx/cy`, and the per-pixel offset `dc = c_pixel − C`) MUST always
be carried at the full budget precision `P` — it is the anchor that defines *where* the view
is, and `dc` spans the full zoom depth. Reducing `C`'s precision alongside the profile would
discard the deep digits that locate the view. In `z_{n+1} = z_n² + C`, adding the full-`P` `C`
to a reduced-precision `z_n` correctly rounds the sum to `p(n)`: the deep digits of `C` below
`P − G_n` are legitimately irrelevant *at that step* (that is exactly what the profile
encodes), but `C` itself is never stored at less than `P`.

**Floor.** The orbit is stored f32 (~24 bits), so computing `z_n` in DBig beyond what is
needed to correctly round the stored f32 is wasted. Once `G_n ≳ P − 30` the step is at floor;
`floor ≈ 53–64 bits` is ample. Therefore **only the first ~`P` iterations cost DBig-deep**;
the rest run near machine precision:

```
 precision
   P ─┤█▖
      │██▚▖           slope = −G_n (≈ orbit Lyapunov rate, ~1 bit/iter typical)
      │████▝▚▖
  64 ─┤████████▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  floor — most of the orbit
      └──┬──────────────┬─────────► n
        ~P iterations    near-free
```

## D3 — Pure-`n` fast-path (optional)

If the derivative is not carried, approximate `G_n ≈ λ·(n−1)` (exponential derivative growth
at average Lyapunov rate `λ`, rule-of-thumb `λ ≈ 1 bit/iter` for boundary orbits):

```
   p(n) = max( floor ,  P − ⌈λ·(n−1)⌉ )      (LINEAR in n)
```

**Safety:** valid only if `λ` **under**estimates the true rate (shed slower than earned).
Slow-amplification orbits (parabolic regions, high-period minibrot cores) have small local
`λ`; a too-large constant would over-shed. Recommended hybrid:
`p(n) = clamp(P − min(λ·(n−1), G_n_measured), floor, P)` — fast-path estimate, bounded by the
measured derivative when a guarantee is wanted. **D2 (measured `der`) is the recommended
default;** D3 is an optimization knob.

## D4 — Budget lifecycle (fixed, recompute-on-change)

```
 set budget (target scale, default 1e-30)
        │  change ⇒ FULL reference recompute (assumed design choice)
        ▼
 P = −log2(target) + guard       fixed for the session/preset
        ▼
 orbit built once at profile D2, APPEND-ONLY in n
        │
        ├─ zoom in  (≤ target)   → extend iterations at fixed profile, no recompute
        ├─ zoom out              → reuse as-is (monotonic: deep orbit serves shallow views)
        ├─ zoom PAST target      → assumed degradation until user raises budget (no clamp)
        └─ pan (drift > 20·scale)→ recenter = recompute (distinct, pre-existing trigger)
```

Monotonicity guarantee: an orbit built for `target` is sufficient for every shallower view at
the same centre, so no precision-driven recompute occurs while the budget holds.

**Persistence.** The budget is part of preset state (a preset implies its max depth). Loading
a preset restores the budget; the dive then runs recompute-free.

**Corollary — minibrot search runs at full `P`.** Period detection and Newton nucleus
refinement (`detect_period_ball`, `newton_nucleus`, `choose_reference_near_view`,
`find_minibrot`) *produce* a candidate centre `C`. They are the source of the anchor, so they
MUST carry the critical orbit and its derivative in DBig at the full budget precision `P` — not
at the live-view-scale precision (the previous `ensure_precision(precision_bits_for_scale(scale))`
behaviour), and never at the reduced descending profile (which applies only to the rendered
reference orbit `z_n`). With the budget driving `ensure_precision`, the navigation state these
routines read is already at `P`; the requirement is to keep their internal iterations at `P`
too, so a minibrot found at a shallow live scale is still located to full budget depth.

## D5 — Reference iteration headroom (`maxIter × 2`)

Compute the reference to `2 × maxIter`, not `maxIter`. Interactive zoom-in raises `maxIter`;
without headroom the shader's `guardedMaxIter = min(maxIter, availableIter)` (`Engine.ts`)
starves and the view goes transiently black while the worker catches up. A 2× margin absorbs
typical interactive zoom steps. The `chunked` compute loop already bounds per-tick work, so
the extra steps stay responsive.

## D6 — `max_bla_skip` clamp `2²⁰ → 2¹⁸`

Lower the upper clamp (`lib.rs:213`). Longest block `L ≤ 2¹⁸` bounds the f32 reference-orbit
noise to `√L·1e-7 ≈ 5e-5`, ~×20 under the default `blaEpsilon = 1e-3`, keeping the f32 noise
(see Out-of-scope) masked. Minimal change; folds into this proposal rather than its own.

## Risks / open questions

- **Guard/margin sizing** (`P` guard, profile margin): start at +24/+16 bits; validate that a
  deep preset matches a fresh-reload render with no early-iteration divergence.
- **`der` cost:** carrying floatexp `der` per step is O(1) and reuses period-detection
  machinery; confirm it does not regress the orbit compute-loop throughput.
- **Profile granularity:** recompute `p(n)` every step vs every block of 64 — changing dashu
  working precision has a cost; a stepped profile may be cheaper than per-iteration.
- **Default `1e-30` ergonomics:** confirm a clear UX signal when the view crosses the budget
  (degradation is assumed, but the user must know to raise the parameter).

## Validation path

1. Repro harness: deep preset zoom that currently diverges, captured against its post-reload
   render (the known-good reference).
2. Implement fixed budget + D2 profile + append-only; assert the live deep render matches the
   reloaded render (no divergence) at several depths.
3. `maxIter × 2` headroom: assert no transient black frame on interactive zoom-in.
4. `2¹⁸` clamp + existing BLA/Padé tests stay green.
