# Mathlib API inventory for low-period multiplier sheets

This inventory records the APIs available in the pinned Mathlib checkout and
the small pieces that still have to be proved locally.  It is intentionally a
proof-engineering document: none of the statements below is counted as a
Mandelbrot theorem until instantiated in Lean.

## 1. Local implicit branches

Use `Mathlib.Analysis.Calculus.ImplicitContDiff` with scalar field `ℂ`.

- `ContDiffAt.implicitFunction` constructs the local branch.
- `ContDiffAt.implicitFunction_apply_self` fixes its value at the base point.
- `ContDiffAt.eventually_apply_implicitFunction` proves the equation locally.
- `ContDiffAt.eventually_apply_eq_iff_implicitFunction` gives local uniqueness
  of the zero set as a graph.
- `ContDiffAt.hasStrictFDerivAt_implicitFunction` and
  `ContDiffAt.contDiffAt_implicitFunction` provide the derivative and complex
  smoothness of the branch.

For `F (mu, c) = R_n(c, mu)`, the required invertibility hypothesis is exactly
`partial_c F ≠ 0`.  This is supplied on the closed unit disk by
`periodThreeParameterPolynomial_root_simple` and
`periodFourParameterPolynomial_root_simple`.

There is no separate packaged analytic implicit-function theorem in this
checkout.  The appropriate route is the complex `ContDiff` theorem; complex
differentiability supplies the holomorphic local branch needed here.

## 2. Finite fibers

Use `Polynomial.roots` over `ℂ`.

- `Polynomial.mem_roots` identifies roots with `Polynomial.IsRoot`.
- `Polynomial.card_roots'` bounds the multiset cardinality by `natDegree`.
- `Polynomial.mem_roots_iff_aeval_eq_zero` is useful when the total space is
  written using `aeval`.
- The already proved degree statements give fiber bounds `3` and `6`.
- Nonzero discriminant makes the roots simple, so the root multiset has no
  repetitions; this must be converted to the precise finite-fiber statement
  needed by the covering construction.

## 3. Total spaces and local homeomorphisms

Define the curve over the open multiplier disk as the subtype

`{p : ℂ × ℂ // ‖p.1‖ < 1 ∧ R_n p.2 p.1 = 0}`

and let the projection be `p ↦ p.1` into the disk subtype.

`Mathlib.Topology.IsLocalHomeomorph` provides:

- `isLocalHomeomorphOn_iff_isOpenEmbedding_restrict`;
- `IsLocalHomeomorphOn.mk` from compatible local partial homeomorphisms;
- `IsLocalHomeomorph.isOpenMap` and local injectivity once the construction is
  complete.

The graph characterization
`ContDiffAt.eventually_apply_eq_iff_implicitFunction` is the key input for
turning every simple root into the required local partial homeomorphism.

## 4. Properness

Use `Mathlib.Topology.Maps.Proper.CompactlyGenerated`.

- `isProperMap_iff_isCompact_preimage` reduces properness to continuity plus
  compactness of inverse images of compact sets.
- `IsProperMap.isCompact_preimage` is the forward-use theorem.
- `isProperMap_iff_isClosedMap_and_compact_fibers` is an alternative route.

For this algebraic curve, compactness requires a uniform Cauchy-type bound for
the parameter roots over a compact multiplier set.  Mathlib already supplies
`Polynomial.cauchyBound` and
`Polynomial.IsRoot.norm_lt_cauchyBound` in
`Mathlib.Analysis.Polynomial.CauchyBound`.  Since the leading coefficients are
the constant nonzero values `64` and `4096`, finite coefficient estimates give
uniform bounds on the parameter roots.  These combine with closedness of the
zero locus and Heine--Borel compactness in `ℂ × ℂ`.

## 5. From local sheets to a covering

`Mathlib.Topology.Covering.Basic` provides:

- `IsCoveringMap`, `IsEvenlyCovered`, and `IsCoveringMap.mk`;
- restriction and trivialization APIs;
- the consequences `IsCoveringMap.isLocalHomeomorph`, continuity, and
  separatedness.

The checkout does not package the exact one-line implication “proper local
homeomorphism implies covering map”, but it contains the essential gluing
theorem `IsClosedMap.isCoveringMapOn_of_openPartialHomeomorph`.  The local
helper `IsProperMap.isCoveringMap_of_isLocalHomeomorph` is therefore short:

1. a proper local homeomorphism has compact discrete fibers;
2. each such fiber is finite;
3. choose pairwise local sheets around its finitely many points;
4. shrink the base neighborhood so no other points enter, using properness;
5. assemble the sheets with `IsEvenlyCovered` or `IsCoveringMap.mk`.

This general-topology helper is now proved independently of the Mandelbrot
equations and is ready to be reused for periods three and four.

## 6. Global lifting over the disk

`Mathlib.Topology.Homotopy.Lifting` provides exactly the desired globalization:

- `IsCoveringMap.exists_path_lifts` and `IsCoveringMap.liftPath`;
- `IsCoveringMap.existsUnique_continuousMap_lifts` for a simply connected,
  locally path-connected source.

For the open unit disk, use convexity:

- `Convex.contractibleSpace` gives contractibility;
- `Convex.locPathConnectedSpace` gives local path connectedness;
- contractibility supplies the simply connected instance used by the lifting
  theorem.

Apply the lifting theorem to the identity map of the disk, with a selected
center over `mu = 0`.  The resulting lift is the unique global sheet through
that center.  Holomorphicity remains local and is inherited from the implicit
branches by uniqueness.

## Immediate implementation order

1. Define the two curve subtypes and projections.
2. Package the polynomial equations as `ContDiff ℂ ∞` maps and construct local
   graph charts from root simplicity.
3. Prove the specialized uniform root bound and projection properness.
4. Prove the reusable `IsProperMap + IsLocalHomeomorph -> IsCoveringMap` helper.
5. Lift the disk from each certified center and identify the local derivative
   with the already computed first coefficient.
