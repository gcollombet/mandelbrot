## Why

The current "Orbit trap" control applies a fixed axes/diagonals/circle mask to the terminal escape point, so it is neither visually distinctive nor a true closest-approach orbit trap. The renderer needs a recognizable parametric terminal style first, followed by an orbit-aware mode that records when and where the orbit most closely approaches the chosen trap.

## What Changes

- Replace the fixed terminal mask with a configurable logarithmic-rosette family whose center, scale, rotation, anisotropy, petal count, petal depth, twist, phase, width, hardness, and strength can be controlled independently.
- Preserve an explicitly named fast terminal mode that reacts in the color pass without recomputing the Mandelbrot orbit.
- Add a true orbit mode that accumulates closest distance, hit iteration, and hit angle while the orbit is evaluated.
- Let color phase combine distance, hit iteration, and hit angle with independent weights.
- Expose compact primary controls plus advanced geometry, traversal, encoding, and composition controls, and persist them in palette presets.
- Make the accuracy policy explicit: terminal mode is immediate; sampled orbit mode is compatible with accelerated block endpoints; exact orbit mode unfolds or rejects skips that cannot preserve the closest approach.
- Keep all new behavior disabled by default and preserve legacy presets that only contain `orbitTrapStrength`.

## Capabilities

### New Capabilities

- `parametric-orbit-traps`: Configurable terminal and orbit-aware trap rendering, persistence, accuracy policy, and user controls.

### Modified Capabilities

None.

## Impact

- WGSL color uniforms and terminal color composition in `src/assets/color.wgsl`.
- Mandelbrot orbit state, raw/resolved storage, skip handling, and shader uniforms in `src/assets/mandelbrot_brush.wgsl` and related resolve/merge paths.
- TypeScript render options, GPU resource allocation, preset schema, defaults, and compatibility normalization.
- Vue settings, preview, and palette persistence paths.
- Static shader validation, TypeScript build checks, and focused Rust/WGSL tests where applicable; browser visual validation remains a separate step.
