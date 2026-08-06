# Radial certificate proof contract

This note freezes the mathematical and lifecycle contract used by the Rust
builder, its serialized CPU referee, and the WGSL evaluator. It is an
implementation companion to `design.md`; changing one of these formulas or
acceptance boundaries requires a record-version change and new parity fixtures.

## Reference epoch and intrinsic domains

`Cref` owns the arbitrary-precision orbit and the dyadic coefficient tree.
Radial-v3 does not define an epoch-wide `referenceLog2Dc`. Each completed
block derives intrinsic Cauchy sources from its coefficients and matching
reference-orbit segment. The active GPU record contains only

```text
Affine: alpha, alphaExponent, beta
Padé/c+/Jet: 2 × (maxLog2Dz, maxLog2Dc, poleMaxLog2Dz)
```

The per-block records never change because of zoom, translation, rotation,
viewport size, or a lower `maxIter`. A changed reference, epsilon, coefficient
layout/version, precision epoch, or maximum skip starts a new certificate
epoch. Runtime compares the actual finite pixel `delta-c` with each stored
candidate. If both candidates reject, lower levels and exact perturbation
remain the fallback.

## State transition shared by Rust and WGSL

For a block map `m(z,c)`, where `z` is the entering perturbation and
`c = Cpixel - Cref`, both referees use

```text
zNew   = m
dNew   = mz d + mc
ddNew  = mz dd + mzz d^2 + 2 mzc d + mcc
```

The radial certificate proves the configured relative error for the block
value and first propagated derivative. The second derivative follows the exact
partial-derivative formula of the selected approximation, but layout v3 does
not claim an independent truncation-error certificate for that second
derivative channel. CPU/WGSL formula parity is nevertheless mandatory.

## Tier formulas

### Affine

```text
m       = A z + B c
mz      = A
mc      = B
mzz=mzc=mcc=0
```

Its reference-owned certificate is the classic binary-merge line

```text
abs(z) <= alpha - beta abs(c)
```

with seed `alphaBase = abs(Zref)`, `alpha = epsilon * alphaBase`,
`beta = 0`, and merge

```text
alphaBase = min(left.alphaBase, right.alphaBase / abs(left.A))
beta      = max(left.beta, (right.beta + abs(left.B)) / abs(left.A))
```

Degenerate, non-finite, or non-positive radii reject.

### Plain Padé [2/1]

Use the unified rational record with `A'=D'=F=0`:

```text
den = 1 + D z
m   = ((N2 z + A) z + B c) / den
```

The first and second partials are the rational formulas below with the three
disabled coefficients equal to zero. The radial proof includes a positive
denominator margin; the historical Padé heuristic gates are rollback and
performance baselines, not this formal certificate.

### Möbius-c+ [2/1]

```text
Ae  = A + A' c
De  = D + D' c
den = 1 + De z + F c
m   = ((N2 z + Ae) z + B c) / den
mz  = (2 N2 z + Ae - m De) / den
mc  = (A' z + B - m (D' z + F)) / den
mzz = 2 (N2 - De mz) / den
mcc = -2 (D' z + F) mc / den
mzc = (A' - mc De - m D') / den - mz (D' z + F) / den
```

The radial certificate includes the `D`, `D'`, and `F` denominator terms and
rejects every degenerate extraction or exhausted pole margin.

### Jet order 3

With the unified record reconstructions

```text
a20 = N2 - D A
a11 = A' - B D - F A
a21 = -D' A - D a11 - F a20
a02 = -F B
a30 = -D a20
```

Rust and WGSL evaluate the same bivariate order-three polynomial and its six
partials. The radial proof bounds the omitted analytic tail; no denominator
guard applies.

## Radial proof

For each finite Cauchy source `(Rz,Rc,M)` define

```text
theta = max(abs(z)/Rz, abs(c)/Rc),  theta <= 1/2.
```

The build side solves the normalized value-tail and differentiated-tail
majorants, reserves independent error shares for the stored remainder and the
analytic tail, checks the pure-c axis at `z=0`, and intersects rational pole
constraints. Source `Rc` rungs are block-local: coefficient balance supplies
the local region and `Rc=4` supplies a source covering the full Mandelbrot
parameter disk without viewport input.

Because every low-degree line has non-positive c slope, evaluating it at a
source candidate's own final c cap yields a conservative rectangle for every
nested c value. Dominated rectangles are removed; layout v3 keeps the widest-c
and widest-effective-z Pareto endpoints. Serialized caps are rounded toward
rejection.

## Correctness and rollout gates

- Equality with a serialized cap is accepted; the next representable value
  above it is rejected. NaN and invalid infinities reject.
- Serialized CPU evaluation and WGSL use the same f32 operation order and
  directed conversion rules.
- Exact block replay must satisfy the configured value and first-derivative
  tolerances for every accepted Affine, Padé, Möbius-c+, and Jet fixture.
- Pure-c fixtures include `z=0`; rational fixtures include zero coefficients,
  near-pole inputs, and degenerate extraction.
- Each stored rectangle must remain sound for every nested smaller `delta-c`
  and `delta-z`, and the union evaluator must accept either endpoint.
- Published coefficient and certificate ranges must have matching reference,
  generation, version, stride, slot range, and committed prefix.
- Viewport-only block-certificate build count is exactly zero. Reference-growth
  construction is counted separately.
- Optional SA, periodic, and gate headers may refresh independently and may not
  republish block records.
- The packed-v1 path remains the explicit rollback until focused parity and
  performance evidence passes; browser/Playwright validation requires user
  approval.
