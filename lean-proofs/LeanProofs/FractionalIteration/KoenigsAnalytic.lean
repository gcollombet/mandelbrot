/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Basic
import Mathlib.Analysis.Calculus.InverseFunctionTheorem.Analytic
import Mathlib.Analysis.Complex.LocallyUniformLimit
import Mathlib.Analysis.Normed.Group.InfiniteSum
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
# Analytic Koenigs coordinate for the attracting quadratic germ

For `g(w) = μw + w²`, this file constructs the normalized Koenigs coordinate
from the convergent correction series

`φ(w) = w + ∑ n, g^[n](w)² / μ^(n+1)`.

The summand is the exact difference between two consecutive normalized
iterates. A disk on which `‖g(w)‖ ≤ r‖w‖`, with `r² < ‖μ‖`, supplies a
summable geometric majorant. This proves analyticity, the exact Schroeder
equation, normalization, and a local analytic inverse.
-/

namespace Mandelbrot

noncomputable section

open Filter Function Metric Set
open scoped Topology

/-- The quadratic germ obtained by centering at a fixed point. -/
def centeredQuad (mu w : ℂ) : ℂ :=
  mu * w + w ^ 2

@[simp] theorem centeredQuad_zero (mu : ℂ) :
    centeredQuad mu 0 = 0 := by
  simp [centeredQuad]

theorem differentiable_centeredQuad (mu : ℂ) :
    Differentiable ℂ (centeredQuad mu) := by
  unfold centeredQuad
  exact (differentiable_id.const_mul mu).add
    (differentiable_id.pow 2)

theorem norm_centeredQuad_le (mu w : ℂ) :
    ‖centeredQuad mu w‖ ≤ (‖mu‖ + ‖w‖) * ‖w‖ := by
  calc
    ‖centeredQuad mu w‖ ≤ ‖mu * w‖ + ‖w ^ 2‖ := norm_add_le _ _
    _ = (‖mu‖ + ‖w‖) * ‖w‖ := by
      rw [norm_mul, norm_pow]
      ring

@[simp] theorem iterate_centeredQuad_zero (mu : ℂ) (n : ℕ) :
    (centeredQuad mu)^[n] 0 = 0 := by
  induction n with
  | zero => simp
  | succ n ih =>
      rw [Function.iterate_succ_apply', ih, centeredQuad_zero]

/-- A small disk is forward invariant, and iterates contract there at the
chosen rate `r`. -/
theorem norm_iterate_centeredQuad_le
    (mu : ℂ) (r rho : ℝ)
    (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hcontract : ‖mu‖ + rho ≤ r)
    {w : ℂ} (hw : ‖w‖ ≤ rho) :
    ∀ n : ℕ, ‖(centeredQuad mu)^[n] w‖ ≤ r ^ n * ‖w‖ := by
  intro n
  induction n with
  | zero =>
      simp
  | succ n ih =>
      rw [Function.iterate_succ_apply']
      have hwithin : ‖(centeredQuad mu)^[n] w‖ ≤ rho := by
        calc
          ‖(centeredQuad mu)^[n] w‖ ≤ r ^ n * ‖w‖ := ih
          _ ≤ 1 * rho := by
            gcongr
            exact pow_le_one₀ hr0 hr1
          _ = rho := one_mul rho
      calc
        ‖centeredQuad mu ((centeredQuad mu)^[n] w)‖ ≤
            (‖mu‖ + ‖(centeredQuad mu)^[n] w‖) *
              ‖(centeredQuad mu)^[n] w‖ :=
          norm_centeredQuad_le _ _
        _ ≤ r * ‖(centeredQuad mu)^[n] w‖ := by
          gcongr
          linarith
        _ ≤ r * (r ^ n * ‖w‖) := by
          gcongr
        _ = r ^ (n + 1) * ‖w‖ := by
          rw [pow_succ']
          ring

/-- The controlled disk is forward invariant under the centered germ. -/
theorem mapsTo_centeredQuad_ball
    (mu : ℂ) (r rho : ℝ)
    (hr1 : r ≤ 1) (hcontract : ‖mu‖ + rho ≤ r) :
    MapsTo (centeredQuad mu) (ball 0 rho) (ball 0 rho) := by
  intro w hw
  rw [mem_ball_zero_iff] at hw ⊢
  calc
    ‖centeredQuad mu w‖ ≤ (‖mu‖ + ‖w‖) * ‖w‖ :=
      norm_centeredQuad_le _ _
    _ ≤ r * ‖w‖ := by
      gcongr
      linarith
    _ ≤ ‖w‖ := mul_le_of_le_one_left (norm_nonneg w) hr1
    _ < rho := hw

/-- The correction whose sum turns the identity chart into an exact
Schroeder coordinate. -/
def koenigsCorrectionTerm (mu : ℂ) (n : ℕ) (w : ℂ) : ℂ :=
  ((centeredQuad mu)^[n] w) ^ 2 / mu ^ (n + 1)

/-- The normalized Koenigs coordinate produced by the correction series. -/
def koenigsCoordinate (mu w : ℂ) : ℂ :=
  w + ∑' n : ℕ, koenigsCorrectionTerm mu n w

theorem differentiable_koenigsCorrectionTerm (mu : ℂ) (n : ℕ) :
    Differentiable ℂ (koenigsCorrectionTerm mu n) := by
  unfold koenigsCorrectionTerm
  exact (((differentiable_centeredQuad mu).iterate n).pow 2).div_const _

@[simp] theorem koenigsCorrectionTerm_zero (mu : ℂ) (n : ℕ) :
    koenigsCorrectionTerm mu n 0 = 0 := by
  simp [koenigsCorrectionTerm]

/-- Uniform geometric bound for the correction series on a closed small
disk. -/
theorem norm_koenigsCorrectionTerm_le
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hcontract : ‖mu‖ + rho ≤ r)
    {w : ℂ} (hw : ‖w‖ ≤ rho) (n : ℕ) :
    ‖koenigsCorrectionTerm mu n w‖ ≤
      (rho ^ 2 / ‖mu‖) * (r ^ 2 / ‖mu‖) ^ n := by
  have horbit := norm_iterate_centeredQuad_le
    mu r rho hr0 hr1 hcontract hw n
  rw [koenigsCorrectionTerm, norm_div, norm_pow, norm_pow]
  have hden : 0 < ‖mu‖ ^ (n + 1) := pow_pos hmu _
  calc
    ‖(centeredQuad mu)^[n] w‖ ^ 2 / ‖mu‖ ^ (n + 1) ≤
        (r ^ n * ‖w‖) ^ 2 / ‖mu‖ ^ (n + 1) := by
      gcongr
    _ ≤ (r ^ n * rho) ^ 2 / ‖mu‖ ^ (n + 1) := by
      gcongr
    _ = (rho ^ 2 / ‖mu‖) * (r ^ 2 / ‖mu‖) ^ n := by
      rw [div_pow, pow_succ]
      field_simp
      ring

/-- The geometric majorant used for the Koenigs correction is summable. -/
theorem summable_koenigsMajorant
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (_hr0 : 0 ≤ r)
    (hr2 : r ^ 2 < ‖mu‖) :
    Summable (fun n : ℕ =>
      (rho ^ 2 / ‖mu‖) * (r ^ 2 / ‖mu‖) ^ n) := by
  have htheta0 : 0 ≤ r ^ 2 / ‖mu‖ := by positivity
  have htheta1 : r ^ 2 / ‖mu‖ < 1 :=
    (div_lt_one hmu).2 hr2
  exact ((hasSum_geometric_of_lt_one htheta0 htheta1).mul_left
    (rho ^ 2 / ‖mu‖)).summable

/-- The correction series converges at every point of the small disk. -/
theorem summable_koenigsCorrectionTerm
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hr2 : r ^ 2 < ‖mu‖)
    (hcontract : ‖mu‖ + rho ≤ r)
    {w : ℂ} (hw : w ∈ ball 0 rho) :
    Summable (fun n : ℕ => koenigsCorrectionTerm mu n w) := by
  apply (summable_koenigsMajorant mu r rho hmu hr0 hr2).of_norm_bounded
  intro n
  exact norm_koenigsCorrectionTerm_le
    mu r rho hmu hr0 hr1 hcontract (mem_ball_zero_iff.mp hw).le n

/-- The correction construction is holomorphic throughout the controlled
disk. -/
theorem differentiableOn_koenigsCoordinate
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hr2 : r ^ 2 < ‖mu‖)
    (hcontract : ‖mu‖ + rho ≤ r) :
    DifferentiableOn ℂ (koenigsCoordinate mu) (ball 0 rho) := by
  have hseries : DifferentiableOn ℂ
      (fun w : ℂ => ∑' n : ℕ, koenigsCorrectionTerm mu n w)
      (ball 0 rho) := by
    apply Complex.differentiableOn_tsum_of_summable_norm
      (summable_koenigsMajorant mu r rho hmu hr0 hr2)
      (fun n => (differentiable_koenigsCorrectionTerm mu n).differentiableOn)
      isOpen_ball
    intro n w hw
    exact norm_koenigsCorrectionTerm_le
      mu r rho hmu hr0 hr1 hcontract (mem_ball_zero_iff.mp hw).le n
  change DifferentiableOn ℂ
    (fun w : ℂ => w + ∑' n : ℕ, koenigsCorrectionTerm mu n w)
    (ball 0 rho)
  exact differentiableOn_id.add hseries

/-- Advancing the germ shifts the correction sequence by one place. -/
theorem koenigsCorrectionTerm_centeredQuad
    (mu w : ℂ) (n : ℕ) (hmu : mu ≠ 0) :
    koenigsCorrectionTerm mu n (centeredQuad mu w) =
      mu * koenigsCorrectionTerm mu (n + 1) w := by
  unfold koenigsCorrectionTerm
  rw [← Function.iterate_succ_apply]
  field_simp [hmu, pow_succ]
  ring

/-- The correction series satisfies Schroeder's equation exactly on the
controlled disk. -/
theorem koenigsCoordinate_schroeder
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hr2 : r ^ 2 < ‖mu‖)
    (hcontract : ‖mu‖ + rho ≤ r)
    {w : ℂ} (hw : w ∈ ball 0 rho) :
    koenigsCoordinate mu (centeredQuad mu w) =
      mu * koenigsCoordinate mu w := by
  let e : ℕ → ℂ := fun n => koenigsCorrectionTerm mu n w
  have hmu0 : mu ≠ 0 := norm_pos_iff.mp hmu
  have hsum : Summable e :=
    summable_koenigsCorrectionTerm
      mu r rho hmu hr0 hr1 hr2 hcontract hw
  have hsplit : e 0 + ∑' n : ℕ, e (n + 1) = ∑' n : ℕ, e n := by
    simpa using hsum.sum_add_tsum_nat_add 1
  have hshift :
      (∑' n : ℕ, koenigsCorrectionTerm mu n (centeredQuad mu w)) =
        mu * ∑' n : ℕ, e (n + 1) := by
    calc
      (∑' n : ℕ, koenigsCorrectionTerm mu n (centeredQuad mu w)) =
          ∑' n : ℕ, mu * e (n + 1) := by
        apply tsum_congr
        intro n
        exact koenigsCorrectionTerm_centeredQuad mu w n hmu0
      _ = mu * ∑' n : ℕ, e (n + 1) := tsum_mul_left
  have he0 : e 0 = w ^ 2 / mu := by
    simp [e, koenigsCorrectionTerm]
  unfold koenigsCoordinate
  rw [hshift]
  change centeredQuad mu w + mu * (∑' n : ℕ, e (n + 1)) =
    mu * (w + ∑' n : ℕ, e n)
  rw [← hsplit, he0]
  field_simp [hmu0]
  simp only [centeredQuad]
  ring

@[simp] theorem koenigsCoordinate_zero (mu : ℂ) :
    koenigsCoordinate mu 0 = 0 := by
  simp [koenigsCoordinate]

/-- Every correction term has a double zero at the fixed point. -/
theorem hasDerivAt_koenigsCorrectionTerm_zero
    (mu : ℂ) (n : ℕ) :
    HasDerivAt (koenigsCorrectionTerm mu n) 0 0 := by
  have hit : DifferentiableAt ℂ ((centeredQuad mu)^[n]) 0 :=
    ((differentiable_centeredQuad mu).iterate n).differentiableAt
  have hsquare :=
    (hasDerivAt_pow 2 ((centeredQuad mu)^[n] 0)).comp 0 hit.hasDerivAt
  have hquot := hsquare.div_const (mu ^ (n + 1))
  unfold koenigsCorrectionTerm
  simpa only [Function.comp_apply, Nat.reduceSub, pow_one,
    iterate_centeredQuad_zero, Nat.cast_ofNat, mul_zero, zero_mul,
    zero_div] using hquot

@[simp] theorem deriv_koenigsCorrectionTerm_zero
    (mu : ℂ) (n : ℕ) :
    deriv (koenigsCorrectionTerm mu n) 0 = 0 :=
  (hasDerivAt_koenigsCorrectionTerm_zero mu n).deriv

/-- The infinite correction itself has derivative zero at the fixed point. -/
theorem deriv_koenigsCorrection_zero
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hr2 : r ^ 2 < ‖mu‖)
    (hcontract : ‖mu‖ + rho ≤ r)
    (hrho : 0 < rho) :
    deriv (fun w : ℂ => ∑' n : ℕ, koenigsCorrectionTerm mu n w) 0 = 0 := by
  have hderivSum :
      HasSum
        (fun n : ℕ => deriv (koenigsCorrectionTerm mu n) 0)
        (deriv (fun w : ℂ =>
          ∑' n : ℕ, koenigsCorrectionTerm mu n w) 0) := by
    apply Complex.hasSum_deriv_of_summable_norm
      (summable_koenigsMajorant mu r rho hmu hr0 hr2)
      (fun n => (differentiable_koenigsCorrectionTerm mu n).differentiableOn)
      isOpen_ball
    · intro n w hw
      exact norm_koenigsCorrectionTerm_le
        mu r rho hmu hr0 hr1 hcontract (mem_ball_zero_iff.mp hw).le n
    · exact mem_ball_self hrho
  have hzero :
      HasSum (fun n : ℕ => deriv (koenigsCorrectionTerm mu n) 0) 0 := by
    simp
  exact hderivSum.unique hzero

/-- The constructed coordinate is normalized by `φ'(0)=1`. -/
theorem hasDerivAt_koenigsCoordinate_zero
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hr2 : r ^ 2 < ‖mu‖)
    (hcontract : ‖mu‖ + rho ≤ r)
    (hrho : 0 < rho) :
    HasDerivAt (koenigsCoordinate mu) 1 0 := by
  let correction : ℂ → ℂ :=
    fun w => ∑' n : ℕ, koenigsCorrectionTerm mu n w
  have hdiff : DifferentiableAt ℂ correction 0 := by
    apply (Complex.differentiableOn_tsum_of_summable_norm
      (summable_koenigsMajorant mu r rho hmu hr0 hr2)
      (fun n => (differentiable_koenigsCorrectionTerm mu n).differentiableOn)
      isOpen_ball
      (fun n w hw => norm_koenigsCorrectionTerm_le
        mu r rho hmu hr0 hr1 hcontract
          (mem_ball_zero_iff.mp hw).le n)).differentiableAt
    exact isOpen_ball.mem_nhds (mem_ball_self hrho)
  have hcorr : HasDerivAt correction 0 0 := by
    have h := hdiff.hasDerivAt
    rw [deriv_koenigsCorrection_zero
      mu r rho hmu hr0 hr1 hr2 hcontract hrho] at h
    exact h
  have hadd : HasDerivAt (id + correction) 1 0 :=
    ((hasDerivAt_id 0).add hcorr).congr_deriv (by norm_num)
  apply hadd.congr_of_eventuallyEq
  filter_upwards [] with w
  rfl

/-- A local analytic Koenigs chart, including its local inverse. -/
structure KoenigsGerm (mu : ℂ) where
  phi : ℂ → ℂ
  psi : ℂ → ℂ
  phi_analytic : AnalyticAt ℂ phi 0
  psi_analytic : AnalyticAt ℂ psi 0
  phi_zero : phi 0 = 0
  deriv_phi_zero : deriv phi 0 = 1
  schroeder : ∀ᶠ w in 𝓝 0, phi (centeredQuad mu w) = mu * phi w
  left_inv : ∀ᶠ w in 𝓝 0, psi (phi w) = w
  right_inv : ∀ᶠ y in 𝓝 0, phi (psi y) = y

/-- Quantitative Koenigs theorem. The inequalities expose the exact disk and
geometric ratio used by the proof. -/
noncomputable def koenigsGermOfContractionData
    (mu : ℂ) (r rho : ℝ)
    (hmu : 0 < ‖mu‖) (hr0 : 0 ≤ r) (hr1 : r ≤ 1)
    (hr2 : r ^ 2 < ‖mu‖)
    (hcontract : ‖mu‖ + rho ≤ r)
    (hrho : 0 < rho) :
    KoenigsGerm mu := by
  have hphi : AnalyticAt ℂ (koenigsCoordinate mu) 0 := by
    exact (differentiableOn_koenigsCoordinate
      mu r rho hmu hr0 hr1 hr2 hcontract).analyticOnNhd isOpen_ball
        0 (mem_ball_self hrho)
  have hderiv :
      deriv (koenigsCoordinate mu) 0 = 1 :=
    (hasDerivAt_koenigsCoordinate_zero
      mu r rho hmu hr0 hr1 hr2 hcontract hrho).deriv
  have hderiv0 : deriv (koenigsCoordinate mu) 0 ≠ 0 := by
    rw [hderiv]
    norm_num
  let psi : ℂ → ℂ :=
    hphi.hasStrictDerivAt.localInverse
      (koenigsCoordinate mu) (deriv (koenigsCoordinate mu) 0) 0 hderiv0
  refine
    { phi := koenigsCoordinate mu
      psi := psi
      phi_analytic := hphi
      psi_analytic := ?_
      phi_zero := koenigsCoordinate_zero mu
      deriv_phi_zero := hderiv
      schroeder := ?_
      left_inv := ?_
      right_inv := ?_ }
  · simpa only [psi, koenigsCoordinate_zero] using
      hphi.analyticAt_localInverse hderiv0
  · filter_upwards [Metric.ball_mem_nhds 0 hrho] with w hw
    exact koenigsCoordinate_schroeder
      mu r rho hmu hr0 hr1 hr2 hcontract hw
  · exact HasStrictDerivAt.eventually_left_inverse
      (f := koenigsCoordinate mu)
      (f' := deriv (koenigsCoordinate mu) 0)
      (a := 0) hphi.hasStrictDerivAt hderiv0
  · simpa [koenigsCoordinate_zero] using
      (HasStrictDerivAt.eventually_right_inverse
        (f := koenigsCoordinate mu)
        (f' := deriv (koenigsCoordinate mu) 0)
        (a := 0) hphi.hasStrictDerivAt hderiv0)

/-- Local Koenigs linearization for every nonzero attracting multiplier.
The auxiliary contraction radius is selected between `‖μ‖` and `√‖μ‖`. -/
noncomputable def koenigsGermOfAttracting
    (mu : ℂ) (hmu : 0 < ‖mu‖) (hattract : ‖mu‖ < 1) :
    KoenigsGerm mu := by
  let a : ℝ := ‖mu‖
  let s : ℝ := Real.sqrt a
  have ha0 : 0 < a := hmu
  have ha1 : a < 1 := hattract
  have has : a < s := by
    rw [Real.lt_sqrt ha0.le]
    nlinarith
  have hs1 : s < 1 := by
    rw [Real.sqrt_lt' zero_lt_one]
    simpa using ha1
  let r : ℝ := (a + s) / 2
  have har : a < r := by
    dsimp [r]
    linarith
  have hrs : r < s := by
    dsimp [r]
    linarith
  have hr0 : 0 ≤ r := (ha0.trans har).le
  have hr1 : r ≤ 1 := (hrs.trans hs1).le
  have hsquare : s ^ 2 = a := by
    exact Real.sq_sqrt ha0.le
  have hr2 : r ^ 2 < a := by
    nlinarith
  let rho : ℝ := (r - a) / 2
  have hrho : 0 < rho := by
    dsimp [rho]
    linarith
  have hcontract : ‖mu‖ + rho ≤ r := by
    change a + rho ≤ r
    dsimp [rho]
    linarith
  exact koenigsGermOfContractionData
    mu r rho hmu hr0 hr1 (by simpa [a] using hr2) hcontract hrho

/-- Existence form of the local Koenigs linearization theorem. -/
theorem exists_koenigsGerm_of_attracting
    (mu : ℂ) (hmu : 0 < ‖mu‖) (hattract : ‖mu‖ < 1) :
    Nonempty (KoenigsGerm mu) :=
  ⟨koenigsGermOfAttracting mu hmu hattract⟩

/-! ## Transport back to a fixed point of `z² + c` -/

theorem quad_sub_fixed_eq_centeredQuad
    (c p z : ℂ) (hp : quad c p = p) :
    quad c z - p = centeredQuad (2 * p) (z - p) := by
  have h := quad_centered_at_fixed c p (z - p) hp
  have hz : p + (z - p) = z := by ring
  rw [hz] at h
  rw [h]
  simp only [centeredQuad]
  ring

/-- The local Koenigs chart stated directly at a fixed point of `q_c`. -/
structure KoenigsFixedPointGerm (c p : ℂ) where
  phi : ℂ → ℂ
  psi : ℂ → ℂ
  phi_analytic : AnalyticAt ℂ phi p
  psi_analytic : AnalyticAt ℂ psi 0
  phi_fixed : phi p = 0
  deriv_phi_fixed : deriv phi p = 1
  schroeder : ∀ᶠ z in 𝓝 p, phi (quad c z) = (2 * p) * phi z
  left_inv : ∀ᶠ z in 𝓝 p, psi (phi z) = z
  right_inv : ∀ᶠ y in 𝓝 0, phi (psi y) = y

/-- Transport the centered Koenigs germ by the translation `z ↦ z - p`. -/
noncomputable def koenigsFixedPointGermOfAttracting
    (c p : ℂ) (hp : quad c p = p)
    (hmu : 0 < ‖2 * p‖) (hattract : ‖2 * p‖ < 1) :
    KoenigsFixedPointGerm c p := by
  let g : KoenigsGerm (2 * p) :=
    koenigsGermOfAttracting (2 * p) hmu hattract
  let phi : ℂ → ℂ := fun z => g.phi (z - p)
  let psi : ℂ → ℂ := fun y => p + g.psi y
  have hshiftAnalytic : AnalyticAt ℂ (fun z : ℂ => z - p) p :=
    analyticAt_id.sub analyticAt_const
  have hshiftTendsto :
      Tendsto (fun z : ℂ => z - p) (𝓝 p) (𝓝 0) := by
    have h : Tendsto (fun z : ℂ => z - p) (𝓝 p) (𝓝 (p - p)) :=
      tendsto_id.sub_const p
    simpa using h
  have hphiAnalytic : AnalyticAt ℂ phi p := by
    simpa [phi] using g.phi_analytic.comp_sub p
  have hphiDeriv : HasDerivAt phi 1 p := by
    have hgderiv : HasDerivAt g.phi 1 0 :=
      g.phi_analytic.hasStrictDerivAt.hasDerivAt.congr_deriv
        g.deriv_phi_zero
    have hgderivAt : HasDerivAt g.phi 1 (p - p) := by
      simpa using hgderiv
    simpa [phi] using hgderivAt.comp_sub_const p p
  refine
    { phi := phi
      psi := psi
      phi_analytic := hphiAnalytic
      psi_analytic := ?_
      phi_fixed := ?_
      deriv_phi_fixed := hphiDeriv.deriv
      schroeder := ?_
      left_inv := ?_
      right_inv := ?_ }
  · exact analyticAt_const.add g.psi_analytic
  · simp [phi, g.phi_zero]
  · filter_upwards [hshiftTendsto.eventually g.schroeder] with z hz
    change g.phi (quad c z - p) = (2 * p) * g.phi (z - p)
    rw [quad_sub_fixed_eq_centeredQuad c p z hp]
    exact hz
  · filter_upwards [hshiftTendsto.eventually g.left_inv] with z hz
    change p + g.psi (g.phi (z - p)) = z
    rw [hz]
    ring
  · filter_upwards [g.right_inv] with y hy
    change g.phi (p + g.psi y - p) = y
    simpa using hy

/-- Existence form of T3.1 at an attracting fixed point. -/
theorem exists_koenigsFixedPointGerm
    (c p : ℂ) (hp : quad c p = p)
    (hmu : 0 < ‖2 * p‖) (hattract : ‖2 * p‖ < 1) :
    Nonempty (KoenigsFixedPointGerm c p) :=
  ⟨koenigsFixedPointGermOfAttracting c p hp hmu hattract⟩

end

end Mandelbrot
