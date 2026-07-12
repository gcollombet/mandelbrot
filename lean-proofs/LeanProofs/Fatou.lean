/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Algebra.Field.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# Algebraic normal form at a simple parabolic point

This proves the rational calculation which fixes the sign of the resiter in
the notes.  Construction of sectorial analytic Fatou coordinates is outside
the scope of these finite algebraic lemmas.
-/

namespace Mandelbrot

section Field

variable {K : Type*} [Field K]

def parabolicCubic (a b u : K) : K := u + a * u ^ 2 + b * u ^ 3

def fatouTMap (q t : K) : K := t ^ 3 / (t ^ 2 - t + q)

theorem parabolicCubic_at_fatou_scale (a b t : K) (ha : a ≠ 0) (ht : t ≠ 0) :
    parabolicCubic a b (-1 / (a * t)) =
      -(t ^ 2 - t + b / a ^ 2) / (a * t ^ 3) := by
  simp only [parabolicCubic]
  field_simp [ha, ht]
  ring

/-- Substitution `u=-1/(a t)` turns the cubic germ into the displayed
rational map, with `q=b/a²`. -/
theorem parabolic_substitution (a b t : K)
    (ha : a ≠ 0) (ht : t ≠ 0) :
    -1 / (a * parabolicCubic a b (-1 / (a * t))) = fatouTMap (b / a ^ 2) t := by
  rw [parabolicCubic_at_fatou_scale a b t ha ht]
  simp only [fatouTMap]
  field_simp [ha, ht]

/-- Exact remainder after `t + 1 - (q-1)/t`.  In particular the coefficient
of `1/t` is `-(q-1)`, so the logarithmic correction uses `+(q-1) log t`. -/
theorem fatouTMap_normal_form (q t : K)
    (ht : t ≠ 0) (hden : t ^ 2 - t + q ≠ 0) :
    fatouTMap q t =
      t + 1 - (q - 1) / t -
        ((2 * q - 1) * t + q - q ^ 2) / (t * (t ^ 2 - t + q)) := by
  let d : K := t ^ 2 - t + q
  change t ^ 3 / d =
    t + 1 - (q - 1) / t - ((2 * q - 1) * t + q - q ^ 2) / (t * d)
  have hd : d ≠ 0 := by simpa [d] using hden
  field_simp [ht, hd]
  ring

/-- `rho = b/a²-1` is therefore the coefficient appearing with a minus
sign in the transformed dynamics. -/
theorem fatou_resiter_sign (a b t : K) (ht : t ≠ 0)
    (hden : t ^ 2 - t + b / a ^ 2 ≠ 0) :
    fatouTMap (b / a ^ 2) t =
      t + 1 - (b / a ^ 2 - 1) / t -
        ((2 * (b / a ^ 2) - 1) * t + b / a ^ 2 - (b / a ^ 2) ^ 2) /
          (t * (t ^ 2 - t + b / a ^ 2)) :=
  fatouTMap_normal_form (b / a ^ 2) t ht hden

end Field

end Mandelbrot
