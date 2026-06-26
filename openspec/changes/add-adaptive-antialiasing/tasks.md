# Tasks

Staged delivery: Sections 1–6 are **Stage A** (quality: per-pixel adaptive accumulation, full reconverge per sample). Sections 7–8 are **Stage B** (speed: selective reseed). Section 9 verifies both.

## 1. Jitter plumbing (uniforms + math)

- [x] 1.1 Add `aaOffsetX`/`aaOffsetY` (`f32`) to `struct Mandelbrot` in `mandelbrot.wgsl` and `mandelbrot_brush.wgsl`, replacing `_padding2`/`_padding3` (indices **18/19** — NOT 17, which is `scaleExp`)
- [x] 1.2 Update `x0`/`y0` in both shaders: jitter injected at the shared `local_rot` definition so it flows into both the deep `dc` and f32 `x0/y0`
- [x] 1.3 In `Engine.ts` uniform write, set indices 18/19 to `this.aaOffsetX`/`this.aaOffsetY`
- [x] 1.4 Add `computeAaJitterOffset(sampleIndex)` to `src/Mandelbrot.ts` (R2 sequence with `phi = 1.22074408460575947536`, tent warp), with a unit test for index 0 → {0,0} and bounded ±1 range

## 2. Linear-space color path

- [x] 2.1 Add `srgb_to_linear` / `linear_to_sRGB` helpers to `color.wgsl`
- [x] 2.2 Convert the color return sites to emit linear RGB in `fs_main` (done via `shade_srgb()` refactor — single linear conversion in the `fs_main` wrapper)
- [x] 2.3 Add `fs_main_direct` entry point = current unmodified (sRGB, no roundtrip) logic for the export/direct path

## 3. Accumulation + present passes

- [x] 3.1 Allocate `accumTexture`/`accumTextureView` (`rgba16float`, `RENDER_ATTACHMENT | TEXTURE_BINDING`) in `resize()`; reset AA counters there (`resetAaState()`)
- [x] 3.2 Add `present.wgsl`: fullscreen pass, `textureLoad(accumTex)`, divide `rgb / max(alpha, 1)`, `linear_to_sRGB`, output to swapchain
- [x] 3.3 Create `pipelinePresent` + `bindGroupPresent` (no `uniformBufferPresent` needed — per-pixel alpha is the divisor)
- [x] 3.4 Create `pipelineColorAccum` (rgba16float, additive blend on color AND alpha), `pipelineColorAccumClear` (sample 0 replace), and direct path (`pipelineColor` → `fs_main_direct`, `this.format`)

## 4. AA state machine (full-reconverge, Stage A)

- [x] 4.1 Add fields `aaActive`, `aaSampleIndex`, `aaAccumulatedSamples`, `aaOffsetX`, `aaOffsetY` (+ `aaReseedPending` for Stage B)
- [x] 4.2 Add public `triggerAaAccumulation()` (sets active, resets counters, `needRender = true`)
- [x] 4.3 Compute `fullyConverged` in `render()` from existing flags (no clearHistory/freeze/merge, no active zoom, orbit complete, 0 unfinished, 0 active, no pending counter readback)
- [x] 4.4 Composite into the accumulator ONLY on the converged frame: sample 0 → clear-write (`pipelineColorAccumClear`), sample ≥1 → additive (`pipelineColorAccum`); on non-converged frames touch nothing
- [x] 4.5 On converged frame, advance: increment counters, compute next jitter, set `clearHistoryNextFrame` for next sample; stop when target reached (`aaActive = false`)
- [x] 4.6 Add present pass (Pass 4) while AA active; route color to `accumTextureView`

## 5. Conditional present + abort

- [x] 5.1 When `aaActive == false`, render color direct-to-swapchain via `fs_main_direct` (byte-identical legacy path, no accum/present)
- [x] 5.2 In `update()`, after computing `mandelbrotChanged`/`renderOptionsChanged`, reset all AA state (instant single-sample fallback)
- [x] 5.3 Add `aaActive` condition to `needsMoreFrames()` (`reason = 'aaAccumulating'`)
- [x] 5.4 Snapshot/export pass already uses `pipelineColor` (now the direct `fs_main_direct` path), so export is unaffected

## 6. Adaptive target map (Stage A quality)

- [x] 6.1 Allocate `aaTargetTexture` (`r32float`, neutral-space single channel, STORAGE+TEXTURE) in `resize()`
- [x] 6.2 Add a one-shot bake pass (`aa_target.wgsl`) after sample 0 converges: read layer 4 (distance height), write `target = clamp(round(ramp(height)), 1, antialiasLevel)`, force `target = 1` for interior (`iter == 0`) pixels
- [x] 6.3 Gate the accumulate pass per-pixel: `shade_srgb(.., applyAaGate)` discards iff `aaSampleIndex >= target` (in `fs_main` only); present divides by per-pixel alpha. Required for correctness (else early-finishing boundary pixels over-weight their last sample)
- [x] 6.4 Ramp on true pixel distance `de_px = (H/2)·exp(-height)` (resolution-independent), `1 - smoothstep(R_FULL=1px, R_OUT=6px, de_px)` — full samples within ~1px of the boundary, tapering to 1 by ~6px. (Earlier `smoothstep(-1,2,height)` was wrong — sampled most of the screen.)

## 7. Selective reseed (Stage B — speed)

- [x] 7.1 Implemented as a **separate one-shot reseed compute pass** (`aa_reseed.wgsl`) rather than fusing into the hot in-place shader — lower risk, equivalent result. Binds `aaTargetTexture` + shared `AaParams` (carries `aaSampleIndex`) + raw storage view
- [x] 7.2 Reseed stamps `iter = -1` on texels with `target > aaSampleIndex` (the sliver); frozen texels get no store (value preserved). The in-place pass then reconverges only the sliver
- [x] 7.3 Replace per-sample `clearHistoryNextFrame` with the reseed trigger (`aaReseedPending`); `clearHistory` stays off during AA. Toggle `useAaSelectiveReseed` falls back to full reconverge
- [~] 7.4 Relies on the existing `is_compute_request` fresh-compute branch to reinitialize z/dz/ref_i (per design) — **needs hardware confirmation** that metric layers 6/7 don't leak
- [~] 7.5 By construction only the `iter=-1` sliver is active after reseed, so `activePixelCount` tracks it — **confirm on hardware** (the taper across samples)

## 8. Idle integration for selective reseed

- [x] 8.1 Suppress the orbit-complete freeze+clearHistory trigger while `aaActive` (would clobber reseed); zoom-stop merge can't fire at idle
- [~] 8.2 `skipResolve` not force-enabled during AA — resolve still runs on reseed frames but is a near-no-op (no resolution sentinels exist, only `iter=-1`). Left as a future micro-opt
- [~] 8.3 Early termination not implemented — loop runs to `antialiasLevel`; if max target < level the tail samples reseed zero pixels (cheap empty cycles). Optional perf follow-up (needs max-target readback)
- [x] 8.4 Guard: `zoomMinBrushStep > 1` falls back to full reconverge (selective reseed assumes grid step 1)

## 9. UI + verification

- [x] 9.1 `Engine.aaProgress` getter (`{ active, done, total }`) polled (150ms) in `MandelbrotViewer` into a reactive ref for the on-screen indicator
- [x] 9.2 `antialiasLevel` slider (1–16) in Settings Performance tab; on-screen "Render AA N×" button + "AA N/M" progress bar (bottom-center); **G** shortcut also triggers, **H** toggles selective reseed
- [ ] 9.3 `antialiasLevel = 1` / AA inactive: confirm output is byte-identical to current `main` (screenshot diff)
- [ ] 9.4 `antialiasLevel = 8`: navigate to a detailed view, converge, idle → image progressively sharpens then settles
- [ ] 9.5 Pan/zoom mid-accumulation → instant revert to single-sample, no stale blended frame
- [ ] 9.6 PNG snapshot export still correct (direct path)
- [ ] 9.7 Verify Stage B speedup: boundary-only reconverge, frozen pixels not re-iterated (inspect `activePixelCount` taper across samples)
- [ ] 9.8 `npx playwright test` — regenerate visual baselines only if the linear roundtrip changed them
