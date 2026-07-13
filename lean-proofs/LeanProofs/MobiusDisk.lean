/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MatrixC1
import Mathlib.Analysis.Complex.Norm
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Exact disks for complex homographies

This file starts the projective/hyperbolic certificate.  It proves that

`Delta = |C c + D|^2 - |C|^2 R^2 > 0`

is equivalent to absence of a pole on the closed disk `D(c,R)`.  It then
defines the exact center and radius of the image disk and proves the signed
quadratic identity from which disk and boundary transport follow.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set

/-! ## Exact pole margin -/

/-- Projectively homogeneous disk denominator discriminant. -/
def Homography.diskDelta (m : Homography ℂ) (c : ℂ) (R : ℝ) : ℝ :=
  ‖m.den c‖ ^ 2 - ‖m.C‖ ^ 2 * R ^ 2

/-- Euclidean denominator margin at the center of a disk. -/
def Homography.diskPoleMargin (m : Homography ℂ) (c : ℂ) (R : ℝ) : ℝ :=
  ‖m.den c‖ - ‖m.C‖ * R

theorem Homography.diskDelta_pos_iff_poleMargin_pos
    (m : Homography ℂ) (c : ℂ) (R : ℝ) (hR : 0 ≤ R) :
    0 < m.diskDelta c R ↔ 0 < m.diskPoleMargin c R := by
  rw [Homography.diskDelta, Homography.diskPoleMargin, sub_pos, sub_pos]
  rw [show ‖m.C‖ ^ 2 * R ^ 2 = (‖m.C‖ * R) ^ 2 by ring]
  exact sq_lt_sq₀ (mul_nonneg (norm_nonneg _) hR) (norm_nonneg _)

/-- Centered reverse-triangle denominator bound. -/
theorem Homography.diskPoleMargin_le_norm_den
    (m : Homography ℂ) (c z : ℂ) (R : ℝ)
    (hz : z ∈ closedBall c R) :
    m.diskPoleMargin c R ≤ ‖m.den z‖ := by
  have hz' : ‖z - c‖ ≤ R := by
    simpa [mem_closedBall, dist_eq] using hz
  have hmul : ‖m.C * (z - c)‖ ≤ ‖m.C‖ * R := by
    rw [norm_mul]
    exact mul_le_mul_of_nonneg_left hz' (norm_nonneg _)
  have hreverse : ‖m.den c‖ - ‖m.C * (z - c)‖ ≤
      ‖m.den c + m.C * (z - c)‖ := by
    have h := norm_sub_norm_le (m.den c) (-m.C * (z - c))
    simpa [sub_eq_add_neg] using h
  calc
    m.diskPoleMargin c R = ‖m.den c‖ - ‖m.C‖ * R := rfl
    _ ≤ ‖m.den c‖ - ‖m.C * (z - c)‖ := sub_le_sub_left hmul _
    _ ≤ ‖m.den c + m.C * (z - c)‖ := hreverse
    _ = ‖m.den z‖ := by
      congr 1
      simp only [Homography.den]
      ring

theorem Homography.den_ne_zero_on_closedBall_of_diskDelta_pos
    (m : Homography ℂ) (c : ℂ) (R : ℝ) (hR : 0 ≤ R)
    (hDelta : 0 < m.diskDelta c R) :
    ∀ z ∈ closedBall c R, m.den z ≠ 0 := by
  intro z hz
  have hmargin : 0 < m.diskPoleMargin c R :=
    (m.diskDelta_pos_iff_poleMargin_pos c R hR).mp hDelta
  have hnorm : 0 < ‖m.den z‖ :=
    hmargin.trans_le (m.diskPoleMargin_le_norm_den c z R hz)
  exact norm_pos_iff.mp hnorm

/-- Exact converse: if the Euclidean margin is nonpositive, the pole lies in
the closed disk. -/
theorem Homography.exists_pole_in_closedBall_of_poleMargin_nonpos
    (m : Homography ℂ) (c : ℂ) (R : ℝ) (hR : 0 ≤ R)
    (hmargin : m.diskPoleMargin c R ≤ 0) :
    ∃ z ∈ closedBall c R, m.den z = 0 := by
  by_cases hC : m.C = 0
  · refine ⟨c, ?_, ?_⟩
    · simpa [mem_closedBall] using hR
    · have hD : ‖m.D‖ ≤ 0 := by
        simpa [Homography.diskPoleMargin, Homography.den, hC] using hmargin
      have : m.D = 0 := norm_eq_zero.mp (le_antisymm hD (norm_nonneg _))
      simp [Homography.den, hC, this]
  · let p : ℂ := -m.D / m.C
    have hpden : m.den p = 0 := by
      dsimp only [p]
      simp only [Homography.den]
      field_simp [hC]
      ring
    have hCnorm : 0 < ‖m.C‖ := norm_pos_iff.mpr hC
    have hpc : ‖p - c‖ = ‖m.den c‖ / ‖m.C‖ := by
      have hid : p - c = -(m.den c) / m.C := by
        dsimp only [p]
        simp only [Homography.den]
        field_simp [hC]
        ring
      rw [hid, norm_div, norm_neg]
    have hratio : ‖m.den c‖ / ‖m.C‖ ≤ R := by
      apply (div_le_iff₀ hCnorm).mpr
      have hm : ‖m.den c‖ ≤ ‖m.C‖ * R := by
        simpa [Homography.diskPoleMargin, sub_nonpos] using hmargin
      simpa [mul_comm] using hm
    refine ⟨p, ?_, hpden⟩
    rw [mem_closedBall, dist_eq, hpc]
    exact hratio

/-- `Delta>0` is exactly the condition that the closed input disk contains no
pole. -/
theorem Homography.diskDelta_pos_iff_no_pole_closedBall
    (m : Homography ℂ) (c : ℂ) (R : ℝ) (hR : 0 ≤ R) :
    0 < m.diskDelta c R ↔
      ∀ z ∈ closedBall c R, m.den z ≠ 0 := by
  constructor
  · exact m.den_ne_zero_on_closedBall_of_diskDelta_pos c R hR
  · intro hnopole
    rw [m.diskDelta_pos_iff_poleMargin_pos c R hR]
    by_contra hnot
    have hmargin : m.diskPoleMargin c R ≤ 0 := le_of_not_gt hnot
    obtain ⟨z, hz, hpole⟩ :=
      m.exists_pole_in_closedBall_of_poleMargin_nonpos c R hR hmargin
    exact hnopole z hz hpole

/-! ## Exact image disk -/

/-- Center of the exact image disk. -/
def Homography.diskImageCenter (m : Homography ℂ) (c : ℂ) (R : ℝ) : ℂ :=
  (m.num c * (starRingEnd ℂ) (m.den c) -
      m.A * (starRingEnd ℂ) m.C * ((R ^ 2 : ℝ) : ℂ)) /
    (m.diskDelta c R : ℂ)

/-- Radius of the exact image disk. -/
def Homography.diskImageRadius (m : Homography ℂ) (c : ℂ) (R : ℝ) : ℝ :=
  ‖m.det‖ * R / m.diskDelta c R

/-- Numerator which appears after subtracting the exact image center. -/
def Homography.diskImageAux
    (m : Homography ℂ) (c : ℂ) (R : ℝ) (z : ℂ) : ℂ :=
  (starRingEnd ℂ) (m.den c) * (z - c) +
    ((R ^ 2 : ℝ) : ℂ) * (starRingEnd ℂ) m.C

theorem Homography.coe_diskDelta
    (m : Homography ℂ) (c : ℂ) (R : ℝ) :
    (m.diskDelta c R : ℂ) =
      (starRingEnd ℂ) (m.den c) * m.den c -
        (starRingEnd ℂ) m.C * m.C * ((R ^ 2 : ℝ) : ℂ) := by
  simp only [Homography.diskDelta, Complex.sq_norm]
  push_cast
  rw [Complex.normSq_eq_conj_mul_self, Complex.normSq_eq_conj_mul_self]

/-- Exact complex identity after subtracting the image-disk center. -/
theorem Homography.eval_sub_diskImageCenter
    (m : Homography ℂ) (c z : ℂ) (R : ℝ)
    (hDelta : m.diskDelta c R ≠ 0) (hden : m.den z ≠ 0) :
    m.eval z - m.diskImageCenter c R =
      m.det * m.diskImageAux c R z /
        ((m.diskDelta c R : ℂ) * m.den z) := by
  have hDeltaC : (m.diskDelta c R : ℂ) ≠ 0 := by exact_mod_cast hDelta
  change m.num z / m.den z -
      (m.num c * (starRingEnd ℂ) (m.den c) -
        m.A * (starRingEnd ℂ) m.C * ((R ^ 2 : ℝ) : ℂ)) /
          (m.diskDelta c R : ℂ) = _
  rw [div_sub_div _ _ hden hDeltaC]
  rw [show
      m.num z * (m.diskDelta c R : ℂ) -
          m.den z * (m.num c * (starRingEnd ℂ) (m.den c) -
            m.A * (starRingEnd ℂ) m.C * ((R ^ 2 : ℝ) : ℂ)) =
        m.det * m.diskImageAux c R z by
    rw [m.coe_diskDelta c R]
    simp only [Homography.num, Homography.den, Homography.det,
      Homography.diskImageAux]
    ring]
  congr 1
  ring

/-- Hermitian quadratic identity behind exact disk transport. -/
theorem Homography.normSq_diskImageAux_sub
    (m : Homography ℂ) (c z : ℂ) (R : ℝ) :
    normSq (m.diskImageAux c R z) -
        R ^ 2 * normSq (m.den z) =
      m.diskDelta c R * (normSq (z - c) - R ^ 2) := by
  have hdenz : m.den z = m.den c + m.C * (z - c) := by
    simp only [Homography.den]
    ring
  have hcomplex :
      ((normSq (m.diskImageAux c R z) -
          R ^ 2 * normSq (m.den z) : ℝ) : ℂ) =
        ((m.diskDelta c R * (normSq (z - c) - R ^ 2) : ℝ) : ℂ) := by
    push_cast
    rw [Complex.normSq_eq_conj_mul_self,
      Complex.normSq_eq_conj_mul_self,
      Complex.normSq_eq_conj_mul_self]
    rw [m.coe_diskDelta c R, hdenz]
    simp only [Homography.diskImageAux]
    simp
    ring
  exact_mod_cast hcomplex

/-- Exact signed transport of the disk equation.  The positive factor on the
right preserves inside, boundary, and outside whenever `Delta>0` and the
homography is nondegenerate. -/
theorem Homography.diskImage_signed_identity
    (m : Homography ℂ) (c z : ℂ) (R : ℝ)
    (hDelta : m.diskDelta c R ≠ 0) (hden : m.den z ≠ 0) :
    ‖m.eval z - m.diskImageCenter c R‖ ^ 2 -
        (m.diskImageRadius c R) ^ 2 =
      (‖m.det‖ ^ 2 /
          (m.diskDelta c R * ‖m.den z‖ ^ 2)) *
        (‖z - c‖ ^ 2 - R ^ 2) := by
  rw [m.eval_sub_diskImageCenter c z R hDelta hden]
  simp only [Homography.diskImageRadius, norm_div, norm_mul,
    norm_real]
  simp only [Real.norm_eq_abs]
  have hdenNorm : ‖m.den z‖ ≠ 0 := norm_ne_zero_iff.mpr hden
  have hDeltaAbsNe : |m.diskDelta c R| ≠ 0 := abs_ne_zero.mpr hDelta
  field_simp [hDelta, hDeltaAbsNe, hdenNorm]
  rw [show ‖m.diskImageAux c R z‖ ^ 2 =
      normSq (m.diskImageAux c R z) by exact Complex.sq_norm _]
  rw [show ‖m.den z‖ ^ 2 = normSq (m.den z) by exact Complex.sq_norm _]
  rw [sq_abs]
  rw [show
      normSq (m.diskImageAux c R z) * m.diskDelta c R ^ 2 -
          m.diskDelta c R ^ 2 * normSq (m.den z) * R ^ 2 =
        m.diskDelta c R ^ 2 *
          (normSq (m.diskImageAux c R z) - R ^ 2 * normSq (m.den z)) by
    ring]
  rw [m.normSq_diskImageAux_sub c z R]
  rw [← Complex.sq_norm (z - c)]
  ring_nf

theorem Homography.diskImageRadius_nonneg
    (m : Homography ℂ) (c : ℂ) (R : ℝ)
    (hR : 0 ≤ R) (hDelta : 0 < m.diskDelta c R) :
    0 ≤ m.diskImageRadius c R := by
  unfold Homography.diskImageRadius
  positivity

/-- The homography maps the input closed disk into the exact image disk. -/
theorem Homography.mapsTo_closedBall_diskImage
    (m : Homography ℂ) (c : ℂ) (R : ℝ)
    (hR : 0 ≤ R) (hDelta : 0 < m.diskDelta c R) :
    MapsTo m.eval (closedBall c R)
      (closedBall (m.diskImageCenter c R) (m.diskImageRadius c R)) := by
  intro z hz
  have hden := m.den_ne_zero_on_closedBall_of_diskDelta_pos c R hR hDelta z hz
  have hid := m.diskImage_signed_identity c z R hDelta.ne' hden
  have hin : ‖z - c‖ ^ 2 - R ^ 2 ≤ 0 := by
    have hz' : ‖z - c‖ ≤ R := by simpa [mem_closedBall, dist_eq] using hz
    nlinarith [sq_le_sq₀ (norm_nonneg (z - c)) hR |>.mpr hz']
  have hfactor : 0 ≤ ‖m.det‖ ^ 2 /
      (m.diskDelta c R * ‖m.den z‖ ^ 2) := by positivity
  have houtSq : ‖m.eval z - m.diskImageCenter c R‖ ^ 2 ≤
      (m.diskImageRadius c R) ^ 2 := by
    have hprod : (‖m.det‖ ^ 2 /
          (m.diskDelta c R * ‖m.den z‖ ^ 2)) *
        (‖z - c‖ ^ 2 - R ^ 2) ≤ 0 :=
      mul_nonpos_of_nonneg_of_nonpos hfactor hin
    linarith [hid]
  have hRadius := m.diskImageRadius_nonneg c R hR hDelta
  rw [mem_closedBall, dist_eq]
  exact (sq_le_sq₀ (norm_nonneg _) hRadius).mp houtSq

/-- The boundary circle is transported exactly to the boundary circle. -/
theorem Homography.mapsTo_sphere_diskImage
    (m : Homography ℂ) (c : ℂ) (R : ℝ)
    (hR : 0 ≤ R) (hDelta : 0 < m.diskDelta c R) :
    MapsTo m.eval (sphere c R)
      (sphere (m.diskImageCenter c R) (m.diskImageRadius c R)) := by
  intro z hz
  have hzBall : z ∈ closedBall c R := sphere_subset_closedBall hz
  have hden := m.den_ne_zero_on_closedBall_of_diskDelta_pos c R hR hDelta z hzBall
  have hid := m.diskImage_signed_identity c z R hDelta.ne' hden
  have hin : ‖z - c‖ ^ 2 - R ^ 2 = 0 := by
    have hz' : ‖z - c‖ = R := by simpa [mem_sphere_iff_norm] using hz
    rw [hz']
    ring
  have houtSq : ‖m.eval z - m.diskImageCenter c R‖ ^ 2 =
      (m.diskImageRadius c R) ^ 2 := by
    rw [hin, mul_zero] at hid
    linarith
  have hRadius := m.diskImageRadius_nonneg c R hR hDelta
  rw [mem_sphere_iff_norm]
  exact (sq_eq_sq₀ (norm_nonneg _) hRadius).mp houtSq

/-- Away from the pole, membership in the source disk is equivalent to
membership of the image in the computed disk.  This is the two-sided form of
exact disk transport; `det ≠ 0` makes the factor in the signed identity
strictly positive. -/
theorem Homography.mem_closedBall_diskImage_iff
    (m : Homography ℂ) (c z : ℂ) (R : ℝ)
    (hR : 0 ≤ R) (hDelta : 0 < m.diskDelta c R)
    (hdet : m.det ≠ 0) (hden : m.den z ≠ 0) :
    m.eval z ∈ closedBall (m.diskImageCenter c R) (m.diskImageRadius c R) ↔
      z ∈ closedBall c R := by
  have hid := m.diskImage_signed_identity c z R hDelta.ne' hden
  have hRadius := m.diskImageRadius_nonneg c R hR hDelta
  have hfactor : 0 < ‖m.det‖ ^ 2 /
      (m.diskDelta c R * ‖m.den z‖ ^ 2) := by
    have hdetNorm : 0 < ‖m.det‖ := norm_pos_iff.mpr hdet
    have hdenNorm : 0 < ‖m.den z‖ := norm_pos_iff.mpr hden
    positivity
  constructor
  · intro hout
    have houtNorm : ‖m.eval z - m.diskImageCenter c R‖ ≤
        m.diskImageRadius c R := by
      simpa [mem_closedBall, dist_eq] using hout
    have houtDiff : ‖m.eval z - m.diskImageCenter c R‖ ^ 2 -
        (m.diskImageRadius c R) ^ 2 ≤ 0 := by
      nlinarith [sq_le_sq₀ (norm_nonneg _) hRadius |>.mpr houtNorm]
    have hprod : (‖m.det‖ ^ 2 /
          (m.diskDelta c R * ‖m.den z‖ ^ 2)) *
        (‖z - c‖ ^ 2 - R ^ 2) ≤ 0 := by
      linarith [hid]
    have hinDiff : ‖z - c‖ ^ 2 - R ^ 2 ≤ 0 :=
      nonpos_of_mul_nonpos_right hprod hfactor
    rw [mem_closedBall, dist_eq]
    exact (sq_le_sq₀ (norm_nonneg _) hR).mp (by linarith)
  · intro hin
    exact m.mapsTo_closedBall_diskImage c R hR hDelta hin

/-- Named statement corresponding to item 1 of the exploratory roadmap:
the displayed center and radius give exact inside/boundary transport. -/
theorem Homography.mobius_image_disk_exact
    (m : Homography ℂ) (c : ℂ) (R : ℝ)
    (hR : 0 ≤ R) (hDelta : 0 < m.diskDelta c R)
    (hdet : m.det ≠ 0) :
    MapsTo m.eval (closedBall c R)
        (closedBall (m.diskImageCenter c R) (m.diskImageRadius c R)) ∧
      MapsTo m.eval (sphere c R)
        (sphere (m.diskImageCenter c R) (m.diskImageRadius c R)) ∧
      ∀ z, m.den z ≠ 0 →
        (m.eval z ∈ closedBall (m.diskImageCenter c R)
            (m.diskImageRadius c R) ↔ z ∈ closedBall c R) := by
  refine ⟨m.mapsTo_closedBall_diskImage c R hR hDelta,
    m.mapsTo_sphere_diskImage c R hR hDelta, ?_⟩
  intro z hden
  exact m.mem_closedBall_diskImage_iff c z R hR hDelta hdet hden

/-- Named statement corresponding to item 2 of the exploratory roadmap. -/
theorem Homography.mobius_disk_pole_margin
    (m : Homography ℂ) (c : ℂ) (R : ℝ) (hR : 0 ≤ R) :
    0 < m.diskDelta c R ↔
      ∀ z ∈ closedBall c R, m.den z ≠ 0 :=
  m.diskDelta_pos_iff_no_pole_closedBall c R hR

end

end Mandelbrot
