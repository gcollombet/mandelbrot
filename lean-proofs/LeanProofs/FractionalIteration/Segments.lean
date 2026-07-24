/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Basic
import Mathlib.Algebra.Order.ToIntervalMod
import Mathlib.Analysis.SpecificLimits.Basic
import Mathlib.Order.Filter.AtTopBot.Archimedean
import Mathlib.Order.Filter.AtTopBot.Group
import Mathlib.Topology.LocallyFinite
import Mathlib.Topology.Order.AtTopBotIxx

/-!
# Endpoint compatibility of piecewise orbit segments

These lemmas isolate the exact seam condition needed before a topological
pasting theorem is applied.
-/

namespace Mandelbrot

/-- A curve agrees with a family of forward-time segments on every unit
interval. -/
def AgreesWithNatSegments
    (curve : ℝ → ℂ) (segment : ℕ → ℝ → ℂ) : Prop :=
  ∀ (n : ℕ) (s : ℝ), s ∈ Set.Icc (0 : ℝ) 1 →
    curve ((n : ℝ) + s) = segment n s

/-- T6.2, forward-time endpoint statement: a curve pasted from exact orbit
segments passes through the integer orbit at every natural time. -/
theorem pastedCurve_nat_eq_orbit
    (c z₀ : ℂ) (curve : ℝ → ℂ) (segment : ℕ → ℝ → ℂ)
    (hagrees : AgreesWithNatSegments curve segment)
    (hzero : ∀ n, segment n 0 = orbit c z₀ n) :
    ∀ n : ℕ, curve n = orbit c z₀ n := by
  intro n
  calc
    curve n = curve ((n : ℝ) + 0) := by simp
    _ = segment n 0 := hagrees n 0 (by simp)
    _ = orbit c z₀ n := hzero n

theorem segment_passes_through_orbit
    (c z₀ : ℂ) (segment : ℕ → ℝ → ℂ)
    (hzero : ∀ n, segment n 0 = orbit c z₀ n) :
    ∀ n, segment n 0 = orbit c z₀ n :=
  hzero

theorem segment_seam_of_orbit_endpoints
    (c z₀ : ℂ) (segment : ℕ → ℝ → ℂ)
    (hzero : ∀ n, segment n 0 = orbit c z₀ n)
    (hone : ∀ n, segment n 1 = orbit c z₀ (n + 1)) :
    ∀ n, segment n 1 = segment (n + 1) 0 := by
  intro n
  rw [hone, hzero]

/-- A curve agrees with integer-indexed segments on all real unit intervals.
This is the precise hypothesis used by the topological pasting theorem
below. -/
def AgreesWithIntegerSegments
    (curve : ℝ → ℂ) (segment : ℤ → ℝ → ℂ) : Prop :=
  ∀ (n : ℤ) (s : ℝ), s ∈ Set.Icc (0 : ℝ) 1 →
    curve ((n : ℝ) + s) = segment n s

/-- Canonical integer-indexed pasting, using the floor to select a segment.
At integer times the right-hand segment is selected. -/
noncomputable def pastedIntegerCurve
    (segment : ℤ → ℝ → ℂ) (t : ℝ) : ℂ :=
  segment ⌊t⌋ (t - (⌊t⌋ : ℤ))

/-- Compatible endpoints make the floor-based construction agree with every
closed segment, including the upper endpoint where the floor selects the next
interval. -/
theorem pastedIntegerCurve_agrees
    (segment : ℤ → ℝ → ℂ)
    (hseam : ∀ n : ℤ, segment n 1 = segment (n + 1) 0) :
    AgreesWithIntegerSegments
      (pastedIntegerCurve segment) segment := by
  intro n s hs
  rcases hs.2.eq_or_lt with rfl | hslt
  · simp [pastedIntegerCurve, hseam]
  · have hfloor : ⌊s⌋ = (0 : ℤ) :=
      Int.floor_eq_zero_iff.mpr ⟨hs.1, hslt⟩
    rw [show (n : ℝ) + s = s + n by ring]
    simp [pastedIntegerCurve, Int.floor_add_intCast, hfloor]

/-- Agreement with one global pasted curve forces adjacent segment endpoints
to coincide. -/
theorem integer_segment_seam_of_agreement
    (curve : ℝ → ℂ) (segment : ℤ → ℝ → ℂ)
    (hagrees : AgreesWithIntegerSegments curve segment) :
    ∀ n : ℤ, segment n 1 = segment (n + 1) 0 := by
  intro n
  calc
    segment n 1 = curve ((n : ℝ) + 1) :=
      (hagrees n 1 (by simp)).symm
    _ = curve (((n + 1 : ℤ) : ℝ) + 0) := by
      norm_num
    _ = segment (n + 1) 0 :=
      hagrees (n + 1) 0 (by simp)

/-- Continuity part of T6.2.  Closed unit intervals form a locally finite
cover of `ℝ`; hence a curve agreeing with continuous segments on every
interval is continuous globally, including at all seams. -/
theorem continuous_of_agreesWithIntegerSegments
    (curve : ℝ → ℂ) (segment : ℤ → ℝ → ℂ)
    (hagrees : AgreesWithIntegerSegments curve segment)
    (hcontinuous : ∀ n, Continuous (segment n)) :
    Continuous curve := by
  let intervals : ℤ → Set ℝ :=
    fun n ↦ Set.Icc (n : ℝ) ((n : ℝ) + 1)
  have hcastBot :
      Filter.Tendsto ((↑) : ℤ → ℝ)
        Filter.atBot Filter.atBot :=
    tendsto_intCast_atBot_iff.2 Filter.tendsto_id
  have hlocallyFinite : LocallyFinite intervals := by
    exact locallyFinite_Icc_of_tendsto
      (tendsto_intCast_atTop_atTop (R := ℝ))
      (Filter.tendsto_atBot_add_const_right
        Filter.atBot (1 : ℝ) hcastBot)
  have hcover : ⋃ n : ℤ, intervals n = Set.univ := by
    simpa [intervals] using (iUnion_Icc_intCast ℝ)
  apply hlocallyFinite.continuous hcover
  · intro n
    exact isClosed_Icc
  · intro n
    have htranslated :
        Continuous (fun x : ℝ ↦ segment n (x - (n : ℝ))) :=
      (hcontinuous n).comp (continuous_id.sub continuous_const)
    apply htranslated.continuousOn.congr
    intro x hx
    have hs :
        x - (n : ℝ) ∈ Set.Icc (0 : ℝ) 1 := by
      change
        (n : ℝ) ≤ x ∧ x ≤ (n : ℝ) + 1 at hx
      constructor <;> linarith
    have h :=
      hagrees n (x - (n : ℝ)) hs
    rw [show (n : ℝ) + (x - (n : ℝ)) = x by ring] at h
    exact h

/-- Constructive continuity theorem for T6.2: continuous compatible segments
produce a continuous global pasted curve. -/
theorem continuous_pastedIntegerCurve
    (segment : ℤ → ℝ → ℂ)
    (hseam : ∀ n : ℤ, segment n 1 = segment (n + 1) 0)
    (hcontinuous : ∀ n, Continuous (segment n)) :
    Continuous (pastedIntegerCurve segment) :=
  continuous_of_agreesWithIntegerSegments
    (pastedIntegerCurve segment) segment
      (pastedIntegerCurve_agrees segment hseam) hcontinuous

end Mandelbrot
