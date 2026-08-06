## 1. Timing metadata and boundaries

- [x] 1.1 Extend the pass-slot metadata with distinct `Reprojection (pan)`, `Clear cache`, and `Snapshot (zoom)` entries while preserving `Merge (zoom)`, derived query sizing, display order, and the sub-32-slot active mask.
- [x] 1.2 Add a copy-boundary helper that writes robust end-of-pass markers around a copy region through a one-thread no-op pass, only when timestamp queries are enabled.

## 2. Render-command attribution

- [x] 2.1 Route the existing raw-cache utility compute pass to the clear slot when `clearHistoryNextFrame` is active and otherwise to the pan-reprojection slot, without changing its pipeline, dispatch, resources, or texture swap.
- [x] 2.2 Bracket the resolved-to-frozen value, geometry, and metadata copies as one `Snapshot (zoom)` span without changing copy order or snapshot state transitions.
- [x] 2.3 Keep frozen-to-scratch preparation copies attributed to the existing end-to-end `Merge (zoom)` operation and verify that snapshot and merge query pairs are each written at most once per frame.

## 3. Timestamp readback and aggregation

- [x] 3.1 Teach timestamp readback to calculate the snapshot slot from its explicit before/after end markers while retaining consecutive-end partitioning for ordinary shader passes.
- [x] 3.2 Integrate the snapshot end marker into chronological partitioning so the following pass excludes snapshot cost and aggregate pass time, active state, EMA values, iteration feedback, and total GPU span remain coherent.

## 4. Verification

- [x] 4.1 Add focused unit coverage with synthetic timestamp data for a snapshot as the first GPU operation, a snapshot following merge work, and a shader following a snapshot without double attribution.
- [x] 4.2 Add focused coverage for clear-first utility-slot selection, pan-only selection, category labels/help, and omission of copy-boundary passes when timestamp queries are unavailable.
- [x] 4.3 Run the focused unit tests, the complete unit suite, and `npx vue-tsc -b`; do not run Playwright.
- [x] 4.4 In a timestamp-capable WebGPU browser, smoke-check pan, cache reset, zoom snapshot, and zoom merge categories and confirm that rendering and interaction remain visually unchanged.
