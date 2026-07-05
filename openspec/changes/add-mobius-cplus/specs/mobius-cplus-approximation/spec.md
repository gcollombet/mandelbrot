# mobius-cplus-approximation — delta spec

## ADDED Requirements

### Requirement: Mobius-c+ mode is selectable end-to-end
The system SHALL expose a `mobius+` approximation mode alongside `perturbation`, `bla`,
`pade` and `jet`, selectable from the Settings mode control, propagated through Engine
and reference worker to the WASM navigator, and consumed by both the shallow (f32) and
deep (floatexp) shader paths. Selecting `mobius+` SHALL NOT alter the behaviour of any
existing mode, and the RenderStats panel SHALL label the mode correctly.

#### Scenario: Mode selection reaches the shader
- **WHEN** the user selects the Möbius-c+ mode in the approximation mode control
- **THEN** the navigator switches to the mobius+ table and both shader paths apply
  mobius+ blocks on the next render, without rebuilding the reference orbit

#### Scenario: Existing modes unaffected
- **WHEN** the user switches back to `bla`, `pade` or `jet` after using `mobius+`
- **THEN** rendering output for those modes is identical to before the mobius+ mode
  existed, and their tables are not rebuilt by the round-trip

### Requirement: Block coefficients derive from the bivariate jet
The build SHALL derive, per block, the five complex coefficients of the c-augmented
Möbius form `m(z,c) = ((A + A'·c)·z + B·c) / (1 + (D + D'·c)·z)` from the block's
bivariate jet: `A = c₁₀`, `B = c₀₁`, `D = −c₂₀/c₁₀`, `A' = c₁₁ + B·D`,
`D' = −(c₂₁ + D·c₁₁)/A`. A block whose `c₁₀` is zero (prefix blocks from Z₀ = 0) SHALL
receive radius 0 and never be applied.

#### Scenario: Cross-term annihilation invariant
- **WHEN** the compensated remainder coefficients
  `q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1}` (minus A at (1,0), A' at (1,1), B at
  (0,1)) are computed for any block of any test orbit
- **THEN** `q₁₀`, `q₀₁`, `q₂₀`, `q₁₁` and `q₂₁` are zero to ~1e-14 relative — the
  build-integrity check of the coefficient extraction

#### Scenario: Degenerate prefix block
- **WHEN** a block starts at orbit index 0 (so `a₁₀ = 2·Z₀ = 0`)
- **THEN** its serialized radius is −∞ (log2 domain) and the runtime never applies it

### Requirement: Certified entry radius per block
The build SHALL certify, per block, a single entry radius r such that condition (V)
holds for all |z| ≤ r, |c| ≤ c_max: `REST(x, c_max)/DEN(x, c_max) ≤
½·ε·(|A|·x + |B|·c_max)` where REST sums the stored |q_ij| monomials plus the Cauchy
tail from the scalar majorant, and `DEN = 1 − |D|·x − |D'|·x·c_max` is required > 0.5.
The radius SHALL be found by descending geometric scan (first success from above), NOT
bisection, and maximized over anisotropic polydiscs (`R_c = s·c_max` rungs, never equal
to `R_z`). The error scale SHALL be `ε·(|A|·x + |B|·c_max)` — never the |A|·x term alone.

R_z SHALL NOT be a fixed grid: per block and per R_c rung it SHALL be BISECTED (exact log
bisection — the majorant peak is monotone in R_z) to the largest value keeping the
majorant walk's peak ρ below 0.5 throughout. This holds the ρ² term strictly under the
linear one, so the walk never enters the double-exponential runaway that a too-large R_z
triggers at near-critical passages — recovering the long blocks a fixed grid left
saturated, with no over-certification (the walk is a valid majorant at any R_z; the
polydisc-invariant test verifies M bounds the true block map on the bisected polydisc).

#### Scenario: Bisected polydisc bounds the true map
- **WHEN** a block's R_z is bisected for a rung and the majorant M is computed there
- **THEN** the true complex block walk `w ← 2Z·w + w² + c`, sampled anywhere on
  `|z| ≤ R_z, |c| ≤ R_c`, satisfies `|w_out| ≤ M`, and `M ≤ ~0.5` (the peak criterion)

#### Scenario: Long near-critical blocks recovered
- **WHEN** a long block (skip ≥ 128) spans a near-critical reference step at deep c_max
- **THEN** the bisection finds a small-enough R_z that the majorant stays finite and the
  block certifies at the working band, where the fixed R_z grid left it saturated (−∞)

#### Scenario: Radius soundness against exact stepping
- **WHEN** a block is applied at any entry |z| < r with any |c| ≤ c_max (sampled over
  blocks × entry grid on the test orbits)
- **THEN** the application differs from exact perturbation stepping by at most
  ε·(|A|·|z| + |B|·c_max), with no runtime guard other than the radius comparison

#### Scenario: Radii survive shallow scales
- **WHEN** the table is built at an interactive (coarse) c_max
- **THEN** a nonzero fraction of blocks carries r > 0 — the |B|·c_max term of the error
  scale prevents the x→0 collapse

### Requirement: No merge validity chain (patch v2 Fix 1)
The certified radius of a block SHALL be its standalone condition-(V) formula radius,
with NO intermediate-validity merge cap. The Möbius-simple rule
`r ← min(r_formula, r_x, r_y/(|A_x| + r_y·|D_x|))` SHALL NOT be applied: because the
c-augmented scalar majorant walks every step of the composed block, condition (V)
already certifies the entire composed map on `|z| ≤ r_formula, |c| ≤ c_max, DEN > 0.5`,
so the intermediate point is inside that box by construction. The cap is not only
redundant but harmful — `|D_x|` at near-critical passages collapses the radius and the
`min` propagates recursively to every ancestor, dropping the near-critical region to
exact stepping.

#### Scenario: Radius equals the standalone formula
- **WHEN** the table is built for any reference orbit
- **THEN** every block's serialized radius equals its own `mobius_solve_radius` result,
  independent of its children's radii

#### Scenario: Global soundness holds without the chain
- **WHEN** the CPU pixel loop runs to N iterations against exact perturbation stepping
- **THEN** ρ_N/(N·ε) stays bounded and escape verdicts match — the chain was not
  load-bearing for the O(N·ε) guarantee (the composed-map majorant subsumes it)

### Requirement: Single-comparison runtime with no heuristic guards
The runtime SHALL apply a block after exactly one validity comparison `log2|z| < r`.
The mobius+ path SHALL NOT evaluate H2, min_a/(G), beta·dcMag corrections, or a
separate pole test — the certified radius subsumes them (DEN > 0.5 is inside (V)). The
application SHALL compute `Ae = A + A'·c`, `De = D + D'·c` (two complex
multiplications) and then the [1/1] form `(Ae·z + B·c)/(1 + De·z)`, updating the
derivative analytically from the same coefficients. Escape SHALL never be jumped over
(the first-escape rule of the existing block paths applies).

#### Scenario: Near-critical passage traversed
- **WHEN** rendering the historical guard-(G) reference (seahorse
  C = (−0.743643887037151, 0.131825904205330)) across the block spanning steps 26→50 at
  ε = 1e-12, entry z ≈ 7.53e-13, |c| = 1e-14
- **THEN** the mobius+ application error is ≤ ~5e-13 (< ε), where plain Möbius/Padé
  err ≈ 1.5e-9 — and the block is applied, not guarded away

#### Scenario: Never slower than plain Möbius
- **WHEN** the CPU census compares mobius+ and plain-Möbius loops on any test view
- **THEN** mobius+ needs no more loop turns and no more block applications in total
  (r_c+ ≥ r_Möbius by construction: every plain acceptance is also a c+ acceptance,
  at the same or a deeper level — note §6.6)

### Requirement: Compact GPU records with split radius sidecar
GPU block records SHALL stay within ~80 B (one cache line). The exponent layout
follows the spike measurement: shared group exponents were the target, but the
measured within-group spreads (61 bits for {A, B, A'}, 39 bits for {D, D'} —
beyond the f32 mantissa budget) force the fallback of a private exponent per
coefficient: 5 × (f32 x, f32 y, i32 e) = 60 B, order A, B, A', D, D'. Radii SHALL
live in a separate index-aligned 16 B vec4 sidecar buffer (x = radius log2, y = the
f32 fast-path flag) read by the descent, with the coefficient record read only on
application. A radius-only re-solve (ε or c_max change within the bounds headroom)
SHALL re-upload only the sidecar. Evaluation SHALL NOT run all-floatexp on the
shallow path (the jet's measured 2×): flagged blocks reconstruct in plain f32.

#### Scenario: Probe touches only the sidecar
- **WHEN** a descent probe rejects a block on the radius comparison
- **THEN** only the 16 B sidecar entry was read — never the coefficient record

#### Scenario: Zoom re-solve is sidecar-sized
- **WHEN** c_max shrinks within the stored bounds headroom
- **THEN** radii are re-solved from stored per-block bounds without touching the orbit,
  and only the sidecar buffer is re-uploaded

### Requirement: Global error bound holds end-to-end
The mobius+ loop SHALL, on the CPU harness with the same Zhuoran rebasing as the
shaders, reach the same iteration counts and escape verdicts as exact perturbation
stepping, with final relative error satisfying ρ_N/(N·ε) ≤ 5 across the seahorse,
near-parabolic, spiral and Feigenbaum test references at ε ∈ {1e-12, 1e-15} and
|c| ∈ {1e-13, 1e-14, 1e-16}.

#### Scenario: Superconvergence constant matches theory
- **WHEN** the pure-z (c = 0) error of a near-parabolic block
  (C = (−0.7499, 0.0001), skip 256) is divided by x²
- **THEN** the ratio equals `|c₃₀ − c₂₀²/c₁₀|/|c₁₀|` at full float precision,
  independent of block length

#### Scenario: No benchmarking past the reference
- **WHEN** the harness measures skip performance
- **THEN** measurement stops at the reference length (the end-of-reference rebase makes
  z ~O(1) and kills skips — measuring past it dilutes gains)

### Requirement: Staged cache and partial tables
The table SHALL cache in three stages — jet levels + coefficients keyed by orbit
length; per-block bounds (q-moduli, majorants) keyed by the R_c headroom; radii keyed
by (ε, c_max) — so a zoom within the headroom re-solves radii alone. The worker SHALL
throttle mobius+ table reposts (jet-class build cost) and the Engine SHALL accept
partial tables covering an orbit prefix.

#### Scenario: Mode switch keeps caches warm
- **WHEN** the user round-trips mobius+ → pade → mobius+ without moving the view
- **THEN** neither the reference orbit nor the mobius+ jet levels are rebuilt

#### Scenario: Zoom during table build
- **WHEN** maxIterations grows during a zoom while a mobius+ table is posted
- **THEN** the engine keeps applying the posted (partial) table — blocks cover an orbit
  prefix, the tail runs exact — instead of dropping to pure perturbation
