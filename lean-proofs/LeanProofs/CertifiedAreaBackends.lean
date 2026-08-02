/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.EffectiveAreaGap
import LeanProofs.FiniteCycleFatou
import Mathlib.RingTheory.MvPolynomial.Basic

/-!
# Kernel-checked interfaces for area-certificate backends

This file deliberately separates certificate production from certificate
checking.  External contour, interval, Picard--Fuchs, or SOS programs may
produce finite data, but the final inclusion, identity, and area-accounting
theorems below are checked by Lean.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set MeasureTheory
open scoped ENNReal

/-! ## Finite trapping regions -/

/-- A finite trapping certificate for one parameter.  The region need not
have a special representation at this abstract layer: a backend supplies a
checked entry point, forward invariance, and a uniform norm bound. -/
structure FiniteTrappingRegionCertificate (c : ℂ) where
  carrier : Set ℂ
  entryTime : ℕ
  radius : ℝ
  entry : mandelbrotOrbit c entryTime ∈ carrier
  forward : MapsTo (quad c) carrier carrier
  norm_le : ∀ z ∈ carrier, ‖z‖ ≤ radius

namespace FiniteTrappingRegionCertificate

theorem orbit_mem
    {c : ℂ} (certificate : FiniteTrappingRegionCertificate c) :
    ∀ k : ℕ, orbit c (orbit c 0 certificate.entryTime) k ∈
      certificate.carrier := by
  intro k
  have hentry : orbit c 0 certificate.entryTime ∈ certificate.carrier := by
    simpa [mandelbrotOrbit_eq_orbit] using certificate.entry
  exact certificate.forward.iterate k hentry

/-- A checked finite trapping certificate proves Mandelbrot membership. -/
theorem mem_Mandelbrot
    {c : ℂ} (certificate : FiniteTrappingRegionCertificate c) :
    c ∈ Mandelbrot := by
  let P : ℝ := finiteOrbitNormBound c 0 certificate.entryTime
  let R : ℝ := max certificate.radius P
  apply (mem_Mandelbrot_iff c).2
  refine ⟨R, fun n => ?_⟩
  rw [mandelbrotOrbit_eq_orbit]
  rcases le_total n certificate.entryTime with hn | hn
  · have hprefix : ‖orbit c 0 n‖ ≤ finiteOrbitNormBound c 0 n :=
      norm_orbit_le_finiteOrbitNormBound c 0 0 (by norm_num) n
    exact hprefix.trans
      ((finiteOrbitNormBound_monotone c 0 hn).trans (le_max_right _ _))
  · obtain ⟨k, _hk⟩ := Nat.exists_eq_add_of_le hn
    have hnk : n = k + certificate.entryTime := by omega
    have heq : orbit c 0 n =
        orbit c (orbit c 0 certificate.entryTime) k := by
      rw [hnk, orbit_add]
      rfl
    rw [heq]
    exact (certificate.norm_le _ (certificate.orbit_mem k)).trans
      (le_max_left _ _)

end FiniteTrappingRegionCertificate

/-! ## Exact polynomial and sum-of-squares identity checkers -/

/-- A decidable, exact equality checker for multivariate polynomials over
the rationals. -/
def polynomialIdentityCheck
    {σ : Type*} [DecidableEq σ]
    (lhs rhs : MvPolynomial σ ℚ) : Bool :=
  decide (lhs = rhs)

theorem polynomialIdentityCheck_sound
    {σ : Type*} [DecidableEq σ]
    {lhs rhs : MvPolynomial σ ℚ}
    (hcheck : polynomialIdentityCheck lhs rhs = true) :
    lhs = rhs :=
  of_decide_eq_true hcheck

/-- The exact polynomial represented by a finite rational SOS list. -/
def sumOfSquares
    {σ : Type*} (squares : List (MvPolynomial σ ℚ)) :
    MvPolynomial σ ℚ :=
  (squares.map fun q => q ^ 2).sum

def sosIdentityCheck
    {σ : Type*} [DecidableEq σ]
    (target : MvPolynomial σ ℚ)
    (squares : List (MvPolynomial σ ℚ)) : Bool :=
  polynomialIdentityCheck target (sumOfSquares squares)

theorem sosIdentityCheck_sound
    {σ : Type*} [DecidableEq σ]
    {target : MvPolynomial σ ℚ}
    {squares : List (MvPolynomial σ ℚ)}
    (hcheck : sosIdentityCheck target squares = true) :
    target = sumOfSquares squares :=
  polynomialIdentityCheck_sound hcheck

/-- A successful rational SOS check implies nonnegativity after every real
evaluation.  Thus the Boolean checker is only a convenience; its soundness
reduces to an exact polynomial equality inside Lean. -/
theorem eval₂_nonneg_of_sosIdentityCheck
    {σ : Type*} [DecidableEq σ]
    {target : MvPolynomial σ ℚ}
    {squares : List (MvPolynomial σ ℚ)}
    (hcheck : sosIdentityCheck target squares = true)
    (x : σ → ℝ) :
    0 ≤ MvPolynomial.eval₂ (Rat.castHom ℝ) x target := by
  let ev : MvPolynomial σ ℚ →+* ℝ :=
    MvPolynomial.eval₂Hom (Rat.castHom ℝ) x
  have hid := sosIdentityCheck_sound hcheck
  have heval := congrArg ev hid
  change 0 ≤ ev target
  rw [heval]
  dsimp only [sumOfSquares]
  rw [map_list_sum]
  apply List.sum_nonneg
  intro y hy
  obtain ⟨qSquared, hqSquared, rfl⟩ := List.mem_map.mp hy
  obtain ⟨q, _hq, rfl⟩ := List.mem_map.mp hqSquared
  rw [map_pow]
  exact sq_nonneg (ev q)

/-! ## Additive accounting for disjoint certified inner regions -/

/-- A measurable inner region, together with a backend-certified lower
bound on its area. -/
structure CertifiedInnerRegion where
  carrier : Set ℂ
  measurable : MeasurableSet carrier
  subset_Mandelbrot : carrier ⊆ Mandelbrot
  certifiedArea : ℝ≥0∞
  certifiedArea_le_volume : certifiedArea ≤ volume carrier

/-- Certified areas add without loss across a finite family of pairwise
disjoint inner regions. -/
theorem sum_certifiedInnerRegion_area_le_volume_Mandelbrot
    {ι : Type*}
    (s : Finset ι) (regions : ι → CertifiedInnerRegion)
    (hdisjoint : PairwiseDisjoint (↑s) fun i => (regions i).carrier) :
    ∑ i ∈ s, (regions i).certifiedArea ≤ volume Mandelbrot := by
  calc
    ∑ i ∈ s, (regions i).certifiedArea ≤
        ∑ i ∈ s, volume (regions i).carrier := by
      exact Finset.sum_le_sum fun i _ => (regions i).certifiedArea_le_volume
    _ = volume (⋃ i ∈ s, (regions i).carrier) := by
      symm
      exact measure_biUnion_finset hdisjoint fun i _ => (regions i).measurable
    _ ≤ volume Mandelbrot := by
      apply measure_mono
      apply iUnion₂_subset
      intro i _hi
      exact (regions i).subset_Mandelbrot

end

end Mandelbrot
