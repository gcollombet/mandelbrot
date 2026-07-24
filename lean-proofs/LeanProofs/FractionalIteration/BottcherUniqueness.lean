/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.BottcherAnalytic
import Mathlib.Analysis.Analytic.Order

/-!
# Uniqueness of the normalized local Böttcher coordinate

The rigidity input is elementary in terms of analytic vanishing orders. If
`k(y²) = k(y)²`, `k(0)=0`, and `k'(0)=1`, then the error `d(y)=k(y)-y`
cannot have a finite first nonzero term: an error of order `m ≥ 2` would have
order `2m` on the left but order `m+1` on the right.
-/

namespace Mandelbrot

noncomputable section

open Filter Function Metric Set
open scoped Topology

/-- A normalized analytic germ commuting with squaring is the identity
germ. -/
theorem eventuallyEq_id_of_sq_equivariant
    (k : ℂ → ℂ)
    (hk : AnalyticAt ℂ k 0)
    (hk0 : k 0 = 0)
    (hkderiv : deriv k 0 = 1)
    (hsq : ∀ᶠ y in 𝓝 0, k (y ^ 2) = k y ^ 2) :
    k =ᶠ[𝓝 0] id := by
  let d : ℂ → ℂ := k - id
  have hd : AnalyticAt ℂ d 0 := by
    exact hk.sub analyticAt_id
  have hd0 : d 0 = 0 := by
    simp [d, hk0]
  have hkHas : HasDerivAt k 1 0 :=
    hk.hasStrictDerivAt.hasDerivAt.congr_deriv hkderiv
  have hdHas : HasDerivAt d 0 0 := by
    simpa [d] using hkHas.sub (hasDerivAt_id (𝕜 := ℂ) 0)
  by_cases htop : analyticOrderAt d 0 = ⊤
  · have hzero : ∀ᶠ y in 𝓝 0, d y = 0 :=
      analyticOrderAt_eq_top.mp htop
    filter_upwards [hzero] with y hy
    simpa [d] using sub_eq_zero.mp hy
  · let m : ℕ := analyticOrderNatAt d 0
    have hmorder : analyticOrderAt d 0 = (m : ℕ∞) := by
      exact (Nat.cast_analyticOrderNatAt htop).symm
    have hm2Order : (2 : ℕ∞) ≤ analyticOrderAt d 0 := by
      apply (natCast_le_analyticOrderAt_iff_iteratedDeriv_eq_zero
        (n := 2) hd).2
      intro i hi
      interval_cases i <;> simp [hd0, hdHas.deriv]
    have hm2 : 2 ≤ m := by
      rw [hmorder] at hm2Order
      exact_mod_cast hm2Order
    let sq : ℂ → ℂ := id ^ 2
    let lin : ℂ → ℂ := fun y => 2 * y
    let tail : ℂ → ℂ := lin + d
    have hsqAnalytic : AnalyticAt ℂ sq 0 := by
      exact analyticAt_id.pow 2
    have hlinAnalytic : AnalyticAt ℂ lin 0 := by
      exact analyticAt_const.mul analyticAt_id
    have hlin0 : lin 0 = 0 := by simp [lin]
    have hlinderiv : deriv lin 0 ≠ 0 := by
      have hlinHas : HasDerivAt lin 2 0 :=
        hasDerivAt_const_mul (x := (0 : ℂ)) (2 : ℂ)
      rw [hlinHas.deriv]
      norm_num
    have hlinOrder : analyticOrderAt lin 0 = 1 :=
      hlinAnalytic.analyticOrderAt_eq_one_of_zero_deriv_ne_zero
        hlin0 hlinderiv
    have htailAnalytic : AnalyticAt ℂ tail 0 :=
      hlinAnalytic.add hd
    have htailOrder : analyticOrderAt tail 0 = 1 := by
      have hadd :
          analyticOrderAt (lin + d) 0 =
            analyticOrderAt lin 0 := by
        apply analyticOrderAt_add_eq_left_of_lt
        rw [hlinOrder, hmorder]
        exact_mod_cast (show 1 < m by omega)
      simpa [tail, hlinOrder] using hadd
    have hsqOrder : analyticOrderAt sq 0 = 2 := by
      dsimp [sq]
      rw [analyticOrderAt_pow analyticAt_id, analyticOrderAt_id]
      norm_num
    have hfunctional :
        (d ∘ sq) =ᶠ[𝓝 0] (d * tail) := by
      filter_upwards [hsq] with y hy
      simp only [Function.comp_apply, Pi.mul_apply]
      dsimp [d, sq, tail, lin]
      rw [hy]
      ring
    have hleftOrder :
        analyticOrderAt (d ∘ sq) 0 =
          (m : ℕ∞) * 2 := by
      have hdAtSq0 : AnalyticAt ℂ d (sq 0) := by
        simpa [sq] using hd
      rw [hdAtSq0.analyticOrderAt_comp hsqAnalytic]
      have hsq0 : sq 0 = 0 := by simp [sq]
      have hcenter : (fun x => sq x - sq 0) = sq := by
        funext x
        simp [sq]
      rw [hcenter, hsq0]
      rw [hmorder, hsqOrder]
    have hrightOrder :
        analyticOrderAt (d * tail) 0 =
          (m : ℕ∞) + 1 := by
      rw [analyticOrderAt_mul hd htailAnalytic, hmorder, htailOrder]
    have horders :
        (m : ℕ∞) * 2 = (m : ℕ∞) + 1 := by
      rw [← hleftOrder, ← hrightOrder]
      exact analyticOrderAt_congr hfunctional
    norm_cast at horders
    omega

namespace ReciprocalBottcherGerm

@[simp] theorem gamma_zero
    {c : ℂ} (g : ReciprocalBottcherGerm c) :
    g.gamma 0 = 0 := by
  have h := g.left_inv.self_of_nhds
  simpa [g.beta_zero] using h

theorem hasDerivAt_beta_zero
    {c : ℂ} (g : ReciprocalBottcherGerm c) :
    HasDerivAt g.beta 1 0 :=
  g.beta_analytic.hasStrictDerivAt.hasDerivAt.congr_deriv
    g.deriv_beta_zero

theorem hasDerivAt_gamma_zero
    {c : ℂ} (g : ReciprocalBottcherGerm c) :
    HasDerivAt g.gamma 1 0 := by
  have hgamma :
      HasDerivAt g.gamma (deriv g.gamma 0) 0 :=
    g.gamma_analytic.hasStrictDerivAt.hasDerivAt
  have hcomp :
      HasDerivAt (g.gamma ∘ g.beta) (deriv g.gamma 0) 0 := by
    have hraw := hgamma.comp_of_eq 0 g.hasDerivAt_beta_zero
      (by simp [g.beta_zero])
    simpa only [mul_one] using hraw
  have heq :
      (g.gamma ∘ g.beta) =ᶠ[𝓝 0] (fun u => u) := by
    filter_upwards [g.left_inv] with u hu
    exact hu
  have hid :
      HasDerivAt (fun u : ℂ => u) (deriv g.gamma 0) 0 :=
    hcomp.congr_of_eventuallyEq heq.symm
  have hderiv : deriv g.gamma 0 = 1 :=
    hid.unique (hasDerivAt_id 0)
  exact hgamma.congr_deriv hderiv

/-- Transition map from one normalized reciprocal chart to another. -/
def transition
    {c : ℂ} (g₁ g₂ : ReciprocalBottcherGerm c) (y : ℂ) : ℂ :=
  g₂.beta (g₁.gamma y)

theorem transition_analytic
    {c : ℂ} (g₁ g₂ : ReciprocalBottcherGerm c) :
    AnalyticAt ℂ (transition g₁ g₂) 0 := by
  have h :=
    g₂.beta_analytic.comp_of_eq g₁.gamma_analytic g₁.gamma_zero
  change AnalyticAt ℂ (g₂.beta ∘ g₁.gamma) 0
  exact h

@[simp] theorem transition_zero
    {c : ℂ} (g₁ g₂ : ReciprocalBottcherGerm c) :
    transition g₁ g₂ 0 = 0 := by
  simp [transition, g₁.gamma_zero, g₂.beta_zero]

theorem hasDerivAt_transition_zero
    {c : ℂ} (g₁ g₂ : ReciprocalBottcherGerm c) :
    HasDerivAt (transition g₁ g₂) 1 0 := by
  have hraw := g₂.hasDerivAt_beta_zero.comp_of_eq 0
    g₁.hasDerivAt_gamma_zero (by simp [g₁.gamma_zero])
  change HasDerivAt (g₂.beta ∘ g₁.gamma) 1 0
  simpa only [mul_one] using hraw

/-- The transition map commutes locally with squaring. -/
theorem transition_sq_eventually
    {c : ℂ} (g₁ g₂ : ReciprocalBottcherGerm c) :
    ∀ᶠ y in 𝓝 0,
      transition g₁ g₂ (y ^ 2) =
        transition g₁ g₂ y ^ 2 := by
  have hgamma :
      Tendsto g₁.gamma (𝓝 0) (𝓝 0) := by
    have h := g₁.gamma_analytic.continuousAt.tendsto
    simpa [g₁.gamma_zero] using h
  have hreciprocal :
      Tendsto (reciprocalQuad c) (𝓝 0) (𝓝 0) := by
    let rho := bottcherRadius c
    have ha :
        AnalyticAt ℂ (reciprocalQuad c) 0 :=
      (analyticOnNhd_reciprocalQuad_ball
        c rho (bottcherRadius_parameter_bound c))
          0 (mem_ball_self (bottcherRadius_pos c))
    simpa using ha.continuousAt.tendsto
  have hrecGamma :
      Tendsto (fun y => reciprocalQuad c (g₁.gamma y))
        (𝓝 0) (𝓝 0) :=
    hreciprocal.comp hgamma
  filter_upwards
    [g₁.right_inv, hgamma.eventually g₁.boettcher,
      hrecGamma.eventually g₁.left_inv,
      hgamma.eventually g₂.boettcher] with
      y hright hboettcher₁ hleft hboettcher₂
  have hgammaSq :
      g₁.gamma (y ^ 2) =
        reciprocalQuad c (g₁.gamma y) := by
    calc
      g₁.gamma (y ^ 2) =
          g₁.gamma (g₁.beta (g₁.gamma y) ^ 2) := by
            rw [hright]
      _ = g₁.gamma
          (g₁.beta (reciprocalQuad c (g₁.gamma y))) := by
            rw [hboettcher₁]
      _ = reciprocalQuad c (g₁.gamma y) := hleft
  change g₂.beta (g₁.gamma (y ^ 2)) =
    g₂.beta (g₁.gamma y) ^ 2
  rw [hgammaSq]
  exact hboettcher₂

/-- The normalized transition map is the identity germ. -/
theorem transition_eventually_eq_id
    {c : ℂ} (g₁ g₂ : ReciprocalBottcherGerm c) :
    transition g₁ g₂ =ᶠ[𝓝 0] id := by
  exact eventuallyEq_id_of_sq_equivariant
    (transition g₁ g₂)
    (transition_analytic g₁ g₂)
    (transition_zero g₁ g₂)
    (hasDerivAt_transition_zero g₁ g₂).deriv
    (transition_sq_eventually g₁ g₂)

/-- The normalized reciprocal Böttcher coordinate is unique as an analytic
germ. This is the uniqueness assertion in T4.1 after `u=1/z`. -/
theorem beta_eventuallyEq
    {c : ℂ} (g₁ g₂ : ReciprocalBottcherGerm c) :
    g₁.beta =ᶠ[𝓝 0] g₂.beta := by
  have hbeta :
      Tendsto g₁.beta (𝓝 0) (𝓝 0) := by
    have h := g₁.beta_analytic.continuousAt.tendsto
    simpa [g₁.beta_zero] using h
  filter_upwards
    [g₁.left_inv,
      hbeta.eventually
        (transition_eventually_eq_id g₁ g₂)] with
      u hleft htransition
  unfold transition at htransition
  rw [hleft] at htransition
  exact htransition.symm

/-- Uniqueness transported back to infinity: every normalized reciprocal
germ produces the same exterior coordinate eventually at the cobounded
filter. -/
theorem coordinateAtInfinity_eventuallyEq
    {c : ℂ} (g : ReciprocalBottcherGerm c) :
    (fun z : ℂ => (g.beta z⁻¹)⁻¹) =ᶠ[Bornology.cobounded ℂ]
      bottcherCoordinateAtInfinity c := by
  let g₀ : ReciprocalBottcherGerm c :=
    reciprocalBottcherGerm c
  have hnear :
      g.beta =ᶠ[𝓝 0] g₀.beta :=
    beta_eventuallyEq g g₀
  have hinfinity :
      ∀ᶠ z : ℂ in Bornology.cobounded ℂ,
        g.beta z⁻¹ = g₀.beta z⁻¹ :=
    Filter.tendsto_inv₀_cobounded.eventually hnear
  filter_upwards [hinfinity] with z hz
  unfold bottcherCoordinateAtInfinity
  rw [hz]
  congr 1

end ReciprocalBottcherGerm

end

end Mandelbrot
