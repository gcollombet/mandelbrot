# jet-approximation — delta spec

## ADDED Requirements

### Requirement: Jet mode is selectable end-to-end
The system SHALL expose a `jet` approximation mode alongside `perturbation`, `bla` and
`pade`, selectable from the Settings mode control, propagated through Engine and
reference worker to the WASM navigator, and consumed by both the shallow (f32) and deep
(floatexp) shader paths. Selecting `jet` SHALL NOT alter the behaviour of the `bla` or
`pade` modes.

#### Scenario: Mode selection reaches the shader
- **WHEN** the user selects "Jet" in the approximation mode control
- **THEN** the navigator switches to the jet table and both shader paths apply jet
  blocks on the next render, without rebuilding the reference orbit

#### Scenario: Existing modes unaffected
- **WHEN** the user switches back to `bla` or `pade` after using `jet`
- **THEN** rendering output for those modes is bit-identical to before the jet mode
  existed

### Requirement: Exact merge closure
The jet table build SHALL store, per block, the bivariate Taylor jet of the composed
block map truncated at total degree D_s, with seeds exact for the single step
(a₁₀ = 2Zₙ, a₂₀ = 1, a₀₁ = 1) and merges computed as the truncated composition
J_Ds(Y ∘ X). The stored jet SHALL equal the degree-D_s Taylor polynomial of the true
composed block map to within f64/floatexp rounding — there SHALL be no analytic
truncation error at merge time.

#### Scenario: Merged jet matches direct composition
- **WHEN** a level-ℓ block's jet is compared against the jet computed by composing the
  block's underlying exact steps directly at degree D_s
- **THEN** all coefficients agree to relative error at rounding level (no ε-scale
  discrepancy)

### Requirement: Radius soundness (rule V)
For every block and every applied order k ≤ K, the build SHALL compute a validity
radius r_k such that for any entry with |z| < r_k and any pixel with |c| ≤ c_max, the
error of applying the order-k jet instead of the exact block satisfies
|R_k(z,c)| ≤ ½·ε·(|A₁₀|·|z| + |A₀₁|·c_max), derived from the composable scalar majorant
(ρ ← |2Z_j|ρ + ρ² + R_c) and anisotropic Cauchy estimates on the polydisc
(R_z, R_c = s·c_max).

#### Scenario: Remainder bound holds on sampled applications
- **WHEN** jet applications at order k with |z| < r_k are compared against exact
  stepping over a grid of blocks, orders and entry values on a deep reference
- **THEN** the measured remainder never exceeds ½·ε·(|A₁₀|·|z| + |A₀₁|·c_max)

#### Scenario: Majorant bounds the block map
- **WHEN** the true block map is evaluated on sampled points of the polydisc
  |z| ≤ R_z, |c| ≤ R_c
- **THEN** its modulus never exceeds the block's stored majorant M

### Requirement: Single runtime validity test
The jet path in both shader loops SHALL admit a block application using only the
comparison |z| < r_k (log-space on the deep path). The jet path SHALL NOT evaluate the
`min_a` near-critical guard, the H2 c-truncation test, or the `beta` radius correction.

#### Scenario: No auxiliary guards on the jet path
- **WHEN** the jet shader path decides whether to apply a block
- **THEN** the decision depends only on the per-order radii r_k and |z| (plus the
  existing per-level whole-level rejection gate)

### Requirement: Guard subsumption at order 1
The computed radii SHALL reproduce the protective behaviour of the removed guards: on
blocks straddling a near-critical reference step (where the current `min_a` guard
rejects), the order-1 radius SHALL collapse to r₁ = 0 on the majority of such blocks,
and on any such block where (V) still admits order 1 (the guard being a conservative
heuristic while (V) is a computed radius), the order-1 application SHALL verifiably
remain within the ½ε(|A₁₀||z| + |A₀₁|c_max) budget. Orders k ≥ 2 MAY remain positive
and admit the block.

#### Scenario: Near-critical block, order 1 protected
- **WHEN** radii are built for blocks whose steps include |2Z_j| small enough to
  trigger today's `min_a` guard at the current view's c_max and ε
- **THEN** r₁ = 0 on the majority of those blocks; every remaining one passes a direct
  remainder check at |z| = 0.9·r₁; and the CPU harness confirms orders k ≥ 2 pass
  through within the remainder bound

### Requirement: Adaptive-order evaluation with prefix layout
The GPU table SHALL store per block the radii r₁…r_K followed by coefficients sorted by
total degree, such that an order-k application reads only radii plus coefficients of
degree ≤ k. Block selection SHALL be greedy on skip length (per-level gate on r_K),
then choose the smallest k with |z| < r_k for the selected block.

#### Scenario: Far-inside entry uses order 1
- **WHEN** an entry satisfies |z| < r₁ for the selected block
- **THEN** the application evaluates only a₁₀·z + a₀₁·c (affine-sized read and cost)

#### Scenario: Order buys reach
- **WHEN** an entry satisfies r₂ ≤ |z| < r₃ for the selected block
- **THEN** the block is applied at order 3 rather than falling back to a shorter block
  or exact steps

### Requirement: Derivative propagation
Jet block application SHALL update the derivative used for distance estimation from the
same stored coefficients (∂Φ/∂z and ∂Φ/∂c at the applied order), with per-block relative
error at most ε against the exact per-step derivative recurrence.

#### Scenario: Derivative matches exact stepping
- **WHEN** the CPU harness compares the jet-updated derivative against the exact
  per-step derivative across admitted blocks
- **THEN** the relative error per block is ≤ ε

### Requirement: c_max-monotone radius lifecycle
Radii SHALL be built for a per-view bound c_max on the anisotropic polydisc
R_c = s·c_max. When the view's c_max decreases (zoom in), existing radii SHALL remain in
use as valid conservative bounds, with an asynchronous re-solve to recover reach. When
c_max increases but stays ≤ R_c, radii SHALL be re-solved from the stored per-block
scalars (M, S_d) before use, without re-walking the reference orbit. Only c_max > R_c
SHALL trigger a majorant rebuild.

#### Scenario: Zoom in keeps rendering valid
- **WHEN** the user zooms in after the jet table is built
- **THEN** rendering continues with the existing radii (no stall) and radii are
  re-solved in the background

#### Scenario: Moderate zoom out re-solves cheaply
- **WHEN** c_max grows by less than the anisotropy factor s
- **THEN** radii are recomputed from stored (M, S_d) in O(#blocks) scalar work with no
  orbit access

### Requirement: Rebasing compatibility and accumulated error
Jet skipping SHALL compose with Zhuoran rebasing exactly as exact steps do (a block is
never applied across a rebase point), and the end-to-end accumulated error SHALL respect
the O(N·ε) bound: final relative error ≤ e·N·ε·(1 + O(√ε)) on reference orbits
including near-critical passages.

#### Scenario: End-to-end error within theorem bound
- **WHEN** the CPU harness renders seahorse-, Feigenbaum- and near-parabolic-style
  references with jet skipping enabled
- **THEN** the final relative error against pure exact stepping is ≤ e·N·ε

### Requirement: CPU validation precedes shader consumption
A CPU reference loop (sibling of the existing Padé validation loop) SHALL implement the
full jet path (table, radii, adaptive order, derivative, rebasing) and SHALL gate shader
work: the remainder-bound, guard-subsumption, derivative and end-to-end scenarios above
MUST pass on the CPU harness before either WGSL path lands.

#### Scenario: Harness gates shader work
- **WHEN** any of the CPU acceptance scenarios fail
- **THEN** the shader integration tasks are blocked until the failure is resolved
