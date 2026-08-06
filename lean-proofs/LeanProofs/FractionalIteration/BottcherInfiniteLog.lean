/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.BottcherInfinityUniqueness
import LeanProofs.FractionalIteration.LogTelescoping

/-!
# Infinite logarithmic Böttcher formula

This file formalizes T4.4. The theorem is deliberately conditional on both
convergence and coherent logarithmic lifts. It never replaces the lifts by
independently selected principal logarithms along the orbit.
-/

namespace Mandelbrot

noncomputable section

open Filter Function
open scoped Topology

/-- A logarithmic correction weighted by the degree-doubling factor. -/
def weightedLogCorrection (ell : ℕ → ℂ) (n : ℕ) : ℂ :=
  ell n / (2 : ℂ) ^ (n + 1)

/-- Abstract passage from the finite telescoping identity to its infinite
limit. -/
theorem infinite_log_telescope
    (L ell : ℕ → ℂ)
    (hrec : ∀ n, L (n + 1) = 2 * L n + ell n)
    (target correctionSum : ℂ)
    (hlimit :
      Tendsto (fun N : ℕ => L N / (2 : ℂ) ^ N)
        atTop (𝓝 target))
    (hsum :
      HasSum (weightedLogCorrection ell) correctionSum) :
    target = L 0 + correctionSum := by
  have hpartial :
      (fun N : ℕ => L N / (2 : ℂ) ^ N) =
        (fun N : ℕ =>
          L 0 + ∑ n ∈ Finset.range N,
            weightedLogCorrection ell n) := by
    funext N
    simpa [weightedLogCorrection] using
      finite_log_telescope L ell hrec N
  have hright :
      Tendsto
        (fun N : ℕ =>
          L 0 + ∑ n ∈ Finset.range N,
            weightedLogCorrection ell n)
        atTop (𝓝 (L 0 + correctionSum)) :=
    tendsto_const_nhds.add hsum.tendsto_sum_nat
  rw [hpartial] at hlimit
  exact tendsto_nhds_unique hlimit hright

/-- Coherent logarithmic lifts along the orbit of `z²+c`.

The recurrence is a genuine branch-coherence condition. The two exponential
identities alone determine it only modulo integral multiples of `2πi`. -/
structure CoherentBottcherLogLift (c z : ℂ) where
  L : ℕ → ℂ
  ell : ℕ → ℂ
  orbit_ne_zero : ∀ n : ℕ, (quad c)^[n] z ≠ 0
  exp_L : ∀ n : ℕ, Complex.exp (L n) = (quad c)^[n] z
  exp_ell : ∀ n : ℕ,
    Complex.exp (ell n) =
      1 + c / ((quad c)^[n] z) ^ 2
  coherent : ∀ n : ℕ, L (n + 1) = 2 * L n + ell n
  base_principal : L 0 = Complex.log z

/-- The correction series attached to coherent logarithmic lifts. -/
def CoherentBottcherLogLift.correctionSeries
    {c z : ℂ} (lift : CoherentBottcherLogLift c z) (n : ℕ) : ℂ :=
  weightedLogCorrection lift.ell n

/-- T4.4 in its exact conditional form. -/
theorem CoherentBottcherLogLift.infinite_formula
    {c z : ℂ} (lift : CoherentBottcherLogLift c z)
    (psi : ℂ → ℂ)
    (hlimit :
      Tendsto
        (fun N : ℕ => lift.L N / (2 : ℂ) ^ N)
        atTop (𝓝 (Complex.log (psi z))))
    (hsummable : Summable lift.correctionSeries) :
    Complex.log (psi z) =
      Complex.log z + ∑' n : ℕ, lift.correctionSeries n := by
  have h := infinite_log_telescope
    lift.L lift.ell lift.coherent
    (Complex.log (psi z))
    (∑' n : ℕ, lift.correctionSeries n)
    hlimit
    hsummable.hasSum
  simpa [CoherentBottcherLogLift.correctionSeries,
    lift.base_principal] using h

/-- T4.4 specialized to the exterior Böttcher coordinate constructed in
T4.1. The convergence and branch-coherence assumptions remain explicit. -/
theorem CoherentBottcherLogLift.constructed_infinite_formula
    {c z : ℂ} (lift : CoherentBottcherLogLift c z)
    (hlimit :
      Tendsto
        (fun N : ℕ => lift.L N / (2 : ℂ) ^ N)
        atTop
        (𝓝 (Complex.log (bottcherCoordinateAtInfinity c z))))
    (hsummable : Summable lift.correctionSeries) :
    Complex.log (bottcherCoordinateAtInfinity c z) =
      Complex.log z + ∑' n : ℕ, lift.correctionSeries n :=
  lift.infinite_formula
    (bottcherCoordinateAtInfinity c) hlimit hsummable

end

end Mandelbrot
