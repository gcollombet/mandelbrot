# Purpose
Defines how the application manages Mandelbrot preset parameters, default views, and catalog loading on first launch.

# Requirements

## Requirement: Default classic view on first load
The system SHALL render a classic, centered black-and-white banded view of the Mandelbrot set by default when the user has no local navigation history.

#### Scenario: Visual defaults
- **WHEN** the page loads with no localStorage coordinates
- **THEN** coordinates are set to center `cx: "-0.7"`, `cy: "0.0"` and `scale: "1.2"`, and two white stops with active zebra stripes are rendered

## Requirement: Asynchronous catalog loading on first load
The system SHALL asynchronously sync and load the first preset from the preset database on first page load if local navigation history is empty.

#### Scenario: First preset loads asynchronously
- **WHEN** page loads with no localStorage coordinates and sync resolves presets
- **THEN** the application automatically applies the first available preset without blocking the initial render

## Requirement: Preset and palette persistence of texture mapping mode
The application SHALL save the `textureMappingMode` field within the serialized preset records and custom palettes, and restore the field when loading presets or applying custom palettes.

#### Scenario: User saves preset with Cartesian mapping
- **WHEN** the user saves the current configuration as a preset while Cartesian mapping is active
- **THEN** the stored preset record SHALL contain `textureMappingMode: 1`

#### Scenario: User loads preset containing Cartesian mapping
- **WHEN** the user loads a saved preset containing `textureMappingMode: 1`
- **THEN** the system SHALL set the active texture mapping mode to 1 and update the WebGPU renderer

## Requirement: Preset persistence of structured texture mapping
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

## Requirement: Legacy texture mapping mode migration
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

## Requirement: Palette presets exclude animation recipes
The system SHALL not write new animation recipe fields into palette preset records.

#### Scenario: Save palette preset after animation split
- **WHEN** the user saves a palette preset
- **THEN** the saved palette record contains palette appearance, cycle, material, texture, and mapping fields but does not contain animation mixer recipe fields

#### Scenario: Load legacy palette animation fields
- **WHEN** the user loads an older palette preset that contains legacy animation speed fields
- **THEN** the system remains compatible and does not fail to load the palette

## Requirement: Animation presets are managed separately from palette presets
The system SHALL expose animation presets as their own preset category rather than storing them inside palette presets.

#### Scenario: Save animation preset separately
- **WHEN** the user saves an animation preset
- **THEN** the preset is stored in the animation preset store and does not create or overwrite a palette preset

#### Scenario: Load palette without changing animation recipe
- **WHEN** the user loads a palette preset
- **THEN** the current animation recipe remains unchanged except for legacy compatibility behavior

## Requirement: Complete preset animation behavior is explicit
The system SHALL define whether complete presets include animation recipes and SHALL not automatically enable animation playback when loading a complete preset.

#### Scenario: Load complete preset
- **WHEN** the user loads a complete preset that contains animation recipe data
- **THEN** the recipe values are applied according to the complete preset policy and animation playback remains controlled by the current play/pause state
