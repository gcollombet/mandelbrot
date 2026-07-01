# Tasks — add-jet-approximation

## 1. Spike — coefficient exponent dynamics (D7, gates the GPU layout)

- [ ] 1.1 Build degree-6 bivariate jets (f64 mantissa + i64 exponent per coefficient) over real deep orbits (seahorse-depth f32 path and a floatexp-depth view), logging per-coefficient exponents across blocks and levels
- [ ] 1.2 Measure exponent spread within each total-degree group; decide per-coefficient vs per-degree-group exponents for the GPU table and record the decision + data in design.md (D7)

## 2. Rust — jet table build

- [ ] 2.1 Add `JetF64` (build-side) and the truncated bivariate ops: product, powers, and composition at total degree D_s = 6, with unit tests against direct polynomial expansion of 2–3 composed exact steps (Lemma 1 closure, rounding-level agreement)
- [ ] 2.2 Add jet seed (a₁₀ = 2Zₙ, a₂₀ = 1, a₀₁ = 1) and hierarchical merge pass reusing the existing level scaffold of `compute_bla_reference_inner` (levels, offsets, min-skip trimming)
- [ ] 2.3 Implement the scalar majorant walk per block per level (ρ ← |2Z_j|ρ + ρ² + R_c) over the R_z candidate grid, R_c = s·c_max; unit test: M bounds sampled |Φ_L| on the polydisc
- [ ] 2.4 Compute per-degree scalars S_d (d = 2…D_s) and solve rule (V) by bisection for r₁, r₂, r₃ per block, maximised over the R_z grid; keep (M, S_d, R_z, R_c, c_max_build) CPU-side per block
- [ ] 2.5 Add `ApproximationMode::Jet`, `use_jet()` binding, and table caching/invalidation (coefficients keyed like today; radii carry the c_max stamp)

## 3. Rust — CPU validation harness (gates all shader work)

- [ ] 3.1 Implement `jet_full_loop` (sibling of `pade_full_loop_correct_and_faster`): adaptive-order skip (greedy skip via r_K, then smallest valid k), exact-step fallback, rebasing, derivative update from stored coefficients
- [ ] 3.2 Remainder-bound test: sampled (block × order × entry grid) applications stay within ½ε(|A₁₀||z| + |A₀₁|c_max) on deep references
- [ ] 3.3 Prop. 6 oracle test: r₁ = 0 exactly on blocks where the current `min_a` guard fires; r₂, r₃ > 0 pass through them within the bound
- [ ] 3.4 Derivative test: jet-updated der vs exact per-step derivative, relative error ≤ ε per admitted block
- [ ] 3.5 End-to-end error test: final relative error ≤ e·N·ε on seahorse-, Feigenbaum- and near-parabolic-style references
- [ ] 3.6 Ops accounting (exact 2, order k: k(k+3)/2) and speedup report vs BLA/Padé on the same references; sanity-check against the paper's benchmark shape

## 4. Rust → GPU — table serialization

- [ ] 4.1 Define the GPU block layout per D1/D7 (radii r₁…r₃ log-space first, coefficients degree-sorted, chosen exponent scheme) in a dedicated storage buffer (not widening `BlaStep`)
- [ ] 4.2 Implement `jet_f64_to_fe` conversion + buffer export through the existing navigator/worker plumbing; round-trip test (serialize → deserialize → coefficients match)

## 5. WGSL — shallow path (f32)

- [ ] 5.1 Add jet buffer binding + block struct access helpers; extend mode branching for `jet` (shallow loop)
- [ ] 5.2 Implement shallow jet application: per-level gate on r₃, smallest-valid-order cascade, prefix-read polynomial evaluation, derivative update; no min_a/H2/beta on this path
- [ ] 5.3 Difference-mode validation vs CPU harness output on shallow views (per-pixel |z_gpu − z_cpu| within tolerance); visual A/B vs bla/pade

## 6. WGSL — deep path (floatexp)

- [ ] 6.1 Implement deep jet application: log-space radius cascade, floatexp polynomial evaluation with the chosen exponent scheme, derivative update
- [ ] 6.2 Deep-view validation: difference mode vs exact perturbation on floatexp-depth views including a near-critical reference; confirm order-1 dominance on near-parabolic-style views (bandwidth guard)

## 7. Engine / worker / UI

- [ ] 7.1 Add `'jet'` to `ApproximationMode` in Engine.ts, dispatch in `setApproximationMode`, and referenceWorker plumbing (`applyApproximationMode`)
- [ ] 7.2 Implement the c_max lifecycle in the worker: lazy async re-solve on zoom-in (≥4× drop), eager cheap re-solve on zoom-out within R_c, majorant rebuild beyond R_c
- [ ] 7.3 Add "Jet" to the Settings.vue mode control; persist in presets/settings like existing modes
- [ ] 7.4 Verify mode switching bla ↔ pade ↔ jet leaves bla/pade rendering unchanged and does not rebuild the reference orbit

## 8. Bench & close-out

- [ ] 8.1 Measure table build time (merges + majorant + radii) on shallow and 1M-iteration orbits; confirm async worker masks it; parallelise per level if needed
- [ ] 8.2 Wall-clock benchmark jet vs bla vs pade on seahorse / Feigenbaum / near-parabolic / spiral views; record results in design.md
- [ ] 8.3 Document the mode in MANDELBROT_PADE_IMPLEMENTATION.md (or a sibling JET doc): layout, radii machinery, lifecycle, benchmark table
