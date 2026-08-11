## ADDED Requirements

### Requirement: Neutral per-stop protrusion control
The palette schema SHALL expose a `protrusion` material control in the range `[0, 1]`, and an omitted or zero value MUST preserve the current analytic material rendering.

#### Scenario: Existing preset omits protrusion
- **WHEN** a palette stop without a `protrusion` field is normalized and rendered
- **THEN** its effective protrusion amount is zero and no protrusion gain is applied

#### Scenario: Palette stops specify different amounts
- **WHEN** adjacent palette stops contain different protrusion amounts
- **THEN** the amount is interpolated with the same stop transfer curve as other numeric effect fields

### Requirement: Reuse existing palette storage
The renderer SHALL pack the protrusion amount into the reserved alpha channel of palette texture row 6 and MUST NOT add a palette row or an additional material texture sample.

#### Scenario: Shaded pixel samples material parameters
- **WHEN** material shading is active for an escaped pixel
- **THEN** relief gain, conductor controls, and protrusion are decoded from the existing row-6 sample

### Requirement: Stable smooth-escape lobe
The color shader SHALL derive a smooth non-negative lobe from the fractional smooth-escape phase, SHALL offset it with a global wrapped phase control, SHALL shape it with a bounded positive sharpness control, and SHALL apply protrusion as a strictly positive log-domain multiplier of analytic relief.

#### Scenario: Protrusion is disabled
- **WHEN** the decoded protrusion amount is zero
- **THEN** the multiplier is exactly neutral and the existing analytic relief scale is preserved

#### Scenario: Protrusion is enabled
- **WHEN** the decoded protrusion amount is greater than zero
- **THEN** relief is strengthened smoothly near iteration crossings without reversing the cached analytic gradient direction

#### Scenario: Phase is changed
- **WHEN** the global protrusion phase changes within or outside `[0, 1]`
- **THEN** the lobe position moves periodically through the smooth-escape interval

#### Scenario: Sharpness is changed
- **WHEN** global protrusion sharpness is below or above its default of `2`
- **THEN** the lobe broadens or concentrates respectively while remaining smooth and non-negative

### Requirement: Persisted global shape controls
The renderer SHALL expose `protrusionPhase` and `protrusionSharpness` as global surface controls, SHALL persist them in Mandelbrot presets and palette looks, and SHALL use defaults `0` and `2` for legacy data.

#### Scenario: Legacy preset is loaded
- **WHEN** a preset or palette look omits either global protrusion shape control
- **THEN** phase resolves to `0` and sharpness resolves to `2`

#### Scenario: Palette preview is visible
- **WHEN** either global protrusion shape control changes
- **THEN** both the main renderer and the live palette preview receive the same values without changing the color-uniform buffer size

### Requirement: Coherent material relief consumers
The renderer SHALL use the styled analytic relief scale for the analytic normal, curvature AO, local height shadow, ridge accent, and slope-driven iridescence while leaving canonical geometry consumers unchanged.

#### Scenario: Material lighting consumes styled relief
- **WHEN** protrusion and shading are active
- **THEN** all analytic lighting cues use the same styled relief scale

#### Scenario: Canonical field consumers remain active
- **WHEN** protrusion is changed without changing the Mandelbrot field
- **THEN** cached height, gradient, curvature, analytic AA, reprojection, depth mapping, and debug values remain unchanged and the fractal field cache is reused
