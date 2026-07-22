## ADDED Requirements

### Requirement: Reference certificate observability
The Performance panel SHALL expose enough state to distinguish a sound but pessimistic static certificate from missing coverage or a forbidden viewport-only rebuild.

#### Scenario: Reference-owned radial table is active
- **WHEN** Auto renders with the radial certificate layout
- **THEN** the panel shows the layout version, intrinsic-per-block/cmax-independent status, committed reference coverage, and certificate build cause

#### Scenario: Radial-v3 has no global out-of-domain state
- **WHEN** current viewport `cmax` changes while layout v3 remains active
- **THEN** the panel does not report a viewport-wide `HORS DOMAINE` state and leaves rejection attribution to intrinsic block caps

### Requirement: Radial rejection instrumentation
When detailed dynamic-certificate statistics are enabled, the system SHALL separately report Affine acceptance, intrinsic-cap rejection, rational-pole rejection, summary-prefilter rejection, and exact fallback. Disabled detailed instrumentation SHALL not add its per-attempt atomic accounting to the ordinary render path.

#### Scenario: Radial candidate rejects
- **WHEN** a radial tier fails because `delta-z` or `delta-c` exceeds its cap while detailed statistics are enabled
- **THEN** the radial-cap rejection counter increments and the failure is not attributed to a pole or missing table

#### Scenario: Instrumentation is disabled
- **WHEN** ordinary rendering runs without detailed certificate statistics
- **THEN** the specialized diagnostic atomics are absent from the active pipeline variant

### Requirement: Viewport-only rebuild regression counter
The system SHALL maintain a certificate-build count attributed to reference growth and a separate viewport-only block-certificate rebuild count. The viewport-only count SHALL remain zero throughout navigation that retains the same reference and certificate epoch.

#### Scenario: Same-reference navigation
- **WHEN** the user zooms, translates, or rotates without changing the reference or certificate epoch
- **THEN** the viewport-only block-certificate rebuild count remains zero

#### Scenario: Reference extends
- **WHEN** reference growth completes new blocks and their certificates
- **THEN** the reference-growth certificate count increases without incrementing the viewport-only counter
