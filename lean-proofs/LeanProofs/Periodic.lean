/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.CPlus
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# Periodic Möbius blocks and the coalescent limit
-/

namespace Mandelbrot

section Field

variable {K : Type*} [Field K]

/-- A fixed-parameter `[1/1]-c⁺` periodic block. -/
def periodicMobius (Ae Bc De K0 z : K) : K := (Ae * z + Bc) / (De * z + K0)

theorem periodic_fixed_point_equation (Ae Bc De K0 z : K)
    (hden : De * z + K0 ≠ 0) :
    periodicMobius Ae Bc De K0 z = z ↔
      De * z ^ 2 + (K0 - Ae) * z - Bc = 0 := by
  simp only [periodicMobius]
  rw [div_eq_iff hden]
  constructor <;> intro h
  · calc
      De * z ^ 2 + (K0 - Ae) * z - Bc =
          -(Ae * z + Bc - z * (De * z + K0)) := by ring
      _ = 0 := by rw [h]; ring
  · apply sub_eq_zero.mp
    calc
      Ae * z + Bc - z * (De * z + K0) =
          -(De * z ^ 2 + (K0 - Ae) * z - Bc) := by ring
      _ = 0 := by rw [h]; ring

/-- Exact finite difference.  Its `h`-coefficient gives the multiplier
`(Ae*K0-Bc*De)/(De*z+K0)²`. -/
theorem periodicMobius_increment (Ae Bc De K0 z h : K)
    (hz : De * z + K0 ≠ 0) (hzh : De * (z + h) + K0 ≠ 0) :
    periodicMobius Ae Bc De K0 (z + h) - periodicMobius Ae Bc De K0 z =
      h * (Ae * K0 - Bc * De) /
        ((De * (z + h) + K0) * (De * z + K0)) := by
  simp only [periodicMobius]
  rw [div_sub_div _ _ hzh hz]
  congr 1
  ring

/-- The fixed-point equation remains quadratic for a `[2/1]` map. -/
theorem periodic_degreeTwo_fixed_point
    (N2 Ae Bc De K0 z : K) (hden : De * z + K0 ≠ 0) :
    (N2 * z ^ 2 + Ae * z + Bc) / (De * z + K0) = z ↔
      (De - N2) * z ^ 2 + (K0 - Ae) * z - Bc = 0 := by
  rw [div_eq_iff hden]
  constructor <;> intro h
  · calc
      (De - N2) * z ^ 2 + (K0 - Ae) * z - Bc =
          -(N2 * z ^ 2 + Ae * z + Bc - z * (De * z + K0)) := by ring
      _ = 0 := by rw [h]; ring
  · apply sub_eq_zero.mp
    calc
      N2 * z ^ 2 + Ae * z + Bc - z * (De * z + K0) =
          -((De - N2) * z ^ 2 + (K0 - Ae) * z - Bc) := by ring
      _ = 0 := by rw [h]; ring

/-- Difference from a fixed point factors linearly. -/
theorem periodicMobius_sub_fixed
    (Ae Bc De K0 alpha z : K)
    (ha : De * alpha ^ 2 + (K0 - Ae) * alpha - Bc = 0)
    (hz : De * z + K0 ≠ 0) :
    periodicMobius Ae Bc De K0 z - alpha =
      (Ae - De * alpha) * (z - alpha) / (De * z + K0) := by
  have hBc : Bc = De * alpha ^ 2 + (K0 - Ae) * alpha := by
    apply sub_eq_zero.mp
    calc
      Bc - (De * alpha ^ 2 + (K0 - Ae) * alpha) =
          -(De * alpha ^ 2 + (K0 - Ae) * alpha - Bc) := by ring
      _ = 0 := by rw [ha]; ring
  simp only [periodicMobius]
  rw [div_sub' hz]
  congr 1
  rw [hBc]
  ring

/-- Cross-ratio linearization for two fixed points. -/
theorem periodic_cross_ratio
    (Ae Bc De K0 alpha beta z : K)
    (ha : De * alpha ^ 2 + (K0 - Ae) * alpha - Bc = 0)
    (hb : De * beta ^ 2 + (K0 - Ae) * beta - Bc = 0)
    (hz : De * z + K0 ≠ 0)
    (hzb : z - beta ≠ 0) (heb : Ae - De * beta ≠ 0) :
    (periodicMobius Ae Bc De K0 z - alpha) /
        (periodicMobius Ae Bc De K0 z - beta) =
      ((Ae - De * alpha) / (Ae - De * beta)) * ((z - alpha) / (z - beta)) := by
  rw [periodicMobius_sub_fixed Ae Bc De K0 alpha z ha hz,
    periodicMobius_sub_fixed Ae Bc De K0 beta z hb hz]
  field_simp [hz, hzb, heb]

/-- Once in cross-ratio coordinates, `k` periods are multiplication by
`κ^k`. -/
theorem cross_ratio_iterate (w : ℕ → K) (kappa : K)
    (hstep : ∀ n, w (n + 1) = kappa * w n) :
    ∀ n, w n = kappa ^ n * w 0 := by
  intro n
  induction n with
  | zero => simp
  | succ n ih =>
      rw [hstep n, ih, pow_succ']
      ring

end Field

section Jordan

variable {R : Type*} [CommRing R]

/-- Binomial formula for a square-zero nilpotent. -/
theorem one_add_squareZero_pow (N : R) (hN : N ^ 2 = 0) :
    ∀ k : ℕ, (1 + N) ^ k = 1 + (k : R) * N := by
  intro k
  induction k with
  | zero => simp
  | succ k ih =>
      rw [pow_succ, ih]
      push_cast
      calc
        (1 + (k : R) * N) * (1 + N) =
            1 + ((k : R) + 1) * N + (k : R) * N ^ 2 := by ring
        _ = 1 + ((k : R) + 1) * N := by rw [hN, mul_zero, add_zero]

/-- Coalescent Jordan power `(λ(I+N))^k = λ^k(I+kN)`. -/
theorem jordan_power (lambda N : R) (hN : N ^ 2 = 0) (k : ℕ) :
    (lambda * (1 + N)) ^ k = lambda ^ k * (1 + (k : R) * N) := by
  rw [mul_pow, one_add_squareZero_pow N hN k]

end Jordan

end Mandelbrot
