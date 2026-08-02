## ADDED Requirements

### Requirement: Exact low-period multiplier algebra
The Lean development SHALL prove the period-three and period-four multiplier/resultant identities and their discriminant factorizations as exact polynomial identities.

#### Scenario: External algebra output is retained
- **WHEN** Wolfram or another system proposes a resultant or discriminant factorization
- **THEN** the retained identity is independently proved in Lean with exact coefficients and no external oracle

### Requirement: Unramified multiplier covering
The development SHALL prove that each low-period multiplier polynomial has only simple parameter roots throughout the closed unit multiplier disk and SHALL construct the corresponding holomorphic branches from the exact centers.

#### Scenario: Multiplier lies in the unit disk
- **WHEN** `‖μ‖ ≤ 1` and `R_p(c, μ) = 0` for `p = 3` or `p = 4`
- **THEN** the partial derivative with respect to `c` is nonzero and the selected center root extends locally without branching

#### Scenario: A center selects a global sheet
- **WHEN** a simple center root at `μ = 0` is selected
- **THEN** the development produces a unique holomorphic branch over the required multiplier disk satisfying the multiplier equation and the center initial value

### Requirement: Dynamical interpretation and disjointness
Every constructed branch point with multiplier norm strictly below one SHALL be proved to belong to `Mandelbrot`, and the branch images used in the area sum SHALL be injective and pairwise disjoint.

#### Scenario: Algebraic branch point has attracting multiplier
- **WHEN** `R_p(c, μ) = 0` on a certified branch and `‖μ‖ < 1`
- **THEN** Lean reconstructs an attracting periodic orbit and proves `c ∈ Mandelbrot`

#### Scenario: Two certified branch images coincide
- **WHEN** two certified low-period branch points have the same parameter `c`
- **THEN** uniqueness of the quadratic attracting cycle forces the periods, branches, and multipliers to coincide

### Requirement: Certified area threshold
The completed low-period proof SHALL combine the existing cardioid/bulb area with certified period-three/four branch areas to prove `29 / 20 < volume Mandelbrot`.

#### Scenario: Final theorem audit
- **WHEN** the low-period branch and coefficient certificates are complete
- **THEN** `lake build LeanProofs` succeeds and `#print axioms` for the final area theorem contains no `sorry` or custom axiom
