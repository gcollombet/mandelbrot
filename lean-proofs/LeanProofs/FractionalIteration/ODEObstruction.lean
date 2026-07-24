/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.GlobalObstruction
import Mathlib.Analysis.ODE.ExistUnique
import Mathlib.Analysis.ODE.Transform
import Mathlib.Dynamics.Flow

/-!
# Obstruction from complete autonomous ODEs

This file formalizes T5.3 without silently replacing it by the abstract group
obstruction T5.2.

The first layer assumes a globally defined integral curve through every point
and uniqueness among global integral curves.  Time translation of an
autonomous solution, followed by uniqueness, gives the group law.  The second
layer obtains uniqueness from Mathlib's global ODE uniqueness theorem for a
Lipschitz vector field.  Global existence remains explicit: regularity alone
must not be confused with completeness.
-/

namespace Mandelbrot

noncomputable section

open Function Set
open scoped NNReal

/-- A chosen global integral curve through every point of an autonomous
vector field.  This structure records completeness, but not uniqueness. -/
structure CompleteAutonomousODE
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    (v : E → E) where
  solution : E → ℝ → E
  initial : ∀ x, solution x 0 = x
  integral :
    ∀ x, IsIntegralCurve (solution x) (fun _ : ℝ ↦ v)

/-- A complete autonomous ODE together with uniqueness of every global
solution from its initial value. -/
structure CompleteUniqueAutonomousODE
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    (v : E → E) where
  solution : E → ℝ → E
  initial : ∀ x, solution x 0 = x
  integral :
    ∀ x, IsIntegralCurve (solution x) (fun _ : ℝ ↦ v)
  unique :
    ∀ (x : E) (γ : ℝ → E),
      γ 0 = x →
      IsIntegralCurve γ (fun _ : ℝ ↦ v) →
      γ = solution x

namespace CompleteUniqueAutonomousODE

/-- The time-`t` map selected by the global solution family. -/
def timeMap
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {v : E → E} (ode : CompleteUniqueAutonomousODE v)
    (t : ℝ) (x : E) : E :=
  ode.solution x t

@[simp] theorem timeMap_zero
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {v : E → E} (ode : CompleteUniqueAutonomousODE v)
    (x : E) :
    ode.timeMap 0 x = x :=
  ode.initial x

/-- Time translation preserves an autonomous ODE.  Uniqueness then identifies
the shifted curve with the solution starting at the intermediate point. -/
theorem timeMap_add
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {v : E → E} (ode : CompleteUniqueAutonomousODE v)
    (s t : ℝ) (x : E) :
    ode.timeMap (s + t) x =
      ode.timeMap s (ode.timeMap t x) := by
  have hshift :
      IsIntegralCurve
        (fun r : ℝ ↦ ode.solution x (r + t))
        (fun _ : ℝ ↦ v) := by
    simpa [Function.comp_def] using
      (ode.integral x).comp_add t
  have hinitial :
      (fun r : ℝ ↦ ode.solution x (r + t)) 0 =
        ode.solution x t := by
    simp
  have heq :
      (fun r : ℝ ↦ ode.solution x (r + t)) =
        ode.solution (ode.solution x t) :=
    ode.unique (ode.solution x t)
      (fun r : ℝ ↦ ode.solution x (r + t))
      hinitial hshift
  simpa [timeMap] using congrFun heq s

/-- The negative-time map is a left inverse of the time-`t` map. -/
theorem timeMap_leftInverse
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {v : E → E} (ode : CompleteUniqueAutonomousODE v)
    (t : ℝ) :
    LeftInverse (ode.timeMap (-t)) (ode.timeMap t) := by
  intro x
  rw [← ode.timeMap_add]
  simp

/-- The negative-time map is also a right inverse. -/
theorem timeMap_rightInverse
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {v : E → E} (ode : CompleteUniqueAutonomousODE v)
    (t : ℝ) :
    RightInverse (ode.timeMap (-t)) (ode.timeMap t) := by
  intro x
  rw [← ode.timeMap_add]
  simp

/-- Every time map of a complete unique autonomous ODE is bijective. -/
theorem timeMap_bijective
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {v : E → E} (ode : CompleteUniqueAutonomousODE v)
    (t : ℝ) :
    Bijective (ode.timeMap t) :=
  ⟨(ode.timeMap_leftInverse t).injective,
    (ode.timeMap_rightInverse t).surjective⟩

end CompleteUniqueAutonomousODE

namespace CompleteAutonomousODE

/-- Mathlib's global uniqueness theorem upgrades a complete solution family
for a globally Lipschitz autonomous vector field to a complete unique ODE.

The completeness hypothesis is intentionally retained: this theorem uses
Lipschitz regularity to discharge uniqueness, not to hide global existence. -/
def withLipschitzUniqueness
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {v : E → E} (ode : CompleteAutonomousODE v)
    (K : ℝ≥0) (hv : LipschitzWith K v) :
    CompleteUniqueAutonomousODE v where
  solution := ode.solution
  initial := ode.initial
  integral := ode.integral
  unique := by
    intro x γ hinitial hγ
    apply ODE_solution_unique_univ
      (K := K) (s := fun _ : ℝ ↦ Set.univ)
      (v := fun _ : ℝ ↦ v) (t₀ := 0)
    · intro _t
      exact hv.lipschitzOnWith
    · intro t
      exact ⟨hγ t, Set.mem_univ _⟩
    · intro t
      exact ⟨ode.integral x t, Set.mem_univ _⟩
    · exact hinitial.trans (ode.initial x).symm

end CompleteAutonomousODE

/-- T5.3 in its minimal ODE form: no complete autonomous ODE with unique
global solutions can have `z ↦ z²+c` as its time-one map. -/
theorem no_complete_unique_autonomous_ode_time_one_quad
    (c : ℂ) :
    ¬ ∃ (v : ℂ → ℂ) (ode : CompleteUniqueAutonomousODE v),
        ode.timeMap 1 = quad c := by
  rintro ⟨v, ode, hone⟩
  have hinjective : Injective (ode.timeMap 1) :=
    (ode.timeMap_bijective 1).injective
  rw [hone] at hinjective
  exact quad_not_injective c hinjective

/-- Concrete Lipschitz corollary.  Global existence is still explicit through
`CompleteAutonomousODE`; the Lipschitz condition supplies uniqueness. -/
theorem no_complete_lipschitz_autonomous_ode_time_one_quad
    (c : ℂ) :
    ¬ ∃ (v : ℂ → ℂ) (ode : CompleteAutonomousODE v)
        (K : ℝ≥0),
        LipschitzWith K v ∧
          (fun z : ℂ ↦ ode.solution z 1) = quad c := by
  rintro ⟨v, ode, K, hv, hone⟩
  let uniqueODE : CompleteUniqueAutonomousODE v :=
    ode.withLipschitzUniqueness K hv
  apply no_complete_unique_autonomous_ode_time_one_quad c
  refine ⟨v, uniqueODE, ?_⟩
  change (fun z : ℂ ↦ ode.solution z 1) = quad c
  exact hone

/-- The already-packaged topological-flow version.  Mathlib supplies the
inverse time map as a homeomorphism. -/
theorem no_real_flow_time_one_quad
    (c : ℂ) :
    ¬ ∃ flow : Flow ℝ ℂ, flow 1 = quad c := by
  rintro ⟨flow, hone⟩
  have hinjective : Injective (flow 1) :=
    (flow.toHomeomorph 1).injective
  rw [hone] at hinjective
  exact quad_not_injective c hinjective

end

end Mandelbrot
