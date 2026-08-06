/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.GeneralCenterCoefficient
import LeanProofs.CertifiedAreaBackends
import LeanProofs.LowPeriodMultiplier
import Mathlib.Algebra.Polynomial.Derivative
import Mathlib.Algebra.Polynomial.Roots

/-!
# Finite center energy for Mandelbrot area lower bounds

This module turns the arbitrary-period local coefficient formula into the
finite object which precedes any infinite series over hyperbolic components.
It deliberately does not assert that the resulting sequence converges to the
area of the Mandelbrot set.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Function Set MeasureTheory Metric Polynomial
open scoped BigOperators ENNReal NNReal Topology

/-! ## Exact orbit polynomials -/

/-- The integer polynomial `Pₙ` satisfying `Pₙ(c) = q_c^[n](0)`. -/
def criticalOrbitPolynomial : ℕ → Polynomial ℤ
  | 0 => 0
  | n + 1 => criticalOrbitPolynomial n ^ 2 + X

theorem eval₂_criticalOrbitPolynomial (c : ℂ) :
    ∀ n : ℕ,
      Polynomial.eval₂ (Int.castRingHom ℂ) c (criticalOrbitPolynomial n) =
        orbit c 0 n := by
  intro n
  induction n with
  | zero => simp [criticalOrbitPolynomial]
  | succ n ih =>
      rw [criticalOrbitPolynomial, eval₂_add, eval₂_pow, eval₂_X, ih]
      simp [orbit_succ, quad]

/-- The formal derivative `Pₙ'` evaluates to the recursive parameter
derivative of the critical orbit. -/
theorem eval₂_derivative_criticalOrbitPolynomial (c : ℂ) :
    ∀ n : ℕ,
      Polynomial.eval₂ (Int.castRingHom ℂ) c
          (derivative (criticalOrbitPolynomial n)) =
        criticalOrbitParameterDerivative c n := by
  intro n
  induction n with
  | zero => simp [criticalOrbitPolynomial, criticalOrbitParameterDerivative]
  | succ n ih =>
      rw [criticalOrbitPolynomial, derivative_add, derivative_pow]
      simp only [Nat.cast_ofNat, derivative_X, eval₂_add, eval₂_mul,
        eval₂_C, eval₂_pow, eval₂_one]
      norm_num
      rw [eval₂_criticalOrbitPolynomial, ih]
      simp [criticalOrbitParameterDerivative]

theorem orbit_zero_parameter (n : ℕ) : orbit 0 0 n = 0 := by
  induction n with
  | zero => simp
  | succ n ih => simp [orbit_succ, ih, quad]

theorem criticalOrbitParameterDerivative_zero_succ (n : ℕ) :
    criticalOrbitParameterDerivative 0 (n + 1) = 1 := by
  simp [criticalOrbitParameterDerivative, orbit_zero_parameter]

theorem criticalOrbitPolynomial_ne_zero {p : ℕ} (hp : 0 < p) :
    criticalOrbitPolynomial p ≠ 0 := by
  obtain ⟨n, rfl⟩ := Nat.exists_eq_succ_of_ne_zero (Nat.ne_of_gt hp)
  intro hzero
  have heval := eval₂_derivative_criticalOrbitPolynomial (0 : ℂ) (n + 1)
  rw [hzero] at heval
  simp [criticalOrbitParameterDerivative_zero_succ] at heval

/-- Finite algebraic candidates whose critical orbit returns at time `p`.
This still includes centers whose exact period properly divides `p`. -/
def criticalCenterCandidates (p : ℕ) : Finset ℂ := by
  classical
  exact ((criticalOrbitPolynomial p).map (Int.castRingHom ℂ)).roots.toFinset

theorem mem_criticalCenterCandidates_iff {c : ℂ} {p : ℕ} (hp : 0 < p) :
    c ∈ criticalCenterCandidates p ↔ orbit c 0 p = 0 := by
  classical
  rw [criticalCenterCandidates, Multiset.mem_toFinset,
    Polynomial.mem_roots_map_of_injective Int.cast_injective
      (criticalOrbitPolynomial_ne_zero hp),
    eval₂_criticalOrbitPolynomial]

/-! ## Exact-period centers and their local weights -/

/-- The critical point `0` has exact positive period `p` for `q_c`. -/
def HasExactCriticalPeriod (c : ℂ) (p : ℕ) : Prop :=
  0 < p ∧ orbit c 0 p = 0 ∧
    ∀ q : ℕ, 0 < q → q < p → orbit c 0 q ≠ 0

/-- Exact-period centers can be enumerated algebraically as roots of the
integer orbit polynomials, followed by exclusion of the lower-period roots. -/
theorem hasExactCriticalPeriod_iff_polynomial (c : ℂ) (p : ℕ) :
    HasExactCriticalPeriod c p ↔
      0 < p ∧
      Polynomial.eval₂ (Int.castRingHom ℂ) c (criticalOrbitPolynomial p) = 0 ∧
      ∀ q : ℕ, 0 < q → q < p →
        Polynomial.eval₂ (Int.castRingHom ℂ) c (criticalOrbitPolynomial q) ≠ 0 := by
  simp only [HasExactCriticalPeriod, eval₂_criticalOrbitPolynomial]

/-- No positive critical return occurs strictly before `p`. -/
def NoEarlierCriticalReturn (c : ℂ) (p : ℕ) : Prop :=
  ∀ q ∈ Finset.Ico 1 p, orbit c 0 q ≠ 0

@[reducible] noncomputable def noEarlierCriticalReturnDecidable (p : ℕ) :
    DecidablePred fun c : ℂ => NoEarlierCriticalReturn c p :=
  fun c => Classical.propDecidable (NoEarlierCriticalReturn c p)

/-- The finite set of all parameters whose critical point has exact period
`p`.  Lower return times are checked only over the finite interval `1 ≤ q < p`. -/
noncomputable def exactCriticalCenterParameters (p : ℕ) : Finset ℂ := by
  letI := noEarlierCriticalReturnDecidable p
  exact (criticalCenterCandidates p).filter fun c => NoEarlierCriticalReturn c p

theorem mem_exactCriticalCenterParameters_iff {c : ℂ} {p : ℕ} :
    c ∈ exactCriticalCenterParameters p ↔ HasExactCriticalPeriod c p := by
  cases p with
  | zero =>
      letI : DecidableEq ℂ := Classical.decEq ℂ
      letI := noEarlierCriticalReturnDecidable 0
      simp [exactCriticalCenterParameters, criticalCenterCandidates,
        HasExactCriticalPeriod, criticalOrbitPolynomial]
  | succ p =>
      letI : DecidableEq ℂ := Classical.decEq ℂ
      letI := noEarlierCriticalReturnDecidable (p + 1)
      constructor
      · intro hc
        unfold exactCriticalCenterParameters at hc
        obtain ⟨hcandidate, hminimal⟩ := Finset.mem_filter.mp hc
        have hreturn :=
          (mem_criticalCenterCandidates_iff (Nat.succ_pos p)).mp hcandidate
        refine ⟨Nat.succ_pos p, hreturn, ?_⟩
        unfold NoEarlierCriticalReturn at hminimal
        intro q hq hqperiod
        exact hminimal q (by
          rw [Finset.mem_Ico]
          omega)
      · rintro ⟨hp, hreturn, hminimal⟩
        unfold exactCriticalCenterParameters
        apply Finset.mem_filter.mpr
        refine ⟨(mem_criticalCenterCandidates_iff (Nat.succ_pos p)).mpr hreturn, ?_⟩
        unfold NoEarlierCriticalReturn
        intro q hqIco
        rw [Finset.mem_Ico] at hqIco
        exact hminimal q (by omega) hqIco.2

theorem orbit_three_eq_center_factor (c : ℂ) :
    orbit c 0 3 = c * periodThreeCenterEquation c := by
  simp [orbit_succ, quad, periodThreeCenterEquation]
  ring

theorem orbit_four_eq_center_factor (c : ℂ) :
    orbit c 0 4 = c * (c + 1) * periodFourCenterEquation c := by
  simp [orbit_succ, quad, periodFourCenterEquation]
  ring

/-- Every root of the period-three center factor is genuinely of exact
critical period three. -/
theorem hasExactCriticalPeriod_three_of_centerEquation
    {c : ℂ} (hcenter : periodThreeCenterEquation c = 0) :
    HasExactCriticalPeriod c 3 := by
  have hreturn : orbit c 0 3 = 0 := by
    rw [orbit_three_eq_center_factor, hcenter, mul_zero]
  refine ⟨by norm_num, hreturn, ?_⟩
  intro q hq hq3 hqzero
  have hcases : q = 1 ∨ q = 2 := by omega
  rcases hcases with rfl | rfl
  · have hc : c = 0 := by
      simpa [orbit_succ, quad] using hqzero
    subst c
    norm_num [periodThreeCenterEquation] at hcenter
  · have hproduct : c * (c + 1) = 0 := by
      have horbit : c ^ 2 + c = 0 := by
        simpa [orbit_succ, quad] using hqzero
      linear_combination horbit
    rcases mul_eq_zero.mp hproduct with hc | hc
    · subst c
      norm_num [periodThreeCenterEquation] at hcenter
    · have hcneg : c = -1 := by linear_combination hc
      subst c
      norm_num [periodThreeCenterEquation] at hcenter

/-- Every root of the period-four center factor is genuinely of exact
critical period four. -/
theorem hasExactCriticalPeriod_four_of_centerEquation
    {c : ℂ} (hcenter : periodFourCenterEquation c = 0) :
    HasExactCriticalPeriod c 4 := by
  have hreturn : orbit c 0 4 = 0 := by
    rw [orbit_four_eq_center_factor, hcenter, mul_zero]
  refine ⟨by norm_num, hreturn, ?_⟩
  intro q hq hq4 hqzero
  have hcases : q = 1 ∨ q = 2 ∨ q = 3 := by omega
  rcases hcases with rfl | rfl | rfl
  · have hc : c = 0 := by
      simpa [orbit_succ, quad] using hqzero
    subst c
    norm_num [periodFourCenterEquation] at hcenter
  · have hproduct : c * (c + 1) = 0 := by
      have horbit : c ^ 2 + c = 0 := by
        simpa [orbit_succ, quad] using hqzero
      linear_combination horbit
    rcases mul_eq_zero.mp hproduct with hc | hc
    · subst c
      norm_num [periodFourCenterEquation] at hcenter
    · have hcneg : c = -1 := by linear_combination hc
      subst c
      norm_num [periodFourCenterEquation] at hcenter
  · rw [orbit_succ, hqzero] at hreturn
    have hc : c = 0 := by simpa [quad] using hreturn
    subst c
    norm_num [periodFourCenterEquation] at hcenter

structure ExactCriticalCenter where
  parameter : ℂ
  period : ℕ
  exactPeriod : HasExactCriticalPeriod parameter period

theorem ExactCriticalCenter.period_pos (x : ExactCriticalCenter) :
    0 < x.period :=
  x.exactPeriod.1

/-- Recursive first inverse-multiplier coefficient at a parameter and a
proposed period. -/
def centerFirstCoefficientAtPeriod (c : ℂ) (p : ℕ) : ℂ :=
  1 / (2 ^ p * criticalOrbitParameterDerivative c p *
    ∏ j ∈ Finset.range (p - 1), orbit c 0 (j + 1))

/-- The first inverse-multiplier coefficient attached to an exact center.
The later branch theorem proves that its denominator is nonzero whenever the
normalized local multiplier branch exists. -/
def exactCenterFirstCoefficient (x : ExactCriticalCenter) : ℂ :=
  centerFirstCoefficientAtPeriod x.parameter x.period

/-- The nonnegative first-coefficient energy contributed by one center. -/
def exactCenterFirstEnergy (x : ExactCriticalCenter) : ℝ :=
  normSq (exactCenterFirstCoefficient x)

theorem exactCenterFirstEnergy_nonneg (x : ExactCriticalCenter) :
    0 ≤ exactCenterFirstEnergy x :=
  normSq_nonneg _

/-- Sum of the first-coefficient energies of all exact-period-`p` centers. -/
noncomputable def exactPeriodCenterEnergy (p : ℕ) : ℝ :=
  ∑ c ∈ exactCriticalCenterParameters p,
    normSq (centerFirstCoefficientAtPeriod c p)

theorem exactPeriodCenterEnergy_nonneg (p : ℕ) :
    0 ≤ exactPeriodCenterEnergy p := by
  apply Finset.sum_nonneg
  intro c hc
  exact normSq_nonneg _

/-- The canonical finite truncation
`H_P = ∑_{1 ≤ p ≤ P} ∑_{period(c)=p} |a(c)|²`.
The period-zero term is empty, so `range (P+1)` gives exactly this convention. -/
noncomputable def truncatedCenterEnergy (P : ℕ) : ℝ :=
  ∑ p ∈ Finset.range (P + 1), exactPeriodCenterEnergy p

theorem truncatedCenterEnergy_nonneg (P : ℕ) :
    0 ≤ truncatedCenterEnergy P := by
  apply Finset.sum_nonneg
  intro p hp
  exact exactPeriodCenterEnergy_nonneg p

theorem monotone_truncatedCenterEnergy : Monotone truncatedCenterEnergy := by
  intro P Q hPQ
  apply Finset.sum_le_sum_of_subset_of_nonneg
  · exact Finset.range_mono (Nat.succ_le_succ hPQ)
  · intro p hpQ hpP
    exact exactPeriodCenterEnergy_nonneg p

def periodOneCriticalCenter : ExactCriticalCenter where
  parameter := 0
  period := 1
  exactPeriod := by
    refine ⟨by norm_num, ?_, ?_⟩
    · norm_num [orbit_succ, quad]
    · intro q hq hq1
      omega

def periodTwoCriticalCenter : ExactCriticalCenter where
  parameter := -1
  period := 2
  exactPeriod := by
    refine ⟨by norm_num, ?_, ?_⟩
    · norm_num [orbit_succ, quad]
    · intro q hq hq2
      have hqeq : q = 1 := by omega
      subst q
      norm_num [orbit_succ, quad]

theorem periodOneCriticalCenter_firstCoefficient :
    exactCenterFirstCoefficient periodOneCriticalCenter = 1 / 2 := by
  norm_num [exactCenterFirstCoefficient, centerFirstCoefficientAtPeriod,
    periodOneCriticalCenter,
    criticalOrbitParameterDerivative]

theorem periodTwoCriticalCenter_firstCoefficient :
    exactCenterFirstCoefficient periodTwoCriticalCenter = 1 / 4 := by
  norm_num [exactCenterFirstCoefficient, centerFirstCoefficientAtPeriod,
    periodTwoCriticalCenter,
    criticalOrbitParameterDerivative, orbit_succ, quad]

theorem periodOneCriticalCenter_firstEnergy :
    exactCenterFirstEnergy periodOneCriticalCenter = 1 / 4 := by
  rw [exactCenterFirstEnergy, periodOneCriticalCenter_firstCoefficient]
  norm_num [normSq_apply]

theorem periodTwoCriticalCenter_firstEnergy :
    exactCenterFirstEnergy periodTwoCriticalCenter = 1 / 16 := by
  rw [exactCenterFirstEnergy, periodTwoCriticalCenter_firstCoefficient]
  norm_num [normSq_apply]

/-- Pure finite sum over a supplied catalogue of exact centers. -/
def exactCenterEnergySum (centers : Finset ExactCriticalCenter) : ℝ :=
  ∑ center ∈ centers, exactCenterFirstEnergy center

theorem periodOneCriticalCenter_ne_periodTwoCriticalCenter :
    periodOneCriticalCenter ≠ periodTwoCriticalCenter := by
  intro h
  have hp := congrArg ExactCriticalCenter.period h
  norm_num [periodOneCriticalCenter, periodTwoCriticalCenter] at hp

def firstTwoCriticalCenters : Finset ExactCriticalCenter := by
  classical
  exact {periodOneCriticalCenter, periodTwoCriticalCenter}

/-- The exact unscaled first-coefficient sum through period two is `5/16`. -/
theorem firstTwoCriticalCenters_energy :
    exactCenterEnergySum firstTwoCriticalCenters = 5 / 16 := by
  classical
  simp [exactCenterEnergySum, firstTwoCriticalCenters,
    periodOneCriticalCenter_ne_periodTwoCriticalCenter,
    periodOneCriticalCenter_firstEnergy,
    periodTwoCriticalCenter_firstEnergy]
  norm_num

/-! ## Certified finite families of multiplier sheets -/

/-- All data needed to turn one exact center into a certified compact
multiplier-disk contribution.  Local periodicity identifies the central
coefficient; the remaining fields certify the whole radius-`R` image used in
the area sum. -/
structure CertifiedCenterSheet where
  exactCenter : ExactCriticalCenter
  parameter : ℂ → ℂ
  periodicPoint : ℂ → ℂ
  parameterDerivative : ℂ → ℂ
  periodicPointDerivativeAtZero : ℂ
  radius : ℝ
  radius_pos : 0 < radius
  parameter_zero : parameter 0 = exactCenter.parameter
  periodicPoint_zero : periodicPoint 0 = 0
  periodicPoint_hasDerivAt_zero :
    HasDerivAt periodicPoint periodicPointDerivativeAtZero 0
  periodic_near_zero :
    (fun mu => orbit (parameter mu) (periodicPoint mu) exactCenter.period) =ᶠ[𝓝 0]
      periodicPoint
  multiplier_near_zero :
    (fun mu => cycleMultiplier (parameter mu) (periodicPoint mu)
      exactCenter.period) =ᶠ[𝓝 0] fun mu => mu
  parameter_hasDerivAt :
    ∀ mu ∈ ball (0 : ℂ) radius,
      HasDerivAt parameter (parameterDerivative mu) mu
  derivative_differentiable :
    DifferentiableOn ℂ parameterDerivative (ball (0 : ℂ) radius)
  derivative_continuous :
    ContinuousOn parameterDerivative (closedBall (0 : ℂ) radius)
  parameter_injective : InjOn parameter (ball (0 : ℂ) radius)
  image_measurable : MeasurableSet (parameter '' ball (0 : ℂ) radius)
  image_subset_Mandelbrot : parameter '' ball (0 : ℂ) radius ⊆ Mandelbrot

theorem CertifiedCenterSheet.zero_mem_ball (S : CertifiedCenterSheet) :
    (0 : ℂ) ∈ ball 0 S.radius := by
  simpa [mem_ball] using S.radius_pos

/-- The derivative of a certified sheet at its center is exactly the
recursive coefficient attached to that center. -/
theorem CertifiedCenterSheet.parameterDerivative_zero_eq (S : CertifiedCenterSheet) :
    S.parameterDerivative 0 = exactCenterFirstCoefficient S.exactCenter := by
  have hp : S.exactCenter.period - 1 + 1 = S.exactCenter.period := by
    exact Nat.sub_add_cancel S.exactCenter.period_pos
  have hparameter := S.parameter_hasDerivAt 0 S.zero_mem_ball
  have hperiodic :
      (fun mu => orbit (S.parameter mu) (S.periodicPoint mu)
        (S.exactCenter.period - 1 + 1)) =ᶠ[𝓝 0] S.periodicPoint := by
    simpa only [hp] using S.periodic_near_zero
  have hmultiplier :
      (fun mu => cycleMultiplier (S.parameter mu) (S.periodicPoint mu)
        (S.exactCenter.period - 1 + 1)) =ᶠ[𝓝 0] fun mu => mu := by
    simpa only [hp] using S.multiplier_near_zero
  have hformula := parameter_firstCoefficient_eq_prod_of_center_branch
    S.parameter S.periodicPoint S.exactCenter.parameter
    (S.parameterDerivative 0) S.periodicPointDerivativeAtZero
    (S.exactCenter.period - 1) S.parameter_zero S.periodicPoint_zero
    hparameter S.periodicPoint_hasDerivAt_zero hperiodic hmultiplier
  simpa only [exactCenterFirstCoefficient, centerFirstCoefficientAtPeriod, hp]
    using hformula

/-- The center sheet as a generic certified inner region. -/
def CertifiedCenterSheet.innerRegion (S : CertifiedCenterSheet) :
    CertifiedInnerRegion where
  carrier := S.parameter '' ball (0 : ℂ) S.radius
  measurable := S.image_measurable
  subset_Mandelbrot := S.image_subset_Mandelbrot
  certifiedArea := ENNReal.ofReal
    (Real.pi * S.radius ^ 2 * exactCenterFirstEnergy S.exactCenter)
  certifiedArea_le_volume := by
    rw [exactCenterFirstEnergy, ← S.parameterDerivative_zero_eq]
    exact ofReal_pi_mul_sq_mul_normSq_le_volume_image_ball S.radius_pos
      S.parameter_hasDerivAt S.derivative_differentiable
      S.derivative_continuous S.parameter_injective

/-- The finite real energy `H_S`, including the compact multiplier radii used
by the certificates.  At common radius `R` it is `R²` times the sum of the
first-coefficient energies. -/
def finiteCenterEnergy {ι : Type*} (s : Finset ι)
    (sheets : ι → CertifiedCenterSheet) : ℝ :=
  ∑ i ∈ s, (sheets i).radius ^ 2 *
    exactCenterFirstEnergy (sheets i).exactCenter

/-- The unscaled finite center sum, i.e. the actual first-coefficient
candidate `H_S` before choosing a compact multiplier radius. -/
def finiteCenterFirstEnergy {ι : Type*} (s : Finset ι)
    (sheets : ι → CertifiedCenterSheet) : ℝ :=
  ∑ i ∈ s, exactCenterFirstEnergy (sheets i).exactCenter

theorem finiteCenterFirstEnergy_nonneg {ι : Type*} (s : Finset ι)
    (sheets : ι → CertifiedCenterSheet) :
    0 ≤ finiteCenterFirstEnergy s sheets := by
  apply Finset.sum_nonneg
  intro i hi
  exact exactCenterFirstEnergy_nonneg _

/-- With a common compact multiplier radius `R`, the certified energy is
exactly `R² H_S`. -/
theorem finiteCenterEnergy_eq_sq_mul_firstEnergy_of_radius
    {ι : Type*} (s : Finset ι) (sheets : ι → CertifiedCenterSheet) (R : ℝ)
    (hradius : ∀ i ∈ s, (sheets i).radius = R) :
    finiteCenterEnergy s sheets = R ^ 2 * finiteCenterFirstEnergy s sheets := by
  rw [finiteCenterEnergy, finiteCenterFirstEnergy, Finset.mul_sum]
  apply Finset.sum_congr rfl
  intro i hi
  rw [hradius i hi]

theorem finiteCenterEnergy_nonneg {ι : Type*} (s : Finset ι)
    (sheets : ι → CertifiedCenterSheet) :
    0 ≤ finiteCenterEnergy s sheets := by
  apply Finset.sum_nonneg
  intro i hi
  exact mul_nonneg (sq_nonneg _) (exactCenterFirstEnergy_nonneg _)

/-- The certified ENNReal area budget corresponding to the finite energy. -/
def finiteCenterAreaBudget {ι : Type*} (s : Finset ι)
    (sheets : ι → CertifiedCenterSheet) : ℝ≥0∞ :=
  ∑ i ∈ s, ENNReal.ofReal
    (Real.pi * (sheets i).radius ^ 2 *
      exactCenterFirstEnergy (sheets i).exactCenter)

theorem finiteCenterAreaBudget_eq {ι : Type*} (s : Finset ι)
    (sheets : ι → CertifiedCenterSheet) :
    finiteCenterAreaBudget s sheets =
      ENNReal.ofReal (Real.pi * finiteCenterEnergy s sheets) := by
  rw [finiteCenterAreaBudget, finiteCenterEnergy,
    ← ENNReal.ofReal_sum_of_nonneg]
  · congr 1
    rw [Finset.mul_sum]
    apply Finset.sum_congr rfl
    intro i hi
    ring
  · intro i hi
    exact mul_nonneg
      (mul_nonneg Real.pi_pos.le (sq_nonneg _))
      (exactCenterFirstEnergy_nonneg _)

/-- A finite family of pairwise disjoint certified sheets contributes
`π H_S` to a rigorous Mandelbrot-area lower bound. -/
theorem ofReal_pi_mul_finiteCenterEnergy_le_volume_Mandelbrot
    {ι : Type*} (s : Finset ι) (sheets : ι → CertifiedCenterSheet)
    (hdisjoint : PairwiseDisjoint (↑s)
      fun i => (sheets i).parameter '' ball (0 : ℂ) (sheets i).radius) :
    ENNReal.ofReal (Real.pi * finiteCenterEnergy s sheets) ≤
      volume Mandelbrot := by
  rw [← finiteCenterAreaBudget_eq]
  exact sum_certifiedInnerRegion_area_le_volume_Mandelbrot s
    (fun i => (sheets i).innerRegion) hdisjoint

/-- Common-radius form: `π R² H_S` is a rigorous area lower bound. -/
theorem ofReal_pi_mul_sq_mul_finiteCenterFirstEnergy_le_volume_Mandelbrot
    {ι : Type*} (s : Finset ι) (sheets : ι → CertifiedCenterSheet) (R : ℝ)
    (hradius : ∀ i ∈ s, (sheets i).radius = R)
    (hdisjoint : PairwiseDisjoint (↑s)
      fun i => (sheets i).parameter '' ball (0 : ℂ) (sheets i).radius) :
    ENNReal.ofReal
        (Real.pi * R ^ 2 * finiteCenterFirstEnergy s sheets) ≤
      volume Mandelbrot := by
  have harea := ofReal_pi_mul_finiteCenterEnergy_le_volume_Mandelbrot
    s sheets hdisjoint
  rw [finiteCenterEnergy_eq_sq_mul_firstEnergy_of_radius s sheets R hradius] at harea
  simpa only [mul_assoc] using harea

end

end Mandelbrot
