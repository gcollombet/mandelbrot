## ADDED Requirements

### Requirement: Shared dense shell stylesheet

The system SHALL provide a single shared stylesheet implementing the dense design
language from `canvas/Palettes Dense.html`, including theme tokens, the field family,
section/card primitives, layouts, tweak knobs, and responsive rules. All panels SHALL
consume this shared stylesheet rather than defining their own equivalent styles.

#### Scenario: Panels share one stylesheet

- **WHEN** any dense panel (Palettes, Animation, Navigation, Presets) is rendered
- **THEN** its shell, fields, sections, and cards are styled by the shared dense
  stylesheet and no panel redefines `.fld`, `.section`, `.card`, or `.topbar` styling
  locally

#### Scenario: Theme token switching

- **WHEN** the panel root's `data-style` attribute is set to `glow`, `sober`, or `clair`
- **THEN** the panel re-themes (background, surfaces, ink, accent, blur) using only the
  token values for that style, with no per-panel color overrides

### Requirement: Drag-to-scrub field

The system SHALL render numeric controls as `.fld` rows where the entire row is the
drag surface. Dragging horizontally SHALL adjust the value within `[min, max]` by the
configured `step`, and a `.fld-fill` gauge SHALL reflect the current value as a
proportion of the range.

#### Scenario: Scrub adjusts value

- **WHEN** the user presses and drags horizontally on a `.fld` row
- **THEN** the bound value updates within its min/max by the row's step, the `.fld-fill`
  width tracks the value, and the row shows the `.fld.scrub` state while active

#### Scenario: Fine adjustment modifier

- **WHEN** the user drags while holding the fine-adjust modifier (Shift)
- **THEN** the value changes at reduced sensitivity for precise tuning

#### Scenario: Type an exact value

- **WHEN** the user double-clicks a `.fld` row
- **THEN** an inline numeric editor (`.fld-edit`) appears pre-filled with the current
  value, and committing it sets the value (clamped to min/max) while Escape cancels

#### Scenario: Formatted value display

- **WHEN** a field declares a formatter (`p0`/`p1`/`p2`/`p3` or a custom function)
- **THEN** the displayed `.fld-val` text is produced by that formatter, optionally with
  a unit suffix, while the underlying bound value remains numeric

#### Scenario: Modified indicator

- **WHEN** a field's value differs from its default
- **THEN** the row shows the `.fld.mod` state (accent edge marker and emphasized label)

### Requirement: Field variants

The system SHALL provide non-numeric field variants that share the `.fld` row metrics:
toggle (`.fld-tog`), segmented (`.fld-seg`), select (`.fld-sel`), color (`.fld-col`),
and curve (`.fld-curve`).

#### Scenario: Toggle field

- **WHEN** the user clicks a toggle field
- **THEN** the bound boolean flips and the `.tog` knob animates to its on/off position

#### Scenario: Segmented field

- **WHEN** the user clicks a segment in a segmented field
- **THEN** the bound value becomes that segment's value and only that segment shows the
  `on` state

### Requirement: Collapsible sections

The system SHALL group fields into `.section` cards, each with a `.sec-head` (icon chip,
title, scope hint, caret). In layouts that allow collapsing, clicking the head SHALL
toggle the section body.

#### Scenario: Collapse a section

- **WHEN** the layout is `inspector` or `tabs` and the user clicks a section head
- **THEN** the section body hides, the caret rotates, and the state persists for the
  session

#### Scenario: Columns layout disables collapse

- **WHEN** the layout is `columns`
- **THEN** section heads render without an interactive caret and bodies are always shown

### Requirement: Switchable panel layouts

The system SHALL support three layouts selected by the root `data-layout` attribute:
`columns` (CSS masonry), `inspector` (stacked full width), and `tabs` (one section at a
time with a tab bar). Each panel SHALL declare a default layout.

#### Scenario: Columns masonry

- **WHEN** `data-layout` is `columns`
- **THEN** sections flow into width-driven masonry columns that avoid breaking inside a
  section

#### Scenario: Tabs layout shows one section

- **WHEN** `data-layout` is `tabs`
- **THEN** only the active section is visible and the `.tabbar` exposes the other
  sections for selection

### Requirement: Panel shell and view menu

The system SHALL render each panel inside the dense `.topbar` shell (brand dot + title,
`ptabs` for primary grouping where applicable, an *Affichage* view button, and a close
control). The view button SHALL open a menu controlling layout, theme (`data-style`),
and shape (`data-shape`), and these selections SHALL persist across sessions.

#### Scenario: Open and apply view menu

- **WHEN** the user opens the *Affichage* menu and selects a layout, style, or shape
- **THEN** the panel updates immediately and the selection is persisted (e.g. via the
  panel's view storage key) so it is restored on reopen

#### Scenario: Close control

- **WHEN** the user activates the close control
- **THEN** the panel closes, matching the existing tab/popup close behavior

### Requirement: Character tweaks

The system SHALL support the tweak knobs from the mockups via root data attributes:
`data-shape` (`net`/`doux`/`rond`), `data-field` (`gauge`/`sober`/`minimal`), and a
chroma multiplier driving per-section accent vividness. These SHALL alter appearance only.

#### Scenario: Shape changes roundness

- **WHEN** `data-shape` is set to `net`, `doux`, or `rond`
- **THEN** control and container corner radii change accordingly without affecting layout
  or behavior

#### Scenario: Field character changes gauge style

- **WHEN** `data-field` is set to `gauge`, `sober`, or `minimal`
- **THEN** the `.fld-fill` rendering changes (full gauge, thin underline, or none) while
  the scrub interaction is unchanged

### Requirement: Card grid for libraries

The system SHALL render preset/palette/location libraries as `.card` items in a
responsive `.grid`, with thumbnail, name, sub-line, selected state, and hover actions
(e.g. favorite, delete).

#### Scenario: Select a card

- **WHEN** the user clicks a library card
- **THEN** the card shows the `.sel` selected state and its item is applied

#### Scenario: Hover actions

- **WHEN** the user hovers a card
- **THEN** the `.acts` action buttons (such as favorite and delete) become visible and
  are operable

### Requirement: Responsive and mobile navigation

The system SHALL adapt to small viewports: below the mobile breakpoint the panel fills
the viewport, fields collapse to single column where needed, and a sticky bottom
`.mobile-nav` SHALL provide quick section navigation.

#### Scenario: Mobile layout

- **WHEN** the viewport width is below the mobile breakpoint
- **THEN** the panel renders full-bleed, the `.mobile-nav` is shown, and fields reflow to
  fit without horizontal overflow

#### Scenario: Mobile quick nav

- **WHEN** the user taps a `.mobile-nav` button on a narrow viewport
- **THEN** the corresponding section is revealed/scrolled into view and marked active

### Requirement: Behavior parity with existing panels

Porting a panel to the dense shell SHALL preserve its existing behavior and data
bindings; only presentation and interaction surface change. Each dense field SHALL read
and write the same store/model value its pre-port control did.

#### Scenario: Animation panel parity

- **WHEN** the Animation panel is used after porting
- **THEN** every animation parameter (per-channel wave, speed, amplitude, enable, global
  speed, play/pause) controls the same `AnimationConfig` value as before, with no change
  to the underlying animation behavior
