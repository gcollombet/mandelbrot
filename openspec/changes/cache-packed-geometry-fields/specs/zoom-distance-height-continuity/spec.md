## MODIFIED Requirements

### Requirement: Distance height uses display-scale units during zoom reprojection
The renderer SHALL evaluate cached distance height, gradient, and curvature from live and frozen sources in the current display-scale unit when zoom reprojection is active. Height SHALL receive the source-specific logarithmic offset, gradient the source-to-display spatial factor and coordinate transform, and curvature the square spatial factor.

#### Scenario: Live and frozen samples are colorized during zoom
- **WHEN** zoom reprojection is active and the color shader samples live and frozen display sets
- **THEN** height, gradient, and curvature used for debug distance, palette height shift, relief, AO, reflection, subsurface, or related shading are normalized from each source to the current display units

#### Scenario: Zoom reprojection is inactive
- **WHEN** zoom reprojection is inactive and live/frozen zoom factors are identity
- **THEN** normalization leaves all four stored geometry channels unchanged

### Requirement: Distance-height gradients use consistent source normalization
The renderer SHALL consume the cached gradient and curvature belonging to the same selected live or frozen sample as its central distance height. It SHALL NOT reconstruct the base distance gradient from neighboring color-pass reads.

#### Scenario: Live source selected
- **WHEN** min-provenance composition selects the live sample
- **THEN** color uses live height, live cached gradient, and live cached curvature with one live-to-display transform

#### Scenario: Frozen source selected
- **WHEN** min-provenance composition selects the frozen sample
- **THEN** color uses frozen height, frozen cached gradient, and frozen cached curvature with one frozen-to-display transform

#### Scenario: Color-only frame
- **WHEN** the field and source selection are unchanged while palette or material parameters change
- **THEN** the same normalized cached geometry is reused without neighbor height reads

### Requirement: Merged frozen snapshots store normalized distance height
The renderer SHALL write merged frozen `geometry` values in the merge display-scale unit when fusing live and frozen display sets. Height, both gradient components, and curvature SHALL be transformed together with the selected sample.

#### Scenario: Merge chooses a live sample
- **WHEN** the merge pass selects a live candidate for an output pixel
- **THEN** the output geometry stores live height, gradient, and curvature normalized from live units to merge units

#### Scenario: Merge chooses a frozen sample
- **WHEN** the merge pass selects a frozen candidate for an output pixel
- **THEN** the output geometry stores frozen height, gradient, and curvature normalized from frozen units to merge units

#### Scenario: Rendering continues after zoom stop
- **WHEN** zoom reprojection stops and the merged frozen display set is used with identity transforms
- **THEN** all geometry channels remain coherent without residual live/frozen scale correction
