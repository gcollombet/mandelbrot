## Context

The current animation model is a single `activateAnimate` toggle and `animationSpeed` multiplier exposed in the Palette panel. The shader uses those two values to animate multiple concerns: palette offset, texture coordinate drift, webcam texture drift, and skybox/environment drift. This makes the UI label too narrow and prevents users from choosing which property animates.

Palette records currently persist `animationSpeed` alongside palette cycle/material settings, while full presets deliberately remove `activateAnimate` before saving. Shared catalog support already exists for complete presets, palette presets, stop presets, textures, and texture mapping presets. The new animation system should follow those patterns rather than introduce a new backend shape.

## Goals / Non-Goals

**Goals:**
- Add a standalone Animation panel between Graphics and Palettes.
- Model animation as a reusable recipe with named tracks instead of a single global drift flag.
- Keep playback state separate from the saved animation recipe.
- Support local animation presets and shared catalog upload/sync.
- Keep the first version as a simple mixer with a fixed curated list of tracks.
- Preserve backward compatibility with existing local settings and palette records that contain `animationSpeed`.

**Non-Goals:**
- No keyframe timeline.
- No free-form expression editor.
- No user-defined custom property binding in the first version.
- No animation of navigation coordinates, scale, max iterations, epsilon, or performance controls.
- No automatic playback when a preset is loaded.

## Decisions

### Use a dedicated `AnimationConfig` data model

Introduce an animation recipe object under Mandelbrot parameters, shaped around a `globalSpeed` multiplier and fixed track entries. Each track stores `enabled`, `type`, `speed`, `amplitude`, and optional `phase`.

Alternative considered: keep adding scalar fields such as `paletteOffsetAnimationSpeed` and `lightAngleAnimationSpeed`. That would be cheaper initially, but it would spread animation concerns across unrelated properties and make presets/catalog serialization harder to evolve.

### Keep play/pause outside the reusable preset recipe

The saved animation preset stores the recipe, not whether animation is currently playing. Loading an animation preset applies track settings but does not enable playback unless the user presses Play/Drift.

Alternative considered: save enabled playback inside the preset. That is surprising when browsing presets because loading a recipe could immediately start motion and alter performance expectations.

### Ship a fixed first set of mixer tracks

The first version uses these tracks: Palette Offset, Height Palette Shift, Light Angle, Texture Drift, Sky Reflection Drift, Phase Coloring, Varnish, Micro Bump, Displacement, and Tessellation. This avoids the complexity of a generic property picker while covering the visually meaningful properties already identified.

Alternative considered: allow arbitrary animatable property selection. That is more powerful, but it requires validation, range metadata, UI for adding/removing tracks, and more edge-case handling around incompatible properties.

### Drive shader motion from explicit animation uniforms

The renderer should compute or pass compact animation channel values derived from the recipe and current time. The shader should stop treating a single `animationSpeed` as the source for every drift. Existing shader drift sites should consume named channel speeds/amplitudes so tracks can be enabled independently.

Alternative considered: mutate the base `MandelbrotParams` values on every frame in Vue. That would make UI sliders move continuously, complicate persistence, and make it harder to distinguish base values from animated modulation.

### Create `animationPreset` as a first-class catalog type

Add an IndexedDB-backed `animationPresetStore` and extend remote catalog types with `animationPreset`. Follow existing texture mapping and palette preset patterns for GUIDs, names, favorites, remote metadata, upload, conflict handling, and sync.

Alternative considered: store animation presets inside palette presets. That would keep fewer catalog types, but it preserves the current coupling that this change is meant to remove.

### Migrate gently from legacy animation fields

Existing `animationSpeed` and `activateAnimate` values should remain readable. On load, missing animation recipes should be normalized to defaults, with legacy `animationSpeed` used as the initial `globalSpeed` where present. Palette preset loading should stop applying animation recipe fields after the new animation preset type exists.

## Risks / Trade-offs

- Uniform size and shader alignment mistakes could break rendering. Mitigation: keep channel uniforms grouped and update `PalettePreview` uniform defaults alongside `Engine`.
- Animation presets add another catalog type and more UI. Mitigation: mirror existing preset/dropdown/upload patterns and keep the first mixer fixed.
- Decoupling palette animation fields may surprise users with old saved palettes. Mitigation: keep legacy fields readable during migration but do not write new palette animation fields.
- Per-track animation can create visually extreme results. Mitigation: define conservative default amplitudes and clamp shader-side values.
- Tessellation/displacement animation may be less stable than pure color/light animation. Mitigation: default those tracks off or use low amplitudes.

## Migration Plan

1. Add animation normalization defaults so old saved settings still load.
2. Introduce the new animation data model without removing legacy `activateAnimate` immediately.
3. Add the Animation panel and move Drift controls there.
4. Stop writing animation recipe fields into new palette preset records.
5. Add animation preset storage and catalog sync.
6. Keep legacy `animationSpeed` fallback until enough releases have normalized saved settings.

Rollback is straightforward if the new fields are additive: ignore `animation` and continue using `activateAnimate` / `animationSpeed`.

## Open Questions

- Should complete presets include animation recipes, or should animation recipes only live in animation presets and the last local session state?
- Should the Animation panel include thumbnail previews for animation presets in the first version, or start with name-only presets?
- Should Texture Drift and Sky Reflection Drift expose amplitude in the first version, or use fixed amplitudes with speed/type only?
