/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MatrixC1
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Comp
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# Derivative certificate for first-order Padé matrices

The `matrix-c1` runtime also needs the derivative `∂z` of the induced Möbius
map.  The derivative of a homography is `det / den²`, so the truncation error
of the derivative splits into a determinant perturbation and a squared
denominator perturbation.  This file bounds both by quantities available at
table-build time, uniformly in the parameter disk `|c| ≤ y` — the exact
majorant computed by the builder (`matc1_deriv_error_log2`).

The second half provides the building blocks for the shadowing-derivative
chain: derivatives of the exact step and of the Padé seed, their difference,
and the two-point derivative transport of a homographic tail.
-/

namespace Mandelbrot

noncomputable section

section ComplexDeriv

open Complex

/-! ## Derivative of a homography -/

/-- The derivative of the induced Möbius map is `det / den²`. -/
theorem Homography.hasDerivAt_eval (m : Homography ℂ) (z : ℂ)
    (h : m.den z ≠ 0) :
    HasDerivAt m.eval (m.det / (m.den z) ^ 2) z := by
  have hnum : HasDerivAt (fun w : ℂ => m.A * w + m.B) m.A z :=
    (hasDerivAt_const_mul m.A).add_const m.B
  have hden : HasDerivAt (fun w : ℂ => m.C * w + m.D) m.C z :=
    (hasDerivAt_const_mul m.C).add_const m.D
  have hdiv : HasDerivAt (fun w : ℂ => (m.A * w + m.B) / (m.C * w + m.D))
      ((m.A * (m.C * z + m.D) - (m.A * z + m.B) * m.C) /
        (m.C * z + m.D) ^ 2) z :=
    hnum.fun_div hden h
  have heq : (m.A * (m.C * z + m.D) - (m.A * z + m.B) * m.C) /
      (m.C * z + m.D) ^ 2 = m.det / (m.den z) ^ 2 := by
    simp only [Homography.det, Homography.den]
    congr 1
    ring
  rw [heq] at hdiv
  exact hdiv

/-! ## Determinant and denominator envelopes of the truncated matrix -/

/-- Determinant perturbation from an entrywise matrix perturbation. -/
theorem Homography.det_sub_det_le (m q : Homography ℂ) (E : ℝ)
    (hE : (m.sub q).entryNorm ≤ E) :
    ‖m.det - q.det‖ ≤ E * (q.entryNorm + 2 * E) := by
  have hEnonneg : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hA : ‖m.A - q.A‖ ≤ E := by
    have h := (m.sub q).entry_norm_A_le.trans hE
    simpa only [Homography.sub] using h
  have hB : ‖m.B - q.B‖ ≤ E := by
    have h := (m.sub q).entry_norm_B_le.trans hE
    simpa only [Homography.sub] using h
  have hC : ‖m.C - q.C‖ ≤ E := by
    have h := (m.sub q).entry_norm_C_le.trans hE
    simpa only [Homography.sub] using h
  have hD : ‖m.D - q.D‖ ≤ E := by
    have h := (m.sub q).entry_norm_D_le.trans hE
    simpa only [Homography.sub] using h
  have hmD : ‖m.D‖ ≤ ‖q.D‖ + E := by
    calc
      ‖m.D‖ = ‖q.D + (m.D - q.D)‖ := by congr 1; ring
      _ ≤ ‖q.D‖ + ‖m.D - q.D‖ := norm_add_le _ _
      _ ≤ ‖q.D‖ + E := by linarith
  have hmC : ‖m.C‖ ≤ ‖q.C‖ + E := by
    calc
      ‖m.C‖ = ‖q.C + (m.C - q.C)‖ := by congr 1; ring
      _ ≤ ‖q.C‖ + ‖m.C - q.C‖ := norm_add_le _ _
      _ ≤ ‖q.C‖ + E := by linarith
  have hdecomp : m.det - q.det =
      ((m.A - q.A) * m.D + q.A * (m.D - q.D)) -
        ((m.B - q.B) * m.C + q.B * (m.C - q.C)) := by
    simp only [Homography.det]
    ring
  have t1 : ‖(m.A - q.A) * m.D‖ ≤ E * (‖q.D‖ + E) := by
    rw [norm_mul]
    exact mul_le_mul hA hmD (norm_nonneg _) hEnonneg
  have t2 : ‖q.A * (m.D - q.D)‖ ≤ ‖q.A‖ * E := by
    rw [norm_mul]
    exact mul_le_mul_of_nonneg_left hD (norm_nonneg _)
  have t3 : ‖(m.B - q.B) * m.C‖ ≤ E * (‖q.C‖ + E) := by
    rw [norm_mul]
    exact mul_le_mul hB hmC (norm_nonneg _) hEnonneg
  have t4 : ‖q.B * (m.C - q.C)‖ ≤ ‖q.B‖ * E := by
    rw [norm_mul]
    exact mul_le_mul_of_nonneg_left hC (norm_nonneg _)
  calc
    ‖m.det - q.det‖ =
        ‖((m.A - q.A) * m.D + q.A * (m.D - q.D)) -
          ((m.B - q.B) * m.C + q.B * (m.C - q.C))‖ := by rw [hdecomp]
    _ ≤ ‖(m.A - q.A) * m.D + q.A * (m.D - q.D)‖ +
        ‖(m.B - q.B) * m.C + q.B * (m.C - q.C)‖ := norm_sub_le _ _
    _ ≤ (‖(m.A - q.A) * m.D‖ + ‖q.A * (m.D - q.D)‖) +
        (‖(m.B - q.B) * m.C‖ + ‖q.B * (m.C - q.C)‖) :=
      add_le_add (norm_add_le _ _) (norm_add_le _ _)
    _ ≤ (E * (‖q.D‖ + E) + ‖q.A‖ * E) +
        (E * (‖q.C‖ + E) + ‖q.B‖ * E) := by linarith
    _ = E * (q.entryNorm + 2 * E) := by
      simp only [Homography.entryNorm]
      ring

/-- Determinant upper bound visible from the truncated matrix. -/
def Homography.detBound (q : Homography ℂ) : ℝ :=
  ‖q.A‖ * ‖q.D‖ + ‖q.B‖ * ‖q.C‖

theorem Homography.detBound_nonneg (q : Homography ℂ) : 0 ≤ q.detBound := by
  unfold Homography.detBound
  positivity

theorem Homography.norm_det_le (q : Homography ℂ) : ‖q.det‖ ≤ q.detBound := by
  simp only [Homography.det, Homography.detBound]
  calc
    ‖q.A * q.D - q.B * q.C‖ ≤ ‖q.A * q.D‖ + ‖q.B * q.C‖ := norm_sub_le _ _
    _ = ‖q.A‖ * ‖q.D‖ + ‖q.B‖ * ‖q.C‖ := by rw [norm_mul, norm_mul]

/-- Denominator upper bound visible from the truncated matrix on `|z|≤R`. -/
def Homography.denUpper (q : Homography ℂ) (R : ℝ) : ℝ :=
  ‖q.C‖ * R + ‖q.D‖

theorem Homography.denUpper_nonneg (q : Homography ℂ) (R : ℝ) (hR : 0 ≤ R) :
    0 ≤ q.denUpper R :=
  add_nonneg (mul_nonneg (norm_nonneg _) hR) (norm_nonneg _)

theorem Homography.norm_den_le (q : Homography ℂ) (z : ℂ) (R : ℝ)
    (hz : ‖z‖ ≤ R) :
    ‖q.den z‖ ≤ q.denUpper R := by
  simp only [Homography.den, Homography.denUpper]
  calc
    ‖q.C * z + q.D‖ ≤ ‖q.C * z‖ + ‖q.D‖ := norm_add_le _ _
    _ = ‖q.C‖ * ‖z‖ + ‖q.D‖ := by rw [norm_mul]
    _ ≤ ‖q.C‖ * R + ‖q.D‖ := by
      have h := mul_le_mul_of_nonneg_left hz (norm_nonneg q.C)
      linarith

/-! ## Matrix-truncation derivative bound -/

/-- Pointwise derivative-error bound of the induced Möbius map: the exact
matrix `m` versus its first-order truncation `q`, at any `|z|≤R`. -/
theorem Homography.deriv_eval_sub_le
    (m q : Homography ℂ) (z : ℂ) (E R : ℝ)
    (hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub q).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < truncatedMatrixDenMargin q R) :
    ‖m.det / (m.den z) ^ 2 - q.det / (q.den z) ^ 2‖ ≤
      E * (q.entryNorm + 2 * E) /
          (truncatedMatrixDenMargin q R - matrixC1PointTail E R) ^ 2 +
        q.detBound * (matrixC1PointTail E R *
            (2 * q.denUpper R + matrixC1PointTail E R)) /
          ((truncatedMatrixDenMargin q R - matrixC1PointTail E R) ^ 2 *
            (truncatedMatrixDenMargin q R) ^ 2) := by
  let point := matrixC1PointTail E R
  let margin := truncatedMatrixDenMargin q R
  have hEnonneg : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hpoint : 0 ≤ point := by
    dsimp only [point, matrixC1PointTail]
    exact mul_nonneg hEnonneg (by linarith)
  have hmargin0 : 0 < margin := hpoint.trans_lt hmargin
  have hgap : 0 < margin - point := sub_pos.mpr hmargin
  have hqLower : margin ≤ ‖q.den z‖ :=
    truncatedMatrixDenMargin_le q z R hR hz
  have hmLower : margin - point ≤ ‖m.den z‖ :=
    exact_den_margin_of_matrixC1 m q z E R hR hz hE
  have hqne : q.den z ≠ 0 := norm_pos_iff.mp (hmargin0.trans_le hqLower)
  have hmne : m.den z ≠ 0 := norm_pos_iff.mp (hgap.trans_le hmLower)
  have hsplit : m.det / (m.den z) ^ 2 - q.det / (q.den z) ^ 2 =
      (m.det - q.det) / (m.den z) ^ 2 +
        q.det * ((q.den z) ^ 2 - (m.den z) ^ 2) /
          ((m.den z) ^ 2 * (q.den z) ^ 2) := by
    field_simp
    ring
  have hdet : ‖m.det - q.det‖ ≤ E * (q.entryNorm + 2 * E) :=
    m.det_sub_det_le q E hE
  have hdenTail : ‖q.den z - m.den z‖ ≤ point := by
    rw [norm_sub_rev]
    exact m.den_tail_le q z E R hR hz hE
  have hqUpper : ‖q.den z‖ ≤ q.denUpper R := q.norm_den_le z R hz
  have hmUpper : ‖m.den z‖ ≤ q.denUpper R + point := by
    calc
      ‖m.den z‖ = ‖q.den z + (m.den z - q.den z)‖ := by congr 1; ring
      _ ≤ ‖q.den z‖ + ‖m.den z - q.den z‖ := norm_add_le _ _
      _ ≤ q.denUpper R + point := by
        have h := m.den_tail_le q z E R hR hz hE
        linarith
  have hsq : ‖(q.den z) ^ 2 - (m.den z) ^ 2‖ ≤
      point * (2 * q.denUpper R + point) := by
    have hfac : (q.den z) ^ 2 - (m.den z) ^ 2 =
        (q.den z - m.den z) * (q.den z + m.den z) := by ring
    rw [hfac, norm_mul]
    have hsum : ‖q.den z + m.den z‖ ≤ 2 * q.denUpper R + point := by
      calc
        ‖q.den z + m.den z‖ ≤ ‖q.den z‖ + ‖m.den z‖ := norm_add_le _ _
        _ ≤ 2 * q.denUpper R + point := by linarith
    exact mul_le_mul hdenTail hsum (norm_nonneg _) hpoint
  have hmsq : (margin - point) ^ 2 ≤ ‖m.den z‖ ^ 2 := by
    nlinarith [hmLower, hgap]
  have hqsq : margin ^ 2 ≤ ‖q.den z‖ ^ 2 := by
    nlinarith [hqLower, hmargin0]
  have hdet0 : 0 ≤ E * (q.entryNorm + 2 * E) :=
    mul_nonneg hEnonneg (add_nonneg q.entryNorm_nonneg (by linarith))
  have hDu0 : 0 ≤ q.denUpper R := q.denUpper_nonneg R hR
  rw [hsplit]
  calc
    ‖(m.det - q.det) / (m.den z) ^ 2 +
        q.det * ((q.den z) ^ 2 - (m.den z) ^ 2) /
          ((m.den z) ^ 2 * (q.den z) ^ 2)‖ ≤
      ‖(m.det - q.det) / (m.den z) ^ 2‖ +
        ‖q.det * ((q.den z) ^ 2 - (m.den z) ^ 2) /
          ((m.den z) ^ 2 * (q.den z) ^ 2)‖ := norm_add_le _ _
    _ = ‖m.det - q.det‖ / ‖m.den z‖ ^ 2 +
        ‖q.det‖ * ‖(q.den z) ^ 2 - (m.den z) ^ 2‖ /
          (‖m.den z‖ ^ 2 * ‖q.den z‖ ^ 2) := by
      simp only [norm_div, norm_mul, norm_pow]
    _ ≤ E * (q.entryNorm + 2 * E) / (margin - point) ^ 2 +
        q.detBound * (point * (2 * q.denUpper R + point)) /
          ((margin - point) ^ 2 * margin ^ 2) := by
      apply add_le_add
      · exact div_le_div₀ hdet0 hdet (pow_pos hgap 2) hmsq
      · have htop : ‖q.det‖ * ‖(q.den z) ^ 2 - (m.den z) ^ 2‖ ≤
            q.detBound * (point * (2 * q.denUpper R + point)) :=
          mul_le_mul q.norm_det_le hsq (norm_nonneg _) q.detBound_nonneg
        have hbottom : (margin - point) ^ 2 * margin ^ 2 ≤
            ‖m.den z‖ ^ 2 * ‖q.den z‖ ^ 2 :=
          mul_le_mul hmsq hqsq (sq_nonneg margin) (sq_nonneg _)
        exact div_le_div₀
          (mul_nonneg q.detBound_nonneg
            (mul_nonneg hpoint (by linarith)))
          htop (mul_pos (pow_pos hgap 2) (pow_pos hmargin0 2)) hbottom
    _ = E * (q.entryNorm + 2 * E) /
          (truncatedMatrixDenMargin q R - matrixC1PointTail E R) ^ 2 +
        q.detBound * (matrixC1PointTail E R *
            (2 * q.denUpper R + matrixC1PointTail E R)) /
          ((truncatedMatrixDenMargin q R - matrixC1PointTail E R) ^ 2 *
            (truncatedMatrixDenMargin q R) ^ 2) := rfl

/-! ## Uniform-at-build corollary for the derivative -/

/-- Affine-in-`c` entry bound `‖q.X‖ ≤ ‖u‖ + y‖v‖` on `|c|≤y`. -/
private theorem norm_affineEntry_le (u v c : ℂ) (y : ℝ) (hc : ‖c‖ ≤ y) :
    ‖u + c * v‖ ≤ ‖u‖ + y * ‖v‖ := by
  calc
    ‖u + c * v‖ ≤ ‖u‖ + ‖c * v‖ := norm_add_le _ _
    _ = ‖u‖ + ‖c‖ * ‖v‖ := by rw [norm_mul]
    _ ≤ ‖u‖ + y * ‖v‖ := by
      have hmul := mul_le_mul_of_nonneg_right hc (norm_nonneg v)
      linarith

/-- Determinant bound of an affine matrix jet, uniform on `|c|≤y`. -/
def MatrixC1.uniformDetBound (j : MatrixC1 ℂ) (y : ℝ) : ℝ :=
  (‖j.constant.A‖ + y * ‖j.linear.A‖) *
      (‖j.constant.D‖ + y * ‖j.linear.D‖) +
    (‖j.constant.B‖ + y * ‖j.linear.B‖) *
      (‖j.constant.C‖ + y * ‖j.linear.C‖)

theorem MatrixC1.detBound_eval_le (j : MatrixC1 ℂ) (c : ℂ) (y : ℝ)
    (_hy : 0 ≤ y) (hc : ‖c‖ ≤ y) :
    (j.eval c).detBound ≤ j.uniformDetBound y := by
  have hA : ‖(j.eval c).A‖ ≤ ‖j.constant.A‖ + y * ‖j.linear.A‖ := by
    change ‖j.constant.A + c * j.linear.A‖ ≤ _
    exact norm_affineEntry_le _ _ c y hc
  have hB : ‖(j.eval c).B‖ ≤ ‖j.constant.B‖ + y * ‖j.linear.B‖ := by
    change ‖j.constant.B + c * j.linear.B‖ ≤ _
    exact norm_affineEntry_le _ _ c y hc
  have hC : ‖(j.eval c).C‖ ≤ ‖j.constant.C‖ + y * ‖j.linear.C‖ := by
    change ‖j.constant.C + c * j.linear.C‖ ≤ _
    exact norm_affineEntry_le _ _ c y hc
  have hD : ‖(j.eval c).D‖ ≤ ‖j.constant.D‖ + y * ‖j.linear.D‖ := by
    change ‖j.constant.D + c * j.linear.D‖ ≤ _
    exact norm_affineEntry_le _ _ c y hc
  have h1 : ‖(j.eval c).A‖ * ‖(j.eval c).D‖ ≤
      (‖j.constant.A‖ + y * ‖j.linear.A‖) *
        (‖j.constant.D‖ + y * ‖j.linear.D‖) :=
    mul_le_mul hA hD (norm_nonneg _) ((norm_nonneg _).trans hA)
  have h2 : ‖(j.eval c).B‖ * ‖(j.eval c).C‖ ≤
      (‖j.constant.B‖ + y * ‖j.linear.B‖) *
        (‖j.constant.C‖ + y * ‖j.linear.C‖) :=
    mul_le_mul hB hC (norm_nonneg _) ((norm_nonneg _).trans hB)
  unfold Homography.detBound MatrixC1.uniformDetBound
  linarith

/-- Denominator upper bound of an affine matrix jet, uniform on `|c|≤y`
and `|z|≤R`. -/
def MatrixC1.uniformDenUpper (j : MatrixC1 ℂ) (y R : ℝ) : ℝ :=
  (‖j.constant.C‖ + y * ‖j.linear.C‖) * R +
    (‖j.constant.D‖ + y * ‖j.linear.D‖)

theorem MatrixC1.denUpper_eval_le (j : MatrixC1 ℂ) (c : ℂ) (y R : ℝ)
    (_hy : 0 ≤ y) (hR : 0 ≤ R) (hc : ‖c‖ ≤ y) :
    (j.eval c).denUpper R ≤ j.uniformDenUpper y R := by
  have hC : ‖(j.eval c).C‖ ≤ ‖j.constant.C‖ + y * ‖j.linear.C‖ := by
    change ‖j.constant.C + c * j.linear.C‖ ≤ _
    exact norm_affineEntry_le _ _ c y hc
  have hD : ‖(j.eval c).D‖ ≤ ‖j.constant.D‖ + y * ‖j.linear.D‖ := by
    change ‖j.constant.D + c * j.linear.D‖ ≤ _
    exact norm_affineEntry_le _ _ c y hc
  unfold Homography.denUpper MatrixC1.uniformDenUpper
  have hCR := mul_le_mul_of_nonneg_right hC hR
  linarith

/-- Derivative-error majorant expressed through abstract entry-norm,
determinant, denominator-upper, and margin bounds.  This is exactly what
the Rust builder computes in `matc1_deriv_error_log2`. -/
def matrixC1DerivMajorantOf (Nq Dq Du mg E R : ℝ) : ℝ :=
  E * (Nq + 2 * E) / (mg - matrixC1PointTail E R) ^ 2 +
    Dq * (matrixC1PointTail E R * (2 * Du + matrixC1PointTail E R)) /
      ((mg - matrixC1PointTail E R) ^ 2 * mg ^ 2)

/-- The abstract derivative majorant only grows when the upper bounds grow
and the denominator margin shrinks (while staying above the point tail). -/
theorem matrixC1DerivMajorantOf_anti
    (Nq Nq' Dq Dq' Du Du' mg mu E R : ℝ)
    (hE : 0 ≤ E) (hR : 0 ≤ R)
    (hNq : 0 ≤ Nq) (hNqLe : Nq ≤ Nq')
    (hDq : 0 ≤ Dq) (hDqLe : Dq ≤ Dq')
    (hDu : 0 ≤ Du) (hDuLe : Du ≤ Du')
    (hp : matrixC1PointTail E R < mu) (hle : mu ≤ mg) :
    matrixC1DerivMajorantOf Nq Dq Du mg E R ≤
      matrixC1DerivMajorantOf Nq' Dq' Du' mu E R := by
  have hp0 : 0 ≤ matrixC1PointTail E R := by
    simp only [matrixC1PointTail]
    exact mul_nonneg hE (by linarith)
  have hmup : 0 < mu - matrixC1PointTail E R := sub_pos.mpr hp
  have hmgp : 0 < mg - matrixC1PointTail E R := by linarith
  have hmu0 : 0 < mu := hp0.trans_lt hp
  have hmg0 : 0 < mg := hmu0.trans_le hle
  have hsq1 : (mu - matrixC1PointTail E R) ^ 2 ≤
      (mg - matrixC1PointTail E R) ^ 2 := by nlinarith
  have hsq2 : mu ^ 2 ≤ mg ^ 2 := by nlinarith
  unfold matrixC1DerivMajorantOf
  apply add_le_add
  · exact div_le_div₀ (mul_nonneg hE (by linarith))
      (mul_le_mul_of_nonneg_left (by linarith) hE)
      (pow_pos hmup 2) hsq1
  · have hinner : matrixC1PointTail E R *
        (2 * Du + matrixC1PointTail E R) ≤
        matrixC1PointTail E R * (2 * Du' + matrixC1PointTail E R) :=
      mul_le_mul_of_nonneg_left (by linarith) hp0
    have hinner0 : 0 ≤ matrixC1PointTail E R *
        (2 * Du + matrixC1PointTail E R) :=
      mul_nonneg hp0 (by linarith)
    exact div_le_div₀
      (mul_nonneg (hDq.trans hDqLe) (mul_nonneg hp0 (by linarith)))
      (mul_le_mul hDqLe hinner hinner0 (hDq.trans hDqLe))
      (mul_pos (pow_pos hmup 2) (pow_pos hmu0 2))
      (mul_le_mul hsq1 hsq2 (sq_nonneg mu) (sq_nonneg _))

/-- Builder-facing derivative certificate: every hypothesis and the majorant
use only quantities available at table-build time, uniformly in `|c|≤y`. -/
theorem MatrixC1.deriv_error_le_uniform
    (j : MatrixC1 ℂ) (m : Homography ℂ) (c z : ℂ) (E y R : ℝ)
    (hy : 0 ≤ y) (hc : ‖c‖ ≤ y) (hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub (j.eval c)).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < j.uniformDenMargin y R) :
    ‖m.det / (m.den z) ^ 2 -
        (j.eval c).det / ((j.eval c).den z) ^ 2‖ ≤
      matrixC1DerivMajorantOf (j.evalNormBound y) (j.uniformDetBound y)
        (j.uniformDenUpper y R) (j.uniformDenMargin y R) E R := by
  have hE0 : 0 ≤ E := (m.sub (j.eval c)).entryNorm_nonneg.trans hE
  have hmarginActual : matrixC1PointTail E R <
      truncatedMatrixDenMargin (j.eval c) R :=
    hmargin.trans_le (j.uniformDenMargin_le c y R hy hR hc)
  have h := Homography.deriv_eval_sub_le m (j.eval c) z E R hR hz hE
    hmarginActual
  refine h.trans (matrixC1DerivMajorantOf_anti
    (j.eval c).entryNorm (j.evalNormBound y)
    (j.eval c).detBound (j.uniformDetBound y)
    ((j.eval c).denUpper R) (j.uniformDenUpper y R)
    (truncatedMatrixDenMargin (j.eval c) R) (j.uniformDenMargin y R) E R
    hE0 hR (j.eval c).entryNorm_nonneg (j.entryNorm_eval_le c y hy hc)
    (j.eval c).detBound_nonneg (j.detBound_eval_le c y hy hc)
    ((j.eval c).denUpper_nonneg R hR) (j.denUpper_eval_le c y R hy hR hc)
    hmargin (j.uniformDenMargin_le c y R hy hR hc))

/-! ## Shadowing-derivative building blocks -/

/-- Derivative of the exact step `w ↦ a w + w² + c` in `w`. -/
theorem hasDerivAt_exactStep (a w c : ℂ) :
    HasDerivAt (fun w' => exactStep a w' c) (a + 2 * w) w := by
  have h1 : HasDerivAt (fun w' : ℂ => a * w') a w := hasDerivAt_const_mul a
  have h2 : HasDerivAt (fun w' : ℂ => w' ^ 2) (2 * w) w := by
    simpa using hasDerivAt_pow 2 w
  have h : HasDerivAt (fun w' : ℂ => a * w' + w' ^ 2 + c) (a + 2 * w) w :=
    (h1.add h2).add_const c
  exact h

/-- Norm bound of the exact-step derivative on `|w|≤r`. -/
theorem norm_exactStep_deriv_le (a w : ℂ) (r : ℝ) (hw : ‖w‖ ≤ r) :
    ‖a + 2 * w‖ ≤ ‖a‖ + 2 * r := by
  calc
    ‖a + 2 * w‖ ≤ ‖a‖ + ‖2 * w‖ := norm_add_le _ _
    _ = ‖a‖ + 2 * ‖w‖ := by rw [norm_mul, Complex.norm_ofNat]
    _ ≤ ‖a‖ + 2 * r := by linarith

/-- Derivative of the Padé seed `w ↦ a(aw+c)/(a-w)` in `w`.  Its numerator
`a(a²+c)` is the determinant of the one-step Padé matrix. -/
theorem hasDerivAt_padeSeed (a w c : ℂ) (h : a - w ≠ 0) :
    HasDerivAt (fun w' => padeSeed a w' c)
      (a * (a ^ 2 + c) / (a - w) ^ 2) w := by
  have hnum : HasDerivAt (fun w' : ℂ => a * (a * w' + c)) (a * a) w := by
    have h1 : HasDerivAt (fun w' : ℂ => a * w' + c) a w :=
      (hasDerivAt_const_mul a).add_const c
    simpa using h1.const_mul a
  have hden : HasDerivAt (fun w' : ℂ => a - w') (-1) w := by
    simpa using (hasDerivAt_id w).const_sub a
  have hdiv : HasDerivAt (fun w' : ℂ => a * (a * w' + c) / (a - w'))
      ((a * a * (a - w) - a * (a * w + c) * (-1)) / (a - w) ^ 2) w :=
    hnum.fun_div hden h
  have heq : (a * a * (a - w) - a * (a * w + c) * (-1)) / (a - w) ^ 2 =
      a * (a ^ 2 + c) / (a - w) ^ 2 := by
    congr 1
    ring
  rw [heq] at hdiv
  exact hdiv

/-- Difference between the Padé-seed derivative and the exact-step
derivative, bounded by orbit envelopes. -/
theorem norm_deriv_seed_sub_step_le (a w c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (hw : ‖w‖ ≤ r) (hc : ‖c‖ ≤ y)
    (hloc : 0 < ‖a‖ - r) :
    ‖a * (a ^ 2 + c) / (a - w) ^ 2 - (a + 2 * w)‖ ≤
      ((3 * r ^ 2 + y) * (‖a‖ + r) + r * (r ^ 2 + y)) / (‖a‖ - r) ^ 2 := by
  have hden_lower : ‖a‖ - r ≤ ‖a - w‖ := by
    have h := norm_sub_norm_le a w
    linarith
  have hane : a - w ≠ 0 := norm_pos_iff.mp (hloc.trans_le hden_lower)
  have hiden : a * (a ^ 2 + c) / (a - w) ^ 2 - (a + 2 * w) =
      ((3 * w ^ 2 + c) * (a - w) + w * (w ^ 2 + c)) / (a - w) ^ 2 := by
    field_simp
    ring
  have h1 : ‖3 * w ^ 2 + c‖ ≤ 3 * r ^ 2 + y := by
    calc
      ‖3 * w ^ 2 + c‖ ≤ ‖3 * w ^ 2‖ + ‖c‖ := norm_add_le _ _
      _ = 3 * ‖w‖ ^ 2 + ‖c‖ := by
        rw [norm_mul, norm_pow, Complex.norm_ofNat]
      _ ≤ 3 * r ^ 2 + y := by nlinarith [norm_nonneg w]
  have h2 : ‖a - w‖ ≤ ‖a‖ + r := by
    calc
      ‖a - w‖ ≤ ‖a‖ + ‖w‖ := norm_sub_le _ _
      _ ≤ ‖a‖ + r := by linarith
  have h3 : ‖w * (w ^ 2 + c)‖ ≤ r * (r ^ 2 + y) := by
    rw [norm_mul]
    refine mul_le_mul hw ?_ (norm_nonneg _) hr
    calc
      ‖w ^ 2 + c‖ ≤ ‖w ^ 2‖ + ‖c‖ := norm_add_le _ _
      _ = ‖w‖ ^ 2 + ‖c‖ := by rw [norm_pow]
      _ ≤ r ^ 2 + y := by nlinarith [norm_nonneg w]
  have hnum : ‖(3 * w ^ 2 + c) * (a - w) + w * (w ^ 2 + c)‖ ≤
      (3 * r ^ 2 + y) * (‖a‖ + r) + r * (r ^ 2 + y) := by
    have hprod : ‖(3 * w ^ 2 + c) * (a - w)‖ ≤
        (3 * r ^ 2 + y) * (‖a‖ + r) := by
      rw [norm_mul]
      exact mul_le_mul h1 h2 (norm_nonneg _)
        (add_nonneg (by positivity) hy)
    calc
      ‖(3 * w ^ 2 + c) * (a - w) + w * (w ^ 2 + c)‖ ≤
          ‖(3 * w ^ 2 + c) * (a - w)‖ + ‖w * (w ^ 2 + c)‖ :=
        norm_add_le _ _
      _ ≤ (3 * r ^ 2 + y) * (‖a‖ + r) + r * (r ^ 2 + y) :=
        add_le_add hprod h3
  have hnn : 0 ≤ (3 * r ^ 2 + y) * (‖a‖ + r) + r * (r ^ 2 + y) :=
    add_nonneg
      (mul_nonneg (add_nonneg (by positivity) hy)
        (add_nonneg (norm_nonneg a) hr))
      (mul_nonneg hr (add_nonneg (sq_nonneg r) hy))
  rw [hiden, norm_div, norm_pow]
  exact div_le_div₀ hnn hnum (pow_pos hloc 2)
    (by nlinarith [hden_lower, hloc])

/-- Two-point difference of the derivative of a homography, transported by
denominator margins and upper bounds at the two points. -/
theorem Homography.deriv_eval_two_point_le (t : Homography ℂ) (u v : ℂ)
    (mu mv du dv : ℝ)
    (hmu : 0 < mu) (hmv : 0 < mv)
    (hu : mu ≤ ‖t.den u‖) (hv : mv ≤ ‖t.den v‖)
    (hdu : ‖t.den u‖ ≤ du) (hdv : ‖t.den v‖ ≤ dv) :
    ‖t.det / (t.den u) ^ 2 - t.det / (t.den v) ^ 2‖ ≤
      ‖t.det‖ * (‖t.C‖ * ‖u - v‖ * (du + dv)) / (mu ^ 2 * mv ^ 2) := by
  have hune : t.den u ≠ 0 := norm_pos_iff.mp (hmu.trans_le hu)
  have hvne : t.den v ≠ 0 := norm_pos_iff.mp (hmv.trans_le hv)
  have hsplit : t.det / (t.den u) ^ 2 - t.det / (t.den v) ^ 2 =
      t.det * ((t.den v) ^ 2 - (t.den u) ^ 2) /
        ((t.den u) ^ 2 * (t.den v) ^ 2) := by
    field_simp
  have hdiff : ‖(t.den v) ^ 2 - (t.den u) ^ 2‖ ≤
      ‖t.C‖ * ‖u - v‖ * (du + dv) := by
    have hfac : (t.den v) ^ 2 - (t.den u) ^ 2 =
        t.C * (v - u) * (t.den v + t.den u) := by
      simp only [Homography.den]
      ring
    rw [hfac, norm_mul, norm_mul, norm_sub_rev v u]
    have hsum : ‖t.den v + t.den u‖ ≤ du + dv := by
      calc
        ‖t.den v + t.den u‖ ≤ ‖t.den v‖ + ‖t.den u‖ := norm_add_le _ _
        _ ≤ du + dv := by linarith
    exact mul_le_mul_of_nonneg_left hsum
      (mul_nonneg (norm_nonneg _) (norm_nonneg _))
  have hdudv : 0 ≤ du + dv := by
    have h1 := norm_nonneg (t.den u)
    have h2 := norm_nonneg (t.den v)
    linarith
  rw [hsplit]
  calc
    ‖t.det * ((t.den v) ^ 2 - (t.den u) ^ 2) /
        ((t.den u) ^ 2 * (t.den v) ^ 2)‖ =
      ‖t.det‖ * ‖(t.den v) ^ 2 - (t.den u) ^ 2‖ /
        (‖t.den u‖ ^ 2 * ‖t.den v‖ ^ 2) := by
      simp only [norm_div, norm_mul, norm_pow]
    _ ≤ ‖t.det‖ * (‖t.C‖ * ‖u - v‖ * (du + dv)) / (mu ^ 2 * mv ^ 2) := by
      have husq : mu ^ 2 ≤ ‖t.den u‖ ^ 2 := by nlinarith
      have hvsq : mv ^ 2 ≤ ‖t.den v‖ ^ 2 := by nlinarith
      exact div_le_div₀
        (mul_nonneg (norm_nonneg _)
          (mul_nonneg (mul_nonneg (norm_nonneg _) (norm_nonneg _)) hdudv))
        (mul_le_mul_of_nonneg_left hdiff (norm_nonneg _))
        (mul_pos (pow_pos hmu 2) (pow_pos hmv 2))
        (mul_le_mul husq hvsq (sq_nonneg mv) (sq_nonneg _))

/-- Derivative of the tail-transported difference of two differentiable
inner orbits. -/
theorem Homography.hasDerivAt_eval_sub_comp
    (t : Homography ℂ) (u v : ℂ → ℂ) (u' v' w : ℂ)
    (hu : HasDerivAt u u' w) (hv : HasDerivAt v v' w)
    (hdu : t.den (u w) ≠ 0) (hdv : t.den (v w) ≠ 0) :
    HasDerivAt (fun x => t.eval (u x) - t.eval (v x))
      (t.det / (t.den (u w)) ^ 2 * u' -
        t.det / (t.den (v w)) ^ 2 * v') w := by
  have h1 : HasDerivAt (fun x => t.eval (u x))
      (t.det / (t.den (u w)) ^ 2 * u') w :=
    (t.hasDerivAt_eval (u w) hdu).comp w hu
  have h2 : HasDerivAt (fun x => t.eval (v x))
      (t.det / (t.den (v w)) ^ 2 * v') w :=
    (t.hasDerivAt_eval (v w) hdv).comp w hv
  exact h1.sub h2

/-- Norm bound for the derivative of the tail-transported difference,
splitting into a common-factor part and a two-point transport part. -/
theorem Homography.norm_deriv_eval_sub_comp_le
    (t : Homography ℂ) (uw vw u' v' : ℂ) (mu mv du dv : ℝ)
    (hmu : 0 < mu) (hmv : 0 < mv)
    (hu : mu ≤ ‖t.den uw‖) (hv : mv ≤ ‖t.den vw‖)
    (hdu : ‖t.den uw‖ ≤ du) (hdv : ‖t.den vw‖ ≤ dv) :
    ‖t.det / (t.den uw) ^ 2 * u' - t.det / (t.den vw) ^ 2 * v'‖ ≤
      ‖t.det‖ * ‖u' - v'‖ / mu ^ 2 +
        ‖t.det‖ * (‖t.C‖ * ‖uw - vw‖ * (du + dv)) / (mu ^ 2 * mv ^ 2) *
          ‖v'‖ := by
  have hsplit : t.det / (t.den uw) ^ 2 * u' -
      t.det / (t.den vw) ^ 2 * v' =
      t.det / (t.den uw) ^ 2 * (u' - v') +
        (t.det / (t.den uw) ^ 2 - t.det / (t.den vw) ^ 2) * v' := by
    ring
  have husq : mu ^ 2 ≤ ‖t.den uw‖ ^ 2 := by nlinarith
  have h1 : ‖t.det / (t.den uw) ^ 2 * (u' - v')‖ ≤
      ‖t.det‖ * ‖u' - v'‖ / mu ^ 2 := by
    rw [norm_mul, norm_div, norm_pow, div_mul_eq_mul_div]
    exact div_le_div₀ (mul_nonneg (norm_nonneg _) (norm_nonneg _))
      le_rfl (pow_pos hmu 2) husq
  have h2 : ‖(t.det / (t.den uw) ^ 2 - t.det / (t.den vw) ^ 2) * v'‖ ≤
      ‖t.det‖ * (‖t.C‖ * ‖uw - vw‖ * (du + dv)) / (mu ^ 2 * mv ^ 2) *
        ‖v'‖ := by
    rw [norm_mul]
    exact mul_le_mul_of_nonneg_right
      (t.deriv_eval_two_point_le uw vw mu mv du dv hmu hmv hu hv hdu hdv)
      (norm_nonneg v')
  rw [hsplit]
  exact (norm_add_le _ _).trans (add_le_add h1 h2)

/-! ## End-to-end non-autonomous derivative shadowing -/

/-- Algebraic chain rule for the derivative value of two homographies. -/
theorem Homography.deriv_comp_eq_mul
    (outer inner : Homography ℂ) (z : ℂ)
    (hinner : inner.den z ≠ 0)
    (houter : outer.den (inner.eval z) ≠ 0) :
    (outer.comp inner).det / ((outer.comp inner).den z) ^ 2 =
      (outer.det / (outer.den (inner.eval z)) ^ 2) *
        (inner.det / (inner.den z) ^ 2) := by
  rw [Homography.det_comp, Homography.den_comp outer inner z hinner]
  field_simp

/-- Value defect of one Padé seed, with only scalar envelope data. -/
def padeLocalValueDefectBound (a : ℂ) (r y : ℝ) : ℝ :=
  r * (r ^ 2 + y) / (‖a‖ - r)

/-- Derivative defect of one Padé seed, with only scalar envelope data. -/
def padeLocalDerivativeDefectBound (a : ℂ) (r y : ℝ) : ℝ :=
  ((3 * r ^ 2 + y) * (‖a‖ + r) + r * (r ^ 2 + y)) / (‖a‖ - r) ^ 2

theorem norm_padeSeed_sub_exactStep_le_local
    (a z c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y)
    (hloc : 0 < ‖a‖ - r) :
    ‖padeSeed a z c - exactStep a z c‖ ≤ padeLocalValueDefectBound a r y := by
  have hdenLower : ‖a‖ - r ≤ ‖a - z‖ := by
    have h := norm_sub_norm_le a z
    linarith
  have hden : a - z ≠ 0 := norm_pos_iff.mp (hloc.trans_le hdenLower)
  have hnum : ‖z * (z ^ 2 + c)‖ ≤ r * (r ^ 2 + y) := by
    rw [norm_mul]
    apply mul_le_mul hz
    · calc
        ‖z ^ 2 + c‖ ≤ ‖z ^ 2‖ + ‖c‖ := norm_add_le _ _
        _ = ‖z‖ ^ 2 + ‖c‖ := by rw [norm_pow]
        _ ≤ r ^ 2 + y := by nlinarith [norm_nonneg z]
    · exact norm_nonneg _
    · exact hr
  rw [padeSeed_sub_exactStep a z c hden, norm_div]
  exact div_le_div₀ (mul_nonneg hr (add_nonneg (sq_nonneg r) hy))
    hnum hloc hdenLower

/-- Upper denominator bounds paired with the already existing lower margins. -/
def padeTailDenUpper (tail : Homography ℂ) (a : ℂ) (r y : ℝ) : ℝ :=
  tail.denUpper (padeStepOutputBound a r y)

def exactTailDenUpper (tail : Homography ℂ) (a : ℂ) (r y : ℝ) : ℝ :=
  tail.denUpper (exactStepOutputBound a r y)

/-- Builder-computable derivative contribution of one transported local
defect. `chain` is the derivative envelope accumulated before this step. -/
def nonautonomousDerivativeTransportMajorant
    (tail : Homography ℂ) (a : ℂ) (r y chain : ℝ) : ℝ :=
  ‖tail.det‖ * (padeLocalDerivativeDefectBound a r y * chain) /
      padeTailDenMargin tail a r y ^ 2 +
    ‖tail.det‖ *
        (‖tail.C‖ * padeLocalValueDefectBound a r y *
          (padeTailDenUpper tail a r y + exactTailDenUpper tail a r y)) /
        (padeTailDenMargin tail a r y ^ 2 *
          exactTailDenMargin tail a r y ^ 2) *
      ((‖a‖ + 2 * r) * chain)

/-- One local derivative defect transported by the remaining homographic
tail.  This is the two-term formula implemented by
`matc1_deriv_error_log2`: derivative mismatch plus displaced-denominator
mismatch. -/
theorem norm_transported_pade_derivative_defect_le
    (tail : Homography ℂ) (a z c d : ℂ) (r y chain : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (_hchain : 0 ≤ chain)
    (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y) (hd : ‖d‖ ≤ chain)
    (hloc : 0 < ‖a‖ - r)
    (hpade : 0 < padeTailDenMargin tail a r y)
    (hexact : 0 < exactTailDenMargin tail a r y) :
    ‖tail.det / (tail.den (padeSeed a z c)) ^ 2 *
          (a * (a ^ 2 + c) / (a - z) ^ 2 * d) -
        tail.det / (tail.den (exactStep a z c)) ^ 2 *
          ((a + 2 * z) * d)‖ ≤
      nonautonomousDerivativeTransportMajorant tail a r y chain := by
  have hpadeOut : ‖padeSeed a z c‖ ≤ padeStepOutputBound a r y :=
    norm_padeSeed_le_outputBound a z c r y hr hy hz hc hloc
  have hexactOut : ‖exactStep a z c‖ ≤ exactStepOutputBound a r y :=
    exactStep_norm_le a z c r y hz hc
  have hpadeRadius : 0 ≤ padeStepOutputBound a r y := by
    unfold padeStepOutputBound
    exact div_nonneg
      (mul_nonneg (norm_nonneg a)
        (add_nonneg (mul_nonneg (norm_nonneg a) hr) hy)) hloc.le
  have hexactRadius : 0 ≤ exactStepOutputBound a r y := by
    unfold exactStepOutputBound
    positivity
  have hpadeLower := padeTailDenMargin_le tail a z c r y hr hy hz hc hloc
  have hexactLower := exactTailDenMargin_le tail a z c r y hr hz hc
  have hpadeUpper : ‖tail.den (padeSeed a z c)‖ ≤ padeTailDenUpper tail a r y := by
    exact tail.norm_den_le _ _ hpadeOut
  have hexactUpper : ‖tail.den (exactStep a z c)‖ ≤ exactTailDenUpper tail a r y := by
    exact tail.norm_den_le _ _ hexactOut
  have hbase := tail.norm_deriv_eval_sub_comp_le
    (padeSeed a z c) (exactStep a z c)
    (a * (a ^ 2 + c) / (a - z) ^ 2 * d) ((a + 2 * z) * d)
    (padeTailDenMargin tail a r y) (exactTailDenMargin tail a r y)
    (padeTailDenUpper tail a r y) (exactTailDenUpper tail a r y)
    hpade hexact hpadeLower hexactLower hpadeUpper hexactUpper
  have hlocalDeriv :
      ‖a * (a ^ 2 + c) / (a - z) ^ 2 - (a + 2 * z)‖ ≤
        padeLocalDerivativeDefectBound a r y := by
    exact norm_deriv_seed_sub_step_le a z c r y hr hy hz hc hloc
  have hderivDiff :
      ‖a * (a ^ 2 + c) / (a - z) ^ 2 * d - (a + 2 * z) * d‖ ≤
        padeLocalDerivativeDefectBound a r y * chain := by
    rw [← sub_mul, norm_mul]
    exact mul_le_mul hlocalDeriv hd (norm_nonneg _)
      ((norm_nonneg _).trans hlocalDeriv)
  have hvalue := norm_padeSeed_sub_exactStep_le_local
    a z c r y hr hy hz hc hloc
  have hexactDeriv : ‖(a + 2 * z) * d‖ ≤ (‖a‖ + 2 * r) * chain := by
    rw [norm_mul]
    exact mul_le_mul (norm_exactStep_deriv_le a z r hz) hd
      (norm_nonneg _) (add_nonneg (norm_nonneg _) (by positivity))
  have hdu0 : 0 ≤ padeTailDenUpper tail a r y :=
    tail.denUpper_nonneg _ hpadeRadius
  have hdv0 : 0 ≤ exactTailDenUpper tail a r y :=
    tail.denUpper_nonneg _ hexactRadius
  have hlocalValue0 : 0 ≤ padeLocalValueDefectBound a r y := by
    unfold padeLocalValueDefectBound
    positivity
  have hlocalDeriv0 : 0 ≤ padeLocalDerivativeDefectBound a r y := by
    unfold padeLocalDerivativeDefectBound
    positivity
  refine hbase.trans (add_le_add ?_ ?_)
  · exact div_le_div_of_nonneg_right
      (mul_le_mul_of_nonneg_left hderivDiff (norm_nonneg _))
      (sq_nonneg _)
  · have hinner : ‖tail.C‖ * ‖padeSeed a z c - exactStep a z c‖ *
        (padeTailDenUpper tail a r y + exactTailDenUpper tail a r y) ≤
      ‖tail.C‖ * padeLocalValueDefectBound a r y *
        (padeTailDenUpper tail a r y + exactTailDenUpper tail a r y) := by
      exact mul_le_mul_of_nonneg_right
        (mul_le_mul_of_nonneg_left hvalue (norm_nonneg tail.C))
        (add_nonneg hdu0 hdv0)
    have hfrac :
        ‖tail.det‖ *
            (‖tail.C‖ * ‖padeSeed a z c - exactStep a z c‖ *
              (padeTailDenUpper tail a r y + exactTailDenUpper tail a r y)) /
              (padeTailDenMargin tail a r y ^ 2 *
                exactTailDenMargin tail a r y ^ 2) ≤
          ‖tail.det‖ *
            (‖tail.C‖ * padeLocalValueDefectBound a r y *
              (padeTailDenUpper tail a r y + exactTailDenUpper tail a r y)) /
              (padeTailDenMargin tail a r y ^ 2 *
                exactTailDenMargin tail a r y ^ 2) := by
      exact div_le_div_of_nonneg_right
        (mul_le_mul_of_nonneg_left hinner (norm_nonneg _)) (by positivity)
    exact mul_le_mul hfrac hexactDeriv (norm_nonneg _)
      (div_nonneg
        (mul_nonneg (norm_nonneg _)
          (mul_nonneg (mul_nonneg (norm_nonneg _) hlocalValue0)
            (add_nonneg hdu0 hdv0))) (by positivity))

/-- Chain-rule envelope of the exact orbit derivative before step `n`. -/
def exactDerivativeEnvelope (a : ℕ → ℂ) (r : ℕ → ℝ) (n : ℕ) : ℝ :=
  ∏ j ∈ Finset.range n, (‖a j‖ + 2 * r j)

theorem exactDerivativeEnvelope_nonneg
    (a : ℕ → ℂ) (r : ℕ → ℝ) (n : ℕ)
    (hr : ∀ j, j < n → 0 ≤ r j) :
    0 ≤ exactDerivativeEnvelope a r n := by
  unfold exactDerivativeEnvelope
  apply Finset.prod_nonneg
  intro j hj
  have hjn : j < n := Finset.mem_range.mp hj
  exact add_nonneg (norm_nonneg _) (mul_nonneg (by norm_num) (hr j hjn))

theorem exactDerivativeEnvelope_encloses
    (a : ℕ → ℂ) (x d : ℕ → ℂ) (r : ℕ → ℝ) (n : ℕ)
    (hr : ∀ j, j < n → 0 ≤ r j)
    (hx : ∀ j, j < n → ‖x j‖ ≤ r j)
    (hd0 : ‖d 0‖ ≤ 1)
    (hdstep : ∀ j, d (j + 1) = (a j + 2 * x j) * d j) :
    ‖d n‖ ≤ exactDerivativeEnvelope a r n := by
  induction n with
  | zero => simpa [exactDerivativeEnvelope] using hd0
  | succ n ih =>
      rw [hdstep n, norm_mul, exactDerivativeEnvelope, Finset.prod_range_succ]
      have hfactor := norm_exactStep_deriv_le (a n) (x n) (r n) (hx n (by omega))
      have ih' := ih (fun j hj => hr j (by omega)) (fun j hj => hx j (by omega))
      have henv0 := exactDerivativeEnvelope_nonneg a r n
        (fun j hj => hr j (by omega))
      have hfactor0 : 0 ≤ ‖a n‖ + 2 * r n :=
        add_nonneg (norm_nonneg _) (mul_nonneg (by norm_num) (hr n (by omega)))
      calc
        ‖a n + 2 * x n‖ * ‖d n‖ ≤
            (‖a n‖ + 2 * r n) * exactDerivativeEnvelope a r n :=
          mul_le_mul hfactor ih' (norm_nonneg _) hfactor0
        _ = exactDerivativeEnvelope a r n * (‖a n‖ + 2 * r n) := by ring

/-- Sum of every derivative defect after exact transport through its suffix. -/
def nonautonomousPadeDerivativeMajorant
    (tail : ℕ → Homography ℂ) (a : ℕ → ℂ)
    (r : ℕ → ℝ) (y : ℝ) (n : ℕ) : ℝ :=
  ∑ j ∈ Finset.range n,
    nonautonomousDerivativeTransportMajorant
      (tail (j + 1)) (a j) (r j) y (exactDerivativeEnvelope a r j)

/-- End-to-end derivative shadowing theorem for the exact non-autonomous
Mandelbrot perturbation orbit and the exact product of one-step Padé maps. -/
theorem nonautonomous_pade_derivative_shadowing_bound
    (tail : ℕ → Homography ℂ) (a : ℕ → ℂ) (c : ℂ)
    (x d : ℕ → ℂ) (r : ℕ → ℝ) (y : ℝ) (n : ℕ)
    (htail : IsPadeTail tail a c n)
    (hstep : ∀ j, x (j + 1) = exactStep (a j) (x j) c)
    (hd0 : d 0 = 1)
    (hdstep : ∀ j, d (j + 1) = (a j + 2 * x j) * d j)
    (hr : ∀ j, j < n → 0 ≤ r j) (hy : 0 ≤ y) (hc : ‖c‖ ≤ y)
    (hx : ∀ j, j < n → ‖x j‖ ≤ r j)
    (hloc : ∀ j, j < n → 0 < ‖a j‖ - r j)
    (hpade : ∀ j, j < n →
      0 < padeTailDenMargin (tail (j + 1)) (a j) (r j) y)
    (hexact : ∀ j, j < n →
      0 < exactTailDenMargin (tail (j + 1)) (a j) (r j) y) :
    ‖(tail 0).det / ((tail 0).den (x 0)) ^ 2 - d n‖ ≤
      nonautonomousPadeDerivativeMajorant tail a r y n := by
  let H : ℕ → ℂ := fun j =>
    (tail j).det / ((tail j).den (x j)) ^ 2 * d j
  have hlocNe : ∀ j, j < n → a j - x j ≠ 0 := by
    intro j hj
    apply norm_pos_iff.mp
    have hreverse := norm_sub_norm_le (a j) (x j)
    exact (hloc j hj).trans_le ((sub_le_sub_left (hx j hj) ‖a j‖).trans hreverse)
  have hpadeNe : ∀ j, j < n →
      (tail (j + 1)).den (padeSeed (a j) (x j) c) ≠ 0 := by
    intro j hj
    apply norm_pos_iff.mp
    exact (hpade j hj).trans_le
      (padeTailDenMargin_le (tail (j + 1)) (a j) (x j) c (r j) y
        (hr j hj) hy (hx j hj) hc (hloc j hj))
  have hexactNe : ∀ j, j < n →
      (tail (j + 1)).den (exactStep (a j) (x j) c) ≠ 0 := by
    intro j hj
    apply norm_pos_iff.mp
    exact (hexact j hj).trans_le
      (exactTailDenMargin_le (tail (j + 1)) (a j) (x j) c (r j) y
        (hr j hj) (hx j hj) hc)
  have hHn : H n = d n := by
    dsimp only [H]
    rw [htail.1]
    simp [Homography.det, Homography.den, Homography.one]
  have hlocal : ∀ j, j < n →
      ‖H j - H (j + 1)‖ ≤
        nonautonomousDerivativeTransportMajorant
          (tail (j + 1)) (a j) (r j) y (exactDerivativeEnvelope a r j) := by
    intro j hj
    have hchain := exactDerivativeEnvelope_encloses a x d r j
      (fun k hk => hr k (by omega)) (fun k hk => hx k (by omega))
      (by simp [hd0]) hdstep
    have hchain0 := exactDerivativeEnvelope_nonneg a r j
      (fun k hk => hr k (by omega))
    have hcomp := Homography.deriv_comp_eq_mul
      (tail (j + 1)) (padeStepHomography (a j) c) (x j)
      (by simpa [padeStepHomography_den] using hlocNe j hj)
      (by simpa [padeStepHomography_eval] using hpadeNe j hj)
    have hHj : H j =
        (tail (j + 1)).det /
            ((tail (j + 1)).den (padeSeed (a j) (x j) c)) ^ 2 *
          (a j * ((a j) ^ 2 + c) / (a j - x j) ^ 2 * d j) := by
      dsimp only [H]
      rw [htail.2 j hj, hcomp, padeStepHomography_det,
        padeStepHomography_den, padeStepHomography_eval]
      ring
    have hHnext : H (j + 1) =
        (tail (j + 1)).det /
            ((tail (j + 1)).den (exactStep (a j) (x j) c)) ^ 2 *
          ((a j + 2 * x j) * d j) := by
      dsimp only [H]
      rw [hstep j, hdstep j]
    rw [hHj, hHnext]
    exact norm_transported_pade_derivative_defect_le
      (tail (j + 1)) (a j) (x j) c (d j) (r j) y
      (exactDerivativeEnvelope a r j)
      (hr j hj) hy hchain0 (hx j hj) hc hchain
      (hloc j hj) (hpade j hj) (hexact j hj)
  have htelescope : H 0 - H n = ∑ j ∈ Finset.range n, (H j - H (j + 1)) := by
    symm
    exact Finset.sum_range_sub' H n
  have hH0 : H 0 = (tail 0).det / ((tail 0).den (x 0)) ^ 2 := by
    dsimp only [H]
    rw [hd0, mul_one]
  rw [← hH0, ← hHn, htelescope]
  calc
    ‖∑ j ∈ Finset.range n, (H j - H (j + 1))‖ ≤
        ∑ j ∈ Finset.range n, ‖H j - H (j + 1)‖ := norm_sum_le _ _
    _ ≤ ∑ j ∈ Finset.range n,
        nonautonomousDerivativeTransportMajorant
          (tail (j + 1)) (a j) (r j) y (exactDerivativeEnvelope a r j) := by
      apply Finset.sum_le_sum
      intro j hj
      exact hlocal j (Finset.mem_range.mp hj)
    _ = nonautonomousPadeDerivativeMajorant tail a r y n := rfl

/-! ## Complete matrix-c1 derivative certificate -/

/-- Final direct-derivative certificate.  It adds the exact Padé-versus-
Mandelbrot derivative shadowing error to the affine-in-`c` matrix truncation
error, without any Cauchy enlargement of the input disk. -/
theorem matrixC1_nonautonomous_total_derivative_error
    (a : ℕ → ℂ) (c : ℂ) (x d : ℕ → ℂ) (r : ℕ → ℝ)
    (y R : ℝ) (n : ℕ)
    (hstep : ∀ j, x (j + 1) = exactStep (a j) (x j) c)
    (hd0 : d 0 = 1)
    (hdstep : ∀ j, d (j + 1) = (a j + 2 * x j) * d j)
    (hr : ∀ j, j < n → 0 ≤ r j) (hy : 0 ≤ y) (hc : ‖c‖ ≤ y)
    (hx : ∀ j, j < n → ‖x j‖ ≤ r j)
    (hloc : ∀ j, j < n → 0 < ‖a j‖ - r j)
    (hpade : ∀ j, j < n →
      0 < padeTailDenMargin
        (canonicalPadeTail a c n (j + 1)) (a j) (r j) y)
    (hexact : ∀ j, j < n →
      0 < exactTailDenMargin
        (canonicalPadeTail a c n (j + 1)) (a j) (r j) y)
    (hR : 0 ≤ R) (hx0 : ‖x 0‖ ≤ R)
    (hmatrixMargin :
      matrixC1PointTail (padeMatrixC1TailBound a 0 y n) R <
        (padeMatrixC1Segment a 0 n).uniformDenMargin y R) :
    ‖((padeMatrixC1Segment a 0 n).eval c).det /
          (((padeMatrixC1Segment a 0 n).eval c).den (x 0)) ^ 2 - d n‖ ≤
      nonautonomousPadeDerivativeMajorant (canonicalPadeTail a c n) a r y n +
        matrixC1DerivMajorantOf
          ((padeMatrixC1Segment a 0 n).evalNormBound y)
          ((padeMatrixC1Segment a 0 n).uniformDetBound y)
          ((padeMatrixC1Segment a 0 n).uniformDenUpper y R)
          ((padeMatrixC1Segment a 0 n).uniformDenMargin y R)
          (padeMatrixC1TailBound a 0 y n) R := by
  let tail := canonicalPadeTail a c n
  let j := padeMatrixC1Segment a 0 n
  let q := j.eval c
  let E := padeMatrixC1TailBound a 0 y n
  have hshadow :
      ‖(tail 0).det / ((tail 0).den (x 0)) ^ 2 - d n‖ ≤
        nonautonomousPadeDerivativeMajorant tail a r y n := by
    exact nonautonomous_pade_derivative_shadowing_bound tail a c x d r y n
      (canonicalPadeTail_isPadeTail a c n) hstep hd0 hdstep hr hy hc hx
      hloc hpade hexact
  have hmatrix : ((tail 0).sub q).entryNorm ≤ E := by
    dsimp only [tail, q, j, E, canonicalPadeTail]
    simpa using padeMatrixC1_tail_le a c 0 n y hy hc
  have htrunc :
      ‖(tail 0).det / ((tail 0).den (x 0)) ^ 2 -
          q.det / (q.den (x 0)) ^ 2‖ ≤
        matrixC1DerivMajorantOf (j.evalNormBound y) (j.uniformDetBound y)
          (j.uniformDenUpper y R) (j.uniformDenMargin y R) E R := by
    exact j.deriv_error_le_uniform (tail 0) c (x 0) E y R
      hy hc hR hx0 hmatrix hmatrixMargin
  change ‖q.det / (q.den (x 0)) ^ 2 - d n‖ ≤ _
  calc
    ‖q.det / (q.den (x 0)) ^ 2 - d n‖ =
        ‖(q.det / (q.den (x 0)) ^ 2 -
            (tail 0).det / ((tail 0).den (x 0)) ^ 2) +
          ((tail 0).det / ((tail 0).den (x 0)) ^ 2 - d n)‖ := by
      congr 1
      ring
    _ ≤ ‖q.det / (q.den (x 0)) ^ 2 -
          (tail 0).det / ((tail 0).den (x 0)) ^ 2‖ +
        ‖(tail 0).det / ((tail 0).den (x 0)) ^ 2 - d n‖ := norm_add_le _ _
    _ ≤ matrixC1DerivMajorantOf (j.evalNormBound y) (j.uniformDetBound y)
          (j.uniformDenUpper y R) (j.uniformDenMargin y R) E R +
        nonautonomousPadeDerivativeMajorant tail a r y n := by
      exact add_le_add (by simpa [norm_sub_rev] using htrunc) hshadow
    _ = nonautonomousPadeDerivativeMajorant tail a r y n +
        matrixC1DerivMajorantOf (j.evalNormBound y) (j.uniformDetBound y)
          (j.uniformDenUpper y R) (j.uniformDenMargin y R) E R := by ring

end ComplexDeriv

end

end Mandelbrot
