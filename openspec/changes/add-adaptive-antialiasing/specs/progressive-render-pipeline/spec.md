## ADDED Requirements

### Requirement: Linear-space color output for accumulation

When AA accumulation is active, the color pass SHALL render into an intermediate `rgba16float` accumulation texture with its RGB output converted to linear space, and a dedicated present pass SHALL convert the per-pixel average back to sRGB for the swapchain. When AA is inactive, the color pass SHALL render directly to the swapchain via an unmodified (non-linear-roundtrip) path so that single-sample output stays byte-identical to the pre-change behaviour.

#### Scenario: AA inactive uses the direct path

- **WHEN** AA is not active
- **THEN** the color pass renders straight to the swapchain with no accumulation texture or present pass, producing byte-identical output to before this change

#### Scenario: AA active uses accumulate + present

- **WHEN** AA is active
- **THEN** color renders to the `rgba16float` accumulation texture in linear space and the present pass divides by the per-pixel sample count and converts to sRGB

### Requirement: AA-driven selective reseed mode

The history-clear mechanism SHALL gain an AA mode in which, on advancing to a new sample, only pixels whose target sample count exceeds the current sample index are re-stamped as compute requests (`iter = -1`) within the texel-local in-place path, leaving all other pixels untouched. This mode SHALL run while the grid is already at its final refinement step and SHALL NOT trigger grid refinement, resolve, or freeze/merge snapshot passes.

#### Scenario: Selective reseed leaves smooth pixels frozen

- **WHEN** AA advances to sample `n` and a pixel's target count is `<= n`
- **THEN** that pixel's texture layers are left unchanged and the pixel is skipped by the pass-through path

#### Scenario: Freeze/merge suppressed during AA

- **WHEN** AA is accumulating
- **THEN** freeze and merge snapshot passes are not issued, because the present pass already displays the stable running average

### Requirement: Idle loop kept alive during accumulation

`needsMoreFrames()` SHALL report that more frames are needed while AA is actively accumulating, so the render loop continues cycling through jittered samples; it SHALL stop once accumulation completes or is aborted.

#### Scenario: Loop continues during accumulation

- **WHEN** AA is active and has not reached its target sample counts
- **THEN** `needsMoreFrames()` returns true so the animation loop keeps rendering samples

#### Scenario: Loop idles after completion

- **WHEN** AA accumulation completes (or is aborted)
- **THEN** `needsMoreFrames()` returns false and the loop goes idle
