---
name: palette-stop-parameter
description: Use when adding a new per-stop palette parameter, ColorStop effect field, palette texture channel, PaletteEditor slider, or WGSL palette effect in this Mandelbrot project.
---

# Palette Stop Parameter

Use this skill when the user asks to add a new parameter per stop in the palette, a new stop effect, or a new palette-driven shader value.

## Goal

Add the parameter as a first-class `ColorStop` field, make it interpolate between stops, persist through stop/palette presets, expose it in `PaletteEditor.vue`, encode it into `Palette.generateTexture()`, and read it from `src/assets/color.wgsl` if the renderer needs it.

## Main Files

- `src/ColorStop.ts`: source of truth for per-stop fields, defaults, interpolation, and `EffectFieldName`.
- `src/Palette.ts`: packs interpolated stop values into the `4096 x N` `rgba16float` palette texture.
- `src/assets/color.wgsl`: decodes palette texture rows into `EffectParams` and applies them in the color shader.
- `src/components/PaletteEditor.vue`: UI metadata and sliders for editing the selected stop or all stops.
- `src/stopPresetStore.ts`: stop presets automatically include every field listed in `EFFECT_FIELD_NAMES`.
- `src/components/Settings.vue`: only touch when a legacy global toggle/slider must initialize or sync the new per-stop field.
- `src/Mandelbrot.ts` and `src/paletteStore.ts`: only touch when the new setting also has global UI/preset state, not for a pure per-stop parameter.

## Implementation Checklist

1. Define the field in `src/ColorStop.ts`.
2. Add a short doc comment on `ColorStop` with the expected range and default.
3. Add the default value to `COLOR_STOP_DEFAULTS`.
4. Add the field name to `EFFECT_FIELD_NAMES` so interpolation, presets, and generic UI helpers see it.
5. If the value is angular, update `createInterpolatedColorStop()` and `Palette.getEffectAt()` logic so it interpolates through the shortest angle path; otherwise use normal linear interpolation.
6. Add UI metadata in `PaletteEditor.vue` `EFFECT_UI`: label, min, max, step, and unit.
7. Add the field to the right UI group in the template, or create a new small group if it does not fit existing categories.
8. Encode the field in `Palette.generateTexture()` by choosing an available row/channel or increasing `TEXTURE_HEIGHT`.
9. Keep `ColorStop.ts` texture layout comments and `Palette.ts` layout comments in sync with the real packing.
10. Decode the field in `src/assets/color.wgsl` `EffectParams` and `sampleEffects()` if the shader needs it.
11. Apply the decoded value in WGSL at the point where the effect is computed.
12. Run typecheck/build verification.

## Texture Packing Rules

Current palette texture layout:

```text
Row 0: R, G, B, palette
Row 1: zebra, tessellation, shading, skybox
Row 2: webcam, smoothness, shadingLevel, specularPower
Row 3: lightAngle, metallic, roughness, anisotropy
Row 4: iridescence R, G, B, enabled
Row 5: stripeAverage, rotationMean, stripeRelief, directionCoherenceRelief
```

Prefer reusing a genuinely unused channel only if it is not already read by WGSL. If no safe channel exists, increase `TEXTURE_HEIGHT` in `src/Palette.ts`, update the layout comments, pack a new row, and sample the new row in `src/assets/color.wgsl` using the correct normalized row center.

For `TEXTURE_HEIGHT = H`, row `r` should be sampled at `(r + 0.5) / H`. If changing the height, update all row sampling coordinates in WGSL or introduce constants/functions to avoid stale magic numbers.

## UI Rules

- Use existing `getStopEffect(field)` and `setStopEffect(field, value)` in `PaletteEditor.vue`.
- Respect `applyToAll`: edits should affect either the selected stop or every stop through the existing helper.
- Use `EffectFieldName[]` casts in template lists, matching the existing style.
- Keep labels concise because the panel is compact.
- Do not add global controls unless the user explicitly asks for backward-compatible legacy UI behavior.

## Persistence Rules

- Saved palettes keep full `colorStops`, so a new `ColorStop` field persists automatically.
- Stop presets use `EFFECT_FIELD_NAMES`; adding the field there is enough for save/apply behavior.
- Imported older presets should work through `COLOR_STOP_DEFAULTS` and `getEffectValue()`. Do not write migration code unless there is a real stored-data shape change beyond an optional field.

## Verification

Run at least:

```bash
npx vue-tsc -b
```

If shader packing or rendering behavior changed, also run:

```bash
npm run build
```

Build can be slower because it also builds the WASM package.

## Common Pitfalls

- Do not add a field only to `ColorStop`; it will not reach the shader unless `Palette.generateTexture()` packs it.
- Do not add a slider without adding the field to `COLOR_STOP_DEFAULTS` and `EFFECT_FIELD_NAMES`.
- Do not overwrite per-stop values from `Settings.vue` watchers unless the feature is explicitly a legacy global control.
- Do not silently repurpose `row3.r` unless `lightAngle` is confirmed unused for the desired behavior; comments call it legacy, but it is still encoded.
- Keep TypeScript strict: avoid `any`, unused locals, and unused imports.
