## ADDED Requirements

### Requirement: Preset persistence of structured texture mapping
The application SHALL save and restore the active structured texture mapping configuration within complete presets and palette presets.

#### Scenario: User saves complete preset with custom texture mapping
- **WHEN** the user saves a complete preset while a custom texture mapping is active
- **THEN** the stored preset record contains the active texture mapping object including X variable, Y variable, X scale, Y scale, and mirror state

#### Scenario: User loads complete preset with texture mapping
- **WHEN** the user loads a complete preset containing a structured texture mapping object
- **THEN** the application restores that texture mapping object and updates the renderer

#### Scenario: User saves palette preset with custom texture mapping
- **WHEN** the user saves a palette preset while a custom texture mapping is active
- **THEN** the stored palette preset record contains the active texture mapping object including X variable, Y variable, X scale, Y scale, and mirror state

#### Scenario: User applies palette preset with texture mapping
- **WHEN** the user applies a palette preset containing a structured texture mapping object
- **THEN** the application restores that texture mapping object as part of the palette look fields

### Requirement: Legacy texture mapping mode migration
The application SHALL migrate legacy numeric `textureMappingMode` values to structured texture mapping configurations when loading existing complete presets, palette presets, or current local state.

#### Scenario: Legacy Screen Space mode is loaded
- **WHEN** a record contains `textureMappingMode: 0` and no structured texture mapping object
- **THEN** the application treats the record as using the built-in Screen Space mapping

#### Scenario: Legacy Dragon Scales mode is loaded
- **WHEN** a record contains `textureMappingMode: 1` and no structured texture mapping object
- **THEN** the application treats the record as using the built-in Dragon Scales mapping

#### Scenario: Legacy c-based mode is loaded
- **WHEN** a record contains `textureMappingMode: 2` and no structured texture mapping object
- **THEN** the application falls back to the built-in Screen Space mapping
