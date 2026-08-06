/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.QuadraticFatou
import Mathlib.Analysis.Complex.Polynomial.Basic
import Mathlib.MeasureTheory.Measure.Lebesgue.VolumeOfBalls

/-!
# The exact period-two bulb

This file extends the inverse-branch proof of `QuadraticFatou.lean` from an
attracting fixed point to an attracting two-cycle.  It then identifies the
period-two hyperbolic component with the disk `D(-1, 1/4)`, proves that this
disk lies in the Mandelbrot set, and computes its exact area `pi/16`.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Function Metric Set MeasureTheory
open scoped Topology NNReal ENNReal

/-! ## A local attracting disk for a strictly differentiable return map -/

theorem exists_contracting_ball_of_hasStrictDerivAt
    {f : ℂ → ℂ} {p mu : ℂ}
    (hderiv : HasStrictDerivAt f mu p) (hfixed : f p = p)
    (hattract : ‖mu‖ < 1) :
    ∃ rho : ℝ, 0 < rho ∧ MapsTo f (ball p rho) (ball p rho) := by
  let K : ℝ≥0 := ⟨(‖mu‖ + 1) / 2, by positivity⟩
  have hmuK : ‖mu‖₊ < K := by
    apply NNReal.coe_lt_coe.mp
    change ‖mu‖ < (K : ℝ)
    change ‖mu‖ < (‖mu‖ + 1) / 2
    linarith
  have hKone : (K : ℝ) < 1 := by
    change (‖mu‖ + 1) / 2 < 1
    linarith
  have hmuK' : ‖ContinuousLinearMap.toSpanSingleton ℂ mu‖₊ < K := by
    simpa using hmuK
  obtain ⟨s, hs, hlip⟩ :=
    hderiv.hasStrictFDerivAt.exists_lipschitzOnWith_of_nnnorm_lt K hmuK'
  obtain ⟨rho, hrho, hball⟩ := Metric.mem_nhds_iff.mp hs
  refine ⟨rho, hrho, ?_⟩
  intro z hz
  have hpball : p ∈ ball p rho := mem_ball_self hrho
  have hdist := hlip.dist_le_mul z (hball hz) p (hball hpball)
  rw [hfixed] at hdist
  rw [mem_ball] at hz ⊢
  calc
    dist (f z) p ≤ (K : ℝ) * dist z p := hdist
    _ < 1 * rho := by
      calc
        (K : ℝ) * dist z p ≤ 1 * dist z p :=
          mul_le_mul_of_nonneg_right hKone.le dist_nonneg
        _ < 1 * rho := mul_lt_mul_of_pos_left hz zero_lt_one
    _ = rho := one_mul _

theorem hasStrictDerivAt_quad (c z : ℂ) :
    HasStrictDerivAt (quad c) (2 * z) z := by
  have hpow : HasStrictDerivAt (fun w : ℂ => w ^ 2) (2 * z) z := by
    simpa using hasStrictDerivAt_pow 2 z
  exact hpow.add_const c

/-! ## Inverse branches normalized along a cycle -/

/-- An inverse branch based at `b`, whose selected preimage of `b` is `a`. -/
structure QuadraticInverseBranchAt
    (c b a : ℂ) (U : Set ℂ) (n : ℕ) where
  toFun : ℂ → ℂ
  differentiableOn : DifferentiableOn ℂ toFun U
  right_inverse : ∀ z ∈ U, orbit c (toFun z) n = z
  map_base : toFun b = a

namespace QuadraticInverseBranchAt

instance (c b a : ℂ) (U : Set ℂ) (n : ℕ) :
    CoeFun (QuadraticInverseBranchAt c b a U n) (fun _ => ℂ → ℂ) :=
  ⟨QuadraticInverseBranchAt.toFun⟩

theorem continuousOn {c b a : ℂ} {U : Set ℂ} {n : ℕ}
    (h : QuadraticInverseBranchAt c b a U n) : ContinuousOn h U :=
  h.differentiableOn.continuousOn

end QuadraticInverseBranchAt

def QuadraticInverseBranch.toAt
    {c p : ℂ} {U : Set ℂ} {n : ℕ}
    (h : QuadraticInverseBranch c p U n) :
    QuadraticInverseBranchAt c p p U n :=
  ⟨h, h.differentiableOn, h.right_inverse, h.map_fixed⟩

def QuadraticInverseBranchAt.toFixed
    {c p : ℂ} {U : Set ℂ} {n : ℕ}
    (h : QuadraticInverseBranchAt c p p U n) :
    QuadraticInverseBranch c p U n :=
  ⟨h, h.differentiableOn, h.right_inverse, h.map_base⟩

/-- Choose the sign of a root from its value at a possibly different base
point. -/
noncomputable def normalizeRootFor
    (s : ℂ → ℂ) (b a : ℂ) : ℂ → ℂ :=
  if s b = a then s else fun z => -s z

theorem normalizeRootFor_sq (s : ℂ → ℂ) (b a z : ℂ) :
    normalizeRootFor s b a z ^ 2 = s z ^ 2 := by
  by_cases h : s b = a <;> simp [normalizeRootFor, h]

theorem continuousOn_normalizeRootFor
    {U : Set ℂ} {s : ℂ → ℂ} {b a : ℂ}
    (hs : ContinuousOn s U) : ContinuousOn (normalizeRootFor s b a) U := by
  by_cases h : s b = a
  · simpa [normalizeRootFor, h] using hs
  · simpa [normalizeRootFor, h] using hs.neg

theorem normalizeRootFor_base_of_sq
    (s : ℂ → ℂ) (b a : ℂ) (hsq : s b ^ 2 = a ^ 2) :
    normalizeRootFor s b a b = a := by
  by_cases h : s b = a
  · simp [normalizeRootFor, h]
  · have hneg : s b = -a := (sq_eq_sq_iff_eq_or_eq_neg.mp hsq).resolve_left h
    have hne : -a ≠ a := by
      intro heq
      apply h
      rw [hneg, heq]
    simp [normalizeRootFor, hne, hneg]

/-- Lift an inverse branch by one quadratic square root, choosing the root
which sends the base point to the prescribed previous cycle point. -/
theorem QuadraticInverseBranchAt.succAt
    {c b a aPrev : ℂ} {U : Set ℂ} {n : ℕ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U)
    (haPrev : quad c aPrev = a)
    (h : QuadraticInverseBranchAt c b a U n) :
    Nonempty (QuadraticInverseBranchAt c b aPrev U (n + 1)) := by
  let g : ℂ → ℂ := fun z => h z - c
  have hg_cont : ContinuousOn g U := h.continuousOn.sub continuousOn_const
  have hg_diff : DifferentiableOn ℂ g U := h.differentiableOn.sub_const c
  have hg0 : 0 ∉ g '' U := by
    rintro ⟨z, hzU, hzero⟩
    have hzcrit : h z = c := by
      dsimp [g] at hzero
      linear_combination hzero
    have horbit : orbit c c n = z :=
      (congrArg (fun w => orbit c w n) hzcrit).symm.trans
        (h.right_inverse z hzU)
    apply hcritical (n + 1)
    rw [orbit_zero_succ_eq_orbit_criticalValue, horbit]
    exact hzU
  obtain ⟨s, hs_cont, hs_sq⟩ :=
    Complex.exists_continuousOn_pow_eq hUsimply hUopen hg_cont hg0
      (show (2 : ℕ) ≠ 0 by norm_num)
  let root : ℂ → ℂ := normalizeRootFor s b aPrev
  have hroot_cont : ContinuousOn root U :=
    continuousOn_normalizeRootFor hs_cont
  have hroot_sq : ∀ z ∈ U, root z ^ 2 = g z := by
    intro z hz
    rw [normalizeRootFor_sq]
    exact hs_sq z
  have hroot0 : ∀ z ∈ U, root z ≠ 0 := by
    intro z hz hzero
    have : g z = 0 := by rw [← hroot_sq z hz, hzero]; norm_num
    exact hg0 ⟨z, hz, this⟩
  have hroot_diff : DifferentiableOn ℂ root U :=
    differentiableOn_of_continuousOn_sq_eq hUopen hroot_cont hg_diff
      hroot_sq hroot0
  have hbase_sq : s b ^ 2 = aPrev ^ 2 := by
    rw [hs_sq b]
    dsimp [g]
    rw [h.map_base]
    have hprev : aPrev ^ 2 + c = a := by simpa [quad] using haPrev
    conv_lhs => rw [← hprev]
    ring
  refine ⟨⟨root, hroot_diff, ?_, normalizeRootFor_base_of_sq s b aPrev hbase_sq⟩⟩
  intro z hz
  rw [orbit_succ_start]
  have hquad : quad c (root z) = h z := by
    simp only [quad]
    rw [hroot_sq z hz]
    dsimp [g]
    ring
  rw [hquad]
  exact h.right_inverse z hz

/-- Two successive lifts follow a two-cycle and return the base point to
itself. -/
theorem QuadraticInverseBranch.succTwoCycle
    {c p r : ℂ} {U : Set ℂ} {n : ℕ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U)
    (hpr : quad c p = r) (hrp : quad c r = p)
    (h : QuadraticInverseBranch c p U n) :
    Nonempty (QuadraticInverseBranch c p U (n + 2)) := by
  obtain ⟨h₁⟩ := h.toAt.succAt hUopen hUsimply hcritical hrp
  obtain ⟨h₂⟩ := h₁.succAt hUopen hUsimply hcritical hpr
  exact ⟨by simpa [Nat.add_assoc] using h₂.toFixed⟩

theorem exists_twoCycleInverseBranch
    {c p r : ℂ} {U : Set ℂ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U)
    (hpr : quad c p = r) (hrp : quad c r = p) :
    ∀ n : ℕ, Nonempty (QuadraticInverseBranch c p U (2 * n)) := by
  intro n
  induction n with
  | zero => exact ⟨⟨id, differentiableOn_id, by simp [orbit], rfl⟩⟩
  | succ n ih =>
      obtain ⟨h⟩ := ih
      have hs := h.succTwoCycle hUopen hUsimply hcritical hpr hrp
      simpa [Nat.mul_succ] using hs

/-! ## The period-two Fatou contradiction -/

theorem norm_le_of_norm_quad_le_of_escapeRadius_le
    (c z : ℂ) (R : ℝ) (hR : quadraticEscapeRadius c ≤ R)
    (h : ‖quad c z‖ ≤ R) : ‖z‖ ≤ R := by
  by_contra hnot
  have hz : R < ‖z‖ := lt_of_not_ge hnot
  have hlower : ‖z‖ ^ 2 - ‖c‖ ≤ ‖quad c z‖ := by
    simpa [quad] using norm_sq_add_lower z c
  have hc : 0 ≤ ‖c‖ := norm_nonneg c
  have hR' : ‖c‖ + 2 ≤ R := by simpa [quadraticEscapeRadius] using hR
  nlinarith

theorem norm_le_of_norm_orbit_le_of_escapeRadius_le
    (c z : ℂ) (R : ℝ) (hR : quadraticEscapeRadius c ≤ R) :
    ∀ n : ℕ, ‖orbit c z n‖ ≤ R → ‖z‖ ≤ R := by
  intro n
  induction n with
  | zero => simpa
  | succ n ih =>
      intro h
      rw [orbit_succ] at h
      exact ih (norm_le_of_norm_quad_le_of_escapeRadius_le c _ R hR h)

theorem QuadraticInverseBranch.deriv_identity_of_hasDerivAt
    {c p : ℂ} {U : Set ℂ} {n : ℕ} {d : ℂ}
    (hUopen : IsOpen U) (hpU : p ∈ U)
    (hiter : HasDerivAt (fun z => orbit c z n) d p)
    (h : QuadraticInverseBranch c p U n) :
    d * deriv h p = 1 := by
  have hh : HasDerivAt h (deriv h p) p :=
    (h.differentiableOn.differentiableAt (hUopen.mem_nhds hpU)).hasDerivAt
  have hiter' : HasDerivAt (fun z => orbit c z n) d (h p) := by
    simpa [h.map_fixed] using hiter
  have hcomp : HasDerivAt (fun z => orbit c (h z) n)
      (d * deriv h p) p := hiter'.comp p hh
  have heq : (fun z => orbit c (h z) n) =ᶠ[nhds p] id :=
    Filter.eventually_of_mem (hUopen.mem_nhds hpU) fun z hz =>
      h.right_inverse z hz
  calc
    d * deriv h p = deriv (fun z => orbit c (h z) n) p := hcomp.deriv.symm
    _ = deriv id p := heq.deriv_eq
    _ = 1 := deriv_id p

theorem QuadraticInverseBranch.mapsTo_uniform_closedBall_of_ball
    {c p : ℂ} {rho : ℝ} {n : ℕ}
    (h : QuadraticInverseBranch c p (ball p rho) n) :
    MapsTo h (ball p rho)
      (closedBall p
        (max (quadraticEscapeRadius c) (‖p‖ + max rho 0) + ‖p‖)) := by
  intro z hz
  let R : ℝ := max (quadraticEscapeRadius c) (‖p‖ + max rho 0)
  have hR : quadraticEscapeRadius c ≤ R := le_max_left _ _
  have hzNorm : ‖z‖ ≤ R := by
    have hz' : ‖z - p‖ < rho := by simpa [mem_ball, dist_eq] using hz
    have hrho : 0 ≤ rho := le_trans (norm_nonneg (z - p)) hz'.le
    have hzBound : ‖z‖ ≤ ‖p‖ + rho := by
      calc
        ‖z‖ = ‖(z - p) + p‖ := by congr 1; ring
        _ ≤ ‖z - p‖ + ‖p‖ := norm_add_le _ _
        _ ≤ ‖p‖ + rho := by linarith
    exact hzBound.trans (by
      dsimp [R]
      rw [max_eq_left hrho]
      exact le_max_right _ _)
  have horbit : ‖orbit c (h z) n‖ ≤ R := by
    rw [h.right_inverse z hz]
    exact hzNorm
  have hh : ‖h z‖ ≤ R :=
    norm_le_of_norm_orbit_le_of_escapeRadius_le c (h z) R hR n horbit
  rw [mem_closedBall, dist_eq]
  calc
    ‖h z - p‖ ≤ ‖h z‖ + ‖p‖ := norm_sub_le _ _
    _ ≤ R + ‖p‖ := add_le_add hh le_rfl
    _ = max (quadraticEscapeRadius c) (‖p‖ + max rho 0) + ‖p‖ := rfl

def twoCycleReturn (c : ℂ) : ℂ → ℂ :=
  (quad c) ∘ (quad c)

theorem hasStrictDerivAt_twoCycleReturn
    (c p r : ℂ) (hpr : quad c p = r) :
    HasStrictDerivAt (twoCycleReturn c) ((2 * r) * (2 * p)) p := by
  have hout : HasStrictDerivAt (quad c) (2 * r) (quad c p) := by
    simpa [hpr] using hasStrictDerivAt_quad c r
  simpa [twoCycleReturn] using hout.comp p (hasStrictDerivAt_quad c p)

theorem orbit_twoCycle_fixed
    (c p r : ℂ) (hpr : quad c p = r) (hrp : quad c r = p) :
    orbit c p 2 = p := by
  simp [orbit_succ, hpr, hrp]

theorem twoCycleReturn_fixed
    (c p r : ℂ) (hpr : quad c p = r) (hrp : quad c r = p) :
    twoCycleReturn c p = p := by
  simp [twoCycleReturn, Function.comp_apply, hpr, hrp]

theorem hasDerivAt_twoCycle_iterate
    (c p r : ℂ) (hpr : quad c p = r) (hrp : quad c r = p) (n : ℕ) :
    HasDerivAt (fun z => orbit c z (2 * n)) (((2 * r) * (2 * p)) ^ n) p := by
  let F : ℂ → ℂ := twoCycleReturn c
  have hF : HasDerivAt F ((2 * r) * (2 * p)) p :=
    (hasStrictDerivAt_twoCycleReturn c p r hpr).hasDerivAt
  have hFfixed : F p = p := twoCycleReturn_fixed c p r hpr hrp
  have hiter := HasDerivAt.iterate p hF hFfixed n
  have heq : (fun z => orbit c z (2 * n)) = F^[n] := by
    funext z
    change (quad c)^[2 * n] z = F^[n] z
    rw [Function.iterate_mul]
    congr 2
  exact hiter.congr_of_eventuallyEq
    (Filter.Eventually.of_forall fun z => congrFun heq z)

/-- A noncritical attracting two-cycle attracts the quadratic critical orbit.
The returned disk is also forward invariant under the two-step return. -/
theorem exists_twoCycle_attracting_entry
    (c p r : ℂ) (hpr : quad c p = r) (hrp : quad c r = p)
    (hattract : ‖(2 * r) * (2 * p)‖ < 1) :
    ∃ rho : ℝ, 0 < rho ∧
      MapsTo (twoCycleReturn c) (ball p rho) (ball p rho) ∧
      ∃ N : ℕ, orbit c 0 N ∈ ball p rho := by
  obtain ⟨rho, hrho, hmaps⟩ := exists_contracting_ball_of_hasStrictDerivAt
    (hasStrictDerivAt_twoCycleReturn c p r hpr)
    (twoCycleReturn_fixed c p r hpr hrp) hattract
  refine ⟨rho, hrho, hmaps, ?_⟩
  by_contra hnever
  push_neg at hnever
  let U : Set ℂ := ball p rho
  have hUopen : IsOpen U := isOpen_ball
  have hpU : p ∈ U := by simp [U, hrho]
  have hUsimply : IsSimplyConnected U := by
    letI : ContractibleSpace U := Metric.contractibleSpace_ball hrho
    exact (show SimplyConnectedSpace U from inferInstance)
  have hbranches : ∀ n : ℕ,
      Nonempty (QuadraticInverseBranch c p U (2 * n)) :=
    exists_twoCycleInverseBranch hUopen hUsimply hnever hpr hrp
  let B : ℝ :=
    max (quadraticEscapeRadius c) (‖p‖ + max rho 0) + ‖p‖
  let C : ℝ := B / rho
  have hlimit : Tendsto
      (fun n : ℕ => ‖(2 * r) * (2 * p)‖ ^ n * C) atTop (nhds 0) := by
    simpa using
      (tendsto_pow_atTop_nhds_zero_of_lt_one
        (norm_nonneg ((2 * r) * (2 * p))) hattract).mul_const C
  have hevent : ∀ᶠ n : ℕ in atTop,
      ‖(2 * r) * (2 * p)‖ ^ n * C < 1 :=
    hlimit.eventually (Iio_mem_nhds (by norm_num : (0 : ℝ) < 1))
  obtain ⟨n, hn⟩ := hevent.exists
  obtain ⟨h⟩ := hbranches n
  have hmapsBranch : MapsTo h (ball p rho) (closedBall p B) := by
    simpa [U, B] using h.mapsTo_uniform_closedBall_of_ball
  have hupper : ‖deriv h p‖ ≤ C := by
    dsimp [C]
    apply Complex.norm_deriv_le_div_of_mapsTo_ball h.differentiableOn
    · simpa [h.map_fixed] using hmapsBranch
    · exact hrho
  have hid := h.deriv_identity_of_hasDerivAt hUopen hpU
    (hasDerivAt_twoCycle_iterate c p r hpr hrp n)
  have hnorm : (1 : ℝ) =
      ‖(2 * r) * (2 * p)‖ ^ n * ‖deriv h p‖ := by
    calc
      (1 : ℝ) = ‖(1 : ℂ)‖ := by norm_num
      _ = ‖((2 * r) * (2 * p)) ^ n * deriv h p‖ := by rw [hid]
      _ = ‖(2 * r) * (2 * p)‖ ^ n * ‖deriv h p‖ := by
        rw [norm_mul, norm_pow]
  have hle : (1 : ℝ) ≤ ‖(2 * r) * (2 * p)‖ ^ n * C := by
    rw [hnorm]
    exact mul_le_mul_of_nonneg_left hupper (pow_nonneg (norm_nonneg _) _)
  linarith

theorem twoCycleReturn_iterate_eq_orbit (c z : ℂ) (n : ℕ) :
    (twoCycleReturn c)^[n] z = orbit c z (2 * n) := by
  change (twoCycleReturn c)^[n] z = (quad c)^[2 * n] z
  rw [Function.iterate_mul]
  rfl

theorem orbit_two_mul_mem_of_twoCycle_mapsTo
    (c p z : ℂ) (rho : ℝ)
    (hmaps : MapsTo (twoCycleReturn c) (ball p rho) (ball p rho))
    (hz : z ∈ ball p rho) :
    ∀ n : ℕ, orbit c z (2 * n) ∈ ball p rho := by
  intro n
  rw [← twoCycleReturn_iterate_eq_orbit]
  exact hmaps.iterate n hz

theorem norm_le_center_add_radius_of_mem_ball
    {p z : ℂ} {rho : ℝ} (hrho : 0 ≤ rho) (hz : z ∈ ball p rho) :
    ‖z‖ ≤ ‖p‖ + rho := by
  have hz' : ‖z - p‖ < rho := by simpa [mem_ball, dist_eq] using hz
  calc
    ‖z‖ = ‖(z - p) + p‖ := by congr 1; ring
    _ ≤ ‖z - p‖ + ‖p‖ := norm_add_le _ _
    _ ≤ ‖p‖ + rho := by linarith

/-- Entry into an invariant attracting disk for the two-step return makes
the full critical orbit bounded, including the interlaced odd iterates. -/
theorem mem_Mandelbrot_of_twoCycle_entry
    (c p : ℂ) (rho : ℝ) (hrho : 0 < rho)
    (hmaps : MapsTo (twoCycleReturn c) (ball p rho) (ball p rho))
    (hentry : ∃ N : ℕ, orbit c 0 N ∈ ball p rho) :
    c ∈ Mandelbrot := by
  obtain ⟨N, hN⟩ := hentry
  let A : ℝ := ‖p‖ + rho
  let R₀ : ℝ := max (quadraticEscapeRadius c) A
  let R : ℝ := max R₀ (A ^ 2 + ‖c‖)
  have hA0 : 0 ≤ A := by dsimp [A]; positivity
  have hNnorm : ‖orbit c 0 N‖ ≤ A :=
    norm_le_center_add_radius_of_mem_ball hrho.le hN
  have hR₀escape : quadraticEscapeRadius c ≤ R₀ :=
    le_max_left _ _
  have hR₀R : R₀ ≤ R := le_max_left _ _
  have hAR₀ : A ≤ R₀ := le_max_right _ _
  apply (mem_Mandelbrot_iff c).2
  refine ⟨R, fun n => ?_⟩
  rw [mandelbrotOrbit_eq_orbit]
  rcases le_total n N with hnN | hNn
  · obtain ⟨k, _hk⟩ := Nat.exists_eq_add_of_le hnN
    have hkn : k + n = N := by omega
    have htail : ‖orbit c (orbit c 0 n) k‖ ≤ R₀ := by
      have heq : orbit c (orbit c 0 n) k = orbit c 0 (k + n) := by
        change (quad c)^[k] (orbit c 0 n) = orbit c 0 (k + n)
        exact (orbit_add c 0 k n).symm
      rw [heq, hkn]
      exact hNnorm.trans hAR₀
    exact (norm_le_of_norm_orbit_le_of_escapeRadius_le
      c (orbit c 0 n) R₀ hR₀escape k htail).trans hR₀R
  · obtain ⟨d, _hd⟩ := Nat.exists_eq_add_of_le hNn
    have hnd : n = d + N := by omega
    obtain ⟨k, hk | hk⟩ := Nat.even_or_odd' d
    · have heq : orbit c 0 n = orbit c (orbit c 0 N) (2 * k) := by
        rw [hnd, hk, orbit_add]
        rfl
      rw [heq]
      have hmem := orbit_two_mul_mem_of_twoCycle_mapsTo
        c p (orbit c 0 N) rho hmaps hN k
      exact (norm_le_center_add_radius_of_mem_ball hrho.le hmem).trans
        (hAR₀.trans hR₀R)
    · have heq : orbit c 0 n =
          quad c (orbit c (orbit c 0 N) (2 * k)) := by
        rw [hnd, hk, orbit_add]
        change (quad c)^[2 * k + 1] (orbit c 0 N) = _
        rw [Function.iterate_succ_apply']
        rfl
      rw [heq]
      have hmem := orbit_two_mul_mem_of_twoCycle_mapsTo
        c p (orbit c 0 N) rho hmaps hN k
      have hzA : ‖orbit c (orbit c 0 N) (2 * k)‖ ≤ A :=
        norm_le_center_add_radius_of_mem_ball hrho.le hmem
      have hquad :
          ‖quad c (orbit c (orbit c 0 N) (2 * k))‖ ≤ A ^ 2 + ‖c‖ := by
        calc
          ‖quad c (orbit c (orbit c 0 N) (2 * k))‖ ≤
              ‖orbit c (orbit c 0 N) (2 * k)‖ ^ 2 + ‖c‖ := by
            simp only [quad]
            exact (norm_add_le _ _).trans_eq (by rw [norm_pow])
          _ ≤ A ^ 2 + ‖c‖ := by
            gcongr
      exact hquad.trans (le_max_right _ _)

/-! ## The explicit multiplier disk -/

/-- The hyperbolic component attached to the superattracting cycle
`-1 ↦ 0 ↦ -1`. -/
def periodTwoBulb : Set ℂ :=
  ball (-1 : ℂ) (1 / 4 : ℝ)

theorem exists_attracting_twoCycle_of_mem_periodTwoBulb
    {c : ℂ} (hc : c ∈ periodTwoBulb) :
    ∃ p r : ℂ, quad c p = r ∧ quad c r = p ∧
      ‖(2 * r) * (2 * p)‖ < 1 := by
  let mu : ℂ := 4 * (c + 1)
  have hcp : ‖c + 1‖ < (1 / 4 : ℝ) := by
    simpa [periodTwoBulb, mem_ball, dist_eq, sub_neg_eq_add] using hc
  have hmu : ‖mu‖ < 1 := by
    dsimp [mu]
    rw [norm_mul]
    norm_num
    nlinarith
  obtain ⟨delta : ℂ, hdelta⟩ :=
    IsAlgClosed.exists_pow_nat_eq (1 - mu) (by norm_num : 0 < (2 : ℕ))
  let p : ℂ := (-1 + delta) / 2
  let r : ℂ := (-1 - delta) / 2
  have hsum : p + r = -1 := by
    dsimp [p, r]
    ring
  have hprod : p * r = c + 1 := by
    dsimp [p, r]
    field_simp
    dsimp [mu] at hdelta
    calc
      (-1 + delta) * (-1 - delta) = 1 - delta ^ 2 := by ring
      _ = 2 ^ 2 * (c + 1) := by rw [hdelta]; ring
  have hp_poly : p ^ 2 + p + c + 1 = 0 := by
    calc
      p ^ 2 + p + c + 1 = p ^ 2 + p + p * r := by rw [hprod]; ring
      _ = p * (p + r + 1) := by ring
      _ = 0 := by rw [hsum]; ring
  have hr_poly : r ^ 2 + r + c + 1 = 0 := by
    calc
      r ^ 2 + r + c + 1 = r ^ 2 + r + p * r := by rw [hprod]; ring
      _ = r * (p + r + 1) := by ring
      _ = 0 := by rw [hsum]; ring
  refine ⟨p, r, ?_, ?_, ?_⟩
  · simp only [quad]
    linear_combination hp_poly - hsum
  · simp only [quad]
    linear_combination hr_poly - hsum
  · have hmult : (2 * r) * (2 * p) = mu := by
      calc
        (2 * r) * (2 * p) = 4 * (p * r) := by ring
        _ = 4 * (c + 1) := by rw [hprod]
        _ = mu := rfl
    rw [hmult]
    exact hmu

theorem periodTwoBulb_subset_Mandelbrot :
    periodTwoBulb ⊆ Mandelbrot := by
  intro c hc
  obtain ⟨p, r, hpr, hrp, hattract⟩ :=
    exists_attracting_twoCycle_of_mem_periodTwoBulb hc
  obtain ⟨rho, hrho, hmaps, hentry⟩ :=
    exists_twoCycle_attracting_entry c p r hpr hrp hattract
  exact mem_Mandelbrot_of_twoCycle_entry c p rho hrho hmaps hentry

theorem volume_periodTwoBulb :
    volume periodTwoBulb = ENNReal.ofReal (Real.pi / 16) := by
  symm
  rw [periodTwoBulb, Complex.volume_ball]
  rw [ENNReal.ofReal_div_of_pos (by norm_num : (0 : ℝ) < 16)]
  rw [show ENNReal.ofReal Real.pi = (NNReal.pi : ENNReal) by
    simp [← NNReal.coe_real_pi]]
  rw [show ENNReal.ofReal (1 / 4 : ℝ) = (1 / 4 : ENNReal) by
    rw [ENNReal.ofReal_div_of_pos (by norm_num : (0 : ℝ) < 4)]
    norm_num]
  rw [show ENNReal.ofReal (16 : ℝ) = (16 : ENNReal) by norm_num]
  simp only [div_eq_mul_inv, one_mul]
  change (NNReal.pi : ENNReal) * (16 : ENNReal)⁻¹ =
    (4 : ENNReal)⁻¹ ^ 2 * (NNReal.pi : ENNReal)
  rw [← ENNReal.inv_pow (a := (4 : ENNReal)) (n := 2)]
  norm_num only [OfNat.ofNat, pow_two]
  exact mul_comm _ _

theorem hasStrictDerivAt_mainCardioidMap (lambda : ℂ) :
    HasStrictDerivAt mainCardioidMap ((1 - lambda) / 2) lambda := by
  have h := (hasStrictDerivAt_id lambda).div_const 2 |>.sub
    ((hasStrictDerivAt_id lambda).pow 2 |>.div_const 4)
  convert h using 1
  all_goals first | rfl | (norm_num [id_eq]; ring)

theorem isOpen_mainCardioid : IsOpen mainCardioid := by
  rw [isOpen_iff_mem_nhds]
  rintro c ⟨lambda, hlambda, rfl⟩
  have hlambdaNorm : ‖lambda‖ < 1 := by
    simpa [mem_ball, dist_zero_right] using hlambda
  have hderiv : (1 - lambda) / 2 ≠ 0 := by
    apply div_ne_zero
    · intro h
      have : lambda = 1 := by linear_combination -h
      rw [this] at hlambdaNorm
      norm_num at hlambdaNorm
    · norm_num
  rw [← (hasStrictDerivAt_mainCardioidMap lambda).map_nhds_eq hderiv]
  exact Filter.image_mem_map (isOpen_ball.mem_nhds hlambda)

theorem disjoint_mainCardioid_periodTwoBulb :
    Disjoint mainCardioid periodTwoBulb := by
  rw [Set.disjoint_left]
  rintro c ⟨lambda, hlambda, rfl⟩ hcBulb
  have hlambdaNorm : ‖lambda‖ < 1 := by
    simpa [mem_ball, dist_zero_right] using hlambda
  have hbulb : ‖mainCardioidMap lambda + 1‖ < (1 / 4 : ℝ) := by
    simpa [periodTwoBulb, mem_ball, dist_eq, sub_neg_eq_add] using hcBulb
  have hsmall :
      ‖(4 : ℂ) + 2 * lambda - lambda ^ 2‖ < 1 := by
    have hscaled : (4 : ℂ) * (mainCardioidMap lambda + 1) =
        4 + 2 * lambda - lambda ^ 2 := by
      simp only [mainCardioidMap]
      ring
    rw [← hscaled, norm_mul]
    norm_num
    nlinarith
  have hpert : ‖lambda ^ 2 - 2 * lambda‖ < 3 := by
    calc
      ‖lambda ^ 2 - 2 * lambda‖ ≤
          ‖lambda ^ 2‖ + ‖2 * lambda‖ := norm_sub_le _ _
      _ = ‖lambda‖ ^ 2 + 2 * ‖lambda‖ := by
        rw [norm_pow, norm_mul]
        norm_num
      _ < 3 := by nlinarith [norm_nonneg lambda]
  have hreverse := norm_sub_norm_le (4 : ℂ) (lambda ^ 2 - 2 * lambda)
  have hlower : 4 - ‖lambda ^ 2 - 2 * lambda‖ ≤
      ‖(4 : ℂ) + 2 * lambda - lambda ^ 2‖ := by
    calc
      4 - ‖lambda ^ 2 - 2 * lambda‖ =
          ‖(4 : ℂ)‖ - ‖lambda ^ 2 - 2 * lambda‖ := by norm_num
      _ ≤ ‖(4 : ℂ) - (lambda ^ 2 - 2 * lambda)‖ := hreverse
      _ = ‖(4 : ℂ) + 2 * lambda - lambda ^ 2‖ := by
        congr 1
        ring
  linarith

theorem volume_mainCardioid_union_periodTwoBulb :
    volume (mainCardioid ∪ periodTwoBulb) =
      ENNReal.ofReal (7 * Real.pi / 16) := by
  rw [measure_union disjoint_mainCardioid_periodTwoBulb isOpen_ball.measurableSet,
    volume_mainCardioid, volume_periodTwoBulb]
  rw [← ENNReal.ofReal_add
    (by positivity : 0 ≤ 3 * Real.pi / 8)
    (div_nonneg Real.pi_pos.le (by norm_num : (0 : ℝ) ≤ 16))]
  congr 1
  ring

theorem mainCardioid_union_periodTwoBulb_subset_Mandelbrot :
    mainCardioid ∪ periodTwoBulb ⊆ Mandelbrot :=
  union_subset mainCardioid_subset_Mandelbrot periodTwoBulb_subset_Mandelbrot

theorem volume_Mandelbrot_ge_seven_pi_div_sixteen :
    ENNReal.ofReal (7 * Real.pi / 16) ≤ volume Mandelbrot := by
  rw [← volume_mainCardioid_union_periodTwoBulb]
  exact measure_mono mainCardioid_union_periodTwoBulb_subset_Mandelbrot

end

end Mandelbrot
