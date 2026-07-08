## ADDED Requirements

### Requirement: Compact render strip shows only glanceable indicators
The system SHALL display a fixed, non-expandable render status strip showing exactly: a status dot (idle / rendering / reference-building), the current FPS, the zoom magnitude (Z), and the maximum iteration count (I). The strip SHALL NOT offer an in-place expand/collapse affordance or any additional stat rows.

#### Scenario: Strip shows the four glanceable indicators
- **WHEN** the application is running and rendering the fractal
- **THEN** the render strip shows the status dot, FPS, zoom magnitude, and max iterations, and nothing else

#### Scenario: Strip has no expand toggle
- **WHEN** a user looks at the render strip
- **THEN** there is no chevron, arrow, or other control that expands it into a larger panel in place

### Requirement: Render strip opens the full performance panel on click
Clicking anywhere on the render strip SHALL open the full performance panel, using the same toggle behavior as the existing `m` keyboard shortcut.

#### Scenario: Click opens the performance panel
- **WHEN** the performance panel is closed and a user clicks anywhere on the render strip
- **THEN** the full performance panel opens

#### Scenario: Click while panel is open toggles it closed
- **WHEN** the performance panel is already open and a user clicks the render strip
- **THEN** the full performance panel closes, consistent with pressing `m` again

### Requirement: Full performance panel hosts the relocated render/dispatch/reference stats
The full performance panel SHALL display, in addition to its existing GPU-pass breakdown, the following metrics relocated from the render strip: completion percentage, last render time (wall-clock and GPU), total applications, applications per GPU millisecond, tier mix, shader mode (approximation tier and BLA level count), compute mode (F32 or FloatExp), batch size, current reference build progress, pending reference build progress, reference serial number, remaining orbit count, ops per frame, and pixel counts (remaining, active, total).

#### Scenario: Relocated stats appear in the full panel
- **WHEN** a user opens the full performance panel
- **THEN** completion percentage, last render time, total applications, tier mix, shader mode, compute mode, reference build progress, and pixel counts are all visible within it

#### Scenario: AA frontier stays conditional
- **WHEN** analytic antialiasing is not active
- **THEN** the AA frontier metric is not shown in the full performance panel

### Requirement: Full performance panel hosts the debug shading toggle
The "Visualisation débug" (debug shading) toggle SHALL be available inside the full performance panel and SHALL NOT be present on the render strip.

#### Scenario: Debug toggle relocated
- **WHEN** a user opens the full performance panel
- **THEN** a debug shading toggle is present and controls the same debug shading state previously controlled from the render strip

### Requirement: Unreliable GPU counters are removed
The system SHALL NOT display "real skip", "workgroup waste", "max pixel work", or the table-build timing/stage indicator, in either the render strip or the full performance panel.

#### Scenario: Dropped counters are absent everywhere
- **WHEN** a user inspects the render strip and the full performance panel
- **THEN** none of "real skip", "workgroup waste", "max pixel work", or table-build timing are displayed in either location

### Requirement: Full performance panel summary cards are simplified
The full performance panel's summary cards SHALL show exactly four values — FPS, frame interval, GPU frame span, and sum of passes (Σ passes) — as plain numeric displays without per-card sparkline history graphs. FPS SHALL be visually emphasized relative to the other three values. The CPU render summary card SHALL be removed.

#### Scenario: Four cards, no sparklines
- **WHEN** a user opens the full performance panel
- **THEN** exactly four summary values are shown (FPS, frame interval, GPU frame span, Σ passes), none of them include a sparkline graph, and no CPU render card is present

#### Scenario: FPS is visually emphasized
- **WHEN** a user views the summary cards
- **THEN** the FPS value is displayed more prominently (e.g., larger) than the other three values

### Requirement: Pixel counts are shown once
The full performance panel SHALL display remaining, active, and total pixel counts in exactly one place, not duplicated between a footer and any other section.

#### Scenario: No duplicate pixel counts
- **WHEN** a user opens the full performance panel
- **THEN** the remaining and active pixel counts each appear in exactly one location within the panel
