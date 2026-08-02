/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodDynamics
import Mathlib.Order.Filter.AtTopBot.Monoid

/-!
# Fatou's inverse-branch argument for an arbitrary finite return period

This file removes the period-two specialization from the inverse-branch
argument in `PeriodTwoBulb.lean`.  If a periodic return map has multiplier
of norm strictly smaller than one, the critical orbit must enter a locally
invariant attracting disk.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Function Metric Set
open scoped Topology NNReal

/-! ## Quantitative local attraction -/

/-- A strict derivative of norm below one yields an invariant ball together
with an explicit Lipschitz constant strictly below one. -/
theorem exists_contracting_ball_with_lipschitz
    {f : ℂ → ℂ} {p mu : ℂ}
    (hderiv : HasStrictDerivAt f mu p) (hfixed : f p = p)
    (hattract : ‖mu‖ < 1) :
    ∃ K : ℝ≥0, K < 1 ∧ ∃ rho : ℝ, 0 < rho ∧
      MapsTo f (ball p rho) (ball p rho) ∧
      LipschitzOnWith K f (ball p rho) := by
  let K : ℝ≥0 := ⟨(‖mu‖ + 1) / 2, by positivity⟩
  have hmuK : ‖mu‖₊ < K := by
    apply NNReal.coe_lt_coe.mp
    change ‖mu‖ < (‖mu‖ + 1) / 2
    linarith
  have hKoneReal : (K : ℝ) < 1 := by
    change (‖mu‖ + 1) / 2 < 1
    linarith
  have hKone : K < 1 := by exact_mod_cast hKoneReal
  have hmuK' : ‖ContinuousLinearMap.toSpanSingleton ℂ mu‖₊ < K := by
    simpa using hmuK
  obtain ⟨s, hs, hlip⟩ :=
    hderiv.hasStrictFDerivAt.exists_lipschitzOnWith_of_nnnorm_lt K hmuK'
  obtain ⟨rho, hrho, hball⟩ := Metric.mem_nhds_iff.mp hs
  have hlipBall : LipschitzOnWith K f (ball p rho) := hlip.mono hball
  have hmaps : MapsTo f (ball p rho) (ball p rho) := by
    intro z hz
    have hpball : p ∈ ball p rho := mem_ball_self hrho
    have hdist := hlipBall.dist_le_mul z hz p hpball
    rw [hfixed] at hdist
    rw [mem_ball] at hz ⊢
    calc
      dist (f z) p ≤ (K : ℝ) * dist z p := hdist
      _ < 1 * rho := by
        calc
          (K : ℝ) * dist z p ≤ 1 * dist z p :=
            mul_le_mul_of_nonneg_right hKoneReal.le dist_nonneg
          _ < 1 * rho := mul_lt_mul_of_pos_left hz zero_lt_one
      _ = rho := one_mul _
  exact ⟨K, hKone, rho, hrho, hmaps, hlipBall⟩

/-- Iterates of a locally invariant strict Lipschitz contraction converge to
its fixed point. -/
theorem tendsto_iterate_of_mapsTo_lipschitzOnWith
    {f : ℂ → ℂ} {p z : ℂ} {rho : ℝ} {K : ℝ≥0}
    (hK : K < 1) (hfixed : f p = p)
    (hmaps : MapsTo f (ball p rho) (ball p rho))
    (hlip : LipschitzOnWith K f (ball p rho))
    (hp : p ∈ ball p rho) (hz : z ∈ ball p rho) :
    Tendsto (fun n : ℕ => f^[n] z) atTop (nhds p) := by
  have hdist : ∀ n : ℕ,
      dist (f^[n] z) p ≤ (K : ℝ) ^ n * dist z p := by
    intro n
    induction n with
    | zero => simp
    | succ n ih =>
        rw [Function.iterate_succ_apply']
        calc
          dist (f (f^[n] z)) p = dist (f (f^[n] z)) (f p) := by rw [hfixed]
          _ ≤ (K : ℝ) * dist (f^[n] z) p :=
            hlip.dist_le_mul _ (hmaps.iterate n hz) p hp
          _ ≤ (K : ℝ) * ((K : ℝ) ^ n * dist z p) :=
            mul_le_mul_of_nonneg_left ih K.coe_nonneg
          _ = (K : ℝ) ^ (n + 1) * dist z p := by ring
  apply tendsto_iff_dist_tendsto_zero.2
  apply squeeze_zero (fun _ => dist_nonneg) hdist
  simpa using
    (tendsto_pow_atTop_nhds_zero_of_lt_one K.coe_nonneg
      (by exact_mod_cast hK)).mul_const (dist z p)

/-! ## Inverse branches along an arbitrary finite orbit segment -/

/-- Starting with an inverse branch normalized at the endpoint
`orbit c a k`, successively choose the square roots normalized along the
orbit segment back to `a`. -/
theorem QuadraticInverseBranchAt.liftOrbit
    {c b a : ℂ} {U : Set ℂ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U) :
    ∀ k n : ℕ, QuadraticInverseBranchAt c b (orbit c a k) U n →
      Nonempty (QuadraticInverseBranchAt c b a U (n + k)) := by
  intro k
  induction k with
  | zero =>
      intro n h
      exact ⟨by simpa using h⟩
  | succ k ih =>
      intro n h
      have hstep : quad c (orbit c a k) = orbit c a (k + 1) := by
        rw [orbit_succ]
      obtain ⟨h₁⟩ := h.succAt hUopen hUsimply hcritical hstep
      obtain ⟨h₂⟩ := ih (n + 1) h₁
      exact ⟨by
        convert h₂ using 1
        omega⟩

/-- One full reverse lift around a periodic orbit turns an inverse branch
fixing the periodic point into another such branch. -/
theorem QuadraticInverseBranch.succPeriodicCycle
    {c p : ℂ} {U : Set ℂ} {n period : ℕ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U)
    (hperiod : orbit c p period = p)
    (h : QuadraticInverseBranch c p U n) :
    Nonempty (QuadraticInverseBranch c p U (n + period)) := by
  have hstart : QuadraticInverseBranchAt c p (orbit c p period) U n := by
    simpa [hperiod] using h.toAt
  obtain ⟨hlift⟩ := hstart.liftOrbit hUopen hUsimply hcritical period n
  exact ⟨hlift.toFixed⟩

/-- Inverse branches of every return order `period * n` exist if the
critical orbit misses the simply connected domain around a periodic point. -/
theorem exists_periodicCycleInverseBranch
    {c p : ℂ} {U : Set ℂ} {period : ℕ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U)
    (hperiod : orbit c p period = p) :
    ∀ n : ℕ, Nonempty (QuadraticInverseBranch c p U (period * n)) := by
  intro n
  induction n with
  | zero => exact ⟨⟨id, differentiableOn_id, by simp [orbit], rfl⟩⟩
  | succ n ih =>
      obtain ⟨h⟩ := ih
      have hs := h.succPeriodicCycle hUopen hUsimply hcritical hperiod
      simpa [Nat.mul_succ] using hs

/-! ## Derivatives of finite return iterates -/

/-- The return map associated to a finite number of quadratic iterates. -/
def finiteReturn (c : ℂ) (period : ℕ) : ℂ → ℂ :=
  fun z => orbit c z period

theorem finiteReturn_fixed
    {c p : ℂ} {period : ℕ} (hperiod : orbit c p period = p) :
    finiteReturn c period p = p := hperiod

theorem finiteReturn_iterate_eq_orbit
    (c z : ℂ) (period n : ℕ) :
    (finiteReturn c period)^[n] z = orbit c z (period * n) := by
  change ((quad c)^[period])^[n] z = (quad c)^[period * n] z
  rw [Function.iterate_mul]

theorem hasDerivAt_finiteReturn_iterate
    {c p mu : ℂ} {period : ℕ}
    (hperiod : orbit c p period = p)
    (hderiv : HasDerivAt (finiteReturn c period) mu p) (n : ℕ) :
    HasDerivAt (fun z => orbit c z (period * n)) (mu ^ n) p := by
  have hiter := HasDerivAt.iterate p hderiv (finiteReturn_fixed hperiod) n
  exact hiter.congr_of_eventuallyEq
    (Filter.Eventually.of_forall fun z =>
      (finiteReturn_iterate_eq_orbit c z period n).symm)

/-! ## The arbitrary-period Fatou contradiction -/

/-- The inverse-branch contradiction only needs a positive invariant ball;
the quantitative contraction used to construct that ball is kept separate. -/
theorem exists_critical_entry_of_finiteReturn_invariant_ball
    (c p mu : ℂ) (period : ℕ) (rho : ℝ)
    (hperiod : orbit c p period = p)
    (hderiv : HasDerivAt (finiteReturn c period) mu p)
    (hattract : ‖mu‖ < 1) (hrho : 0 < rho)
    (_hmaps : MapsTo (finiteReturn c period) (ball p rho) (ball p rho)) :
    ∃ N : ℕ, orbit c 0 N ∈ ball p rho := by
  by_contra hnever
  push Not at hnever
  let U : Set ℂ := ball p rho
  have hUopen : IsOpen U := isOpen_ball
  have hpU : p ∈ U := by simp [U, hrho]
  have hUsimply : IsSimplyConnected U := by
    letI : ContractibleSpace U := Metric.contractibleSpace_ball hrho
    exact (show SimplyConnectedSpace U from inferInstance)
  have hbranches : ∀ n : ℕ,
      Nonempty (QuadraticInverseBranch c p U (period * n)) :=
    exists_periodicCycleInverseBranch hUopen hUsimply hnever hperiod
  let B : ℝ :=
    max (quadraticEscapeRadius c) (‖p‖ + max rho 0) + ‖p‖
  let C : ℝ := B / rho
  have hlimit : Tendsto (fun n : ℕ => ‖mu‖ ^ n * C) atTop (nhds 0) := by
    simpa using
      (tendsto_pow_atTop_nhds_zero_of_lt_one
        (norm_nonneg mu) hattract).mul_const C
  have hevent : ∀ᶠ n : ℕ in atTop, ‖mu‖ ^ n * C < 1 :=
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
    (hasDerivAt_finiteReturn_iterate hperiod hderiv n)
  have hnorm : (1 : ℝ) = ‖mu‖ ^ n * ‖deriv h p‖ := by
    calc
      (1 : ℝ) = ‖(1 : ℂ)‖ := by norm_num
      _ = ‖mu ^ n * deriv h p‖ := by rw [hid]
      _ = ‖mu‖ ^ n * ‖deriv h p‖ := by rw [norm_mul, norm_pow]
  have hle : (1 : ℝ) ≤ ‖mu‖ ^ n * C := by
    rw [hnorm]
    exact mul_le_mul_of_nonneg_left hupper (pow_nonneg (norm_nonneg _) _)
  linarith

/-- A periodic point whose finite return multiplier has norm below one
attracts the critical orbit.  More precisely, the critical orbit enters a
disk which is forward invariant under the finite return map. -/
theorem exists_finiteReturn_attracting_entry
    (c p mu : ℂ) (period : ℕ)
    (hperiod : orbit c p period = p)
    (hderiv : HasStrictDerivAt (finiteReturn c period) mu p)
    (hattract : ‖mu‖ < 1) :
    ∃ rho : ℝ, 0 < rho ∧
      MapsTo (finiteReturn c period) (ball p rho) (ball p rho) ∧
      ∃ N : ℕ, orbit c 0 N ∈ ball p rho := by
  obtain ⟨rho, hrho, hmaps⟩ := exists_contracting_ball_of_hasStrictDerivAt
    hderiv (finiteReturn_fixed hperiod) hattract
  exact ⟨rho, hrho, hmaps,
    exists_critical_entry_of_finiteReturn_invariant_ball
      c p mu period rho hperiod hderiv.hasDerivAt hattract hrho hmaps⟩

/-- The critical return subsequence produced by Fatou's argument actually
converges to the attracting periodic point. -/
theorem exists_finiteReturn_attracting_tendsto
    (c p mu : ℂ) (period : ℕ)
    (hperiod : orbit c p period = p)
    (hderiv : HasStrictDerivAt (finiteReturn c period) mu p)
    (hattract : ‖mu‖ < 1) :
    ∃ N : ℕ,
      Tendsto (fun n : ℕ => orbit c 0 (N + period * n))
        atTop (nhds p) := by
  obtain ⟨K, hK, rho, hrho, hmaps, hlip⟩ :=
    exists_contracting_ball_with_lipschitz
      hderiv (finiteReturn_fixed hperiod) hattract
  obtain ⟨N, hN⟩ :=
    exists_critical_entry_of_finiteReturn_invariant_ball
      c p mu period rho hperiod hderiv.hasDerivAt hattract hrho hmaps
  refine ⟨N, ?_⟩
  have hconv := tendsto_iterate_of_mapsTo_lipschitzOnWith hK
    (finiteReturn_fixed hperiod) hmaps hlip (mem_ball_self hrho) hN
  convert hconv using 1
  funext n
  rw [finiteReturn_iterate_eq_orbit]
  rw [show N + period * n = period * n + N by omega, orbit_add]
  rfl

/-! ## Uniqueness of the attracting periodic cycle -/

theorem tendsto_nat_affine_atTop (a b : ℕ) (hb : 0 < b) :
    Tendsto (fun n : ℕ => a + b * n) atTop atTop := by
  rw [Filter.tendsto_atTop]
  intro B
  filter_upwards [Filter.eventually_ge_atTop B] with n hn
  have hnMul : n ≤ b * n := by
    calc
      n = 1 * n := by simp
      _ ≤ b * n := Nat.mul_le_mul_right n hb
  exact hn.trans (hnMul.trans (Nat.le_add_left _ _))

theorem continuous_orbit_start (c : ℂ) :
    ∀ n : ℕ, Continuous (fun z : ℂ => orbit c z n) := by
  intro n
  induction n with
  | zero =>
      simp only [orbit_zero]
      fun_prop
  | succ n ih =>
      simp only [orbit_succ]
      exact (ih.pow 2).add continuous_const

/-- Two attracting periodic points of the same quadratic polynomial lie on
the same periodic orbit.  This is the precise finite-cycle form of “a
quadratic polynomial has at most one attracting periodic cycle”: the unique
finite critical orbit is attracted to both cycles, and a common arithmetic
subsequence cannot have two different limits. -/
theorem attracting_periodic_points_same_cycle
    (c p q mu nu : ℂ) (periodP periodQ : ℕ)
    (hperiodP_pos : 0 < periodP) (hperiodQ_pos : 0 < periodQ)
    (hperiodP : orbit c p periodP = p)
    (hperiodQ : orbit c q periodQ = q)
    (hderivP : HasStrictDerivAt (finiteReturn c periodP) mu p)
    (hderivQ : HasStrictDerivAt (finiteReturn c periodQ) nu q)
    (hattractP : ‖mu‖ < 1) (hattractQ : ‖nu‖ < 1) :
    ∃ j : ℕ, j < periodQ ∧ p = orbit c q j := by
  obtain ⟨N, hconvP⟩ := exists_finiteReturn_attracting_tendsto
    c p mu periodP hperiodP hderivP hattractP
  obtain ⟨M, hconvQ⟩ := exists_finiteReturn_attracting_tendsto
    c q nu periodQ hperiodQ hderivQ hattractQ
  let T : ℕ := N + periodP * M
  have hMT : M ≤ T := by
    calc
      M = 1 * M := by simp
      _ ≤ periodP * M := Nat.mul_le_mul_right M hperiodP_pos
      _ ≤ N + periodP * M := Nat.le_add_left _ _
  let d : ℕ := T - M
  let j : ℕ := d % periodQ
  let m : ℕ := d / periodQ
  have hj : j < periodQ := by
    dsimp [j]
    exact Nat.mod_lt d hperiodQ_pos
  have hd : d = j + periodQ * m := by
    dsimp [j, m]
    exact (Nat.mod_add_div d periodQ).symm
  have hT : T = M + d := by
    dsimp [d]
    omega
  let common : ℕ → ℂ := fun k =>
    orbit c 0 (T + periodP * periodQ * k)
  have hindexP : Tendsto (fun k : ℕ => M + periodQ * k) atTop atTop :=
    tendsto_nat_affine_atTop M periodQ hperiodQ_pos
  have hcommonP : Tendsto common atTop (nhds p) := by
    have hsub := hconvP.comp hindexP
    refine hsub.congr' (Filter.Eventually.of_forall fun k => ?_)
    apply congrArg (orbit c 0)
    dsimp only [common, T, Function.comp_apply]
    ring
  have hindexQ : Tendsto (fun k : ℕ => m + periodP * k) atTop atTop :=
    tendsto_nat_affine_atTop m periodP hperiodP_pos
  have hsubQ := hconvQ.comp hindexQ
  have hphase := (continuous_orbit_start c j).continuousAt.tendsto.comp hsubQ
  have hcommonQ : Tendsto common atTop (nhds (orbit c q j)) := by
    refine hphase.congr' (Filter.Eventually.of_forall fun k => ?_)
    dsimp only [Function.comp_apply]
    have hindex : T + periodP * periodQ * k =
        j + (M + periodQ * (m + periodP * k)) := by
      rw [hT, hd]
      ring
    change orbit c (orbit c 0 (M + periodQ * (m + periodP * k))) j =
      common k
    calc
      orbit c (orbit c 0 (M + periodQ * (m + periodP * k))) j =
          (quad c)^[j] (orbit c 0 (M + periodQ * (m + periodP * k))) := rfl
      _ = orbit c 0 (j + (M + periodQ * (m + periodP * k))) :=
        (orbit_add c 0 j (M + periodQ * (m + periodP * k))).symm
      _ = common k := by rw [← hindex]
  exact ⟨j, hj, tendsto_nhds_unique hcommonP hcommonQ⟩

/-! ## Boundedness after entry into an invariant return disk -/

/-- A monotone real bound for the first `n` quadratic iterates of any point
whose initial norm is at most `A`. -/
def finiteOrbitNormBound (c : ℂ) (A : ℝ) : ℕ → ℝ
  | 0 => max A 0
  | n + 1 =>
      max (finiteOrbitNormBound c A n)
        ((finiteOrbitNormBound c A n) ^ 2 + ‖c‖)

theorem finiteOrbitNormBound_nonneg (c : ℂ) (A : ℝ) :
    ∀ n : ℕ, 0 ≤ finiteOrbitNormBound c A n := by
  intro n
  induction n with
  | zero => exact le_max_right _ _
  | succ n ih => exact ih.trans (le_max_left _ _)

theorem finiteOrbitNormBound_monotone (c : ℂ) (A : ℝ) :
    Monotone (finiteOrbitNormBound c A) := by
  apply monotone_nat_of_le_succ
  intro n
  exact le_max_left (finiteOrbitNormBound c A n)
    ((finiteOrbitNormBound c A n) ^ 2 + ‖c‖)

theorem norm_orbit_le_finiteOrbitNormBound
    (c z : ℂ) (A : ℝ) (hz : ‖z‖ ≤ A) :
    ∀ n : ℕ, ‖orbit c z n‖ ≤ finiteOrbitNormBound c A n := by
  intro n
  induction n with
  | zero =>
      change ‖z‖ ≤ max A 0
      exact hz.trans (le_max_left A 0)
  | succ n ih =>
      rw [orbit_succ]
      calc
        ‖quad c (orbit c z n)‖ ≤ ‖orbit c z n‖ ^ 2 + ‖c‖ := by
          simp only [quad]
          exact (norm_add_le _ _).trans_eq (by rw [norm_pow])
        _ ≤ (finiteOrbitNormBound c A n) ^ 2 + ‖c‖ := by
          gcongr
        _ ≤ finiteOrbitNormBound c A (n + 1) := le_max_right _ _

theorem orbit_period_mul_mem_of_finiteReturn_mapsTo
    (c p z : ℂ) (rho : ℝ) (period : ℕ)
    (hmaps : MapsTo (finiteReturn c period) (ball p rho) (ball p rho))
    (hz : z ∈ ball p rho) :
    ∀ n : ℕ, orbit c z (period * n) ∈ ball p rho := by
  intro n
  rw [← finiteReturn_iterate_eq_orbit]
  exact hmaps.iterate n hz

/-- Entry into a disk invariant under a positive finite return period makes
the entire critical orbit bounded, including every residue class modulo the
period. -/
theorem mem_Mandelbrot_of_finiteReturn_entry
    (c p : ℂ) (rho : ℝ) (period : ℕ) (hperiod : 0 < period)
    (hrho : 0 < rho)
    (hmaps : MapsTo (finiteReturn c period) (ball p rho) (ball p rho))
    (hentry : ∃ N : ℕ, orbit c 0 N ∈ ball p rho) :
    c ∈ Mandelbrot := by
  obtain ⟨N, hN⟩ := hentry
  let A : ℝ := ‖p‖ + rho
  let R₀ : ℝ := max (quadraticEscapeRadius c) A
  let D : ℝ := finiteOrbitNormBound c A period
  let R : ℝ := max R₀ D
  have hNnorm : ‖orbit c 0 N‖ ≤ A :=
    norm_le_center_add_radius_of_mem_ball hrho.le hN
  have hR₀escape : quadraticEscapeRadius c ≤ R₀ :=
    le_max_left _ _
  have hR₀R : R₀ ≤ R := le_max_left _ _
  have hAR₀ : A ≤ R₀ := le_max_right _ _
  have hDR : D ≤ R := le_max_right _ _
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
    let j : ℕ := d % period
    let k : ℕ := d / period
    have hj : j < period := by
      dsimp [j]
      exact Nat.mod_lt d hperiod
    have hdjk : d = j + period * k := by
      dsimp [j, k]
      exact (Nat.mod_add_div d period).symm
    let y : ℂ := orbit c (orbit c 0 N) (period * k)
    have hy : y ∈ ball p rho := by
      dsimp [y]
      exact orbit_period_mul_mem_of_finiteReturn_mapsTo
        c p (orbit c 0 N) rho period hmaps hN k
    have hyA : ‖y‖ ≤ A :=
      norm_le_center_add_radius_of_mem_ball hrho.le hy
    have heq : orbit c 0 n = orbit c y j := by
      calc
        orbit c 0 n = orbit c 0 (d + N) := by rw [hnd]
        _ = orbit c (orbit c 0 N) d := orbit_add c 0 d N
        _ = orbit c y j := by
          change (quad c)^[d] (orbit c 0 N) = (quad c)^[j] y
          rw [hdjk, Function.iterate_add_apply]
          rfl
    rw [heq]
    have hjbound : ‖orbit c y j‖ ≤ finiteOrbitNormBound c A j :=
      norm_orbit_le_finiteOrbitNormBound c y A hyA j
    exact hjbound.trans
      ((finiteOrbitNormBound_monotone c A hj.le).trans hDR)

/-! ## Immediate low-period instances -/

theorem exists_periodThree_attracting_entry
    (c z : ℂ) (hz : periodThreeDynatomic c z = 0)
    (hattract : ‖periodThreeReturnMultiplier c z‖ < 1) :
    ∃ rho : ℝ, 0 < rho ∧
      MapsTo (finiteReturn c 3) (ball z rho) (ball z rho) ∧
      ∃ N : ℕ, orbit c 0 N ∈ ball z rho := by
  exact exists_finiteReturn_attracting_entry c z
    (periodThreeReturnMultiplier c z) 3
    (orbit_three_eq_of_dynatomic_eq_zero hz)
    (by
      change HasStrictDerivAt (fun w => orbit c w 3)
        (periodThreeReturnMultiplier c z) z
      exact hasStrictDerivAt_orbit_three c z)
    hattract

theorem exists_periodFour_attracting_entry
    (c z : ℂ) (hz : periodFourDynatomic c z = 0)
    (hattract : ‖periodFourReturnMultiplier c z‖ < 1) :
    ∃ rho : ℝ, 0 < rho ∧
      MapsTo (finiteReturn c 4) (ball z rho) (ball z rho) ∧
      ∃ N : ℕ, orbit c 0 N ∈ ball z rho := by
  exact exists_finiteReturn_attracting_entry c z
    (periodFourReturnMultiplier c z) 4
    (orbit_four_eq_of_dynatomic_eq_zero hz)
    (by
      change HasStrictDerivAt (fun w => orbit c w 4)
        (periodFourReturnMultiplier c z) z
      exact hasStrictDerivAt_orbit_four c z)
    hattract

theorem mem_Mandelbrot_of_periodThree_dynatomic
    (c z : ℂ) (hz : periodThreeDynatomic c z = 0)
    (hattract : ‖periodThreeReturnMultiplier c z‖ < 1) :
    c ∈ Mandelbrot := by
  obtain ⟨rho, hrho, hmaps, hentry⟩ :=
    exists_periodThree_attracting_entry c z hz hattract
  exact mem_Mandelbrot_of_finiteReturn_entry
    c z rho 3 (by norm_num) hrho hmaps hentry

theorem mem_Mandelbrot_of_periodFour_dynatomic
    (c z : ℂ) (hz : periodFourDynatomic c z = 0)
    (hattract : ‖periodFourReturnMultiplier c z‖ < 1) :
    c ∈ Mandelbrot := by
  obtain ⟨rho, hrho, hmaps, hentry⟩ :=
    exists_periodFour_attracting_entry c z hz hattract
  exact mem_Mandelbrot_of_finiteReturn_entry
    c z rho 4 (by norm_num) hrho hmaps hentry

/-- A root of the exact period-three multiplier equation in the open unit
multiplier disk is dynamically realized and hence belongs to `Mandelbrot`. -/
theorem mem_Mandelbrot_of_periodThreeMultiplierEquation
    (c mu : ℂ) (hmuNorm : ‖mu‖ < 1)
    (hroot : periodThreeMultiplierEquation c mu = 0) :
    c ∈ Mandelbrot := by
  obtain ⟨z, hz, hreturn⟩ :=
    exists_periodThree_dynatomic_of_multiplierEquation c mu hmuNorm hroot
  apply mem_Mandelbrot_of_periodThree_dynatomic c z hz
  rwa [hreturn]

/-- A root of the exact period-four multiplier equation in the open unit
multiplier disk is dynamically realized and hence belongs to `Mandelbrot`. -/
theorem mem_Mandelbrot_of_periodFourMultiplierEquation
    (c mu : ℂ) (hmuNorm : ‖mu‖ < 1)
    (hroot : periodFourMultiplierEquation c mu = 0) :
    c ∈ Mandelbrot := by
  obtain ⟨z, hz, hreturn⟩ :=
    exists_periodFour_dynatomic_of_multiplierEquation c mu hmuNorm hroot
  apply mem_Mandelbrot_of_periodFour_dynatomic c z hz
  rwa [hreturn]

/-! ## Multiplier uniqueness and low-period separation -/

theorem periodThreeReturnMultiplier_eq_of_same_cycle
    (c p q : ℂ) (j : ℕ) (hj : j < 3)
    (hq : orbit c q 3 = q) (hp : p = orbit c q j) :
    periodThreeReturnMultiplier c p = periodThreeReturnMultiplier c q := by
  subst p
  interval_cases j
  · rfl
  · change 8 * orbit c q 1 * orbit c q 2 * orbit c q 3 =
      8 * q * orbit c q 1 * orbit c q 2
    rw [hq]
    ring
  · have hq4 : orbit c q 4 = orbit c q 1 := by
      rw [orbit_succ, hq]
      rfl
    change 8 * orbit c q 2 * orbit c q 3 * orbit c q 4 =
      8 * q * orbit c q 1 * orbit c q 2
    rw [hq, hq4]
    ring

theorem periodFourReturnMultiplier_eq_of_same_cycle
    (c p q : ℂ) (j : ℕ) (hj : j < 4)
    (hq : orbit c q 4 = q) (hp : p = orbit c q j) :
    periodFourReturnMultiplier c p = periodFourReturnMultiplier c q := by
  subst p
  have hq5 : orbit c q 5 = orbit c q 1 := by
    rw [orbit_succ, hq]
    rfl
  have hq6 : orbit c q 6 = orbit c q 2 := by
    rw [orbit_succ, hq5]
    rfl
  interval_cases j
  · rfl
  · change 16 * orbit c q 1 * orbit c q 2 * orbit c q 3 * orbit c q 4 =
      16 * q * orbit c q 1 * orbit c q 2 * orbit c q 3
    rw [hq]
    ring
  · change 16 * orbit c q 2 * orbit c q 3 * orbit c q 4 * orbit c q 5 =
      16 * q * orbit c q 1 * orbit c q 2 * orbit c q 3
    rw [hq, hq5]
    ring
  · change 16 * orbit c q 3 * orbit c q 4 * orbit c q 5 * orbit c q 6 =
      16 * q * orbit c q 1 * orbit c q 2 * orbit c q 3
    rw [hq, hq5, hq6]
    ring

theorem periodThreeMultiplier_eq_of_same_parameter
    (c mu nu : ℂ) (hmuNorm : ‖mu‖ < 1) (hnuNorm : ‖nu‖ < 1)
    (hmuRoot : periodThreeMultiplierEquation c mu = 0)
    (hnuRoot : periodThreeMultiplierEquation c nu = 0) :
    mu = nu := by
  obtain ⟨p, hpDyn, hpMu⟩ :=
    exists_periodThree_dynatomic_of_multiplierEquation c mu hmuNorm hmuRoot
  obtain ⟨q, hqDyn, hqNu⟩ :=
    exists_periodThree_dynatomic_of_multiplierEquation c nu hnuNorm hnuRoot
  obtain ⟨j, hj, hpq⟩ := attracting_periodic_points_same_cycle
    c p q mu nu 3 3 (by norm_num) (by norm_num)
    (orbit_three_eq_of_dynatomic_eq_zero hpDyn)
    (orbit_three_eq_of_dynatomic_eq_zero hqDyn)
    (by
      rw [← hpMu]
      change HasStrictDerivAt (fun w => orbit c w 3)
        (periodThreeReturnMultiplier c p) p
      exact hasStrictDerivAt_orbit_three c p)
    (by
      rw [← hqNu]
      change HasStrictDerivAt (fun w => orbit c w 3)
        (periodThreeReturnMultiplier c q) q
      exact hasStrictDerivAt_orbit_three c q)
    hmuNorm hnuNorm
  have hmult := periodThreeReturnMultiplier_eq_of_same_cycle c p q j hj
    (orbit_three_eq_of_dynatomic_eq_zero hqDyn) hpq
  rwa [hpMu, hqNu] at hmult

theorem periodFourMultiplier_eq_of_same_parameter
    (c mu nu : ℂ) (hmuNorm : ‖mu‖ < 1) (hnuNorm : ‖nu‖ < 1)
    (hmuRoot : periodFourMultiplierEquation c mu = 0)
    (hnuRoot : periodFourMultiplierEquation c nu = 0) :
    mu = nu := by
  obtain ⟨p, hpDyn, hpMu⟩ :=
    exists_periodFour_dynatomic_of_multiplierEquation c mu hmuNorm hmuRoot
  obtain ⟨q, hqDyn, hqNu⟩ :=
    exists_periodFour_dynatomic_of_multiplierEquation c nu hnuNorm hnuRoot
  obtain ⟨j, hj, hpq⟩ := attracting_periodic_points_same_cycle
    c p q mu nu 4 4 (by norm_num) (by norm_num)
    (orbit_four_eq_of_dynatomic_eq_zero hpDyn)
    (orbit_four_eq_of_dynatomic_eq_zero hqDyn)
    (by
      rw [← hpMu]
      change HasStrictDerivAt (fun w => orbit c w 4)
        (periodFourReturnMultiplier c p) p
      exact hasStrictDerivAt_orbit_four c p)
    (by
      rw [← hqNu]
      change HasStrictDerivAt (fun w => orbit c w 4)
        (periodFourReturnMultiplier c q) q
      exact hasStrictDerivAt_orbit_four c q)
    hmuNorm hnuNorm
  have hmult := periodFourReturnMultiplier_eq_of_same_cycle c p q j hj
    (orbit_four_eq_of_dynatomic_eq_zero hqDyn) hpq
  rwa [hpMu, hqNu] at hmult

theorem periodThree_parameter_ne_periodFour_parameter
    (c mu nu : ℂ) (hmuNorm : ‖mu‖ < 1) (hnuNorm : ‖nu‖ < 1)
    (hmuRoot : periodThreeMultiplierEquation c mu = 0)
    (hnuRoot : periodFourMultiplierEquation c nu = 0) : False := by
  obtain ⟨p, hpDyn, hpMu⟩ :=
    exists_periodThree_dynatomic_of_multiplierEquation c mu hmuNorm hmuRoot
  obtain ⟨q, hqDyn, hqNu⟩ :=
    exists_periodFour_dynatomic_of_multiplierEquation c nu hnuNorm hnuRoot
  have hp3 := orbit_three_eq_of_dynatomic_eq_zero hpDyn
  have hq4 := orbit_four_eq_of_dynatomic_eq_zero hqDyn
  obtain ⟨j, hj, hpq⟩ := attracting_periodic_points_same_cycle
    c p q mu nu 3 4 (by norm_num) (by norm_num) hp3 hq4
    (by
      rw [← hpMu]
      change HasStrictDerivAt (fun w => orbit c w 3)
        (periodThreeReturnMultiplier c p) p
      exact hasStrictDerivAt_orbit_three c p)
    (by
      rw [← hqNu]
      change HasStrictDerivAt (fun w => orbit c w 4)
        (periodFourReturnMultiplier c q) q
      exact hasStrictDerivAt_orbit_four c q)
    hmuNorm hnuNorm
  have hp4 : orbit c p 4 = p := by
    rw [hpq]
    calc
      orbit c (orbit c q j) 4 = orbit c q (4 + j) :=
        (orbit_add c q 4 j).symm
      _ = orbit c q (j + 4) := by rw [Nat.add_comm]
      _ = orbit c (orbit c q 4) j := orbit_add c q j 4
      _ = orbit c q j := by rw [hq4]
  have hp1 : orbit c p 1 = p := by
    calc
      orbit c p 1 = quad c p := orbit_succ c p 0
      _ = quad c (orbit c p 3) := congrArg (quad c) hp3.symm
      _ = orbit c p 4 := (orbit_succ c p 3).symm
      _ = p := hp4
  have hpMuOne : periodThreeReturnMultiplier c p = 1 := by
    simp only [periodThreeDynatomic, periodThreeReturnMultiplier, orbit,
      Function.iterate_succ_apply', Function.iterate_zero_apply, quad] at hpDyn hp1 ⊢
    grobner (config := { ringSteps := 1000000 })
  have hmuOne : mu = 1 := hpMu.symm.trans hpMuOne
  rw [hmuOne] at hmuNorm
  norm_num at hmuNorm

/-! ## Injective and disjoint global sheets -/

def periodThreeSheetParameter
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (mu : OpenUnitMultiplierDisk) : ℂ :=
  (S mu).1.2

def periodFourSheetParameter
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (mu : OpenUnitMultiplierDisk) : ℂ :=
  (S mu).1.2

theorem periodThree_globalSheet_equation
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    (mu : OpenUnitMultiplierDisk) :
    periodThreeMultiplierEquation (periodThreeSheetParameter S mu) mu = 0 := by
  have hcurve := periodThree_curve_equation (S mu)
  have hproj : periodThreeMultiplierProjection (S mu) = mu := by
    simpa using congrFun hS mu
  change periodThreeMultiplierEquation (periodThreeSheetParameter S mu)
    (periodThreeMultiplierProjection (S mu) : ℂ) = 0 at hcurve
  rwa [hproj] at hcurve

theorem periodFour_globalSheet_equation
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    (mu : OpenUnitMultiplierDisk) :
    periodFourMultiplierEquation (periodFourSheetParameter S mu) mu = 0 := by
  have hcurve := periodFour_curve_equation (S mu)
  have hproj : periodFourMultiplierProjection (S mu) = mu := by
    simpa using congrFun hS mu
  change periodFourMultiplierEquation (periodFourSheetParameter S mu)
    (periodFourMultiplierProjection (S mu) : ℂ) = 0 at hcurve
  rwa [hproj] at hcurve

theorem periodThreeSheetParameter_injective
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _) :
    Function.Injective (periodThreeSheetParameter S) := by
  intro mu nu hparameter
  apply Subtype.ext
  apply periodThreeMultiplier_eq_of_same_parameter
    (periodThreeSheetParameter S mu) mu nu
  · exact (mem_openUnitMultiplierDisk_iff mu).mp mu.2
  · exact (mem_openUnitMultiplierDisk_iff nu).mp nu.2
  · exact periodThree_globalSheet_equation S hS mu
  · rw [hparameter]
    exact periodThree_globalSheet_equation S hS nu

theorem periodFourSheetParameter_injective
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _) :
    Function.Injective (periodFourSheetParameter S) := by
  intro mu nu hparameter
  apply Subtype.ext
  apply periodFourMultiplier_eq_of_same_parameter
    (periodFourSheetParameter S mu) mu nu
  · exact (mem_openUnitMultiplierDisk_iff mu).mp mu.2
  · exact (mem_openUnitMultiplierDisk_iff nu).mp nu.2
  · exact periodFour_globalSheet_equation S hS mu
  · rw [hparameter]
    exact periodFour_globalSheet_equation S hS nu

theorem periodThree_globalSheets_eq_of_eq_at
    (S T : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    (hT : periodThreeMultiplierProjection ∘ T = ContinuousMap.id _)
    (mu : OpenUnitMultiplierDisk) (hmu : S mu = T mu) : S = T := by
  letI : ContractibleSpace OpenUnitMultiplierDisk :=
    (convex_ball (0 : ℂ) (1 : ℝ)).contractibleSpace ⟨0, by simp⟩
  letI : SimplyConnectedSpace OpenUnitMultiplierDisk :=
    SimplyConnectedSpace.ofContractible OpenUnitMultiplierDisk
  letI : LocPathConnectedSpace OpenUnitMultiplierDisk :=
    (isOpen_ball : IsOpen (ball (0 : ℂ) 1)).locPathConnectedSpace
  have hbase : periodThreeMultiplierProjection (S mu) =
      (ContinuousMap.id OpenUnitMultiplierDisk) mu := by
    simpa using congrFun hS mu
  obtain ⟨F, hF, hunique⟩ :=
    periodThreeMultiplierProjection_isCoveringMap.existsUnique_continuousMap_lifts
      (ContinuousMap.id _) mu (S mu) hbase
  have hSF : S = F := hunique S ⟨rfl, hS⟩
  have hTF : T = F := hunique T ⟨hmu.symm, hT⟩
  exact hSF.trans hTF.symm

theorem periodFour_globalSheets_eq_of_eq_at
    (S T : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    (hT : periodFourMultiplierProjection ∘ T = ContinuousMap.id _)
    (mu : OpenUnitMultiplierDisk) (hmu : S mu = T mu) : S = T := by
  letI : ContractibleSpace OpenUnitMultiplierDisk :=
    (convex_ball (0 : ℂ) (1 : ℝ)).contractibleSpace ⟨0, by simp⟩
  letI : SimplyConnectedSpace OpenUnitMultiplierDisk :=
    SimplyConnectedSpace.ofContractible OpenUnitMultiplierDisk
  letI : LocPathConnectedSpace OpenUnitMultiplierDisk :=
    (isOpen_ball : IsOpen (ball (0 : ℂ) 1)).locPathConnectedSpace
  have hbase : periodFourMultiplierProjection (S mu) =
      (ContinuousMap.id OpenUnitMultiplierDisk) mu := by
    simpa using congrFun hS mu
  obtain ⟨F, hF, hunique⟩ :=
    periodFourMultiplierProjection_isCoveringMap.existsUnique_continuousMap_lifts
      (ContinuousMap.id _) mu (S mu) hbase
  have hSF : S = F := hunique S ⟨rfl, hS⟩
  have hTF : T = F := hunique T ⟨hmu.symm, hT⟩
  exact hSF.trans hTF.symm

theorem disjoint_periodThreeSheetParameter_ranges
    (c d : ℂ) (hc : periodThreeCenterEquation c = 0)
    (hd : periodThreeCenterEquation d = 0) (hcd : c ≠ d)
    (S T : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodThreeCenterCurvePoint c hc)
    (hT0 : T multiplierDiskZero = periodThreeCenterCurvePoint d hd)
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    (hT : periodThreeMultiplierProjection ∘ T = ContinuousMap.id _) :
    Disjoint (Set.range (periodThreeSheetParameter S))
      (Set.range (periodThreeSheetParameter T)) := by
  rw [Set.disjoint_left]
  rintro x ⟨mu, rfl⟩ ⟨nu, hparameter⟩
  have hmunu : mu = nu := by
    apply Subtype.ext
    apply periodThreeMultiplier_eq_of_same_parameter
      (periodThreeSheetParameter S mu) mu nu
    · exact (mem_openUnitMultiplierDisk_iff mu).mp mu.2
    · exact (mem_openUnitMultiplierDisk_iff nu).mp nu.2
    · exact periodThree_globalSheet_equation S hS mu
    · have hroot := periodThree_globalSheet_equation T hT nu
      rwa [hparameter] at hroot
  subst nu
  have hSproj : periodThreeMultiplierProjection (S mu) = mu := by
    simpa using congrFun hS mu
  have hTproj : periodThreeMultiplierProjection (T mu) = mu := by
    simpa using congrFun hT mu
  have hpoint : S mu = T mu := by
    apply Subtype.ext
    apply Prod.ext
    · change periodThreeMultiplierProjection (S mu) =
        periodThreeMultiplierProjection (T mu)
      exact hSproj.trans hTproj.symm
    · exact hparameter.symm
  have hST := periodThree_globalSheets_eq_of_eq_at S T hS hT mu hpoint
  have hzero := DFunLike.congr_fun hST multiplierDiskZero
  rw [hS0, hT0] at hzero
  apply hcd
  exact congrArg (fun p : PeriodThreeMultiplierCurve => p.1.2) hzero

theorem disjoint_periodFourSheetParameter_ranges
    (c d : ℂ) (hc : periodFourCenterEquation c = 0)
    (hd : periodFourCenterEquation d = 0) (hcd : c ≠ d)
    (S T : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodFourCenterCurvePoint c hc)
    (hT0 : T multiplierDiskZero = periodFourCenterCurvePoint d hd)
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    (hT : periodFourMultiplierProjection ∘ T = ContinuousMap.id _) :
    Disjoint (Set.range (periodFourSheetParameter S))
      (Set.range (periodFourSheetParameter T)) := by
  rw [Set.disjoint_left]
  rintro x ⟨mu, rfl⟩ ⟨nu, hparameter⟩
  have hmunu : mu = nu := by
    apply Subtype.ext
    apply periodFourMultiplier_eq_of_same_parameter
      (periodFourSheetParameter S mu) mu nu
    · exact (mem_openUnitMultiplierDisk_iff mu).mp mu.2
    · exact (mem_openUnitMultiplierDisk_iff nu).mp nu.2
    · exact periodFour_globalSheet_equation S hS mu
    · have hroot := periodFour_globalSheet_equation T hT nu
      rwa [hparameter] at hroot
  subst nu
  have hSproj : periodFourMultiplierProjection (S mu) = mu := by
    simpa using congrFun hS mu
  have hTproj : periodFourMultiplierProjection (T mu) = mu := by
    simpa using congrFun hT mu
  have hpoint : S mu = T mu := by
    apply Subtype.ext
    apply Prod.ext
    · change periodFourMultiplierProjection (S mu) =
        periodFourMultiplierProjection (T mu)
      exact hSproj.trans hTproj.symm
    · exact hparameter.symm
  have hST := periodFour_globalSheets_eq_of_eq_at S T hS hT mu hpoint
  have hzero := DFunLike.congr_fun hST multiplierDiskZero
  rw [hS0, hT0] at hzero
  apply hcd
  exact congrArg (fun p : PeriodFourMultiplierCurve => p.1.2) hzero

theorem disjoint_periodThree_periodFourSheetParameter_ranges
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (T : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    (hT : periodFourMultiplierProjection ∘ T = ContinuousMap.id _) :
    Disjoint (Set.range (periodThreeSheetParameter S))
      (Set.range (periodFourSheetParameter T)) := by
  rw [Set.disjoint_left]
  rintro x ⟨mu, rfl⟩ ⟨nu, hparameter⟩
  apply periodThree_parameter_ne_periodFour_parameter
    (periodThreeSheetParameter S mu) mu nu
  · exact (mem_openUnitMultiplierDisk_iff mu).mp mu.2
  · exact (mem_openUnitMultiplierDisk_iff nu).mp nu.2
  · exact periodThree_globalSheet_equation S hS mu
  · have hroot := periodFour_globalSheet_equation T hT nu
    rwa [hparameter] at hroot

end

end Mandelbrot
