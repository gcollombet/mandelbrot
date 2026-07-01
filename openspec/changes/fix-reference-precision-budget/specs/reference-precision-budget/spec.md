## ADDED Requirements

> These requirements capture the correctness behaviour of the fixed precision budget and the
> descending precision profile (`design.md` D1–D6). The aim is: a deep view must render
> identically to the same view after a page reload (the known-good fresh-reference baseline),
> with no precision-driven recompute during interactive zoom.

### Requirement: Fixed precision budget
The renderer SHALL expose a single precision-budget parameter expressed as a target scale,
defaulting to `1e-30`, adjustable from Settings via a slider reaching down to `1e-1000`, from
which the reference precision `P = −log₂(target) + guard` is derived and held fixed for the
session. Changing the parameter SHALL trigger a full reference recompute; no other interactive
action SHALL change `P`.

#### Scenario: Default budget keeps shallow use fast
- **WHEN** no budget is set
- **THEN** the target scale is `1e-30` and the reference is built at the corresponding `P`,
  not at the live view scale

#### Scenario: Slider spans to 1e-1000
- **WHEN** the navigation precision slider is moved to its deepest setting
- **THEN** the target scale is `1e-1000` and `P` is derived accordingly (≈ 3300 bits)

#### Scenario: Changing the budget recomputes the reference
- **WHEN** the precision-budget parameter is changed
- **THEN** the reference orbit is fully recomputed at the new `P` from iteration 0

#### Scenario: Interactive navigation never changes the budget
- **WHEN** the user zooms or pans without changing the parameter
- **THEN** `P` is unchanged and no precision-driven full recompute is triggered

### Requirement: Descending precision profile
The reference orbit SHALL be computed with per-step working precision
`p(n) = clamp(P − ⌊log₂|dZ_n/dC|⌋, floor, P)`, where `dZ_n/dC` is carried via the recurrence
`der_{n+1} = 2·Z_n·der_n + 1` (not the product `Σ log₂|2Z_j|`). The first step SHALL use full
precision `P`; precision SHALL only decrease as the orbit derivative grows and SHALL increase
again where the derivative falls.

#### Scenario: Early iterations use full precision
- **WHEN** the reference orbit is computed
- **THEN** step `n = 1` is computed at precision `P` (the error-sensitive region)

#### Scenario: Precision sheds only earned bits
- **WHEN** the orbit derivative `|dZ_n/dC|` has grown by `g` bits at step `n`
- **THEN** the working precision at step `n` is at most `P − ⌊g − margin⌋` and never below the
  floor, so bits are shed only after the orbit has amplified them

#### Scenario: Precision rises back near minibrot returns
- **WHEN** the orbit returns near zero and `|dZ_n/dC|` drops
- **THEN** the working precision rises accordingly (the derivative is carried via the true
  `2·Z·der + 1` recurrence, so cancellation at returns does not cause over-shedding)

#### Scenario: Reference centre stays at full budget precision
- **WHEN** the descending profile reduces the working precision of a step
- **THEN** the reference centre `C` (`reference_cx/cy`, `cx/cy`, and the per-pixel offset
  `dc = c_pixel − C`) is still carried at the full budget precision `P`; only the orbit value
  `z_n` uses the reduced per-step precision

#### Scenario: Minibrot search runs at full budget precision
- **WHEN** period detection or Newton nucleus refinement runs to find or refine a reference
  centre
- **THEN** its critical orbit and derivative are carried in DBig at the full budget precision
  `P` (not the live-view-scale precision, and not the descending profile), so the resulting
  centre `C` is located to full budget depth

### Requirement: Append-only orbit growth under a fixed budget
While the precision budget is unchanged, deepening the view SHALL only extend the reference
orbit in iteration count at the fixed profile; previously computed steps SHALL NOT be
recomputed for precision reasons. A view at any scale shallower than the budget target SHALL
be served by the existing orbit without recompute.

#### Scenario: Pure zoom-in extends without recompute
- **WHEN** the user zooms in (no recenter) within the budget
- **THEN** the orbit is extended in `n` only, existing steps unchanged, and the live render
  matches the same view rendered after a page reload

#### Scenario: Shallower view reuses a deeper orbit
- **WHEN** the view is at a scale shallower than the budget target
- **THEN** the already-computed (deeper-budget) orbit is reused without recompute

#### Scenario: Recenter remains the only other recompute trigger
- **WHEN** the view centre drifts more than `20·scale` from the reference
- **THEN** the reference is recentred and recomputed (the pre-existing trigger), independent
  of the precision budget

### Requirement: Beyond-budget degradation
When the view is zoomed deeper than the configured budget, the renderer SHALL continue with
the existing budget precision (assumed degradation) and SHALL NOT clamp the zoom nor
auto-raise the budget.

#### Scenario: Zooming past the budget degrades rather than recomputes
- **WHEN** the view scale goes below the budget target scale
- **THEN** rendering proceeds at the existing `P` (becoming imprecise) until the user raises
  the parameter; no automatic recompute or zoom clamp occurs

### Requirement: Budget persisted per preset
The precision-budget parameter SHALL be saved and restored as part of preset state.

#### Scenario: Preset restores its budget
- **WHEN** a preset is saved at a given budget and later loaded
- **THEN** the budget is restored and the reference is built once at that `P`, with no
  precision-driven recompute during the dive into the preset

### Requirement: Reference iteration headroom
The reference orbit SHALL be computed to `2 × maxIter` iterations rather than stopping at
`maxIter`, to retain headroom for interactive zoom-in.

#### Scenario: Headroom avoids transient black frames
- **WHEN** interactive zoom-in raises `maxIter`
- **THEN** the reference already covers up to `2 × maxIter`, so `guardedMaxIter` does not
  starve and no transient black frame appears while the orbit catches up

### Requirement: Bounded BLA/Padé block length
The `max_bla_skip` upper clamp SHALL be `2¹⁸` (lowered from `2²⁰`), bounding the longest block
length so the f32 reference-orbit noise stays masked under the default `blaEpsilon`.

#### Scenario: Longest block bounds the f32 noise
- **WHEN** `max_bla_skip` is set to its maximum
- **THEN** the effective longest block is `2¹⁸`, for which the f32 reference noise
  `√L·1e-7 ≈ 5e-5` stays well under the default `blaEpsilon = 1e-3`
