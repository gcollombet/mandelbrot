## ADDED Requirements

### Requirement: Progressive Auto certificate reuse
The progressive render pipeline SHALL retain a committed reference-owned Auto coefficient/certificate table across viewport-only navigation. It SHALL NOT clear, replace, or temporarily disable that table solely because scale, center, angle, viewport dimensions, or a lower `maxIter` changed.

#### Scenario: Zoom while certificates are resident
- **WHEN** the viewport zooms with the same reference and table generation
- **THEN** the next dispatch uses the existing committed certificates immediately and evaluates them against the new per-pixel `delta-c`

#### Scenario: Translation crosses intrinsic block caps
- **WHEN** a translation places some pixels outside both intrinsic candidates of a block
- **THEN** other pixels may continue to use committed blocks while rejected pixels fall back conservatively without a table rebuild

### Requirement: Progressive matched-prefix visibility
During reference growth, the progressive render pipeline SHALL expose only contiguous per-level prefixes whose coefficients and certificates match. New range publication SHALL preserve already rendered pixel history because block application is an acceleration of the same perturbation result.

#### Scenario: Partial reference table is available
- **WHEN** at least one matched level prefix is committed while later blocks remain under construction
- **THEN** Auto uses the committed prefix and exact perturbation covers unavailable ranges

#### Scenario: New matched range arrives
- **WHEN** a coefficient/certificate range extending a committed prefix is uploaded
- **THEN** the directory count is updated after both writes and existing converged texels are not invalidated solely because of the extension
