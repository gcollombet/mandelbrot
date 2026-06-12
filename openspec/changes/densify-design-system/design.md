## Context

The design system was refreshed via Claude Design — visually strong (glass blur,
radial gradients, rounded corners) but written without a density scale. Every spacing,
font-size, control-height, thumb-size, label-width and radius is a literal pixel value
spread across `src/components/Settings.vue` (~1900 lines of style) and shared controls
in `src/style.css`. Consequences:

- **Desktop**: too much air. 15px type, 16–20px gaps, 8–20px padding, 20px slider
  thumbs, 18px radii.
- **Slider crush**: `.palette-control-row` uses
  `grid-template-columns: var(--palette-label-width /*208px*/) minmax(0,1fr) 92px`.
  On a 640px popup body (~588px usable), fixed parts consume ~368px → the slider gets
  only ~220px. The label, the least important element, is the widest.
- **Galleries diverge**: preset grid is `repeat(3,1fr)` with no media query; texture
  grid collapses at 720/520px. Behavior is inconsistent panel to panel.
- **Mobile overflow**: popup widths are set in JS in `MandelbrotViewer.popupStyle()`
  (1080/720/640px). `max-width:96vw` caps the box, but fixed-px internal grids still
  overflow narrow screens.

Constraint: WebGPU is required to render the panels, so headless preview only shows the
fallback — verification of these panels is manual/visual.

## Goals / Non-Goals

**Goals:**
- A single density scale in `:root` that all panels/controls consume.
- A denser fixed baseline that keeps the visual identity (blur, gradients, rounding).
- Reclaim slider width by shrinking the label column and label font.
- One responsive grid rule for all three galleries.
- No horizontal overflow on small viewports.

**Non-Goals:**
- The container-query **auto-compact** mechanism (density reacting to panel width).
  Deferred — we validate the fixed denser baseline first.
- A user-facing compact/comfortable toggle.
- Any behavioral, data, or API change. Purely presentational.
- Restructuring panel content/IA or the mobile navigation (touch UX is acceptable today).

## Decisions

### D1 — Token scale shape

Add to `:root` (next to existing color/font tokens):

```
--space-1: 4px;  --space-2: 6px;  --space-3: 8px;  --space-4: 12px; --space-5: 16px;
--font-xs: 11px; --font-sm: 12px; --font-md: 13px; --font-lg: 14px;
--ctrl-h: 30px;        /* control height (was ~38–42px) */
--thumb: 16px;         /* slider thumb (was 20px) */
--label-w: 150px;      /* slider label column (was 208px) */
--radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;  /* keep --radius:18px legacy */
```

Rationale: a numbered step scale (not semantic names like `--gap-large`) is the least
ambiguous when migrating dozens of magic numbers — each existing value maps to the
nearest step. Keep the legacy `--radius:18px` to avoid churn where it is still wanted;
introduce `--radius-*` for the recalibrated denser corners.

Alternative considered: semantic tokens (`--space-tight`, `--space-loose`). Rejected for
now — harder to map mechanically and invites bikeshedding mid-migration.

### D2 — Migrate, don't rewrite

Replace literals with tokens in place, panel section by panel section, rather than
rewriting the stylesheet. Lower risk, reviewable diffs, and the denser baseline emerges
from the token values themselves. The slider row becomes:

```
grid-template-columns: var(--label-w) minmax(0,1fr) 64px;
gap: var(--space-4); padding: var(--space-3) var(--space-4);
```

label font → `--font-md` (13px), value column 92px → 64px. On a 640px popup this lifts
the slider track from ~220px to ~326px (+48%).

### D3 — One gallery rule

Replace every gallery grid with:

```
grid-template-columns: repeat(auto-fill, minmax(var(--gallery-min, 140px), 1fr));
```

and delete the per-gallery column counts and their 520/720px media queries. `auto-fill`
makes responsiveness intrinsic — no breakpoints to keep in sync. `--gallery-min` lets us
tune card density in one place. (Filmstrip / carousel alternatives were considered and
deferred; `auto-fill` alone removes the inconsistency with the least code.)

### D4 — Viewport-safe popup widths

In `MandelbrotViewer.popupStyle()`, change the `width` values from `'1080px'` etc. to
`'min(1080px, 96vw)'` (and equivalently for 720/640). This makes the JS-driven widths
viewport-safe at the source, complementing the existing `max-width:96vw` and the row
collapse already present at the 520px breakpoint.

## Risks / Trade-offs

- **Visual regressions across many panels from one token change** → Migrate per section;
  visually spot-check each panel (Palettes, Presets, Navigation, Animation, Performance)
  after its section is migrated. WebGPU needed, so this is manual.
- **Shared controls leak into other components** (`AnimationPanel.vue`, etc. inherit
  `style.css` and `:deep` rules) → Treat the denser baseline as global on purpose, but
  spot-check those components for clipped or cramped layouts.
- **Too dense / cramped feel** → The token values are a starting point; because density
  now lives in `:root`, tuning is a few-line change, not a re-migration.
- **Legacy `--radius` vs new `--radius-*` coexistence is confusing** → Document intent in
  a comment; migrate remaining `--radius` usages opportunistically, not as a hard gate.

## Migration Plan

1. Add the token scale to `:root` in `src/style.css` (no visual change yet).
2. Migrate shared controls in `style.css` (checkbox, etc.) to tokens.
3. Migrate `Settings.vue` section by section: slider rows + labels first (biggest win),
   then spacing/padding/radii, then galleries to the `auto-fill` rule.
4. Update `MandelbrotViewer.popupStyle()` widths to `min(..., 96vw)`.
5. Spot-check each panel visually at desktop and a narrow width; tune token values once.

Rollback: revert is trivial and isolated — the change is confined to two style surfaces
plus one JS function, with no data or behavioral coupling.

## Open Questions

- Final values for `--label-w` (150px starting point) and `--gallery-min` (140px) —
  expected to be tuned once visually after migration.
- Whether to retire the legacy `--radius:18px` entirely in this pass or leave it for a
  follow-up.
