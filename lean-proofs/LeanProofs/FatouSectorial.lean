/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Fatou
import LeanProofs.Dynamics
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.Calculus.SmoothSeries
import Mathlib.Analysis.Complex.CauchyIntegral
import Mathlib.Analysis.Complex.BranchLogRoot
import Mathlib.Analysis.Normed.Group.InfiniteSum
import Mathlib.Analysis.SpecialFunctions.Complex.LogDeriv
import Mathlib.Topology.Algebra.InfiniteSum.NatInt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Certified sectorial Fatou coordinates

This file closes the exact-arithmetic core used by the experimental Fatou
gate.  It deliberately separates three objects which must not be conflated:

* exact Fatou coordinates of the one- and two-petal model vector fields;
* the finite sum of logarithms used by the partial-fraction flow model;
* the exact Abel coordinate obtained by summably correcting the residual of a
  discrete return map.

It also proves the runtime branch guard: a hop shorter than its distance to
every pole keeps each logarithmic ratio in the principal slit plane.  Finally,
a derivative bound on the inverse chart yields the concrete Lipschitz factor
needed by the exit-error theorem.
-/

namespace Mandelbrot

noncomputable section

/-! ## Exact confluent model coordinates -/

section AlgebraicModels

variable {K : Type*} [Field K]

/-- Time-`t` flow of `u' = a u²`. -/
def simpleParabolicFlow (a t u : K) : K := u / (1 - a * t * u)

/-- Exact one-petal Fatou coordinate of `u' = a u²`. -/
def simpleFatouCoordinate (a u : K) : K := -1 / (a * u)

theorem simpleFatouCoordinate_translate
    (a t u : K) (ha : a ≠ 0) (hu : u ≠ 0) :
    simpleFatouCoordinate a (simpleParabolicFlow a t u) =
      simpleFatouCoordinate a u + t := by
  simp only [simpleFatouCoordinate, simpleParabolicFlow]
  field_simp [ha, hu]
  ring

/-- Exact two-petal Fatou coordinate of `u' = a u³`.  Its inverse has two
branches, corresponding to the two petals. -/
def doublePetalFatouCoordinate (a u : K) : K := -1 / (2 * a * u ^ 2)

/-- The squared flow relation is enough to prove translation, independently
of the chosen square-root branch used to reconstruct the exit petal. -/
theorem doublePetalFatouCoordinate_translate
    [CharZero K]
    (a t u v : K) (ha : a ≠ 0) (hu : u ≠ 0)
    (hflow : v ^ 2 = u ^ 2 / (1 - 2 * a * t * u ^ 2)) :
    doublePetalFatouCoordinate a v = doublePetalFatouCoordinate a u + t := by
  simp only [doublePetalFatouCoordinate]
  rw [hflow]
  field_simp [ha, hu]
  ring

/-- Partial fractions of the simplest split vector field
`P(u)=u(κ+a u)`.  The two residues are `1/κ` and `-1/κ`; as `κ→0` the roots
coalesce and the logarithmic chart must be replaced by the polar coordinate
`simpleFatouCoordinate`. -/
theorem twoRootVectorField_partial_fraction
    (kappa a u : K) (hk : kappa ≠ 0) (ha : a ≠ 0)
    (hu : u ≠ 0) (hfar : u + kappa / a ≠ 0) :
    (1 / kappa) / u + (-1 / kappa) / (u + kappa / a) =
      1 / (u * (kappa + a * u)) := by
  have hfar' : u * a + kappa ≠ 0 := by
    have hid : u * a + kappa = a * (u + kappa / a) := by
      field_simp [ha]
    rw [hid]
    exact mul_ne_zero ha hfar
  have hform : u + kappa / a = (u * a + kappa) / a := by
    field_simp [ha]
  rw [hform]
  field_simp [hk, ha, hu, hfar']
  rw [add_comm kappa (u * a)]
  field_simp [hfar']
  ring

end AlgebraicModels

/-! ## Principal-log flow coordinate and branch guard -/

section FlowCoordinate

open Complex Metric Set

variable {ι : Type*}

/-- Principal-branch increment of the partial-fraction flow coordinate.
This is the exact mathematical counterpart of `psi_step_residual` in Rust. -/
def flowFatouIncrement (s : Finset ι) (root rho : ι → ℂ) (u v : ℂ) : ℂ :=
  ∑ i ∈ s, rho i * Complex.log ((v - root i) / (u - root i))

@[simp] theorem flowFatouIncrement_self
    (s : Finset ι) (root rho : ι → ℂ) (u : ℂ) :
    flowFatouIncrement s root rho u u = 0 := by
  simp [flowFatouIncrement]

/-- The open unit disk around `1` is contained in the principal logarithm's
slit plane. -/
theorem ratio_mem_slitPlane_of_norm_sub_one_lt_one
    (w : ℂ) (hw : ‖w - 1‖ < 1) : w ∈ Complex.slitPlane := by
  apply Complex.ball_one_subset_slitPlane
  simpa [mem_ball, dist_eq] using hw

/-- Runtime branch guard.  A hop strictly shorter than the distance to a pole
makes the corresponding ratio stay in the unit disk around `1`, hence no
principal-log cut can be crossed.  The runtime factor `0.2` leaves a factor-5
margin inside this theorem's sharp threshold `1`. -/
theorem flowRatio_mem_slitPlane_of_step_lt_poleDistance
    (u v r : ℂ) (hur : u - r ≠ 0) (hstep : ‖v - u‖ < ‖u - r‖) :
    (v - r) / (u - r) ∈ Complex.slitPlane := by
  apply ratio_mem_slitPlane_of_norm_sub_one_lt_one
  have hid : (v - r) / (u - r) - 1 = (v - u) / (u - r) := by
    field_simp [hur]
    ring
  rw [hid, norm_div]
  exact (div_lt_one (norm_pos_iff.mpr hur)).mpr hstep

/-- Derivative in the arrival endpoint of the principal-log increment. -/
theorem hasDerivAt_flowFatouIncrement_right
    (s : Finset ι) (root rho : ι → ℂ) (u v : ℂ)
    (hbase : ∀ i ∈ s, u - root i ≠ 0)
    (hslit : ∀ i ∈ s, (v - root i) / (u - root i) ∈ Complex.slitPlane) :
    HasDerivAt (fun w => flowFatouIncrement s root rho u w)
      (∑ i ∈ s, rho i / (v - root i)) v := by
  unfold flowFatouIncrement
  apply HasDerivAt.fun_sum
  intro i hi
  have hlin : HasDerivAt (fun w : ℂ => (w - root i) / (u - root i))
      (1 / (u - root i)) v := by
    simpa using ((hasDerivAt_id v).sub_const (root i)).div_const (u - root i)
  have harr : v - root i ≠ 0 := by
    intro hv
    have : (v - root i) / (u - root i) = 0 := by simp [hv]
    have hs := hslit i hi
    rw [this] at hs
    exact Complex.zero_notMem_slitPlane hs
  have hlog := hlin.clog (hslit i hi)
  have hterm := hlog.const_mul (rho i)
  have hcoef :
      rho i * ((1 / (u - root i)) /
        ((v - root i) / (u - root i))) = rho i / (v - root i) := by
    field_simp [hbase i hi, harr]
  rw [hcoef] at hterm
  simpa using hterm

/-- Exact unit translation along any analytic flow trajectory for which the
partial-fraction identity and principal-branch guards hold throughout a
connected complex time domain. -/
theorem flowFatouIncrement_eq_time
    (s : Finset ι) (root rho : ι → ℂ) (P flow : ℂ → ℂ)
    (T : Set ℂ) (t0 : ℂ)
    (hTopen : IsOpen T) (hTpre : IsPreconnected T) (ht0 : t0 ∈ T)
    (hbase : ∀ i ∈ s, flow t0 - root i ≠ 0)
    (hslit : ∀ t ∈ T, ∀ i ∈ s,
      (flow t - root i) / (flow t0 - root i) ∈ Complex.slitPlane)
    (hflow : ∀ t ∈ T, HasDerivAt flow (P (flow t)) t)
    (hpartial : ∀ t ∈ T,
      (∑ i ∈ s, rho i / (flow t - root i)) * P (flow t) = 1) :
    ∀ t ∈ T,
      flowFatouIncrement s root rho (flow t0) (flow t) = t - t0 := by
  let f : ℂ → ℂ := fun t => flowFatouIncrement s root rho (flow t0) (flow t)
  let g : ℂ → ℂ := fun t => t - t0
  have hfder : ∀ t ∈ T, HasDerivAt f 1 t := by
    intro t ht
    have hright := hasDerivAt_flowFatouIncrement_right
      s root rho (flow t0) (flow t) hbase (hslit t ht)
    have hcomp := hright.comp t (hflow t ht)
    rw [hpartial t ht] at hcomp
    exact hcomp
  have hgder : ∀ t, HasDerivAt g 1 t := by
    intro t
    simpa [g] using (hasDerivAt_id t).sub_const t0
  have heq : T.EqOn f g := by
    apply hTopen.eqOn_of_deriv_eq hTpre
      (fun t ht => (hfder t ht).differentiableAt.differentiableWithinAt)
      (fun t _ => (hgder t).differentiableAt.differentiableWithinAt)
    · intro t ht
      rw [(hfder t ht).deriv, (hgder t).deriv]
    · exact ht0
    · simp [f, g]
  intro t ht
  exact heq ht

end FlowCoordinate

/-! ## Discrete residual and exact Abel correction -/

section AbelCorrection

open Complex

/-- One-step defect of a candidate Fatou coordinate for a discrete map. -/
def fatouResidual (F psi : ℂ → ℂ) (u : ℂ) : ℂ :=
  psi (F u) - psi u - 1

/-- Exact finite telescoping identity behind the runtime's linear residual
budget. -/
theorem fatouResidual_telescope
    (F psi : ℂ → ℂ) (x : ℕ → ℂ)
    (hstep : ∀ n, x (n + 1) = F (x n)) :
    ∀ n, psi (x n) - psi (x 0) - (n : ℂ) =
      ∑ j ∈ Finset.range n, fatouResidual F psi (x j) := by
  intro n
  induction n with
  | zero => simp
  | succ n ih =>
      rw [Finset.sum_range_succ, ← ih, fatouResidual, ← hstep n]
      push_cast
      ring

/-- Uniform one-step residual `epsPsi` accumulates at most linearly for `k`
discrete return-map applications. -/
theorem norm_fatouResidual_telescope_le
    (F psi : ℂ → ℂ) (x : ℕ → ℂ) (epsPsi : ℝ) (n : ℕ)
    (_heps : 0 ≤ epsPsi)
    (hstep : ∀ j, x (j + 1) = F (x j))
    (hres : ∀ j, j < n → ‖fatouResidual F psi (x j)‖ ≤ epsPsi) :
    ‖psi (x n) - psi (x 0) - (n : ℂ)‖ ≤ (n : ℝ) * epsPsi := by
  rw [fatouResidual_telescope F psi x hstep n]
  calc
    ‖∑ j ∈ Finset.range n, fatouResidual F psi (x j)‖ ≤
        ∑ j ∈ Finset.range n, ‖fatouResidual F psi (x j)‖ := norm_sum_le _ _
    _ ≤ ∑ _j ∈ Finset.range n, epsPsi := by
      apply Finset.sum_le_sum
      intro j hj
      exact hres j (Finset.mem_range.mp hj)
    _ = (n : ℝ) * epsPsi := by simp

/-- Infinite correction of a candidate coordinate by all future residuals. -/
def fatouCorrection (F psi : ℂ → ℂ) (u : ℂ) : ℂ :=
  ∑' n : ℕ, fatouResidual F psi ((F^[n]) u)

/-- Candidate plus its convergent future-residual correction. -/
def correctedFatouCoordinate (F psi : ℂ → ℂ) (u : ℂ) : ℂ :=
  psi u + fatouCorrection F psi u

/-- Whenever the residual series is summable along the forward orbit, the
corrected coordinate satisfies the exact Abel equation.  This constructs a
true sectorial Fatou coordinate from the approximate flow chart. -/
theorem correctedFatouCoordinate_abel
    (F psi : ℂ → ℂ) (u : ℂ)
    (hsum : Summable (fun n : ℕ => fatouResidual F psi ((F^[n]) u))) :
    correctedFatouCoordinate F psi (F u) =
      correctedFatouCoordinate F psi u + 1 := by
  let e : ℕ → ℂ := fun n => fatouResidual F psi ((F^[n]) u)
  have hshift : ∀ n : ℕ,
      fatouResidual F psi ((F^[n]) (F u)) = e (n + 1) := by
    intro n
    simp only [e, Function.iterate_succ_apply]
  have hsplit : e 0 + ∑' n : ℕ, e (n + 1) = ∑' n : ℕ, e n := by
    simpa [e, Function.iterate_succ_apply] using hsum.sum_add_tsum_nat_add 1
  have hcorrShift : fatouCorrection F psi (F u) = ∑' n : ℕ, e (n + 1) := by
    unfold fatouCorrection
    apply tsum_congr
    intro n
    exact hshift n
  have he0 : e 0 = psi (F u) - psi u - 1 := by
    simp [e, fatouResidual]
  have hcorr : fatouCorrection F psi u = ∑' n : ℕ, e n := by
    rfl
  unfold correctedFatouCoordinate
  rw [hcorrShift, hcorr]
  change psi (F u) + (∑' n : ℕ, e (n + 1)) =
    psi u + (∑' n : ℕ, e n) + 1
  rw [← hsplit, he0]
  ring

/-- A geometric residual decay is a concrete sufficient condition for the
existence of the corrected Abel coordinate. -/
theorem fatouResidual_summable_of_geometric
    (F psi : ℂ → ℂ) (u : ℂ) (M theta : ℝ)
    (_hM : 0 ≤ M) (htheta0 : 0 ≤ theta) (htheta1 : theta < 1)
    (hres : ∀ n, ‖fatouResidual F psi ((F^[n]) u)‖ ≤ M * theta ^ n) :
    Summable (fun n : ℕ => fatouResidual F psi ((F^[n]) u)) := by
  have hgeom : Summable (fun n : ℕ => M * theta ^ n) :=
    ((hasSum_geometric_of_lt_one htheta0 htheta1).mul_left M).summable
  exact hgeom.of_norm_bounded hres

/-- Direct existence theorem: geometric decay of the flow-chart residual
produces an exact Fatou coordinate satisfying Abel's equation. -/
theorem correctedFatouCoordinate_abel_of_geometric
    (F psi : ℂ → ℂ) (u : ℂ) (M theta : ℝ)
    (hM : 0 ≤ M) (htheta0 : 0 ≤ theta) (htheta1 : theta < 1)
    (hres : ∀ n, ‖fatouResidual F psi ((F^[n]) u)‖ ≤ M * theta ^ n) :
    correctedFatouCoordinate F psi (F u) =
      correctedFatouCoordinate F psi u + 1 := by
  apply correctedFatouCoordinate_abel
  exact fatouResidual_summable_of_geometric
    F psi u M theta hM htheta0 htheta1 hres

/-- A summable uniform majorant for the derivatives of the residual iterates
makes the infinite Fatou correction holomorphic on an open preconnected
sector.  Convergence at one base point then propagates to the entire sector.
This is the analytic existence mechanism needed after Cauchy has supplied the
derivative majorant on a slightly larger sector. -/
theorem analyticOnNhd_correctedFatouCoordinate
    (F psi : ℂ → ℂ) (S : Set ℂ) (u0 : ℂ)
    (de : ℕ → ℂ → ℂ) (B : ℕ → ℝ)
    (hSopen : IsOpen S) (hSpre : IsPreconnected S) (hu0 : u0 ∈ S)
    (hpsi : DifferentiableOn ℂ psi S)
    (hB : Summable B)
    (hder : ∀ n u, u ∈ S →
      HasDerivAt
        (fun v => fatouResidual F psi ((F^[n]) v)) (de n u) u)
    (hderBound : ∀ n u, u ∈ S → ‖de n u‖ ≤ B n)
    (hsum0 : Summable
      (fun n : ℕ => fatouResidual F psi ((F^[n]) u0))) :
    AnalyticOnNhd ℂ (correctedFatouCoordinate F psi) S := by
  apply DifferentiableOn.analyticOnNhd _ hSopen
  intro u hu
  have hcorr : HasDerivAt (fatouCorrection F psi)
      (∑' n : ℕ, de n u) u := by
    unfold fatouCorrection
    exact hasDerivAt_tsum_of_isPreconnected
      (g := fun n v => fatouResidual F psi ((F^[n]) v))
      (g' := de) hB hSopen hSpre hder hderBound hu0 hsum0 hu
  change DifferentiableWithinAt ℂ
    (fun v => psi v + fatouCorrection F psi v) S u
  exact (hpsi u hu).add hcorr.differentiableAt.differentiableWithinAt

/-- Full conditional sector theorem.  The same derivative majorant both makes
the corrected chart analytic and propagates convergence from one point; the
chart consequently satisfies Abel's equation at every point of the sector. -/
theorem correctedFatouCoordinate_sectorial
    (F psi : ℂ → ℂ) (S : Set ℂ) (u0 : ℂ)
    (de : ℕ → ℂ → ℂ) (B : ℕ → ℝ)
    (hSopen : IsOpen S) (hSpre : IsPreconnected S) (hu0 : u0 ∈ S)
    (hpsi : DifferentiableOn ℂ psi S)
    (hB : Summable B)
    (hder : ∀ n u, u ∈ S →
      HasDerivAt
        (fun v => fatouResidual F psi ((F^[n]) v)) (de n u) u)
    (hderBound : ∀ n u, u ∈ S → ‖de n u‖ ≤ B n)
    (hsum0 : Summable
      (fun n : ℕ => fatouResidual F psi ((F^[n]) u0))) :
    AnalyticOnNhd ℂ (correctedFatouCoordinate F psi) S ∧
      ∀ u ∈ S, correctedFatouCoordinate F psi (F u) =
        correctedFatouCoordinate F psi u + 1 := by
  constructor
  · exact analyticOnNhd_correctedFatouCoordinate
      F psi S u0 de B hSopen hSpre hu0 hpsi hB hder hderBound hsum0
  · intro u hu
    apply correctedFatouCoordinate_abel
    exact summable_of_summable_hasDerivAt_of_isPreconnected
      (g := fun n v => fatouResidual F psi ((F^[n]) v))
      (g' := de) hB hSopen hSpre hder hderBound hu0 hsum0 hu

/-- Quantitative distance between the corrected exact coordinate and the
finite flow-model coordinate. -/
theorem norm_fatouCorrection_le_geometric
    (F psi : ℂ → ℂ) (u : ℂ) (M theta : ℝ)
    (_hM : 0 ≤ M) (htheta0 : 0 ≤ theta) (htheta1 : theta < 1)
    (hres : ∀ n, ‖fatouResidual F psi ((F^[n]) u)‖ ≤ M * theta ^ n) :
    ‖fatouCorrection F psi u‖ ≤ M / (1 - theta) := by
  unfold fatouCorrection
  have hgeom := (hasSum_geometric_of_lt_one htheta0 htheta1).mul_left M
  simpa [div_eq_mul_inv] using tsum_of_norm_bounded hgeom hres

end AbelCorrection

/-! ## Exit-chart distortion -/

section ExitChart

open Complex Set

/-- If the inverse Fatou chart follows the vector field `P`, a uniform bound
on `|P|` over a convex coordinate domain is exactly a Lipschitz bound for the
exit chart. -/
theorem norm_exitChart_sub_le_of_vectorField_bound
    (S : Set ℂ) (exit P : ℂ → ℂ) (L : ℝ) (u v : ℂ)
    (hconv : Convex ℝ S) (hu : u ∈ S) (hv : v ∈ S)
    (hderiv : ∀ w ∈ S, HasDerivAt exit (P (exit w)) w)
    (hbound : ∀ w ∈ S, ‖P (exit w)‖ ≤ L) :
    ‖exit v - exit u‖ ≤ L * ‖v - u‖ := by
  exact hconv.norm_image_sub_le_of_norm_deriv_le
    (fun w hw => (hderiv w hw).differentiableAt)
    (fun w hw => by rw [(hderiv w hw).deriv]; exact hbound w hw)
    hu hv

/-- Complete concrete Fatou exit budget with the abstract Lipschitz premise
discharged by a vector-field bound. -/
theorem fatou_exit_error_of_vectorField_bound
    (S : Set ℂ) (exit P : ℂ → ℂ) (L epsPsi : ℝ) (k : ℕ) (u v : ℂ)
    (hconv : Convex ℝ S) (hu : u ∈ S) (hv : v ∈ S)
    (hL : 0 ≤ L) (hcoord : ‖v - u‖ ≤ (k : ℝ) * epsPsi)
    (hderiv : ∀ w ∈ S, HasDerivAt exit (P (exit w)) w)
    (hbound : ∀ w ∈ S, ‖P (exit w)‖ ≤ L) :
    ‖exit v - exit u‖ ≤ (k : ℝ) * L * epsPsi := by
  calc
    ‖exit v - exit u‖ ≤ L * ‖v - u‖ :=
      norm_exitChart_sub_le_of_vectorField_bound
        S exit P L u v hconv hu hv hderiv hbound
    _ ≤ L * ((k : ℝ) * epsPsi) :=
      mul_le_mul_of_nonneg_left hcoord hL
    _ = (k : ℝ) * L * epsPsi := by ring

end ExitChart

/-! ## Branch changes and flow-model horn data -/

section HornTransition

variable {ι : Type*}

/-- A Fatou coordinate assembled from arbitrary logarithm branches. -/
def branchedFlowFatouCoordinate
    (s : Finset ι) (rho : ι → ℂ) (branch : ι → ℂ → ℂ) (u : ℂ) : ℂ :=
  ∑ i ∈ s, rho i * branch i u

/-- Constant picked up when branch `i` is continued by `turns i` full turns. -/
def flowHornConstant
    (s : Finset ι) (rho : ι → ℂ) (turns : ι → ℤ) : ℂ :=
  ∑ i ∈ s, rho i * ((turns i : ℂ) * (2 * Real.pi * Complex.I))

theorem branchedFlowFatouCoordinate_shift
    (s : Finset ι) (rho : ι → ℂ) (branch : ι → ℂ → ℂ)
    (turns : ι → ℤ) (u : ℂ) :
    branchedFlowFatouCoordinate s rho
        (fun i z => branch i z + (turns i : ℂ) * (2 * Real.pi * Complex.I)) u =
      branchedFlowFatouCoordinate s rho branch u +
        flowHornConstant s rho turns := by
  simp only [branchedFlowFatouCoordinate, flowHornConstant, mul_add,
    Finset.sum_add_distrib]

/-- For the exact flow model, branch transition data is a constant
translation and therefore commutes with every Fatou-time translation. -/
def flowHornTransition (H w : ℂ) : ℂ := w + H

theorem flowHornTransition_commutes_translation (H w k : ℂ) :
    flowHornTransition H (w + k) = flowHornTransition H w + k := by
  simp only [flowHornTransition]
  ring

end HornTransition

end


end Mandelbrot
