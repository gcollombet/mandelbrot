## Context

Perturbation rendering iterates one high-precision reference orbit `Z_n` (Rust, `DBig`)
and, per pixel, a low-precision delta `z` driven by `c = δc`:

```
exact step :  z' = 2·Z_n·z + z² + c          (write A = 2·Z_n, B = 1)
full value :  w  = Z_n + z
rebasing   :  if |w| < |z|  →  z ← w ; m ← 0   (Zhuoran)
```

**BLA already ships.** A hierarchical power-of-two merge table (built in
`reference_calculus/src/lib.rs`, floatexp coefficients) replaces `l` exact steps with an
affine block `z ← A·z + B·c`, valid while `|z| < ε·|A|` (`ε ≈ 1e-6` in `f32`). The table is
consumed by **two** shader loops — shallow `f32` `try_apply_bla` (`mandelbrot.wgsl:256`)
and deep floatexp `try_apply_bla_deep` (`mandelbrot.wgsl:665`) — both gated by a per-entry
validity radius and an escape guard. The merge composition lives at `lib.rs:782-798`:

```
A_z = A_y · A_x                 # right = y (second block), left = x (first)
B_z = A_y · B_x + B_y
α_z = min(α_x, α_y / |A_x|)     # radius pullback;  R = α − β·|c|
```

**Padé [1/1]** (`MANDELBROT_PADE_IMPLEMENTATION.md` §3) replaces the affine block with a
rational one that reproduces the dropped `z²` exactly:

```
z ← (A·z + B·c) / (1 + D·z)     seed: A=2Z, B=1, D=−1/A
D_z = D_x + A_x · D_y           # Möbius composition (truncating higher-order c terms)
```

The source document derives the seed, the `D` composition, and the **single-step** radius
`√ε·|A|`. It leaves three things underived, each of which decides whether the feature
works. This design captures all three. Notation throughout: subscripts `x` (first block),
`y` (second), `z` (composed); `M = 1 + D·z`; `η` = a block's relative error.

The source doc's §6 pseudocode assumes an **on-the-fly accumulator** (greedy per-pixel
block extension). This codebase uses the **precomputed merge tree** instead (the doc's §5
"optional" path). That difference reframes Padé's value and simplifies its state, and is
threaded through the decisions below.

## Goals / Non-Goals

**Goals:**
- Derive the Padé **radius composition** through the merge tree, with an error bound and an
  implementable merge update.
- Derive the Padé **block derivative** (`der = dz/dc`) and bound the error of reusing the
  affine recurrence.
- Settle the **rebasing interaction**: can a block jump past a rebase; what happens to
  `der` and `D`.
- Record that the source doc's §4 "non-negotiable" invariants are already satisfied by the
  shipped architecture, so the novel risk surface is only §3.

**Non-Goals:**
- Implementation (shader/Rust/Engine). Mapped, not done.
- The hybrid-vs-abandon decision — empirical (§8 of the source doc).
- The difference-mode validation harness — separate change, recommended first step.

## Decisions

### D1 — Where Padé lives: merge table (Rust) + two shader paths, mode `'pade'`

Padé is **not** the source doc's §6 on-the-fly loop. It extends the existing merge-table
pipeline:

| Site | File | Change |
|---|---|---|
| seed | `lib.rs:758` | `D = −1/A`; radius `α = √ε·|Z|` (was `ε·|Z|`) |
| merge | `lib.rs:782-798` | carry `D_z = D_x + A_x·D_y`; radius per D3 |
| structs | `lib.rs:88` `BlaStep`, `lib.rs:1062` `BlaF64` | `+ dx, dy` (+ own exponent) |
| pack | `lib.rs:1089` `bla_f64_to_fe` | encode `D` in floatexp |
| shader struct | `mandelbrot.wgsl:60` | mirror `+ dx, dy` |
| shallow apply | `mandelbrot.wgsl:256` `try_apply_bla` | rational map + derivative (D4) + pole (D6) |
| deep apply | `mandelbrot.wgsl:665` `try_apply_bla_deep` | same, in floatexp |
| mode | `Engine.ts:263`, worker, Rust `use_pade()` | `'perturbation' | 'bla' | 'pade'` |

Consequence of the table architecture: **`D` is table state, not carried per-pixel state.**
Each block reads its `D` fresh from `mandelbrotBlaSuite[m]`. This eliminates the source
doc's §6 ambiguity of "what happens to the `Dcc` accumulator across a rebase" (D5).

### D2 — Seed and the engine of everything: `η_pad = η_aff²`

The exact step is `z' = A·z + c + z²`. Affine drops `z²`:

```
affine relative error :  η_aff = |z²| / |A·z| = |z| / |A|
```

Padé with `D = −1/A` reproduces `z²` exactly; expanding `(Az+c)/(1+Dz)` the leading error
term is `z³/A`:

```
padé relative error   :  η_pad = |z³/A| / |A·z| = (|z|/|A|)²  =  η_aff²
```

The **squaring** is the whole story. `η ≤ ε` gives `R_aff = ε·|A|`, `R_pad = √ε·|A|` — a
seed radius `1/√ε ≈ 1000×` larger. Everything downstream is a consequence of this square
law.

### D3 — Radius composition: `min` with a `√ε` seed (quadrature documented as the stricter alternative)

Composing a radius is two independent effects the affine `min` law conflates:
**(a)** geometric pullback of `y`'s domain bound onto `z_0` via `x`'s output, and
**(b)** accuracy: `x`'s error feeds `y`. The derivation:

**(a) Padé pullback = affine pullback (to `√ε`).** With `|D_x z_0| ≤ √ε ≪ 1`:

```
z_1 = (A_x z_0 + B_x c)/(1 + D_x z_0)
    ≈ A_x z_0 + B_x c − D_x z_0·(A_x z_0)     # correction is √ε-small on the main term
```

So the constraint `|z_1| ≤ R_y` pulls back to `|z_0| ≤ (R_y − |B_x||c|)/|A_x|`, **identical
to affine**. Therefore **`D` does not enter the radius** — the radius path needs only `A`,
the child radii, and `β`, exactly the state affine already stores. `D` is carried purely
for the *application* (D4).

**(b) Errors add; the square law turns `min` into quadrature.** The master relation (chain
rule + triangle, true for any block type) is `η_z ≈ η_x + η_y`. With the Padé square law
`η = (|z|/r)²` (where `r = R/√ε`) and `z_1 ≈ A_x z_0`:

```
η_z = |z_0|²·(1/r_x² + |A_x|²/r_y²)
                                          1        1     |A_x|²
⟹  Padé accuracy-radius composition :   ───  =  ───  +  ──────
                                         R_z²     R_x²     R_y²
```

With `P = R_x` and `Q = R_y/|A_x|` (the two affine constraints), this is the
reciprocal-quadrature `R_z = (P⁻² + Q⁻²)⁻¹ᐟ² = P·Q/√(P²+Q²)` — the smooth ("parallel
resistor") version of affine's `min(P,Q)`. Limits confirm consistency:

```
|A_x| → ∞ (expanding orbit, common deep case) :  R_z → R_y/|A_x|  = affine pullback
|A_x| → 0 (near orbit-zero, Bug-1)            :  R_z → R_x        = affine min branch
|A_x| ≈ 1 (flat / turning)                    :  ≤ √2 shrink per merge vs min
```

**Two philosophies — decision: ship `min` first.**

| | Merge law | Cost | Cumulative error |
|---|---|---|---|
| **A. `min` + `√ε` seed** | `min` **unchanged**, seed `α = √ε·|Z|` | one line | ~`L·ε` (as affine) |
| **B. quadrature** | `α = α_x·α_y/√(α_y² + |A_x|²·α_x²)` | a few lines | ~`ε` (bounded) |

`min` is positively homogeneous, so scaling every seed by `1/√ε` scales **every** composed
radius by exactly `1/√ε`: under philosophy A, **Padé's radius is uniformly `1/√ε ≈ 1000×`
larger than affine everywhere**, with no change to the composition law. This is not a free
lunch — the larger radius spends the `ε` error budget at larger `|z|` per block, covering
more iterations per block for comparable total error and **fewer blocks** (fewer
level-descents / exact steps near escape). Cumulative error stays `~L·ε`, the same order
affine already tolerates and rebasing cleans up.

**Decision:** implement philosophy **A** (matches the shipped affine philosophy, lowest
risk, one-line seed change + carry `D`). Move to **B** only if the difference-mode harness
shows cumulative-error artifacts in flat regions. Implementable merge delta:

```rust
// SEED (lib.rs:758) — only α changes (×√ε), plus D = −1/A
let alpha = epsilon.sqrt() * (zx*zx + zy*zy).sqrt();    // was: epsilon * |Z|
let (dx, dy) = cdiv64((-1.0, 0.0), (2.0*zx, 2.0*zy));   // D = −1/(2Z)

// MERGE (lib.rs:782-798), philosophy A — α/β lines UNCHANGED, add D:
let (adyx, adyy) = cmul64((left.ax, left.ay), (right.dx, right.dy));  // A_x·D_y
let dx = left.dx + adyx;
let dy = left.dy + adyy;
// left = x (first block) ⟹ A_x = left.a "before"; the tree form removes the
// source doc's §6 ordering trap automatically.

// MERGE, philosophy B (only if needed) — replace the min with:
let alpha = left.alpha*right.alpha
          / (right.alpha*right.alpha + a_left_abs*a_left_abs*left.alpha*left.alpha).sqrt();
```

### D4 — Block derivative: `der ← (A/M²)·der + B/M` is mandatory, not optional

`der = dz/dc` drives distance estimation (`DE = 2|w|·log|w|/|der|`) and feeds AA. The
existing recurrences are `der' = 2·w·der + 1` (exact step, `mandelbrot.wgsl:501`) and
`der' = A·der + B` (affine block, `mandelbrot.wgsl:295`). For a rational block
`z_out = N/M` with `N = A·z + B·c`, `M = 1 + D·z`, the derivative has two partials:

```
∂z_out/∂z = (A·M − N·D)/M² = (A − B·c·D)/M²      # the A·D·z terms telescope
∂z_out/∂c = B/M

der_out = (A − B·c·D)/M² · der_in + B/M
        ≈ A/M²·der_in + B/M                       # deep zoom: B·c·D ~ |c|/|A| negligible
```

`A/M²` is the **derivative of a Möbius map** — the local conformal stretch at the *actual*
operating point `z`, versus affine's constant `A = f'(0)` (the stretch at the centre).
Reusing affine `A` throws away exactly the curvature Padé paid to capture.

**Error of the affine shortcut inside a Padé block.** Within the validity radius
`|D·z| ≤ √ε`:

```
|A/M² − A| / |A| ≈ 2|D·z| ≤ 2√ε ≈ 2e-3
```

That is **~`1/√ε ≈ 1000–2000×` the `ε` value-error budget** the rest of the system is tuned
to. And it accumulates **coherently**: over `L` blocks the der ratio is `∏ 1/M_k²`, and the
log-error `−2·Σ Re(D_k·z_k)` is systematic, not cancelling, because (D3 pole corollary)
`|D·z| ≈ √ε` is a same-phase attractor in the expanding regime. ~10% DE error appears at
~50 blocks at the radius edge — exactly the large-`|z|` near-escape detail Padé targets.
With the **correct** `A/M²·der + B/M`, the per-block der error drops back to `~ε` (the
intrinsic `(D·z)²` term), restoring parity with affine BLA (which tolerates ~`1/ε ≈ 1e5`
coherent blocks before 10% drift).

**Decision:** the corrected derivative is **required**; without it Padé's shading is wrong
in its own gain region (DE halos / AA artifacts). Cost is ≈ 0 because the application
already computes `invM = 1/M` for `z_out`:

```wgsl
let invM   = cinv(M);                                  // M = 1 + cmul(d, dz) — already needed for z_out
let aOverM = cmul(a, invM);                            // A/M
let derNum = cmul(aOverM, *derM) + b * derInvScale;    // (A/M)·der + B   (B in mantissa space)
*derM      = cmul(invM, derNum);                       // ·(1/M) → (A/M²)·der + B/M
```

~3 extra `cmul` + 1 add over affine; slots into the existing `derM`/`derS`/`derInvScale`
machinery. Required in **both** shader paths (`try_apply_bla`, `try_apply_bla_deep`). Keep
`(A − B·c·D)` instead of `A` only if shallow/near-zero accuracy demands it; in deep zoom
drop it.

### D5 — Rebasing: zero Padé-specific code; the radius protects it; recovery is faster

Rebasing (`mandelbrot.wgsl:530-535` shallow, `:797-801` deep) operates only on `(dz, ref_i)`
and **leaves `der` untouched**; it runs **after** a block, so it sees only the block's
endpoint. (Codebase naming: `dz` = delta, `z` = full value.)

**`der` is rebase-invariant, and the code is right (both modes).** `der = dw/dc`; rebasing
sets `dz' = w`, `Z'_0 = 0`, so the new full `w' = w` is unchanged and `der' = dw/dc = der`.
The reference is `c`-independent, so this is mode-agnostic. Padé's per-block der correction
(D4) applies inside blocks; across a rebase `der` is carried as-is. **No Padé×rebasing der
interaction.**

**A block cannot jump past a rebase — same guarantee as affine.** A rebase fires when the
full value passes near zero (`|w| → 0 ⟹ |dz| ≈ |Z_m|`). The merge `min` enforces per-step
validity pulled back to the input, so `|dz_in| ≤ α ⟹` every interior `|dz_k| ≤ α_k`. Padé
per-step validity is `|dz_k| < √ε·|A_k| = 2√ε·|Z_{m+k}| ≈ 2e-3·|Z_{m+k}| ≪ |Z_{m+k}|`, so a
near-zero crossing (`|dz_k| ≈ |Z_{m+k}|`) violates validity by `~1/(2√ε) ≈ 500×` and the
radius is shrunk to exclude it. Padé rides ~1000× closer to the rebase boundary than affine
(margin `×500` vs `×5e5`) but stays well inside it. The radius protects the rebase exactly
as it protects the pole.

**Positive: Padé recovers faster after a rebase.** Post-rebase `dz ← w`, `ref_i = 0`,
`Z_0 = 0`; exact steps run (Bug-1 region) until the radius catches the delta. A block
resumes when `√ε·|2Z_m| > |dz|`, i.e. `|Z_m| > |dz|/(2√ε)` — affine needs `|Z_m| >
|dz|/(2ε)`, a `1/√ε ≈ 1000×` larger threshold. So Padé resumes skipping with a smaller
`|Z_m|`, cutting the post-rebase exact-step tax by `~log_r(1/√ε)` steps per rebase. This
helps most where rebasing is frequent — minibrot / near-escape zones, a §8 target.

**Watch-item (diagnostic, not a bug).** Because Padé rides closer to the rebase boundary,
any near-zero-crossing glitch surfaces in Padé first. If the difference mode shows
artifacts in high-rebasing zones where affine is clean, the suspect is an over-optimistic
radius (philosophy A's `L·ε` accumulation) → switch that region to quadrature (D3-B).

### D6 — Pole guard: near-dead under the correct radius, kept as cheap safety + telemetry

The source doc's §3.5 pole guard does an exact step when `|1 + D·z| < POLE`. Under the D3
radius, `|D·z| ≤ √ε ⟹ |1 + D·z| ≈ 1`, so the guard **almost never fires** — and that is the
correct behaviour. In the expanding regime `|D_z·z| ≈ √ε` is an attractor (the same
coherence that makes D3/D5 well-behaved), so the pole distance tracks the accuracy radius
with a `√ε ≈ 1e-3` margin. Worst-case erosion (adversarial phase alignment every level)
unwinds both the advantage and the pole margin only near `skip ~ 1/ε = 2²⁰`; with
`MAX_BLA_SKIP = 65536 = 2¹⁶`, there is a comfortable `×16` margin.

**Decision:** keep the guard (cheap, reuses `M`), but treat its **fire rate as the primary
empirical validator of D3**. Pole-rejection > ~10% (source doc §8 red flag) does not mean
the pole is misplaced — it means the composed radius was taken too large (e.g. `min`
without the `√ε` seed, or skip past the safe ceiling). Telemetry on this rate is the cheap
signal that the radius composition is sound.

### D7 — Storage: `+D` per entry, separate Padé table built only in `'pade'` mode

`BlaStep` is `8×f32 = 32 B`; adding `D = (dx, dy)` plus its own floatexp exponent makes it
`~11×f32 ≈ 44 B` (+~37% table size and CPU→GPU upload). `|D| ~ 1/|A|` ranges widely, so `D`
needs an exponent independent of the existing `ab_exp`. Because Padé only differs from
affine where `|z|` is large (and is pure overhead in smooth zones), build the Padé table
**only when mode is `'pade'`** rather than widening every BLA entry unconditionally. The
radius/`α`/`β` fields are shared with affine (D3-(a): `D` is out of the radius), so only the
two `D` mantissa floats + one exponent are new.

## Risks / Open Questions

- **Unvalidated approach.** Padé higher-order block-jumping has no community precedent;
  NanoMB2 (chained biseries) failed by catastrophic absorption. Treat as a research
  hypothesis. Abandoning after the empirical pass is an acceptable, doc-consistent outcome.
- **`min` vs quadrature is empirical.** D3 ships `min`+`√ε`; the `L·ε` cumulative error may
  or may not produce visible artifacts. The difference mode (`|z_padé − z_affine|`) is the
  arbiter; quadrature (D3-B) is the ready fallback.
- **Pole-rejection rate is the radius validator.** If telemetry (D6) shows > ~10% rejection,
  the composed radius is wrong, not the pole — revisit D3 before blaming the seed.
- **Two shader paths double the surface.** Both `try_apply_bla` and `try_apply_bla_deep`
  need the rational map + corrected derivative (D4) + pole (D6). Deep-path floatexp
  arithmetic for `M = 1 + D·z` and `1/M` must avoid overflow when `|D|` is large.
- **`f32` `√ε` margin.** `√ε ≈ 1e-3` in `f32` leaves the pole `~500×` from the rebase
  boundary (D5) — large, but `1000×` thinner than affine. A noisier `ε` or a deeper
  `MAX_BLA_SKIP` erodes it; keep `ε` in the doc's recommended `[1e-8, 1e-4]` band.
- **Specs deferred.** Behavioral requirements (`specs/`) wait on the empirical go/no-go;
  this change is the math/design layer only.

## Validation path (recommended sequence)

1. **Difference mode first** (separate, smaller change): color `|z_padé − z_affine|` or the
   skipped-iteration delta. Reuses the existing mode toggle + `RenderStats`. Makes the gain
   *visible* and is the arbiter for D3-A-vs-B.
2. **Rust-only prototype**: seed + merge + `D` in `lib.rs`, comparing skipped-iteration
   counts CPU-side, before touching the shader — isolates the math risk from the GPU risk.
3. **Shader application** in both paths with D4's corrected derivative and D6's guard +
   telemetry.
4. **Benchmark** on the three locality classes (smooth spiral / minibrot / near-escape);
   apply the §8 success bar (≥30% more iterations skipped on minibrot / near-escape, pole
   rejection < 10%), then decide hybrid vs abandon.

## Validation results (CPU, captured during implementation)

All on the `reference_calculus` host test suite (no GPU), mirroring the shader's block
selection + application + rebasing in Rust so the math is validated before the unverifiable
shader.

**Seed / composition / derivative (unit tests).** `−A·D = 1` (the seed reproduces z²
exactly); the merged Padé block equals `y(x(z))` to `< 1e-10` at `c = 0` (exact Möbius
composition, confirming `D_z = D_x + A_x·D_y`); the Möbius derivative `A/M²·der + B/M`
matches a central finite difference to `< 1e-5`. **D2/D3/D4 confirmed.**

**Skip capacity (radius advantage).** Summing max-aligned-skip over the orbit across a swept
`|dz|`, Padé out-skips affine by **×278 / ×9356 / ×26624** in the `[ε|A|, √ε|A|]` band
(affine collapses to ~0 skip there, Padé sustains full skip). At small `|dz|` both are
identical — the advantage is localized to the band exactly as derived. **The √ε radius
advantage is real and composes as predicted (uniform 1/√ε).**

**Full per-pixel loop (exact vs affine vs Padé).** Per-pixel, on bounded references:
- **Correctness:** Padé reproduces the exact escape iteration **exactly** in well-behaved
  regions (cusp, period-2 bulb: 0/96 mismatches), with a small bounded tail near
  edge-of-chaos (Feigenbaum: 4/96 pixels, max `|Δiter| = 12`). No pole blowups under the √ε
  radius. The rational application + pole guard + rebasing are end-to-end correct.
- **Quadrature (D3-B) does not help** the near-chaos tail (mismatches unchanged, max
  `|Δiter|` 12→24): the tail is inherent Padé accuracy at large `|dz|`, not a
  radius-composition defect. `min` + √ε seed retained.
- **Realized vs capacity gap:** on interior-heavy grids the realized step count is
  Padé ≈ affine (**×1.00**) — the large capacity advantage only materializes for pixels
  whose `|dz|` actually rides the band (near-escape / boundary). **Realized speedup is
  band-occupancy-limited.**
- **Degenerate reference:** an *escaping* center (a misuse — one would pick a nearby
  nucleus) produced a single catastrophic Padé divergence (`|Δiter| ≈ 1080`) where affine
  stayed exact. Out of scope for normal use, but a reminder that Padé is less forgiving of a
  bad reference than affine.

**In-app benchmark.** `MandelbrotNavigator::benchmark_pade(grid)` (WASM) re-runs the
exact/affine/Padé loop on the *current* reference orbit over a pixel grid and returns step
counts + a correctness cross-check, surfaced via the RenderStats "Padé bench" button and
`window.__mandelbrotEngine.benchmarkPade()`. It gives precise, per-view realized numbers
without GPU instrumentation. Example (`-0.75 @ 1e-4`): Padé **×1.148** vs affine where affine
gets **zero** block benefit (its ε radius sits below `dc`), 0 correctness mismatches — i.e.
Padé skips in a regime where affine BLA is useless, which is its core value proposition.

**GPU validation (2026-06-26) — Padé works and beats BLA.** Measured GPU render time on
one deep view: **perturbation 12.6 s · BLA 6.9 s · Padé 4.8 s** — i.e. BLA is −45% vs
perturbation, and **Padé is −62% vs perturbation and −30% vs BLA**. Since each Padé block
costs an extra division over an affine block, a 30% *wall-time* win over BLA means it skips
substantially more iterations — clearing the §8 bar in wall-clock, not just iteration count.
The image is **correct with no DE halos at reasonable ε** — confirming the D4 derivative. The only
artifact is a **slight distortion at exaggerated ε or max-skip**, the D3/D6 validity
boundary (the `√ε|A|` radius then admits blocks where `|D·dz|` leaves the safe band).
Decision: **ship Padé**; keep ε in the recommended band, and optionally bound ε/skip or
switch to the quadrature radius (D3-B) to remove the extreme-setting distortion.

**ROOT-CAUSE NOTE (do not regress).** There are **two** GPU iteration paths: the fragment
pass `mandelbrot.wgsl` (fresh pixels) and the **in-place compute** `mandelbrot_brush.wgsl`
(`pipelineInplace`) which does the bulk of progressive-continuation iteration on deep views.
Padé must be implemented in **both**. The long debugging saga was caused by Padé being
disabled in the in-place compute shader (mistaken for a throwaway preview): BLA sped up but
Padé silently fell back to exact perturbation there, indistinguishable from "Padé not
working", while `mandelbrot.wgsl` looked correct. Any future change to the block code must
update both shaders.
