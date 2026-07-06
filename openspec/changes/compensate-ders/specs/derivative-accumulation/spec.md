# derivative-accumulation — delta spec

## ADDED Requirements

### Requirement: derS accumulates with compensated summation
Both production iteration shaders SHALL carry the derivative log scale `derS`
as a compensated (hi, lo) register pair, updating it through a branchless
two-sum at EVERY update site: the `der_renormalize` fold, the deep affine and
Padé exponent folds, and the jet/mobius derivative exponent folds. Reads of
`derS` (cache refresh, polar conversion, thresholds) SHALL see the folded value
`hi + lo`.

#### Scenario: Intra-pass drift is eliminated
- **WHEN** a deep-zoom pixel runs thousands of iterations in one progressive
  pass (hundreds of renorm/apply updates to derS)
- **THEN** the accumulated absolute error of derS stays within a few ULP of the
  f64 ground truth (CPU harness referee), where the naive accumulator drifts by
  ~1 ULP per update

#### Scenario: Fast-path fold stays exempt
- **WHEN** a jet/mobius application takes the `|pdz.e| ≤ JET_DER_EXP_FOLD`
  mantissa-fold fast path
- **THEN** derS is not touched at all (no compensation needed, no behavior
  change)

### Requirement: Storage format and visual behavior unchanged
The compensated `lo` term SHALL live only in registers: layers 4/5 keep the
polar (angle, log-magnitude) format with `hi + lo` collapsed to one f32 at
store, and the `derS < −40` cache rebase folds `exp(hi + lo)` into the mantissa
and resets the pair. Iteration counts, escape verdicts and coloring SHALL be
bit-identical to the uncompensated implementation.

#### Scenario: Pass-boundary residual is bounded
- **WHEN** the derivative state round-trips a progressive pass boundary
- **THEN** at most ½ ULP of derS is lost (the dropped lo), with no new
  transcendental introduced by this change

#### Scenario: Color output unaffected
- **WHEN** the same view is rendered before and after the change with DE
  shading disabled
- **THEN** the iteration/color output is identical (derS affects only
  derivative-derived shading and the interior epsilon threshold, whose
  compensated value can only be more accurate)
