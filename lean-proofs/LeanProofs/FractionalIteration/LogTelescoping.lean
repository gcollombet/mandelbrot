/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Analysis.Complex.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
# Finite logarithmic telescoping

This is the exact finite identity behind the logarithmic Böttcher formula.  It
does not assume convergence or select a principal logarithm independently at
each iterate.
-/

namespace Mandelbrot

theorem finite_log_telescope
    (L correction : ℕ → ℂ)
    (hrec : ∀ n, L (n + 1) = 2 * L n + correction n) :
    ∀ N : ℕ,
      L N / (2 : ℂ) ^ N =
        L 0 + ∑ n ∈ Finset.range N, correction n / (2 : ℂ) ^ (n + 1) := by
  intro N
  induction N with
  | zero => simp
  | succ N ih =>
      calc
        L (N + 1) / (2 : ℂ) ^ (N + 1) =
            L N / (2 : ℂ) ^ N +
              correction N / (2 : ℂ) ^ (N + 1) := by
                rw [hrec]
                field_simp
                ring
        _ = (L 0 + ∑ n ∈ Finset.range N,
              correction n / (2 : ℂ) ^ (n + 1)) +
              correction N / (2 : ℂ) ^ (N + 1) := by rw [ih]
        _ = L 0 + ∑ n ∈ Finset.range (N + 1),
              correction n / (2 : ℂ) ^ (n + 1) := by
                rw [Finset.sum_range_succ]
                ring

end Mandelbrot
