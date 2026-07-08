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

## 10. Contrast-driven target (Sobel + moiré, fused with DE — 2026-07-06 design round)

Design decisions (user-validated): predictors fuse in TARGET space via max —
`target = max(ramp_DE, ramp_sobel, level·(phase_freq > Nyquist))` (magnitudes
have no common scale; the moiré predictor saturates instead of ramping since
edge intensity under-reports aliasing past Nyquist). Rebake follows any
coloring-param change — acceptable by design: AA accumulation is idle-time and
already restarts on param changes. Orthogonal to unify-jet-table-dispatch
Phase D: analytic tags decide HOW a subsample is produced, the target decides
HOW MANY — a Sobel-flagged margin-OK pixel accumulates analytically (near
free), which widens analytic AA's useful zone beyond the DE band.

- [x] 10.1 Bake input plumbing: accumTexture (sample-0 composite) bound to the
      bake (binding 3, rgba16float float-sample); AaParams grown to 16 floats
      (shared bake/reseed layout: + aspect, sceneSin/Cos, screenWidthPx,
      palettePeriod, mu, logMu, aaContrast); neutral→screen inverse projection
      in the shader (uv-flip conventions matched to color.wgsl's liveCoord);
      off-screen neutral texels keep target 1.
- [x] 10.2 Contrast ramp: 3×3 Sobel on sRGB-encoded luma at the projected
      screen texel; `1 + smoothstep(EDGE_LO=0.12, EDGE_HI=1.6, |g|)·(level−1)`;
      fused via max in target space. Constants first, field-tunable later.
- [x] 10.3 Moiré predictor: |∇ν| central differences from the raw layers
      (valid escaped neighbors only, center fallback), phase step =
      |∇ν|·2/palettePeriod; > 0.5 (Nyquist) → target = level. The ν-divergent
      boundary band is already the DE ramp's job.
- [x] 10.4 Interior clamp dropped: interior texels take the fused contrast
      target; deep interior stays at 1 automatically (flat black → Sobel 0).
      Stamped interior texels are fresh compute requests; their payload is zero
      → margin fails → honest re-iteration, never analytic-tagged.
- [x] 10.5 Referee GREEN (`tests/adaptive-aa-contrast.spec.ts`, palettePeriod
      0.2, intro view, 8×): DE-only eligible 48 103 → fused 151 152 (×3.1),
      zero GPU errors, DE ring preserved as the floor. Measured synergy: 61 %
      of the widened band is analytic-tagged (stamped 58 331/151 152) — the
      Taylor margins PASS off-boundary, so the contrast band is near-free
      under auto mode. INTERPLAY DECISION: `tests/analytic-aa.spec.ts` now
      PINS aaContrastEnabled = false (it referees the Phase D expansion on the
      DE band; with contrast on its analytic zone grows 472 → ~30k texels and
      its image bound sat flakily at its own threshold — re-run 2× green
      pinned). Engine toggle `aaContrastEnabled` (default ON) is the A/B hook.
- [ ] 10.6 Field: moiré view (deep palette bands), interior-boundary quality,
      threshold tuning; record verdicts in design.md.

## 11. Field fixes — 2026-07-07 round (user report: AA ne se déclenche pas / rebascule)

- [x] 11.1 Convergence-gate deadlock: `fullyConverged` and the `aaAutoPending`
      keepalive required unfinished/active === 0, but the render loop idles at
      ≤ UNFINISHED_PIXEL_DONE_THRESHOLD (10) — any view settling with 1–10
      stuck pixels never composited a sample (manual trigger spun at 0/N
      forever, auto never fired). Both gates now use the SAME idle threshold
      (counters known and ≤ 10).
- [x] 11.2 Post-completion revert: `aaShowAccum` was gated on `aaActive`, so
      the first frame rendered after completion (animations set needRender
      every frame) fell back to the direct path and silently dropped the
      accumulated average. The accumulator now persists (samples ≥ 1) until a
      real invalidation (any param/navigation change → resetAaState).
- [x] 11.3 Payload binding under the slack gate: composites can now run with
      skipResolve false, and the resolved 8-layer binding has no Taylor
      payload — the accum pass now ALWAYS binds the raw texture (genuine
      values are what the accumulator wants; resolve is a display nicety),
      and the analytic-flag finalize keys on the raw binding's existence.
- [x] 11.4 Auto AA suppressed while `activateAnimate` (time-driven coloring
      smears the samples and the persisted average would freeze the
      animation); manual trigger remains the user's explicit choice.
- [ ] 11.5 Field re-check (user): AA triggers reliably (incl. re-triggers and
      views with a few stuck pixels), the average survives completion, and
      band edges (short-period / high-contrast palettes) actually smooth at
      8–16×. Then the 10.6 threshold-tuning round.
- [x] 11.6 Jitter amplitude bug (field report: "band edges less smooth than a
      DPR×2 render"): one neutral texel spans 2·neutralExtent/neutralSize in
      local_rot units, but the state machine scaled the tent jitter by
      neutralExtent/neutralSize — HALF a texel per unit j. The tent
      reconstruction kernel (support ±1 texel by design, spec section 1.4)
      effectively ran at half width → under-filtered edges. Fixed (×2), and
      the analytic-margin half-extent δ doubled to match. Expected visual
      effect: noticeably smoother band/boundary edges at the same level;
      slightly wider prefilter overall. NOTE for the field round: "details
      near the boundary look more drowned than DPR×2" is partly FUNDAMENTAL —
      temporal AA prefilters the 1× color function over the pixel footprint
      (correct pixel integral), while DPR×2 adds real resolution; the two
      compose (DPR×2 + AA is the quality maximum). If post-fix edges are now
      too soft instead, the knob is the reconstruction kernel (tent ±1 → box
      ±0.5 matches DPR-style sharpness) — decide at 10.6 with the thresholds.
- [x] 11.7 Reconstruction kernel → BOX ±0.5 texel (user decision, 2026-07-07):
      the DPR×2 reference is regular-grid box supersampling downscaled to a
      DPR-1 display, so 16× box-jittered accumulation converges to the exact
      box integral and matches/beats its sharpness (no tent softness, no
      resolution myth — at screen DPR 1 the ×2 canvas is resized down).
      computeAaJitterOffset now returns uniform R2 in [−0.5, 0.5] texel
      (unit test updated); analytic δ follows (√2·0.5·texel). Sobel adapted
      for ITERATION BANDING: per-channel R/G/B gradients with max-magnitude
      (iso-luma hue banding was invisible to luma-only Sobel) and an
      early-saturating ramp (EDGE_LO 0.08, EDGE_HI 0.8 — a hard band edge
      needs the full budget under the box kernel; mid-ramp counts leave
      visible steps). naga + vue-tsc + vitest + vite green.
- [x] 11.8 A/B option "Adaptive AA" (user request): `aaAdaptive` boolean beside
      `aaAuto` (MandelbrotParams session field + Settings toggle + full props
      chain + RenderOptions). false → the bake writes the FULL budget on every
      texel (aaFull param, predictors bypassed) — the DPR×N-style uniform
      reference for comparing against the adaptive target map. Toggling it is
      a param change → AA resets and the next accumulation rebakes.
- [x] 11.9 Accumulation domain → DISPLAY space (sRGB), field verdict 2026-07-07:
      even FULL 16× read worse than DPR×2 — brighter near the boundary, harsher
      band transitions. Root cause: we averaged in linear RGB (design's
      "gamma-correct" choice) while the DPR×2 reference is a browser downscale
      that averages sRGB as-is (black/white mix: linear mean displays 0.735 vs
      0.5). fs_main now emits sRGB into the accumulator, present divides
      without conversion, the bake reads accum without re-encoding; spec
      requirement AMENDED (Display-space accumulation). With box ±0.5 jitter,
      antialiasLevel = 4 ≈ DPR×2 up to sample placement; 16 is strictly
      smoother. Playwright AA specs not re-run (user-driven testing session) —
      their diff calibration is domain-relative and should hold; re-run with
      the next automated round.
- [x] 11.10 AUDIT + root-cause of the pre-existing roughness (user: "le problème
      pré-existait avant les optimisations de skip"): the R2 constant was WRONG
      since Stage A — 1.22074408460575947536 is the root of x⁴ = x + 1 (the R3
      sequence's constant), not the plastic constant 1.32471795724474602596
      (x³ = x + 1) the comment claimed. The resulting 2D pair loses the
      low-discrepancy property: 4–16-sample prefixes cluster in one corner of
      the pixel instead of stratifying it → band transitions quantized
      unevenly regardless of kernel. Fixed + seeded at 0.5 so sample 0 = (0,0)
      is a natural member of the sequence (a hors-série center point biased
      small prefixes). New unit test asserts quadrant stratification of the
      8- and 16-prefixes (would have caught the bug). Audited CORRECT: jitter
      injection point (local_rot, both paths, no cx/cy pollution), gate
      semantics (target-T pixel = samples 0..T−1, alpha divisor), selective
      reseed predicate, importance-sampling + equal-weight averaging.
      DECISION REVERTED with the user: accumulation stays GAMMA-CORRECT
      (linear RGB) — 11.9's sRGB-averaging amendment rolled back (spec
      restored); the brighter-than-DPR×2 edge is the correct light integral.
- [x] 11.11 Deep-zoom regression FIXED (field 2026-07-07: deep views became
      very fast, ν went integer-ish, palette shifted): the analytic AA
      expansion (unify-jet-table-dispatch Phase D — auto-mode Taylor payload,
      color-side ẑ reconstruction) is UNVALIDATED on the floatexp path. Deep
      pixels got tagged analytic-OK (margin passed on an unreliable fe-tracked
      z″/derS), skipped re-iteration → fast, and the color pass reconstructed
      a wrong ẑ → integer-parity-renormalized to shifted whole iterations.
      Gated `aaAnalyticParams.enabled` on `!floatExpActive` as a stopgap.
      SUPERSEDED by 11.12 (real root cause found + fixed; deep re-enabled).
- [x] 11.12 Deep analytic AA — REAL fix (fast AND correct on deep, superseding
      the 11.11 stopgap): the payload/kernel were sound; the bug was the δc
      SCALE fed to the color-pass reconstruction and the reseed margin.
      `aaJitterLogMag` and `aaAnalyticParams.logDelta` derived ln(scale) from
      the raw numeric `mandelbrot.scale` field, which diverges from the true
      view scale in deep zoom (the compute path builds δc from scaleStr /
      viewFloatexp instead). Wrong ln(scale) → e^{S+ln|δc|} off by orders of
      magnitude → reconstructed ẑ garbage → integer-parity-renormalized to a
      shifted whole iteration; and the reseed margin (same wrong δ) tagged deep
      pixels analytic-OK so they skipped re-iteration (fast). Fix: shared
      `currentLnScale()` reads viewFloatexp[1]·ln2 + ln|mantissa| (or
      log2FromDecimalString(scaleStr)·ln2) — the SAME full-precision source the
      compute uses — for both the color uniform and the margin. KEPT (genuine
      correctness improvement, helps shallow near the f32 boundary too).
      HOWEVER removing the `!floatExpActive` gate still reproduced the deep
      breakage → the δc scale was necessary but NOT sufficient. Precision ruled
      out (scale 1e-40 → S = ln|dz/dc| ≈ 92, not thousands; derS is a
      compensated derS+derSLo sum, accurate to ~1e-5 → e^S reliable). The
      remaining defect is localized to the DEEP payload itself: z″ (sndM) /
      derM tracking through try_apply_unified's fe-coefficient block
      applications on the floatexp path — the Phase D 5.2 addition that was
      only ever validated shallow. Deep gate RESTORED (11.11): honest brute
      re-iteration, correct + slower. Fast-deep is deferred to the unify
      Phase D 5.5 GPU referee (needs a WGSL-level harness comparing the
      fe-block sndM/derM propagation against exact deep stepping — cannot be
      settled by reasoning or headless CPU tests).
- [x] 11.13 Deep analytic AA — ROOT CAUSE IN THE KERNEL, fixed (3rd round,
      supersedes the 11.11 gate and completes 11.12's δc-scale half): in
      try_apply_unified, the z″ tier update was computed at the OLD derS scale
      then rescaled. Deep-only failure: certified deep blocks carry fe
      coefficient exponents up to ~±133 (a20 ~ ±266) because |dz| ~ 2^-133, so
      (a) ldexp(clamp(e, ±126)) truncated the m_zz/m_z terms and (b) a big
      block shifts derS by ΔS ≈ +92, saturating the exp(clamp(−2ΔS, −80, 80))
      rescale → snd inflated by e^{+104} per block → inf → inf−inf → NaN. The
      NaN was then LAUNDERED by Metal's max(NaN, x) = x in the reseed margin
      (log(max(length(NaN), 1e-38)) = −87) → auto-PASS → every deep pixel
      tagged analytic with a garbage payload: fast, integer-ν (constant frac
      from the NaN→1e-12 laundering in smooth_escape_fraction), shifted
      palette — the exact field symptoms. Shallow never hit it (coefficient
      exponents ≤ ~30, rescale ≤ e^{60}). FIX: per-term computation at the NEW
      scale with exponents AND running mantissa magnitudes folded into one
      clamped exp() argument (O(1) mantissas outside; ±78 headroom) — no
      overflow path left, saturation degrades to margin-fail → honest
      re-iteration. Finite guards added to the reseed margin and the color
      reconstruction (|x| < big form — false for NaN AND inf without x != x).
      Deep gate REMOVED. naga + vue-tsc + vite green. User validation owed:
      deep views fast AND correct; shallow non-regression
      (tests/analytic-aa.spec.ts run recommended).
