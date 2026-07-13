/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Jets
import LeanProofs.CauchyDerivatives
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
# Certified analytic propagation from one pixel to a tile

This file formalizes the exact-arithmetic core of a tile-local series
approximation.  A seed pixel carries a quadratic Taylor model in the parameter
offset.  The new results give:

* the third- and fourth-sensitivity recurrences;
* the exact recurrence of the quadratic Taylor remainder;
* a scalar recurrence bounding that remainder on a disk;
* a rectangular-tile-to-disk inclusion test;
* sufficient upper and lower tests for a common first escape;
* transport of the injected checkpoint error through the ordinary
  perturbation recurrence.

The quadratic coefficient `q` below is half the second derivative: a runtime
state `(z, z', z'')` is represented by `taylor2 z z' (z''/2)`.
-/

namespace Mandelbrot

noncomputable section

section Algebra

variable {R : Type*} [CommRing R]

/-- Quadratic Taylor model.  `q` is the coefficient of `h²`, hence half the
second derivative under the analytic interpretation. -/
def taylor2 (z u q h : R) : R := z + u * h + q * h ^ 2

/-- Exact recurrence of the third sensitivity for
`z ↦ a*z + z² + c`. -/
theorem thirdSensitivity_step (a z u v w : R) :
    a * w + 2 * (z * w + 3 * u * v) =
      (a + 2 * z) * w + 6 * u * v := by
  ring

/-- Exact recurrence of the fourth sensitivity for
`z ↦ a*z + z² + c`. -/
theorem fourthSensitivity_step (a z u v w fourth : R) :
    a * fourth + 2 * (z * fourth + 4 * u * w + 3 * v ^ 2) =
      (a + 2 * z) * fourth + 8 * u * w + 6 * v ^ 2 := by
  ring

/-- Exact update of the first derivative and the quadratic Taylor
coefficient. -/
theorem taylor2_sensitivity_step (a z u q : R) :
    ((a + 2 * z) * u + 1, (a + 2 * z) * q + u ^ 2) =
      (a * u + 2 * z * u + 1,
        a * q + 2 * z * q + u ^ 2) := by
  apply Prod.ext <;> ring

/-- Exact recurrence of the remainder of a quadratic Taylor model.

If the current true state is `T+rem`, where `T=taylor2 z u q h`, the next
true state minus the updated quadratic Taylor model is

`(a+2T)rem + rem² + 2*u*q*h³ + q²*h⁴`.
-/
theorem quadraticStep_taylor2_remainder
    (a z c u q h rem : R) :
    quadraticStep a (taylor2 z u q h + rem) (c + h) -
        taylor2 (quadraticStep a z c)
          ((a + 2 * z) * u + 1) ((a + 2 * z) * q + u ^ 2) h =
      (a + 2 * taylor2 z u q h) * rem + rem ^ 2 +
        2 * u * q * h ^ 3 + q ^ 2 * h ^ 4 := by
  simp only [quadraticStep, taylor2]
  ring

end Algebra

section ComplexBounds

open Complex Metric Set

/-- Uniform norm bound of a quadratic Taylor model on `|h|≤r`. -/
def taylor2Radius (z u q : ℂ) (r : ℝ) : ℝ :=
  ‖z‖ + ‖u‖ * r + ‖q‖ * r ^ 2

/-- Uniform norm bound of the nonconstant part of a quadratic Taylor model. -/
def taylor2VariationRadius (u q : ℂ) (r : ℝ) : ℝ :=
  ‖u‖ * r + ‖q‖ * r ^ 2

theorem norm_taylor2_le
    (z u q h : ℂ) (r : ℝ) (_hr : 0 ≤ r) (hh : ‖h‖ ≤ r) :
    ‖taylor2 z u q h‖ ≤ taylor2Radius z u q r := by
  have hh2 : ‖h‖ ^ 2 ≤ r ^ 2 := by
    simpa only [pow_two] using mul_self_le_mul_self (norm_nonneg h) hh
  calc
    ‖taylor2 z u q h‖ ≤ ‖z‖ + ‖u * h‖ + ‖q * h ^ 2‖ := by
      unfold taylor2
      exact (norm_add_le _ _).trans
        (add_le_add (norm_add_le _ _) le_rfl)
    _ = ‖z‖ + ‖u‖ * ‖h‖ + ‖q‖ * ‖h‖ ^ 2 := by
      rw [norm_mul, norm_mul, norm_pow]
    _ ≤ ‖z‖ + ‖u‖ * r + ‖q‖ * r ^ 2 := by
      have hu := mul_le_mul_of_nonneg_left hh (norm_nonneg u)
      have hq := mul_le_mul_of_nonneg_left hh2 (norm_nonneg q)
      linarith
    _ = taylor2Radius z u q r := rfl

theorem norm_taylor2_sub_center_le
    (z u q h : ℂ) (r : ℝ) (_hr : 0 ≤ r) (hh : ‖h‖ ≤ r) :
    ‖taylor2 z u q h - z‖ ≤ taylor2VariationRadius u q r := by
  have hh2 : ‖h‖ ^ 2 ≤ r ^ 2 := by
    simpa only [pow_two] using mul_self_le_mul_self (norm_nonneg h) hh
  calc
    ‖taylor2 z u q h - z‖ = ‖u * h + q * h ^ 2‖ := by
      congr 1
      simp only [taylor2]
      ring
    _ ≤ ‖u * h‖ + ‖q * h ^ 2‖ := norm_add_le _ _
    _ = ‖u‖ * ‖h‖ + ‖q‖ * ‖h‖ ^ 2 := by
      rw [norm_mul, norm_mul, norm_pow]
    _ ≤ ‖u‖ * r + ‖q‖ * r ^ 2 := by
      have hu := mul_le_mul_of_nonneg_left hh (norm_nonneg u)
      have hq := mul_le_mul_of_nonneg_left hh2 (norm_nonneg q)
      linarith
    _ = taylor2VariationRadius u q r := rfl

/-- Builder-computable next-step bound for the quadratic Taylor remainder. -/
def taylor2RemainderNextBound
    (a z u q : ℂ) (r E : ℝ) : ℝ :=
  (‖a‖ + 2 * taylor2Radius z u q r) * E + E ^ 2 +
    2 * ‖u‖ * ‖q‖ * r ^ 3 + ‖q‖ ^ 2 * r ^ 4

/-- Sound scalar recurrence for the exact quadratic Taylor remainder. -/
theorem norm_quadraticStep_taylor2_remainder_le
    (a z c u q h rem : ℂ) (r E : ℝ)
    (hr : 0 ≤ r) (_hE : 0 ≤ E) (hh : ‖h‖ ≤ r) (hrem : ‖rem‖ ≤ E) :
    ‖quadraticStep a (taylor2 z u q h + rem) (c + h) -
        taylor2 (quadraticStep a z c)
          ((a + 2 * z) * u + 1) ((a + 2 * z) * q + u ^ 2) h‖ ≤
      taylor2RemainderNextBound a z u q r E := by
  rw [quadraticStep_taylor2_remainder]
  have hT := norm_taylor2_le z u q h r hr hh
  have hcoef : ‖a + 2 * taylor2 z u q h‖ ≤
      ‖a‖ + 2 * taylor2Radius z u q r := by
    calc
      ‖a + 2 * taylor2 z u q h‖ ≤ ‖a‖ + ‖(2 : ℂ) * taylor2 z u q h‖ :=
        norm_add_le _ _
      _ = ‖a‖ + 2 * ‖taylor2 z u q h‖ := by norm_num [norm_mul]
      _ ≤ ‖a‖ + 2 * taylor2Radius z u q r := by linarith
  have hRadius : 0 ≤ taylor2Radius z u q r := by
    unfold taylor2Radius
    positivity
  have hfactor : 0 ≤ ‖a‖ + 2 * taylor2Radius z u q r :=
    add_nonneg (norm_nonneg a) (mul_nonneg (by norm_num) hRadius)
  have hmain : ‖(a + 2 * taylor2 z u q h) * rem‖ ≤
      (‖a‖ + 2 * taylor2Radius z u q r) * E := by
    rw [norm_mul]
    exact mul_le_mul hcoef hrem (norm_nonneg rem) hfactor
  have hsq : ‖rem ^ 2‖ ≤ E ^ 2 := by
    rw [norm_pow]
    simpa only [pow_two] using mul_self_le_mul_self (norm_nonneg rem) hrem
  have hcubic : ‖(2 : ℂ) * u * q * h ^ 3‖ ≤
      2 * ‖u‖ * ‖q‖ * r ^ 3 := by
    simp only [norm_mul, norm_pow, norm_ofNat]
    gcongr
  have hquartic : ‖q ^ 2 * h ^ 4‖ ≤ ‖q‖ ^ 2 * r ^ 4 := by
    simp only [norm_mul, norm_pow]
    gcongr
  calc
    ‖(a + 2 * taylor2 z u q h) * rem + rem ^ 2 +
        2 * u * q * h ^ 3 + q ^ 2 * h ^ 4‖ ≤
        ‖(a + 2 * taylor2 z u q h) * rem‖ + ‖rem ^ 2‖ +
          ‖2 * u * q * h ^ 3‖ + ‖q ^ 2 * h ^ 4‖ := by
      exact (norm_add_le _ _).trans
        (add_le_add
          ((norm_add_le _ _).trans (add_le_add (norm_add_le _ _) le_rfl))
          le_rfl)
    _ ≤ (‖a‖ + 2 * taylor2Radius z u q r) * E + E ^ 2 +
        2 * ‖u‖ * ‖q‖ * r ^ 3 + ‖q‖ ^ 2 * r ^ 4 := by
      linarith
    _ = taylor2RemainderNextBound a z u q r E := rfl

/-- End-to-end checkpoint certificate.  If the centre, first coefficient,
quadratic coefficient, true neighboring states, and scalar remainder bound all
follow their displayed recurrences, then every parameter offset in `|h|≤r`
is enclosed at every iteration. -/
theorem taylor2_orbit_remainder_bound
    (a z u q : ℕ → ℂ) (state : ℕ → ℂ → ℂ)
    (c : ℂ) (r : ℝ) (E : ℕ → ℝ)
    (hr : 0 ≤ r) (hE : ∀ n, 0 ≤ E n)
    (hinit : ∀ h, ‖h‖ ≤ r →
      ‖state 0 h - taylor2 (z 0) (u 0) (q 0) h‖ ≤ E 0)
    (hz : ∀ n, z (n + 1) = quadraticStep (a n) (z n) c)
    (hu : ∀ n, u (n + 1) = (a n + 2 * z n) * u n + 1)
    (hq : ∀ n, q (n + 1) = (a n + 2 * z n) * q n + (u n) ^ 2)
    (hstate : ∀ n h,
      state (n + 1) h = quadraticStep (a n) (state n h) (c + h))
    (hnext : ∀ n,
      taylor2RemainderNextBound (a n) (z n) (u n) (q n) r (E n) ≤ E (n + 1)) :
    ∀ n h, ‖h‖ ≤ r →
      ‖state n h - taylor2 (z n) (u n) (q n) h‖ ≤ E n := by
  intro n
  induction n with
  | zero => exact hinit
  | succ n ih =>
      intro h hh
      let rem := state n h - taylor2 (z n) (u n) (q n) h
      have hrem : ‖rem‖ ≤ E n := ih h hh
      have hrepr : state n h = taylor2 (z n) (u n) (q n) h + rem := by
        dsimp [rem]
        ring
      rw [hstate n h, hz n, hu n, hq n, hrepr]
      exact (norm_quadraticStep_taylor2_remainder_le
        (a n) (z n) c (u n) (q n) h rem r (E n)
        hr (hE n) hh hrem).trans (hnext n)

/-- Exact geometric closed form behind the Cauchy remainder after retaining
degrees `0..K`. -/
theorem hasSum_geometric_taylor_tail
    (M theta : ℝ) (K : ℕ) (htheta : |theta| < 1) :
    HasSum (fun j : ℕ => M * theta ^ (K + 1 + j))
      (M * theta ^ (K + 1) / (1 - theta)) := by
  have hgeom : HasSum (fun j : ℕ => theta ^ j) (1 / (1 - theta)) := by
    simpa [div_eq_mul_inv, Real.norm_eq_abs] using
      (hasSum_geometric_of_norm_lt_one (ξ := theta)
        (by simpa [Real.norm_eq_abs] using htheta))
  have hscaled : HasSum
      (fun j : ℕ => (M * theta ^ (K + 1)) * theta ^ j)
      ((M * theta ^ (K + 1)) * (1 / (1 - theta))) :=
    hgeom.mul_left (M * theta ^ (K + 1))
  simpa only [pow_add, div_eq_mul_inv, mul_assoc, one_mul] using hscaled

/-- A nonnegative Taylor tail dominated coefficientwise by the Cauchy
geometric majorant is bounded by `M*theta^(K+1)/(1-theta)`. -/
theorem taylor_tail_le_geometric
    (slice : ℕ → ℝ) (M theta : ℝ) (K : ℕ)
    (hM : 0 ≤ M) (htheta0 : 0 ≤ theta) (htheta : theta < 1)
    (hslice0 : ∀ j, 0 ≤ slice j)
    (hslice : ∀ j, slice j ≤ M * theta ^ (K + 1 + j)) :
    (∑' j : ℕ, slice j) ≤ M * theta ^ (K + 1) / (1 - theta) := by
  have habs : |theta| < 1 := by simpa [abs_of_nonneg htheta0] using htheta
  have hmajor := hasSum_geometric_taylor_tail M theta K habs
  have hmajor0 : ∀ j : ℕ, 0 ≤ M * theta ^ (K + 1 + j) := by
    intro j
    positivity
  have hsmall : Summable slice :=
    Summable.of_nonneg_of_le hslice0 hslice hmajor.summable
  exact (hsmall.tsum_le_tsum hslice hmajor.summable).trans_eq hmajor.tsum_eq

/-- Cauchy converts an outer-disk value bound for the concrete Taylor
remainder into a first-derivative error bound on the inner disk. -/
theorem taylor2Remainder_deriv_le_on_inner_disk
    (f : ℂ → ℂ) (z u q h : ℂ) (Rinner Router M : ℝ)
    (hR : Rinner < Router) (hh : h ∈ closedBall 0 Rinner)
    (hd : DifferentiableOn ℂ
      (fun w => f w - taylor2 z u q w) (closedBall 0 Router))
    (hM : ∀ w ∈ closedBall 0 Router,
      ‖f w - taylor2 z u q w‖ ≤ M) :
    ‖deriv (fun w => f w - taylor2 z u q w) h‖ ≤
      M / (Router - Rinner) := by
  exact norm_deriv_le_on_inner_disk
    (fun w => f w - taylor2 z u q w) 0 h Rinner Router M hR hh hd hM

/-- The corresponding second-derivative error bound. -/
theorem taylor2Remainder_secondDeriv_le_on_inner_disk
    (f : ℂ → ℂ) (z u q h : ℂ) (Rinner Router M : ℝ)
    (hR : Rinner < Router) (hh : h ∈ closedBall 0 Rinner)
    (hd : DifferentiableOn ℂ
      (fun w => f w - taylor2 z u q w) (closedBall 0 Router))
    (hM : ∀ w ∈ closedBall 0 Router,
      ‖f w - taylor2 z u q w‖ ≤ M) :
    ‖iteratedDeriv 2 (fun w => f w - taylor2 z u q w) h‖ ≤
      2 * M / (Router - Rinner) ^ 2 := by
  exact norm_secondDeriv_le_on_inner_disk
    (fun w => f w - taylor2 z u q w) 0 h Rinner Router M hR hh hd hM

end ComplexBounds

section TileGeometry

open Complex Metric Set

/-- Safe radius of a rectangular tile with half-widths `rx,ry` in pixel
coordinates and complex pixel basis vectors `px,py`. -/
def rectangularTileRadius (px py : ℂ) (rx ry : ℝ) : ℝ :=
  rx * ‖px‖ + ry * ‖py‖

theorem rectangular_tile_offset_norm_le
    (px py : ℂ) (x y rx ry : ℝ)
    (hx : |x| ≤ rx) (hy : |y| ≤ ry) :
    ‖(x : ℂ) * px + (y : ℂ) * py‖ ≤ rectangularTileRadius px py rx ry := by
  calc
    ‖(x : ℂ) * px + (y : ℂ) * py‖ ≤
        ‖(x : ℂ) * px‖ + ‖(y : ℂ) * py‖ := norm_add_le _ _
    _ = |x| * ‖px‖ + |y| * ‖py‖ := by
      simp only [norm_mul, norm_real, Real.norm_eq_abs]
    _ ≤ rx * ‖px‖ + ry * ‖py‖ := by
      exact add_le_add
        (mul_le_mul_of_nonneg_right hx (norm_nonneg px))
        (mul_le_mul_of_nonneg_right hy (norm_nonneg py))
    _ = rectangularTileRadius px py rx ry := rfl

/-- If the rectangular radius is below a certified disk radius, every tile
offset lies in that disk. -/
theorem rectangular_tile_mem_closedBall
    (px py : ℂ) (x y rx ry r : ℝ)
    (hx : |x| ≤ rx) (hy : |y| ≤ ry)
    (hfit : rectangularTileRadius px py rx ry ≤ r) :
    (x : ℂ) * px + (y : ℂ) * py ∈ closedBall 0 r := by
  apply mem_closedBall.mpr
  simpa [dist_eq] using
    (rectangular_tile_offset_norm_le px py x y rx ry hx hy).trans hfit

end TileGeometry

section Escape

open Complex

/-- Upper enclosure of a state represented by a quadratic Taylor model plus
a certified remainder. -/
def taylor2StateUpper (z u q : ℂ) (r E : ℝ) : ℝ :=
  taylor2Radius z u q r + E

theorem norm_state_le_taylor2StateUpper
    (state : ℂ → ℂ) (z u q h : ℂ) (r E : ℝ)
    (hr : 0 ≤ r) (hh : ‖h‖ ≤ r)
    (herror : ‖state h - taylor2 z u q h‖ ≤ E) :
    ‖state h‖ ≤ taylor2StateUpper z u q r E := by
  calc
    ‖state h‖ = ‖taylor2 z u q h + (state h - taylor2 z u q h)‖ := by
      congr 1
      ring
    _ ≤ ‖taylor2 z u q h‖ + ‖state h - taylor2 z u q h‖ := norm_add_le _ _
    _ ≤ taylor2Radius z u q r + E :=
      add_le_add (norm_taylor2_le z u q h r hr hh) herror
    _ = taylor2StateUpper z u q r E := rfl

/-- Reverse enclosure: a sufficiently large centre norm forces every state in
the certified Taylor disk outside the bailout radius. -/
theorem bailout_lt_norm_state_of_taylor2
    (state : ℂ → ℂ) (z u q h : ℂ) (r E bailout : ℝ)
    (hr : 0 ≤ r) (hh : ‖h‖ ≤ r)
    (herror : ‖state h - taylor2 z u q h‖ ≤ E)
    (hescape : bailout + taylor2VariationRadius u q r + E < ‖z‖) :
    bailout < ‖state h‖ := by
  have hvariation := norm_taylor2_sub_center_le z u q h r hr hh
  have hstateCenter : ‖state h - z‖ ≤ taylor2VariationRadius u q r + E := by
    calc
      ‖state h - z‖ =
          ‖(state h - taylor2 z u q h) + (taylor2 z u q h - z)‖ := by
        congr 1
        ring
      _ ≤ ‖state h - taylor2 z u q h‖ + ‖taylor2 z u q h - z‖ :=
        norm_add_le _ _
      _ ≤ E + taylor2VariationRadius u q r := add_le_add herror hvariation
      _ = taylor2VariationRadius u q r + E := add_comm _ _
  have hz : ‖z‖ ≤ ‖state h‖ + ‖state h - z‖ := by
    calc
      ‖z‖ = ‖state h - (state h - z)‖ := by congr 1; ring
      _ ≤ ‖state h‖ + ‖state h - z‖ := norm_sub_le _ _
  linarith

/-- A whole tile has no escape before `n`, and every pixel escapes at `n`,
when the corresponding uniform upper and lower tests hold. -/
theorem tile_same_first_escape
    (state : ℕ → ℂ → ℂ) (z u q : ℕ → ℂ) (E : ℕ → ℝ)
    (r bailout : ℝ) (n : ℕ)
    (hr : 0 ≤ r)
    (herror : ∀ j h, ‖h‖ ≤ r →
      ‖state j h - taylor2 (z j) (u j) (q j) h‖ ≤ E j)
    (hbefore : ∀ j, j < n → taylor2StateUpper (z j) (u j) (q j) r (E j) ≤ bailout)
    (hat : bailout + taylor2VariationRadius (u n) (q n) r + E n < ‖z n‖) :
    (∀ j, j < n → ∀ h, ‖h‖ ≤ r → ‖state j h‖ ≤ bailout) ∧
      (∀ h, ‖h‖ ≤ r → bailout < ‖state n h‖) := by
  constructor
  · intro j hj h hh
    exact (norm_state_le_taylor2StateUpper
      (state j) (z j) (u j) (q j) h r (E j) hr hh (herror j h hh)).trans
        (hbefore j hj)
  · intro h hh
    exact bailout_lt_norm_state_of_taylor2
      (state n) (z n) (u n) (q n) h r (E n) bailout hr hh
      (herror n h hh) hat

end Escape

section Checkpoint

open Complex

/-- Transport of an injected checkpoint error through one ordinary
perturbation step, with an additional local model error `eta`. -/
theorem checkpoint_error_step
    (a exactState injectedState c approxNext : ℂ) (rho e eta : ℝ)
    (_hrho : 0 ≤ rho) (he : 0 ≤ e)
    (hexact : ‖exactState‖ ≤ rho)
    (hinjected : ‖injectedState - exactState‖ ≤ e)
    (hmodel : ‖approxNext - exactStep a injectedState c‖ ≤ eta) :
    ‖approxNext - exactStep a exactState c‖ ≤
      eta + e * (‖a‖ + 2 * rho + e) := by
  have hinjectedNorm : ‖injectedState‖ ≤ rho + e := by
    calc
      ‖injectedState‖ = ‖exactState + (injectedState - exactState)‖ := by
        congr 1
        ring
      _ ≤ ‖exactState‖ + ‖injectedState - exactState‖ := norm_add_le _ _
      _ ≤ rho + e := add_le_add hexact hinjected
  have hcoef : ‖a + exactState + injectedState‖ ≤ ‖a‖ + 2 * rho + e := by
    calc
      ‖a + exactState + injectedState‖ ≤ ‖a‖ + ‖exactState‖ + ‖injectedState‖ := by
        exact (norm_add_le _ _).trans (add_le_add (norm_add_le _ _) le_rfl)
      _ ≤ ‖a‖ + rho + (rho + e) := by
        linarith
      _ = ‖a‖ + 2 * rho + e := by ring
  have htransport :
      ‖exactStep a injectedState c - exactStep a exactState c‖ ≤
        e * (‖a‖ + 2 * rho + e) := by
    rw [exactStep_transport_norm]
    exact mul_le_mul hinjected hcoef (norm_nonneg _) he
  calc
    ‖approxNext - exactStep a exactState c‖ =
        ‖(approxNext - exactStep a injectedState c) +
          (exactStep a injectedState c - exactStep a exactState c)‖ := by
      congr 1
      ring
    _ ≤ ‖approxNext - exactStep a injectedState c‖ +
        ‖exactStep a injectedState c - exactStep a exactState c‖ := norm_add_le _ _
    _ ≤ eta + e * (‖a‖ + 2 * rho + e) := add_le_add hmodel htransport

end Checkpoint

end

end Mandelbrot
