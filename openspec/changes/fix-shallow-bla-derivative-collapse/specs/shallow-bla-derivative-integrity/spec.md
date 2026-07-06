## ADDED Requirements

### Requirement: Shallow BLA/Padé block radius validity is immune to f32 underflow
The shallow (f32) BLA/Padé block-apply path SHALL determine block-radius validity using a test
that cannot be falsely satisfied when `|dz|` underflows toward zero in plain f32 arithmetic.

#### Scenario: Deep-shallow zoom drives |dz| below the f32 dot-product underflow floor
- **WHEN** the current perturbation offset `dz` has magnitude below roughly `1e-19` (so that
  `dot(dz, dz)` would flush to exactly `0.0` in f32) and a candidate BLA/Padé block is probed
- **THEN** the radius validity test SHALL NOT rely on the squared magnitude of `dz` computed via
  plain f32 `dot()`, and SHALL NOT treat the block as valid merely because both the squared
  magnitude and the squared radius independently underflowed to `0.0`

#### Scenario: A block's radius has collapsed to zero for the current view
- **WHEN** a BLA/Padé block's effective radius `max(0.0, alpha - beta·dcMag)` evaluates to `0.0`
  for the current `dc` (a "dead" block)
- **THEN** that block SHALL be treated as invalid for every `dz`, regardless of how small `dz`
  is or whether its squared magnitude has underflowed

### Requirement: Shallow BLA/Padé derivative updates stay folded into the shared log-scale register
The shallow (f32) BLA/Padé block-apply path SHALL update the running derivative using the same
log-scale fold-and-refresh discipline used by every other approximation mode's block-apply path,
so that the derivative mantissa cannot silently saturate to infinity or zero.

#### Scenario: A BLA/Padé block application changes the derivative's magnitude by a large factor
- **WHEN** the shallow BLA/Padé path applies a block (affine or Padé branch) whose coefficient
  magnitude, reconstructed via `ldexp` from its stored exponent, is far from unit scale
- **THEN** the resulting derivative update SHALL fold the corresponding scale factor into the
  shared log-scale accumulator (mirroring `der_scale_add`) and refresh the dependent cached
  values (mirroring `der_refresh_cache`) before the next iteration, in the same manner as the
  deep (floatexp) BLA/Padé path and the jet/mobius block-apply paths already do

#### Scenario: Distance-estimation derivative is read after a long run of shallow BLA/Padé blocks
- **WHEN** the renderer computes the distance-estimation height from the accumulated derivative
  after a sequence of shallow BLA/Padé block applications
- **THEN** the derivative value SHALL reflect the true accumulated scale (mantissa plus folded
  log-scale) rather than a value that has silently saturated due to an un-folded update
