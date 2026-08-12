## ADDED Requirements

### Requirement: Parametric terminal rosette
The renderer SHALL provide a terminal trap mode based on a logarithmic-rosette distance evaluated from the terminal escape point normalized by the bailout radius. The configuration SHALL independently control center, scale, rotation, anisotropy, petal count, petal depth, twist, and phase.

#### Scenario: Circle degeneration
- **WHEN** terminal mode is active with petal depth equal to zero
- **THEN** the trap geometry is a circle in the configured transformed coordinate system

#### Scenario: Twisted rosette
- **WHEN** petal depth and twist are nonzero
- **THEN** the trap geometry forms a handed logarithmically twisted rosette with the configured petal count

### Requirement: Independent trap composition
The renderer SHALL control trap width, falloff hardness, and final strength independently. Changing final strength SHALL NOT implicitly change geometric width.

#### Scenario: Strength-only edit
- **WHEN** the user changes trap strength while all other trap fields are unchanged
- **THEN** the final trap contribution changes without changing the computed mask width

### Requirement: Trap phase encoding
The renderer SHALL allow trap palette phase to combine logarithmic closest-distance bands, hit iteration, and hit angle using independent weights plus an offset.

#### Scenario: Angle-only encoding
- **WHEN** angle weight is nonzero and distance and iteration weights are zero
- **THEN** the trap accent varies with the angle of the selected hit and not with its distance or iteration

#### Scenario: Distance-only encoding
- **WHEN** distance weight is nonzero and angle and iteration weights are zero
- **THEN** the trap accent forms bands driven only by the selected hit distance

### Requirement: True closest-approach payload
In orbit mode, the renderer SHALL accumulate the best trap distance encountered between the configured start and end iterations and SHALL retain the corresponding hit iteration and hit angle through progressive continuation, resolve, and frozen/live presentation.

#### Scenario: Later closer hit
- **WHEN** a later eligible orbit point has a smaller trap distance than the stored best distance
- **THEN** distance, iteration, and angle are replaced atomically by the later hit's tuple

#### Scenario: Later farther hit
- **WHEN** a later eligible orbit point is not closer than the stored best distance
- **THEN** the stored distance, iteration, and angle remain unchanged

#### Scenario: Universal initial point avoided
- **WHEN** the default start iteration is used
- **THEN** `z0 = 0` and the first recurrence step do not trivially capture every pixel

### Requirement: Explicit evaluation policy
The persisted and displayed configuration SHALL distinguish `terminal`, `sampled`, and `exact` evaluation policies. Sampled mode SHALL include explicitly evaluated orbit points and accelerated-block landing points. Exact mode SHALL NOT accept a skip unless the skipped interval is evaluated or a conservative trap bound proves it cannot improve the current best distance.

#### Scenario: Sampled accelerated block
- **WHEN** sampled mode accepts an accelerated block
- **THEN** the block landing point may update the accumulator and the result remains labelled sampled

#### Scenario: Exact uncertified block
- **WHEN** exact mode encounters a proposed block without a conservative trap-distance bound
- **THEN** the renderer evaluates the skipped iterations instead of silently using only the landing point

### Requirement: Conditional resource and history lifecycle
Orbit-specific payload resources SHALL be allocated only while an orbit evaluation policy is active. Changing between terminal/off and orbit modes SHALL recreate dependent GPU resources and invalidate progressive/frozen history before new results are presented.

#### Scenario: Activate orbit mode
- **WHEN** the user changes from off or terminal mode to sampled or exact mode
- **THEN** the renderer recreates the required payload resources and clears incompatible prior history

### Requirement: Preset persistence and legacy compatibility
Palette presets SHALL persist the complete orbit-trap configuration. A legacy preset containing only `orbitTrapStrength` SHALL load without error and SHALL map that value to the new strength field while other fields receive documented defaults. New behavior SHALL remain disabled by default.

#### Scenario: Load legacy strength
- **WHEN** a preset has `orbitTrapStrength` but no structured orbit-trap configuration
- **THEN** the normalized configuration uses that strength and terminal mode when the strength is positive

#### Scenario: Load preset without trap fields
- **WHEN** a preset has neither legacy nor structured orbit-trap fields
- **THEN** the normalized configuration is off with zero strength

### Requirement: User controls
The settings UI SHALL expose compact controls for mode, style, scale, rotation, complexity, width, and strength, with advanced controls for geometry, traversal, phase encoding, composition, and evaluation policy.

#### Scenario: Edit terminal geometry
- **WHEN** the user changes a terminal geometry control
- **THEN** the preview and main renderer receive the same normalized configuration without recomputing the Mandelbrot orbit

#### Scenario: Edit orbit traversal
- **WHEN** the user changes start iteration, end iteration, or evaluation policy in orbit mode
- **THEN** the renderer invalidates orbit data and recomputes it under the new traversal configuration

### Requirement: Validation boundaries
Static shader and TypeScript checks SHALL be reported separately from browser visual correctness and real GPU performance. Analytic AA in orbit mode SHALL use the center pixel's accumulated hit unless the orbit is independently re-evaluated for the subsample.

#### Scenario: Static validation only
- **WHEN** shader and TypeScript compilation succeed without a browser render
- **THEN** completion reporting states that visual output and GPU performance remain unverified

