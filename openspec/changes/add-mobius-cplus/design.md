# Design — add-mobius-cplus

Source math: `MOBIUS_CPLUS_IMPLEMENTATION.md` (repo root; numerically verified
externally — `JET_BLA_FINDINGS.md` §12–13, `Julia_Mobius_proof_EN.pdf`,
`Mandelbrot_Mobius_companion_EN.pdf`, `Jet_bivariate_theorem_EN.pdf`). All section
references `note §N` below point into that file.

## Context

Perturbation rendering iterates `z ← 2·Z_n·z + z² + c` against a high-precision
reference orbit, with Zhuoran rebasing. Three block-skip modes exist today:

| mode | block map | radius | runtime guards | field verdict |
|---|---|---|---|---|
| BLA | `A·z + B·c` | heuristic `ε·\|A\|` | beta·dcMag, H2, min_a (G) | baseline |
| Padé | `(A·z + B·c)/(1 + D·z)` | heuristic `√ε·\|A\|` | same + pole guard | **speed default**, ~2× jet |
| jet | `Σ a_ij z^i c^j`, k ≤ 3 | certified rule (V), per order | `\|z\| < r_k` only | **rigor default**, 2× slower |

The jet change (`add-jet-approximation`, complete) built the machinery this change
reuses: exact D_s = 6 bivariate-jet levels (`jet.rs`), the scalar majorant walk, the
anisotropic-polydisc discipline, the staged (orbit / R_c / ε·c_max) cache, worker
partial-table acceptance, and — from its perf rounds — the descent optimizations
(hoisted per-level gates, split vec4 radius sidecar, per-pixel level hint) plus the
measured lesson that all-floatexp evaluation costs ~2× on the GPU.

Möbius-c+ unifies the fork: `m(z,c) = ((A + A'·c)·z + B·c) / (1 + (D + D'·c)·z)` where
`A' = c₁₁ + B·D` and `D' = −(c₂₁ + D·c₁₁)/A` exactly annihilate the `zc` and `z²c`
cross-terms of the composed block map — precisely the terms guard (G) exists for. One
certified radius per block covers everything (denominator bound included). The jet
becomes a build-only tool; the Padé form (plus 2 cmuls) remains the runtime vehicle.

Why it wins where Padé already wins: the [1/1] form's pure-z error is third-order with
the superconvergence constant `|c₃₀ − c₂₀²/c₁₀|/|c₁₀|` (small on near-parabolic
dynamics — the note §6.4 makes it a validation target). Why it wins where Padé loses:
the historical (G) block (seahorse, steps 26→50, |2Z₃₉| ≈ 5.4e-3) drops from err
≈ 1.5e-9 to ≤ ~5e-13 at |c| = 1e-14, residual scaling ~c² (note §6.3).

## Goals / Non-Goals

**Goals:**
- Fourth mode `mobius+`, end-to-end, beside untouched BLA/Padé/jet.
- Runtime: ONE comparison `log2|z| < r` per probed block; zero heuristic guards; the
  Padé apply + 2 cmuls; ~80 B blocks with per-block shared exponents (no fe evaluation
  on the shallow path).
- Build: reuse `jet.rs` levels/majorant verbatim; new coefficient extraction + q_ij
  compensation + certified radius scan; build-integrity invariants checked in tests.
- Staged cache: radius re-solve on (ε, c_max) change without orbit access (improve on
  the note's "regenerate per view").
- CPU harness with the note §6 battery BEFORE any WGSL work.
- #applications ≥ Möbius simple by construction (r_c+ ≥ r_Möbius); wall-clock ≈ Padé.

**Non-Goals:**
- Removing/deprecating Padé or jet (follow-up decision after field A/B).
- Julia (c = 0) specialization — the c=0 degenerate case must WORK (A'·c, D'·c vanish)
  but gets no dedicated path.
- Tuning D_s, polydisc grids, or scan resolution beyond the note's defaults.
- Second-stage jet fallback for blocks with r below the delta band (note §6.7 census
  decides IF it is ever needed; not built now).

## Decisions

### D1 — Block record: BlaStep-style shared exponents, radius in a vec4 sidecar

Per block, GPU-side, two index-aligned buffers (the pattern proven by the jet perf
rounds):

- **Coefficient record (~72 B)**: `(ax, ay, bx, by, apx, apy) × 2^ab_exp` — A, B, A'
  share one exponent — and `(dx, dy, dpx, dpy) × 2^d_exp` — D, D' share one — plus the
  two i32 exponents. Mantissas rescaled at serialization.
- **Radius sidecar (16 B vec4)**: `x = r` (log2 domain, f32; −∞ ⇒ never applied),
  `y, z, w` = spare/pad (level-gate max rides the level directory as today).

A descent probe reads the sidecar only; the 72 B record is read once on application.
Rationale: one cache line per applied block; the shallow path evaluates in plain f32
with one ldexp reconstruction per group (exactly today's Padé apply); no per-coefficient
fe (the jet's measured 2×).

*Risk absorbed*: A'-vs-A and D'-vs-D exponent spreads are unmeasured (the jet D7 spike
measured spreads across degree groups, a different question; BlaStep already shares
A/B successfully). A build-time spike test measures the spreads on the D7 orbit set
FIRST; if a pair exceeds the shared-mantissa budget (~24 bits), that coefficient gets
its own exponent (record grows ≤ 8 B — layout freedom, not a redesign).

*Alternative rejected*: all-floatexp records (jet layout) — measured 2× wall-clock.

### D2 — Build pipeline: jet levels reused verbatim; extraction and certification new

Per reference orbit, in the async worker (all in `reference_calculus`):

1. **Jet levels** — `jet::build_jet_levels` unchanged (D_s = 6, exact closure, seeds
   `a₁₀ = 2Z, a₂₀ = 1, a₀₁ = 1`). Emitted from min skip 4 as today — the note's l = 0..1
   levels exist only inside the merge recursion, never serialized (note §5 skips them
   at runtime anyway).
2. **Coefficients** — `A = c₁₀`, `B = c₀₁`, `D = −c₂₀/c₁₀`, `A' = c₁₁ + B·D`,
   `D' = −(c₂₁ + D·c₁₁)/A` (note §3). Degenerate `c₁₀ = 0` (prefix blocks from Z₀ = 0)
   ⇒ r = 0, never applied — matches the jet's degenerate-block rule.
3. **Compensated remainder** — `q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1}` minus
   {A at (1,0), A' at (1,1), B at (0,1)}. Build-integrity invariant: `q₁₀ = q₀₁ = q₂₀ =
   q₁₁ = q₂₁ = 0` to ~1e-14 relative on EVERY block (note §4.1) — asserted in debug
   builds and covered by a test; it is the integrity check of steps 2–3.
4. **Majorant** — `jet_majorant_pre` reused for ρ; then
   `M_Q = (1 + |D|R_z + |D'|R_zR_c)·M + |A|R_z + |A'|R_zR_c + |B|R_c` (note §4.2).
5. **Radius** — condition (V): `REST(x, c_max)/DEN(x, c_max) ≤ ½·ε·(|A|·x + |B|·c_max)`
   with `REST = Σ |q_ij| x^i y^j + M_Q·θ^(D_s+1)·((D_s+2)−(D_s+1)θ)/(1−θ)²`,
   `DEN = 1 − |D|x − |D'|xy` required > 0.5 (note §4.3). Solved by DESCENDING GEOMETRIC
   SCAN — x = 10^lg, lg from log10(0.999·R_z) down to −16 in 0.1 steps, first success
   wins. The condition is not guaranteed monotone in x (as x → 0 both sides approach the
   pure-c comparison — the H2 ghost); bisection is UNSOUND here, unlike the jet's
   monotone H_k. Maximized over the anisotropic polydisc grid
   `R_z ∈ {3e-2, 1e-2, 1e-3} × R_c = s·c_max, s ∈ {3e3, 3e5}` (note: both isotropic
   failure modes were lived).
6. **~~Merge validity chain~~ — REMOVED (patch v2 Fix 1, measured).** The v1 spec
   applied the Möbius-simple cap `r ← min(r_formula, r_x, r_y / (|A_x| + r_y·|D_x|))`.
   This was WRONG for c+: the c-augmented scalar majorant walks every step of the
   block, so condition (V) already certifies the entire composed map on
   `|z| ≤ r_formula, |c| ≤ c_max, DEN > 0.5` — the intermediate point is inside that box
   by construction. The cap was actively harmful — `|D_x| ≈ 4e3` at near-critical
   passages collapsed the radius (measured ÷1.6e6 on the seahorse 38→40 block) and the
   `min` propagated recursively to every ancestor, dropping the whole near-critical
   region to exact stepping. Removing it (r = r_formula) restored smooth-dynamics parity
   with Padé and halved the feigenbaum deficit; the O(N·ε) referee
   (`mobius_global_error_and_parity`) stayed green, confirming the chain was not
   load-bearing for the proof (the composed-map majorant subsumes it — the earlier
   "alternative rejected" reasoning below was the mistake).

*Alternative — REJECTED, was wrong*: keeping §4.4 "because the transport argument needs
the intermediate point inside the sub-block's certified region". True for Möbius-simple
(single-step transport); false for c+ where the majorant already covers the composed
block. The measurement (and the surviving global-error test) settled it.

### D3 — Error scale is `ε·(|A|·x + |B|·c_max)`, never `ε·|A|·x`

The |A|x-only scale vanishes as x → 0 while REST keeps its pure-c terms — radii collapse
to zero (note §7, lived failure). Encoded once in the (V) evaluator; the CPU harness
asserts nonzero radii at shallow scales as a regression tripwire.

### D4 — Staged cache lifecycle (jet D6 transposed, against the note's advice)

The note (§7) says "regenerate the table when the view scale changes". We do better,
exactly as the jet's D6 — the machinery exists:

- **Jet levels + coefficients (A…D')**: keyed by orbit length; orbit-only data.
- **Per-block bounds** `{|q_ij| moduli, M_Q per polydisc, child-chain terms}`: keyed by
  the R_c headroom stamp (ladder minimum); CPU-side only.
- **Radii**: keyed by (ε, c_max); re-solved by re-running the scan over stored bounds —
  O(#blocks × scan points) scalar work, no orbit access. Zoom-in inside headroom:
  re-solve lazily; beyond headroom: bounds re-walk (majorant); reference rebuild
  dominates long before.
- Serialization mirrors the jet split: coefficient buffer re-uploaded only on orbit
  change; radius sidecar re-uploaded on every re-solve.

### D5 — Runtime application (both shaders, shared shape with today's Padé)

Descent identical to the jet's optimized one (hoisted per-level maxR gates in
registers, radius sidecar probe, per-pixel level hint, greedy-on-skip). On acceptance:

- shallow: reconstruct `(A, B, A')` and `(D, D')` groups via 2 ldexp; `Ae = A + A'·dc`,
  `De = D + D'·dc` (2 cmuls); then today's Padé apply `(Ae·z + B·dc)/(1 + De·z)` in f32.
  No pole guard — DEN > 0.5 is inside r. Optional paranoia guard `|1 + De·z| > 1e-3` →
  fall through to exact step, behind a const flag, default ON for the first field round.
- deep: same in fe (dz is fe there; coefficients reconstruct to fe from mantissa+exp —
  cheap, two exponents per block, not per coefficient).
- derivative: `∂m/∂z = (Ae − B·De·dc... )` — derived analytically from the [1/1] form as
  today's Padé path does (`der' = (Ae/M²)·der + ∂m/∂c/M`), reusing the der fold/renorm
  discipline from the jet perf round (#3).

*Alternative rejected*: a separate order/short-form descent (jet's adaptive k) — one
form per block means zero shape divergence per warp (note §5's explicit point).

### D6 — Mode plumbing: additive fourth mode

`ApproximationMode::MobiusCPlus = 4` (Rust), `'mobius'` (TS union), `blaReady.kind:
'bla' | 'jet' | 'mobius'`, own GPU buffers + bindings (next free slots on all three
shaders), Settings control gains one option, RenderStats knows flag 4. The worker
applies the jet-class repost throttle (1.5× growth) and the Engine accepts partial
tables — the build is jet-class, and the field fixes from the jet round (stats label,
stale-table blackout) are inherited by construction, not re-discovered.

### D7 — Validation order is the note's §6, CPU-first

The battery gates shader work in this order: (1) q-zeros integrity, (2) closure reuse,
(3) the historical (G) block numbers, (4) superconvergence constant, (5) global
ρ_N/(N·ε) ≤ 5 across seahorse/near-parab/spiral/Feigenbaum at ε ∈ {1e-12, 1e-15},
(6) #applications ≥ Möbius everywhere + wall-clock vs Padé, (7) the r-below-delta-band
census (expected ≈ 0 at |c| ≤ 1e-14; if significant on real views, the jet second stage
becomes a follow-up proposal). Performance comparisons in #applications and wall-clock
ONLY — the weighted-ops convention inverted this project's ranking twice (note §7).

### D1 spike outcome (task 1.1 — measured 2026-07-03)

Worst within-block log2 spreads of the extracted coefficients, per orbit (levels
from skip 2; seahorse escapes at iteration 3091 in f64, so its long-block rows are
absent — the three bounded orbits cover the decision):

| orbit | worst {A,B,A'} | worst {D,D'} | worst A-B pair | where |
|---|---|---|---|---|
| cusp −0.75 (32k) | 28 bits | 13 bits | 25 bits | top levels (A-A' dominates) |
| period-2 −1.25 (32k) | 28 bits | 14 bits | 22 bits | top levels |
| Feigenbaum −1.401155 (131k) | **61 bits** | **39 bits** | 34 bits | skip 128k / skip 2k–8k |

Spreads grow ~linearly with the level (A' picks up a 1/A-flavored factor; D'
carries 1/A outright), so no group stays under the ~24-bit budget on long blocks —
even the A-B pair exceeds it on Feigenbaum. **Decision: per-coefficient private
exponents** (the D1 fallback, taken for all five): record = 5 × (f32 x, f32 y,
i32 e) = **60 B/block**, one cache line, uniform ldexp reconstruction in the
shaders, no spike-dependent special cases. The 16 B vec4 radius sidecar is
unchanged (x = r log2, y = f32-safe fast-path flag, z/w spare).

## Risks / Trade-offs

- [A'/D' exponent spread breaks shared-exponent packing] → D1 spike measures first on
  the D7 orbit set (cusp, period-2, seahorse-edge, Feigenbaum); fallback is a private
  exponent for the offending coefficient (+≤8 B, no redesign).
- [Build cost is jet-class (~10 s at 1M orbit) for the would-be default mode] → worker
  throttle + partial tables inherited from the jet field round; incremental/chunked
  build stays the recorded follow-up lever if field testing complains.
- [Scan granularity (0.1 decade) under-certifies r by up to ~26%] → accepted (skip
  economics are logarithmic); tighten to 0.05 later if the census warrants — a
  constant, not a design change.
- [Non-monotone (V) region could make the scan accept a spuriously high x with invalid
  lower x] → the scan takes the FIRST success from above; validity at the accepted x is
  certified pointwise by (V) itself, independent of lower x behaviour — but keep the
  §6.5 global-error test as the end-to-end referee.
- [D' over-corrects at coarse |c| ≥ 1e-12] → by design the certified radius absorbs it
  (never bypass (V), note §7); the census at interactive scales tells us the cost.
- [Fourth mode bloats Settings/plumbing] → accepted short-term for benchmark value;
  deprecation of Padé/jet is an explicit follow-up decision.
- [End-of-reference rebase makes z ~O(1), no skips after] → NORMAL (note §7); the
  harness never benchmarks past reference length (lived ×20 dilution bug).

## Migration Plan

Additive; `bla` remains the default. If `mobius+` misbehaves, users stay on
`pade`/`jet`. Deprecation path (collapse Padé/jet onto mobius+) is a separate proposal
gated on: field A/B ≥ Padé wall-clock on the user's views AND census ≈ 0 dead-radius
blocks at depth.

## Open Questions

- ~~Shared-exponent spike outcome (D1)~~ — RESOLVED (see the spike table above):
  within-group spreads reach 61 bits ({A,B,A'}) / 39 bits ({D,D'}), so every
  coefficient carries a private exponent; record = 60 B (5 × JetCoeffFe).
- Paranoia denominator guard: implemented behind `MOBIUS_PARANOIA_GUARD`
  (default ON, both production shaders + debug). Keep/drop decided after the
  field round (6.3) — expected to never fire (DEN > 0.5 is inside the radius).
- ~~Scan grid~~ — REVISITED after the first field round (mobius ≥ 2× slower
  than Padé on most views): the note's s ∈ {3e3, 3e5} is deep-zoom-calibrated —
  at interactive c_max (~1e-5) it makes R_c = 0.03..3 and the majorant walk's
  +R_c-per-step c-channel saturates every block past ~30 steps (all long-block
  radii −∞, turns up to 27× Padé's). Adding the jet's low rungs
  (s ∈ {3e3, 3e5, 1024, 32}, 12 candidates) restored the coarse regime:
  27× → 3.7× (cusp), 1.0× at c_max = 1e-9. Bounds build cost doubles
  (0.11 s → 0.43 s at 131k) — acceptable. The REMAINING coarse-regime gap
  (3.7–6.3× at c_max = 1e-5) is structural: the c-linear form's irreducible
  pure-c² residual (q₀₂ = c₀₂, untouched by A'/D') against a budget capped by
  DEN > 0.5 bounds certified skips at L ≈ ε/c_max. This is the note's §6.7
  contingency verbatim: at moderate zoom the certified mode pays for its rigor;
  Padé skips past it by being heuristic (its true error exceeds ε there).
  Mobius+'s domain is |c| ≲ 1e-9 where it matches Padé's turn counts with
  certification.
- ~~`blaLevelCount` active-table audit~~ — RESOLVED, and it was NOT trivial:
  the Engine now tracks `currentBlockTableKind` and the frame gate requires it
  to match the mode. Necessary because mobius tables ship in the JET GPU
  buffers (same 12 B coefficient element, stride 9 vs 5; the compute layout
  already sits at the 8-storage-buffer WebGPU default limit, so dedicated
  bindings were not an option — this supersedes D6's "own GPU buffers +
  bindings"). The audit also closed a latent jet↔pade stale-table window.
- Deprecation of Padé/jet onto mobius+: separate follow-up decision, gated on
  the 6.3 field A/B; the CPU census inputs (r_c+ ≥ r_Möbius on 100 % of
  blocks, ~8× fewer loop turns than plain Möbius on slow orbits, census ≈ 0)
  are recorded in `MANDELBROT_MOBIUS_CPLUS_IMPLEMENTATION.md`.
