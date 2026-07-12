/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Algebra.MvPolynomial.Basic
import Lean.Elab.Tactic.Omega

/-!
# Bivariate jets by total degree

This file upgrades the univariate coefficient congruence to the actual pair
of variables `(z,c)`.  It proves the finite-polynomial core of

`J_K (g ∘ f) = J_K (J_K g ∘ J_K f)`

for the quadratic Mandelbrot step: low total-degree coefficients are
insensitive to truncating the inner map after any merge.
-/

namespace Mandelbrot

noncomputable section

open MvPolynomial

abbrev BivariatePolynomial (R : Type*) [CommSemiring R] := MvPolynomial (Fin 2) R

/-- Total degree of an exponent vector. -/
def totalWeight (d : Fin 2 →₀ ℕ) : ℕ := d.sum fun _ n => n

/-- Equality of all bivariate coefficients of total degree at most `K`. -/
def TotalJetEq {R : Type*} [CommSemiring R] (K : ℕ)
    (p q : BivariatePolynomial R) : Prop :=
  ∀ d, totalWeight d ≤ K → coeff d p = coeff d q

theorem totalJetEq_refl {R : Type*} [CommSemiring R] (K : ℕ)
    (p : BivariatePolynomial R) : TotalJetEq K p p := by
  intro d hd
  rfl

theorem totalJetEq_symm {R : Type*} [CommSemiring R] {K : ℕ}
    {p q : BivariatePolynomial R} (h : TotalJetEq K p q) : TotalJetEq K q p := by
  intro d hd
  exact (h d hd).symm

theorem totalJetEq_trans {R : Type*} [CommSemiring R] {K : ℕ}
    {p q r : BivariatePolynomial R} (hpq : TotalJetEq K p q)
    (hqr : TotalJetEq K q r) : TotalJetEq K p r := by
  intro d hd
  exact (hpq d hd).trans (hqr d hd)

theorem totalJetEq_add {R : Type*} [CommSemiring R] {K : ℕ}
    {p p' q q' : BivariatePolynomial R}
    (hp : TotalJetEq K p p') (hq : TotalJetEq K q q') :
    TotalJetEq K (p + q) (p' + q') := by
  intro d hd
  simp only [coeff_add, hp d hd, hq d hd]

theorem totalWeight_add (u v : Fin 2 →₀ ℕ) :
    totalWeight (u + v) = totalWeight u + totalWeight v := by
  classical
  simp [totalWeight, Finsupp.sum_add_index]

theorem totalJetEq_mul {R : Type*} [CommSemiring R] {K : ℕ}
    {p p' q q' : BivariatePolynomial R}
    (hp : TotalJetEq K p p') (hq : TotalJetEq K q q') :
    TotalJetEq K (p * q) (p' * q') := by
  classical
  intro d hd
  rw [coeff_mul, coeff_mul]
  apply Finset.sum_congr rfl
  intro uv huv
  have huvsum : uv.1 + uv.2 = d := Finset.mem_antidiagonal.mp huv
  have hweight : totalWeight uv.1 + totalWeight uv.2 = totalWeight d := by
    rw [← totalWeight_add, huvsum]
  have hu : totalWeight uv.1 ≤ K := by omega
  have hv : totalWeight uv.2 ≤ K := by omega
  rw [hp uv.1 hu, hq uv.2 hv]

theorem totalJetEq_pow {R : Type*} [CommSemiring R] {K : ℕ}
    {p q : BivariatePolynomial R} (hp : TotalJetEq K p q) :
    ∀ n : ℕ, TotalJetEq K (p ^ n) (q ^ n) := by
  intro n
  induction n with
  | zero => exact totalJetEq_refl K 1
  | succ n ih =>
      rw [pow_succ, pow_succ]
      exact totalJetEq_mul ih hp

/-- Coefficientwise total-degree truncation. -/
def totalTrunc {R : Type*} [CommSemiring R] (K : ℕ)
    (p : BivariatePolynomial R) : BivariatePolynomial R :=
  p.filter fun d => totalWeight d ≤ K

@[simp]
theorem coeff_totalTrunc {R : Type*} [CommSemiring R] (K : ℕ)
    (p : BivariatePolynomial R) (d : Fin 2 →₀ ℕ) :
    coeff d (totalTrunc K p) = if totalWeight d ≤ K then coeff d p else 0 := by
  rfl

theorem totalJetEq_totalTrunc {R : Type*} [CommSemiring R] (K : ℕ)
    (p : BivariatePolynomial R) : TotalJetEq K p (totalTrunc K p) := by
  intro d hd
  simp [coeff_totalTrunc, hd]

theorem totalTrunc_congr {R : Type*} [CommSemiring R] {K : ℕ}
    {p q : BivariatePolynomial R} (h : TotalJetEq K p q) :
    totalTrunc K p = totalTrunc K q := by
  ext d
  simp only [coeff_totalTrunc]
  split_ifs with hd
  · exact h d hd
  · rfl

theorem totalTrunc_idempotent {R : Type*} [CommSemiring R] (K : ℕ)
    (p : BivariatePolynomial R) : totalTrunc K (totalTrunc K p) = totalTrunc K p := by
  apply totalTrunc_congr
  exact totalJetEq_symm (totalJetEq_totalTrunc K p)

/-- One exact Mandelbrot perturbation step as a polynomial in `(z,c)`, where
variable `0` is `z` and variable `1` is `c`. -/
def bivariateStep {R : Type*} [CommSemiring R] (a : R)
    (p : BivariatePolynomial R) : BivariatePolynomial R :=
  C a * p + p ^ 2 + X 1

/-- A quadratic step preserves equality of all coefficients through total
degree `K`. -/
theorem totalJetEq_step {R : Type*} [CommSemiring R] {K : ℕ}
    {p q : BivariatePolynomial R} (a : R) (hp : TotalJetEq K p q) :
    TotalJetEq K (bivariateStep a p) (bivariateStep a q) := by
  apply totalJetEq_add
  · apply totalJetEq_add
    · exact totalJetEq_mul (totalJetEq_refl K (C a)) hp
    · exact totalJetEq_pow hp 2
  · exact totalJetEq_refl K (X 1)

/-- The concrete one-step truncation identity. -/
theorem totalTrunc_step_commutes {R : Type*} [CommSemiring R] (K : ℕ)
    (a : R) (p : BivariatePolynomial R) :
    totalTrunc K (bivariateStep a p) =
      totalTrunc K (bivariateStep a (totalTrunc K p)) := by
  apply totalTrunc_congr
  exact totalJetEq_step a (totalJetEq_totalTrunc K p)

/-- Exact composition of a list of reference multipliers. -/
def iterateBivariateSteps {R : Type*} [CommSemiring R] :
    List R → BivariatePolynomial R → BivariatePolynomial R
  | [], p => p
  | a :: as, p => iterateBivariateSteps as (bivariateStep a p)

/-- Truncating the inner polynomial before an arbitrarily long block cannot
change the final jet through total degree `K`. -/
theorem totalJetEq_iterate {R : Type*} [CommSemiring R] {K : ℕ}
    {p q : BivariatePolynomial R} (hp : TotalJetEq K p q) :
    ∀ as : List R,
      TotalJetEq K (iterateBivariateSteps as p) (iterateBivariateSteps as q) := by
  intro as
  induction as generalizing p q with
  | nil => exact hp
  | cons a as ih =>
      exact ih (totalJetEq_step a hp)

/-- Block-level form of bivariate jet closure for the Mandelbrot recurrence. -/
theorem totalTrunc_iterate_inner {R : Type*} [CommSemiring R] (K : ℕ)
    (as : List R) (p : BivariatePolynomial R) :
    totalTrunc K (iterateBivariateSteps as p) =
      totalTrunc K (iterateBivariateSteps as (totalTrunc K p)) := by
  apply totalTrunc_congr
  exact totalJetEq_iterate (totalJetEq_totalTrunc K p) as

/-- Iteration that truncates after every merge, as the table builder does. -/
def iterateTruncatedBivariateSteps {R : Type*} [CommSemiring R] (K : ℕ) :
    List R → BivariatePolynomial R → BivariatePolynomial R
  | [], p => totalTrunc K p
  | a :: as, p =>
      iterateTruncatedBivariateSteps K as (totalTrunc K (bivariateStep a p))

/-- Truncating after every merge gives exactly the same final order-`K` jet
as composing the full finite polynomials and truncating only once at the end. -/
theorem iterateTruncated_eq_totalTrunc_iterate
    {R : Type*} [CommSemiring R] (K : ℕ) (as : List R)
    (p : BivariatePolynomial R) :
    iterateTruncatedBivariateSteps K as p =
      totalTrunc K (iterateBivariateSteps as p) := by
  induction as generalizing p with
  | nil => rfl
  | cons a as ih =>
      rw [iterateTruncatedBivariateSteps, ih, iterateBivariateSteps]
      apply totalTrunc_congr
      exact totalJetEq_iterate
        (totalJetEq_symm (totalJetEq_totalTrunc K (bivariateStep a p))) as

end

end Mandelbrot
