## Why

The palette currently advances at a constant rate with the smooth escape iteration, which limits control over how color cycles are distributed between low- and high-iteration regions. Adding a small set of monotone iteration curves makes broad boundary structures or fine high-iteration strata visible without changing the palette itself.

## What Changes

- Add four iteration-to-palette distribution modes: Linear, Soft Root, Logarithmic, and Quadratic.
- Define all nonlinear modes on the normalized coordinate `u = 2ν / palettePeriod`, before palette offset, height/geometry shifts, wrapping, and mirroring.
- Preserve the current linear render exactly for existing state and presets that do not contain the new field.
- Expose the distribution selector with the existing palette cycle controls.
- Keep cursor phase reporting, palette preview, and adaptive-AA palette-frequency estimation aligned with the selected curve.
- Persist the selected distribution in complete presets and palette presets.
- Do not add sinusoidal modulation or any non-monotone traversal mode.

## Capabilities

### New Capabilities

- `iteration-palette-curves`: Defines the supported monotone iteration curves, their renderer semantics, UI selection, and coupled phase/frequency behavior.

### Modified Capabilities

- `preset-management`: Complete presets and palette presets save and restore the selected iteration palette curve, while legacy records default to Linear.

## Impact

- Affects the palette phase path in `src/assets/color.wgsl`, the adaptive-AA frequency estimate in `src/assets/aa_target.wgsl`, renderer uniforms, cursor phase helpers, preview rendering, Vue parameter types/defaults, palette preset serialization, and the Palette settings UI.
- Adds no dependency and does not change Mandelbrot iteration, reference calculation, or geometry-field cache validity.
