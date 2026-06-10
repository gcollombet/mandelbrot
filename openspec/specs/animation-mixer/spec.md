# animation-mixer Specification

## Purpose
Defines the controls, tracks, and UI panel for orchestrating independent animation channels for rendering parameters and presets.

## Requirements

### Requirement: Standalone Animation panel
The system SHALL provide a top-level Animation panel positioned between Graphics and Palettes in the settings tab list.

#### Scenario: Open Animation panel
- **WHEN** the user opens the settings tabs
- **THEN** the user can open an Animation panel separate from Graphics and Palettes

#### Scenario: Palette panel excludes drift playback
- **WHEN** the user opens the Palettes panel
- **THEN** the Drift play/pause control and global animation speed control are not shown in the Palette panel

### Requirement: Animation mixer controls
The system SHALL provide a simple animation mixer with global playback, global speed, and per-track controls for enabled state, animation type, speed, and range/amplitude where applicable.

#### Scenario: Configure global animation speed
- **WHEN** the user adjusts the global speed slider
- **THEN** all enabled animation tracks use the new multiplier without changing their individual speed values

#### Scenario: Enable a single track
- **WHEN** the user enables one animation track and disables the others
- **THEN** only that track contributes animated modulation during playback

#### Scenario: Change track animation type
- **WHEN** the user changes a track from one animation type to another
- **THEN** the track uses the selected motion curve for subsequent frames

### Requirement: Curated animation tracks
The system SHALL provide animation tracks for Palette Offset, Height Palette Shift, Light Angle, Texture Drift, Sky Reflection Drift, Phase Coloring, Varnish, Micro Bump, Displacement, and Tessellation.

#### Scenario: Initial track list
- **WHEN** the user opens the Animation panel
- **THEN** the mixer lists the curated animation tracks with stable labels and controls

#### Scenario: Unsupported properties excluded
- **WHEN** the user opens the Animation panel
- **THEN** navigation coordinates, scale, max iterations, epsilon, and performance controls are not offered as animation tracks

### Requirement: Independent shader animation channels
The system SHALL render animation tracks independently so that palette, lighting, texture, reflection, material, displacement, and tessellation motion can be enabled or disabled without relying on one shared drift speed.

#### Scenario: Palette-only animation
- **WHEN** Palette Offset is enabled and Texture Drift is disabled
- **THEN** palette offset animates while texture coordinates remain unmodulated by animation

#### Scenario: Texture-only animation
- **WHEN** Texture Drift is enabled and Palette Offset is disabled
- **THEN** texture coordinates animate while palette offset remains at its base value

### Requirement: Playback state remains separate from animation recipe
The system SHALL keep play/pause state separate from saved animation recipe values.

#### Scenario: Load recipe while paused
- **WHEN** animation playback is paused and the user loads an animation preset
- **THEN** the recipe values are applied and playback remains paused

#### Scenario: Save recipe while playing
- **WHEN** animation playback is active and the user saves an animation preset
- **THEN** the saved preset stores track settings and global speed but does not require future loads to start playback

### Requirement: Animation preset management
The system SHALL allow users to save, load, delete, favorite, and rename local animation presets.

#### Scenario: Save animation preset
- **WHEN** the user saves the current animation recipe with a name
- **THEN** the system stores an animation preset containing global speed and all track settings

#### Scenario: Load animation preset
- **WHEN** the user selects an animation preset
- **THEN** the system applies the preset's global speed and track settings to the Animation panel

### Requirement: Legacy animation compatibility
The system SHALL load existing settings that only contain `activateAnimate` and `animationSpeed` by normalizing them into the new animation model.

#### Scenario: Load legacy animation speed
- **WHEN** saved settings contain `animationSpeed` but no animation recipe
- **THEN** the new animation recipe uses that value as the initial global speed

#### Scenario: Load settings without animation fields
- **WHEN** saved settings contain no animation recipe and no legacy animation speed
- **THEN** the system initializes the animation mixer with default track settings
