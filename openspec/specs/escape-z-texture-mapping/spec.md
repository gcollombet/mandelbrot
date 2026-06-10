# escape-z-texture-mapping Specification

## Purpose
Defines the texture mapping mode selection and shader implementation for mapping textures based on escape coordinates, ray potentials, and screen space.

## Requirements

### Requirement: Texture mapping mode selection
The system SHALL provide a setting `textureMappingMode` with three supported mapping configurations: Screen Space (0), Cartesian Escape Z (1), and Polar Ray-Potential (2).

#### Scenario: User selects Cartesian Escape Z mapping
- **WHEN** the user selects the "Cartesian Escape Z" mapping option in the settings panel
- **THEN** the WebGPU renderer SHALL compute texture coordinates based on the $z$ complex coordinates at the escape iteration

#### Scenario: User selects Polar Ray-Potential mapping
- **WHEN** the user selects the "Ray-Potential Polar" mapping option in the settings panel
- **THEN** the WebGPU renderer SHALL compute texture coordinates based on the smooth iteration count and stripe phase metrics

### Requirement: Shader integration for texture mapping
The fragment shader SHALL read the `textureMappingMode` uniform parameter and use it to select between Screen Space, Cartesian Escape Z, and Polar Ray-Potential coordinates when rendering tile textures.

#### Scenario: Shader processes Cartesian mapping
- **WHEN** `textureMappingMode` is 1
- **THEN** the shader SHALL map tile texture coordinates to $(zx, zy)$ at the moment of escape, scaled by the displacement amount

#### Scenario: Shader processes Polar mapping
- **WHEN** `textureMappingMode` is 2
- **THEN** the shader SHALL map tile texture coordinates to $(v\_smooth, stripePhase)$
