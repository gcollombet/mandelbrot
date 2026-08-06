/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.BottcherFractional
import LeanProofs.FractionalIteration.KoenigsFractional
import LeanProofs.FractionalIteration.Segments

/-!
# Ideal analytic segments between integer iterates

This file formalizes T6.3 and T6.4.  It turns the local fractional families
already constructed in Koenigs and Böttcher coordinates into unit-time orbit
segments and proves their exact endpoints.

The hypotheses remain pointwise and explicit.  For Koenigs they are the local
inverse and Schroeder identities at the relevant points.  For Böttcher they
are membership in the selected cut chart together with the branch and domain
guards from T4.7.
-/

namespace Mandelbrot

noncomputable section

open Filter
open scoped Topology

namespace KoenigsFixedPointGerm

/-- The ideal Koenigs segment starting at `z`. -/
def idealSegment
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) (z : ℂ) (s : ℝ) : ℂ :=
  g.fractional L s z

/-- Exact left endpoint under the pointwise inverse identity of the chart. -/
@[simp] theorem idealSegment_zero
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) {z : ℂ}
    (hleft : g.psi (g.phi z) = z) :
    g.idealSegment L z 0 = z := by
  simpa [idealSegment, fractional] using hleft

/-- Exact right endpoint under Schroeder's equation and the inverse identity
at `q_c(z)`. -/
@[simp] theorem idealSegment_one
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) {z : ℂ}
    (hexp : Complex.exp L = 2 * p)
    (hschroeder :
      g.phi (quad c z) = (2 * p) * g.phi z)
    (hleft :
      g.psi (g.phi (quad c z)) = quad c z) :
    g.idealSegment L z 1 = quad c z := by
  rw [idealSegment, fractional,
    koenigsModel_one L (2 * p) (g.phi z) hexp,
    ← hschroeder, hleft]

/-- Pointwise local composition law for ideal Koenigs segments. -/
theorem idealSegment_add
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) (s t : ℝ) (z : ℂ)
    (hright :
      g.phi
          (g.psi (koenigsModel L t (g.phi z))) =
        koenigsModel L t (g.phi z)) :
    g.idealSegment L (g.idealSegment L z t) s =
      g.idealSegment L z (s + t) := by
  unfold idealSegment fractional
  rw [hright, koenigsModel_add]

/-- The analytic Koenigs germ supplies all endpoint identities on some
neighborhood of the attracting fixed point. -/
theorem idealSegment_endpoints_eventually
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (hp : quad c p = p) (L : ℂ)
    (hexp : Complex.exp L = 2 * p) :
    ∀ᶠ z in 𝓝 p,
      g.idealSegment L z 0 = z ∧
        g.idealSegment L z 1 = quad c z := by
  filter_upwards
    [g.fractional_zero_eventually L,
      g.fractional_one_eventually hp L hexp] with z hzero hone
  exact ⟨hzero, hone⟩

/-- The ideal Koenigs segment on the `n`th integer-orbit interval. -/
def idealOrbitSegment
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) (z₀ : ℂ) (n : ℕ) (s : ℝ) : ℂ :=
  g.idealSegment L (orbit c z₀ n) s

/-- T6.3 for an integer-orbit interval, with the precise pointwise chart
conditions exposed. -/
theorem idealOrbitSegment_endpoints
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) (z₀ : ℂ) (n : ℕ)
    (hexp : Complex.exp L = 2 * p)
    (hleft :
      g.psi (g.phi (orbit c z₀ n)) = orbit c z₀ n)
    (hschroeder :
      g.phi (quad c (orbit c z₀ n)) =
        (2 * p) * g.phi (orbit c z₀ n))
    (hleftNext :
      g.psi (g.phi (quad c (orbit c z₀ n))) =
        quad c (orbit c z₀ n)) :
    g.idealOrbitSegment L z₀ n 0 = orbit c z₀ n ∧
      g.idealOrbitSegment L z₀ n 1 = orbit c z₀ (n + 1) := by
  constructor
  · exact g.idealSegment_zero L hleft
  · calc
      g.idealOrbitSegment L z₀ n 1 =
          quad c (orbit c z₀ n) :=
        g.idealSegment_one L hexp hschroeder hleftNext
      _ = orbit c z₀ (n + 1) :=
        (orbit_succ c z₀ n).symm

/-- A global curve pasted from locally valid ideal Koenigs orbit segments
passes through every integer orbit point. -/
theorem pastedIdealOrbitCurve_nat_eq_orbit
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) (z₀ : ℂ) (curve : ℝ → ℂ)
    (hagrees :
      AgreesWithNatSegments curve (g.idealOrbitSegment L z₀))
    (hleft :
      ∀ n, g.psi (g.phi (orbit c z₀ n)) = orbit c z₀ n) :
    ∀ n : ℕ, curve n = orbit c z₀ n := by
  apply pastedCurve_nat_eq_orbit
    c z₀ curve (g.idealOrbitSegment L z₀) hagrees
  intro n
  exact g.idealSegment_zero L (hleft n)

end KoenigsFixedPointGerm

namespace BottcherCutChart

/-- The ideal Böttcher segment starting at `z` in a selected cut chart. -/
def idealSegment
    {c : ℂ} (g : BottcherCutChart c)
    (z : ℂ) (s : ℝ) : ℂ :=
  g.fractional s z

/-- Exact endpoints of an ideal Böttcher segment. -/
theorem idealSegment_endpoints
    {c : ℂ} (g : BottcherCutChart c)
    {z : ℂ} (hz : z ∈ g.source)
    (hqz : quad c z ∈ g.source) :
    g.idealSegment z 0 = z ∧
      g.idealSegment z 1 = quad c z := by
  exact ⟨g.fractional_zero hz, g.fractional_one hz hqz⟩

/-- Local composition law for ideal Böttcher segments, with the exact T4.7
domain and branch hypotheses. -/
theorem idealSegment_add
    {c : ℂ} (g : BottcherCutChart c)
    (s t : ℝ) (z : ℂ)
    (ht : g.DefinedAt t z)
    (hbranch : g.BranchConsistentAt t z) :
    g.idealSegment (g.idealSegment z t) s =
      g.idealSegment z (s + t) :=
  g.fractional_add s t z ht hbranch

/-- The second segment step is defined exactly when the combined-time point
is defined. -/
theorem idealSegment_defined_comp_iff
    {c : ℂ} (g : BottcherCutChart c)
    (s t : ℝ) (z : ℂ)
    (ht : g.DefinedAt t z)
    (hbranch : g.BranchConsistentAt t z) :
    g.DefinedAt s (g.idealSegment z t) ↔
      g.DefinedAt (s + t) z :=
  g.defined_comp_iff s t z ht hbranch

/-- The ideal Böttcher segment on the `n`th integer-orbit interval. -/
def idealOrbitSegment
    {c : ℂ} (g : BottcherCutChart c)
    (z₀ : ℂ) (n : ℕ) (s : ℝ) : ℂ :=
  g.idealSegment (orbit c z₀ n) s

/-- T6.4: exact endpoints of an ideal Böttcher integer-orbit segment. -/
theorem idealOrbitSegment_endpoints
    {c : ℂ} (g : BottcherCutChart c)
    (z₀ : ℂ) (n : ℕ)
    (hz : orbit c z₀ n ∈ g.source)
    (hnext : orbit c z₀ (n + 1) ∈ g.source) :
    g.idealOrbitSegment z₀ n 0 = orbit c z₀ n ∧
      g.idealOrbitSegment z₀ n 1 = orbit c z₀ (n + 1) := by
  have hqz :
      quad c (orbit c z₀ n) ∈ g.source := by
    rw [← orbit_succ]
    exact hnext
  simpa [idealOrbitSegment] using
    (g.idealSegment_endpoints hz hqz)

/-- A curve pasted from ideal Böttcher orbit segments passes through every
integer orbit point as soon as the orbit remains in the selected cut. -/
theorem pastedIdealOrbitCurve_nat_eq_orbit
    {c : ℂ} (g : BottcherCutChart c)
    (z₀ : ℂ) (curve : ℝ → ℂ)
    (hagrees :
      AgreesWithNatSegments curve (g.idealOrbitSegment z₀))
    (horbit : ∀ n, orbit c z₀ n ∈ g.source) :
    ∀ n : ℕ, curve n = orbit c z₀ n := by
  apply pastedCurve_nat_eq_orbit
    c z₀ curve (g.idealOrbitSegment z₀) hagrees
  intro n
  exact g.fractional_zero (horbit n)

end BottcherCutChart

end

end Mandelbrot
