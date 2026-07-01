## Why

The `canvas/*-Dense.html` mockups (Navigation, Animation, Presets, Palettes) define a
new, more ambitious "dense editor" design language than the in-progress
`densify-design-system` change delivers. That earlier change only tightened the existing
Bulma-based markup with a token scale; the mockups instead replace the whole panel model:
a unified shell (brand topbar + `ptabs` + an *Affichage* view menu + close), compact
**drag-to-scrub** `.fld` slider rows in place of native range inputs, collapsible
`.section` cards, switchable **columns / inspector / tabs** layouts, theme tokens
(`glow` / `sober` / `clair`) and character "tweaks" (`shape`, `field`, `chroma`). Adopting
this language gives every panel one consistent, information-dense surface and a single set
of levers for look-and-feel, which the current per-component scoped CSS cannot provide.

## What Changes

- Introduce a shared **dense shell** lifted from the mockups' canonical 398-line
  stylesheet (`canvas/Palettes Dense.html`): theme tokens, the `.fld` field family,
  `.section`/`.card` primitives, the three layouts, the responsive + mobile-nav rules,
  and the `data-style`/`data-layout`/`data-shape`/`data-field`/`data-chroma` tweak knobs.
- Build reusable **Vue field components** that reimplement the missing runtime
  (`dense-kit.js` / `palette-dense-ui.js` are not in the repo): `DenseField` (drag-to-scrub
  slider with `.fld-fill` gauge, fine-drag modifier, double-click-to-type, value
  formatters `p0/p1/p2/p3` + custom), plus `DenseToggle`, `DenseSeg`, `DenseSelect`,
  `DenseColor`, `DenseCurve`, `DenseSection`, `DenseCard`, and the `DenseTopbar` shell.
- **BREAKING (UI):** Replace the floating-popup chrome in `MandelbrotViewer.vue` with the
  dense `.topbar` (brand dot, `ptabs`, *Affichage* view menu, close) and a persisted
  view-menu controlling layout/theme/shape; popups keep dragging but drop the old header.
- Port all four panels to the dense language, wired to the existing stores:
  **Animation** (`AnimationPanel.vue`, inspector layout — pilot), **Navigation**
  (`MandelbrotController.vue`, coord box + location library), **Presets** (carved out of
  `Settings.vue`), and **Palettes** (`PaletteEditor.vue`, HUD gradient strip + pins +
  sections — structure reconstructed from the real component since the mockup's body is
  JS-generated and that JS is missing).
- Supersede `densify-design-system`: its token-scale work is folded into the dense shell;
  the conservative re-skin approach is abandoned in favor of this full adoption.

## Capabilities

### New Capabilities
- `dense-ui-shell`: The shared dense design system — theme/layout/shape/field tokens, the
  panel shell (topbar, ptabs, view menu, mobile nav), the `.fld` field family and its
  drag-to-scrub interaction contract, `.section`/`.card` primitives, the three layouts,
  and the responsive/small-viewport rules that every panel consumes.

### Modified Capabilities
<!-- None: the existing specs govern panel *behavior/data* (animation-mixer,
     preset-management, etc.), which is unchanged. This change is presentational +
     introduces a new shared shell capability. densify-design-system is a separate
     in-progress change to be superseded, not a published spec. -->

## Impact

- `src/style.css` (or a new `src/dense.css`) — the dense shell stylesheet, tokens, field
  family, layouts, tweaks, responsive rules.
- New `src/components/dense/` — reusable Vue field/shell components.
- `src/components/MandelbrotViewer.vue` — popup chrome → dense topbar; persisted view menu;
  mobile nav.
- `src/components/AnimationPanel.vue`, `MandelbrotController.vue`, `PaletteEditor.vue` —
  re-authored as dense `SECTIONS` wired to existing stores.
- `src/components/Settings.vue` (4783 lines) — the Presets library (and any other
  dense-mapped regions) carved into dense sections; largest and riskiest surface.
- Reference: `canvas/*-Dense.html` (design + structure source of truth; runtime JS is
  absent and is reimplemented in Vue, not ported).
- No data/API/engine changes — purely presentational. WebGPU is required to render the
  panels, so final visual verification is manual on a real browser (headless preview only
  shows the WebGPU fallback).
