## ADDED Requirements

### Requirement: Pixel-aligned center coordinate
The system SHALL constrain the rendering center coordinates (`cx`, `cy`) to align exactly with the physical pixel grid of the canvas during pure translation, provided that the canvas dimensions are available and the zoom factor is constant (not actively zooming).

#### Scenario: Alignment during constant zoom translation
- **WHEN** the navigator updates its position during translation (via `step` or `translate_direct`) with canvas dimensions provided, and the zoom factor is constant
- **THEN** the resulting center coordinates (`cx`, `cy`) relative to the reference origin (`reference_cx`, `reference_cy`) SHALL map to integer physical pixels of the canvas

### Requirement: Accumulation of continuous center position
The system SHALL maintain continuous center coordinates (`cx_continuous`, `cy_continuous`) in high precision to accumulate all movement (including very low velocities and sub-pixel shifts) across frames, preventing the viewport from getting stuck or jittering when motion is slower than 1 pixel per frame.

#### Scenario: Accumulating sub-pixel velocity
- **WHEN** the navigator updates its position with a velocity that corresponds to less than 0.5 pixels of displacement per step
- **THEN** the rendering center coordinates (`cx`, `cy`) SHALL remain snapped to the same pixel grid position, but the continuous coordinates (`cx_continuous`, `cy_continuous`) SHALL accumulate the displacement until it exceeds the threshold for a 1-pixel step

### Requirement: Backward compatibility when canvas dimensions are missing
The system SHALL bypass pixel-alignment constraints and use continuous center coordinates directly for the rendering center if canvas dimensions are not provided or if the zoom factor is changing.

#### Scenario: Zooming active
- **WHEN** the navigator is actively zooming or interpolating scale (zoom velocity not 1.0 or scale transition active)
- **THEN** the rendering center coordinates (`cx`, `cy`) SHALL equal the continuous center coordinates (`cx_continuous`, `cy_continuous`) without pixel snapping
