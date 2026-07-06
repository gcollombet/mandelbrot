## Why

In classic BLA and Padé mode (`approximationMode` 1/2), the distance-estimation derivative
collapses starting around zoom scale ~1e-18 — far earlier than jet or mobius+ mode, and far
earlier than the value channel itself breaks down. The image stays correct (perturbation
rebasing resyncs `z` from the reference orbit every block), but the derivative-driven DE layer
goes noisy/wrong from that scale on.

This was flagged as a suspected numeric bug and spun off for investigation in
`openspec/changes/add-mobius-cplus/design.md` (§6.4 Open Questions), during the mobius+ field
round which established derivative fidelity as a cross-mode axis. Code inspection confirms two
concrete defects in the shallow (`f32`) BLA/Padé block-apply path (`try_apply_bla`,
`src/assets/mandelbrot_brush.wgsl:361`) that its own deep (`floatexp`) counterpart
(`try_apply_bla_deep`, same file, line 835) and the jet/mobius block-table paths do not have.
Fixing them brings classic BLA/Padé's derivative correctness in line with every other mode.

## What Changes

- **Radius validity gated in log space, not raw `dot(dz,dz)`.** `try_apply_bla`'s block-radius
  test (and its outer whole-table fast-reject gate) currently squares `dz` in plain f32, which
  underflows to exactly `0.0` for `|dz| ≲ 1e-19` — right at the observed failure threshold.
  Combined with a "dead" block (radius already collapsed to `0` via
  `max(0.0, alpha - beta·dcMag)`), the test degenerates to `0 <= 0` and silently accepts a
  block with no real validity margin. Replace with a `length()`/log2-domain test (mirroring the
  jet/mobius gate at `mandelbrot_brush.wgsl:644-645`), with an explicit dead-block sentinel so a
  collapsed radius can never validate by coincidence.
- **Derivative update folds into `derS` like every other block-apply path.** `try_apply_bla`
  currently mutates `derM` directly (`*derM = cmul(*derM, a) + b * derInvScale;`) with no
  compensating log-scale update. `try_apply_bla_deep` and the jet/mobius paths always follow the
  equivalent update with `der_scale_add` + `der_refresh_cache`, keeping `derM` inside the f32
  renormalization window. Add the same discipline to `try_apply_bla`'s affine and Padé branches,
  which requires threading `derS`/`derSLo`/`derInvScale`/`epsThreshold`/`logEpsilon` pointers
  into the function and its call site, matching `try_apply_bla_deep`'s signature shape.

## Capabilities

### New Capabilities
- `shallow-bla-derivative-integrity`: Defines the numeric validity and derivative-update
  discipline the shallow (f32) BLA/Padé block-apply path must uphold — block radius gating that
  cannot falsely validate under f32 underflow, and a derivative update that stays folded into
  the shared log-scale (`derS`) register like every other approximation mode.

### Modified Capabilities
(none — no existing spec covers this internal shader path)

## Impact

- **WGSL**: `src/assets/mandelbrot_brush.wgsl` — `try_apply_bla` (~line 361) and its call site
  in the shallow render loop (~line 657). No changes to `try_apply_bla_deep`, `try_apply_jet`,
  `try_apply_mobius`, or any deep-path code — those already have the correct discipline and
  serve as the reference implementation for this fix.
- **No CPU/Rust, Engine.ts, or buffer-layout changes.** This is a pure shader correctness fix;
  `BlaStep`/`BlaLevel` struct layouts and uniform bindings are unchanged.
- **`mandelbrot.wgsl` (fragment-shader twin) does not exist in this repo** — the all-compute
  migration already consolidated the render path into `mandelbrot_brush.wgsl`, and
  `mandelbrot_debug.wgsl` has no `try_apply_bla` of its own (verified: it does not define or
  duplicate this function), so there is exactly one copy of this bug to fix.
