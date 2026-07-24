/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Segments

/-!
# Dynamically coherent orbit segments

This file isolates the exact identities used by the numerical dynamic-atlas
prototype.

A single seed segment can be propagated forward pointwise by `q_c`.  Unlike
independently fitted geometric connectors, the resulting family is exactly
semiconjugate from one integer interval to the next.  A segment can also be
pulled backward through any chosen inverse branch, with the branch hypotheses
kept explicit.

These constructions do not claim the full fractional-iteration law
`F_s ∘ F_t = F_(s+t)`.  They certify the weaker, but numerically useful,
phase-coherence identity

`q_c (Γ_n(s)) = Γ_(n+1)(s)`.
-/

namespace Mandelbrot

noncomputable section

/-- Propagate one seed segment through `n` applications of `q_c`. -/
def forwardPropagatedSegment
    (c : ℂ) (seed : ℝ → ℂ) (n : ℕ) (s : ℝ) : ℂ :=
  (quad c)^[n] (seed s)

@[simp] theorem forwardPropagatedSegment_zero_iterate
    (c : ℂ) (seed : ℝ → ℂ) (s : ℝ) :
    forwardPropagatedSegment c seed 0 s = seed s := by
  simp [forwardPropagatedSegment]

/-- Forward propagation is exactly coherent with the quadratic dynamics. -/
@[simp] theorem forwardPropagatedSegment_succ
    (c : ℂ) (seed : ℝ → ℂ) (n : ℕ) (s : ℝ) :
    forwardPropagatedSegment c seed (n + 1) s =
      quad c (forwardPropagatedSegment c seed n s) := by
  simpa [forwardPropagatedSegment] using
    Function.iterate_succ_apply' (quad c) n (seed s)

/-- The propagated family has zero dynamic residual at every phase. -/
theorem forwardPropagatedSegment_semiconjugate
    (c : ℂ) (seed : ℝ → ℂ) (n : ℕ) (s : ℝ) :
    quad c (forwardPropagatedSegment c seed n s) =
      forwardPropagatedSegment c seed (n + 1) s :=
  (forwardPropagatedSegment_succ c seed n s).symm

/-- A seed beginning at `z₀` gives the correct left endpoint on every
integer-orbit interval. -/
theorem forwardPropagatedSegment_left_endpoint
    (c z₀ : ℂ) (seed : ℝ → ℂ)
    (hzero : seed 0 = z₀) (n : ℕ) :
    forwardPropagatedSegment c seed n 0 = orbit c z₀ n := by
  simp [forwardPropagatedSegment, orbit, hzero]

/-- A seed ending at `q_c(z₀)` gives the correct right endpoint on every
integer-orbit interval. -/
theorem forwardPropagatedSegment_right_endpoint
    (c z₀ : ℂ) (seed : ℝ → ℂ)
    (hone : seed 1 = quad c z₀) (n : ℕ) :
    forwardPropagatedSegment c seed n 1 =
      orbit c z₀ (n + 1) := by
  rw [forwardPropagatedSegment, hone, orbit]
  exact (Function.iterate_succ_apply (quad c) n z₀).symm

/-- Pointwise pullback of a segment through a selected inverse branch. -/
def inverseBranchLift
    (branch : ℂ → ℂ) (nextSegment : ℝ → ℂ) (s : ℝ) : ℂ :=
  branch (nextSegment s)

/-- An inverse branch makes the lifted segment exactly semiconjugate to the
segment from which it was lifted. -/
theorem inverseBranchLift_semiconjugate
    (c : ℂ) (branch : ℂ → ℂ) (nextSegment : ℝ → ℂ)
    (hbranch :
      ∀ s : ℝ, quad c (branch (nextSegment s)) = nextSegment s)
    (s : ℝ) :
    quad c (inverseBranchLift branch nextSegment s) =
      nextSegment s := by
  exact hbranch s

/-- The selected branch transports the two desired orbit endpoints. -/
theorem inverseBranchLift_endpoints
    (c z₀ : ℂ) (n : ℕ)
    (branch : ℂ → ℂ) (nextSegment : ℝ → ℂ)
    (hnextZero : nextSegment 0 = orbit c z₀ (n + 1))
    (hnextOne : nextSegment 1 = orbit c z₀ (n + 2))
    (hbranchZero :
      branch (orbit c z₀ (n + 1)) = orbit c z₀ n)
    (hbranchOne :
      branch (orbit c z₀ (n + 2)) = orbit c z₀ (n + 1)) :
    inverseBranchLift branch nextSegment 0 = orbit c z₀ n ∧
      inverseBranchLift branch nextSegment 1 =
        orbit c z₀ (n + 1) := by
  constructor
  · calc
      inverseBranchLift branch nextSegment 0 =
          branch (nextSegment 0) := rfl
      _ = branch (orbit c z₀ (n + 1)) :=
        congrArg branch hnextZero
      _ = orbit c z₀ n := hbranchZero
  · calc
      inverseBranchLift branch nextSegment 1 =
          branch (nextSegment 1) := rfl
      _ = branch (orbit c z₀ (n + 2)) :=
        congrArg branch hnextOne
      _ = orbit c z₀ (n + 1) := hbranchOne

/-- Continuity is preserved when a numerical or analytic inverse branch is
continuous on the lifted path. -/
theorem continuous_inverseBranchLift
    (branch : ℂ → ℂ) (nextSegment : ℝ → ℂ)
    (hbranch : Continuous branch)
    (hnext : Continuous nextSegment) :
    Continuous (inverseBranchLift branch nextSegment) := by
  exact hbranch.comp hnext

end

end Mandelbrot
