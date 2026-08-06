/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.LowPeriodSheetArea
import LeanProofs.CertifiedAreaBackends

/-!
# Final finite low-period area accounting

This module packages the canonical global sheet selected by an exact center,
its compact multiplier-disk image, and the conjugate centers used in the
finite area sum.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set MeasureTheory
open scoped ComplexConjugate ENNReal Topology

noncomputable def periodThreeGlobalSheet
    (c : ℂ) (hc : periodThreeCenterEquation c = 0) :
    C(OpenUnitMultiplierDisk, PeriodThreeMultiplierCurve) :=
  Classical.choose (existsUnique_periodThree_globalSheet c hc)

theorem periodThreeGlobalSheet_spec
    (c : ℂ) (hc : periodThreeCenterEquation c = 0) :
    periodThreeGlobalSheet c hc multiplierDiskZero =
        periodThreeCenterCurvePoint c hc ∧
      periodThreeMultiplierProjection ∘ periodThreeGlobalSheet c hc =
        ContinuousMap.id _ :=
  (Classical.choose_spec (existsUnique_periodThree_globalSheet c hc)).1

noncomputable def periodFourGlobalSheet
    (c : ℂ) (hc : periodFourCenterEquation c = 0) :
    C(OpenUnitMultiplierDisk, PeriodFourMultiplierCurve) :=
  Classical.choose (existsUnique_periodFour_globalSheet c hc)

theorem periodFourGlobalSheet_spec
    (c : ℂ) (hc : periodFourCenterEquation c = 0) :
    periodFourGlobalSheet c hc multiplierDiskZero =
        periodFourCenterCurvePoint c hc ∧
      periodFourMultiplierProjection ∘ periodFourGlobalSheet c hc =
        ContinuousMap.id _ :=
  (Classical.choose_spec (existsUnique_periodFour_globalSheet c hc)).1

def periodThreeLowerCenter : ℂ := conj periodThreeUpperCenter
def periodFourLowerLargeCenter : ℂ := conj periodFourUpperLargeCenter

theorem periodThreeLowerCenter_spec :
    periodThreeCenterEquation periodThreeLowerCenter = 0 := by
  rw [periodThreeLowerCenter, periodThreeCenterEquation_conj,
    periodThreeUpperCenter_spec.2, map_zero]

theorem periodFourLowerLargeCenter_spec :
    periodFourCenterEquation periodFourLowerLargeCenter = 0 := by
  rw [periodFourLowerLargeCenter, periodFourCenterEquation_conj,
    periodFourUpperLargeCenter_spec.2, map_zero]

theorem periodThreeLowerCenter_mem_isolationDisk :
    periodThreeLowerCenter ∈
      closedBall periodThreeLowerCenterApprox (1 / 1000000) := by
  change dist (conj periodThreeUpperCenter)
    (conj periodThreeUpperCenterApprox) ≤ 1 / 1000000
  rw [Complex.dist_conj_conj]
  exact periodThreeUpperCenter_spec.1

theorem periodFourLowerLargeCenter_mem_isolationDisk :
    periodFourLowerLargeCenter ∈
      closedBall periodFourLowerLargeCenterApprox (1 / 500000) := by
  change dist (conj periodFourUpperLargeCenter)
    (conj periodFourUpperLargeCenterApprox) ≤ 1 / 500000
  rw [Complex.dist_conj_conj]
  exact periodFourUpperLargeCenter_spec.1

private theorem ne_of_mem_disjoint_closedBalls
    {c d q s : ℂ} {r t : ℝ}
    (hc : c ∈ closedBall q r) (hd : d ∈ closedBall s t)
    (hsep : r + t < dist q s) : c ≠ d := by
  intro hcd
  subst d
  have htri : dist q s ≤ dist q c + dist c s := dist_triangle _ _ _
  have hqc : dist q c ≤ r := by simpa [dist_comm] using hc
  have hcs : dist c s ≤ t := hd
  linarith

theorem periodThreeRealCenter_ne_upperCenter :
    periodThreeRealCenter ≠ periodThreeUpperCenter := by
  apply ne_of_mem_disjoint_closedBalls periodThreeRealCenter_spec.1
    periodThreeUpperCenter_spec.1
  rw [dist_eq]
  calc
    (1 / 1000000 : ℝ) + 1 / 1000000 <
        |(periodThreeRealCenterApprox - periodThreeUpperCenterApprox).re| := by
      norm_num [periodThreeRealCenterApprox, periodThreeUpperCenterApprox]
    _ ≤ ‖periodThreeRealCenterApprox - periodThreeUpperCenterApprox‖ :=
      abs_re_le_norm _

theorem periodThreeRealCenter_ne_lowerCenter :
    periodThreeRealCenter ≠ periodThreeLowerCenter := by
  apply ne_of_mem_disjoint_closedBalls periodThreeRealCenter_spec.1
    periodThreeLowerCenter_mem_isolationDisk
  rw [periodThreeLowerCenterApprox, ← Complex.dist_conj_comm]
  have hreal : conj periodThreeRealCenterApprox =
      periodThreeRealCenterApprox := by
    have hn : conj (1754878 : ℂ) = 1754878 := map_ofNat _ _
    have hd : conj (1000000 : ℂ) = 1000000 := map_ofNat _ _
    simp only [periodThreeRealCenterApprox, map_neg, map_div₀, hn, hd]
  rw [hreal, dist_eq]
  calc
    (1 / 1000000 : ℝ) + 1 / 1000000 <
        |(periodThreeRealCenterApprox - periodThreeUpperCenterApprox).re| := by
      norm_num [periodThreeRealCenterApprox, periodThreeUpperCenterApprox]
    _ ≤ ‖periodThreeRealCenterApprox - periodThreeUpperCenterApprox‖ :=
      abs_re_le_norm _

theorem periodThreeUpperCenter_ne_lowerCenter :
    periodThreeUpperCenter ≠ periodThreeLowerCenter := by
  apply ne_of_mem_disjoint_closedBalls periodThreeUpperCenter_spec.1
    periodThreeLowerCenter_mem_isolationDisk
  rw [periodThreeLowerCenterApprox, dist_comm, Complex.dist_conj_self]
  norm_num [periodThreeUpperCenterApprox]

theorem periodFourRealCenter_ne_upperLargeCenter :
    periodFourRealCenter ≠ periodFourUpperLargeCenter := by
  apply ne_of_mem_disjoint_closedBalls periodFourRealCenter_spec.1
    periodFourUpperLargeCenter_spec.1
  rw [dist_eq]
  calc
    (1 / 1000000 : ℝ) + 1 / 500000 <
        |(periodFourRealCenterApprox - periodFourUpperLargeCenterApprox).re| := by
      norm_num [periodFourRealCenterApprox, periodFourUpperLargeCenterApprox]
    _ ≤ ‖periodFourRealCenterApprox - periodFourUpperLargeCenterApprox‖ :=
      abs_re_le_norm _

theorem periodFourRealCenter_ne_lowerLargeCenter :
    periodFourRealCenter ≠ periodFourLowerLargeCenter := by
  apply ne_of_mem_disjoint_closedBalls periodFourRealCenter_spec.1
    periodFourLowerLargeCenter_mem_isolationDisk
  rw [periodFourLowerLargeCenterApprox, ← Complex.dist_conj_comm]
  have hreal : conj periodFourRealCenterApprox =
      periodFourRealCenterApprox := by
    have hn : conj (1310703 : ℂ) = 1310703 := map_ofNat _ _
    have hd : conj (1000000 : ℂ) = 1000000 := map_ofNat _ _
    simp only [periodFourRealCenterApprox, map_neg, map_div₀, hn, hd]
  rw [hreal, dist_eq]
  calc
    (1 / 1000000 : ℝ) + 1 / 500000 <
        |(periodFourRealCenterApprox - periodFourUpperLargeCenterApprox).re| := by
      norm_num [periodFourRealCenterApprox, periodFourUpperLargeCenterApprox]
    _ ≤ ‖periodFourRealCenterApprox - periodFourUpperLargeCenterApprox‖ :=
      abs_re_le_norm _

theorem periodFourUpperLargeCenter_ne_lowerLargeCenter :
    periodFourUpperLargeCenter ≠ periodFourLowerLargeCenter := by
  apply ne_of_mem_disjoint_closedBalls periodFourUpperLargeCenter_spec.1
    periodFourLowerLargeCenter_mem_isolationDisk
  rw [periodFourLowerLargeCenterApprox, dist_comm, Complex.dist_conj_self]
  norm_num [periodFourUpperLargeCenterApprox]

theorem periodThreeFirstCoefficient_conj (c : ℂ) :
    periodThreeFirstCoefficient (conj c) =
      conj (periodThreeFirstCoefficient c) := by
  have h2 : conj (2 : ℂ) = 2 := map_ofNat _ _
  have h3 : conj (3 : ℂ) = 3 := map_ofNat _ _
  have h4 : conj (4 : ℂ) = 4 := map_ofNat _ _
  have h8 : conj (8 : ℂ) = 8 := map_ofNat _ _
  unfold periodThreeFirstCoefficient
  rw [map_div₀ (starRingEnd ℂ)]
  simp only [map_add, map_mul, map_pow, map_one, h2, h3, h4, h8]

theorem periodFourFirstCoefficient_conj (c : ℂ) :
    periodFourFirstCoefficient (conj c) =
      conj (periodFourFirstCoefficient c) := by
  have h3 : conj (3 : ℂ) = 3 := map_ofNat _ _
  have h4 : conj (4 : ℂ) = 4 := map_ofNat _ _
  have h6 : conj (6 : ℂ) = 6 := map_ofNat _ _
  have h9 : conj (9 : ℂ) = 9 := map_ofNat _ _
  have h12 : conj (12 : ℂ) = 12 := map_ofNat _ _
  have h15 : conj (15 : ℂ) = 15 := map_ofNat _ _
  have h16 : conj (16 : ℂ) = 16 := map_ofNat _ _
  unfold periodFourFirstCoefficient
  rw [map_div₀ (starRingEnd ℂ)]
  simp only [map_add, map_sub, map_mul, map_pow,
    h3, h4, h6, h9, h12, h15, h16]

theorem periodThreeLowerCenter_firstCoefficient_norm_gt :
    (94 / 1000 : ℝ) <
      ‖periodThreeFirstCoefficient periodThreeLowerCenter‖ := by
  rw [periodThreeLowerCenter, periodThreeFirstCoefficient_conj, norm_conj]
  exact periodThreeUpperCenter_firstCoefficient_norm_gt

theorem periodFourLowerLargeCenter_firstCoefficient_norm_gt :
    (43 / 1000 : ℝ) <
      ‖periodFourFirstCoefficient periodFourLowerLargeCenter‖ := by
  rw [periodFourLowerLargeCenter, periodFourFirstCoefficient_conj, norm_conj]
  exact periodFourUpperLargeCenter_firstCoefficient_norm_gt

def periodThreeCenterInnerRegion
    (c : ℂ) (hc : periodThreeCenterEquation c = 0) : CertifiedInnerRegion where
  carrier := periodThreeSheetExtension (periodThreeGlobalSheet c hc) ''
    ball (0 : ℂ) certifiedMultiplierRadius
  measurable := (isOpen_periodThreeSheetExtension_image_ball
    (periodThreeGlobalSheet c hc) (periodThreeGlobalSheet_spec c hc).2
    (by norm_num [certifiedMultiplierRadius])
    (by norm_num [certifiedMultiplierRadius])).measurableSet
  subset_Mandelbrot := periodThreeSheetExtension_image_ball_subset_Mandelbrot
    (periodThreeGlobalSheet c hc) (periodThreeGlobalSheet_spec c hc).2
    (by norm_num [certifiedMultiplierRadius])
  certifiedArea := ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
    normSq (periodThreeFirstCoefficient c))
  certifiedArea_le_volume :=
    periodThreeCenterSheet_certifiedRadius_area_lower_bound c hc
      (periodThreeGlobalSheet c hc) (periodThreeGlobalSheet_spec c hc).1
      (periodThreeGlobalSheet_spec c hc).2

def periodFourCenterInnerRegion
    (c : ℂ) (hc : periodFourCenterEquation c = 0) : CertifiedInnerRegion where
  carrier := periodFourSheetExtension (periodFourGlobalSheet c hc) ''
    ball (0 : ℂ) certifiedMultiplierRadius
  measurable := (isOpen_periodFourSheetExtension_image_ball
    (periodFourGlobalSheet c hc) (periodFourGlobalSheet_spec c hc).2
    (by norm_num [certifiedMultiplierRadius])
    (by norm_num [certifiedMultiplierRadius])).measurableSet
  subset_Mandelbrot := periodFourSheetExtension_image_ball_subset_Mandelbrot
    (periodFourGlobalSheet c hc) (periodFourGlobalSheet_spec c hc).2
    (by norm_num [certifiedMultiplierRadius])
  certifiedArea := ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
    normSq (periodFourFirstCoefficient c))
  certifiedArea_le_volume :=
    periodFourCenterSheet_certifiedRadius_area_lower_bound c hc
      (periodFourGlobalSheet c hc) (periodFourGlobalSheet_spec c hc).1
      (periodFourGlobalSheet_spec c hc).2

theorem periodThreeCenterInnerRegion_subset_sheetRange
    (c : ℂ) (hc : periodThreeCenterEquation c = 0) :
    (periodThreeCenterInnerRegion c hc).carrier ⊆
      Set.range (periodThreeSheetParameter (periodThreeGlobalSheet c hc)) := by
  rintro x ⟨mu, hmu, rfl⟩
  have hmuNorm : ‖mu‖ < 1 :=
    (mem_ball_zero_iff.mp hmu).trans (by
      norm_num [certifiedMultiplierRadius])
  have hmuUnit : mu ∈ openUnitMultiplierDisk :=
    (mem_openUnitMultiplierDisk_iff mu).2 hmuNorm
  rw [periodThreeSheetExtension_of_mem _ hmuUnit]
  exact ⟨⟨mu, hmuUnit⟩, rfl⟩

theorem periodFourCenterInnerRegion_subset_sheetRange
    (c : ℂ) (hc : periodFourCenterEquation c = 0) :
    (periodFourCenterInnerRegion c hc).carrier ⊆
      Set.range (periodFourSheetParameter (periodFourGlobalSheet c hc)) := by
  rintro x ⟨mu, hmu, rfl⟩
  have hmuNorm : ‖mu‖ < 1 :=
    (mem_ball_zero_iff.mp hmu).trans (by
      norm_num [certifiedMultiplierRadius])
  have hmuUnit : mu ∈ openUnitMultiplierDisk :=
    (mem_openUnitMultiplierDisk_iff mu).2 hmuNorm
  rw [periodFourSheetExtension_of_mem _ hmuUnit]
  exact ⟨⟨mu, hmuUnit⟩, rfl⟩

theorem disjoint_periodThreeCenterInnerRegions
    (c d : ℂ) (hc : periodThreeCenterEquation c = 0)
    (hd : periodThreeCenterEquation d = 0) (hcd : c ≠ d) :
    Disjoint (periodThreeCenterInnerRegion c hc).carrier
      (periodThreeCenterInnerRegion d hd).carrier := by
  exact (disjoint_periodThreeSheetParameter_ranges c d hc hd hcd
    (periodThreeGlobalSheet c hc) (periodThreeGlobalSheet d hd)
    (periodThreeGlobalSheet_spec c hc).1
    (periodThreeGlobalSheet_spec d hd).1
    (periodThreeGlobalSheet_spec c hc).2
    (periodThreeGlobalSheet_spec d hd).2).mono
      (periodThreeCenterInnerRegion_subset_sheetRange c hc)
      (periodThreeCenterInnerRegion_subset_sheetRange d hd)

theorem disjoint_periodFourCenterInnerRegions
    (c d : ℂ) (hc : periodFourCenterEquation c = 0)
    (hd : periodFourCenterEquation d = 0) (hcd : c ≠ d) :
    Disjoint (periodFourCenterInnerRegion c hc).carrier
      (periodFourCenterInnerRegion d hd).carrier := by
  exact (disjoint_periodFourSheetParameter_ranges c d hc hd hcd
    (periodFourGlobalSheet c hc) (periodFourGlobalSheet d hd)
    (periodFourGlobalSheet_spec c hc).1
    (periodFourGlobalSheet_spec d hd).1
    (periodFourGlobalSheet_spec c hc).2
    (periodFourGlobalSheet_spec d hd).2).mono
      (periodFourCenterInnerRegion_subset_sheetRange c hc)
      (periodFourCenterInnerRegion_subset_sheetRange d hd)

theorem disjoint_periodThree_periodFourCenterInnerRegions
    (c d : ℂ) (hc : periodThreeCenterEquation c = 0)
    (hd : periodFourCenterEquation d = 0) :
    Disjoint (periodThreeCenterInnerRegion c hc).carrier
      (periodFourCenterInnerRegion d hd).carrier := by
  exact (disjoint_periodThree_periodFourSheetParameter_ranges
    (periodThreeGlobalSheet c hc) (periodFourGlobalSheet d hd)
    (periodThreeGlobalSheet_spec c hc).2
    (periodFourGlobalSheet_spec d hd).2).mono
      (periodThreeCenterInnerRegion_subset_sheetRange c hc)
      (periodFourCenterInnerRegion_subset_sheetRange d hd)

def lowPeriodBaseInnerRegion : CertifiedInnerRegion where
  carrier := mainCardioid ∪ periodTwoBulb
  measurable := (isOpen_mainCardioid.union isOpen_ball).measurableSet
  subset_Mandelbrot := mainCardioid_union_periodTwoBulb_subset_Mandelbrot
  certifiedArea := ENNReal.ofReal (7 * Real.pi / 16)
  certifiedArea_le_volume := by
    rw [volume_mainCardioid_union_periodTwoBulb]

theorem disjoint_lowPeriodBase_periodThreeCenterInnerRegion
    (c : ℂ) (hc : periodThreeCenterEquation c = 0) :
    Disjoint lowPeriodBaseInnerRegion.carrier
      (periodThreeCenterInnerRegion c hc).carrier := by
  exact disjoint_mainCardioid_union_periodTwoBulb_periodThreeSheet_image_ball
    (periodThreeGlobalSheet c hc) (periodThreeGlobalSheet_spec c hc).2
    (by norm_num [certifiedMultiplierRadius])

theorem disjoint_lowPeriodBase_periodFourCenterInnerRegion
    (c : ℂ) (hc : periodFourCenterEquation c = 0) :
    Disjoint lowPeriodBaseInnerRegion.carrier
      (periodFourCenterInnerRegion c hc).carrier := by
  exact disjoint_mainCardioid_union_periodTwoBulb_periodFourSheet_image_ball
    (periodFourGlobalSheet c hc) (periodFourGlobalSheet_spec c hc).2
    (by norm_num [certifiedMultiplierRadius])

inductive LowPeriodRegionIndex
  | base
  | periodThreeReal
  | periodThreeUpper
  | periodThreeLower
  | periodFourReal
  | periodFourUpperLarge
  | periodFourLowerLarge
  deriving DecidableEq, Fintype

def lowPeriodCertifiedRegion : LowPeriodRegionIndex → CertifiedInnerRegion
  | .base => lowPeriodBaseInnerRegion
  | .periodThreeReal => periodThreeCenterInnerRegion periodThreeRealCenter
      periodThreeRealCenter_spec.2
  | .periodThreeUpper => periodThreeCenterInnerRegion periodThreeUpperCenter
      periodThreeUpperCenter_spec.2
  | .periodThreeLower => periodThreeCenterInnerRegion periodThreeLowerCenter
      periodThreeLowerCenter_spec
  | .periodFourReal => periodFourCenterInnerRegion periodFourRealCenter
      periodFourRealCenter_spec.2
  | .periodFourUpperLarge => periodFourCenterInnerRegion periodFourUpperLargeCenter
      periodFourUpperLargeCenter_spec.2
  | .periodFourLowerLarge => periodFourCenterInnerRegion periodFourLowerLargeCenter
      periodFourLowerLargeCenter_spec

theorem lowPeriodCertifiedRegions_pairwise :
    PairwiseDisjoint (↑(Finset.univ : Finset LowPeriodRegionIndex))
      fun i => (lowPeriodCertifiedRegion i).carrier := by
  intro i _hi j _hj hij
  have hb3r := disjoint_lowPeriodBase_periodThreeCenterInnerRegion
    periodThreeRealCenter periodThreeRealCenter_spec.2
  have hb3u := disjoint_lowPeriodBase_periodThreeCenterInnerRegion
    periodThreeUpperCenter periodThreeUpperCenter_spec.2
  have hb3l := disjoint_lowPeriodBase_periodThreeCenterInnerRegion
    periodThreeLowerCenter periodThreeLowerCenter_spec
  have hb4r := disjoint_lowPeriodBase_periodFourCenterInnerRegion
    periodFourRealCenter periodFourRealCenter_spec.2
  have hb4u := disjoint_lowPeriodBase_periodFourCenterInnerRegion
    periodFourUpperLargeCenter periodFourUpperLargeCenter_spec.2
  have hb4l := disjoint_lowPeriodBase_periodFourCenterInnerRegion
    periodFourLowerLargeCenter periodFourLowerLargeCenter_spec
  have h3ru := disjoint_periodThreeCenterInnerRegions
    periodThreeRealCenter periodThreeUpperCenter
    periodThreeRealCenter_spec.2 periodThreeUpperCenter_spec.2
    periodThreeRealCenter_ne_upperCenter
  have h3rl := disjoint_periodThreeCenterInnerRegions
    periodThreeRealCenter periodThreeLowerCenter
    periodThreeRealCenter_spec.2 periodThreeLowerCenter_spec
    periodThreeRealCenter_ne_lowerCenter
  have h3ul := disjoint_periodThreeCenterInnerRegions
    periodThreeUpperCenter periodThreeLowerCenter
    periodThreeUpperCenter_spec.2 periodThreeLowerCenter_spec
    periodThreeUpperCenter_ne_lowerCenter
  have h4ru := disjoint_periodFourCenterInnerRegions
    periodFourRealCenter periodFourUpperLargeCenter
    periodFourRealCenter_spec.2 periodFourUpperLargeCenter_spec.2
    periodFourRealCenter_ne_upperLargeCenter
  have h4rl := disjoint_periodFourCenterInnerRegions
    periodFourRealCenter periodFourLowerLargeCenter
    periodFourRealCenter_spec.2 periodFourLowerLargeCenter_spec
    periodFourRealCenter_ne_lowerLargeCenter
  have h4ul := disjoint_periodFourCenterInnerRegions
    periodFourUpperLargeCenter periodFourLowerLargeCenter
    periodFourUpperLargeCenter_spec.2 periodFourLowerLargeCenter_spec
    periodFourUpperLargeCenter_ne_lowerLargeCenter
  have h34rr := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeRealCenter periodFourRealCenter
    periodThreeRealCenter_spec.2 periodFourRealCenter_spec.2
  have h34ru := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeRealCenter periodFourUpperLargeCenter
    periodThreeRealCenter_spec.2 periodFourUpperLargeCenter_spec.2
  have h34rl := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeRealCenter periodFourLowerLargeCenter
    periodThreeRealCenter_spec.2 periodFourLowerLargeCenter_spec
  have h34ur := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeUpperCenter periodFourRealCenter
    periodThreeUpperCenter_spec.2 periodFourRealCenter_spec.2
  have h34uu := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeUpperCenter periodFourUpperLargeCenter
    periodThreeUpperCenter_spec.2 periodFourUpperLargeCenter_spec.2
  have h34ul := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeUpperCenter periodFourLowerLargeCenter
    periodThreeUpperCenter_spec.2 periodFourLowerLargeCenter_spec
  have h34lr := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeLowerCenter periodFourRealCenter
    periodThreeLowerCenter_spec periodFourRealCenter_spec.2
  have h34lu := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeLowerCenter periodFourUpperLargeCenter
    periodThreeLowerCenter_spec periodFourUpperLargeCenter_spec.2
  have h34ll := disjoint_periodThree_periodFourCenterInnerRegions
    periodThreeLowerCenter periodFourLowerLargeCenter
    periodThreeLowerCenter_spec periodFourLowerLargeCenter_spec
  fin_cases i <;> fin_cases j
  · exact (hij rfl).elim
  · simpa only [lowPeriodCertifiedRegion] using hb3r
  · simpa only [lowPeriodCertifiedRegion] using hb3u
  · simpa only [lowPeriodCertifiedRegion] using hb3l
  · simpa only [lowPeriodCertifiedRegion] using hb4r
  · simpa only [lowPeriodCertifiedRegion] using hb4u
  · simpa only [lowPeriodCertifiedRegion] using hb4l
  · simpa only [lowPeriodCertifiedRegion] using hb3r.symm
  · exact (hij rfl).elim
  · simpa only [lowPeriodCertifiedRegion] using h3ru
  · simpa only [lowPeriodCertifiedRegion] using h3rl
  · simpa only [lowPeriodCertifiedRegion] using h34rr
  · simpa only [lowPeriodCertifiedRegion] using h34ru
  · simpa only [lowPeriodCertifiedRegion] using h34rl
  · simpa only [lowPeriodCertifiedRegion] using hb3u.symm
  · simpa only [lowPeriodCertifiedRegion] using h3ru.symm
  · exact (hij rfl).elim
  · simpa only [lowPeriodCertifiedRegion] using h3ul
  · simpa only [lowPeriodCertifiedRegion] using h34ur
  · simpa only [lowPeriodCertifiedRegion] using h34uu
  · simpa only [lowPeriodCertifiedRegion] using h34ul
  · simpa only [lowPeriodCertifiedRegion] using hb3l.symm
  · simpa only [lowPeriodCertifiedRegion] using h3rl.symm
  · simpa only [lowPeriodCertifiedRegion] using h3ul.symm
  · exact (hij rfl).elim
  · simpa only [lowPeriodCertifiedRegion] using h34lr
  · simpa only [lowPeriodCertifiedRegion] using h34lu
  · simpa only [lowPeriodCertifiedRegion] using h34ll
  · simpa only [lowPeriodCertifiedRegion] using hb4r.symm
  · simpa only [lowPeriodCertifiedRegion] using h34rr.symm
  · simpa only [lowPeriodCertifiedRegion] using h34ur.symm
  · simpa only [lowPeriodCertifiedRegion] using h34lr.symm
  · exact (hij rfl).elim
  · simpa only [lowPeriodCertifiedRegion] using h4ru
  · simpa only [lowPeriodCertifiedRegion] using h4rl
  · simpa only [lowPeriodCertifiedRegion] using hb4u.symm
  · simpa only [lowPeriodCertifiedRegion] using h34ru.symm
  · simpa only [lowPeriodCertifiedRegion] using h34uu.symm
  · simpa only [lowPeriodCertifiedRegion] using h34lu.symm
  · simpa only [lowPeriodCertifiedRegion] using h4ru.symm
  · exact (hij rfl).elim
  · simpa only [lowPeriodCertifiedRegion] using h4ul
  · simpa only [lowPeriodCertifiedRegion] using hb4l.symm
  · simpa only [lowPeriodCertifiedRegion] using h34rl.symm
  · simpa only [lowPeriodCertifiedRegion] using h34ul.symm
  · simpa only [lowPeriodCertifiedRegion] using h34ll.symm
  · simpa only [lowPeriodCertifiedRegion] using h4rl.symm
  · simpa only [lowPeriodCertifiedRegion] using h4ul.symm
  · exact (hij rfl).elim

def selectedLowPeriodFirstCoefficientMass
    (a3Real a3Complex a4Real a4ComplexLarge : ℂ) : ℝ :=
  normSq a3Real + 2 * normSq a3Complex + normSq a4Real +
    2 * normSq a4ComplexLarge

def coarseSelectedLowPeriodMass : ℝ :=
  (9 / 1000 : ℝ) ^ 2 + 2 * (94 / 1000 : ℝ) ^ 2 +
    (58 / 1000 : ℝ) ^ 2 + 2 * (43 / 1000 : ℝ) ^ 2

theorem coarseSelectedLowPeriodMass_eq :
    coarseSelectedLowPeriodMass = (24815 / 1000000 : ℝ) := by
  norm_num [coarseSelectedLowPeriodMass]

theorem selectedLowPeriodFirstCoefficientMass_gt_coarse
    {a3Real a3Complex a4Real a4ComplexLarge : ℂ}
    (h3r : (9 / 1000 : ℝ) < ‖a3Real‖)
    (h3c : (94 / 1000 : ℝ) < ‖a3Complex‖)
    (h4r : (58 / 1000 : ℝ) < ‖a4Real‖)
    (h4cl : (43 / 1000 : ℝ) < ‖a4ComplexLarge‖) :
    coarseSelectedLowPeriodMass < selectedLowPeriodFirstCoefficientMass
      a3Real a3Complex a4Real a4ComplexLarge := by
  have h3r_sq : (9 / 1000 : ℝ) ^ 2 < ‖a3Real‖ ^ 2 := by
    nlinarith [norm_nonneg a3Real]
  have h3c_sq : (94 / 1000 : ℝ) ^ 2 < ‖a3Complex‖ ^ 2 := by
    nlinarith [norm_nonneg a3Complex]
  have h4r_sq : (58 / 1000 : ℝ) ^ 2 < ‖a4Real‖ ^ 2 := by
    nlinarith [norm_nonneg a4Real]
  have h4cl_sq : (43 / 1000 : ℝ) ^ 2 < ‖a4ComplexLarge‖ ^ 2 := by
    nlinarith [norm_nonneg a4ComplexLarge]
  rw [coarseSelectedLowPeriodMass, selectedLowPeriodFirstCoefficientMass]
  simp only [normSq_eq_norm_sq]
  linarith

theorem twenty_nine_div_twenty_lt_base_add_compact_selectedLowPeriodArea
    {a3Real a3Complex a4Real a4ComplexLarge : ℂ}
    (h3r : (9 / 1000 : ℝ) < ‖a3Real‖)
    (h3c : (94 / 1000 : ℝ) < ‖a3Complex‖)
    (h4r : (58 / 1000 : ℝ) < ‖a4Real‖)
    (h4cl : (43 / 1000 : ℝ) < ‖a4ComplexLarge‖) :
    (29 / 20 : ℝ) < 7 * Real.pi / 16 +
      Real.pi * certifiedMultiplierRadius ^ 2 *
        selectedLowPeriodFirstCoefficientMass
          a3Real a3Complex a4Real a4ComplexLarge := by
  have hmass := selectedLowPeriodFirstCoefficientMass_gt_coarse
    h3r h3c h4r h4cl
  have hcoarse : (29 / 20 : ℝ) < 7 * Real.pi / 16 +
      Real.pi * certifiedMultiplierRadius ^ 2 *
        coarseSelectedLowPeriodMass := by
    rw [coarseSelectedLowPeriodMass_eq]
    norm_num [certifiedMultiplierRadius] at ⊢
    nlinarith [Real.pi_gt_d4]
  have hradius_pos : 0 < certifiedMultiplierRadius ^ 2 := by
    norm_num [certifiedMultiplierRadius]
  have harea := mul_lt_mul_of_pos_left hmass
    (mul_pos Real.pi_pos hradius_pos)
  exact hcoarse.trans (by linarith)

def lowPeriodRegionIndexFinset : Finset LowPeriodRegionIndex :=
  {.base, .periodThreeReal, .periodThreeUpper, .periodThreeLower,
    .periodFourReal, .periodFourUpperLarge, .periodFourLowerLarge}

theorem lowPeriodRegionIndexFinset_eq_univ :
    lowPeriodRegionIndexFinset = Finset.univ := by
  ext i
  fin_cases i <;> simp [lowPeriodRegionIndexFinset]

theorem lowPeriodCertifiedArea_sum_explicit :
    ∑ i ∈ (Finset.univ : Finset LowPeriodRegionIndex),
        (lowPeriodCertifiedRegion i).certifiedArea =
      ENNReal.ofReal (7 * Real.pi / 16) +
      ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodThreeFirstCoefficient periodThreeRealCenter)) +
      ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodThreeFirstCoefficient periodThreeUpperCenter)) +
      ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodThreeFirstCoefficient periodThreeLowerCenter)) +
      ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodFourFirstCoefficient periodFourRealCenter)) +
      ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodFourFirstCoefficient periodFourUpperLargeCenter)) +
      ENNReal.ofReal (Real.pi * certifiedMultiplierRadius ^ 2 *
        normSq (periodFourFirstCoefficient periodFourLowerLargeCenter)) := by
  rw [← lowPeriodRegionIndexFinset_eq_univ]
  simp [lowPeriodRegionIndexFinset, lowPeriodCertifiedRegion,
    lowPeriodBaseInnerRegion, periodThreeCenterInnerRegion,
    periodFourCenterInnerRegion]
  ac_rfl

private theorem ofReal_add_seven
    {a b c d e f g : ℝ}
    (ha : 0 ≤ a) (hb : 0 ≤ b) (hc : 0 ≤ c) (hd : 0 ≤ d)
    (he : 0 ≤ e) (hf : 0 ≤ f) (hg : 0 ≤ g) :
    ENNReal.ofReal a + ENNReal.ofReal b + ENNReal.ofReal c +
        ENNReal.ofReal d + ENNReal.ofReal e + ENNReal.ofReal f +
        ENNReal.ofReal g =
      ENNReal.ofReal (a + b + c + d + e + f + g) := by
  rw [← ENNReal.ofReal_add ha hb]
  rw [← ENNReal.ofReal_add (add_nonneg ha hb) hc]
  rw [← ENNReal.ofReal_add (add_nonneg (add_nonneg ha hb) hc) hd]
  rw [← ENNReal.ofReal_add
    (add_nonneg (add_nonneg (add_nonneg ha hb) hc) hd) he]
  rw [← ENNReal.ofReal_add
    (add_nonneg (add_nonneg (add_nonneg (add_nonneg ha hb) hc) hd) he) hf]
  rw [← ENNReal.ofReal_add
    (add_nonneg
      (add_nonneg (add_nonneg (add_nonneg (add_nonneg ha hb) hc) hd) he) hf) hg]

theorem lowPeriodCertifiedArea_sum_eq_ofReal :
    ∑ i ∈ (Finset.univ : Finset LowPeriodRegionIndex),
        (lowPeriodCertifiedRegion i).certifiedArea =
      ENNReal.ofReal (7 * Real.pi / 16 +
        Real.pi * certifiedMultiplierRadius ^ 2 *
          selectedLowPeriodFirstCoefficientMass
            (periodThreeFirstCoefficient periodThreeRealCenter)
            (periodThreeFirstCoefficient periodThreeUpperCenter)
            (periodFourFirstCoefficient periodFourRealCenter)
            (periodFourFirstCoefficient periodFourUpperLargeCenter)) := by
  rw [lowPeriodCertifiedArea_sum_explicit]
  have hbase : 0 ≤ 7 * Real.pi / 16 := by positivity
  have harea (z : ℂ) : 0 ≤ Real.pi * certifiedMultiplierRadius ^ 2 *
      normSq z :=
    mul_nonneg (mul_nonneg Real.pi_pos.le (sq_nonneg _))
      (Complex.normSq_nonneg z)
  rw [ofReal_add_seven hbase (harea _) (harea _) (harea _)
    (harea _) (harea _) (harea _)]
  congr 1
  rw [periodThreeLowerCenter, periodThreeFirstCoefficient_conj,
    Complex.normSq_conj, periodFourLowerLargeCenter,
    periodFourFirstCoefficient_conj, Complex.normSq_conj]
  unfold selectedLowPeriodFirstCoefficientMass
  ring

/-- The main unconditional lower bound: the base cardioid, the period-two
bulb, and six rigorously separated low-period multiplier sheets already have
total area strictly larger than `29/20`. -/
theorem twenty_nine_div_twenty_lt_volume_Mandelbrot :
    (29 / 20 : ℝ≥0∞) < volume Mandelbrot := by
  have hreal : (29 / 20 : ℝ) < 7 * Real.pi / 16 +
      Real.pi * certifiedMultiplierRadius ^ 2 *
        selectedLowPeriodFirstCoefficientMass
          (periodThreeFirstCoefficient periodThreeRealCenter)
          (periodThreeFirstCoefficient periodThreeUpperCenter)
          (periodFourFirstCoefficient periodFourRealCenter)
          (periodFourFirstCoefficient periodFourUpperLargeCenter) :=
    twenty_nine_div_twenty_lt_base_add_compact_selectedLowPeriodArea
      periodThreeRealCenter_firstCoefficient_norm_gt
      periodThreeUpperCenter_firstCoefficient_norm_gt
      periodFourRealCenter_firstCoefficient_norm_gt
      periodFourUpperLargeCenter_firstCoefficient_norm_gt
  have htotalPos : 0 < 7 * Real.pi / 16 +
      Real.pi * certifiedMultiplierRadius ^ 2 *
        selectedLowPeriodFirstCoefficientMass
          (periodThreeFirstCoefficient periodThreeRealCenter)
          (periodThreeFirstCoefficient periodThreeUpperCenter)
          (periodFourFirstCoefficient periodFourRealCenter)
          (periodFourFirstCoefficient periodFourUpperLargeCenter) := by
    linarith
  have hsumlt : (29 / 20 : ℝ≥0∞) <
      ∑ i ∈ (Finset.univ : Finset LowPeriodRegionIndex),
        (lowPeriodCertifiedRegion i).certifiedArea := by
    rw [lowPeriodCertifiedArea_sum_eq_ofReal]
    have h29 : (29 / 20 : ℝ≥0∞) = ENNReal.ofReal (29 / 20 : ℝ) := by
      rw [ENNReal.ofReal_div_of_pos (by norm_num : (0 : ℝ) < 20)]
      norm_num
    rw [h29]
    rw [ENNReal.ofReal_lt_ofReal_iff htotalPos]
    exact hreal
  exact hsumlt.trans_le
    (sum_certifiedInnerRegion_area_le_volume_Mandelbrot
      (Finset.univ : Finset LowPeriodRegionIndex) lowPeriodCertifiedRegion
      lowPeriodCertifiedRegions_pairwise)

end

end Mandelbrot
