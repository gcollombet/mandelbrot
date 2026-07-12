/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.PadeDominance
import LeanProofs.Dynamics
import Mathlib.Analysis.Normed.Group.InfiniteSum
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# Parabolic Padé superconvergence

The Riccati flow `ż = z²` has time-`t` map `z/(1-tz)`.  This file proves
that a degree-one denominator resums the complete geometric jet, identifies
the relevant Hankel minors, gives a quantitative quasi-geometric tail bound,
and compares the discrete parabolic map `z ↦ z+z²` to the exact flow.
-/

namespace Mandelbrot

noncomputable section

open Complex

section Algebra

variable {K : Type*} [Field K]

/-- Time-`t` map of the parabolic Riccati flow `ż = z²`. -/
def parabolicFlow (t z : K) : K := z / (1 - t * z)

/-- Polynomial jet through degree `order` of the parabolic flow. -/
def parabolicFlowJet (order : ℕ) (t z : K) : K :=
  z * ∑ n ∈ Finset.range order, (t * z) ^ n

theorem parabolicFlow_zero (z : K) : parabolicFlow 0 z = z := by
  simp [parabolicFlow]

/-- Exact finite geometric remainder of every fixed-order polynomial jet. -/
theorem parabolicFlow_sub_jet
    (order : ℕ) (t z : K) (hden : 1 - t * z ≠ 0) :
    parabolicFlow t z - parabolicFlowJet order t z =
      t ^ order * z ^ (order + 1) / (1 - t * z) := by
  have hden' : 1 - z * t ≠ 0 := by simpa [mul_comm] using hden
  have hgeom : (∑ n ∈ Finset.range order, (z * t) ^ n) * (1 - z * t) =
      1 - (z * t) ^ order := geom_sum_mul_neg (z * t) order
  simp only [parabolicFlow, parabolicFlowJet]
  rw [div_sub' hden]
  simp only [mul_comm t z]
  field_simp [hden']
  rw [show (1 - z * t) * (∑ n ∈ Finset.range order, (z * t) ^ n) =
      (∑ n ∈ Finset.range order, (z * t) ^ n) * (1 - z * t) by ring,
    hgeom, mul_pow]
  ring

/-- The flow has the additive semigroup law wherever the displayed
denominators are defined. -/
theorem parabolicFlow_add
    (s t z : K)
    (ht : 1 - t * z ≠ 0)
    (hst : 1 - (s + t) * z ≠ 0) :
    parabolicFlow s (parabolicFlow t z) = parabolicFlow (s + t) z := by
  have ht' : 1 - z * t ≠ 0 := by simpa [mul_comm] using ht
  have hst' : 1 - z * (s + t) ≠ 0 := by simpa [mul_comm] using hst
  have hdeneq : 1 - s * (z / (1 - t * z)) =
      (1 - (s + t) * z) / (1 - t * z) := by
    field_simp [ht']
    ring
  simp only [parabolicFlow]
  rw [hdeneq]
  field_simp [ht', hst']

/-- Consecutive integer-time flow maps, used by the shadowing theorem. -/
theorem parabolicFlow_nat_succ
    (n : ℕ) (z : K)
    (hn : 1 - (n : K) * z ≠ 0)
    (hsucc : 1 - ((n + 1 : ℕ) : K) * z ≠ 0) :
    parabolicFlow ((n + 1 : ℕ) : K) z =
      parabolicFlow 1 (parabolicFlow (n : K) z) := by
  have hst : 1 - ((1 : K) + (n : K)) * z ≠ 0 := by
    simpa [Nat.cast_add, Nat.cast_one, add_comm] using hsucc
  symm
  simpa [Nat.cast_add, Nat.cast_one, add_comm] using
    parabolicFlow_add (1 : K) (n : K) z hn hst

end Algebra

section Hankel

variable {K : Type*} [Field K]

/-- First Hankel minor of the pure-`z` coefficient sequence. -/
def hankel1 (j : JetCoeffs K) : K := j.a10 * j.a30 - j.a20 ^ 2

/-- Next Hankel minor, relevant to the `[2/1]` extraction. -/
def hankel2 (j : JetCoeffs K) : K := j.a20 * j.a40 - j.a30 ^ 2

theorem extractK1_q30_eq_hankel1_div
    (j : JetCoeffs K) (h10 : j.a10 ≠ 0) :
    q30 j (extractK1 j) = hankel1 j / j.a10 := by
  simp only [q30, extractK1, hankel1]
  field_simp [h10]
  ring

theorem extractK2_q40_eq_hankel2_div
    (j : JetCoeffs K) (h20 : j.a20 ≠ 0) :
    q40 j (extractK2 j) = hankel2 j / j.a20 := by
  simp only [q40, extractK2, hankel2]
  field_simp [h20]
  ring

/-- A geometric recurrence forces every consecutive Hankel minor to vanish. -/
theorem hankel_zero_of_geometric_recurrence
    (a : ℕ → K) (lambda : K)
    (hrec : ∀ n, a (n + 1) = lambda * a n) :
    ∀ n, a n * a (n + 2) - a (n + 1) ^ 2 = 0 := by
  intro n
  rw [hrec n, show n + 2 = (n + 1) + 1 by omega, hrec (n + 1), hrec n]
  ring

/-- Conversely, nonzero consecutive coefficients and vanishing Hankel minors
force one fixed geometric recurrence. -/
theorem geometric_recurrence_of_hankel_zero
    (a : ℕ → K) (ha : ∀ n, a n ≠ 0)
    (hH : ∀ n, a n * a (n + 2) - a (n + 1) ^ 2 = 0) :
    ∀ n, a (n + 1) = (a 1 / a 0) * a n := by
  intro n
  induction n with
  | zero =>
      field_simp [ha 0]
  | succ n ih =>
      apply mul_left_cancel₀ (ha n)
      have hminor : a n * a (n + 2) = a (n + 1) ^ 2 := by
        have := hH n
        exact sub_eq_zero.mp this
      rw [hminor]
      rw [ih]
      ring

theorem hankel_rank_one_iff_geometric_recurrence
    (a : ℕ → K) (ha : ∀ n, a n ≠ 0) :
    (∀ n, a n * a (n + 2) - a (n + 1) ^ 2 = 0) ↔
      ∃ lambda, ∀ n, a (n + 1) = lambda * a n := by
  constructor
  · intro hH
    exact ⟨a 1 / a 0, geometric_recurrence_of_hankel_zero a ha hH⟩
  · rintro ⟨lambda, hrec⟩
    exact hankel_zero_of_geometric_recurrence a lambda hrec

end Hankel

section QuantitativeTail

/-- A generic shifted complex tail. -/
def shiftedTail (u : ℕ → ℂ) (start : ℕ) : ℂ :=
  ∑' k : ℕ, u (start + k)

/-- Direct comparison with a shifted geometric series. -/
theorem norm_shiftedTail_le_geometric
    (u : ℕ → ℂ) (start : ℕ) (M theta : ℝ)
    (_hM : 0 ≤ M) (htheta0 : 0 ≤ theta) (htheta1 : theta < 1)
    (hu : ∀ k, ‖u (start + k)‖ ≤ M * theta ^ (start + k)) :
    ‖shiftedTail u start‖ ≤ M * theta ^ start / (1 - theta) := by
  have hgeom := (hasSum_geometric_of_lt_one htheta0 htheta1).mul_left
    (M * theta ^ start)
  apply tsum_of_norm_bounded hgeom
  intro k
  calc
    ‖u (start + k)‖ ≤ M * theta ^ (start + k) := hu k
    _ = (M * theta ^ start) * theta ^ k := by rw [pow_add]; ring

/-- Quantitative Padé gain: if recurrence defects are `delta` times the
ordinary coefficient majorant, division by a denominator with margin
`1-mu` costs exactly the factor `1/(1-mu)`. -/
theorem pade_defect_tail_le_scaled_jet_bound
    (defect : ℕ → ℂ) (start : ℕ) (M theta delta mu : ℝ)
    (hM : 0 ≤ M) (hdelta : 0 ≤ delta)
    (htheta0 : 0 ≤ theta) (htheta1 : theta < 1)
    (_hmu0 : 0 ≤ mu) (hmu1 : mu < 1)
    (hdefect : ∀ k, ‖defect (start + k)‖ ≤
      delta * M * theta ^ (start + k))
    (den : ℂ) (hden : 1 - mu ≤ ‖den‖) :
    ‖shiftedTail defect start / den‖ ≤
      (delta / (1 - mu)) * (M * theta ^ start / (1 - theta)) := by
  have hmargin : 0 < 1 - mu := sub_pos.mpr hmu1
  have hdenPos : 0 < ‖den‖ := hmargin.trans_le hden
  have htail := norm_shiftedTail_le_geometric defect start (delta * M) theta
    (mul_nonneg hdelta hM) htheta0 htheta1 (by
      intro k
      simpa [mul_assoc] using hdefect k)
  rw [norm_div]
  calc
    ‖shiftedTail defect start‖ / ‖den‖ ≤
        (delta * M * theta ^ start / (1 - theta)) / (1 - mu) := by
      have hbound : 0 ≤ delta * M * theta ^ start / (1 - theta) := by positivity
      exact div_le_div₀ hbound htail hmargin hden
    _ = (delta / (1 - mu)) * (M * theta ^ start / (1 - theta)) := by ring

/-- The Padé majorant is strictly smaller than the ordinary jet-tail
majorant whenever `delta < 1-mu`. -/
theorem pade_bound_lt_jet_bound
    (M theta delta mu : ℝ) (start : ℕ)
    (hM : 0 < M) (htheta : 0 < theta) (htheta1 : theta < 1)
    (_hmu : 0 ≤ mu) (hgain : delta < 1 - mu) (hdelta : 0 ≤ delta) :
    (delta / (1 - mu)) * (M * theta ^ start / (1 - theta)) <
      M * theta ^ start / (1 - theta) := by
  have hmargin : 0 < 1 - mu := hdelta.trans_lt hgain
  have hfactor : delta / (1 - mu) < 1 := (div_lt_one hmargin).mpr hgain
  have hbase : 0 < M * theta ^ start / (1 - theta) := by positivity
  nlinarith

end QuantitativeTail

section ComplexFlow

/-- The discrete parabolic Mandelbrot germ. -/
def parabolicDiscrete (z : ℂ) : ℂ := z + z ^ 2

/-- The polynomial `[1/1]` evaluator with numerator `X` is exactly the
parabolic time map. -/
theorem padeL1_X_eq_parabolicFlow (t z : ℂ) :
    padeL1Eval Polynomial.X t z = parabolicFlow t z := by
  simp [padeL1Eval, parabolicFlow]

/-- On the parabolic flow, Padé has zero error while every fixed polynomial
jet has a nonzero geometric remainder away from `t=0`, `z=0`, and the pole. -/
theorem parabolic_pade_strictly_better_than_jet
    (order : ℕ) (t z : ℂ)
    (ht : t ≠ 0) (hz : z ≠ 0) (hden : 1 - t * z ≠ 0) :
    ‖padeL1Eval Polynomial.X t z - parabolicFlow t z‖ = 0 ∧
      0 < ‖parabolicFlowJet order t z - parabolicFlow t z‖ := by
  constructor
  · rw [padeL1_X_eq_parabolicFlow, sub_self, norm_zero]
  · have hrem := parabolicFlow_sub_jet order t z hden
    have hnonzero : parabolicFlow t z - parabolicFlowJet order t z ≠ 0 := by
      rw [hrem]
      exact div_ne_zero (mul_ne_zero (pow_ne_zero order ht)
        (pow_ne_zero (order + 1) hz)) hden
    apply norm_pos_iff.mpr
    exact sub_ne_zero.mpr (Ne.symm (sub_ne_zero.mp hnonzero))

theorem parabolicFlow_one_eq_padeSeed (z : ℂ) :
    parabolicFlow 1 z = padeSeed 1 z 0 := by
  simp [parabolicFlow, padeSeed]

theorem parabolicFlow_one_sub_discrete
    (z : ℂ) (hden : 1 - z ≠ 0) :
    parabolicFlow 1 z - parabolicDiscrete z = z ^ 3 / (1 - z) := by
  rw [parabolicFlow_one_eq_padeSeed]
  simpa [parabolicDiscrete, exactStep] using
    padeSeed_sub_exactStep_julia (1 : ℂ) z hden

theorem parabolic_den_lower
    (z : ℂ) (r : ℝ) (hz : ‖z‖ ≤ r) : 1 - r ≤ ‖1 - z‖ := by
  have htri : 1 - ‖z‖ ≤ ‖1 - z‖ := by
    simpa using norm_sub_norm_le (1 : ℂ) z
  linarith

/-- Uniform local discretization error on `|z| ≤ r < 1`. -/
theorem parabolic_local_error_le
    (z : ℂ) (r : ℝ) (hr0 : 0 ≤ r) (hr1 : r < 1) (hz : ‖z‖ ≤ r) :
    ‖parabolicDiscrete z - parabolicFlow 1 z‖ ≤ r ^ 3 / (1 - r) := by
  have hmargin : 0 < 1 - r := sub_pos.mpr hr1
  have hdenLower := parabolic_den_lower z r hz
  have hdenNorm : 0 < ‖1 - z‖ := hmargin.trans_le hdenLower
  have hden : 1 - z ≠ 0 := norm_pos_iff.mp hdenNorm
  rw [← norm_neg (parabolicDiscrete z - parabolicFlow 1 z), neg_sub,
    parabolicFlow_one_sub_discrete z hden, norm_div, norm_pow]
  have hz3 : ‖z‖ ^ 3 ≤ r ^ 3 := pow_le_pow_left₀ (norm_nonneg z) hz 3
  exact div_le_div₀ (pow_nonneg hr0 3) hz3 hmargin hdenLower

theorem parabolicFlow_one_sub
    (x y : ℂ) (hx : 1 - x ≠ 0) (hy : 1 - y ≠ 0) :
    parabolicFlow 1 x - parabolicFlow 1 y =
      (x - y) / ((1 - x) * (1 - y)) := by
  simp only [parabolicFlow, one_mul]
  field_simp [hx, hy]
  ring

/-- Explicit Lipschitz constant of the time-one flow on the closed disk. -/
theorem parabolicFlow_one_lipschitz_on_disk
    (x y : ℂ) (r : ℝ) (_hr0 : 0 ≤ r) (hr1 : r < 1)
    (hx : ‖x‖ ≤ r) (hy : ‖y‖ ≤ r) :
    dist (parabolicFlow 1 x) (parabolicFlow 1 y) ≤
      (1 / (1 - r) ^ 2) * dist x y := by
  have hmargin : 0 < 1 - r := sub_pos.mpr hr1
  have hxl := parabolic_den_lower x r hx
  have hyl := parabolic_den_lower y r hy
  have hxpos : 0 < ‖1 - x‖ := hmargin.trans_le hxl
  have hypos : 0 < ‖1 - y‖ := hmargin.trans_le hyl
  have hxne : 1 - x ≠ 0 := norm_pos_iff.mp hxpos
  have hyne : 1 - y ≠ 0 := norm_pos_iff.mp hypos
  have hprod : (1 - r) ^ 2 ≤ ‖1 - x‖ * ‖1 - y‖ := by
    nlinarith [mul_le_mul hxl hyl hmargin.le hxpos.le]
  rw [dist_eq, parabolicFlow_one_sub x y hxne hyne, norm_div, norm_mul, dist_eq]
  have hnum : 0 ≤ ‖x - y‖ := norm_nonneg _
  have hsq : 0 < (1 - r) ^ 2 := sq_pos_of_pos hmargin
  have hden : 0 < ‖1 - x‖ * ‖1 - y‖ := mul_pos hxpos hypos
  calc
    ‖x - y‖ / (‖1 - x‖ * ‖1 - y‖) ≤ ‖x - y‖ / (1 - r) ^ 2 := by
      exact div_le_div₀ hnum le_rfl hsq hprod
    _ = (1 / (1 - r) ^ 2) * ‖x - y‖ := by ring

/-- Finite-horizon shadowing of the discrete parabolic germ by the exact
Riccati flow.  Both paths must remain in the certified disk. -/
theorem parabolic_discrete_shadowing
    (approx : ℕ → ℂ) (z0 : ℂ) (r : ℝ)
    (hr0 : 0 ≤ r) (hr1 : r < 1)
    (hstart : approx 0 = z0)
    (hstep : ∀ n, approx (n + 1) = parabolicDiscrete (approx n))
    (happrox : ∀ n, ‖approx n‖ ≤ r)
    (hflow : ∀ n : ℕ, ‖parabolicFlow (n : ℂ) z0‖ ≤ r)
    (hnopole : ∀ n : ℕ, 1 - (n : ℂ) * z0 ≠ 0) :
    ∀ n, dist (approx n) (parabolicFlow (n : ℂ) z0) ≤
      (r ^ 3 / (1 - r)) *
        ∑ k ∈ Finset.range n, (1 / (1 - r) ^ 2) ^ k := by
  let S : Set ℂ := {z | ‖z‖ ≤ r}
  let exact : ℕ → ℂ := fun n => parabolicFlow (n : ℂ) z0
  apply periodic_model_error_on S (parabolicFlow 1) exact approx
      (r ^ 3 / (1 - r)) (1 / (1 - r) ^ 2)
  · positivity
  · positivity
  · simpa [exact, parabolicFlow_zero] using hstart
  · intro n
    exact parabolicFlow_nat_succ n z0 (hnopole n) (hnopole (n + 1))
  · intro n
    rw [hstep n]
    simpa only [dist_eq, norm_sub_rev] using
      parabolic_local_error_le (approx n) r hr0 hr1 (happrox n)
  · intro n
    exact hflow n
  · intro n
    exact happrox n
  · intro x hx y hy
    exact parabolicFlow_one_lipschitz_on_disk x y r hr0 hr1 hx hy

end ComplexFlow

end

end Mandelbrot
