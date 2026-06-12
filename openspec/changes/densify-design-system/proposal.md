## Why

The recently refreshed design system is visually polished but too low-density: on
desktop the panels waste vertical and horizontal space (15px type, 16–20px gaps,
oversized labels), and on small viewports the popups overflow because widths and
some grids are hard-coded in pixels. The root cause is that every component uses
magic numbers instead of a shared density scale, so there is no single lever to
make the UI compact. This change introduces that scale and applies it at a tighter
fixed baseline.

## What Changes

- Introduce a **density token scale** in `:root` (`--space-*`, `--font-*`,
  `--ctrl-h`, `--thumb`, `--label-w`, `--radius-sm/md/lg`) alongside the existing
  color/font tokens.
- Replace hard-coded spacing, font-size, control-height, slider-thumb, label-width
  and radius values across `Settings.vue` (and the shared `style.css` controls)
  with the new tokens, at a **denser fixed baseline** than today.
- Shrink the slider label column (`--palette-label-width` 208px → `--label-w` ~150px)
  and label font (15px → 13px) so the slider track regains usable width (~+48% on a
  640px popup).
- Unify the preset / texture / palette galleries onto a single responsive grid rule
  (`repeat(auto-fill, minmax(<min>, 1fr))`), removing the divergent per-gallery grid
  definitions and their inconsistent media queries.
- Fix small-viewport overflow: popup widths become `min(<target>, 96vw)` and any
  remaining fixed-px internal grids collapse cleanly when the panel is narrow.
- Preserve the visual identity: `backdrop-filter` blur, popup radial gradients,
  button gradients, and rounded corners are kept (radii are recalibrated via tokens,
  not removed).

Out of scope for this iteration (deferred): the container-query **auto-compact**
mechanism that adapts density to panel width. We try the fixed denser baseline first.

## Capabilities

### New Capabilities
- `ui-density-system`: A shared density token scale and the rules for how panels,
  controls, sliders, labels, galleries, and popups consume it — including the
  compaction baseline and small-viewport fit requirements.

### Modified Capabilities
<!-- None: no existing spec governs UI density. -->

## Impact

- `src/style.css` — adds density tokens to `:root`; tokenizes shared control styles
  (checkbox, etc.).
- `src/components/Settings.vue` — largest surface: slider rows, labels, galleries,
  spacing, radii migrated to tokens.
- `src/components/MandelbrotViewer.vue` — `popupStyle()` widths become viewport-safe
  (`min(..., 96vw)`).
- Other panel components that share the control styles (e.g. `AnimationPanel.vue`)
  inherit the denser tokens; spot-check for regressions.
- No API, data, or behavior changes — purely presentational. WebGPU is required to
  see the panels, so verification is manual/visual rather than headless.
