## ADDED Requirements

### Requirement: Extended-exponent perturbation deltas
The renderer SHALL represent the perturbation deltas (`dz`, `dc`) and the `scale`/`cx`/`cy` view parameters used by the deep path with an extended-exponent format: an `f32` mantissa pair carrying a single shared base-2 integer exponent per complex value, so that delta magnitudes far below the `f32` normal minimum remain representable.

#### Scenario: Delta below the f32 underflow wall is preserved
- **WHEN** the view `scale` is smaller than the `f32` normal minimum (~`1.2e-38`) so that `dc = local·scale + (cx,cy)` would underflow `f32`
- **THEN** the deep path represents `dc` and `dz` with a non-zero extended-exponent value instead of collapsing them to zero

#### Scenario: Image continues past the legacy wall
- **WHEN** the user zooms past `scale ≈ 1e-38`
- **THEN** the rendered fractal continues to resolve new detail instead of freezing into a single uniform value

### Requirement: Threshold-gated path selection
The renderer SHALL select the iteration path by a `scale` threshold of ~`1e-35` (base-2 exponent `<= -116`): views at or above the threshold use the existing `f32` (BLA and non-BLA) path unchanged, and views below it use the new extended-exponent exact-perturbation path, switching off `f32` before its precision degrades approaching the underflow wall.

#### Scenario: Shallow view uses the unchanged fast path
- **WHEN** the current `scale` is at or above the threshold
- **THEN** the renderer runs the existing `f32` + BLA path and its output is unchanged from before this capability

#### Scenario: Deep view uses the extended-exponent path
- **WHEN** the current `scale` is below the threshold
- **THEN** the renderer runs the extended-exponent exact-perturbation loop with `dz`/`dc` in extended-exponent form and the reference orbit `z_n` read as `f32`

#### Scenario: Deep path does not use BLA
- **WHEN** the deep extended-exponent path is active
- **THEN** the iteration uses exact perturbation steps only and does not apply BLA blocks (whose `f32` `dc` term and radii are invalid below the underflow wall)

### Requirement: Host-side decomposition of view parameters
The host SHALL decompose the `f64` `scale`, `cx`, and `cy` values into `(mantissa, exponent)` with `mantissa · 2^exponent` equal to the value and `|mantissa|` in `[0.5, 1)`, where `cx`/`cy` share a single exponent. The mantissa is representable in `f32`; the exponent is exact.

#### Scenario: Decomposition round-trips a deep value
- **WHEN** a `scale` deep within the `f64` range (down to ~`1e-308`) is decomposed into `(mantissa, exponent)`
- **THEN** `mantissa · 2^exponent` reconstructs the original value within `f32` mantissa precision and `|mantissa|` lies in `[0.5, 1)`

#### Scenario: Zero decomposes safely
- **WHEN** a value of `0` is decomposed
- **THEN** the helper returns a mantissa of `0` and does not produce `NaN` or a non-finite exponent

#### Scenario: Exponents transported in spare uniform slots
- **WHEN** the deep path is dispatched
- **THEN** the `scale`/`cx`/`cy` exponents are carried in the previously-unused Mandelbrot uniform padding slots without changing the uniform struct size

### Requirement: Distance-estimation continuity across the threshold
The deep path SHALL compute the distance-estimation `log(scale)` term by recomposing it from the extended-exponent value (`log(mantissa) + exponent · LN2`) so that shading remains continuous as `scale` crosses the deep threshold.

#### Scenario: No shading discontinuity at the seam
- **WHEN** the view `scale` is stepped across the deep threshold from the shallow side to the deep side
- **THEN** the distance-estimation shading does not visibly jump at the threshold
