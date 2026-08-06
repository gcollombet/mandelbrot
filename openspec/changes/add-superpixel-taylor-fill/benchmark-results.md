# Benchmark results — super-pixel Taylor fill

## 2026-07-26 — Gate A: derivative-channel reach census

Command:

```text
cargo test --manifest-path reference_calculus/Cargo.toml reach_census --lib -- --ignored --nocapture
```

The census uses `tol = 1e-3`, a 48 × 48 sample grid, and a 1080-pixel
viewport height. `medValue`, `medDer`, and `medUse` are median log2 radii in
pixels. The usable radius is

```text
ρ_use = min(ρ_value, ρ_der)
```

with

```text
⅙ |z‴| ρ_value³ = tol |z|
½ |z‴| ρ_der²   = tol |z′|.
```

| view | σ | iterations | medValue | medDer | medUse | derivative limiting | value ≥4 px | usable ≥1 px | usable ≥4 px | usable ≥16 px | unresolved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| seahorse | 1e-3 | 3,090 | 2.57 | 0.37 | 0.37 | 100.0% | 55.9% | 54.2% | 4.9% | 0.0% | 0.0% |
| seahorse | 1e-6 | 3,090 | -6.66 | -8.98 | -8.98 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% | 64.9% |
| seahorse | 1e-9 | 3,090 | -0.84 | -3.04 | -3.04 | 100.0% | 20.4% | 15.9% | 0.1% | 0.0% | 0.0% |
| elephant | 1e-3 | 3,999 | 1.21 | -1.02 | -1.02 | 100.0% | 41.4% | 37.0% | 8.5% | 0.0% | 1.3% |
| elephant | 1e-6 | 29,999 | — | — | — | — | — | — | — | — | 100.0% |
| elephant | 1e-9 | 119,999 | — | — | — | — | — | — | — | — | 100.0% |
| triple-spiral | 1e-3 | 434 | -0.07 | -2.31 | -2.31 | 100.0% | 41.0% | 40.2% | 18.5% | 0.0% | 14.2% |
| triple-spiral | 1e-6 | 434 | 3.80 | 1.69 | 1.69 | 100.0% | 60.8% | 60.2% | 45.7% | 7.0% | 8.6% |
| triple-spiral | 1e-9 | 434 | -2.03 | -4.25 | -4.25 | 100.0% | 11.7% | 7.7% | 0.0% | 0.0% | 19.0% |
| misiurewicz | 1e-3 | 136 | 2.91 | 0.70 | 0.70 | 100.0% | 63.2% | 60.3% | 23.9% | 0.0% | 0.0% |
| misiurewicz | 1e-6 | 136 | 3.00 | 0.80 | 0.80 | 100.0% | 64.3% | 61.4% | 23.3% | 0.0% | 0.0% |
| misiurewicz | 1e-9 | 136 | 3.01 | 0.81 | 0.81 | 100.0% | 64.1% | 62.0% | 24.3% | 0.0% | 0.0% |

The `—` rows contain no escaped samples within the available f64 reference and
iteration budget; they do not contribute zero-radius samples to the other
columns.

### Gate A decision

The decision is evaluated on the same `σ = 1e-3` boundary views that supplied
the value-only motivating census.

| view | value-only ≥4 px | 50% floor | usable ≥4 px | usable/value ratio | verdict |
|---|---:|---:|---:|---:|---|
| seahorse | 55.9% | 28.0% | 4.9% | 0.09 | stop |
| elephant | 41.4% | 20.7% | 8.5% | 0.21 | stop |
| triple-spiral | 41.0% | 20.5% | 18.5% | 0.45 | stop |
| misiurewicz | 63.2% | 31.6% | 23.9% | 0.38 | stop |

**Verdict: Gate A fails.** The derivative channel is limiting for every usable
sample in these rows, and the usable `≥4 px` share is below half of the
value-only figure on all four views. In accordance with task 1.5, Stages 3–6
are not justified by the current two-channel criterion and implementation
stops before shader work.

## 2026-07-26 — Gate A2: quadratic derivative-channel reach

Gate A2 tests

```text
ẑ′(δc) = z′ + z″·δc + ½·z‴·δc²
```

with the first omitted term estimated from the fourth derivative:

```text
⅙ |z⁗| ρ_der2³ = tol |z′|
ρ_use2 = min(ρ_value, ρ_der2).
```

The fourth-derivative recurrence used by the census is

```text
z⁗_{n+1} = 2·(3·z″_n² + 4·z′_n·z‴_n + z_n·z⁗_n).
```

The same command, sample grid, tolerance, views, and depth rows as Gate A were
used. The debug-build census completed successfully in 275.21 seconds.

| view | σ | iterations | medValue | medDer1 | medDer2 | medUse2 | der1 limiting | der2 limiting | value ≥4 px | A1 ≥4 px | A2 ≥1 px | A2 ≥4 px | A2 ≥16 px | unresolved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| seahorse | 1e-3 | 3,090 | 2.57 | 0.37 | 2.29 | 2.29 | 100.0% | 97.8% | 55.9% | 4.9% | 64.6% | 53.2% | 1.5% | 0.0% |
| seahorse | 1e-6 | 3,090 | -6.66 | -8.98 | -7.07 | -7.07 | 100.0% | 97.2% | 0.0% | 0.0% | 3.1% | 0.0% | 0.0% | 64.9% |
| seahorse | 1e-9 | 3,090 | -0.84 | -3.04 | -1.13 | -1.14 | 100.0% | 97.7% | 20.4% | 0.1% | 41.1% | 14.3% | 0.0% | 0.0% |
| elephant | 1e-3 | 3,999 | 1.21 | -1.02 | 0.88 | 0.88 | 100.0% | 97.0% | 41.4% | 8.5% | 57.6% | 35.4% | 8.3% | 1.3% |
| elephant | 1e-6 | 29,999 | — | — | — | — | — | — | — | — | — | — | — | 100.0% |
| elephant | 1e-9 | 119,999 | — | — | — | — | — | — | — | — | — | — | — | 100.0% |
| triple-spiral | 1e-3 | 434 | -0.07 | -2.31 | -0.41 | -0.41 | 100.0% | 97.7% | 41.0% | 18.5% | 47.9% | 40.0% | 15.3% | 14.2% |
| triple-spiral | 1e-6 | 434 | 3.80 | 1.69 | 3.71 | 3.65 | 100.0% | 93.5% | 60.8% | 45.7% | 67.6% | 60.0% | 45.7% | 8.6% |
| triple-spiral | 1e-9 | 434 | -2.03 | -4.25 | -2.36 | -2.37 | 100.0% | 96.8% | 11.7% | 0.0% | 31.4% | 6.5% | 0.0% | 19.0% |
| misiurewicz | 1e-3 | 136 | 2.91 | 0.70 | 2.64 | 2.64 | 100.0% | 97.6% | 63.2% | 23.9% | 79.7% | 59.4% | 22.4% | 0.0% |
| misiurewicz | 1e-6 | 136 | 3.00 | 0.80 | 2.72 | 2.72 | 100.0% | 97.8% | 64.3% | 23.3% | 80.1% | 60.8% | 21.3% | 0.0% |
| misiurewicz | 1e-9 | 136 | 3.01 | 0.81 | 2.76 | 2.75 | 100.0% | 97.7% | 64.1% | 24.3% | 80.3% | 61.0% | 21.0% | 0.0% |

### Gate A2 decision

The decision again uses the `σ = 1e-3` rows.

| view | value-only ≥4 px | 50% floor | A1 usable ≥4 px | A2 usable ≥4 px | A2/value ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| seahorse | 55.9% | 28.0% | 4.9% | 53.2% | 0.95 | pass |
| elephant | 41.4% | 20.7% | 8.5% | 35.4% | 0.86 | pass |
| triple-spiral | 41.0% | 20.5% | 18.5% | 40.0% | 0.98 | pass |
| misiurewicz | 63.2% | 31.6% | 23.9% | 59.4% | 0.94 | pass |

**Verdict: Gate A2 passes.** Raising the derivative continuation to quadratic
recovers 86–98 % of the value-only `≥ 4 px` share on the four decision views,
well above the 50 % floor. The quadratic derivative radius still binds on
roughly 97 % of samples, but it is close enough to the value radius that the
usable ceiling survives.

This result justifies reopening design work for a runtime `z‴` representation.
It does not select that representation, validate its f32 packing, or bypass
Gate B.

## 2026-07-26 — Gate B: smooth-iteration branch census

Gate B evaluates the exact smooth-iteration formula used by analytic AA:

```text
ν_pred = n_anchor + 1 - log2(log(|ẑ|²) / log(μ))
ν_true = n_target + 1 - log2(log(|z_target|²) / log(μ))
error  = |ν_pred - ν_true|.
```

`ẑ` is the anchor's quadratic Taylor continuation, evaluated at the anchor
escape iteration. `ν_true` comes from a separate full target walk. The shader's
`1e-12` clamps are reproduced, including when `ẑ` lies below bailout because
the target escapes later.

The run used the four boundary views at `σ = 1e-3`, 324 candidate anchors per
view on an `18×18` grid, eight target directions, and distances
`0.25, 0.5, 1, 2, 4, 8, 16, 32, 64 px`. The useful Gate A rows are likewise at
this depth; real deep-view behavior remains assigned to Stage 1
instrumentation.

### Diagnostic budgets

The ν displacement exactly corresponding to `REACH_TOL = 1e-3` at bailout is
`0.002084` iterations. This is the matched budget used to compare Gate B with
the relative-`|z|` proxy.

The census also recorded where the phase displacement reaches one stored
palette texel. The production palette has 4096 texels and the shader maps
`phase = 2ν / palettePeriod`, hence that storage displacement is

```text
τν(P) = P / (2 × 4096) = P / 8192.
```

Representative values are shown only to interpret the recorded columns:

| palette period P | one stored-texel ν displacement |
|---:|---:|
| 1 (minimum UI period) | 0.000122 |
| 256 (legacy/default fallback) | 0.031250 |
| 1886.72 (current initial view) | 0.230313 |

### Summary

`medProxy` is the median value-only `ρ_next` radius. `crossProxy` is the
distance where the median observed ν error crosses `0.002084`.
`proxyFail` counts target pairs that were *inside their anchor's own local
`ρ_next`* yet exceeded that ν budget. `diffFail` restricts the same check to
pairs whose target and anchor escaped at different iterations.

| view | anchors | medProxy px | crossProxy px | crossing/proxy | cross P=1 px | cross P=256 px | cross P=1886.72 px | different iteration | proxyFail | diffFail | unresolved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| seahorse | 324 | 4.63 | 5.25 | 1.13 | 2.34 | 10.97 | 26.72 | 42.5% | 3.01% | 99.67% | 0.00% |
| elephant | 317 | 1.50 | 1.62 | 1.08 | 0.73 | 3.68 | 10.55 | 51.8% | 4.10% | 93.66% | 0.21% |
| triple-spiral | 265 | 0.60 | 1.21 | 2.00 | 0.48 | 2.74 | 9.13 | 50.6% | 4.22% | 99.22% | 10.14% |
| misiurewicz | 324 | 6.50 | 7.25 | 1.12 | 3.25 | 15.14 | 35.02 | 31.7% | 3.65% | 99.54% | 0.00% |

Median ν error by target distance:

| view | 0.25 px | 0.5 px | 1 px | 2 px | 4 px | 8 px | 16 px | 32 px | 64 px |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| seahorse | 1.236e-7 | 1.055e-6 | 8.554e-6 | 7.319e-5 | 6.916e-4 | 1.142e-2 | 1.040e-1 | 3.045e-1 | 1.111 |
| elephant | 4.237e-6 | 3.751e-5 | 3.261e-4 | 4.666e-3 | 4.042e-2 | 1.253e-1 | 5.758e-1 | 2.512 | 9.853 |
| triple-spiral | 1.895e-5 | 1.397e-4 | 1.025e-3 | 1.405e-2 | 8.093e-2 | 1.851e-1 | 5.831e-1 | 2.898 | 6.896 |
| misiurewicz | 4.217e-8 | 3.431e-7 | 2.802e-6 | 2.426e-5 | 2.443e-4 | 2.968e-3 | 3.827e-2 | 2.005e-1 | 5.824e-1 |

These stored-texel columns are **not perceptual thresholds**. Stop count and
spacing are arbitrary, and a `square` transfer curve can place a hard colour
jump inside an arbitrarily small phase interval. The 4096 samples describe the
texture representation, not an indistinguishability guarantee.

The medians alone look reassuring: the observed crossing is 1.08–2.00 times
the median proxy radius, so the relative-`|z|` criterion predicts central
tendency conservatively. The tail gives the opposite decision. Even inside
the local proxy radius, 3.01–4.22% of pairs exceed the matched ν budget. When
the target crosses an escape-iteration branch, 93.66–99.67% of the
proxy-accepted pairs fail.

### Gate B decision

**Gate B rejects the relative-`|z|` proxy as a universal runtime quality test.**
It is adequate for median reach but misses almost every escape-iteration branch
crossing, where errors can be several iterations.

It also rejects the idea of retaining a universal ν indistinguishability
threshold. In particular, `palettePeriod/8192` SHALL NOT be used to decide that
a frozen result is visually acceptable. The next prototype freezes globally at
a user-selected dyadic step and exposes the approximation directly for visual
comparison, without a palette-derived acceptance test.

### Addendum, 29 July 2026 — the rejection is sharper than "not universal"

`nu_branch_census` now sweeps the tolerance (exactly: `ρ_next` is a cubic
criterion, so each row is the same walk shifted by `cubic_reach_log2_shift`) and
splits accepted pairs by whether the target escapes at the anchor's iteration.

`sameFail` is **0.00 %** in all four views at every tolerance from 0.06× to 97×
the baseline. The 3.01–4.22 % measured above is therefore not a tail of the
proxy being loose — it is *entirely* the branch-crossing population, and
tightening the tolerance does not remove it (at the P=1 texel, ρ×0.39 and 6.7×
more anchors, 1.09–2.07 % still fail).

This does not overturn the Gate B decision; it locates it. The proxy is exact
where no branch is crossed and blind where one is, so the missing component is a
**branch-crossing predicate**, not a better value tolerance and not a palette
threshold. Full numbers in `MANDELBROT_BOX_DIMENSION_CENSUS.md`,
"The lever, measured".
