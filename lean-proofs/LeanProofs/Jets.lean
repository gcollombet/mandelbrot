/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Algebra
import Mathlib.Algebra.Polynomial.Coeff
import Mathlib.Algebra.Polynomial.Eval.Defs
import Mathlib.Tactic.Ring

/-!
# Finite jet and sensitivity identities

The statements here are coefficient-level facts.  They require neither a
convergence radius nor an interpretation of a formal jet as an analytic map.
-/

namespace Mandelbrot

noncomputable section

section CommRing

variable {R : Type*} [CommRing R]

open Polynomial

/-- The quadratic perturbation step, available over any commutative ring. -/
def quadraticStep (a z c : R) : R := a * z + z ^ 2 + c

/-- Exact degree-two part and exact higher-degree remainder of two steps. -/
theorem twoStep_degreeTwo_with_remainder (a1 a2 z c : R) :
    quadraticStep a2 (quadraticStep a1 z c) c =
      a2 * a1 * z + (a2 + 1) * c + (a2 + a1 ^ 2) * z ^ 2 +
        2 * a1 * z * c + c ^ 2 +
        (2 * a1 * z ^ 3 + z ^ 4 + 2 * z ^ 2 * c) := by
  simp only [quadraticStep]
  ring

/-- Pure-`c` polynomial update used by the certified series prefix. -/
def pureCStep (a : R) (p : R[X]) : R[X] := C a * p + p ^ 2 + X

/-- Two polynomials define the same order-`K` jet when their coefficients
agree through degree `K`. -/
def JetEq (K : ℕ) (p q : R[X]) : Prop := ∀ n, n ≤ K → p.coeff n = q.coeff n

theorem jetEq_refl (K : ℕ) (p : R[X]) : JetEq K p p := by
  intro n hn
  rfl

theorem jetEq_add {K : ℕ} {p p' q q' : R[X]}
    (hp : JetEq K p p') (hq : JetEq K q q') : JetEq K (p + q) (p' + q') := by
  intro n hn
  simp only [Polynomial.coeff_add, hp n hn, hq n hn]

theorem jetEq_mul {K : ℕ} {p p' q q' : R[X]}
    (hp : JetEq K p p') (hq : JetEq K q q') : JetEq K (p * q) (p' * q') := by
  intro n hn
  rw [Polynomial.coeff_mul, Polynomial.coeff_mul]
  apply Finset.sum_congr rfl
  intro ij hij
  have hijsum : ij.1 + ij.2 = n := Finset.mem_antidiagonal.mp hij
  have hi : ij.1 ≤ K := by
    apply le_trans _ hn
    rw [← hijsum]
    exact Nat.le_add_right _ _
  have hj : ij.2 ≤ K := by
    apply le_trans _ hn
    rw [← hijsum]
    exact Nat.le_add_left _ _
  rw [hp ij.1 hi, hq ij.2 hj]

theorem jetEq_pow {K : ℕ} {p q : R[X]} (hp : JetEq K p q) :
    ∀ e : ℕ, JetEq K (p ^ e) (q ^ e) := by
  intro e
  induction e with
  | zero => exact jetEq_refl K 1
  | succ e ih =>
      rw [pow_succ, pow_succ]
      exact jetEq_mul ih hp

/-- Replacing an inner polynomial by the same order-`K` jet cannot change
the order-`K` jet of its composition with any fixed outer polynomial. -/
theorem jetEq_comp_inner {K : ℕ} {p q : R[X]} (hp : JetEq K p q) (g : R[X]) :
    JetEq K (g.comp p) (g.comp q) := by
  intro n hn
  rw [Polynomial.comp_eq_sum_left, Polynomial.comp_eq_sum_left]
  simp only [Polynomial.coeff_sum, Polynomial.coeff_C_mul]
  rw [Polynomial.sum_def, Polynomial.sum_def]
  apply Finset.sum_congr rfl
  intro e he
  rw [jetEq_pow hp e n hn]

/-- The complete coefficient convolution for one pure-`c` update. -/
theorem pureCStep_coeff (a : R) (p : R[X]) (j : ℕ) :
    (pureCStep a p).coeff j =
      a * p.coeff j +
        ∑ ij ∈ Finset.antidiagonal j, p.coeff ij.1 * p.coeff ij.2 +
        if j = 1 then 1 else 0 := by
  rw [pureCStep, Polynomial.coeff_add, Polynomial.coeff_add,
    Polynomial.coeff_C_mul, Polynomial.coeff_X]
  rw [show (p ^ 2).coeff j =
      ∑ ij ∈ Finset.antidiagonal j, p.coeff ij.1 * p.coeff ij.2 by
    rw [pow_two, Polynomial.coeff_mul]]
  simp [eq_comm]

/-- With zero constant term, the first coefficient obeys `b₁' = a*b₁+1`. -/
theorem pureCStep_coeff_one (a : R) (p : R[X]) (hp0 : p.coeff 0 = 0) :
    (pureCStep a p).coeff 1 = a * p.coeff 1 + 1 := by
  rw [pureCStep_coeff]
  norm_num [hp0, Finset.antidiagonal]

/-- For `j ≥ 2`, the displayed recurrence in the notes is the polynomial
coefficient convolution; endpoint terms vanish when the constant term does. -/
theorem pureCStep_coeff_ge_two (a : R) (p : R[X]) (j : ℕ)
    (hj : 2 ≤ j) :
    (pureCStep a p).coeff j =
      a * p.coeff j + ∑ ij ∈ Finset.antidiagonal j, p.coeff ij.1 * p.coeff ij.2 := by
  rw [pureCStep_coeff]
  simp [Nat.ne_of_gt (lt_of_lt_of_le Nat.one_lt_two hj)]

/-- Exact first sensitivity recurrence for one quadratic step. -/
theorem firstSensitivity_step (a z dz : R) :
    a * dz + 2 * z * dz + 1 = (a + 2 * z) * dz + 1 := by
  ring

/-- Exact second sensitivity recurrence for one quadratic step. -/
theorem secondSensitivity_step (a z dz ddz : R) :
    a * ddz + 2 * (z * ddz + dz ^ 2) =
      (a + 2 * z) * ddz + 2 * dz ^ 2 := by
  ring

/-- A quadratic Taylor transport identity.  This is the algebra behind the
`z'` and `z''` recurrences and exposes the cubic and quartic remainder. -/
theorem exactStep_secondOrder_transport (a z c dz ddz h : R) :
    quadraticStep a (z + dz * h + ddz * h ^ 2) (c + h) - quadraticStep a z c =
      ((a + 2 * z) * dz + 1) * h +
      ((a + 2 * z) * ddz + dz ^ 2) * h ^ 2 +
      (2 * dz * ddz) * h ^ 3 + ddz ^ 2 * h ^ 4 := by
  simp only [quadraticStep]
  ring

end CommRing

end

end Mandelbrot
