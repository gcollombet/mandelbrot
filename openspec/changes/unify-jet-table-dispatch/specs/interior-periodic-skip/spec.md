# interior-periodic-skip — delta spec

## ADDED Requirements

### Requirement: Period block composed from the table
The build SHALL detect reference periodicity after the transient
(|Z_{n+p} − Z_n| < tolerance) and, when found, compose the period block Φ_p from
existing table levels (no additional build pass), storing period start, p, and the
composed coefficients.

#### Scenario: Periodic reference detected
- **WHEN** the reference orbit is attracted to a p-cycle within the computed length
- **THEN** the table records (start, p, Φ_p), and non-periodic references record none

### Requirement: Certified interiority at cost O(p)
For a pixel in the periodic phase with delta z, the runtime SHALL solve the fixed
Möbius data (fixed points ζ± from De·z² + (1−Ae)·z − Bc = 0, one csqrt; multiplier
κ = (Ae − Bc·De)/(De·ζ + 1)²); when |κ| < 1 and the conjugated w₀ lies in the
attracting basin, the pixel SHALL be colored interior immediately with period p and
multiplier κ (interior distance estimation), instead of iterating to maxiter.

#### Scenario: Interior disk colored at O(p)
- **WHEN** a view over a hyperbolic component interior renders with the capability
  enabled
- **THEN** interior pixels resolve in O(p) applications instead of maxiter, the
  measured |κ| matches the component's cycle multiplier, and coloring matches the
  maxiter render

#### Scenario: Contraction keeps iterates certified
- **WHEN** the interior verdict is reached
- **THEN** every implied intermediate iterate remains within the period block's
  certified radius (guaranteed by |z_j − ζa| decreasing under contraction)

### Requirement: Exterior fast-forward is debug-gated until validated deep
The runtime SHALL, for |κ| ≥ 1 (or w₀ on the repelling side), support fast-forwarding
k* = log(w_threshold/|w₀|)/log|κ| periods in closed form (one cpow) and resume normal
skipping via rebase; this branch SHALL ship behind a debug flag and SHALL NOT be
enabled by default until validated at real deep zoom (findings §17 caveat d), with k*
bounded so intermediate iterates stay within the certified block radius.

#### Scenario: Fast-forward resynchronizes by rebase
- **WHEN** the debug-gated fast-forward fires and overshoots by O(1) periods
- **THEN** the subsequent rebase resynchronizes the orbit and the final coloring
  matches the non-fast-forwarded render
