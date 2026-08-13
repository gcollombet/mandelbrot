## ADDED Requirements

### Requirement: Supported monotone iteration palette curves
The application SHALL map the non-negative normalized smooth-iteration coordinate `u = 2ν / palettePeriod` through exactly one of Linear `u`, Soft Root `(sqrt(1 + u) - 1) / (sqrt(2) - 1)`, Logarithmic `log(1 + u) / log(2)`, or Quadratic `u(u + 2) / 3` before palette wrapping.

#### Scenario: Linear preserves the current phase
- **WHEN** Linear distribution is selected
- **THEN** the unshifted raw palette coordinate equals `2ν / palettePeriod` exactly as before this change

#### Scenario: Curves share the first-cycle anchor
- **WHEN** the normalized coordinate is zero or one in any supported mode
- **THEN** the transformed coordinate is respectively zero or one

#### Scenario: Root and logarithmic modes compress high iterations
- **WHEN** Soft Root or Logarithmic distribution is selected and `u` increases beyond one
- **THEN** the transformed coordinate remains monotone and advances more slowly than Linear

#### Scenario: Quadratic mode expands high iterations
- **WHEN** Quadratic distribution is selected and `u` increases beyond one
- **THEN** the transformed coordinate remains monotone and advances faster than Linear

### Requirement: Palette phase composition order
The application SHALL transform only the normalized iteration coordinate, then add palette offset, height palette shift, and geometry phase shift before applying the existing repeat or mirror behavior.

#### Scenario: Offset remains phase-linear
- **WHEN** the palette offset changes under any distribution mode
- **THEN** the final raw palette coordinate changes by the same offset amount without that amount being curved

#### Scenario: Existing mirror remains last
- **WHEN** mirror is enabled under a nonlinear distribution mode
- **THEN** the application mirrors the already transformed and shifted raw coordinate using the existing alternating-cycle behavior

### Requirement: Palette curve selection
The Palette settings SHALL offer Linear, Soft Root, Logarithmic, and Quadratic distribution choices and SHALL NOT introduce sinusoidal modulation in this change.

#### Scenario: User selects a curve
- **WHEN** the user selects one of the four distribution choices
- **THEN** the active renderer and palette preview use that curve

### Requirement: Coupled phase and adaptive-AA behavior
Cursor phase reporting, preliminary smoothness lookup, palette preview, and adaptive-AA palette-frequency estimation SHALL agree with the selected iteration palette curve.

#### Scenario: Cursor reports rendered phase
- **WHEN** a cursor phase is computed for an escaped point under a nonlinear curve
- **THEN** the reported wrapped or mirrored phase matches the color shader phase before spatial-only shifts

#### Scenario: Adaptive AA accounts for nonlinear frequency
- **WHEN** adaptive AA estimates palette phase frequency under a nonlinear curve
- **THEN** it multiplies the smooth-iteration gradient by the derivative of the selected curve at that pixel's normalized coordinate

### Requirement: Linear compatibility fallback
The application and shaders SHALL treat a missing or unknown iteration palette curve value as Linear.

#### Scenario: Unknown renderer code
- **WHEN** the shader receives an unsupported numeric curve code
- **THEN** it uses the Linear transformation
