/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FeigenbaumFiniteReturn

/-!
# Kernel replay of finite-return inclusions (pilot)

The dyadic certificates exported by the Rust builder must be replayed inside
the Lean kernel to mint a runtime token.  This file provides the exact
computation layer and closes the pilot: at a dyadic cell center the whole
pipeline — critical orbit, gauge, finite return, Chebyshev model — is exact
dyadic arithmetic (no rounding, no enclosures), and every norm comparison
happens on exact `normSq` values, so the final checks are single `decide`
calls.

The computation layer works on `Dyadic = ⟨num : ℤ, exp : ℕ⟩` (value
`num / 2^exp`) rather than `ℚ`: every operation reduces to `Int`/`Nat`
primitives the kernel evaluates natively, whereas `Rat` arithmetic gets
stuck in kernel reduction.  Every finite `f64` is exactly such a dyadic.

Concretely, `pilot_cell_inclusion` is a kernel-checked bound on the distance
between the actual normalized return `G₂ = normalizedReturn c 4` of the
quadratic family at the Feigenbaum parameter and the concrete stored model
`chebyshevLimitModel`, at the cell center `1/32 + i/32` of the level-2
census.  This is the `FiniteGridWitness.samples` obligation for one cell,
with the kernel as the only computer.

Cell-wide obligations (variation, derivative, curvature) additionally need
dyadic square-root upper bounds for the envelope recurrences; they reuse
this file's arithmetic and are the next increment.
-/

namespace Mandelbrot

namespace FeigenbaumRationalReplay

open FeigenbaumFiniteReturn

/-! ## Exact dyadic arithmetic on `Int`/`Nat` primitives -/

/-- Exact dyadic rational `num / 2^exp`.  Not canonical (⟨2,1⟩ and ⟨1,0⟩
denote the same value): all reasoning happens through `toReal`. -/
structure Dyadic where
  num : ℤ
  exp : ℕ

namespace Dyadic

noncomputable def toReal (d : Dyadic) : ℝ := (d.num : ℝ) / 2 ^ d.exp

/-- Shift left: multiply by `2^k`, exactly.  Uses `Nat.shiftLeft` (`1 <<< k`)
rather than `Nat.pow`: the kernel reduces `shiftLeft` with GMP in O(1) and,
unlike `2 ^ k`, it is not blocked by the elaborator's exponentiation guard.
This is what lets `decide` evaluate the thousand-bit exact orbit. -/
def shl (n : ℤ) (k : ℕ) : ℤ := n * ((1 <<< k : ℕ) : ℤ)

theorem shl_cast (n : ℤ) (k : ℕ) : ((shl n k : ℤ) : ℝ) = (n : ℝ) * 2 ^ k := by
  have hpow : (1 <<< k : ℕ) = 2 ^ k := by rw [Nat.shiftLeft_eq, one_mul]
  simp only [shl, hpow]
  push_cast
  ring

def mul (a b : Dyadic) : Dyadic := ⟨a.num * b.num, a.exp + b.exp⟩

def neg (a : Dyadic) : Dyadic := ⟨-a.num, a.exp⟩

def add (a b : Dyadic) : Dyadic :=
  ⟨shl a.num (max a.exp b.exp - a.exp) + shl b.num (max a.exp b.exp - b.exp),
    max a.exp b.exp⟩

def sub (a b : Dyadic) : Dyadic := a.add b.neg

/-- Value-level order through exact alignment; decidable by pure `Int`
comparison, which the kernel reduces natively. -/
def Le (a b : Dyadic) : Prop :=
  shl a.num (max a.exp b.exp - a.exp) ≤ shl b.num (max a.exp b.exp - b.exp)

instance decLe (a b : Dyadic) : Decidable (a.Le b) :=
  inferInstanceAs (Decidable (_ ≤ _))

/-- Re-express `num / 2^e` over the common denominator `2^E`, `e ≤ E`. -/
theorem toReal_align (d : Dyadic) {E : ℕ} (h : d.exp ≤ E) :
    d.toReal = ((shl d.num (E - d.exp) : ℤ) : ℝ) / 2 ^ E := by
  rw [toReal, shl_cast]
  have hpow : (2 : ℝ) ^ (E - d.exp) * 2 ^ d.exp = 2 ^ E := by
    rw [← pow_add, Nat.sub_add_cancel h]
  rw [← hpow]
  have h1 : (2 : ℝ) ^ d.exp ≠ 0 := by positivity
  have h2 : (2 : ℝ) ^ (E - d.exp) ≠ 0 := by positivity
  field_simp

theorem toReal_mul (a b : Dyadic) :
    (a.mul b).toReal = a.toReal * b.toReal := by
  simp only [mul, toReal]
  push_cast
  rw [pow_add]
  have h1 : (2 : ℝ) ^ a.exp ≠ 0 := by positivity
  have h2 : (2 : ℝ) ^ b.exp ≠ 0 := by positivity
  field_simp

theorem toReal_neg (a : Dyadic) : a.neg.toReal = -a.toReal := by
  simp [neg, toReal, neg_div]

theorem toReal_add (a b : Dyadic) :
    (a.add b).toReal = a.toReal + b.toReal := by
  have ha := a.toReal_align (le_max_left a.exp b.exp)
  have hb := b.toReal_align (le_max_right a.exp b.exp)
  have hE : (a.add b).toReal =
      (((shl a.num (max a.exp b.exp - a.exp) : ℤ) : ℝ) +
        ((shl b.num (max a.exp b.exp - b.exp) : ℤ) : ℝ)) /
        2 ^ max a.exp b.exp := by
    simp only [add, toReal]
    push_cast
    ring
  rw [hE, ha, hb, add_div]

theorem toReal_sub (a b : Dyadic) :
    (a.sub b).toReal = a.toReal - b.toReal := by
  rw [sub, toReal_add, toReal_neg]
  ring

theorem Le.toReal_le {a b : Dyadic} (h : a.Le b) : a.toReal ≤ b.toReal := by
  rw [a.toReal_align (le_max_left a.exp b.exp),
    b.toReal_align (le_max_right a.exp b.exp)]
  gcongr
  exact_mod_cast h

theorem toReal_nonneg {a : Dyadic} (h : 0 ≤ a.num) : 0 ≤ a.toReal := by
  rw [toReal]
  positivity

end Dyadic

/-! ## Exact dyadic complex arithmetic -/

/-- A complex number with exact dyadic coordinates. -/
structure DyC where
  re : Dyadic
  im : Dyadic

namespace DyC

noncomputable def toComplex (z : DyC) : ℂ :=
  (z.re.toReal : ℂ) + (z.im.toReal : ℂ) * Complex.I

@[simp] theorem toComplex_re (z : DyC) : z.toComplex.re = z.re.toReal := by
  simp [toComplex]

@[simp] theorem toComplex_im (z : DyC) : z.toComplex.im = z.im.toReal := by
  simp [toComplex]

protected def zero : DyC := ⟨⟨0, 0⟩, ⟨0, 0⟩⟩

def ofDyadic (d : Dyadic) : DyC := ⟨d, ⟨0, 0⟩⟩

def add (a b : DyC) : DyC := ⟨a.re.add b.re, a.im.add b.im⟩

def sub (a b : DyC) : DyC := ⟨a.re.sub b.re, a.im.sub b.im⟩

def mul (a b : DyC) : DyC :=
  ⟨(a.re.mul b.re).sub (a.im.mul b.im),
    (a.re.mul b.im).add (a.im.mul b.re)⟩

/-- Exact `‖·‖²`; every norm comparison happens on this value. -/
def normSq (z : DyC) : Dyadic := (z.re.mul z.re).add (z.im.mul z.im)

theorem toComplex_zero : DyC.zero.toComplex = 0 := by
  apply Complex.ext <;> simp [DyC.zero, Dyadic.toReal]

theorem toComplex_ofDyadic (d : Dyadic) :
    (ofDyadic d).toComplex = ((d.toReal : ℝ) : ℂ) := by
  have hzero : (Dyadic.toReal ⟨0, 0⟩ : ℝ) = 0 := by norm_num [Dyadic.toReal]
  simp only [toComplex, ofDyadic, hzero]
  simp

theorem toComplex_add (a b : DyC) :
    (a.add b).toComplex = a.toComplex + b.toComplex := by
  apply Complex.ext <;> simp [add, Dyadic.toReal_add]

theorem toComplex_sub (a b : DyC) :
    (a.sub b).toComplex = a.toComplex - b.toComplex := by
  apply Complex.ext <;> simp [sub, Dyadic.toReal_sub]

theorem toComplex_mul (a b : DyC) :
    (a.mul b).toComplex = a.toComplex * b.toComplex := by
  apply Complex.ext <;>
    simp [mul, Complex.mul_re, Complex.mul_im, Dyadic.toReal_add,
      Dyadic.toReal_sub, Dyadic.toReal_mul]

theorem normSq_toComplex (z : DyC) :
    Complex.normSq z.toComplex = z.normSq.toReal := by
  rw [Complex.normSq_apply, normSq, Dyadic.toReal_add, Dyadic.toReal_mul,
    Dyadic.toReal_mul]
  simp

/-- A dyadic check on `normSq` yields a real norm upper bound. -/
theorem norm_le_of_normSq_le {z : DyC} {q : Dyadic} (hq : 0 ≤ q.num)
    (hCheck : z.normSq.Le (q.mul q)) : ‖z.toComplex‖ ≤ q.toReal := by
  have hSq : ‖z.toComplex‖ ^ 2 ≤ q.toReal ^ 2 := by
    rw [← Complex.normSq_eq_norm_sq, normSq_toComplex]
    calc z.normSq.toReal ≤ (q.mul q).toReal := hCheck.toReal_le
      _ = q.toReal ^ 2 := by rw [Dyadic.toReal_mul]; ring
  have hqR : 0 ≤ q.toReal := Dyadic.toReal_nonneg hq
  nlinarith [norm_nonneg z.toComplex]

/-- A dyadic check on `normSq` yields a real norm lower bound. -/
theorem le_norm_of_le_normSq {z : DyC} {q : Dyadic} (hq : 0 ≤ q.num)
    (hCheck : (q.mul q).Le z.normSq) : q.toReal ≤ ‖z.toComplex‖ := by
  have hSq : q.toReal ^ 2 ≤ ‖z.toComplex‖ ^ 2 := by
    rw [← Complex.normSq_eq_norm_sq, normSq_toComplex]
    calc q.toReal ^ 2 = (q.mul q).toReal := by rw [Dyadic.toReal_mul]; ring
      _ ≤ z.normSq.toReal := hCheck.toReal_le
  have hqR : 0 ≤ q.toReal := Dyadic.toReal_nonneg hq
  nlinarith [norm_nonneg z.toComplex]

end DyC

/-! ## Exact quadratic iteration -/

/-- Accumulator-style iterate: each unfolding does constant work, so the
kernel evaluates it in linear time. -/
def quadIter (c : DyC) : ℕ → DyC → DyC
  | 0, z => z
  | n + 1, z => quadIter c n ((z.mul z).add c)

theorem toComplex_quadIter (c : DyC) (n : ℕ) (z : DyC) :
    (quadIter c n z).toComplex =
      iterate (quadratic c.toComplex) n z.toComplex := by
  induction n generalizing z with
  | zero => rfl
  | succ n ih =>
      have hFlip : iterate (quadratic c.toComplex) (n + 1) z.toComplex =
          iterate (quadratic c.toComplex) n
            (quadratic c.toComplex z.toComplex) := by
        simpa using iterate_add (quadratic c.toComplex) n 1 z.toComplex
      rw [show quadIter c (n + 1) z = quadIter c n ((z.mul z).add c) from rfl,
        ih, hFlip]
      congr 1
      rw [DyC.toComplex_add, DyC.toComplex_mul, quadratic]
      ring

/-! ## The concrete stored model -/

/-- Lanford's degree-42 even Chebyshev coefficients, exact dyadics (every
finite `f64` is one; emitted by the Rust builder's
`print_lean_pilot_constants`).  Convention:
`h(x) = h₀ + 2 ∑_{k≥1} h_k T_{2k}(x)`. -/
def hBarD : List Dyadic := [
  ⟨5096191042007273, 54⟩,
  ⟨-6308566463122905, 54⟩,
  ⟨625538701221087, 56⟩,
  ⟨5752210514985193, 64⟩,
  ⟨-7457329274531367, 69⟩,
  ⟨656706592891829, 72⟩,
  ⟨294436981101301, 76⟩,
  ⟨-6340297973378179, 85⟩,
  ⟨6322615420510979, 94⟩,
  ⟨7043807972143481, 96⟩,
  ⟨-1774104367759895, 100⟩,
  ⟨-5353563571549941, 107⟩,
  ⟨505558725967861, 108⟩,
  ⟨-2183989500069143, 117⟩,
  ⟨-1762763353557183, 121⟩,
  ⟨7773616819836677, 128⟩,
  ⟨-5698649319210375, 135⟩,
  ⟨-6789162808497301, 139⟩,
  ⟨3060006946208917, 143⟩,
  ⟨-2293927598709293, 152⟩,
  ⟨-3115805658602161, 154⟩,
  ⟨8155571116590563, 161⟩]

/-- Even-degree Chebyshev accumulation over ℂ.  State `(a, b)` holds
`(T_{2k-2}(z), T_{2k-1}(z))` before consuming the k-th tail coefficient;
`z2 = 2z`. -/
noncomputable def evenChebSumC (z2 : ℂ) : List Dyadic → ℂ × ℂ → ℂ → ℂ
  | [], _, acc => acc
  | h :: rest, (a, b), acc =>
      let t := z2 * b - a
      evenChebSumC z2 rest (t, z2 * t - b)
        (acc + 2 * ((h.toReal : ℝ) : ℂ) * t)

/-- The concrete limiting model used by the census and the shader plan.
Stated with `headD`/`tail` (not a literal `match`) so the transport theorem
below rewrites without unfolding the coefficient list. -/
noncomputable def chebyshevLimitModel (z : ℂ) : ℂ :=
  evenChebSumC (2 * z) hBarD.tail (1, z)
    (((hBarD.headD ⟨0, 0⟩).toReal : ℝ) : ℂ)

/-- The same accumulation in exact dyadic arithmetic.  The `let` keeps the
recursive state shared, so kernel evaluation stays linear. -/
def evenChebSumD (z2 : DyC) : List Dyadic → DyC × DyC → DyC → DyC
  | [], _, acc => acc
  | h :: rest, (a, b), acc =>
      let t := (z2.mul b).sub a
      evenChebSumD z2 rest (t, (z2.mul t).sub b)
        (acc.add ((DyC.ofDyadic (Dyadic.mul ⟨2, 0⟩ h)).mul t))

def chebyshevLimitModelD (z : DyC) : DyC :=
  evenChebSumD ((DyC.ofDyadic ⟨2, 0⟩).mul z) hBarD.tail
    (DyC.ofDyadic ⟨1, 0⟩, z) (DyC.ofDyadic (hBarD.headD ⟨0, 0⟩))

theorem toComplex_evenChebSum (z2 : DyC) (coeffs : List Dyadic) :
    ∀ a b acc : DyC,
      (evenChebSumD z2 coeffs (a, b) acc).toComplex =
        evenChebSumC z2.toComplex coeffs
          (a.toComplex, b.toComplex) acc.toComplex := by
  induction coeffs with
  | nil => intro a b acc; rfl
  | cons h rest ih =>
      intro a b acc
      simp only [evenChebSumD, evenChebSumC]
      rw [ih]
      congr 1
      · congr 1
        · rw [DyC.toComplex_sub, DyC.toComplex_mul]
        · rw [DyC.toComplex_sub, DyC.toComplex_mul, DyC.toComplex_sub,
            DyC.toComplex_mul]
      · rw [DyC.toComplex_add, DyC.toComplex_mul, DyC.toComplex_ofDyadic,
          DyC.toComplex_sub, DyC.toComplex_mul, Dyadic.toReal_mul]
        have h2 : (Dyadic.toReal ⟨2, 0⟩ : ℝ) = 2 := by
          norm_num [Dyadic.toReal]
        rw [h2]
        push_cast
        ring

theorem toComplex_chebyshevLimitModel (z : DyC) :
    (chebyshevLimitModelD z).toComplex =
      chebyshevLimitModel z.toComplex := by
  rw [chebyshevLimitModelD, chebyshevLimitModel, toComplex_evenChebSum]
  have h2 : (Dyadic.toReal ⟨2, 0⟩ : ℝ) = 2 := by norm_num [Dyadic.toReal]
  have h1 : (Dyadic.toReal ⟨1, 0⟩ : ℝ) = 1 := by norm_num [Dyadic.toReal]
  congr 1
  · rw [DyC.toComplex_mul, DyC.toComplex_ofDyadic, h2]
    norm_num
  · rw [Prod.mk.injEq]
    refine ⟨?_, rfl⟩
    rw [DyC.toComplex_ofDyadic, h1]
    norm_num
  · rw [DyC.toComplex_ofDyadic]

/-! ## Division transport -/

/-- Dyadic numerator and gauge checks give the normalized distance bound.
This is the only lemma where the gauge division appears. -/
theorem dist_div_le {w s h : ℂ} {nUp sLow bound : ℝ}
    (hN : ‖w - s * h‖ ≤ nUp) (hsLow : sLow ≤ ‖s‖) (hsLowPos : 0 < sLow)
    (hBound : nUp ≤ bound * sLow) :
    dist (w / s) h ≤ bound := by
  have hsPos : (0 : ℝ) < ‖s‖ := lt_of_lt_of_le hsLowPos hsLow
  have hs : s ≠ 0 := by
    intro hzero
    rw [hzero, norm_zero] at hsPos
    exact lt_irrefl 0 hsPos
  have hBoundNonneg : 0 ≤ bound := by
    have hnUp : 0 ≤ nUp := (norm_nonneg _).trans hN
    nlinarith
  rw [Complex.dist_eq]
  have hSplit : w / s - h = (w - s * h) / s := by field_simp
  rw [hSplit, norm_div, div_le_iff₀ hsPos]
  calc ‖w - s * h‖ ≤ nUp := hN
    _ ≤ bound * sLow := hBound
    _ ≤ bound * ‖s‖ := mul_le_mul_of_nonneg_left hsLow hBoundNonneg

/-! ## Pilot instance: level 2, cell center `1/32 + i/32` -/

/-- The Feigenbaum parameter as the exact dyadic of the `f64` used by the
builder. -/
def feigenbaumCD : DyC := ⟨⟨-1577560496870799, 50⟩, ⟨0, 0⟩⟩

def pilotCenterD : DyC := ⟨⟨1, 5⟩, ⟨1, 5⟩⟩

/-- `s₂ = P_c^[4](0)`, exact. -/
def pilotScaleD : DyC := quadIter feigenbaumCD 4 DyC.zero

/-- `P_c^[4](s₂ · x₀)`, exact. -/
def pilotReturnD : DyC :=
  quadIter feigenbaumCD 4 (pilotScaleD.mul pilotCenterD)

/-- `H(x₀)`, exact. -/
def pilotModelD : DyC := chebyshevLimitModelD pilotCenterD

/-- `N = w - s·H(x₀)`: the numerator of `G₂(x₀) - H(x₀)`, exact. -/
def pilotNumeratorD : DyC :=
  pilotReturnD.sub (pilotScaleD.mul pilotModelD)

/-- `2⁻²³`, the numerator bound (measured `‖N‖ ≈ 8.82e-8`). -/
def pilotNUp : Dyadic := ⟨1, 23⟩

/-- `1/8`, the gauge lower bound (measured `‖s₂‖ ≈ 0.2235`). -/
def pilotScaleLow : Dyadic := ⟨1, 3⟩

set_option maxHeartbeats 4000000 in
-- Exact kernel replay of a depth-4 orbit: the dyadic integers reach ~1000
-- bits, so `decide` needs a raised heartbeat and recursion budget.
set_option maxRecDepth 4096 in
/-- Kernel check: `‖N‖² ≤ (2⁻²³)²`. -/
theorem pilot_numerator_check :
    pilotNumeratorD.normSq.Le (pilotNUp.mul pilotNUp) := by decide

set_option maxHeartbeats 4000000 in
-- Exact kernel replay of a depth-4 orbit: the dyadic integers reach ~1000
-- bits, so `decide` needs a raised heartbeat and recursion budget.
set_option maxRecDepth 4096 in
/-- Kernel check: `(1/8)² ≤ ‖s₂‖²`. -/
theorem pilot_scale_check :
    (pilotScaleLow.mul pilotScaleLow).Le pilotScaleD.normSq := by decide

/-- **Pilot kernel token content**: the actual normalized quadratic return
of depth `2² = 4` at the Feigenbaum parameter is within `10⁻⁶` of the
concrete stored model at the census cell center `1/32 + i/32` — checked by
the Lean kernel through exact dyadic arithmetic, no floating point
anywhere.  This discharges the `FiniteGridWitness.samples` obligation for
this cell. -/
theorem pilot_cell_inclusion :
    dist (normalizedReturn feigenbaumCD.toComplex 4 pilotCenterD.toComplex)
      (chebyshevLimitModel pilotCenterD.toComplex) ≤ 1 / 1000000 := by
  have hScaleCast : pilotScaleD.toComplex =
      criticalScale feigenbaumCD.toComplex 4 := by
    rw [pilotScaleD, toComplex_quadIter, DyC.toComplex_zero]
    rfl
  have hNumeratorCast : pilotNumeratorD.toComplex =
      iterate (quadratic feigenbaumCD.toComplex) 4
          (criticalScale feigenbaumCD.toComplex 4 * pilotCenterD.toComplex) -
        criticalScale feigenbaumCD.toComplex 4 *
          chebyshevLimitModel pilotCenterD.toComplex := by
    rw [pilotNumeratorD, DyC.toComplex_sub, DyC.toComplex_mul, pilotReturnD,
      toComplex_quadIter, DyC.toComplex_mul, hScaleCast, pilotModelD,
      toComplex_chebyshevLimitModel]
  have hN : ‖iterate (quadratic feigenbaumCD.toComplex) 4
        (criticalScale feigenbaumCD.toComplex 4 * pilotCenterD.toComplex) -
      criticalScale feigenbaumCD.toComplex 4 *
        chebyshevLimitModel pilotCenterD.toComplex‖ ≤ pilotNUp.toReal := by
    rw [← hNumeratorCast]
    exact DyC.norm_le_of_normSq_le (by norm_num [pilotNUp])
      pilot_numerator_check
  have hS : pilotScaleLow.toReal ≤
      ‖criticalScale feigenbaumCD.toComplex 4‖ := by
    rw [← hScaleCast]
    exact DyC.le_norm_of_le_normSq (by norm_num [pilotScaleLow])
      pilot_scale_check
  rw [normalizedReturn]
  refine dist_div_le hN hS ?_ ?_
  · norm_num [pilotScaleLow, Dyadic.toReal]
  · -- `2⁻²³ ≤ 10⁻⁶ · 8⁻¹`: dyadic literals, real comparison.
    norm_num [pilotNUp, pilotScaleLow, Dyadic.toReal]

end FeigenbaumRationalReplay

end Mandelbrot
