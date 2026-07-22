## ADDED Requirements

### Requirement: Reference-owned intrinsic certificate domains
The system SHALL derive `delta-c` certificate caps from each immutable reference block and SHALL NOT use viewport `cmax` as a block-certificate construction or acceptance input. Viewport zoom, rotation, translation, or `maxIter` reduction SHALL NOT rebuild block-indexed bounds or certificates while the reference epoch remains unchanged.

#### Scenario: Descending zoom reuses intrinsic domains
- **WHEN** the viewport zooms inward while retaining the same reference
- **THEN** every previously published block certificate remains resident and no block-indexed bound or certificate is recomputed

#### Scenario: Translation uses actual delta-c
- **WHEN** the viewport translates without changing the reference epoch
- **THEN** the same certificate records are evaluated with each pixel's actual `delta-c` and no viewport-wide domain is rebuilt

#### Scenario: View leaves the domain
- **WHEN** a pixel's `delta-c` lies outside every certificate domain for its candidate block
- **THEN** that block is rejected and the pixel continues with a lower block level or exact perturbation

### Requirement: Reference-growth-only certificate construction
The system SHALL construct block-indexed coefficients and certificates only for newly completed blocks of the current reference, or after an explicit certificate epoch change such as a new reference, epsilon, precision epoch, maximum skip, or record version.

#### Scenario: Reference orbit grows
- **WHEN** a new reference chunk completes additional dyadic blocks
- **THEN** the system appends certificates for only those new blocks and does not reconstruct certificates for an already committed prefix

#### Scenario: Viewport-only update
- **WHEN** scale, angle, center, or viewport dimensions change without changing the reference epoch
- **THEN** the number of constructed block certificates remains unchanged

#### Scenario: Epsilon changes
- **WHEN** the approximation error tolerance changes
- **THEN** the system starts a new certificate epoch and does not combine old-epsilon certificates with new-epsilon coefficients or directory commits

### Requirement: Conservative radial certificate
For every non-affine radial tier and block, the system SHALL derive finite `delta-z` and `delta-c` caps from an intrinsic Cauchy source and a normalized `thetaMax <= 1/2`. The derivation SHALL jointly enforce value error, derivative error, pure-`delta-c` error, intrinsic-source containment, and rational pole safety where applicable.

#### Scenario: Pixel lies inside both caps
- **WHEN** a finite pixel state satisfies the radial `delta-z` cap, radial `delta-c` cap, and all tier-specific guards
- **THEN** the tier may apply the block only if the build-side proof guarantees the configured epsilon for both value and propagated derivative channels

#### Scenario: One cap fails
- **WHEN** either actual magnitude exceeds its certified cap
- **THEN** the tier rejects the block without applying an approximate state transition

#### Scenario: Non-finite proof input
- **WHEN** a proof constant or runtime logarithmic magnitude is NaN or otherwise invalid
- **THEN** the certificate rejects conservatively

### Requirement: Tier-specific certificate policy
The system SHALL use the reference-owned `alpha - beta * |delta-c|` certificate for Affine and SHALL use the conservative radial proof for Padé, Möbius-c+, and Jet in the initial radial layout. Rational tiers SHALL additionally prove denominator separation.

#### Scenario: Affine candidate
- **WHEN** Auto evaluates an Affine block
- **THEN** it uses the block's immutable alpha/beta data and the pixel's actual `|delta-c|` without consulting a viewport-keyed Cauchy bank

#### Scenario: Padé candidate
- **WHEN** Auto evaluates a Padé block under the initial radial layout
- **THEN** it requires the plain-rational radial value/derivative proof and pole guard rather than treating the legacy heuristic guards as a complete certificate

#### Scenario: Cheapest-first fallback
- **WHEN** an earlier tier rejects a block
- **THEN** Auto may test the next certified tier and SHALL ultimately use exact perturbation if no tier accepts

### Requirement: Two-candidate intrinsic Pareto frontier
Radial layout v3 SHALL publish at most two intrinsic candidates per non-affine block/tier: the widest-`delta-c` endpoint and the widest-effective-`delta-z` endpoint of the non-dominated frontier. Candidate construction SHALL be independent of viewport state.

#### Scenario: Radial-v3 record
- **WHEN** a radial certificate is serialized under layout version 3
- **THEN** the record contains no viewport-selected bank or octave-rung identifier

#### Scenario: Pareto endpoint selection
- **WHEN** source rectangles include a wide-`delta-c`/narrow-`delta-z` tradeoff and a narrow-`delta-c`/wide-`delta-z` tradeoff
- **THEN** both useful endpoints may be retained while every dominated rectangle is discarded

#### Scenario: Both candidates reject
- **WHEN** a pixel lies outside both stored candidates
- **THEN** the system rejects conservatively rather than synthesizing or rebuilding a viewport-specific candidate

### Requirement: Versioned matched publication
The system SHALL expose coefficients and certificates through a versioned append-only range contract and SHALL commit a GPU-visible level prefix only after both matching payloads for that prefix are queued under the same reference id, table generation, epsilon epoch, and layout version.

#### Scenario: Certificate lags coefficient construction
- **WHEN** coefficients exist for a suffix whose radial certificates are not complete
- **THEN** the level directory does not expose that suffix and rendering uses already committed blocks or exact perturbation

#### Scenario: Stale worker payload arrives
- **WHEN** a payload has an obsolete reference id, table generation, epsilon epoch, stride, or layout version
- **THEN** Engine drops it without modifying committed buffers or directories

#### Scenario: Capacity grows
- **WHEN** append-only storage requires larger GPU buffers
- **THEN** committed coefficient/certificate prefixes are copied consistently and become visible together through one bind-group replacement

### Requirement: Optional headers remain independent
Viewport-keyed optional shortcut headers SHALL remain independent from block-indexed radial certificates and SHALL NOT invalidate or republish the certificate table.

#### Scenario: Header refresh on navigation
- **WHEN** navigation requires a new SA, periodic, or gate header for the same reference
- **THEN** only the optional header payload and its revision change
