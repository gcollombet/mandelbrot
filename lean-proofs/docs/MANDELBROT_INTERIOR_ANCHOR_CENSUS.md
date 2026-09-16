# Off-reference interior: nucleus anchoring, measured

*29 July 2026 — `reference_calculus/src/interior.rs`, build-only CPU module,
4 validation tests + 1 `--ignored` census.*

## Verdict

**Re-anchoring the periodic certificate at the minibrot nucleus works, and is not
worth wiring.** It converts a dormant tier into an active one and pays
4 000–20 000× on every pixel it covers — but it covers a few percent of the
interior population, about 0.3 % of the frame.

*Updated 30 July 2026, after §4–§5 were ported to `k = p` with the gauge Λ and the
drift channel was rewritten:* the certified band improved 1.2–3.3× at depth and
**stopped decaying with the period**, which was the whole point of the gauge. It is
still not enough to wire, and the reason moved from loose arithmetic to a structural
cap: a *centred disk* in `ĉ` cannot exceed radius 1/4, the cardioid's inscribed disk.
*Then updated again the same day:* tiling `ĉ` instead of measuring a radius breaks
that cap — 6–14× more certified area, and on the one nucleus whose straightening
defect has converged it captures **46.5 % of the interior population** against the
disk route's 2.5 %. The "few percent" figure in the older sections is the DISK
route's and does not apply to the tiling. Still not wired, but the reason is no
longer "the coverage is negligible": it is that the §4 defect stalls near 0.10 for
p ≥ 15, holding the other three nuclei at 1.3–6.7 %.
Read the sections in order — each one corrects the previous one with a measurement.

## The question

The periodic tier arms only when the **reference** orbit is periodic:
`unified::periodic_build_diagnostic` scans the reference tail for a sustained
return. A view centred on a filament beside a minibrot therefore reports
`NoConvergedPeriod`, the tier stays dormant, and every interior pixel of the
visible minibrot burns `max_iter`.

Nothing new was needed to test the alternative.
`PeriodicCertificateKind::DirectMajorant` already exists for exactly this case —
"valid when the cycle multiplier A is exactly zero at a minibrot nucleus" — and
the nucleus locator already ships as `find_minibrot`. The census drives both
production paths (`detect_period_ball_at`, `newton_nucleus`) rather than a copy.

## What the certificate actually says

The first implementation was wrong in an instructive way. The majorant proved by
`Bounds.scalar_majorant` is

```text
ρ₀ = r,    ρ_{k+1} = 2|Z_k|·ρ_k + ρ_k² + c_max
```

so it concludes "the exact orbit stays inside `|δ| ≤ r`" under **two** hypotheses:
`|δ₀| ≤ r` *and* `|dc| ≤ c_max`. Testing only the first is vacuous at a nucleus —
there `z₀ = 0 = Z₀`, so `|δ₀| = 0` for **every parameter in the plane**, and the
test certifies the whole plane as interior.

With the parameter gate restored, the nucleus-anchored verdict is a
**parameter-space containment**, not a walk: every `c` within `c_max` of the
nucleus has its critical orbit trapped, decided at iteration 0 for the cost of one
comparison. `certified_band_never_accepts_an_escaping_pixel` locks this down over a
48×48 sweep.

## Results

Views are **self-framing**: hand-picked σ is useless here (the first run framed two
views entirely inside a component, `int% = 100`, and three entirely outside one,
`int% = 0`). The census locates the nucleus under a seed, takes the Munafo/Jung
size Λ, frames a window of 1.5 Λ around it — the minibrot's bounding box is
1.30 Λ × 1.20 Λ — and offsets the centre so the view centre is never the nucleus.

`cov%` is the certified disk's area against the *measured* interior area; the disk
is exactly a disk, so taking it analytically avoids under-reporting when the band
is smaller than a grid cell. Where the grid resolves, `cap%` and `cov%` agree.

| view | p | status (reference → nucleus) | band/Λ | int% | cov% | gain/px |
|---|---:|---|---:|---:|---:|---:|
| p3-island | 3 | `short` → **ACTIVE** | 0.098 | 13.7 % | 2.5 % | 4 000× |
| seahorse-mini | 27 | `noPeriod` → **ACTIVE** | 0.037 | 67.8 % | 0.1 % | 8 000× |
| mini-seahorse | 66 | `noPeriod` → **ACTIVE** | 0.015 | 16.3 % | 0.1 % | 20 000× |
| elephant-mini | 15 | `short` → **ACTIVE** | 0.152 | 39.1 % | 2.1 % | 8 000× |
| triple-spiral | — | no nucleus under the seed | — | — | — | — |

The reference column is the finding on its own: in four frames containing a whole
minibrot, today's anchor is dormant in every one.

## Why the band is narrow — measured

The majorant injects `c_max` at **every one of the p steps** and then amplifies it
by the product of the remaining `2|Z_k|`. Printing that product turns the
explanation into a measurement:

| view | p | Λ | log2 ∏2\|Z\| | **band · ∏2\|Z\| / Λ** |
|---|---:|---:|---:|---:|
| p3-island | 3 | 1.90e-2 | 3.2 | **0.914** |
| seahorse-mini | 27 | 2.89e-3 | 2.8 | **0.262** |
| mini-seahorse | 66 | 7.25e-5 | 6.2 | **1.090** |
| elephant-mini | 15 | 1.92e-3 | 2.4 | **0.792** |

`band ≈ Λ / ∏2|Z_k|`, holding within a factor ~4 across periods 3 → 66 and three
decades of Λ. (The product skips the critical step, where `2|Z_k| = 0`: what
amplifies `c_max` is the tail of the cycle after the critical point.)

So the narrowness is not slack in the bound and not a tuning problem. **A scalar
majorant cannot see that the p steps are one quadratic-like return.** It treats
them as p independent steps, pays the cycle's own linear amplification on the
parameter channel, and lands on a disk a factor `∏2|Z_k|` inside the component.

## What would fix it

The gauge, which is already certified. `FEIGENBAUM_FINITE_RETURN_IMPLEMENTATION.md`
§4–§5 builds precisely this object for `k = 2^n`:

```text
G_n(z) = P_c^[k](s_n·z) / s_n
```

with a certified parameter window (`propose_parameter_window`, `K_c·δ + E_0`) whose
envelope recurrences already carry the `∂c` channel. Substituting `2^n → p` and
`s_n → Λ` puts the return in the coordinate where its constants are O(1), which is
exactly what stops `c_max` from being amplified. The Lean side needs nothing new:
`FiniteGridWitness.uniform_error` and the window lemma are already quantified over
the certificate data.

Expected effect, from the table above: `band/Λ` from 0.015–0.15 to O(1) — the
certificate would cover the minibrot's component instead of a speck at its centre,
and `cov%` would move from ~2 % to the component's share of the interior.

## The port, delivered and measured (29 July 2026)

§4–§5 are now ported to `k = p` with the gauge Λ, in `feigenbaum.rs`:
`minibrot_gauges`, `propose_minibrot_return`, `propose_minibrot_window`,
`renormalized_trapping_band`, plus `ball_inv`. 211 crate tests pass.

**The gauge.** Because `Z_0 = 0`, `d/dz P_c^p(0) = 0` for *every* `c`: the
dynamical linear term is structurally absent. So

```text
a  = ½·d²/dz² P_{c*}^p(0) = ∏_{k=1}^{p-1} 2 Z_k        (dynamical, z = ζ/a)
σ_p = ∂c P_c^p(0)                                       (σ_{k+1} = 2 Z_k σ_k + 1)
Λ  = 1/(a·σ_p)                                          (parameter, c = c* + Λ·ĉ)
```

`Λ = 1/(a·σ_p)` is not a new object: expanding the shipped Munafo/Jung estimate
`1/(b·l²)` with `l = a` and `b·a = σ_p` gives exactly it.
`minibrot_gauge_matches_shipped_size_estimate` checks the ported f64/ball value
against the DBig implementation in `lib.rs` to `<1e-9` relative on p = 2, 3, 4.

**The substitution is one line.** `Ĝ_c(ζ) = a·P_c^p(ζ/a) = w_p / scale` with
`scale := 1/a` — the same `w_k / scale` shape §4–§5 already use — so
`return_jet_ball` is reused verbatim and the Chebyshev table is replaced by the
quadratic family itself, `H(ζ) = ζ² + ĉ`. The old builders refuse at a nucleus
for a structural reason, which the port turns into a working certificate:
`propose_difference_return` returns `"critical scale is zero or non-finite"`
because `P_{c*}^p(0) = 0` *is* the definition of the nucleus.

**The structural claim is confirmed.** In the renormalized parameter,

| p | \|a\| | \|Λ\| | ε₀ (defect) | **K_ĉ** |
|---:|---:|---:|---:|---:|
| 3 | 9.30 | 1.90e-2 | 3.4e-2 | **2.43** |
| 15 | 5.20 | 1.92e-3 | 1.0e-1 | **2.89** |

`K_ĉ = |Λ|·K_c` comes out **O(1) and independent of depth**, because `K_c` is of
order `|a|·σ_p = 1/|Λ|`. That is exactly the amplification the scalar majorant
was paying, now absorbed by the gauge. The `1/m_s²` term of §5 also disappears:
`Ĝ = a·w_p` is a product, not a quotient.

**And it does not yet beat the scalar majorant.** Trapping in the renormalized
coordinate is `R² + |ĉ| + ε ≤ R`, so at `R = 1/2` the band solves
`δ̂ ≤ (1/4 - ε₀)/(1 + K_ĉ)` — and `δ̂` *is* `band/Λ`:

| view | p | scalar band/Λ | **ported band/Λ** | ratio |
|---|---:|---:|---:|---:|
| p3-island | 3 | 0.098 | 0.058 | 0.59× |
| elephant-mini | 15 | 0.152 | 0.021 | 0.14× |
| seahorse-mini | 27 | 0.037 | *refused* | — |
| mini-seahorse | 66 | 0.015 | *refused* | — |

Two reasons, both located:

1. **The defect does not decay with the gauge.** I expected `ε₀ ~ C₃/a²`; measured
   it sits at 3–11 % of the 0.25 headroom regardless (|a| = 74 gives 0.103, |a| = 9.3
   gives 0.034), eating 14–41 % of the budget before `K_ĉ` divides the rest by ~3.5.
2. **The drift channel still carries the amplification.** The refusals are
   `"window orbit envelope overflow"` (p = 27) and `"window destroys the gauge
   margin"` (p = 66) — both from the *un-renormalized* per-step envelopes
   `ε_{j+1} = (2|o_j| + ε_j)ε_j + δ` and `e'`, which are precisely what the gauge
   was meant to remove. The port moved the amplification out of the **value**
   channel and left it in the **drift** channel.

So the direction is not cashed. What the port did buy is a measured constant —
`K_ĉ = O(1)` — and an exact localisation of what is now binding.

## The drift channel, located to one number (29 July 2026)

The port's refusals were traced rather than guessed. Three things came out of it.

**The failure messages were hiding the culprit.** `"window envelope overflow"`
covered three channels at once; split per channel, the two refusals are
`"cell drift envelope overflow"` (p = 27) and `"window destroys the gauge margin"`
(p = 66). Tracing the cell envelope on the worst cell showed it ending at 0.125
and 0.055 — it does *not* diverge. The real chain is
`scale_window = ball_inv(gauge_window)`: the gauge's drift radius inflates
`1/a`, which seeds the cell envelope. One root cause, two symptoms.

**The drift majorant is loose, and measurably so.** §5 bounds the drift with
`ε_{j+1} = (2|o_j| + ε_j)ε_j + δ` and the derivative with
`Σ_{j+1} = 2(|o_j| + ε_j)Σ_j + 1`. Both take moduli, i.e. assume every phase
along the orbit aligns:

| view | p | ε_p (majorant) | \|σ_p\|·δ (first order) | loose | Σ_p vs σ_p | loose |
|---|---:|---:|---:|---:|---:|---:|
| seahorse-mini | 27 | 1.19e-1 | 1.89e-2 | 6.3× | 4.08e2 vs 4.82e1 | 8.5× |
| mini-seahorse | 66 | 5.73e-2 | 1.98e-3 | **28.9×** | 1.17e4 vs 1.85e2 | **63.0×** |

**And that looseness is exactly what kills it.** The gauge factor is
`2Z_k ⊕ 2ε_k`, so the drift has to stay under `min_k |Z_k|` or the factor becomes
a ball containing zero and `∏2Z_k` loses all information. The verdict at p = 66:

```text
min|Z_k| = 2.11e-2
majorant drift 5.73e-2  → EXCEEDS the threshold  (gauge margin = 0, dead)
first-order    1.98e-3  → clears it by 10.7×
```

**So the mathematics works and the bound is what blocks it.** This is the
opposite of the earlier verdict on the value channel: there the constant really
was O(1) and the direction still did not pay. Here the quantity that has to be
small *is* small — 10× under the threshold — and only its expression as a modulus
majorant puts it over.

**What was tried and why it was not enough.** `window_drift` now proposes the
phase-preserving candidate `ε_j = κ·|σ_j|·δ` (σ ball-propagated through the exact
linear recurrence `σ_{j+1} = 2Z_jσ_j + 1`, so cancellation survives) and verifies
it against the exact drift induction, raising κ until it closes. It never closes
(`κ = ∞`, fallback used) — and structurally cannot: the induction
`ε_{j+1} ≥ (2|Z_j| + ε_j)ε_j + δ` is modulus-based, so it must dominate the very
recursion whose cancellation the candidate exploits. A single a-posteriori check
of that shape can never certify a bound tighter than the majorant it checks
against.

**The step that would cash it.** Expand the drift in δ with ball-propagated
coefficients instead of bounding it in one shot:

```text
d_j(c) = σ_j·(c - c*) + ½·τ_j·(c - c*)² + …,    τ_{j+1} = 2σ_j² + 2Z_jτ_j
```

Every coefficient recurrence is *linear* and exact, so each can be carried as a
ball with its cancellation intact; only the final truncation remainder needs a
modulus majorant, and it enters at `O(δ^n)`. The project already owns this
machinery — `jet.rs` and the bivariate jets do exactly this in the `z` channel.
Order 2 is likely enough: the first-order term is 10× under the threshold, so the
remainder has an order of magnitude of room.

## The drift channel, fixed and measured (30 July 2026)

`window_drift_taylor` implements the order-2 δ-Taylor with ball-propagated
coefficients, and the same treatment was applied to the two channels that turned
out to carry the rest of the same loss. The a-posteriori candidate/verify route
was removed after it was shown it can never close.

**Three channels, one disease.** Each of these is a *linear, exact* recurrence, so
each can be carried as a ball with its cancellation intact instead of being
bounded in moduli:

| channel | recurrence | was | now |
|---|---|---|---|
| orbit drift `ε` | `d_{j+1} = d_j(2Z_j + d_j) + dc` | compounding majorant | order-2 Taylor, remainder only in moduli |
| orbit derivative `Σ` | `σ_{j+1} = 2Z_jσ_j + 1` | modulus majorant | ball over the window |
| gauge derivative `Ȧ` | `Ȧ_k = Ȧ_{k-1}·2Z_k + A_{k-1}·2σ_k` | modulus majorant | ball |
| cell derivative `q` | `q_{j+1} = 2w_jq_j + 1` | modulus majorant | ball on the window `w` |

Recovered, measured on the two nuclei that could not certify at all:

| view | p | ε_p before | ε_p after | Σ_p before | Σ_p after |
|---|---:|---:|---:|---:|---:|
| seahorse-mini | 27 | 1.19e-1 | **1.97e-2** (1.0× of first order) | 4.08e2 | **5.46e1** |
| mini-seahorse | 66 | 5.73e-2 | **2.09e-3** (1.1×) | 1.17e4 | **2.14e2** |

At p = 66 the drift now clears the `min|Z_k| = 2.11e-2` threshold by 10.1×, so both
nuclei certify. Fixing `Ȧ` and `q` then stopped `K_ĉ` from growing with the period
— it read 2.4 / 2.7 / **7.2** / **15.5** with the modulus majorants and reads
1.06 / 2.14 / 2.85 / 3.70 now.

**Two further defects of my own construction, both found by measuring.**
`renormalized_trapping_band` passed `budget = f64::MAX` to §4, which silently
disables the adaptive subdivision: `ε₀` was whatever the coarse 8×8 grid gave.
With a real budget it falls from 1.03e-1 to 2.5e-2 (and a cell cap is now
mandatory — a budget just under the irreducible floor of `|D|` costs 61 784 188
cells against 856 one step looser). And `K_ĉ(δ̂)` is *coupled* to `δ̂`: reading it
once on the widest window gave `K_ĉ ≈ 534` where the window actually claimed reads
1.61, throwing away two orders of magnitude. The band is now **bisected** on the
monotone predicate `δ̂ + K_ĉ(δ̂)·δ̂ + ε₀ ≤ R − R²`, so every accepted value is
verified at its own width.

**Result: the port now wins, and stops decaying with depth.**

| view | p | scalar band/Λ | **ported band/Λ** | ratio |
|---|---:|---:|---:|---:|
| p3-island | 3 | 0.098 | **0.119** | 1.21× |
| elephant-mini | 15 | 0.152 | 0.071 | 0.47× |
| seahorse-mini | 27 | 0.037 | **0.057** | 1.57× |
| mini-seahorse | 66 | 0.015 | **0.048** | 3.27× |

The scalar column decays as `1/∏2|Z_k|` (0.098 → 0.015); the ported column is
flat-ish (0.119 → 0.048). The crossover is where the earlier analysis put it, and
the gap should keep widening with depth. p = 15 remains the scalar's best case.

**The remaining ceiling is structural, not slack.** Trapping by disk invariance on
`ζ² + ĉ` requires `R² + |ĉ| + ε ≤ R`, which has a solution only for
`|ĉ| ≤ 1/4 − ε` — so `band/Λ ≤ 1/4` no matter how tight the bounds get, and we are
at 19–48 % of that cap. The cusp at `ĉ = 1/4` is the boundary point NEAREST the
origin, so a disk of radius 1/4 centred on the nucleus is exactly the cardioid's
inscribed disk: **≈17 % of its area at best**, and `cov%` against the whole
budget-burning population lands at 0.5–3.6 %. Going past that needs a non-disk
parameter domain, not tighter arithmetic.

(Correction to an earlier draft of this note: 1/4 is *not* the rightmost point of
the cardioid. `Re ĉ(θ) = cos θ/2 − cos 2θ/4` has `dRe/dθ = sin θ(2cos θ − 1)/2`,
stationary at `cos θ = 1/2` as well as at `θ = 0`, giving `ĉ = 0.375 + 0.2165i`.
The cardioid bulges right of the cusp for complex multipliers. Only the
*centred-disk* cap is 1/4.)

## The geometry change: tiling `ĉ` (30 July 2026)

`propose_cardioid_window` replaces the radius by an adaptive tiling of the
parameter plane, the same move §4 makes in `ζ`. Each `ĉ`-cell is certified on its
own, so the accepted set takes whatever shape is certifiable instead of being
clipped to the inscribed disk.

**The per-cell test needs no fixed point and no square root.** Iterate the
renormalized critical orbit in ball arithmetic — one ball covers the whole cell —
and at each step try to trap it. For an orbit ball `O` with `m = sup|O|` and
residual `d = sup|Ĝ(O) − O|`, the disk `D(centre O, ρ)` is invariant when

```text
d + ρ·(2m + ρ) + ε ≤ ρ ,      and with ρ = (1 − 2m)/2 this is exactly  d + ε ≤ ρ².
```

Same `defect + contraction·radius ≤ radius` shape as `RadiiCertificate`. A cell
that passes has a genuine invariant disk, so its whole `ĉ`-cell is interior.

**Subdivision is not optional.** Without it the accepted set came out as a disk of
radius 0.21 — symmetric, i.e. not cardioid-shaped at all. The reason is
quantitative: a `ĉ`-cell of radius 0.02 spreads the orbit ball to ≈0.074 where the
multiplier is near 1, and the trap residual `d ≈ |2z−1|·spread` then exceeds `ρ`.
Coarse cells pass deep inside; the slow-convergence lobes need depth.

**Result — the shape changes and the area follows.**

| view | p | defect ε₀ | accepted area | vs certified disk | vs inscribed disk | `ĉ` reach |
|---|---:|---:|---:|---:|---:|---|
| p3-island | 3 | 3.5e-3 | **0.574** | **12.8×** | **2.92×** | [−0.518, +0.266] |
| elephant-mini | 15 | 1.03e-1 | 0.098 | 6.1× | 0.50× | [−0.199, +0.145] |
| seahorse-mini | 27 | 1.14e-1 | 0.079 | 7.7× | 0.40× | [−0.177, +0.134] |
| mini-seahorse | 66 | 1.03e-1 | 0.099 | 13.7× | 0.50× | [−0.201, +0.146] |

The reach is now **asymmetric** — [−0.518, +0.266] against the disk route's
[−0.21, +0.21] — which is the tiling following the cardioid rather than a circle.
p3-island reaches 0.574 of `ĉ`-area, **2.92× the inscribed disk** and 49 % of the
whole cardioid (`3π/8 = 1.178`): the `1/4` cap is genuinely broken.

**Soundness is checked, and it caught my own error rather than the code's.**
`cardioid_tiling_is_sound_and_beats_the_inscribed_disk` runs the real subdividing
proposal and verifies every accepted cell centre against a 200 000-iteration
escape walk. It first failed on an assertion of mine that no accepted cell may
have `Re ĉ > 1/4` — which is false, per the correction above. With the true bound
(`Re ĉ ≤ 0.375`) it passes: nothing escaping is accepted.

**Coverage of the interior, measured — not scaled from the disk's number.**
`cardCov` maps every frame cell into `ĉ = (c − nucleus)/Λ` (a complex division, so
the proposal now carries the complex `Λ`) and tests membership in the accepted
tiling. It also sweeps the escaping cells, which must never be claimed:

| view | p | ε₀ | disk `cov%` | **cardioid `cov%`** | gain | escaping captured |
|---|---:|---:|---:|---:|---:|---:|
| p3-island | 3 | 3.5e-3 | 2.5 % | **46.5 %** | 19× | 0 |
| elephant-mini | 15 | 1.03e-1 | 2.1 % | **2.8 %** | 1.3× | 0 |
| seahorse-mini | 27 | 1.14e-1 | 0.1 % | **1.3 %** | 13× | 0 |
| mini-seahorse | 66 | 1.03e-1 | 0.0 % | **6.7 %** | ≫ | 0 |

**This changes the verdict for the direction.** Earlier sections of this note say
the interior anchor covers "a few percent" — that was the DISK route's figure and
it should not have been carried over. Where the straightening defect has converged,
the cardioid tiling captures **46.5 % of the interior population at iteration 0**,
each such pixel costing one membership test instead of 4 000 iterations. Removing
46.5 % of the interior work is a frame-level effect, not a curiosity.

**What now binds is the §4 defect, and it now has a payoff attached.** Three of the
four nuclei sit at ε₀ ≈ 0.10 and cover 1.3–6.7 %; p3-island at ε₀ = 3.5e-3 covers
46.5 %. So the question "why does ε₀ stall near 0.10 for p ≥ 15" — cell cap, or an
irreducible `|D|` floor — is worth roughly a 7–35× coverage improvement on the deep
nuclei, not a rounding correction. That is the same budget-versus-cap question that
already cost 61 784 188 cells once.

## Unblocking p ≥ 15: the §4 refinement ORDER (30 July 2026)

The defect stalled near 0.10 for `p ≥ 15`. Instrumenting the three terms of
`local_bound = value + deriv·h + curvature·h²` at the cell that sets the answer
gave it away immediately:

| view | p | R | value | deriv·h | **curv·h²** | h | depth |
|---|---:|---:|---:|---:|---:|---:|---:|
| mini-seahorse | 66 | 0.5 | 2.72e-2 | 1.85e-2 | **5.69e-2** | 8.8e-2 | **0** |
| mini-seahorse | 66 | 0.05 | 3.81e-6 | 2.84e-6 | **4.92e-4** | 1.1e-2 | **0** |

`curvature·h²` is 55 % of the bound at `R = 1/2` and **99 %** at `R = 0.05` — and
the deciding cell is at **depth 0**: the subdivision never touched it. The LIFO
queue refined cells in pop order, exhausted the 200 000-cell allowance, and then —
because the cap disabled subdivision for everything popped afterwards — accepted
the rest at their initial size. The allowance was spent everywhere except where the
answer was decided.

**Refining the worst cell first fixes it completely.** A max-heap on `local_bound`:
pop the worst; if it is under budget then so is every other, since it is the
maximum; otherwise subdivide and re-insert. Measured against a direct f64 probe of
`|Ĝ(ζ) − ζ²|` on the boundary circle:

| view | p | ε₀ before | ε₀ after | **cert/f64 after** |
|---|---:|---:|---:|---:|
| p3-island | 3 | 3.44e-2 | **1.17e-3** | 1.00 |
| elephant-mini | 15 | 1.03e-1 | **2.21e-2** | 1.00 |
| seahorse-mini | 27 | 1.14e-1 | **2.38e-2** | 1.00 |
| mini-seahorse | 66 | 1.03e-1 | **2.07e-2** | 1.00 |

`cert/f64 = 1.00` to three figures: **the certified bound is now the true pointwise
defect.** `deriv·h` and `curv·h²` collapse to ~1e-8 as the refinement drives `h` to
8.6e-5 at depth 10, exactly on the cells that matter. There is nothing left to win
on this term.

**What it buys, end to end.**

| view | p | cov% before | **cov% after** | ĉ area | ĉ reach | escaping captured |
|---|---:|---:|---:|---:|---|---:|
| p3-island | 3 | 46.5 % | 46.5 % | 0.574 | [−0.518, +0.266] | 0 |
| elephant-mini | 15 | 2.8 % | **11.4 %** | 0.403 | [−0.430, +0.230] | 0 |
| seahorse-mini | 27 | 1.3 % | **6.4 %** | 0.391 | [−0.423, +0.227] | 0 |
| mini-seahorse | 66 | 6.7 % | **28.3 %** | 0.413 | [−0.437, +0.232] | 0 |

4–5× coverage on the three nuclei that were blocked. And the `ĉ` area is now
**uniform across p = 3 → 66** (0.39–0.57, all ≈2× the inscribed disk, same
asymmetric reach): the geometry is maxed out for a single nucleus, and what still
varies between views is how much of a given frame is *that* cardioid rather than
satellites and filaments a one-nucleus certificate cannot reach by construction.

The disk route benefits too — `band/Λ` now 0.119 / 0.072 / 0.058 / 0.048 against
the scalar majorant's 0.098 / 0.152 / 0.037 / 0.015, i.e. **1.21× / 0.47× / 1.60× /
3.30×**.

**Two negatives worth keeping.** A window-ball variant of `return_jet_ball`, meant
to recover phase cancellation in the curvature the way the drift channel did,
REGRESSED: re-inflating `w` by the cell envelope every step makes ball radii
compound multiplicatively where the scalar majorant only adds (cert/f64 4.96 → 6.22
at `R = 1/2`, 262 → 392 at `R = 0.05`). And the §4 budget matters as much as the
order: `0.25·headroom` stops the refinement early and throws away a factor 3 of
band against `0.02·headroom`.

## What to do next, in order

1. **Still do not wire nucleus anchoring.** The band improved 1.2–3.3× at depth,
   but `cov%` is 0.5–3.6 % of the interior population — the disk-invariance form
   caps at `band/Λ = 1/4`, i.e. the inscribed disk of the minibrot's cardioid.
2. ~~**Port §4–§5 to `k = p`.**~~ **Done.** `K_ĉ = O(1)` confirmed.
3. ~~**Renormalize the drift channel.**~~ **Done — see above.** The fix was
   ball-propagating four linear recurrences instead of bounding them in moduli;
   29× and 63× recovered, `K_ĉ` no longer grows with p.
4. ~~**The next lever is the DOMAIN.**~~ **Done — see "The geometry change".**
   Tiling `ĉ` beats the certified disk by 6–14× in area and breaks the `1/4` cap
   (p3-island reaches 2.92× the inscribed disk, 49 % of the cardioid).
5. ~~**Back to §4: why does ε₀ stall at ≈0.10 for p ≥ 15?**~~ **Done — see
   "Unblocking p ≥ 15".** It was the refinement ORDER, not the arithmetic: the
   deciding cell was never subdivided. Worst-first refinement takes the certified
   defect to the true pointwise value (cert/f64 = 1.00) and coverage to
   6.4–46.5 %.
6. **Then reconsider wiring**, which was refused on the grounds that coverage was
   negligible. At 46.5 % it is not, and §"Ce qu'il manquerait" lists the three
   concrete gaps: a second `dc` origin at the nucleus, a cell-list header instead of
   a radius, and a parameter-containment verdict rather than an entry-radius test.
7. `triple-spiral` finding no nucleus is a reminder that the anchor is a per-view
   resource, not a global one: the dispatch has to tolerate its absence.
