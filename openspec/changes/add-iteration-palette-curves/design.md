## Context

The color pass currently derives a cyclic palette coordinate from the smooth escape iteration with `u = 2ν / palettePeriod`, then adds the animated offset and spatial palette shifts before wrapping or mirroring. The same linear relation is duplicated in cursor phase reporting, the preview renderer, and adaptive-AA's palette-frequency estimate. The selected curve is part of a palette look and therefore must travel through the same model and preset paths as period, offset, and mirror.

## Goals / Non-Goals

**Goals:**

- Add four deterministic, monotone distribution choices while retaining a meaningful period reference.
- Make Linear byte-for-byte equivalent at the phase-formula level to the existing path.
- Keep every renderer and inspection path consistent with the selected curve.
- Preserve old local, complete-preset, and palette-preset records without migration writes.

**Non-Goals:**

- Sinusoidal modulation, palette reversal beyond the existing mirror control, or other non-monotone curves.
- Histogram equalization or viewport-dependent coloring.
- Changing smooth escape iteration, orbit-trap iteration weighting, palette stop interpolation, or geometry/iteration caches.

## Decisions

### Use normalized, softened curves with a common first-cycle anchor

Let `u = max(2ν / palettePeriod, 0)`. The renderer applies one of:

- Linear: `F(u) = u`
- Soft Root: `F(u) = (sqrt(1 + u) - 1) / (sqrt(2) - 1)`
- Logarithmic: `F(u) = log(1 + u) / log(2)`
- Quadratic: `F(u) = ((1 + u)^2 - 1) / 3 = u(u + 2) / 3`

Every curve has `F(0) = 0`, `F(1) = 1`, is monotone for `u >= 0`, and has a finite derivative at zero. This keeps `palettePeriod / 2` as the first complete-cycle reference while deliberately varying later cycle spacing. Pure `sqrt(u)` was rejected because its infinite derivative at zero would heavily compress early-iteration colors for large periods. Raw `sin(u)` was rejected because it is bounded and reverses direction.

### Transform only the smooth-iteration coordinate

The final raw palette coordinate is `F(u) + offset + heightShift + geometryPhaseShift`; wrapping/mirroring remains last. Offsets and spatial shifts are not passed through the nonlinear curve, so their existing units and animation behavior remain stable. The preliminary phase used to fetch the per-stop smoothness weight applies the same curve but retains its current omission of height and geometry shifts. Orbit-trap color phase remains independent and linear.

### Represent the choice as a persisted string and a numeric uniform code

TypeScript uses a closed string union (`linear`, `soft-root`, `logarithmic`, `quadratic`) for readable records and UI values. Renderer upload converts it to a small numeric code. Missing or unknown serialized values normalize to `linear`; the shader also treats unknown numeric codes as Linear. This makes Linear the compatibility and safety fallback.

### Mirror the curve and its derivative in adaptive AA

For the analytical palette-frequency term, the phase gradient becomes `|∇ν| * (2 / palettePeriod) * F'(u)`. The derivatives are:

- Linear: `1`
- Soft Root: `1 / (2 (sqrt(2) - 1) sqrt(1 + u))`
- Logarithmic: `1 / ((1 + u) log(2))`
- Quadratic: `2(1 + u) / 3`

The existing rendered-color Sobel term remains unchanged. Passing the curve code to the AA target avoids under-sampling Quadratic and needless over-sampling of compressed high-iteration Root/Log regions.

### Treat curve changes as color/AA changes, not fractal-field changes

Changing the curve updates color uniforms and requires the adaptive-AA target to reflect the new frequency, but does not invalidate the Mandelbrot iteration payload or packed geometry fields. This matches period/offset-style palette changes and avoids unnecessary reference or compute work.

## Risks / Trade-offs

- [Nonlinear modes make `palettePeriod` non-constant after the first cycle] → Label the control as the existing period but document the shared first-cycle anchor; all modes still agree at `u = 1`.
- [Quadratic can generate high spatial frequency and expose aliasing] → Include `F'(u)` in adaptive-AA targeting and retain the rendered-color edge detector.
- [Duplicated formulas can drift between WGSL and TypeScript] → Use named helpers in each path and focused formula/compatibility tests with shared reference cases.
- [Transcendental operations add color-pass work] → Root and Log add one uniform-selected square-root or logarithm per colored sample; validate statically now and reserve real-browser/GPU measurement for visual/performance confirmation.
- [Very large transformed coordinates lose fractional f32 precision] → This already exists for extreme linear coordinate/period ratios and is not expanded into a precision redesign in this change.

## Migration Plan

1. Add the optional serialized field and normalize missing/unknown values to Linear at read/application boundaries.
2. Default all newly constructed views and records to Linear.
3. Upload Linear's numeric code when the field is absent so existing renders remain unchanged.
4. Rollback can ignore the additive field; no record rewrite or destructive migration is required.

## Open Questions

None for the initial four-mode scope.
