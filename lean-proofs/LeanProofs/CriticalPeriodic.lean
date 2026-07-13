/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MatrixC1Deriv
import LeanProofs.PeriodicRuntime
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Critical obstruction and grouped period-two return

A one-step Padé certificate necessarily fails when the reference orbit hits
the critical point: `a=2Z=0` makes its denominator vanish at the centre of
the perturbation disk.  This is an obstruction of the chosen local rational
chart, not of the exact dynamics.

For the superattracting period-two orbit `-1 ↦ 0 ↦ -1`, grouping the two exact
steps gives a polynomial return map.  It has no denominator, has zero
derivative at the centre, and admits a simple disk-invariance certificate.
-/

namespace Mandelbrot

noncomputable section

open Complex Set

/-! ## The local critical obstruction -/

theorem critical_pade_margin_not_positive (r : ℝ) (hr : 0 ≤ r) :
    ¬ 0 < ‖(0 : ℂ)‖ - r := by
  simp only [norm_zero, zero_sub]
  linarith

theorem critical_pade_den_zero (c : ℂ) :
    (padeStepHomography (0 : ℂ) c).den 0 = 0 := by
  simp [padeStepHomography_den]

theorem critical_pade_det_zero (c : ℂ) :
    (padeStepHomography (0 : ℂ) c).det = 0 := by
  rw [padeStepHomography_det]
  ring

/-- Therefore no disk containing its centre can satisfy the local pole margin
required by the one-step non-autonomous Padé certificate. -/
theorem no_centered_pade_step_certificate_at_critical
    (r : ℝ) (hr : 0 ≤ r) :
    ¬ (0 < ‖(0 : ℂ)‖ - r ∧
      ∀ z : ℂ, ‖z‖ ≤ r → (padeStepHomography (0 : ℂ) 0).den z ≠ 0) := by
  intro h
  exact critical_pade_margin_not_positive r hr h.1

/-! ## Grouping the exact period-two return -/

/-- Return map based at the reference point `Z=-1`: the coefficients are
`a₀=-2`, then `a₁=0`. -/
def periodTwoReturnFromMinusOne (z c : ℂ) : ℂ :=
  exactStep 0 (exactStep (-2) z c) c

/-- The cyclically shifted return based at `Z=0`. -/
def periodTwoReturnFromZero (z c : ℂ) : ℂ :=
  exactStep (-2) (exactStep 0 z c) c

theorem periodTwoReturnFromMinusOne_eq (z c : ℂ) :
    periodTwoReturnFromMinusOne z c = (-2 * z + z ^ 2 + c) ^ 2 + c := by
  simp only [periodTwoReturnFromMinusOne, exactStep]
  ring

theorem periodTwoReturnFromZero_eq (z c : ℂ) :
    periodTwoReturnFromZero z c = -2 * (z ^ 2 + c) + (z ^ 2 + c) ^ 2 + c := by
  simp only [periodTwoReturnFromZero, exactStep]
  ring

/-- At fixed parameter, the grouped return based at `-1` is quartic and
superattracting: its leading error is quadratic although one constituent
one-step Padé chart is singular. -/
theorem periodTwoReturnFromMinusOne_parameter_zero (z : ℂ) :
    periodTwoReturnFromMinusOne z 0 = z ^ 2 * (z - 2) ^ 2 := by
  rw [periodTwoReturnFromMinusOne_eq]
  ring

theorem periodTwoReturnFromZero_parameter_zero (z : ℂ) :
    periodTwoReturnFromZero z 0 = z ^ 2 * (z ^ 2 - 2) := by
  rw [periodTwoReturnFromZero_eq]
  ring

theorem hasDerivAt_periodTwoReturnFromMinusOne (z c : ℂ) :
    HasDerivAt (fun w => periodTwoReturnFromMinusOne w c)
      ((2 * exactStep (-2) z c) * (-2 + 2 * z)) z := by
  have hinner := hasDerivAt_exactStep (-2) z c
  have houter := hasDerivAt_exactStep 0 (exactStep (-2) z c) c
  have h := houter.comp z hinner
  change HasDerivAt (fun w => exactStep 0 (exactStep (-2) w c) c)
    ((0 + 2 * exactStep (-2) z c) * (-2 + 2 * z)) z at h
  simpa only [periodTwoReturnFromMinusOne, zero_add] using h

theorem periodTwoReturn_superattracting :
    HasDerivAt (fun w => periodTwoReturnFromMinusOne w 0) 0 0 := by
  convert hasDerivAt_periodTwoReturnFromMinusOne 0 0 using 1
  all_goals simp [exactStep]

/-! ## Builder-computable disk enclosure -/

/-- Scalar image radius for the grouped return based at `-1`. -/
def periodTwoGroupedRadius (r y : ℝ) : ℝ :=
  (2 * r + r ^ 2 + y) ^ 2 + y

theorem norm_periodTwoReturnFromMinusOne_le
    (z c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y) :
    ‖periodTwoReturnFromMinusOne z c‖ ≤ periodTwoGroupedRadius r y := by
  have hinner : ‖exactStep (-2) z c‖ ≤ 2 * r + r ^ 2 + y := by
    have h := exactStep_norm_le (-2 : ℂ) z c r y hz hc
    simpa using h
  have hinnerRadius : 0 ≤ 2 * r + r ^ 2 + y := by positivity
  have houter := exactStep_norm_le (0 : ℂ) (exactStep (-2) z c) c
    (2 * r + r ^ 2 + y) y hinner hc
  simpa [periodTwoReturnFromMinusOne, periodTwoGroupedRadius] using houter

/-- A single scalar inequality certifies that the complete two-step exact
return maps its perturbation disk into itself, even though neither a local
Padé margin nor a per-step matrix-c1 block exists at the critical step. -/
theorem periodTwoReturn_mapsTo_disk
    (c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (hc : ‖c‖ ≤ y)
    (hinvariant : periodTwoGroupedRadius r y ≤ r) :
    MapsTo (fun z => periodTwoReturnFromMinusOne z c)
      (periodicDisk r) (periodicDisk r) := by
  intro z hz
  exact (norm_periodTwoReturnFromMinusOne_le z c r y hr hy hz hc).trans hinvariant

/-- Particularly simple fixed-parameter enclosure. -/
theorem norm_periodTwoReturn_parameter_zero_le
    (z : ℂ) (r : ℝ) (hr : 0 ≤ r) (hz : ‖z‖ ≤ r) :
    ‖periodTwoReturnFromMinusOne z 0‖ ≤ r ^ 2 * (r + 2) ^ 2 := by
  rw [periodTwoReturnFromMinusOne_parameter_zero, norm_mul, norm_pow, norm_pow]
  have hsub : ‖z - 2‖ ≤ r + 2 := by
    calc
      ‖z - 2‖ ≤ ‖z‖ + ‖(2 : ℂ)‖ := norm_sub_le _ _
      _ ≤ r + 2 := by simpa using add_le_add_right hz 2
  exact mul_le_mul (by nlinarith [norm_nonneg z])
    (by nlinarith [norm_nonneg (z - 2)]) (sq_nonneg _) (sq_nonneg _)

/-- For example `r≤1/9` is a concrete invariant disk for the exact grouped
period-two return.  The constant is deliberately simple, not optimized. -/
theorem periodTwoReturn_parameter_zero_mapsTo_small_disk
    (r : ℝ) (hr : 0 ≤ r) (hsmall : r ≤ 1 / 9) :
    MapsTo (fun z => periodTwoReturnFromMinusOne z 0)
      (periodicDisk r) (periodicDisk r) := by
  intro z hz
  have hbound := norm_periodTwoReturn_parameter_zero_le z r hr hz
  have hsum : r + 2 ≤ 3 := by linarith
  have hsq : (r + 2) ^ 2 ≤ 9 := by nlinarith
  have hmul : r ^ 2 * (r + 2) ^ 2 ≤ r ^ 2 * 9 :=
    mul_le_mul_of_nonneg_left hsq (sq_nonneg r)
  have hsmall' : 9 * r ≤ 1 := by linarith
  have hlast : r ^ 2 * 9 ≤ r := by
    have hmul' := mul_le_mul_of_nonneg_right hsmall' hr
    nlinarith
  exact hbound.trans (hmul.trans hlast)

end

end Mandelbrot
