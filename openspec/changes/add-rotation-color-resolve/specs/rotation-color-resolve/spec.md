## ADDED Requirements

### Requirement: Settled rotated views resolve final color into a neutral cache

For a stable non-AA view, the renderer SHALL evaluate its existing
material/color function into a filterable linear-color cache expressed in
neutral-field coordinates when the angle is not aligned to a multiple of 90
degrees.

The resolve SHALL reuse the authoritative color function and SHALL NOT
component-wise interpolate semantic Mandelbrot field values.

#### Scenario: Stable oblique non-AA view

- **WHEN** the raw field is complete, its completion counter is fresh, the view
  is stable, AA has no active or accumulated samples, and the angle is oblique
- **THEN** the renderer resolves final color once into the neutral cache and
  marks the cache ready

#### Scenario: Raw semantic data remains discrete

- **WHEN** the rotation color cache is produced
- **THEN** each cache texel is colorized from one authoritative raw-field
  lookup and no generic bilinear interpolation is applied to iteration state,
  distance estimates, orbit-trap metadata, or analytic payloads

### Requirement: Rotation presentation filters linear color

The renderer SHALL reconstruct a ready rotation cache with a filtering sampler
in linear color space, convert the result to display sRGB, and apply final
display dithering after filtering.

#### Scenario: Oblique cache presentation

- **WHEN** a ready cache is presented at an oblique angle
- **THEN** each screen pixel maps back to neutral coordinates and samples the
  cached linear color bilinearly

#### Scenario: Cache boundary overlaps the canvas edge

- **WHEN** a bilinear footprint contains both valid cache color and cleared
  out-of-canvas cache texels
- **THEN** the renderer uses cached alpha as a coverage weight so the cleared
  exterior does not darken the valid color

### Requirement: Stale or ineligible rotation caches are never presented

The renderer SHALL invalidate rotation-cache readiness after any viewport,
rotation, Mandelbrot, material/color, or raw-field mutation. It SHALL keep the
current direct color path while the cache is missing, stale, or ineligible.

#### Scenario: User rotates or changes rendering parameters

- **WHEN** a ready cache exists and the view or render options change
- **THEN** the cache becomes stale immediately and the direct color path is
  used until a new eligible resolve completes

#### Scenario: Field is still converging

- **WHEN** raw-field work, clearing, merging, zooming, animation, video export,
  or a diagnostic view is active
- **THEN** the renderer does not present or rebuild the rotation cache

#### Scenario: Axis-aligned view

- **WHEN** the angle is aligned to a multiple of 90 degrees within the defined
  numerical tolerance
- **THEN** the renderer keeps the direct path and does not schedule a rotation
  resolve

### Requirement: Rotation resolve and antialiasing are mutually exclusive

The filtered rotation cache SHALL NOT be used while AA is active or while a
completed AA accumulator is the displayed result. AA accumulation SHALL always
sample the authoritative raw field directly.

#### Scenario: AA begins before or after a rotation resolve

- **WHEN** AA accumulation is triggered
- **THEN** rotation-cache presentation and rebuilding are suppressed and the AA
  samples do not include the filtered cache

#### Scenario: AA result has accumulated samples

- **WHEN** the AA accumulator contains at least one valid sample
- **THEN** the AA presenter remains authoritative and the rotation cache is not
  displayed underneath or instead of it
