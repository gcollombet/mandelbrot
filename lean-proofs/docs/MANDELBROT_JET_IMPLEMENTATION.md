# Jet approximation mode — implementation notes

Companion to `MANDELBROT_PADE_IMPLEMENTATION.md`. Source math: *"Bivariate jets
for iteration skipping: exact closure and a single validity test"*
(Jet_bivariate_theorem_EN.tex); planning artifacts in
`openspec/changes/add-jet-approximation/`.

## 1. What it is

The third iteration-skipping mode beside affine BLA and Padé [1/1]. Each block
stores the **truncated bivariate Taylor jet** of the composed block map:

```
Φ(z, c) ≈ Σ_{1 ≤ i+j ≤ k}  a_ij · z^i · c^j        (applied order k ≤ K = 3)
```

Two structural properties drive everything:

- **Exact closure** (note, Lemma 1): `J_D(g∘f) = J_D(J_D g ∘ J_D f)`. Merging
  two stored jets and re-truncating gives *exactly* the jet of the composed
  map — the table carries no analytic truncation error. The cross terms
  (`zc`, `c²`, …) that force BLA/Padé's guards are ordinary stored
  coefficients here.
- **A single validity test** (rule (V)): per block and order, an entry radius
  `r_k` is derived offline from a composable scalar majorant plus anisotropic
  Cauchy estimates. The runtime test is one comparison `log2|dz| < r_k` — the
  `min_a` guard (G), the H2 test (`|B|·|c| < ε`) and the `beta` correction do
  not exist on the jet path (they are subsumed; note, Prop. 6).

Orders are **adaptive**: the low-order jet coefficients *are* the affine data
(`a₁₀ = A`, `a₀₁ = B`), coefficients are stored degree-major, and the shader
applies the smallest valid order — a far-inside entry pays an affine-sized
read and evaluation.

## 2. Build pipeline (Rust, `reference_calculus/src/jet.rs`)

Per reference orbit, in the async worker:

1. **Seeds** — `a₁₀ = 2Zₙ, a₂₀ = 1, a₀₁ = 1` (exact: the step is a degree-2
   polynomial). Coefficients live in `CFe` (f64 mantissa pair + i64 exponent):
   the spike measured within-block exponent spreads of **75+ bits** within one
   total-degree group, ruling out shared exponents (design D7).
2. **Merges** — exact truncated composition at stored degree `D_s = 6`
   (`jet_compose`), on the same power-of-two level scaffold as the BLA table
   (min skip 4, `auto_max_skip` cap). Degrees 4..6 exist only to tighten the
   remainder estimate; they never ship.
3. **Majorant** — per block × 8 `R_z` candidates: walk
   `ρ ← |2Z_j|·ρ + ρ² + R_c` over the block's steps (`jet_majorant_pre`, on a
   bit-surgery positive-real floatexp), with `R_c = s·c_max`, `s = 1024`.
   At a near-critical dip the walk floors at `ρ² + R_c` and the majorant
   explodes if the polydisc is too big — this is precisely how (V)
   rediscovers guard (G) at order 1. A saturation sentinel (`MAJORANT_INF`)
   marks unusable candidates.
4. **Rule (V)** — split into two sufficient gates (which certify the whole box
   `[0, x] × [0, c_max]`, making radii *monotone-sound under zoom-in*):
   - (a) z-channel: `H_k(θ) ≤ ½ε·|a₁₀|·R_z` with `H_k` monotone in
     `θ = max(x/R_z, c_max/R_c)` — solved by 16-step bisection, warm-started
     across orders;
   - (b) pure-c gate: `Σ_{d>k} |a₀d|·c_max^d + M·tail ≤ ½ε·|a₀₁|·c_max`
     (the ghost of H2).
   The per-step cap `|z| ≤ √ε·min|2Z_j|` (theorem hypothesis) is folded in.
5. **Serialize** — `JetStep` (120 B): radii `r₁ r₂ r₃` (log2, f32) first, then
   the 9 degree ≤ 3 coefficients as `(f32, f32, i32)`; `JetLevel` directory
   with a per-level `max_r3` fast-reject gate.

Caching is staged (`ensure_jet_table`): coefficients keyed by orbit length;
bounds keyed by the `R_c` headroom; radii keyed by (ε, c_max). A zoom within
the headroom re-solves radii in closed form — no orbit access; the worker
re-posts the table after ≥ 2 octaves of scale drift (`updateView`).

Build cost (release, single-thread): 0.37 s at 32k orbit, 1.4 s at 131k,
10.6 s at 1M — masked by the async worker + progressive rendering.

## 3. Runtime (WGSL, both shaders)

`try_apply_jet` in `mandelbrot.wgsl` (fragment, bindings 5/6) and
`mandelbrot_brush.wgsl` (compute, bindings 8/9), shared by the shallow and
deep loops — evaluation always runs in floatexp because per-coefficient
exponents exceed the f32 range even at shallow zooms (the shallow wrapper
converts `dz` at the edges):

1. level directory gate on `max_r3`, then per-block `log2|dz| < r₃`;
2. smallest valid order: `r₁` → k=1 (reads 2 coefficients), `r₂` → k=2 (5),
   else k=3 (9);
3. polynomial evaluation + the two partials; derivative update
   `der' = ∂Φ/∂z·der + ∂Φ/∂c` with exponents folded into `derS`;
4. the usual escape-jump guard. No pole guard (polynomials have none), no
   min_a/H2/beta.

Mode plumbing: `ApproximationMode::Jet = 3` (Rust) / `'jet'` (TS), the
`blaReady` worker message carries `kind: 'bla' | 'jet'` (strides 12 vs 30
floats), and the `blaLevelCount` uniform carries the *active* table's level
count.

## 4. Validation

- **Closure/unit**: merged jets equal direct polynomial expansion to rounding;
  associativity; majorant bounds sampled block maps; serialization
  round-trips. (`cargo test jet::`)
- **CPU harness** (`jet_run_pixel`, gates all shader work): remainder within
  `½ε(|a₁₀||z| + |a₀₁|c_max)` on 3 orbit classes; Prop. 6 oracle (r₁ = 0 on
  575/639 guard-flagged blocks, the 64 disputed ones directly verified sound);
  block derivative vs exact walk; end-to-end error ≤ e·N·ε with 11 orders of
  margin; zero iteration mismatches vs exact stepping.
- **Ops benchmark** (paper convention: exact 2, affine 2, Möbius 6, jet
  k(k+3)/2): feigenbaum **jet ×40.7** vs affine ×5.5 / padé ×24.3 (paper gave
  ×42); cusp jet ×214 ≈ affine ×204 (adaptive order holds the lookup-bound
  regime).
- **GPU** (Playwright + WebGPU, `tests/jet-mode.spec.ts`,
  `tests/jet-deep.spec.ts`): A/B vs BLA/Padé on the same view (jet's pixel
  diff vs BLA is *smaller* than Padé's — the deltas are block-sampling
  effects on shading, not iteration errors), zero validation errors, deep
  (1e-32, fe path) renders and converges, mode switches never rebuild the
  reference orbit.

## 5. Known limits / next steps

- The rigorous (V) radii keep a residual conservatism factor on slow orbits
  (paper: ~5×); the split z-channel / stored-c-terms evaluation is the
  identified next optimisation.
- Unifying BLA/Padé onto the jet table's order-1 prefix is possible but
  deferred (three comparable modes have benchmark value).
- Table memory is ≈ 3× the BLA table (120 B vs 48 B per block).
