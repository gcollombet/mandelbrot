## ADDED Requirements

### Requirement: Iteration palette curve persistence
The application SHALL save and restore the selected iteration palette curve in complete presets and palette presets, and SHALL interpret missing or unknown values as Linear.

#### Scenario: Save and load a complete preset
- **WHEN** the user saves and later loads a complete preset with a nonlinear iteration palette curve
- **THEN** the preset stores and restores that curve with the rest of the render parameters

#### Scenario: Save and apply a palette preset
- **WHEN** the user saves and later applies a palette preset with a nonlinear iteration palette curve
- **THEN** the palette record stores and restores that curve as part of the palette cycle look

#### Scenario: Load a legacy record
- **WHEN** a complete preset, palette preset, or current local state has no iteration palette curve field
- **THEN** the application uses Linear and preserves the legacy palette phase behavior
