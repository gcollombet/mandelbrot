/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Algebra
import Mathlib.Analysis.Complex.Basic
import Mathlib.Analysis.Convex.Jensen
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Tactic.Linarith

/-!
# Certified scalar bounds

These lemmas isolate the estimates used to turn a local rational residual into
a block error bound.  They deliberately make every sign and denominator
hypothesis explicit.
-/

namespace Mandelbrot

theorem exactStep_transport_norm (a x y c : ℂ) :
    ‖exactStep a y c - exactStep a x c‖ = ‖y - x‖ * ‖a + x + y‖ := by
  rw [exactStep_transport, norm_mul]

/-- The scalar majorant `‖a‖ r + r² + R_c` for one perturbation step. -/
theorem exactStep_norm_le (a z c : ℂ) (r Rc : ℝ)
    (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ Rc) :
    ‖exactStep a z c‖ ≤ ‖a‖ * r + r ^ 2 + Rc := by
  calc
    ‖exactStep a z c‖ = ‖(a * z + z ^ 2) + c‖ := by rfl
    _ ≤ ‖a * z‖ + ‖z ^ 2‖ + ‖c‖ := by
      exact (norm_add_le _ _).trans (add_le_add (norm_add_le _ _) le_rfl)
    _ = ‖a‖ * ‖z‖ + ‖z‖ ^ 2 + ‖c‖ := by rw [norm_mul, norm_pow]
    _ ≤ ‖a‖ * r + r ^ 2 + Rc := by
      have hr : 0 ≤ r := (norm_nonneg z).trans hz
      have hamul : ‖a‖ * ‖z‖ ≤ ‖a‖ * r :=
        mul_le_mul_of_nonneg_left hz (norm_nonneg a)
      have hzsq : ‖z‖ ^ 2 ≤ r ^ 2 := by
        simpa only [pow_two] using mul_self_le_mul_self (norm_nonneg z) hz
      linarith

/-- A sufficient absolute output radius for the exact two-stage composition. -/
theorem composed_radius_bound
    (r a1 a2 Rc r1 Rout : ℝ)
    (hr : 0 ≤ r) (ha1 : 0 ≤ a1) (ha2 : 0 ≤ a2) (hRc : 0 ≤ Rc)
    (hr1 : a1 * r + r ^ 2 + Rc ≤ r1)
    (hout : a2 * r1 + r1 ^ 2 + Rc ≤ Rout) :
    a2 * (a1 * r + r ^ 2 + Rc) + (a1 * r + r ^ 2 + Rc) ^ 2 + Rc ≤ Rout := by
  have hr1nonneg : 0 ≤ r1 := by
    have : 0 ≤ a1 * r + r ^ 2 + Rc := by positivity
    linarith
  have hmul := mul_le_mul_of_nonneg_left hr1 ha2
  have hbase : 0 ≤ a1 * r + r ^ 2 + Rc := by positivity
  have hsq : (a1 * r + r ^ 2 + Rc) ^ 2 ≤ r1 ^ 2 := by
    simpa only [pow_two] using mul_self_le_mul_self hbase hr1
  linarith

/-- Radius associated with error normalized by the Padé approximant. -/
theorem julia_pade_relative_radius (eps q : ℝ)
    (heps : 0 ≤ eps) (hq : 0 ≤ q) (hradius : q ≤ Real.sqrt eps) :
    q ^ 2 ≤ eps := by
  have hsqrt : 0 ≤ Real.sqrt eps := Real.sqrt_nonneg _
  have hsq : q ^ 2 ≤ (Real.sqrt eps) ^ 2 := (sq_le_sq₀ hq hsqrt).2 hradius
  rwa [Real.sq_sqrt heps] at hsq

/-- Smaller radius associated with error normalized by the true exact map. -/
theorem julia_exact_relative_radius (eps q : ℝ)
    (heps : 0 ≤ eps) (hq : 0 ≤ q)
    (hradius : q ≤ Real.sqrt (eps / (1 + eps))) :
    q ^ 2 / (1 - q ^ 2) ≤ eps := by
  have hone : 0 < 1 + eps := by linarith
  have hfrac : 0 ≤ eps / (1 + eps) := div_nonneg heps hone.le
  have hsqrt : 0 ≤ Real.sqrt (eps / (1 + eps)) := Real.sqrt_nonneg _
  have hq2 : q ^ 2 ≤ eps / (1 + eps) := by
    calc
      q ^ 2 ≤ (Real.sqrt (eps / (1 + eps))) ^ 2 := (sq_le_sq₀ hq hsqrt).2 hradius
      _ = eps / (1 + eps) := Real.sq_sqrt hfrac
  have hfrac_lt : eps / (1 + eps) < 1 := (div_lt_one hone).2 (by linarith)
  have hq2lt : q ^ 2 < 1 := hq2.trans_lt hfrac_lt
  rw [div_le_iff₀ (sub_pos.mpr hq2lt)]
  have hscaled := (le_div_iff₀ hone).mp hq2
  nlinarith

/-- Algebraic certificate behind the composed Julia radius
`r_y/(|A_x|+r_y|D_x|)`. -/
theorem mobius_intermediate_radius
    (A D ry x : ℝ) (hA : 0 < A) (hD : 0 ≤ D) (hry : 0 ≤ ry) (hx : 0 ≤ x)
    (hradius : x ≤ ry / (A + ry * D)) :
    A * x / (1 - D * x) ≤ ry := by
  have hsum : 0 < A + ry * D := by positivity
  have hscaled := (le_div_iff₀ hsum).mp hradius
  have hdx : D * x < 1 := by
    have : A * x + ry * (D * x) ≤ ry := by nlinarith
    by_cases hry0 : ry = 0
    · subst ry
      have hradius' : x ≤ 0 := by simpa using hradius
      have hx0 : x = 0 := le_antisymm hradius' hx
      subst x
      simp
    · have hrypos : 0 < ry := lt_of_le_of_ne hry (Ne.symm hry0)
      nlinarith [mul_nonneg hA.le hx]
  rw [div_le_iff₀ (sub_pos.mpr hdx)]
  nlinarith

/-- Inductive scalar enclosure for a whole exact perturbation orbit. -/
theorem scalar_majorant
    (a z : ℕ → ℂ) (c : ℂ) (rho : ℕ → ℝ) (Rc : ℝ)
    (hc : ‖c‖ ≤ Rc)
    (hz0 : ‖z 0‖ ≤ rho 0)
    (hzstep : ∀ n, z (n + 1) = exactStep (a n) (z n) c)
    (hrstep : ∀ n, rho (n + 1) = ‖a n‖ * rho n + (rho n) ^ 2 + Rc) :
    ∀ n, ‖z n‖ ≤ rho n ∧ 0 ≤ rho n := by
  have hRc : 0 ≤ Rc := (norm_nonneg c).trans hc
  intro n
  induction n with
  | zero => exact ⟨hz0, (norm_nonneg (z 0)).trans hz0⟩
  | succ n ih =>
      have hbound := exactStep_norm_le (a n) (z n) c (rho n) Rc ih.1 hc
      constructor
      · rw [hzstep n, hrstep n]
        exact hbound
      · rw [hrstep n]
        have hamul : 0 ≤ ‖a n‖ * rho n := mul_nonneg (norm_nonneg _) ih.2
        have hsquare : 0 ≤ rho n ^ 2 := sq_nonneg _
        linarith

/-- Runtime corollary used by the denominator-free periodic header: if the
scalar majorant after a grouped return is no larger than its entry radius,
then every exact perturbation admitted by that entry disk returns to it.  No
derivative or contraction hypothesis is required. -/
theorem scalar_majorant_return_le
    (a z : ℕ → ℂ) (c : ℂ) (rho : ℕ → ℝ) (Rc : ℝ) (p : ℕ)
    (hc : ‖c‖ ≤ Rc)
    (hz0 : ‖z 0‖ ≤ rho 0)
    (hzstep : ∀ n, z (n + 1) = exactStep (a n) (z n) c)
    (hrstep : ∀ n, rho (n + 1) = ‖a n‖ * rho n + (rho n) ^ 2 + Rc)
    (hreturn : rho p ≤ rho 0) :
    ‖z p‖ ≤ rho 0 := by
  exact (scalar_majorant a z c rho Rc hc hz0 hzstep hrstep p).1.trans hreturn

/-- Convex radial certificates need only the centre and boundary values. -/
theorem convex_radial_disk_certificate
    (h : ℝ → ℝ) (r x : ℝ)
    (hconv : ConvexOn ℝ (Set.Icc 0 r) h)
    (h0 : h 0 ≤ 0) (hr : h r ≤ 0) (hx : x ∈ Set.Icc 0 r) :
    h x ≤ 0 := by
  have hend : h x ≤ max (h 0) (h r) :=
    hconv.le_max_of_mem_Icc
      ⟨le_rfl, hx.1.trans hx.2⟩ ⟨hx.1.trans hx.2, le_rfl⟩ hx
  exact hend.trans (max_le h0 hr)

/-- Unrolling a constant-amplification error recurrence. -/
theorem affine_error_bound
    (rho : ℕ → ℝ) (eps gamma : ℝ)
    (heps : 0 ≤ eps) (hgamma : 0 ≤ gamma)
    (hzero : rho 0 ≤ 0)
    (hstep : ∀ n, rho (n + 1) ≤ eps + gamma * rho n) :
    ∀ n, rho n ≤ eps * ∑ k ∈ Finset.range n, gamma ^ k := by
  intro n
  induction n with
  | zero => simpa using hzero
  | succ n ih =>
      calc
        rho (n + 1) ≤ eps + gamma * rho n := hstep n
        _ ≤ eps + gamma * (eps * ∑ k ∈ Finset.range n, gamma ^ k) := by
          gcongr
        _ = eps * ∑ k ∈ Finset.range (n + 1), gamma ^ k := by
          have hgeom := geom_sum_mul_neg gamma n
          rw [Finset.sum_range_succ]
          nlinarith

/-- The contraction form of the previous bound, uniform in block length. -/
theorem affine_error_bound_contraction
    (rho : ℕ → ℝ) (eps gamma : ℝ)
    (heps : 0 ≤ eps) (hgamma : 0 ≤ gamma) (hlt : gamma < 1)
    (hzero : rho 0 ≤ 0)
    (hstep : ∀ n, rho (n + 1) ≤ eps + gamma * rho n) :
    ∀ n, rho n ≤ eps / (1 - gamma) := by
  intro n
  have hfinite := affine_error_bound rho eps gamma heps hgamma hzero hstep n
  have hgeom : (∑ k ∈ Finset.range n, gamma ^ k) ≤ 1 / (1 - gamma) := by
    have hden : 0 < 1 - gamma := sub_pos.mpr hlt
    have hpow : 0 ≤ gamma ^ n := pow_nonneg hgamma n
    rw [le_div_iff₀ hden]
    rw [geom_sum_mul_neg]
    nlinarith
  simpa [div_eq_mul_inv] using hfinite.trans (mul_le_mul_of_nonneg_left hgeom heps)

/-- Linear accumulation when a coordinate is translated rather than
contracted, as in a Fatou gate. -/
theorem translation_error_bound
    (rho : ℕ → ℝ) (eps : ℝ)
    (hzero : rho 0 ≤ 0) (hstep : ∀ n, rho (n + 1) ≤ rho n + eps) :
    ∀ n, rho n ≤ n * eps := by
  intro n
  induction n with
  | zero => simpa using hzero
  | succ n ih =>
      rw [Nat.cast_succ]
      calc
        rho (n + 1) ≤ rho n + eps := hstep n
        _ ≤ n * eps + eps := add_le_add ih le_rfl
        _ = ((n : ℝ) + 1) * eps := by ring

/-- Exit-chart distortion converts the accumulated coordinate error back to
an output-space error. -/
theorem fatou_exit_distortion (L eps : ℝ) (k : ℕ) :
    L * (k * eps) = (k : ℝ) * L * eps := by
  ring

/-- Exact closed form for the shifted Cauchy tail
`sum_k (D+k+1) θ^(D+k)`. -/
theorem hasSum_shifted_cauchy_tail (D : ℕ) (theta : ℝ)
    (htheta : |theta| < 1) :
    HasSum (fun k : ℕ => (D + k + 1 : ℝ) * theta ^ (D + k))
      (theta ^ D * ((D + 1 : ℝ) - D * theta) / (1 - theta) ^ 2) := by
  have h0 : HasSum (fun k : ℕ => theta ^ k) (1 / (1 - theta)) :=
    by simpa [div_eq_mul_inv, Real.norm_eq_abs] using
      (hasSum_geometric_of_norm_lt_one (ξ := theta) (by simpa [Real.norm_eq_abs] using htheta))
  have h1 : HasSum (fun k : ℕ => (k : ℝ) * theta ^ k)
      (theta / (1 - theta) ^ 2) :=
    hasSum_coe_mul_geometric_of_norm_lt_one htheta
  have hcomb := (h0.const_mul (D + 1 : ℝ)).add h1
  have hscaled := hcomb.const_mul (theta ^ D)
  have hseries :
      HasSum (fun k : ℕ => (D + k + 1 : ℝ) * theta ^ (D + k))
        (theta ^ D * ((D + 1 : ℝ) * (1 / (1 - theta)) +
          theta / (1 - theta) ^ 2)) := by
    apply hscaled.congr
    intro k
    rw [mul_add]
    rw [← mul_assoc, Finset.mul_sum]
    rw [Finset.mul_sum]
    rw [← Finset.sum_add_distrib]
    apply Finset.sum_congr rfl
    intro x hx
    push_cast
    rw [pow_add]
    ring
  have hden : 1 - theta ≠ 0 := by
    apply sub_ne_zero.mpr
    intro h
    have : theta = 1 := h.symm
    subst theta
    norm_num at htheta
  have hvalue :
      theta ^ D * ((D + 1 : ℝ) * (1 / (1 - theta)) + theta / (1 - theta) ^ 2) =
        theta ^ D * ((D + 1 : ℝ) - D * theta) / (1 - theta) ^ 2 := by
    field_simp [hden]
    ring
  rw [← hvalue]
  exact hseries

end Mandelbrot
