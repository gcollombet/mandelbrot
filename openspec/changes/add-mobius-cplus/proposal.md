# Proposal — add-mobius-cplus

## Why

Field testing of the three iteration-skipping modes settled a fork: Padé [1/1] is the
practical speed default (near-exact on the slow/near-parabolic dynamics that dominate
interactive deep zoom, 48 B blocks, f32 evaluation) but its radii are heuristic and its
runtime carries three guards (H2, min_a/(G), beta) plus a pole check; jet is the rigorous
mode (certified rule-(V) radii, one runtime comparison, provable O(N·ε)) but pays ~2×
wall-clock (all-floatexp evaluation, 120 B blocks) and ~10–20× build cost. The math note
`MOBIUS_CPLUS_IMPLEMENTATION.md` (numerically verified externally; see
`JET_BLA_FINDINGS.md` §12–13 and the /outputs PDFs) shows the two can be unified: augment
the Möbius/Padé form with two c-linear coefficients — `m(z,c) = ((A+A'c)z + Bc) /
(1 + (D+D'c)z)` — chosen to exactly annihilate the spurious `zc` and `z²c` cross-terms
(the very terms that force guard (G)), and certify a single per-block entry radius from
the existing bivariate-jet build machinery. Result: Padé's wall-clock shape with jet's
certification, and near-critical passages traversed instead of guarded away (error ÷2900
at |c| = 1e-14 on the historical (G) block).

## What Changes

- New approximation mode `mobius+` (Rust `ApproximationMode::MobiusCPlus = 4`, TS
  `'mobius'`), end-to-end: Rust table build → worker message → Engine buffers → both
  WGSL paths (shallow f32 + deep floatexp) → Settings mode control → RenderStats label.
- **Build** (Rust, async reference worker): reuses the jet's bivariate-jet levels
  (`jet.rs`: exact D_s = 6 truncated composition, closure) as a build-only tool; per
  block, extracts 5 complex coefficients (A, B, D as today's Padé, plus A' = c₁₁ + B·D
  and D' = −(c₂₁ + D·c₁₁)/A), computes the compensated remainder coefficients q_ij
  (with the build-integrity invariant q₁₀ = q₀₁ = q₂₀ = q₁₁ = q₂₁ = 0), and certifies
  one entry radius r per block via the closed REST/DEN formula + Cauchy tail over
  anisotropic polydiscs, solved by descending geometric scan (the condition is not
  guaranteed monotone). Merge validity chain: r ← min(r_formula, r_x, r_y/(|A_x| + r_y·|D_x|)).
- **Runtime** (WGSL, both shaders): one validity comparison `log2|z| < r` per probed
  block — no H2, no min_a/(G), no beta·dcMag correction, and no separate pole guard
  (DEN > 0.5 is folded into the certified radius). Evaluation is the Padé apply plus two
  cmuls (Ae = A + A'·c, De = D + D'·c). Blocks use per-block shared exponents
  (BlaStep-style, NOT all-floatexp — the measured 2× jet lesson); target ~80 B/block,
  one cache line. The descent reuses this change-family's optimizations (hoisted level
  gates, split radius buffer, level hint).
- **Staged caching** (improving on the note's "regenerate on view change"): coefficients
  keyed by orbit length; q-moduli/majorant bounds keyed by the R_c headroom; radii keyed
  by (ε, c_max) and re-solved in closed form on zoom — same lifecycle as the jet's D6.
- **CPU validation harness first** (gates all shader work): build-integrity q-zeros,
  jet-closure reuse, the historical (G) block test (seahorse, step 26→50, err ≤ ~5e-13
  at |c| = 1e-14), z-channel superconvergence constant, end-to-end ρ_N/(N·ε) ≤ 5 across
  orbit classes, and an application-count census (r_c+ ≥ r_Möbius by construction).
- BLA, Padé and jet modes remain untouched and selectable (benchmark value); `mobius+`
  ships as a fourth mode. Deprecation of Padé/jet is a separate follow-up decision once
  field A/B confirms the note's claims.

## Capabilities

### New Capabilities
- `mobius-cplus-approximation`: the c-augmented Möbius block-skipping mode — certified
  single-radius validity, 5-coefficient block form, build pipeline (jet-based
  coefficient extraction + radius certification), runtime application on both shader
  paths, staged c_max/ε cache lifecycle, and the mandatory validation battery.

### Modified Capabilities
<!-- none — existing modes' requirements are unchanged; mobius+ is additive -->

## Impact

- `reference_calculus/src/jet.rs`: build machinery reused (jet levels, majorant walk);
  new module or section for coefficient extraction + q_ij + radius scan.
- `reference_calculus/src/lib.rs`: `ApproximationMode::MobiusCPlus`, `use_mobius_cplus()`,
  staged table cache + `compute_mobius_reference()` (BufferInfo mirroring the jet's),
  serialization (shared-exponent block records + level directory).
- `src/referenceWorker.ts`, `src/Engine.ts`: third table `kind`, strides, GPU buffers +
  bind groups (new bindings on all three shaders), partial-table acceptance + repost
  throttle (same as jet — the build cost is jet-class, not BLA-class).
- `src/assets/mandelbrot.wgsl`, `mandelbrot_brush.wgsl`, `mandelbrot_debug.wgsl`:
  `try_apply_mobius` (shallow f32 + deep fe), block record struct, descent with hoisted
  gates/radius sidecar/level hint.
- `src/components/Settings.vue`, `RenderStats.vue`, `src/Mandelbrot.ts`,
  `src/types/MandelbrotExposed.ts`: mode plumbing + labels.
- Tests: `cargo test` unit/harness battery; Playwright GPU specs
  (`tests/mobius-mode.spec.ts`, deep variant) mirroring the jet specs.
- Docs: `MANDELBROT_MOBIUS_CPLUS_IMPLEMENTATION.md` companion note at close-out.
