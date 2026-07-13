/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.HyperbolicTelescope
import Mathlib.Analysis.Complex.Schwarz
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# Schwarz--Pick between arbitrary complex disks

This file closes the two-point analytic bridge left open by
`HyperbolicTelescope.lean`.  For a disk `D(c,R)` and a point `w` in its
interior, an explicit homography sends `w` to zero and the disk to the unit
disk.  Conjugating an arbitrary holomorphic disk map by the source and target
homographies reduces the result to Mathlib's centered Schwarz lemma.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set

/-! ## Algebra of the disk automorphism -/

/-- Homography which sends `w` to zero and `D(d.center,d.radius)` to the unit
disk.  It is the unnormalized projective form of
`(u-a)/(1-conj(a)u)`. -/
def DiskFrame.toUnitHomography (d : DiskFrame) (w : ℂ) : Homography ℂ where
  A := d.radius
  B := -(d.radius : ℂ) * w
  C := -(starRingEnd ℂ) (w - d.center)
  D := (d.radius ^ 2 : ℝ) +
    (starRingEnd ℂ) (w - d.center) * d.center

theorem DiskFrame.toUnitHomography_num
    (d : DiskFrame) (w z : ℂ) :
    (d.toUnitHomography w).num z = (d.radius : ℂ) * (z - w) := by
  simp only [DiskFrame.toUnitHomography, Homography.num]
  ring

theorem DiskFrame.toUnitHomography_den
    (d : DiskFrame) (w z : ℂ) :
    (d.toUnitHomography w).den z =
      ((d.radius ^ 2 : ℝ) : ℂ) -
        (starRingEnd ℂ) (w - d.center) * (z - d.center) := by
  simp only [DiskFrame.toUnitHomography, Homography.den]
  ring

theorem DiskFrame.toUnitHomography_eval
    (d : DiskFrame) (w z : ℂ) :
    (d.toUnitHomography w).eval z =
      ((d.radius : ℂ) * (z - w)) /
        (((d.radius ^ 2 : ℝ) : ℂ) -
          (starRingEnd ℂ) (w - d.center) * (z - d.center)) := by
  change (d.toUnitHomography w).num z /
    (d.toUnitHomography w).den z = _
  rw [d.toUnitHomography_num w z, d.toUnitHomography_den w z]

theorem DiskFrame.norm_toUnitHomography_eval
    (d : DiskFrame) (w z : ℂ) :
    ‖(d.toUnitHomography w).eval z‖ = d.pseudoDist z w := by
  rw [d.toUnitHomography_eval w z]
  rfl

/-- Adjugate matrix; projectively it is the inverse homography. -/
def Homography.adjugate (m : Homography ℂ) : Homography ℂ where
  A := m.D
  B := -m.B
  C := -m.C
  D := m.A

theorem Homography.comp_adjugate (m : Homography ℂ) :
    m.comp m.adjugate = Homography.scale m.det Homography.one := by
  ext <;> simp [Homography.comp, Homography.adjugate, Homography.scale,
    Homography.one, Homography.det] <;> ring

theorem Homography.adjugate_comp (m : Homography ℂ) :
    m.adjugate.comp m = Homography.scale m.det Homography.one := by
  ext <;> simp [Homography.comp, Homography.adjugate, Homography.scale,
    Homography.one, Homography.det] <;> ring

theorem Homography.eval_comp_adjugate
    (m : Homography ℂ) (z : ℂ)
    (hdet : m.det ≠ 0) (hden : m.adjugate.den z ≠ 0) :
    m.eval (m.adjugate.eval z) = z := by
  rw [← m.eval_comp m.adjugate z hden, m.comp_adjugate]
  rw [Homography.eval_scale m.det Homography.one z hdet]
  exact Homography.eval_one z

theorem Homography.eval_adjugate_comp
    (m : Homography ℂ) (z : ℂ)
    (hdet : m.det ≠ 0) (hden : m.den z ≠ 0) :
    m.adjugate.eval (m.eval z) = z := by
  rw [← m.adjugate.eval_comp m z hden, m.adjugate_comp]
  rw [Homography.eval_scale m.det Homography.one z hdet]
  exact Homography.eval_one z

theorem Homography.den_eval_adjugate_ne_zero
    (m : Homography ℂ) (z : ℂ)
    (hdet : m.det ≠ 0) (hadjDen : m.adjugate.den z ≠ 0) :
    m.den (m.adjugate.eval z) ≠ 0 := by
  have hcomp := m.den_comp m.adjugate z hadjDen
  rw [m.comp_adjugate] at hcomp
  have hscaled : (Homography.scale m.det Homography.one).den z = m.det := by
    simp [Homography.den, Homography.scale, Homography.one]
  rw [hscaled] at hcomp
  intro hzero
  rw [hzero, zero_mul] at hcomp
  exact hdet hcomp

/-! ## The cross-ratio disk identity -/

/-- Algebraic identity behind the disk automorphism. -/
theorem DiskFrame.toUnit_crossratio_identity
    (d : DiskFrame) (w z : ℂ) :
    normSq (((d.radius ^ 2 : ℝ) : ℂ) -
        (starRingEnd ℂ) (w - d.center) * (z - d.center)) -
      d.radius ^ 2 * normSq (z - w) =
    (d.radius ^ 2 - normSq (w - d.center)) *
      (d.radius ^ 2 - normSq (z - d.center)) := by
  have hcomplex :
      ((normSq (((d.radius ^ 2 : ℝ) : ℂ) -
            (starRingEnd ℂ) (w - d.center) * (z - d.center)) -
          d.radius ^ 2 * normSq (z - w) : ℝ) : ℂ) =
        (((d.radius ^ 2 - normSq (w - d.center)) *
          (d.radius ^ 2 - normSq (z - d.center)) : ℝ) : ℂ) := by
    push_cast
    simp only [Complex.normSq_eq_conj_mul_self]
    simp
    ring
  exact_mod_cast hcomplex

theorem DiskFrame.toUnitHomography_det
    (d : DiskFrame) (w : ℂ) :
    (d.toUnitHomography w).det =
      (d.radius : ℂ) *
        ((d.radius ^ 2 - normSq (w - d.center) : ℝ) : ℂ) := by
  simp only [DiskFrame.toUnitHomography, Homography.det]
  push_cast
  rw [Complex.normSq_eq_conj_mul_self]
  ring

theorem DiskFrame.toUnitHomography_det_ne_zero
    (d : DiskFrame) (w : ℂ) (hR : 0 < d.radius)
    (hw : w ∈ ball d.center d.radius) :
    (d.toUnitHomography w).det ≠ 0 := by
  have hw' : ‖w - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hw
  have hgap : 0 < d.radius ^ 2 - normSq (w - d.center) := by
    rw [← Complex.sq_norm]
    nlinarith [norm_nonneg (w - d.center)]
  rw [d.toUnitHomography_det w]
  exact mul_ne_zero (ofReal_ne_zero.mpr hR.ne') (ofReal_ne_zero.mpr hgap.ne')

theorem DiskFrame.toUnitHomography_adjugate_den
    (d : DiskFrame) (w ξ : ℂ) :
    (d.toUnitHomography w).adjugate.den ξ =
      (starRingEnd ℂ) (w - d.center) * ξ + d.radius := by
  simp only [Homography.adjugate, DiskFrame.toUnitHomography, Homography.den]
  ring

theorem DiskFrame.toUnitHomography_adjugate_den_ne_zero
    (d : DiskFrame) (w ξ : ℂ) (hR : 0 < d.radius)
    (hw : w ∈ ball d.center d.radius)
    (hξ : ξ ∈ ball (0 : ℂ) 1) :
    (d.toUnitHomography w).adjugate.den ξ ≠ 0 := by
  have hw' : ‖w - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hw
  have hξ' : ‖ξ‖ < 1 := by
    simpa [mem_ball, dist_eq] using hξ
  have hprod : ‖(starRingEnd ℂ) (w - d.center) * ξ‖ < d.radius := by
    rw [norm_mul, Complex.norm_conj]
    by_cases hwzero : ‖w - d.center‖ = 0
    · simp [hwzero, hR]
    · have hwpos : 0 < ‖w - d.center‖ :=
        lt_of_le_of_ne (norm_nonneg _) (Ne.symm hwzero)
      calc
        ‖w - d.center‖ * ‖ξ‖ < ‖w - d.center‖ * 1 :=
          mul_lt_mul_of_pos_left hξ' hwpos
        _ = ‖w - d.center‖ := mul_one _
        _ < d.radius := hw'
  rw [d.toUnitHomography_adjugate_den w ξ]
  intro hzero
  have heq : (d.radius : ℂ) =
      -((starRingEnd ℂ) (w - d.center) * ξ) := by
    linear_combination hzero
  have hnorm := congrArg norm heq
  simp only [norm_real, Real.norm_eq_abs, abs_of_pos hR, norm_neg] at hnorm
  linarith

theorem DiskFrame.toUnitHomography_den_ne_zero
    (d : DiskFrame) (w z : ℂ) (hR : 0 < d.radius)
    (hw : w ∈ ball d.center d.radius)
    (hz : z ∈ ball d.center d.radius) :
    (d.toUnitHomography w).den z ≠ 0 := by
  have hw' : ‖w - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hw
  have hz' : ‖z - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hz
  have hwa : 0 < d.radius ^ 2 - normSq (w - d.center) := by
    rw [← Complex.sq_norm]
    nlinarith [norm_nonneg (w - d.center)]
  have hza : 0 < d.radius ^ 2 - normSq (z - d.center) := by
    rw [← Complex.sq_norm]
    nlinarith [norm_nonneg (z - d.center)]
  have hid := d.toUnit_crossratio_identity w z
  rw [← d.toUnitHomography_den w z] at hid
  intro hzero
  rw [hzero, normSq_zero] at hid
  have : 0 ≤ d.radius ^ 2 * normSq (z - w) :=
    mul_nonneg (sq_nonneg _) (normSq_nonneg _)
  nlinarith

/-- The disk automorphism maps the open input disk into the open unit disk. -/
theorem DiskFrame.norm_toUnitHomography_eval_lt_one
    (d : DiskFrame) (w z : ℂ) (hR : 0 < d.radius)
    (hw : w ∈ ball d.center d.radius)
    (hz : z ∈ ball d.center d.radius) :
    ‖(d.toUnitHomography w).eval z‖ < 1 := by
  have hden := d.toUnitHomography_den_ne_zero w z hR hw hz
  have hw' : ‖w - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hw
  have hz' : ‖z - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hz
  have hfactor : 0 < d.radius ^ 2 - normSq (w - d.center) := by
    rw [← Complex.sq_norm]
    nlinarith [norm_nonneg (w - d.center)]
  have hinside : 0 < d.radius ^ 2 - normSq (z - d.center) := by
    rw [← Complex.sq_norm]
    nlinarith [norm_nonneg (z - d.center)]
  have hid := d.toUnit_crossratio_identity w z
  have hdenNorm : 0 < ‖(d.toUnitHomography w).den z‖ :=
    norm_pos_iff.mpr hden
  have hstrict : d.radius ^ 2 * ‖z - w‖ ^ 2 <
      ‖(d.toUnitHomography w).den z‖ ^ 2 := by
    rw [d.toUnitHomography_den w z]
    rw [Complex.sq_norm (z - w),
      Complex.sq_norm (((d.radius ^ 2 : ℝ) : ℂ) -
        (starRingEnd ℂ) (w - d.center) * (z - d.center))]
    nlinarith [mul_pos hfactor hinside]
  rw [d.toUnitHomography_eval w z, norm_div, norm_mul, norm_real,
    Real.norm_eq_abs, abs_of_pos hR]
  rw [← d.toUnitHomography_den w z]
  apply (div_lt_one hdenNorm).mpr
  nlinarith [norm_nonneg (z - w)]

/-- Two-sided open-disk characterization of the normalizing homography. -/
theorem DiskFrame.norm_toUnitHomography_eval_lt_one_iff
    (d : DiskFrame) (w z : ℂ) (hR : 0 < d.radius)
    (hw : w ∈ ball d.center d.radius)
    (hden : (d.toUnitHomography w).den z ≠ 0) :
    ‖(d.toUnitHomography w).eval z‖ < 1 ↔
      z ∈ ball d.center d.radius := by
  have hw' : ‖w - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hw
  have hfactor : 0 < d.radius ^ 2 - normSq (w - d.center) := by
    rw [← Complex.sq_norm]
    nlinarith [norm_nonneg (w - d.center)]
  have hdenNorm : 0 < ‖(d.toUnitHomography w).den z‖ :=
    norm_pos_iff.mpr hden
  constructor
  · intro hout
    have hquot : d.radius * ‖z - w‖ /
        ‖(d.toUnitHomography w).den z‖ < 1 := by
      rw [d.toUnitHomography_eval w z] at hout
      rw [← d.toUnitHomography_den w z] at hout
      simpa [norm_div, norm_mul, norm_real, Real.norm_eq_abs,
        abs_of_pos hR] using hout
    have hnum : d.radius * ‖z - w‖ <
        ‖(d.toUnitHomography w).den z‖ :=
      (div_lt_one hdenNorm).mp hquot
    have hsq : d.radius ^ 2 * normSq (z - w) <
        normSq ((d.toUnitHomography w).den z) := by
      have hsquared : (d.radius * ‖z - w‖) ^ 2 <
          ‖(d.toUnitHomography w).den z‖ ^ 2 :=
        (sq_lt_sq₀ (mul_nonneg hR.le (norm_nonneg _)) hdenNorm.le).mpr hnum
      rw [← Complex.sq_norm (z - w),
        ← Complex.sq_norm ((d.toUnitHomography w).den z)]
      nlinarith
    have hid := d.toUnit_crossratio_identity w z
    rw [← d.toUnitHomography_den w z] at hid
    have hinside : 0 < d.radius ^ 2 - normSq (z - d.center) := by
      nlinarith
    rw [mem_ball, dist_eq]
    rw [← Complex.sq_norm] at hinside
    nlinarith [norm_nonneg (z - d.center)]
  · intro hz
    exact d.norm_toUnitHomography_eval_lt_one w z hR hw hz

/-- The projective inverse maps the unit disk back into the source disk. -/
theorem DiskFrame.adjugate_toUnit_maps_unitBall
    (d : DiskFrame) (w ξ : ℂ) (hR : 0 < d.radius)
    (hw : w ∈ ball d.center d.radius)
    (hξ : ξ ∈ ball (0 : ℂ) 1) :
    (d.toUnitHomography w).adjugate.eval ξ ∈ ball d.center d.radius := by
  let m := d.toUnitHomography w
  have hdet : m.det ≠ 0 := d.toUnitHomography_det_ne_zero w hR hw
  have hadjDen : m.adjugate.den ξ ≠ 0 :=
    d.toUnitHomography_adjugate_den_ne_zero w ξ hR hw hξ
  have hmDen : m.den (m.adjugate.eval ξ) ≠ 0 :=
    m.den_eval_adjugate_ne_zero ξ hdet hadjDen
  apply (d.norm_toUnitHomography_eval_lt_one_iff w
    (m.adjugate.eval ξ) hR hw hmDen).mp
  rw [m.eval_comp_adjugate ξ hdet hadjDen]
  simpa [mem_ball, dist_eq] using hξ

theorem DiskFrame.toUnitHomography_eval_self
    (d : DiskFrame) (w : ℂ) :
    (d.toUnitHomography w).eval w = 0 := by
  rw [d.toUnitHomography_eval w w]
  simp

theorem DiskFrame.adjugate_toUnit_eval_zero
    (d : DiskFrame) (w : ℂ) (hR : 0 < d.radius)
    (hw : w ∈ ball d.center d.radius) :
    (d.toUnitHomography w).adjugate.eval 0 = w := by
  let m := d.toUnitHomography w
  have hdet : m.det ≠ 0 := d.toUnitHomography_det_ne_zero w hR hw
  have hmDen : m.den w ≠ 0 :=
    d.toUnitHomography_den_ne_zero w w hR hw hw
  have hinv := m.eval_adjugate_comp w hdet hmDen
  rw [d.toUnitHomography_eval_self w] at hinv
  exact hinv

/-! ## Schwarz--Pick at two arbitrary points -/

/-- Full Schwarz--Pick theorem between arbitrary Euclidean disks, stated in
the exact pseudohyperbolic expression used by the runtime plan. -/
theorem DiskFrame.schwarzPick
    (input output : DiskFrame) (f : ℂ → ℂ) (z w : ℂ)
    (hInputR : 0 < input.radius) (hOutputR : 0 < output.radius)
    (hdiff : DifferentiableOn ℂ f (ball input.center input.radius))
    (hmaps : MapsTo f (ball input.center input.radius)
      (ball output.center output.radius))
    (hz : z ∈ ball input.center input.radius)
    (hw : w ∈ ball input.center input.radius) :
    output.pseudoDist (f z) (f w) ≤ input.pseudoDist z w := by
  let source := input.toUnitHomography w
  let target := output.toUnitHomography (f w)
  let g : ℂ → ℂ := fun ξ => target.eval (f (source.adjugate.eval ξ))
  have hfw : f w ∈ ball output.center output.radius := hmaps hw
  have hSourceDet : source.det ≠ 0 :=
    input.toUnitHomography_det_ne_zero w hInputR hw
  have hTargetDet : target.det ≠ 0 :=
    output.toUnitHomography_det_ne_zero (f w) hOutputR hfw
  have hg0 : g 0 = 0 := by
    dsimp only [g, source, target]
    rw [input.adjugate_toUnit_eval_zero w hInputR hw]
    exact output.toUnitHomography_eval_self (f w)
  have hgdiff : DifferentiableOn ℂ g (ball (0 : ℂ) 1) := by
    intro ξ hξ
    have hsourceMem : source.adjugate.eval ξ ∈
        ball input.center input.radius := by
      exact input.adjugate_toUnit_maps_unitBall w ξ hInputR hw hξ
    have hsourceDen : source.adjugate.den ξ ≠ 0 := by
      exact input.toUnitHomography_adjugate_den_ne_zero w ξ hInputR hw hξ
    have hfMem : f (source.adjugate.eval ξ) ∈
        ball output.center output.radius := hmaps hsourceMem
    have htargetDen : target.den (f (source.adjugate.eval ξ)) ≠ 0 := by
      exact output.toUnitHomography_den_ne_zero
        (f w) (f (source.adjugate.eval ξ)) hOutputR hfw hfMem
    have hsourceDiff : DifferentiableAt ℂ source.adjugate.eval ξ :=
      (source.adjugate.hasDerivAt_eval ξ hsourceDen).differentiableAt
    have hfDiff : DifferentiableAt ℂ f (source.adjugate.eval ξ) :=
      hdiff.differentiableAt (isOpen_ball.mem_nhds hsourceMem)
    have htargetDiff : DifferentiableAt ℂ target.eval
        (f (source.adjugate.eval ξ)) :=
      (target.hasDerivAt_eval _ htargetDen).differentiableAt
    exact (htargetDiff.comp ξ (hfDiff.comp ξ hsourceDiff)).differentiableWithinAt
  have hgmaps : MapsTo g (ball (0 : ℂ) 1) (closedBall (g 0) 1) := by
    intro ξ hξ
    have hsourceMem : source.adjugate.eval ξ ∈
        ball input.center input.radius :=
      input.adjugate_toUnit_maps_unitBall w ξ hInputR hw hξ
    have hfMem : f (source.adjugate.eval ξ) ∈
        ball output.center output.radius := hmaps hsourceMem
    have hnorm : ‖g ξ‖ < 1 := by
      exact output.norm_toUnitHomography_eval_lt_one
        (f w) (f (source.adjugate.eval ξ)) hOutputR hfw hfMem
    rw [hg0]
    exact ball_subset_closedBall (by simpa [mem_ball, dist_eq] using hnorm)
  let ξ := source.eval z
  have hSourceDenZ : source.den z ≠ 0 :=
    input.toUnitHomography_den_ne_zero w z hInputR hw hz
  have hξ : ξ ∈ ball (0 : ℂ) 1 := by
    have hnorm := input.norm_toUnitHomography_eval_lt_one
      w z hInputR hw hz
    simpa [ξ, mem_ball, dist_eq] using hnorm
  have hsourceInv : source.adjugate.eval ξ = z := by
    dsimp only [ξ]
    exact source.eval_adjugate_comp z hSourceDet hSourceDenZ
  have hschwarz := Complex.dist_le_dist_of_mapsTo_ball hgdiff hgmaps hξ
  have hnormSchwarz : ‖g ξ‖ ≤ ‖ξ‖ := by
    simpa [hg0, dist_eq] using hschwarz
  calc
    output.pseudoDist (f z) (f w) = ‖target.eval (f z)‖ := by
      symm
      exact output.norm_toUnitHomography_eval (f w) (f z)
    _ = ‖g ξ‖ := by simp only [g, hsourceInv]
    _ ≤ ‖ξ‖ := hnormSchwarz
    _ = input.pseudoDist z w := by
      exact input.norm_toUnitHomography_eval w z

/-- Runtime-facing specialization: a nondegenerate Möbius block is
pseudohyperbolically nonexpansive between a disk and its exact moving image
frame.  In fact it is an isometry, but the nonexpansive direction is exactly
what the defect telescope consumes. -/
theorem Homography.schwarzPick_imageFrame
    (m : Homography ℂ) (d : DiskFrame) (z w : ℂ)
    (hR : 0 < d.radius) (hDelta : 0 < m.diskDelta d.center d.radius)
    (hdet : m.det ≠ 0)
    (hz : z ∈ ball d.center d.radius)
    (hw : w ∈ ball d.center d.radius) :
    (m.imageFrame d).pseudoDist (m.eval z) (m.eval w) ≤
      d.pseudoDist z w := by
  have hImageR : 0 < (m.imageFrame d).radius := by
    unfold Homography.imageFrame Homography.diskImageRadius
    have hdetNorm : 0 < ‖m.det‖ := norm_pos_iff.mpr hdet
    positivity
  apply d.schwarzPick (m.imageFrame d) m.eval z w hR hImageR
  · intro x hx
    have hxClosed : x ∈ closedBall d.center d.radius :=
      ball_subset_closedBall hx
    have hden := m.den_ne_zero_on_closedBall_of_diskDelta_pos
      d.center d.radius hR.le hDelta x hxClosed
    exact (m.hasDerivAt_eval x hden).differentiableAt.differentiableWithinAt
  · exact m.mapsTo_ball_imageFrame d hR.le hDelta hdet
  · exact hz
  · exact hw

end

end Mandelbrot
