/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.CardioidArea
import LeanProofs.MandelbrotArea
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# An unconditional contracting-cardioid lower bound

The full main-cardioid inclusion needs a global attracting-basin theorem that
is not currently available in Mathlib.  On `‖λ‖ < 2/3`, however, the fixed
disk `D(λ/2, 1/3)` is directly invariant.  This gives a smaller but completely
elementary and axiom-free geometric lower bound.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set MeasureTheory

/-- The part of the multiplier cardioid covered by the direct invariant-disk
argument. -/
def contractingCardioid : Set ℂ :=
  mainCardioidMap '' ball (0 : ℂ) (2 / 3 : ℝ)

theorem mandelbrotOrbit_mainCardioid_error (lambda : ℂ) (n : ℕ) :
    mandelbrotOrbit (mainCardioidMap lambda) (n + 1) - lambda / 2 =
      lambda * (mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2) +
        (mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2) ^ 2 := by
  rw [mandelbrotOrbit_succ]
  simp only [mainCardioidMap]
  ring

/-- For `‖λ‖ < 2/3`, the critical orbit stays in `D(λ/2,1/3)`. -/
theorem mandelbrotOrbit_mainCardioid_norm_sub_lt
    (lambda : ℂ) (hlambda : ‖lambda‖ < (2 / 3 : ℝ)) :
    ∀ n : ℕ,
      ‖mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2‖ < (1 / 3 : ℝ) := by
  intro n
  induction n with
  | zero =>
      rw [mandelbrotOrbit_zero, zero_sub, norm_neg, norm_div]
      norm_num
      linarith
  | succ n ih =>
      rw [mandelbrotOrbit_mainCardioid_error]
      calc
        ‖lambda * (mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2) +
            (mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2) ^ 2‖ ≤
          ‖lambda * (mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2)‖ +
            ‖(mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2) ^ 2‖ :=
              norm_add_le _ _
        _ = ‖lambda‖ * ‖mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2‖ +
            ‖mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2‖ ^ 2 := by
              rw [norm_mul, norm_pow]
        _ < (2 / 3 : ℝ) * (1 / 3 : ℝ) + (1 / 3 : ℝ) ^ 2 := by
          apply add_lt_add
          · exact (mul_le_mul_of_nonneg_right hlambda.le (norm_nonneg _)).trans_lt
              (mul_lt_mul_of_pos_left ih (by norm_num))
          · have hprod : 0 <
                ((1 / 3 : ℝ) -
                    ‖mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2‖) *
                  ((1 / 3 : ℝ) +
                    ‖mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2‖) :=
              mul_pos (sub_pos.mpr ih)
                (add_pos_of_pos_of_nonneg (by norm_num) (norm_nonneg _))
            nlinarith
        _ = (1 / 3 : ℝ) := by norm_num

theorem mainCardioidMap_mem_Mandelbrot_of_norm_lt_two_thirds
    (lambda : ℂ) (hlambda : ‖lambda‖ < (2 / 3 : ℝ)) :
    mainCardioidMap lambda ∈ Mandelbrot := by
  apply (mem_Mandelbrot_iff _).2
  refine ⟨1, fun n => ?_⟩
  have herr := mandelbrotOrbit_mainCardioid_norm_sub_lt lambda hlambda n
  have hcenter : ‖lambda / 2‖ < (1 / 3 : ℝ) := by
    rw [norm_div]
    norm_num
    linarith
  have hlt : ‖mandelbrotOrbit (mainCardioidMap lambda) n‖ < 1 := by
    calc
      ‖mandelbrotOrbit (mainCardioidMap lambda) n‖ =
          ‖(mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2) + lambda / 2‖ := by
            congr 1
            ring
      _ ≤ ‖mandelbrotOrbit (mainCardioidMap lambda) n - lambda / 2‖ +
          ‖lambda / 2‖ := norm_add_le _ _
      _ < (1 / 3 : ℝ) + (1 / 3 : ℝ) := add_lt_add herr hcenter
      _ < 1 := by norm_num
  exact hlt.le

theorem contractingCardioid_subset_Mandelbrot :
    contractingCardioid ⊆ Mandelbrot := by
  rintro c ⟨lambda, hlambda, rfl⟩
  apply mainCardioidMap_mem_Mandelbrot_of_norm_lt_two_thirds
  simpa [mem_ball, dist_zero_right] using hlambda

theorem mainCardioidMap_injOn_two_thirds :
    InjOn mainCardioidMap (ball (0 : ℂ) (2 / 3 : ℝ)) := by
  apply mainCardioidMap_injOn.mono
  intro lambda hlambda
  rw [mem_ball, dist_zero_right] at hlambda ⊢
  linarith

theorem volume_contractingCardioid_eq_lintegral :
    volume contractingCardioid =
      ∫⁻ lambda : ℂ in ball (0 : ℂ) (2 / 3 : ℝ),
        ENNReal.ofReal (normSq ((1 - lambda) / 2)) := by
  have h := lintegral_image_eq_lintegral_abs_det_fderiv_mul
    volume (measurableSet_ball : MeasurableSet (ball (0 : ℂ) (2 / 3 : ℝ)))
    (fun lambda _ => (hasFDerivAt_mainCardioidMap lambda).hasFDerivWithinAt)
    mainCardioidMap_injOn_two_thirds (fun _ : ℂ => (1 : ENNReal))
  simpa only [contractingCardioid, lintegral_one, Measure.restrict_apply_univ,
    det_mainCardioidFDeriv, abs_of_nonneg (normSq_nonneg _), mul_one] using h

theorem integrableOn_normSq_cardioid_two_thirds :
    IntegrableOn (fun lambda : ℂ => normSq ((1 - lambda) / 2))
      (ball (0 : ℂ) (2 / 3 : ℝ)) := by
  have hcont : Continuous (fun lambda : ℂ => normSq ((1 - lambda) / 2)) := by
    fun_prop
  exact (ContinuousOn.integrableOn_compact
    (isCompact_closedBall (0 : ℂ) (2 / 3 : ℝ)) hcont.continuousOn).mono_set
      ball_subset_closedBall

theorem integral_normSq_cardioid_two_thirds :
    (∫ lambda : ℂ in ball (0 : ℂ) (2 / 3 : ℝ),
      normSq ((1 - lambda) / 2)) = 11 * Real.pi / 81 := by
  rw [integral_normSq_cardioid_ball (2 / 3) (by norm_num)]
  ring

theorem lintegral_normSq_cardioid_two_thirds :
    (∫⁻ lambda : ℂ in ball (0 : ℂ) (2 / 3 : ℝ),
      ENNReal.ofReal (normSq ((1 - lambda) / 2))) =
        ENNReal.ofReal (11 * Real.pi / 81) := by
  rw [← ofReal_integral_eq_lintegral_ofReal integrableOn_normSq_cardioid_two_thirds
    (Filter.Eventually.of_forall fun _ => normSq_nonneg _)]
  rw [integral_normSq_cardioid_two_thirds]

theorem volume_contractingCardioid :
    volume contractingCardioid = ENNReal.ofReal (11 * Real.pi / 81) := by
  rw [volume_contractingCardioid_eq_lintegral,
    lintegral_normSq_cardioid_two_thirds]

/-- Best unconditional lower bound in this phase: the directly contracting
subcardioid has exact area `11π/81 ≈ 0.4266`. -/
theorem volume_Mandelbrot_ge_eleven_pi_div_eighty_one :
    ENNReal.ofReal (11 * Real.pi / 81) ≤ volume Mandelbrot := by
  rw [← volume_contractingCardioid]
  exact measure_mono contractingCardioid_subset_Mandelbrot

end

end Mandelbrot
