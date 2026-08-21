## ADDED Requirements

### Requirement: Rotation color resolve is an exclusive terminal branch

The progressive renderer SHALL select exactly one terminal color branch for a
frame: direct color, AA accumulation/presentation, or ready rotation-cache
presentation. A cache bake MAY precede rotation-cache presentation in the same
command encoder, but its output SHALL NOT feed AA accumulation.

#### Scenario: Direct fallback while cache is unavailable

- **WHEN** neither an AA result nor an eligible ready rotation cache is
  available
- **THEN** the frame uses the existing direct color branch

#### Scenario: AA owns terminal presentation

- **WHEN** AA is accumulating or its accumulator contains valid samples
- **THEN** the AA branch is selected and rotation-cache bake/presentation is
  skipped

#### Scenario: Ready settled rotation cache owns terminal presentation

- **WHEN** the view is eligible for rotation resolve, AA has no valid samples,
  and the rotation cache is ready or is fully baked in the current frame
- **THEN** the filtered rotation-cache branch is selected instead of direct
  color
