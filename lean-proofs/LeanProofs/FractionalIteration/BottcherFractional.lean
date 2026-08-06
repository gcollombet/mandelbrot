/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.BottcherAnalytic
import LeanProofs.FractionalIteration.LinearModels

/-!
# Fractional iteration in a cut Böttcher chart

This file formalizes T4.7.  A simply connected cut and a logarithm branch
provide the algebraic data recorded by `BottcherCutChart`: a univalent
Böttcher coordinate, its inverse on the coordinate image, and a right inverse
of the exponential on that image.

The descended family is

`F_t(z) = ψ⁻¹(exp(bottcherLift t (Log(ψ(z)))))`.

The time-zero and time-one identities are exact on the cut domain.  The
additive composition law is deliberately conditional: after the first time
step the lifted coordinate must still belong to the coordinate image, and
the selected logarithm must recover the lift without a `2πi` jump.  The
unconditional additive action remains `bottcherLift` on the logarithmic
cover.
-/

namespace Mandelbrot

noncomputable section

open Function Set

/-- Algebraic descent data supplied by a Böttcher chart restricted to a cut
domain with a chosen logarithm branch.

Simple connectedness is a standard sufficient hypothesis for constructing
`logBranch`.  The identities below only use its exact defining property
`exp_log`, so that property is recorded directly. -/
structure BottcherCutChart (c : ℂ) where
  source : Set ℂ
  coordinate : Set ℂ
  psi : ℂ → ℂ
  psiInv : ℂ → ℂ
  logBranch : ℂ → ℂ
  psi_mapsTo : MapsTo psi source coordinate
  psiInv_mapsTo : MapsTo psiInv coordinate source
  left_inv : LeftInvOn psiInv psi source
  right_inv : RightInvOn psiInv psi coordinate
  exp_log :
    ∀ ⦃w : ℂ⦄, w ∈ coordinate →
      Complex.exp (logBranch w) = w
  boettcher :
    ∀ ⦃z : ℂ⦄, z ∈ source → quad c z ∈ source →
      psi (quad c z) = psi z ^ 2

namespace BottcherCutChart

/-- Coordinate reached at time `t` before applying the inverse Böttcher
chart. -/
def coverCoordinate {c : ℂ} (g : BottcherCutChart c)
    (t : ℝ) (z : ℂ) : ℂ :=
  Complex.exp (bottcherLift t (g.logBranch (g.psi z)))

/-- Fractional iterate descended from the additive action on the logarithmic
Böttcher cover. -/
def fractional {c : ℂ} (g : BottcherCutChart c)
    (t : ℝ) (z : ℂ) : ℂ :=
  g.psiInv (g.coverCoordinate t z)

/-- The lifted coordinate at time `t` lies in the coordinate image, so its
descent is again a point of the cut chart. -/
def AdmissibleAt {c : ℂ} (g : BottcherCutChart c)
    (t : ℝ) (z : ℂ) : Prop :=
  g.coverCoordinate t z ∈ g.coordinate

/-- The fractional expression is defined as a chart map at `(t,z)`: the input
lies in the cut and the lifted output lies in the coordinate image. -/
def DefinedAt {c : ℂ} (g : BottcherCutChart c)
    (t : ℝ) (z : ℂ) : Prop :=
  z ∈ g.source ∧ g.AdmissibleAt t z

/-- The logarithm branch has no jump at the intermediate lifted coordinate.
This is exactly

`Log(exp(2^t Log(ψ(z)))) = 2^t Log(ψ(z))`

with `2^t` represented by `bottcherLift`. -/
def BranchConsistentAt {c : ℂ} (g : BottcherCutChart c)
    (t : ℝ) (z : ℂ) : Prop :=
  g.logBranch (g.coverCoordinate t z) =
    bottcherLift t (g.logBranch (g.psi z))

theorem coverCoordinate_zero
    {c : ℂ} (g : BottcherCutChart c)
    {z : ℂ} (hz : z ∈ g.source) :
    g.coverCoordinate 0 z = g.psi z := by
  rw [coverCoordinate, bottcherLift_zero]
  exact g.exp_log (g.psi_mapsTo hz)

/-- T4.7 at time zero: `F₀ = id` on the cut domain. -/
@[simp] theorem fractional_zero
    {c : ℂ} (g : BottcherCutChart c)
    {z : ℂ} (hz : z ∈ g.source) :
    g.fractional 0 z = z := by
  rw [fractional, coverCoordinate_zero g hz]
  exact g.left_inv hz

theorem coverCoordinate_one
    {c : ℂ} (g : BottcherCutChart c)
    {z : ℂ} (hz : z ∈ g.source)
    (hqz : quad c z ∈ g.source) :
    g.coverCoordinate 1 z = g.psi (quad c z) := by
  rw [coverCoordinate, bottcherLift_one]
  calc
    Complex.exp (2 * g.logBranch (g.psi z)) =
        Complex.exp (g.logBranch (g.psi z)) ^ 2 := by
      simpa using
        (Complex.exp_nat_mul (g.logBranch (g.psi z)) 2)
    _ = g.psi z ^ 2 := by
      rw [g.exp_log (g.psi_mapsTo hz)]
    _ = g.psi (quad c z) := (g.boettcher hz hqz).symm

/-- T4.7 at time one: `F₁ = q_c` whenever the point and its image remain in
the cut domain. -/
@[simp] theorem fractional_one
    {c : ℂ} (g : BottcherCutChart c)
    {z : ℂ} (hz : z ∈ g.source)
    (hqz : quad c z ∈ g.source) :
    g.fractional 1 z = quad c z := by
  rw [fractional, coverCoordinate_one g hz hqz]
  exact g.left_inv hqz

/-- Admissibility is precisely the domain condition ensuring that the
descended intermediate point remains in the cut chart. -/
theorem fractional_mem_source
    {c : ℂ} (g : BottcherCutChart c)
    {t : ℝ} {z : ℂ} (h : g.AdmissibleAt t z) :
    g.fractional t z ∈ g.source := by
  exact g.psiInv_mapsTo h

/-- On an admissible lift, applying `ψ` after descending recovers the lifted
coordinate. -/
theorem psi_fractional
    {c : ℂ} (g : BottcherCutChart c)
    {t : ℝ} {z : ℂ} (h : g.AdmissibleAt t z) :
    g.psi (g.fractional t z) = g.coverCoordinate t z := by
  exact g.right_inv h

/-- The coordinate-level composition calculation.  This is the precise point
where branch consistency is needed. -/
theorem coverCoordinate_add
    {c : ℂ} (g : BottcherCutChart c)
    (s t : ℝ) (z : ℂ)
    (hadmissible : g.AdmissibleAt t z)
    (hbranch : g.BranchConsistentAt t z) :
    g.coverCoordinate s (g.fractional t z) =
      g.coverCoordinate (s + t) z := by
  change g.coverCoordinate t z ∈ g.coordinate at hadmissible
  change
    g.logBranch (g.coverCoordinate t z) =
      bottcherLift t (g.logBranch (g.psi z)) at hbranch
  calc
    g.coverCoordinate s (g.fractional t z) =
        Complex.exp
          (bottcherLift s
            (g.logBranch
              (g.psi (g.psiInv (g.coverCoordinate t z))))) := rfl
    _ = Complex.exp
          (bottcherLift s
            (g.logBranch (g.coverCoordinate t z))) := by
      rw [g.right_inv hadmissible]
    _ = Complex.exp
          (bottcherLift s
            (bottcherLift t (g.logBranch (g.psi z)))) := by
      rw [hbranch]
    _ = g.coverCoordinate (s + t) z := by
      rw [bottcherLift_add]
      rfl

/-- Once the first time step is admissible and branch-consistent, the domain
guard for the second step is exactly the domain guard for the combined
time. -/
theorem admissible_comp_iff
    {c : ℂ} (g : BottcherCutChart c)
    (s t : ℝ) (z : ℂ)
    (hadmissible : g.AdmissibleAt t z)
    (hbranch : g.BranchConsistentAt t z) :
    g.AdmissibleAt s (g.fractional t z) ↔
      g.AdmissibleAt (s + t) z := by
  unfold AdmissibleAt
  rw [g.coverCoordinate_add s t z hadmissible hbranch]

/-- Full chart-domain bookkeeping for composition.  Once `(t,z)` is defined
and the branch is consistent, the second step is defined exactly when the
combined-time expression is defined. -/
theorem defined_comp_iff
    {c : ℂ} (g : BottcherCutChart c)
    (s t : ℝ) (z : ℂ)
    (ht : g.DefinedAt t z)
    (hbranch : g.BranchConsistentAt t z) :
    g.DefinedAt s (g.fractional t z) ↔
      g.DefinedAt (s + t) z := by
  change z ∈ g.source ∧ g.AdmissibleAt t z at ht
  constructor
  · intro hs
    change
      g.fractional t z ∈ g.source ∧
        g.AdmissibleAt s (g.fractional t z) at hs
    exact
      ⟨ht.1,
        (g.admissible_comp_iff s t z ht.2 hbranch).1 hs.2⟩
  · intro hst
    change z ∈ g.source ∧ g.AdmissibleAt (s + t) z at hst
    exact
      ⟨g.fractional_mem_source ht.2,
        (g.admissible_comp_iff s t z ht.2 hbranch).2 hst.2⟩

/-- T4.7 composition law under the explicit intermediate-domain and branch
conditions.  `defined_comp_iff` proves that the second step and the
combined-time expression have exactly the same remaining domain guard. -/
theorem fractional_add
    {c : ℂ} (g : BottcherCutChart c)
    (s t : ℝ) (z : ℂ)
    (ht : g.DefinedAt t z)
    (hbranch : g.BranchConsistentAt t z) :
    g.fractional s (g.fractional t z) =
      g.fractional (s + t) z := by
  change z ∈ g.source ∧ g.AdmissibleAt t z at ht
  change
    g.psiInv (g.coverCoordinate s (g.fractional t z)) =
      g.psiInv (g.coverCoordinate (s + t) z)
  exact congrArg g.psiInv
    (g.coverCoordinate_add s t z ht.2 hbranch)

end BottcherCutChart

namespace BottcherInfinityChart

/-- Restrict a Böttcher chart at infinity to a chosen cut `U` and install a
logarithm branch on its coordinate image.

For the algebraic T4.7 identities, the relevant content of the usual
simply-connectedness hypothesis is the supplied equation `hexp`. -/
noncomputable def restrictToCut
    {c : ℂ} (g : BottcherInfinityChart c)
    (U : Set ℂ) (hU : U ⊆ exteriorDomain g.R)
    (logBranch : ℂ → ℂ)
    (hexp :
      ∀ ⦃w : ℂ⦄, w ∈ g.psi '' U →
        Complex.exp (logBranch w) = w) :
    BottcherCutChart c where
  source := U
  coordinate := g.psi '' U
  psi := g.psi
  psiInv := Function.invFunOn g.psi U
  logBranch := logBranch
  psi_mapsTo := fun z hz ↦ ⟨z, hz, rfl⟩
  psiInv_mapsTo := by
    rintro _w ⟨z, hz, rfl⟩
    exact Function.invFunOn_apply_mem hz
  left_inv :=
    (g.psi_injective.mono hU).leftInvOn_invFunOn
  right_inv := by
    rintro _w ⟨z, hz, rfl⟩
    exact Function.invFunOn_apply_eq hz
  exp_log := hexp
  boettcher := fun {_z} hz hqz ↦
    g.boettcher (hU hz) (hU hqz)

end BottcherInfinityChart

/-- The analytic chart constructed in T4.1 supplies all T4.7 descent data on
any chosen cut, once a logarithm branch satisfying `exp ∘ Log = id` is
provided on its image. -/
noncomputable def constructedBottcherCutChart
    (c : ℂ) (U : Set ℂ)
    (hU : U ⊆ exteriorDomain (bottcherInfinityChart c).R)
    (logBranch : ℂ → ℂ)
    (hexp :
      ∀ ⦃w : ℂ⦄, w ∈ (bottcherInfinityChart c).psi '' U →
        Complex.exp (logBranch w) = w) :
    BottcherCutChart c :=
  (bottcherInfinityChart c).restrictToCut U hU logBranch hexp

end

end Mandelbrot
