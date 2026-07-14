/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.PhaseAwareTransport
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# Renormalized phase-aware transports

This file formalizes the algebra needed for scale-changing jumps.  Given
invertible projective gauges `S_j`, a block `M_j` is stored as

`S_(j+1) ∘ M_j ∘ S_j⁻¹`.

The inverse is represented by the adjugate.  Consecutive gauges cancel up to
their nonzero determinants, hence only an irrelevant projective scalar remains.
The result is proved for two blocks and for an arbitrary finite chain, including
an independent nonzero scalar normalization at every block.

This is the rigorous algebraic core required by a Feigenbaum-style hierarchy.
It does not assert that a universal renormalization fixed point exists for a
given Mandelbrot reference; such an analytic/dynamical recognition theorem is
a separate obligation.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set Function

/-! ## Projective matrix algebra -/

@[simp] theorem Homography.comp_one (m : Homography ℂ) :
    m.comp Homography.one = m := by
  ext <;> simp [Homography.comp, Homography.one]

@[simp] theorem Homography.one_comp (m : Homography ℂ) :
    Homography.one.comp m = m := by
  ext <;> simp [Homography.comp, Homography.one]

theorem Homography.comp_assoc (a b c : Homography ℂ) :
    (a.comp b).comp c = a.comp (b.comp c) := by
  ext <;> simp [Homography.comp] <;> ring

@[simp] theorem Homography.scale_one (m : Homography ℂ) :
    Homography.scale 1 m = m := by
  ext <;> simp [Homography.scale]

theorem Homography.scale_scale (s t : ℂ) (m : Homography ℂ) :
    Homography.scale s (Homography.scale t m) =
      Homography.scale (s * t) m := by
  ext <;> simp [Homography.scale] <;> ring

theorem Homography.scale_comp_left
    (s : ℂ) (outer inner : Homography ℂ) :
    (Homography.scale s outer).comp inner =
      Homography.scale s (outer.comp inner) := by
  ext <;> simp [Homography.scale, Homography.comp] <;> ring

theorem Homography.scale_comp_right
    (s : ℂ) (outer inner : Homography ℂ) :
    outer.comp (Homography.scale s inner) =
      Homography.scale s (outer.comp inner) := by
  ext <;> simp [Homography.scale, Homography.comp] <;> ring

@[simp] theorem Homography.det_adjugate (m : Homography ℂ) :
    m.adjugate.det = m.det := by
  simp [Homography.adjugate, Homography.det]
  ring

/-! ## One renormalized block and its merge -/

/-- Matrix of a block in changing projective coordinates.  The adjugate is a
projective inverse; its extra determinant scalar is deliberately retained. -/
def Homography.renormalize
    (inputGauge outputGauge block : Homography ℂ) : Homography ℂ :=
  outputGauge.comp (block.comp inputGauge.adjugate)

theorem Homography.det_renormalize
    (inputGauge outputGauge block : Homography ℂ) :
    (renormalize inputGauge outputGauge block).det =
      outputGauge.det * block.det * inputGauge.det := by
  simp only [Homography.renormalize, Homography.det_comp,
    Homography.det_adjugate]
  ring

/-- The middle change of scale cancels exactly, modulo its determinant. -/
theorem Homography.renormalize_comp
    (inputGauge middleGauge outputGauge outer inner : Homography ℂ) :
    (renormalize middleGauge outputGauge outer).comp
        (renormalize inputGauge middleGauge inner) =
      Homography.scale middleGauge.det
        (renormalize inputGauge outputGauge (outer.comp inner)) := by
  ext <;>
    simp [Homography.renormalize, Homography.comp, Homography.adjugate,
      Homography.scale, Homography.det] <;>
    ring

/-- At the level of the represented Möbius map, the determinant scalar from
the cancelled intermediate gauge disappears. -/
theorem Homography.eval_renormalize_comp
    (inputGauge middleGauge outputGauge outer inner : Homography ℂ)
    (z : ℂ) (hMiddle : middleGauge.det ≠ 0) :
    ((renormalize middleGauge outputGauge outer).comp
        (renormalize inputGauge middleGauge inner)).eval z =
      (renormalize inputGauge outputGauge (outer.comp inner)).eval z := by
  rw [renormalize_comp]
  exact Homography.eval_scale middleGauge.det
    (renormalize inputGauge outputGauge (outer.comp inner)) z hMiddle

/-! ## Arbitrary finite hierarchy -/

/-- Forward product of blocks `M_(n-1) ∘ ... ∘ M_0`. -/
def Homography.forwardProduct (block : ℕ → Homography ℂ) : ℕ → Homography ℂ
  | 0 => Homography.one
  | n + 1 => (block n).comp (forwardProduct block n)

/-- Product of the same blocks after a different gauge at every boundary. -/
def Homography.renormalizedProduct
    (gauge block : ℕ → Homography ℂ) : ℕ → Homography ℂ :=
  forwardProduct (fun j => renormalize (gauge j) (gauge (j + 1)) (block j))

/-- Product of determinants of the internal gauges `S_1,...,S_n`. -/
def Homography.internalGaugeScale (gauge : ℕ → Homography ℂ) : ℕ → ℂ
  | 0 => 1
  | n + 1 => internalGaugeScale gauge n * (gauge (n + 1)).det

/-- Every intermediate renormalization in a finite hierarchy telescopes.
Only the product of the internal gauge determinants remains as a projective
scalar. -/
theorem Homography.renormalizedProduct_eq_scale
    (gauge block : ℕ → Homography ℂ) : ∀ n,
    renormalizedProduct gauge block (n + 1) =
      Homography.scale (internalGaugeScale gauge n)
        (renormalize (gauge 0) (gauge (n + 1))
          (forwardProduct block (n + 1))) := by
  intro n
  induction n with
  | zero =>
      simp [renormalizedProduct, forwardProduct, internalGaugeScale]
  | succ n ih =>
      rw [show renormalizedProduct gauge block (n + 2) =
          (renormalize (gauge (n + 1)) (gauge (n + 2)) (block (n + 1))).comp
            (renormalizedProduct gauge block (n + 1)) by rfl,
        ih, Homography.scale_comp_right,
        Homography.renormalize_comp, Homography.scale_scale]
      simp only [forwardProduct, internalGaugeScale]

/-- Product of arbitrary scalar normalizations attached to each stored block. -/
def Homography.prefixScale (normalization : ℕ → ℂ) : ℕ → ℂ
  | 0 => 1
  | n + 1 => normalization n * prefixScale normalization n

/-- Per-block projective normalizations can be inserted before every merge;
they combine into one final scalar and cannot change the represented map. -/
theorem Homography.forwardProduct_scale
    (normalization : ℕ → ℂ) (block : ℕ → Homography ℂ) : ∀ n,
    forwardProduct (fun j => Homography.scale (normalization j) (block j)) n =
      Homography.scale (prefixScale normalization n) (forwardProduct block n) := by
  intro n
  induction n with
  | zero => simp [forwardProduct, prefixScale]
  | succ n ih =>
      rw [show forwardProduct
          (fun j => Homography.scale (normalization j) (block j)) (n + 1) =
          (Homography.scale (normalization n) (block n)).comp
            (forwardProduct
              (fun j => Homography.scale (normalization j) (block j)) n) by rfl,
        ih, Homography.scale_comp_right, Homography.scale_comp_left,
        Homography.scale_scale]
      simp only [prefixScale, forwardProduct]
      rw [mul_comm]

theorem Homography.renormalizedProduct_with_normalization
    (gauge block : ℕ → Homography ℂ) (normalization : ℕ → ℂ)
    (n : ℕ) :
    forwardProduct
        (fun j => Homography.scale (normalization j)
          (renormalize (gauge j) (gauge (j + 1)) (block j))) (n + 1) =
      Homography.scale
        (prefixScale normalization (n + 1) * internalGaugeScale gauge n)
        (renormalize (gauge 0) (gauge (n + 1))
          (forwardProduct block (n + 1))) := by
  rw [forwardProduct_scale]
  change Homography.scale (prefixScale normalization (n + 1))
      (renormalizedProduct gauge block (n + 1)) = _
  rw [renormalizedProduct_eq_scale, Homography.scale_scale]

theorem Homography.prefixScale_ne_zero
    (normalization : ℕ → ℂ)
    (h : ∀ j, normalization j ≠ 0) : ∀ n,
    prefixScale normalization n ≠ 0 := by
  intro n
  induction n with
  | zero => simp [prefixScale]
  | succ n ih =>
      exact mul_ne_zero (h n) ih

theorem Homography.internalGaugeScale_ne_zero
    (gauge : ℕ → Homography ℂ)
    (h : ∀ j, (gauge j).det ≠ 0) : ∀ n,
    internalGaugeScale gauge n ≠ 0 := by
  intro n
  induction n with
  | zero => simp [internalGaugeScale]
  | succ n ih =>
      exact mul_ne_zero ih (h (n + 1))

/-- Fully normalized finite hierarchy, stated at evaluation level. -/
theorem Homography.eval_renormalizedProduct_with_normalization
    (gauge block : ℕ → Homography ℂ) (normalization : ℕ → ℂ)
    (hGauge : ∀ j, (gauge j).det ≠ 0)
    (hNormalization : ∀ j, normalization j ≠ 0)
    (n : ℕ) (z : ℂ) :
    (forwardProduct
        (fun j => Homography.scale (normalization j)
          (renormalize (gauge j) (gauge (j + 1)) (block j))) (n + 1)).eval z =
      (renormalize (gauge 0) (gauge (n + 1))
        (forwardProduct block (n + 1))).eval z := by
  rw [renormalizedProduct_with_normalization]
  apply Homography.eval_scale
  exact mul_ne_zero
    (prefixScale_ne_zero normalization hNormalization (n + 1))
    (internalGaugeScale_ne_zero gauge hGauge n)

/-! ## Returning an approximate universal block to physical coordinates -/

/-- If a long block is approximated in renormalized coordinates, the error in
physical coordinates is paid only once, through the inverse gauge's exact
determinant/margin Lipschitz constant. -/
theorem Homography.norm_sub_adjugate_eval_le_of_renormalized_error
    (gauge : Homography ℂ) (normalizedFrame : DiskFrame)
    (physicalExact normalizedApprox : ℂ) (eps : ℝ)
    (hFrameR : 0 ≤ normalizedFrame.radius)
    (hGaugeDet : gauge.det ≠ 0)
    (hGaugeDen : gauge.den physicalExact ≠ 0)
    (hDelta : 0 < gauge.adjugate.diskDelta
      normalizedFrame.center normalizedFrame.radius)
    (hExactMem : gauge.eval physicalExact ∈ normalizedFrame.carrier)
    (hApproxMem : normalizedApprox ∈ normalizedFrame.carrier)
    (hError : ‖gauge.eval physicalExact - normalizedApprox‖ ≤ eps) :
    ‖physicalExact - gauge.adjugate.eval normalizedApprox‖ ≤
      gauge.adjugate.diskLipschitzBound normalizedFrame * eps := by
  have hInverse := gauge.eval_adjugate_comp physicalExact hGaugeDet hGaugeDen
  have hLip := gauge.adjugate.norm_eval_sub_eval_le_diskLipschitz
    normalizedFrame (gauge.eval physicalExact) normalizedApprox
    hFrameR hDelta hExactMem hApproxMem
  rw [hInverse] at hLip
  exact hLip.trans (mul_le_mul_of_nonneg_left hError
    (gauge.adjugate.diskLipschitzBound_nonneg normalizedFrame))

/-! ## Projective normalizations do not alter nonlinear budgets -/

/-- A separately chosen nonzero scalar normalization at every depth leaves
the entire nonlinear phase-aware budget unchanged. -/
theorem phaseAwareBudget_projective_normalization
    (frame : ℕ → DiskFrame) (actual : ℕ → ℂ → ℂ)
    (transport : ∀ j, InflatedTransport (actual j) (frame j))
    (normalization : ℕ → ℂ) (hNormalization : ∀ j, normalization j ≠ 0)
    (q : ℕ → ℝ) : ∀ n,
    phaseAwareBudget frame actual
        (fun j => (transport j).projectiveScale
          (normalization j) (hNormalization j)) q n =
      phaseAwareBudget frame actual transport q n := by
  intro n
  induction n with
  | zero => simp [phaseAwareBudget]
  | succ n ih =>
      simp only [phaseAwareBudget, hyperbolicBudget_succ]
      change pseudoAdd
          (phaseAwareLocalBudget frame actual
            (fun j => (transport j).projectiveScale
              (normalization j) (hNormalization j)) q n)
          (phaseAwareBudget frame actual
            (fun j => (transport j).projectiveScale
              (normalization j) (hNormalization j)) q n) =
        pseudoAdd (phaseAwareLocalBudget frame actual transport q n)
          (phaseAwareBudget frame actual transport q n)
      rw [ih]
      congr 1
      unfold phaseAwareLocalBudget
      exact (transport n).projectiveScale_localPseudoBudget
        (normalization n) (hNormalization n) (q (n + 1))

end

end Mandelbrot
