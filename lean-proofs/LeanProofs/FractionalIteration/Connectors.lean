/-
Copyright (c) 2026 Guillaume Collombet. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Guillaume Collombet
-/
import LeanProofs.FractionalIteration.Basic
import Mathlib.Algebra.Field.Basic
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
# Cubic connectors between integer iterates

The Catmull--Rom connector has the required endpoints, but these polynomial
identities make no claim that it obeys a fractional-iteration composition law.
-/

namespace Mandelbrot

section Field

variable {K : Type*} [Field K]

def hermite00 (s : K) : K := 2 * s ^ 3 - 3 * s ^ 2 + 1

def hermite10 (s : K) : K := s ^ 3 - 2 * s ^ 2 + s

def hermite01 (s : K) : K := -2 * s ^ 3 + 3 * s ^ 2

def hermite11 (s : K) : K := s ^ 3 - s ^ 2

/-- The Catmull--Rom tangent at the left endpoint. -/
def catmullTangentLeft (zPrev zNext : K) : K :=
  (zNext - zPrev) / 2

/-- The Catmull--Rom tangent at the right endpoint. -/
def catmullTangentRight (zCurrent zAfter : K) : K :=
  (zAfter - zCurrent) / 2

def catmullRomConnector
    (zPrev zCurrent zNext zAfter s : K) : K :=
  hermite00 s * zCurrent +
    hermite10 s * catmullTangentLeft zPrev zNext +
    hermite01 s * zNext +
    hermite11 s * catmullTangentRight zCurrent zAfter

@[simp] theorem catmullRomConnector_zero
    (zPrev zCurrent zNext zAfter : K) :
    catmullRomConnector zPrev zCurrent zNext zAfter 0 = zCurrent := by
  simp [catmullRomConnector, hermite00, hermite10, hermite01, hermite11]

@[simp] theorem catmullRomConnector_one
    (zPrev zCurrent zNext zAfter : K) :
    catmullRomConnector zPrev zCurrent zNext zAfter 1 = zNext := by
  simp [catmullRomConnector, hermite00, hermite10, hermite01, hermite11]
  ring

end Field

/-- T6.5 makes no hidden dynamics claim: even when all four control points
are consecutive points of the orbit of `z ↦ z²`, the next connector need not
be the quadratic image of the previous connector at the same local time.

Here the orbit starts with `2, 4, 16, 256, 65536`, and the failure already
occurs at `s = 1/2`. -/
theorem catmullRomConnector_not_semiconjugate_example :
    catmullRomConnector
        (4 : ℂ) 16 256 65536 (1 / 2) ≠
      quad 0
        (catmullRomConnector
          (2 : ℂ) 4 16 256 (1 / 2)) := by
  norm_num [catmullRomConnector, catmullTangentLeft,
    catmullTangentRight, hermite00, hermite10,
    hermite01, hermite11, quad]

end Mandelbrot
