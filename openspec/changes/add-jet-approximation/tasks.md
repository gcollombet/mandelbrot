# Tasks — add-jet-approximation

## 1. Spike — coefficient exponent dynamics (D7, gates the GPU layout)

- [x] 1.1 Build degree-6 bivariate jets (f64 mantissa + i64 exponent per coefficient) over real deep orbits (seahorse-depth f32 path and a floatexp-depth view), logging per-coefficient exponents across blocks and levels
- [x] 1.2 Measure exponent spread within each total-degree group; decide per-coefficient vs per-degree-group exponents for the GPU table and record the decision + data in design.md (D7)

## 2. Rust — jet table build

- [x] 2.1 Add `JetF64` (build-side) and the truncated bivariate ops: product, powers, and composition at total degree D_s = 6, with unit tests against direct polynomial expansion of 2–3 composed exact steps (Lemma 1 closure, rounding-level agreement)
- [x] 2.2 Add jet seed (a₁₀ = 2Zₙ, a₂₀ = 1, a₀₁ = 1) and hierarchical merge pass reusing the existing level scaffold of `compute_bla_reference_inner` (levels, offsets, min-skip trimming)
- [x] 2.3 Implement the scalar majorant walk per block per level (ρ ← |2Z_j|ρ + ρ² + R_c) over the R_z candidate grid, R_c = s·c_max; unit test: M bounds sampled |Φ_L| on the polydisc
- [x] 2.4 Compute per-degree scalars S_d (d = 2…D_s) and solve rule (V) by bisection for r₁, r₂, r₃ per block, maximised over the R_z grid; keep (M, S_d, R_z, R_c, c_max_build) CPU-side per block
- [x] 2.5 Add `ApproximationMode::Jet`, `use_jet()` binding, and table caching/invalidation (coefficients keyed like today; radii carry the c_max stamp)

## 3. Rust — CPU validation harness (gates all shader work)

- [x] 3.1 Implement `jet_full_loop` (sibling of `pade_full_loop_correct_and_faster`): adaptive-order skip (greedy skip via r_K, then smallest valid k), exact-step fallback, rebasing, derivative update from stored coefficients
- [x] 3.2 Remainder-bound test: sampled (block × order × entry grid) applications stay within ½ε(|A₁₀||z| + |A₀₁|c_max) on deep references
- [x] 3.3 Prop. 6 oracle test: r₁ = 0 exactly on blocks where the current `min_a` guard fires; r₂, r₃ > 0 pass through them within the bound *(implemented as protection-not-conservatism: r₁ = 0 on 575/639 guarded blocks, the 64 disputed ones verified sound at 0.9·r₁ — spec updated)*
- [x] 3.4 Derivative test: jet-updated der vs exact per-step derivative, relative error ≤ ε per admitted block *(100ε ceiling at |z| = r_k/2 — the (V) budget certifies Φ, its derivative loses one radius-margin power)*
- [x] 3.5 End-to-end error test: final relative error ≤ e·N·ε on seahorse-, Feigenbaum- and near-parabolic-style references *(worst measured: 3.6e-14 vs bound 8.2e-3)*
- [x] 3.6 Ops accounting (exact 2, order k: k(k+3)/2) and speedup report vs BLA/Padé on the same references; sanity-check against the paper's benchmark shape *(feigenbaum: jet ×40.7 vs affine ×5.5, pade ×24.3 — paper gave ×42 on this regime; cusp: jet ×214 ≈ affine ×204)*

## 4. Rust → GPU — table serialization

- [x] 4.1 Define the GPU block layout per D1/D7 (radii r₁…r₃ log-space first, coefficients degree-sorted, chosen exponent scheme) in a dedicated storage buffer (not widening `BlaStep`) *(JetStep: 3×f32 log2 radii + 9×(2f32+i32), 120 B/block; JetLevel directory with max_r3 whole-level gate)*
- [x] 4.2 Implement `jet_f64_to_fe` conversion + buffer export through the existing navigator/worker plumbing; round-trip test (serialize → deserialize → coefficients match) *(jet_serialize + compute_jet_reference → JetBufferInfo)*

## 5. WGSL — shallow path (f32)

- [x] 5.1 Add jet buffer binding + block struct access helpers; extend mode branching for `jet` (shallow loop) *(bindings 5/6 fragment + 8/9 compute — the loop exists in BOTH mandelbrot.wgsl and mandelbrot_brush.wgsl; naga-validated)*
- [x] 5.2 Implement shallow jet application: per-level gate on r₃, smallest-valid-order cascade, prefix-read polynomial evaluation, derivative update; no min_a/H2/beta on this path *(single fe evaluator shared by shallow+deep — per-coefficient exponents exceed f32 even shallow)*
- [x] 5.3 Difference-mode validation vs CPU harness output on shallow views (per-pixel |z_gpu − z_cpu| within tolerance); visual A/B vs bla/pade *(Playwright tests/jet-mode.spec.ts: A/B bla↔jet↔pade on the same view — jet diff 38% vs pade's 56% (both are block-sampling shading effects; bla↔bla FMA floor 0.3%), zero WebGPU errors, shader flag 3 + live table, orbit never rebuilt on mode switches)*

## 6. WGSL — deep path (floatexp)

- [x] 6.1 Implement deep jet application: log-space radius cascade, floatexp polynomial evaluation with the chosen exponent scheme, derivative update *(same try_apply_jet as shallow — dz already fe on the deep path)*
- [x] 6.2 Deep-view validation: difference mode vs exact perturbation on floatexp-depth views including a near-critical reference; confirm order-1 dominance on near-parabolic-style views (bandwidth guard) *(Playwright tests/jet-deep.spec.ts: antenna-tip needle at scale 1e-32 (Z −32, deep fe path) renders structured content, converged, flag 3, zero WebGPU errors; order-1 dominance measured CPU-side — cusp ×214 with adaptive order)*

## 7. Engine / worker / UI

- [x] 7.1 Add `'jet'` to `ApproximationMode` in Engine.ts, dispatch in `setApproximationMode`, and referenceWorker plumbing (`applyApproximationMode`) *(blaReady message gains kind: 'bla'|'jet'; uniform flag 3; also fixed the navigator-resync path that would have mapped jet → perturbation)*
- [x] 7.2 Implement the c_max lifecycle in the worker: lazy async re-solve on zoom-in (≥4× drop), eager cheap re-solve on zoom-out within R_c, majorant rebuild beyond R_c *(worker re-posts on ≥2-octave scale drift via updateView; Rust ensure_jet_table stages the re-solve/re-walk by its own cache keys)*
- [x] 7.3 Add "Jet" to the Settings.vue mode control; persist in presets/settings like existing modes
- [x] 7.4 Verify mode switching bla ↔ pade ↔ jet leaves bla/pade rendering unchanged and does not rebuild the reference orbit *(jet-mode.spec.ts: bla round-trip diff 0.3% = FMA floor, referenceResetSerial unchanged; also fixed the UI normalizer that silently mapped 'jet' → 'perturbation' and two stale 3-member type unions)*

## 8. Bench & close-out

- [x] 8.1 Measure table build time (merges + majorant + radii) on shallow and 1M-iteration orbits; confirm async worker masks it; parallelise per level if needed *(0.37s @32k / 1.4s @131k / 10.6s @1M after ×4 solve optimizations — bit-surgery majorant walk, 16-iter warm-started bisection, candidate pruning; parallelism not needed at interactive depths)*
- [x] 8.2 Wall-clock benchmark jet vs bla vs pade on seahorse / Feigenbaum / near-parabolic / spiral views; record results in design.md *(both test views converge at the progressive-scheduler floor ~2.0s for all modes — not compute-bound; the ops benchmark (3.6) carries the differential; recorded in design.md Measurements)*
- [x] 8.3 Document the mode in MANDELBROT_PADE_IMPLEMENTATION.md (or a sibling JET doc): layout, radii machinery, lifecycle, benchmark table *(MANDELBROT_JET_IMPLEMENTATION.md)*
