## ADDED Requirements

### Requirement: Preset parameter sanitization
The system SHALL strip legacy parameters (specifically `activatePalette`, `activateSkybox`, `activateTessellation`, `activateWebcam`, `activateShading`, `activateZebra`, `activateSmoothness`) from Mandelbrot parameters before they are loaded, saved, or exported.

#### Scenario: Sanitizing legacy parameters
- **WHEN** user loads a preset containing legacy fields
- **THEN** system successfully parses it and removes all legacy keys

### Requirement: Default classic view on first load
The system SHALL render a classic, centered black-and-white banded view of the Mandelbrot set by default when the user has no local navigation history.

#### Scenario: Visual defaults
- **WHEN** the page loads with no localStorage coordinates
- **THEN** coordinates are set to center "-0.7", "0.0" and scale "1.2", and two white stops with active zebra stripes are rendered

### Requirement: Asynchronous catalog loading on first load
The system SHALL asynchronously sync and load the first preset from the preset database on first page load if local navigation history is empty.

#### Scenario: First preset loads asynchronously
- **WHEN** page loads with no localStorage coordinates and sync resolves presets
- **THEN** the application automatically applies the first available preset
