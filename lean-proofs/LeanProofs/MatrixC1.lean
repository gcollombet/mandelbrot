/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.NonautonomousPade
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# First-order parameter jets of non-autonomous Padé matrices

The exact product of the one-step Padé matrices is polynomial in the
Mandelbrot parameter perturbation `c`.  This file keeps the constant and
linear matrix coefficients, derives their exact composition recurrence, and
certifies the omitted `c²+` tail with a builder-computable scalar recurrence.

The second half turns that entrywise tail bound into a preserved denominator
margin and an evaluation error.  The final theorem adds this truncation error
to `nonautonomous_pade_shadowing_bound`.
-/

namespace Mandelbrot

noncomputable section

section Algebra

variable {K : Type*} [Field K]

def Homography.add (m n : Homography K) : Homography K where
  A := m.A + n.A
  B := m.B + n.B
  C := m.C + n.C
  D := m.D + n.D

def Homography.sub (m n : Homography K) : Homography K where
  A := m.A - n.A
  B := m.B - n.B
  C := m.C - n.C
  D := m.D - n.D

def Homography.scale (s : K) (m : Homography K) : Homography K where
  A := s * m.A
  B := s * m.B
  C := s * m.C
  D := s * m.D

def Homography.num (m : Homography K) (z : K) : K :=
  m.A * z + m.B

@[ext]
structure MatrixC1 (K : Type*) where
  constant : Homography K
  linear : Homography K

def MatrixC1.eval (j : MatrixC1 K) (c : K) : Homography K :=
  j.constant.add (Homography.scale c j.linear)

def MatrixC1.one : MatrixC1 K where
  constant := Homography.one
  linear := { A := 0, B := 0, C := 0, D := 0 }

/-- First-order product recurrence:
`(M₀+cM₁)(N₀+cN₁) = M₀N₀ + c(M₀N₁+M₁N₀) + c²M₁N₁`. -/
def MatrixC1.comp (outer inner : MatrixC1 K) : MatrixC1 K where
  constant := outer.constant.comp inner.constant
  linear := (outer.constant.comp inner.linear).add
    (outer.linear.comp inner.constant)

theorem MatrixC1.eval_comp_with_quadratic_remainder
    (outer inner : MatrixC1 K) (c : K) :
    (outer.eval c).comp (inner.eval c) =
      ((outer.comp inner).eval c).add
        (Homography.scale (c ^ 2) (outer.linear.comp inner.linear)) := by
  ext <;> simp [MatrixC1.eval, MatrixC1.comp, Homography.comp,
    Homography.add, Homography.scale] <;> ring

/-- The one-step Padé matrix is exactly affine in `c`. -/
def padeStepMatrixC1 (a : K) : MatrixC1 K where
  constant := { A := a ^ 2, B := 0, C := -1, D := a }
  linear := { A := 0, B := a, C := 0, D := 0 }

@[simp] theorem padeStepMatrixC1_eval (a c : K) :
    (padeStepMatrixC1 a).eval c = padeStepHomography a c := by
  ext <;> simp [padeStepMatrixC1, MatrixC1.eval, Homography.add,
    Homography.scale, padeStepHomography, mul_comm]

/-- Backward product of first-order matrix jets.  This is the exact recurrence
the CPU builder can use for the eight complex coefficients of `matrix-c1`. -/
def padeMatrixC1Segment (a : ℕ → K) (start : ℕ) : ℕ → MatrixC1 K
  | 0 => MatrixC1.one
  | length + 1 =>
      (padeMatrixC1Segment a (start + 1) length).comp
        (padeStepMatrixC1 (a start))

theorem padeMatrixC1Segment_succ (a : ℕ → K) (start length : ℕ) :
    padeMatrixC1Segment a start (length + 1) =
      (padeMatrixC1Segment a (start + 1) length).comp
        (padeStepMatrixC1 (a start)) := rfl

end Algebra

section ComplexTail

open Complex

/-- Entrywise `ℓ¹` norm.  It is deliberately elementary: every individual
entry error is bounded by it and it is cheap to majorize during table build. -/
def Homography.entryNorm (m : Homography ℂ) : ℝ :=
  ‖m.A‖ + ‖m.B‖ + ‖m.C‖ + ‖m.D‖

theorem Homography.entryNorm_nonneg (m : Homography ℂ) :
    0 ≤ m.entryNorm := by
  unfold Homography.entryNorm
  positivity

theorem Homography.entryNorm_add_le (m n : Homography ℂ) :
    (m.add n).entryNorm ≤ m.entryNorm + n.entryNorm := by
  simp only [Homography.entryNorm, Homography.add]
  have hA := norm_add_le m.A n.A
  have hB := norm_add_le m.B n.B
  have hC := norm_add_le m.C n.C
  have hD := norm_add_le m.D n.D
  linarith

theorem Homography.entryNorm_scale (s : ℂ) (m : Homography ℂ) :
    (Homography.scale s m).entryNorm = ‖s‖ * m.entryNorm := by
  simp [Homography.entryNorm, Homography.scale]
  ring

theorem Homography.entryNorm_comp_le (m n : Homography ℂ) :
    (m.comp n).entryNorm ≤ m.entryNorm * n.entryNorm := by
  simp only [Homography.entryNorm, Homography.comp]
  have hA := norm_add_le (m.A * n.A) (m.B * n.C)
  have hB := norm_add_le (m.A * n.B) (m.B * n.D)
  have hC := norm_add_le (m.C * n.A) (m.D * n.C)
  have hD := norm_add_le (m.C * n.B) (m.D * n.D)
  simp only [norm_mul] at hA hB hC hD ⊢
  nlinarith [norm_nonneg m.A, norm_nonneg m.B, norm_nonneg m.C, norm_nonneg m.D,
    norm_nonneg n.A, norm_nonneg n.B, norm_nonneg n.C, norm_nonneg n.D]

theorem Homography.comp_sub_comp
    (m q s : Homography ℂ) :
    (m.comp s).sub (q.comp s) = (m.sub q).comp s := by
  ext <;> simp [Homography.comp, Homography.sub] <;> ring

theorem Homography.sub_add_cancel
    (m q e : Homography ℂ) (h : m = q.add e) :
    m.sub q = e := by
  subst m
  ext <;> simp [Homography.add, Homography.sub]

/-- Norm bound for an affine matrix jet on `|c|≤y`. -/
def MatrixC1.evalNormBound (j : MatrixC1 ℂ) (y : ℝ) : ℝ :=
  j.constant.entryNorm + y * j.linear.entryNorm

theorem MatrixC1.entryNorm_eval_le
    (j : MatrixC1 ℂ) (c : ℂ) (y : ℝ)
    (_hy : 0 ≤ y) (hc : ‖c‖ ≤ y) :
    (j.eval c).entryNorm ≤ j.evalNormBound y := by
  calc
    (j.eval c).entryNorm ≤ j.constant.entryNorm +
        (Homography.scale c j.linear).entryNorm :=
      Homography.entryNorm_add_le _ _
    _ = j.constant.entryNorm + ‖c‖ * j.linear.entryNorm := by
      rw [Homography.entryNorm_scale]
    _ ≤ j.constant.entryNorm + y * j.linear.entryNorm := by
      have h := mul_le_mul_of_nonneg_right hc j.linear.entryNorm_nonneg
      linarith
    _ = j.evalNormBound y := rfl

/-- Builder recurrence for the complete omitted `c²+` matrix tail. -/
def padeMatrixC1TailBound
    (a : ℕ → ℂ) (start : ℕ) (y : ℝ) : ℕ → ℝ
  | 0 => 0
  | length + 1 =>
      let outer := padeMatrixC1Segment a (start + 1) length
      let inner := padeStepMatrixC1 (a start)
      padeMatrixC1TailBound a (start + 1) y length * inner.evalNormBound y +
        y ^ 2 * (outer.linear.comp inner.linear).entryNorm

theorem padeMatrixC1TailBound_nonneg
    (a : ℕ → ℂ) (start length : ℕ) (y : ℝ) (hy : 0 ≤ y) :
    0 ≤ padeMatrixC1TailBound a start y length := by
  induction length generalizing start with
  | zero => simp [padeMatrixC1TailBound]
  | succ length ih =>
      simp only [padeMatrixC1TailBound]
      have hinner : 0 ≤ (padeStepMatrixC1 (a start)).evalNormBound y := by
        exact add_nonneg (padeStepMatrixC1 (a start)).constant.entryNorm_nonneg
          (mul_nonneg hy (padeStepMatrixC1 (a start)).linear.entryNorm_nonneg)
      exact add_nonneg (mul_nonneg (ih (start + 1)) hinner)
        (mul_nonneg (sq_nonneg y)
          ((padeMatrixC1Segment a (start + 1) length).linear.comp
            (padeStepMatrixC1 (a start)).linear).entryNorm_nonneg)

/-- The recurrence above certifies every polynomial coefficient of degree at
least two at once, on the complete parameter disk `|c|≤y`. -/
theorem padeMatrixC1_tail_le
    (a : ℕ → ℂ) (c : ℂ) (start length : ℕ) (y : ℝ)
    (hy : 0 ≤ y) (hc : ‖c‖ ≤ y) :
    ((padeTailSegment a c start length).sub
      ((padeMatrixC1Segment a start length).eval c)).entryNorm ≤
        padeMatrixC1TailBound a start y length := by
  induction length generalizing start with
  | zero =>
      norm_num [padeTailSegment, padeMatrixC1Segment, padeMatrixC1TailBound,
        MatrixC1.one,
        MatrixC1.eval, Homography.one, Homography.add, Homography.scale,
        Homography.sub, Homography.entryNorm]
  | succ length ih =>
      let outer := padeMatrixC1Segment a (start + 1) length
      let inner := padeStepMatrixC1 (a start)
      let exactOuter := padeTailSegment a c (start + 1) length
      let exactInner := padeStepHomography (a start) c
      have hinner : exactInner = inner.eval c := by
        simp [exactInner, inner]
      have hdecomp :
          (exactOuter.comp exactInner).sub ((outer.comp inner).eval c) =
            ((exactOuter.sub (outer.eval c)).comp exactInner).add
              (Homography.scale (c ^ 2) (outer.linear.comp inner.linear)) := by
        rw [hinner]
        ext <;> simp [MatrixC1.eval, MatrixC1.comp, Homography.comp,
          Homography.add, Homography.sub, Homography.scale] <;> ring
      rw [show padeTailSegment a c start (length + 1) =
        exactOuter.comp exactInner by rfl]
      rw [show padeMatrixC1Segment a start (length + 1) =
        outer.comp inner by rfl]
      rw [hdecomp]
      calc
        (((exactOuter.sub (outer.eval c)).comp exactInner).add
            (Homography.scale (c ^ 2)
              (outer.linear.comp inner.linear))).entryNorm ≤
          ((exactOuter.sub (outer.eval c)).comp exactInner).entryNorm +
            (Homography.scale (c ^ 2)
              (outer.linear.comp inner.linear)).entryNorm :=
            Homography.entryNorm_add_le _ _
        _ ≤ (exactOuter.sub (outer.eval c)).entryNorm * exactInner.entryNorm +
            ‖c ^ 2‖ * (outer.linear.comp inner.linear).entryNorm := by
          rw [Homography.entryNorm_scale]
          exact add_le_add (Homography.entryNorm_comp_le _ _) le_rfl
        _ ≤ padeMatrixC1TailBound a (start + 1) y length *
              inner.evalNormBound y +
            y ^ 2 * (outer.linear.comp inner.linear).entryNorm := by
          have htail : (exactOuter.sub (outer.eval c)).entryNorm ≤
              padeMatrixC1TailBound a (start + 1) y length := by
            exact ih (start + 1)
          have hstep : exactInner.entryNorm ≤ inner.evalNormBound y := by
            rw [hinner]
            exact inner.entryNorm_eval_le c y hy hc
          have htail0 := padeMatrixC1TailBound_nonneg a (start + 1) length y hy
          have hstep0 := exactInner.entryNorm_nonneg
          have hcross0 := (outer.linear.comp inner.linear).entryNorm_nonneg
          have hc2 : ‖c ^ 2‖ ≤ y ^ 2 := by
            rw [norm_pow]
            nlinarith [norm_nonneg c]
          exact add_le_add
            (mul_le_mul htail hstep hstep0 htail0)
            (mul_le_mul_of_nonneg_right hc2 hcross0)
        _ = padeMatrixC1TailBound a start y (length + 1) := rfl

/-! ## From the matrix tail to a rational-map error -/

/-- A single entry-norm error `E` induces this numerator/denominator error on
the disk `|z|≤R`.  The factor `R+1` accounts for one linear and one constant
matrix entry. -/
def matrixC1PointTail (E R : ℝ) : ℝ := E * (R + 1)

/-- Denominator margin visible from the truncated matrix. -/
def truncatedMatrixDenMargin (q : Homography ℂ) (R : ℝ) : ℝ :=
  ‖q.D‖ - ‖q.C‖ * R

/-- Numerator upper bound visible from the truncated matrix. -/
def truncatedMatrixNumBound (q : Homography ℂ) (R : ℝ) : ℝ :=
  ‖q.A‖ * R + ‖q.B‖

/-- Denominator margin of an affine matrix jet, uniform for every `|c|≤y`
and `|z|≤R`.  Unlike `truncatedMatrixDenMargin (j.eval c) R`, this quantity is
entirely available while building the table. -/
def MatrixC1.uniformDenMargin (j : MatrixC1 ℂ) (y R : ℝ) : ℝ :=
  ‖j.constant.D‖ - y * ‖j.linear.D‖ -
    (‖j.constant.C‖ + y * ‖j.linear.C‖) * R

theorem MatrixC1.uniformDenMargin_le
    (j : MatrixC1 ℂ) (c : ℂ) (y R : ℝ)
    (_hy : 0 ≤ y) (hR : 0 ≤ R) (hc : ‖c‖ ≤ y) :
    j.uniformDenMargin y R ≤ truncatedMatrixDenMargin (j.eval c) R := by
  have hD : ‖j.constant.D‖ - y * ‖j.linear.D‖ ≤ ‖(j.eval c).D‖ := by
    have hreverse : ‖j.constant.D‖ - ‖c * j.linear.D‖ ≤
        ‖j.constant.D + c * j.linear.D‖ := by
      have h := norm_sub_norm_le j.constant.D (-c * j.linear.D)
      simpa [sub_eq_add_neg] using h
    have hmul : ‖c * j.linear.D‖ ≤ y * ‖j.linear.D‖ := by
      rw [norm_mul]
      exact mul_le_mul_of_nonneg_right hc (norm_nonneg _)
    change ‖j.constant.D‖ - y * ‖j.linear.D‖ ≤
      ‖j.constant.D + c * j.linear.D‖
    linarith
  have hC : ‖(j.eval c).C‖ ≤
      ‖j.constant.C‖ + y * ‖j.linear.C‖ := by
    change ‖j.constant.C + c * j.linear.C‖ ≤ _
    calc
      ‖j.constant.C + c * j.linear.C‖ ≤
          ‖j.constant.C‖ + ‖c * j.linear.C‖ := norm_add_le _ _
      _ = ‖j.constant.C‖ + ‖c‖ * ‖j.linear.C‖ := by rw [norm_mul]
      _ ≤ ‖j.constant.C‖ + y * ‖j.linear.C‖ := by
        have hmul := mul_le_mul_of_nonneg_right hc (norm_nonneg j.linear.C)
        linarith
  unfold MatrixC1.uniformDenMargin truncatedMatrixDenMargin
  have hCR := mul_le_mul_of_nonneg_right hC hR
  linarith

theorem Homography.entry_norm_A_le (m : Homography ℂ) :
    ‖m.A‖ ≤ m.entryNorm := by
  simp only [Homography.entryNorm]
  linarith [norm_nonneg m.B, norm_nonneg m.C, norm_nonneg m.D]

theorem Homography.entry_norm_B_le (m : Homography ℂ) :
    ‖m.B‖ ≤ m.entryNorm := by
  simp only [Homography.entryNorm]
  linarith [norm_nonneg m.A, norm_nonneg m.C, norm_nonneg m.D]

theorem Homography.entry_norm_C_le (m : Homography ℂ) :
    ‖m.C‖ ≤ m.entryNorm := by
  simp only [Homography.entryNorm]
  linarith [norm_nonneg m.A, norm_nonneg m.B, norm_nonneg m.D]

theorem Homography.entry_norm_D_le (m : Homography ℂ) :
    ‖m.D‖ ≤ m.entryNorm := by
  simp only [Homography.entryNorm]
  linarith [norm_nonneg m.A, norm_nonneg m.B, norm_nonneg m.C]

theorem Homography.num_sub_num (m q : Homography ℂ) (z : ℂ) :
    m.num z - q.num z = (m.sub q).num z := by
  simp [Homography.num, Homography.sub]
  ring

theorem Homography.den_sub_den (m q : Homography ℂ) (z : ℂ) :
    m.den z - q.den z = (m.sub q).den z := by
  simp [Homography.den, Homography.sub]
  ring

theorem Homography.num_tail_le
    (m q : Homography ℂ) (z : ℂ) (E R : ℝ)
    (_hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub q).entryNorm ≤ E) :
    ‖m.num z - q.num z‖ ≤ matrixC1PointTail E R := by
  rw [Homography.num_sub_num]
  have hA : ‖(m.sub q).A‖ ≤ E :=
    (m.sub q).entry_norm_A_le.trans hE
  have hB : ‖(m.sub q).B‖ ≤ E :=
    (m.sub q).entry_norm_B_le.trans hE
  calc
    ‖(m.sub q).num z‖ ≤ ‖(m.sub q).A‖ * ‖z‖ + ‖(m.sub q).B‖ := by
      simp only [Homography.num]
      exact (norm_add_le _ _).trans_eq (by rw [norm_mul])
    _ ≤ E * R + E := by
      have hEnonneg : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
      exact add_le_add (mul_le_mul hA hz (norm_nonneg z) hEnonneg) hB
    _ = matrixC1PointTail E R := by
      simp [matrixC1PointTail]
      ring

theorem Homography.den_tail_le
    (m q : Homography ℂ) (z : ℂ) (E R : ℝ)
    (_hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub q).entryNorm ≤ E) :
    ‖m.den z - q.den z‖ ≤ matrixC1PointTail E R := by
  rw [Homography.den_sub_den]
  have hC : ‖(m.sub q).C‖ ≤ E :=
    (m.sub q).entry_norm_C_le.trans hE
  have hD : ‖(m.sub q).D‖ ≤ E :=
    (m.sub q).entry_norm_D_le.trans hE
  calc
    ‖(m.sub q).den z‖ ≤ ‖(m.sub q).C‖ * ‖z‖ + ‖(m.sub q).D‖ := by
      simp only [Homography.den]
      exact (norm_add_le _ _).trans_eq (by rw [norm_mul])
    _ ≤ E * R + E := by
      have hEnonneg : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
      exact add_le_add (mul_le_mul hC hz (norm_nonneg z) hEnonneg) hD
    _ = matrixC1PointTail E R := by
      simp [matrixC1PointTail]
      ring

theorem truncatedMatrixNumBound_le
    (q : Homography ℂ) (z : ℂ) (R : ℝ)
    (_hR : 0 ≤ R) (hz : ‖z‖ ≤ R) :
    ‖q.num z‖ ≤ truncatedMatrixNumBound q R := by
  calc
    ‖q.num z‖ ≤ ‖q.A‖ * ‖z‖ + ‖q.B‖ := by
      simp only [Homography.num]
      exact (norm_add_le _ _).trans_eq (by rw [norm_mul])
    _ ≤ ‖q.A‖ * R + ‖q.B‖ :=
      by
        have h := mul_le_mul_of_nonneg_left hz (norm_nonneg q.A)
        linarith
    _ = truncatedMatrixNumBound q R := rfl

theorem truncatedMatrixDenMargin_le
    (q : Homography ℂ) (z : ℂ) (R : ℝ)
    (hR : 0 ≤ R) (hz : ‖z‖ ≤ R) :
    truncatedMatrixDenMargin q R ≤ ‖q.den z‖ := by
  exact q.den_lower z R hR hz

/-- The truncated matrix preserves a denominator margin after subtracting the
complete certified `c²+` tail. -/
theorem exact_den_margin_of_matrixC1
    (m q : Homography ℂ) (z : ℂ) (E R : ℝ)
    (hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub q).entryNorm ≤ E) :
    truncatedMatrixDenMargin q R - matrixC1PointTail E R ≤ ‖m.den z‖ := by
  have hq := truncatedMatrixDenMargin_le q z R hR hz
  have herr := m.den_tail_le q z E R hR hz hE
  have htri : ‖q.den z‖ ≤
      ‖q.den z - m.den z‖ + ‖m.den z‖ := by
    calc
      ‖q.den z‖ = ‖(q.den z - m.den z) + m.den z‖ := by
        congr 1
        ring
      _ ≤ ‖q.den z - m.den z‖ + ‖m.den z‖ := norm_add_le _ _
  rw [norm_sub_rev] at htri
  linarith

/-- Exact perturbation identity for two homographies with different
coefficients. -/
theorem Homography.eval_sub_eval_matrix
    (m q : Homography ℂ) (z : ℂ)
    (hm : m.den z ≠ 0) (hq : q.den z ≠ 0) :
    m.eval z - q.eval z =
      (m.num z - q.num z) / m.den z +
        q.num z * (q.den z - m.den z) / (m.den z * q.den z) := by
  change m.num z / m.den z - q.num z / q.den z = _
  field_simp [hm, hq]
  ring

/-- Fully computable evaluation-error majorant for a first-order matrix. -/
def matrixC1EvalMajorant (q : Homography ℂ) (E R : ℝ) : ℝ :=
  let point := matrixC1PointTail E R
  let margin := truncatedMatrixDenMargin q R
  point / (margin - point) +
    truncatedMatrixNumBound q R * point / ((margin - point) * margin)

theorem Homography.eval_matrixC1_error_le
    (m q : Homography ℂ) (z : ℂ) (E R : ℝ)
    (hR : 0 ≤ R) (hz : ‖z‖ ≤ R)
    (hE : (m.sub q).entryNorm ≤ E)
    (hmargin : matrixC1PointTail E R < truncatedMatrixDenMargin q R) :
    ‖m.eval z - q.eval z‖ ≤ matrixC1EvalMajorant q E R := by
  let point := matrixC1PointTail E R
  let margin := truncatedMatrixDenMargin q R
  have hEnonneg : 0 ≤ E := (m.sub q).entryNorm_nonneg.trans hE
  have hpoint : 0 ≤ point := by
    dsimp only [point, matrixC1PointTail]
    exact mul_nonneg hEnonneg (by linarith)
  have hmargin0 : 0 < margin := hpoint.trans_lt hmargin
  have hexactMargin : 0 < margin - point := sub_pos.mpr hmargin
  have hqLower : margin ≤ ‖q.den z‖ := by
    exact truncatedMatrixDenMargin_le q z R hR hz
  have hmLower : margin - point ≤ ‖m.den z‖ := by
    exact exact_den_margin_of_matrixC1 m q z E R hR hz hE
  have hqne : q.den z ≠ 0 := norm_pos_iff.mp (hmargin0.trans_le hqLower)
  have hmne : m.den z ≠ 0 := norm_pos_iff.mp (hexactMargin.trans_le hmLower)
  have hnumTail : ‖m.num z - q.num z‖ ≤ point := by
    exact m.num_tail_le q z E R hR hz hE
  have hdenTail : ‖q.den z - m.den z‖ ≤ point := by
    rw [norm_sub_rev]
    exact m.den_tail_le q z E R hR hz hE
  have hnumQ : ‖q.num z‖ ≤ truncatedMatrixNumBound q R :=
    truncatedMatrixNumBound_le q z R hR hz
  have hnumQ0 : 0 ≤ truncatedMatrixNumBound q R := by
    simp only [truncatedMatrixNumBound]
    exact add_nonneg (mul_nonneg (norm_nonneg q.A) hR) (norm_nonneg q.B)
  rw [Homography.eval_sub_eval_matrix m q z hmne hqne]
  calc
    ‖(m.num z - q.num z) / m.den z +
        q.num z * (q.den z - m.den z) / (m.den z * q.den z)‖ ≤
      ‖(m.num z - q.num z) / m.den z‖ +
        ‖q.num z * (q.den z - m.den z) / (m.den z * q.den z)‖ :=
      norm_add_le _ _
    _ = ‖m.num z - q.num z‖ / ‖m.den z‖ +
        (‖q.num z‖ * ‖q.den z - m.den z‖) /
          (‖m.den z‖ * ‖q.den z‖) := by
      simp only [norm_div, norm_mul]
    _ ≤ point / (margin - point) +
        (truncatedMatrixNumBound q R * point) /
          ((margin - point) * margin) := by
      apply add_le_add
      · exact div_le_div₀ hpoint hnumTail hexactMargin hmLower
      · have htop : ‖q.num z‖ * ‖q.den z - m.den z‖ ≤
            truncatedMatrixNumBound q R * point :=
          mul_le_mul hnumQ hdenTail (norm_nonneg _) hnumQ0
        have hbottom : (margin - point) * margin ≤
            ‖m.den z‖ * ‖q.den z‖ :=
          mul_le_mul hmLower hqLower hmargin0.le (norm_nonneg _)
        exact div_le_div₀ (mul_nonneg hnumQ0 hpoint) htop
          (mul_pos hexactMargin hmargin0) hbottom
    _ = matrixC1EvalMajorant q E R := rfl

/-! ## Total `matrix-c1` versus Mandelbrot certificate -/

/-- End-to-end exact-arithmetic theorem.  Its right-hand side is the sum of
the non-autonomous Padé defect and the complete first-order matrix truncation
error.  Every quantity is computable from the reference orbit, the scalar
orbit envelopes, and the eight stored matrix coefficients. -/
theorem matrixC1_nonautonomous_total_error
    (a : ℕ → ℂ) (c : ℂ) (x : ℕ → ℂ) (r : ℕ → ℝ)
    (y R : ℝ) (n : ℕ)
    (hstep : ∀ j, x (j + 1) = exactStep (a j) (x j) c)
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
    ‖((padeMatrixC1Segment a 0 n).eval c).eval (x 0) - x n‖ ≤
      nonautonomousPadeMajorant (canonicalPadeTail a c n) a r y n +
        matrixC1EvalMajorant ((padeMatrixC1Segment a 0 n).eval c)
          (padeMatrixC1TailBound a 0 y n) R := by
  let tail := canonicalPadeTail a c n
  let q := (padeMatrixC1Segment a 0 n).eval c
  let E := padeMatrixC1TailBound a 0 y n
  have htail : IsPadeTail tail a c n := by
    exact canonicalPadeTail_isPadeTail a c n
  have hpadeError : ‖(tail 0).eval (x 0) - x n‖ ≤
      nonautonomousPadeMajorant tail a r y n := by
    exact nonautonomous_pade_shadowing_bound tail a c x r y n htail hstep
      hr hy hc hx hloc hpade hexact
  have hmatrix : ((tail 0).sub q).entryNorm ≤ E := by
    dsimp only [tail, q, E, canonicalPadeTail]
    simpa using padeMatrixC1_tail_le a c 0 n y hy hc
  have hmatrixMarginActual :
      matrixC1PointTail E R < truncatedMatrixDenMargin q R := by
    exact hmatrixMargin.trans_le
      ((padeMatrixC1Segment a 0 n).uniformDenMargin_le c y R hy hR hc)
  have htrunc : ‖(tail 0).eval (x 0) - q.eval (x 0)‖ ≤
      matrixC1EvalMajorant q E R := by
    exact Homography.eval_matrixC1_error_le
      (tail 0) q (x 0) E R hR hx0 hmatrix hmatrixMarginActual
  calc
    ‖q.eval (x 0) - x n‖ =
        ‖(q.eval (x 0) - (tail 0).eval (x 0)) +
          ((tail 0).eval (x 0) - x n)‖ := by
      congr 1
      ring
    _ ≤
        ‖q.eval (x 0) - (tail 0).eval (x 0)‖ +
          ‖(tail 0).eval (x 0) - x n‖ := norm_add_le _ _
    _ ≤ matrixC1EvalMajorant q E R +
        nonautonomousPadeMajorant tail a r y n :=
      add_le_add (by simpa only [norm_sub_rev] using htrunc) hpadeError
    _ = nonautonomousPadeMajorant (canonicalPadeTail a c n) a r y n +
        matrixC1EvalMajorant ((padeMatrixC1Segment a 0 n).eval c)
          (padeMatrixC1TailBound a 0 y n) R := by
      dsimp only [tail, q, E]
      ring

end ComplexTail

end

end Mandelbrot
