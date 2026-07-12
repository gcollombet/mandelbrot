/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Algebra.Field.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# Algebraic identities for Mandelbrot block approximants

This file contains the identities which do not depend on norms, convergence,
or floating-point arithmetic.  They are stated over an arbitrary field (or a
commutative ring when division is not involved).
-/

namespace Mandelbrot

section Field

variable {K : Type*} [Field K]

/-- One exact perturbation step: `z ↦ a*z + z² + c`, with `a = 2Z`. -/
def exactStep (a z c : K) : K := a * z + z ^ 2 + c

/-- The Padé `[1/1]` seed, written with denominator `a-z`. -/
def padeSeed (a z c : K) : K := a * (a * z + c) / (a - z)

theorem padeSeed_sub_exactStep (a z c : K) (hden : a - z ≠ 0) :
    padeSeed a z c - exactStep a z c = z * (z ^ 2 + c) / (a - z) := by
  simp only [padeSeed, exactStep]
  field_simp
  ring

theorem padeSeed_sub_exactStep_julia (a z : K) (hden : a - z ≠ 0) :
    padeSeed a z 0 - exactStep a z 0 = z ^ 3 / (a - z) := by
  rw [padeSeed_sub_exactStep a z 0 hden]
  ring

/-- Cross-multiplied Padé-relative identity in the Julia channel. -/
theorem pade_error_as_fraction_of_pade (a z : K) (ha : a ≠ 0) (hden : a - z ≠ 0) :
    padeSeed a z 0 - exactStep a z 0 = padeSeed a z 0 * (z ^ 2 / a ^ 2) := by
  simp only [padeSeed, exactStep]
  field_simp [ha, hden]
  ring

/-- Cross-multiplied true-map-relative identity in the Julia channel. -/
theorem pade_error_as_fraction_of_exact (a z : K)
    (hden : a - z ≠ 0) (hquad : a ^ 2 - z ^ 2 ≠ 0) :
    padeSeed a z 0 - exactStep a z 0 =
      exactStep a z 0 * (z ^ 2 / (a ^ 2 - z ^ 2)) := by
  simp only [padeSeed, exactStep]
  field_simp [hden, hquad]
  ring

theorem exactStep_transport (a x y c : K) :
    exactStep a y c - exactStep a x c = (y - x) * (a + x + y) := by
  simp only [exactStep]
  ring

/-- A pixel-independent three-coefficient rational approximant. -/
def mobius (A B D c z : K) : K := (A * z + B * c) / (1 + D * z)

/-- Exact homogeneous numerator after composing `y` after `x`. -/
def composedNum (Ax Bx Dx Ay By : K) (c z : K) : K :=
  (Ay * Ax + By * c * Dx) * z + (Ay * Bx + By) * c

/-- Exact homogeneous denominator after composing `y` after `x`. -/
def composedDen (Ax Bx Dx Dy : K) (c z : K) : K :=
  (Dx + Dy * Ax) * z + (1 + Dy * Bx * c)

theorem outerDen_mul_innerDen (Ax Bx Dx Dy c z : K) (hx : 1 + Dx * z ≠ 0) :
    (1 + Dy * mobius Ax Bx Dx c z) * (1 + Dx * z) =
      composedDen Ax Bx Dx Dy c z := by
  have hx' : 1 + z * Dx ≠ 0 := by simpa [mul_comm] using hx
  simp only [mobius, composedDen]
  field_simp [hx']
  ring

theorem mobius_composition_homogeneous
    (Ax Bx Dx Ay By Dy c z : K)
    (hx : 1 + Dx * z ≠ 0)
    (hxy : composedDen Ax Bx Dx Dy c z ≠ 0) :
    mobius Ay By Dy c (mobius Ax Bx Dx c z) =
      composedNum Ax Bx Dx Ay By c z / composedDen Ax Bx Dx Dy c z := by
  have hout : 1 + Dy * mobius Ax Bx Dx c z ≠ 0 := by
    intro h
    apply hxy
    rw [← outerDen_mul_innerDen Ax Bx Dx Dy c z hx, h, zero_mul]
  have hx' : 1 + z * Dx ≠ 0 := by simpa [mul_comm] using hx
  have hout' :
      1 + (Ax * z + Bx * c) * (1 + z * Dx)⁻¹ * Dy ≠ 0 := by
    simpa [mobius, div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc] using hout
  simp only [mobius, composedNum, composedDen] at hout ⊢
  field_simp [hx', hout', hxy]
  ring

/-- For `c = 0`, the normalized three-coefficient family is exactly closed. -/
theorem mobius_composition_julia
    (Ax Dx Ay Dy z : K)
    (hx : 1 + Dx * z ≠ 0)
    (hxy : 1 + (Dx + Ax * Dy) * z ≠ 0) :
    mobius Ay 0 Dy 0 (mobius Ax 0 Dx 0 z) =
      mobius (Ay * Ax) 0 (Dx + Ax * Dy) 0 z := by
  have hc : composedDen Ax 0 Dx Dy 0 z ≠ 0 := by
    simpa [composedDen, add_comm, add_left_comm, add_assoc, mul_comm, mul_left_comm,
      mul_assoc] using hxy
  rw [mobius_composition_homogeneous Ax 0 Dx Ay 0 Dy 0 z hx hc]
  simp [mobius, composedNum, composedDen, add_comm, mul_comm, mul_left_comm]

/-- The exact normalized coefficients at fixed `c`, when the normalizer is nonzero. -/
theorem mobius_composition_normalized
    (Ax Bx Dx Ay By Dy c z : K)
    (hx : 1 + Dx * z ≠ 0)
    (hnorm : 1 + Dy * Bx * c ≠ 0)
    (hxy : composedDen Ax Bx Dx Dy c z ≠ 0) :
    mobius Ay By Dy c (mobius Ax Bx Dx c z) =
      mobius
        ((Ay * Ax + By * c * Dx) / (1 + Dy * Bx * c))
        ((Ay * Bx + By) / (1 + Dy * Bx * c))
        ((Dx + Dy * Ax) / (1 + Dy * Bx * c)) c z := by
  rw [mobius_composition_homogeneous Ax Bx Dx Ay By Dy c z hx hxy]
  let n := 1 + Dy * Bx * c
  have hn : n ≠ 0 := by simpa [n] using hnorm
  have hnum :
      ((Ay * Ax + By * c * Dx) / n) * z + ((Ay * Bx + By) / n) * c =
        composedNum Ax Bx Dx Ay By c z / n := by
    simp only [composedNum]
    field_simp [hn]
  have hden :
      1 + ((Dx + Dy * Ax) / n) * z = composedDen Ax Bx Dx Dy c z / n := by
    simp only [composedDen]
    field_simp [hn]
    dsimp [n]
    ring
  simp only [mobius]
  change composedNum Ax Bx Dx Ay By c z / composedDen Ax Bx Dx Dy c z =
    (((Ay * Ax + By * c * Dx) / n) * z + ((Ay * Bx + By) / n) * c) /
      (1 + ((Dx + Dy * Ax) / n) * z)
  rw [hnum, hden]
  field_simp [hn, hxy]

end Field

section FirstOrder

variable {R : Type*} [CommRing R]

/- The following four identities expose the constant, linear, and quadratic
parts in `c` of a product of first-order matrix entries.  In particular, the
linear coefficient of the lower-left entry contains both `Hx` and `Hy*Ax`. -/

theorem firstOrder_topLeft
    (Ax Ex Dx Hx Ay Ey By c : R) :
    (Ay + Ey * c) * (Ax + Ex * c) + By * c * (Dx + Hx * c) =
      Ay * Ax + (Ay * Ex + Ey * Ax + By * Dx) * c +
        (Ey * Ex + By * Hx) * c ^ 2 := by
  ring

theorem firstOrder_topRight
    (Ay Ey Bx By Gx c : R) :
    (Ay + Ey * c) * (Bx * c) + By * c * (1 + Gx * c) =
      (Ay * Bx + By) * c + (Ey * Bx + By * Gx) * c ^ 2 := by
  ring

theorem firstOrder_bottomLeft
    (Ax Ex Dx Hx Dy Hy Gy c : R) :
    (Dy + Hy * c) * (Ax + Ex * c) + (1 + Gy * c) * (Dx + Hx * c) =
      (Dx + Dy * Ax) +
        (Hx + Hy * Ax + Dy * Ex + Gy * Dx) * c +
        (Hy * Ex + Gy * Hx) * c ^ 2 := by
  ring

theorem firstOrder_bottomRight
    (Bx Gx Dy Hy Gy c : R) :
    (Dy + Hy * c) * (Bx * c) + (1 + Gy * c) * (1 + Gx * c) =
      1 + (Gx + Dy * Bx + Gy) * c + (Hy * Bx + Gy * Gx) * c ^ 2 := by
  ring

end FirstOrder

end Mandelbrot
