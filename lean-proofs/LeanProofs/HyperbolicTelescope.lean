/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MovingDisks
import Mathlib.Analysis.Complex.Schwarz
import Mathlib.Algebra.Order.BigOperators.Group.Finset
import Mathlib.Tactic.Linarith

/-!
# Schwarz contraction and moving-metric telescopes

There are two logically distinct ingredients in a hyperbolic runtime
certificate:

1. an analytic theorem saying that one exact step is nonexpansive in the
   metric attached to its input/output domains;
2. a discrete theorem accumulating the local approximation defects.

The centered analytic ingredient follows from Mathlib's Schwarz lemma and is
proved below.  The telescope is proved for an arbitrary moving metric; the
full two-point bridge is supplied by `SchwarzPick.lean` without changing this
runtime/error-accounting layer.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set

/-! ## Centered Schwarz lemma between moving disks -/

/-- Radial coordinate in a disk frame. -/
def DiskFrame.radial (d : DiskFrame) (z : ℂ) : ℝ :=
  dist z d.center / d.radius

/-- A holomorphic map which sends the center of one disk to the center of the
next contracts centered distances by the ratio of radii.  This is a genuine
analytic theorem, not an abstract Lipschitz assumption. -/
theorem DiskFrame.centered_schwarz
    (input output : DiskFrame) (f : ℂ → ℂ) (z : ℂ)
    (hdiff : DifferentiableOn ℂ f (ball input.center input.radius))
    (hcenter : f input.center = output.center)
    (hmaps : MapsTo f (ball input.center input.radius)
      (closedBall output.center output.radius))
    (hz : z ∈ ball input.center input.radius) :
    dist (f z) output.center ≤
      output.radius / input.radius * dist z input.center := by
  have hmaps' : MapsTo f (ball input.center input.radius)
      (closedBall (f input.center) output.radius) := by
    simpa only [hcenter] using hmaps
  have h := Complex.dist_le_div_mul_dist_of_mapsTo_ball hdiff hmaps' hz
  simpa only [hcenter] using h

/-- After normalization by the two radii, the centered radial coordinate is
nonincreasing. -/
theorem DiskFrame.radial_image_le
    (input output : DiskFrame) (f : ℂ → ℂ) (z : ℂ)
    (hOutput : 0 < output.radius)
    (hdiff : DifferentiableOn ℂ f (ball input.center input.radius))
    (hcenter : f input.center = output.center)
    (hmaps : MapsTo f (ball input.center input.radius)
      (closedBall output.center output.radius))
    (hz : z ∈ ball input.center input.radius) :
    output.radial (f z) ≤ input.radial z := by
  have h := input.centered_schwarz output f z hdiff hcenter hmaps hz
  unfold DiskFrame.radial
  apply (div_le_iff₀ hOutput).mpr
  have hInput : 0 < input.radius := nonempty_ball.mp ⟨z, hz⟩
  calc
    dist (f z) output.center ≤
        output.radius / input.radius * dist z input.center := h
    _ = (dist z input.center / input.radius) * output.radius := by
      field_simp

/-! ## Runtime formula for the disk pseudohyperbolic coordinate -/

/-- Pseudohyperbolic cross-ratio coordinate of two points in a Euclidean
disk.  `DiskFrame.schwarzPick` proves nonexpansiveness of this exact expression
for arbitrary point pairs. -/
def DiskFrame.pseudoDist (d : DiskFrame) (z w : ℂ) : ℝ :=
  ‖((d.radius : ℂ) * (z - w)) /
    (((d.radius ^ 2 : ℝ) : ℂ) -
      (starRingEnd ℂ) (w - d.center) * (z - d.center))‖

theorem DiskFrame.pseudoDist_nonneg (d : DiskFrame) (z w : ℂ) :
    0 ≤ d.pseudoDist z w := norm_nonneg _

@[simp] theorem DiskFrame.pseudoDist_self (d : DiskFrame) (z : ℂ) :
    d.pseudoDist z z = 0 := by
  simp [DiskFrame.pseudoDist]

/-- At the disk center, the pseudohyperbolic formula reduces exactly to the
radial coordinate used by the centered Schwarz theorem. -/
theorem DiskFrame.pseudoDist_center
    (d : DiskFrame) (z : ℂ) (hR : 0 < d.radius) :
    d.pseudoDist z d.center = d.radial z := by
  have hR0 : d.radius ≠ 0 := hR.ne'
  unfold DiskFrame.pseudoDist DiskFrame.radial
  simp only [sub_self, map_zero, zero_mul, sub_zero, norm_div, norm_mul,
    norm_real, Real.norm_eq_abs, abs_of_pos hR]
  rw [abs_pow, abs_of_pos hR]
  field_simp
  simp [dist_eq]

/-- Convert a local Euclidean model defect into a pseudohyperbolic defect on
the strict interior `|z-center|,|w-center|≤qR`.  The factor
`1/(R(1-q²))` is the runtime formula proposed in the research plan. -/
theorem DiskFrame.pseudoDist_le_of_interior
    (d : DiskFrame) (z w : ℂ) (q eps : ℝ)
    (hR : 0 < d.radius) (hq0 : 0 ≤ q) (hq1 : q < 1)
    (hz : ‖z - d.center‖ ≤ q * d.radius)
    (hw : ‖w - d.center‖ ≤ q * d.radius)
    (hdiff : ‖z - w‖ ≤ eps) :
    d.pseudoDist z w ≤ eps / (d.radius * (1 - q ^ 2)) := by
  let denominator : ℂ :=
    ((d.radius ^ 2 : ℝ) : ℂ) -
      (starRingEnd ℂ) (w - d.center) * (z - d.center)
  have hqR : 0 ≤ q * d.radius := mul_nonneg hq0 hR.le
  have hprod :
      ‖(starRingEnd ℂ) (w - d.center) * (z - d.center)‖ ≤
        (q * d.radius) ^ 2 := by
    rw [norm_mul, Complex.norm_conj]
    nlinarith [mul_le_mul hw hz (norm_nonneg (z - d.center)) hqR]
  have hreverse : d.radius ^ 2 -
      ‖(starRingEnd ℂ) (w - d.center) * (z - d.center)‖ ≤
        ‖denominator‖ := by
    have h := norm_sub_norm_le
      (((d.radius ^ 2 : ℝ) : ℂ))
      ((starRingEnd ℂ) (w - d.center) * (z - d.center))
    simpa [denominator, norm_real, abs_of_nonneg (sq_nonneg d.radius)] using h
  have hden : d.radius ^ 2 * (1 - q ^ 2) ≤ ‖denominator‖ := by
    nlinarith
  have hgap : 0 < d.radius ^ 2 * (1 - q ^ 2) := by
    have : 0 < 1 - q ^ 2 := by nlinarith
    positivity
  have heps : 0 ≤ eps := (norm_nonneg (z - w)).trans hdiff
  have hnum : ‖(d.radius : ℂ) * (z - w)‖ ≤ d.radius * eps := by
    rw [norm_mul, norm_real, Real.norm_eq_abs, abs_of_pos hR]
    exact mul_le_mul_of_nonneg_left hdiff hR.le
  unfold DiskFrame.pseudoDist
  change ‖(d.radius : ℂ) * (z - w) / denominator‖ ≤ _
  rw [norm_div]
  calc
    ‖(d.radius : ℂ) * (z - w)‖ / ‖denominator‖ ≤
        (d.radius * eps) / (d.radius ^ 2 * (1 - q ^ 2)) :=
      div_le_div₀ (mul_nonneg hR.le heps) hnum hgap hden
    _ = eps / (d.radius * (1 - q ^ 2)) := by
      field_simp

/-- Reverse conversion on the same strict interior.  It bounds the final
Euclidean separation directly from a pseudohyperbolic error budget. -/
theorem DiskFrame.norm_sub_le_of_pseudoDist_le
    (d : DiskFrame) (z w : ℂ) (q delta : ℝ)
    (hR : 0 < d.radius) (hq0 : 0 ≤ q) (hq1 : q < 1)
    (hz : ‖z - d.center‖ ≤ q * d.radius)
    (hw : ‖w - d.center‖ ≤ q * d.radius)
    (hpseudo : d.pseudoDist z w ≤ delta) :
    ‖z - w‖ ≤ d.radius * (1 + q ^ 2) * delta := by
  let denominator : ℂ :=
    ((d.radius ^ 2 : ℝ) : ℂ) -
      (starRingEnd ℂ) (w - d.center) * (z - d.center)
  have hqR : 0 ≤ q * d.radius := mul_nonneg hq0 hR.le
  have hprod :
      ‖(starRingEnd ℂ) (w - d.center) * (z - d.center)‖ ≤
        (q * d.radius) ^ 2 := by
    rw [norm_mul, Complex.norm_conj]
    nlinarith [mul_le_mul hw hz (norm_nonneg (z - d.center)) hqR]
  have hdenUpper : ‖denominator‖ ≤ d.radius ^ 2 * (1 + q ^ 2) := by
    calc
      ‖denominator‖ ≤ ‖((d.radius ^ 2 : ℝ) : ℂ)‖ +
          ‖(starRingEnd ℂ) (w - d.center) * (z - d.center)‖ :=
        norm_sub_le _ _
      _ ≤ d.radius ^ 2 + (q * d.radius) ^ 2 := by
        simpa [norm_real, abs_of_nonneg (sq_nonneg d.radius)] using
          add_le_add_left hprod (d.radius ^ 2)
      _ = d.radius ^ 2 * (1 + q ^ 2) := by ring
  have hdenLower : 0 < ‖denominator‖ := by
    have hreverse : d.radius ^ 2 -
        ‖(starRingEnd ℂ) (w - d.center) * (z - d.center)‖ ≤
          ‖denominator‖ := by
      have h := norm_sub_norm_le
        (((d.radius ^ 2 : ℝ) : ℂ))
        ((starRingEnd ℂ) (w - d.center) * (z - d.center))
      simpa [denominator, norm_real, abs_of_nonneg (sq_nonneg d.radius)] using h
    have hgap : 0 < d.radius ^ 2 - (q * d.radius) ^ 2 := by
      calc
        d.radius ^ 2 - (q * d.radius) ^ 2 =
            d.radius ^ 2 * (1 - q ^ 2) := by ring
        _ > 0 := mul_pos (sq_pos_of_pos hR) (by nlinarith)
    linarith
  have hdelta : 0 ≤ delta :=
    (d.pseudoDist_nonneg z w).trans hpseudo
  have hpseudo' :
      (d.radius * ‖z - w‖) / ‖denominator‖ ≤ delta := by
    simpa [DiskFrame.pseudoDist, denominator, norm_div, norm_mul,
      norm_real, Real.norm_eq_abs, abs_of_pos hR] using hpseudo
  have hmul : d.radius * ‖z - w‖ ≤ delta * ‖denominator‖ :=
    (div_le_iff₀ hdenLower).mp hpseudo'
  have hupper : delta * ‖denominator‖ ≤
      delta * (d.radius ^ 2 * (1 + q ^ 2)) :=
    mul_le_mul_of_nonneg_left hdenUpper hdelta
  have hRnonzero : d.radius ≠ 0 := hR.ne'
  calc
    ‖z - w‖ = (d.radius * ‖z - w‖) / d.radius := by
      field_simp
    _ ≤ (delta * (d.radius ^ 2 * (1 + q ^ 2))) / d.radius :=
      div_le_div_of_nonneg_right (hmul.trans hupper) hR.le
    _ = d.radius * (1 + q ^ 2) * delta := by
      field_simp

/-! ## Defect telescope for an arbitrary moving metric -/

/-- Minimal data needed from a metric at one runtime level.  Symmetry and
separation are irrelevant to the error telescope, so only the triangle law is
stored. -/
structure RuntimeMetric (X : Type*) where
  distance : X → X → ℝ
  triangle : ∀ x y z, distance x z ≤ distance x y + distance y z

/-- One transition is nonexpansive between two possibly different runtime
metrics.  This is the interface implemented by Schwarz--Pick. -/
def RuntimeMetric.NonexpansiveStep {X : Type*}
    (input output : RuntimeMetric X) (f : X → X) : Prop :=
  ∀ x y, output.distance (f x) (f y) ≤ input.distance x y

/-- A local model defect plus a nonexpansive exact step gives the one-step
error recurrence in the next metric. -/
theorem RuntimeMetric.defect_step
    {X : Type*} (input output : RuntimeMetric X) (f : X → X)
    (exact approx nextApprox : X) (eps : ℝ)
    (hnonexp : input.NonexpansiveStep output f)
    (hdefect : output.distance nextApprox (f approx) ≤ eps) :
    output.distance nextApprox (f exact) ≤
      eps + input.distance approx exact := by
  calc
    output.distance nextApprox (f exact) ≤
        output.distance nextApprox (f approx) +
          output.distance (f approx) (f exact) :=
      output.triangle nextApprox (f approx) (f exact)
    _ ≤ eps + input.distance approx exact :=
      add_le_add hdefect (hnonexp approx exact)

/-- Variable-defect telescope in a sequence of moving metrics.  In
particular, a proof in the disk hyperbolic metric accumulates local Padé/jet
defects additively instead of multiplying Euclidean derivative majorants. -/
theorem RuntimeMetric.moving_error_telescope
    {X : Type*} (metric : ℕ → RuntimeMetric X) (step : ℕ → X → X)
    (exact approx : ℕ → X) (eps : ℕ → ℝ) (initialError : ℝ)
    (hexact : ∀ n, exact (n + 1) = step n (exact n))
    (hdefect : ∀ n,
      (metric (n + 1)).distance (approx (n + 1)) (step n (approx n)) ≤ eps n)
    (hnonexp : ∀ n, (metric n).NonexpansiveStep (metric (n + 1)) (step n))
    (hinitial : (metric 0).distance (approx 0) (exact 0) ≤ initialError) :
    ∀ n, (metric n).distance (approx n) (exact n) ≤
      initialError + ∑ k ∈ Finset.range n, eps k := by
  intro n
  induction n with
  | zero => simpa using hinitial
  | succ n ih =>
      rw [hexact n]
      have hstep := RuntimeMetric.defect_step
        (metric n) (metric (n + 1)) (step n)
        (exact n) (approx n) (approx (n + 1)) (eps n)
        (hnonexp n) (hdefect n)
      rw [Finset.sum_range_succ]
      linarith

/-- Zero initial error gives the runtime form most often used by a certified
jump sequence. -/
theorem RuntimeMetric.moving_error_telescope_zero
    {X : Type*} (metric : ℕ → RuntimeMetric X) (step : ℕ → X → X)
    (exact approx : ℕ → X) (eps : ℕ → ℝ)
    (hexact : ∀ n, exact (n + 1) = step n (exact n))
    (hdefect : ∀ n,
      (metric (n + 1)).distance (approx (n + 1)) (step n (approx n)) ≤ eps n)
    (hnonexp : ∀ n, (metric n).NonexpansiveStep (metric (n + 1)) (step n))
    (hstart : approx 0 = exact 0)
    (hrefl : ∀ n x, (metric n).distance x x = 0) :
    ∀ n, (metric n).distance (approx n) (exact n) ≤
      ∑ k ∈ Finset.range n, eps k := by
  intro n
  have h := RuntimeMetric.moving_error_telescope metric step exact approx eps 0
    hexact hdefect hnonexp (by simp [hstart, hrefl]) n
  simpa using h

end

end Mandelbrot
