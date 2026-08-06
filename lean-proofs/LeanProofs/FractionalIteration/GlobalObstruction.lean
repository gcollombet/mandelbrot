/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Basic

/-!
# Obstruction to a global real-time flow

A composition law indexed by every real time forces all time maps to be
bijective.  Since `z ↦ z² + c` is not injective on `ℂ`, it cannot be the
time-one map of such a global group.
-/

namespace Mandelbrot

open Function

theorem real_group_bijective
    {X : Type*} (F : ℝ → X → X)
    (hzero : F 0 = id)
    (hadd : ∀ s t, F (s + t) = F s ∘ F t) :
    ∀ t, Function.Bijective (F t) := by
  intro t
  have hleft : Function.LeftInverse (F (-t)) (F t) := by
    intro x
    have h := congrFun (hadd (-t) t) x
    simpa [hzero] using h.symm
  have hright : Function.RightInverse (F (-t)) (F t) := by
    intro x
    have h := congrFun (hadd t (-t)) x
    simpa [hzero] using h.symm
  exact ⟨hleft.injective, hright.surjective⟩

theorem no_global_real_group
    (c : ℂ) :
    ¬ ∃ F : ℝ → ℂ → ℂ,
        F 0 = id ∧
        (∀ s t, F (s + t) = F s ∘ F t) ∧
        F 1 = quad c := by
  rintro ⟨F, hzero, hadd, hone⟩
  have hinjective : Function.Injective (F 1) :=
    (real_group_bijective F hzero hadd 1).1
  rw [hone] at hinjective
  exact quad_not_injective c hinjective

end Mandelbrot
