## ADDED Requirements

### Requirement: Preset and palette persistence of texture mapping mode
The application SHALL save the `textureMappingMode` field within the serialized preset records and custom palettes, and restore the field when loading presets or applying custom palettes.

#### Scenario: User saves preset with Cartesian mapping
- **WHEN** the user saves the current configuration as a preset while Cartesian mapping is active
- **THEN** the stored preset record SHALL contain `textureMappingMode: 1`

#### Scenario: User loads preset containing Cartesian mapping
- **WHEN** the user loads a saved preset containing `textureMappingMode: 1`
- **THEN** the system SHALL set the active texture mapping mode to 1 and update the WebGPU renderer
