## Context

The renderer uses a frozen/live zoom reprojection cycle to keep navigation responsive while the GPU progressively recomputes the Mandelbrot texture. During this cycle, the frozen texture stores samples computed at `frozenScale`, the live texture stores samples computed at `liveScale`, and the displayed view uses the current `mandelbrot.scale`.

The existing color path already accounts for these scale differences when reprojecting UVs and comparing resolution steps. It does not account for the same scale difference when using layer 4 distance-height data. Layer 4 stores a logarithmic screen-distance height computed by `mandelbrot.wgsl` with `-log(worldDistance / sourceScale)`. Reading that value unchanged across live and frozen sources mixes incompatible source-scale units.

## Goals / Non-Goals

**Goals:**

- Render live and frozen distance-height values in the same display-scale unit during zoom reprojection.
- Write merged frozen snapshots with distance-height values already normalized to the merge display scale.
- Preserve the current logarithmic distance-height representation and existing live/frozen sample selection.
- Apply the correction consistently to central distance-height samples and neighbor samples used for gradients.

**Non-Goals:**

- Change Mandelbrot iteration, reference orbit generation, or perturbation/BLA behavior.
- Change zoom state transitions, threshold logic, or min-step-wins resolution selection.
- Add new UI controls or debug modes.
- Remove visible differences caused by genuinely different refinement levels between live and frozen textures.

## Decisions

1. Normalize distance height with a logarithmic offset.

   Distance height is stored as a log-space value, so source-to-display normalization MUST use subtraction of the logarithmic scale ratio:

   ```text
   height_display = height_source - log(sourceScale / displayScale)
   ```

   In the color shader, the existing uniforms already expose the needed ratios:

   ```text
   frozen offset = -log(zoomFactor)
   live offset   = -log(liveZoomFactor)
   ```

   Alternative considered: multiply the stored height by an inverse zoom amount. This was rejected because the stored value is not a linear distance and multiplication would distort the height field.

2. Apply source-specific offsets in `color.wgsl`.

   The color shader should pass a source-specific distance-height offset when colorizing a live or frozen sample. The same offset must be used for neighbor reads within that source so gradients do not gain artificial slopes.

   Alternative considered: only correct the debug distance sector. This would validate the visual discontinuity, but it would leave palette height shift, relief, subsurface, and debug gradient using mixed source-scale units.

3. Normalize layer 4 during `merge_frozen.wgsl`.

   The merge pass should write layer 4 in display-scale units for the output snapshot. Live candidates should write `liveLayer4 - log(liveZoomFactor)` and frozen candidates should write `frozenLayer4 - log(zoomFactor)`. After the zoom state returns to idle, the merged frozen texture can be consumed with `zoomFactor = 1` and no residual correction.

   Alternative considered: only correct at display time. This was rejected because the merge can bake a patchwork of live-scale and frozen-scale layer 4 values into the post-zoom frozen snapshot.

## Risks / Trade-offs

- Height-based palette and material effects may shift during zoom because they will now follow display-scale distance rather than source-scale distance. This is expected, but visual QA should check that the motion feels continuous.
- Debug gradient discontinuities caused by different refinement levels can remain. The change only normalizes units; it does not make a coarse frozen sample equivalent to a finer live sample.
- Incorrectly applying the offset to only central samples or only neighbor samples can create artificial gradients. The implementation should keep source-specific offset application local and explicit.
- Clamping around `[-64, 64]` and debug remapping around `[-16, 16]` can still saturate extreme zoom transitions. The correction should preserve existing clamp behavior rather than introduce a new range.
