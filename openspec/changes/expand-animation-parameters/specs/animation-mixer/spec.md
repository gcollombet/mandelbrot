## MODIFIED Requirements

### Requirement: Curated animation tracks
The system SHALL provide animation tracks for Palette Offset, Height Palette Shift, Light Angle, Texture Drift, Sky Reflection Drift, Phase Coloring, Varnish, Micro Bump, Displacement, Tessellation, Protrusion Phase, Relief Depth, Orbit Trap Color Phase, Orbit Trap Strength, Saturation, and Contrast.

#### Scenario: Initial track list
- **WHEN** the user opens the Animation panel
- **THEN** the mixer lists the curated animation tracks with stable labels and controls

#### Scenario: Unsupported properties excluded
- **WHEN** the user opens the Animation panel
- **THEN** navigation coordinates, scale, max iterations, epsilon, palette period, stripe frequency, orbit-trap geometry, and performance controls are not offered as animation tracks

### Requirement: Independent shader animation channels
The system SHALL render animation tracks independently so that palette, lighting, texture, reflection, material, displacement, tessellation, relief, orbit-trap coloring, and display grading motion can be enabled or disabled without relying on one shared drift speed.

#### Scenario: Palette-only animation
- **WHEN** Palette Offset is enabled and Texture Drift is disabled
- **THEN** palette offset animates while texture coordinates remain unmodulated by animation

#### Scenario: Texture-only animation
- **WHEN** Texture Drift is enabled and Palette Offset is disabled
- **THEN** texture coordinates animate while palette offset remains at its base value

#### Scenario: Cyclic phase animation
- **WHEN** Protrusion Phase or Orbit Trap Color Phase uses a loop animation
- **THEN** its effective value wraps continuously through the parameter's phase cycle

#### Scenario: Bounded color-pass animation
- **WHEN** Relief Depth, Orbit Trap Strength, Saturation, or Contrast is animated near a domain boundary
- **THEN** the effective shader value is clamped to the control's supported renderer domain

### Requirement: Legacy animation compatibility
The system SHALL load existing settings that only contain `activateAnimate` and `animationSpeed`, as well as animation recipes that predate newly curated tracks, by normalizing them into the current animation model.

#### Scenario: Load legacy animation speed
- **WHEN** saved settings contain `animationSpeed` but no animation recipe
- **THEN** the new animation recipe uses that value as the initial global speed

#### Scenario: Load settings without animation fields
- **WHEN** saved settings contain no animation recipe and no legacy animation speed
- **THEN** the system initializes the animation mixer with default track settings

#### Scenario: Load an older animation recipe
- **WHEN** a saved animation recipe omits one or more currently curated tracks
- **THEN** normalization retains its existing track values and supplies disabled defaults for every missing track
