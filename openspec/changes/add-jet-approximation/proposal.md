# Proposal — add-jet-approximation

## Why

The renderer has two iteration-skipping modes on top of perturbation: **BLA** (affine,
`z ← A·z + B·c`) and **Padé [1/1]** (`z ← (A·z + B·c)/(1 + D·z)`). Both truncate the
bivariate cross terms (`zc`, `c²`, …), and certifying that truncation is what forces the
three runtime guards in the current shaders: the `beta` c-correction, the H2 test
(`|B|·|c| < ε`), and the near-critical guard `min_a` (G). On blocks straddling a
near-critical reference step those guards kill the skip entirely — precisely the regime
(seahorse, Feigenbaum) where skipping would pay most.

The companion note *"Bivariate jets for iteration skipping: exact closure and a single
validity test"* (Jet_bivariate_theorem_EN.tex) replaces the rational block by a
**truncated bivariate Taylor jet** in `(z, c)`. Two structural wins:

1. **Exact closure**: `J_K(g∘f) = J_K(J_K g ∘ J_K f)` — merging two stored jets gives
   exactly the jet of the composed block. No truncation to certify at merge time; the
   cross terms that blow up near critical passages are simply *stored coefficients*.
2. **A single validity test (V)**: a composable scalar majorant (one scalar recurrence
   over the block's `|2Z_j|`) plus anisotropic Cauchy estimates yield one precomputed
   radius `r_k` per block and order. The runtime test collapses to `|z| < r_k` — the
   guards (G), (H2) and `beta` are subsumed (paper, Prop. 4) and disappear from the jet
   path.

Benchmarked in the note against this exact architecture (Zhuoran rebasing, ops convention
matching ours): **×3.9** on seahorse and **×42** on Feigenbaum vs ×2.0/×1.5 for Padé —
the near-critical regimes where the current modes stall. The unfavourable case
(near-parabolic, where lookup cost is the only differentiator) is addressed by
**adaptive-order evaluation from v1**: the low-order jet coefficients *are* the affine
data, so the shader reads/evaluates only the prefix (order 1 ≈ affine cost) when the
entry is far inside the validity region.

## What Changes

- New approximation mode `jet` alongside `perturbation | bla | pade`, end-to-end:
  Rust enum + table build, WGSL shallow (f32) and deep (floatexp) paths, Engine/worker
  plumbing, Settings UI entry.
- Table build (Rust, per reference orbit): bivariate jet seeds (exact at `K ≥ 2`),
  exact hierarchical merges to stored degree `D_s = 6`, per-block scalar majorant walk
  (`ρ ← |2Z_j|ρ + ρ² + R_c` per level, O(N log N) total), per-degree modulus scalars
  `S_d`, and validity radii `r_1…r_K` (K = 3) solved from rule (V) in closed form.
- GPU table layout: coefficients sorted by total degree so an order-k application reads
  only a prefix; radii `r_1…r_3` up front; extended-exponent storage (strategy decided by
  a numerical spike — first task).
- Runtime (both shader paths): level selection greedy on skip via `r_K`, then smallest
  valid order k; polynomial application `Σ a_ij z^i c^j` at order k; derivative update
  from the same coefficients (`∂Φ/∂z`). No `min_a` / H2 / `beta` logic on the jet path.
- `c_max` lifecycle: majorant computed on the anisotropic polydisc `R_c = s·c_max`
  (s ~ 10³) at build; on view change, radii re-solved in closed form from stored
  `(M, S_d)` — no orbit re-walk while `c_max ≤ R_c`; zoom-in never invalidates
  (radii stay conservative).
- CPU validation loop (`jet_full_loop…`, sibling of `pade_full_loop_correct_and_faster`)
  landed *before* any shader work, with the Prop. 4 oracle: at k = 1, (V) must reproduce
  the current guards' decisions (`r_1 = 0` exactly on near-critical blocks).

Existing BLA/Padé paths are untouched (their guards stay as-is); the jet table is
additional, keyed like the current one plus the `c_max`-dependent radii layer.

## Capabilities

### New Capabilities
- `jet-approximation`: bivariate truncated Taylor jet block-jump mode (K = 3, D_s = 6)
  with exact merge closure, rigorously derived per-block/per-order validity radii
  (scalar majorant + anisotropic Cauchy, rule (V)), adaptive-order evaluation, and a
  `c_max`-monotone radius lifecycle. Spec captures the correctness invariants: exact
  closure at merge, radius soundness (remainder ≤ ½ε·(|A₁₀|x + |A₀₁|c_max)), guard
  subsumption at k = 1, prefix-readable table layout, derivative propagation, and
  rebasing compatibility.

### Modified Capabilities
<!-- none — BLA and Padé requirements unchanged; jet is a new mode beside them -->

## Impact

- `reference_calculus/src/lib.rs` — `ApproximationMode` enum (L228), new jet table build
  beside `compute_bla_reference_inner` (L1053), jet seed/merge (sibling of
  `bla_seed`/`bla_merge` L1544/L1559), majorant + radii pass, floatexp conversion
  (sibling of `bla_f64_to_fe` L1592), CPU loop (sibling of `run_pixel_cpu` L2223),
  `use_jet()` binding (L547ff).
- `src/assets/mandelbrot.wgsl` — new jet block struct + buffer, shallow apply (sibling of
  L280–359), deep floatexp apply (sibling of L727–801), mode branching (L314/L755).
- `src/Engine.ts` — `ApproximationMode` type (L345) gains `'jet'`; dispatch (L1939–1964);
  buffer plumbing.
- `src/referenceWorker.ts` — mode plumbing (L184–213); radius re-solve on `c_max` change.
- `src/components/Settings.vue` — mode dropdown (L2684–2697).
- Memory: ~3× current `BlaStep` per block (9 complex coefficients + 3 radii vs
  3 complex + 2 radii + guard).

## Non-Goals

- Unifying BLA/Padé onto the jet table (the order-1 prefix could serve them; deferred —
  three comparable modes have benchmark value for the paper series).
- Replacing the heuristic radii of BLA/Padé with rigorous (V) radii.
- The split z-channel/c-terms evaluation optimisation (paper §5, "identified next
  optimisation") — measured after v1.
- Tuning `s`, `K`, `D_s` beyond the paper's benchmarked defaults (exposed as constants).
