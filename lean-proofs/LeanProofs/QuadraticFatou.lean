/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.MandelbrotArea
import LeanProofs.CardioidArea
import LeanProofs.FractionalIteration.KoenigsAnalytic
import Mathlib.Analysis.Complex.BranchLogRoot
import Mathlib.Analysis.Complex.Schwarz
import Mathlib.Analysis.Calculus.Deriv.Slope
import Mathlib.Analysis.Normed.Module.Connected
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# The critical point is attracted by an attracting quadratic fixed point

This file proves the specialized Fatou theorem needed for the main cardioid,
without developing normal families or Montel's theorem.

For `q_c(z) = z^2 + c`, assume that `p` is a fixed point with multiplier
`mu = 2p`, `0 < |mu| < 1`.  A small disk around `p` is strictly attracting.
If the critical point never entered this disk, the absence of the critical
value on all inverse branches would let us construct inverse branches of
arbitrary order on the same disk.  Their derivative at `p` is `mu^{-n}`.
On the other hand all these branches take values in one fixed escape disk,
so Schwarz's lemma gives a uniform derivative bound: a contradiction.

This is a global complex-analytic proof, but it is deliberately specialized
to the quadratic family and uses only square-root lifting on a disk.
-/

namespace Mandelbrot

noncomputable section

open Complex Filter Function Metric Set MeasureTheory
open scoped Topology

/-- Radius of the elementary local attracting disk at a fixed point. -/
def quadraticAttractingRadius (p : ℂ) : ℝ :=
  (1 - ‖2 * p‖) / 2

/-- Contraction rate used on `quadraticAttractingRadius`. -/
def quadraticAttractingRate (p : ℂ) : ℝ :=
  (1 + ‖2 * p‖) / 2

theorem quadraticAttractingRadius_pos (p : ℂ) (hp : ‖2 * p‖ < 1) :
    0 < quadraticAttractingRadius p := by
  unfold quadraticAttractingRadius
  linarith

theorem quadraticAttractingRate_nonneg (p : ℂ) :
    0 ≤ quadraticAttractingRate p := by
  unfold quadraticAttractingRate
  positivity

theorem quadraticAttractingRate_lt_one (p : ℂ) (hp : ‖2 * p‖ < 1) :
    quadraticAttractingRate p < 1 := by
  unfold quadraticAttractingRate
  linarith

theorem norm_two_mul_fixed_lt_one (p : ℂ) (hp : ‖2 * p‖ < 1) :
    ‖p‖ < (1 / 2 : ℝ) := by
  rw [norm_mul] at hp
  norm_num at hp
  nlinarith

theorem quad_mapsTo_attracting_ball
    (c p : ℂ) (hfixed : quad c p = p) (hattract : ‖2 * p‖ < 1) :
    MapsTo (quad c) (ball p (quadraticAttractingRadius p))
      (ball p (quadraticAttractingRadius p)) := by
  intro z hz
  rw [mem_ball, dist_eq] at hz ⊢
  rw [quad_sub_fixed_eq_centeredQuad c p z hfixed]
  calc
    ‖centeredQuad (2 * p) (z - p)‖ ≤
        (‖2 * p‖ + ‖z - p‖) * ‖z - p‖ :=
      norm_centeredQuad_le _ _
    _ < quadraticAttractingRate p * quadraticAttractingRadius p := by
      have hr : ‖2 * p‖ + quadraticAttractingRadius p =
          quadraticAttractingRate p := by
        simp only [quadraticAttractingRadius, quadraticAttractingRate]
        ring
      have hleft : ‖2 * p‖ + ‖z - p‖ ≤ quadraticAttractingRate p := by
        rw [← hr]
        linarith
      calc
        (‖2 * p‖ + ‖z - p‖) * ‖z - p‖ ≤
            quadraticAttractingRate p * ‖z - p‖ :=
          mul_le_mul_of_nonneg_right hleft (norm_nonneg _)
        _ < quadraticAttractingRate p * quadraticAttractingRadius p :=
          mul_lt_mul_of_pos_left hz (by
            unfold quadraticAttractingRate
            nlinarith [norm_nonneg (2 * p)])
    _ < quadraticAttractingRadius p := by
      have hrate := quadraticAttractingRate_lt_one p hattract
      exact mul_lt_of_lt_one_left (quadraticAttractingRadius_pos p hattract) hrate

/-- Once an orbit enters the local attracting disk, it stays there. -/
theorem orbit_stays_in_attracting_ball
    (c p z : ℂ) (hfixed : quad c p = p) (hattract : ‖2 * p‖ < 1)
    (hz : z ∈ ball p (quadraticAttractingRadius p)) :
    ∀ n : ℕ, orbit c z n ∈ ball p (quadraticAttractingRadius p) := by
  intro n
  induction n with
  | zero => simpa using hz
  | succ n ih =>
      rw [orbit_succ]
      exact quad_mapsTo_attracting_ball c p hfixed hattract ih

/-- A convenient escape radius for arbitrary starting points. -/
def quadraticEscapeRadius (c : ℂ) : ℝ := ‖c‖ + 2

theorem quadraticEscapeRadius_pos (c : ℂ) :
    0 < quadraticEscapeRadius c := by
  unfold quadraticEscapeRadius
  positivity

/-- If one quadratic image is in the escape disk, so was its preimage. -/
theorem norm_le_escapeRadius_of_norm_quad_le
    (c z : ℂ) (h : ‖quad c z‖ ≤ quadraticEscapeRadius c) :
    ‖z‖ ≤ quadraticEscapeRadius c := by
  by_contra hnot
  have hz : quadraticEscapeRadius c < ‖z‖ := lt_of_not_ge hnot
  have hlower : ‖z‖ ^ 2 - ‖c‖ ≤ ‖quad c z‖ := by
    simpa [quad] using norm_sq_add_lower z c
  have hc : 0 ≤ ‖c‖ := norm_nonneg c
  simp only [quadraticEscapeRadius] at hz h
  nlinarith [hlower]

/-- Pull an escape-radius bound backwards through any finite iterate. -/
theorem norm_le_escapeRadius_of_norm_orbit_le
    (c z : ℂ) : ∀ n : ℕ,
    ‖orbit c z n‖ ≤ quadraticEscapeRadius c →
      ‖z‖ ≤ quadraticEscapeRadius c := by
  intro n
  induction n with
  | zero => simpa
  | succ n ih =>
      intro h
      rw [orbit_succ] at h
      exact ih (norm_le_escapeRadius_of_norm_quad_le c _ h)

theorem attracting_ball_subset_escape_ball
    (c p : ℂ) (hattract : ‖2 * p‖ < 1) :
    ball p (quadraticAttractingRadius p) ⊆
      ball 0 (quadraticEscapeRadius c) := by
  intro z hz
  rw [mem_ball, dist_eq] at hz
  rw [mem_ball_zero_iff]
  have hp : ‖p‖ < (1 / 2 : ℝ) := norm_two_mul_fixed_lt_one p hattract
  have hr : quadraticAttractingRadius p ≤ (1 / 2 : ℝ) := by
    unfold quadraticAttractingRadius
    nlinarith [norm_nonneg (2 * p)]
  calc
    ‖z‖ = ‖(z - p) + p‖ := by congr 1 <;> ring
    _ ≤ ‖z - p‖ + ‖p‖ := norm_add_le _ _
    _ < (1 / 2 : ℝ) + (1 / 2 : ℝ) := add_lt_add (hz.trans_le hr) hp
    _ = 1 := by norm_num
    _ < quadraticEscapeRadius c := by
      unfold quadraticEscapeRadius
      nlinarith [norm_nonneg c]

/-- The critical orbit in `MandelbrotArea.lean` is the general orbit from
`FractionalIteration.Basic` started at zero. -/
theorem mandelbrotOrbit_eq_orbit (c : ℂ) (n : ℕ) :
    mandelbrotOrbit c n = orbit c 0 n := by
  induction n with
  | zero => rfl
  | succ n ih =>
      rw [mandelbrotOrbit_succ, orbit_succ, ih]
      rfl

/-! ## Holomorphic square-root lifting on a disk -/

/-- A continuous nonvanishing square root of a holomorphic function is
holomorphic.  `BranchLogRoot` supplies the continuous root; this lemma records
the short slope argument that upgrades it to a differentiable one. -/
theorem differentiableOn_of_continuousOn_sq_eq
    {U : Set ℂ} (hU : IsOpen U) {s g : ℂ → ℂ}
    (hs : ContinuousOn s U) (hg : DifferentiableOn ℂ g U)
    (hsq : ∀ z ∈ U, s z ^ 2 = g z)
    (hs0 : ∀ z ∈ U, s z ≠ 0) :
    DifferentiableOn ℂ s U := by
  intro z hz
  have hs_cont : ContinuousAt s z := hs.continuousAt (hU.mem_nhds hz)
  have hg_deriv : HasDerivAt g (deriv g z) z :=
    (hg.differentiableAt (hU.mem_nhds hz)).hasDerivAt
  have hden : Tendsto (fun x : ℂ => s x + s z)
      (nhdsWithin z {z}ᶜ) (nhds (2 * s z)) := by
    have hs_t : Tendsto s (nhdsWithin z {z}ᶜ) (nhds (s z)) :=
      hs_cont.tendsto.mono_left nhdsWithin_le_nhds
    have hc_t : Tendsto (fun _ : ℂ => s z) (nhdsWithin z {z}ᶜ)
        (nhds (s z)) := tendsto_const_nhds
    have h := hs_t.add hc_t
    simpa [two_mul] using h
  have hlimit_ne : 2 * s z ≠ 0 := mul_ne_zero (by norm_num) (hs0 z hz)
  have hden_ne : ∀ᶠ x in nhdsWithin z {z}ᶜ, s x + s z ≠ 0 :=
    hden.eventually (eventually_ne_nhds hlimit_ne)
  have hslope_eq :
      slope s z =ᶠ[nhdsWithin z {z}ᶜ]
        fun x => slope g z x / (s x + s z) := by
    filter_upwards [nhdsWithin_le_nhds (hU.mem_nhds hz),
      self_mem_nhdsWithin, hden_ne] with x hxU hxz hsum
    have hroot : s x - s z = (g x - g z) / (s x + s z) := by
      apply (eq_div_iff hsum).2
      rw [← hsq x hxU, ← hsq z hz]
      ring
    change (x - z)⁻¹ * (s x - s z) =
      ((x - z)⁻¹ * (g x - g z)) / (s x + s z)
    rw [hroot, mul_div_assoc]
  have hquot : Tendsto (fun x => slope g z x / (s x + s z))
      (nhdsWithin z {z}ᶜ) (nhds (deriv g z / (2 * s z))) :=
    hg_deriv.tendsto_slope.div hden hlimit_ne
  exact (hasDerivAt_iff_tendsto_slope.2
    (hquot.congr' hslope_eq.symm)).differentiableAt.differentiableWithinAt

/-! ## Inverse branches of arbitrary order -/

theorem orbit_zero_succ_eq_orbit_criticalValue (c : ℂ) (n : ℕ) :
    orbit c 0 (n + 1) = orbit c c n := by
  calc
    orbit c 0 (n + 1) = (quad c)^[n] (orbit c 0 1) :=
      orbit_add c 0 n 1
    _ = (quad c)^[n] c := by simp [orbit, quad]
    _ = orbit c c n := rfl

theorem orbit_succ_start (c z : ℂ) (n : ℕ) :
    orbit c z (n + 1) = orbit c (quad c z) n := by
  simpa [orbit] using Function.iterate_succ_apply (quad c) n z

/-- A holomorphic branch of the `n`th inverse iterate, normalized to fix
the attracting fixed point. -/
structure QuadraticInverseBranch (c p : ℂ) (U : Set ℂ) (n : ℕ) where
  toFun : ℂ → ℂ
  differentiableOn : DifferentiableOn ℂ toFun U
  right_inverse : ∀ z ∈ U, orbit c (toFun z) n = z
  map_fixed : toFun p = p

namespace QuadraticInverseBranch

instance (c p : ℂ) (U : Set ℂ) (n : ℕ) :
    CoeFun (QuadraticInverseBranch c p U n) (fun _ => ℂ → ℂ) :=
  ⟨QuadraticInverseBranch.toFun⟩

theorem continuousOn {c p : ℂ} {U : Set ℂ} {n : ℕ}
    (h : QuadraticInverseBranch c p U n) : ContinuousOn h U :=
  h.differentiableOn.continuousOn

end QuadraticInverseBranch

/-- Choose the sign of a square root so that it fixes `p`. -/
noncomputable def normalizeRootAt (s : ℂ → ℂ) (p : ℂ) : ℂ → ℂ :=
  if s p = p then s else fun z => -s z

theorem normalizeRootAt_sq (s : ℂ → ℂ) (p z : ℂ) :
    normalizeRootAt s p z ^ 2 = s z ^ 2 := by
  by_cases h : s p = p <;> simp [normalizeRootAt, h]

theorem continuousOn_normalizeRootAt {U : Set ℂ} {s : ℂ → ℂ} {p : ℂ}
    (hs : ContinuousOn s U) : ContinuousOn (normalizeRootAt s p) U := by
  by_cases h : s p = p
  · simpa [normalizeRootAt, h] using hs
  · simpa [normalizeRootAt, h] using hs.neg

theorem normalizeRootAt_fixed_of_sq
    (s : ℂ → ℂ) (p : ℂ) (hsq : s p ^ 2 = p ^ 2) :
    normalizeRootAt s p p = p := by
  by_cases h : s p = p
  · simp [normalizeRootAt, h]
  · have hneg : s p = -p := (sq_eq_sq_iff_eq_or_eq_neg.mp hsq).resolve_left h
    have hne : -p ≠ p := by
      intro heq
      apply h
      rw [hneg, heq]
    simp [normalizeRootAt, hne, hneg]

/-- Under the hypothesis that the critical orbit never reaches `U`, every
inverse branch on `U` has a further holomorphic square-root lift. -/
theorem QuadraticInverseBranch.succ
    {c p : ℂ} {U : Set ℂ} {n : ℕ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U)
    (hfixed : quad c p = p)
    (h : QuadraticInverseBranch c p U n) :
    Nonempty (QuadraticInverseBranch c p U (n + 1)) := by
  let g : ℂ → ℂ := fun z => h z - c
  have hg_cont : ContinuousOn g U := h.continuousOn.sub continuousOn_const
  have hg_diff : DifferentiableOn ℂ g U := h.differentiableOn.sub_const c
  have hg0 : 0 ∉ g '' U := by
    rintro ⟨z, hzU, hzero⟩
    have hzcrit : h z = c := by
      dsimp [g] at hzero
      linear_combination hzero
    have horbit : orbit c c n = z := by
      exact (congrArg (fun w => orbit c w n) hzcrit).symm.trans
        (h.right_inverse z hzU)
    apply hcritical (n + 1)
    rw [orbit_zero_succ_eq_orbit_criticalValue, horbit]
    exact hzU
  obtain ⟨s, hs_cont, hs_sq⟩ :=
    Complex.exists_continuousOn_pow_eq hUsimply hUopen hg_cont hg0
      (show (2 : ℕ) ≠ 0 by norm_num)
  let root : ℂ → ℂ := normalizeRootAt s p
  have hroot_cont : ContinuousOn root U :=
    continuousOn_normalizeRootAt hs_cont
  have hroot_sq : ∀ z ∈ U, root z ^ 2 = g z := by
    intro z hz
    rw [normalizeRootAt_sq]
    exact hs_sq z
  have hroot0 : ∀ z ∈ U, root z ≠ 0 := by
    intro z hz hzero
    have : g z = 0 := by rw [← hroot_sq z hz, hzero]; norm_num
    exact hg0 ⟨z, hz, this⟩
  have hroot_diff : DifferentiableOn ℂ root U :=
    differentiableOn_of_continuousOn_sq_eq hUopen hroot_cont hg_diff
      hroot_sq hroot0
  have hp_sq : s p ^ 2 = p ^ 2 := by
    rw [hs_sq p]
    dsimp [g]
    rw [h.map_fixed]
    have hp : p ^ 2 + c = p := by simpa [quad] using hfixed
    conv_lhs => rw [← hp]
    ring
  refine ⟨⟨root, hroot_diff, ?_, normalizeRootAt_fixed_of_sq s p hp_sq⟩⟩
  intro z hz
  rw [orbit_succ_start]
  have hquad : quad c (root z) = h z := by
    simp only [quad]
    rw [hroot_sq z hz]
    dsimp [g]
    ring
  rw [hquad]
  exact h.right_inverse z hz

/-- Inverse branches of every order exist as long as the critical orbit
misses the simply connected domain. -/
theorem exists_quadraticInverseBranch
    {c p : ℂ} {U : Set ℂ}
    (hUopen : IsOpen U) (hUsimply : IsSimplyConnected U)
    (hpU : p ∈ U) (hcritical : ∀ m : ℕ, orbit c 0 m ∉ U)
    (hfixed : quad c p = p) :
    ∀ n : ℕ, Nonempty (QuadraticInverseBranch c p U n) := by
  intro n
  induction n with
  | zero =>
      exact ⟨⟨id, differentiableOn_id, by simp [orbit], rfl⟩⟩
  | succ n ih =>
      obtain ⟨h⟩ := ih
      simpa [Nat.succ_eq_add_one] using
        h.succ hUopen hUsimply hcritical hfixed

/-! ## Derivative growth versus Schwarz's bound -/

theorem hasDerivAt_orbit_fixed
    (c p : ℂ) (hfixed : quad c p = p) :
    ∀ n : ℕ, HasDerivAt (fun z => orbit c z n) ((2 * p) ^ n) p := by
  intro n
  simpa only [orbit] using
    HasDerivAt.iterate p (hasDerivAt_quad c p) hfixed n

theorem QuadraticInverseBranch.deriv_identity
    {c p : ℂ} {U : Set ℂ} {n : ℕ}
    (hUopen : IsOpen U) (hpU : p ∈ U)
    (hfixed : quad c p = p) (h : QuadraticInverseBranch c p U n) :
    (2 * p) ^ n * deriv h p = 1 := by
  have hh : HasDerivAt h (deriv h p) p :=
    (h.differentiableOn.differentiableAt
      (hUopen.mem_nhds hpU)).hasDerivAt
  have hcomp : HasDerivAt (fun z => orbit c (h z) n)
      ((2 * p) ^ n * deriv h p) p :=
    (by
      have hiter : HasDerivAt (fun z => orbit c z n) ((2 * p) ^ n) (h p) := by
        simpa [h.map_fixed] using hasDerivAt_orbit_fixed c p hfixed n
      exact hiter.comp p hh)
  have heq : (fun z => orbit c (h z) n) =ᶠ[nhds p] id :=
    Filter.eventually_of_mem (hUopen.mem_nhds hpU) fun z hz =>
      h.right_inverse z hz
  calc
    (2 * p) ^ n * deriv h p =
        deriv (fun z => orbit c (h z) n) p := hcomp.deriv.symm
    _ = deriv id p := heq.deriv_eq
    _ = 1 := deriv_id p

theorem QuadraticInverseBranch.mapsTo_uniform_closedBall
    {c p : ℂ} {n : ℕ} (hattract : ‖2 * p‖ < 1)
    (h : QuadraticInverseBranch c p
      (ball p (quadraticAttractingRadius p)) n) :
    MapsTo h (ball p (quadraticAttractingRadius p))
      (closedBall p (quadraticEscapeRadius c + ‖p‖)) := by
  intro z hz
  rw [mem_closedBall, dist_eq]
  have hzEscape : ‖z‖ ≤ quadraticEscapeRadius c := by
    have hzlt : ‖z‖ < quadraticEscapeRadius c := by
      simpa [mem_ball_zero_iff] using
        attracting_ball_subset_escape_ball c p hattract hz
    exact hzlt.le
  have horbit : ‖orbit c (h z) n‖ ≤ quadraticEscapeRadius c := by
    rw [h.right_inverse z hz]
    exact hzEscape
  have hhEscape : ‖h z‖ ≤ quadraticEscapeRadius c :=
    norm_le_escapeRadius_of_norm_orbit_le c (h z) n horbit
  calc
    ‖h z - p‖ ≤ ‖h z‖ + ‖p‖ := norm_sub_le _ _
    _ ≤ quadraticEscapeRadius c + ‖p‖ :=
      add_le_add hhEscape le_rfl

theorem QuadraticInverseBranch.norm_deriv_le_uniform
    {c p : ℂ} {n : ℕ} (hattract : ‖2 * p‖ < 1)
    (h : QuadraticInverseBranch c p
      (ball p (quadraticAttractingRadius p)) n) :
    ‖deriv h p‖ ≤
      (quadraticEscapeRadius c + ‖p‖) / quadraticAttractingRadius p := by
  apply Complex.norm_deriv_le_div_of_mapsTo_ball h.differentiableOn
  · simpa [h.map_fixed] using h.mapsTo_uniform_closedBall hattract
  · exact quadraticAttractingRadius_pos p hattract

/-- Specialized Fatou theorem: the critical orbit of a quadratic map enters
the elementary attracting disk of every nonzero attracting fixed point. -/
theorem critical_orbit_enters_attracting_ball
    (c p : ℂ) (hfixed : quad c p = p)
    (hattract : ‖2 * p‖ < 1) :
    ∃ n : ℕ, orbit c 0 n ∈ ball p (quadraticAttractingRadius p) := by
  by_contra hnever
  push_neg at hnever
  let U : Set ℂ := ball p (quadraticAttractingRadius p)
  have hr : 0 < quadraticAttractingRadius p :=
    quadraticAttractingRadius_pos p hattract
  have hUopen : IsOpen U := isOpen_ball
  have hpU : p ∈ U := by simp [U, hr]
  have hUsimply : IsSimplyConnected U := by
    letI : ContractibleSpace U := Metric.contractibleSpace_ball hr
    exact (show SimplyConnectedSpace U from inferInstance)
  have hbranches : ∀ n : ℕ, Nonempty (QuadraticInverseBranch c p U n) :=
    exists_quadraticInverseBranch hUopen hUsimply hpU hnever hfixed
  let C : ℝ :=
    (quadraticEscapeRadius c + ‖p‖) / quadraticAttractingRadius p
  have hlimit : Tendsto (fun n : ℕ => ‖2 * p‖ ^ n * C) atTop (nhds 0) :=
    by simpa using
      (tendsto_pow_atTop_nhds_zero_of_lt_one
        (norm_nonneg (2 * p)) hattract).mul_const C
  have hevent : ∀ᶠ n : ℕ in atTop, ‖2 * p‖ ^ n * C < 1 :=
    hlimit.eventually (Iio_mem_nhds (by norm_num : (0 : ℝ) < 1))
  obtain ⟨n, hn⟩ := hevent.exists
  obtain ⟨h⟩ := hbranches n
  have hupper : ‖deriv h p‖ ≤ C := by
    simpa [U, C] using h.norm_deriv_le_uniform hattract
  have hid := h.deriv_identity hUopen hpU hfixed
  have hnorm : (1 : ℝ) = ‖2 * p‖ ^ n * ‖deriv h p‖ := by
    calc
      (1 : ℝ) = ‖(1 : ℂ)‖ := by norm_num
      _ = ‖(2 * p) ^ n * deriv h p‖ := by rw [hid]
      _ = ‖2 * p‖ ^ n * ‖deriv h p‖ := by rw [norm_mul, norm_pow]
  have hle : (1 : ℝ) ≤ ‖2 * p‖ ^ n * C := by
    rw [hnorm]
    exact mul_le_mul_of_nonneg_left hupper (pow_nonneg (norm_nonneg _) _)
  linarith

/-! ## From entry into the local basin to Mandelbrot membership -/

theorem mem_Mandelbrot_of_critical_orbit_enters_attracting_ball
    (c p : ℂ) (hfixed : quad c p = p) (hattract : ‖2 * p‖ < 1)
    (hentry : ∃ N : ℕ,
      orbit c 0 N ∈ ball p (quadraticAttractingRadius p)) :
    c ∈ Mandelbrot := by
  obtain ⟨N, hN⟩ := hentry
  apply (mem_Mandelbrot_iff c).2
  refine ⟨quadraticEscapeRadius c, fun n => ?_⟩
  rw [mandelbrotOrbit_eq_orbit]
  rcases le_total n N with hnN | hNn
  · obtain ⟨k, hk⟩ := Nat.exists_eq_add_of_le hnN
    have hNEscape : ‖orbit c 0 N‖ ≤ quadraticEscapeRadius c := by
      have hlt : ‖orbit c 0 N‖ < quadraticEscapeRadius c := by
        simpa [mem_ball_zero_iff] using
          attracting_ball_subset_escape_ball c p hattract hN
      exact hlt.le
    have htail : ‖orbit c (orbit c 0 n) k‖ ≤ quadraticEscapeRadius c := by
      have hkn : k + n = N := by omega
      have horbitEq : orbit c (orbit c 0 n) k = orbit c 0 (k + n) := by
        change (quad c)^[k] (orbit c 0 n) = orbit c 0 (k + n)
        exact (orbit_add c 0 k n).symm
      rw [horbitEq, hkn]
      exact hNEscape
    exact norm_le_escapeRadius_of_norm_orbit_le c (orbit c 0 n) k htail
  · obtain ⟨k, hk⟩ := Nat.exists_eq_add_of_le hNn
    have hstay := orbit_stays_in_attracting_ball c p (orbit c 0 N)
      hfixed hattract hN k
    have heq : orbit c 0 n = orbit c (orbit c 0 N) k := by
      have hnk : n = k + N := by omega
      rw [hnk, orbit_add]
      rfl
    have hlt : ‖orbit c 0 n‖ < quadraticEscapeRadius c := by
      rw [heq]
      simpa [mem_ball_zero_iff] using
        attracting_ball_subset_escape_ball c p hattract hstay
    exact hlt.le

/-- Every quadratic parameter with an attracting fixed point belongs to the
Mandelbrot set.  This is the specialized Fatou theorem in the form needed by
the multiplier cardioid. -/
theorem mem_Mandelbrot_of_attracting_fixedPoint
    (c p : ℂ) (hfixed : quad c p = p) (hattract : ‖2 * p‖ < 1) :
    c ∈ Mandelbrot := by
  apply mem_Mandelbrot_of_critical_orbit_enters_attracting_ball
    c p hfixed hattract
  exact critical_orbit_enters_attracting_ball c p hfixed hattract

theorem mainCardioidMap_fixedPoint (lambda : ℂ) :
    quad (mainCardioidMap lambda) (lambda / 2) = lambda / 2 := by
  simp only [quad, mainCardioidMap]
  ring

/-- The full open multiplier cardioid lies in the Mandelbrot set. -/
theorem mainCardioidMap_mem_Mandelbrot
    (lambda : ℂ) (hlambda : ‖lambda‖ < 1) :
    mainCardioidMap lambda ∈ Mandelbrot := by
  apply mem_Mandelbrot_of_attracting_fixedPoint
    (mainCardioidMap lambda) (lambda / 2)
    (mainCardioidMap_fixedPoint lambda)
  simpa [show (2 : ℂ) * (lambda / 2) = lambda by ring] using hlambda

theorem mainCardioid_subset_Mandelbrot :
    mainCardioid ⊆ Mandelbrot := by
  rintro c ⟨lambda, hlambda, rfl⟩
  apply mainCardioidMap_mem_Mandelbrot lambda
  simpa [mem_ball, dist_zero_right] using hlambda

theorem volume_Mandelbrot_ge_three_pi_div_eight :
    ENNReal.ofReal (3 * Real.pi / 8) ≤ volume Mandelbrot := by
  rw [← volume_mainCardioid]
  exact measure_mono mainCardioid_subset_Mandelbrot

end

end Mandelbrot
