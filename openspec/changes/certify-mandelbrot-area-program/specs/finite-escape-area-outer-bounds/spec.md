## ADDED Requirements

### Requirement: Nested finite-escape sets
The development SHALL define the finite-escape outer set at iteration `n` by the radius-two orbit inequality and prove these sets form a decreasing sequence.

#### Scenario: A parameter survives iteration `n + 1`
- **WHEN** `‖mandelbrotOrbit c (n + 1)‖ ≤ 2`
- **THEN** the escape-growth theorem implies `‖mandelbrotOrbit c n‖ ≤ 2`

### Requirement: Exact limit set
The intersection of all finite-escape outer sets SHALL be proved equal to `Mandelbrot`.

#### Scenario: Parameter is in every outer set
- **WHEN** `c` satisfies the radius-two inequality at every finite iteration
- **THEN** the existing radius-two criterion proves `c ∈ Mandelbrot`

### Requirement: Outer-volume convergence
The finite-escape sets SHALL be measurable with finite initial volume, and their volumes SHALL be proved to decrease to `volume Mandelbrot`.

#### Scenario: Measure continuity from above applies
- **WHEN** nestedness, measurability, finite initial volume, and the intersection identity are available
- **THEN** Lean proves convergence of the outer volumes without assuming zero boundary area

### Requirement: Checkable outer-area certificate
The development SHALL expose a theorem that converts any exact upper bound on `volume K_n` into an upper bound on `volume Mandelbrot`.

#### Scenario: A backend certifies a finite lemniscate volume
- **WHEN** a rational or algebraic certificate proves `volume K_n ≤ U`
- **THEN** Lean derives `volume Mandelbrot ≤ U`
