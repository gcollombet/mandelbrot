## Context

`src/assets/mandelbrot_brush.wgsl` implements four approximation modes behind one
`approximationMode` uniform: 1 = affine BLA, 2 = Padé [1/1], 3 = jet, 4 = mobius+. Modes 3/4
share a "block-table" path (`isBlockTable`, `try_apply_jet`/`try_apply_mobius`) that evaluates
entirely in `fe` (floatexp: mantissa + shared exponent) and threads the derivative's log-scale
register (`derS`/`derSLo`) through every block application. Modes 1/2 share a separate "shallow"
path, `try_apply_bla` (line 361), which reconstructs BLA coefficients to plain f32 via `ldexp`
and updates `derM` in place — this was fine while `dz` stayed within the f32 normal range, but
breaks down once `|dz|` drops below ~1e-19 (routine at zoom ≲ 1e-18), because:

1. `dot(dz, dz)` underflows to exactly `0.0` there (squaring a subnormal flushes in f32), and
2. nothing folds large per-application scale factors out of `derM` into `derS`, so `derM` can
   drift toward the f32 overflow/underflow edge with no compensating mechanism.

The function `try_apply_bla_deep` (line 835) is the deep-zoom counterpart of the *same*
affine/Padé math, operating on `fe`-valued `dz` — it already does both things correctly (log-
space radius tests, `der_scale_add` + `der_refresh_cache` after every update). This change ports
that discipline into the shallow path rather than inventing a new approach, and is scoped to
`try_apply_bla` and its single call site (`mandelbrot_brush.wgsl:657`).

This was raised as a suspected bug during the mobius+ field round
(`openspec/changes/add-mobius-cplus/design.md`, §6.4 Open Questions) — mobius+ was observed to
be the only mode with a correct derivative at depth, and classic BLA/Padé's collapse at
~1e-18 was flagged for separate investigation rather than folded into that change.

## Goals / Non-Goals

**Goals:**
- Eliminate the false-positive `dzMag2 <= radius*radius` (`0 <= 0`) validation caused by f32
  `dot()` underflow, for both the outer whole-table gate (`maxBlaR2`, line 656) and the
  per-entry radius test (line 387) inside `try_apply_bla`.
- Ensure a "dead" block (`alpha - beta·dcMag <= 0`, i.e. radius collapsed to 0) can never
  validate regardless of how small `dzMag2` underflows to.
- Fold every `derM` update inside `try_apply_bla` (affine and Padé branches) into `derS` via
  `der_scale_add` + `der_refresh_cache`, exactly as `try_apply_bla_deep` and the jet/mobius paths
  already do, so `derM` never silently saturates.
- Keep classic BLA/Padé's value-channel behavior and performance characteristics unchanged —
  this is a derivative-correctness fix, not a re-tuning of skip lengths or radii.

**Non-Goals:**
- Not touching `try_apply_bla_deep`, `try_apply_jet`, `try_apply_mobius`, or any `fe`-domain
  code — those are the reference implementations this change matches, not targets.
- Not implementing the derivative-specific radius (V') follow-up noted in the mobius+ design doc
  §6.4(b) — that is a separate, larger research item (a differentiated Cauchy-tail majorant) and
  orthogonal to this bug fix (this fix fires below any radius formula; a small
  under-radius still cannot save you from `0 <= 0`).
- Not changing the `BlaStep`/`BlaLevel` buffer layout or build-side (Rust) BLA table
  construction — this is confined to how the existing per-block data is consumed at apply time.

## Decisions

**Log-space / `length()`-based radius gating (mirrors the jet/mobius gate, not a new scheme).**
Replace `dot(*dz, *dz)` with `length(*dz)` compared against radii in log2 space, following the
existing pattern at `mandelbrot_brush.wgsl:644-645` (`let dzMag = length(dz); if (dzMag < 1.2e-38
|| log2(dzMag) < jetMaxR3)`). `length()` still underflows below ~1e-38 (not ~1e-19 like
`dot()`), which is far enough below the observed 1e-18 failure zoom that it closes the practical
gap; the existing jet/mobius comment already documents accepting that residual floor via an
explicit `< 1.2e-38` sentinel that treats the gate as open rather than degenerately closed.
Considered alternative: convert `dz` to `fe` for this path too (like the block-table path does)
— rejected because it would mean every affine/Padé apply pays `fe` conversion overhead even in
the comfortably-f32-safe regime (most of interactive shallow use), for no benefit over the
cheaper `length()`-based gate at the actual failure boundary.

**Explicit dead-block sentinel, not reliance on `radius*radius` being nonzero.**
`radius = max(0.0, alpha - beta·dcMag)` already computes 0 for a block whose radius has fully
collapsed under the current `dc`. Add an explicit `radius > 0.0` (or equivalent `alpha >
beta·dcMag`) guard before the validity test, so the fix is not merely "make the underflow
threshold smaller" but "make a zero radius unconditionally reject," matching the deep path's
behavior where `log_betaDc < log_alpha` gates entry into the radius computation at all (line
854) — a collapsed radius never reaches a comparison there either.

**Thread derivative-state pointers into `try_apply_bla`, matching `try_apply_bla_deep`'s
signature.** Add `derS: ptr<function, f32>`, `derSLo: ptr<function, f32>`,
`derInvScale: ptr<function, f32>` (currently passed by value — becomes a pointer so
`der_refresh_cache` can update it), `epsThreshold: ptr<function, f32>`, `logEpsilon: f32` to
`try_apply_bla`'s parameter list, in the same order `try_apply_bla_deep` already uses them.

**Fold the derivative update using the RAW coefficient mantissas, not the already-`ldexp`'d
`a`/`b`.** This is a correction made during implementation: the value/candidate branch
reconstructs `a`/`b` via `ldexp(mantissa, ab_exp)` — the exponent is baked directly into the f32
value. Folding `f32(bla.ab_exp) * LN2` into `derS` *in addition to* using that already-scaled `a`
for the `derM` multiply would double-count the exponent (the reconstructed derivative would carry
`2^ab_exp` twice). `try_apply_bla_deep` avoids this because its `a`/`b` are true `fe` values
(mantissa and exponent kept separate) — its affine branch multiplies `derM` by the raw mantissa
`vec2<f32>(bla.ax, bla.ay)` and folds `bla.ab_exp` separately (`mandelbrot_brush.wgsl:892-893`);
its Padé branch computes `aOverM2 = fe_cmul(a, fe_cmul(invM, invM))` and uses `aOverM2.m` (mantissa
only) with `aOverM2.e` folded into `derS` (lines 875-879). The shallow port therefore also uses
the raw mantissas `vec2<f32>(bla.ax, bla.ay)` / `vec2<f32>(bla.bx, bla.by)` for the `derM` update
in both branches, folding `bla.ab_exp` once via `der_scale_add`. In the Padé branch, `invM`/`invM²`
stay plain f32 (bounded by the `PADE_POLE2` pole guard, so no `fe` conversion is needed there —
only the coefficient mantissas must stay unscaled): `derM_new = (aMantissa · invM²)·derM_old +
(bMantissa · invM)·derInvScale_old`, then `der_scale_add(derS, derSLo, ab_exp·ln2)`. The
value/candidate branches above are unaffected and keep using the fully-reconstructed `a`/`b`/`d`,
since `dz` never accumulates scale the way `derM` does (it is periodically resynced from the
reference orbit). `der_refresh_cache(...)` follows the fold in both branches (mirroring lines
881/894). Considered alternative: only fold when a block is "long" (large `skip`) since short
blocks can't drift `derM` far — rejected as needless branching complexity; `der_scale_add`/
`der_refresh_cache` are cheap (a compensated sum + two clamped `exp()`s) and the deep/block-table
paths already pay this cost unconditionally per application.

**Single call-site update.** `try_apply_bla` has exactly one call site
(`mandelbrot_brush.wgsl:657`, inside the `!isBlockTable` branch of the shallow loop). Update it
to pass `&derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon` (all already in scope at that
point — the shallow loop already declares and threads these for the block-table branch's
`try_apply_jet`/`try_apply_mobius` calls at lines 648/650). No new state needs to be introduced.

## Risks / Trade-offs

- **[Risk] Folding `derS` on every shallow BLA/Padé application adds a compensated-sum + two
  `exp()` calls per block-skip, on the hottest interactive path (shallow zoom is the common
  case).** → Mitigation: this is the same cost the jet/mobius block-table path already pays per
  application at every zoom depth, including shallow — the field round data in the mobius+
  design doc already characterizes it as acceptable relative to Padé's current (buggy) lean
  apply. If a measurable regression appears, `der_refresh_cache`'s two `exp()`s are the same
  ones already paid at every plain (non-BLA) step and at every jet/mobius application — no new
  operation is introduced, only extended to a path that currently skips them.
- **[Risk] Changing the radius gate could shrink block-skip lengths, showing up as more, shorter
  applications (perf regression) for a very small set of near-critical blocks close to the new
  `length()`-underflow floor.** → Mitigation: the new floor (~1e-38) is ~19 orders of magnitude
  below the old effective floor (~1e-19), so it only changes behavior for `dz` in
  `[1e-38, 1e-19)` — previously always-underflowed-to-0-and-therefore-wrongly-accepted, now
  correctly gated. There is no regime where a previously *valid* application becomes rejected.
- **[Trade-off] This fix does not address the deeper `(V')` question (an honest
  derivative-specific radius, giving every mode a certified DE margin) — it only removes an
  outright numeric bug from the existing radius/derivative-update mechanics.** → Accepted:
  scoped intentionally per Non-Goals; `(V')` is tracked separately in the mobius+ design doc.

## Migration Plan

Pure shader-internal fix, no data migration. Ship as a normal shader update; existing BLA/Padé
tables (`BlaStep`/`BlaLevel` buffers) are read unchanged — only how the shallow path consumes
them at apply time changes. Rollback is a plain revert of the shader diff.

## Open Questions

- Should the `length()`-based gate's residual ~1e-38 floor be closed the same way the
  block-table path documents accepting it (an explicit `< 1.2e-38` "treat as open" sentinel), or
  is there a cheap way to route `try_apply_bla` through the existing `fe`-based gate at
  `mandelbrot_brush.wgsl:644-645` when `!isBlockTable`, avoiding a second near-identical gate
  pattern? Leaning toward keeping the sentinel local to `try_apply_bla` for now (fewer control-
  flow changes to the shared shallow loop) but worth revisiting if this fix is followed by the
  §6.4(b) `(V')` derivative-radius work, which will likely touch this gate again anyway.
