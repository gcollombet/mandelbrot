## ADDED Requirements

### Requirement: Static certified validity envelope
The unified build SHALL produce, for every emitted block and evaluation tier, a compact validity envelope whose proof data is independent of the instantaneous viewport `c_max` and is valid within an explicit reference-domain `|dc|` ceiling. The envelope SHALL conservatively combine value remainder, derivative remainder, pure-`c`, static-domain, Cauchy-tail, and rational-pole constraints applicable to that tier.

#### Scenario: View moves inside the certified domain
- **WHEN** the viewport changes while the reference, epsilon, covered orbit prefix, and certified `|dc|` ceiling remain unchanged
- **THEN** block coefficients and validity envelopes remain reusable and no block bounds/radii rebuild is scheduled

#### Scenario: Pixel exceeds the certified domain
- **WHEN** a pixel has `|dc|` outside every certified envelope candidate for a block
- **THEN** that block is rejected without applying approximate state and dispatch descends or uses exact perturbation

### Requirement: Per-pixel dynamic radius evaluation
The runtime SHALL evaluate block validity from the pixel's actual `log2(|dc|)` and current `log2(|dz|)` in both shallow and deep paths. The computed radius SHALL never exceed the radius certified by the serialized constraints for that `(block, tier, |dc|)` state.

#### Scenario: Pixel near the reference
- **WHEN** two pixels probe the same block with equal `|dz|` but one has a smaller `|dc|`
- **THEN** the smaller-`|dc|` pixel receives a validity radius no smaller than the larger-`|dc|` pixel, subject to the same static-domain candidate

#### Scenario: Deep floatexp perturbation
- **WHEN** `dc` or `dz` cannot be represented as a normal plain `f32`
- **THEN** the runtime derives log magnitudes from floatexp mantissas and exponents and obtains the same accept/reject result as the CPU certificate mirror within conservative rounding

### Requirement: Dynamic tier choice at the largest applicable skip
For a candidate block at the largest aligned level, Auto dispatch SHALL evaluate tiers in increasing application cost and apply the cheapest tier whose dynamic value, derivative, domain, and pole constraints all pass. Dispatch SHALL descend to a smaller skip only when no tier is valid at the current skip.

#### Scenario: Multiple tiers valid at one skip
- **WHEN** affine and Jet are both dynamically valid for the same block and skip
- **THEN** Auto applies affine and loads no coefficient suffix required only by richer tiers

#### Scenario: Rich tier wins before level descent
- **WHEN** no cheap tier is valid at a large skip but Jet is valid there
- **THEN** Auto applies the Jet block instead of descending to find a cheaper tier at a smaller skip

### Requirement: Value and derivative soundness
Every dynamically accepted block SHALL satisfy both its value-error and derivative-error certificate for the actual pixel state. The effective dynamic radius SHALL be the conservative intersection of both certificates, independent of whether distance-estimation presentation is currently visible.

#### Scenario: CPU referee sweep
- **WHEN** accepted states are sampled across benchmark orbits, tiers, skips, logarithmic `|dc|` values, and radii near each dynamic boundary
- **THEN** exact step-by-step propagation confirms value and derivative errors within the configured epsilon budget for every accepted sample

### Requirement: Rational pole and pure-c rejection
Padé and Möbius c+ tiers SHALL dynamically enforce a certified lower bound on denominator magnitude, and every tier SHALL reject a pixel whose pure-`c` remainder exceeds its allocated error budget even when `|dz|` is zero.

#### Scenario: Rational state approaches a pole
- **WHEN** the dynamic denominator bound falls below the configured safety margin
- **THEN** the rational tier is rejected before division and another tier, level, or exact step is used

#### Scenario: Pure-c budget fails
- **WHEN** a pure-`c` constraint exceeds its error budget for the pixel's actual `|dc|`
- **THEN** that tier is rejected regardless of its `|dz|` radius lines

### Requirement: Conservative serialization
Validity-envelope serialization SHALL round every value in the conservative direction, SHALL preserve an explicit dead/unavailable sentinel, and SHALL have a CPU decoder that reproduces the exact values consumed by WGSL.

#### Scenario: Packed envelope audit
- **WHEN** an f64 proof envelope is serialized and decoded through the GPU-format mirror
- **THEN** every decoded radius constraint is equal or stricter, every decoded pure-`c` threshold is equal or stricter, and no dead candidate becomes live

### Requirement: Exact fallback and frame continuity
Failure or absence of a dynamic certificate SHALL only reduce acceleration. It SHALL NOT prevent pixel completion, read uninitialized table data, clear an otherwise valid render history, or alter exact perturbation/rebase semantics.

#### Scenario: Dynamic metadata arrives after exact work
- **WHEN** pixels have already progressed or completed in exact perturbation before matching envelope data arrives
- **THEN** completed state remains valid and unfinished continuations may begin using the new table without a blank frame

### Requirement: Dynamic validity observability and performance gate
Debug statistics SHALL report dynamic tier attempts/accepts, skip distribution, certificate rejection reasons, exact fallback, envelope bytes per block, and whether any block rebuild was caused solely by `c_max`. Dynamic Auto SHALL NOT become the default until benchmark navigation has zero cmax-only block rebuilds, no correctness regression, bounded table memory, and iteration-pass p95 no worse than legacy Auto.

#### Scenario: Continuous navigation benchmark
- **WHEN** the benchmark moves and zooms within one reference's certified domain
- **THEN** statistics report zero coefficient/bounds/radius rebuilds caused solely by `c_max`, while GPU and frame-time comparisons against legacy Auto are recorded

