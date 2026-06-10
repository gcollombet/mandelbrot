## ADDED Requirements

### Requirement: Palette presets exclude animation recipes
The system SHALL not write new animation recipe fields into palette preset records.

#### Scenario: Save palette preset after animation split
- **WHEN** the user saves a palette preset
- **THEN** the saved palette record contains palette appearance, cycle, material, texture, and mapping fields but does not contain animation mixer recipe fields

#### Scenario: Load legacy palette animation fields
- **WHEN** the user loads an older palette preset that contains legacy animation speed fields
- **THEN** the system remains compatible and does not fail to load the palette

### Requirement: Animation presets are managed separately from palette presets
The system SHALL expose animation presets as their own preset category rather than storing them inside palette presets.

#### Scenario: Save animation preset separately
- **WHEN** the user saves an animation preset
- **THEN** the preset is stored in the animation preset store and does not create or overwrite a palette preset

#### Scenario: Load palette without changing animation recipe
- **WHEN** the user loads a palette preset
- **THEN** the current animation recipe remains unchanged except for legacy compatibility behavior

### Requirement: Complete preset animation behavior is explicit
The system SHALL define whether complete presets include animation recipes and SHALL not automatically enable animation playback when loading a complete preset.

#### Scenario: Load complete preset
- **WHEN** the user loads a complete preset that contains animation recipe data
- **THEN** the recipe values are applied according to the complete preset policy and animation playback remains controlled by the current play/pause state
