## 1. Shared dense stylesheet

- [x] 1.1 Lift the canonical 398-line stylesheet from `canvas/Palettes Dense.html` into
      `src/dense.css` (tokens, `.fld*` family, `.section`/`.card`, three layouts,
      topbar/menu/mobile-nav, responsive, tweak knobs) and import it once — `#root`
      selector adapted to `.dense`; `body` centering + `.twkx` chrome dropped
- [x] 1.2 Load the dense fonts (Space Grotesk + JetBrains Mono) consistent with the rest
      of the app; map `--mono`/`--sans` tokens — fonts already loaded in `index.html`;
      `--mono`/`--sans` defined on `.dense`
- [x] 1.3 Verify the three themes (`data-style` = glow/sober/clair) and tweak attributes
      (`data-shape`, `data-field`, `--cmul`) all resolve with no missing token — all
      `var()` refs resolve within `.dense`/per-style blocks (final visual check: WebGPU)

## 2. Field kit (`src/components/dense/`)

- [x] 2.1 Implement `useDenseScrub()` composable: pointer-down/move/up on a row, horizontal
      delta → value within min/max by step, Shift = fine, pointer capture, `touch-action:pan-y`
- [x] 2.2 Implement `DenseField` (scrub slider): label/value/`.fld-fill` gauge, formatters
      `p0..p3`+custom, unit suffix, `.fld.scrub`/`.fld.mod` states, double-click inline
      `.fld-edit` with clamp + Escape-cancel
- [x] 2.3 Implement variants `DenseToggle`, `DenseSeg`, `DenseSelect`, `DenseColor`,
      `DenseCurve` sharing row metrics
- [x] 2.4 Implement `DenseSection` (icon chip + title + scope + caret, collapsible per
      layout) and `DenseGrid`/`DenseCard` (thumb, name, sub, `.sel`, hover `.acts`)
- [x] 2.5 Implement `DenseTopbar` (brand dot, `ptabs`, *Affichage* button, close),
      `DenseViewMenu`, and `DenseMobileNav`
- [x] 2.6 Implement persisted view state (layout/style/shape) — `useDenseView` composable
      backed by localStorage; GLOBAL (shared across panels) per change decision, with
      per-panel default layout on first run

## 3. Pilot: Animation panel

- [x] 3.1 Re-author `AnimationPanel.vue` as dense `SECTIONS` (Lecture: play/pause + global
      speed; Mixer: per-channel wave/speed/amplitude/enable via mixcells) using the field
      kit; preset library kept as a dense Préréglages section (parity with old dropdown)
- [x] 3.2 Bind every field to the existing `AnimationConfig` value (parity preserved:
      same `triggerAnimationUpdate`/`ensureAnimationConfig` flow, `globalSpeed`↔
      `animationSpeed`, `activateAnimate`); `useDenseView('inspector')` default layout
- [ ] 3.3 Manual verification with user on WebGPU browser: scrub feel, parity, narrow width

## 4. Shell integration in the viewer

- [x] 4.1 Replace popup chrome with `DenseTopbar` for ported tabs (incremental: a
      `densePortedTabs` set; legacy chrome retained for the rest); drag handle on the
      topbar brand via `@drag-start`→`startDrag` (now `preventDefault`s); per-tab
      position/z-order/close preserved; `.dense-popup` carries positioning only
- [x] 4.2 Wire the *Affichage* view menu to the persisted GLOBAL view state — done via
      `DenseTopbar`→`DenseViewMenu` bound to `useDenseView`. NOTE: `DenseMobileNav`
      (section-level quick nav) deferred to per-panel work, since sections are defined
      inside each panel; the dense responsive rules already give full-bleed reflow <720px
- [x] 4.3 Popup widths stay viewport-safe — `popupStyle` already caps `min(<target>,96vw)`;
      dense layouts collapse to single column <720px and `.dense .body` flexes/scrolls
      within the popup `maxHeight`

## 5. Navigation panel

- [x] 5.1 Re-author the Navigation panel as dense SECTIONS (Localisation coord box +
      zoom/rotation; Mapping de rendu mu + stripe freq; Bibliothèque de lieux). NOTE:
      the panel lives in the `Settings.vue` `activeTab==='navigation'` branch (not
      `MandelbrotController.vue`, which is the always-on HUD); ported in place, root kept
      `cv-body sections` so existing dropdown/library styles still apply
- [x] 5.2 Sliders → `DenseField` bound to the existing writable computeds (`scaleSlider`/
      `angleSlider`/`muSlider`) with formatters; coord box (Cx/Cy inputs + copy) and the
      nav-preset library/dropdown kept functional; `navigation` added to `densePortedTabs`;
      buttons → `.mini-btn`

## 6. Presets panel (carve from Settings.vue)

- [x] 6.1 Port the Presets tab to dense `SECTIONS` (Enregistrer la vue; Bibliothèque card
      grid + favorites filter; Transfert import/export/delete) — ported IN PLACE in
      `Settings.vue` (not extracted to a new file) for lower risk; existing card/grid
      styles preserved (root `cv-body sections`), buttons → `.mini-btn`
- [x] 6.2 Port the rest of Settings per "all of Settings now": Performance tab fully
      converted (Epsilon/AA/Auto-AA toggle/brush/sentinel/Approximation `DenseSeg`/Radius/
      Resolution/Iterations/FPS/GPU-load/Debug-shading) bound to existing computeds/model;
      `presets`+`performance` added to `densePortedTabs`. (Palettes tab = Group 7.) Dead
      `.gfx-*`/`.frow` CSS cleanup deferred to Group 8

## 7. Palettes panel

- [x] 7.1 Palettes given the dense shell (`palettes` ∈ `densePortedTabs` → DenseTopbar +
      Affichage). Slider sub-tabs converted to dense `DenseSection`+`DenseField`/`DenseToggle`/
      `DenseSeg`: **motionCycle** (Mirror/Length/Height/Offset/Phase), **color**
      (Interpolation seg + Hue/Sat/Lum shifts), **surfaceMaterial** (Fractal Surface +
      Material Response). All bound to existing model/computeds/handlers
- [ ] 7.2 HUD: kept the LIVE WebGPU `PalettePreview` strip + `GlissiereHandle` stop markers
      (functional equivalent of the mockup `.strip`; rebuilding unjustified). Tools bar +
      pinned `.pins` not yet restyled to dense — DEFERRED
- [x] 7.3 `imageEnvironment` converted: Image Scale/Displacement + X/Y Scale → `DenseField`,
      Mapping X/Y → `DenseSelect`, Mirror → `DenseToggle` (texture/env grids kept as-is).
      `stops`: `PaletteEditor.vue` effect sliders (UI_GROUPS) → `DenseField` grouped by
      `.subhead`
- [x] 7.4 CORRECTION: removed the Bulma sub-tab bar (`palette-subtabs` +
      `activePaletteSubTab`/`paletteSubTabs`, which switched sections via `v-show`) — this
      didn't match the canvas design, which shows every section together in the `.sections`
      columns-masonry (each section collapses independently, no tab switcher). All 10
      palette sections (Color Stops, Palette Cycle, Color Space, Fractal Surface, Material
      Response, Image Layer, Texture Mapping Presets, Image Texture, Environment Map, Saved
      Palettes, Full Presets, Transfer) now render together as sibling `DenseSection`s inside
      one `.sections` wrapper, consistent with Navigation/Presets/Performance. REMAINING
      (functional-as-is, minor/cosmetic): palette tools bar, and PaletteEditor's non-slider
      controls (scope toggle, stop-preset dropdown, transfer-curve, iridescence). Need
      WebGPU-side visual verification

## 8. Cleanup & verification

- [ ] 8.1 Remove superseded per-panel scoped CSS replaced by the shared dense stylesheet
- [ ] 8.2 Archive the `densify-design-system` change as superseded
- [ ] 8.3 Manual visual review with user on WebGPU browser: all four panels at desktop +
      narrow widths; verify themes, tweaks, drag-to-scrub, card grids, mobile nav
- [ ] 8.4 Tune token values (label width, gauge, spacing, gallery-min) based on the review
