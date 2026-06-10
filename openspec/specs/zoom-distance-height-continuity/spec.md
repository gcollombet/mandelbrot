# zoom-distance-height-continuity Specification

## Purpose
Defines the display-scale normalization and fusion rules for distance-height values during zoom reprojection and merge passes.

## Requirements

### Requirement: Distance height uses display-scale units during zoom reprojection
The renderer SHALL evaluate distance-height values from live and frozen sources in the current display-scale unit when zoom reprojection is active.

#### Scenario: Live and frozen samples are colorized during zoom
- **WHEN** zoom reprojection is active and the color shader samples both live and frozen textures
- **THEN** any distance-height value used for debug distance, palette height shift, relief, subsurface, or related shading is normalized from its source scale to the current display scale before use

#### Scenario: Zoom reprojection is inactive
- **WHEN** zoom reprojection is inactive and live/frozen zoom factors are identity
- **THEN** distance-height normalization leaves stored distance-height values unchanged

### Requirement: Distance-height gradients use consistent source normalization
The renderer SHALL apply the same source-specific distance-height normalization to central samples and neighbor samples used for gradient calculation.

#### Scenario: Debug gradient reads live neighbors
- **WHEN** the debug gradient sector reads neighboring distance-height values from the live texture
- **THEN** the central live sample and all live neighbor samples use the same live source-to-display correction

#### Scenario: Debug gradient reads frozen neighbors
- **WHEN** the debug gradient sector reads neighboring distance-height values from the frozen texture
- **THEN** the central frozen sample and all frozen neighbor samples use the same frozen source-to-display correction

### Requirement: Merged frozen snapshots store normalized distance height
The renderer SHALL write merged frozen texture layer 4 values in the merge display-scale unit when fusing live and frozen textures at zoom stop.

#### Scenario: Merge chooses a live sample
- **WHEN** the merge pass selects a live candidate for an output pixel
- **THEN** layer 4 in the output frozen texture stores the live distance-height value normalized from live scale to merge display scale

#### Scenario: Merge chooses a frozen sample
- **WHEN** the merge pass selects a frozen candidate for an output pixel
- **THEN** layer 4 in the output frozen texture stores the frozen distance-height value normalized from frozen scale to merge display scale

#### Scenario: Rendering continues after zoom stop
- **WHEN** zoom reprojection stops and the merged frozen texture is used with identity zoom factors
- **THEN** layer 4 values in the merged frozen texture remain coherent without requiring residual live/frozen scale correction
