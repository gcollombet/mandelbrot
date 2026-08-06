/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.LinearModels
import Lean.Elab.Tactic.Omega
import Mathlib.Algebra.Polynomial.Coeff
import Mathlib.RingTheory.PowerSeries.Substitution
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Ring

/-!
# Formal Koenigs coefficient recurrence

This file works purely with formal power series.  It derives the coefficient
recurrence from Schröder's equation before any convergence or analytic
existence theorem is introduced.
-/

namespace Mandelbrot

noncomputable section

open PowerSeries

/-- The centered quadratic germ `w ↦ multiplier * w + w²`. -/
def koenigsInnerSeries (multiplier : ℂ) : ℂ⟦X⟧ :=
  C multiplier * X + X ^ 2

theorem koenigsInnerSeries_eq
    (multiplier : ℂ) :
    koenigsInnerSeries multiplier =
      X * (C multiplier + X) := by
  simp only [koenigsInnerSeries]
  ring

theorem coeff_C_add_X_pow
    (multiplier : ℂ) (k j : ℕ) :
    coeff j ((C multiplier + X : ℂ⟦X⟧) ^ k) =
      multiplier ^ (k - j) * (k.choose j : ℂ) := by
  let p : Polynomial ℂ := (Polynomial.C multiplier + Polynomial.X) ^ k
  have hp :
      p.coeff j = multiplier ^ (k - j) * (k.choose j : ℂ) := by
    simpa [p, add_comm] using
      Polynomial.coeff_X_add_C_pow multiplier k j
  have hcoe :
      (p : ℂ⟦X⟧) = (C multiplier + X : ℂ⟦X⟧) ^ k := by
    simp [p]
  rw [← hcoe, Polynomial.coeff_coe]
  exact hp

/-- Coefficient of `(multiplier * X + X²)^k`. -/
theorem coeff_koenigsInnerSeries_pow
    (multiplier : ℂ) (k n : ℕ) :
    coeff n (koenigsInnerSeries multiplier ^ k) =
      if k ≤ n then
        multiplier ^ (2 * k - n) * (k.choose (n - k) : ℂ)
      else 0 := by
  rw [koenigsInnerSeries_eq, mul_pow, coeff_X_pow_mul']
  split_ifs with hkn
  · rw [coeff_C_add_X_pow]
    congr 2
    omega
  · rfl

theorem koenigsInnerSeries_hasSubst
    (multiplier : ℂ) :
    PowerSeries.HasSubst (koenigsInnerSeries multiplier) := by
  apply PowerSeries.HasSubst.of_constantCoeff_zero'
  simp [koenigsInnerSeries]

/-- The coefficient of a formal substitution by the centered quadratic germ
is a finite triangular sum. -/
theorem coeff_subst_koenigsInnerSeries
    (A : ℂ⟦X⟧) (multiplier : ℂ) (n : ℕ) :
    coeff n (A.subst (koenigsInnerSeries multiplier)) =
      ∑ k ∈ Finset.range (n + 1),
        coeff k A *
          (multiplier ^ (2 * k - n) * (k.choose (n - k) : ℂ)) := by
  rw [PowerSeries.coeff_subst'
    (koenigsInnerSeries_hasSubst multiplier)]
  rw [finsum_eq_sum_of_support_subset]
  · apply Finset.sum_congr rfl
    intro k hk
    have hkn : k ≤ n := Nat.le_of_lt_succ (Finset.mem_range.mp hk)
    rw [coeff_koenigsInnerSeries_pow, if_pos hkn]
    simp [smul_eq_mul]
  · intro k hk
    have hkne :
        coeff k A • coeff n (koenigsInnerSeries multiplier ^ k) ≠ 0 := hk
    by_contra hkn
    have hknotle : ¬ k ≤ n := by
      intro hle
      exact hkn (Finset.mem_range.mpr (Nat.lt_succ_iff.mpr hle))
    have hzero :
        coeff n (koenigsInnerSeries multiplier ^ k) = 0 := by
      rw [coeff_koenigsInnerSeries_pow, if_neg hknotle]
    simp [hzero] at hkne

/-- Coefficient comparison in Schröder's equation. -/
theorem koenigs_coefficient_identity
    (A : ℂ⟦X⟧) (multiplier : ℂ)
    (hSchroder :
      A.subst (koenigsInnerSeries multiplier) = C multiplier * A)
    (n : ℕ) :
    (multiplier - multiplier ^ n) * coeff n A =
      ∑ k ∈ Finset.range n,
        coeff k A *
          (multiplier ^ (2 * k - n) * (k.choose (n - k) : ℂ)) := by
  have hcoeff := congrArg (coeff n) hSchroder
  rw [coeff_subst_koenigsInnerSeries, coeff_C_mul,
    Finset.sum_range_succ] at hcoeff
  have hdiag :
      coeff n A *
          (multiplier ^ (2 * n - n) * (n.choose (n - n) : ℂ)) =
        multiplier ^ n * coeff n A := by
    rw [show 2 * n - n = n by omega]
    simp
    ring
  rw [hdiag] at hcoeff
  linear_combination -hcoeff

/-- Solved recurrence; non-resonance is the only division hypothesis. -/
theorem koenigs_coefficient_recurrence
    (A : ℂ⟦X⟧) (multiplier : ℂ)
    (hSchroder :
      A.subst (koenigsInnerSeries multiplier) = C multiplier * A)
    (n : ℕ) (hnonresonant : multiplier - multiplier ^ n ≠ 0) :
    coeff n A =
      (∑ k ∈ Finset.range n,
        coeff k A *
          (multiplier ^ (2 * k - n) * (k.choose (n - k) : ℂ))) /
        (multiplier - multiplier ^ n) := by
  apply (eq_div_iff hnonresonant).2
  simpa [mul_comm] using
    koenigs_coefficient_identity A multiplier hSchroder n

/-- Terms below `ceil(n / 2)` vanish, so the triangular sum has exactly the
range displayed in the classical Koenigs recurrence. -/
theorem koenigs_sum_range_eq_Icc
    (A : ℂ⟦X⟧) (multiplier : ℂ) (n : ℕ) (hn : 2 ≤ n) :
    (∑ k ∈ Finset.range n,
        coeff k A *
          (multiplier ^ (2 * k - n) * (k.choose (n - k) : ℂ))) =
      ∑ k ∈ Finset.Icc ((n + 1) / 2) (n - 1),
        coeff k A *
          (multiplier ^ (2 * k - n) * (k.choose (n - k) : ℂ)) := by
  symm
  apply Finset.sum_subset
  · intro k hk
    simp only [Finset.mem_Icc] at hk
    exact Finset.mem_range.mpr (by omega)
  · intro k hkrange hkIcc
    have hklt : k < (n + 1) / 2 := by
      have hkn : k ≤ n - 1 := by
        have := Finset.mem_range.mp hkrange
        omega
      simp only [Finset.mem_Icc, hkn, and_true] at hkIcc
      omega
    have hchoose : k.choose (n - k) = 0 := by
      apply Nat.choose_eq_zero_of_lt
      omega
    simp [hchoose]

theorem koenigs_coefficient_recurrence_Icc
    (A : ℂ⟦X⟧) (multiplier : ℂ)
    (hSchroder :
      A.subst (koenigsInnerSeries multiplier) = C multiplier * A)
    (n : ℕ) (hn : 2 ≤ n)
    (hnonresonant : multiplier - multiplier ^ n ≠ 0) :
    coeff n A =
      (∑ k ∈ Finset.Icc ((n + 1) / 2) (n - 1),
        coeff k A *
          (multiplier ^ (2 * k - n) * (k.choose (n - k) : ℂ))) /
        (multiplier - multiplier ^ n) := by
  rw [← koenigs_sum_range_eq_Icc A multiplier n hn]
  exact koenigs_coefficient_recurrence A multiplier hSchroder n hnonresonant

theorem koenigs_coefficient_two
    (A : ℂ⟦X⟧) (multiplier : ℂ)
    (hSchroder :
      A.subst (koenigsInnerSeries multiplier) = C multiplier * A)
    (hlinear : coeff 1 A = 1)
    (hnonresonant : multiplier - multiplier ^ 2 ≠ 0) :
    coeff 2 A = 1 / (multiplier * (1 - multiplier)) := by
  have hrec :=
    koenigs_coefficient_recurrence_Icc
      A multiplier hSchroder 2 (by norm_num) hnonresonant
  norm_num [hlinear] at hrec
  calc
    coeff 2 A = (multiplier - multiplier ^ 2)⁻¹ := hrec
    _ = (multiplier * (1 - multiplier))⁻¹ := by
      congr 1
      ring
    _ = 1 / (multiplier * (1 - multiplier)) := by simp

end

end Mandelbrot
