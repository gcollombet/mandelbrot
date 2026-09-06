## Why

The animation mixer currently covers palette drift, light direction, texture motion, and a few material strengths, but it cannot animate several high-value color-pass controls already exposed by the renderer. Adding a small curated set broadens expressive motion without continuously recomputing the fractal field.

## What Changes

- Add tracks for protrusion phase, relief depth, orbit-trap color phase, orbit-trap intensity, display saturation, and display contrast.
- Apply cyclic wrapping or bounded clamping according to each parameter's existing renderer domain.
- Keep new tracks disabled by default and normalize older animation presets by supplying their missing track defaults.
- Add focused tests for track defaults, compatibility, and Engine-to-WGSL effective-value wiring.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `animation-mixer`: Expand the curated animation tracks while preserving independent playback and legacy preset compatibility.

## Impact

The change affects `AnimationConfig.ts`, the Animation panel labels, the Engine's per-frame effective color uniforms, and focused unit tests. It does not add dependencies, change the shader uniform ABI, or animate navigation, iteration, AA, or other compute-sensitive controls.
