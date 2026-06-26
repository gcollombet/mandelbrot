## ADDED Requirements

> These requirements capture the **correctness invariants** the three derivations establish
> (`design.md` D2–D6): what any Padé [1/1] block-jump implementation MUST satisfy *if built*,
> independent of the eventual hybrid-vs-abandon decision. The user-facing behaviour and the
> ship decision (source doc §8) are intentionally out of scope here.

### Requirement: Padé block form and seed
A Padé approximation block SHALL apply the rational map `z ← (A·z + B·c)/(1 + D·z)` and
SHALL seed a single step with `A = 2·Z`, `B = 1`, `D = −1/A`, so that the block reproduces
the exact step's `z²` term (whereas the affine block drops it).

#### Scenario: Seed reproduces the quadratic term
- **WHEN** a single-step Padé block with `D = −1/A` is expanded as a series in `z`
- **THEN** its `z²` coefficient equals the exact step's (`1`), and the leading error term is
  `z³/A`, giving relative error `(|z|/|A|)²` — the square of the affine block's `|z|/|A|`

#### Scenario: Degenerate seed is refused
- **WHEN** the reference value `Z` at a candidate block start is near zero (`A = 2Z ≈ 0`)
- **THEN** no Padé block is started there (the existing degenerate-radius gating applies),
  matching the affine path's Bug-1 guard

### Requirement: Validity-radius composition
The Padé block validity radius SHALL be seeded at `√ε·|A|` (versus the affine `ε·|A|`) and
SHALL compose through the merge tree using only `A`, the child radii, and `β` — the `D`
coefficient SHALL NOT enter the radius gate. The shipped composition SHALL use the affine
`min` pullback with the `√ε` seed; a reciprocal-quadrature composition
`1/R_z² = 1/R_x² + |A_x|²/R_y²` MAY replace it if cumulative-error artifacts are observed.

#### Scenario: Seed radius is √ε larger than affine
- **WHEN** a Padé block and an affine block are seeded at the same reference point
- **THEN** the Padé validity radius is `√ε·|A|` and the affine is `ε·|A|`, a `1/√ε` ratio

#### Scenario: D is excluded from the radius gate
- **WHEN** the per-entry validity radius is evaluated for a Padé block
- **THEN** the gate uses only `A`, the child radii, and `β` (the `D`-dependent pullback
  correction is `√ε`-small and dropped); `D` is consumed only by the block application

#### Scenario: Advantage preserved under expanding composition
- **WHEN** Padé blocks are merged in an expanding-orbit region (`|A_x| ≫ 1`) under the
  `min`-with-`√ε`-seed law
- **THEN** the composed Padé radius tracks the affine pullback `R_y/|A_x|` scaled by the
  uniform `1/√ε` factor (the seed advantage is preserved, not eroded)

### Requirement: Padé block derivative
A Padé block SHALL update the perturbation derivative `der = dz/dc` by
`der ← (A/M²)·der + B/M` with `M = 1 + D·z` (the Möbius derivative), and SHALL NOT reuse the
affine recurrence `der ← A·der + B`. This SHALL hold in both the shallow (`f32`) and deep
(floatexp) shader paths.

#### Scenario: Block uses the Möbius derivative
- **WHEN** a Padé block is applied and `der` is propagated
- **THEN** the multiplicative factor is `A/M²` and the additive term is `B/M`, reusing the
  `invM = 1/M` already computed for the block's value output

#### Scenario: Affine derivative shortcut is rejected as inconsistent
- **WHEN** the affine recurrence `der ← A·der + B` is used inside a Padé block
- **THEN** the per-block derivative error is `≈ 2·|D·z| ≤ 2√ε` — order `1/√ε` larger than the
  `ε` value-error budget — and accumulates coherently in the expanding regime, so this
  shortcut is not permitted

### Requirement: Rebasing compatibility
Padé blocks SHALL be compatible with Zhuoran rebasing with no Padé-specific rebasing code:
`der` SHALL be carried unchanged across a rebase, no block SHALL jump past a full-orbit
near-zero crossing, and each block's `D` SHALL be read fresh from the merge table by
reference index.

#### Scenario: Derivative is invariant across a rebase
- **WHEN** a rebase sets `dz ← w` and `ref_i ← 0` (the full value `w` is unchanged)
- **THEN** `der` is left unmodified, since `der = dw/dc` and the reference is `c`-independent

#### Scenario: No block spans a near-zero crossing
- **WHEN** the full orbit value would pass near zero inside a candidate block (`|dz| ≈ |Z|`
  at some interior step)
- **THEN** the per-step validity (`|dz| < √ε·|A| ≪ |Z|`) is violated there and the radius
  gate shrinks the block to exclude it, so the rebase is never skipped

#### Scenario: D is not carried across a rebase
- **WHEN** a rebase resets the reference index to 0
- **THEN** the next block reads its `D` from the table at the new index (no per-pixel `D`
  accumulator to reconcile), avoiding the source doc's §6 on-the-fly ambiguity

### Requirement: Pole guard and radius telemetry
The Padé application SHALL guard the denominator (`|1 + D·z| < POLE_THRESHOLD` → exact step
fallback), and the implementation SHALL expose the guard's fire rate as the empirical
validator of the radius composition.

#### Scenario: Guard rarely fires under a sound radius
- **WHEN** Padé runs with the `√ε`-seeded radius and `skip ≤ MAX_BLA_SKIP` (`2¹⁶`)
- **THEN** `|D·z| ≤ √ε` keeps `|1 + D·z| ≈ 1`, so the pole guard fires on a negligible
  fraction of applications

#### Scenario: High fire rate signals a too-large radius
- **WHEN** the pole-guard fire rate exceeds ~10% of applications
- **THEN** it is interpreted as the composed radius being too large (not the pole being
  misplaced), prompting a switch to the quadrature composition or a lower skip ceiling
