/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.RationalCertificate
import Mathlib.Algebra.Polynomial.Coeff
import Mathlib.Algebra.Polynomial.Eval.Defs
import Mathlib.Tactic.Linarith
import Lean.Elab.Tactic.Omega
import Mathlib.Tactic.Ring

/-!
# Certified Padé dominance

This file proves three complementary facts.

* The one-step `[1/1]` Padé seed is no worse than the affine jet on the
  half-plane `|z| ≤ |a-z|` (in particular on `2|z| ≤ |a|`).
* A bound-driven Padé/jet selector has certified error equal to the minimum
  of the two supplied bounds, hence can never regress relative to the jet.
* For a general `[L/1]` denominator `1-λX`, the coefficients of the
  cross-multiplied residual are exactly the defects
  `a_{n+1} - λ a_n`.  This is the precise algebraic meaning of Padé resumming
  a quasi-geometric coefficient tail.
-/

namespace Mandelbrot

open Polynomial

noncomputable section

section OneStep

/-- The order-one (affine) jet of one Mandelbrot perturbation step. -/
def affineSeed (a z c : ℂ) : ℂ := a * z + c

theorem affineSeed_sub_exactStep (a z c : ℂ) :
    affineSeed a z c - exactStep a z c = -z ^ 2 := by
  simp only [affineSeed, exactStep]
  ring

theorem norm_affineSeed_sub_exactStep (a z c : ℂ) :
    ‖affineSeed a z c - exactStep a z c‖ = ‖z‖ ^ 2 := by
  rw [affineSeed_sub_exactStep, norm_neg, norm_pow]

/-- Exact dominance region of the one-step Padé seed over the affine jet in
the Julia channel. -/
theorem padeSeed_error_le_affine_error_of_closer
    (a z : ℂ) (hden : a - z ≠ 0) (hcloser : ‖z‖ ≤ ‖a - z‖) :
    ‖padeSeed a z 0 - exactStep a z 0‖ ≤
      ‖affineSeed a z 0 - exactStep a z 0‖ := by
  rw [padeSeed_sub_exactStep_julia a z hden, norm_div, norm_pow,
    norm_affineSeed_sub_exactStep]
  have hdenPos : 0 < ‖a - z‖ := norm_pos_iff.mpr hden
  rw [div_le_iff₀ hdenPos]
  have hz2 : 0 ≤ ‖z‖ ^ 2 := sq_nonneg ‖z‖
  have hmul := mul_le_mul_of_nonneg_right hcloser hz2
  nlinarith

/-- The bisector condition is not merely sufficient: it exactly characterizes
weak Padé-versus-affine dominance away from the Padé pole. -/
theorem padeSeed_error_le_affine_error_iff
    (a z : ℂ) (hden : a - z ≠ 0) :
    ‖padeSeed a z 0 - exactStep a z 0‖ ≤
        ‖affineSeed a z 0 - exactStep a z 0‖ ↔
      ‖z‖ ≤ ‖a - z‖ := by
  rw [padeSeed_sub_exactStep_julia a z hden, norm_div, norm_pow,
    norm_affineSeed_sub_exactStep]
  have hdenPos : 0 < ‖a - z‖ := norm_pos_iff.mpr hden
  rw [div_le_iff₀ hdenPos]
  by_cases hz0 : ‖z‖ = 0
  · simp [hz0, hdenPos.le]
  · have hzPos : 0 < ‖z‖ := lt_of_le_of_ne (norm_nonneg z) (Ne.symm hz0)
    have hz2 : 0 < ‖z‖ ^ 2 := sq_pos_of_pos hzPos
    constructor
    · intro h
      apply le_of_mul_le_mul_right _ hz2
      nlinarith
    · intro h
      have hmul := mul_le_mul_of_nonneg_right h hz2.le
      nlinarith

/-- Away from `z=0`, the dominance is strict inside the bisector
`|z| < |a-z|`. -/
theorem padeSeed_error_lt_affine_error_of_closer
    (a z : ℂ) (hden : a - z ≠ 0) (hz : z ≠ 0)
    (hcloser : ‖z‖ < ‖a - z‖) :
    ‖padeSeed a z 0 - exactStep a z 0‖ <
      ‖affineSeed a z 0 - exactStep a z 0‖ := by
  rw [padeSeed_sub_exactStep_julia a z hden, norm_div, norm_pow,
    norm_affineSeed_sub_exactStep]
  have hdenPos : 0 < ‖a - z‖ := norm_pos_iff.mpr hden
  rw [div_lt_iff₀ hdenPos]
  have hz2 : 0 < ‖z‖ ^ 2 := sq_pos_of_pos (norm_pos_iff.mpr hz)
  have hmul := mul_lt_mul_of_pos_right hcloser hz2
  nlinarith

/-- The radial condition `2|z| ≤ |a|` is a simple sufficient subset of the
exact dominance half-plane `|z| ≤ |a-z|`. -/
theorem norm_le_norm_sub_of_two_norm_le
    (a z : ℂ) (hhalf : 2 * ‖z‖ ≤ ‖a‖) : ‖z‖ ≤ ‖a - z‖ := by
  have htri : ‖a‖ ≤ ‖a - z‖ + ‖z‖ := by
    have h := norm_add_le (a - z) z
    simpa only [sub_add_cancel] using h
  linarith

theorem padeSeed_error_le_affine_error_of_half_radius
    (a z : ℂ) (hden : a - z ≠ 0) (hhalf : 2 * ‖z‖ ≤ ‖a‖) :
    ‖padeSeed a z 0 - exactStep a z 0‖ ≤
      ‖affineSeed a z 0 - exactStep a z 0‖ := by
  exact padeSeed_error_le_affine_error_of_closer a z hden
    (norm_le_norm_sub_of_two_norm_le a z hhalf)

theorem padeSeed_error_lt_affine_error_of_strict_half_radius
    (a z : ℂ) (hden : a - z ≠ 0) (hz : z ≠ 0)
    (hhalf : 2 * ‖z‖ < ‖a‖) :
    ‖padeSeed a z 0 - exactStep a z 0‖ <
      ‖affineSeed a z 0 - exactStep a z 0‖ := by
  have htri : ‖a‖ ≤ ‖a - z‖ + ‖z‖ := by
    have h := norm_add_le (a - z) z
    simpa only [sub_add_cancel] using h
  apply padeSeed_error_lt_affine_error_of_closer a z hden hz
  linarith

end OneStep

section Selector

/-- Select the candidate with the smaller certified error bound. -/
def choosePadeOrJet
    (pade jet : ℂ) (padeBound jetBound : ℝ) : ℂ :=
  if padeBound ≤ jetBound then pade else jet

/-- The certified bound emitted alongside `choosePadeOrJet`. -/
def padeOrJetBound (padeBound jetBound : ℝ) : ℝ :=
  min padeBound jetBound

/-- A bound-driven selector can never have a worse certified bound than
either of its inputs. -/
theorem choosePadeOrJet_error_le_min
    (phi pade jet : ℂ) (padeBound jetBound : ℝ)
    (hpade : ‖pade - phi‖ ≤ padeBound)
    (hjet : ‖jet - phi‖ ≤ jetBound) :
    ‖choosePadeOrJet pade jet padeBound jetBound - phi‖ ≤
      padeOrJetBound padeBound jetBound := by
  by_cases h : padeBound ≤ jetBound
  · simp only [choosePadeOrJet, h, if_pos, padeOrJetBound, min_eq_left h]
    exact hpade
  · have hjp : jetBound ≤ padeBound := le_of_not_ge h
    simp only [choosePadeOrJet, h, padeOrJetBound, min_eq_right hjp]
    exact hjet

theorem padeOrJetBound_le_jet (padeBound jetBound : ℝ) :
    padeOrJetBound padeBound jetBound ≤ jetBound :=
  min_le_right _ _

theorem padeOrJetBound_le_pade (padeBound jetBound : ℝ) :
    padeOrJetBound padeBound jetBound ≤ padeBound :=
  min_le_left _ _

/-- Project-level specialization: combine the generic rational residual
certificate with any independently certified jet approximation. -/
theorem cplus_or_jet_error_le_min
    (m : CPlus ℂ) (phi z c jet : ℂ) (x y REST jetBound : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hlower : 0 < cplusDenLower m x y)
    (hQ : ‖cplusResidual m phi z c‖ ≤ REST)
    (hjet : ‖jet - phi‖ ≤ jetBound) :
    ‖choosePadeOrJet (cplusEval m z c) jet
        (REST / cplusDenLower m x y) jetBound - phi‖ ≤
      padeOrJetBound (REST / cplusDenLower m x y) jetBound := by
  apply choosePadeOrJet_error_le_min
  · exact cplus_error_norm_le m phi z c x y REST hx hy hz hc hlower hQ
  · exact hjet

end Selector

section Recurrence

variable {R : Type*} [CommRing R]

/-- Degree-one Padé denominator `1 - λX`. -/
def padeL1Den (lambda : R) : R[X] := 1 - C lambda * X

/-- Cross-multiplied series/polynomial before numerator subtraction. -/
def padeL1Cross (f : R[X]) (lambda : R) : R[X] :=
  padeL1Den lambda * f

/-- Cross-multiplied residual for an arbitrary numerator. -/
def padeL1Residual (f numerator : R[X]) (lambda : R) : R[X] :=
  padeL1Cross f lambda - numerator

theorem padeL1Cross_coeff_zero (f : R[X]) (lambda : R) :
    (padeL1Cross f lambda).coeff 0 = f.coeff 0 := by
  simp [padeL1Cross, padeL1Den]

/-- Above degree zero, multiplication by `1-λX` turns coefficients into the
first-order recurrence defects `a_{n+1}-λa_n`. -/
theorem padeL1Cross_coeff_succ (f : R[X]) (lambda : R) (n : ℕ) :
    (padeL1Cross f lambda).coeff (n + 1) =
      f.coeff (n + 1) - lambda * f.coeff n := by
  simp only [padeL1Cross, padeL1Den, sub_mul, one_mul, coeff_sub]
  rw [mul_assoc, coeff_C_mul, coeff_X_mul]

/-- Once the numerator has no coefficient at degree `n+1`, the Padé residual
coefficient is exactly the quasi-geometric recurrence defect. -/
theorem padeL1Residual_coeff_succ
    (f numerator : R[X]) (lambda : R) (n : ℕ)
    (hnum : numerator.coeff (n + 1) = 0) :
    (padeL1Residual f numerator lambda).coeff (n + 1) =
      f.coeff (n + 1) - lambda * f.coeff n := by
  rw [padeL1Residual, coeff_sub, padeL1Cross_coeff_succ, hnum, sub_zero]

/-- If the numerator matches the cross product through degree `L`, vanishes
above `L`, and the coefficient tail is exactly geometric, the complete Padé
residual vanishes. -/
theorem padeL1Residual_eq_zero_of_geometric_tail
    (f numerator : R[X]) (lambda : R) (L : ℕ)
    (hmatch : ∀ k, k ≤ L → numerator.coeff k = (padeL1Cross f lambda).coeff k)
    (hnum : ∀ k, L < k → numerator.coeff k = 0)
    (hgeom : ∀ n, L ≤ n → f.coeff (n + 1) = lambda * f.coeff n) :
    padeL1Residual f numerator lambda = 0 := by
  ext k
  by_cases hk : k ≤ L
  · simp only [padeL1Residual, coeff_sub, coeff_zero]
    rw [hmatch k hk]
    exact sub_self _
  · have hLk : L < k := Nat.lt_of_not_ge hk
    have hk0 : k ≠ 0 := by omega
    obtain ⟨n, rfl⟩ := Nat.exists_eq_succ_of_ne_zero hk0
    rw [padeL1Residual_coeff_succ f numerator lambda n (hnum (n + 1) hLk)]
    rw [hgeom n (by omega), sub_self, coeff_zero]

end Recurrence

section PolynomialEvaluation

/-- Evaluation of a polynomial `[L/1]` candidate. -/
def padeL1Eval (numerator : ℂ[X]) (lambda z : ℂ) : ℂ :=
  numerator.eval z / (1 - lambda * z)

theorem padeL1_error_eq_neg_residual_div
    (f numerator : ℂ[X]) (lambda z : ℂ)
    (hden : 1 - lambda * z ≠ 0) :
    padeL1Eval numerator lambda z - f.eval z =
      -(padeL1Residual f numerator lambda).eval z / (1 - lambda * z) := by
  simp only [padeL1Eval, padeL1Residual, padeL1Cross, padeL1Den,
    eval_sub, eval_mul, eval_one, eval_C, eval_X]
  field_simp [hden]
  ring

theorem padeL1_exact_of_geometric_tail
    (f numerator : ℂ[X]) (lambda z : ℂ) (L : ℕ)
    (hmatch : ∀ k, k ≤ L → numerator.coeff k = (padeL1Cross f lambda).coeff k)
    (hnum : ∀ k, L < k → numerator.coeff k = 0)
    (hgeom : ∀ n, L ≤ n → f.coeff (n + 1) = lambda * f.coeff n)
    (hden : 1 - lambda * z ≠ 0) :
    padeL1Eval numerator lambda z = f.eval z := by
  have hres := padeL1Residual_eq_zero_of_geometric_tail
    f numerator lambda L hmatch hnum hgeom
  have herr := padeL1_error_eq_neg_residual_div f numerator lambda z hden
  rw [hres, eval_zero, neg_zero, zero_div] at herr
  exact sub_eq_zero.mp herr

/-- Quantitative version: a small recurrence-defect residual gives a small
Padé error after division by a certified denominator margin. -/
theorem padeL1_error_norm_le
    (f numerator : ℂ[X]) (lambda z : ℂ) (REST lower : ℝ)
    (hlower : 0 < lower)
    (hdenLower : lower ≤ ‖1 - lambda * z‖)
    (hREST : ‖(padeL1Residual f numerator lambda).eval z‖ ≤ REST) :
    ‖padeL1Eval numerator lambda z - f.eval z‖ ≤ REST / lower := by
  have hdenNorm : 0 < ‖1 - lambda * z‖ := hlower.trans_le hdenLower
  have hden : 1 - lambda * z ≠ 0 := norm_pos_iff.mp hdenNorm
  rw [padeL1_error_eq_neg_residual_div f numerator lambda z hden,
    norm_div, norm_neg]
  have hREST0 : 0 ≤ REST := (norm_nonneg _).trans hREST
  exact div_le_div₀ hREST0 hREST hlower hdenLower

end PolynomialEvaluation

end

end Mandelbrot
