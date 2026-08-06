## 1. Baseline and ownership audit

- [x] 1.1 Map every Super Pixel, dyadic-refinement, step-setting, marker, counter, debug, timestamp, and `shader-f16` producer/consumer before deletion.
- [x] 1.2 Classify all `z″` and raw Taylor payload code as Super-Pixel-only, analytic-AA-shared, or future-geometry-shared so shared producers are retained.
- [x] 1.3 Record the current step-1/Super-Pixel-off render topology and available per-pass timings as the comparison baseline; perform browser/GPU capture only with explicit user approval.

## 2. Exact step-1 grid and scheduling

- [x] 2.1 Change history clear, initial seed, pan exposure, and reprojection holes to emit exact `iter == -1` requests at step 1 on both in-place and ping-pong paths.
- [x] 2.2 Remove negative power-of-two sentinel generation, `refine_sentinel`, grid-offset/minimum-step decisions, and their uniforms from the raw iteration shaders.
- [x] 2.3 Collapse uncovered-sentinel and active-continuation accounting into one post-dispatch remaining-work count used by `needsMoreFrames()` and adaptive batching.
- [x] 2.4 Retune the adaptive controller model for a full-grid initial wave while retaining a one-iteration minimum batch and explicit reserve for fixed passes.
- [x] 2.5 Verify that in-place and ping-pong paths classify the same texels as requests, continuations, and terminal results after equal iteration work.

## 3. Resolve and Super Pixel removal

- [x] 3.1 Simplify resolve so terminal raw texels pass through as exact step 1 and incomplete/budget-exhausted texels search finished dyadic support starting at step 2.
- [x] 3.2 Preserve no-data behavior when no finished support exists and ensure bilinear presentation never mutates or completes raw orbit state.
- [x] 3.3 Remove previous-resolved Super Pixel feedback bindings, half-step coverage markers, rejection tags, terminal Taylor fill, and counter exclusions from shaders.
- [x] 3.4 Remove Super Pixel-specific pipelines, bind groups, dispatches, wakeups, timestamp slots, engine flags, statistics, and debug views/legends.
- [x] 3.5 Re-audit raw layer allocation and delete only payload layers proven unused by adaptive/analytic AA and the planned cached-geometry change.
- [x] 3.6 Verify live/frozen min-step selection and merge still distinguish exact step-1 data from temporary bilinear support.

## 4. Adaptive AA and shader arithmetic

- [x] 4.1 Remove AA preconditions tied to configurable brush/refinement steps and keep selective reseed as exact step-1 requests.
- [x] 4.2 Verify manual/auto AA remains dormant during ordinary convergence, starts only after convergence, and aborts cleanly on interaction.
- [x] 4.3 Remove `shader-f16` feature negotiation, color-shader source variants, pipeline branches, and the `?f16=off` override.
- [x] 4.4 Keep shader arithmetic f32 while preserving independently justified 16-bit storage formats such as the AA accumulator.

## 5. UI, persistence, and documentation cleanup

- [x] 5.1 Remove zoom brush step and sentinel seed step controls, validation, defaults, events, and engine properties.
- [x] 5.2 Stop reading/writing their browser-storage keys and confirm stale stored values are ignored without startup errors.
- [x] 5.3 Remove Super Pixel controls, obsolete debug descriptions, performance help text, and documentation references.
- [x] 5.4 Update renderer documentation to describe temporal adaptive batching plus temporary bilinear resolve as the sole ordinary progressive model.

## 6. Verification

- [x] 6.1 Run focused WGSL/static checks and TypeScript/Vue type checking; confirm removed bindings, constants, imports, and shader entry points leave no dead references.
- [x] 6.2 Exercise non-Playwright regression checks for reset, continuation, no-data resolve, counter completion, AA state transitions, and stale local-storage values.
- [ ] 6.3 With explicit user approval, compare visual behavior for initial render, deep convergence, pan, zoom reprojection, frozen/live merge, orbit effects, and adaptive AA.
- [ ] 6.4 With explicit user approval, measure iteration, resolve, color, first-frame, and steady-state GPU timings separately and document whether the reported 6–7 ms refinement cost is actually removed.
- [ ] 6.5 Compare the former f16 and unified f32 arithmetic paths on the target GPU before deleting the validation flag, and record any performance or image delta separately from texture-storage precision.
