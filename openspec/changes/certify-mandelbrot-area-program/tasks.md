## 1. Baseline and exact low-period algebra

- [x] 1.1 Build the existing low-period Lean modules and record an axiom audit baseline
- [x] 1.2 Add exact period-three and period-four discriminant polynomial definitions
- [ ] 1.3 Prove the two discriminant factorization identities in Lean
- [x] 1.4 Prove both discriminants are nonzero on the closed unit multiplier disk
- [x] 1.5 Prove roots in the parameter variable are simple on the closed unit multiplier disk

## 2. Finite algebraic covering

- [x] 2.1 Inventory Mathlib APIs for analytic implicit functions, finite polynomial roots, proper maps, and covering lifts
- [x] 2.2 Define the multiplier-curve total spaces and their projections over an open multiplier disk
- [x] 2.3 Prove local holomorphic root branches from simple roots
- [x] 2.4 Prove the multiplier-curve projections are finite covering maps over the unit disk
- [x] 2.5 Lift the disk from each exact center and prove uniqueness of the resulting global sheet

## 3. Dynamical interpretation and branch injectivity

- [x] 3.1 Define exact period-three and period-four dynatomic factors and return-map multipliers
- [x] 3.2 Prove the multiplier equations are the corresponding exact resultant relations
- [x] 3.3 Generalize the inverse-branch critical-orbit theorem to an arbitrary finite return period
- [x] 3.4 Prove a quadratic polynomial has at most one attracting periodic cycle
- [x] 3.5 Prove every low-period branch point with multiplier norm below one belongs to `Mandelbrot`
- [x] 3.6 Prove the selected branch maps are injective with pairwise disjoint images

## 4. Center isolation and the `29/20` theorem

- [x] 4.1 Add exact rational isolation certificates for the selected period-three centers
- [x] 4.2 Add exact rational isolation certificates for the selected period-four centers
- [x] 4.3 Derive the five first-coefficient norm lower bounds from the isolation certificates
- [x] 4.4 Instantiate the existing multiplier-area theorem on the compact radius `99/100` disk
- [x] 4.5 Assemble and audit the unconditional theorem `29 / 20 < volume Mandelbrot`

## 5. Finite-escape outer sets

- [x] 5.1 Define the iteration-`n` finite-escape set using the radius-two inequality
- [x] 5.2 Prove finite-escape sets are measurable, bounded, and nested
- [x] 5.3 Prove their intersection is exactly `Mandelbrot`
- [x] 5.4 Prove their volumes converge downward to `volume Mandelbrot`
- [x] 5.5 Add the finite-lemniscate-volume-to-Mandelbrot-upper-bound theorem

## 6. Certified inner and outer backend interfaces

- [x] 6.1 Define a reusable finite trapping-region certificate and prove its Mandelbrot inclusion theorem
- [x] 6.2 Define an exact polynomial/SOS identity checker interface with no trusted numerical oracle
- [x] 6.3 Define additive disjoint-region area accounting for certified inner regions
- [x] 6.4 Document certificate formats for validated contour, Picard-Fuchs, interval, and SOS backends

## 7. Effective gap criterion

- [x] 7.1 Define abstract certified lower and upper area sequences
- [x] 7.2 Prove every sequence pair yields closed interval enclosures of the Mandelbrot area
- [x] 7.3 Prove an effective gap modulus yields arbitrary positive-precision enclosures
- [x] 7.4 Document why monotone convergence alone does not establish full computability

## 8. Integration and verification

- [x] 8.1 Add completed modules to `LeanProofs.lean` without disturbing unrelated imports
- [x] 8.2 Update `MANDELBROT_AREA_PHASE0.md` and `DECISIONS.md` with proved versus conditional status
- [x] 8.3 Run targeted module builds and `#print axioms` checks after each proof group
- [x] 8.4 Run the full `lake build LeanProofs` completion check
