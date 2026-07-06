# certified-series-approximation — delta spec

## ADDED Requirements

### Requirement: Certified pure-c prefix jet
The build SHALL compute the pure-c jet of the orbit prefix (z₀ = 0) by the recurrence
b′_j = 2Z·b_j + Σ b_k·b_{j−k} (+1 on b₁), applied order 4 and stored order 8, with a
certified radius profile r_c(N) from stored terms plus the 1-variable Cauchy tail
(majorant walk ρ ← |2Z|ρ + ρ² + R_c from ρ = 0, scale rungs R_c = s·y with large s).
The table header SHALL carry N₀ = max N such that r_c(N) ≥ c_max.

#### Scenario: Certified skip is sound
- **WHEN** the SA prefix is evaluated at n = N₀ for |c| ≤ c_max and compared against
  exact iteration from 0 to N₀
- **THEN** the relative error is ≤ ε (measured pattern: ~0.003·ε at c_max on the test
  references)

#### Scenario: Profile locates the first quasi-critical passage
- **WHEN** the r_c(N) profile is inspected on a reference with a known quasi-critical
  passage
- **THEN** the profile's collapse point identifies the passage index (diagnostic use)

### Requirement: Compute-request frames start at the certified skip
On compute-request frames, every pixel SHALL start at iteration N₀ with one polynomial
evaluation of the SA prefix in dc (degree 4), replacing the prefix BLA applications
and all prefix rebasing logic. Continuation frames SHALL resume past N₀ with correct
pass-boundary bookkeeping (iteration floor = N₀).

#### Scenario: Prefix applications eliminated
- **WHEN** a benchmark view renders with SA enabled vs disabled
- **THEN** apps_total drops by at least the census-predicted prefix share, with
  pixel-diff within the block-sampling floor

#### Scenario: No historical SA glitches
- **WHEN** views that historically glitched under non-certified series approximation
  render with SA enabled
- **THEN** output matches the SA-disabled render within the sampling floor (the radius
  is certified, truncation cannot glitch)
