/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Cauchy
import Lean.Elab.Tactic.Omega

/-!
# Anisotropic Cauchy bounds on a bidisc

The renderer currently replaces the two normalized radii by their maximum.
Here we keep both variables.  The resulting homogeneous slices and infinite
tail have an exact closed form, whose diagonal limit is the former bound.
-/

namespace Mandelbrot

noncomputable section

open Complex Metric Real

/-- Sum of all normalized monomials of total degree `d`. -/
def homogeneousSlice (d : ℕ) (u v : ℝ) : ℝ :=
  ∑ i ∈ Finset.range (d + 1), u ^ i * v ^ (d - i)

theorem homogeneousSlice_mul_sub (d : ℕ) (u v : ℝ) :
    homogeneousSlice d u v * (u - v) = u ^ (d + 1) - v ^ (d + 1) := by
  simpa [homogeneousSlice] using geom_sum₂_mul u v (d + 1)

theorem homogeneousSlice_eq_div (d : ℕ) (u v : ℝ) (huv : u ≠ v) :
    homogeneousSlice d u v = (u ^ (d + 1) - v ^ (d + 1)) / (u - v) := by
  rw [eq_div_iff (sub_ne_zero.mpr huv)]
  exact homogeneousSlice_mul_sub d u v

/-- Exact anisotropic tail, indexed by total degree `D+k`. -/
theorem hasSum_anisotropic_tail (D : ℕ) (u v : ℝ)
    (hu : |u| < 1) (hv : |v| < 1) (huv : u ≠ v) :
    HasSum (fun k : ℕ => homogeneousSlice (D + k) u v)
      ((u ^ (D + 1) / (1 - u) - v ^ (D + 1) / (1 - v)) / (u - v)) := by
  have hu0 : HasSum (fun k : ℕ => u ^ k) (1 / (1 - u)) := by
    simpa [div_eq_mul_inv, Real.norm_eq_abs] using
      (hasSum_geometric_of_norm_lt_one (ξ := u) (by simpa [Real.norm_eq_abs] using hu))
  have hv0 : HasSum (fun k : ℕ => v ^ k) (1 / (1 - v)) := by
    simpa [div_eq_mul_inv, Real.norm_eq_abs] using
      (hasSum_geometric_of_norm_lt_one (ξ := v) (by simpa [Real.norm_eq_abs] using hv))
  have huShift : HasSum (fun k : ℕ => u ^ (D + k + 1)) (u ^ (D + 1) / (1 - u)) := by
    have h := hu0.mul_left (u ^ (D + 1))
    have hfun : (fun k : ℕ => u ^ (D + k + 1)) =
        (fun k : ℕ => u ^ (D + 1) * u ^ k) := by
      funext k
      rw [show D + k + 1 = D + 1 + k by omega, pow_add]
    rw [hfun]
    simpa [div_eq_mul_inv] using h
  have hvShift : HasSum (fun k : ℕ => v ^ (D + k + 1)) (v ^ (D + 1) / (1 - v)) := by
    have h := hv0.mul_left (v ^ (D + 1))
    have hfun : (fun k : ℕ => v ^ (D + k + 1)) =
        (fun k : ℕ => v ^ (D + 1) * v ^ k) := by
      funext k
      rw [show D + k + 1 = D + 1 + k by omega, pow_add]
    rw [hfun]
    simpa [div_eq_mul_inv] using h
  have hdiff := (huShift.sub hvShift).div_const (u - v)
  have hfun : (fun k : ℕ => homogeneousSlice (D + k) u v) =
      (fun k : ℕ => (u ^ (D + k + 1) - v ^ (D + k + 1)) / (u - v)) := by
    funext k
    simpa [Nat.add_assoc] using homogeneousSlice_eq_div (D + k) u v huv
  rw [hfun]
  exact hdiff

/-- On the diagonal, a homogeneous slice contains `d+1` identical terms. -/
theorem homogeneousSlice_diagonal (d : ℕ) (theta : ℝ) :
    homogeneousSlice d theta theta = (d + 1 : ℝ) * theta ^ d := by
  calc
    homogeneousSlice d theta theta =
        ∑ _i ∈ Finset.range (d + 1), theta ^ d := by
      apply Finset.sum_congr rfl
      intro i hi
      have hid : i + (d - i) = d := Nat.add_sub_of_le (Nat.le_of_lt_succ (Finset.mem_range.mp hi))
      rw [← pow_add, hid]
    _ = (d + 1 : ℝ) * theta ^ d := by simp

/-- Collapsing `(u,v)` to a common upper bound `theta` is conservative. -/
theorem homogeneousSlice_le_diagonal
    (d : ℕ) (u v theta : ℝ)
    (hu0 : 0 ≤ u) (hv0 : 0 ≤ v) (hu : u ≤ theta) (hv : v ≤ theta) :
    homogeneousSlice d u v ≤ (d + 1 : ℝ) * theta ^ d := by
  have htheta : 0 ≤ theta := hu0.trans hu
  calc
    homogeneousSlice d u v ≤
        ∑ _i ∈ Finset.range (d + 1), theta ^ d := by
      apply Finset.sum_le_sum
      intro i hi
      have hid : i + (d - i) = d := Nat.add_sub_of_le (Nat.le_of_lt_succ (Finset.mem_range.mp hi))
      calc
        u ^ i * v ^ (d - i) ≤ theta ^ i * theta ^ (d - i) := by
          exact mul_le_mul
            (pow_le_pow_left₀ hu0 hu i) (pow_le_pow_left₀ hv0 hv (d - i))
            (pow_nonneg hv0 _) (pow_nonneg htheta _)
        _ = theta ^ d := by rw [← pow_add, hid]
    _ = (d + 1 : ℝ) * theta ^ d := by simp

/-- Homogeneous slices are monotone in each nonnegative normalized radius. -/
theorem homogeneousSlice_mono
    (d : ℕ) (u v u' v' : ℝ)
    (hu0 : 0 ≤ u) (hv0 : 0 ≤ v) (hu : u ≤ u') (hv : v ≤ v') :
    homogeneousSlice d u v ≤ homogeneousSlice d u' v' := by
  have hu'0 : 0 ≤ u' := hu0.trans hu
  apply Finset.sum_le_sum
  intro i hi
  exact mul_le_mul
    (pow_le_pow_left₀ hu0 hu i) (pow_le_pow_left₀ hv0 hv (d - i))
    (pow_nonneg hv0 _) (pow_nonneg hu'0 _)

/-- The diagonal specialization is exactly the Cauchy-tail formula already
used by the renderer. -/
theorem hasSum_anisotropic_tail_diagonal (D : ℕ) (theta : ℝ)
    (htheta : |theta| < 1) :
    HasSum (fun k : ℕ => homogeneousSlice (D + k) theta theta)
      (theta ^ D * ((D + 1 : ℝ) - D * theta) / (1 - theta) ^ 2) := by
  have hfun : (fun k : ℕ => homogeneousSlice (D + k) theta theta) =
      (fun k : ℕ => (D + k + 1 : ℝ) * theta ^ (D + k)) := by
    funext k
    rw [homogeneousSlice_diagonal]
    push_cast
    ring
  rw [hfun]
  exact hasSum_shifted_cauchy_tail D theta htheta

/-- Numerically safe closed form: use the removable diagonal value when the
two normalized radii coincide. -/
def anisotropicTailClosed (D : ℕ) (u v : ℝ) : ℝ :=
  if u = v then
    u ^ D * ((D + 1 : ℝ) - D * u) / (1 - u) ^ 2
  else
    (u ^ (D + 1) / (1 - u) - v ^ (D + 1) / (1 - v)) / (u - v)

/-- The piecewise closed form covers both the anisotropic and diagonal cases. -/
theorem hasSum_anisotropic_tail_closed (D : ℕ) (u v : ℝ)
    (hu : |u| < 1) (hv : |v| < 1) :
    HasSum (fun k : ℕ => homogeneousSlice (D + k) u v)
      (anisotropicTailClosed D u v) := by
  by_cases huv : u = v
  · subst v
    simpa [anisotropicTailClosed] using hasSum_anisotropic_tail_diagonal D u hu
  · simpa [anisotropicTailClosed, huv] using hasSum_anisotropic_tail D u v hu hv huv

/-- The safe closed form is nonnegative on the bidisc of convergence. -/
theorem anisotropicTailClosed_nonneg
    (D : ℕ) (u v : ℝ) (hu0 : 0 ≤ u) (hv0 : 0 ≤ v)
    (hu : u < 1) (hv : v < 1) : 0 ≤ anisotropicTailClosed D u v := by
  have hsum := hasSum_anisotropic_tail_closed D u v
    (by simpa [abs_of_nonneg hu0]) (by simpa [abs_of_nonneg hv0])
  rw [← hsum.tsum_eq]
  exact tsum_nonneg fun k => Finset.sum_nonneg fun i hi =>
    mul_nonneg (pow_nonneg hu0 _) (pow_nonneg hv0 _)

/-- The exact anisotropic tail is monotone separately in both normalized
radii. -/
theorem anisotropicTailClosed_mono
    (D : ℕ) (u v u' v' : ℝ)
    (hu0 : 0 ≤ u) (hv0 : 0 ≤ v) (hu : u ≤ u') (hv : v ≤ v')
    (hu' : u' < 1) (hv' : v' < 1) :
    anisotropicTailClosed D u v ≤ anisotropicTailClosed D u' v' := by
  have hu'0 : 0 ≤ u' := hu0.trans hu
  have hv'0 : 0 ≤ v' := hv0.trans hv
  have hu1 : |u| < 1 := by rw [abs_of_nonneg hu0]; exact hu.trans_lt hu'
  have hv1 : |v| < 1 := by rw [abs_of_nonneg hv0]; exact hv.trans_lt hv'
  have hu1' : |u'| < 1 := by simpa [abs_of_nonneg hu'0]
  have hv1' : |v'| < 1 := by simpa [abs_of_nonneg hv'0]
  have hsum := hasSum_anisotropic_tail_closed D u v hu1 hv1
  have hsum' := hasSum_anisotropic_tail_closed D u' v' hu1' hv1'
  calc
    anisotropicTailClosed D u v = ∑' k : ℕ, homogeneousSlice (D + k) u v := hsum.tsum_eq.symm
    _ ≤ ∑' k : ℕ, homogeneousSlice (D + k) u' v' :=
      hsum.summable.tsum_le_tsum
        (fun k => homogeneousSlice_mono (D + k) u v u' v' hu0 hv0 hu hv)
        hsum'.summable
    _ = anisotropicTailClosed D u' v' := hsum'.tsum_eq

/-- The current diagonal tail is an upper bound for the exact anisotropic
tail whenever `u,v ≤ theta`. -/
theorem anisotropic_tail_le_diagonal
    (D : ℕ) (u v theta : ℝ)
    (hu0 : 0 ≤ u) (hv0 : 0 ≤ v) (hu : u ≤ theta) (hv : v ≤ theta)
    (htheta : theta < 1) (huv : u ≠ v) :
    (u ^ (D + 1) / (1 - u) - v ^ (D + 1) / (1 - v)) / (u - v) ≤
      theta ^ D * ((D + 1 : ℝ) - D * theta) / (1 - theta) ^ 2 := by
  have htheta0 : 0 ≤ theta := hu0.trans hu
  have hu1 : |u| < 1 := by rw [abs_of_nonneg hu0]; exact hu.trans_lt htheta
  have hv1 : |v| < 1 := by rw [abs_of_nonneg hv0]; exact hv.trans_lt htheta
  have ht1 : |theta| < 1 := by rw [abs_of_nonneg htheta0]; exact htheta
  have hAniso := hasSum_anisotropic_tail D u v hu1 hv1 huv
  have hDiag := hasSum_anisotropic_tail_diagonal D theta ht1
  calc
    (u ^ (D + 1) / (1 - u) - v ^ (D + 1) / (1 - v)) / (u - v) =
        ∑' k : ℕ, homogeneousSlice (D + k) u v := hAniso.tsum_eq.symm
    _ ≤ ∑' k : ℕ, homogeneousSlice (D + k) theta theta :=
      hAniso.summable.tsum_le_tsum
        (fun k => by
          rw [homogeneousSlice_diagonal]
          exact homogeneousSlice_le_diagonal (D + k) u v theta hu0 hv0 hu hv)
        hDiag.summable
    _ = theta ^ D * ((D + 1 : ℝ) - D * theta) / (1 - theta) ^ 2 := hDiag.tsum_eq

/-- The nested Cauchy coefficient: first in `z`, then in `c`. -/
def iteratedCauchyCoefficient
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc : ℝ) (i j : ℕ) :=
  cauchyPowerSeries
    (fun c => cauchyPowerSeries (fun z => F z c) 0 Rz i) 0 Rc j

/-- The actual vector-valued Taylor coefficient, obtained by evaluating both
multilinear coefficient maps on unit directions. -/
def iteratedCauchyCoefficientValue
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc : ℝ) (i j : ℕ) : E :=
  (iteratedCauchyCoefficient F Rz Rc i j (fun _ => 1)) (fun _ => 1)

/-- Evaluation on unit directions cannot increase the iterated operator norm. -/
theorem norm_iteratedCauchyCoefficientValue_le
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc : ℝ) (i j : ℕ) :
    ‖iteratedCauchyCoefficientValue F Rz Rc i j‖ ≤
      ‖iteratedCauchyCoefficient F Rz Rc i j‖ := by
  calc
    ‖iteratedCauchyCoefficientValue F Rz Rc i j‖ ≤
        ‖iteratedCauchyCoefficient F Rz Rc i j (fun _ => 1)‖ := by
      simpa [iteratedCauchyCoefficientValue] using
        (iteratedCauchyCoefficient F Rz Rc i j (fun _ => 1)).le_opNorm (fun _ => 1)
    _ ≤ ‖iteratedCauchyCoefficient F Rz Rc i j‖ := by
      have h := (iteratedCauchyCoefficient F Rz Rc i j).le_opNorm (fun _ => 1)
      exact h.trans_eq (by simp)

/-- Iterating the one-variable Cauchy estimate on the distinguished boundary
of the bidisc gives `M Rz⁻ⁱ Rc⁻ʲ`.  Integrability of the outer
coefficient section is explicit because it is the exact interface needed by
the second Cauchy integral. -/
theorem norm_iteratedCauchyCoefficient_le
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc M : ℝ) (i j : ℕ)
    (hinner : ∀ c ∈ sphere (0 : ℂ) |Rc|,
      CircleIntegrable (fun z => ‖F z c‖) 0 Rz)
    (houter : CircleIntegrable
      (fun c => ‖cauchyPowerSeries (fun z => F z c) 0 Rz i‖) 0 Rc)
    (hM : ∀ z ∈ sphere (0 : ℂ) |Rz|,
      ∀ c ∈ sphere (0 : ℂ) |Rc|, ‖F z c‖ ≤ M) :
    ‖iteratedCauchyCoefficient F Rz Rc i j‖ ≤
      M * |Rz|⁻¹ ^ i * |Rc|⁻¹ ^ j := by
  apply norm_cauchyPowerSeries_le_sup
      (fun c => cauchyPowerSeries (fun z => F z c) 0 Rz i)
      0 Rc (M * |Rz|⁻¹ ^ i) j houter
  intro c hc
  exact norm_cauchyPowerSeries_le_sup (fun z => F z c) 0 Rz M i
    (hinner c hc) (fun z hz => hM z hz c hc)

/-- The same anisotropic estimate for the actual vector-valued coefficient. -/
theorem norm_iteratedCauchyCoefficientValue_le_bound
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc M : ℝ) (i j : ℕ)
    (hinner : ∀ c ∈ sphere (0 : ℂ) |Rc|,
      CircleIntegrable (fun z => ‖F z c‖) 0 Rz)
    (houter : CircleIntegrable
      (fun c => ‖cauchyPowerSeries (fun z => F z c) 0 Rz i‖) 0 Rc)
    (hM : ∀ z ∈ sphere (0 : ℂ) |Rz|,
      ∀ c ∈ sphere (0 : ℂ) |Rc|, ‖F z c‖ ≤ M) :
    ‖iteratedCauchyCoefficientValue F Rz Rc i j‖ ≤
      M * |Rz|⁻¹ ^ i * |Rc|⁻¹ ^ j :=
  (norm_iteratedCauchyCoefficientValue_le F Rz Rc i j).trans
    (norm_iteratedCauchyCoefficient_le F Rz Rc M i j hinner houter hM)

/-- Multiplying an anisotropic coefficient estimate by an evaluation monomial
produces the normalized monomial `M (x/Rz)^i (y/Rc)^j`. -/
theorem anisotropic_monomial_le
    (A M Rz Rc x y : ℝ) (i j : ℕ)
    (hx : 0 ≤ x) (hy : 0 ≤ y)
    (hA : A ≤ M * Rz⁻¹ ^ i * Rc⁻¹ ^ j) :
    A * x ^ i * y ^ j ≤ M * (x / Rz) ^ i * (y / Rc) ^ j := by
  have hxy : 0 ≤ x ^ i * y ^ j := mul_nonneg (pow_nonneg hx i) (pow_nonneg hy j)
  calc
    A * x ^ i * y ^ j = A * (x ^ i * y ^ j) := by ring
    _ ≤ (M * Rz⁻¹ ^ i * Rc⁻¹ ^ j) * (x ^ i * y ^ j) :=
      mul_le_mul_of_nonneg_right hA hxy
    _ = M * (x / Rz) ^ i * (y / Rc) ^ j := by
      simp only [div_eq_mul_inv]
      ring

/-- Coefficientwise anisotropic Cauchy estimates bound a complete homogeneous
degree slice by `M` times its normalized slice. -/
theorem degreeSlice_le_anisotropic
    (A : ℕ → ℕ → ℝ) (M Rz Rc x y : ℝ) (d : ℕ)
    (hx : 0 ≤ x) (hy : 0 ≤ y)
    (hA : ∀ i j, A i j ≤ M * Rz⁻¹ ^ i * Rc⁻¹ ^ j) :
    degreeSlice A x y d ≤ M * homogeneousSlice d (x / Rz) (y / Rc) := by
  calc
    degreeSlice A x y d ≤
        ∑ i ∈ Finset.range (d + 1),
          M * (x / Rz) ^ i * (y / Rc) ^ (d - i) := by
      apply Finset.sum_le_sum
      intro i hi
      exact anisotropic_monomial_le (A i (d - i)) M Rz Rc x y i (d - i)
        hx hy (hA i (d - i))
    _ = M * homogeneousSlice d (x / Rz) (y / Rc) := by
      rw [homogeneousSlice, Finset.mul_sum]
      simp only [mul_assoc]

/-- Comparison theorem for any nonnegative tail dominated by the exact
anisotropic homogeneous slices. -/
theorem anisotropic_dominated_tail_le
    (slice : ℕ → ℝ) (M u v : ℝ) (D : ℕ)
    (hu : |u| < 1) (hv : |v| < 1) (huv : u ≠ v)
    (hslice0 : ∀ k, 0 ≤ slice (D + k))
    (hslice : ∀ k, slice (D + k) ≤ M * homogeneousSlice (D + k) u v) :
    (∑' k : ℕ, slice (D + k)) ≤
      M * ((u ^ (D + 1) / (1 - u) - v ^ (D + 1) / (1 - v)) / (u - v)) := by
  have hmajor := (hasSum_anisotropic_tail D u v hu hv huv).mul_left M
  have hsmall : Summable (fun k : ℕ => slice (D + k)) :=
    Summable.of_nonneg_of_le hslice0 hslice hmajor.summable
  exact (hsmall.tsum_le_tsum hslice hmajor.summable).trans_eq hmajor.tsum_eq

/-- Total comparison theorem using the numerically safe piecewise form. -/
theorem anisotropic_dominated_tail_closed_le
    (slice : ℕ → ℝ) (M u v : ℝ) (D : ℕ)
    (hu : |u| < 1) (hv : |v| < 1)
    (hslice0 : ∀ k, 0 ≤ slice (D + k))
    (hslice : ∀ k, slice (D + k) ≤ M * homogeneousSlice (D + k) u v) :
    (∑' k : ℕ, slice (D + k)) ≤ M * anisotropicTailClosed D u v := by
  have hmajor := (hasSum_anisotropic_tail_closed D u v hu hv).mul_left M
  have hsmall : Summable (fun k : ℕ => slice (D + k)) :=
    Summable.of_nonneg_of_le hslice0 hslice hmajor.summable
  exact (hsmall.tsum_le_tsum hslice hmajor.summable).trans_eq hmajor.tsum_eq

/-- Full anisotropic Cauchy tail from coefficient bounds. -/
theorem polydisc_cauchy_tail_le
    (A : ℕ → ℕ → ℝ) (M Rz Rc x y : ℝ) (D : ℕ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hA0 : ∀ i j, 0 ≤ A i j)
    (hA : ∀ i j, A i j ≤ M * Rz⁻¹ ^ i * Rc⁻¹ ^ j)
    (hu : |x / Rz| < 1) (hv : |y / Rc| < 1) (huv : x / Rz ≠ y / Rc) :
    (∑' k : ℕ, degreeSlice A x y (D + k)) ≤
      M * (((x / Rz) ^ (D + 1) / (1 - x / Rz) -
        (y / Rc) ^ (D + 1) / (1 - y / Rc)) / (x / Rz - y / Rc)) := by
  apply anisotropic_dominated_tail_le
      (fun d => degreeSlice A x y d) M (x / Rz) (y / Rc) D hu hv huv
  · intro k
    apply Finset.sum_nonneg
    intro i hi
    exact mul_nonneg (mul_nonneg (hA0 i (D + k - i)) (pow_nonneg hx _)) (pow_nonneg hy _)
  · intro k
    exact degreeSlice_le_anisotropic A M Rz Rc x y (D + k) hx hy hA

/-- Full coefficient-to-tail certificate, including the removable diagonal
case `x/Rz = y/Rc`. -/
theorem polydisc_cauchy_tail_closed_le
    (A : ℕ → ℕ → ℝ) (M Rz Rc x y : ℝ) (D : ℕ)
    (hx : 0 ≤ x) (hy : 0 ≤ y) (hA0 : ∀ i j, 0 ≤ A i j)
    (hA : ∀ i j, A i j ≤ M * Rz⁻¹ ^ i * Rc⁻¹ ^ j)
    (hu : |x / Rz| < 1) (hv : |y / Rc| < 1) :
    (∑' k : ℕ, degreeSlice A x y (D + k)) ≤
      M * anisotropicTailClosed D (x / Rz) (y / Rc) := by
  apply anisotropic_dominated_tail_closed_le
      (fun d => degreeSlice A x y d) M (x / Rz) (y / Rc) D hu hv
  · intro k
    apply Finset.sum_nonneg
    intro i hi
    exact mul_nonneg (mul_nonneg (hA0 i (D + k - i)) (pow_nonneg hx _)) (pow_nonneg hy _)
  · intro k
    exact degreeSlice_le_anisotropic A M Rz Rc x y (D + k) hx hy hA

/-- End-to-end bidisc tail for the norms of the iterated Cauchy coefficients. -/
theorem iteratedCauchy_polydisc_tail_le
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc M x y : ℝ) (D : ℕ)
    (hRz : 0 < Rz) (hRc : 0 < Rc) (hx : 0 ≤ x) (hy : 0 ≤ y)
    (hinner : ∀ c ∈ sphere (0 : ℂ) |Rc|,
      CircleIntegrable (fun z => ‖F z c‖) 0 Rz)
    (houter : ∀ i, CircleIntegrable
      (fun c => ‖cauchyPowerSeries (fun z => F z c) 0 Rz i‖) 0 Rc)
    (hM : ∀ z ∈ sphere (0 : ℂ) |Rz|,
      ∀ c ∈ sphere (0 : ℂ) |Rc|, ‖F z c‖ ≤ M)
    (hu : |x / Rz| < 1) (hv : |y / Rc| < 1) (huv : x / Rz ≠ y / Rc) :
    (∑' k : ℕ, degreeSlice
      (fun i j => ‖iteratedCauchyCoefficient F Rz Rc i j‖) x y (D + k)) ≤
      M * (((x / Rz) ^ (D + 1) / (1 - x / Rz) -
        (y / Rc) ^ (D + 1) / (1 - y / Rc)) / (x / Rz - y / Rc)) := by
  apply polydisc_cauchy_tail_le
  · exact hx
  · exact hy
  · intro i j
    exact norm_nonneg _
  · intro i j
    simpa [abs_of_pos hRz, abs_of_pos hRc] using
      norm_iteratedCauchyCoefficient_le F Rz Rc M i j hinner (houter i) hM
  · exact hu
  · exact hv
  · exact huv

/-- End-to-end bidisc certificate valid for all normalized radii, using the
safe diagonal branch when necessary. -/
theorem iteratedCauchy_polydisc_tail_closed_le
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc M x y : ℝ) (D : ℕ)
    (hRz : 0 < Rz) (hRc : 0 < Rc) (hx : 0 ≤ x) (hy : 0 ≤ y)
    (hinner : ∀ c ∈ sphere (0 : ℂ) |Rc|,
      CircleIntegrable (fun z => ‖F z c‖) 0 Rz)
    (houter : ∀ i, CircleIntegrable
      (fun c => ‖cauchyPowerSeries (fun z => F z c) 0 Rz i‖) 0 Rc)
    (hM : ∀ z ∈ sphere (0 : ℂ) |Rz|,
      ∀ c ∈ sphere (0 : ℂ) |Rc|, ‖F z c‖ ≤ M)
    (hu : |x / Rz| < 1) (hv : |y / Rc| < 1) :
    (∑' k : ℕ, degreeSlice
      (fun i j => ‖iteratedCauchyCoefficient F Rz Rc i j‖) x y (D + k)) ≤
      M * anisotropicTailClosed D (x / Rz) (y / Rc) := by
  apply polydisc_cauchy_tail_closed_le
  · exact hx
  · exact hy
  · intro i j
    exact norm_nonneg _
  · intro i j
    simpa [abs_of_pos hRz, abs_of_pos hRc] using
      norm_iteratedCauchyCoefficient_le F Rz Rc M i j hinner (houter i) hM
  · exact hu
  · exact hv

/-- End-to-end certificate stated for the actual vector-valued Taylor
coefficients rather than their enclosing multilinear maps. -/
theorem iteratedCauchyValue_polydisc_tail_closed_le
    {E : Type*} [NormedAddCommGroup E] [NormedSpace ℂ E]
    (F : ℂ → ℂ → E) (Rz Rc M x y : ℝ) (D : ℕ)
    (hRz : 0 < Rz) (hRc : 0 < Rc) (hx : 0 ≤ x) (hy : 0 ≤ y)
    (hinner : ∀ c ∈ sphere (0 : ℂ) |Rc|,
      CircleIntegrable (fun z => ‖F z c‖) 0 Rz)
    (houter : ∀ i, CircleIntegrable
      (fun c => ‖cauchyPowerSeries (fun z => F z c) 0 Rz i‖) 0 Rc)
    (hM : ∀ z ∈ sphere (0 : ℂ) |Rz|,
      ∀ c ∈ sphere (0 : ℂ) |Rc|, ‖F z c‖ ≤ M)
    (hu : |x / Rz| < 1) (hv : |y / Rc| < 1) :
    (∑' k : ℕ, degreeSlice
      (fun i j => ‖iteratedCauchyCoefficientValue F Rz Rc i j‖) x y (D + k)) ≤
      M * anisotropicTailClosed D (x / Rz) (y / Rc) := by
  apply polydisc_cauchy_tail_closed_le
  · exact hx
  · exact hy
  · intro i j
    exact norm_nonneg _
  · intro i j
    simpa [abs_of_pos hRz, abs_of_pos hRc] using
      norm_iteratedCauchyCoefficientValue_le_bound F Rz Rc M i j hinner (houter i) hM
  · exact hu
  · exact hv

end

end Mandelbrot
