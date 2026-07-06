# Design — unify-jet-table-dispatch

## Context

Three converging inputs, all recorded in `add-mobius-cplus/design.md` (6.4 entries)
and `JET_BLA_FINDINGS.md` §8–17:

1. **Field verdicts (user GPU).** The per-application cost plateau is shallow-f32
   only: Padé wins shallow (lean f32 apply under memory latency), jet wins deep (all
   paths are fe there, arithmetic is compute-bound, certified-radius size arbitrates
   — jet's order-3 radii dominate and its Horner partials mutualize the P_i rows).
   mobius+ lost on speed everywhere but is the only mode whose derivative survives.
2. **Structural derivative gap.** Rule (V) certifies VALUE error only. The Padé der
   update drops the −BcD/M² c-channel term (the spurious q₁₁ = A₁₁ + BD); no mode has
   a certified derivative radius; mobius+'s DE correctness is an accident of its
   smaller value radii. DE amplifies absolute der error ×24–33 on screen
   (compensate-ders), so the der channel breaks before the value channel.
3. **Everything derives from one object.** The bivariate jet table (D_s = 6 +
   majorant), which the mobius+ build already constructs as a build-only tool,
   contains: affine/Padé/c+ coefficients (identities verified, §11), per-order
   certified radii, the closed-form superconvergence constant (§12), the SA prefix
   (§16), the periodic block (§17), and the block derivatives that analytic AA needs
   (§16).

Prerequisites already in flight: the all-compute consolidation (single production
iteration shader — the fragment twin is gone), `fix-shallow-bla-derivative-collapse`
(shallow BLA der bug, confirmed, change written), and the Total-apps indicator
(render-instrumentation delta in add-mobius-cplus).

## Goals / Non-Goals

**Goals:**

- One table build per reference; affine/Padé/c+/jet become per-block dispatch TIERS
  of that table, not user-facing modes.
- Certified value radii per tier, with the §12 closed form replacing Cauchy
  pessimism on slow blocks for the Padé tier.
- Certified derivative radii (V′) so DE-enabled renders are honest on every tier.
- Layer the validated findings optimizations, each gated by a measurable referee:
  SA (§16), analytic AA (§16), interior/periodic (§17), frame-coherent builds
  (§15.3).
- Keep reserve items explicitly gated, not implemented by default: [K/1] (§14),
  tile-coherent sequences (§15.5), certified secondary-reference trigger (§15.6).

**Non-Goals:**

- No new mathematical machinery beyond what the findings validated numerically; the
  only new derivation is (V′), which reuses the existing majorant + Cauchy pattern.
- No multi-reference support (§15.6 is scoped to its gate only).
- No per-iteration coloring compatibility (orbit traps / stripe average cannot skip —
  findings' honest incompatibility; unchanged).
- Not removing the existing modes' code until the census gate passes — they become
  debug overrides, not deletions.

## Decisions

- **D1 — Tiers, not modes.** The runtime object is one block table whose per-block
  record supports four evaluation tiers (affine/Padé/c+/jet). Alternative — keeping
  four tables and auto-selecting per view — rejected: 4× build and memory, and it
  forfeits the per-block wins (quasi-critical passages need jet on a FEW blocks while
  the rest of the orbit runs Padé; a per-view choice pays jet everywhere or guards
  forever).
- **D2 — Prefix-ordered coefficient record.** Per block, store
  `[A, B, D, A′, D′, then raw higher jet coefficients]` so each tier reads a strict
  prefix: 32 B (affine: A,B) / 48 B (Padé: +D) / 80 B (c+: +A′,D′) / full (jet). The
  jet tier reconstructs a₂₀ = −D·A and a₂₁ = −D′·A − D·a₁₁ from the verified §11
  identities (1–2 fe cmul, amortized: the deep regime is where the jet tier runs and
  it is compute-bound anyway, while BANDWIDTH is the axis the plateau punishes).
  Alternative — duplicated per-tier records — rejected: memory ×~2 and cache
  pollution on the hot 48 B path.
- **D3 — Tag = precomputed per-block tier + tiered radii sidecar.** The build emits
  r_aff ≤ r_padé ≤ r_c+ ≤ r_jet (log2-domain f32, −∞ sentinels) and a 2-bit tag =
  cheapest tier whose radius covers the view's working band. Runtime: one sidecar
  probe (16 B, as today), compare log2|dz| against the tagged tier's radius, evaluate
  that tier; on failure descend a level (same descent as today). Tags are properties
  of BLOCKS, shared by all lanes probing the same level/slot → warp-uniform by
  construction. Alternative — full runtime cascade over all four radii per probe —
  rejected: 3 extra compares per probe for a decision the build already knows.
- **D4 — Padé-tier radius on slow blocks via the §12 closed form.** Value radius
  r_padé = min over channels of: z-channel √(ε/C) with C = |A₃₀ − A₂₀²/A₁₀|/|A₁₀|
  (exact, verified to all decimals incl. quasi-critical), c-channel ε/(2·D_eff) with
  D_eff = |q₁₁|/B, and the c² term via |A₀₂|. The c+ tier removes the c¹ constraint
  (A′ captures it), so its radius uses the same closed form with the q-residuals of
  the augmented form. The full Cauchy/majorant bound remains the build-time REFEREE:
  a test asserts closed-form radii never exceed what the (V)-style bound certifies at
  the working band on the test orbits (the 315/315 coverage pattern), so the closed
  form is an optimization of tightness, not a weakening of rigor.
- **D5 — (V′) derivative radii (IMPLEMENTED, amended).** The tier evaluator's own
  ∂z is exact for its form, so the derivative error is the differentiated remainder
  series: polynomial tiers |∂z(Φ − f̃)| ≤ Σ i·|q_ij|·x^(i−1)·y^j; rational tiers add
  the quotient-rule DEN corrections, bounded under the pole cap |De|·x ≤ ¼ by
  (4/3)·Σ i·|q|·x^(i−1)·y^j + (16/9)·|De|·Σ|q|·x^i·y^j. Condition (V′): ≤ ½ε·(|A| +
  |A′|·y) — the multiplier scale, c-channel-inclusive like (V)'s. Per-tier remainder
  sets: affine = all moduli minus its two exact slots; Padé/c+ = their q moduli;
  jet = moduli of degrees 4–6. AMENDMENT to the original D5: this pipeline
  propagates the derivative unconditionally (relief/DE shading, AA targets), so the
  sidecar radius is ALWAYS min(r, r′) — no DE cache key, zero runtime changes.
  Structural corollary made concrete: the Padé tier's restd carries the
  x-independent floor |q₁₁|·y (the irreparable −BcD c-channel), so honest-der Padé
  dies at coarse c_max and at quasi-critical passages (measured: 8–14 der-DEAD
  blocks per view at 1e-14) while c+ (q₁₁ = 0) takes only a ~1-bit shrink and jet
  is nearly untouched (0–7 blocks). At c_max = 1e-9, (V′) costs nothing.
- **D6 — SA as the m = 0 tier.** The build already walks the orbit prefix; add the
  pure-c jet recurrence (b′_j = 2Z·b_j + Σ b_k b_{j−k}, +1 on b₁; order 4 applied /
  8 stored) and the certified r_c(N) profile (1-variable Cauchy, R_c = s·y rungs,
  s ∈ {1e2..1e12} — NOT small s, the θ^J lesson). N₀ = max N with r_c(N) ≥ c_max is a
  table-header field; compute-request frames start every pixel at n = N₀ with one
  polynomial evaluation in dc (degree 4) instead of ~20 BLA applications + rebasing.
  The r_c(N) profile doubles as a diagnostic (locates the first quasi-critical
  passage).
- **D7 — Analytic AA expands in the COLOR pass; compute only emits the payload.**
  AA accumulation is color-space or it is visually meaningless (palette/texture
  mapping are highly non-linear); the existing AA already accumulates linear RGB in
  the color pass, one pass per sample index. So: the iteration kernel propagates
  (z, z′, z″) through blocks (closed per-block formulas incl. z-derivatives of
  m_z/m_c — verified 1e-13 vs step-by-step) and tracks the min Taylor margin
  |z′|/(|z″|δ); at escape it stores a per-pixel Taylor payload (escape z is already
  in layers 2/3; add z′, z″, margin) into the resolved neutral layers the color pass
  reads. The color pass, per AA sample index, reconstructs ẑ(δᵢ) = z + z′δᵢ + ½z″δᵢ²
  inline (2–3 cmul), derives the subsample's smooth iteration / escape-z from ẑ (the
  log-log formula extrapolates below bailout, no extra iteration), colors it
  normally, and accumulates exactly as today. Margin-failing pixels are the only
  ones the AA reseed stamps for real re-iteration (today it stamps the whole DE
  boundary band). z″ lives in registers within a pass and in AA-enabled raw-state
  layers across passes (textureStore, no MRT limit post-all-compute); display-side
  payload layers are an AA-enabled permutation too. Alternative — expanding
  subsamples compute-side and averaging iteration values — rejected: averaging
  before the color non-linearity does not anti-alias the image. SA synergy:
  subsamples share the SA prefix polynomial trivially (it is a polynomial in c).
- **D8 — Interior/periodic as a phase-change, not a tier.** Build: period detection
  on the reference (|Z_{n+p} − Z_n| < tol after transient), compose Φ_p from existing
  table levels (no new build), store (period start, p, Φ_p coefficients). Runtime,
  when a pixel enters the periodic phase: solve the fixed-point quadratic
  (De·z² + (1−Ae)z − Bc = 0, one csqrt), multiplier κ; |κ| < 1 and w₀ in the basin →
  INTERIOR, color immediately with period p and κ (interior DE) — maxiter → O(p).
  |κ| ≥ 1 → exterior fast-forward k* = log(w_thr/|w₀|)/log|κ| periods in one cpow,
  then resume normal skipping (rebase resynchronizes; k* needs only O(1)-period
  accuracy). The exterior branch ships DEBUG-GATED until validated at real deep zoom
  (findings caveat d); the interior branch's validity is contraction-guaranteed
  (|z_j − ζa| decreasing keeps iterates inside the certified block radius).
- **D9 — Staged caches, coefficients keyed by reference only (§15.3).** Extend the
  mobius+ three-stage cache pattern: coefficients+levels keyed by orbit; bounds
  (majorant walks) keyed by R_c headroom; radii (r, r′, tags, N₀) keyed by
  (ε, c_max, DE-enabled). A zoom animation at constant reference re-derives only the
  radii stage (light scan) — the ×10–20 build cost leaves the interactive path.
- **D10 — Census gate before shader dispatch work.** Phase A's first deliverable is
  an OFFLINE tag census (Rust harness, per benchmark view): tier mix by block and by
  predicted application share. Ship criterion for the dispatch:
  apps_total(auto) ≤ apps_total(best single mode per view) on the Total-apps
  indicator, with no visual/DE regression. If the census shows one tier dominating
  ≥95 % of applications on every view, fall back to Phase A-lite: per-view automatic
  tier selection (depth-keyed), shelving per-block tags — same table, less shader
  work.
- **D11 — Reserve gates.** [K/1] (§14): implement only if the census shows the
  z-channel bound √(ε/C) as the ACTIVE radius bound on a material share of
  applications (current deep census: the wall is the majorant/c-channel). Tile-
  coherent sequences (§15.5): only if post-dispatch WG-waste stays > ×2. Secondary-
  reference trigger (§15.6): scoped out until a multi-reference change exists; the
  dead-block census hook is recorded here so that change can consume the table.
- **D12 — UI collapse.** Settings mode picker becomes `auto` (dispatch) + `exact`;
  `bla/pade/jet/mobius+` remain selectable only in the debug panel as overrides.
  RenderStats gains the tier-mix line (share of applications per tier, from existing
  WorkStats-style counters). **BREAKING (UI)** but reversible via debug overrides.

## Risks / Trade-offs

- [(V′) radii shrink DE renders' skips — certified-honest but slower than today's
  wrong-fast DE] → the c+/jet tiers absorb most of it (their der is exact-form); if
  field pain persists, expose "certified DE" as a quality toggle defaulting ON at
  depth where the ×24–33 amplification bites, OFF shallow.
- [Closed-form §12 radii are per-channel formulas, not a single uniform bound;
  coverage gaps possible off the tested orbits] → build-time referee test keeps the
  Cauchy bound as floor (D4); any block failing the referee falls back to the Cauchy
  radius.
- [Register pressure: dispatch cascade + (z, z′, z″) states could drop occupancy —
  the §10 third axis] → tiers share one evaluator skeleton (the jet Horner with
  prefix depth k as a uniform parameter); AA states are a pipeline permutation, not a
  permanent cost; measure occupancy in the debug shader before/after.
- [Census may invalidate per-block dispatch] → explicit D10 fallback (per-view
  selection) keeps the table unification value even if the tag machinery is shelved.
- [Interior fast-forward exterior branch unproven at deep zoom (caveat d)] → debug
  gate; interior-coloring branch alone already captures the dominant gain
  (maxiter → O(p) on interior pixels).
- [Phase D layer growth (3 more raw layers) grows texture memory ~⅓ when AA on] →
  permutation-only allocation; document the budget; reuse the der-Cartesian layers'
  allocation pattern.
- [Period detection tolerance on the reference is heuristic] → the interiority
  verdict itself is certified (κ from the certified block), detection only gates
  ATTEMPTING the phase; false negatives cost nothing (normal path), false positives
  are rejected by the basin test.
- [Scope: six capabilities in one change] → phases are independently shippable and
  independently gated; tasks are ordered so each phase lands behind its referee
  before the next starts; any phase can be extracted to its own change at apply time
  without re-planning (capabilities are already separate spec files).

## Migration Plan

Phase order: A (table+dispatch, census-gated) → B ((V′), radii-stage only) → C (SA)
→ D (AA) → E (interior) → F (build amortization — can land any time after A; it is
pure caching). Each phase behind its own flag; `auto` mode ships only after A+B pass
their gates on the user's benchmark views. Existing modes stay as debug overrides
until a follow-up removal change (not this one). Rollback = flag off per phase; the
table format is a superset of the jet table, so the jet debug override always works.

## Census results (tasks 1.1/1.2 — `unified_tier_census`, ε = 1e-12, CPU f64)

Replay = 24-pixel row, dispatch picks the cheapest tier covering the actual entry;
baselines = certified single-mode loops (NOT the GPU's heuristic Padé). Steps = loop
turns (wall-clock proxy). Headline rows:

| view, c_max | auto steps (apps aff/padé/c+/jet) | padé | c+ | jet |
|---|---|---|---|---|
| seahorse 1e-5 | 14 932 (0/3/862/627) | 16 801 | 16 801 | 14 932 |
| seahorse 1e-9 | 9 062 (0/1/382/1783) | 27 803 | 27 803 | 9 062 |
| seahorse 1e-14 | 2 738 (0/1108/104/495) | 13 085 | 7 295 | 2 733 |
| near-parab 1e-9 | 168 (0/1/23/120) | 60 000 | 60 000 | 168 |
| near-parab 1e-14 | 168 (0/80/64/0) | 1 360 | 168 | 168 |
| feigenbaum 1e-14 | 168 (0/48/24/72) | 16 695 | 1 824 | 168 |
| spiral 1e-14 | 926 (0/89/7/66) | 1 557 | 1 320 | 926 |

Readings, and the D10 decision:

1. **Auto never loses** (structural assertion green everywhere): its coverage is the
   tier union, so steps ≤ every single mode — and it EQUALS the jet mode's steps on
   every view/depth while moving a large share of applications to cheap tiers (e.g.
   seahorse 1e-14: 71 % of applications on the ≤80 B paths at jet-equal step count;
   near-parab 1e-14: 100 %). On GPU this is bandwidth relief exactly where the fe
   regime is compute/bandwidth-bound. **DECISION: per-block tags (full Phase A), not
   A-lite** — the mix is genuinely mixed at deep c_max, and harmless-identical to
   jet elsewhere.
2. **The certified-coarse gap is real but jet-shaped**: at c_max 1e-5/1e-9 the padé/c+
   certified radii die (structural c² residual — the known coarse-regime limit) while
   the JET tier keeps working (stored c-terms) and carries auto to 1.1–357× fewer
   steps than certified padé/c+. The census cannot compare against the GPU's
   heuristic Padé — that comparison stays with the field round (2.8 gate).
3. **Affine tier: 0 applications at every (view, c_max) tested.** Its (V) radius
   never beats Padé's where it matters. Candidate simplification at layout freeze
   (2.3): drop the 32 B tier from dispatch (record prefix stays readable); keep the
   tag encoding at 2 bits (dead/padé/c+/jet).
4. **Ladder violations at 1e-14 are massive (up to 94 %) and RESOLVED BY DROPPING
   THE LADDER**: r_padé is §12-boosted, r_c+ was (V)-only in the census. Implementing
   2.2 surfaced that a monotone ladder is not a correctness requirement (the tag
   points at a tier whose OWN radius covers; the census replay already ran ladder-
   free) and cross-tier clamping is unsound upward (a boosted Padé radius does not
   certify the c+ evaluator — §13's D′ over-correction at large c) and wasteful
   downward. 2.2 applies the closed forms to BOTH tiers, no clamping; per-tier
   soundness-vs-exact-stepping is the referee. Spec requirement rewritten
   accordingly.
5. **Band-tag census (|dz| ~ 1024·c_max) is too pessimistic at coarse c_max**
   (everything "dead" at 1e-5/1e-9 while the replay applies plenty): post-rebase
   deltas sit far below the band. The replay mix is the meaningful census; the
   working-band definition for build-time tags (D3) must use the replay-observed
   |dz| distribution, not a fixed c_max multiple — feed this into 2.3.
6. **[K/1] reserve gate — MET on spiral-class views, modest materiality**: at 1e-14
   the binding §12 channel on applied Padé blocks is the z-channel on spiral 72/89
   (81 %) and seahorse 355/1108 (32 %) — not the expected "never". Materiality is
   modest (auto already equals jet's steps; [K/1] would upgrade padé-tier radii, not
   the floor). Stays in reserve; re-check after Phase A ships with the GPU tier-mix
   counters.

## Phase A status — SHIPPED (gate passed)

Phase A is complete: census (A0), unified build + tiered radii + serialization +
staged cache (Rust), worker/Engine plumbing, WGSL dispatch in production + debug,
Playwright green, and the 2.8 ship gate PASSED on the user's field verdict
(2026-07-06: "auto toujours mieux" across his views). The picker is collapsed to
[Auto, Exact] with legacy modes as debug overrides, default = auto, and RenderStats
shows the live production tier mix. Field observation of note: the AFFINE tier
carries real applications at shallow c_max (intro view: ~70 % affine / 30 % jet) —
the census's "affine dead" verdict was specific to deep bands; the 32 B tier stays.
Follow-ups carried forward: Total-apps freeze fix (chip; re-record auto/mobius
apps_total when it lands), then Phases B–F.

## Phase B status — (V′) SHIPPED (build-side, always-on)

`derivative_radius` + per-tier effective radii min(r, r′) in `unified_solve_radii`
(zero runtime/serialization changes — the sidecar simply carries the effective
value). Soundness referee green: 1 682 sampled entries below the effective radii,
per-tier exact-∂z stepping (dδ′ = (2Z + 2δ)·dδ), error ≤ 5ε·(|A| + |A′|y) on all
three test orbits × {1e-9, 1e-14}, quasi-critical blocks included. Honest-DE cost
measured (3.4 field input): nothing at 1e-9; at 1e-14 Padé partially der-limited
with the structural q₁₁·y floor killing 8–14 blocks/view, c+ ~1-bit shrink (never
dead), jet 0–7 blocks. Intro-view Playwright unchanged-green. The
"c+/jet now carry certified DE with fewer applications than accidental-c+" claim
is 3.4's field question.

## Phase C status — SA SHIPPED (deep path) + field findings

`sa_build`/`sa_profile` (Rust, tests green), sidecar header transport, deep
compute-request continuation entry. Field spec `unified-deep.spec.ts` green:
seahorse 1e-10 content identical to jet with a live mixed tier dispatch
([46081 aff, 7676 padé, 214 c+, 16505 jet]); best observed run 1.07M apps vs
jet 115M (×108 — SA skips n0·pixels, big blocks the rest). Hard-won findings:
(1) the radii stage was 4.0 s of a 4.3 s build at 40k — coarse-to-fine scans
brought it to 0.46 s (`unified_build_budget` keeps the number); (2) Metal
silently drops DYNAMIC-INDEX writes to private arrays in non-uniform loops —
tier counters now use literal-index selects; (3) small per-dispatch counters
must flush RAW (the >>6 downscale rounded tier counts to zero); (4) session
Total-apps at deep views is dominated by the build-vs-convergence race
(cold-table renders finish exact before the table lands) — steady-state A/B
needs warm-table re-renders, which is exactly Phase F's cache; (5) certified
tables (jet/mobius/auto alike) are INERT on the antenna needle reference —
pre-existing, investigation chip filed; (6) the SA no-early-escape guard
(|Z|+ρ ≤ 1.9) correctly zeroes n0 on needle-class references — conservative by
construction.

## Phase D status — SHIPPED (color + reseed); field tuning open

5.3/5.4/5.5-automated landed (2026-07-06). Key implementation decisions beyond
the plan below:

- **Decision tags, not re-evaluated margins.** The FIRST reseed (pristine
  sample-0 payload) evaluates the margin once and tags analytic-OK texels with
  a +0.5 fraction in the AA target map (integer part = sample target, color
  gate floors it). Later reseeds and the color pass read the tag. Re-evaluating
  per sample would race margin-fail re-iterations (their payload is rewritten
  at the new jitter → a late pass would double-jitter).
- **Iteration parity renormalization.** The analytic subsample must present
  iter = floor(ν̂) with a synthetic |z| reproducing fract(ν̂) (the bilinear-
  resolve recipe): zebra parity and palette phase step per integer iteration,
  and a re-iterated subsample crossing an iteration line gets iter±1. Without
  this the tagged pixels flip hard against the brute reference.
- **Repeat-accumulation bias fix (pre-existing).** After an accumulation the
  band holds the LAST sample's jitter; a re-trigger now forces a clear
  (`rawJittered`) so sample 0 is the unjittered base again.
- **Frontier reality check.** Intro view: 99 % of the band margin-fails at
  ln-margin threshold ln 5 (|z″| ~ |z′|² near the set ⇒ margin ≈ DE/(ln|z|·δ)
  < 5 across the whole ≤6 px band at shallow zoom). The 1–10 % frontier claim
  is deep-escaping-view territory — field round decides the threshold (and
  whether a shallow-depth gate should disable the tag pass entirely).
- **A/B noise floor.** The converged base is NOT bit-deterministic run-to-run
  (adaptive batch boundaries × per-pass derS compensation reset ⇒ DE low-bit
  drift ⇒ band-edge target flips): brute↔brute 16× differs by 0.60 % of pixels
  (max 255). The Playwright assertion calibrates against it (3× floor);
  steady-state referees must not assume pixel determinism near the band edge.
- Frontier stats: reseed atomics [stamped, eligible] → Engine
  `aaFrontierStamped/Eligible` → RenderStats "AA frontier" row.

## Phase D plan (original implementation notes, superseded by the above)

Done (5.1/5.2): tier second partials certified on CPU; z″ tracked in unified mode
in both loops with the 2·derS-tied scale; Taylor payload lands in raw layers on
escape. REMAINING (5.3–5.5) — the exact plan, so the next session starts cold:

- **Payload contract (escaped pixels, raw texture):** layer 8 = S (= derS+derSLo
  at escape), 9/10 = z′ mantissa (z′ = m·e^S), 11/12 = z″ mantissa (z″ = m·e^{2S});
  layers 2/3 hold the escape z as today. In-progress: 9/10 = sndM (scale 2·layer 8).
- **5.3 color:** the converged-frame color path already reads the RAW texture
  directly (`bindGroupColorRaw`, the skipResolve path) — expand there, NOT through
  resolve. Uniform additions: current sample's jitter offset in C UNITS (engine:
  offC = aaJitter × scale — the shader adds aaOffset in neutral units before the
  ×scale, no rotation involved), the analytic flag, and δ = sub-pixel half-extent
  in c units (for the margin). Per escaped pixel: margin test in LOG space
  (ln|z′| − ln|z″| − ln δ = ln|m₉₁₀| − ln|m₁₁₁₂| − S − ln δ > ln 5); when OK,
  ẑ = z + cmul(m₉₁₀, δĉ)·e^{S+ln|δc|} + ½·cmul(m₁₁₁₂, δĉ²)·e^{2S+2ln|δc|}
  (exponent-summed exp(clamp(...)) so e^S never overflows f32 alone); derive the
  subsample's smooth iteration + escape-z inputs from ẑ and color normally into
  the existing linear accumulation. Keep the CENTER pixel's height/angle for DE
  shading (decided acceptable). Margin-fail pixels: their layers already hold the
  re-iterated sample (see 5.4).
- **5.4 reseed:** aa_reseed currently stamps iter = −1 wherever aaTarget >
  sampleIndex; gate additionally on margin-fail (read the payload — needs a
  SAMPLED binding of the raw texture next to the storage one) so margin-OK pixels
  are never re-iterated; report the frontier fraction.
- **5.5 spec:** 16× analytic vs brute A/B on an escaping-dominated view: image
  within the second-order bound, AA-sample apps_total dropping to ~the frontier
  fraction, gamma-correct accumulation unchanged.

## Phase F status — SHIPPED (measured numbers)

The staged cache itself landed at 2.4; Phase F added the referees, the timing
surface, and killed the measured build blocker (2026-07-06):

- **Dead-work fix.** Levels below the emit floor (skip 1–2, never serialized —
  MOBIUS_MIN_EMIT_SKIP = 4) carried 75 % of all blocks through the bounds walks
  and radii scans. `build_unified_levels` now leaves them empty (level entries
  kept for merge-chain index alignment). Full suite green; the serialized GPU
  table is bit-identical.
- **40k-orbit budget (seahorse, ε = 1e-3, dev machine).** Cold build
  4.85 s → 2.85 s; radii-only keyframe re-solve 2.38 s → 1.19 s (×2.4 cheaper
  than cold). Keyframe cadence over a constant-reference zoom: coefficients
  never re-run, bounds every ~4 octaves, radii every ~2 octaves
  (`unified_keyframe_stage_cadence`, asserted; `unified_keyframe_budget` keeps
  the wall-clocks).
- **Measurement correction.** The 4.3-era "radii 0.46 s @40k" figure came from
  the f64 test-orbit helper whose seahorse orbit ESCAPES at ~3.1k iterations
  (6.2k blocks); a real 40k orbit builds ~20k emitted blocks. The radii scan
  is the remaining wall — linear in orbit length, ~1.2 s at 40k, ~60 µs/block
  (4-tier descending scans + (V′)). Follow-up candidates if the field wants
  interactive keyframes at 40k+: coarser scan steps at deep levels, or moving
  the scan to a worker-pool (wasm is single-threaded — would need rayon+atomics
  or a JS-side split).
- **Timing surface.** Worker posts `buildMs` + the Rust `unified_last_stages()`
  mask with every blaReady; RenderStats debug shows "Table build: N ms
  (coeffs+bounds+radii | radii | warm)" — a radii-only label IS the
  frame-coherent path working.

## Phase A status (2.8 automated half, intro view)

`tests/unified-mode.spec.ts` green on the user's machine (headed WebGPU, dev
server): flag 5 with a live unified table, zero validation errors, bla↔auto
significant pixel diff 5.1 % (better than bla↔pade's 7.0 % on the same run),
clean bla round-trip, jet↔auto shared-buffer audit holds, reference orbit never
rebuilt across switches. Wall-clocks on the trivial intro view are flat (~2.3 s
all modes). BLOCKER for the apps gate: `lastCompletionTotalApps` reads −1 for
auto/mobius — the jet-class table repost resets the counter generation and the
short final reconvergence completes before any readback lands; filed as a
render-instrumentation fix (chip). The per-view ship gate then runs as the
field half of 2.8. Note discovered writing the spec: per-BLOCK tags can
legitimately cost a few applications vs pure jet when |dz| lands between the
tagged tier's radius and r_jet (the census replay dispatched per-entry) — the
band-fallback rule bounds this, but the field numbers should watch it.

## Open Questions

- ~~Exact serialized record layout after prefix ordering~~ — RESOLVED at 2.3:
  9 × 12 B JetCoeffFe in prefix order [A, B, D, A′, D′, a₀₂, a₃₀, a₁₂, a₀₃]
  (raw slots 5–8 are exactly the degree ≤ 3 coefficients the identities cannot
  reconstruct); 16 B vec4 sidecar (tagged radius, tag, f32-safe, spare); level
  directory reuses `JetLevel`. Tier prefix reads: 24/36/60/108 B.
- ~~fe-domain csqrt/cpow for Phase E~~ — RESOLVED at 6.2: the interior branch
  needs only fe_csqrt (implemented, WGSL); cpow belongs to the deferred exterior
  fast-forward.
- SA × progressive: resolved in practice at 4.2 — continuation frames resume past
  n0 naturally (the skip only seeds compute-request starts).
- ~~Does the tag need 2 bits or 3 (exact-only blocks)?~~ — RESOLVED by shipping:
  2 bits suffice; dead/degenerate blocks carry the −∞ radius sentinel (the probe
  fails before the tag matters). The third bit stays reserved in the encoding.
- ~~Tier-mix counters~~ — RESOLVED at 2.6: debug-shader first. `dbg_try_unified`
  maps its per-order buckets to tiers (o1 = ≤48 B affine/Padé, o2 = c+ 80 B,
  o3 = jet 108 B), so the existing debug view reads as the tier-mix census. A
  WorkStats extension (production-path counters) is deferred until the RenderStats
  tier-mix line (task 2.7).
- ~~Display-side layer budget for the AA Taylor payload~~ — DECIDED (user,
  2026-07-06): NO packing for now. The payload ships as plain full-precision
  r32float layers on the AA-enabled permutation (~5 extra: z′x, z′y, z″x, z″y,
  margin); packing (z″ half-precision, margin as a flag bit) is a later
  optimization only if the memory budget actually hurts. ~~Is reusing the center
  pixel's DE for subsamples acceptable?~~ — SHIPPED that way at 5.3 (center
  height/angle for shading, ẑ only for ν/escape-z): the 5.5 automated A/B stays
  within the calibrated noise floor. The deep-view field round has the final
  word (it also tunes the ln 5 margin threshold).
