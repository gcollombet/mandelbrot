## ADDED Requirements

### Requirement: Density token scale

The design system SHALL expose a single density scale via CSS custom properties in
`:root`, and panel/control styles SHALL consume those tokens instead of hard-coded
pixel values. The scale MUST cover at minimum: spacing steps (`--space-1`…`--space-5`),
font sizes (`--font-xs`…`--font-lg`), control height (`--ctrl-h`), slider thumb size
(`--thumb`), slider label column width (`--label-w`), and corner radii
(`--radius-sm`/`--radius-md`/`--radius-lg`).

#### Scenario: Tokens are defined once

- **WHEN** the stylesheet loads
- **THEN** `:root` defines the full density scale alongside the existing color and
  font tokens
- **AND** no spacing, font-size, control-height, thumb-size, label-width, or radius
  value used by panel controls is a literal pixel number that duplicates a token

#### Scenario: Density adjusts from one place

- **WHEN** a density token value in `:root` is changed
- **THEN** the corresponding visual property updates consistently across every panel
  and control that consumes it, with no per-component override required

### Requirement: Denser fixed baseline

Panels and controls SHALL render at a denser baseline than the pre-change design while
preserving the visual identity. Slider label text SHALL be no larger than 13px, and the
slider label column SHALL be narrower than the previous 208px so the slider track
regains usable width.

#### Scenario: Slider track regains width

- **WHEN** a slider row renders inside a 640px-wide popup
- **THEN** the label column is ~150px (down from 208px) and the label font is ≤13px
- **AND** the slider track is visibly wider than before the change

#### Scenario: Visual identity preserved

- **WHEN** any settings popup is open
- **THEN** the popup keeps its `backdrop-filter` blur, radial-gradient background,
  rounded corners, and gradient buttons
- **AND** corner radii are driven by `--radius-*` tokens rather than removed

### Requirement: Responsive galleries

The preset, texture, and palette galleries SHALL share a single responsive grid rule
based on `repeat(auto-fill, minmax(<min>, 1fr))`, replacing the divergent per-gallery
column counts and their inconsistent media queries. Gallery cards MUST never shrink
below the configured minimum width.

#### Scenario: Wide panel shows multiple columns

- **WHEN** a gallery renders in a wide popup
- **THEN** it fills the available width with as many `minmax`-sized columns as fit

#### Scenario: Narrow panel keeps usable cards

- **WHEN** a gallery renders in a panel narrower than three minimum-width cards
- **THEN** the grid reflows to fewer columns
- **AND** no card renders below the configured minimum card width

### Requirement: Small-viewport fit

Settings popups SHALL fit within the viewport on small screens without horizontal
overflow. Popup widths SHALL be capped to the viewport (`min(<target>, 96vw)`), and any
fixed-pixel internal grid SHALL collapse cleanly when the panel is narrow.

#### Scenario: Popup fits a narrow screen

- **WHEN** a popup whose target width exceeds the viewport opens on a small screen
- **THEN** its rendered width is capped at 96vw and it does not overflow horizontally

#### Scenario: Internal rows collapse

- **WHEN** a panel is too narrow to fit a multi-column control row at its fixed sizes
- **THEN** the row reflows (e.g. label moves above the control) instead of overflowing
