/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import Mathlib.Algebra.Field.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
Companion proofs to `reference_calculus/src/mobius.rs`.

The Möbius-c+ block's `[1/1]` extraction (`mobius_from_jet`) defines
`D := -c₂₀ / c₁₀` from the block's stored bivariate-jet coefficients. This is
chosen precisely so that the "constructed zero" `q₂₀ = c₂₀ + D·c₁₀` vanishes —
the Rust build verifies this numerically (`mobius_q_zeros_on_every_block`,
to 2^-52 relative, i.e. up to f64 rounding). Here we prove it exactly, over
any field, which is what the numerical check is approximating.
-/

theorem mobius_q20_zero {K : Type*} [Field K] (c10 c20 : K) (h : c10 ≠ 0) :
    c20 + (-c20 / c10) * c10 = 0 := by
  field_simp
  ring
