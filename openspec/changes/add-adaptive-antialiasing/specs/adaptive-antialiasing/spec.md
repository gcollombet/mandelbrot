## ADDED Requirements

### Requirement: Idle-time AA activation (manual or auto)

AA accumulation SHALL be started either by an explicit `Engine.triggerAaAccumulation()` call (driven by a UI control or keyboard shortcut), or automatically when an opt-in "auto AA" option (`renderOptions.aaAuto`) is enabled. With auto AA disabled (the default), accumulation SHALL NOT start on its own. Either path resets all AA counters and sets the active flag. `antialiasLevel` SHALL define the maximum number of samples to accumulate.

#### Scenario: User triggers accumulation on a converged view

- **WHEN** the view is fully converged, idle, and the user activates the AA control with `antialiasLevel > 1`
- **THEN** the engine begins accumulating additional jittered samples up to `antialiasLevel`

#### Scenario: Auto AA starts on convergence

- **WHEN** `aaAuto` is enabled, `antialiasLevel > 1`, and the view becomes fully converged
- **THEN** the engine automatically begins accumulating, once per converged view (it does not re-trigger after completion until the next navigation resets state)

#### Scenario: AA does not auto-start when auto is off

- **WHEN** a view becomes fully converged and idle, `aaAuto` is disabled, and the AA control has not been activated
- **THEN** no accumulation occurs and the image stays at single-sample

#### Scenario: Level 1 is a no-op

- **WHEN** the AA control is activated with `antialiasLevel <= 1`
- **THEN** the displayed image is unchanged from the single-sample render

### Requirement: Sub-pixel jitter sampling

Each accumulated sample beyond the first SHALL offset the sampling grid by a sub-pixel jitter derived from an R2 low-discrepancy sequence warped through a tent filter, bounded to roughly ±1 texel. Sample 0 SHALL use zero offset. The jitter SHALL NOT mutate the float32 pan offset (`cx`/`cy`) that feeds reprojection delta-tracking, and SHALL NOT require recomputing the reference orbit or BLA table.

#### Scenario: First sample is unjittered

- **WHEN** the engine renders sample index 0
- **THEN** the jitter offset applied to `x0`/`y0` is exactly zero

#### Scenario: Subsequent samples are jittered

- **WHEN** the engine advances to sample index `n >= 1`
- **THEN** `x0`/`y0` are offset by the tent-warped R2 jitter for index `n`, while `cx`/`cy` and the reference orbit are unchanged

### Requirement: Gamma-correct linear accumulation

Accumulated samples SHALL be summed in linear RGB in an `rgba16float`
accumulation texture, and the displayed image SHALL be the per-pixel running
average converted back to sRGB. The PNG/snapshot export path SHALL be
unaffected by the linear roundtrip. (Decision history 2026-07-07: briefly
amended to display-space/sRGB averaging to match a browser-downscaled DPR×2
reference, then REVERTED by user decision — gamma-correct is a feature; the
linear mean legitimately reads brighter than an sRGB downscale on dark/bright
edges, and the perceived edge roughness was the jitter sequence's defect, not
the averaging domain's.)

#### Scenario: Average is gamma-correct

- **WHEN** N samples have been accumulated for a pixel
- **THEN** the presented color is the linear-space mean of those N samples, converted to sRGB

#### Scenario: Export is unchanged

- **WHEN** the user exports a PNG snapshot
- **THEN** the exported image uses the direct (non-accumulated, non-linear-roundtrip) color path

### Requirement: Distance-estimation-driven adaptive sample counts

The engine SHALL assign each pixel a target sample count derived from the per-pixel distance height (boundary proximity): smooth regions (set interior and far exterior) SHALL receive 1 sample, and pixels near the boundary SHALL receive up to `antialiasLevel` samples. A pixel SHALL contribute to the accumulator only while the current sample index is below its target count, and the present pass SHALL divide each pixel by its own accumulated sample count.

#### Scenario: Smooth pixel gets one sample

- **WHEN** a pixel is deep in the set interior or far in the exterior (large distance estimate)
- **THEN** its target count is 1 and it contributes only to sample 0

#### Scenario: Boundary pixel gets full sampling

- **WHEN** a pixel lies within ~1 texel of the set boundary (sub-texel distance estimate)
- **THEN** its target count is `antialiasLevel` and it accumulates that many samples

#### Scenario: Per-pixel averaging

- **WHEN** pixels with different target counts are presented together
- **THEN** each is divided by its own accumulated count, with no visible seam between regions

### Requirement: Selective reseed between samples

Advancing to sample `n` SHALL re-stamp as compute requests only the pixels whose target count exceeds `n`; all other pixels SHALL remain frozen and be skipped by the existing pass-through path so they are not re-iterated. This SHALL reuse the in-place fused render path and require no grid refinement or resolve passes.

#### Scenario: Only the boundary is recomputed

- **WHEN** the engine advances from sample `n` to `n+1`
- **THEN** only pixels with target `> n+1` are re-iterated, and frozen pixels retain their accumulated value at no iteration cost

#### Scenario: Early termination

- **WHEN** no pixel has a target count greater than the current sample index
- **THEN** accumulation stops before reaching `antialiasLevel`

### Requirement: Instant abort on interaction

Any navigation or parameter change SHALL immediately deactivate AA, reset all AA counters, and revert the next frame to a single-sample render with no stale blended frame visible. Resuming accumulation SHALL require re-triggering.

#### Scenario: Pan/zoom during accumulation

- **WHEN** the user pans or zooms while AA is accumulating
- **THEN** the image instantly reverts to single-sample progressive convergence and AA must be re-triggered

#### Scenario: Parameter change during accumulation

- **WHEN** a palette, material, or other render parameter changes while AA is accumulating
- **THEN** AA deactivates and the next render is single-sample

### Requirement: AA progress is observable

The engine SHALL expose readable AA progress (active flag, samples done, total target) so the UI can show an "AA: N/M" indicator and disable the trigger while accumulation is in progress.

#### Scenario: Progress reported during accumulation

- **WHEN** accumulation is in progress at sample `n` of `antialiasLevel`
- **THEN** the engine reports active = true, done = `n`, total = `antialiasLevel`

### Requirement: Contrast-driven target map fused with the DE ramp

The AA target bake SHALL derive the per-texel sample count from the fusion of
independent aliasing predictors, combined in TARGET space (each predictor maps
to a sample count through its own ramp; the fused target is their max):

- **DE ramp** (existing): geometric proximity to the set boundary — the only
  predictor that sees sub-pixel features invisible in the 1:1 render (thin
  filaments between samples).
- **Contrast ramp**: luma edge magnitude (Sobel or equivalent 3×3 gradient) of
  the CONVERGED sample-0 COLOR image (the accumulation texture after the first
  composite), projected from screen space into the neutral-texel target map —
  catches palette banding, zebra, stripe/orbit-trap/texture edges and shading
  contours the DE cannot see, on BOTH sides of the interior boundary.
- **Moiré saturation**: where the palette-phase frequency per screen pixel
  exceeds Nyquist (|∇ν| · 2 / palettePeriod ≳ 1), the target SHALL saturate to
  the full `antialiasLevel` regardless of local contrast — aliasing there
  manifests as low-frequency false structure that an edge detector
  under-reports, and averaging toward the palette mean is the correct output.

#### Scenario: Palette edge far from the set boundary

- **WHEN** a short-period palette produces a hard color band in a region where
  de_px > 6 (DE ramp target = 1)
- **THEN** the fused target along the band edge exceeds 1 and the band edge
  accumulates jittered samples

#### Scenario: Sub-pixel filament still covered

- **WHEN** a filament of the set is thinner than one texel and invisible in the
  sample-0 render (no local contrast)
- **THEN** the DE ramp alone still drives the fused target to `antialiasLevel`
  near it

#### Scenario: Interior side of the boundary

- **WHEN** an interior (in-set) texel borders escaped texels with visible
  contrast
- **THEN** its fused target exceeds 1 (today's DE ramp forces interior texels
  to 1), and its jittered re-iterations may legitimately flip to escaped —
  boundary coverage

#### Scenario: Moiré zone saturates

- **WHEN** the palette phase advances by more than half a period per screen
  pixel over a region
- **THEN** the region's target is `antialiasLevel` even where the local Sobel
  magnitude is low

#### Scenario: Bake input is the colored render

- **WHEN** the target map is baked for an accumulation
- **THEN** the contrast predictor reads the converged, colorized sample-0 image
  (post palette/shading, linear RGB), not the raw iteration layers
