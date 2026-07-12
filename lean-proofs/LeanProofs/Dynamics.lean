/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Bounds
import Mathlib.Topology.MetricSpace.Pseudo.Defs

/-!
# Dynamical certificates for periodic and Fatou gates

The local multiplier at a fixed point is not used as a substitute for the
hypotheses below.  The contraction estimate is uniform on a certified domain,
and both compared paths are explicitly required to stay in that domain.
-/

namespace Mandelbrot

/-- A forward-invariant set contains the whole exact orbit. -/
theorem orbit_mem_of_mapsTo {X : Type*} (S : Set X) (g : X → X) (x : ℕ → X)
    (hx0 : x 0 ∈ S) (hstep : ∀ n, x (n + 1) = g (x n))
    (hinvariant : Set.MapsTo g S S) : ∀ n, x n ∈ S := by
  intro n
  induction n with
  | zero => exact hx0
  | succ n ih =>
      rw [hstep n]
      exact hinvariant ih

section Metric

variable {X : Type*} [PseudoMetricSpace X]

/-- A uniform Lipschitz bound and a per-application model error imply the
scalar affine error recurrence, provided both paths remain in the certified
domain. -/
theorem orbit_error_recurrence_on
    (S : Set X) (g : X → X) (exact approx : ℕ → X) (eps gamma : ℝ)
    (hexactStep : ∀ n, exact (n + 1) = g (exact n))
    (hmodel : ∀ n, dist (approx (n + 1)) (g (approx n)) ≤ eps)
    (hexactMem : ∀ n, exact n ∈ S) (happroxMem : ∀ n, approx n ∈ S)
    (hcontract : ∀ x ∈ S, ∀ y ∈ S, dist (g x) (g y) ≤ gamma * dist x y) :
    ∀ n, dist (approx (n + 1)) (exact (n + 1)) ≤
      eps + gamma * dist (approx n) (exact n) := by
  intro n
  calc
    dist (approx (n + 1)) (exact (n + 1)) =
        dist (approx (n + 1)) (g (exact n)) := by rw [hexactStep n]
    _ ≤ dist (approx (n + 1)) (g (approx n)) +
          dist (g (approx n)) (g (exact n)) := dist_triangle _ _ _
    _ ≤ eps + gamma * dist (approx n) (exact n) :=
      add_le_add (hmodel n)
        (hcontract (approx n) (happroxMem n) (exact n) (hexactMem n))

/-- Finite-horizon error for a uniformly Lipschitz periodic block. -/
theorem periodic_model_error_on
    (S : Set X) (g : X → X) (exact approx : ℕ → X) (eps gamma : ℝ)
    (heps : 0 ≤ eps) (hgamma : 0 ≤ gamma)
    (hstart : approx 0 = exact 0)
    (hexactStep : ∀ n, exact (n + 1) = g (exact n))
    (hmodel : ∀ n, dist (approx (n + 1)) (g (approx n)) ≤ eps)
    (hexactMem : ∀ n, exact n ∈ S) (happroxMem : ∀ n, approx n ∈ S)
    (hcontract : ∀ x ∈ S, ∀ y ∈ S, dist (g x) (g y) ≤ gamma * dist x y) :
    ∀ n, dist (approx n) (exact n) ≤
      eps * ∑ k ∈ Finset.range n, gamma ^ k := by
  apply affine_error_bound (fun n => dist (approx n) (exact n)) eps gamma heps hgamma
  · simp [hstart]
  · exact orbit_error_recurrence_on S g exact approx eps gamma hexactStep hmodel
      hexactMem happroxMem hcontract

/-- Uniform-in-time damped error.  Unlike a pointwise multiplier test, the
statement requires contraction on the whole certified domain. -/
theorem periodic_model_error_contraction_on
    (S : Set X) (g : X → X) (exact approx : ℕ → X) (eps gamma : ℝ)
    (heps : 0 ≤ eps) (hgamma : 0 ≤ gamma) (hgamma_lt : gamma < 1)
    (hstart : approx 0 = exact 0)
    (hexactStep : ∀ n, exact (n + 1) = g (exact n))
    (hmodel : ∀ n, dist (approx (n + 1)) (g (approx n)) ≤ eps)
    (hexactMem : ∀ n, exact n ∈ S) (happroxMem : ∀ n, approx n ∈ S)
    (hcontract : ∀ x ∈ S, ∀ y ∈ S, dist (g x) (g y) ≤ gamma * dist x y) :
    ∀ n, dist (approx n) (exact n) ≤ eps / (1 - gamma) := by
  apply affine_error_bound_contraction (fun n => dist (approx n) (exact n))
      eps gamma heps hgamma hgamma_lt
  · simp [hstart]
  · exact orbit_error_recurrence_on S g exact approx eps gamma hexactStep hmodel
      hexactMem happroxMem hcontract

/-- Approximate translations accumulate their residual linearly.  This is the
coordinate-space part of a Fatou-gate certificate. -/
theorem approximate_translation_error
    (translate : X → X) (exact approx : ℕ → X) (eps : ℝ)
    (heps : 0 ≤ eps) (hstart : approx 0 = exact 0)
    (hexactStep : ∀ n, exact (n + 1) = translate (exact n))
    (hmodel : ∀ n, dist (approx (n + 1)) (translate (approx n)) ≤ eps)
    (hisometry : ∀ x y, dist (translate x) (translate y) ≤ dist x y) :
    ∀ n, dist (approx n) (exact n) ≤ (n : ℝ) * eps := by
  intro n
  have hfinite := periodic_model_error_on Set.univ translate exact approx eps 1
      heps (by norm_num) hstart hexactStep hmodel
      (fun _ => Set.mem_univ _) (fun _ => Set.mem_univ _)
      (fun x _ y _ => by simpa using hisometry x y) n
  calc
    dist (approx n) (exact n) ≤ eps * (n : ℝ) := by simpa using hfinite
    _ = (n : ℝ) * eps := mul_comm _ _

/-- A Lipschitz exit chart converts the accumulated coordinate error into an
output-space error. -/
theorem exit_chart_error
    {Y : Type*} [PseudoMetricSpace Y] (S : Set X) (exit : X → Y)
    (L coordError : ℝ) (u v : X)
    (hu : u ∈ S) (hv : v ∈ S)
    (hcoord : dist u v ≤ coordError)
    (hLip : ∀ x ∈ S, ∀ y ∈ S, dist (exit x) (exit y) ≤ L * dist x y)
    (hL : 0 ≤ L) :
    dist (exit u) (exit v) ≤ L * coordError := by
  exact (hLip u hu v hv).trans (mul_le_mul_of_nonneg_left hcoord hL)

/-- Complete abstract Fatou exit estimate `L * k * epsPsi`. -/
theorem fatou_gate_exit_error
    {Y : Type*} [PseudoMetricSpace Y] (S : Set X) (exit : X → Y)
    (L epsPsi : ℝ) (k : ℕ) (u v : X)
    (hL : 0 ≤ L) (hu : u ∈ S) (hv : v ∈ S)
    (hcoord : dist u v ≤ (k : ℝ) * epsPsi)
    (hLip : ∀ x ∈ S, ∀ y ∈ S, dist (exit x) (exit y) ≤ L * dist x y) :
    dist (exit u) (exit v) ≤ (k : ℝ) * L * epsPsi := by
  have h := exit_chart_error S exit L ((k : ℝ) * epsPsi) u v hu hv hcoord hLip hL
  calc
    dist (exit u) (exit v) ≤ L * ((k : ℝ) * epsPsi) := h
    _ = (k : ℝ) * L * epsPsi := by ring

end Metric

end Mandelbrot
