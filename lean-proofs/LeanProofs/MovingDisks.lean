/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MatrixC1Disk
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# Moving disks and compositional Hermitian transport

The runtime usually forgets the center after every block and returns to a
disk around zero.  This file formalizes the stronger alternative: a block
transports a disk frame `(center, radius)` to its exact Möbius image frame,
and the next block consumes that moving frame.

The scalar `diskEquation d z = |z-d.center|²-d.radius²` is the diagonal
Hermitian form of the circle.  Its transport factor is positive on a
certified disk.  For a composition the two factors multiply, so no geometric
information has to be discarded between blocks.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set

/-- A Euclidean disk frame.  Nonnegativity of the radius is carried as a
hypothesis by the theorems that need it, which keeps runtime data minimal. -/
structure DiskFrame where
  center : ℂ
  radius : ℝ

def DiskFrame.carrier (d : DiskFrame) : Set ℂ :=
  closedBall d.center d.radius

/-- Signed Hermitian equation of a disk/circle. -/
def DiskFrame.equation (d : DiskFrame) (z : ℂ) : ℝ :=
  ‖z - d.center‖ ^ 2 - d.radius ^ 2

/-- Exact image frame of a disk under a homography. -/
def Homography.imageFrame (m : Homography ℂ) (d : DiskFrame) : DiskFrame where
  center := m.diskImageCenter d.center d.radius
  radius := m.diskImageRadius d.center d.radius

/-- Positive scalar multiplying the disk equation under a nondegenerate
homography. -/
def Homography.diskTransportFactor
    (m : Homography ℂ) (d : DiskFrame) (z : ℂ) : ℝ :=
  ‖m.det‖ ^ 2 / (m.diskDelta d.center d.radius * ‖m.den z‖ ^ 2)

/-- The previously proved Möbius identity written as transport of a disk
frame's Hermitian equation. -/
theorem Homography.imageFrame_equation
    (m : Homography ℂ) (d : DiskFrame) (z : ℂ)
    (hDelta : m.diskDelta d.center d.radius ≠ 0)
    (hden : m.den z ≠ 0) :
    (m.imageFrame d).equation (m.eval z) =
      m.diskTransportFactor d z * d.equation z := by
  exact m.diskImage_signed_identity d.center z d.radius hDelta hden

/-- Exact disk transport packaged as a moving-frame operation. -/
theorem Homography.mapsTo_imageFrame
    (m : Homography ℂ) (d : DiskFrame)
    (hR : 0 ≤ d.radius) (hDelta : 0 < m.diskDelta d.center d.radius) :
    MapsTo m.eval d.carrier (m.imageFrame d).carrier := by
  exact m.mapsTo_closedBall_diskImage d.center d.radius hR hDelta

/-- The factor in the Hermitian identity is strictly positive on a certified
disk when the homography is nondegenerate. -/
theorem Homography.diskTransportFactor_pos
    (m : Homography ℂ) (d : DiskFrame) (z : ℂ)
    (hR : 0 ≤ d.radius) (hDelta : 0 < m.diskDelta d.center d.radius)
    (hdet : m.det ≠ 0) (hz : z ∈ d.carrier) :
    0 < m.diskTransportFactor d z := by
  have hden := m.den_ne_zero_on_closedBall_of_diskDelta_pos
    d.center d.radius hR hDelta z hz
  have hdetNorm : 0 < ‖m.det‖ := norm_pos_iff.mpr hdet
  have hdenNorm : 0 < ‖m.den z‖ := norm_pos_iff.mpr hden
  unfold Homography.diskTransportFactor
  positivity

/-- A nondegenerate homography maps the open disk into the open image disk,
not merely the corresponding closed disks. -/
theorem Homography.mapsTo_ball_imageFrame
    (m : Homography ℂ) (d : DiskFrame)
    (hR : 0 ≤ d.radius) (hDelta : 0 < m.diskDelta d.center d.radius)
    (hdet : m.det ≠ 0) :
    MapsTo m.eval (ball d.center d.radius)
      (ball (m.imageFrame d).center (m.imageFrame d).radius) := by
  intro z hz
  have hzNorm : ‖z - d.center‖ < d.radius := by
    simpa [mem_ball, dist_eq] using hz
  have hRpos : 0 < d.radius :=
    (norm_nonneg (z - d.center)).trans_lt hzNorm
  have hzClosed : z ∈ d.carrier := by
    simpa [DiskFrame.carrier, mem_closedBall, dist_eq] using hzNorm.le
  have hden := m.den_ne_zero_on_closedBall_of_diskDelta_pos
    d.center d.radius hR hDelta z hzClosed
  have hid := m.imageFrame_equation d z hDelta.ne' hden
  have hin : d.equation z < 0 := by
    unfold DiskFrame.equation
    nlinarith [sq_lt_sq₀ (norm_nonneg (z - d.center)) hR |>.mpr hzNorm]
  have hfactor := m.diskTransportFactor_pos d z hR hDelta hdet hzClosed
  have hout : (m.imageFrame d).equation (m.eval z) < 0 := by
    rw [hid]
    exact mul_neg_of_pos_of_neg hfactor hin
  have hImageR : 0 < (m.imageFrame d).radius := by
    unfold Homography.imageFrame Homography.diskImageRadius
    have hdetNorm : 0 < ‖m.det‖ := norm_pos_iff.mpr hdet
    positivity
  rw [mem_ball, dist_eq]
  unfold DiskFrame.equation at hout
  nlinarith [norm_nonneg (m.eval z - (m.imageFrame d).center)]

/-! ## Composition without recentering loss -/

/-- A composition maps a disk through the exact intermediate frame and then
through the exact final frame. -/
theorem Homography.mapsTo_imageFrame_comp
    (outer inner : Homography ℂ) (d : DiskFrame)
    (hR : 0 ≤ d.radius)
    (hInner : 0 < inner.diskDelta d.center d.radius)
    (hOuter : 0 < outer.diskDelta
      (inner.imageFrame d).center (inner.imageFrame d).radius) :
    MapsTo (outer.comp inner).eval d.carrier
      (outer.imageFrame (inner.imageFrame d)).carrier := by
  intro z hz
  have hden := inner.den_ne_zero_on_closedBall_of_diskDelta_pos
    d.center d.radius hR hInner z hz
  rw [outer.eval_comp inner z hden]
  exact outer.mapsTo_imageFrame (inner.imageFrame d)
    (inner.diskImageRadius_nonneg d.center d.radius hR hInner)
    hOuter (inner.mapsTo_imageFrame d hR hInner hz)

/-- The two local no-pole certificates imply a no-pole certificate for the
composed matrix on the original disk. -/
theorem Homography.diskDelta_comp_pos
    (outer inner : Homography ℂ) (d : DiskFrame)
    (hR : 0 ≤ d.radius)
    (hInner : 0 < inner.diskDelta d.center d.radius)
    (hOuter : 0 < outer.diskDelta
      (inner.imageFrame d).center (inner.imageFrame d).radius) :
    0 < (outer.comp inner).diskDelta d.center d.radius := by
  rw [(outer.comp inner).diskDelta_pos_iff_no_pole_closedBall
    d.center d.radius hR]
  intro z hz
  have hInnerDen := inner.den_ne_zero_on_closedBall_of_diskDelta_pos
    d.center d.radius hR hInner z hz
  have hImage := inner.mapsTo_imageFrame d hR hInner hz
  have hOuterDen := outer.den_ne_zero_on_closedBall_of_diskDelta_pos
    (inner.imageFrame d).center (inner.imageFrame d).radius
    (inner.diskImageRadius_nonneg d.center d.radius hR hInner)
    hOuter (inner.eval z) hImage
  rw [outer.den_comp inner z hInnerDen]
  exact mul_ne_zero hOuterDen hInnerDen

/-- Multiplicative Hermitian transport law.  This is the algebraic core of a
mobile-frame runtime: transporting the frame after every block is exactly
equivalent to multiplying its two positive local factors. -/
theorem Homography.imageFrame_equation_comp
    (outer inner : Homography ℂ) (d : DiskFrame) (z : ℂ)
    (hInnerDelta : inner.diskDelta d.center d.radius ≠ 0)
    (hInnerDen : inner.den z ≠ 0)
    (hOuterDelta : outer.diskDelta
      (inner.imageFrame d).center (inner.imageFrame d).radius ≠ 0)
    (hOuterDen : outer.den (inner.eval z) ≠ 0) :
    (outer.imageFrame (inner.imageFrame d)).equation
        ((outer.comp inner).eval z) =
      (outer.diskTransportFactor (inner.imageFrame d) (inner.eval z) *
        inner.diskTransportFactor d z) * d.equation z := by
  rw [outer.eval_comp inner z hInnerDen]
  rw [outer.imageFrame_equation (inner.imageFrame d) (inner.eval z)
    hOuterDelta hOuterDen]
  rw [inner.imageFrame_equation d z hInnerDelta hInnerDen]
  ring

/-! ## Projective normalization of the geometric gate -/

theorem Homography.diskPoleMargin_scale
    (s : ℂ) (m : Homography ℂ) (center : ℂ) (R : ℝ) :
    (Homography.scale s m).diskPoleMargin center R =
      ‖s‖ * m.diskPoleMargin center R := by
  rw [Homography.diskPoleMargin, Homography.diskPoleMargin,
    Homography.den_scale]
  simp only [Homography.scale, norm_mul]
  ring

theorem Homography.diskDelta_scale
    (s : ℂ) (m : Homography ℂ) (center : ℂ) (R : ℝ) :
    (Homography.scale s m).diskDelta center R =
      ‖s‖ ^ 2 * m.diskDelta center R := by
  rw [Homography.diskDelta, Homography.diskDelta,
    Homography.den_scale]
  simp only [Homography.scale, norm_mul]
  ring

/-- Projective scaling by a nonzero scalar preserves the discriminant gate. -/
theorem Homography.diskDelta_scale_pos_iff
    (s : ℂ) (m : Homography ℂ) (center : ℂ) (R : ℝ) (hs : s ≠ 0) :
    0 < (Homography.scale s m).diskDelta center R ↔
      0 < m.diskDelta center R := by
  rw [m.diskDelta_scale s center R]
  have hsNorm : 0 < ‖s‖ := norm_pos_iff.mpr hs
  constructor
  · intro h
    nlinarith [sq_pos_of_pos hsNorm]
  · intro h
    exact mul_pos (sq_pos_of_pos hsNorm) h

end

end Mandelbrot
