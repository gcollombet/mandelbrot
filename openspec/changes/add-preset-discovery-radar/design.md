## Context

The app already stores complete presets with lightweight metadata, including `scaleExponent`, and can render preset pins on top of the fractal view. The current pin overlay is controlled by `showPresetPins` inside `MandelbrotParams`, which makes the display state behave like scene content even though it is really an exploration preference.

The desired experience is more intentional: the default canvas stays clean, and a prominent radar button temporarily reveals the most relevant nearby saved locations. The radar should feel spatial, not like another preset list, and should help users discover neighbors by combining position on the current view with zoom-depth proximity.

## Goals / Non-Goals

**Goals:**
- Add a dedicated preset discovery radar mode activated by a visible map control.
- Rank nearby presets by perceptual distance, using both viewport distance and zoom-depth difference.
- Represent zoom-depth direction directly on map pins with animated chevrons.
- Surface important off-screen neighbors through edge markers that avoid UI overlap.
- Deactivate discovery when the user resumes navigation, especially zooming.
- Keep the existing Location Library UI and behavior unchanged.
- Keep discovery/pin visibility state out of complete preset serialization and preset loading.

**Non-Goals:**
- Replacing the preset catalog, favorite system, import/export, or remote catalog sync.
- Changing how complete presets store artistic/render settings beyond excluding exploration state.
- Adding a separate persistent user preference for showing pins by default.
- Computing mathematical fractal similarity between presets. The first version uses viewport geometry and zoom-depth metadata.

## Decisions

### D1 - Discovery is an explicit temporary mode

Add a radar/discovery control on the map surface. Activating it starts an outward radar pulse and enters discovery mode. Discovery mode highlights a limited set of relevant preset neighbors and remains active until the user zooms, performs significant navigation, loads a preset, or toggles the radar off.

Alternative considered: enable preset pins by default on first load. Rejected because it makes the first view busier and weakens the user's control over when saved locations appear.

### D2 - Use perceptual distance for neighbor ranking

Rank candidates with a mixed score:

```
perceptualDistance =
  spatialDistanceInScreens +
  abs(log2(targetScale / currentScale)) * 0.5
```

The coefficient follows the product intuition: zooming by 2x feels like roughly half a screen of visual travel because about half the previous view disappears. Spatial distance can be computed from projected preset coordinates where possible; off-screen candidates can use distance to the safe-frame boundary. Zoom difference can use exact scale values when full records are loaded or approximate `scaleExponent` metadata for broad prefiltering.

Alternative considered: sort only by `scaleExponent` difference. Rejected because it ignores whether a destination is visually nearby in the current viewport. Alternative considered: sort only by screen distance. Rejected because it treats a much deeper preset as a neighbor even when reaching it would require many zoom steps.

### D3 - Limit and stage discovery results

Discovery mode should display a small top set rather than every preset. A practical first pass is to prefilter by metadata, load full records as needed for coordinate projection, score all candidates, and render the best 5-8. The radar pulse can reveal pins as the pulse reaches their normalized distance, while non-selected pins remain hidden or strongly subdued.

Alternative considered: keep all pins visible with different opacity. Rejected because dense preset libraries would still clutter the canvas.

### D4 - Show zoom-depth with chevrons, not list badges

Pins indicate relative depth using chevrons:

```
shallower:  chevrons above the point
similar:    point only or a subtle neutral marker
deeper:     chevrons below the point
```

The number of chevrons should be capped, for example one to three, while animation speed/intensity communicates additional distance. This keeps the map readable while giving immediate "go up / go down" meaning. Existing hover cards can still show precise magnitude and thumbnail details.

Alternative considered: numeric labels directly on every pin. Rejected for the default visual layer because numbers increase text clutter. Numeric detail can remain in hover/focus states.

### D5 - Edge markers use a safe frame

Off-screen discovery results should be projected to an inner safe frame rather than clamped to the viewport edge. The safe frame accounts for top navigation, bottom/mobile controls, and open settings popups. If several markers collide, they should cluster into a compact stack or count marker rather than overlapping.

Alternative considered: clamp markers to the canvas bounds. Rejected because markers can end up hidden under persistent UI or visually stuck at uncomfortable edges.

### D6 - Discovery state is not preset state

`showPresetPins`, radar active state, radar pulse progress, selected discovery results, and similar exploration UI state should not be saved into complete presets and should not be restored when a complete preset is loaded. If a legacy preset contains pin visibility state, loading it should ignore that field.

Alternative considered: preserve `showPresetPins` in complete presets for backward compatibility. Rejected because it makes browsing presets unexpectedly change the map overlay.

## Risks / Trade-offs

- [Too many IndexedDB reads during scoring] -> Use metadata for prefiltering, cache loaded records, and cap discovery result counts.
- [Radar visuals become decorative noise] -> Keep the default inactive state clean, cap visible results, and reserve richer animation for active discovery only.
- [Safe-frame layout is hard to keep in sync with UI] -> Derive exclusion rectangles from actual DOM bounds at render time rather than duplicating constants.
- [Navigation deactivation feels too aggressive] -> Deactivate on zoom and significant pan/drag, but not on hover, focus, or small pointer movement.
- [Chevrons may be ambiguous] -> Pair direction with hover text and consistent placement: above means shallower/up, below means deeper/down.

## Migration Plan

1. Treat existing saved presets that contain `showPresetPins` as valid legacy data but ignore that field during preset load.
2. Strip exploration fields from newly saved complete presets and quick snapshots.
3. Introduce radar mode as opt-in; keep default pin visibility off.
4. If the existing "Show presets on map" control remains, keep it separate from radar discovery and do not persist it through complete presets.

Rollback is straightforward: disable the radar control and return to the existing pin overlay behavior, while keeping preset sanitization for exploration fields because it only prevents UI state from leaking into saved scene data.

## Open Questions

- Should the old permanent "Show presets on map" control remain as an advanced/manual mode, or should radar discovery replace it entirely?
- What is the first-version result cap: 5, 6, or 8 neighbors?
- Should favorites receive a small ranking boost in radar mode, or should discovery remain purely spatial/depth-based?
