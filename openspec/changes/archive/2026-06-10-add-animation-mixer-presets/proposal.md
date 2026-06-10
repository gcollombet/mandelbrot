## Why

Animation is currently controlled by a single "Drift" toggle and global speed inside the Palette panel, even though that toggle affects palette offset, texture drift, webcam texture drift, and skybox/environment drift. Users need a clearer, standalone Animation panel that lets them choose which visual properties animate and tune each property's motion.

## What Changes

- Add a dedicated top-level Animation panel between Graphics and Palettes.
- Move the existing Drift play/pause control out of the Palette panel and into Animation.
- Replace the single drift speed control with a simple animation mixer:
  - Global speed multiplier for all tracks.
  - Per-track enabled state.
  - Per-track animation type.
  - Per-track speed slider.
  - Per-track amplitude/range where applicable.
- Introduce a first set of animation tracks:
  - Palette Offset.
  - Height Palette Shift.
  - Light Angle.
  - Texture Drift.
  - Sky Reflection Drift.
  - Phase Coloring.
  - Varnish.
  - Micro Bump.
  - Displacement.
  - Tessellation.
- Decouple animation settings from palette presets.
- Add a new Animation Preset type that can be saved locally, loaded, favorited, and uploaded/downloaded through the shared catalog.
- Preserve play/pause as a session/local state so loading an animation preset does not unexpectedly start playback unless the user explicitly enables animation.

## Capabilities

### New Capabilities
- `animation-mixer`: Standalone animation panel, animation tracks, animation presets, and shared catalog support for reusable animation recipes.

### Modified Capabilities
- `preset-management`: Preset behavior changes to remove animation recipe fields from palette presets and introduce animation presets as their own managed preset type.
- `texture-catalog-upload`: Shared catalog behavior changes to support upload and sync of animation preset entries.

## Impact

- UI: `src/components/MandelbrotViewer.vue` tab list and `src/components/Settings.vue` panel content.
- Data model: `src/Mandelbrot.ts` animation config fields and compatibility with existing `activateAnimate` / `animationSpeed` settings.
- Rendering: `src/Engine.ts` render options/uniforms and `src/assets/color.wgsl` animation inputs.
- Persistence: new IndexedDB store for animation presets and migration/compatibility logic for old palette animation fields.
- Catalog: `src/remoteCatalog.ts`, `src/remoteCatalogSync.ts`, permissions/identity helpers as needed, and settings upload controls.
- Tests: update UI/navigation coverage and add persistence/catalog unit or integration coverage where existing test surfaces allow.
