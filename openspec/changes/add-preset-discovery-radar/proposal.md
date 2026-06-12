## Why

Preset pins are useful for spatial exploration, but showing every saved location as a permanent map overlay can make the fractal view feel busy. A dedicated discovery radar gives users an intentional way to find nearby saved locations while keeping the default canvas clean.

## What Changes

- Add a visible radar/discovery control that triggers a temporary preset discovery mode from the current viewport.
- Rank candidate presets by perceptual proximity, combining on-screen distance with zoom-depth difference using the intuition that a 2x zoom step feels like roughly half a screen of travel.
- Render discovery pins with visual depth cues: chevrons above or below the point for presets that are shallower or deeper than the current zoom, with animation intensity reflecting zoom distance.
- Show off-screen nearby candidates as edge markers constrained to a safe frame so they do not sit under top bars, bottom controls, or open settings popups.
- Keep the existing Location Library dropdown behavior unchanged.
- Stop treating map pin/discovery visibility as preset content; these states are user exploration state, not part of saved artistic/render presets.

## Capabilities

### New Capabilities
- `preset-discovery-radar`: Defines the radar-triggered discovery mode, perceptual neighbor ranking, depth-aware pin indicators, off-screen edge markers, and mode lifecycle.

### Modified Capabilities
- `preset-management`: Saved complete presets SHALL not persist or restore map pin/discovery visibility state.

## Impact

- `src/components/MandelbrotViewer.vue` — radar control, discovery lifecycle, neighbor scoring, map pin rendering, safe-frame edge marker placement.
- `src/components/Settings.vue` — existing Navigation panel can keep the Location Library unchanged; any persistent "show presets on map" behavior may be retired or kept as a separate manual mode if implementation chooses.
- `src/Mandelbrot.ts` — session/exploration fields may need to be separated from preset payloads alongside existing session performance fields.
- `src/presetStore.ts` — existing `scaleExponent` metadata can support zoom-depth comparisons without loading full preset records for every list operation.
- Tests should cover discovery activation/deactivation, preset payload sanitization, neighbor ranking, and safe-frame marker behavior where practical.
