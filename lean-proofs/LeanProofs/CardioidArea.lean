/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Analysis.Complex.RealDeriv
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.PolarCoord
import Mathlib.MeasureTheory.Function.Jacobian
import Mathlib.MeasureTheory.Integral.Prod
import Mathlib.MeasureTheory.Measure.Lebesgue.VolumeOfBalls
import Mathlib.RingTheory.Complex
import Mathlib.RingTheory.Norm.Transitivity
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Area of the main cardioid as a geometric image

This module is independent of the dynamical inclusion in the Mandelbrot set.
It treats the image of the unit disk by `λ ↦ λ/2 - λ²/4`.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set MeasureTheory

/-- Multiplier parametrization of the main cardioid. -/
def mainCardioidMap (lambda : ℂ) : ℂ :=
  lambda / 2 - lambda ^ 2 / 4

/-- Geometric open main cardioid, without any dynamical claim. -/
def mainCardioid : Set ℂ :=
  mainCardioidMap '' ball (0 : ℂ) 1

theorem mainCardioidMap_sub_factor (x y : ℂ) :
    mainCardioidMap x - mainCardioidMap y =
      (x - y) * (2 - x - y) / 4 := by
  simp only [mainCardioidMap]
  ring

/-- The multiplier parametrization is injective on the open unit disk. -/
theorem mainCardioidMap_injOn :
    InjOn mainCardioidMap (ball (0 : ℂ) 1) := by
  intro x hx y hy hxy
  have hx_norm : ‖x‖ < 1 := by simpa [mem_ball, dist_zero_right] using hx
  have hy_norm : ‖y‖ < 1 := by simpa [mem_ball, dist_zero_right] using hy
  have hprod : (x - y) * (2 - x - y) = 0 := by
    have hsub : mainCardioidMap x - mainCardioidMap y = 0 := sub_eq_zero.mpr hxy
    rw [mainCardioidMap_sub_factor] at hsub
    rcases (div_eq_zero_iff).1 hsub with h | h
    · exact h
    · norm_num at h
  rcases mul_eq_zero.mp hprod with h | h
  · exact sub_eq_zero.mp h
  · exfalso
    have hsum : x + y = 2 := by linear_combination -h
    have hnorm_sum : ‖x + y‖ < 2 := (norm_add_le x y).trans_lt (by linarith)
    rw [hsum] at hnorm_sum
    norm_num at hnorm_sum

theorem hasDerivAt_mainCardioidMap (lambda : ℂ) :
    HasDerivAt mainCardioidMap ((1 - lambda) / 2) lambda := by
  have h := (hasDerivAt_id lambda).div_const 2 |>.sub
    ((hasDerivAt_id lambda).pow 2 |>.div_const 4)
  convert h using 1
  all_goals first | rfl | (norm_num [id_eq]; ring)

/-- Real Fréchet derivative used by Mathlib's change-of-variables theorem. -/
def mainCardioidFDeriv (lambda : ℂ) : ℂ →L[ℝ] ℂ :=
  ((1 - lambda) / 2) • (1 : ℂ →L[ℝ] ℂ)

theorem hasFDerivAt_mainCardioidMap (lambda : ℂ) :
    HasFDerivAt mainCardioidMap (mainCardioidFDeriv lambda) lambda := by
  exact (hasDerivAt_mainCardioidMap lambda).complexToReal_fderiv

theorem det_mainCardioidFDeriv (lambda : ℂ) :
    (mainCardioidFDeriv lambda).det =
      normSq ((1 - lambda) / 2) := by
  simp only [mainCardioidFDeriv, ← Complex.restrictScalars_toSpanSingleton]
  simp [ContinuousLinearMap.det, LinearMap.det_restrictScalars,
    Algebra.norm_complex_eq]

/-- Change of variables reduces the cardioid area to the elementary disk
moment `∫ |(1-λ)/2|²`. -/
theorem volume_mainCardioid_eq_lintegral :
    volume mainCardioid =
      ∫⁻ lambda : ℂ in ball (0 : ℂ) 1,
        ENNReal.ofReal (normSq ((1 - lambda) / 2)) := by
  have h := lintegral_image_eq_lintegral_abs_det_fderiv_mul
    volume (measurableSet_ball : MeasurableSet (ball (0 : ℂ) 1))
    (fun lambda _ => (hasFDerivAt_mainCardioidMap lambda).hasFDerivWithinAt)
    mainCardioidMap_injOn (fun _ : ℂ => (1 : ENNReal))
  simpa only [mainCardioid, lintegral_one, Measure.restrict_apply_univ,
    det_mainCardioidFDeriv, abs_of_nonneg (normSq_nonneg _), mul_one] using h

/-! ## Evaluation of the disk moment -/

theorem normSq_cardioid_polar (r theta : ℝ) :
    normSq ((1 - Complex.polarCoord.symm (r, theta)) / 2) =
      (1 - 2 * r * Real.cos theta + r ^ 2) / 4 := by
  let u : ℂ := Real.cos theta + Real.sin theta * Complex.I
  have hu_norm : normSq u = 1 := by
    simp only [u, normSq_apply, add_re, ofReal_re, mul_re, ofReal_im,
      I_re, mul_zero, I_im, mul_one, zero_sub, add_zero, add_im, mul_im,
      zero_add]
    nlinarith [Real.sin_sq_add_cos_sq theta]
  have hu_re : u.re = Real.cos theta := by
    simp only [u, add_re, ofReal_re, mul_re, ofReal_im, I_re, I_im]
    ring
  rw [normSq_div, normSq_sub]
  simp only [normSq_one, one_mul, conj_re]
  rw [Complex.polarCoord_symm_apply]
  change (1 + normSq ((r : ℂ) * u) - 2 * ((r : ℂ) * u).re) /
      normSq 2 = _
  rw [normSq_mul, normSq_ofReal, hu_norm]
  simp only [mul_re, ofReal_re, ofReal_im, zero_mul, hu_re]
  norm_num
  ring

theorem cardioid_theta_integral (r : ℝ) :
    (∫ theta : ℝ in Ioo (-Real.pi) Real.pi,
      r * (1 - 2 * r * Real.cos theta + r ^ 2) / 4) =
      Real.pi / 2 * (r + r ^ 3) := by
  rw [← integral_Ioc_eq_integral_Ioo,
    ← intervalIntegral.integral_of_le (by linarith [Real.pi_pos])]
  rw [show (fun theta : ℝ => r * (1 - 2 * r * Real.cos theta + r ^ 2) / 4) =
      (fun theta : ℝ => r * (1 + r ^ 2) / 4 - (r ^ 2 / 2) * Real.cos theta) by
    funext theta
    ring]
  rw [intervalIntegral.integral_sub]
  · rw [intervalIntegral.integral_const, intervalIntegral.integral_const_mul,
      integral_cos]
    simp [Real.sin_pi]
    ring
  · exact intervalIntegrable_const
  · exact (Real.continuous_cos.const_mul _).intervalIntegrable _ _

theorem cardioid_radial_integral_to (R : ℝ) (hR : 0 ≤ R) :
    (∫ r : ℝ in Ioo (0 : ℝ) R, Real.pi / 2 * (r + r ^ 3)) =
      Real.pi / 2 * (R ^ 2 / 2 + R ^ 4 / 4) := by
  rw [← integral_Ioc_eq_integral_Ioo,
    ← intervalIntegral.integral_of_le hR]
  rw [intervalIntegral.integral_const_mul]
  rw [intervalIntegral.integral_add]
  · rw [show (fun r : ℝ => r) = fun r : ℝ => r ^ 1 by funext r; ring,
      integral_pow, integral_pow]
    ring
  · exact continuous_id.intervalIntegrable _ _
  · exact (continuous_id.pow 3).intervalIntegrable _ _

theorem cardioid_radial_integral :
    (∫ r : ℝ in Ioo (0 : ℝ) 1, Real.pi / 2 * (r + r ^ 3)) =
      3 * Real.pi / 8 := by
  rw [cardioid_radial_integral_to 1 (by norm_num)]
  ring

/-- Elementary moment evaluation on a complex disk of positive radius. -/
theorem integral_normSq_cardioid_ball (R : ℝ) (hR : 0 < R) :
    (∫ lambda : ℂ in ball (0 : ℂ) R,
      normSq ((1 - lambda) / 2)) =
        Real.pi / 2 * (R ^ 2 / 2 + R ^ 4 / 4) := by
  let moment : ℂ → ℝ := fun lambda => normSq ((1 - lambda) / 2)
  let small : Set (ℝ × ℝ) := Ioo (0 : ℝ) R ×ˢ Ioo (-Real.pi) Real.pi
  let polarIntegrand : ℝ × ℝ → ℝ := fun p =>
    p.1 * (ball (0 : ℂ) R).indicator moment (Complex.polarCoord.symm p)
  let explicitIntegrand : ℝ × ℝ → ℝ := fun p =>
    p.1 * (1 - 2 * p.1 * Real.cos p.2 + p.1 ^ 2) / 4
  have hpolar := Complex.integral_comp_polarCoord_symm
    ((ball (0 : ℂ) R).indicator moment)
  rw [integral_indicator measurableSet_ball] at hpolar
  change (∫ lambda : ℂ in ball (0 : ℂ) R, moment lambda) = _
  rw [← hpolar]
  change (∫ p : ℝ × ℝ in Complex.polarCoord.target, polarIntegrand p) = _
  have hsmall_target : small ⊆ Complex.polarCoord.target := by
    rw [Complex.polarCoord_target]
    intro p hp
    exact ⟨hp.1.1, hp.2⟩
  have hrestrict :
      (∫ p : ℝ × ℝ in Complex.polarCoord.target, polarIntegrand p) =
        ∫ p : ℝ × ℝ in small, polarIntegrand p := by
    apply setIntegral_eq_of_subset_of_forall_sdiff_eq_zero
      Complex.polarCoord.open_target.measurableSet hsmall_target
    intro p hp
    have htarget := hp.1
    rw [Complex.polarCoord_target] at htarget
    have hr_pos : 0 < p.1 := htarget.1
    have hnot_lt : ¬p.1 < R := by
      intro hp_lt
      exact hp.2 ⟨⟨hr_pos, hp_lt⟩, htarget.2⟩
    have hnot_ball : Complex.polarCoord.symm p ∉ ball (0 : ℂ) R := by
      rw [mem_ball, dist_zero_right, Complex.norm_polarCoord_symm]
      simpa [abs_of_pos hr_pos] using hnot_lt
    change p.1 * (ball (0 : ℂ) R).indicator moment
      (Complex.polarCoord.symm p) = 0
    rw [Set.indicator_of_notMem hnot_ball, mul_zero]
  rw [hrestrict]
  have hsmall_meas : MeasurableSet small := measurableSet_Ioo.prod measurableSet_Ioo
  have hreplace :
      (∫ p : ℝ × ℝ in small, polarIntegrand p) =
        ∫ p : ℝ × ℝ in small, explicitIntegrand p := by
    apply setIntegral_congr_fun hsmall_meas
    intro p hp
    have hr_pos : 0 < p.1 := hp.1.1
    have hr_lt : p.1 < R := hp.1.2
    have hball : Complex.polarCoord.symm p ∈ ball (0 : ℂ) R := by
      rw [mem_ball, dist_zero_right, Complex.norm_polarCoord_symm]
      simpa [abs_of_pos hr_pos] using hr_lt
    rw [show polarIntegrand p = p.1 * moment (Complex.polarCoord.symm p) by
      simp only [polarIntegrand, Set.indicator_of_mem hball]]
    change p.1 * normSq ((1 - Complex.polarCoord.symm p) / 2) =
      p.1 * (1 - 2 * p.1 * Real.cos p.2 + p.1 ^ 2) / 4
    rw [normSq_cardioid_polar]
    ring
  rw [hreplace]
  have hexplicit_cont : Continuous explicitIntegrand := by
    dsimp only [explicitIntegrand]
    fun_prop
  have hsmall_subset_closed :
      small ⊆ Icc (0 : ℝ) R ×ˢ Icc (-Real.pi) Real.pi :=
    prod_mono Ioo_subset_Icc_self Ioo_subset_Icc_self
  have hexplicit_int : IntegrableOn explicitIntegrand small :=
    (ContinuousOn.integrableOn_compact (isCompact_Icc.prod isCompact_Icc)
      hexplicit_cont.continuousOn).mono_set hsmall_subset_closed
  change (∫ p : ℝ × ℝ in Ioo (0 : ℝ) R ×ˢ Ioo (-Real.pi) Real.pi,
    explicitIntegrand p) = _
  rw [Measure.volume_eq_prod ℝ ℝ]
  rw [setIntegral_prod explicitIntegrand hexplicit_int]
  change (∫ r : ℝ in Ioo (0 : ℝ) R,
    ∫ theta : ℝ in Ioo (-Real.pi) Real.pi,
      r * (1 - 2 * r * Real.cos theta + r ^ 2) / 4) = _
  simp_rw [cardioid_theta_integral]
  exact cardioid_radial_integral_to R hR.le

/-- Unit-disk specialization, used by the full main cardioid. -/
theorem integral_normSq_cardioid_disk :
    (∫ lambda : ℂ in ball (0 : ℂ) 1,
      normSq ((1 - lambda) / 2)) = 3 * Real.pi / 8 := by
  rw [integral_normSq_cardioid_ball 1 (by norm_num)]
  ring

theorem integrableOn_normSq_cardioid_disk :
    IntegrableOn (fun lambda : ℂ => normSq ((1 - lambda) / 2))
      (ball (0 : ℂ) 1) := by
  have hcont : Continuous (fun lambda : ℂ => normSq ((1 - lambda) / 2)) := by
    fun_prop
  exact (ContinuousOn.integrableOn_compact (isCompact_closedBall (0 : ℂ) 1)
    hcont.continuousOn).mono_set ball_subset_closedBall

theorem lintegral_normSq_cardioid_disk :
    (∫⁻ lambda : ℂ in ball (0 : ℂ) 1,
      ENNReal.ofReal (normSq ((1 - lambda) / 2))) =
        ENNReal.ofReal (3 * Real.pi / 8) := by
  rw [← ofReal_integral_eq_lintegral_ofReal integrableOn_normSq_cardioid_disk
    (Filter.Eventually.of_forall fun _ => normSq_nonneg _)]
  rw [integral_normSq_cardioid_disk]

/-- Exact geometric area of the main cardioid.  This theorem proves no
inclusion in the Mandelbrot set. -/
theorem volume_mainCardioid :
    volume mainCardioid = ENNReal.ofReal (3 * Real.pi / 8) := by
  rw [volume_mainCardioid_eq_lintegral, lintegral_normSq_cardioid_disk]

end

end Mandelbrot
