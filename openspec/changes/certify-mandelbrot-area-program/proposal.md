## Why

The Lean development now proves a strict Mandelbrot-area lower bound above `7π/16`, and its exact low-period arithmetic already has enough margin to exceed `29/20`. The next obstacle is no longer Fatou/Montel but the missing certified link between the period-three/four multiplier equations and injective holomorphic parameter branches; in parallel, the project needs an upper-bound route that does not depend on formalizing the global Douady-Hubbard uniformization.

## What Changes

- Certify the period-three and period-four multiplier curves over the unit multiplier disk using exact resultants, discriminants, finite covering theory, and attracting-cycle uniqueness.
- Turn the existing first-coefficient area budget into an unconditional Lean theorem `29 / 20 < volume Mandelbrot`.
- Introduce the nested finite-escape lemniscates `K n = {c | ‖mandelbrotOrbit c n‖ ≤ 2}` and prove that their intersection is the Mandelbrot set and that their volumes decrease to its volume.
- Define certificate interfaces for semialgebraic/validated outer-area bounds and for polynomial or interval trapping regions that provide additional inner-area bounds.
- State the effective-gap criterion that converts converging certified inner and outer bounds into computability of the Mandelbrot area.
- Keep exploratory Wolfram calculations outside the trusted base: every retained polynomial identity, root separation, inequality, and measure statement must be rechecked by Lean.

## Capabilities

### New Capabilities

- `low-period-multiplier-cover`: Exact algebraic and analytic certification of the period-three/four multiplier branches and their disjoint images in the Mandelbrot set.
- `finite-escape-area-outer-bounds`: Nested semialgebraic finite-escape sets and rigorous outer-area convergence independent of exterior conformal uniformization.
- `certified-invariant-area-inner-bounds`: Reusable finite certificates for trapping regions and positive-area subsets of the Mandelbrot set.
- `effective-area-gap`: An abstract criterion combining computable inner and outer bounds into arbitrary-precision area enclosures.

### Modified Capabilities

None.

## Impact

- Primary scope: `lean-proofs/LeanProofs/`, `lean-proofs/LeanProofs.lean`, and the mathematical decision/inventory notes under `lean-proofs/`.
- New proofs will use Mathlib polynomial resultants/discriminants, complex analytic inverse-function APIs, covering-space topology, measure continuity, and existing Mandelbrot orbit/area modules.
- Optional exploratory generators may use Wolfram or external validated numerics, but generated output is not trusted until represented by exact Lean-checkable certificates.
- No frontend, renderer, Rust/WASM, or public application API behavior changes.
