/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Dynamics
import LeanProofs.Periodic
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Concrete runtime certificate for periodic Möbius blocks

The multiplier at an attracting fixed point does not by itself certify a
uniform contraction on the complete runtime disk.  This file derives the
three scalar tests that do:

* a positive denominator margin;
* an image bound, with room for the block-model error;
* a uniform Lipschitz constant strictly below one.

They imply forward invariance of both the Möbius orbit and the exact block
orbit, then discharge the hypotheses of `periodic_model_error_contraction_on`.
The file also proves the correct cross-ratio enclosure used by a closed-form
periodic fast-forward.
-/

namespace Mandelbrot

noncomputable section

open Complex

/-- Runtime disk for the perturbation variable. -/
def periodicDisk (r : ℝ) : Set ℂ := {z | ‖z‖ ≤ r}

/-- Uniform denominator margin of `(Ae*z+Bc)/(De*z+K0)` on `|z|≤r`. -/
def periodicDenMargin (De K0 : ℂ) (r : ℝ) : ℝ :=
  ‖K0‖ - ‖De‖ * r

/-- Uniform image bound of the periodic Möbius block on `|z|≤r`. -/
def periodicImageBound (Ae Bc De K0 : ℂ) (r : ℝ) : ℝ :=
  (‖Ae‖ * r + ‖Bc‖) / periodicDenMargin De K0 r

/-- Uniform Euclidean Lipschitz constant on `|z|≤r`. -/
def periodicLipschitzBound (Ae Bc De K0 : ℂ) (r : ℝ) : ℝ :=
  ‖Ae * K0 - Bc * De‖ / periodicDenMargin De K0 r ^ 2

theorem periodic_den_margin_le
    (De K0 z : ℂ) (r : ℝ) (hz : ‖z‖ ≤ r) :
    periodicDenMargin De K0 r ≤ ‖De * z + K0‖ := by
  have hmul : ‖De * z‖ ≤ ‖De‖ * r := by
    rw [norm_mul]
    exact mul_le_mul_of_nonneg_left hz (norm_nonneg De)
  have hreverse : ‖K0‖ - ‖De * z‖ ≤ ‖De * z + K0‖ := by
    have h := norm_sub_norm_le K0 (-De * z)
    simpa [sub_eq_add_neg, add_comm] using h
  unfold periodicDenMargin
  linarith

theorem periodic_den_ne_zero
    (De K0 z : ℂ) (r : ℝ) (hz : ‖z‖ ≤ r)
    (hmargin : 0 < periodicDenMargin De K0 r) :
    De * z + K0 ≠ 0 := by
  apply norm_pos_iff.mp
  exact hmargin.trans_le (periodic_den_margin_le De K0 z r hz)

theorem norm_periodicMobius_le_imageBound
    (Ae Bc De K0 z : ℂ) (r : ℝ)
    (hr : 0 ≤ r) (hz : ‖z‖ ≤ r)
    (hmargin : 0 < periodicDenMargin De K0 r) :
    ‖periodicMobius Ae Bc De K0 z‖ ≤
      periodicImageBound Ae Bc De K0 r := by
  have hnum : ‖Ae * z + Bc‖ ≤ ‖Ae‖ * r + ‖Bc‖ := by
    calc
      ‖Ae * z + Bc‖ ≤ ‖Ae * z‖ + ‖Bc‖ := norm_add_le _ _
      _ = ‖Ae‖ * ‖z‖ + ‖Bc‖ := by rw [norm_mul]
      _ ≤ ‖Ae‖ * r + ‖Bc‖ := by
        have h := mul_le_mul_of_nonneg_left hz (norm_nonneg Ae)
        linarith
  have hden := periodic_den_margin_le De K0 z r hz
  have htop : 0 ≤ ‖Ae‖ * r + ‖Bc‖ :=
    add_nonneg (mul_nonneg (norm_nonneg Ae) hr) (norm_nonneg Bc)
  simp only [periodicMobius, norm_div, periodicImageBound]
  exact div_le_div₀ htop hnum hmargin hden

theorem periodicMobius_mapsTo_disk
    (Ae Bc De K0 : ℂ) (r : ℝ)
    (hr : 0 ≤ r) (hmargin : 0 < periodicDenMargin De K0 r)
    (himage : periodicImageBound Ae Bc De K0 r ≤ r) :
    Set.MapsTo (periodicMobius Ae Bc De K0) (periodicDisk r) (periodicDisk r) := by
  intro z hz
  exact (norm_periodicMobius_le_imageBound Ae Bc De K0 z r hr hz hmargin).trans himage

theorem periodicLipschitzBound_nonneg
    (Ae Bc De K0 : ℂ) (r : ℝ)
    (_hmargin : 0 < periodicDenMargin De K0 r) :
    0 ≤ periodicLipschitzBound Ae Bc De K0 r := by
  unfold periodicLipschitzBound
  exact div_nonneg (norm_nonneg _) (sq_nonneg _)

/-- The finite-difference identity yields a uniform, disk-wide contraction
test.  This is stronger than checking the multiplier at one fixed point. -/
theorem periodicMobius_lipschitz_on_disk
    (Ae Bc De K0 x y : ℂ) (r : ℝ)
    (hx : x ∈ periodicDisk r) (hy : y ∈ periodicDisk r)
    (hmargin : 0 < periodicDenMargin De K0 r) :
    dist (periodicMobius Ae Bc De K0 x) (periodicMobius Ae Bc De K0 y) ≤
      periodicLipschitzBound Ae Bc De K0 r * dist x y := by
  have hxden := periodic_den_ne_zero De K0 x r hx hmargin
  have hyden := periodic_den_ne_zero De K0 y r hy hmargin
  have hshiftDen : De * (x + (y - x)) + K0 ≠ 0 := by
    convert hyden using 1
    ring
  have hinc := periodicMobius_increment Ae Bc De K0 x (y - x) hxden hshiftDen
  have hxlower := periodic_den_margin_le De K0 x r hx
  have hylower := periodic_den_margin_le De K0 y r hy
  have hmarginSq : 0 < periodicDenMargin De K0 r ^ 2 := sq_pos_of_pos hmargin
  have hdenProduct : periodicDenMargin De K0 r ^ 2 ≤
      ‖De * y + K0‖ * ‖De * x + K0‖ := by
    rw [pow_two]
    exact mul_le_mul hylower hxlower hmargin.le (norm_nonneg _)
  have htop : 0 ≤ ‖y - x‖ * ‖Ae * K0 - Bc * De‖ :=
    mul_nonneg (norm_nonneg _) (norm_nonneg _)
  have hfrac :
      ‖y - x‖ * ‖Ae * K0 - Bc * De‖ /
          (‖De * y + K0‖ * ‖De * x + K0‖) ≤
        ‖y - x‖ * ‖Ae * K0 - Bc * De‖ /
          periodicDenMargin De K0 r ^ 2 :=
    div_le_div₀ htop le_rfl hmarginSq hdenProduct
  have hidentity : periodicMobius Ae Bc De K0 y -
      periodicMobius Ae Bc De K0 x =
      (y - x) * (Ae * K0 - Bc * De) /
        ((De * y + K0) * (De * x + K0)) := by
    simpa using hinc
  calc
    dist (periodicMobius Ae Bc De K0 x) (periodicMobius Ae Bc De K0 y) =
        ‖periodicMobius Ae Bc De K0 y - periodicMobius Ae Bc De K0 x‖ := by
      simp only [dist_eq, norm_sub_rev]
    _ = ‖(y - x) * (Ae * K0 - Bc * De)‖ /
        ‖(De * y + K0) * (De * x + K0)‖ := by rw [hidentity, norm_div]
    _ =
      ‖y - x‖ * ‖Ae * K0 - Bc * De‖ /
        (‖De * y + K0‖ * ‖De * x + K0‖) := by rw [norm_mul, norm_mul]
    _ ≤ ‖y - x‖ * ‖Ae * K0 - Bc * De‖ /
        periodicDenMargin De K0 r ^ 2 := hfrac
    _ = periodicLipschitzBound Ae Bc De K0 r * dist x y := by
      unfold periodicLipschitzBound
      simp only [dist_eq, norm_sub_rev]
      ring

/-- A true block map remains in the disk when its model error fits in the
room left by the Möbius image bound. -/
theorem exactPeriodicBlock_mapsTo_disk
    (Ae Bc De K0 : ℂ) (r eps : ℝ) (g : ℂ → ℂ)
    (hr : 0 ≤ r) (hmargin : 0 < periodicDenMargin De K0 r)
    (hmodel : ∀ z ∈ periodicDisk r,
      ‖g z - periodicMobius Ae Bc De K0 z‖ ≤ eps)
    (hroom : periodicImageBound Ae Bc De K0 r + eps ≤ r) :
    Set.MapsTo g (periodicDisk r) (periodicDisk r) := by
  intro z hz
  calc
    ‖g z‖ = ‖(g z - periodicMobius Ae Bc De K0 z) +
        periodicMobius Ae Bc De K0 z‖ := by
      congr 1
      ring
    _ ≤ ‖g z - periodicMobius Ae Bc De K0 z‖ +
        ‖periodicMobius Ae Bc De K0 z‖ := norm_add_le _ _
    _ ≤ eps + periodicImageBound Ae Bc De K0 r :=
      add_le_add (hmodel z hz)
        (norm_periodicMobius_le_imageBound Ae Bc De K0 z r hr hz hmargin)
    _ ≤ r := by linarith

/-- Concrete periodic runtime certificate.  The scalar tests imply domain
invariance for both paths, uniform contraction, and the time-uniform model
error `eps/(1-gamma)`. -/
theorem periodic_runtime_certificate
    (Ae Bc De K0 : ℂ) (r eps : ℝ) (g : ℂ → ℂ)
    (modelOrbit trueOrbit : ℕ → ℂ)
    (hr : 0 ≤ r) (heps : 0 ≤ eps)
    (hmargin : 0 < periodicDenMargin De K0 r)
    (hroom : periodicImageBound Ae Bc De K0 r + eps ≤ r)
    (hgamma : periodicLipschitzBound Ae Bc De K0 r < 1)
    (hmodel : ∀ z ∈ periodicDisk r,
      ‖g z - periodicMobius Ae Bc De K0 z‖ ≤ eps)
    (hstart : trueOrbit 0 = modelOrbit 0)
    (hstartDisk : trueOrbit 0 ∈ periodicDisk r)
    (hmodelStep : ∀ n, modelOrbit (n + 1) =
      periodicMobius Ae Bc De K0 (modelOrbit n))
    (htrueStep : ∀ n, trueOrbit (n + 1) = g (trueOrbit n)) :
    (∀ n, modelOrbit n ∈ periodicDisk r) ∧
    (∀ n, trueOrbit n ∈ periodicDisk r) ∧
    (∀ n, dist (trueOrbit n) (modelOrbit n) ≤
      eps / (1 - periodicLipschitzBound Ae Bc De K0 r)) := by
  have himage : periodicImageBound Ae Bc De K0 r ≤ r := by linarith
  have hmobiusMaps := periodicMobius_mapsTo_disk
    Ae Bc De K0 r hr hmargin himage
  have htrueMaps := exactPeriodicBlock_mapsTo_disk
    Ae Bc De K0 r eps g hr hmargin hmodel hroom
  have hmodelMem : ∀ n, modelOrbit n ∈ periodicDisk r :=
    orbit_mem_of_mapsTo (periodicDisk r) (periodicMobius Ae Bc De K0)
      modelOrbit (by simpa [hstart] using hstartDisk) hmodelStep hmobiusMaps
  have htrueMem : ∀ n, trueOrbit n ∈ periodicDisk r :=
    orbit_mem_of_mapsTo (periodicDisk r) g trueOrbit hstartDisk htrueStep htrueMaps
  refine ⟨hmodelMem, htrueMem, ?_⟩
  apply periodic_model_error_contraction_on
    (periodicDisk r) (periodicMobius Ae Bc De K0)
    modelOrbit trueOrbit eps (periodicLipschitzBound Ae Bc De K0 r)
    heps (periodicLipschitzBound_nonneg Ae Bc De K0 r hmargin) hgamma
    hstart hmodelStep
  · intro n
    rw [htrueStep n]
    simpa only [dist_eq] using hmodel (trueOrbit n) (htrueMem n)
  · exact hmodelMem
  · exact htrueMem
  · intro x hx y hy
    exact periodicMobius_lipschitz_on_disk Ae Bc De K0 x y r hx hy hmargin

/-! ## Correct cross-ratio enclosure for the closed form -/

def periodicCrossRatioReconstruct (alpha beta w : ℂ) : ℂ :=
  (alpha - beta * w) / (1 - w)

theorem periodicCrossRatioReconstruct_sub
    (alpha beta w : ℂ) (hw : 1 - w ≠ 0) :
    periodicCrossRatioReconstruct alpha beta w - alpha =
      (alpha - beta) * w / (1 - w) := by
  simp only [periodicCrossRatioReconstruct]
  rw [div_sub' hw]
  congr 1
  ring

theorem periodicCrossRatioReconstruct_norm_le
    (alpha beta w : ℂ) (q : ℝ)
    (hq0 : 0 ≤ q) (hq1 : q < 1) (hw : ‖w‖ ≤ q) :
    ‖periodicCrossRatioReconstruct alpha beta w‖ ≤
      ‖alpha‖ + ‖alpha - beta‖ * q / (1 - q) := by
  have hden : 1 - q ≤ ‖1 - w‖ := by
    have h : 1 - ‖w‖ ≤ ‖1 - w‖ := by
      simpa using norm_sub_norm_le (1 : ℂ) w
    exact (sub_le_sub_left hw 1).trans h
  have hdenPos : 0 < ‖1 - w‖ := (sub_pos.mpr hq1).trans_le hden
  have hwne : 1 - w ≠ 0 := norm_pos_iff.mp hdenPos
  have hfrac : ‖(alpha - beta) * w / (1 - w)‖ ≤
      ‖alpha - beta‖ * q / (1 - q) := by
    simp only [norm_div, norm_mul]
    have htop : ‖alpha - beta‖ * ‖w‖ ≤ ‖alpha - beta‖ * q :=
      mul_le_mul_of_nonneg_left hw (norm_nonneg _)
    exact div_le_div₀
      (mul_nonneg (norm_nonneg _) hq0) htop (sub_pos.mpr hq1) hden
  calc
    ‖periodicCrossRatioReconstruct alpha beta w‖ =
        ‖(periodicCrossRatioReconstruct alpha beta w - alpha) + alpha‖ := by
      congr 1
      ring
    _ ≤ ‖periodicCrossRatioReconstruct alpha beta w - alpha‖ + ‖alpha‖ :=
      norm_add_le _ _
    _ ≤ ‖alpha - beta‖ * q / (1 - q) + ‖alpha‖ := by
      rw [periodicCrossRatioReconstruct_sub alpha beta w hwne]
      linarith
    _ = ‖alpha‖ + ‖alpha - beta‖ * q / (1 - q) := by ring

/-- If `w` is multiplied by a contraction at every period, the complete
closed-form orbit stays in the explicitly computable disk below. -/
theorem periodic_cross_ratio_orbit_enclosed
    (alpha beta kappa : ℂ) (w : ℕ → ℂ) (q r : ℝ)
    (hq0 : 0 ≤ q) (hq1 : q < 1)
    (hkappa : ‖kappa‖ ≤ 1) (hw0 : ‖w 0‖ ≤ q)
    (hstep : ∀ n, w (n + 1) = kappa * w n)
    (hradius : ‖alpha‖ + ‖alpha - beta‖ * q / (1 - q) ≤ r) :
    ∀ n, ‖periodicCrossRatioReconstruct alpha beta (w n)‖ ≤ r := by
  have hwn : ∀ n, ‖w n‖ ≤ q := by
    intro n
    induction n with
    | zero => exact hw0
    | succ n ih =>
        rw [hstep n, norm_mul]
        calc
          ‖kappa‖ * ‖w n‖ ≤ 1 * q :=
            mul_le_mul hkappa ih (norm_nonneg _) (by norm_num)
          _ = q := one_mul q
  intro n
  exact (periodicCrossRatioReconstruct_norm_le
    alpha beta (w n) q hq0 hq1 (hwn n)).trans hradius

end

end Mandelbrot
