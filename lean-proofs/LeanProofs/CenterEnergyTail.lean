/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FiniteCenterEnergy
import Mathlib.Topology.Order.MonotoneConvergence

/-!
# Qualitative convergence of the center-energy tail

This module takes the next non-effective step for the finite center sums.  If
every truncation has the expected disjoint-sheet area bound at one fixed
positive multiplier radius, finite area bounds the increasing sequence
`H_P`.  Its supremum is then a genuine limit and the tail tends to zero.

No rate of convergence is asserted.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Set MeasureTheory Metric
open scoped ENNReal NNReal Topology

/-- The Mandelbrot set has finite planar volume, using its radius-two bound. -/
theorem volume_Mandelbrot_ne_top : volume Mandelbrot ≠ ∞ := by
  have hle : volume Mandelbrot ≤ volume (closedBall (0 : ℂ) 2) :=
    measure_mono Mandelbrot_subset_closedBall_two
  have hball : volume (closedBall (0 : ℂ) 2) ≠ ∞ := by
    rw [Complex.volume_closedBall]
    exact ENNReal.mul_ne_top (by simp) ENNReal.coe_ne_top
  exact ne_top_of_le_ne_top hball hle

/-- Uniform finite-truncation area inequality at a fixed multiplier radius. -/
def HasUniformCenterEnergyAreaBound (R : ℝ) : Prop :=
  ∀ P : ℕ,
    ENNReal.ofReal (Real.pi * R ^ 2 * truncatedCenterEnergy P) ≤
      volume Mandelbrot

/-- A uniform area inequality makes the real sequence `H_P` bounded above. -/
theorem bddAbove_range_truncatedCenterEnergy_of_areaBound
    {R : ℝ} (hR : 0 < R) (harea : HasUniformCenterEnergyAreaBound R) :
    BddAbove (Set.range truncatedCenterEnergy) := by
  let upper : ℝ := (volume Mandelbrot).toReal / (Real.pi * R ^ 2)
  refine ⟨upper, ?_⟩
  rintro value ⟨P, rfl⟩
  have hfactor : 0 < Real.pi * R ^ 2 :=
    mul_pos Real.pi_pos (pow_pos hR 2)
  have hnonneg :
      0 ≤ Real.pi * R ^ 2 * truncatedCenterEnergy P :=
    mul_nonneg hfactor.le (truncatedCenterEnergy_nonneg P)
  have hreal := ENNReal.toReal_mono volume_Mandelbrot_ne_top (harea P)
  rw [ENNReal.toReal_ofReal hnonneg] at hreal
  apply (le_div_iff₀ hfactor).2
  simpa only [upper, mul_comm] using hreal

/-- The qualitative total first-coefficient energy `H = sup_P H_P`. -/
def centerEnergyLimit : ℝ :=
  ⨆ P : ℕ, truncatedCenterEnergy P

/-- The remaining first-coefficient energy after period `P`. -/
def centerEnergyTail (P : ℕ) : ℝ :=
  centerEnergyLimit - truncatedCenterEnergy P

theorem tendsto_truncatedCenterEnergy_centerEnergyLimit
    {R : ℝ} (hR : 0 < R) (harea : HasUniformCenterEnergyAreaBound R) :
    Tendsto truncatedCenterEnergy atTop (𝓝 centerEnergyLimit) := by
  exact tendsto_atTop_ciSup monotone_truncatedCenterEnergy
    (bddAbove_range_truncatedCenterEnergy_of_areaBound hR harea)

theorem centerEnergyTail_nonneg
    {R : ℝ} (hR : 0 < R) (harea : HasUniformCenterEnergyAreaBound R)
    (P : ℕ) :
    0 ≤ centerEnergyTail P := by
  rw [centerEnergyTail]
  exact sub_nonneg.mpr
    (le_ciSup (bddAbove_range_truncatedCenterEnergy_of_areaBound hR harea) P)

theorem antitone_centerEnergyTail : Antitone centerEnergyTail := by
  intro P Q hPQ
  exact sub_le_sub_left (monotone_truncatedCenterEnergy hPQ) centerEnergyLimit

/-- Qualitative tail control: `H - H_P` converges to zero. -/
theorem tendsto_centerEnergyTail_zero
    {R : ℝ} (hR : 0 < R) (harea : HasUniformCenterEnergyAreaBound R) :
    Tendsto centerEnergyTail atTop (𝓝 0) := by
  have hlimit := tendsto_truncatedCenterEnergy_centerEnergyLimit hR harea
  have hconst :
      Tendsto (fun _ : ℕ => centerEnergyLimit) atTop (𝓝 centerEnergyLimit) :=
    tendsto_const_nhds
  change Tendsto (fun P => centerEnergyLimit - truncatedCenterEnergy P)
    atTop (𝓝 0)
  simpa only [sub_self] using (hconst.sub hlimit)

/-- Epsilon formulation of the qualitative tail result.  It supplies an
existential cutoff but no computable rule for finding it. -/
theorem exists_tail_lt_of_areaBound
    {R ε : ℝ} (hR : 0 < R) (hε : 0 < ε)
    (harea : HasUniformCenterEnergyAreaBound R) :
    ∃ P : ℕ, ∀ Q ≥ P, centerEnergyTail Q < ε := by
  have heventually : ∀ᶠ P : ℕ in atTop, centerEnergyTail P < ε :=
    (tendsto_order.1 (tendsto_centerEnergyTail_zero hR harea)).2 ε hε
  obtain ⟨P, hP⟩ := heventually.exists
  exact ⟨P, fun Q hPQ => (antitone_centerEnergyTail hPQ).trans_lt hP⟩

end

end Mandelbrot
