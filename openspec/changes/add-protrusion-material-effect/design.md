## Context

The current renderer stores canonical analytic exterior geometry in the display cache: distance height, its gradient, and branch-local curvature. The color pass applies per-material `reliefGain` after cache normalization and uses one effective analytic scale for normals, AO, shadows, ridges, and slope-driven material cues. Palette row 6 is already sampled in the shading branch and its alpha channel is reserved.

The historical protrusions came from linearly interpolating complex orbit and derivative states across an escape crossing. Reintroducing that state interpolation would require additional legacy data or field invalidation and would restore its cancellation artifacts. The desired production effect is instead a stable stylistic modulation derived from the canonical cached field.

## Goals / Non-Goals

**Goals:**

- Provide a per-stop protrusion amount that interpolates through the existing palette system.
- Provide global phase, sharpness, and strength controls that are persisted with presets and palette looks.
- Provide up to `4x` amplification of the iteration-phase effect while keeping `1x` pixel-identical to the initial implementation.
- Provide a continuous mix between the iteration-phase lobe and a scalar geometric height warp, with a controllable height period.
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

Amount remains a per-material palette value. Phase, sharpness, and strength are global surface-shape controls because they define one common profile across all stops. Phase, sharpness, geometric mix, and geometric period occupy color-uniform slots 68 through 71; iteration-profile strength reuses reserved slot 93, so the current 96-float buffer size stays unchanged.

### Modulate relief in the positive log-slope domain

For smooth escape value `v_smooth`, use:

```
phase = fract(v_smooth - protrusionPhase)
wave = 0.5 + 0.5 * cos(2*pi*phase)
lobe = pow(wave, protrusionSharpness)
baseGain = exp2(2 * protrusion * lobe)
strength = clamp(protrusionStrength, 1, 4)
gain = 1 + strength * (baseGain - 1)
styledRelief = effectiveAnalyticRelief * gain
```

Phase is wrapped to `[0, 1)`. Sharpness is clamped to `[0.25, 16]`; its default of `2` reproduces the initial broad squared-wave profile, smaller values broaden the lobe, and larger values concentrate it. `baseGain` matches the existing `reliefGain` convention: zero amount is exactly neutral and full amount reaches a `4x` slope multiplier. Strength scales the visible departure from neutral rather than the exponent, so `4x` means four times the original effect amplitude (`1 + 4 * (4 - 1) = 13` at the theoretical peak), not `exp2(8) = 256`. Default strength `1` is exactly the initial rendering. Because `baseGain >= 1`, the amplified gain remains strictly positive and cannot reverse the cached analytic gradient.

Alternative: blend canonical and historical gradients. Rejected because the historical gradient is no longer present and transporting it would add storage and bandwidth.

### Offer a scalar geometric profile without changing the cached field

Let `H` be canonical distance height, `P` the bounded geometric period, `phi` the wrapped phase, `a` the per-stop protrusion amount, `s` the bounded sharpness, and `g` the global geometric mix in `[0, 1]`. Define

```
theta = 2*pi*(H/P - phi)
q = sign(cos(theta)) * abs(cos(theta))^s
geometricGain = max(1 + a*q, 0)
```

`q(theta + pi) = -q(theta)`, so its mean over a period is zero. `geometricGain(H) * grad(H)` remains the gradient of a scalar reparameterization of `H`; for `s = 1` this is the familiar sinusoidal height warp. `protrusionGeometryMix` linearly blends this multiplier with the amplified iteration-phase multiplier. Default mix `0` preserves the preferred iteration profile; default period is `1` distance-height unit.

The geometric variant changes the material relief field, not cached height, Screen + Depth mapping, analytic AA, or the full-screen-quad render architecture. It adds scalar ALU only and no texture read, attachment, register payload from the iteration kernel, or field-cache invalidation.

### Keep analytic material cues coherent, but canonical geometry untouched

Use `styledRelief` for the analytic height gradient, curvature AO, local height shadow, ridge accent, and slope-driven iridescence. Keep cached height/gradient/curvature, depth mapping, analytic AA, reprojection payloads, and debug views canonical. Material texture bumps, stripe relief, and direction-coherence relief remain independently combined with the analytic surface.

## Risks / Trade-offs

- [The effect may read as regular banding rather than the irregular historical accident] -> Expose phase and sharpness for deliberate placement and concentration; evaluate curvature modulation only after visual A/B testing.
- [Iteration-profile amplification can saturate highlights on strong base relief] -> Bound strength to `4x`, amplify the departure from neutral rather than the exponent, and retain `reliefGain` and global relief depth as compensating controls.
- [Default presets could change accidentally] -> Default to zero and add contract tests for neutral decoding and row-6 packing.
- [Static shader checks do not prove the final canvas look] -> Complete type and shader validation now; perform browser/WebGPU visual A/B only with explicit user approval.

## Migration Plan

Existing presets require no migration because absent `protrusion` values resolve to zero, absent `protrusionPhase` resolves to `0`, absent `protrusionSharpness` resolves to `2`, absent `protrusionStrength` resolves to `1`, absent `protrusionGeometryMix` resolves to `0`, and absent `protrusionPeriod` resolves to `1`. Any transient geometric-mix value above `1` is clamped back to full geometric selection. Normalized and newly saved stops may emit the explicit amount default using the existing effect normalization path. Rollback consists of removing the fields and shader multiplier; cached fractal data remains compatible.

## Open Questions

- After visual evaluation, should phase become an animation track?
- Should a later experimental mode reproduce and cache the exact historical field for forensic comparison?
