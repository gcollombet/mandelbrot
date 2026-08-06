/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FiniteEscapeArea

/-!
# Certified area enclosures and the effective-gap criterion

Monotone lower and upper bounds provide correct closed intervals.  They do
not by themselves provide an algorithm selecting an interval of prescribed
width.  The additional datum `EffectiveAreaGapModulus` records exactly that
selection rule.
-/

namespace Mandelbrot

noncomputable section

open Filter Set MeasureTheory
open scoped ENNReal Topology

/-- Abstract certified lower and upper sequences for the Mandelbrot area. -/
structure CertifiedAreaSequences where
  lower : ℕ → ℝ≥0∞
  upper : ℕ → ℝ≥0∞
  lower_monotone : Monotone lower
  upper_antitone : Antitone upper
  lower_le_area : ∀ n, lower n ≤ volume Mandelbrot
  area_le_upper : ∀ n, volume Mandelbrot ≤ upper n

namespace CertifiedAreaSequences

/-- The closed certified interval at index `n`. -/
def enclosure (bounds : CertifiedAreaSequences) (n : ℕ) : Set ℝ≥0∞ :=
  Icc (bounds.lower n) (bounds.upper n)

/-- Its (truncated) width in `ℝ≥0∞`. -/
def gap (bounds : CertifiedAreaSequences) (n : ℕ) : ℝ≥0∞ :=
  bounds.upper n - bounds.lower n

theorem lower_le_upper (bounds : CertifiedAreaSequences) (n : ℕ) :
    bounds.lower n ≤ bounds.upper n :=
  (bounds.lower_le_area n).trans (bounds.area_le_upper n)

theorem area_mem_enclosure (bounds : CertifiedAreaSequences) (n : ℕ) :
    volume Mandelbrot ∈ bounds.enclosure n :=
  ⟨bounds.lower_le_area n, bounds.area_le_upper n⟩

theorem isClosed_enclosure (bounds : CertifiedAreaSequences) (n : ℕ) :
    IsClosed (bounds.enclosure n) :=
  isClosed_Icc

theorem enclosure_antitone (bounds : CertifiedAreaSequences) :
    Antitone bounds.enclosure := by
  intro m n hmn x hx
  exact ⟨(bounds.lower_monotone hmn).trans hx.1,
    hx.2.trans (bounds.upper_antitone hmn)⟩

end CertifiedAreaSequences

/-- A usable convergence rate: for each requested positive precision it
selects an index whose certified upper-minus-lower gap is smaller.  Keeping
this as explicit data prevents abstract monotone convergence from being
misreported as an effective computation. -/
structure EffectiveAreaGapModulus (bounds : CertifiedAreaSequences) where
  index : ℝ≥0∞ → ℕ
  gap_lt : ∀ ε : ℝ≥0∞, 0 < ε → bounds.gap (index ε) < ε

namespace EffectiveAreaGapModulus

def enclosureAtPrecision
    {bounds : CertifiedAreaSequences}
    (modulus : EffectiveAreaGapModulus bounds) (ε : ℝ≥0∞) : Set ℝ≥0∞ :=
  bounds.enclosure (modulus.index ε)

theorem area_mem_enclosureAtPrecision
    {bounds : CertifiedAreaSequences}
    (modulus : EffectiveAreaGapModulus bounds) (ε : ℝ≥0∞) :
    volume Mandelbrot ∈ modulus.enclosureAtPrecision ε :=
  bounds.area_mem_enclosure (modulus.index ε)

theorem enclosureAtPrecision_gap_lt
    {bounds : CertifiedAreaSequences}
    (modulus : EffectiveAreaGapModulus bounds)
    (ε : ℝ≥0∞) (hε : 0 < ε) :
    bounds.upper (modulus.index ε) - bounds.lower (modulus.index ε) < ε :=
  modulus.gap_lt ε hε

/-- The complete arbitrary-precision enclosure statement supplied by an
effective gap modulus. -/
theorem exists_certified_enclosure_of_pos
    {bounds : CertifiedAreaSequences}
    (modulus : EffectiveAreaGapModulus bounds)
    (ε : ℝ≥0∞) (hε : 0 < ε) :
    ∃ n : ℕ,
      volume Mandelbrot ∈ Icc (bounds.lower n) (bounds.upper n) ∧
      bounds.upper n - bounds.lower n < ε := by
  exact ⟨modulus.index ε, bounds.area_mem_enclosure (modulus.index ε),
    modulus.gap_lt ε hε⟩

end EffectiveAreaGapModulus

/-! ## A concrete certified pair already available in the development -/

/-- The zero lower bound together with the finite-escape outer areas is a
valid certified pair.  No effective gap is claimed for this pair. -/
def finiteEscapeAreaSequences : CertifiedAreaSequences where
  lower := fun _ => 0
  upper := fun n => volume (finiteEscapeSet n)
  lower_monotone := monotone_const
  upper_antitone := volume_finiteEscapeSet_antitone
  lower_le_area := fun _ => bot_le
  area_le_upper := volume_Mandelbrot_le_volume_finiteEscapeSet

theorem finiteEscape_area_mem_enclosure (n : ℕ) :
    volume Mandelbrot ∈ finiteEscapeAreaSequences.enclosure n :=
  finiteEscapeAreaSequences.area_mem_enclosure n

end

end Mandelbrot
