## Context

The renderer is itself a progressive loop: it converges per-pixel state across many GPU frames using a sentinel/history mechanism over a neutral square texture (8-layer `r32float` MRT). AA wraps a second progressive loop around it — each AA sample is a full re-convergence at a jittered sub-pixel offset.

Key existing facts that shape the design (verified against the code):

- `mandelbrot.cx/cy` (WGSL) == `mandelbrot.dx/dy` (TS): the float32 pan offset relative to the arbitrary-precision center, used in `x0 = local_rot.x*scale + cx`. **Must not be mutated** for jitter — they feed reprojection delta-tracking (`Engine.ts` ~1756/2046).
- The reference orbit / BLA table is anchored at the high-precision center and is unaffected by sub-pixel jitter — no recompute per sample.
- The Mandelbrot uniform struct's free slots are indices **18/19** (`_padding2`/`_padding3`). Index 17 is `scaleExp`, actively used on the floatexp deep path — it must not be reused.
- The per-pixel **distance estimate is already computed and persisted**: layer 4 stores `distance_height = clamp(-log(DE_texels), -64, 64)` for escaped pixels (`mandelbrot_brush.wgsl:220`). High height ⇒ near boundary; the ±64 clamp pre-saturates the two smooth extremes (deep interior, far exterior) to the floor.
- Pixel-state convention (layer 0): `iter == -1` = compute request (fresh computation), `iter == 0` = inside, `iter > 0` = escaped/continuation, `iter < -1` = resolution sentinel. Stamping `iter = -1` triggers full fresh re-computation from the jittered `c` (`mandelbrot.wgsl:876/928`) — no manual z/dz reset needed.
- AA frames have `shift == 0` and `clearHistory` off, so they run on the **in-place fused path** (`useInplacePath`, `Engine.ts:2340`), which is strictly texel-local — a perfect fit for a texel-local selective reseed.
- The color pass currently renders `color.wgsl` directly to the swapchain (`this.format`), no intermediate texture.

## Goals / Non-Goals

**Goals:**
- Idle-time, explicitly-triggered AA that progressively sharpens a converged view.
- Gamma-correct (linear-space) averaging.
- Distance-estimation-driven adaptive sample counts so quality concentrates on the boundary.
- Selective reseed so adaptive sampling also cuts wall-clock, not just over-blur.
- Instant, stale-free abort on any interaction.
- Single-sample / AA-inactive output stays byte-identical to today.

**Non-Goals:**
- Automatic/continuous AA (always opt-in).
- Spatial supersampling (rendering at higher resolution) — rejected, see Decisions.
- Color-gradient-based sample targeting (geometric DE only for v1).
- Changing the PNG export path's quality or format.
- AA under coarse minimum grid steps (`zoomMinBrushStep > 1`) — out of scope.

## Decisions

### Temporal jitter accumulation over spatial supersampling (SSAA)

Average N serial jittered full renders rather than one render at N× resolution.

- **Why:** the 8-layer MRT raw texture makes SSAA's VRAM cost prohibitive (2× resolution ≈ 4× the footprint of the largest textures). Temporal reuses the existing pipeline almost entirely, degrades gracefully (any prefix of the R2 sequence is a valid low-discrepancy set → stop-anytime is free), and gets the tent reconstruction filter for free via jitter importance sampling.
- **Alternative considered:** SSAA — simpler conceptually, single converge, but quadratic VRAM and an all-or-nothing wait incompatible with deep-zoom convergence times.

### Accumulation alpha channel as per-pixel sample counter

Each accepted sample adds `(linearRGB, 1.0)` to the `rgba16float` accumulator; the present pass divides `rgb / max(alpha, 1)`.

- **Why:** turns the global average into a per-pixel average for free, which is exactly what adaptive counts need. `alpha` is each pixel's personal sample count. Also makes stop-anytime per-pixel-correct.
- **Headroom:** 16 × linear[0,1] = 16.0, far under fp16 max (65504); ulp at 16 ≈ 0.016, /16 ≈ 0.001 linear — invisible at 8-bit.

### Distance height (layer 4) as the sampling oracle, baked once

After sample 0 converges, a tiny pass reads layer 4 and writes a single-channel `aaTargetTexture` (`r32float`): `target = clamp(round(ramp(height)), 1, antialiasLevel)`, with interior pixels (`iter == 0`) forced to `target = 1`. Reused for all subsequent samples.

- **Why:** the oracle is already computed every frame for relief shading — no new hot-loop math. Sub-pixel jitter barely moves DE, so bake-once is correct and simpler than recomputing per sample. The ±64 clamp conveniently saturates both smooth regimes to the floor; the AA-relevant band (`height ∈ [0, ~3]`) is far from the clamp. The ramp is increasing in `height` (= `-logScreenDistance`).
- **Alternative considered:** recompute target from layer 4 each reseed (saves one small texture, but couples the predicate to layer-4's escaped-vs-inside ambiguity every frame).

### Unified predicate `n < target` for both reseed and accumulation

A pixel with target `T` accumulates samples `0..T-1`. At sample `n` it both (a) is reseeded/recomputed and (b) contributes to the accumulator iff `n < target`. One source of truth.

### Selective reseed = stamp `iter = -1` on the active sliver only

Because AA runs on an already-fully-refined grid (step 1, every pixel genuine), recomputing a pixel reduces to stamping `iter = -1` on layer 0; the existing fresh-computation branch reinitializes it from the jittered `c`. Frozen pixels (target `<= n`) keep all 8 layers untouched and are skipped by the existing pass-through path. No grid refinement, no resolve, no `clearHistory`.

- **Why this is the whole win:** the iteration pass dominates cost, and the boundary is a fractal curve (measure ≈ 0). Total cost ≈ area-weighted mean sample count ≈ 1.5–2.5 full converges for "16×" AA where ~5% of pixels are near the edge — vs 16× for uniform temporal AA. Crucially, DE is anti-correlated with bulk cost: the expensive set interior is smooth (target 1) and is never re-iterated.
- The reseed is texel-local, so it fuses into the in-place path: an `aaSampleIndex` uniform + `aaTargetTexture` binding, applied only on the first frame of each sample.

### Conditional present pass (direct path when AA inactive)

Reuse `color.wgsl`'s planned `fs_main_direct` as the live default: when `aaActive == false`, render direct to swapchain (today's path, byte-identical, zero tax). Only switch to accumulate→present while `aaActive`.

- **Why:** avoids a permanent per-frame present-pass + fp16-roundtrip tax for users who never use AA, and keeps level-1 output byte-identical (no Playwright baseline churn).
- **Alternative considered:** always-on present (simpler, one path) — rejected for the perpetual tax and guaranteed baseline regeneration.

### Resolved tuning decisions

- **Ramp on actual pixel distance, not raw `height`.** The stored `height = ln(scale/DE_world)` carries a screen-size-dependent offset (`DE_world/scale` is in half-screen-height units), so a fixed `height` ramp covers a huge, resolution-dependent band. Instead recover the true boundary distance `de_px = (H/2)·exp(-height)` (H = device-pixel screen height, passed into the bake; 1 neutral texel == 1 device px) and ramp `1 - smoothstep(R_FULL, R_OUT, de_px)` with `R_FULL = 1px`, `R_OUT = 6px`. Full sample count within ~1px of the boundary, tapering to 1 sample by ~6px — a thin, resolution-independent ring (the earlier `smoothstep(-1,2,height)` was wrong: it sampled most of the screen).
- **Default `antialiasLevel` is fixed (not depth-adaptive).** One default level regardless of zoom; at deep zoom the user manages cost manually via the slider. Keeps "how much AA" explicit and predictable rather than silently shrinking with depth.
- **Termination: per-pixel target cap = `antialiasLevel` (N), with N as a ceiling.** Accumulation runs until every pixel reaches its target *or* the user interrupts, whichever comes first. Because per-pixel targets are capped at N, accumulation terminates naturally at N (early when no pixel still wants more — see selective-reseed early termination). There is no unbounded/"infinite" mode; interruption at any point leaves a valid per-pixel average (the alpha-as-counter design guarantees this).

### Suppress freeze/merge during AA

With selective reseed, frozen pixels keep their value and the present pass shows the stable running average during reconverge — there is no flicker to hide, so freeze/merge snapshot passes are suppressed while `aaActive`.

### Staged delivery (A then B)

- **Stage A (quality):** per-pixel alpha + DE-gated accumulation, but full reconverge every sample (no selective reseed). Validates the DE→target mapping and the linear/present plumbing. Small delta, no convergence-core changes.
- **Stage B (speed):** selective reseed unlocks the ~8× wall-clock win. Touches the in-place path's reseed and freeze/merge suppression.

## Risks / Trade-offs

- **Accumulator over-count if the additive blend isn't convergence-gated** → composite into the accumulator ONLY on the fully-converged frame of each sample; on intermediate frames touch nothing (present keeps showing the last average). The increment and the additive write share the single `fullyConverged && n < target` gate.
- **Uniform index off-by-one** (index 17 = `scaleExp` is live on the deep path) → use indices 18/19 (`_padding2`/`_padding3`).
- **Assumes grid step 1** → adaptive AA requires `zoomMinBrushStep = 1`; coarser minimums leave resolution-copied pixels and are declared out of scope.
- **DE covers geometric edges only** (not color/stripe aliasing) → accepted for v1; a screen-space color-gradient term is a possible future upgrade to the ramp.
- **Stale metric layers on reseed** (layers 6/7 stripe/avgDir) → verify the `is_compute_request` branch fully reinitializes them so no stale value leaks.
- **`activePixelCount` semantics during AA** → must reflect only the active boundary sliver so per-sample completion detection fires correctly; first thing to test.
- **fp16 additive blend support** → universally expected in WebGPU but verify on first run.
- **Playwright visual baselines** → the conditional direct path should keep level-1 identical; confirm, and regenerate only if needed.

## Migration Plan

Additive feature behind an explicit trigger; no data migration. Rollback = leave the AA control unbound / `triggerAaAccumulation()` unused — the conditional present keeps the direct path so behaviour reverts to current. Ship Stage A first (low risk), then Stage B.

## Open Questions

All three prior tuning questions are resolved (see "Resolved tuning decisions"): wider smoothstep ramp over `height ∈ [-1, 2]`; fixed default `antialiasLevel`; N as a per-pixel ceiling with interruption always honored. Remaining unknowns are implementation-level (exact smoothstep edge values, default level value) and best settled empirically during Stage A.

## D-contrast — contrast-driven target fused with DE (2026-07-06, user-validated)

The DE ramp predicts only GEOMETRIC aliasing (proximity to the set); every
palette-space contour escapes it (short palette periods, zebra parity, stripe
average, orbit traps, texture mapping, relief speculars), and interior texels
are clamped to 1 sample today (the interior side of the boundary never
supersamples). Decision: fuse three predictors IN TARGET SPACE via max —

    target = max( ramp_DE(de_px),                    // sub-pixel geometry
                  ramp_sobel(|∇luma| of sample-0),   // palette/shading edges
                  level · (phase_freq > Nyquist) )   // moiré saturation

- Max in target space, not magnitude space: the predictors have no common
  scale; each maps to a sample count through its own ramp first.
- The Sobel reads the CONVERGED, COLORIZED sample-0 (the accumulation texture
  right after the first composite — linear RGB at screen res), projected back
  to neutral texels with the inverse of shade_srgb's screen→neutral mapping.
- Sobel alone is insufficient: contrast-adaptive sampling only sees aliasing
  visible at 1:1 — a filament thinner than a pixel that fell between samples
  has no local contrast; the DE ramp keeps covering those. Complementary, not
  substitutive.
- Moiré saturates instead of ramping: past Nyquist (|∇ν|·2/palettePeriod ≳ 1
  per screen pixel) edge magnitude under-reports the aliasing (it shows as
  low-frequency false structure); the correct output is the palette mean,
  which only the full sample budget approximates.
- Rebake on any coloring-param change is ACCEPTED (user decision): AA is
  idle-time and already restarts on param changes; palette animations simply
  restart accumulation more often.
- Orthogonality to unify-jet-table-dispatch Phase D: the analytic tags decide
  HOW a subsample is produced (Taylor expansion vs re-iteration), the target
  decides HOW MANY. A contrast-flagged, margin-OK escaped pixel accumulates
  analytically — near free — so this widens the analytic path's useful zone
  beyond the DE band where margins fail ~99 % shallow.

### D-contrast — shipped (2026-07-06), measured numbers

Implementation landed (aa_target.wgsl fused bake, 16-float shared AaParams,
accumTexture bound to the bake, `Engine.aaContrastEnabled` toggle). Referee
(`tests/adaptive-aa-contrast.spec.ts`, palettePeriod 0.2, intro view, 8×):
DE-only eligible 48 103 texels → fused 151 152 (×3.1); DE ring preserved;
zero GPU errors. The synergy with unify-jet-table-dispatch Phase D measured
directly: 61 % of the widened band is analytic-tagged (only 58 331 of 151 152
re-iterate) — Taylor margins pass off-boundary, so contrast-flagged texels
accumulate near-free under auto mode. Interplay decision: the Phase D referee
(tests/analytic-aa.spec.ts) pins aaContrastEnabled = false to keep refereeing
the DE-band expansion in isolation. Remaining: 10.6 field round (deep moiré
views, interior-boundary quality, EDGE_LO/HI + Nyquist threshold tuning).
