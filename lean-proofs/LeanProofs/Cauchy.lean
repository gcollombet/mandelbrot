/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Bounds
import Mathlib.Analysis.Complex.CauchyIntegral
import Mathlib.MeasureTheory.Integral.CircleAverage

/-!
# Cauchy coefficient and tail certificates

This file connects the algebraic tail formula to an analytic coefficient
bound on a complex circle.  The bivariate renderer can apply the same estimate
successively in each variable once holomorphy on its polydisc has been
established.
-/

namespace Mandelbrot

open Complex Metric Real
open scoped NNReal

noncomputable section

/-- Cauchy's coefficient estimate with the boundary supremum supplied as an
explicit certificate. -/
theorem norm_cauchyPowerSeries_le_sup
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (f : ℂ → E) (c : ℂ) (R M : ℝ) (n : ℕ)
    (hf : CircleIntegrable (fun z => ‖f z‖) c R)
    (hM : ∀ z ∈ sphere c |R|, ‖f z‖ ≤ M) :
    ‖cauchyPowerSeries f c R n‖ ≤ M * |R|⁻¹ ^ n := by
  have haverage :
      (2 * π)⁻¹ * ∫ θ : ℝ in 0..2 * π, ‖f (circleMap c R θ)‖ ≤ M := by
    simpa [Real.circleAverage, smul_eq_mul] using
      (Real.circleAverage_mono_on_of_le_circle hf hM)
  exact (norm_cauchyPowerSeries_le f c R n).trans
    (mul_le_mul_of_nonneg_right haverage (pow_nonneg (inv_nonneg.mpr (abs_nonneg R)) n))

/-- For a positive radius this is the familiar `M/R^n` form. -/
theorem norm_cauchyPowerSeries_le_sup_of_pos
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (f : ℂ → E) (c : ℂ) (R M : ℝ) (n : ℕ)
    (hR : 0 < R) (hf : CircleIntegrable (fun z => ‖f z‖) c R)
    (hM : ∀ z ∈ sphere c R, ‖f z‖ ≤ M) :
    ‖cauchyPowerSeries f c R n‖ ≤ M * R⁻¹ ^ n := by
  simpa [abs_of_pos hR] using norm_cauchyPowerSeries_le_sup f c R M n hf
    (by simpa [abs_of_pos hR] using hM)

/-- A differentiable map on a closed disc is represented by its Cauchy power
series on the open disc, and every coefficient satisfies the certified
boundary-supremum estimate. -/
theorem differentiable_cauchy_certificate
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E] [CompleteSpace E]
    (f : ℂ → E) (c : ℂ) (R : ℝ≥0) (M : ℝ)
    (hd : DifferentiableOn ℂ f (closedBall c R)) (hR : 0 < R)
    (hM : ∀ z ∈ sphere c R, ‖f z‖ ≤ M) :
    HasFPowerSeriesOnBall f (cauchyPowerSeries f c R) c R ∧
      ∀ n : ℕ, ‖cauchyPowerSeries f c R n‖ ≤ M * (R : ℝ)⁻¹ ^ n := by
  constructor
  · exact hd.hasFPowerSeriesOnBall hR
  · intro n
    have hf : CircleIntegrable (fun z => ‖f z‖) c R :=
      (hd.continuousOn.norm.mono sphere_subset_closedBall).circleIntegrable R.coe_nonneg
    exact norm_cauchyPowerSeries_le_sup_of_pos f c R M n
      (NNReal.coe_pos.mpr hR) hf hM

/-- Sum of the absolute contributions of all bivariate monomials of total
degree `d` at radii `(x,y)`. -/
def degreeSlice (term : ℕ → ℕ → ℝ) (x y : ℝ) (d : ℕ) : ℝ :=
  ∑ i ∈ Finset.range (d + 1), term i (d - i) * x ^ i * y ^ (d - i)

/-- If each normalized monomial of degree `d` is bounded by `M θ^d`, the
whole degree slice is bounded by `(d+1) M θ^d`. -/
theorem degreeSlice_le
    (term : ℕ → ℕ → ℝ) (x y M theta : ℝ) (d : ℕ)
    (hterm : ∀ i, i ≤ d →
      term i (d - i) * x ^ i * y ^ (d - i) ≤ M * theta ^ d) :
    degreeSlice term x y d ≤ (d + 1 : ℝ) * M * theta ^ d := by
  calc
    degreeSlice term x y d ≤
        ∑ _i ∈ Finset.range (d + 1), M * theta ^ d := by
      apply Finset.sum_le_sum
      intro i hi
      exact hterm i (Nat.le_of_lt_succ (Finset.mem_range.mp hi))
    _ = (d + 1 : ℝ) * M * theta ^ d := by
      simp
      ring

/-- A nonnegative stored tail dominated degree by degree by the Cauchy
majorant is summable and bounded by the exact closed form. -/
theorem cauchy_dominated_tail_le
    (slice : ℕ → ℝ) (M theta : ℝ) (D : ℕ)
    (htheta : |theta| < 1)
    (hslice_nonneg : ∀ k, 0 ≤ slice (D + k))
    (hslice : ∀ k, slice (D + k) ≤
      M * (D + k + 1 : ℝ) * theta ^ (D + k)) :
    (∑' k : ℕ, slice (D + k)) ≤
      M * (theta ^ D * ((D + 1 : ℝ) - D * theta) / (1 - theta) ^ 2) := by
  have hmajor : HasSum
      (fun k : ℕ => M * ((D + k + 1 : ℝ) * theta ^ (D + k)))
      (M * (theta ^ D * ((D + 1 : ℝ) - D * theta) / (1 - theta) ^ 2)) :=
    (hasSum_shifted_cauchy_tail D theta htheta).mul_left M
  have hsmall : Summable (fun k : ℕ => slice (D + k)) :=
    Summable.of_nonneg_of_le hslice_nonneg (fun k => by simpa [mul_assoc] using hslice k)
      hmajor.summable
  exact
    (hsmall.tsum_le_tsum (fun k => by simpa [mul_assoc] using hslice k) hmajor.summable).trans_eq
      hmajor.tsum_eq

end

end Mandelbrot
