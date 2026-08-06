## ADDED Requirements

### Requirement: Finite trapping certificate
The development SHALL provide a reusable theorem turning a finite forward-invariant or eventually trapping orbit certificate over a parameter region into an inclusion of that region in `Mandelbrot`.

#### Scenario: Critical orbit enters a bounded forward-invariant region
- **WHEN** all hypotheses of the trapping certificate are proved uniformly for every parameter in `S`
- **THEN** Lean proves `S ⊆ Mandelbrot`

### Requirement: Exact certificate checking
Candidate interval, polynomial-barrier, or SOS data SHALL only affect trusted theorems through exact rational/algebraic identities and inequalities checked by Lean.

#### Scenario: An external solver emits an SOS identity
- **WHEN** the identity and all coefficients are imported as exact data
- **THEN** Lean expands the identity and proves the required nonnegativity without trusting the solver

### Requirement: Additive inner-area accounting
Certified measurable regions with proved disjointness SHALL compose into rigorous lower bounds for `volume Mandelbrot`.

#### Scenario: New certified region is disjoint from the existing union
- **WHEN** its inclusion, measurability, volume, and disjointness are proved
- **THEN** its volume is added to the existing Mandelbrot lower bound
