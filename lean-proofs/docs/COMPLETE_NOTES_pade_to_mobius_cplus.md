# Rational Iteration Skipping for Deep-Zoom Fractal Rendering
## Complete consolidated notes: from Padé to Möbius-c⁺, through bivariate jets

*Guillaume Collombet, 2026. Consolidates the series: "A provably correct Möbius
iteration-skip for Julia sets", "Möbius skipping for the Mandelbrot set",
"Bivariate jets for iteration skipping", "From Padé to Möbius-c⁺", plus the
post-publication studies (§10–§12) and the implementation rounds that followed:
the **F** denominator slot that resums the c-channel (§8) and the shipped
superconvergent **[2/1]-c⁺** form (§9). Revised per
`CORRECTIF_PADE_MOBIUS_CPLUS.md` (July 2026), which separates four levels this
note used to blur: exact algebraic identities, asymptotic laws, domain-wide
certificates, and numerics observed on a finite set of references. Each claim
below is tagged accordingly. Affine BLA, perturbation and rebasing due to
Zhuoran and Claude Heiland-Allen (mathr.co.uk, fractalforums), whose critique
shaped §2–§4.*

---

## 1. Setting

Deep-zoom rendering iterates a high-precision **reference orbit** once,
`Z[n+1] = Z[n]² + C`, `Z[0] = 0`, and per pixel a cheap **delta**:

```
z ← f_n(z) = 2·Z[n]·z + z² + c        (c = δC fixed per pixel; c = 0 for Julia)
```

with **Zhuoran rebasing**: after each advance, if `|Z[m]+z| < |z|` then
`z ← Z[m]+z, m ← 0`; at end of reference, `z ← Z[M]+z, m ← 0`.

**Iteration skipping** stores, per block of L consecutive reference steps, a
compact approximation of the composed map `Φ_L = f_{n+L−1}∘…∘f_n`, valid on a
disc of entry values, in a hierarchical merge table (levels of length 2^l).
The **affine BLA** stores `z ↦ A·z + B·c` with recurrences
`A_z = A_y·A_x`, `B_z = A_y·B_x + B_y`, valid for `|z| < ε·|2Z|`
(it drops the z² term).

Parameters throughout: tolerance ε (e.g. 1e-12), `α = √ε`, per-view bound
`c_max ≥ |c|`.

---

## 2. The Möbius / Padé [1/1] skip

Replace the affine map by the Padé [1/1]:

```
m(z) = (A·z + B·c) / (1 + D·z),    seed: A = 2Z_n, B = 1, D = −1/(2Z_n)
```

which reproduces the z² term exactly. Two structural facts make degree 1 the
**only** rational upgrade:

- **Group closure — exact at c = 0 only.** For c = 0 Möbius maps compose
  exactly: `A_z = A_y·A_x`, `B_z = A_y·B_x + B_y`,
  **`D_z = D_x + A_x·D_y`** (verified exact via 2×2 matrix composition); the
  merge table closes with no truncation. For **c ≠ 0** the exact 2×2 product of
  `[[A, B·c], [D, 1]]` matrices carries a normalization denominator
  `1 + D_y·B_x·c` on every coefficient: a table of pixel-independent `(A,B,D)`
  **cannot** hold the exact composition, and the three-coefficient recurrences
  above are only its order-zero term in c (correctif §2). What stays exact is
  the closure of the full Möbius group at fixed c — not this restricted,
  pre-built parametrization. This is where the c-channel truncation of §4
  actually originates.
- **Degree multiplication no-go.** For rational maps
  `deg(g∘f) = deg(g)·deg(f)`: any richer rational family forces an uncertified
  re-truncation at every merge level. Degree 1 is the unique fixed point of
  composition inside the rational class.

**Validity radius.** The radius depends on which relative error is meant
(correctif §1): at c = 0, `|m−f|/|m| = |z/a|²` exactly, giving `|z| ≤ |a|√ε`;
`|m−f|/|f| = |z²/(a²−z²)|`, giving the tighter `|z| ≤ |a|·√(ε/(1+ε))` — the
one to use in constants of theorems stated against the true map f. Both are a
factor `1/√ε` beyond the affine `ε·|2Z|` at equal target accuracy.
Composed radius (intermediate validity, needed for the *plain* Möbius only):

```
r_z = min( r_x,  r_y / (|A_x| + r_y·|D_x|) )
```

**Per-skip gain** at equal accuracy: `ΔN = ½·log(1/ε) / log|2Z|` extra steps —
large where `|2Z| → 1` (slow dynamics), small where escape is fast. The gain is
*additive per skip* (Heiland-Allen's observation); in the GPU cost metric it
becomes a multiplicative application-count ratio (§5).

**Useful exact identities:**
- Heiland-Allen remainder identity: `2Zz/(1 − z/2Z) = 2Zz + z² + z³/(2Z−z)`,
  valid for `|z| < |2Z|`.
- **Transport identity** (replaces the mean-value theorem, which is false for
  ℂ-valued maps): `f(b) − f(a) = (b−a)·(2Z + a + b)` — note c cancels in
  differences.

---

## 3. The Julia theorem (c = 0): unconditional correctness

All lemmas are deductive with explicit constants.

1. **Exact single-step remainder:** `m(z) − f(z) = z³/(2Z − z)`.
2. **Transport:** `|f(b) − f(a)| = |b−a|·|2Z+a+b|`; with `|a|,|b| ≤ α|2Z|`,
   the per-step amplification `g = |2Z+z+ẑ|/|2Z+z|` satisfies
   `log g ≤ 3α` (valid for `α ≤ ½`).
3. **Single-step radius:** under `|z| ≤ α|2Z|` with `α = √ε`, the relative
   remainder is ≤ ε (reverse triangle inequality on `|2Z − z|`).
4. **Closure:** `D_z = D_x + A_x·D_y` exactly — no truncation term exists.
5. **Composed radius:** `r_z = min(r_x, r_y/(|A_x| + r_y|D_x|))`.
6. **Theorem (bounded error growth).** With the local term carried explicitly
   as `ε(1 + g_k ρ_k)` and the invariant on the perturbed orbit maintained with
   `α' = α/(1 − ρ_max)`, the recurrence `ρ_{k+1} ≤ ε' + g_k ρ_k` sums to

   ```
   ρ_N ≤ ε·(e^{rN} − 1)/(e^r − 1) ≤ e·N·ε      for rN ≤ 1,  r = ε + 3√ε·(1+O(Nε))
   ```

   Unconditional; non-circularity of the invariant proven by a separate remark.

---

## 4. Mandelbrot (c ≠ 0): the c-channel and the three conditions

**Augmented seed remainder (exact):**

```
m(z) − f(z) = z(z² + c)/(2Z − z) = z³/(2Z−z)  +  c·z/(2Z−z)
              [Julia part]           [spurious c-term]
```

Capturing z² (which affine drops) costs a **spurious cz term** the affine form
does not have. Away from the critical point it is harmless; where `|2Z_k|` is
tiny it explodes — and in deep zoom the running delta is far below even the
collapsed radius, so no test on z can see it. It is a genuine property of the
rational form (the composed cross-coefficients are driven by `|D_k| = 1/|2Z_k|`).

**Truncation order.** Writing the composed first-order form
`(Az + Bc + Ecz)/(1 + Dz + Gc + Hcz)`, the composition recurrences correct to
first order in c are (correctif §3)

```
E_z = A_y·E_x + E_y·A_x + B_y·D_x
G_z = G_x + G_y + D_y·B_x
H_z = H_x + H_y·A_x + D_y·E_x + G_y·D_x
```

An earlier version of this note dropped the `H_x + H_y·A_x` terms of H_z —
those are **first order in c**, not O(c²), so the omission was only invisible
at seed∘seed (where H_x = H_y = 0) and wrong at every deeper merge level.
Consequence: the original Mandelbrot-theorem proof, which routed through the
truncated recurrences, is **incomplete as stated**. The shipped certificates
are unaffected — they are built directly from the exact jet composition and
the compensated remainder Q (§6–§8), not from these recurrences.
Denominator margin: from `D_block = Σ_k A_{(0..k−1)}·D_k`, each term
`|A_{(0..k−1)}z|·|D_k|` is the per-step ratio `|z_run(k)|/|2Z_k| < √ε` under
per-step (H1), so `|M| ≥ 1 − L√ε` (measured margin ×10⁴ beyond).

**Standing hypothesis (ND), enforced by the algorithm:**

```
(ND)   |z_{k+1}| ≥ (1 − 2α)·|z_k|·|2Z_k|     along the pixel orbit
```

Automatic for c = 0; for c ≠ 0 it excludes near-total cancellations
`2Zz + z² ≈ −c`, which are exactly the events rebasing handles.

**The three validity tests:**

```
(H1)  |z_run(k)| < √ε·|2Z_k|      at every step
(H2)  |B_block|·|c| < ε           per block
(G)   |2Z_k| ≥ √(|c|/ε)           at every step   [the spurious-term threshold]
```

(G) is derived by setting the spurious term's relative size
`|c|/((1−α)(1−2α)|2Z_k|²)` equal to ε. It is specific to the rational form
(affine does not need it) and self-effacing in deep zoom (`√(|c|/ε) → 0`).

**Bound (Mandelbrot) — numerically verified; proof incomplete as stated.**
Under (H1), (G) per step, (H2) per block, (ND), with `α = √ε` and `3√ε·N ≤ 1`:

```
ρ_N ≤ 2e·N·ε·(1 + O(√ε)) + C·N_b·ε  =  O(N·ε)
```

with `N_b ≤ N` the number of blocks and C an absolute constant (measured ≤ 6).
Intended proof structure: Piece 1 = per-step Möbius vs exact (transport
recurrence with local term `ε' = 2ε/((1−α)(1−2α))`, both remainder parts
controlled — z³ by (H1), cz by (G)); Piece 2 = composition truncation. Piece 2
relied on the truncated E/G/H recurrences above, whose missing first-order
terms leave that leg **unproven** (correctif §3) — the statement is downgraded
to a verified numerical bound. Measured within 2% of the tighter value
`(e+2)Nε` across five references, ε ∈ {1e-12, 1e-15},
|c| ∈ {1e-13, 1e-14, 1e-16}. The production accuracy claim does not rest on
this bound: it rests on the per-block jet/Q certificates of §6–§8.

---

## 5. The GPU cost model (the metric that decides everything)

**The plateau.** Cost per application is *flat* as long as: (a) the block fits
one memory transaction (~128 B cache line), (b) arithmetic hides under memory
latency, (c) register pressure leaves enough occupancy to hide that latency.
Affine (32 B, 1 cmul) and Möbius (48 B, 2 cmul + 1 cdiv) both sit on the
plateau. Consequently **only the number of applications differentiates them**,
and since `r_Möbius = √ε|2Z| ≥ ε|2Z| = r_affine` at every level, Möbius never
takes more applications than affine — *at equal error definition and equal
certificate*. The qualifier matters (correctif §12.1): the argument compares
like against like; a **certified** rational radius against a **heuristic** one
can and does lose long blocks in some regimes (measured up to 6× more loop
turns on coarse cusp/period-2 views, §9) — the certification price, not a
property of the form.

Measured application ratios (Möbius vs affine, |c| = 1e-14, rebasing):

| reference      | apps affine | apps Möbius | ratio |
|----------------|------------:|------------:|------:|
| seahorse       | 2705        | 934         | ×2.90 |
| Feigenbaum     | 1368        | 939         | ×1.46 |
| spiral         | 278         | 212         | ×1.31 |
| near-parabolic | 18          | 18          | ×1.00 |

i.e. "~2× in many cases, never slower" — matching real-hardware observations.

**Design rules distilled:**
- Compare candidate approximants in **#applications / wall-clock**, never in
  weighted operation counts (arithmetic conventions misrank plateau forms).
- Anything exceeding the plateau (larger reads, extended-precision arithmetic
  per coefficient, register pressure) must buy back its cost in *fewer
  applications on the dominant workload*, or it loses.
- Store coefficients with a **per-block shared exponent** (rescaled), not
  all-extended-precision.

---

## 6. Bivariate jets: the class composition actually preserves

**Definition.** The order-K bivariate jet of Φ (with Φ(0,0)=0) is its Taylor
polynomial truncated at *total* degree K: `Σ_{1≤i+j≤K} a_ij·z^i·c^j`.
The single step is exact for K ≥ 2: `a_10 = 2Z_n, a_20 = 1, a_01 = 1`.

**Exact closure.** Truncation commutes with composition:
`J_K(g∘f) = J_K(J_K g ∘ J_K f)` — substituting a series without constant term
into a degree-d monomial produces only degree ≥ d. The merged table entry
equals the degree-K Taylor polynomial of the true block map, **exactly**
(verified to the last bit). Nothing like (H2) or (G) exists to certify.

**One merge by hand (degree 2)** — three facts at once. Composing two seeds:

```
J₂(f₂∘f₁) = a₂a₁·z + (a₂+1)·c + (a₂+a₁²)·z² + 2a₁·zc + 1·c²
```

(i) `A_10, A_01` reproduce the affine recurrences — the affine BLA *is* the
order-1 jet. (ii) The zc and c² terms appear at the first merge — these are
exactly what Möbius drops (its E, G, H bookkeeping). (iii) The jet keeps them:
on the seahorse near-critical block that forces (G), the K=2 jet reproduces the
map to **1.7e-16** (machine precision) where affine and Möbius sit at 3–5e-9.

**The remainder problem and its two tools.** The stored jet equals the true
Taylor polynomial, so the application error is the genuine Taylor remainder of
a degree-2^L polynomial. Bounding it from a few stored coefficients:

1. **Composable scalar majorant.** On the polydisc |z| ≤ R_z, |c| ≤ R_c, walk

   ```
   ρ ← |2Z_j|·ρ + ρ² + R_c        (start ρ = R_z, over the L steps)
   ```

   By one-line induction, `M = ρ_L ≥ sup |Φ_L|` on the polydisc.
   **Choose R_z by bisection on the walk itself** (log scale; criterion:
   finite and ρ never exceeds ~0.5; arithmetic in log/extended range). Any R_z
   with a finite walk yields a *true* majorant — the walk is the proof.
   Closed-form adaptations based on prefix products are unreliable (the exact
   criterion involves Σρ_k/|2Z_k|, not Σρ_k); do not use them. Never suppress
   the ρ² term using orbit-side hypotheses: Cauchy requires the sup over the
   *whole* polydisc, not over where real orbits go.

2. **Anisotropic Cauchy estimates.** `|a_ij| ≤ M·R_z^{−i}·R_c^{−j}`, and with
   `θ = max(x/R_z, y/R_c) < 1`, `D_s` = stored degree:

   ```
   Σ_{i+j=d} |a_ij| x^i y^j ≤ M·(d+1)·θ^d
   Σ_{d≥D} (d+1)θ^d = θ^D·((D+1) − D·θ)/(1−θ)²
   ```

   Store **two to three degrees beyond the applied order** (D_s = K+3): the
   exact stored moduli carry the estimate where it matters and push the Cauchy
   tail to θ^{D_s+1}, where it is harmless. The polydisc must be
   **anisotropic**: `R_c = s·c_max` with s ~ 1e3–1e5 (symmetric R_c = R_z
   inflates M through the c-channel of long blocks; R_c = O(c_max) freezes θ_c).

**Validity rule (V)** (per block, per order k ≤ K):

```
REST_k(x, c_max) = Σ_{d=k+1..D_s} T_d(x, c_max)  +  Cauchy tail
(V):  REST_k(x, c_max) ≤ ½·ε·( |A_10|·x + |A_01|·c_max )
```

The error scale **must** include the c-channel (`|A_01|·c_max`): as z → 0 the
remainder keeps its pure-c terms. **The same fact cuts the other way**
(correctif §4.1): because the budget `|A_10|·x + |A_01|·c_max` grows with x
while the pure-c part of REST does not, the admissible set
`{x : (V)}` — REST − τε·S·DEN being *convex* in x (positive monomials plus a
convex Cauchy tail, minus a concave quadratic while DEN > 0) — is an
**interval that may exclude x = 0**. A runtime test `|z| < r` admits every
smaller |z|, so certifying only the accepted scan point is unsound. The
correct solve, per candidate polydisc:

```
1. check (V) at x = 0 (pure-c REST vs the τε·|A_01|·c_max·DEN budget);
   if it fails, this candidate emits NO radius;
2. otherwise take the upper crossing by descending geometric scan
   (the condition is not monotone; do not bisect on it) — convexity then
   certifies the whole interval [0, r].
```

The union of `[0, r_i]` over candidates is `[0, max r_i]`, so the block radius
is the max over candidates *passing at zero*. Runtime: one comparison
`|z| < r_k`, now genuinely covering its interval. (Implemented in
`mobius_solve_radius` / `closed_form_radius`; regression battery: geometric
sampling of every emitted `[0, r]` plus a synthetic pure-c block that must be
rejected — see §13.)

**Consistency check (recurring across the project):** at order k = 1, (V)
*rediscovers* the three Möbius conditions — the z² term gives the affine
(H1)-type radius, the pure-c terms give (H2)-type tests, and on near-critical
blocks the exploding cross coefficients force `r_1 = 0`, which *is* the guard
(G). The three conditions are the order-1 shadows of (V). Coverage of the
bound: verified 315/315 (always ≥ the true remainder, near-critical blocks
included).

**Adaptive order.** A jet table contains affine (order 1) and Möbius-level
(orders 1–2) as prefixes; evaluating at the smallest valid order makes one
table dominate or equal both predecessors in simulation, on every reference.

**GPU verdict.** On real workloads the jet is ~2× slower than Padé: it exceeds
the plateau on all three axes (120 B reads = 2.5× bandwidth, ~9–12
extended-precision multiplications, register pressure → occupancy) while *not*
reducing the application count on the dominant workload. The jet's role is
therefore **build-time only**: the coefficient-and-certificate machine.

---

## 7. The parabolic flow and superconvergence (closed form)

**Why slow dynamics protects the rational form.** Interactive deep-zoom paths
spend most wall-clock in slow, near-parabolic dynamics. The parabolic model
`f(z) = z + z²` composes to `z/(1 − Lz)` asymptotically — *exactly* a Möbius
map (the time-t maps of the flow ż = z² are Möbius). Measured on real
near-parabolic blocks: the Möbius per-block error is **independent of L**
(9.5e-12 at L = 64 and L = 256 alike) and below ε throughout the band the
delta occupies. Any fixed-order polynomial truncation of this geometric series
has remainder growing like L^K — the jet is structurally wrong there; the pole
must be resummed.

**The leading-order law (z-channel, c = 0).** The Möbius relative error obeys
the asymptotic law

```
err_rel = C·x²·(1 + O(x)),      C = |a_30 − a_20²/a_10| / |a_10|
```

with coefficients from a degree-3 jet at build time. This is a **leading-term
expansion**, not an exact identity for a general block (the a_40, a_50, …
terms remain; correctif §7) — it reads exact in measurements only because the
higher terms are far below display precision at the working x. Predicted =
measured to all displayed digits on every block tested, including
near-critical ones (9.49 = 9.49 and 9.52 = 9.52 near-parabolic at L = 32, 256;
1.61e7 = 1.61e7 on the (G) block). **C saturates in L** instead of growing
like a_30 ~ L² — that saturation *is* the superconvergence. Origin: on the
exact flow, `a_30 = a_20²/a_10` identically, so C measures the distance of the
dynamics to the parabolic flow. The law sizes the certified z-channel Padé
radius on slow blocks (`√(ε/C) ≈ 3e-7` — large), but the *emitted* radius
still comes from the full (V) machinery: tail, pole margin and c-channel can
each bind first.

**The c-channel does not compensate:** `|a_11 + B·D|/|B·D| ≈ 0.96–1.0`
everywhere. Structural reason: the flow ż = z² + c *is* Möbius in z for each
c — but with coefficients A(c), D(c) *depending on c*, which the form
`(Az+Bc)/(1+Dz)` (freezing A, D at c = 0) cannot represent. The spurious zc
term is real; the complete plain-Möbius error formula, verified exact at the
working point:

```
err_rel ≈ C·x²  +  |q_11|·x·|c|/(A·x + B·|c|)  +  |a_02|·|c|²/(A·x + B·|c|)
q_11 = a_11 + B·D
```

---

## 8. Möbius-c⁺: the final form

Expand the flow's coefficients to first order in c, and resum the pure-c
channel in the denominator (the **F** slot — the realization of the "third
coefficient B′" the earlier form left on the table):

```
m⁺(z,c) = ((A + A'·c)·z + B·c) / (1 + (D + D'·c)·z + F·c)

A  = a_10                      B  = a_01
D  = −a_20/a_10                (identity: −A·D = a_20, ≡ the recurrence D_z)
F  = −a_02/a_01                (kills the pure-c² term — resummation, not
                                correction: B·c/(1+Fc) is a geometric series)
A' = a_11 + D·B + F·A          (kills the spurious zc)
D' = −(a_21 + D·a_11 + F·a_20)/A   (kills the z²c term)
```

All derived at build time from the stored jet. **F is a bivariate-Padé
(Chisholm) denominator slot**: placing the pure-c curvature at the denominator
resums the whole `B·c` geometric series instead of correcting one order of it,
which is exactly what closes the shallow c-channel bind (below). It is the
mirror of D on the c-axis — each takes the leading quadratic term of its
channel and resums it as a pole. When B = a_01 vanishes (never observed on
real orbits) F falls back to 0 and a_02 stays a live REST term (sound, just
not resummed).

**Compensated coefficients** of `Q = (1 + (D+D'c)z + Fc)·Φ − ((A+A'c)z + Bc)`:

```
q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1} + F·c_{i,j−1}
```

(minus A at (1,0), A' at (1,1), B at (0,1)). By construction
`q_10 = q_01 = q_20 = q_11 = q_02 = q_21 = 0` — **six** built-in zeros, the
build-integrity test (verified to 2^−52 relative on every block of every test
orbit). The error bound is `|Q| / |1 + (D+D'c)z + Fc|`: remaining stored q
terms plus the Cauchy tail (majorant of Q:
`M_Q = (1 + |D|R_z + |D'|R_zR_c + |F|R_c)·M + |A|R_z + |A'|R_zR_c + |B|R_c`),
with the denominator condition `1 − |D|x − |D'|x·c_max − |F|·c_max > 0.5`
folded into (V).

**Measured** (the (G) block, seahorse 26→50, entry |z| = 7.5e-13):

| \|c\|  | Möbius   | c⁺ (5-coeff)    | c⁺ + F           |
|--------|----------|-----------------|------------------|
| 1e-14  | 1.5e-9   | 1.3e-12         | **1.0e-15** (f64 floor) |
| 1e-15  | 1.7e-10  | ~c² scaling     | 5.7e-16          |

With F the residual sits at the **f64 rounding floor** — the c² scaling of the
5-coefficient form is no longer observable underneath it. In the deep-zoom
census (working point |z| = 1e-12, ε = 1e-6), the pure-c² residual that bound
the certified radius of ~**77 shallow blocks** at c_max = 1e-9 (the `cmax_c2`
class) collapses to **6**; feigenbaum shallow-near-critical loop turns drop
from **2.91× → 0.99×** Padé. F moves the c-channel wall from c² to c³; it does
not remove it (at coarse c_max the higher q_0j terms bind through the
majorant — see §9 and the interior regime §12).

**Properties.** Stays on the GPU plateau: 72 B per block (one cache line, six
private-exponent coefficients), one extra complex multiplication over the
5-coefficient form under the latency shadow — cost per application ≈ Möbius.
Application count: **measured** ≤ Möbius on every census view, strictly
smaller across near-critical passages — but this is a numerical result, not a
theorem: the extra constructed zeros do not by themselves imply a larger
certified radius (the c⁺ D reshapes the pole margin, the higher compensated
coefficients and the majorant of Q all at once; correctif §6/§11.2). The
operational dominance is delivered by the dispatch, which keeps each form's
own certified radius and selects per block. Per-block radius ⇒ warp-coherent
dispatch.

**Final architecture.**
- *Build:* bivariate jets (exact closure, hierarchical merge; blocks containing
  reference step 0 have A = 0 hence r = 0 — never skip from m = 0) → derive
  A, B, D, A', D', F → one certified radius per block: compensated closed-form
  terms + Cauchy tail, R_z by bisection on the majorant walk, then the (V)
  solve of §6: **x = 0 gate first**, descending scan for the upper crossing,
  interval `[0, r]` closed by convexity. **No intermediate-validity merge rule
  for c⁺/jet radii**: the (V) bound covers the whole composed map (the
  majorant walks every step of the block); a min-rule through |D_x| would
  wrongly collapse near-critical radii by ~10⁶ and poison ancestors
  recursively.
- *Runtime:* single kernel, single form, single comparison `|z| < r`. Failure
  falls back to exact steps: **accuracy is unconditional; only performance is
  at stake**, quantifiable at build time by a census of undersized blocks.
- Coefficients are c_max-independent; only radii depend on c_max → during a
  zoom-in animation, rebuild radii only (cheap scan). If the census shows the
  c_max-uniform radius binding for central pixels, precompute radii for 2–3
  |c| bands.

**Hierarchy:** `affine ⊂ Möbius ⊂ Möbius-c⁺ ⊂ [2/1]-c⁺ ⊂ jet` is a chain of
**model richness** — each rung annihilates strictly more local coefficients —
*not* a chain of certified-radius, application-count or wall-clock dominance
(correctif §14): a richer form changes its pole margin, its live remainder and
its majorant simultaneously, so no global dominance follows from the extra
zeros alone. Möbius-c⁺ (six coefficients) inherits the affine BLA's
one-comparison test, the Padé's wall-clock, and the jet's near-critical
robustness. §9 adds the superconvergent z-numerator on top of it (the shipped
standalone form); the jet survives only at build time. The mathematically safe
strategy — and the shipped one — is a **dispatch of independent certificates**:
each form carries its own Q, its own majorant and pole margin, its own
certified disc `[0, r]`; the runtime picks the cheapest form whose own radius
covers. Shipping conclusion: [2/1]-c⁺ as the single standalone mode, with the
[1/1]-c⁺ form retained as the c⁺ tier of the unified dispatch table (its
§11-style register identities assume `D = −a_20/a_10`).

---

## 9. The [2/1]-c⁺ ladder (shipped)

Superconvergence is a **resummation** phenomenon — it belongs to forms whose
denominator is matched to the coefficient ratio, and it extends beyond [1/1].
The Padé [K/1] derived from the jet at build time (`D = −a_{K+1,0}/a_{K,0}`,
numerator matched) has, on the flow, vanishing leading compensated coefficient
(`a_{K+2,0} + D·a_{K+1,0} = L^{K+1} − L·L^K = 0`). It was held in reserve
pending a census; the census GO'd it, and **[2/1]-c⁺ is now the standalone
form**:

```
m(z,c) = ((N₂·z + A + A'·c)·z + B·c) / (1 + (D + D'·c)·z + F·c)

D  = −a_30/a_20     (matched to the z-channel ratio — resums the pole; the
                     compensated q_30 AND the model-flow q_40 = a_40 + D·a_30
                     vanish. Falls back to [1/1] D = −a_20/a_10 when a_20 = 0)
N₂ = a_20 + D·a_10  (annihilates z² exactly)
A, B, F, A', D'      as in §8, but with the new (z-matched) D
```

The **[2/1] seed is the exact perturbation step**: at one step `a_20 = 1`,
`a_30 = 0`, hence `D = 0, N₂ = 1` and the form is exactly `z² + 2Z·z + c` —
zero remainder; the numerator now carries the true z² term rather than
resumming it. Compensated remainder gains q_30 as a **seventh** constructed
zero (`q_10 = q_01 = q_20 = q_30 = q_11 = q_02 = q_21 = 0`); the majorant
gains the numerator term (`M_Q += |N₂|R_z²`). Fallbacks: `a_20 = 0` reverts to
the [1/1] extraction with q_30 back as a live REST term; `a_01 = 0` keeps
F = 0 with q_02 live — both sound, just not resummed. Note the extra zero
does **not** prove radius dominance over [1/1]-c⁺ (the new D moves the pole,
the higher compensated coefficients and the majorant of Q together; correctif
§6): dominance is operational, via the dispatch keeping both radii, or
established block by block.

**Phase-0 census** (the GO gate — a test-local [K/1] build over the shared
scaffold, K = 2 and 3): [2/1] captures nearly all the available gain, [3/1]
adds only ~3 % for one more coefficient, so K = 2 shipped. The wall the census
located is precisely the one §8 named — `storedq` (the [1/1] form's model
error) and the [1/1] pole `DEN` — both of which a matched-denominator numerator
absorbs.

**Measured** (production build, loop turns vs the Padé heuristic; median
certified-radius gain **+1.5 to +2 decades**):

| view                            | [1/1]-c⁺ (F) | **[2/1]-c⁺** |
|---------------------------------|--------------|--------------|
| feigenbaum ε=1e-4, c=1e-5       | 0.89×        | **0.54×**    |
| feigenbaum ε=1e-3, c=1e-5       | 1.00×        | **0.68×**    |
| feigenbaum ε=1e-6, c=1e-9       | 0.99×        | **0.80×**    |
| seahorse ε=1e-4, c=1e-10        | 0.95×        | **0.58×**    |

On the GPU (seahorse near-critical, 1e-10) the realized skip rises
**8.1 → 10.5** — past Padé (8.3) and past the jet (9.5): on this passage [2/1]-c⁺
is now the deepest skipper, at Padé wall-clock, certified.

**Regime dependence — the table above is the favorable half** (correctif
§12.1, CPU loop turns, July 2026 reproduction). The same census contains the
unfavorable regimes: at coarse (ε, c_max) the certified form refuses long
blocks the heuristic accepts — cusp ε=1e-3/c=1e-5: **3.69×**; period-2
ε=1e-3/c=1e-5: **6.04×**; feigenbaum ε=1e-4/c=1e-9: **1.40×** — while the same
feigenbaum reads 0.54× at ε=1e-4/c=1e-5. Two corrected conclusions: (1) a
certified rational form cannot be declared "never slower" than a heuristic
Padé — the comparison mixes the form with the certification price (the
heuristic radius satisfies no equivalent certificate); (2) the gain is
strongly (ε, c_max)- and reference-dependent. The saturated coarse smooth
regimes (cusp/period2, the 100 %-majorant-saturation views) are the
parabolic-transit wall, outside any rational/polynomial form — the regime the
periodic blocks (§12) and Fatou gates (§14) address. Also note the
[1/1]-vs-[2/1] comparisons of the census conflate `F/A'/D'` (the c⁺ channel)
with the [2/1] numerator — the two changes ship together; isolating them needs
the four separate builders of the §13 battery.

The [1/1]-c⁺ form (§8) is **retained as the c⁺ tier of the unified dispatch
table**: that table's register-reconstruction identities (`a_20 = −D·A`, etc.)
assume the [1/1] `D = −a_20/a_10`, so adopting [2/1] there needs a record
redesign — a follow-up, not a blocker (the standalone mode already ships [2/1]).

---

## 10. Certified series approximation (prefix skip, validated)

The prefix block evaluated at z = 0 is a **pure-c polynomial** — the
historical "series approximation", now certified. Build: the pure-c jet by

```
b'_1 = 2Z·b_1 + 1 ;   b'_j = 2Z·b_j + Σ_{k=1..j−1} b_k·b_{j−k}   (j ≥ 2)
```

(O(N·J) reals; apply at order 4, store to 8). Certified c-radius: stored terms
plus a one-variable Cauchy tail (majorant walk with R_z = 0, ρ ← |2Z|ρ+ρ²+R_c;
scale `R_c = s·y` with s up to ~1e12 — small s freezes θ and yields r = 0).

Measured (ε = 1e-12): r_c(N) decays from 3.5e-8 (N = 50) to 4e-16 (N = 1600)
on seahorse — the profile localizes the first near-critical passage, a useful
diagnostic in itself. **N₀ = 1025 iterations skipped in one application** at
c_max = 1e-14 (validated error 0.003·ε), ≥ 2500 deeper and on slow references.
Gain: ~20–23 ladder applications → 1 polynomial evaluation (degree 4 in c),
tile-vectorizable, no rebasing logic on the prefix. N₀ grows with depth
(~ log(ε/c_max)/⟨log|2Z|⟩).

---

## 11. Analytic anti-aliasing via the c-channel (validated)

**Derivatives ride the blocks.** Through a [2/1]-c⁺ application (the shipped
form — full quotient rule, F and N₂ included; correctif §8):

```
Ae = A + A'c,  De = D + D'c,  N = N₂·z² + Ae·z + B·c,  den = 1 + De·z + F·c
m  = N/den

m_z = (2N₂·z + Ae − m·De)/den
m_c = (A'z + B − m·(D'z + F))/den
w'  = m_z·z' + m_c
```

verified against stepwise propagation to 1e-13, implemented as such in
`mobius_apply`. (An earlier version of this note wrote the derivatives without
F and N₂ — those formulas describe only the old 5-coefficient [1/1] form.)
Same pattern for z'' (exact-step recurrences: `z' ← (2Z+2z)z' + 1`,
`z'' ← (2Z+2z)z'' + 2z'²`).

**Subpixel Taylor:** `ẑ(δ) = z + z'·δ + ½·z''·δ²` with δ = half a pixel.
Measured on escaping pixels (1024-px view): second-order error at escape
5e-6 … 1.5e-3 with margin `|z'|/(|z''|·δ) = 5–30` → **16 analytic subsamples
(2–3 cmul each) instead of 16 orbits**. The margin itself detects boundary
pixels (measured collapse to 1e-5–1e-9 exactly on near-boundary pixels) →
fallback to true subsample iteration there. Expected cost: 16× AA for
~(1 + f·16)× base cost, f = boundary fraction (typically 1–10%). Synergy: the
SA prefix is a polynomial in c, trivially shared by all subsamples.

---

## 12. The interior / periodic regime (validated)

On minibrot-bearing images, interior pixels iterating to maxiter dominate
wall-clock. After the transient, the reference is p-periodic → **one period
block Φ_p** (a dedicated **[1/1]-c⁺** extraction — see the [2/1] caveat
below). For fixed c it is a *fixed* Möbius map
`g(z) = (Ae·z + B·c)/(De·z + K)` with `K = 1 + F·c` (the F slot belongs in
this closure; correctif §9.1):

- **Fixed points:** roots of `De·z² + (K − Ae)·z − Bc = 0` (one csqrt per
  pixel).
- **Multiplier:** `κ = (Ae·K − Bc·De)/(De·ζ + K)²` at the attracting root —
  this is the multiplier of the *pixel's own* period-p cycle. Measured:
  |κ| = 0.4000 = the exact theoretical cycle multiplier (period-2 disk test).
- **Closed form for k periods:** conjugate `w = (z−ζ_a)/(z−ζ_r)`, then
  `w → κ·w`, so k periods = one cpow — **O(1)**. (Stable arithmetic near
  fixed-point coalescence: §14a.)
- **Interior test:** `|κ| < 1` (+ convergence of w) → color immediately with
  period p and multiplier κ (interior DE): cost **O(p) instead of maxiter**.
- **Exterior fast-forward:** `k* = log(w_thresh/|w₀|)/log|κ|` periods in one
  cpow, then resume normal skipping; rebasing resynchronizes, so k* accurate
  to O(1) periods suffices.
- **Damped error bound:** attracting dynamics *damps* per-period truncation:
  total ≤ err_block/(1 − |κ|), **independent of k** — measured identical
  relative error at k = 10 and k = 1000; direct convergence at k = 1e5.

**Why [1/1] and not the shipped [2/1] here** (correctif §9.2): with N₂ ≠ 0 the
block map is rational of degree 2/1, **not a Möbius transformation** — it does
not linearize through the two-fixed-point cross-ratio and its iterates are not
powers of a 2×2 matrix. (Its fixed-point equation is still *quadratic*,
`(De−N₂)z² + (K−Ae)z − Bc = 0` — the obstruction is the degree of the map, not
of that equation.) The periodic header therefore keeps its own [1/1]-c⁺
extraction, as the code does.

Caveats — these belong in the certificate statement, not just here: the
geometric bound `err_block/(1−|κ|)` requires **uniform contraction on an
invariant domain**, not merely |g'(ζ)| < 1 at the fixed point (correctif
§9.1); the runtime margins (|κ| < 0.98, |w₀| < 0.5, path inside the certified
radius) are the operational form of that requirement. Near the component
boundary |κ| → 1 inflates 1/(1−|κ|) — the parabolic regime where
superconvergence minimizes err_block (balance quantified by the §14 gates);
the transient must have decayed below ε; each intermediate iterate must stay
within the block's certified radius (contraction for interior; k* bounded by
the radius for exterior).

Potentially the largest single wall-clock gain of the project, and it reuses
the c⁺ table with no new build.

---

## 13. Implementation guardrails (design rules)

1. Never skip from m = 0 (Z[0] = 0 ⇒ block radius 0 — automatic; don't bypass).
2. Reference more precise than the delta (double-single Z = Z_hi + Z_lo);
   coefficients with per-block shared exponent, not all-extended-precision.
3. Do not benchmark past the reference length (end-of-reference rebase makes
   z ~ O(1) and legitimately kills skipping thereafter).
4. Error scales in every validity condition must include the c-channel
   (`|A|x + |B|c_max`); a z-only scale vanishes as z → 0 while the remainder
   keeps pure-c terms.
5. Polydisc: anisotropic (`R_c = s·c_max`), R_z by bisection on the majorant
   walk (never closed-form prefix heuristics, never orbit-hypothesis
   suppression of ρ²); store D_s = applied order + 3.
6. Admissible radii: **(V) at x = 0 first** (a candidate failing there emits
   no radius — the admissible set is an interval that may exclude 0 and the
   runtime `|z| < r` covers [0, r]; correctif §4.1), then the upper crossing
   by descending geometric scan, not bisection (non-monotone condition);
   convexity of REST − τε·S·DEN closes the interval between the two certified
   points. Point-only certification is unsound.
7. No intermediate-validity min-rule for jet/c⁺ radii (the (V) bound covers
   the composed map; a |D_x| min collapses near-critical radii and poisons
   ancestors recursively). The min-rule belongs to the plain Möbius only.
8. Compare approximants in #applications / wall-clock, never weighted ops.
9. Safety invariant, property-based: sample |Φ| on the polytorus and check
   ≤ M, for random blocks — the net that catches any invalid "tightening" of
   the majorant.
10. Mandatory regression battery: build integrity (the constructed q-zeros —
    six for [1/1]-c⁺, seven for [2/1]-c⁺ with q_30 — at 2^−52 relative on
    every block, on **both** extractions); the (G)-block test (seahorse ref
    C = (−0.743643887037151, 0.131825904205330), block straddling
    |2Z_39| = 5.4e-3: c⁺+F error at the f64 floor ~1e-15 at |c| = 1e-14 where
    plain Möbius gives 1.5e-9); superconvergence C predicted = measured,
    L-independent, on both the [1/1] numerator (q_30) and the [2/1] one (q_40);
    global ρ_N/(Nε) bounded across references, depths, tolerances.
    **Radius-interval additions (correctif §13):** (V) at x = 0 for every
    block and every retained polydisc (enforced in the solver); geometric
    sampling of the WHOLE `[0, r]` of every emitted radius, not just the
    boundary or orbit-visited z (`mobius_radius_certifies_full_interval`); a
    synthetic pure-c block that fails (V) at zero but passes at some x > 0 —
    the single-comparison radius must come out empty
    (`mobius_radius_zero_gate_synthetic`). Census hygiene: keep the four
    builders separate ([1/1] plain, [1/1]-c⁺ via `mobius_build_levels_k1`,
    [2/1] plain, [2/1]-c⁺) — a census line labeled [1/1] that calls the
    production builder measures [2/1]; report certified radius, loop turns,
    applications, bytes read, occupancy and wall-clock as separate columns;
    for the periodic accelerator test uniform contraction and whole-path
    inclusion, not just κ at the fixed point.
11. **Coefficient-count changes touch FOUR stride sites — all must move
    together.** The GPU record width lives, redundantly, in: (a) the Rust
    `MobiusCoeffs` struct (`size_of` guarded), (b) the two WGSL shaders'
    `MOBIUS_COEFF_STRIDE` (brush + debug), (c) the Engine's
    `MOBIUS_COEFF_FLOATS`, and (d) the worker's per-record copy width
    (`coeffFloats`). The worker copy is the dangerous one: if it stays narrow
    while the wasm records grew (5→6→7 coefficients), the copy truncates each
    record and the *tail* of the flat table — serialized by ascending skip —
    arrives zeroed, so the **long blocks** (skip ≥ 64) get zero coefficients.
    A zero-coefficient block applies `φ = 0`: dz collapses onto the reference,
    every radius test still passes, the frame is *faster*, and only the
    derivative/shading channel is wrong → sector glitches along the
    `|dz| = r` arcs. Symptom signature: **"faster but glitchy," all
    certifications green, CPU battery silent** (it never exercises the worker
    copy). Corollary: a stale dev server (a zombie `vite` on the Playwright
    baseURL port) will serve a mixed old-worker/new-wasm build and reproduce
    exactly this — verify the server is fresh before trusting a GPU A/B.

---

## 14. Parabolic gates (Fatou coordinates)

The one wall no rational/polynomial rung crosses is the **slow parabolic
transit**: on coarse smooth views (cusp, period-2) the majorant walk
`ρ ← |2Z|·ρ + ρ² + R_c` saturates on the long blocks (§9). These are gates
where the period-p return map, in local coordinate `u` (conjugated to put the
parabolic point at 0), is

```
F(u) = u + a·u² + b·u³ + O(u⁴),    a ≠ 0     (simple parabolic)
```

reached at a satellite return where the multiplier `κ` of §12 satisfies
`κ^q = 1`. This §12 conjugation `w = (z−ζ_a)/(z−ζ_r), w ↦ κ·w` is a Koenigs
coordinate; it degenerates as `κ → 1` (the bound `err/(1−|κ|)` blows up). Two
distinct fixes:

**(a) Stable Möbius power (removes the numerical singularity of §12).** For the
period block as a fixed 2×2 matrix `M`, k periods = `M^k`. Near coalescence the
two eigenvalues merge to `λ` and `M^k = λ^k(I + k·N)`, `N = M/λ − I` nilpotent.
The shipped implementation computes `M^k` by **projectively normalized binary
exponentiation** (renormalize the matrix at each squaring), which is stable
through the merge with no `1/(1−κ)` factor — more robust than the
divided-difference `(λ_1^k − λ_2^k)/(λ_1 − λ_2)` evaluation an earlier version
of this note proposed (correctif §13). This is still a *model*: it fixes the
arithmetic, not the truncation error.

**(b) Fatou-coordinate gate (crosses the transit in O(1)).** The Fatou
coordinate `Ψ` on each attracting/repelling petal linearizes the return to a
unit translation. With `t = −1/(a·u)` the dynamics reads
`t ↦ t + 1 − ρ/t + O(t⁻²)`, and

```
Ψ(F(u)) = Ψ(u) + 1,     Ψ(u) = −1/(a·u) + ρ·log(−1/(a·u)) + O(u)
```

with `ρ = b/a² − 1` the resurgent (formal-invariant) coefficient — note the
**plus** sign on `ρ·log` under this convention (correctif §10; matches
Dudko–Sauzin, arXiv:1307.8093: dynamics `t + 1 − ρ/t`, coordinate
`t + ρ·Log t`). An earlier version of this note carried a minus sign with the
same ρ; if a source defines `ρ_alt = 1 − b/a²`, the same coordinate reads
`−ρ_alt·log` — coefficient definition and log sign must move together. A
transit of k iterations is then **one translation** `Ψ ↦ Ψ + k` between the
entry petal and the exit petal, plus `Ψ⁻¹` — O(1) instead of O(k).
Écalle–Voronin: a single local series does **not** cover the whole gate —
entry and exit each carry their own petal chart, joined by the horn/transition
data; the prototype uses fixed entry/exit sectors and small q.

**Certification.** §12 bounds the map error in z, but a residual
`ε_Ψ = sup_petal |Ψ∘F − (Ψ+1)|` accumulates **linearly** over the translation,
and a Ψ-error only compares to a z-tolerance through the exit chart's
distortion (correctif §10): the transit is admissible iff

```
|δz_exit| ≤ Lip(Ψ_exit⁻¹)·k·ε_Ψ ≤ ε   on the certified domain,
plus the entry/exit chart errors
(and the exit point lands inside the next block's certified c⁺ radius)
```

`ε_Ψ` is bounded by the same measured-sup + Cauchy-tail machinery as (V)
(sup on a petal-boundary grid, Ehlich–Zeller factor, round-outward), extended
to carry the c-channel (the coefficients `a, b, ρ` are functions of c; the gate
must certify over `|c| ≤ c_max`). Pixels outside the entry sector, past the
component boundary, or with `k·ε_Ψ > ε` fall back to ordinary stepping/table —
**accuracy stays unconditional; only the coarse-view speed is at stake**.

**Lean status (2026-07-13).** `FatouSectorial.lean` now proves the exact
one- and two-petal model coordinates, the runtime principal-log branch guard
`|delta u| < dist(pole)`, exact unit-time translation of the partial-fraction
flow coordinate, the finite linear residual budget, and construction of an
exact Abel coordinate by summing future residuals. Geometric decay
`M theta^n`, `0 ≤ theta < 1`, is sufficient and bounds the correction by
`M/(1-theta)`. A vector-field bound on a convex exit-chart domain supplies the
required Lipschitz constant. On an open preconnected sector, convergence at
one base point plus a summable uniform derivative majorant makes the corrected
coordinate analytic and proves Abel's equation everywhere on that sector.
Branch continuation in the finite logarithmic model adds the explicit constant
`sum rho_i n_i 2 pi i`. What remains is to produce those uniform majorants for
the concrete return and its `c`-channel, plus the nonlinear Écalle--Voronin horn
invariants of the true germ; those invariants are not determined by a finite
jet alone.

*(Implemented in a separate round — build + shader plumbing mirror the §12
periodic block; detector = `|κ^q − 1|` small ∧ fixed-point coalescence ∧
`a ≠ 0`, never `1 − |κ|` alone, and never on irrational-angle returns. GO/ABORT
census and measured coarse-view turn ratios: see
`MANDELBROT_MOBIUS_CPLUS_IMPLEMENTATION.md` §18.)*

---

## 15. Credits

Affine BLA, perturbation and rebasing due to **Zhuoran** and **Claude
Heiland-Allen** (mathr.co.uk, fractalforums); Heiland-Allen's three-point
critique (additive gain, degeneration at small z, bivariate non-closure)
shaped the correctness program of §3–§4. GPU implementation findings by the
author. Derivations, proofs and numerical verification developed jointly
across the series; typesetting and numerical verification assisted by Claude
(Anthropic).
