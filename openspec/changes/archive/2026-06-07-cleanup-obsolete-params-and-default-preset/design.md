## Context

The Mandelbrot explorer application has transitioned to a state-driven approach where visual effects like shading, iteration bands (zebra stripes), webcam overlays, and image tessellations are configured per color stop (`ColorStop` parameters) instead of being controlled by global toggles. 

However, several obsolete global properties (`activateWebcam`, `activateShading`, `activateTessellation`, `activateZebra`, `activateSmoothness`, `activatePalette`, `activateSkybox`) still persist in legacy presets (stored in user databases and Firebase) and in VitePress documentation embeds (`presentation/index.md` and `presentation/optimisation.md`). Since the TypeScript codebase has already been cleaned of these properties, they are ignored by Vue but pollutes the data layer and results in broken documentation examples (e.g. passing `:activateZebra="true"` has no effect).

Additionally, the default landing view on the first load of the application is a zoomed-out, off-center view with a non-shaded palette. We want to improve this experience by showing a classic, centered black-and-white banded Mandelbrot view by default, and then asynchronously loading the first preset from the catalog if available.

## Goals / Non-Goals

**Goals:**
- Present a classic, centered black-and-white iteration bands Mandelbrot view immediately on first page load.
- Asynchronously query the local DB (and Firebase catalog if empty) on first load, auto-applying the first preset if any exist.
- Ensure that old presets containing legacy parameters are automatically sanitized when loaded, saved, or exported, preventing any future syncs of obsolete fields to Firebase.
- Clean up all documentation embeds to use appropriate `colorStops` instead of obsolete global parameters.

**Non-Goals:**
- Re-introducing global switches to the TypeScript rendering engine or components.
- Manually purging the Firebase Firestore collection (addressed by preventing dirty uploads going forward).

## Decisions

### Decision 1: Centered B&W Default Parameters
We will update `DEFAULT_MANDELBROT_PARAMS` in `MandelbrotViewer.vue` to:
- `cx: "-0.7"`, `cy: "0.0"`, `scale: "1.2"`, `stripeFrequency: 8`
- `colorStops: [{color: "#ffffff", position: 0, zebra: 1.0}, {color: "#ffffff", position: 1, zebra: 1.0}]`
*Rationale*: This centers the full Mandelbrot set on the screen and uses the classic iteration bands color scheme (alternating white/black bands), which is instantly recognizable and acts as a beautiful starting point.

### Decision 2: Asynchronous Preset Load in MandelbrotViewer
During `onMounted` in `MandelbrotViewer.vue`, if the user has no history of previous navigation in `localStorage`:
1. Check the local IndexedDB using `getAllPresetEntries()`.
2. If the local database is empty, trigger `syncRemoteCatalog()` to fetch from Firebase, then query IndexedDB again.
3. If presets are found, load the first preset (`list[0]`) via `getPresetById()` and set `mandelbrotParams.value` to its value.
*Rationale*: This avoids blocking the initial synchronous render (which uses the default parameters) while ensuring first-time visitors automatically get the latest shared preset once it is resolved asynchronously.

### Decision 3: Parameter Sanitization at the Boundary
Instead of database migration scripts, we will sanitize parameters at the application boundary using a helper function `sanitizeMandelbrotParams(params: any): MandelbrotParams`.
This function will:
- Clone the input parameters.
- Strip any obsolete keys: `activatePalette`, `activateSkybox`, `activateTessellation`, `activateWebcam`, `activateShading`, `activateZebra`, `activateSmoothness`.
- Be invoked when loading a preset in `Settings.vue` / `MandelbrotViewer.vue`, and before saving or exporting a preset.
*Rationale*: This dynamically purges legacy fields from memory, preventing them from being synced back to Firebase or exported to files, without requiring database schema migrations.

## Risks / Trade-offs

- **[Risk]**: A first-time user on a fast connection might see the screen load in black-and-white, then suddenly flash or jump to a colorful Firebase preset a moment later.
  - *Mitigation*: The black-and-white view is a highly aesthetic and classic representation of the Mandelbrot set. Since the sync is fast (often <500ms), the transition acts as a progressive enhancement. If the user starts navigating immediately, we will skip auto-loading the preset to avoid interrupting their input.
