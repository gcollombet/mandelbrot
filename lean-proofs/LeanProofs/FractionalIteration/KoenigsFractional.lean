/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.KoenigsAnalytic
import LeanProofs.FractionalIteration.LinearModels

/-!
# Fractional iteration in the local Koenigs chart

This file combines the analytic germ constructed in `KoenigsAnalytic` with
the multiplicative model from `LinearModels`. Since the chart is local, the
three defining identities are stated as equalities of germs (`∀ᶠ` in the
appropriate neighborhood filter).
-/

namespace Mandelbrot

noncomputable section

open Filter
open scoped Topology

theorem continuous_koenigsModel (L : ℂ) (t : ℝ) :
    Continuous (koenigsModel L t) := by
  unfold koenigsModel
  fun_prop

@[simp] theorem koenigsModel_apply_zero (L : ℂ) (t : ℝ) :
    koenigsModel L t 0 = 0 := by
  simp [koenigsModel]

namespace KoenigsGerm

/-- The local fractional family transported through a centered Koenigs
germ. -/
def fractional {mu : ℂ} (g : KoenigsGerm mu)
    (L : ℂ) (t : ℝ) (w : ℂ) : ℂ :=
  g.psi (koenigsModel L t (g.phi w))

theorem fractional_zero_eventually
    {mu : ℂ} (g : KoenigsGerm mu) (L : ℂ) :
    ∀ᶠ w in 𝓝 0, g.fractional L 0 w = w := by
  filter_upwards [g.left_inv] with w hw
  simpa [fractional] using hw

theorem fractional_one_eventually
    {mu : ℂ} (g : KoenigsGerm mu) (L : ℂ)
    (hexp : Complex.exp L = mu) :
    ∀ᶠ w in 𝓝 0,
      g.fractional L 1 w = centeredQuad mu w := by
  have hcenter :
      Tendsto (centeredQuad mu) (𝓝 0) (𝓝 0) := by
    have h := (differentiable_centeredQuad mu).continuous.continuousAt
      (x := (0 : ℂ))
    simpa using h.tendsto
  filter_upwards [g.schroeder, hcenter.eventually g.left_inv] with w hsch hleft
  rw [fractional, koenigsModel_one L mu (g.phi w) hexp, ← hsch, hleft]

theorem fractional_add_eventually
    {mu : ℂ} (g : KoenigsGerm mu) (L : ℂ) (s t : ℝ) :
    ∀ᶠ w in 𝓝 0,
      g.fractional L s (g.fractional L t w) =
        g.fractional L (s + t) w := by
  have hphi : Tendsto g.phi (𝓝 0) (𝓝 0) := by
    have h := g.phi_analytic.continuousAt
    simpa [g.phi_zero] using h.tendsto
  have hmodel :
      Tendsto (koenigsModel L t) (𝓝 0) (𝓝 0) := by
    have h := (continuous_koenigsModel L t).continuousAt (x := (0 : ℂ))
    simpa using h.tendsto
  have hcoordinate :
      Tendsto (fun w => koenigsModel L t (g.phi w)) (𝓝 0) (𝓝 0) :=
    hmodel.comp hphi
  filter_upwards [hcoordinate.eventually g.right_inv] with w hinv
  unfold fractional
  rw [hinv, koenigsModel_add]

end KoenigsGerm

namespace KoenigsFixedPointGerm

/-- The same fractional family, written in the original `z` coordinate at a
fixed point. -/
def fractional {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) (t : ℝ) (z : ℂ) : ℂ :=
  g.psi (koenigsModel L t (g.phi z))

theorem fractional_zero_eventually
    {c p : ℂ} (g : KoenigsFixedPointGerm c p) (L : ℂ) :
    ∀ᶠ z in 𝓝 p, g.fractional L 0 z = z := by
  filter_upwards [g.left_inv] with z hz
  simpa [fractional] using hz

theorem fractional_one_eventually
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (hp : quad c p = p) (L : ℂ)
    (hexp : Complex.exp L = 2 * p) :
    ∀ᶠ z in 𝓝 p, g.fractional L 1 z = quad c z := by
  have hquad : Tendsto (quad c) (𝓝 p) (𝓝 p) := by
    have h := (hasDerivAt_quad c p).continuousAt
    simpa [hp] using h.tendsto
  filter_upwards [g.schroeder, hquad.eventually g.left_inv] with z hsch hleft
  rw [fractional, koenigsModel_one L (2 * p) (g.phi z) hexp,
    ← hsch, hleft]

theorem fractional_add_eventually
    {c p : ℂ} (g : KoenigsFixedPointGerm c p)
    (L : ℂ) (s t : ℝ) :
    ∀ᶠ z in 𝓝 p,
      g.fractional L s (g.fractional L t z) =
        g.fractional L (s + t) z := by
  have hphi : Tendsto g.phi (𝓝 p) (𝓝 0) := by
    have h := g.phi_analytic.continuousAt
    simpa [g.phi_fixed] using h.tendsto
  have hmodel :
      Tendsto (koenigsModel L t) (𝓝 0) (𝓝 0) := by
    have h := (continuous_koenigsModel L t).continuousAt (x := (0 : ℂ))
    simpa using h.tendsto
  have hcoordinate :
      Tendsto (fun z => koenigsModel L t (g.phi z)) (𝓝 p) (𝓝 0) :=
    hmodel.comp hphi
  filter_upwards [hcoordinate.eventually g.right_inv] with z hinv
  unfold fractional
  rw [hinv, koenigsModel_add]

end KoenigsFixedPointGerm

end

end Mandelbrot
