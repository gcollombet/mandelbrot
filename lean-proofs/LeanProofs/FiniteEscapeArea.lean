/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MandelbrotArea
import Mathlib.MeasureTheory.Measure.MeasureSpace

/-!
# Finite-escape outer approximations to the Mandelbrot set

The set `finiteEscapeSet n` consists of parameters whose critical orbit is
still in the radius-two disk at positive iteration `n + 1`.  The shift makes
the zeroth outer set the parameter disk `‖c‖ ≤ 2`, so every member of the
sequence has finite area.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Metric Set MeasureTheory
open scoped ENNReal Topology

/-- The radius-two finite-escape lemniscate at positive iteration `n + 1`. -/
def finiteEscapeSet (n : ℕ) : Set ℂ :=
  {c | ‖mandelbrotOrbit c (n + 1)‖ ≤ 2}

theorem mem_finiteEscapeSet_iff (c : ℂ) (n : ℕ) :
    c ∈ finiteEscapeSet n ↔ ‖mandelbrotOrbit c (n + 1)‖ ≤ 2 :=
  Iff.rfl

/-! ## Escape persistence and nestedness -/

/-- If one critical-orbit value is outside the radius-two disk, its next
value is also outside.  If `‖c‖` is already larger than that orbit value,
the escape-growth estimate starting at the critical value supplies the
same conclusion. -/
theorem orbit_norm_le_two_of_succ
    (c : ℂ) (n : ℕ)
    (hsucc : ‖mandelbrotOrbit c (n + 1)‖ ≤ 2) :
    ‖mandelbrotOrbit c n‖ ≤ 2 := by
  by_contra hnot
  have hn : 2 < ‖mandelbrotOrbit c n‖ := lt_of_not_ge hnot
  by_cases hc : ‖c‖ ≤ ‖mandelbrotOrbit c n‖
  · have hlower := norm_sq_add_lower (mandelbrotOrbit c n) c
    rw [← mandelbrotOrbit_succ] at hlower
    nlinarith
  · have hcn : ‖mandelbrotOrbit c n‖ < ‖c‖ := lt_of_not_ge hc
    have hc_two : 2 < ‖mandelbrotOrbit c 1‖ := by
      simpa using hn.trans hcn
    have hgrowth := escape_linear_lower_bound c 1 hc_two (by simp) n
    have hdelta :
        0 ≤ (n : ℝ) *
          (‖mandelbrotOrbit c 1‖ * (‖mandelbrotOrbit c 1‖ - 2)) := by
      positivity
    have : 2 < ‖mandelbrotOrbit c (n + 1)‖ := by
      rw [show n + 1 = 1 + n by omega]
      nlinarith
    linarith

theorem finiteEscapeSet_succ_subset (n : ℕ) :
    finiteEscapeSet (n + 1) ⊆ finiteEscapeSet n := by
  intro c hc
  exact orbit_norm_le_two_of_succ c (n + 1) hc

theorem finiteEscapeSet_antitone : Antitone finiteEscapeSet :=
  antitone_nat_of_succ_le finiteEscapeSet_succ_subset

theorem Mandelbrot_subset_finiteEscapeSet (n : ℕ) :
    Mandelbrot ⊆ finiteEscapeSet n := by
  intro c hc
  exact (mem_Mandelbrot_iff_orbit_norm_le_two c).1 hc (n + 1)

/-! ## Topology and finite volume -/

theorem isClosed_finiteEscapeSet (n : ℕ) :
    IsClosed (finiteEscapeSet n) :=
  isClosed_le (continuous_mandelbrotOrbit (n + 1)).norm continuous_const

theorem measurableSet_finiteEscapeSet (n : ℕ) :
    MeasurableSet (finiteEscapeSet n) :=
  (isClosed_finiteEscapeSet n).measurableSet

theorem finiteEscapeSet_subset_closedBall_two (n : ℕ) :
    finiteEscapeSet n ⊆ closedBall (0 : ℂ) 2 := by
  intro c hc
  have hc0 : c ∈ finiteEscapeSet 0 :=
    finiteEscapeSet_antitone (Nat.zero_le n) hc
  simpa [finiteEscapeSet, mem_closedBall, dist_zero_right, mandelbrotOrbit]
    using hc0

theorem isBounded_finiteEscapeSet (n : ℕ) :
    Bornology.IsBounded (finiteEscapeSet n) :=
  (Metric.isBounded_closedBall.subset (finiteEscapeSet_subset_closedBall_two n))

theorem volume_finiteEscapeSet_ne_top (n : ℕ) :
    volume (finiteEscapeSet n) ≠ ∞ :=
  ne_top_of_le_ne_top measure_closedBall_lt_top.ne
    (measure_mono (finiteEscapeSet_subset_closedBall_two n))

/-! ## Exact intersection and continuity from above -/

theorem iInter_finiteEscapeSet :
    ⋂ n : ℕ, finiteEscapeSet n = Mandelbrot := by
  ext c
  constructor
  · intro hc
    rw [mem_iInter] at hc
    rw [mem_Mandelbrot_iff_orbit_norm_le_two]
    intro n
    cases n with
    | zero => norm_num [mandelbrotOrbit]
    | succ n => exact hc n
  · intro hc
    rw [mem_iInter]
    intro n
    exact Mandelbrot_subset_finiteEscapeSet n hc

theorem volume_finiteEscapeSet_antitone :
    Antitone (fun n => volume (finiteEscapeSet n)) :=
  fun _ _ h => measure_mono (finiteEscapeSet_antitone h)

/-- The certified outer areas decrease to the exact Mandelbrot area.  No
assumption about the area of the boundary is used. -/
theorem tendsto_volume_finiteEscapeSet :
    Tendsto (fun n : ℕ => volume (finiteEscapeSet n)) atTop
      (nhds (volume Mandelbrot)) := by
  have h := tendsto_measure_iInter_atTop (μ := volume)
    (fun n => (measurableSet_finiteEscapeSet n).nullMeasurableSet)
    finiteEscapeSet_antitone
    ⟨0, volume_finiteEscapeSet_ne_top 0⟩
  simpa [Function.comp_def, iInter_finiteEscapeSet] using h

/-! ## Backend-facing upper-bound interface -/

theorem volume_Mandelbrot_le_volume_finiteEscapeSet (n : ℕ) :
    volume Mandelbrot ≤ volume (finiteEscapeSet n) :=
  measure_mono (Mandelbrot_subset_finiteEscapeSet n)

/-- Any exact certificate bounding one finite lemniscate area immediately
becomes a rigorous upper bound for the Mandelbrot area. -/
theorem volume_Mandelbrot_le_of_finiteEscapeSet_volume_le
    (n : ℕ) (U : ℝ≥0∞)
    (hcertificate : volume (finiteEscapeSet n) ≤ U) :
    volume Mandelbrot ≤ U :=
  (volume_Mandelbrot_le_volume_finiteEscapeSet n).trans hcertificate

end

end Mandelbrot
