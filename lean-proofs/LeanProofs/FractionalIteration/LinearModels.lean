/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Conjugacy
import Mathlib.Analysis.SpecialFunctions.Complex.Log
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# Linear models for Koenigs and lifted Böttcher coordinates

These are unconditional algebraic models on the coordinate plane.  Their
transport through a valid analytic chart is handled by `conjugateFamily`.
-/

namespace Mandelbrot

noncomputable section

/-- Multiplicative time in a Koenigs coordinate with chosen logarithm `L`. -/
def koenigsModel (L : ℂ) (t : ℝ) (w : ℂ) : ℂ :=
  Complex.exp ((t : ℂ) * L) * w

@[simp] theorem koenigsModel_zero (L w : ℂ) :
    koenigsModel L 0 w = w := by
  simp [koenigsModel]

theorem koenigsModel_add (L : ℂ) (s t : ℝ) (w : ℂ) :
    koenigsModel L s (koenigsModel L t w) =
      koenigsModel L (s + t) w := by
  simp only [koenigsModel, Complex.ofReal_add, add_mul, Complex.exp_add]
  ring

theorem koenigsModel_one
    (L multiplier w : ℂ) (hexp : Complex.exp L = multiplier) :
    koenigsModel L 1 w = multiplier * w := by
  simp [koenigsModel, hexp]

/-- All logarithms of a nonzero multiplier differ by one of these shifts. -/
def shiftedLog (L : ℂ) (k : ℤ) : ℂ :=
  L + k * (2 * (Real.pi : ℂ) * Complex.I)

@[simp] theorem exp_shiftedLog (L : ℂ) (k : ℤ) :
    Complex.exp (shiftedLog L k) = Complex.exp L := by
  simp [shiftedLog, Complex.exp_add]

theorem exists_complex_log (multiplier : ℂ) (hne : multiplier ≠ 0) :
    ∃ L : ℂ, Complex.exp L = multiplier :=
  ⟨Complex.log multiplier, Complex.exp_log hne⟩

theorem exp_eq_iff_eq_shiftedLog (L K : ℂ) :
    Complex.exp K = Complex.exp L ↔
      ∃ k : ℤ, K = shiftedLog L k := by
  simpa [shiftedLog] using
    (Complex.exp_eq_exp_iff_exists_int :
      Complex.exp K = Complex.exp L ↔
        ∃ k : ℤ, K = L + k * (2 * (Real.pi : ℂ) * Complex.I))

/-- Changing the logarithm branch multiplies the model by the expected
phase. -/
theorem koenigsModel_shiftedLog
    (L : ℂ) (k : ℤ) (t : ℝ) (w : ℂ) :
    koenigsModel (shiftedLog L k) t w =
      Complex.exp ((t : ℂ) * L) *
        Complex.exp ((t : ℂ) * (k * (2 * (Real.pi : ℂ) * Complex.I))) * w := by
  simp only [koenigsModel, shiftedLog, mul_add, Complex.exp_add]

/-- Every logarithm branch gives the same coordinate model at integer times. -/
theorem koenigsModel_shiftedLog_int
    (L : ℂ) (k n : ℤ) (w : ℂ) :
    koenigsModel (shiftedLog L k) (n : ℝ) w =
      koenigsModel L (n : ℝ) w := by
  apply congrArg (fun a : ℂ => a * w)
  apply Complex.exp_eq_exp_iff_exists_int.2
  refine ⟨n * k, ?_⟩
  simp only [shiftedLog]
  push_cast
  ring

/-- Non-resonance of every denominator in the attracting Koenigs
recurrence. -/
theorem koenigs_nonresonant
    (multiplier : ℂ) (n : ℕ)
    (hmulzero : 0 < ‖multiplier‖) (hmulone : ‖multiplier‖ < 1)
    (hn : 2 ≤ n) :
    multiplier - multiplier ^ n ≠ 0 := by
  have hmul : multiplier ≠ 0 := norm_pos_iff.mp hmulzero
  have hnpos : 0 < n := lt_of_lt_of_le (by norm_num) hn
  have hpred : 0 < n - 1 :=
    Nat.sub_pos_of_lt (lt_of_lt_of_le (by norm_num) hn)
  intro hres
  have heq : multiplier = multiplier ^ n := sub_eq_zero.mp hres
  have hnrepr : n - 1 + 1 = n := Nat.sub_add_cancel hnpos
  have heq' : multiplier ^ (n - 1) * multiplier = 1 * multiplier := by
    rw [one_mul]
    calc
      multiplier ^ (n - 1) * multiplier =
          multiplier ^ ((n - 1) + 1) := by rw [pow_succ]
      _ = multiplier ^ n := by rw [hnrepr]
      _ = multiplier := heq.symm
  have hpow : multiplier ^ (n - 1) = 1 := by
    exact mul_right_cancel₀ hmul heq'
  have hnormpow : ‖multiplier‖ ^ (n - 1) = 1 := by
    simpa using congrArg norm hpow
  have hlt : ‖multiplier‖ ^ (n - 1) < 1 :=
    pow_lt_one₀ (norm_nonneg multiplier) hmulone hpred.ne'
  rw [hnormpow] at hlt
  exact lt_irrefl 1 hlt

/-- Multiplication by `2^t` on the logarithmic Böttcher cover. -/
def bottcherLift (t : ℝ) (u : ℂ) : ℂ :=
  Complex.exp ((t : ℂ) * (Real.log 2 : ℂ)) * u

@[simp] theorem bottcherLift_zero (u : ℂ) :
    bottcherLift 0 u = u := by
  simp [bottcherLift]

@[simp] theorem bottcherLift_one (u : ℂ) :
    bottcherLift 1 u = 2 * u := by
  simp only [bottcherLift, Complex.ofReal_one, one_mul]
  rw [← Complex.ofReal_exp, Real.exp_log (by norm_num : (0 : ℝ) < 2)]
  norm_num

theorem bottcherLift_add (s t : ℝ) (u : ℂ) :
    bottcherLift s (bottcherLift t u) =
      bottcherLift (s + t) u := by
  simp only [bottcherLift, Complex.ofReal_add, add_mul, Complex.exp_add]
  ring

/-- Iterating a map semiconjugate to squaring raises the coordinate to
`2^n`. -/
theorem iterate_semiconjugacy_squaring
    (q psi : ℂ → ℂ)
    (hpsi : ∀ z, psi (q z) = psi z ^ 2) :
    ∀ n z, psi ((q^[n]) z) = psi z ^ (2 ^ n) := by
  intro n
  induction n with
  | zero =>
      intro z
      simp
  | succ n ih =>
      intro z
      rw [Function.iterate_succ_apply', hpsi, ih]
      conv_rhs => rw [pow_succ]
      rw [pow_mul]

end

end Mandelbrot
