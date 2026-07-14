/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FeigenbaumRenormalization
import Mathlib.Analysis.Complex.Basic
import Mathlib.Tactic.NormNum

/-!
# Kernel-checked rational bounds for computer-assisted proofs

External builders are allowed to discover coefficients and interval bounds,
but the durable certificate format uses rational upper endpoints only.  This
file proves the soundness of the small algebra needed to replay norm bounds:
addition, multiplication, complex products, weighted `ℓ¹` vector norms and
weighted induced matrix norms.

The final section records conservative rational envelopes of all five scalar
components of the published classical `m = 2` Feigenbaum certificate.  Their
aggregation into the `Y` and `Z` consumed by `RadiiCertificate` is checked by
the Lean kernel, with no floating-point evaluation.
-/

namespace Mandelbrot

noncomputable section

open BigOperators Complex Metric Set

/-- A nonnegative rational upper endpoint. -/
structure RatUpper where
  value : ℚ
  nonneg : 0 ≤ value

namespace RatUpper

/-- A real nonnegative quantity is enclosed by a rational upper endpoint. -/
def Holds (b : RatUpper) (x : ℝ) : Prop :=
  0 ≤ x ∧ x ≤ (b.value : ℝ)

def zero : RatUpper := ⟨0, by norm_num⟩

def add (a b : RatUpper) : RatUpper :=
  ⟨a.value + b.value, add_nonneg a.nonneg b.nonneg⟩

def mul (a b : RatUpper) : RatUpper :=
  ⟨a.value * b.value, mul_nonneg a.nonneg b.nonneg⟩

@[simp] theorem coe_add (a b : RatUpper) :
    ((a.add b).value : ℝ) = (a.value : ℝ) + (b.value : ℝ) := by
  norm_num [add]

@[simp] theorem coe_mul (a b : RatUpper) :
    ((a.mul b).value : ℝ) = (a.value : ℝ) * (b.value : ℝ) := by
  norm_num [mul]

theorem zero_holds : zero.Holds 0 := by
  simp [Holds, zero]

theorem add_holds {a b : RatUpper} {x y : ℝ}
    (hx : a.Holds x) (hy : b.Holds y) :
    (a.add b).Holds (x + y) := by
  constructor
  · exact add_nonneg hx.1 hy.1
  · rw [coe_add]
    exact add_le_add hx.2 hy.2

theorem mul_holds {a b : RatUpper} {x y : ℝ}
    (hx : a.Holds x) (hy : b.Holds y) :
    (a.mul b).Holds (x * y) := by
  constructor
  · exact mul_nonneg hx.1 hy.1
  · rw [coe_mul]
    exact mul_le_mul hx.2 hy.2 hy.1 (by exact_mod_cast a.nonneg)

/-- A rational upper bound for a complex norm. -/
def HoldsNorm (b : RatUpper) (z : ℂ) : Prop :=
  ‖z‖ ≤ (b.value : ℝ)

theorem holdsNorm_nonneg {b : RatUpper} {z : ℂ} (h : b.HoldsNorm z) :
    b.Holds ‖z‖ :=
  ⟨norm_nonneg z, h⟩

theorem add_holdsNorm {a b : RatUpper} {z w : ℂ}
    (hz : a.HoldsNorm z) (hw : b.HoldsNorm w) :
    (a.add b).HoldsNorm (z + w) := by
  rw [HoldsNorm, coe_add]
  exact (norm_add_le z w).trans (add_le_add hz hw)

theorem mul_holdsNorm {a b : RatUpper} {z w : ℂ}
    (hz : a.HoldsNorm z) (hw : b.HoldsNorm w) :
    (a.mul b).HoldsNorm (z * w) := by
  rw [HoldsNorm, norm_mul, coe_mul]
  exact mul_le_mul hz hw (norm_nonneg w) (by exact_mod_cast a.nonneg)

end RatUpper

/-! ## Weighted finite-dimensional norm checker -/

/-- Weighted `ℓ¹` norm used by the Chebyshev coefficient certificate. -/
def weightedL1 {n : ℕ} (weight : Fin n → ℝ) (x : Fin n → ℝ) : ℝ :=
  ∑ i, weight i * |x i|

theorem weightedL1_nonneg {n : ℕ} (weight : Fin n → ℝ)
    (hWeight : ∀ i, 0 ≤ weight i) (x : Fin n → ℝ) :
    0 ≤ weightedL1 weight x := by
  exact Finset.sum_nonneg fun i _ => mul_nonneg (hWeight i) (abs_nonneg _)

/-- Componentwise rational enclosures imply a weighted vector-norm bound. -/
theorem weightedL1_le_rational_bounds {n : ℕ}
    (weight : Fin n → ℝ) (hWeight : ∀ i, 0 ≤ weight i)
    (x : Fin n → ℝ) (bound : Fin n → RatUpper)
    (hBound : ∀ i, |x i| ≤ ((bound i).value : ℝ)) :
    weightedL1 weight x ≤
      ∑ i, weight i * ((bound i).value : ℝ) := by
  apply Finset.sum_le_sum
  intro i _
  exact mul_le_mul_of_nonneg_left (hBound i) (hWeight i)

/-- Matrix-vector multiplication, kept definitionally small for certificate
replay. -/
def matrixMulVec {m n : ℕ} (A : Fin m → Fin n → ℝ)
    (x : Fin n → ℝ) (i : Fin m) : ℝ :=
  ∑ j, A i j * x j

/-- A weighted column-sum check is a sound upper bound for the induced
weighted `ℓ¹` matrix norm. -/
theorem weightedL1_matrix_le {m n : ℕ}
    (outWeight : Fin m → ℝ) (inWeight : Fin n → ℝ)
    (hOutWeight : ∀ i, 0 ≤ outWeight i)
    (A : Fin m → Fin n → ℝ) (x : Fin n → ℝ) (z : ℝ)
    (hColumns : ∀ j,
      ∑ i, outWeight i * |A i j| ≤ z * inWeight j) :
    weightedL1 outWeight (matrixMulVec A x) ≤
      z * weightedL1 inWeight x := by
  calc
    weightedL1 outWeight (matrixMulVec A x) =
        ∑ i, outWeight i * |∑ j, A i j * x j| := rfl
    _ ≤ ∑ i, outWeight i * ∑ j, |A i j| * |x j| := by
      apply Finset.sum_le_sum
      intro i _
      apply mul_le_mul_of_nonneg_left _ (hOutWeight i)
      exact (Finset.abs_sum_le_sum_abs _ _).trans_eq (by
        apply Finset.sum_congr rfl
        intro j _
        rw [abs_mul])
    _ = ∑ j, (∑ i, outWeight i * |A i j|) * |x j| := by
      simp_rw [Finset.mul_sum, ← mul_assoc]
      rw [Finset.sum_comm]
      apply Finset.sum_congr rfl
      intro j _
      rw [Finset.sum_mul]
    _ ≤ ∑ j, (z * inWeight j) * |x j| := by
      apply Finset.sum_le_sum
      intro j _
      exact mul_le_mul_of_nonneg_right (hColumns j) (abs_nonneg _)
    _ = z * weightedL1 inWeight x := by
      simp_rw [weightedL1, mul_assoc]
      rw [Finset.mul_sum]

/-- The same induced-norm check when every matrix entry is supplied by a
rational absolute-value enclosure. -/
theorem weightedL1_matrix_le_rational_bounds {m n : ℕ}
    (outWeight : Fin m → ℝ) (inWeight : Fin n → ℝ)
    (hOutWeight : ∀ i, 0 ≤ outWeight i)
    (A : Fin m → Fin n → ℝ) (bound : Fin m → Fin n → RatUpper)
    (x : Fin n → ℝ) (z : ℝ)
    (hEntry : ∀ i j, |A i j| ≤ ((bound i j).value : ℝ))
    (hColumns : ∀ j,
      ∑ i, outWeight i * ((bound i j).value : ℝ) ≤ z * inWeight j) :
    weightedL1 outWeight (matrixMulVec A x) ≤
      z * weightedL1 inWeight x := by
  apply weightedL1_matrix_le outWeight inWeight hOutWeight A x z
  intro j
  apply (Finset.sum_le_sum ?_).trans (hColumns j)
  intro i _
  exact mul_le_mul_of_nonneg_left (hEntry i j) (hOutWeight i)

/-! ## Published `m = 2` component certificate -/

namespace PublishedM2RationalWitness

/-- `Y_K`, rounded upward from the reproduced interval calculation. -/
def yFinite : RatUpper :=
  ⟨9036140 / 10 ^ 31, by norm_num⟩

/-- `Y_∞`, rounded upward. -/
def yTail : RatUpper :=
  ⟨520278153 / 10 ^ 26, by norm_num⟩

/-- `Z_KK`, rounded upward. -/
def zFiniteFinite : RatUpper :=
  ⟨364457043 / 10 ^ 9, by norm_num⟩

/-- `Z_K∞`, rounded upward. -/
def zFiniteTail : RatUpper :=
  ⟨109271 / 10 ^ 11, by norm_num⟩

/-- `Z_∞`, rounded upward. -/
def zTail : RatUpper :=
  ⟨353636259 / 10 ^ 11, by norm_num⟩

def defectSum : ℝ :=
  (yFinite.value : ℝ) + (yTail.value : ℝ)

def contractionSum : NNReal :=
  ⟨(zFiniteFinite.value : ℝ) + (zFiniteTail.value : ℝ) +
      (zTail.value : ℝ), by
    exact add_nonneg
      (add_nonneg (by exact_mod_cast zFiniteFinite.nonneg)
        (by exact_mod_cast zFiniteTail.nonneg))
      (by exact_mod_cast zTail.nonneg)⟩

theorem defectSum_le_published :
    defectSum ≤ PublishedM2Certificate.defect := by
  norm_num [defectSum, yFinite, yTail, PublishedM2Certificate.defect]

theorem contractionSum_le_published :
    contractionSum ≤ PublishedM2Certificate.contraction := by
  rw [← NNReal.coe_le_coe]
  change (zFiniteFinite.value : ℝ) + (zFiniteTail.value : ℝ) +
    (zTail.value : ℝ) ≤ (PublishedM2Certificate.contraction : ℝ)
  norm_num [zFiniteFinite, zFiniteTail, zTail,
    PublishedM2Certificate.contraction]

/-- The analytic checker has exactly two semantic conclusions to emit after
replaying the finite and tail calculations.  All scalar aggregation is no
longer part of the trusted external computation. -/
structure AnalyticComponents {E : Type*} [MetricSpace E]
    (map : E → E) (center : E) where
  defect_components : dist (map center) center ≤ defectSum
  lipschitz_components :
    LipschitzOnWith contractionSum map
      (closedBall center PublishedM2Certificate.radius)

theorem AnalyticComponents.defect_bound {E : Type*} [MetricSpace E]
    {map : E → E} {center : E} (components : AnalyticComponents map center) :
    dist (map center) center ≤ PublishedM2Certificate.defect :=
  components.defect_components.trans defectSum_le_published

theorem AnalyticComponents.lipschitz_bound {E : Type*} [MetricSpace E]
    {map : E → E} {center : E} (components : AnalyticComponents map center) :
    LipschitzOnWith PublishedM2Certificate.contraction map
      (closedBall center PublishedM2Certificate.radius) :=
  components.lipschitz_components.weaken contractionSum_le_published

/-- Assemble the final rational radii certificate.  The builder/checker need
only establish the semantically meaningful finite+tail component bounds. -/
def AnalyticComponents.toRadiiCertificate {E : Type*} [MetricSpace E]
    {map : E → E} {center : E} (components : AnalyticComponents map center) :
    RadiiCertificate map :=
  PublishedM2Certificate.certificate map center
    components.defect_bound components.lipschitz_bound

end PublishedM2RationalWitness

end

end Mandelbrot
