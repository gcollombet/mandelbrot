/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.RationalCertificate
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
# Prefix property of certified runtime radii

A radius emitted to the shader promises validity at every smaller radius,
not only at its boundary.  This file makes that contract explicit.  It proves
that convex endpoint certificates form a downward-closed (prefix) predicate,
then proves the bracket invariant and exact width reduction of bisection.

The result rules out the unsound pattern "the boundary happens to pass, so
emit it": the centre gate and convexity certificate are part of the predicate
being bisected.
-/

namespace Mandelbrot

noncomputable section

open Set

/-- Semantic contract of an emitted radius: the gap is nonpositive at every
point between the centre and the emitted boundary. -/
def ValidEmittedRadius (gap : ℝ → ℝ) (r : ℝ) : Prop :=
  0 ≤ r ∧ ∀ x ∈ Icc 0 r, gap x ≤ 0

/-- The semantic radius contract is a prefix predicate. -/
theorem validEmittedRadius_anti
    (gap : ℝ → ℝ) (s r : ℝ) (hs : 0 ≤ s) (hsr : s ≤ r)
    (hr : ValidEmittedRadius gap r) :
    ValidEmittedRadius gap s := by
  refine ⟨hs, ?_⟩
  intro x hx
  exact hr.2 x ⟨hx.1, hx.2.trans hsr⟩

/-- Finite certificate checked by a convex radial solver. -/
def ConvexRadiusCertificate (gap : ℝ → ℝ) (r : ℝ) : Prop :=
  0 ≤ r ∧ ConvexOn ℝ (Icc 0 r) gap ∧ gap 0 ≤ 0 ∧ gap r ≤ 0

/-- The two endpoint checks plus convexity imply the complete semantic
contract on `[0,r]`. -/
theorem convexRadiusCertificate_valid
    (gap : ℝ → ℝ) (r : ℝ)
    (h : ConvexRadiusCertificate gap r) :
    ValidEmittedRadius gap r := by
  refine ⟨h.1, ?_⟩
  intro x hx
  exact convex_radial_disk_certificate gap r x h.2.1 h.2.2.1 h.2.2.2 hx

/-- Convex certificates themselves are downward closed.  In particular, a
solver may safely use their truth value as a monotone bisection predicate. -/
theorem convexRadiusCertificate_anti
    (gap : ℝ → ℝ) (s r : ℝ) (hs : 0 ≤ s) (hsr : s ≤ r)
    (hr : ConvexRadiusCertificate gap r) :
    ConvexRadiusCertificate gap s := by
  have hvalid := convexRadiusCertificate_valid gap r hr
  refine ⟨hs, ?_, hr.2.2.1, hvalid.2 s ⟨hs, hsr⟩⟩
  exact hr.2.1.subset (fun x hx => ⟨hx.1, hx.2.trans hsr⟩) (convex_Icc 0 s)

/-- Abstract prefix predicate used by the bisection theorem. -/
def IsRadiusPrefix (P : ℝ → Prop) : Prop :=
  ∀ ⦃s r : ℝ⦄, 0 ≤ s → s ≤ r → P r → P s

theorem convexRadiusCertificate_isPrefix (gap : ℝ → ℝ) :
    IsRadiusPrefix (ConvexRadiusCertificate gap) := by
  intro s r hs hsr hr
  exact convexRadiusCertificate_anti gap s r hs hsr hr

/-- One ordinary bisection step.  A successful midpoint replaces the lower
accepted endpoint; a failed midpoint replaces the upper rejected endpoint. -/
def radiusBisectStep (P : ℝ → Prop) [DecidablePred P]
    (lo hi : ℝ) : ℝ × ℝ :=
  let mid := (lo + hi) / 2
  if P mid then (mid, hi) else (lo, mid)

theorem radiusBisectStep_preserves_bracket
    (P : ℝ → Prop) [DecidablePred P] (lo hi : ℝ)
    (hlo : P lo) (hhi : ¬ P hi) :
    P (radiusBisectStep P lo hi).1 ∧
      ¬ P (radiusBisectStep P lo hi).2 := by
  by_cases hmid : P ((lo + hi) / 2)
  · simp [radiusBisectStep, hmid, hhi]
  · simp [radiusBisectStep, hmid, hlo]

theorem radiusBisectStep_width
    (P : ℝ → Prop) [DecidablePred P] (lo hi : ℝ) :
    (radiusBisectStep P lo hi).2 - (radiusBisectStep P lo hi).1 =
      (hi - lo) / 2 := by
  by_cases hmid : P ((lo + hi) / 2)
  · simp [radiusBisectStep, hmid]
    ring
  · simp [radiusBisectStep, hmid]
    ring

/-- Under the prefix law, a rejected upper endpoint rejects every larger
radius.  Thus an accepted/rejected bisection bracket really encloses the
maximal admissible radius rather than merely a sign change. -/
theorem radiusPrefix_not_of_upper_le
    (P : ℝ → Prop) (hprefix : IsRadiusPrefix P)
    (hi x : ℝ) (hhi0 : 0 ≤ hi) (hhix : hi ≤ x) (hhi : ¬ P hi) :
    ¬ P x := by
  intro hx
  exact hhi (hprefix hhi0 hhix hx)

/-! ## Specialization to the rational Padé/c⁺ gap -/

def cplusConvexRadiusCertificate
    (m : CPlus ℂ) (rest : ℝ → ℝ) (eps y r : ℝ) : Prop :=
  ConvexRadiusCertificate (cplusRadialGap m rest eps y) r

theorem cplusConvexRadiusCertificate_anti
    (m : CPlus ℂ) (rest : ℝ → ℝ) (eps y s r : ℝ)
    (hs : 0 ≤ s) (hsr : s ≤ r)
    (hr : cplusConvexRadiusCertificate m rest eps y r) :
    cplusConvexRadiusCertificate m rest eps y s :=
  convexRadiusCertificate_anti _ s r hs hsr hr

/-- Direct runtime consequence: every point admitted by the emitted radius
satisfies the residual-versus-budget inequality used by the rational error
certificate. -/
theorem cplus_emitted_radius_rule
    (m : CPlus ℂ) (rest : ℝ → ℝ) (eps y r x : ℝ)
    (hr : cplusConvexRadiusCertificate m rest eps y r)
    (hx : x ∈ Icc 0 r) :
    rest x ≤ eps * cplusScale m x y * cplusDenLower m x y := by
  have hvalid := convexRadiusCertificate_valid
    (cplusRadialGap m rest eps y) r hr
  have hgap := hvalid.2 x hx
  simp only [cplusRadialGap] at hgap
  linarith

end

end Mandelbrot
