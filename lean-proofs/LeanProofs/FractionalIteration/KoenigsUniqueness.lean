/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.KoenigsAnalytic
import Mathlib.Analysis.Asymptotics.Lemmas
import Mathlib.Analysis.SpecificLimits.Normed

/-!
# Uniqueness of the normalized local Koenigs coordinate

The key rigidity lemma says that a function tangent to zero and commuting
locally with a strict complex contraction must vanish as a germ. Applied to
the transition map between two normalized Koenigs charts, this proves local
uniqueness without assuming a priori that their Taylor series converge on a
common explicit disk.
-/

namespace Mandelbrot

noncomputable section

open Asymptotics Filter Metric
open scoped Topology

/-- A germ tangent to zero and equivariant under a nonzero strict linear
contraction is the zero germ. -/
theorem eventually_eq_zero_of_scaling
    (mu : ℂ) (hmu0 : mu ≠ 0) (hmu1 : ‖mu‖ < 1)
    (k : ℂ → ℂ) (hk0 : k 0 = 0)
    (hkderiv : HasDerivAt k 0 0)
    (hscale : ∀ᶠ y in 𝓝 0, k (mu * y) = mu * k y) :
    ∀ᶠ y in 𝓝 0, k y = 0 := by
  have hlittle : k =o[𝓝 0] (fun x : ℂ => x) := by
    simpa [hk0] using hkderiv.isLittleO
  rcases Metric.mem_nhds_iff.mp hscale with
    ⟨epsilon, hepsilon, hballScale⟩
  apply Filter.eventually_of_mem (Metric.ball_mem_nhds 0 hepsilon)
  intro y hy
  by_cases hy0 : y = 0
  · simp [hy0, hk0]
  have hynorm : ‖y‖ < epsilon := mem_ball_zero_iff.mp hy
  have hpowBall : ∀ n : ℕ, mu ^ n * y ∈ ball 0 epsilon := by
    intro n
    rw [mem_ball_zero_iff, norm_mul, norm_pow]
    calc
      ‖mu‖ ^ n * ‖y‖ ≤ 1 * ‖y‖ := by
        gcongr
        exact pow_le_one₀ (norm_nonneg mu) hmu1.le
      _ < epsilon := by simpa using hynorm
  have hiterate :
      ∀ n : ℕ, k (mu ^ n * y) = mu ^ n * k y := by
    intro n
    induction n with
    | zero => simp
    | succ n ih =>
        have hstep := hballScale (hpowBall n)
        calc
          k (mu ^ (n + 1) * y) =
              k (mu * (mu ^ n * y)) := by
                congr 1
                rw [pow_succ']
                ring
          _ = mu * k (mu ^ n * y) := hstep
          _ = mu * (mu ^ n * k y) := by rw [ih]
          _ = mu ^ (n + 1) * k y := by
                rw [pow_succ']
                ring
  have hsequence :
      Tendsto (fun n : ℕ => mu ^ n * y) atTop (𝓝 0) := by
    simpa using
      (tendsto_pow_atTop_nhds_zero_of_norm_lt_one hmu1).mul_const y
  have hratio :
      Tendsto
        (fun n : ℕ => k (mu ^ n * y) / (mu ^ n * y))
        atTop (𝓝 0) :=
    (hlittle.comp_tendsto hsequence).tendsto_div_nhds_zero
  have hratioEq :
      (fun n : ℕ => k (mu ^ n * y) / (mu ^ n * y)) =
        fun _ : ℕ => k y / y := by
    funext n
    rw [hiterate n]
    field_simp [hmu0, hy0]
  rw [hratioEq] at hratio
  have hzero : k y / y = 0 :=
    tendsto_nhds_unique tendsto_const_nhds hratio
  rcases (div_eq_zero_iff.mp hzero) with hky | hy
  · exact hky
  · exact False.elim (hy0 hy)

namespace KoenigsGerm

@[simp] theorem psi_zero {mu : ℂ} (g : KoenigsGerm mu) :
    g.psi 0 = 0 := by
  have h := g.left_inv.self_of_nhds
  simpa [g.phi_zero] using h

theorem hasDerivAt_phi_zero {mu : ℂ} (g : KoenigsGerm mu) :
    HasDerivAt g.phi 1 0 :=
  g.phi_analytic.hasStrictDerivAt.hasDerivAt.congr_deriv
    g.deriv_phi_zero

theorem hasDerivAt_psi_zero {mu : ℂ} (g : KoenigsGerm mu) :
    HasDerivAt g.psi 1 0 := by
  have hpsi :
      HasDerivAt g.psi (deriv g.psi 0) 0 :=
    g.psi_analytic.hasStrictDerivAt.hasDerivAt
  have hcomp :
      HasDerivAt (g.psi ∘ g.phi) (deriv g.psi 0) 0 := by
    have hraw := hpsi.comp_of_eq 0 g.hasDerivAt_phi_zero
      (by simp [g.phi_zero])
    simpa only [mul_one] using hraw
  have heq :
      (g.psi ∘ g.phi) =ᶠ[𝓝 0] (fun w => w) := by
    filter_upwards [g.left_inv] with w hw
    exact hw
  have hid :
      HasDerivAt (fun w : ℂ => w) (deriv g.psi 0) 0 :=
    hcomp.congr_of_eventuallyEq heq.symm
  have hderiv : deriv g.psi 0 = 1 :=
    hid.unique (hasDerivAt_id 0)
  exact hpsi.congr_deriv hderiv

/-- Transition map from one normalized Koenigs coordinate to another. -/
def transition {mu : ℂ} (g₁ g₂ : KoenigsGerm mu) (y : ℂ) : ℂ :=
  g₂.phi (g₁.psi y)

theorem transition_analytic {mu : ℂ} (g₁ g₂ : KoenigsGerm mu) :
    AnalyticAt ℂ (transition g₁ g₂) 0 := by
  have h :=
    g₂.phi_analytic.comp_of_eq g₁.psi_analytic g₁.psi_zero
  change AnalyticAt ℂ (g₂.phi ∘ g₁.psi) 0
  exact h

@[simp] theorem transition_zero {mu : ℂ} (g₁ g₂ : KoenigsGerm mu) :
    transition g₁ g₂ 0 = 0 := by
  simp [transition, g₁.psi_zero, g₂.phi_zero]

theorem hasDerivAt_transition_zero
    {mu : ℂ} (g₁ g₂ : KoenigsGerm mu) :
    HasDerivAt (transition g₁ g₂) 1 0 := by
  have hraw := g₂.hasDerivAt_phi_zero.comp_of_eq 0
    g₁.hasDerivAt_psi_zero (by simp [g₁.psi_zero])
  change HasDerivAt (g₂.phi ∘ g₁.psi) 1 0
  simpa only [mul_one] using hraw

/-- The transition map commutes locally with multiplication by the
multiplier. -/
theorem transition_scaling_eventually
    {mu : ℂ} (g₁ g₂ : KoenigsGerm mu) :
    ∀ᶠ y in 𝓝 0,
      transition g₁ g₂ (mu * y) = mu * transition g₁ g₂ y := by
  have hpsi :
      Tendsto g₁.psi (𝓝 0) (𝓝 0) := by
    have h := g₁.psi_analytic.continuousAt.tendsto
    simpa [g₁.psi_zero] using h
  have hcenter :
      Tendsto (centeredQuad mu) (𝓝 0) (𝓝 0) := by
    have h := (differentiable_centeredQuad mu).continuous.continuousAt
      (x := (0 : ℂ))
    simpa using h.tendsto
  have hcenterPsi :
      Tendsto (fun y => centeredQuad mu (g₁.psi y)) (𝓝 0) (𝓝 0) :=
    hcenter.comp hpsi
  filter_upwards
    [g₁.right_inv, hpsi.eventually g₁.schroeder,
      hcenterPsi.eventually g₁.left_inv,
      hpsi.eventually g₂.schroeder] with y hright hsch₁ hleft hsch₂
  have hpsiScale :
      g₁.psi (mu * y) = centeredQuad mu (g₁.psi y) := by
    calc
      g₁.psi (mu * y) =
          g₁.psi (mu * g₁.phi (g₁.psi y)) := by rw [hright]
      _ = g₁.psi (g₁.phi (centeredQuad mu (g₁.psi y))) := by
        rw [hsch₁]
      _ = centeredQuad mu (g₁.psi y) := hleft
  change g₂.phi (g₁.psi (mu * y)) =
    mu * g₂.phi (g₁.psi y)
  rw [hpsiScale]
  exact hsch₂

/-- The normalized transition map is the identity germ. -/
theorem transition_eventually_eq_id
    {mu : ℂ} (g₁ g₂ : KoenigsGerm mu)
    (hmu : 0 < ‖mu‖) (hattract : ‖mu‖ < 1) :
    ∀ᶠ y in 𝓝 0, transition g₁ g₂ y = y := by
  let k : ℂ → ℂ := transition g₁ g₂ - id
  have hk0 : k 0 = 0 := by simp [k]
  have hkderiv : HasDerivAt k 0 0 := by
    change HasDerivAt (transition g₁ g₂ - id) 0 0
    exact ((hasDerivAt_transition_zero g₁ g₂).sub
      (hasDerivAt_id 0)).congr_deriv (by norm_num)
  have hscale :
      ∀ᶠ y in 𝓝 0, k (mu * y) = mu * k y := by
    filter_upwards [transition_scaling_eventually g₁ g₂] with y hy
    change transition g₁ g₂ (mu * y) - mu * y =
      mu * (transition g₁ g₂ y - y)
    rw [hy]
    ring
  have hkzero := eventually_eq_zero_of_scaling
    mu (norm_pos_iff.mp hmu) hattract k hk0 hkderiv hscale
  filter_upwards [hkzero] with y hy
  change transition g₁ g₂ y - y = 0 at hy
  linear_combination hy

/-- Uniqueness of the normalized centered Koenigs coordinate as an analytic
germ. -/
theorem phi_eventuallyEq
    {mu : ℂ} (g₁ g₂ : KoenigsGerm mu)
    (hmu : 0 < ‖mu‖) (hattract : ‖mu‖ < 1) :
    g₁.phi =ᶠ[𝓝 0] g₂.phi := by
  have hphi :
      Tendsto g₁.phi (𝓝 0) (𝓝 0) := by
    have h := g₁.phi_analytic.continuousAt.tendsto
    simpa [g₁.phi_zero] using h
  filter_upwards
    [g₁.left_inv,
      hphi.eventually
        (transition_eventually_eq_id g₁ g₂ hmu hattract)] with w hleft htrans
  unfold transition at htrans
  rw [hleft] at htrans
  exact htrans.symm

end KoenigsGerm

namespace KoenigsFixedPointGerm

@[simp] theorem psi_zero
    {c p : ℂ} (g : KoenigsFixedPointGerm c p) :
    g.psi 0 = p := by
  have h := g.left_inv.self_of_nhds
  simpa [g.phi_fixed] using h

theorem hasDerivAt_phi_fixed
    {c p : ℂ} (g : KoenigsFixedPointGerm c p) :
    HasDerivAt g.phi 1 p :=
  g.phi_analytic.hasStrictDerivAt.hasDerivAt.congr_deriv
    g.deriv_phi_fixed

theorem hasDerivAt_psi_zero
    {c p : ℂ} (g : KoenigsFixedPointGerm c p) :
    HasDerivAt g.psi 1 0 := by
  have hpsi :
      HasDerivAt g.psi (deriv g.psi 0) 0 :=
    g.psi_analytic.hasStrictDerivAt.hasDerivAt
  have hcomp :
      HasDerivAt (g.psi ∘ g.phi) (deriv g.psi 0) p := by
    have hraw := hpsi.comp_of_eq p g.hasDerivAt_phi_fixed
      (by simp [g.phi_fixed])
    simpa only [mul_one] using hraw
  have heq :
      (g.psi ∘ g.phi) =ᶠ[𝓝 p] (fun z => z) := by
    filter_upwards [g.left_inv] with z hz
    exact hz
  have hid :
      HasDerivAt (fun z : ℂ => z) (deriv g.psi 0) p :=
    hcomp.congr_of_eventuallyEq heq.symm
  have hderiv : deriv g.psi 0 = 1 :=
    hid.unique (hasDerivAt_id p)
  exact hpsi.congr_deriv hderiv

/-- Transition map between two normalized charts at the same fixed point. -/
def transition
    {c p : ℂ} (g₁ g₂ : KoenigsFixedPointGerm c p) (y : ℂ) : ℂ :=
  g₂.phi (g₁.psi y)

theorem transition_analytic
    {c p : ℂ} (g₁ g₂ : KoenigsFixedPointGerm c p) :
    AnalyticAt ℂ (transition g₁ g₂) 0 := by
  have h :=
    g₂.phi_analytic.comp_of_eq g₁.psi_analytic g₁.psi_zero
  change AnalyticAt ℂ (g₂.phi ∘ g₁.psi) 0
  exact h

@[simp] theorem transition_zero
    {c p : ℂ} (g₁ g₂ : KoenigsFixedPointGerm c p) :
    transition g₁ g₂ 0 = 0 := by
  simp [transition, g₁.psi_zero, g₂.phi_fixed]

theorem hasDerivAt_transition_zero
    {c p : ℂ} (g₁ g₂ : KoenigsFixedPointGerm c p) :
    HasDerivAt (transition g₁ g₂) 1 0 := by
  have hraw := g₂.hasDerivAt_phi_fixed.comp_of_eq 0
    g₁.hasDerivAt_psi_zero (by simp [g₁.psi_zero])
  change HasDerivAt (g₂.phi ∘ g₁.psi) 1 0
  simpa only [mul_one] using hraw

theorem transition_scaling_eventually
    {c p : ℂ} (g₁ g₂ : KoenigsFixedPointGerm c p)
    (hp : quad c p = p) :
    ∀ᶠ y in 𝓝 0,
      transition g₁ g₂ ((2 * p) * y) =
        (2 * p) * transition g₁ g₂ y := by
  have hpsi :
      Tendsto g₁.psi (𝓝 0) (𝓝 p) := by
    have h := g₁.psi_analytic.continuousAt.tendsto
    simpa [g₁.psi_zero] using h
  have hquad :
      Tendsto (quad c) (𝓝 p) (𝓝 p) := by
    have h := (hasDerivAt_quad c p).continuousAt.tendsto
    simpa [hp] using h
  have hquadPsi :
      Tendsto (fun y => quad c (g₁.psi y)) (𝓝 0) (𝓝 p) :=
    hquad.comp hpsi
  filter_upwards
    [g₁.right_inv, hpsi.eventually g₁.schroeder,
      hquadPsi.eventually g₁.left_inv,
      hpsi.eventually g₂.schroeder] with y hright hsch₁ hleft hsch₂
  have hpsiScale :
      g₁.psi ((2 * p) * y) = quad c (g₁.psi y) := by
    calc
      g₁.psi ((2 * p) * y) =
          g₁.psi ((2 * p) * g₁.phi (g₁.psi y)) := by rw [hright]
      _ = g₁.psi (g₁.phi (quad c (g₁.psi y))) := by
        rw [hsch₁]
      _ = quad c (g₁.psi y) := hleft
  change g₂.phi (g₁.psi ((2 * p) * y)) =
    (2 * p) * g₂.phi (g₁.psi y)
  rw [hpsiScale]
  exact hsch₂

theorem transition_eventually_eq_id
    {c p : ℂ} (g₁ g₂ : KoenigsFixedPointGerm c p)
    (hp : quad c p = p)
    (hmu : 0 < ‖2 * p‖) (hattract : ‖2 * p‖ < 1) :
    ∀ᶠ y in 𝓝 0, transition g₁ g₂ y = y := by
  let k : ℂ → ℂ := transition g₁ g₂ - id
  have hk0 : k 0 = 0 := by simp [k]
  have hkderiv : HasDerivAt k 0 0 := by
    change HasDerivAt (transition g₁ g₂ - id) 0 0
    exact ((hasDerivAt_transition_zero g₁ g₂).sub
      (hasDerivAt_id 0)).congr_deriv (by norm_num)
  have hscale :
      ∀ᶠ y in 𝓝 0, k ((2 * p) * y) = (2 * p) * k y := by
    filter_upwards [transition_scaling_eventually g₁ g₂ hp] with y hy
    change transition g₁ g₂ ((2 * p) * y) - (2 * p) * y =
      (2 * p) * (transition g₁ g₂ y - y)
    rw [hy]
    ring
  have hkzero := eventually_eq_zero_of_scaling
    (2 * p) (norm_pos_iff.mp hmu) hattract k hk0 hkderiv hscale
  filter_upwards [hkzero] with y hy
  change transition g₁ g₂ y - y = 0 at hy
  linear_combination hy

/-- The normalized Koenigs coordinate at an attracting fixed point is unique
as a germ. This closes the uniqueness clause of T3.1. -/
theorem phi_eventuallyEq
    {c p : ℂ} (g₁ g₂ : KoenigsFixedPointGerm c p)
    (hp : quad c p = p)
    (hmu : 0 < ‖2 * p‖) (hattract : ‖2 * p‖ < 1) :
    g₁.phi =ᶠ[𝓝 p] g₂.phi := by
  have hphi :
      Tendsto g₁.phi (𝓝 p) (𝓝 0) := by
    have h := g₁.phi_analytic.continuousAt.tendsto
    simpa [g₁.phi_fixed] using h
  filter_upwards
    [g₁.left_inv,
      hphi.eventually
        (transition_eventually_eq_id g₁ g₂ hp hmu hattract)] with z hleft htrans
  unfold transition at htrans
  rw [hleft] at htrans
  exact htrans.symm

end KoenigsFixedPointGerm

end

end Mandelbrot
