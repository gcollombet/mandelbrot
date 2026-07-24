/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.KoenigsAnalytic
import Mathlib.Analysis.SpecialFunctions.Complex.Analytic
import Mathlib.Analysis.SpecialFunctions.Complex.LogBounds
import Mathlib.Analysis.SpecificLimits.Normed

/-!
# Analytic Böttcher coordinate near infinity

The reciprocal change of variables `u = 1 / z` sends infinity to zero and
conjugates `q_c(z) = z² + c` to

`h_c(u) = u² / (1 + c u²)`.

This file constructs the local Böttcher coordinate of this superattracting
germ by a uniformly convergent logarithmic correction series, then transports
it back to an exterior neighborhood of infinity.
-/

namespace Mandelbrot

noncomputable section

open Filter Function Metric Set
open scoped Topology

/-- Reciprocal form of the quadratic map near infinity. -/
def reciprocalQuad (c u : ℂ) : ℂ :=
  u ^ 2 / (1 + c * u ^ 2)

@[simp] theorem reciprocalQuad_zero (c : ℂ) :
    reciprocalQuad c 0 = 0 := by
  simp [reciprocalQuad]

/-- The reciprocal change of variables conjugates `z²+c` to
`u²/(1+c u²)`. -/
theorem reciprocalQuad_inv
    (c z : ℂ) (hz : z ≠ 0) :
    reciprocalQuad c z⁻¹ = (quad c z)⁻¹ := by
  by_cases hq : quad c z = 0
  · have hden : 1 + c * z⁻¹ ^ 2 = 0 := by
      rw [quad] at hq
      field_simp [hz]
      linear_combination hq
    rw [reciprocalQuad, hq, hden]
    simp
  · rw [reciprocalQuad, quad]
    field_simp [hz, hq]

theorem norm_one_add_lower (x : ℂ) :
    1 - ‖x‖ ≤ ‖1 + x‖ := by
  have htri := norm_sub_le (1 + x) x
  rw [add_sub_cancel_right, norm_one] at htri
  linarith

/-- Quantitative reciprocal estimate on a disk where the denominator stays
at least `1/2` away from zero. -/
theorem norm_reciprocalQuad_le
    (c u : ℂ) (rho : ℝ)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    (hu : ‖u‖ ≤ rho) :
    ‖reciprocalQuad c u‖ ≤ 2 * ‖u‖ ^ 2 := by
  have hcu : ‖c * u ^ 2‖ ≤ 1 / 2 := by
    calc
      ‖c * u ^ 2‖ = ‖c‖ * ‖u‖ ^ 2 := by
        rw [norm_mul, norm_pow]
      _ ≤ ‖c‖ * rho ^ 2 := by
        gcongr
      _ ≤ 1 / 2 := hc
  have hden : 1 / 2 ≤ ‖1 + c * u ^ 2‖ := by
    have hreverse := norm_one_add_lower (c * u ^ 2)
    linarith
  have hdenPos : 0 < ‖1 + c * u ^ 2‖ := by linarith
  rw [reciprocalQuad, norm_div, norm_pow]
  calc
    ‖u‖ ^ 2 / ‖1 + c * u ^ 2‖ ≤ ‖u‖ ^ 2 / (1 / 2) := by
      exact div_le_div₀ (sq_nonneg _) le_rfl (by norm_num) hden
    _ = 2 * ‖u‖ ^ 2 := by ring

/-- A sufficiently small reciprocal disk is forward invariant. -/
theorem mapsTo_reciprocalQuad_ball
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 < rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2) :
    MapsTo (reciprocalQuad c) (ball 0 rho) (ball 0 rho) := by
  intro u hu
  rw [mem_ball_zero_iff] at hu ⊢
  have hbound :=
    norm_reciprocalQuad_le c u rho hc hu.le
  have hsquare : ‖u‖ ^ 2 < rho ^ 2 :=
    (sq_lt_sq₀ (norm_nonneg u) hrho0.le).2 hu
  calc
    ‖reciprocalQuad c u‖ ≤ 2 * ‖u‖ ^ 2 := hbound
    _ < 2 * rho ^ 2 := by nlinarith
    _ ≤ rho := by nlinarith

/-- Linearized contraction bound used to dominate all reciprocal iterates. -/
theorem norm_iterate_reciprocalQuad_le
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {u : ℂ} (hu : ‖u‖ ≤ rho) :
    ∀ n : ℕ,
      ‖(reciprocalQuad c)^[n] u‖ ≤ (2 * rho) ^ n * ‖u‖ := by
  intro n
  induction n with
  | zero => simp
  | succ n ih =>
      rw [Function.iterate_succ_apply']
      have hq0 : 0 ≤ 2 * rho := by positivity
      have hq1 : 2 * rho ≤ 1 := by linarith
      have hwithin : ‖(reciprocalQuad c)^[n] u‖ ≤ rho := by
        calc
          ‖(reciprocalQuad c)^[n] u‖ ≤
              (2 * rho) ^ n * ‖u‖ := ih
          _ ≤ 1 * rho := by
            gcongr
            exact pow_le_one₀ hq0 hq1
          _ = rho := one_mul rho
      calc
        ‖reciprocalQuad c ((reciprocalQuad c)^[n] u)‖ ≤
            2 * ‖(reciprocalQuad c)^[n] u‖ ^ 2 :=
          norm_reciprocalQuad_le c _ rho hc hwithin
        _ ≤ (2 * rho) * ‖(reciprocalQuad c)^[n] u‖ := by
          nlinarith [norm_nonneg ((reciprocalQuad c)^[n] u)]
        _ ≤ (2 * rho) * ((2 * rho) ^ n * ‖u‖) := by
          gcongr
        _ = (2 * rho) ^ (n + 1) * ‖u‖ := by
          rw [pow_succ']
          ring

/-- A concrete radius satisfying all reciprocal-disk hypotheses for every
parameter `c`. -/
def bottcherRadius (c : ℂ) : ℝ :=
  1 / (4 * (‖c‖ + 1))

theorem bottcherRadius_pos (c : ℂ) :
    0 < bottcherRadius c := by
  unfold bottcherRadius
  positivity

theorem bottcherRadius_le_half (c : ℂ) :
    bottcherRadius c ≤ 1 / 2 := by
  unfold bottcherRadius
  have hc : 0 ≤ ‖c‖ := norm_nonneg c
  have hden : 0 < 4 * (‖c‖ + 1) := by positivity
  apply (div_le_iff₀ hden).2
  nlinarith

theorem bottcherRadius_parameter_bound (c : ℂ) :
    ‖c‖ * bottcherRadius c ^ 2 ≤ 1 / 2 := by
  let x : ℝ := ‖c‖
  have hx : 0 ≤ x := norm_nonneg c
  have hd : 0 < 4 * (x + 1) := by positivity
  change x * (1 / (4 * (x + 1))) ^ 2 ≤ 1 / 2
  simp only [one_div, inv_pow, ← div_eq_mul_inv]
  apply (div_le_iff₀ (sq_pos_of_pos hd)).2
  nlinarith [sq_nonneg (x + 1)]

theorem analyticOnNhd_reciprocalQuad_ball
    (c : ℂ) (rho : ℝ)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2) :
    AnalyticOnNhd ℂ (reciprocalQuad c) (ball 0 rho) := by
  intro u hu
  have hu' : ‖u‖ < rho := mem_ball_zero_iff.mp hu
  have hcu : ‖c * u ^ 2‖ ≤ 1 / 2 := by
    calc
      ‖c * u ^ 2‖ = ‖c‖ * ‖u‖ ^ 2 := by
        rw [norm_mul, norm_pow]
      _ ≤ ‖c‖ * rho ^ 2 := by
        gcongr
      _ ≤ 1 / 2 := hc
  have hdenNorm : 1 / 2 ≤ ‖1 + c * u ^ 2‖ := by
    have hreverse := norm_one_add_lower (c * u ^ 2)
    linarith
  have hden : 1 + c * u ^ 2 ≠ 0 := by
    intro hzero
    rw [hzero, norm_zero] at hdenNorm
    norm_num at hdenNorm
  unfold reciprocalQuad
  exact (analyticAt_id.pow 2).div
    (analyticAt_const.add (analyticAt_const.mul (analyticAt_id.pow 2))) hden

theorem differentiableOn_reciprocalQuad_ball
    (c : ℂ) (rho : ℝ)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2) :
    DifferentiableOn ℂ (reciprocalQuad c) (ball 0 rho) :=
  (analyticOnNhd_reciprocalQuad_ball c rho hc).differentiableOn

/-! ## The logarithmic correction series -/

/-- The `n`th logarithmic correction. Its denominator is `2^(n+1)` because
the model map at the superattracting fixed point is squaring. -/
def bottcherLogTerm (c : ℂ) (n : ℕ) (u : ℂ) : ℂ :=
  -Complex.log (1 + c * ((reciprocalQuad c)^[n] u) ^ 2) /
    (2 : ℂ) ^ (n + 1)

/-- The logarithmic correction used in the reciprocal Böttcher coordinate. -/
def bottcherLogCorrection (c u : ℂ) : ℂ :=
  ∑' n : ℕ, bottcherLogTerm c n u

/-- The reciprocal Böttcher coordinate. -/
def reciprocalBottcherCoordinate (c u : ℂ) : ℂ :=
  u * Complex.exp (bottcherLogCorrection c u)

@[simp] theorem iterate_reciprocalQuad_zero (c : ℂ) (n : ℕ) :
    (reciprocalQuad c)^[n] 0 = 0 := by
  induction n with
  | zero => simp
  | succ n ih =>
      rw [Function.iterate_succ_apply', ih, reciprocalQuad_zero]

@[simp] theorem bottcherLogTerm_zero (c : ℂ) (n : ℕ) :
    bottcherLogTerm c n 0 = 0 := by
  simp [bottcherLogTerm]

@[simp] theorem bottcherLogCorrection_zero (c : ℂ) :
    bottcherLogCorrection c 0 = 0 := by
  simp [bottcherLogCorrection]

@[simp] theorem reciprocalBottcherCoordinate_zero (c : ℂ) :
    reciprocalBottcherCoordinate c 0 = 0 := by
  simp [reciprocalBottcherCoordinate]

/-- Every logarithm in the correction series stays in the principal branch. -/
theorem bottcherLogArgument_mem_slitPlane
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {u : ℂ} (hu : ‖u‖ ≤ rho) (n : ℕ) :
    1 + c * ((reciprocalQuad c)^[n] u) ^ 2 ∈ Complex.slitPlane := by
  apply Complex.mem_slitPlane_of_norm_lt_one
  calc
    ‖c * ((reciprocalQuad c)^[n] u) ^ 2‖ =
        ‖c‖ * ‖(reciprocalQuad c)^[n] u‖ ^ 2 := by
      rw [norm_mul, norm_pow]
    _ ≤ ‖c‖ * ((2 * rho) ^ n * ‖u‖) ^ 2 := by
      gcongr
      exact norm_iterate_reciprocalQuad_le
        c rho hrho0 hrho hc hu n
    _ ≤ ‖c‖ * rho ^ 2 := by
      have hq0 : 0 ≤ 2 * rho := by positivity
      have hq1 : 2 * rho ≤ 1 := by linarith
      calc
        ‖c‖ * ((2 * rho) ^ n * ‖u‖) ^ 2
            ≤ ‖c‖ * (1 * rho) ^ 2 := by
          gcongr
          exact pow_le_one₀ hq0 hq1
        _ = ‖c‖ * rho ^ 2 := by ring
    _ ≤ 1 / 2 := hc
    _ < 1 := by norm_num

/-- Uniform geometric majorant for the logarithmic correction. -/
theorem norm_bottcherLogTerm_le
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {u : ℂ} (hu : ‖u‖ ≤ rho) (n : ℕ) :
    ‖bottcherLogTerm c n u‖ ≤
      ((3 / 4 : ℝ) * ‖c‖ * rho ^ 2) *
        (((2 * rho) ^ 2 / 2) ^ n) := by
  have horbit := norm_iterate_reciprocalQuad_le
    c rho hrho0 hrho hc hu n
  have hx :
      ‖c * ((reciprocalQuad c)^[n] u) ^ 2‖ ≤ 1 / 2 := by
    calc
      ‖c * ((reciprocalQuad c)^[n] u) ^ 2‖ =
          ‖c‖ * ‖(reciprocalQuad c)^[n] u‖ ^ 2 := by
        rw [norm_mul, norm_pow]
      _ ≤ ‖c‖ * ((2 * rho) ^ n * ‖u‖) ^ 2 := by
        gcongr
      _ ≤ ‖c‖ * rho ^ 2 := by
        have hq0 : 0 ≤ 2 * rho := by positivity
        have hq1 : 2 * rho ≤ 1 := by linarith
        calc
          ‖c‖ * ((2 * rho) ^ n * ‖u‖) ^ 2
              ≤ ‖c‖ * (1 * rho) ^ 2 := by
            gcongr
            exact pow_le_one₀ hq0 hq1
          _ = ‖c‖ * rho ^ 2 := by ring
      _ ≤ 1 / 2 := hc
  have hlog :=
    Complex.norm_log_one_add_half_le_self hx
  have htwo : ‖(2 : ℂ)‖ = (2 : ℝ) := by norm_num
  rw [bottcherLogTerm, norm_div, norm_neg, norm_pow, htwo]
  calc
    ‖Complex.log
          (1 + c * ((reciprocalQuad c)^[n] u) ^ 2)‖ /
          (2 : ℝ) ^ (n + 1)
        ≤ ((3 / 2 : ℝ) *
            ‖c * ((reciprocalQuad c)^[n] u) ^ 2‖) /
            (2 : ℝ) ^ (n + 1) := by
      gcongr
    _ ≤ ((3 / 2 : ℝ) *
            (‖c‖ * ((2 * rho) ^ n * rho) ^ 2)) /
            (2 : ℝ) ^ (n + 1) := by
      gcongr
      rw [norm_mul, norm_pow]
      gcongr
      calc
        ‖(reciprocalQuad c)^[n] u‖ ≤
            (2 * rho) ^ n * ‖u‖ := horbit
        _ ≤ (2 * rho) ^ n * rho := by
          gcongr
    _ = ((3 / 4 : ℝ) * ‖c‖ * rho ^ 2) *
          (((2 * rho) ^ 2 / 2) ^ n) := by
      have hpow :
          ((2 * rho) ^ 2) ^ n = ((2 * rho) ^ n) ^ 2 := by
        rw [← pow_mul, ← pow_mul]
        congr 1
        omega
      rw [pow_succ, div_pow]
      rw [hpow]
      field_simp
      ring

/-- The geometric majorant has ratio at most `1/2`. -/
theorem summable_bottcherLogMajorant
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2) :
    Summable (fun n : ℕ =>
      ((3 / 4 : ℝ) * ‖c‖ * rho ^ 2) *
        (((2 * rho) ^ 2 / 2) ^ n)) := by
  have hratio0 : 0 ≤ (2 * rho) ^ 2 / 2 := by positivity
  have hratio1 : (2 * rho) ^ 2 / 2 < 1 := by
    nlinarith [sq_nonneg (2 * rho)]
  exact ((hasSum_geometric_of_lt_one hratio0 hratio1).mul_left
    ((3 / 4 : ℝ) * ‖c‖ * rho ^ 2)).summable

/-- Each logarithmic term is holomorphic on the controlled disk. -/
theorem differentiableOn_bottcherLogTerm
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 < rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    (n : ℕ) :
    DifferentiableOn ℂ (bottcherLogTerm c n) (ball 0 rho) := by
  have hrec :
      DifferentiableOn ℂ (reciprocalQuad c) (ball 0 rho) :=
    differentiableOn_reciprocalQuad_ball c rho hc
  have hmaps :
      MapsTo (reciprocalQuad c) (ball 0 rho) (ball 0 rho) :=
    mapsTo_reciprocalQuad_ball c rho hrho0 hrho hc
  have horbit :
      DifferentiableOn ℂ ((reciprocalQuad c)^[n]) (ball 0 rho) :=
    hrec.iterate hmaps n
  have harg :
      DifferentiableOn ℂ
        (fun u : ℂ =>
          1 + c * ((reciprocalQuad c)^[n] u) ^ 2)
        (ball 0 rho) :=
    (differentiableOn_const (1 : ℂ)).add
      ((differentiableOn_const c).mul (horbit.pow 2))
  have hlog :
      DifferentiableOn ℂ
        (fun u : ℂ =>
          Complex.log
            (1 + c * ((reciprocalQuad c)^[n] u) ^ 2))
        (ball 0 rho) := by
    apply harg.clog
    intro u hu
    exact bottcherLogArgument_mem_slitPlane
      c rho hrho0.le hrho hc (mem_ball_zero_iff.mp hu).le n
  unfold bottcherLogTerm
  exact hlog.neg.div_const ((2 : ℂ) ^ (n + 1))

/-- The logarithmic correction series converges at every point of the disk. -/
theorem summable_bottcherLogTerm
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {u : ℂ} (hu : u ∈ ball 0 rho) :
    Summable (fun n : ℕ => bottcherLogTerm c n u) := by
  apply (summable_bottcherLogMajorant c rho hrho0 hrho).of_norm_bounded
  intro n
  exact norm_bottcherLogTerm_le
    c rho hrho0 hrho hc (mem_ball_zero_iff.mp hu).le n

/-- The correction sum is holomorphic on the reciprocal disk. -/
theorem differentiableOn_bottcherLogCorrection
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 < rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2) :
    DifferentiableOn ℂ (bottcherLogCorrection c) (ball 0 rho) := by
  unfold bottcherLogCorrection
  apply Complex.differentiableOn_tsum_of_summable_norm
    (summable_bottcherLogMajorant c rho hrho0.le hrho)
    (fun n => differentiableOn_bottcherLogTerm
      c rho hrho0 hrho hc n)
    isOpen_ball
  intro n u hu
  exact norm_bottcherLogTerm_le
    c rho hrho0.le hrho hc (mem_ball_zero_iff.mp hu).le n

/-- Shifting the reciprocal orbit advances the correction sequence. -/
theorem bottcherLogTerm_reciprocalQuad
    (c u : ℂ) (n : ℕ) :
    bottcherLogTerm c n (reciprocalQuad c u) =
      2 * bottcherLogTerm c (n + 1) u := by
  unfold bottcherLogTerm
  rw [← Function.iterate_succ_apply]
  field_simp
  ring

/-- Exact additive functional equation for the logarithmic correction. -/
theorem bottcherLogCorrection_reciprocalQuad
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {u : ℂ} (hu : u ∈ ball 0 rho) :
    bottcherLogCorrection c (reciprocalQuad c u) =
      2 * bottcherLogCorrection c u +
        Complex.log (1 + c * u ^ 2) := by
  let e : ℕ → ℂ := fun n => bottcherLogTerm c n u
  have hsum : Summable e :=
    summable_bottcherLogTerm c rho hrho0 hrho hc hu
  have hsplit : e 0 + ∑' n : ℕ, e (n + 1) = ∑' n : ℕ, e n := by
    simpa using hsum.sum_add_tsum_nat_add 1
  have hshift :
      (∑' n : ℕ,
        bottcherLogTerm c n (reciprocalQuad c u)) =
          2 * ∑' n : ℕ, e (n + 1) := by
    calc
      (∑' n : ℕ,
          bottcherLogTerm c n (reciprocalQuad c u)) =
          ∑' n : ℕ, 2 * e (n + 1) := by
        apply tsum_congr
        intro n
        exact bottcherLogTerm_reciprocalQuad c u n
      _ = 2 * ∑' n : ℕ, e (n + 1) := tsum_mul_left
  have he0 :
      e 0 = -Complex.log (1 + c * u ^ 2) / 2 := by
    simp [e, bottcherLogTerm]
  unfold bottcherLogCorrection
  rw [hshift]
  change 2 * (∑' n : ℕ, e (n + 1)) =
    2 * (∑' n : ℕ, e n) + Complex.log (1 + c * u ^ 2)
  rw [← hsplit, he0]
  ring

/-- The reciprocal coordinate is holomorphic on the controlled disk. -/
theorem differentiableOn_reciprocalBottcherCoordinate
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 < rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2) :
    DifferentiableOn ℂ (reciprocalBottcherCoordinate c) (ball 0 rho) := by
  unfold reciprocalBottcherCoordinate
  exact differentiableOn_id.mul
    (differentiableOn_bottcherLogCorrection
      c rho hrho0 hrho hc).cexp

/-- Exact Böttcher equation in reciprocal coordinates. -/
theorem reciprocalBottcherCoordinate_sq
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {u : ℂ} (hu : u ∈ ball 0 rho) :
    reciprocalBottcherCoordinate c (reciprocalQuad c u) =
      reciprocalBottcherCoordinate c u ^ 2 := by
  have hcorr :=
    bottcherLogCorrection_reciprocalQuad
      c rho hrho0 hrho hc hu
  have hslit :
      1 + c * u ^ 2 ∈ Complex.slitPlane := by
    exact bottcherLogArgument_mem_slitPlane
      c rho hrho0 hrho hc (mem_ball_zero_iff.mp hu).le 0
  have hden : 1 + c * u ^ 2 ≠ 0 :=
    Complex.slitPlane_ne_zero hslit
  have hexp :
      Complex.exp (2 * bottcherLogCorrection c u) =
        Complex.exp (bottcherLogCorrection c u) ^ 2 := by
    simpa using
      (Complex.exp_nat_mul (bottcherLogCorrection c u) 2)
  unfold reciprocalBottcherCoordinate
  rw [hcorr, Complex.exp_add, Complex.exp_log hden, hexp]
  unfold reciprocalQuad
  have hden' : 1 + u ^ 2 * c ≠ 0 := by
    simpa [mul_comm] using hden
  field_simp [hden, hden']

/-- The reciprocal Böttcher coordinate is normalized by `β'(0)=1`. -/
theorem hasDerivAt_reciprocalBottcherCoordinate_zero
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 < rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2) :
    HasDerivAt (reciprocalBottcherCoordinate c) 1 0 := by
  have hcorrection :
      DifferentiableAt ℂ (bottcherLogCorrection c) 0 := by
    apply (differentiableOn_bottcherLogCorrection
      c rho hrho0 hrho hc).differentiableAt
    exact isOpen_ball.mem_nhds (mem_ball_self hrho0)
  have hexp :=
    hcorrection.hasDerivAt.cexp
  have hmul := (hasDerivAt_id (𝕜 := ℂ) 0).mul hexp
  have hmul' :
      HasDerivAt
        (id * fun u : ℂ =>
          Complex.exp (bottcherLogCorrection c u)) 1 0 :=
    hmul.congr_deriv (by simp)
  apply hmul'.congr_of_eventuallyEq
  filter_upwards [] with u
  rfl

/-- A normalized local Böttcher chart for the reciprocal germ, together with
its analytic local inverse. -/
structure ReciprocalBottcherGerm (c : ℂ) where
  beta : ℂ → ℂ
  gamma : ℂ → ℂ
  beta_analytic : AnalyticAt ℂ beta 0
  gamma_analytic : AnalyticAt ℂ gamma 0
  beta_zero : beta 0 = 0
  deriv_beta_zero : deriv beta 0 = 1
  boettcher : ∀ᶠ u in 𝓝 0,
    beta (reciprocalQuad c u) = beta u ^ 2
  left_inv : ∀ᶠ u in 𝓝 0, gamma (beta u) = u
  right_inv : ∀ᶠ y in 𝓝 0, beta (gamma y) = y

/-- Quantitative reciprocal Böttcher theorem on any disk satisfying the
explicit denominator bounds. -/
noncomputable def reciprocalBottcherGermOfRadius
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 < rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2) :
    ReciprocalBottcherGerm c := by
  have hbeta : AnalyticAt ℂ (reciprocalBottcherCoordinate c) 0 := by
    exact (differentiableOn_reciprocalBottcherCoordinate
      c rho hrho0 hrho hc).analyticOnNhd isOpen_ball
        0 (mem_ball_self hrho0)
  have hderiv :
      deriv (reciprocalBottcherCoordinate c) 0 = 1 :=
    (hasDerivAt_reciprocalBottcherCoordinate_zero
      c rho hrho0 hrho hc).deriv
  have hderiv0 :
      deriv (reciprocalBottcherCoordinate c) 0 ≠ 0 := by
    rw [hderiv]
    norm_num
  let gamma : ℂ → ℂ :=
    hbeta.hasStrictDerivAt.localInverse
      (reciprocalBottcherCoordinate c)
      (deriv (reciprocalBottcherCoordinate c) 0) 0 hderiv0
  refine
    { beta := reciprocalBottcherCoordinate c
      gamma := gamma
      beta_analytic := hbeta
      gamma_analytic := ?_
      beta_zero := reciprocalBottcherCoordinate_zero c
      deriv_beta_zero := hderiv
      boettcher := ?_
      left_inv := ?_
      right_inv := ?_ }
  · simpa only [gamma, reciprocalBottcherCoordinate_zero] using
      hbeta.analyticAt_localInverse hderiv0
  · filter_upwards [Metric.ball_mem_nhds 0 hrho0] with u hu
    exact reciprocalBottcherCoordinate_sq
      c rho hrho0.le hrho hc hu
  · exact HasStrictDerivAt.eventually_left_inverse
      (f := reciprocalBottcherCoordinate c)
      (f' := deriv (reciprocalBottcherCoordinate c) 0)
      (a := 0) hbeta.hasStrictDerivAt hderiv0
  · simpa [reciprocalBottcherCoordinate_zero] using
      (HasStrictDerivAt.eventually_right_inverse
        (f := reciprocalBottcherCoordinate c)
        (f' := deriv (reciprocalBottcherCoordinate c) 0)
        (a := 0) hbeta.hasStrictDerivAt hderiv0)

/-- Existence of a normalized reciprocal Böttcher germ for every `c`. -/
noncomputable def reciprocalBottcherGerm (c : ℂ) :
    ReciprocalBottcherGerm c :=
  reciprocalBottcherGermOfRadius c (bottcherRadius c)
    (bottcherRadius_pos c) (bottcherRadius_le_half c)
    (bottcherRadius_parameter_bound c)

theorem exists_reciprocalBottcherGerm (c : ℂ) :
    Nonempty (ReciprocalBottcherGerm c) :=
  ⟨reciprocalBottcherGerm c⟩

/-! ## Transport back to an exterior neighborhood of infinity -/

/-- The Böttcher coordinate in the original variable `z = 1/u`. -/
def bottcherCoordinateAtInfinity (c z : ℂ) : ℂ :=
  (reciprocalBottcherCoordinate c z⁻¹)⁻¹

/-- The original quadratic map is conjugated to squaring wherever the
reciprocal point belongs to the controlled disk. -/
theorem bottcherCoordinateAtInfinity_sq
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 ≤ rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {z : ℂ} (hz : z ≠ 0) (hu : z⁻¹ ∈ ball (0 : ℂ) rho) :
    bottcherCoordinateAtInfinity c (quad c z) =
      bottcherCoordinateAtInfinity c z ^ 2 := by
  unfold bottcherCoordinateAtInfinity
  rw [← reciprocalQuad_inv c z hz]
  rw [reciprocalBottcherCoordinate_sq
    c rho hrho0 hrho hc hu]
  rw [inv_pow]

/-- Holomorphy of the transported coordinate at every controlled exterior
point. -/
theorem analyticAt_bottcherCoordinateAtInfinity
    (c : ℂ) (rho : ℝ)
    (hrho0 : 0 < rho) (hrho : rho ≤ 1 / 2)
    (hc : ‖c‖ * rho ^ 2 ≤ 1 / 2)
    {z : ℂ} (hz : z ≠ 0) (hu : z⁻¹ ∈ ball (0 : ℂ) rho) :
    AnalyticAt ℂ (bottcherCoordinateAtInfinity c) z := by
  have hbeta :
      AnalyticAt ℂ (reciprocalBottcherCoordinate c) z⁻¹ :=
    (differentiableOn_reciprocalBottcherCoordinate
      c rho hrho0 hrho hc).analyticOnNhd
        isOpen_ball z⁻¹ hu
  have hinv : AnalyticAt ℂ (Inv.inv : ℂ → ℂ) z :=
    analyticAt_inv hz
  have hcomp :
      AnalyticAt ℂ
        (fun w : ℂ =>
          reciprocalBottcherCoordinate c w⁻¹) z := by
    change AnalyticAt ℂ
      (reciprocalBottcherCoordinate c ∘ (Inv.inv : ℂ → ℂ)) z
    exact hbeta.comp hinv
  have hu0 : z⁻¹ ≠ 0 := inv_ne_zero hz
  have hbeta0 :
      reciprocalBottcherCoordinate c z⁻¹ ≠ 0 := by
    unfold reciprocalBottcherCoordinate
    exact mul_ne_zero hu0 (Complex.exp_ne_zero _)
  unfold bottcherCoordinateAtInfinity
  exact hcomp.inv hbeta0

/-- Exact normalization identity before passing to the limit at infinity. -/
theorem bottcherCoordinateAtInfinity_div
    (c z : ℂ) (hz : z ≠ 0) :
    bottcherCoordinateAtInfinity c z / z =
      Complex.exp (-bottcherLogCorrection c z⁻¹) := by
  unfold bottcherCoordinateAtInfinity reciprocalBottcherCoordinate
  rw [Complex.exp_neg]
  field_simp [hz, Complex.exp_ne_zero]

/-- The constructed coordinate has the required asymptotic normalization. -/
theorem tendsto_bottcherCoordinateAtInfinity_div :
    ∀ c : ℂ,
      Tendsto (fun z : ℂ =>
        bottcherCoordinateAtInfinity c z / z)
        (Bornology.cobounded ℂ) (𝓝 1) := by
  intro c
  let rho := bottcherRadius c
  have hcorrection :
      AnalyticAt ℂ (bottcherLogCorrection c) 0 := by
    exact (differentiableOn_bottcherLogCorrection
      c rho (bottcherRadius_pos c)
        (bottcherRadius_le_half c)
        (bottcherRadius_parameter_bound c)).analyticOnNhd
          isOpen_ball 0 (mem_ball_self (bottcherRadius_pos c))
  have hnormalized :
      Tendsto
        (fun u : ℂ =>
          Complex.exp (-bottcherLogCorrection c u))
        (𝓝 0) (𝓝 1) := by
    change Tendsto
      (Complex.exp ∘ (-bottcherLogCorrection c))
      (𝓝 0) (𝓝 1)
    simpa only [ContinuousAt, Function.comp_apply, Pi.neg_apply,
      bottcherLogCorrection_zero, neg_zero, Complex.exp_zero] using
      hcorrection.neg.cexp.continuousAt
  have hcomposed :
      Tendsto
        (fun z : ℂ =>
          Complex.exp (-bottcherLogCorrection c z⁻¹))
        (Bornology.cobounded ℂ) (𝓝 1) :=
    hnormalized.comp Filter.tendsto_inv₀_cobounded
  have hneInv :
      ∀ᶠ z : ℂ in Bornology.cobounded ℂ, z⁻¹ ≠ 0 := by
    have hmem :
        ∀ᶠ z : ℂ in Bornology.cobounded ℂ,
          z⁻¹ ∈ ({0}ᶜ : Set ℂ) :=
      (Filter.tendsto_inv₀_cobounded' (α := ℂ)).eventually
        self_mem_nhdsWithin
    simpa using hmem
  apply hcomposed.congr'
  filter_upwards [hneInv] with z hz
  exact (bottcherCoordinateAtInfinity_div c z
    (by simpa using hz)).symm

/-- A neighborhood of infinity written as an exterior norm domain. -/
def exteriorDomain (R : ℝ) : Set ℂ :=
  {z : ℂ | R < ‖z‖}

theorem isOpen_exteriorDomain (R : ℝ) :
    IsOpen (exteriorDomain R) := by
  exact isOpen_lt continuous_const continuous_norm

theorem inv_mem_ball_of_mem_exterior
    {delta : ℝ} (hdelta : 0 < delta)
    {z : ℂ} (hz : z ∈ exteriorDomain (1 / delta)) :
    z⁻¹ ∈ ball (0 : ℂ) delta := by
  rw [mem_ball_zero_iff, norm_inv]
  have hznorm : 0 < ‖z‖ := by
    have hR : 0 < 1 / delta := by positivity
    exact hR.trans hz
  simpa [one_div] using (one_div_lt hznorm hdelta).2 hz

/-- Local invertibility of the reciprocal chart yields injectivity on some
explicit (but non-canonical) disk around zero. -/
theorem exists_injective_reciprocalBottcherCoordinate (c : ℂ) :
    ∃ epsilon > 0,
      Set.InjOn (reciprocalBottcherCoordinate c)
        (ball (0 : ℂ) epsilon) := by
  let g : ReciprocalBottcherGerm c :=
    reciprocalBottcherGerm c
  rcases Metric.mem_nhds_iff.mp g.left_inv with
    ⟨epsilon, hepsilon, hleft⟩
  refine ⟨epsilon, hepsilon, ?_⟩
  intro u hu v hv huv
  have gbeta (x : ℂ) :
      g.beta x = reciprocalBottcherCoordinate c x := by
    rfl
  have huv' : g.beta u = g.beta v := by
    simpa only [gbeta] using huv
  calc
    u = g.gamma (g.beta u) := (hleft hu).symm
    _ = g.gamma (g.beta v) := by rw [huv']
    _ = v := hleft hv

/-- The complete local theorem at infinity in the form used by T4.1. -/
structure BottcherInfinityChart (c : ℂ) where
  R : ℝ
  R_pos : 0 < R
  psi : ℂ → ℂ
  psi_analytic : AnalyticOnNhd ℂ psi (exteriorDomain R)
  psi_injective : Set.InjOn psi (exteriorDomain R)
  boettcher :
    ∀ ⦃z : ℂ⦄, z ∈ exteriorDomain R →
      quad c z ∈ exteriorDomain R →
      psi (quad c z) = psi z ^ 2
  normalized :
    Tendsto (fun z : ℂ => psi z / z)
      (Bornology.cobounded ℂ) (𝓝 1)

/-- Existence part of T4.1, including a common exterior domain for
holomorphy, univalence, the Böttcher equation, and normalization. -/
noncomputable def bottcherInfinityChart (c : ℂ) :
    BottcherInfinityChart c := by
  let rho : ℝ := bottcherRadius c
  let hexists := exists_injective_reciprocalBottcherCoordinate c
  let epsilon : ℝ := Classical.choose hexists
  have hepsilon : 0 < epsilon :=
    (Classical.choose_spec hexists).1
  have hinjective :
      Set.InjOn (reciprocalBottcherCoordinate c)
        (ball (0 : ℂ) epsilon) :=
    (Classical.choose_spec hexists).2
  let delta : ℝ := min epsilon rho
  have hrho : 0 < rho := bottcherRadius_pos c
  have hdelta : 0 < delta := by
    exact lt_min hepsilon hrho
  have hdeltaEpsilon : delta ≤ epsilon := min_le_left _ _
  have hdeltaRho : delta ≤ rho := min_le_right _ _
  let R : ℝ := 1 / delta
  have hR : 0 < R := by
    dsimp [R]
    positivity
  refine
    { R := R
      R_pos := hR
      psi := bottcherCoordinateAtInfinity c
      psi_analytic := ?_
      psi_injective := ?_
      boettcher := ?_
      normalized := tendsto_bottcherCoordinateAtInfinity_div c }
  · intro z hz
    have huDelta :
        z⁻¹ ∈ ball (0 : ℂ) delta :=
      inv_mem_ball_of_mem_exterior hdelta hz
    have huRho :
        z⁻¹ ∈ ball (0 : ℂ) rho := by
      rw [mem_ball_zero_iff] at huDelta ⊢
      exact huDelta.trans_le hdeltaRho
    have hz0 : z ≠ 0 := by
      intro hz0
      subst z
      have := hz
      simp [exteriorDomain] at this
      linarith
    exact analyticAt_bottcherCoordinateAtInfinity
      c rho hrho (bottcherRadius_le_half c)
        (bottcherRadius_parameter_bound c) hz0 huRho
  · intro z hz w hw hzw
    have huzDelta :
        z⁻¹ ∈ ball (0 : ℂ) delta :=
      inv_mem_ball_of_mem_exterior hdelta hz
    have huwDelta :
        w⁻¹ ∈ ball (0 : ℂ) delta :=
      inv_mem_ball_of_mem_exterior hdelta hw
    have huz :
        z⁻¹ ∈ ball (0 : ℂ) epsilon := by
      rw [mem_ball_zero_iff] at huzDelta ⊢
      exact huzDelta.trans_le hdeltaEpsilon
    have huw :
        w⁻¹ ∈ ball (0 : ℂ) epsilon := by
      rw [mem_ball_zero_iff] at huwDelta ⊢
      exact huwDelta.trans_le hdeltaEpsilon
    have hbeta :
        reciprocalBottcherCoordinate c z⁻¹ =
          reciprocalBottcherCoordinate c w⁻¹ := by
      apply inv_injective
      simpa [bottcherCoordinateAtInfinity] using hzw
    have hinv : z⁻¹ = w⁻¹ :=
      hinjective huz huw hbeta
    exact inv_injective hinv
  · intro z hz _hqz
    have huDelta :
        z⁻¹ ∈ ball (0 : ℂ) delta :=
      inv_mem_ball_of_mem_exterior hdelta hz
    have huRho :
        z⁻¹ ∈ ball (0 : ℂ) rho := by
      rw [mem_ball_zero_iff] at huDelta ⊢
      exact huDelta.trans_le hdeltaRho
    have hz0 : z ≠ 0 := by
      intro hz0
      subst z
      have := hz
      simp [exteriorDomain] at this
      linarith
    exact bottcherCoordinateAtInfinity_sq
      c rho hrho.le (bottcherRadius_le_half c)
        (bottcherRadius_parameter_bound c) hz0 huRho

theorem exists_bottcherInfinityChart (c : ℂ) :
    Nonempty (BottcherInfinityChart c) :=
  ⟨bottcherInfinityChart c⟩

end

end Mandelbrot
