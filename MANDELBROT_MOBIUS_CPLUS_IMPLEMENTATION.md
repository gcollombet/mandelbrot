# Möbius-c+ approximation mode — implementation notes

Companion to `MANDELBROT_PADE_IMPLEMENTATION.md` and
`MANDELBROT_JET_IMPLEMENTATION.md`. Source math: `MOBIUS_CPLUS_IMPLEMENTATION.md`
(externally verified; theory in `Julia_Mobius_proof_EN.pdf`,
`Mandelbrot_Mobius_companion_EN.pdf`, `Jet_bivariate_theorem_EN.pdf`,
`JET_BLA_FINDINGS.md` §12–13); planning artifacts in
`openspec/changes/add-mobius-cplus/`.

## 1. What it is

The fourth iteration-skipping mode: the Padé [1/1] vehicle augmented with
three c-coefficients (round 5 added F — the Chisholm-style denominator
c-slot),

```
m(z, c) = ((A + A'·c)·z + B·c) / (1 + (D + D'·c)·z + F·c)
A  = c₁₀        B = c₀₁        D = −c₂₀/c₁₀
F  = −c₀₂/c₀₁                  (annihilates the pure-c² term — resummation)
A' = c₁₁ + D·B + F·A           (annihilates the zc cross-term)
D' = −(c₂₁ + D·c₁₁ + F·c₂₀)/A  (annihilates the z²c cross-term)
```

where `c_ij` are the block's bivariate-jet coefficients. The annihilated
cross-terms are exactly the ones guard (G) exists for: on the historical
seahorse block (steps 26→50, `min|2Z| = 5.36e-3`, entry `|z| = 7.53e-13`,
`|c| = 1e-14`) plain Möbius errs `3.0e-9` while mobius+ sits at the f64
rounding floor `1.0e-15` (was `1.3e-12` for the 5-coefficient form; the c²
scaling is no longer observable under the floor) — measured by
`mobius_historical_g_block`. F lives in the DENOMINATOR (bivariate-Padé /
Chisholm placement): it RESUMS the pure-c geometric series instead of
correcting one order of it, which is what closes the shallow `cmax_c2` bind
(§5 round 5).

Validity is ONE certified entry radius per block: the runtime test is the
single comparison `log2|dz| < r`. No H2, no min_a/(G), no beta·dcMag, no
separate pole test — `DEN > 0.5` is folded into the radius. The result is
Padé's wall-clock shape (one rational apply + 2 cmuls) with jet-grade
certification.

## 2. Build pipeline (Rust, `reference_calculus/src/mobius.rs`)

Per reference orbit, in the async worker:

1. **Jet levels** — `jet_seed`/`jet_compose` reused verbatim (D_s = 6, exact
   closure), but streamed: only two jet levels are alive at a time; each block
   is reduced to its 5 coefficients + the |q_ij| moduli and the jet is dropped
   (`MobiusBlock` is ~5× lighter than a stored jet). ALL merge levels from
   skip 1 are retained — the §4.4 chain walks the tree from the leaves;
   emission to the GPU starts at skip 4.
2. **Compensated remainder** — `q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1} +
   F·c_{i,j−1}` minus {A, A', B} at their slots. Build integrity: `q₁₀ = q₀₁ =
   q₂₀ = q₁₁ = q₀₂ = q₂₁ = 0`, verified to 2^−52 relative (machine rounding of
   the largest cancelling term) on every block of every test orbit
   (`mobius_q_zeros_on_every_block`). The six slots then ship as exact zeros.
3. **Bounds** — per block, per R_c rung (`R_c = s·c_max, s ∈ {3e3, 3e5, 1024,
   32}` — the low rungs keep the c-channel finite at interactive c_max), R_z is
   BISECTED (patch v3) to the largest value keeping the majorant walk's peak
   ρ < 0.5 throughout (`jet_majorant_peak_pre` + `mobius_bisect_rz`, exact log
   bisection — the peak is monotone in R_z). Then
   `M_Q = (1 + |D|R_z + |D'|R_zR_c + |F|R_c)·M + |A|R_z + |A'|R_zR_c + |B|R_c`. The peak
   criterion holds ρ² strictly under the linear term, so the walk never enters
   the double-exponential runaway a too-large R_z triggers at near-critical
   passages — this is what recovers the long deep blocks (§5). The earlier
   fixed R_z grid ({3e-2..3e-5}) missed each block's own critical R_z and left
   42 long feigenbaum blocks saturated. Build cost: bounds ~3.4 s at 131k
   (~8× the fixed grid — 20 bisection walks × 4 rungs; async-worker-masked).
4. **Radius** — condition (V): `REST(x, c_max)/DEN ≤ ½ε(|A|x + |B|c_max)` with
   `DEN = 1 − |D|x − |D'|x·c_max − |F|·c_max > 0.5`, REST = stored |q_ij| monomials +
   Cauchy tail from M_Q. Solved by DESCENDING GEOMETRIC SCAN (0.1 decade,
   `0.999·R_z` down to 1e-16, first success from above) — the condition is not
   monotone in x, bisection is unsound here (unlike the jet's H_k). The
   pure-c REST terms are hoisted per block (`C_i = Σ_j |q_ij| c_max^j`), so a
   scan point costs ~8 exp2.
5. **No merge validity chain** (patch v2 Fix 1). The §4.4 cap
   `r ← min(r_formula, r_x, r_y/(|A_x| + r_y·|D_x|))` is the Möbius-simple
   single-step rule; for c+ the majorant walks every block step so (V) already
   certifies the composed map — the cap is redundant AND harmful (`|D_x| ≈ 4e3`
   near-critical collapses the radius, ÷1.6e6 on seahorse 38→40, and the `min`
   poisons every ancestor). Radius = standalone (V) formula. Global-error
   parity confirms soundness held.
6. **Serialize** — `MobiusCoeffs` (72 B: 6 × (f32, f32, i32) — the spike
   measured within-group spreads up to 61 bits for {A,B,A'} and 39 for {D,D'},
   so every coefficient gets a PRIVATE exponent) + a 16 B vec4 radius sidecar
   (x = r log2, y = the f32-safe fast-path flag) + the jet-format level
   directory.

Caching is staged (`ensure_mobius_table`, mirror of the jet's): levels +
coefficients keyed by orbit length; M_Q bounds keyed by the c_max they were
walked with (re-walk on zoom-out or 4 octaves of zoom-in); radii keyed by
(ε, c_max) and re-solved from stored bounds — no orbit access, and only the
16 B/block sidecar re-uploads.

Build cost (release, single-thread): levels 0.22 s + bounds 0.06 s + radii
0.31 s at 32k orbit; 0.85 + 0.22 + 1.2 s at 131k — jet-class, masked by the
async worker + the 1.5× repost throttle + partial-table acceptance.

## 3. Runtime (WGSL, all three shaders)

`try_apply_mobius` in `mandelbrot.wgsl` (fragment), `mandelbrot_brush.wgsl`
(compute) and `dbg_try_mobius` in `mandelbrot_debug.wgsl` (probe counters and
timing parity). Mobius tables live in the JET GPU buffers — the coefficient
element (12 B x/y/e) is identical and the modes are exclusive; the compute
layout already sits at the 8-storage-buffer WebGPU default limit, so new
bindings were not an option. Binding 5/8 became a flat `array<JetCoeff>`;
jet indexes at stride 9, mobius at stride 6.

1. descent identical to the jet's optimized one: hoisted per-level max-r
   gates in registers, per-pixel level hint (+2 up-drift), alignment cap;
2. probe = one coalesced 16 B sidecar read; the 60 B record is read only on
   application;
3. shallow f32 fast path (sidecar flag + `|dc| > 1e-30` — mobius products are
   degree-1 in dc, so the gate is far looser than the jet's 2^-42):
   6 ldexp reconstructions, `Ae = A + A'·dc`, `De = D + D'·dc`, then
   `den = 1 + De·dz + F·dc`; deep path reconstructs to fe and runs the same
   shape;
4. analytic derivatives from the same values —
   `∂m/∂z = (Ae − m·De)/den`, `∂m/∂c = (A'·z + B − m·(D'·z + F))/den` — with
   the jet's der exponent-fold discipline (#3);
5. paranoia denominator guard `|1 + De·dz|² > 1e-6` behind
   `MOBIUS_PARANOIA_GUARD` (default ON for the first field round; the
   certified radius implies DEN > 0.5, so it should never fire);
6. first-escape rule as everywhere.

Mode plumbing: `ApproximationMode::MobiusCPlus = 4` (Rust) / `'mobius'` (TS),
`blaReady.kind: 'bla' | 'jet' | 'mobius'` (strides 12/27/18 floats). The
Engine tracks the ACTIVE table's kind (`currentBlockTableKind`) and the frame
gate requires it to match the mode — after a mode switch, blocks stay disabled
until the worker's repost lands (this also closed a latent jet↔pade
stale-table window).

## 4. Validation

- **Build integrity**: extraction vs direct formulas on hand-built jets; the
  five q-zeros at 2^−52 relative on every block; superconvergence constant
  `err_rel/x² = |c₃₀ − c₂₀²/c₁₀|/|c₁₀| ≈ 9.5` matched to 4+ decimals on the
  near-parabolic block, independent of block length (§6.4). (`cargo test mobius::`)
- **Radius soundness**: sampled blocks × entries within
  `ε(|A||z| + |B|c_max)` of the exact walk across (ε, c_max) ∈
  {(1e-6, 1e-9), (1e-4, 1e-5), (1e-12, 1e-14)}; radii survive the coarse
  regime (the |B|c_max error-scale term).
- **Global error** (`mobius_run_pixel`, Zhuoran rebasing): zero
  iteration/escape mismatches vs exact stepping, worst ρ_N/(N·ε) = 0.004
  (target < 5) across seahorse / near-parab / spiral (Misiurewicz, 400-iter
  budget — its f64 orbit escapes at 446) / feigenbaum, ε ∈ {1e-12, 1e-15},
  |c| ∈ {1e-13, 1e-14, 1e-16}; never measured past the reference length.
- **Census vs plain Möbius** (same build machinery with A' = D' = 0):
  r_c+ ≥ r_Möbius on 100 % of certified blocks; loop turns at |c| = 1e-14:
  near-parab 168 vs 1470 (8.7×), feigenbaum 2304 vs 18989 (8.2×), seahorse
  7388 vs 13104 (1.8×). Dead-radius census (§6.7, r below the 1e-11 delta
  band): 2/1151, 0/1245, 1/1156 ≈ 0 as predicted — no second-stage jet needed.
- **GPU** (Playwright + WebGPU, `tests/mobius-mode.spec.ts`,
  `tests/mobius-deep.spec.ts`): A/B vs BLA/Padé/jet on the intro view, flag 4
  with a live table, zero validation errors, mode round-trips (including the
  shared-buffer jet↔mobius switch) never rebuild the reference orbit; deep
  1e-32 (fe path) and the seahorse near-critical view render structured
  content and converge.

## 5. Field measurements (task 6.3 — IN PROGRESS)

**Round 1** (2026-07-03): mobius+ ≥ 2× slower than Padé on most views. Root
cause: the note's anisotropy grid saturated the majorant at interactive c_max
(§2.3) — fixed with the low-s ladder (CPU turns: 27× → 3.7× Padé on cusp at
(1e-3, 1e-5); 1.0× at c_max = 1e-9). The REMAINING coarse-scale gap is
structural: the c-linear form's pure-c² residual bounds certified skips at
L ≈ ε/c_max (the note's §6.7 contingency) — Padé skips past it by being
heuristic. Expected field profile after the fix: ≈ Padé at |c| ≲ 1e-9,
a few × slower at |c| ~ 1e-5, always certified.

**Round 2** (2026-07-03): after the ladder fix, Padé still notably faster —
including at c_max = 1e-50 (deep fe path) — and visibly less precise. CPU
diagnostics (`mobius_deep_turns_and_op_weight_vs_pade`, `--ignored`) locate
BOTH causes; they are two faces of one fact:

1. **Per-application fe cost.** On smooth dynamics (cusp) mobius takes the SAME
   number of turns as Padé at every depth, yet costs ~1.7× per accepted block:
   the deep apply is ~13 fe cmul + 1 fe inversion + 5 private-exponent
   coefficient reconstructions + both analytic partials, vs Padé's ~8 cmul +
   1 inversion with raw shared-exponent loads. Inherent to the certified
   rational-with-derivatives form on the floatexp path (the jet's measured-2×
   lesson, milder here).
2. **Radius conservatism at near-critical passages.** On feigenbaum the
   certified majorant walk floors at `ρ² + R_c` through a tiny-|2Z| step and
   kills the long-block radii — mobius falls back to short blocks while Padé
   keeps skipping. But Padé skips there ONLY because its heuristic radius
   `√ε·|A|` ignores the near-critical amplification: those skips exceed the ε
   error bound. **This is exactly "faster AND less precise" — the same fact.**
   (The CPU Padé bench lacks the shader's (G)/(H2) guards, so it overstates the
   gap; the real-shader deficit is smaller but real.)

**Verdict.** The note's headline "wall-clock ≈ Padé partout, jamais plus lent"
does NOT hold on the GPU — it was an operation-count claim, not fe-weighted
wall-clock (the very convention trap §7 warns about). Mobius+ is a CERTIFIED
mode, in the jet's family, not a faster-Padé: it pays ~1.7× on smooth views and
declines the imprecise skips Padé takes on near-critical ones. Where certified
depth at near-critical passages is the goal, JET beats mobius+ (it stores the
z²c, z³ terms mobius annihilates, so it skips deeper there — Playwright
seahorse: jet skip 9.5 > mobius 6.4 > pade 7.5-with-error).

Deprecation decision: **do not collapse Padé onto mobius+.** Mobius+ earns its
place only if the user needs a cheap certified mode and can accept ~2× Padé;
otherwise Padé (speed, heuristic) and jet (rigor, deepest near-critical skip)
already bracket it.

**Round 3 — patch v2 (2026-07-04), the real fix.** The slowness was the
CERTIFIED-RADIUS COMPUTATION, not the form. Two build-side changes (no shader
edit — the descent just reads better radii):

- **Fix 1**: removed the §4.4 merge validity chain (see §2.5) — it collapsed
  near-critical radii by `|D_x|` and poisoned every ancestor by `min`.
- **Fix 2**: widened the R_z grid to {3e-2, 1e-2, 3e-3, 1e-3, 3e-4, 1e-4, 3e-5}
  — the slow L ≥ 256 blocks optimize at R_z = 1e-4..3e-4, absent from v1.

CPU turn-count vs Padé (was → now):

| view | before | after |
|---|---|---|
| cusp (smooth) | 1.00× | **1.00×** |
| period-2 (smooth) | 1.50× | **1.00×** |
| feigenbaum 1e-30/1e-50 (near-critical) | 9.80× | **5.20×** |

All smooth dynamics reached exact Padé parity (applied-length histograms
identical). The §6 battery stayed green — the chain removal is sound. The
residual feigenbaum 5.2× is diagnosed by the blocking-term census
(`mobius_patch_v2_instrumentation`, `--ignored`):

- **deep (1e-30)**: 42 long blocks (skip ≥ 128) SATURATE the scalar majorant —
  NOT a c_max-scale bind. Patch-v2 Fix 3 (per-|c| bands) would not help. The
  real lever is a tighter majorant or a block-split at the near-critical step
  (beyond this patch; the note's §6.7 jet-second-stage is the fallback).
- **shallow (1e-9)**: 77 blocks bound by the pure-c² residual (`cmax_c2`) — this
  IS c_max-scale, so Fix 3 (bands c_max/16, c_max/256 keyed to the pixel's real
  |c|) would recover them. Not implemented: it adds a per-band radius sidecar +
  runtime band select, and does nothing for the deep case that motivated it.

**Round 4 — patch v3 (2026-07-04): R_z bisection = the tighter majorant.**
Replaced the fixed R_z grid with a per-block, per-rung LOG BISECTION to the
largest R_z keeping the majorant peak ρ < 0.5 (see §2.3). This holds ρ² under
the linear term so the walk never runs away — exactly the "tighter majorant"
lever. CPU turn-count vs Padé, deep near-critical (the field pain):

| view | v1 | v2 (chain+grid) | v3 (bisection) |
|---|---|---|---|
| feigenbaum 1e-30/1e-50 | 9.8× | 5.2× | **1.00×** |
| cusp / period-2 (all depths) | — | 1.0× | **1.00×** |

Deep census: feigenbaum 1e-30 **refused = 0** (was 42 saturated). GPU seahorse
near-critical: mobius realizedSkip **7.6 ≥ Padé 7.5** (was 6.4), wall-clock
2044 ms ≈ Padé 2035 ms. The §6 battery + the new polydisc-invariant test stayed
green — the bisected majorant is sound (no over-certification). Build cost:
bounds 3.4 s at 131k (~8× the grid, async-worker-masked).

**Verdict update.** Patch v2+v3 make mobius+ ≈ Padé on wall-clock at BOTH smooth
and near-critical passages (turn parity), while certified — the note's headline
now holds. The only residual is the per-application ~1.7× fe cost (smooth) and
the shallow (c_max ~ 1e-9) near-critical c² residual.

**Round 5 — the F coefficient (2026-07-10): the shallow c² bind closed.**
Sixth coefficient `F = −c₀₂/c₀₁` in the DENOMINATOR (`den = 1 + (D+D'c)z +
Fc`) — the bivariate-Padé (Chisholm) placement: it RESUMS the pure-c channel
(`B·c/(1+Fc)`) instead of correcting one order, and annihilates q₀₂ exactly
(6 constructed zeros; A'/D' formulas gain `F·A` / `F·c₂₀` terms — see §1).
The unified table adopted the same extraction (2026-07-10): its record swapped
the raw a₀₂ slot for F (a₀₂ = −F·B, size-neutral), the §11 jet-tier identities
carry the F terms (a₁₁ = A′ − B·D − F·A, a₂₁ = −D′·A − D·a₁₁ + F·D·A), and the
GPU c+/jet tiers plus the periodic header follow — see
`MANDELBROT_UNIFIED_TABLE_IMPLEMENTATION.md` §1; `mobius_from_jet_nof` is
deleted. CPU A/B vs the pre-F build (same census, no regression anywhere):

| view (turns vs Padé) | 5-coeff | 6-coeff (F) |
|---|---|---|
| feigenbaum ε=1e-6, c=1e-9 (the c² bind) | 2.91× | **0.99×** |
| feigenbaum ε=1e-4, c=1e-5 | 1.65× | **0.89×** (ahead of Padé) |
| feigenbaum ε=1e-3, c=1e-5 | 1.35× | **1.00×** |
| cusp / period2 c=1e-5 (non-c² bind) | 3.6–6.2× | unchanged |

Blocking-term census (feigenbaum shallow 1e-9): `cmax_c2`-bound blocks
**77 → 6**; deep stays refused = 0. The historical (G) block error drops to
the f64 rounding floor (1.0e-15, was 1.3e-12). Serialization: 60 → 72 B/block
(stride 15 → 18 floats, WGSL `MOBIUS_COEFF_STRIDE` 5 → 6); shader den/∂m/∂c
gain the F terms in both f32 and fe paths. At coarse c_max (intro view) the
pure-c channel keeps binding through the higher q₀ⱼ terms — realizedSkip ~1
there, as with the 5-coefficient form: F moves the c-channel wall from c² to
c³, it does not remove it. GPU seahorse 1e-10: realizedSkip 8.1 ≈ Padé 8.3,
structured render, table radii bit-identical to the certified CPU build.

Field-debug postmortem (the stride checklist): the first field round showed a
FLAT render with huge realizedSkip — the worker's `coeffFloats` copy width in
`referenceWorker.ts` was still 15, so the tail sixth of the coefficient
buffer (exactly the LONG blocks, serialized last) reached the GPU as zeros;
zero coefficients map every dz to 0, so pixels pin to the reference orbit
(flat color) while every radius test passes (runaway skip). A stride bump
touches FOUR places: Rust `MobiusCoeffs`, WGSL `MOBIUS_COEFF_STRIDE` (brush +
debug), Engine `MOBIUS_COEFF_FLOATS`, and the worker's `coeffFloats` — the
last one is the easy one to miss and the CPU battery cannot catch it. Also
beware STALE DEV SERVERS when validating: playwright's baseURL is :5173 and
does not start its own server; a long-lived vite there serves pre-change code
and turns the GPU specs into no-ops.

**Round 6 — boundary-certification study (proposition (c), 2026-07-10):
ABORT by the phase-0 gate.** The idea: for flagged blocks, replace the
triangle-inequality REST by a MEASURED sup|Q| on the distinguished boundary
(max-modulus lemma: Cauchy tail + Ehlich–Zeller discrete interpolation +
pointwise |e| ≤ U_Q/den_lower). The diagnostic census
(`mobius_fallback_conservatism_census`, kept as an instrument) ran the oracle
(no aliasing rigor, DEN relaxed to 2^-4) over 6 regimes and killed the piste
honestly:

| flagged population | verdict |
|---|---|
| `storedq` (317/348/78 blocks — the mass) | conservatism ×1.0 — the triangle REST is TIGHT on stored monomials; this is MODEL error of the [1/1]-c+ form, not certification slack → piste (d) [K/1] |
| `cauchy` (the (c) target) | conservatism REAL (×22 feigenbaum, ×32k seahorse, 9/10 recovered) but population tiny post-F/v3: turns gain ≤ 2.7 % ≪ the 20 % GO bar |
| `DEN` (17–36 blocks) | structural [1/1] pole, 0 recovered even at den > 2^-4 → piste (d) pushes the pole |
| coarse cusp/period2 (the 3.7–6× vs Padé pain) | 100 % SATURATED rungs — no finite M_Q, no rigorous aliasing possible → Fatou gates (JET_BLA_FINDINGS §18) |

Conclusion: F (round 5) + the v3 bisection already consumed the exploitable
certification slack; what remains is model error, pole, and parabolic
transit. The (c) machinery (measured-sup lemma) stays relevant as the residue
certifier §18 will need (`Ψ∘F − (Ψ+1)` on the petal) — the census helpers
(`grid_sup_q`, `triangle_rest_log2`, `den_lower`) are its seed.

**Round 7 — [2/1]-c+ (proposition (d), 2026-07-10): the superconvergent
numerator, GO'd by its own phase-0 census.** The round-6 census located the
flagged mass in `storedq` (model error of the [1/1] form — triangle-REST
tight) and `DEN` (the [1/1] pole): both are what findings §14 predicted the
[K/1] ladder absorbs. A test-local [K/1] census (K = 2, 3;
`mobius_kplus_conservatism_census`, kept as instrument) measured: [2/1]
captures nearly all the gain ([3/1] adds ~3 % for one more coefficient), so
K = 2 shipped:

```
m(z, c) = ((N₂·z + A + A'·c)·z + B·c) / (1 + (D + D'·c)·z + F·c)
D  = −c₃₀/c₂₀   (resums the z-channel pole — superconvergence: q₃₀ AND the
                 model-flow q₄₀ vanish; c₂₀ = 0 falls back to [1/1])
N₂ = c₂₀ + D·c₁₀ (annihilates z² exactly)
A'/D'/F keep their formulas, with the new D. The [2/1] SEED is the exact
step: (z² + 2Z·z + c)/1 — zero remainder.
```

CPU turns vs Padé (production build, was [1/1]-F → now [2/1]):

| view | [1/1]-F | [2/1] |
|---|---|---|
| feigenbaum ε=1e-4, c=1e-5 | 0.89× | **0.54×** |
| feigenbaum ε=1e-3, c=1e-5 | 1.00× | **0.68×** |
| feigenbaum ε=1e-6, c=1e-9 | 0.99× | **0.80×** |
| seahorse ε=1e-4, c=1e-10 (phase-0 oracle) | 0.95× | **0.58×** |
| cusp / period2 (all regimes) | — | unchanged (coarse saturation → §18) |

Median radius gain +1.5 to +2 decades. Mechanics: q₃₀ joins the constructed
zeros (MOBIUS_Q_ZEROS_K2, 7 slots), M_Q gains |N₂|R_z², the record grows to
84 B / stride 21 floats / WGSL stride 7 (all FOUR stride sites updated per
the round-6 checklist), apply gains one cmul (num Horner) and
∂m/∂z = (2N₂z + Ae − m·De)/den. The unified table adopted the same [2/1]
extraction (2026-07-10, record-size-neutral a₃₀/a₀₂ ↔ N₂/F swap): its 9-slot
record became [A, B, D, N₂, A′, D′, F, a₁₂, a₀₃] (prefixes 24/48/84/108 B),
the §11 identities carry the N₂ terms (a₂₀ = N₂ − D·A, a₂₁ = −D′A − D·a₁₁ −
F·a₂₀, a₃₀ = −D·a₂₀ — exact iff c₂₀ ≠ 0, live REST on the fallback), and the
Padé tier became the plain view of the same extraction (A′ = D′ = F = 0 with
D/N₂ kept: the record ships ONE D, so a [1/1] Padé tier would see q₂₀ = N₂
live). The periodic header stays [1/1] (quadratic fixed points). The
dispatch-modeling census (`unified_tier_census`) uses `mobius_build_levels` +
`mobius_build_levels_plain_k2`; `mobius_build_levels_k1` remains a baseline
instrument. See `MANDELBROT_UNIFIED_TABLE_IMPLEMENTATION.md` §1.

**Round 8 — parabolic Fatou gates (findings §18, 2026-07-11): GO'd by its
phase-0 census; CPU prototype delivers the coarse regimes.** The round-6/7
residue — cusp/period2 at (ε = 1e-3, c_max = 1e-5) stuck at 3.7×/6.0× Padé
with 41-42 fully saturated long blocks — is the quasi-parabolic transit §18
predicted. Everything below lives in `mobius.rs` (tests + two pub fns), zero
GPU/unified.rs changes.

*Phase 0 (`fatou_gate_phase0_census`, --ignored, kept as instrument) — GO on
all three criteria:*

1. **Detection.** Two-stage detector per §18: (stage 1) closest return m ≤ 64
   with |Z_{n+m} − Z_n| < 0.05 AND |λ_m − 1| < 0.25 (λ_m = Π 2Z ≈ κ^q — both
   census gates are period-DOUBLING boundaries, κ → −1, q = 2, so m = 2p and
   never |κ| → 1 itself, exactly §18's warning); (stage 2) on the composed
   m-step return jet: fixed-point coalescence (roots of
   c₃₀u² + c₂₀u + (c₁₀−1), gap < 0.05) and petal coefficient |c₃₀| > 1e-2
   (the ν = 2 generalization of "a ≠ 0" — at a doubling gate the u²
   coefficient carries the multiplier offset and nearly vanishes; the germ is
   u + a₃u³). Result: ONE span covering the orbit tail on cusp (7..2999,
   m* = 2) and period2 (13..2997, m* = 4); saturated blocks inside a verified
   gate: **41/41 and 42/42**. Controls: seahorse λ-hits are all REJECTED by
   stage 2 (gap ~0.5); feigenbaum verifies real micro-gates (the doubling
   accumulation — near-parabolic high-period returns with gap ~4e-3) but
   **verified ∩ saturated = 0** on both controls: the operative detector
   (gate must cover a saturated block) is clean.
2. **Gain oracle.** 94-95 % of the pixel-loop turns sit inside the gate
   (longest in-gate run ≈ the whole 3000-iteration budget — the census rows
   are interior/boundary pixels); free-transit replay: cusp 3.69× → 0.29×
   Padé, period2 6.04× → 0.35×.
3. **Residual.** The right truncated Ψ is the partial-fraction integral of
   the FORMAL LOG of the return map: Ψ = Σ ρᵢ·log(u − rᵢ), ρᵢ = 1/P'(rᵢ),
   P = log F (Lie-series fixed point, `gate_log_flow`), roots = the
   coalescing fixed-point cluster (Durand–Kerner). Two traps measured on the
   way: (a) taking P = F − id floors the residual at ½PP′ ~ 3/2·a₃²·u⁵ —
   1.2e-3 (cusp) / 1.1e-2 (period2) per step, reproduced exactly, and NO
   truncation order fixes it; the formal log removes it (its corrections are
   the iterative-residue terms of the Écalle–Voronin normalization);
   (b) the simple-germ asymptotic −1/(a·u) must have its pole split over the
   root pair (ν = 2). With P = log F at order 8: per-step ε_Ψ ≤ 6e-9 (cusp) /
   3.8e-6 (period2, entry 0.01), and on TRUE through-gate escape transits the
   end-to-end exit error is 1e-9..8.5e-7 with the triangle-certifiable budget
   Σ|res|·|P| ≤ 3e-9 / 1.8e-6 ≪ ε = 1e-3 — certifiable per-step, no
   cancellation credit needed. Entry radius is gate-specific: cusp holds at
   0.04, period2 at 0.04 produces WRONG transits (Δiter 157k on a probe) but
   holds at 0.02 (Δiter ≤ 1) — the per-gate entry radius must come from the
   residue certifier, not a constant.

*Stage 1 (`mobius_pow_stable` + `mobius_pow_stable_at_coalescence`).* §18's
divided-difference / double-eigenvalue matrix power was implemented and
MEASURED AGAINST: the eigen path — divided differences or naive λ^k — floors
at an intrinsic ζ-cancellation as dc → 0 (λ₂ − Ae ≈ B·c·De/(Ae−Ff) formed
from O(1) quantities: 5.3e-6 relative at dc = 1e-8, k = 1000 on the period2
tail block; the §17 w-form sits at 1.3e-1 there). NORMALIZED BINARY POWERING
(the map is projective, so per-squaring normalization is free) has no
decomposition at all: ≤ 3e-14 on every case including exact coalescence,
O(log k). That is the stable stage-1 form; wiring into the (currently
disabled) §17 periodic runtime is a header-evaluation swap, no format change.

*Stage 2 CPU prototype (`fatou_gate_prototype_pixel_loop`, --ignored).* The
§18 "prototype sûr" point by point: per pixel, (1) recentre on the pixel's
OWN persistent cycle (closed form for p ≤ 2 — the c-channel is absorbed
exactly, as §17's runtime quadratic does), (2) Ψ built once per (pixel,
phase) from the recentered return series (order 8), (3) fast-forward by an
integer k via adaptive Ψ-plane hops (Euler predictor + Newton corrector on
the per-hop principal-branch increment, |Δu| ≤ 0.2·distance-to-nearest-pole;
~30-100 hops ≈ O(10³) flops per transit of ANY length), (4) rebase
dz = β + u − Z_ref and resume the ordinary certified loop. Out-of-sector,
degenerate Ψ, failed Newton, k < 2 → systematic fallback (the gate is never
load-bearing). Results:

| view (3000-iter census row) | mobius [2/1] | prototype | Padé |
|---|---|---|---|
| cusp (ε=1e-3, c=1e-5) | 3.69× | **0.71×** | 1.00× |
| period2 (ε=1e-3, c=1e-5) | 6.04× | **0.37×** | 1.00× |

Through-gate escape probes (400k budget, table-less): transits of 15 735 to
104 721 iterations covered by ONE jump each, escape iteration EXACT (Δiter =
0 at cusp/entry 0.04 and period2/entry 0.01; Δiter = ±1 at period2/entry
0.02, consistent with the certified ε at the bailout). Interior probes
classified at O(1) after gate entry — the §17 interior gain at the parabolic
boundary where Koenigs fails.

*Wiring rounds a/c/d — `gates.rs` (2026-07-11): production build path +
serialization + CPU model of the GPU runtime, DONE.* New module
`reference_calculus/src/gates.rs` (zero unified.rs/shader changes). The
design pivots on one fact: the coalescing root pair ~ ±√dc is NOT analytic in
dc, so the record ships analytic data only — β_j(dc) and the log-flow
coefficients p_k(dc) as order-2 Taylor (Cauchy-circle fit, L = 8 samples at
|dc| = r_dc = 4·c_max) plus far-root SEEDS; the runtime solves the cluster
(quadratic seed + Newton on the shipped P(dc), ρᵢ = 1/P′(rᵢ) — ~500 flops
per pixel·phase, shader-sized). Taylor-in-dc also factors the parabolic
degeneracy exactly (κ̃(0) = 0: the record's linear slot carries dκ̃/dc at full
f32-mantissa accuracy at ANY |dc|). Load-bearing details, all measured:

- **d[] channel**: u = d_n + dz − Δβ_j(dc) with d_n = Z_n − β_j(c₀)
  precomputed in f64 and shipped as plain f32 pairs. Forming Z − β at runtime
  (fe, f32 mantissa) would cost 3e-8 absolute on u; the small-quantity
  channel keeps it at ~1e-8·|d| ≪ that. The certification originally
  recentered on the QUANTIZED β₀ and mis-measured a ~1e-8 coordinate shift
  the runtime never sees (δβ/droot amplification near the cluster) — it now
  recenters exactly as the runtime does.
- **Certification** (stage c): measured sup of |Ψ∘F − Ψ − 1| per annulus band
  (r/2ⁱ), on the QUANTIZED record through the REAL runtime code path
  (Taylor eval + root solve included), dc on two circles off the fit grid,
  ×2 margin. The per-gate entry radius is DERIVED: descend the rung ladder
  {0.04, 0.02, 0.01, 0.005} until the estimated through-transit budget
  (per-band crossing counts (1/a₃)·Δ(1/r²) + bottleneck dwell 2π/κ̃, times
  band residuals, converted at r_entry) fits ε/2 — cusp lands on 0.04,
  period2 on 0.01 via its truncation far-roots near |u| ~ 0.05, reproducing
  the prototype's hand-found radii. Certified bands: cusp 8.3e-7 → 6.5e-9,
  period2 8.1e-6 → 2.7e-8.
- **Runtime budget**: the hop loop accumulates Σ dk·eps_band(|u|) in flight
  and refuses when budget·|P(u_end)/u_end| > ε/2 — value-error conversion at
  the LANDING point, so deep (interior-classifying) jumps pass on tiny |P|
  while a through-jump from an under-certified radius refuses itself. The
  detector (stage d) is phase-0's two stages + the SATURATION coupling
  (feigenbaum's real doubling micro-gates verify but touch no saturated
  block → off; seahorse spans are stage-2-rejected).
- **ν = 2 topology**: a period2 transit can EXIT the certified radius at the
  mid-transit excursion (the col between the two petals, |u| ~ 0.011 at
  entry radius 0.01) — the jump legitimately stops at the boundary, the
  ordinary loop carries the pixel over the col, and a SECOND jump finishes
  the transit (measured: 2 jumps, Δiter = 0). Re-injection pixels (exit →
  graze the repelling fixed point α, |2α| ≈ 1.45 amplifies ANY error to O(1)
  in ~60 steps → re-enter) have chaotically sensitive escape iterations that
  even exact f64 stepping cannot pin (measured: the true landing continues
  112k iterations, a 2.3e-8-accurate landing escapes in 263) — their VALUE
  stays inside the certified budget; their iteration count is untestable and
  no f64 method (Padé included) does better.
- **A/B** (`gate_table_runtime_parity`, --ignored): census rows through the
  production Möbius table + gates: cusp **0.77×** Padé (was 3.69×), period2
  **0.82×** (was 6.04×), escape flags and iterations EXACT (Δiter = 0) on
  every row pixel and every single-transit long probe (transits 52k-224k
  iterations, 1-2 jumps, 265-878 turns table-less).
- **Serialization** (stage a): flat f32 stream per gate — header
  (start/len/p/q/r_entry/r_dc/eps_band/nfar), per phase β-tail + p_k Taylor
  + far seeds as 3-float private-exponent slots, d[] as f32 pairs;
  round-trip test bit-exact with identical probe-run behavior.

*Stage b — GPU wiring (2026-07-11): WIRED AND PIXEL-EXACT, shipped DORMANT
pending hop-loop optimization.* The gate blob rides the unified radius
sidecar (zero new bindings — the compute layout sits at the 8-storage-buffer
limit; zero TS changes — worker/Engine copies are length-driven): header
entry [10] is the gate directory (always emitted, OOB-safe), gate records +
the d[] channel follow (`gates_serialize_vec4`). `try_gate_jump` in
`mandelbrot_brush.wgsl` (shallow loop, unified mode) is the gates.rs runtime
in f32: per-pixel header/β-tail hoist, phase-0-aligned attempts (one d[] read
when out of radius), runtime cluster solve, banded-budget hop loop.
`ensure_unified_table` builds gates behind the saturation coupling + the
shallow guard (r_dc ≥ 1e-12 — f64 reference c), keyed with the radii stage.

Field results (`tests/gates-mode.spec.ts`, cusp/period2 at 1e-5 with the
iteration multiplier raised to 2.0 → ~33k iterations — gates only exist at
coarse c_max, saturation being a coarse-scale phenomenon, and only pay above
the profitability floor):

- **Correctness: acquired.** With gates ACTIVE, both views render
  pixel-identical to gate-less Möbius-c+ (0.00 % significant diff), zero
  WebGPU validation errors, flag 5 + live table. The f32 runtime lands the
  Ψ-jumps correctly end-to-end.
- **Wall-clock: not yet.** Active gates cost 3-4× on cusp (16-24 s vs ~5 s)
  and parity-to-worse on period2 — the Ψ-hop loop is transcendental-heavy
  under SIMT (each hop: up to 8 log+atan2 per Newton iteration, warp-wide
  divergence), the CPU 0.77×/0.37× verdict does not transfer naively.
  Traps found and fixed on the way: f64 Newton tolerances spin at ±1 ulp in
  f32 (exit at |step| ≲ 3e-6·|un| or small phase residual — it converts
  through the tiny |P|); per-attempt header re-reads (hoisted); vite's
  optimizeDeps cache serves a STALE wasm across rebuilds (purge
  node_modules/.vite + fresh server — the round-5 zombie lesson, dep-cache
  edition). The engine's realizedSkip readback is mode-entangled and cannot
  assert gate firing.
- **Shipped state:** `GATE_GPU_EMIT = false` in lib.rs (build + certification
  + serialization + shader path all live and tested; the sidecar ships a
  zero-count gate directory — one probe read per pixel). The spec passes in
  both states and re-exercises the active path when the flag flips.

*Observability round (2026-07-12): runtime toggle + jump counters — the
gates PROVABLY FIRE on GPU.* `set_gate_emission(bool)` (wasm → worker
message → Engine.setGateEmission) rebuilds the sidecar in place — no
rebuild/cache-purge cycle to exercise the active path; `workStats` gains
gateJumps/gateFails (raw counts, `engine.gateStatsApprox`) — the ONLY
reliable firing signal (realizedSkip and the tier counters are
mode-entangled). Measured on the boot flow (33k-iteration parabolic views):
**cusp 1 847 199 jumps / 18 degraded attempts, period2 923 600 / 3** —
essentially one Ψ-jump per texel (the interior-classification transit) with
a ~1e-5 failure rate, pixel diff 0.00 % vs dormant, zero validation errors.
Wall-clock active ≈ 2-3× dormant on these views (down from 4-10× before the
f32 Newton exits + per-pixel header hoists) — still dormant by default.

Field traps found (all load-bearing for the next rounds):
- **Table-repost race**: any mid-session invalidation (mode switch, toggle)
  lets pixels brute-force to convergence BEFORE the rebuilt table lands (the
  orbit is already present; blaReady is not) — the whole re-render runs
  table-less. Gates (and blocks!) only participate in boot-style flows or
  renders longer than the rebuild. The specs measure on fresh boots; an
  engine-side "hold first dispatch for a staged table" is a candidate fix.
- **Escaping references**: an off-parabolic view centre gives a reference
  that transits and ESCAPES mid-orbit; λ-hits in the post-bailout tail
  produced a garbage 1.8k-index "gate". `build_gates` now detects on the
  bounded prefix only, and serializes longest-span-first (the shader arms
  gate 0 only).
- **f32 orbit**: the navigator's reference is f32 — detection/certification
  survive it (native repro test `gate_build_on_f32_orbit`).
- The f64 Newton tolerances / vite dep-cache staleness traps from the
  stage-b note remain the top reproducibility hazards.

*Optimization round (2026-07-12): gates ON BY DEFAULT.* Three findings, in
increasing importance:

1. The hop loop was NOT the cost: the counters measured **3.05 hops/jump,
   2.2 Newton iterations/hop** (≈55 clog per jump) — already frugal. The
   optimizations still landed (mirrored CPU+WGSL, parity Δiter = 0 intact):
   far-field linearization (cluster poles exact, far roots one cdiv per HOP
   instead of one clog per Newton iteration), cluster-only root polish (far
   seeds get one pass), early accept on a small phase residual, arming floor
   kMax ≥ 2048.
2. **The prior "2-4× slower" verdict was largely a measurement artifact**:
   the "dormant" timing sampled an already-converged view (a constant ~2.0 s
   of idle polling — never the convergence). With SYMMETRIC full-boot
   timings (reference + table + convergence on fresh pages, both states):
   33k-iteration views sit at parity within the boot noise (±30 % run-to-run
   — the A/B non-determinism note strikes again), and at **100k iterations
   the gates win 25-33 % reproducibly** (10.1-10.2 s vs 13.2-15.2 s across
   3 runs, cusp). The gate's O(1) transit vs the linear brute cost: the
   crossover sits near ~30-50k iterations and everything above widens it.
3. One more plumbing trap: the worker's RESET message applies
   `set_gate_emission(!!message.gateEmission)` — the Engine must ship the
   field in the reset payload or every reference reset silently disables
   emission (found when the default-ON boot read zero jumps).

Shipped: `gate_emission: true` default (Rust + Engine in sync), kill switch
`engine.setGateEmission(false)` live, spec inverted (default boot must fire
gates — cusp 1 847 199 jumps / period2 1 611 675, fails ≤ 146, pixel diff
0.00 % vs the gate-less boot; kill-switch boot must read zero). Non-gate
views (unified baseline spec) untouched.

*Remaining levers (next rounds):* (1) cost-aware entry-radius rung;
(2) repeated-measurement harness for the 33k-band noise (the brute↔brute
floor calibration the jet field round already wanted); (3) the table-repost
race fix so gates (and blocks) participate in interactive re-renders, not
just boots; (4) the deep-zoom build variant (perturbed-reference cycle
solve).

Still open:

- [x] ~~shallow near-critical: `cmax_c2` binds ~100 blocks at 1e-9~~ — CLOSED
      by round 5's F coefficient (77 → 6 bound blocks, turn parity reached);
      the per-|c| band sidecar (Fix 3) is no longer needed.
- [ ] per-application 1.7× fe cost: drop the redundant coeff `fe_renorm`s + fold
      ∂m/∂c into the [1/1] derivative → ~1.4×. GPU-unmeasurable here. (F adds
      one cmul + one fe_add per application on this path.)
- [ ] Padé/jet deprecation decision now that wall-clock parity holds.
- [ ] §18 gates field round: make the GPU jump pay under SIMT (levers 1-5 in
      the stage-b note) and flip GATE_GPU_EMIT. The full path (build,
      certification, serialization, WGSL runtime, Playwright spec) is wired
      and PIXEL-EXACT; only the wall-clock verdict holds it dormant.
- [x] ~~boundary-certification fallback (proposition (c))~~ — ABORTED by the
      round 6 census gate: remaining refusals are model error (`storedq` →
      piste (d) [K/1]), pole (`DEN` → idem) and saturation (→ §18 Fatou), not
      certification slack.
- [x] ~~unified table F adoption (a₀₂ slot ↔ F swap + GPU tier updates + §11
      identity refresh)~~ — DONE 2026-07-10: one shared extraction
      (`mobius_from_jet`), record size-neutral, periodic header at 6
      coefficients; closes the same c² bind for the `auto` dispatch.

## 6. Known limits / next steps

- Memory: all merge levels from skip 1 are retained for the §4.4 chain
  (~460 B/block × 2·orbit_len blocks ≈ 120 MB at a 131k orbit, ~1 GB at 1M).
  Levers if field testing complains: f32 log2 moduli, sparse q storage,
  closed-form skip-1/2 re-solve.
- The radii re-solve (scan over stored bounds) costs ~1.2 s at 131k — fine
  behind the worker throttle; tightening the scan to 0.05 decade (+~26 %
  radius accuracy) would double it.
- Deprecation of Padé/jet onto mobius+ is a separate decision gated on the
  field A/B (§5) + the census numbers above (both currently point to yes).
