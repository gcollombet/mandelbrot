/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodDiscriminant
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Topology.MetricSpace.Contracting

/-!
# Rational isolation certificates for low-period centers

This module supplies a small, reusable Newton--Banach certificate.  Its data
are exact complex/rational inequalities: no floating-point root finder is part
of the trusted proof.  Concrete period-three and period-four certificates are
recorded below.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set
open scoped ComplexConjugate

/-- Newton map with a fixed, nonzero approximate slope. -/
def fixedSlopeNewtonMap (p : ℂ → ℂ) (slope : ℂ) (z : ℂ) : ℂ :=
  z - p z / slope

/-- Exact data sufficient to isolate one zero of a complex differentiable
function in a closed disk.  In applications all displayed constants are
rational complex numbers and all inequalities reduce to rational arithmetic
plus the triangle inequality. -/
structure NewtonDiskCertificate (p dp : ℂ → ℂ) where
  center : ℂ
  radius : ℝ
  slope : ℂ
  contraction : NNReal
  radius_pos : 0 < radius
  slope_ne_zero : slope ≠ 0
  contraction_lt_one : contraction < 1
  hasDerivAt : ∀ z, HasDerivAt p (dp z) z
  derivative_bound : ∀ z ∈ closedBall center radius,
    ‖1 - dp z / slope‖₊ ≤ contraction
  residual_bound : ‖p center / slope‖ ≤
    (1 - (contraction : ℝ)) * radius

namespace NewtonDiskCertificate

variable {p dp : ℂ → ℂ}

theorem newton_hasDerivAt (cert : NewtonDiskCertificate p dp) (z : ℂ) :
    HasDerivAt (fixedSlopeNewtonMap p cert.slope)
      (1 - dp z / cert.slope) z := by
  exact (hasDerivAt_id z).sub ((cert.hasDerivAt z).div_const cert.slope)

theorem newton_lipschitzOn (cert : NewtonDiskCertificate p dp) :
    LipschitzOnWith cert.contraction (fixedSlopeNewtonMap p cert.slope)
      (closedBall cert.center cert.radius) := by
  apply (convex_closedBall cert.center cert.radius).lipschitzOnWith_of_nnnorm_deriv_le
  · intro z _
    exact (cert.newton_hasDerivAt z).differentiableAt
  · intro z hz
    rw [(cert.newton_hasDerivAt z).deriv]
    exact cert.derivative_bound z hz

theorem newton_mapsTo (cert : NewtonDiskCertificate p dp) :
    MapsTo (fixedSlopeNewtonMap p cert.slope)
      (closedBall cert.center cert.radius)
      (closedBall cert.center cert.radius) := by
  intro z hz
  rw [mem_closedBall] at hz ⊢
  have hlip := cert.newton_lipschitzOn.dist_le_mul z hz cert.center
    (mem_closedBall_self cert.radius_pos.le)
  have hcenter : dist (fixedSlopeNewtonMap p cert.slope cert.center) cert.center =
      ‖p cert.center / cert.slope‖ := by
    rw [dist_eq]
    simp only [fixedSlopeNewtonMap]
    rw [show cert.center - p cert.center / cert.slope - cert.center =
      -(p cert.center / cert.slope) by ring, norm_neg]
  calc
    dist (fixedSlopeNewtonMap p cert.slope z) cert.center ≤
        dist (fixedSlopeNewtonMap p cert.slope z)
            (fixedSlopeNewtonMap p cert.slope cert.center) +
          dist (fixedSlopeNewtonMap p cert.slope cert.center) cert.center :=
      dist_triangle _ _ _
    _ ≤ (cert.contraction : ℝ) * dist z cert.center +
        ‖p cert.center / cert.slope‖ := by
      rw [hcenter]
      exact add_le_add hlip le_rfl
    _ ≤ (cert.contraction : ℝ) * cert.radius +
        (1 - (cert.contraction : ℝ)) * cert.radius := by
      exact add_le_add
        (mul_le_mul_of_nonneg_left hz cert.contraction.coe_nonneg)
        cert.residual_bound
    _ = cert.radius := by ring

/-- The disk contains exactly one zero. -/
theorem existsUnique_zero (cert : NewtonDiskCertificate p dp) :
    ∃! z : ℂ, z ∈ closedBall cert.center cert.radius ∧ p z = 0 := by
  let T := fixedSlopeNewtonMap p cert.slope
  let s := closedBall cert.center cert.radius
  have hmaps : MapsTo T s s := cert.newton_mapsTo
  have hlip : LipschitzOnWith cert.contraction T s := cert.newton_lipschitzOn
  have hcontract : ContractingWith cert.contraction (hmaps.restrict T s s) :=
    ⟨cert.contraction_lt_one, fun x y ↦ hlip x.2 y.2⟩
  have hcenter : cert.center ∈ s := mem_closedBall_self cert.radius_pos.le
  have hfinite : edist cert.center (T cert.center) ≠ (⊤ : ENNReal) :=
    edist_ne_top _ _
  obtain ⟨z, hz, hfixed, _, _⟩ :=
    hcontract.exists_fixedPoint' (IsClosed.isComplete isClosed_closedBall)
      hmaps hcenter hfinite
  have hpz : p z = 0 := by
    have hfixeq : T z = z := hfixed
    dsimp only [T, fixedSlopeNewtonMap] at hfixeq
    have hdiv : p z / cert.slope = 0 := by linear_combination -hfixeq
    exact (div_eq_zero_iff).mp hdiv |>.resolve_right cert.slope_ne_zero
  refine ⟨z, ⟨hz, hpz⟩, ?_⟩
  intro y hy
  let zy : s := ⟨y, hy.1⟩
  let zz : s := ⟨z, hz⟩
  have hfixz : Function.IsFixedPt (hmaps.restrict T s s) zz := by
    apply Subtype.ext
    exact hfixed
  have hfixy : Function.IsFixedPt (hmaps.restrict T s s) zy := by
    apply Subtype.ext
    change y - p y / cert.slope = y
    rw [hy.2, zero_div, sub_zero]
  rcases hcontract.eq_or_edist_eq_top_of_fixedPoints hfixy hfixz with heq | htop
  · exact congrArg Subtype.val heq
  · exact False.elim ((edist_ne_top _ _) htop)

/-- A convenient constructor which clears both divisions in the certificate.
`slopeLower` can be certified by just one rational coordinate of `dp center`. -/
def of_fixedSlope_bounds
    (center : ℂ) (radius : ℝ) (K : NNReal) (slopeLower : ℝ)
    (hradius : 0 < radius) (hK : K < 1) (hLower : 0 < slopeLower)
    (hdiff : ∀ z, DifferentiableAt ℂ p z)
    (hderivEq : ∀ z, deriv p z = dp z)
    (hslope : slopeLower ≤ ‖dp center‖)
    (hvariation : ∀ z ∈ closedBall center radius,
      ‖dp center - dp z‖ ≤ (K : ℝ) * slopeLower)
    (hresidual : ‖p center‖ ≤
      (1 - (K : ℝ)) * radius * slopeLower) :
    NewtonDiskCertificate p dp := by
  have hslope0 : dp center ≠ 0 := by
    intro hzero
    rw [hzero, norm_zero] at hslope
    linarith
  refine
    { center := center
      radius := radius
      slope := dp center
      contraction := K
      radius_pos := hradius
      slope_ne_zero := hslope0
      contraction_lt_one := hK
      hasDerivAt := fun z ↦ by
        rw [← hderivEq z]
        exact (hdiff z).hasDerivAt
      derivative_bound := ?_
      residual_bound := ?_ }
  · intro z hz
    have hid : 1 - dp z / dp center = (dp center - dp z) / dp center := by
      field_simp [hslope0]
    rw [hid]
    have hnormpos : 0 < ‖dp center‖ := norm_pos_iff.mpr hslope0
    have hreal : ‖(dp center - dp z) / dp center‖ ≤ (K : ℝ) := by
      rw [norm_div]
      apply (div_le_iff₀ hnormpos).2
      exact (hvariation z hz).trans
        (mul_le_mul_of_nonneg_left hslope K.coe_nonneg)
    exact_mod_cast hreal
  · rw [norm_div]
    apply (div_le_iff₀ (norm_pos_iff.mpr hslope0)).2
    exact hresidual.trans
      (mul_le_mul_of_nonneg_left hslope
        (mul_nonneg (sub_nonneg.mpr hK.le) hradius.le))

end NewtonDiskCertificate

/-! ## Elementary polynomial estimates -/

/-- Mean-value estimate for powers on a norm-bounded complex disk. -/
theorem norm_pow_succ_sub_pow_succ_le
    (z q : ℂ) (B : ℝ) (hB : 0 ≤ B)
    (hz : ‖z‖ ≤ B) (hq : ‖q‖ ≤ B) :
    ∀ n : ℕ, ‖z ^ (n + 1) - q ^ (n + 1)‖ ≤
      (n + 1 : ℝ) * B ^ n * ‖z - q‖ := by
  intro n
  induction n with
  | zero => simp
  | succ n ih =>
      have hidentity : z ^ (n + 2) - q ^ (n + 2) =
          z * (z ^ (n + 1) - q ^ (n + 1)) + (z - q) * q ^ (n + 1) := by
        ring
      rw [hidentity]
      calc
        ‖z * (z ^ (n + 1) - q ^ (n + 1)) + (z - q) * q ^ (n + 1)‖ ≤
            ‖z‖ * ‖z ^ (n + 1) - q ^ (n + 1)‖ +
              ‖z - q‖ * ‖q‖ ^ (n + 1) := by
          simpa only [norm_mul, norm_pow] using norm_add_le
            (z * (z ^ (n + 1) - q ^ (n + 1)))
            ((z - q) * q ^ (n + 1))
        _ ≤ B * ((n + 1 : ℝ) * B ^ n * ‖z - q‖) +
            ‖z - q‖ * B ^ (n + 1) := by
          gcongr
        _ = (n + 2 : ℝ) * B ^ (n + 1) * ‖z - q‖ := by ring
        _ = ((n + 1 : ℕ) + 1 : ℝ) * B ^ (n + 1) * ‖z - q‖ := by
          have hcast : (n + 2 : ℝ) = ((n + 1 : ℕ) : ℝ) + 1 := by
            exact_mod_cast (show n + 2 = (n + 1) + 1 by omega)
          rw [hcast]

def certifiedPeriodThreeCenterEquation (c : ℂ) : ℂ :=
  periodThreeMultiplierEquation c 0 / 64

def periodThreeCenterDerivative (c : ℂ) : ℂ :=
  periodThreeParameterDerivativeEquation c 0 / 64

def certifiedPeriodFourCenterEquation (c : ℂ) : ℂ :=
  periodFourMultiplierEquation c 0 / 4096

def periodFourCenterDerivative (c : ℂ) : ℂ :=
  periodFourParameterDerivativeEquation c 0 / 4096

theorem certifiedPeriodThreeCenterEquation_eq (c : ℂ) :
    certifiedPeriodThreeCenterEquation c = periodThreeCenterEquation c := by
  rw [certifiedPeriodThreeCenterEquation, periodThreeMultiplierEquation_zero]
  ring

theorem certifiedPeriodFourCenterEquation_eq (c : ℂ) :
    certifiedPeriodFourCenterEquation c = periodFourCenterEquation c := by
  rw [certifiedPeriodFourCenterEquation, periodFourMultiplierEquation_zero]
  ring

theorem differentiable_certifiedPeriodThreeCenterEquation :
    Differentiable ℂ certifiedPeriodThreeCenterEquation := by
  unfold certifiedPeriodThreeCenterEquation periodThreeMultiplierEquation
  fun_prop

theorem deriv_certifiedPeriodThreeCenterEquation (c : ℂ) :
    deriv certifiedPeriodThreeCenterEquation c = periodThreeCenterDerivative c := by
  have h := (periodThreeParameterPolynomial 0).hasDerivAt c
  have heval : (fun z ↦ (periodThreeParameterPolynomial 0).eval z) =
      fun z ↦ periodThreeMultiplierEquation z 0 := by
    funext z
    exact periodThreeParameterPolynomial_eval z 0
  rw [heval, periodThreeParameterPolynomial_derivative_eval] at h
  have hdiv : HasDerivAt certifiedPeriodThreeCenterEquation
      (periodThreeCenterDerivative c) c := by
    convert h.div_const 64 using 1
    all_goals rfl
  exact hdiv.deriv

theorem differentiable_certifiedPeriodFourCenterEquation :
    Differentiable ℂ certifiedPeriodFourCenterEquation := by
  unfold certifiedPeriodFourCenterEquation periodFourMultiplierEquation
  fun_prop

theorem deriv_certifiedPeriodFourCenterEquation (c : ℂ) :
    deriv certifiedPeriodFourCenterEquation c = periodFourCenterDerivative c := by
  have h := (periodFourParameterPolynomial 0).hasDerivAt c
  have heval : (fun z ↦ (periodFourParameterPolynomial 0).eval z) =
      fun z ↦ periodFourMultiplierEquation z 0 := by
    funext z
    exact periodFourParameterPolynomial_eval z 0
  rw [heval, periodFourParameterPolynomial_derivative_eval] at h
  have hdiv : HasDerivAt certifiedPeriodFourCenterEquation
      (periodFourCenterDerivative c) c := by
    convert h.div_const 4096 using 1
    all_goals rfl
  exact hdiv.deriv

theorem periodThreeCenterDerivative_sub_norm_le
    (z q : ℂ) (hz : ‖z‖ ≤ 3) (hq : ‖q‖ ≤ 3) :
    ‖periodThreeCenterDerivative z - periodThreeCenterDerivative q‖ ≤
      22 * ‖z - q‖ := by
  have hpow2 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 1
  norm_num at hpow2
  have hzform : periodThreeCenterDerivative z = 3 * z ^ 2 + 4 * z + 1 := by
    norm_num [periodThreeCenterDerivative, periodThreeParameterDerivativeEquation]
    ring
  have hqform : periodThreeCenterDerivative q = 3 * q ^ 2 + 4 * q + 1 := by
    norm_num [periodThreeCenterDerivative, periodThreeParameterDerivativeEquation]
    ring
  rw [hzform, hqform]
  calc
    ‖(3 * z ^ 2 + 4 * z + 1) - (3 * q ^ 2 + 4 * q + 1)‖ =
        ‖3 * (z ^ 2 - q ^ 2) + 4 * (z - q)‖ := by ring_nf
    _ ≤ 3 * ‖z ^ 2 - q ^ 2‖ + 4 * ‖z - q‖ := by
      calc
        _ ≤ ‖3 * (z ^ 2 - q ^ 2)‖ + ‖4 * (z - q)‖ := norm_add_le _ _
        _ = _ := by norm_num
    _ ≤ 3 * (6 * ‖z - q‖) + 4 * ‖z - q‖ := by gcongr
    _ = 22 * ‖z - q‖ := by ring

theorem periodFourCenterDerivative_sub_norm_le
    (z q : ℂ) (hz : ‖z‖ ≤ 3) (hq : ‖q‖ ≤ 3) :
    ‖periodFourCenterDerivative z - periodFourCenterDerivative q‖ ≤
      4432 * ‖z - q‖ := by
  have h2 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 1
  have h3 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 2
  have h4 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 3
  have h5 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 4
  norm_num at h2 h3 h4 h5
  have hzform : periodFourCenterDerivative z =
      6 * z ^ 5 + 15 * z ^ 4 + 12 * z ^ 3 + 9 * z ^ 2 + 4 * z := by
    norm_num [periodFourCenterDerivative, periodFourParameterDerivativeEquation]
    ring
  have hqform : periodFourCenterDerivative q =
      6 * q ^ 5 + 15 * q ^ 4 + 12 * q ^ 3 + 9 * q ^ 2 + 4 * q := by
    norm_num [periodFourCenterDerivative, periodFourParameterDerivativeEquation]
    ring
  rw [hzform, hqform]
  have hsplit :
      ‖(6 * z ^ 5 + 15 * z ^ 4 + 12 * z ^ 3 + 9 * z ^ 2 + 4 * z) -
          (6 * q ^ 5 + 15 * q ^ 4 + 12 * q ^ 3 + 9 * q ^ 2 + 4 * q)‖ ≤
        6 * ‖z ^ 5 - q ^ 5‖ + 15 * ‖z ^ 4 - q ^ 4‖ +
          12 * ‖z ^ 3 - q ^ 3‖ + 9 * ‖z ^ 2 - q ^ 2‖ +
            4 * ‖z - q‖ := by
    calc
      _ = ‖6 * (z ^ 5 - q ^ 5) + 15 * (z ^ 4 - q ^ 4) +
          12 * (z ^ 3 - q ^ 3) + 9 * (z ^ 2 - q ^ 2) + 4 * (z - q)‖ := by
        ring_nf
      _ ≤ _ := by
        calc
          _ ≤ ‖6 * (z ^ 5 - q ^ 5) + 15 * (z ^ 4 - q ^ 4) +
                12 * (z ^ 3 - q ^ 3) + 9 * (z ^ 2 - q ^ 2)‖ +
              ‖4 * (z - q)‖ := norm_add_le _ _
          _ ≤ (‖6 * (z ^ 5 - q ^ 5) + 15 * (z ^ 4 - q ^ 4) +
                12 * (z ^ 3 - q ^ 3)‖ + ‖9 * (z ^ 2 - q ^ 2)‖) +
              ‖4 * (z - q)‖ := by gcongr; exact norm_add_le _ _
          _ ≤ ((‖6 * (z ^ 5 - q ^ 5) + 15 * (z ^ 4 - q ^ 4)‖ +
                ‖12 * (z ^ 3 - q ^ 3)‖) + ‖9 * (z ^ 2 - q ^ 2)‖) +
              ‖4 * (z - q)‖ := by gcongr; exact norm_add_le _ _
          _ ≤ (((‖6 * (z ^ 5 - q ^ 5)‖ + ‖15 * (z ^ 4 - q ^ 4)‖) +
                ‖12 * (z ^ 3 - q ^ 3)‖) + ‖9 * (z ^ 2 - q ^ 2)‖) +
              ‖4 * (z - q)‖ := by gcongr; exact norm_add_le _ _
          _ = _ := by norm_num
  calc
    _ ≤ 6 * ‖z ^ 5 - q ^ 5‖ + 15 * ‖z ^ 4 - q ^ 4‖ +
          12 * ‖z ^ 3 - q ^ 3‖ + 9 * ‖z ^ 2 - q ^ 2‖ +
            4 * ‖z - q‖ := hsplit
    _ ≤ 6 * (405 * ‖z - q‖) + 15 * (108 * ‖z - q‖) +
          12 * (27 * ‖z - q‖) + 9 * (6 * ‖z - q‖) +
            4 * ‖z - q‖ := by gcongr
    _ = 4432 * ‖z - q‖ := by ring

/-! ## Exact rational Newton disks -/

private theorem norm_le_three_of_mem_closedBall
    {q z : ℂ} {r : ℝ} (hq : ‖q‖ ≤ 2) (hr : r ≤ 1)
    (hz : z ∈ closedBall q r) : ‖z‖ ≤ 3 := by
  rw [mem_closedBall, dist_eq] at hz
  calc
    ‖z‖ = ‖(z - q) + q‖ := by ring_nf
    _ ≤ ‖z - q‖ + ‖q‖ := norm_add_le _ _
    _ ≤ r + 2 := add_le_add hz hq
    _ ≤ 3 := by linarith

def periodThreeCenterCertificateOfBounds
    (q : ℂ) (r : ℝ) (K : NNReal) (slopeLower : ℝ)
    (hrpos : 0 < r) (hrone : r ≤ 1) (hK : K < 1)
    (hLower : 0 < slopeLower) (hq : ‖q‖ ≤ 2)
    (hslope : slopeLower ≤ ‖periodThreeCenterDerivative q‖)
    (hvariation : 22 * r ≤ (K : ℝ) * slopeLower)
    (hresidual : ‖certifiedPeriodThreeCenterEquation q‖ ≤
      (1 - (K : ℝ)) * r * slopeLower) :
    NewtonDiskCertificate certifiedPeriodThreeCenterEquation
      periodThreeCenterDerivative := by
  apply NewtonDiskCertificate.of_fixedSlope_bounds q r K slopeLower
    hrpos hK hLower
    (fun z ↦ differentiable_certifiedPeriodThreeCenterEquation z)
    deriv_certifiedPeriodThreeCenterEquation hslope
  · intro z hz
    have hzdist : ‖z - q‖ ≤ r := by
      simpa only [mem_closedBall, dist_eq] using hz
    have hz3 := norm_le_three_of_mem_closedBall hq hrone hz
    have hq3 : ‖q‖ ≤ 3 := hq.trans (by norm_num)
    rw [show periodThreeCenterDerivative q - periodThreeCenterDerivative z =
      -(periodThreeCenterDerivative z - periodThreeCenterDerivative q) by ring,
      norm_neg]
    exact (periodThreeCenterDerivative_sub_norm_le z q hz3 hq3).trans
      ((mul_le_mul_of_nonneg_left hzdist (by norm_num)).trans hvariation)
  · exact hresidual

def periodFourCenterCertificateOfBounds
    (q : ℂ) (r : ℝ) (K : NNReal) (slopeLower : ℝ)
    (hrpos : 0 < r) (hrone : r ≤ 1) (hK : K < 1)
    (hLower : 0 < slopeLower) (hq : ‖q‖ ≤ 2)
    (hslope : slopeLower ≤ ‖periodFourCenterDerivative q‖)
    (hvariation : 4432 * r ≤ (K : ℝ) * slopeLower)
    (hresidual : ‖certifiedPeriodFourCenterEquation q‖ ≤
      (1 - (K : ℝ)) * r * slopeLower) :
    NewtonDiskCertificate certifiedPeriodFourCenterEquation
      periodFourCenterDerivative := by
  apply NewtonDiskCertificate.of_fixedSlope_bounds q r K slopeLower
    hrpos hK hLower
    (fun z ↦ differentiable_certifiedPeriodFourCenterEquation z)
    deriv_certifiedPeriodFourCenterEquation hslope
  · intro z hz
    have hzdist : ‖z - q‖ ≤ r := by
      simpa only [mem_closedBall, dist_eq] using hz
    have hz3 := norm_le_three_of_mem_closedBall hq hrone hz
    have hq3 : ‖q‖ ≤ 3 := hq.trans (by norm_num)
    rw [show periodFourCenterDerivative q - periodFourCenterDerivative z =
      -(periodFourCenterDerivative z - periodFourCenterDerivative q) by ring,
      norm_neg]
    exact (periodFourCenterDerivative_sub_norm_le z q hz3 hq3).trans
      ((mul_le_mul_of_nonneg_left hzdist (by norm_num)).trans hvariation)
  · exact hresidual

def periodThreeRealCenterApprox : ℂ :=
  -(1754878 / 1000000 : ℂ)

def periodThreeUpperCenterApprox : ℂ :=
  -(122561 / 1000000 : ℂ) + (744862 / 1000000 : ℂ) * I

private theorem periodThreeRealCenterApprox_norm_le_two :
    ‖periodThreeRealCenterApprox‖ ≤ 2 := by
  exact (norm_le_abs_re_add_abs_im _).trans (by
    norm_num [periodThreeRealCenterApprox])

private theorem periodThreeUpperCenterApprox_norm_le_two :
    ‖periodThreeUpperCenterApprox‖ ≤ 2 := by
  exact (norm_le_abs_re_add_abs_im _).trans (by
    norm_num [periodThreeUpperCenterApprox])

/-- Isolation disk for the real period-three center near `-1.754878`. -/
def periodThreeRealCenterCertificate :
    NewtonDiskCertificate certifiedPeriodThreeCenterEquation
      periodThreeCenterDerivative := by
  apply periodThreeCenterCertificateOfBounds periodThreeRealCenterApprox
    (1 / 1000000) (1 / 1000) 3
  · norm_num
  · norm_num
  · norm_num
  · norm_num
  · exact periodThreeRealCenterApprox_norm_le_two
  · calc
      (3 : ℝ) ≤ |(periodThreeCenterDerivative periodThreeRealCenterApprox).re| := by
        norm_num [periodThreeCenterDerivative, periodThreeParameterDerivativeEquation,
          periodThreeRealCenterApprox]
      _ ≤ ‖periodThreeCenterDerivative periodThreeRealCenterApprox‖ :=
        abs_re_le_norm _
  · norm_num
  · exact (norm_le_abs_re_add_abs_im _).trans (by
      norm_num [certifiedPeriodThreeCenterEquation, periodThreeMultiplierEquation,
        periodThreeRealCenterApprox])

/-- Isolation disk for the upper-half-plane period-three center near
`-0.122561 + 0.744862 i`.  Conjugation supplies the third selected center. -/
def periodThreeUpperCenterCertificate :
    NewtonDiskCertificate certifiedPeriodThreeCenterEquation
      periodThreeCenterDerivative := by
  apply periodThreeCenterCertificateOfBounds periodThreeUpperCenterApprox
    (1 / 1000000) (1 / 1000) 2
  · norm_num
  · norm_num
  · norm_num
  · norm_num
  · exact periodThreeUpperCenterApprox_norm_le_two
  · calc
      (2 : ℝ) ≤ |(periodThreeCenterDerivative periodThreeUpperCenterApprox).im| := by
        norm_num [periodThreeCenterDerivative, periodThreeParameterDerivativeEquation,
          periodThreeUpperCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im]
      _ ≤ ‖periodThreeCenterDerivative periodThreeUpperCenterApprox‖ :=
        abs_im_le_norm _
  · norm_num
  · exact (norm_le_abs_re_add_abs_im _).trans (by
      norm_num [certifiedPeriodThreeCenterEquation, periodThreeMultiplierEquation,
        periodThreeUpperCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im])

@[simp]
theorem periodThreeRealCenterCertificate_center :
    periodThreeRealCenterCertificate.center = periodThreeRealCenterApprox := rfl

@[simp]
theorem periodThreeRealCenterCertificate_radius :
    periodThreeRealCenterCertificate.radius = 1 / 1000000 := rfl

@[simp]
theorem periodThreeUpperCenterCertificate_center :
    periodThreeUpperCenterCertificate.center = periodThreeUpperCenterApprox := rfl

@[simp]
theorem periodThreeUpperCenterCertificate_radius :
    periodThreeUpperCenterCertificate.radius = 1 / 1000000 := rfl

theorem existsUnique_periodThreeRealCenter :
    ∃! c : ℂ, c ∈ closedBall periodThreeRealCenterApprox (1 / 1000000) ∧
      periodThreeCenterEquation c = 0 := by
  simpa only [certifiedPeriodThreeCenterEquation_eq,
    periodThreeRealCenterCertificate_center,
    periodThreeRealCenterCertificate_radius] using
    periodThreeRealCenterCertificate.existsUnique_zero

theorem existsUnique_periodThreeUpperCenter :
    ∃! c : ℂ, c ∈ closedBall periodThreeUpperCenterApprox (1 / 1000000) ∧
      periodThreeCenterEquation c = 0 := by
  simpa only [certifiedPeriodThreeCenterEquation_eq,
    periodThreeUpperCenterCertificate_center,
    periodThreeUpperCenterCertificate_radius] using
    periodThreeUpperCenterCertificate.existsUnique_zero

def periodFourRealCenterApprox : ℂ :=
  -(1310703 / 1000000 : ℂ)

def periodFourUpperSmallCenterApprox : ℂ :=
  -(156520 / 1000000 : ℂ) + (1032247 / 1000000 : ℂ) * I

def periodFourUpperLargeCenterApprox : ℂ :=
  (282271 / 1000000 : ℂ) + (530061 / 1000000 : ℂ) * I

private theorem periodFourRealCenterApprox_norm_le_two :
    ‖periodFourRealCenterApprox‖ ≤ 2 := by
  exact (norm_le_abs_re_add_abs_im _).trans (by
    norm_num [periodFourRealCenterApprox])

private theorem periodFourUpperSmallCenterApprox_norm_le_two :
    ‖periodFourUpperSmallCenterApprox‖ ≤ 2 := by
  exact (norm_le_abs_re_add_abs_im _).trans (by
    norm_num [periodFourUpperSmallCenterApprox])

private theorem periodFourUpperLargeCenterApprox_norm_le_two :
    ‖periodFourUpperLargeCenterApprox‖ ≤ 2 := by
  exact (norm_le_abs_re_add_abs_im _).trans (by
    norm_num [periodFourUpperLargeCenterApprox])

/-- Isolation disk for the selected real period-four center near `-1.310703`.
The other real center near `-1.9408` is deliberately not used in the area
budget because its first coefficient is too small. -/
def periodFourRealCenterCertificate :
    NewtonDiskCertificate certifiedPeriodFourCenterEquation
      periodFourCenterDerivative := by
  apply periodFourCenterCertificateOfBounds periodFourRealCenterApprox
    (1 / 1000000) (1 / 250) 4
  · norm_num
  · norm_num
  · norm_num
  · norm_num
  · exact periodFourRealCenterApprox_norm_le_two
  · calc
      (4 : ℝ) ≤ |(periodFourCenterDerivative periodFourRealCenterApprox).re| := by
        norm_num [periodFourCenterDerivative, periodFourParameterDerivativeEquation,
          periodFourRealCenterApprox]
      _ ≤ ‖periodFourCenterDerivative periodFourRealCenterApprox‖ :=
        abs_re_le_norm _
  · norm_num
  · exact (norm_le_abs_re_add_abs_im _).trans (by
      norm_num [certifiedPeriodFourCenterEquation, periodFourMultiplierEquation,
        periodFourRealCenterApprox])

/-- Isolation disk for the upper small-coefficient period-four center near
`-0.156520 + 1.032247 i`. -/
def periodFourUpperSmallCenterCertificate :
    NewtonDiskCertificate certifiedPeriodFourCenterEquation
      periodFourCenterDerivative := by
  apply periodFourCenterCertificateOfBounds periodFourUpperSmallCenterApprox
    (1 / 1000000) (1 / 250) 5
  · norm_num
  · norm_num
  · norm_num
  · norm_num
  · exact periodFourUpperSmallCenterApprox_norm_le_two
  · calc
      (5 : ℝ) ≤ |(periodFourCenterDerivative periodFourUpperSmallCenterApprox).re| := by
        norm_num [periodFourCenterDerivative, periodFourParameterDerivativeEquation,
          periodFourUpperSmallCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im]
      _ ≤ ‖periodFourCenterDerivative periodFourUpperSmallCenterApprox‖ :=
        abs_re_le_norm _
  · norm_num
  · exact (norm_le_abs_re_add_abs_im _).trans (by
      norm_num [certifiedPeriodFourCenterEquation, periodFourMultiplierEquation,
        periodFourUpperSmallCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im])

/-- Isolation disk for the upper large-coefficient period-four center near
`0.282271 + 0.530061 i`. -/
def periodFourUpperLargeCenterCertificate :
    NewtonDiskCertificate certifiedPeriodFourCenterEquation
      periodFourCenterDerivative := by
  apply periodFourCenterCertificateOfBounds periodFourUpperLargeCenterApprox
    (1 / 500000) (1 / 250) 3
  · norm_num
  · norm_num
  · norm_num
  · norm_num
  · exact periodFourUpperLargeCenterApprox_norm_le_two
  · calc
      (3 : ℝ) ≤ |(periodFourCenterDerivative periodFourUpperLargeCenterApprox).re| := by
        norm_num [periodFourCenterDerivative, periodFourParameterDerivativeEquation,
          periodFourUpperLargeCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im]
      _ ≤ ‖periodFourCenterDerivative periodFourUpperLargeCenterApprox‖ :=
        abs_re_le_norm _
  · norm_num
  · exact (norm_le_abs_re_add_abs_im _).trans (by
      norm_num [certifiedPeriodFourCenterEquation, periodFourMultiplierEquation,
        periodFourUpperLargeCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im])

@[simp] theorem periodFourRealCenterCertificate_center :
    periodFourRealCenterCertificate.center = periodFourRealCenterApprox := rfl
@[simp] theorem periodFourRealCenterCertificate_radius :
    periodFourRealCenterCertificate.radius = 1 / 1000000 := rfl
@[simp] theorem periodFourUpperSmallCenterCertificate_center :
    periodFourUpperSmallCenterCertificate.center = periodFourUpperSmallCenterApprox := rfl
@[simp] theorem periodFourUpperSmallCenterCertificate_radius :
    periodFourUpperSmallCenterCertificate.radius = 1 / 1000000 := rfl
@[simp] theorem periodFourUpperLargeCenterCertificate_center :
    periodFourUpperLargeCenterCertificate.center = periodFourUpperLargeCenterApprox := rfl
@[simp] theorem periodFourUpperLargeCenterCertificate_radius :
    periodFourUpperLargeCenterCertificate.radius = 1 / 500000 := rfl

theorem existsUnique_periodFourRealCenter :
    ∃! c : ℂ, c ∈ closedBall periodFourRealCenterApprox (1 / 1000000) ∧
      periodFourCenterEquation c = 0 := by
  simpa only [certifiedPeriodFourCenterEquation_eq,
    periodFourRealCenterCertificate_center,
    periodFourRealCenterCertificate_radius] using
    periodFourRealCenterCertificate.existsUnique_zero

theorem existsUnique_periodFourUpperSmallCenter :
    ∃! c : ℂ, c ∈ closedBall periodFourUpperSmallCenterApprox (1 / 1000000) ∧
      periodFourCenterEquation c = 0 := by
  simpa only [certifiedPeriodFourCenterEquation_eq,
    periodFourUpperSmallCenterCertificate_center,
    periodFourUpperSmallCenterCertificate_radius] using
    periodFourUpperSmallCenterCertificate.existsUnique_zero

theorem existsUnique_periodFourUpperLargeCenter :
    ∃! c : ℂ, c ∈ closedBall periodFourUpperLargeCenterApprox (1 / 500000) ∧
      periodFourCenterEquation c = 0 := by
  simpa only [certifiedPeriodFourCenterEquation_eq,
    periodFourUpperLargeCenterCertificate_center,
    periodFourUpperLargeCenterCertificate_radius] using
    periodFourUpperLargeCenterCertificate.existsUnique_zero

/-! ## Conjugate isolation disks -/

theorem existsUnique_conj_closedBall_zero
    {p : ℂ → ℂ} {q : ℂ} {r : ℝ}
    (hconj : ∀ z, p (conj z) = conj (p z))
    (h : ∃! z : ℂ, z ∈ closedBall q r ∧ p z = 0) :
    ∃! z : ℂ, z ∈ closedBall (conj q) r ∧ p z = 0 := by
  obtain ⟨z, hz, hunique⟩ := h
  refine ⟨conj z, ?_, ?_⟩
  · constructor
    · rw [mem_closedBall] at hz ⊢
      simpa only [dist_conj_conj] using hz.1
    · rw [hconj, hz.2, map_zero]
  · intro y hy
    have hcyMem : conj y ∈ closedBall q r := by
      rw [mem_closedBall] at hy ⊢
      calc
        dist (conj y) q = dist (conj y) (conj (conj q)) := by rw [conj_conj]
        _ = dist y (conj q) := dist_conj_conj _ _
        _ ≤ r := hy.1
    have hcyZero : p (conj y) = 0 := by
      rw [hconj, hy.2, map_zero]
    have hcy := hunique (conj y) ⟨hcyMem, hcyZero⟩
    have := congrArg conj hcy
    simpa only [conj_conj] using this

theorem periodThreeCenterEquation_conj (z : ℂ) :
    periodThreeCenterEquation (conj z) =
      conj (periodThreeCenterEquation z) := by
  have h2 : conj (2 : ℂ) = 2 := map_ofNat _ _
  simp only [periodThreeCenterEquation, map_add, map_mul, map_pow, map_one, h2]

theorem periodFourCenterEquation_conj (z : ℂ) :
    periodFourCenterEquation (conj z) =
      conj (periodFourCenterEquation z) := by
  have h2 : conj (2 : ℂ) = 2 := map_ofNat _ _
  have h3 : conj (3 : ℂ) = 3 := map_ofNat _ _
  simp only [periodFourCenterEquation, map_add, map_mul, map_pow, map_one, h2, h3]

def periodThreeLowerCenterApprox : ℂ := conj periodThreeUpperCenterApprox
def periodFourLowerSmallCenterApprox : ℂ := conj periodFourUpperSmallCenterApprox
def periodFourLowerLargeCenterApprox : ℂ := conj periodFourUpperLargeCenterApprox

theorem existsUnique_periodThreeLowerCenter :
    ∃! c : ℂ, c ∈ closedBall periodThreeLowerCenterApprox (1 / 1000000) ∧
      periodThreeCenterEquation c = 0 := by
  exact existsUnique_conj_closedBall_zero periodThreeCenterEquation_conj
    existsUnique_periodThreeUpperCenter

theorem existsUnique_periodFourLowerSmallCenter :
    ∃! c : ℂ, c ∈ closedBall periodFourLowerSmallCenterApprox (1 / 1000000) ∧
      periodFourCenterEquation c = 0 := by
  exact existsUnique_conj_closedBall_zero periodFourCenterEquation_conj
    existsUnique_periodFourUpperSmallCenter

theorem existsUnique_periodFourLowerLargeCenter :
    ∃! c : ℂ, c ∈ closedBall periodFourLowerLargeCenterApprox (1 / 500000) ∧
      periodFourCenterEquation c = 0 := by
  exact existsUnique_conj_closedBall_zero periodFourCenterEquation_conj
    existsUnique_periodFourUpperLargeCenter

/-! ## Selected exact centers and coefficient bounds -/

noncomputable def periodThreeRealCenter : ℂ :=
  Classical.choose existsUnique_periodThreeRealCenter
noncomputable def periodThreeUpperCenter : ℂ :=
  Classical.choose existsUnique_periodThreeUpperCenter
noncomputable def periodFourRealCenter : ℂ :=
  Classical.choose existsUnique_periodFourRealCenter
noncomputable def periodFourUpperSmallCenter : ℂ :=
  Classical.choose existsUnique_periodFourUpperSmallCenter
noncomputable def periodFourUpperLargeCenter : ℂ :=
  Classical.choose existsUnique_periodFourUpperLargeCenter

theorem periodThreeRealCenter_spec :
    periodThreeRealCenter ∈ closedBall periodThreeRealCenterApprox (1 / 1000000) ∧
      periodThreeCenterEquation periodThreeRealCenter = 0 :=
  Classical.choose_spec existsUnique_periodThreeRealCenter |>.1

theorem periodThreeUpperCenter_spec :
    periodThreeUpperCenter ∈ closedBall periodThreeUpperCenterApprox (1 / 1000000) ∧
      periodThreeCenterEquation periodThreeUpperCenter = 0 :=
  Classical.choose_spec existsUnique_periodThreeUpperCenter |>.1

theorem periodFourRealCenter_spec :
    periodFourRealCenter ∈ closedBall periodFourRealCenterApprox (1 / 1000000) ∧
      periodFourCenterEquation periodFourRealCenter = 0 :=
  Classical.choose_spec existsUnique_periodFourRealCenter |>.1

theorem periodFourUpperSmallCenter_spec :
    periodFourUpperSmallCenter ∈
        closedBall periodFourUpperSmallCenterApprox (1 / 1000000) ∧
      periodFourCenterEquation periodFourUpperSmallCenter = 0 :=
  Classical.choose_spec existsUnique_periodFourUpperSmallCenter |>.1

theorem periodFourUpperLargeCenter_spec :
    periodFourUpperLargeCenter ∈
        closedBall periodFourUpperLargeCenterApprox (1 / 500000) ∧
      periodFourCenterEquation periodFourUpperLargeCenter = 0 :=
  Classical.choose_spec existsUnique_periodFourUpperLargeCenter |>.1

private theorem lt_norm_of_sq_lt_normSq (z : ℂ) {a : ℝ}
    (ha : 0 ≤ a) (h : a ^ 2 < normSq z) : a < ‖z‖ := by
  nlinarith [Complex.norm_nonneg z, norm_mul_self_eq_normSq z]

private theorem norm_lt_of_normSq_lt_sq (z : ℂ) {b : ℝ}
    (hb : 0 ≤ b) (h : normSq z < b ^ 2) : ‖z‖ < b := by
  nlinarith [Complex.norm_nonneg z, norm_mul_self_eq_normSq z]

private theorem norm_sub_center_le_of_mem_closedBall
    {c q : ℂ} {r : ℝ} (hc : c ∈ closedBall q r) : ‖c - q‖ ≤ r := by
  simpa only [mem_closedBall, dist_eq] using hc

private theorem affineNumerator_norm_lower
    {c q : ℂ} {r A L : ℝ} (hc : c ∈ closedBall q r)
    (hL : L < ‖q + 2‖) (hmargin : A + r ≤ L) :
    A < ‖c + 2‖ := by
  have hdist := norm_sub_center_le_of_mem_closedBall hc
  have htri : ‖q + 2‖ ≤ ‖c + 2‖ + ‖c - q‖ := by
    calc
      ‖q + 2‖ = ‖(c + 2) - (c - q)‖ := by ring_nf
      _ ≤ ‖c + 2‖ + ‖c - q‖ := norm_sub_le _ _
  linarith

def periodFourCoefficientNumerator (c : ℂ) : ℂ :=
  3 + c ^ 2 - c ^ 3 - c ^ 4

private theorem periodFourCoefficientNumerator_sub_norm_le
    (z q : ℂ) (hz : ‖z‖ ≤ 3) (hq : ‖q‖ ≤ 3) :
    ‖periodFourCoefficientNumerator z - periodFourCoefficientNumerator q‖ ≤
      141 * ‖z - q‖ := by
  have h2 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 1
  have h3 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 2
  have h4 := norm_pow_succ_sub_pow_succ_le z q 3 (by norm_num) hz hq 3
  norm_num at h2 h3 h4
  unfold periodFourCoefficientNumerator
  calc
    ‖(3 + z ^ 2 - z ^ 3 - z ^ 4) - (3 + q ^ 2 - q ^ 3 - q ^ 4)‖ =
        ‖(z ^ 2 - q ^ 2) - (z ^ 3 - q ^ 3) - (z ^ 4 - q ^ 4)‖ := by ring_nf
    _ ≤ ‖z ^ 2 - q ^ 2‖ + ‖z ^ 3 - q ^ 3‖ + ‖z ^ 4 - q ^ 4‖ := by
      exact (norm_sub_le _ _).trans
        (add_le_add (norm_sub_le _ _) le_rfl)
    _ ≤ 6 * ‖z - q‖ + 27 * ‖z - q‖ + 108 * ‖z - q‖ := by gcongr
    _ = 141 * ‖z - q‖ := by ring

private theorem periodThreeDerivative_norm_upper
    {c q : ℂ} {r B Bq : ℝ} (hq : ‖q‖ ≤ 2) (hr : r ≤ 1)
    (hc : c ∈ closedBall q r) (hBq : ‖periodThreeCenterDerivative q‖ < Bq)
    (hbudget : Bq + 22 * r ≤ B) :
    ‖periodThreeCenterDerivative c‖ < B := by
  have hc3 := norm_le_three_of_mem_closedBall hq hr hc
  have hq3 : ‖q‖ ≤ 3 := hq.trans (by norm_num)
  have hdist := norm_sub_center_le_of_mem_closedBall hc
  have hdiff := periodThreeCenterDerivative_sub_norm_le c q hc3 hq3
  have htri : ‖periodThreeCenterDerivative c‖ ≤
      ‖periodThreeCenterDerivative q‖ +
        ‖periodThreeCenterDerivative c - periodThreeCenterDerivative q‖ := by
    calc
      _ = ‖periodThreeCenterDerivative q +
          (periodThreeCenterDerivative c - periodThreeCenterDerivative q)‖ := by ring_nf
      _ ≤ _ := norm_add_le _ _
  have hdiff' : ‖periodThreeCenterDerivative c - periodThreeCenterDerivative q‖ ≤
      22 * r := hdiff.trans (mul_le_mul_of_nonneg_left hdist (by norm_num))
  linarith

private theorem periodFourDerivative_norm_upper
    {c q : ℂ} {r B Bq : ℝ} (hq : ‖q‖ ≤ 2) (hr : r ≤ 1)
    (hc : c ∈ closedBall q r) (hBq : ‖periodFourCenterDerivative q‖ < Bq)
    (hbudget : Bq + 4432 * r ≤ B) :
    ‖periodFourCenterDerivative c‖ < B := by
  have hc3 := norm_le_three_of_mem_closedBall hq hr hc
  have hq3 : ‖q‖ ≤ 3 := hq.trans (by norm_num)
  have hdist := norm_sub_center_le_of_mem_closedBall hc
  have hdiff := periodFourCenterDerivative_sub_norm_le c q hc3 hq3
  have htri : ‖periodFourCenterDerivative c‖ ≤
      ‖periodFourCenterDerivative q‖ +
        ‖periodFourCenterDerivative c - periodFourCenterDerivative q‖ := by
    calc
      _ = ‖periodFourCenterDerivative q +
          (periodFourCenterDerivative c - periodFourCenterDerivative q)‖ := by ring_nf
      _ ≤ _ := norm_add_le _ _
  have hdiff' : ‖periodFourCenterDerivative c - periodFourCenterDerivative q‖ ≤
      4432 * r := hdiff.trans (mul_le_mul_of_nonneg_left hdist (by norm_num))
  linarith

private theorem periodFourNumerator_norm_lower
    {c q : ℂ} {r A L : ℝ} (hq : ‖q‖ ≤ 2) (hr : r ≤ 1)
    (hc : c ∈ closedBall q r)
    (hL : L < ‖periodFourCoefficientNumerator q‖)
    (hmargin : A + 141 * r ≤ L) :
    A < ‖periodFourCoefficientNumerator c‖ := by
  have hc3 := norm_le_three_of_mem_closedBall hq hr hc
  have hq3 : ‖q‖ ≤ 3 := hq.trans (by norm_num)
  have hdist := norm_sub_center_le_of_mem_closedBall hc
  have hdiff := periodFourCoefficientNumerator_sub_norm_le c q hc3 hq3
  have hdiff' : ‖periodFourCoefficientNumerator c -
      periodFourCoefficientNumerator q‖ ≤ 141 * r :=
    hdiff.trans (mul_le_mul_of_nonneg_left hdist (by norm_num))
  have htri : ‖periodFourCoefficientNumerator q‖ ≤
      ‖periodFourCoefficientNumerator c‖ +
        ‖periodFourCoefficientNumerator c - periodFourCoefficientNumerator q‖ := by
    calc
      _ = ‖periodFourCoefficientNumerator c -
          (periodFourCoefficientNumerator c - periodFourCoefficientNumerator q)‖ := by ring_nf
      _ ≤ _ := norm_sub_le _ _
  linarith

theorem periodThreeCenterDerivative_ne_zero_of_center
    (c : ℂ) (hc : periodThreeCenterEquation c = 0) :
    periodThreeCenterDerivative c ≠ 0 := by
  have hroot : periodThreeMultiplierEquation c 0 = 0 := by
    rw [periodThreeMultiplierEquation_zero, hc]
    ring
  have hne := periodThreeParameterDerivativeEquation_ne_zero_of_root
    c 0 (by norm_num) hroot
  exact div_ne_zero hne (by norm_num)

theorem periodFourCenterDerivative_ne_zero_of_center
    (c : ℂ) (hc : periodFourCenterEquation c = 0) :
    periodFourCenterDerivative c ≠ 0 := by
  have hroot : periodFourMultiplierEquation c 0 = 0 := by
    rw [periodFourMultiplierEquation_zero, hc]
    ring
  have hne := periodFourParameterDerivativeEquation_ne_zero_of_root
    c 0 (by norm_num) hroot
  exact div_ne_zero hne (by norm_num)

private theorem periodThreeFirstCoefficient_norm_gt_of_bounds
    (c : ℂ) (t A B : ℝ) (ht : 0 < t)
    (hc : periodThreeCenterEquation c = 0)
    (hnum : A < ‖c + 2‖)
    (hden : ‖periodThreeCenterDerivative c‖ < B)
    (hbudget : t * 8 * B ≤ A) :
    t < ‖periodThreeFirstCoefficient c‖ := by
  have hderiv0 := periodThreeCenterDerivative_ne_zero_of_center c hc
  have hformula : periodThreeFirstCoefficient c =
      (c + 2) / (8 * periodThreeCenterDerivative c) := by
    norm_num [periodThreeFirstCoefficient, periodThreeCenterDerivative,
      periodThreeParameterDerivativeEquation]
    ring
  rw [hformula, norm_div, norm_mul]
  norm_num
  apply (lt_div_iff₀ (mul_pos (by norm_num) (norm_pos_iff.mpr hderiv0))).2
  calc
    t * (8 * ‖periodThreeCenterDerivative c‖) < t * (8 * B) := by
      exact mul_lt_mul_of_pos_left
        (mul_lt_mul_of_pos_left hden (by norm_num)) ht
    _ = t * 8 * B := by ring
    _ ≤ A := hbudget
    _ < ‖c + 2‖ := hnum

private theorem periodFourFirstCoefficient_norm_gt_of_bounds
    (c : ℂ) (t A B : ℝ) (ht : 0 < t)
    (hc : periodFourCenterEquation c = 0)
    (hnum : A < ‖periodFourCoefficientNumerator c‖)
    (hden : ‖periodFourCenterDerivative c‖ < B)
    (hbudget : t * 16 * B ≤ A) :
    t < ‖periodFourFirstCoefficient c‖ := by
  have hderiv0 := periodFourCenterDerivative_ne_zero_of_center c hc
  have hformula : periodFourFirstCoefficient c =
      periodFourCoefficientNumerator c / (16 * periodFourCenterDerivative c) := by
    norm_num [periodFourFirstCoefficient, periodFourCoefficientNumerator,
      periodFourCenterDerivative, periodFourParameterDerivativeEquation]
  rw [hformula, norm_div, norm_mul]
  norm_num
  apply (lt_div_iff₀ (mul_pos (by norm_num) (norm_pos_iff.mpr hderiv0))).2
  calc
    t * (16 * ‖periodFourCenterDerivative c‖) < t * (16 * B) := by
      exact mul_lt_mul_of_pos_left
        (mul_lt_mul_of_pos_left hden (by norm_num)) ht
    _ = t * 16 * B := by ring
    _ ≤ A := hbudget
    _ < ‖periodFourCoefficientNumerator c‖ := hnum

/-- The selected real period-three branch clears the rounded coefficient
threshold `0.009`. -/
theorem periodThreeRealCenter_firstCoefficient_norm_gt :
    (9 / 1000 : ℝ) < ‖periodThreeFirstCoefficient periodThreeRealCenter‖ := by
  apply periodThreeFirstCoefficient_norm_gt_of_bounds periodThreeRealCenter
    (9 / 1000) (6 / 25) (13 / 4) (by norm_num)
    periodThreeRealCenter_spec.2
  · apply affineNumerator_norm_lower periodThreeRealCenter_spec.1
      (L := 245 / 1000)
    · apply lt_norm_of_sq_lt_normSq _ (by norm_num)
      norm_num [normSq_apply, periodThreeRealCenterApprox,
        pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · apply periodThreeDerivative_norm_upper
      periodThreeRealCenterApprox_norm_le_two (by norm_num)
      periodThreeRealCenter_spec.1 (Bq := 161 / 50)
    · apply norm_lt_of_normSq_lt_sq _ (by norm_num)
      norm_num [normSq_apply, periodThreeCenterDerivative,
        periodThreeParameterDerivativeEquation, periodThreeRealCenterApprox,
        pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · norm_num

/-- The selected nonreal period-three pair clears `0.094`; conjugation
preserves the same norm for the lower branch. -/
theorem periodThreeUpperCenter_firstCoefficient_norm_gt :
    (94 / 1000 : ℝ) < ‖periodThreeFirstCoefficient periodThreeUpperCenter‖ := by
  apply periodThreeFirstCoefficient_norm_gt_of_bounds periodThreeUpperCenter
    (94 / 1000) (2011 / 1000) (2673 / 1000) (by norm_num)
    periodThreeUpperCenter_spec.2
  · apply affineNumerator_norm_lower periodThreeUpperCenter_spec.1
      (L := 2019 / 1000)
    · apply lt_norm_of_sq_lt_normSq _ (by norm_num)
      norm_num [normSq_apply, periodThreeUpperCenterApprox,
        pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · apply periodThreeDerivative_norm_upper
      periodThreeUpperCenterApprox_norm_le_two (by norm_num)
      periodThreeUpperCenter_spec.1 (Bq := 53459 / 20000)
    · apply norm_lt_of_normSq_lt_sq _ (by norm_num)
      norm_num [normSq_apply, periodThreeCenterDerivative,
        periodThreeParameterDerivativeEquation, periodThreeUpperCenterApprox,
        pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · norm_num

/-- The selected real period-four branch clears `0.058`. -/
theorem periodFourRealCenter_firstCoefficient_norm_gt :
    (58 / 1000 : ℝ) < ‖periodFourFirstCoefficient periodFourRealCenter‖ := by
  apply periodFourFirstCoefficient_norm_gt_of_bounds periodFourRealCenter
    (58 / 1000) 4 (427 / 100) (by norm_num) periodFourRealCenter_spec.2
  · apply periodFourNumerator_norm_lower periodFourRealCenterApprox_norm_le_two
      (by norm_num) periodFourRealCenter_spec.1 (L := 401 / 100)
    · apply lt_norm_of_sq_lt_normSq _ (by norm_num)
      norm_num [normSq_apply, periodFourCoefficientNumerator,
        periodFourRealCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · apply periodFourDerivative_norm_upper
      periodFourRealCenterApprox_norm_le_two (by norm_num)
      periodFourRealCenter_spec.1 (Bq := 213 / 50)
    · apply norm_lt_of_normSq_lt_sq _ (by norm_num)
      norm_num [normSq_apply, periodFourCenterDerivative,
        periodFourParameterDerivativeEquation, periodFourRealCenterApprox,
        pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · norm_num

/-- The small-coefficient nonreal period-four pair still clears `0.004`. -/
theorem periodFourUpperSmallCenter_firstCoefficient_norm_gt :
    (4 / 1000 : ℝ) <
      ‖periodFourFirstCoefficient periodFourUpperSmallCenter‖ := by
  apply periodFourFirstCoefficient_norm_gt_of_bounds periodFourUpperSmallCenter
    (4 / 1000) (48 / 100) (714 / 100) (by norm_num)
    periodFourUpperSmallCenter_spec.2
  · apply periodFourNumerator_norm_lower periodFourUpperSmallCenterApprox_norm_le_two
      (by norm_num) periodFourUpperSmallCenter_spec.1 (L := 483 / 1000)
    · apply lt_norm_of_sq_lt_normSq _ (by norm_num)
      norm_num [normSq_apply, periodFourCoefficientNumerator,
        periodFourUpperSmallCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · apply periodFourDerivative_norm_upper
      periodFourUpperSmallCenterApprox_norm_le_two (by norm_num)
      periodFourUpperSmallCenter_spec.1 (Bq := 1783 / 250)
    · apply norm_lt_of_normSq_lt_sq _ (by norm_num)
      norm_num [normSq_apply, periodFourCenterDerivative,
        periodFourParameterDerivativeEquation, periodFourUpperSmallCenterApprox,
        pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · norm_num

/-- The large-coefficient nonreal period-four pair clears `0.043`. -/
theorem periodFourUpperLargeCenter_firstCoefficient_norm_gt :
    (43 / 1000 : ℝ) <
      ‖periodFourFirstCoefficient periodFourUpperLargeCenter‖ := by
  apply periodFourFirstCoefficient_norm_gt_of_bounds periodFourUpperLargeCenter
    (43 / 1000) (309 / 100) (442 / 100) (by norm_num)
    periodFourUpperLargeCenter_spec.2
  · apply periodFourNumerator_norm_lower periodFourUpperLargeCenterApprox_norm_le_two
      (by norm_num) periodFourUpperLargeCenter_spec.1 (L := 3094 / 1000)
    · apply lt_norm_of_sq_lt_normSq _ (by norm_num)
      norm_num [normSq_apply, periodFourCoefficientNumerator,
        periodFourUpperLargeCenterApprox, pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · apply periodFourDerivative_norm_upper
      periodFourUpperLargeCenterApprox_norm_le_two (by norm_num)
      periodFourUpperLargeCenter_spec.1 (Bq := 441 / 100)
    · apply norm_lt_of_normSq_lt_sq _ (by norm_num)
      norm_num [normSq_apply, periodFourCenterDerivative,
        periodFourParameterDerivativeEquation, periodFourUpperLargeCenterApprox,
        pow_succ, Complex.mul_re, Complex.mul_im]
    · norm_num
  · norm_num

end

end Mandelbrot
