/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.BottcherAnalytic

/-!
# Integer iteration in Böttcher coordinates

This is T4.2: iterating the one-step Böttcher equation gives exponent
`2^n`, provided the finite orbit stays in the chosen exterior domain.
-/

namespace Mandelbrot

noncomputable section

open Function Set

/-- T4.2 on an arbitrary local Böttcher chart. -/
theorem BottcherInfinityChart.map_iterate
    {c : ℂ} (g : BottcherInfinityChart c)
    (z : ℂ) (n : ℕ)
    (hstay :
      ∀ k : ℕ, k ≤ n →
        (quad c)^[k] z ∈ exteriorDomain g.R) :
    g.psi ((quad c)^[n] z) =
      g.psi z ^ (2 ^ n) := by
  induction n with
  | zero =>
      simp
  | succ n ih =>
      rw [Function.iterate_succ_apply']
      have hn : n ≤ n + 1 := by omega
      have hnext : n + 1 ≤ n + 1 := le_rfl
      have hnext' :
          quad c ((quad c)^[n] z) ∈ exteriorDomain g.R := by
        simpa [Function.iterate_succ_apply'] using
          hstay (n + 1) hnext
      rw [g.boettcher (hstay n hn) hnext']
      rw [ih (fun k hk => hstay k (hk.trans hn))]
      rw [← pow_mul]
      congr 2

/-- The concrete chart constructed in T4.1 satisfies the integer iteration
law on every finite orbit segment contained in its exterior domain. -/
theorem bottcherCoordinateAtInfinity_iterate
    (c z : ℂ) (n : ℕ)
    (hstay :
      ∀ k : ℕ, k ≤ n →
        (quad c)^[k] z ∈
          exteriorDomain (bottcherInfinityChart c).R) :
    bottcherCoordinateAtInfinity c ((quad c)^[n] z) =
      bottcherCoordinateAtInfinity c z ^ (2 ^ n) := by
  exact (bottcherInfinityChart c).map_iterate z n hstay

end

end Mandelbrot
