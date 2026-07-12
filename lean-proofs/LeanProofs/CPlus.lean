/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Algebra

/-!
# Exact coefficient cancellations for Möbius-c⁺
-/

namespace Mandelbrot

section Field

variable {K : Type*} [Field K]

@[ext]
structure JetCoeffs (K : Type*) where
  a10 : K
  a01 : K
  a20 : K
  a11 : K
  a02 : K
  a21 : K
  a30 : K
  a40 : K

@[ext]
structure CPlus (K : Type*) where
  A : K
  B : K
  D : K
  F : K
  Ap : K
  Dp : K
  N2 : K

/-- `[1/1]-c⁺` extraction. -/
def extractK1 (j : JetCoeffs K) : CPlus K where
  A := j.a10
  B := j.a01
  D := -j.a20 / j.a10
  F := -j.a02 / j.a01
  Ap := j.a11 + (-j.a20 / j.a10) * j.a01 + (-j.a02 / j.a01) * j.a10
  Dp := -(j.a21 + (-j.a20 / j.a10) * j.a11 + (-j.a02 / j.a01) * j.a20) / j.a10
  N2 := 0

/-- `[2/1]-c⁺` extraction. -/
def extractK2 (j : JetCoeffs K) : CPlus K where
  A := j.a10
  B := j.a01
  D := -j.a30 / j.a20
  F := -j.a02 / j.a01
  Ap := j.a11 + (-j.a30 / j.a20) * j.a01 + (-j.a02 / j.a01) * j.a10
  Dp := -(j.a21 + (-j.a30 / j.a20) * j.a11 + (-j.a02 / j.a01) * j.a20) / j.a10
  N2 := j.a20 + (-j.a30 / j.a20) * j.a10

def q20 (j : JetCoeffs K) (m : CPlus K) : K := j.a20 + m.D * j.a10 - m.N2
def q11 (j : JetCoeffs K) (m : CPlus K) : K := j.a11 + m.D * j.a01 + m.F * j.a10 - m.Ap
def q02 (j : JetCoeffs K) (m : CPlus K) : K := j.a02 + m.F * j.a01
def q21 (j : JetCoeffs K) (m : CPlus K) : K :=
  j.a21 + m.D * j.a11 + m.Dp * j.a10 + m.F * j.a20
def q30 (j : JetCoeffs K) (m : CPlus K) : K := j.a30 + m.D * j.a20
def q40 (j : JetCoeffs K) (m : CPlus K) : K := j.a40 + m.D * j.a30

theorem extractK1_q20 (j : JetCoeffs K) (h10 : j.a10 ≠ 0) :
    q20 j (extractK1 j) = 0 := by
  simp only [q20, extractK1]
  field_simp
  ring

theorem extractK1_q11 (j : JetCoeffs K) : q11 j (extractK1 j) = 0 := by
  simp [q11, extractK1]

theorem extractK1_q02 (j : JetCoeffs K) (h01 : j.a01 ≠ 0) :
    q02 j (extractK1 j) = 0 := by
  simp only [q02, extractK1]
  field_simp
  ring

theorem extractK1_q21 (j : JetCoeffs K) (h10 : j.a10 ≠ 0) :
    q21 j (extractK1 j) = 0 := by
  simp only [q21, extractK1]
  field_simp
  ring

theorem extractK2_q20 (j : JetCoeffs K) : q20 j (extractK2 j) = 0 := by
  simp [q20, extractK2]

theorem extractK2_q11 (j : JetCoeffs K) : q11 j (extractK2 j) = 0 := by
  simp [q11, extractK2]

theorem extractK2_q02 (j : JetCoeffs K) (h01 : j.a01 ≠ 0) :
    q02 j (extractK2 j) = 0 := by
  simp only [q02, extractK2]
  field_simp
  ring

theorem extractK2_q21 (j : JetCoeffs K) (h10 : j.a10 ≠ 0) :
    q21 j (extractK2 j) = 0 := by
  simp only [q21, extractK2]
  field_simp
  ring

theorem extractK2_q30 (j : JetCoeffs K) (h20 : j.a20 ≠ 0) :
    q30 j (extractK2 j) = 0 := by
  simp only [q30, extractK2]
  field_simp
  ring

/-- On the model flow `a_n = L^(n-1)`, the next `[2/1]` residual also vanishes. -/
theorem modelFlow_q40 (L : K) (_hL : L ≠ 0) :
    let j : JetCoeffs K :=
      { a10 := 1, a01 := 0, a20 := L, a11 := 0, a02 := 0,
        a21 := 0, a30 := L ^ 2, a40 := L ^ 3 }
    q40 j (extractK2 j) = 0 := by
  dsimp [q40, extractK2]
  field_simp [_hL]
  ring

/-- The `[2/1]` extraction of a single perturbation step is exact. -/
theorem extractK2_seed (a : K) :
    let j : JetCoeffs K :=
      { a10 := a, a01 := 1, a20 := 1, a11 := 0, a02 := 0,
        a21 := 0, a30 := 0, a40 := 0 }
    extractK2 j = { A := a, B := 1, D := 0, F := 0, Ap := 0, Dp := 0, N2 := 1 } := by
  ext <;> simp [extractK2]

/-- Rational `[2/1]-c⁺` evaluator. -/
def cplusEval (m : CPlus K) (z c : K) : K :=
  (m.N2 * z ^ 2 + (m.A + m.Ap * c) * z + m.B * c) /
    (1 + (m.D + m.Dp * c) * z + m.F * c)

theorem cplusEval_seed_exact (a z c : K) :
    let m : CPlus K := { A := a, B := 1, D := 0, F := 0, Ap := 0, Dp := 0, N2 := 1 }
    cplusEval m z c = exactStep a z c := by
  simp [cplusEval, exactStep]
  ring

def cplusNum (m : CPlus K) (z c : K) : K :=
  m.N2 * z ^ 2 + (m.A + m.Ap * c) * z + m.B * c

def cplusDen (m : CPlus K) (z c : K) : K := 1 + (m.D + m.Dp * c) * z + m.F * c

/-- Exact finite-difference identity whose linear coefficient is `∂N/∂z`. -/
theorem cplusNum_increment_z (m : CPlus K) (z c h : K) :
    cplusNum m (z + h) c - cplusNum m z c =
      h * (2 * m.N2 * z + (m.A + m.Ap * c) + m.N2 * h) := by
  simp only [cplusNum]
  ring

/-- Exact finite-difference identity whose coefficient is `∂den/∂z`. -/
theorem cplusDen_increment_z (m : CPlus K) (z c h : K) :
    cplusDen m (z + h) c - cplusDen m z c = h * (m.D + m.Dp * c) := by
  simp only [cplusDen]
  ring

/-- The numerator is affine in `c`; this coefficient is `∂N/∂c`. -/
theorem cplusNum_increment_c (m : CPlus K) (z c h : K) :
    cplusNum m z (c + h) - cplusNum m z c = h * (m.Ap * z + m.B) := by
  simp only [cplusNum]
  ring

/-- The denominator is affine in `c`; this coefficient is `∂den/∂c`. -/
theorem cplusDen_increment_c (m : CPlus K) (z c h : K) :
    cplusDen m z (c + h) - cplusDen m z c = h * (m.Dp * z + m.F) := by
  simp only [cplusDen]
  ring

/-- Cross-multiplied quotient increment in the `z` channel.  The linear term
is exactly the numerator of the shader formula for `m_z`; the only remaining
term is quadratic in the increment. -/
theorem cplusQuotient_linear_z (m : CPlus K) (z c h : K) :
    cplusNum m (z + h) c * cplusDen m z c -
        cplusNum m z c * cplusDen m (z + h) c =
      h * ((2 * m.N2 * z + (m.A + m.Ap * c)) * cplusDen m z c -
        cplusNum m z c * (m.D + m.Dp * c)) +
      h ^ 2 * m.N2 * cplusDen m z c := by
  simp only [cplusNum, cplusDen]
  ring

/-- Cross-multiplied quotient increment in the `c` channel.  It is exactly
linear because both numerator and denominator are affine in `c`. -/
theorem cplusQuotient_linear_c (m : CPlus K) (z c h : K) :
    cplusNum m z (c + h) * cplusDen m z c -
        cplusNum m z c * cplusDen m z (c + h) =
      h * ((m.Ap * z + m.B) * cplusDen m z c -
        cplusNum m z c * (m.Dp * z + m.F)) := by
  simp only [cplusNum, cplusDen]
  ring

end Field

end Mandelbrot
