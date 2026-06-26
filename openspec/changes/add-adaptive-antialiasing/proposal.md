## Why

Once a view is fully converged and the user stops interacting, the renderer sits idle while the image still shows single-sample aliasing along the fractal boundary (jagged filaments, shimmering iteration bands). We can spend that idle time progressively sharpening the image with sub-pixel jittered supersampling — and, because the renderer already computes a per-pixel distance estimate, we can concentrate that work only on the thin boundary where aliasing actually lives, making high-quality antialiasing affordable even at deep zoom.

## What Changes

- Add **idle-time antialiasing**: a public `Engine.triggerAaAccumulation()` (wired to a UI button/shortcut) starts accumulating extra full renders, each sampled at a tiny R2 + tent-filter sub-pixel jitter offset, averaged in linear RGB and presented gamma-corrected. Manual by default; an opt-in **auto AA** option (`renderOptions.aaAuto`) starts accumulation automatically once the view fully converges.
- Add **gamma-correct linear-space accumulation**: color output is converted sRGB→linear, summed in an `rgba16float` accumulation texture, then divided and converted linear→sRGB by a new present pass. A separate `fs_main_direct` entry point preserves the existing PNG export path unchanged.
- Add **distance-estimation-driven adaptive sampling**: a per-pixel target sample count is baked once (after the first sample) from the existing per-pixel distance height (layer 4). Smooth regions (interior, far exterior) get 1 sample; boundary pixels get up to `antialiasLevel` samples. The accumulation alpha channel doubles as each pixel's personal sample counter, so the present pass divides per-pixel.
- Add **selective reseed** so adaptive sampling also saves wall-clock, not just quality: between samples, only pixels whose target exceeds the current sample index are re-stamped as compute requests (`iter = -1`); the rest stay frozen and are skipped by the existing pass-through path. Since the grid is already fully refined at AA time, this needs no grid-refinement or resolve machinery.
- Add **instant abort**: any navigation or parameter change clears AA state and reverts to single-sample on the next frame; the user must re-trigger.
- Wire the existing-but-unused `antialiasLevel` field through to a UI control plus an AA trigger and progress indicator.

## Capabilities

### New Capabilities
- `adaptive-antialiasing`: idle-time, explicitly-triggered sub-pixel-jitter supersampling with gamma-correct linear accumulation, distance-estimation-driven per-pixel sample counts, selective reseed for cost savings, and instant abort on interaction.

### Modified Capabilities
- `progressive-render-pipeline`: the color pass gains a linear-space output path and an intermediate accumulation texture + present pass; convergence/idle detection (`needsMoreFrames`) and the history-clear mechanism gain an AA-driven selective-reseed mode. Single-sample (`antialiasLevel <= 1`, AA inactive) behaviour must remain byte-identical to today.

## Impact

- **Shaders**: `mandelbrot.wgsl`, `mandelbrot_brush.wgsl` (jitter uniform fields + `x0`/`y0`; selective reseed in the in-place fused path), `color.wgsl` (sRGB↔linear helpers, `fs_main_direct`), new `present.wgsl`, new tiny target-map bake pass.
- **Engine** (`src/Engine.ts`): AA state machine, jitter offset computation, accumulation/present pipelines + bind groups, `aaTargetTexture`, pass-3/4 rewrite, `needsMoreFrames`/`update()` hooks, conditional present (direct path when AA inactive), snapshot pipeline swap. Uniform free slots are indices **18/19** (`_padding2`/`_padding3`) — index 17 (`scaleExp`) is in use on the deep path.
- **Math** (`src/Mandelbrot.ts`): `computeAaJitterOffset` (R2 sequence + tent warp).
- **UI** (`src/components/Settings.vue` and viewer wiring): `antialiasLevel` slider, "Render AA" trigger, "AA: N/M" progress.
- **Tests**: Playwright visual baselines may need regenerating due to the sRGB↔linear roundtrip through `rgba16float` even at level 1 (mitigated by keeping the direct path when AA is inactive). No Rust changes expected.
- **Constraint**: adaptive AA assumes convergence to grid step 1 (`zoomMinBrushStep = 1`); coarser minimum steps are incompatible with selective reseed.
