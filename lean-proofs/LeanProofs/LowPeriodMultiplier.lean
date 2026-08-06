/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MultiplierArea

/-!
# Exact low-period multiplier equations

The resultants used to discover these equations were computed externally, but
every identity retained in this file is an exact polynomial identity checked
by Lean.  At multiplier zero they recover the center equations.  Implicit
differentiation gives the first Taylor coefficient of an inverse multiplier
branch.
-/

namespace Mandelbrot

noncomputable section

open Complex

/-! ## Period three -/

def periodThreeCenterEquation (c : ℂ) : ℂ :=
  c ^ 3 + 2 * c ^ 2 + c + 1

def periodThreeMultiplierEquation (c mu : ℂ) : ℂ :=
  64 + 64 * c + 128 * c ^ 2 + 64 * c ^ 3 -
    (16 + 8 * c) * mu + mu ^ 2

theorem periodThreeMultiplierEquation_zero (c : ℂ) :
    periodThreeMultiplierEquation c 0 =
      64 * periodThreeCenterEquation c := by
  simp only [periodThreeMultiplierEquation, periodThreeCenterEquation]
  ring

/-- The coefficient obtained from implicit differentiation at a simple
period-three center. -/
def periodThreeFirstCoefficient (c : ℂ) : ℂ :=
  (c + 2) / (8 * (1 + 4 * c + 3 * c ^ 2))

theorem periodThreeFirstCoefficient_spec (c : ℂ)
    (hsimple : 1 + 4 * c + 3 * c ^ 2 ≠ 0) :
    64 * (1 + 4 * c + 3 * c ^ 2) *
        periodThreeFirstCoefficient c - 8 * (2 + c) = 0 := by
  let d : ℂ := 1 + 4 * c + 3 * c ^ 2
  have hd : 8 * d ≠ 0 := mul_ne_zero (by norm_num) (by simpa [d] using hsimple)
  change 64 * d * ((c + 2) / (8 * d)) - 8 * (2 + c) = 0
  calc
    64 * d * ((c + 2) / (8 * d)) - 8 * (2 + c) =
        8 * ((8 * d) * ((c + 2) / (8 * d))) - 8 * (2 + c) := by ring
    _ = 8 * (c + 2) - 8 * (2 + c) := by rw [mul_div_cancel₀ _ hd]
    _ = 0 := by ring

theorem periodThreeFirstCoefficient_eq_of_linearized
    (c a : ℂ) (hsimple : 1 + 4 * c + 3 * c ^ 2 ≠ 0)
    (hlinear :
      64 * (1 + 4 * c + 3 * c ^ 2) * a - 8 * (2 + c) = 0) :
    a = periodThreeFirstCoefficient c := by
  dsimp only [periodThreeFirstCoefficient]
  apply (eq_div_iff (mul_ne_zero (by norm_num) hsimple)).2
  linear_combination hlinear / 8

/-! ## Period four -/

def periodFourCenterEquation (c : ℂ) : ℂ :=
  c ^ 6 + 3 * c ^ 5 + 3 * c ^ 4 + 3 * c ^ 3 + 2 * c ^ 2 + 1

def periodFourMultiplierEquation (c mu : ℂ) : ℂ :=
  4096 * (1 + 2 * c ^ 2 + 3 * c ^ 3 + 3 * c ^ 4 +
      3 * c ^ 5 + c ^ 6) +
    256 * (c ^ 4 + c ^ 3 - c ^ 2 - 3) * mu +
    (48 - 16 * c ^ 2) * mu ^ 2 - mu ^ 3

theorem periodFourMultiplierEquation_zero (c : ℂ) :
    periodFourMultiplierEquation c 0 =
      4096 * periodFourCenterEquation c := by
  simp only [periodFourMultiplierEquation, periodFourCenterEquation]
  ring

/-- The coefficient obtained from implicit differentiation at a simple
period-four center. -/
def periodFourFirstCoefficient (c : ℂ) : ℂ :=
  (3 + c ^ 2 - c ^ 3 - c ^ 4) /
    (16 * (4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5))

theorem periodFourFirstCoefficient_spec (c : ℂ)
    (hsimple :
      4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5 ≠ 0) :
    4096 * (4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5) *
        periodFourFirstCoefficient c -
      256 * (3 + c ^ 2 - c ^ 3 - c ^ 4) = 0 := by
  let d : ℂ :=
    4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5
  let n : ℂ := 3 + c ^ 2 - c ^ 3 - c ^ 4
  have hd : 16 * d ≠ 0 := mul_ne_zero (by norm_num) (by simpa [d] using hsimple)
  change 4096 * d * (n / (16 * d)) - 256 * n = 0
  calc
    4096 * d * (n / (16 * d)) - 256 * n =
        256 * ((16 * d) * (n / (16 * d))) - 256 * n := by ring
    _ = 256 * n - 256 * n := by rw [mul_div_cancel₀ _ hd]
    _ = 0 := by ring

theorem periodFourFirstCoefficient_eq_of_linearized
    (c a : ℂ)
    (hsimple :
      4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5 ≠ 0)
    (hlinear :
      4096 * (4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5) * a -
        256 * (3 + c ^ 2 - c ^ 3 - c ^ 4) = 0) :
    a = periodFourFirstCoefficient c := by
  dsimp only [periodFourFirstCoefficient]
  apply (eq_div_iff (mul_ne_zero (by norm_num) hsimple)).2
  linear_combination hlinear / 256

end

end Mandelbrot
