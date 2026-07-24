/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Basic
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Tactic.Linarith

/-!
# Escape certificates for the quadratic family

Crossing `max 2 (‖c‖ + 1)` forces the norm to grow by more than one at every
subsequent step.  This gives both divergence and a finite certificate of
non-membership in the Mandelbrot set for the critical orbit.
-/

namespace Mandelbrot

noncomputable section

open Filter

/-- Membership in the Mandelbrot set, defined by boundedness of the critical
orbit. -/
def InMandelbrot (c : ℂ) : Prop :=
  ∃ R : ℝ, 0 ≤ R ∧ ∀ n : ℕ, ‖orbit c 0 n‖ ≤ R

/-- A parameter-dependent escape radius valid for every starting point. -/
def escapeRadius (c : ℂ) : ℝ :=
  max 2 (‖c‖ + 1)

theorem norm_add_one_lt_norm_quad
    (c z : ℂ) (h2 : 2 < ‖z‖) (hc : ‖c‖ + 1 < ‖z‖) :
    ‖z‖ + 1 < ‖quad c z‖ := by
  have hreverse : ‖z‖ ^ 2 ≤ ‖quad c z‖ + ‖c‖ := by
    calc
      ‖z‖ ^ 2 = ‖z ^ 2‖ := by rw [norm_pow]
      _ = ‖quad c z - c‖ := by simp [quad]
      _ ≤ ‖quad c z‖ + ‖c‖ := norm_sub_le _ _
  have hsquare : 2 * ‖z‖ < ‖z‖ ^ 2 := by
    nlinarith
  linarith

/-- Once the escape radius is crossed, the tail dominates a line of slope
one. -/
theorem escape_tail_lower_bound
    (c z₀ : ℂ) (N : ℕ)
    (h : escapeRadius c < ‖orbit c z₀ N‖) :
    ∀ n : ℕ,
      ‖orbit c z₀ N‖ + (n : ℝ) ≤ ‖orbit c z₀ (N + n)‖ := by
  intro n
  induction n with
  | zero => simp
  | succ n ih =>
      have hcurrent :
          escapeRadius c < ‖orbit c z₀ (N + n)‖ := by
        exact h.trans_le ((le_add_of_nonneg_right (Nat.cast_nonneg n)).trans ih)
      have h2 : 2 < ‖orbit c z₀ (N + n)‖ := by
        exact (le_max_left 2 (‖c‖ + 1)).trans_lt hcurrent
      have hc : ‖c‖ + 1 < ‖orbit c z₀ (N + n)‖ := by
        exact (le_max_right 2 (‖c‖ + 1)).trans_lt hcurrent
      have hstep := norm_add_one_lt_norm_quad c (orbit c z₀ (N + n)) h2 hc
      calc
        ‖orbit c z₀ N‖ + ((n + 1 : ℕ) : ℝ) =
            (‖orbit c z₀ N‖ + (n : ℝ)) + 1 := by
              push_cast
              ring
        _ ≤ ‖orbit c z₀ (N + n)‖ + 1 := by linarith
        _ ≤ ‖quad c (orbit c z₀ (N + n))‖ := hstep.le
        _ = ‖orbit c z₀ (N + (n + 1))‖ := by
          congr 1
          rw [show N + (n + 1) = (N + n) + 1 by simp [Nat.add_assoc], orbit_succ]

theorem escapes_of_norm_gt_escapeRadius
    (c z₀ : ℂ) (N : ℕ)
    (h : escapeRadius c < ‖orbit c z₀ N‖) :
    Tendsto (fun n => ‖orbit c z₀ (N + n)‖) atTop atTop := by
  have hgrowth := escape_tail_lower_bound c z₀ N h
  refine tendsto_atTop.2 fun b => ?_
  obtain ⟨n, hn⟩ := exists_nat_ge (b - ‖orbit c z₀ N‖)
  refine eventually_atTop.2 ⟨n, fun m hm => ?_⟩
  have hnm : (n : ℝ) ≤ (m : ℝ) := by exact_mod_cast hm
  have hb : b ≤ ‖orbit c z₀ N‖ + (m : ℝ) := by
    linarith
  exact hb.trans (hgrowth m)

/-- A single rigorous escape observation certifies that the critical orbit is
not in the Mandelbrot set. -/
theorem not_inMandelbrot_of_norm_gt_escapeRadius
    (c : ℂ) (N : ℕ)
    (h : escapeRadius c < ‖orbit c 0 N‖) :
    ¬ InMandelbrot c := by
  rintro ⟨R, _hR, hbounded⟩
  have hescape := escapes_of_norm_gt_escapeRadius c 0 N h
  have heventually :
      ∀ᶠ n : ℕ in atTop, R + 1 ≤ ‖orbit c 0 (N + n)‖ :=
    (tendsto_atTop.1 hescape) (R + 1)
  obtain ⟨n, hn⟩ := heventually.exists
  have hbound := hbounded (N + n)
  linarith

end

end Mandelbrot
