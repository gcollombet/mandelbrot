## 1. Exploration State And Preset Serialization

- [x] 1.1 Define radar discovery state separately from `MandelbrotParams` preset content.
- [x] 1.2 Strip `showPresetPins` and any radar/discovery fields when saving complete presets and quick snapshots.
- [x] 1.3 Ignore legacy pin visibility fields when loading complete presets.
- [x] 1.4 Add focused unit coverage for preserving current exploration state while applying complete presets.

## 2. Discovery Candidate Scoring

- [x] 2.1 Add helpers to compute zoom-depth difference in powers-of-two steps from current and target scales.
- [x] 2.2 Add helpers to compute spatial distance in screen units for on-screen and off-screen projected presets.
- [x] 2.3 Implement perceptual distance scoring as spatial screen distance plus zoom-depth steps weighted by 0.5.
- [x] 2.4 Prefilter and cache preset records so discovery scoring avoids unnecessary repeated IndexedDB reads.
- [x] 2.5 Add unit coverage for ranking candidates by spatial distance, zoom-depth difference, and mixed perceptual distance.

## 3. Radar Mode Lifecycle

- [x] 3.1 Add a prominent radar discovery control on the map surface without changing the Location Library dropdown.
- [x] 3.2 Toggle discovery mode on radar control click and render a center-origin radar pulse.
- [x] 3.3 Keep discovery results active after the pulse completes.
- [x] 3.4 Exit discovery mode when the user zooms, significantly pans/drags, loads a preset destination, or clicks the radar control again.
- [x] 3.5 Keep discovery mode active during passive hover, focus, and pin inspection interactions.

## 4. Discovery Pin Rendering

- [x] 4.1 Render only the limited set of closest ranked discovery candidates.
- [x] 4.2 Add depth-aware chevron cues above pins for shallower presets and below pins for deeper presets.
- [x] 4.3 Cap visible chevron count while using animation speed or intensity to communicate larger zoom-depth gaps.
- [x] 4.4 Preserve thumbnail and magnitude detail in hover/focus cards for discovery pins.
- [x] 4.5 Ensure non-discovery/default canvas state remains clean with no pins shown by default.

## 5. Off-Screen Edge Markers

- [x] 5.1 Compute a safe frame from the canvas plus top bars, bottom controls, mobile controls, and open settings popup bounds.
- [x] 5.2 Project off-screen ranked candidates to directional edge markers inside the safe frame.
- [x] 5.3 Group or offset colliding edge markers so they remain readable and clickable.
- [x] 5.4 Keep edge markers synchronized as the viewport, mobile controls, and settings popups change.

## 6. Verification

- [x] 6.1 Add Playwright coverage or targeted interaction tests for radar activation, toggle-off, and zoom deactivation.
- [x] 6.2 Add coverage that the Navigation panel Location Library listing/filtering/loading behavior is unchanged.
- [x] 6.3 Add visual/manual verification notes for radar pulse, chevron direction, safe-frame edge markers, and mobile layout.
- [x] 6.4 Run targeted typecheck and relevant tests for changed TypeScript/Vue behavior.
