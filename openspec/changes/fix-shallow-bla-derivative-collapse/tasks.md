> Ordered by dependency: repro baseline → radius-gate fix → derivative-fold fix → call-site
> wiring → validation. The radius-gate and derivative-fold fixes are independent of each other
> (both live inside `try_apply_bla`) and can be done in either order, but both must land before
> the call-site signature change (section 4) compiles.

## 1. Repro baseline

- [x] 1.1 Added `tests/bla-derivative-collapse-repro.spec.ts` (Playwright, real WebGPU via the
      already-running dev server — headless preview in this environment reports
      `navigator.gpu === false`, so this needed a headed/GPU-capable browser): renders the
      antenna-tip coordinate (`cx=-2, cy=0`, exactly representable, guarantees boundary structure
      at any depth — same rationale as `mobius-deep.spec.ts`) at scale `1e-19` (comfortably in the
      shallow-BLA failure range; `DEEP_EXP_THRESHOLD` is `2^-100 ≈ 8e-31`) across all four modes,
      capturing relief-shaded (DE-driven) screenshot content stats (mean/std). Verified against
      the actual pre-fix code (temporarily reverted `try_apply_bla` to its original form, re-ran,
      restored the fix) — **confirmed the repro is real**: pre-fix BLA gave `mean=17.3, std=38.0`
      (a washed-out, noisy relief render), post-fix BLA gives `mean=81.7, std=27.4`, matching
      jet (`82.3/28.1`) and mobius+ (`82.3/28.1`, identical — expected, unaffected by this change)
      closely. Padé's stats were similar pre/post-fix at this specific view/coordinate
      (`84.5/28.8` both times) — plausible given Padé's different skip/radius dynamics don't
      drive `dz` into the critical underflow range as hard at this exact location; the code-level
      root cause (shared `try_apply_bla`, same missing discipline) still applies to both modes.
- [x] 1.2 Not isolated separately: `waitForConverged` + the "no blank frame" assertions in the
      repro spec cover that escape/value-channel rendering completes and produces non-degenerate
      content in all cases (pre- and post-fix); the pre/post-fix numeric divergence isolated in
      1.1 is on the *shading* (relief/DE-driven) statistic specifically, consistent with the
      value channel surviving (ref-orbit resync) while the derivative corrupts.

## 2. Radius validity gate (`try_apply_bla`, `mandelbrot_brush.wgsl`)

- [x] 2.1 Replace the outer whole-table fast-reject gate at the call site (`dot(dz, dz) <=
      maxBlaR2`) with a `length(dz)`-based test in log2 space, mirroring the block-table gate's
      shape (`let dzMag = length(dz); if (dzMag < 1.2e-38 || log2(dzMag) < ...)`). `maxBlaR2`
      (squared radius) renamed to `logMaxBlaR` (log2 radius) since a squared-domain bound would
      reintroduce the same underflow this fix removes.
- [x] 2.2 Replace the per-entry radius test inside `try_apply_bla` (`dzMag2 <= radius * radius`,
      sourced from `dzMag2 = dot(*dz, *dz)`) with the equivalent `length()`/log2-domain
      comparison (`dzMagTiny || log2(dzMag) <= log2(radius)`).
- [x] 2.3 Added an explicit dead-block guard (`radius > 0.0 && (...)`): a block whose `radius =
      max(0.0, alpha - bla.radius_beta * dcMag)` evaluates to `0.0` is rejected outright,
      independent of the magnitude test in 2.2 — needed because `log2(radius) = -inf` for a dead
      block would otherwise degenerately validate against `dz == 0` or a fully-underflowed
      `dzMag` (`-inf <= -inf`), the exact same failure shape as the original `0 <= 0` bug.
- [ ] 2.4 Not done in isolation — this repo has no WGSL unit-test harness (only `naga` structural
      validation + Playwright e2e). The scenario is exercised in aggregate by the `tests/
      bla-derivative-collapse-repro.spec.ts` before/after comparison (section 1.1/5.1), which
      necessarily hits both live and (at the observed zoom) collapsed-radius blocks, but a
      targeted synthetic-input test isolating the dead-block guard specifically remains open.

## 3. Derivative fold discipline (`try_apply_bla`, `mandelbrot_brush.wgsl`)

- [x] 3.1 Extended `try_apply_bla`'s parameter list to accept `derS: ptr<function, f32>`, `derSLo:
      ptr<function, f32>`, `derInvScale: ptr<function, f32>` (changed from by-value to pointer),
      `epsThreshold: ptr<function, f32>`, `logEpsilon: f32` — matching `try_apply_bla_deep`'s
      existing parameter order/shape.
- [x] 3.2 Affine branch: **correction from the original task wording** — folding
      `f32(bla.ab_exp) * LN2` into `derS` while ALSO using the already-`ldexp`'d `a`/`b` (which
      already have `ab_exp` baked into their f32 mantissa) would double-count the exponent.
      Mirroring `try_apply_bla_deep` precisely means using the RAW, unscaled mantissas
      (`vec2<f32>(bla.ax, bla.ay)`, `vec2<f32>(bla.bx, bla.by)`) for the `derM` update — exactly
      as the deep path does at its equivalent affine branch — then folding `ab_exp` via
      `der_scale_add` + `der_refresh_cache`. Implemented this way; the value/candidate branch
      above is untouched and still uses the fully-reconstructed `a`/`b`.
- [x] 3.3 Padé branch: same correction applies. The deep path's `aOverM2`/`bOverM` split works in
      `fe` (floatexp) because `invM` there is `fe`-valued; the shallow path's `invM` is plain f32
      and already bounded by the `PADE_POLE2` pole guard, so no `fe` conversion is needed — only
      the coefficient mantissas must stay raw. Implemented as: `aMantissa`/`bMantissa` (raw, from
      `bla.ax/ay`/`bla.bx/by`) multiplied by `invM²`/`invM` (both O(1)-bounded), then
      `der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2)` + `der_refresh_cache`.
- [ ] 3.4 Not done in isolation, same tooling gap as 2.4. The end-to-end repro (1.1/5.1) is
      consistent with the fold working (BLA's DE-driven relief stats converge to jet/mobius+'s),
      but a targeted synthetic-`ab_exp` test isolating `derM`/`derS` directly remains open.

## 4. Call-site wiring

- [x] 4.1 Updated the shallow loop's call to `try_apply_bla` to pass `&derS, &derSLo,
      &derInvScale, &epsThreshold, logEpsilon` — all already declared/threaded in scope at that
      point for the `try_apply_jet`/`try_apply_mobius` calls above it.
- [x] 4.2 `naga src/assets/mandelbrot_brush.wgsl` reports "Validation successful" after the
      change. The shallow loop's existing `derMM`-based renormalization check and epsilon-
      threshold check read `derM`/`derS` after `der_refresh_cache` has already resynced
      `derInvScale`/`epsThreshold` to the post-fold `derS`, so there is no double-counting: the
      fold happens once, inside `try_apply_bla`, before control returns to the loop.

## 5. Validation

- [x] 5.1 Done as part of 1.1's before/after comparison: with the fix restored, BLA's relief
      content stats (`mean=81.7, std=27.4`) sit within a few percent of jet (`82.3/28.1`) and
      mobius+ (`82.3/28.1`) at the identical zoom-1e-19 view, vs. the pre-fix divergence
      (`17.3/38.0`). `tests/bla-derivative-collapse-repro.spec.ts` passes.
- [x] 5.2 Ran the existing approximation-mode regression specs against the fixed shader:
      `jet-mode.spec.ts`, `mobius-mode.spec.ts`, `jet-deep.spec.ts`, `mobius-deep.spec.ts` — all
      pass, including their BLA↔jet/mobius/Padé cross-mode diff assertions at typical (non-deep)
      zoom, i.e. shallow BLA/Padé rendering away from the `~1e-19` floor is unaffected. Also ran
      `npm run test:unit` (62 tests, 13 files) — all pass (none of these exercise this shader
      path directly, but confirm no unrelated regression). No dedicated pre-existing shallow-zoom
      BLA/Padé screenshot-diff benchmark exists in the suite to A/B beyond these.
- [ ] 5.3 Not measured. No apps/s or wall-clock benchmark harness was run specifically for the
      shallow BLA/Padé path pre vs. post-fix; `jet-mode.spec.ts`'s wall-clock numbers (unaffected
      by this change) suggest the harness pattern to reuse for this if a dedicated shallow-BLA
      perf check is wanted later.

## Out of scope (recorded)

- The derivative-specific radius `(V')` research item from the mobius+ design doc §6.4(b) — a
  differentiated Cauchy-tail majorant giving every mode a certified DE margin. This change only
  removes the numeric bug in the existing radius/derivative-update mechanics.
- Any change to `try_apply_bla_deep`, `try_apply_jet`, `try_apply_mobius`, or BLA table
  construction (Rust build side) — those are unaffected and serve as the reference for this fix.
