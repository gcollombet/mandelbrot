/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.ParabolicSuperconvergence
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Non-autonomous Padé shadowing

Every perturbation step is `F_j(z,c)=a_j z+z²+c`.  Its one-step Padé model is
a homography even when `a_j` varies and `c` is nonzero.  This file transports
the exact local defects through the remaining homographic tail and telescopes
them without a uniform Lipschitz factor.
-/

namespace Mandelbrot

noncomputable section

section Field

variable {K : Type*} [Field K]

@[ext]
structure Homography (K : Type*) where
  A : K
  B : K
  C : K
  D : K

def Homography.eval (m : Homography K) (z : K) : K :=
  (m.A * z + m.B) / (m.C * z + m.D)

def Homography.den (m : Homography K) (z : K) : K :=
  m.C * z + m.D

def Homography.det (m : Homography K) : K :=
  m.A * m.D - m.B * m.C

/-- `outer.comp inner` represents `outer ∘ inner`. -/
def Homography.comp (outer inner : Homography K) : Homography K where
  A := outer.A * inner.A + outer.B * inner.C
  B := outer.A * inner.B + outer.B * inner.D
  C := outer.C * inner.A + outer.D * inner.C
  D := outer.C * inner.B + outer.D * inner.D

def Homography.one : Homography K where
  A := 1
  B := 0
  C := 0
  D := 1

/-- Matrix of the one-step Padé model
`a(az+c)/(a-z)`. -/
def padeStepHomography (a c : K) : Homography K where
  A := a ^ 2
  B := a * c
  C := -1
  D := a

@[simp] theorem Homography.eval_one (z : K) : Homography.one.eval z = z := by
  simp [Homography.eval, Homography.one]

@[simp] theorem Homography.den_one (z : K) : Homography.one.den z = 1 := by
  simp [Homography.den, Homography.one]

theorem padeStepHomography_den (a c z : K) :
    (padeStepHomography a c).den z = a - z := by
  simp [Homography.den, padeStepHomography]
  ring

theorem padeStepHomography_eval (a c z : K) :
    (padeStepHomography a c).eval z = padeSeed a z c := by
  simp only [Homography.eval, padeStepHomography, padeSeed]
  congr 1 <;> ring

theorem Homography.den_comp
    (outer inner : Homography K) (z : K)
    (hinner : inner.den z ≠ 0) :
    (outer.comp inner).den z = outer.den (inner.eval z) * inner.den z := by
  change inner.C * z + inner.D ≠ 0 at hinner
  simp only [Homography.den, Homography.eval, Homography.comp]
  calc
    (outer.C * inner.A + outer.D * inner.C) * z +
        (outer.C * inner.B + outer.D * inner.D) =
      outer.C * (inner.A * z + inner.B) +
        outer.D * (inner.C * z + inner.D) := by ring
    _ = (outer.C * ((inner.A * z + inner.B) / (inner.C * z + inner.D)) +
        outer.D) * (inner.C * z + inner.D) := by
      rw [add_mul, mul_assoc, div_mul_cancel₀ _ hinner]

theorem Homography.eval_comp
    (outer inner : Homography K) (z : K)
    (hinner : inner.den z ≠ 0) :
    (outer.comp inner).eval z = outer.eval (inner.eval z) := by
  have hinner' : z * inner.C + inner.D ≠ 0 := by
    simpa [Homography.den, mul_comm] using hinner
  simp only [Homography.eval, Homography.den, Homography.comp] at hinner ⊢
  field_simp [hinner, hinner']
  ring

theorem Homography.det_comp (outer inner : Homography K) :
    (outer.comp inner).det = outer.det * inner.det := by
  simp only [Homography.det, Homography.comp]
  ring

/-- Exact two-point transport by a homography. -/
theorem Homography.eval_sub_eval
    (m : Homography K) (u v : K)
    (hu : m.den u ≠ 0) (hv : m.den v ≠ 0) :
    m.eval u - m.eval v =
      (u - v) * m.det / (m.den u * m.den v) := by
  change m.C * u + m.D ≠ 0 at hu
  change m.C * v + m.D ≠ 0 at hv
  simp only [Homography.eval, Homography.den, Homography.det]
  rw [div_sub_div _ _ hu hv]
  congr 1
  ring

/-- Exact local Padé defect after transport by the remaining tail. -/
def nonautonomousTransportedDefect
    (tail : Homography K) (a z c : K) : K :=
  (z * (z ^ 2 + c) / (a - z)) * tail.det /
    (tail.den (padeSeed a z c) * tail.den (exactStep a z c))

theorem homography_transport_pade_defect
    (tail : Homography K) (a z c : K)
    (hloc : a - z ≠ 0)
    (hpade : tail.den (padeSeed a z c) ≠ 0)
    (hexact : tail.den (exactStep a z c) ≠ 0) :
    tail.eval (padeSeed a z c) - tail.eval (exactStep a z c) =
      nonautonomousTransportedDefect tail a z c := by
  rw [Homography.eval_sub_eval tail _ _ hpade hexact,
    padeSeed_sub_exactStep a z c hloc]
  rfl

/-- A backward tail-matrix certificate. `tail j` is the composition of the
one-step Padé maps from `j` through `n-1`; `tail n` is the identity. -/
def IsPadeTail
    (tail : ℕ → Homography K) (a : ℕ → K) (c : K) (n : ℕ) : Prop :=
  tail n = Homography.one ∧
    ∀ j, j < n → tail j = (tail (j + 1)).comp (padeStepHomography (a j) c)

/-- Backward product of `length` consecutive Padé matrices starting at
`start`. -/
def padeTailSegment (a : ℕ → K) (c : K) (start : ℕ) : ℕ → Homography K
  | 0 => Homography.one
  | length + 1 =>
      (padeTailSegment a c (start + 1) length).comp
        (padeStepHomography (a start) c)

/-- Canonical tail matrix for a block ending at `n`. -/
def canonicalPadeTail (a : ℕ → K) (c : K) (n j : ℕ) : Homography K :=
  padeTailSegment a c j (n - j)

theorem canonicalPadeTail_isPadeTail (a : ℕ → K) (c : K) (n : ℕ) :
    IsPadeTail (canonicalPadeTail a c n) a c n := by
  constructor
  · simp [canonicalPadeTail, padeTailSegment]
  · intro j hj
    have hlen : n - j = (n - (j + 1)) + 1 := by omega
    change padeTailSegment a c j (n - j) =
      (padeTailSegment a c (j + 1) (n - (j + 1))).comp
        (padeStepHomography (a j) c)
    rw [hlen]
    rfl

/-- Exact non-autonomous telescoping formula.  It simultaneously allows
variable linear coefficients `a_j` and a nonzero fixed parameter `c`. -/
theorem nonautonomous_pade_telescope
    (tail : ℕ → Homography K) (a : ℕ → K) (c : K)
    (x : ℕ → K) (n : ℕ)
    (htail : IsPadeTail tail a c n)
    (hstep : ∀ j, x (j + 1) = exactStep (a j) (x j) c)
    (hloc : ∀ j, j < n → a j - x j ≠ 0)
    (hpade : ∀ j, j < n →
      (tail (j + 1)).den (padeSeed (a j) (x j) c) ≠ 0)
    (hexact : ∀ j, j < n →
      (tail (j + 1)).den (exactStep (a j) (x j) c) ≠ 0) :
    (tail 0).eval (x 0) - x n =
      ∑ j ∈ Finset.range n,
        nonautonomousTransportedDefect (tail (j + 1)) (a j) (x j) c := by
  let H : ℕ → K := fun j => (tail j).eval (x j)
  calc
    (tail 0).eval (x 0) - x n = H 0 - H n := by
      dsimp only [H]
      rw [htail.1]
      simp
    _ = ∑ j ∈ Finset.range n, (H j - H (j + 1)) := by
      symm
      exact Finset.sum_range_sub' H n
    _ = ∑ j ∈ Finset.range n,
        nonautonomousTransportedDefect (tail (j + 1)) (a j) (x j) c := by
      apply Finset.sum_congr rfl
      intro j hj
      have hjn : j < n := Finset.mem_range.mp hj
      dsimp only [H]
      rw [htail.2 j hjn]
      rw [Homography.eval_comp]
      · rw [padeStepHomography_eval, hstep j]
        exact homography_transport_pade_defect (tail (j + 1))
          (a j) (x j) c (hloc j hjn) (hpade j hjn) (hexact j hjn)
      · rw [padeStepHomography_den]
        exact hloc j hjn

end Field

section ComplexBounds

open Complex

/-- Scalar envelope for the exact non-autonomous perturbation orbit. -/
theorem nonautonomous_radius_encloses_orbit
    (a x : ℕ → ℂ) (c : ℂ) (r : ℕ → ℝ) (y : ℝ)
    (hstep : ∀ j, x (j + 1) = exactStep (a j) (x j) c)
    (hrstep : ∀ j, r (j + 1) = ‖a j‖ * r j + r j ^ 2 + y)
    (_hr : ∀ j, 0 ≤ r j) (_hy : 0 ≤ y) (hc : ‖c‖ ≤ y)
    (hstart : ‖x 0‖ ≤ r 0) :
    ∀ j, ‖x j‖ ≤ r j := by
  intro j
  induction j with
  | zero => exact hstart
  | succ j ih =>
      rw [hstep j, hrstep j]
      exact exactStep_norm_le (a j) (x j) c (r j) y ih hc

/-- Lower denominator margin of any homography on a disk. -/
theorem Homography.den_lower
    (m : Homography ℂ) (z : ℂ) (R : ℝ)
    (_hR : 0 ≤ R) (hz : ‖z‖ ≤ R) :
    ‖m.D‖ - ‖m.C‖ * R ≤ ‖m.den z‖ := by
  have hreverse : ‖m.D‖ - ‖m.C * z‖ ≤ ‖m.C * z + m.D‖ := by
    have h := norm_sub_norm_le m.D (-m.C * z)
    simpa [sub_eq_add_neg, add_comm, add_left_comm, add_assoc] using h
  rw [norm_mul] at hreverse
  exact (sub_le_sub_left (mul_le_mul_of_nonneg_left hz (norm_nonneg m.C)) ‖m.D‖).trans
    hreverse

/-- One-step exact output bound. -/
def exactStepOutputBound (a : ℂ) (r y : ℝ) : ℝ :=
  ‖a‖ * r + r ^ 2 + y

/-- One-step Padé output bound under `r < |a|`. -/
def padeStepOutputBound (a : ℂ) (r y : ℝ) : ℝ :=
  ‖a‖ * (‖a‖ * r + y) / (‖a‖ - r)

theorem norm_padeSeed_le_outputBound
    (a z c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y)
    (hmargin : 0 < ‖a‖ - r) :
    ‖padeSeed a z c‖ ≤ padeStepOutputBound a r y := by
  have hdenLower : ‖a‖ - r ≤ ‖a - z‖ := by
    have hreverse := norm_sub_norm_le a z
    linarith
  have hdenPos : 0 < ‖a - z‖ := hmargin.trans_le hdenLower
  have hnum : ‖a * z + c‖ ≤ ‖a‖ * r + y := by
    calc
      ‖a * z + c‖ ≤ ‖a * z‖ + ‖c‖ := norm_add_le _ _
      _ = ‖a‖ * ‖z‖ + ‖c‖ := by rw [norm_mul]
      _ ≤ ‖a‖ * r + y := add_le_add
        (mul_le_mul_of_nonneg_left hz (norm_nonneg a)) hc
  simp only [padeSeed, norm_div, norm_mul, padeStepOutputBound]
  have htop : ‖a‖ * ‖a * z + c‖ ≤ ‖a‖ * (‖a‖ * r + y) :=
    mul_le_mul_of_nonneg_left hnum (norm_nonneg a)
  exact div_le_div₀ (mul_nonneg (norm_nonneg a)
    (add_nonneg (mul_nonneg (norm_nonneg a) hr) hy)) htop hmargin hdenLower

/-- Computable lower margin for a tail denominator at the Padé output. -/
def padeTailDenMargin (tail : Homography ℂ) (a : ℂ) (r y : ℝ) : ℝ :=
  ‖tail.D‖ - ‖tail.C‖ * padeStepOutputBound a r y

/-- Computable lower margin for a tail denominator at the exact output. -/
def exactTailDenMargin (tail : Homography ℂ) (a : ℂ) (r y : ℝ) : ℝ :=
  ‖tail.D‖ - ‖tail.C‖ * exactStepOutputBound a r y

theorem padeTailDenMargin_le
    (tail : Homography ℂ) (a z c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y)
    (hmargin : 0 < ‖a‖ - r) :
    padeTailDenMargin tail a r y ≤ ‖tail.den (padeSeed a z c)‖ := by
  apply Homography.den_lower tail _ (padeStepOutputBound a r y)
  · exact div_nonneg
      (mul_nonneg (norm_nonneg a)
        (add_nonneg (mul_nonneg (norm_nonneg a) hr) hy))
      hmargin.le
  · exact norm_padeSeed_le_outputBound a z c r y hr hy hz hc hmargin

theorem exactTailDenMargin_le
    (tail : Homography ℂ) (a z c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y) :
    exactTailDenMargin tail a r y ≤ ‖tail.den (exactStep a z c)‖ := by
  apply Homography.den_lower tail _ (exactStepOutputBound a r y)
  · exact add_nonneg (add_nonneg (mul_nonneg (norm_nonneg a) hr) (sq_nonneg r))
      ((norm_nonneg c).trans hc)
  · exact exactStep_norm_le a z c r y hz hc

/-- Scalar majorant of one exactly transported non-autonomous defect. -/
def nonautonomousTransportMajorant
    (tail : Homography ℂ) (a : ℂ) (r y : ℝ) : ℝ :=
  let localBound := r * (r ^ 2 + y) / (‖a‖ - r)
  localBound * ‖tail.det‖ /
    (padeTailDenMargin tail a r y * exactTailDenMargin tail a r y)

theorem norm_nonautonomousTransportedDefect_le
    (tail : Homography ℂ) (a z c : ℂ) (r y : ℝ)
    (hr : 0 ≤ r) (hy : 0 ≤ y) (hz : ‖z‖ ≤ r) (hc : ‖c‖ ≤ y)
    (hloc : 0 < ‖a‖ - r)
    (hpade : 0 < padeTailDenMargin tail a r y)
    (hexact : 0 < exactTailDenMargin tail a r y) :
    ‖nonautonomousTransportedDefect tail a z c‖ ≤
      nonautonomousTransportMajorant tail a r y := by
  have hlocalDen : ‖a‖ - r ≤ ‖a - z‖ := by
    have hreverse := norm_sub_norm_le a z
    linarith
  have hlocalNum : ‖z * (z ^ 2 + c)‖ ≤ r * (r ^ 2 + y) := by
    rw [norm_mul]
    calc
      ‖z‖ * ‖z ^ 2 + c‖ ≤ r * (r ^ 2 + y) := by
        apply mul_le_mul hz
        · calc
            ‖z ^ 2 + c‖ ≤ ‖z ^ 2‖ + ‖c‖ := norm_add_le _ _
            _ = ‖z‖ ^ 2 + ‖c‖ := by rw [norm_pow]
            _ ≤ r ^ 2 + y := by nlinarith [norm_nonneg z]
        · exact norm_nonneg _
        · positivity
      _ = r * (r ^ 2 + y) := rfl
  have hlocal : ‖z * (z ^ 2 + c) / (a - z)‖ ≤
      r * (r ^ 2 + y) / (‖a‖ - r) := by
    rw [norm_div]
    exact div_le_div₀ (mul_nonneg hr (add_nonneg (sq_nonneg r) hy))
      hlocalNum hloc hlocalDen
  have hpadeLower := padeTailDenMargin_le tail a z c r y hr hy hz hc hloc
  have hexactLower := exactTailDenMargin_le tail a z c r y hr hz hc
  have hdenProd :
      padeTailDenMargin tail a r y * exactTailDenMargin tail a r y ≤
        ‖tail.den (padeSeed a z c)‖ * ‖tail.den (exactStep a z c)‖ :=
    mul_le_mul hpadeLower hexactLower hexact.le
      (hpade.trans_le hpadeLower).le
  have hmarginProd : 0 <
      padeTailDenMargin tail a r y * exactTailDenMargin tail a r y :=
    mul_pos hpade hexact
  have hlocal' : ‖z‖ * ‖z ^ 2 + c‖ / ‖a - z‖ ≤
      r * (r ^ 2 + y) / (‖a‖ - r) := by
    simpa only [norm_div, norm_mul] using hlocal
  simp only [nonautonomousTransportedDefect, nonautonomousTransportMajorant,
    norm_div, norm_mul]
  exact div_le_div₀
    (mul_nonneg (div_nonneg (mul_nonneg hr (add_nonneg (sq_nonneg r) hy)) hloc.le)
      (norm_nonneg tail.det))
    (mul_le_mul_of_nonneg_right hlocal' (norm_nonneg tail.det))
    hmarginProd hdenProd

/-- Sum of the computable transported-defect majorants. -/
def nonautonomousPadeMajorant
    (tail : ℕ → Homography ℂ) (a : ℕ → ℂ)
    (r : ℕ → ℝ) (y : ℝ) (n : ℕ) : ℝ :=
  ∑ j ∈ Finset.range n,
    nonautonomousTransportMajorant (tail (j + 1)) (a j) (r j) y

/-- End-to-end exact-arithmetic certificate for variable `a_j` and nonzero
`c`, with every denominator margin computed from the tail matrices and the
scalar orbit envelopes. -/
theorem nonautonomous_pade_shadowing_bound
    (tail : ℕ → Homography ℂ) (a : ℕ → ℂ) (c : ℂ)
    (x : ℕ → ℂ) (r : ℕ → ℝ) (y : ℝ) (n : ℕ)
    (htail : IsPadeTail tail a c n)
    (hstep : ∀ j, x (j + 1) = exactStep (a j) (x j) c)
    (hr : ∀ j, j < n → 0 ≤ r j) (hy : 0 ≤ y) (hc : ‖c‖ ≤ y)
    (hx : ∀ j, j < n → ‖x j‖ ≤ r j)
    (hloc : ∀ j, j < n → 0 < ‖a j‖ - r j)
    (hpade : ∀ j, j < n →
      0 < padeTailDenMargin (tail (j + 1)) (a j) (r j) y)
    (hexact : ∀ j, j < n →
      0 < exactTailDenMargin (tail (j + 1)) (a j) (r j) y) :
    ‖(tail 0).eval (x 0) - x n‖ ≤
      nonautonomousPadeMajorant tail a r y n := by
  have hlocNe : ∀ j, j < n → a j - x j ≠ 0 := by
    intro j hj
    apply norm_pos_iff.mp
    have hreverse := norm_sub_norm_le (a j) (x j)
    exact (hloc j hj).trans_le ((sub_le_sub_left (hx j hj) ‖a j‖).trans hreverse)
  have hpadeNe : ∀ j, j < n →
      (tail (j + 1)).den (padeSeed (a j) (x j) c) ≠ 0 := by
    intro j hj
    apply norm_pos_iff.mp
    exact (hpade j hj).trans_le
      (padeTailDenMargin_le (tail (j + 1)) (a j) (x j) c (r j) y
        (hr j hj) hy (hx j hj) hc (hloc j hj))
  have hexactNe : ∀ j, j < n →
      (tail (j + 1)).den (exactStep (a j) (x j) c) ≠ 0 := by
    intro j hj
    apply norm_pos_iff.mp
    exact (hexact j hj).trans_le
      (exactTailDenMargin_le (tail (j + 1)) (a j) (x j) c (r j) y
        (hr j hj) (hx j hj) hc)
  rw [nonautonomous_pade_telescope tail a c x n htail hstep hlocNe hpadeNe hexactNe]
  calc
    ‖∑ j ∈ Finset.range n,
        nonautonomousTransportedDefect (tail (j + 1)) (a j) (x j) c‖ ≤
      ∑ j ∈ Finset.range n,
        ‖nonautonomousTransportedDefect (tail (j + 1)) (a j) (x j) c‖ :=
      norm_sum_le _ _
    _ ≤ ∑ j ∈ Finset.range n,
        nonautonomousTransportMajorant (tail (j + 1)) (a j) (r j) y := by
      apply Finset.sum_le_sum
      intro j hj
      have hjn : j < n := Finset.mem_range.mp hj
      exact norm_nonautonomousTransportedDefect_le
        (tail (j + 1)) (a j) (x j) c (r j) y
        (hr j hjn) hy (hx j hjn) hc (hloc j hjn) (hpade j hjn) (hexact j hjn)
    _ = nonautonomousPadeMajorant tail a r y n := rfl

end ComplexBounds

end

end Mandelbrot
