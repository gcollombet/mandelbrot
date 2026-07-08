## Context

Two components currently show overlapping render/GPU diagnostics:

- `RenderStats.vue` — always mounted, top-corner widget. Collapsed state shows a status dot, FPS, and small Z/I badges (zoom magnitude, max iterations). Clicking expands a panel with a 4-series canvas graph and ~20 stat rows (completion %, timing, tier mix, AA frontier, table build, GPU counters, reference/orbit build state, a debug-shading toggle, etc.), each polled from `Engine` on a 150ms interval.
- `PerformancePanel.vue` — opened via the `m` key (state owned by `MandelbrotViewer.vue` as `showPerfPanel`). Shows 5 summary cards (FPS, frame interval, GPU frame span, Σ passes, CPU render), each with its own 30s sparkline, plus a per-pass timing breakdown (instant + 30s average stacked bars, legend table, stacked area history) and CSV/JSON export. Sampling is frame-driven (`requestAnimationFrame` + `engine.frameSerial`), not a fixed interval.

Both poll plain scalar fields on `Engine` (`e.fps`, `e.unfinishedPixelCount`, `e.lastCompletionWallMs`, etc.) rather than subscribing to events — there is no shared state module between them today.

Three of `RenderStats`' GPU counters (`realizedSkip`, `workgroupWaste`, `maxPixelSteps`) and the table-build timing row are being dropped outright because they've been observed to read implausible values; this is a data-quality call, not something this change re-derives from the `Engine` computation — no engine changes are in scope.

## Goals / Non-Goals

**Goals:**
- Reduce `RenderStats` to a fixed, glanceable strip (dot, FPS, Z, I) with no local expand/collapse state.
- Make `RenderStats` a launcher for `PerformancePanel`: clicking anywhere on the strip opens the same panel the `m` key opens, rather than expanding an in-place panel.
- Move every other currently-useful stat from `RenderStats` into `PerformancePanel`, grouped sensibly (it was a flat list; the merged panel should read as sections).
- Drop `realizedSkip`, `workgroupWaste`, `maxPixelSteps`, and the table-build row — these are not relocated anywhere.
- Simplify `PerformancePanel`'s summary cards: drop CPU render and per-card sparklines; keep FPS, frame interval, GPU frame span, and Σ passes as plain values with FPS emphasized.
- Collapse the duplicate "unfinished/active pixel" display between the old `RenderStats` rows and `PerformancePanel`'s existing footer into one place.

**Non-Goals:**
- No new `Engine` fields, events, or computation changes — every relocated stat already exists as a public/polled field.
- No per-render "burndown" chart of remaining pixels (explicitly deferred, discussed and shelved during exploration).
- No visual redesign of `PerformancePanel`'s existing per-pass breakdown, stacked history graph, or CSV/JSON export — those stay as-is.
- No change to the `m` keybinding or to `showPerfPanel`/`togglePerfPanel` ownership in `MandelbrotViewer.vue` beyond wiring `RenderStats`'s click to the same toggle.

## Decisions

**1. `RenderStats` becomes a dumb, non-expandable strip; all state (`expanded`, `HISTORY_LENGTH` buffers, `drawGraph`, the 150ms poll interval driving the removed rows) is deleted rather than hidden behind a flag.**
Alternative considered: keep the expand toggle but empty out most rows. Rejected — an expand affordance with almost nothing behind it is a dead click target and keeps dead code (canvas drawing, history arrays) alive for no reason.

**2. Clicking the strip calls the same handler the `m` key already calls (`togglePerfPanel` in `MandelbrotViewer.vue`), passed down as a prop/emit rather than duplicated logic.**
`RenderStats` emits e.g. `@open-perf-panel` (or reuses an existing pattern in the codebase for parent-owned toggles); `MandelbrotViewer.vue` wires it to the existing `togglePerfPanel` function so there is exactly one source of truth for panel visibility.

**3. Relocated stats land in `PerformancePanel` as new grouped sections rather than being appended flat.**
Proposed grouping (naming to be finalized during implementation):
- *Render*: completion %, last render (wall/gpu), total apps, apps/gpu ms.
- *Dispatch*: tier mix, shader mode (approximation tier + BLA level count), compute mode (F32/FloatExp), batch size.
- *Reference*: current reference progress, pending reference progress, reference serial, remaining orbit.
- *Debug*: the "Visualisation débug" switch.
Rationale: the flat 20-row list in `RenderStats` was already hard to scan; folding it unsorted into `PerformancePanel` would just relocate the problem. Grouping matches the earlier exploration's identification of distinct concerns (GPU perf vs. dispatch/tier vs. reference-build).
Alternative considered: keep everything flat, ordered as it was. Rejected — `PerformancePanel` already mixes a GPU-perf identity with these additions; some structure keeps it readable as it grows.

**4. AA frontier keeps its existing conditional visibility (`v-if="aaFrontier()"`) rather than being always-rendered.**
Consistent with how it behaves today in `RenderStats` — it's only meaningful when analytic AA is active.

**5. Pixel counts (remaining/active/total) are shown once, in the relocated *Render* section; `PerformancePanel`'s existing footer line is removed rather than kept alongside.**
The footer's `unfinished`/`active` values and the relocated rows read the same `Engine` fields (`unfinishedPixelCount`, `activePixelCount`) — showing both is redundant. The relocated rows include a `totalPixels` figure the footer doesn't have, so they're the strictly more complete version to keep.

**6. Summary cards keep exactly 4 values (FPS, frame interval, GPU frame span, Σ passes) with FPS visually emphasized (larger) and the other three compact; no sparklines on any of them.**
This was an explicit user call after noting the three non-FPS metrics correlate closely and that per-card mini-history added clutter without adding insight the per-pass stacked history graph doesn't already cover. CPU render is dropped as a card entirely (not relocated) — it remains available via `stats.cpuRenderMs`/`readLive` internally if needed for the export, but is not surfaced as a card.

## Risks / Trade-offs

- **[Risk]** Deleting `realizedSkip`/`workgroupWaste`/`maxPixelSteps` removes the only surfaced signal for in-place-compute-path efficiency, even though they're currently miscalibrated — if someone fixes their calculation later, there's no UI slot waiting for them.
  → **Mitigation**: none needed for this change; re-adding a stat later is cheap once the underlying number is trustworthy again. Not worth keeping a visible-but-wrong row in the meantime.
- **[Risk]** Grouping the relocated stats into new sections is a judgment call made without the user reviewing exact section boundaries/names.
  → **Mitigation**: keep section headers easy to rename/re-shuffle in a follow-up; this is presentation-only, no data model implications.
- **[Risk]** `PerformancePanel` was scoped/titled around "Mesures GPU"; absorbing dispatch/reference-build state stretches that framing.
  → **Mitigation**: out of scope for this change per user's earlier framing (title bikeshedding was explicitly deferred); revisit naming separately if it becomes confusing in practice.

## Open Questions

- Exact section titles/order for the relocated stats inside `PerformancePanel` (proposed above, not confirmed).
- Whether `RenderStats`' status dot animation (idle/active/reference-building pulse) is worth keeping in the trimmed strip or if FPS/Z/I alone is sufficient — proposal keeps it since it's an ambient state signal, not a "stat" to prune, but this wasn't explicitly re-confirmed after the strip was finalized.
