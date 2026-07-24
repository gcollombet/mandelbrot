/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.BottcherUniqueness
import Mathlib.Analysis.Calculus.Deriv.Slope
import Mathlib.Analysis.Complex.RemovableSingularity

/-!
# Uniqueness of arbitrary normalized Böttcher charts at infinity

This file supplies the removable-singularity bridge left implicit in the
reciprocal-germ uniqueness theorem. An exterior chart `ψ` with
`ψ(z) / z → 1` gives

`β(0) = 0`, `β(u) = 1 / ψ(1/u)` for `u ≠ 0`.

The normalization implies `β(u) / u → 1`, hence `β'(0)=1`. Holomorphy on a
punctured neighborhood and continuity at zero make the singularity removable.
The already-proved reciprocal-germ rigidity then compares any two exterior
charts.
-/

namespace Mandelbrot

noncomputable section

open Filter Function Metric Set
open scoped Topology

/-- Reciprocal extension of an arbitrary exterior Böttcher chart, with the
value at the removable singularity fixed to zero. -/
def BottcherInfinityChart.reciprocalExtension
    {c : ℂ} (g : BottcherInfinityChart c) (u : ℂ) : ℂ :=
  if u = 0 then 0 else (g.psi u⁻¹)⁻¹

@[simp] theorem BottcherInfinityChart.reciprocalExtension_zero
    {c : ℂ} (g : BottcherInfinityChart c) :
    g.reciprocalExtension 0 = 0 := by
  simp [BottcherInfinityChart.reciprocalExtension]

theorem BottcherInfinityChart.reciprocalExtension_of_ne
    {c : ℂ} (g : BottcherInfinityChart c)
    {u : ℂ} (hu : u ≠ 0) :
    g.reciprocalExtension u = (g.psi u⁻¹)⁻¹ := by
  simp [BottcherInfinityChart.reciprocalExtension, hu]

/-- Algebraic form of the asymptotic normalization after `u=1/z`. -/
theorem BottcherInfinityChart.reciprocalExtension_div
    {c : ℂ} (g : BottcherInfinityChart c)
    {u : ℂ} (hu : u ≠ 0) :
    g.reciprocalExtension u / u =
      (g.psi u⁻¹ / u⁻¹)⁻¹ := by
  rw [g.reciprocalExtension_of_ne hu]
  field_simp [hu]

/-- The exterior normalization is exactly `β(u)/u → 1` in reciprocal
coordinates. -/
theorem BottcherInfinityChart.tendsto_reciprocalExtension_div
    {c : ℂ} (g : BottcherInfinityChart c) :
    Tendsto (fun u : ℂ => g.reciprocalExtension u / u)
      (𝓝[≠] 0) (𝓝 1) := by
  have hratio :
      Tendsto (fun u : ℂ => g.psi u⁻¹ / u⁻¹)
        (𝓝[≠] 0) (𝓝 1) :=
    g.normalized.comp Filter.tendsto_inv₀_nhdsNE_zero
  have hinv :
      Tendsto (fun u : ℂ => (g.psi u⁻¹ / u⁻¹)⁻¹)
        (𝓝[≠] 0) (𝓝 1) := by
    have hraw :=
      (continuousAt_inv₀
        (show (1 : ℂ) ≠ 0 by norm_num)).tendsto.comp hratio
    change Tendsto
      (Inv.inv ∘ fun u : ℂ => g.psi u⁻¹ / u⁻¹)
      (𝓝[≠] 0) (𝓝 1)
    simpa only [inv_one] using hraw
  apply hinv.congr'
  filter_upwards [self_mem_nhdsWithin] with u hu
  exact (g.reciprocalExtension_div hu).symm

/-- The reciprocal extension has the normalized derivative `β'(0)=1`. -/
theorem BottcherInfinityChart.hasDerivAt_reciprocalExtension_zero
    {c : ℂ} (g : BottcherInfinityChart c) :
    HasDerivAt g.reciprocalExtension 1 0 := by
  rw [hasDerivAt_iff_tendsto_slope]
  apply g.tendsto_reciprocalExtension_div.congr'
  filter_upwards [self_mem_nhdsWithin] with u _hu
  rw [slope_def_field]
  simp

/-- Inversion sends a sufficiently small punctured neighborhood of zero into
the exterior domain of the chart. -/
theorem BottcherInfinityChart.eventually_inv_mem_exterior
    {c : ℂ} (g : BottcherInfinityChart c) :
    ∀ᶠ u : ℂ in 𝓝[≠] 0,
      u⁻¹ ∈ exteriorDomain g.R := by
  have hext :
      ∀ᶠ z : ℂ in Bornology.cobounded ℂ,
        z ∈ exteriorDomain g.R := by
    filter_upwards
      [eventually_cobounded_le_norm (E := ℂ) (g.R + 1)] with z hz
    change g.R < ‖z‖
    linarith
  exact Filter.tendsto_inv₀_nhdsNE_zero.eventually hext

/-- The exterior normalization also ensures that the chart is nonzero
eventually at infinity. -/
theorem BottcherInfinityChart.eventually_ratio_ne_zero
    {c : ℂ} (g : BottcherInfinityChart c) :
    ∀ᶠ u : ℂ in 𝓝[≠] 0,
      g.psi u⁻¹ / u⁻¹ ≠ 0 := by
  have hratio :
      Tendsto (fun u : ℂ => g.psi u⁻¹ / u⁻¹)
        (𝓝[≠] 0) (𝓝 1) :=
    g.normalized.comp Filter.tendsto_inv₀_nhdsNE_zero
  exact hratio.eventually_ne (by norm_num)

/-- Holomorphy of the reciprocal extension away from the origin. -/
theorem BottcherInfinityChart.eventually_differentiableAt_reciprocalExtension
    {c : ℂ} (g : BottcherInfinityChart c) :
    ∀ᶠ u : ℂ in 𝓝[≠] 0,
      DifferentiableAt ℂ g.reciprocalExtension u := by
  filter_upwards
    [g.eventually_inv_mem_exterior,
      g.eventually_ratio_ne_zero,
      self_mem_nhdsWithin] with u huExterior hratio hu0
  have hpsi0 : g.psi u⁻¹ ≠ 0 := by
    intro hzero
    apply hratio
    simp [hzero]
  have hpsi :
      AnalyticAt ℂ g.psi u⁻¹ :=
    g.psi_analytic u⁻¹ huExterior
  have hinv :
      AnalyticAt ℂ (Inv.inv : ℂ → ℂ) u :=
    analyticAt_inv hu0
  have hcomp :
      AnalyticAt ℂ (fun w : ℂ => g.psi w⁻¹) u := by
    change AnalyticAt ℂ
      (g.psi ∘ (Inv.inv : ℂ → ℂ)) u
    exact hpsi.comp hinv
  have hreciprocal :
      AnalyticAt ℂ (fun w : ℂ => (g.psi w⁻¹)⁻¹) u :=
    hcomp.inv hpsi0
  apply (hreciprocal.congr ?_).differentiableAt
  filter_upwards [eventually_ne_nhds hu0] with w hw
  simp [BottcherInfinityChart.reciprocalExtension, hw]

/-- The apparent singularity of the reciprocal extension at zero is
removable. -/
theorem BottcherInfinityChart.analyticAt_reciprocalExtension_zero
    {c : ℂ} (g : BottcherInfinityChart c) :
    AnalyticAt ℂ g.reciprocalExtension 0 := by
  exact
    Complex.analyticAt_of_differentiable_on_punctured_nhds_of_continuousAt
      g.eventually_differentiableAt_reciprocalExtension
      g.hasDerivAt_reciprocalExtension_zero.continuousAt

/-- The reciprocal quadratic germ does not vanish on a sufficiently small
punctured neighborhood. -/
theorem eventually_reciprocalQuad_ne_zero (c : ℂ) :
    ∀ᶠ u : ℂ in 𝓝[≠] 0,
      reciprocalQuad c u ≠ 0 := by
  let rho := bottcherRadius c
  have hball :
      ∀ᶠ u : ℂ in 𝓝[≠] 0,
        u ∈ ball (0 : ℂ) rho :=
    Eventually.filter_mono nhdsWithin_le_nhds
      (Metric.ball_mem_nhds 0 (bottcherRadius_pos c))
  filter_upwards [hball, self_mem_nhdsWithin] with u hu hu0
  have hslit :
      1 + c * u ^ 2 ∈ Complex.slitPlane := by
    simpa using
      (bottcherLogArgument_mem_slitPlane
        c rho (bottcherRadius_pos c).le
        (bottcherRadius_le_half c)
        (bottcherRadius_parameter_bound c)
        (mem_ball_zero_iff.mp hu).le 0)
  have hden : 1 + c * u ^ 2 ≠ 0 :=
    Complex.slitPlane_ne_zero hslit
  unfold reciprocalQuad
  exact div_ne_zero (pow_ne_zero 2 hu0) hden

/-- The reciprocal quadratic germ preserves the punctured-neighborhood
filter at zero. -/
theorem tendsto_reciprocalQuad_nhdsNE_zero (c : ℂ) :
    Tendsto (reciprocalQuad c) (𝓝[≠] 0) (𝓝[≠] 0) := by
  let rho := bottcherRadius c
  have hanalytic :
      AnalyticAt ℂ (reciprocalQuad c) 0 :=
    (analyticOnNhd_reciprocalQuad_ball
      c rho (bottcherRadius_parameter_bound c))
        0 (mem_ball_self (bottcherRadius_pos c))
  apply tendsto_nhdsWithin_iff.mpr
  refine ⟨?_, ?_⟩
  · simpa using hanalytic.continuousAt.tendsto.mono_left
      nhdsWithin_le_nhds
  · simpa using eventually_reciprocalQuad_ne_zero c

/-- In the original variable, `q_c(1/u)` tends to infinity as `u → 0`
through nonzero values. -/
theorem tendsto_quad_inv_cobounded (c : ℂ) :
    Tendsto (fun u : ℂ => quad c u⁻¹)
      (𝓝[≠] 0) (Bornology.cobounded ℂ) := by
  have hinv :
      Tendsto (fun u : ℂ => (reciprocalQuad c u)⁻¹)
        (𝓝[≠] 0) (Bornology.cobounded ℂ) :=
    Filter.tendsto_inv₀_nhdsNE_zero.comp
      (tendsto_reciprocalQuad_nhdsNE_zero c)
  apply hinv.congr'
  filter_upwards [self_mem_nhdsWithin] with u hu
  have hreciprocal :=
    reciprocalQuad_inv c u⁻¹ (inv_ne_zero hu)
  have hinverted := congrArg Inv.inv hreciprocal
  simpa [hu] using hinverted

/-- The reciprocal extension inherits the Böttcher equation as a germ at
zero. -/
theorem BottcherInfinityChart.reciprocalExtension_sq_eventually
    {c : ℂ} (g : BottcherInfinityChart c) :
    ∀ᶠ u : ℂ in 𝓝 0,
      g.reciprocalExtension (reciprocalQuad c u) =
        g.reciprocalExtension u ^ 2 := by
  have hext :
      ∀ᶠ z : ℂ in Bornology.cobounded ℂ,
        z ∈ exteriorDomain g.R := by
    filter_upwards
      [eventually_cobounded_le_norm (E := ℂ) (g.R + 1)] with z hz
    change g.R < ‖z‖
    linarith
  have hinvExterior :
      ∀ᶠ u : ℂ in 𝓝[≠] 0,
        u⁻¹ ∈ exteriorDomain g.R :=
    Filter.tendsto_inv₀_nhdsNE_zero.eventually hext
  have hquadExterior :
      ∀ᶠ u : ℂ in 𝓝[≠] 0,
        quad c u⁻¹ ∈ exteriorDomain g.R :=
    (tendsto_quad_inv_cobounded c).eventually hext
  have hpunctured :
      ∀ᶠ u : ℂ in 𝓝[≠] 0,
        g.reciprocalExtension (reciprocalQuad c u) =
          g.reciprocalExtension u ^ 2 := by
    filter_upwards
      [hinvExterior, hquadExterior,
        eventually_reciprocalQuad_ne_zero c,
        self_mem_nhdsWithin] with
        u huExterior hquadExterior huReciprocal0 hu0
    have hquad0 : quad c u⁻¹ ≠ 0 := by
      intro hzero
      rw [hzero] at hquadExterior
      have hbad : g.R < 0 := by
        simpa [exteriorDomain] using hquadExterior
      exact (not_lt_of_ge g.R_pos.le) hbad
    have hreciprocal :=
      reciprocalQuad_inv c u⁻¹ (inv_ne_zero hu0)
    have hinverted := congrArg Inv.inv hreciprocal
    have hback :
        (reciprocalQuad c u)⁻¹ = quad c u⁻¹ := by
      simpa [hu0] using hinverted
    rw [g.reciprocalExtension_of_ne huReciprocal0,
      g.reciprocalExtension_of_ne hu0, hback,
      g.boettcher huExterior hquadExterior]
    exact (inv_pow (g.psi u⁻¹) 2).symm
  refine Filter.mem_of_superset
    (insert_mem_nhds_iff.mpr hpunctured) ?_
  intro u hu
  rcases hu with rfl | hu
  · simp
  · exact hu

/-- Every normalized exterior chart determines a normalized analytic
reciprocal Böttcher germ. -/
noncomputable def BottcherInfinityChart.toReciprocalGerm
    {c : ℂ} (g : BottcherInfinityChart c) :
    ReciprocalBottcherGerm c := by
  have hbeta :
      AnalyticAt ℂ g.reciprocalExtension 0 :=
    g.analyticAt_reciprocalExtension_zero
  have hderiv :
      deriv g.reciprocalExtension 0 = 1 :=
    g.hasDerivAt_reciprocalExtension_zero.deriv
  have hderiv0 :
      deriv g.reciprocalExtension 0 ≠ 0 := by
    rw [hderiv]
    norm_num
  let gamma : ℂ → ℂ :=
    hbeta.hasStrictDerivAt.localInverse
      g.reciprocalExtension
      (deriv g.reciprocalExtension 0) 0 hderiv0
  refine
    { beta := g.reciprocalExtension
      gamma := gamma
      beta_analytic := hbeta
      gamma_analytic := ?_
      beta_zero := g.reciprocalExtension_zero
      deriv_beta_zero := hderiv
      boettcher := g.reciprocalExtension_sq_eventually
      left_inv := ?_
      right_inv := ?_ }
  · simpa only [gamma, g.reciprocalExtension_zero] using
      hbeta.analyticAt_localInverse hderiv0
  · exact HasStrictDerivAt.eventually_left_inverse
      (f := g.reciprocalExtension)
      (f' := deriv g.reciprocalExtension 0)
      (a := 0) hbeta.hasStrictDerivAt hderiv0
  · simpa [g.reciprocalExtension_zero] using
      (HasStrictDerivAt.eventually_right_inverse
        (f := g.reciprocalExtension)
        (f' := deriv g.reciprocalExtension 0)
        (a := 0) hbeta.hasStrictDerivAt hderiv0)

@[simp] theorem BottcherInfinityChart.toReciprocalGerm_beta
    {c : ℂ} (g : BottcherInfinityChart c) :
    g.toReciprocalGerm.beta = g.reciprocalExtension :=
  rfl

/-- Full uniqueness statement in T4.1: two holomorphic univalent exterior
charts satisfying the Böttcher equation and `ψ(z)/z → 1` agree near
infinity. -/
theorem BottcherInfinityChart.psi_eventuallyEq
    {c : ℂ} (g₁ g₂ : BottcherInfinityChart c) :
    g₁.psi =ᶠ[Bornology.cobounded ℂ] g₂.psi := by
  have hnear :
      g₁.reciprocalExtension =ᶠ[𝓝 0]
        g₂.reciprocalExtension := by
    simpa using
      (ReciprocalBottcherGerm.beta_eventuallyEq
        g₁.toReciprocalGerm g₂.toReciprocalGerm)
  have hinfinity :
      ∀ᶠ z : ℂ in Bornology.cobounded ℂ,
        g₁.reciprocalExtension z⁻¹ =
          g₂.reciprocalExtension z⁻¹ :=
    Filter.tendsto_inv₀_cobounded.eventually hnear
  have hneInv :
      ∀ᶠ z : ℂ in Bornology.cobounded ℂ,
        z⁻¹ ≠ 0 := by
    have hmem :
        ∀ᶠ z : ℂ in Bornology.cobounded ℂ,
          z⁻¹ ∈ ({0}ᶜ : Set ℂ) :=
      (Filter.tendsto_inv₀_cobounded' (α := ℂ)).eventually
        self_mem_nhdsWithin
    simpa using hmem
  filter_upwards [hinfinity, hneInv] with z hz hu0
  have hinvPsi :
      (g₁.psi z)⁻¹ = (g₂.psi z)⁻¹ := by
    simpa [BottcherInfinityChart.reciprocalExtension, hu0]
      using hz
  exact inv_injective hinvPsi

/-- Every normalized exterior chart agrees near infinity with the chart
constructed by the logarithmic correction series. -/
theorem BottcherInfinityChart.eventuallyEq_constructed
    {c : ℂ} (g : BottcherInfinityChart c) :
    g.psi =ᶠ[Bornology.cobounded ℂ]
      bottcherCoordinateAtInfinity c :=
  g.psi_eventuallyEq (bottcherInfinityChart c)

end

end Mandelbrot
