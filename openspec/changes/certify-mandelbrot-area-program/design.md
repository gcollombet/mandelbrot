## Context

The current Lean development proves the radius-two membership criterion, the full main-cardioid and period-two-bulb inclusions, their exact combined area `7π/16`, and a strict positive improvement. It also proves a general first-coefficient area inequality and exact period-three/four multiplier equations, with a rational coefficient budget that would imply `29/20 < volume Mandelbrot` if the corresponding inverse multiplier branches were known to exist injectively on a compact multiplier disk.

The earlier Montel/Fatou blocker has been removed by a quadratic-specific inverse-branch proof. The remaining low-period blocker is therefore algebraic/topological rather than a need for global parameter-space uniformization.

## Goals / Non-Goals

**Goals:**

- Close the period-three/four branch existence, dynamical inclusion, disjointness, and coefficient-isolation obligations without assuming Douady-Hubbard or the general multiplier theorem.
- Derive the unconditional Lean theorem `29 / 20 < volume Mandelbrot`.
- Establish an independent, unconditional sequence of semialgebraic outer sets whose volumes converge to the Mandelbrot area.
- Expose small trusted certificate interfaces for future SOS, interval, Picard-Fuchs, or validated-contour computations.
- Keep all final theorems free of `sorry`, custom axioms, floating-point assumptions, and unverified computer algebra.

**Non-Goals:**

- Formalizing the complete Douady-Hubbard uniformization, measurable Riemann mapping theorem, or general theory of hyperbolic components.
- Claiming a practical arbitrary-precision area algorithm before an effective convergence modulus is proved.
- Treating Monte Carlo, pixel counts, Wolfram output, or external SDP output as proof.
- Changing the renderer or runtime application.

## Decisions

### Use a finite algebraic covering instead of global multiplier uniformization

For periods three and four, define the algebraic curve `R_p(c, μ) = 0` over the multiplier disk. Prove exact discriminant factorizations and non-vanishing on `‖μ‖ ≤ 1`; then show projection to the multiplier disk is a finite unramified covering. Since the disk is simply connected, selected center roots lift to global branches. This closes only the cases required by the area budget.

Alternative rejected: formalize quasiconformal surgery and the general multiplier theorem. It is much broader than the target and introduces major unavailable analytic infrastructure.

### Reconstruct dynamics from dynatomic/resultant witnesses

The multiplier equations SHALL be linked to actual periodic points through exact dynatomic polynomials and resultants. A root of the multiplier equation with `‖μ‖ < 1` must yield an attracting periodic orbit, not merely an unexplained algebraic relation.

### Generalize the minimal quadratic Fatou argument only as far as needed

Extend the existing inverse-branch/Schwarz contradiction from fixed and period-two returns to arbitrary finite return period. Use the unique critical orbit to prove that a quadratic polynomial has at most one attracting cycle. This supplies both Mandelbrot inclusion and injectivity/disjointness of the low-period parameter branches.

### Separate branch construction, arithmetic isolation, and area accounting

Branch existence and injectivity, algebraic root isolation/first-coefficient bounds, and measure arithmetic remain separate modules. External tools may discover identities or rational boxes, but Lean verifies each final certificate.

### Use finite-escape lemniscates for the outer sequence

Define `K_n = {c | ‖mandelbrotOrbit c n‖ ≤ 2}`. Prove `K_(n+1) ⊆ K_n`, `Mandelbrot = ⋂ n, K_n`, measurability/finite volume, and continuity from above of `volume K_n`. This avoids exterior conformal uniformization and does not assume zero boundary area.

### Treat advanced numerics as certificate producers

Future SOS, interval, and Picard-Fuchs computations SHALL emit rational/algebraic certificates with small Lean checkers. The initial implementation defines and proves the mathematical certificate contracts; it does not add an untrusted numerical dependency to the Lean build.

## Risks / Trade-offs

- **[Risk] Mathlib lacks a ready theorem turning a polynomial family with nonzero discriminant into a covering.** → Build the needed finite-root local trivialization from the analytic implicit-function theorem and existing covering-space APIs, keeping it generic enough for both periods.
- **[Risk] Resultant zero can include lower-period or parabolic degeneracies.** → Use exact dynatomic factors and prove the attracting `‖μ‖ < 1` case reconstructs a genuine bounded orbit.
- **[Risk] Global branch injectivity does not follow from a nonzero discriminant alone.** → Prove uniqueness of attracting cycles for quadratics and use the multiplier as an invariant.
- **[Risk] Complex center isolation becomes certificate-heavy.** → Use rational rectangles/disks and exact polynomial norm bounds; omit tiny components if the existing `29/20` margin remains sufficient.
- **[Risk] `volume K_n` converges too slowly for a competitive numerical majorant.** → First formalize convergence and certificate interfaces; later compare Picard-Fuchs, sparse SOS, and validated boundary integration before committing to one backend.
- **[Risk] The full program is larger than one proof pass.** → Keep every phase independently compiling and record conditional interfaces without promoting them to Mandelbrot-area theorems.

## Migration Plan

1. Add low-period discriminant and algebraic-cover modules without changing existing theorems.
2. Add the generalized attracting-cycle/critical-orbit theorem and connect the branches to `Mandelbrot`.
3. Close center isolation and assemble the `29/20` theorem.
4. Add finite-escape outer-set modules and abstract certificate interfaces.
5. Import completed modules from `LeanProofs.lean`, update phase notes/decisions, run targeted builds, full `lake build LeanProofs`, and `#print axioms` audits.

Rollback is additive: remove the new imports/modules while retaining the already proved lower-bound development.

## Open Questions

- Whether the covering proof is shorter through Mathlib's covering-space lifting API or through explicit analytic root continuation on the disk.
- Whether center isolation should use Rouché disks, real/complex interval rectangles, or Mathlib algebraic-number root isolation.
- Which outer-area backend gives the first competitive certified value without expanding the exponentially large orbit polynomial.
