/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MatrixC1Deriv
import LeanProofs.MobiusDisk
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Uniform disk certificates for first-order Padé matrices

This file connects the entrywise `matrix-c1` tail certificate to the exact
Möbius-disk formulas.  It proves three runtime-facing facts:

* an entrywise tail preserves the absence of a pole on an arbitrary closed
  disk whenever the certified tail is smaller than the nominal pole margin;
* the exact map is enclosed by the nominal Möbius image disk enlarged by the
  already certified value error;
* the derivative is uniformly bounded by the determinant divided by the
  square of the same disk pole margin.

Thus the denominator, value, and derivative certificates use one common
geometric object instead of three unrelated pointwise estimates.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set

/-! ## Entrywise tails on disks with a moving center -/

/-- Pointwise matrix tail on `closedBall center R`.  The older
`matrixC1PointTail E R` is the special case `center = 0`. -/
def matrixDiskPointTail (E : ℝ) (center : ℂ) (R : ℝ) : ℝ :=
  E * (‖center‖ + R + 1)

theorem matrixDiskPointTail_zero (E R : ℝ) :
    matrixDiskPointTail E 0 R = matrixC1PointTail E R := by
  simp [matrixDiskPointTail, matrixC1PointTail]

private theorem norm_le_of_mem_closedBall (center z : ℂ) (R : ℝ)
    (hz : z ∈ closedBall center R) :
    ‖z‖ ≤ ‖center‖ + R := by
  have hz' : ‖z - center‖ ≤ R := by
    simpa [mem_closedBall, dist_eq] using hz
  calc
    ‖z‖ = ‖(z - center) + center‖ := by congr 1; ring
    _ ≤ ‖z - center‖ + ‖center‖ := norm_add_le _ _
    _ ≤ R + ‖center‖ := by linarith
    _ = ‖center‖ + R := by ring

theorem Homography.num_tail_le_on_closedBall
    (m q : Homography ℂ) (center z : ℂ) (E R : ℝ)
    (hz : z ∈ closedBall center R)
    (hE : (m.sub q).entryNorm ≤ E) :
    ‖m.num z - q.num z‖ ≤ matrixDiskPointTail E center R := by
  rw [Homography.num_sub_num]
  have hA : ‖(m.sub q).A‖ ≤ E := (m.sub q).entry_norm_A_le.trans hE
  have hB : ‖(m.sub q).B‖ ≤ E := (m.sub q).entry_norm_B_le.trans hE
  have hEnonneg : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hzNorm := norm_le_of_mem_closedBall center z R hz
  calc
    ‖(m.sub q).num z‖ ≤ ‖(m.sub q).A‖ * ‖z‖ + ‖(m.sub q).B‖ := by
      simp only [Homography.num]
      exact (norm_add_le _ _).trans_eq (by rw [norm_mul])
    _ ≤ E * (‖center‖ + R) + E := by
      exact add_le_add
        (mul_le_mul hA hzNorm (norm_nonneg z) hEnonneg) hB
    _ = matrixDiskPointTail E center R := by
      simp only [matrixDiskPointTail]
      ring

theorem Homography.den_tail_le_on_closedBall
    (m q : Homography ℂ) (center z : ℂ) (E R : ℝ)
    (hz : z ∈ closedBall center R)
    (hE : (m.sub q).entryNorm ≤ E) :
    ‖m.den z - q.den z‖ ≤ matrixDiskPointTail E center R := by
  rw [Homography.den_sub_den]
  have hC : ‖(m.sub q).C‖ ≤ E := (m.sub q).entry_norm_C_le.trans hE
  have hD : ‖(m.sub q).D‖ ≤ E := (m.sub q).entry_norm_D_le.trans hE
  have hEnonneg : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hzNorm := norm_le_of_mem_closedBall center z R hz
  calc
    ‖(m.sub q).den z‖ ≤ ‖(m.sub q).C‖ * ‖z‖ + ‖(m.sub q).D‖ := by
      simp only [Homography.den]
      exact (norm_add_le _ _).trans_eq (by rw [norm_mul])
    _ ≤ E * (‖center‖ + R) + E := by
      exact add_le_add
        (mul_le_mul hC hzNorm (norm_nonneg z) hEnonneg) hD
    _ = matrixDiskPointTail E center R := by
      simp only [matrixDiskPointTail]
      ring

/-- The nominal disk pole margin, minus the complete matrix tail, is a lower
bound for the exact denominator everywhere on the disk. -/
theorem Homography.exact_diskPoleMargin_of_matrixTail
    (m q : Homography ℂ) (center z : ℂ) (E R : ℝ)
    (hz : z ∈ closedBall center R)
    (hE : (m.sub q).entryNorm ≤ E) :
    q.diskPoleMargin center R - matrixDiskPointTail E center R ≤ ‖m.den z‖ := by
  have hq := q.diskPoleMargin_le_norm_den center z R hz
  have herr := m.den_tail_le_on_closedBall q center z E R hz hE
  have htri : ‖q.den z‖ ≤ ‖q.den z - m.den z‖ + ‖m.den z‖ := by
    calc
      ‖q.den z‖ = ‖(q.den z - m.den z) + m.den z‖ := by congr 1; ring
      _ ≤ ‖q.den z - m.den z‖ + ‖m.den z‖ := norm_add_le _ _
  rw [norm_sub_rev] at htri
  linarith

/-- Uniform discriminant theorem for an affine matrix plus a certified
remainder.  It is the precise bridge from `M₀ + κ M₁ + E` to `Delta>0`:
the representation only has to supply the entry-norm hypothesis `hE`. -/
theorem Homography.diskDelta_pos_of_matrixTail
    (m q : Homography ℂ) (center : ℂ) (E R : ℝ)
    (hR : 0 ≤ R) (hE : (m.sub q).entryNorm ≤ E)
    (hmargin : matrixDiskPointTail E center R < q.diskPoleMargin center R) :
    0 < m.diskDelta center R := by
  rw [m.diskDelta_pos_iff_no_pole_closedBall center R hR]
  intro z hz
  have hden := m.exact_diskPoleMargin_of_matrixTail q center z E R hz hE
  have : 0 < ‖m.den z‖ := by linarith
  exact norm_pos_iff.mp this

/-! ## Inflation of the exact nominal image disk -/

/-- Any uniform value error inflates the exact nominal Möbius image disk by
exactly that error.  This generic lemma is useful for other rational tiers as
well as `matrix-c1`. -/
theorem Homography.mapsTo_closedBall_diskImage_inflated
    (m q : Homography ℂ) (center : ℂ) (R eps : ℝ)
    (hR : 0 ≤ R) (hDelta : 0 < q.diskDelta center R)
    (hclose : ∀ z ∈ closedBall center R, ‖m.eval z - q.eval z‖ ≤ eps) :
    MapsTo m.eval (closedBall center R)
      (closedBall (q.diskImageCenter center R)
        (q.diskImageRadius center R + eps)) := by
  intro z hz
  have hq := q.mapsTo_closedBall_diskImage center R hR hDelta hz
  have hqNorm : ‖q.eval z - q.diskImageCenter center R‖ ≤
      q.diskImageRadius center R := by
    simpa [mem_closedBall, dist_eq] using hq
  rw [mem_closedBall, dist_eq]
  calc
    ‖m.eval z - q.diskImageCenter center R‖ =
        ‖(m.eval z - q.eval z) +
          (q.eval z - q.diskImageCenter center R)‖ := by
            congr 1
            ring
    _ ≤ ‖m.eval z - q.eval z‖ +
        ‖q.eval z - q.diskImageCenter center R‖ := norm_add_le _ _
    _ ≤ eps + q.diskImageRadius center R := add_le_add (hclose z hz) hqNorm
    _ = q.diskImageRadius center R + eps := by ring

/-- Centered `matrix-c1` disk certificate.  The same margin hypothesis proves
that both the exact and nominal matrices have no pole; the nominal exact
image disk is then enlarged by the certified truncation error. -/
theorem Homography.mapsTo_closedBall_matrixC1
    (m q : Homography ℂ) (E R : ℝ)
    (hR : 0 ≤ R) (hE : (m.sub q).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < truncatedMatrixDenMargin q R) :
    0 < m.diskDelta 0 R ∧
      MapsTo m.eval (closedBall (0 : ℂ) R)
        (closedBall (q.diskImageCenter 0 R)
          (q.diskImageRadius 0 R + matrixC1EvalMajorant q E R)) := by
  have hE0 : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hpoint0 : 0 ≤ matrixC1PointTail E R := by
    simp only [matrixC1PointTail]
    positivity
  have hqMargin : 0 < q.diskPoleMargin 0 R := by
    have : 0 < truncatedMatrixDenMargin q R := hpoint0.trans_lt hmargin
    simpa [Homography.diskPoleMargin, truncatedMatrixDenMargin,
      Homography.den] using this
  have hqDelta : 0 < q.diskDelta 0 R :=
    (q.diskDelta_pos_iff_poleMargin_pos 0 R hR).mpr hqMargin
  have hmDelta : 0 < m.diskDelta 0 R := by
    apply m.diskDelta_pos_of_matrixTail q 0 E R hR hE
    simpa [matrixDiskPointTail_zero, Homography.diskPoleMargin,
      truncatedMatrixDenMargin, Homography.den] using hmargin
  refine ⟨hmDelta, Homography.mapsTo_closedBall_diskImage_inflated m q 0 R
    (matrixC1EvalMajorant q E R) hR hqDelta ?_⟩
  intro z hz
  have hzNorm : ‖z‖ ≤ R := by
    simpa [mem_closedBall, dist_eq] using hz
  exact m.eval_matrixC1_error_le q z E R hR hzNorm hE hmargin

/-- Builder-facing, parameter-uniform version.  Its hypotheses use only the
affine matrix jet, the uniform denominator margin, and the tail bound.  The
output disk remains fiberwise in `c`, preserving the correlation that a
single worst-case centered disk would discard. -/
theorem MatrixC1.mapsTo_closedBall_uniform
    (j : MatrixC1 ℂ) (exact : ℂ → Homography ℂ)
    (c : ℂ) (E y R : ℝ)
    (hy : 0 ≤ y) (hc : ‖c‖ ≤ y) (hR : 0 ≤ R)
    (hE : ((exact c).sub (j.eval c)).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < j.uniformDenMargin y R) :
    0 < (exact c).diskDelta 0 R ∧
      MapsTo (exact c).eval (closedBall (0 : ℂ) R)
        (closedBall ((j.eval c).diskImageCenter 0 R)
          ((j.eval c).diskImageRadius 0 R +
            matrixC1EvalMajorant (j.eval c) E R)) := by
  apply (exact c).mapsTo_closedBall_matrixC1 (j.eval c) E R hR hE
  exact hmargin.trans_le (j.uniformDenMargin_le c y R hy hR hc)

/-- Quantified form of the preceding theorem: a single builder certificate
works for the entire parameter disk.  The output center remains a function of
`c`; this is intentional and preserves the affine coefficient correlation. -/
theorem MatrixC1.mapsTo_closedBall_uniform_all
    (j : MatrixC1 ℂ) (exact : ℂ → Homography ℂ) (E y R : ℝ)
    (hy : 0 ≤ y) (hR : 0 ≤ R)
    (hE : ∀ c, ‖c‖ ≤ y → ((exact c).sub (j.eval c)).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < j.uniformDenMargin y R) :
    ∀ c, ‖c‖ ≤ y →
      0 < (exact c).diskDelta 0 R ∧
        MapsTo (exact c).eval (closedBall (0 : ℂ) R)
          (closedBall ((j.eval c).diskImageCenter 0 R)
            ((j.eval c).diskImageRadius 0 R +
              matrixC1EvalMajorant (j.eval c) E R)) := by
  intro c hc
  exact j.mapsTo_closedBall_uniform exact c E y R hy hc hR (hE c hc) hmargin

/-! ## Derivative on the same certified disk -/

/-- Exact derivative bound on an arbitrary disk.  No Cauchy enlargement is
needed: the determinant identity and the disk pole margin suffice. -/
theorem Homography.norm_deriv_eval_le_disk
    (m : Homography ℂ) (center z : ℂ) (R : ℝ)
    (hR : 0 ≤ R) (hDelta : 0 < m.diskDelta center R)
    (hz : z ∈ closedBall center R) :
    ‖m.det / (m.den z) ^ 2‖ ≤
      ‖m.det‖ / (m.diskPoleMargin center R) ^ 2 := by
  have hpole : 0 < m.diskPoleMargin center R :=
    (m.diskDelta_pos_iff_poleMargin_pos center R hR).mp hDelta
  have hden : m.diskPoleMargin center R ≤ ‖m.den z‖ :=
    m.diskPoleMargin_le_norm_den center z R hz
  have hsq : (m.diskPoleMargin center R) ^ 2 ≤ ‖m.den z‖ ^ 2 := by
    nlinarith [norm_nonneg (m.den z)]
  rw [norm_div, norm_pow]
  exact div_le_div₀ (norm_nonneg _) le_rfl (pow_pos hpole 2) hsq

/-- Total derivative envelope for an exact matrix represented by a truncated
one.  It combines the nominal disk derivative with the already proved direct
matrix-tail derivative error. -/
theorem Homography.norm_deriv_eval_matrixC1_le
    (m q : Homography ℂ) (z : ℂ) (E R : ℝ)
    (hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub q).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < truncatedMatrixDenMargin q R) :
    ‖m.det / (m.den z) ^ 2‖ ≤
      ‖q.det‖ / (truncatedMatrixDenMargin q R) ^ 2 +
        matrixC1DerivMajorantOf q.entryNorm q.detBound (q.denUpper R)
          (truncatedMatrixDenMargin q R) E R := by
  have hE0 : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hpoint0 : 0 ≤ matrixC1PointTail E R := by
    simp only [matrixC1PointTail]
    positivity
  have hmargin0 : 0 < truncatedMatrixDenMargin q R :=
    hpoint0.trans_lt hmargin
  have hqDelta : 0 < q.diskDelta 0 R := by
    apply (q.diskDelta_pos_iff_poleMargin_pos 0 R hR).mpr
    simpa [Homography.diskPoleMargin, truncatedMatrixDenMargin,
      Homography.den] using hmargin0
  have hzBall : z ∈ closedBall (0 : ℂ) R := by
    simpa [mem_closedBall, dist_eq] using hz
  have hnom := q.norm_deriv_eval_le_disk 0 z R hR hqDelta hzBall
  have hnom' : ‖q.det / (q.den z) ^ 2‖ ≤
      ‖q.det‖ / (truncatedMatrixDenMargin q R) ^ 2 := by
    simpa [Homography.diskPoleMargin, truncatedMatrixDenMargin,
      Homography.den] using hnom
  have herr := m.deriv_eval_sub_le q z E R hR hz hE hmargin
  have htri : ‖m.det / (m.den z) ^ 2‖ ≤
      ‖q.det / (q.den z) ^ 2‖ +
        ‖m.det / (m.den z) ^ 2 - q.det / (q.den z) ^ 2‖ := by
    calc
      ‖m.det / (m.den z) ^ 2‖ =
          ‖q.det / (q.den z) ^ 2 +
            (m.det / (m.den z) ^ 2 - q.det / (q.den z) ^ 2)‖ := by
              congr 1
              ring
      _ ≤ _ := norm_add_le _ _
  calc
    ‖m.det / (m.den z) ^ 2‖ ≤
        ‖q.det / (q.den z) ^ 2‖ +
          ‖m.det / (m.den z) ^ 2 - q.det / (q.den z) ^ 2‖ := htri
    _ ≤ ‖q.det‖ / (truncatedMatrixDenMargin q R) ^ 2 +
        matrixC1DerivMajorantOf q.entryNorm q.detBound (q.denUpper R)
          (truncatedMatrixDenMargin q R) E R := by
      exact add_le_add hnom' (by simpa [matrixC1DerivMajorantOf] using herr)

/-- Fully builder-facing derivative envelope, simultaneous for `|c|≤y` and
`|z|≤R`.  Both the nominal derivative and the matrix-tail derivative error
use uniform quantities computed from the eight affine coefficients. -/
theorem MatrixC1.norm_deriv_exact_le_uniform
    (j : MatrixC1 ℂ) (m : Homography ℂ) (c z : ℂ) (E y R : ℝ)
    (hy : 0 ≤ y) (hc : ‖c‖ ≤ y) (hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub (j.eval c)).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < j.uniformDenMargin y R) :
    ‖m.det / (m.den z) ^ 2‖ ≤
      j.uniformDetBound y / (j.uniformDenMargin y R) ^ 2 +
        matrixC1DerivMajorantOf (j.evalNormBound y) (j.uniformDetBound y)
          (j.uniformDenUpper y R) (j.uniformDenMargin y R) E R := by
  let q := j.eval c
  have hE0 : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hpoint0 : 0 ≤ matrixC1PointTail E R := by
    simp only [matrixC1PointTail]
    positivity
  have hUniformMargin : 0 < j.uniformDenMargin y R :=
    hpoint0.trans_lt hmargin
  have hActualMargin : j.uniformDenMargin y R ≤
      truncatedMatrixDenMargin q R :=
    j.uniformDenMargin_le c y R hy hR hc
  have hqDen : j.uniformDenMargin y R ≤ ‖q.den z‖ :=
    hActualMargin.trans (truncatedMatrixDenMargin_le q z R hR hz)
  have hqDenSq : (j.uniformDenMargin y R) ^ 2 ≤ ‖q.den z‖ ^ 2 := by
    nlinarith [norm_nonneg (q.den z)]
  have hqDet : ‖q.det‖ ≤ j.uniformDetBound y :=
    q.norm_det_le.trans (j.detBound_eval_le c y hy hc)
  have hUniformDet0 : 0 ≤ j.uniformDetBound y :=
    q.detBound_nonneg.trans (j.detBound_eval_le c y hy hc)
  have hnom : ‖q.det / (q.den z) ^ 2‖ ≤
      j.uniformDetBound y / (j.uniformDenMargin y R) ^ 2 := by
    rw [norm_div, norm_pow]
    exact div_le_div₀ hUniformDet0 hqDet (pow_pos hUniformMargin 2) hqDenSq
  have herr := j.deriv_error_le_uniform m c z E y R hy hc hR hz hE hmargin
  calc
    ‖m.det / (m.den z) ^ 2‖ =
        ‖q.det / (q.den z) ^ 2 +
          (m.det / (m.den z) ^ 2 - q.det / (q.den z) ^ 2)‖ := by
            congr 1
            ring
    _ ≤ ‖q.det / (q.den z) ^ 2‖ +
        ‖m.det / (m.den z) ^ 2 - q.det / (q.den z) ^ 2‖ := norm_add_le _ _
    _ ≤ j.uniformDetBound y / (j.uniformDenMargin y R) ^ 2 +
        matrixC1DerivMajorantOf (j.evalNormBound y) (j.uniformDetBound y)
          (j.uniformDenUpper y R) (j.uniformDenMargin y R) E R :=
      add_le_add hnom herr

end

end Mandelbrot
