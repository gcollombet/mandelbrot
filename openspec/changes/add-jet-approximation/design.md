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

### D6 — `c_max` lifecycle: monotone, lazily re-solved

- Build stamps the table with `c_max_build` and `R_c = s·c_max_build`.
- **Zoom in** (`c_max` shrinks): radii stay valid (conservative). Re-solve (V) lazily —
  e.g. when `c_max` drops 4× — to recover reach; async, non-blocking.
- **Zoom out** with `c_max ≤ R_c`: M still bounds the polydisc; re-solve (V) eagerly
  before use (cheap, D4).
- **Zoom out beyond `R_c`** (≥ s× ≈ 10 octaves): full radii rebuild (majorant re-walk);
  in practice the reference itself is rebuilt long before this.

### D7 — Exponent strategy decided by a numerical spike (first task)

At depth, `|A| ~ 1e154` already forces implicit-exponent f64 at build and floatexp on
GPU. Jet coefficients scale anisotropically per (i,j) (`a_ij ~ M/(R_z^i R_c^j)`), so a
shared exponent per total degree is plausibly wrong. Spike: build jets on a real deep
orbit (seahorse-depth and floatexp-depth), log per-coefficient exponent spreads across
blocks/levels, then choose:
- exponent per coefficient (safe, 9×(2×f32 + i32) ≈ 108 B/block), or
- shared exponent per degree group (compact) if measured spread within a group stays
  ≲ 2⁴⁰.
Build side is unconditionally floatexp-per-coefficient (f64 mantissa + i64 exp).

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

## Open Questions

- Exponent sharing on GPU (D7 spike decides).
- `R_z` candidate grid size (start: 8 powers of two centred on `√ε·|A₁₀|`-scale;
  tune in the CPU harness).
- Lazy re-solve threshold for zoom-in (start: `c_max` drop ≥ 4×).
- Whether the per-level gate keeps the existing `max_radius_bits` whole-level rejection
  semantics unchanged with `r_K` (expected yes — same monotone shape).
