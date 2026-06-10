## 1. Shared model and engine plumbing

- [x] 1.1 Extend `MandelbrotParams` and default parameter state with `zoomMinBrushStep` and `sentinelSeedStep`.
- [x] 1.2 Thread the new values through `MandelbrotViewer.vue`, `MandelbrotController.vue`, and `Mandelbrot.vue` so the engine receives them as live props.
- [x] 1.3 Update `Engine.ts` to read the configurable values instead of the hard-coded `ZOOM_MIN_BRUSH_STEP` and `SENTINEL_SEED_STEP` constants, while preserving power-of-two normalization.

## 2. Settings UI and persistence

- [x] 2.1 Add two controls to the Performance section in `Settings.vue` with the required defaults and bounds.
- [x] 2.2 Persist the new fields in the main `localStorage` settings payload and restore them on startup without breaking older payloads.
- [x] 2.3 Exclude the new performance fields from preset save, quick snapshot, and preset restore flows so they remain session-scoped.

## 3. Verification

- [x] 3.1 Add or update tests/coverage for loading defaults, restoring saved values, and preserving preset behavior.
- [x] 3.2 Run the relevant typecheck/build path to confirm the new fields compile through the full settings-to-engine chain.
