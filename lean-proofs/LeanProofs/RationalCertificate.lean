/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.CPlus
import LeanProofs.Bounds
import LeanProofs.Polydisc
import Mathlib.Tactic.Linarith

/-!
# Generic `[2/1]-c⁺` residual certificate

The numerator coefficient `N2` is unrestricted.  Consequently every theorem
in this file covers `[2/1]-c⁺`, while `[1/1]-c⁺` is the special case
`N2 = 0`.
-/

namespace Mandelbrot

open Complex Metric Real

section Field

variable {K : Type*} [Field K]

/-- Cross-multiplied residual `Q = den * Phi - N`. -/
def cplusResidual (m : CPlus K) (phi z c : K) : K :=
  cplusDen m z c * phi - cplusNum m z c

/-- Exact rational error identity, valid for arbitrary `N2`. -/
theorem cplus_error_eq_neg_residual_div
    (m : CPlus K) (phi z c : K) (hden : cplusDen m z c ≠ 0) :
    cplusEval m z c - phi = -cplusResidual m phi z c / cplusDen m z c := by
  change cplusNum m z c / cplusDen m z c - phi =
    -cplusResidual m phi z c / cplusDen m z c
  rw [div_sub' hden]
  congr 1
  simp only [cplusResidual]
  ring

end Field

section Complex

noncomputable section

/-- Lower bound for the denominator throughout `|z| ≤ x`, `|c| ≤ y`. -/
def cplusDenLower (m : CPlus ℂ) (x y : ℝ) : ℝ :=
  1 - ‖m.F‖ * y - (‖m.D‖ + ‖m.Dp‖ * y) * x

/-- Scale used by rule `(V)`.  It is an error budget scale, not automatically
a lower bound for the true map. -/
def cplusScale (m : CPlus ℂ) (x y : ℝ) : ℝ :=
  ‖m.A‖ * x + ‖m.B‖ * y

theorem cplusScale_nonneg (m : CPlus ℂ) (x y : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) : 0 ≤ cplusScale m x y := by
  simp only [cplusScale]
  positivity

/-- Reverse-triangle denominator certificate on a bidisc. -/
theorem cplusDenLower_le_norm
    (m : CPlus ℂ) (z c : ℂ) (x y : ℝ)
    (_hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y) :
    cplusDenLower m x y ≤ ‖cplusDen m z c‖ := by
  let w : ℂ := (m.D + m.Dp * c) * z + m.F * c
  have hDc : ‖m.D + m.Dp * c‖ ≤ ‖m.D‖ + ‖m.Dp‖ * y := by
    calc
      ‖m.D + m.Dp * c‖ ≤ ‖m.D‖ + ‖m.Dp * c‖ := norm_add_le _ _
      _ = ‖m.D‖ + ‖m.Dp‖ * ‖c‖ := by rw [norm_mul]
      _ ≤ ‖m.D‖ + ‖m.Dp‖ * y := by
        gcongr
  have hDz : ‖(m.D + m.Dp * c) * z‖ ≤ (‖m.D‖ + ‖m.Dp‖ * y) * x := by
    rw [norm_mul]
    exact mul_le_mul hDc hz (norm_nonneg z)
      (add_nonneg (norm_nonneg m.D) (mul_nonneg (norm_nonneg m.Dp) hy))
  have hFc : ‖m.F * c‖ ≤ ‖m.F‖ * y := by
    rw [norm_mul]
    exact mul_le_mul_of_nonneg_left hc (norm_nonneg m.F)
  have hw : ‖w‖ ≤ (‖m.D‖ + ‖m.Dp‖ * y) * x + ‖m.F‖ * y := by
    calc
      ‖w‖ ≤ ‖(m.D + m.Dp * c) * z‖ + ‖m.F * c‖ := by
        exact norm_add_le _ _
      _ ≤ (‖m.D‖ + ‖m.Dp‖ * y) * x + ‖m.F‖ * y := add_le_add hDz hFc
  have hreverse : 1 - ‖w‖ ≤ ‖1 + w‖ := by
    have htri := norm_sub_le (1 + w) w
    have hone : ‖(1 : ℂ)‖ = 1 := norm_one
    rw [add_sub_cancel_right, hone] at htri
    linarith
  have hdenEq : cplusDen m z c = 1 + w := by
    simp only [cplusDen, w]
    ring
  rw [hdenEq]
  simp only [cplusDenLower]
  linarith

theorem cplusDen_ne_zero_of_lower_pos
    (m : CPlus ℂ) (z c : ℂ) (x y : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hlower : 0 < cplusDenLower m x y) :
    cplusDen m z c ≠ 0 := by
  apply norm_pos_iff.mp
  exact hlower.trans_le (cplusDenLower_le_norm m z c x y hx hy hz hc)

/-- Absolute error from a residual bound and a positive denominator margin. -/
theorem cplus_error_norm_le
    (m : CPlus ℂ) (phi z c : ℂ) (x y REST : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hlower : 0 < cplusDenLower m x y)
    (hQ : ‖cplusResidual m phi z c‖ ≤ REST) :
    ‖cplusEval m z c - phi‖ ≤ REST / cplusDenLower m x y := by
  have hden := cplusDen_ne_zero_of_lower_pos m z c x y hx hy hz hc hlower
  have hdenBound := cplusDenLower_le_norm m z c x y hx hy hz hc
  have hREST : 0 ≤ REST := (norm_nonneg _).trans hQ
  rw [cplus_error_eq_neg_residual_div m phi z c hden]
  rw [norm_div, norm_neg]
  exact div_le_div₀ hREST hQ hlower hdenBound

/-- Rule `(V)` certifies an absolute error proportional to the chosen scale. -/
theorem cplus_model_scaled_error_le
    (m : CPlus ℂ) (phi z c : ℂ) (x y REST eps S : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hlower : 0 < cplusDenLower m x y)
    (hQ : ‖cplusResidual m phi z c‖ ≤ REST)
    (hV : REST ≤ eps * S * cplusDenLower m x y) :
    ‖cplusEval m z c - phi‖ ≤ eps * S := by
  have herr := cplus_error_norm_le m phi z c x y REST hx hy hz hc hlower hQ
  apply herr.trans
  rw [div_le_iff₀ hlower]
  exact hV

/-- A true relative-error theorem requires a positive lower bound for the
true map; it cannot hold uniformly across a zero of `phi`. -/
theorem cplus_true_relative_error_le
    (m : CPlus ℂ) (phi z c : ℂ) (x y REST eps L : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (heps : 0 ≤ eps) (hL : 0 < L) (hphi : L ≤ ‖phi‖)
    (hlower : 0 < cplusDenLower m x y)
    (hQ : ‖cplusResidual m phi z c‖ ≤ REST)
    (hV : REST ≤ eps * L * cplusDenLower m x y) :
    ‖cplusEval m z c - phi‖ / ‖phi‖ ≤ eps := by
  have herr := cplus_model_scaled_error_le m phi z c x y REST eps L
    hx hy hz hc hlower hQ hV
  have hphiPos : 0 < ‖phi‖ := hL.trans_le hphi
  rw [div_le_iff₀ hphiPos]
  exact herr.trans (mul_le_mul_of_nonneg_left hphi heps)

/-- The residual as a two-variable analytic map.  This is the object whose
Taylor tail must be certified on a polydisc. -/
def cplusResidualMap (m : CPlus ℂ) (Phi : ℂ → ℂ → ℂ) : ℂ → ℂ → ℂ :=
  fun z c => cplusResidual m (Phi z c) z c

/-- The general polydisc theorem specialized to the cross-multiplied
`[2/1]-c⁺` residual.  The result includes the diagonal case
`x / Rz = y / Rc`. -/
theorem cplusResidual_polydisc_tail_closed_le
    (m : CPlus ℂ) (Phi : ℂ → ℂ → ℂ)
    (Rz Rc M x y : ℝ) (D : ℕ)
    (hRz : 0 < Rz) (hRc : 0 < Rc) (hx : 0 ≤ x) (hy : 0 ≤ y)
    (hinner : ∀ c ∈ sphere (0 : ℂ) |Rc|,
      CircleIntegrable (fun z => ‖cplusResidualMap m Phi z c‖) 0 Rz)
    (houter : ∀ i, CircleIntegrable
      (fun c => ‖cauchyPowerSeries
        (fun z => cplusResidualMap m Phi z c) 0 Rz i‖) 0 Rc)
    (hM : ∀ z ∈ sphere (0 : ℂ) |Rz|,
      ∀ c ∈ sphere (0 : ℂ) |Rc|, ‖cplusResidualMap m Phi z c‖ ≤ M)
    (hu : |x / Rz| < 1) (hv : |y / Rc| < 1) :
    (∑' k : ℕ, degreeSlice
      (fun i j => ‖iteratedCauchyCoefficientValue
        (cplusResidualMap m Phi) Rz Rc i j‖) x y (D + k)) ≤
      M * anisotropicTailClosed D (x / Rz) (y / Rc) := by
  exact iteratedCauchyValue_polydisc_tail_closed_le
    (cplusResidualMap m Phi) Rz Rc M x y D
    hRz hRc hx hy hinner houter hM hu hv

/-- End-to-end `[2/1]-c⁺` certificate: once the residual is represented by
its omitted Taylor tail, the polydisc Cauchy bound discharges rule `(V)` and
yields the advertised model-scaled error. -/
theorem cplus_polydisc_model_scaled_error_le
    (m : CPlus ℂ) (Phi : ℂ → ℂ → ℂ) (z c : ℂ)
    (Rz Rc M x y : ℝ) (D : ℕ) (eps S : ℝ)
    (hRz : 0 < Rz) (hRc : 0 < Rc) (hx : 0 ≤ x) (hy : 0 ≤ y)
    (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hinner : ∀ c ∈ sphere (0 : ℂ) |Rc|,
      CircleIntegrable (fun z => ‖cplusResidualMap m Phi z c‖) 0 Rz)
    (houter : ∀ i, CircleIntegrable
      (fun c => ‖cauchyPowerSeries
        (fun z => cplusResidualMap m Phi z c) 0 Rz i‖) 0 Rc)
    (hM : ∀ z ∈ sphere (0 : ℂ) |Rz|,
      ∀ c ∈ sphere (0 : ℂ) |Rc|, ‖cplusResidualMap m Phi z c‖ ≤ M)
    (hu : |x / Rz| < 1) (hv : |y / Rc| < 1)
    (hseries : ‖cplusResidualMap m Phi z c‖ ≤
      ∑' k : ℕ, degreeSlice
        (fun i j => ‖iteratedCauchyCoefficientValue
          (cplusResidualMap m Phi) Rz Rc i j‖) x y (D + k))
    (hlower : 0 < cplusDenLower m x y)
    (hV : M * anisotropicTailClosed D (x / Rz) (y / Rc) ≤
      eps * S * cplusDenLower m x y) :
    ‖cplusEval m z c - Phi z c‖ ≤ eps * S := by
  have htail := cplusResidual_polydisc_tail_closed_le
    m Phi Rz Rc M x y D hRz hRc hx hy hinner houter hM hu hv
  have hQ : ‖cplusResidual m (Phi z c) z c‖ ≤
      M * anisotropicTailClosed D (x / Rz) (y / Rc) := by
    simpa only [cplusResidualMap] using hseries.trans htail
  exact cplus_model_scaled_error_le m (Phi z c) z c x y
    (M * anisotropicTailClosed D (x / Rz) (y / Rc)) eps S
    hx hy hz hc hlower hQ hV

/-- Gap whose nonpositivity is exactly the radial rule `(V)`. -/
def cplusRadialGap
    (m : CPlus ℂ) (rest : ℝ → ℝ) (eps y x : ℝ) : ℝ :=
  rest x - eps * cplusScale m x y * cplusDenLower m x y

/-- Convex endpoint certificate for every radius below the emitted radius. -/
theorem cplus_radial_rule
    (m : CPlus ℂ) (rest : ℝ → ℝ) (eps y r x : ℝ)
    (hconv : ConvexOn ℝ (Set.Icc 0 r) (cplusRadialGap m rest eps y))
    (hzero : rest 0 ≤ eps * cplusScale m 0 y * cplusDenLower m 0 y)
    (hr : rest r ≤ eps * cplusScale m r y * cplusDenLower m r y)
    (hx : x ∈ Set.Icc 0 r) :
    rest x ≤ eps * cplusScale m x y * cplusDenLower m x y := by
  have hgap := convex_radial_disk_certificate
    (cplusRadialGap m rest eps y) r x hconv
    (by simp only [cplusRadialGap]; linarith)
    (by simp only [cplusRadialGap]; linarith) hx
  simp only [cplusRadialGap] at hgap
  linarith

/-- End-to-end abstract solver certificate on `[0,r]`. -/
theorem cplus_radial_model_scaled_error
    (m : CPlus ℂ) (Phi : ℂ → ℂ → ℂ) (rest : ℝ → ℝ)
    (eps y r x : ℝ) (z c : ℂ)
    (hy : 0 ≤ y) (hx : x ∈ Set.Icc 0 r)
    (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hconv : ConvexOn ℝ (Set.Icc 0 r) (cplusRadialGap m rest eps y))
    (hzero : rest 0 ≤ eps * cplusScale m 0 y * cplusDenLower m 0 y)
    (hr : rest r ≤ eps * cplusScale m r y * cplusDenLower m r y)
    (hlower : 0 < cplusDenLower m x y)
    (hQ : ‖cplusResidual m (Phi z c) z c‖ ≤ rest x) :
    ‖cplusEval m z c - Phi z c‖ ≤ eps * cplusScale m x y := by
  have hV := cplus_radial_rule m rest eps y r x hconv hzero hr hx
  exact cplus_model_scaled_error_le m (Phi z c) z c x y (rest x) eps
    (cplusScale m x y) hx.1 hy hz hc hlower hQ hV

/-- `[1/1]-c⁺` specialization using the jet extraction (`N2 = 0`). -/
theorem extractK1_model_scaled_error_le
    (j : JetCoeffs ℂ) (phi z c : ℂ) (x y REST eps S : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hlower : 0 < cplusDenLower (extractK1 j) x y)
    (hQ : ‖cplusResidual (extractK1 j) phi z c‖ ≤ REST)
    (hV : REST ≤ eps * S * cplusDenLower (extractK1 j) x y) :
    ‖cplusEval (extractK1 j) z c - phi‖ ≤ eps * S :=
  cplus_model_scaled_error_le (extractK1 j) phi z c x y REST eps S
    hx hy hz hc hlower hQ hV

/-- `[2/1]-c⁺` specialization using the jet extraction. -/
theorem extractK2_model_scaled_error_le
    (j : JetCoeffs ℂ) (phi z c : ℂ) (x y REST eps S : ℝ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hz : ‖z‖ ≤ x) (hc : ‖c‖ ≤ y)
    (hlower : 0 < cplusDenLower (extractK2 j) x y)
    (hQ : ‖cplusResidual (extractK2 j) phi z c‖ ≤ REST)
    (hV : REST ≤ eps * S * cplusDenLower (extractK2 j) x y) :
    ‖cplusEval (extractK2 j) z c - phi‖ ≤ eps * S :=
  cplus_model_scaled_error_le (extractK2 j) phi z c x y REST eps S
    hx hy hz hc hlower hQ hV

end

end Complex

end Mandelbrot
