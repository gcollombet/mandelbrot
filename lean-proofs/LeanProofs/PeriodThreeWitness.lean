/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.PeriodTwoBulb

/-!
# One transparent period-three witness

The main cardioid and the exact period-two bulb have total area `7*pi/16`.
To make the inequality strict we use one, and only one, additional parameter
disk.  It is centered at the rational parameter `-351/200`, close to the real
period-three center.  For every parameter in that disk the three-step return
maps the dynamical disk `D(0,1/200)` strictly into itself.

All constants below are deliberately coarse rational bounds.  There is no
mesh, interval subdivision, or imported numerical certificate.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Function Metric Set MeasureTheory
open scoped Topology NNReal ENNReal

def periodThreeCenter : ℂ := -(351 : ℂ) / 200

def periodThreeParameterRadius : ℝ := 1 / 100000

def periodThreeDynamicRadius : ℝ := 1 / 200

def periodThreeWitness : Set ℂ :=
  ball periodThreeCenter periodThreeParameterRadius

def criticalThirdValue (c : ℂ) : ℂ :=
  c ^ 4 + 2 * c ^ 3 + c ^ 2 + c

def thirdReturn (c z : ℂ) : ℂ :=
  orbit c z 3

theorem thirdReturn_formula (c z : ℂ) :
    thirdReturn c z =
      z ^ 8 + 4 * c * z ^ 6 + (6 * c ^ 2 + 2 * c) * z ^ 4 +
        (4 * c ^ 3 + 4 * c ^ 2) * z ^ 2 + criticalThirdValue c := by
  simp only [thirdReturn, orbit_succ, orbit_zero, quad, criticalThirdValue]
  ring

theorem criticalThirdValue_sub_factor (c d : ℂ) :
    criticalThirdValue c - criticalThirdValue d =
      (c - d) *
        ((c ^ 3 + c ^ 2 * d + c * d ^ 2 + d ^ 3) +
          2 * (c ^ 2 + c * d + d ^ 2) + (c + d) + 1) := by
  simp only [criticalThirdValue]
  ring

theorem norm_periodThreeCenter :
    ‖periodThreeCenter‖ = (351 / 200 : ℝ) := by
  norm_num [periodThreeCenter, norm_div]

theorem norm_criticalThirdValue_periodThreeCenter :
    ‖criticalThirdValue periodThreeCenter‖ =
      (1106001 / 1600000000 : ℝ) := by
  norm_num [criticalThirdValue, periodThreeCenter, norm_div]

theorem norm_le_two_of_mem_periodThreeWitness
    {c : ℂ} (hc : c ∈ periodThreeWitness) : ‖c‖ ≤ 2 := by
  have hdiff : ‖c - periodThreeCenter‖ < periodThreeParameterRadius := by
    simpa [periodThreeWitness, mem_ball, dist_eq] using hc
  apply le_of_lt
  calc
    ‖c‖ = ‖(c - periodThreeCenter) + periodThreeCenter‖ := by
      congr 1
      ring
    _ ≤ ‖c - periodThreeCenter‖ + ‖periodThreeCenter‖ := norm_add_le _ _
    _ < periodThreeParameterRadius + (351 / 200 : ℝ) := by
      rw [norm_periodThreeCenter]
      linarith
    _ < 2 := by norm_num [periodThreeParameterRadius]

theorem criticalThirdValue_difference_bound
    (c d : ℂ) (hc : ‖c‖ ≤ 2) (hd : ‖d‖ ≤ 2) :
    ‖criticalThirdValue c - criticalThirdValue d‖ ≤ 100 * ‖c - d‖ := by
  have hc2 : ‖c‖ ^ 2 ≤ 4 := by
    calc
      ‖c‖ ^ 2 ≤ (2 : ℝ) ^ 2 := pow_le_pow_left₀ (norm_nonneg c) hc 2
      _ = 4 := by norm_num
  have hd2 : ‖d‖ ^ 2 ≤ 4 := by
    calc
      ‖d‖ ^ 2 ≤ (2 : ℝ) ^ 2 := pow_le_pow_left₀ (norm_nonneg d) hd 2
      _ = 4 := by norm_num
  have hc3 : ‖c‖ ^ 3 ≤ 8 := by
    calc
      ‖c‖ ^ 3 ≤ (2 : ℝ) ^ 3 := pow_le_pow_left₀ (norm_nonneg c) hc 3
      _ = 8 := by norm_num
  have hd3 : ‖d‖ ^ 3 ≤ 8 := by
    calc
      ‖d‖ ^ 3 ≤ (2 : ℝ) ^ 3 := pow_le_pow_left₀ (norm_nonneg d) hd 3
      _ = 8 := by norm_num
  have hc2d : ‖c‖ ^ 2 * ‖d‖ ≤ 8 := by
    calc
      ‖c‖ ^ 2 * ‖d‖ ≤ 4 * ‖d‖ :=
        mul_le_mul_of_nonneg_right hc2 (norm_nonneg d)
      _ ≤ 4 * 2 := mul_le_mul_of_nonneg_left hd (by norm_num)
      _ = 8 := by norm_num
  have hcd2 : ‖c‖ * ‖d‖ ^ 2 ≤ 8 := by
    calc
      ‖c‖ * ‖d‖ ^ 2 ≤ 2 * ‖d‖ ^ 2 :=
        mul_le_mul_of_nonneg_right hc (sq_nonneg ‖d‖)
      _ ≤ 2 * 4 := mul_le_mul_of_nonneg_left hd2 (by norm_num)
      _ = 8 := by norm_num
  have hcd : ‖c‖ * ‖d‖ ≤ 4 := by
    calc
      ‖c‖ * ‖d‖ ≤ 2 * ‖d‖ :=
        mul_le_mul_of_nonneg_right hc (norm_nonneg d)
      _ ≤ 2 * 2 := mul_le_mul_of_nonneg_left hd (by norm_num)
      _ = 4 := by norm_num
  let A : ℂ := c ^ 3 + c ^ 2 * d + c * d ^ 2 + d ^ 3
  let B : ℂ := c ^ 2 + c * d + d ^ 2
  let C : ℂ := c + d
  have hA : ‖A‖ ≤ 32 := by
    dsimp [A]
    calc
      ‖c ^ 3 + c ^ 2 * d + c * d ^ 2 + d ^ 3‖ ≤
          ‖c ^ 3 + c ^ 2 * d + c * d ^ 2‖ + ‖d ^ 3‖ := norm_add_le _ _
      _ ≤ (‖c ^ 3 + c ^ 2 * d‖ + ‖c * d ^ 2‖) + ‖d ^ 3‖ := by
        gcongr
        exact norm_add_le _ _
      _ ≤ ((‖c ^ 3‖ + ‖c ^ 2 * d‖) + ‖c * d ^ 2‖) + ‖d ^ 3‖ := by
        gcongr
        exact norm_add_le _ _
      _ ≤ 32 := by
        rw [norm_pow, norm_mul, norm_pow, norm_mul, norm_pow, norm_pow]
        linarith
  have hB : ‖B‖ ≤ 12 := by
    dsimp [B]
    calc
      ‖c ^ 2 + c * d + d ^ 2‖ ≤ ‖c ^ 2 + c * d‖ + ‖d ^ 2‖ := norm_add_le _ _
      _ ≤ (‖c ^ 2‖ + ‖c * d‖) + ‖d ^ 2‖ := by
        gcongr
        exact norm_add_le _ _
      _ ≤ 12 := by
        rw [norm_pow, norm_mul, norm_pow]
        linarith
  have hC : ‖C‖ ≤ 4 := by
    dsimp [C]
    exact (norm_add_le c d).trans (by linarith)
  rw [criticalThirdValue_sub_factor, norm_mul]
  change ‖c - d‖ * ‖A + 2 * B + C + 1‖ ≤ 100 * ‖c - d‖
  have hpoly : ‖A + 2 * B + C + 1‖ ≤ 100 := by
    calc
      ‖A + 2 * B + C + 1‖ ≤ ‖A + 2 * B + C‖ + 1 := by
        simpa using norm_add_le (A + 2 * B + C) (1 : ℂ)
      _ ≤ (‖A + 2 * B‖ + ‖C‖) + 1 := by
        gcongr
        exact norm_add_le _ _
      _ ≤ ((‖A‖ + ‖2 * B‖) + ‖C‖) + 1 := by
        gcongr
        exact norm_add_le _ _
      _ ≤ 100 := by
        rw [norm_mul]
        norm_num
        nlinarith
  calc
    ‖c - d‖ * ‖A + 2 * B + C + 1‖ ≤ ‖c - d‖ * 100 :=
      mul_le_mul_of_nonneg_left hpoly (norm_nonneg _)
    _ = 100 * ‖c - d‖ := by ring

theorem thirdReturn_norm_bound
    (c z : ℂ) (hc : ‖c‖ ≤ 2) (hz : ‖z‖ ≤ 1) :
    ‖thirdReturn c z‖ ≤ 85 * ‖z‖ ^ 2 + ‖criticalThirdValue c‖ := by
  have hc2 : ‖c‖ ^ 2 ≤ 4 := by
    calc
      ‖c‖ ^ 2 ≤ (2 : ℝ) ^ 2 := pow_le_pow_left₀ (norm_nonneg c) hc 2
      _ = 4 := by norm_num
  have hc3 : ‖c‖ ^ 3 ≤ 8 := by
    calc
      ‖c‖ ^ 3 ≤ (2 : ℝ) ^ 3 := pow_le_pow_left₀ (norm_nonneg c) hc 3
      _ = 8 := by norm_num
  have hcoefFour : ‖6 * c ^ 2 + 2 * c‖ ≤ 28 := by
    calc
      ‖6 * c ^ 2 + 2 * c‖ ≤ ‖6 * c ^ 2‖ + ‖2 * c‖ := norm_add_le _ _
      _ = 6 * ‖c‖ ^ 2 + 2 * ‖c‖ := by
        rw [norm_mul, norm_pow, norm_mul]
        norm_num
      _ ≤ 28 := by linarith
  have hcoefTwo : ‖4 * c ^ 3 + 4 * c ^ 2‖ ≤ 48 := by
    calc
      ‖4 * c ^ 3 + 4 * c ^ 2‖ ≤ ‖4 * c ^ 3‖ + ‖4 * c ^ 2‖ := norm_add_le _ _
      _ = 4 * ‖c‖ ^ 3 + 4 * ‖c‖ ^ 2 := by
        rw [norm_mul, norm_pow, norm_mul, norm_pow]
        norm_num
      _ ≤ 48 := by linarith
  rw [thirdReturn_formula]
  calc
    ‖z ^ 8 + 4 * c * z ^ 6 + (6 * c ^ 2 + 2 * c) * z ^ 4 +
        (4 * c ^ 3 + 4 * c ^ 2) * z ^ 2 + criticalThirdValue c‖ ≤
        ‖z ^ 8 + 4 * c * z ^ 6 + (6 * c ^ 2 + 2 * c) * z ^ 4 +
          (4 * c ^ 3 + 4 * c ^ 2) * z ^ 2‖ +
          ‖criticalThirdValue c‖ := norm_add_le _ _
    _ ≤ (‖z ^ 8 + 4 * c * z ^ 6 + (6 * c ^ 2 + 2 * c) * z ^ 4‖ +
          ‖(4 * c ^ 3 + 4 * c ^ 2) * z ^ 2‖) +
          ‖criticalThirdValue c‖ := by
      gcongr
      exact norm_add_le _ _
    _ ≤ ((‖z ^ 8 + 4 * c * z ^ 6‖ +
          ‖(6 * c ^ 2 + 2 * c) * z ^ 4‖) +
          ‖(4 * c ^ 3 + 4 * c ^ 2) * z ^ 2‖) +
          ‖criticalThirdValue c‖ := by
      gcongr
      exact norm_add_le _ _
    _ ≤ (((‖z ^ 8‖ + ‖4 * c * z ^ 6‖) +
          ‖(6 * c ^ 2 + 2 * c) * z ^ 4‖) +
          ‖(4 * c ^ 3 + 4 * c ^ 2) * z ^ 2‖) +
          ‖criticalThirdValue c‖ := by
      gcongr
      exact norm_add_le _ _
    _ ≤ (‖z‖ ^ 8 + 8 * ‖z‖ ^ 6 + 28 * ‖z‖ ^ 4 +
          48 * ‖z‖ ^ 2) + ‖criticalThirdValue c‖ := by
      rw [norm_pow, norm_mul, norm_mul, norm_pow, norm_mul, norm_pow,
        norm_mul, norm_pow]
      norm_num
      gcongr
      nlinarith
    _ ≤ 85 * ‖z‖ ^ 2 + ‖criticalThirdValue c‖ := by
      have hz2 : ‖z‖ ^ 2 ≤ 1 := by nlinarith [norm_nonneg z]
      have hz4 : ‖z‖ ^ 4 ≤ ‖z‖ ^ 2 := by nlinarith [sq_nonneg (‖z‖ ^ 2)]
      have hz6 : ‖z‖ ^ 6 ≤ ‖z‖ ^ 2 := by
        calc
          ‖z‖ ^ 6 = ‖z‖ ^ 4 * ‖z‖ ^ 2 := by ring
          _ ≤ ‖z‖ ^ 4 * 1 :=
            mul_le_mul_of_nonneg_left hz2 (by positivity)
          _ ≤ ‖z‖ ^ 2 := by simpa using hz4
      have hz8 : ‖z‖ ^ 8 ≤ ‖z‖ ^ 2 := by
        calc
          ‖z‖ ^ 8 = ‖z‖ ^ 6 * ‖z‖ ^ 2 := by ring
          _ ≤ ‖z‖ ^ 6 * 1 :=
            mul_le_mul_of_nonneg_left hz2 (by positivity)
          _ ≤ ‖z‖ ^ 2 := by simpa using hz6
      linarith

theorem thirdReturn_maps_periodThreeDynamicBall
    {c : ℂ} (hc : c ∈ periodThreeWitness) :
    MapsTo (thirdReturn c) (ball 0 periodThreeDynamicRadius)
      (ball 0 periodThreeDynamicRadius) := by
  intro z hz
  have hzNorm : ‖z‖ < periodThreeDynamicRadius := by
    simpa [mem_ball, dist_zero_right] using hz
  have hcNorm : ‖c‖ ≤ 2 := norm_le_two_of_mem_periodThreeWitness hc
  have hcenterNorm : ‖periodThreeCenter‖ ≤ 2 := by
    rw [norm_periodThreeCenter]
    norm_num
  have hcDiff : ‖c - periodThreeCenter‖ < periodThreeParameterRadius := by
    simpa [periodThreeWitness, mem_ball, dist_eq] using hc
  have hvariation :
      ‖criticalThirdValue c - criticalThirdValue periodThreeCenter‖ <
        100 * periodThreeParameterRadius := by
    exact (criticalThirdValue_difference_bound c periodThreeCenter
      hcNorm hcenterNorm).trans_lt (mul_lt_mul_of_pos_left hcDiff (by norm_num))
  have hcritical : ‖criticalThirdValue c‖ <
      100 * periodThreeParameterRadius + 1106001 / 1600000000 := by
    calc
      ‖criticalThirdValue c‖ = ‖(criticalThirdValue c -
          criticalThirdValue periodThreeCenter) +
          criticalThirdValue periodThreeCenter‖ := by
        congr 1
        ring
      _ ≤ ‖criticalThirdValue c - criticalThirdValue periodThreeCenter‖ +
          ‖criticalThirdValue periodThreeCenter‖ := norm_add_le _ _
      _ < 100 * periodThreeParameterRadius + 1106001 / 1600000000 := by
        rw [norm_criticalThirdValue_periodThreeCenter]
        linarith
  have hreturn := thirdReturn_norm_bound c z hcNorm (by
    dsimp only [periodThreeDynamicRadius] at hzNorm
    norm_num at hzNorm ⊢
    linarith)
  rw [mem_ball_zero_iff]
  have hzSq : ‖z‖ ^ 2 < periodThreeDynamicRadius ^ 2 := by
    nlinarith [norm_nonneg z]
  dsimp only [periodThreeDynamicRadius, periodThreeParameterRadius] at *
  norm_num at hzSq ⊢
  nlinarith

theorem thirdReturn_iterate_eq_orbit (c z : ℂ) (n : ℕ) :
    (thirdReturn c)^[n] z = orbit c z (3 * n) := by
  change ((quad c)^[3])^[n] z = (quad c)^[3 * n] z
  rw [Function.iterate_mul]

theorem orbit_three_mul_mem_periodThreeDynamicBall
    {c : ℂ} (hc : c ∈ periodThreeWitness) (n : ℕ) :
    orbit c 0 (3 * n) ∈ ball 0 periodThreeDynamicRadius := by
  rw [← thirdReturn_iterate_eq_orbit]
  exact (thirdReturn_maps_periodThreeDynamicBall hc).iterate n (by
    simp [mem_ball, periodThreeDynamicRadius])

theorem periodThreeWitness_subset_Mandelbrot :
    periodThreeWitness ⊆ Mandelbrot := by
  intro c hc
  have hcNorm : ‖c‖ ≤ 2 := norm_le_two_of_mem_periodThreeWitness hc
  apply (mem_Mandelbrot_iff c).2
  refine ⟨11, fun n => ?_⟩
  rw [mandelbrotOrbit_eq_orbit]
  let k : ℕ := n / 3
  have hremLt : n % 3 < 3 := Nat.mod_lt n (by norm_num)
  have hn : n % 3 + 3 * k = n := by
    dsimp [k]
    exact Nat.mod_add_div n 3
  have hgroupMem :
      orbit c 0 (3 * k) ∈ ball 0 periodThreeDynamicRadius :=
    orbit_three_mul_mem_periodThreeDynamicBall hc k
  have hgroup : ‖orbit c 0 (3 * k)‖ < (1 / 200 : ℝ) := by
    simpa [mem_ball, dist_zero_right, periodThreeDynamicRadius] using hgroupMem
  have hrem : n % 3 = 0 ∨ n % 3 = 1 ∨ n % 3 = 2 := by omega
  rcases hrem with hzero | hone | htwo
  · rw [← hn, hzero, zero_add]
    linarith
  · have horbit : orbit c 0 n = quad c (orbit c 0 (3 * k)) := by
      rw [← hn, hone, orbit_add]
      rfl
    rw [horbit]
    calc
      ‖quad c (orbit c 0 (3 * k))‖ ≤
          ‖orbit c 0 (3 * k)‖ ^ 2 + ‖c‖ := by
        simp only [quad]
        exact (norm_add_le _ _).trans_eq (by rw [norm_pow])
      _ ≤ 11 := by nlinarith [norm_nonneg (orbit c 0 (3 * k))]
  · have horbit : orbit c 0 n =
        quad c (quad c (orbit c 0 (3 * k))) := by
      rw [← hn, htwo, orbit_add]
      rfl
    rw [horbit]
    have hfirst : ‖quad c (orbit c 0 (3 * k))‖ ≤ 3 := by
      calc
        ‖quad c (orbit c 0 (3 * k))‖ ≤
            ‖orbit c 0 (3 * k)‖ ^ 2 + ‖c‖ := by
          simp only [quad]
          exact (norm_add_le _ _).trans_eq (by rw [norm_pow])
        _ ≤ 3 := by nlinarith [norm_nonneg (orbit c 0 (3 * k))]
    calc
      ‖quad c (quad c (orbit c 0 (3 * k)))‖ ≤
          ‖quad c (orbit c 0 (3 * k))‖ ^ 2 + ‖c‖ := by
        simp only [quad]
        exact (norm_add_le _ _).trans_eq (by rw [norm_pow])
      _ ≤ 11 := by nlinarith [norm_nonneg (quad c (orbit c 0 (3 * k)))]

theorem volume_periodThreeWitness :
    volume periodThreeWitness =
      ENNReal.ofReal (Real.pi / 10000000000) := by
  symm
  rw [periodThreeWitness, Complex.volume_ball]
  rw [ENNReal.ofReal_div_of_pos
    (by norm_num : (0 : ℝ) < 10000000000)]
  rw [show ENNReal.ofReal Real.pi = (NNReal.pi : ENNReal) by
    simp [← NNReal.coe_real_pi]]
  rw [show ENNReal.ofReal periodThreeParameterRadius =
      (1 / 100000 : ENNReal) by
    rw [periodThreeParameterRadius,
      ENNReal.ofReal_div_of_pos (by norm_num : (0 : ℝ) < 100000)]
    norm_num]
  rw [show ENNReal.ofReal (10000000000 : ℝ) =
      (10000000000 : ENNReal) by norm_num]
  simp only [div_eq_mul_inv, one_mul]
  change (NNReal.pi : ENNReal) * (10000000000 : ENNReal)⁻¹ =
    (100000 : ENNReal)⁻¹ ^ 2 * (NNReal.pi : ENNReal)
  rw [← ENNReal.inv_pow (a := (100000 : ENNReal)) (n := 2)]
  norm_num only [OfNat.ofNat, pow_two]
  exact mul_comm _ _

theorem norm_lt_three_quarters_of_mem_mainCardioid
    {c : ℂ} (hc : c ∈ mainCardioid) : ‖c‖ < (3 / 4 : ℝ) := by
  obtain ⟨lambda, hlambda, rfl⟩ := hc
  have hlambdaNorm : ‖lambda‖ < 1 := by
    simpa [mem_ball, dist_zero_right] using hlambda
  calc
    ‖mainCardioidMap lambda‖ ≤ ‖lambda / 2‖ + ‖lambda ^ 2 / 4‖ := by
      simp only [mainCardioidMap]
      exact norm_sub_le _ _
    _ = ‖lambda‖ / 2 + ‖lambda‖ ^ 2 / 4 := by
      rw [norm_div, norm_div, norm_pow]
      norm_num
    _ < 3 / 4 := by nlinarith [norm_nonneg lambda]

theorem norm_lt_five_quarters_of_mem_periodTwoBulb
    {c : ℂ} (hc : c ∈ periodTwoBulb) : ‖c‖ < (5 / 4 : ℝ) := by
  have hdiff : ‖c - (-1 : ℂ)‖ < (1 / 4 : ℝ) := by
    simpa [periodTwoBulb, mem_ball, dist_eq] using hc
  calc
    ‖c‖ = ‖(c - (-1 : ℂ)) + (-1 : ℂ)‖ := by
      congr 1
      ring
    _ ≤ ‖c - (-1 : ℂ)‖ + ‖(-1 : ℂ)‖ := norm_add_le _ _
    _ < 5 / 4 := by norm_num at hdiff ⊢; linarith

theorem seven_quarters_lt_norm_of_mem_periodThreeWitness
    {c : ℂ} (hc : c ∈ periodThreeWitness) : (7 / 4 : ℝ) < ‖c‖ := by
  have hdiff : ‖c - periodThreeCenter‖ < periodThreeParameterRadius := by
    simpa [periodThreeWitness, mem_ball, dist_eq] using hc
  have hlower : ‖periodThreeCenter‖ - ‖c - periodThreeCenter‖ ≤ ‖c‖ := by
    have h := norm_sub_norm_le periodThreeCenter (periodThreeCenter - c)
    calc
      ‖periodThreeCenter‖ - ‖c - periodThreeCenter‖ =
          ‖periodThreeCenter‖ - ‖periodThreeCenter - c‖ := by
        rw [norm_sub_rev]
      _ ≤ ‖periodThreeCenter - (periodThreeCenter - c)‖ := h
      _ = ‖c‖ := by
        congr 1
        ring
  rw [norm_periodThreeCenter] at hlower
  dsimp only [periodThreeParameterRadius] at hdiff
  norm_num at hdiff ⊢
  linarith

theorem disjoint_mainCardioid_union_periodTwoBulb_periodThreeWitness :
    Disjoint (mainCardioid ∪ periodTwoBulb) periodThreeWitness := by
  rw [Set.disjoint_left]
  rintro c (hcMain | hcTwo) hcThree
  · have hsmall := norm_lt_three_quarters_of_mem_mainCardioid hcMain
    have hlarge := seven_quarters_lt_norm_of_mem_periodThreeWitness hcThree
    linarith
  · have hsmall := norm_lt_five_quarters_of_mem_periodTwoBulb hcTwo
    have hlarge := seven_quarters_lt_norm_of_mem_periodThreeWitness hcThree
    linarith

theorem volume_three_witnesses :
    volume ((mainCardioid ∪ periodTwoBulb) ∪ periodThreeWitness) =
      ENNReal.ofReal (7 * Real.pi / 16) +
        ENNReal.ofReal (Real.pi / 10000000000) := by
  rw [measure_union
    disjoint_mainCardioid_union_periodTwoBulb_periodThreeWitness
    isOpen_ball.measurableSet,
    volume_mainCardioid_union_periodTwoBulb, volume_periodThreeWitness]

theorem three_witnesses_subset_Mandelbrot :
    (mainCardioid ∪ periodTwoBulb) ∪ periodThreeWitness ⊆ Mandelbrot :=
  union_subset mainCardioid_union_periodTwoBulb_subset_Mandelbrot
    periodThreeWitness_subset_Mandelbrot

theorem volume_Mandelbrot_gt_seven_pi_div_sixteen :
    ENNReal.ofReal (7 * Real.pi / 16) < volume Mandelbrot := by
  apply lt_of_lt_of_le _ (measure_mono three_witnesses_subset_Mandelbrot)
  rw [volume_three_witnesses]
  exact ENNReal.lt_add_right (by simp) (by
    rw [ne_eq, ENNReal.ofReal_eq_zero, not_le]
    positivity)

end

end Mandelbrot
