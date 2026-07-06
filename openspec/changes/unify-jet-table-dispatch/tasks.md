# Tasks — unify-jet-table-dispatch

Phases are independently shippable and gated (design D10/D11); a phase's gate task
must pass before the next phase starts. Prerequisites:
`fix-shallow-bla-derivative-collapse` applied; Total-apps indicator live
(render-instrumentation, add-mobius-cplus 6.3).

## 1. Phase A0 — census before code (the gate referee)

- [x] 1.1 Rust census harness: on each benchmark view (reference + ε + c_max), derive
      the four tier radii per block (reusing the existing jet/mobius bounds machinery
      + §12 closed forms), tag each block with its cheapest covering tier, and report
      tier mix by block count and by predicted application share (CPU pixel-loop
      replay on the sampled grid). → `unified_tier_census` in mobius.rs tests
      (§12 closed form `pade_closed_form`, 4-tier radii grid, dispatch replay
      `auto_run_pixel`, three single-mode baselines, [K/1] binding-channel stat).
- [x] 1.2 Record census results in design.md; decide per design D10: per-block tags
      (mixed tiers on real views) vs Phase A-lite (per-view tier selection). Also
      record whether the [K/1] gate condition (z-channel bound active) is met
      anywhere — expected NO per current deep census. → DECIDED: per-block tags
      (see "Census results" in design.md); [K/1] gate unexpectedly MET on
      spiral-class views (81 % z-bound Padé apps at 1e-14) — materiality modest,
      stays in reserve.

## 2. Phase A — unified table + dispatch

- [x] 2.1 Build (Rust): prefix-ordered record `[A, B, D, A′, D′, a02, a30, a12, a03]`
      (`unified.rs`: `UnifiedBlock`, `build_unified_levels`, `unified_eval_jet3`);
      identity-reconstruction test (a₂₀ = −D·A, a₁₁ = A′ − B·D, a₂₁ = −D′·A − D·a₁₁,
      ~1e-11 at OPERAND scale — the chains cancel, spec amended); tier parity test vs
      standalone c+/plain builds + jet_eval order 3.
- [x] 2.2 Build (Rust): per-tier value radii (`unified_build_radii`): affine/jet from
      moduli-based (V) (`jet_block_bounds_moduli` refactor), Padé/c+ as
      max((V), generalized §12 closed form over stored q moduli, pole-capped). NO
      cross-tier ladder clamp — surfaced as unsound during implementation, spec and
      design amended (per-tier soundness is the invariant). Soundness-vs-exact-
      stepping test green (2 154 samples ≤ 5ε·scale, incl. boosted radii); boost
      diagnostic: closed form exceeds (V) on ~all certified blocks (up to 2047/2047).
- [x] 2.3 Build (Rust): tag + serialization (`unified_serialize_coeffs`/`_radii`,
      `unified_tag`): 9-slot prefix record (108 B), 16 B sidecar
      (r_tagged, tag, f32safe, spare — spare reserved for Phase B's min(r, r′)),
      directory reuses `JetLevel`. Tag = cheapest band-covering tier with argmax
      fallback (band-dead-but-alive blocks stay usable). Round-trip test green
      (alignment, prefix order, sentinels, tag rule, degenerate −∞).
- [x] 2.4 Staged cache: `unified_build_bounds`/`unified_solve_radii` split (bounds =
      the expensive walks, R_c-headroom-keyed; radii+tags pure log2, (ε, c_max)-keyed;
      band placeholder = c_max + 10 bits pending GPU tier-mix counters);
      `ensure_unified_table` + `compute_unified_reference`/`UnifiedBufferInfo` in
      lib.rs mirroring the mobius stages incl. reset invalidation. Cache-isolation +
      cascade test green (detour through other modes warm, in-headroom zoom re-solves
      radii alone, ε change leaves the coeff buffer, reset invalidates all). Full
      suite 68 passed; wasm32 target builds.
- [x] 2.5 Worker + Engine (TS): `kind: 'unified'` blaReady (27-float records = jet
      stride → rides the jet GPU buffers; 4-float tagged sidecar), mode 5 dispatch +
      jet-class repost throttle + scale-drift repost; Engine: `'auto'` in the
      ApproximationMode union (+ Mandelbrot.ts/MandelbrotExposed.ts), writeBlockTable
      unified branch, prefix-table acceptance, active-table audit
      (`expectedTableKind: 'unified'`), shader flag 5; Settings 'Auto' option
      (additive — the 2.7 collapse restructures later); RenderStats flag-5 label.
      Rust: `ApproximationMode::Unified = 5` + `use_unified()`; wasm rebuilt;
      vue-tsc green. FIELD FIX: the viewer's mode normalizer
      (MandelbrotViewer.vue applyApproximationToEngine) whitelisted only
      bla/pade/jet/mobius, so the Settings 'Auto' button fell back to
      perturbation — 'auto' added; verified through the real UI path
      (button click → flag 5, 10 levels).
- [x] 2.6 WGSL (in-place compute + debug): `try_apply_unified` in both loops of
      mandelbrot_brush.wgsl (tagged 16 B probe → tier-directed prefix read 24/36/60/
      108 B; f32 fast path for the rational tags, fe for jet with register identity
      reconstruction; mobius der-fold discipline) + `dbg_try_unified` in
      mandelbrot_debug.wgsl with the o1/o2/o3 buckets AS the tier-mix counters
      (≤48 B / c+ / jet — resolves the open question, debug-first). Flag decode
      fixed in both loops (mode 5 would have been captured by isMobius ≥ 3.5).
      naga ×2 + vue-tsc + vite build green; wasm rebuilt.
- [x] 2.7 Settings: picker collapsed to [Auto, Exact], defaults (Settings model +
      viewer params) → `auto`; legacy modes as a "Mode override" seg in the debug
      section (same model field — presets carrying legacy modes keep working).
      RenderStats "Tier mix" line from NEW production counters: WorkStats grew
      4 per-tier u32 (shader: g_tierApps private counters in try_apply_unified →
      workgroup partials → >>6 global atomics; Engine: 32 B stats buffer, 40 B
      readback slots, `tierAppsApprox` exposure). Verified live: default = auto
      flag 5, intro-view mix aff 12480 / jet 5376 — the AFFINE tier is alive at
      shallow c_max (the census's "dead" verdict was deep-band only; keeping the
      32 B tier vindicated). naga + vue-tsc + vite build green.
- [x] 2.8 Playwright: `auto` A/B vs best single mode per benchmark view — zero
      validation errors, pixel-diff within sampling floor, apps_total(auto) ≤
      apps_total(best single mode) [SHIP GATE]. Record in design.md.
      AUTOMATED HALF: `tests/unified-mode.spec.ts` GREEN (flag 5 + live
      table, zero WebGPU errors, bla↔auto significant diff 5.1 % < floor and
      better than bla↔pade 7.0 %, round-trip clean, jet↔auto table audit holds,
      orbit never rebuilt; re-run green after the WorkStats extension, bla
      Total-apps reproducible to the 64-unit quantization). FIELD HALF PASSED
      (user verdict, 2026-07-06): "auto toujours mieux" across his views — the
      ship gate holds; 2.7 unblocked and done. Caveat: the counter-based
      apps_total number for auto/mobius awaits the Total-apps freeze fix (chip
      filed); re-record the figures when it lands. → FIXED in-session: stats
      clearing is now SESSION-keyed (table posts preserve the accumulation) and
      completion takes a dedicated exact final readback (40 B copy+map,
      overwrites the provisional sampled figure). All five modes report; the
      intro view reads auto 178.8M / mobius 177.3M / bla 88.6M / jet 65.7M /
      padé 36.6M at equal ~2s wall — the session total INCLUDES the pre-table
      exact phase of slow-building modes (semantics recorded in the
      render-instrumentation spec; steady-state A/B needs deep views or a
      warm-table re-render).

## 3. Phase B — derivative-certified radii (V′)

- [x] 3.1 Derivation note in design.md (D5 amended): differentiated remainder per
      tier + rational DEN corrections under the pole cap, (V′) scale = ε·(|A|+|A′|y);
      coverage validated by the soundness referee below (100 % of 1 682 samples).
- [x] 3.2 Build: `derivative_radius` per block per tier (descending scan); effective
      sidecar radius = min(r, r′) ALWAYS (D5 amendment: der is propagated
      unconditionally in this pipeline — no DE cache key, zero runtime changes).
      Soundness test `unified_derivative_radii_sound` green vs exact ∂z stepping
      incl. quasi-critical blocks; diagnostics: Padé's structural q₁₁·y floor kills
      8–14 blocks/view at 1e-14 (der-DEAD), c+ ~1-bit shrink, jet 0–7 blocks,
      nothing anywhere at 1e-9.
- [x] 3.3 CPU harness referee folded into 3.2's test (per-tier ∂z error ≤ 5ε·scale
      below the effective radii — the certified-DE claim); the "fewer applications
      than accidental-c+" half is a field observation → 3.4.
- [ ] 3.4 Field check (user GPU): DE stability at depth under `auto` + DE; compare
      apps_total DE-on vs DE-off (the honest-DE cost); decide the certified-DE
      toggle default per design risk 1. Record in design.md.

## 4. Phase C — certified series approximation

- [x] 4.1 Build (Rust): `sa_build` (pure-c jet order 8 stored / 4 applied, majorant
      rung ladder s ∈ {1e2..1e12}, condition (V_c), NO-EARLY-ESCAPE guard
      |Z|+ρ ≤ 1.9 — a pixel cannot escape inside the certified prefix) +
      `sa_profile` diagnostic. Tests green: value ≤ 5ε·scale AND the ∂c seed
      ≤ 50ε vs exact prefix stepping; profile collapses across the seahorse
      passage (−24 → −48 log2). n0 matches the findings (seahorse 998@1e-14 vs
      proto 1025; near-parab/feigenbaum cap the budget). Note: the escape guard
      sets n0 = 0 on needle-class references (|Z| → 2) — certified-conservative.
- [x] 4.2 Engine + WGSL: SA ships as a 4-entry sidecar HEADER after the block
      records (base = last directory entry, b1..b4 + n0 — no uniform changes);
      the DEEP compute-request call site enters mandelbrot_compute_deep through
      its CONTINUATION parameters (δ = Horner b·dc, ∂δ/∂c seed for der, ref_i =
      iter = n0 — zero changes inside the iteration functions). Shallow is a
      certified no-op (n0 = 0 at shallow c_max by construction). Progressive
      bookkeeping needs nothing: continuation frames resume past n0 naturally.
- [x] 4.3 Playwright `tests/unified-deep.spec.ts` GREEN: antenna 1e-32 (auto deep
      fe, flag 5, structure, zero GPU errors) + seahorse 1e-10 A/B — content
      matches jet (80.9/52.1 both), live tier mix [46081 aff, 7676 padé,
      214 c+, 16505 jet]. Best observed run: 1.07M apps vs jet 115M (×108,
      SA × big-skip blocks); session totals vary run-to-run with the
      build-vs-convergence race (steady-state A/B needs warm-table re-renders —
      Phase F). En-route fixes/finds: build radii stage 4.0 s → 0.46 s
      (coarse-to-fine scans, budget test `unified_build_budget`); Metal drops
      dynamic-index private-array writes in non-uniform loops (tier counters →
      literal-index selects); tier flush de-quantized (raw, not >>6); certified
      tables are INERT on the antenna needle (jet/mobius/auto all pure-exact —
      pre-existing, investigation chip filed). NEEDLE CHIP RESOLVED (won't-fix
      here; folds into Phase F): the zero mix is the build-vs-convergence race
      in its purest form, NOT a certification defect. At c = −2, 1e-32 the
      orbit sits on the repelling fixed point Z = 2 (|2Z| = 4), |dz| grows
      ×4/step from ~1e-32, every pixel escapes or stabilizes in ~55 iterations
      and the view converges within ~1.5 s of render start — while the unified
      build takes 1.35 s at maxIter 10.6k (linear in orbit length; jet/mobius
      same order). The table lands after completion and a late blaReady
      intentionally never recomputes finished pixels ⇒ session totals = pure
      exact (54.7M). Heuristic Padé's ~20 ms merge build wins the race (11.4M,
      ×4.8). Warm-table referee (forced clearHistory with the table resident):
      54.7M → 13.0M apps, tier mix [2.29M affine, 0, 0, 0] — ×4.2, on par with
      heuristic Padé, so the dispatch is healthy at the needle. The radii ARE
      4^−L-collapsed but genuinely so (Lyapunov log 4: a20/a10 ~ 4^L and the
      pure-c a02 ~ 16^L/36 are real coefficients, not bound pessimism), so
      gate (b) rightly kills skip ≥ 64 at ε = 1e-3, c_max = 4e-32 while
      skip ≤ 32 certifies and carries the whole ×4.2. Diagnostics kept in
      Rust: `unified_needle_diag` (radii/gates/dispatch mirror) and
      `unified_needle_build_budget` (needle build latency), both #[ignore].
      Verdict: the needle A/B measures BUILD LATENCY, not dispatch quality —
      steady-state comparisons need the Phase F warm-table re-renders (7.x).
      Related: seahorse 1e-10 auto now converges with SA absorbing ~all
      iterations (1.07M apps vs jet 126.6M) so the live tier mix can read
      [0,0,0,0] and the 4.3 spec's `seaMixTotal > 0` assertion is brittle —
      the A/B invariant worth asserting is apps(auto) ≪ apps(jet), not
      mix > 0.

## 5. Phase D — analytic antialiasing

- [ ] 5.1 Kernel state: (z′, z″) propagation through exact steps and through the
      dispatched tiers (closed per-block formulas incl. z-derivatives of m_z/m_c);
      CPU referee test: deviation ≤ ~1e-12 vs step-by-step.
- [ ] 5.2 Raw-state layers for z″ across passes and display-side payload layers
      (z′, z″, margin) through resolve — both AA-enabled pipeline permutations only,
      reusing the der-Cartesian layer pattern. Plain full-precision r32float layers,
      NO packing (decided; packing is a later optimization if memory hurts).
- [ ] 5.3 Color pass: per-AA-sample inline reconstruction ẑ(δᵢ) = z + z′δᵢ + ½z″δᵢ²
      from the payload; subsample smooth-iteration (log-log extrapolation) and
      escape-z coordinates from ẑ; feed the NORMAL coloring path and the existing
      linear-RGB accumulation — no compute-side averaging anywhere. Referee test:
      analytic sample color vs re-iterated same-jitter sample within the
      second-order bound.
- [ ] 5.4 Reseed: stamp only margin-failing frontier pixels (today: the whole DE
      boundary band); frontier fraction in AA stats; SA-prefix sharing for frontier
      re-iterations when Phase C is active.
- [ ] 5.5 Playwright + field: 16× analytic AA vs 16× brute on escaping-dominated
      views — final image within second-order bound, AA-sample apps_total dropping
      to ~frontier fraction (1–10 % band), gamma-correct accumulation unchanged;
      coordinate with the open add-adaptive-antialiasing change (its sample-count
      adaptivity stays, its per-sample cost model updates).

## 6. Phase E — interior/periodic regime

- [x] 6.1 Build: `periodic_build` (sustained-tail detection tol 1e-12, earliest
      converged phase, Φ_p composed from p seed jets, c+ extraction). KEY
      calibration decision: the block radius certifies at ε_int = max(ε, 1e-4)
      — the verdict needs κ-accuracy against the runtime MARGINS (|κ| < 0.98,
      |w₀| < 0.5), not ε-exact values; contraction amortizes the block error
      (findings §17). Ships as sidecar header entries [4..9) (A/B/D/A'/D' +
      start, p, r_log2); p = 0 disables the runtime. None for escaping refs.
- [x] 6.2 RESOLVED WITHOUT cpow: the interior branch needs only fe_csqrt (added
      to mandelbrot_brush.wgsl) — cpow was for the exterior fast-forward (6.4,
      deferred). CPU parity referee = `periodic_interior_verdict_certified`:
      κ(dc) matches the ANALYTIC period-2 multiplier 4·(c+1) to <1e-6 on the
      C = −1+0.1i disk (findings' |κ| = 0.4000 reproduced), closed form vs
      block iteration k-INDEPENDENT (k = 10 and 1000 within 1e-9).
- [x] 6.3 Runtime interior branch in BOTH loops (one fe implementation,
      `try_periodic_interior`; shallow wraps its f32 state — the common
      interior views are shallow): one compare per loop turn, an attempt every
      p iterations at the aligned phase; verdict ⇒ inside = true (in-set
      coloring). GPU A/B green (unified-deep.spec.ts interior leg): period-2
      disk at 1e-6, auto = 412 160 apps for 2.6M pixels (0.16/px — the O(p)
      short-circuit) vs jet WRAPPING its u32 work counters (px × maxIter,
      ≥10⁴×), identical all-interior image. Interior-DE from κ deferred with
      6.4 (plain in-set coloring for now).
- [ ] 6.4 Runtime exterior fast-forward behind a debug flag: k* closed form, radius-
      bounded, rebase resync test (overshoot by O(1) periods → identical coloring).
      Deep-zoom validation on the user's views [GATE for default-on; findings §17
      caveat d]. Record verdict in design.md. DEFERRED (not started): the
      interior branch banks the dominant gain; the exterior mechanism awaits
      real-deep validation per the caveat.

## 7. Phase F — frame-coherent builds (any time after Phase A)

- [ ] 7.1 Coefficients+levels cache keyed by reference orbit only; ε/c_max/DE changes
      re-run bounds/radii stages only; invalidation test (pan/re-reference clears
      all).
- [ ] 7.2 Radii-stage timing in build stats surfaced to RenderStats debug; budget
      test on the benchmark orbit set; zoom-animation measurement: per-keyframe table
      time vs cold build recorded in design.md.

## 8. Close-out

- [ ] 8.1 Companion doc `MANDELBROT_UNIFIED_TABLE_IMPLEMENTATION.md`: shipped phases,
      measured numbers per gate, reserve-gate verdicts ([K/1], tile-coherent
      sequences, secondary-reference hook), superseded machinery (per-mode tables,
      heuristic Padé guards on dispatched path, prefix rebasing).
- [ ] 8.2 Update design.md open questions with outcomes; file the follow-up removal
      change (legacy mode deletion) if the field rounds hold; update the project
      memory verdict map.
