## Why

The Mandelbrot explorer application currently retains obsolete global boolean parameters (such as `activateWebcam`, `activateShading`, `activateTessellation`, `activateZebra`, and `activateSmoothness`) in its documentation and legacy presets. Because the rendering engine now controls these effects dynamically via individual palette color stops (`ColorStop` state), these global switches have no functional impact, pollute the database and Firebase Firestore, and break the documentation embeds (which pass them but get ignored by the Vue component props). 

Additionally, first-time users are currently greeted with a zoomed-out, non-standard default view of the Mandelbrot set (centered at an offset scale of 2.5 with a custom non-shaded palette). We want to replace this with a clean, classic black-and-white banded view that instantly displays the Mandelbrot set centered on page load, followed by asynchronously loading the newest preset from the Firebase/IndexedDB collection once synced.

## What Changes

- **Update Default App Parameters**: Replace the hardcoded `DEFAULT_MANDELBROT_PARAMS` in `MandelbrotViewer.vue` to center the Mandelbrot set (`cx: "-0.7"`, `cy: "0.0"`, `scale: "1.2"`) and use a classic black-and-white iteration band palette (two white stops with `zebra: 1.0` and `stripeFrequency: 8`).
- **Asynchronous Preset Loading on First Load**: Modify the initialization and mounting logic in `MandelbrotViewer.vue`. If the user has no history of previous navigation in `localStorage` (first-time visitor), we will run `syncRemoteCatalog()` and load presets from IndexedDB. If presets are found, we automatically apply the first (most recent) preset from the collection. If no presets are found (e.g. offline first load), we simply keep the classic default view.
- **Preset Sanitization**: Implement a parameter sanitization utility that strips legacy global toggles (`activatePalette`, `activateSkybox`, `activateTessellation`, `activateWebcam`, `activateShading`, `activateZebra`, and `activateSmoothness`) from parameter objects when loading, saving, or exporting presets.
- **Documentation Embed Updates**: Clean up `presentation/index.md` and `presentation/optimisation.md` to remove obsolete props from the `<MandelbrotController>` and `<Mandelbrot>` instances. Instead, pass custom `:colorStops` parameters to configure the specific effects (zebra, shading, etc.) for each documentation embed.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- preset-management

## Impact

- **Affected Components**:
  - `src/components/MandelbrotViewer.vue`: updates `DEFAULT_MANDELBROT_PARAMS` and `onMounted` initialization.
  - `src/components/Settings.vue`: updates `savePreset` and `quickSnapshot` logic to sanitize presets.
  - `src/presetStore.ts`: updates database reading/writing to sanitize parameter values.
  - `presentation/index.md` and `presentation/optimisation.md`: documentation embeds cleaned up.
- **APIs & Databases**:
  - IndexedDB (`presets` store) and Firebase complete presets will no longer receive legacy boolean keys.
- **Backward Compatibility**:
  - Old presets containing these legacy parameters will still load successfully, but they will be automatically sanitized (obsolete fields removed) when read into memory or saved.
