## 1. Curve Model and Persistence

- [x] 1.1 Add the typed iteration palette curve model, normalization, numeric renderer codes, curve formulas, and derivative helpers with Linear fallback.
- [x] 1.2 Add the curve field and Linear defaults throughout Mandelbrot params, viewer/controller props, and render options.
- [x] 1.3 Save and restore the curve in complete presets, palette presets, and current state while defaulting legacy or unknown values to Linear.

## 2. Renderer Integration

- [x] 2.1 Upload the curve code in an available color-uniform slot and implement the four curve formulas in `color.wgsl`.
- [x] 2.2 Apply the selected curve consistently to final palette phase and preliminary smoothness phase without curving additive shifts.
- [x] 2.3 Pass the curve through `PalettePreview.vue` so the preview uses the same first-cycle mapping.
- [x] 2.4 Pass the curve to adaptive-AA targeting and include the selected curve derivative in the analytical palette-frequency estimate.
- [x] 2.5 Update cursor phase and offset helpers to match the selected curve.

## 3. User Interface

- [x] 3.1 Add a compact Distribution selector beside the existing palette period/offset controls with Linear, Soft Root, Logarithmic, and Quadratic choices only.
- [x] 3.2 Ensure curve changes trigger the required color/AA refresh without invalidating Mandelbrot iteration or geometry data.

## 4. Verification

- [x] 4.1 Add focused unit coverage for curve anchors, monotonic behavior, derivatives, compatibility fallback, and cursor phase parity.
- [x] 4.2 Run focused unit tests, TypeScript type checking, direct WGSL validation for affected shaders, strict OpenSpec validation, and `git diff --check` without Playwright.
