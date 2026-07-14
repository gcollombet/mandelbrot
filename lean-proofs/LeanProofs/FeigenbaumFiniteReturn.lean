/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.VerifiedRationalBounds
import Mathlib.Analysis.Complex.Basic
import Mathlib.Analysis.Calculus.MeanValue

/-!
# Certified finite-depth Feigenbaum returns

The fixed-point theorem in `FeigenbaumRenormalization` describes the limiting
object.  A renderer needs a finite statement: a high iterate of
`P_c(z) = z² + c`, after an explicit change of scale, is uniformly close to a
stored model on a disk.  This file isolates the proof obligations that a
finite interval checker must emit.

The central theorem `FiniteGridWitness.uniform_error` is deliberately
agnostic about how bounds are computed.  The checker may use rational complex
balls, interval arithmetic, or exact polynomials.  Once it supplies bounds at
finitely many cells plus a variation bound, Lean proves the uniform result.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Set

namespace FeigenbaumFiniteReturn

/-! ## Quadratic dynamics and exact normalization -/

/-- The complex quadratic family used by the renderer. -/
def quadratic (c z : ℂ) : ℂ := z ^ 2 + c

/-- A small transparent iterate, convenient for certificate replay. -/
def iterate (f : ℂ → ℂ) : ℕ → ℂ → ℂ
  | 0 => id
  | n + 1 => fun z => f (iterate f n z)

@[simp] theorem iterate_zero (f : ℂ → ℂ) (z : ℂ) :
    iterate f 0 z = z := rfl

@[simp] theorem iterate_succ (f : ℂ → ℂ) (n : ℕ) (z : ℂ) :
    iterate f (n + 1) z = f (iterate f n z) := rfl

theorem iterate_add (f : ℂ → ℂ) (m n : ℕ) (z : ℂ) :
    iterate f (m + n) z = iterate f m (iterate f n z) := by
  induction m with
  | zero => simp
  | succ m ih => simp [Nat.succ_add, iterate, ih]

/-- The critical value after a finite block. -/
def criticalScale (c : ℂ) (skip : ℕ) : ℂ :=
  iterate (quadratic c) skip 0

/-- Conjugate a finite return by the critical scale. -/
def normalizedReturn (c : ℂ) (skip : ℕ) (z : ℂ) : ℂ :=
  iterate (quadratic c) skip (criticalScale c skip * z) /
    criticalScale c skip

/-- Every nondegenerate critical normalization maps the critical point to
one.  This is the finite-depth analogue of the normalization `h(0)=1`. -/
theorem normalizedReturn_zero {c : ℂ} {skip : ℕ}
    (hScale : criticalScale c skip ≠ 0) :
    normalizedReturn c skip 0 = 1 := by
  rw [normalizedReturn]
  simp only [mul_zero]
  change criticalScale c skip / criticalScale c skip = 1
  exact div_self hScale

/-- One quadratic step, normalized by `c`, is exactly the standard real-form
quadratic `1 - μ z²` with `μ = -c`. -/
theorem quadratic_affine_conjugacy {c z : ℂ} (hc : c ≠ 0) :
    quadratic c (c * z) / c = 1 - (-c) * z ^ 2 := by
  unfold quadratic
  field_simp [hc]
  ring

/-- Quadratic iterates are even as soon as at least one step is taken. -/
theorem iterate_quadratic_even (c z : ℂ) : ∀ n : ℕ,
    iterate (quadratic c) (n + 1) (-z) =
      iterate (quadratic c) (n + 1) z := by
  intro n
  induction n with
  | zero => simp [iterate, quadratic]
  | succ n ih =>
      change quadratic c (iterate (quadratic c) (n + 1) (-z)) =
        quadratic c (iterate (quadratic c) (n + 1) z)
      exact congrArg (quadratic c) ih

theorem normalizedReturn_even (c z : ℂ) (skip : ℕ) :
    normalizedReturn c (skip + 1) (-z) =
      normalizedReturn c (skip + 1) z := by
  simp only [normalizedReturn]
  apply congrArg (fun w => w / criticalScale c (skip + 1))
  rw [mul_neg]
  exact iterate_quadratic_even c
    (criticalScale c (skip + 1) * z) skip

/-! ## Exact perturbation recurrence used by the finite checker -/

/-- One step of the scalar orbit envelope.  This is the formula replayed by
the Rust builder in every grid cell. -/
theorem quadratic_error_step {c z w : ℂ} {e : ℝ}
    (hError : dist z w ≤ e) (he : 0 ≤ e) :
    dist (quadratic c z) (quadratic c w) ≤
      (2 * ‖w‖ + e) * e := by
  have hNormError : ‖z - w‖ ≤ e := by
    simpa [Complex.dist_eq] using hError
  have hz : ‖z‖ ≤ ‖z - w‖ + ‖w‖ := by
    calc
      ‖z‖ = ‖(z - w) + w‖ := by ring_nf
      _ ≤ ‖z - w‖ + ‖w‖ := norm_add_le _ _
  have hSum : ‖z + w‖ ≤ 2 * ‖w‖ + e := by
    have hadd := norm_add_le z w
    linarith
  rw [Complex.dist_eq]
  have hFactor : quadratic c z - quadratic c w = (z - w) * (z + w) := by
    simp only [quadratic]
    ring
  rw [hFactor, norm_mul]
  calc
    ‖z - w‖ * ‖z + w‖ ≤ e * (2 * ‖w‖ + e) :=
      mul_le_mul hNormError hSum (norm_nonneg _) he
    _ = (2 * ‖w‖ + e) * e := mul_comm _ _

/-- Parameter-aware version.  If both the orbit state and `c` vary, the local
parameter radius is added once at this step. -/
theorem quadratic_parameter_error_step {c c₀ z w : ℂ} {e δ : ℝ}
    (hError : dist z w ≤ e) (hParameter : dist c c₀ ≤ δ)
    (he : 0 ≤ e) :
    dist (quadratic c z) (quadratic c₀ w) ≤
      (2 * ‖w‖ + e) * e + δ := by
  calc
    dist (quadratic c z) (quadratic c₀ w) ≤
        dist (quadratic c z) (quadratic c w) +
          dist (quadratic c w) (quadratic c₀ w) := dist_triangle _ _ _
    _ ≤ (2 * ‖w‖ + e) * e + δ := by
      apply add_le_add (quadratic_error_step hError he)
      simpa [quadratic, Complex.dist_eq] using hParameter

/-! ## Explicit gauges -/

/-- A nondegenerate complex scaling.  Storing it in the certificate prevents
the runtime from silently changing normalization. -/
structure Gauge where
  scale : ℂ
  scale_ne_zero : scale ≠ 0

namespace Gauge

def toPhysical (g : Gauge) (z : ℂ) : ℂ := g.scale * z

def toNormalized (g : Gauge) (z : ℂ) : ℂ := z / g.scale

def conjugate (g : Gauge) (f : ℂ → ℂ) (z : ℂ) : ℂ :=
  g.toNormalized (f (g.toPhysical z))

@[simp] theorem normalized_physical (g : Gauge) (z : ℂ) :
    g.toNormalized (g.toPhysical z) = z := by
  simp [toNormalized, toPhysical, g.scale_ne_zero]

@[simp] theorem physical_normalized (g : Gauge) (z : ℂ) :
    g.toPhysical (g.toNormalized z) = z := by
  change g.scale * (z / g.scale) = z
  field_simp [g.scale_ne_zero]

theorem conjugate_apply (g : Gauge) (f : ℂ → ℂ) (z : ℂ) :
    g.conjugate f z = f (g.scale * z) / g.scale := rfl

/-- Normalized error becomes physical error by exactly `|scale|`. -/
theorem dist_toPhysical (g : Gauge) (z w : ℂ) :
    dist (g.toPhysical z) (g.toPhysical w) =
      ‖g.scale‖ * dist z w := by
  rw [Complex.dist_eq, Complex.dist_eq]
  change ‖g.scale * z - g.scale * w‖ = ‖g.scale‖ * ‖z - w‖
  rw [← mul_sub, norm_mul]

/-- Conversely, a physical error bound is divided by the scale norm. -/
theorem dist_toNormalized (g : Gauge) (z w : ℂ) :
    dist (g.toNormalized z) (g.toNormalized w) =
      dist z w / ‖g.scale‖ := by
  rw [Complex.dist_eq, Complex.dist_eq]
  change ‖z / g.scale - w / g.scale‖ = ‖z - w‖ / ‖g.scale‖
  rw [← sub_div, norm_div]

end Gauge

/-- The critical gauge realizes `normalizedReturn` definitionally. -/
def criticalGauge (c : ℂ) (skip : ℕ)
    (hScale : criticalScale c skip ≠ 0) : Gauge :=
  ⟨criticalScale c skip, hScale⟩

theorem normalizedReturn_eq_conjugate {c : ℂ} {skip : ℕ}
    (hScale : criticalScale c skip ≠ 0) :
    normalizedReturn c skip =
      (criticalGauge c skip hScale).conjugate
        (iterate (quadratic c) skip) := by
  funext z
  rfl

/-! ## Finite disk checker -/

/-- Semantic output of the finite interval checker.  `variation` encloses the
change of the exact return between any point and the chosen cell center.
This is where interval iteration, a polynomial enclosure, or a derivative
majorant plugs into the proof. -/
structure FiniteGridWitness (returnMap model : ℂ → ℂ) where
  domain : Set ℂ
  Cell : Type*
  center : Cell → ℂ
  cellRadius : ℝ
  sampleError : ℝ
  variation : ℝ
  modelLipschitz : NNReal
  cellRadius_nonneg : 0 ≤ cellRadius
  sampleError_nonneg : 0 ≤ sampleError
  variation_nonneg : 0 ≤ variation
  cover : ∀ z ∈ domain, ∃ i : Cell,
    center i ∈ domain ∧ dist z (center i) ≤ cellRadius
  return_variation : ∀ z ∈ domain, ∀ i : Cell,
    center i ∈ domain → dist z (center i) ≤ cellRadius →
      dist (returnMap z) (returnMap (center i)) ≤ variation
  samples : ∀ i : Cell, center i ∈ domain →
    dist (returnMap (center i)) (model (center i)) ≤ sampleError
  model_lipschitz : LipschitzOnWith modelLipschitz model domain

namespace FiniteGridWitness

/-- The total uniform error emitted by the checker. -/
def totalError {returnMap model : ℂ → ℂ}
    (w : FiniteGridWitness returnMap model) : ℝ :=
  w.variation + w.sampleError + (w.modelLipschitz : ℝ) * w.cellRadius

theorem totalError_nonneg {returnMap model : ℂ → ℂ}
    (w : FiniteGridWitness returnMap model) : 0 ≤ w.totalError := by
  exact add_nonneg (add_nonneg w.variation_nonneg w.sampleError_nonneg)
    (mul_nonneg w.modelLipschitz.coe_nonneg w.cellRadius_nonneg)

/-- Finite samples plus rigorous cell transport imply a uniform disk bound. -/
theorem uniform_error {returnMap model : ℂ → ℂ}
    (w : FiniteGridWitness returnMap model) {z : ℂ}
    (hz : z ∈ w.domain) :
    dist (returnMap z) (model z) ≤ w.totalError := by
  obtain ⟨i, hi, hzi⟩ := w.cover z hz
  have hReturn := w.return_variation z hz i hi hzi
  have hSample := w.samples i hi
  have hModel : dist (model (w.center i)) (model z) ≤
      (w.modelLipschitz : ℝ) * w.cellRadius := by
    calc
      dist (model (w.center i)) (model z) ≤
          (w.modelLipschitz : ℝ) * dist (w.center i) z :=
        w.model_lipschitz.dist_le_mul (w.center i) hi z hz
      _ ≤ (w.modelLipschitz : ℝ) * w.cellRadius :=
        mul_le_mul_of_nonneg_left (by simpa [dist_comm] using hzi)
          w.modelLipschitz.coe_nonneg
  calc
    dist (returnMap z) (model z) ≤
        dist (returnMap z) (returnMap (w.center i)) +
          dist (returnMap (w.center i)) (model z) := dist_triangle _ _ _
    _ ≤ w.variation +
        (dist (returnMap (w.center i)) (model (w.center i)) +
          dist (model (w.center i)) (model z)) := by
      exact add_le_add hReturn (dist_triangle _ _ _)
    _ ≤ w.variation +
        (w.sampleError + (w.modelLipschitz : ℝ) * w.cellRadius) := by
      exact add_le_add le_rfl (add_le_add hSample hModel)
    _ = w.totalError := by
      simp only [totalError]
      ring

/-- A tolerance check is the sole gate required before enabling the fast
finite-return path. -/
structure Accepted {returnMap model : ℂ → ℂ}
    (w : FiniteGridWitness returnMap model) (tolerance : ℝ) : Prop where
  total_le : w.totalError ≤ tolerance

theorem Accepted.sound {returnMap model : ℂ → ℂ}
    {w : FiniteGridWitness returnMap model} {tolerance : ℝ}
    (accepted : Accepted w tolerance) {z : ℂ} (hz : z ∈ w.domain) :
    dist (returnMap z) (model z) ≤ tolerance :=
  (w.uniform_error hz).trans accepted.total_le

end FiniteGridWitness

/-! ## Second-order difference certificate

The first-order grid witness transports the return and the model separately,
so its floor is `Lip(H)·h + variation`.  The observed convergence lives on the
difference `D = G - H`; certifying `D`, its derivative at cell centers and a
curvature majorant keeps the quasi-cancellation.  The remainder inequality is
proved from the mean value theorem, not assumed. -/

/-- Mean-value bridge: a complex-differentiable function whose derivative
stays within `C` of its value at the cell center satisfies the first-order
Taylor enclosure used by the difference witness.  Applied with
`C = curvature · radius`, this is the `M₂ h²` cell remainder. -/
theorem taylor_remainder_of_deriv_bound
    {D D' : ℂ → ℂ} {s : Set ℂ} (hConvex : Convex ℝ s)
    (hDeriv : ∀ w ∈ s, HasDerivWithinAt D (D' w) s w)
    {x₀ x : ℂ} (hx₀ : x₀ ∈ s) (hx : x ∈ s) {C : ℝ}
    (hBound : ∀ w ∈ s, ‖D' w - D' x₀‖ ≤ C) :
    ‖D x - D x₀ - (x - x₀) * D' x₀‖ ≤ C * ‖x - x₀‖ := by
  set φ : ℂ →L[ℝ] ℂ :=
    (ContinuousLinearMap.restrictScalars ℝ
      ((1 : ℂ →L[ℂ] ℂ).smulRight (D' x₀)))
  have hF : ∀ w ∈ s, HasFDerivWithinAt D
      (ContinuousLinearMap.restrictScalars ℝ
        ((1 : ℂ →L[ℂ] ℂ).smulRight (D' w))) s w := fun w hw =>
    ((hDeriv w hw).hasFDerivWithinAt).restrictScalars ℝ
  have hOp : ∀ w ∈ s,
      ‖ContinuousLinearMap.restrictScalars ℝ
          ((1 : ℂ →L[ℂ] ℂ).smulRight (D' w)) - φ‖ ≤ C := by
    intro w hw
    have hPointwise : ∀ v : ℂ,
        ‖(ContinuousLinearMap.restrictScalars ℝ
            ((1 : ℂ →L[ℂ] ℂ).smulRight (D' w)) - φ) v‖ ≤
          ‖D' w - D' x₀‖ * ‖v‖ := by
      intro v
      have hApply :
          (ContinuousLinearMap.restrictScalars ℝ
              ((1 : ℂ →L[ℂ] ℂ).smulRight (D' w)) - φ) v =
            v * (D' w - D' x₀) := by
        simp [φ, mul_sub]
      rw [hApply, norm_mul, mul_comm]
    have := ContinuousLinearMap.opNorm_le_bound _ (norm_nonneg (D' w - D' x₀))
      hPointwise
    exact this.trans (hBound w hw)
  have hMean :=
    hConvex.norm_image_sub_le_of_norm_hasFDerivWithin_le' hF hOp hx₀ hx
  have hφApply : φ (x - x₀) = (x - x₀) * D' x₀ := by
    simp [φ]
  rw [hφApply] at hMean
  exact hMean

/-- Aggregating one cell of the difference certificate: a sampled value, a
sampled derivative and the proved Taylor remainder give the local bound
`v + d·h + M·h²` replayed by the rational checker. -/
theorem difference_cell_bound {D D' : ℂ → ℂ} {x₀ x : ℂ}
    {v d M h : ℝ}
    (hValue : ‖D x₀‖ ≤ v) (hDerivBound : ‖D' x₀‖ ≤ d)
    (hRadius : ‖x - x₀‖ ≤ h)
    (hRemainder : ‖D x - D x₀ - (x - x₀) * D' x₀‖ ≤ M * h * h) :
    ‖D x‖ ≤ v + d * h + M * h * h := by
  have hh : (0 : ℝ) ≤ h := (norm_nonneg _).trans hRadius
  have hLinear : ‖(x - x₀) * D' x₀‖ ≤ h * d := by
    rw [norm_mul]
    exact mul_le_mul hRadius hDerivBound (norm_nonneg _) hh
  calc
    ‖D x‖ = ‖D x₀ + (x - x₀) * D' x₀ +
        (D x - D x₀ - (x - x₀) * D' x₀)‖ := by ring_nf
    _ ≤ ‖D x₀ + (x - x₀) * D' x₀‖ +
        ‖D x - D x₀ - (x - x₀) * D' x₀‖ := norm_add_le _ _
    _ ≤ (‖D x₀‖ + ‖(x - x₀) * D' x₀‖) +
        ‖D x - D x₀ - (x - x₀) * D' x₀‖ := by
      exact add_le_add (norm_add_le _ _) le_rfl
    _ ≤ (v + h * d) + M * h * h := by
      exact add_le_add (add_le_add hValue hLinear) hRemainder
    _ = v + d * h + M * h * h := by ring

/-- Semantic output of the adaptive second-order checker.  Cells carry their
own radius (quadtree subdivision), a value bound and a derivative bound at
the center, and a curvature majorant valid on the whole cell.  The `taylor`
field is exactly what `taylor_remainder_of_deriv_bound` proves for the
difference `returnMap - model` once the builder bounds `sup ‖D''‖`. -/
structure DifferenceGridWitness (returnMap model : ℂ → ℂ) where
  domain : Set ℂ
  Cell : Type*
  center : Cell → ℂ
  radius : Cell → ℝ
  valueBound : Cell → ℝ
  derivBound : Cell → ℝ
  curvature : Cell → ℝ
  deriv : ℂ → ℂ
  radius_nonneg : ∀ i, 0 ≤ radius i
  cover : ∀ z ∈ domain, ∃ i : Cell, dist z (center i) ≤ radius i
  value_le : ∀ i : Cell,
    ‖returnMap (center i) - model (center i)‖ ≤ valueBound i
  deriv_le : ∀ i : Cell, ‖deriv (center i)‖ ≤ derivBound i
  taylor : ∀ i : Cell, ∀ z ∈ domain, dist z (center i) ≤ radius i →
    ‖(returnMap z - model z) -
        (returnMap (center i) - model (center i)) -
        (z - center i) * deriv (center i)‖ ≤
      curvature i * radius i * radius i

namespace DifferenceGridWitness

/-- The per-cell bound the adaptive builder subdivides against. -/
def localBound {returnMap model : ℂ → ℂ}
    (w : DifferenceGridWitness returnMap model) (i : w.Cell) : ℝ :=
  w.valueBound i + w.derivBound i * w.radius i +
    w.curvature i * w.radius i * w.radius i

/-- Every cell within budget yields the uniform difference bound.  This is
the second-order replacement of `FiniteGridWitness.uniform_error`. -/
theorem uniform_error {returnMap model : ℂ → ℂ}
    (w : DifferenceGridWitness returnMap model) {budget : ℝ}
    (hBudget : ∀ i : w.Cell, w.localBound i ≤ budget)
    {z : ℂ} (hz : z ∈ w.domain) :
    dist (returnMap z) (model z) ≤ budget := by
  obtain ⟨i, hzi⟩ := w.cover z hz
  have hCell :=
    difference_cell_bound (D := fun z => returnMap z - model z)
      (D' := fun z => w.deriv z)
      (w.value_le i) (w.deriv_le i)
      (by simpa [Complex.dist_eq] using hzi)
      (w.taylor i z hz hzi)
  rw [Complex.dist_eq]
  exact hCell.trans (hBudget i)

end DifferenceGridWitness

/-! ### Rational replay of the per-cell sums

The builder exports every endpoint as an exact dyadic rational.  The local
sum `v + d·h + M·h²` is then re-aggregated inside the kernel through the
`RatUpper` algebra, so no floating-point evaluation is trusted. -/

/-- An exact dyadic upper endpoint `mantissa · 2^exponent`, the certificate
format emitted by the Rust builder (every finite `f64` is such a number). -/
def RatUpper.dyadic (mantissa : ℕ) (exponent : ℤ) : RatUpper :=
  ⟨(mantissa : ℚ) * (2 : ℚ) ^ exponent, by positivity⟩

/-- One exported cell: rational value, derivative, radius and curvature
upper endpoints. -/
structure RationalCellRecord where
  value : RatUpper
  deriv : RatUpper
  radius : RatUpper
  curvature : RatUpper

namespace RationalCellRecord

/-- Kernel-replayed local sum `v + d·h + M·h·h`. -/
def localBound (r : RationalCellRecord) : RatUpper :=
  r.value.add ((r.deriv.mul r.radius).add
    ((r.curvature.mul r.radius).mul r.radius))

/-- Componentwise enclosures aggregate soundly to the local cell bound. -/
theorem localBound_holds (r : RationalCellRecord) {v d h M : ℝ}
    (hv : r.value.Holds v) (hd : r.deriv.Holds d)
    (hh : r.radius.Holds h) (hM : r.curvature.Holds M) :
    r.localBound.Holds (v + (d * h + M * h * h)) :=
  RatUpper.add_holds hv
    (RatUpper.add_holds (RatUpper.mul_holds hd hh)
      (RatUpper.mul_holds (RatUpper.mul_holds hM hh) hh))

/-- A rational per-cell acceptance transfers to the real local bound used by
`DifferenceGridWitness.uniform_error`. -/
theorem localBound_le_budget (r : RationalCellRecord) {v d h M : ℝ}
    {budget : ℚ}
    (hv : r.value.Holds v) (hd : r.deriv.Holds d)
    (hh : r.radius.Holds h) (hM : r.curvature.Holds M)
    (hAccept : r.localBound.value ≤ budget) :
    v + d * h + M * h * h ≤ (budget : ℝ) := by
  have hHolds := r.localBound_holds hv hd hh hM
  have hReal : v + (d * h + M * h * h) ≤ (r.localBound.value : ℝ) :=
    hHolds.2
  have hBudget : (r.localBound.value : ℝ) ≤ (budget : ℝ) := by
    exact_mod_cast hAccept
  linarith

end RationalCellRecord

/-! ## Parameter windows and runtime fallback -/

/-- Once a center parameter is certified, a Lipschitz parameter enclosure
extends it to a whole parameter window. -/
theorem parameter_window {returnAt : ℂ → ℂ → ℂ}
    {model : ℂ → ℂ} {c₀ c z : ℂ} {baseError K δ : ℝ}
    (hBase : dist (returnAt c₀ z) (model z) ≤ baseError)
    (hParameter : dist (returnAt c z) (returnAt c₀ z) ≤ K * dist c c₀)
    (hc : dist c c₀ ≤ δ) (hK : 0 ≤ K) :
    dist (returnAt c z) (model z) ≤ K * δ + baseError := by
  calc
    dist (returnAt c z) (model z) ≤
        dist (returnAt c z) (returnAt c₀ z) +
          dist (returnAt c₀ z) (model z) := dist_triangle _ _ _
    _ ≤ K * dist c c₀ + baseError := add_le_add hParameter hBase
    _ ≤ K * δ + baseError :=
      add_le_add (mul_le_mul_of_nonneg_left hc hK) le_rfl

/-- A runtime candidate contains the mathematical witness and the successful
tolerance comparison.  Consequently an `Option.some` can never represent an
uncertified fast path. -/
structure CertifiedCandidate (returnMap model : ℂ → ℂ)
    (tolerance : ℝ) where
  witness : FiniteGridWitness returnMap model
  accepted : witness.Accepted tolerance

/-- The renderer either receives a certified fast candidate or `none`, in
which case it must retain its existing Padé/jet/affine path. -/
def chooseCertifiedOrFallback {returnMap model : ℂ → ℂ}
    {tolerance : ℝ}
    (candidate : Option (CertifiedCandidate returnMap model tolerance))
    (fast fallback : ℂ → ℂ) : ℂ → ℂ :=
  match candidate with
  | some _ => fast
  | none => fallback

@[simp] theorem choose_none_is_fallback
    {returnMap model : ℂ → ℂ} {tolerance : ℝ}
    (fast fallback : ℂ → ℂ) :
    chooseCertifiedOrFallback
      (returnMap := returnMap) (model := model) (tolerance := tolerance)
      none fast fallback = fallback := rfl

theorem some_candidate_sound {returnMap model : ℂ → ℂ}
    {tolerance : ℝ}
    (candidate : CertifiedCandidate returnMap model tolerance)
    {z : ℂ} (hz : z ∈ candidate.witness.domain) :
    dist (returnMap z) (model z) ≤ tolerance :=
  candidate.accepted.sound hz

end FeigenbaumFiniteReturn

end

end Mandelbrot
