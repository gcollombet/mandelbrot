## Context

Animation recipes are normalized from a fixed `AnimationTrackId` union and evaluated inside `Engine.update()`. Contributions are currently added to base render parameters before the existing color uniform buffer is written. The six selected controls already occupy that uniform buffer, so they can animate without changing the WGSL ABI or mutating saved base parameters.

## Goals / Non-Goals

**Goals:**

- Add six independent tracks with useful defaults and stable French labels.
- Keep animation additive relative to the active preset's base values.
- Wrap cyclic phases and clamp bounded values to their established renderer domains.
- Preserve older saved recipes through normalization.
- Keep all six tracks in the display/color path rather than forcing per-frame fractal-field recomputation.

**Non-Goals:**

- Animate navigation, palette period, stripe frequency, orbit-trap geometry, performance controls, or per-stop material fields.
- Change wave shapes, playback controls, the color uniform layout, or preset storage format.
- Claim target-GPU visual quality or performance from static tests.

## Decisions

1. Add `protrusionPhase`, `reliefDepth`, `orbitTrapPhaseOffset`, `orbitTrapStrength`, `gradeSaturation`, and `gradeContrast` to the existing track registry. This reuses the mixer and preset model instead of introducing a second modulation system.
2. Evaluate each new contribution in `Engine.update()` and combine it with the base render option only when constructing effective color-uniform values. This leaves the Vue model and saved preset unchanged while playback runs.
3. Wrap protrusion and orbit-trap color phases with a positive fractional operation. Clamp relief depth to `[0, 2]`, trap strength to `[0, 100]`, saturation to `[0, 2]`, and contrast to `[0.5, 2]`, matching their UI domains.
4. Use conservative defaults: phase tracks use `loop`; bounded tonal and strength tracks use `sine` or `pulse`; every new track is disabled by default under the existing default-track rule.
5. Do not animate orbit-trap rotation, shape phase, center, or scale because those participate in the accumulator signature and can invalidate the computed trap payload every frame. `phaseOffset` and `strength` remain color-only controls.

## Risks / Trade-offs

- [Clamping can flatten waveform peaks near a base value's boundary] → Use moderate default amplitudes and document amplitude as a contribution around the current base.
- [Orbit-trap tracks appear inert while the trap mode is off] → Keep their labels explicit; they become active without changing the stored recipe when a trap mode is enabled.
- [Some relief controls require a palette whose shading/protrusion weights are nonzero] → Preserve this intentional material coupling rather than silently activating effects.
- [More tracks make the mixer denser] → Limit the expansion to the six reviewed controls and keep them disabled by default.
