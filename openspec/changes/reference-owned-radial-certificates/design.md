## Context

The Unified table already separates reference-owned coefficient geometry from viewport-sensitive validity data, but the current dynamic path still derives Cauchy polydiscs from the instantaneous `cmax` and serializes a 24-word packed envelope per block. A viewport move can therefore leave a sound but poorly fitted table, or motivate a costly certificate refresh even though the reference orbit and block map did not change.

Three quantities must remain distinct:

- `Cref` owns the arbitrary-precision orbit and all block coefficients.
- `delta-c = Cpixel - Cref` is evaluated per pixel.
- `cmax` is only the maximum `|delta-c|` of one viewport.

Each block admits intrinsic Cauchy rectangles derived from its coefficients and its immutable reference-orbit segment. The active design does not convert viewport `cmax` into a proof input: it constructs a small Pareto frontier once, then lets every pixel test its actual `delta-c` against those per-block caps. The existing adjacent-rung-bank experiment is superseded by this intrinsic two-endpoint layout.

## Goals / Non-Goals

**Goals:**

- Make block-indexed coefficients, bounds, and certificates reference-owned and monotonic.
- Guarantee that zoom and translation perform no block-certificate build work while the reference and certificate epoch remain unchanged.
- Replace the multi-line per-tier runtime proof with a compact, auditable radial condition.
- Preserve value and derivative accuracy and exact fallback for every rejected, uncovered, non-finite, or outside-both-candidates case.
- Build certificates incrementally only for blocks newly enabled by reference-orbit growth.
- Keep a rollback path until Rust/WGSL parity and navigation performance are accepted.

**Non-Goals:**

- Maximizing accepted skip in the first radial implementation.
- Making certificates valid after `Cref`, epsilon, precision epoch, or coefficient geometry changes.
- Replacing exact perturbation or rebase logic.
- Adopting the legacy Padé gate as a formal value-and-derivative certificate without a separate proof.
- Running Playwright or browser benchmarks without explicit user approval.

## Decisions

### 1. No viewport-wide certificate domain

Radial-v3 has no finite `referenceLog2Dc` proof input. Each non-affine candidate stores its own intrinsic `(maxLog2Dz, maxLog2Dc, poleMaxLog2Dz)` rectangle. Affine retains `alpha - beta * |delta-c|`. `maxIter` growth appends records derived by the same block-local policy.

The runtime contract is:

```text
pixel lies in either intrinsic block rectangle -> the tier may apply
pixel lies outside both rectangles             -> lower tier/level or exact perturbation
```

Alternatives considered:

- Rebuild at four-octave crossings: sound, but reintroduces worker load, caching, transfers, and atomic bank-switch complexity during navigation.
- Build one rectangle covering all useful `delta-c`: often destroys the useful `delta-z` radius of long blocks.
- Use a viewport-sized domain: tighter locally, but recreates the lifecycle problem this change removes.

### 2. Pre-solve a normalized radial rectangle

For a Cauchy source `(Rz, Rc, M)`, define

```text
theta = max(|delta-z| / Rz, |delta-c| / Rc).
```

For truncation order `p`, the bivariate value-tail majorant is bounded by

```text
M * theta^(p + 1) * ((p + 2) - (p + 1) * theta) / (1 - theta)^2.
```

The derivative tail uses the corresponding differentiated-series factor with denominator `(1 - theta)^3`. Rational tiers additionally include denominator amplification and a pole margin. Build-side code solves a conservative `thetaMax <= 1/2` satisfying all mandatory channels:

- stored remainder and analytic tail value error;
- derivative error;
- pure-`delta-c` error at `delta-z = 0`;
- the intrinsic Cauchy source's own `delta-c` containment;
- rational pole separation when applicable.

The GPU receives the resulting caps:

```text
maxLog2Dz = log2(Rz) + log2(thetaMax)
maxLog2Dc = log2(Rc) + log2(thetaMax)
```

and accepts only when both actual logarithmic magnitudes are within the caps. Pre-solving avoids transcendental tail evaluation in the hot shader and deliberately discards anisotropic tightness in exchange for a small, transparent proof.

Alternatives considered:

- Evaluate the full Cauchy rational function from `theta` in WGSL: tighter, but more arithmetic in the hottest loop and more difficult CPU/GPU parity.
- Retain the current piecewise line envelope: tighter, but keeps the large packed record and multi-cause probing cost.
- Drop Cauchy and trust stored degree-six residuals: cannot certify the omitted analytic tail.

### 3. Tier-specific proof policy

- **Affine:** carry the established `alpha - beta * |delta-c|` certificate alongside the binary-carry block builder. Its seed and merge are reference-owned; it needs no Cauchy domain bank.
- **Padé:** the initial implementation uses the conservative radial proof with the plain rational form (`A' = D' = F = 0`) and an explicit pole constraint. The existing legacy `alpha/beta + H2 + G + pole` path remains a performance baseline, not the new formal certificate, until a dedicated value/first-derivative/second-derivative proof and boundary tests succeed.
- **Möbius-c+:** use a radial certificate over the compensated rational remainder and include `D`, `D'`, and `F` in the pole proof.
- **Jet:** use a radial certificate for the terms beyond the retained order-three polynomial.

Auto continues to try tiers cheapest-first. A dead or rejected tier cannot suppress later tiers or exact fallback.

### 4. Keep the two intrinsic Pareto endpoints

For Padé, Möbius-c+, and Jet, Rust derives Cauchy sources from four block-local `Rc` rungs. The widest rung is capped at `|delta-c| = 4`, which covers the full Mandelbrot parameter disk without consulting the current view. A coefficient-balance estimate supplies the narrow local rungs.

After intersecting every source with low-degree, pure-`delta-c`, and pole constraints, dominated rectangles are discarded. Layout v3 retains exactly two endpoints: widest final `delta-c`, then widest effective `delta-z` among the remaining frontier. If both endpoints coincide, the second slot is dead. This bounded union avoids both a viewport bank and the pessimism of forcing one rectangle to cover a global domain.

### 5. Incremental construction follows block completion

The binary-carry builder remains the source of truth for blocks, moduli, and coefficients. When a block completes, a bounded worker unit computes its affine/radial certificate from the matching orbit segment. Existing blocks are never revisited for viewport changes.

Publication remains range-based. A level count is committed only after coefficient and matching certificate bytes have both been queued. If certificate work lags coefficient construction, the uncommitted suffix remains invisible and exact perturbation handles it.

### 6. Version the CPU/WASM/GPU contract

The radial record uses layout version 3 and 21 words: three Affine words plus two three-word candidates for each of the three non-affine tiers. Rust exports record stride, version, ranges, and build-cause counters; the legacy domain ABI field is `NaN` in v3. The worker validates and copies records; Engine rejects mismatched versions/strides/generations/refIds; WGSL only opens records reachable through committed directory counts.

The previous packed-envelope path remains available behind a rollback switch during parity validation. No buffer may combine records from different references, table generations, epsilon values, or layout versions.

### 7. Separate optional viewport headers

SA, periodic, and gate headers may still use the current viewport extent. They remain a small independently versioned tail and must not invalidate, rebuild, or republish block-indexed coefficients or certificates.

### 8. Instrument lifecycle and mathematical rejection separately

The performance panel exposes:

- explicit intrinsic-per-block/cmax-independent status and current viewport `cmax` as observation only;
- radial certificate version and committed coverage;
- affine, intrinsic-cap, pole, summary-prefilter, and exact-fallback counts;
- certificate blocks constructed because of reference growth;
- viewport-only block-certificate rebuild count, which must remain zero.

Diagnostic counters stay behind the existing opt-in statistics specialization so ordinary rendering does not pay their full atomic cost.

## Risks / Trade-offs

- **[Risk] Two radial rectangles still under-approximate a larger Pareto frontier.** → Keep exact fallback, record use of the second candidate, and version the layout again before changing candidate count.
- **[Risk] The global `Rc=4` source is too loose for long critical blocks.** → Retain local coefficient-balanced rungs; a dead wide endpoint does not suppress the narrow high-radius endpoint.
- **[Risk] The affine `alpha/beta` proof and radial tiers use different contracts.** → Give each record an explicit tier tag and validate both against the same value/derivative replay harness.
- **[Risk] Padé's historical guards do not prove every derivative channel.** → Keep Padé on radial proof initially and make specialized adoption a separately tested optimization.
- **[Risk] Worker units still monopolize the worker for large blocks.** → Retain bounded quotas and event-loop yields; record per-unit and cumulative certificate time.
- **[Risk] Layout migration can bind stale packed-v1 data as radial records.** → Version/stride checks at every boundary and rebuild bind groups only after complete compatible allocations.
- **[Risk] A pixel exceeds both intrinsic rectangles during a large translation or zoom-out.** → Reject only that block/tier and continue with lower levels or exact perturbation; no table rebuild is required.

## Migration Plan

1. Remove or revert the incomplete adjacent-rung-bank scaffolding while preserving `currentLog2CMax` as observation-only instrumentation.
2. Add Rust radial proof types and CPU referee tests without changing the active GPU path.
3. Extend the incremental builder and versioned WASM payload, then test append-only publication and viewport stability.
4. Add a parallel WGSL/Engine path behind a rollback switch and validate Rust/WGSL boundary parity.
5. Compare exact output, rejection causes, realized skip, build time, transferred bytes, and viewport-only rebuild count with the existing path using focused non-Playwright checks first.
6. Make the radial path the dynamic default only after correctness gates pass; retain rollback until user-approved browser validation confirms navigation behavior.

Rollback selects the previous packed validity layout and worker contract; reference orbit and coefficient formats remain compatible and do not need migration.

## Open Questions

- After the radial baseline is stable, should a specialized Padé proof be pursued, or is its incremental benefit too small relative to Möbius-c+?
