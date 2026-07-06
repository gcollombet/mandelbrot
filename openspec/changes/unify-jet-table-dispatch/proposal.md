# Proposal — unify-jet-table-dispatch

## Why

The 6.4 field round (add-mobius-cplus) settled the mode war with a model correction:
the per-application cost plateau is a shallow-f32 phenomenon (Padé wins there), the
deep fe regime is compute-bound so certified-radius size is the arbiter (jet wins
there), and mobius+ — squeezed on speed everywhere — turned out to be the only mode
whose derivative (DE) survives, because rule (V) certifies value error only and the
plain Padé form structurally drops the c-channel of the multiplier. Meanwhile every
validated finding in `JET_BLA_FINDINGS` (§11–17) consumes the same object: the
bivariate jet table already contains affine, Padé and mobius+ as derivable prefixes,
certified radii per order, the SA prefix, the periodic block, and the block-level
derivatives that analytic AA needs. The user-facing "approximation mode" picker is the
experiment; the jet table is the product. This change makes that explicit: ONE build,
tiered per-block dispatch, certified value AND derivative radii, and the validated
findings optimizations layered on top — each phase gated by a measurable referee
(Total-apps indicator, offline tag census).

## What Changes

- **Phase A — unified table + per-block dispatch.** One bivariate-jet build (D_s = 6 +
  scalar majorant, today's mobius+ build already constructs it); per block, derive the
  affine (A₁₀, A₀₁), Padé (D = −A₂₀/A₁₀), and c-augmented (A′, D′) coefficients; store
  tiered certified value radii r_aff ≤ r_padé ≤ r_c+ ≤ r_jet — the Padé radius on slow
  blocks certified by the §12 closed form C = |A₃₀ − A₂₀²/A₁₀|/|A₁₀| (err = C·x²,
  exact) instead of the pessimistic Cauchy bound. Runtime: per-block tag → evaluation
  tier and memory path (32/48/80/120 B); tags are block properties, so warp-uniform.
  **BREAKING (UI):** the Settings mode picker collapses to `auto` (dispatch) +
  `exact`; individual modes remain as debug overrides only.
  *Gate:* an offline tag census on the user's benchmark views (the table knows r_k per
  order at build) showing the tier mix before any shader work; ship criterion is
  apps_total(auto) ≤ apps_total(best single mode per view) on the Total-apps indicator.
- **Phase B — derivative-certified radii (V′).** Differentiated remainder bound (same
  majorant M, Cauchy tail one power down with the degree factor), one r′ per block per
  tier at build; when DE is enabled the dispatch uses min(r, r′). Restores honest DE to
  every tier — including jet's large value radii that currently pass derivative error
  legally — and supersedes mobius+'s accidental "only correct derivative" status.
- **Phase C — certified series approximation (SA §16).** The table's pure-c prefix jet
  (z₀ = 0, order 4 applied / 8 stored) with a certified c-radius (1-variable Cauchy,
  R_c = s·y rungs) gives a common certified skip N₀ (measured: ≥1000–2500 iterations)
  evaluated once per tile as a polynomial in c — replacing 20+ BLA applications and
  all prefix rebasing logic, glitch-free by construction.
- **Phase D — analytic antialiasing (AA §16), color-side.** AA only makes visual
  sense accumulated AFTER the non-linear color mapping — which is where the existing
  AA already lives (linear-RGB additive accumulation in the color pass). Compute
  emits, once per pixel, a Taylor payload at escape (z, z′, z″, margin |z′|/(|z″|δ));
  the COLOR pass expands each AA sample's subpixel value inline
  (ẑ(δᵢ) = z + z′δᵢ + ½z″δᵢ², 2–3 cmul) and feeds it through the normal coloring →
  linear accumulation path. The per-sample orbit re-iteration disappears for
  margin-OK pixels; the AA reseed stamps only margin-failing frontier pixels
  (typically 1–10 %), which keep today's re-iterate path. Cost: ~(1 + f·16)× for
  16× AA. Synergy: the SA prefix is a polynomial in c — subsamples share it.
- **Phase E — interior/periodic regime (§17).** Reference period detection, period
  block Φ_p composed from the table, fixed-Möbius closed form (fixed points ζ±,
  multiplier κ): certified interiority test at cost O(p) (|κ| < 1 → color immediately —
  maxiter → O(p) on interior-dominated views), exterior fast-forward k* periods in one
  cpow (validated k-independent error, contraction-damped). Exterior path re-validated
  at real deep zoom before enabling (findings caveat d).
- **Phase F — build amortization (§15.3).** Coefficients do not depend on c_max: cache
  them per reference; re-derive only radii when the view changes at constant reference
  (zoom animation keyframes, DE toggles, ε changes) — attacks the ×10–20 build cost on
  its critical interactive path.
- **Reserve (explicit gates, no default implementation):** [K/1] superconvergent
  rationalized jet (§14 — only if the census shows the z-channel bound √(ε/C) active;
  current deep census says the c-channel/majorant is the wall); tile-coherent block
  sequences (§15.5 — only if post-dispatch WG-waste measurements still show the ×3
  lockstep loss); certified secondary-reference trigger via dead-block census (§15.6 —
  replaces Pauldelbrot-style glitch heuristics, scoped when multi-reference lands).

## Capabilities

### New Capabilities
- `unified-block-table`: one bivariate-jet build; derived per-block coefficient tiers
  (affine/Padé/c+/jet); tiered certified value radii including the §12 closed-form
  Padé radius; per-block dispatch tags and tier evaluation paths; census gate and
  reserve gates ([K/1], tile-coherent sequences).
- `derivative-certified-radii`: the (V′) rule — per-block, per-tier derivative radii
  from the differentiated Cauchy tail; min(r, r′) dispatch when DE is active.
- `certified-series-approximation`: pure-c prefix jet, certified c-radius profile
  r_c(N), common certified skip N₀ per tile, one polynomial evaluation replacing
  prefix BLA applications.
- `analytic-antialiasing`: (z, z′, z″) block propagation, Taylor-margin tracking,
  analytic AA subsamples with frontier fallback.
- `interior-periodic-skip`: reference period detection, Φ_p composition, certified
  interiority coloring at O(p), exterior fast-forward in closed form.
- `frame-coherent-builds`: coefficient cache keyed by reference; radii-only
  re-derivation on (ε, c_max, DE) changes.

### Modified Capabilities
<!-- none in openspec/specs — the approximation-mode capabilities live in still-open
     changes (add-pade-approximation, add-jet-approximation, add-mobius-cplus);
     their supersession is recorded in design.md rather than as deltas here -->

## Impact

- **Rust `reference_calculus`**: build unification (tier extraction, §12 closed-form
  radii, (V′) radii, SA prefix, period block), staged caches split
  coefficients/bounds/radii (Phase F), serialization of tags + tiered radii sidecars.
- **Worker/Engine (TS)**: single `blockTable` message kind with tier metadata replaces
  the per-mode kinds; buffer layout for tags/radii; Settings mode picker → `auto` +
  debug overrides; RenderStats shows tier mix (census view).
- **WGSL (in-place compute + debug)**: dispatch cascade in the iteration loop
  (tag-directed tier apply), 3-state kernel (z, z′, z″) for Phase D, periodic-phase
  path for Phase E. Depends on the all-compute consolidation (single production
  iteration shader) and the shallow-BLA derivative fix
  (`fix-shallow-bla-derivative-collapse`) landing first.
- **Supersedes on completion**: the separate `pade`/`jet`/`mobius+` production modes
  (kept as debug overrides), the heuristic Padé guards (H2/min_a/beta) on the
  dispatched path, prefix rebasing logic (Phase C), brute-force AA re-iteration
  (Phase D, interacts with the open add-adaptive-antialiasing change — its adaptive
  sample-count logic remains, its per-sample cost model changes).
- **Referees**: Total-apps indicator (render-instrumentation), offline tag census,
  existing CPU harness batteries extended per phase.
