/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Jets
import Mathlib.Analysis.Complex.Norm
import Mathlib.Tactic.Ring

/-!
# Exact Mandelbrot perturbation and Zhuoran rebasing

This file closes the semantic gap between the full Mandelbrot orbit and the
perturbation recurrence used by the runtime.  A runtime state represents its
physical value as `reference[refIndex] + dz`.  An exact perturbation step
increments both the total iteration and the reference index; a Zhuoran rebase
keeps the total iteration fixed, moves the full physical value into `dz`, and
resets the reference index to zero.

The main results prove that

* the usual perturbation recurrence is exactly the difference of the pixel and
  reference Mandelbrot steps;
* exact steps and rebases preserve the represented physical orbit;
* first and second parameter derivatives are unchanged by a rebase;
* the Zhuoran guard strictly decreases the perturbation norm;
* any finite interleaving of exact steps and rebases preserves value and
  derivative semantics.

As elsewhere in this project, these are exact-arithmetic statements.  They do
not model floating-point rounding.
-/

namespace Mandelbrot

noncomputable section

section Algebra

variable {R : Type*} [Field R]

/-- One full Mandelbrot step `z ↦ z²+c`. -/
def mandelbrotStep (c z : R) : R := z ^ 2 + c

/-- The perturbation recurrence is exactly the difference between a pixel
step at parameter `C+dc` and its reference step at parameter `C`. -/
theorem mandelbrot_perturbation_identity (Z dz C dc : R) :
    mandelbrotStep (C + dc) (Z + dz) - mandelbrotStep C Z =
      exactStep (2 * Z) dz dc := by
  simp only [mandelbrotStep, exactStep]
  ring

/-- Recombined form used by the runtime invariant. -/
theorem mandelbrot_reference_add_exactStep (Z dz C dc : R) :
    mandelbrotStep C Z + exactStep (2 * Z) dz dc =
      mandelbrotStep (C + dc) (Z + dz) := by
  have h := mandelbrot_perturbation_identity Z dz C dc
  rw [← h]
  ring

/-- Runtime perturbation state.  `iter` is the physical Mandelbrot iteration;
`refIndex` is independently reset by rebasing.  `der` and `secondDer` are the
first and second derivatives with respect to the pixel-parameter offset. -/
structure PerturbationState (R : Type*) where
  iter : ℕ
  refIndex : ℕ
  dz : R
  der : R
  secondDer : R

/-- Physical complex value represented by a perturbation state. -/
def PerturbationState.fullValue
    (reference : ℕ → R) (s : PerturbationState R) : R :=
  reference s.refIndex + s.dz

/-- The state represents the pixel orbit at its total iteration count. -/
def PerturbationState.RepresentsValue
    (reference pixel : ℕ → R) (s : PerturbationState R) : Prop :=
  s.fullValue reference = pixel s.iter

/-- The stored first derivative represents the pixel-orbit derivative. -/
def PerturbationState.RepresentsDerivative
    (pixelDer : ℕ → R) (s : PerturbationState R) : Prop :=
  s.der = pixelDer s.iter

/-- The stored second derivative represents the pixel-orbit second derivative. -/
def PerturbationState.RepresentsSecondDerivative
    (pixelSecondDer : ℕ → R) (s : PerturbationState R) : Prop :=
  s.secondDer = pixelSecondDer s.iter

/-- Complete runtime representation invariant. -/
def PerturbationState.Correct
    (reference pixel pixelDer pixelSecondDer : ℕ → R)
    (s : PerturbationState R) : Prop :=
  s.RepresentsValue reference pixel ∧
    s.RepresentsDerivative pixelDer ∧
    s.RepresentsSecondDerivative pixelSecondDer

/-- Canonical state before the first Mandelbrot iteration. -/
def PerturbationState.initial : PerturbationState R where
  iter := 0
  refIndex := 0
  dz := 0
  der := 0
  secondDer := 0

/-- The canonical state represents reference and pixel orbits which both
start at zero, together with their zero initial parameter derivatives. -/
theorem PerturbationState.initial_correct
    (reference pixel pixelDer pixelSecondDer : ℕ → R)
    (href0 : reference 0 = 0) (hpixel0 : pixel 0 = 0)
    (hder0 : pixelDer 0 = 0) (hsecond0 : pixelSecondDer 0 = 0) :
    (PerturbationState.initial : PerturbationState R).Correct
      reference pixel pixelDer pixelSecondDer := by
  constructor
  · simp [PerturbationState.RepresentsValue, PerturbationState.fullValue,
      PerturbationState.initial, href0, hpixel0]
  · constructor
    · simpa [PerturbationState.RepresentsDerivative,
        PerturbationState.initial] using hder0.symm
    · simpa [PerturbationState.RepresentsSecondDerivative,
        PerturbationState.initial] using hsecond0.symm

/-- One exact runtime perturbation step.  The derivative recurrences use the
old full value and old derivatives, matching the CPU and WGSL order. -/
def PerturbationState.exactRuntimeStep
    (reference : ℕ → R) (dc : R) (s : PerturbationState R) :
    PerturbationState R where
  iter := s.iter + 1
  refIndex := s.refIndex + 1
  dz := exactStep (2 * reference s.refIndex) s.dz dc
  der := 2 * s.fullValue reference * s.der + 1
  secondDer := 2 * (s.der ^ 2 + s.fullValue reference * s.secondDer)

/-- Zhuoran rebasing is a change of representation only: move the physical
value into `dz`, reset the reference index, and keep iteration and derivatives. -/
def PerturbationState.rebase
    (reference : ℕ → R) (s : PerturbationState R) : PerturbationState R :=
  { s with
    refIndex := 0
    dz := s.fullValue reference }

/-- An exact perturbation step reconstructs the full pixel step. -/
theorem PerturbationState.fullValue_exactRuntimeStep
    (reference : ℕ → R) (C dc : R) (s : PerturbationState R)
    (href : ∀ n, reference (n + 1) = mandelbrotStep C (reference n)) :
    (s.exactRuntimeStep reference dc).fullValue reference =
      mandelbrotStep (C + dc) (s.fullValue reference) := by
  rw [PerturbationState.fullValue, PerturbationState.exactRuntimeStep]
  change reference (s.refIndex + 1) +
      exactStep (2 * reference s.refIndex) s.dz dc =
    mandelbrotStep (C + dc) (reference s.refIndex + s.dz)
  rw [href]
  exact mandelbrot_reference_add_exactStep
    (reference s.refIndex) s.dz C dc

/-- One exact step preserves the value representation invariant. -/
theorem PerturbationState.exactRuntimeStep_preserves_value
    (reference pixel : ℕ → R) (C dc : R) (s : PerturbationState R)
    (href : ∀ n, reference (n + 1) = mandelbrotStep C (reference n))
    (hpixel : ∀ n, pixel (n + 1) = mandelbrotStep (C + dc) (pixel n))
    (hs : s.RepresentsValue reference pixel) :
    (s.exactRuntimeStep reference dc).RepresentsValue reference pixel := by
  unfold PerturbationState.RepresentsValue at hs ⊢
  rw [PerturbationState.fullValue_exactRuntimeStep reference C dc s href]
  change mandelbrotStep (C + dc) (s.fullValue reference) = pixel (s.iter + 1)
  rw [hs, hpixel]

/-- One exact step preserves the first-derivative representation. -/
theorem PerturbationState.exactRuntimeStep_preserves_derivative
    (reference pixel pixelDer : ℕ → R) (dc : R)
    (s : PerturbationState R)
    (hvalue : s.RepresentsValue reference pixel)
    (hder : s.RepresentsDerivative pixelDer)
    (hpixelDer : ∀ n,
      pixelDer (n + 1) = 2 * pixel n * pixelDer n + 1) :
    (s.exactRuntimeStep reference dc).RepresentsDerivative pixelDer := by
  unfold PerturbationState.RepresentsValue at hvalue
  unfold PerturbationState.RepresentsDerivative at hder ⊢
  change 2 * s.fullValue reference * s.der + 1 = pixelDer (s.iter + 1)
  rw [hpixelDer, hvalue, hder]

/-- One exact step preserves the second-derivative representation. -/
theorem PerturbationState.exactRuntimeStep_preserves_secondDerivative
    (reference pixel pixelDer pixelSecondDer : ℕ → R) (dc : R)
    (s : PerturbationState R)
    (hvalue : s.RepresentsValue reference pixel)
    (hder : s.RepresentsDerivative pixelDer)
    (hsecond : s.RepresentsSecondDerivative pixelSecondDer)
    (hpixelSecond : ∀ n,
      pixelSecondDer (n + 1) =
        2 * (pixelDer n ^ 2 + pixel n * pixelSecondDer n)) :
    (s.exactRuntimeStep reference dc).RepresentsSecondDerivative pixelSecondDer := by
  unfold PerturbationState.RepresentsValue at hvalue
  unfold PerturbationState.RepresentsDerivative at hder
  unfold PerturbationState.RepresentsSecondDerivative at hsecond ⊢
  change 2 * (s.der ^ 2 + s.fullValue reference * s.secondDer) =
    pixelSecondDer (s.iter + 1)
  rw [hpixelSecond, hvalue, hder, hsecond]

/-- A rebase preserves the represented physical value exactly. -/
theorem PerturbationState.fullValue_rebase
    (reference : ℕ → R) (s : PerturbationState R)
    (href0 : reference 0 = 0) :
    (s.rebase reference).fullValue reference = s.fullValue reference := by
  simp [PerturbationState.rebase, PerturbationState.fullValue, href0]

/-- A rebase preserves the total iteration counter. -/
@[simp] theorem PerturbationState.rebase_iter
    (reference : ℕ → R) (s : PerturbationState R) :
    (s.rebase reference).iter = s.iter := rfl

/-- A rebase resets the reference index. -/
@[simp] theorem PerturbationState.rebase_refIndex
    (reference : ℕ → R) (s : PerturbationState R) :
    (s.rebase reference).refIndex = 0 := rfl

/-- A rebase leaves the first parameter derivative unchanged. -/
@[simp] theorem PerturbationState.rebase_derivative
    (reference : ℕ → R) (s : PerturbationState R) :
    (s.rebase reference).der = s.der := rfl

/-- A rebase leaves the second parameter derivative unchanged. -/
@[simp] theorem PerturbationState.rebase_secondDerivative
    (reference : ℕ → R) (s : PerturbationState R) :
    (s.rebase reference).secondDer = s.secondDer := rfl

/-- Rebasing preserves the value representation invariant. -/
theorem PerturbationState.rebase_preserves_value
    (reference pixel : ℕ → R) (s : PerturbationState R)
    (href0 : reference 0 = 0)
    (hs : s.RepresentsValue reference pixel) :
    (s.rebase reference).RepresentsValue reference pixel := by
  unfold PerturbationState.RepresentsValue at hs ⊢
  rw [PerturbationState.fullValue_rebase reference s href0]
  simpa using hs

/-- Rebasing preserves the first-derivative representation invariant. -/
theorem PerturbationState.rebase_preserves_derivative
    (reference pixelDer : ℕ → R) (s : PerturbationState R)
    (hs : s.RepresentsDerivative pixelDer) :
    (s.rebase reference).RepresentsDerivative pixelDer := by
  simpa [PerturbationState.RepresentsDerivative] using hs

/-- Rebasing preserves the second-derivative representation invariant. -/
theorem PerturbationState.rebase_preserves_secondDerivative
    (reference pixelSecondDer : ℕ → R) (s : PerturbationState R)
    (hs : s.RepresentsSecondDerivative pixelSecondDer) :
    (s.rebase reference).RepresentsSecondDerivative pixelSecondDer := by
  simpa [PerturbationState.RepresentsSecondDerivative] using hs

/-- The next exact step after a rebase acts on the same physical value. -/
theorem PerturbationState.fullValue_exactRuntimeStep_after_rebase
    (reference : ℕ → R) (C dc : R) (s : PerturbationState R)
    (href0 : reference 0 = 0)
    (href : ∀ n, reference (n + 1) = mandelbrotStep C (reference n)) :
    ((s.rebase reference).exactRuntimeStep reference dc).fullValue reference =
      mandelbrotStep (C + dc) (s.fullValue reference) := by
  rw [PerturbationState.fullValue_exactRuntimeStep reference C dc _ href]
  rw [PerturbationState.fullValue_rebase reference s href0]

/-! ## Arbitrary finite interleavings -/

/-- Runtime actions whose exact semantics are independent of the guard which
chooses when to rebase. -/
inductive PerturbationAction where
  | step
  | rebase
  deriving DecidableEq, Repr

def PerturbationAction.apply
    (reference : ℕ → R) (dc : R) (action : PerturbationAction)
    (s : PerturbationState R) : PerturbationState R :=
  match action with
  | .step => s.exactRuntimeStep reference dc
  | .rebase => s.rebase reference

def PerturbationAction.run
    (reference : ℕ → R) (dc : R) (actions : List PerturbationAction)
    (s : PerturbationState R) : PerturbationState R :=
  actions.foldl (fun state action => action.apply reference dc state) s

/-- Either elementary runtime action preserves the complete representation
invariant.  A rebase may be taken at any time; the Zhuoran guard is an
optimization criterion, not a correctness hypothesis. -/
theorem PerturbationAction.apply_preserves_correct
    (reference pixel pixelDer pixelSecondDer : ℕ → R)
    (C dc : R) (action : PerturbationAction) (s : PerturbationState R)
    (href0 : reference 0 = 0)
    (href : ∀ n, reference (n + 1) = mandelbrotStep C (reference n))
    (hpixel : ∀ n, pixel (n + 1) = mandelbrotStep (C + dc) (pixel n))
    (hpixelDer : ∀ n, pixelDer (n + 1) = 2 * pixel n * pixelDer n + 1)
    (hpixelSecond : ∀ n, pixelSecondDer (n + 1) =
      2 * (pixelDer n ^ 2 + pixel n * pixelSecondDer n))
    (hs : s.Correct reference pixel pixelDer pixelSecondDer) :
    (action.apply reference dc s).Correct
      reference pixel pixelDer pixelSecondDer := by
  rcases hs with ⟨hvalue, hder, hsecond⟩
  cases action with
  | step =>
      exact ⟨
        s.exactRuntimeStep_preserves_value reference pixel C dc href hpixel hvalue,
        s.exactRuntimeStep_preserves_derivative reference pixel pixelDer dc
          hvalue hder hpixelDer,
        s.exactRuntimeStep_preserves_secondDerivative
          reference pixel pixelDer pixelSecondDer dc
          hvalue hder hsecond hpixelSecond⟩
  | rebase =>
      exact ⟨
        s.rebase_preserves_value reference pixel href0 hvalue,
        s.rebase_preserves_derivative reference pixelDer hder,
        s.rebase_preserves_secondDerivative reference pixelSecondDer hsecond⟩

/-- Any finite interleaving of exact perturbation steps and arbitrary rebases
preserves the physical value and its first two parameter derivatives. -/
theorem PerturbationAction.run_preserves_correct
    (reference pixel pixelDer pixelSecondDer : ℕ → R)
    (C dc : R) (actions : List PerturbationAction) (s : PerturbationState R)
    (href0 : reference 0 = 0)
    (href : ∀ n, reference (n + 1) = mandelbrotStep C (reference n))
    (hpixel : ∀ n, pixel (n + 1) = mandelbrotStep (C + dc) (pixel n))
    (hpixelDer : ∀ n, pixelDer (n + 1) = 2 * pixel n * pixelDer n + 1)
    (hpixelSecond : ∀ n, pixelSecondDer (n + 1) =
      2 * (pixelDer n ^ 2 + pixel n * pixelSecondDer n))
    (hs : s.Correct reference pixel pixelDer pixelSecondDer) :
    (PerturbationAction.run reference dc actions s).Correct
      reference pixel pixelDer pixelSecondDer := by
  unfold PerturbationAction.run
  induction actions generalizing s with
  | nil => simpa using hs
  | cons action actions ih =>
      simp only [List.foldl_cons]
      apply ih
      exact action.apply_preserves_correct
        reference pixel pixelDer pixelSecondDer C dc s
        href0 href hpixel hpixelDer hpixelSecond hs

/-- End-to-end exact perturbation/rebasing theorem from the canonical initial
state.  The action list may contain arbitrarily many rebases at arbitrary
positions. -/
theorem PerturbationAction.run_initial_correct
    (reference pixel pixelDer pixelSecondDer : ℕ → R)
    (C dc : R) (actions : List PerturbationAction)
    (href0 : reference 0 = 0) (hpixel0 : pixel 0 = 0)
    (hder0 : pixelDer 0 = 0) (hsecond0 : pixelSecondDer 0 = 0)
    (href : ∀ n, reference (n + 1) = mandelbrotStep C (reference n))
    (hpixel : ∀ n, pixel (n + 1) = mandelbrotStep (C + dc) (pixel n))
    (hpixelDer : ∀ n, pixelDer (n + 1) = 2 * pixel n * pixelDer n + 1)
    (hpixelSecond : ∀ n, pixelSecondDer (n + 1) =
      2 * (pixelDer n ^ 2 + pixel n * pixelSecondDer n)) :
    (PerturbationAction.run reference dc actions
        (PerturbationState.initial : PerturbationState R)).Correct
      reference pixel pixelDer pixelSecondDer := by
  apply PerturbationAction.run_preserves_correct
    reference pixel pixelDer pixelSecondDer C dc actions
      (PerturbationState.initial : PerturbationState R)
      href0 href hpixel hpixelDer hpixelSecond
  exact PerturbationState.initial_correct
    reference pixel pixelDer pixelSecondDer href0 hpixel0 hder0 hsecond0

end Algebra

/-! ## Norm guard and runtime observables over the complex numbers -/

section Complex

open Complex

/-! ## Certified approximate jumps and rebasing -/

/-- Value-error invariant for a possibly approximate runtime state.  Unlike
`RepresentsValue`, this is suitable for Padé/jet jumps with a nonzero proof
budget. -/
def PerturbationState.ValueWithin
    (reference pixel : ℕ → ℂ) (eps : ℝ) (s : PerturbationState ℂ) : Prop :=
  ‖s.fullValue reference - pixel s.iter‖ ≤ eps

/-- Joint value/first-derivative/second-derivative error invariant. -/
def PerturbationState.DifferentialWithin
    (reference pixel pixelDer pixelSecondDer : ℕ → ℂ)
    (epsValue epsDer epsSecond : ℝ) (s : PerturbationState ℂ) : Prop :=
  s.ValueWithin reference pixel epsValue ∧
    ‖s.der - pixelDer s.iter‖ ≤ epsDer ∧
    ‖s.secondDer - pixelSecondDer s.iter‖ ≤ epsSecond

/-- A rebase preserves any certified value-error budget exactly: it introduces
zero extra analytic error. -/
theorem PerturbationState.rebase_preserves_valueWithin
    (reference pixel : ℕ → ℂ) (eps : ℝ) (s : PerturbationState ℂ)
    (href0 : reference 0 = 0)
    (hs : s.ValueWithin reference pixel eps) :
    (s.rebase reference).ValueWithin reference pixel eps := by
  unfold PerturbationState.ValueWithin at hs ⊢
  rw [PerturbationState.fullValue_rebase reference s href0]
  simpa using hs

/-- Rebasing also adds zero error to the two derivative channels. -/
theorem PerturbationState.rebase_preserves_differentialWithin
    (reference pixel pixelDer pixelSecondDer : ℕ → ℂ)
    (epsValue epsDer epsSecond : ℝ) (s : PerturbationState ℂ)
    (href0 : reference 0 = 0)
    (hs : s.DifferentialWithin reference pixel pixelDer pixelSecondDer
      epsValue epsDer epsSecond) :
    (s.rebase reference).DifferentialWithin
      reference pixel pixelDer pixelSecondDer epsValue epsDer epsSecond := by
  rcases hs with ⟨hvalue, hder, hsecond⟩
  refine ⟨s.rebase_preserves_valueWithin reference pixel epsValue href0 hvalue,
    ?_, ?_⟩
  · simpa only [PerturbationState.rebase_derivative,
      PerturbationState.rebase_iter] using hder
  · simpa only [PerturbationState.rebase_secondDerivative,
      PerturbationState.rebase_iter] using hsecond

/-- A transition certificate is deliberately independent of the algorithm
which selects the transition.  Affine, Padé, jet, and exact fallback steps can
therefore be composed by the same theorem. -/
def PerturbationState.CertifiedTransition
    (reference pixel : ℕ → ℂ) (epsIn epsOut : ℝ)
    (transition : PerturbationState ℂ → PerturbationState ℂ) : Prop :=
  ∀ s, s.ValueWithin reference pixel epsIn →
    (transition s).ValueWithin reference pixel epsOut

/-- Rebase is a zero-cost edge in the graph of certified approximate jumps. -/
theorem PerturbationState.rebase_certifiedTransition
    (reference pixel : ℕ → ℂ) (eps : ℝ) (href0 : reference 0 = 0) :
    PerturbationState.CertifiedTransition reference pixel eps eps
      (PerturbationState.rebase reference) := by
  intro s hs
  exact s.rebase_preserves_valueWithin reference pixel eps href0 hs

/-- Sequential composition of two certified jumps composes their budgets.
This is the formal rule needed when `auto` chooses one tier, rebases, then
continues with another tier. -/
theorem PerturbationState.CertifiedTransition.comp
    (reference pixel : ℕ → ℂ) (eps₀ eps₁ eps₂ : ℝ)
    (first second : PerturbationState ℂ → PerturbationState ℂ)
    (hfirst : PerturbationState.CertifiedTransition
      reference pixel eps₀ eps₁ first)
    (hsecond : PerturbationState.CertifiedTransition
      reference pixel eps₁ eps₂ second) :
    PerturbationState.CertifiedTransition reference pixel eps₀ eps₂
      (fun s => second (first s)) := by
  intro s hs
  exact hsecond (first s) (hfirst s hs)

/-- Rebasing immediately after any certified jump leaves its output budget
unchanged. -/
theorem PerturbationState.CertifiedTransition.then_rebase
    (reference pixel : ℕ → ℂ) (epsIn epsOut : ℝ)
    (jump : PerturbationState ℂ → PerturbationState ℂ)
    (href0 : reference 0 = 0)
    (hjump : PerturbationState.CertifiedTransition
      reference pixel epsIn epsOut jump) :
    PerturbationState.CertifiedTransition reference pixel epsIn epsOut
      (fun s => (jump s).rebase reference) := by
  exact PerturbationState.CertifiedTransition.comp
    reference pixel epsIn epsOut epsOut jump
    (PerturbationState.rebase reference) hjump
    (PerturbationState.rebase_certifiedTransition reference pixel epsOut href0)

/-- The Zhuoran guard guarantees that rebasing strictly decreases the stored
perturbation magnitude. -/
theorem PerturbationState.rebase_guard_decreases_delta
    (reference : ℕ → ℂ) (s : PerturbationState ℂ)
    (hguard : ‖s.fullValue reference‖ < ‖s.dz‖) :
    ‖(s.rebase reference).dz‖ < ‖s.dz‖ := by
  simpa [PerturbationState.rebase] using hguard

/-- The norm of the physical value is unchanged by rebasing. -/
theorem PerturbationState.norm_fullValue_rebase
    (reference : ℕ → ℂ) (s : PerturbationState ℂ)
    (href0 : reference 0 = 0) :
    ‖(s.rebase reference).fullValue reference‖ =
      ‖s.fullValue reference‖ := by
  rw [PerturbationState.fullValue_rebase reference s href0]

/-- Any bailout predicate depending only on the physical norm is invariant
under rebasing. -/
theorem PerturbationState.rebase_preserves_bailout
    (reference : ℕ → ℂ) (s : PerturbationState ℂ)
    (href0 : reference 0 = 0) (bailout : ℝ) :
    (bailout < ‖(s.rebase reference).fullValue reference‖ ↔
      bailout < ‖s.fullValue reference‖) := by
  rw [PerturbationState.norm_fullValue_rebase reference s href0]

/-- Smooth iteration, coloring, or any other observable of the physical value
is unchanged by a rebase. -/
theorem PerturbationState.rebase_preserves_value_observable
    {X : Type*} (reference : ℕ → ℂ) (s : PerturbationState ℂ)
    (href0 : reference 0 = 0) (observable : ℂ → X) :
    observable ((s.rebase reference).fullValue reference) =
      observable (s.fullValue reference) := by
  rw [PerturbationState.fullValue_rebase reference s href0]

/-- Distance estimation and analytic-AA observables may depend on the physical
value and its first two parameter derivatives; all three are unchanged by a
rebase. -/
theorem PerturbationState.rebase_preserves_differential_observable
    {X : Type*} (reference : ℕ → ℂ) (s : PerturbationState ℂ)
    (href0 : reference 0 = 0) (observable : ℂ → ℂ → ℂ → X) :
    observable ((s.rebase reference).fullValue reference)
        (s.rebase reference).der (s.rebase reference).secondDer =
      observable (s.fullValue reference) s.der s.secondDer := by
  rw [PerturbationState.fullValue_rebase reference s href0]
  rfl

end Complex

end

end Mandelbrot
