## 1. Texture Mapping Model

- [x] 1.1 Add `TextureMappingVariable` and `TextureMappingConfig` types with built-in Screen Space and Dragon Scales mapping constants.
- [x] 1.2 Add normalization helpers that clamp axis scales to `0.01..100`, validate variables, and convert legacy `textureMappingMode` values to structured mappings.
- [x] 1.3 Replace active state defaults from `textureMappingMode` to the structured texture mapping object while keeping legacy reads as fallback.
- [x] 1.4 Update `MandelbrotParams`, palette record types, and render option types to carry the structured mapping object.

## 2. Renderer And Shader

- [x] 2.1 Update `Engine.ts` render option plumbing and color uniform packing to pass X variable ID, Y variable ID, X scale, Y scale, and mirror state.
- [x] 2.2 Update the WGSL `Uniforms` struct to match the new packed mapping fields.
- [x] 2.3 Replace the fixed `textureMappingMode` branch in `color.wgsl` with variable evaluation helpers for v1 mapping variables.
- [x] 2.4 Implement composed shader variables for `screenXWithDepth`, `screenYWithDepth`, and `dragonScaleU` so Screen Space and Dragon Scales reproduce the legacy looks.
- [x] 2.5 Make texture mirror behavior depend on the explicit mapping mirror flag instead of the legacy mode branch.
- [x] 2.6 Remove active renderer dependency on the previous `c`-based Ray-Potential mode.

## 3. UI Controls

- [x] 3.1 Replace the Image Mapping mode dropdown in `Settings.vue` with X variable and Y variable selects.
- [x] 3.2 Add logarithmic X scale and Y scale slider bindings for the `0.01..100` range.
- [x] 3.3 Add a mirror switch bound to the active texture mapping.
- [x] 3.4 Add apply controls for built-in Screen Space and Dragon Scales mapping presets.
- [x] 3.5 Ensure UI edits update the renderer immediately and mark the active mapping as custom when it diverges from a selected preset.

## 4. Local Texture Mapping Preset Catalog

- [x] 4.1 Add an IndexedDB-backed `textureMappingPresetStore` with GUID identity, unique names, dates, lastUpdated, favorite state, and remote metadata.
- [x] 4.2 Seed or expose built-in Screen Space and Dragon Scales mappings in the preset list without requiring users to create them manually.
- [x] 4.3 Add save, apply, rename/update if supported by local patterns, delete, and favorite operations for texture mapping presets.
- [x] 4.4 Preserve favorite state when updating local records by GUID.

## 5. Preset And Palette Persistence

- [x] 5.1 Save the structured texture mapping object in complete presets.
- [x] 5.2 Restore the structured texture mapping object when loading complete presets.
- [x] 5.3 Save the structured texture mapping object in palette presets.
- [x] 5.4 Restore the structured texture mapping object when applying palette look fields.
- [x] 5.5 Migrate legacy `textureMappingMode: 0` to Screen Space, `1` to Dragon Scales, and `2` or unknown values to Screen Space.

## 6. Remote Catalog Integration

- [x] 6.1 Add texture mapping presets as a remote catalog type with metadata-first sync by GUID and lastUpdated.
- [x] 6.2 Add remote fetch/import logic that writes remote mapping presets into local IndexedDB while preserving local favorite state.
- [x] 6.3 Add admin upload logic for texture mapping presets with remote name conflict handling.
- [x] 6.4 Add upload/favorite controls for texture mapping preset rows following the existing catalog UI conventions.
- [x] 6.5 Ensure remote sync failures do not block listing or applying local texture mapping presets.

## 7. Verification

- [x] 7.1 Run `npx vue-tsc -b`.
- [x] 7.2 Run `npm run build` or an equivalent targeted build check, accounting for its `docs/` staging side effect.
- [x] 7.3 Manually verify in a WebGPU-capable browser that Screen Space and Dragon Scales match the previous visual behavior.
- [x] 7.4 Manually verify a custom mapping using available axis variables, axis scales, and mirror toggle.
- [x] 7.5 Manually verify saving, favoriting, reloading, and admin upload affordances for texture mapping presets.
