/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Algebra.Ring.Parity
import Mathlib.MeasureTheory.Measure.Lebesgue.VolumeOfBalls
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum

/-!
# Elementary certified facts about the Mandelbrot set

This file deliberately uses only the critical orbit and elementary norm
estimates.  In particular, it does not assume normal families, Montel's
theorem, or the theorem that an attracting cycle attracts a critical point.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set MeasureTheory

/-- Critical orbit of `z ↦ z² + c`, starting at zero. -/
def mandelbrotOrbit (c : ℂ) : ℕ → ℂ
  | 0 => 0
  | n + 1 => mandelbrotOrbit c n ^ 2 + c

@[simp] theorem mandelbrotOrbit_zero (c : ℂ) : mandelbrotOrbit c 0 = 0 := rfl

@[simp] theorem mandelbrotOrbit_succ (c : ℂ) (n : ℕ) :
    mandelbrotOrbit c (n + 1) = mandelbrotOrbit c n ^ 2 + c := rfl

set_option linter.dupNamespace false in
/-- Parameters whose critical orbit is bounded. -/
def Mandelbrot : Set ℂ :=
  {c | ∃ R : ℝ, ∀ n : ℕ, ‖mandelbrotOrbit c n‖ ≤ R}

theorem mem_Mandelbrot_iff (c : ℂ) :
    c ∈ Mandelbrot ↔ ∃ R : ℝ, ∀ n : ℕ, ‖mandelbrotOrbit c n‖ ≤ R :=
  Iff.rfl

/-! ## M0: the elementary invariant disk -/

/-- If `‖c‖ ≤ 1/4`, the closed disk of radius `1/2` is forward invariant. -/
theorem mandelbrotOrbit_norm_le_half
    (c : ℂ) (hc : ‖c‖ ≤ (1 / 4 : ℝ)) :
    ∀ n : ℕ, ‖mandelbrotOrbit c n‖ ≤ (1 / 2 : ℝ) := by
  intro n
  induction n with
  | zero => norm_num
  | succ n ih =>
      rw [mandelbrotOrbit_succ]
      calc
        ‖mandelbrotOrbit c n ^ 2 + c‖ ≤
            ‖mandelbrotOrbit c n ^ 2‖ + ‖c‖ := norm_add_le _ _
        _ = ‖mandelbrotOrbit c n‖ ^ 2 + ‖c‖ := by rw [norm_pow]
        _ ≤ (1 / 2 : ℝ) ^ 2 + (1 / 4 : ℝ) := by
          gcongr
        _ = (1 / 2 : ℝ) := by norm_num

/-- M0: the parameter disk `‖c‖ ≤ 1/4` lies in the Mandelbrot set. -/
theorem closedBall_quarter_subset_Mandelbrot :
    closedBall (0 : ℂ) (1 / 4 : ℝ) ⊆ Mandelbrot := by
  intro c hc
  rw [mem_closedBall, dist_zero_right] at hc
  exact (mem_Mandelbrot_iff c).2 ⟨1 / 2, mandelbrotOrbit_norm_le_half c hc⟩

/-! ## M1: escape radius -/

/-- One reverse-triangle estimate for a quadratic step. -/
theorem norm_sq_add_lower (z c : ℂ) :
    ‖z‖ ^ 2 - ‖c‖ ≤ ‖z ^ 2 + c‖ := by
  have h := norm_sub_norm_le (z ^ 2) (-c)
  simpa [norm_pow] using h

/-- Once an orbit value is beyond both `2` and `‖c‖`, its norm has a
uniform positive linear lower growth.  This quantitative form makes
unboundedness elementary and avoids any appeal to limits. -/
theorem escape_linear_lower_bound
    (c : ℂ) (N : ℕ)
    (h_two : 2 < ‖mandelbrotOrbit c N‖)
    (h_c : ‖c‖ ≤ ‖mandelbrotOrbit c N‖) :
    ∀ k : ℕ,
      ‖mandelbrotOrbit c N‖ +
          (k : ℝ) * (‖mandelbrotOrbit c N‖ * (‖mandelbrotOrbit c N‖ - 2)) ≤
        ‖mandelbrotOrbit c (N + k)‖ := by
  let r : ℝ := ‖mandelbrotOrbit c N‖
  let delta : ℝ := r * (r - 2)
  have hr_pos : 0 < r := lt_trans (by norm_num) h_two
  have hdelta_pos : 0 < delta := mul_pos hr_pos (sub_pos.mpr h_two)
  intro k
  induction k with
  | zero => simp
  | succ k ih =>
      have hkr_nonneg : 0 ≤ (k : ℝ) * delta :=
        mul_nonneg (Nat.cast_nonneg k) hdelta_pos.le
      have h_current : r ≤ ‖mandelbrotOrbit c (N + k)‖ := by
        exact le_trans (by linarith) ih
      have h_factor :
          0 ≤ (‖mandelbrotOrbit c (N + k)‖ - r) *
            (‖mandelbrotOrbit c (N + k)‖ + r - 1) := by
        exact mul_nonneg (sub_nonneg.mpr h_current) (by nlinarith [norm_nonneg c])
      have h_step :
          ‖mandelbrotOrbit c (N + k)‖ + delta ≤
            ‖mandelbrotOrbit c (N + k + 1)‖ := by
        rw [mandelbrotOrbit_succ]
        apply le_trans _ (norm_sq_add_lower (mandelbrotOrbit c (N + k)) c)
        dsimp only [delta, r]
        nlinarith
      rw [Nat.cast_succ]
      rw [show N + (k + 1) = N + k + 1 by omega]
      dsimp only [r, delta] at h_step
      nlinarith [ih, h_step]

/-- Escape criterion in the form needed to refute boundedness. -/
theorem not_mem_Mandelbrot_of_escape
    (c : ℂ) (N : ℕ)
    (h_two : 2 < ‖mandelbrotOrbit c N‖)
    (h_c : ‖c‖ ≤ ‖mandelbrotOrbit c N‖) :
    c ∉ Mandelbrot := by
  intro hcM
  obtain ⟨R, hR⟩ := (mem_Mandelbrot_iff c).1 hcM
  let r : ℝ := ‖mandelbrotOrbit c N‖
  let delta : ℝ := r * (r - 2)
  have hr_pos : 0 < r := lt_trans (by norm_num) h_two
  have hdelta_pos : 0 < delta := mul_pos hr_pos (sub_pos.mpr h_two)
  obtain ⟨k : ℕ, hk⟩ := exists_nat_gt (R / delta)
  have hRk : R < (k : ℝ) * delta := (div_lt_iff₀ hdelta_pos).1 hk
  have hlower := escape_linear_lower_bound c N h_two h_c k
  have hupper := hR (N + k)
  dsimp only [r, delta] at hRk hlower
  linarith

/-- M1 in the customary `max (2, ‖c‖)` formulation. -/
theorem not_mem_Mandelbrot_of_max_lt
    (c : ℂ) (N : ℕ)
    (h : max 2 ‖c‖ < ‖mandelbrotOrbit c N‖) :
    c ∉ Mandelbrot := by
  apply not_mem_Mandelbrot_of_escape c N
  · exact (le_max_left 2 ‖c‖).trans_lt h
  · exact (le_max_right 2 ‖c‖).trans h.le

/-- Every Mandelbrot parameter has norm at most two. -/
theorem Mandelbrot_subset_closedBall_two :
    Mandelbrot ⊆ closedBall (0 : ℂ) 2 := by
  intro c hcM
  rw [mem_closedBall, dist_zero_right]
  by_contra hnot
  have h_two : 2 < ‖mandelbrotOrbit c 1‖ := by
    simpa using lt_of_not_ge hnot
  have h_c : ‖c‖ ≤ ‖mandelbrotOrbit c 1‖ := by simp
  exact not_mem_Mandelbrot_of_escape c 1 h_two h_c hcM

/-- The standard radius-two membership criterion. -/
theorem mem_Mandelbrot_iff_orbit_norm_le_two (c : ℂ) :
    c ∈ Mandelbrot ↔ ∀ n : ℕ, ‖mandelbrotOrbit c n‖ ≤ 2 := by
  constructor
  · intro hcM n
    have hc_two : ‖c‖ ≤ 2 := by
      simpa [mem_closedBall, dist_zero_right] using
        Mandelbrot_subset_closedBall_two hcM
    by_contra hnot
    have h_two : 2 < ‖mandelbrotOrbit c n‖ := lt_of_not_ge hnot
    have h_c : ‖c‖ ≤ ‖mandelbrotOrbit c n‖ := hc_two.trans h_two.le
    exact not_mem_Mandelbrot_of_escape c n h_two h_c hcM
  · intro h
    exact (mem_Mandelbrot_iff c).2 ⟨2, h⟩

/-! ## Adequacy checks -/

theorem zero_mem_Mandelbrot : (0 : ℂ) ∈ Mandelbrot := by
  apply closedBall_quarter_subset_Mandelbrot
  norm_num [mem_closedBall]

theorem one_not_mem_Mandelbrot : (1 : ℂ) ∉ Mandelbrot := by
  apply not_mem_Mandelbrot_of_escape 1 3
  · norm_num [mandelbrotOrbit]
  · norm_num [mandelbrotOrbit]

theorem mandelbrotOrbit_neg_one_pair (n : ℕ) :
    mandelbrotOrbit (-1) (2 * n) = 0 ∧
      mandelbrotOrbit (-1) (2 * n + 1) = -1 := by
  induction n with
  | zero => norm_num [mandelbrotOrbit]
  | succ n ih =>
      constructor
      · rw [Nat.mul_succ]
        rw [show 2 * n + 2 = (2 * n + 1) + 1 by omega,
          mandelbrotOrbit_succ, ih.2]
        norm_num
      · rw [Nat.mul_succ]
        rw [show 2 * n + 2 + 1 = (2 * n + 2) + 1 by omega,
          mandelbrotOrbit_succ]
        have heven : mandelbrotOrbit (-1) (2 * n + 2) = 0 := by
          rw [show 2 * n + 2 = (2 * n + 1) + 1 by omega,
            mandelbrotOrbit_succ, ih.2]
          norm_num
        rw [heven]
        norm_num

theorem neg_one_mem_Mandelbrot : (-1 : ℂ) ∈ Mandelbrot := by
  rw [mem_Mandelbrot_iff_orbit_norm_le_two]
  intro n
  obtain ⟨k, hk | hk⟩ := Nat.even_or_odd' n
  · rw [hk, (mandelbrotOrbit_neg_one_pair k).1]
    norm_num
  · rw [hk, (mandelbrotOrbit_neg_one_pair k).2]
    norm_num

theorem mandelbrotOrbit_neg_two_tail (n : ℕ) :
    mandelbrotOrbit (-2) (n + 2) = 2 := by
  induction n with
  | zero => norm_num [mandelbrotOrbit]
  | succ n ih =>
      rw [Nat.succ_add, mandelbrotOrbit_succ, ih]
      norm_num

theorem neg_two_mem_Mandelbrot : (-2 : ℂ) ∈ Mandelbrot := by
  rw [mem_Mandelbrot_iff_orbit_norm_le_two]
  intro n
  rcases n with _ | n
  · norm_num [mandelbrotOrbit]
  · rcases n with _ | n
    · norm_num [mandelbrotOrbit]
    · rw [show n + 1 + 1 = n + 2 by omega, mandelbrotOrbit_neg_two_tail]
      norm_num

/-- The critical orbit depends continuously on the parameter at each fixed
iteration. -/
theorem continuous_mandelbrotOrbit (n : ℕ) :
    Continuous (fun c : ℂ => mandelbrotOrbit c n) := by
  induction n with
  | zero => simpa [mandelbrotOrbit] using (continuous_const : Continuous (fun _ : ℂ => (0 : ℂ)))
  | succ n ih =>
      change Continuous ((fun c : ℂ => mandelbrotOrbit c n ^ 2) + fun c : ℂ => c)
      exact (ih.pow 2).add continuous_id

theorem isClosed_Mandelbrot : IsClosed Mandelbrot := by
  have hrepr :
      Mandelbrot = ⋂ n : ℕ, {c : ℂ | ‖mandelbrotOrbit c n‖ ≤ 2} := by
    ext c
    simp only [mem_iInter, mem_setOf_eq]
    exact mem_Mandelbrot_iff_orbit_norm_le_two c
  rw [hrepr]
  exact isClosed_iInter fun n =>
    isClosed_le (continuous_mandelbrotOrbit n).norm continuous_const

/-! ## The certified M0 area -/

theorem volume_Mandelbrot_ge_quarter_disk :
    volume (closedBall (0 : ℂ) (1 / 4 : ℝ)) ≤ volume Mandelbrot :=
  measure_mono closedBall_quarter_subset_Mandelbrot

/-- M0 as the exact lower bound `π/16`. -/
theorem volume_Mandelbrot_ge_pi_div_sixteen :
    ENNReal.ofReal (Real.pi / 16) ≤ volume Mandelbrot := by
  calc
    ENNReal.ofReal (Real.pi / 16) =
        volume (closedBall (0 : ℂ) (1 / 4 : ℝ)) := by
      rw [Complex.volume_closedBall]
      rw [ENNReal.ofReal_div_of_pos (by norm_num : (0 : ℝ) < 16)]
      rw [show ENNReal.ofReal Real.pi = (NNReal.pi : ENNReal) by
        simp [← NNReal.coe_real_pi]]
      rw [show ENNReal.ofReal (1 / 4 : ℝ) = (1 / 4 : ENNReal) by
        rw [ENNReal.ofReal_div_of_pos (by norm_num : (0 : ℝ) < 4)]
        norm_num]
      rw [show ENNReal.ofReal (16 : ℝ) = (16 : ENNReal) by norm_num]
      simp only [div_eq_mul_inv, one_mul]
      change (NNReal.pi : ENNReal) * (16 : ENNReal)⁻¹ =
        (4 : ENNReal)⁻¹ ^ 2 * (NNReal.pi : ENNReal)
      rw [← ENNReal.inv_pow (a := (4 : ENNReal)) (n := 2)]
      norm_num only [OfNat.ofNat, pow_two]
      exact mul_comm _ _
    _ ≤ volume Mandelbrot := volume_Mandelbrot_ge_quarter_disk

-- Keep the public definition opaque after the adequacy API has been proved.
attribute [irreducible] Mandelbrot

end

end Mandelbrot
