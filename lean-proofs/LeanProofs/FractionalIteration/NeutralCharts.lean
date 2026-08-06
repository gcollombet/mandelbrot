/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FatouSectorial
import LeanProofs.FractionalIteration.LinearModels
import LeanProofs.FractionalIteration.Segments

/-!
# Fractional segments in neutral charts

This file isolates the exact algebra shared by the two neutral regimes used by
the numerical atlas.

* In a Fatou--Abel coordinate, time is translation by `t`.
* In a Siegel coordinate, time is multiplication by `exp(tL)`, where the
  chosen logarithm satisfies `exp L = lambda`.

The endpoint and composition theorems are conditional on the local chart and
inverse identities at the displayed points.  This is deliberate: existence of
a Fatou coordinate is supplied sectorially by `FatouSectorial`, while
existence of a Siegel linearization requires arithmetic hypotheses and is not
asserted for an arbitrary indifferent multiplier.
-/

namespace Mandelbrot

noncomputable section

/-! ## Additive Fatou--Abel model -/

/-- Translation by real time in an Abel coordinate. -/
def abelModel (t : ℝ) (w : ℂ) : ℂ :=
  w + (t : ℂ)

@[simp] theorem abelModel_zero (w : ℂ) :
    abelModel 0 w = w := by
  simp [abelModel]

@[simp] theorem abelModel_one (w : ℂ) :
    abelModel 1 w = w + 1 := by
  simp [abelModel]

theorem abelModel_add (s t : ℝ) (w : ℂ) :
    abelModel s (abelModel t w) = abelModel (s + t) w := by
  simp only [abelModel, Complex.ofReal_add]
  ring

/-- Transport of the additive model through a local Abel chart. -/
def abelFractional
    (coordinate inverse : ℂ → ℂ) (t : ℝ) (z : ℂ) : ℂ :=
  inverse (abelModel t (coordinate z))

@[simp] theorem abelFractional_zero
    (coordinate inverse : ℂ → ℂ) (z : ℂ)
    (hleft : inverse (coordinate z) = z) :
    abelFractional coordinate inverse 0 z = z := by
  simpa [abelFractional] using hleft

/-- Abel's equation gives the exact time-one endpoint. -/
@[simp] theorem abelFractional_one
    (F coordinate inverse : ℂ → ℂ) (z : ℂ)
    (habel : coordinate (F z) = coordinate z + 1)
    (hleft : inverse (coordinate (F z)) = F z) :
    abelFractional coordinate inverse 1 z = F z := by
  rw [abelFractional, abelModel_one, ← habel, hleft]

/-- Pointwise local composition law in an Abel chart. -/
theorem abelFractional_add
    (coordinate inverse : ℂ → ℂ) (s t : ℝ) (z : ℂ)
    (hright :
      coordinate (inverse (abelModel t (coordinate z))) =
        abelModel t (coordinate z)) :
    abelFractional coordinate inverse s
        (abelFractional coordinate inverse t z) =
      abelFractional coordinate inverse (s + t) z := by
  unfold abelFractional
  rw [hright, abelModel_add]

/-- The summable residual correction from `FatouSectorial` directly supplies
the Abel hypothesis needed by the exact time-one theorem. -/
theorem correctedFatouFractional_one
    (F psi inverse : ℂ → ℂ) (u : ℂ)
    (hsum : Summable
      (fun n : ℕ => fatouResidual F psi ((F^[n]) u)))
    (hleft :
      inverse (correctedFatouCoordinate F psi (F u)) = F u) :
    abelFractional (correctedFatouCoordinate F psi) inverse 1 u =
      F u := by
  apply abelFractional_one
  · exact correctedFatouCoordinate_abel F psi u hsum
  · exact hleft

/-- Fatou--Abel segment on the `n`th integer-orbit interval. -/
def fatouOrbitSegment
    (c : ℂ) (coordinate inverse : ℂ → ℂ)
    (z₀ : ℂ) (n : ℕ) (s : ℝ) : ℂ :=
  abelFractional coordinate inverse s (orbit c z₀ n)

/-- Exact endpoints of a Fatou--Abel orbit segment. -/
theorem fatouOrbitSegment_endpoints
    (c : ℂ) (coordinate inverse : ℂ → ℂ)
    (z₀ : ℂ) (n : ℕ)
    (hleft :
      inverse (coordinate (orbit c z₀ n)) = orbit c z₀ n)
    (habel :
      coordinate (quad c (orbit c z₀ n)) =
        coordinate (orbit c z₀ n) + 1)
    (hleftNext :
      inverse (coordinate (quad c (orbit c z₀ n))) =
        quad c (orbit c z₀ n)) :
    fatouOrbitSegment c coordinate inverse z₀ n 0 =
        orbit c z₀ n ∧
      fatouOrbitSegment c coordinate inverse z₀ n 1 =
        orbit c z₀ (n + 1) := by
  constructor
  · exact abelFractional_zero coordinate inverse _ hleft
  · calc
      fatouOrbitSegment c coordinate inverse z₀ n 1 =
          quad c (orbit c z₀ n) := by
        exact abelFractional_one
          (quad c) coordinate inverse _ habel hleftNext
      _ = orbit c z₀ (n + 1) := (orbit_succ c z₀ n).symm

/-! ## Multiplicative Siegel model -/

/-- Transport of a chosen rotation logarithm through a local Siegel chart.
The formula is algebraically the same as the Kœnigs model; only the analytic
regime of the multiplier differs. -/
def siegelFractional
    (coordinate inverse : ℂ → ℂ) (L : ℂ) (t : ℝ) (z : ℂ) : ℂ :=
  inverse (koenigsModel L t (coordinate z))

@[simp] theorem siegelFractional_zero
    (coordinate inverse : ℂ → ℂ) (L z : ℂ)
    (hleft : inverse (coordinate z) = z) :
    siegelFractional coordinate inverse L 0 z = z := by
  simpa [siegelFractional] using hleft

/-- Schröder's equation gives the exact time-one endpoint in a Siegel chart. -/
@[simp] theorem siegelFractional_one
    (F coordinate inverse : ℂ → ℂ) (L lambda z : ℂ)
    (hexp : Complex.exp L = lambda)
    (hschroeder : coordinate (F z) = lambda * coordinate z)
    (hleft : inverse (coordinate (F z)) = F z) :
    siegelFractional coordinate inverse L 1 z = F z := by
  rw [siegelFractional, koenigsModel_one L lambda _ hexp,
    ← hschroeder, hleft]

/-- Pointwise local composition law in a Siegel chart. -/
theorem siegelFractional_add
    (coordinate inverse : ℂ → ℂ) (L : ℂ)
    (s t : ℝ) (z : ℂ)
    (hright :
      coordinate (inverse (koenigsModel L t (coordinate z))) =
        koenigsModel L t (coordinate z)) :
    siegelFractional coordinate inverse L s
        (siegelFractional coordinate inverse L t z) =
      siegelFractional coordinate inverse L (s + t) z := by
  unfold siegelFractional
  rw [hright, koenigsModel_add]

/-- Siegel segment on the `n`th integer-orbit interval. -/
def siegelOrbitSegment
    (c : ℂ) (coordinate inverse : ℂ → ℂ) (L : ℂ)
    (z₀ : ℂ) (n : ℕ) (s : ℝ) : ℂ :=
  siegelFractional coordinate inverse L s (orbit c z₀ n)

/-- Exact endpoints of a Siegel orbit segment, conditional on a valid local
Schröder chart and a chosen logarithm of its neutral multiplier. -/
theorem siegelOrbitSegment_endpoints
    (c : ℂ) (coordinate inverse : ℂ → ℂ) (L lambda : ℂ)
    (z₀ : ℂ) (n : ℕ)
    (hexp : Complex.exp L = lambda)
    (hleft :
      inverse (coordinate (orbit c z₀ n)) = orbit c z₀ n)
    (hschroeder :
      coordinate (quad c (orbit c z₀ n)) =
        lambda * coordinate (orbit c z₀ n))
    (hleftNext :
      inverse (coordinate (quad c (orbit c z₀ n))) =
        quad c (orbit c z₀ n)) :
    siegelOrbitSegment c coordinate inverse L z₀ n 0 =
        orbit c z₀ n ∧
      siegelOrbitSegment c coordinate inverse L z₀ n 1 =
        orbit c z₀ (n + 1) := by
  constructor
  · exact siegelFractional_zero coordinate inverse L _ hleft
  · calc
      siegelOrbitSegment c coordinate inverse L z₀ n 1 =
          quad c (orbit c z₀ n) := by
        exact siegelFractional_one
          (quad c) coordinate inverse L lambda _ hexp hschroeder hleftNext
      _ = orbit c z₀ (n + 1) := (orbit_succ c z₀ n).symm

end

end Mandelbrot
