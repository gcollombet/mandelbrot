## ADDED Requirements

### Requirement: Certified area enclosure
The development SHALL define an abstract interface for lower and upper area sequences and prove that every valid pair gives a rigorous enclosure of `volume Mandelbrot`.

#### Scenario: Inner and outer certificates are supplied
- **WHEN** `L n ≤ volume Mandelbrot` and `volume Mandelbrot ≤ U n`
- **THEN** Lean proves `volume Mandelbrot ∈ Set.Icc (L n) (U n)`

### Requirement: Effective convergence criterion
The development SHALL prove that a computable selection rule producing `U n - L n < ε` yields an arbitrary-precision enclosure procedure for the Mandelbrot area.

#### Scenario: Requested positive precision is given
- **WHEN** an effective modulus returns an index with certified gap below `ε`
- **THEN** the corresponding enclosure has width below `ε`

### Requirement: No unsupported computability claim
The project SHALL distinguish monotone convergence from effective convergence and SHALL not call the Mandelbrot area computable without a proved effective gap modulus.

#### Scenario: Only convergence without a rate is known
- **WHEN** inner and outer sequences converge abstractly but no computable modulus is available
- **THEN** documentation and theorem names state convergence or semicomputability only, not full computability
