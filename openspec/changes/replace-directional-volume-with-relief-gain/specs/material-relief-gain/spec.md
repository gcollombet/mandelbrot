## ADDED Requirements

### Requirement: Positive per-stop analytic relief gain
The system SHALL provide a `reliefGain` material control per palette stop in the range `[0, 2]`, with a default and neutral value of `1`. After interpolating the control between palette stops, the renderer SHALL decode the multiplier as `exp2(2 * (reliefGain - 1))`, producing a strictly positive gain in `[0.25, 4]`.

#### Scenario: Neutral material gain
- **WHEN** the interpolated `reliefGain` is `1`
- **THEN** the decoded analytic relief multiplier is `1`

#### Scenario: Relief attenuation
- **WHEN** the interpolated `reliefGain` is less than `1`
- **THEN** the decoded multiplier remains positive and is less than `1`

#### Scenario: Relief amplification
- **WHEN** the interpolated `reliefGain` is greater than `1`
- **THEN** the decoded multiplier is greater than `1` and no greater than `4`

#### Scenario: Transition between material stops
- **WHEN** adjacent palette stops have different `reliefGain` values
- **THEN** the renderer interpolates the control continuously before exponential decoding

### Requirement: Coherent analytic relief cues
The renderer SHALL multiply the existing render-wide analytic relief scale by the decoded material gain and SHALL use that effective scale for the cached analytic gradient in the surface normal, cached analytic curvature in ambient occlusion, local-height shadows, ridge emphasis, and analytic slope-driven iridescence. The gain SHALL NOT reverse the cached analytic gradient direction.

#### Scenario: Reflection follows amplified analytic relief
- **WHEN** a reflective material increases `reliefGain` above its neutral value
- **THEN** its normal and reflection direction respond to the amplified cached analytic slope without adding an opposing angle-derived slope

#### Scenario: Secondary cues follow the same gain
- **WHEN** `reliefGain` changes while ambient occlusion, local shadows, ridges, or slope-driven iridescence are enabled
- **THEN** each enabled cue uses the same effective analytic-relief scale as the base analytic normal contribution

#### Scenario: Analytic direction is preserved
- **WHEN** two positive `reliefGain` values are applied to the same nonzero cached analytic gradient
- **THEN** both resulting analytic gradient contributions have the same direction as the cached gradient

### Requirement: Global and material controls remain distinct
The system SHALL retain `reliefDepth` as the render-wide master for analytic relief and SHALL apply `reliefGain` as a per-palette-stop multiplier after that global control. Stripe, direction-coherence, texture-bump, and texture-coordinate-warp fields SHALL remain independently controlled.

#### Scenario: Global analytic relief disabled
- **WHEN** `reliefDepth` is zero
- **THEN** the cached analytic gradient, slope, and curvature contributions remain disabled regardless of `reliefGain`

#### Scenario: Material bumps remain independent
- **WHEN** `reliefGain` changes while stripe, coherence, or texture bump is enabled
- **THEN** the gain changes only the cached analytic geometry contribution and does not rescale those material bump gradients

### Requirement: Single-sample anisotropic environment direction
The renderer SHALL orient the base environment reflection with a reflection-only normal derived from the final geometric surface gradient plus the derivative-angle direction scaled by material anisotropy. This directional offset SHALL NOT depend on roughness and SHALL NOT alter the geometric normal, analytic AO, local shadows, ridges, slope-driven iridescence, direct lighting, or clearcoat normal. The base environment reflection SHALL retain one skybox texture sample.

#### Scenario: Isotropic material preserves the geometric reflection
- **WHEN** material anisotropy is `0`
- **THEN** the reflection-only normal equals the geometric surface normal and the environment reflection direction is unchanged

#### Scenario: Anisotropic material follows derivative-angle flow
- **WHEN** material anisotropy is greater than `0`
- **THEN** the base environment reflection direction is tilted by the derivative-angle field using a bounded strength proportional to anisotropy

#### Scenario: Roughness does not steer anisotropy
- **WHEN** roughness changes while anisotropy and the derivative angle remain fixed
- **THEN** roughness may continue to choose the existing mip level but does not change the reflection-only normal or add texture samples

#### Scenario: Clearcoat remains an independent top layer
- **WHEN** clearcoat and anisotropy are both enabled
- **THEN** the base environment uses the anisotropic reflection-only direction while clearcoat uses the geometric reflection direction

### Requirement: Legacy preset compatibility
The system SHALL accept `directionalVolume` as a deprecated input alias when `reliefGain` is absent. It SHALL clamp a finite legacy value to `[0, 1]` and use that result as the new relief-gain control; when both fields are absent it SHALL use `1`. New or reserialized material data SHALL emit `reliefGain` and SHALL NOT emit `directionalVolume`.

#### Scenario: Legacy default value
- **WHEN** a legacy stop contains `directionalVolume: 1` and no `reliefGain`
- **THEN** it loads with a neutral decoded gain of `1`

#### Scenario: Legacy reduced value
- **WHEN** a legacy stop contains `directionalVolume: 0.2` and no `reliefGain`
- **THEN** it loads with a relief-gain control of `0.2` and a positive attenuating decoded multiplier

#### Scenario: New field takes precedence
- **WHEN** a stop contains both `reliefGain` and `directionalVolume`
- **THEN** the system uses `reliefGain`

#### Scenario: Reserialized legacy stop
- **WHEN** a legacy stop is loaded and subsequently saved or exported
- **THEN** its material data contains `reliefGain` and omits `directionalVolume`

### Requirement: Existing GPU resource layout is preserved
The renderer SHALL store the relief-gain control in palette texture row 6 channel R and SHALL NOT add a geometry MRT attachment, palette row, render pass, or geometry-cache recomputation for this control.

#### Scenario: Material gain edit
- **WHEN** a user edits `reliefGain`
- **THEN** the palette/material data is refreshed without invalidating or recomputing cached analytic geometry

### Requirement: Relief gain is clearly identified in the editor
The palette editor SHALL present the per-stop control as `Gain de relief` and SHALL describe it as a material multiplier of analytic relief, distinct from the global `Profondeur relief` control.

#### Scenario: User inspects the material control
- **WHEN** the user views a palette stop's lighting controls
- **THEN** the editor identifies the control as `Gain de relief` and communicates its per-material analytic-relief role
