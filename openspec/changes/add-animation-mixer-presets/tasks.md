## 1. Data Model

- [x] 1.1 Define animation track IDs, animation types, track defaults, and `AnimationConfig` types in the frontend model layer.
- [x] 1.2 Add normalization helpers that create default animation recipes and migrate legacy `animationSpeed` values into `globalSpeed`.
- [x] 1.3 Add `animation` recipe fields to `MandelbrotParams` / render option flow while preserving `activateAnimate` as playback state.
- [x] 1.4 Update complete preset load/save behavior according to the final policy for animation recipe inclusion.

## 2. Rendering

- [x] 2.1 Extend `RenderOptions` and engine uniform packing with explicit animation channel values for the curated tracks.
- [x] 2.2 Update `src/assets/color.wgsl` to consume named animation channels instead of one shared `animationSpeed` for every drift.
- [x] 2.3 Apply independent animation modulation for Palette Offset, Height Palette Shift, Light Angle, Texture Drift, Phase Coloring, Varnish, Micro Bump, Displacement, and Tessellation.
- [x] 2.4 Update `PalettePreview` uniform defaults and any preview render paths that depend on the color shader uniform layout.
- [x] 2.5 Clamp animated values to safe ranges in renderer or shader code.

## 3. Animation Panel UI

- [x] 3.1 Add the top-level Animation tab between Graphics and Palettes.
- [x] 3.2 Remove Drift playback and global animation speed controls from the Palette panel.
- [x] 3.3 Build the Animation panel with Play/Pause, global speed, and a fixed mixer row for each curated track.
- [x] 3.4 Add per-track controls for enabled state, animation type, speed, and amplitude/range where applicable.
- [x] 3.5 Ensure loading an animation recipe updates mixer controls without automatically starting playback.
- [x] 3.6 Confirm responsive layout and keyboard shortcut behavior for the new tab.

## 4. Animation Preset Persistence

- [x] 4.1 Create `animationPresetStore` with IndexedDB records for GUID, name, recipe, dates, favorite status, and remote metadata.
- [x] 4.2 Add save, load, delete, rename, and favorite flows for local animation presets.
- [x] 4.3 Add Animation panel preset dropdown and management controls.
- [x] 4.4 Stop writing new animation recipe fields into palette preset records.
- [x] 4.5 Preserve read compatibility for older palette records that contain legacy animation fields.

## 5. Shared Catalog

- [x] 5.1 Add `animationPreset` to remote catalog type definitions and catalog type lists.
- [x] 5.2 Add upload support for animation presets, including name conflict handling and local remote status updates.
- [x] 5.3 Add sync support for remote animation preset metadata and payloads.
- [x] 5.4 Add UI upload state and permissions behavior matching existing preset catalog controls.

## 6. Tests and Verification

- [x] 6.1 Add or update TypeScript tests/helpers for animation config normalization and legacy fallback behavior where a test surface exists.
- [x] 6.2 Update Playwright navigation/settings coverage for the new Animation tab and moved Drift controls.
- [x] 6.3 Add persistence coverage for saving/loading animation presets and ensuring palette presets do not write animation recipes.
- [x] 6.4 Add catalog sync/upload coverage for animation preset entries where existing catalog tests or mocks allow.
- [x] 6.5 Run `npx vue-tsc -b`.
- [ ] 6.6 Run targeted Playwright tests for settings navigation and animation UI.
