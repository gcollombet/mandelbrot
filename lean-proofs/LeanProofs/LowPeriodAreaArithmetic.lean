/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodMultiplier
import Mathlib.Analysis.Real.Pi.Bounds

/-!
# Exact arithmetic budget for the `29/20` area target

This module records the deliberately rounded-down coefficient bounds used by
the period-three and period-four computation.  It does not assert that the
corresponding inverse multiplier branches exist; that analytic input remains
separate.  What is proved here is that these five norm certificates, with the
two conjugate pairs counted twice, have enough margin to pass `29/20`.
-/

namespace Mandelbrot

noncomputable section

open Complex

def lowPeriodFirstCoefficientMass
    (a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge : ℂ) : ℝ :=
  normSq a3Real + 2 * normSq a3Complex + normSq a4Real +
    2 * normSq a4ComplexSmall + 2 * normSq a4ComplexLarge

def coarseLowPeriodMass : ℝ :=
  (9 / 1000 : ℝ) ^ 2 + 2 * (94 / 1000 : ℝ) ^ 2 +
    (58 / 1000 : ℝ) ^ 2 + 2 * (4 / 1000 : ℝ) ^ 2 +
    2 * (43 / 1000 : ℝ) ^ 2

/-- Work on a compact disk strictly inside the multiplier unit disk.  This
avoids assuming boundary regularity of the inverse multiplier maps. -/
def certifiedMultiplierRadius : ℝ := 99 / 100

theorem coarseLowPeriodMass_eq :
    coarseLowPeriodMass = (24847 / 1000000 : ℝ) := by
  norm_num [coarseLowPeriodMass]

theorem lowPeriodFirstCoefficientMass_gt_coarse
    {a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge : ℂ}
    (h3r : (9 / 1000 : ℝ) < ‖a3Real‖)
    (h3c : (94 / 1000 : ℝ) < ‖a3Complex‖)
    (h4r : (58 / 1000 : ℝ) < ‖a4Real‖)
    (h4cs : (4 / 1000 : ℝ) < ‖a4ComplexSmall‖)
    (h4cl : (43 / 1000 : ℝ) < ‖a4ComplexLarge‖) :
    coarseLowPeriodMass < lowPeriodFirstCoefficientMass
      a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge := by
  have h3r_sq : (9 / 1000 : ℝ) ^ 2 < ‖a3Real‖ ^ 2 := by
    nlinarith [norm_nonneg a3Real]
  have h3c_sq : (94 / 1000 : ℝ) ^ 2 < ‖a3Complex‖ ^ 2 := by
    nlinarith [norm_nonneg a3Complex]
  have h4r_sq : (58 / 1000 : ℝ) ^ 2 < ‖a4Real‖ ^ 2 := by
    nlinarith [norm_nonneg a4Real]
  have h4cs_sq : (4 / 1000 : ℝ) ^ 2 < ‖a4ComplexSmall‖ ^ 2 := by
    nlinarith [norm_nonneg a4ComplexSmall]
  have h4cl_sq : (43 / 1000 : ℝ) ^ 2 < ‖a4ComplexLarge‖ ^ 2 := by
    nlinarith [norm_nonneg a4ComplexLarge]
  rw [coarseLowPeriodMass, lowPeriodFirstCoefficientMass]
  simp only [normSq_eq_norm_sq]
  linarith

/-- The rounded-down coefficient budget already clears the target. -/
theorem twenty_nine_div_twenty_lt_base_add_coarseLowPeriodArea :
    (29 / 20 : ℝ) <
      7 * Real.pi / 16 + Real.pi * coarseLowPeriodMass := by
  rw [coarseLowPeriodMass_eq]
  nlinarith [Real.pi_gt_d4]

/-- The margin survives restriction to the compact multiplier disk of radius
`99/100`. -/
theorem twenty_nine_div_twenty_lt_base_add_compact_coarseLowPeriodArea :
    (29 / 20 : ℝ) < 7 * Real.pi / 16 +
      Real.pi * certifiedMultiplierRadius ^ 2 * coarseLowPeriodMass := by
  rw [coarseLowPeriodMass_eq]
  norm_num [certifiedMultiplierRadius] at ⊢
  nlinarith [Real.pi_gt_d4]

theorem twenty_nine_div_twenty_lt_base_add_lowPeriodArea
    {a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge : ℂ}
    (h3r : (9 / 1000 : ℝ) < ‖a3Real‖)
    (h3c : (94 / 1000 : ℝ) < ‖a3Complex‖)
    (h4r : (58 / 1000 : ℝ) < ‖a4Real‖)
    (h4cs : (4 / 1000 : ℝ) < ‖a4ComplexSmall‖)
    (h4cl : (43 / 1000 : ℝ) < ‖a4ComplexLarge‖) :
    (29 / 20 : ℝ) < 7 * Real.pi / 16 +
      Real.pi * lowPeriodFirstCoefficientMass
        a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge := by
  have hmass := lowPeriodFirstCoefficientMass_gt_coarse
    h3r h3c h4r h4cs h4cl
  have harea := add_lt_add_left
    (mul_lt_mul_of_pos_left hmass Real.pi_pos) (7 * Real.pi / 16)
  exact twenty_nine_div_twenty_lt_base_add_coarseLowPeriodArea.trans
    (by simpa [add_comm] using harea)

theorem twenty_nine_div_twenty_lt_base_add_compact_lowPeriodArea
    {a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge : ℂ}
    (h3r : (9 / 1000 : ℝ) < ‖a3Real‖)
    (h3c : (94 / 1000 : ℝ) < ‖a3Complex‖)
    (h4r : (58 / 1000 : ℝ) < ‖a4Real‖)
    (h4cs : (4 / 1000 : ℝ) < ‖a4ComplexSmall‖)
    (h4cl : (43 / 1000 : ℝ) < ‖a4ComplexLarge‖) :
    (29 / 20 : ℝ) < 7 * Real.pi / 16 +
      Real.pi * certifiedMultiplierRadius ^ 2 *
        lowPeriodFirstCoefficientMass
          a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge := by
  have hmass := lowPeriodFirstCoefficientMass_gt_coarse
    h3r h3c h4r h4cs h4cl
  have hradius_pos : 0 < certifiedMultiplierRadius ^ 2 := by
    norm_num [certifiedMultiplierRadius]
  have harea : Real.pi * certifiedMultiplierRadius ^ 2 * coarseLowPeriodMass <
      Real.pi * certifiedMultiplierRadius ^ 2 *
        lowPeriodFirstCoefficientMass
          a3Real a3Complex a4Real a4ComplexSmall a4ComplexLarge :=
    mul_lt_mul_of_pos_left hmass (mul_pos Real.pi_pos hradius_pos)
  exact twenty_nine_div_twenty_lt_base_add_compact_coarseLowPeriodArea.trans
    (by linarith)

end

end Mandelbrot
