/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.Complex.Basic
import Mathlib.Analysis.Complex.Norm
import Mathlib.Logic.Function.Iterate
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# Elementary algebra of fractional iteration

This file fixes the central definitions for the quadratic family
`q_c(z) = z² + c` and proves the exact elementary statements on which the
later fractional-iteration charts depend.
-/

namespace Mandelbrot

noncomputable section

open Function

/-- The quadratic map `q_c(z) = z² + c`. -/
def quad (c z : ℂ) : ℂ := z ^ 2 + c

/-- The integer orbit of `z₀` under `q_c`. -/
def orbit (c z₀ : ℂ) (n : ℕ) : ℂ := (quad c)^[n] z₀

@[simp] theorem orbit_zero (c z₀ : ℂ) : orbit c z₀ 0 = z₀ := by
  simp [orbit]

@[simp] theorem orbit_succ (c z₀ : ℂ) (n : ℕ) :
    orbit c z₀ (n + 1) = quad c (orbit c z₀ n) := by
  simpa [orbit] using Function.iterate_succ_apply' (quad c) n z₀

theorem orbit_add (c z₀ : ℂ) (m n : ℕ) :
    orbit c z₀ (m + n) = (quad c)^[m] (orbit c z₀ n) := by
  exact Function.iterate_add_apply (quad c) m n z₀

theorem fixed_iff_quadratic (c p : ℂ) :
    quad c p = p ↔ p ^ 2 - p + c = 0 := by
  simp only [quad]
  constructor <;> intro h
  · linear_combination h
  · linear_combination h

theorem fixed_points_from_discriminant
    (c δ : ℂ) (hδ : δ ^ 2 = 1 - 4 * c) :
    quad c ((1 + δ) / 2) = (1 + δ) / 2 ∧
      quad c ((1 - δ) / 2) = (1 - δ) / 2 := by
  constructor
  · apply (fixed_iff_quadratic c _).2
    field_simp
    linear_combination hδ
  · apply (fixed_iff_quadratic c _).2
    field_simp
    linear_combination hδ

/-- A chosen square root of the discriminant lists every fixed point. -/
theorem fixed_iff_eq_discriminant_points
    (c δ p : ℂ) (hδ : δ ^ 2 = 1 - 4 * c) :
    quad c p = p ↔ p = (1 + δ) / 2 ∨ p = (1 - δ) / 2 := by
  constructor
  · intro hp
    have hquad : p ^ 2 - p + c = 0 := (fixed_iff_quadratic c p).1 hp
    have hsquare : (2 * p - 1) ^ 2 = δ ^ 2 := by
      rw [hδ]
      linear_combination 4 * hquad
    have hprod : ((2 * p - 1) - δ) * ((2 * p - 1) + δ) = 0 := by
      calc
        ((2 * p - 1) - δ) * ((2 * p - 1) + δ) =
            (2 * p - 1) ^ 2 - δ ^ 2 := by ring
        _ = 0 := sub_eq_zero.mpr hsquare
    rcases mul_eq_zero.mp hprod with hminus | hplus
    · left
      apply (eq_div_iff (by norm_num : (2 : ℂ) ≠ 0)).2
      linear_combination hminus
    · right
      apply (eq_div_iff (by norm_num : (2 : ℂ) ≠ 0)).2
      linear_combination hplus
  · rintro (rfl | rfl)
    · exact (fixed_points_from_discriminant c δ hδ).1
    · exact (fixed_points_from_discriminant c δ hδ).2

theorem hasDerivAt_quad (c z : ℂ) :
    HasDerivAt (quad c) (2 * z) z := by
  have hpow : HasDerivAt (fun w : ℂ => w ^ 2) (2 * z) z := by
    simpa using hasDerivAt_pow 2 z
  exact hpow.add_const c

theorem deriv_quad (c z : ℂ) :
    deriv (quad c) z = 2 * z :=
  (hasDerivAt_quad c z).deriv

theorem deriv_quad_eq_zero_iff (c z : ℂ) :
    deriv (quad c) z = 0 ↔ z = 0 := by
  rw [deriv_quad]
  norm_num

@[simp] theorem quad_zero (c : ℂ) : quad c 0 = c := by
  simp [quad]

/-- Centering the quadratic map at a fixed point gives the germ used in
Schröder's equation. -/
theorem quad_centered_at_fixed
    (c p w : ℂ) (hp : quad c p = p) :
    quad c (p + w) = p + (2 * p) * w + w ^ 2 := by
  have hfixed : p ^ 2 + c = p := by simpa [quad] using hp
  simp only [quad]
  linear_combination hfixed

theorem quad_neg (c z : ℂ) : quad c (-z) = quad c z := by
  simp [quad]

theorem quad_not_injective (c : ℂ) :
    ¬ Function.Injective (quad c) := by
  intro hinjective
  have hone : quad c 1 = quad c (-1) := by simp [quad]
  have := hinjective hone
  norm_num at this

end

end Mandelbrot
