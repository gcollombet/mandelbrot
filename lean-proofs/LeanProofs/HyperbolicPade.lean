/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.SchwarzPick
import LeanProofs.CauchyDerivatives
import LeanProofs.MatrixC1Deriv
import Mathlib.Analysis.SpecialFunctions.Artanh
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Nonlinear hyperbolic Padé shadowing

Schwarz--Pick makes the exact Mandelbrot steps nonexpansive between certified
moving disks.  The remaining geometric ingredient is the strong triangle law
for the pseudohyperbolic distance:

`rho(x,z) <= (rho(x,y) + rho(y,z)) / (1 + rho(x,y) * rho(y,z))`.

Consequently local Padé defects accumulate with the nonlinear addition
`u ⊕ v = (u+v)/(1+uv)`, rather than through products of Euclidean
derivative majorants.  The last section converts the resulting uniform value
certificate into a derivative certificate by one Cauchy estimate at the end
of the whole block.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set

/-! ## Strong triangle law -/

/-- The unit Euclidean disk, used only as a normalization frame. -/
def DiskFrame.unitDisk : DiskFrame where
  center := 0
  radius := 1

/-- Hyperbolic addition in pseudohyperbolic coordinates. -/
def pseudoAdd (u v : ℝ) : ℝ :=
  (u + v) / (1 + u * v)

theorem pseudoAdd_nonneg {u v : ℝ} (hu : 0 ≤ u) (hv : 0 ≤ v) :
    0 ≤ pseudoAdd u v := by
  unfold pseudoAdd
  positivity

theorem pseudoAdd_lt_one
    {u v : ℝ} (hu0 : 0 ≤ u) (hu1 : u < 1)
    (hv0 : 0 ≤ v) (hv1 : v < 1) :
    pseudoAdd u v < 1 := by
  have hden : 0 < 1 + u * v := by positivity
  unfold pseudoAdd
  rw [div_lt_one hden]
  have hprod : 0 < (1 - u) * (1 - v) :=
    mul_pos (sub_pos.mpr hu1) (sub_pos.mpr hv1)
  nlinarith

/-- Hyperbolic addition becomes ordinary addition after applying `artanh`. -/
theorem artanh_pseudoAdd
    {u v : ℝ} (hu0 : 0 ≤ u) (hu1 : u < 1)
    (hv0 : 0 ≤ v) (hv1 : v < 1) :
    Real.artanh (pseudoAdd u v) = Real.artanh u + Real.artanh v := by
  have hden : 0 < 1 + u * v := by positivity
  have hsum0 := pseudoAdd_nonneg hu0 hv0
  have hsum1 := pseudoAdd_lt_one hu0 hu1 hv0 hv1
  have huDen : 0 < 1 - u := sub_pos.mpr hu1
  have hvDen : 0 < 1 - v := sub_pos.mpr hv1
  have hplus :
      1 + pseudoAdd u v = ((1 + u) * (1 + v)) / (1 + u * v) := by
    unfold pseudoAdd
    field_simp [hden.ne']
    ring
  have hminus :
      1 - pseudoAdd u v = ((1 - u) * (1 - v)) / (1 + u * v) := by
    unfold pseudoAdd
    field_simp [hden.ne']
    ring
  have hratio :
      (1 + pseudoAdd u v) / (1 - pseudoAdd u v) =
        ((1 + u) / (1 - u)) * ((1 + v) / (1 - v)) := by
    rw [hplus, hminus]
    field_simp [hden.ne', huDen.ne', hvDen.ne']
  rw [Real.artanh_eq_half_log (x := pseudoAdd u v) (by constructor <;> linarith),
    Real.artanh_eq_half_log (x := u) (by constructor <;> linarith),
    Real.artanh_eq_half_log (x := v) (by constructor <;> linarith),
    hratio]
  rw [Real.log_mul]
  · ring
  · positivity
  · positivity

theorem DiskFrame.pseudoDist_comm (d : DiskFrame) (z w : ℂ) :
    d.pseudoDist z w = d.pseudoDist w z := by
  let den : ℂ :=
    ((d.radius ^ 2 : ℝ) : ℂ) -
      (starRingEnd ℂ) (w - d.center) * (z - d.center)
  have hden :
      ((d.radius ^ 2 : ℝ) : ℂ) -
          (starRingEnd ℂ) (z - d.center) * (w - d.center) =
        (starRingEnd ℂ) den := by
    dsimp only [den]
    simp
    ring
  unfold DiskFrame.pseudoDist
  rw [hden, norm_div, norm_div, Complex.norm_conj]
  have hnum :
      ‖(d.radius : ℂ) * (z - w)‖ =
        ‖(d.radius : ℂ) * (w - z)‖ := by
    rw [← norm_neg]
    congr 1
    ring
  exact congrArg (fun x : ℝ => x / ‖den‖) hnum

/-- The pseudohyperbolic distance of two interior points is strictly below
one. -/
theorem DiskFrame.pseudoDist_lt_one
    (d : DiskFrame) (z w : ℂ) (hR : 0 < d.radius)
    (hz : z ∈ ball d.center d.radius)
    (hw : w ∈ ball d.center d.radius) :
    d.pseudoDist z w < 1 := by
  rw [← d.norm_toUnitHomography_eval w z]
  exact d.norm_toUnitHomography_eval_lt_one w z hR hw hz

/-- A disk automorphism is an isometry for `pseudoDist`.  This is obtained by
applying Schwarz--Pick once to the normalizing homography and once to its
projective inverse. -/
theorem DiskFrame.pseudoDist_toUnit_isometry
    (d : DiskFrame) (anchor z w : ℂ) (hR : 0 < d.radius)
    (hanchor : anchor ∈ ball d.center d.radius)
    (hz : z ∈ ball d.center d.radius)
    (hw : w ∈ ball d.center d.radius) :
    DiskFrame.unitDisk.pseudoDist
        ((d.toUnitHomography anchor).eval z)
        ((d.toUnitHomography anchor).eval w) =
      d.pseudoDist z w := by
  let m := d.toUnitHomography anchor
  let ξ := m.eval z
  let ζ := m.eval w
  have hmDet : m.det ≠ 0 :=
    d.toUnitHomography_det_ne_zero anchor hR hanchor
  have hmDenZ : m.den z ≠ 0 :=
    d.toUnitHomography_den_ne_zero anchor z hR hanchor hz
  have hmDenW : m.den w ≠ 0 :=
    d.toUnitHomography_den_ne_zero anchor w hR hanchor hw
  have hξ : ξ ∈ ball (0 : ℂ) 1 := by
    have h := d.norm_toUnitHomography_eval_lt_one anchor z hR hanchor hz
    simpa [ξ, m, mem_ball, dist_eq] using h
  have hζ : ζ ∈ ball (0 : ℂ) 1 := by
    have h := d.norm_toUnitHomography_eval_lt_one anchor w hR hanchor hw
    simpa [ζ, m, mem_ball, dist_eq] using h
  apply le_antisymm
  · exact d.schwarzPick DiskFrame.unitDisk m.eval z w hR (by simp [DiskFrame.unitDisk])
      (by
        intro x hx
        have hden := d.toUnitHomography_den_ne_zero anchor x hR hanchor hx
        exact (m.hasDerivAt_eval x hden).differentiableAt.differentiableWithinAt)
      (by
        intro x hx
        have hnorm := d.norm_toUnitHomography_eval_lt_one anchor x hR hanchor hx
        simpa [DiskFrame.unitDisk, mem_ball, dist_eq] using hnorm)
      hz hw
  · have hback := DiskFrame.unitDisk.schwarzPick d m.adjugate.eval ξ ζ
        (by simp [DiskFrame.unitDisk]) hR
        (by
          intro x hx
          have hden := d.toUnitHomography_adjugate_den_ne_zero
            anchor x hR hanchor (by simpa [DiskFrame.unitDisk] using hx)
          exact (m.adjugate.hasDerivAt_eval x hden).differentiableAt.differentiableWithinAt)
        (by
          intro x hx
          exact d.adjugate_toUnit_maps_unitBall anchor x hR hanchor
            (by simpa [DiskFrame.unitDisk] using hx))
        hξ hζ
    have hInvZ : m.adjugate.eval ξ = z := by
      exact m.eval_adjugate_comp z hmDet hmDenZ
    have hInvW : m.adjugate.eval ζ = w := by
      exact m.eval_adjugate_comp w hmDet hmDenW
    simpa [ξ, ζ, m, hInvZ, hInvW] using hback

/-- Algebraic strong triangle estimate when the middle point is the center
of the unit disk. -/
theorem DiskFrame.unit_pseudoDist_le_pseudoAdd_norm
    (z w : ℂ) (hz : ‖z‖ < 1) (hw : ‖w‖ < 1) :
    DiskFrame.unitDisk.pseudoDist z w ≤ pseudoAdd ‖z‖ ‖w‖ := by
  let den : ℂ := 1 - (starRingEnd ℂ) w * z
  let t : ℝ := (z * (starRingEnd ℂ) w).re
  have hp : 0 ≤ ‖z‖ := norm_nonneg z
  have hq : 0 ≤ ‖w‖ := norm_nonneg w
  have hprod : ‖(starRingEnd ℂ) w * z‖ < 1 := by
    rw [norm_mul, Complex.norm_conj]
    exact mul_lt_one_of_nonneg_of_lt_one_left hq hw hz.le
  have hden : den ≠ 0 := by
    intro hzero
    have heq : (1 : ℂ) = (starRingEnd ℂ) w * z := by
      dsimp only [den] at hzero
      exact sub_eq_zero.mp hzero
    have hnorm := congrArg norm heq
    simp only [norm_one] at hnorm
    linarith
  have hdenPos : 0 < ‖den‖ := norm_pos_iff.mpr hden
  have hsumPos : 0 < 1 + ‖z‖ * ‖w‖ := by positivity
  have htAbs := Complex.abs_re_le_norm (z * (starRingEnd ℂ) w)
  have ht : -(‖z‖ * ‖w‖) ≤ t := by
    rw [norm_mul, Complex.norm_conj] at htAbs
    exact (abs_le.mp htAbs).1
  have hnumSq :
      ‖z - w‖ ^ 2 = ‖z‖ ^ 2 + ‖w‖ ^ 2 - 2 * t := by
    rw [Complex.sq_norm, Complex.normSq_sub]
    simp only [Complex.normSq_eq_norm_sq]
    rfl
  have hdenSq :
      ‖den‖ ^ 2 =
        1 + ‖z‖ ^ 2 * ‖w‖ ^ 2 - 2 * t := by
    dsimp only [den]
    rw [Complex.sq_norm, Complex.normSq_sub]
    simp only [Complex.normSq_eq_norm_sq, norm_one, one_pow]
    simp
    dsimp only [t]
    simp only [Complex.mul_re, Complex.conj_re, Complex.conj_im]
    ring
  have hzFactor : 0 ≤ 1 - ‖z‖ ^ 2 := by nlinarith
  have hwFactor : 0 ≤ 1 - ‖w‖ ^ 2 := by nlinarith
  have htFactor : 0 ≤ ‖z‖ * ‖w‖ + t := by linarith
  have hfactor :
      0 ≤ 2 * (1 - ‖z‖ ^ 2) * (1 - ‖w‖ ^ 2) *
        (‖z‖ * ‖w‖ + t) := by positivity
  have hsq :
      (‖z - w‖ * (1 + ‖z‖ * ‖w‖)) ^ 2 ≤
        ((‖z‖ + ‖w‖) * ‖den‖) ^ 2 := by
    rw [mul_pow, mul_pow, hnumSq, hdenSq]
    nlinarith
  have hlinear :
      ‖z - w‖ * (1 + ‖z‖ * ‖w‖) ≤
        (‖z‖ + ‖w‖) * ‖den‖ := by
    have hleft : 0 ≤ ‖z - w‖ * (1 + ‖z‖ * ‖w‖) := by positivity
    have hright : 0 ≤ (‖z‖ + ‖w‖) * ‖den‖ := by positivity
    nlinarith
  unfold pseudoAdd
  simp only [DiskFrame.pseudoDist, DiskFrame.unitDisk, one_mul, sub_zero,
    one_pow, Complex.ofReal_one]
  change ‖(z - w) / den‖ ≤ (‖z‖ + ‖w‖) / (1 + ‖z‖ * ‖w‖)
  rw [norm_div]
  exact (div_le_div_iff₀ hdenPos hsumPos).mpr hlinear

/-- Strong triangle law in an arbitrary Euclidean disk. -/
theorem DiskFrame.pseudoDist_strong_triangle
    (d : DiskFrame) (x y z : ℂ) (hR : 0 < d.radius)
    (hx : x ∈ ball d.center d.radius)
    (hy : y ∈ ball d.center d.radius)
    (hz : z ∈ ball d.center d.radius) :
    d.pseudoDist x z ≤ pseudoAdd (d.pseudoDist x y) (d.pseudoDist y z) := by
  let m := d.toUnitHomography y
  let ξ := m.eval x
  let ζ := m.eval z
  have hξ : ‖ξ‖ < 1 := d.norm_toUnitHomography_eval_lt_one y x hR hy hx
  have hζ : ‖ζ‖ < 1 := d.norm_toUnitHomography_eval_lt_one y z hR hy hz
  have hiso := d.pseudoDist_toUnit_isometry y x z hR hy hx hz
  have hcenterξ : ‖ξ‖ = d.pseudoDist x y := by
    exact d.norm_toUnitHomography_eval y x
  have hcenterζ : ‖ζ‖ = d.pseudoDist y z := by
    rw [d.pseudoDist_comm y z]
    exact d.norm_toUnitHomography_eval y z
  calc
    d.pseudoDist x z = DiskFrame.unitDisk.pseudoDist ξ ζ := hiso.symm
    _ ≤ pseudoAdd ‖ξ‖ ‖ζ‖ :=
      DiskFrame.unit_pseudoDist_le_pseudoAdd_norm ξ ζ hξ hζ
    _ = pseudoAdd (d.pseudoDist x y) (d.pseudoDist y z) := by
      rw [hcenterξ, hcenterζ]

/-! ## Monotonicity and nonlinear telescope -/

theorem pseudoAdd_mono_left
    {u U v : ℝ} (hu0 : 0 ≤ u) (hu : u ≤ U)
    (hv0 : 0 ≤ v) (hv1 : v < 1) :
    pseudoAdd u v ≤ pseudoAdd U v := by
  have hU0 : 0 ≤ U := hu0.trans hu
  have hdenLeft : 0 < 1 + u * v := by positivity
  have hdenRight : 0 < 1 + U * v := by positivity
  unfold pseudoAdd
  apply (div_le_div_iff₀ hdenLeft hdenRight).mpr
  have hgap : 0 ≤ (U - u) * (1 - v ^ 2) := by
    exact mul_nonneg (sub_nonneg.mpr hu) (by nlinarith)
  nlinarith

theorem pseudoAdd_mono_right
    {u v V : ℝ} (hu0 : 0 ≤ u) (hu1 : u < 1)
    (hv0 : 0 ≤ v) (hv : v ≤ V) :
    pseudoAdd u v ≤ pseudoAdd u V := by
  have hV0 : 0 ≤ V := hv0.trans hv
  have hdenLeft : 0 < 1 + u * v := by positivity
  have hdenRight : 0 < 1 + u * V := by positivity
  unfold pseudoAdd
  apply (div_le_div_iff₀ hdenLeft hdenRight).mpr
  have hgap : 0 ≤ (V - v) * (1 - u ^ 2) := by
    exact mul_nonneg (sub_nonneg.mpr hv) (by nlinarith)
  nlinarith

theorem pseudoAdd_mono
    {u U v V : ℝ}
    (hu0 : 0 ≤ u) (hu : u ≤ U) (hU1 : U < 1)
    (hv0 : 0 ≤ v) (hv : v ≤ V) (hV1 : V < 1) :
    pseudoAdd u v ≤ pseudoAdd U V := by
  calc
    pseudoAdd u v ≤ pseudoAdd U v :=
      pseudoAdd_mono_left hu0 hu hv0 (hv.trans_lt hV1)
    _ ≤ pseudoAdd U V :=
      pseudoAdd_mono_right (hu0.trans hu) hU1 hv0 hv

/-- Runtime budget obtained by folding local pseudohyperbolic defects with
the exact nonlinear addition law. -/
def hyperbolicBudget (initial : ℝ) (eps : ℕ → ℝ) : ℕ → ℝ
  | 0 => initial
  | n + 1 => pseudoAdd (eps n) (hyperbolicBudget initial eps n)

@[simp] theorem hyperbolicBudget_zero (initial : ℝ) (eps : ℕ → ℝ) :
    hyperbolicBudget initial eps 0 = initial := rfl

@[simp] theorem hyperbolicBudget_succ
    (initial : ℝ) (eps : ℕ → ℝ) (n : ℕ) :
    hyperbolicBudget initial eps (n + 1) =
      pseudoAdd (eps n) (hyperbolicBudget initial eps n) := rfl

theorem hyperbolicBudget_nonneg
    (initial : ℝ) (eps : ℕ → ℝ)
    (hinitial : 0 ≤ initial) (heps : ∀ n, 0 ≤ eps n) :
    ∀ n, 0 ≤ hyperbolicBudget initial eps n := by
  intro n
  induction n with
  | zero => exact hinitial
  | succ n ih => exact pseudoAdd_nonneg (heps n) ih

theorem hyperbolicBudget_lt_one
    (initial : ℝ) (eps : ℕ → ℝ)
    (hinitial0 : 0 ≤ initial) (hinitial1 : initial < 1)
    (heps0 : ∀ n, 0 ≤ eps n) (heps1 : ∀ n, eps n < 1) :
    ∀ n, hyperbolicBudget initial eps n < 1 := by
  intro n
  induction n with
  | zero => exact hinitial1
  | succ n ih =>
      exact pseudoAdd_lt_one (heps0 n) (heps1 n)
        (hyperbolicBudget_nonneg initial eps hinitial0 heps0 n) ih

/-- Closed additive form of the nonlinear budget in hyperbolic distance. -/
theorem artanh_hyperbolicBudget
    (initial : ℝ) (eps : ℕ → ℝ)
    (hinitial0 : 0 ≤ initial) (hinitial1 : initial < 1)
    (heps0 : ∀ n, 0 ≤ eps n) (heps1 : ∀ n, eps n < 1) :
    ∀ n, Real.artanh (hyperbolicBudget initial eps n) =
      Real.artanh initial + ∑ j ∈ Finset.range n, Real.artanh (eps j) := by
  intro n
  induction n with
  | zero => simp
  | succ n ih =>
      rw [hyperbolicBudget_succ,
        artanh_pseudoAdd (heps0 n) (heps1 n)
          (hyperbolicBudget_nonneg initial eps hinitial0 heps0 n)
          (hyperbolicBudget_lt_one initial eps hinitial0 hinitial1 heps0 heps1 n),
        ih, Finset.sum_range_succ]
      ring

/-- Equivalent `tanh(sum artanh)` formula used by the runtime design note. -/
theorem hyperbolicBudget_eq_tanh_sum_artanh
    (initial : ℝ) (eps : ℕ → ℝ)
    (hinitial0 : 0 ≤ initial) (hinitial1 : initial < 1)
    (heps0 : ∀ n, 0 ≤ eps n) (heps1 : ∀ n, eps n < 1) :
    ∀ n, hyperbolicBudget initial eps n =
      Real.tanh
        (Real.artanh initial + ∑ j ∈ Finset.range n, Real.artanh (eps j)) := by
  intro n
  rw [← artanh_hyperbolicBudget initial eps
    hinitial0 hinitial1 heps0 heps1 n]
  symm
  exact Real.tanh_artanh ⟨by
    have hnonneg := hyperbolicBudget_nonneg initial eps hinitial0 heps0 n
    linarith, hyperbolicBudget_lt_one initial eps
      hinitial0 hinitial1 heps0 heps1 n⟩

/-- Nonlinear moving-disk telescope.  The explicit `< 1` guards are exactly
the runtime admissibility conditions for pseudohyperbolic budgets. -/
theorem DiskFrame.moving_pseudoDist_telescope
    (frame : ℕ → DiskFrame) (step : ℕ → ℂ → ℂ)
    (exact approx : ℕ → ℂ) (eps : ℕ → ℝ)
    (initial : ℝ)
    (hR : ∀ n, 0 < (frame n).radius)
    (hexact : ∀ n, exact (n + 1) = step n (exact n))
    (hexactMem : ∀ n, exact n ∈ ball (frame n).center (frame n).radius)
    (happroxMem : ∀ n, approx n ∈ ball (frame n).center (frame n).radius)
    (hdiff : ∀ n, DifferentiableOn ℂ (step n)
      (ball (frame n).center (frame n).radius))
    (hmaps : ∀ n, MapsTo (step n)
      (ball (frame n).center (frame n).radius)
      (ball (frame (n + 1)).center (frame (n + 1)).radius))
    (hdefect : ∀ n,
      (frame (n + 1)).pseudoDist (approx (n + 1)) (step n (approx n)) ≤ eps n)
    (heps1 : ∀ n, eps n < 1)
    (hbudget1 : ∀ n, hyperbolicBudget initial eps n < 1)
    (hinitial : (frame 0).pseudoDist (approx 0) (exact 0) ≤ initial) :
    ∀ n, (frame n).pseudoDist (approx n) (exact n) ≤
      hyperbolicBudget initial eps n := by
  intro n
  induction n with
  | zero => simpa using hinitial
  | succ n ih =>
      rw [hexact n]
      have htri := (frame (n + 1)).pseudoDist_strong_triangle
        (approx (n + 1)) (step n (approx n)) (step n (exact n))
        (hR (n + 1)) (happroxMem (n + 1))
        (hmaps n (happroxMem n)) (hmaps n (hexactMem n))
      have hnonexp := (frame n).schwarzPick (frame (n + 1)) (step n)
        (approx n) (exact n) (hR n) (hR (n + 1))
        (hdiff n) (hmaps n) (happroxMem n) (hexactMem n)
      calc
        (frame (n + 1)).pseudoDist (approx (n + 1)) (step n (exact n)) ≤
            pseudoAdd
              ((frame (n + 1)).pseudoDist (approx (n + 1)) (step n (approx n)))
              ((frame (n + 1)).pseudoDist (step n (approx n)) (step n (exact n))) := htri
        _ ≤ pseudoAdd (eps n) (hyperbolicBudget initial eps n) := by
          apply pseudoAdd_mono
          · exact (frame (n + 1)).pseudoDist_nonneg _ _
          · exact hdefect n
          · exact heps1 n
          · exact (frame (n + 1)).pseudoDist_nonneg _ _
          · exact hnonexp.trans ih
          · exact hbudget1 n
        _ = hyperbolicBudget initial eps (n + 1) := rfl

/-- Finite-block form of the nonlinear telescope.  Unlike the stream form
above, every hypothesis is required only up to the emitted block length. -/
theorem DiskFrame.moving_pseudoDist_telescope_fin
    (frame : ℕ → DiskFrame) (step : ℕ → ℂ → ℂ)
    (exact approx : ℕ → ℂ) (eps : ℕ → ℝ)
    (initial : ℝ) (N : ℕ)
    (hR : ∀ j, j ≤ N → 0 < (frame j).radius)
    (hexact : ∀ j, j < N → exact (j + 1) = step j (exact j))
    (hexactMem : ∀ j, j ≤ N →
      exact j ∈ ball (frame j).center (frame j).radius)
    (happroxMem : ∀ j, j ≤ N →
      approx j ∈ ball (frame j).center (frame j).radius)
    (hdiff : ∀ j, j < N → DifferentiableOn ℂ (step j)
      (ball (frame j).center (frame j).radius))
    (hmaps : ∀ j, j < N → MapsTo (step j)
      (ball (frame j).center (frame j).radius)
      (ball (frame (j + 1)).center (frame (j + 1)).radius))
    (hdefect : ∀ j, j < N →
      (frame (j + 1)).pseudoDist (approx (j + 1)) (step j (approx j)) ≤ eps j)
    (heps1 : ∀ j, j < N → eps j < 1)
    (hbudget1 : ∀ j, j ≤ N → hyperbolicBudget initial eps j < 1)
    (hinitial : (frame 0).pseudoDist (approx 0) (exact 0) ≤ initial) :
    (frame N).pseudoDist (approx N) (exact N) ≤
      hyperbolicBudget initial eps N := by
  have hmain : ∀ j, j ≤ N →
      (frame j).pseudoDist (approx j) (exact j) ≤
        hyperbolicBudget initial eps j := by
    intro j hjN
    induction j with
    | zero => simpa using hinitial
    | succ j ih =>
        have hjN' : j < N := by omega
        have hjle : j ≤ N := hjN'.le
        rw [hexact j hjN']
        have htri := (frame (j + 1)).pseudoDist_strong_triangle
          (approx (j + 1)) (step j (approx j)) (step j (exact j))
          (hR (j + 1) hjN) (happroxMem (j + 1) hjN)
          (hmaps j hjN' (happroxMem j hjle))
          (hmaps j hjN' (hexactMem j hjle))
        have hnonexp := (frame j).schwarzPick (frame (j + 1)) (step j)
          (approx j) (exact j) (hR j hjle) (hR (j + 1) hjN)
          (hdiff j hjN') (hmaps j hjN')
          (happroxMem j hjle) (hexactMem j hjle)
        calc
          (frame (j + 1)).pseudoDist (approx (j + 1)) (step j (exact j)) ≤
              pseudoAdd
                ((frame (j + 1)).pseudoDist (approx (j + 1)) (step j (approx j)))
                ((frame (j + 1)).pseudoDist (step j (approx j)) (step j (exact j))) := htri
          _ ≤ pseudoAdd (eps j) (hyperbolicBudget initial eps j) := by
            apply pseudoAdd_mono
            · exact (frame (j + 1)).pseudoDist_nonneg _ _
            · exact hdefect j hjN'
            · exact heps1 j hjN'
            · exact (frame (j + 1)).pseudoDist_nonneg _ _
            · exact hnonexp.trans (ih hjle)
            · exact hbudget1 j hjle
          _ = hyperbolicBudget initial eps (j + 1) := rfl
  exact hmain N le_rfl

/-! ## Concrete Padé local defects and final Euclidean certificate -/

/-- Pseudohyperbolic local-defect budget obtained from the already certified
one-step Padé Euclidean defect. -/
def padeHyperbolicLocalBudget
    (output : DiskFrame) (a : ℂ) (r y q : ℝ) : ℝ :=
  padeLocalValueDefectBound a r y /
    (output.radius * (1 - q ^ 2))

theorem padeHyperbolicLocalBudget_nonneg
    (output : DiskFrame) (a : ℂ) (r y q : ℝ)
    (hR : 0 < output.radius) (hr : 0 ≤ r) (hy : 0 ≤ y)
    (hq0 : 0 ≤ q) (hq1 : q < 1)
    (hloc : 0 < ‖a‖ - r) :
    0 ≤ padeHyperbolicLocalBudget output a r y q := by
  have hqGap : 0 < 1 - q ^ 2 := by nlinarith
  unfold padeHyperbolicLocalBudget padeLocalValueDefectBound
  positivity

/-- Sequence of local hyperbolic budgets for a non-autonomous Padé block. -/
def nonautonomousPadeHyperbolicDefect
    (frame : ℕ → DiskFrame) (a : ℕ → ℂ)
    (r q : ℕ → ℝ) (y : ℝ) (j : ℕ) : ℝ :=
  padeHyperbolicLocalBudget (frame (j + 1)) (a j) (r j) y (q (j + 1))

/-- Total nonlinear budget of a non-autonomous Padé block, starting from an
exact common seed. -/
def nonautonomousPadeHyperbolicBudget
    (frame : ℕ → DiskFrame) (a : ℕ → ℂ)
    (r q : ℕ → ℝ) (y : ℝ) : ℕ → ℝ :=
  hyperbolicBudget 0 (nonautonomousPadeHyperbolicDefect frame a r q y)

/-- A one-step Padé defect becomes a pseudohyperbolic defect when the exact
and rational outputs lie in the same strict interior of the next moving
disk. -/
theorem padeStep_pseudoDist_le_localBudget
    (output : DiskFrame) (a z c : ℂ) (r y q : ℝ)
    (hR : 0 < output.radius) (hr : 0 ≤ r) (hy : 0 ≤ y)
    (hq0 : 0 ≤ q) (hq1 : q < 1)
    (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y)
    (hloc : 0 < ‖a‖ - r)
    (hpadeInterior :
      ‖padeSeed a z c - output.center‖ ≤ q * output.radius)
    (hexactInterior :
      ‖exactStep a z c - output.center‖ ≤ q * output.radius) :
    output.pseudoDist (padeSeed a z c) (exactStep a z c) ≤
      padeHyperbolicLocalBudget output a r y q := by
  apply output.pseudoDist_le_of_interior
    (padeSeed a z c) (exactStep a z c) q
    (padeLocalValueDefectBound a r y)
    hR hq0 hq1 hpadeInterior hexactInterior
  exact norm_padeSeed_sub_exactStep_le_local a z c r y hr hy hz hc hloc

/-- Final Euclidean conversion for a certified nonlinear hyperbolic budget. -/
theorem DiskFrame.norm_sub_le_hyperbolicBudget
    (d : DiskFrame) (z w : ℂ) (q budget : ℝ)
    (hR : 0 < d.radius) (hq0 : 0 ≤ q) (hq1 : q < 1)
    (hz : ‖z - d.center‖ ≤ q * d.radius)
    (hw : ‖w - d.center‖ ≤ q * d.radius)
    (hbudget : d.pseudoDist z w ≤ budget) :
    ‖z - w‖ ≤ d.radius * (1 + q ^ 2) * budget := by
  exact d.norm_sub_le_of_pseudoDist_le z w q budget
    hR hq0 hq1 hz hw hbudget

/-- End-to-end value certificate for the actual non-autonomous Mandelbrot
steps `a_j z + z² + c` and their one-step Padé models.  All disk assumptions
are finite and builder-facing.  The crucial output is a nonlinear fold of the
local defects, with no Euclidean derivative product. -/
theorem nonautonomous_pade_hyperbolic_shadowing_bound
    (frame : ℕ → DiskFrame) (a : ℕ → ℂ) (c : ℂ)
    (exact approx : ℕ → ℂ) (r q : ℕ → ℝ)
    (y : ℝ) (N : ℕ)
    (hR : ∀ j, j ≤ N → 0 < (frame j).radius)
    (hq0 : ∀ j, j ≤ N → 0 ≤ q j)
    (hq1 : ∀ j, j ≤ N → q j < 1)
    (hexactStep : ∀ j, j < N →
      exact (j + 1) = exactStep (a j) (exact j) c)
    (happroxStep : ∀ j, j < N →
      approx (j + 1) = padeSeed (a j) (approx j) c)
    (hstart : approx 0 = exact 0)
    (hexactInterior : ∀ j, j ≤ N →
      ‖exact j - (frame j).center‖ ≤ q j * (frame j).radius)
    (happroxInterior : ∀ j, j ≤ N →
      ‖approx j - (frame j).center‖ ≤ q j * (frame j).radius)
    (hexactAtApproxInterior : ∀ j, j < N →
      ‖exactStep (a j) (approx j) c - (frame (j + 1)).center‖ ≤
        q (j + 1) * (frame (j + 1)).radius)
    (hmaps : ∀ j, j < N → MapsTo (fun z => exactStep (a j) z c)
      (ball (frame j).center (frame j).radius)
      (ball (frame (j + 1)).center (frame (j + 1)).radius))
    (hr : ∀ j, j < N → 0 ≤ r j)
    (hy : 0 ≤ y) (hc : ‖c‖ ≤ y)
    (happroxRadius : ∀ j, j < N → ‖approx j‖ ≤ r j)
    (hloc : ∀ j, j < N → 0 < ‖a j‖ - r j)
    (hlocalBudget : ∀ j, j < N →
      nonautonomousPadeHyperbolicDefect frame a r q y j < 1) :
    ‖approx N - exact N‖ ≤
      (frame N).radius * (1 + q N ^ 2) *
        nonautonomousPadeHyperbolicBudget frame a r q y N := by
  have hmemOfInterior : ∀ (j : ℕ) (z : ℂ), j ≤ N →
      ‖z - (frame j).center‖ ≤ q j * (frame j).radius →
      z ∈ ball (frame j).center (frame j).radius := by
    intro j z hjN hz
    rw [mem_ball, dist_eq]
    have hqR : q j * (frame j).radius < (frame j).radius := by
      nlinarith [hR j hjN, hq1 j hjN]
    exact hz.trans_lt hqR
  have hexactMem : ∀ j, j ≤ N →
      exact j ∈ ball (frame j).center (frame j).radius := by
    intro j hj
    exact hmemOfInterior j (exact j) hj (hexactInterior j hj)
  have happroxMem : ∀ j, j ≤ N →
      approx j ∈ ball (frame j).center (frame j).radius := by
    intro j hj
    exact hmemOfInterior j (approx j) hj (happroxInterior j hj)
  have hdiff : ∀ j, j < N → DifferentiableOn ℂ
      (fun z => exactStep (a j) z c)
      (ball (frame j).center (frame j).radius) := by
    intro j hj z hz
    apply DifferentiableAt.differentiableWithinAt
    simp only [exactStep]
    fun_prop
  have hdefect : ∀ j, j < N →
      (frame (j + 1)).pseudoDist
        (approx (j + 1)) (exactStep (a j) (approx j) c) ≤
      nonautonomousPadeHyperbolicDefect frame a r q y j := by
    intro j hj
    have hpadeInterior :
        ‖padeSeed (a j) (approx j) c - (frame (j + 1)).center‖ ≤
          q (j + 1) * (frame (j + 1)).radius := by
      rw [← happroxStep j hj]
      exact happroxInterior (j + 1) (by omega)
    rw [happroxStep j hj]
    exact padeStep_pseudoDist_le_localBudget
      (frame (j + 1)) (a j) (approx j) c (r j) y (q (j + 1))
      (hR (j + 1) (by omega)) (hr j hj) hy
      (hq0 (j + 1) (by omega)) (hq1 (j + 1) (by omega))
      (happroxRadius j hj) hc (hloc j hj)
      hpadeInterior
      (hexactAtApproxInterior j hj)
  have hlocal0 : ∀ j, j < N →
      0 ≤ nonautonomousPadeHyperbolicDefect frame a r q y j := by
    intro j hj
    exact padeHyperbolicLocalBudget_nonneg
      (frame (j + 1)) (a j) (r j) y (q (j + 1))
      (hR (j + 1) (by omega)) (hr j hj) hy
      (hq0 (j + 1) (by omega)) (hq1 (j + 1) (by omega)) (hloc j hj)
  have htotal0 : ∀ j, j ≤ N →
      0 ≤ nonautonomousPadeHyperbolicBudget frame a r q y j := by
    intro j hjN
    induction j with
    | zero => simp [nonautonomousPadeHyperbolicBudget]
    | succ j ih =>
        have hjN' : j < N := by omega
        exact pseudoAdd_nonneg (hlocal0 j hjN') (ih hjN'.le)
  have htotalBudget : ∀ j, j ≤ N →
      nonautonomousPadeHyperbolicBudget frame a r q y j < 1 := by
    intro j hjN
    induction j with
    | zero => simp [nonautonomousPadeHyperbolicBudget]
    | succ j ih =>
        have hjN' : j < N := by omega
        exact pseudoAdd_lt_one (hlocal0 j hjN') (hlocalBudget j hjN')
          (htotal0 j hjN'.le) (ih hjN'.le)
  have hpseudo := DiskFrame.moving_pseudoDist_telescope_fin
    frame (fun j z => exactStep (a j) z c) exact approx
    (nonautonomousPadeHyperbolicDefect frame a r q y) 0 N
    hR hexactStep hexactMem happroxMem hdiff hmaps hdefect
    hlocalBudget htotalBudget (by simp [hstart])
  exact (frame N).norm_sub_le_hyperbolicBudget
    (approx N) (exact N) (q N)
    (nonautonomousPadeHyperbolicBudget frame a r q y N)
    (hR N le_rfl) (hq0 N le_rfl) (hq1 N le_rfl)
    (happroxInterior N le_rfl) (hexactInterior N le_rfl) hpseudo

/-! ## One final Cauchy extraction for derivatives -/

/-- A uniform value-error certificate for a whole block yields its derivative
error on a smaller disk with a single Cauchy division. -/
theorem block_derivative_error_le_of_value_error
    (exactBlock padeBlock : ℂ → ℂ) (center z : ℂ)
    (Rinner Router E : ℝ)
    (hR : Rinner < Router)
    (hz : z ∈ closedBall center Rinner)
    (hExactDiff : DifferentiableOn ℂ exactBlock (closedBall center Router))
    (hPadeDiff : DifferentiableOn ℂ padeBlock (closedBall center Router))
    (hValue : ∀ w ∈ closedBall center Router,
      ‖exactBlock w - padeBlock w‖ ≤ E) :
    ‖deriv exactBlock z - deriv padeBlock z‖ ≤
      E / (Router - Rinner) := by
  have hError := norm_deriv_le_on_inner_disk
    (fun w => exactBlock w - padeBlock w)
    center z Rinner Router E hR hz
    (hExactDiff.sub hPadeDiff) hValue
  have hzOuter : z ∈ ball center Router := by
    rw [mem_ball]
    have hzInner := mem_closedBall.mp hz
    linarith
  have hExactAt : DifferentiableAt ℂ exactBlock z :=
    hExactDiff.differentiableAt
      (Filter.mem_of_superset (isOpen_ball.mem_nhds hzOuter) ball_subset_closedBall)
  have hPadeAt : DifferentiableAt ℂ padeBlock z :=
    hPadeDiff.differentiableAt
      (Filter.mem_of_superset (isOpen_ball.mem_nhds hzOuter) ball_subset_closedBall)
  rw [deriv_fun_sub hExactAt hPadeAt] at hError
  exact hError

/-- The same single outer value certificate also controls the second
derivative of the total block error. -/
theorem block_second_derivative_error_le_of_value_error
    (exactBlock padeBlock : ℂ → ℂ) (center z : ℂ)
    (Rinner Router E : ℝ)
    (hR : Rinner < Router)
    (hz : z ∈ closedBall center Rinner)
    (hExactDiff : DifferentiableOn ℂ exactBlock (closedBall center Router))
    (hPadeDiff : DifferentiableOn ℂ padeBlock (closedBall center Router))
    (hValue : ∀ w ∈ closedBall center Router,
      ‖exactBlock w - padeBlock w‖ ≤ E) :
    ‖iteratedDeriv 2 (fun w => exactBlock w - padeBlock w) z‖ ≤
      2 * E / (Router - Rinner) ^ 2 := by
  exact norm_secondDeriv_le_on_inner_disk
    (fun w => exactBlock w - padeBlock w)
    center z Rinner Router E hR hz
    (hExactDiff.sub hPadeDiff) hValue

/-- Runtime-facing combined certificate: the same uniform hyperbolic value
majorant is retained for values and divided by the Cauchy headroom exactly
once for derivatives. -/
theorem block_value_and_derivative_error_le
    (exactBlock padeBlock : ℂ → ℂ) (center z : ℂ)
    (Rinner Router E : ℝ)
    (hR : Rinner < Router)
    (hz : z ∈ closedBall center Rinner)
    (hExactDiff : DifferentiableOn ℂ exactBlock (closedBall center Router))
    (hPadeDiff : DifferentiableOn ℂ padeBlock (closedBall center Router))
    (hValue : ∀ w ∈ closedBall center Router,
      ‖exactBlock w - padeBlock w‖ ≤ E) :
    ‖exactBlock z - padeBlock z‖ ≤ E ∧
      ‖deriv exactBlock z - deriv padeBlock z‖ ≤
        E / (Router - Rinner) := by
  constructor
  · exact hValue z (closedBall_mono_of_lt center z Rinner Router hR hz)
  · exact block_derivative_error_le_of_value_error
      exactBlock padeBlock center z Rinner Router E
      hR hz hExactDiff hPadeDiff hValue

/-- Explicit Padé/hyperbolic specialization of the final Cauchy bridge.  The
uniform hypothesis is discharged pointwise by
`nonautonomous_pade_hyperbolic_shadowing_bound` on the outer input disk. -/
theorem pade_hyperbolic_value_and_derivative_error_le
    (exactBlock padeBlock : ℂ → ℂ) (output : DiskFrame)
    (q budget : ℝ) (center z : ℂ) (Rinner Router : ℝ)
    (hR : Rinner < Router)
    (hz : z ∈ closedBall center Rinner)
    (hExactDiff : DifferentiableOn ℂ exactBlock (closedBall center Router))
    (hPadeDiff : DifferentiableOn ℂ padeBlock (closedBall center Router))
    (hValue : ∀ w ∈ closedBall center Router,
      ‖exactBlock w - padeBlock w‖ ≤
        output.radius * (1 + q ^ 2) * budget) :
    ‖exactBlock z - padeBlock z‖ ≤
        output.radius * (1 + q ^ 2) * budget ∧
      ‖deriv exactBlock z - deriv padeBlock z‖ ≤
        (output.radius * (1 + q ^ 2) * budget) /
          (Router - Rinner) := by
  exact block_value_and_derivative_error_le
    exactBlock padeBlock center z Rinner Router
    (output.radius * (1 + q ^ 2) * budget)
    hR hz hExactDiff hPadeDiff hValue

end

end Mandelbrot
