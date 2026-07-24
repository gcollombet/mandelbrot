/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Basic

/-!
# Fractional families transported by a conjugacy

The analytic existence of a Koenigs or Böttcher chart is deliberately
separated from the algebra performed once such a chart has been supplied.
-/

namespace Mandelbrot

noncomputable section

open Function

/-- Transport a family `M` through an equivalence of coordinate spaces. -/
def conjugateFamily
    {X Y : Type*} (e : X ≃ Y) (M : ℝ → Y → Y)
    (t : ℝ) : X → X :=
  fun x => e.symm (M t (e x))

theorem conjugateFamily_zero
    {X Y : Type*} (e : X ≃ Y) (M : ℝ → Y → Y)
    (hzero : M 0 = id) :
    conjugateFamily e M 0 = id := by
  funext x
  simp [conjugateFamily, hzero]

theorem conjugateFamily_add
    {X Y : Type*} (e : X ≃ Y) (M : ℝ → Y → Y)
    (hadd : ∀ s t, M (s + t) = M s ∘ M t) :
    ∀ s t,
      conjugateFamily e M (s + t) =
        conjugateFamily e M s ∘ conjugateFamily e M t := by
  intro s t
  funext x
  simp only [conjugateFamily, Function.comp_apply]
  rw [hadd]
  simp

/-- A time-one identity in chart coordinates descends through the chart. -/
theorem conjugateFamily_one
    {X Y : Type*} (e : X ≃ Y) (M : ℝ → Y → Y) (g : X → X)
    (hone : ∀ x, M 1 (e x) = e (g x)) :
    conjugateFamily e M 1 = g := by
  funext x
  simp [conjugateFamily, hone]

end

end Mandelbrot
