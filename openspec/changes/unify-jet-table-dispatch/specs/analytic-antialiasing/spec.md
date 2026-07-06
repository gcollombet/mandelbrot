# analytic-antialiasing — delta spec

## ADDED Requirements

### Requirement: Second-derivative propagation through blocks
The iteration kernel SHALL, when analytic AA is enabled, propagate (z, z′, z″) through
block applications using the closed per-block derivative formulas (m_z, m_c and their
z-derivatives for the applied tier) and through exact steps, tracking the minimum
Taylor margin |z′|/(|z″|·δ) with δ the sub-pixel half-extent. The z″ state SHALL live
in registers within a pass and in dedicated raw-state layers across passes, allocated
only when analytic AA is enabled.

#### Scenario: Block propagation matches stepping
- **WHEN** (z′, z″) propagated through a block application is compared against exact
  step-by-step propagation on test orbits
- **THEN** the relative deviation is ≤ ~1e-12 (measured pattern 1e-13)

### Requirement: Taylor payload delivered to the color pass
The compute/resolve path SHALL, for escaped pixels with sufficient margin, deliver a
per-pixel Taylor payload (escape z — already in the neutral layers —, z′, z″, margin)
to the resolved neutral texture the color pass reads; payload layers SHALL exist only
in the AA-enabled pipeline permutation.

#### Scenario: Payload written once per converged pixel
- **WHEN** a pixel escapes with margin above threshold under analytic AA
- **THEN** its Taylor payload is available to every subsequent color pass without
  re-running iteration for that pixel

### Requirement: Subsample expansion and accumulation happen in color space
The color pass SHALL, per AA sample index, reconstruct the subsample value
ẑ(δᵢ) = z + z′·δᵢ + ½·z″·δᵢ² inline, derive the subsample's coloring inputs from ẑ
(smooth iteration via the log-log formula, escape-z texture coordinates), run the
normal coloring path on them, and accumulate in linear RGB exactly as the existing AA
accumulation does. Averaging of iteration values or z values before color mapping
SHALL NOT be used as an AA mechanism.

#### Scenario: Analytic sample colors match re-iterated sample colors
- **WHEN** an escaping pixel with margin above threshold is colored for AA sample i
  analytically and compared against the same jitter re-iterated from scratch
- **THEN** the accumulated linear color difference is within the second-order Taylor
  error bound (visually indistinguishable at the measured 5e-6..1.5e-3 escape error)

#### Scenario: Accumulation stays gamma-correct
- **WHEN** analytic subsamples are accumulated
- **THEN** they flow through the existing linear-space additive path (sRGB conversion
  at present time only), identical to re-iterated samples

### Requirement: Reseed stamps only margin-failing frontier pixels
When analytic AA is enabled, the AA reseed pass SHALL stamp fresh-compute requests
only on pixels whose Taylor margin failed the threshold (~5); margin-OK pixels SHALL
NOT be re-iterated for AA samples. The frontier fraction SHALL be reported in the AA
stats.

#### Scenario: Frontier pixels keep the exact path
- **WHEN** a pixel near the set boundary yields a margin below threshold
- **THEN** it is reseeded and re-iterated per sample under the existing adaptive AA
  machinery, and its samples accumulate identically to today

#### Scenario: Orbit re-iteration eliminated off the frontier
- **WHEN** a benchmark view renders 16× AA with analytic AA on vs off
- **THEN** apps_total for AA samples drops to ~the frontier fraction of its previous
  value (expected 1–10 %), with the final image within the second-order bound

### Requirement: SA prefix shared across subsamples
When both certified SA and analytic AA are active, the AA subsamples SHALL share the
SA prefix evaluation (the prefix is a polynomial in c; per-subsample cost is one
polynomial evaluation, no per-subsample prefix iteration) for the frontier pixels that
do re-iterate.

#### Scenario: Subsample prefix cost is polynomial-only
- **WHEN** a frontier pixel re-iterates for AA sample i on a tile with SA active
- **THEN** it does not iterate the prefix range [0, N₀)
