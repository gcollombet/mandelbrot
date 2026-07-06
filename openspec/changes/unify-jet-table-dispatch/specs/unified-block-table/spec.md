# unified-block-table — delta spec

## ADDED Requirements

### Requirement: One build serves every evaluation tier
The build SHALL produce a single block table per reference from the bivariate jet
(D_s = 6 + scalar majorant) whose per-block record supports four evaluation tiers —
affine, Padé [1/1], c-augmented Möbius, and jet — with the tier coefficients stored as
a strict prefix ordering `[A, B, D, A′, D′, raw higher jet coefficients]` so that each
tier reads only its prefix (32/48/80/full bytes). The jet tier SHALL reconstruct
a₂₀ = −D·A and a₂₁ = −D′·A − D·a₁₁ from the stored prefix (verified identities).

#### Scenario: Tier coefficients agree with the standalone modes
- **WHEN** the unified table is built on a test orbit and each tier's coefficients are
  compared against the standalone pade/mobius+/jet builds for the same blocks
- **THEN** every tier's effective coefficients match to floating-point round-off, and
  the reconstruction identities hold to ~1e-11 relative to the identity's operand
  scale on every block (the chains cancel — e.g. c₂₁ = −D′·A − D·c₁₁ with both
  operands ≥ |c₂₁| — so operand scale, which is what the f32 GPU reconstruction
  sees, is the honest denominator)

#### Scenario: Prefix reads
- **WHEN** a block is applied at a given tier
- **THEN** only that tier's coefficient prefix is read from the table (no full-record
  fetch for affine/Padé/c+ applications)

### Requirement: Tiered certified value radii
The build SHALL certify, per block, one value radius PER TIER (log2-domain f32, −∞
sentinel for dead tiers), each individually sound for its own evaluator: the affine
and jet radii from the (V) machinery at orders 1 and 3, the Padé and c+ radii as the
max of their (V) radius and their §12 closed-form radius (per-channel error model —
z-channel C·x² with C = |q₃₀|/|A|; the tier's surviving c-channel residuals; capped by
the pole bound |D|·x ≤ ¼). Radii SHALL NOT be cross-tier clamped: forcing a monotone
ladder is unsound upward (a cheaper tier's boosted radius does not certify a richer
tier's evaluator — D′ over-corrects at large c) and wasteful downward; dispatch
correctness relies only on each tier's own radius covering its own applications.

#### Scenario: Per-tier soundness against exact stepping
- **WHEN** entries sampled below any tier's radius (including closed-form-boosted
  ones) are propagated through the block by that tier's evaluator and compared with
  exact perturbation stepping through the same steps
- **THEN** the relative error stays within the ε error-scale budget on every sampled
  block of the test orbits

#### Scenario: Closed-form boost is measured
- **WHEN** the radii stage completes on a test orbit
- **THEN** the count of blocks where the closed form exceeded the (V) radius (the
  boost) is reported per tier (diagnostic for the tightness model)

### Requirement: Per-block dispatch tag
The build SHALL emit, per block, a tag identifying the cheapest tier whose certified
radius covers the view's working band; the runtime SHALL evaluate the tagged tier
after a single sidecar radius comparison, descending a level on failure as today. Tags
SHALL be block properties (warp-uniform for lanes probing the same slot).

#### Scenario: Quasi-critical blocks tag jet
- **WHEN** a block spans a quasi-critical passage where r_padé = −∞ (the historical
  guard (G)) but r_jet covers the band
- **THEN** the block is tagged jet and traversed, where affine/Padé would force exact
  steps

#### Scenario: Slow blocks tag Padé
- **WHEN** a generic slow-dynamics block's r_padé covers the working band
- **THEN** the block is tagged Padé and the application reads only the 48 B prefix

### Requirement: Census gate before dispatch ships
The change SHALL provide an offline tag census (Rust harness) reporting, per benchmark
view, the tier mix by block count and by predicted application share; the `auto`
dispatch mode SHALL NOT become the default until, on the user's benchmark views,
apps_total(auto) ≤ apps_total(best single mode per view) on the Total-apps indicator
with no visual or DE regression. If the census shows a single tier at ≥95 % of
applications on every view, the fallback SHALL be per-view automatic tier selection
(depth-keyed) instead of per-block tags.

#### Scenario: Census precedes shader work
- **WHEN** Phase A implementation starts
- **THEN** the census numbers for the benchmark views are recorded in design.md before
  the dispatch shader path is written

### Requirement: Reserve gates are explicit
The [K/1] rationalized tier SHALL NOT be implemented unless the census shows the
z-channel bound √(ε/C) as the active radius bound on a material share of
applications; tile-coherent block sequences SHALL NOT be implemented unless
post-dispatch workgroup-waste measurements stay above ×2; the certified
secondary-reference trigger SHALL be scoped out until a multi-reference change
consumes the dead-block census hook.

#### Scenario: Gate check recorded
- **WHEN** any reserve item is proposed for implementation
- **THEN** its gate measurement is recorded in design.md first

### Requirement: Mode picker collapses to auto
The Settings approximation control SHALL offer `auto` (dispatch) and `exact`;
`bla`/`pade`/`jet`/`mobius+` SHALL remain available only as debug overrides. The
RenderStats panel SHALL display the tier mix (share of applications per tier) when
`auto` is active.

#### Scenario: Debug override still renders
- **WHEN** a debug override selects a single legacy mode
- **THEN** rendering behaves as that mode does today (the unified table is a superset;
  the jet override reads full records)
