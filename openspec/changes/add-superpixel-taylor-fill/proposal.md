## Why

The progressive renderer already refines on a dyadic anchor lattice: `refine_sentinel` halves the resolution step, newly aligned texels become anchors and are computed, and every texel in between is filled by bilinearly interpolating the four corner anchors of its grid cell. That fill is a placeholder — always discarded and recomputed at the next level — and the loop only stops at step 1, where **75 % of all pixels live**. Nothing lets the refinement terminate early, because nothing bounds the error of the fill.

Meanwhile every escaped pixel already carries a Taylor payload in `c` — `z`, `z′`, `z″` in raw layers 8–12 — computed for analytic antialiasing and spent only on sub-pixel samples. The same payload continues a pixel to its neighbours, not just to its own sub-samples.

A CPU census (`reference_calculus/src/reach.rs`) measured how far that continuation stays inside a relative tolerance of 1e-3, at view half-height σ = 1e-3:

| view | median reach | ≥ 1 px | ≥ 4 px | ≥ 16 px |
|---|---:|---:|---:|---:|
| seahorse | 6 px | 66 % | 56 % | 22 % |
| elephant | 2.3 px | 60 % | 41 % | 12 % |
| misiurewicz | 7.5 px | 82 % | 63 % | 29 % |
| triple-spiral | 1 px | 50 % | 41 % | 24 % |

Because the last dyadic level is 75 % of the work, freezing a fraction `f` of the screen one level early saves `0.75·f` of the render.

**That ceiling is not yet believable, and this change is scoped around making it so.** The census measures the value channel only, at one shallow scale, using a proxy for the visible error. Two measurements decide whether the ceiling survives contact with reality, and they are gates on the work rather than by-products of it.

## What Changes

### Gate A — derivative-channel census (blocking, before any shader work)

`ẑ` is a second-order continuation, but the distance-estimate shading needs `ẑ′ = z′ + z″·δc`, which is only first-order and degrades as `δ²` instead of `δ³`. On the block tiers the derivative certificate is the binding constraint roughly half the time.

- Extend the census with the derivative reach, `½·|z‴|·ρ² ≤ tol·|z′|`, alongside the existing value reach.
- Report the **usable** reach `min(ρ_value, ρ_der)` and the share of pixels where the derivative binds.
- **Decision**: if the usable `≥ 4 px` share falls below roughly half the value-only figure, the ceiling collapses and Stage 2 is not worth building as specified.

Gate A failed on 2026-07-26: the derivative was limiting on every usable
sample, and the usable `≥ 4 px` share fell below the decision floor on all four
boundary views.

### Gate A2 — quadratic derivative census (approved follow-up, CPU only)

Before abandoning derivative-aware fill entirely, measure whether raising the
derivative continuation to the same order as the value channel restores useful
reach:

- Continue the derivative as
  `ẑ′ = z′ + z″·δc + ½·z‴·δc²`.
- Carry `z⁗` in the CPU census and report the resulting reach
  `⅙·|z⁗|·ρ³ ≤ tol·|z′|`.
- Recompute the usable reach `min(ρ_value, ρ_der2)` on the same four boundary
  views.
- **Decision**: shader work remains blocked unless the usable `≥ 4 px` share
  recovers to at least roughly half the value-only figure.

This follow-up does not select a GPU payload representation and does not relax
Gate B. It only determines whether a quadratic derivative model is
mathematically worth designing.

### Gate B — ν-branch census (diagnostic, before any shader work)

`ẑ` is continued at the **anchor's** escape iteration, and the smooth iteration is read from it by a log-log formula that extrapolates below bailout. That is established for sub-pixel offsets; over a whole cell, ν can move by several iterations and nothing says the extrapolation still holds.

- Measure the real thing: for a target at distance `d` pixels from an anchor, compare `ν` reconstructed from `ẑ` against `ν` from a full walk at that parameter.
- Report the median and tail of the ν error, the distance predicted by the
  `|z|`-relative criterion, and the behaviour when the target crosses an
  escape-iteration branch.
- **Decision**: use the census to characterize the approximation only. It SHALL
  NOT be converted into a claim that a colour error is invisible.

Gate B completed on 2026-07-26. The median crossing agreed with the proxy, but
3.01–4.22% of proxy-accepted pairs exceeded the matched ν budget; among
accepted pairs that crossed an escape-iteration branch, 93.66–99.67% failed.
The census therefore rejects the relative-`|z|` proxy as a universal quality
test. It also establishes that no palette-independent ν threshold can imply
visual indistinguishability: stop spacing is arbitrary and a `square` transfer
curve can introduce a hard jump. The 4096 palette texels are a storage
resolution, not a perceptual error budget.

### Stage 1 — analytic fill replaces bilinear

- Fill non-anchor texels from the nearest usable anchor's payload,
  `ẑ(δc) = z + z′·δc + ½·z″·δc²`, instead of bilinearly blending four corner
  values.
- Mark the escaped `z″` payload explicitly unusable when it was not tracked by
  the unified path. A numerically zero but valid `z″` remains usable.
- Apply the continuation only while `|ẑ|² ≥ μ` at the anchor's escape
  iteration. If the prediction crosses below bailout, retain the complete
  spatial resolve instead of extrapolating the smooth iteration across an
  escape-iteration branch.
- Keep distance height and derivative angle from the existing spatial resolve.
  The first-order continuation `ẑ′ = z′ + z″·δc` is not used by this
  correctness-first prototype because Gate A rejected its reach.
- Keep the existing bilinear treatment for channels that are not analytically
  continuable, such as orbit averages. This is a channel fallback, not a
  palette-dependent acceptance test.
- Fall back to the complete existing bilinear resolve when no usable Taylor
  payload exists.

Gate A2 showed that a quadratic derivative would be mathematically worthwhile,
but it needs a GPU representation of `z‴`. The first visual prototype does not
add that representation: derivative and relief shading remain spatial, and the
rendered comparison decides whether that follow-up is worth its cost.

### Stage 2 — opportunistic terminal Taylor coverage

- Keep the ordinary dyadic sentinel scheduler and its integer pixel anchors.
- Evaluate Taylor coverage in the normal resolve after every iteration pass.
- Encode a successful Taylor-covered sentinel in the already produced resolved
  step channel. On the next frame, the fused brush/iteration kernel SHALL keep
  that raw sentinel untouched and exclude it from unfinished work.
- A sentinel without a usable Taylor candidate remains a bilinear temporary
  preview and continues through the ordinary dyadic refinement.
- A raw computed pixel always wins over the previous frame's coverage marker.
- Choose the best usable candidate among the escaped corners by normalized
  Taylor distance. Do not blend Taylor predictions.
- Remove the global freeze step, the failed-cell bitset, the local Taylor
  refinement pass and the CPU/GPU feedback cycle. Taylor coverage SHALL NOT
  serialize additional Auto waves after the ordinary progressive pass.
- Do not inspect palette stops, palette period, transfer curves, textures or
  lighting. Keep analytic AA disabled while terminal Taylor approximations are
  present.

This replaces the earlier adaptive diagnostic freeze. It deliberately keeps
anchor geometry on the pixel grid; randomized or off-grid anchor placement is
deferred until the cost and coverage of this simpler architecture are measured.

### Deferred work

Perceptual palette analysis, residual calibration, certification, and a runtime
`z‴` payload remain deferred. Local refinement is driven only by whether the
implemented Taylor value path is structurally usable.

## Capabilities

### New Capabilities

- `superpixel-analytic-fill`: continuation of a computed anchor's value to the
  texels of its grid cell from the stored Taylor payload, while derivative and
  relief channels retain the spatial resolve.
- `progressive-early-termination`: opportunistic terminal coverage of
  sentinels that admit the Taylor value continuation, while uncovered
  sentinels keep refining normally.

### Modified Capabilities

- `progressive-render-pipeline`: the normal sentinel refinement reads the
  previous resolved Taylor-coverage marker and skips only covered sentinels;
  the resolve gains analytic continuation without a palette-dependent decision.

## Impact

- `reference_calculus/src/reach.rs`: gains the derivative-channel reach and the ν-error census (Gates A and B). These land first and can invalidate the rest.
- `src/assets/resolve.wgsl`: the sentinel fill path gains Taylor continuation of
  the value; bilinear stays as the fallback for cells without a usable payload,
  for branch-changing predictions, and for derivative/relief channels.
- `src/assets/mandelbrot_brush.wgsl`: reads the preceding resolved step marker
  before refining a sentinel and excludes covered sentinels from counters.
- `src/Engine.ts`: keeps resolve active for Taylor sentinels, binds the previous
  resolved texture to the fused kernel, and removes all Taylor feedback
  scheduling and local-refinement resources.
- `src/components/Settings.vue`: exposes one experimental opportunistic-Taylor
  toggle for A/B comparison.
- `lean-proofs/`: untouched.
- No change to the raw texture layout, no worker protocol change and no extra
  per-pixel GPU allocation. The resolved step channel carries the coverage
  marker.

## Non-goals

- Any estimate of palette change or claim of visual indistinguishability.
- Certification or a tolerance-based local acceptance test.
- Deep-zoom guarantees ahead of measurement. Stage 1 exists partly to obtain them.
- Interior pixels. Only escaped texels carry a payload; interior cells keep refining as today.
- Any change to the block-table tiers, the reference builder, or the AA machinery beyond reading the payload they already produce.
