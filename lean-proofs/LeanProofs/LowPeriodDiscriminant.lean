/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodMultiplier
import Mathlib.Analysis.Complex.Polynomial.Basic
import Mathlib.FieldTheory.IsAlgClosed.Basic
import Mathlib.RingTheory.Polynomial.Resultant.Basic

/-!
# Exact discriminants for the low-period multiplier equations

The multiplier equations are viewed as polynomials in the parameter `c` with
coefficients in `ℤ[mu]`.  Their resultants with their `c`-derivatives are
computed inside Lean.  The resulting factorizations are therefore exact
certificates, rather than trusted output from an external computer algebra
system.
-/

namespace Mandelbrot

noncomputable section

open Complex Polynomial

/-- Integer polynomials in the multiplier variable. -/
abbrev MultiplierPolynomial := Polynomial ℤ

/-- The formal multiplier variable in `ℤ[mu]`. -/
def multiplierZ : MultiplierPolynomial := Polynomial.X

/-- The period-three multiplier equation as a polynomial in `c` over `ℤ[mu]`. -/
def periodThreeParameterPolynomialZ : Polynomial MultiplierPolynomial :=
  Polynomial.C (64 : MultiplierPolynomial) * Polynomial.X ^ 3 +
    Polynomial.C 128 * Polynomial.X ^ 2 +
    Polynomial.C (64 - 8 * multiplierZ) * Polynomial.X +
    Polynomial.C (64 - 16 * multiplierZ + multiplierZ ^ 2)

/-- The period-four multiplier equation as a polynomial in `c` over `ℤ[mu]`. -/
def periodFourParameterPolynomialZ : Polynomial MultiplierPolynomial :=
  Polynomial.C (4096 : MultiplierPolynomial) * Polynomial.X ^ 6 +
    Polynomial.C 12288 * Polynomial.X ^ 5 +
    Polynomial.C (12288 + 256 * multiplierZ) * Polynomial.X ^ 4 +
    Polynomial.C (12288 + 256 * multiplierZ) * Polynomial.X ^ 3 +
    Polynomial.C (8192 - 256 * multiplierZ - 16 * multiplierZ ^ 2) *
      Polynomial.X ^ 2 +
    Polynomial.C (4096 - 768 * multiplierZ + 48 * multiplierZ ^ 2 -
      multiplierZ ^ 3)

/-- Factored candidate for the period-three discriminant in the parameter. -/
def periodThreeDiscriminantZ : MultiplierPolynomial :=
  -4096 * (multiplierZ - 8) ^ 2 *
    (1472 - 176 * multiplierZ + 27 * multiplierZ ^ 2)

/-- The residual sextic factor in the period-four discriminant. -/
def periodFourDiscriminantResidualZ : MultiplierPolynomial :=
  60081152 - 12598144 * multiplierZ + 2799652 * multiplierZ ^ 2 -
    366579 * multiplierZ ^ 3 + 23722 * multiplierZ ^ 4 -
    619 * multiplierZ ^ 5 + 16 * multiplierZ ^ 6

/-- Factored candidate for the period-four discriminant in the parameter. -/
def periodFourDiscriminantZ : MultiplierPolynomial :=
  302231454903657293676544 * (multiplierZ - 16) ^ 6 *
    (multiplierZ + 16) ^ 2 * periodFourDiscriminantResidualZ

/-! ## Complex specializations and exact period-three discriminant -/

/-- Period three as an honest polynomial in the complex parameter `c`. -/
def periodThreeParameterPolynomial (mu : ℂ) : ℂ[X] :=
  C 64 * X ^ 3 + C 128 * X ^ 2 + C (64 - 8 * mu) * X +
    C (64 - 16 * mu + mu ^ 2)

theorem periodThreeParameterPolynomial_eval (c mu : ℂ) :
    (periodThreeParameterPolynomial mu).eval c =
      periodThreeMultiplierEquation c mu := by
  simp only [periodThreeParameterPolynomial, periodThreeMultiplierEquation,
    eval_add, eval_mul, eval_pow, eval_C, eval_X]
  ring

theorem periodThreeParameterPolynomial_degree (mu : ℂ) :
    (periodThreeParameterPolynomial mu).degree = 3 := by
  simpa only [periodThreeParameterPolynomial] using
    (Polynomial.degree_cubic
      (a := (64 : ℂ)) (b := (128 : ℂ))
      (c := 64 - 8 * mu) (d := 64 - 16 * mu + mu ^ 2) (by norm_num))

/-- Exact factorization of the genuine Mathlib discriminant in period three. -/
theorem periodThree_discr (mu : ℂ) :
    Polynomial.discr (periodThreeParameterPolynomial mu) =
      -4096 * (mu - 8) ^ 2 * (1472 - 176 * mu + 27 * mu ^ 2) := by
  have h0 : (periodThreeParameterPolynomial mu).coeff 0 =
      64 - 16 * mu + mu ^ 2 := by
    simp only [periodThreeParameterPolynomial, coeff_add, coeff_C_mul_X_pow,
      coeff_C]
    norm_num
  have h1 : (periodThreeParameterPolynomial mu).coeff 1 = 64 - 8 * mu := by
    simp only [periodThreeParameterPolynomial, coeff_add, coeff_C_mul_X_pow,
      coeff_C]
    norm_num
  have h2 : (periodThreeParameterPolynomial mu).coeff 2 = 128 := by
    simp only [periodThreeParameterPolynomial, coeff_add, coeff_C_mul_X_pow,
      coeff_C]
    norm_num
  have h3 : (periodThreeParameterPolynomial mu).coeff 3 = 64 := by
    simp only [periodThreeParameterPolynomial, coeff_add, coeff_C_mul_X_pow,
      coeff_C]
    norm_num
  rw [Polynomial.discr_of_degree_eq_three
    (periodThreeParameterPolynomial_degree mu), h0, h1, h2, h3]
  ring

/-! ## A compact Bézout certificate for period three -/

def periodThreeParameterDerivativeEquation (c mu : ℂ) : ℂ :=
  192 * c ^ 2 + 256 * c + 64 - 8 * mu

def periodThreeBezoutA (c mu : ℂ) : ℂ :=
  -(1856 + 384 * c - 192 * mu + 144 * c * mu + 27 * mu ^ 2)

def periodThreeBezoutB (c mu : ℂ) : ℂ :=
  384 + 704 * c + 128 * c ^ 2 - 64 * mu - 32 * c * mu +
    48 * c ^ 2 * mu + 2 * mu ^ 2 + 9 * c * mu ^ 2

def periodThreeCriticalFactor (mu : ℂ) : ℂ :=
  -(mu - 8) ^ 2 * (1472 - 176 * mu + 27 * mu ^ 2)

/-- An exact Bézout identity.  It is a short, kernel-checked certificate that
the multiplier equation and its parameter derivative cannot have a common
zero whenever the displayed critical factor is nonzero. -/
theorem periodThree_bezout (c mu : ℂ) :
    periodThreeBezoutA c mu * periodThreeMultiplierEquation c mu +
        periodThreeBezoutB c mu * periodThreeParameterDerivativeEquation c mu =
      periodThreeCriticalFactor mu := by
  simp only [periodThreeBezoutA, periodThreeBezoutB,
    periodThreeMultiplierEquation, periodThreeParameterDerivativeEquation,
    periodThreeCriticalFactor]
  ring

theorem periodThreeParameterPolynomial_derivative_eval (c mu : ℂ) :
    (periodThreeParameterPolynomial mu).derivative.eval c =
      periodThreeParameterDerivativeEquation c mu := by
  have hC2 : derivative (C mu ^ 2) = (0 : ℂ[X]) := by
    rw [← C_pow]
    exact derivative_C
  simp [periodThreeParameterPolynomial, periodThreeParameterDerivativeEquation, hC2]
  ring

/-! ## A compact Bézout certificate for period four -/

def periodFourParameterDerivativeEquation (c mu : ℂ) : ℂ :=
  4096 * (4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5) +
    256 * (4 * c ^ 3 + 3 * c ^ 2 - 2 * c) * mu - 32 * c * mu ^ 2

/-- Period four as an honest polynomial in the complex parameter `c`. -/
def periodFourParameterPolynomial (mu : ℂ) : ℂ[X] :=
  C 4096 * X ^ 6 + C 12288 * X ^ 5 + C (12288 + 256 * mu) * X ^ 4 +
    C (12288 + 256 * mu) * X ^ 3 +
    C (8192 - 256 * mu - 16 * mu ^ 2) * X ^ 2 +
    C (4096 - 768 * mu + 48 * mu ^ 2 - mu ^ 3)

theorem periodFourParameterPolynomial_eval (c mu : ℂ) :
    (periodFourParameterPolynomial mu).eval c =
      periodFourMultiplierEquation c mu := by
  simp only [periodFourParameterPolynomial, periodFourMultiplierEquation,
    eval_add, eval_mul, eval_pow, eval_C, eval_X]
  ring

theorem periodFourParameterPolynomial_degree (mu : ℂ) :
    (periodFourParameterPolynomial mu).degree = 6 := by
  unfold periodFourParameterPolynomial
  compute_degree <;> norm_num

theorem periodFourParameterPolynomial_derivative_eval (c mu : ℂ) :
    (periodFourParameterPolynomial mu).derivative.eval c =
      periodFourParameterDerivativeEquation c mu := by
  have hC2 : derivative (C mu ^ 2) = (0 : ℂ[X]) := by
    rw [← C_pow]
    exact derivative_C
  have hC3 : derivative (C mu ^ 3) = (0 : ℂ[X]) := by
    rw [← C_pow]
    exact derivative_C
  simp [periodFourParameterPolynomial, periodFourParameterDerivativeEquation, hC2, hC3]
  ring

def periodFourCriticalResidual (mu : ℂ) : ℂ :=
  60081152 - 12598144 * mu + 2799652 * mu ^ 2 - 366579 * mu ^ 3 +
    23722 * mu ^ 4 - 619 * mu ^ 5 + 16 * mu ^ 6

/-- The primitive eliminant certified below.  External exploration predicts
that the full period-four discriminant is `2^72` times this expression; the
Bézout theorem below does not rely on that prediction. -/
def periodFourCriticalFactor (mu : ℂ) : ℂ :=
  64 * (mu - 16) ^ 6 * (mu + 16) ^ 2 * periodFourCriticalResidual mu

def periodFourBezoutA (c mu : ℂ) : ℂ :=
  -64 * (mu - 16) ^ 3 * (mu + 16) ^ 2 * periodFourCriticalResidual mu +
    3072 * c ^ 4 * (mu - 16) ^ 2 *
      (-3437232128 + 640614400 * mu - 50491392 * mu ^ 2 +
        9478656 * mu ^ 3 - 1441616 * mu ^ 4 + 78409 * mu ^ 5 -
        1779 * mu ^ 6 + 98 * mu ^ 7) +
    3072 * c ^ 3 * (mu - 16) ^ 2 *
      (-6082789376 + 1396965376 * mu - 17504256 * mu ^ 2 -
        1863168 * mu ^ 3 - 967976 * mu ^ 4 + 62135 * mu ^ 5 +
        714 * mu ^ 6 + 59 * mu ^ 7 + 2 * mu ^ 8) -
    32 * c * (mu - 16) ^ 2 * (32 + mu) *
      (-5492441088 - 1096286208 * mu + 141029376 * mu ^ 2 -
        11525376 * mu ^ 3 + 2197680 * mu ^ 4 - 209151 * mu ^ 5 +
        4330 * mu ^ 6 - 179 * mu ^ 7 + 4 * mu ^ 8) +
    64 * c ^ 2 * (mu - 16) ^ 2 *
      (-111333605376 + 70627622912 * mu - 3463512064 * mu ^ 2 -
        164505600 * mu ^ 3 - 5213184 * mu ^ 4 + 1904396 * mu ^ 5 -
        28081 * mu ^ 6 + 3783 * mu ^ 7 + 118 * mu ^ 8)

def periodFourBezoutB (c mu : ℂ) : ℂ :=
  -128 * c ^ 3 * (mu - 16) ^ 2 * (mu + 16) *
      (-1125384192 + 554868736 * mu - 48414208 * mu ^ 2 +
        1080800 * mu ^ 3 - 76230 * mu ^ 4 + 10041 * mu ^ 5 -
        165 * mu ^ 6 + 22 * mu ^ 7) -
    512 * c ^ 5 * (mu - 16) ^ 2 *
      (-3437232128 + 640614400 * mu - 50491392 * mu ^ 2 +
        9478656 * mu ^ 3 - 1441616 * mu ^ 4 + 78409 * mu ^ 5 -
        1779 * mu ^ 6 + 98 * mu ^ 7) +
    (mu - 16) ^ 4 *
      (-5492441088 - 1096286208 * mu + 141029376 * mu ^ 2 -
        11525376 * mu ^ 3 + 2197680 * mu ^ 4 - 209151 * mu ^ 5 +
        4330 * mu ^ 6 - 179 * mu ^ 7 + 4 * mu ^ 8) -
    256 * c ^ 4 * (mu - 16) ^ 2 *
      (-15602810880 + 3434545152 * mu - 85499904 * mu ^ 2 +
        5752320 * mu ^ 3 - 3377568 * mu ^ 4 + 202679 * mu ^ 5 -
        351 * mu ^ 6 + 216 * mu ^ 7 + 4 * mu ^ 8) +
    16 * c ^ 2 * (mu - 16) ^ 2 *
      (53603205120 - 49481252864 * mu + 3893886976 * mu ^ 2 -
        432881664 * mu ^ 3 + 79372544 * mu ^ 4 - 5735664 * mu ^ 5 +
        118708 * mu ^ 6 - 7631 * mu ^ 7 + 51 * mu ^ 8) +
    2 * c * (mu - 16) ^ 3 *
      (91561656320 + 988807168 * mu + 3484811264 * mu ^ 2 -
        320319488 * mu ^ 3 - 6375040 * mu ^ 4 + 689696 * mu ^ 5 +
        149593 * mu ^ 6 - 1211 * mu ^ 7 + 186 * mu ^ 8)

set_option maxRecDepth 100000 in set_option maxHeartbeats 0 in
-- `ring` needs the exception to normalize the explicit bivariate certificate.
/-- Exact period-four Bézout certificate.  Wolfram was used only to discover
the coefficients; this polynomial identity is checked independently by Lean.
The local heartbeat exception lets `ring` normalize the two explicit
bivariate certificate polynomials. -/
theorem periodFour_bezout (c mu : ℂ) :
    periodFourBezoutA c mu * periodFourMultiplierEquation c mu +
        periodFourBezoutB c mu * periodFourParameterDerivativeEquation c mu =
      periodFourCriticalFactor mu := by
  simp only [periodFourBezoutA, periodFourBezoutB, periodFourMultiplierEquation,
    periodFourParameterDerivativeEquation, periodFourCriticalFactor,
    periodFourCriticalResidual]
  ring

/-! ## Nonvanishing on the closed multiplier disk -/

private theorem norm_nat_mul_pow_le (mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (a n : ℕ) : ‖(a : ℂ) * mu ^ n‖ ≤ a := by
  calc
    ‖(a : ℂ) * mu ^ n‖ = (a : ℝ) * ‖mu‖ ^ n := by
      simp [norm_pow]
    _ ≤ (a : ℝ) * 1 :=
      mul_le_mul_of_nonneg_left (pow_le_one₀ (norm_nonneg mu) hmu) (by positivity)
    _ = a := by simp

private theorem sub_nat_ne_zero_of_norm_le_one (mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (n : ℕ) (hn : 1 < n) : mu - n ≠ 0 := by
  intro h
  have hmn : mu = n := sub_eq_zero.mp h
  subst mu
  norm_num at hmu
  omega

private theorem add_nat_ne_zero_of_norm_le_one (mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (n : ℕ) (hn : 1 < n) : mu + n ≠ 0 := by
  intro h
  have hmn : mu = -(n : ℂ) := eq_neg_of_add_eq_zero_left h
  subst mu
  norm_num at hmu
  omega

theorem periodThreeCriticalResidual_ne_zero (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    1472 - 176 * mu + 27 * mu ^ 2 ≠ 0 := by
  have h176 : ‖(-(176 : ℂ)) * mu‖ ≤ 176 := by
    rw [norm_mul]
    norm_num
    nlinarith [norm_nonneg mu]
  have h27 : ‖(27 : ℂ) * mu ^ 2‖ ≤ 27 := norm_nat_mul_pow_le mu hmu 27 2
  have htail : ‖(-(176 : ℂ)) * mu + 27 * mu ^ 2‖ ≤ 203 := by
    calc
      ‖(-(176 : ℂ)) * mu + 27 * mu ^ 2‖ ≤
          ‖(-(176 : ℂ)) * mu‖ + ‖(27 : ℂ) * mu ^ 2‖ := norm_add_le _ _
      _ ≤ 176 + 27 := add_le_add h176 h27
      _ = 203 := by norm_num
  intro hzero
  have heq : (1472 : ℂ) = -((-(176 : ℂ)) * mu + 27 * mu ^ 2) := by
    linear_combination hzero
  have hcontra : (1472 : ℝ) ≤ 203 := by
    calc
      (1472 : ℝ) = ‖(1472 : ℂ)‖ := by norm_num
      _ = ‖-((-(176 : ℂ)) * mu + 27 * mu ^ 2)‖ := congrArg norm heq
      _ = ‖(-(176 : ℂ)) * mu + 27 * mu ^ 2‖ := norm_neg _
      _ ≤ 203 := htail
  norm_num at hcontra

theorem periodFourCriticalResidual_ne_zero (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    periodFourCriticalResidual mu ≠ 0 := by
  have h1 : ‖(-(12598144 : ℂ)) * mu‖ ≤ 12598144 := by
    rw [norm_mul]
    norm_num
    nlinarith [norm_nonneg mu]
  have h2 : ‖(2799652 : ℂ) * mu ^ 2‖ ≤ 2799652 :=
    norm_nat_mul_pow_le mu hmu 2799652 2
  have h3 : ‖(-(366579 : ℂ)) * mu ^ 3‖ ≤ 366579 := by
    rw [show (-(366579 : ℂ)) * mu ^ 3 = -((366579 : ℂ) * mu ^ 3) by ring,
      norm_neg]
    exact norm_nat_mul_pow_le mu hmu 366579 3
  have h4 : ‖(23722 : ℂ) * mu ^ 4‖ ≤ 23722 :=
    norm_nat_mul_pow_le mu hmu 23722 4
  have h5 : ‖(-(619 : ℂ)) * mu ^ 5‖ ≤ 619 := by
    rw [show (-(619 : ℂ)) * mu ^ 5 = -((619 : ℂ) * mu ^ 5) by ring,
      norm_neg]
    exact norm_nat_mul_pow_le mu hmu 619 5
  have h6 : ‖(16 : ℂ) * mu ^ 6‖ ≤ 16 := norm_nat_mul_pow_le mu hmu 16 6
  let t1 : ℂ := -(12598144 : ℂ) * mu
  let t2 : ℂ := 2799652 * mu ^ 2
  let t3 : ℂ := -(366579 : ℂ) * mu ^ 3
  let t4 : ℂ := 23722 * mu ^ 4
  let t5 : ℂ := -(619 : ℂ) * mu ^ 5
  let t6 : ℂ := 16 * mu ^ 6
  have ht1 : ‖t1‖ ≤ 12598144 := by simpa [t1] using h1
  have ht2 : ‖t2‖ ≤ 2799652 := by simpa [t2] using h2
  have ht3 : ‖t3‖ ≤ 366579 := by simpa [t3] using h3
  have ht4 : ‖t4‖ ≤ 23722 := by simpa [t4] using h4
  have ht5 : ‖t5‖ ≤ 619 := by simpa [t5] using h5
  have ht6 : ‖t6‖ ≤ 16 := by simpa [t6] using h6
  have h12 : ‖t1 + t2‖ ≤ 12598144 + 2799652 :=
    (norm_add_le t1 t2).trans (add_le_add ht1 ht2)
  have h123 : ‖t1 + t2 + t3‖ ≤ 12598144 + 2799652 + 366579 :=
    (norm_add_le (t1 + t2) t3).trans (add_le_add h12 ht3)
  have h1234 : ‖t1 + t2 + t3 + t4‖ ≤
      12598144 + 2799652 + 366579 + 23722 :=
    (norm_add_le (t1 + t2 + t3) t4).trans (add_le_add h123 ht4)
  have h12345 : ‖t1 + t2 + t3 + t4 + t5‖ ≤
      12598144 + 2799652 + 366579 + 23722 + 619 :=
    (norm_add_le (t1 + t2 + t3 + t4) t5).trans (add_le_add h1234 ht5)
  have htail : ‖t1 + t2 + t3 + t4 + t5 + t6‖ ≤ 15788732 := by
    calc
      ‖t1 + t2 + t3 + t4 + t5 + t6‖ ≤
          12598144 + 2799652 + 366579 + 23722 + 619 + 16 :=
        (norm_add_le (t1 + t2 + t3 + t4 + t5) t6).trans
          (add_le_add h12345 ht6)
      _ = 15788732 := by norm_num
  intro hzero
  rw [periodFourCriticalResidual] at hzero
  have heq : (60081152 : ℂ) = -(t1 + t2 + t3 + t4 + t5 + t6) := by
    dsimp only [t1, t2, t3, t4, t5, t6]
    linear_combination hzero
  have hcontra : (60081152 : ℝ) ≤ 15788732 := by
    calc
      (60081152 : ℝ) = ‖(60081152 : ℂ)‖ := by norm_num
      _ = ‖-(t1 + t2 + t3 + t4 + t5 + t6)‖ := congrArg norm heq
      _ = ‖t1 + t2 + t3 + t4 + t5 + t6‖ := norm_neg _
      _ ≤ 15788732 := htail
  norm_num at hcontra

theorem periodThreeCriticalFactor_ne_zero (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    periodThreeCriticalFactor mu ≠ 0 := by
  simp only [periodThreeCriticalFactor]
  exact mul_ne_zero
    (neg_ne_zero.mpr <|
      pow_ne_zero 2 (sub_nat_ne_zero_of_norm_le_one mu hmu 8 (by norm_num)))
    (periodThreeCriticalResidual_ne_zero mu hmu)

theorem periodThree_discr_ne_zero (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    Polynomial.discr (periodThreeParameterPolynomial mu) ≠ 0 := by
  rw [periodThree_discr]
  exact mul_ne_zero
    (mul_ne_zero (by norm_num)
      (pow_ne_zero 2 (sub_nat_ne_zero_of_norm_le_one mu hmu 8 (by norm_num))))
    (periodThreeCriticalResidual_ne_zero mu hmu)

theorem periodFourCriticalFactor_ne_zero (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    periodFourCriticalFactor mu ≠ 0 := by
  simp only [periodFourCriticalFactor]
  exact mul_ne_zero
    (mul_ne_zero
      (mul_ne_zero (by norm_num)
        (pow_ne_zero 6 (sub_nat_ne_zero_of_norm_le_one mu hmu 16 (by norm_num))))
      (pow_ne_zero 2 (add_nat_ne_zero_of_norm_le_one mu hmu 16 (by norm_num))))
    (periodFourCriticalResidual_ne_zero mu hmu)

/-! ## Simplicity of every parameter root over the closed disk -/

theorem periodThreeParameterDerivativeEquation_ne_zero_of_root
    (c mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (hroot : periodThreeMultiplierEquation c mu = 0) :
    periodThreeParameterDerivativeEquation c mu ≠ 0 := by
  intro hderiv
  apply periodThreeCriticalFactor_ne_zero mu hmu
  calc
    periodThreeCriticalFactor mu =
        periodThreeBezoutA c mu * periodThreeMultiplierEquation c mu +
          periodThreeBezoutB c mu * periodThreeParameterDerivativeEquation c mu :=
      (periodThree_bezout c mu).symm
    _ = 0 := by simp [hroot, hderiv]

theorem periodFourParameterDerivativeEquation_ne_zero_of_root
    (c mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (hroot : periodFourMultiplierEquation c mu = 0) :
    periodFourParameterDerivativeEquation c mu ≠ 0 := by
  intro hderiv
  apply periodFourCriticalFactor_ne_zero mu hmu
  calc
    periodFourCriticalFactor mu =
        periodFourBezoutA c mu * periodFourMultiplierEquation c mu +
          periodFourBezoutB c mu * periodFourParameterDerivativeEquation c mu :=
      (periodFour_bezout c mu).symm
    _ = 0 := by simp [hroot, hderiv]

theorem periodThreeParameterPolynomial_root_simple
    (c mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (hroot : (periodThreeParameterPolynomial mu).eval c = 0) :
    (periodThreeParameterPolynomial mu).derivative.eval c ≠ 0 := by
  rw [periodThreeParameterPolynomial_derivative_eval]
  apply periodThreeParameterDerivativeEquation_ne_zero_of_root c mu hmu
  rwa [periodThreeParameterPolynomial_eval] at hroot

theorem periodFourParameterPolynomial_root_simple
    (c mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (hroot : (periodFourParameterPolynomial mu).eval c = 0) :
    (periodFourParameterPolynomial mu).derivative.eval c ≠ 0 := by
  rw [periodFourParameterPolynomial_derivative_eval]
  apply periodFourParameterDerivativeEquation_ne_zero_of_root c mu hmu
  rwa [periodFourParameterPolynomial_eval] at hroot

theorem periodFourParameterPolynomial_isCoprime_derivative
    (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    IsCoprime (periodFourParameterPolynomial mu)
      (periodFourParameterPolynomial mu).derivative := by
  apply (Polynomial.isCoprime_iff_aeval_ne_zero_of_isAlgClosed
    (k := ℂ) ℂ (periodFourParameterPolynomial mu)
      (periodFourParameterPolynomial mu).derivative).2
  intro c
  by_cases hroot : (periodFourParameterPolynomial mu).eval c = 0
  · right
    simpa [Polynomial.aeval_def, Polynomial.eval₂_eq_eval_map] using
      periodFourParameterPolynomial_root_simple c mu hmu hroot
  · left
    simpa [Polynomial.aeval_def, Polynomial.eval₂_eq_eval_map] using hroot

/-- The genuine Mathlib discriminant is nonzero throughout the closed unit
multiplier disk.  This conclusion uses the compact Bézout certificate and does
not require expanding the full degree-six discriminant. -/
theorem periodFour_discr_ne_zero (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    Polynomial.discr (periodFourParameterPolynomial mu) ≠ 0 := by
  let p := periodFourParameterPolynomial mu
  have hpdeg : p.degree = 6 := by
    simpa only [p] using periodFourParameterPolynomial_degree mu
  have hcop : IsCoprime p p.derivative := by
    simpa only [p] using periodFourParameterPolynomial_isCoprime_derivative mu hmu
  have hres : Polynomial.resultant p p.derivative ≠ 0 := by
    intro hzero
    exact ((Polynomial.resultant_eq_zero_iff).1 hzero).2 hcop
  intro hdiscr
  apply hres
  have hrel := Polynomial.resultant_deriv (f := p) (by rw [hpdeg]; norm_num)
  rw [hdiscr, mul_zero] at hrel
  simpa only [Polynomial.natDegree_derivative] using hrel

end

end Mandelbrot
