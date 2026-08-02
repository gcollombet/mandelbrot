/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodCenterIsolation
import LeanProofs.FiniteCycleFatou
import LeanProofs.LowPeriodAreaArithmetic
import Mathlib.Analysis.Calculus.ContDiff.Deriv
import Mathlib.Analysis.Complex.OpenMapping

/-!
# Holomorphic low-period sheets and compact-disk area bounds

The covering-space lift is topological.  This module identifies it locally
with the holomorphic implicit-function branch, obtaining a smooth complex
extension on the open multiplier disk.  Its derivative can therefore be used
directly in the first-coefficient area theorem.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Metric Set MeasureTheory
open scoped Topology ENNReal

/-- A total lift into the multiplier disk.  Near every point of the disk this
is just the identity codomain restriction. -/
def multiplierDiskLift (mu : ℂ) : OpenUnitMultiplierDisk :=
  by
    classical
    exact if hmu : mu ∈ openUnitMultiplierDisk then ⟨mu, hmu⟩ else multiplierDiskZero

@[simp]
theorem multiplierDiskLift_of_mem {mu : ℂ} (hmu : mu ∈ openUnitMultiplierDisk) :
    multiplierDiskLift mu = ⟨mu, hmu⟩ := by
  simp [multiplierDiskLift, hmu]

theorem multiplierDiskLift_val_eventually {mu : ℂ}
    (hmu : mu ∈ openUnitMultiplierDisk) :
    (fun nu : ℂ ↦ ((multiplierDiskLift nu : OpenUnitMultiplierDisk) : ℂ)) =ᶠ[𝓝 mu]
      id := by
  filter_upwards [isOpen_ball.mem_nhds hmu] with nu hnu
  simp [multiplierDiskLift, openUnitMultiplierDisk, hnu]

theorem continuousAt_multiplierDiskLift {mu : ℂ}
    (hmu : mu ∈ openUnitMultiplierDisk) :
    ContinuousAt multiplierDiskLift mu := by
  refine (Topology.IsInducing.subtypeVal.continuousAt_iff).2 ?_
  change ContinuousAt (fun nu : ℂ ↦ ((multiplierDiskLift nu : OpenUnitMultiplierDisk) : ℂ)) mu
  exact continuousAt_id.congr_of_eventuallyEq (multiplierDiskLift_val_eventually hmu)

def periodThreeSheetExtension
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve)) (mu : ℂ) : ℂ :=
  periodThreeSheetParameter S (multiplierDiskLift mu)

def periodFourSheetExtension
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve)) (mu : ℂ) : ℂ :=
  periodFourSheetParameter S (multiplierDiskLift mu)

@[simp]
theorem periodThreeSheetExtension_of_mem
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    {mu : ℂ} (hmu : mu ∈ openUnitMultiplierDisk) :
    periodThreeSheetExtension S mu = periodThreeSheetParameter S ⟨mu, hmu⟩ := by
  simp [periodThreeSheetExtension, multiplierDiskLift, hmu]

@[simp]
theorem periodFourSheetExtension_of_mem
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    {mu : ℂ} (hmu : mu ∈ openUnitMultiplierDisk) :
    periodFourSheetExtension S mu = periodFourSheetParameter S ⟨mu, hmu⟩ := by
  simp [periodFourSheetExtension, multiplierDiskLift, hmu]

theorem continuousAt_periodThreeSheetExtension
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    {mu : ℂ} (hmu : mu ∈ openUnitMultiplierDisk) :
    ContinuousAt (periodThreeSheetExtension S) mu := by
  have hparam : Continuous (periodThreeSheetParameter S) := by
    unfold periodThreeSheetParameter
    fun_prop
  exact hparam.continuousAt.comp (continuousAt_multiplierDiskLift hmu)

theorem continuousAt_periodFourSheetExtension
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    {mu : ℂ} (hmu : mu ∈ openUnitMultiplierDisk) :
    ContinuousAt (periodFourSheetExtension S) mu := by
  have hparam : Continuous (periodFourSheetParameter S) := by
    unfold periodFourSheetParameter
    fun_prop
  exact hparam.continuousAt.comp (continuousAt_multiplierDiskLift hmu)

theorem contDiffAt_periodThreeSheetExtension
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    {mu : ℂ} (hmu : mu ∈ openUnitMultiplierDisk) :
    ContDiffAt ℂ ⊤ (periodThreeSheetExtension S) mu := by
  let mud : OpenUnitMultiplierDisk := ⟨mu, hmu⟩
  let p : PeriodThreeMultiplierCurve := S mud
  obtain ⟨phi, _hphi, hphiDiff, _hroot, hunique⟩ :=
    exists_periodThree_localRootBranch p
  have hpMu : (p.1.1 : ℂ) = mu := by
    dsimp only [p, mud]
    have hproj : periodThreeMultiplierProjection (S mud) = mud := by
      simpa using congrFun hS mud
    exact congrArg Subtype.val hproj
  have hgraph : ContinuousAt
      (fun nu : ℂ ↦ (nu, periodThreeSheetExtension S nu)) mu :=
    continuousAt_id.prodMk (continuousAt_periodThreeSheetExtension S hmu)
  have hp : (mu, periodThreeSheetExtension S mu) = ((p.1.1 : ℂ), p.1.2) := by
    apply Prod.ext
    · exact hpMu.symm
    · simp [periodThreeSheetExtension, multiplierDiskLift, hmu, p, mud,
        periodThreeSheetParameter]
  have hnear : ∀ᶠ nu : ℂ in 𝓝 mu,
      periodThreeMultiplierEquation (periodThreeSheetExtension S nu) nu = 0 ↔
        phi nu = periodThreeSheetExtension S nu := by
    have huniqueMu :
        {q : ℂ × ℂ | periodThreeMultiplierEquation q.2 q.1 = 0 ↔ phi q.1 = q.2}
          ∈ 𝓝 (mu, periodThreeSheetExtension S mu) := by
      rw [hp]
      exact hunique
    have hpre := hgraph huniqueMu
    filter_upwards [hpre] with nu hnu
    exact hnu
  have hinside : ∀ᶠ nu : ℂ in 𝓝 mu, nu ∈ openUnitMultiplierDisk :=
    isOpen_ball.mem_nhds hmu
  have heq : periodThreeSheetExtension S =ᶠ[𝓝 mu] phi := by
    filter_upwards [hinside, hnear] with nu hnu hnearNu
    symm
    apply hnearNu.mp
    simpa only [periodThreeSheetExtension_of_mem S hnu] using
      periodThree_globalSheet_equation S hS ⟨nu, hnu⟩
  have hphiDiffMu : ContDiffAt ℂ ⊤ phi mu := by
    simpa only [hpMu] using hphiDiff
  exact hphiDiffMu.congr_of_eventuallyEq heq

theorem contDiffAt_periodFourSheetExtension
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    {mu : ℂ} (hmu : mu ∈ openUnitMultiplierDisk) :
    ContDiffAt ℂ ⊤ (periodFourSheetExtension S) mu := by
  let mud : OpenUnitMultiplierDisk := ⟨mu, hmu⟩
  let p : PeriodFourMultiplierCurve := S mud
  obtain ⟨phi, _hphi, hphiDiff, _hroot, hunique⟩ :=
    exists_periodFour_localRootBranch p
  have hpMu : (p.1.1 : ℂ) = mu := by
    dsimp only [p, mud]
    have hproj : periodFourMultiplierProjection (S mud) = mud := by
      simpa using congrFun hS mud
    exact congrArg Subtype.val hproj
  have hgraph : ContinuousAt
      (fun nu : ℂ ↦ (nu, periodFourSheetExtension S nu)) mu :=
    continuousAt_id.prodMk (continuousAt_periodFourSheetExtension S hmu)
  have hp : (mu, periodFourSheetExtension S mu) = ((p.1.1 : ℂ), p.1.2) := by
    apply Prod.ext
    · exact hpMu.symm
    · simp [periodFourSheetExtension, multiplierDiskLift, hmu, p, mud,
        periodFourSheetParameter]
  have hnear : ∀ᶠ nu : ℂ in 𝓝 mu,
      periodFourMultiplierEquation (periodFourSheetExtension S nu) nu = 0 ↔
        phi nu = periodFourSheetExtension S nu := by
    have huniqueMu :
        {q : ℂ × ℂ | periodFourMultiplierEquation q.2 q.1 = 0 ↔ phi q.1 = q.2}
          ∈ 𝓝 (mu, periodFourSheetExtension S mu) := by
      rw [hp]
      exact hunique
    have hpre := hgraph huniqueMu
    filter_upwards [hpre] with nu hnu
    exact hnu
  have hinside : ∀ᶠ nu : ℂ in 𝓝 mu, nu ∈ openUnitMultiplierDisk :=
    isOpen_ball.mem_nhds hmu
  have heq : periodFourSheetExtension S =ᶠ[𝓝 mu] phi := by
    filter_upwards [hinside, hnear] with nu hnu hnearNu
    symm
    apply hnearNu.mp
    simpa only [periodFourSheetExtension_of_mem S hnu] using
      periodFour_globalSheet_equation S hS ⟨nu, hnu⟩
  have hphiDiffMu : ContDiffAt ℂ ⊤ phi mu := by
    simpa only [hpMu] using hphiDiff
  exact hphiDiffMu.congr_of_eventuallyEq heq

/-! ## Compact-disk area theorem for every global sheet -/

theorem periodThreeSheetExtension_injOn_ball
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR : R ≤ 1) :
    InjOn (periodThreeSheetExtension S) (ball (0 : ℂ) R) := by
  intro mu hmu nu hnu heq
  have hmuUnit : mu ∈ openUnitMultiplierDisk := by
    rw [mem_openUnitMultiplierDisk_iff]
    exact (mem_ball_zero_iff.mp hmu).trans_le hR
  have hnuUnit : nu ∈ openUnitMultiplierDisk := by
    rw [mem_openUnitMultiplierDisk_iff]
    exact (mem_ball_zero_iff.mp hnu).trans_le hR
  have hsub : (⟨mu, hmuUnit⟩ : OpenUnitMultiplierDisk) = ⟨nu, hnuUnit⟩ := by
    apply periodThreeSheetParameter_injective S hS
    simpa only [periodThreeSheetExtension_of_mem S hmuUnit,
      periodThreeSheetExtension_of_mem S hnuUnit] using heq
  exact congrArg Subtype.val hsub

theorem periodFourSheetExtension_injOn_ball
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR : R ≤ 1) :
    InjOn (periodFourSheetExtension S) (ball (0 : ℂ) R) := by
  intro mu hmu nu hnu heq
  have hmuUnit : mu ∈ openUnitMultiplierDisk := by
    rw [mem_openUnitMultiplierDisk_iff]
    exact (mem_ball_zero_iff.mp hmu).trans_le hR
  have hnuUnit : nu ∈ openUnitMultiplierDisk := by
    rw [mem_openUnitMultiplierDisk_iff]
    exact (mem_ball_zero_iff.mp hnu).trans_le hR
  have hsub : (⟨mu, hmuUnit⟩ : OpenUnitMultiplierDisk) = ⟨nu, hnuUnit⟩ := by
    apply periodFourSheetParameter_injective S hS
    simpa only [periodFourSheetExtension_of_mem S hmuUnit,
      periodFourSheetExtension_of_mem S hnuUnit] using heq
  exact congrArg Subtype.val hsub

theorem periodThreeSheetExtension_image_ball_subset_Mandelbrot
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR : R < 1) :
    periodThreeSheetExtension S '' ball (0 : ℂ) R ⊆ Mandelbrot := by
  rintro c ⟨mu, hmu, rfl⟩
  have hmuUnit : mu ∈ openUnitMultiplierDisk := by
    rw [mem_openUnitMultiplierDisk_iff]
    exact (mem_ball_zero_iff.mp hmu).trans hR
  apply mem_Mandelbrot_of_periodThreeMultiplierEquation
      (periodThreeSheetExtension S mu) mu
  · exact (mem_openUnitMultiplierDisk_iff mu).mp hmuUnit
  · simpa only [periodThreeSheetExtension_of_mem S hmuUnit] using
      periodThree_globalSheet_equation S hS ⟨mu, hmuUnit⟩

theorem periodFourSheetExtension_image_ball_subset_Mandelbrot
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR : R < 1) :
    periodFourSheetExtension S '' ball (0 : ℂ) R ⊆ Mandelbrot := by
  rintro c ⟨mu, hmu, rfl⟩
  have hmuUnit : mu ∈ openUnitMultiplierDisk := by
    rw [mem_openUnitMultiplierDisk_iff]
    exact (mem_ball_zero_iff.mp hmu).trans hR
  apply mem_Mandelbrot_of_periodFourMultiplierEquation
      (periodFourSheetExtension S mu) mu
  · exact (mem_openUnitMultiplierDisk_iff mu).mp hmuUnit
  · simpa only [periodFourSheetExtension_of_mem S hmuUnit] using
      periodFour_globalSheet_equation S hS ⟨mu, hmuUnit⟩

/-! ## Separation from the period-one and period-two base domains -/

theorem periodThreeMultiplierEquation_not_mem_mainCardioid
    (c mu : ℂ) (hmu : ‖mu‖ < 1)
    (hroot : periodThreeMultiplierEquation c mu = 0) :
    c ∉ mainCardioid := by
  rintro ⟨lambda, hlambdaBall, rfl⟩
  have hlambda : ‖lambda‖ < 1 := by
    simpa [mem_ball, dist_zero_right] using hlambdaBall
  obtain ⟨p, hpDyn, hpMu⟩ :=
    exists_periodThree_dynatomic_of_multiplierEquation
      (mainCardioidMap lambda) mu hmu hroot
  let q : ℂ := lambda / 2
  have hq1 : orbit (mainCardioidMap lambda) q 1 = q := by
    simpa only [orbit_succ, orbit_zero, q] using mainCardioidMap_fixedPoint lambda
  have hqDeriv : HasStrictDerivAt
      (finiteReturn (mainCardioidMap lambda) 1) lambda q := by
    change HasStrictDerivAt (fun w ↦ orbit (mainCardioidMap lambda) w 1) lambda q
    have h := hasStrictDerivAt_quad (mainCardioidMap lambda) q
    convert h using 1
    · funext w
      simp [orbit_succ, orbit_zero]
    · dsimp only [q]
      ring
  obtain ⟨j, hj, hpq⟩ := attracting_periodic_points_same_cycle
    (mainCardioidMap lambda) p q mu lambda 3 1 (by norm_num) (by norm_num)
    (orbit_three_eq_of_dynatomic_eq_zero hpDyn) hq1
    (by
      rw [← hpMu]
      change HasStrictDerivAt (fun w ↦ orbit (mainCardioidMap lambda) w 3)
        (periodThreeReturnMultiplier (mainCardioidMap lambda) p) p
      exact hasStrictDerivAt_orbit_three _ _)
    hqDeriv hmu hlambda
  have hj0 : j = 0 := by omega
  have hp1 : orbit (mainCardioidMap lambda) p 1 = p := by
    rw [hpq, hj0, orbit_zero]
    exact hq1
  have hpMuOne : periodThreeReturnMultiplier (mainCardioidMap lambda) p = 1 := by
    simp only [periodThreeDynatomic, periodThreeReturnMultiplier, orbit,
      Function.iterate_succ_apply', Function.iterate_zero_apply, quad] at hpDyn hp1 ⊢
    grobner (config := { ringSteps := 1000000 })
  have : mu = 1 := hpMu.symm.trans hpMuOne
  rw [this] at hmu
  norm_num at hmu

theorem periodFourMultiplierEquation_not_mem_mainCardioid
    (c mu : ℂ) (hmu : ‖mu‖ < 1)
    (hroot : periodFourMultiplierEquation c mu = 0) :
    c ∉ mainCardioid := by
  rintro ⟨lambda, hlambdaBall, rfl⟩
  have hlambda : ‖lambda‖ < 1 := by
    simpa [mem_ball, dist_zero_right] using hlambdaBall
  obtain ⟨p, hpDyn, hpMu⟩ :=
    exists_periodFour_dynatomic_of_multiplierEquation
      (mainCardioidMap lambda) mu hmu hroot
  let q : ℂ := lambda / 2
  have hq1 : orbit (mainCardioidMap lambda) q 1 = q := by
    simpa only [orbit_succ, orbit_zero, q] using mainCardioidMap_fixedPoint lambda
  have hqDeriv : HasStrictDerivAt
      (finiteReturn (mainCardioidMap lambda) 1) lambda q := by
    change HasStrictDerivAt (fun w ↦ orbit (mainCardioidMap lambda) w 1) lambda q
    have h := hasStrictDerivAt_quad (mainCardioidMap lambda) q
    convert h using 1
    · funext w
      simp [orbit_succ, orbit_zero]
    · dsimp only [q]
      ring
  obtain ⟨j, hj, hpq⟩ := attracting_periodic_points_same_cycle
    (mainCardioidMap lambda) p q mu lambda 4 1 (by norm_num) (by norm_num)
    (orbit_four_eq_of_dynatomic_eq_zero hpDyn) hq1
    (by
      rw [← hpMu]
      change HasStrictDerivAt (fun w ↦ orbit (mainCardioidMap lambda) w 4)
        (periodFourReturnMultiplier (mainCardioidMap lambda) p) p
      exact hasStrictDerivAt_orbit_four _ _)
    hqDeriv hmu hlambda
  have hj0 : j = 0 := by omega
  have hp1 : orbit (mainCardioidMap lambda) p 1 = p := by
    rw [hpq, hj0, orbit_zero]
    exact hq1
  have hpMuOne : periodFourReturnMultiplier (mainCardioidMap lambda) p = 1 := by
    simp only [periodFourDynatomic, periodFourReturnMultiplier, orbit,
      Function.iterate_succ_apply', Function.iterate_zero_apply, quad] at hpDyn hp1 ⊢
    grobner (config := { ringSteps := 1000000 })
  have : mu = 1 := hpMu.symm.trans hpMuOne
  rw [this] at hmu
  norm_num at hmu

theorem periodThreeMultiplierEquation_not_mem_periodTwoBulb
    (c mu : ℂ) (hmu : ‖mu‖ < 1)
    (hroot : periodThreeMultiplierEquation c mu = 0) :
    c ∉ periodTwoBulb := by
  intro hcTwo
  obtain ⟨p, hpDyn, hpMu⟩ :=
    exists_periodThree_dynatomic_of_multiplierEquation c mu hmu hroot
  obtain ⟨q, r, hqr, hrq, hnu⟩ :=
    exists_attracting_twoCycle_of_mem_periodTwoBulb hcTwo
  let nu : ℂ := (2 * r) * (2 * q)
  have hq2 : orbit c q 2 = q := orbit_twoCycle_fixed c q r hqr hrq
  have hqDeriv : HasStrictDerivAt (finiteReturn c 2) nu q := by
    change HasStrictDerivAt (fun w ↦ orbit c w 2) nu q
    convert hasStrictDerivAt_twoCycleReturn c q r hqr using 1
    funext w
    simp [twoCycleReturn, Function.comp_apply, orbit,
      Function.iterate_succ_apply', Function.iterate_zero_apply]
  obtain ⟨j, hj, hpq⟩ := attracting_periodic_points_same_cycle
    c p q mu nu 3 2 (by norm_num) (by norm_num)
    (orbit_three_eq_of_dynatomic_eq_zero hpDyn) hq2
    (by
      rw [← hpMu]
      change HasStrictDerivAt (fun w ↦ orbit c w 3)
        (periodThreeReturnMultiplier c p) p
      exact hasStrictDerivAt_orbit_three c p)
    hqDeriv hmu hnu
  have hp2 : orbit c p 2 = p := by
    rw [hpq]
    calc
      orbit c (orbit c q j) 2 = orbit c q (2 + j) :=
        (orbit_add c q 2 j).symm
      _ = orbit c q (j + 2) := by rw [Nat.add_comm]
      _ = orbit c (orbit c q 2) j := orbit_add c q j 2
      _ = orbit c q j := by rw [hq2]
  have hp3 : orbit c p 3 = p := orbit_three_eq_of_dynatomic_eq_zero hpDyn
  have hp1 : orbit c p 1 = p := by
    calc
      orbit c p 1 = orbit c (orbit c p 2) 1 := by rw [hp2]
      _ = orbit c p (1 + 2) := (orbit_add c p 1 2).symm
      _ = p := by simpa using hp3
  have hpMuOne : periodThreeReturnMultiplier c p = 1 := by
    simp only [periodThreeDynatomic, periodThreeReturnMultiplier, orbit,
      Function.iterate_succ_apply', Function.iterate_zero_apply, quad] at hpDyn hp1 ⊢
    grobner (config := { ringSteps := 1000000 })
  have : mu = 1 := hpMu.symm.trans hpMuOne
  rw [this] at hmu
  norm_num at hmu

theorem periodFourMultiplierEquation_not_mem_periodTwoBulb
    (c mu : ℂ) (hmu : ‖mu‖ < 1)
    (hroot : periodFourMultiplierEquation c mu = 0) :
    c ∉ periodTwoBulb := by
  intro hcTwo
  obtain ⟨p, hpDyn, hpMu⟩ :=
    exists_periodFour_dynatomic_of_multiplierEquation c mu hmu hroot
  obtain ⟨q, r, hqr, hrq, hnu⟩ :=
    exists_attracting_twoCycle_of_mem_periodTwoBulb hcTwo
  let nu : ℂ := (2 * r) * (2 * q)
  have hq2 : orbit c q 2 = q := orbit_twoCycle_fixed c q r hqr hrq
  have hqDeriv : HasStrictDerivAt (finiteReturn c 2) nu q := by
    change HasStrictDerivAt (fun w ↦ orbit c w 2) nu q
    convert hasStrictDerivAt_twoCycleReturn c q r hqr using 1
    funext w
    simp [twoCycleReturn, Function.comp_apply, orbit,
      Function.iterate_succ_apply', Function.iterate_zero_apply]
  obtain ⟨j, hj, hpq⟩ := attracting_periodic_points_same_cycle
    c p q mu nu 4 2 (by norm_num) (by norm_num)
    (orbit_four_eq_of_dynatomic_eq_zero hpDyn) hq2
    (by
      rw [← hpMu]
      change HasStrictDerivAt (fun w ↦ orbit c w 4)
        (periodFourReturnMultiplier c p) p
      exact hasStrictDerivAt_orbit_four c p)
    hqDeriv hmu hnu
  have hp2 : orbit c p 2 = p := by
    rw [hpq]
    calc
      orbit c (orbit c q j) 2 = orbit c q (2 + j) :=
        (orbit_add c q 2 j).symm
      _ = orbit c q (j + 2) := by rw [Nat.add_comm]
      _ = orbit c (orbit c q 2) j := orbit_add c q j 2
      _ = orbit c q j := by rw [hq2]
  have hpMuOne : periodFourReturnMultiplier c p = 1 := by
    simp only [periodFourDynatomic, periodFourReturnMultiplier, orbit,
      Function.iterate_succ_apply', Function.iterate_zero_apply, quad] at hpDyn hp2 ⊢
    grobner (config := { ringSteps := 1000000 })
  have : mu = 1 := hpMu.symm.trans hpMuOne
  rw [this] at hmu
  norm_num at hmu

theorem disjoint_mainCardioid_union_periodTwoBulb_periodThreeSheet_image_ball
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR : R < 1) :
    Disjoint (mainCardioid ∪ periodTwoBulb)
      (periodThreeSheetExtension S '' ball (0 : ℂ) R) := by
  rw [Set.disjoint_left]
  rintro c hcBase ⟨mu, hmu, rfl⟩
  have hmuNorm : ‖mu‖ < 1 :=
    (mem_ball_zero_iff.mp hmu).trans hR
  have hmuUnit : mu ∈ openUnitMultiplierDisk :=
    (mem_openUnitMultiplierDisk_iff mu).2 hmuNorm
  have hroot :
      periodThreeMultiplierEquation (periodThreeSheetExtension S mu) mu = 0 := by
    simpa only [periodThreeSheetExtension_of_mem S hmuUnit] using
      periodThree_globalSheet_equation S hS ⟨mu, hmuUnit⟩
  rcases hcBase with hcMain | hcTwo
  · exact periodThreeMultiplierEquation_not_mem_mainCardioid
      _ mu hmuNorm hroot hcMain
  · exact periodThreeMultiplierEquation_not_mem_periodTwoBulb
      _ mu hmuNorm hroot hcTwo

theorem disjoint_mainCardioid_union_periodTwoBulb_periodFourSheet_image_ball
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR : R < 1) :
    Disjoint (mainCardioid ∪ periodTwoBulb)
      (periodFourSheetExtension S '' ball (0 : ℂ) R) := by
  rw [Set.disjoint_left]
  rintro c hcBase ⟨mu, hmu, rfl⟩
  have hmuNorm : ‖mu‖ < 1 :=
    (mem_ball_zero_iff.mp hmu).trans hR
  have hmuUnit : mu ∈ openUnitMultiplierDisk :=
    (mem_openUnitMultiplierDisk_iff mu).2 hmuNorm
  have hroot :
      periodFourMultiplierEquation (periodFourSheetExtension S mu) mu = 0 := by
    simpa only [periodFourSheetExtension_of_mem S hmuUnit] using
      periodFour_globalSheet_equation S hS ⟨mu, hmuUnit⟩
  rcases hcBase with hcMain | hcTwo
  · exact periodFourMultiplierEquation_not_mem_mainCardioid
      _ mu hmuNorm hroot hcMain
  · exact periodFourMultiplierEquation_not_mem_periodTwoBulb
      _ mu hmuNorm hroot hcTwo

private theorem two_distinct_points_in_multiplier_ball
    {R : ℝ} (hR0 : 0 < R) :
    (0 : ℂ) ∈ ball 0 R ∧ ((R / 2 : ℝ) : ℂ) ∈ ball 0 R ∧
      (0 : ℂ) ≠ ((R / 2 : ℝ) : ℂ) := by
  constructor
  · exact mem_ball_self hR0
  constructor
  · rw [mem_ball_zero_iff, Complex.norm_real, Real.norm_eq_abs,
      abs_of_pos (half_pos hR0)]
    linarith
  · intro h
    have hre := congrArg Complex.re h
    norm_num at hre
    linarith

theorem isOpen_periodThreeSheetExtension_image_ball
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR0 : 0 < R) (hR1 : R < 1) :
    IsOpen (periodThreeSheetExtension S '' ball (0 : ℂ) R) := by
  have hanalytic :
      AnalyticOnNhd ℂ (periodThreeSheetExtension S) openUnitMultiplierDisk := by
    intro mu hmu
    exact (contDiffAt_periodThreeSheetExtension S hS hmu).analyticAt
  obtain ⟨w, hw⟩ | hopen := hanalytic.is_constant_or_isOpen
      (convex_ball (0 : ℂ) (1 : ℝ)).isPreconnected
  · obtain ⟨hzero, hhalf, hne⟩ := two_distinct_points_in_multiplier_ball hR0
    have hconst : periodThreeSheetExtension S 0 =
        periodThreeSheetExtension S ((R / 2 : ℝ) : ℂ) := by
      have hzeroUnit : (0 : ℂ) ∈ openUnitMultiplierDisk := by
        exact (show (0 : ℂ) ∈ ball 0 1 by norm_num)
      have hhalfUnit : ((R / 2 : ℝ) : ℂ) ∈ openUnitMultiplierDisk := by
        rw [mem_openUnitMultiplierDisk_iff]
        exact (mem_ball_zero_iff.mp hhalf).trans hR1
      exact (hw 0 hzeroUnit).trans (hw ((R / 2 : ℝ) : ℂ) hhalfUnit).symm
    exact (hne (periodThreeSheetExtension_injOn_ball S hS hR1.le hzero hhalf hconst)).elim
  · apply hopen (ball (0 : ℂ) R)
    · intro mu hmu
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_ball_zero_iff.mp hmu).trans hR1
    · exact isOpen_ball

theorem isOpen_periodFourSheetExtension_image_ball
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR0 : 0 < R) (hR1 : R < 1) :
    IsOpen (periodFourSheetExtension S '' ball (0 : ℂ) R) := by
  have hanalytic :
      AnalyticOnNhd ℂ (periodFourSheetExtension S) openUnitMultiplierDisk := by
    intro mu hmu
    exact (contDiffAt_periodFourSheetExtension S hS hmu).analyticAt
  obtain ⟨w, hw⟩ | hopen := hanalytic.is_constant_or_isOpen
      (convex_ball (0 : ℂ) (1 : ℝ)).isPreconnected
  · obtain ⟨hzero, hhalf, hne⟩ := two_distinct_points_in_multiplier_ball hR0
    have hconst : periodFourSheetExtension S 0 =
        periodFourSheetExtension S ((R / 2 : ℝ) : ℂ) := by
      have hzeroUnit : (0 : ℂ) ∈ openUnitMultiplierDisk := by
        exact (show (0 : ℂ) ∈ ball 0 1 by norm_num)
      have hhalfUnit : ((R / 2 : ℝ) : ℂ) ∈ openUnitMultiplierDisk := by
        rw [mem_openUnitMultiplierDisk_iff]
        exact (mem_ball_zero_iff.mp hhalf).trans hR1
      exact (hw 0 hzeroUnit).trans (hw ((R / 2 : ℝ) : ℂ) hhalfUnit).symm
    exact (hne (periodFourSheetExtension_injOn_ball S hS hR1.le hzero hhalf hconst)).elim
  · apply hopen (ball (0 : ℂ) R)
    · intro mu hmu
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_ball_zero_iff.mp hmu).trans hR1
    · exact isOpen_ball

/-- The existing first-coefficient area theorem, instantiated on a global
period-three sheet and on any compact disk strictly inside the unit disk. -/
theorem periodThreeSheet_area_lower_bound
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR0 : 0 < R) (hR1 : R < 1) :
    ENNReal.ofReal
        (Real.pi * R ^ 2 * normSq (deriv (periodThreeSheetExtension S) 0)) ≤
      volume (periodThreeSheetExtension S '' ball (0 : ℂ) R) := by
  apply ofReal_pi_mul_sq_mul_normSq_le_volume_image_ball hR0
  · intro z hz
    have hzUnit : z ∈ openUnitMultiplierDisk := by
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_ball_zero_iff.mp hz).trans hR1
    exact ((contDiffAt_periodThreeSheetExtension S hS hzUnit).differentiableAt
      (by simp)).hasDerivAt
  · intro z hz
    have hzUnit : z ∈ openUnitMultiplierDisk := by
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_ball_zero_iff.mp hz).trans hR1
    exact (ContDiffAt.derivWithin (m := 1)
      (contDiffAt_periodThreeSheetExtension S hS hzUnit)
      (by simp)).differentiableAt (by simp) |>.differentiableWithinAt
  · intro z hz
    have hzUnit : z ∈ openUnitMultiplierDisk := by
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_closedBall_zero_iff.mp hz).trans_lt hR1
    exact (ContDiffAt.derivWithin (m := 0)
      (contDiffAt_periodThreeSheetExtension S hS hzUnit) (by simp)).continuousAt.continuousWithinAt
  · exact periodThreeSheetExtension_injOn_ball S hS hR1.le

/-- The analogous compact-disk area estimate for a period-four sheet. -/
theorem periodFourSheet_area_lower_bound
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _)
    {R : ℝ} (hR0 : 0 < R) (hR1 : R < 1) :
    ENNReal.ofReal
        (Real.pi * R ^ 2 * normSq (deriv (periodFourSheetExtension S) 0)) ≤
      volume (periodFourSheetExtension S '' ball (0 : ℂ) R) := by
  apply ofReal_pi_mul_sq_mul_normSq_le_volume_image_ball hR0
  · intro z hz
    have hzUnit : z ∈ openUnitMultiplierDisk := by
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_ball_zero_iff.mp hz).trans hR1
    exact ((contDiffAt_periodFourSheetExtension S hS hzUnit).differentiableAt
      (by simp)).hasDerivAt
  · intro z hz
    have hzUnit : z ∈ openUnitMultiplierDisk := by
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_ball_zero_iff.mp hz).trans hR1
    exact (ContDiffAt.derivWithin (m := 1)
      (contDiffAt_periodFourSheetExtension S hS hzUnit)
      (by simp)).differentiableAt (by simp) |>.differentiableWithinAt
  · intro z hz
    have hzUnit : z ∈ openUnitMultiplierDisk := by
      rw [mem_openUnitMultiplierDisk_iff]
      exact (mem_closedBall_zero_iff.mp hz).trans_lt hR1
    exact (ContDiffAt.derivWithin (m := 0)
      (contDiffAt_periodFourSheetExtension S hS hzUnit) (by simp)).continuousAt.continuousWithinAt
  · exact periodFourSheetExtension_injOn_ball S hS hR1.le

theorem periodThreeSheet_certifiedRadius_area_lower_bound
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _) :
    ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (deriv (periodThreeSheetExtension S) 0)) ≤
      volume (periodThreeSheetExtension S ''
        ball (0 : ℂ) certifiedMultiplierRadius) := by
  apply periodThreeSheet_area_lower_bound S hS
  · norm_num [certifiedMultiplierRadius]
  · norm_num [certifiedMultiplierRadius]

theorem periodFourSheet_certifiedRadius_area_lower_bound
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _) :
    ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (deriv (periodFourSheetExtension S) 0)) ≤
      volume (periodFourSheetExtension S ''
        ball (0 : ℂ) certifiedMultiplierRadius) := by
  apply periodFourSheet_area_lower_bound S hS
  · norm_num [certifiedMultiplierRadius]
  · norm_num [certifiedMultiplierRadius]

/-! ## Identification of the derivative at the center -/

theorem periodThreeSheetExtension_zero
    (c : ℂ) (hc : periodThreeCenterEquation c = 0)
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodThreeCenterCurvePoint c hc) :
    periodThreeSheetExtension S 0 = c := by
  have hzero : (0 : ℂ) ∈ openUnitMultiplierDisk := by
    simp [openUnitMultiplierDisk]
  rw [periodThreeSheetExtension_of_mem S hzero]
  change (S ⟨0, hzero⟩).1.2 = c
  have hz : (⟨0, hzero⟩ : OpenUnitMultiplierDisk) = multiplierDiskZero := by
    apply Subtype.ext
    rfl
  rw [hz, hS0]
  rfl

theorem periodFourSheetExtension_zero
    (c : ℂ) (hc : periodFourCenterEquation c = 0)
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodFourCenterCurvePoint c hc) :
    periodFourSheetExtension S 0 = c := by
  have hzero : (0 : ℂ) ∈ openUnitMultiplierDisk := by
    simp [openUnitMultiplierDisk]
  rw [periodFourSheetExtension_of_mem S hzero]
  change (S ⟨0, hzero⟩).1.2 = c
  have hz : (⟨0, hzero⟩ : OpenUnitMultiplierDisk) = multiplierDiskZero := by
    apply Subtype.ext
    rfl
  rw [hz, hS0]
  rfl

theorem periodThreeSheetExtension_deriv_zero
    (c : ℂ) (hc : periodThreeCenterEquation c = 0)
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodThreeCenterCurvePoint c hc)
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _) :
    deriv (periodThreeSheetExtension S) 0 = periodThreeFirstCoefficient c := by
  let psi : ℂ → ℂ := periodThreeSheetExtension S
  let a : ℂ := deriv psi 0
  have hzero : (0 : ℂ) ∈ openUnitMultiplierDisk := by
    simp [openUnitMultiplierDisk]
  have hpsi : HasDerivAt psi a 0 := by
    exact ((contDiffAt_periodThreeSheetExtension S hS hzero).differentiableAt
      (by simp)).hasDerivAt
  have hpsi0 : psi 0 = c := periodThreeSheetExtension_zero c hc S hS0
  have hmu : HasDerivAt (fun mu : ℂ ↦ mu) 1 0 :=
    hasDerivAt_id' (x := (0 : ℂ))
  have hcalc : HasDerivAt
      (fun mu : ℂ ↦ periodThreeMultiplierEquation (psi mu) mu)
      (64 * (1 + 4 * c + 3 * c ^ 2) * a - 8 * (2 + c)) 0 := by
    unfold periodThreeMultiplierEquation
    have hraw := (((((hasDerivAt_const (x := (0 : ℂ)) (c := (64 : ℂ))).add
            (hpsi.const_mul 64)).add
          ((hpsi.pow 2).const_mul 128)).add
        ((hpsi.pow 3).const_mul 64)).sub
          (((hasDerivAt_const (x := (0 : ℂ)) (c := (16 : ℂ))).add
            (hpsi.const_mul 8)).mul hmu)).add (hmu.pow 2)
    refine (hraw.congr_of_eventuallyEq
      (Filter.Eventually.of_forall fun mu : ℂ => by
        simp only [Pi.add_apply, Pi.sub_apply, Pi.mul_apply, Pi.pow_apply])).congr_deriv ?_
    norm_num
    rw [hpsi0]
    ring
  have heq :
      (fun mu : ℂ ↦ periodThreeMultiplierEquation (psi mu) mu) =ᶠ[𝓝 (0 : ℂ)]
        (fun _ : ℂ ↦ 0) := by
    filter_upwards [isOpen_ball.mem_nhds hzero] with mu hmuUnit
    simpa only [psi, periodThreeSheetExtension_of_mem S hmuUnit] using
      periodThree_globalSheet_equation S hS ⟨mu, hmuUnit⟩
  have hlinear :
      64 * (1 + 4 * c + 3 * c ^ 2) * a - 8 * (2 + c) = 0 := by
    calc
      _ = deriv (fun mu : ℂ ↦ periodThreeMultiplierEquation (psi mu) mu) 0 :=
        hcalc.deriv.symm
      _ = deriv (fun _ : ℂ ↦ 0) 0 := heq.deriv_eq
      _ = 0 := by simp
  have hsimple : 1 + 4 * c + 3 * c ^ 2 ≠ 0 := by
    have hder := periodThreeCenterDerivative_ne_zero_of_center c hc
    intro hs
    apply hder
    norm_num [periodThreeCenterDerivative, periodThreeParameterDerivativeEquation]
    linear_combination 64 * hs
  exact periodThreeFirstCoefficient_eq_of_linearized c a hsimple hlinear

theorem periodFourSheetExtension_deriv_zero
    (c : ℂ) (hc : periodFourCenterEquation c = 0)
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodFourCenterCurvePoint c hc)
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _) :
    deriv (periodFourSheetExtension S) 0 = periodFourFirstCoefficient c := by
  let psi : ℂ → ℂ := periodFourSheetExtension S
  let a : ℂ := deriv psi 0
  have hzero : (0 : ℂ) ∈ openUnitMultiplierDisk := by
    simp [openUnitMultiplierDisk]
  have hpsi : HasDerivAt psi a 0 := by
    exact ((contDiffAt_periodFourSheetExtension S hS hzero).differentiableAt
      (by simp)).hasDerivAt
  have hpsi0 : psi 0 = c := periodFourSheetExtension_zero c hc S hS0
  have hmu : HasDerivAt (fun mu : ℂ ↦ mu) 1 0 :=
    hasDerivAt_id' (x := (0 : ℂ))
  have hcalc : HasDerivAt
      (fun mu : ℂ ↦ periodFourMultiplierEquation (psi mu) mu)
      (4096 * (4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5) * a -
        256 * (3 + c ^ 2 - c ^ 3 - c ^ 4)) 0 := by
    unfold periodFourMultiplierEquation
    have hinner := (((((hasDerivAt_const (x := (0 : ℂ)) (c := (1 : ℂ))).add
          ((hpsi.pow 2).const_mul 2)).add
        ((hpsi.pow 3).const_mul 3)).add
      ((hpsi.pow 4).const_mul 3)).add
        ((hpsi.pow 5).const_mul 3)).add (hpsi.pow 6)
    have hlinearMu := (((hpsi.pow 4).add (hpsi.pow 3)).sub (hpsi.pow 2)).sub
      (hasDerivAt_const (x := (0 : ℂ)) (c := (3 : ℂ)))
    have hquadraticMu :=
      (hasDerivAt_const (x := (0 : ℂ)) (c := (48 : ℂ))).sub
        ((hpsi.pow 2).const_mul 16)
    have hraw := (((hinner.const_mul 4096).add
      ((hlinearMu.mul hmu).const_mul 256)).add
        (hquadraticMu.mul (hmu.pow 2))).sub (hmu.pow 3)
    refine (hraw.congr_of_eventuallyEq
      (Filter.Eventually.of_forall fun mu : ℂ => by
        simp only [Pi.add_apply, Pi.sub_apply, Pi.mul_apply, Pi.pow_apply] <;>
          try ring)).congr_deriv ?_
    norm_num
    rw [hpsi0]
    ring
  have heq :
      (fun mu : ℂ ↦ periodFourMultiplierEquation (psi mu) mu) =ᶠ[𝓝 (0 : ℂ)]
        (fun _ : ℂ ↦ 0) := by
    filter_upwards [isOpen_ball.mem_nhds hzero] with mu hmuUnit
    simpa only [psi, periodFourSheetExtension_of_mem S hmuUnit] using
      periodFour_globalSheet_equation S hS ⟨mu, hmuUnit⟩
  have hlinear :
      4096 * (4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5) * a -
        256 * (3 + c ^ 2 - c ^ 3 - c ^ 4) = 0 := by
    calc
      _ = deriv (fun mu : ℂ ↦ periodFourMultiplierEquation (psi mu) mu) 0 :=
        hcalc.deriv.symm
      _ = deriv (fun _ : ℂ ↦ 0) 0 := heq.deriv_eq
      _ = 0 := by simp
  have hsimple :
      4 * c + 9 * c ^ 2 + 12 * c ^ 3 + 15 * c ^ 4 + 6 * c ^ 5 ≠ 0 := by
    have hder := periodFourCenterDerivative_ne_zero_of_center c hc
    intro hs
    apply hder
    norm_num [periodFourCenterDerivative, periodFourParameterDerivativeEquation]
    linear_combination hs
  exact periodFourFirstCoefficient_eq_of_linearized c a hsimple hlinear

theorem periodThreeCenterSheet_certifiedRadius_area_lower_bound
    (c : ℂ) (hc : periodThreeCenterEquation c = 0)
    (S : C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodThreeCenterCurvePoint c hc)
    (hS : periodThreeMultiplierProjection ∘ S = ContinuousMap.id _) :
    ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodThreeFirstCoefficient c)) ≤
      volume (periodThreeSheetExtension S ''
        ball (0 : ℂ) certifiedMultiplierRadius) := by
  simpa only [periodThreeSheetExtension_deriv_zero c hc S hS0 hS] using
    periodThreeSheet_certifiedRadius_area_lower_bound S hS

theorem periodFourCenterSheet_certifiedRadius_area_lower_bound
    (c : ℂ) (hc : periodFourCenterEquation c = 0)
    (S : C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve))
    (hS0 : S multiplierDiskZero = periodFourCenterCurvePoint c hc)
    (hS : periodFourMultiplierProjection ∘ S = ContinuousMap.id _) :
    ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodFourFirstCoefficient c)) ≤
      volume (periodFourSheetExtension S ''
        ball (0 : ℂ) certifiedMultiplierRadius) := by
  simpa only [periodFourSheetExtension_deriv_zero c hc S hS0 hS] using
    periodFourSheet_certifiedRadius_area_lower_bound S hS

end

end Mandelbrot
