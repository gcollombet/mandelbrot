/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FiniteCycleFatou
import Mathlib.Algebra.BigOperators.Group.Finset.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# The first multiplier coefficient at a center of arbitrary period

This module isolates the local calculation which scales to every period.  It
does not assume the global Douady--Hubbard uniformization theorem.  Instead it
takes a differentiable local parameter branch and its periodic point as input,
then computes the derivative of the parameter with respect to the multiplier
at the superattracting center.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Function
open scoped BigOperators Topology

/-- Parameter derivative of the critical orbit `c ↦ q_c^[n](0)`. -/
def criticalOrbitParameterDerivative (c : ℂ) : ℕ → ℂ
  | 0 => 0
  | n + 1 =>
      2 * orbit c 0 n * criticalOrbitParameterDerivative c n + 1

/-- Derivative recurrence for an orbit whose parameter has derivative `a`
and whose starting point has derivative `b`, evaluated at a center where the
starting point is zero. -/
def parameterizedOrbitDerivative (c a b : ℂ) : ℕ → ℂ
  | 0 => b
  | n + 1 => 2 * orbit c 0 n * parameterizedOrbitDerivative c a b n + a

theorem hasDerivAt_parameterized_orbit
    (C Z : ℂ → ℂ) {mu c a b : ℂ}
    (hC0 : C mu = c) (hZ0 : Z mu = 0)
    (hC : HasDerivAt C a mu) (hZ : HasDerivAt Z b mu) :
    ∀ n : ℕ, HasDerivAt (fun q => orbit (C q) (Z q) n)
      (parameterizedOrbitDerivative c a b n) mu := by
  intro n
  induction n with
  | zero => simpa [parameterizedOrbitDerivative] using hZ
  | succ n ih =>
      have hstep := (ih.pow 2).add hC
      refine (hstep.congr_of_eventuallyEq
        (Filter.Eventually.of_forall fun q => ?_)).congr_deriv ?_
      · simp only [Pi.add_apply, Pi.pow_apply]
        rw [orbit_succ]
        rfl
      · simp [parameterizedOrbitDerivative, hC0, hZ0]

theorem parameterizedOrbitDerivative_succ
    (c a b : ℂ) (n : ℕ) :
    parameterizedOrbitDerivative c a b (n + 1) =
      a * criticalOrbitParameterDerivative c (n + 1) := by
  induction n with
  | zero =>
      simp [parameterizedOrbitDerivative, criticalOrbitParameterDerivative]
  | succ n ih =>
      rw [parameterizedOrbitDerivative, criticalOrbitParameterDerivative]
      rw [ih]
      ring

theorem parameterizedOrbitDerivative_one_zero (c : ℂ) (n : ℕ) :
    parameterizedOrbitDerivative c 1 0 n =
      criticalOrbitParameterDerivative c n := by
  cases n with
  | zero => simp [parameterizedOrbitDerivative, criticalOrbitParameterDerivative]
  | succ n =>
      simpa using parameterizedOrbitDerivative_succ c 1 0 n

theorem hasDerivAt_criticalOrbit (c : ℂ) (n : ℕ) :
    HasDerivAt (fun q => orbit q 0 n)
      (criticalOrbitParameterDerivative c n) c := by
  convert hasDerivAt_parameterized_orbit (fun q : ℂ => q) (fun _ => 0)
    (mu := c) (c := c) (a := 1) (b := 0) rfl rfl
    (hasDerivAt_id c) (hasDerivAt_const c 0) n using 1
  exact (parameterizedOrbitDerivative_one_zero c n).symm

/-- Multiplier product of the first `n` points of the orbit starting at `z`.
The recursive definition exposes the critical factor `2*z`. -/
def cycleMultiplier (c z : ℂ) : ℕ → ℂ
  | 0 => 1
  | n + 1 => (2 * z) * cycleMultiplier c (quad c z) n

/-- Product over the noncritical points of a centered cycle of length `n+1`. -/
def criticalCycleTail (c : ℂ) (n : ℕ) : ℂ :=
  cycleMultiplier c c n

theorem differentiableAt_parameterized_cycleMultiplier
    (C Z : ℂ → ℂ) {mu : ℂ}
    (hC : DifferentiableAt ℂ C mu) (hZ : DifferentiableAt ℂ Z mu) :
    ∀ n : ℕ, DifferentiableAt ℂ (fun q => cycleMultiplier (C q) (Z q) n) mu := by
  intro n
  induction n generalizing Z with
  | zero => simp [cycleMultiplier]
  | succ n ih =>
      have hnext : DifferentiableAt ℂ (fun q => quad (C q) (Z q)) mu := by
        change DifferentiableAt ℂ (Z ^ 2 + C) mu
        exact (hZ.pow 2).add hC
      change DifferentiableAt ℂ
        ((fun q => 2 * Z q) * fun q => cycleMultiplier (C q) (quad (C q) (Z q)) n) mu
      exact (hZ.const_mul (2 : ℂ)).mul (ih _ hnext)

theorem cycleMultiplier_eq_prod_orbit (c z : ℂ) (n : ℕ) :
    cycleMultiplier c z n = ∏ j ∈ Finset.range n, 2 * orbit c z j := by
  induction n generalizing z with
  | zero => simp [cycleMultiplier]
  | succ n ih =>
      rw [cycleMultiplier, Finset.prod_range_succ']
      simp only [orbit_zero]
      rw [ih]
      apply mul_comm

theorem criticalCycleTail_eq_prod (c : ℂ) (n : ℕ) :
    criticalCycleTail c n =
      ∏ j ∈ Finset.range n, 2 * orbit c 0 (j + 1) := by
  rw [criticalCycleTail, cycleMultiplier_eq_prod_orbit]
  apply Finset.prod_congr rfl
  intro j hj
  rw [orbit_succ_start]
  simp [quad]

/-- Local arbitrary-period coefficient formula.  The two eventual equalities
are precisely the local periodic-point equation and the normalization saying
that `mu` is the return multiplier.  No global uniformization is assumed. -/
theorem parameter_firstCoefficient_eq_of_center_branch
    (C Z : ℂ → ℂ) (c a b : ℂ) (n : ℕ)
    (hC0 : C 0 = c) (hZ0 : Z 0 = 0)
    (hC : HasDerivAt C a 0) (hZ : HasDerivAt Z b 0)
    (hperiodic :
      (fun mu => orbit (C mu) (Z mu) (n + 1)) =ᶠ[𝓝 0] Z)
    (hmultiplier :
      (fun mu => cycleMultiplier (C mu) (Z mu) (n + 1)) =ᶠ[𝓝 0]
        fun mu => mu) :
    a = 1 / (2 * criticalOrbitParameterDerivative c (n + 1) *
      criticalCycleTail c n) := by
  have horbit := hasDerivAt_parameterized_orbit C Z hC0 hZ0 hC hZ (n + 1)
  have horbitAsZ := horbit.congr_of_eventuallyEq hperiodic.symm
  have hbRecurrence : parameterizedOrbitDerivative c a b (n + 1) = b :=
    horbitAsZ.unique hZ
  have hb : b = a * criticalOrbitParameterDerivative c (n + 1) := by
    rw [← parameterizedOrbitDerivative_succ c a b n]
    exact hbRecurrence.symm
  have hnext : DifferentiableAt ℂ (fun mu => quad (C mu) (Z mu)) 0 := by
    change DifferentiableAt ℂ (Z ^ 2 + C) 0
    exact (hZ.differentiableAt.pow 2).add hC.differentiableAt
  have htailDiff := differentiableAt_parameterized_cycleMultiplier C
    (fun mu => quad (C mu) (Z mu)) hC.differentiableAt hnext n
  have htail := htailDiff.hasDerivAt
  have hproduct := (hZ.const_mul (2 : ℂ)).mul htail
  have hmultDeriv :
      HasDerivAt (fun mu => cycleMultiplier (C mu) (Z mu) (n + 1))
        (2 * b * criticalCycleTail c n) 0 := by
    refine (hproduct.congr_of_eventuallyEq
      (Filter.Eventually.of_forall fun mu => ?_)).congr_deriv ?_
    · rfl
    · simp [hC0, hZ0, criticalCycleTail, quad]
  have hmultAsId := hmultDeriv.congr_of_eventuallyEq hmultiplier.symm
  have hmultOne : 2 * b * criticalCycleTail c n = 1 :=
    hmultAsId.unique (hasDerivAt_id 0)
  have hprod :
      a * (2 * criticalOrbitParameterDerivative c (n + 1) *
        criticalCycleTail c n) = 1 := by
    rw [hb] at hmultOne
    linear_combination hmultOne
  have hdenom :
      2 * criticalOrbitParameterDerivative c (n + 1) *
        criticalCycleTail c n ≠ 0 := by
    intro hzero
    rw [hzero, mul_zero] at hprod
    norm_num at hprod
  exact (eq_div_iff hdenom).2 hprod

/-- Expanded form of the denominator, matching the usual product over all
noncritical points of the centered cycle. -/
theorem parameter_firstCoefficient_eq_prod_of_center_branch
    (C Z : ℂ → ℂ) (c a b : ℂ) (n : ℕ)
    (hC0 : C 0 = c) (hZ0 : Z 0 = 0)
    (hC : HasDerivAt C a 0) (hZ : HasDerivAt Z b 0)
    (hperiodic :
      (fun mu => orbit (C mu) (Z mu) (n + 1)) =ᶠ[𝓝 0] Z)
    (hmultiplier :
      (fun mu => cycleMultiplier (C mu) (Z mu) (n + 1)) =ᶠ[𝓝 0]
        fun mu => mu) :
    a = 1 / (2 ^ (n + 1) * criticalOrbitParameterDerivative c (n + 1) *
      ∏ j ∈ Finset.range n, orbit c 0 (j + 1)) := by
  rw [parameter_firstCoefficient_eq_of_center_branch C Z c a b n
    hC0 hZ0 hC hZ hperiodic hmultiplier, criticalCycleTail_eq_prod]
  rw [Finset.prod_mul_distrib]
  simp only [Finset.prod_const, Finset.card_range]
  ring

/-- At the center `c = 0` of the main cardioid, the parameter derivative with
respect to the multiplier is `1/2`. -/
theorem parameter_firstCoefficient_periodOne
    (C Z : ℂ → ℂ) (a b : ℂ)
    (hC0 : C 0 = 0) (hZ0 : Z 0 = 0)
    (hC : HasDerivAt C a 0) (hZ : HasDerivAt Z b 0)
    (hperiodic : (fun mu => orbit (C mu) (Z mu) 1) =ᶠ[𝓝 0] Z)
    (hmultiplier :
      (fun mu => cycleMultiplier (C mu) (Z mu) 1) =ᶠ[𝓝 0]
        fun mu => mu) :
    a = 1 / 2 := by
  rw [parameter_firstCoefficient_eq_of_center_branch C Z 0 a b 0
    hC0 hZ0 hC hZ hperiodic hmultiplier]
  norm_num [criticalOrbitParameterDerivative, criticalCycleTail,
    cycleMultiplier]

/-- At the center `c = -1` of the period-two component, the parameter
derivative with respect to the multiplier is `1/4`. -/
theorem parameter_firstCoefficient_periodTwo
    (C Z : ℂ → ℂ) (a b : ℂ)
    (hC0 : C 0 = -1) (hZ0 : Z 0 = 0)
    (hC : HasDerivAt C a 0) (hZ : HasDerivAt Z b 0)
    (hperiodic : (fun mu => orbit (C mu) (Z mu) 2) =ᶠ[𝓝 0] Z)
    (hmultiplier :
      (fun mu => cycleMultiplier (C mu) (Z mu) 2) =ᶠ[𝓝 0]
        fun mu => mu) :
    a = 1 / 4 := by
  rw [parameter_firstCoefficient_eq_of_center_branch C Z (-1) a b 1
    hC0 hZ0 hC hZ hperiodic hmultiplier]
  norm_num [criticalOrbitParameterDerivative, criticalCycleTail,
    cycleMultiplier, orbit_succ, quad]

end

end Mandelbrot
