/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodCovering
import LeanProofs.PeriodTwoBulb
import Mathlib.Tactic

/-!
# Exact period-three and period-four dynamics

This file connects the low-period parameter equations to the actual
quadratic dynamics.  The dynatomic factors and return multipliers below are
ordinary complex polynomials; all displayed identities are checked by Lean.
-/

namespace Mandelbrot

noncomputable section

open Complex Polynomial

/-! ## Dynatomic factors -/

/-- The exact-period-three dynatomic factor for `z ↦ z² + c`. -/
def periodThreeDynatomic (c z : ℂ) : ℂ :=
  z ^ 6 + z ^ 5 + (1 + 3 * c) * z ^ 4 + (1 + 2 * c) * z ^ 3 +
    (1 + 3 * c + 3 * c ^ 2) * z ^ 2 + (1 + c) ^ 2 * z +
    (1 + c + 2 * c ^ 2 + c ^ 3)

/-- The exact-period-four dynatomic factor, written compactly in terms of
the second iterate. -/
def periodFourDynatomic (c z : ℂ) : ℂ :=
  let w := orbit c z 2
  w ^ 3 + w ^ 2 * z + w * z ^ 2 + z ^ 3 + 2 * c * (w + z) + 1

theorem orbit_three_sub_factor (c z : ℂ) :
    orbit c z 3 - z = (quad c z - z) * periodThreeDynatomic c z := by
  simp only [orbit, Function.iterate_succ_apply', Function.iterate_zero_apply,
    quad, periodThreeDynatomic]
  ring

theorem orbit_four_sub_factor (c z : ℂ) :
    orbit c z 4 - z = (orbit c z 2 - z) * periodFourDynatomic c z := by
  simp only [periodFourDynatomic, orbit, Function.iterate_succ_apply',
    Function.iterate_zero_apply, quad]
  ring

theorem orbit_three_eq_of_dynatomic_eq_zero {c z : ℂ}
    (h : periodThreeDynatomic c z = 0) : orbit c z 3 = z := by
  have := orbit_three_sub_factor c z
  rw [h, mul_zero] at this
  exact sub_eq_zero.mp this

theorem orbit_four_eq_of_dynatomic_eq_zero {c z : ℂ}
    (h : periodFourDynatomic c z = 0) : orbit c z 4 = z := by
  have := orbit_four_sub_factor c z
  rw [h, mul_zero] at this
  exact sub_eq_zero.mp this

/-! ## Return-map multipliers -/

/-- Derivative of the third return at the starting point. -/
def periodThreeReturnMultiplier (c z : ℂ) : ℂ :=
  8 * z * orbit c z 1 * orbit c z 2

/-- Derivative of the fourth return at the starting point. -/
def periodFourReturnMultiplier (c z : ℂ) : ℂ :=
  16 * z * orbit c z 1 * orbit c z 2 * orbit c z 3

theorem hasStrictDerivAt_orbit_three (c z : ℂ) :
    HasStrictDerivAt (fun w ↦ orbit c w 3) (periodThreeReturnMultiplier c z) z := by
  have h1 := hasStrictDerivAt_quad c z
  have h2 := (hasStrictDerivAt_quad c (quad c z)).comp z h1
  have h3 := (hasStrictDerivAt_quad c (quad c (quad c z))).comp z h2
  have hmul : periodThreeReturnMultiplier c z =
      2 * quad c (quad c z) * (2 * quad c z * (2 * z)) := by
    simp only [periodThreeReturnMultiplier, orbit, Function.iterate_succ_apply',
      Function.iterate_zero_apply, quad]
    ring
  rw [hmul]
  simpa only [orbit, Function.iterate_succ_apply', Function.iterate_zero_apply,
    Function.comp_def] using h3

theorem hasStrictDerivAt_orbit_four (c z : ℂ) :
    HasStrictDerivAt (fun w ↦ orbit c w 4) (periodFourReturnMultiplier c z) z := by
  have h1 := hasStrictDerivAt_quad c z
  have h2 := (hasStrictDerivAt_quad c (quad c z)).comp z h1
  have h3 := (hasStrictDerivAt_quad c (quad c (quad c z))).comp z h2
  have h4 := (hasStrictDerivAt_quad c (quad c (quad c (quad c z)))).comp z h3
  have hmul : periodFourReturnMultiplier c z =
      2 * quad c (quad c (quad c z)) *
        (2 * quad c (quad c z) * (2 * quad c z * (2 * z))) := by
    simp only [periodFourReturnMultiplier, orbit, Function.iterate_succ_apply',
      Function.iterate_zero_apply, quad]
    ring
  rw [hmul]
  simpa only [orbit, Function.iterate_succ_apply', Function.iterate_zero_apply,
    Function.comp_def] using h4

theorem hasDerivAt_orbit_three (c z : ℂ) :
    HasDerivAt (fun w ↦ orbit c w 3) (periodThreeReturnMultiplier c z) z :=
  (hasStrictDerivAt_orbit_three c z).hasDerivAt

theorem hasDerivAt_orbit_four (c z : ℂ) :
    HasDerivAt (fun w ↦ orbit c w 4) (periodFourReturnMultiplier c z) z :=
  (hasStrictDerivAt_orbit_four c z).hasDerivAt

/-! ## Exact elimination: the dynamical locus maps to the algebraic curve -/

/-- A period-three dynatomic point with return multiplier `mu` satisfies the
parameter multiplier equation.  `grobner` constructs and kernel-checks the
exact polynomial certificate; no external algebra system is trusted. -/
theorem periodThreeMultiplierEquation_of_dynatomic
    (c z mu : ℂ) (hz : periodThreeDynatomic c z = 0)
    (hmu : periodThreeReturnMultiplier c z = mu) :
    periodThreeMultiplierEquation c mu = 0 := by
  simp only [periodThreeDynatomic, periodThreeReturnMultiplier, orbit,
    Function.iterate_succ_apply', Function.iterate_zero_apply, quad,
    periodThreeMultiplierEquation] at hz hmu ⊢
  grobner (config := { ringSteps := 1000000 })

/-- The corresponding exact elimination statement in period four. -/
theorem periodFourMultiplierEquation_of_dynatomic
    (c z mu : ℂ) (hz : periodFourDynatomic c z = 0)
    (hmu : periodFourReturnMultiplier c z = mu) :
    periodFourMultiplierEquation c mu = 0 := by
  let w : ℂ := orbit c z 2
  let s : ℂ := z + w
  let p : ℂ := z * w
  have hw : w = (z ^ 2 + c) ^ 2 + c := by
    simp [w, orbit, quad]
  have hfw : (w ^ 2 + c) ^ 2 + c = z := by
    have h4 := orbit_four_eq_of_dynatomic_eq_zero hz
    simpa [w, orbit, Function.iterate_succ_apply', quad] using h4
  have h1 : s ^ 3 - 2 * p * s + 2 * c * s + 1 = 0 := by
    dsimp only [s, p]
    unfold periodFourDynatomic at hz
    dsimp only at hz
    linear_combination hz
  have h2 : s ^ 4 - 4 * s ^ 2 * p + 2 * p ^ 2 +
      2 * c * (s ^ 2 - 2 * p) + 2 * c ^ 2 + 2 * c - s = 0 := by
    dsimp only [s, p]
    linear_combination hfw - hw
  have hm : 16 * p * (p ^ 2 + c * (s ^ 2 - 2 * p) + c ^ 2) = mu := by
    rw [← hmu]
    dsimp only [s, p]
    simp only [periodFourReturnMultiplier, orbit, Function.iterate_succ_apply',
      Function.iterate_zero_apply, quad]
    rw [← hw]
    ring
  simp only [periodFourMultiplierEquation]
  grobner (config := { ringSteps := 1000000 })

/-! ## Exact converse elimination through cycle sums -/

/- The direct dynatomic resultants have large Sylvester matrices.  Cycle sums
compress the same elimination to quadratic/linear in period three and
cubic/quadratic in period four. -/

def periodThreeCycleSumPolynomial (c : ℂ) : ℂ[X] :=
  X ^ 2 + X + C (c + 2)

def periodThreeCycleMultiplierPolynomial (c mu : ℂ) : ℂ[X] :=
  C (8 * c) * X + C (8 + 8 * c - mu)

def periodThreeCyclePolynomial (c s : ℂ) : ℂ[X] :=
  X ^ 3 - C s * X ^ 2 + C (c - 1 - s) * X - C (1 + c + c * s)

theorem periodThreeCyclePolynomial_eval (c s z : ℂ) :
    (periodThreeCyclePolynomial c s).eval z =
      z ^ 3 - s * z ^ 2 + (c - 1 - s) * z - (1 + c + c * s) := by
  simp [periodThreeCyclePolynomial]

theorem periodThreeCyclePolynomial_degree (c s : ℂ) :
    (periodThreeCyclePolynomial c s).degree = 3 := by
  unfold periodThreeCyclePolynomial
  compute_degree <;> norm_num

theorem resultant_monicQuadratic_linear (A B d F : ℂ) :
    Polynomial.resultant
        (X ^ 2 + C A * X + C B) (C d * X + C F) 2 1 =
      F ^ 2 - A * d * F + B * d ^ 2 := by
  classical
  simp only [Polynomial.resultant, Polynomial.sylvester]
  rw [Matrix.det_fin_three]
  simp [Fin.addCases, coeff_X]
  ring

/-- The period-three multiplier equation is exactly the resultant of the
cycle-sum equation and the affine multiplier relation. -/
theorem periodThree_cycleSum_resultant (c mu : ℂ) :
    Polynomial.resultant (periodThreeCycleSumPolynomial c)
        (periodThreeCycleMultiplierPolynomial c mu) 2 1 =
      periodThreeMultiplierEquation c mu := by
  rw [show periodThreeCycleSumPolynomial c =
      X ^ 2 + C 1 * X + C (c + 2) by
        simp [periodThreeCycleSumPolynomial],
    show periodThreeCycleMultiplierPolynomial c mu =
      C (8 * c) * X + C (8 + 8 * c - mu) by rfl,
    resultant_monicQuadratic_linear]
  simp only [periodThreeMultiplierEquation]
  ring

theorem periodThreeMultiplierEquation_cycleSum (c s : ℂ) :
    periodThreeMultiplierEquation c (8 * (1 + c + c * s)) =
      64 * c ^ 2 * (s ^ 2 + s + c + 2) := by
  simp only [periodThreeMultiplierEquation]
  ring

theorem periodThree_dynatomic_of_cyclePolynomial
    (c s z : ℂ) (hs : s ^ 2 + s + c + 2 = 0)
    (hz : (periodThreeCyclePolynomial c s).eval z = 0) :
    periodThreeDynatomic c z = 0 := by
  rw [periodThreeCyclePolynomial_eval] at hz
  simp only [periodThreeDynatomic]
  grobner (config := { ringSteps := 1000000 })

theorem periodThree_returnMultiplier_of_cyclePolynomial
    (c s z : ℂ) (hs : s ^ 2 + s + c + 2 = 0)
    (hz : (periodThreeCyclePolynomial c s).eval z = 0) :
    periodThreeReturnMultiplier c z = 8 * (1 + c + c * s) := by
  rw [periodThreeCyclePolynomial_eval] at hz
  simp only [periodThreeReturnMultiplier, orbit,
    Function.iterate_succ_apply', Function.iterate_zero_apply, quad]
  grobner (config := { ringSteps := 1000000 })

/-- On the attracting multiplier disk, every root of the period-three
eliminant reconstructs an actual dynatomic point with that multiplier. -/
theorem exists_periodThree_dynatomic_of_multiplierEquation
    (c mu : ℂ) (hmuNorm : ‖mu‖ < 1)
    (hroot : periodThreeMultiplierEquation c mu = 0) :
    ∃ z : ℂ, periodThreeDynatomic c z = 0 ∧
      periodThreeReturnMultiplier c z = mu := by
  have hc : c ≠ 0 := by
    intro hc
    subst c
    simp only [periodThreeMultiplierEquation, mul_zero, add_zero] at hroot
    have hmu8 : mu = 8 := by
      have hsquare : (mu - 8) ^ 2 = 0 := by
        linear_combination hroot
      exact sub_eq_zero.mp (sq_eq_zero_iff.mp hsquare)
    subst mu
    norm_num at hmuNorm
  let s : ℂ := (mu / 8 - 1 - c) / c
  have hmu : 8 * (1 + c + c * s) = mu := by
    dsimp only [s]
    field_simp [hc]
    ring
  have hs : s ^ 2 + s + c + 2 = 0 := by
    have hcycle := periodThreeMultiplierEquation_cycleSum c s
    rw [hmu, hroot] at hcycle
    have hcSq : 64 * c ^ 2 ≠ 0 :=
      mul_ne_zero (by norm_num) (pow_ne_zero 2 hc)
    exact (mul_eq_zero.mp hcycle.symm).resolve_left hcSq
  obtain ⟨z, hz⟩ := Complex.exists_root
    (show 0 < (periodThreeCyclePolynomial c s).degree by
      rw [periodThreeCyclePolynomial_degree]
      norm_num)
  refine ⟨z, periodThree_dynatomic_of_cyclePolynomial c s z hs hz, ?_⟩
  rw [periodThree_returnMultiplier_of_cyclePolynomial c s z hs hz, hmu]

def periodFourCycleSumPolynomial (c : ℂ) : ℂ[X] :=
  X ^ 3 + C (4 * c + 3) * X + C 4

def periodFourCycleMultiplierPolynomial (c mu : ℂ) : ℂ[X] :=
  C (8 * c) * X ^ 2 + C (8 * c) * X +
    C (16 + 16 * c + 16 * c ^ 2 - mu)

def periodFourCyclePolynomial (c s : ℂ) : ℂ[X] :=
  C 2 * X ^ 4 - C (2 * s) * X ^ 3 +
    C (4 * c - s + s ^ 2) * X ^ 2 +
    C (2 + s - 2 * c * s + s ^ 2) * X +
    C (2 + 2 * c + 2 * c ^ 2 + c * s + c * s ^ 2)

theorem resultant_cubic_quadratic_same_linear (A B d F : ℂ) :
    Polynomial.resultant
        (X ^ 3 + C A * X + C B)
        (C d * X ^ 2 + C d * X + C F) 3 2 =
      F ^ 3 - 2 * A * d * F ^ 2 +
        (A + A ^ 2 + 3 * B) * d ^ 2 * F +
        (B ^ 2 - B - A * B) * d ^ 3 := by
  by_cases hd : d = 0
  · subst d
    rw [show C (0 : ℂ) * X ^ 2 + C 0 * X + C F = C F by simp,
      Polynomial.resultant_C_right]
    simp
  let t : ℂ := F / d
  let q : ℂ[X] := X ^ 2 + X + C t
  let L : ℂ := A - t + 1
  let M : ℂ := B + t
  let r : ℂ[X] := C L * X + C M
  have hq : C d * q = C d * X ^ 2 + C d * X + C F := by
    have hdiv : d * (F / d) = F := by field_simp [hd]
    dsimp only [q, t]
    rw [mul_add, mul_add, ← C_mul, hdiv]
  rw [← hq, Polynomial.resultant_C_mul_right]
  have hp : X ^ 3 + C A * X + C B = r + q * (X - C 1) := by
    dsimp only [r, q, L, M, t]
    simp only [map_add, map_sub, map_one]
    ring
  rw [hp]
  have hrdeg : r.natDegree ≤ 1 := by
    dsimp only [r]
    compute_degree
  have hqdeg : q.natDegree ≤ 2 := by
    dsimp only [q]
    compute_degree
  rw [Polynomial.resultant_add_mul_left (f := r) (g := q)
    (p := X - C 1) (m := 3) (n := 2) (by
      have hdeg : (X - C (1 : ℂ)).natDegree ≤ 1 := by compute_degree
      omega) hqdeg]
  rw [show 3 = 1 + 2 by norm_num,
    Polynomial.resultant_add_left_deg _ _ _ _ _ hrdeg]
  simp only [q, coeff_add, coeff_X_pow, coeff_X, coeff_C]
  norm_num
  by_cases hL : L = 0
  · have hr : r = C M := by simp [r, hL]
    rw [hr, Polynomial.resultant_C_left]
    norm_num
    dsimp only [L, M, t] at hL ⊢
    have hA : A = F / d - 1 := by linear_combination hL
    rw [hA]
    field_simp [hd] <;> norm_num [coeff_X] <;> ring
  have hrFactor : r = C L * (X + C (M / L)) := by
    have hdiv : L * (M / L) = M := by field_simp [hL]
    dsimp only [r]
    rw [mul_add, ← C_mul, hdiv]
  rw [hrFactor, Polynomial.resultant_C_mul_left,
    Polynomial.resultant_X_add_C_left]
  · simp only [q, eval_add, eval_pow, eval_X, eval_C]
    field_simp [hL]
    dsimp only [L, M, t]
    field_simp [hd]
    ring
  · exact hqdeg

set_option maxRecDepth 100000 in
/-- The period-four multiplier equation is exactly the compact cycle-sum
resultant. -/
theorem periodFour_cycleSum_resultant (c mu : ℂ) :
    Polynomial.resultant (periodFourCycleSumPolynomial c)
        (periodFourCycleMultiplierPolynomial c mu) 3 2 =
      periodFourMultiplierEquation c mu := by
  rw [show periodFourCycleSumPolynomial c =
      X ^ 3 + C (4 * c + 3) * X + C 4 by rfl,
    show periodFourCycleMultiplierPolynomial c mu =
      C (8 * c) * X ^ 2 + C (8 * c) * X +
        C (16 + 16 * c + 16 * c ^ 2 - mu) by rfl,
    resultant_cubic_quadratic_same_linear]
  simp only [periodFourMultiplierEquation]
  ring

theorem exists_common_root_of_resultant_eq_zero
    {p q : ℂ[X]} (hresultant : Polynomial.resultant p q = 0) :
    ∃ z : ℂ, p.eval z = 0 ∧ q.eval z = 0 := by
  have hnotCoprime : ¬IsCoprime p q :=
    ((Polynomial.resultant_eq_zero_iff.mp hresultant).2)
  rw [Polynomial.isCoprime_iff_aeval_ne_zero_of_isAlgClosed
    (k := ℂ) ℂ p q] at hnotCoprime
  push Not at hnotCoprime
  obtain ⟨z, hpz, hqz⟩ := hnotCoprime
  refine ⟨z, ?_, ?_⟩ <;>
    simpa [Polynomial.aeval_def, Polynomial.eval₂_eq_eval_map] using ‹_›

theorem periodFourCyclePolynomial_eval (c s z : ℂ) :
    (periodFourCyclePolynomial c s).eval z =
      2 * z ^ 4 - 2 * s * z ^ 3 +
        (4 * c - s + s ^ 2) * z ^ 2 +
        (2 + s - 2 * c * s + s ^ 2) * z +
        (2 + 2 * c + 2 * c ^ 2 + c * s + c * s ^ 2) := by
  simp [periodFourCyclePolynomial]

theorem periodFourCyclePolynomial_degree (c s : ℂ) :
    (periodFourCyclePolynomial c s).degree = 4 := by
  unfold periodFourCyclePolynomial
  compute_degree <;> norm_num

set_option maxRecDepth 100000 in set_option maxHeartbeats 0 in
-- `grobner` must normalize the degree-twelve dynatomic consequence.
theorem periodFour_dynatomic_of_cyclePolynomial
    (c s z : ℂ) (hs : s ^ 3 + (4 * c + 3) * s + 4 = 0)
    (hz : (periodFourCyclePolynomial c s).eval z = 0) :
    periodFourDynatomic c z = 0 := by
  rw [periodFourCyclePolynomial_eval] at hz
  simp only [periodFourDynatomic, orbit, Function.iterate_succ_apply',
    Function.iterate_zero_apply, quad]
  grobner (config := { ringSteps := 1000000 })

set_option maxRecDepth 100000 in set_option maxHeartbeats 0 in
-- `grobner` must normalize the degree-fifteen return multiplier consequence.
theorem periodFour_returnMultiplier_of_cyclePolynomial
    (c s z : ℂ) (hs : s ^ 3 + (4 * c + 3) * s + 4 = 0)
    (hz : (periodFourCyclePolynomial c s).eval z = 0) :
    periodFourReturnMultiplier c z =
      8 * (2 + 2 * c + 2 * c ^ 2 + c * s + c * s ^ 2) := by
  rw [periodFourCyclePolynomial_eval] at hz
  simp only [periodFourReturnMultiplier, orbit, Function.iterate_succ_apply',
    Function.iterate_zero_apply, quad]
  grobner (config := { ringSteps := 1000000 })

theorem periodFourCycleSumPolynomial_degree (c : ℂ) :
    (periodFourCycleSumPolynomial c).degree = 3 := by
  unfold periodFourCycleSumPolynomial
  compute_degree <;> norm_num

theorem periodFourCycleMultiplierPolynomial_degree
    (c mu : ℂ) (hc : c ≠ 0) :
    (periodFourCycleMultiplierPolynomial c mu).degree = 2 := by
  unfold periodFourCycleMultiplierPolynomial
  compute_degree <;> simp [hc]

/-- On the attracting multiplier disk, every root of the period-four
eliminant reconstructs an actual dynatomic point with that multiplier. -/
theorem exists_periodFour_dynatomic_of_multiplierEquation
    (c mu : ℂ) (hmuNorm : ‖mu‖ < 1)
    (hroot : periodFourMultiplierEquation c mu = 0) :
    ∃ z : ℂ, periodFourDynatomic c z = 0 ∧
      periodFourReturnMultiplier c z = mu := by
  have hc : c ≠ 0 := by
    intro hc
    subst c
    have hcube : (mu - 16) ^ 3 = 0 := by
      simp only [periodFourMultiplierEquation] at hroot
      linear_combination -hroot
    have hsub : mu - 16 = 0 := by
      by_contra hne
      exact (pow_ne_zero 3 hne) hcube
    have hmu16 : mu = 16 := sub_eq_zero.mp hsub
    subst mu
    norm_num at hmuNorm
  have hpDegree := periodFourCycleSumPolynomial_degree c
  have hqDegree := periodFourCycleMultiplierPolynomial_degree c mu hc
  have hresultantExplicit :
      Polynomial.resultant (periodFourCycleSumPolynomial c)
          (periodFourCycleMultiplierPolynomial c mu) 3 2 = 0 := by
    rw [periodFour_cycleSum_resultant, hroot]
  have hresultant :
      Polynomial.resultant (periodFourCycleSumPolynomial c)
        (periodFourCycleMultiplierPolynomial c mu) = 0 := by
    have hpNat : (periodFourCycleSumPolynomial c).natDegree = 3 :=
      natDegree_eq_of_degree_eq_some hpDegree
    have hqNat : (periodFourCycleMultiplierPolynomial c mu).natDegree = 2 :=
      natDegree_eq_of_degree_eq_some hqDegree
    simpa [hpNat, hqNat] using hresultantExplicit
  obtain ⟨s, hsPolynomial, hmuPolynomial⟩ :=
    exists_common_root_of_resultant_eq_zero hresultant
  have hs : s ^ 3 + (4 * c + 3) * s + 4 = 0 := by
    simpa [periodFourCycleSumPolynomial] using hsPolynomial
  have hmu :
      8 * (2 + 2 * c + 2 * c ^ 2 + c * s + c * s ^ 2) = mu := by
    simp only [periodFourCycleMultiplierPolynomial, eval_add, eval_mul,
      eval_pow, eval_C, eval_X] at hmuPolynomial
    linear_combination hmuPolynomial
  obtain ⟨z, hz⟩ := Complex.exists_root
    (show 0 < (periodFourCyclePolynomial c s).degree by
      rw [periodFourCyclePolynomial_degree]
      norm_num)
  refine ⟨z, periodFour_dynatomic_of_cyclePolynomial c s z hs hz, ?_⟩
  rw [periodFour_returnMultiplier_of_cyclePolynomial c s z hs hz, hmu]

end

end Mandelbrot
