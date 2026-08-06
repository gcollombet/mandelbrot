/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.CardioidArea
import Mathlib.Analysis.Complex.MeanValue
import Mathlib.Analysis.Convex.Integral
import Mathlib.Analysis.Convex.Mul

/-!
# A first-coefficient lower bound for multiplier parametrizations

This file isolates the analytic area estimate used for hyperbolic components.
If `psi` is an injective holomorphic map of a disk and `g = psi'`, change of
variables expresses the area of its image as the Dirichlet integral of
`normSq g`.  The mean-value property and Jensen's inequality then show that
this integral is at least the disk area times `normSq (g 0)`.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set MeasureTheory
open scoped Topology ENNReal

/-! ## Jensen's inequality for a complex circle average -/

/-- The squared complex norm is a convex real-valued function. -/
theorem convexOn_normSq : ConvexOn ℝ (Set.univ : Set ℂ) normSq := by
  refine ⟨convex_univ, ?_⟩
  intro x _ y _ a b ha hb hab
  simp only [normSq_apply, add_re, add_im, Complex.smul_re,
    Complex.smul_im, smul_eq_mul]
  nlinarith [mul_nonneg ha hb, sq_nonneg (x.re - y.re),
    sq_nonneg (x.im - y.im)]

/-- Jensen's inequality for the normalized average on a Euclidean circle. -/
theorem normSq_circleAverage_le_circleAverage_normSq
    {g : ℂ → ℂ} {c : ℂ} {R : ℝ}
    (hg : ContinuousOn g (sphere c |R|)) :
    normSq (Real.circleAverage g c R) ≤
      Real.circleAverage (fun z => normSq (g z)) c R := by
  let mu : Measure ℝ := volume.restrict (uIoc 0 (2 * Real.pi))
  let f : ℝ → ℂ := fun theta => g (circleMap c R theta)
  have hfinite : IsFiniteMeasure mu := by
    dsimp only [mu]
    rw [uIoc_of_le (by positivity : 0 ≤ 2 * Real.pi)]
    infer_instance
  letI : IsFiniteMeasure mu := hfinite
  have hne : NeZero mu := by
    refine ⟨?_⟩
    dsimp only [mu]
    simp
  letI : NeZero mu := hne
  have hf_cont : Continuous f := by
    dsimp only [f]
    apply ContinuousOn.comp_continuous hg
    · fun_prop
    · intro theta
      exact circleMap_mem_sphere' c R theta
  have hnorm_cont : Continuous (normSq ∘ f) :=
    Complex.continuous_normSq.comp hf_cont
  have hf_int : Integrable f mu := by
    change Integrable f (volume.restrict (uIoc 0 (2 * Real.pi)))
    exact hf_cont.integrableOn_uIoc.integrable
  have hnorm_int : Integrable (normSq ∘ f) mu := by
    change Integrable (normSq ∘ f) (volume.restrict (uIoc 0 (2 * Real.pi)))
    exact hnorm_cont.integrableOn_uIoc.integrable
  have hj := convexOn_normSq.map_average_le
    (μ := mu) (f := f) Complex.continuous_normSq.continuousOn
    isClosed_univ (by simp) hf_int hnorm_int
  simpa [Real.circleAverage_eq_intervalAverage, mu, f,
    Function.comp_def] using hj

/-- The angular integral in polar coordinates is `2 * pi` times the
normalized circle average. -/
theorem theta_integral_eq_two_pi_mul_circleAverage
    (h : ℂ → ℝ) (r : ℝ) :
    (∫ theta : ℝ in Ioo (-Real.pi) Real.pi,
      h (Complex.polarCoord.symm (r, theta))) =
        2 * Real.pi * Real.circleAverage h 0 r := by
  have hcircle (theta : ℝ) :
      circleMap 0 r theta = Complex.polarCoord.symm (r, theta) := by
    rw [circleMap_zero, Complex.polarCoord_symm_apply, Complex.exp_mul_I,
      ← Complex.ofReal_cos, ← Complex.ofReal_sin]
  rw [← integral_Ioc_eq_integral_Ioo,
    ← intervalIntegral.integral_of_le (by linarith [Real.pi_pos])]
  rw [Real.circleAverage_eq_integral_add (η := -Real.pi)]
  simp only [smul_eq_mul]
  simp_rw [hcircle]
  have hshift :
      (∫ theta : ℝ in 0..2 * Real.pi,
        h (Complex.polarCoord.symm (r, theta + -Real.pi))) =
      ∫ theta : ℝ in -Real.pi..Real.pi,
        h (Complex.polarCoord.symm (r, theta)) := by
    convert intervalIntegral.integral_comp_add_right
      (f := fun theta : ℝ => h (Complex.polarCoord.symm (r, theta)))
      (a := 0) (b := 2 * Real.pi) (-Real.pi) using 1
    all_goals ring_nf
  rw [hshift]
  field_simp [Real.pi_ne_zero]

/-! ## Polar decomposition of a disk integral -/

/-- Integral over a complex disk written as a radial integral of circle
averages.  The endpoint circles have measure zero, hence the open intervals. -/
theorem integral_ball_eq_integral_circleAverage
    {h : ℂ → ℝ} {R : ℝ} (_hR : 0 < R)
    (hcont : ContinuousOn h (closedBall (0 : ℂ) R)) :
    (∫ z : ℂ in ball (0 : ℂ) R, h z) =
      ∫ r : ℝ in Ioo (0 : ℝ) R,
        2 * Real.pi * r * Real.circleAverage h 0 r := by
  let small : Set (ℝ × ℝ) :=
    Ioo (0 : ℝ) R ×ˢ Ioo (-Real.pi) Real.pi
  let polarIntegrand : ℝ × ℝ → ℝ := fun p =>
    p.1 * (ball (0 : ℂ) R).indicator h (Complex.polarCoord.symm p)
  let rawIntegrand : ℝ × ℝ → ℝ := fun p =>
    p.1 * h (Complex.polarCoord.symm p)
  have hpolar := Complex.integral_comp_polarCoord_symm
    ((ball (0 : ℂ) R).indicator h)
  rw [integral_indicator measurableSet_ball] at hpolar
  rw [← hpolar]
  change (∫ p : ℝ × ℝ in Complex.polarCoord.target, polarIntegrand p) = _
  have hsmall_target : small ⊆ Complex.polarCoord.target := by
    rw [Complex.polarCoord_target]
    intro p hp
    exact ⟨hp.1.1, hp.2⟩
  have hrestrict :
      (∫ p : ℝ × ℝ in Complex.polarCoord.target, polarIntegrand p) =
        ∫ p : ℝ × ℝ in small, polarIntegrand p := by
    apply setIntegral_eq_of_subset_of_forall_sdiff_eq_zero
      Complex.polarCoord.open_target.measurableSet hsmall_target
    intro p hp
    have htarget := hp.1
    rw [Complex.polarCoord_target] at htarget
    have hr_pos : 0 < p.1 := htarget.1
    have hnot_lt : ¬p.1 < R := by
      intro hp_lt
      exact hp.2 ⟨⟨hr_pos, hp_lt⟩, htarget.2⟩
    have hnot_ball : Complex.polarCoord.symm p ∉ ball (0 : ℂ) R := by
      rw [mem_ball, dist_zero_right, Complex.norm_polarCoord_symm]
      simpa [abs_of_pos hr_pos] using hnot_lt
    change p.1 * (ball (0 : ℂ) R).indicator h
      (Complex.polarCoord.symm p) = 0
    rw [Set.indicator_of_notMem hnot_ball, mul_zero]
  rw [hrestrict]
  have hsmall_meas : MeasurableSet small :=
    measurableSet_Ioo.prod measurableSet_Ioo
  have hreplace :
      (∫ p : ℝ × ℝ in small, polarIntegrand p) =
        ∫ p : ℝ × ℝ in small, rawIntegrand p := by
    apply setIntegral_congr_fun hsmall_meas
    intro p hp
    have hr_pos : 0 < p.1 := hp.1.1
    have hr_lt : p.1 < R := hp.1.2
    have hball : Complex.polarCoord.symm p ∈ ball (0 : ℂ) R := by
      rw [mem_ball, dist_zero_right, Complex.norm_polarCoord_symm]
      simpa [abs_of_pos hr_pos] using hr_lt
    simp only [polarIntegrand, rawIntegrand, Set.indicator_of_mem hball]
  rw [hreplace]
  let closedRect : Set (ℝ × ℝ) :=
    Icc (0 : ℝ) R ×ˢ Icc (-Real.pi) Real.pi
  have hpolar_maps :
      MapsTo Complex.polarCoord.symm closedRect (closedBall (0 : ℂ) R) := by
    intro p hp
    rw [mem_closedBall, dist_zero_right, Complex.norm_polarCoord_symm]
    exact (abs_of_nonneg hp.1.1).trans_le hp.1.2
  have hraw_cont : ContinuousOn rawIntegrand closedRect := by
    dsimp only [rawIntegrand]
    have hpolar_cont :
        Continuous (fun p : ℝ × ℝ => Complex.polarCoord.symm p) := by
      simp only [Complex.polarCoord_symm_apply]
      fun_prop
    exact continuous_fst.continuousOn.mul
      (hcont.comp hpolar_cont.continuousOn hpolar_maps)
  have hsmall_subset_closed : small ⊆ closedRect :=
    prod_mono Ioo_subset_Icc_self Ioo_subset_Icc_self
  have hraw_int : IntegrableOn rawIntegrand small :=
    (ContinuousOn.integrableOn_compact
      (isCompact_Icc.prod isCompact_Icc) hraw_cont).mono_set
        hsmall_subset_closed
  change (∫ p : ℝ × ℝ in Ioo (0 : ℝ) R ×ˢ Ioo (-Real.pi) Real.pi,
    rawIntegrand p) = _
  rw [Measure.volume_eq_prod ℝ ℝ]
  rw [setIntegral_prod rawIntegrand hraw_int]
  change (∫ r : ℝ in Ioo (0 : ℝ) R,
    ∫ theta : ℝ in Ioo (-Real.pi) Real.pi,
      r * h (Complex.polarCoord.symm (r, theta))) = _
  simp_rw [integral_const_mul,
    theta_integral_eq_two_pi_mul_circleAverage h]
  congr 1
  funext r
  ring

/-! ## The first-coefficient energy bound -/

/-- On every circle strictly contained in the domain, a holomorphic function
has mean square at least the squared norm of its value at the center. -/
theorem normSq_center_le_circleAverage_normSq
    {g : ℂ → ℂ} {R r : ℝ} (hr : 0 < r) (hrR : r < R)
    (hg : DifferentiableOn ℂ g (ball (0 : ℂ) R)) :
    normSq (g 0) ≤ Real.circleAverage (fun z => normSq (g z)) 0 r := by
  have hclosed_subset :
      closedBall (0 : ℂ) r ⊆ ball (0 : ℂ) R := by
    intro z hz
    rw [mem_closedBall, dist_zero_right] at hz
    rw [mem_ball, dist_zero_right]
    exact hz.trans_lt hrR
  have hg_closed : DifferentiableOn ℂ g (closure (ball (0 : ℂ) r)) := by
    rw [closure_ball (0 : ℂ) hr.ne']
    exact hg.mono hclosed_subset
  have hdc : DiffContOnCl ℂ g (ball (0 : ℂ) r) :=
    hg_closed.diffContOnCl
  have hmean : Real.circleAverage g 0 r = g 0 := by
    have hdc' : DiffContOnCl ℂ g (ball (0 : ℂ) |r|) := by
      simpa [abs_of_pos hr] using hdc
    exact hdc'.circleAverage
  have hcircle_cont : ContinuousOn g (sphere (0 : ℂ) |r|) := by
    rw [abs_of_pos hr]
    exact hdc.continuousOn_ball.mono sphere_subset_closedBall
  calc
    normSq (g 0) = normSq (Real.circleAverage g 0 r) := by rw [hmean]
    _ ≤ Real.circleAverage (fun z => normSq (g z)) 0 r :=
      normSq_circleAverage_le_circleAverage_normSq hcircle_cont

theorem integral_linear_radius (R A : ℝ) (hR : 0 ≤ R) :
    (∫ r : ℝ in Ioo (0 : ℝ) R, 2 * Real.pi * r * A) =
      Real.pi * R ^ 2 * A := by
  rw [← integral_Ioc_eq_integral_Ioo,
    ← intervalIntegral.integral_of_le hR]
  rw [show (fun r : ℝ => 2 * Real.pi * r * A) =
      fun r : ℝ => (2 * Real.pi * A) * r by
    funext r
    ring]
  rw [intervalIntegral.integral_const_mul]
  rw [show (fun r : ℝ => r) = fun r : ℝ => r ^ 1 by
    funext r
    ring, integral_pow]
  ring

/-- The Dirichlet integral of a holomorphic function over a disk is bounded
below by its constant Taylor coefficient. -/
theorem pi_mul_sq_mul_normSq_center_le_integral_ball
    {g : ℂ → ℂ} {R : ℝ} (hR : 0 < R)
    (hg : DifferentiableOn ℂ g (ball (0 : ℂ) R))
    (hgcont : ContinuousOn g (closedBall (0 : ℂ) R)) :
    Real.pi * R ^ 2 * normSq (g 0) ≤
      ∫ z : ℂ in ball (0 : ℂ) R, normSq (g z) := by
  let energy : ℂ → ℝ := fun z => normSq (g z)
  let lower : ℝ → ℝ := fun r => 2 * Real.pi * r * normSq (g 0)
  let upper : ℝ → ℝ := fun r =>
    2 * Real.pi * r * Real.circleAverage energy 0 r
  have henergy_cont : ContinuousOn energy (closedBall (0 : ℂ) R) := by
    exact Complex.continuous_normSq.comp_continuousOn hgcont
  have hcircle_cont :
      ContinuousOn (Real.circleAverage energy 0) (Icc (0 : ℝ) R) := by
    apply Real.ContinuousOn.circleAverage
    · apply henergy_cont.mono
      intro z hz
      rw [mem_closedBall, dist_zero_right]
      simpa using hz.2
    · intro r hrIcc
      exact hrIcc.1
  have hlower_int : IntegrableOn lower (Ioo (0 : ℝ) R) := by
    have hlower_cont : Continuous lower := by
      dsimp only [lower]
      fun_prop
    exact hlower_cont.integrableOn_Icc.mono_set Ioo_subset_Icc_self
  have hupper_int : IntegrableOn upper (Ioo (0 : ℝ) R) := by
    have hupper_cont : ContinuousOn upper (Icc (0 : ℝ) R) := by
      dsimp only [upper]
      fun_prop
    exact hupper_cont.integrableOn_Icc.mono_set Ioo_subset_Icc_self
  have hpointwise : ∀ r ∈ Ioo (0 : ℝ) R, lower r ≤ upper r := by
    intro r hrIoo
    dsimp only [lower, upper, energy]
    have hmean := normSq_center_le_circleAverage_normSq
      hrIoo.1 hrIoo.2 hg
    exact mul_le_mul_of_nonneg_left hmean
      (mul_nonneg (mul_nonneg (by norm_num) Real.pi_pos.le) hrIoo.1.le)
  calc
    Real.pi * R ^ 2 * normSq (g 0) =
        ∫ r : ℝ in Ioo (0 : ℝ) R, lower r := by
      rw [integral_linear_radius R (normSq (g 0)) hR.le]
    _ ≤ ∫ r : ℝ in Ioo (0 : ℝ) R, upper r :=
      setIntegral_mono_on hlower_int hupper_int measurableSet_Ioo hpointwise
    _ = ∫ z : ℂ in ball (0 : ℂ) R, normSq (g z) := by
      symm
      simpa only [energy, upper] using
        integral_ball_eq_integral_circleAverage hR henergy_cont

/-! ## Jacobian of a holomorphic map -/

/-- The real Fréchet derivative associated with multiplication by `a`. -/
def complexScalarFDeriv (a : ℂ) : ℂ →L[ℝ] ℂ :=
  a • (1 : ℂ →L[ℝ] ℂ)

theorem det_complexScalarFDeriv (a : ℂ) :
    (complexScalarFDeriv a).det = normSq a := by
  simp only [complexScalarFDeriv, ← Complex.restrictScalars_toSpanSingleton]
  simp [ContinuousLinearMap.det, LinearMap.det_restrictScalars,
    Algebra.norm_complex_eq]

theorem hasFDerivAt_of_hasDerivAt
    {psi : ℂ → ℂ} {a z : ℂ} (h : HasDerivAt psi a z) :
    HasFDerivAt psi (complexScalarFDeriv a) z := by
  exact h.complexToReal_fderiv

/-- Change of variables for an injective holomorphic disk parametrization. -/
theorem volume_image_ball_eq_lintegral_normSq
    {psi g : ℂ → ℂ} {R : ℝ}
    (hderiv : ∀ z ∈ ball (0 : ℂ) R, HasDerivAt psi (g z) z)
    (hinj : InjOn psi (ball (0 : ℂ) R)) :
    volume (psi '' ball (0 : ℂ) R) =
      ∫⁻ z : ℂ in ball (0 : ℂ) R, ENNReal.ofReal (normSq (g z)) := by
  have h := lintegral_image_eq_lintegral_abs_det_fderiv_mul
    volume (measurableSet_ball : MeasurableSet (ball (0 : ℂ) R))
    (fun z hz => (hasFDerivAt_of_hasDerivAt (hderiv z hz)).hasFDerivWithinAt)
    hinj (fun _ : ℂ => (1 : ENNReal))
  simpa only [lintegral_one, Measure.restrict_apply_univ,
    det_complexScalarFDeriv, abs_of_nonneg (normSq_nonneg _), mul_one] using h

/-- First-coefficient area theorem for an injective holomorphic disk
parametrization.  No power-series expansion is assumed: the coefficient is
represented by the derivative `g 0`. -/
theorem ofReal_pi_mul_sq_mul_normSq_le_volume_image_ball
    {psi g : ℂ → ℂ} {R : ℝ} (hR : 0 < R)
    (hpsi : ∀ z ∈ ball (0 : ℂ) R, HasDerivAt psi (g z) z)
    (hg : DifferentiableOn ℂ g (ball (0 : ℂ) R))
    (hgcont : ContinuousOn g (closedBall (0 : ℂ) R))
    (hinj : InjOn psi (ball (0 : ℂ) R)) :
    ENNReal.ofReal (Real.pi * R ^ 2 * normSq (g 0)) ≤
      volume (psi '' ball (0 : ℂ) R) := by
  rw [volume_image_ball_eq_lintegral_normSq hpsi hinj]
  have henergy_cont :
      ContinuousOn (fun z : ℂ => normSq (g z)) (closedBall (0 : ℂ) R) :=
    Complex.continuous_normSq.comp_continuousOn hgcont
  have henergy_int :
      IntegrableOn (fun z : ℂ => normSq (g z)) (ball (0 : ℂ) R) :=
    (ContinuousOn.integrableOn_compact (isCompact_closedBall (0 : ℂ) R)
      henergy_cont).mono_set ball_subset_closedBall
  rw [← ofReal_integral_eq_lintegral_ofReal henergy_int
    (Filter.Eventually.of_forall fun z => normSq_nonneg (g z))]
  exact ENNReal.ofReal_le_ofReal
    (pi_mul_sq_mul_normSq_center_le_integral_ball hR hg hgcont)

end

end Mandelbrot
