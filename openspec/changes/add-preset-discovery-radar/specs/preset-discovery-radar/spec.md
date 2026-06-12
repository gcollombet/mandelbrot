## ADDED Requirements

### Requirement: Radar discovery activation
The system SHALL expose a visible map control that activates a temporary preset discovery radar mode from the current viewport.

#### Scenario: Activate discovery mode
- **WHEN** the user clicks the radar discovery control
- **THEN** the system enters discovery mode and renders a radar pulse originating from the current view center

#### Scenario: Toggle discovery mode off
- **WHEN** discovery mode is active and the user clicks the radar discovery control again
- **THEN** the system exits discovery mode and removes discovery-only pins, pulses, and edge markers

### Requirement: Perceptual neighbor ranking
The system SHALL rank discovery candidates by a perceptual distance that combines spatial distance in screen units with zoom-depth difference.

#### Scenario: Spatially close preset at similar zoom is prioritized
- **WHEN** discovery mode scores multiple presets and one preset is near the current viewport at a similar zoom depth
- **THEN** that preset ranks ahead of a farther preset with the same zoom-depth difference

#### Scenario: Large zoom-depth difference increases distance
- **WHEN** two presets have similar spatial distance but one requires more powers-of-two zoom steps from the current scale
- **THEN** the preset with the larger zoom-depth difference receives a larger perceptual distance

#### Scenario: Zoom step uses perceptual screen cost
- **WHEN** a preset differs from the current scale by one 2x zoom step
- **THEN** the ranking treats that zoom-depth difference as approximately half a screen of perceptual travel

### Requirement: Limited discovery result set
The system SHALL render only a limited set of the closest discovery candidates instead of showing every saved preset.

#### Scenario: Many presets exist
- **WHEN** the preset catalog contains more candidates than the discovery result limit
- **THEN** discovery mode renders only the closest ranked candidates and hides or strongly de-emphasizes the rest

#### Scenario: No presets exist
- **WHEN** the user activates discovery mode and there are no saved presets
- **THEN** the system does not render stale discovery pins or edge markers

### Requirement: Depth-aware discovery pins
Discovery pins SHALL visually indicate whether a preset is shallower, deeper, or near the same zoom depth as the current view.

#### Scenario: Deeper preset
- **WHEN** a discovery preset is significantly deeper than the current view
- **THEN** its pin shows downward chevron cues below the point

#### Scenario: Shallower preset
- **WHEN** a discovery preset is significantly shallower than the current view
- **THEN** its pin shows upward chevron cues above the point

#### Scenario: Similar-depth preset
- **WHEN** a discovery preset is close to the current zoom depth
- **THEN** its pin uses a neutral or minimal depth cue

#### Scenario: Larger zoom-depth gap
- **WHEN** the zoom-depth gap between the current view and a discovery preset increases
- **THEN** the pin communicates the larger gap through stronger animation, faster pulse, or more chevrons while keeping the visible chevron count capped

### Requirement: Off-screen edge markers
Discovery mode SHALL represent important off-screen discovery candidates with edge markers placed inside a safe frame.

#### Scenario: Candidate is outside the viewport
- **WHEN** a ranked discovery candidate projects outside the visible canvas
- **THEN** the system displays an edge marker in the candidate's direction instead of placing the pin outside the viewport

#### Scenario: UI occupies screen edges
- **WHEN** top bars, bottom controls, mobile controls, or settings popups occupy part of the viewport
- **THEN** edge markers are constrained to a safe frame that avoids those UI regions

#### Scenario: Multiple edge markers collide
- **WHEN** multiple off-screen candidates would render at overlapping edge-marker positions
- **THEN** the system groups or offsets the markers so they remain readable and clickable

### Requirement: Discovery lifecycle
Discovery mode SHALL remain active after the radar pulse until the user performs an action that changes the navigation context or explicitly exits the mode.

#### Scenario: Zoom exits discovery
- **WHEN** discovery mode is active and the user zooms the fractal view
- **THEN** the system exits discovery mode

#### Scenario: Significant navigation exits discovery
- **WHEN** discovery mode is active and the user significantly pans, drags, or loads a preset destination
- **THEN** the system exits discovery mode

#### Scenario: Passive interaction keeps discovery
- **WHEN** discovery mode is active and the user hovers, focuses, or inspects a discovery pin without navigating
- **THEN** discovery mode remains active

### Requirement: Location Library remains unchanged
The radar discovery mode SHALL NOT change the existing Location Library preset dropdown behavior.

#### Scenario: User opens Location Library
- **WHEN** the user opens the Navigation panel's Location Library dropdown
- **THEN** the dropdown preserves its existing listing, filtering, selection, and load behavior
