/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.HyperbolicPade
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Phase-aware homographic transports with certified inflation

A centered scalar envelope forgets the phase of every homography.  This file
packages a stronger block summary:

* the actual complex homography of the nominal Padé block;
* its exact off-center image disk;
* a Euclidean inflation enclosing the actual (non-rational) block.

Two summaries merge with the exact complex matrix product.  The inner defect
is transported by a disk Lipschitz constant of the *composed outer
homography*, so rotations and cancellations present in its entries are not
replaced by a product of per-step absolute values.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set Function

/-! ## Inflated frames and disk Lipschitz bounds -/

/-- Concentric Euclidean inflation of a disk frame. -/
def DiskFrame.inflate (d : DiskFrame) (eps : ℝ) : DiskFrame where
  center := d.center
  radius := d.radius + eps

@[simp] theorem DiskFrame.inflate_center (d : DiskFrame) (eps : ℝ) :
    (d.inflate eps).center = d.center := rfl

@[simp] theorem DiskFrame.inflate_radius (d : DiskFrame) (eps : ℝ) :
    (d.inflate eps).radius = d.radius + eps := rfl

theorem DiskFrame.mem_carrier_inflate
    (d : DiskFrame) (eps : ℝ) (z : ℂ) (heps : 0 ≤ eps)
    (hz : z ∈ d.carrier) :
    z ∈ (d.inflate eps).carrier := by
  rw [DiskFrame.carrier, mem_closedBall, dist_eq] at hz ⊢
  simpa [DiskFrame.inflate] using hz.trans (le_add_of_nonneg_right heps)

theorem DiskFrame.mem_ball_inflate
    (d : DiskFrame) (eps : ℝ) (z : ℂ) (heps : 0 ≤ eps)
    (hz : z ∈ ball d.center d.radius) :
    z ∈ ball (d.inflate eps).center (d.inflate eps).radius := by
  rw [mem_ball, dist_eq] at hz ⊢
  simpa [DiskFrame.inflate] using hz.trans_le (le_add_of_nonneg_right heps)

/-- Uniform Euclidean Lipschitz constant of a homography on a certified disk. -/
def Homography.diskLipschitzBound (m : Homography ℂ) (d : DiskFrame) : ℝ :=
  ‖m.det‖ / (m.diskPoleMargin d.center d.radius) ^ 2

theorem Homography.diskLipschitzBound_nonneg
    (m : Homography ℂ) (d : DiskFrame) :
    0 ≤ m.diskLipschitzBound d := by
  unfold Homography.diskLipschitzBound
  positivity

/-- Two-point bound retaining the determinant and denominator margin of the
actual complex homography. -/
theorem Homography.norm_eval_sub_eval_le_diskLipschitz
    (m : Homography ℂ) (d : DiskFrame) (u v : ℂ)
    (hR : 0 ≤ d.radius)
    (hDelta : 0 < m.diskDelta d.center d.radius)
    (hu : u ∈ d.carrier) (hv : v ∈ d.carrier) :
    ‖m.eval u - m.eval v‖ ≤
      m.diskLipschitzBound d * ‖u - v‖ := by
  have hmargin : 0 < m.diskPoleMargin d.center d.radius :=
    (m.diskDelta_pos_iff_poleMargin_pos d.center d.radius hR).mp hDelta
  have hdu : m.diskPoleMargin d.center d.radius ≤ ‖m.den u‖ :=
    m.diskPoleMargin_le_norm_den d.center u d.radius hu
  have hdv : m.diskPoleMargin d.center d.radius ≤ ‖m.den v‖ :=
    m.diskPoleMargin_le_norm_den d.center v d.radius hv
  have hdenU : m.den u ≠ 0 :=
    norm_pos_iff.mp (hmargin.trans_le hdu)
  have hdenV : m.den v ≠ 0 :=
    norm_pos_iff.mp (hmargin.trans_le hdv)
  have hdenProd :
      (m.diskPoleMargin d.center d.radius) ^ 2 ≤
        ‖m.den u‖ * ‖m.den v‖ := by
    rw [pow_two]
    exact mul_le_mul hdu hdv hmargin.le (hmargin.trans_le hdu).le
  have hdenProdPos : 0 < ‖m.den u‖ * ‖m.den v‖ :=
    mul_pos (norm_pos_iff.mpr hdenU) (norm_pos_iff.mpr hdenV)
  rw [m.eval_sub_eval u v hdenU hdenV, norm_div, norm_mul, norm_mul]
  unfold Homography.diskLipschitzBound
  have hmarginSq : 0 < (m.diskPoleMargin d.center d.radius) ^ 2 :=
    sq_pos_of_pos hmargin
  have hbase :
      ‖u - v‖ * ‖m.det‖ /
          (‖m.den u‖ * ‖m.den v‖) ≤
        (‖u - v‖ * ‖m.det‖) /
          (m.diskPoleMargin d.center d.radius) ^ 2 := by
    exact div_le_div₀
      (mul_nonneg (norm_nonneg _) (norm_nonneg _)) le_rfl
      hmarginSq hdenProd
  calc
    ‖u - v‖ * ‖m.det‖ /
        (‖m.den u‖ * ‖m.den v‖) ≤
      (‖u - v‖ * ‖m.det‖) /
        (m.diskPoleMargin d.center d.radius) ^ 2 := hbase
    _ = ‖m.det‖ / (m.diskPoleMargin d.center d.radius) ^ 2 *
        ‖u - v‖ := by ring

/-! ## Certified transport and phase-aware merge -/

/-- A nominal homography together with a uniform Euclidean defect enclosing
an actual block on one input disk. -/
structure InflatedTransport (actual : ℂ → ℂ) (input : DiskFrame) where
  nominal : Homography ℂ
  inflation : ℝ
  inputRadius_nonneg : 0 ≤ input.radius
  inflation_nonneg : 0 ≤ inflation
  delta_pos : 0 < nominal.diskDelta input.center input.radius
  det_ne_zero : nominal.det ≠ 0
  defect : ∀ z ∈ input.carrier,
    ‖actual z - nominal.eval z‖ ≤ inflation

/-- Exact nominal image, enlarged only by the certified block defect. -/
def InflatedTransport.output
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) : DiskFrame :=
  (t.nominal.imageFrame input).inflate t.inflation

theorem InflatedTransport.output_radius_nonneg
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) :
    0 ≤ t.output.radius := by
  unfold InflatedTransport.output
  simp only [DiskFrame.inflate_radius]
  exact add_nonneg
    (t.nominal.diskImageRadius_nonneg input.center input.radius
      t.inputRadius_nonneg t.delta_pos)
    t.inflation_nonneg

theorem InflatedTransport.maps_actual_closedBall
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) :
    MapsTo actual input.carrier t.output.carrier := by
  intro z hz
  have hnom := t.nominal.mapsTo_imageFrame input
    t.inputRadius_nonneg t.delta_pos hz
  have hnomNorm :
      ‖t.nominal.eval z - (t.nominal.imageFrame input).center‖ ≤
        (t.nominal.imageFrame input).radius := by
    simpa [DiskFrame.carrier, mem_closedBall, dist_eq] using hnom
  rw [InflatedTransport.output, DiskFrame.carrier, mem_closedBall, dist_eq]
  simp only [DiskFrame.inflate_center, DiskFrame.inflate_radius]
  calc
    ‖actual z - (t.nominal.imageFrame input).center‖ ≤
        ‖actual z - t.nominal.eval z‖ +
          ‖t.nominal.eval z - (t.nominal.imageFrame input).center‖ := by
      have h := norm_add_le
        (actual z - t.nominal.eval z)
        (t.nominal.eval z - (t.nominal.imageFrame input).center)
      simpa only [sub_add_sub_cancel] using h
    _ ≤ t.inflation + (t.nominal.imageFrame input).radius :=
      add_le_add (t.defect z hz) hnomNorm
    _ = (t.nominal.imageFrame input).radius + t.inflation := by ring

theorem InflatedTransport.maps_nominal_closedBall
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) :
    MapsTo t.nominal.eval input.carrier t.output.carrier := by
  intro z hz
  exact (t.nominal.imageFrame input).mem_carrier_inflate
    t.inflation (t.nominal.eval z) t.inflation_nonneg
    (t.nominal.mapsTo_imageFrame input t.inputRadius_nonneg t.delta_pos hz)

theorem InflatedTransport.maps_nominal_ball
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) :
    MapsTo t.nominal.eval (ball input.center input.radius)
      (ball t.output.center t.output.radius) := by
  intro z hz
  exact (t.nominal.imageFrame input).mem_ball_inflate
    t.inflation (t.nominal.eval z) t.inflation_nonneg
    (t.nominal.mapsTo_ball_imageFrame input t.inputRadius_nonneg
      t.delta_pos t.det_ne_zero hz)

/-- Positivity of the no-pole discriminant survives shrinking an inflated
disk back to its nominal frame. -/
theorem Homography.diskDelta_pos_of_inflate
    (m : Homography ℂ) (d : DiskFrame) (eps : ℝ)
    (hR : 0 ≤ d.radius) (heps : 0 ≤ eps)
    (hDelta : 0 < m.diskDelta (d.inflate eps).center (d.inflate eps).radius) :
    0 < m.diskDelta d.center d.radius := by
  have hInflatedR : 0 ≤ (d.inflate eps).radius := by
    simp [DiskFrame.inflate, add_nonneg hR heps]
  have hmarginInflated :
      0 < m.diskPoleMargin (d.inflate eps).center (d.inflate eps).radius :=
    (m.diskDelta_pos_iff_poleMargin_pos
      (d.inflate eps).center (d.inflate eps).radius hInflatedR).mp hDelta
  apply (m.diskDelta_pos_iff_poleMargin_pos d.center d.radius hR).mpr
  unfold Homography.diskPoleMargin at hmarginInflated ⊢
  simp only [DiskFrame.inflate_center, DiskFrame.inflate_radius] at hmarginInflated
  nlinarith [mul_nonneg (norm_nonneg m.C) heps]

/-- Phase-aware merge.  `outer` is certified on the already inflated output
of `inner`.  The nominal matrix is the exact complex product
`outer.nominal.comp inner.nominal`; the inner inflation is transported by the
outer matrix's determinant/margin Lipschitz constant. -/
def InflatedTransport.merge
    {f g : ℂ → ℂ} {input : DiskFrame}
    (inner : InflatedTransport f input)
    (outer : InflatedTransport g inner.output) :
    InflatedTransport (g ∘ f) input where
  nominal := outer.nominal.comp inner.nominal
  inflation := outer.inflation +
    outer.nominal.diskLipschitzBound inner.output * inner.inflation
  inputRadius_nonneg := inner.inputRadius_nonneg
  inflation_nonneg := add_nonneg outer.inflation_nonneg
    (mul_nonneg (outer.nominal.diskLipschitzBound_nonneg inner.output)
      inner.inflation_nonneg)
  delta_pos := by
    have hInnerImageR : 0 ≤ (inner.nominal.imageFrame input).radius :=
      inner.nominal.diskImageRadius_nonneg input.center input.radius
        inner.inputRadius_nonneg inner.delta_pos
    have hOuterSmall := outer.nominal.diskDelta_pos_of_inflate
      (inner.nominal.imageFrame input) inner.inflation
      hInnerImageR inner.inflation_nonneg outer.delta_pos
    exact outer.nominal.diskDelta_comp_pos inner.nominal input
      inner.inputRadius_nonneg inner.delta_pos hOuterSmall
  det_ne_zero := by
    rw [Homography.det_comp]
    exact mul_ne_zero outer.det_ne_zero inner.det_ne_zero
  defect := by
    intro z hz
    have hInnerActual : f z ∈ inner.output.carrier :=
      inner.maps_actual_closedBall hz
    have hInnerNominal : inner.nominal.eval z ∈ inner.output.carrier :=
      inner.maps_nominal_closedBall hz
    have hOuterDefect := outer.defect (f z) hInnerActual
    have hOuterLip := outer.nominal.norm_eval_sub_eval_le_diskLipschitz
      inner.output (f z) (inner.nominal.eval z)
      inner.output_radius_nonneg outer.delta_pos
      hInnerActual hInnerNominal
    have hTransported :
        ‖outer.nominal.eval (f z) -
            outer.nominal.eval (inner.nominal.eval z)‖ ≤
          outer.nominal.diskLipschitzBound inner.output * inner.inflation := by
      exact hOuterLip.trans
        (mul_le_mul_of_nonneg_left (inner.defect z hz)
          (outer.nominal.diskLipschitzBound_nonneg inner.output))
    have hInnerDen := inner.nominal.den_ne_zero_on_closedBall_of_diskDelta_pos
      input.center input.radius inner.inputRadius_nonneg inner.delta_pos z hz
    rw [outer.nominal.eval_comp inner.nominal z hInnerDen]
    calc
      ‖(g ∘ f) z - outer.nominal.eval (inner.nominal.eval z)‖ ≤
          ‖g (f z) - outer.nominal.eval (f z)‖ +
            ‖outer.nominal.eval (f z) -
              outer.nominal.eval (inner.nominal.eval z)‖ := by
        have h := norm_add_le
          (g (f z) - outer.nominal.eval (f z))
          (outer.nominal.eval (f z) -
            outer.nominal.eval (inner.nominal.eval z))
        simpa [Function.comp_apply] using h
      _ ≤ outer.inflation +
          outer.nominal.diskLipschitzBound inner.output * inner.inflation :=
        add_le_add hOuterDefect hTransported

@[simp] theorem InflatedTransport.merge_nominal
    {f g : ℂ → ℂ} {input : DiskFrame}
    (inner : InflatedTransport f input)
    (outer : InflatedTransport g inner.output) :
    (inner.merge outer).nominal = outer.nominal.comp inner.nominal := rfl

@[simp] theorem InflatedTransport.merge_inflation
    {f g : ℂ → ℂ} {input : DiskFrame}
    (inner : InflatedTransport f input)
    (outer : InflatedTransport g inner.output) :
    (inner.merge outer).inflation = outer.inflation +
      outer.nominal.diskLipschitzBound inner.output * inner.inflation := rfl

/-! ## Total nonlinear certificate on recursive phase-aware frames -/

/-- Conversion of the Euclidean inflation stored in a transport into a
pseudohyperbolic local budget.  The parameter `q` certifies that both points
used by the local comparison stay in the `q`-interior of the output frame. -/
def InflatedTransport.localPseudoBudget
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) (q : ℝ) : ℝ :=
  t.inflation / (t.output.radius * (1 - q ^ 2))

theorem InflatedTransport.localPseudoBudget_nonneg
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) (q : ℝ)
    (hR : 0 < t.output.radius) (hq0 : 0 ≤ q) (hq1 : q < 1) :
    0 ≤ t.localPseudoBudget q := by
  have hqGap : 0 < 1 - q ^ 2 := by nlinarith
  unfold InflatedTransport.localPseudoBudget
  exact div_nonneg t.inflation_nonneg (mul_nonneg hR.le hqGap.le)

/-- Sequence of local budgets associated with a chain of certified
phase-aware transports. -/
def phaseAwareLocalBudget
    (frame : ℕ → DiskFrame) (actual : ℕ → ℂ → ℂ)
    (transport : ∀ j, InflatedTransport (actual j) (frame j))
    (q : ℕ → ℝ) (j : ℕ) : ℝ :=
  (transport j).localPseudoBudget (q (j + 1))

/-- Nonlinear sum of all phase-aware local defects. -/
def phaseAwareBudget
    (frame : ℕ → DiskFrame) (actual : ℕ → ℂ → ℂ)
    (transport : ∀ j, InflatedTransport (actual j) (frame j))
    (q : ℕ → ℝ) : ℕ → ℝ :=
  hyperbolicBudget 0 (phaseAwareLocalBudget frame actual transport q)

/-- End-to-end shadowing theorem for recursively propagated exact image
disks.  `model` follows the stored homographies, while `trueOrbit` follows
the actual maps.  Every local Euclidean inflation is converted inside its
own off-center output disk and accumulated by the exact nonlinear
pseudohyperbolic addition law.

This is the phase-aware replacement for a scalar envelope: all rotations and
cancellations used to construct `frame (j+1) = transport[j].output` remain in
the complex homography entries. -/
theorem phaseAware_hyperbolic_shadowing_bound
    (frame : ℕ → DiskFrame) (actual : ℕ → ℂ → ℂ)
    (transport : ∀ j, InflatedTransport (actual j) (frame j))
    (trueOrbit model : ℕ → ℂ) (q : ℕ → ℝ) (N : ℕ)
    (hR : ∀ j, j ≤ N → 0 < (frame j).radius)
    (hq0 : ∀ j, j ≤ N → 0 ≤ q j)
    (hq1 : ∀ j, j ≤ N → q j < 1)
    (hnext : ∀ j, j < N → frame (j + 1) = (transport j).output)
    (htrueStep : ∀ j, j < N →
      trueOrbit (j + 1) = actual j (trueOrbit j))
    (hmodelStep : ∀ j, j < N →
      model (j + 1) = (transport j).nominal.eval (model j))
    (hstart : trueOrbit 0 = model 0)
    (htrueInterior : ∀ j, j ≤ N →
      ‖trueOrbit j - (frame j).center‖ ≤ q j * (frame j).radius)
    (hmodelInterior : ∀ j, j ≤ N →
      ‖model j - (frame j).center‖ ≤ q j * (frame j).radius)
    (hnominalAtTrueInterior : ∀ j, j < N →
      ‖(transport j).nominal.eval (trueOrbit j) -
          (frame (j + 1)).center‖ ≤
        q (j + 1) * (frame (j + 1)).radius)
    (hlocalBudget : ∀ j, j < N →
      phaseAwareLocalBudget frame actual transport q j < 1) :
    ‖trueOrbit N - model N‖ ≤
      (frame N).radius * (1 + q N ^ 2) *
        phaseAwareBudget frame actual transport q N := by
  have hmemOfInterior : ∀ (j : ℕ) (z : ℂ), j ≤ N →
      ‖z - (frame j).center‖ ≤ q j * (frame j).radius →
      z ∈ ball (frame j).center (frame j).radius := by
    intro j z hjN hz
    rw [mem_ball, dist_eq]
    have hqR : q j * (frame j).radius < (frame j).radius := by
      nlinarith [hR j hjN, hq1 j hjN]
    exact hz.trans_lt hqR
  have htrueMem : ∀ j, j ≤ N →
      trueOrbit j ∈ ball (frame j).center (frame j).radius := by
    intro j hj
    exact hmemOfInterior j (trueOrbit j) hj (htrueInterior j hj)
  have hmodelMem : ∀ j, j ≤ N →
      model j ∈ ball (frame j).center (frame j).radius := by
    intro j hj
    exact hmemOfInterior j (model j) hj (hmodelInterior j hj)
  have hmaps : ∀ j, j < N → MapsTo (transport j).nominal.eval
      (ball (frame j).center (frame j).radius)
      (ball (frame (j + 1)).center (frame (j + 1)).radius) := by
    intro j hj
    rw [hnext j hj]
    exact (transport j).maps_nominal_ball
  have hdiff : ∀ j, j < N → DifferentiableOn ℂ
      (transport j).nominal.eval
      (ball (frame j).center (frame j).radius) := by
    intro j hj z hz
    have hzClosed : z ∈ (frame j).carrier := by
      exact ball_subset_closedBall hz
    have hden := (transport j).nominal.den_ne_zero_on_closedBall_of_diskDelta_pos
      (frame j).center (frame j).radius
      (transport j).inputRadius_nonneg (transport j).delta_pos z hzClosed
    exact ((transport j).nominal.hasDerivAt_eval z hden).differentiableAt
      |>.differentiableWithinAt
  have hdefect : ∀ j, j < N →
      (frame (j + 1)).pseudoDist
        (trueOrbit (j + 1)) ((transport j).nominal.eval (trueOrbit j)) ≤
      phaseAwareLocalBudget frame actual transport q j := by
    intro j hj
    have htrueClosed : trueOrbit j ∈ (frame j).carrier :=
      ball_subset_closedBall (htrueMem j hj.le)
    have hEuclidean := (transport j).defect (trueOrbit j) htrueClosed
    rw [← htrueStep j hj] at hEuclidean
    unfold phaseAwareLocalBudget InflatedTransport.localPseudoBudget
    rw [← hnext j hj]
    apply (frame (j + 1)).pseudoDist_le_of_interior
      (trueOrbit (j + 1)) ((transport j).nominal.eval (trueOrbit j))
      (q (j + 1)) (transport j).inflation
      (hR (j + 1) (by omega)) (hq0 (j + 1) (by omega))
      (hq1 (j + 1) (by omega))
      (htrueInterior (j + 1) (by omega))
      (hnominalAtTrueInterior j hj)
    exact hEuclidean
  have hlocal0 : ∀ j, j < N →
      0 ≤ phaseAwareLocalBudget frame actual transport q j := by
    intro j hj
    unfold phaseAwareLocalBudget
    apply (transport j).localPseudoBudget_nonneg (q (j + 1))
    · rw [← hnext j hj]
      exact hR (j + 1) (by omega)
    · exact hq0 (j + 1) (by omega)
    · exact hq1 (j + 1) (by omega)
  have htotal0 : ∀ j, j ≤ N →
      0 ≤ phaseAwareBudget frame actual transport q j := by
    intro j hjN
    induction j with
    | zero => simp [phaseAwareBudget]
    | succ j ih =>
        have hjN' : j < N := by omega
        exact pseudoAdd_nonneg (hlocal0 j hjN') (ih hjN'.le)
  have htotal1 : ∀ j, j ≤ N →
      phaseAwareBudget frame actual transport q j < 1 := by
    intro j hjN
    induction j with
    | zero => simp [phaseAwareBudget]
    | succ j ih =>
        have hjN' : j < N := by omega
        exact pseudoAdd_lt_one (hlocal0 j hjN') (hlocalBudget j hjN')
          (htotal0 j hjN'.le) (ih hjN'.le)
  have hpseudo := DiskFrame.moving_pseudoDist_telescope_fin
    frame (fun j => (transport j).nominal.eval) model trueOrbit
    (phaseAwareLocalBudget frame actual transport q) 0 N
    hR hmodelStep hmodelMem htrueMem hdiff hmaps hdefect
    hlocalBudget htotal1 (by simp [hstart])
  exact (frame N).norm_sub_le_hyperbolicBudget
    (trueOrbit N) (model N) (q N)
    (phaseAwareBudget frame actual transport q N)
    (hR N le_rfl) (hq0 N le_rfl) (hq1 N le_rfl)
    (htrueInterior N le_rfl) (hmodelInterior N le_rfl) hpseudo

/-! ## Gauge invariance -/

/-- Changing the anchor of the disk-to-unit-disk gauge changes complex
coordinates, but not the pseudohyperbolic distance. -/
theorem DiskFrame.pseudoDist_movingGauge_independent
    (d : DiskFrame) (anchor₁ anchor₂ z w : ℂ)
    (hR : 0 < d.radius)
    (ha₁ : anchor₁ ∈ ball d.center d.radius)
    (ha₂ : anchor₂ ∈ ball d.center d.radius)
    (hz : z ∈ ball d.center d.radius)
    (hw : w ∈ ball d.center d.radius) :
    DiskFrame.unitDisk.pseudoDist
        ((d.toUnitHomography anchor₁).eval z)
        ((d.toUnitHomography anchor₁).eval w) =
      DiskFrame.unitDisk.pseudoDist
        ((d.toUnitHomography anchor₂).eval z)
        ((d.toUnitHomography anchor₂).eval w) := by
  calc
    DiskFrame.unitDisk.pseudoDist
        ((d.toUnitHomography anchor₁).eval z)
        ((d.toUnitHomography anchor₁).eval w) =
      d.pseudoDist z w :=
        d.pseudoDist_toUnit_isometry anchor₁ z w hR ha₁ hz hw
    _ = DiskFrame.unitDisk.pseudoDist
        ((d.toUnitHomography anchor₂).eval z)
        ((d.toUnitHomography anchor₂).eval w) :=
      (d.pseudoDist_toUnit_isometry anchor₂ z w hR ha₂ hz hw).symm

/-- Pointwise version for arbitrary moving frames and arbitrary gauges at
every depth.  Thus the local defects and the endpoint discrepancy used by
the nonlinear telescope are independent of the chosen `S_j`. -/
theorem DiskFrame.movingGauge_pseudoDist_invariant
    (frame : ℕ → DiskFrame) (anchor₁ anchor₂ z w : ℕ → ℂ)
    (N : ℕ)
    (hR : ∀ j, j ≤ N → 0 < (frame j).radius)
    (ha₁ : ∀ j, j ≤ N →
      anchor₁ j ∈ ball (frame j).center (frame j).radius)
    (ha₂ : ∀ j, j ≤ N →
      anchor₂ j ∈ ball (frame j).center (frame j).radius)
    (hz : ∀ j, j ≤ N →
      z j ∈ ball (frame j).center (frame j).radius)
    (hw : ∀ j, j ≤ N →
      w j ∈ ball (frame j).center (frame j).radius) :
    ∀ j, j ≤ N →
      DiskFrame.unitDisk.pseudoDist
          (((frame j).toUnitHomography (anchor₁ j)).eval (z j))
          (((frame j).toUnitHomography (anchor₁ j)).eval (w j)) =
        DiskFrame.unitDisk.pseudoDist
          (((frame j).toUnitHomography (anchor₂ j)).eval (z j))
          (((frame j).toUnitHomography (anchor₂ j)).eval (w j)) := by
  intro j hj
  exact (frame j).pseudoDist_movingGauge_independent
    (anchor₁ j) (anchor₂ j) (z j) (w j)
    (hR j hj) (ha₁ j hj) (ha₂ j hj) (hz j hj) (hw j hj)

/-- The determinant/margin Lipschitz constant is projectively invariant.
This justifies exact power-of-two normalization of stored complex matrices
between merges. -/
theorem Homography.diskLipschitzBound_scale
    (s : ℂ) (m : Homography ℂ) (d : DiskFrame) (hs : s ≠ 0) :
    (Homography.scale s m).diskLipschitzBound d =
      m.diskLipschitzBound d := by
  have hsNorm : ‖s‖ ≠ 0 := norm_ne_zero_iff.mpr hs
  unfold Homography.diskLipschitzBound
  rw [Homography.det_scale, Homography.diskPoleMargin_scale]
  simp only [norm_mul, norm_pow]
  field_simp

/-- Projective normalization also leaves the exact image radius unchanged. -/
theorem Homography.diskImageRadius_scale
    (s : ℂ) (m : Homography ℂ) (center : ℂ) (R : ℝ) (hs : s ≠ 0) :
    (Homography.scale s m).diskImageRadius center R =
      m.diskImageRadius center R := by
  have hsNorm : ‖s‖ ≠ 0 := norm_ne_zero_iff.mpr hs
  unfold Homography.diskImageRadius
  rw [Homography.det_scale, Homography.diskDelta_scale]
  simp only [norm_mul, norm_pow]
  field_simp

/-- Projective normalization leaves the exact image center unchanged. -/
theorem Homography.diskImageCenter_scale
    (s : ℂ) (m : Homography ℂ) (center : ℂ) (R : ℝ) (hs : s ≠ 0) :
    (Homography.scale s m).diskImageCenter center R =
      m.diskImageCenter center R := by
  have hsNormSq : ((‖s‖ ^ 2 : ℝ) : ℂ) = s * (starRingEnd ℂ) s := by
    rw [Complex.mul_conj', ofReal_pow]
  have hsConj : (starRingEnd ℂ) s ≠ 0 := by
    exact (map_ne_zero (starRingEnd ℂ)).mpr hs
  unfold Homography.diskImageCenter
  rw [Homography.num_scale, Homography.den_scale,
    Homography.diskDelta_scale]
  simp only [Homography.scale, map_mul]
  rw [ofReal_mul, hsNormSq]
  field_simp [hs, hsConj]

/-- Hence a nonzero scalar normalization leaves the whole exact image frame
unchanged, not merely the represented point map. -/
theorem Homography.imageFrame_scale
    (s : ℂ) (m : Homography ℂ) (d : DiskFrame) (hs : s ≠ 0) :
    (Homography.scale s m).imageFrame d = m.imageFrame d := by
  unfold Homography.imageFrame
  rw [m.diskImageCenter_scale s d.center d.radius hs,
    m.diskImageRadius_scale s d.center d.radius hs]

/-- Normalize every entry of a certified transport by the same nonzero
complex scalar. -/
def InflatedTransport.projectiveScale
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) (s : ℂ) (hs : s ≠ 0) :
    InflatedTransport actual input where
  nominal := Homography.scale s t.nominal
  inflation := t.inflation
  inputRadius_nonneg := t.inputRadius_nonneg
  inflation_nonneg := t.inflation_nonneg
  delta_pos :=
    ((t.nominal.diskDelta_scale_pos_iff s input.center input.radius hs).mpr
      t.delta_pos)
  det_ne_zero := by
    rw [Homography.det_scale]
    exact mul_ne_zero (pow_ne_zero 2 hs) t.det_ne_zero
  defect := by
    intro z hz
    rw [Homography.eval_scale s t.nominal z hs]
    exact t.defect z hz

/-- Projective normalization is invisible to the recursively propagated
output frame. -/
@[simp] theorem InflatedTransport.projectiveScale_output
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) (s : ℂ) (hs : s ≠ 0) :
    (t.projectiveScale s hs).output = t.output := by
  unfold InflatedTransport.output InflatedTransport.projectiveScale
  rw [t.nominal.imageFrame_scale s input hs]

/-- Consequently the local nonlinear defect budget is also exactly
projectively invariant. -/
@[simp] theorem InflatedTransport.projectiveScale_localPseudoBudget
    {actual : ℂ → ℂ} {input : DiskFrame}
    (t : InflatedTransport actual input) (s : ℂ) (hs : s ≠ 0) (q : ℝ) :
    (t.projectiveScale s hs).localPseudoBudget q =
      t.localPseudoBudget q := by
  unfold InflatedTransport.localPseudoBudget
  rw [t.projectiveScale_output s hs]
  rfl

end

end Mandelbrot
