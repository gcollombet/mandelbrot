/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodDiscriminant
import Mathlib.Analysis.Calculus.ImplicitContDiff
import Mathlib.Analysis.Calculus.Deriv.Polynomial
import Mathlib.Analysis.Convex.Contractible
import Mathlib.Analysis.Polynomial.CauchyBound
import Mathlib.Topology.Covering.Basic
import Mathlib.Topology.Homotopy.Lifting
import Mathlib.Topology.Maps.Proper.CompactlyGenerated

/-!
# Low-period multiplier curves over the open unit disk

This file fixes the topological objects used by the covering-space part of the
area proof.  A point of a multiplier curve is a pair `(mu, c)` with `|mu| < 1`
satisfying the corresponding exact multiplier equation.  The projection keeps
the multiplier coordinate.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Metric
open scoped Topology

/-- The open unit disk in the multiplier plane. -/
def openUnitMultiplierDisk : Set ℂ := ball 0 1

/-- The open unit disk regarded as a topological type. -/
abbrev OpenUnitMultiplierDisk := openUnitMultiplierDisk

theorem mem_openUnitMultiplierDisk_iff (mu : ℂ) :
    mu ∈ openUnitMultiplierDisk ↔ ‖mu‖ < 1 := by
  simp [openUnitMultiplierDisk, mem_ball, dist_zero_right]

/-- The distinguished multiplier `0` in the open disk. -/
def multiplierDiskZero : OpenUnitMultiplierDisk :=
  ⟨0, by simp [openUnitMultiplierDisk]⟩

/-- The period-three algebraic multiplier curve above the open unit disk. -/
abbrev PeriodThreeMultiplierCurve :=
  {p : OpenUnitMultiplierDisk × ℂ //
    periodThreeMultiplierEquation p.2 p.1 = 0}

/-- The period-four algebraic multiplier curve above the open unit disk. -/
abbrev PeriodFourMultiplierCurve :=
  {p : OpenUnitMultiplierDisk × ℂ //
    periodFourMultiplierEquation p.2 p.1 = 0}

/-- Projection of the period-three curve to its multiplier coordinate. -/
def periodThreeMultiplierProjection
    (p : PeriodThreeMultiplierCurve) : OpenUnitMultiplierDisk :=
  p.1.1

/-- Projection of the period-four curve to its multiplier coordinate. -/
def periodFourMultiplierProjection
    (p : PeriodFourMultiplierCurve) : OpenUnitMultiplierDisk :=
  p.1.1

@[simp]
theorem periodThreeMultiplierProjection_coe (p : PeriodThreeMultiplierCurve) :
    (periodThreeMultiplierProjection p : ℂ) = p.1.1 := rfl

@[simp]
theorem periodFourMultiplierProjection_coe (p : PeriodFourMultiplierCurve) :
    (periodFourMultiplierProjection p : ℂ) = p.1.1 := rfl

theorem continuous_periodThreeMultiplierProjection :
    Continuous periodThreeMultiplierProjection := by
  unfold periodThreeMultiplierProjection
  fun_prop

theorem continuous_periodFourMultiplierProjection :
    Continuous periodFourMultiplierProjection := by
  unfold periodFourMultiplierProjection
  fun_prop

/-! ## A reusable proper-local-homeomorphism covering criterion -/

/-- A proper local homeomorphism from a Hausdorff space is a covering map.
Mathlib already supplies the finite-sheet gluing theorem; properness makes each
discrete fiber compact and hence finite. -/
theorem IsProperMap.isCoveringMap_of_isLocalHomeomorph
    {E X : Type*} [TopologicalSpace E] [TopologicalSpace X] [T2Space E]
    {f : E → X} (hproper : IsProperMap f) (hlocal : IsLocalHomeomorph f) :
    IsCoveringMap f := by
  rw [isCoveringMap_iff_isCoveringMapOn_univ]
  apply hproper.isClosedMap.isCoveringMapOn_of_openPartialHomeomorph
  · intro x _
    let hcharts : ∀ e ∈ f ⁻¹' {x},
        ∃ phi : OpenPartialHomeomorph E X, e ∈ phi.source ∧ phi = f := by
      intro e _
      obtain ⟨phi, he, hphi⟩ := hlocal e
      exact ⟨phi, he, hphi.symm⟩
    exact (hproper.isCompact_preimage isCompact_singleton).finite
      (IsDiscrete.of_openPartialHomeomorph f subset_rfl hcharts)
  · intro e _
    obtain ⟨phi, he, hphi⟩ := hlocal e
    exact ⟨phi, he, hphi.symm⟩

theorem periodThree_curve_equation (p : PeriodThreeMultiplierCurve) :
    periodThreeMultiplierEquation p.1.2 p.1.1 = 0 :=
  p.2

theorem periodFour_curve_equation (p : PeriodFourMultiplierCurve) :
    periodFourMultiplierEquation p.1.2 p.1.1 = 0 :=
  p.2

/-- Every point of the period-three curve is a simple parameter root. -/
theorem periodThree_curve_parameterDerivative_ne_zero
    (p : PeriodThreeMultiplierCurve) :
    periodThreeParameterDerivativeEquation p.1.2 p.1.1 ≠ 0 := by
  apply periodThreeParameterDerivativeEquation_ne_zero_of_root
    p.1.2 p.1.1 (le_of_lt ((mem_openUnitMultiplierDisk_iff p.1.1).1 p.1.1.2))
  exact p.2

/-- Every point of the period-four curve is a simple parameter root. -/
theorem periodFour_curve_parameterDerivative_ne_zero
    (p : PeriodFourMultiplierCurve) :
    periodFourParameterDerivativeEquation p.1.2 p.1.1 ≠ 0 := by
  apply periodFourParameterDerivativeEquation_ne_zero_of_root
    p.1.2 p.1.1 (le_of_lt ((mem_openUnitMultiplierDisk_iff p.1.1).1 p.1.1.2))
  exact p.2

/-! ## Uniform Cauchy bounds for parameter roots -/

/-- A deliberately coarse uniform Cauchy bound for all period-three parameter
polynomials above the closed unit multiplier disk. -/
theorem periodThree_cauchyBound_le_five (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    Polynomial.cauchyBound (periodThreeParameterPolynomial mu) ≤ 5 := by
  have hdeg : (periodThreeParameterPolynomial mu).natDegree = 3 :=
    Polynomial.natDegree_eq_of_degree_eq_some (periodThreeParameterPolynomial_degree mu)
  have hlead : (periodThreeParameterPolynomial mu).leadingCoeff = 64 := by
    rw [Polynomial.leadingCoeff, hdeg]
    simp only [periodThreeParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hmu_nn : ‖mu‖₊ ≤ 1 := by exact_mod_cast hmu
  have hcoeff0 : (periodThreeParameterPolynomial mu).coeff 0 =
      64 - 16 * mu + mu ^ 2 := by
    simp only [periodThreeParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff1 : (periodThreeParameterPolynomial mu).coeff 1 =
      64 - 8 * mu := by
    simp only [periodThreeParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff2 : (periodThreeParameterPolynomial mu).coeff 2 = 128 := by
    simp only [periodThreeParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff : ∀ i ∈ Finset.range 3,
      ‖(periodThreeParameterPolynomial mu).coeff i‖₊ ≤ 256 := by
    intro i hi
    have hi' : i < 3 := Finset.mem_range.mp hi
    interval_cases i
    · rw [hcoeff0]
      calc
        ‖64 - 16 * mu + mu ^ 2‖₊ ≤ ‖64 - 16 * mu‖₊ + ‖mu ^ 2‖₊ := nnnorm_add_le _ _
        _ ≤ (‖(64 : ℂ)‖₊ + ‖16 * mu‖₊) + ‖mu ^ 2‖₊ := by
          gcongr
          exact nnnorm_sub_le _ _
        _ ≤ 256 := by
          simp only [nnnorm_mul, nnnorm_pow]
          norm_num
          calc
            64 + 16 * ‖mu‖₊ + ‖mu‖₊ ^ 2 ≤ 64 + 16 * 1 + 1 ^ 2 := by gcongr
            _ ≤ 256 := by norm_num
    · rw [hcoeff1]
      calc
        ‖64 - 8 * mu‖₊ ≤ ‖(64 : ℂ)‖₊ + ‖8 * mu‖₊ := nnnorm_sub_le _ _
        _ ≤ 256 := by
          simp only [nnnorm_mul]
          norm_num
          calc
            64 + 8 * ‖mu‖₊ ≤ 64 + 8 * 1 := by gcongr
            _ ≤ 256 := by norm_num
    · rw [hcoeff2]
      norm_num
  rw [Polynomial.cauchyBound, hdeg, hlead]
  have hsup : (Finset.range 3).sup
      (fun i ↦ ‖(periodThreeParameterPolynomial mu).coeff i‖₊) ≤ 256 :=
    Finset.sup_le hcoeff
  calc
    (Finset.range 3).sup (fun i ↦ ‖(periodThreeParameterPolynomial mu).coeff i‖₊) /
          ‖(64 : ℂ)‖₊ + 1 ≤ 256 / ‖(64 : ℂ)‖₊ + 1 := by gcongr
    _ = 5 := by norm_num

/-- A deliberately coarse uniform Cauchy bound for all period-four parameter
polynomials above the closed unit multiplier disk. -/
theorem periodFour_cauchyBound_le_five (mu : ℂ) (hmu : ‖mu‖ ≤ 1) :
    Polynomial.cauchyBound (periodFourParameterPolynomial mu) ≤ 5 := by
  have hdeg : (periodFourParameterPolynomial mu).natDegree = 6 :=
    Polynomial.natDegree_eq_of_degree_eq_some (periodFourParameterPolynomial_degree mu)
  have hlead : (periodFourParameterPolynomial mu).leadingCoeff = 4096 := by
    rw [Polynomial.leadingCoeff, hdeg]
    simp only [periodFourParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hmu_nn : ‖mu‖₊ ≤ 1 := by exact_mod_cast hmu
  have hcoeff0 : (periodFourParameterPolynomial mu).coeff 0 =
      4096 - 768 * mu + 48 * mu ^ 2 - mu ^ 3 := by
    simp only [periodFourParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff1 : (periodFourParameterPolynomial mu).coeff 1 = 0 := by
    simp only [periodFourParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff2 : (periodFourParameterPolynomial mu).coeff 2 =
      8192 - 256 * mu - 16 * mu ^ 2 := by
    simp only [periodFourParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff3 : (periodFourParameterPolynomial mu).coeff 3 =
      12288 + 256 * mu := by
    simp only [periodFourParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff4 : (periodFourParameterPolynomial mu).coeff 4 =
      12288 + 256 * mu := by
    simp only [periodFourParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff5 : (periodFourParameterPolynomial mu).coeff 5 = 12288 := by
    simp only [periodFourParameterPolynomial, Polynomial.coeff_add,
      Polynomial.coeff_C_mul_X_pow, Polynomial.coeff_C]
    norm_num
  have hcoeff : ∀ i ∈ Finset.range 6,
      ‖(periodFourParameterPolynomial mu).coeff i‖₊ ≤ 16384 := by
    intro i hi
    have hi' : i < 6 := Finset.mem_range.mp hi
    interval_cases i
    · rw [hcoeff0]
      calc
        ‖4096 - 768 * mu + 48 * mu ^ 2 - mu ^ 3‖₊ ≤
            ‖4096 - 768 * mu + 48 * mu ^ 2‖₊ + ‖mu ^ 3‖₊ := nnnorm_sub_le _ _
        _ ≤ (‖4096 - 768 * mu‖₊ + ‖48 * mu ^ 2‖₊) + ‖mu ^ 3‖₊ := by
          gcongr
          exact nnnorm_add_le _ _
        _ ≤ ((‖(4096 : ℂ)‖₊ + ‖768 * mu‖₊) + ‖48 * mu ^ 2‖₊) +
            ‖mu ^ 3‖₊ := by
          gcongr
          exact nnnorm_sub_le _ _
        _ ≤ 16384 := by
          simp only [nnnorm_mul, nnnorm_pow]
          norm_num
          calc
            4096 + 768 * ‖mu‖₊ + 48 * ‖mu‖₊ ^ 2 + ‖mu‖₊ ^ 3 ≤
                4096 + 768 * 1 + 48 * 1 ^ 2 + 1 ^ 3 := by gcongr
            _ ≤ 16384 := by norm_num
    · rw [hcoeff1]
      norm_num
    · rw [hcoeff2]
      calc
        ‖8192 - 256 * mu - 16 * mu ^ 2‖₊ ≤
            ‖8192 - 256 * mu‖₊ + ‖16 * mu ^ 2‖₊ := nnnorm_sub_le _ _
        _ ≤ (‖(8192 : ℂ)‖₊ + ‖256 * mu‖₊) + ‖16 * mu ^ 2‖₊ := by
          gcongr
          exact nnnorm_sub_le _ _
        _ ≤ 16384 := by
          simp only [nnnorm_mul, nnnorm_pow]
          norm_num
          calc
            8192 + 256 * ‖mu‖₊ + 16 * ‖mu‖₊ ^ 2 ≤
                8192 + 256 * 1 + 16 * 1 ^ 2 := by gcongr
            _ ≤ 16384 := by norm_num
    · rw [hcoeff3]
      calc
        ‖12288 + 256 * mu‖₊ ≤ ‖(12288 : ℂ)‖₊ + ‖256 * mu‖₊ := nnnorm_add_le _ _
        _ ≤ 16384 := by
          simp only [nnnorm_mul]
          norm_num
          calc
            12288 + 256 * ‖mu‖₊ ≤ 12288 + 256 * 1 := by gcongr
            _ ≤ 16384 := by norm_num
    · rw [hcoeff4]
      calc
        ‖12288 + 256 * mu‖₊ ≤ ‖(12288 : ℂ)‖₊ + ‖256 * mu‖₊ := nnnorm_add_le _ _
        _ ≤ 16384 := by
          simp only [nnnorm_mul]
          norm_num
          calc
            12288 + 256 * ‖mu‖₊ ≤ 12288 + 256 * 1 := by gcongr
            _ ≤ 16384 := by norm_num
    · rw [hcoeff5]
      norm_num
  rw [Polynomial.cauchyBound, hdeg, hlead]
  have hsup : (Finset.range 6).sup
      (fun i ↦ ‖(periodFourParameterPolynomial mu).coeff i‖₊) ≤ 16384 :=
    Finset.sup_le hcoeff
  calc
    (Finset.range 6).sup (fun i ↦ ‖(periodFourParameterPolynomial mu).coeff i‖₊) /
          ‖(4096 : ℂ)‖₊ + 1 ≤ 16384 / ‖(4096 : ℂ)‖₊ + 1 := by gcongr
    _ = 5 := by norm_num

theorem periodThree_parameterRoot_norm_lt_five (c mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (hroot : periodThreeMultiplierEquation c mu = 0) : ‖c‖ < 5 := by
  have hpne : periodThreeParameterPolynomial mu ≠ 0 := by
    intro hp
    have := periodThreeParameterPolynomial_degree mu
    simp [hp] at this
  have hisRoot : (periodThreeParameterPolynomial mu).IsRoot c := by
    rw [Polynomial.IsRoot.def, periodThreeParameterPolynomial_eval]
    exact hroot
  have hc := hisRoot.norm_lt_cauchyBound hpne
  exact_mod_cast hc.trans_le (periodThree_cauchyBound_le_five mu hmu)

theorem periodFour_parameterRoot_norm_lt_five (c mu : ℂ) (hmu : ‖mu‖ ≤ 1)
    (hroot : periodFourMultiplierEquation c mu = 0) : ‖c‖ < 5 := by
  have hpne : periodFourParameterPolynomial mu ≠ 0 := by
    intro hp
    have := periodFourParameterPolynomial_degree mu
    simp [hp] at this
  have hisRoot : (periodFourParameterPolynomial mu).IsRoot c := by
    rw [Polynomial.IsRoot.def, periodFourParameterPolynomial_eval]
    exact hroot
  have hc := hisRoot.norm_lt_cauchyBound hpne
  exact_mod_cast hc.trans_le (periodFour_cauchyBound_le_five mu hmu)

/-! ## Local implicit root branches -/

/-- The period-three equation with multiplier first and parameter second. -/
def periodThreeImplicitEquation (p : ℂ × ℂ) : ℂ :=
  periodThreeMultiplierEquation p.2 p.1

/-- The period-four equation with multiplier first and parameter second. -/
def periodFourImplicitEquation (p : ℂ × ℂ) : ℂ :=
  periodFourMultiplierEquation p.2 p.1

theorem contDiff_periodThreeImplicitEquation :
    ContDiff ℂ ⊤ periodThreeImplicitEquation := by
  unfold periodThreeImplicitEquation periodThreeMultiplierEquation
  fun_prop

theorem contDiff_periodFourImplicitEquation :
    ContDiff ℂ ⊤ periodFourImplicitEquation := by
  unfold periodFourImplicitEquation periodFourMultiplierEquation
  fun_prop

/-- A one-dimensional partial derivative is invertible when its scalar
derivative is nonzero.  The statement is packaged in the exact form required
by `ContDiffAt.implicitFunction`. -/
private theorem partialFDeriv_isInvertible_of_hasDeriv
    {F : ℂ × ℂ → ℂ} {mu c d : ℂ}
    (hF : DifferentiableAt ℂ F (mu, c))
    (hsection : HasDerivAt (fun z => F (mu, z)) d c)
    (hd : d ≠ 0) :
    (fderiv ℂ F (mu, c) ∘L ContinuousLinearMap.inr ℂ ℂ ℂ).IsInvertible := by
  have hcomp := hF.hasFDerivAt.comp c (hasFDerivAt_prodMk_right mu c)
  have heq : fderiv ℂ F (mu, c) ∘L ContinuousLinearMap.inr ℂ ℂ ℂ =
      ContinuousLinearMap.toSpanSingleton ℂ d :=
    hcomp.unique hsection.hasFDerivAt
  rw [heq]
  apply ContinuousLinearMap.IsInvertible.of_inverse
    (g := ContinuousLinearMap.toSpanSingleton ℂ d⁻¹)
  · apply ContinuousLinearMap.ext
    intro z
    simp [ContinuousLinearMap.comp_apply,
      ContinuousLinearMap.toSpanSingleton_apply, hd]
  · apply ContinuousLinearMap.ext
    intro z
    simp [ContinuousLinearMap.comp_apply,
      ContinuousLinearMap.toSpanSingleton_apply, hd]

theorem periodThree_partialFDeriv_isInvertible
    (p : PeriodThreeMultiplierCurve) :
    (fderiv ℂ periodThreeImplicitEquation (p.1.1, p.1.2) ∘L
      ContinuousLinearMap.inr ℂ ℂ ℂ).IsInvertible := by
  apply partialFDeriv_isInvertible_of_hasDeriv
    (contDiff_periodThreeImplicitEquation.differentiable (by simp) (p.1.1, p.1.2))
    (d := periodThreeParameterDerivativeEquation p.1.2 p.1.1)
  · simpa only [periodThreeImplicitEquation,
      periodThreeParameterPolynomial_eval,
      periodThreeParameterPolynomial_derivative_eval] using
      (periodThreeParameterPolynomial (p.1.1 : ℂ)).hasDerivAt p.1.2
  · exact periodThree_curve_parameterDerivative_ne_zero p

theorem periodFour_partialFDeriv_isInvertible
    (p : PeriodFourMultiplierCurve) :
    (fderiv ℂ periodFourImplicitEquation (p.1.1, p.1.2) ∘L
      ContinuousLinearMap.inr ℂ ℂ ℂ).IsInvertible := by
  apply partialFDeriv_isInvertible_of_hasDeriv
    (contDiff_periodFourImplicitEquation.differentiable (by simp) (p.1.1, p.1.2))
    (d := periodFourParameterDerivativeEquation p.1.2 p.1.1)
  · simpa only [periodFourImplicitEquation,
      periodFourParameterPolynomial_eval,
      periodFourParameterPolynomial_derivative_eval] using
      (periodFourParameterPolynomial (p.1.1 : ℂ)).hasDerivAt p.1.2
  · exact periodFour_curve_parameterDerivative_ne_zero p

/-- Every period-three curve point admits a unique local complex-smooth root
branch through it.  Over `ℂ`, this is the holomorphic local branch supplied by
the implicit-function theorem. -/
theorem exists_periodThree_localRootBranch (p : PeriodThreeMultiplierCurve) :
    ∃ phi : ℂ → ℂ,
      phi p.1.1 = p.1.2 ∧
      ContDiffAt ℂ ⊤ phi p.1.1 ∧
      (∀ᶠ mu in 𝓝 (p.1.1 : ℂ), periodThreeMultiplierEquation (phi mu) mu = 0) ∧
      (∀ᶠ q in 𝓝 ((p.1.1 : ℂ), p.1.2),
        periodThreeMultiplierEquation q.2 q.1 = 0 ↔ phi q.1 = q.2) := by
  let cdf := contDiff_periodThreeImplicitEquation.contDiffAt
    (x := ((p.1.1 : ℂ), p.1.2))
  let hinv := periodThree_partialFDeriv_isInvertible p
  let phi : ℂ → ℂ := cdf.implicitFunction (by norm_num) hinv
  refine ⟨phi, ?_, ?_, ?_, ?_⟩
  · exact cdf.implicitFunction_apply_self (by norm_num) hinv
  · exact cdf.contDiffAt_implicitFunction (by norm_num) hinv
  · filter_upwards [cdf.eventually_apply_implicitFunction (by norm_num) hinv] with mu hmu
    simpa only [periodThreeImplicitEquation, p.2] using hmu
  · filter_upwards [cdf.eventually_apply_eq_iff_implicitFunction (by norm_num) hinv] with q hq
    simpa only [periodThreeImplicitEquation, p.2] using hq

/-- Every period-four curve point admits a unique local holomorphic root branch
through it. -/
theorem exists_periodFour_localRootBranch (p : PeriodFourMultiplierCurve) :
    ∃ phi : ℂ → ℂ,
      phi p.1.1 = p.1.2 ∧
      ContDiffAt ℂ ⊤ phi p.1.1 ∧
      (∀ᶠ mu in 𝓝 (p.1.1 : ℂ), periodFourMultiplierEquation (phi mu) mu = 0) ∧
      (∀ᶠ q in 𝓝 ((p.1.1 : ℂ), p.1.2),
        periodFourMultiplierEquation q.2 q.1 = 0 ↔ phi q.1 = q.2) := by
  let cdf := contDiff_periodFourImplicitEquation.contDiffAt
    (x := ((p.1.1 : ℂ), p.1.2))
  let hinv := periodFour_partialFDeriv_isInvertible p
  let phi : ℂ → ℂ := cdf.implicitFunction (by norm_num) hinv
  refine ⟨phi, ?_, ?_, ?_, ?_⟩
  · exact cdf.implicitFunction_apply_self (by norm_num) hinv
  · exact cdf.contDiffAt_implicitFunction (by norm_num) hinv
  · filter_upwards [cdf.eventually_apply_implicitFunction (by norm_num) hinv] with mu hmu
    simpa only [periodFourImplicitEquation, p.2] using hmu
  · filter_upwards [cdf.eventually_apply_eq_iff_implicitFunction (by norm_num) hinv] with q hq
    simpa only [periodFourImplicitEquation, p.2] using hq

/-! ## Local homeomorphism structure -/

/-- A local continuous branch, together with local uniqueness of the zero,
turns the projection of a one-parameter zero locus into a local
homeomorphism.  This isolates the topology from the period-specific
polynomial calculations. -/
private theorem multiplierCurveProjection_isLocalHomeomorph
    (F : ℂ → ℂ → ℂ)
    (hbranch : ∀ p : {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0},
      ∃ phi : ℂ → ℂ,
        phi p.1.1 = p.1.2 ∧
        ContDiffAt ℂ ⊤ phi p.1.1 ∧
        (∀ᶠ mu in 𝓝 (p.1.1 : ℂ), F (phi mu) mu = 0) ∧
        (∀ᶠ q in 𝓝 ((p.1.1 : ℂ), p.1.2),
          F q.2 q.1 = 0 ↔ phi q.1 = q.2)) :
    IsLocalHomeomorph
      (fun p : {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0} ↦ p.1.1) := by
  classical
  apply IsLocalHomeomorph.mk
  intro p
  obtain ⟨phi, hphi, hphiDiff, hrootEventually, huniqueEventually⟩ := hbranch p
  let uniqueSet : Set (ℂ × ℂ) :=
    {q | F q.2 q.1 = 0 ↔ phi q.1 = q.2}
  let W : Set (ℂ × ℂ) := interior uniqueSet
  have hWOpen : IsOpen W := isOpen_interior
  have hpW : ((p.1.1 : ℂ), p.1.2) ∈ W := by
    exact mem_interior_iff_mem_nhds.mpr huniqueEventually
  obtain ⟨continuitySet, hcontinuitySet, hphiOn⟩ :=
    hphiDiff.contDiffOn (m := 1) (by simp) (by simp)
  have hgraphAt : ContinuousAt (fun mu : ℂ ↦ (mu, phi mu)) p.1.1 :=
    continuousAt_id.prodMk hphiDiff.continuousAt
  have hpGraphW : ((p.1.1 : ℂ), phi p.1.1) ∈ W := by
    simpa only [hphi] using hpW
  have hgraphEventually :
      {mu : ℂ | (mu, phi mu) ∈ W} ∈ 𝓝 (p.1.1 : ℂ) :=
    hgraphAt.preimage_mem_nhds (hWOpen.mem_nhds hpGraphW)
  let goodMultiplierSet : Set ℂ :=
    {mu | F (phi mu) mu = 0} ∩
      {mu | (mu, phi mu) ∈ W} ∩ continuitySet
  have hgoodMultiplierSet : goodMultiplierSet ∈ 𝓝 (p.1.1 : ℂ) := by
    exact inter_mem (inter_mem hrootEventually hgraphEventually) hcontinuitySet
  let V : Set ℂ := interior goodMultiplierSet
  have hVOpen : IsOpen V := isOpen_interior
  have hpV : (p.1.1 : ℂ) ∈ V :=
    mem_interior_iff_mem_nhds.mpr hgoodMultiplierSet
  let target : Set OpenUnitMultiplierDisk :=
    {mu | (mu : ℂ) ∈ V}
  have htargetOpen : IsOpen target := by
    exact hVOpen.preimage continuous_subtype_val
  let source : Set {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0} :=
    {q | q.1.1 ∈ target ∧ ((q.1.1 : ℂ), q.1.2) ∈ W}
  have hsourceOpen : IsOpen source := by
    have hprojection : Continuous
        (fun q : {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0} ↦ q.1.1) := by
      fun_prop
    have hambient : Continuous
        (fun q : {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0} ↦
          ((q.1.1 : ℂ), q.1.2)) := by
      fun_prop
    exact (htargetOpen.preimage hprojection).inter (hWOpen.preimage hambient)
  have hroot (mu : OpenUnitMultiplierDisk) (hmu : mu ∈ target) :
      F (phi mu) mu = 0 := by
    exact (interior_subset (s := goodMultiplierSet) hmu).1.1
  have hgraphW (mu : OpenUnitMultiplierDisk) (hmu : mu ∈ target) :
      ((mu : ℂ), phi mu) ∈ W := by
    exact (interior_subset (s := goodMultiplierSet) hmu).1.2
  let invFun : OpenUnitMultiplierDisk →
      {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0} :=
    fun mu ↦ if hmu : mu ∈ target then
      ⟨(mu, phi mu), hroot mu hmu⟩
    else p
  let partialEquiv : PartialEquiv
      {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0}
      OpenUnitMultiplierDisk := {
    toFun := fun q ↦ q.1.1
    invFun := invFun
    source := source
    target := target
    map_source' := fun _q hq ↦ hq.1
    map_target' := by
      intro mu hmu
      change invFun mu ∈ source
      dsimp only [invFun]
      rw [dif_pos hmu]
      exact ⟨hmu, hgraphW mu hmu⟩
    left_inv' := by
      intro q hq
      change invFun q.1.1 = q
      simp only [invFun, dif_pos hq.1]
      apply Subtype.ext
      apply Prod.ext
      · rfl
      · exact (interior_subset hq.2).mp q.2
    right_inv' := by
      intro mu hmu
      change (invFun mu).1.1 = mu
      simp only [invFun, dif_pos hmu]
    }
  let localEquiv : OpenPartialHomeomorph
      {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0}
      OpenUnitMultiplierDisk := {
    toPartialEquiv := partialEquiv
    open_source := hsourceOpen
    open_target := htargetOpen
    continuousOn_toFun := by
      exact (by fun_prop : Continuous
        (fun q : {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0} ↦ q.1.1)).continuousOn
    continuousOn_invFun := by
      rw [continuousOn_iff_continuous_restrict]
      apply continuous_induced_rng.mpr
      have hmuVal : Continuous (fun mu : target ↦ mu.1) :=
        continuous_subtype_val
      have hval : Continuous (fun mu : target ↦ (mu.1 : ℂ)) := by
        fun_prop
      have hphiTarget : Continuous (fun mu : target ↦ phi (mu.1 : ℂ)) := by
        apply hphiOn.continuousOn.comp_continuous hval
        intro mu
        exact (interior_subset (s := goodMultiplierSet) mu.2).2
      change Continuous (fun mu : target ↦ (invFun mu.1).1)
      convert hmuVal.prodMk hphiTarget using 1
      funext mu
      simp only [invFun, dif_pos mu.2]
    }
  refine ⟨localEquiv, ?_, ?_⟩
  · exact ⟨hpV, hpW⟩
  · intro q _hq
    rfl

theorem periodThreeMultiplierProjection_isLocalHomeomorph :
    IsLocalHomeomorph periodThreeMultiplierProjection := by
  apply multiplierCurveProjection_isLocalHomeomorph periodThreeMultiplierEquation
  exact exists_periodThree_localRootBranch

theorem periodFourMultiplierProjection_isLocalHomeomorph :
    IsLocalHomeomorph periodFourMultiplierProjection := by
  apply multiplierCurveProjection_isLocalHomeomorph periodFourMultiplierEquation
  exact exists_periodFour_localRootBranch

/-! ## Properness and finite covering maps -/

/-- A closed one-parameter zero locus with a uniform root bound has proper
projection.  Compactness is proved by identifying each compact preimage with
a closed subset of `K × closedBall 0 B`. -/
private theorem multiplierCurveProjection_isProperMap
    (F : ℂ → ℂ → ℂ)
    (hF : Continuous (fun q : OpenUnitMultiplierDisk × ℂ ↦ F q.2 q.1))
    (B : ℝ)
    (hbound : ∀ (mu : OpenUnitMultiplierDisk) (c : ℂ),
      F c mu = 0 → ‖c‖ ≤ B) :
    IsProperMap
      (fun p : {q : OpenUnitMultiplierDisk × ℂ // F q.2 (q.1 : ℂ) = 0} ↦ p.1.1) := by
  rw [isProperMap_iff_isCompact_preimage]
  refine ⟨by fun_prop, ?_⟩
  intro K hK
  rw [Subtype.isCompact_iff]
  have hzeroClosed : IsClosed
      {q : OpenUnitMultiplierDisk × ℂ | F q.2 q.1 = 0} := by
    exact isClosed_singleton.preimage hF
  have hcompact : IsCompact
      ((K ×ˢ closedBall (0 : ℂ) B) ∩
        {q : OpenUnitMultiplierDisk × ℂ | F q.2 q.1 = 0}) :=
    (hK.prod (isCompact_closedBall (0 : ℂ) B)).inter_right hzeroClosed
  convert hcompact using 1
  ext q
  constructor
  · rintro ⟨p, hpK, rfl⟩
    refine ⟨⟨hpK, ?_⟩, p.2⟩
    simpa only [mem_closedBall, dist_zero_right] using
      hbound p.1.1 p.1.2 p.2
  · rintro ⟨⟨hqK, _hqc⟩, hqF⟩
    exact ⟨⟨q, hqF⟩, hqK, rfl⟩

theorem periodThreeMultiplierProjection_isProperMap :
    IsProperMap periodThreeMultiplierProjection := by
  refine multiplierCurveProjection_isProperMap periodThreeMultiplierEquation ?_ 5 ?_
  · unfold periodThreeMultiplierEquation
    fun_prop
  · intro mu c hc
    apply le_of_lt
    apply periodThree_parameterRoot_norm_lt_five c mu
    · exact le_of_lt ((mem_openUnitMultiplierDisk_iff mu).mp mu.2)
    · exact hc

theorem periodFourMultiplierProjection_isProperMap :
    IsProperMap periodFourMultiplierProjection := by
  refine multiplierCurveProjection_isProperMap periodFourMultiplierEquation ?_ 5 ?_
  · unfold periodFourMultiplierEquation
    fun_prop
  · intro mu c hc
    apply le_of_lt
    apply periodFour_parameterRoot_norm_lt_five c mu
    · exact le_of_lt ((mem_openUnitMultiplierDisk_iff mu).mp mu.2)
    · exact hc

/-- The exact period-three multiplier curve is a finite covering of the open
unit multiplier disk. -/
theorem periodThreeMultiplierProjection_isCoveringMap :
    IsCoveringMap periodThreeMultiplierProjection :=
  Mandelbrot.IsProperMap.isCoveringMap_of_isLocalHomeomorph
    periodThreeMultiplierProjection_isProperMap
    periodThreeMultiplierProjection_isLocalHomeomorph

/-- The exact period-four multiplier curve is a finite covering of the open
unit multiplier disk. -/
theorem periodFourMultiplierProjection_isCoveringMap :
    IsCoveringMap periodFourMultiplierProjection :=
  Mandelbrot.IsProperMap.isCoveringMap_of_isLocalHomeomorph
    periodFourMultiplierProjection_isProperMap
    periodFourMultiplierProjection_isLocalHomeomorph

/-! ## Global sheets based at exact centers -/

/-- An exact period-three center, regarded as a point of the multiplier curve
above `mu = 0`. -/
def periodThreeCenterCurvePoint (c : ℂ) (hc : periodThreeCenterEquation c = 0) :
    PeriodThreeMultiplierCurve :=
  ⟨(multiplierDiskZero, c), by
    change periodThreeMultiplierEquation c 0 = 0
    rw [periodThreeMultiplierEquation_zero, hc]
    ring⟩

/-- An exact period-four center, regarded as a point of the multiplier curve
above `mu = 0`. -/
def periodFourCenterCurvePoint (c : ℂ) (hc : periodFourCenterEquation c = 0) :
    PeriodFourMultiplierCurve :=
  ⟨(multiplierDiskZero, c), by
    change periodFourMultiplierEquation c 0 = 0
    rw [periodFourMultiplierEquation_zero, hc]
    ring⟩

/-- Every exact period-three center selects one and only one continuous global
sheet of the multiplier covering over the whole open unit disk. -/
theorem existsUnique_periodThree_globalSheet (c : ℂ)
    (hc : periodThreeCenterEquation c = 0) :
    ∃! S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve),
      S multiplierDiskZero = periodThreeCenterCurvePoint c hc ∧
      periodThreeMultiplierProjection ∘ S = ContinuousMap.id _ := by
  letI : ContractibleSpace OpenUnitMultiplierDisk :=
    (convex_ball (0 : ℂ) (1 : ℝ)).contractibleSpace ⟨0, by simp⟩
  letI : SimplyConnectedSpace OpenUnitMultiplierDisk :=
    SimplyConnectedSpace.ofContractible OpenUnitMultiplierDisk
  letI : LocPathConnectedSpace OpenUnitMultiplierDisk :=
    (isOpen_ball : IsOpen (ball (0 : ℂ) 1)).locPathConnectedSpace
  apply periodThreeMultiplierProjection_isCoveringMap.existsUnique_continuousMap_lifts
    (ContinuousMap.id _) multiplierDiskZero (periodThreeCenterCurvePoint c hc)
  rfl

/-- Every exact period-four center selects one and only one continuous global
sheet of the multiplier covering over the whole open unit disk. -/
theorem existsUnique_periodFour_globalSheet (c : ℂ)
    (hc : periodFourCenterEquation c = 0) :
    ∃! S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve),
      S multiplierDiskZero = periodFourCenterCurvePoint c hc ∧
      periodFourMultiplierProjection ∘ S = ContinuousMap.id _ := by
  letI : ContractibleSpace OpenUnitMultiplierDisk :=
    (convex_ball (0 : ℂ) (1 : ℝ)).contractibleSpace ⟨0, by simp⟩
  letI : SimplyConnectedSpace OpenUnitMultiplierDisk :=
    SimplyConnectedSpace.ofContractible OpenUnitMultiplierDisk
  letI : LocPathConnectedSpace OpenUnitMultiplierDisk :=
    (isOpen_ball : IsOpen (ball (0 : ℂ) 1)).locPathConnectedSpace
  apply periodFourMultiplierProjection_isCoveringMap.existsUnique_continuousMap_lifts
    (ContinuousMap.id _) multiplierDiskZero (periodFourCenterCurvePoint c hc)
  rfl

end


end Mandelbrot
