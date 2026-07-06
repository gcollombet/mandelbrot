# frame-coherent-builds — delta spec

## ADDED Requirements

### Requirement: Staged cache with coefficients keyed by reference only
The table lifecycle SHALL split into three cached stages — coefficients+levels keyed
by the reference orbit; majorant bounds keyed by R_c headroom; radii/tags/N₀ keyed by
(ε, c_max, DE-enabled) — such that a view change at constant reference re-runs only
the stages whose keys changed. Coefficients SHALL never be rebuilt when only ε, c_max
or the DE flag changes.

#### Scenario: Zoom animation re-derives radii only
- **WHEN** a zoom animation advances keyframes at constant reference (c_max shrinking)
- **THEN** only the radii stage recomputes per keyframe (light scan), and per-keyframe
  table time drops accordingly vs a cold build

#### Scenario: Cascade invalidation stays correct
- **WHEN** the reference orbit changes (pan or re-reference)
- **THEN** all three stages invalidate, and stale-table application is prevented by
  the existing active-table audit

### Requirement: Radii derivation is interactive-budget bound
The radii stage (r, r′, tags, N₀) SHALL be measurable and reported (build stats), and
its per-view cost SHALL stay within the interactive budget recorded at field rounds;
regressions SHALL be caught by a build-time budget test on the benchmark orbit set.

#### Scenario: Radii stage cost visible
- **WHEN** a table build or radii re-derivation completes
- **THEN** stage timings (coefficients / bounds / radii) are available to RenderStats
  debug output
