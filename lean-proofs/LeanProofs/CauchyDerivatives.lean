/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.Cauchy
import Mathlib.Analysis.Complex.Liouville
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Cauchy derivative certificates on nested disks

A uniform value-error certificate on a larger disk yields all derivative
certificates needed on a smaller runtime disk.  The distance between the two
radii is the Cauchy headroom.  The bivariate mixed estimate is obtained by
applying the one-variable theorem successively in `z` and `c`.
-/

namespace Mandelbrot

open Complex Metric Set

noncomputable section

/-- Every local Cauchy circle centered in the inner disk remains in the outer
disk when its radius is `Router - Rinner`. -/
theorem closure_ball_nested_subset
    (center z : ℂ) (Rinner Router : ℝ)
    (_hR : Rinner < Router) (hz : z ∈ closedBall center Rinner) :
    closure (ball z (Router - Rinner)) ⊆ closedBall center Router := by
  intro w hw
  have hwz : dist w z ≤ Router - Rinner :=
    closure_ball_subset_closedBall hw
  have hzc : dist z center ≤ Rinner := mem_closedBall.mp hz
  apply mem_closedBall.mpr
  calc
    dist w center ≤ dist w z + dist z center := dist_triangle _ _ _
    _ ≤ (Router - Rinner) + Rinner := add_le_add hwz hzc
    _ = Router := by ring

/-- Cauchy's estimate at every point of a smaller disk. -/
theorem norm_iteratedDeriv_le_on_inner_disk
    (f : ℂ → ℂ) (center z : ℂ) (Rinner Router M : ℝ) (n : ℕ)
    (hR : Rinner < Router) (hz : z ∈ closedBall center Rinner)
    (hd : DifferentiableOn ℂ f (closedBall center Router))
    (hM : ∀ w ∈ closedBall center Router, ‖f w‖ ≤ M) :
    ‖iteratedDeriv n f z‖ ≤
      n.factorial * M / (Router - Rinner) ^ n := by
  have hgap : 0 < Router - Rinner := sub_pos.mpr hR
  have hsubset := closure_ball_nested_subset center z Rinner Router hR hz
  have hlocal : DiffContOnCl ℂ f (ball z (Router - Rinner)) :=
    (hd.mono hsubset).diffContOnCl
  apply norm_iteratedDeriv_le_of_forall_mem_sphere_norm_le n hgap hlocal
  intro w hw
  apply hM w
  apply hsubset
  rw [closure_ball z hgap.ne']
  exact sphere_subset_closedBall hw

/-- First derivative certificate `M/(Router-Rinner)`. -/
theorem norm_deriv_le_on_inner_disk
    (f : ℂ → ℂ) (center z : ℂ) (Rinner Router M : ℝ)
    (hR : Rinner < Router) (hz : z ∈ closedBall center Rinner)
    (hd : DifferentiableOn ℂ f (closedBall center Router))
    (hM : ∀ w ∈ closedBall center Router, ‖f w‖ ≤ M) :
    ‖deriv f z‖ ≤ M / (Router - Rinner) := by
  simpa [iteratedDeriv_one] using
    norm_iteratedDeriv_le_on_inner_disk f center z Rinner Router M 1 hR hz hd hM

/-- Second derivative certificate `2M/(Router-Rinner)²`. -/
theorem norm_secondDeriv_le_on_inner_disk
    (f : ℂ → ℂ) (center z : ℂ) (Rinner Router M : ℝ)
    (hR : Rinner < Router) (hz : z ∈ closedBall center Rinner)
    (hd : DifferentiableOn ℂ f (closedBall center Router))
    (hM : ∀ w ∈ closedBall center Router, ‖f w‖ ≤ M) :
    ‖iteratedDeriv 2 f z‖ ≤ 2 * M / (Router - Rinner) ^ 2 := by
  simpa using
    norm_iteratedDeriv_le_on_inner_disk f center z Rinner Router M 2 hR hz hd hM

/-- An inner disk is included in every concentric larger disk. -/
theorem closedBall_mono_of_lt
    (center z : ℂ) (Rinner Router : ℝ)
    (hR : Rinner < Router) (hz : z ∈ closedBall center Rinner) :
    z ∈ closedBall center Router := by
  exact mem_closedBall.mpr ((mem_closedBall.mp hz).trans hR.le)

/-- Mixed Cauchy estimate on a nested bidisk.  The explicit differentiability
assumption for the `z`-derivative as a function of `c` is the analytic bridge
the concrete residual must provide. -/
theorem norm_mixedDeriv_le_on_inner_polydisc
    (F : ℂ → ℂ → ℂ) (centerZ centerC z c : ℂ)
    (RzInner RzOuter RcInner RcOuter M : ℝ)
    (hRz : RzInner < RzOuter) (hRc : RcInner < RcOuter)
    (hz : z ∈ closedBall centerZ RzInner)
    (hc : c ∈ closedBall centerC RcInner)
    (hdZ : ∀ c' ∈ closedBall centerC RcOuter,
      DifferentiableOn ℂ (fun z' => F z' c') (closedBall centerZ RzOuter))
    (hdZinC : DifferentiableOn ℂ
      (fun c' => deriv (fun z' => F z' c') z) (closedBall centerC RcOuter))
    (hM : ∀ z' ∈ closedBall centerZ RzOuter,
      ∀ c' ∈ closedBall centerC RcOuter, ‖F z' c'‖ ≤ M) :
    ‖deriv (fun c' => deriv (fun z' => F z' c') z) c‖ ≤
      (M / (RzOuter - RzInner)) / (RcOuter - RcInner) := by
  have hG : ∀ c' ∈ closedBall centerC RcOuter,
      ‖deriv (fun z' => F z' c') z‖ ≤ M / (RzOuter - RzInner) := by
    intro c' hc'
    exact norm_deriv_le_on_inner_disk
      (fun z' => F z' c') centerZ z RzInner RzOuter M
      hRz hz (hdZ c' hc') (fun z' hz' => hM z' hz' c' hc')
  exact norm_deriv_le_on_inner_disk
    (fun c' => deriv (fun z' => F z' c') z)
    centerC c RcInner RcOuter (M / (RzOuter - RzInner))
    hRc hc hdZinC hG

/-- Runtime bundle: one value bound on an outer bidisk yields both first and
pure second partial bounds on an inner bidisk.  The mixed partial is supplied
by `norm_mixedDeriv_le_on_inner_polydisc`. -/
theorem cauchy_runtime_partial_bounds
    (F : ℂ → ℂ → ℂ) (centerZ centerC z c : ℂ)
    (RzInner RzOuter RcInner RcOuter M : ℝ)
    (hRz : RzInner < RzOuter) (hRc : RcInner < RcOuter)
    (hz : z ∈ closedBall centerZ RzInner)
    (hc : c ∈ closedBall centerC RcInner)
    (hdZ : ∀ c' ∈ closedBall centerC RcOuter,
      DifferentiableOn ℂ (fun z' => F z' c') (closedBall centerZ RzOuter))
    (hdC : ∀ z' ∈ closedBall centerZ RzOuter,
      DifferentiableOn ℂ (fun c' => F z' c') (closedBall centerC RcOuter))
    (hM : ∀ z' ∈ closedBall centerZ RzOuter,
      ∀ c' ∈ closedBall centerC RcOuter, ‖F z' c'‖ ≤ M) :
    ‖deriv (fun z' => F z' c) z‖ ≤ M / (RzOuter - RzInner) ∧
    ‖deriv (fun c' => F z c') c‖ ≤ M / (RcOuter - RcInner) ∧
    ‖iteratedDeriv 2 (fun z' => F z' c) z‖ ≤
      2 * M / (RzOuter - RzInner) ^ 2 ∧
    ‖iteratedDeriv 2 (fun c' => F z c') c‖ ≤
      2 * M / (RcOuter - RcInner) ^ 2 := by
  have hcOuter := closedBall_mono_of_lt centerC c RcInner RcOuter hRc hc
  have hzOuter := closedBall_mono_of_lt centerZ z RzInner RzOuter hRz hz
  constructor
  · exact norm_deriv_le_on_inner_disk
      (fun z' => F z' c) centerZ z RzInner RzOuter M
      hRz hz (hdZ c hcOuter) (fun z' hz' => hM z' hz' c hcOuter)
  constructor
  · exact norm_deriv_le_on_inner_disk
      (fun c' => F z c') centerC c RcInner RcOuter M
      hRc hc (hdC z hzOuter) (fun c' hc' => hM z hzOuter c' hc')
  constructor
  · exact norm_secondDeriv_le_on_inner_disk
      (fun z' => F z' c) centerZ z RzInner RzOuter M
      hRz hz (hdZ c hcOuter) (fun z' hz' => hM z' hz' c hcOuter)
  · exact norm_secondDeriv_le_on_inner_disk
      (fun c' => F z c') centerC c RcInner RcOuter M
      hRc hc (hdC z hzOuter) (fun c' hc' => hM z hzOuter c' hc')

end

end Mandelbrot
