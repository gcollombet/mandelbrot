## Why

The reference orbit is computed **incrementally and at a precision that drifts with the
view**. `ensure_precision()` raises `cx/cy/scale/reference_cx/reference_cy` to
`precision_bits_for_scale(scale)` on every `origin()`/`scale()`
(`reference_calculus/src/lib.rs:244`), but:

1. The already-computed orbit (`result`, `last_iter`, `last_zx`, `last_zy`) is **never
   recomputed** when the required precision rises. The only reset is on centre drift
   `> 20·scale` (`lib.rs:773`), which a **pure zoom does not trigger**.
2. `last_zx`/`last_zy` (the running DBig orbit value the incremental loop resumes from) are
   **not** in the `ensure_precision()` list (`lib.rs:246-255`), so even newly-appended
   steps inherit the precision of the shallow zoom at which the orbit was first built.

Result: when you zoom into a preset, the **early orbit iterations stay frozen at low
precision** (the precision in force when they were first computed). The perturbation
reference is corrupted from iteration ~0, the calculation diverges from the start, and it is
**worst under BLA/Padé** — they chain block jumps off the reference, so an early-iteration
error compounds through the whole skip chain. A page reload builds a fresh navigator at the
deep scale, so the whole orbit is precise → the render is correct. This "breaks during zoom,
correct after reload" signature is the precise symptom of the stale incremental orbit.

The error analysis (see `design.md`) shows the precision **required** at orbit step `k` is
`P − log₂|dZ_k/dC|`: full precision is only needed for roughly the first `P` iterations,
after which the orbit has amplified past the deep digits of the centre and can run at a low
floor. The cost of "full precision from step 0" is therefore far smaller than it appears, as
long as it is **fixed up front and never recomputed** mid-zoom.

This change replaces the drifting per-view precision with a **fixed precision budget** chosen
ahead of time (a maximum zoom depth), computes the reference once at that budget with a
**descending per-iteration precision profile**, and only ever **appends** iterations — never
recomputes for precision reasons during interactive navigation.

## What Changes

- **Fixed max-depth precision budget.** A single parameter (a target scale, default `1e-30`)
  fixes the precision budget `P = −log₂(target) + guard` for the whole session/preset.
  Changing it triggers a **full reference recompute** — an assumed design choice, not a
  per-frame cost. The default `1e-30` keeps shallow/typical use fast; deep diving is an
  explicit opt-in by raising the budget.

- **Settings slider for the navigation precision budget.** The parameter is exposed in
  Settings as a slider over target scale, reaching down to `1e-1000` (≈ 3300 bits), so the
  user sets how deep navigation stays precise. Moving the slider is the explicit
  recompute-triggering action above.

- **Persisted per preset.** The budget is saved with each preset (a preset implies its target
  depth), so loading a preset restores its budget and the reference is built once, correctly,
  with **zero recomputes** during the dive.

- **Descending precision profile (safe).** The orbit is computed with per-step precision
  `p(n) = clamp(P − ⌊log₂|dZ_n/dC|⌋, floor, P)`, with `dZ_n/dC` carried in floatexp alongside
  the orbit (the same derivative already used by period detection). This is safe by
  construction — bits are only shed once the orbit has demonstrably amplified them — and
  automatically raises precision back near minibrot returns. A pure-`n` linear fast-path
  (`P − λ·(n−1)`, `λ ≈ 1 bit/iter`) is documented as an optional approximation.

- **Append-only orbit growth.** While the budget is unchanged, zooming only **extends** the
  orbit in iteration count at the fixed profile; existing steps are never recomputed. Centre
  drift `> 20·scale` (a pan/recenter) remains the only other recompute trigger — a distinct
  cause, unchanged.

- **Beyond-budget behaviour = assumed degradation.** Zooming deeper than the configured
  budget renders with insufficient precision (noisy/imprecise) until the user raises the
  parameter. No clamp, no auto-bump — the budget is an explicit commitment.

- **Reference iteration cap = `maxIter × 2`.** The reference orbit is computed to
  `2 × maxIter` rather than stopping at `maxIter`, keeping headroom for interactive zoom-in
  (which raises `maxIter`) and avoiding the transient black screen while the orbit catches up.

- **`max_bla_skip` upper clamp lowered `2²⁰ → 2¹⁸`** (`lib.rs:213`). Bounds the longest block
  length `L`, which bounds the f32 reference-orbit noise (`√L·1e-7 ≤ ~5e-5`, ×20 under the
  default `blaEpsilon`), keeping that noise masked by construction.

### Out of scope / classified

- **f32 orbit storage stays as-is.** The orbit is stored f32 (`lib.rs:808`) and BLA/Padé seed
  from it (`lib.rs:869`). Analysis showed the resulting noise is `~√L·1e-7`, well under
  `blaEpsilon` once `max_bla_skip ≤ 2¹⁸` — a secondary finishing concern, **not** a cause of
  the divergence. Restoring double-float storage via the existing inert `pad0/pad1` slots is
  recorded as a possible future `restore-double-float-orbit` follow-up and intentionally
  **excluded** here.
- The exploration **ratchet** (auto precision bumps) considered during exploration is
  **dropped** in favour of the fixed, explicit budget.
