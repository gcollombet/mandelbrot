# Design — add-jet-approximation

## Context

Perturbation rendering iterates `z ← 2·Z_n·z + z² + c` per pixel against a
high-precision reference orbit `Z_n`. The BLA table
(`reference_calculus/src/lib.rs`, `compute_bla_reference_inner` L1053) stores, per
power-of-two block, an approximation of the composed block map plus a validity radius;
the shaders (`src/assets/mandelbrot.wgsl`, shallow L280–359, deep floatexp L727–801) try
the longest valid block, else fall back to an exact step, with Zhuoran rebasing.

Current modes and their guard burden:

| mode | block map | radius | runtime guards |
|---|---|---|---|
| BLA | `A·z + B·c` | `ε·\|A\|` | `beta`·dcMag correction, H2 (`\|B\|·\|c\| < ε`), `min_a` (G) |
| Padé | `(A·z + B·c)/(1 + D·z)` | `√ε·\|A\|` | same three + pole guard |
| **jet (this change)** | `Σ_{1≤i+j≤k} a_ij z^i c^j` | `r_k` per order, rule (V) | **`\|z\| < r_k` only** |

Source of the math: *Jet_bivariate_theorem_EN.tex* (bivariate jets note). Key results
used: exact closure (Lemma 1), composable scalar majorant (Lemma 2), anisotropic Cauchy
tail (Lemma 3), validity rule (V) (Def. 4), O(Nε) error bound (Thm 5), guard subsumption
at order 1 (Prop. 6). Paper constants adopted: applied order `K = 3`, stored degree
`D_s = 6`, anisotropy `R_c = s·c_max` with `s ~ 10³`.

## Goals / Non-Goals

**Goals:**
- Third approximation mode `jet`, end-to-end (Rust table → WGSL both paths → UI),
  beside untouched BLA/Padé.
- Adaptive-order evaluation from v1 (order-1 lookups at ~affine cost).
- Rigorous validity: runtime test is a single comparison per (block, order); no
  `min_a`/H2/`beta` on the jet path.
- CPU validation loop with the Prop. 6 oracle lands before any shader work.
- `c_max` changes never require re-walking the orbit while `c_max ≤ R_c`.

**Non-Goals:**
- Unifying BLA/Padé onto the jet table; replacing their heuristic radii.
- Split z-channel/c-terms evaluation (post-v1 optimisation).
- Tuning `K`, `D_s`, `s` beyond paper defaults.

## Decisions

### D1 — Coefficient layout: degree-sorted prefix, radii first

Per block, GPU-side:

```
[ r₁ r₂ r₃ | a₁₀ a₀₁ | a₂₀ a₁₁ a₀₂ | a₃₀ a₂₁ a₁₂ a₀₃ ]
             └ k=1 ┘  └── k=2 reads to here ──┘ └ k=3 ┘
```

An order-k application reads only the prefix through degree k; `a₁₀, a₀₁` are exactly
the current `A, B`. This is what makes adaptive order cheap: the near-parabolic regime
(paper's worst case, lookup-cost-bound) degenerates to an affine-sized read.

*Alternative rejected:* coefficient-major or (i,j)-lexicographic layout — breaks the
prefix property.

### D2 — Selection policy: greedy on skip, then smallest valid order

Since `r₁ ≤ r₂ ≤ … ≤ r_K` per block, the per-level gate uses `r_K` alone (same shape as
today's per-level `max_radius_bits` rejection). Once the longest valid block is found,
descend to the smallest k with `|z| < r_k`. Rationale: a longer skip saves whole
iterations (2 ops each); a smaller order saves only lookup cmuls — skip dominates the
economics, so it gets priority.

### D3 — Stored degree D_s = 6 is build-only; runtime ships degree ≤ K = 3

The degrees k+1…D_s exist to make the remainder estimate tight (their exact moduli carry
the bound; the Cauchy tail is pushed to θ^{D_s+1}). They are consumed at build time when
solving (V) and never reach the GPU. Per block on GPU: 9 complex coefficients + 3 radii
(vs 3 complex + 2 radii + `min_a` today, ≈3× memory).

### D4 — Radius machinery: per-degree scalars `S_d`, closed-form (V) solve

At build, per block:
1. Majorant `M = ρ_L` via `ρ ← |2Z_j|ρ + ρ² + R_c` walked over the block's steps, on a
   small grid of candidate `R_z` (powers of two), `R_c = s·c_max`.
2. Per-degree scalars `S_d = Σ_{i+j=d} |a_ij| R_z^i R_c^j` for d = 2…D_s (~5 reals).
3. `r_k = sup{x : Σ_{d>k} S_d θ^d + M·tail(θ, D_s) ≤ ½ε(|A₁₀|x + |A₀₁|c_max)}`,
   `θ = max(x/R_z, c_max/R_c)`, solved by monotone bisection in x, per k ∈ {1,2,3},
   maximised over the `R_z` grid.

Storing `(M, S_d, R_z, R_c)` per block (CPU-side only) means a later `c_max` change
re-solves step 3 alone — O(#blocks) scalar work, no orbit access.

*Alternative rejected:* storing all 27 moduli `|a_ij|` up to D_s — more memory for
marginally tighter radii; `S_d` loses only the sub-degree anisotropy, already covered by
the `R_z` grid search.

### D5 — Majorant is re-walked per level, not merged

The scalar recurrence is not composable across blocks (the left half-block's output ρ is
not the input radius the right half-block was tabulated for). Each level walks its
blocks' steps directly: N steps per level, O(N log N) total, ~4 flops per step per
`R_z` candidate. For a 1M orbit × 20 levels × 8 candidates ≈ 0.6 G flops — well under
the bigfloat orbit cost and the jet merges themselves; lives in the async reference
worker. Skip levels below the effective minimum skip (currently 4) to trim two levels.

*Alternative rejected:* composable quadratic upper-envelope per block — provable but new
analysis; revisit only if build time measures badly.

*Implementation finding (2026-07-02):* at a near-critical dip the walk floors at
ρ² + R_c instead of following the |2Z| product (aρ collapses, the other terms don't),
so M explodes once the candidate polydisc puts peak ρ above the block's smallest |2Z|.
This is correct and wanted — it is precisely the mechanism by which rule (V) rediscovers
the guard (G) at order 1 (huge M → r₁ = 0) — but it means the walk needs a saturation
sentinel (`MAJORANT_INF`, exponent ceiling) and the R_z candidate grid must reach well
below min|2Z_j| scales for near-critical blocks to get useful high-order radii.

### D6 — `c_max` lifecycle: monotone, lazily re-solved

- Build stamps the table with `c_max_build` and `R_c = s·c_max_build`.
- **Zoom in** (`c_max` shrinks): radii stay valid (conservative). Re-solve (V) lazily —
  e.g. when `c_max` drops 4× — to recover reach; async, non-blocking.
- **Zoom out** with `c_max ≤ R_c`: M still bounds the polydisc; re-solve (V) eagerly
  before use (cheap, D4).
- **Zoom out beyond `R_c`** (≥ s× ≈ 10 octaves): full radii rebuild (majorant re-walk);
  in practice the reference itself is rebuilt long before this.

*Implementation finding (2026-07-03) — split radius buffer ("le buffer de rayons"):*
the GPU record was originally one 120 B `JetStep` (radii + coefficients
interleaved), so a c_max/ε re-solve re-serialized and re-uploaded the whole
table even though only the radii changed. Radii and coefficients now live in
two index-aligned buffers — `JetCoeffs` (108 B, orbit-keyed, serialized once
per orbit) and `JetRadii` (16 B vec4-packed: r₁r₂r₃ + pad, one coalesced load
per probe), (ε, c_max)-keyed, re-emitted on every re-solve. The runtime descent
(per-level `max_r3` gate + order selection in `try_apply_jet`) reads the radius
buffer ALONE; the coefficient record is touched only once a block is applied.
A zoom re-solve inside the R_c headroom re-uploads 16 B/block instead of 120 B.
Plumbing: Rust `jet_serialize_coeffs` / `jet_serialize_radii` +
`JetBufferInfo{coeffs,radii,levels}`, a third jet storage buffer bound at 7
(fragment/debug) and 10 (compute), and a `radii` array on the `blaReady`
worker message.

*Companion (2026-07-03) — hoisted level gates:* the descent's per-level test
also re-read the 16 B `JetLevel` directory entry on EVERY probe of every turn,
though the ~15 `maxR3` values are pixel-invariant. Both loops (and the debug
shader) now load them once per pixel into a function-space array
(`jetLvlR3[JET_MAX_LEVELS=32]`, fused with the global `jetMaxR3` scan) passed
to `try_apply_jet`; the block skip is recomputed from the power-of-two scaffold
(`1 << (skip0Log + level)`). A failing level probe now costs zero memory reads;
the directory is only read (offset/count) once a level gate passes. First split
measurement (radius buffer alone, before this hoist + vec4 packing): jet frame
~2.0 s vs padé ~0.85 s on view 3 — bandwidth cuts alone don't close the gap;
next levers stay as listed (split evaluation, f32 shallow fast path).

*Perf round 2 (2026-07-03) — der-refresh elision (#3) + plain-f32 fast path (#4):*
- **#3**: every jet application refreshed the derivative caches (2 exp()) because
  ∂Φ/∂z's exponent was folded into `derS`. When |pdz.e| ≤ `JET_DER_EXP_FOLD`
  (16) — the norm on the slow dynamics that dominate wall-clock — the exponent
  now folds into the MANTISSA via ldexp (exact, no transcendental): derS and its
  caches stay valid, and the existing per-turn DER_RENORM window absorbs the
  drift (≤ 2^16 per application against a 2^±26 half-width, so one application
  cannot overflow before the next check). Large exponents keep the old derS
  fold + refresh. Net: 3 exp() per application → 1 (+ amortized renorm).
- **#4**: a per-block flag `f32_safe` rides the radius vec4's pad word (free in
  the descent's coalesced load): build-side `jet_f32_safe` certifies every
  shipped coefficient has |log2| ≤ 96 (`JET_F32_SAFE_LOG2`), i.e. reconstructs
  exactly in f32 via ldexp with Horner headroom (|dz|,|dc| < 1 on applied
  blocks caps intermediates at ~2^99). Flagged blocks evaluate through
  `jet_apply_f32` — same Horner rows, plain cmul/add, zero per-op fe renorms —
  when the caller also certifies f32 scale: shallow loop with |dc| > 2^-42
  (dc²/dc³ clear of the subnormal band) and log2|dz| > −100. The near-parabolic
  regime qualifies structurally (multiplier ≈ 1 ⇒ log2|a₁₀| ≈ 0 even at skip
  32768). Deep loop and out-of-range blocks keep the fe evaluator unchanged.
  Results feed back through `fe_from_vec` (renormalizing), so the #3 fold
  branch picks up f32-path derivatives with their true exponents.

### D7 — Exponent strategy: per-coefficient (spike DECIDED, 2026-07-02)

Spike (`jet_exponent_spike` in `reference_calculus/src/jet.rs`) built D_s = 6 jets over
bounded orbits at cusp (−0.75, 32k), period-2 bulb (−1.25, 32k) and Feigenbaum
(−1.401155, 131k), measuring the worst within-block exponent spread among nonzero
coefficients of the same total degree:

| orbit | worst degree-group spread | worst whole-block spread |
|---|---|---|
| cusp (near-parabolic) | **75 bits** (d6, skip 32768) | 87 bits |
| period-2 bulb | 64 bits | 89 bits |
| Feigenbaum 131k | 34 bits (d1, top level) | 142 bits |

A shared f32-mantissa exponent budgets ~24 bits before the small coefficient of a group
is lost; every orbit class exceeds it, and the spread grows ~linearly with log₂(skip)
on slow orbits (cusp d6: 18 → 75 bits from skip 64 to 32768) — no safe threshold
exists. **Decision: per-coefficient exponents on the GPU table** (2×f32 mantissa +
i32 exponent per a_ij, ≈ 108 B/block for the shipped 9 coefficients), radii likewise
per-scalar floatexp. Build side is floatexp-per-coefficient (`CFe`: f64 mantissa pair +
i64 exponent); the spike also confirmed finite, well-normalized coefficients through
the top level (a₁₀ cross-checked against Σ log₂|2Z_k|).

### D8 — Merge: exact truncated bivariate composition in the existing level scaffold

`J_{D_s}(Y ∘ X)`: compute truncated powers `X^i` (i ≤ D_s) and accumulate
`Σ b_ij X^i c^j`, all products truncated at total degree D_s. ~10³ f64 cmuls per merge
vs ~4 today; total merges ≈ N, so ≈1 G mults for a 1M orbit — parallelisable per level,
async worker, acceptable vs the bigfloat orbit cost. Seeds are exact
(`a₁₀ = 2Z_n, a₂₀ = 1, a₀₁ = 1`), so no truncation error exists anywhere in the table
(Lemma 1); the only error source is the Taylor remainder, bounded by (V).

### D9 — Derivative propagation reuses the same coefficients

The shaders update `der` per block (Padé: `der' = (A/M²)·der + B/M`). The jet block map
gives `∂Φ/∂z = Σ i·a_ij z^{i-1} c^j` and `∂Φ/∂c = Σ j·a_ij z^i c^{j-1}` from the stored
prefix — a second polynomial evaluation at the applied order, no extra storage. Verify
against the exact-step derivative in the CPU loop (relative error ≤ ε per block).

### D10 — Validation path: CPU loop with the Prop. 6 oracle before any WGSL

`jet_full_loop…` beside `pade_full_loop_correct_and_faster` (lib.rs L2269), same
harness. Acceptance gates before shader work starts:
- remainder bound: (V)-admitted applications differ from exact stepping by
  ≤ ε·(|A₁₀||z| + |A₀₁||c|) — sampled over blocks × orders × entry grid;
- Prop. 6 oracle: at k = 1, `r₁ = 0` exactly on blocks straddling near-critical steps
  where today's `min_a` guard fires; k ≥ 2 radii stay > 0 through them;
- end-to-end: final `|z_jet − z_exact|/|z_exact| ≤ e·N·ε` on seahorse / Feigenbaum /
  near-parabolic style references;
- ops accounting reproduces the paper's convention (exact 2, order k: k(k+3)/2) to
  confirm the ×-speedup shape before GPU effort.

## Risks / Trade-offs

- [Lookup bandwidth: ~3× block size could erase gains in regimes with short skips] →
  D1 prefix reads + D2 policy; measure ops *and* wall-clock in the CPU harness; the
  paper's near-parabolic ×62-vs-×235 is the known floor, accepted for v1.
- [Shared-exponent compaction turns out unsafe at extreme depth] → D7 spike decides
  before layout freezes; fallback (per-coefficient exponents) is safe and only costs
  memory.
- [Radii from rigorous (V) measurably lag heuristic radii (paper: residual ~5× on slow
  orbits)] → accepted: rigor is the feature; the `R_z` grid search recovers most of it;
  revisit with the split-evaluation optimisation post-v1.
- [Build-time regression on very long orbits (jet merges ≈1 G mults at 1M iters)] →
  async worker + progressive rendering already mask table builds; parallelise merges per
  level if needed; majorant/radii only for levels with skip ≥ min-skip.
- [WGSL struct/buffer size limits or alignment surprises with variable-prefix reads] →
  jet table in its own storage buffer (not widening `BlaStep`), flat f32/i32 array
  indexed by (level, slot, prefix); validated on the shallow path first.
- [Deep-path floatexp evaluation cost (9 fe-cmuls + fe-adds per apply)] → adaptive order
  makes deep applies order-1 most of the time; escape/detail zones pay full order where
  it buys reach.

## Migration Plan

Additive; no rollback complexity. The jet mode ships behind the existing mode dropdown;
`bla` remains the default. BLA/Padé tables and guards untouched. If the jet path
misbehaves, users/presets simply stay on `bla`/`pade`.

## Measurements (2026-07-02, close-out)

**Table build time** (release, single-thread, `jet_build_time_benchmark`,
period-2 orbit, ε = 1e-6, c_max = 1e-9, 8 R_z candidates):

| orbit | merges | bounds + radii | serialize | total |
|---|---|---|---|---|
| 32k | 178 ms | 187 ms | 1 ms | **0.37 s** |
| 131k | 680 ms | 679 ms | 4 ms | **1.4 s** |
| 1M | 5.5 s | 5.1 s | 35 ms | **10.6 s** |

The radii pass was 22 s at 1M before three solve-side cuts (16 bisection
iterations instead of 40, warm-starting order k+1 from θ*_k — sound since
H_{k+1} ≤ H_k pointwise — and pruning candidates whose R_z/2 cannot beat the
best radius) plus a bit-surgery positive-real floatexp for the majorant walk.
Interactive depths (≤ 131k) are fully masked by the async worker; 1M costs
~10 s of background work before jet acceleration kicks in (rendering continues
on exact perturbation meanwhile). Per-level parallelism remains available if
this ever matters (wasm is single-threaded, so it would need a worker pool).

**CPU ops benchmark** (harness, paper convention — task 3.6): feigenbaum
jet ×40.7 vs affine ×5.5 / padé ×24.3 (paper: ×42 on this regime); cusp
jet ×214 ≈ affine ×204 (adaptive order holds the lookup-bound regime);
period-2 affine ×196 vs jet ×161.

**GPU validation** (Playwright, WebGPU headed): shallow A/B on the intro view —
bla↔jet pixel diff 38.3% vs bla↔pade 56.4% (both are block-sampling effects on
the orbit-metric EMA / derivative shading; the bla↔bla FMA floor is 0.3%), zero
WebGPU validation errors, shader flag 3 with a live table, reference orbit
never rebuilt across mode switches. Deep: antenna-tip needle at 1e-32 (fe path)
renders structured content and converges in ~10 s in jet mode.

**Wall-clock** (task 8.2): at both test views all three block modes converge at
the progressive scheduler's floor (~2.0 s) — the GPU is not compute-bound
there, so wall-clock does not discriminate; the ops-level benchmark above
carries the performance differential. Re-measure on iteration-heavy views
(millions of iterations) if a wall-clock claim is ever needed.

## Field fixes (2026-07-02, after first user testing)

Field testing reported: jet always slower than BLA/Padé, the stats panel showing
"exact", and early blackout at depth (like perturbation). Root causes and fixes:

1. **Stats panel label** only knew flags 0/1/2 — flag 3 displayed as "exact"
   (cosmetic but misleading). Fixed in RenderStats.vue.
2. **Table permanently stale during zoom** (the real performance/blackout bug):
   maxIterations grows on every `updateView`, each growth re-triggered a FULL
   jet rebuild (~10–20× a BLA build), and the Engine gate
   `referenceBlaReadyMaxIterations ≥ guardedMaxIter` disqualified the
   in-flight table → shader flag fell to exact → pure perturbation → the
   ε-interior detection (active only while no block has been applied,
   `!usedBla`) blacked out at depth exactly like perturbation mode. Fixes:
   worker throttles jet reposts until the target outgrows the posted table by
   1.5×, and the Engine accepts PARTIAL jet tables (sound: blocks cover an
   orbit prefix, slot bounds reject the rest, radii only get more conservative
   as c_max shrinks).
3. **Majorant saturation killed all long blocks at coarse c_max**: R_c =
   1024·c_max poisons the walk's c-channel on ≥64-step blocks when c_max is
   interactive-scale. Fix: per-candidate anisotropy LADDER (s = 1024 primary,
   s = 32 fallback when saturated); the bounds headroom stamp now uses the
   ladder minimum. Census after fix: skip-weighted usable radii at
   (ε=1e-4, c_max=1e-5) cusp ×2.9 more; ops benchmark cusp ×6.3 → ×23.7,
   feigenbaum-deep ×40.7 → ×45.1, and 100% usable at c_max = 1e-12.
4. Remaining honest limits at the coarse regime (c/ε ~ 0.1): blocks ≥ 128 steps
   carry genuine O(1) c-channel remainders (uncertifiable at any order) and the
   harness's Padé/affine columns are flattered there (no H2/G gates CPU-side).
   On the real GPU the intro view now measures realizedSkip 5.9 (jet) vs 4.9
   (Padé) vs 2.0 (BLA). A two-sided radius (r_lo, admitting blocks whose pure-c
   remainder is dominated by the z-budget at larger |z|) could recover the
   gate-b-killed skip-32 band — documented future work.

Related user-facing finding: **perturbation mode's early blackout at depth** is
mode-dependent via the same mechanism — the ε-interior detection only runs
while no block has been applied, so BLA/Padé (and now jet) largely bypass it
while perturbation never does. To confirm/tune: `IGNORE_EPSILON = true` in the
two shaders, or make the detection scale-aware.

## Iso-error calibration (2026-07-02, after field testing)

Field verdict at equal ε: Padé fastest, then BLA, then jet — but jet by far the
most precise. Expected: jet's radii are certified (rule V) and its measured
error sits orders of magnitude inside the bound, while BLA/Padé radii are
heuristic. The fair comparison is at equal DELIVERED error → raise jet's ε
(safe: the bound stays certified; the ε slider already spans to 1e0, and unlike
Padé there is no √ε-validity distortion above 1e-4). Harness numbers
(`iso_error_benchmark`, c_max = 1e-9, feigenbaum): padé ε=1e-4 → ×52.5 at
4.8e-8 error; **jet ε=1e-2 → ×139.5 at 2.2e-12; jet ε=1e-1 → ×176.5 at
6.9e-10** — at matched-or-better error, jet is ~3× faster than Padé's best.
A mode-aware default (jet: ε=1e-2) is the natural follow-up.

## Field verdict (2026-07-02, end of tuning round)

After the correctness fixes (dead radii at depth, gate underflow, level cap),
sustained user testing on real GPU workloads concludes: **Padé is consistently
~2× faster than jet, and on the tested views also as-precise-or-better at equal
ε.** This does not contradict the math — it locates the workload: interactive
deep-zoom paths spend most wall-clock in slow / near-parabolic dynamics, where
the composed block map is nearly Möbius. There the [1/1] rational form is
almost exact at any radius (the paper's own near-parabolic column: Padé error
0.000) while a degree-3 jet carries a genuine Taylor remainder AND pays the
implementation's constant factors (all-fe evaluation on both paths, three
polynomial sums per application, 120 B vs 48 B block reads, ~10-20× table build
cost). The jet's certified wins (near-critical passages, guard-free validity,
provable O(Nε) bound) are real but cover a minority of typical wall-clock.

Status: jet ships as the RIGOROUS mode (certified error, single validity test),
Padé remains the practical speed default. The paper's ops convention
(k(k+3)/2 vs 6) materially underestimates the GPU constant factors.

Identified levers if jet perf is revisited (in expected-impact order):
1. Split evaluation (paper §5 "next optimisation"): order-1 z-channel + stored
   c-terms — targets exactly the near-parabolic lookup-bound regime.
2. Plain-f32 fast path on the shallow loop when a per-block flag says all
   shipped coefficient exponents fit (ldexp-exact, kills the fe overhead).
3. Incremental/chunked table build in the worker (extend new slots only).
4. Per-order application counters in WorkStats (measure, then optimise).

## Open Questions

- ~~Exponent sharing on GPU~~ — decided per-coefficient (D7, spike data above).
- `R_z` candidate grid size (start: 8 powers of two centred on `√ε·|A₁₀|`-scale;
  tune in the CPU harness).
- Lazy re-solve threshold for zoom-in (start: `c_max` drop ≥ 4×).
- Whether the per-level gate keeps the existing `max_radius_bits` whole-level rejection
  semantics unchanged with `r_K` (expected yes — same monotone shape).
