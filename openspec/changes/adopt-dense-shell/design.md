## Context

The app is Vue 3 + Bulma + FontAwesome. Panels (Palettes, Animation, Navigation, the
Presets library inside `Settings.vue`) are floating, draggable popups opened over the
WebGPU canvas from `MandelbrotViewer.vue`, each with its own heavy scoped CSS.

The `canvas/*-Dense.html` mockups define a new "dense editor" language. Key facts
established during exploration:

- `canvas/Palettes Dense.html` inlines the **canonical 398-line stylesheet**; the other
  three files only `<link>` an extracted `dense/dense-shell.css` that is **not in the
  repo**.
- The runtime JS the mockups load — `dense-kit.js` (`DENSE.init`: layout switching, view
  menu, tabs, drag), `palette-dense-ui.js` (`PDUI.makeField`, `buildCards`, the
  **drag-to-scrub** logic, value formatters, julia thumbnails), and the data files — is
  **absent**. Only the CSS and the inline `SECTIONS`/`TWEAKS` structure (in Navigation,
  Animation, Presets) survive.
- `Palettes Dense.html`'s body is empty JS-filled containers (`#sections`, `#strip`,
  `#pins`); the generating JS is gone, so the Palettes section structure must be
  reconstructed from the real `PaletteEditor.vue`.
- The in-progress `densify-design-system` change is a conservative token-scale re-skin of
  the existing markup — a different, lesser approach that this change supersedes.
- WebGPU is required to render panels; headless preview shows only the fallback, so visual
  verification is manual on a real browser.

## Goals / Non-Goals

**Goals:**
- One shared dense stylesheet + a small set of reusable Vue field/shell components.
- Faithful reproduction of the dense look *and* interaction (drag-to-scrub is the soul of
  it), the topbar shell with a persisted *Affichage* view menu, and the three layouts.
- All four panels ported with full behavior/data parity.
- A single set of levers (theme/layout/shape/field/chroma) for look-and-feel.

**Non-Goals:**
- No engine/render/data/API changes; nothing about Mandelbrot computation.
- Not porting the mockups' vanilla JS verbatim — behavior is reimplemented in Vue/TS.
- Not the `.twkx` "edit mode" authoring panel (that is Claude-artifact chrome, irrelevant
  to the app).
- Not redesigning the windowing/drag system beyond swapping popup chrome for the topbar.

## Decisions

### D1: Lift the CSS as a shared stylesheet, keyed by root data-attributes
Extract the 398-line stylesheet from `Palettes Dense.html` into the app (a dedicated
`src/dense.css` imported once, or a `:root`/global block in `style.css`). Keep the
token-driven structure (`data-style`, `data-layout`, `data-shape`, `data-field`,
`--cmul`) verbatim so the tweak knobs work as in the mockups.
- *Alternative considered:* per-component scoped styles — rejected; it recreates the
  current fragmentation the dense system is meant to remove.

### D2: Reimplement the runtime as Vue components, not ported JS
Because `dense-kit.js`/`palette-dense-ui.js` are missing and we want Vue reactivity
anyway, build a `src/components/dense/` kit:
- `DenseField` — the drag-to-scrub slider. Props: `min/max/step`, `modelValue`,
  `label`, `desc`, formatter (`p0..p3` | fn), `unit`, `default`. Pointer events on the
  row; horizontal delta → value; Shift = fine; double-click → inline `.fld-edit`; emits
  `update:modelValue`. `.fld-fill` width = normalized value; `.fld.mod` when ≠ default.
- `DenseToggle`, `DenseSeg`, `DenseSelect`, `DenseColor`, `DenseCurve` — variants sharing
  row metrics.
- `DenseSection` (head: icon chip + title + scope + caret; collapsible per layout),
  `DenseCard`/`DenseGrid` (library cards with hover `.acts`), `DenseTopbar` (brand,
  `ptabs`, *Affichage* button, close), `DenseViewMenu`, `DenseMobileNav`.
- A small composable `useDenseScrub()` encapsulating the pointer math so every numeric
  control behaves identically.
- *Alternative considered:* wrap native `<input type=range>` and only restyle — rejected;
  loses drag-anywhere-on-row and the gauge/formatter model that defines the language.

### D3: Replace popup chrome with the dense topbar; keep dragging
`MandelbrotViewer.vue` keeps its per-tab popup positioning/drag/z-order, but the popup
header becomes `DenseTopbar`. The drag handle moves to the topbar. The *Affichage* menu
reads/writes a persisted view state (layout/style/shape) per the mockups' `viewKey`
pattern (localStorage), shared across panels with per-panel layout defaults
(Animation → `inspector`, others → `columns`).

### D4: Each panel = a declarative `SECTIONS` model wired to its store
Mirror the mockups' authoring style: each panel defines an array of sections, each
rendering `DenseField`/variants bound to the real store value. Mapping:
| Panel | Component | Default layout | Source of structure |
|---|---|---|---|
| Animation | `AnimationPanel.vue` | inspector | inline SECTIONS in mockup (pilot) |
| Navigation | `MandelbrotController.vue` | columns | inline SECTIONS in mockup |
| Presets | carved from `Settings.vue` | columns | inline SECTIONS in mockup |
| Palettes | `PaletteEditor.vue` | columns | reconstruct from real component |

### D5: Sequence — pilot Animation first
Animation is smallest (772 lines), self-contained, inspector layout, and its mockup
inlines full structure. Port it end-to-end to shake out the shared kit, then roll out
Navigation, Presets, Palettes. Palettes (HUD strip + pins + sections, richest) last.

### D6: Supersede `densify-design-system`
Archive that change as a partial v1 token pass; do not continue its remaining
(verify-only) tasks. Its token ideas are absorbed into the dense stylesheet.

## Risks / Trade-offs

- [Settings.vue is 4783 lines and holds the Presets library + likely other dense-mapped
  regions] → Carve incrementally: extract the Presets library into its own dense panel
  first behind the existing tab; leave non-mapped Settings regions untouched until a later
  pass.
- [Drag-to-scrub feel must match an interaction we only have CSS hints for] → Derive the
  spec from CSS (`cursor:ew-resize`, `.fld.scrub`, `.fld-fill`) + standard scrub
  conventions; centralize in `useDenseScrub()` so tuning is one place; validate on real
  hardware with the user.
- [WebGPU blocks headless visual verification] → Plan explicit manual checkpoints with the
  user at desktop + narrow widths; keep diffs reviewable per panel.
- [Touch vs pointer: scrub must not fight panel scroll on mobile] → Use the mockup's
  `touch-action:pan-y` on `.fld` and pointer capture, matching the CSS already present.
- [Behavior regressions when rebinding controls to stores] → Spec mandates value parity;
  port one panel at a time and diff against the old control set before removing it.

## Migration Plan

1. Land the shared `dense.css` + `src/components/dense/` kit (no panel switched yet).
2. Port Animation behind its existing tab; verify parity + feel with the user.
3. Swap `MandelbrotViewer.vue` popup chrome → `DenseTopbar` + persisted view menu.
4. Port Navigation, then Presets (carve from Settings), then Palettes.
5. Remove superseded per-panel CSS; archive `densify-design-system`.
- *Rollback:* the kit is additive until a panel is switched; each panel port is an
  independent, revertible step.

## Open Questions (resolved)

- **Stylesheet location:** separate `src/dense.css`, imported once. ✓
- **View state:** **global** across all panels — one shared layout/theme/shape; switching
  affects every panel at once (overrides the mockups' per-panel `viewKey`). ✓
- **Settings scope:** **all of `Settings.vue`** is in scope now (not just the Presets
  library) — every region is ported to dense sections in this change. ✓
- **Default theme:** `clair` (light). ✓
