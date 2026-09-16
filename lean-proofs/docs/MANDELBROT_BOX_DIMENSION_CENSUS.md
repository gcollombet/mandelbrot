# Local box dimension of ∂M and the skip-rate ceiling

*CPU census, `reference_calculus/src/boxdim.rs`. Build-only: nothing here runs in the renderer.*

## Why

When a location renders slowly and block/super-pixel skipping does not pay there, we
cannot currently tell whether **our bounds are loose** or **the geometry leaves nothing
to skip**. `reach.rs` measures how far one computed pixel carries; it does not measure
how far it *could* carry. This census adds the missing reference quantity and turns it
into a ceiling.

Two numbers:

1. **`d`, the local box dimension of ∂M in the view.** The area of the ε-neighbourhood
   of ∂M scales as ε^(2−d), so the share of a window within ε of the boundary has
   log-log slope 2−d. Shishikura (1998) gives `dim_H ∂M = 2` globally, but that is a
   supremum over the whole set; inside one view, across the three or four octaves a
   render actually spans, the effective exponent is what governs cost.

   Why it is a ceiling: an anchor serves a disk whose radius is proportional to its
   distance to ∂M, so covering a window costs ∫dA/dist² anchors. With
   dA ≈ (2−d)·ε^(1−d)dε that integral is ∫ε^(−1−d)dε ~ h^(−d) at pixel size h, against
   h^(−2) pixels. **anchors/pixels ~ h^(2−d)**: at d = 2 no amount of resolution buys a
   better ratio, and every 0.1 below 2 is another decade of headroom per decade of zoom.

2. **`ρ/DE`, the reach over the distance estimate.** The Green's function varies on the
   scale of the distance to ∂M, so any local model of the escape time has a natural
   radius Θ(dist). The ratio is the looseness of *our* radius, and its theoretical value
   for a cubic remainder at `REACH_TOL = 1e-3` is tol^(1/3) ≈ 0.1.

## Method

- Exterior Koebe estimate `DE = 2·|z|·ln|z| / |z′|`, carried as **log2** (at depth |z′|
  runs past the f64 exponent range and DE below any denormal; log2 DE stays ordinary).
- Same perturbation walk and Zhuoran rebase as `reach.rs`, carrying only z′ — one CFe
  multiply per step instead of eight.
- Sausage law fitted by least squares over the octaves the grid resolves (ε ≥ 4 cells),
  dropping any octave already at ≈ 100 % — a saturated octave carries no slope, and two of
  them produced a confident `d = 2.00` at R² = 0.60 in the first run. Fewer than three
  usable octaves ⇒ no dimension reported. R² is printed so a view that is *not* a single
  power law says so.
- Anchor count as a **mean-field integral**: a cell of reach ρ needs pixel²/(π·ρ²)
  anchors per pixel, capped at 1. Resolution-independent, unlike a greedy cover on a
  coarse grid — and calibrated against an actual greedy cover on a crop whose cells are
  exactly 1080-render pixels.

## What the validation turned up

Three findings landed before a single useful census row was printed. All three are pinned by
tests in `boxdim.rs`.

### 1. The production bailout destroys the distance estimate

`DE` is asymptotic in |z_n|, and |z|² > 4 is nowhere near asymptotic. Measured against
an exactly known distance — dist(−2 − t, M) = t, since −2 is the leftmost point of M:

| bailout | DE/dist at t = 1e-1 … 1e-6 |
|---|---|
| `|z|² > 4` (production) | 31, 281, 2776, 27729, 277262, 2.8e6 — diverges as 1/t |
| `|z|² > 1e12` (census) | 3.885, 3.977, 3.997, **4.000, 4.000, 4.000** |

At the production bailout the tip escapes on the first iteration with z′ = 1, so the
"distance" returned is just the bailout radius. The 4.000 is not a coincidence: a tip is
the extremal configuration of the Koebe distortion bound, where the estimate overshoots
the geometric distance by exactly 4. This is now a test
(`distance_estimate_is_exact_at_the_tip`), and so is the failure mode
(`production_bailout_destroys_the_distance_estimate`), because a future simplification
that reuses `reach::BAILOUT_SQ` here would silently invalidate every table.

### 2. At a parabolic cusp the field scale is not the distance

dist(1/4 + t, M) = t exactly (1/4 is the rightmost point of M), yet DE/t decays like √t.
The parabolic bottleneck makes the escape field vary on a scale far below the geometric
distance. This is not an error to fix: it is the reason the tables are read as the
dimension of ∂M **in the Green's metric**, which is the metric our reach lives in anyway.
A bounded DE/dist ratio shifts the sausage curve sideways and leaves the exponent alone;
only a scale-*dependent* ratio like this one biases it, and parabolic points are the
place where that happens.

### 3. `reach.rs`'s deep rows are starved by the reference length

The f64 orbit of an approximate boundary point escapes, and it does so fast:

| view | f64 reference length |
|---|---|
| seahorse | 3 091 |
| elephant | > 200 000 |
| triple-spiral | **435** |
| misiurewicz | **137** |
| minibrot-p3 | > 200 000 |

`reach.rs` caps its iteration budget at that length (`iters.min(orbit.len() - 2)`), so
the σ = 1e-9 triple-spiral row runs **433 iterations instead of 120 000**, and reports
the resulting "did not escape" pixels as interior in its `uns%` column.

The cap is unnecessary. The walk's end-of-orbit rebase (`dz = full; ref_i = 0`) is exact
— orbit[0] = 0 and orbit[1] = c_ref make the next step `dz² + c` — so a short reference
merely degrades the walk to direct f64 iteration of the full value.

**Removing the cap is not enough, and that is the sharper half of the finding.** With the
cap gone, the census measured **0 % non-escaping at σ = 1e-9 against 64 % at σ = 1e-6** —
impossible, since the deeper window is inside the shallower one and needs *more*
iterations, not fewer. Every pixel was escaping on the reference's own rounding. So the
census builds its reference in DBig and stores it as f64 (`ref_orbit_dbig`), which is what
the production pipeline does: the orbit values are O(1) and f64 holds them, but they must
be the *true* orbit of the reference parameter. One arbitrary-precision orbit per view
costs well under a second against 37 000 pixel walks that then mean something.

**Both are now fixed in `reach.rs` too** (2026-07-27): it takes the same
`census_reference`, at the full budget. Re-running it turns its deep rows from noise into
a result, and into an independent confirmation of the dimension census:

```
reach | view          σ      iters | medVal medD1 medD2 medUse2 | val≥4 A1≥4 | A2≥4 | uns%
reach | seahorse       1e-3   4000 |   2.57  0.37  2.29    2.29 |  55.9   4.9 | 53.2 |  0.0
reach | seahorse       1e-6  30000 |  -7.30 -9.61 -7.71   -7.71 |   0.0   0.0 |  0.0 | 63.1
reach | seahorse       1e-9 120000 |  -0.84 -3.04 -1.13   -1.14 |  20.4   0.1 | 14.3 |  0.0
reach | elephant       1e-3   4000 |   1.21 -1.02  0.88    0.88 |  41.4   8.5 | 35.4 |  1.3
reach | elephant       1e-6  30000 |    NaN   NaN   NaN     NaN |   NaN   NaN |  NaN | 100.0
reach | elephant       1e-9 120000 |    NaN   NaN   NaN     NaN |   NaN   NaN |  NaN | 100.0
reach | triple-spiral   1e-3   4000 |  -1.65 -3.94 -2.03   -2.03 |  35.2  15.9 | 34.3 |  0.0
reach | triple-spiral   1e-6  30000 |   3.16  1.02  3.02    3.02 |  55.6  41.8 | 54.9 |  0.0
reach | triple-spiral   1e-9 120000 |  -3.79 -6.02 -4.12   -4.12 |   9.5   0.0 |  5.3 |  0.0
reach | misiurewicz    1e-3   4000 |   2.91  0.70  2.64    2.64 |  63.2  23.9 | 59.4 |  0.0
reach | misiurewicz    1e-6  30000 |   3.00  0.80  2.72    2.72 |  64.3  23.3 | 60.8 |  0.0
reach | misiurewicz    1e-9 120000 |   3.01  0.81  2.76    2.75 |  64.1  24.3 | 61.0 |  0.0
```

Three things fall out of that table, none of which were visible before the fix:

- **The misiurewicz reach is scale-invariant**: 2.91 / 3.00 / 3.01 log₂ pixels across six
  decades, `val≥4` at 63 / 64 / 64 %. The dimension census says d = 1.52 / 1.51 at the same
  point. Two instruments that share no code agree that this location looks the same at
  every zoom — which is what asymptotic self-similarity at a Misiurewicz point means.
- **The interior shares now cross-check**: seahorse at σ = 1e-6 reads 63.1 % here against
  63.8 % in the ceiling census, elephant reads 100 % in both. Before the fix those were
  starvation artefacts and matched nothing.
- **A view centre must carry about `log10(1/σ) + 2` digits to still be the same place at
  depth.** misiurewicz is given to 14 decimals and holds at 1e-9; elephant (7 decimals)
  lands inside a component; triple-spiral (4 decimals) wanders — its 1e-3, 1e-6 and 1e-9
  rows describe three unrelated neighbourhoods, which is why they read −1.65, +3.16, −3.79
  with no pattern. Those two views are only meaningful at σ = 1e-3 as written.

## Results

`cargo test --release --manifest-path reference_calculus/Cargo.toml --lib box_dimension_census -- --ignored --nocapture`

Grid 192², views are the reach census's four plus `mini-seahorse` — the seahorse point
transported into the period-3 island by that island's size estimate,
`c = nucleus + Λ·c_seahorse` with Λ = 0.019035515913, looked at through a window scaled by
the same Λ (a copy 52× smaller needs a window 52× smaller — the unscaled first attempt was
the equivalent of viewing the main set at σ = 0.05, and read 47 % interior with no slope).
Its σ column therefore shows the scaled values.

```
boxdim | view          σ      iters |  int% | A(σ/2) A(σ/4) A(σ/8) A(σ/16) |    d    R² | floor@1080
boxdim | seahorse       1e-3   8000 |   0.0 |  75.13  58.02   46.88    40.17 | 1.70 0.988 |    13.52%
boxdim | seahorse       1e-9 150000 |   0.0 |  99.98  94.97   81.27    67.85 | 1.76 0.998 |    29.02%
boxdim | elephant       1e-3   8000 |   1.4 |  92.10  75.41   61.44    50.62 | 1.71 1.000 |    19.66%
boxdim | elephant       1e-9 150000 | 100.0 |   0.00   0.00    0.00     0.00 |  NaN   NaN |      NaN%
boxdim | triple-spiral   1e-3   8000 |   0.0 |  83.22  71.74   66.84    62.94 | 1.87 0.950 |    38.97%
boxdim | triple-spiral   1e-9 150000 |   0.0 | 100.00  98.58   90.77    81.38 |  NaN   NaN |      NaN%
boxdim | misiurewicz    1e-3   8000 |   0.0 |  77.70  56.64   40.83    28.77 | 1.52 0.999 |     5.41%
boxdim | misiurewicz    1e-9 150000 |   0.0 |  77.59  55.24   39.55    27.86 | 1.51 1.000 |     4.96%
boxdim | mini-seahorse   2e-5  32000 |   0.0 |  32.85  18.91   10.96     6.53 | 1.22 1.000 |     0.42%
boxdim | mini-seahorse  2e-11 600000 |   0.0 |   0.00   0.00    0.00     0.00 |  NaN   NaN |      NaN%
```

- `A(σ/k)` — share of the window within σ/k of ∂M; `d` — 2 − slope of that curve;
  `floor@1080` — the law at one pixel plus the interior: the share of pixels **no**
  anchor can serve, because their own reach is at most their distance.
- Saturated rows (the whole window inside the boundary layer at every resolvable ε)
  report no dimension rather than the slope of a flat curve.

`cargo test --release --manifest-path reference_calculus/Cargo.toml --lib skip_ceiling_census -- --ignored --nocapture`

```
ceiling | view          σ    | ρ/DE p25   p50   p75 |  int% |  ext%  all% | crop% greedy% pack
ceiling | seahorse       1e-3 |    0.039 0.047 0.061 |   0.0 |  35.4  35.4 |  30.1   32.5 1.08
ceiling | elephant       1e-3 |    0.040 0.052 0.068 |   1.4 |  42.9  43.7 |  93.4   99.7 1.07
ceiling | triple-spiral   1e-3 |    0.043 0.051 0.063 |   0.0 |  59.0  59.0 |   0.2    0.5 2.97
ceiling | misiurewicz    1e-3 |    0.047 0.056 0.067 |   0.0 |  20.4  20.4 |  81.0   91.1 1.13
ceiling | mini-seahorse   2e-5 |    0.044 0.053 0.069 |   0.0 |   3.6   3.6 |   0.1    0.3 2.88
```

One depth by default — the deep row needs a budget that resolves it (250 000 at σ = 1e-6,
because these windows are interior-dominated and every non-escaping cell pays the full
budget twice over), which costs about ten minutes per view. The one measured that way:

```
ceiling | seahorse       1e-6 |    0.039 0.048 0.063 |  63.8 |  96.2  98.6 | 100.0  100.0 1.00
```

— same `ρ/DE` as at σ = 1e-3 to the third decimal, with the ceiling swamped by 64 %
genuine interior.

### What the numbers say

**The cost model holds: `d` predicts the ceiling, across five views.** Lining the two
tables up at the same depth, the ordering is exact and the spread is an order of
magnitude:

| view | `d` | floor@1080 | ceiling (`ext%`) | ceiling/floor |
|---|---|---|---|---|
| mini-seahorse | 1.22 | 0.4 % | 3.6 % | 8.6 |
| misiurewicz | 1.52 | 5.4 % | 20.4 % | 3.8 |
| seahorse | 1.70 | 13.5 % | 35.4 % | 2.6 |
| elephant | 1.71 | 19.7 % | 42.9 % | 2.2 |
| triple-spiral | 1.87 | 39.0 % | 59.0 % | 1.5 |

Monotone in both columns. Nothing in the ceiling census knows about the dimension census
— one integrates Taylor radii, the other fits a sausage exponent — so the ordering is the
cost model being right, not an artefact shared by the two. (`mini-seahorse` failed as a
self-similarity control, below, but it is still a legitimate location, and it usefully
extends the range down to d = 1.22.)

The last column is the interesting one: **where the geometry is generous, our loose bound
wastes the most** (8.6× at the sparsest view, 1.5× at the densest). Effort on tightening
the radius pays exactly where there is room to skip, and is pointless in spiral country.

**The local dimension is well below 2, and it varies by location.** `d` runs 1.51
(misiurewicz) to 1.87 (triple-spiral) among the classic views. Since anchors/pixels ~
h^(2−d), each decade of resolution buys 10^0.49 ≈ 3.1× at the misiurewicz point and
10^0.13 ≈ 1.4× at the triple spiral.

**`d` is stable under zoom where it should be.** The misiurewicz view reads 1.52 (R² 0.999)
at σ = 1e-3 and 1.51 (R² 1.000) at σ = 1e-9 — six decades apart, same number to the second
decimal. That is the census reproducing the asymptotic self-similarity of M at Misiurewicz
points, and it is the strongest evidence that the pipeline measures geometry rather than
its own grid, budget, or reference.

**Our reach is geometry-limited to within a factor ~2.** `ρ/DE` sits at 0.047–0.056 median
with quartiles inside a factor 1.5 — no long left tail, so there is no population where the
bound collapses. The theoretical value for a cubic remainder at `REACH_TOL = 1e-3` is
tol^(1/3) ≈ 0.1, so the measured radius is about 2× tighter than the model's own asymptote,
and everything else is the geometry.

**The gap between what we get and what the geometry allows is 1.5–8×, not 100×.** A 20×
larger radius (ρ = DE instead of 0.047·DE) does not buy 400× in anchors, because both ends
are dominated by the pixels within a pixel of ∂M, which no radius helps. Read as speedups
against computing every pixel: the ceiling is 1.7× (triple spiral) to 4.9× (misiurewicz)
today, against a geometric limit of 2.6× to 18×. **The super-pixel axis is worth a small
single-digit factor at these depths, and we hold roughly half of it in log terms.** That is
a bound on the whole direction, not on one implementation of it.

### The one lever the census points at

`REACH_TOL = 1e-3` is not a visual budget — it is ~16× tighter than one. `reach.rs`'s own
instruments say so: `nu_tolerance_at_bailout(1e-3) ≈ 1/500` of an iteration, while one
palette texel at period 256 is `palette_nu_quantum(256) = 1/32`, and at the app's default
period 1886.72 it is 0.23. Since ρ ∝ tol^(1/3), spending the visually free 16× multiplies
the reach by 16^(1/3) ≈ 2.5 and divides the anchor count by ~6 — which is most of the
remaining distance to the floor, from one constant.

The instrument to validate that before believing it already exists: `nu_branch_census`'s
`proxyFail` column, which measures how often the |z|-relative proxy accepts a pair whose
ν error already exceeds the ν budget. Re-run it at the loosened tolerance; if `proxyFail`
stays at zero, the 6× is real.

### The lever, measured (29 July 2026)

Both censuses now carry a tolerance sweep. `ρ_next` and `ρ_der2` are both cubic criteria
(`⅙·|·|·ρ³ = tol·|·|`), so `log2 ρ` is affine in `log2 tol` with slope ⅓: every row below is
the *same walk* re-solved by an exact shift (`cubic_reach_log2_shift`), not a re-run and not
a model. `tol_for_nu_budget` inverts `nu_tolerance_at_bailout` exactly, so a row can be named
by the palette texel it buys.

| row | tol | ×baseline | ρ× | anchors× |
|---|---:|---:|---:|---:|
| baseline | 1.000e-3 | 1.00 | 1.00 | 1.00 |
| P=1 texel | 5.864e-5 | 0.06 | 0.39 | 0.15 |
| P=256 texel | 1.474e-2 | 14.74 | 2.45 | **6.01** |
| P=1886.72 texel | 9.722e-2 | 97.22 | 4.60 | **21.14** |

**The ÷6 is exactly right, and it is the wrong number to quote.** The anchor *ratio*
improves as ρ⁻², but `ext%`/`all%` are capped at one anchor per pixel, and the capped
population is what the census already identified as dominant. Frame speedup against
computing every pixel:

| view | baseline | P=256 texel | P=def texel |
|---|---:|---:|---:|
| seahorse | 2.83× | 3.38× | 3.87× |
| elephant | 2.29× | 2.89× | 3.37× |
| triple-spiral | 1.69× | 1.87× | 2.03× |
| misiurewicz | 4.90× | 7.77× | 10.69× |
| mini-seahorse | 27.52× | 47.09× | 71.37× |

A 6× anchor reduction buys **+11 % to +71 %** of frame, not 6×. Worth having, not
transformative, and monotone in `d` exactly like every other column here.

**The proposed go/no-go test fails on its own terms.** `proxyFail` was never zero: it reads
3.01–4.22 % at the baseline, and loosening to the P=256 texel roughly *doubles* it to
6.06–8.20 %. Against a FIXED budget (one P=256 texel, which does not move when the tolerance
does) the same rows go 2.83–3.88 % → 6.06–8.20 %. This is the earlier Gate B decision
reproduced: the relative-`|z|` proxy is not a universal quality test.

**But the failure population is entirely one thing.** Splitting accepted pairs by whether
the target escapes at the anchor's iteration:

| view | sameFail (baseline → P=256 → P=def) | diffFail (same rows) |
|---|---|---|
| seahorse | 0.00 % → 0.00 % → 0.01 % | 99.67 % → 91.47 % → 19.01 % |
| elephant | 0.00 % → 0.00 % → 0.00 % | 93.66 % → 75.14 % → 6.75 % |
| triple-spiral | 0.00 % → 0.00 % → 0.03 % | 99.22 % → 90.78 % → 21.48 % |
| misiurewicz | 0.00 % → 0.00 % → 0.01 % | 99.54 % → 91.80 % → 35.74 % |

`sameFail` is **0.00 % everywhere, at every tolerance up to 97× the baseline**. One hundred
percent of the failures are escape-iteration branch crossings. The proxy is not "too loose";
it is *exact where no branch is crossed and blind where one is*, and no choice of tolerance
changes that — which is why tightening to the P=1 texel (ρ×0.39, 6.7× MORE anchors) still
leaves 1.09–2.07 % failing.

**So the lever is not the tolerance, it is a branch-crossing predicate.** Gate it, and the
tolerance can go to the P=def texel — ρ×4.6, 21× fewer anchors, 0.00–0.03 % measured failure
on the pairs the gate keeps. That predicate is the discrete statement of §"certify the escape
time is constant on the disk": the anchor already holds `z` and `z′` at its own escape
iteration, so bounding `|ẑ|` above the bailout at `n` and below it at `n−1` over the disk is
an enclosure evaluation, not a new theory.

**And the tolerance axis is capped anyway.** `nu_tolerance_at_bailout` is only defined for
`tol < 1/2` (past it the perturbed value drops under the bailout and ν stops existing), so
the largest reach the tolerance can ever buy is `(0.5/1e-3)^(1/3) = 7.94×` — still short of
the `ρ = DE` geometric limit at ρ×20. The last stretch is not a constant; it is model order.

### …and where that lever does NOT apply

`blaEpsilon` (default 1e-3) looks like the same constant and is not. The block seeds use
it as `α = ε·|Z|` for affine and `α = √ε·|Z|` for Padé (`bla_seed`), which is tempting —
loosening ε by 16× would multiply an affine radius by 16. **Do not.** The two tolerances
bound different things:

- `REACH_TOL` is applied **once**, at the escape iteration, to a value that goes straight
  into the palette. Comparing it to a palette texel is legitimate, and the comparison is
  what makes the 16× visually free.
- `blaEpsilon` is a **per-step linearization** tolerance. Its error re-enters the orbit and
  is amplified by every derivative that follows, which is precisely why the composition
  rule carries `α = min(left.α, right.α/|A_left|)` and why the certified-validity machinery
  exists at all. There is no palette quantum to compare it against.

If someone does want to move it, the instrument is already there too: the Padé benchmark
counts `mismatches` and `max_delta` against an exact per-pixel walk. Loosening ε without
that count staying at zero corrupts the image, not just the timing.

### Views that did not resolve, and why

Those rows are results too — they say the window is not a boundary window:

- `elephant @ 1e-9` — 100 % interior. The centre is specified to seven decimals, so at
  σ = 1e-9 it is ~1e-8 off the intended boundary point and the window sits inside a
  component. A view centre is only usable to the precision it is written with.
- `triple-spiral @ 1e-9` and `seahorse @ 1e-9`'s first octave — the sausage reads ≈ 100 %
  at ε = σ/2: the whole window is inside the boundary layer, which is what a deep view IS.
  The fit uses the octaves below that; where fewer than three survive, no dimension is
  reported.
- `mini-seahorse` — **the control is inconclusive, and it says so in its own columns.** At
  σ = 2e-5 it fits beautifully (R² = 1.000) but reads d = 1.22 against the seahorse's 1.70,
  and `A(σ/2) = 33 %` against 75 %: two thirds of the window is *far* from ∂M, so this is
  not the same relative position in the copy — it is a sparser, more filament-like corner
  of it. The affine transport is the suspect: the size estimate is first order and the
  period-3 island is a large, visibly distorted copy, so `nucleus + Λ·w` places a point
  only to a few percent of Λ ≈ 4e-4, which is 20 window-widths off at σ = 2e-5. At
  σ = 2e-11 the same error puts the window entirely in the exterior (`A ≡ 0`).

  Doing this properly needs a Newton-refined preperiodic point *of the copy* rather than a
  transported one — the machinery is adjacent to `find_minibrot`'s but not the same. Until
  then the self-similarity evidence is the misiurewicz pair, which is stronger anyway:
  same point, six decades, same dimension.

## Caveats

- **Reference precision.** Past σ = 1e-4 the reference orbit is built in DBig and stored
  as f64 (what the production pipeline does); the pixels ride it in f64 perturbation.
  σ = 1e-9 is the depth limit of the *census*, not of the method — going deeper needs the
  pixel offsets in higher precision too, which is the renderer's own machinery.
- **Extrapolation length.** `floor@1080` extrapolates the fitted law from ε ∈ [σ/16, σ/4]
  down to one pixel (σ/540), i.e. five octaves below the fit. That assumes the power law
  continues — the self-similarity assumption. The misiurewicz pair (1.52 at σ = 1e-3, 1.51
  at σ = 1e-9) is the evidence for it; `mini-seahorse` was meant to be a second, transverse
  control and did not land on target.
- **Mean field ignores placement.** It integrates 1/(π·ρ²) rather than packing disks; the
  `pack` column measures the gap against a real greedy cover, on a crop whose absolute
  level is patch-dependent (an offset crop can land in easy or hard country — only the
  *ratio* is meaningful).
- **`int%`** conflates genuine interior with "would escape after the budget", as
  `reach.rs`'s `uns%` does. Where it is large it dominates every other column, because no
  exterior model can serve an interior pixel.
- The DE walk spends most of its time in `CFe::from_c(2.0, 0.0).mul(…)`; folding the
  factor 2 into the exponent the way `reach.rs`'s `cfe_double` does would roughly halve
  the census runtime. Same arithmetic, so it would not move a single number.

## What to do next, in order

1. ~~**Loosen `REACH_TOL` to the visual budget and re-run `nu_branch_census`.**~~ **Done,
   29 July 2026 — see "The lever, measured".** The ÷6 in anchors is exact; it is worth
   +11 % to +71 % of frame, not 6×; and `proxyFail` does not say whether it is safe, because
   it doubles when loosened and was never zero. The measurement replaced the lever: `sameFail`
   is 0.00 % at every tolerance and 100 % of failures are escape-iteration branch crossings.
   **Next on this axis is a branch-crossing predicate, not a constant.** Certify that the
   escape iteration is constant over the anchor's disk — an enclosure of `|ẑ|` above the
   bailout at `n` and below it at `n−1`, from the `z`/`z′` the anchor already carries — then
   the tolerance can be set from the palette texel with a measured 0.00–0.03 % failure.
2. **Do not invest further in the super-pixel geometry itself.** The floors say the whole
   direction is worth 2–7× at these depths and we hold about half of it in log terms; the
   `ρ/DE` quartiles say the remaining half is a factor ~2 in radius, not an order of
   magnitude.
3. **Drop `reach.rs`'s reference-length cap and give it a DBig reference**, so its own
   deep rows stop reporting starvation as interior.
4. **Route by location, not by depth.** `d` varies 1.51 → 1.87 between views at the same
   zoom, and the floor with it (5 % → 39 %). A dispatch that measures the local sausage
   over two octaves — cheap, the renderer already has per-block counters — would know
   which of those it is in before deciding how hard to try.
