## 1. RenderStats — strip down to the fixed strip

- [x] 1.1 Remove `expanded` state, the `toggle()` handler's expand behavior, and the `stats-panel` template block (canvas graph, legend, `stats-grid`, debug switch, footer close button)
- [x] 1.2 Remove the canvas graph drawing code (`drawGraph`, `graphCanvas` ref, `unfinishedHistory`/`fpsHistory`/`activePixelsHistory`/`opsHistory`, `HISTORY_LENGTH`) and the `watch(expanded, ...)` block
- [x] 1.3 Remove polled refs and computed helpers no longer used by the strip (everything except `fps`, `isRendering`/`isBuildingRef` status inputs, `zoomMagnitude`, `maxIterationsCondensed`, and their dependencies)
- [x] 1.4 Keep the `stats-header` markup (status dot, FPS, Z badge, I badge) as the entire component template
- [x] 1.5 Replace the click handler on the strip with an emit (e.g. `emit('open-perf-panel')`) instead of local `toggle()`
- [x] 1.6 Remove the `debugShading` `defineModel` and `defineExpose({ expanded })` (no longer needed once there's no expand state)
- [x] 1.7 Prune now-unused CSS for the removed expanded panel, graph, legend, grid rows, and debug switch

## 2. MandelbrotViewer — wire the strip to the existing panel toggle

- [x] 2.1 Listen for `RenderStats`'s new open/toggle emit and call the existing `togglePerfPanel` function (the same one bound to the `m` key)
- [x] 2.2 Verify `showPerfPanel` still drives `PerformancePanel` visibility exactly as before (no change to that binding itself)

## 3. PerformancePanel — relocate render/dispatch/reference stats

- [x] 3.1 Add a "Render" section with: completion %, last render (wall/gpu), total apps, apps/gpu ms
- [x] 3.2 Add a "Dispatch" section with: tier mix (auto mode only), shader mode + BLA level count, compute mode (F32/FloatExp), batch size
- [x] 3.3 Add a "Reference" section with: current reference progress bar, pending reference progress bar (conditional on active), reference serial number, remaining orbit count
- [x] 3.4 Add pixel counts (remaining, active, total) and ops/frame to the Render section
- [x] 3.5 Add the AA frontier row with its existing conditional visibility (only when analytic AA is active)
- [x] 3.6 Port the polling logic for all newly-added fields from `RenderStats`'s old `poll()` into `PerformancePanel`'s existing `readLive`/`tick` sampling
- [x] 3.7 Add the "Visualisation débug" toggle (bound to the same debug shading state previously exposed via `RenderStats`'s `defineModel`)

## 4. PerformancePanel — simplify summary cards

- [x] 4.1 Remove the CPU render summary card
- [x] 4.2 Remove per-card sparklines (FPS, frame interval, GPU frame span, Σ passes) and their underlying `seriesPaths` sparkline computations for these four
- [x] 4.3 Restyle the remaining four values so FPS is visually emphasized (larger) and the other three (frame interval, GPU frame span, Σ passes) are compact/secondary

## 5. Cross-component cleanup

- [x] 5.1 Remove the existing footer "px non finis / actifs" line from `PerformancePanel` now that pixel counts live in the Render section (no duplicate display)
- [x] 5.2 Remove `realizedSkip`, `workgroupWaste`, `maxPixelSteps`, and table-build timing/stage fields and their polling wherever they were read (do not relocate them)
- [x] 5.3 Confirm no dangling props/emits remain between `RenderStats` and its parent for the removed `debugShading` model

## 6. Verification

- [x] 6.1 Run the app, confirm the render strip shows only dot/FPS/Z/I and has no expand affordance
- [x] 6.2 Click the strip and confirm it opens the full performance panel; click again (or press `m`) and confirm it closes
- [x] 6.3 Confirm all relocated stats appear correctly in the full panel and update live during rendering
- [x] 6.4 Confirm the debug shading toggle in the full panel still controls debug shading rendering
- [x] 6.5 Confirm summary cards show exactly 4 values with no sparklines and FPS emphasized, and no CPU render card
- [x] 6.6 Confirm pixel counts appear exactly once in the panel
