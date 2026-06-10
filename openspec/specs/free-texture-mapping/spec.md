# free-texture-mapping Specification

## Purpose
Defines configurable mapping variables, independent scaling, mirroring, and built-in texture mapping recipes.

## Requirements

### Requirement: Configurable texture mapping axes
The system SHALL let users configure image texture coordinates by selecting an X-axis mapping variable, a Y-axis mapping variable, and an independent logarithmic scale coefficient for each axis.

#### Scenario: User selects mapping variables
- **WHEN** the user selects a texture mapping variable for each texture axis
- **THEN** the renderer uses the selected X variable for the texture U coordinate and the selected Y variable for the texture V coordinate

#### Scenario: User scales mapping axes
- **WHEN** the user changes an axis scale control within the logarithmic range `0.01` to `100`
- **THEN** the renderer multiplies that axis coordinate by the selected coefficient

### Requirement: Texture mapping variable set
The system SHALL provide v1 texture mapping variables for screen coordinates, screen coordinates with depth displacement, smooth iteration, distance, derivative-angle sine, and the composed Dragon Scales U coordinate.

#### Scenario: User creates a smooth iteration mapping
- **WHEN** the user selects `screenX` for one axis and `iterSmooth` for the other axis
- **THEN** the renderer maps texture coordinates from screen position and continuous iteration count

#### Scenario: User creates a continuous phase mapping
- **WHEN** the user selects `distance` for one axis and derivative-angle sine for the other axis
- **THEN** the renderer maps texture coordinates from distance height and a continuous derivative-angle field

### Requirement: Built-in Screen Space mapping
The system SHALL provide a built-in Screen Space mapping that reproduces the existing screen-space texture look.

#### Scenario: User applies Screen Space mapping
- **WHEN** the user applies the built-in Screen Space mapping
- **THEN** the active mapping uses screen coordinates with depth displacement for both axes, axis scales of `1`, and mirror disabled

### Requirement: Built-in Dragon Scales mapping
The system SHALL provide a built-in Dragon Scales mapping that reproduces the existing Escape Z / Dragon Scales texture look.

#### Scenario: User applies Dragon Scales mapping
- **WHEN** the user applies the built-in Dragon Scales mapping
- **THEN** the active mapping uses the composed Dragon Scales U coordinate for the texture U axis, derivative-angle sine for the texture V axis, axis scales of `1`, and mirror enabled

### Requirement: Explicit texture mapping mirror
The system SHALL store mirror behavior as an explicit texture mapping setting that applies independently of selected mapping variables.

#### Scenario: User enables texture mapping mirror
- **WHEN** the user enables the mirror switch for the active texture mapping
- **THEN** the renderer mirrors tiled image texture sampling for that mapping regardless of the selected X and Y variables

#### Scenario: User disables texture mapping mirror
- **WHEN** the user disables the mirror switch for the active texture mapping
- **THEN** the renderer samples tiled image textures without mirror behavior for that mapping

### Requirement: Exclude c-based mapping from v1
The system SHALL NOT expose `c`-based texture mapping variables or the previous Ray-Potential `c` mapping in the v1 free mapping controls.

#### Scenario: User opens texture mapping variable selectors
- **WHEN** the user opens the X or Y variable selector
- **THEN** the selector does not include `c`, `argC`, or Ray-Potential `c` options
