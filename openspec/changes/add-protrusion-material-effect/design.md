## Context

The current renderer stores canonical analytic exterior geometry in the display cache: distance height, its gradient, and branch-local curvature. The color pass applies per-material `reliefGain` after cache normalization and uses one effective analytic scale for normals, AO, shadows, ridges, and slope-driven material cues. Palette row 6 is already sampled in the shading branch and its alpha channel is reserved.

The historical protrusions came from linearly interpolating complex orbit and derivative states across an escape crossing. Reintroducing that state interpolation would require additional legacy data or field invalidation and would restore its cancellation artifacts. The desired production effect is instead a stable stylistic modulation derived from the canonical cached field.

## Goals / Non-Goals

**Goals:**

- Provide a per-stop protrusion amount that interpolates through the existing palette system.
- Provide global phase and sharpness controls that are persisted with presets and palette looks.
- Preserve the current render exactly when the amount is omitted or zero.
- Produce a rhythmic lobe around smooth escape-iteration crossings while preserving the analytic gradient direction.
- Keep every analytic lighting cue on the same styled relief scale.
- Add no display attachment, texture row, texture fetch, orbit work, or cache invalidation.

**Non-Goals:**

- Pixel-exact emulation of the abandoned complex-state interpolation.
- Animation tracks or signed-dimple controls.
- Modification of distance height, analytic AA, Screen + Depth texture mapping, debug fields, or Rust/WASM iteration.

## Decisions

### Store one neutral per-stop control in palette row 6 alpha

Add `protrusion` in `[0, 1]`, defaulting to `0`, to the effect schema and `ColorStop`. Pack it into row 6 channel A. This channel is currently reserved and row 6 is already fetched lazily whenever material shading is active, so the effect adds neither palette memory nor sampling bandwidth. Existing effect interpolation and transfer curves apply automatically.

Amount remains a per-material palette value. Phase and sharpness are global surface-shape controls because they define one common lobe geometry across all stops. They reuse color-uniform slots 68 and 69, which were padding, so the 72-float buffer size stays unchanged.

### Modulate relief in the positive log-slope domain

For smooth escape value `v_smooth`, use:

```
phase = fract(v_smooth - protrusionPhase)
wave = 0.5 + 0.5 * cos(2*pi*phase)
lobe = pow(wave, protrusionSharpness)
gain = exp2(2 * protrusion * lobe)
styledRelief = effectiveAnalyticRelief * gain
```

Phase is wrapped to `[0, 1)`. Sharpness is clamped to `[0.25, 16]`; its default of `2` reproduces the initial broad squared-wave profile, smaller values broaden the lobe, and larger values concentrate it. The exponential matches the existing `reliefGain` convention: zero amount is exactly neutral and full strength reaches a 4x slope multiplier. Because the gain is strictly positive, it cannot reverse the cached analytic gradient.

Alternative: blend canonical and historical gradients. Rejected because the historical gradient is no longer present and transporting it would add storage and bandwidth.

### Keep analytic material cues coherent, but canonical geometry untouched

Use `styledRelief` for the analytic height gradient, curvature AO, local height shadow, ridge accent, and slope-driven iridescence. Keep cached height/gradient/curvature, depth mapping, analytic AA, reprojection payloads, and debug views canonical. Material texture bumps, stripe relief, and direction-coherence relief remain independently combined with the analytic surface.

## Risks / Trade-offs

- [The effect may read as regular banding rather than the irregular historical accident] -> Expose phase and sharpness for deliberate placement and concentration; evaluate curvature modulation only after visual A/B testing.
- [A 4x local slope can saturate highlights on strong base relief] -> Keep amount bounded to `[0, 1]`; users can also reduce `reliefGain` or global relief depth.
- [Default presets could change accidentally] -> Default to zero and add contract tests for neutral decoding and row-6 packing.
- [Static shader checks do not prove the final canvas look] -> Complete type and shader validation now; perform browser/WebGPU visual A/B only with explicit user approval.

## Migration Plan

Existing presets require no migration because absent `protrusion` values resolve to zero, absent `protrusionPhase` resolves to `0`, and absent `protrusionSharpness` resolves to `2`. Normalized and newly saved stops may emit the explicit amount default using the existing effect normalization path. Rollback consists of removing the fields and shader multiplier; cached fractal data remains compatible.

## Open Questions

- After visual evaluation, should phase become an animation track?
- Should a later experimental mode reproduce and cache the exact historical field for forensic comparison?
