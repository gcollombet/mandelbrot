# derivative-certified-radii — delta spec

## ADDED Requirements

### Requirement: Derivative remainder bound per block and tier
The build SHALL certify, per block and per tier, a derivative radius r′ from the
differentiated remainder: stored-term contribution Σ_{d>k} d·T_d(x, c_max)/x plus the
differentiated Cauchy tail (same scalar majorant M, one power down, degree factor),
under condition (V′): derivative remainder ≤ ½·ε·(derivative scale), with the scale
including the c channel (mirroring the (V) scale lesson). Radii SHALL be found by the
same descending scan machinery as (V).

#### Scenario: Derivative radius soundness
- **WHEN** a block is applied at entry |z| < r′ with |c| ≤ c_max and the propagated
  derivative is compared against exact step-by-step derivative propagation
- **THEN** the relative derivative error contributed by the block is ≤ ε within the
  certified band, on every sampled block of the test orbits including quasi-critical
  ones

#### Scenario: Value-only radii unchanged
- **WHEN** a render has distance estimation disabled
- **THEN** dispatch uses the value radii r alone and application counts are unchanged
  by this capability

### Requirement: DE-enabled dispatch uses min(r, r′)
When distance estimation is enabled, the radii-derivation stage SHALL store
min(r, r′) per block and tier in the sidecar consumed by the runtime, so the shader
performs no additional comparisons; the DE flag SHALL be part of the radii cache key.

#### Scenario: Honest DE at depth
- **WHEN** a deep DE-enabled view renders under `auto` dispatch
- **THEN** every applied block satisfied its derivative radius, and the DE layer is
  stable run-to-run within the determinism spec of the der state

#### Scenario: Toggling DE re-derives radii only
- **WHEN** the user toggles DE at constant reference and view
- **THEN** only the radii stage of the staged cache re-runs (coefficients and bounds
  stages stay warm)
