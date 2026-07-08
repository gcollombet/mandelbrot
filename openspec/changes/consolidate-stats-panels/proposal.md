## Why

The always-visible `RenderStats` widget has grown into a ~20-row expandable panel that duplicates most of what the full performance panel (opened with `m`) already shows, plus a handful of GPU counters (real skip, workgroup waste, max pixel work) that no longer read as trustworthy. The result is two competing places to look for the same numbers, with the compact widget cluttering the canvas overlay. This change narrows `RenderStats` down to a small fixed strip and consolidates every other diagnostic into the full panel, dropping the counters that are no longer reliable and de-duplicating overlapping GPU timing cards.

## What Changes

- **BREAKING**: `RenderStats` (the compact top-corner widget) drops its expand/collapse behavior entirely — it becomes a fixed, non-expandable strip showing only: status dot, FPS, zoom magnitude (Z), max iterations (I).
- Clicking anywhere on the `RenderStats` strip opens the full performance panel (same panel currently toggled by the `m` key), replacing the old in-place expand toggle.
- The `RenderStats` expanded panel, its 4-series canvas graph (pixels restants/FPS/pixels actifs/ops per frame), and its ~20 stat rows are removed from `RenderStats`.
- The following stats, currently in `RenderStats`, are relocated into the full performance panel (`PerformancePanel`): completion %, last render time (wall/gpu), total apps, tier mix, AA frontier, apps/gpu ms, shader mode, batch size, compute mode (F32/FloatExp), the reference/orbit build block (current reference, pending reference, reference serial, remaining orbit), ops/frame, and remaining/active/total pixel counts.
- The following stats are dropped entirely (not relocated): real skip, workgroup waste, max pixel work (all flagged as unreliable/miscalibrated), and table build timing/stage indicator.
- The "Visualisation débug" toggle moves from `RenderStats` into `PerformancePanel`.
- `PerformancePanel`'s summary cards are simplified: the CPU render card is removed; FPS, frame interval, GPU frame (span), and Σ passes remain as plain numeric values (no more per-card sparkline history) with FPS visually emphasized over the other three.
- The pre-existing per-pass breakdown (instant + 30s average bars, legend table, stacked history graph) and CSV/JSON export in `PerformancePanel` are unchanged.
- The `PerformancePanel` footer's existing "unfinished/active pixel" counts are de-duplicated against the newly relocated pixel-count rows rather than shown twice.

## Capabilities

### New Capabilities
- `render-diagnostics-overlay`: defines the split between the always-visible compact render strip and the full diagnostics/performance panel, including which metrics live where, which are dropped, and how the two surfaces are opened/linked.

### Modified Capabilities
(none — no existing spec covers this UI; see `openspec/specs/performance-settings` which covers unrelated brush/sentinel step controls)

## Impact

- `src/components/RenderStats.vue`: major simplification — remove expand state, canvas graph, drawing logic, and the stats-grid template block; keep header markup, wire click to open the full panel.
- `src/components/PerformancePanel.vue`: add relocated stat rows/sections (render, tier/AA/shader, reference/orbit), add the debug toggle, simplify the summary cards section, remove the CPU render card and per-card sparklines, de-duplicate the footer pixel counts.
- `src/components/MandelbrotViewer.vue`: wiring between the two components (`showPerfPanel`/`togglePerfPanel`) already exists for the `m` shortcut; extend it so `RenderStats`'s click emits the same toggle instead of managing its own local `expanded` state.
- No engine (`src/Engine.ts`) changes — all relocated fields are already public/polled today; only their presentation location moves.
