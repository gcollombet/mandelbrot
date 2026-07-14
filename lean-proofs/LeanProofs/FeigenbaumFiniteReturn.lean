/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.VerifiedRationalBounds
import Mathlib.Analysis.Complex.Basic

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
