# Tasks — add-mobius-cplus

## 1. Spikes (decide before layout freezes)

- [x] 1.1 Exponent-spread spike: build D_s = 6 jets on the D7 orbit set (cusp −0.75,
      period-2 −1.25, seahorse-edge, Feigenbaum 131k), extract A/B/A' and D/D' per
      block, measure worst within-group log2 spreads per level. Decide shared vs
      private exponents per group (design D1); record the table in design.md.

## 2. Build pipeline (Rust, `reference_calculus`)

- [x] 2.1 Coefficient extraction `mobius_from_jet(&JetF64) -> MobiusCPlus` (A, B, D,
      A', D'; degenerate c₁₀ = 0 ⇒ radius-0 marker) + unit test vs direct formulas on
      hand-built jets.
- [x] 2.2 Compensated remainder `q_ij` computation + the build-integrity test:
      q₁₀/q₀₁/q₂₀/q₁₁/q₂₁ = 0 to ~1e-14 relative on every block of every test orbit
      (spec: cross-term annihilation invariant).
- [x] 2.3 Bounds: reuse `jet_majorant_pre` for ρ; compute M_Q per anisotropic polydisc
      (R_z ∈ {3e-2, 1e-2, 1e-3} × s ∈ {3e3, 3e5}); store per-block
      `MobiusBlockBounds` (|q_ij| moduli, M_Q per candidate, |A|,|B|,|D|,|D'| log2).
- [x] 2.4 Radius: (V) evaluator with error scale ε·(|A|x + |B|c_max) and DEN > 0.5;
      descending geometric scan (0.1 decade, log10(0.999·R_z) → −16), max over
      polydiscs. Test: radii sound on sampled entries (spec: radius soundness) and
      nonzero at coarse c_max (spec: radii survive shallow scales).
- [x] 2.5 Merge validity chain r ← min(r_formula, r_x, r_y/(|A_x| + r_y·|D_x|)) walked
      bottom-up over the level scaffold + test that the cap engages (spec scenario).
- [x] 2.6 CPU pixel loop `mobius_run_pixel` (Zhuoran rebasing, first-escape rule,
      derivative update) + the §6 battery: historical (G) block numbers (err ≤ ~5e-13
      at |c|=1e-14), superconvergence constant test, global ρ_N/(N·ε) ≤ 5 on
      seahorse/near-parab/spiral/Feigenbaum × ε ∈ {1e-12, 1e-15}, iteration/escape
      parity with exact stepping, measurement capped at reference length.
- [x] 2.7 Census harness: #applications mobius+ ≥ plain Möbius on every test view;
      r-below-delta-band count at deep |c| (expect ≈ 0 at |c| ≤ 1e-14). Wall-clock and
      #applications only — no weighted-ops conventions.

## 3. Table lifecycle + serialization (Rust)

- [x] 3.1 `ensure_mobius_table` staged cache: levels+coefficients keyed by orbit
      length; bounds keyed by R_c headroom; radii keyed by (ε, c_max) — mirror
      `ensure_jet_table`, including cascade invalidation and `reset_reference_to`.
- [x] 3.2 Serialization per design D1: shared-exponent coefficient records (layout per
      spike 1.1) + 16 B vec4 radius sidecar + level directory (offset/count/skip/maxR);
      round-trip test (radii f32 rounding, mantissa tolerance, index alignment,
      degenerate blocks −∞).
- [x] 3.3 `ApproximationMode::MobiusCPlus`, `use_mobius_cplus()`,
      `compute_mobius_reference() -> MobiusBufferInfo` (coeffs/radii/levels pointers);
      cache-isolation test (mobius+ round-trip leaves BLA/jet caches warm, and vice
      versa).

## 4. Worker + Engine plumbing (TS)

- [x] 4.1 `referenceWorker.ts`: mode 4 dispatch, `kind: 'mobius'` on blaReady with
      coeff + radii arrays and strides; jet-class repost throttle; scale-drift repost
      stamp shared with the jet path.
- [x] 4.2 `Engine.ts`: `'mobius'` in the ApproximationMode union, stride consts, GPU
      buffers + capacities (coeff + radius sidecar), bind-group entries on all three
      layouts, `writeBlockTable` kind branch, partial-table acceptance
      (tableCoversView semantics), shader mode flag 4, blaLevelCount active-table
      audit.
- [x] 4.3 `Mandelbrot.ts` / `types/MandelbrotExposed.ts` / `Settings.vue` mode option /
      `RenderStats.vue` label for flag 4.

## 5. Shaders (WGSL × 3: mandelbrot, mandelbrot_brush, mandelbrot_debug)

- [x] 5.1 Block record + sidecar structs, new bindings, `try_apply_mobius` shallow
      (f32 apply: 2 ldexp group reconstructions + 2 cmul augmentation + [1/1] form;
      descent with hoisted level gates, sidecar probe, level hint; paranoia
      denominator guard behind a const, default ON; derivative update with the der
      fold/renorm discipline).
- [x] 5.2 Deep (fe) variant of the apply on both production shaders — same descent,
      coefficients reconstructed to fe from mantissa+group exponent.
- [x] 5.3 Debug shader parity (probe counters, per-mode timing view) so debug-view
      measurements reflect the production descent.
- [x] 5.4 naga validation ×3 + `vue-tsc` + `vite build` green; wasm rebuilt.

## 6. GPU validation (Playwright, WebGPU headed)

- [x] 6.1 `tests/mobius-mode.spec.ts`: shallow A/B vs Padé and jet on the intro view —
      zero WebGPU validation errors, shader flag 4 with a live table, reference orbit
      never rebuilt across mode switches, pixel-diff within block-sampling floor.
- [x] 6.2 `tests/mobius-deep.spec.ts`: deep view (≤1e-32, fe path) renders structured
      content and converges; near-critical view (seahorse) traversed without blackout.
- [ ] 6.3 Field measurement round on the user's benchmark views (debug view timings,
      realizedSkip): mobius+ vs Padé wall-clock, census 2.7 numbers at interactive
      scales. Record results in design.md.

## 7. Close-out

- [x] 7.1 Companion doc `MANDELBROT_MOBIUS_CPLUS_IMPLEMENTATION.md` (mirroring the jet
      and Padé notes): what shipped, measured numbers, known limits, the
      deprecation-decision inputs (field A/B + census).
- [x] 7.2 Update design.md open questions with outcomes (spike, paranoia guard
      keep/drop, scan grid); file the Padé/jet deprecation follow-up decision.
