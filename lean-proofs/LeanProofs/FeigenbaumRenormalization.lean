/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Topology.MetricSpace.Contracting
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
# Certified Feigenbaum renormalization

This file separates the two logical parts of a computer-assisted
renormalization proof.

* `RadiiCertificate` is the exact Newton--Kantorovich/radii-polynomial
  interface.  Its main theorem proves existence and uniqueness of a genuine
  fixed point from a defect bound `Y`, a contraction bound `Z`, and the
  self-map inequality `Y + Z * r ≤ r`.
* The final section proves that the square zero problem used in the validated
  Chebyshev computation is equivalent to the Feigenbaum--Cvitanović fixed
  point equation.

The renormalization operator itself has one unstable direction and is not
assumed to be a contraction.  The contracting map in a concrete application
is the Newton-like map `T = id - A Φ`.
-/

namespace Mandelbrot

noncomputable section

open Function Metric Set

/-! ## The exact radii-certificate theorem -/

/-- Data checked by a Newton--Kantorovich computer-assisted proof.

`map` is normally the Newton-like map `x ↦ x - A (Φ x)`, not the original
renormalization operator.  `defect` is the certified `Y` bound and
`contraction` is the certified `Z` bound. -/
structure RadiiCertificate {E : Type*} [MetricSpace E]
    (map : E → E) where
  center : E
  radius : ℝ
  defect : ℝ
  contraction : NNReal
  radius_nonneg : 0 ≤ radius
  defect_bound : dist (map center) center ≤ defect
  contraction_lt_one : contraction < 1
  self_map_budget : defect + (contraction : ℝ) * radius ≤ radius
  lipschitz_on : LipschitzOnWith contraction map (closedBall center radius)

namespace RadiiCertificate

variable {E : Type*} [MetricSpace E] {map : E → E}

theorem center_mem (cert : RadiiCertificate map) :
    cert.center ∈ closedBall cert.center cert.radius :=
  mem_closedBall_self cert.radius_nonneg

/-- The radii inequality implies that the Newton map preserves the certified
closed ball. -/
theorem mapsTo_closedBall (cert : RadiiCertificate map) :
    MapsTo map (closedBall cert.center cert.radius)
      (closedBall cert.center cert.radius) := by
  intro x hx
  rw [mem_closedBall] at hx ⊢
  calc
    dist (map x) cert.center ≤
        dist (map x) (map cert.center) + dist (map cert.center) cert.center :=
      dist_triangle _ _ _
    _ ≤ (cert.contraction : ℝ) * dist x cert.center + cert.defect :=
      add_le_add
        (cert.lipschitz_on.dist_le_mul x hx cert.center cert.center_mem)
        cert.defect_bound
    _ ≤ (cert.contraction : ℝ) * cert.radius + cert.defect := by
      gcongr
    _ = cert.defect + (cert.contraction : ℝ) * cert.radius := add_comm _ _
    _ ≤ cert.radius := cert.self_map_budget

/-- The restriction of the Newton map to its certified ball is a genuine
contraction. -/
theorem contracting_restrict (cert : RadiiCertificate map) :
    ContractingWith cert.contraction
      (cert.mapsTo_closedBall.restrict map
        (closedBall cert.center cert.radius)
        (closedBall cert.center cert.radius)) := by
  refine ⟨cert.contraction_lt_one, LipschitzWith.of_dist_le_mul ?_⟩
  intro x y
  exact cert.lipschitz_on.dist_le_mul x x.2 y y.2

/-- Exact Newton--Kantorovich conclusion: there is a unique fixed point in the
certified ball, and its distance from the numerical center satisfies the usual
a-posteriori `Y / (1 - Z)` estimate. -/
theorem exists_unique_fixedPoint [CompleteSpace E]
    (cert : RadiiCertificate map) :
    ∃! x : E,
      x ∈ closedBall cert.center cert.radius ∧
      IsFixedPt map x ∧
      dist cert.center x ≤ cert.defect / (1 - (cert.contraction : ℝ)) := by
  have hfinite : edist cert.center (map cert.center) ≠ ⊤ := by simp
  obtain ⟨x, hxBall, hxFixed, _hTendsto, _hEstimate⟩ :=
    cert.contracting_restrict.exists_fixedPoint'
      Metric.isClosed_closedBall.isComplete cert.mapsTo_closedBall
      cert.center_mem hfinite
  have hZ : (cert.contraction : ℝ) < 1 := by
    exact_mod_cast cert.contraction_lt_one
  have hdistance_step :
      dist cert.center x ≤
        cert.defect + (cert.contraction : ℝ) * dist cert.center x := by
    calc
      dist cert.center x = dist cert.center (map x) := by rw [hxFixed.eq]
      _ ≤ dist cert.center (map cert.center) +
          dist (map cert.center) (map x) := dist_triangle _ _ _
      _ ≤ cert.defect + (cert.contraction : ℝ) * dist cert.center x :=
        add_le_add (by simpa [dist_comm] using cert.defect_bound)
          (cert.lipschitz_on.dist_le_mul cert.center cert.center_mem x hxBall)
  have hdistance :
      dist cert.center x ≤ cert.defect / (1 - (cert.contraction : ℝ)) := by
    rw [le_div_iff₀ (sub_pos.mpr hZ)]
    nlinarith
  refine ⟨x, ⟨hxBall, hxFixed, hdistance⟩, ?_⟩
  intro y hy
  have hcontract := cert.lipschitz_on.dist_le_mul y hy.1 x hxBall
  rw [hy.2.1.eq, hxFixed.eq] at hcontract
  have hdist_nonneg : 0 ≤ dist y x := dist_nonneg
  have hzero : dist y x = 0 := by
    nlinarith
  exact dist_eq_zero.mp hzero

end RadiiCertificate

/-! ## From the contracting Newton map back to the zero problem -/

/-- Newton-like map associated with a residual `phi` and an approximate
inverse `A`. -/
def newtonMap {E : Type*} [AddCommGroup E]
    (A : E →+ E) (phi : E → E) (x : E) : E :=
  x - A (phi x)

/-- If the chosen approximate inverse is injective, fixed points of the
Newton-like map are exactly zeros of the original residual. -/
theorem isFixedPt_newtonMap_iff {E : Type*} [AddCommGroup E]
    (A : E →+ E) (hA : Function.Injective A) (phi : E → E) (x : E) :
    IsFixedPt (newtonMap A phi) x ↔ phi x = 0 := by
  constructor
  · intro hx
    have hzero : A (phi x) = 0 := by
      simpa [newtonMap, sub_eq_iff_eq_add] using hx.eq
    exact hA (by simpa using hzero)
  · intro hx
    change newtonMap A phi x = x
    simp [newtonMap, hx]

/-- Newton--Kantorovich conclusion stated directly for the residual equation:
under an injective approximate inverse, the certified ball contains a unique
zero of `phi`. -/
theorem RadiiCertificate.exists_unique_zero
    {E : Type*} [AddCommGroup E] [MetricSpace E] [CompleteSpace E]
    (A : E →+ E) (hA : Function.Injective A) (phi : E → E)
    (cert : RadiiCertificate (newtonMap A phi)) :
    ∃! x : E,
      x ∈ closedBall cert.center cert.radius ∧
      phi x = 0 ∧
      dist cert.center x ≤ cert.defect / (1 - (cert.contraction : ℝ)) := by
  obtain ⟨x, hx, hUnique⟩ := cert.exists_unique_fixedPoint
  refine ⟨x, ⟨hx.1, (isFixedPt_newtonMap_iff A hA phi x).mp hx.2.1, hx.2.2⟩, ?_⟩
  intro y hy
  apply hUnique y
  exact ⟨hy.1, (isFixedPt_newtonMap_iff A hA phi y).mpr hy.2.1, hy.2.2⟩

/-! ## The Feigenbaum--Cvitanović equation -/

/-- `m`-fold composition of a self-map, evaluated at `x`. -/
def iterateValue {𝕜 : Type*} (m : ℕ) (h : 𝕜 → 𝕜) (x : 𝕜) : 𝕜 :=
  (h^[m]) x

/-- The scale appearing in the symmetric order-`m` renormalization equation. -/
def feigenbaumScale {𝕜 : Type*} [Zero 𝕜]
    (m : ℕ) (h : 𝕜 → 𝕜) : 𝕜 :=
  iterateValue m h 0

/-- Symmetric order-`m` Feigenbaum--Cvitanović renormalization operator:
`R_m(h)(x) = h^[m](α x) / α`, where `α = h^[m](0)`. -/
def feigenbaumRenormalization {𝕜 : Type*} [Field 𝕜]
    (m : ℕ) (h : 𝕜 → 𝕜) (x : 𝕜) : 𝕜 :=
  iterateValue m h (feigenbaumScale m h * x) / feigenbaumScale m h

/-- Functional part of the square zero problem used for validated Newton:
`φ_m(α,h)(x) = α h(x) - h^[m](α x)`. -/
def feigenbaumResidual {𝕜 : Type*} [Ring 𝕜]
    (m : ℕ) (alpha : 𝕜) (h : 𝕜 → 𝕜) (x : 𝕜) : 𝕜 :=
  alpha * h x - iterateValue m h (alpha * x)

/-- The phase condition plus zero functional residual recovers the scale
`α = h^[m](0)`; it is not an additional numerical assumption. -/
theorem scale_eq_of_phase_and_residual {𝕜 : Type*} [Ring 𝕜]
    (m : ℕ) (alpha : 𝕜) (h : 𝕜 → 𝕜)
    (hPhase : h 0 = 1)
    (hResidual : ∀ x, feigenbaumResidual m alpha h x = 0) :
    alpha = feigenbaumScale m h := by
  have h0 := hResidual 0
  apply sub_eq_zero.mp
  simpa [feigenbaumResidual, feigenbaumScale, hPhase] using h0

/-- A zero of the square system with nonzero scale is exactly a fixed point of
the Feigenbaum--Cvitanović renormalization operator. -/
theorem fixedPoint_of_phase_and_residual {𝕜 : Type*} [Field 𝕜]
    (m : ℕ) (alpha : 𝕜) (h : 𝕜 → 𝕜)
    (hPhase : h 0 = 1)
    (hResidual : ∀ x, feigenbaumResidual m alpha h x = 0)
    (hAlpha : alpha ≠ 0) :
    ∀ x, feigenbaumRenormalization m h x = h x := by
  have hScale : alpha = feigenbaumScale m h :=
    scale_eq_of_phase_and_residual m alpha h hPhase hResidual
  intro x
  have hx := hResidual x
  rw [feigenbaumRenormalization, ← hScale]
  rw [feigenbaumResidual, sub_eq_zero] at hx
  rw [← hx, mul_div_cancel_left₀ _ hAlpha]

/-- Conversely, a normalized fixed point with nonzero scale gives a zero of
the functional residual when `α` is chosen to be its dynamical scale. -/
theorem residual_of_fixedPoint {𝕜 : Type*} [Field 𝕜]
    (m : ℕ) (h : 𝕜 → 𝕜)
    (hScale : feigenbaumScale m h ≠ 0)
    (hFixed : ∀ x, feigenbaumRenormalization m h x = h x) :
    ∀ x, feigenbaumResidual m (feigenbaumScale m h) h x = 0 := by
  intro x
  have hx := hFixed x
  rw [feigenbaumRenormalization, div_eq_iff hScale] at hx
  rw [feigenbaumResidual, sub_eq_zero, mul_comm]
  exact hx.symm

/-- A fixed point with nonzero dynamical scale automatically satisfies the
phase normalization `h(0) = 1`. -/
theorem phase_of_fixedPoint {𝕜 : Type*} [Field 𝕜]
    (m : ℕ) (h : 𝕜 → 𝕜)
    (hScale : feigenbaumScale m h ≠ 0)
    (hFixed : ∀ x, feigenbaumRenormalization m h x = h x) :
    h 0 = 1 := by
  have h0 := hFixed 0
  rw [feigenbaumRenormalization] at h0
  simp only [mul_zero] at h0
  change feigenbaumScale m h / feigenbaumScale m h = h 0 at h0
  rw [div_self hScale] at h0
  exact h0.symm

/-- Full equivalence between the normalized square system and the
Feigenbaum--Cvitanović fixed-point equation, with the scale chosen dynamically. -/
theorem phase_and_residual_iff_fixedPoint {𝕜 : Type*} [Field 𝕜]
    (m : ℕ) (h : 𝕜 → 𝕜) (hScale : feigenbaumScale m h ≠ 0) :
    (h 0 = 1 ∧
      ∀ x, feigenbaumResidual m (feigenbaumScale m h) h x = 0) ↔
    ∀ x, feigenbaumRenormalization m h x = h x := by
  constructor
  · intro hSquare
    exact fixedPoint_of_phase_and_residual m (feigenbaumScale m h) h
      hSquare.1 hSquare.2 hScale
  · intro hFixed
    exact ⟨phase_of_fixedPoint m h hScale hFixed,
      residual_of_fixedPoint m h hScale hFixed⟩

/-! ## Rational envelope of the published classical `m = 2` certificate

The validated Chebyshev computation gives, before decimal outward rounding,

* `Y_K ≤ 9.036139678977776e-25`,
* `Y_∞ ≤ 5.202781528560547e-18`,
* `Z_KK ≤ 0.364457042580782`,
* `Z_K∞ ≤ 0.000001092701849`, and
* `Z_∞ ≤ 0.003536362589890`.

The rational constants below deliberately round the sums upward.  Consequently
this section contains no floating-point arithmetic.  Once the two analytic
hypotheses `hDefect` and `hLipschitz` have been discharged by an interval
checker, all remaining existence, uniqueness, and radius arithmetic is checked
by the Lean kernel.
-/

namespace PublishedM2Certificate

/-- Upward rational envelope of `Y_K + Y_∞`. -/
def defect : ℝ := 520279 / (10 : ℝ) ^ 23

/-- Upward rational envelope of `Z_KK + Z_K∞ + Z_∞`. -/
def contraction : NNReal := 73599 / 200000

/-- Radius used by the published local uniqueness certificate. -/
def radius : ℝ := 1 / (10 : ℝ) ^ 15

theorem contraction_lt_one : contraction < 1 := by
  norm_num [contraction]

theorem radius_nonneg : 0 ≤ radius := by
  norm_num [radius]

theorem self_map_budget :
    defect + (contraction : ℝ) * radius ≤ radius := by
  norm_num [defect, contraction, radius]

/-- The conservative rational envelope still gives an error below
`8.24 × 10⁻¹⁸`. -/
theorem aPosteriori_lt :
    defect / (1 - (contraction : ℝ)) < 824 / (10 : ℝ) ^ 20 := by
  norm_num [defect, contraction]

/-- Assemble the exact radii certificate from the two analytic estimates
produced by the finite-dimensional interval calculation and its tail bounds. -/
def certificate {E : Type*} [MetricSpace E] (map : E → E) (center : E)
    (hDefect : dist (map center) center ≤ defect)
    (hLipschitz :
      LipschitzOnWith contraction map (closedBall center radius)) :
    RadiiCertificate map where
  center := center
  radius := radius
  defect := defect
  contraction := contraction
  radius_nonneg := radius_nonneg
  defect_bound := hDefect
  contraction_lt_one := contraction_lt_one
  self_map_budget := self_map_budget
  lipschitz_on := hLipschitz

/-- Final classical `m = 2` fixed-point conclusion, parameterized only by the
two analytic bounds that the interval checker must establish. -/
theorem exists_unique_fixedPoint {E : Type*} [MetricSpace E] [CompleteSpace E]
    (map : E → E) (center : E)
    (hDefect : dist (map center) center ≤ defect)
    (hLipschitz :
      LipschitzOnWith contraction map (closedBall center radius)) :
    ∃! x : E,
      x ∈ closedBall center radius ∧
      IsFixedPt map x ∧
      dist center x < 824 / (10 : ℝ) ^ 20 := by
  let cert := certificate map center hDefect hLipschitz
  obtain ⟨x, hx, _hUnique⟩ := cert.exists_unique_fixedPoint
  refine ⟨x, ⟨hx.1, hx.2.1, hx.2.2.trans_lt aPosteriori_lt⟩, ?_⟩
  intro y hy
  have hcontract := hLipschitz.dist_le_mul y hy.1 x hx.1
  rw [hy.2.1.eq, hx.2.1.eq] at hcontract
  have hZ : (contraction : ℝ) < 1 := by
    exact_mod_cast contraction_lt_one
  have hdist_nonneg : 0 ≤ dist y x := dist_nonneg
  have hzero : dist y x = 0 := by
    nlinarith
  exact dist_eq_zero.mp hzero

end PublishedM2Certificate

end

end Mandelbrot
